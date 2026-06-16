const fs = require("fs");
const { sleep, launch, makeShot } = require("./_browser");
const OUT = "C:/Users/ComSync/Desktop/Project/presentation/screenshots_live";
fs.mkdirSync(OUT, { recursive: true });

async function clickText(page, sel, re) {
  return page.evaluate((sel, reSrc) => {
    const rx = new RegExp(reSrc);
    const el = [...document.querySelectorAll(sel)].find((x) => rx.test(x.innerText || ""));
    if (el) { el.click(); return el.innerText.trim(); }
    return null;
  }, sel, re);
}

(async () => {
  const { browser, page } = await launch();
  const shot = makeShot(page, OUT);

  const tabs = [
    { tab: "trend", name: "09_tak_trend", runRe: "วิเคราะห์|พยากรณ์|โหลด" },
    { tab: "cooling", name: "10_tak_cooling", runRe: "วิเคราะห์|ประเมิน|โหลด" },
    { tab: "compare", name: "11_tak_compare", runRe: "เทียบ|เปรียบเทียบ|โหลด" },
  ];

  for (const t of tabs) {
    await page.goto(`http://localhost:3000/?p=Tak&tab=${t.tab}`, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => /ตาก/.test(document.body.innerText), { timeout: 30000 }).catch(() => {});
    await sleep(3000);
    // try to trigger any analyze/load button inside the panel
    const clicked = await clickText(page, ".panel button", t.runRe);
    console.log(t.tab, "button:", clicked);
    await page.waitForNetworkIdle({ timeout: 40000 }).catch(() => {});
    await sleep(4000);
    await page.evaluate(() => { const p = document.querySelector(".panel"); if (p) p.scrollTop = 0; });
    await shot(t.name);
  }

  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
