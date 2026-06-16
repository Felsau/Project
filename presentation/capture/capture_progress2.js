const fs = require("fs");
const { sleep, launch, makeShot } = require("./_browser");
const OUT = "C:/Users/ComSync/Desktop/Project/presentation/screenshots_live";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const { browser, page } = await launch();
  const shot = makeShot(page, OUT);

  // ---- TREND: select years then click ดูแนวโน้ม ----
  await page.goto("http://localhost:3000/?p=Tak&tab=trend", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => /ตาก/.test(document.body.innerText), { timeout: 30000 }).catch(() => {});
  await sleep(2500);
  // click year chips 2021-2025 (buttons whose text is a 4-digit year)
  const yrs = await page.evaluate(() => {
    const btns = [...document.querySelectorAll(".panel button")].filter((b) => /^20(2[0-5])$/.test(b.innerText.trim()));
    btns.forEach((b) => b.click());
    return btns.map((b) => b.innerText.trim());
  });
  console.log("trend years clicked:", yrs.join(","));
  await sleep(600);
  const tb = await page.evaluate(() => { const b = [...document.querySelectorAll(".panel button")].find((x) => /ดูแนวโน้ม/.test(x.innerText)); if (b) { b.click(); return b.innerText.trim(); } return null; });
  console.log("trend button:", tb);
  await page.waitForFunction(() => /พยากรณ์|แนวโน้ม\s|ช่วงเชื่อมั่น|คาดการณ์|slope|เพิ่มขึ้น|ลดลง/.test(document.body.innerText), { timeout: 50000 }).catch(() => console.log("WARN trend result"));
  await sleep(3500);
  await page.evaluate(() => { const p = document.querySelector(".panel"); if (p) p.scrollTop = 0; });
  await shot("09_tak_trend");

  // ---- COOLING: click วิเคราะห์ความเย็น, wait for GEE result ----
  await page.goto("http://localhost:3000/?p=Tak&tab=cooling", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => /ตาก/.test(document.body.innerText), { timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const cb = await page.evaluate(() => { const b = [...document.querySelectorAll(".panel button")].find((x) => /วิเคราะห์ความเย็น/.test(x.innerText)); if (b) { b.click(); return b.innerText.trim(); } return null; });
  console.log("cooling button:", cb);
  await page.waitForFunction(() => /°C|เย็นกว่า|ผลความเย็น|cooling|ลดอุณหภูมิ|พื้นที่สีเขียวช่วย/.test(document.body.innerText), { timeout: 70000 }).catch(() => console.log("WARN cooling result"));
  await sleep(4000);
  await page.evaluate(() => { const p = document.querySelector(".panel"); if (p) p.scrollTop = 0; });
  await shot("10_tak_cooling");

  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
