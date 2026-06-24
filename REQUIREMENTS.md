# Requirement Specification — Green Area Analysis Thailand

> เอกสารข้อกำหนดความต้องการของระบบ (Software Requirements) สำหรับวิทยานิพนธ์
> รวม **ความต้องการที่พัฒนาแล้ว** (FR-01…16, NFR-01…06) และ
> **ข้อเสนอเพิ่มเติมที่อ้างอิงงานวิจัย** (FR-17…26, NFR-07…08)
>
> แต่ละข้อกำกับแหล่งอ้างอิงด้วย `[R#]` → ดูรายการเต็มใน [§7 บรรณานุกรม](#7-บรรณานุกรม-references)
>
> _หมายเหตุด้านความถูกต้อง: บรรณานุกรมระบุชื่อเรื่อง/แหล่งตีพิมพ์/ปี/URL ที่ตรวจสอบแล้ว
> สำหรับบางรายการที่ยังไม่ทราบชื่อผู้แต่ง/เลขหน้าครบ ให้เปิดลิงก์ DOI ยืนยันก่อนนำลง
> บรรณานุกรมฉบับสมบูรณ์ของเล่มวิทยานิพนธ์_

---

## 1. ขอบเขตของเอกสาร

ระบบ **Green Area Analysis Thailand** เป็นเว็บแอปพลิเคชันวิเคราะห์พื้นที่สีเขียวและ
ปรากฏการณ์เกาะความร้อนเมือง (Urban Heat Island) จากภาพดาวเทียม ครอบคลุม 77 จังหวัด
928 อำเภอ ของประเทศไทย พร้อมอัลกอริทึมแนะนำพื้นที่ปลูกต้นไม้ (AI Priority) และ
รายงาน PDF

เอกสารนี้แบ่งความต้องการเป็น 2 กลุ่ม:
- **กลุ่ม A — พัฒนาแล้ว** (baseline ของวิทยานิพนธ์)
- **กลุ่ม B — ข้อเสนอตามงานวิจัย** (ต่อยอดเพื่อยกระดับงานให้ตรงกับ frontier ปัจจุบัน)

---

## 2. มาตรฐานและกรอบอ้างอิงหลัก

| มาตรฐาน/กรอบ | ใช้กับ | อ้างอิง |
|---|---|---|
| WHO — พื้นที่สีเขียวขั้นต่ำ ~9 ม²/คน | ranking, urban subset | `[R1]` |
| **3–30–300 rule** (ต้นไม้ในสายตา 3 ต้น · canopy 30% · สวนใน 300 ม.) | benchmark ระดับย่าน | `[R2]` |
| Multi-objective tree-planting prioritization | สูตร Priority Score | `[R3] [R4] [R5]` |
| Tree Equity Score (canopy + ความร้อน + ตัวชี้วัดสังคม) | ดัชนีความเป็นธรรม | `[R6]` |
| i-Tree Eco — การตีมูลค่าบริการนิเวศ | แบบจำลองผลกระทบ | `[R7]` |
| Network-based / 2SFCA accessibility | การเข้าถึงพื้นที่สีเขียว | `[R8] [R9]` |
| Bowler et al. 2010 — cooling effect ของพื้นที่สีเขียว | ΔLST estimation | `[R10]` |
| IPCC 2019 Guidelines — carbon sequestration | CO₂ estimation | `[R11]` |
| Sentinel-2 cloud masking / compositing best practice | วิธีวิทยา NDVI | `[R12]` |
| ESA WorldCover v200 — built-up & validation | urban subset, accuracy | `[R13]` |

---

## 3. Functional Requirements

### 3.1 กลุ่ม A — พัฒนาแล้ว (Baseline)

| ID | Requirement | อ้างอิง |
|---|---|---|
| FR-01 | คำนวณค่า NDVI รายปีและรายเดือน ระดับจังหวัดและอำเภอ | `[R12]` |
| FR-02 | คำนวณค่า LST (Land Surface Temperature) รายปีและรายเดือน ระดับจังหวัดและอำเภอ | — |
| FR-03 | แสดงแผนที่ NDVI/LST แบบ 3D extrusion ผ่าน deck.gl | — |
| FR-04 | เปรียบเทียบหลายจังหวัดพร้อมกัน | — |
| FR-05 | จัดอันดับจังหวัดตามค่าพื้นที่สีเขียวต่อคน เทียบมาตรฐาน WHO | `[R1]` |
| FR-06 | คำนวณ AI Priority Score และแสดงเป็น Heatmap layer | `[R3]` |
| FR-07 | แสดง 10 พิกัดที่ควรปลูกต้นไม้มากที่สุด พร้อม priority score | `[R3]` |
| FR-08 | แนะนำพันธุ์ไม้พื้นถิ่นตาม 6 ภูมิภาค พร้อมเหตุผลทางนิเวศ (22 ชนิด) | `[R5]` |
| FR-09 | ประมาณการ CO₂ sequestration และ cooling effect (ΔLST) | `[R10] [R11]` |
| FR-10 | Time-lapse animation แสดง NDVI ย้อนหลังหลายปี (ตั้งแต่ พ.ศ. 2558) | — |
| FR-11 | Time-series chart + แนวโน้ม (Mann-Kendall) + forecast | — |
| FR-12 | Urban Subset — clip ค่าด้วย ESA WorldCover Built-up | `[R13]` |
| FR-13 | ส่งออก PDF Report คุณภาพระดับวิทยานิพนธ์ | — |
| FR-14 | ปรับ Weight ของปัจจัยใน Priority Score ผ่าน UI | `[R3]` |
| FR-15 | Cache invalidation (admin only) ด้วย ADMIN_TOKEN | — |
| FR-16 | Rate limiting 60 requests/IP/นาที | — |

### 3.2 กลุ่ม B — ข้อเสนอเพิ่มเติมตามงานวิจัย

> หลักการ: ปัจจัยที่เพิ่มเข้าสู่ Priority Score เป็นแบบ **additive** (เติมปัจจัยใหม่
> เข้ากับ NDVI deficit / LST / population เดิม) เพื่อให้โมเดลยิ่ง rich ขึ้น ไม่ใช่ลด

**ธีม 1 — มาตรฐาน 3-30-300 (เสริม WHO)**

| ID | Requirement | เหตุผล/อ้างอิง |
|---|---|---|
| FR-17 | แสดงตัวชี้วัด **30% tree canopy cover** ต่ออำเภอ คู่กับ WHO m²/คน | 3-30-300 เป็น benchmark ใหม่ที่หลักฐานเชิงประจักษ์รองรับ `[R2]` |
| FR-18 | คำนวณ **% ประชากรที่อยู่ภายใน 300 ม.** จากพื้นที่สีเขียวสาธารณะ | เกณฑ์ "300" ของ 3-30-300 `[R2]` |

**ธีม 2 — มิติการเข้าถึง (Accessibility)**

| ID | Requirement | เหตุผล/อ้างอิง |
|---|---|---|
| FR-19 | Layer การเข้าถึง: % ประชากรที่เดินถึงสวนภายใน 300/500 ม. (network distance) | network analysis แม่นกว่า buffer/per-capita `[R8] [R9]` |
| FR-20 | (ขั้นสูง) ใช้ **2SFCA** ถ่วงทั้ง supply (ขนาดสวน) และ demand (ความหนาแน่นประชากร) | วิธีมาตรฐานในงานวิจัย accessibility `[R9]` |

**ธีม 3 — มิติความเป็นธรรม/เปราะบาง (Equity) — additive เข้า Priority**

| ID | Requirement | เหตุผล/อ้างอิง |
|---|---|---|
| FR-21 | **เพิ่ม** ปัจจัย equity/heat-vulnerability (สัดส่วนผู้สูงอายุ-เด็ก, heat exposure) เข้าสูตร Priority | prioritization ควรให้น้ำหนักชุมชนเปราะบาง `[R3] [R6]` |
| FR-22 | คำนวณ **Green/Tree Equity Score (0–100)** ต่ออำเภอ (canopy + LST + ตัวชี้วัดสังคม) | เทียบ benchmark สากลได้ `[R6]` |

**ธีม 4 — บริการนิเวศเต็มรูป (i-Tree)**

| ID | Requirement | เหตุผล/อ้างอิง |
|---|---|---|
| FR-23 | เพิ่มประมาณการ **ดูดซับมลพิษอากาศ** (PM2.5, O₃, NO₂) ต่อปี | i-Tree Eco ครอบคลุม air pollution removal `[R7]` |
| FR-24 | เพิ่มประมาณการ **ลด stormwater runoff** (การดักน้ำฝน) | บริการนิเวศหลักใน i-Tree `[R7]` |
| FR-25 | **ตีมูลค่าเป็นเงิน (บาท/ปี)** ของบริการนิเวศรวม | เสริมน้ำหนักเชิงนโยบาย/งบประมาณ `[R7]` |

**ธีม 5 — ความเป็นไปได้ในการปลูก (Feasibility)**

| ID | Requirement | เหตุผล/อ้างอิง |
|---|---|---|
| FR-26 | **เพิ่ม** ปัจจัย *ease of implementation* (พื้นที่ปลูกได้จริง/ข้อจำกัดการใช้ที่ดิน) เข้า priority | 1 ใน 4 องค์ประกอบหลักของ prioritization `[R3] [R4]` |

---

## 4. Non-Functional Requirements

### 4.1 กลุ่ม A — พัฒนาแล้ว

| ID | หมวด | Requirement |
|---|---|---|
| NFR-01 | Performance | API response < 2 วินาที (cache hit), ≤ 60 วินาที (cache miss + GEE compute) |
| NFR-02 | Scalability | รองรับ concurrent อย่างน้อย 100 sessions ผ่าน rate limit + cache |
| NFR-03 | Usability | ใช้งานได้โดยไม่มีพื้นฐาน GIS, รองรับไทย/อังกฤษ, มี tooltip อธิบายค่า |
| NFR-04 | Reliability | cache fallback เมื่อ GEE quota หมด, retry-on-disconnect, logging ทุก endpoint |
| NFR-05 | Security | CORS, admin token auth, service-role key อยู่ใน env ไม่อยู่ใน source |
| NFR-06 | Maintainability | แยก routers/helpers/business logic, type-hint + Pydantic, OpenAPI /docs |

### 4.2 กลุ่ม B — ข้อเสนอตามงานวิจัย

| ID | หมวด | Requirement | อ้างอิง |
|---|---|---|---|
| NFR-07 | Data Quality | รายงาน **ความไม่แน่นอน/คุณภาพ NDVI** ต่ออำเภอ (จำนวนภาพ cloud-free, ช่วงฤดูที่ใช้ composite) | `[R12]` |
| NFR-08 | Accuracy / Validation | **ตรวจสอบความถูกต้อง** ของ green area เทียบ ESA WorldCover และรายงานค่าความคลาดเคลื่อน (เป้า ±10%) | `[R13]` |

---

## 5. ข้อจำกัดและสมมติฐาน (Constraints & Assumptions)

- **Cloud cover** ภาคใต้/พื้นที่ฝนชุก ภาพ Sentinel-2 ที่ผ่าน filter น้อย ค่า NDVI บางเดือน
  ความไม่แน่นอนสูง — ระบบ fallback ใช้ภาพ cloud cover ≤ 80% `[R12]`
- **WorldPop** ข้อมูลประชากรถึงปี 2021 — เทียบ WHO ปีปัจจุบันอาจคลาดเคลื่อนจาก demographic change
- **Priority Score เป็น proxy** อิง remote sensing ไม่ใช่ ground truth — ไม่ครอบคลุมสิทธิ์ที่ดิน/
  วิศวกรรม การปลูกจริงต้องสำรวจหน้างาน (จึงเป็นที่มาของ FR-26) `[R4]`
- **Cooling effect** ค่า ΔLST ใช้ค่าเฉลี่ยจาก meta-analysis ของ Bowler et al. 2010 `[R10]`
- **ESA WorldCover** เป็น snapshot ปี 2021 ใช้เป็น proxy เขตเมืองทุกปีที่วิเคราะห์ `[R13]`

---

## 6. การสืบสาวความต้องการ (Traceability — ย่อ)

| Requirement | งานวิจัย/มาตรฐาน | จุดในระบบ (ปัจจุบัน/เป้าหมาย) |
|---|---|---|
| FR-06, FR-07, FR-14 | `[R3]` multi-objective | `routers/recommend/scoring.py` |
| FR-17, FR-18 | `[R2]` 3-30-300 | (ใหม่) ขยาย `routers/ndvi/` + analysis |
| FR-19, FR-20 | `[R8] [R9]` accessibility | (ใหม่) layer + GEE/network |
| FR-21, FR-22 | `[R6]` Tree Equity | (ใหม่) เพิ่ม factor ใน scoring |
| FR-23–25 | `[R7]` i-Tree | ขยาย `estimate_impact` |
| FR-09 | `[R10] [R11]` | `estimate_impact` (มีแล้ว) |
| NFR-07, NFR-08 | `[R12] [R13]` | gee_utils + validation report |

---

## 7. บรรณานุกรม (References)

**[R1]** World Health Organization, Regional Office for Europe. *Urban green spaces and health — a review of evidence* (และ *Urban green spaces: a brief for action*). Copenhagen: WHO Europe, 2016–2017. — มาตรฐานที่อ้างถึงบ่อยว่าควรมีพื้นที่สีเขียวขั้นต่ำ ~9 ม²/คน.
https://www.who.int/europe/publications/i/item/9789289052498

**[R2]** Konijnendijk, C. C. (2023). *Evidence-based guidelines for greener, healthier, more resilient neighbourhoods: Introducing the 3–30–300 rule.* **Journal of Forestry Research**, 34, 821–830. https://doi.org/10.1007/s11676-022-01523-z · PubMed: 36042873

**[R3]** *A multi-objective decision support framework to prioritize tree planting locations in urban areas.* **Landscape and Urban Planning** (2021). https://www.sciencedirect.com/science/article/abs/pii/S0169204621001353

**[R4]** Nyelele, C., et al. *A comparison of tree planting prioritization frameworks (i-Tree Landscape vs. spatial decision support tool).* USDA Forest Service / **Urban Forestry & Urban Greening** (2022). https://www.fs.usda.gov/nrs/pubs/jrnl/2022/nrs_2022_nyelele_001.pdf

**[R5]** *Towards "Right Tree, Right Place" in urban environments: A systematic review of decision-support methods and tools for urban tree planting.* **Urban Forestry & Urban Greening** (2026). https://www.sciencedirect.com/science/article/pii/S1618866726000750

**[R6]** American Forests. *Tree Equity Score — methodology & nationwide scores* (ผสาน tree canopy, surface temperature, income, employment, race, age, health). https://www.americanforests.org/tools-research-reports-and-guides/tree-equity-score/ · https://www.treeequityscore.org/

**[R7]** US Forest Service. *i-Tree Eco* — quantifying air-pollution removal, carbon storage/sequestration, stormwater runoff reduction และการตีมูลค่า. https://www.itreetools.org/ · กรณีศึกษา: *Quantifying Regulating Ecosystem Services of Urban Trees using i-Tree Eco.* **Forests** 15(8):1446 (2024). https://www.mdpi.com/1999-4907/15/8/1446

**[R8]** *Network-based assessment of urban forest and green space accessibility in six major cities (London, New York, Paris, Tokyo, Seoul, Beijing).* **Urban Forestry & Urban Greening** (2025). https://www.sciencedirect.com/science/article/abs/pii/S1618866725001153

**[R9]** *GIS-based analysis for assessing the accessibility at hierarchical levels of urban green spaces* (รวมแนวทาง network analysis และ 2SFCA). **Urban Forestry & Urban Greening** (2016). https://www.sciencedirect.com/science/article/abs/pii/S161886671630019X

**[R10]** Bowler, D. E., Buyung-Ali, L., Knight, T. M., & Pullin, A. S. (2010). *Urban greening to cool towns and cities: A systematic review of the empirical evidence.* **Landscape and Urban Planning**, 97(3), 147–155. https://doi.org/10.1016/j.landurbplan.2010.05.006

**[R11]** IPCC (2019). *2019 Refinement to the 2006 IPCC Guidelines for National Greenhouse Gas Inventories* — Vol. 4 (AFOLU). https://www.ipcc-nggip.iges.or.jp/public/2019rf/

**[R12]** *Sentinel-2 cloud masking & cloud-free NDVI compositing best practice* (SCL + s2cloudless, การเลือก window ตามฤดู, median vs max-NDVI). อ้างอิงประกอบ: cloud-free NDVI composite (GEE) https://github.com/r-zimmerle/gee-ndvi-composite · *A globally applicable deep learning model for Sentinel-2 cloud and shadow detection*, **ISPRS Open Journal of Photogrammetry and Remote Sensing** (2025). https://www.sciencedirect.com/science/article/pii/S2666017225000847

**[R13]** Zanaga, D., et al. *ESA WorldCover 10 m v200* (2021). European Space Agency. https://esa-worldcover.org/ · https://doi.org/10.5281/zenodo.7254221

---

_อัปเดตล่าสุด: 2026-06-22 · ใช้คู่กับ Proposal (presentation/generate_proposal_pdf.py) ข้อ 7.4.3–7.4.4_
