"""National & regional context — ค่าเฉลี่ย + อันดับสำหรับเทียบกับจังหวัดที่เลือก."""
from fastapi import APIRouter

from dependencies import supa_call, ensure_province, CURRENT_YEAR, YearParam

router = APIRouter()


@router.get("/analysis/context/{province_name}")
def get_context(province_name: str, year: YearParam = CURRENT_YEAR):
    """คืนค่าเฉลี่ยระดับประเทศ + จังหวัดข้างเคียงสำหรับเทียบกับจังหวัดที่เลือก"""
    ensure_province(province_name)

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
