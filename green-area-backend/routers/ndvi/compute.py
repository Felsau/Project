"""Pure compute helpers สำหรับ NDVI — แยกจาก endpoints เพื่อ test/reuse ได้ตรง.

`_is_stale` + `compute_who_status` ถูก import ตรงใน tests (test_pure_helpers)
และ re-export ผ่าน routers/ndvi/__init__.py
"""
import ee

from dependencies import CURRENT_CACHE_VERSION, WHO_STANDARD_M2, MONTH_NAMES
from gee_utils import mask_s2_clouds


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
                .filterDate(f'{year}-01-01', f'{year + 1}-01-01')  # end exclusive — รวม 31 ธ.ค.
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

    # total/green/dense area รวมเป็น 3 band แล้ว reduceRegion รอบเดียว — ลด GEE
    # round-trip จาก 3 ครั้งเหลือ 1 (pattern เดียวกับ urban.py)
    pixel_area = ee.Image.pixelArea().clip(geom)
    area_stack = (pixel_area.rename('total_area')
                  .addBands(pixel_area.updateMask(green_mask).rename('green_area'))
                  .addBands(pixel_area.updateMask(dense_mask).rename('dense_area')))
    area_sums = area_stack.reduceRegion(
        reducer=ee.Reducer.sum(), geometry=geom,
        scale=scale, maxPixels=1e10, bestEffort=True, tileScale=4).getInfo()
    total_area_m2 = area_sums.get('total_area')
    green_area_m2 = area_sums.get('green_area')
    dense_area_m2 = area_sums.get('dense_area')

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
