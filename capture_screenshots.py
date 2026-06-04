"""Capture screenshots of the running app for embedding in the proposal PDF.
รันหลัง dev server (frontend + backend) เปิดอยู่ที่ localhost:3000 / 8000.
"""
import os
import time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, 'screenshots')
os.makedirs(OUT_DIR, exist_ok=True)

URL = 'http://localhost:3000'
VIEWPORT = {'width': 1366, 'height': 820}

def shot(page, name, full_page=False):
    path = os.path.join(OUT_DIR, f'{name}.png')
    page.screenshot(path=path, full_page=full_page)
    print(f'[OK] {name}.png ({os.path.getsize(path):,} bytes)')

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=1.5,
            locale='th-TH',
        )
        page = context.new_page()
        print('Opening', URL)
        page.goto(URL, wait_until='networkidle', timeout=60000)
        # Wait for map basemap + Deck.gl to draw
        page.wait_for_selector('canvas', timeout=30000)
        time.sleep(4)

        # 1. Initial view — full screen
        shot(page, '01_initial_map')

        # 2. Click "โหลดอันดับ" button to populate ranking
        try:
            page.evaluate("""() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const target = btns.find(b => b.textContent.trim() === 'โหลดอันดับ');
                if (target) target.click();
            }""")
            time.sleep(5)  # wait for ranking + 3D extrusion
            shot(page, '02_ranking_loaded')
        except Exception as e:
            print('skip ranking:', e)

        # 3. Click on a green province on the map. Iterate a grid of points
        # until the panel updates with province detail.
        try:
            # Use the OUTER canvas (deck.gl) — the deck.gl picking responds
            # to clicks via its own canvas (usually 1st canvas in DOM order).
            map_box = page.evaluate("""() => {
                const cs = document.querySelectorAll('canvas');
                // Largest canvas = the map canvas
                let best = null, bestArea = 0;
                cs.forEach(c => {
                    const r = c.getBoundingClientRect();
                    const a = r.width * r.height;
                    if (a > bestArea) { bestArea = a; best = {x:r.x,y:r.y,w:r.width,h:r.height}; }
                });
                return best;
            }""")
            print(f'   map_box = {map_box}')
            if map_box:
                # Grid scan over the upper-left quadrant (northern Thailand,
                # where most cached provinces are)
                hit = False
                grid = [
                    (fx, fy)
                    for fx in (0.18, 0.24, 0.30, 0.36, 0.42, 0.48)
                    for fy in (0.10, 0.18, 0.26, 0.34)
                ]
                for fx, fy in grid:
                    cx = map_box['x'] + map_box['w'] * fx
                    cy = map_box['y'] + map_box['h'] * fy
                    page.mouse.click(cx, cy)
                    time.sleep(3)
                    # Check whether AppHeader title now shows a Thai province
                    detail = page.evaluate("""() => {
                        const txt = document.body.textContent;
                        // Look for typical detail-panel keywords
                        const keys = ['NDVI Mean', 'NDVI เฉลี่ย', 'WHO', 'ตารางกิโลเมตร', 'พื้นที่ทั้งหมด'];
                        return keys.some(k => txt.includes(k));
                    }""")
                    if detail:
                        hit = True
                        print(f'   province hit at ({fx:.2f}, {fy:.2f})')
                        break
                if not hit:
                    print('   no province click registered — using ranking-loaded screenshot')
                else:
                    time.sleep(4)  # let chart/stats render fully
                shot(page, '03_province_selected')
        except Exception as e:
            print('skip province click:', e)

        # 4. Time-lapse player
        try:
            page.evaluate("""() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const target = btns.find(b => b.textContent.includes('Time-lapse'));
                if (target) target.click();
            }""")
            time.sleep(3)
            shot(page, '04_timelapse_player')
        except Exception as e:
            print('skip timelapse:', e)

        browser.close()

if __name__ == '__main__':
    main()
    print('Done.')
