const pptxgen = require("pptxgenjs");
const path = require("path");

const SHOT = (f) => path.join("C:", "Users", "ComSync", "Desktop", "Project", "presentation", "screenshots", f);

const {
  FOREST, FOREST2, MOSS, MINT, CREAM, INK, MUTE, WHITE, HF, BF, W, H,
} = require("./_palette");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.author = "Felsau";
pres.title = "Green Area Analysis · Thailand";

const makeShadow = () => ({ type: "outer", color: "000000", blur: 9, offset: 3, angle: 135, opacity: 0.22 });

// Helper: section eyebrow + title block on light slide
function lightHeader(slide, eyebrow, title) {
  slide.background = { color: CREAM };
  slide.addText(eyebrow.toUpperCase(), {
    x: 0.7, y: 0.5, w: 12, h: 0.35, fontFace: HF, fontSize: 12, bold: true,
    color: MOSS, charSpacing: 3, margin: 0,
  });
  slide.addText(title, {
    x: 0.7, y: 0.82, w: 12, h: 0.85, fontFace: HF, fontSize: 30, bold: true,
    color: FOREST2, margin: 0,
  });
}

// Diamond motif (the app's logo shape)
function diamond(slide, x, y, s, color) {
  slide.addShape(pres.shapes.DIAMOND, { x, y, w: s, h: s, fill: { color }, line: { type: "none" } });
}

// ============ SLIDE 1 — TITLE ============
{
  const s = pres.addSlide();
  s.background = { color: FOREST };
  // subtle moss band bottom
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 6.95, w: W, h: 0.55, fill: { color: FOREST2 }, line: { type: "none" } });
  diamond(s, 0.85, 1.55, 0.45, MINT);
  s.addText("GREEN AREA ANALYSIS · THAILAND", {
    x: 1.45, y: 1.55, w: 11, h: 0.5, fontFace: HF, fontSize: 15, bold: true, color: MOSS, charSpacing: 3, margin: 0, valign: "middle",
  });
  s.addText("แดชบอร์ดวิเคราะห์พื้นที่สีเขียว\nและระบบ AI แนะนำพื้นที่ปลูกต้นไม้", {
    x: 0.85, y: 2.5, w: 11.6, h: 2.0, fontFace: HF, fontSize: 42, bold: true, color: WHITE, lineSpacing: 50, margin: 0,
  });
  s.addText("วิเคราะห์ NDVI · LST จากภาพถ่ายดาวเทียมผ่าน Google Earth Engine — ประเมินตามมาตรฐานพื้นที่สีเขียว WHO และจัดลำดับจุดที่ควรปลูกต้นไม้ด้วยคะแนน Priority", {
    x: 0.87, y: 4.55, w: 10.8, h: 1.0, fontFace: BF, fontSize: 16, color: "C9D6C0", lineSpacing: 24, margin: 0,
  });
  s.addText([
    { text: "วิทยานิพนธ์ระดับปริญญาตรี", options: { color: WHITE, bold: true } },
    { text: "   ·   นักศึกษา: Felsau", options: { color: "C9D6C0" } },
    { text: "   ·   นำเสนอ 13 มิ.ย. 2569", options: { color: "C9D6C0" } },
  ], { x: 0.87, y: 6.05, w: 11.6, h: 0.5, fontFace: BF, fontSize: 14, margin: 0 });
  s.addNotes("สวัสดีครับอาจารย์ วันนี้ผมจะนำเสนอโปรเจกต์ \"Green Area Analysis · Thailand\" ซึ่งเป็นแดชบอร์ดวิเคราะห์พื้นที่สีเขียวของประเทศไทยจากภาพถ่ายดาวเทียม โดยดึงข้อมูลผ่าน Google Earth Engine มาคำนวณดัชนีพืชพรรณ (NDVI) และอุณหภูมิพื้นผิว (LST) แล้วนำมาประเมินเทียบมาตรฐานพื้นที่สีเขียวของ WHO พร้อมมีระบบ AI ช่วยจัดลำดับจุดที่ควรปลูกต้นไม้มากที่สุดครับ");
}

// ============ SLIDE 2 — ที่มาและความสำคัญ ============
{
  const s = pres.addSlide();
  lightHeader(s, "ที่มาและความสำคัญ", "ทำไมต้องวิเคราะห์พื้นที่สีเขียว");
  const cards = [
    ["พื้นที่สีเขียวไม่เพียงพอ", "เมืองหลายแห่งในไทยมีพื้นที่สีเขียวต่อหัวต่ำกว่ามาตรฐาน WHO ที่กำหนดไว้ 9 ตร.ม./คน"],
    ["ปรากฏการณ์เกาะความร้อน", "พื้นที่เมืองที่ขาดต้นไม้มีอุณหภูมิพื้นผิว (LST) สูงกว่าพื้นที่โดยรอบอย่างชัดเจน"],
    ["ข้อมูลกระจัดกระจาย", "ข้อมูลดาวเทียมมีอยู่จริงแต่เข้าถึงและตีความยาก ต้องใช้ความรู้เฉพาะทาง"],
    ["ตัดสินใจปลูกแบบไร้ทิศทาง", "การเลือกพื้นที่ปลูกต้นไม้ส่วนใหญ่ยังไม่ได้อิงข้อมูลเชิงพื้นที่ที่เป็นระบบ"],
  ];
  const cw = 5.75, ch = 2.15, gx = 0.7, gy = 1.95, gapx = 0.5, gapy = 0.45;
  cards.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gapx), y = gy + row * (ch + gapy);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: WHITE }, line: { type: "none" }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.1, h: ch, fill: { color: MOSS }, line: { type: "none" } });
    s.addText(c[0], { x: x + 0.35, y: y + 0.28, w: cw - 0.6, h: 0.5, fontFace: HF, fontSize: 18, bold: true, color: FOREST2, margin: 0 });
    s.addText(c[1], { x: x + 0.35, y: y + 0.88, w: cw - 0.6, h: 1.1, fontFace: BF, fontSize: 14, color: INK, lineSpacing: 21, margin: 0, valign: "top" });
  });
  s.addNotes("ปัญหาหลักที่ทำให้เกิดโปรเจกต์นี้มี 4 เรื่อง: หนึ่ง หลายเมืองมีพื้นที่สีเขียวต่อหัวต่ำกว่ามาตรฐาน WHO ที่ 9 ตารางเมตรต่อคน; สอง พื้นที่ที่ขาดต้นไม้เกิดปรากฏการณ์เกาะความร้อน อุณหภูมิสูงกว่ารอบข้าง; สาม ข้อมูลดาวเทียมมีอยู่แต่ตีความยาก ต้องใช้ผู้เชี่ยวชาญ; และสี่ การเลือกพื้นที่ปลูกต้นไม้มักไม่ได้อิงข้อมูล โปรเจกต์นี้จึงเข้ามาช่วยแก้ทั้งสี่จุดนี้ครับ");
}

// ============ SLIDE 3 — วัตถุประสงค์ ============
{
  const s = pres.addSlide();
  lightHeader(s, "วัตถุประสงค์ของโครงงาน", "เป้าหมายที่ต้องการบรรลุ");
  const objs = [
    ["01", "แปลงข้อมูลดาวเทียมให้เข้าใจง่าย", "ดึง NDVI และ LST จาก Google Earth Engine มาแสดงผลบนแผนที่ 3 มิติแบบโต้ตอบได้"],
    ["02", "ประเมินเทียบมาตรฐาน WHO", "คำนวณพื้นที่สีเขียวต่อหัวประชากร แล้วบอกว่าผ่าน/ไม่ผ่านเกณฑ์ 9 ตร.ม./คน"],
    ["03", "ชี้จุดที่ควรปลูกด้วย AI", "ให้คะแนน Priority Score รายพิกัด จัดลำดับ Top 10 จุด พร้อมประเมินการดูดซับ CO₂"],
    ["04", "แนะนำพันธุ์ไม้ที่เหมาะสม", "เสนอชนิดพันธุ์ตามภูมิภาคและสภาพพื้นที่ พร้อมออกรายงาน PDF สรุปผลได้"],
  ];
  const y0 = 1.95, rh = 1.18;
  objs.forEach((o, i) => {
    const y = y0 + i * rh;
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y + 0.05, w: 0.85, h: 0.85, fill: { color: FOREST2 }, line: { type: "none" } });
    s.addText(o[0], { x: 0.7, y: y + 0.05, w: 0.85, h: 0.85, fontFace: HF, fontSize: 20, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(o[1], { x: 1.8, y: y + 0.05, w: 10.8, h: 0.5, fontFace: HF, fontSize: 19, bold: true, color: FOREST2, margin: 0 });
    s.addText(o[2], { x: 1.8, y: y + 0.52, w: 10.8, h: 0.5, fontFace: BF, fontSize: 14, color: INK, margin: 0, lineSpacing: 19 });
  });
  s.addNotes("โครงงานนี้มีวัตถุประสงค์ 4 ข้อ: ข้อแรก แปลงข้อมูลดาวเทียมที่ซับซ้อนให้แสดงบนแผนที่ 3 มิติที่โต้ตอบได้ ข้อสอง ประเมินพื้นที่สีเขียวต่อหัวเทียบมาตรฐาน WHO ข้อสาม ใช้ AI ให้คะแนนและจัดลำดับจุดที่ควรปลูกพร้อมประเมินการดูดซับคาร์บอน และข้อสี่ แนะนำพันธุ์ไม้ที่เหมาะกับแต่ละพื้นที่ และออกรายงาน PDF ได้ครับ");
}

// ============ SLIDE 4 — สถาปัตยกรรมระบบ ============
{
  const s = pres.addSlide();
  lightHeader(s, "ภาพรวมระบบ", "สถาปัตยกรรมการทำงาน");
  const boxes = [
    ["Frontend", "React 19 + DeckGL\nMapLibre GL · jsPDF", MINT],
    ["Backend", "FastAPI (uvicorn)\nPython", FOREST2],
    ["Google Earth Engine", "ภาพถ่ายดาวเทียม\nNDVI · LST", MOSS],
  ];
  const bw = 3.3, bh = 1.7, y = 2.6, startx = 0.9, gap = 1.45;
  boxes.forEach((b, i) => {
    const x = startx + i * (bw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: bw, h: bh, fill: { color: b[2] }, line: { type: "none" }, rectRadius: 0.12, shadow: makeShadow() });
    s.addText(b[0], { x: x + 0.2, y: y + 0.28, w: bw - 0.4, h: 0.5, fontFace: HF, fontSize: 18, bold: true, color: WHITE, align: "center", margin: 0 });
    s.addText(b[1], { x: x + 0.2, y: y + 0.85, w: bw - 0.4, h: 0.7, fontFace: BF, fontSize: 13, color: "F0F5EC", align: "center", margin: 0, lineSpacing: 18 });
    if (i < 2) {
      const ax = x + bw + 0.2;
      s.addText("⇄", { x: ax, y: y + 0.4, w: gap - 0.4, h: bh - 0.8, fontFace: HF, fontSize: 30, bold: true, color: MUTE, align: "center", valign: "middle", margin: 0 });
    }
  });
  // Supabase cache below backend
  const cx = startx + 1 * (bw + gap);
  s.addShape(pres.shapes.LINE, { x: cx + bw / 2, y: y + bh, w: 0, h: 0.55, line: { color: MUTE, width: 1.5, dashType: "dash" } });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx - 0.3, y: y + bh + 0.55, w: bw + 0.6, h: 0.95, fill: { color: WHITE }, line: { color: MOSS, width: 1.5 }, rectRadius: 0.1 });
  s.addText("Supabase (PostgreSQL + Storage)", { x: cx - 0.3, y: y + bh + 0.62, w: bw + 0.6, h: 0.4, fontFace: HF, fontSize: 14, bold: true, color: FOREST2, align: "center", margin: 0 });
  s.addText("Cache 11 ตาราง · ลดการประมวลผล GEE ซ้ำซ้อน", { x: cx - 0.3, y: y + bh + 1.0, w: bw + 0.6, h: 0.4, fontFace: BF, fontSize: 12, color: MUTE, align: "center", margin: 0 });
  s.addText("ผู้ใช้เลือกพื้นที่บน Frontend → Backend ดึงและประมวลผลข้อมูลจาก Earth Engine → เก็บผลลงแคช Supabase แล้วส่งกลับมาแสดงผล", {
    x: 0.7, y: 6.45, w: 12, h: 0.6, fontFace: BF, fontSize: 13, italic: true, color: MUTE, align: "center", margin: 0 });
  s.addNotes("ระบบแบ่งเป็น 3 ส่วนหลัก ฝั่งหน้าเว็บใช้ React 19 ร่วมกับ DeckGL และ MapLibre เพื่อแสดงแผนที่ 3 มิติ ฝั่งเซิร์ฟเวอร์ใช้ FastAPI ภาษา Python ทำหน้าที่ดึงและประมวลผลข้อมูลจาก Google Earth Engine และมี Supabase เป็นฐานข้อมูลแคช 11 ตาราง เพื่อเก็บผลที่คำนวณแล้ว ลดการประมวลผลซ้ำซึ่งช้าและมีค่าใช้จ่าย ทำให้ระบบตอบสนองเร็วขึ้นมากครับ");
}

// ============ SLIDE 5 — เทคโนโลยีและข้อมูล ============
{
  const s = pres.addSlide();
  lightHeader(s, "เทคโนโลยีและชุดข้อมูล", "เครื่องมือและแหล่งข้อมูลที่ใช้");
  const left = [
    ["ดัชนีพืชพรรณ NDVI", "Sentinel-2 (ESA Copernicus) — composite รายปี/รายเดือน"],
    ["อุณหภูมิพื้นผิว LST", "Landsat 8/9 (USGS/NASA) — ค่าเฉลี่ยรายปีและรายเดือน"],
    ["ประเภทพื้นที่ปกคลุม", "ESA WorldCover v200 — แยกพื้นที่เมือง/พืชพรรณ"],
    ["ความหนาแน่นประชากร", "WorldPop 100m — คำนวณพื้นที่สีเขียวต่อหัว"],
    ["ขอบเขตการปกครอง", "GADM 4.1 — จังหวัดและอำเภอทั้งประเทศ"],
  ];
  const colw = 5.85;
  s.addText("ชุดข้อมูลดาวเทียม", { x: 0.7, y: 1.85, w: colw, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: MOSS, margin: 0 });
  left.forEach((d, i) => {
    const y = 2.35 + i * 0.95;
    s.addText(d[0], { x: 0.7, y, w: colw, h: 0.38, fontFace: HF, fontSize: 15, bold: true, color: FOREST2, margin: 0 });
    s.addText(d[1], { x: 0.7, y: y + 0.36, w: colw, h: 0.45, fontFace: BF, fontSize: 12.5, color: INK, margin: 0, lineSpacing: 17 });
  });
  // right: stack
  const rx = 7.1, rw = 5.5;
  s.addText("เทคโนโลยีหลัก", { x: rx, y: 1.85, w: rw, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: MOSS, margin: 0 });
  const stack = [
    "Google Earth Engine — แพลตฟอร์มประมวลผลภาพดาวเทียม",
    "FastAPI + Python — REST API ฝั่งเซิร์ฟเวอร์",
    "React 19 + DeckGL + MapLibre — แผนที่ 3 มิติ",
    "Supabase (PostgreSQL) — ฐานข้อมูลแคช",
    "jsPDF + html2canvas — ออกรายงาน PDF",
    "GitHub Actions CI — ทดสอบอัตโนมัติทุก push",
  ];
  s.addShape(pres.shapes.RECTANGLE, { x: rx, y: 2.35, w: rw, h: 4.35, fill: { color: WHITE }, line: { type: "none" }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: rx, y: 2.35, w: 0.1, h: 4.35, fill: { color: MINT }, line: { type: "none" } });
  s.addText(stack.map((t, i) => ({ text: t, options: { bullet: { code: "2022", indent: 18 }, breakLine: true, paraSpaceAfter: 12, color: INK } })),
    { x: rx + 0.4, y: 2.6, w: rw - 0.7, h: 3.9, fontFace: BF, fontSize: 14, lineSpacing: 19, valign: "top", margin: 0 });
  s.addNotes("ด้านข้อมูล ผมใช้ Sentinel-2 สำหรับคำนวณ NDVI, Landsat 8/9 สำหรับอุณหภูมิพื้นผิว LST, ESA WorldCover แยกพื้นที่เมืองกับพืชพรรณ, WorldPop สำหรับความหนาแน่นประชากร และ GADM สำหรับขอบเขตจังหวัดอำเภอ ส่วนเทคโนโลยีหลักก็ตามที่แสดงทางขวา โดยทั้งหมดมีการทดสอบอัตโนมัติผ่าน GitHub Actions ทุกครั้งที่มีการแก้โค้ดครับ");
}

// Helper for demo slides: caption left, big screenshot right
function demoSlide(eyebrow, title, bullets, img, imgRatio, note) {
  const s = pres.addSlide();
  s.background = { color: CREAM };
  s.addText(eyebrow.toUpperCase(), { x: 0.7, y: 0.55, w: 5.2, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText(title, { x: 0.7, y: 0.9, w: 5.4, h: 1.1, fontFace: HF, fontSize: 26, bold: true, color: FOREST2, margin: 0, lineSpacing: 30 });
  s.addText(bullets.map((b) => ({ text: b, options: { bullet: { code: "2022", indent: 18 }, breakLine: true, paraSpaceAfter: 14, color: INK } })),
    { x: 0.72, y: 2.35, w: 5.2, h: 4.4, fontFace: BF, fontSize: 14.5, lineSpacing: 21, valign: "top", margin: 0 });
  // image area on right
  const ax = 6.35, maxW = 6.45, maxH = 6.1, ay0 = 0.7;
  let iw = maxW, ih = iw / imgRatio;
  if (ih > maxH) { ih = maxH; iw = ih * imgRatio; }
  const ix = ax + (maxW - iw) / 2, iy = ay0 + (maxH - ih) / 2;
  s.addShape(pres.shapes.RECTANGLE, { x: ix - 0.08, y: iy - 0.08, w: iw + 0.16, h: ih + 0.16, fill: { color: WHITE }, line: { type: "none" }, shadow: makeShadow() });
  s.addImage({ path: img, x: ix, y: iy, w: iw, h: ih });
  s.addNotes(note);
  return s;
}

// Screenshot aspect ratios (approx from views)
const R_WIDE = 1431 / 716;  // full app shots ~2.0
const R_LAND = 970 / 480;   // 01.png landing ~2.02
const R_DOC = 1 / 1.414;    // PDF page portrait
// Fresh live captures from the running app (1440×810, light mode)
const LIVE = (f) => path.join("C:", "Users", "ComSync", "Desktop", "Project", "presentation", "screenshots_live", f);
const R_LIVE = 1440 / 810;

// ============ SLIDE 6 — Landing / เลือกพื้นที่ ============
demoSlide("การใช้งาน · ขั้นที่ 1", "เลือกพื้นที่ที่ต้องการวิเคราะห์",
  [
    "เปิดแผนที่ประเทศไทยทั้งประเทศ เลือกปีข้อมูลที่ต้องการ",
    "คลิกเลือกจังหวัด — ระบบ zoom และเริ่มดึงข้อมูลดาวเทียมทันที",
    "รองรับการเลื่อนดูแบบ Time-lapse เปรียบเทียบหลายปี",
    "ใช้แผนที่ฐานจาก CARTO + OpenStreetMap",
  ],
  LIVE("02_dashboard_country.png"), R_LIVE,
  "หน้าจอแรกเมื่อเข้าใช้งาน ผู้ใช้จะเห็นแผนที่ประเทศไทยทั้งประเทศ สามารถเลือกปีข้อมูล แล้วคลิกที่จังหวัดที่สนใจ ระบบจะ zoom เข้าไปและเริ่มดึงข้อมูลดาวเทียมของจังหวัดนั้นมาคำนวณให้ทันที และยังมีโหมด Time-lapse ให้เลื่อนดูเปรียบเทียบข้อมูลข้ามปีได้ครับ");

// ============ SLIDE 7 — NDVI ============
demoSlide("การใช้งาน · ขั้นที่ 2", "วิเคราะห์ดัชนีพืชพรรณ (NDVI)",
  [
    "แสดงค่า NDVI เฉลี่ยทั้งปี พร้อมค่าต่ำสุด–สูงสุด",
    "คำนวณ % พื้นที่สีเขียว (NDVI > 0.3) ของจังหวัด",
    "พื้นที่สีเขียวต่อหัวประชากร เทียบเกณฑ์ WHO 9 ตร.ม./คน",
    "กราฟ NDVI รายเดือน + แผนที่ 3 มิติยกตามค่าพืชพรรณ",
  ],
  LIVE("03_tak_ndvi.png"), R_LIVE,
  "เมื่อเลือกจังหวัด เช่น ตาก ระบบจะแสดงค่า NDVI เฉลี่ยทั้งปี ในตัวอย่างนี้คือ 0.61 ซึ่งหมายถึงพืชพรรณหนาแน่นมาก พร้อมบอกว่าพื้นที่สีเขียวคิดเป็น 96% ของจังหวัด และคำนวณพื้นที่สีเขียวต่อหัวประชากรว่าผ่านมาตรฐาน WHO หรือไม่ ด้านขวาเป็นแผนที่ 3 มิติที่ยกความสูงตามค่าพืชพรรณ ทำให้เห็นภาพชัดเจนครับ");

// ============ SLIDE 8 — LST ============
demoSlide("การใช้งาน · ขั้นที่ 3", "อุณหภูมิพื้นผิว & เกาะความร้อน",
  [
    "อุณหภูมิพื้นผิว (LST) เฉลี่ย พร้อมค่า min–max",
    "กราฟอุณหภูมิรายเดือน ไล่สีตามระดับความร้อน",
    "ประเมินความเสี่ยงเกาะความร้อนเมือง (Urban Heat Island)",
    "ส่งออกข้อมูลเป็น CSV · PNG · PDF · PNG+แผนที่",
  ],
  LIVE("05_tak_lst.png"), R_LIVE,
  "แท็บถัดมาแสดงอุณหภูมิพื้นผิวหรือ LST ที่ได้จาก Landsat ในตัวอย่างเฉลี่ย 31 องศา จุดที่ร้อนที่สุดถึง 48 องศา ระบบนำค่า NDVI กับ LST มาประเมินความเสี่ยงการเกิดเกาะความร้อนเมือง พื้นที่ที่เขียวน้อยและร้อนมากจะเสี่ยงสูง และผู้ใช้สามารถส่งออกข้อมูลได้หลายรูปแบบครับ");

// ============ SLIDE 9 — AI Priority ============
demoSlide("การใช้งาน · ขั้นที่ 4", "AI แนะนำจุดที่ควรปลูก",
  [
    "ให้คะแนน Priority Score รายพิกัดทั่วทั้งจังหวัด",
    "ถ่วงน้ำหนัก: NDVI ต่ำ 40% · LST สูง 30% · ประชากร 30%",
    "จัดลำดับ Top 10 จุด คลิกเปิดใน Google Maps ได้",
    "ประเมินผล: จำนวนต้นไม้รวม และ CO₂ ที่ดูดซับต่อปี",
  ],
  LIVE("06_tak_ai_priority.png"), R_LIVE,
  "นี่คือหัวใจของระบบครับ แท็บ AI แนะนำ จะให้คะแนน Priority Score กับทุกพิกัดในจังหวัด โดยถ่วงน้ำหนักจาก 3 ปัจจัย: พื้นที่ที่เขียวน้อย (NDVI ต่ำ) 40%, ร้อน (LST สูง) 30%, และคนเยอะ (ประชากรหนาแน่น) 30% แล้วจัดลำดับ 10 จุดที่ควรปลูกมากที่สุด คลิกเปิด Google Maps ได้เลย พร้อมประเมินว่าถ้าปลูกเต็มพื้นที่จะได้กี่ต้นและดูดซับ CO₂ ได้เท่าไรต่อปีครับ");

// ============ SLIDE 10 — Species ============
demoSlide("การใช้งาน · ขั้นที่ 5", "แนะนำพันธุ์ไม้ที่เหมาะสม",
  [
    "เสนอชนิดพันธุ์ตามภูมิภาคของพื้นที่ที่เลือก",
    "ระบุชื่อไทย–ชื่อวิทยาศาสตร์ ความสูง และคุณสมบัติ",
    "ครอบคลุมไม้เศรษฐกิจ ไม้ปรับปรุงดิน และไม้อนุรักษ์",
    "เช่น ประดู่ป่า · มะขาม · กระถินณรงค์ · พะยูง",
  ],
  LIVE("07_tak_ai_species.png"), R_LIVE,
  "นอกจากบอกว่าควรปลูกที่ไหน ระบบยังแนะนำว่าควรปลูกอะไร โดยเสนอพันธุ์ไม้ที่เหมาะกับภูมิภาคของพื้นที่นั้น พร้อมชื่อวิทยาศาสตร์ ความสูง และคุณสมบัติ เช่น ทนแล้ง โตเร็ว หรือเป็นไม้เศรษฐกิจ ครอบคลุมทั้งไม้เศรษฐกิจ ไม้ปรับปรุงดิน และไม้อนุรักษ์พันธุ์หายากครับ");

// ============ SLIDE 11 — District drill-down ============
demoSlide("การใช้งาน · ขั้นที่ 6", "ลงลึกระดับอำเภอ",
  [
    "คลิกเจาะลึกจากระดับจังหวัดลงไปถึงระดับอำเภอ",
    "คำนวณ NDVI และ LST เฉพาะอำเภอที่เลือก (ความละเอียดสูงขึ้น)",
    "เปรียบเทียบอำเภอที่เลือก (สีน้ำเงิน) กับอำเภออื่น",
    "เห็นความแตกต่างเชิงพื้นที่ภายในจังหวัดเดียวกัน",
  ],
  LIVE("08_tak_district.png"), R_LIVE,
  "ระบบไม่ได้หยุดที่ระดับจังหวัด ผู้ใช้สามารถคลิกเจาะลึกลงไปถึงระดับอำเภอได้ เช่นอำเภอแม่สอดในภาพ ระบบจะคำนวณ NDVI และ LST เฉพาะอำเภอนั้นด้วยความละเอียดที่สูงขึ้น อำเภอที่เลือกจะไฮไลต์เป็นสีน้ำเงิน ทำให้เปรียบเทียบความแตกต่างภายในจังหวัดเดียวกันได้ครับ");

// ============ SLIDE 12 — Reports (two PDFs) ============
{
  const s = pres.addSlide();
  s.background = { color: CREAM };
  s.addText("การใช้งาน · ขั้นที่ 7", { x: 0.7, y: 0.5, w: 12, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText("ออกรายงานสรุปผลเป็น PDF", { x: 0.7, y: 0.85, w: 12, h: 0.7, fontFace: HF, fontSize: 26, bold: true, color: FOREST2, margin: 0 });
  const imgs = [
    [SHOT("08_stats_report_cover.png"), "รายงานวิเคราะห์พื้นที่สีเขียว — สรุป NDVI · LST · เทียบ WHO"],
    [SHOT("10_recommend_report.png"), "รายงาน AI แนะนำการปลูก — Top 10 จุด + พันธุ์ไม้แนะนำ"],
  ];
  const dh = 4.55, dw = dh * R_DOC, gap = 1.0;
  const totalW = dw * 2 + gap, startx = (W - totalW) / 2, y = 1.85;
  imgs.forEach((it, i) => {
    const x = startx + i * (dw + gap);
    s.addShape(pres.shapes.RECTANGLE, { x: x - 0.06, y: y - 0.06, w: dw + 0.12, h: dh + 0.12, fill: { color: WHITE }, line: { type: "none" }, shadow: makeShadow() });
    s.addImage({ path: it[0], x, y, w: dw, h: dh });
    s.addText(it[1], { x: x - 0.3, y: y + dh + 0.2, w: dw + 0.6, h: 0.7, fontFace: BF, fontSize: 13, bold: true, color: INK, align: "center", margin: 0, lineSpacing: 18 });
  });
  s.addNotes("สุดท้ายผู้ใช้สามารถกดออกรายงานเป็นไฟล์ PDF ได้ 2 แบบ แบบแรกเป็นรายงานวิเคราะห์พื้นที่สีเขียว สรุปค่า NDVI, LST และผลการเทียบมาตรฐาน WHO พร้อมแผนที่ดัชนีพืชพรรณ และแบบที่สองเป็นรายงาน AI แนะนำการปลูก ที่มี Top 10 จุดพร้อมพิกัดและพันธุ์ไม้ที่แนะนำ เหมาะกับการนำไปใช้ตัดสินใจหรือเสนอหน่วยงานจริงครับ");
}

// ============ SLIDE 13 — Methodology ============
{
  const s = pres.addSlide();
  lightHeader(s, "ระเบียบวิธีโดยสรุป", "เบื้องหลังการคำนวณ");
  const items = [
    ["NDVI", "(NIR − Red) / (NIR + Red)", "ดัชนีพืชพรรณจาก Sentinel-2 ค่า > 0.3 = พื้นที่สีเขียว ทำ cloud mask ก่อนทำ composite"],
    ["LST", "Land Surface Temperature", "อุณหภูมิพื้นผิวจาก thermal band ของ Landsat 8/9 สูงกว่าอุณหภูมิอากาศ 5–20°C"],
    ["WHO", "พื้นที่สีเขียว ÷ ประชากร", "เทียบเกณฑ์ 9 ตร.ม./คน ใช้ WorldPop คำนวณประชากรในพื้นที่"],
    ["Priority", "0.4·(1−NDVI) + 0.3·LST' + 0.3·Pop'", "คะแนนถ่วงน้ำหนักรายพิกัด normalize 0–1 ยิ่งสูงยิ่งควรปลูกก่อน"],
  ];
  const y0 = 1.95, rh = 1.18;
  items.forEach((it, i) => {
    const y = y0 + i * rh;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y, w: 2.0, h: 0.95, fill: { color: FOREST2 }, line: { type: "none" }, rectRadius: 0.08 });
    s.addText(it[0], { x: 0.7, y, w: 2.0, h: 0.95, fontFace: HF, fontSize: 18, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(it[1], { x: 2.95, y: y + 0.08, w: 9.6, h: 0.42, fontFace: "Consolas", fontSize: 14, bold: true, color: MOSS, margin: 0 });
    s.addText(it[2], { x: 2.95, y: y + 0.5, w: 9.6, h: 0.5, fontFace: BF, fontSize: 13.5, color: INK, margin: 0, lineSpacing: 18 });
  });
  s.addNotes("สำหรับเบื้องหลังการคำนวณ: NDVI ใช้สูตรมาตรฐานจากแถบ near-infrared กับ red ค่ามากกว่า 0.3 ถือว่าเป็นพื้นที่สีเขียว และทำ cloud mask ก่อนเสมอ; LST คืออุณหภูมิพื้นผิวจากแถบความร้อนของ Landsat; การเทียบ WHO เอาพื้นที่สีเขียวหารด้วยประชากรจาก WorldPop; ส่วน Priority Score เป็นคะแนนถ่วงน้ำหนัก 3 ปัจจัยที่ normalize ให้อยู่ในช่วง 0 ถึง 1 ครับ");
}

// ============ SLIDE 14 — Results / สรุป ============
{
  const s = pres.addSlide();
  s.background = { color: FOREST };
  s.addText("สรุปผลและสิ่งที่ได้", { x: 0.7, y: 0.7, w: 12, h: 0.45, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText("ระบบที่ใช้งานได้จริงครบวงจร", { x: 0.7, y: 1.1, w: 12, h: 0.8, fontFace: HF, fontSize: 30, bold: true, color: WHITE, margin: 0 });
  const stats = [
    ["77", "จังหวัด", "ครอบคลุมทั่วประเทศ\nเจาะลึกถึงระดับอำเภอ"],
    ["3", "ปัจจัย AI", "NDVI · LST · ประชากร\nให้คะแนน Priority"],
    ["122", "test cases", "Backend 82 + Frontend 40\nรันอัตโนมัติทุก push"],
    ["WHO", "มาตรฐาน", "ประเมินพื้นที่สีเขียว\nต่อหัวประชากร"],
  ];
  const cw = 2.85, gap = 0.36, startx = 0.7, y = 2.35, ch = 2.6;
  stats.forEach((st, i) => {
    const x = startx + i * (cw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, fill: { color: FOREST2 }, line: { type: "none" }, rectRadius: 0.1 });
    s.addText(st[0], { x, y: y + 0.25, w: cw, h: 0.95, fontFace: HF, fontSize: 46, bold: true, color: MINT, align: "center", margin: 0 });
    s.addText(st[1], { x, y: y + 1.2, w: cw, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: WHITE, align: "center", margin: 0 });
    s.addText(st[2], { x: x + 0.15, y: y + 1.65, w: cw - 0.3, h: 0.85, fontFace: BF, fontSize: 12.5, color: "C9D6C0", align: "center", margin: 0, lineSpacing: 17 });
  });
  s.addText("ต่อยอดได้: เพิ่มข้อมูลรายปีย้อนหลัง · เชื่อมข้อมูลภาคสนาม · โมเดลทำนายการเติบโตของพื้นที่สีเขียว", {
    x: 0.7, y: 5.5, w: 12, h: 0.8, fontFace: BF, fontSize: 15, italic: true, color: MOSS, align: "center", margin: 0 });
  s.addNotes("สรุปแล้ว ผมได้ระบบที่ใช้งานได้จริงครบวงจร ครอบคลุม 77 จังหวัดเจาะลึกถึงอำเภอ ใช้ AI 3 ปัจจัยจัดลำดับการปลูก มีการทดสอบอัตโนมัติรวม 122 เคส และประเมินตามมาตรฐาน WHO ส่วนการต่อยอดในอนาคต อาจเพิ่มข้อมูลย้อนหลังหลายปี เชื่อมข้อมูลภาคสนาม หรือทำโมเดลทำนายการเติบโตของพื้นที่สีเขียวครับ");
}

// ============ SLIDE 15 — Thank you ============
{
  const s = pres.addSlide();
  s.background = { color: FOREST };
  diamond(s, (W - 0.6) / 2, 2.05, 0.6, MINT);
  s.addText("ขอบคุณครับ", { x: 0, y: 2.95, w: W, h: 1.0, fontFace: HF, fontSize: 44, bold: true, color: WHITE, align: "center", margin: 0 });
  s.addText("Green Area Analysis · Thailand — ยินดีรับคำถามและข้อเสนอแนะครับ", {
    x: 0, y: 4.0, w: W, h: 0.6, fontFace: BF, fontSize: 17, color: "C9D6C0", align: "center", margin: 0 });
  s.addText("Felsau  ·  github.com/Felsau/Project", { x: 0, y: 4.7, w: W, h: 0.5, fontFace: BF, fontSize: 14, color: MOSS, align: "center", margin: 0 });
  s.addNotes("ครบทุกส่วนแล้วครับ ขอบคุณอาจารย์ที่รับฟัง ยินดีรับคำถามและข้อเสนอแนะครับ");
}

pres.writeFile({ fileName: "C:/Users/ComSync/Desktop/Project/presentation/GreenArea_Presentation_live.pptx" }).then((fn) => {
  console.log("WROTE: " + fn);
});
