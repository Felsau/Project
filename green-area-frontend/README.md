# Green Area Frontend

React 19 + DeckGL + MapLibre — แผนที่ 3D extrusion ของพื้นที่สีเขียวประเทศไทย

ดู [../README.md](../README.md) สำหรับ architecture และ setup ทั้งหมด — ไฟล์นี้เก็บเฉพาะ
รายละเอียดเฉพาะ frontend

## Scripts

```powershell
npm start         # dev server → http://localhost:3000
npm run build     # production bundle → build/
npm test -- --watchAll=false   # run test suite once
```

## โครงสร้าง

```
src/
  App.js                # entry — DeckGL setup + state composition
  App.test.js           # smoke test (renders + sidebar empty state)
  constants.js          # API_BASE, CURRENT_YEAR, PROVINCE_TH, MAP_STYLE
  setupTests.js         # jest-dom + TextEncoder polyfill + fetch mock
  components/
    AppHeader.js
    Sidebar.js          # tabs: stats / trend / compare / ranking / recommend
    MapTooltip.js
    Toast.js            # global error/info toast (pub/sub)
  hooks/
    useNdviCache.js     # โหลด /cache ตอน mount
    useProvinceData.js  # NDVI + LST ระดับจังหวัด
    useDistrictData.js  # NDVI + LST ระดับอำเภอ + ขอบเขตอำเภอ
    useTrendData.js     # trend หลายปี
    useCompareData.js   # เปรียบเทียบหลายจังหวัด
    useRankingData.js   # อันดับ WHO 9 m²/คน
    useRecommendData.js # AI heatmap + top spots + year picker
  utils/
    mapLayers.js        # buildMapLayers() — สร้าง DeckGL layers
    exportUtils.js      # PDF report (jsPDF + html2canvas + Sarabun TTF)
    toast.js            # pub/sub emitter
```

## Environment

- `REACT_APP_API_URL` (optional) — backend URL · default `http://localhost:8000`

## Error handling

ทุก hook ที่ fetch จะ `pushError(msg)` เมื่อ catch — `<Toast />` ใน App.js แสดง
top-right (auto-dismiss 5s)
