// Sidebar — search, tabs, context header, tab panels, footer.
// Faithful to Sidebar.js / StatsTab.js / OverviewPanel.js upstream.
const {
  Figure, KVRow, KV, Note, Collapsible, ExportBar, Tabs: GLTabs, StatusDot, Chip,
} = window.GreenLensDesignSystem_4a358a;
const { useState } = React;

const SIDEBAR_TABS = [
  { id: 'stats', label: 'ข้อมูล' },
  { id: 'trend', label: 'แนวโน้ม' },
  { id: 'cooling', label: 'ความเย็น' },
  { id: 'compare', label: 'เปรียบเทียบ' },
  { id: 'recommend', label: 'AI แนะนำ' },
];

/* Tiny monthly bar chart — typographic, axis-free, like the product's. */
function MonthlyChart({ data, kind }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const color = (v) => kind === 'lst'
    ? (v >= 38 ? 'var(--lst-crit)' : v >= 35 ? 'var(--lst-hot)' : v >= 30 ? 'var(--lst-mild)' : 'var(--lst-cool)')
    : (v >= 0.6 ? 'var(--ndvi-3)' : v >= 0.45 ? 'var(--ndvi-2)' : v >= 0.3 ? 'var(--ndvi-1)' : 'var(--ndvi-0)');
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, alignItems: 'end', height: 56 }}>
        {data.map((v, i) => (
          <div key={i} title={`${GL_MONTH_LABELS[i]} · ${v}`} style={{
            height: `${10 + ((v - min) / (max - min || 1)) * 90}%`,
            background: color(v), borderRadius: 1,
          }}></div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span className="helper">{GL_MONTH_LABELS[0]}</span>
        <span className="helper">{GL_MONTH_LABELS[11]}</span>
      </div>
    </div>
  );
}

function StatsPanel({ province, district, onClearDistrict }) {
  const [busy, setBusy] = useState(null);
  const exportButtons = [
    { id: 'csv', label: 'CSV' }, { id: 'png', label: 'PNG' },
    { id: 'pdf', label: 'PDF' }, { id: 'map', label: 'PNG + แผนที่' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {district && (
        <div style={{
          padding: '10px 12px', background: 'var(--paper)', border: '1px solid var(--rule)',
          borderLeft: '2px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div>
            <div className="kv__label">อำเภอที่เลือก</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-0)' }}>{district.th}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
              {district.area.toLocaleString()} km²
            </div>
          </div>
          <button className="btn--text" onClick={onClearDistrict}>ล้าง</button>
        </div>
      )}

      <Collapsible title={district ? 'NDVI · จังหวัด' : 'NDVI · พื้นที่สีเขียว'} meta="Sentinel-2 / annual" defaultOpen>
        <Figure
          value={province.ndvi.toFixed(2)}
          unit="ค่าเฉลี่ยทั้งปี"
          tag={getNdviLabel(province.ndvi)}
          progress={province.ndvi * 100}
        />
        <KVRow cols={3}>
          <KV label="Min" value={(province.ndvi - 0.12).toFixed(2)} />
          <KV label="Max" value={(province.ndvi + 0.22).toFixed(2)} />
          <KV label="พื้นที่จังหวัด" value={province.area.toLocaleString()} hint="km²" />
        </KVRow>
        <KVRow>
          <KV label="พื้นที่สีเขียว (NDVI > 0.3)" value={`${province.green_pct}%`}
            hint={`${province.green_km2.toLocaleString()} km²`} />
          <KV label="ต่อหัวประชากร" value={`${province.per_person.toFixed(1)} m²`} hint={province.who} />
        </KVRow>
        <div>
          <div className="label">NDVI รายเดือน</div>
          <MonthlyChart data={GL_MONTHLY_NDVI} kind="ndvi" />
          <div className="helper" style={{ marginTop: 4 }}>ข้อมูลจาก Sentinel-2 ผ่าน Google Earth Engine</div>
        </div>
      </Collapsible>

      {province.per_person < 9 && (
        <Note tone="crit" label="Green deficit">
          พื้นที่สีเขียวต่อหัว <span className="note__num">{province.per_person.toFixed(1)} m²</span> ต่ำกว่าเกณฑ์ WHO
          (<span className="note__num">9 m²</span>) — ขาดอีก <span className="note__num">{(9 - province.per_person).toFixed(1)} m²/คน</span>
        </Note>
      )}

      <Collapsible title="อุณหภูมิผิวพื้น" meta="Landsat 8/9" defaultOpen={false}>
        <Figure value={`${province.lst.toFixed(1)}°C`} tag={getLstLabel(province.lst)} />
        <KVRow>
          <KV label="Min" value={`${(province.lst - 4.1).toFixed(1)}°C`} />
          <KV label="Max" value={`${(province.lst + 5.3).toFixed(1)}°C`} />
        </KVRow>
        <Note tone="warn">
          LST คืออุณหภูมิผิวพื้น สูงกว่าอุณหภูมิอากาศ 5–20°C · Max = พิกเซลร้อนสุดในพื้นที่
        </Note>
        <div>
          <div className="label">รายเดือน</div>
          <MonthlyChart data={GL_MONTHLY_LST} kind="lst" />
        </div>
      </Collapsible>

      {province.lst >= 34 && province.ndvi < 0.3 && (
        <Note tone="warn" label="ความเสี่ยงเกาะความร้อนเมือง">
          NDVI ต่ำ + LST สูง — พื้นที่นี้เข้าเงื่อนไข urban heat island ควรเพิ่มพื้นที่สีเขียวในเขตเมืองชั้นใน
        </Note>
      )}

      <ExportBar buttons={exportButtons} busy={busy}
        onAction={(id) => { setBusy(id); setTimeout(() => setBusy(null), 900); }} />
    </div>
  );
}

function OverviewPanel({ onSelectProvince }) {
  const [year, setYear] = useState(GL_YEARS[0]);
  const [loaded, setLoaded] = useState(true);
  const [busy, setBusy] = useState(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section className="section">
        <div className="section__head"><span className="section__title">โหลดอันดับรายปี</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="field" style={{ width: 100 }} value={year} onChange={e => setYear(Number(e.target.value))}>
            {GL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => setLoaded(true)}>โหลดอันดับ</button>
        </div>
        <div className="helper">42 จังหวัดอยู่ในแคชแล้ว · แสดงเป็น 3D บนแผนที่</div>
      </section>

      {loaded && (
        <>
          <section className="section">
            <div className="section__head">
              <span className="section__title">สรุปปี {year}</span>
              <span className="section__meta">62 / 77 จังหวัด</span>
            </div>
            <KVRow>
              <KV label="ผ่าน WHO" value="48" hint="77% ของที่จัดอันดับ" />
              <KV label="ต่ำกว่า WHO" value="14" hint="23% ของที่จัดอันดับ" />
            </KVRow>
            <div className="bar" style={{ marginTop: 4 }}><div className="bar__fill" style={{ width: '77%' }}></div></div>
            <div className="coverage">
              <div className="coverage__head">
                <span className="helper">ความครอบคลุมข้อมูลปี {year}</span>
                <span className="coverage__count">62 / 77</span>
              </div>
              <div className="bar"><div className="bar__fill" style={{ width: '81%' }}></div></div>
              <div className="coverage__row">
                <span className="helper">ยังไม่มีข้อมูล 15 จังหวัด</span>
                <button className="btn btn--sm btn--primary">คำนวณจังหวัดที่ยังไม่มี</button>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section__head"><span className="section__title">ห้าจังหวัดที่ขาดแคลนพื้นที่สีเขียวที่สุด</span></div>
            <div className="rank-table">
              {GL_RANKING_WORST.map(r => (
                <button key={r.rank} className="rank-row" style={{ background: 'none', border: 'none', borderBottom: '1px dotted var(--rule)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  onClick={() => onSelectProvince(r.th)}>
                  <span className="rank-row__num">{String(r.rank).padStart(2, '0')}</span>
                  <span className="rank-row__name">{r.th}</span>
                  <span className="rank-row__val">{r.val.toFixed(1)} m²</span>
                </button>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section__head"><span className="section__title">ห้าจังหวัดที่มีพื้นที่สีเขียวมากที่สุด</span></div>
            <div className="rank-table">
              {GL_RANKING_BEST.map(r => (
                <div className="rank-row" key={r.rank}>
                  <span className="rank-row__num">{String(r.rank).padStart(2, '0')}</span>
                  <span className="rank-row__name">{r.th}</span>
                  <span className="rank-row__val">{r.val.toFixed(1)} m²</span>
                </div>
              ))}
            </div>
          </section>

          <ExportBar buttons={[{ id: 'csv', label: 'CSV' }, { id: 'png', label: 'PNG' }, { id: 'pdf', label: 'PDF' }]}
            busy={busy} onAction={(id) => { setBusy(id); setTimeout(() => setBusy(null), 900); }} />
        </>
      )}
    </div>
  );
}

function RecommendPanel() {
  const [w, setW] = useState({ green: 40, heat: 30, pop: 30 });
  const locs = [
    { n: 1, name: 'เขตคลองเตย — ริมทางรถไฟ', score: 0.91 },
    { n: 2, name: 'เขตบางซื่อ — ลานจอดรถไฟฟ้า', score: 0.87 },
    { n: 3, name: 'เขตดินแดง — แนวถนนวิภาวดี', score: 0.84 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section className="section">
        <div className="section__head">
          <span className="section__title">น้ำหนักการจัดลำดับ</span>
          <span className="section__meta">รวม {w.green + w.heat + w.pop}%</span>
        </div>
        {[['green', 'ขาดสีเขียว'], ['heat', 'ความร้อน'], ['pop', 'ประชากร']].map(([k, label]) => (
          <div className="weight-row" key={k}>
            <span className="helper">{label}</span>
            <input type="range" min="0" max="100" value={w[k]} onChange={e => setW({ ...w, [k]: Number(e.target.value) })} />
            <span className="coverage__count">{w[k]}%</span>
          </div>
        ))}
      </section>
      <section className="section">
        <div className="section__head"><span className="section__title">จุดที่ควรปลูกที่สุด</span><span className="section__meta">Top 3</span></div>
        <div className="rank-table">
          {locs.map(l => (
            <div className="rank-row" key={l.n}>
              <span className="rank-row__num">{String(l.n).padStart(2, '0')}</span>
              <span className="rank-row__name">{l.name}</span>
              <span className="rank-row__val">{l.score.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>
      <Note label="พันธุ์ไม้แนะนำ · ภาคกลาง">
        ประดู่บ้าน · ตะแบกนา · ขี้เหล็กบ้าน — โตเร็ว ทนแล้ง ร่มเงากว้าง เหมาะแนวถนนและพื้นที่ว่างเขตเมือง
      </Note>
    </div>
  );
}

function PlaceholderPanel({ text }) {
  return <div className="empty">{text}</div>;
}

function SidebarView({ province, district, tab, setTab, onSelectProvince, onClearDistrict, onReset }) {
  const [q, setQ] = useState('');
  const matches = q
    ? GL_PROVINCES.filter(p => p.th.includes(q) || p.en.toLowerCase().includes(q.toLowerCase()))
    : [];
  return (
    <aside className="side" style={{ minHeight: 0 }}>
      <div className="psearch-bar">
        <div className="psearch">
          <input className="field psearch__input" placeholder="ค้นหาจังหวัด…" value={q}
            onChange={e => setQ(e.target.value)} />
          {matches.length > 0 && (
            <div className="psearch__list">
              {matches.map(p => (
                <button key={p.en} type="button" className="psearch__item"
                  onClick={() => { onSelectProvince(p.th); setQ(''); }}>
                  <span className="psearch__th">{p.th}</span>
                  <span className="psearch__en">{p.en}</span>
                  <span className="psearch__dot" style={{ background: p.ndvi >= 0.45 ? 'var(--ndvi-2)' : p.ndvi >= 0.3 ? 'var(--ndvi-1)' : 'var(--ndvi-0)' }}></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {province ? (
        <>
          <GLTabs tabs={SIDEBAR_TABS} active={tab} onChange={setTab} />
          <div className="context">
            <div className="context__crumb">{district ? 'จังหวัด / อำเภอ' : 'จังหวัด'}</div>
            <div className="context__title">{province.th}</div>
            {district && <div className="context__sub">{district.th}</div>}
            <div className="context__status">
              <StatusDot state="ready">ข้อมูลสด · Sentinel-2</StatusDot>
            </div>
          </div>
          <div className="panel">
            <div className="panel__inner">
              {tab === 'stats' && <StatsPanel province={province} district={district} onClearDistrict={onClearDistrict} />}
              {tab === 'recommend' && <RecommendPanel />}
              {tab === 'trend' && <PlaceholderPanel text="แนวโน้มหลายปี + พยากรณ์ OLS — แผงนี้เว้นไว้ในชุด UI (ดูผลิตภัณฑ์จริง)" />}
              {tab === 'cooling' && <PlaceholderPanel text="Regression ของ LST ต่อ NDVI รายอำเภอ — แผงนี้เว้นไว้ในชุด UI (ดูผลิตภัณฑ์จริง)" />}
              {tab === 'compare' && <PlaceholderPanel text="เปรียบเทียบหลายจังหวัด — แผงนี้เว้นไว้ในชุด UI (ดูผลิตภัณฑ์จริง)" />}
            </div>
          </div>
          <div className="panel__footer">
            <button className="btn--text" onClick={onReset}>← ดูภาพรวมประเทศ</button>
          </div>
        </>
      ) : (
        <>
          <div className="context">
            <div className="context__crumb">ประเทศไทย</div>
            <div className="context__title">ดัชนีพื้นที่สีเขียว</div>
            <div className="context__status">
              <span className="helper">คลิกจังหวัดบนแผนที่เพื่อดูข้อมูลเชิงลึก</span>
            </div>
          </div>
          <div className="panel">
            <div className="panel__inner">
              <OverviewPanel onSelectProvince={onSelectProvince} />
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

window.SidebarView = SidebarView;
window.GLMonthlyChart = MonthlyChart;
