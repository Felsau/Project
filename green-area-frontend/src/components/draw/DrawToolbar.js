import { fmtArea } from '../../utils/formatArea';

// โหมดวาด — คำแนะนำ + จำนวนจุด + ปุ่ม ลบจุด/วิเคราะห์/ยกเลิก
// คืน fragment (parent ห่อด้วย .draw-panel ให้แล้ว)
export default function DrawToolbar({ points, area, loading, onUndo, onAnalyze, onCancel }) {
  return (
    <>
      <div className="draw-panel__title">
        <span>วาดพื้นที่วิเคราะห์</span>
        <span className="draw-panel__count">{points.length} จุด</span>
      </div>
      <div className="draw-panel__hint">
        คลิกบนแผนที่เพื่อปักหมุดมุมพื้นที่ (อย่างน้อย 3 จุด) แล้วกด “วิเคราะห์”
        {area != null && <> · ~{fmtArea(area)} km²</>}
      </div>
      {loading && (
        <div className="draw-panel__hint draw-panel__hint--busy">
          กำลังวิเคราะห์พื้นที่จาก Google Earth Engine (~20–40 วินาที)…
        </div>
      )}
      <div className="draw-panel__btns">
        <button className="overlay-btn" onClick={onUndo}
          disabled={points.length === 0 || loading}>↶ ลบจุด</button>
        <button className="overlay-btn" data-active={points.length >= 3}
          onClick={onAnalyze} disabled={points.length < 3 || loading}>
          {loading ? '…' : '✓ วิเคราะห์'}
        </button>
        <button className="overlay-btn" onClick={onCancel} disabled={loading}>✕ ยกเลิก</button>
      </div>
    </>
  );
}
