const pptxgen = require("pptxgenjs");
const path = require("path");

const SHOT = (f) => path.join("C:", "Users", "ComSync", "Desktop", "Project", "presentation", "screenshots", f);
const LIVE = (f) => path.join("C:", "Users", "ComSync", "Desktop", "Project", "presentation", "screenshots_live", f);

const {
  FOREST, FOREST2, MOSS, MINT, CREAM, INK, MUTE, WHITE, PALE, HF, BF, W, H,
} = require("./_palette");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Felsau";
pres.title = "Green Area Analysis · Thailand";

const R_LIVE = 1440 / 810, R_DOC = 1 / 1.414;
const shadow = () => ({ type: "outer", color: "000000", blur: 9, offset: 3, angle: 135, opacity: 0.2 });

let pageNo = 0;
function footer(s, dark) {
  pageNo++;
  s.addText("Green Area Analysis · Thailand", { x: 0.7, y: 7.04, w: 7, h: 0.3, fontFace: BF, fontSize: 9, color: dark ? "6E8472" : MUTE, margin: 0 });
  s.addText(String(pageNo), { x: 12.2, y: 7.04, w: 0.5, h: 0.3, fontFace: BF, fontSize: 9, color: dark ? "6E8472" : MUTE, align: "right", margin: 0 });
}
function lightHeader(s, eyebrow, title) {
  s.background = { color: CREAM };
  s.addText(eyebrow.toUpperCase(), { x: 0.7, y: 0.48, w: 12, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText(title, { x: 0.7, y: 0.8, w: 12, h: 0.8, fontFace: HF, fontSize: 28, bold: true, color: FOREST2, margin: 0 });
}
function diamond(s, x, y, sz, c) { s.addShape(pres.shapes.DIAMOND, { x, y, w: sz, h: sz, fill: { color: c }, line: { type: "none" } }); }
function bullets(s, arr, opt) {
  s.addText(arr.map((b) => ({ text: b, options: { bullet: { code: "2022", indent: 18 }, breakLine: true, paraSpaceAfter: opt.gap || 12, color: opt.color || INK } })),
    { x: opt.x, y: opt.y, w: opt.w, h: opt.h, fontFace: BF, fontSize: opt.fs || 14, lineSpacing: opt.ls || 20, valign: "top", margin: 0 });
}

// ============ 1. TITLE ============
{
  const s = pres.addSlide();
  s.background = { color: FOREST };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 6.95, w: W, h: 0.55, fill: { color: FOREST2 }, line: { type: "none" } });
  diamond(s, 0.85, 1.5, 0.45, MINT);
  s.addText("GREEN AREA ANALYSIS · THAILAND", { x: 1.45, y: 1.5, w: 11, h: 0.5, fontFace: HF, fontSize: 15, bold: true, color: MOSS, charSpacing: 3, margin: 0, valign: "middle" });
  s.addText("แดชบอร์ดวิเคราะห์พื้นที่สีเขียว\nและระบบ AI แนะนำพื้นที่ปลูกต้นไม้", { x: 0.85, y: 2.35, w: 11.6, h: 1.9, fontFace: HF, fontSize: 40, bold: true, color: WHITE, lineSpacing: 48, margin: 0 });
  s.addText("วิเคราะห์ดัชนีพืชพรรณ (NDVI) และอุณหภูมิพื้นผิว (LST) จากภาพถ่ายดาวเทียมผ่าน Google Earth Engine · ประเมินตามมาตรฐานพื้นที่สีเขียว WHO · จัดลำดับจุดที่ควรปลูกต้นไม้ด้วยคะแนน Priority", { x: 0.87, y: 4.35, w: 11.2, h: 1.0, fontFace: BF, fontSize: 16, color: "C9D6C0", lineSpacing: 24, margin: 0 });
  s.addText([
    { text: "วิทยานิพนธ์ระดับปริญญาตรี", options: { color: WHITE, bold: true } },
    { text: "    ·    นักศึกษา: Felsau", options: { color: "C9D6C0" } },
    { text: "    ·    นำเสนอ 14 มิ.ย. 2569", options: { color: "C9D6C0" } },
  ], { x: 0.87, y: 5.95, w: 11.6, h: 0.5, fontFace: BF, fontSize: 14, margin: 0 });
  s.addNotes("สวัสดีครับอาจารย์ วันนี้ผมจะนำเสนอโปรเจกต์ Green Area Analysis Thailand ซึ่งเป็นแดชบอร์ดวิเคราะห์พื้นที่สีเขียวของประเทศไทยจากภาพถ่ายดาวเทียม ตลอดการนำเสนอจะแบ่งเป็น 5 ช่วง คือ ที่มาและวัตถุประสงค์ ระบบและข้อมูล ระเบียบวิธี การสาธิตการใช้งานจริง และสรุปผลกับงานต่อยอดครับ");
}

// ============ 2. AGENDA ============
{
  const s = pres.addSlide();
  lightHeader(s, "หัวข้อการนำเสนอ", "ลำดับเนื้อหา");
  const items = [
    ["01", "ที่มาและความสำคัญ", "ปัญหาพื้นที่สีเขียว · ความเหลื่อมล้ำ · เกาะความร้อน"],
    ["02", "วัตถุประสงค์และขอบเขต", "เป้าหมาย 4 ข้อ · พื้นที่ครอบคลุมทั้งประเทศ"],
    ["03", "สถาปัตยกรรม & ข้อมูล", "Frontend · Backend · GEE · Supabase · 6 ชุดข้อมูล"],
    ["04", "ระเบียบวิธี", "NDVI · LST · มาตรฐาน WHO · Priority Score"],
    ["05", "สาธิตการใช้งานจริง", "ภาพจากระบบจริง ตั้งแต่เลือกพื้นที่ถึงรายงาน PDF"],
    ["06", "ผล · ข้อจำกัด · งานต่อยอด", "ผลกระทบเชิงปริมาณ · คุณภาพซอฟต์แวร์ · อนาคต"],
  ];
  const cw = 5.8, ch = 1.35, gx = 0.7, gy = 1.85, gapx = 0.5, gapy = 0.3;
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gapx), y = gy + row * (ch + gapy);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addText(it[0], { x: x + 0.25, y: y + 0.2, w: 1.1, h: ch - 0.4, fontFace: HF, fontSize: 30, bold: true, color: PALE, valign: "middle", margin: 0 });
    s.addText(it[1], { x: x + 1.4, y: y + 0.22, w: cw - 1.6, h: 0.5, fontFace: HF, fontSize: 16, bold: true, color: FOREST2, margin: 0 });
    s.addText(it[2], { x: x + 1.4, y: y + 0.7, w: cw - 1.6, h: 0.5, fontFace: BF, fontSize: 12, color: MUTE, margin: 0, lineSpacing: 16 });
  });
  footer(s);
  s.addNotes("ภาพรวมการนำเสนอแบ่งเป็น 6 ส่วนตามนี้ครับ เริ่มจากที่มาของปัญหา ไปจนถึงผลลัพธ์และงานต่อยอด");
}

// ============ 3. PROBLEM (cards) ============
{
  const s = pres.addSlide();
  lightHeader(s, "ที่มาและความสำคัญ", "ทำไมต้องวิเคราะห์พื้นที่สีเขียว");
  const cards = [
    ["ความเหลื่อมล้ำเชิงพื้นที่", "พื้นที่สีเขียวต่อหัวระหว่างจังหวัดต่างกันมากกว่า 500 เท่า — จากกว่า 44,000 ลงมาเหลือหลักสิบ ตร.ม./คนในเขตเมือง"],
    ["เกาะความร้อนเมือง", "พื้นที่เมืองที่ขาดต้นไม้มีอุณหภูมิพื้นผิว (LST) สูงกว่าพื้นที่โดยรอบ ส่งผลต่อสุขภาพและการใช้พลังงาน"],
    ["ข้อมูลเข้าถึงยาก", "ข้อมูลดาวเทียมมีอยู่จริงแต่ต้องใช้ความรู้เฉพาะทางในการดึงและตีความ ผู้กำหนดนโยบายเข้าถึงได้ยาก"],
    ["ตัดสินใจปลูกแบบไร้ข้อมูล", "การเลือกพื้นที่ปลูกต้นไม้ส่วนใหญ่ยังไม่ได้อิงหลักฐานเชิงพื้นที่ที่เป็นระบบและวัดผลได้"],
  ];
  const cw = 5.75, ch = 2.05, gx = 0.7, gy = 1.9, gapx = 0.5, gapy = 0.4;
  cards.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gapx), y = gy + row * (ch + gapy);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.1, h: ch, fill: { color: MOSS }, line: { type: "none" } });
    s.addText(c[0], { x: x + 0.35, y: y + 0.25, w: cw - 0.6, h: 0.5, fontFace: HF, fontSize: 18, bold: true, color: FOREST2, margin: 0 });
    s.addText(c[1], { x: x + 0.35, y: y + 0.82, w: cw - 0.6, h: 1.1, fontFace: BF, fontSize: 13.5, color: INK, lineSpacing: 20, margin: 0, valign: "top" });
  });
  footer(s);
  s.addNotes("ปัญหาหลักมี 4 เรื่อง ที่สำคัญที่สุดคือความเหลื่อมล้ำเชิงพื้นที่ ข้อมูลจริงจากระบบพบว่าพื้นที่สีเขียวต่อหัวระหว่างจังหวัดต่างกันมากกว่า 500 เท่า รวมถึงปัญหาเกาะความร้อน ข้อมูลเข้าถึงยาก และการตัดสินใจปลูกที่ยังไม่อิงข้อมูลครับ");
}

// ============ 4. PROBLEM IN NUMBERS ============
{
  const s = pres.addSlide();
  lightHeader(s, "ปัญหาเชิงตัวเลข", "ความเหลื่อมล้ำที่วัดได้จริง");
  const stats = [
    ["44,561", "ตร.ม./คน", "แม่ฮ่องสอน — สูงสุดของประเทศ", MINT],
    ["86.9", "ตร.ม./คน", "กรุงเทพมหานคร — ต่ำสุดของประเทศ", "C99A2E"],
    [">500×", "เท่า", "ช่องว่างระหว่างจังหวัดสูง-ต่ำ", FOREST2],
  ];
  const cw = 3.85, gap = 0.35, sx = 0.7, y = 2.0, ch = 2.5;
  stats.forEach((st, i) => {
    const x = sx + i * (cw + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addText(st[0], { x, y: y + 0.35, w: cw, h: 1.0, fontFace: HF, fontSize: 44, bold: true, color: st[3], align: "center", margin: 0 });
    s.addText(st[1], { x, y: y + 1.3, w: cw, h: 0.4, fontFace: HF, fontSize: 15, bold: true, color: MUTE, align: "center", margin: 0 });
    s.addText(st[2], { x: x + 0.2, y: y + 1.75, w: cw - 0.4, h: 0.6, fontFace: BF, fontSize: 12.5, color: INK, align: "center", margin: 0, lineSpacing: 17 });
  });
  s.addText([
    { text: "ข้อสังเกตเชิงระเบียบวิธี:  ", options: { bold: true, color: FOREST2 } },
    { text: "ที่ระดับ “ทั้งจังหวัด” แทบทุกจังหวัดผ่านเกณฑ์ WHO เพราะรวมพื้นที่ชนบท — ปัญหาที่แท้จริงจึงซ่อนอยู่ในเขตเมือง ระบบจึงมีโหมด Urban-subset เพื่อแยกวิเคราะห์เฉพาะพื้นที่เมืองโดยเฉพาะ", options: { color: INK } },
  ], { x: 0.7, y: 5.05, w: 11.9, h: 1.4, fontFace: BF, fontSize: 14, lineSpacing: 22, valign: "top", margin: 0 });
  footer(s);
  s.addNotes("ตัวเลขจริงจากระบบ: จังหวัดที่เขียวที่สุดคือแม่ฮ่องสอนกว่า 44,000 ตร.ม.ต่อคน ขณะที่กรุงเทพต่ำสุดเพียง 86.9 ต่างกันกว่า 500 เท่า ประเด็นสำคัญที่ผมอยากเน้นคือ ถ้าดูที่ระดับทั้งจังหวัดแทบทุกจังหวัดจะผ่านเกณฑ์ WHO เพราะรวมพื้นที่ป่าชนบทเข้าไปด้วย ปัญหาจริงจึงอยู่ที่เขตเมือง ระบบของผมจึงมีโหมด urban-subset แยกวิเคราะห์เฉพาะเมืองครับ");
}

// ============ 5. OBJECTIVES ============
{
  const s = pres.addSlide();
  lightHeader(s, "วัตถุประสงค์และขอบเขต", "เป้าหมายที่ต้องการบรรลุ");
  const objs = [
    ["01", "แปลงข้อมูลดาวเทียมให้เข้าใจง่าย", "ดึง NDVI และ LST จาก Google Earth Engine แสดงบนแผนที่ 3 มิติแบบโต้ตอบ"],
    ["02", "ประเมินเทียบมาตรฐาน WHO", "คำนวณพื้นที่สีเขียวต่อหัวประชากร เทียบเกณฑ์ 9 ตร.ม./คน ทั้งระดับจังหวัดและอำเภอ"],
    ["03", "ชี้จุดที่ควรปลูกด้วย AI", "ให้คะแนน Priority รายพิกัด จัด Top 10 พร้อมประเมินจำนวนต้นไม้และ CO₂"],
    ["04", "แนะนำพันธุ์ไม้ + ออกรายงาน", "เสนอชนิดพันธุ์ตามภูมิภาค พร้อมส่งออกรายงาน PDF สำหรับนำไปใช้จริง"],
  ];
  const y0 = 1.85, rh = 1.15;
  objs.forEach((o, i) => {
    const y = y0 + i * rh;
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y + 0.05, w: 0.82, h: 0.82, fill: { color: FOREST2 }, line: { type: "none" } });
    s.addText(o[0], { x: 0.7, y: y + 0.05, w: 0.82, h: 0.82, fontFace: HF, fontSize: 19, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(o[1], { x: 1.75, y: y + 0.04, w: 10.8, h: 0.5, fontFace: HF, fontSize: 18, bold: true, color: FOREST2, margin: 0 });
    s.addText(o[2], { x: 1.75, y: y + 0.5, w: 10.8, h: 0.5, fontFace: BF, fontSize: 13.5, color: INK, margin: 0, lineSpacing: 18 });
  });
  footer(s);
  s.addNotes("วัตถุประสงค์ 4 ข้อ: แปลงข้อมูลดาวเทียมให้เข้าใจง่าย ประเมินเทียบ WHO ใช้ AI ชี้จุดที่ควรปลูก และแนะนำพันธุ์ไม้พร้อมออกรายงาน ขอบเขตครอบคลุม 77 จังหวัดและเจาะลึกถึงระดับอำเภอครับ");
}

// ============ 6. ARCHITECTURE ============
{
  const s = pres.addSlide();
  lightHeader(s, "สถาปัตยกรรมระบบ", "ภาพรวมการทำงาน");
  const boxes = [
    ["Frontend", "React 19 + DeckGL\nMapLibre GL · jsPDF", MINT],
    ["Backend", "FastAPI (uvicorn)\nPython · earthengine-api", FOREST2],
    ["Google Earth Engine", "ภาพถ่ายดาวเทียม\nNDVI · LST", MOSS],
  ];
  const bw = 3.3, bh = 1.7, y = 2.3, startx = 0.9, gap = 1.45;
  boxes.forEach((b, i) => {
    const x = startx + i * (bw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: bw, h: bh, fill: { color: b[2] }, line: { type: "none" }, rectRadius: 0.12, shadow: shadow() });
    s.addText(b[0], { x: x + 0.2, y: y + 0.26, w: bw - 0.4, h: 0.5, fontFace: HF, fontSize: 18, bold: true, color: WHITE, align: "center", margin: 0 });
    s.addText(b[1], { x: x + 0.2, y: y + 0.82, w: bw - 0.4, h: 0.7, fontFace: BF, fontSize: 12.5, color: "F0F5EC", align: "center", margin: 0, lineSpacing: 17 });
    if (i < 2) s.addText("⇄", { x: x + bw + 0.2, y: y + 0.4, w: gap - 0.4, h: bh - 0.8, fontFace: HF, fontSize: 28, bold: true, color: MUTE, align: "center", valign: "middle", margin: 0 });
  });
  const cx = startx + (bw + gap);
  s.addShape(pres.shapes.LINE, { x: cx + bw / 2, y: y + bh, w: 0, h: 0.5, line: { color: MUTE, width: 1.5, dashType: "dash" } });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx - 0.3, y: y + bh + 0.5, w: bw + 0.6, h: 0.9, fill: { color: WHITE }, line: { color: MOSS, width: 1.5 }, rectRadius: 0.1 });
  s.addText("Supabase (PostgreSQL + Storage)", { x: cx - 0.3, y: y + bh + 0.56, w: bw + 0.6, h: 0.4, fontFace: HF, fontSize: 14, bold: true, color: FOREST2, align: "center", margin: 0 });
  s.addText("Cache 11 ตาราง · ลดการประมวลผล GEE ซ้ำซ้อน", { x: cx - 0.3, y: y + bh + 0.93, w: bw + 0.6, h: 0.4, fontFace: BF, fontSize: 11.5, color: MUTE, align: "center", margin: 0 });
  s.addText([
    { text: "เหตุผลของแคช:  ", options: { bold: true, color: FOREST2 } },
    { text: "การประมวลผลภาพดาวเทียมบน GEE ใช้เวลาและมีโควตา ระบบจึงเก็บผลที่คำนวณแล้วลง Supabase — การเรียกซ้ำจึงตอบกลับทันที (ปัจจุบันมีในแคชแล้ว 104 ระเบียบรายปี + 61 รายเดือน ครอบคลุม 77 จังหวัด)", options: { color: INK } },
  ], { x: 0.7, y: 5.95, w: 11.9, h: 1.1, fontFace: BF, fontSize: 13.5, lineSpacing: 20, valign: "top", margin: 0 });
  footer(s);
  s.addNotes("ระบบมี 3 ส่วนหลัก React ฝั่งหน้าเว็บ FastAPI ฝั่งเซิร์ฟเวอร์ และ Google Earth Engine เป็นแหล่งประมวลผลภาพ จุดสำคัญทางวิศวกรรมคือชั้นแคช Supabase เพราะการประมวลผล GEE ช้าและมีโควตา การเก็บผลไว้ทำให้เรียกซ้ำได้ทันที ปัจจุบันมีข้อมูลในแคชแล้ว 104 ระเบียนรายปีครับ");
}

// ============ 7. DATASETS ============
{
  const s = pres.addSlide();
  lightHeader(s, "แหล่งข้อมูล", "ชุดข้อมูลดาวเทียมและอ้างอิง");
  const rows = [
    ["ดัชนีพืชพรรณ NDVI", "Sentinel-2 (ESA Copernicus)", "10 ม. · composite รายปี/เดือน"],
    ["อุณหภูมิพื้นผิว LST", "Landsat 8/9 (USGS/NASA)", "thermal band · รายปี/เดือน"],
    ["ประเภทพื้นที่ปกคลุม", "ESA WorldCover v200", "แยกพื้นที่เมือง/พืชพรรณ"],
    ["ความหนาแน่นประชากร", "WorldPop", "100 ม. · คำนวณต่อหัว"],
    ["ขอบเขตการปกครอง", "GADM 4.1", "77 จังหวัด · 928 อำเภอ"],
    ["แผนที่ฐาน", "CARTO + OpenStreetMap", "© OSM (ODbL)"],
  ];
  const head = [{ text: "ตัวแปร", options: { bold: true, color: WHITE, fill: { color: FOREST2 } } }, { text: "แหล่งข้อมูล", options: { bold: true, color: WHITE, fill: { color: FOREST2 } } }, { text: "ความละเอียด / หมายเหตุ", options: { bold: true, color: WHITE, fill: { color: FOREST2 } } }];
  const body = rows.map((r, i) => r.map((c) => ({ text: c, options: { color: INK, fill: { color: i % 2 ? PALE : WHITE } } })));
  s.addTable([head, ...body], { x: 0.7, y: 1.95, w: 11.9, colW: [3.6, 4.5, 3.8], rowH: 0.62, fontFace: BF, fontSize: 14, valign: "middle", border: { type: "solid", pt: 0.5, color: "D5DECF" }, margin: [2, 6, 2, 6] });
  s.addText("ทุกชุดข้อมูลเป็นแหล่งเปิด (open data) ที่ใช้ในงานวิชาการ · แต่ละชุดมี license ของตัวเอง — Sentinel-2 / Landsat สาธารณะ · WorldCover & WorldPop เป็น CC BY 4.0", { x: 0.7, y: 6.0, w: 11.9, h: 0.6, fontFace: BF, fontSize: 12, italic: true, color: MUTE, margin: 0, lineSpacing: 17 });
  footer(s);
  s.addNotes("ข้อมูลทั้งหมดมาจากแหล่งเปิดที่ใช้ได้ในงานวิชาการ NDVI จาก Sentinel-2 ความละเอียด 10 เมตร LST จาก Landsat 8/9 พื้นที่ปกคลุมจาก ESA WorldCover ประชากรจาก WorldPop และขอบเขตการปกครองจาก GADM ซึ่งให้ครบ 928 อำเภอครับ");
}

// ============ 8. METHODOLOGY: NDVI ============
{
  const s = pres.addSlide();
  lightHeader(s, "ระเบียบวิธี · 1/4", "ดัชนีพืชพรรณ NDVI");
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 1.95, w: 11.9, h: 1.05, fill: { color: FOREST }, line: { type: "none" }, rectRadius: 0.08 });
  s.addText("NDVI  =  ( NIR − Red ) / ( NIR + Red )", { x: 0.7, y: 1.95, w: 11.9, h: 1.05, fontFace: "Consolas", fontSize: 24, bold: true, color: MINT, align: "center", valign: "middle", margin: 0 });
  bullets(s, [
    "วัดความเขียวของพืชพรรณจากการสะท้อนแสงช่วง near-infrared เทียบกับ red — ค่าอยู่ในช่วง −1 ถึง 1",
    "ทำ cloud mask กรองเมฆออกก่อน แล้วสร้าง median composite ทั้งปีเพื่อลด noise",
    "เกณฑ์ในระบบ: NDVI > 0.3 = นับเป็น “พื้นที่สีเขียว” · ≥ 0.6 = พืชพรรณหนาแน่นมาก",
    "ตัวอย่าง จ.ตาก: ค่าเฉลี่ย 0.6115 · พื้นที่สีเขียว 96% (16,520 จาก 17,268 ตร.กม.)",
  ], { x: 0.72, y: 3.3, w: 11.9, h: 3.2, fs: 15, ls: 22, gap: 16 });
  footer(s);
  s.addNotes("NDVI คือดัชนีพืชพรรณ คำนวณจากการสะท้อนแสง near-infrared เทียบกับ red พืชที่สมบูรณ์จะสะท้อน NIR สูง ค่าอยู่ระหว่างลบหนึ่งถึงหนึ่ง ระบบทำ cloud mask กรองเมฆก่อนแล้วทำ median composite ทั้งปี เกณฑ์ที่ใช้คือมากกว่า 0.3 ถือเป็นพื้นที่สีเขียว ตัวอย่างตากได้ค่าเฉลี่ย 0.61 พื้นที่สีเขียว 96 เปอร์เซ็นต์ครับ");
}

// ============ 9. METHODOLOGY: LST ============
{
  const s = pres.addSlide();
  lightHeader(s, "ระเบียบวิธี · 2/4", "อุณหภูมิพื้นผิว & เกาะความร้อน");
  bullets(s, [
    "LST (Land Surface Temperature) — อุณหภูมิพื้นผิวจาก thermal band ของ Landsat 8/9",
    "ต่างจากอุณหภูมิอากาศ: พื้นผิวจริงร้อนกว่าอากาศราว 5–20°C โดยเฉพาะผิวคอนกรีต/ถนน",
    "Urban Heat Island: นำ NDVI ต่ำ + LST สูง มาประเมินระดับความเสี่ยงเกาะความร้อนเมือง",
    "ตัวอย่าง จ.ตาก: LST เฉลี่ย 31.18°C · ต่ำสุด 15.32°C · สูงสุด 48.59°C",
  ], { x: 0.72, y: 2.0, w: 7.2, h: 4.4, fs: 15, ls: 22, gap: 18 });
  // mini scale on right
  const bx = 8.3, bw = 4.3, by = 2.1;
  s.addShape(pres.shapes.RECTANGLE, { x: bx, y: by, w: bw, h: 4.2, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
  s.addText("ระดับความเสี่ยงเกาะความร้อน", { x: bx + 0.3, y: by + 0.25, w: bw - 0.6, h: 0.4, fontFace: HF, fontSize: 14, bold: true, color: FOREST2, margin: 0 });
  const lv = [["เสี่ยงต่ำ", "NDVI สูง · LST ต่ำ", MINT], ["เสี่ยงปานกลาง", "ค่ากลาง", "E0A84E"], ["เสี่ยงสูง", "NDVI ต่ำ · LST สูง", "D9534F"]];
  lv.forEach((l, i) => {
    const y = by + 0.95 + i * 1.0;
    s.addShape(pres.shapes.RECTANGLE, { x: bx + 0.3, y, w: 0.5, h: 0.5, fill: { color: l[2] }, line: { type: "none" } });
    s.addText(l[0], { x: bx + 0.95, y: y - 0.02, w: bw - 1.2, h: 0.35, fontFace: HF, fontSize: 14, bold: true, color: INK, margin: 0 });
    s.addText(l[1], { x: bx + 0.95, y: y + 0.28, w: bw - 1.2, h: 0.3, fontFace: BF, fontSize: 11.5, color: MUTE, margin: 0 });
  });
  footer(s);
  s.addNotes("LST คืออุณหภูมิพื้นผิวจากแถบความร้อนของ Landsat ต่างจากอุณหภูมิอากาศตรงที่พื้นผิวจริงเช่นคอนกรีตจะร้อนกว่าอากาศ 5 ถึง 20 องศา ระบบนำ NDVI ต่ำมาประกบกับ LST สูงเพื่อประเมินความเสี่ยงเกาะความร้อน 3 ระดับ ตัวอย่างตากเฉลี่ย 31 องศา จุดร้อนสุดเกือบ 49 องศาครับ");
}

// ============ 10. METHODOLOGY: WHO ============
{
  const s = pres.addSlide();
  lightHeader(s, "ระเบียบวิธี · 3/4", "มาตรฐานพื้นที่สีเขียวต่อหัว (WHO)");
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 1.95, w: 11.9, h: 1.0, fill: { color: FOREST }, line: { type: "none" }, rectRadius: 0.08 });
  s.addText("พื้นที่สีเขียวต่อหัว  =  พื้นที่สีเขียว (ตร.ม.)  ÷  จำนวนประชากร   →   เทียบเกณฑ์ ≥ 9 ตร.ม./คน", { x: 0.7, y: 1.95, w: 11.9, h: 1.0, fontFace: BF, fontSize: 16, bold: true, color: MINT, align: "center", valign: "middle", margin: 0 });
  bullets(s, [
    "พื้นที่สีเขียว = พื้นที่ที่ NDVI > 0.3 · ประชากรนับจาก WorldPop ในขอบเขตเดียวกัน",
    "เกณฑ์ขั้นต่ำขององค์การอนามัยโลก (WHO): 9 ตร.ม. ต่อคน",
    "ระบบแสดงสถานะ ✅ ผ่าน / ❌ ไม่ผ่าน อัตโนมัติ ทั้งระดับจังหวัดและอำเภอ",
    "ตัวอย่าง จ.ตาก: 28,831 ตร.ม./คน → ผ่านเกณฑ์ (เกินมาตรฐานมาก เพราะรวมพื้นที่ป่า)",
  ], { x: 0.72, y: 3.25, w: 11.9, h: 3.2, fs: 15, ls: 22, gap: 16 });
  footer(s);
  s.addNotes("การประเมินมาตรฐาน WHO ทำโดยเอาพื้นที่สีเขียวคือพื้นที่ที่ NDVI เกิน 0.3 มาหารด้วยจำนวนประชากรจาก WorldPop เทียบกับเกณฑ์ขั้นต่ำ 9 ตารางเมตรต่อคน ระบบแสดงสถานะผ่านหรือไม่ผ่านอัตโนมัติ ตากได้สูงมากเพราะมีพื้นที่ป่าเยอะ ซึ่งย้ำว่าควรดูระดับเมืองด้วยครับ");
}

// ============ 11. METHODOLOGY: PRIORITY ============
{
  const s = pres.addSlide();
  lightHeader(s, "ระเบียบวิธี · 4/4", "คะแนน Priority สำหรับ AI แนะนำ");
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 1.9, w: 11.9, h: 1.0, fill: { color: FOREST }, line: { type: "none" }, rectRadius: 0.08 });
  s.addText("Score  =  0.40 · (1 − NDVI′)   +   0.30 · LST′   +   0.30 · Population′", { x: 0.7, y: 1.9, w: 11.9, h: 1.0, fontFace: "Consolas", fontSize: 19, bold: true, color: MINT, align: "center", valign: "middle", margin: 0 });
  s.addText("(′ = ค่าที่ normalize ให้อยู่ในช่วง 0–1 · คะแนนยิ่งสูง = ยิ่งควรปลูกก่อน)", { x: 0.7, y: 2.95, w: 11.9, h: 0.35, fontFace: BF, fontSize: 12, italic: true, color: MUTE, align: "center", margin: 0 });
  const f = [["NDVI ต่ำ", "40%", "พื้นที่ที่ขาดต้นไม้", MINT], ["LST สูง", "30%", "พื้นที่ที่ร้อน", "E0A84E"], ["ประชากรหนาแน่น", "30%", "คนได้ประโยชน์มาก", FOREST2]];
  const cw = 3.8, gap = 0.35, sx = 0.7, y = 3.55, ch = 1.8;
  f.forEach((it, i) => {
    const x = sx + i * (cw + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: 0.12, fill: { color: it[3] }, line: { type: "none" } });
    s.addText(it[1], { x, y: y + 0.3, w: cw, h: 0.7, fontFace: HF, fontSize: 34, bold: true, color: it[3], align: "center", margin: 0 });
    s.addText(it[0], { x, y: y + 1.05, w: cw, h: 0.35, fontFace: HF, fontSize: 16, bold: true, color: INK, align: "center", margin: 0 });
    s.addText(it[2], { x, y: y + 1.4, w: cw, h: 0.3, fontFace: BF, fontSize: 12, color: MUTE, align: "center", margin: 0 });
  });
  s.addText("คำนวณรายพิกัดทั่วทั้งจังหวัด → จัดอันดับ Top 10 → ประเมินจำนวนต้นไม้และ CO₂ ที่ดูดซับได้", { x: 0.7, y: 5.6, w: 11.9, h: 0.5, fontFace: BF, fontSize: 14, color: FOREST2, bold: true, align: "center", margin: 0 });
  footer(s);
  s.addNotes("หัวใจของระบบคือคะแนน Priority คำนวณรายพิกัดจาก 3 ปัจจัยถ่วงน้ำหนัก: พื้นที่ที่เขียวน้อยให้น้ำหนัก 40% ร้อน 30% และคนเยอะ 30% ทุกค่าถูก normalize ให้อยู่ในช่วง 0 ถึง 1 คะแนนยิ่งสูงยิ่งควรปลูกก่อน แล้วระบบจัดอันดับ Top 10 พร้อมประเมินผลกระทบครับ");
}

// ===== DEMO helper =====
function demoSlide(eyebrow, title, items, img, ratio, note) {
  const s = pres.addSlide();
  s.background = { color: CREAM };
  s.addText(eyebrow.toUpperCase(), { x: 0.7, y: 0.5, w: 5.2, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText(title, { x: 0.7, y: 0.85, w: 5.4, h: 1.1, fontFace: HF, fontSize: 25, bold: true, color: FOREST2, margin: 0, lineSpacing: 29 });
  bullets(s, items, { x: 0.72, y: 2.2, w: 5.25, h: 4.4, fs: 14.5, ls: 21, gap: 14 });
  const ax = 6.35, maxW = 6.45, maxH = 5.9, ay0 = 0.7;
  let iw = maxW, ih = iw / ratio;
  if (ih > maxH) { ih = maxH; iw = ih * ratio; }
  const ix = ax + (maxW - iw) / 2, iy = ay0 + (maxH - ih) / 2 + 0.2;
  s.addShape(pres.shapes.RECTANGLE, { x: ix - 0.08, y: iy - 0.08, w: iw + 0.16, h: ih + 0.16, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
  s.addImage({ path: img, x: ix, y: iy, w: iw, h: ih });
  footer(s);
  s.addNotes(note);
}

// 12. country
demoSlide("สาธิต · ขั้นที่ 1", "เลือกพื้นที่บนแผนที่ 3 มิติ",
  ["เปิดแผนที่ประเทศไทยทั้งประเทศ — 77 จังหวัดแสดงเป็น 3 มิติยกตามค่า NDVI", "เลือกปีข้อมูล แล้วคลิกจังหวัดเพื่อเจาะลึก", "โหมด Time-lapse เลื่อนเปรียบเทียบหลายปี", "แผนที่ฐานจาก CARTO + OpenStreetMap"],
  LIVE("02_dashboard_country.png"), R_LIVE,
  "หน้าจอแรกแสดงแผนที่ประเทศไทยทั้งประเทศ แต่ละจังหวัดยกความสูงเป็น 3 มิติตามค่าความเขียว ผู้ใช้เลือกปีแล้วคลิกจังหวัดเพื่อดูข้อมูลเชิงลึก และมีโหมด Time-lapse เปรียบเทียบข้ามปีครับ");
// 13. ndvi
demoSlide("สาธิต · ขั้นที่ 2", "วิเคราะห์ดัชนีพืชพรรณ (NDVI)",
  ["ค่า NDVI เฉลี่ยทั้งปี พร้อม min–max", "% พื้นที่สีเขียว (NDVI > 0.3) ของจังหวัด", "พื้นที่สีเขียวต่อหัว เทียบเกณฑ์ WHO", "กราฟรายเดือน + แผนที่ 3 มิติยกตามค่าพืชพรรณ"],
  LIVE("03_tak_ndvi.png"), R_LIVE,
  "เมื่อเลือกตาก ระบบแสดง NDVI เฉลี่ย 0.61 พื้นที่สีเขียว 96% พร้อมพื้นที่ต่อหัวเทียบ WHO และกราฟรายเดือน ด้านขวาเป็นแผนที่ 3 มิติ ภาพนี้แคปจากระบบจริงครับ");
// 14. lst
demoSlide("สาธิต · ขั้นที่ 3", "อุณหภูมิพื้นผิว & เกาะความร้อน",
  ["LST เฉลี่ย พร้อม min–max และกราฟรายเดือน", "ประเมินสถานะ Green Deficit เทียบ WHO", "ประเมินความเสี่ยง Urban Heat Island", "ส่งออก CSV · PNG · PDF · PNG+แผนที่"],
  LIVE("05_tak_lst.png"), R_LIVE,
  "เลื่อนแผงลงมาเป็นส่วนอุณหภูมิพื้นผิว แสดง LST 31 องศา สถานะเทียบ WHO และระดับความเสี่ยงเกาะความร้อน ตากอยู่ระดับเสี่ยงต่ำ พร้อมปุ่มส่งออกข้อมูลหลายรูปแบบครับ");
// 15. ai priority
demoSlide("สาธิต · ขั้นที่ 4", "AI แนะนำจุดที่ควรปลูก",
  ["Priority Score รายพิกัดทั่วทั้งจังหวัด", "ปรับน้ำหนัก NDVI / LST / ประชากร ได้เอง", "Top 10 จุด คลิกเปิด Google Maps", "ประเมินจำนวนต้นไม้และ CO₂ ที่ดูดซับ/ปี"],
  LIVE("06_tak_ai_priority.png"), R_LIVE,
  "แท็บ AI แนะนำให้คะแนน Priority ทุกพิกัด ผู้ใช้ปรับน้ำหนักได้เอง ระบบจัด Top 10 จุดพร้อมพิกัด คลิกเปิด Google Maps ได้ทันที ภาพนี้คำนวณสดผ่าน GEE จริงครับ");
// 16. species
demoSlide("สาธิต · ขั้นที่ 5", "แนะนำพันธุ์ไม้ที่เหมาะสม",
  ["เสนอชนิดพันธุ์ตามภูมิภาคของพื้นที่", "ชื่อไทย–วิทยาศาสตร์ · ความสูง · คุณสมบัติ", "ครอบคลุมไม้เศรษฐกิจ ปรับปรุงดิน และอนุรักษ์", "เช่น ประดู่ป่า · พะยูง · ตะแบกนา · กระถินณรงค์"],
  LIVE("07_tak_ai_species.png"), R_LIVE,
  "นอกจากบอกว่าปลูกที่ไหน ระบบยังแนะนำว่าปลูกอะไร โดยเสนอพันธุ์ไม้ตามภูมิภาค พร้อมชื่อวิทยาศาสตร์ ความสูง และคุณสมบัติ ครอบคลุมทั้งไม้เศรษฐกิจและไม้อนุรักษ์ครับ");
// 17. district
demoSlide("สาธิต · ขั้นที่ 6", "เจาะลึกระดับอำเภอ",
  ["คลิกเจาะจากจังหวัดลงถึงอำเภอ (รวม 928 อำเภอ)", "คำนวณ NDVI / LST เฉพาะอำเภอ ความละเอียดสูงขึ้น", "อำเภอที่เลือกไฮไลต์สีน้ำเงิน", "ตัวอย่าง อ.แม่สอด: NDVI 0.5359 · 85.9% เขียว"],
  LIVE("08_tak_district.png"), R_LIVE,
  "ระบบเจาะลึกถึงระดับอำเภอได้ครบ 928 อำเภอ ตัวอย่างอำเภอแม่สอดไฮไลต์สีน้ำเงิน คำนวณ NDVI เฉพาะอำเภอได้ 0.5359 ทำให้เห็นความแตกต่างภายในจังหวัดเดียวกันครับ");

// ============ 18. ADDITIONAL CAPABILITIES ============
{
  const s = pres.addSlide();
  lightHeader(s, "ความสามารถเพิ่มเติม", "เครื่องมือวิเคราะห์เชิงลึก");
  const caps = [
    ["แนวโน้ม + พยากรณ์", "ข้อมูลย้อนหลังหลายปี พร้อมพยากรณ์ 3 ปีด้วย OLS regression และช่วงเชื่อมั่น 95%"],
    ["เทียบภาพดาวเทียม", "เลื่อนเทียบ 2 ปีแบบ swipe หรือดูแผนที่ผลต่าง (Δ) ของ NDVI/LST"],
    ["วิเคราะห์ความเย็น", "ประเมินผลการลดอุณหภูมิจากพื้นที่สีเขียว (cooling effect)"],
    ["โหมด Urban-subset", "แยกวิเคราะห์เฉพาะพื้นที่เมือง เพื่อเจอปัญหาที่ซ่อนในระดับจังหวัด"],
  ];
  const cw = 5.75, ch = 2.05, gx = 0.7, gy = 1.9, gapx = 0.5, gapy = 0.4;
  caps.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gapx), y = gy + row * (ch + gapy);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addText("0" + (i + 1), { x: x + 0.3, y: y + 0.25, w: 1.2, h: 0.7, fontFace: HF, fontSize: 30, bold: true, color: PALE, margin: 0 });
    s.addText(c[0], { x: x + 0.35, y: y + 0.95, w: cw - 0.7, h: 0.45, fontFace: HF, fontSize: 17, bold: true, color: FOREST2, margin: 0 });
    s.addText(c[1], { x: x + 0.35, y: y + 1.4, w: cw - 0.7, h: 0.55, fontFace: BF, fontSize: 13, color: INK, lineSpacing: 18, margin: 0 });
  });
  footer(s);
  s.addNotes("นอกจากฟีเจอร์หลัก ระบบยังมีเครื่องมือเชิงลึก: การวิเคราะห์แนวโน้มย้อนหลังพร้อมพยากรณ์ 3 ปีด้วย OLS regression, การเทียบภาพดาวเทียมสองปีแบบ swipe และแผนที่ผลต่าง, การวิเคราะห์ผลความเย็น และโหมด urban-subset ครับ");
}

// ============ 19. REPORTS ============
{
  const s = pres.addSlide();
  s.background = { color: CREAM };
  s.addText("สาธิต · ขั้นที่ 7", { x: 0.7, y: 0.5, w: 12, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText("ออกรายงานสรุปผลเป็น PDF", { x: 0.7, y: 0.85, w: 12, h: 0.7, fontFace: HF, fontSize: 26, bold: true, color: FOREST2, margin: 0 });
  const imgs = [[SHOT("08_stats_report_cover.png"), "รายงานวิเคราะห์พื้นที่สีเขียว — NDVI · LST · เทียบ WHO"], [SHOT("10_recommend_report.png"), "รายงาน AI แนะนำการปลูก — Top 10 จุด + พันธุ์ไม้"]];
  const dh = 4.5, dw = dh * R_DOC, gap = 1.0, totalW = dw * 2 + gap, startx = (W - totalW) / 2, y = 1.75;
  imgs.forEach((it, i) => {
    const x = startx + i * (dw + gap);
    s.addShape(pres.shapes.RECTANGLE, { x: x - 0.06, y: y - 0.06, w: dw + 0.12, h: dh + 0.12, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addImage({ path: it[0], x, y, w: dw, h: dh });
    s.addText(it[1], { x: x - 0.3, y: y + dh + 0.18, w: dw + 0.6, h: 0.6, fontFace: BF, fontSize: 13, bold: true, color: INK, align: "center", margin: 0, lineSpacing: 18 });
  });
  footer(s);
  s.addNotes("ผู้ใช้กดออกรายงาน PDF ได้ 2 แบบ แบบแรกสรุปการวิเคราะห์พื้นที่สีเขียว NDVI LST และผล WHO พร้อมแผนที่ แบบที่สองเป็นรายงาน AI แนะนำการปลูกพร้อม Top 10 และพันธุ์ไม้ เหมาะกับนำไปเสนอหน่วยงานจริงครับ");
}

// ============ 20. IMPACT ============
{
  const s = pres.addSlide();
  s.background = { color: FOREST };
  s.addText("ผลกระทบเชิงปริมาณ", { x: 0.7, y: 0.65, w: 12, h: 0.45, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText("จากกรณีศึกษา จ.ตาก", { x: 0.7, y: 1.05, w: 12, h: 0.75, fontFace: HF, fontSize: 28, bold: true, color: WHITE, margin: 0 });
  const stats = [["1,606,694", "ต้นไม้", "ประเมินจำนวนต้นไม้รวมหากปลูกครบพื้นที่ priority สูง"], ["30,527", "ตัน CO₂ / ปี", "ปริมาณคาร์บอนที่คาดว่าจะถูกดูดซับต่อปี"], ["Top 10", "จุดเร่งด่วน", "พิกัดที่ควรปลูกก่อน คะแนน 0.47–0.53"]];
  const cw = 3.85, gap = 0.35, sx = 0.7, y = 2.2, ch = 2.6;
  stats.forEach((st, i) => {
    const x = sx + i * (cw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, fill: { color: FOREST2 }, line: { type: "none" }, rectRadius: 0.1 });
    s.addText(st[0], { x, y: y + 0.35, w: cw, h: 0.9, fontFace: HF, fontSize: 36, bold: true, color: MINT, align: "center", margin: 0 });
    s.addText(st[1], { x, y: y + 1.25, w: cw, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: WHITE, align: "center", margin: 0 });
    s.addText(st[2], { x: x + 0.2, y: y + 1.7, w: cw - 0.4, h: 0.8, fontFace: BF, fontSize: 12, color: "C9D6C0", align: "center", margin: 0, lineSpacing: 17 });
  });
  s.addText("ตัวเลขเหล่านี้คำนวณโดยระบบอัตโนมัติ ช่วยแปลงการวิเคราะห์ให้เป็นข้อเสนอเชิงนโยบายที่จับต้องและวัดผลได้", { x: 0.7, y: 5.4, w: 11.9, h: 0.8, fontFace: BF, fontSize: 15, italic: true, color: MOSS, align: "center", margin: 0 });
  footer(s, true);
  s.addNotes("ระบบไม่ได้หยุดที่การวิเคราะห์ แต่แปลงเป็นผลกระทบที่จับต้องได้ กรณีตาก ถ้าปลูกครบพื้นที่ priority สูง จะได้ต้นไม้ราว 1.6 ล้านต้น ดูดซับ CO2 ได้กว่า 30,000 ตันต่อปี ตัวเลขนี้ช่วยให้ผู้กำหนดนโยบายเห็นภาพและตัดสินใจได้ครับ");
}

// ============ 21. SOFTWARE QUALITY ============
{
  const s = pres.addSlide();
  lightHeader(s, "คุณภาพซอฟต์แวร์", "วิศวกรรมเบื้องหลังระบบ");
  const items = [
    ["122 test cases", "Backend 82 (pytest) + Frontend 40 (Jest) ทดสอบ helper, endpoint และ hooks"],
    ["CI อัตโนมัติ", "GitHub Actions รันชุดทดสอบทั้งหมดทุก push / PR"],
    ["ชั้นแคช 11 ตาราง", "ลดการเรียก GEE ซ้ำ — ตอบกลับเร็วและประหยัดโควตา"],
    ["ความปลอดภัย", "Rate-limit, CORS, security headers (CSP), ADMIN_TOKEN ป้องกัน endpoint ลบแคช"],
  ];
  const cw = 5.75, ch = 2.05, gx = 0.7, gy = 1.9, gapx = 0.5, gapy = 0.4;
  items.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gapx), y = gy + row * (ch + gapy);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.1, h: ch, fill: { color: MINT }, line: { type: "none" } });
    s.addText(c[0], { x: x + 0.35, y: y + 0.28, w: cw - 0.6, h: 0.5, fontFace: HF, fontSize: 18, bold: true, color: FOREST2, margin: 0 });
    s.addText(c[1], { x: x + 0.35, y: y + 0.88, w: cw - 0.6, h: 1.0, fontFace: BF, fontSize: 13.5, color: INK, lineSpacing: 20, margin: 0, valign: "top" });
  });
  footer(s);
  s.addNotes("โปรเจกต์ให้ความสำคัญกับคุณภาพซอฟต์แวร์ มีชุดทดสอบรวม 122 เคส รันอัตโนมัติผ่าน GitHub Actions ทุกครั้งที่แก้โค้ด มีชั้นแคช 11 ตารางเพื่อประสิทธิภาพ และมีมาตรการความปลอดภัยครบทั้ง rate-limit, CORS, security headers ครับ");
}

// ============ 22. RESULTS SUMMARY ============
{
  const s = pres.addSlide();
  s.background = { color: FOREST };
  s.addText("สรุปผล", { x: 0.7, y: 0.65, w: 12, h: 0.45, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText("ระบบที่ใช้งานได้จริงครบวงจร", { x: 0.7, y: 1.05, w: 12, h: 0.75, fontFace: HF, fontSize: 28, bold: true, color: WHITE, margin: 0 });
  const stats = [["77", "จังหวัด", "ครอบคลุมทั่วประเทศ"], ["928", "อำเภอ", "เจาะลึกรายอำเภอ"], ["3", "ปัจจัย AI", "NDVI · LST · ประชากร"], ["WHO", "มาตรฐาน", "ประเมินต่อหัว"]];
  const cw = 2.85, gap = 0.36, sx = 0.7, y = 2.25, ch = 2.5;
  stats.forEach((st, i) => {
    const x = sx + i * (cw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, fill: { color: FOREST2 }, line: { type: "none" }, rectRadius: 0.1 });
    s.addText(st[0], { x, y: y + 0.3, w: cw, h: 0.9, fontFace: HF, fontSize: 44, bold: true, color: MINT, align: "center", margin: 0 });
    s.addText(st[1], { x, y: y + 1.25, w: cw, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: WHITE, align: "center", margin: 0 });
    s.addText(st[2], { x: x + 0.15, y: y + 1.7, w: cw - 0.3, h: 0.6, fontFace: BF, fontSize: 12, color: "C9D6C0", align: "center", margin: 0, lineSpacing: 16 });
  });
  s.addText("เปลี่ยนข้อมูลดาวเทียมที่ซับซ้อน ให้เป็นเครื่องมือตัดสินใจเชิงผังเมืองที่ทุกคนเข้าถึงและใช้งานได้จริง", { x: 0.7, y: 5.35, w: 11.9, h: 0.8, fontFace: BF, fontSize: 15, italic: true, color: MOSS, align: "center", margin: 0 });
  footer(s, true);
  s.addNotes("สรุปแล้วผมได้ระบบที่ใช้งานได้จริงครบวงจร ครอบคลุม 77 จังหวัด 928 อำเภอ ใช้ AI 3 ปัจจัย และประเมินตามมาตรฐาน WHO เป้าหมายหลักคือเปลี่ยนข้อมูลดาวเทียมที่ซับซ้อนให้เป็นเครื่องมือตัดสินใจที่ทุกคนเข้าถึงได้ครับ");
}

// ============ 23. LIMITATIONS & FUTURE ============
{
  const s = pres.addSlide();
  lightHeader(s, "ข้อจำกัดและงานต่อยอด", "ความตรงไปตรงมาและทิศทางอนาคต");
  s.addText("ข้อจำกัดปัจจุบัน", { x: 0.7, y: 1.85, w: 5.7, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: "B5564E", margin: 0 });
  bullets(s, [
    "NDVI ระดับจังหวัดรวมพื้นที่ป่า ทำให้ค่าต่อหัวสูงเกินจริงในเชิงเมือง",
    "การประมวลผลจุดที่ยังไม่อยู่ในแคชต้องรอ GEE คำนวณสด",
    "พันธุ์ไม้แนะนำอิงภูมิภาคกว้าง ยังไม่ลงรายละเอียดดินรายแปลง",
  ], { x: 0.72, y: 2.3, w: 5.7, h: 3.5, fs: 13.5, ls: 20, gap: 14, color: INK });
  s.addText("ทิศทางต่อยอด", { x: 6.9, y: 1.85, w: 5.7, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: FOREST2, margin: 0 });
  bullets(s, [
    "เพิ่มข้อมูลย้อนหลังหลายปีและทำโมเดลทำนายการเติบโตของพื้นที่สีเขียว",
    "เชื่อมข้อมูลภาคสนาม/ผังเมืองเพื่อยืนยันผล",
    "ขยาย urban-subset ให้ครอบคลุมทุกเมืองหลักอัตโนมัติ",
    "เปิด API ให้หน่วยงานนำไปใช้ต่อ",
  ], { x: 6.92, y: 2.3, w: 5.7, h: 3.5, fs: 13.5, ls: 20, gap: 14, color: INK });
  footer(s);
  s.addNotes("ผมขอพูดถึงข้อจำกัดอย่างตรงไปตรงมา: ค่าระดับจังหวัดรวมพื้นที่ป่าทำให้ดูดีเกินจริงในเชิงเมือง จุดที่ยังไม่อยู่ในแคชต้องรอ GEE และพันธุ์ไม้ยังอิงภูมิภาคกว้าง ส่วนงานต่อยอดได้แก่ การพยากรณ์การเติบโต เชื่อมข้อมูลภาคสนาม ขยาย urban-subset และเปิด API ครับ");
}

// ============ 24. Q&A PREP (anticipated) ============
{
  const s = pres.addSlide();
  lightHeader(s, "เตรียมตอบคำถาม", "ประเด็นที่อาจถูกถาม");
  const qa = [
    ["ทำไม NDVI > 0.3 ถึงนับเป็นพื้นที่สีเขียว?", "เป็นเกณฑ์ที่ใช้กันทั่วไปในงานวิจัยรีโมตเซนซิ่ง แยกพืชพรรณออกจากดิน/น้ำ/สิ่งปลูกสร้างได้ดี"],
    ["น้ำหนัก 40/30/30 มาจากไหน?", "ให้ความสำคัญกับการเพิ่มพื้นที่สีเขียว (NDVI) มากที่สุด รองลงมาคือบรรเทาความร้อนและจำนวนผู้ได้ประโยชน์ — ปรับได้ในระบบ"],
    ["ข้อมูลแม่นยำแค่ไหน?", "ใช้ข้อมูลทางการระดับสากล (ESA/NASA) ความละเอียด 10–100 ม. และทำ cloud mask ลด noise"],
    ["ต่างจากดูแผนที่ Google ทั่วไปอย่างไร?", "ให้ตัวเลขเชิงปริมาณ เทียบมาตรฐาน WHO และจัดลำดับการปลูกด้วย AI ซึ่งแผนที่ทั่วไปทำไม่ได้"],
  ];
  const y0 = 1.85, rh = 1.18;
  qa.forEach((q, i) => {
    const y = y0 + i * rh;
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y + 0.05, w: 0.55, h: 0.55, fill: { color: FOREST2 }, line: { type: "none" } });
    s.addText("Q", { x: 0.7, y: y + 0.05, w: 0.55, h: 0.55, fontFace: HF, fontSize: 16, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(q[0], { x: 1.45, y: y + 0.02, w: 11.1, h: 0.45, fontFace: HF, fontSize: 15, bold: true, color: FOREST2, margin: 0 });
    s.addText(q[1], { x: 1.45, y: y + 0.47, w: 11.1, h: 0.6, fontFace: BF, fontSize: 12.5, color: INK, margin: 0, lineSpacing: 17 });
  });
  footer(s);
  s.addNotes("ผมเตรียมคำตอบสำหรับคำถามที่คาดว่าจะถูกถามไว้ 4 ข้อ เรื่องเกณฑ์ NDVI 0.3 ที่มาของน้ำหนัก 40/30/30 ความแม่นยำของข้อมูล และความต่างจากแผนที่ทั่วไปครับ");
}

// ============ 25. THANK YOU ============
{
  const s = pres.addSlide();
  s.background = { color: FOREST };
  diamond(s, (W - 0.6) / 2, 2.0, 0.6, MINT);
  s.addText("ขอบคุณครับ", { x: 0, y: 2.9, w: W, h: 1.0, fontFace: HF, fontSize: 44, bold: true, color: WHITE, align: "center", margin: 0 });
  s.addText("Green Area Analysis · Thailand — ยินดีรับคำถามและข้อเสนอแนะครับ", { x: 0, y: 3.95, w: W, h: 0.6, fontFace: BF, fontSize: 17, color: "C9D6C0", align: "center", margin: 0 });
  s.addText("Felsau   ·   github.com/Felsau/Project", { x: 0, y: 4.65, w: W, h: 0.5, fontFace: BF, fontSize: 14, color: MOSS, align: "center", margin: 0 });
  s.addNotes("ครบทุกส่วนแล้วครับ ขอบคุณอาจารย์ที่รับฟัง ยินดีรับคำถามและข้อเสนอแนะครับ");
}

pres.writeFile({ fileName: "C:/Users/ComSync/Desktop/Project/presentation/GreenArea_Presentation_detailed.pptx" }).then((fn) => console.log("WROTE: " + fn));
