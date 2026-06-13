// Fake-but-plausible data for the dashboard recreation. Mirrors the shapes the
// real app gets from its GEE backend.
const GL_PROVINCES = [
  { th: 'กรุงเทพมหานคร', en: 'Bangkok Metropolis', ndvi: 0.27, lst: 36.2, area: 1569, green_pct: 21.4, green_km2: 336, per_person: 4.1, who: 'ต่ำกว่าเกณฑ์ WHO' },
  { th: 'เชียงใหม่', en: 'Chiang Mai', ndvi: 0.58, lst: 30.1, area: 20107, green_pct: 71.3, green_km2: 14336, per_person: 812.4, who: 'ผ่านเกณฑ์ WHO' },
  { th: 'ขอนแก่น', en: 'Khon Kaen', ndvi: 0.46, lst: 32.8, area: 10886, green_pct: 58.2, green_km2: 6336, per_person: 352.9, who: 'ผ่านเกณฑ์ WHO' },
  { th: 'ภูเก็ต', en: 'Phuket', ndvi: 0.41, lst: 31.5, area: 543, green_pct: 47.6, green_km2: 258, per_person: 62.1, who: 'ผ่านเกณฑ์ WHO' },
  { th: 'สมุทรปราการ', en: 'Samut Prakan', ndvi: 0.24, lst: 35.4, area: 1004, green_pct: 19.8, green_km2: 199, per_person: 5.7, who: 'ต่ำกว่าเกณฑ์ WHO' },
  { th: 'นนทบุรี', en: 'Nonthaburi', ndvi: 0.29, lst: 34.9, area: 622, green_pct: 24.5, green_km2: 152, per_person: 6.2, who: 'ต่ำกว่าเกณฑ์ WHO' },
];

const GL_DISTRICTS = {
  'กรุงเทพมหานคร': [
    { th: 'เขตปทุมวัน', ndvi: 0.18, lst: 38.1, area: 8.4 },
    { th: 'เขตจตุจักร', ndvi: 0.31, lst: 35.2, area: 32.9 },
    { th: 'เขตหนองจอก', ndvi: 0.44, lst: 33.0, area: 236.3 },
  ],
};

// Monthly NDVI/LST series (Jan–Dec)
const GL_MONTHLY_NDVI = [0.31, 0.28, 0.25, 0.24, 0.27, 0.33, 0.38, 0.41, 0.40, 0.37, 0.35, 0.33];
const GL_MONTHLY_LST  = [33.1, 34.8, 36.9, 37.8, 36.4, 34.2, 33.0, 32.5, 32.8, 33.2, 33.0, 32.6];
const GL_MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const GL_YEARS = [2569, 2568, 2567, 2566, 2565, 2564];

const GL_RANKING_WORST = [
  { rank: 1, th: 'สมุทรปราการ', val: 5.7 },
  { rank: 2, th: 'กรุงเทพมหานคร', val: 4.1 },
  { rank: 3, th: 'นนทบุรี', val: 6.2 },
  { rank: 4, th: 'ปทุมธานี', val: 7.4 },
  { rank: 5, th: 'สมุทรสาคร', val: 8.0 },
];

const GL_RANKING_BEST = [
  { rank: 73, th: 'แม่ฮ่องสอน', val: 2104.8 },
  { rank: 74, th: 'ตาก', val: 1480.2 },
  { rank: 75, th: 'กาญจนบุรี', val: 1102.6 },
  { rank: 76, th: 'เชียงใหม่', val: 812.4 },
  { rank: 77, th: 'น่าน', val: 776.1 },
];

const getNdviLabel = (v) => v >= 0.6 ? 'หนาแน่นมาก' : v >= 0.45 ? 'หนาแน่น' : v >= 0.3 ? 'ปานกลาง' : 'น้อย';
const getLstLabel = (v) => v >= 38 ? 'ร้อนมาก' : v >= 33 ? 'ร้อน' : v >= 28 ? 'ปานกลาง' : 'เย็น';

Object.assign(window, {
  GL_PROVINCES, GL_DISTRICTS, GL_MONTHLY_NDVI, GL_MONTHLY_LST, GL_MONTH_LABELS,
  GL_YEARS, GL_RANKING_WORST, GL_RANKING_BEST, getNdviLabel, getLstLabel,
});
