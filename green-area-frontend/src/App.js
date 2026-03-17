import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// พิกัดศูนย์กลางประเทศไทย
const THAILAND_CENTER = [13.0, 101.0];

// กำหนดขอบเขตประเทศไทย (ไม่ให้ scroll ออกนอกประเทศ)
const THAILAND_BOUNDS = [
  [5.5, 97.5],   // มุมซ้ายล่าง (ใต้สุด-ตะวันตก)
  [20.5, 105.7], // มุมขวาบน (เหนือสุด-ตะวันออก)
];

function App() {
  return (
    <div className="App">
      <h1 className="App-title">🌿 ระบบวิเคราะห์พื้นที่สีเขียว</h1>
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
      </MapContainer>
    </div>
  );
}

export default App;