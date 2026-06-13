import React from 'react';

/** Toggle chip — metric / year selection. Active = solid ink, not green. */
export function Chip({ active = false, disabled, onClick, children }) {
  return (
    <button type="button" className="chip" data-active={active} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
