// Map pane — recreation of the MapLibre view as a static placeholder with the
// real floating controls: overlay toggle (top-left), zoom stack (top-right),
// NDVI/LST legend (bottom-left). The basemap itself is intentionally a
// placeholder — the production app renders CARTO tiles + deck.gl layers.
const { MapLegend } = window.GreenLensDesignSystem_4a358a;

function MapView({ overlay, setOverlay, choropleth }) {
  return (
    <div className="mapwrap canvas">
      {/* Placeholder basemap — subtle survey grid on sunken paper */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage:
          'linear-gradient(var(--rule) 1px, transparent 1px), linear-gradient(90deg, var(--rule) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        opacity: 0.5,
      }}></div>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(420px 300px at 38% 42%, color-mix(in srgb, var(--ndvi-1) 26%, transparent), transparent 70%), radial-gradient(360px 260px at 62% 60%, color-mix(in srgb, var(--ndvi-3) 18%, transparent), transparent 70%), radial-gradient(280px 220px at 52% 30%, color-mix(in srgb, var(--lst-hot) 12%, transparent), transparent 70%)',
      }}></div>

      {/* Placeholder disclaimer — the real app renders MapLibre + deck.gl here */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        textAlign: 'center', color: 'var(--text-faint)', fontSize: 'var(--t-xs)',
        letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, lineHeight: 2,
      }}>
        MapLibre · CARTO basemap · deck.gl choropleth<br />
        <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>
          พื้นที่แผนที่ (ตัวอย่างประกอบ — ไม่ใช่แผนที่จริง)
        </span>
      </div>

      {/* Overlay toggle — top-left */}
      <div className="overlay-toggle">
        <span className="overlay-toggle__label">Raster overlay</span>
        <div className="overlay-toggle__btns">
          {[['none', 'ปิด'], ['ndvi', 'NDVI'], ['lst', 'LST']].map(([id, label]) => (
            <button key={id} type="button" className="overlay-btn" data-active={overlay === id}
              onClick={() => setOverlay(id)}>{label}</button>
          ))}
        </div>
        <span className="overlay-toggle__status">
          {overlay === 'none' ? 'choropleth รายจังหวัด' : 'raster 10 m จาก GEE'}
        </span>
      </div>

      {/* Zoom / view controls — top-right */}
      <div className="map-controls">
        <button type="button" className="map-btn" aria-label="ซูมเข้า">+</button>
        <button type="button" className="map-btn" aria-label="ซูมออก">−</button>
        <button type="button" className="map-btn" aria-label="กลับมุมมองเริ่มต้น">⌂</button>
      </div>

      {/* Color key — bottom-left */}
      {overlay === 'none'
        ? <MapLegend mode={choropleth} />
        : <MapLegend
            gradient={overlay === 'lst' ? 'var(--grad-lst)' : 'var(--grad-ndvi)'}
            min={overlay === 'lst' ? '24°C' : '0.0'}
            max={overlay === 'lst' ? '42°C' : '0.8'}
            title={overlay === 'lst' ? 'อุณหภูมิผิว · LST (raster)' : 'พืชพรรณ · NDVI (raster)'}
          />
      }
    </div>
  );
}

window.MapView = MapView;
