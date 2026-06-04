// Core PDF rendering engine — takes pre-built HTML sections and slices them across A4 pages.
// All Thai text is rendered as HTML (browser handles glyph shaping), captured to canvas at 2x DPI.
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { esc, ensureFont } from './helpers';

const A4_W_PT = 595.28;
const A4_H_PT = 841.89;
const CONTENT_WIDTH_PX = 750;
const RENDER_SCALE = 2;

// Render a *segmented* HTML structure into a multi-page PDF.
// Sections is an array: [{ label, html }] — label drives the per-page header.
export const renderSegmentsToPdf = async (sections, filename, meta = {}) => {
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
      for (const r of protectedRanges) {
        if (r.bottom <= startY) continue;
        if (r.top >= defaultEndY) continue;
        // Range starts within slice but extends past — only push to next page if range fits in one page
        const rangeH = r.bottom - r.top;
        if (r.top > startY && r.top < defaultEndY && r.bottom > defaultEndY && rangeH <= pageSlicePx) {
          return r.top;
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

    // คืน label ของ section ที่ "ครอบครองหน้านี้มากที่สุด" (vertical overlap สูงสุด)
    // ทำงานถูกในทุกเคส: tail ของ section ก่อนล้นมาขึ้นบน → section ใหม่ยังชนะถ้ากินเนื้อที่มากกว่า
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

      pdf.text(`${i + 1} / ${pageCount}`, A4_W_PT - 20, 17, { align: 'right' });

      pdf.addImage(dataUrl, 'JPEG', 0, headerH, imgWPt, slicePx / pxPerPt, undefined, 'FAST');
    });

    pdf.save(filename);
  } finally {
    document.body.removeChild(host);
  }
};
