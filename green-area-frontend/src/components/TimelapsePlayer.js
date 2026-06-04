// Floating time-lapse player — anchored bottom of map, restrained styling
const panel = {
  position: 'absolute',
  bottom: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#ffffff',
  border: '1px solid #cdd1ca',
  borderRadius: 4,
  padding: '10px 14px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minWidth: 520,
  maxWidth: '90%',
  zIndex: 10,
  fontFamily: 'inherit',
};

const btn = (active = false) => ({
  padding: '5px 12px',
  border: '1px solid #cdd1ca',
  background: active ? '#1f6f43' : '#ffffff',
  color: active ? '#fff' : '#1f2421',
  borderRadius: 3,
  fontSize: 12.5,
  cursor: 'pointer',
  fontWeight: 500,
  minWidth: 32,
  transition: 'all 120ms ease',
});

const openBtn = {
  position: 'absolute',
  bottom: 16,
  right: 60,
  padding: '7px 14px',
  border: '1px solid #cdd1ca',
  background: '#ffffff',
  color: '#1f2421',
  borderRadius: 3,
  fontSize: 12.5,
  fontWeight: 500,
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
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
              title="เปิดโหมด Time-lapse" aria-label="เปิด Time-lapse">
        Time-lapse
      </button>
    );
  }

  if (loading) {
    return (
      <div style={panel}>
        <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 13, color: '#1f2421' }}>
          กำลังโหลดข้อมูล time-lapse…
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: 12.5, color: '#6b736d' }}>
            โหลดข้อมูล time-lapse ไม่สำเร็จ
          </div>
          <button style={btn()} onClick={fetchTimelapse}>ลองใหม่</button>
          <button style={btn()} onClick={close} aria-label="ปิด">ปิด</button>
        </div>
      </div>
    );
  }

  if (!data.years?.length || year == null) {
    return (
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: 12.5, color: '#6b736d' }}>
            ไม่มีข้อมูล NDVI cache เพียงพอ — คลิกบางจังหวัดเพื่อ compute ก่อน
          </div>
          <button style={btn()} onClick={close} aria-label="ปิด">ปิด</button>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
        <span style={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#3a423d',
        }}>
          Time-lapse · NDVI
        </span>
        <span style={{
          color: '#6b736d',
          fontFamily: 'IBM Plex Mono, monospace',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {minY}–{maxY}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ color: '#6b736d', fontSize: 11.5 }}>
          {data.province_count} จังหวัด
        </span>
        <button style={btn()} onClick={close} aria-label="ปิด">ปิด</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={btn()} onClick={stepBack} disabled={idx <= 0} aria-label="ปีก่อนหน้า">‹</button>
        <button style={btn(playing)} onClick={togglePlay} aria-label={playing ? 'หยุด' : 'เล่น'}>
          {playing ? '❚❚' : '▸'}
        </button>
        <button style={btn()} onClick={stepFwd} disabled={idx >= data.years.length - 1} aria-label="ปีถัดไป">›</button>

        <input type="range" min={0} max={data.years.length - 1} step={1}
               value={idx} onChange={onSlider}
               style={{ flex: 1, accentColor: '#1f6f43' }}
               aria-label="เลื่อนเลือกปี" />

        <span style={{
          minWidth: 48, textAlign: 'center', fontWeight: 600,
          color: '#0b0d0c', fontSize: 14,
          fontFamily: 'IBM Plex Mono, monospace',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {year}
        </span>

        <select value={speed} onChange={e => setSpeed(Number(e.target.value))}
                style={{ ...btn(), padding: '5px 8px' }} aria-label="ความเร็ว">
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={4}>4×</option>
        </select>
      </div>
    </div>
  );
}
