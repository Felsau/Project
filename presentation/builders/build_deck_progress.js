const pptxgen = require("pptxgenjs");
const path = require("path");
const SHOT = (f) => path.join("C:", "Users", "ComSync", "Desktop", "Project", "presentation", "screenshots", f);
const LIVE = (f) => path.join("C:", "Users", "ComSync", "Desktop", "Project", "presentation", "screenshots_live", f);

const {
  FOREST, FOREST2, MOSS, MINT, CREAM, INK, MUTE, WHITE, PALE, HF, BF, W, H,
} = require("./_palette");
const AMBER = "C98A22", AMBERBG = "FBF1DC", DONEBG = "E4F0E2";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Felsau";
pres.title = "Green Area Analysis · Thailand — อัพเดตความคืบหน้า";
const R_LIVE = 1440 / 810, R_DOC = 1 / 1.414;
const shadow = () => ({ type: "outer", color: "000000", blur: 9, offset: 3, angle: 135, opacity: 0.2 });

const P_COL = { 1: "2C5F2D", 2: "1C7293", 3: "B5663A" };
function tag(s, p, dark) {
  const x = 11.15, y = 0.32, w = 1.85, h = 0.42;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: dark ? "16271B" : WHITE }, line: { color: P_COL[p], width: 1 }, rectRadius: 0.06 });
  s.addShape(pres.shapes.OVAL, { x: x + 0.18, y: y + 0.12, w: 0.18, h: 0.18, fill: { color: P_COL[p] }, line: { type: "none" } });
  s.addText("ผู้นำเสนอ " + p, { x: x + 0.42, y, w: w - 0.5, h, fontFace: HF, fontSize: 11, bold: true, color: dark ? WHITE : P_COL[p], valign: "middle", margin: 0 });
}
function lightHeader(s, eyebrow, title) {
  s.background = { color: CREAM };
  s.addText(eyebrow.toUpperCase(), { x: 0.7, y: 0.5, w: 9.8, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText(title, { x: 0.7, y: 0.85, w: 9.8, h: 0.8, fontFace: HF, fontSize: 29, bold: true, color: FOREST2, margin: 0 });
}
function bullets(s, arr, o) {
  s.addText(arr.map((b) => ({ text: b, options: { bullet: { code: "2022", indent: 18 }, breakLine: true, paraSpaceAfter: o.gap || 14, color: o.color || INK } })),
    { x: o.x, y: o.y, w: o.w, h: o.h, fontFace: BF, fontSize: o.fs || 15, lineSpacing: o.ls || 22, valign: "top", margin: 0 });
}
function diamond(s, x, y, sz, c) { s.addShape(pres.shapes.DIAMOND, { x, y, w: sz, h: sz, fill: { color: c }, line: { type: "none" } }); }
// status pill near title
function statusPill(s, kind) {
  const done = kind === "done";
  const txt = done ? "✓  เสร็จแล้ว ใช้งานได้" : "🔧  กำลังพัฒนา";
  const x = 6.2, y = 1.0, w = done ? 2.7 : 2.3, h = 0.45;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: done ? DONEBG : AMBERBG }, line: { type: "none" }, rectRadius: 0.1 });
  s.addText(txt, { x, y, w, h, fontFace: HF, fontSize: 12, bold: true, color: done ? FOREST2 : AMBER, align: "center", valign: "middle", margin: 0 });
}
// page-explainer demo slide: "หน้านี้คืออะไร"
function pageSlide(p, eyebrow, title, whatIs, canDo, img, ratio, status, note) {
  const s = pres.addSlide();
  s.background = { color: CREAM };
  tag(s, p);
  s.addText(eyebrow.toUpperCase(), { x: 0.7, y: 0.5, w: 5.3, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText(title, { x: 0.7, y: 0.85, w: 5.4, h: 1.0, fontFace: HF, fontSize: 24, bold: true, color: FOREST2, margin: 0, lineSpacing: 28 });
  // status pill bottom-left
  const done = status === "done";
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.72, y: 1.95, w: done ? 2.7 : 2.3, h: 0.42, fill: { color: done ? DONEBG : AMBERBG }, line: { type: "none" }, rectRadius: 0.1 });
  s.addText(done ? "✓  เสร็จแล้ว ใช้งานได้" : "🔧  กำลังพัฒนา", { x: 0.72, y: 1.95, w: done ? 2.7 : 2.3, h: 0.42, fontFace: HF, fontSize: 12, bold: true, color: done ? FOREST2 : AMBER, align: "center", valign: "middle", margin: 0 });
  s.addText("หน้านี้คืออะไร", { x: 0.72, y: 2.6, w: 5.25, h: 0.35, fontFace: HF, fontSize: 13, bold: true, color: MOSS, margin: 0 });
  s.addText(whatIs, { x: 0.72, y: 2.95, w: 5.25, h: 0.85, fontFace: BF, fontSize: 14, color: INK, lineSpacing: 20, margin: 0, valign: "top" });
  s.addText("ทำอะไรได้", { x: 0.72, y: 3.95, w: 5.25, h: 0.35, fontFace: HF, fontSize: 13, bold: true, color: MOSS, margin: 0 });
  bullets(s, canDo, { x: 0.74, y: 4.3, w: 5.25, h: 2.4, fs: 13.5, ls: 20, gap: 10 });
  // image
  const ax = 6.35, maxW = 6.45, maxH = 5.9, ay0 = 0.7;
  let iw = maxW, ih = iw / ratio;
  if (ih > maxH) { ih = maxH; iw = ih * ratio; }
  const ix = ax + (maxW - iw) / 2, iy = ay0 + (maxH - ih) / 2 + 0.25;
  s.addShape(pres.shapes.RECTANGLE, { x: ix - 0.08, y: iy - 0.08, w: iw + 0.16, h: ih + 0.16, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
  s.addImage({ path: img, x: ix, y: iy, w: iw, h: ih });
  s.addNotes(note);
  return s;
}

// ===== 1. TITLE =====
{
  const s = pres.addSlide();
  s.background = { color: FOREST };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 6.95, w: W, h: 0.55, fill: { color: FOREST2 }, line: { type: "none" } });
  tag(s, 1, true);
  diamond(s, 0.85, 1.55, 0.45, MINT);
  s.addText("GREEN AREA ANALYSIS · THAILAND", { x: 1.45, y: 1.55, w: 10, h: 0.5, fontFace: HF, fontSize: 14, bold: true, color: MOSS, charSpacing: 3, margin: 0, valign: "middle" });
  s.addText("อัพเดตความคืบหน้าโปรเจกต์", { x: 0.85, y: 2.4, w: 11.6, h: 1.0, fontFace: HF, fontSize: 42, bold: true, color: WHITE, margin: 0 });
  s.addText("แดชบอร์ดดูพื้นที่สีเขียวของไทย พร้อม AI ช่วยเลือกจุดปลูกต้นไม้", { x: 0.87, y: 3.55, w: 11, h: 0.6, fontFace: BF, fontSize: 18, color: "C9D6C0", margin: 0 });
  s.addText("วันนี้จะพาดูทีละหน้าจากเว็บจริง ว่าตอนนี้ทำอะไรได้แล้วบ้าง และเหลืออะไรอีก", { x: 0.87, y: 4.25, w: 11, h: 0.6, fontFace: BF, fontSize: 15, italic: true, color: MOSS, margin: 0 });
  s.addText("Felsau   ·   ภาพทุกหน้าแคปจากระบบจริง (localhost)   ·   14 มิ.ย. 2569", { x: 0.87, y: 5.95, w: 11.6, h: 0.5, fontFace: BF, fontSize: 13, color: "C9D6C0", margin: 0 });
  s.addNotes("สวัสดีครับอาจารย์ วันนี้พวกผมจะมาอัพเดตความคืบหน้าของโปรเจกต์นะครับ ชื่อ Green Area Analysis เป็นเว็บที่เอาภาพดาวเทียมมาดูพื้นที่สีเขียวของไทย แล้วก็มี AI ช่วยเลือกจุดปลูกต้นไม้ วันนี้ผมจะพาอาจารย์ดูทีละหน้าจากเว็บจริงเลย ว่าตอนนี้ทำอะไรได้แล้วบ้าง ภาพทุกหน้าที่เห็นคือแคปจากระบบจริงที่รันอยู่ครับ");
}

// ===== 2. PROGRESS OVERVIEW =====
{
  const s = pres.addSlide();
  lightHeader(s, "ภาพรวมความคืบหน้า", "ตอนนี้ถึงไหนแล้ว");
  tag(s, 1);
  // done column
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 1.9, w: 7.4, h: 4.7, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 1.9, w: 7.4, h: 0.55, fill: { color: FOREST2 }, line: { type: "none" } });
  s.addText("✓  เสร็จแล้ว ใช้งานได้จริง", { x: 0.9, y: 1.9, w: 7.0, h: 0.55, fontFace: HF, fontSize: 16, bold: true, color: WHITE, valign: "middle", margin: 0 });
  bullets(s, [
    "แผนที่ทั้งประเทศ 3 มิติ (77 จังหวัด · 928 อำเภอ)",
    "ดูความเขียว NDVI + เทียบเกณฑ์ WHO",
    "ดูอุณหภูมิ LST + ความเสี่ยงเกาะความร้อน",
    "ดูแนวโน้มย้อนหลัง + พยากรณ์",
    "AI แนะนำจุดปลูก (Top 10) + พันธุ์ไม้",
    "ออกรายงาน PDF",
  ], { x: 0.95, y: 2.65, w: 6.9, h: 3.8, fs: 15, ls: 22, gap: 13, color: INK });
  // in progress column
  s.addShape(pres.shapes.RECTANGLE, { x: 8.35, y: 1.9, w: 4.25, h: 4.7, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 8.35, y: 1.9, w: 4.25, h: 0.55, fill: { color: AMBER }, line: { type: "none" } });
  s.addText("🔧  กำลังพัฒนาต่อ", { x: 8.55, y: 1.9, w: 3.9, h: 0.55, fontFace: HF, fontSize: 16, bold: true, color: WHITE, valign: "middle", margin: 0 });
  bullets(s, [
    "วิเคราะห์ผลความเย็น (cooling)",
    "เปรียบเทียบหลายจังหวัด",
    "แยกวิเคราะห์เฉพาะเขตเมือง",
  ], { x: 8.6, y: 2.65, w: 3.8, h: 3.8, fs: 14.5, ls: 22, gap: 14, color: INK });
  s.addNotes("ก่อนจะลงรายละเอียด ขอสรุปภาพรวมก่อนนะครับว่าตอนนี้ถึงไหนแล้ว ฝั่งซ้ายคือส่วนที่เสร็จและใช้งานได้จริงแล้ว มีตั้งแต่แผนที่ทั้งประเทศ ดูความเขียว ดูอุณหภูมิ ดูแนวโน้มพร้อมพยากรณ์ AI แนะนำจุดปลูก ไปจนถึงออกรายงาน PDF ส่วนฝั่งขวาคือที่ยังทำต่ออยู่ คือการวิเคราะห์ผลความเย็น การเทียบหลายจังหวัด และการแยกดูเฉพาะเขตเมือง เดี๋ยวผมจะพาดูทีละหน้าครับ");
}

// ===== 3-9 PAGE SLIDES =====
pageSlide(1, "หน้าจากเว็บจริง · 1", "หน้าแรก & แผนที่ทั้งประเทศ",
  "หน้าหลักของระบบ แสดงแผนที่ไทยทั้งประเทศแบบ 3 มิติ ยกความสูงตามความเขียวของแต่ละจังหวัด",
  ["คลิกจังหวัดเพื่อเจาะดูข้อมูล", "เลือกปีข้อมูลได้", "เลื่อนเทียบหลายปีด้วย Time-lapse", "สีเข้ม = เขียวมาก, สีอ่อน = เขียวน้อย"],
  LIVE("02_dashboard_country.png"), R_LIVE, "done",
  "หน้าแรกครับ พอเข้ามาจะเจอแผนที่ไทยทั้งประเทศแบบสามมิติ แต่ละจังหวัดยกสูงตามความเขียว ตรงไหนสีเข้มคือต้นไม้เยอะ สีอ่อนคือน้อย เราคลิกจังหวัดไหนก็ได้เพื่อเจาะดูข้อมูล เลือกปีได้ และมีโหมด Time-lapse เลื่อนดูเทียบหลายปี อันนี้คือหน้าจริงเลยนะครับ");

pageSlide(2, "หน้าจากเว็บจริง · 2", "หน้าดูความเขียว (NDVI)",
  "หน้าแสดงค่าความเขียวของพืชพรรณจากภาพดาวเทียม Sentinel-2 ของจังหวัดที่เลือก",
  ["ค่าความเขียวเฉลี่ย + ต่ำสุด/สูงสุด", "% พื้นที่สีเขียวของจังหวัด", "พื้นที่สีเขียวต่อคน เทียบเกณฑ์ WHO", "กราฟรายเดือน"],
  LIVE("03_tak_ndvi.png"), R_LIVE, "done",
  "(คนที่ 2 รับช่วงต่อ) สวัสดีครับ ผมขอเล่าต่อในส่วนหน้าข้อมูลนะครับ หน้านี้คือหน้าดูความเขียว พอเลือกตาก มันจะบอกค่าความเขียวเฉลี่ย 0.61 บอก % พื้นที่สีเขียวคือ 96% แล้วก็คำนวณให้ด้วยว่าพื้นที่สีเขียวต่อคนผ่านเกณฑ์ WHO ไหม มีกราฟรายเดือนให้ดูด้วย หน้านี้เสร็จแล้วครับ");

pageSlide(2, "หน้าจากเว็บจริง · 3", "หน้าดูอุณหภูมิ (LST)",
  "หน้าแสดงอุณหภูมิพื้นผิวจากดาวเทียม Landsat และประเมินความเสี่ยงเกาะความร้อนเมือง",
  ["อุณหภูมิเฉลี่ย + ต่ำสุด/สูงสุด", "กราฟอุณหภูมิรายเดือน", "ระดับความเสี่ยงเกาะความร้อน", "โหลดข้อมูลออกเป็น CSV / PDF / รูป"],
  LIVE("05_tak_lst.png"), R_LIVE, "done",
  "หน้าถัดมาคือหน้าดูอุณหภูมิครับ เป็นอุณหภูมิพื้นผิวที่วัดจากดาวเทียม ตากเฉลี่ย 31 องศา ระบบเอาความเขียวกับความร้อนมารวมกัน บอกว่าเสี่ยงเป็นเกาะความร้อนแค่ไหน ตากเสี่ยงต่ำเพราะต้นไม้เยอะ แล้วก็โหลดข้อมูลออกเป็นไฟล์ได้ หน้านี้ก็เสร็จแล้วครับ");

pageSlide(2, "หน้าจากเว็บจริง · 4", "หน้าแนวโน้ม & พยากรณ์",
  "หน้าดูแนวโน้มความเขียวย้อนหลังหลายปี พร้อมพยากรณ์อนาคต",
  ["เลือกหลายปีมาดูพร้อมกัน", "กราฟเส้นแสดงแนวโน้ม", "พยากรณ์ด้วย OLS regression + ช่วงเชื่อมั่น 95%", "เส้นประ = ค่าที่คาดการณ์"],
  LIVE("09_tak_trend.png"), R_LIVE, "done",
  "หน้านี้คือหน้าแนวโน้มครับ เลือกหลายปีมาดูพร้อมกันได้ ระบบจะวาดกราฟเส้นให้เห็นว่าความเขียวเพิ่มหรือลด แล้วที่เด็ดคือมันพยากรณ์อนาคตให้ด้วย ใช้วิธี OLS regression มีช่วงเชื่อมั่น 95% เส้นประคือค่าที่คาดการณ์ หน้านี้เพิ่งทำเสร็จครับ — เดี๋ยวส่วนที่เป็นไฮไลต์ ผมขอให้เพื่อนเล่าต่อ");

pageSlide(3, "หน้าจากเว็บจริง · 5 (ไฮไลต์)", "หน้า AI แนะนำจุดปลูก",
  "หน้าที่ใช้ AI ให้คะแนนทุกจุดในจังหวัด แล้วบอกว่าควรปลูกต้นไม้ตรงไหนก่อน",
  ["ดูจาก 3 อย่าง: เขียวน้อย + ร้อน + คนเยอะ", "เรียง Top 10 จุดที่ควรปลูกก่อน", "คลิกพิกัดเปิด Google Maps", "ปรับน้ำหนักแต่ละปัจจัยเองได้"],
  LIVE("06_tak_ai_priority.png"), R_LIVE, "done",
  "(คนที่ 3 รับช่วงต่อ) สวัสดีครับ ส่วนนี้เป็นไฮไลต์นะครับ หน้า AI แนะนำจุดปลูก หลักการคือระบบให้คะแนนทุกจุดในจังหวัด ดูจากสามอย่าง เขียวน้อย ร้อน คนเยอะ ถ้าครบคือควรปลูกด่วน แล้วเรียงมาให้เป็น Top 10 เห็นพิกัดเลย กดเข้า Google Maps ได้ ปรับน้ำหนักเองก็ได้ ภาพนี้ AI คำนวณสดๆ ตอนนั้นเลยครับ");

// page 6: species + district (two images)
{
  const s = pres.addSlide();
  s.background = { color: CREAM };
  tag(s, 3);
  s.addText("หน้าจากเว็บจริง · 6", { x: 0.7, y: 0.5, w: 9.8, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText("หน้าแนะนำพันธุ์ไม้ + เจาะดูระดับอำเภอ", { x: 0.7, y: 0.85, w: 10, h: 0.7, fontFace: HF, fontSize: 24, bold: true, color: FOREST2, margin: 0 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.72, y: 1.6, w: 2.7, h: 0.42, fill: { color: DONEBG }, line: { type: "none" }, rectRadius: 0.1 });
  s.addText("✓  เสร็จแล้ว ใช้งานได้", { x: 0.72, y: 1.6, w: 2.7, h: 0.42, fontFace: HF, fontSize: 12, bold: true, color: FOREST2, align: "center", valign: "middle", margin: 0 });
  const imgs = [[LIVE("07_tak_ai_species.png"), "ซ้าย: แนะนำว่าปลูกอะไรดี — บอกชื่อไม้ ความสูง คุณสมบัติ ตามภาคนั้นๆ"], [LIVE("08_tak_district.png"), "ขวา: ซูมดูถึงระดับอำเภอได้ (มีครบ 928 อำเภอ)"]];
  const iw = 5.85, ih = iw / R_LIVE, gap = 0.3, startx = (W - (iw * 2 + gap)) / 2, y = 2.4;
  imgs.forEach((it, i) => {
    const x = startx + i * (iw + gap);
    s.addShape(pres.shapes.RECTANGLE, { x: x - 0.06, y: y - 0.06, w: iw + 0.12, h: ih + 0.12, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addImage({ path: it[0], x, y, w: iw, h: ih });
    s.addText(it[1], { x: x - 0.1, y: y + ih + 0.15, w: iw + 0.2, h: 0.7, fontFace: BF, fontSize: 13, bold: true, color: INK, align: "center", margin: 0, lineSpacing: 18 });
  });
  s.addNotes("หน้านี้มีสองอย่างครับ ทางซ้ายคือระบบแนะนำว่าควรปลูกอะไร ตามภาคของจังหวัดนั้น อย่างตากอยู่ภาคตะวันตกก็แนะนำประดู่ป่า พะยูง บอกชื่อวิทยาศาสตร์ ความสูงครบ ส่วนทางขวา เราซูมลงไปดูรายอำเภอได้ด้วย อันนี้อำเภอแม่สอดไฮไลต์สีน้ำเงิน มีครบ 928 อำเภอทั่วประเทศ สองหน้านี้เสร็จแล้วครับ");
}

// page 7: reports
{
  const s = pres.addSlide();
  s.background = { color: CREAM };
  tag(s, 3);
  s.addText("หน้าจากเว็บจริง · 7", { x: 0.7, y: 0.5, w: 9.8, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText("ออกรายงานสรุปเป็นไฟล์ PDF", { x: 0.7, y: 0.85, w: 10, h: 0.7, fontFace: HF, fontSize: 24, bold: true, color: FOREST2, margin: 0 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.72, y: 1.6, w: 2.7, h: 0.42, fill: { color: DONEBG }, line: { type: "none" }, rectRadius: 0.1 });
  s.addText("✓  เสร็จแล้ว ใช้งานได้", { x: 0.72, y: 1.6, w: 2.7, h: 0.42, fontFace: HF, fontSize: 12, bold: true, color: FOREST2, align: "center", valign: "middle", margin: 0 });
  const imgs = [[SHOT("08_stats_report_cover.png"), "รายงานสรุปพื้นที่สีเขียว (NDVI · LST · WHO)"], [SHOT("10_recommend_report.png"), "รายงาน AI แนะนำการปลูก (Top 10 + พันธุ์ไม้)"]];
  const dh = 4.2, dw = dh * R_DOC, gap = 1.0, totalW = dw * 2 + gap, startx = (W - totalW) / 2, y = 2.3;
  imgs.forEach((it, i) => {
    const x = startx + i * (dw + gap);
    s.addShape(pres.shapes.RECTANGLE, { x: x - 0.06, y: y - 0.06, w: dw + 0.12, h: dh + 0.12, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addImage({ path: it[0], x, y, w: dw, h: dh });
    s.addText(it[1], { x: x - 0.3, y: y + dh + 0.18, w: dw + 0.6, h: 0.6, fontFace: BF, fontSize: 13, bold: true, color: INK, align: "center", margin: 0, lineSpacing: 18 });
  });
  s.addNotes("พอดูข้อมูลเสร็จ ผู้ใช้กดออกรายงานเป็น PDF ได้เลยครับ มีสองแบบ แบบแรกสรุปพื้นที่สีเขียว ความเขียว อุณหภูมิ ผล WHO พร้อมแผนที่ แบบที่สองเป็นรายงาน AI แนะนำการปลูก มี Top 10 กับพันธุ์ไม้ เอาไปยื่นหน่วยงานได้เลย หน้านี้เสร็จแล้วครับ");
}

// ===== 10. IN PROGRESS / NEXT =====
{
  const s = pres.addSlide();
  lightHeader(s, "กำลังทำต่อ", "สิ่งที่เหลือและขั้นถัดไป");
  tag(s, 3);
  const items = [
    ["วิเคราะห์ผลความเย็น", "ประเมินว่าพื้นที่สีเขียวช่วยลดอุณหภูมิได้เท่าไร — มีหน้าแล้ว กำลังปรับให้แสดงผลครบ"],
    ["เปรียบเทียบหลายจังหวัด", "เลือก 2–3 จังหวัดมาเทียบกันในจอเดียว"],
    ["แยกดูเฉพาะเขตเมือง", "เพราะถ้าดูทั้งจังหวัดค่าจะถูกดึงด้วยพื้นที่ป่า ปัญหาจริงอยู่ในเมือง"],
    ["เก็บข้อมูลให้ครบทุกจังหวัด", "ทยอยรันให้ครบ จะได้เปิดดูได้ทันทีทุกที่"],
  ];
  const cw = 5.75, ch = 2.0, gx = 0.7, gy = 1.95, gapx = 0.5, gapy = 0.4;
  items.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gapx), y = gy + row * (ch + gapy);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.1, h: ch, fill: { color: AMBER }, line: { type: "none" } });
    s.addText(c[0], { x: x + 0.35, y: y + 0.28, w: cw - 0.6, h: 0.5, fontFace: HF, fontSize: 17, bold: true, color: FOREST2, margin: 0 });
    s.addText(c[1], { x: x + 0.35, y: y + 0.85, w: cw - 0.6, h: 1.0, fontFace: BF, fontSize: 13.5, color: INK, lineSpacing: 20, margin: 0, valign: "top" });
  });
  s.addNotes("ส่วนที่เหลือที่กำลังทำต่อมีสี่อย่างครับ หนึ่งหน้าวิเคราะห์ผลความเย็น มีหน้าแล้วแต่กำลังปรับให้แสดงผลให้ครบ สองการเทียบหลายจังหวัดในจอเดียว สามการแยกดูเฉพาะเขตเมือง เพราะถ้าดูทั้งจังหวัดค่าจะถูกดึงด้วยพื้นที่ป่า ปัญหาจริงอยู่ในเมือง และสี่ทยอยเก็บข้อมูลให้ครบทุกจังหวัด จะได้เปิดดูได้ทันทีครับ");
}

// ===== 11. THANK YOU =====
{
  const s = pres.addSlide();
  s.background = { color: FOREST };
  tag(s, 3, true);
  diamond(s, (W - 0.6) / 2, 2.1, 0.6, MINT);
  s.addText("ขอบคุณครับ", { x: 0, y: 3.0, w: W, h: 1.0, fontFace: HF, fontSize: 44, bold: true, color: WHITE, align: "center", margin: 0 });
  s.addText("นี่คือความคืบหน้าตอนนี้ครับ — ถ้าอาจารย์มีคำถามหรือข้อแนะนำ ยินดีรับเลยครับ", { x: 0, y: 4.1, w: W, h: 0.6, fontFace: BF, fontSize: 17, color: "C9D6C0", align: "center", margin: 0 });
  s.addText("Felsau   ·   github.com/Felsau/Project", { x: 0, y: 4.85, w: W, h: 0.5, fontFace: BF, fontSize: 14, color: MOSS, align: "center", margin: 0 });
  s.addNotes("ก็จบเท่านี้ครับ นี่คือความคืบหน้าตอนนี้ ขอบคุณอาจารย์ที่รับฟัง ถ้ามีคำถามหรือข้อแนะนำตรงไหน พวกผมยินดีรับเลยครับ");
}

pres.writeFile({ fileName: "C:/Users/ComSync/Desktop/Project/presentation/GreenArea_Progress_Update.pptx" }).then((fn) => console.log("WROTE: " + fn));
