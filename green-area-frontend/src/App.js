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

const getNdviColor = (value) => {
  if (value >= 0.6) return '#22c55e';
  if (value >= 0.45) return '#4ade80';
  if (value >= 0.3) return '#86efac';
  return '#bbf7d0';
};

const getNdviLabel = (value) => {
  if (!value) return '—';
  if (value >= 0.6) return 'พืชพรรณหนาแน่นมาก';
  if (value >= 0.45) return 'พืชพรรณหนาแน่น';
  if (value >= 0.3) return 'พืชพรรณปานกลาง';
  return 'พืชพรรณน้อย';
};

function App() {
  const [thailandData, setThailandData]     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [provinceArea, setProvinceArea]     = useState(null);
  const [ndviStats, setNdviStats]           = useState(null);   // ← เพิ่ม
  const [ndviMonthly, setNdviMonthly]       = useState([]);     // ← เพิ่ม
  const [ndviLoading, setNdviLoading]       = useState(false);  // ← เพิ่ม
  const mapRef = useRef(null);
  const selectedLayerRef = useRef(null);

  useEffect(() => {
    fetch('/thailand.json')
      .then((res) => res.json())
      .then((data) => {
        setThailandData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('โหลดข้อมูลไม่สำเร็จ:', err);
        setLoading(false);
      });
  }, []);

  // ← แก้ fetchNDVI ให้ครบ
  const fetchNDVI = async (provinceName) => {
    setNdviLoading(true);
    setNdviStats(null);
    setNdviMonthly([]);
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
    } finally {
      setNdviLoading(false);
    }
  };

  const defaultStyle = {
    color: '#2a4a2a', weight: 1, opacity: 0.8,
    fillColor: '#4ade80', fillOpacity: 0.08,
  };
  const hoverStyle = {
    color: '#4ade80', weight: 1.5,
    fillColor: '#4ade80', fillOpacity: 0.25,
  };
  const selectedStyle = {
    color: '#86efac', weight: 2,
    fillColor: '#4ade80', fillOpacity: 0.45,
  };

  const onEachProvince = (feature, layer) => {
    const name = feature.properties.name || 'ไม่ทราบชื่อ';

    layer.bindTooltip(name, {
      permanent: false, direction: 'center', className: 'province-tooltip',
    });

    layer.on({
      mouseover: (e) => {
        if (selectedLayerRef.current !== e.target) e.target.setStyle(hoverStyle);
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
        if (selectedLayerRef.current) selectedLayerRef.current.setStyle(defaultStyle);
        e.target.setStyle(selectedStyle);
        selectedLayerRef.current = e.target;
        setSelectedProvince(name);

        // คำนวณพื้นที่ด้วย Turf.js
        const areaKm2 = turf.area(feature) / 1_000_000;
        setProvinceArea(areaKm2.toFixed(2));

        // ← เรียก fetchNDVI ตอนคลิก
        fetchNDVI(name);

        if (map) map.fitBounds(e.target.getBounds(), { padding: [40, 40] });
      },
    });
  };

  const handleReset = () => {
    if (selectedLayerRef.current) {
      selectedLayerRef.current.setStyle(defaultStyle);
      selectedLayerRef.current = null;
    }
    setSelectedProvince(null);
    setNdviStats(null);
    setNdviMonthly([]);
    setProvinceArea(null);
    if (mapRef.current) mapRef.current.setView(THAILAND_CENTER, 6);
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <div className="header-dot" />
          <div>
            <div className="header-title">Green Area Analysis</div>
            <div className="header-subtitle">ระบบวิเคราะห์พื้นที่สีเขียว · ประเทศไทย</div>
          </div>
        </div>
        <div className="header-status">
          <span>SRC</span>
          <span className="status-live">SENTINEL-2 · GEE</span>
        </div>
      </header>

      {loading && <div className="loading-bar" />}

      <div className="main-layout">
        <MapContainer
          center={THAILAND_CENTER}
          zoom={6} minZoom={6} maxZoom={18}
          maxBounds={THAILAND_BOUNDS}
          maxBoundsViscosity={1.0}
          className="map-container"
          ref={mapRef}
          doubleClickZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {thailandData && (
            <GeoJSON data={thailandData} style={defaultStyle} onEachFeature={onEachProvince} />
          )}
        </MapContainer>

        {/* Sidebar */}
        <div className="sidebar">
          {!selectedProvince ? (
            <div className="sidebar-empty">
              <div className="sidebar-empty-icon">🛰️</div>
              <div className="sidebar-empty-title">เลือกพื้นที่</div>
              <p className="sidebar-empty-hint">
                คลิกที่จังหวัดบนแผนที่<br />เพื่อดูข้อมูล NDVI<br />และพื้นที่สีเขียว
              </p>
            </div>
          ) : (
            <div className="sidebar-content">

              {/* Province Header */}
              <div className="sidebar-section">
                <div className="province-header">
                  <span className="province-label">Selected Province</span>
                  <div className="province-name">{selectedProvince}</div>
                  <span className="mock-badge">
                    {ndviLoading ? '⏳ กำลังโหลด...' : ndviStats ? '✅ GEE Data' : '⚠ Mock'}
                  </span>
                </div>
              </div>

              {/* NDVI Main */}
              <div className="sidebar-section">
                <div className="ndvi-main">
                  <span className="ndvi-label">NDVI · Annual Average</span>
                  {ndviLoading ? (
                    <p className="ndvi-desc">กำลังดึงข้อมูลจาก GEE...</p>
                  ) : (
                    <>
                      <div className="ndvi-value-row">
                        <span className="ndvi-value">
                          {ndviStats ? ndviStats.ndvi_mean : '—'}
                        </span>
                        <span className="ndvi-desc">
                          {ndviStats ? getNdviLabel(ndviStats.ndvi_mean) : ''}
                        </span>
                      </div>
                      <div className="ndvi-bar-track">
                        <div
                          className="ndvi-bar-fill"
                          style={{ width: `${((ndviStats?.ndvi_mean || 0) * 100).toFixed(0)}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="sidebar-section">
                <div className="stat-grid">
                  <div className="stat-item" style={{ gridColumn: 'span 2' }}>
                    <span className="stat-item-label">พื้นที่จังหวัด (Turf.js)</span>
                    <span className="stat-item-value">
                      {provinceArea ? `${Number(provinceArea).toLocaleString()} km²` : '—'}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-item-label">NDVI Min</span>
                    <span className="stat-item-value">
                      {ndviStats ? ndviStats.ndvi_min : '—'}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-item-label">NDVI Max</span>
                    <span className="stat-item-value">
                      {ndviStats ? ndviStats.ndvi_max : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="sidebar-section">
                <div className="chart-header">NDVI · Monthly Trend</div>
                {ndviLoading ? (
                  <p className="data-note">กำลังคำนวณ NDVI รายเดือน...</p>
                ) : ndviMonthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={ndviMonthly} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#3a5c3a', fontSize: 9, fontFamily: 'DM Mono' }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        domain={[0, 1]}
                        tick={{ fill: '#3a5c3a', fontSize: 9, fontFamily: 'DM Mono' }}
                        axisLine={false} tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0d160d', border: '1px solid #1a2e1a',
                          borderRadius: '6px', color: '#4ade80',
                          fontSize: '11px', fontFamily: 'DM Mono',
                        }}
                        formatter={(value) => [value?.toFixed(3), 'NDVI']}
                        cursor={{ fill: 'rgba(74,222,128,0.05)' }}
                      />
                      <Bar dataKey="ndvi" radius={[2, 2, 0, 0]}>
                        {ndviMonthly.map((entry, i) => (
                          <Cell key={i} fill={getNdviColor(entry.ndvi)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="data-note">ไม่มีข้อมูลรายเดือน</p>
                )}
              </div>

              {/* Note */}
              <div className="sidebar-section">
                <p className="data-note">
                  {ndviStats
                    ? '* ข้อมูลจาก Sentinel-2\nผ่าน Google Earth Engine'
                    : '* กำลังรอข้อมูลจาก GEE'}
                </p>
              </div>

              {/* Reset */}
              <div className="sidebar-section">
                <button className="reset-btn" onClick={handleReset}>
                  ← กลับดูทั้งประเทศ
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;