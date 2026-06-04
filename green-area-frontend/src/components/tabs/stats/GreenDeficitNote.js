// Green Deficit note — gap vs WHO 9 m²/person, expressed in m²/km²/rai.
import { Note } from '../../ui/Metric';

export default function GreenDeficitNote({ ndviStats }) {
  if (!(ndviStats?.green_area_m2_per_person != null && ndviStats?.population > 0)) return null;

  const current = ndviStats.green_area_m2_per_person;
  const deficit = Math.max(0, 9 - current);
  const deficitKm2 = (deficit * ndviStats.population / 1_000_000).toFixed(1);
  const deficitRai = Math.round(deficit * ndviStats.population / 1600).toLocaleString('th');
  const sev = current < 3 ? 'crit' : current < 9 ? 'warn' : 'default';
  const sevLabel = current < 3 ? 'วิกฤต' : current < 6 ? 'น้อยมาก' : current < 9 ? 'ต่ำกว่าเกณฑ์' : 'ผ่านเกณฑ์ WHO';

  return (
    <Note tone={sev} label="Green Deficit / WHO 9 m² ต่อคน">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span>สถานะ: <strong>{sevLabel}</strong></span>
        <span className="note__num">{current.toFixed(1)} / 9 m²</span>
      </div>
      {deficit > 0 ? (
        <div>
          ต้องเพิ่มอีก <span className="note__num">{deficit.toFixed(1)} m²</span> ต่อคน
          — เทียบเท่า <span className="note__num">{deficitKm2} km²</span> หรือ <span className="note__num">{deficitRai} ไร่</span>
        </div>
      ) : (
        <div>เกินมาตรฐาน WHO อยู่ <span className="note__num">{(current - 9).toFixed(1)} m²</span> ต่อคน</div>
      )}
    </Note>
  );
}
