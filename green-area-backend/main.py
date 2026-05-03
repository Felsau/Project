from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime
import traceback
import json
import ee
import os

CURRENT_YEAR = datetime.now().year

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)

print("✅ Supabase พร้อมใช้งาน")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    ee.Initialize(project='innate-beacon-483307-v1')
    print("✅ GEE เชื่อมต่อสำเร็จ")
except Exception as e:
    print(f"❌ GEE เชื่อมต่อไม่สำเร็จ: {e}")


def mask_s2_clouds(image):
    qa = image.select('QA60')
    cloud_bit = 1 << 10
    cirrus_bit = 1 << 11
    mask = (
        qa.bitwiseAnd(cloud_bit).eq(0)
        .And(qa.bitwiseAnd(cirrus_bit).eq(0))
    )
    return (image.updateMask(mask)
                 .divide(10000)
                 .copyProperties(image, ['system:time_start']))


# มาตรฐาน WHO: พื้นที่สีเขียวขั้นต่ำ 9 m² ต่อคน
WHO_STANDARD_M2 = 9

# โหลดขอบเขตจังหวัดจาก GADM (thailand.json เดียวกับ frontend) ครอบคลุมทุก 77 จังหวัด
def _load_province_geometries() -> dict:
    path = os.path.join(os.path.dirname(__file__),
                        '..', 'green-area-frontend', 'public', 'thailand.json')
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    return {feat['properties']['name']: feat['geometry'] for feat in data['features']}

PROVINCE_GEOMETRIES = _load_province_geometries()
print(f"✅ โหลดขอบเขต {len(PROVINCE_GEOMETRIES)} จังหวัดจาก GADM")


def _load_district_geometries() -> dict:
    path = os.path.join(os.path.dirname(__file__),
                        '..', 'green-area-frontend', 'public', 'thailand_districts.json')
    if not os.path.exists(path):
        print("⚠️  thailand_districts.json ไม่พบ — รัน generate_districts.py ก่อน")
        return {}
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    result = {}
    for feat in data['features']:
        p = feat['properties'].get('province', '')
        d = feat['properties'].get('name', '')
        if p and d:
            result[(p, d)] = feat['geometry']
    return result

DISTRICT_GEOMETRIES = _load_district_geometries()
print(f"✅ โหลดขอบเขต {len(DISTRICT_GEOMETRIES)} อำเภอ")

def get_population(supabase: Client, province_name: str, year: int):
    """ดึงประชากรจาก Supabase ปีที่ตรง หรือปีล่าสุดที่มีหากไม่มีข้อมูลปีนั้น"""
    result = (supabase.table("province_population")
              .select("population,year")
              .eq("province", province_name)
              .eq("year", year)
              .execute())
    if result.data:
        return result.data[0]["population"]
    fallback = (supabase.table("province_population")
                .select("population,year")
                .eq("province", province_name)
                .order("year", desc=True)
                .limit(1)
                .execute())
    return fallback.data[0]["population"] if fallback.data else None


@app.get("/")
def read_root():
    supabase = get_supabase()
    annual  = supabase.table("ndvi_annual").select("province,year").execute()
    monthly = supabase.table("ndvi_monthly").select("province,year").execute()
    return {
        "message":        "Green Area API is running! 🌿",
        "cached_annual":  len(annual.data),
        "cached_monthly": len(monthly.data),
    }


@app.get("/ndvi/{province_name}/monthly")
def get_ndvi_monthly(province_name: str, year: int = CURRENT_YEAR):
    raw_geom = PROVINCE_GEOMETRIES.get(province_name)
    if not raw_geom:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    supabase = get_supabase()
    cached = (supabase.table("ndvi_monthly")
              .select("*")
              .eq("province", province_name)
              .eq("year", year)
              .execute())

    if cached.data:
        print(f"✅ Supabase hit: {province_name}/{year}/monthly")
        return {
            "province":   province_name,
            "year":       year,
            "monthly":    cached.data[0]["monthly_data"],
            "from_cache": True,
            "cached_at":  cached.data[0]["created_at"],
        }

    print(f"⏳ Computing: {province_name}/{year}/monthly")

    try:
        province_geom = ee.Geometry(raw_geom)

        results = []
        month_names = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ]

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
                    reducer=ee.Reducer.mean(),
                    geometry=province_geom,
                    scale=500,
                    maxPixels=1e10,
                    bestEffort=True
                ).getInfo()
                raw = stats.get('NDVI', None)
                ndvi_val = round(raw, 4) if raw is not None else None
            else:
                ndvi_val = None

            results.append({
                "month":       month_names[m - 1],
                "month_num":   m,
                "ndvi":        ndvi_val,
                "image_count": count,
            })

        supabase.table("ndvi_monthly").insert({
            "province":     province_name,
            "year":         year,
            "monthly_data": results,
        }).execute()

        return {
            "province":   province_name,
            "year":       year,
            "monthly":    results,
            "from_cache": False,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ndvi/{province_name}/compare")
def get_ndvi_compare(province_name: str, years: str = ",".join(str(y) for y in range(CURRENT_YEAR - 3, CURRENT_YEAR + 1))):
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
        {"year": y, "available": True,  **found[y]} if y in found
        else {"year": y, "available": False}
        for y in year_list
    ]
    return {"province": province_name, "data": data}


# ===== API: NDVI ระดับอำเภอ รายเดือน =====
@app.get("/ndvi/{province_name}/districts/{district_name}/monthly")
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
            "province":   province_name,
            "district":   district_name,
            "year":       year,
            "monthly":    cached.data[0]["monthly_data"],
            "from_cache": True,
            "cached_at":  cached.data[0]["created_at"],
        }

    print(f"⏳ Computing district monthly: {province_name}/{district_name}/{year}")
    try:
        district_geom = ee.Geometry(raw_geom)
        results = []
        month_names = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ]

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
                    reducer=ee.Reducer.mean(),
                    geometry=district_geom,
                    scale=100,
                    maxPixels=1e10,
                    bestEffort=True
                ).getInfo()
                raw = stats.get('NDVI', None)
                ndvi_val = round(raw, 4) if raw is not None else None
            else:
                ndvi_val = None

            results.append({
                "month":       month_names[m - 1],
                "month_num":   m,
                "ndvi":        ndvi_val,
                "image_count": count,
            })

        supabase.table("district_ndvi_monthly").insert({
            "province":     province_name,
            "district":     district_name,
            "year":         year,
            "monthly_data": results,
        }).execute()

        return {
            "province":   province_name,
            "district":   district_name,
            "year":       year,
            "monthly":    results,
            "from_cache": False,
        }

    except Exception as e:
        print(f"❌ Error district monthly [{province_name}/{district_name}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== API: NDVI ระดับอำเภอ รายปี =====
@app.get("/ndvi/{province_name}/districts/{district_name}")
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
                "province":        province_name,
                "district":        district_name,
                "year":            year,
                "ndvi_mean":       row["ndvi_mean"],
                "ndvi_min":        row["ndvi_min"],
                "ndvi_max":        row["ndvi_max"],
                "green_area_pct":  row["green_area_pct"],
                "green_area_km2":  row.get("green_area_km2"),
                "total_area_km2":  row.get("total_area_km2"),
                "from_cache":      True,
                "cached_at":       row["created_at"],
            }
        supabase.table("district_ndvi_annual").delete().eq("id", row["id"]).execute()

    print(f"⏳ Computing district annual: {province_name}/{district_name}/{year}")
    try:
        district_geom = ee.Geometry(raw_geom)

        col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
               .filterBounds(district_geom)
               .filterDate(f'{year}-01-01', f'{year}-12-31')
               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
               .map(mask_s2_clouds))

        if col.size().getInfo() == 0:
            col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterBounds(district_geom)
                   .filterDate(f'{year}-01-01', f'{year}-12-31')
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
                   .map(mask_s2_clouds))

        if col.size().getInfo() == 0:
            raise HTTPException(
                status_code=404,
                detail=f"ไม่พบข้อมูลภาพดาวเทียมสำหรับ {district_name} ในปี {year}"
            )

        s2   = col.median().clip(district_geom)
        ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI')

        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean()
                    .combine(ee.Reducer.min(), '', True)
                    .combine(ee.Reducer.max(), '', True),
            geometry=district_geom,
            scale=100,
            maxPixels=1e10,
            bestEffort=True
        ).getInfo()

        ndvi_mean = round(stats.get('NDVI_mean') or 0, 4)
        ndvi_min  = round(stats.get('NDVI_min')  or 0, 4)
        ndvi_max  = round(stats.get('NDVI_max')  or 0, 4)

        green_mask = ndvi.gt(0.3)

        total_area_m2 = (ee.Image.pixelArea()
                         .clip(district_geom)
                         .reduceRegion(
                             reducer=ee.Reducer.sum(),
                             geometry=district_geom,
                             scale=100,
                             maxPixels=1e10,
                             bestEffort=True
                         ).get('area').getInfo())

        green_area_m2 = (ee.Image.pixelArea()
                         .updateMask(green_mask)
                         .clip(district_geom)
                         .reduceRegion(
                             reducer=ee.Reducer.sum(),
                             geometry=district_geom,
                             scale=100,
                             maxPixels=1e10,
                             bestEffort=True
                         ).get('area').getInfo())

        total_area_km2 = round((total_area_m2 or 0) / 1_000_000, 2)
        green_area_km2 = round((green_area_m2 or 0) / 1_000_000, 2)
        green_area_pct = (
            round(((green_area_m2 or 0) / total_area_m2) * 100, 1) if total_area_m2 else 0
        )

        supabase.table("district_ndvi_annual").insert({
            "province":       province_name,
            "district":       district_name,
            "year":           year,
            "ndvi_mean":      ndvi_mean,
            "ndvi_min":       ndvi_min,
            "ndvi_max":       ndvi_max,
            "green_area_pct": green_area_pct,
            "green_area_km2": green_area_km2,
            "total_area_km2": total_area_km2,
        }).execute()

        return {
            "province":       province_name,
            "district":       district_name,
            "year":           year,
            "ndvi_mean":      ndvi_mean,
            "ndvi_min":       ndvi_min,
            "ndvi_max":       ndvi_max,
            "green_area_pct": green_area_pct,
            "green_area_km2": green_area_km2,
            "total_area_km2": total_area_km2,
            "from_cache":     False,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error district [{province_name}/{district_name}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== API: ดึง NDVI รายปี =====
@app.get("/ndvi/{province_name}")
def get_ndvi(province_name: str, year: int = CURRENT_YEAR):
    raw_geom = PROVINCE_GEOMETRIES.get(province_name)
    if not raw_geom:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    supabase = get_supabase()

    cached = (supabase.table("ndvi_annual")
              .select("*")
              .eq("province", province_name)
              .eq("year", year)
              .execute())

    if cached.data:
        row = cached.data[0]
        # Cache record is outdated (missing fields from older version) — delete and recompute
        if row.get("green_area_pct") is None or row.get("total_area_km2") is None:
            print(f"♻️ Stale cache (no green area): {province_name}/{year} — recomputing")
            supabase.table("ndvi_annual").delete().eq("id", row["id"]).execute()
        else:
            print(f"✅ Supabase hit: {province_name}/{year}")
            return {
                "province":                  province_name,
                "year":                      year,
                "ndvi_mean":                 row["ndvi_mean"],
                "ndvi_min":                  row["ndvi_min"],
                "ndvi_max":                  row["ndvi_max"],
                "green_area_pct":            row["green_area_pct"],
                "green_area_km2":            row.get("green_area_km2"),
                "total_area_km2":            row.get("total_area_km2"),
                "green_area_m2_per_person":  row.get("green_area_m2_per_person"),
                "population":                row.get("population"),
                "who_status":                row.get("who_status"),
                "from_cache":                True,
                "cached_at":                 row["created_at"],
            }

    print(f"⏳ Computing: {province_name}/{year}")

    try:
        province_geom = ee.Geometry(raw_geom)

        col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
               .filterBounds(province_geom)
               .filterDate(f'{year}-01-01', f'{year}-12-31')
               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
               .map(mask_s2_clouds))

        # ถ้าไม่มีภาพที่ cloud < 20% ให้ขยาย threshold เป็น 80%
        if col.size().getInfo() == 0:
            col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterBounds(province_geom)
                   .filterDate(f'{year}-01-01', f'{year}-12-31')
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
                   .map(mask_s2_clouds))

        if col.size().getInfo() == 0:
            raise HTTPException(status_code=404, detail=f"ไม่พบข้อมูลภาพดาวเทียมสำหรับ {province_name} ในปี {year}")

        s2 = col.median().clip(province_geom)

        ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI')

        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean()
                    .combine(ee.Reducer.min(), '', True)
                    .combine(ee.Reducer.max(), '', True),
            geometry=province_geom,
            scale=500,
            maxPixels=1e10,
            bestEffort=True
        ).getInfo()

        ndvi_mean = round(stats.get('NDVI_mean') or 0, 4)
        ndvi_min  = round(stats.get('NDVI_min')  or 0, 4)
        ndvi_max  = round(stats.get('NDVI_max')  or 0, 4)

        green_mask = ndvi.gt(0.3)

        total_area_m2 = (ee.Image.pixelArea()
                         .clip(province_geom)
                         .reduceRegion(
                             reducer=ee.Reducer.sum(),
                             geometry=province_geom,
                             scale=500,
                             maxPixels=1e10,
                             bestEffort=True
                         ).get('area').getInfo())

        green_area_m2 = (ee.Image.pixelArea()
                         .updateMask(green_mask)
                         .clip(province_geom)
                         .reduceRegion(
                             reducer=ee.Reducer.sum(),
                             geometry=province_geom,
                             scale=500,
                             maxPixels=1e10,
                             bestEffort=True
                         ).get('area').getInfo())

        total_area_km2 = round((total_area_m2 or 0) / 1_000_000, 2)
        green_area_km2 = round((green_area_m2 or 0) / 1_000_000, 2)
        green_area_pct = round(((green_area_m2 or 0) / total_area_m2) * 100, 1) if total_area_m2 else 0

        population = get_population(supabase, province_name, year)
        if population and green_area_m2:
            m2_per_person = round(green_area_m2 / population, 2)
            if m2_per_person >= WHO_STANDARD_M2:
                who_status = f"ผ่านมาตรฐาน WHO ✅ ({m2_per_person:.1f} m²/คน)"
            else:
                who_status = f"ต่ำกว่ามาตรฐาน WHO ⚠️ ({m2_per_person:.1f} m²/คน)"
        else:
            m2_per_person = None
            who_status = None

        supabase.table("ndvi_annual").insert({
            "province":                  province_name,
            "year":                      year,
            "ndvi_mean":                 ndvi_mean,
            "ndvi_min":                  ndvi_min,
            "ndvi_max":                  ndvi_max,
            "green_area_pct":            green_area_pct,
            "green_area_km2":            green_area_km2,
            "total_area_km2":            total_area_km2,
            "green_area_m2_per_person":  m2_per_person,
            "population":                population,
            "who_status":                who_status,
        }).execute()

        return {
            "province":                  province_name,
            "year":                      year,
            "ndvi_mean":                 ndvi_mean,
            "ndvi_min":                  ndvi_min,
            "ndvi_max":                  ndvi_max,
            "green_area_pct":            green_area_pct,
            "green_area_km2":            green_area_km2,
            "total_area_km2":            total_area_km2,
            "green_area_m2_per_person":  m2_per_person,
            "population":                population,
            "who_status":                who_status,
            "from_cache":                False,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error [{province_name}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/compare")
def compare_provinces(provinces: str, year: int = CURRENT_YEAR):
    province_list = [p.strip() for p in provinces.split(",") if p.strip()]
    if not province_list:
        raise HTTPException(status_code=400, detail="ต้องระบุจังหวัดอย่างน้อย 1 จังหวัด")

    missing = [p for p in province_list if p not in PROVINCE_GEOMETRIES]
    if missing:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด: {', '.join(missing)}")

    supabase = get_supabase()
    result = (supabase.table("ndvi_annual")
              .select("province,ndvi_mean,green_area_pct,green_area_km2,green_area_m2_per_person,who_status")
              .in_("province", province_list)
              .eq("year", year)
              .execute())

    found = {row["province"]: row for row in result.data}
    data = [
        {"province": p, "available": True,  **found[p]} if p in found
        else {"province": p, "available": False}
        for p in province_list
    ]
    return {"year": year, "data": data}


@app.get("/cache")
def get_cache():
    supabase = get_supabase()
    annual  = supabase.table("ndvi_annual").select("province,year,ndvi_mean,green_area_pct,who_status,created_at").execute()
    monthly = supabase.table("ndvi_monthly").select("province,year,created_at").execute()
    return {"annual": annual.data, "monthly": monthly.data}


@app.delete("/cache")
def clear_cache():
    supabase = get_supabase()
    supabase.table("ndvi_annual").delete().neq("id", 0).execute()
    supabase.table("ndvi_monthly").delete().neq("id", 0).execute()
    return {"message": "✅ Cache cleared"}


@app.delete("/cache/{province_name}")
def clear_province_cache(province_name: str):
    supabase = get_supabase()
    supabase.table("ndvi_annual").delete().eq("province", province_name).execute()
    supabase.table("ndvi_monthly").delete().eq("province", province_name).execute()
    return {"message": f"✅ Cache cleared for {province_name}"}