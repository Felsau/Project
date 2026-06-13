import React from 'react';

/**
 * Product top bar — brand block, data-source meta, unicode icon buttons,
 * sidebar toggle, optional loading line. 40px tall, hairline bottom rule.
 */
export function TopBar({
  title = 'GreenLens',
  subtitle = 'Thailand',
  source = 'Sentinel-2',
  sourceMeta = 'Google Earth Engine',
  loading = false,
  theme = 'light',
  sidebarCollapsed = false,
  onBrandClick,
  onShowAbout,
  onToggleTheme,
  onToggleSidebar,
}) {
  return (
    <header className="topbar" style={{ position: 'relative' }}>
      <button className="topbar__brand" onClick={onBrandClick} type="button">
        <div className="topbar__mark" aria-hidden="true"></div>
        <div className="topbar__title">{title}<em>{subtitle}</em></div>
      </button>
      <div className="topbar__meta">
        <span className="topbar__source"><strong>{source}</strong> · {sourceMeta}</span>
      </div>
      {onShowAbout && (
        <button className="topbar__icon-btn" type="button" onClick={onShowAbout} aria-label="ข้อมูลและระเบียบวิธี">ⓘ</button>
      )}
      {onToggleTheme && (
        <button className="topbar__icon-btn" type="button" onClick={onToggleTheme} aria-label="สลับธีม">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      )}
      {onToggleSidebar && (
        <button className="topbar__sidebar-toggle" type="button" onClick={onToggleSidebar}>
          {sidebarCollapsed ? 'แสดงแผง ›' : '‹ ซ่อนแผง'}
        </button>
      )}
      {loading && <div className="loading-bar"></div>}
    </header>
  );
}
