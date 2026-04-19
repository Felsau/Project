from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime
import ee
import os

# โหลด .env
load_dotenv()

# ===== Supabase Setup =====
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("✅ Supabase เชื่อมต่อสำเร็จ")

# ===== FastAPI Setup =====
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== GEE Setup =====
try:
    ee.Initialize(project='innate-beacon-483307-v1')
    print("✅ GEE เชื่อมต่อสำเร็จ")
except Exception as e:
    print(f"❌ GEE เชื่อมต่อไม่สำเร็จ: {e}")


# ===== ฟังก์ชัน กรองเมฆ =====
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


# ===== API: ทดสอบ =====
@app.get("/")
def read_root():
    annual  = supabase.table("ndvi_annual").select("province,year").execute()
    monthly = supabase.table("ndvi_monthly").select("province,year").execute()
    return {
        "message":        "Green Area API is running! 🌿",
        "cached_annual":  len(annual.data),
        "cached_monthly": len(monthly.data),
    }


# ===== API: ดึง NDVI รายเดือน =====
@app.get("/ndvi/{province_name}/monthly")
def get_ndvi_monthly(province_name: str, year: int = 2024):

    # ตรวจ Supabase ก่อน
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
        province = ee.FeatureCollection('FAO/GAUL/2015/level1') \
            .filter(ee.Filter.eq('ADM1_NAME', province_name))

        results = []
        month_names = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ]

        for m in range(1, 13):
            col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterBounds(province)
                   .filter(ee.Filter.calendarRange(m, m, 'month'))
                   .filter(ee.Filter.calendarRange(year, year, 'year'))
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
                   .map(mask_s2_clouds))

            count = col.size().getInfo()

            if count > 0:
                ndvi_img = (col.median()
                            .normalizedDifference(['B8', 'B4'])
                            .rename('NDVI')
                            .clip(province))
                stats = ndvi_img.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=province.geometry(),
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

        # บันทึกลง Supabase
        supabase.table("ndvi_monthly").insert({
            "province":     province_name,
            "year":         year,
            "monthly_data": results,
        }).execute()
        print(f"✅ Saved to Supabase: {province_name}/{year}/monthly")

        return {
            "province":   province_name,
            "year":       year,
            "monthly":    results,
            "from_cache": False,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== API: ดึง NDVI รายปี =====
@app.get("/ndvi/{province_name}")
def get_ndvi(province_name: str, year: int = 2024):

    # ตรวจ Supabase ก่อน
    cached = (supabase.table("ndvi_annual")
              .select("*")
              .eq("province", province_name)
              .eq("year", year)
              .execute())

    if cached.data:
        print(f"✅ Supabase hit: {province_name}/{year}")
        row = cached.data[0]
        return {
            "province":   province_name,
            "year":       year,
            "ndvi_mean":  row["ndvi_mean"],
            "ndvi_min":   row["ndvi_min"],
            "ndvi_max":   row["ndvi_max"],
            "from_cache": True,
            "cached_at":  row["created_at"],
        }

    print(f"⏳ Computing: {province_name}/{year}")

    try:
        province = ee.FeatureCollection('FAO/GAUL/2015/level1') \
            .filter(ee.Filter.eq('ADM1_NAME', province_name))

        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
              .filterBounds(province)
              .filterDate(f'{year}-01-01', f'{year}-12-31')
              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
              .map(mask_s2_clouds)
              .median()
              .clip(province))

        ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI')

        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean()
                    .combine(ee.Reducer.min(), '', True)
                    .combine(ee.Reducer.max(), '', True),
            geometry=province.geometry(),
            scale=500,
            maxPixels=1e10,
            bestEffort=True
        ).getInfo()

        ndvi_mean = round(stats.get('NDVI_mean') or 0, 4)
        ndvi_min  = round(stats.get('NDVI_min')  or 0, 4)
        ndvi_max  = round(stats.get('NDVI_max')  or 0, 4)

        # บันทึกลง Supabase
        supabase.table("ndvi_annual").insert({
            "province":  province_name,
            "year":      year,
            "ndvi_mean": ndvi_mean,
            "ndvi_min":  ndvi_min,
            "ndvi_max":  ndvi_max,
        }).execute()
        print(f"✅ Saved to Supabase: {province_name}/{year}")

        return {
            "province":   province_name,
            "year":       year,
            "ndvi_mean":  ndvi_mean,
            "ndvi_min":   ndvi_min,
            "ndvi_max":   ndvi_max,
            "from_cache": False,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== API: ดูข้อมูลใน DB ทั้งหมด =====
@app.get("/cache")
def get_cache():
    annual  = supabase.table("ndvi_annual").select("province,year,ndvi_mean,created_at").execute()
    monthly = supabase.table("ndvi_monthly").select("province,year,created_at").execute()
    return {
        "annual":  annual.data,
        "monthly": monthly.data,
    }


# ===== API: ล้าง cache ทั้งหมด =====
@app.delete("/cache")
def clear_cache():
    supabase.table("ndvi_annual").delete().neq("id", 0).execute()
    supabase.table("ndvi_monthly").delete().neq("id", 0).execute()
    return {"message": "✅ Cache cleared"}


# ===== API: ล้าง cache จังหวัดเดียว =====
@app.delete("/cache/{province_name}")
def clear_province_cache(province_name: str):
    supabase.table("ndvi_annual").delete().eq("province", province_name).execute()
    supabase.table("ndvi_monthly").delete().eq("province", province_name).execute()
    return {"message": f"✅ Cache cleared for {province_name}"}