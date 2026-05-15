// Floating control panel สำหรับ time-lapse mode
// ปิด: ปุ่มลอยขวาล่าง · เปิด: panel กลางล่างของแผนที่
const panel = {
  position: 'absolute',
  bottom: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(8px)',
  borderRadius: 12,
  padding: '12px 16px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minWidth: 480,
  maxWidth: '90%',
  zIndex: 10,
  fontFamily: 'inherit',
};

const btn = (active = false) => ({
  padding: '6px 12px',
  border: '1px solid #dadce0',
  background: active ? '#1a73e8' : '#fff',
  color: active ? '#fff' : '#202124',
  borderRadius: 6,
  fontSize: '0.85rem',
  cursor: 'pointer',
  fontWeight: 500,
  minWidth: 36,
});

const openBtn = {
  position: 'absolute',
  bottom: 16,
  right: 16,
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: '#1a73e8',
  color: '#fff',
  border: 'none',
  fontSize: '1.2rem',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
  zIndex: 10,
};

export default function TimelapsePlayer({ timelapse }) {
  const {
    active, setActive, close,
    data, year, setYear,
    playing, setPlaying, speed, setSpeed,
    loading, loadError, fetchTimelapse,
  } = timelapse;

  if (!active) {
    return (
      <button style={openBtn} onClick={() => setActive(true)}
              title="เปิด Time-lapse Mode" aria-label="เปิด Time-lapse">
        🎬
      </button>
    );
  }

  if (loading) {
    return (
      <div style={panel}>
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '0.9rem' }}>
          ⏳ กำลังโหลดข้อมูล time-lapse...
        </div>
      </div>
    );
  }

  // โหลดไม่สำเร็จ (fetch reject / 5xx / 4xx) — เสนอ retry
  if (loadError || !data) {
    return (
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: '0.85rem', color: '#5f6368' }}>
            ⚠️ โหลดข้อมูล time-lapse ไม่สำเร็จ
          </div>
          <button style={btn()} onClick={fetchTimelapse} aria-label="ลองใหม่">ลองใหม่</button>
          <button style={btn()} onClick={close} aria-label="ปิด">✕</button>
        </div>
      </div>
    );
  }

  if (!data.years?.length || year == null) {
    return (
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: '0.85rem', color: '#5f6368' }}>
            ⚠️ ไม่มีข้อมูล NDVI cache เพียงพอ — ลองคลิกบางจังหวัดเพื่อ compute ก่อน
          </div>
          <button style={btn()} onClick={close} aria-label="ปิด">✕</button>
        </div>
      </div>
    );
  }

  const minY = data.years[0];
  const maxY = data.years[data.years.length - 1];
  const idx = data.years.indexOf(year);

  const togglePlay = () => setPlaying(p => !p);
  const stepBack = () => { setPlaying(false); setYear(data.years[Math.max(0, idx - 1)]); };
  const stepFwd  = () => { setPlaying(false); setYear(data.years[Math.min(data.years.length - 1, idx + 1)]); };
  const onSlider = (e) => { setPlaying(false); setYear(data.years[Number(e.target.value)]); };

  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
        <span style={{ fontWeight: 600 }}>🎬 Time-lapse · NDVI</span>
        <span style={{ color: '#5f6368' }}>{minY}–{maxY}</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: '#5f6368', fontSize: '0.75rem' }}>
          {data.province_count} จังหวัด
        </span>
        <button style={btn()} onClick={close} aria-label="ปิด">✕</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={btn()} onClick={stepBack} disabled={idx <= 0}
                title="ปีก่อนหน้า" aria-label="ปีก่อนหน้า">◀</button>
        <button style={btn(playing)} onClick={togglePlay}
                title={playing ? 'หยุด' : 'เล่น'} aria-label={playing ? 'หยุด' : 'เล่น'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button style={btn()} onClick={stepFwd} disabled={idx >= data.years.length - 1}
                title="ปีถัดไป" aria-label="ปีถัดไป">▶</button>

        <input type="range" min={0} max={data.years.length - 1} step={1}
               value={idx} onChange={onSlider}
               style={{ flex: 1, accentColor: '#1a73e8' }}
               aria-label="เลื่อนเลือกปี" />

        <span style={{
          minWidth: 50, textAlign: 'center', fontWeight: 600,
          color: '#1a73e8', fontSize: '0.95rem',
        }}>
          {year}
        </span>

        <select value={speed} onChange={e => setSpeed(Number(e.target.value))}
                style={{ ...btn(), padding: '6px 8px' }} aria-label="ความเร็ว">
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={4}>4×</option>
        </select>
      </div>
    </div>
  );
}
