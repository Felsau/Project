from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import ee

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== เริ่มต้น GEE =====
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
    return {"message": "Green Area API is running! 🌿"}


# ===== API: ดึง NDVI รายปี =====
@app.get("/ndvi/{province_name}")
def get_ndvi(province_name: str, year: int = 2024):
    try:
        # กำหนดพื้นที่
        province = ee.FeatureCollection('FAO/GAUL/2015/level1') \
            .filter(ee.Filter.eq('ADM1_NAME', province_name))

        # ดึงภาพ Sentinel-2
        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
              .filterBounds(province)
              .filterDate(f'{year}-01-01', f'{year}-12-31')
              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
              .map(mask_s2_clouds)
              .median()
              .clip(province))

        # คำนวณ NDVI
        ndvi = s2.normalizedDifference(['B8', 'B4'])

        # คำนวณสถิติ
        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean()
                    .combine(ee.Reducer.min(), '', True)
                    .combine(ee.Reducer.max(), '', True),
            geometry=province.geometry(),
            scale=500,
            maxPixels=1e10,
            bestEffort=True
        ).getInfo()

        return {
            "province": province_name,
            "year": year,
            "ndvi_mean": round(stats.get('nd_mean', 0), 4),
            "ndvi_min":  round(stats.get('nd_min', 0), 4),
            "ndvi_max":  round(stats.get('nd_max', 0), 4),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== API: ดึง NDVI รายเดือน =====
@app.get("/ndvi/{province_name}/monthly")
def get_ndvi_monthly(province_name: str, year: int = 2024):
    try:
        province = ee.FeatureCollection('FAO/GAUL/2015/level1') \
            .filter(ee.Filter.eq('ADM1_NAME', province_name))

        results = []
        month_names = [
            'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
            'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'
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
                ndvi_monthly = (col.median()
                                  .normalizedDifference(['B8', 'B4'])
                                  .clip(province))
                stats = ndvi_monthly.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=province.geometry(),
                    scale=500,
                    maxPixels=1e10,
                    bestEffort=True
                ).getInfo()
                ndvi_val = round(stats.get('nd', 0) or 0, 4)
            else:
                ndvi_val = None

            results.append({
                "month": month_names[m - 1],
                "month_num": m,
                "ndvi": ndvi_val,
                "image_count": count
            })

        return {
            "province": province_name,
            "year": year,
            "monthly": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))