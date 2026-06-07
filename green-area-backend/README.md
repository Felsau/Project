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
| GET | `/analysis/urban-subset/{province}` | NDVI + green/person ในเขต built-up (WorldCover) |
| GET | `/analysis/ranking?year=2026` | อันดับจังหวัดตาม green/person (WHO) |
| GET | `/compare?provinces=A,B&year=2026` | เปรียบเทียบหลายจังหวัด |
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

## ออกแบบ cache (สรุป)

- ทุก endpoint ที่ trigger GEE compute ราคาแพง → check cache ก่อน
- Cache key = `(province, district?, year)` — district nullable
- Stale check ใน `ndvi.py::_is_stale` — invalidate row ที่คำนวณก่อนยุค water mask
- AI Recommend tile URL หมดอายุพร้อม GEE session — มี in-process TTL cache 30 นาที
  (`recommend.py::_TILE_URL_CACHE`) ลดต้นทุน cache hit จาก ~30s → <50ms

## Tests

ยังไม่มี backend test เป้าหมายที่ดี: `_is_stale`, `match_province`, WHO calculation
