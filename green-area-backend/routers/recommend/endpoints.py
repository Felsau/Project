"""Recommendation endpoints — province + district level.

Priority Score = w1·NDVI_deficit + w2·LST_heat + w3·population_need
- NDVI_deficit : พื้นที่ NDVI ต่ำ = ขาดต้นไม้ → ค่าสูงคือควรปลูก
- LST_heat     : อุณหภูมิผิวพื้นสูง = ร้อนเกินต้องการพืช → ค่าสูงคือควรปลูก
- pop_need     : ประชากรหนาแน่น (WorldPop) = คนเยอะต้องการพื้นที่สีเขียว
"""
import logging

import ee
from fastapi import APIRouter, HTTPException

from dependencies import (supa_call, internal_error,
                          PROVINCE_GEOMETRIES, DISTRICT_GEOMETRIES,
                          CURRENT_YEAR, YearParam)
from impact import estimate_impact

from .scoring import (W_NDVI, W_LST, W_POP,
                      normalize_weights, assert_imagery_available,
                      compute_priority, get_top_locations,
                      compute_plantable_area_m2, get_heatmap_url)
from .species import get_recommended_species
from .tile_cache import get_cached_tile_url, store_tile_url

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Province-level recommendation ────────────────────────────────────────────
@router.get("/recommend/{province_name}")
def recommend_province(province_name: str, year: YearParam = CURRENT_YEAR,
                       w_ndvi: float = W_NDVI, w_lst: float = W_LST, w_pop: float = W_POP):
    raw_geom = PROVINCE_GEOMETRIES.get(province_name)
    if not raw_geom:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    w_ndvi, w_lst, w_pop = normalize_weights(w_ndvi, w_lst, w_pop)
    is_default = (w_ndvi, w_lst, w_pop) == (W_NDVI, W_LST, W_POP)
    species_info = get_recommended_species(province_name)

    # Custom weights → bypass DB cache (top_locations จะต่างไปทุก combination)
    if is_default:
        cached = supa_call(lambda s: s.table("planting_recommendations")
                           .select("*").eq("province", province_name)
                           .is_("district", "null").eq("year", year).execute())
        if cached.data:
            row = cached.data[0]
            tile_url = get_cached_tile_url(province_name, None, year)
            impact = row.get("impact")
            if tile_url is None or impact is None:
                try:
                    geom = ee.Geometry(raw_geom)
                    priority, _, _, _ = compute_priority(geom, year, w_ndvi, w_lst, w_pop)
                    if tile_url is None:
                        tile_url = get_heatmap_url(priority)
                        store_tile_url(province_name, None, year, tile_url)
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
                    logger.error("❌ Recommend tile refresh error [%s/%d]", province_name, year, exc_info=True)
                    raise internal_error()
            return {
                "province": province_name, "year": year,
                "tile_url": tile_url, "top_locations": row["top_locations"],
                "weights": {"ndvi": w_ndvi, "lst": w_lst, "population": w_pop},
                "recommended_species": species_info,
                "impact": impact,
                "from_cache": True, "cached_at": row["created_at"],
            }

    logger.info("⏳ Computing recommendation: %s/%d (w=%.2f/%.2f/%.2f%s)",
                province_name, year, w_ndvi, w_lst, w_pop,
                "" if is_default else " custom")
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
            store_tile_url(province_name, None, year, tile_url)
            try:
                supa_call(lambda s: s.table("planting_recommendations").insert({
                    "province": province_name, "district": None, "year": year,
                    "tile_url": tile_url, "top_locations": top, "impact": impact,
                }).execute())
            except Exception as cache_err:
                logger.warning("⚠️  Cache insert failed (non-fatal): %s", cache_err)

        return {
            "province": province_name, "year": year,
            "tile_url": tile_url, "top_locations": top,
            "weights": {"ndvi": w_ndvi, "lst": w_lst, "population": w_pop},
            "recommended_species": species_info,
            "impact": impact,
            "from_cache": False,
        }
    except HTTPException:
        raise
    except ee.EEException as ee_err:
        # GEE คำนวณไม่สำเร็จ (data ขาดบางส่วน, asset edge case) — assert ก่อนหน้า
        # จับได้แค่ collection ว่างทั้งดุ้น แต่ image ที่ all-masked ก็ทำให้ getMapId
        # พังด้วย 'input may not be null' เช่นกัน → 422 + แนะนำให้เปลี่ยนปี
        logger.warning("⚠️  GEE compute failed [%s/%d]: %s", province_name, year, ee_err)
        raise HTTPException(status_code=422, detail=(
            f"คำนวณ priority สำหรับปี {year} ไม่สำเร็จ — "
            "ข้อมูลภาพถ่ายดาวเทียมอาจไม่ครอบคลุมพื้นที่นี้ ลองปีก่อนหน้านี้"
        ))
    except Exception:
        logger.error("❌ Recommend error [%s/%d]", province_name, year, exc_info=True)
        raise internal_error()


# ── District-level recommendation ────────────────────────────────────────────
@router.get("/recommend/{province_name}/districts/{district_name}")
def recommend_district(province_name: str, district_name: str,
                       year: YearParam = CURRENT_YEAR,
                       w_ndvi: float = W_NDVI, w_lst: float = W_LST, w_pop: float = W_POP):
    raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
    if not raw_geom:
        raise HTTPException(status_code=404,
            detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")

    w_ndvi, w_lst, w_pop = normalize_weights(w_ndvi, w_lst, w_pop)
    is_default = (w_ndvi, w_lst, w_pop) == (W_NDVI, W_LST, W_POP)
    species_info = get_recommended_species(province_name)

    if is_default:
        cached = supa_call(lambda s: s.table("planting_recommendations")
                           .select("*").eq("province", province_name)
                           .eq("district", district_name).eq("year", year).execute())
        if cached.data:
            row = cached.data[0]
            tile_url = get_cached_tile_url(province_name, district_name, year)
            impact = row.get("impact")
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
                        try:
                            supa_call(lambda s: s.table("planting_recommendations")
                                .update({"impact": impact}).eq("id", row["id"]).execute())
                        except Exception as cache_err:
                            logger.warning("⚠️  Impact back-fill failed (non-fatal): %s", cache_err)
                except Exception:
                    logger.error("❌ Recommend tile refresh error [%s/%s/%d]", province_name, district_name, year, exc_info=True)
                    raise internal_error()
            return {
                "province": province_name, "district": district_name, "year": year,
                "tile_url": tile_url, "top_locations": row["top_locations"],
                "weights": {"ndvi": w_ndvi, "lst": w_lst, "population": w_pop},
                "recommended_species": species_info,
                "impact": impact,
                "from_cache": True, "cached_at": row["created_at"],
            }

    logger.info("⏳ Computing recommendation: %s/%s/%d (w=%.2f/%.2f/%.2f%s)",
                province_name, district_name, year, w_ndvi, w_lst, w_pop,
                "" if is_default else " custom")
    try:
        geom = ee.Geometry(raw_geom)
        assert_imagery_available(geom, year)
        priority, _, _, _ = compute_priority(geom, year, w_ndvi, w_lst, w_pop)
        tile_url = get_heatmap_url(priority)
        top = get_top_locations(priority, geom, n=10)
        plantable_m2 = compute_plantable_area_m2(priority, geom)
        impact = estimate_impact(plantable_m2, species_info.get("species", []))

        if is_default:
            store_tile_url(province_name, district_name, year, tile_url)
            try:
                supa_call(lambda s: s.table("planting_recommendations").insert({
                    "province": province_name, "district": district_name,
                    "year": year, "tile_url": tile_url,
                    "top_locations": top, "impact": impact,
                }).execute())
            except Exception as cache_err:
                logger.warning("⚠️  Cache insert failed (non-fatal): %s", cache_err)

        return {
            "province": province_name, "district": district_name, "year": year,
            "tile_url": tile_url, "top_locations": top,
            "weights": {"ndvi": w_ndvi, "lst": w_lst, "population": w_pop},
            "recommended_species": species_info,
            "impact": impact,
            "from_cache": False,
        }
    except HTTPException:
        raise
    except ee.EEException as ee_err:
        logger.warning("⚠️  GEE compute failed [%s/%s/%d]: %s",
                       province_name, district_name, year, ee_err)
        raise HTTPException(status_code=422, detail=(
            f"คำนวณ priority สำหรับปี {year} ไม่สำเร็จ — "
            "ข้อมูลภาพถ่ายดาวเทียมอาจไม่ครอบคลุมอำเภอนี้ ลองปีก่อนหน้านี้"
        ))
    except Exception:
        logger.error("❌ Recommend error [%s/%s/%d]", province_name, district_name, year, exc_info=True)
        raise internal_error()
