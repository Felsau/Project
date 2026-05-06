from fastapi import APIRouter, HTTPException
import traceback
import ee

from dependencies import (get_supabase, get_population,
                          PROVINCE_GEOMETRIES, DISTRICT_GEOMETRIES,
                          CURRENT_YEAR, WHO_STANDARD_M2, MONTH_NAMES)
from gee_utils import mask_s2_clouds

router = APIRouter()


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
        district_geom = ee.Geometry(raw_geom)
        results = []
        for m in range(1, 13):
            col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterBounds(district_geom)
                   .filter(ee.Filter.calendarRange(m, m, 'month'))
                   .filter(ee.Filter.calendarRange(year, year, 'year'))
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
                   .map(mask_s2_clouds))
            count = col.size().getInfo()
            if count > 0:
                ndvi_img = (col.median()
                            .normalizedDifference(['B8', 'B4'])
                            .rename('NDVI')
                            .clip(district_geom))
                stats = ndvi_img.reduceRegion(
                    reducer=ee.Reducer.mean(), geometry=district_geom,
                    scale=100, maxPixels=1e10, bestEffort=True).getInfo()
                raw = stats.get('NDVI', None)
                ndvi_val = round(raw, 4) if raw is not None else None
            else:
                ndvi_val = None
            results.append({"month": MONTH_NAMES[m - 1], "month_num": m,
                             "ndvi": ndvi_val, "image_count": count})

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
        district_geom = ee.Geometry(raw_geom)

        def s2_col(cloud_pct):
            return (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                    .filterBounds(district_geom)
                    .filterDate(f'{year}-01-01', f'{year}-12-31')
                    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloud_pct))
                    .map(mask_s2_clouds))

        col = s2_col(20)
        size = col.size().getInfo()
        if size == 0:
            col = s2_col(80)
            size = col.size().getInfo()
        if size == 0:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบข้อมูลภาพดาวเทียมสำหรับ {district_name} ในปี {year}")

        s2   = col.median().clip(district_geom)
        ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI')
        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean()
                    .combine(ee.Reducer.min(), '', True)
                    .combine(ee.Reducer.max(), '', True),
            geometry=district_geom, scale=100, maxPixels=1e10, bestEffort=True).getInfo()

        ndvi_mean = round(stats.get('NDVI_mean') or 0, 4)
        ndvi_min  = round(stats.get('NDVI_min')  or 0, 4)
        ndvi_max  = round(stats.get('NDVI_max')  or 0, 4)
        green_mask = ndvi.gt(0.3)

        total_area_m2 = (ee.Image.pixelArea().clip(district_geom)
                         .reduceRegion(reducer=ee.Reducer.sum(), geometry=district_geom,
                                       scale=100, maxPixels=1e10, bestEffort=True)
                         .get('area').getInfo())
        green_area_m2 = (ee.Image.pixelArea().updateMask(green_mask).clip(district_geom)
                         .reduceRegion(reducer=ee.Reducer.sum(), geometry=district_geom,
                                       scale=100, maxPixels=1e10, bestEffort=True)
                         .get('area').getInfo())

        total_area_km2 = round((total_area_m2 or 0) / 1_000_000, 2)
        green_area_km2 = round((green_area_m2 or 0) / 1_000_000, 2)
        green_area_pct = round(((green_area_m2 or 0) / total_area_m2) * 100, 1) if total_area_m2 else 0

        supabase.table("district_ndvi_annual").insert({
            "province": province_name, "district": district_name, "year": year,
            "ndvi_mean": ndvi_mean, "ndvi_min": ndvi_min, "ndvi_max": ndvi_max,
            "green_area_pct": green_area_pct, "green_area_km2": green_area_km2,
            "total_area_km2": total_area_km2,
        }).execute()

        return {
            "province": province_name, "district": district_name, "year": year,
            "ndvi_mean": ndvi_mean, "ndvi_min": ndvi_min, "ndvi_max": ndvi_max,
            "green_area_pct": green_area_pct, "green_area_km2": green_area_km2,
            "total_area_km2": total_area_km2, "from_cache": False,
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
        province_geom = ee.Geometry(raw_geom)
        results = []
        for m in range(1, 13):
            col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterBounds(province_geom)
                   .filter(ee.Filter.calendarRange(m, m, 'month'))
                   .filter(ee.Filter.calendarRange(year, year, 'year'))
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
                   .map(mask_s2_clouds))
            count = col.size().getInfo()
            if count > 0:
                ndvi_img = (col.median()
                            .normalizedDifference(['B8', 'B4'])
                            .rename('NDVI')
                            .clip(province_geom))
                stats = ndvi_img.reduceRegion(
                    reducer=ee.Reducer.mean(), geometry=province_geom,
                    scale=500, maxPixels=1e10, bestEffort=True).getInfo()
                raw = stats.get('NDVI', None)
                ndvi_val = round(raw, 4) if raw is not None else None
            else:
                ndvi_val = None
            results.append({"month": MONTH_NAMES[m - 1], "month_num": m,
                             "ndvi": ndvi_val, "image_count": count})

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
        province_geom = ee.Geometry(raw_geom)

        def s2_col(cloud_pct):
            return (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                    .filterBounds(province_geom)
                    .filterDate(f'{year}-01-01', f'{year}-12-31')
                    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloud_pct))
                    .map(mask_s2_clouds))

        col = s2_col(20)
        size = col.size().getInfo()
        if size == 0:
            col = s2_col(80)
            size = col.size().getInfo()
        if size == 0:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบข้อมูลภาพดาวเทียมสำหรับ {province_name} ในปี {year}")

        s2   = col.median().clip(province_geom)
        ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI')
        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean()
                    .combine(ee.Reducer.min(), '', True)
                    .combine(ee.Reducer.max(), '', True),
            geometry=province_geom, scale=500, maxPixels=1e10, bestEffort=True).getInfo()

        ndvi_mean = round(stats.get('NDVI_mean') or 0, 4)
        ndvi_min  = round(stats.get('NDVI_min')  or 0, 4)
        ndvi_max  = round(stats.get('NDVI_max')  or 0, 4)
        green_mask = ndvi.gt(0.3)

        total_area_m2 = (ee.Image.pixelArea().clip(province_geom)
                         .reduceRegion(reducer=ee.Reducer.sum(), geometry=province_geom,
                                       scale=500, maxPixels=1e10, bestEffort=True)
                         .get('area').getInfo())
        green_area_m2 = (ee.Image.pixelArea().updateMask(green_mask).clip(province_geom)
                         .reduceRegion(reducer=ee.Reducer.sum(), geometry=province_geom,
                                       scale=500, maxPixels=1e10, bestEffort=True)
                         .get('area').getInfo())

        total_area_km2 = round((total_area_m2 or 0) / 1_000_000, 2)
        green_area_km2 = round((green_area_m2 or 0) / 1_000_000, 2)
        green_area_pct = round(((green_area_m2 or 0) / total_area_m2) * 100, 1) if total_area_m2 else 0

        population = get_population(supabase, province_name, year)
        if population and green_area_m2:
            m2_per_person = round(green_area_m2 / population, 2)
            who_status = (f"ผ่านมาตรฐาน WHO ✅ ({m2_per_person:.1f} m²/คน)"
                          if m2_per_person >= WHO_STANDARD_M2
                          else f"ต่ำกว่ามาตรฐาน WHO ⚠️ ({m2_per_person:.1f} m²/คน)")
        else:
            m2_per_person = who_status = None

        supabase.table("ndvi_annual").insert({
            "province": province_name, "year": year,
            "ndvi_mean": ndvi_mean, "ndvi_min": ndvi_min, "ndvi_max": ndvi_max,
            "green_area_pct": green_area_pct, "green_area_km2": green_area_km2,
            "total_area_km2": total_area_km2,
            "green_area_m2_per_person": m2_per_person,
            "population": population, "who_status": who_status,
        }).execute()

        return {
            "province": province_name, "year": year,
            "ndvi_mean": ndvi_mean, "ndvi_min": ndvi_min, "ndvi_max": ndvi_max,
            "green_area_pct": green_area_pct, "green_area_km2": green_area_km2,
            "total_area_km2": total_area_km2,
            "green_area_m2_per_person": m2_per_person,
            "population": population, "who_status": who_status,
            "from_cache": False,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error [{province_name}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
