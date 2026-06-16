// Shared puppeteer boilerplate for the screenshot capture scripts.
// Every capture drives headless Chromium against the local dev server
// (http://localhost:3000) at the deck capture resolution (1440×810 @2x).
const puppeteer = require("puppeteer");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Injected before each screenshot to freeze animations/transitions so the
// captured frame is stable. The id keeps repeated injections identifiable.
const KILL = `(()=>{const s=document.createElement('style');s.id='noanim';s.innerHTML='*{animation:none!important;transition:none!important;scroll-behavior:auto!important}';document.head.appendChild(s);})()`;

// Launch headless Chromium with a page sized for deck capture.
async function launch() {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 810, deviceScaleFactor: 2 });
  return { browser, page };
}

// Build a shot(name) that freezes animation, settles, then writes
// <outDir>/<name>.png.
function makeShot(page, outDir) {
  return async (name) => {
    await page.evaluate(KILL);
    await sleep(400);
    await page.screenshot({ path: `${outDir}/${name}.png` });
    console.log("saved", name);
  };
}

module.exports = { sleep, KILL, launch, makeShot };
