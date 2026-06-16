const fs = require("fs");
const { sleep, launch, makeShot } = require("./_browser");

const OUT = "C:/Users/ComSync/Desktop/Project/presentation/screenshots_live";
fs.mkdirSync(OUT, { recursive: true });

async function clickByText(page, sel, text) {
  return page.evaluate((sel, text) => {
    const el = [...document.querySelectorAll(sel)].find((x) => x.innerText && x.innerText.includes(text));
    if (el) { el.click(); return true; }
    return false;
  }, sel, text);
}

(async () => {
  const { browser, page } = await launch();
  const shot = makeShot(page, OUT);

  // 1) Landing
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(1500);
  await shot("01_landing");

  // 2) Open dashboard
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.innerText.includes("เปิดแดชบอร์ด"));
    b && b.click();
  });
  await sleep(2500);
  await shot("02_dashboard_country");

  // 3) Select Tak via search box (type → Enter selects highlighted option)
  await page.focus("input");
  await page.evaluate(() => {
    const i = document.querySelector("input");
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    set.call(i, "ตาก");
    i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sleep(1400);
  // locate the exact "ตาก Tak" option and real-click its center
  const rect = await page.evaluate(() => {
    const opt = [...document.querySelectorAll("[role=option]")].find((x) => x.innerText.includes("Tak"));
    if (!opt) return null;
    const r = opt.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (rect) { await page.mouse.click(rect.x, rect.y); }
  else { await page.keyboard.press("Enter"); console.log("WARN: Tak option not found, used Enter"); }
  // wait until detail panel shows the NDVI mean value
  await page.waitForFunction(() => /0\.6115|ค่าเฉลี่ยทั้งปี/.test(document.body.innerText), { timeout: 25000 }).catch(() => console.log("WARN: panel text not detected"));
  await sleep(2500);
  await page.evaluate(() => { const p = document.querySelector(".panel"); if (p) p.scrollTop = 0; });
  await shot("03_tak_ndvi");

  // 4) Scroll panel down to LST + Urban Heat Island section
  await page.evaluate(() => { const p = document.querySelector(".panel"); if (p) p.scrollTop = p.scrollHeight; });
  await sleep(1200);
  await shot("05_tak_lst");

  // 5) AI recommend tab → run analysis
  await page.evaluate(() => { const p = document.querySelector(".panel"); if (p) p.scrollTop = 0; });
  await clickByText(page, "button", "AI แนะนำ");
  await sleep(1500);
  // click the "วิเคราะห์พื้นที่นี้" run button
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /วิเคราะห์จังหวัด|วิเคราะห์พื้นที่/.test(x.innerText));
    b && b.click();
  });
  // wait for Top-10 list (look for "PRIORITY" or score rows)
  await page.waitForFunction(() => /PRIORITY SCORE|จุดที่ควรปลูก|Priority/i.test(document.body.innerText), { timeout: 90000 }).catch(() => console.log("WARN: priority list not detected"));
  await sleep(4000);
  // scroll so the TOP 10 coordinate rows are visible (target a leaf node with a lat,long)
  const scLog = await page.evaluate(() => {
    const p = document.querySelector(".panel");
    const leaf = [...p.querySelectorAll("*")].find(
      (x) => x.children.length === 0 && /\d{2}\.\d{3,4},\s*\d{2,3}\.\d{3,4}/.test(x.textContent)
    );
    if (leaf) {
      const delta = leaf.getBoundingClientRect().top - p.getBoundingClientRect().top;
      p.scrollTop += delta - 110;
    } else {
      p.scrollTop = Math.round(p.scrollHeight * 0.32);
    }
    return { sh: p.scrollHeight, top: p.scrollTop, foundLeaf: !!leaf };
  });
  console.log("priority scroll:", JSON.stringify(scLog));
  await sleep(800);
  await shot("06_tak_ai_priority");

  // 6) scroll AI panel down to species
  await page.evaluate(() => { const p = document.querySelector(".panel"); if (p) p.scrollTop = p.scrollHeight; });
  await sleep(1500);
  await shot("07_tak_ai_species");

  // 7) District drill-down via deep-link (?p=Tak&d=MaeSot) — bypasses landing
  await page.goto("http://localhost:3000/?p=Tak&d=MaeSot&tab=data", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => /แม่สอด/.test(document.body.innerText), { timeout: 30000 }).catch(() => console.log("WARN: district name not detected"));
  await sleep(5000); // district NDVI/LST fetch
  await page.evaluate(() => { const p = document.querySelector(".panel"); if (p) p.scrollTop = 0; });
  await shot("08_tak_district");

  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
