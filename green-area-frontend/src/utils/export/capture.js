// html2canvas wrapper — แยกจาก shared.js เพื่อ code-splitting:
// shared.js (ts/downloadCsv) ถูก import แบบ static โดย csv.js → ถ้า html2canvas
// อยู่ใน shared.js ด้วย CSV export จะลาก html2canvas (~heavy) เข้า main bundle
// ทั้งที่ไม่ได้ใช้ · ไฟล์นี้ถูก import เฉพาะจาก image.js ที่โหลดแบบ dynamic เท่านั้น
import html2canvas from 'html2canvas';

export const captureElement = async (element) => {
  return html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  });
};
