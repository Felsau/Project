"""
AI-Powered Planting Recommendation Engine
─────────────────────────────────────────
Priority Score = w1·NDVI_deficit + w2·LST_heat + w3·population_need

NDVI_deficit : พื้นที่ NDVI ต่ำ = ขาดต้นไม้ → ค่าสูงคือควรปลูก
LST_heat     : อุณหภูมิผิวพื้นสูง = ร้อนเกินต้องการพืช → ค่าสูงคือควรปลูก
pop_need     : ประชากรหนาแน่น (WorldPop) = คนเยอะต้องการพื้นที่สีเขียว
"""
from fastapi import APIRouter, HTTPException
import traceback
import ee

from dependencies import (supa_call, PROVINCE_GEOMETRIES, DISTRICT_GEOMETRIES,
                          CURRENT_YEAR)
from gee_utils import mask_s2_clouds, get_lst_col

router = APIRouter()

# Weights — ปรับได้ตาม use case
W_NDVI = 0.40   # การขาดพืชพรรณสำคัญที่สุด
W_LST  = 0.30   # ความร้อนสำคัญรอง
W_POP  = 0.30   # ประชากรเป็นปัจจัยร่วม

# WorldPop ปีล่าสุดที่มีข้อมูล global = 2020
WORLDPOP_YEAR = 2020


# ── Tree species recommendation ─────────────────────────────────────────────
# จับจังหวัด → ภาค (ใช้แบ่งตามภูมิอากาศ/ดินที่เหมาะกับพันธุ์ไม้)
THAI_REGIONS = {
    "เหนือ": {
        "Chiang Mai", "Chiang Rai", "Lampang", "Lamphun", "Mae Hong Son",
        "Nan", "Phayao", "Phrae", "Uttaradit",
    },
    "อีสาน": {
        "Amnat Charoen", "Bueng Kan", "Buri Ram", "Chaiyaphum", "Kalasin",
        "Khon Kaen", "Loei", "Maha Sarakham", "Mukdahan", "Nakhon Phanom",
        "Nakhon Ratchasima", "Nong Bua Lam Phu", "Nong Khai", "Roi Et",
        "Sakon Nakhon", "Si Sa Ket", "Surin", "Ubon Ratchathani",
        "Udon Thani", "Yasothon",
    },
    "กลาง": {
        "Ang Thong", "Bangkok Metropolis", "Chai Nat", "Kamphaeng Phet",
        "Lop Buri", "Nakhon Nayok", "Nakhon Pathom", "Nakhon Sawan",
        "Nonthaburi", "Pathum Thani", "Phetchabun", "Phichit", "Phitsanulok",
        "Phra Nakhon Si Ayutthaya", "Samut Prakan", "Samut Sakhon",
        "Samut Songkhram", "Saraburi", "Sing Buri", "Sukhothai",
        "Suphan Buri", "Uthai Thani",
    },
    "ตะวันออก": {
        "Chachoengsao", "Chanthaburi", "Chon Buri", "Prachin Buri",
        "Rayong", "Sa Kaeo", "Trat",
    },
    "ตะวันตก": {
        "Kanchanaburi", "Phetchaburi", "Prachuap Khiri Khan",
        "Ratchaburi", "Tak",
    },
    "ใต้": {
        "Chumphon", "Krabi", "Nakhon Si Thammarat", "Narathiwat", "Pattani",
        "Phangnga", "Phatthalung", "Phuket", "Ranong", "Satun", "Songkhla",
        "Surat Thani", "Trang", "Yala",
    },
}
PROVINCE_REGION = {p: r for r, ps in THAI_REGIONS.items() for p in ps}

# พันธุ์ไม้แนะนำต่อภาค — คัดเฉพาะที่ปลูกง่าย ทนสภาพท้องถิ่น และให้ร่มเงา/ฟื้นฟูดี
TREE_SPECIES_BY_REGION = {
    "กลาง": [
        {"name_th": "จามจุรี (ก้ามปู)", "scientific": "Samanea saman",
         "purpose": "ร่มเงาในเมือง", "height_m": "15–25",
         "traits": ["ร่มเงากว้าง", "ทนแดดจัด", "ลดความร้อนเมืองดีมาก"],
         "reason": "ทรงพุ่มใหญ่ที่สุด เหมาะกับสวนสาธารณะและถนนกว้างในพื้นที่ร้อน"},
        {"name_th": "ประดู่บ้าน", "scientific": "Pterocarpus indicus",
         "purpose": "ร่มเงาในเมือง", "height_m": "10–20",
         "traits": ["ทนแล้ง", "โตเร็วปานกลาง", "ดอกหอม"],
         "reason": "ปลูกข้างถนนได้ ทนมลพิษ ไม่ทำลายผิวจราจร"},
        {"name_th": "พิกุล", "scientific": "Mimusops elengi",
         "purpose": "ริมถนน/ชุมชน", "height_m": "8–15",
         "traits": ["ทนมลพิษเมือง", "ดอกหอม", "ใบหนา ดักฝุ่นดี"],
         "reason": "เหมาะกับเขตประชากรหนาแน่น ช่วยลด PM2.5"},
        {"name_th": "ตะแบกนา", "scientific": "Lagerstroemia floribunda",
         "purpose": "ริมถนน", "height_m": "10–20",
         "traits": ["ดอกสวย", "ทนน้ำท่วม", "ทรงพุ่มเป็นระเบียบ"],
         "reason": "เหมาะกับที่ลุ่มภาคกลาง น้ำท่วมขังได้บ้าง"},
        {"name_th": "หางนกยูงฝรั่ง", "scientific": "Delonix regia",
         "purpose": "ร่มเงา/ประดับ", "height_m": "8–12",
         "traits": ["ดอกสวยเด่น", "ร่มเงาดี", "โตเร็ว"],
         "reason": "ใช้ตกแต่งภูมิทัศน์ในเมืองและสวนสาธารณะ"},
    ],
    "เหนือ": [
        {"name_th": "สัก", "scientific": "Tectona grandis",
         "purpose": "ฟื้นฟูป่า/เศรษฐกิจ", "height_m": "20–30",
         "traits": ["ไม้เศรษฐกิจ", "ทนแล้ง", "อายุยืน"],
         "reason": "พันธุ์พื้นถิ่นภาคเหนือ ฟื้นฟูป่าและสร้างมูลค่าระยะยาว"},
        {"name_th": "พญาสัตบรรณ (ตีนเป็ด)", "scientific": "Alstonia scholaris",
         "purpose": "ร่มเงาชุมชน", "height_m": "15–25",
         "traits": ["ร่มเงาดี", "โตเร็ว", "ดอกหอมยามค่ำ"],
         "reason": "ปลูกง่าย ทนทาน เหมาะกับเขตเทศบาลและริมถนน"},
        {"name_th": "มะค่าโมง", "scientific": "Afzelia xylocarpa",
         "purpose": "ฟื้นฟูป่า", "height_m": "20–30",
         "traits": ["ทนแล้งดีมาก", "อายุยืน 100+ ปี", "พันธุ์พื้นถิ่น"],
         "reason": "เหมาะกับโครงการปลูกป่าระยะยาวบนพื้นที่สูง"},
        {"name_th": "หว้า", "scientific": "Syzygium cumini",
         "purpose": "ผลไม้/ร่มเงา", "height_m": "10–20",
         "traits": ["ทนแล้ง", "ผลกินได้", "นกชอบ"],
         "reason": "เพิ่มความหลากหลายทางชีวภาพ ผลใช้ประโยชน์ได้"},
        {"name_th": "ยมหิน", "scientific": "Chukrasia tabularis",
         "purpose": "ฟื้นฟูป่า", "height_m": "15–25",
         "traits": ["โตเร็ว", "ทนแล้ง", "ไม้เนื้อแข็ง"],
         "reason": "เหมาะกับการฟื้นฟูพื้นที่เสื่อมโทรมในภาคเหนือ"},
    ],
    "อีสาน": [
        {"name_th": "ประดู่ป่า", "scientific": "Pterocarpus macrocarpus",
         "purpose": "ฟื้นฟูป่า/ร่มเงา", "height_m": "15–25",
         "traits": ["ทนแล้งสุดยอด", "พันธุ์พื้นถิ่นอีสาน", "ไม้เศรษฐกิจ"],
         "reason": "ทนภัยแล้งและดินทรายของอีสานได้ดีที่สุด"},
        {"name_th": "มะขาม", "scientific": "Tamarindus indica",
         "purpose": "ผลไม้/ร่มเงา", "height_m": "10–20",
         "traits": ["ทนแล้งสุดขีด", "ผลใช้ประโยชน์", "อายุยืน"],
         "reason": "เหมาะกับสภาพอากาศร้อนแล้งของอีสาน ปลูกง่ายมาก"},
        {"name_th": "พะยูง", "scientific": "Dalbergia cochinchinensis",
         "purpose": "ฟื้นฟูป่า/เศรษฐกิจ", "height_m": "15–25",
         "traits": ["ทนแล้ง", "ราคาสูง", "ใกล้สูญพันธุ์"],
         "reason": "อนุรักษ์พันธุ์ไม้หายากของไทย และเพิ่มมูลค่าระยะยาว"},
        {"name_th": "มะค่าแต้", "scientific": "Sindora siamensis",
         "purpose": "ฟื้นฟูป่า", "height_m": "10–15",
         "traits": ["พันธุ์พื้นถิ่น", "ทนแล้ง", "ดินไม่ดีก็ปลูกได้"],
         "reason": "เหมาะกับป่าเต็งรังของอีสาน ปลูกฟื้นฟูดินเสื่อมได้"},
        {"name_th": "ตะเคียนทอง", "scientific": "Hopea odorata",
         "purpose": "ร่มเงา/ฟื้นฟูป่า", "height_m": "20–30",
         "traits": ["โตปานกลาง", "ทนแล้ง", "ไม้เนื้อแข็ง"],
         "reason": "ปลูกได้ทั้งริมถนนและในป่า ให้ร่มเงาและไม้คุณภาพ"},
    ],
    "ตะวันออก": [
        {"name_th": "ยางนา", "scientific": "Dipterocarpus alatus",
         "purpose": "ฟื้นฟูป่า", "height_m": "30–40",
         "traits": ["ขนาดใหญ่มาก", "อายุยืน", "พันธุ์พื้นถิ่น"],
         "reason": "เหมาะกับภาคตะวันออกที่มีฝนชุก ฟื้นฟูป่าดิบชื้นได้ดี"},
        {"name_th": "ประดู่บ้าน", "scientific": "Pterocarpus indicus",
         "purpose": "ร่มเงาในเมือง", "height_m": "10–20",
         "traits": ["ทนแล้ง", "ทนเค็ม", "โตเร็วปานกลาง"],
         "reason": "เหมาะกับชายฝั่งตะวันออก ทนลมและไอเค็ม"},
        {"name_th": "จามจุรี", "scientific": "Samanea saman",
         "purpose": "ร่มเงา", "height_m": "15–25",
         "traits": ["ร่มเงากว้าง", "โตเร็ว", "ลดความร้อน"],
         "reason": "เหมาะกับสวนสาธารณะและพื้นที่นิคมอุตสาหกรรม"},
        {"name_th": "กระท้อน", "scientific": "Sandoricum koetjape",
         "purpose": "ผลไม้/ร่มเงา", "height_m": "15–20",
         "traits": ["ผลกินได้", "ร่มเงาดี", "เหมาะดินชื้น"],
         "reason": "ใช้ประโยชน์ได้ทั้งร่มเงาและผลผลิต"},
        {"name_th": "ตะเคียนทอง", "scientific": "Hopea odorata",
         "purpose": "ฟื้นฟูป่า", "height_m": "20–30",
         "traits": ["ทนชื้น", "ไม้เนื้อแข็ง", "อายุยืน"],
         "reason": "พันธุ์พื้นถิ่นของป่าตะวันออก ปลูกฟื้นฟูได้ดี"},
    ],
    "ตะวันตก": [
        {"name_th": "ประดู่ป่า", "scientific": "Pterocarpus macrocarpus",
         "purpose": "ฟื้นฟูป่า", "height_m": "15–25",
         "traits": ["ทนแล้ง", "พันธุ์พื้นถิ่น", "ไม้เศรษฐกิจ"],
         "reason": "เหมาะกับภาคตะวันตกที่มีอากาศแห้ง"},
        {"name_th": "มะขาม", "scientific": "Tamarindus indica",
         "purpose": "ผลไม้/ร่มเงา", "height_m": "10–20",
         "traits": ["ทนแล้งสุด", "ผลใช้ประโยชน์", "อายุยืน"],
         "reason": "เหมาะกับเขตเงาฝนของภาคตะวันตก"},
        {"name_th": "กระถินณรงค์", "scientific": "Acacia auriculiformis",
         "purpose": "ฟื้นฟูดิน", "height_m": "8–15",
         "traits": ["โตเร็วมาก", "ตรึงไนโตรเจน", "ฟื้นฟูดินเสื่อม"],
         "reason": "ปรับปรุงดินที่เสื่อมโทรมจากการเกษตรเชิงเดี่ยว"},
        {"name_th": "พะยูง", "scientific": "Dalbergia cochinchinensis",
         "purpose": "อนุรักษ์/เศรษฐกิจ", "height_m": "15–25",
         "traits": ["ทนแล้ง", "ราคาสูง", "ใกล้สูญพันธุ์"],
         "reason": "อนุรักษ์พันธุ์หายาก ปลูกร่วมในป่าฟื้นฟู"},
        {"name_th": "ตะแบกนา", "scientific": "Lagerstroemia floribunda",
         "purpose": "ร่มเงาในเมือง", "height_m": "10–20",
         "traits": ["ดอกสวย", "ทนแล้ง", "พุ่มเป็นระเบียบ"],
         "reason": "เหมาะปลูกริมถนนในเขตเทศบาล"},
    ],
    "ใต้": [
        {"name_th": "ยางนา", "scientific": "Dipterocarpus alatus",
         "purpose": "ฟื้นฟูป่า", "height_m": "30–40",
         "traits": ["ขนาดยักษ์", "ทนชื้น", "อายุยืน 100+ ปี"],
         "reason": "พันธุ์เด่นของป่าฝนภาคใต้ ฟื้นฟูป่าดิบชื้นได้ยอดเยี่ยม"},
        {"name_th": "ตะเคียนทอง", "scientific": "Hopea odorata",
         "purpose": "ฟื้นฟูป่า", "height_m": "20–30",
         "traits": ["ทนชื้น", "ไม้เนื้อแข็ง", "พันธุ์พื้นถิ่น"],
         "reason": "เหมาะกับภาคใต้ที่ฝนชุก ฟื้นฟูป่าได้ดี"},
        {"name_th": "เคี่ยม", "scientific": "Cotylelobium melanoxylon",
         "purpose": "ฟื้นฟูป่าใต้", "height_m": "15–30",
         "traits": ["พันธุ์พื้นถิ่นใต้", "ทนชื้นจัด", "ไม้เนื้อแข็งมาก"],
         "reason": "พันธุ์เฉพาะถิ่นภาคใต้ ควรอนุรักษ์และขยายพันธุ์"},
        {"name_th": "มังคุด", "scientific": "Garcinia mangostana",
         "purpose": "ผลไม้เศรษฐกิจ", "height_m": "8–15",
         "traits": ["ทนชื้น", "ผลผลิตสูง", "เศรษฐกิจดี"],
         "reason": "เหมาะกับสภาพอากาศชื้นของใต้ และสร้างรายได้ชุมชน"},
        {"name_th": "จิกน้ำ", "scientific": "Barringtonia acutangula",
         "purpose": "ฟื้นฟูแหล่งน้ำ", "height_m": "8–15",
         "traits": ["ทนน้ำท่วม", "ดอกสวย", "เหมาะริมน้ำ"],
         "reason": "เหมาะกับพื้นที่ลุ่มและริมแหล่งน้ำในภาคใต้"},
    ],
}


def _get_recommended_species(province_name: str):
    """คืนพันธุ์ไม้แนะนำตามภาคของจังหวัด พร้อม metadata ของภาคนั้น"""
    region = PROVINCE_REGION.get(province_name)
    if not region:
        return {"region": None, "species": []}
    return {
        "region": region,
        "species": TREE_SPECIES_BY_REGION.get(region, []),
    }


def _compute_priority(geom: ee.Geometry, year: int):
    """คำนวณ Priority Score image (100m resolution) สำหรับ geometry ที่ระบุ"""

    # ── 1. NDVI ────────────────────────────────────────────────
    s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
          .filterBounds(geom)
          .filterDate(f'{year}-01-01', f'{year}-12-31')
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
    # log scale: pop 1-1000 คน/pixel → 0-1
    pop_need = (pop_img.add(1).log().divide(ee.Number(1000).log())
                .clamp(0, 1).rename('pop_need'))

    # ── 4. Weighted Priority Score ──────────────────────────────
    priority = (ndvi_deficit.multiply(W_NDVI)
                .add(lst_heat.multiply(W_LST))
                .add(pop_need.multiply(W_POP))
                .rename('priority')
                .clip(geom))

    return priority, ndvi_deficit, lst_heat, pop_need


def _get_top_locations(priority: ee.Image, geom: ee.Geometry, n: int = 10):
    """หา top-n pixels ที่มี priority สูงสุด"""
    samples = (priority
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
            'lng':   round(coords[0], 5),
            'lat':   round(coords[1], 5),
            'score': round(float(score), 3),
        })
    return results


def _get_heatmap_url(priority: ee.Image) -> str:
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


# ── Province-level recommendation ────────────────────────────────────────────
@router.get("/recommend/{province_name}")
def recommend_province(province_name: str, year: int = CURRENT_YEAR):
    raw_geom = PROVINCE_GEOMETRIES.get(province_name)
    if not raw_geom:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    cached = supa_call(lambda s: s.table("planting_recommendations")
                       .select("*").eq("province", province_name)
                       .is_("district", "null").eq("year", year).execute())
    if cached.data:
        row = cached.data[0]
        try:
            geom = ee.Geometry(raw_geom)
            priority, _, _, _ = _compute_priority(geom, year)
            tile_url = _get_heatmap_url(priority)
        except Exception as e:
            print(f"❌ Recommend tile refresh error [{province_name}/{year}]: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))
        return {
            "province": province_name, "year": year,
            "tile_url": tile_url, "top_locations": row["top_locations"],
            "weights": {"ndvi": W_NDVI, "lst": W_LST, "population": W_POP},
            "recommended_species": _get_recommended_species(province_name),
            "from_cache": True, "cached_at": row["created_at"],
        }

    print(f"⏳ Computing recommendation: {province_name}/{year}")
    try:
        geom = ee.Geometry(raw_geom)
        priority, _, _, _ = _compute_priority(geom, year)
        tile_url = _get_heatmap_url(priority)
        top = _get_top_locations(priority, geom, n=10)

        try:
            supa_call(lambda s: s.table("planting_recommendations").insert({
                "province": province_name, "district": None, "year": year,
                "tile_url": tile_url, "top_locations": top,
            }).execute())
        except Exception as cache_err:
            print(f"⚠️  Cache insert failed (non-fatal): {cache_err}")

        return {
            "province": province_name, "year": year,
            "tile_url": tile_url, "top_locations": top,
            "weights": {"ndvi": W_NDVI, "lst": W_LST, "population": W_POP},
            "recommended_species": _get_recommended_species(province_name),
            "from_cache": False,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Recommend error [{province_name}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── District-level recommendation ────────────────────────────────────────────
@router.get("/recommend/{province_name}/districts/{district_name}")
def recommend_district(province_name: str, district_name: str,
                       year: int = CURRENT_YEAR):
    raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
    if not raw_geom:
        raise HTTPException(status_code=404,
            detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")

    cached = supa_call(lambda s: s.table("planting_recommendations")
                       .select("*").eq("province", province_name)
                       .eq("district", district_name).eq("year", year).execute())
    if cached.data:
        row = cached.data[0]
        try:
            geom = ee.Geometry(raw_geom)
            priority, _, _, _ = _compute_priority(geom, year)
            tile_url = _get_heatmap_url(priority)
        except Exception as e:
            print(f"❌ Recommend tile refresh error [{province_name}/{district_name}/{year}]: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))
        return {
            "province": province_name, "district": district_name, "year": year,
            "tile_url": tile_url, "top_locations": row["top_locations"],
            "weights": {"ndvi": W_NDVI, "lst": W_LST, "population": W_POP},
            "recommended_species": _get_recommended_species(province_name),
            "from_cache": True, "cached_at": row["created_at"],
        }

    print(f"⏳ Computing recommendation: {province_name}/{district_name}/{year}")
    try:
        geom = ee.Geometry(raw_geom)
        priority, _, _, _ = _compute_priority(geom, year)
        tile_url = _get_heatmap_url(priority)
        top = _get_top_locations(priority, geom, n=10)

        try:
            supa_call(lambda s: s.table("planting_recommendations").insert({
                "province": province_name, "district": district_name,
                "year": year, "tile_url": tile_url, "top_locations": top,
            }).execute())
        except Exception as cache_err:
            print(f"⚠️  Cache insert failed (non-fatal): {cache_err}")

        return {
            "province": province_name, "district": district_name, "year": year,
            "tile_url": tile_url, "top_locations": top,
            "weights": {"ndvi": W_NDVI, "lst": W_LST, "population": W_POP},
            "recommended_species": _get_recommended_species(province_name),
            "from_cache": False,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Recommend error [{province_name}/{district_name}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
