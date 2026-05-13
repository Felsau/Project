from functools import lru_cache
from fastapi import Header, HTTPException
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime
import httpx
import json
import logging
import os
import time

load_dotenv()
logger = logging.getLogger(__name__)

CURRENT_YEAR = datetime.now().year
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")
WHO_STANDARD_M2 = 9
MONTH_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
               'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']


def require_admin(x_admin_token: str | None = Header(default=None)):
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=503,
                            detail="ADMIN_TOKEN ยังไม่ตั้งค่าใน .env — endpoint นี้ปิดใช้งาน")
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_KEY ไม่ถูกตั้งค่าใน .env")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# httpx exceptions ที่บ่งชี้ว่า connection ตายระหว่างทาง
# (Supabase / Cloudflare ตัด idle connection แต่ httpx ยัง pool ค้างไว้)
_TRANSIENT_ERRORS = (
    httpx.RemoteProtocolError,
    httpx.ReadError,
    httpx.WriteError,
    httpx.ConnectError,
    httpx.ReadTimeout,
    httpx.WriteTimeout,
    httpx.PoolTimeout,
)


def supa_call(builder_fn, retries: int = 1):
    """เรียก Supabase พร้อม retry เมื่อเจอ stale connection.

    Args:
        builder_fn: callable(supabase_client) -> APIResponse
                    ต้องสร้าง query chain ใหม่ทุกครั้ง เพราะหลัง disconnect
                    client ตัวเก่าใช้ไม่ได้แล้ว
        retries:    จำนวนครั้งที่ retry เพิ่มเติม (default 1 → รวมทั้งหมด 2 ครั้ง)
    """
    last_exc = None
    for attempt in range(retries + 1):
        try:
            return builder_fn(get_supabase())
        except _TRANSIENT_ERRORS as e:
            last_exc = e
            if attempt < retries:
                logger.warning("⚠️  Supabase %s: %s — recreate client + retry (%d/%d)",
                               type(e).__name__, e, attempt + 1, retries)
                # ทิ้ง client เก่าทั้ง connection pool แล้วสร้างใหม่ในรอบถัดไป
                get_supabase.cache_clear()
                time.sleep(0.3 * (attempt + 1))  # backoff สั้นๆ
                continue
            raise
    # ไม่ควรมาถึง — แต่กัน type checker
    raise last_exc  # type: ignore[misc]


def get_population(supabase_unused: Client, province_name: str, year: int):
    # หมายเหตุ: ตัวแปร supabase_unused เก็บไว้เพื่อ backward compat กับ caller เดิม
    # การเรียกจริงใช้ supa_call เพื่อให้ได้ retry-on-disconnect
    result = supa_call(lambda s: s.table("province_population")
                       .select("population,year")
                       .eq("province", province_name)
                       .eq("year", year)
                       .execute())
    if result.data:
        return result.data[0]["population"]
    fallback = supa_call(lambda s: s.table("province_population")
                         .select("population,year")
                         .eq("province", province_name)
                         .order("year", desc=True)
                         .limit(1)
                         .execute())
    return fallback.data[0]["population"] if fallback.data else None


def _load_province_geometries() -> dict:
    path = os.path.join(os.path.dirname(__file__),
                        '..', 'green-area-frontend', 'public', 'thailand.json')
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    return {feat['properties']['name']: feat['geometry'] for feat in data['features']}


def _load_district_geometries() -> dict:
    path = os.path.join(os.path.dirname(__file__),
                        '..', 'green-area-frontend', 'public', 'thailand_districts.json')
    if not os.path.exists(path):
        logger.warning("⚠️  thailand_districts.json ไม่พบ — รัน generate_districts.py ก่อน")
        return {}
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    result = {}
    for feat in data['features']:
        p = feat['properties'].get('province', '')
        d = feat['properties'].get('name', '')
        if p and d:
            result[(p, d)] = feat['geometry']
    return result


PROVINCE_GEOMETRIES = _load_province_geometries()
logger.info("✅ โหลดขอบเขต %d จังหวัดจาก GADM", len(PROVINCE_GEOMETRIES))

DISTRICT_GEOMETRIES = _load_district_geometries()
logger.info("✅ โหลดขอบเขต %d อำเภอ", len(DISTRICT_GEOMETRIES))
