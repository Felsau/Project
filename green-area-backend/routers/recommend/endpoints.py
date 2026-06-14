"""Recommendation endpoints — province + district level.

Priority Score = w1·NDVI_deficit + w2·LST_heat + w3·population_need
- NDVI_deficit : พื้นที่ NDVI ต่ำ = ขาดต้นไม้ → ค่าสูงคือควรปลูก
- LST_heat     : อุณหภูมิผิวพื้นสูง = ร้อนเกินต้องการพืช → ค่าสูงคือควรปลูก
- pop_need     : ประชากรหนาแน่น (WorldPop) = คนเยอะต้องการพื้นที่สีเขียว

Province + district ใช้ flow เดียวกันทุกขั้น ต่างแค่ geometry/cache-key →
รวมไว้ใน _run_recommendation() (district_name=None = province-level)
"""
import logging

import ee
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from dependencies import (supa_call, internal_error,
                          PROVINCE_GEOMETRIES, DISTRICT_GEOMETRIES,
                          CURRENT_YEAR, YEAR_MIN, YEAR_MAX, YearParam, WeightParam)
from impact import estimate_impact
from polygon_utils import validate_drawn_polygon

from .scoring import (W_NDVI, W_LST, W_POP,
                      normalize_weights, assert_imagery_available,
                      compute_priority, get_top_locations,
                      compute_plantable_area_m2, get_heatmap_url)
from .species import get_recommended_species
from .tile_cache import get_cached_tile_url, store_tile_url

router = APIRouter()
logger = logging.getLogger(__name__)


def _run_recommendation(province_name: str, district_name: str | None,
                        raw_geom: dict, year: int,
                        w_ndvi: float, w_lst: float, w_pop: float):
    """Shared province/district recommendation flow.

    district_name=None → province-level (cache row มี district IS NULL).
    Caller รับผิดชอบ validate geometry + return 404 ก่อนเรียก helper นี้.
    """
    w_ndvi, w_lst, w_pop = normalize_weights(w_ndvi, w_lst, w_pop)
    is_default = (w_ndvi, w_lst, w_pop) == (W_NDVI, W_LST, W_POP)
    species_info = get_recommended_species(province_name)
    label = province_name if district_name is None else f"{province_name}/{district_name}"

    def _base_response(**extra):
        resp = {"province": province_name, "year": year,
                "weights": {"ndvi": w_ndvi, "lst": w_lst, "population": w_pop},
                "recommended_species": species_info, **extra}
        if district_name is not None:
            resp["district"] = district_name
        return resp

    # Custom weights → bypass DB cache (top_locations จะต่างไปทุก combination)
    if is_default:
        def _cache_query(s):
            q = (s.table("planting_recommendations").select("*")
                 .eq("province", province_name).eq("year", year))
            q = (q.is_("district", "null") if district_name is None
                 else q.eq("district", district_name))
            return q.execute()
        cached = supa_call(_cache_query)
        if cached.data:
            row = cached.data[0]
            tile_url = get_cached_tile_url(province_name, district_name, year)
            impact = row.get("impact")
            # tile URL หมดอายุพร้อม GEE session / impact อาจยังไม่เคย back-fill
            if tile_url is None or impact is None:
                try:
                    geom = ee.Geometry(raw_geom)
                    priority, _, _, _ = compute_priority(geom, year, w_ndvi, w_lst, w_pop)
                    if tile_url is None:
                        tile_url = get_heatmap_url(priority)
                        store_tile_url(province_name, district_name, year, tile_url)
                    if impact is None:
                        plantable_m2 = compute_plantable_area_m2(priority, geom)
                        impact = estimate_impact(plantable_m2, species_info.get("species", []))
                        # back-fill impact ลง cache row เพื่อรอบหลังไม่ต้อง recompute
                        try:
                            supa_call(lambda s: s.table("planting_recommendations")
                                .update({"impact": impact}).eq("id", row["id"]).execute())
                        except Exception as cache_err:
                            logger.warning("⚠️  Impact back-fill failed (non-fatal): %s", cache_err)
                except Exception:
                    logger.error("❌ Recommend tile refresh error [%s/%d]", label, year, exc_info=True)
                    raise internal_error()
            return _base_response(tile_url=tile_url, top_locations=row["top_locations"],
                                  impact=impact, from_cache=True, cached_at=row["created_at"])

    logger.info("⏳ Computing recommendation: %s/%d (w=%.2f/%.2f/%.2f%s)",
                label, year, w_ndvi, w_lst, w_pop, "" if is_default else " custom")
    try:
        geom = ee.Geometry(raw_geom)
        assert_imagery_available(geom, year)
        priority, _, _, _ = compute_priority(geom, year, w_ndvi, w_lst, w_pop)
        tile_url = get_heatmap_url(priority)
        top = get_top_locations(priority, geom, n=10)
        plantable_m2 = compute_plantable_area_m2(priority, geom)
        impact = estimate_impact(plantable_m2, species_info.get("species", []))

        # Cache เฉพาะ default weights (ไม่งั้นจะปนกัน + DB บวมโดยเปล่าประโยชน์)
        if is_default:
            store_tile_url(province_name, district_name, year, tile_url)
            try:
                # ไม่เก็บ tile_url ลง DB — URL ผูก GEE session ที่หมดอายุใน ~ชั่วโมง
                # (ดู get_heatmap_url docstring) · cache-hit อ่านจาก in-process TTL
                # cache แล้ว refresh ใหม่ทุกครั้งที่ serve แทน
                supa_call(lambda s: s.table("planting_recommendations").insert({
                    "province": province_name, "district": district_name, "year": year,
                    "top_locations": top, "impact": impact,
                }).execute())
            except Exception as cache_err:
                logger.warning("⚠️  Cache insert failed (non-fatal): %s", cache_err)

        return _base_response(tile_url=tile_url, top_locations=top,
                              impact=impact, from_cache=False)
    except HTTPException:
        raise
    except ee.EEException as ee_err:
        # GEE คำนวณไม่สำเร็จ (data ขาดบางส่วน, asset edge case) — assert ก่อนหน้า
        # จับได้แค่ collection ว่างทั้งดุ้น แต่ image ที่ all-masked ก็ทำให้ getMapId
        # พังด้วย 'input may not be null' เช่นกัน → 422 + แนะนำให้เปลี่ยนปี
        logger.warning("⚠️  GEE compute failed [%s/%d]: %s", label, year, ee_err)
        scope = "พื้นที่นี้" if district_name is None else "อำเภอนี้"
        raise HTTPException(status_code=422, detail=(
            f"คำนวณ priority สำหรับปี {year} ไม่สำเร็จ — "
            f"ข้อมูลภาพถ่ายดาวเทียมอาจไม่ครอบคลุม{scope} ลองปีก่อนหน้านี้"
        ))
    except Exception:
        logger.error("❌ Recommend error [%s/%d]", label, year, exc_info=True)
        raise internal_error()


# ── Province-level recommendation ────────────────────────────────────────────
@router.get("/recommend/{province_name}")
def recommend_province(province_name: str, year: YearParam = CURRENT_YEAR,
                       w_ndvi: WeightParam = W_NDVI, w_lst: WeightParam = W_LST,
                       w_pop: WeightParam = W_POP):
    raw_geom = PROVINCE_GEOMETRIES.get(province_name)
    if not raw_geom:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")
    return _run_recommendation(province_name, None, raw_geom, year, w_ndvi, w_lst, w_pop)


# ── District-level recommendation ────────────────────────────────────────────
@router.get("/recommend/{province_name}/districts/{district_name}")
def recommend_district(province_name: str, district_name: str,
                       year: YearParam = CURRENT_YEAR,
                       w_ndvi: WeightParam = W_NDVI, w_lst: WeightParam = W_LST,
                       w_pop: WeightParam = W_POP):
    raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
    if not raw_geom:
        raise HTTPException(status_code=404,
            detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")
    return _run_recommendation(province_name, district_name, raw_geom, year, w_ndvi, w_lst, w_pop)


# ── Custom-area recommendation (user-drawn polygon) ──────────────────────────
class CustomAreaRecommendRequest(BaseModel):
    """Body ของ POST /recommend/custom-area"""
    geometry: dict = Field(..., description="GeoJSON Polygon geometry")
    year: int = Field(default=CURRENT_YEAR, ge=YEAR_MIN, le=YEAR_MAX,
                      description=f"ปี ค.ศ. ระหว่าง {YEAR_MIN}–{YEAR_MAX}")
    # ใบ้จังหวัด (centroid ตกในจังหวัดไหน) — ใช้เลือกพันธุ์ไม้ตามภาคเท่านั้น
    province: str | None = Field(default=None, description="ชื่อจังหวัด (อังกฤษ) สำหรับเลือกพันธุ์ไม้")
    w_ndvi: float = Field(default=W_NDVI, ge=0, le=1)
    w_lst: float = Field(default=W_LST, ge=0, le=1)
    w_pop: float = Field(default=W_POP, ge=0, le=1)


@router.post("/recommend/custom-area")
def recommend_custom_area(req: CustomAreaRecommendRequest):
    """AI Recommend (priority heatmap + top-10 + impact + พันธุ์ไม้) บน polygon ที่ผู้ใช้
    วาดเอง — คำนวณสดทุกครั้ง (ไม่ cache เพราะ geometry ไม่ซ้ำ) · พันธุ์ไม้เลือกตามภาค
    ของจังหวัดที่ centroid ตกอยู่ (ส่งมาใน req.province) — ถ้าไม่รู้ก็คืน species ว่าง"""
    try:
        area_km2 = validate_drawn_polygon(req.geometry)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    w_ndvi, w_lst, w_pop = normalize_weights(req.w_ndvi, req.w_lst, req.w_pop)
    # province ใช้แค่เลือกพันธุ์ไม้ — ถ้าไม่อยู่ใน whitelist ก็ข้าม (คืน species ว่าง)
    province = req.province if req.province in PROVINCE_GEOMETRIES else None
    species_info = (get_recommended_species(province) if province
                    else {"region": None, "species": []})

    logger.info("⏳ Custom-area recommend: %.1f km² · ปี %d (w=%.2f/%.2f/%.2f)",
                area_km2, req.year, w_ndvi, w_lst, w_pop)
    try:
        geom = ee.Geometry(req.geometry)
        assert_imagery_available(geom, req.year)
        priority, _, _, _ = compute_priority(geom, req.year, w_ndvi, w_lst, w_pop)
        tile_url = get_heatmap_url(priority)
        top = get_top_locations(priority, geom, n=10)
        plantable_m2 = compute_plantable_area_m2(priority, geom)
        impact = estimate_impact(plantable_m2, species_info.get("species", []))
        return {
            "year": req.year,
            "area_km2": round(area_km2, 2),
            "province": province,
            "weights": {"ndvi": w_ndvi, "lst": w_lst, "population": w_pop},
            "tile_url": tile_url,
            "top_locations": top,
            "recommended_species": species_info,
            "impact": impact,
        }
    except HTTPException:
        raise
    except ee.EEException as ee_err:
        logger.warning("⚠️ Custom-area recommend GEE failed (ปี %d): %s", req.year, ee_err)
        raise HTTPException(status_code=422, detail=(
            f"คำนวณ priority สำหรับปี {req.year} ไม่สำเร็จ — "
            "ข้อมูลภาพถ่ายดาวเทียมอาจไม่ครอบคลุมพื้นที่นี้ ลองปีก่อนหน้า"
        ))
    except Exception:
        logger.error("❌ Custom-area recommend error (ปี %d)", req.year, exc_info=True)
        raise internal_error()
