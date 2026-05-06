from fastapi import APIRouter, HTTPException
import traceback
import ee

from dependencies import (get_supabase, get_population,
                          PROVINCE_GEOMETRIES, DISTRICT_GEOMETRIES,
                          CURRENT_YEAR, WHO_STANDARD_M2, MONTH_NAMES)
from gee_utils import mask_s2_clouds

router = APIRouter()


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

    ndvi = col.median().clip(geom).normalizedDifference(['B8', 'B4']).rename('NDVI')
    stats = ndvi.reduceRegion(
        reducer=ee.Reducer.mean()
                .combine(ee.Reducer.min(), '', True)
                .combine(ee.Reducer.max(), '', True),
        geometry=geom, scale=scale, maxPixels=1e10, bestEffort=True).getInfo()

    ndvi_mean = round(stats.get('NDVI_mean') or 0, 4)
    ndvi_min  = round(stats.get('NDVI_min')  or 0, 4)
    ndvi_max  = round(stats.get('NDVI_max')  or 0, 4)
    green_mask = ndvi.gt(0.3)

    total_area_m2 = (ee.Image.pixelArea().clip(geom)
                     .reduceRegion(reducer=ee.Reducer.sum(), geometry=geom,
                                   scale=scale, maxPixels=1e10, bestEffort=True)
                     .get('area').getInfo())
    green_area_m2 = (ee.Image.pixelArea().updateMask(green_mask).clip(geom)
                     .reduceRegion(reducer=ee.Reducer.sum(), geometry=geom,
                                   scale=scale, maxPixels=1e10, bestEffort=True)
                     .get('area').getInfo())

    total_area_km2 = round((total_area_m2 or 0) / 1_000_000, 2)
    green_area_km2 = round((green_area_m2 or 0) / 1_000_000, 2)
    green_area_pct = round(((green_area_m2 or 0) / total_area_m2) * 100, 1) if total_area_m2 else 0

    return {
        "ndvi_mean": ndvi_mean, "ndvi_min": ndvi_min, "ndvi_max": ndvi_max,
        "green_area_pct": green_area_pct, "green_area_km2": green_area_km2,
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
        ndvi = (col.median()
                .normalizedDifference(['B8', 'B4'])
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
def get_district_ndvi_monthly(province_name: str, district_name: str, year: int = CURRENT_YEAR):
    raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
    if not raw_geom:
        raise HTTPException(status_code=404,
                            detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")

    supabase = get_supabase()
    cached = (supabase.table("district_ndvi_monthly")
              .select("*")
              .eq("province", province_name)
              .eq("district", district_name)
              .eq("year", year)
              .execute())
    if cached.data:
        print(f"✅ Supabase hit: {province_name}/{district_name}/{year}/monthly")
        return {
            "province": province_name, "district": district_name, "year": year,
            "monthly": cached.data[0]["monthly_data"],
            "from_cache": True, "cached_at": cached.data[0]["created_at"],
        }

    print(f"⏳ Computing district monthly: {province_name}/{district_name}/{year}")
    try:
        results = _compute_ndvi_monthly(ee.Geometry(raw_geom), year, scale=100)
        supabase.table("district_ndvi_monthly").insert({
            "province": province_name, "district": district_name,
            "year": year, "monthly_data": results,
        }).execute()
        return {"province": province_name, "district": district_name,
                "year": year, "monthly": results, "from_cache": False}
    except Exception as e:
        print(f"❌ Error district monthly [{province_name}/{district_name}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── District NDVI annual ─────────────────────────────────── (before catch-all)
@router.get("/ndvi/{province_name}/districts/{district_name}")
def get_district_ndvi(province_name: str, district_name: str, year: int = CURRENT_YEAR):
    raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
    if not raw_geom:
        raise HTTPException(status_code=404,
                            detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")

    supabase = get_supabase()
    cached = (supabase.table("district_ndvi_annual")
              .select("*")
              .eq("province", province_name)
              .eq("district", district_name)
              .eq("year", year)
              .execute())
    if cached.data:
        row = cached.data[0]
        if row.get("green_area_pct") is not None and row.get("total_area_km2") is not None:
            print(f"✅ Supabase hit: {province_name}/{district_name}/{year}")
            return {
                "province": province_name, "district": district_name, "year": year,
                "ndvi_mean": row["ndvi_mean"], "ndvi_min": row["ndvi_min"],
                "ndvi_max": row["ndvi_max"],
                "green_area_pct": row["green_area_pct"],
                "green_area_km2": row.get("green_area_km2"),
                "total_area_km2": row.get("total_area_km2"),
                "from_cache": True, "cached_at": row["created_at"],
            }
        supabase.table("district_ndvi_annual").delete().eq("id", row["id"]).execute()

    print(f"⏳ Computing district annual: {province_name}/{district_name}/{year}")
    try:
        result = _compute_ndvi_annual(ee.Geometry(raw_geom), year, scale=100)
        if result is None:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบข้อมูลภาพดาวเทียมสำหรับ {district_name} ในปี {year}")
        result.pop('green_area_m2_raw', None)

        supabase.table("district_ndvi_annual").insert({
            "province": province_name, "district": district_name, "year": year,
            **result,
        }).execute()

        return {
            "province": province_name, "district": district_name, "year": year,
            **result, "from_cache": False,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error district [{province_name}/{district_name}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Province NDVI monthly ────────────────────────────────────────────────────
@router.get("/ndvi/{province_name}/monthly")
def get_ndvi_monthly(province_name: str, year: int = CURRENT_YEAR):
    raw_geom = PROVINCE_GEOMETRIES.get(province_name)
    if not raw_geom:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    supabase = get_supabase()
    cached = (supabase.table("ndvi_monthly")
              .select("*").eq("province", province_name).eq("year", year).execute())
    if cached.data:
        print(f"✅ Supabase hit: {province_name}/{year}/monthly")
        return {
            "province": province_name, "year": year,
            "monthly": cached.data[0]["monthly_data"],
            "from_cache": True, "cached_at": cached.data[0]["created_at"],
        }

    print(f"⏳ Computing: {province_name}/{year}/monthly")
    try:
        results = _compute_ndvi_monthly(ee.Geometry(raw_geom), year, scale=500)
        supabase.table("ndvi_monthly").insert({
            "province": province_name, "year": year, "monthly_data": results,
        }).execute()
        return {"province": province_name, "year": year,
                "monthly": results, "from_cache": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Province NDVI compare ────────────────────────────────────────────────────
@router.get("/ndvi/{province_name}/compare")
def get_ndvi_compare(province_name: str,
                     years: str = ",".join(str(y) for y in range(CURRENT_YEAR - 3, CURRENT_YEAR + 1))):
    if province_name not in PROVINCE_GEOMETRIES:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")
    year_list = sorted(set(int(y.strip()) for y in years.split(",") if y.strip().isdigit()))
    if not year_list:
        raise HTTPException(status_code=400, detail="years ต้องเป็นตัวเลขคั่นด้วย comma")

    supabase = get_supabase()
    result = (supabase.table("ndvi_annual")
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
@router.get("/ndvi/{province_name}")
def get_ndvi(province_name: str, year: int = CURRENT_YEAR):
    raw_geom = PROVINCE_GEOMETRIES.get(province_name)
    if not raw_geom:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    supabase = get_supabase()
    cached = (supabase.table("ndvi_annual")
              .select("*").eq("province", province_name).eq("year", year).execute())
    if cached.data:
        row = cached.data[0]
        if row.get("green_area_pct") is None or row.get("total_area_km2") is None:
            print(f"♻️ Stale cache: {province_name}/{year} — recomputing")
            supabase.table("ndvi_annual").delete().eq("id", row["id"]).execute()
        else:
            print(f"✅ Supabase hit: {province_name}/{year}")
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

    print(f"⏳ Computing: {province_name}/{year}")
    try:
        result = _compute_ndvi_annual(ee.Geometry(raw_geom), year, scale=500)
        if result is None:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบข้อมูลภาพดาวเทียมสำหรับ {province_name} ในปี {year}")

        green_area_m2 = result.pop('green_area_m2_raw', None)
        population = get_population(supabase, province_name, year)
        if population and green_area_m2:
            m2_per_person = round(green_area_m2 / population, 2)
            who_status = (f"ผ่านมาตรฐาน WHO ✅ ({m2_per_person:.1f} m²/คน)"
                          if m2_per_person >= WHO_STANDARD_M2
                          else f"ต่ำกว่ามาตรฐาน WHO ⚠️ ({m2_per_person:.1f} m²/คน)")
        else:
            m2_per_person = who_status = None

        full = {**result,
                "green_area_m2_per_person": m2_per_person,
                "population": population, "who_status": who_status}

        supabase.table("ndvi_annual").insert({
            "province": province_name, "year": year, **full,
        }).execute()

        return {"province": province_name, "year": year, **full, "from_cache": False}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error [{province_name}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
