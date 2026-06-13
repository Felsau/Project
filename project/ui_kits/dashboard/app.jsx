// App shell — topbar over (sidebar | map). Theme + selection state lives here.
const { TopBar } = window.GreenLensDesignSystem_4a358a;
const { useState, useEffect } = React;

function App() {
  const [theme, setTheme] = useState('light');
  const [collapsed, setCollapsed] = useState(false);
  const [provinceTh, setProvinceTh] = useState('กรุงเทพมหานคร');
  const [districtTh, setDistrictTh] = useState(null);
  const [tab, setTab] = useState('stats');
  const [overlay, setOverlay] = useState('none');

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const province = GL_PROVINCES.find(p => p.th === provinceTh) || null;
  const district = province && districtTh
    ? (GL_DISTRICTS[province.th] || []).find(d => d.th === districtTh) || null
    : null;

  return (
    <div className="app">
      <TopBar
        title="GreenLens"
        subtitle="Thailand"
        source="Sentinel-2"
        sourceMeta="Google Earth Engine"
        theme={theme}
        sidebarCollapsed={collapsed}
        onBrandClick={() => { window.location.href = '../landing/index.html'; }}
        onShowAbout={() => {}}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onToggleSidebar={() => setCollapsed(!collapsed)}
      />
      <div className="app__body" data-collapsed={collapsed}>
        <SidebarView
          province={province}
          district={district}
          tab={tab}
          setTab={setTab}
          onSelectProvince={(th) => { setProvinceTh(th); setDistrictTh(null); setTab('stats'); }}
          onClearDistrict={() => setDistrictTh(null)}
          onReset={() => { setProvinceTh(null); setDistrictTh(null); }}
        />
        <MapView overlay={overlay} setOverlay={setOverlay} choropleth="ndvi" />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
