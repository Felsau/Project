"""Pure GeoJSON-polygon helpers — validate + geodesic area.

ใช้ร่วมระหว่าง /analysis/custom-area และ /recommend/custom-area (polygon ที่ผู้ใช้
วาดเอง) · ไม่พึ่ง GEE/Supabase จึง unit-test ได้ตรง (ดู tests/test_pure_helpers.py)
"""
from math import radians, sin

# Guards — กัน abuse + GEE compute แพงเกินจำเป็น
MAX_AREA_KM2 = 20_000   # ~ จังหวัดใหญ่ที่สุด · พอสำหรับ use case จริง (เขต/เมือง/โครงการ)
MAX_VERTICES = 500      # polygon ที่ละเอียดเกินนี้แทบไม่เปลี่ยนผลแต่ทำ payload บวม

_EARTH_RADIUS_M = 6_378_137.0  # WGS84 equatorial radius


def validate_polygon_geometry(geom: dict) -> list:
    """ตรวจว่า geom เป็น GeoJSON Polygon ที่ถูกต้อง — คืน coordinates (list of rings).

    raise ValueError พร้อมข้อความไทยถ้าไม่ผ่าน (caller แปลงเป็น HTTP 400)
    """
    if not isinstance(geom, dict):
        raise ValueError("geometry ต้องเป็น object")
    if geom.get("type") != "Polygon":
        raise ValueError("รองรับเฉพาะ GeoJSON ชนิด Polygon")
    coords = geom.get("coordinates")
    if not isinstance(coords, list) or not coords:
        raise ValueError("coordinates ของ polygon ไม่ถูกต้อง")
    for ring in coords:
        # ring ปิด = จุดแรก/สุดท้ายซ้ำกัน → ต้องมี ≥ 4 ตำแหน่ง (3 จุดจริง + ปิด)
        if not isinstance(ring, list) or len(ring) < 4:
            raise ValueError("polygon ต้องมีอย่างน้อย 3 จุด")
        for pt in ring:
            if not (isinstance(pt, (list, tuple)) and len(pt) >= 2):
                raise ValueError("จุดพิกัดต้องเป็น [lng, lat]")
            lng, lat = pt[0], pt[1]
            if not isinstance(lng, (int, float)) or not isinstance(lat, (int, float)):
                raise ValueError("พิกัดต้องเป็นตัวเลข")
            if not (-180 <= lng <= 180 and -90 <= lat <= 90):
                raise ValueError("พิกัดอยู่นอกช่วงที่ถูกต้อง")
    return coords


def _ring_area_m2(ring: list) -> float:
    """พื้นที่ (m²) ของ ring เดียวบนทรงกลม WGS84 — สูตร geodesic ของ
    Chamberlain & Duquette (เดียวกับ @turf/area) · คืนค่า absolute"""
    n = len(ring)
    if n < 3:
        return 0.0
    total = 0.0
    for i in range(n):
        lng1, lat1 = ring[i][0], ring[i][1]
        lng2, lat2 = ring[(i + 1) % n][0], ring[(i + 1) % n][1]
        total += radians(lng2 - lng1) * (2 + sin(radians(lat1)) + sin(radians(lat2)))
    return abs(total * _EARTH_RADIUS_M * _EARTH_RADIUS_M / 2.0)


def polygon_area_km2(coords: list) -> float:
    """พื้นที่สุทธิ (km²) ของ polygon = ring นอก ลบ ring รู (holes)"""
    if not coords:
        return 0.0
    area_m2 = _ring_area_m2(coords[0])
    for hole in coords[1:]:
        area_m2 -= _ring_area_m2(hole)
    return max(0.0, area_m2) / 1_000_000


def validate_drawn_polygon(geom: dict) -> float:
    """ตรวจ polygon ที่ผู้ใช้วาดครบทุกชั้น (type + จำนวนจุด + ขนาดพื้นที่) แล้วคืน area_km2.

    รวม guard ที่ /analysis/custom-area, /recommend/custom-area และ /saved-areas ใช้
    เหมือนกัน ไว้ที่เดียว · raise ValueError ถ้าไม่ผ่าน (caller แปลงเป็น HTTP 400)
    """
    coords = validate_polygon_geometry(geom)
    if sum(len(r) for r in coords) > MAX_VERTICES:
        raise ValueError(f"จำนวนจุดมากเกินไป — สูงสุด {MAX_VERTICES} จุด")
    area_km2 = polygon_area_km2(coords)
    if area_km2 <= 0:
        raise ValueError("พื้นที่ที่วาดมีขนาดเป็นศูนย์")
    if area_km2 > MAX_AREA_KM2:
        raise ValueError(
            f"พื้นที่ใหญ่เกินไป ({area_km2:,.0f} km²) — สูงสุด {MAX_AREA_KM2:,} km²")
    return area_km2
