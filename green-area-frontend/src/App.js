import { useEffect, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './App.css';
import * as turf from '@turf/turf';

const PROVINCE_TH = {
  "Amnat Charoen": "อำนาจเจริญ", "Ang Thong": "อ่างทอง",
  "Bangkok Metropolis": "กรุงเทพมหานคร", "Bueng Kan": "บึงกาฬ",
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
  "Samut Songkhram": "สมุทรสงคราม", "Saraburi": "สระบุรี",
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

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const INITIAL_VIEW_STATE = {
  longitude: 101.0,
  latitude: 13.0,
  zoom: 5.5,
  pitch: 25,
  bearing: 0,
};

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 5 + i);

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
  const [thailandData, setThailandData]             = useState(null);
  const [loading, setLoading]                       = useState(true);
  const [selectedProvince, setSelectedProvince]     = useState(null);
  const [selectedProvinceEN, setSelectedProvinceEN] = useState(null);
  const [provinceArea, setProvinceArea]             = useState(null);
  const [ndviStats, setNdviStats]                   = useState(null);
  const [ndviMonthly, setNdviMonthly]               = useState([]);
  const [ndviLoading, setNdviLoading]               = useState(false);
  const [ndviCache, setNdviCache]                   = useState({});
  const [viewState, setViewState]                   = useState(INITIAL_VIEW_STATE);
  const [tooltip, setTooltip]                       = useState(null);

  // comparison state
  const [sidebarTab, setSidebarTab]                 = useState('stats');
  const [trendYears, setTrendYears]                 = useState([CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]);
  const [trendData, setTrendData]                   = useState([]);
  const [trendLoading, setTrendLoading]             = useState(false);
  const [trendProgress, setTrendProgress]           = useState('');
  const [trendMetric, setTrendMetric]               = useState('ndvi_mean');
  const [compareList, setCompareList]               = useState([]);
  const [compareYear, setCompareYear]               = useState(CURRENT_YEAR);
  const [compareData, setCompareData]               = useState([]);
  const [compareLoading, setCompareLoading]         = useState(false);
  const [compareMetric, setCompareMetric]           = useState('ndvi_mean');

  // district state
  const [districtsData, setDistrictsData]           = useState(null);
  const [districtsLoading, setDistrictsLoading]     = useState(false);
  const [selectedDistrict, setSelectedDistrict]     = useState(null);
  const [selectedDistrictEN, setSelectedDistrictEN] = useState(null);
  const [districtArea, setDistrictArea]             = useState(null);
  const [districtNdviStats, setDistrictNdviStats]   = useState(null);
  const [districtNdviMonthly, setDistrictNdviMonthly] = useState([]);
  const [districtNdviLoading, setDistrictNdviLoading] = useState(false);
  const [districtCache, setDistrictCache]           = useState({});

  useEffect(() => {
    fetch('/thailand.json')
      .then(r => r.json())
      .then(data => { setThailandData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/cache`)
      .then(r => r.json())
      .then(data => {
        const cache = {};
        const cacheYear = {};
        data.annual?.forEach(row => {
          if (row.ndvi_mean && (!cacheYear[row.province] || row.year > cacheYear[row.province])) {
            cache[row.province] = row.ndvi_mean;
            cacheYear[row.province] = row.year;
          }
        });
        setNdviCache(cache);
      })
      .catch(() => {});
  }, []);

  const fetchNDVI = async (provinceName) => {
    setNdviLoading(true);
    setNdviStats(null);
    setNdviMonthly([]);
    setTrendData([]);
    try {
      const [statsRes, monthlyRes] = await Promise.all([
        fetch(`${API_BASE}/ndvi/${provinceName}`),
        fetch(`${API_BASE}/ndvi/${provinceName}/monthly`),
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
    setSidebarTab('stats');
    setTrendData([]);
    setCompareList([]);
    setCompareData([]);
    setSelectedDistrict(null);
    setSelectedDistrictEN(null);
    setDistrictNdviStats(null);
    setDistrictNdviMonthly([]);
    setDistrictArea(null);
    setViewState({
      ...INITIAL_VIEW_STATE,
      transitionDuration: 800,
      transitionInterpolator: new FlyToInterpolator(),
    });
  };

  const fetchTrend = async (provinceName, years) => {
    if (!years.length) return;
    setTrendLoading(true);
    setTrendData([]);
    setTrendProgress('');
    const sorted = [...years].sort((a, b) => a - b);
    const results = [];
    for (let i = 0; i < sorted.length; i++) {
      const year = sorted[i];
      setTrendProgress(`กำลังโหลดปี ${year} (${i + 1}/${sorted.length})...`);
      try {
        const res  = await fetch(`${API_BASE}/ndvi/${encodeURIComponent(provinceName)}?year=${year}`);
        const json = await res.json();
        if (json.ndvi_mean != null) {
          results.push({ year, ndvi_mean: json.ndvi_mean, green_area_pct: json.green_area_pct });
          setTrendData([...results]);
        }
      } catch (err) {
        console.error(`fetchTrend year ${year}:`, err);
      }
    }
    setTrendProgress('');
    setTrendLoading(false);
  };

  const fetchCompareData = async (provinces, year) => {
    if (provinces.length < 2) return;
    setCompareLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/compare?provinces=${provinces.join(',')}&year=${year}`);
      const json = await res.json();
      setCompareData(json.data.filter(d => d.available));
    } catch (err) {
      console.error('fetchCompareData error:', err);
    } finally {
      setCompareLoading(false);
    }
  };

  const ensureDistrictsLoaded = async () => {
    if (districtsData || districtsLoading) return;
    setDistrictsLoading(true);
    try {
      const r = await fetch('/thailand_districts.json');
      const data = await r.json();
      setDistrictsData(data);
    } catch (err) {
      console.error('โหลด thailand_districts.json ไม่สำเร็จ:', err);
    } finally {
      setDistrictsLoading(false);
    }
  };

  const fetchDistrictNDVI = async (provinceName, districtName) => {
    setDistrictNdviLoading(true);
    setDistrictNdviStats(null);
    setDistrictNdviMonthly([]);
    try {
      const [statsRes, monthlyRes] = await Promise.all([
        fetch(`${API_BASE}/ndvi/${encodeURIComponent(provinceName)}/districts/${encodeURIComponent(districtName)}`),
        fetch(`${API_BASE}/ndvi/${encodeURIComponent(provinceName)}/districts/${encodeURIComponent(districtName)}/monthly`),
      ]);
      const stats   = await statsRes.json();
      const monthly = await monthlyRes.json();
      setDistrictNdviStats(stats);
      setDistrictNdviMonthly(monthly.monthly?.filter(m => m.ndvi !== null) ?? []);
      if (stats.ndvi_mean) {
        const key = `${provinceName}::${districtName}`;
        setDistrictCache(prev => ({ ...prev, [key]: stats.ndvi_mean }));
      }
    } catch (err) {
      console.error('ดึงข้อมูล NDVI อำเภอไม่สำเร็จ:', err);
    } finally {
      setDistrictNdviLoading(false);
    }
  };

  const toggleTrendYear = (year) => {
    setTrendYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort((a, b) => a - b)
    );
  };

  const addToCompare = (provinceName) => {
    if (!compareList.includes(provinceName)) {
      setCompareList(prev => [...prev, provinceName]);
    }
  };

  const removeFromCompare = (provinceName) => {
    setCompareList(prev => prev.filter(p => p !== provinceName));
    setCompareData([]);
  };

  const showingDistricts = !!(selectedProvinceEN && districtsData);

  const layers = [
    ...(thailandData ? [
      new GeoJsonLayer({
        id: 'thailand-provinces',
        data: thailandData,
        extruded: !showingDistricts,
        wireframe: false,
        getElevation: (f) => {
          if (showingDistricts) return 0;
          const ndvi = ndviCache[f.properties.name];
          return ndvi ? ndvi * 30000 : 0;
        },
        getFillColor: (f) => {
          if (showingDistricts) {
            if (f.properties.name === selectedProvinceEN) return [26, 115, 232, 30];
            return [200, 230, 200, 20];
          }
          if (f.properties.name === selectedProvinceEN) return [26, 115, 232, 230];
          return getNdviRgba(ndviCache[f.properties.name], 200);
        },
        getLineColor: (f) => {
          if (showingDistricts) {
            return f.properties.name === selectedProvinceEN
              ? [26, 115, 232, 180]
              : [42, 74, 42, 30];
          }
          return [42, 74, 42, 160];
        },
        lineWidthMinPixels: 1,
        pickable: true,
        autoHighlight: !showingDistricts,
        highlightColor: [26, 115, 232, 80],
        onClick: ({ object }) => {
          if (!object) return;
          const nameEN = object.properties.name;
          const nameTH = PROVINCE_TH[nameEN] || nameEN;

          setSelectedProvince(nameTH);
          setSelectedProvinceEN(nameEN);
          setProvinceArea((turf.area(object) / 1_000_000).toFixed(2));
          setSelectedDistrict(null);
          setSelectedDistrictEN(null);
          setDistrictNdviStats(null);
          setDistrictNdviMonthly([]);
          fetchNDVI(nameEN);
          ensureDistrictsLoaded();

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
          if (showingDistricts) { setTooltip(null); return; }
          setTooltip(object ? {
            x, y,
            nameTH: PROVINCE_TH[object.properties.name] || object.properties.name,
            nameEN: object.properties.name,
            ndvi:   ndviCache[object.properties.name],
          } : null);
        },
        updateTriggers: {
          extruded:     showingDistricts,
          getElevation: [ndviCache, showingDistricts],
          getFillColor: [ndviCache, selectedProvinceEN, showingDistricts],
          getLineColor: [selectedProvinceEN, showingDistricts],
        },
      }),
    ] : []),

    ...(showingDistricts ? [
      new GeoJsonLayer({
        id: 'thailand-districts',
        data: {
          type: 'FeatureCollection',
          features: districtsData.features.filter(
            f => f.properties.province === selectedProvinceEN
          ),
        },
        extruded: true,
        wireframe: false,
        getElevation: (f) => {
          const key = `${f.properties.province}::${f.properties.name}`;
          const ndvi = districtCache[key];
          return ndvi ? ndvi * 20000 : 500;
        },
        getFillColor: (f) => {
          if (f.properties.name === selectedDistrictEN) return [26, 115, 232, 240];
          const key = `${f.properties.province}::${f.properties.name}`;
          return getNdviRgba(districtCache[key], 220);
        },
        getLineColor: [60, 100, 60, 220],
        lineWidthMinPixels: 1,
        pickable: true,
        autoHighlight: true,
        highlightColor: [100, 160, 255, 120],
        onClick: ({ object }) => {
          if (!object) return;
          const districtEN = object.properties.name;
          setSelectedDistrict(districtEN);
          setSelectedDistrictEN(districtEN);
          setDistrictArea((turf.area(object) / 1_000_000).toFixed(2));
          setSidebarTab('stats');
          fetchDistrictNDVI(selectedProvinceEN, districtEN);
        },
        onHover: ({ object, x, y }) => {
          setTooltip(object ? {
            x, y,
            nameTH: object.properties.name,
            nameEN: `${selectedProvinceEN} › ${object.properties.name}`,
            ndvi:   districtCache[`${object.properties.province}::${object.properties.name}`],
            isDistrict: true,
          } : null);
        },
        updateTriggers: {
          getElevation: districtCache,
          getFillColor: [districtCache, selectedDistrictEN],
        },
      }),
    ] : []),
  ];

  const tabStyle = (id) => ({
    flex: 1,
    padding: '8px 4px',
    border: 'none',
    borderBottom: sidebarTab === id ? '2px solid #1a73e8' : '2px solid transparent',
    background: 'transparent',
    color: sidebarTab === id ? '#1a73e8' : '#5f6368',
    fontSize: '0.75rem',
    fontWeight: sidebarTab === id ? '600' : '400',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const metricBtnStyle = (active) => ({
    padding: '4px 10px',
    border: `1px solid ${active ? '#1a73e8' : '#dadce0'}`,
    background: active ? '#e8f0fe' : 'transparent',
    color: active ? '#1a73e8' : '#5f6368',
    borderRadius: '12px',
    fontSize: '0.72rem',
    cursor: 'pointer',
  });

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
                คลิกที่จังหวัดบนแผนที่<br />เพื่อดูข้อมูล NDVI และพื้นที่สีเขียว<br />
                <span style={{ color: '#1a73e8' }}>จากนั้นคลิกอำเภอ</span>เพื่อดูข้อมูลเชิงลึก
              </p>
              {Object.keys(ndviCache).length > 0 && (
                <p style={{ fontSize: '0.75rem', color: '#1a73e8', marginTop: '16px', fontWeight: '500' }}>
                  ✅ โหลด {Object.keys(ndviCache).length} จังหวัดจาก cache<br />ความสูง 3D พร้อมแสดงแล้ว
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

              {/* Province header */}
              <div className="sidebar-header" style={{ marginBottom: '12px' }}>
                <div>
                  <span className="sidebar-title">
                    {selectedDistrict ? 'จังหวัด › อำเภอ' : 'จังหวัด'}
                  </span>
                  <div className="sidebar-province">{selectedProvince}</div>
                  {selectedDistrict && (
                    <div style={{ fontSize: '0.85rem', color: '#1a73e8', fontWeight: '500', marginTop: '2px' }}>
                      ▸ {selectedDistrict}
                    </div>
                  )}
                </div>
                <span className="mock-badge" style={(ndviStats || districtNdviStats) ? { backgroundColor: '#e6f4ea', color: '#137333', borderColor: '#ceead6' } : {}}>
                  {(ndviLoading || districtNdviLoading) ? '⏳ Loading...' : (ndviStats || districtNdviStats) ? '✅ GEE Data' : '⚠ Mock'}
                </span>
              </div>

              {/* Districts loading indicator */}
              {districtsLoading && (
                <div style={{ fontSize: '0.75rem', color: '#1a73e8', padding: '6px 0', textAlign: 'center' }}>
                  ⏳ กำลังโหลดขอบเขตอำเภอ...
                </div>
              )}

              {/* Tab navigation */}
              <div style={{ display: 'flex', borderBottom: '1px solid #dadce0', marginBottom: '16px' }}>
                <button style={tabStyle('stats')}   onClick={() => setSidebarTab('stats')}>ข้อมูล</button>
                <button style={tabStyle('trend')}   onClick={() => setSidebarTab('trend')}>แนวโน้มรายปี</button>
                <button style={tabStyle('compare')} onClick={() => setSidebarTab('compare')}>เปรียบเทียบ</button>
              </div>

              {/* ── Stats Tab ── */}
              {sidebarTab === 'stats' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* District section (shown when district is selected) */}
                  {selectedDistrict && (
                    <>
                      <div style={{ background: '#e8f0fe', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#1a73e8', fontWeight: '600', letterSpacing: '0.05em' }}>อำเภอ · DISTRICT</div>
                          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#202124' }}>{selectedDistrict}</div>
                          {districtArea && (
                            <div style={{ fontSize: '0.72rem', color: '#5f6368' }}>{Number(districtArea).toLocaleString()} km²</div>
                          )}
                        </div>
                        <button
                          onClick={() => { setSelectedDistrict(null); setSelectedDistrictEN(null); setDistrictNdviStats(null); setDistrictNdviMonthly([]); setDistrictArea(null); }}
                          style={{ padding: '4px 10px', border: '1px solid #1a73e8', borderRadius: '12px', background: 'white', color: '#1a73e8', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="stat-card">
                        <div className="stat-label">NDVI อำเภอ · Annual (100m res.)</div>
                        {districtNdviLoading ? (
                          <p className="stat-desc">กำลังดึงข้อมูลจาก GEE...</p>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                              <span className="stat-value">{districtNdviStats ? districtNdviStats.ndvi_mean : '—'}</span>
                              <span className="stat-desc">{districtNdviStats ? getNdviLabel(districtNdviStats.ndvi_mean) : ''}</span>
                            </div>
                            {districtNdviStats && (
                              <div style={{ height: '6px', backgroundColor: '#f1f3f4', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', backgroundColor: '#1e8e3e', width: `${((districtNdviStats.ndvi_mean || 0) * 100).toFixed(0)}%`, transition: 'width 0.5s ease' }} />
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="sidebar-section">
                        <div className="stat-grid">
                          <div className="stat-item">
                            <span className="stat-item-label">NDVI Min</span>
                            <span className="stat-item-value">{districtNdviStats?.ndvi_min ?? '—'}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-item-label">NDVI Max</span>
                            <span className="stat-item-value">{districtNdviStats?.ndvi_max ?? '—'}</span>
                          </div>
                          <div className="stat-item" style={{ gridColumn: 'span 2', borderColor: '#2a4a2a' }}>
                            <span className="stat-item-label">🌿 พื้นที่สีเขียว (NDVI &gt; 0.3)</span>
                            <span className="stat-item-value" style={{ fontSize: '1.3rem' }}>
                              {districtNdviStats?.green_area_pct != null
                                ? `${districtNdviStats.green_area_pct}%`
                                : districtNdviLoading ? '...' : '—'}
                            </span>
                            {districtNdviStats?.green_area_km2 != null && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {districtNdviStats.green_area_km2.toLocaleString()} km²
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="chart-section">
                        <div className="chart-title">NDVI รายเดือน · อำเภอ</div>
                        {districtNdviLoading ? (
                          <p className="data-note">กำลังคำนวณ NDVI รายเดือน...</p>
                        ) : districtNdviMonthly.length > 0 ? (
                          <ResponsiveContainer width="100%" height={130}>
                            <BarChart data={districtNdviMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <XAxis dataKey="month" tick={{ fill: '#5f6368', fontSize: 9 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                              <YAxis domain={[0, 1]} tick={{ fill: '#5f6368', fontSize: 9 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #dadce0', borderRadius: '4px', color: '#202124', fontSize: '11px' }}
                                formatter={(value) => [value?.toFixed(3), 'NDVI']} cursor={{ fill: '#f1f3f4' }} />
                              <Bar dataKey="ndvi" radius={[2, 2, 0, 0]}>
                                {districtNdviMonthly.map((entry, i) => (
                                  <Cell key={i} fill={getNdviColor(entry.ndvi)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="data-note">ไม่มีข้อมูลรายเดือน</p>
                        )}
                      </div>

                      <div style={{ borderTop: '1px solid #dadce0', paddingTop: '4px', fontSize: '0.72rem', color: '#9aa0a6', textAlign: 'center' }}>
                        ข้อมูลจังหวัด {selectedProvince} ด้านล่าง
                      </div>
                    </>
                  )}

                  {/* Province NDVI card */}
                  <div className="stat-card">
                    <div className="stat-label">{selectedDistrict ? 'NDVI จังหวัด · Annual Average' : 'NDVI · Annual Average'}</div>
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

                  {!selectedDistrict && <div className="chart-section">
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
                  </div>}
                </div>
              )}

              {/* ── Trend Tab ── */}
              {sidebarTab === 'trend' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="chart-title">แนวโน้มรายปี · {selectedProvince}</div>
                  {selectedDistrict && (
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '6px 10px' }}>
                      ⚠ แสดงข้อมูลระดับจังหวัด (ยังไม่รองรับแนวโน้มระดับอำเภอ)
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#5f6368', marginBottom: '6px' }}>เลือกปีที่ต้องการ:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {AVAILABLE_YEARS.map(y => (
                        <label key={y} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={trendYears.includes(y)}
                            onChange={() => toggleTrendYear(y)}
                            style={{ accentColor: '#1a73e8' }}
                          />
                          {y}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={metricBtnStyle(trendMetric === 'ndvi_mean')}       onClick={() => setTrendMetric('ndvi_mean')}>NDVI</button>
                    <button style={metricBtnStyle(trendMetric === 'green_area_pct')}  onClick={() => setTrendMetric('green_area_pct')}>พื้นที่สีเขียว %</button>
                  </div>

                  <button
                    onClick={() => fetchTrend(selectedProvinceEN, trendYears)}
                    disabled={trendYears.length === 0 || trendLoading}
                    style={{
                      padding: '8px', border: 'none', borderRadius: '4px',
                      background: trendYears.length === 0 ? '#f1f3f4' : '#1a73e8',
                      color: trendYears.length === 0 ? '#9aa0a6' : 'white',
                      fontSize: '0.85rem', cursor: trendYears.length === 0 ? 'default' : 'pointer', fontWeight: '500',
                    }}
                  >
                    {trendLoading ? '⏳ กำลังโหลด...' : '📈 ดูแนวโน้ม'}
                  </button>

                  {trendLoading ? (
                    <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '6px', padding: '12px' }}>
                      <p className="data-note" style={{ marginTop: 0, fontStyle: 'normal', color: '#1a73e8' }}>⏳ {trendProgress}</p>
                      {trendData.length > 0 && (
                        <p className="data-note" style={{ marginTop: '4px' }}>โหลดแล้ว {trendData.length} ปี — กราฟจะอัปเดตเมื่อเสร็จทุกปี</p>
                      )}
                    </div>
                  ) : trendData.length > 0 ? (
                    <div className="chart-section" style={{ padding: '12px' }}>
                      <ResponsiveContainer width="100%" height={170}>
                        <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="year" tick={{ fill: '#5f6368', fontSize: 10 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                          <YAxis
                            domain={trendMetric === 'ndvi_mean' ? [0, 1] : [0, 100]}
                            tick={{ fill: '#5f6368', fontSize: 10 }}
                            axisLine={{ stroke: '#dadce0' }}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '12px' }}
                            formatter={(v) => [
                              trendMetric === 'ndvi_mean' ? v?.toFixed(3) : `${v?.toFixed(1)}%`,
                              trendMetric === 'ndvi_mean' ? 'NDVI' : 'พื้นที่สีเขียว',
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey={trendMetric}
                            stroke="#1a73e8"
                            strokeWidth={2}
                            dot={{ r: 4, fill: '#1a73e8', stroke: '#fff', strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <p className="data-note">* แสดงเฉพาะปีที่มีข้อมูลใน cache ({trendData.length} ปี)</p>
                    </div>
                  ) : (
                    <p className="data-note">กดปุ่มเพื่อโหลดข้อมูลจากปีที่เลือก</p>
                  )}
                </div>
              )}

              {/* ── Compare Tab ── */}
              {sidebarTab === 'compare' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="chart-title">เปรียบเทียบจังหวัด</div>
                  {selectedDistrict && (
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '6px 10px' }}>
                      ⚠ แสดงข้อมูลระดับจังหวัด (ยังไม่รองรับเปรียบเทียบระดับอำเภอ)
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#5f6368', marginBottom: '6px' }}>จังหวัดที่เลือก:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px', minHeight: '28px' }}>
                      {compareList.length === 0 ? (
                        <span style={{ fontSize: '0.75rem', color: '#9aa0a6' }}>ยังไม่มีจังหวัด</span>
                      ) : compareList.map(p => (
                        <span key={p} style={{
                          background: '#e8f0fe', color: '#1a73e8', padding: '3px 8px',
                          borderRadius: '12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          {PROVINCE_TH[p] || p}
                          <button
                            onClick={() => removeFromCompare(p)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', padding: '0', lineHeight: 1, fontSize: '1rem' }}
                          >×</button>
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => addToCompare(selectedProvinceEN)}
                      disabled={compareList.includes(selectedProvinceEN)}
                      style={{
                        padding: '5px 12px', border: '1px solid #dadce0', borderRadius: '4px',
                        background: compareList.includes(selectedProvinceEN) ? '#f1f3f4' : '#fff',
                        color: compareList.includes(selectedProvinceEN) ? '#9aa0a6' : '#1a73e8',
                        fontSize: '0.8rem', cursor: compareList.includes(selectedProvinceEN) ? 'default' : 'pointer',
                      }}
                    >
                      + เพิ่ม {selectedProvince}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#5f6368' }}>ปี:</span>
                    <select
                      value={compareYear}
                      onChange={e => setCompareYear(Number(e.target.value))}
                      style={{ border: '1px solid #dadce0', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', color: '#202124', background: '#fff' }}
                    >
                      {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={metricBtnStyle(compareMetric === 'ndvi_mean')}      onClick={() => setCompareMetric('ndvi_mean')}>NDVI</button>
                    <button style={metricBtnStyle(compareMetric === 'green_area_pct')} onClick={() => setCompareMetric('green_area_pct')}>พื้นที่สีเขียว %</button>
                  </div>

                  <button
                    onClick={() => fetchCompareData(compareList, compareYear)}
                    disabled={compareList.length < 2 || compareLoading}
                    style={{
                      padding: '8px', border: 'none', borderRadius: '4px',
                      background: compareList.length < 2 ? '#f1f3f4' : '#1a73e8',
                      color: compareList.length < 2 ? '#9aa0a6' : 'white',
                      fontSize: '0.85rem', cursor: compareList.length < 2 ? 'default' : 'pointer', fontWeight: '500',
                    }}
                  >
                    {compareLoading ? '⏳ กำลังโหลด...' : `📊 เปรียบเทียบ ${compareList.length} จังหวัด`}
                  </button>

                  {compareList.length < 2 && (
                    <p className="data-note">คลิกจังหวัดบนแผนที่ แล้วกด "+ เพิ่ม" อย่างน้อย 2 จังหวัด</p>
                  )}

                  {!compareLoading && compareData.length > 0 && (
                    <div className="chart-section" style={{ padding: '12px' }}>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart
                          data={compareData.map(d => ({ ...d, nameTH: PROVINCE_TH[d.province] || d.province }))}
                          margin={{ top: 10, right: 10, left: -20, bottom: 36 }}
                        >
                          <XAxis
                            dataKey="nameTH"
                            tick={{ fill: '#5f6368', fontSize: 9, angle: -35, textAnchor: 'end' }}
                            interval={0}
                            axisLine={{ stroke: '#dadce0' }}
                            tickLine={false}
                          />
                          <YAxis
                            domain={compareMetric === 'ndvi_mean' ? [0, 1] : [0, 100]}
                            tick={{ fill: '#5f6368', fontSize: 10 }}
                            axisLine={{ stroke: '#dadce0' }}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '12px' }}
                            formatter={(v) => [
                              compareMetric === 'ndvi_mean' ? v?.toFixed(3) : `${v?.toFixed(1)}%`,
                              compareMetric === 'ndvi_mean' ? 'NDVI' : 'พื้นที่สีเขียว',
                            ]}
                          />
                          <Bar dataKey={compareMetric} radius={[2, 2, 0, 0]}>
                            {compareData.map((entry, i) => (
                              <Cell key={i} fill={getNdviColor(entry.ndvi_mean)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <p className="data-note">* แสดงเฉพาะจังหวัดที่มีข้อมูลใน cache ({compareData.length}/{compareList.length} จังหวัด)</p>
                    </div>
                  )}
                </div>
              )}

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
