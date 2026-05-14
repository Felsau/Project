# Green Area Analysis · Thailand

แดชบอร์ดวิเคราะห์พื้นที่สีเขียวของประเทศไทย ดึงข้อมูลจาก Google Earth Engine
แล้วประมวลผล NDVI / LST / Urban-subset + แนะนำพื้นที่ที่ควรปลูกต้นไม้ (AI Recommend)

วิทยานิพนธ์ระดับปริญญาตรี · นักศึกษา **Felsau**

---

## Architecture

```
┌──────────────────┐        ┌────────────────┐        ┌──────────────────┐
│  React 19 + Deck │  HTTP  │  FastAPI       │  REST  │  Google Earth    │
│  GL + MapLibre   │ <────> │  (uvicorn)     │ <────> │  Engine          │
└──────────────────┘        └───────┬────────┘        └──────────────────┘
                                    │
                                    │ supabase-py
                                    ▼
                            ┌────────────────┐
                            │  Supabase      │  (Postgres + Storage)
                            │  cache 11 ตาราง │
                            └────────────────┘
```

- **Frontend** ([green-area-frontend/](green-area-frontend/)) — React 19, DeckGL 3D extrusion, MapLibre GL, jsPDF + html2canvas รายงาน
- **Backend** ([green-area-backend/](green-area-backend/)) — FastAPI, supabase-py, earthengine-api, matplotlib (thumbnails)
- **Cache** — ตาราง Supabase 11 ตาราง (ดู [migrations/000_initial_schema.sql](green-area-backend/migrations/000_initial_schema.sql)) เพื่อหลีกเลี่ยง GEE compute ซ้ำซ้อน

---

## Quick start

### 1) Supabase setup
- สร้าง project ใหม่ใน https://supabase.com
- เปิด SQL Editor รัน migration ตามลำดับ:
  - `green-area-backend/migrations/000_initial_schema.sql` (สร้างตารางทั้งหมด)
  - `001_add_dense_area_columns.sql` (เพิ่ม column dense forest)
  - `002_constraints_and_cache_meta.sql` (CHECK constraints + cache_version/expires_at + index)
- เอา `URL` และ `service_role` key จากหน้า Project Settings → API

### 2) Backend
```powershell
cd green-area-backend
python -m venv venv
venv\Scripts\activate          # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt

# สร้าง .env (ดูตัวอย่างใน .env.example)
copy .env.example .env
# แก้ค่า SUPABASE_URL, SUPABASE_KEY, GEE_PROJECT, ADMIN_TOKEN

# โหลด GEE credentials (ทำครั้งเดียว)
earthengine authenticate

# Generate ขอบเขตอำเภอ (ทำครั้งเดียว — สร้าง thailand_districts.json)
python generate_districts.py

# Run
uvicorn main:app --reload
# → http://localhost:8000/docs (Swagger)
```

### 3) Frontend
```powershell
cd green-area-frontend
npm install
npm start
# → http://localhost:3000
```

---

## Environment variables (backend `.env`)

| Variable | จำเป็น | อธิบาย |
|---|---|---|
| `SUPABASE_URL` | ✅ | URL ของ Supabase project |
| `SUPABASE_KEY` | ✅ | `service_role` key (ไม่ใช่ `anon`) |
| `GEE_PROJECT` | ✅ | Google Cloud project ที่เปิดใช้ Earth Engine |
| `ADMIN_TOKEN` | ⚠️ | ใช้ลบ cache (`DELETE /cache`) — ถ้าไม่ตั้ง endpoint จะถูก reject |
| `ALLOWED_ORIGINS` | ⚠️ | CORS origin (default = `http://localhost:3000`) — production ต้องใส่ URL ของ Vercel/Render |
| `LOG_LEVEL` | – | `INFO` (default), `DEBUG`, `WARNING` |

---

## โครงสร้างที่สำคัญ

```
green-area-backend/
  main.py                  # FastAPI app + logging config + endpoint /compare /cache /ranking
  dependencies.py          # Supabase client, geometry loader, retry-on-disconnect
  gee_utils.py             # cloud mask, LST collection, reduce helpers
  generate_districts.py    # one-time: สร้าง thailand_districts.json
  migrations/              # SQL schema สำหรับ Supabase
  routers/
    ndvi.py                # /ndvi · /ndvi/{p}/monthly · district variants
    lst.py                 # /lst · LST annual + monthly
    maps.py                # /map/* · thumbnails + urban subset
    recommend.py           # /recommend · AI priority heatmap

green-area-frontend/
  src/
    App.js                 # entry + DeckGL setup
    constants.js           # API_BASE, CURRENT_YEAR, PROVINCE_TH, etc.
    components/            # AppHeader, Sidebar, MapTooltip, Toast
    hooks/                 # useNdviCache, useProvinceData, useDistrictData, ...
    utils/                 # mapLayers, exportUtils (PDF), toast (pub/sub)
  public/
    thailand.json          # ขอบเขตจังหวัด (GADM 4.1)
    thailand_districts.json # ขอบเขตอำเภอ — generate ด้วย generate_districts.py
```

---

## Tests

```powershell
cd green-area-frontend
npm test -- --watchAll=false
```

Frontend test suite ตอนนี้คุม smoke render + sidebar empty state เท่านั้น
(`src/App.test.js`) Backend ยังไม่มี test — เป็น future work

---

## Deploy notes

- **Frontend** → Vercel/Netlify (CRA static)
- **Backend** → Render/Railway (Python web service)
  - Build: `pip install -r requirements.txt`
  - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- ตั้ง `ALLOWED_ORIGINS` ให้ตรงกับ frontend URL
- คั่น `thailand.json` กับ `thailand_districts.json` ระหว่าง 2 service — backend จะหาตามลำดับ:
  1. ENV `THAILAND_GEOJSON_PATH` / `DISTRICTS_GEOJSON_PATH` (override)
  2. `green-area-backend/data/` (production — copy 2 ไฟล์เข้า image)
  3. `../green-area-frontend/public/` (legacy dev-local แบบ monorepo)
