import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PROVINCE_TH } from '../constants';

const ts = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const rowsToCsv = (rows) =>
  rows.map(r => r.map(csvCell).join(',')).join('\r\n');

// UTF-8 BOM ทำให้ Excel เปิดภาษาไทยได้
const downloadCsv = (rows, filename) => {
  const csv = '﻿' + rowsToCsv(rows);
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
};

export const exportStatsCsv = (data) => {
  const {
    selectedProvince, selectedProvinceEN, selectedDistrict,
    provinceArea, districtArea,
    ndviStats, ndviMonthly, lstStats, lstMonthly,
    districtNdviStats, districtNdviMonthly, districtLstStats, districtLstMonthly,
  } = data;

  const rows = [];
  rows.push(['รายงานข้อมูลพื้นที่สีเขียว']);
  rows.push(['จังหวัด', selectedProvince || '-', selectedProvinceEN || '']);
  if (selectedDistrict) rows.push(['อำเภอ', selectedDistrict]);
  rows.push(['พื้นที่จังหวัด (km²)', provinceArea ?? '']);
  if (districtArea) rows.push(['พื้นที่อำเภอ (km²)', districtArea]);
  rows.push([]);

  if (ndviStats) {
    rows.push(['— NDVI จังหวัด —']);
    rows.push(['NDVI Mean', ndviStats.ndvi_mean]);
    rows.push(['NDVI Min', ndviStats.ndvi_min]);
    rows.push(['NDVI Max', ndviStats.ndvi_max]);
    rows.push(['Green Area (%)', ndviStats.green_area_pct]);
    rows.push(['Green Area (km²)', ndviStats.green_area_km2]);
    if (ndviStats.green_area_m2_per_person != null)
      rows.push(['Green Area m²/คน', ndviStats.green_area_m2_per_person]);
    if (ndviStats.population) rows.push(['ประชากร', ndviStats.population]);
    if (ndviStats.who_status) rows.push(['สถานะ WHO', ndviStats.who_status]);
    rows.push([]);
  }

  if (lstStats) {
    rows.push(['— LST จังหวัด (°C) —']);
    rows.push(['LST Mean', lstStats.lst_mean]);
    rows.push(['LST Min', lstStats.lst_min]);
    rows.push(['LST Max', lstStats.lst_max]);
    rows.push([]);
  }

  if (ndviMonthly?.length) {
    rows.push(['— NDVI รายเดือน (จังหวัด) —']);
    rows.push(['เดือน', 'NDVI']);
    ndviMonthly.forEach(m => rows.push([m.month, m.ndvi]));
    rows.push([]);
  }

  if (lstMonthly?.length) {
    rows.push(['— LST รายเดือน (จังหวัด, °C) —']);
    rows.push(['เดือน', 'LST']);
    lstMonthly.forEach(m => rows.push([m.month, m.lst]));
    rows.push([]);
  }

  if (districtNdviStats) {
    rows.push(['— NDVI อำเภอ —']);
    rows.push(['NDVI Mean', districtNdviStats.ndvi_mean]);
    rows.push(['NDVI Min', districtNdviStats.ndvi_min]);
    rows.push(['NDVI Max', districtNdviStats.ndvi_max]);
    rows.push(['Green Area (%)', districtNdviStats.green_area_pct]);
    rows.push(['Green Area (km²)', districtNdviStats.green_area_km2]);
    rows.push([]);
  }

  if (districtLstStats) {
    rows.push(['— LST อำเภอ (°C) —']);
    rows.push(['LST Mean', districtLstStats.lst_mean]);
    rows.push(['LST Min', districtLstStats.lst_min]);
    rows.push(['LST Max', districtLstStats.lst_max]);
    rows.push([]);
  }

  if (districtNdviMonthly?.length) {
    rows.push(['— NDVI รายเดือน (อำเภอ) —']);
    rows.push(['เดือน', 'NDVI']);
    districtNdviMonthly.forEach(m => rows.push([m.month, m.ndvi]));
    rows.push([]);
  }

  if (districtLstMonthly?.length) {
    rows.push(['— LST รายเดือน (อำเภอ, °C) —']);
    rows.push(['เดือน', 'LST']);
    districtLstMonthly.forEach(m => rows.push([m.month, m.lst]));
  }

  const slug = (selectedDistrict || selectedProvinceEN || 'thailand').replace(/\s+/g, '_');
  downloadCsv(rows, `stats_${slug}_${ts()}.csv`);
};

export const exportTrendCsv = (data) => {
  const { selectedProvince, selectedProvinceEN, trendData, trendMetric } = data;
  const rows = [['แนวโน้มรายปี', selectedProvince || '']];
  rows.push(['Metric', trendMetric]);
  rows.push([]);
  rows.push(['ปี', 'NDVI Mean', 'พื้นที่สีเขียว %']);
  trendData.forEach(d => rows.push([d.year, d.ndvi_mean ?? '', d.green_area_pct ?? '']));
  downloadCsv(rows, `trend_${selectedProvinceEN || 'province'}_${ts()}.csv`);
};

export const exportCompareCsv = (data) => {
  const { compareData, compareYear, compareMetric } = data;
  const rows = [['เปรียบเทียบจังหวัด', `ปี ${compareYear}`]];
  rows.push(['Metric', compareMetric]);
  rows.push([]);
  rows.push(['จังหวัด (EN)', 'จังหวัด (TH)', 'NDVI Mean', 'พื้นที่สีเขียว %', 'Green Area km²']);
  compareData.forEach(d => rows.push([
    d.province,
    PROVINCE_TH[d.province] || d.province,
    d.ndvi_mean ?? '',
    d.green_area_pct ?? '',
    d.green_area_km2 ?? '',
  ]));
  downloadCsv(rows, `compare_${compareYear}_${ts()}.csv`);
};

export const exportRankingCsv = (data) => {
  const { rankingData, rankingYear, rankingStats } = data;
  const rows = [['อันดับจังหวัด', `ปี ${rankingYear}`]];
  if (rankingStats) {
    rows.push(['ทั้งหมด', rankingStats.total]);
    rows.push(['ผ่าน WHO', rankingStats.whoPass]);
    rows.push(['ต่ำกว่า WHO', rankingStats.whoFail]);
  }
  rows.push([]);
  rows.push(['อันดับ', 'จังหวัด (EN)', 'จังหวัด (TH)', 'm²/คน', 'NDVI Mean', 'Green Area %']);
  rankingData.forEach(r => rows.push([
    r.rank,
    r.province,
    PROVINCE_TH[r.province] || r.province,
    r.green_area_m2_per_person ?? '',
    r.ndvi_mean ?? '',
    r.green_area_pct ?? '',
  ]));
  downloadCsv(rows, `ranking_${rankingYear}_${ts()}.csv`);
};

export const exportRecommendCsv = (data) => {
  const { recommendData, selectedProvinceEN, selectedDistrict } = data;
  if (!recommendData) return;
  const rows = [['AI Planting Recommendation', selectedProvinceEN, selectedDistrict || '']];
  rows.push(['น้ำหนัก NDVI', recommendData.weights?.ndvi]);
  rows.push(['น้ำหนัก LST', recommendData.weights?.lst]);
  rows.push(['น้ำหนัก ประชากร', recommendData.weights?.population]);
  rows.push([]);

  rows.push(['Top Locations']);
  rows.push(['อันดับ', 'Latitude', 'Longitude', 'Score']);
  (recommendData.top_locations || []).forEach((p, i) =>
    rows.push([i + 1, p.lat, p.lng, p.score])
  );
  rows.push([]);

  const sp = recommendData.recommended_species;
  if (sp?.species?.length) {
    rows.push(['พันธุ์ไม้แนะนำ', `ภาค${sp.region || ''}`]);
    rows.push(['ชื่อไทย', 'Scientific', 'ความสูง (m)', 'จุดประสงค์', 'คุณสมบัติ', 'เหตุผล']);
    sp.species.forEach(s => rows.push([
      s.name_th, s.scientific, s.height_m, s.purpose,
      (s.traits || []).join(' / '),
      s.reason,
    ]));
  }

  const slug = (selectedDistrict || selectedProvinceEN || 'thailand').replace(/\s+/g, '_');
  downloadCsv(rows, `recommend_${slug}_${ts()}.csv`);
};

const captureElement = async (element) => {
  return html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  });
};

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

  // หา canvas ของ DeckGL/MapLibre
  const mapWrapper = document.querySelector('.map-container');
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
