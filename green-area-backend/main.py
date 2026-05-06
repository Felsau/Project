import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import ee

from dependencies import (get_supabase, require_admin,
                          PROVINCE_GEOMETRIES, CURRENT_YEAR)
from routers import ndvi, lst, recommend

GEE_PROJECT = os.getenv("GEE_PROJECT")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",") if o.strip()]

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not GEE_PROJECT:
    print("⚠️  ไม่พบ GEE_PROJECT ใน .env — endpoint ที่ต้องใช้ GEE จะใช้งานไม่ได้")
else:
    try:
        ee.Initialize(project=GEE_PROJECT)
        print(f"✅ GEE เชื่อมต่อสำเร็จ (project: {GEE_PROJECT})")
    except Exception as e:
        print(f"❌ GEE เชื่อมต่อไม่สำเร็จ: {e}")

app.include_router(ndvi.router)
app.include_router(lst.router)
app.include_router(recommend.router)


@app.get("/")
def read_root():
    supabase = get_supabase()
    annual  = supabase.table("ndvi_annual").select("province,year").execute()
    monthly = supabase.table("ndvi_monthly").select("province,year").execute()
    return {
        "message":        "Green Area API is running! 🌿",
        "cached_annual":  len(annual.data),
        "cached_monthly": len(monthly.data),
    }


@app.get("/compare")
def compare_provinces(provinces: str, year: int = CURRENT_YEAR):
    province_list = [p.strip() for p in provinces.split(",") if p.strip()]
    if not province_list:
        raise HTTPException(status_code=400, detail="ต้องระบุจังหวัดอย่างน้อย 1 จังหวัด")
    missing = [p for p in province_list if p not in PROVINCE_GEOMETRIES]
    if missing:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด: {', '.join(missing)}")

    supabase = get_supabase()
    result = (supabase.table("ndvi_annual")
              .select("province,ndvi_mean,green_area_pct,green_area_km2,green_area_m2_per_person,who_status")
              .in_("province", province_list)
              .eq("year", year)
              .execute())
    found = {row["province"]: row for row in result.data}
    data = [
        {"province": p, "available": True, **found[p]} if p in found
        else {"province": p, "available": False}
        for p in province_list
    ]
    return {"year": year, "data": data}


@app.get("/cache")
def get_cache():
    supabase = get_supabase()
    annual  = supabase.table("ndvi_annual").select("province,year,ndvi_mean,green_area_pct,who_status,created_at").execute()
    monthly = supabase.table("ndvi_monthly").select("province,year,created_at").execute()
    return {"annual": annual.data, "monthly": monthly.data}


@app.get("/cache/districts")
def get_district_cache(province: str | None = None):
    supabase = get_supabase()
    q = supabase.table("district_ndvi_annual").select(
        "province,district,year,ndvi_mean,green_area_pct,created_at"
    )
    if province:
        q = q.eq("province", province)
    return {"annual": q.execute().data}


CACHE_TABLES = (
    "ndvi_annual", "ndvi_monthly",
    "province_lst_annual", "province_lst_monthly",
    "district_ndvi_annual", "district_ndvi_monthly",
    "district_lst_annual", "district_lst_monthly",
    "planting_recommendations",
)


@app.delete("/cache", dependencies=[Depends(require_admin)])
def clear_cache():
    supabase = get_supabase()
    for table in CACHE_TABLES:
        supabase.table(table).delete().neq("id", 0).execute()
    return {"message": "✅ Cache cleared", "tables": list(CACHE_TABLES)}


@app.delete("/cache/{province_name}", dependencies=[Depends(require_admin)])
def clear_province_cache(province_name: str):
    supabase = get_supabase()
    for table in CACHE_TABLES:
        supabase.table(table).delete().eq("province", province_name).execute()
    return {"message": f"✅ Cache cleared for {province_name}"}


@app.get("/analysis/ranking")
def get_ranking(year: int = CURRENT_YEAR):
    supabase = get_supabase()
    result = (supabase.table("ndvi_annual")
              .select("province,ndvi_mean,green_area_pct,green_area_km2,green_area_m2_per_person,who_status,population,total_area_km2")
              .eq("year", year)
              .execute())
    data = result.data
    rankable = [r for r in data if r.get("green_area_m2_per_person") is not None]
    ranked = sorted(rankable, key=lambda x: x["green_area_m2_per_person"])
    for i, row in enumerate(ranked):
        row["rank"] = i + 1
        current = row["green_area_m2_per_person"]
        row["deficit_m2_per_person"] = round(max(0, 9 - current), 2)
        pop = row.get("population") or 0
        row["deficit_km2"] = round(max(0, 9 - current) * pop / 1_000_000, 2) if pop else 0
    who_pass = sum(1 for r in rankable if r.get("who_status") and "ผ่าน" in r.get("who_status", ""))
    who_fail = sum(1 for r in rankable if r.get("who_status") and "ต่ำกว่า" in r.get("who_status", ""))
    return {
        "year": year,
        "total_cached": len(rankable),
        "who_pass_count": who_pass,
        "who_fail_count": who_fail,
        "data": ranked,
    }
