export default function MapTooltip({ tooltip }) {
  return (
    <div style={{
      position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 44,
      background: 'rgba(255,255,255,0.97)', padding: '6px 10px',
      borderRadius: '4px', border: '1px solid #dadce0',
      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      fontSize: '0.85rem', fontWeight: '500', color: '#202124',
      pointerEvents: 'none', zIndex: 1000, whiteSpace: 'nowrap',
    }}>
      {tooltip.nameTH}
      <br />
      <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{tooltip.nameEN}</span>
      {tooltip.ndvi != null && (
        <><br /><span style={{ fontSize: '0.7rem', color: '#1e8e3e' }}>NDVI: {tooltip.ndvi.toFixed(3)}</span></>
      )}
    </div>
  );
}
