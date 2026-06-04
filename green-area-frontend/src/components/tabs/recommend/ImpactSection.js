// Projected impact of planting — trees / CO₂ / cooling, with per-species breakdown.
export default function ImpactSection({ impact }) {
  if (!(impact && impact.trees_total > 0)) return null;

  return (
    <section className="section">
      <div className="section__head">
        <span className="section__title">ผลกระทบที่คาดการณ์</span>
        <span className="section__meta">ปลูกครบทั้งพื้นที่ priority สูง</span>
      </div>
      <div className="impact">
        <div className="impact__cell">
          <div className="impact__label">ต้นไม้รวม</div>
          <div className="impact__num">{impact.trees_total.toLocaleString()}</div>
          <div className="impact__hint">
            ใน {impact.plantable_area_km2} km² ({impact.plantable_area_ha.toLocaleString()} ไร่)
          </div>
        </div>
        <div className="impact__cell">
          <div className="impact__label">CO₂ ดูดซับ/ปี</div>
          <div className="impact__num">{impact.annual_co2_tonnes.toLocaleString()} <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>ตัน</span></div>
          <div className="impact__hint">
            เทียบเท่ารถยนต์ ~{impact.equivalent_cars_off_road.toLocaleString()} คัน
          </div>
        </div>
        <div className="impact__cell impact__cell--full">
          <div className="impact__label">อุณหภูมิที่คาดว่าจะลดลง</div>
          <div className="impact__num">{impact.expected_delta_lst_c}°C</div>
          <div className="impact__hint">
            เมื่อ canopy เต็มที่ ~{impact.maturity_years} ปี
          </div>
        </div>
      </div>

      {impact.species_breakdown?.length > 0 && (
        <details>
          <summary className="helper" style={{ cursor: 'pointer', userSelect: 'none', padding: '4px 0' }}>
            รายละเอียดต่อพันธุ์ · {impact.species_breakdown.length} ชนิด
          </summary>
          <div style={{ marginTop: 4 }}>
            {impact.species_breakdown.map((sp, i) => (
              <div key={i} className="rank-row">
                <span className="rank-row__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="rank-row__name">{sp.name_th}</span>
                <span className="rank-row__val">{sp.trees.toLocaleString()} ต้น · {sp.kg_co2_per_tree} kg/ต้น</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="helper">
        ค่าประมาณการตามสัมประสิทธิ์มาตรฐาน · ขึ้นกับดิน อายุ ระยะปลูก<br />
        อ้างอิง: {impact.methodology?.sources?.join(' · ') || 'IPCC + Bowler 2010'}
      </div>
    </section>
  );
}
