# Green Area Backend

FastAPI + Google Earth Engine + Supabase cache

ดู [../README.md](../README.md) สำหรับ architecture และ setup ทั้งหมด — ไฟล์นี้เก็บเฉพาะ
รายละเอียดเฉพาะ backend

## Endpoints (สรุป)

| Method | Path | อธิบาย |
|---|---|---|
| GET | `/ndvi/{province}` | NDVI annual ของจังหวัด + dense forest + green/person |
| GET | `/ndvi/{province}/monthly` | NDVI 12 เดือน |
| GET | `/ndvi/{province}/districts/{district}` | NDVI annual ของอำเภอ |
| GET | `/ndvi/{province}/districts/{district}/monthly` | NDVI 12 เดือนของอำเภอ |
| GET | `/lst/{province}` | Land Surface Temperature annual |
| GET | `/lst/{province}/monthly` | LST 12 เดือน |
| GET | `/lst/{province}/districts/{district}` | LST อำเภอ (annual / monthly) |
| GET | `/recommend/{province}` | AI Priority heatmap + top-10 spots |
| GET | `/recommend/{province}/districts/{district}` | AI Recommend ระดับอำเภอ |
| POST | `/recommend/custom-area` | AI Recommend (heatmap + top-10 + impact + พันธุ์ไม้) บน polygon ที่ผู้ใช้วาดเอง |
| GET | `/analysis/urban-subset/{province}` | NDVI + green/person ในเขต built-up (WorldCover) |
| POST | `/analysis/custom-area` | วิเคราะห์ polygon ที่ผู้ใช้วาดเอง — NDVI/green/ป่าทึบ + ประชากร (WorldPop ในพื้นที่จริง) + WHO m²/คน + LST |
| GET | `/analysis/ranking?year=2026` | อันดับจังหวัดตาม green/person (WHO) |
| GET | `/analysis/timeseries/{province}` | NDVI+LST รายปีจาก cache + Mann-Kendall + forecast 3 ปี (95% PI) |
| GET | `/timelapse/ndvi/provinces` · `/timelapse/lst/provinces` | ค่า annual ทุกจังหวัดใน range — time-lapse animation |
| GET | `/compare?provinces=A,B&year=2026` | เปรียบเทียบหลายจังหวัด |
| POST | `/saved-areas` | บันทึก polygon ที่วาด + ผลวิเคราะห์ (header `X-Owner-Token`) |
| GET | `/saved-areas` · `/saved-areas/{id}` | รายการ / รายละเอียดพื้นที่ที่บันทึก (flag `mine`) |
| DELETE | `/saved-areas/{id}` | ลบพื้นที่ — เฉพาะเจ้าของ (owner token) หรือ admin |
| GET | `/cache` · `/cache/districts` | ดูสถานะ cache |
| DELETE | `/cache` · `/cache/{province}` | ล้าง cache (ต้องมี header `X-Admin-Token: $ADMIN_TOKEN`) |

API docs interactive: `http://localhost:8000/docs`

## Logging

ทุก module ใช้ `logging.getLogger(__name__)` กำหนด level ผ่าน `LOG_LEVEL` env
(`INFO` / `DEBUG` / `WARNING`) — config ถูกตั้งใน `main.py` พร้อม UTF-8 stream เพื่อ
รองรับ emoji + ไทย บน Windows console

## Schema

ตาราง Supabase ทั้งหมดอยู่ใน `migrations/000_initial_schema.sql` รัน migration เพิ่มเติม
(ถ้ามี) ตามลำดับเลข

`provinces` (migration 006) เป็นตารางอ้างอิงที่ normalize ชื่อไทย + ภาค ของ 77 จังหวัด
ไว้ที่เดียว (single source of truth) แล้วตารางข้อมูลอื่น FK → `provinces(name_en)` ·
`species.py::_region_for` อ่านภาคจากตารางนี้ก่อน (fallback ไป `PROVINCE_REGION` hardcoded
ถ้า DB ยังไม่มีข้อมูล)

`districts` (migration 007) เป็นตารางอ้างอิงระดับอำเภอ (928 อำเภอ + พื้นที่ km²) ·
4 ตารางอำเภอทำ composite FK `(province, district)` → `districts(province, name_en)` ·
ไม่ต้องแก้ logic เดิม (FK ระดับ DB) — `district` ยังเป็น text เหมือนเดิม

## ออกแบบ cache (สรุป)

- ทุก endpoint ที่ trigger GEE compute ราคาแพง → check cache ก่อน
- Cache key = `(province, district?, year)` — district nullable
- Stale check ใน `routers/ndvi/compute.py::_is_stale` — invalidate row ที่คำนวณก่อนยุค water mask
- AI Recommend tile URL หมดอายุพร้อม GEE session — มี in-process TTL cache 30 นาที
  (`routers/recommend/tile_cache.py::_TILE_URL_CACHE`) ลดต้นทุน cache hit จาก ~30s → <50ms

## Tests

มี test **114 ตัว** — รันด้วย `.venv/bin/pytest tests/ -v` (รันใน CI ทุก push/PR · ดู
`../.github/workflows/ci.yml`)

| ไฟล์ | ครอบคลุม |
|---|---|
| `tests/test_stats_utils.py` | `linregress` (slope/r) + Mann-Kendall trend significance + `forecast_linear` (OLS projection + 95% prediction interval) |
| `tests/test_pure_helpers.py` | `_is_stale` (cache invalidation), WHO status (9 m²/คน), normalize weights, validate geojson path, estimate impact (จำนวนต้นไม้ / cooling / CO₂ / รถยนต์ + สัมประสิทธิ์พันธุ์ไม้ไทย), validate polygon + geodesic area (custom-area) |
| `tests/test_endpoints.py` | API endpoints (`/`, `/compare`, `/cache`, `/analysis/ranking`, `/timelapse` ทั้ง NDVI/LST, `/analysis/cooling`, POST `/analysis/custom-area` + `/recommend/custom-area` validation, `/saved-areas` CRUD + ownership/admin auth, DELETE `/cache`) ผ่าน FastAPI `TestClient` + mock `supa_call` |

Pure helpers ทดสอบได้โดยไม่ต้องมี credential · endpoint tests mock ทุก call ไป
Supabase/GEE จึงไม่แตะ external service จริง
