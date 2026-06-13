import React from 'react';

/** Uppercase tracked form label. */
export function Label({ htmlFor, children }) {
  return <label className="label" htmlFor={htmlFor}>{children}</label>;
}

/** Text input styled as the system field. */
export function Field({ id, value, onChange, placeholder, type = 'text', disabled, ...rest }) {
  return (
    <input
      id={id}
      type={type}
      className="field"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      {...rest}
    />
  );
}

/** Native select styled as the system field. */
export function Select({ id, value, onChange, disabled, children, ...rest }) {
  return (
    <select id={id} className="field" value={value} onChange={onChange} disabled={disabled} {...rest}>
      {children}
    </select>
  );
}
