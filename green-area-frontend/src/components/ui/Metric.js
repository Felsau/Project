export function Figure({ value, unit, tag, progress }) {
  return (
    <>
      <div className="figure">
        <span className="figure__num">{value}</span>
        {unit && <span className="figure__unit">{unit}</span>}
        {tag && <span className="figure__tag">{tag}</span>}
      </div>
      {progress != null && (
        <div className="bar">
          <div
            className="bar__fill"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </>
  );
}

export function KVRow({ children, cols }) {
  return <div className={`kv-row${cols === 3 ? ' kv-row--3' : ''}`}>{children}</div>;
}

export function KV({ label, value, hint }) {
  return (
    <div className="kv">
      <div className="kv__label">{label}</div>
      <div className="kv__value">{value}</div>
      {hint && <div className="kv__hint">{hint}</div>}
    </div>
  );
}

export function Note({ tone = 'default', label, children }) {
  const cls = tone === 'warn' ? 'note note--warn'
            : tone === 'crit' ? 'note note--crit'
            : 'note';
  return (
    <div className={cls}>
      {label && <span className="note__label">{label}</span>}
      {children}
    </div>
  );
}
