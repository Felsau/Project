import React from 'react';

/**
 * Toast message — paper card with a 2px tone edge. Controlled: render in a
 * fixed stack near the top-right (top: 52, right: 16).
 */
export function Toast({ type = 'info', children, onDismiss }) {
  const isErr = type === 'error';
  return (
    <div
      role={isErr ? 'alert' : 'status'}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-strong)',
        borderLeft: `2px solid ${isErr ? 'var(--crit)' : 'var(--brand)'}`,
        color: 'var(--text-body)',
        borderRadius: 'var(--rad-sm)',
        padding: '10px 12px',
        fontSize: 'var(--t-sm)',
        lineHeight: 1.5,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        maxWidth: 340,
      }}
    >
      <span style={{ flex: 1 }}>{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="ปิดข้อความ"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: 0, lineHeight: 1 }}
        >×</button>
      )}
    </div>
  );
}

/** Live status dot + label. state: 'ready' | 'loading' | 'empty'. */
export function StatusDot({ state = 'ready', children }) {
  return <span className="status-dot" data-state={state}>{children}</span>;
}
