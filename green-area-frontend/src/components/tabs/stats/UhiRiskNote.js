// Urban Heat Island risk note — combines low NDVI + high LST into a risk tone.
import { Note } from '../../ui/Metric';

export default function UhiRiskNote({ ndviStats, lstStats, selectedDistrict }) {
  if (selectedDistrict || ndviStats?.ndvi_mean == null || lstStats?.lst_mean == null) return null;

  const ndvi = ndviStats.ndvi_mean;
  const lst  = lstStats.lst_mean;
  const tone =
    (ndvi < 0.25 && lst >= 35) ? 'crit' :
    ((ndvi < 0.3 && lst >= 32) || ndvi < 0.2 || (ndvi < 0.4 && lst >= 30)) ? 'warn' :
    'default';
  const label =
    tone === 'crit' ? 'วิกฤต' :
    tone === 'warn' ? 'เสี่ยง' :
    'เสี่ยงต่ำ';
  const cooling = ndvi < 0.5 ? ((0.5 - ndvi) * 10).toFixed(1) : null;

  return (
    <Note tone={tone} label="Urban Heat Island · ความเสี่ยงเกาะความร้อน">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span>ระดับ: <strong>{label}</strong></span>
        <span className="note__num">NDVI {ndvi.toFixed(3)} / LST {lst}°C</span>
      </div>
      {cooling && (
        <div>
          หากเพิ่มพืชพรรณให้ NDVI ถึง 0.5 ศักยภาพลดความร้อนได้ <span className="note__num">~{cooling}°C</span>
        </div>
      )}
    </Note>
  );
}
