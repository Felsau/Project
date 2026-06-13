import React from 'react';

/** Section header — uppercase tracked title + right-aligned meta, hairline rule. */
export function SectionHead({ title, meta, quiet = false }) {
  return (
    <div className={quiet ? 'section__head section__head--quiet' : 'section__head'}>
      <span className="section__title">{title}</span>
      {meta ? <span className="section__meta">{meta}</span> : null}
    </div>
  );
}

/** Section wrapper — vertical stack with system gap. */
export function Section({ children }) {
  return <div className="section">{children}</div>;
}

/** Collapsible section with chevron; header styled like SectionHead. */
export function Collapsible({ title, meta, defaultOpen = true, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className="collapsible" data-open={open}>
      <button type="button" className="collapsible__head" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        <span className="collapsible__title">{title}</span>
        {meta ? <span className="collapsible__meta">{meta}</span> : null}
        <span className="collapsible__chev" aria-hidden="true">▾</span>
      </button>
      {open && <div className="collapsible__body">{children}</div>}
    </section>
  );
}
