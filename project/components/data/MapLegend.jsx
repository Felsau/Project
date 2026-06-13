import React from 'react';

const NDVI_STOPS = [
  { color: 'var(--ndvi-3)', label: 'หนาแน่นมาก', range: '≥ 0.60' },
  { color: 'var(--ndvi-2)', label: 'หนาแน่น', range: '0.45–0.60' },
  { color: 'var(--ndvi-1)', label: 'ปานกลาง', range: '0.30–0.45' },
  { color: 'var(--ndvi-0)', label: 'น้อย', range: '< 0.30' },
];

const LST_STOPS = [
  { color: 'var(--lst-crit)', label: 'ร้อนมาก', range: '≥ 38°C' },
  { color: 'var(--lst-hot)', label: 'ร้อน', range: '33–38°C' },
  { color: 'var(--lst-mild)', label: 'ปานกลาง', range: '28–33°C' },
  { color: 'var(--lst-cool)', label: 'เย็น', range: '< 28°C' },
];

/**
 * Floating map color key. mode 'ndvi' | 'lst' renders the bucket rows;
 * pass `gradient` + `min`/`max` for a continuous raster scale instead.
 */
export function MapLegend({ mode = 'ndvi', title, gradient, min, max, showEmpty = true }) {
  const heading = title || (mode === 'lst' ? 'อุณหภูมิผิว · LST' : 'พื้นที่สีเขียว · NDVI');
  if (gradient) {
    return (
      <div className="legend-card">
        <div className="legend-card__title">{heading}</div>
        <div className="legend-gradient" style={{ background: gradient }}></div>
        <div className="legend-gradient__scale"><span>{min}</span><span>{max}</span></div>
      </div>
    );
  }
  const stops = mode === 'lst' ? LST_STOPS : NDVI_STOPS;
  return (
    <div className="legend-card">
      <div className="legend-card__title">{heading}</div>
      {stops.map((s) => (
        <div className="legend-card__row" key={s.range}>
          <span className="legend-card__swatch" style={{ background: s.color }}></span>
          <span className="legend-card__label">{s.label}</span>
          <span className="legend-card__range">{s.range}</span>
        </div>
      ))}
      {showEmpty && (
        <div className="legend-card__row">
          <span className="legend-card__swatch legend-card__swatch--empty"></span>
          <span className="legend-card__label">ยังไม่มีข้อมูล</span>
          <span className="legend-card__range">—</span>
        </div>
      )}
    </div>
  );
}
