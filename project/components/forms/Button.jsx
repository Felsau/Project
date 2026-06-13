import React from 'react';

/**
 * Button — quiet bordered default; one green primary per view at most.
 * variant: 'default' | 'primary' | 'text'
 */
export function Button({ variant = 'default', size, full = false, disabled, children, onClick, type = 'button', ...rest }) {
  if (variant === 'text') {
    return (
      <button type={type} className="btn--text" disabled={disabled} onClick={onClick} {...rest}>
        {children}
      </button>
    );
  }
  const cls = [
    'btn',
    variant === 'primary' ? 'btn--primary' : '',
    size === 'sm' ? 'btn--sm' : '',
    full ? 'btn--full' : '',
  ].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
