import { useEffect, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './App.css';
import * as turf from '@turf/turf';

const PROVINCE_TH = {
  "Amnat Charoen": "อำนาจเจริญ", "Ang Thong": "อ่างทอง",
  "Bangkok": "กรุงเทพมหานคร", "Bueng Kan": "บึงกาฬ",
  "Buri Ram": "บุรีรัมย์", "Chachoengsao": "ฉะเชิงเทรา",
  "Chai Nat": "ชัยนาท", "Chaiyaphum": "ชัยภูมิ",
  "Chanthaburi": "จันทบุรี", "Chiang Mai": "เชียงใหม่",
  "Chiang Rai": "เชียงราย", "Chon Buri": "ชลบุรี",
  "Chumphon": "ชุมพร", "Kalasin": "กาฬสินธุ์",
  "Kamphaeng Phet": "กำแพงเพชร", "Kanchanaburi": "กาญจนบุรี",
  "Khon Kaen": "ขอนแก่น", "Krabi": "กระบี่",
  "Lampang": "ลำปาง", "Lamphun": "ลำพูน",
  "Loei": "เลย", "Lop Buri": "ลพบุรี",
  "Mae Hong Son": "แม่ฮ่องสอน", "Maha Sarakham": "มหาสารคาม",
  "Mukdahan": "มุกดาหาร", "Nakhon Nayok": "นครนายก",
  "Nakhon Pathom": "นครปฐม", "Nakhon Phanom": "นครพนม",
  "Nakhon Ratchasima": "นครราชสีมา", "Nakhon Sawan": "นครสวรรค์",
  "Nakhon Si Thammarat": "นครศรีธรรมราช", "Nan": "น่าน",
  "Narathiwat": "นราธิวาส", "Nong Bua Lam Phu": "หนองบัวลำภู",
  "Nong Khai": "หนองคาย", "Nonthaburi": "นนทบุรี",
  "Pathum Thani": "ปทุมธานี", "Pattani": "ปัตตานี",
  "Phangnga": "พังงา", "Phatthalung": "พัทลุง",
  "Phayao": "พะเยา", "Phetchabun": "เพชรบูรณ์",
  "Phetchaburi": "เพชรบุรี", "Phichit": "พิจิตร",
  "Phitsanulok": "พิษณุโลก", "Phra Nakhon Si Ayutthaya": "พระนครศรีอยุธยา",
  "Phrae": "แพร่", "Phuket": "ภูเก็ต",
  "Prachin Buri": "ปราจีนบุรี", "Prachuap Khiri Khan": "ประจวบคีรีขันธ์",
  "Ranong": "ระนอง", "Ratchaburi": "ราชบุรี",
  "Rayong": "ระยอง", "Roi Et": "ร้อยเอ็ด",
  "Sa Kaeo": "สระแก้ว", "Sakon Nakhon": "สกลนคร",
  "Samut Prakan": "สมุทรปราการ", "Samut Sakhon": "สมุทรสาคร",
  "Samut Songkhram": "สมุทรสงคราม", "Sara Buri": "สระบุรี",
  "Satun": "สตูล", "Si Sa Ket": "ศรีสะเกษ",
  "Sing Buri": "สิงห์บุรี", "Songkhla": "สงขลา",
  "Sukhothai": "สุโขทัย", "Suphan Buri": "สุพรรณบุรี",
  "Surat Thani": "สุราษฎร์ธานี", "Surin": "สุรินทร์",
  "Tak": "ตาก", "Trang": "ตรัง",
  "Trat": "ตราด", "Ubon Ratchathani": "อุบลราชธานี",
  "Udon Thani": "อุดรธานี", "Uthai Thani": "อุทัยธานี",
  "Uttaradit": "อุตรดิตถ์", "Yala": "ยะลา",
  "Yasothon": "ยโสธร",
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const INITIAL_VIEW_STATE = {
  longitude: 101.0,
  latitude: 13.0,
  zoom: 5.5,
  pitch: 25,
  bearing: 0,
};

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

const getNdviRgba = (value, alpha = 200) => {
  if (!value) return [200, 230, 200, 120];
  if (value >= 0.6) return [34, 197, 94, alpha];
  if (value >= 0.45) return [74, 222, 128, alpha];
  if (value >= 0.3) return [134, 239, 172, alpha];
  return [187, 247, 208, alpha];
};

function App() {
  const [thailandData, setThailandData]         = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedProvinceEN, setSelectedProvinceEN] = useState(null);
  const [provinceArea, setProvinceArea]         = useState(null);
  const [ndviStats, setNdviStats]               = useState(null);
  const [ndviMonthly, setNdviMonthly]           = useState([]);
  const [ndviLoading, setNdviLoading]           = useState(false);
  const [ndviCache, setNdviCache]               = useState({});
  const [viewState, setViewState]               = useState(INITIAL_VIEW_STATE);
  const [tooltip, setTooltip]                   = useState(null);

  useEffect(() => {
    fetch('/thailand.json')
      .then(r => r.json())
      .then(data => { setThailandData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Pre-populate extrusion heights from cached NDVI in Supabase
  useEffect(() => {
    fetch('http://localhost:8000/cache')
      .then(r => r.json())
      .then(data => {
        const cache = {};
        data.annual?.forEach(row => { cache[row.province] = row.ndvi_mean; });
        setNdviCache(cache);
      })
      .catch(() => {});
  }, []);

  const fetchNDVI = async (provinceName) => {
    setNdviLoading(true);
    setNdviStats(null);
    setNdviMonthly([]);
    try {
      const [statsRes, monthlyRes] = await Promise.all([
        fetch(`http://localhost:8000/ndvi/${provinceName}`),
        fetch(`http://localhost:8000/ndvi/${provinceName}/monthly`),
      ]);
      const stats   = await statsRes.json();
      const monthly = await monthlyRes.json();
      setNdviStats(stats);
      setNdviMonthly(monthly.monthly.filter(m => m.ndvi !== null));
      if (stats.ndvi_mean) {
        setNdviCache(prev => ({ ...prev, [provinceName]: stats.ndvi_mean }));
      }
    } catch (err) {
      console.error('ดึงข้อมูล NDVI ไม่สำเร็จ:', err);
    } finally {
      setNdviLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedProvince(null);
    setSelectedProvinceEN(null);
    setNdviStats(null);
    setNdviMonthly([]);
    setProvinceArea(null);
    setViewState({
      ...INITIAL_VIEW_STATE,
      transitionDuration: 800,
      transitionInterpolator: new FlyToInterpolator(),
    });
  };

  const layers = thailandData ? [
    new GeoJsonLayer({
      id: 'thailand-provinces',
      data: thailandData,
      extruded: true,
      wireframe: false,
      getElevation: (f) => {
        const ndvi = ndviCache[f.properties.name];
        return ndvi ? ndvi * 30000 : 0;
      },
      getFillColor: (f) => {
        if (f.properties.name === selectedProvinceEN) return [26, 115, 232, 230];
        return getNdviRgba(ndviCache[f.properties.name], 200);
      },
      getLineColor: [42, 74, 42, 160],
      lineWidthMinPixels: 1,
      pickable: true,
      autoHighlight: true,
      highlightColor: [26, 115, 232, 80],
      onClick: ({ object }) => {
        if (!object) return;
        const nameEN = object.properties.name;
        const nameTH = PROVINCE_TH[nameEN] || nameEN;

        setSelectedProvince(nameTH);
        setSelectedProvinceEN(nameEN);
        setProvinceArea((turf.area(object) / 1_000_000).toFixed(2));
        fetchNDVI(nameEN);

        const [minLng, minLat, maxLng, maxLat] = turf.bbox(object);
        const maxSpan = Math.max(maxLng - minLng, maxLat - minLat);
        const zoom = Math.min(10, Math.max(6, Math.log2(4 / maxSpan) + 7));

        setViewState({
          longitude: (minLng + maxLng) / 2,
          latitude:  (minLat + maxLat) / 2,
          zoom,
          pitch: 40,
          bearing: 0,
          transitionDuration: 800,
          transitionInterpolator: new FlyToInterpolator(),
        });
      },
      onHover: ({ object, x, y }) => {
        setTooltip(object ? {
          x, y,
          nameTH: PROVINCE_TH[object.properties.name] || object.properties.name,
          nameEN: object.properties.name,
          ndvi:   ndviCache[object.properties.name],
        } : null);
      },
      updateTriggers: {
        getElevation: ndviCache,
        getFillColor: [ndviCache, selectedProvinceEN],
      },
    }),
  ] : [];

  return (
    <div className="App">
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
          <span className="mock-badge" style={{ backgroundColor: '#e8f0fe', color: '#1a73e8', border: 'none', fontWeight: '500' }}>
            SENTINEL-2 · GEE · 3D
          </span>
        </div>
      </header>

      {loading && (
        <div className="loading-bar" style={{ height: '3px', backgroundColor: '#1a73e8', width: '100%', animation: 'loading 2s infinite' }} />
      )}

      <div className="main-layout">
        <aside className="sidebar">
          {!selectedProvince ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: '#5f6368' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🛰️</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '500', color: '#202124', marginBottom: '8px' }}>เลือกพื้นที่</div>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                คลิกที่จังหวัดบนแผนที่<br />เพื่อดูข้อมูล NDVI<br />และพื้นที่สีเขียว
              </p>
              {Object.keys(ndviCache).length > 0 && (
                <p style={{ fontSize: '0.75rem', color: '#1a73e8', marginTop: '16px', fontWeight: '500' }}>
                  ✅ โหลด {Object.keys(ndviCache).length} จังหวัดจาก cache<br />ความสูง 3D พร้อมแสดงแล้ว
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div className="sidebar-header">
                <div>
                  <span className="sidebar-title">Selected Province</span>
                  <div className="sidebar-province">{selectedProvince}</div>
                </div>
                <span className="mock-badge" style={ndviStats ? { backgroundColor: '#e6f4ea', color: '#137333', borderColor: '#ceead6' } : {}}>
                  {ndviLoading ? '⏳ Loading...' : ndviStats ? '✅ GEE Data' : '⚠ Mock'}
                </span>
              </div>

              <div className="stat-card">
                <div className="stat-label">NDVI · Annual Average</div>
                {ndviLoading ? (
                  <p className="stat-desc">กำลังดึงข้อมูลจาก GEE...</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span className="stat-value">{ndviStats ? ndviStats.ndvi_mean : '—'}</span>
                      <span className="stat-desc">{ndviStats ? getNdviLabel(ndviStats.ndvi_mean) : ''}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#f1f3f4', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        backgroundColor: '#1e8e3e',
                        width: `${((ndviStats?.ndvi_mean || 0) * 100).toFixed(0)}%`,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </>
                )}
              </div>

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
                    <span className="stat-item-value">{ndviStats?.ndvi_min ?? '—'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-item-label">NDVI Max</span>
                    <span className="stat-item-value">{ndviStats?.ndvi_max ?? '—'}</span>
                  </div>
                  <div className="stat-item" style={{ gridColumn: 'span 2', borderColor: '#2a4a2a' }}>
                    <span className="stat-item-label">🌿 พื้นที่สีเขียว (NDVI &gt; 0.3)</span>
                    <span className="stat-item-value" style={{ fontSize: '1.3rem' }}>
                      {ndviStats?.green_area_pct != null
                        ? `${ndviStats.green_area_pct}%`
                        : ndviLoading ? '...' : '—'}
                    </span>
                    {ndviStats?.green_area_km2 != null && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {ndviStats.green_area_km2.toLocaleString()} km²
                      </span>
                    )}
                  </div>
                  {ndviStats?.who_status && (
                    <div className="stat-item" style={{
                      gridColumn: 'span 2',
                      borderColor: ndviStats.who_status.includes('ผ่าน') ? '#22c55e' : '#f59e0b',
                    }}>
                      <span className="stat-item-label">มาตรฐาน WHO (9 m²/คน)</span>
                      <span style={{
                        fontSize: '0.8rem',
                        color: ndviStats.who_status.includes('ผ่าน') ? '#4ade80' : '#fbbf24',
                        fontWeight: 'bold',
                      }}>
                        {ndviStats.who_status}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="chart-section">
                <div className="chart-title">NDVI · Monthly Trend</div>
                {ndviLoading ? (
                  <p className="data-note">กำลังคำนวณ NDVI รายเดือน...</p>
                ) : ndviMonthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={ndviMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fill: '#5f6368', fontSize: 10 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                      <YAxis domain={[0, 1]} tick={{ fill: '#5f6368', fontSize: 10 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #dadce0', borderRadius: '4px', color: '#202124', fontSize: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
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
                  {ndviStats ? '* ข้อมูลจาก Sentinel-2 ผ่าน Google Earth Engine' : '* กำลังรอข้อมูลจาก GEE'}
                </p>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                <button className="reset-btn" onClick={handleReset}>← กลับดูทั้งประเทศ</button>
              </div>

            </div>
          )}
        </aside>

        <div className="map-container">
          <DeckGL
            viewState={viewState}
            onViewStateChange={({ viewState: vs }) => setViewState(vs)}
            controller={true}
            layers={layers}
            getCursor={({ isHovering }) => isHovering ? 'pointer' : 'default'}
          >
            <Map mapStyle={MAP_STYLE} />
          </DeckGL>

          {tooltip && (
            <div style={{
              position: 'absolute',
              left: tooltip.x + 12,
              top: tooltip.y - 44,
              background: 'rgba(255,255,255,0.97)',
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid #dadce0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              fontSize: '0.85rem',
              fontWeight: '500',
              color: '#202124',
              pointerEvents: 'none',
              zIndex: 1000,
              whiteSpace: 'nowrap',
            }}>
              {tooltip.nameTH}
              <br />
              <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{tooltip.nameEN}</span>
              {tooltip.ndvi != null && (
                <><br /><span style={{ fontSize: '0.7rem', color: '#1e8e3e' }}>NDVI: {tooltip.ndvi.toFixed(3)}</span></>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
