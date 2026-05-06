from fastapi import APIRouter, HTTPException
import traceback
import ee

from dependencies import (get_supabase, PROVINCE_GEOMETRIES, DISTRICT_GEOMETRIES,
                          CURRENT_YEAR, MONTH_NAMES)
from gee_utils import get_lst_col, reduce_lst

router = APIRouter()


# ── District LST monthly ─────────────────────────────────── (before catch-all)
@router.get("/lst/{province_name}/districts/{district_name}/monthly")
def get_district_lst_monthly(province_name: str, district_name: str, year: int = CURRENT_YEAR):
    raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
    if not raw_geom:
        raise HTTPException(status_code=404,
            detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")

    supabase = get_supabase()
    cached = (supabase.table("district_lst_monthly")
              .select("*").eq("province", province_name)
              .eq("district", district_name).eq("year", year).execute())
    if cached.data:
        return {"province": province_name, "district": district_name, "year": year,
                "monthly": cached.data[0]["monthly_data"], "from_cache": True}

    print(f"⏳ Computing district LST monthly: {province_name}/{district_name}/{year}")
    try:
        geom = ee.Geometry(raw_geom)
        results = []
        for m in range(1, 13):
            col = get_lst_col(geom, year, month=m)
            count = col.size().getInfo()
            lst_mean, _, _ = reduce_lst(col, geom, scale=100) if count > 0 else (None, None, None)
            results.append({"month": MONTH_NAMES[m - 1], "month_num": m,
                             "lst": lst_mean, "image_count": count})

        supabase.table("district_lst_monthly").insert({
            "province": province_name, "district": district_name,
            "year": year, "monthly_data": results}).execute()
        return {"province": province_name, "district": district_name,
                "year": year, "monthly": results, "from_cache": False}
    except Exception as e:
        print(f"❌ District LST monthly error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── District LST annual ──────────────────────────────────── (before catch-all)
@router.get("/lst/{province_name}/districts/{district_name}")
def get_district_lst(province_name: str, district_name: str, year: int = CURRENT_YEAR):
    raw_geom = DISTRICT_GEOMETRIES.get((province_name, district_name))
    if not raw_geom:
        raise HTTPException(status_code=404,
            detail=f"ไม่พบอำเภอ '{district_name}' ในจังหวัด '{province_name}'")

    supabase = get_supabase()
    cached = (supabase.table("district_lst_annual")
              .select("*").eq("province", province_name)
              .eq("district", district_name).eq("year", year).execute())
    if cached.data:
        row = cached.data[0]
        return {"province": province_name, "district": district_name, "year": year,
                "lst_mean": row["lst_mean"], "lst_min": row["lst_min"],
                "lst_max": row["lst_max"], "from_cache": True}

    print(f"⏳ Computing district LST: {province_name}/{district_name}/{year}")
    try:
        geom = ee.Geometry(raw_geom)
        col = get_lst_col(geom, year)
        if col.size().getInfo() == 0:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบข้อมูล Landsat สำหรับ {district_name} ปี {year}")
        lst_mean, lst_min, lst_max = reduce_lst(col, geom, scale=100)

        supabase.table("district_lst_annual").insert({
            "province": province_name, "district": district_name, "year": year,
            "lst_mean": lst_mean, "lst_min": lst_min, "lst_max": lst_max}).execute()
        return {"province": province_name, "district": district_name, "year": year,
                "lst_mean": lst_mean, "lst_min": lst_min, "lst_max": lst_max,
                "from_cache": False}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ District LST error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Province LST monthly ─────────────────────────────────────────────────────
@router.get("/lst/{province_name}/monthly")
def get_lst_monthly(province_name: str, year: int = CURRENT_YEAR):
    raw_geom = PROVINCE_GEOMETRIES.get(province_name)
    if not raw_geom:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    supabase = get_supabase()
    cached = (supabase.table("province_lst_monthly")
              .select("*").eq("province", province_name).eq("year", year).execute())
    if cached.data:
        print(f"✅ LST cache hit: {province_name}/{year}/monthly")
        return {"province": province_name, "year": year,
                "monthly": cached.data[0]["monthly_data"], "from_cache": True}

    print(f"⏳ Computing LST monthly: {province_name}/{year}")
    try:
        geom = ee.Geometry(raw_geom)
        results = []
        for m in range(1, 13):
            col = get_lst_col(geom, year, month=m)
            count = col.size().getInfo()
            lst_mean, _, _ = reduce_lst(col, geom, scale=500) if count > 0 else (None, None, None)
            results.append({"month": MONTH_NAMES[m - 1], "month_num": m,
                             "lst": lst_mean, "image_count": count})

        supabase.table("province_lst_monthly").insert(
            {"province": province_name, "year": year, "monthly_data": results}).execute()
        return {"province": province_name, "year": year, "monthly": results, "from_cache": False}
    except Exception as e:
        print(f"❌ LST monthly error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Province LST annual ──────────────────────────────────────────────────────
@router.get("/lst/{province_name}")
def get_lst(province_name: str, year: int = CURRENT_YEAR):
    raw_geom = PROVINCE_GEOMETRIES.get(province_name)
    if not raw_geom:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")

    supabase = get_supabase()
    cached = (supabase.table("province_lst_annual")
              .select("*").eq("province", province_name).eq("year", year).execute())
    if cached.data:
        row = cached.data[0]
        print(f"✅ LST cache hit: {province_name}/{year}")
        return {"province": province_name, "year": year,
                "lst_mean": row["lst_mean"], "lst_min": row["lst_min"],
                "lst_max": row["lst_max"], "from_cache": True}

    print(f"⏳ Computing LST annual: {province_name}/{year}")
    try:
        geom = ee.Geometry(raw_geom)
        col = get_lst_col(geom, year)
        if col.size().getInfo() == 0:
            raise HTTPException(status_code=404,
                detail=f"ไม่พบข้อมูล Landsat สำหรับ {province_name} ปี {year}")
        lst_mean, lst_min, lst_max = reduce_lst(col, geom, scale=500)

        supabase.table("province_lst_annual").insert(
            {"province": province_name, "year": year,
             "lst_mean": lst_mean, "lst_min": lst_min, "lst_max": lst_max}).execute()
        return {"province": province_name, "year": year,
                "lst_mean": lst_mean, "lst_min": lst_min, "lst_max": lst_max,
                "from_cache": False}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ LST error [{province_name}/{year}]: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
