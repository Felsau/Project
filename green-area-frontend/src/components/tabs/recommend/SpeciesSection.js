// Recommended tree species for the region — name / traits / planting rationale.
export default function SpeciesSection({ recommendedSpecies }) {
  if (!(recommendedSpecies?.species?.length > 0)) return null;

  return (
    <section className="section">
      <div className="section__head">
        <span className="section__title">พันธุ์ไม้แนะนำ</span>
        {recommendedSpecies.region && (
          <span className="section__meta">ภาค{recommendedSpecies.region}</span>
        )}
      </div>
      <div>
        {recommendedSpecies.species.map((sp, i) => (
          <div className="species" key={i}>
            <div>
              <span className="species__name">{sp.name_th}</span>
              <span className="species__sci">{sp.scientific}</span>
            </div>
            <div className="species__tags">
              <span className="species__tag">{sp.purpose}</span>
              <span className="species__tag">สูง {sp.height_m} ม.</span>
              {sp.traits?.map((t, j) => (
                <span key={j} className="species__tag">{t}</span>
              ))}
            </div>
            <div className="species__reason">{sp.reason}</div>
          </div>
        ))}
      </div>
      <div className="helper">คัดเลือกจากพันธุ์ที่เหมาะกับภูมิอากาศและดินของแต่ละภาค</div>
    </section>
  );
}
