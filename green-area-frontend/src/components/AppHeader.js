export default function AppHeader({ loading, sidebarCollapsed, onToggleSidebar }) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <div className="topbar__mark" aria-hidden="true" />
        <div className="topbar__title">
          Green Area Analysis<em>Thailand</em>
        </div>
      </div>
      <div className="topbar__meta">
        <span className="topbar__source"><strong>Sentinel-2</strong> · Google Earth Engine</span>
      </div>
      <button
        className="topbar__sidebar-toggle"
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'แสดงแผงข้อมูล' : 'ซ่อนแผงข้อมูล'}
      >
        {sidebarCollapsed ? 'แสดงแผง ›' : '‹ ซ่อนแผง'}
      </button>
      {loading && <div className="loading-bar" />}
    </header>
  );
}
