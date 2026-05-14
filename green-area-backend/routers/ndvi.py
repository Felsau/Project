from fastapi import APIRouter, HTTPException
import logging
import ee

from dependencies import (get_population, supa_call, internal_error,
                          PROVINCE_GEOMETRIES, DISTRICT_GEOMETRIES,
                          CURRENT_YEAR, WHO_STANDARD_M2, MONTH_NAMES,
                          YearParam, YEAR_MIN, YEAR_MAX, CURRENT_CACHE_VERSION)
from gee_utils import mask_s2_clouds
from schemas import NDVIResponse, NDVIMonthlyResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def _is_stale(row: dict) -> bool:
    """Cache row ที่ควร invalidate และคำนวณใหม่.

    เกณฑ์ (เรียงตาม priority):
      1. cache_version < CURRENT_CACHE_VERSION → schema/logic เปลี่ยน, recompute
      2. ขาด field สำคัญ (green_area_pct, total_area_km2)
      3. NDVI Min ต่ำกว่า −0.05 = cache ก่อนยุค water mask (legacy heuristic)

    เกณฑ์ #3 ถูกแทนที่ด้วย cache_version ในอนาคต — เก็บไว้ backward-compat
    กับ row ที่สร้างก่อน migration 002
    """
    # ใช้ .get default = 1 สำหรับ row จาก legacy schema ที่ยังไม่มี column
    if row.get("cache_version", 1) < CURRENT_CACHE_VERSION:
        return True
    if row.get("green_area_pct") is None or row.get("total_area_km2") is None:
        return True
    nm = row.get("ndvi_min")
    if nm is not None and nm < -0.05:
        return True
    return False


def compute_who_status(green_area_m2, population):
    """คำนวณ m²/คน + ข้อความ WHO เทียบมาตรฐาน 9 m²/คน

    Return tuple (m2_per_person, status_text) — ทั้งสองเป็น None ถ้าข้อมูลไม่พอ
    """
    if not population or not green_area_m2:
        return None, None
    m2_per_person = round(green_area_m2 / population, 2)
    if m2_per_person >= WHO_STANDARD_M2:
        status = f"ผ่านมาตรฐาน WHO ✅ ({m2_per_person:.1f} m²/คน)"
    else:
        status = f"ต่ำกว่ามาตรฐาน WHO ⚠️ ({m2_per_person:.1f} m²/คน)"
    return m2_per_person, status


# ── Shared compute helpers ───────────────────────────────────────────────────
def _compute_ndvi_annual(geom: ee.Geometry, year: int, scale: int):
    """คำนวณ NDVI + พื้นที่สีเขียว ประจำปี — คืน None ถ้าไม่มีภาพ.

    คืน dict ที่ใส่ insert ลง cache + ส่งกลับ client ได้เลย ยกเว้น
    `green_area_m2_raw` ซึ่งเป็นค่าดิบไว้ให้ caller ใช้คำนวณ m²/คน แล้ว pop ทิ้ง.
    """
    def s2_col(cloud_pct):
        return (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(geom)
                .filterDate(f'{year}-01-01', f'{year}-12-31')
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloud_pct))
                .map(mask_s2_clouds))

    col = s2_col(20)
    if col.size().getInfo() == 0:
        col = s2_col(80)
        if col.size().getInfo() == 0:
            return None

    median = col.median().clip(geom)
    ndvi_raw = median.normalizedDifference(['B8', 'B4']).rename('NDVI')

    # Mask water + cloud-shadow pixels: NDVI < 0 บนบกแทบเป็นไปไม่ได้ที่ไม่ใช่ artifact
    # tileScale=4 ลด downsampling artifacts ที่ทำให้ mask ไม่ apply ครบทุก pixel
    water_mask = ndvi_raw.gte(0.0)
    ndvi_land = ndvi_raw.updateMask(water_mask)

    stats = ndvi_land.reduceRegion(
        reducer=ee.Reducer.mean()
                .combine(ee.Reducer.min(), '', True)
                .combine(ee.Reducer.max(), '', True),
        geometry=geom, scale=scale, maxPixels=1e10,
        bestEffort=True, tileScale=4).getInfo()

    ndvi_mean = round(stats.get('NDVI_mean') or 0, 4)
    ndvi_min  = round(stats.get('NDVI_min')  or 0, 4)
    ndvi_max  = round(stats.get('NDVI_max')  or 0, 4)

    # Two thresholds: 0.3 (vegetation incl. crops) and 0.5 (dense forest)
    green_mask = ndvi_raw.gt(0.3)
    dense_mask = ndvi_raw.gt(0.5)

    pixel_area = ee.Image.pixelArea().clip(geom)
    reducer = ee.Reducer.sum()

    total_area_m2 = (pixel_area
                     .reduceRegion(reducer=reducer, geometry=geom,
                                   scale=scale, maxPixels=1e10, bestEffort=True)
                     .get('area').getInfo())
    green_area_m2 = (pixel_area.updateMask(green_mask)
                     .reduceRegion(reducer=reducer, geometry=geom,
                                   scale=scale, maxPixels=1e10, bestEffort=True)
                     .get('area').getInfo())
    dense_area_m2 = (pixel_area.updateMask(dense_mask)
                     .reduceRegion(reducer=reducer, geometry=geom,
                                   scale=scale, maxPixels=1e10, bestEffort=True)
                     .get('area').getInfo())

    total_area_km2 = round((total_area_m2 or 0) / 1_000_000, 2)
    green_area_km2 = round((green_area_m2 or 0) / 1_000_000, 2)
    dense_area_km2 = round((dense_area_m2 or 0) / 1_000_000, 2)
    green_area_pct = round(((green_area_m2 or 0) / total_area_m2) * 100, 1) if total_area_m2 else 0
    dense_area_pct = round(((dense_area_m2 or 0) / total_area_m2) * 100, 1) if total_area_m2 else 0

    return {
        "ndvi_mean": ndvi_mean, "ndvi_min": ndvi_min, "ndvi_max": ndvi_max,
        "green_area_pct": green_area_pct, "green_area_km2": green_area_km2,
        "dense_area_pct": dense_area_pct, "dense_area_km2": dense_area_km2,
        "total_area_km2": total_area_km2,
        "green_area_m2_raw": green_area_m2,
    }


def _compute_ndvi_monthly(geom: ee.Geometry, year: int, scale: int):
    """NDVI 12 เดือน รวมใน 1 round-trip ด้วย ee.List.sequence(server-side map)."""
    def by_month(m):
        m_int = ee.Number(m).toInt()
        col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
               .filterBounds(geom)
               .filter(ee.Filter.calendarRange(m_int, m_int, 'month'))
               .filter(ee.Filter.calendarRange(year, year, 'year'))
               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
               .map(mask_s2_clouds))
        # เติม B8/B4 placeholder กัน normalizedDifference พังตอน col ว่าง
        median = col.median().addBands(
            ee.Image.constant([0, 0]).rename(['B8', 'B4']).selfMask(),
            overwrite=False)
        ndvi = (median.normalizedDifference(['B8', 'B4'])
                .rename('NDVI')
                .reduceRegion(reducer=ee.Reducer.mean(), geometry=geom,
                              scale=scale, maxPixels=1e10, bestEffort=True)
                .get('NDVI'))
        return ee.Feature(None, {'month_num': m_int, 'count': col.size(), 'ndvi': ndvi})

    fc = ee.FeatureCollection(ee.List.sequence(1, 12).map(by_month))
    feats = fc.getInfo()['features']

    results = []
    for f in feats:
        props = f['properties']
        m = int(props['month_num'])
        count = int(props.get('count') or 0)
        ndvi_raw = props.get('ndvi')
        ndvi_val = round(ndvi_raw, 4) if ndvi_raw is not None else None
        results.append({"month": MONTH_NAMES[m - 1], "month_num": m,
                        "ndvi": ndvi_val, "image_count": count})
    return results


# ── District NDVI monthly ────────────────────────────────── (before catch-all)
@router.get("/ndvi/{province_name}/districts/{district_name}/monthly")
def get_district_ndvi_monthly(province_name: str, district_name: str, year: YearParam = CURRENT_YEAR):
    raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
    if not raw_geom:
        raise HTTPException(status_code=404,
                            detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")

    cached = supa_call(lambda s: s.table("district_ndvi_monthly")
                       .select("*")
                       .eq("province", province_name)
                       .eq("district", district_name)
                       .eq("year", year)
                       .execute())
    if cached.data:
        logger.info("✅ Supabase hit: %s/%s/%d/monthly", province_name, district_name, year)
        return {
            "province": province_name, "district": district_name, "year": year,
            "monthly": cached.data[0]["monthly_data"],
            "from_cache": True, "cached_at": cached.data[0]["created_at"],
        }

    logger.info("⏳ Computing district monthly: %s/%s/%d", province_name, district_name, year)
    try:
        results = _compute_ndvi_monthly(ee.Geometry(raw_geom), year, scale=100)
        supa_call(lambda s: s.table("district_ndvi_monthly").insert({
            "province": province_name, "district": district_name,
            "year": year, "monthly_data": results,
            "cache_version": CURRENT_CACHE_VERSION,
        }).execute())
        return {"province": province_name, "district": district_name,
                "year": year, "monthly": results, "from_cache": False}
    except Exception as e:
        logger.error("❌ Error district monthly [%s/%s/%d]", province_name, district_name, year, exc_info=True)
        raise internal_error()


# ── District NDVI annual ─────────────────────────────────── (before catch-all)
@router.get("/ndvi/{province_name}/districts/{district_name}")
def get_district_ndvi(province_name: str, district_name: str, year: YearParam = CURRENT_YEAR):
    raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
    if not raw_geom:
        raise HTTPException(status_code=404,
                            detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")

    cached = supa_call(lambda s: s.table("district_ndvi_annual")
                       .select("*")
                       .eq("province", province_name)
                       .eq("district", district_name)
                       .eq("year", year)
                       .execute())
    if cached.data:
        row = cached.data[0]
        if not _is_stale(row):
            logger.info("✅ Supabase hit: %s/%s/%d", province_name, district_name, year)
            return {
                "province": province_name, "district": district_name, "year": year,
                "ndvi_mean": row["ndvi_mean"], "ndvi_min": row["ndvi_min"],
                "ndvi_max": row["ndvi_max"],
                "green_area_pct": row["green_area_pct"],
                "green_area_km2": row.get("green_area_km2"),
                "total_area_km2": row.get("total_area_km2"),
                "from_cache": True, "cached_at": row["created_at"],
            }
        logger.info("♻️ Stale cache (district): %s/%s/%d — recomputing", province_name, district_name, year)
        supa_call(lambda s: s.table("district_ndvi_annual").delete().eq("id", row["id"]).execute())

    logger.info("⏳ Computing district annual: %s/%s/%d", province_name, district_name, year)
    try:
        result = _compute_ndvi_annual(ee.Geometry(raw_geom), year, scale=100)
        if result is None:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบข้อมูลภาพดาวเทียมสำหรับ {district_name} ในปี {year}")
        result.pop('green_area_m2_raw', None)

        supa_call(lambda s: s.table("district_ndvi_annual").insert({
            "province": province_name, "district": district_name, "year": year,
            **result,
            "cache_version": CURRENT_CACHE_VERSION,
        }).execute())

        return {
            "province": province_name, "district": district_name, "year": year,
            **result, "from_cache": False,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("❌ Error district [%s/%s/%d]", province_name, district_name, year, exc_info=True)
        raise internal_error()


# ── Province NDVI monthly ────────────────────────────────────────────────────
@router.get("/ndvi/{province_name}/monthly", response_model=NDVIMonthlyResponse)
def get_ndvi_monthly(province_name: str, year: YearParam = CURRENT_YEAR):
    raw_geom = PROVINCE_GEOMETRIES.get(province_name)
    if not raw_geom:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    cached = supa_call(lambda s: s.table("ndvi_monthly")
                       .select("*").eq("province", province_name).eq("year", year).execute())
    if cached.data:
        logger.info("✅ Supabase hit: %s/%d/monthly", province_name, year)
        return {
            "province": province_name, "year": year,
            "monthly": cached.data[0]["monthly_data"],
            "from_cache": True, "cached_at": cached.data[0]["created_at"],
        }

    logger.info("⏳ Computing: %s/%d/monthly", province_name, year)
    try:
        results = _compute_ndvi_monthly(ee.Geometry(raw_geom), year, scale=500)
        supa_call(lambda s: s.table("ndvi_monthly").insert({
            "province": province_name, "year": year, "monthly_data": results,
            "cache_version": CURRENT_CACHE_VERSION,
        }).execute())
        return {"province": province_name, "year": year,
                "monthly": results, "from_cache": False}
    except Exception as e:
        raise internal_error()


# ── Province NDVI compare ────────────────────────────────────────────────────
@router.get("/ndvi/{province_name}/compare")
def get_ndvi_compare(province_name: str,
                     years: str = ",".join(str(y) for y in range(CURRENT_YEAR - 3, CURRENT_YEAR + 1))):
    if province_name not in PROVINCE_GEOMETRIES:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")
    year_list = sorted(set(int(y.strip()) for y in years.split(",") if y.strip().isdigit()))
    if not year_list:
        raise HTTPException(status_code=400, detail="years ต้องเป็นตัวเลขคั่นด้วย comma")
    out_of_range = [y for y in year_list if y < YEAR_MIN or y > YEAR_MAX]
    if out_of_range:
        raise HTTPException(status_code=400,
            detail=f"years ต้องอยู่ใน {YEAR_MIN}–{YEAR_MAX} · นอกช่วง: {out_of_range}")

    result = supa_call(lambda s: s.table("ndvi_annual")
                       .select("year,ndvi_mean,ndvi_min,ndvi_max,green_area_pct,green_area_km2,green_area_m2_per_person,who_status")
                       .eq("province", province_name)
                       .in_("year", year_list)
                       .order("year")
                       .execute())
    found = {row["year"]: row for row in result.data}
    data = [
        {"year": y, "available": True, **found[y]} if y in found
        else {"year": y, "available": False}
        for y in year_list
    ]
    return {"province": province_name, "data": data}


# ── Province NDVI annual ─────────────────────────────────────────────────────
@router.get("/ndvi/{province_name}", response_model=NDVIResponse)
def get_ndvi(province_name: str, year: YearParam = CURRENT_YEAR):
    raw_geom = PROVINCE_GEOMETRIES.get(province_name)
    if not raw_geom:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    cached = supa_call(lambda s: s.table("ndvi_annual")
                       .select("*").eq("province", province_name).eq("year", year).execute())
    if cached.data:
        row = cached.data[0]
        if _is_stale(row):
            logger.info("♻️ Stale cache: %s/%d — recomputing", province_name, year)
            supa_call(lambda s: s.table("ndvi_annual").delete().eq("id", row["id"]).execute())
        else:
            logger.info("✅ Supabase hit: %s/%d", province_name, year)
            return {
                "province": province_name, "year": year,
                "ndvi_mean": row["ndvi_mean"], "ndvi_min": row["ndvi_min"],
                "ndvi_max": row["ndvi_max"],
                "green_area_pct": row["green_area_pct"],
                "green_area_km2": row.get("green_area_km2"),
                "total_area_km2": row.get("total_area_km2"),
                "green_area_m2_per_person": row.get("green_area_m2_per_person"),
                "population": row.get("population"),
                "who_status": row.get("who_status"),
                "from_cache": True, "cached_at": row["created_at"],
            }

    logger.info("⏳ Computing: %s/%d", province_name, year)
    try:
        result = _compute_ndvi_annual(ee.Geometry(raw_geom), year, scale=500)
        if result is None:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบข้อมูลภาพดาวเทียมสำหรับ {province_name} ในปี {year}")

        green_area_m2 = result.pop('green_area_m2_raw', None)
        population = get_population(province_name, year)
        m2_per_person, who_status = compute_who_status(green_area_m2, population)

        full = {**result,
                "green_area_m2_per_person": m2_per_person,
                "population": population, "who_status": who_status}

        supa_call(lambda s: s.table("ndvi_annual").insert({
            "province": province_name, "year": year, **full,
            "cache_version": CURRENT_CACHE_VERSION,
        }).execute())

        return {"province": province_name, "year": year, **full, "from_cache": False}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("❌ Error [%s/%d]", province_name, year, exc_info=True)
        raise internal_error()
