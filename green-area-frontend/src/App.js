import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

const THAILAND_CENTER = [13.0, 101.0];
const THAILAND_BOUNDS = [
  [5.5, 97.5],
  [20.5, 105.7],
];

function App() {
  const [thailandData, setThailandData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState(null);
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

  // style ปกติ
  const defaultStyle = {
    color: '#4ade80',
    weight: 1.5,
    opacity: 1,
    fillColor: '#4ade80',
    fillOpacity: 0.15,
  };

  // style hover
  const hoverStyle = {
    color: '#4ade80',
    weight: 2.5,
    fillOpacity: 0.35,
  };

  // style เมื่อถูกเลือก
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
      // ← เพิ่ม check ว่าเป็น selected layer ไหม ถ้าใช่ไม่ต้อง reset
      if (selectedLayerRef.current !== e.target) {
        e.target.setStyle(defaultStyle);
      } else {
        e.target.setStyle(selectedStyle); // ← คง selected style ไว้
      }
    },
    click: (e) => {
      const map = mapRef.current;

      // ถ้าคลิก layer เดิมที่เลือกอยู่แล้ว ไม่ต้องทำอะไร
      if (selectedLayerRef.current === e.target) return;

      // รีเซ็ต style ของจังหวัดก่อนหน้า
      if (selectedLayerRef.current) {
        selectedLayerRef.current.setStyle(defaultStyle);
      }

      // เซ็ต style ของจังหวัดที่คลิก
      e.target.setStyle(selectedStyle);
      selectedLayerRef.current = e.target;
      setSelectedProvince(name);

      if (map) {
        map.fitBounds(e.target.getBounds(), { padding: [40, 40] });
      }
    },
  });
};

  // รีเซ็ตกลับมาดูทั้งประเทศ
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

      <div className="main-layout">
        {/* แผนที่ */}
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
              <h2 className="sidebar-title">📍 จังหวัดที่เลือก</h2>
              <p className="sidebar-province">{selectedProvince}</p>
              <p className="sidebar-hint">
                ข้อมูล NDVI และพื้นที่สีเขียว<br />จะแสดงที่นี่ในอนาคต
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