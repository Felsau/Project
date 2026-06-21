import { PROVINCE_TH } from '../constants';
import { fmtArea } from '../utils/formatArea';

// Floating panel — รายการพื้นที่ที่บันทึกไว้ (ของผู้ใช้คนนี้) · โหลดกลับบนแผนที่ / ลบของตัวเอง
const fmtDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }); }
  catch { return ''; }
};

export default function SavedAreasPanel({ open, onClose, saved, onLoad }) {
  if (!open) return null;
  const { items, loading, remove } = saved;

  return (
    <div className="saved-panel" role="region" aria-label="พื้นที่ที่บันทึกไว้">
      <div className="saved-panel__head">
        <span className="saved-panel__title">พื้นที่ที่บันทึก {items.length > 0 && `(${items.length})`}</span>
        <button className="btn--text" onClick={onClose} aria-label="ปิด">✕</button>
      </div>

      {loading ? (
        <div className="helper" style={{ padding: '8px 2px' }}>กำลังโหลด…</div>
      ) : items.length === 0 ? (
        <div className="helper" style={{ padding: '8px 2px' }}>
          ยังไม่มีพื้นที่ที่บันทึก — วาดพื้นที่แล้วกด “บันทึก”
        </div>
      ) : (
        <ul className="saved-list">
          {items.map((it) => (
            <li key={it.id} className="saved-item">
              <button className="saved-item__main" onClick={() => onLoad(it)}
                title="โหลดพื้นที่นี้ขึ้นแผนที่">
                <span className="saved-item__label">
                  {it.label || `พื้นที่ #${it.id}`}
                  {it.mine && <span className="saved-item__badge">ของฉัน</span>}
                </span>
                <span className="saved-item__meta">
                  {fmtArea(it.area_km2)} km² · ปี {it.year}
                  {it.province ? ` · ${PROVINCE_TH[it.province] || it.province}` : ''} · {fmtDate(it.created_at)}
                </span>
              </button>
              {it.mine && (
                <button className="saved-item__del" onClick={() => remove(it.id)}
                  aria-label="ลบพื้นที่นี้" title="ลบ">✕</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
