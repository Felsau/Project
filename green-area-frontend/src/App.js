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
      {/* ส่วนหัวของแอป สไตล์ GEE (สีขาว-เทา) */}
      <header className="app-header App-title">
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div className="header-title" style={{ fontSize: '1.2rem', fontWeight: '500', color: '#202124' }}>
              Green Area Analysis
            </div>
            <div className="header-subtitle" style={{ fontSize: '0.85rem', color: '#5f6368' }}>
              ระบบวิเคราะห์พื้นที่สีเขียว · ประเทศไทย
            </div>
          </div>
        </div>
        <div className="header-status" style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', color: '#5f6368' }}>
          <span>SRC</span>
          <span className="status-live mock-badge" style={{ backgroundColor: '#e8f0fe', color: '#1a73e8', border: 'none', fontWeight: '500' }}>
            SENTINEL-2 · GEE
          </span>
        </div>
      </header>

      {loading && <div className="loading-bar" style={{ height: '3px', backgroundColor: '#1a73e8', width: '100%', animation: 'loading 2s infinite' }} />}

      <div className="main-layout">
        
        {/* เลื่อน Sidebar ขึ้นมาอยู่ด้านบนในโค้ด เพื่อให้อยู่ฝั่งซ้ายมือตาม CSS */}
        <aside className="sidebar">
          {!selectedProvince ? (
            <div className="sidebar-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: '#5f6368' }}>
              <div className="sidebar-empty-icon" style={{ fontSize: '2rem', marginBottom: '12px' }}>🛰️</div>
              <div className="sidebar-empty-title" style={{ fontSize: '1.1rem', fontWeight: '500', color: '#202124', marginBottom: '8px' }}>เลือกพื้นที่</div>
              <p className="sidebar-empty-hint" style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                คลิกที่จังหวัดบนแผนที่<br />เพื่อดูข้อมูล NDVI<br />และพื้นที่สีเขียว
              </p>
            </div>
          ) : (
            <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Province Header */}
              <div className="sidebar-header">
                <div>
                  <span className="sidebar-title">Selected Province</span>
                  <div className="sidebar-province">{selectedProvince}</div>
                </div>
                <span className="mock-badge" style={ndviStats ? { backgroundColor: '#e6f4ea', color: '#137333', borderColor: '#ceead6' } : {}}>
                  {ndviLoading ? '⏳ Loading...' : ndviStats ? '✅ GEE Data' : '⚠ Mock'}
                </span>
              </div>

              {/* NDVI Main Card */}
              <div className="stat-card">
                <div className="stat-label">NDVI · Annual Average</div>
                {ndviLoading ? (
                  <p className="stat-desc">กำลังดึงข้อมูลจาก GEE...</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span className="stat-value">
                        {ndviStats ? ndviStats.ndvi_mean : '—'}
                      </span>
                      <span className="stat-desc">
                        {ndviStats ? getNdviLabel(ndviStats.ndvi_mean) : ''}
                      </span>
                    </div>
                    {/* แถบ Progress Bar สว่างๆ */}
                    <div className="ndvi-bar-track" style={{ height: '6px', backgroundColor: '#f1f3f4', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                      <div
                        className="ndvi-bar-fill"
                        style={{ 
                          height: '100%', 
                          backgroundColor: '#1e8e3e', 
                          width: `${((ndviStats?.ndvi_mean || 0) * 100).toFixed(0)}%`,
                          transition: 'width 0.5s ease'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Stats Grid */}
              <div className="stat-row" style={{ flexWrap: 'wrap' }}>
                <div className="stat-card-sm" style={{ flexBasis: '100%' }}>
                  <div className="stat-label">พื้นที่จังหวัด (Turf.js)</div>
                  <div className="stat-value-sm" style={{ color: '#202124' }}>
                    {provinceArea ? `${Number(provinceArea).toLocaleString()} km²` : '—'}
                  </div>
                </div>
                <div className="stat-card-sm">
                  <div className="stat-label">NDVI Min</div>
                  <div className="stat-value-sm" style={{ color: '#d93025' }}>
                    {ndviStats ? ndviStats.ndvi_min : '—'}
                  </div>
                </div>
                <div className="stat-card-sm">
                  <div className="stat-label">NDVI Max</div>
                  <div className="stat-value-sm">
                    {ndviStats ? ndviStats.ndvi_max : '—'}
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="chart-section">
                <div className="chart-title">NDVI · Monthly Trend</div>
                {ndviLoading ? (
                  <p className="data-note">กำลังคำนวณ NDVI รายเดือน...</p>
                ) : ndviMonthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={ndviMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#5f6368', fontSize: 10 }}
                        axisLine={{ stroke: '#dadce0' }} tickLine={false}
                      />
                      <YAxis
                        domain={[0, 1]}
                        tick={{ fill: '#5f6368', fontSize: 10 }}
                        axisLine={{ stroke: '#dadce0' }} tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff', border: '1px solid #dadce0',
                          borderRadius: '4px', color: '#202124',
                          fontSize: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value) => [value?.toFixed(3), 'NDVI']}
                        cursor={{ fill: '#f1f3f4' }}
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
                
                <p className="data-note" style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f3f4' }}>
                  {ndviStats
                    ? '* ข้อมูลจาก Sentinel-2 ผ่าน Google Earth Engine'
                    : '* กำลังรอข้อมูลจาก GEE'}
                </p>
              </div>

              {/* Reset Button */}
              <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                <button className="reset-btn" onClick={handleReset}>
                  ← กลับดูทั้งประเทศ
                </button>
              </div>

            </div>
          )}
        </aside>

        {/* แผนที่ย้ายมาอยู่ด้านล่างในโค้ด เพื่อให้อยู่ฝั่งขวามือ */}
        <MapContainer
          center={THAILAND_CENTER}
          zoom={6} minZoom={6} maxZoom={18}
          maxBounds={THAILAND_BOUNDS}
          maxBoundsViscosity={1.0}
          className="map-container"
          ref={mapRef}
          doubleClickZoom={false}
          style={{ backgroundColor: '#e3e6e8' }} // ป้องกันแผนที่ดำตอนโหลด
        >
          {/* แนะนำให้เปลี่ยน TileLayer เป็นแบบสว่างเพื่อให้เข้ากับ UI นะครับ */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {thailandData && (
            <GeoJSON data={thailandData} style={defaultStyle} onEachFeature={onEachProvince} />
          )}
        </MapContainer>

      </div>
    </div>
  );
}

export default App;
