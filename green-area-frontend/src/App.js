import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetch('/thailand.json')
      .then((res) => res.json())
      .then((data) => {
        setThailandData(data); // ← ใช้ทั้งหมดเลย ไม่ต้อง filter
        setLoading(false);
      })
      .catch((err) => {
        console.error('โหลดข้อมูลไม่สำเร็จ:', err);
        setLoading(false);
      });
  }, []);

  // style ปกติทุกจังหวัด
  const provinceStyle = {
    color: '#4ade80',
    weight: 1.5,
    opacity: 1,
    fillColor: '#4ade80',
    fillOpacity: 0.15,
  };

  // style เมื่อ hover
  const highlightStyle = {
    color: '#4ade80',
    weight: 2.5,
    fillOpacity: 0.4,
  };

  // เมื่อเอาเมาส์ชี้แต่ละจังหวัด
  const onEachProvince = (feature, layer) => {
    const name = feature.properties.name || 'ไม่ทราบชื่อ';

    // แสดง tooltip ชื่อจังหวัด
    layer.bindTooltip(name, {
      permanent: false,
      direction: 'center',
      className: 'province-tooltip',
    });

    layer.on({
      mouseover: (e) => {
        e.target.setStyle(highlightStyle);
      },
      mouseout: (e) => {
        e.target.setStyle(provinceStyle);
      },
    });
  };

  return (
    <div className="App">
      <h1 className="App-title">🌿 ระบบวิเคราะห์พื้นที่สีเขียว — ประเทศไทย</h1>
      {loading && <p className="loading-text">กำลังโหลดข้อมูล...</p>}
      <MapContainer
        center={THAILAND_CENTER}
        zoom={6}
        minZoom={6}
        maxZoom={18}
        maxBounds={THAILAND_BOUNDS}
        maxBoundsViscosity={1.0}
        className="map-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {thailandData && (
          <GeoJSON
            data={thailandData}
            style={provinceStyle}
            onEachFeature={onEachProvince}
          />
        )}
      </MapContainer>
    </div>
  );
}

export default App;