from functools import lru_cache
from fastapi import Header, HTTPException
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime
import json
import os

load_dotenv()

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


def get_population(supabase: Client, province_name: str, year: int):
    result = (supabase.table("province_population")
              .select("population,year")
              .eq("province", province_name)
              .eq("year", year)
              .execute())
    if result.data:
        return result.data[0]["population"]
    fallback = (supabase.table("province_population")
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
        print("⚠️  thailand_districts.json ไม่พบ — รัน generate_districts.py ก่อน")
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
print(f"✅ โหลดขอบเขต {len(PROVINCE_GEOMETRIES)} จังหวัดจาก GADM")

DISTRICT_GEOMETRIES = _load_district_geometries()
print(f"✅ โหลดขอบเขต {len(DISTRICT_GEOMETRIES)} อำเภอ")
