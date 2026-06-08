import logging
import os
import sys

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
import ee

# Logging — UTF-8 handler (รองรับ emoji + ไทย บน Windows console)
# ตั้งก่อน import router เพื่อให้ทุก module ใช้ config เดียวกัน
try:
    sys.stdout.reconfigure(encoding='utf-8')
except (AttributeError, OSError):
    pass
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

from dependencies import (supa_call, require_admin,
                          PROVINCE_GEOMETRIES, CURRENT_YEAR,
                          YearParam, WHO_STANDARD_M2)
from routers import ndvi, lst, recommend, maps
from schemas import RankingResponse, TimelapseResponse

GEE_PROJECT = os.getenv("GEE_PROJECT")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",") if o.strip()]

# Production = ALLOWED_ORIGINS ถูกตั้งเป็น URL จริง (ไม่ใช่ localhost default)
IS_PRODUCTION = ALLOWED_ORIGINS != ["http://localhost:3000"]
_DEFAULT_ADMIN_TOKEN = "change-me-to-a-random-secret"  # ค่าตัวอย่างใน .env.example

# Startup config checks — fail fast ใน production ถ้า security config อ่อน
# (dev = แค่ warn เพื่อไม่ขวางการพัฒนา)
_admin_token = os.getenv("ADMIN_TOKEN")
if not _admin_token:
    _msg = "ADMIN_TOKEN ไม่ได้ตั้ง — DELETE /cache จะถูก reject ทุก request"
    if IS_PRODUCTION:
        raise RuntimeError(f"❌ {_msg} · production ต้องตั้ง ADMIN_TOKEN เป็น secret สุ่มยาว ≥ 16 ตัว")
    logger.warning("⚠️  %s", _msg)
elif _admin_token == _DEFAULT_ADMIN_TOKEN or len(_admin_token) < 16:
    _msg = "ADMIN_TOKEN เป็นค่า default หรือสั้นเกินไป (< 16 ตัว) — เดา/brute-force ได้ง่าย"
    if IS_PRODUCTION:
        raise RuntimeError(f"❌ {_msg} · ตั้งใหม่เป็น secret สุ่มยาว")
    logger.warning("⚠️  %s", _msg)

if not IS_PRODUCTION:
    logger.warning("⚠️  ALLOWED_ORIGINS = localhost · production ต้องเปลี่ยนเป็น URL ของ frontend")

app = FastAPI()
# CORS — จำกัดเฉพาะ method/header ที่ API ใช้จริง (least privilege)
# ไม่เปิด allow_credentials เพราะ API ใช้ token header ไม่ใช่ cookie
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "DELETE", "OPTIONS"],
    allow_headers=["X-Admin-Token", "Content-Type"],
)

# Rate limit แบบ global ต่อ IP — กันใช้ผิดประเภท + GEE quota หมด
# default 60 req/min ครอบคลุมทุก endpoint · override ผ่าน env RATE_LIMIT
#
# ⚠️  หลัง reverse proxy (Render/Railway) ต้องรัน uvicorn ด้วย
#     --proxy-headers --forwarded-allow-ips='*' ไม่งั้น get_remote_address จะเห็น
#     IP ของ proxy → ทุกคนใช้ rate-limit bucket เดียวกัน (ดู Procfile / README)
_rate_limit = os.getenv("RATE_LIMIT", "60/minute")
limiter = Limiter(key_func=get_remote_address, default_limits=[_rate_limit])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

if not GEE_PROJECT:
    logger.warning("⚠️  ไม่พบ GEE_PROJECT ใน .env — endpoint ที่ต้องใช้ GEE จะใช้งานไม่ได้")
else:
    try:
        ee.Initialize(project=GEE_PROJECT)
        logger.info("✅ GEE เชื่อมต่อสำเร็จ (project: %s)", GEE_PROJECT)
    except Exception as e:
        logger.error("❌ GEE เชื่อมต่อไม่สำเร็จ: %s", e)

app.include_router(ndvi.router)
app.include_router(lst.router)
app.include_router(recommend.router)
app.include_router(maps.router)


@app.get("/health")
def health():
    """Liveness probe น้ำหนักเบา — ไม่แตะ DB/GEE เหมาะกับ load-balancer healthcheck
    (ใช้ตัวนี้แทน / ที่ query Supabase 2 ครั้งทุกการเรียก)"""
    return {"ok": True}


@app.get("/")
def read_root():
    annual  = supa_call(lambda s: s.table("ndvi_annual").select("province,year").execute())
    monthly = supa_call(lambda s: s.table("ndvi_monthly").select("province,year").execute())
    return {
        "message":        "Green Area API is running! 🌿",
        "cached_annual":  len(annual.data),
        "cached_monthly": len(monthly.data),
    }


# จำกัดจำนวนจังหวัดต่อ 1 request — กัน abuse ที่ส่ง list ยาวไป build query ใหญ่
MAX_COMPARE_PROVINCES = 50


@app.get("/compare")
def compare_provinces(provinces: str, year: YearParam = CURRENT_YEAR):
    province_list = [p.strip() for p in provinces.split(",") if p.strip()]
    if not province_list:
        raise HTTPException(status_code=400, detail="ต้องระบุจังหวัดอย่างน้อย 1 จังหวัด")
    if len(province_list) > MAX_COMPARE_PROVINCES:
        raise HTTPException(status_code=400,
            detail=f"เปรียบเทียบได้สูงสุด {MAX_COMPARE_PROVINCES} จังหวัดต่อครั้ง")
    missing = [p for p in province_list if p not in PROVINCE_GEOMETRIES]
    if missing:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด: {', '.join(missing)}")

    result = supa_call(lambda s: s.table("ndvi_annual")
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
    annual  = supa_call(lambda s: s.table("ndvi_annual").select("province,year,ndvi_mean,green_area_pct,who_status,created_at").execute())
    monthly = supa_call(lambda s: s.table("ndvi_monthly").select("province,year,created_at").execute())
    return {"annual": annual.data, "monthly": monthly.data}


@app.get("/cache/districts")
def get_district_cache(province: str | None = None):
    def _query(s):
        q = s.table("district_ndvi_annual").select(
            "province,district,year,ndvi_mean,green_area_pct,created_at"
        )
        if province:
            q = q.eq("province", province)
        return q.execute()
    return {"annual": supa_call(_query).data}


CACHE_TABLES = (
    "ndvi_annual", "ndvi_monthly",
    "province_lst_annual", "province_lst_monthly",
    "district_ndvi_annual", "district_ndvi_monthly",
    "district_lst_annual", "district_lst_monthly",
    "urban_ndvi_annual",
    "planting_recommendations",
)


@app.delete("/cache", dependencies=[Depends(require_admin)])
def clear_cache(request: Request):
    client = request.client.host if request.client else "unknown"
    logger.warning("🗑️  ADMIN cache clear (ALL %d tables) จาก %s", len(CACHE_TABLES), client)
    for table in CACHE_TABLES:
        supa_call(lambda s, t=table: s.table(t).delete().neq("id", 0).execute())
    return {"message": "✅ Cache cleared", "tables": list(CACHE_TABLES)}


@app.delete("/cache/{province_name}", dependencies=[Depends(require_admin)])
def clear_province_cache(province_name: str, request: Request):
    # Whitelist check — กัน admin พิมพ์ผิดแล้วลบ 0 row เงียบๆ
    if province_name not in PROVINCE_GEOMETRIES:
        raise HTTPException(status_code=404, detail=f"ไม่พบจังหวัด '{province_name}'")
    client = request.client.host if request.client else "unknown"
    logger.warning("🗑️  ADMIN cache clear (%s) จาก %s", province_name, client)
    for table in CACHE_TABLES:
        supa_call(lambda s, t=table: s.table(t).delete().eq("province", province_name).execute())
    return {"message": f"✅ Cache cleared for {province_name}"}


@app.get("/timelapse/ndvi/provinces", response_model=TimelapseResponse)
def get_timelapse_ndvi(start_year: YearParam = 2015,
                       end_year: YearParam = CURRENT_YEAR):
    """รวม NDVI annual ของทุกจังหวัดใน range — สำหรับ time-lapse animation
    คืนเฉพาะปีที่มี cache อยู่จริงใน Supabase (ไม่ trigger GEE compute)"""
    if start_year > end_year:
        raise HTTPException(status_code=400,
            detail="start_year ต้องน้อยกว่าหรือเท่ากับ end_year")

    result = supa_call(lambda s: s.table("ndvi_annual")
                       .select("province,year,ndvi_mean")
                       .gte("year", start_year)
                       .lte("year", end_year)
                       .execute())
    data: dict[str, dict[str, float]] = {}
    years_set: set[int] = set()
    for row in result.data:
        if row.get("ndvi_mean") is None:
            continue
        p, y = row["province"], row["year"]
        data.setdefault(p, {})[str(y)] = row["ndvi_mean"]
        years_set.add(y)

    return {
        "start_year": start_year,
        "end_year": end_year,
        "years": sorted(years_set),
        "province_count": len(data),
        "data": data,
    }


@app.get("/analysis/ranking", response_model=RankingResponse)
def get_ranking(year: YearParam = CURRENT_YEAR):
    result = supa_call(lambda s: s.table("ndvi_annual")
                       .select("province,ndvi_mean,green_area_pct,green_area_km2,green_area_m2_per_person,who_status,population,total_area_km2")
                       .eq("year", year)
                       .execute())
    data = result.data
    rankable = [r for r in data if r.get("green_area_m2_per_person") is not None]
    ranked = sorted(rankable, key=lambda x: x["green_area_m2_per_person"])
    for i, row in enumerate(ranked):
        row["rank"] = i + 1
        current = row["green_area_m2_per_person"]
        row["deficit_m2_per_person"] = round(max(0, WHO_STANDARD_M2 - current), 2)
        pop = row.get("population") or 0
        row["deficit_km2"] = round(max(0, WHO_STANDARD_M2 - current) * pop / 1_000_000, 2) if pop else 0
    who_pass = sum(1 for r in rankable if r.get("who_status") and "ผ่าน" in r.get("who_status", ""))
    who_fail = sum(1 for r in rankable if r.get("who_status") and "ต่ำกว่า" in r.get("who_status", ""))
    return {
        "year": year,
        "total_cached": len(rankable),
        "who_pass_count": who_pass,
        "who_fail_count": who_fail,
        "data": ranked,
    }
