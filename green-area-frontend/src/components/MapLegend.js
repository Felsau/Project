// Color key for the province choropleth (NDVI greenness) drawn on the map.
// Mirrors the buckets in colorUtils.js (getNdviRgba).
const NDVI_STOPS = [
  { color: '#22c55e', label: 'หนาแน่นมาก', range: '≥ 0.60' },
  { color: '#4ade80', label: 'หนาแน่น',     range: '0.45–0.60' },
  { color: '#86efac', label: 'ปานกลาง',      range: '0.30–0.45' },
  { color: '#bbf7d0', label: 'น้อย',         range: '< 0.30' },
];

export default function MapLegend() {
  return (
    <div className="legend-card" aria-label="คำอธิบายสีพื้นที่สีเขียว">
      <div className="legend-card__title">พื้นที่สีเขียว · NDVI</div>
      {NDVI_STOPS.map(s => (
        <div className="legend-card__row" key={s.range}>
          <span className="legend-card__swatch" style={{ background: s.color }} />
          <span className="legend-card__label">{s.label}</span>
          <span className="legend-card__range">{s.range}</span>
        </div>
      ))}
      <div className="legend-card__row">
        <span className="legend-card__swatch legend-card__swatch--empty" />
        <span className="legend-card__label">ยังไม่มีข้อมูล</span>
        <span className="legend-card__range">—</span>
      </div>
    </div>
  );
}
