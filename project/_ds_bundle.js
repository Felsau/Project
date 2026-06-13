/* @ds-bundle: {"format":3,"namespace":"GreenLensDesignSystem_4a358a","components":[{"name":"BrandMark","sourcePath":"components/core/BrandMark.jsx"},{"name":"ExportBar","sourcePath":"components/data/ExportBar.jsx"},{"name":"Figure","sourcePath":"components/data/Figure.jsx"},{"name":"KVRow","sourcePath":"components/data/Figure.jsx"},{"name":"KV","sourcePath":"components/data/Figure.jsx"},{"name":"Note","sourcePath":"components/data/Figure.jsx"},{"name":"DefList","sourcePath":"components/data/Figure.jsx"},{"name":"MapLegend","sourcePath":"components/data/MapLegend.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"StatusDot","sourcePath":"components/feedback/Toast.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Chip","sourcePath":"components/forms/Chip.jsx"},{"name":"Label","sourcePath":"components/forms/Field.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Select","sourcePath":"components/forms/Field.jsx"},{"name":"SectionHead","sourcePath":"components/layout/Section.jsx"},{"name":"Section","sourcePath":"components/layout/Section.jsx"},{"name":"Collapsible","sourcePath":"components/layout/Section.jsx"},{"name":"Tabs","sourcePath":"components/layout/Tabs.jsx"},{"name":"TopBar","sourcePath":"components/layout/TopBar.jsx"}],"sourceHashes":{"components/core/BrandMark.jsx":"837672616636","components/data/ExportBar.jsx":"28d48de1a936","components/data/Figure.jsx":"2aeb0ac2b823","components/data/MapLegend.jsx":"ee406e95dbf6","components/feedback/Toast.jsx":"c531cdb7b288","components/forms/Button.jsx":"483f19f2b884","components/forms/Chip.jsx":"1b3f75eb3d58","components/forms/Field.jsx":"ae28aca2d70a","components/layout/Section.jsx":"42ca8ded99c7","components/layout/Tabs.jsx":"a7187d074cf9","components/layout/TopBar.jsx":"03a2c35b25cb","ui_kits/dashboard/MapView.jsx":"5219c8eff218","ui_kits/dashboard/SidebarView.jsx":"9f49ca51f864","ui_kits/dashboard/app.jsx":"3483c84bfec8","ui_kits/dashboard/data.jsx":"ee84c8dfd34e","ui_kits/landing/Landing.jsx":"412feb8c2cea"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.GreenLensDesignSystem_4a358a = window.GreenLensDesignSystem_4a358a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/BrandMark.jsx
try { (() => {
/** Brand diamond mark + optional wordmark. Pure CSS/SVG — no image dependency. */
function BrandMark({
  size = 14,
  withWordmark = false,
  label = 'GreenLens'
}) {
  const diamond = /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: size,
      height: size,
      background: 'var(--brand)',
      transform: 'rotate(45deg)',
      display: 'inline-block',
      flex: 'none'
    }
  });
  if (!withWordmark) return diamond;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: Math.round(size * 0.7)
    }
  }, diamond, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--w-bold)',
      letterSpacing: 'var(--track-display)',
      color: 'var(--text-strong)',
      fontSize: Math.round(size * 1.3),
      lineHeight: 1
    }
  }, label));
}
Object.assign(__ds_scope, { BrandMark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/BrandMark.jsx", error: String((e && e.message) || e) }); }

// components/data/ExportBar.jsx
try { (() => {
/**
 * Export control strip — flat joined buttons (CSV / PNG / PDF / PNG + แผนที่).
 * buttons: [{ id, label }]. busy: id of the in-flight action.
 */
function ExportBar({
  buttons,
  busy = null,
  onAction,
  title = 'ส่งออกข้อมูล'
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section__head section__head--quiet"
  }, /*#__PURE__*/React.createElement("span", {
    className: "section__title"
  }, title)), /*#__PURE__*/React.createElement("div", {
    className: "export-bar"
  }, buttons.map(b => /*#__PURE__*/React.createElement("button", {
    key: b.id,
    type: "button",
    className: "export-btn",
    disabled: !!busy,
    onClick: () => onAction && onAction(b.id)
  }, busy === b.id ? '…' : b.label))));
}
Object.assign(__ds_scope, { ExportBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ExportBar.jsx", error: String((e && e.message) || e) }); }

// components/data/Figure.jsx
try { (() => {
/** Big typographic stat — mono numeral + unit, optional progress bar. */
function Figure({
  value,
  unit,
  tag,
  progress
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "figure"
  }, /*#__PURE__*/React.createElement("span", {
    className: "figure__num"
  }, value), unit ? /*#__PURE__*/React.createElement("span", {
    className: "figure__unit"
  }, unit) : null, tag ? /*#__PURE__*/React.createElement("span", {
    className: "figure__tag"
  }, tag) : null), progress != null && /*#__PURE__*/React.createElement("div", {
    className: "bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bar__fill",
    style: {
      width: `${Math.max(0, Math.min(100, progress))}%`
    }
  })));
}

/** Bordered grid of quiet stat boxes; 2 or 3 columns. */
function KVRow({
  children,
  cols = 2
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `kv-row${cols === 3 ? ' kv-row--3' : ''}`
  }, children);
}

/** One quiet stat box — uppercase label, mono value, optional hint. */
function KV({
  label,
  value,
  hint
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kv__label"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "kv__value"
  }, value), hint ? /*#__PURE__*/React.createElement("div", {
    className: "kv__hint"
  }, hint) : null);
}

/** Derived-finding note. tone: 'default' (green) | 'warn' | 'crit'. */
function Note({
  tone = 'default',
  label,
  children
}) {
  const cls = tone === 'warn' ? 'note note--warn' : tone === 'crit' ? 'note note--crit' : 'note';
  return /*#__PURE__*/React.createElement("div", {
    className: cls
  }, label ? /*#__PURE__*/React.createElement("span", {
    className: "note__label"
  }, label) : null, children);
}

/** "label : value" definition rows with dotted leaders. */
function DefList({
  items
}) {
  return /*#__PURE__*/React.createElement("dl", {
    className: "dl"
  }, items.map((it, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("dt", null, it.label), /*#__PURE__*/React.createElement("dd", null, it.value))));
}
Object.assign(__ds_scope, { Figure, KVRow, KV, Note, DefList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Figure.jsx", error: String((e && e.message) || e) }); }

// components/data/MapLegend.jsx
try { (() => {
const NDVI_STOPS = [{
  color: 'var(--ndvi-3)',
  label: 'หนาแน่นมาก',
  range: '≥ 0.60'
}, {
  color: 'var(--ndvi-2)',
  label: 'หนาแน่น',
  range: '0.45–0.60'
}, {
  color: 'var(--ndvi-1)',
  label: 'ปานกลาง',
  range: '0.30–0.45'
}, {
  color: 'var(--ndvi-0)',
  label: 'น้อย',
  range: '< 0.30'
}];
const LST_STOPS = [{
  color: 'var(--lst-crit)',
  label: 'ร้อนมาก',
  range: '≥ 38°C'
}, {
  color: 'var(--lst-hot)',
  label: 'ร้อน',
  range: '33–38°C'
}, {
  color: 'var(--lst-mild)',
  label: 'ปานกลาง',
  range: '28–33°C'
}, {
  color: 'var(--lst-cool)',
  label: 'เย็น',
  range: '< 28°C'
}];

/**
 * Floating map color key. mode 'ndvi' | 'lst' renders the bucket rows;
 * pass `gradient` + `min`/`max` for a continuous raster scale instead.
 */
function MapLegend({
  mode = 'ndvi',
  title,
  gradient,
  min,
  max,
  showEmpty = true
}) {
  const heading = title || (mode === 'lst' ? 'อุณหภูมิผิว · LST' : 'พื้นที่สีเขียว · NDVI');
  if (gradient) {
    return /*#__PURE__*/React.createElement("div", {
      className: "legend-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "legend-card__title"
    }, heading), /*#__PURE__*/React.createElement("div", {
      className: "legend-gradient",
      style: {
        background: gradient
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "legend-gradient__scale"
    }, /*#__PURE__*/React.createElement("span", null, min), /*#__PURE__*/React.createElement("span", null, max)));
  }
  const stops = mode === 'lst' ? LST_STOPS : NDVI_STOPS;
  return /*#__PURE__*/React.createElement("div", {
    className: "legend-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "legend-card__title"
  }, heading), stops.map(s => /*#__PURE__*/React.createElement("div", {
    className: "legend-card__row",
    key: s.range
  }, /*#__PURE__*/React.createElement("span", {
    className: "legend-card__swatch",
    style: {
      background: s.color
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "legend-card__label"
  }, s.label), /*#__PURE__*/React.createElement("span", {
    className: "legend-card__range"
  }, s.range))), showEmpty && /*#__PURE__*/React.createElement("div", {
    className: "legend-card__row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "legend-card__swatch legend-card__swatch--empty"
  }), /*#__PURE__*/React.createElement("span", {
    className: "legend-card__label"
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25"), /*#__PURE__*/React.createElement("span", {
    className: "legend-card__range"
  }, "\u2014")));
}
Object.assign(__ds_scope, { MapLegend });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MapLegend.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/**
 * Toast message — paper card with a 2px tone edge. Controlled: render in a
 * fixed stack near the top-right (top: 52, right: 16).
 */
function Toast({
  type = 'info',
  children,
  onDismiss
}) {
  const isErr = type === 'error';
  return /*#__PURE__*/React.createElement("div", {
    role: isErr ? 'alert' : 'status',
    style: {
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
      maxWidth: 340
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, children), onDismiss && /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    "aria-label": "\u0E1B\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21",
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontSize: 14,
      padding: 0,
      lineHeight: 1
    }
  }, "\xD7"));
}

/** Live status dot + label. state: 'ready' | 'loading' | 'empty'. */
function StatusDot({
  state = 'ready',
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "status-dot",
    "data-state": state
  }, children);
}
Object.assign(__ds_scope, { Toast, StatusDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — quiet bordered default; one green primary per view at most.
 * variant: 'default' | 'primary' | 'text'
 */
function Button({
  variant = 'default',
  size,
  full = false,
  disabled,
  children,
  onClick,
  type = 'button',
  ...rest
}) {
  if (variant === 'text') {
    return /*#__PURE__*/React.createElement("button", _extends({
      type: type,
      className: "btn--text",
      disabled: disabled,
      onClick: onClick
    }, rest), children);
  }
  const cls = ['btn', variant === 'primary' ? 'btn--primary' : '', size === 'sm' ? 'btn--sm' : '', full ? 'btn--full' : ''].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls,
    disabled: disabled,
    onClick: onClick
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Chip.jsx
try { (() => {
/** Toggle chip — metric / year selection. Active = solid ink, not green. */
function Chip({
  active = false,
  disabled,
  onClick,
  children
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "chip",
    "data-active": active,
    onClick: onClick,
    disabled: disabled
  }, children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Chip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Uppercase tracked form label. */
function Label({
  htmlFor,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: "label",
    htmlFor: htmlFor
  }, children);
}

/** Text input styled as the system field. */
function Field({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    type: type,
    className: "field",
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled
  }, rest));
}

/** Native select styled as the system field. */
function Select({
  id,
  value,
  onChange,
  disabled,
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("select", _extends({
    id: id,
    className: "field",
    value: value,
    onChange: onChange,
    disabled: disabled
  }, rest), children);
}
Object.assign(__ds_scope, { Label, Field, Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/layout/Section.jsx
try { (() => {
/** Section header — uppercase tracked title + right-aligned meta, hairline rule. */
function SectionHead({
  title,
  meta,
  quiet = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: quiet ? 'section__head section__head--quiet' : 'section__head'
  }, /*#__PURE__*/React.createElement("span", {
    className: "section__title"
  }, title), meta ? /*#__PURE__*/React.createElement("span", {
    className: "section__meta"
  }, meta) : null);
}

/** Section wrapper — vertical stack with system gap. */
function Section({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, children);
}

/** Collapsible section with chevron; header styled like SectionHead. */
function Collapsible({
  title,
  meta,
  defaultOpen = true,
  children
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return /*#__PURE__*/React.createElement("section", {
    className: "collapsible",
    "data-open": open
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "collapsible__head",
    "aria-expanded": open,
    onClick: () => setOpen(v => !v)
  }, /*#__PURE__*/React.createElement("span", {
    className: "collapsible__title"
  }, title), meta ? /*#__PURE__*/React.createElement("span", {
    className: "collapsible__meta"
  }, meta) : null, /*#__PURE__*/React.createElement("span", {
    className: "collapsible__chev",
    "aria-hidden": "true"
  }, "\u25BE")), open && /*#__PURE__*/React.createElement("div", {
    className: "collapsible__body"
  }, children));
}
Object.assign(__ds_scope, { SectionHead, Section, Collapsible });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Section.jsx", error: String((e && e.message) || e) }); }

// components/layout/Tabs.jsx
try { (() => {
/** Sidebar tab strip. tabs: [{id, label}]. Active tab gets the ink underline. */
function Tabs({
  tabs,
  active,
  onChange
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "tabs",
    role: "tablist"
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    type: "button",
    role: "tab",
    className: "tab",
    "data-active": active === t.id,
    "aria-selected": active === t.id,
    onClick: () => onChange && onChange(t.id)
  }, t.label)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/layout/TopBar.jsx
try { (() => {
/**
 * Product top bar — brand block, data-source meta, unicode icon buttons,
 * sidebar toggle, optional loading line. 40px tall, hairline bottom rule.
 */
function TopBar({
  title = 'GreenLens',
  subtitle = 'Thailand',
  source = 'Sentinel-2',
  sourceMeta = 'Google Earth Engine',
  loading = false,
  theme = 'light',
  sidebarCollapsed = false,
  onBrandClick,
  onShowAbout,
  onToggleTheme,
  onToggleSidebar
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "topbar",
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "topbar__brand",
    onClick: onBrandClick,
    type: "button"
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar__mark",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "topbar__title"
  }, title, /*#__PURE__*/React.createElement("em", null, subtitle))), /*#__PURE__*/React.createElement("div", {
    className: "topbar__meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "topbar__source"
  }, /*#__PURE__*/React.createElement("strong", null, source), " \xB7 ", sourceMeta)), onShowAbout && /*#__PURE__*/React.createElement("button", {
    className: "topbar__icon-btn",
    type: "button",
    onClick: onShowAbout,
    "aria-label": "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E1A\u0E27\u0E34\u0E18\u0E35"
  }, "\u24D8"), onToggleTheme && /*#__PURE__*/React.createElement("button", {
    className: "topbar__icon-btn",
    type: "button",
    onClick: onToggleTheme,
    "aria-label": "\u0E2A\u0E25\u0E31\u0E1A\u0E18\u0E35\u0E21"
  }, theme === 'dark' ? '☀' : '☾'), onToggleSidebar && /*#__PURE__*/React.createElement("button", {
    className: "topbar__sidebar-toggle",
    type: "button",
    onClick: onToggleSidebar
  }, sidebarCollapsed ? 'แสดงแผง ›' : '‹ ซ่อนแผง'), loading && /*#__PURE__*/React.createElement("div", {
    className: "loading-bar"
  }));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/MapView.jsx
try { (() => {
// Map pane — recreation of the MapLibre view as a static placeholder with the
// real floating controls: overlay toggle (top-left), zoom stack (top-right),
// NDVI/LST legend (bottom-left). The basemap itself is intentionally a
// placeholder — the production app renders CARTO tiles + deck.gl layers.
const {
  MapLegend
} = window.GreenLensDesignSystem_4a358a;
function MapView({
  overlay,
  setOverlay,
  choropleth
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "mapwrap canvas"
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'linear-gradient(var(--rule) 1px, transparent 1px), linear-gradient(90deg, var(--rule) 1px, transparent 1px)',
      backgroundSize: '48px 48px',
      opacity: 0.5
    }
  }), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(420px 300px at 38% 42%, color-mix(in srgb, var(--ndvi-1) 26%, transparent), transparent 70%), radial-gradient(360px 260px at 62% 60%, color-mix(in srgb, var(--ndvi-3) 18%, transparent), transparent 70%), radial-gradient(280px 220px at 52% 30%, color-mix(in srgb, var(--lst-hot) 12%, transparent), transparent 70%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
      color: 'var(--text-faint)',
      fontSize: 'var(--t-xs)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontWeight: 600,
      lineHeight: 2
    }
  }, "MapLibre \xB7 CARTO basemap \xB7 deck.gl choropleth", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      letterSpacing: 0,
      textTransform: 'none'
    }
  }, "\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48 (\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A \u2014 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E08\u0E23\u0E34\u0E07)")), /*#__PURE__*/React.createElement("div", {
    className: "overlay-toggle"
  }, /*#__PURE__*/React.createElement("span", {
    className: "overlay-toggle__label"
  }, "Raster overlay"), /*#__PURE__*/React.createElement("div", {
    className: "overlay-toggle__btns"
  }, [['none', 'ปิด'], ['ndvi', 'NDVI'], ['lst', 'LST']].map(([id, label]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    type: "button",
    className: "overlay-btn",
    "data-active": overlay === id,
    onClick: () => setOverlay(id)
  }, label))), /*#__PURE__*/React.createElement("span", {
    className: "overlay-toggle__status"
  }, overlay === 'none' ? 'choropleth รายจังหวัด' : 'raster 10 m จาก GEE')), /*#__PURE__*/React.createElement("div", {
    className: "map-controls"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "map-btn",
    "aria-label": "\u0E0B\u0E39\u0E21\u0E40\u0E02\u0E49\u0E32"
  }, "+"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "map-btn",
    "aria-label": "\u0E0B\u0E39\u0E21\u0E2D\u0E2D\u0E01"
  }, "\u2212"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "map-btn",
    "aria-label": "\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E38\u0E21\u0E21\u0E2D\u0E07\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19"
  }, "\u2302")), overlay === 'none' ? /*#__PURE__*/React.createElement(MapLegend, {
    mode: choropleth
  }) : /*#__PURE__*/React.createElement(MapLegend, {
    gradient: overlay === 'lst' ? 'var(--grad-lst)' : 'var(--grad-ndvi)',
    min: overlay === 'lst' ? '24°C' : '0.0',
    max: overlay === 'lst' ? '42°C' : '0.8',
    title: overlay === 'lst' ? 'อุณหภูมิผิว · LST (raster)' : 'พืชพรรณ · NDVI (raster)'
  }));
}
window.MapView = MapView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/MapView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/SidebarView.jsx
try { (() => {
// Sidebar — search, tabs, context header, tab panels, footer.
// Faithful to Sidebar.js / StatsTab.js / OverviewPanel.js upstream.
const {
  Figure,
  KVRow,
  KV,
  Note,
  Collapsible,
  ExportBar,
  Tabs: GLTabs,
  StatusDot,
  Chip
} = window.GreenLensDesignSystem_4a358a;
const {
  useState
} = React;
const SIDEBAR_TABS = [{
  id: 'stats',
  label: 'ข้อมูล'
}, {
  id: 'trend',
  label: 'แนวโน้ม'
}, {
  id: 'cooling',
  label: 'ความเย็น'
}, {
  id: 'compare',
  label: 'เปรียบเทียบ'
}, {
  id: 'recommend',
  label: 'AI แนะนำ'
}];

/* Tiny monthly bar chart — typographic, axis-free, like the product's. */
function MonthlyChart({
  data,
  kind
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const color = v => kind === 'lst' ? v >= 38 ? 'var(--lst-crit)' : v >= 35 ? 'var(--lst-hot)' : v >= 30 ? 'var(--lst-mild)' : 'var(--lst-cool)' : v >= 0.6 ? 'var(--ndvi-3)' : v >= 0.45 ? 'var(--ndvi-2)' : v >= 0.3 ? 'var(--ndvi-1)' : 'var(--ndvi-0)';
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(12, 1fr)',
      gap: 3,
      alignItems: 'end',
      height: 56
    }
  }, data.map((v, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    title: `${GL_MONTH_LABELS[i]} · ${v}`,
    style: {
      height: `${10 + (v - min) / (max - min || 1) * 90}%`,
      background: color(v),
      borderRadius: 1
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "helper"
  }, GL_MONTH_LABELS[0]), /*#__PURE__*/React.createElement("span", {
    className: "helper"
  }, GL_MONTH_LABELS[11])));
}
function StatsPanel({
  province,
  district,
  onClearDistrict
}) {
  const [busy, setBusy] = useState(null);
  const exportButtons = [{
    id: 'csv',
    label: 'CSV'
  }, {
    id: 'png',
    label: 'PNG'
  }, {
    id: 'pdf',
    label: 'PDF'
  }, {
    id: 'map',
    label: 'PNG + แผนที่'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, district && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderLeft: '2px solid var(--accent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "kv__label"
  }, "\u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--ink-0)'
    }
  }, district.th), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--ink-3)',
      fontFamily: 'var(--mono)'
    }
  }, district.area.toLocaleString(), " km\xB2")), /*#__PURE__*/React.createElement("button", {
    className: "btn--text",
    onClick: onClearDistrict
  }, "\u0E25\u0E49\u0E32\u0E07")), /*#__PURE__*/React.createElement(Collapsible, {
    title: district ? 'NDVI · จังหวัด' : 'NDVI · พื้นที่สีเขียว',
    meta: "Sentinel-2 / annual",
    defaultOpen: true
  }, /*#__PURE__*/React.createElement(Figure, {
    value: province.ndvi.toFixed(2),
    unit: "\u0E04\u0E48\u0E32\u0E40\u0E09\u0E25\u0E35\u0E48\u0E22\u0E17\u0E31\u0E49\u0E07\u0E1B\u0E35",
    tag: getNdviLabel(province.ndvi),
    progress: province.ndvi * 100
  }), /*#__PURE__*/React.createElement(KVRow, {
    cols: 3
  }, /*#__PURE__*/React.createElement(KV, {
    label: "Min",
    value: (province.ndvi - 0.12).toFixed(2)
  }), /*#__PURE__*/React.createElement(KV, {
    label: "Max",
    value: (province.ndvi + 0.22).toFixed(2)
  }), /*#__PURE__*/React.createElement(KV, {
    label: "\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14",
    value: province.area.toLocaleString(),
    hint: "km\xB2"
  })), /*#__PURE__*/React.createElement(KVRow, null, /*#__PURE__*/React.createElement(KV, {
    label: "\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27 (NDVI > 0.3)",
    value: `${province.green_pct}%`,
    hint: `${province.green_km2.toLocaleString()} km²`
  }), /*#__PURE__*/React.createElement(KV, {
    label: "\u0E15\u0E48\u0E2D\u0E2B\u0E31\u0E27\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E01\u0E23",
    value: `${province.per_person.toFixed(1)} m²`,
    hint: province.who
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "label"
  }, "NDVI \u0E23\u0E32\u0E22\u0E40\u0E14\u0E37\u0E2D\u0E19"), /*#__PURE__*/React.createElement(MonthlyChart, {
    data: GL_MONTHLY_NDVI,
    kind: "ndvi"
  }), /*#__PURE__*/React.createElement("div", {
    className: "helper",
    style: {
      marginTop: 4
    }
  }, "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E08\u0E32\u0E01 Sentinel-2 \u0E1C\u0E48\u0E32\u0E19 Google Earth Engine"))), province.per_person < 9 && /*#__PURE__*/React.createElement(Note, {
    tone: "crit",
    label: "Green deficit"
  }, "\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27\u0E15\u0E48\u0E2D\u0E2B\u0E31\u0E27 ", /*#__PURE__*/React.createElement("span", {
    className: "note__num"
  }, province.per_person.toFixed(1), " m\xB2"), " \u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32\u0E40\u0E01\u0E13\u0E11\u0E4C WHO (", /*#__PURE__*/React.createElement("span", {
    className: "note__num"
  }, "9 m\xB2"), ") \u2014 \u0E02\u0E32\u0E14\u0E2D\u0E35\u0E01 ", /*#__PURE__*/React.createElement("span", {
    className: "note__num"
  }, (9 - province.per_person).toFixed(1), " m\xB2/\u0E04\u0E19")), /*#__PURE__*/React.createElement(Collapsible, {
    title: "\u0E2D\u0E38\u0E13\u0E2B\u0E20\u0E39\u0E21\u0E34\u0E1C\u0E34\u0E27\u0E1E\u0E37\u0E49\u0E19",
    meta: "Landsat 8/9",
    defaultOpen: false
  }, /*#__PURE__*/React.createElement(Figure, {
    value: `${province.lst.toFixed(1)}°C`,
    tag: getLstLabel(province.lst)
  }), /*#__PURE__*/React.createElement(KVRow, null, /*#__PURE__*/React.createElement(KV, {
    label: "Min",
    value: `${(province.lst - 4.1).toFixed(1)}°C`
  }), /*#__PURE__*/React.createElement(KV, {
    label: "Max",
    value: `${(province.lst + 5.3).toFixed(1)}°C`
  })), /*#__PURE__*/React.createElement(Note, {
    tone: "warn"
  }, "LST \u0E04\u0E37\u0E2D\u0E2D\u0E38\u0E13\u0E2B\u0E20\u0E39\u0E21\u0E34\u0E1C\u0E34\u0E27\u0E1E\u0E37\u0E49\u0E19 \u0E2A\u0E39\u0E07\u0E01\u0E27\u0E48\u0E32\u0E2D\u0E38\u0E13\u0E2B\u0E20\u0E39\u0E21\u0E34\u0E2D\u0E32\u0E01\u0E32\u0E28 5\u201320\xB0C \xB7 Max = \u0E1E\u0E34\u0E01\u0E40\u0E0B\u0E25\u0E23\u0E49\u0E2D\u0E19\u0E2A\u0E38\u0E14\u0E43\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "label"
  }, "\u0E23\u0E32\u0E22\u0E40\u0E14\u0E37\u0E2D\u0E19"), /*#__PURE__*/React.createElement(MonthlyChart, {
    data: GL_MONTHLY_LST,
    kind: "lst"
  }))), province.lst >= 34 && province.ndvi < 0.3 && /*#__PURE__*/React.createElement(Note, {
    tone: "warn",
    label: "\u0E04\u0E27\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E40\u0E01\u0E32\u0E30\u0E04\u0E27\u0E32\u0E21\u0E23\u0E49\u0E2D\u0E19\u0E40\u0E21\u0E37\u0E2D\u0E07"
  }, "NDVI \u0E15\u0E48\u0E33 + LST \u0E2A\u0E39\u0E07 \u2014 \u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E19\u0E35\u0E49\u0E40\u0E02\u0E49\u0E32\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02 urban heat island \u0E04\u0E27\u0E23\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27\u0E43\u0E19\u0E40\u0E02\u0E15\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E0A\u0E31\u0E49\u0E19\u0E43\u0E19"), /*#__PURE__*/React.createElement(ExportBar, {
    buttons: exportButtons,
    busy: busy,
    onAction: id => {
      setBusy(id);
      setTimeout(() => setBusy(null), 900);
    }
  }));
}
function OverviewPanel({
  onSelectProvince
}) {
  const [year, setYear] = useState(GL_YEARS[0]);
  const [loaded, setLoaded] = useState(true);
  const [busy, setBusy] = useState(null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "section__title"
  }, "\u0E42\u0E2B\u0E25\u0E14\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E1B\u0E35")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("select", {
    className: "field",
    style: {
      width: 100
    },
    value: year,
    onChange: e => setYear(Number(e.target.value))
  }, GL_YEARS.map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, y))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn--primary",
    style: {
      flex: 1
    },
    onClick: () => setLoaded(true)
  }, "\u0E42\u0E2B\u0E25\u0E14\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A")), /*#__PURE__*/React.createElement("div", {
    className: "helper"
  }, "42 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E41\u0E04\u0E0A\u0E41\u0E25\u0E49\u0E27 \xB7 \u0E41\u0E2A\u0E14\u0E07\u0E40\u0E1B\u0E47\u0E19 3D \u0E1A\u0E19\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48")), loaded && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "section__title"
  }, "\u0E2A\u0E23\u0E38\u0E1B\u0E1B\u0E35 ", year), /*#__PURE__*/React.createElement("span", {
    className: "section__meta"
  }, "62 / 77 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14")), /*#__PURE__*/React.createElement(KVRow, null, /*#__PURE__*/React.createElement(KV, {
    label: "\u0E1C\u0E48\u0E32\u0E19 WHO",
    value: "48",
    hint: "77% \u0E02\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E08\u0E31\u0E14\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A"
  }), /*#__PURE__*/React.createElement(KV, {
    label: "\u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32 WHO",
    value: "14",
    hint: "23% \u0E02\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E08\u0E31\u0E14\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A"
  })), /*#__PURE__*/React.createElement("div", {
    className: "bar",
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bar__fill",
    style: {
      width: '77%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "coverage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "coverage__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helper"
  }, "\u0E04\u0E27\u0E32\u0E21\u0E04\u0E23\u0E2D\u0E1A\u0E04\u0E25\u0E38\u0E21\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1B\u0E35 ", year), /*#__PURE__*/React.createElement("span", {
    className: "coverage__count"
  }, "62 / 77")), /*#__PURE__*/React.createElement("div", {
    className: "bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bar__fill",
    style: {
      width: '81%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "coverage__row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helper"
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 15 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn--sm btn--primary"
  }, "\u0E04\u0E33\u0E19\u0E27\u0E13\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35")))), /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "section__title"
  }, "\u0E2B\u0E49\u0E32\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E17\u0E35\u0E48\u0E02\u0E32\u0E14\u0E41\u0E04\u0E25\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14")), /*#__PURE__*/React.createElement("div", {
    className: "rank-table"
  }, GL_RANKING_WORST.map(r => /*#__PURE__*/React.createElement("button", {
    key: r.rank,
    className: "rank-row",
    style: {
      background: 'none',
      border: 'none',
      borderBottom: '1px dotted var(--rule)',
      cursor: 'pointer',
      textAlign: 'left',
      width: '100%'
    },
    onClick: () => onSelectProvince(r.th)
  }, /*#__PURE__*/React.createElement("span", {
    className: "rank-row__num"
  }, String(r.rank).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
    className: "rank-row__name"
  }, r.th), /*#__PURE__*/React.createElement("span", {
    className: "rank-row__val"
  }, r.val.toFixed(1), " m\xB2"))))), /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "section__title"
  }, "\u0E2B\u0E49\u0E32\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E17\u0E35\u0E48\u0E21\u0E35\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27\u0E21\u0E32\u0E01\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14")), /*#__PURE__*/React.createElement("div", {
    className: "rank-table"
  }, GL_RANKING_BEST.map(r => /*#__PURE__*/React.createElement("div", {
    className: "rank-row",
    key: r.rank
  }, /*#__PURE__*/React.createElement("span", {
    className: "rank-row__num"
  }, String(r.rank).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
    className: "rank-row__name"
  }, r.th), /*#__PURE__*/React.createElement("span", {
    className: "rank-row__val"
  }, r.val.toFixed(1), " m\xB2"))))), /*#__PURE__*/React.createElement(ExportBar, {
    buttons: [{
      id: 'csv',
      label: 'CSV'
    }, {
      id: 'png',
      label: 'PNG'
    }, {
      id: 'pdf',
      label: 'PDF'
    }],
    busy: busy,
    onAction: id => {
      setBusy(id);
      setTimeout(() => setBusy(null), 900);
    }
  })));
}
function RecommendPanel() {
  const [w, setW] = useState({
    green: 40,
    heat: 30,
    pop: 30
  });
  const locs = [{
    n: 1,
    name: 'เขตคลองเตย — ริมทางรถไฟ',
    score: 0.91
  }, {
    n: 2,
    name: 'เขตบางซื่อ — ลานจอดรถไฟฟ้า',
    score: 0.87
  }, {
    n: 3,
    name: 'เขตดินแดง — แนวถนนวิภาวดี',
    score: 0.84
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "section__title"
  }, "\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E25\u0E33\u0E14\u0E31\u0E1A"), /*#__PURE__*/React.createElement("span", {
    className: "section__meta"
  }, "\u0E23\u0E27\u0E21 ", w.green + w.heat + w.pop, "%")), [['green', 'ขาดสีเขียว'], ['heat', 'ความร้อน'], ['pop', 'ประชากร']].map(([k, label]) => /*#__PURE__*/React.createElement("div", {
    className: "weight-row",
    key: k
  }, /*#__PURE__*/React.createElement("span", {
    className: "helper"
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    value: w[k],
    onChange: e => setW({
      ...w,
      [k]: Number(e.target.value)
    })
  }), /*#__PURE__*/React.createElement("span", {
    className: "coverage__count"
  }, w[k], "%")))), /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "section__title"
  }, "\u0E08\u0E38\u0E14\u0E17\u0E35\u0E48\u0E04\u0E27\u0E23\u0E1B\u0E25\u0E39\u0E01\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14"), /*#__PURE__*/React.createElement("span", {
    className: "section__meta"
  }, "Top 3")), /*#__PURE__*/React.createElement("div", {
    className: "rank-table"
  }, locs.map(l => /*#__PURE__*/React.createElement("div", {
    className: "rank-row",
    key: l.n
  }, /*#__PURE__*/React.createElement("span", {
    className: "rank-row__num"
  }, String(l.n).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
    className: "rank-row__name"
  }, l.name), /*#__PURE__*/React.createElement("span", {
    className: "rank-row__val"
  }, l.score.toFixed(2)))))), /*#__PURE__*/React.createElement(Note, {
    label: "\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E44\u0E21\u0E49\u0E41\u0E19\u0E30\u0E19\u0E33 \xB7 \u0E20\u0E32\u0E04\u0E01\u0E25\u0E32\u0E07"
  }, "\u0E1B\u0E23\u0E30\u0E14\u0E39\u0E48\u0E1A\u0E49\u0E32\u0E19 \xB7 \u0E15\u0E30\u0E41\u0E1A\u0E01\u0E19\u0E32 \xB7 \u0E02\u0E35\u0E49\u0E40\u0E2B\u0E25\u0E47\u0E01\u0E1A\u0E49\u0E32\u0E19 \u2014 \u0E42\u0E15\u0E40\u0E23\u0E47\u0E27 \u0E17\u0E19\u0E41\u0E25\u0E49\u0E07 \u0E23\u0E48\u0E21\u0E40\u0E07\u0E32\u0E01\u0E27\u0E49\u0E32\u0E07 \u0E40\u0E2B\u0E21\u0E32\u0E30\u0E41\u0E19\u0E27\u0E16\u0E19\u0E19\u0E41\u0E25\u0E30\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E27\u0E48\u0E32\u0E07\u0E40\u0E02\u0E15\u0E40\u0E21\u0E37\u0E2D\u0E07"));
}
function PlaceholderPanel({
  text
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, text);
}
function SidebarView({
  province,
  district,
  tab,
  setTab,
  onSelectProvince,
  onClearDistrict,
  onReset
}) {
  const [q, setQ] = useState('');
  const matches = q ? GL_PROVINCES.filter(p => p.th.includes(q) || p.en.toLowerCase().includes(q.toLowerCase())) : [];
  return /*#__PURE__*/React.createElement("aside", {
    className: "side",
    style: {
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "psearch-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "psearch"
  }, /*#__PURE__*/React.createElement("input", {
    className: "field psearch__input",
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u2026",
    value: q,
    onChange: e => setQ(e.target.value)
  }), matches.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "psearch__list"
  }, matches.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.en,
    type: "button",
    className: "psearch__item",
    onClick: () => {
      onSelectProvince(p.th);
      setQ('');
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "psearch__th"
  }, p.th), /*#__PURE__*/React.createElement("span", {
    className: "psearch__en"
  }, p.en), /*#__PURE__*/React.createElement("span", {
    className: "psearch__dot",
    style: {
      background: p.ndvi >= 0.45 ? 'var(--ndvi-2)' : p.ndvi >= 0.3 ? 'var(--ndvi-1)' : 'var(--ndvi-0)'
    }
  })))))), province ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GLTabs, {
    tabs: SIDEBAR_TABS,
    active: tab,
    onChange: setTab
  }), /*#__PURE__*/React.createElement("div", {
    className: "context"
  }, /*#__PURE__*/React.createElement("div", {
    className: "context__crumb"
  }, district ? 'จังหวัด / อำเภอ' : 'จังหวัด'), /*#__PURE__*/React.createElement("div", {
    className: "context__title"
  }, province.th), district && /*#__PURE__*/React.createElement("div", {
    className: "context__sub"
  }, district.th), /*#__PURE__*/React.createElement("div", {
    className: "context__status"
  }, /*#__PURE__*/React.createElement(StatusDot, {
    state: "ready"
  }, "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E14 \xB7 Sentinel-2"))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel__inner"
  }, tab === 'stats' && /*#__PURE__*/React.createElement(StatsPanel, {
    province: province,
    district: district,
    onClearDistrict: onClearDistrict
  }), tab === 'recommend' && /*#__PURE__*/React.createElement(RecommendPanel, null), tab === 'trend' && /*#__PURE__*/React.createElement(PlaceholderPanel, {
    text: "\u0E41\u0E19\u0E27\u0E42\u0E19\u0E49\u0E21\u0E2B\u0E25\u0E32\u0E22\u0E1B\u0E35 + \u0E1E\u0E22\u0E32\u0E01\u0E23\u0E13\u0E4C OLS \u2014 \u0E41\u0E1C\u0E07\u0E19\u0E35\u0E49\u0E40\u0E27\u0E49\u0E19\u0E44\u0E27\u0E49\u0E43\u0E19\u0E0A\u0E38\u0E14 UI (\u0E14\u0E39\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E08\u0E23\u0E34\u0E07)"
  }), tab === 'cooling' && /*#__PURE__*/React.createElement(PlaceholderPanel, {
    text: "Regression \u0E02\u0E2D\u0E07 LST \u0E15\u0E48\u0E2D NDVI \u0E23\u0E32\u0E22\u0E2D\u0E33\u0E40\u0E20\u0E2D \u2014 \u0E41\u0E1C\u0E07\u0E19\u0E35\u0E49\u0E40\u0E27\u0E49\u0E19\u0E44\u0E27\u0E49\u0E43\u0E19\u0E0A\u0E38\u0E14 UI (\u0E14\u0E39\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E08\u0E23\u0E34\u0E07)"
  }), tab === 'compare' && /*#__PURE__*/React.createElement(PlaceholderPanel, {
    text: "\u0E40\u0E1B\u0E23\u0E35\u0E22\u0E1A\u0E40\u0E17\u0E35\u0E22\u0E1A\u0E2B\u0E25\u0E32\u0E22\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14 \u2014 \u0E41\u0E1C\u0E07\u0E19\u0E35\u0E49\u0E40\u0E27\u0E49\u0E19\u0E44\u0E27\u0E49\u0E43\u0E19\u0E0A\u0E38\u0E14 UI (\u0E14\u0E39\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E08\u0E23\u0E34\u0E07)"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "panel__footer"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn--text",
    onClick: onReset
  }, "\u2190 \u0E14\u0E39\u0E20\u0E32\u0E1E\u0E23\u0E27\u0E21\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "context"
  }, /*#__PURE__*/React.createElement("div", {
    className: "context__crumb"
  }, "\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E44\u0E17\u0E22"), /*#__PURE__*/React.createElement("div", {
    className: "context__title"
  }, "\u0E14\u0E31\u0E0A\u0E19\u0E35\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27"), /*#__PURE__*/React.createElement("div", {
    className: "context__status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helper"
  }, "\u0E04\u0E25\u0E34\u0E01\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E1A\u0E19\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E39\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E0A\u0E34\u0E07\u0E25\u0E36\u0E01"))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel__inner"
  }, /*#__PURE__*/React.createElement(OverviewPanel, {
    onSelectProvince: onSelectProvince
  })))));
}
window.SidebarView = SidebarView;
window.GLMonthlyChart = MonthlyChart;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/SidebarView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/app.jsx
try { (() => {
// App shell — topbar over (sidebar | map). Theme + selection state lives here.
const {
  TopBar
} = window.GreenLensDesignSystem_4a358a;
const {
  useState,
  useEffect
} = React;
function App() {
  const [theme, setTheme] = useState('light');
  const [collapsed, setCollapsed] = useState(false);
  const [provinceTh, setProvinceTh] = useState('กรุงเทพมหานคร');
  const [districtTh, setDistrictTh] = useState(null);
  const [tab, setTab] = useState('stats');
  const [overlay, setOverlay] = useState('none');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const province = GL_PROVINCES.find(p => p.th === provinceTh) || null;
  const district = province && districtTh ? (GL_DISTRICTS[province.th] || []).find(d => d.th === districtTh) || null : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "GreenLens",
    subtitle: "Thailand",
    source: "Sentinel-2",
    sourceMeta: "Google Earth Engine",
    theme: theme,
    sidebarCollapsed: collapsed,
    onBrandClick: () => {
      window.location.href = '../landing/index.html';
    },
    onShowAbout: () => {},
    onToggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    onToggleSidebar: () => setCollapsed(!collapsed)
  }), /*#__PURE__*/React.createElement("div", {
    className: "app__body",
    "data-collapsed": collapsed
  }, /*#__PURE__*/React.createElement(SidebarView, {
    province: province,
    district: district,
    tab: tab,
    setTab: setTab,
    onSelectProvince: th => {
      setProvinceTh(th);
      setDistrictTh(null);
      setTab('stats');
    },
    onClearDistrict: () => setDistrictTh(null),
    onReset: () => {
      setProvinceTh(null);
      setDistrictTh(null);
    }
  }), /*#__PURE__*/React.createElement(MapView, {
    overlay: overlay,
    setOverlay: setOverlay,
    choropleth: "ndvi"
  })));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/data.jsx
try { (() => {
// Fake-but-plausible data for the dashboard recreation. Mirrors the shapes the
// real app gets from its GEE backend.
const GL_PROVINCES = [{
  th: 'กรุงเทพมหานคร',
  en: 'Bangkok Metropolis',
  ndvi: 0.27,
  lst: 36.2,
  area: 1569,
  green_pct: 21.4,
  green_km2: 336,
  per_person: 4.1,
  who: 'ต่ำกว่าเกณฑ์ WHO'
}, {
  th: 'เชียงใหม่',
  en: 'Chiang Mai',
  ndvi: 0.58,
  lst: 30.1,
  area: 20107,
  green_pct: 71.3,
  green_km2: 14336,
  per_person: 812.4,
  who: 'ผ่านเกณฑ์ WHO'
}, {
  th: 'ขอนแก่น',
  en: 'Khon Kaen',
  ndvi: 0.46,
  lst: 32.8,
  area: 10886,
  green_pct: 58.2,
  green_km2: 6336,
  per_person: 352.9,
  who: 'ผ่านเกณฑ์ WHO'
}, {
  th: 'ภูเก็ต',
  en: 'Phuket',
  ndvi: 0.41,
  lst: 31.5,
  area: 543,
  green_pct: 47.6,
  green_km2: 258,
  per_person: 62.1,
  who: 'ผ่านเกณฑ์ WHO'
}, {
  th: 'สมุทรปราการ',
  en: 'Samut Prakan',
  ndvi: 0.24,
  lst: 35.4,
  area: 1004,
  green_pct: 19.8,
  green_km2: 199,
  per_person: 5.7,
  who: 'ต่ำกว่าเกณฑ์ WHO'
}, {
  th: 'นนทบุรี',
  en: 'Nonthaburi',
  ndvi: 0.29,
  lst: 34.9,
  area: 622,
  green_pct: 24.5,
  green_km2: 152,
  per_person: 6.2,
  who: 'ต่ำกว่าเกณฑ์ WHO'
}];
const GL_DISTRICTS = {
  'กรุงเทพมหานคร': [{
    th: 'เขตปทุมวัน',
    ndvi: 0.18,
    lst: 38.1,
    area: 8.4
  }, {
    th: 'เขตจตุจักร',
    ndvi: 0.31,
    lst: 35.2,
    area: 32.9
  }, {
    th: 'เขตหนองจอก',
    ndvi: 0.44,
    lst: 33.0,
    area: 236.3
  }]
};

// Monthly NDVI/LST series (Jan–Dec)
const GL_MONTHLY_NDVI = [0.31, 0.28, 0.25, 0.24, 0.27, 0.33, 0.38, 0.41, 0.40, 0.37, 0.35, 0.33];
const GL_MONTHLY_LST = [33.1, 34.8, 36.9, 37.8, 36.4, 34.2, 33.0, 32.5, 32.8, 33.2, 33.0, 32.6];
const GL_MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const GL_YEARS = [2569, 2568, 2567, 2566, 2565, 2564];
const GL_RANKING_WORST = [{
  rank: 1,
  th: 'สมุทรปราการ',
  val: 5.7
}, {
  rank: 2,
  th: 'กรุงเทพมหานคร',
  val: 4.1
}, {
  rank: 3,
  th: 'นนทบุรี',
  val: 6.2
}, {
  rank: 4,
  th: 'ปทุมธานี',
  val: 7.4
}, {
  rank: 5,
  th: 'สมุทรสาคร',
  val: 8.0
}];
const GL_RANKING_BEST = [{
  rank: 73,
  th: 'แม่ฮ่องสอน',
  val: 2104.8
}, {
  rank: 74,
  th: 'ตาก',
  val: 1480.2
}, {
  rank: 75,
  th: 'กาญจนบุรี',
  val: 1102.6
}, {
  rank: 76,
  th: 'เชียงใหม่',
  val: 812.4
}, {
  rank: 77,
  th: 'น่าน',
  val: 776.1
}];
const getNdviLabel = v => v >= 0.6 ? 'หนาแน่นมาก' : v >= 0.45 ? 'หนาแน่น' : v >= 0.3 ? 'ปานกลาง' : 'น้อย';
const getLstLabel = v => v >= 38 ? 'ร้อนมาก' : v >= 33 ? 'ร้อน' : v >= 28 ? 'ปานกลาง' : 'เย็น';
Object.assign(window, {
  GL_PROVINCES,
  GL_DISTRICTS,
  GL_MONTHLY_NDVI,
  GL_MONTHLY_LST,
  GL_MONTH_LABELS,
  GL_YEARS,
  GL_RANKING_WORST,
  GL_RANKING_BEST,
  getNdviLabel,
  getLstLabel
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/Landing.jsx
try { (() => {
// GreenLens landing page — faithful recreation of the product's public intro.
// Copy is the real product copy (Thai); structure mirrors Landing.js upstream.
const {
  useEffect,
  useRef,
  useState
} = React;
const FEATURES = [['สถิติเชิงพื้นที่', 'NDVI · อุณหภูมิพื้นผิว (LST) รายปี/รายเดือน และพื้นที่สีเขียวต่อประชากรเทียบเกณฑ์ WHO ระดับจังหวัดลงถึงอำเภอ'], ['แนวโน้ม + พยากรณ์', 'ดูการเปลี่ยนแปลงย้อนหลังหลายปี พร้อมพยากรณ์ล่วงหน้า 3 ปีด้วย OLS regression และช่วงความเชื่อมั่น 95%'], ['เทียบภาพดาวเทียม 2 ปี', 'แบ่งจอซ้าย–ขวาลากเทียบ (swipe) หรือดูแผนที่ผลต่าง (Δ) ว่าจุดไหนเขียวขึ้น จุดไหนหายไป'], ['Cooling effect', 'พิสูจน์ความสัมพันธ์ "ยิ่งเขียว ยิ่งเย็น" ด้วย regression ของ LST ต่อ NDVI ระดับอำเภอ'], ['AI แนะนำจุดปลูกต้นไม้', 'Heatmap จัดลำดับพื้นที่ที่ควรปลูก จากการถ่วงน้ำหนักการขาดพื้นที่สีเขียว ความร้อน และความหนาแน่นประชากร พร้อมพันธุ์ไม้แนะนำรายภาค'], ['Time-lapse + รายงาน PDF', 'เล่นภาพการเปลี่ยนแปลงรายปีทั้งประเทศ และส่งออกรายงานพร้อมแผนที่ กราฟ และพิกัดในคลิกเดียว']];
const STEPS = [['เลือกพื้นที่', 'คลิกจังหวัดบนแผนที่ หรือพิมพ์ค้นหา แล้วเจาะลึกต่อถึงระดับอำเภอ'], ['วิเคราะห์', 'ดูสถิติ แนวโน้ม เปิดภาพดาวเทียมจริง เทียบรายปี หรือให้ AI แนะนำจุดปลูก'], ['นำไปใช้', 'ส่งออกรายงาน PDF / CSV หรือแชร์ลิงก์ที่จำจังหวัด อำเภอ และแท็บที่เปิดอยู่ให้อัตโนมัติ']];
const SHOTS = [['../../assets/img/dashboard-stats.jpg', 'หน้าจอสถิติรายจังหวัด แสดงอุณหภูมิพื้นผิวและกราฟรายเดือน', 'สถิติรายจังหวัด — LST รายเดือน และความเสี่ยงเกาะความร้อนเมือง'], ['../../assets/img/dashboard-recommend.jpg', 'หน้าจอ AI แนะนำ แสดงแผนที่ 3 มิติพร้อมรายการพันธุ์ไม้', 'AI แนะนำ — แผนที่ 3D พร้อมพันธุ์ไม้ที่เหมาะกับแต่ละภาค'], ['../../assets/img/report-pdf.png', 'ตัวอย่างรายงาน PDF แผนปลูกต้นไม้เชิงพื้นที่', 'รายงาน PDF — แผนปลูกต้นไม้พร้อมพิกัด Top 10 ที่ควรเร่งดำเนินการ']];
const DATASETS = [['Sentinel-2 (ESA / Copernicus)', 'ภาพถ่ายดาวเทียมรายเดือน คำนวณ NDVI ความละเอียด 10 เมตร'], ['Landsat 8/9 (USGS / NASA)', 'อุณหภูมิพื้นผิว (LST) ความละเอียด 30 เมตร'], ['WorldPop', 'ความหนาแน่นประชากร สำหรับพื้นที่สีเขียวต่อหัว'], ['ESA WorldCover', 'ขอบเขตเขตเมือง (urban mask)'], ['GADM 4.1', 'ขอบเขตการปกครอง จังหวัด/อำเภอ']];
const METHOD = [['พื้นที่สีเขียว', 'NDVI > 0.3 (รวมพืชเกษตร) · ป่าหนาแน่น: NDVI > 0.5'], ['เกณฑ์ WHO', 'พื้นที่สีเขียว ≥ 9 ตร.ม./คน · Urban subset เทียบเฉพาะในเขตเมือง'], ['AI Recommend', 'Priority = 0.40·NDVI deficit + 0.30·LST heat + 0.30·population need'], ['Cooling', 'Regression ของ LST ต่อ NDVI ระดับอำเภอ (slope < 0 = ยิ่งเขียวยิ่งเย็น)']];
function Landing() {
  const mainRef = useRef(null);
  const [theme, setTheme] = useState('light');
  const [lightbox, setLightbox] = useState(null);
  const isDark = theme === 'dark';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return undefined;
    const targets = root.querySelectorAll('.reveal');
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach(el => el.classList.add('is-visible'));
      return undefined;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, {
      threshold: 0.12
    });
    targets.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') setLightbox(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);
  const onEnter = () => {
    window.location.href = '../dashboard/index.html';
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "landing"
  }, /*#__PURE__*/React.createElement("header", {
    className: "landing__bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "landing__brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar__mark",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, "GreenLens", /*#__PURE__*/React.createElement("em", null, "Thailand"))), /*#__PURE__*/React.createElement("button", {
    className: "landing__bar-icon",
    onClick: () => setTheme(isDark ? 'light' : 'dark'),
    "aria-label": isDark ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด'
  }, isDark ? '☀' : '☾'), /*#__PURE__*/React.createElement("button", {
    className: "landing__bar-cta",
    onClick: onEnter
  }, "\u0E40\u0E1B\u0E34\u0E14\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14 \u203A")), /*#__PURE__*/React.createElement("main", {
    ref: mainRef
  }, /*#__PURE__*/React.createElement("section", {
    className: "landing__hero"
  }, /*#__PURE__*/React.createElement("p", {
    className: "landing__kicker"
  }, "Sentinel-2 \xB7 Landsat 8/9 \xB7 Google Earth Engine"), /*#__PURE__*/React.createElement("h1", null, "\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27\u0E02\u0E2D\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E44\u0E17\u0E22", /*#__PURE__*/React.createElement("br", null), "\u0E27\u0E31\u0E14\u0E44\u0E14\u0E49 \u0E40\u0E2B\u0E47\u0E19\u0E44\u0E14\u0E49 \u0E27\u0E32\u0E07\u0E41\u0E1C\u0E19\u0E44\u0E14\u0E49"), /*#__PURE__*/React.createElement("p", {
    className: "landing__sub"
  }, "\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E14\u0E31\u0E0A\u0E19\u0E35\u0E1E\u0E37\u0E0A\u0E1E\u0E23\u0E23\u0E13 (NDVI) \u0E2D\u0E38\u0E13\u0E2B\u0E20\u0E39\u0E21\u0E34\u0E1E\u0E37\u0E49\u0E19\u0E1C\u0E34\u0E27 (LST) \u0E41\u0E25\u0E30\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27\u0E15\u0E48\u0E2D\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E01\u0E23\u0E08\u0E32\u0E01\u0E20\u0E32\u0E1E\u0E16\u0E48\u0E32\u0E22\u0E14\u0E32\u0E27\u0E40\u0E17\u0E35\u0E22\u0E21 \u0E04\u0E23\u0E1A\u0E17\u0E31\u0E49\u0E07 77 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14 \u0E40\u0E08\u0E32\u0E30\u0E25\u0E36\u0E01\u0E16\u0E36\u0E07\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E2D\u0E33\u0E40\u0E20\u0E2D \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E23\u0E30\u0E1A\u0E1A AI \u0E41\u0E19\u0E30\u0E19\u0E33\u0E08\u0E38\u0E14\u0E17\u0E35\u0E48\u0E04\u0E27\u0E23\u0E1B\u0E25\u0E39\u0E01\u0E15\u0E49\u0E19\u0E44\u0E21\u0E49"), /*#__PURE__*/React.createElement("div", {
    className: "landing__cta-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "landing__cta",
    onClick: onEnter
  }, "\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14 ", /*#__PURE__*/React.createElement("span", {
    className: "landing__cta-arrow",
    "aria-hidden": "true"
  }, "\u2192")), /*#__PURE__*/React.createElement("a", {
    className: "landing__cta landing__cta--ghost",
    href: "#method"
  }, "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E1A\u0E27\u0E34\u0E18\u0E35")), /*#__PURE__*/React.createElement("dl", {
    className: "landing__stats"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14"), /*#__PURE__*/React.createElement("dd", null, "77")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u0E2D\u0E33\u0E40\u0E20\u0E2D / \u0E40\u0E02\u0E15"), /*#__PURE__*/React.createElement("dd", null, "900+")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u0E04\u0E27\u0E32\u0E21\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14 NDVI"), /*#__PURE__*/React.createElement("dd", null, "10 m")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E23\u0E32\u0E22\u0E1B\u0E35"), /*#__PURE__*/React.createElement("dd", null, "2560\u20132569")))), /*#__PURE__*/React.createElement("section", {
    className: "landing__section"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "reveal"
  }, "\u0E17\u0E33\u0E2D\u0E30\u0E44\u0E23\u0E44\u0E14\u0E49\u0E1A\u0E49\u0E32\u0E07"), /*#__PURE__*/React.createElement("div", {
    className: "landing__grid"
  }, FEATURES.map(([title, desc], i) => /*#__PURE__*/React.createElement("article", {
    className: "landing__card reveal",
    key: title
  }, /*#__PURE__*/React.createElement("h3", null, /*#__PURE__*/React.createElement("span", {
    className: "landing__card-no"
  }, String(i + 1).padStart(2, '0')), title), /*#__PURE__*/React.createElement("p", null, desc))))), /*#__PURE__*/React.createElement("section", {
    className: "landing__section"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "reveal"
  }, "\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E08\u0E2D"), /*#__PURE__*/React.createElement("div", {
    className: "landing__shots"
  }, SHOTS.map(([src, alt, caption]) => /*#__PURE__*/React.createElement("figure", {
    className: "reveal",
    key: src
  }, /*#__PURE__*/React.createElement("button", {
    className: "landing__shot-btn",
    onClick: () => setLightbox([src, alt, caption]),
    "aria-label": 'ขยายภาพ: ' + caption
  }, /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt,
    loading: "lazy"
  })), /*#__PURE__*/React.createElement("figcaption", null, caption))))), /*#__PURE__*/React.createElement("section", {
    className: "landing__section"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "reveal"
  }, "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E43\u0E0A\u0E49\u0E43\u0E19 3 \u0E02\u0E31\u0E49\u0E19"), /*#__PURE__*/React.createElement("ol", {
    className: "landing__steps"
  }, STEPS.map(([title, desc]) => /*#__PURE__*/React.createElement("li", {
    className: "reveal",
    key: title
  }, /*#__PURE__*/React.createElement("h3", null, title), /*#__PURE__*/React.createElement("p", null, desc))))), /*#__PURE__*/React.createElement("section", {
    className: "landing__section",
    id: "method"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "reveal"
  }, "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E1A\u0E27\u0E34\u0E18\u0E35"), /*#__PURE__*/React.createElement("div", {
    className: "landing__method"
  }, /*#__PURE__*/React.createElement("div", {
    className: "reveal"
  }, /*#__PURE__*/React.createElement("h3", null, "\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25"), /*#__PURE__*/React.createElement("ul", null, DATASETS.map(([name, use]) => /*#__PURE__*/React.createElement("li", {
    key: name
  }, /*#__PURE__*/React.createElement("strong", null, name), " \u2014 ", use)))), /*#__PURE__*/React.createElement("div", {
    className: "reveal"
  }, /*#__PURE__*/React.createElement("h3", null, "\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E1A\u0E27\u0E34\u0E18\u0E35\u0E42\u0E14\u0E22\u0E2A\u0E23\u0E38\u0E1B"), /*#__PURE__*/React.createElement("ul", null, METHOD.map(([name, detail]) => /*#__PURE__*/React.createElement("li", {
    key: name
  }, /*#__PURE__*/React.createElement("strong", null, name), " \u2014 ", detail))), /*#__PURE__*/React.createElement("p", {
    className: "landing__method-note"
  }, "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E01\u0E32\u0E23\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07\u0E40\u0E0A\u0E34\u0E07\u0E27\u0E34\u0E0A\u0E32\u0E01\u0E32\u0E23\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 \u0E14\u0E39\u0E44\u0E14\u0E49\u0E17\u0E35\u0E48\u0E1B\u0E38\u0E48\u0E21 \u24D8 \u0E43\u0E19\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14")))), /*#__PURE__*/React.createElement("section", {
    className: "landing__final"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "reveal"
  }, "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27\u0E41\u0E25\u0E49\u0E27\u0E2B\u0E23\u0E37\u0E2D\u0E22\u0E31\u0E07"), /*#__PURE__*/React.createElement("button", {
    className: "landing__cta",
    onClick: onEnter
  }, "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14 ", /*#__PURE__*/React.createElement("span", {
    className: "landing__cta-arrow",
    "aria-hidden": "true"
  }, "\u2192")))), /*#__PURE__*/React.createElement("footer", {
    className: "landing__footer"
  }, "GreenLens \u2014 \u0E41\u0E1E\u0E25\u0E15\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27\u0E41\u0E25\u0E30\u0E40\u0E01\u0E32\u0E30\u0E04\u0E27\u0E32\u0E21\u0E23\u0E49\u0E2D\u0E19\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E20\u0E32\u0E1E\u0E16\u0E48\u0E32\u0E22\u0E14\u0E32\u0E27\u0E40\u0E17\u0E35\u0E22\u0E21", /*#__PURE__*/React.createElement("br", null), "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E14\u0E32\u0E27\u0E40\u0E17\u0E35\u0E22\u0E21 \xA9 Copernicus / USGS / ESA WorldCover / WorldPop \xB7 \u0E02\u0E2D\u0E1A\u0E40\u0E02\u0E15 GADM 4.1 \xB7 \u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48 \xA9 CARTO, OpenStreetMap contributors"), lightbox && /*#__PURE__*/React.createElement("div", {
    className: "landing__lightbox",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": lightbox[2]
  }, /*#__PURE__*/React.createElement("button", {
    className: "landing__lightbox-backdrop",
    "aria-label": "\u0E1B\u0E34\u0E14\u0E20\u0E32\u0E1E\u0E02\u0E22\u0E32\u0E22",
    onClick: () => setLightbox(null)
  }), /*#__PURE__*/React.createElement("figure", null, /*#__PURE__*/React.createElement("img", {
    src: lightbox[0],
    alt: lightbox[1]
  }), /*#__PURE__*/React.createElement("figcaption", null, lightbox[2], " \xB7 \u0E01\u0E14 Esc \u0E2B\u0E23\u0E37\u0E2D\u0E04\u0E25\u0E34\u0E01\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E34\u0E14"))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Landing, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/Landing.jsx", error: String((e && e.message) || e) }); }

__ds_ns.BrandMark = __ds_scope.BrandMark;

__ds_ns.ExportBar = __ds_scope.ExportBar;

__ds_ns.Figure = __ds_scope.Figure;

__ds_ns.KVRow = __ds_scope.KVRow;

__ds_ns.KV = __ds_scope.KV;

__ds_ns.Note = __ds_scope.Note;

__ds_ns.DefList = __ds_scope.DefList;

__ds_ns.MapLegend = __ds_scope.MapLegend;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.StatusDot = __ds_scope.StatusDot;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Label = __ds_scope.Label;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.SectionHead = __ds_scope.SectionHead;

__ds_ns.Section = __ds_scope.Section;

__ds_ns.Collapsible = __ds_scope.Collapsible;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.TopBar = __ds_scope.TopBar;

})();
