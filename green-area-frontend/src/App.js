import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import 'leaflet/dist/leaflet.css';
import './App.css';
import * as turf from '@turf/turf';

const THAILAND_CENTER = [13.0, 101.0];
const THAILAND_BOUNDS = [
  [5.5, 97.5],
  [20.5, 105.7],
];

// Mock NDVI รายเดือน (ค่าจริงจะดึงจาก Google Earth Engine ภายหลัง)
const MOCK_NDVI_MONTHLY = [
  { month: 'ม.ค.', ndvi: 0.42 },
  { month: 'ก.พ.', ndvi: 0.38 },
  { month: 'มี.ค.', ndvi: 0.35 },
  { month: 'เม.ย.', ndvi: 0.33 },
  { month: 'พ.ค.', ndvi: 0.48 },
  { month: 'มิ.ย.', ndvi: 0.61 },
  { month: 'ก.ค.', ndvi: 0.68 },
  { month: 'ส.ค.', ndvi: 0.72 },
  { month: 'ก.ย.', ndvi: 0.70 },
  { month: 'ต.ค.', ndvi: 0.65 },
  { month: 'พ.ย.', ndvi: 0.55 },
  { month: 'ธ.ค.', ndvi: 0.46 },
];

// Mock สถิติพื้นที่สีเขียว
const MOCK_STATS = {
  ndvi_avg: 0.53,
  green_area_percent: 61.4,
  forest_area_km2: 4823,
  urban_area_km2: 312,
};

// สีของ bar ตามค่า NDVI
const getNdviColor = (value) => {
  if (value >= 0.6) return '#22c55e';
  if (value >= 0.45) return '#4ade80';
  if (value >= 0.3) return '#86efac';
  return '#bbf7d0';
};

// แปลค่า NDVI เป็นคำอธิบาย
const getNdviLabel = (value) => {
  if (value >= 0.6) return 'พืชพรรณหนาแน่นมาก';
  if (value >= 0.45) return 'พืชพรรณหนาแน่น';
  if (value >= 0.3) return 'พืชพรรณปานกลาง';
  return 'พืชพรรณน้อย';
};

function App() {
  const [thailandData, setThailandData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [provinceArea, setProvinceArea] = useState(null); // ← เพิ่ม
  const mapRef = useRef(null);
  const selectedLayerRef = useRef(null);

  const fetchNDVI = async (provinceName) => {
  try {
    const [statsRes, monthlyRes] = await Promise.all([
      fetch(`http://localhost:8000/ndvi/${provinceName}`),
      fetch(`http://localhost:8000/ndvi/${provinceName}/monthly`)
    ]);
    const stats = await statsRes.json();
    const monthly = await monthlyRes.json();
    setNdviStats(stats);
    setNdviMonthly(monthly.monthly.filter(m => m.ndvi !== null));
  } catch (err) {
    console.error('ดึงข้อมูล NDVI ไม่สำเร็จ:', err);
  }
  };

  const defaultStyle = {
    color: '#4ade80',
    weight: 1.5,
    opacity: 1,
    fillColor: '#4ade80',
    fillOpacity: 0.15,
  };

  const hoverStyle = {
    color: '#4ade80',
    weight: 2.5,
    fillOpacity: 0.35,
  };

  const selectedStyle = {
    color: '#ffffff',
    weight: 3,
    fillColor: '#4ade80',
    fillOpacity: 0.6,
  };

  const onEachProvince = (feature, layer) => {
    const name = feature.properties.name || 'ไม่ทราบชื่อ';

    layer.bindTooltip(name, {
      permanent: false,
      direction: 'center',
      className: 'province-tooltip',
    });

    layer.on({
      mouseover: (e) => {
        if (selectedLayerRef.current !== e.target) {
          e.target.setStyle(hoverStyle);
        }
      },
      mouseout: (e) => {
        if (selectedLayerRef.current !== e.target) {
          e.target.setStyle(defaultStyle);
        } else {
          e.target.setStyle(selectedStyle);
        }
      },
      click: (e) => {
  const map = mapRef.current;
        if (selectedLayerRef.current === e.target) return;
        if (selectedLayerRef.current) {
          selectedLayerRef.current.setStyle(defaultStyle);
        }
        e.target.setStyle(selectedStyle);
        selectedLayerRef.current = e.target;
        setSelectedProvince(name);

        // ← เพิ่มส่วนนี้ — คำนวณพื้นที่จังหวัดด้วย Turf.js
        const areaKm2 = turf.area(feature) / 1_000_000; // แปลง m² → km²
        setProvinceArea(areaKm2.toFixed(2));

        if (map) {
          map.fitBounds(e.target.getBounds(), { padding: [40, 40] });
        }
      },
    });
  };

  const handleReset = () => {
    if (selectedLayerRef.current) {
      selectedLayerRef.current.setStyle(defaultStyle);
      selectedLayerRef.current = null;
    }
    setSelectedProvince(null);
    if (mapRef.current) {
      mapRef.current.setView(THAILAND_CENTER, 6);
    }
  };

  return (
    <div className="App">
      <h1 className="App-title">🌿 ระบบวิเคราะห์พื้นที่สีเขียว — ประเทศไทย</h1>
      {loading && <p className="loading-text">กำลังโหลดข้อมูล...</p>}

      <div className="stat-grid">
  {/* ← เพิ่ม card นี้ */}
  <div className="stat-item" style={{ gridColumn: 'span 2' }}>
    <span className="stat-item-label">พื้นที่จังหวัด (จาก GeoJSON)</span>
    <span className="stat-item-value">
      {provinceArea ? `${Number(provinceArea).toLocaleString()} km²` : '—'}
    </span>
    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
      คำนวณด้วย Turf.js · ข้อมูลจริง
    </span>
  </div>

  <div className="stat-item">
    <span className="stat-item-label">พื้นที่สีเขียว</span>
    <span className="stat-item-value">{MOCK_STATS.green_area_percent}%</span>
  </div>
  <div className="stat-item">
    <span className="stat-item-label">ป่าไม้ (mock)</span>
    <span className="stat-item-value">{MOCK_STATS.forest_area_km2.toLocaleString()} km²</span>
  </div>
  <div className="stat-item">
    <span className="stat-item-label">พื้นที่เมือง (mock)</span>
    <span className="stat-item-value">{MOCK_STATS.urban_area_km2} km²</span>
  </div>
  <div className="stat-item">
    <span className="stat-item-label">ปี</span>
    <span className="stat-item-value">2024</span>
  </div>
</div>

      <div className="main-layout">
        <MapContainer
          center={THAILAND_CENTER}
          zoom={6}
          minZoom={6}
          maxZoom={18}
          maxBounds={THAILAND_BOUNDS}
          maxBoundsViscosity={1.0}
          className="map-container"
          ref={mapRef}
          doubleClickZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {thailandData && (
            <GeoJSON
              data={thailandData}
              style={defaultStyle}
              onEachFeature={onEachProvince}
            />
          )}
        </MapContainer>

        {/* Sidebar */}
        <div className="sidebar">
          {selectedProvince ? (
            <>
              <div className="sidebar-header">
                <h2 className="sidebar-title">📍 {selectedProvince}</h2>
                <span className="mock-badge">Mock Data</span>
              </div>

              {/* ค่า NDVI เฉลี่ย */}
              <div className="stat-card">
                <p className="stat-label">ค่า NDVI เฉลี่ยรายปี</p>
                <p className="stat-value">{MOCK_STATS.ndvi_avg}</p>
                <p className="stat-desc">{getNdviLabel(MOCK_STATS.ndvi_avg)}</p>
              </div>

              {/* สถิติพื้นที่ */}
              <div className="stat-row">
                <div className="stat-card-sm">
                  <p className="stat-label">พื้นที่สีเขียว</p>
                  <p className="stat-value-sm">{MOCK_STATS.green_area_percent}%</p>
                </div>
                <div className="stat-card-sm">
                  <p className="stat-label">ป่าไม้</p>
                  <p className="stat-value-sm">{MOCK_STATS.forest_area_km2.toLocaleString()} km²</p>
                </div>
              </div>

              {/* กราฟ NDVI รายเดือน */}
              <div className="chart-section">
                <p className="chart-title">📊 NDVI รายเดือน</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={MOCK_NDVI_MONTHLY} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#7a9e7e', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 1]}
                      tick={{ fill: '#7a9e7e', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111811',
                        border: '1px solid #1e2e1e',
                        borderRadius: '6px',
                        color: '#4ade80',
                        fontSize: '12px',
                      }}
                      formatter={(value) => [value.toFixed(2), 'NDVI']}
                    />
                    <Bar dataKey="ndvi" radius={[3, 3, 0, 0]}>
                      {MOCK_NDVI_MONTHLY.map((entry, index) => (
                        <Cell key={index} fill={getNdviColor(entry.ndvi)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="data-note">
                * ข้อมูลจำลอง ค่าจริงจะดึงจาก<br />Sentinel-2 ผ่าน Google Earth Engine
              </p>

              <button className="reset-btn" onClick={handleReset}>
                ← กลับดูทั้งประเทศ
              </button>
            </>
          ) : (
            <>
              <h2 className="sidebar-title">📍 เลือกจังหวัด</h2>
              <p className="sidebar-hint">
                คลิกที่จังหวัดบนแผนที่<br />เพื่อดูข้อมูลพื้นที่สีเขียว
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;