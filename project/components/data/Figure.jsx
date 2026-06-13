import React from 'react';

/** Big typographic stat — mono numeral + unit, optional progress bar. */
export function Figure({ value, unit, tag, progress }) {
  return (
    <>
      <div className="figure">
        <span className="figure__num">{value}</span>
        {unit ? <span className="figure__unit">{unit}</span> : null}
        {tag ? <span className="figure__tag">{tag}</span> : null}
      </div>
      {progress != null && (
        <div className="bar">
          <div className="bar__fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}></div>
        </div>
      )}
    </>
  );
}

/** Bordered grid of quiet stat boxes; 2 or 3 columns. */
export function KVRow({ children, cols = 2 }) {
  return <div className={`kv-row${cols === 3 ? ' kv-row--3' : ''}`}>{children}</div>;
}

/** One quiet stat box — uppercase label, mono value, optional hint. */
export function KV({ label, value, hint }) {
  return (
    <div className="kv">
      <div className="kv__label">{label}</div>
      <div className="kv__value">{value}</div>
      {hint ? <div className="kv__hint">{hint}</div> : null}
    </div>
  );
}

/** Derived-finding note. tone: 'default' (green) | 'warn' | 'crit'. */
export function Note({ tone = 'default', label, children }) {
  const cls = tone === 'warn' ? 'note note--warn' : tone === 'crit' ? 'note note--crit' : 'note';
  return (
    <div className={cls}>
      {label ? <span className="note__label">{label}</span> : null}
      {children}
    </div>
  );
}

/** "label : value" definition rows with dotted leaders. */
export function DefList({ items }) {
  return (
    <dl className="dl">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <dt>{it.label}</dt>
          <dd>{it.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
