// HTML "component" templates — cover, section title, paragraph, table, callout, image box.
// All produce inline-styled HTML strings to be assembled by build*Report() then rendered to canvas.
import { esc } from './helpers';

export const COLOR = {
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

export const cover = ({ kicker, heading, subheading, accent = COLOR.primary, miniMapDataUrl, year }) => `
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

export const sectionTitle = (text, opts = {}) => `
  <div style="display:flex;align-items:center;gap:10px;margin:22px 40px 10px;">
    <div style="width:4px;height:20px;background:${opts.color || COLOR.primary};border-radius:2px;"></div>
    <div style="font-size:14pt;font-weight:700;color:${COLOR.text};">${esc(text)}</div>
  </div>
`;

export const paragraph = (text, opts = {}) => {
  const { color = COLOR.text, bold = false, size = '10.5pt', muted = false } = opts;
  return `<div style="margin:4px 40px 8px;font-size:${size};font-weight:${bold ? 700 : 400};color:${muted ? COLOR.muted : color};line-height:1.65;">${text}</div>`;
};

export const table = (headers, rows, opts = {}) => {
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

export const calloutBox = (text, color = COLOR.primary) => `
  <div class="no-split" style="margin:6px 40px 12px;padding:10px 14px;background:${color}12;border-left:3px solid ${color};border-radius:4px;font-size:10.5pt;color:${color};font-weight:600;line-height:1.55;page-break-inside:avoid;break-inside:avoid;">
    ${text}
  </div>
`;

// note() = บรรทัดสั้น ๆ → ใส่ class no-split เสมอ กัน slicer ตัดครึ่งกลางตัวอักษรไทย
// (html2canvas slice เป็น bitmap → glyph ที่โดนตัดจะแสดงผลเพี้ยน เช่น สระ/วรรณยุกต์หาย)
export const note = (text) => `
  <div class="no-split" style="margin:0 40px 10px;font-size:8.5pt;color:${COLOR.muted};line-height:1.5;page-break-inside:avoid;break-inside:avoid;">${text}</div>
`;

export const twoColumns = (left, right) => `
  <div style="display:flex;gap:14px;margin:0 40px 12px;">
    <div style="flex:1;">${left}</div>
    <div style="flex:1;">${right}</div>
  </div>
`;

export const imageBox = (dataUrl, caption, opts = {}) => {
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
export const niceStep = (range, targetSteps = 5) => {
  if (range <= 0) return 1;
  const raw = range / targetSteps;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const candidates = [1, 2, 2.5, 5, 10];
  const nice = candidates.find(c => norm <= c) || 10;
  return nice * mag;
};
