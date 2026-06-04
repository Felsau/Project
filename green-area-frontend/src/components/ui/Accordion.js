import { useState } from 'react';

export default function Accordion({ title, meta, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="collapsible" data-open={open}>
      <button
        type="button"
        className="collapsible__head"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span className="collapsible__title">{title}</span>
        {meta && <span className="collapsible__meta">{meta}</span>}
        <span className="collapsible__chev" aria-hidden="true">▾</span>
      </button>
      {open && <div className="collapsible__body">{children}</div>}
    </section>
  );
}
