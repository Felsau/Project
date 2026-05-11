// Report PDF generator — HTML rendering via html2canvas (browser handles Thai shaping).
// All Thai text is rendered as HTML so glyphs are positioned correctly,
// then captured to canvas at 2x DPI and sliced into A4 pages.
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PROVINCE_TH, API_BASE } from '../constants';

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────
const MONTH_NAMES_TH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const ts = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

const fmt = (v, digits = 2) =>
  v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(digits);

const fmtInt = (v) =>
  v == null ? '—' : Number(v).toLocaleString('th-TH');

const esc = (s) => {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

// "MaeChaem" → "Mae Chaem"  /  "BuengKan" → "Bueng Kan"
const formatEnName = (s) => s ? String(s).replace(/([a-z])([A-Z])/g, '$1 $2') : s;

// ↑ / ↓ / — indicator string
// threshold ≈ 0.005 เพื่อกัน "↓ 0.000" ที่อ่านแล้วขัดสามัญสำนึก
// (ส่วนต่างที่ปัดเศษเหลือ 0 ไม่ควรมีลูกศรกำกับทิศทาง)
const arrow = (target, baseline, fmtFn = (v) => v.toFixed(3), epsilon = 0.005) => {
  if (target == null || baseline == null) return '';
  const diff = target - baseline;
  if (Math.abs(diff) < epsilon) return '— เท่ากัน';
  const sign = diff > 0 ? '↑' : '↓';
  return `${sign} ${fmtFn(Math.abs(diff))}`;
};

let fontInjected = false;
const ensureFont = () => {
  if (fontInjected) return;
  const style = document.createElement('style');
  style.id = 'report-pdf-font';
  style.textContent = `
    @font-face {
      font-family: 'ReportSarabun';
      src: url('/fonts/Sarabun-Regular.ttf') format('truetype');
      font-weight: 400; font-display: block;
    }
    @font-face {
      font-family: 'ReportSarabun';
      src: url('/fonts/Sarabun-Bold.ttf') format('truetype');
      font-weight: 700; font-display: block;
    }
  `;
  document.head.appendChild(style);
  fontInjected = true;
};

// Fetch image from backend → dataUrl (so html2canvas doesn't need CORS round-trip)
const fetchImageDataUrl = async (url) => {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((res) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result);
      r.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Image fetch failed:', url, e);
    return null;
  }
};

// ──────────────────────────────────────────────────────
// Layout constants
// ──────────────────────────────────────────────────────
const A4_W_PT = 595.28;
const A4_H_PT = 841.89;
const CONTENT_WIDTH_PX = 750;
const RENDER_SCALE = 2;
const PAGE_GAP_PX = 4; // small breathing space at top/bottom of each page

// Render a *segmented* HTML structure into a multi-page PDF.
// Sections is an array: [{ label, html }] — label drives the per-page header.
const renderSegmentsToPdf = async (sections, filename, meta = {}) => {
  ensureFont();

  const host = document.createElement('div');
  host.style.cssText = `
    position: fixed; top: 0; left: -100000px;
    width: ${CONTENT_WIDTH_PX}px; background: #fff; z-index: -1;
  `;
  // each section wrapped in a div tagged with data-label
  const inner = sections.map(s =>
    `<div class="report-section" data-label="${esc(s.label || '')}">${s.html}</div>`
  ).join('');

  host.innerHTML = `
    <div class="report-root" style="
      width: ${CONTENT_WIDTH_PX}px; background: #fff;
      font-family: 'ReportSarabun', 'Sarabun', 'Tahoma', sans-serif;
      font-size: 11pt; color: #202124; line-height: 1.55; box-sizing: border-box;
    ">${inner}</div>
  `;
  document.body.appendChild(host);

  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise(r => setTimeout(r, 120));

    const root = host.querySelector('.report-root');
    const sectionEls = Array.from(root.querySelectorAll('.report-section'));

    // Build a label-per-y map so we can show the right header on each page
    const labels = sectionEls.map(el => ({
      label: el.dataset.label || '',
      top: el.offsetTop,
      bottom: el.offsetTop + el.offsetHeight,
    }));

    // Collect "protected" element ranges (in canvas coords) — maps + chart blocks
    // shouldn't be split across pages. We measure offsetTop/Height before rendering.
    const protectedEls = Array.from(root.querySelectorAll('.no-split, .chart-block, .map-block'));
    const protectedRanges = protectedEls.map(el => ({
      top: el.offsetTop * RENDER_SCALE,
      bottom: (el.offsetTop + el.offsetHeight) * RENDER_SCALE,
    }));

    const canvas = await html2canvas(root, {
      scale: RENDER_SCALE,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      windowWidth: CONTENT_WIDTH_PX,
    });

    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

    const headerH = 28; // pt — header strip with section label + page number
    const usablePageH = A4_H_PT - headerH;

    // canvas full image scaled to A4 width
    const imgWPt = A4_W_PT;
    const pxPerPt = canvas.width / imgWPt;
    const pageSlicePx = usablePageH * pxPerPt;

    // If a slice would split through a protectedRange, end it just before the range instead.
    const findSliceEnd = (startY, defaultEndY, totalH) => {
      // Look for any protected range that starts before defaultEndY and ends after it
      for (const r of protectedRanges) {
        // Range entirely before this slice — skip
        if (r.bottom <= startY) continue;
        // Range entirely after — irrelevant
        if (r.top >= defaultEndY) continue;
        // Range starts within slice but extends past — only push to next page if range fits in one page
        const rangeH = r.bottom - r.top;
        if (r.top > startY && r.top < defaultEndY && r.bottom > defaultEndY && rangeH <= pageSlicePx) {
          return r.top; // end this slice just before the protected element
        }
      }
      return defaultEndY > totalH ? totalH : defaultEndY;
    };

    let yPx = 0;
    const pageRanges = [];
    while (yPx < canvas.height) {
      const defaultEnd = yPx + pageSlicePx;
      const endY = findSliceEnd(yPx, defaultEnd, canvas.height);
      const slicePx = endY - yPx;
      // Avoid infinite loop: if slicePx becomes 0 or negative (range bigger than page), force advance
      if (slicePx <= 0) {
        pageRanges.push({ yPx, slicePx: Math.min(pageSlicePx, canvas.height - yPx) });
        yPx += pageSlicePx;
      } else {
        pageRanges.push({ yPx, slicePx });
        yPx = endY;
      }
    }
    const pageCount = pageRanges.length;

    // helper: คืน label ของ section ที่ "ครอบครองหน้านี้มากที่สุด" (vertical overlap สูงสุด)
    // ทำงานถูกในทุกเคส: tail ของ section ก่อนล้นมาขึ้นบน → section ใหม่ยังชนะถ้ากินเนื้อที่มากกว่า,
    // หรือทั้งหน้าเป็น tail ของ section เดิม → section เดิมก็ชนะตามจริง
    const labelForRange = (yCanvas, sliceCanvasPx) => {
      const yCss = yCanvas / RENDER_SCALE;
      const yEnd = yCss + sliceCanvasPx / RENDER_SCALE;
      let best = labels[0]?.label || '';
      let bestOverlap = 0;
      for (const L of labels) {
        const overlap = Math.max(0, Math.min(L.bottom, yEnd) - Math.max(L.top, yCss));
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = L.label;
        }
      }
      return best;
    };

    pageRanges.forEach(({ yPx, slicePx }, i) => {
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = slicePx;
      const ctx = slice.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, yPx, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
      const dataUrl = slice.toDataURL('image/jpeg', 0.92);

      if (i > 0) pdf.addPage();

      // ── Header strip (vector — no Thai shaping issues for English/numbers)
      pdf.setFillColor(248, 249, 250);
      pdf.rect(0, 0, A4_W_PT, headerH, 'F');
      pdf.setDrawColor(218, 220, 224);
      pdf.setLineWidth(0.5);
      pdf.line(0, headerH, A4_W_PT, headerH);

      pdf.setFontSize(8);
      pdf.setTextColor(95, 99, 104);

      // section label = ASCII-only เพื่อเลี่ยงปัญหา shaping ไทยใน jsPDF default font
      const sectionLabel = labelForRange(yPx, slicePx);
      const headerLeft = sectionLabel
        ? `${meta.docTitle || 'Green Area Report'}  ·  ${sectionLabel}`
        : (meta.docTitle || 'Green Area Report');
      pdf.text(headerLeft, 20, 17);

      // page number right-aligned
      pdf.text(`${i + 1} / ${pageCount}`, A4_W_PT - 20, 17, { align: 'right' });

      // ── Body image (slice). Place below header strip
      pdf.addImage(dataUrl, 'JPEG', 0, headerH, imgWPt, slicePx / pxPerPt, undefined, 'FAST');
    });

    pdf.save(filename);
  } finally {
    document.body.removeChild(host);
  }
};

// ──────────────────────────────────────────────────────
// Style snippets
// ──────────────────────────────────────────────────────
const COLOR = {
  primary: '#1a73e8',
  green: '#1e8e3e',
  greenDeep: '#0e5c24',
  text: '#202124',
  muted: '#5f6368',
  border: '#dadce0',
  light: '#f1f3f4',
  red: '#dc2626',
  orange: '#f97316',
};

const cover = ({ kicker, heading, subheading, accent = COLOR.primary, miniMapDataUrl, year }) => `
  <div style="background:${accent};color:#fff;padding:36px 40px 28px;display:flex;gap:24px;align-items:center;">
    <div style="flex:1;">
      <div style="font-size:10pt;letter-spacing:0.14em;opacity:0.92;text-transform:uppercase;">${esc(kicker)}</div>
      <div style="font-size:24pt;font-weight:700;margin-top:10px;line-height:1.18;">${esc(heading)}</div>
      ${subheading ? `<div style="font-size:12pt;margin-top:6px;opacity:0.95;">${esc(subheading)}</div>` : ''}
      ${year ? `<div style="font-size:10pt;margin-top:14px;opacity:0.9;">ปี ${esc(year)}</div>` : ''}
      <div style="font-size:9pt;margin-top:10px;opacity:0.85;">จัดทำ ${esc(new Date().toLocaleString('th-TH'))}</div>
    </div>
    ${miniMapDataUrl ? `
      <div style="flex:0 0 140px;background:#fff;border-radius:6px;padding:6px;">
        <img src="${miniMapDataUrl}" style="display:block;width:100%;height:auto;" alt="Thailand map" />
      </div>` : ''}
  </div>
`;

const sectionTitle = (text, opts = {}) => `
  <div style="display:flex;align-items:center;gap:10px;margin:22px 40px 10px;">
    <div style="width:4px;height:20px;background:${opts.color || COLOR.primary};border-radius:2px;"></div>
    <div style="font-size:14pt;font-weight:700;color:${COLOR.text};">${esc(text)}</div>
  </div>
`;

const paragraph = (text, opts = {}) => {
  const { color = COLOR.text, bold = false, size = '10.5pt', muted = false } = opts;
  return `<div style="margin:4px 40px 8px;font-size:${size};font-weight:${bold ? 700 : 400};color:${muted ? COLOR.muted : color};line-height:1.65;">${text}</div>`;
};

const table = (headers, rows, opts = {}) => {
  const { firstColWidth = null, keepTogether = false } = opts;
  const colWidths = firstColWidth
    ? `<colgroup><col style="width:${firstColWidth}px"/>${headers.slice(1).map(() => '<col/>').join('')}</colgroup>`
    : '';
  // keepTogether → ทั้งตารางต้องอยู่หน้าเดียวกัน (เหมาะตาราง 3-6 แถว)
  // ปกติ → ปล่อยให้แถวเดี่ยวๆ avoid break (กันแถวถูกตัดครึ่ง) แต่ตารางใหญ่แตกหน้าได้
  const wrapAttrs = keepTogether
    ? `class="no-split" style="margin:0 40px 14px;page-break-inside:avoid;break-inside:avoid;"`
    : `style="margin:0 40px 14px;"`;
  return `
    <div ${wrapAttrs}>
      <table style="width:100%;border-collapse:collapse;font-size:10pt;">
        ${colWidths}
        <thead>
          <tr style="background:${COLOR.primary};color:#fff;page-break-inside:avoid;break-inside:avoid;">
            ${headers.map(h => `<th style="padding:9px 11px;text-align:left;font-weight:700;font-size:10pt;border:1px solid ${COLOR.primary};">${esc(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fa'};page-break-inside:avoid;break-inside:avoid;">
              ${r.map(c => `<td style="padding:7px 11px;border:1px solid ${COLOR.border};color:${COLOR.text};">${esc(c)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const calloutBox = (text, color = COLOR.primary) => `
  <div class="no-split" style="margin:6px 40px 12px;padding:10px 14px;background:${color}12;border-left:3px solid ${color};border-radius:4px;font-size:10.5pt;color:${color};font-weight:600;line-height:1.55;page-break-inside:avoid;break-inside:avoid;">
    ${text}
  </div>
`;

// note() = บรรทัดสั้น ๆ → ใส่ class no-split เสมอ กัน slicer ตัดครึ่งกลางตัวอักษรไทย
// (html2canvas slice เป็น bitmap → glyph ที่โดนตัดจะแสดงผลเพี้ยน เช่น สระ/วรรณยุกต์หาย)
const note = (text) => `
  <div class="no-split" style="margin:0 40px 10px;font-size:8.5pt;color:${COLOR.muted};line-height:1.5;page-break-inside:avoid;break-inside:avoid;">${text}</div>
`;

const twoColumns = (left, right, opts = {}) => `
  <div style="display:flex;gap:14px;margin:0 40px 12px;">
    <div style="flex:1;">${left}</div>
    <div style="flex:1;">${right}</div>
  </div>
`;

const imageBox = (dataUrl, caption, opts = {}) => {
  if (!dataUrl) return '';
  const { width = '100%', heightHint = null } = opts;
  // map-block class: don't split across PDF pages
  return `
    <div class="map-block" style="margin:6px 40px 12px;text-align:center;page-break-inside:avoid;break-inside:avoid;">
      <img src="${dataUrl}" style="display:block;width:${width};${heightHint ? `max-height:${heightHint};` : ''}height:auto;border:1px solid ${COLOR.border};border-radius:4px;margin:0 auto;" />
      ${caption ? `<div style="font-size:8.5pt;color:${COLOR.muted};margin-top:4px;line-height:1.4;">${caption}</div>` : ''}
    </div>
  `;
};

// Pick a "nice" axis tick step so the labels are clean (e.g. 0,10,20,30,40 not 7.9,15.8,…)
const niceStep = (range, targetSteps = 5) => {
  if (range <= 0) return 1;
  const raw = range / targetSteps;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const candidates = [1, 2, 2.5, 5, 10];
  const nice = candidates.find(c => norm <= c) || 10;
  return nice * mag;
};

// ──────────────────────────────────────────────────────
// Yearly line chart — สำหรับ multi-year trend (Phase B-2)
// ──────────────────────────────────────────────────────

// Helper: ตำแหน่ง transform ของ value label ตาม % ของแกน X
// — ขอบซ้าย/ขวาให้ anchor ฝั่งเดียว ไม่ทับ y-axis tick หรือ overflow ออกขวา
const _xLabelTransform = (xPct) => {
  if (xPct < 6) return 'translateX(0)';
  if (xPct > 94) return 'translateX(-100%)';
  return 'translateX(-50%)';
};

const yearlyLineChart = ({
  title, subtitle, data, valueKey, valueLabel,
  color = COLOR.green, valueFmt = (v) => v?.toFixed(2),
  yMinPad = 0.05, yMaxPad = 0.05, footnote = null,
}) => {
  const points = data.filter(d => d[valueKey] != null);
  if (points.length === 0) {
    return `<div class="chart-block" style="margin:6px 40px 14px;padding:12px 14px;background:#fff;border:1px solid ${COLOR.border};border-radius:6px;">
      <div style="font-size:11.5pt;font-weight:700;color:${COLOR.text};">${title}</div>
      <div style="font-size:9pt;color:${COLOR.muted};margin-top:6px;">ไม่มีข้อมูล cached ในช่วงปีที่ระบุ</div>
    </div>`;
  }

  // ── Single-point: แสดงเป็น stat card แทน line chart
  // (กราฟเส้นจุดเดียวกับสเกล y แคบจัดดูเข้าใจผิดง่าย)
  if (points.length === 1) {
    const p = points[0];
    return `
      <div class="chart-block" style="margin:6px 40px 14px;padding:14px 18px;background:#fff;border:1px solid ${COLOR.border};border-radius:6px;page-break-inside:avoid;break-inside:avoid;">
        <div style="font-size:11.5pt;font-weight:700;color:${COLOR.text};">${title}</div>
        ${subtitle ? `<div style="font-size:9pt;color:${COLOR.muted};margin-top:2px;">${subtitle}</div>` : ''}
        <div style="display:flex;align-items:baseline;gap:14px;margin-top:10px;padding:12px 16px;background:#f8f9fa;border-left:3px solid ${color};border-radius:4px;">
          <div style="font-size:18pt;font-weight:700;color:${color};font-family:monospace;">${valueFmt(p[valueKey])}</div>
          <div style="font-size:10pt;color:${COLOR.muted};">ปี ${p.year}${valueLabel ? ` · ${valueLabel}` : ''}</div>
        </div>
        <div style="font-size:8.5pt;color:${COLOR.muted};margin-top:8px;font-style:italic;line-height:1.5;">
          มีข้อมูล cached ปีเดียว — ยังไม่สามารถแสดงแนวโน้มได้ · เปิดดูปีอื่นในแอปก่อน trigger compute เพื่อให้รายงานครั้งถัดไปมีเส้นแนวโน้ม
        </div>
      </div>
    `;
  }

  const values = points.map(p => p[valueKey]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || 1;
  let yMin = rawMin - span * yMinPad;
  let yMax = rawMax + span * yMaxPad;
  // round to nice step
  const step = niceStep(yMax - yMin, 4);
  yMin = Math.floor(yMin / step) * step;
  yMax = Math.ceil(yMax / step) * step;
  const range = yMax - yMin || 1;
  const tickCount = Math.max(2, Math.round(range / step));
  const gridValues = Array.from({ length: tickCount + 1 }, (_, i) => yMin + i * step);

  const chartH = 150;
  const chartW = 560;  // px — ใช้คำนวณตำแหน่ง point/line

  // map year → x position
  const years = points.map(p => p.year);
  const xMin = Math.min(...years), xMax = Math.max(...years);
  const xRange = xMax - xMin || 1;
  const yearToX = (y) => points.length === 1 ? chartW / 2 : ((y - xMin) / xRange) * chartW;
  const valToY = (v) => chartH - ((v - yMin) / range) * chartH;

  // build polyline path
  const linePoints = points.map(p => `${yearToX(p.year).toFixed(1)},${valToY(p[valueKey]).toFixed(1)}`).join(' ');

  return `
    <div class="chart-block" style="margin:6px 40px 14px;padding:12px 14px 10px;background:#fff;border:1px solid ${COLOR.border};border-radius:6px;page-break-inside:avoid;break-inside:avoid;">
      <div style="margin-bottom:8px;">
        <div style="font-size:11.5pt;font-weight:700;color:${COLOR.text};">${title}</div>
        ${subtitle ? `<div style="font-size:9pt;color:${COLOR.muted};margin-top:2px;">${subtitle}</div>` : ''}
      </div>

      <div style="display:flex;gap:8px;">
        <div style="width:46px;height:${chartH}px;position:relative;flex-shrink:0;">
          ${gridValues.map((v, i) => {
            const top = chartH - (i / tickCount * chartH);
            return `<div style="position:absolute;right:0;top:${top - 6}px;font-size:8pt;color:${COLOR.muted};font-family:monospace;">${valueFmt(v)}</div>`;
          }).join('')}
        </div>

        <div style="flex:1;position:relative;height:${chartH}px;border-left:1px solid ${COLOR.border};border-bottom:1px solid ${COLOR.border};overflow:visible;">
          ${gridValues.map((_, i) => {
            const top = chartH - (i / tickCount * chartH);
            return `<div style="position:absolute;left:0;right:0;top:${top}px;border-top:1px dashed ${COLOR.light};"></div>`;
          }).join('')}

          <svg viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="none"
               style="position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;">
            ${points.length >= 2
              ? `<polyline points="${linePoints}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`
              : ''}
            ${points.map(p => {
              const x = yearToX(p.year);
              const y = valToY(p[valueKey]);
              return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
            }).join('')}
          </svg>

          ${points.map(p => {
            const xPct = ((p.year - xMin) / xRange) * 100;
            const yPx = valToY(p[valueKey]);
            return `<div style="position:absolute;left:${xPct.toFixed(1)}%;top:${(yPx - 18).toFixed(1)}px;transform:${_xLabelTransform(xPct)};font-size:7.5pt;color:${COLOR.text};font-weight:700;font-family:monospace;background:#ffffffcc;padding:0 3px;border-radius:2px;">${valueFmt(p[valueKey])}</div>`;
          }).join('')}
        </div>
      </div>

      <div style="position:relative;height:14px;margin:4px 4px 0 54px;">
        ${points.map(p => {
          const xPct = ((p.year - xMin) / xRange) * 100;
          return `<div style="position:absolute;left:${xPct.toFixed(1)}%;top:0;transform:${_xLabelTransform(xPct)};font-size:8pt;color:${COLOR.muted};">${p.year}</div>`;
        }).join('')}
      </div>

      <div style="margin-top:6px;display:flex;justify-content:space-between;gap:14px;">
        <div style="font-size:8pt;color:${COLOR.muted};line-height:1.5;flex:1;">${footnote || ''}</div>
        ${valueLabel ? `<div style="font-size:8pt;color:${COLOR.muted};font-style:italic;white-space:nowrap;">หน่วย: ${valueLabel}</div>` : ''}
      </div>
    </div>
  `;
};

// ──────────────────────────────────────────────────────
// Chart rendering — custom HTML/CSS so we control titles/units/labels/grid
// Always renders 12 months; distinguishes "no data" (cloud/missing) vs "future" (not yet).
// ──────────────────────────────────────────────────────
const monthlyBarChart = ({
  title, subtitle, year, unit, data, valueKey, color = COLOR.green,
  yMax, yMin = 0, valueFmt = (v) => v?.toFixed(2),
  refLine = null, footnote = null,
}) => {
  // Clone each item so we can attach _future/_missing flags
  // (React state objects are frozen — direct mutation throws TypeError)
  const today = new Date();
  const isCurrentYear = year && Number(year) === today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12

  const full = Array.from({ length: 12 }, (_, i) => {
    const found = data.find(d => d.month_num === i + 1);
    const base = found
      ? { ...found }
      : { month_num: i + 1, [valueKey]: null, image_count: 0 };
    base._future = isCurrentYear && base.month_num > currentMonth && base[valueKey] == null;
    base._missing = !base._future && base[valueKey] == null;
    return base;
  });

  const values = full.map(d => d[valueKey]).filter(v => v != null);
  const computedMax = values.length ? Math.max(...values) : 1;
  let max = yMax != null ? yMax : Math.max(computedMax * 1.1, 1);
  const min = yMin;

  // Force "nice" tick step so axis labels are clean integers / decimals
  const step = niceStep(max - min, 5);
  // Round max up to the next step boundary
  max = Math.ceil(max / step) * step;
  const range = max - min || 1;
  const tickCount = Math.round(range / step);
  const gridValues = Array.from({ length: tickCount + 1 }, (_, i) => min + i * step);

  const chartH = 180;
  const refY = refLine != null && refLine >= min && refLine <= max
    ? chartH - ((refLine - min) / range * chartH)
    : null;

  const dataStartedAt = full.find(d => d._missing) ? 'มีข้อมูลขาดบางเดือน — ดูหมายเหตุท้ายกราฟ' : null;

  return `
    <div class="chart-block" style="margin:6px 40px 14px;padding:12px 14px 10px;background:#fff;border:1px solid ${COLOR.border};border-radius:6px;page-break-inside:avoid;break-inside:avoid;">
      <div style="margin-bottom:8px;">
        <div style="font-size:11.5pt;font-weight:700;color:${COLOR.text};">${title}${year ? ` · ปี ${year}` : ''}</div>
        ${subtitle ? `<div style="font-size:9pt;color:${COLOR.muted};margin-top:2px;">${subtitle}</div>` : ''}
      </div>

      <div style="display:flex;gap:8px;">
        <div style="width:42px;height:${chartH}px;position:relative;flex-shrink:0;">
          ${gridValues.map((v, i) => {
            const top = chartH - (i / tickCount * chartH);
            return `<div style="position:absolute;right:0;top:${top - 6}px;font-size:8pt;color:${COLOR.muted};font-family:monospace;">${valueFmt(v)}</div>`;
          }).join('')}
        </div>

        <div style="flex:1;position:relative;height:${chartH}px;border-left:1px solid ${COLOR.border};border-bottom:1px solid ${COLOR.border};">
          ${gridValues.map((v, i) => {
            const top = chartH - (i / tickCount * chartH);
            return `<div style="position:absolute;left:0;right:0;top:${top}px;border-top:1px dashed ${COLOR.light};"></div>`;
          }).join('')}

          ${refY != null ? `
            <div style="position:absolute;left:0;right:0;top:${refY}px;border-top:1.5px dashed #ef4444;"></div>
            <div style="position:absolute;right:4px;top:${refY - 14}px;font-size:8pt;color:#ef4444;font-weight:700;">WHO ${valueFmt(refLine)}</div>
          ` : ''}

          <div style="position:absolute;left:0;right:0;bottom:0;top:0;display:flex;align-items:flex-end;gap:3px;padding:0 4px;">
            ${full.map((d) => {
              const v = d[valueKey];
              const hasData = v != null;
              const h = hasData ? Math.max(2, ((v - min) / range) * chartH) : 0;
              if (hasData) {
                return `
                  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
                    <div style="font-size:7.5pt;color:${COLOR.text};margin-bottom:2px;font-family:monospace;font-weight:600;">${valueFmt(v)}</div>
                    <div style="width:80%;height:${h}px;background:${color};border-radius:2px 2px 0 0;"></div>
                  </div>`;
              }
              if (d._future) {
                return `
                  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
                    <div style="font-size:6.5pt;color:#bbb;margin-bottom:2px;">ยังไม่มา</div>
                    <div style="width:80%;height:${chartH * 0.92}px;background:repeating-linear-gradient(45deg,#f5f5f5,#f5f5f5 4px,#fff 4px,#fff 8px);border:1px dashed #ddd;border-radius:2px 2px 0 0;"></div>
                  </div>`;
              }
              return `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
                  <div style="font-size:6.5pt;color:#dc2626;margin-bottom:2px;font-weight:600;">N/A</div>
                  <div style="width:80%;height:${chartH * 0.92}px;background:repeating-linear-gradient(135deg,#fee2e2,#fee2e2 4px,#fff 4px,#fff 8px);border:1px dashed #fca5a5;border-radius:2px 2px 0 0;"></div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div style="display:flex;gap:3px;padding:4px 4px 0 50px;">
        ${full.map(d => `
          <div style="flex:1;text-align:center;font-size:8pt;color:${d._future ? '#bbb' : COLOR.muted};">${MONTH_NAMES_TH[d.month_num - 1]}</div>
        `).join('')}
      </div>

      <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:flex-start;gap:14px;">
        <div style="font-size:8pt;color:${COLOR.muted};line-height:1.5;flex:1;">
          ${footnote ? `${footnote}<br/>` : ''}
          ${dataStartedAt ? `เดือนที่แสดง <span style="color:#dc2626;font-weight:600;">N/A</span> = ไม่มีภาพดาวเทียมที่ผ่านเงื่อนไขเมฆในเดือนนั้น<br/>` : ''}
          ${full.some(d => d._future) ? `เดือนที่แสดง "ยังไม่มา" = อยู่ในอนาคต (ปีปัจจุบัน)` : ''}
        </div>
        ${unit ? `<div style="font-size:8pt;color:${COLOR.muted};font-style:italic;white-space:nowrap;">หน่วย: ${unit}</div>` : ''}
      </div>
    </div>
  `;
};

// ──────────────────────────────────────────────────────
// Methodology + Conclusions (reusable section)
// ──────────────────────────────────────────────────────
const _yearRangeLabel = (year) => {
  const today = new Date();
  if (Number(year) === today.getFullYear()) {
    const m = today.getMonth() + 1;
    return `ม.ค.–${MONTH_NAMES_TH[m - 1]} ${Number(year) + 543} (ข้อมูลปัจจุบัน — ปียังไม่ครบ)`;
  }
  return `ม.ค.–ธ.ค. ${Number(year) + 543}`;
};

const methodologySection = (year) => `
  ${sectionTitle('แหล่งข้อมูลและวิธีการ (Methodology)', { color: COLOR.muted })}
  ${table(
    ['ตัวชี้วัด', 'แหล่งข้อมูล', 'ความละเอียด', 'การกรอง'],
    [
      ['NDVI', `Sentinel-2 SR Harmonized (${_yearRangeLabel(year)})`, '10 m', 'CLOUDY_PIXEL_PERCENTAGE < 80% + QA60 cloud/cirrus mask'],
      ['LST',  `Landsat 8/9 Collection 2 Level 2 (${_yearRangeLabel(year)})`, '30 m', 'CLOUD_COVER < 40% + QA_PIXEL cloud mask'],
      ['ประชากร', 'WorldPop 100m (ผ่าน Supabase cache)', '100 m', '—'],
      ['ขอบเขตจังหวัด/อำเภอ', 'GADM v4.1 (Database of Global Administrative Areas)', '—', '—'],
    ],
    { firstColWidth: 110, keepTogether: true }
  )}
  ${paragraph(
    'NDVI คำนวณจาก <b>(B8 − B4) / (B8 + B4)</b> ของภาพ median composite ทั้งปี · พิกเซลน้ำ (NDVI < −0.1) ถูก mask ก่อนคำนวณ min/mean เพื่อหลีกเลี่ยงค่าผิดปกติจากแหล่งน้ำและเงาเมฆ',
    { size: '9.5pt', muted: true }
  )}
  ${paragraph(
    'LST แปลงจาก ST_B10 ของ Landsat โดยสูตร <b>ST_B10 × 0.00341802 + 149.0 − 273.15</b> หน่วย °C · พิจารณาเป็นค่าเฉลี่ย median ของ pixel ที่ผ่าน QA mask',
    { size: '9.5pt', muted: true }
  )}
`;

const conclusionsSection = ({ ndvi, lst, deficitInfo, comparison, areaName, year }) => {
  if (!ndvi) return '';
  const lines = [];

  if (ndvi.ndvi_mean != null) {
    const interp = ndvi.ndvi_mean >= 0.5 ? 'หนาแน่นสูง'
                : ndvi.ndvi_mean >= 0.3 ? 'ปานกลาง'
                : ndvi.ndvi_mean >= 0.15 ? 'น้อย'
                : 'ต่ำมาก';
    const detail = ndvi.ndvi_mean >= 0.5
      ? 'สอดคล้องกับลักษณะพื้นที่ที่มีป่าหรือเกษตรเข้มข้น เช่น ภูเขา/พื้นที่นอกเมือง'
      : ndvi.ndvi_mean >= 0.3
      ? 'พื้นที่ส่วนใหญ่เป็นเกษตร ทุ่งหญ้า หรือเรือนยอดเปิดโปร่ง'
      : 'พื้นที่ส่วนใหญ่เป็นเมือง/พื้นที่เปิดโล่ง — ควรเพิ่มพืชพรรณในพื้นที่อาศัย';
    lines.push(
      `<b>NDVI เฉลี่ย ${fmt(ndvi.ndvi_mean, 3)}</b> จัดเป็นพืชพรรณ${interp} — ${detail}`
    );
  }

  if (ndvi.green_area_pct != null) {
    const denseTxt = ndvi.dense_area_pct != null
      ? ` ในจำนวนนี้เป็น <b>ป่าหนา (NDVI &gt; 0.5) ${fmt(ndvi.dense_area_pct, 1)}%</b>`
      : '';
    lines.push(
      `พื้นที่สีเขียว (NDVI &gt; 0.3) ครอบคลุม <b>${fmt(ndvi.green_area_pct, 1)}%</b> ของพื้นที่ทั้งหมด${denseTxt} · ` +
      `ค่าที่สูงสะท้อนภูมิประเทศที่มีป่าและเกษตรเป็นหลัก ` +
      (ndvi.dense_area_pct != null && ndvi.green_area_pct - ndvi.dense_area_pct > 30
        ? '<i>โดยส่วนต่างระหว่างสองเกณฑ์ชี้ให้เห็นสัดส่วนพื้นที่เกษตรที่มีนัยสำคัญ</i>'
        : '')
    );
  }

  if (lst?.lst_mean != null) {
    const heat = lst.lst_mean >= 38 ? 'ร้อนจัด'
                : lst.lst_mean >= 32 ? 'ร้อน'
                : lst.lst_mean >= 28 ? 'ปกติ' : 'เย็น';
    const cooling = ndvi?.ndvi_mean != null && ndvi.ndvi_mean >= 0.5
      ? ' — ค่า NDVI ที่สูงน่าจะมีบทบาทช่วยลดอุณหภูมิเทียบกับพื้นที่ที่ NDVI ต่ำ'
      : '';
    lines.push(
      `อุณหภูมิผิวพื้นเฉลี่ย <b>${fmt(lst.lst_mean, 1)}°C</b> (${heat})${cooling}`
    );
  }

  if (deficitInfo) lines.push(deficitInfo);
  if (comparison) lines.push(comparison);

  if (lines.length === 0) return '';
  // wrap heading + items ใน .no-split เพื่อกัน heading orphan ท้ายหน้าก่อน
  return `
    <div class="no-split" style="page-break-inside:avoid;break-inside:avoid;">
      ${sectionTitle('สรุปผลและข้อเสนอแนะ (Conclusions)', { color: COLOR.green })}
      <div style="margin:0 40px 12px;">
        <ol style="padding-left:24px;margin:0;color:${COLOR.text};font-size:10.5pt;line-height:1.75;">
          ${lines.map(l => `<li class="no-split" style="margin-bottom:8px;page-break-inside:avoid;break-inside:avoid;">${l}</li>`).join('')}
        </ol>
      </div>
    </div>
  `;
};

const limitationsSection = () => {
  // li style รวม break-inside:avoid เพื่อกัน limitation ข้อเดียวถูกตัดข้ามหน้า
  const li = (html) => `
    <li class="no-split" style="margin-bottom:8px;page-break-inside:avoid;break-inside:avoid;">
      ${html}
    </li>`;
  return `
    ${sectionTitle('ข้อจำกัดของการวิเคราะห์ (Limitations)', { color: COLOR.orange })}
    <div style="margin:0 40px 12px;">
      <ol style="padding-left:24px;margin:0;color:${COLOR.text};font-size:10pt;line-height:1.7;">
        ${li(`<b>มาตรฐาน WHO 9 m²/คน</b> หมายถึงพื้นที่สีเขียวที่ประชาชน <b>เข้าถึงได้</b> เช่น สวนสาธารณะหรือพื้นที่นันทนาการในเมือง — ไม่ใช่พื้นที่ NDVI &gt; 0.3 ทั้งหมดที่รวมป่าเขาและเกษตรในชนบท การประเมินตามรายงานนี้จึงมักให้ตัวเลขสูงเกินจริงสำหรับการวางแผนพื้นที่นันทนาการ`)}
        ${li(`<b>เกณฑ์ NDVI &gt; 0.3 เป็น binary classification</b> ที่ไม่แยกแยะ ป่า / เกษตร / ทุ่งหญ้า / สวนผลไม้ ซึ่งมีการจัดการและประโยชน์เชิงนิเวศต่างกัน — ควรใช้ Land Cover map (เช่น ESA WorldCover, MODIS MCD12Q1) ร่วมเพื่อแยกประเภท`)}
        ${li(`<b>การวิเคราะห์เป็นรายปีเดียว</b> และอาจเป็นปีบางส่วน (เช่น ม.ค.–พ.ค. 2569) — ค่ารายปียังไม่สมบูรณ์เมื่อยังไม่ครบทุกฤดูกาล ทำให้แนวโน้มฤดูแล้ง/ฝนสะท้อนไม่ครบ`)}
        ${li(`<b>เมฆและช่องว่างของ revisit</b> — Sentinel-2 (5 วัน) และ Landsat (8 วันรวมทั้ง 8 และ 9) อาจไม่มีภาพที่ผ่านเกณฑ์เมฆในบางเดือน โดยเฉพาะในฤดูฝน — เดือนที่แสดง N/A ในกราฟคือเดือนเหล่านี้`)}
        ${li(`<b>ค่าเฉลี่ยรายปี vs รายเดือน</b> — ค่าเฉลี่ยรายปีคำนวณจาก single median composite ของทั้งปี ส่วนค่ารายเดือนคำนวณ median ของแต่ละเดือนแยกกัน ทั้งสองค่าจึงมักไม่เท่ากันเล็กน้อย เพราะวิธี aggregate ต่างกัน`)}
        ${li(`<b>WorldPop</b> เป็น gridded population estimate ความละเอียด 100 m ที่ disaggregate มาจาก census ผ่าน covariates (สิ่งปลูกสร้าง, แสงไฟกลางคืน) — ไม่ใช่การสำรวจประชากรในตำแหน่งจริง การคำนวณ "พื้นที่ต่อคน" จึงมี uncertainty ระดับชุมชน`)}
        ${li(`<b>NDVI Min</b> หลังการ mask water (NDVI &lt; 0) ที่ยังต่ำผิดปกติบ่งชี้ว่ามี cloud-shadow บาง pixel ที่หลุดเงื่อนไข — โปรดตีความ Min ด้วยความระมัดระวัง`)}
      </ol>
    </div>
  `;
};

// ──────────────────────────────────────────────────────
// References (เอกสารอ้างอิง) — สำหรับ thesis-quality report
// wrap ทั้งก้อนใน .no-split เพื่อให้ refs ทุกอันอยู่หน้าเดียว (ดีกว่ากระจาย 5+2)
// — refs 7 รายการ ~400px เข้าหน้าเดียวได้
// ──────────────────────────────────────────────────────
const referencesSection = () => {
  const ref = (html) => `
    <li style="margin-bottom:5px;page-break-inside:avoid;break-inside:avoid;">
      ${html}
    </li>`;
  return `
    <div class="no-split" style="page-break-inside:avoid;break-inside:avoid;">
      ${sectionTitle('เอกสารอ้างอิง (References)', { color: COLOR.muted })}
      <div style="margin:0 40px 14px;">
        <ol style="padding-left:24px;margin:0;color:${COLOR.text};font-size:9.5pt;line-height:1.55;">
          ${ref(`Drusch, M., Del Bello, U., Carlier, S., et al. (2012). <i>Sentinel-2: ESA's Optical High-Resolution Mission for GMES Operational Services.</i> Remote Sensing of Environment, 120, 25–36. doi:10.1016/j.rse.2011.11.026`)}
          ${ref(`U.S. Geological Survey (2021). <i>Landsat Collection 2 Level-2 Science Products — Surface Temperature.</i> USGS Earth Resources Observation and Science Center. https://www.usgs.gov/landsat-missions/landsat-collection-2-level-2-science-products`)}
          ${ref(`Tatem, A.J. (2017). <i>WorldPop, open data for spatial demography.</i> Scientific Data, 4, 170004. doi:10.1038/sdata.2017.4`)}
          ${ref(`Global Administrative Areas (2022). <i>GADM database of Global Administrative Areas, version 4.1.</i> https://gadm.org/`)}
          ${ref(`World Health Organization Regional Office for Europe (2017). <i>Urban green spaces: a brief for action.</i> WHO Regional Office for Europe, Copenhagen.`)}
          ${ref(`Gorelick, N., Hancher, M., Dixon, M., et al. (2017). <i>Google Earth Engine: Planetary-scale geospatial analysis for everyone.</i> Remote Sensing of Environment, 202, 18–27. doi:10.1016/j.rse.2017.06.031`)}
          ${ref(`Tucker, C.J. (1979). <i>Red and photographic infrared linear combinations for monitoring vegetation.</i> Remote Sensing of Environment, 8(2), 127–150.`)}
        </ol>
      </div>
    </div>
  `;
};

// ──────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────
export const buildStatsReport = async (data) => {
  const {
    selectedProvince, selectedProvinceEN, selectedDistrict,
    provinceArea, districtArea,
    ndviStats, ndviMonthly,
    lstStats, lstMonthly,
    districtNdviStats, districtNdviMonthly,
    districtLstStats, districtLstMonthly,
  } = data;

  const year = ndviStats?.year || lstStats?.year || data.year || new Date().getFullYear();
  const districtPretty = formatEnName(selectedDistrict);
  // Cover heading: Thai for province + " — " + EN district to make script change explicit (no run-on like "MaeChaem")
  const subtitle = selectedDistrict
    ? `${selectedProvince} — ${districtPretty}`
    : selectedProvince;
  const docTitle = `Green Area Report — ${selectedProvinceEN}${selectedDistrict ? ` / ${districtPretty}` : ''}`;

  // Fetch images (mini-map + NDVI thumb + LST thumb) + comparison context + district summary + timeseries in parallel.
  // ดึง district summary เฉพาะตอนรายงานระดับจังหวัด (ไม่ได้ลึกถึงอำเภอแล้ว)
  const districtSummaryUrl = !selectedDistrict
    ? `${API_BASE}/analysis/districts/${encodeURIComponent(selectedProvinceEN)}?year=${year}`
    : null;

  // Time-series window: 4 ปีย้อนหลังจากปีรายงาน → รวมทั้งหมด 5 ปี
  const tsStart = Number(year) - 4;
  const tsEnd = Number(year);
  const tsUrl = `${API_BASE}/analysis/timeseries/${encodeURIComponent(selectedProvinceEN)}?start_year=${tsStart}&end_year=${tsEnd}${selectedDistrict ? `&district_name=${encodeURIComponent(selectedDistrict)}` : ''}`;

  // Urban subset (Phase B-3) — ESA WorldCover Built-up clip; first call อาจช้า (GEE compute)
  const urbanUrl = `${API_BASE}/analysis/urban-subset/${encodeURIComponent(selectedProvinceEN)}?year=${year}${selectedDistrict ? `&district_name=${encodeURIComponent(selectedDistrict)}` : ''}`;

  const [miniMap, ndviThumb, lstThumb, contextResp, districtSummary, timeseriesResp, urbanResp] = await Promise.all([
    fetchImageDataUrl(`${API_BASE}/maps/thailand-thumb?province=${encodeURIComponent(selectedProvinceEN)}`),
    fetchImageDataUrl(`${API_BASE}/maps/${encodeURIComponent(selectedProvinceEN)}/ndvi-thumb?year=${year}${selectedDistrict ? `&district_name=${encodeURIComponent(selectedDistrict)}` : ''}`),
    fetchImageDataUrl(`${API_BASE}/maps/${encodeURIComponent(selectedProvinceEN)}/lst-thumb?year=${year}${selectedDistrict ? `&district_name=${encodeURIComponent(selectedDistrict)}` : ''}`),
    fetch(`${API_BASE}/analysis/context/${encodeURIComponent(selectedProvinceEN)}?year=${year}`).then(r => r.ok ? r.json() : null).catch(() => null),
    districtSummaryUrl
      ? fetch(districtSummaryUrl).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null),
    fetch(tsUrl).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(urbanUrl).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  const sections = [];

  // ── Cover
  sections.push({
    label: 'Cover',
    html: cover({
      kicker: 'GREEN AREA REPORT',
      heading: subtitle,
      subheading: 'รายงานพื้นที่สีเขียว · NDVI · LST · WHO',
      accent: COLOR.green,
      year,
      miniMapDataUrl: miniMap,
    }),
  });

  // ── Overview
  let overviewHtml = sectionTitle('ภาพรวม (Overview)');
  overviewHtml += paragraph(
    'รายงานนี้สรุปข้อมูลพื้นที่สีเขียวจากดัชนี <b>NDVI</b> (Sentinel-2) และอุณหภูมิผิวพื้น <b>LST</b> (Landsat 8/9) เปรียบเทียบกับมาตรฐาน WHO (พื้นที่สีเขียว ≥ 9 m²/คน)'
  );
  const overviewRows = [
    ['จังหวัด', selectedProvince || '—'],
    ['ชื่อทางการ (EN)', selectedProvinceEN || '—'],
  ];
  if (selectedDistrict) overviewRows.push(['อำเภอ', districtPretty]);
  overviewRows.push(['ปีที่วิเคราะห์', String(year)]);
  if (provinceArea) overviewRows.push(['พื้นที่จังหวัด', `${Number(provinceArea).toLocaleString()} km²`]);
  if (districtArea) overviewRows.push(['พื้นที่อำเภอ', `${Number(districtArea).toLocaleString()} km²`]);
  overviewHtml += table(['รายการ', 'ค่า'], overviewRows, { firstColWidth: 200 });
  sections.push({ label: 'Overview', html: overviewHtml });

  // ── NDVI section (with map)
  if (ndviStats) {
    // wrap heading + figure ใน .no-split → กัน heading หลุดอยู่ท้ายหน้าโดยรูปไปอีกหน้า
    let ndviHtml = '';
    const ndviTitle = sectionTitle(`NDVI · ดัชนีพืชพรรณ · ปี ${year}`);
    const ndviFig = ndviThumb
      ? imageBox(ndviThumb,
          `แผนที่ NDVI · ${selectedDistrict ? `อำเภอ ${districtPretty}, ${selectedProvince}` : `จังหวัด${selectedProvince}`} · Sentinel-2 median composite ปี ${year}<br/>` +
          `<span style="font-family:monospace;">Palette: NDVI -0.2 (แดง = ไม่มีพืช) → 0.8 (เขียวเข้ม = ป่าหนา)</span>`,
          { heightHint: '320px' })
      : '';
    ndviHtml += `<div class="no-split" style="page-break-inside:avoid;break-inside:avoid;">${ndviTitle}${ndviFig}</div>`;

    const ndviRows = [
      ['NDVI Mean', fmt(ndviStats.ndvi_mean, 3),
        ndviStats.ndvi_mean >= 0.5 ? 'พืชพรรณหนาแน่น (ป่า/เกษตรเข้มข้น)'
          : ndviStats.ndvi_mean >= 0.3 ? 'พืชพรรณปานกลาง (เกษตร/ทุ่งหญ้า)'
          : 'พืชพรรณน้อย (เมือง/พื้นที่เปิดโล่ง)'],
      ['NDVI Min (หลัง mask น้ำ)', fmt(ndviStats.ndvi_min, 3),
        ndviStats.ndvi_min >= 0.05 ? 'พืชพรรณบาง'
          : ndviStats.ndvi_min >= 0 ? 'พื้นดินเปิดโล่ง/อาคาร'
          : 'อาจมีน้ำ/เมฆเงาที่ mask ไม่ครบ'],
      ['NDVI Max', fmt(ndviStats.ndvi_max, 3), 'จุดเรือนยอดป่าหนาแน่นที่สุด'],
      ['พื้นที่สีเขียว (NDVI > 0.3)', `${fmt(ndviStats.green_area_pct, 1)}% (${fmtInt(ndviStats.green_area_km2)} km²)`,
        'รวมป่า + เกษตร + ทุ่งหญ้า'],
    ];
    // เพิ่มแถว dense forest เฉพาะเมื่อมีข้อมูล (หลัง re-compute) — ไม่งั้นซ่อนเพื่อไม่ให้มี TODO ใน PDF
    if (ndviStats.dense_area_pct != null) {
      ndviRows.push([
        'พื้นที่ป่าหนา (NDVI > 0.5)',
        `${fmt(ndviStats.dense_area_pct, 1)}% (${fmtInt(ndviStats.dense_area_km2)} km²)`,
        'ป่าเรือนยอดปิด',
      ]);
    }
    ndviRows.push(['ประชากร', fmtInt(ndviStats.population), 'จาก WorldPop 100m']);
    ndviRows.push(['พื้นที่สีเขียว/คน', `${fmt(ndviStats.green_area_m2_per_person, 2)} m²`,
      'เทียบเกณฑ์ WHO ≥ 9 (ดูข้อจำกัด)']);
    ndviRows.push(['สถานะตามเกณฑ์ตัวเลข', ndviStats.who_status || '—', '']);

    ndviHtml += table(
      ['ตัวชี้วัด', 'ค่า', 'การตีความ'],
      ndviRows,
      { firstColWidth: 180 }
    );

    // Note about WHO standard caveat — central interpretive issue
    ndviHtml += calloutBox(
      `<b>ข้อควรระวัง:</b> เกณฑ์ WHO 9 m²/คน อ้างอิงถึง <b>"พื้นที่สีเขียวที่ประชาชนเข้าถึงได้"</b> (สวนสาธารณะ สวนเมือง) ไม่ใช่พื้นที่ที่ NDVI &gt; 0.3 ทั้งหมด · รายงานนี้ใช้ NDVI &gt; 0.3 ซึ่งรวมป่าและพื้นที่เกษตรในชนบท จึงอาจประเมินสูงเกินจริงสำหรับพื้นที่ที่ประชาชนใช้พักผ่อนได้`,
      COLOR.orange
    );

    if (ndviStats.ndvi_min != null && ndviStats.ndvi_min < -0.05) {
      ndviHtml += note(
        `⚠ NDVI Min ที่ต่ำผิดปกติบ่งชี้ว่ายังมี pixel น้ำ/cloud-shadow หลงเหลือ — ลอง clear cache แล้วโหลดใหม่`
      );
    }

    sections.push({ label: 'NDVI', html: ndviHtml });

    // NDVI monthly chart
    if (ndviMonthly?.length) {
      sections.push({
        label: 'NDVI · Monthly',
        html: monthlyBarChart({
          title: 'NDVI รายเดือน',
          subtitle: 'ค่า median NDVI ของ pixel ทั้งหมดในแต่ละเดือน',
          year, unit: 'NDVI (0–1)',
          data: ndviMonthly, valueKey: 'ndvi',
          color: COLOR.green, yMax: 1, yMin: 0,
          valueFmt: (v) => v != null ? v.toFixed(2) : '',
        }),
      });
    }
  }

  // ── LST section (with map)
  if (lstStats) {
    // wrap heading + figure ใน .no-split (เหตุผลเดียวกับ NDVI)
    let lstHtml = '';
    const lstTitle = sectionTitle(`LST · อุณหภูมิผิวพื้น · ปี ${year}`, { color: COLOR.red });
    const lstFig = lstThumb
      ? imageBox(lstThumb,
          `แผนที่ LST · ${selectedDistrict ? `อำเภอ ${districtPretty}, ${selectedProvince}` : `จังหวัด${selectedProvince}`} · Landsat 8/9 median ปี ${year}<br/>` +
          `<span style="font-family:monospace;">Palette: 20°C (น้ำเงิน) → 45°C (แดงเข้ม)</span>`,
          { heightHint: '320px' })
      : '';
    lstHtml += `<div class="no-split" style="page-break-inside:avoid;break-inside:avoid;">${lstTitle}${lstFig}</div>`;

    lstHtml += table(
      ['ตัวชี้วัด', 'ค่า'],
      [
        ['LST Mean', `${fmt(lstStats.lst_mean, 1)} °C`],
        ['LST Min', `${fmt(lstStats.lst_min, 1)} °C`],
        ['LST Max', `${fmt(lstStats.lst_max, 1)} °C (pixel ร้อนสุด)`],
      ],
      { firstColWidth: 200 }
    );
    lstHtml += note('LST = Land Surface Temperature จากดาวเทียม สูงกว่าอุณหภูมิอากาศ 5–20 °C ขึ้นกับชนิดผิว');

    sections.push({ label: 'LST', html: lstHtml });

    if (lstMonthly?.length) {
      sections.push({
        label: 'LST · Monthly',
        html: monthlyBarChart({
          title: 'LST รายเดือน',
          subtitle: 'ค่า median อุณหภูมิผิวพื้นในแต่ละเดือน',
          year, unit: '°C',
          data: lstMonthly, valueKey: 'lst',
          color: COLOR.orange,
          valueFmt: (v) => v != null ? v.toFixed(1) : '',
        }),
      });
    }
  }

  // ── Urban Subset Analysis (Phase B-3) ────────────────────────────────────
  // ตอบโจทย์ "WHO 9 m²/คน เปรียบกับอะไรกันแน่?" โดย clip ด้วย ESA WorldCover Built-up
  if (urbanResp && urbanResp.urban_area_km2 != null && urbanResp.urban_area_km2 > 0) {
    const u = urbanResp;
    // wrap ทั้ง section ใน no-split เพื่อกัน heading หลุดท้ายหน้าก่อน
    // (section นี้ ~430px เข้าหน้าเดียวได้)
    let uHtml = '<div class="no-split" style="page-break-inside:avoid;break-inside:avoid;">';
    uHtml += sectionTitle(
      `พื้นที่สีเขียวในเขตเมือง (Urban Subset · WHO-comparable)`,
      { color: COLOR.greenDeep }
    );
    uHtml += note(
      `วิเคราะห์เฉพาะภายในเขต <b>Built-up</b> (ESA WorldCover v200, class 50, ปี ${u.worldcover_year}) ` +
      `— เป็น proxy ของ "เขตชุมชน/เทศบาล" ที่ตรงกับเจตนาเดิมของเกณฑ์ WHO 9 m²/คน ` +
      `("accessible green space" ในเมือง) มากกว่าค่ารวมระดับจังหวัดที่นับรวมป่าและเกษตรนอกเมือง`
    );

    const urbanRows = [
      ['พื้นที่ Built-up', `${fmt(u.urban_area_km2, 2)} km²`,
       `${fmt(u.urban_share_pct, 2)}% ของจังหวัด`],
      ['NDVI Mean (ในเขต Built-up)',
       u.ndvi_mean_urban != null ? fmt(u.ndvi_mean_urban, 3) : '—',
       u.ndvi_mean_urban != null && u.ndvi_mean_urban < 0.3
         ? 'ต่ำ — สอดคล้องกับเขตชุมชนทั่วไป'
         : 'พืชพรรณในเขตเมืองดี'],
      ['พื้นที่สีเขียวในเขต Built-up',
       `${fmt(u.green_in_urban_km2, 2)} km²`,
       `${fmt(u.green_share_in_urban_pct, 1)}% ของ Built-up`],
      ['ประชากรในเขต Built-up', fmtInt(u.population_urban),
       'จาก WorldPop ' + u.worldpop_year + ' (mask ด้วย Built-up)'],
      ['พื้นที่สีเขียว/คน (Urban)',
       u.m2_per_person_urban != null ? `${fmt(u.m2_per_person_urban, 2)} m²` : '—',
       u.who_urban_pass ? '✅ ผ่าน WHO 9 m²/คน' : '⚠️ ต่ำกว่า WHO 9 m²/คน'],
    ];
    uHtml += table(
      ['ตัวชี้วัด', 'ค่า', 'การตีความ'],
      urbanRows,
      { firstColWidth: 200, keepTogether: true }
    );

    // Comparison callout — ระดับจังหวัด vs Urban
    if (ndviStats?.green_area_m2_per_person != null && u.m2_per_person_urban != null) {
      const provVal = ndviStats.green_area_m2_per_person;
      const urbanVal = u.m2_per_person_urban;
      const ratio = provVal > 0 ? (urbanVal / provVal) : 0;
      const interpretation = u.who_urban_pass
        ? `<b>ผ่าน WHO 9 m²/คน ในเขตเมืองจริง</b> — มีพื้นที่สวนสาธารณะ/ต้นไม้ริมถนนในชุมชนเพียงพอตามมาตรฐาน`
        : `<b>ต่ำกว่า WHO 9 m²/คน ในเขตเมืองจริง</b> — ขาดแคลน <b>${(9 - urbanVal).toFixed(1)} m²/คน</b> · ` +
          `เพื่อผ่านเกณฑ์ ต้องเพิ่ม ~<b>${((9 - urbanVal) * u.population_urban / 1_000_000).toFixed(2)} km²</b> ของพื้นที่สีเขียวในเขตเมือง`;
      uHtml += calloutBox(
        `<b>เปรียบเทียบ:</b><br/>` +
        `• ระดับจังหวัด (รวมป่า+เกษตร): <b>${fmt(provVal, 2)} m²/คน</b><br/>` +
        `• ในเขต Built-up เท่านั้น: <b>${fmt(urbanVal, 2)} m²/คน</b> (${(ratio * 100).toFixed(1)}% ของค่ารวม)<br/>` +
        `<br/>${interpretation}`,
        u.who_urban_pass ? COLOR.green : COLOR.orange
      );
    }

    uHtml += note(
      `* ESA WorldCover v200 อัปเดตล่าสุดปี 2021 — ใช้เป็น proxy ของ urban extent ในทุกปีที่วิเคราะห์ ` +
      `(สิ่งปลูกสร้างเปลี่ยนแปลงน้อยใน timescale 2-5 ปี) · WorldPop ใช้ปี ${u.worldpop_year}`
    );
    uHtml += '</div>'; // close no-split wrapper

    sections.push({ label: 'Urban', html: uHtml });
  }

  // ── District section
  if (selectedDistrict && (districtNdviStats || districtLstStats)) {
    let dHtml = sectionTitle(`อำเภอ ${districtPretty} · รายละเอียด`, { color: COLOR.primary });
    if (districtNdviStats) {
      dHtml += table(
        ['NDVI · อำเภอ', 'ค่า'],
        [
          ['NDVI Mean', fmt(districtNdviStats.ndvi_mean, 3)],
          ['NDVI Min (mask น้ำ)', fmt(districtNdviStats.ndvi_min, 3)],
          ['NDVI Max', fmt(districtNdviStats.ndvi_max, 3)],
          ['พื้นที่สีเขียว (>0.3)', `${fmt(districtNdviStats.green_area_pct, 1)}%`],
          ['พื้นที่สีเขียว (km²)', fmtInt(districtNdviStats.green_area_km2)],
        ],
        { firstColWidth: 200 }
      );
    }
    if (districtLstStats) {
      dHtml += table(
        ['LST · อำเภอ', 'ค่า'],
        [
          ['LST Mean', `${fmt(districtLstStats.lst_mean, 1)} °C`],
          ['LST Min', `${fmt(districtLstStats.lst_min, 1)} °C`],
          ['LST Max', `${fmt(districtLstStats.lst_max, 1)} °C`],
        ],
        { firstColWidth: 200 }
      );
    }

    if (districtNdviMonthly?.length) {
      dHtml += monthlyBarChart({
        title: `NDVI รายเดือน · อำเภอ ${districtPretty}`,
        year, unit: 'NDVI',
        data: districtNdviMonthly, valueKey: 'ndvi',
        color: COLOR.green, yMax: 1, yMin: 0,
        valueFmt: (v) => v != null ? v.toFixed(2) : '',
      });
    }
    if (districtLstMonthly?.length) {
      dHtml += monthlyBarChart({
        title: `LST รายเดือน · อำเภอ ${districtPretty}`,
        year, unit: '°C',
        data: districtLstMonthly, valueKey: 'lst',
        color: COLOR.orange,
        valueFmt: (v) => v != null ? v.toFixed(1) : '',
      });
    }
    sections.push({ label: 'District', html: dHtml });
  }

  // ── Comparison context
  if (contextResp?.national && ndviStats?.ndvi_mean != null) {
    const nat = contextResp.national;
    const target = contextResp.target;
    const N = contextResp.provinces_in_cache;

    let cHtml = sectionTitle(
      `เทียบกับค่าเฉลี่ย ${N} จังหวัดที่มีข้อมูล · ระดับจังหวัด`,
      { color: COLOR.primary }
    );
    cHtml += note(
      `ข้อมูลในส่วนนี้เป็น <b>ระดับจังหวัด</b> (${selectedProvince}) ไม่ใช่ระดับอำเภอ — ` +
      `คำนวณจาก ${N} จังหวัดเท่านั้น <b>ไม่ใช่ค่าเฉลี่ยจริงทั้งประเทศ 77 จังหวัด</b>`
    );

    cHtml += table(
      ['ตัวชี้วัด', `${selectedProvince}`, `ค่าเฉลี่ย ${N} จังหวัด`, 'ส่วนต่าง'],
      [
        ['NDVI Mean',
          fmt(ndviStats.ndvi_mean, 3),
          fmt(nat.ndvi_mean_avg, 3),
          arrow(ndviStats.ndvi_mean, nat.ndvi_mean_avg, v => v.toFixed(3), 0.005)],
        ['พื้นที่สีเขียว %',
          `${fmt(ndviStats.green_area_pct, 1)}%`,
          nat.green_area_pct_avg != null ? `${fmt(nat.green_area_pct_avg, 1)}%` : '—',
          arrow(ndviStats.green_area_pct, nat.green_area_pct_avg, v => `${v.toFixed(1)}%`, 0.05)],
        ['Green m²/คน',
          fmt(ndviStats.green_area_m2_per_person, 2),
          fmt(nat.green_area_m2_per_person_avg, 2),
          arrow(ndviStats.green_area_m2_per_person, nat.green_area_m2_per_person_avg,
                v => v.toFixed(2), 0.005)],
      ],
      { firstColWidth: 160, keepTogether: true }
    );

    // ── Ranked Top — แสดงอันดับจริงของ N จังหวัดที่มีข้อมูล (ตอบโจทย์ "ตรวจอันดับเอง")
    if (contextResp.ranked_top?.length > 0) {
      const targetEN = selectedProvinceEN;
      cHtml += sectionTitle('ลำดับ NDVI ใน N จังหวัดที่มีข้อมูล (อันดับสูงสุด 10)', { color: COLOR.primary });
      cHtml += table(
        ['อันดับ', 'จังหวัด', 'NDVI Mean', 'Green Area %'],
        contextResp.ranked_top.map(r => {
          const isTarget = r.province === targetEN;
          const provLabel = (PROVINCE_TH[r.province] || r.province) + (isTarget ? ' ◀' : '');
          return [
            String(r.rank),
            provLabel,
            fmt(r.ndvi_mean, 3),
            r.green_area_pct != null ? `${fmt(r.green_area_pct, 1)}%` : '—',
          ];
        }),
        { keepTogether: true }
      );
      cHtml += note('◀ = จังหวัดที่กำลังวิเคราะห์ในรายงานนี้');
    }
    if (target?.ndvi_rank) {
      cHtml += calloutBox(
        `อันดับ NDVI ระดับจังหวัด: <b>#${target.ndvi_rank} จาก ${target.ndvi_total_ranked} จังหวัด</b> ที่มี cached ปี ${year} · อันดับนี้อาจเปลี่ยนเมื่อมีข้อมูลครบ 77 จังหวัด`,
        COLOR.primary
      );
    }
    if (selectedDistrict) {
      cHtml += note(
        `⚠ การเทียบนี้ใช้ตัวเลข <b>ระดับจังหวัด</b>เพื่อให้มีบริบท ส่วนข้อมูลรายอำเภอ (${districtPretty}) ดูใน section "อำเภอ" ด้านบน`
      );
    }

    sections.push({ label: 'Comparison', html: cHtml });
  }

  // ── District summary table (Phase B-1) — เฉพาะรายงานระดับจังหวัด
  if (!selectedDistrict && districtSummary?.data?.length > 0) {
    let dsHtml = sectionTitle(
      `รายละเอียดรายอำเภอ · ${selectedProvince}`,
      { color: COLOR.primary }
    );
    const cached = districtSummary.districts_in_cache;
    const total = districtSummary.districts_total;
    dsHtml += note(
      `แสดง ${cached} อำเภอจากทั้งหมด ${total} อำเภอที่มีข้อมูล cached ปี ${year} · ` +
      `เรียงตาม NDVI Mean จากมากไปน้อย — เปิดเข้าแต่ละอำเภอใน UI เพื่อ trigger compute สำหรับอำเภอที่ยังไม่มี cache`
    );

    const rows = districtSummary.data.map((d, i) => [
      String(i + 1),
      formatEnName(d.district),
      fmt(d.ndvi_mean, 3),
      d.green_area_pct != null ? `${fmt(d.green_area_pct, 1)}%` : '—',
      d.green_area_km2 != null ? fmtInt(d.green_area_km2) : '—',
      d.lst_mean != null ? `${fmt(d.lst_mean, 1)}°C` : '—',
    ]);
    dsHtml += table(
      ['#', 'อำเภอ', 'NDVI Mean', 'Green %', 'Green km²', 'LST'],
      rows,
      { firstColWidth: 36 }
    );

    // เพิ่ม insight: top/bottom 3 + spread
    const ranked = districtSummary.data.filter(d => d.ndvi_mean != null);
    if (ranked.length >= 3) {
      const top3 = ranked.slice(0, 3).map(d => formatEnName(d.district)).join(', ');
      const bot3 = ranked.slice(-3).reverse().map(d => formatEnName(d.district)).join(', ');
      const spread = ranked[0].ndvi_mean - ranked[ranked.length - 1].ndvi_mean;
      dsHtml += calloutBox(
        `🌳 NDVI สูงสุด 3 อำเภอ: <b>${top3}</b><br/>` +
        `🏙️ NDVI ต่ำสุด 3 อำเภอ: <b>${bot3}</b><br/>` +
        `ส่วนต่างสูงสุด-ต่ำสุด: <b>${spread.toFixed(3)}</b> — ${spread >= 0.2 ? 'ความหลากหลายสูงในจังหวัด ควรวิเคราะห์เป็นรายอำเภอเพื่อกำหนดมาตรการเฉพาะพื้นที่' : 'อำเภอใกล้เคียงกัน อาจใช้นโยบายระดับจังหวัดร่วมได้'}`,
        COLOR.primary
      );
    }

    sections.push({ label: 'Districts', html: dsHtml });
  }

  // ── Time-series (Phase B-2: multi-year trend) ─────────────────────────────
  if (timeseriesResp?.data?.length > 0) {
    const ts = timeseriesResp;
    let tsHtml = sectionTitle(
      `แนวโน้มย้อนหลัง ${ts.start_year}–${ts.end_year}`,
      { color: COLOR.primary }
    );
    tsHtml += note(
      `แสดง <b>${ts.years_with_data} ปี</b> จาก ${ts.years_in_range} ปีในช่วงที่ระบุ — เฉพาะปีที่มี cache · ` +
      `ปีที่ขาดหาย = ยังไม่ได้คำนวณในระบบ (ต้องเปิดดูในแอปก่อนเพื่อ trigger compute)`
    );

    // Delta callout (จุดแรก → จุดสุดท้าย)
    const sm = ts.summary || {};
    const deltaParts = [];
    if (sm.ndvi_delta != null) {
      const arrowSym = Math.abs(sm.ndvi_delta) < 0.005 ? '—'
                     : sm.ndvi_delta > 0 ? '↑' : '↓';
      const cName = sm.ndvi_delta > 0 ? 'เพิ่มขึ้น' : sm.ndvi_delta < 0 ? 'ลดลง' : 'ทรงตัว';
      deltaParts.push(`<b>NDVI ${sm.ndvi_first_year} → ${sm.ndvi_last_year}:</b> ${arrowSym} ${Math.abs(sm.ndvi_delta).toFixed(3)} (${cName})`);
    }
    if (sm.lst_delta != null) {
      const arrowSym = Math.abs(sm.lst_delta) < 0.05 ? '—'
                     : sm.lst_delta > 0 ? '↑' : '↓';
      const cName = sm.lst_delta > 0 ? 'ร้อนขึ้น' : sm.lst_delta < 0 ? 'เย็นลง' : 'ทรงตัว';
      deltaParts.push(`<b>LST ${sm.lst_first_year} → ${sm.lst_last_year}:</b> ${arrowSym} ${Math.abs(sm.lst_delta).toFixed(2)}°C (${cName})`);
    }
    if (deltaParts.length > 0) {
      tsHtml += calloutBox(deltaParts.join('<br/>'), COLOR.primary);
    }

    // NDVI trend chart
    if (ts.data.some(d => d.ndvi_mean != null)) {
      tsHtml += yearlyLineChart({
        title: 'NDVI Mean — แนวโน้มรายปี',
        subtitle: 'ค่าเฉลี่ย NDVI ของ pixel ทั้งหมด (อ้างอิง median composite ทั้งปี)',
        data: ts.data, valueKey: 'ndvi_mean',
        valueLabel: 'NDVI (0–1)',
        color: COLOR.green,
        valueFmt: (v) => v != null ? v.toFixed(3) : '',
      });
    }

    // Green area % trend
    if (ts.data.some(d => d.green_area_pct != null)) {
      tsHtml += yearlyLineChart({
        title: 'พื้นที่สีเขียว % — แนวโน้มรายปี',
        subtitle: 'สัดส่วนพื้นที่ NDVI > 0.3 ต่อพื้นที่ทั้งหมด',
        data: ts.data, valueKey: 'green_area_pct',
        valueLabel: '%',
        color: COLOR.greenDeep,
        valueFmt: (v) => v != null ? `${v.toFixed(1)}%` : '',
      });
    }

    // LST trend chart
    if (ts.data.some(d => d.lst_mean != null)) {
      tsHtml += yearlyLineChart({
        title: 'LST Mean — แนวโน้มรายปี',
        subtitle: 'ค่าเฉลี่ย Land Surface Temperature (median composite ทั้งปี)',
        data: ts.data, valueKey: 'lst_mean',
        valueLabel: '°C',
        color: COLOR.orange,
        valueFmt: (v) => v != null ? `${v.toFixed(1)}°` : '',
      });
    }

    // Note about data window
    tsHtml += note(
      `* ใช้ปีปัจจุบัน (${ts.end_year}) เป็นข้อมูลปีบางส่วน — ค่าอาจยังไม่สมบูรณ์เมื่อยังไม่ครบทุกฤดูกาล`
    );

    sections.push({ label: 'Time-series', html: tsHtml });
  }

  // ── Methodology
  sections.push({ label: 'Methodology', html: methodologySection(year) });

  // ── Conclusions (with expanded context per limitations note about WHO standard)
  let comparisonText = '';
  if (contextResp?.target?.ndvi_rank) {
    const N = contextResp.provinces_in_cache;
    comparisonText =
      `จากการเทียบกับ ${N} จังหวัดที่มีข้อมูล cached ปัจจุบัน จังหวัดนี้อยู่ <b>อันดับ ${contextResp.target.ndvi_rank} จาก ${contextResp.target.ndvi_total_ranked}</b> ` +
      `— ดูรายชื่อจริงในตาราง "ลำดับ NDVI ใน N จังหวัดที่มีข้อมูล" ของส่วน Comparison · อันดับยังเปลี่ยนได้เมื่อมีข้อมูลครบ 77 จังหวัด`;
  }
  let deficitText = '';
  // ถ้ามี urban subset (Phase B-3) → ใช้เป็น primary metric เพราะตรงกับเจตนา WHO
  if (urbanResp?.m2_per_person_urban != null && urbanResp.population_urban > 0) {
    const curU = urbanResp.m2_per_person_urban;
    const deficitU = Math.max(0, 9 - curU);
    const provVal = ndviStats?.green_area_m2_per_person;
    const provNote = provVal != null
      ? ` <i>(ค่ารวมระดับจังหวัด ${provVal.toFixed(0)} m²/คน นับรวมป่า+เกษตรนอกเมืองด้วย จึงสูงเกินจริงสำหรับเปรียบ WHO)</i>`
      : '';
    if (deficitU > 0) {
      const deficitKm2 = (deficitU * urbanResp.population_urban / 1_000_000).toFixed(2);
      deficitText =
        `<b>เกณฑ์ WHO 9 m²/คน (Urban-comparable):</b> ในเขต Built-up พบ <b>${curU.toFixed(2)} m²/คน</b> ` +
        `— ต่ำกว่าเกณฑ์อยู่ <b>${deficitU.toFixed(1)} m²/คน</b> · ` +
        `ต้องเพิ่ม ~<b>${deficitKm2} km²</b> ของพื้นที่สีเขียวในเขตเมือง${provNote}`;
    } else {
      deficitText =
        `<b>เกณฑ์ WHO 9 m²/คน (Urban-comparable):</b> ในเขต Built-up พบ <b>${curU.toFixed(2)} m²/คน</b> ` +
        `✅ ผ่านเกณฑ์เกินมา <b>${(curU - 9).toFixed(1)} m²/คน</b>${provNote}`;
    }
  } else if (ndviStats?.green_area_m2_per_person != null && ndviStats.population > 0) {
    // Fallback: ไม่มี urban subset — ใช้ค่ารวมระดับจังหวัดพร้อม caveat
    const cur = ndviStats.green_area_m2_per_person;
    const deficit = Math.max(0, 9 - cur);
    if (deficit > 0) {
      const deficitKm2 = (deficit * ndviStats.population / 1_000_000).toFixed(1);
      deficitText =
        `พื้นที่สีเขียวต่อคน <b>${cur.toFixed(1)} m²</b> ต่ำกว่าเกณฑ์ตัวเลข WHO อยู่ <b>${deficit.toFixed(1)} m²/คน</b> ` +
        `ต้องเพิ่มอีก ~<b>${deficitKm2} km²</b> เพื่อผ่านเกณฑ์ <i>(หมายเหตุ: เกณฑ์ WHO หมายถึง accessible green ในเมือง — ดูข้อจำกัดด้านล่าง)</i>`;
    } else {
      deficitText =
        `ผ่านเกณฑ์ตัวเลข WHO เกินมา <b>${(cur - 9).toFixed(1)} m²/คน</b> ` +
        `แต่ตัวเลขนี้รวมป่าและพื้นที่เกษตรนอกเมืองด้วย — ส่วนพื้นที่ accessible จริงในเขตชุมชน อาจต่ำกว่ามาก`;
    }
  }
  sections.push({
    label: 'Conclusions',
    html: conclusionsSection({
      ndvi: ndviStats,
      lst: lstStats,
      deficitInfo: deficitText,
      comparison: comparisonText,
      areaName: subtitle,
      year,
    }),
  });

  // ── Limitations
  sections.push({ label: 'Limitations', html: limitationsSection() });

  // ── References (เอกสารอ้างอิงสำหรับ thesis-quality report)
  sections.push({ label: 'References', html: referencesSection() });

  await renderSegmentsToPdf(
    sections,
    `stats_report_${(selectedDistrict || selectedProvinceEN || 'province').replace(/\s+/g, '_')}_${ts()}.pdf`,
    { docTitle }
  );
};

export const buildTrendReport = async (data) => {
  const { selectedProvince, selectedProvinceEN, trendData, trendMetric } = data;
  const docTitle = `Trend Report — ${selectedProvinceEN}`;

  const sections = [];
  sections.push({
    label: 'Cover',
    html: cover({
      kicker: 'YEARLY TREND',
      heading: selectedProvince,
      subheading: `แนวโน้ม ${trendMetric === 'ndvi_mean' ? 'NDVI' : 'พื้นที่สีเขียว'} รายปี`,
    }),
  });

  let h = sectionTitle('ข้อมูลรายปี');
  h += table(
    ['ปี', 'NDVI Mean', 'พื้นที่สีเขียว'],
    trendData.map(d => [
      String(d.year), fmt(d.ndvi_mean, 3),
      d.green_area_pct != null ? `${fmt(d.green_area_pct, 2)}%` : '—',
    ])
  );
  if (trendData.length >= 2) {
    const first = trendData[0], last = trendData[trendData.length - 1];
    if (first[trendMetric] != null && last[trendMetric] != null) {
      const diff = last[trendMetric] - first[trendMetric];
      const sign = diff >= 0 ? '↑ เพิ่มขึ้น' : '↓ ลดลง';
      const color = diff >= 0 ? COLOR.green : COLOR.red;
      h += calloutBox(
        `<b>${sign} ${Math.abs(diff).toFixed(trendMetric === 'ndvi_mean' ? 3 : 2)}</b> จากปี ${first.year} → ${last.year}`,
        color
      );
    }
  }
  sections.push({ label: 'Trend Data', html: h });

  await renderSegmentsToPdf(sections, `trend_report_${selectedProvinceEN || 'province'}_${ts()}.pdf`, { docTitle });
};

export const buildCompareReport = async (data) => {
  const { compareData, compareYear, compareMetric } = data;
  const docTitle = `Province Comparison — ${compareYear}`;

  const sections = [];
  sections.push({
    label: 'Cover',
    html: cover({
      kicker: 'PROVINCE COMPARISON',
      heading: `เปรียบเทียบ ${compareData.length} จังหวัด`,
      subheading: `ปี ${compareYear} · ${compareMetric === 'ndvi_mean' ? 'NDVI' : 'พื้นที่สีเขียว'}`,
    }),
  });

  let h = sectionTitle('ตารางเปรียบเทียบ');
  const sorted = [...compareData].sort(
    (a, b) => (b[compareMetric] || 0) - (a[compareMetric] || 0)
  );
  h += table(
    ['อันดับ', 'จังหวัด', 'NDVI Mean', 'พื้นที่สีเขียว %', 'Green Area km²'],
    sorted.map((d, i) => [
      String(i + 1),
      PROVINCE_TH[d.province] || d.province,
      fmt(d.ndvi_mean, 3),
      d.green_area_pct != null ? `${fmt(d.green_area_pct, 2)}%` : '—',
      d.green_area_km2 != null ? fmtInt(d.green_area_km2) : '—',
    ])
  );
  sections.push({ label: 'Comparison', html: h });

  await renderSegmentsToPdf(sections, `compare_report_${compareYear}_${ts()}.pdf`, { docTitle });
};

export const buildRankingReport = async (data) => {
  const { rankingData, rankingYear, rankingStats } = data;
  const docTitle = `Province Ranking — ${rankingYear}`;

  const miniMap = await fetchImageDataUrl(`${API_BASE}/maps/thailand-thumb`);

  const sections = [];
  sections.push({
    label: 'Cover',
    html: cover({
      kicker: 'PROVINCE RANKING',
      heading: `อันดับพื้นที่สีเขียว ปี ${rankingYear}`,
      subheading: 'จัดอันดับจาก green area m²/คน เทียบมาตรฐาน WHO',
      accent: COLOR.green,
      miniMapDataUrl: miniMap,
      year: rankingYear,
    }),
  });

  if (rankingStats) {
    const passPct = rankingStats.total > 0
      ? (rankingStats.whoPass / rankingStats.total * 100).toFixed(1) : '0';
    let h = sectionTitle('สรุปภาพรวม');
    h += table(
      ['รายการ', 'จำนวน', 'สัดส่วน'],
      [
        ['จังหวัดทั้งหมดในระบบ', String(rankingStats.total), '100%'],
        ['ผ่านมาตรฐาน WHO', String(rankingStats.whoPass), `${passPct}%`],
        ['ต่ำกว่ามาตรฐาน WHO', String(rankingStats.whoFail), `${(100 - parseFloat(passPct)).toFixed(1)}%`],
      ],
      { firstColWidth: 240 }
    );
    sections.push({ label: 'Summary', html: h });
  }

  if (rankingData?.length > 0) {
    sections.push({
      label: 'จังหวัดวิกฤต',
      html: sectionTitle('จังหวัดวิกฤต — ต้องการพื้นที่สีเขียวมากที่สุด', { color: COLOR.red }) +
        table(
          ['อันดับ', 'จังหวัด', 'm²/คน', 'NDVI Mean', 'Green Area %'],
          rankingData.slice(0, 10).map(r => [
            String(r.rank),
            PROVINCE_TH[r.province] || r.province,
            fmt(r.green_area_m2_per_person, 2),
            fmt(r.ndvi_mean, 3),
            r.green_area_pct != null ? `${fmt(r.green_area_pct, 2)}%` : '—',
          ])
        ),
    });

    sections.push({
      label: 'จังหวัดดีที่สุด',
      html: sectionTitle('จังหวัดพื้นที่สีเขียวดีที่สุด', { color: COLOR.green }) +
        table(
          ['อันดับ', 'จังหวัด', 'm²/คน', 'NDVI Mean', 'Green Area %'],
          [...rankingData].reverse().slice(0, 10).map(r => [
            String(r.rank),
            PROVINCE_TH[r.province] || r.province,
            fmt(r.green_area_m2_per_person, 2),
            fmt(r.ndvi_mean, 3),
            r.green_area_pct != null ? `${fmt(r.green_area_pct, 2)}%` : '—',
          ])
        ),
    });

    sections.push({
      label: 'ทั้งหมด',
      html: sectionTitle('ข้อมูลทั้งหมด') +
        table(
          ['#', 'จังหวัด', 'm²/คน', 'NDVI'],
          rankingData.map(r => [
            String(r.rank),
            PROVINCE_TH[r.province] || r.province,
            fmt(r.green_area_m2_per_person, 2),
            fmt(r.ndvi_mean, 3),
          ])
        ),
    });
  }

  sections.push({ label: 'Methodology', html: methodologySection(rankingYear) });

  await renderSegmentsToPdf(sections, `ranking_report_${rankingYear}_${ts()}.pdf`, { docTitle });
};

export const buildRecommendReport = async (data) => {
  const { recommendData, selectedProvince, selectedProvinceEN, selectedDistrict } = data;
  if (!recommendData) return;

  const districtPretty = formatEnName(selectedDistrict);
  const docTitle = `AI Recommendation — ${selectedProvinceEN}${selectedDistrict ? ` / ${districtPretty}` : ''}`;
  const sections = [];

  sections.push({
    label: 'Cover',
    html: cover({
      kicker: 'AI RECOMMENDATION',
      heading: 'แผนปลูกต้นไม้เชิงพื้นที่',
      subheading: `${selectedProvince}${selectedDistrict ? ' — ' + districtPretty : ''}`,
      accent: COLOR.green,
    }),
  });

  let h = sectionTitle('วิธีการวิเคราะห์');
  h += paragraph(
    'ระบบวิเคราะห์จุดที่เหมาะสมในการปลูกต้นไม้โดยถ่วงน้ำหนัก 3 ปัจจัย: ดัชนีพืชพรรณ <b>NDVI</b> (พื้นที่ที่ขาดต้นไม้), อุณหภูมิผิวพื้น <b>LST</b> (พื้นที่ร้อน), และความหนาแน่นประชากร (WorldPop 100m)'
  );
  const w = recommendData.weights || {};
  h += table(
    ['ปัจจัย', 'น้ำหนัก'],
    [
      ['NDVI ต่ำ (ขาดต้นไม้)', `${(w.ndvi * 100).toFixed(0)}%`],
      ['LST สูง (ความร้อน)', `${(w.lst * 100).toFixed(0)}%`],
      ['ประชากรหนาแน่น', `${(w.population * 100).toFixed(0)}%`],
    ],
    { firstColWidth: 240 }
  );
  sections.push({ label: 'Method', html: h });

  if (recommendData.top_locations?.length > 0) {
    sections.push({
      label: 'Top จุดปลูก',
      html: sectionTitle(`Top ${recommendData.top_locations.length} จุดที่ควรปลูกต้นไม้`) +
        table(
          ['อันดับ', 'Latitude', 'Longitude', 'Score', 'ความเร่งด่วน'],
          recommendData.top_locations.map((p, i) => [
            String(i + 1),
            p.lat.toFixed(5), p.lng.toFixed(5),
            p.score.toFixed(3),
            p.score >= 0.7 ? 'เร่งด่วนสูง' : p.score >= 0.5 ? 'เร่งด่วน' : 'ปานกลาง',
          ])
        ),
    });
  }

  const sp = recommendData.recommended_species;
  if (sp?.species?.length > 0) {
    let sh = sectionTitle(`พันธุ์ไม้แนะนำ${sp.region ? ` (ภาค${sp.region})` : ''}`, { color: COLOR.green });
    sh += sp.species.map(s => `
      <div style="margin:6px 40px 10px;padding:12px 16px;background:#f8f9fa;border-radius:6px;border-left:3px solid ${COLOR.green};">
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
          <div style="font-size:13pt;font-weight:700;color:${COLOR.text};">${esc(s.name_th)}</div>
          <div style="font-size:9.5pt;font-style:italic;color:${COLOR.muted};">${esc(s.scientific || '')}</div>
        </div>
        <div style="font-size:10pt;color:${COLOR.text};margin-top:4px;">${esc(s.purpose)} · สูง ${esc(s.height_m)} ม.${s.traits?.length ? ' · ' + s.traits.map(esc).join(' / ') : ''}</div>
        <div style="font-size:9.5pt;color:${COLOR.muted};margin-top:4px;line-height:1.6;">เหตุผล: ${esc(s.reason)}</div>
      </div>
    `).join('');
    sections.push({ label: 'Species', html: sh });
  }

  await renderSegmentsToPdf(
    sections,
    `recommend_report_${(selectedDistrict || selectedProvinceEN || 'thailand').replace(/\s+/g, '_')}_${ts()}.pdf`,
    { docTitle }
  );
};
