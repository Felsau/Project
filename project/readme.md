# GreenLens Design System

**GreenLens** is a platform for analyzing green spaces and urban heat island effects from satellite imagery, built for government agencies and urban planners. The shipped product is a Thai-language analysis dashboard covering all 77 provinces of Thailand down to district level: an interactive map (MapLibre + deck.gl 3D extrusions) with NDVI/LST choropleths and raster overlays, statistics / trend-forecast / two-year satellite comparison / cooling-effect tabs, an AI tree-planting recommendation heatmap, time-lapse playback, automated PDF reports (jsPDF + Sarabun), CSV exports, and deep links that remember province + district + open tab for district-level data sharing.

**Source:** https://github.com/Felsau/Project (`green-area-frontend/` — React 18, CRA). Explore the repo to design deeper against the real product: `src/styles/` is the authoritative CSS (this system mirrors it), `src/components/` the UI, `src/utils/reportPdf.js` the PDF reports.

## The design in one paragraph

A research instrument printed on paper. Light paper surfaces, hairline rules, one verdant green accent used sparingly, and a strict ink scale for everything else. Every number is tabular mono. Titles are tiny, uppercase, letter-spaced. Radii are small, shadows nearly absent, decoration absent. Thai is the product's first language; English appears in data/source labels. It looks closer to a well-set statistical yearbook than a SaaS dashboard.

## CONTENT FUNDAMENTALS

- **Language**: Thai-first UI copy (`ค้นหาจังหวัด…`, `โหลดอันดับ`, `ดูภาพรวมประเทศ`). Technical/data vocabulary stays English: NDVI, LST, raster, Sentinel-2, WHO, Time-lapse, AI.
- **Tone**: factual, instructive, compact — like a methodology note. No marketing superlatives inside the app; the landing page is allowed measured confidence: `พื้นที่สีเขียวของประเทศไทย วัดได้ เห็นได้ วางแผนได้` ("measurable, visible, plannable").
- **Voice**: imperative for instructions (`คลิกจังหวัดบนแผนที่เพื่อดูข้อมูลเชิงลึก`), no "we", no "I". The system never speaks about itself.
- **Numbers carry the meaning**: copy quotes figures inline with units — `+2.4°C`, `9 ตร.ม./คน`, `NDVI > 0.3` — wrapped in mono (`.note__num`).
- **No emoji, ever.** Icons are unicode glyphs (ⓘ ☾ ☀ ‹ › ▾ × → ↳ ⌂) — see ICONOGRAPHY.
- **Casing**: Thai has no case; English labels use sentence case in prose, UPPERCASE for tiny tracked labels (`MIN`, `MAX`, section titles via CSS `text-transform`).
- **Honesty markers**: data coverage is always disclosed (`62 / 77 จังหวัด`), loading states named (`กำลังดึงข้อมูลจาก GEE…`), missing data shown as `—` and a hatched legend swatch (`ยังไม่มีข้อมูล`).
- **Methodology is content**: formulas appear verbatim in UI (`Priority = 0.40·NDVI deficit + 0.30·LST heat + 0.30·population need`).

## VISUAL FOUNDATIONS

- **Color**: light `--paper` #fbfbfa app ground, white `--surface` panels, 9-step neutral ink scale (`--ink-0`…`--ink-8`, 0 = strongest). ONE accent green `--accent` #1f6f43 (hover `#145232`, tint `#e8f0eb`) for: primary buttons, active overlay buttons, brand mark, progress fills, status dot, focus rings, note edges. Active *chips/tabs* fill with **ink**, not green — green is never a "selected" color except the tab underline. Functional `--warn` #8b5a00 / `--crit` #a02020 with soft fills. Full dark theme via `:root[data-theme="dark"]` (same token names).
- **Data scales (not brand colors)**: NDVI sequential greens `#bbf7d0→#22c55e`; LST diverging `#60a5fa→#ef4444`; AI priority `#1a9850→#d73027`. Tokens `--ndvi-*`, `--lst-*`, `--prio-*`, gradients `--grad-*`.
- **Type**: Inter (UI) + IBM Plex Sans Thai (Thai fallback) + IBM Plex Mono (every numeral, coordinate, unit, year; always `tabular-nums`). Sarabun (self-hosted TTF) only for PDF report mocks. Tight scale: base 13.5px, xs 11.5px; display rare (30px / clamp on landing). Uppercase micro-labels at 10–11px with 0.08–0.14em tracking. Body line-height 1.6.
- **Spacing**: 4px base (`--s-1`…`--s-12`); dense, instrument-panel rhythm. Sidebar fixed 360px; topbar 40px.
- **Backgrounds**: flat paper. No gradients except: hero radial `--accent-soft` glow (landing, one flourish), final-CTA fade, protection badges on map (`rgba(11,13,12,0.6)`). No textures, no illustrations, no patterns — photography is product screenshots only.
- **Borders & rules**: 1px hairlines everywhere (`--rule` #e1e3df, stronger `--rule-2`); dotted rules for definition/rank rows; 2px solid left edge for notes/toasts (green/amber/red by tone).
- **Radii**: 3px controls, 5px cards/buttons, 8px landing cards. Never pills, never large rounding.
- **Elevation**: flat by default. `0 1px 3px rgba(0,0,0,0.06)` on floating map controls; lifted card shadow only on landing hover and lightbox. The green CTA gets a soft green glow `--shadow-cta`.
- **Hover states**: background wash to `--ink-8` + text darkens; bordered controls darken border (`--ink-3`); landing cards lift `translateY(-3px)` + shadow; primary buttons darken to `--accent-strong`.
- **Press states**: background `--ink-8`; no scale-shrink anywhere.
- **Motion**: restrained and fast — 120ms ease color/border transitions; 350ms cubic-bezier bar fills; landing has 0.6s rise-in stagger + IntersectionObserver scroll-reveal; 1.4s linear loading line. Full `prefers-reduced-motion` fallbacks. No bounces, no parallax.
- **Transparency/blur**: almost none — lightbox backdrop `rgba(11,13,12,0.72)` + 2px blur; map year badges 60% ink. Panels are always opaque.
- **Cards**: white surface, 1px hairline, small radius, generous-but-tight padding (`--s-5`), NO shadow at rest.
- **Layout**: fixed app shell (topbar / sidebar / map), only the sidebar panel scrolls; landing is a fixed full-viewport scroll container with sticky 48px bar; content max-widths 880/1020px.
- **Imagery**: product screenshots, uniform crop (16/11), hairline border, top-aligned. Maps: light CARTO basemap, cool-neutral.

## ICONOGRAPHY

**There is no icon system.** The product deliberately uses **unicode glyphs as icons**, inheriting text color and font: ⓘ (about), ☾/☀ (theme), ‹ › (collapse), ▾ (chevron, rotates -90° closed), × (dismiss), → (CTA arrow, slides 3px on hover), ↳ (sub-item, via CSS content), ⌂ (home view), +/− (zoom), … (busy). The brand mark is a CSS diamond (rotated square / clip-path, `--accent`) — components/core/BrandMark or `assets/logo/*.svg`. Status is shown with 6px dot pseudo-elements, color-coded. **Do not** introduce an icon font, emoji or hand-drawn SVG icons; if a glyph doesn't exist for a concept, use a short text label instead. Numbered lists use mono `01 02 03…` (decimal-leading-zero counters). Assets live in `assets/`: logo SVGs, product screenshots (`assets/img/`), Sarabun TTFs (`assets/fonts/`).

## Index

| Path | What |
| --- | --- |
| `styles.css` | Global entry — link this one file |
| `tokens/` | `colors.css` (ink/accent/surfaces + dark theme), `typography.css`, `spacing.css`, `data.css` (NDVI/LST/priority scales), `fonts.css` (@font-face Sarabun + Google imports) |
| `css/` | Shipped classes: `base.css` reset, `forms.css` (.btn .field .chip .label), `figures.css` (.figure .kv .dl .note .bar), `sections.css` (.section .collapsible), `topbar.css`, `sidebar.css` (.tabs .context .panel), `search.css`, `ranking.css` (.rank-row .coverage), `map.css` (.legend-card .map-controls .overlay-toggle .export-bar .swipe-*), `modal.css`, `recommend.css`, `landing.css` |
| `components/core/` | BrandMark |
| `components/forms/` | Button, Chip, Field/Select/Label |
| `components/data/` | Figure/KVRow/KV/Note/DefList, MapLegend, ExportBar |
| `components/layout/` | TopBar, Tabs, Section/SectionHead/Collapsible |
| `components/feedback/` | Toast, StatusDot |
| `ui_kits/dashboard/` | Full interactive dashboard recreation (map + sidebar) |
| `ui_kits/landing/` | Public landing page recreation (Thai copy, scroll-reveal, lightbox) |
| `guidelines/` | Foundation specimen cards (Design System tab) |
| `assets/` | Logos, screenshots, fonts |

Component API contracts are in each `<Name>.d.ts`; usage notes in `<Name>.prompt.md`. The compiled bundle exposes everything on `window.GreenLensDesignSystem_4a358a`.

## Caveats

- Webfonts Inter / IBM Plex Sans Thai / IBM Plex Mono load from Google Fonts (the upstream product does the same); only Sarabun is self-hosted. 
- The dashboard kit's map pane is an annotated placeholder — production renders MapLibre + deck.gl, which isn't reproducible statically. Trend / cooling / compare tabs are intentionally left as disclaimed stubs.
- Product naming: upstream calls itself "Green Area Analysis Thailand"; this system brands it **GreenLens** per the company description, keeping all other copy verbatim.
