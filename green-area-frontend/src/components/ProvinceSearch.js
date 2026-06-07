import { useState, useRef, useEffect, useMemo } from 'react';

// Searchable province picker. Filters by Thai or English name as you type;
// click or Enter selects. A dot marks provinces that already have cached data.
export default function ProvinceSearch({ provinces, onSelect, ndviCache = {} }) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const [active, setActive] = useState(0);
  const rootRef   = useRef(null);
  const activeRef = useRef(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return provinces;
    return provinces.filter(p => p.th.includes(q) || p.en.toLowerCase().includes(q));
  }, [query, provinces]);

  // Close when clicking outside the widget.
  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  // Keep the keyboard-highlighted row in view.
  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest' }); }, [active, open]);

  const choose = (p) => {
    if (!p) return;
    onSelect(p.en);
    setQuery('');
    setOpen(false);
    setActive(0);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true);
      setActive(a => Math.min(a + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setActive(a => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault(); choose(matches[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="psearch" ref={rootRef}>
      <input
        className="field psearch__input"
        type="text"
        placeholder="ค้นหาหรือเลือกจังหวัด…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="psearch-list"
        autoComplete="off"
      />
      {open && (
        <ul className="psearch__list" id="psearch-list" role="listbox">
          {matches.length === 0 ? (
            <li className="psearch__empty">ไม่พบจังหวัด</li>
          ) : matches.map((p, i) => (
            <li
              key={p.en}
              ref={i === active ? activeRef : null}
              role="option"
              aria-selected={i === active}
              className="psearch__item"
              data-active={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(p); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="psearch__th">{p.th}</span>
              <span className="psearch__en">{p.en}</span>
              {ndviCache[p.en] != null && <span className="psearch__dot" title="มีข้อมูลแล้ว" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
