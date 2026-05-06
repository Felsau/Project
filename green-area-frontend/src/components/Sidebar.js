import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PROVINCE_TH, AVAILABLE_YEARS } from '../constants';
import { getNdviColor, getNdviLabel, getLstColor, getLstLabel } from '../colorUtils';

export default function Sidebar({ data, handlers }) {
  const {
    selectedProvince, selectedProvinceEN, selectedDistrict,
    provinceArea, districtArea, districtsLoading,
    ndviStats, ndviMonthly, ndviLoading,
    lstStats, lstMonthly, lstLoading,
    districtNdviStats, districtNdviMonthly, districtNdviLoading,
    districtLstStats, districtLstMonthly, districtLstLoading,
    sidebarTab, trendYears, trendData, trendLoading, trendProgress, trendMetric,
    compareList, compareYear, compareData, compareLoading, compareMetric,
    ndviCache,
    rankingData = [], rankingStats = null, rankingLoading = false, rankingYear,
    recommendData, recommendLoading, recommendVisible, recommendScope,
  } = data;

  const {
    onReset, onClearDistrict, setSidebarTab,
    onToggleTrendYear, setTrendMetric, onFetchTrend,
    onAddToCompare, onRemoveFromCompare, setCompareMetric, setCompareYear, onFetchCompare,
    onFetchRanking, setRankingYear,
    onFetchRecommend, onToggleRecommend, onClearRecommend,
  } = handlers;

  const tabStyle = (id) => ({
    flex: 1, padding: '8px 4px', border: 'none',
    borderBottom: sidebarTab === id ? '2px solid #1a73e8' : '2px solid transparent',
    background: 'transparent',
    color: sidebarTab === id ? '#1a73e8' : '#5f6368',
    fontSize: '0.75rem', fontWeight: sidebarTab === id ? '600' : '400',
    cursor: 'pointer', transition: 'all 0.15s',
  });

  const metricBtnStyle = (active) => ({
    padding: '4px 10px',
    border: `1px solid ${active ? '#1a73e8' : '#dadce0'}`,
    background: active ? '#e8f0fe' : 'transparent',
    color: active ? '#1a73e8' : '#5f6368',
    borderRadius: '12px', fontSize: '0.72rem', cursor: 'pointer',
  });

  if (!selectedProvince) {
    const cacheCount = Object.keys(ndviCache).length;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 2px', height: '100%', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', paddingTop: '8px' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🌿</div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#202124' }}>ภาพรวมพื้นที่สีเขียว</div>
          <div style={{ fontSize: '0.78rem', color: '#5f6368' }}>ประเทศไทย · Thailand Green Area Index</div>
        </div>

        {cacheCount > 0 && (
          <div style={{ fontSize: '0.75rem', color: '#1a73e8', textAlign: 'center', background: '#e8f0fe', borderRadius: '6px', padding: '6px 10px' }}>
            ✅ {cacheCount} จังหวัดพร้อมแสดงบนแผนที่ 3D
          </div>
        )}

        {/* Year selector + load button */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={rankingYear}
            onChange={e => setRankingYear(Number(e.target.value))}
            style={{ flex: 1, border: '1px solid #dadce0', borderRadius: '4px', padding: '6px', fontSize: '0.8rem', color: '#202124', background: '#fff' }}
          >
            {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => onFetchRanking(rankingYear)}
            disabled={rankingLoading}
            style={{ flex: 2, padding: '7px 12px', border: 'none', borderRadius: '4px', background: rankingLoading ? '#dadce0' : '#1a73e8', color: 'white', fontSize: '0.8rem', cursor: rankingLoading ? 'default' : 'pointer', fontWeight: '500' }}
          >
            {rankingLoading ? '⏳ กำลังโหลด...' : '📊 โหลดอันดับจังหวัด'}
          </button>
        </div>

        {/* Ranking results */}
        {rankingStats && (
          <>
            {/* Summary cards */}
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '0.72rem', color: '#5f6368', marginBottom: '8px', fontWeight: '600' }}>
                ผลการวิเคราะห์ปี {rankingYear} · {rankingStats.total} จังหวัดในระบบ
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#22c55e', lineHeight: 1 }}>{rankingStats.whoPass}</div>
                  <div style={{ fontSize: '0.68rem', color: '#16a34a', marginTop: '2px' }}>ผ่าน WHO</div>
                </div>
                <div style={{ flex: 1, background: '#fff7ed', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#f97316', lineHeight: 1 }}>{rankingStats.whoFail}</div>
                  <div style={{ fontSize: '0.68rem', color: '#c2410c', marginTop: '2px' }}>ต่ำกว่า WHO</div>
                </div>
              </div>
              <div style={{ marginTop: '8px', height: '5px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#22c55e', width: `${rankingStats.total > 0 ? (rankingStats.whoPass / rankingStats.total * 100).toFixed(0) : 0}%`, transition: 'width 0.6s ease' }} />
              </div>
            </div>

            {/* Worst provinces */}
            {rankingData.length > 0 && (
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: '600', color: '#ef4444', marginBottom: '5px' }}>
                  ⚠️ จังหวัดวิกฤต — ต้องการพื้นที่สีเขียวมากที่สุด
                </div>
                {rankingData.slice(0, 5).map((r, i) => {
                  const m2 = r.green_area_m2_per_person;
                  const color = m2 < 3 ? '#ef4444' : m2 < 6 ? '#f97316' : '#f59e0b';
                  return (
                    <div key={r.province} style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', background: i % 2 === 0 ? '#fff' : '#fafafa', borderRadius: '4px', fontSize: '0.78rem', gap: '6px' }}>
                      <span style={{ color: '#9aa0a6', minWidth: '18px', fontSize: '0.7rem' }}>#{r.rank}</span>
                      <span style={{ flex: 1, color: '#202124' }}>{PROVINCE_TH[r.province] || r.province}</span>
                      <span style={{ color, fontWeight: '700', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {m2?.toFixed(1) ?? '—'} m²
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Best provinces */}
            {rankingData.length > 0 && (
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: '600', color: '#16a34a', marginBottom: '5px' }}>
                  ✅ จังหวัดพื้นที่สีเขียวดีที่สุด
                </div>
                {[...rankingData].reverse().slice(0, 5).map((r, i) => (
                  <div key={r.province} style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', background: i % 2 === 0 ? '#fff' : '#fafafa', borderRadius: '4px', fontSize: '0.78rem', gap: '6px' }}>
                    <span style={{ color: '#9aa0a6', minWidth: '18px', fontSize: '0.7rem' }}>#{r.rank}</span>
                    <span style={{ flex: 1, color: '#202124' }}>{PROVINCE_TH[r.province] || r.province}</span>
                    <span style={{ color: '#22c55e', fontWeight: '700', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {r.green_area_m2_per_person?.toFixed(1) ?? '—'} m²
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!rankingStats && (
          <p style={{ fontSize: '0.78rem', color: '#9aa0a6', textAlign: 'center', lineHeight: '1.6' }}>
            กดโหลดอันดับ หรือ<br />
            <span style={{ color: '#1a73e8' }}>คลิกจังหวัดบนแผนที่</span><br />เพื่อดูข้อมูลเชิงลึก
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* Province header */}
      <div className="sidebar-header" style={{ marginBottom: '12px' }}>
        <div>
          <span className="sidebar-title">
            {selectedDistrict ? 'จังหวัด › อำเภอ' : 'จังหวัด'}
          </span>
          <div className="sidebar-province">{selectedProvince}</div>
          {selectedDistrict && (
            <div style={{ fontSize: '0.85rem', color: '#1a73e8', fontWeight: '500', marginTop: '2px' }}>
              ▸ {selectedDistrict}
            </div>
          )}
        </div>
        <span className="mock-badge" style={(ndviStats || districtNdviStats) ? { backgroundColor: '#e6f4ea', color: '#137333', borderColor: '#ceead6' } : {}}>
          {(ndviLoading || districtNdviLoading) ? '⏳ Loading...' : (ndviStats || districtNdviStats) ? '✅ GEE Data' : '⚠ Mock'}
        </span>
      </div>

      {districtsLoading && (
        <div style={{ fontSize: '0.75rem', color: '#1a73e8', padding: '6px 0', textAlign: 'center' }}>
          ⏳ กำลังโหลดขอบเขตอำเภอ...
        </div>
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #dadce0', marginBottom: '16px' }}>
        <button style={tabStyle('stats')}     onClick={() => setSidebarTab('stats')}>ข้อมูล</button>
        <button style={tabStyle('trend')}     onClick={() => setSidebarTab('trend')}>แนวโน้ม</button>
        <button style={tabStyle('compare')}   onClick={() => setSidebarTab('compare')}>เทียบ</button>
        <button style={tabStyle('recommend')} onClick={() => setSidebarTab('recommend')}>🤖 AI</button>
      </div>

      {/* ── Stats Tab ── */}
      {sidebarTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* District section */}
          {selectedDistrict && (
            <>
              <div style={{ background: '#e8f0fe', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#1a73e8', fontWeight: '600', letterSpacing: '0.05em' }}>อำเภอ · DISTRICT</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#202124' }}>{selectedDistrict}</div>
                  {districtArea && (
                    <div style={{ fontSize: '0.72rem', color: '#5f6368' }}>{Number(districtArea).toLocaleString()} km²</div>
                  )}
                </div>
                <button
                  onClick={onClearDistrict}
                  style={{ padding: '4px 10px', border: '1px solid #1a73e8', borderRadius: '12px', background: 'white', color: '#1a73e8', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* District NDVI card */}
              <div className="stat-card">
                <div className="stat-label">NDVI อำเภอ · Annual (100m res.)</div>
                {districtNdviLoading ? (
                  <p className="stat-desc">กำลังดึงข้อมูลจาก GEE...</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span className="stat-value">{districtNdviStats ? districtNdviStats.ndvi_mean : '—'}</span>
                      <span className="stat-desc">{districtNdviStats ? getNdviLabel(districtNdviStats.ndvi_mean) : ''}</span>
                    </div>
                    {districtNdviStats && (
                      <div style={{ height: '6px', backgroundColor: '#f1f3f4', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', backgroundColor: '#1e8e3e', width: `${((districtNdviStats.ndvi_mean || 0) * 100).toFixed(0)}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* District NDVI stats grid */}
              <div className="sidebar-section">
                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-item-label">NDVI Min</span>
                    <span className="stat-item-value">{districtNdviStats?.ndvi_min ?? '—'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-item-label">NDVI Max</span>
                    <span className="stat-item-value">{districtNdviStats?.ndvi_max ?? '—'}</span>
                  </div>
                  <div className="stat-item" style={{ gridColumn: 'span 2', borderColor: '#2a4a2a' }}>
                    <span className="stat-item-label">🌿 พื้นที่สีเขียว (NDVI &gt; 0.3)</span>
                    <span className="stat-item-value" style={{ fontSize: '1.3rem' }}>
                      {districtNdviStats?.green_area_pct != null
                        ? `${districtNdviStats.green_area_pct}%`
                        : districtNdviLoading ? '...' : '—'}
                    </span>
                    {districtNdviStats?.green_area_km2 != null && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {districtNdviStats.green_area_km2.toLocaleString()} km²
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* District NDVI monthly chart */}
              <div className="chart-section">
                <div className="chart-title">NDVI รายเดือน · อำเภอ</div>
                {districtNdviLoading ? (
                  <p className="data-note">กำลังคำนวณ NDVI รายเดือน...</p>
                ) : districtNdviMonthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={districtNdviMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fill: '#5f6368', fontSize: 9 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                      <YAxis domain={[0, 1]} tick={{ fill: '#5f6368', fontSize: 9 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #dadce0', borderRadius: '4px', color: '#202124', fontSize: '11px' }}
                        formatter={(v) => [v?.toFixed(3), 'NDVI']} cursor={{ fill: '#f1f3f4' }} />
                      <Bar dataKey="ndvi" radius={[2, 2, 0, 0]}>
                        {districtNdviMonthly.map((entry, i) => <Cell key={i} fill={getNdviColor(entry.ndvi)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="data-note">ไม่มีข้อมูลรายเดือน</p>
                )}
              </div>

              {/* District LST card */}
              <div className="stat-card">
                <div className="stat-label">อุณหภูมิผิวพื้น (LST) · อำเภอ · Landsat 8/9</div>
                {districtLstLoading ? (
                  <p className="stat-desc">กำลังดึงข้อมูล LST จาก Landsat...</p>
                ) : districtLstStats ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span className="stat-value" style={{ color: getLstColor(districtLstStats.lst_mean) }}>
                        {districtLstStats.lst_mean}°C
                      </span>
                      <span className="stat-desc">{getLstLabel(districtLstStats.lst_mean)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.72rem', color: '#5f6368' }}>
                      <span>Min: {districtLstStats.lst_min}°C</span>
                      <span>Max: {districtLstStats.lst_max}°C</span>
                    </div>
                    <div style={{ marginTop: '8px', padding: '5px 8px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '4px', fontSize: '0.7rem', color: '#795548', lineHeight: '1.5' }}>
                      ⚠️ LST คืออุณหภูมิผิวพื้นดิน/พืช จากดาวเทียม<br />
                      สูงกว่าอุณหภูมิอากาศปกติ 5–20°C · Max = pixel ร้อนสุดในพื้นที่
                    </div>
                  </>
                ) : (
                  <p className="stat-desc">—</p>
                )}
              </div>

              {/* District LST monthly chart */}
              {districtLstMonthly.length > 0 && (
                <div className="chart-section">
                  <div className="chart-title">LST รายเดือน · อำเภอ</div>
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={districtLstMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fill: '#5f6368', fontSize: 9 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                      <YAxis tick={{ fill: '#5f6368', fontSize: 9 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #dadce0', borderRadius: '4px', color: '#202124', fontSize: '11px' }}
                        formatter={(v) => [v?.toFixed(1) + '°C', 'LST']} cursor={{ fill: '#f1f3f4' }} />
                      <Bar dataKey="lst" radius={[2, 2, 0, 0]}>
                        {districtLstMonthly.map((entry, i) => <Cell key={i} fill={getLstColor(entry.lst)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div style={{ borderTop: '1px solid #dadce0', paddingTop: '4px', fontSize: '0.72rem', color: '#9aa0a6', textAlign: 'center' }}>
                ข้อมูลจังหวัด {selectedProvince} ด้านล่าง
              </div>
            </>
          )}

          {/* Province NDVI card */}
          <div className="stat-card">
            <div className="stat-label">{selectedDistrict ? 'NDVI จังหวัด · Annual Average' : 'NDVI · Annual Average'}</div>
            {ndviLoading ? (
              <p className="stat-desc">กำลังดึงข้อมูลจาก GEE...</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="stat-value">{ndviStats ? ndviStats.ndvi_mean : '—'}</span>
                  <span className="stat-desc">{ndviStats ? getNdviLabel(ndviStats.ndvi_mean) : ''}</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#f1f3f4', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', backgroundColor: '#1e8e3e', width: `${((ndviStats?.ndvi_mean || 0) * 100).toFixed(0)}%`, transition: 'width 0.5s ease' }} />
                </div>
              </>
            )}
          </div>

          {/* Province stats grid */}
          <div className="sidebar-section">
            <div className="stat-grid">
              <div className="stat-item" style={{ gridColumn: 'span 2' }}>
                <span className="stat-item-label">พื้นที่จังหวัด (Turf.js)</span>
                <span className="stat-item-value">
                  {provinceArea ? `${Number(provinceArea).toLocaleString()} km²` : '—'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-item-label">NDVI Min</span>
                <span className="stat-item-value">{ndviStats?.ndvi_min ?? '—'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-item-label">NDVI Max</span>
                <span className="stat-item-value">{ndviStats?.ndvi_max ?? '—'}</span>
              </div>
              <div className="stat-item" style={{ gridColumn: 'span 2', borderColor: '#2a4a2a' }}>
                <span className="stat-item-label">🌿 พื้นที่สีเขียว (NDVI &gt; 0.3)</span>
                <span className="stat-item-value" style={{ fontSize: '1.3rem' }}>
                  {ndviStats?.green_area_pct != null ? `${ndviStats.green_area_pct}%` : ndviLoading ? '...' : '—'}
                </span>
                {ndviStats?.green_area_km2 != null && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {ndviStats.green_area_km2.toLocaleString()} km²
                  </span>
                )}
              </div>
              {ndviStats?.who_status && (
                <div className="stat-item" style={{ gridColumn: 'span 2', borderColor: ndviStats.who_status.includes('ผ่าน') ? '#22c55e' : '#f59e0b' }}>
                  <span className="stat-item-label">มาตรฐาน WHO (9 m²/คน)</span>
                  <span style={{ fontSize: '0.8rem', color: ndviStats.who_status.includes('ผ่าน') ? '#4ade80' : '#fbbf24', fontWeight: 'bold' }}>
                    {ndviStats.who_status}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Green Deficit Calculator ── */}
          {ndviStats?.green_area_m2_per_person != null && ndviStats?.population > 0 && (() => {
            const current = ndviStats.green_area_m2_per_person;
            const deficit = Math.max(0, 9 - current);
            const deficitKm2 = (deficit * ndviStats.population / 1_000_000).toFixed(1);
            const deficitRai = Math.round(deficit * ndviStats.population / 1600).toLocaleString('th');
            const sev = current < 3
              ? { label: 'วิกฤต', color: '#ef4444', bg: '#fee2e2' }
              : current < 6
              ? { label: 'น้อยมาก', color: '#f97316', bg: '#ffedd5' }
              : current < 9
              ? { label: 'ต่ำกว่าเกณฑ์', color: '#f59e0b', bg: '#fffbeb' }
              : { label: 'ผ่านเกณฑ์', color: '#22c55e', bg: '#f0fdf4' };
            return (
              <div className="stat-card" key="green-deficit" style={{ borderLeft: `3px solid ${sev.color}` }}>
                <div className="stat-label">Green Deficit · ช่องว่างพื้นที่สีเขียว WHO</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', background: sev.bg, color: sev.color, padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>{sev.label}</span>
                  <span style={{ fontSize: '0.72rem', color: '#5f6368' }}>{current.toFixed(1)} / 9 m²/คน</span>
                </div>
                {deficit > 0 ? (
                  <>
                    <div style={{ fontSize: '0.82rem', color: '#202124', marginBottom: '8px' }}>
                      ต้องเพิ่มอีก <strong style={{ color: sev.color }}>{deficit.toFixed(1)} m²</strong> ต่อคน
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div style={{ background: '#f8f9fa', borderRadius: '4px', padding: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#9aa0a6' }}>พื้นที่ขาด</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: sev.color }}>{deficitKm2} km²</div>
                      </div>
                      <div style={{ background: '#f8f9fa', borderRadius: '4px', padding: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#9aa0a6' }}>เทียบเท่า</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f97316' }}>{deficitRai} ไร่</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#22c55e', fontWeight: '500' }}>
                    เกินมาตรฐาน WHO +{(current - 9).toFixed(1)} m²/คน
                  </div>
                )}
              </div>
            );
          })()}

          {/* Province NDVI monthly chart (hidden when district selected) */}
          {!selectedDistrict && (
            <div className="chart-section">
              <div className="chart-title">NDVI · Monthly Trend</div>
              {ndviLoading ? (
                <p className="data-note">กำลังคำนวณ NDVI รายเดือน...</p>
              ) : ndviMonthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={ndviMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fill: '#5f6368', fontSize: 10 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                    <YAxis domain={[0, 1]} tick={{ fill: '#5f6368', fontSize: 10 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #dadce0', borderRadius: '4px', color: '#202124', fontSize: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                      formatter={(v) => [v?.toFixed(3), 'NDVI']} cursor={{ fill: '#f1f3f4' }} />
                    <Bar dataKey="ndvi" radius={[2, 2, 0, 0]}>
                      {ndviMonthly.map((entry, i) => <Cell key={i} fill={getNdviColor(entry.ndvi)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="data-note">ไม่มีข้อมูลรายเดือน</p>
              )}
              <p className="data-note" style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f3f4' }}>
                {ndviStats ? '* ข้อมูลจาก Sentinel-2 ผ่าน Google Earth Engine' : '* กำลังรอข้อมูลจาก GEE'}
              </p>
            </div>
          )}

          {/* Province LST card */}
          <div className="stat-card">
            <div className="stat-label">อุณหภูมิผิวพื้น (LST) · {selectedDistrict ? 'จังหวัด · ' : ''}Landsat 8/9</div>
            {lstLoading ? (
              <p className="stat-desc">กำลังดึงข้อมูล LST จาก Landsat...</p>
            ) : lstStats ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="stat-value" style={{ color: getLstColor(lstStats.lst_mean) }}>
                    {lstStats.lst_mean}°C
                  </span>
                  <span className="stat-desc">{getLstLabel(lstStats.lst_mean)}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.72rem', color: '#5f6368' }}>
                  <span>Min: {lstStats.lst_min}°C</span>
                  <span>Max: {lstStats.lst_max}°C</span>
                </div>
                <div style={{ marginTop: '8px', padding: '5px 8px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '4px', fontSize: '0.7rem', color: '#795548', lineHeight: '1.5' }}>
                  ⚠️ LST คืออุณหภูมิผิวพื้นดิน/พืช จากดาวเทียม<br />
                  สูงกว่าอุณหภูมิอากาศปกติ 5–20°C · Max = pixel ร้อนสุดในพื้นที่
                </div>
                {ndviStats?.ndvi_mean != null && (
                  <div style={{ marginTop: '8px', padding: '6px 8px', background: '#f8f9fa', borderRadius: '4px', fontSize: '0.72rem', color: '#5f6368', lineHeight: '1.5' }}>
                    NDVI {ndviStats.ndvi_mean.toFixed(3)} → LST {lstStats.lst_mean}°C
                    <br />
                    <span style={{ color: '#1e8e3e' }}>พื้นที่สีเขียวช่วยลดความร้อนผิวพื้น</span>
                  </div>
                )}
              </>
            ) : (
              <p className="stat-desc">—</p>
            )}
          </div>

          {/* Province LST monthly chart (hidden when district selected) */}
          {!selectedDistrict && lstMonthly.length > 0 && (
            <div className="chart-section">
              <div className="chart-title">อุณหภูมิผิวพื้น (LST) · Monthly Trend</div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={lstMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fill: '#5f6368', fontSize: 10 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                  <YAxis tick={{ fill: '#5f6368', fontSize: 10 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #dadce0', borderRadius: '4px', color: '#202124', fontSize: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                    formatter={(v) => [v?.toFixed(1) + '°C', 'LST']} cursor={{ fill: '#f1f3f4' }} />
                  <Bar dataKey="lst" radius={[2, 2, 0, 0]}>
                    {lstMonthly.map((entry, i) => <Cell key={i} fill={getLstColor(entry.lst)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="data-note" style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f3f4' }}>
                * ข้อมูลจาก Landsat 8/9 ผ่าน Google Earth Engine<br />
                * LST = อุณหภูมิผิวพื้นดาวเทียม สูงกว่าอุณหภูมิอากาศ 5–20°C
              </p>
            </div>
          )}
          {/* ── Urban Heat Island Risk ── */}
          {!selectedDistrict && ndviStats?.ndvi_mean != null && lstStats?.lst_mean != null && (() => {
            const ndvi = ndviStats.ndvi_mean;
            const lst  = lstStats.lst_mean;
            const uhi = (ndvi < 0.25 && lst >= 35)
              ? { label: 'วิกฤต UHI', color: '#ef4444', bg: '#fee2e2' }
              : ((ndvi < 0.3 && lst >= 32) || ndvi < 0.2)
              ? { label: 'เสี่ยงสูง', color: '#f97316', bg: '#ffedd5' }
              : (ndvi < 0.4 && lst >= 30)
              ? { label: 'เสี่ยงปานกลาง', color: '#f59e0b', bg: '#fffbeb' }
              : { label: 'เสี่ยงต่ำ', color: '#22c55e', bg: '#f0fdf4' };
            const cooling = ndvi < 0.5 ? ((0.5 - ndvi) * 10).toFixed(1) : null;
            return (
              <div className="stat-card" key="uhi" style={{ borderLeft: `3px solid ${uhi.color}` }}>
                <div className="stat-label">Urban Heat Island · ความเสี่ยงเกาะความร้อน</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', background: uhi.bg, color: uhi.color, padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>{uhi.label}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                  <div style={{ background: '#f8f9fa', borderRadius: '4px', padding: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#9aa0a6' }}>NDVI (พืชพรรณ)</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e8e3e' }}>{ndvi.toFixed(3)}</div>
                  </div>
                  <div style={{ background: '#f8f9fa', borderRadius: '4px', padding: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#9aa0a6' }}>อุณหภูมิผิวพื้น</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: uhi.color }}>{lst}°C</div>
                  </div>
                </div>
                {cooling && (
                  <div style={{ fontSize: '0.75rem', color: '#1e8e3e', background: '#f0fdf4', padding: '6px 8px', borderRadius: '4px', lineHeight: '1.5' }}>
                    ศักยภาพลดความร้อน ~<strong>{cooling}°C</strong><br />
                    <span style={{ color: '#5f6368' }}>หากเพิ่มพืชพรรณให้ NDVI ถึง 0.5</span>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

      {/* ── Trend Tab ── */}
      {sidebarTab === 'trend' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="chart-title">แนวโน้มรายปี · {selectedProvince}</div>
          {selectedDistrict && (
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '6px 10px' }}>
              ⚠ แสดงข้อมูลระดับจังหวัด (ยังไม่รองรับแนวโน้มระดับอำเภอ)
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.75rem', color: '#5f6368', marginBottom: '6px' }}>เลือกปีที่ต้องการ:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {AVAILABLE_YEARS.map(y => (
                <label key={y} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={trendYears.includes(y)} onChange={() => onToggleTrendYear(y)} style={{ accentColor: '#1a73e8' }} />
                  {y}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={metricBtnStyle(trendMetric === 'ndvi_mean')}      onClick={() => setTrendMetric('ndvi_mean')}>NDVI</button>
            <button style={metricBtnStyle(trendMetric === 'green_area_pct')} onClick={() => setTrendMetric('green_area_pct')}>พื้นที่สีเขียว %</button>
          </div>
          <button
            onClick={() => onFetchTrend(selectedProvinceEN, trendYears)}
            disabled={trendYears.length === 0 || trendLoading}
            style={{ padding: '8px', border: 'none', borderRadius: '4px', background: trendYears.length === 0 ? '#f1f3f4' : '#1a73e8', color: trendYears.length === 0 ? '#9aa0a6' : 'white', fontSize: '0.85rem', cursor: trendYears.length === 0 ? 'default' : 'pointer', fontWeight: '500' }}
          >
            {trendLoading ? '⏳ กำลังโหลด...' : '📈 ดูแนวโน้ม'}
          </button>
          {trendLoading ? (
            <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '6px', padding: '12px' }}>
              <p className="data-note" style={{ marginTop: 0, fontStyle: 'normal', color: '#1a73e8' }}>⏳ {trendProgress}</p>
              {trendData.length > 0 && <p className="data-note" style={{ marginTop: '4px' }}>โหลดแล้ว {trendData.length} ปี</p>}
            </div>
          ) : trendData.length > 0 ? (
            <div className="chart-section" style={{ padding: '12px' }}>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="year" tick={{ fill: '#5f6368', fontSize: 10 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                  <YAxis domain={trendMetric === 'ndvi_mean' ? [0, 1] : [0, 100]} tick={{ fill: '#5f6368', fontSize: 10 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '12px' }}
                    formatter={(v) => [trendMetric === 'ndvi_mean' ? v?.toFixed(3) : `${v?.toFixed(1)}%`, trendMetric === 'ndvi_mean' ? 'NDVI' : 'พื้นที่สีเขียว']} />
                  <Line type="monotone" dataKey={trendMetric} stroke="#1a73e8" strokeWidth={2}
                    dot={{ r: 4, fill: '#1a73e8', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="data-note">* แสดงเฉพาะปีที่มีข้อมูลใน cache ({trendData.length} ปี)</p>
            </div>
          ) : (
            <p className="data-note">กดปุ่มเพื่อโหลดข้อมูลจากปีที่เลือก</p>
          )}
        </div>
      )}

      {/* ── Compare Tab ── */}
      {sidebarTab === 'compare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="chart-title">เปรียบเทียบจังหวัด</div>
          {selectedDistrict && (
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '6px 10px' }}>
              ⚠ แสดงข้อมูลระดับจังหวัด (ยังไม่รองรับเปรียบเทียบระดับอำเภอ)
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.75rem', color: '#5f6368', marginBottom: '6px' }}>จังหวัดที่เลือก:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px', minHeight: '28px' }}>
              {compareList.length === 0 ? (
                <span style={{ fontSize: '0.75rem', color: '#9aa0a6' }}>ยังไม่มีจังหวัด</span>
              ) : compareList.map(p => (
                <span key={p} style={{ background: '#e8f0fe', color: '#1a73e8', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {PROVINCE_TH[p] || p}
                  <button onClick={() => onRemoveFromCompare(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', padding: '0', lineHeight: 1, fontSize: '1rem' }}>×</button>
                </span>
              ))}
            </div>
            <button
              onClick={() => onAddToCompare(selectedProvinceEN)}
              disabled={compareList.includes(selectedProvinceEN)}
              style={{ padding: '5px 12px', border: '1px solid #dadce0', borderRadius: '4px', background: compareList.includes(selectedProvinceEN) ? '#f1f3f4' : '#fff', color: compareList.includes(selectedProvinceEN) ? '#9aa0a6' : '#1a73e8', fontSize: '0.8rem', cursor: compareList.includes(selectedProvinceEN) ? 'default' : 'pointer' }}
            >
              + เพิ่ม {selectedProvince}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#5f6368' }}>ปี:</span>
            <select value={compareYear} onChange={e => setCompareYear(Number(e.target.value))}
              style={{ border: '1px solid #dadce0', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', color: '#202124', background: '#fff' }}>
              {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={metricBtnStyle(compareMetric === 'ndvi_mean')}      onClick={() => setCompareMetric('ndvi_mean')}>NDVI</button>
            <button style={metricBtnStyle(compareMetric === 'green_area_pct')} onClick={() => setCompareMetric('green_area_pct')}>พื้นที่สีเขียว %</button>
          </div>
          <button
            onClick={() => onFetchCompare(compareList, compareYear)}
            disabled={compareList.length < 2 || compareLoading}
            style={{ padding: '8px', border: 'none', borderRadius: '4px', background: compareList.length < 2 ? '#f1f3f4' : '#1a73e8', color: compareList.length < 2 ? '#9aa0a6' : 'white', fontSize: '0.85rem', cursor: compareList.length < 2 ? 'default' : 'pointer', fontWeight: '500' }}
          >
            {compareLoading ? '⏳ กำลังโหลด...' : `📊 เปรียบเทียบ ${compareList.length} จังหวัด`}
          </button>
          {compareList.length < 2 && (
            <p className="data-note">คลิกจังหวัดบนแผนที่ แล้วกด "+ เพิ่ม" อย่างน้อย 2 จังหวัด</p>
          )}
          {!compareLoading && compareData.length > 0 && (
            <div className="chart-section" style={{ padding: '12px' }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={compareData.map(d => ({ ...d, nameTH: PROVINCE_TH[d.province] || d.province }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 36 }}>
                  <XAxis dataKey="nameTH" tick={{ fill: '#5f6368', fontSize: 9, angle: -35, textAnchor: 'end' }} interval={0} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                  <YAxis domain={compareMetric === 'ndvi_mean' ? [0, 1] : [0, 100]} tick={{ fill: '#5f6368', fontSize: 10 }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '12px' }}
                    formatter={(v) => [compareMetric === 'ndvi_mean' ? v?.toFixed(3) : `${v?.toFixed(1)}%`, compareMetric === 'ndvi_mean' ? 'NDVI' : 'พื้นที่สีเขียว']} />
                  <Bar dataKey={compareMetric} radius={[2, 2, 0, 0]}>
                    {compareData.map((entry, i) => <Cell key={i} fill={getNdviColor(entry.ndvi_mean)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="data-note">* แสดงเฉพาะจังหวัดที่มีข้อมูลใน cache ({compareData.length}/{compareList.length} จังหวัด)</p>
            </div>
          )}
        </div>
      )}

      {/* ── Recommend Tab ── */}
      {sidebarTab === 'recommend' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a73e8,#22c55e)', borderRadius: '8px', padding: '12px', color: 'white' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '4px' }}>
              🤖 AI Planting Recommendation
            </div>
            <div style={{ fontSize: '0.72rem', opacity: 0.95, lineHeight: 1.5 }}>
              วิเคราะห์ NDVI ต่ำ + LST สูง + ประชากรหนาแน่น (WorldPop)
              เพื่อหาจุดที่ <strong>ควรปลูกต้นไม้มากที่สุด</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => onFetchRecommend(selectedProvinceEN, selectedDistrict ? selectedDistrict : null)}
              disabled={recommendLoading}
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', background: recommendLoading ? '#dadce0' : '#1a73e8', color: 'white', fontSize: '0.8rem', cursor: recommendLoading ? 'default' : 'pointer', fontWeight: '500' }}
            >
              {recommendLoading
                ? '⏳ กำลังวิเคราะห์...'
                : `🔍 วิเคราะห์${selectedDistrict ? 'อำเภอ ' + selectedDistrict : 'จังหวัด ' + selectedProvince}`}
            </button>
          </div>

          {recommendData && (
            <>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={onToggleRecommend} style={metricBtnStyle(recommendVisible)}>
                  {recommendVisible ? '👁 ซ่อน Heatmap' : '👁 แสดง Heatmap'}
                </button>
                <button onClick={onClearRecommend} style={metricBtnStyle(false)}>✕ ล้างผล</button>
              </div>

              {/* Weight breakdown */}
              <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: '#5f6368', fontWeight: '600', marginBottom: '6px' }}>
                  น้ำหนักตัวแปร (Priority Score)
                </div>
                {[
                  { k: 'NDVI ต่ำ (ขาดต้นไม้)', v: recommendData.weights.ndvi, c: '#22c55e' },
                  { k: 'LST สูง (ความร้อน)',    v: recommendData.weights.lst,  c: '#ef4444' },
                  { k: 'ประชากรหนาแน่น',         v: recommendData.weights.population, c: '#1a73e8' },
                ].map(({ k, v, c }) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#202124', flex: 1 }}>{k}</span>
                    <div style={{ flex: 1, height: '5px', background: '#e5e7eb', borderRadius: '3px' }}>
                      <div style={{ width: `${v * 100}%`, height: '100%', background: c, borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#5f6368', width: '30px', textAlign: 'right' }}>
                      {(v * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Color legend */}
              <div style={{ background: '#fff', border: '1px solid #dadce0', borderRadius: '6px', padding: '8px 10px' }}>
                <div style={{ fontSize: '0.72rem', color: '#5f6368', fontWeight: '600', marginBottom: '6px' }}>
                  สเกลความเร่งด่วน (Priority Score)
                </div>
                <div style={{ height: '10px', borderRadius: '3px', background: 'linear-gradient(to right, #1a9850, #a6d96a, #ffffbf, #fdae61, #d73027)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#9aa0a6', marginTop: '3px' }}>
                  <span>ต่ำ (ไม่จำเป็น)</span>
                  <span>สูง (ควรปลูกด่วน)</span>
                </div>
              </div>

              {/* Top 10 list */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: '#202124', marginBottom: '6px' }}>
                  📍 Top 10 จุดที่ควรปลูกต้นไม้
                </div>
                {recommendData.top_locations?.length > 0 ? recommendData.top_locations.map((p, i) => {
                  const sev = p.score >= 0.7 ? '#dc2626' : p.score >= 0.5 ? '#f97316' : '#f59e0b';
                  return (
                    <a
                      key={i}
                      href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                      target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: i % 2 === 0 ? '#fff' : '#fafafa', borderRadius: '4px', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
                    >
                      <span style={{ minWidth: '22px', height: '22px', borderRadius: '50%', background: sev, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.7rem' }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.7rem', color: '#5f6368' }}>
                        {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                      </div>
                      <span style={{ color: sev, fontWeight: '700', fontFamily: 'monospace' }}>{p.score.toFixed(2)}</span>
                      <span style={{ color: '#9aa0a6', fontSize: '0.7rem' }}>↗</span>
                    </a>
                  );
                }) : (
                  <p className="data-note">ไม่พบจุดที่เหมาะสม</p>
                )}
                <p className="data-note" style={{ marginTop: '6px' }}>
                  * คลิกที่พิกัดเพื่อเปิดใน Google Maps
                </p>
              </div>

              {recommendData.from_cache && (
                <div style={{ fontSize: '0.7rem', color: '#9aa0a6', textAlign: 'center' }}>
                  ⚡ จาก cache · {new Date(recommendData.cached_at).toLocaleString('th')}
                </div>
              )}
            </>
          )}

          {!recommendData && !recommendLoading && (
            <p className="data-note" style={{ lineHeight: 1.6 }}>
              กดปุ่มด้านบนเพื่อให้ AI วิเคราะห์ <br />
              ผลลัพธ์ใช้สูตรถ่วงน้ำหนักจาก:<br />
              • Sentinel-2 NDVI (Google Earth Engine)<br />
              • Landsat 8/9 LST<br />
              • WorldPop population density 100m
            </p>
          )}
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        <button className="reset-btn" onClick={onReset}>← กลับดูทั้งประเทศ</button>
      </div>
    </div>
  );
}
