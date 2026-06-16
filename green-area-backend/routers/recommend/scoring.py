"""Priority scoring engine — NDVI deficit + LST heat + population need.

ใช้คำนวณ priority image (100m) สำหรับ heatmap + top-N pixels + plantable area.
"""
import logging

import ee
from fastapi import HTTPException

from dependencies import WORLDPOP_YEAR
from gee_utils import mask_s2_clouds, get_lst_col
from impact import IMPACT_DEFAULTS

logger = logging.getLogger(__name__)

# Weights — ปรับได้ตาม use case
W_NDVI = 0.40   # การขาดพืชพรรณสำคัญที่สุด
W_LST = 0.30    # ความร้อนสำคัญรอง
W_POP = 0.30    # ประชากรเป็นปัจจัยร่วม


def normalize_weights(w_ndvi: float, w_lst: float, w_pop: float) -> tuple[float, float, float]:
    """Normalize weights ให้รวมเป็น 1.0 — กัน UI ส่ง slider ที่บวกไม่ครบ
    Fallback ไป default ถ้ารวมเป็น 0 หรือติดลบ"""
    total = w_ndvi + w_lst + w_pop
    if total <= 0:
        return W_NDVI, W_LST, W_POP
    return w_ndvi / total, w_lst / total, w_pop / total


# ── Plantability (ESA WorldCover v200, ปี 2021) ──────────────────────────────
# พื้นที่ที่ "ปลูกป่าได้จริง" — เดิม plantable area คิดจาก priority>threshold เฉยๆ
# → ระบบแนะนำปลูกบนน้ำ/อาคาร/ป่าที่มีอยู่แล้วได้ · ใช้ WorldCover (global mosaic
# ปี 2021, single image — ตัวเดียวกับที่ urban.py ใช้) เป็น mask กรองออก
# class ที่ตัดออก (ปลูกไม่ได้/ไม่ควร):
#   10 Tree cover (มีต้นไม้อยู่แล้ว ไม่ใช่พื้นที่ขาด) · 50 Built-up (สิ่งปลูกสร้าง —
#   ปลูก 400 ต้น/ha ไม่ได้จริง) · 70 Snow/ice · 80 Permanent water (ปลูกไม่ได้) ·
#   90 Herbaceous wetland · 95 Mangroves (ระบบนิเวศชุ่มน้ำ/ป่าชายเลน) · 100 Moss/lichen
# คงเป็น plantable: 20 Shrubland, 30 Grassland, 40 Cropland, 60 Bare/sparse
# NOTE: Cropland (40) นับเป็น plantable โดย default (marginal land/agroforestry) —
#       ถ้าต้องการนับเฉพาะที่ว่างจริง เพิ่ม 40 ลงใน tuple นี้
ESA_NON_PLANTABLE_CLASSES = (10, 50, 70, 80, 90, 95, 100)


def plantable_mask(geom: ee.Geometry) -> ee.Image:
    """คืน mask (1 = ปลูกได้, ที่เหลือถูก mask) จาก ESA WorldCover v200.

    ใช้กรอง top-locations + plantable-area ไม่ให้แนะนำปลูกบนน้ำ อาคาร ป่าเดิม หรือ
    พื้นที่ชุ่มน้ำ · ไม่ใช้ mask นี้กับ priority heatmap (heatmap ยังโชว์ "ความต้องการ"
    ทั่วพื้นที่) · WorldCover เป็น global mosaic ปี 2021 ครอบคลุมทั้งไทย
    """
    wc = ee.ImageCollection("ESA/WorldCover/v200").first().clip(geom)
    non_plantable = ee.Image.constant(0)
    for code in ESA_NON_PLANTABLE_CLASSES:
        non_plantable = non_plantable.Or(wc.eq(code))
    # selfMask() → 0 (ปลูกไม่ได้) ถูก mask, เหลือเฉพาะ pixel ค่า 1 ที่ปลูกได้
    return non_plantable.Not().selfMask().rename('plantable')


def assert_imagery_available(geom: ee.Geometry, year: int) -> None:
    """ตรวจว่ามีภาพ S2 + Landsat ที่ผ่าน cloud filter พอจะ compute priority ไหม.

    Guard ปีปัจจุบัน — ต้นปีอาจมี S2/Landsat น้อยจน median() คืน empty image
    แล้วลูกโซ่ select ภายในล้มเหลวด้วย error คลุมเครือ ('input may not be null')
    เช็คครั้งเดียวด้วย ee.Dictionary().getInfo() → roundtrip เดียว ~300-500ms

    ตรง threshold ที่ใช้ filter ต้องตรงกับใน compute_priority + get_lst_col
    ไม่งั้น guard จะคลาดกับ compute จริง"""
    s2_size = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
               .filterBounds(geom)
               .filterDate(f'{year}-01-01', f'{year + 1}-01-01')  # end exclusive — รวม 31 ธ.ค.
               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
               .size())
    lst_size = get_lst_col(geom, year).size()
    # WorldPop: .first() คืน null ถ้าไม่เจอ THA+WORLDPOP_YEAR — pop_need กลายเป็น null
    # → ทั้ง priority image พัง getMapId ตอน 'Image.select: input may not be null'
    # ตรวจ size แทน .first() เพื่อจับ case นี้ก่อน compute
    pop_size = (ee.ImageCollection('WorldPop/GP/100m/pop')
                .filter(ee.Filter.eq('country', 'THA'))
                .filter(ee.Filter.eq('year', WORLDPOP_YEAR))
                .size())
    counts = ee.Dictionary({'s2': s2_size, 'lst': lst_size, 'pop': pop_size}).getInfo()
    missing = []
    if counts['s2'] == 0:
        missing.append(f"Sentinel-2 NDVI ปี {year}")
    if counts['lst'] == 0:
        missing.append(f"Landsat LST ปี {year}")
    if counts['pop'] == 0:
        # WorldPop ขาด = config issue ฝั่ง server ไม่ใช่เรื่องของปี → ข้อความต่างจาก S2/LST
        raise HTTPException(status_code=503, detail=(
            f"WorldPop ปี {WORLDPOP_YEAR} ไม่มีในระบบ — ตั้งค่า WORLDPOP_YEAR "
            "เป็นปีที่มีข้อมูลใน GEE catalog (ปกติ 2000–2020)"
        ))
    if missing:
        raise HTTPException(status_code=422, detail=(
            f"ยังไม่มีข้อมูล {' + '.join(missing)} เพียงพอ — ลองเลือกปีก่อนหน้านี้"
        ))


def compute_priority(geom: ee.Geometry, year: int,
                     w_ndvi: float = W_NDVI, w_lst: float = W_LST, w_pop: float = W_POP):
    """คำนวณ Priority Score image (100m resolution) สำหรับ geometry ที่ระบุ"""

    # ── 1. NDVI ────────────────────────────────────────────────
    s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
          .filterBounds(geom)
          .filterDate(f'{year}-01-01', f'{year + 1}-01-01')  # end exclusive — รวม 31 ธ.ค.
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
          .map(mask_s2_clouds))
    ndvi = s2.median().normalizedDifference(['B8', 'B4']).rename('NDVI')

    # NDVI deficit: NDVI < 0.3 = ขาดต้นไม้ (clamp 0-1)
    ndvi_deficit = (ee.Image.constant(0.3).subtract(ndvi)
                    .divide(0.3).clamp(0, 1).rename('ndvi_deficit'))

    # ── 2. LST ─────────────────────────────────────────────────
    lst_col = get_lst_col(geom, year)
    lst = lst_col.median().select('LST').rename('LST')
    # ความร้อน: LST 25-40°C → 0-1
    lst_heat = (lst.subtract(25).divide(15).clamp(0, 1)
                .unmask(0).rename('lst_heat'))

    # ── 3. Population (WorldPop) ────────────────────────────────
    pop = (ee.ImageCollection('WorldPop/GP/100m/pop')
           .filter(ee.Filter.eq('country', 'THA'))
           .filter(ee.Filter.eq('year', WORLDPOP_YEAR))
           .first())
    pop_img = ee.Image(pop).select('population').unmask(0)
    # Normalize ด้วย log base 1000 — สูตรคือ ln(pop+1) / ln(1000)
    # ผลลัพธ์: pop=1 → 0, pop=1000 → 1, ตัดที่ [0,1]
    # เลือก log แทน linear เพราะ population ทั่วไทยเหลื่อมหลาย order of magnitude
    pop_need = (pop_img.add(1).log().divide(ee.Number(1000).log())
                .clamp(0, 1).rename('pop_need'))

    # ── 4. Weighted Priority Score ──────────────────────────────
    priority = (ndvi_deficit.multiply(w_ndvi)
                .add(lst_heat.multiply(w_lst))
                .add(pop_need.multiply(w_pop))
                .rename('priority')
                .clip(geom))

    # ── 5. Plantability mask ────────────────────────────────────
    # ส่ง mask แยกออกมา (ไม่ mask ตัว priority) ให้ top-locations + plantable-area
    # กรองจุดที่ปลูกได้จริง · lazy ee.Image — ไม่ถูก evaluate จนกว่าจะถูกใช้
    plantable = plantable_mask(geom)

    return priority, ndvi_deficit, lst_heat, pop_need, plantable


def get_top_locations(priority: ee.Image, geom: ee.Geometry,
                      plantable: ee.Image, n: int = 10):
    """หา top-n pixels ที่มี priority สูงสุด — เฉพาะบนพื้นที่ที่ปลูกได้จริง.

    updateMask(plantable) ก่อน sample → ไม่คืนจุดบนน้ำ/อาคาร/ป่าเดิม
    (dropNulls=True ตัด pixel ที่ถูก mask ออกอยู่แล้ว)"""
    samples = (priority.updateMask(plantable)
               .sample(region=geom, scale=200, numPixels=2000,
                       geometries=True, dropNulls=True)
               .sort('priority', False)
               .limit(n))
    info = samples.getInfo()
    results = []
    for feat in info.get('features', []):
        coords = feat['geometry']['coordinates']
        score = feat['properties'].get('priority', 0)
        results.append({
            'lng': round(coords[0], 5),
            'lat': round(coords[1], 5),
            'score': round(float(score), 3),
        })
    return results


def compute_plantable_area_m2(priority: ee.Image, plantable: ee.Image,
                              geom: ee.Geometry) -> float:
    """รวม pixel area ที่ priority > threshold *และ* ปลูกได้จริง (plantable) =
    "ที่ควรปลูกจริง" สำหรับ impact projection — ตัดน้ำ/อาคาร/ป่าเดิมออกแล้ว.
    ใช้ scale 100m balance ระหว่างความเร็วและความแม่น (priority ก็คำนวณที่ ~100m เช่นกัน)"""
    high_priority = priority.gt(IMPACT_DEFAULTS["priority_threshold"]).And(plantable)
    area_m2 = (ee.Image.pixelArea().updateMask(high_priority)
               .reduceRegion(reducer=ee.Reducer.sum(), geometry=geom,
                             scale=100, maxPixels=1e10, bestEffort=True)
               .get('area').getInfo())
    return float(area_m2 or 0)


def get_heatmap_url(priority: ee.Image) -> str:
    """ขอ XYZ tile URL จาก GEE สำหรับแสดงเป็น heatmap layer.

    หมายเหตุ: URL ผูกกับ session token ของ GEE และจะหมดอายุภายในไม่กี่ชั่วโมง/วัน
    จึงต้องเรียก getMapId ใหม่ทุกครั้งที่ส่งคำตอบให้ client (ห้าม cache URL ลง DB)
    """
    vis = {
        'min': 0.2, 'max': 0.85,
        'palette': ['1a9850', 'a6d96a', 'ffffbf', 'fdae61', 'd73027'],
    }
    map_id = priority.getMapId(vis)
    return map_id['tile_fetcher'].url_format
