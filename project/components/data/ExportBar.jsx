import React from 'react';

/**
 * Export control strip — flat joined buttons (CSV / PNG / PDF / PNG + แผนที่).
 * buttons: [{ id, label }]. busy: id of the in-flight action.
 */
export function ExportBar({ buttons, busy = null, onAction, title = 'ส่งออกข้อมูล' }) {
  return (
    <div className="section">
      <div className="section__head section__head--quiet">
        <span className="section__title">{title}</span>
      </div>
      <div className="export-bar">
        {buttons.map((b) => (
          <button
            key={b.id}
            type="button"
            className="export-btn"
            disabled={!!busy}
            onClick={() => onAction && onAction(b.id)}
          >
            {busy === b.id ? '…' : b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
