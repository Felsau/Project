// Closing sections — Methodology / Conclusions / Limitations / References.
// รวม logic คำนวณ deficitText (Urban-comparable หรือ fallback ระดับจังหวัด) + comparisonText.
import {
  methodologySection, conclusionsSection,
  limitationsSection, referencesSection,
} from '../sections';

const buildComparisonText = (contextResp) => {
  if (!contextResp?.target?.ndvi_rank) return '';
  const N = contextResp.provinces_in_cache;
  return `จากการเทียบกับ ${N} จังหวัดที่มีข้อมูล cached ปัจจุบัน จังหวัดนี้อยู่ <b>อันดับ ${contextResp.target.ndvi_rank} จาก ${contextResp.target.ndvi_total_ranked}</b> ` +
    `— ดูรายชื่อจริงในตาราง "ลำดับ NDVI ใน N จังหวัดที่มีข้อมูล" ของส่วน Comparison · อันดับยังเปลี่ยนได้เมื่อมีข้อมูลครบ 77 จังหวัด`;
};

const buildDeficitText = (ndviStats, urbanResp) => {
  // ถ้ามี urban subset (Phase B-3) → ใช้เป็น primary metric เพราะตรงกับเจตนา WHO
  if (urbanResp?.m2_per_person_urban != null && urbanResp.population_urban > 0) {
    const curU = urbanResp.m2_per_person_urban;
    const deficitU = Math.max(0, 9 - curU);
    const provVal = ndviStats?.green_area_m2_per_person;
    const provNote = provVal != null
      ? ` <i>(ค่ารวมระดับจังหวัด ${provVal.toFixed(0)} m²/คน นับรวมป่า+เกษตรนอกเมืองด้วย จึงสูงเกินจริงสำหรับเปรียบ WHO)</i>`
      : '';
    if (deficitU > 0) {
      const deficitKm2 = (deficitU * urbanResp.population_urban / 1_000_000).toFixed(2);
      return `<b>เกณฑ์ WHO 9 m²/คน (Urban-comparable):</b> ในเขต Built-up พบ <b>${curU.toFixed(2)} m²/คน</b> ` +
        `— ต่ำกว่าเกณฑ์อยู่ <b>${deficitU.toFixed(1)} m²/คน</b> · ` +
        `ต้องเพิ่ม ~<b>${deficitKm2} km²</b> ของพื้นที่สีเขียวในเขตเมือง${provNote}`;
    }
    return `<b>เกณฑ์ WHO 9 m²/คน (Urban-comparable):</b> ในเขต Built-up พบ <b>${curU.toFixed(2)} m²/คน</b> ` +
      `✅ ผ่านเกณฑ์เกินมา <b>${(curU - 9).toFixed(1)} m²/คน</b>${provNote}`;
  }

  // Fallback: ไม่มี urban subset — ใช้ค่ารวมระดับจังหวัดพร้อม caveat
  if (ndviStats?.green_area_m2_per_person != null && ndviStats.population > 0) {
    const cur = ndviStats.green_area_m2_per_person;
    const deficit = Math.max(0, 9 - cur);
    if (deficit > 0) {
      const deficitKm2 = (deficit * ndviStats.population / 1_000_000).toFixed(1);
      return `พื้นที่สีเขียวต่อคน <b>${cur.toFixed(1)} m²</b> ต่ำกว่าเกณฑ์ตัวเลข WHO อยู่ <b>${deficit.toFixed(1)} m²/คน</b> ` +
        `ต้องเพิ่มอีก ~<b>${deficitKm2} km²</b> เพื่อผ่านเกณฑ์ <i>(หมายเหตุ: เกณฑ์ WHO หมายถึง accessible green ในเมือง — ดูข้อจำกัดด้านล่าง)</i>`;
    }
    return `ผ่านเกณฑ์ตัวเลข WHO เกินมา <b>${(cur - 9).toFixed(1)} m²/คน</b> ` +
      `แต่ตัวเลขนี้รวมป่าและพื้นที่เกษตรนอกเมืองด้วย — ส่วนพื้นที่ accessible จริงในเขตชุมชน อาจต่ำกว่ามาก`;
  }
  return '';
};

export const closingSections = (ctx) => {
  const { ndviStats, lstStats, urbanResp, contextResp, year } = ctx;
  return [
    { label: 'Methodology', html: methodologySection(year) },
    {
      label: 'Conclusions',
      html: conclusionsSection({
        ndvi: ndviStats,
        lst: lstStats,
        deficitInfo: buildDeficitText(ndviStats, urbanResp),
        comparison: buildComparisonText(contextResp),
      }),
    },
    { label: 'Limitations', html: limitationsSection() },
    { label: 'References', html: referencesSection() },
  ];
};
