const { sleep, launch, makeShot } = require("./_browser");

const OUT = "C:/Users/ComSync/Desktop/Project/presentation/screenshots_live";

(async () => {
  const { browser, page } = await launch();
  const shot = makeShot(page, OUT);

  await page.goto("http://localhost:3000/?p=Tak&tab=trend", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => /ตาก/.test(document.body.innerText), { timeout: 30000 }).catch(() => {});
  await sleep(2500);

  // select the year chips 2020–2025
  await page.evaluate(() => {
    [...document.querySelectorAll(".panel button")]
      .filter((x) => /^20(2[0-5])$/.test(x.innerText.trim()))
      .forEach((x) => x.click());
  });
  await sleep(500);

  // click "ดูแนวโน้ม" to run the trend analysis
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".panel button")].find((x) => /ดูแนวโน้ม/.test(x.innerText));
    b && b.click();
  });
  await page.waitForFunction(
    () => /เพิ่มขึ้น|ลดลง|พยากรณ์|cache/.test(document.body.innerText),
    { timeout: 50000 },
  ).catch(() => {});
  await sleep(3500);

  // center the chart (svg/canvas) within the panel before the shot
  await page.evaluate(() => {
    const p = document.querySelector(".panel");
    const c = p.querySelector("svg, canvas");
    if (c) {
      const d = c.getBoundingClientRect().top - p.getBoundingClientRect().top;
      p.scrollTop += d - 150;
    } else {
      p.scrollTop = p.scrollHeight;
    }
  });
  await sleep(600);
  await shot("09_tak_trend");

  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
