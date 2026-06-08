// Image/PDF exports — จับภาพ DOM element เป็น PNG/PDF (และรวมกับแผนที่).
import jsPDF from 'jspdf';
import { ts, triggerDownload, captureElement } from './shared';

export const exportElementPng = async (elementId, filename) => {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`ไม่พบ element id="${elementId}"`);
  const canvas = await captureElement(el);
  canvas.toBlob(blob => {
    if (blob) triggerDownload(blob, filename || `export_${ts()}.png`);
  }, 'image/png');
};

export const exportElementPdf = async (elementId, filename, title) => {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`ไม่พบ element id="${elementId}"`);
  const canvas = await captureElement(el);
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const headerH = title ? 32 : 0;
  const maxImgW = pageW - margin * 2;
  const maxImgH = pageH - margin * 2 - headerH;

  const ratio = canvas.height / canvas.width;
  let imgW = maxImgW;
  let imgH = imgW * ratio;

  if (title) {
    pdf.setFontSize(13);
    pdf.text(title, margin, margin + 16);
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text(new Date().toLocaleString('th-TH'), margin, margin + 28);
    pdf.setTextColor(0);
  }

  if (imgH <= maxImgH) {
    pdf.addImage(imgData, 'PNG', margin, margin + headerH, imgW, imgH);
  } else {
    // หน้ายาวกว่ากระดาษ → ตัดเป็นหลายหน้า
    const pxPerPt = canvas.width / imgW;
    const pageSliceH = maxImgH * pxPerPt;
    let y = 0;
    let first = true;
    while (y < canvas.height) {
      const sliceH = Math.min(pageSliceH, canvas.height - y);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const sliceData = slice.toDataURL('image/png');
      if (!first) {
        pdf.addPage();
        pdf.setFontSize(9);
        pdf.setTextColor(120);
        pdf.text(`${title || ''} (ต่อ)`, margin, margin);
        pdf.setTextColor(0);
      }
      pdf.addImage(sliceData, 'PNG', margin, margin + (first ? headerH : 8), imgW, sliceH / pxPerPt);
      y += sliceH;
      first = false;
    }
  }

  pdf.save(filename || `report_${ts()}.pdf`);
};

// จับภาพ sidebar tab + map รวมกันเป็นภาพเดียว
export const exportTabWithMapPng = async (elementId, filename) => {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`ไม่พบ element id="${elementId}"`);

  // หา canvas ของ DeckGL/MapLibre (wrapper คือ .canvas ใน App.js)
  const mapWrapper = document.querySelector('.canvas');
  const mapCanvases = mapWrapper ? Array.from(mapWrapper.querySelectorAll('canvas')) : [];

  // สร้าง snapshot ของแผนที่โดยรวมทุก canvas (basemap + deckgl) ด้วย CanvasRenderingContext2D
  let mapImg = null;
  if (mapCanvases.length > 0) {
    const first = mapCanvases[0];
    const w = first.width;
    const h = first.height;
    const merged = document.createElement('canvas');
    merged.width = w;
    merged.height = h;
    const ctx = merged.getContext('2d');
    for (const c of mapCanvases) {
      try { ctx.drawImage(c, 0, 0, w, h); } catch (_) { /* WebGL อาจไม่ได้ preserve buffer */ }
    }
    mapImg = merged;
  }

  // จับ sidebar tab
  const sidebarCanvas = await captureElement(el);

  // วาดสองอันต่อกันแบบ side-by-side
  const finalH = Math.max(sidebarCanvas.height, mapImg ? mapImg.height : 0);
  const sidebarW = sidebarCanvas.width;
  const mapW = mapImg ? Math.round(mapImg.width * (finalH / mapImg.height)) : 0;
  const final = document.createElement('canvas');
  final.width = sidebarW + mapW;
  final.height = finalH;
  const fctx = final.getContext('2d');
  fctx.fillStyle = '#ffffff';
  fctx.fillRect(0, 0, final.width, final.height);
  fctx.drawImage(sidebarCanvas, 0, 0);
  if (mapImg) fctx.drawImage(mapImg, sidebarW, 0, mapW, finalH);

  final.toBlob(blob => {
    if (blob) triggerDownload(blob, filename || `export_with_map_${ts()}.png`);
  }, 'image/png');
};
