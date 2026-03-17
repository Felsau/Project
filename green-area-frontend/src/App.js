import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// ← เปลี่ยนเป็นศูนย์กลางประเทศไทย
const THAILAND_CENTER = [13.0, 101.0];

const THAILAND_BOUNDS = [
  [5.5, 97.5],
  [20.5, 105.7],
];

function App() {
  const [phayaoData, setPhayaoData] = useState(null);
  const [loading, setLoading] = useState(true);

  const phayaoStyle = {
    color: '#4ade80',
    weight: 2,
    opacity: 1,
    fillColor: '#4ade80',
    fillOpacity: 0.35,   // ← เพิ่มความเข้มขึ้นนิดนึง ให้เห็นชัดตอนซูมออก
  };

  return (
    <div className="App">
      <h1 className="App-title">🌿 ระบบวิเคราะห์พื้นที่สีเขียว — จังหวัดพะเยา</h1>
      {loading && <p className="loading-text">กำลังโหลดข้อมูล...</p>}
      <MapContainer
        center={THAILAND_CENTER}   // ← เปิดมาเห็นทั้งประเทศ
        zoom={6}                   // ← zoom ระดับประเทศ
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
        {phayaoData && (
          <GeoJSON data={phayaoData} style={phayaoStyle} />
        )}
      </MapContainer>
    </div>
  );
}

export default App;