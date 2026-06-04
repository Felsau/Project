// Time-series (Phase B-2) — แนวโน้ม NDVI/Green%/LST รายปีย้อนหลัง.
import { COLOR, sectionTitle, calloutBox, note } from '../components';
import { yearlyLineChart } from '../charts';

export const timeseriesSections = (ctx) => {
  const { timeseriesResp } = ctx;
  if (!(timeseriesResp?.data?.length > 0)) return [];

  const tsr = timeseriesResp;
  let tsHtml = sectionTitle(
    `แนวโน้มย้อนหลัง ${tsr.start_year}–${tsr.end_year}`,
    { color: COLOR.primary }
  );
  tsHtml += note(
    `แสดง <b>${tsr.years_with_data} ปี</b> จาก ${tsr.years_in_range} ปีในช่วงที่ระบุ — เฉพาะปีที่มี cache · ` +
    `ปีที่ขาดหาย = ยังไม่ได้คำนวณในระบบ (ต้องเปิดดูในแอปก่อนเพื่อ trigger compute)`
  );

  // Delta callout (จุดแรก → จุดสุดท้าย)
  const sm = tsr.summary || {};
  const deltaParts = [];
  if (sm.ndvi_delta != null) {
    const arrowSym = Math.abs(sm.ndvi_delta) < 0.005 ? '—'
                   : sm.ndvi_delta > 0 ? '↑' : '↓';
    const cName = sm.ndvi_delta > 0 ? 'เพิ่มขึ้น' : sm.ndvi_delta < 0 ? 'ลดลง' : 'ทรงตัว';
    deltaParts.push(`<b>NDVI ${sm.ndvi_first_year} → ${sm.ndvi_last_year}:</b> ${arrowSym} ${Math.abs(sm.ndvi_delta).toFixed(3)} (${cName})`);
  }
  if (sm.lst_delta != null) {
    const arrowSym = Math.abs(sm.lst_delta) < 0.05 ? '—'
                   : sm.lst_delta > 0 ? '↑' : '↓';
    const cName = sm.lst_delta > 0 ? 'ร้อนขึ้น' : sm.lst_delta < 0 ? 'เย็นลง' : 'ทรงตัว';
    deltaParts.push(`<b>LST ${sm.lst_first_year} → ${sm.lst_last_year}:</b> ${arrowSym} ${Math.abs(sm.lst_delta).toFixed(2)}°C (${cName})`);
  }
  if (deltaParts.length > 0) {
    tsHtml += calloutBox(deltaParts.join('<br/>'), COLOR.primary);
  }

  if (tsr.data.some(d => d.ndvi_mean != null)) {
    tsHtml += yearlyLineChart({
      title: 'NDVI Mean — แนวโน้มรายปี',
      subtitle: 'ค่าเฉลี่ย NDVI ของ pixel ทั้งหมด (อ้างอิง median composite ทั้งปี)',
      data: tsr.data, valueKey: 'ndvi_mean',
      valueLabel: 'NDVI (0–1)',
      color: COLOR.green,
      valueFmt: (v) => v != null ? v.toFixed(3) : '',
    });
  }

  if (tsr.data.some(d => d.green_area_pct != null)) {
    tsHtml += yearlyLineChart({
      title: 'พื้นที่สีเขียว % — แนวโน้มรายปี',
      subtitle: 'สัดส่วนพื้นที่ NDVI > 0.3 ต่อพื้นที่ทั้งหมด',
      data: tsr.data, valueKey: 'green_area_pct',
      valueLabel: '%',
      color: COLOR.greenDeep,
      valueFmt: (v) => v != null ? `${v.toFixed(1)}%` : '',
    });
  }

  if (tsr.data.some(d => d.lst_mean != null)) {
    tsHtml += yearlyLineChart({
      title: 'LST Mean — แนวโน้มรายปี',
      subtitle: 'ค่าเฉลี่ย Land Surface Temperature (median composite ทั้งปี)',
      data: tsr.data, valueKey: 'lst_mean',
      valueLabel: '°C',
      color: COLOR.orange,
      valueFmt: (v) => v != null ? `${v.toFixed(1)}°` : '',
    });
  }

  tsHtml += note(
    `* ใช้ปีปัจจุบัน (${tsr.end_year}) เป็นข้อมูลปีบางส่วน — ค่าอาจยังไม่สมบูรณ์เมื่อยังไม่ครบทุกฤดูกาล`
  );

  return [{ label: 'Time-series', html: tsHtml }];
};
