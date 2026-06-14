// Per-browser owner token — ระบุว่า saved-area ไหน "ของฉัน" โดยไม่ต้อง login.
// สร้างครั้งเดียวเก็บใน localStorage แล้วส่งทาง header X-Owner-Token ทุก save/delete.
let _cached = null;

export function getOwnerToken() {
  if (_cached) return _cached;
  try {
    let t = localStorage.getItem('green-area-owner');
    if (!t) {
      t = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `o-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('green-area-owner', t);
    }
    _cached = t;
    return t;
  } catch {
    // localStorage ถูกบล็อก → ใช้ token ชั่วคราวต่อ session (ลบเองไม่ได้ข้าม reload)
    _cached = _cached || `o-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return _cached;
  }
}
