// Urban Subset (Phase B-3) — WHO-comparable green-per-person ในเขต Built-up.
import { fmt, fmtInt } from '../helpers';
import { COLOR, sectionTitle, table, calloutBox, note } from '../components';

export const urbanSections = (ctx) => {
  const { urbanResp, ndviStats } = ctx;
  // ตอบโจทย์ "WHO 9 m²/คน เปรียบกับอะไรกันแน่?" โดย clip ด้วย ESA WorldCover Built-up
  if (!(urbanResp && urbanResp.urban_area_km2 != null && urbanResp.urban_area_km2 > 0)) return [];

  const u = urbanResp;
  // wrap ทั้ง section ใน no-split เพื่อกัน heading หลุดท้ายหน้าก่อน (section นี้ ~430px เข้าหน้าเดียวได้)
  let uHtml = '<div class="no-split" style="page-break-inside:avoid;break-inside:avoid;">';
  uHtml += sectionTitle(
    `พื้นที่สีเขียวในเขตเมือง (Urban Subset · WHO-comparable)`,
    { color: COLOR.greenDeep }
  );
  uHtml += note(
    `วิเคราะห์เฉพาะภายในเขต <b>Built-up</b> (ESA WorldCover v200, class 50, ปี ${u.worldcover_year}) ` +
    `— เป็น proxy ของ "เขตชุมชน/เทศบาล" ที่ตรงกับเจตนาเดิมของเกณฑ์ WHO 9 m²/คน ` +
    `("accessible green space" ในเมือง) มากกว่าค่ารวมระดับจังหวัดที่นับรวมป่าและเกษตรนอกเมือง`
  );

  const urbanRows = [
    ['พื้นที่ Built-up', `${fmt(u.urban_area_km2, 2)} km²`,
     `${fmt(u.urban_share_pct, 2)}% ของจังหวัด`],
    ['NDVI Mean (ในเขต Built-up)',
     u.ndvi_mean_urban != null ? fmt(u.ndvi_mean_urban, 3) : '—',
     u.ndvi_mean_urban != null && u.ndvi_mean_urban < 0.3
       ? 'ต่ำ — สอดคล้องกับเขตชุมชนทั่วไป'
       : 'พืชพรรณในเขตเมืองดี'],
    ['พื้นที่สีเขียวในเขต Built-up',
     `${fmt(u.green_in_urban_km2, 2)} km²`,
     `${fmt(u.green_share_in_urban_pct, 1)}% ของ Built-up`],
    ['ประชากรในเขต Built-up', fmtInt(u.population_urban),
     'จาก WorldPop ' + u.worldpop_year + ' (mask ด้วย Built-up)'],
    ['พื้นที่สีเขียว/คน (Urban)',
     u.m2_per_person_urban != null ? `${fmt(u.m2_per_person_urban, 2)} m²` : '—',
     u.who_urban_pass ? '✅ ผ่าน WHO 9 m²/คน' : '⚠️ ต่ำกว่า WHO 9 m²/คน'],
  ];
  uHtml += table(
    ['ตัวชี้วัด', 'ค่า', 'การตีความ'],
    urbanRows,
    { firstColWidth: 200, keepTogether: true }
  );

  // Comparison callout — ระดับจังหวัด vs Urban
  if (ndviStats?.green_area_m2_per_person != null && u.m2_per_person_urban != null) {
    const provVal = ndviStats.green_area_m2_per_person;
    const urbanVal = u.m2_per_person_urban;
    const ratio = provVal > 0 ? (urbanVal / provVal) : 0;
    const interpretation = u.who_urban_pass
      ? `<b>ผ่าน WHO 9 m²/คน ในเขตเมืองจริง</b> — มีพื้นที่สวนสาธารณะ/ต้นไม้ริมถนนในชุมชนเพียงพอตามมาตรฐาน`
      : `<b>ต่ำกว่า WHO 9 m²/คน ในเขตเมืองจริง</b> — ขาดแคลน <b>${(9 - urbanVal).toFixed(1)} m²/คน</b> · ` +
        `เพื่อผ่านเกณฑ์ ต้องเพิ่ม ~<b>${((9 - urbanVal) * u.population_urban / 1_000_000).toFixed(2)} km²</b> ของพื้นที่สีเขียวในเขตเมือง`;
    uHtml += calloutBox(
      `<b>เปรียบเทียบ:</b><br/>` +
      `• ระดับจังหวัด (รวมป่า+เกษตร): <b>${fmt(provVal, 2)} m²/คน</b><br/>` +
      `• ในเขต Built-up เท่านั้น: <b>${fmt(urbanVal, 2)} m²/คน</b> (${(ratio * 100).toFixed(1)}% ของค่ารวม)<br/>` +
      `<br/>${interpretation}`,
      u.who_urban_pass ? COLOR.green : COLOR.orange
    );
  }

  uHtml += note(
    `* ESA WorldCover v200 อัปเดตล่าสุดปี 2021 — ใช้เป็น proxy ของ urban extent ในทุกปีที่วิเคราะห์ ` +
    `(สิ่งปลูกสร้างเปลี่ยนแปลงน้อยใน timescale 2-5 ปี) · WorldPop ใช้ปี ${u.worldpop_year}`
  );
  uHtml += '</div>';

  return [{ label: 'Urban', html: uHtml }];
};
