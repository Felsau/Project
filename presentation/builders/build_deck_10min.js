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
const R_LIVE = 1440 / 810;
const shadow = () => ({ type: "outer", color: "000000", blur: 9, offset: 3, angle: 135, opacity: 0.2 });

function lightHeader(s, eyebrow, title) {
  s.background = { color: CREAM };
  s.addText(eyebrow.toUpperCase(), { x: 0.7, y: 0.5, w: 12, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText(title, { x: 0.7, y: 0.85, w: 12, h: 0.8, fontFace: HF, fontSize: 30, bold: true, color: FOREST2, margin: 0 });
}
function bullets(s, arr, o) {
  s.addText(arr.map((b) => ({ text: b, options: { bullet: { code: "2022", indent: 18 }, breakLine: true, paraSpaceAfter: o.gap || 16, color: o.color || INK } })),
    { x: o.x, y: o.y, w: o.w, h: o.h, fontFace: BF, fontSize: o.fs || 16, lineSpacing: o.ls || 24, valign: "top", margin: 0 });
}
function diamond(s, x, y, sz, c) { s.addShape(pres.shapes.DIAMOND, { x, y, w: sz, h: sz, fill: { color: c }, line: { type: "none" } }); }
// presenter chip, top-right
const P_COL = { 1: "2C5F2D", 2: "1C7293", 3: "B5663A" };
function tag(s, p, dark) {
  const x = 11.15, y = 0.32, w = 1.85, h = 0.42;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: dark ? "16271B" : WHITE }, line: { color: P_COL[p], width: 1 }, rectRadius: 0.06 });
  s.addShape(pres.shapes.OVAL, { x: x + 0.18, y: y + 0.12, w: 0.18, h: 0.18, fill: { color: P_COL[p] }, line: { type: "none" } });
  s.addText("ผู้นำเสนอ " + p, { x: x + 0.42, y, w: w - 0.5, h, fontFace: HF, fontSize: 11, bold: true, color: dark ? WHITE : P_COL[p], valign: "middle", margin: 0 });
}
function demoSlide(eyebrow, title, items, img, ratio, note, p) {
  const s = pres.addSlide();
  s.background = { color: CREAM };
  tag(s, p);
  s.addText(eyebrow.toUpperCase(), { x: 0.7, y: 0.55, w: 5.2, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText(title, { x: 0.7, y: 0.9, w: 5.4, h: 1.1, fontFace: HF, fontSize: 26, bold: true, color: FOREST2, margin: 0, lineSpacing: 30 });
  bullets(s, items, { x: 0.72, y: 2.35, w: 5.25, h: 4.3, fs: 15.5, ls: 23, gap: 18 });
  const ax = 6.35, maxW = 6.45, maxH = 5.9, ay0 = 0.7;
  let iw = maxW, ih = iw / ratio;
  if (ih > maxH) { ih = maxH; iw = ih * ratio; }
  const ix = ax + (maxW - iw) / 2, iy = ay0 + (maxH - ih) / 2 + 0.2;
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
  diamond(s, 0.85, 1.7, 0.45, MINT);
  s.addText("GREEN AREA ANALYSIS · THAILAND", { x: 1.45, y: 1.7, w: 11, h: 0.5, fontFace: HF, fontSize: 15, bold: true, color: MOSS, charSpacing: 3, margin: 0, valign: "middle" });
  s.addText("แดชบอร์ดดูพื้นที่สีเขียวของไทย\nพร้อม AI ช่วยเลือกจุดปลูกต้นไม้", { x: 0.85, y: 2.6, w: 11.6, h: 1.9, fontFace: HF, fontSize: 40, bold: true, color: WHITE, lineSpacing: 50, margin: 0 });
  s.addText("ดูจากภาพดาวเทียมจริง · วัดความเขียวกับอุณหภูมิ · แล้วบอกว่าตรงไหนควรปลูกต้นไม้ก่อน", { x: 0.87, y: 4.55, w: 11, h: 0.7, fontFace: BF, fontSize: 16, color: "C9D6C0", lineSpacing: 24, margin: 0 });
  s.addText("Felsau   ·   โปรเจกต์จบ ป.ตรี   ·   14 มิ.ย. 2569", { x: 0.87, y: 5.85, w: 11.6, h: 0.5, fontFace: BF, fontSize: 14, color: "C9D6C0", margin: 0 });
  s.addNotes("สวัสดีครับอาจารย์ ผมชื่อ... วันนี้จะมาเล่าโปรเจกต์ของผมนะครับ ชื่อว่า Green Area Analysis เป็นเว็บที่เอาภาพดาวเทียมมาดูว่าพื้นที่ไหนในไทยมีต้นไม้เยอะ-น้อยแค่ไหน แล้วก็มี AI ช่วยบอกด้วยว่าถ้าจะปลูกต้นไม้เพิ่ม ควรไปปลูกตรงไหนก่อน เดี๋ยวผมพาดูทีละส่วนเลยครับ ใช้เวลาประมาณสิบนาที");
}

// ===== 2. PROBLEM =====
{
  const s = pres.addSlide();
  lightHeader(s, "ทำไมถึงทำเรื่องนี้", "ปัญหาที่อยากแก้");
  tag(s, 1);
  const cards = [
    ["พื้นที่สีเขียวไม่เท่ากัน", "บางจังหวัดเขียวมาก บางที่แทบไม่มี — ต่างกันเป็นร้อยเท่า โดยเฉพาะในเมือง"],
    ["เมืองร้อนขึ้นเรื่อยๆ", "ที่ไหนต้นไม้น้อย ที่นั่นก็ร้อนกว่า เกิดเป็น “เกาะความร้อน”"],
    ["ข้อมูลมีอยู่ แต่ดูยาก", "ภาพดาวเทียมมีจริง แต่คนทั่วไปเอามาอ่านเองไม่ได้"],
    ["ปลูกต้นไม้แบบเดาๆ", "ส่วนใหญ่เลือกที่ปลูกโดยไม่มีข้อมูลมายืนยันว่าตรงไหนคุ้มที่สุด"],
  ];
  const cw = 5.75, ch = 2.0, gx = 0.7, gy = 1.95, gapx = 0.5, gapy = 0.45;
  cards.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gapx), y = gy + row * (ch + gapy);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.1, h: ch, fill: { color: MOSS }, line: { type: "none" } });
    s.addText(c[0], { x: x + 0.35, y: y + 0.28, w: cw - 0.6, h: 0.5, fontFace: HF, fontSize: 18, bold: true, color: FOREST2, margin: 0 });
    s.addText(c[1], { x: x + 0.35, y: y + 0.85, w: cw - 0.6, h: 1.0, fontFace: BF, fontSize: 14, color: INK, lineSpacing: 21, margin: 0, valign: "top" });
  });
  s.addNotes("ก่อนอื่นขอเล่าที่มาก่อนนะครับ ปัญหาที่ผมเห็นมีอยู่สี่อย่าง อย่างแรกคือพื้นที่สีเขียวมันไม่เท่ากันเลย บางจังหวัดเขียวมาก บางที่โดยเฉพาะในเมืองแทบไม่มีต้นไม้ ต่างกันเป็นร้อยเท่า สองคือพอต้นไม้น้อย เมืองก็ร้อนขึ้น เกิดเป็นเกาะความร้อน สามคือจริงๆ ภาพดาวเทียมมันมีอยู่แล้ว แต่คนทั่วไปเอามาอ่านเองไม่ได้ ต้องมีความรู้เฉพาะทาง และสุดท้ายเวลาจะปลูกต้นไม้ ส่วนใหญ่ก็เลือกที่กันแบบเดาๆ ไม่มีข้อมูลมายืนยัน โปรเจกต์ผมเลยอยากมาช่วยแก้ตรงนี้ครับ");
}

// ===== 3. WHAT IT DOES =====
{
  const s = pres.addSlide();
  lightHeader(s, "โปรเจกต์นี้ทำอะไร", "สรุปสั้นๆ ใน 3 ข้อ");
  tag(s, 1);
  const items = [
    ["ดู", "ดึงภาพดาวเทียมมาแสดงบนแผนที่ 3 มิติ ว่าแต่ละที่เขียวแค่ไหน ร้อนแค่ไหน"],
    ["วัด", "คำนวณว่าพื้นที่สีเขียวต่อคนผ่านเกณฑ์ขององค์การอนามัยโลก (WHO) ไหม"],
    ["แนะนำ", "ใช้ AI บอกว่าควรปลูกต้นไม้ตรงไหนก่อน ปลูกอะไรดี และช่วยลดคาร์บอนได้เท่าไร"],
  ];
  const y0 = 2.1, rh = 1.5;
  items.forEach((it, i) => {
    const y = y0 + i * rh;
    s.addShape(pres.shapes.OVAL, { x: 0.8, y, w: 1.1, h: 1.1, fill: { color: FOREST2 }, line: { type: "none" } });
    s.addText(it[0], { x: 0.8, y, w: 1.1, h: 1.1, fontFace: HF, fontSize: 22, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(it[1], { x: 2.25, y: y + 0.1, w: 10.3, h: 0.95, fontFace: BF, fontSize: 18, color: INK, valign: "middle", margin: 0, lineSpacing: 25 });
  });
  s.addNotes("ทีนี้โปรเจกต์ผมทำอะไรบ้าง สรุปง่ายๆ สามคำครับ ดู วัด แนะนำ ดู คือเอาภาพดาวเทียมมาแสดงบนแผนที่สามมิติ ให้เห็นเลยว่าตรงไหนเขียว ตรงไหนร้อน วัด คือคำนวณว่าพื้นที่สีเขียวต่อคนผ่านเกณฑ์ WHO ไหม และ แนะนำ คือให้ AI ช่วยบอกว่าควรปลูกตรงไหนก่อน ปลูกอะไร แล้วช่วยลดคาร์บอนได้แค่ไหน — สามอย่างนี้เดี๋ยวเพื่อนผมจะพาดูในของจริงต่อครับ");
}

// ===== 4. HOW IT WORKS (simple) =====
{
  const s = pres.addSlide();
  lightHeader(s, "เบื้องหลังคร่าวๆ", "ระบบทำงานยังไง");
  tag(s, 2);
  const boxes = [
    ["หน้าเว็บ", "ส่วนที่เราเห็น\nแผนที่ + กราฟ", MINT],
    ["ตัวประมวลผล", "ดึง + คำนวณ\nข้อมูล", FOREST2],
    ["Google Earth Engine", "คลังภาพ\nดาวเทียม", MOSS],
  ];
  const bw = 3.3, bh = 1.7, y = 2.5, startx = 0.9, gap = 1.45;
  boxes.forEach((b, i) => {
    const x = startx + i * (bw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: bw, h: bh, fill: { color: b[2] }, line: { type: "none" }, rectRadius: 0.12, shadow: shadow() });
    s.addText(b[0], { x: x + 0.2, y: y + 0.28, w: bw - 0.4, h: 0.5, fontFace: HF, fontSize: 18, bold: true, color: WHITE, align: "center", margin: 0 });
    s.addText(b[1], { x: x + 0.2, y: y + 0.85, w: bw - 0.4, h: 0.7, fontFace: BF, fontSize: 13, color: "F0F5EC", align: "center", margin: 0, lineSpacing: 18 });
    if (i < 2) s.addText("→", { x: x + bw + 0.2, y: y + 0.4, w: gap - 0.4, h: bh - 0.8, fontFace: HF, fontSize: 30, bold: true, color: MUTE, align: "center", valign: "middle", margin: 0 });
  });
  s.addText("เคยคำนวณแล้วเก็บไว้ → เปิดซ้ำได้ทันที ไม่ต้องรอประมวลผลใหม่ทุกครั้ง", { x: 0.7, y: 5.0, w: 11.9, h: 0.6, fontFace: BF, fontSize: 15, italic: true, color: MUTE, align: "center", margin: 0 });
  s.addNotes("ขออธิบายเบื้องหลังคร่าวๆ แบบไม่ลงลึกนะครับ มันมีสามส่วน หน้าเว็บคือส่วนที่เราเห็น พวกแผนที่กับกราฟ ตัวประมวลผลคือตัวที่คอยดึงข้อมูลกับคำนวณ และ Google Earth Engine คือคลังภาพดาวเทียมขนาดใหญ่ของ Google ที่เราดึงภาพมาใช้ จุดที่ผมคิดว่าสำคัญคือ ข้อมูลที่เคยคำนวณแล้วผมเก็บไว้ พอเปิดซ้ำมันเลยขึ้นทันที ไม่ต้องรอประมวลผลใหม่ทุกครั้งครับ");
}

// ===== 5. DEMO NDVI =====
demoSlide("ลองใช้จริง · 1", "เลือกจังหวัด แล้วดูความเขียว",
  ["คลิกจังหวัดบนแผนที่ ระบบดึงข้อมูลให้เลย", "บอกค่าความเขียวเฉลี่ย กับ % พื้นที่สีเขียว", "เทียบให้ด้วยว่าต่อคนผ่านเกณฑ์ WHO ไหม", "ตัวอย่างนี้คือ จ.ตาก เขียวถึง 96%"],
  LIVE("03_tak_ndvi.png"), R_LIVE,
  "(คนที่ 2 รับช่วงต่อ) สวัสดีครับ ผมขอเล่าต่อในส่วนการใช้งานจริงนะครับ ทีนี้มาดูของจริงกันเลย พอเราคลิกเลือกจังหวัด สมมติตาก ระบบมันก็จะดึงข้อมูลมาให้เลย ทางซ้ายจะเห็นค่าความเขียวเฉลี่ย ของตากคือ 0.61 ถือว่าเขียวเยอะ แล้วก็บอกว่าพื้นที่สีเขียวคิดเป็น 96% ของจังหวัด ข้างล่างมันคำนวณให้ด้วยว่าพื้นที่สีเขียวต่อคนผ่านเกณฑ์ WHO ไหม ส่วนทางขวาคือแผนที่สามมิติ ตรงไหนเขียวเข้มก็คือต้นไม้แน่นครับ ภาพที่เห็นนี่คือแคปจากระบบจริงเลยนะครับ", 2);

// ===== 6. DEMO LST =====
demoSlide("ลองใช้จริง · 2", "ดูอุณหภูมิ กับเกาะความร้อน",
  ["ดูอุณหภูมิพื้นผิวจากดาวเทียม", "มีกราฟรายเดือน ไล่สีร้อน-เย็น", "ประเมินให้ว่าเสี่ยงเป็นเกาะความร้อนแค่ไหน", "โหลดข้อมูลออกเป็นไฟล์ได้ (CSV / PDF / รูป)"],
  LIVE("05_tak_lst.png"), R_LIVE,
  "อันเดียวกันนี้ เลื่อนลงมาหน่อยจะเป็นเรื่องอุณหภูมิครับ ตัวนี้คืออุณหภูมิพื้นผิวที่วัดจากดาวเทียม ของตากเฉลี่ยอยู่ 31 องศา ระบบเอาความเขียวกับความร้อนมารวมกัน แล้วบอกว่าตรงนี้เสี่ยงเป็นเกาะความร้อนแค่ไหน ตากอยู่ระดับเสี่ยงต่ำเพราะต้นไม้เยอะ แล้วถ้าใครอยากเอาข้อมูลไปใช้ต่อ ก็กดโหลดออกเป็นไฟล์ได้เลย ทั้ง CSV ทั้ง PDF ครับ — เดี๋ยวส่วนที่เป็นไฮไลต์ ผมขอให้เพื่อนมาเล่าต่อครับ", 2);

// ===== 7. DEMO AI (highlight) =====
demoSlide("ลองใช้จริง · 3 (ตัวเด่น)", "AI บอกว่าควรปลูกตรงไหนก่อน",
  ["ให้คะแนนทุกจุดในจังหวัด", "ดูจาก 3 อย่าง: เขียวน้อย + ร้อน + คนเยอะ", "เรียงให้ Top 10 จุดที่ควรปลูกก่อน", "คลิกพิกัดเปิด Google Maps ได้เลย"],
  LIVE("06_tak_ai_priority.png"), R_LIVE,
  "(คนที่ 3 รับช่วงต่อ) สวัสดีครับ ส่วนสุดท้ายผมขอเล่าตัวที่เป็นไฮไลต์นะครับ คือ AI แนะนำจุดปลูก หลักการมันคือ ระบบจะให้คะแนนทุกจุดในจังหวัด โดยดูจากสามอย่างรวมกัน หนึ่งตรงนั้นเขียวน้อยไหม สองร้อนไหม สามมีคนอยู่เยอะไหม ถ้าครบทั้งสามอย่างคือควรปลูกด่วน คะแนนจะสูง แล้วมันก็เรียงมาให้เลยเป็น Top 10 จุดที่ควรปลูกก่อน เห็นเป็นพิกัดเลยครับ กดเข้าไปมันเปิด Google Maps ให้ด้วย คือเอาไปใช้ได้จริงเลย ภาพนี้คือ AI คำนวณสดๆ ตอนนั้นเลยครับ", 3);

// ===== 8. DEMO species + district (two images) =====
{
  const s = pres.addSlide();
  s.background = { color: CREAM };
  s.addText("ลองใช้จริง · 4", { x: 0.7, y: 0.5, w: 12, h: 0.35, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText("แนะนำพันธุ์ไม้ + ดูเจาะถึงอำเภอ", { x: 0.7, y: 0.85, w: 12, h: 0.7, fontFace: HF, fontSize: 26, bold: true, color: FOREST2, margin: 0 });
  tag(s, 3);
  const imgs = [[LIVE("07_tak_ai_species.png"), "แนะนำว่าปลูกอะไรดี — ประดู่ป่า พะยูง ตะแบกนา ฯลฯ"], [LIVE("08_tak_district.png"), "ซูมดูถึงระดับอำเภอได้ (มีครบ 928 อำเภอ)"]];
  const iw = 5.85, ih = iw / R_LIVE, gap = 0.3, startx = (W - (iw * 2 + gap)) / 2, y = 2.05;
  imgs.forEach((it, i) => {
    const x = startx + i * (iw + gap);
    s.addShape(pres.shapes.RECTANGLE, { x: x - 0.06, y: y - 0.06, w: iw + 0.12, h: ih + 0.12, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow() });
    s.addImage({ path: it[0], x, y, w: iw, h: ih });
    s.addText(it[1], { x: x - 0.1, y: y + ih + 0.15, w: iw + 0.2, h: 0.6, fontFace: BF, fontSize: 13.5, bold: true, color: INK, align: "center", margin: 0, lineSpacing: 18 });
  });
  s.addNotes("นอกจากบอกว่าปลูกตรงไหน ระบบยังบอกด้วยว่าควรปลูกอะไร ดูทางซ้ายนะครับ มันแนะนำพันธุ์ไม้ที่เหมาะกับภาคนั้นๆ อย่างตากอยู่ภาคตะวันตกก็จะแนะนำพวกประดู่ป่า พะยูง บอกชื่อวิทยาศาสตร์ ความสูง ครบเลย ส่วนทางขวา ระบบไม่ได้ดูแค่ระดับจังหวัดนะครับ ซูมลงไปดูรายอำเภอได้ด้วย อันนี้คืออำเภอแม่สอด ที่ไฮไลต์สีน้ำเงิน มีครบทั้ง 928 อำเภอทั่วประเทศครับ");
}

// ===== 9. RESULTS =====
{
  const s = pres.addSlide();
  s.background = { color: FOREST };
  tag(s, 3, true);
  s.addText("แล้วได้อะไรบ้าง", { x: 0.7, y: 0.7, w: 12, h: 0.45, fontFace: HF, fontSize: 12, bold: true, color: MOSS, charSpacing: 3, margin: 0 });
  s.addText("สรุปผลที่จับต้องได้", { x: 0.7, y: 1.1, w: 12, h: 0.75, fontFace: HF, fontSize: 30, bold: true, color: WHITE, margin: 0 });
  const stats = [["77", "จังหวัด", "+ เจาะถึง 928 อำเภอ"], ["1.6 ล้าน", "ต้นไม้", "ถ้าปลูกครบจุดเด่นในตาก"], ["30,527", "ตัน CO₂/ปี", "คาร์บอนที่ช่วยลดได้"], ["ใช้ได้จริง", "ทั้งระบบ", "เปิดเว็บใช้ได้เลย"]];
  const cw = 2.85, gap = 0.36, sx = 0.7, y = 2.35, ch = 2.55;
  stats.forEach((st, i) => {
    const x = sx + i * (cw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, fill: { color: FOREST2 }, line: { type: "none" }, rectRadius: 0.1 });
    s.addText(st[0], { x: x + 0.1, y: y + 0.35, w: cw - 0.2, h: 0.9, fontFace: HF, fontSize: 32, bold: true, color: MINT, align: "center", margin: 0 });
    s.addText(st[1], { x, y: y + 1.3, w: cw, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: WHITE, align: "center", margin: 0 });
    s.addText(st[2], { x: x + 0.15, y: y + 1.75, w: cw - 0.3, h: 0.6, fontFace: BF, fontSize: 12, color: "C9D6C0", align: "center", margin: 0, lineSpacing: 16 });
  });
  s.addText("จากภาพดาวเทียมที่อ่านยาก กลายเป็นเครื่องมือที่ชี้ได้เลยว่าควรไปปลูกต้นไม้ตรงไหน", { x: 0.7, y: 5.45, w: 11.9, h: 0.8, fontFace: BF, fontSize: 15, italic: true, color: MOSS, align: "center", margin: 0 });
  s.addNotes("สรุปผลที่ได้นะครับ ระบบครอบคลุมครบ 77 จังหวัด เจาะลงไปถึง 928 อำเภอ และที่เป็นรูปธรรมเลยคือ อย่างกรณีตาก ถ้าปลูกครบจุดที่ AI แนะนำ จะได้ต้นไม้ประมาณ 1.6 ล้านต้น ช่วยลดคาร์บอนได้ปีละสามหมื่นกว่าตัน ตัวเลขพวกนี้ระบบคำนวณให้เอง สรุปง่ายๆ คือ ผมเอาภาพดาวเทียมที่ปกติคนอ่านไม่รู้เรื่อง มาทำให้มันชี้ได้เลยว่าควรไปปลูกต้นไม้ตรงไหนครับ");
}

// ===== 10. THANK YOU =====
{
  const s = pres.addSlide();
  s.background = { color: FOREST };
  tag(s, 3, true);
  diamond(s, (W - 0.6) / 2, 2.1, 0.6, MINT);
  s.addText("ขอบคุณครับ", { x: 0, y: 3.0, w: W, h: 1.0, fontFace: HF, fontSize: 46, bold: true, color: WHITE, align: "center", margin: 0 });
  s.addText("ถ้าอาจารย์มีคำถามตรงไหน ถามได้เลยครับ", { x: 0, y: 4.1, w: W, h: 0.6, fontFace: BF, fontSize: 18, color: "C9D6C0", align: "center", margin: 0 });
  s.addText("Felsau   ·   github.com/Felsau/Project", { x: 0, y: 4.85, w: W, h: 0.5, fontFace: BF, fontSize: 14, color: MOSS, align: "center", margin: 0 });
  s.addNotes("ก็จบเท่านี้ครับ ขอบคุณอาจารย์มากที่รับฟัง ถ้ามีคำถามตรงไหน ถามได้เลยครับ");
}

pres.writeFile({ fileName: "C:/Users/ComSync/Desktop/Project/presentation/GreenArea_Presentation_10min.pptx" }).then((fn) => console.log("WROTE: " + fn));
