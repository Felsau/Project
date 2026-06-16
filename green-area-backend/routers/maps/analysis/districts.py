"""District summary (Phase B-1) — per-district NDVI+LST breakdown จาก cache."""
from fastapi import APIRouter

from dependencies import (supa_call, ensure_province, DISTRICT_GEOMETRIES,
                          CURRENT_YEAR, YearParam)

router = APIRouter()


@router.get("/analysis/districts/{province_name}")
def get_district_summary(province_name: str, year: YearParam = CURRENT_YEAR):
    """รวบรวมข้อมูลรายอำเภอ (NDVI + LST) จาก cache สำหรับใส่ในรายงานระดับจังหวัด.

    คืนเฉพาะอำเภอที่มี cached ปีนั้น — ไม่ trigger compute ใหม่เพื่อกันเวลา response.
    """
    ensure_province(province_name)

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
