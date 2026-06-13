import React from 'react';

/** Sidebar tab strip. tabs: [{id, label}]. Active tab gets the ink underline. */
export function Tabs({ tabs, active, onChange }) {
  return (
    <nav className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          className="tab"
          data-active={active === t.id}
          aria-selected={active === t.id}
          onClick={() => onChange && onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
