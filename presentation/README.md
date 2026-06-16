# presentation/

เครื่องมือและไฟล์สำหรับสร้าง **สไลด์นำเสนอ (.pptx)** และ **เอกสารข้อเสนอ (Proposal PDF)** ของโปรเจกต์
แยกออกมาจาก root เพื่อให้โฟลเดอร์โปรเจกต์หลัก (`green-area-backend/`, `green-area-frontend/`) สะอาด

## โครงสร้าง

```
presentation/
├── builders/                  ตัวสร้างสไลด์ (pptxgenjs)
│   ├── _palette.js                สี/ฟอนต์/ขนาด canvas ที่ใช้ร่วมกันทุก deck
│   ├── build_deck.js              → GreenArea_Presentation_live.pptx
│   ├── build_deck_10min.js        → GreenArea_Presentation_10min.pptx
│   ├── build_deck_detailed.js     → GreenArea_Presentation_detailed.pptx
│   └── build_deck_progress.js     → GreenArea_Progress_Update.pptx
├── capture/                   จับภาพหน้าจอแอปด้วย puppeteer → screenshots_live/
│   ├── _browser.js                puppeteer launch/sleep/shot ที่ใช้ร่วมกัน
│   ├── capture_live.js
│   ├── capture_progress.js
│   ├── capture_progress2.js
│   └── capture_trend.js
├── generate_proposal_pdf.py       → Proposal_28P14N00163_GreenAreaThailand.pdf
├── generate_user_flow_diagram.py  → user_flow_diagram.png
├── capture_screenshots.py         จับภาพหน้าจอ (Python) → screenshots/
├── screenshots/               ภาพสำหรับเอกสาร proposal
├── screenshots_live/          ภาพแอปจริงสำหรับสไลด์
├── *.pptx                     ไฟล์สไลด์ที่ build ออกมา
├── *.pdf / *.png              เอกสาร/ไดอะแกรมที่ generate ออกมา
├── package.json               deps: pptxgenjs, puppeteer
└── package-lock.json
```

## วิธีรัน

ต้องรันคำสั่งจากในโฟลเดอร์ `presentation/` นี้

```bash
cd presentation
npm install                      # ติดตั้ง pptxgenjs + puppeteer (ครั้งแรก)

# จับภาพหน้าจอแอป (ต้องเปิด frontend ที่ http://localhost:3000 ก่อน)
node capture/capture_live.js

# สร้างสไลด์
node builders/build_deck.js
node builders/build_deck_10min.js

# สร้างเอกสาร proposal (Python — ใช้ฟอนต์ Sarabun จาก green-area-frontend/public/fonts)
python generate_user_flow_diagram.py
python generate_proposal_pdf.py
```

> สคริปต์ JS ใช้ absolute path ที่อ้างถึง `.../Project/presentation/...`
> ถ้าย้ายโปรเจกต์ไปไดเรกทอรีอื่น ต้องแก้ค่าคงที่ path ที่หัวไฟล์ใน `builders/` และ `capture/`
