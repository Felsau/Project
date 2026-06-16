"""Interactive raster tile overlays — NDVI / LST XYZ tiles for the live map.

ต่างจาก thumbs.py (PNG ภาพนิ่งสำหรับ PDF): ตรงนี้คืน XYZ tile URL (getMapId)
ให้ deck.gl TileLayer วาง raster จริงระดับ pixel ทับ basemap แบบ interactive.
URL ผูก GEE session → cache ใน in-process TTL (เหมือน recommend) แล้ว refresh เมื่อหมดอายุ.
"""
import logging
import time

import ee
from fastapi import APIRouter, HTTPException

from dependencies import (get_province_geom, get_district_geom,
                          CURRENT_YEAR, YearParam, internal_error)
from gee_utils import mask_s2_clouds, get_lst_col

router = APIRouter()
logger = logging.getLogger(__name__)

# palette hex (ไม่มี #) — สีตรงกับ raster ใน PDF (thumbs.py) เพื่อความ consistent
NDVI_PALETTE = ['a50026', 'd73027', 'f46d43', 'fdae61', 'fee08b',
                'd9ef8b', 'a6d96a', '66bd63', '1a9850', '006837']
LST_PALETTE = ['053061', '2166ac', '4393c3', '92c5de', 'fddbc7',
               'f4a582', 'd6604d', 'b2182b', '67001f']
NDVI_VIS = {'min': -0.2, 'max': 0.8, 'palette': NDVI_PALETTE}
LST_VIS = {'min': 20, 'max': 45, 'palette': LST_PALETTE}

# Diverging palettes for year-over-year DIFFERENCE maps (centred on 0).
#   NDVI Δ: red = vegetation loss · pale = no change · green = gain (RdYlGn)
#   LST Δ:  blue = cooler · white = no change · red = warmer (RdBu reversed)
NDVI_DIFF_PALETTE = ['d73027', 'f46d43', 'fee08b', 'ffffbf', 'd9ef8b', '66bd63', '1a9850']
LST_DIFF_PALETTE = ['2166ac', '4393c3', '92c5de', 'f7f7f7', 'f4a582', 'd6604d', 'b2182b']
NDVI_DIFF_VIS = {'min': -0.3, 'max': 0.3, 'palette': NDVI_DIFF_PALETTE}
LST_DIFF_VIS = {'min': -5, 'max': 5, 'palette': LST_DIFF_PALETTE}

# tile URL ผูก session GEE (~ชั่วโมง) → cache 30 นาทีปลอดภัย ลด getMapId ซ้ำตอน toggle
_TILE_TTL = 1800
_TILE_CACHE_MAX = 200
_TILE_CACHE: dict[tuple, tuple[str, float]] = {}


def _cache_get(key: tuple) -> str | None:
    entry = _TILE_CACHE.get(key)
    if entry and entry[1] > time.time():
        return entry[0]
    return None


def _cache_put(key: tuple, url: str) -> None:
    if len(_TILE_CACHE) >= _TILE_CACHE_MAX:
        now = time.time()
        for k in [k for k, (_, exp) in _TILE_CACHE.items() if exp <= now]:
            del _TILE_CACHE[k]
        while len(_TILE_CACHE) >= _TILE_CACHE_MAX:
            _TILE_CACHE.pop(next(iter(_TILE_CACHE)))
    _TILE_CACHE[key] = (url, time.time() + _TILE_TTL)


def _resolve_geom(province_name: str, district_name: str | None) -> dict:
    if district_name:
        return get_district_geom(province_name, district_name)
    return get_province_geom(province_name)


def _ndvi_image(geom: ee.Geometry, year: int):
    col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
           .filterBounds(geom)
           .filterDate(f'{year}-01-01', f'{year + 1}-01-01')  # end exclusive — รวม 31 ธ.ค.
           .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
           .map(mask_s2_clouds))
    if col.size().getInfo() == 0:
        return None
    return col.median().clip(geom).normalizedDifference(['B8', 'B4']).rename('NDVI')


def _lst_image(geom: ee.Geometry, year: int):
    col = get_lst_col(geom, year)
    if col.size().getInfo() == 0:
        return None
    return col.median().clip(geom).select('LST')


def _serve_tiles(kind: str, province_name: str, district_name: str | None,
                 year: int, image_fn, vis: dict, palette: list, missing: str):
    raw_geom = _resolve_geom(province_name, district_name)
    key = (kind, province_name, district_name, year)
    url = _cache_get(key)
    if url is None:
        logger.info("⏳ %s tiles: %s/%s/%d", kind.upper(), province_name,
                    district_name or '-', year)
        try:
            img = image_fn(ee.Geometry(raw_geom), year)
            if img is None:
                raise HTTPException(status_code=404, detail=missing)
            url = img.getMapId(vis)['tile_fetcher'].url_format
            _cache_put(key, url)
        except HTTPException:
            raise
        except ee.EEException as ee_err:
            # ภาพมีอยู่แต่ถูก mask หมด → getMapId พังด้วย 'input may not be null'
            # → 422 + แนะนำเปลี่ยนปี (ให้ตรงกับ /recommend) แทน 500 generic
            logger.warning("⚠️  %s tiles GEE compute failed [%s/%d]: %s",
                           kind, province_name, year, ee_err)
            raise HTTPException(status_code=422, detail=(
                f"คำนวณ {kind.upper()} ปี {year} ไม่สำเร็จ — "
                "ภาพถ่ายดาวเทียมอาจไม่ครอบคลุมพื้นที่/ช่วงเวลานี้ ลองเลือกปีก่อนหน้า"
            ))
        except Exception:
            logger.error("❌ %s tiles error [%s/%d]", kind, province_name, year, exc_info=True)
            raise internal_error()
    return {"tile_url": url, "kind": kind,
            "min": vis['min'], "max": vis['max'], "palette": palette}


@router.get("/maps/{province_name}/ndvi-tiles")
def ndvi_tiles(province_name: str, year: YearParam = CURRENT_YEAR,
               district_name: str | None = None):
    """XYZ tile URL ของ NDVI raster (Sentinel-2) สำหรับวางทับ basemap"""
    return _serve_tiles("ndvi", province_name, district_name, year,
                        _ndvi_image, NDVI_VIS, NDVI_PALETTE,
                        f"ไม่พบภาพ Sentinel-2 สำหรับปี {year}")


@router.get("/maps/{province_name}/lst-tiles")
def lst_tiles(province_name: str, year: YearParam = CURRENT_YEAR,
              district_name: str | None = None):
    """XYZ tile URL ของ LST raster (Landsat 8/9) สำหรับวางทับ basemap"""
    return _serve_tiles("lst", province_name, district_name, year,
                        _lst_image, LST_VIS, LST_PALETTE,
                        f"ไม่พบภาพ Landsat สำหรับปี {year}")


def _serve_diff(kind: str, province_name: str, district_name: str | None,
                year_a: int, year_b: int, image_fn, vis: dict, palette: list, missing: str):
    """Per-pixel difference map: image(year_b) − image(year_a) → diverging tiles.
    Makes year-over-year change visible where the raw rasters look near-identical."""
    raw_geom = _resolve_geom(province_name, district_name)
    key = (f"{kind}-diff", province_name, district_name, year_a, year_b)
    url = _cache_get(key)
    if url is None:
        logger.info("⏳ %s diff tiles: %s/%s/%d→%d", kind.upper(), province_name,
                    district_name or '-', year_a, year_b)
        try:
            geom = ee.Geometry(raw_geom)
            img_a = image_fn(geom, year_a)
            img_b = image_fn(geom, year_b)
            if img_a is None or img_b is None:
                raise HTTPException(status_code=404, detail=missing)
            diff = img_b.subtract(img_a)
            url = diff.getMapId(vis)['tile_fetcher'].url_format
            _cache_put(key, url)
        except HTTPException:
            raise
        except ee.EEException as ee_err:
            logger.warning("⚠️  %s diff GEE failed [%s/%d→%d]: %s",
                           kind, province_name, year_a, year_b, ee_err)
            raise HTTPException(status_code=422, detail=(
                f"คำนวณผลต่าง {kind.upper()} ({year_a}→{year_b}) ไม่สำเร็จ — "
                "ภาพถ่ายดาวเทียมอาจไม่ครอบคลุมบางปี ลองเปลี่ยนปี"
            ))
        except Exception:
            logger.error("❌ %s diff error [%s/%d→%d]", kind, province_name, year_a, year_b, exc_info=True)
            raise internal_error()
    return {"tile_url": url, "kind": f"{kind}-diff", "diff": True,
            "year_a": year_a, "year_b": year_b,
            "min": vis['min'], "max": vis['max'], "palette": palette}


@router.get("/maps/{province_name}/ndvi-diff-tiles")
def ndvi_diff_tiles(province_name: str, year_a: YearParam, year_b: YearParam,
                    district_name: str | None = None):
    """แผนที่ผลต่าง NDVI (ปีหลัง − ปีก่อน) — แดง=ลด, เขียว=เพิ่ม"""
    return _serve_diff("ndvi", province_name, district_name, year_a, year_b,
                       _ndvi_image, NDVI_DIFF_VIS, NDVI_DIFF_PALETTE,
                       f"ไม่พบภาพ Sentinel-2 สำหรับปี {year_a} หรือ {year_b}")


@router.get("/maps/{province_name}/lst-diff-tiles")
def lst_diff_tiles(province_name: str, year_a: YearParam, year_b: YearParam,
                   district_name: str | None = None):
    """แผนที่ผลต่าง LST (ปีหลัง − ปีก่อน) — ฟ้า=เย็นลง, แดง=ร้อนขึ้น"""
    return _serve_diff("lst", province_name, district_name, year_a, year_b,
                       _lst_image, LST_DIFF_VIS, LST_DIFF_PALETTE,
                       f"ไม่พบภาพ Landsat สำหรับปี {year_a} หรือ {year_b}")
