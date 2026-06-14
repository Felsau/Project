// km² ที่อ่านง่าย: <1 → ทศนิยม 2, <100 → ทศนิยม 1, อื่นๆ → จำนวนเต็ม + คั่นหลักพัน
// ใช้ร่วมกันใน DrawToolbar / DrawResultCard / SavedAreasPanel
export function fmtArea(km2) {
  if (km2 == null) return '—';
  const n = Number(km2);
  if (Number.isNaN(n)) return '—';
  if (n < 1) return n.toFixed(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: n < 100 ? 1 : 0 });
}
