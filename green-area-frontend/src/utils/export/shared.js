// Shared low-level helpers สำหรับ export (timestamp, download, CSV encode).
// ห้าม import html2canvas/jspdf ที่นี่ — csv.js import ไฟล์นี้แบบ static จึงต้อง
// เบาล้วน · canvas capture ย้ายไป capture.js (โหลด dynamic ผ่าน image.js)
export const ts = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

export const triggerDownload = (blob, filename) => {
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
  if (typeof v === 'number') return String(v);  // numbers are never formulas
  let s = String(v);
  // CSV formula-injection guard: spreadsheet apps execute cells starting with
  // = + - @ (or tab/CR). Prefix ' so they're read as text — but skip
  // numeric-looking strings (e.g. "-1.5") so real data isn't corrupted.
  if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) {
    s = `'${s}`;
  }
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// exported เพื่อ unit-test (formula-injection guard + quoting) — ดู shared.test.js
export const rowsToCsv = (rows) =>
  rows.map(r => r.map(csvCell).join(',')).join('\r\n');

// UTF-8 BOM ทำให้ Excel เปิดภาษาไทยได้
export const downloadCsv = (rows, filename) => {
  const csv = '﻿' + rowsToCsv(rows);
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
};
