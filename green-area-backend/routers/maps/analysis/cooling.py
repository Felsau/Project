"""NDVI ↔ LST cooling relationship — quantify vegetation's surface-cooling effect.

อ่าน NDVI + LST รายอำเภอจาก cache (ปีเดียว) จับคู่ต่ออำเภอ แล้ว fit เส้นถดถอย
    LST = slope·NDVI + intercept
slope < 0 = ยิ่งเขียวยิ่งเย็น (urban cooling gradient) — เป็นหลักฐานเชิงประจักษ์
ของวิทยานิพนธ์ว่า "เพิ่มพืชพรรณ → ลดอุณหภูมิผิวเมือง"

ไม่ trigger GEE — ใช้ cached district rows เหมือน /analysis/districts จึงตอบไว
และ test ได้โดยไม่แตะ external service
"""
from fastapi import APIRouter

from dependencies import supa_call, ensure_province, CURRENT_YEAR, YearParam
from stats_utils import linregress

router = APIRouter()


def _interpret(fit: dict | None) -> str:
    if not fit:
        return ("ข้อมูลไม่พอ — ต้องมีอย่างน้อย 2 อำเภอที่มีทั้ง NDVI และ LST "
                "ใน cache (ลองโหลดข้อมูลรายอำเภอเพิ่ม)")
    slope, r2 = fit["slope"], fit["r2"]
    if slope < 0:
        strength = "ชัดเจน" if r2 >= 0.5 else "ปานกลาง" if r2 >= 0.25 else "อ่อน"
        # slope = °C ต่อ NDVI 1 หน่วย → ต่อ NDVI 0.1 = slope·0.1
        return (f"พบความสัมพันธ์เชิงลบ ({strength}, R²={r2:.2f}) — "
                f"NDVI ที่สูงขึ้น 0.1 สัมพันธ์กับอุณหภูมิผิวที่ต่ำลง "
                f"~{abs(slope) * 0.1:.1f}°C โดยเฉลี่ยระหว่างอำเภอ")
    return (f"ความชันเป็นบวก (R²={r2:.2f}) — ไม่พบ cooling effect ตามที่คาด "
            "อาจเพราะตัวอย่างอำเภอน้อย หรือพื้นที่เป็นเขตเมืองเกือบทั้งหมด")


@router.get("/analysis/cooling/{province_name}")
def get_cooling_analysis(province_name: str, year: YearParam = CURRENT_YEAR):
    """Regression ของ LST ต่อ NDVI ระดับอำเภอ — วัด cooling effect ของพืชพรรณ.

    คืน scatter points (ndvi, lst ต่ออำเภอ) + regression (slope/r/r²) + คำอธิบายไทย
    สำหรับ plot เป็นกราฟ scatter ในรายงาน/หน้าเว็บ
    """
    ensure_province(province_name)

    ndvi_rows = supa_call(lambda s: s.table("district_ndvi_annual")
        .select("district,ndvi_mean")
        .eq("province", province_name).eq("year", year).execute()).data
    lst_rows = supa_call(lambda s: s.table("district_lst_annual")
        .select("district,lst_mean")
        .eq("province", province_name).eq("year", year).execute()).data

    lst_by_dist = {r["district"]: r.get("lst_mean") for r in lst_rows}
    points = []
    for n in ndvi_rows:
        ndvi, lst = n.get("ndvi_mean"), lst_by_dist.get(n["district"])
        if ndvi is not None and lst is not None:
            points.append({"district": n["district"], "ndvi": ndvi, "lst": lst})

    # เรียงตาม NDVI เพื่อให้กราฟลากเส้นได้สวย + อ่านง่าย
    points.sort(key=lambda p: p["ndvi"])
    fit = linregress([p["ndvi"] for p in points], [p["lst"] for p in points])

    return {
        "province": province_name,
        "year": year,
        "n_districts": len(points),
        "points": points,
        "regression": fit,
        "interpretation": _interpret(fit),
    }
