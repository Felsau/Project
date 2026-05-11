"""GEE thumbnail endpoints — ส่ง PNG ของ NDVI/LST raster สำหรับฝังใน PDF report

ทุก thumbnail render ผ่าน matplotlib เพื่อแนบ colorbar + north arrow + title
ทำให้ใช้เป็น figure ใน thesis ได้โดยตรง
"""
from fastapi import APIRouter, HTTPException, Response
import httpx
import io
import json
import os
import traceback
import ee

from dependencies import (get_supabase, supa_call, PROVINCE_GEOMETRIES,
                          DISTRICT_GEOMETRIES, CURRENT_YEAR, WHO_STANDARD_M2)
from gee_utils import mask_s2_clouds, get_lst_col

# ESA WorldCover v200 class code (Built-up = สิ่งปลูกสร้าง/พื้นที่ urban)
ESA_BUILTUP_CLASS = 50
WORLDPOP_YEAR = 2020  # ปีล่าสุดที่ WorldPop global มีข้อมูล

router = APIRouter()

# Standard NDVI palette (vegetation)
NDVI_PALETTE = ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b',
                '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837']

# Thermal palette สำหรับ LST
LST_PALETTE = ['#053061', '#2166ac', '#4393c3', '#92c5de', '#fddbc7',
               '#f4a582', '#d6604d', '#b2182b', '#67001f']


def _fetch_thumb(url: str) -> bytes:
    """ดึง PNG จาก GEE thumb URL"""
    with httpx.Client(timeout=60.0) as client:
        r = client.get(url)
        if r.status_code != 200:
            raise HTTPException(status_code=502,
                detail=f"GEE thumb fetch failed: {r.status_code}")
        return r.content


def _bbox_extent(geom_dict):
    """คืน (xmin, xmax, ymin, ymax) ของ bbox geometry"""
    coords = []

    def collect(g):
        t = g.get('type', '')
        c = g.get('coordinates', [])
        if t == 'Polygon':
            for ring in c:
                coords.extend(ring)
        elif t == 'MultiPolygon':
            for poly in c:
                for ring in poly:
                    coords.extend(ring)

    collect(geom_dict)
    if not coords:
        return 0, 1, 0, 1
    xs = [p[0] for p in coords]
    ys = [p[1] for p in coords]
    return min(xs), max(xs), min(ys), max(ys)


def _km_per_deg(lat: float):
    """ระยะทาง km ต่อ 1 องศา (lng, lat) ที่ละติจูดที่กำหนด"""
    import math
    deg_lat_km = 110.574
    deg_lng_km = 111.320 * math.cos(math.radians(lat))
    return deg_lng_km, deg_lat_km


def _add_cartographic_decor(ax, geom_dict, palette, vmin, vmax, label, unit):
    """เติม colorbar + north arrow + scale bar ลงบนภาพ matplotlib"""
    from matplotlib.patches import Rectangle, FancyArrowPatch

    xmin, xmax, ymin, ymax = _bbox_extent(geom_dict)
    cy = (ymin + ymax) / 2

    # ── North arrow (มุมขวาบน) — สัญลักษณ์ใหญ่ขึ้นเหมาะกับรายงาน thesis
    # ลูกศรพร้อมตัว N อยู่ใต้ ติดอยู่ในกรอบเล็ก ๆ เพื่อความชัด
    arrow_x = 0.94
    arrow = FancyArrowPatch(
        (arrow_x, 0.83), (arrow_x, 0.97),
        transform=ax.transAxes, mutation_scale=28,
        arrowstyle='-|>', lw=2.4, color='#202124', zorder=12,
    )
    ax.add_patch(arrow)
    ax.text(arrow_x, 0.80, 'N', transform=ax.transAxes,
            ha='center', va='top', fontsize=14, fontweight='bold',
            color='#202124', zorder=12,
            bbox=dict(facecolor='white', edgecolor='#202124',
                      boxstyle='round,pad=0.18', linewidth=0.8))

    # ── Scale bar — เลือกความยาวที่อ่านง่าย (5/10/20/50 km)
    # แสดง 4 segments ดำ-ขาวสลับ + ป้าย 0 / กลาง / สุด เพื่อให้อ่านระยะกลางได้
    lng_km, _ = _km_per_deg(cy)
    extent_km = (xmax - xmin) * lng_km
    target = extent_km / 4  # ~25% ของกว้างภาพ
    candidates = [1, 2, 5, 10, 20, 50, 100]
    bar_km = min(candidates, key=lambda k: abs(k - target))
    bar_deg = bar_km / lng_km

    bar_x0 = xmin + (xmax - xmin) * 0.05
    bar_y0 = ymin + (ymax - ymin) * 0.04
    bar_h = (ymax - ymin) * 0.014

    # 4 segments alternating black/white (cartographic convention)
    seg_count = 4
    seg_w = bar_deg / seg_count
    for i in range(seg_count):
        face = '#202124' if i % 2 == 0 else '#ffffff'
        ax.add_patch(Rectangle((bar_x0 + i * seg_w, bar_y0), seg_w, bar_h,
                               facecolor=face, edgecolor='#202124',
                               linewidth=0.8, zorder=10))

    # ticks: 0, mid, end — ป้ายระยะอ่านง่ายขึ้น
    def _label_km(km_val):
        return f'{km_val:g}' if km_val != int(km_val) else str(int(km_val))

    label_y = bar_y0 + bar_h * 2.2
    for frac in (0.0, 0.5, 1.0):
        x = bar_x0 + bar_deg * frac
        # tick marker (เส้นสั้น ๆ บนแท่ง)
        ax.plot([x, x], [bar_y0, bar_y0 + bar_h * 1.4],
                color='#202124', lw=0.8, zorder=11)
        text = '0' if frac == 0.0 else (
            f'{_label_km(bar_km)} km' if frac == 1.0 else _label_km(bar_km / 2))
        ax.text(x, label_y, text,
                ha='center', va='bottom', fontsize=8, color='#202124', zorder=11)


def _render_with_legend(geom_dict, gee_thumb_bytes, palette, vmin, vmax,
                        label, unit):
    """Compose: GEE raster + colorbar + north arrow + scale bar → PNG.

    Figure dimensions คำนวณจาก *geometry bounds* (ไม่ใช่ pixel ของ thumb)
    เพื่อให้ NDVI กับ LST ของพื้นที่เดียวกัน = ขนาดภาพเท่ากันเป๊ะ
    """
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import matplotlib.colors as mcolors
    import matplotlib.cm as mcm
    from PIL import Image

    img = Image.open(io.BytesIO(gee_thumb_bytes))

    # Aspect ratio ที่ถูกต้องของพื้นที่จริง — แก้ไข aspect distortion จาก lng/lat
    xmin, xmax, ymin, ymax = _bbox_extent(geom_dict)
    cy = (ymin + ymax) / 2
    lng_km, lat_km = _km_per_deg(cy)
    width_km = (xmax - xmin) * lng_km
    height_km = (ymax - ymin) * lat_km
    geo_aspect = height_km / width_km if width_km > 0 else 1.0
    geo_aspect = max(0.55, min(geo_aspect, 1.6))  # clamp กันรูปยาว/แบนเกิน

    # ขนาด figure ที่คงที่: width 6.5" + height ตาม aspect + 1.6" สำหรับ title/colorbar
    fig_w = 6.5
    fig_h = fig_w * geo_aspect + 1.6

    fig = plt.figure(figsize=(fig_w, fig_h), dpi=150)
    # height_ratios ปรับให้ colorbar มี breathing room มากขึ้น (กัน label ทับ ticks)
    gs = fig.add_gridspec(2, 1, height_ratios=[18, 1.0], hspace=0.32)
    ax = fig.add_subplot(gs[0])
    ax_cb = fig.add_subplot(gs[1])

    ax.imshow(img, extent=[xmin, xmax, ymin, ymax], aspect='auto')
    ax.set_xlim(xmin, xmax)
    ax.set_ylim(ymin, ymax)
    ax.set_xticks([])
    ax.set_yticks([])
    for s in ax.spines.values():
        s.set_edgecolor('#9aa0a6')
        s.set_linewidth(0.6)

    ax.set_title(label, fontsize=11, fontweight='bold', loc='left',
                 color='#202124', pad=6)

    _add_cartographic_decor(ax, geom_dict, palette, vmin, vmax, label, unit)

    # Colorbar (gradient) — labelpad ปรับให้ label ไม่ทับเลข tick
    cmap = mcolors.LinearSegmentedColormap.from_list('thumb', palette)
    norm = mcolors.Normalize(vmin=vmin, vmax=vmax)
    sm = mcm.ScalarMappable(cmap=cmap, norm=norm)
    sm.set_array([])
    cb = fig.colorbar(sm, cax=ax_cb, orientation='horizontal')
    cb.set_label(unit, fontsize=9, color='#202124', labelpad=10)
    cb.ax.tick_params(labelsize=8, colors='#5f6368', pad=3)
    cb.outline.set_edgecolor('#9aa0a6')

    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0.12,
                facecolor='white')
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _bbox_dims(geom_dict, max_dim=512):
    """คำนวณ width/height สำหรับ thumb ให้ aspect ratio ตรงกับ geom"""
    coords = []

    def collect(g):
        t = g.get('type', '')
        c = g.get('coordinates', [])
        if t == 'Polygon':
            for ring in c:
                coords.extend(ring)
        elif t == 'MultiPolygon':
            for poly in c:
                for ring in poly:
                    coords.extend(ring)

    collect(geom_dict)
    if not coords:
        return max_dim, max_dim
    xs = [p[0] for p in coords]
    ys = [p[1] for p in coords]
    dx = max(xs) - min(xs)
    dy = max(ys) - min(ys)
    if dx <= 0 or dy <= 0:
        return max_dim, max_dim
    if dx >= dy:
        return max_dim, int(max_dim * dy / dx)
    return int(max_dim * dx / dy), max_dim


@router.get("/maps/{province_name}/ndvi-thumb")
def ndvi_thumb(province_name: str, year: int = CURRENT_YEAR,
               district_name: str | None = None):
    """NDVI raster thumbnail พร้อม colorbar + north arrow + scale bar"""
    if district_name:
        raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
        if not raw_geom:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบอำเภอ '{district_name}'")
        label = f"NDVI · {district_name}, {province_name} · {year}"
    else:
        raw_geom = PROVINCE_GEOMETRIES.get(province_name)
        if not raw_geom:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบจังหวัด '{province_name}'")
        label = f"NDVI · {province_name} · {year}"

    geom = ee.Geometry(raw_geom)
    col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
           .filterBounds(geom)
           .filterDate(f'{year}-01-01', f'{year}-12-31')
           .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
           .map(mask_s2_clouds))

    if col.size().getInfo() == 0:
        raise HTTPException(status_code=404, detail="ไม่พบภาพดาวเทียม")

    ndvi = col.median().clip(geom).normalizedDifference(['B8', 'B4']).rename('NDVI')

    w, h = _bbox_dims(raw_geom, max_dim=700)
    region = geom.bounds().getInfo()['coordinates']

    url = ndvi.getThumbURL({
        'min': -0.2, 'max': 0.8,
        'palette': NDVI_PALETTE,
        'dimensions': f'{w}x{h}',
        'region': region,
        'format': 'png',
    })
    raw_png = _fetch_thumb(url)
    composed = _render_with_legend(
        raw_geom, raw_png, NDVI_PALETTE,
        vmin=-0.2, vmax=0.8,
        label=label, unit='NDVI (Sentinel-2, 10 m)',
    )
    return Response(content=composed, media_type='image/png')


@router.get("/maps/{province_name}/lst-thumb")
def lst_thumb(province_name: str, year: int = CURRENT_YEAR,
              district_name: str | None = None):
    """LST raster thumbnail พร้อม colorbar + north arrow + scale bar"""
    if district_name:
        raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
        if not raw_geom:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบอำเภอ '{district_name}'")
        label = f"Land Surface Temperature · {district_name}, {province_name} · {year}"
    else:
        raw_geom = PROVINCE_GEOMETRIES.get(province_name)
        if not raw_geom:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบจังหวัด '{province_name}'")
        label = f"Land Surface Temperature · {province_name} · {year}"

    geom = ee.Geometry(raw_geom)
    col = get_lst_col(geom, year)
    if col.size().getInfo() == 0:
        raise HTTPException(status_code=404, detail="ไม่พบภาพ Landsat")

    lst = col.median().clip(geom)

    w, h = _bbox_dims(raw_geom, max_dim=700)
    region = geom.bounds().getInfo()['coordinates']

    url = lst.getThumbURL({
        'min': 20, 'max': 45,
        'palette': LST_PALETTE,
        'dimensions': f'{w}x{h}',
        'region': region,
        'format': 'png',
    })
    raw_png = _fetch_thumb(url)
    composed = _render_with_legend(
        raw_geom, raw_png, LST_PALETTE,
        vmin=20, vmax=45,
        label=label, unit='°C (Landsat 8/9, 30 m)',
    )
    return Response(content=composed, media_type='image/png')


# ── Thailand mini-map with province highlighted ──────────────────────────────
_THAILAND_GEOJSON = None


def _load_thailand_geojson():
    global _THAILAND_GEOJSON
    if _THAILAND_GEOJSON is not None:
        return _THAILAND_GEOJSON
    path = os.path.join(os.path.dirname(__file__),
                        '..', '..', 'green-area-frontend', 'public', 'thailand.json')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        _THAILAND_GEOJSON = json.load(f)
    return _THAILAND_GEOJSON


@router.get("/maps/thailand-thumb")
def thailand_thumb(province: str | None = None):
    """Mini-map ไทยทั้งประเทศ + highlight จังหวัด (ถ้าระบุ).
    ไม่ใช้ GEE — render ผ่าน matplotlib เพื่อความเร็ว"""
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        from matplotlib.patches import Polygon as MplPolygon
        from matplotlib.collections import PatchCollection
    except ImportError:
        raise HTTPException(status_code=500,
            detail="matplotlib ไม่ติดตั้ง — รัน: pip install matplotlib")

    geojson = _load_thailand_geojson()
    if not geojson:
        raise HTTPException(status_code=500, detail="thailand.json ไม่พบ")

    fig, ax = plt.subplots(figsize=(3.5, 4.5), dpi=150)
    ax.set_facecolor('#f8f9fa')

    base_patches = []
    highlight_patches = []

    for feat in geojson['features']:
        name = feat['properties'].get('name', '')
        geom = feat['geometry']
        is_highlight = (province and name == province)

        def add_polys(coords_list, target):
            for ring in coords_list:
                target.append(MplPolygon([(p[0], p[1]) for p in ring]))

        t = geom['type']
        c = geom['coordinates']
        target = highlight_patches if is_highlight else base_patches
        if t == 'Polygon':
            add_polys(c, target)
        elif t == 'MultiPolygon':
            for poly in c:
                add_polys(poly, target)

    # Base provinces
    base_pc = PatchCollection(base_patches, facecolor='#e8eaed',
                              edgecolor='#9aa0a6', linewidths=0.4)
    ax.add_collection(base_pc)

    # Highlighted province
    if highlight_patches:
        hi_pc = PatchCollection(highlight_patches, facecolor='#1e8e3e',
                                edgecolor='#0e5c24', linewidths=0.8)
        ax.add_collection(hi_pc)

    # Bounds of Thailand (rough)
    ax.set_xlim(97, 106)
    ax.set_ylim(5.5, 21)
    ax.set_aspect('equal')
    ax.set_xticks([])
    ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)

    import io
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0.05,
                facecolor='white')
    plt.close(fig)
    buf.seek(0)
    return Response(content=buf.read(), media_type='image/png')


# ── District summary (Phase B-1: per-district breakdown) ─────────────────────
@router.get("/analysis/districts/{province_name}")
def get_district_summary(province_name: str, year: int = CURRENT_YEAR):
    """รวบรวมข้อมูลรายอำเภอ (NDVI + LST) จาก cache สำหรับใส่ในรายงานระดับจังหวัด.

    คืนเฉพาะอำเภอที่มี cached ปีนั้น — ไม่ trigger compute ใหม่เพื่อกันเวลา response.
    """
    from dependencies import supa_call
    if province_name not in PROVINCE_GEOMETRIES:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    ndvi_rows = supa_call(lambda s: s.table("district_ndvi_annual")
        .select("district,ndvi_mean,green_area_pct,green_area_km2,total_area_km2")
        .eq("province", province_name).eq("year", year).execute()).data
    lst_rows = supa_call(lambda s: s.table("district_lst_annual")
        .select("district,lst_mean,lst_min,lst_max")
        .eq("province", province_name).eq("year", year).execute()).data

    lst_by_dist = {r["district"]: r for r in lst_rows}
    merged = []
    for n in ndvi_rows:
        d = n["district"]
        lst = lst_by_dist.get(d, {})
        merged.append({
            "district": d,
            "ndvi_mean": n.get("ndvi_mean"),
            "green_area_pct": n.get("green_area_pct"),
            "green_area_km2": n.get("green_area_km2"),
            "total_area_km2": n.get("total_area_km2"),
            "lst_mean": lst.get("lst_mean"),
            "lst_min": lst.get("lst_min"),
            "lst_max": lst.get("lst_max"),
        })
    # อำเภอที่มีแค่ LST ไม่มี NDVI ก็ใส่ด้วย
    ndvi_dists = {n["district"] for n in ndvi_rows}
    for r in lst_rows:
        if r["district"] not in ndvi_dists:
            merged.append({
                "district": r["district"],
                "ndvi_mean": None, "green_area_pct": None,
                "green_area_km2": None, "total_area_km2": None,
                "lst_mean": r.get("lst_mean"),
                "lst_min": r.get("lst_min"),
                "lst_max": r.get("lst_max"),
            })

    merged.sort(key=lambda r: r.get("ndvi_mean") or -1, reverse=True)
    total_known = sum(1 for (_p, d) in DISTRICT_GEOMETRIES.keys() if _p == province_name)
    return {
        "province": province_name, "year": year,
        "districts_in_cache": len(merged),
        "districts_total": total_known,
        "data": merged,
    }


# ── Urban subset (Phase B-3: WHO-comparable green-per-person) ────────────────
# Optional cache table (สร้างเองใน Supabase ก่อนใช้ ถ้าต้องการ cache):
#   CREATE TABLE urban_ndvi_annual (
#     id BIGSERIAL PRIMARY KEY,
#     province TEXT NOT NULL, district TEXT, year INT NOT NULL,
#     worldcover_year INT, worldpop_year INT,
#     total_area_km2 NUMERIC, urban_area_km2 NUMERIC, urban_share_pct NUMERIC,
#     ndvi_mean_urban NUMERIC,
#     green_in_urban_km2 NUMERIC, green_share_in_urban_pct NUMERIC,
#     population_urban INT, m2_per_person_urban NUMERIC, who_urban_pass BOOLEAN,
#     created_at TIMESTAMPTZ DEFAULT NOW()
#   );
# ถ้าไม่สร้าง endpoint ยังทำงานได้ปกติ — แค่คำนวณใหม่ทุกครั้ง (ใช้เวลา 30-60s ต่อครั้ง)
@router.get("/analysis/urban-subset/{province_name}")
def get_urban_subset(province_name: str, year: int = CURRENT_YEAR,
                     district_name: str | None = None):
    """NDVI + green area + ประชากร เฉพาะภายในเขต Built-up (ESA WorldCover v200, ปี 2021).

    เปรียบ WHO 9 m²/คน ได้ตรงกว่าค่ารวมระดับจังหวัด เพราะ scope = "พื้นที่ที่คนอยู่"
    ไม่ใช่ป่า/เกษตรนอกเมือง · WorldCover ใช้ปี 2021 เป็น proxy สำหรับขอบเขตเมืองในทุกปี
    (built-up เปลี่ยนแปลงน้อยใน timescale ปี)
    """
    if district_name:
        raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
        if not raw_geom:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")
        scope = f"{province_name}/{district_name}"
    else:
        raw_geom = PROVINCE_GEOMETRIES.get(province_name)
        if not raw_geom:
            raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")
        scope = province_name

    # ── Cache lookup (best-effort — ถ้า table ยังไม่มี ก็ skip)
    try:
        def _cache_q(s):
            q = (s.table("urban_ndvi_annual").select("*")
                 .eq("province", province_name).eq("year", year))
            if district_name:
                q = q.eq("district", district_name)
            else:
                q = q.is_("district", "null")
            return q.execute()
        cached = supa_call(_cache_q)
        if cached.data:
            print(f"✅ Urban cache hit: {scope}/{year}")
            row = cached.data[0]
            return {**row, "from_cache": True}
    except Exception as e:
        print(f"⚠️ Urban cache lookup skipped (non-fatal): {e}")

    print(f"⏳ Computing urban subset: {scope}/{year}")
    try:
        geom = ee.Geometry(raw_geom)

        # ESA WorldCover v200 = single image, ปี 2021 — ใช้เป็น proxy ของ urban extent
        wc = ee.ImageCollection("ESA/WorldCover/v200").first().clip(geom)
        built_up = wc.eq(ESA_BUILTUP_CLASS)

        # Sentinel-2 NDVI ของปีที่ขอ
        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
              .filterBounds(geom)
              .filterDate(f'{year}-01-01', f'{year}-12-31')
              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
              .map(mask_s2_clouds))
        if s2.size().getInfo() == 0:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบภาพ Sentinel-2 สำหรับ {scope} ปี {year}")
        ndvi = s2.median().normalizedDifference(['B8', 'B4']).rename('NDVI')
        green_mask = ndvi.gt(0.3)

        # ── Reductions: split sum/mean ออก 2 รอบเพื่อความชัด — แต่ละรอบ getInfo() ครั้งเดียว
        pixel_area = ee.Image.pixelArea().clip(geom)
        scale = 30  # ความละเอียดที่ balance ระหว่างความเร็วและความแม่น (WorldCover = 10m)

        # 1) sum: total/urban/green-in-urban areas
        area_stack = (pixel_area.rename('total_area')
                      .addBands(pixel_area.updateMask(built_up).rename('urban_area'))
                      .addBands(pixel_area.updateMask(built_up.And(green_mask))
                                .rename('green_urban_area')))
        area_sums = area_stack.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=geom, scale=scale, maxPixels=1e10, bestEffort=True, tileScale=4,
        ).getInfo()
        total_m2 = area_sums.get('total_area') or 0
        urban_m2 = area_sums.get('urban_area') or 0
        green_in_urban_m2 = area_sums.get('green_urban_area') or 0

        # 2) mean NDVI within built-up
        ndvi_urban_mean = (ndvi.updateMask(built_up)
                           .reduceRegion(reducer=ee.Reducer.mean(),
                                         geometry=geom, scale=scale,
                                         maxPixels=1e10, bestEffort=True, tileScale=4)
                           .get('NDVI').getInfo())

        # Population ภายใน built-up (WorldPop 100m, ปี 2020)
        pop_img = (ee.ImageCollection('WorldPop/GP/100m/pop')
                   .filter(ee.Filter.eq('country', 'THA'))
                   .filter(ee.Filter.eq('year', WORLDPOP_YEAR))
                   .first())
        pop_urban = (ee.Image(pop_img).select('population')
                     .updateMask(built_up)
                     .reduceRegion(reducer=ee.Reducer.sum(), geometry=geom,
                                   scale=100, maxPixels=1e10, bestEffort=True)
                     .get('population').getInfo()) or 0

        urban_km2 = round(urban_m2 / 1_000_000, 2)
        green_in_urban_km2 = round(green_in_urban_m2 / 1_000_000, 2)
        urban_share = round((urban_m2 / total_m2) * 100, 2) if total_m2 else 0
        green_share_in_urban = round((green_in_urban_m2 / urban_m2) * 100, 1) if urban_m2 else 0
        pop_urban_int = int(round(pop_urban))
        m2_per_person_urban = (round(green_in_urban_m2 / pop_urban_int, 2)
                               if pop_urban_int > 0 else None)
        who_urban_pass = (m2_per_person_urban is not None
                          and m2_per_person_urban >= WHO_STANDARD_M2)

        result = {
            "province": province_name, "district": district_name, "year": year,
            "worldcover_year": 2021, "worldpop_year": WORLDPOP_YEAR,
            "total_area_km2": round(total_m2 / 1_000_000, 2),
            "urban_area_km2": urban_km2,
            "urban_share_pct": urban_share,
            "ndvi_mean_urban": round(ndvi_urban_mean, 4) if ndvi_urban_mean is not None else None,
            "green_in_urban_km2": green_in_urban_km2,
            "green_share_in_urban_pct": green_share_in_urban,
            "population_urban": pop_urban_int,
            "m2_per_person_urban": m2_per_person_urban,
            "who_urban_pass": who_urban_pass,
        }

        # Cache (best-effort — แค่ insert ถ้า table มีอยู่)
        try:
            supa_call(lambda s: s.table("urban_ndvi_annual").insert(result).execute())
        except Exception as e:
            print(f"⚠️ Urban cache insert failed (non-fatal — table อาจยังไม่ถูกสร้าง): {e}")

        return {**result, "from_cache": False}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Urban subset error [{scope}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Time-series (Phase B-2: multi-year trend) ────────────────────────────────
@router.get("/analysis/timeseries/{province_name}")
def get_timeseries(province_name: str,
                   start_year: int = CURRENT_YEAR - 4,
                   end_year: int = CURRENT_YEAR,
                   district_name: str | None = None):
    """ดึง NDVI + LST รายปี (annual) ย้อนหลังจาก cache เพื่อแสดงแนวโน้ม.

    เฉพาะปีที่มี cached row เท่านั้น — ไม่ trigger GEE compute ใหม่ เพื่อให้ response ไว.
    ถ้า district_name ระบุ → ดึง district_*_annual แทน
    """
    from dependencies import supa_call
    if district_name:
        if (province_name, district_name) not in DISTRICT_GEOMETRIES:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")
        ndvi_table, lst_table = "district_ndvi_annual", "district_lst_annual"
    else:
        if province_name not in PROVINCE_GEOMETRIES:
            raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")
        ndvi_table, lst_table = "ndvi_annual", "province_lst_annual"

    if start_year > end_year:
        start_year, end_year = end_year, start_year
    year_range = list(range(start_year, end_year + 1))
    if not year_range:
        raise HTTPException(status_code=400, detail="ช่วงปีไม่ถูกต้อง")

    def _q(table, fields):
        def go(s):
            q = (s.table(table).select(fields)
                 .eq("province", province_name)
                 .in_("year", year_range))
            if district_name:
                q = q.eq("district", district_name)
            return q.execute()
        return supa_call(go).data

    ndvi_rows = _q(ndvi_table,
                   "year,ndvi_mean,ndvi_min,ndvi_max,green_area_pct,green_area_km2,green_area_m2_per_person")
    lst_rows = _q(lst_table, "year,lst_mean,lst_min,lst_max")

    n_by_y = {r["year"]: r for r in ndvi_rows}
    l_by_y = {r["year"]: r for r in lst_rows}

    series = []
    for y in year_range:
        n, l = n_by_y.get(y), l_by_y.get(y)
        if not n and not l:
            continue
        series.append({
            "year": y,
            "ndvi_mean": n.get("ndvi_mean") if n else None,
            "ndvi_min": n.get("ndvi_min") if n else None,
            "ndvi_max": n.get("ndvi_max") if n else None,
            "green_area_pct": n.get("green_area_pct") if n else None,
            "green_area_km2": n.get("green_area_km2") if n else None,
            "green_area_m2_per_person": n.get("green_area_m2_per_person") if n else None,
            "lst_mean": l.get("lst_mean") if l else None,
            "lst_min": l.get("lst_min") if l else None,
            "lst_max": l.get("lst_max") if l else None,
        })

    # คำนวณ delta สรุป (จุดแรก → จุดสุดท้าย) ถ้ามีข้อมูลครบทั้งสองข้าง
    summary = {}
    valid_ndvi = [s for s in series if s.get("ndvi_mean") is not None]
    valid_lst = [s for s in series if s.get("lst_mean") is not None]
    if len(valid_ndvi) >= 2:
        first, last = valid_ndvi[0], valid_ndvi[-1]
        summary["ndvi_delta"] = round(last["ndvi_mean"] - first["ndvi_mean"], 4)
        summary["ndvi_first_year"] = first["year"]
        summary["ndvi_last_year"] = last["year"]
    if len(valid_lst) >= 2:
        first, last = valid_lst[0], valid_lst[-1]
        summary["lst_delta"] = round(last["lst_mean"] - first["lst_mean"], 2)
        summary["lst_first_year"] = first["year"]
        summary["lst_last_year"] = last["year"]

    return {
        "province": province_name,
        "district": district_name,
        "start_year": start_year, "end_year": end_year,
        "years_with_data": len(series),
        "years_in_range": len(year_range),
        "data": series,
        "summary": summary,
    }


# ── National & regional context ──────────────────────────────────────────────
@router.get("/analysis/context/{province_name}")
def get_context(province_name: str, year: int = CURRENT_YEAR):
    """คืนค่าเฉลี่ยระดับประเทศ + จังหวัดข้างเคียงสำหรับเทียบกับจังหวัดที่เลือก"""
    from dependencies import supa_call

    if province_name not in PROVINCE_GEOMETRIES:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    rows = supa_call(lambda s: s.table("ndvi_annual")
                     .select("province,ndvi_mean,green_area_pct,green_area_km2,green_area_m2_per_person")
                     .eq("year", year).execute()).data

    if not rows:
        return {"year": year, "provinces_in_cache": 0,
                "national": None, "neighbors": []}

    valid_ndvi = [r["ndvi_mean"] for r in rows if r.get("ndvi_mean") is not None]
    valid_pct = [r["green_area_pct"] for r in rows if r.get("green_area_pct") is not None]
    valid_m2 = [r["green_area_m2_per_person"] for r in rows
                if r.get("green_area_m2_per_person") is not None]

    def avg(xs):
        return round(sum(xs) / len(xs), 3) if xs else None

    target = next((r for r in rows if r["province"] == province_name), None)
    sorted_by_ndvi = sorted([r for r in rows if r.get("ndvi_mean") is not None],
                            key=lambda r: r["ndvi_mean"], reverse=True)
    rank = next((i + 1 for i, r in enumerate(sorted_by_ndvi)
                 if r["province"] == province_name), None)

    # Top 10 ranked provinces — เปิดเผยให้รายงานแสดงรายชื่อจริง อ่านแล้วตรวจอันดับเองได้
    ranked_top = [
        {"rank": i + 1, "province": r["province"],
         "ndvi_mean": r["ndvi_mean"],
         "green_area_pct": r.get("green_area_pct")}
        for i, r in enumerate(sorted_by_ndvi[:10])
    ]

    return {
        "year": year,
        "provinces_in_cache": len(rows),
        "national": {
            "ndvi_mean_avg": avg(valid_ndvi),
            "green_area_pct_avg": avg(valid_pct),
            "green_area_m2_per_person_avg": avg(valid_m2),
        },
        "target": {
            "province": province_name,
            "ndvi_mean": target["ndvi_mean"] if target else None,
            "ndvi_rank": rank,
            "ndvi_total_ranked": len(sorted_by_ndvi),
        } if target else None,
        "ranked_top": ranked_top,
    }
