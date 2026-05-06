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

from dependencies import (get_supabase, PROVINCE_GEOMETRIES, DISTRICT_GEOMETRIES,
                          CURRENT_YEAR)
from gee_utils import mask_s2_clouds, get_lst_col

router = APIRouter()

# Weights — ปรับได้ตาม use case
W_NDVI = 0.40   # การขาดพืชพรรณสำคัญที่สุด
W_LST  = 0.30   # ความร้อนสำคัญรอง
W_POP  = 0.30   # ประชากรเป็นปัจจัยร่วม

# WorldPop ปีล่าสุดที่มีข้อมูล global = 2020
WORLDPOP_YEAR = 2020


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
    """ขอ XYZ tile URL จาก GEE สำหรับแสดงเป็น heatmap layer"""
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

    supabase = get_supabase()
    cached = (supabase.table("planting_recommendations")
              .select("*").eq("province", province_name)
              .is_("district", "null").eq("year", year).execute())
    if cached.data:
        row = cached.data[0]
        return {
            "province": province_name, "year": year,
            "tile_url": row["tile_url"], "top_locations": row["top_locations"],
            "weights": {"ndvi": W_NDVI, "lst": W_LST, "population": W_POP},
            "from_cache": True, "cached_at": row["created_at"],
        }

    print(f"⏳ Computing recommendation: {province_name}/{year}")
    try:
        geom = ee.Geometry(raw_geom)
        priority, _, _, _ = _compute_priority(geom, year)
        tile_url = _get_heatmap_url(priority)
        top = _get_top_locations(priority, geom, n=10)

        try:
            supabase.table("planting_recommendations").insert({
                "province": province_name, "district": None, "year": year,
                "tile_url": tile_url, "top_locations": top,
            }).execute()
        except Exception as cache_err:
            print(f"⚠️  Cache insert failed (non-fatal): {cache_err}")

        return {
            "province": province_name, "year": year,
            "tile_url": tile_url, "top_locations": top,
            "weights": {"ndvi": W_NDVI, "lst": W_LST, "population": W_POP},
            "from_cache": False,
        }
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

    supabase = get_supabase()
    cached = (supabase.table("planting_recommendations")
              .select("*").eq("province", province_name)
              .eq("district", district_name).eq("year", year).execute())
    if cached.data:
        row = cached.data[0]
        return {
            "province": province_name, "district": district_name, "year": year,
            "tile_url": row["tile_url"], "top_locations": row["top_locations"],
            "weights": {"ndvi": W_NDVI, "lst": W_LST, "population": W_POP},
            "from_cache": True, "cached_at": row["created_at"],
        }

    print(f"⏳ Computing recommendation: {province_name}/{district_name}/{year}")
    try:
        geom = ee.Geometry(raw_geom)
        priority, _, _, _ = _compute_priority(geom, year)
        tile_url = _get_heatmap_url(priority)
        top = _get_top_locations(priority, geom, n=10)

        try:
            supabase.table("planting_recommendations").insert({
                "province": province_name, "district": district_name,
                "year": year, "tile_url": tile_url, "top_locations": top,
            }).execute()
        except Exception as cache_err:
            print(f"⚠️  Cache insert failed (non-fatal): {cache_err}")

        return {
            "province": province_name, "district": district_name, "year": year,
            "tile_url": tile_url, "top_locations": top,
            "weights": {"ndvi": W_NDVI, "lst": W_LST, "population": W_POP},
            "from_cache": False,
        }
    except Exception as e:
        print(f"❌ Recommend error [{province_name}/{district_name}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
