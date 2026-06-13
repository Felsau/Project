import React from 'react';

/** Brand diamond mark + optional wordmark. Pure CSS/SVG — no image dependency. */
export function BrandMark({ size = 14, withWordmark = false, label = 'GreenLens' }) {
  const diamond = (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: 'var(--brand)',
        transform: 'rotate(45deg)',
        display: 'inline-block',
        flex: 'none',
      }}
    />
  );
  if (!withWordmark) return diamond;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.7) }}>
      {diamond}
      <span
        style={{
          fontWeight: 'var(--w-bold)',
          letterSpacing: 'var(--track-display)',
          color: 'var(--text-strong)',
          fontSize: Math.round(size * 1.3),
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </span>
  );
}
