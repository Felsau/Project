export default function AppHeader({ loading }) {
  return (
    <>
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
    </>
  );
}
