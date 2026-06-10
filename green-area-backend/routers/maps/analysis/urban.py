"""Urban subset (Phase B-3) — WHO-comparable green-per-person ภายในเขต Built-up."""
import logging

import ee
from fastapi import APIRouter, HTTPException

from dependencies import (supa_call, internal_error,
                          PROVINCE_GEOMETRIES, DISTRICT_GEOMETRIES,
                          CURRENT_YEAR, WHO_STANDARD_M2, CURRENT_CACHE_VERSION,
                          WORLDPOP_YEAR, YearParam)
from gee_utils import mask_s2_clouds

# ESA WorldCover v200 class code (Built-up = สิ่งปลูกสร้าง/พื้นที่ urban)
ESA_BUILTUP_CLASS = 50

router = APIRouter()
logger = logging.getLogger(__name__)


# Optional cache table (สร้างเองใน Supabase ก่อนใช้ ถ้าต้องการ cache):
#   CREATE TABLE urban_ndvi_annual (
#     id BIGSERIAL PRIMARY KEY,
#     province TEXT NOT NULL, district TEXT, year INT NOT NULL,
#     worldcover_year INT, worldpop_year INT,
#     total_area_km2 NUMERIC, urban_area_km2 NUMERIC, urban_share_pct NUMERIC,
#     ndvi_mean_urban NUMERIC,
#     green_in_urban_km2 NUMERIC, green_share_in_urban_pct NUMERIC,
#     population_urban INT, m2_per_person_urban NUMERIC, who_urban_pass BOOLEAN,
#     created_at TIMESTAMPTZ DEFAULT NOW()
#   );
# ถ้าไม่สร้าง endpoint ยังทำงานได้ปกติ — แค่คำนวณใหม่ทุกครั้ง (ใช้เวลา 30-60s ต่อครั้ง)
@router.get("/analysis/urban-subset/{province_name}")
def get_urban_subset(province_name: str, year: YearParam = CURRENT_YEAR,
                     district_name: str | None = None):
    """NDVI + green area + ประชากร เฉพาะภายในเขต Built-up (ESA WorldCover v200, ปี 2021).

    เปรียบ WHO 9 m²/คน ได้ตรงกว่าค่ารวมระดับจังหวัด เพราะ scope = "พื้นที่ที่คนอยู่"
    ไม่ใช่ป่า/เกษตรนอกเมือง · WorldCover ใช้ปี 2021 เป็น proxy สำหรับขอบเขตเมืองในทุกปี
    (built-up เปลี่ยนแปลงน้อยใน timescale ปี)
    """
    if district_name:
        raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
        if not raw_geom:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")
        scope = f"{province_name}/{district_name}"
    else:
        raw_geom = PROVINCE_GEOMETRIES.get(province_name)
        if not raw_geom:
            raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")
        scope = province_name

    # Cache lookup (best-effort — ถ้า table ยังไม่มี ก็ skip)
    try:
        def _cache_q(s):
            q = (s.table("urban_ndvi_annual").select("*")
                 .eq("province", province_name).eq("year", year))
            if district_name:
                q = q.eq("district", district_name)
            else:
                q = q.is_("district", "null")
            return q.execute()
        cached = supa_call(_cache_q)
        if cached.data:
            row = cached.data[0]
            if row.get("cache_version", 1) >= CURRENT_CACHE_VERSION:
                logger.info("✅ Urban cache hit: %s/%d", scope, year)
                return {**row, "from_cache": True}
            # row เก่ากว่า compute version ปัจจุบัน → ลบทิ้งแล้วคำนวณใหม่
            # (ลบก่อน ไม่งั้น insert รอบใหม่ชน UNIQUE(province,district,year))
            logger.info("♻️ Urban stale cache: %s/%d — recomputing", scope, year)
            supa_call(lambda s: s.table("urban_ndvi_annual")
                      .delete().eq("id", row["id"]).execute())
    except Exception as e:
        logger.warning("⚠️ Urban cache lookup skipped (non-fatal): %s", e)

    logger.info("⏳ Computing urban subset: %s/%d", scope, year)
    try:
        geom = ee.Geometry(raw_geom)

        # ESA WorldCover v200 = single image, ปี 2021 — ใช้เป็น proxy ของ urban extent
        wc = ee.ImageCollection("ESA/WorldCover/v200").first().clip(geom)
        built_up = wc.eq(ESA_BUILTUP_CLASS)

        # Sentinel-2 NDVI ของปีที่ขอ
        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
              .filterBounds(geom)
              .filterDate(f'{year}-01-01', f'{year + 1}-01-01')  # end exclusive — รวม 31 ธ.ค.
              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
              .map(mask_s2_clouds))
        if s2.size().getInfo() == 0:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบภาพ Sentinel-2 สำหรับ {scope} ปี {year}")
        ndvi = s2.median().normalizedDifference(['B8', 'B4']).rename('NDVI')
        green_mask = ndvi.gt(0.3)

        # Reductions: split sum/mean ออก 2 รอบเพื่อความชัด — แต่ละรอบ getInfo() ครั้งเดียว
        pixel_area = ee.Image.pixelArea().clip(geom)
        scale = 30  # ความละเอียดที่ balance ระหว่างความเร็วและความแม่น (WorldCover = 10m)

        # 1) sum: total/urban/green-in-urban areas
        area_stack = (pixel_area.rename('total_area')
                      .addBands(pixel_area.updateMask(built_up).rename('urban_area'))
                      .addBands(pixel_area.updateMask(built_up.And(green_mask))
                                .rename('green_urban_area')))
        area_sums = area_stack.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=geom, scale=scale, maxPixels=1e10, bestEffort=True, tileScale=4,
        ).getInfo()
        total_m2 = area_sums.get('total_area') or 0
        urban_m2 = area_sums.get('urban_area') or 0
        green_in_urban_m2 = area_sums.get('green_urban_area') or 0

        # 2) mean NDVI within built-up
        ndvi_urban_mean = (ndvi.updateMask(built_up)
                           .reduceRegion(reducer=ee.Reducer.mean(),
                                         geometry=geom, scale=scale,
                                         maxPixels=1e10, bestEffort=True, tileScale=4)
                           .get('NDVI').getInfo())

        # Population ภายใน built-up (WorldPop 100m, ปี WORLDPOP_YEAR)
        pop_img = (ee.ImageCollection('WorldPop/GP/100m/pop')
                   .filter(ee.Filter.eq('country', 'THA'))
                   .filter(ee.Filter.eq('year', WORLDPOP_YEAR))
                   .first())
        pop_urban = (ee.Image(pop_img).select('population')
                     .updateMask(built_up)
                     .reduceRegion(reducer=ee.Reducer.sum(), geometry=geom,
                                   scale=100, maxPixels=1e10, bestEffort=True)
                     .get('population').getInfo()) or 0

        urban_km2 = round(urban_m2 / 1_000_000, 2)
        green_in_urban_km2 = round(green_in_urban_m2 / 1_000_000, 2)
        urban_share = round((urban_m2 / total_m2) * 100, 2) if total_m2 else 0
        green_share_in_urban = round((green_in_urban_m2 / urban_m2) * 100, 1) if urban_m2 else 0
        pop_urban_int = int(round(pop_urban))
        m2_per_person_urban = (round(green_in_urban_m2 / pop_urban_int, 2)
                               if pop_urban_int > 0 else None)
        who_urban_pass = (m2_per_person_urban is not None
                          and m2_per_person_urban >= WHO_STANDARD_M2)

        result = {
            "province": province_name, "district": district_name, "year": year,
            "worldcover_year": 2021, "worldpop_year": WORLDPOP_YEAR,
            "total_area_km2": round(total_m2 / 1_000_000, 2),
            "urban_area_km2": urban_km2,
            "urban_share_pct": urban_share,
            "ndvi_mean_urban": round(ndvi_urban_mean, 4) if ndvi_urban_mean is not None else None,
            "green_in_urban_km2": green_in_urban_km2,
            "green_share_in_urban_pct": green_share_in_urban,
            "population_urban": pop_urban_int,
            "m2_per_person_urban": m2_per_person_urban,
            "who_urban_pass": who_urban_pass,
        }

        # Cache (best-effort — แค่ insert ถ้า table มีอยู่)
        try:
            supa_call(lambda s: s.table("urban_ndvi_annual").insert(
                {**result, "cache_version": CURRENT_CACHE_VERSION}).execute())
        except Exception as e:
            logger.warning("⚠️ Urban cache insert failed (non-fatal — table อาจยังไม่ถูกสร้าง): %s", e)

        return {**result, "from_cache": False}

    except HTTPException:
        raise
    except Exception:
        logger.error("❌ Urban subset error [%s/%d]", scope, year, exc_info=True)
        raise internal_error()
