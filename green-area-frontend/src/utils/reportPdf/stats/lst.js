// LST section (map + temperature table) + LST monthly chart.
import { fmt } from '../helpers';
import { COLOR, sectionTitle, table, note, imageBox } from '../components';
import { monthlyBarChart } from '../charts';

export const lstSections = (ctx) => {
  const {
    lstStats, lstMonthly, lstThumb, year,
    selectedProvince, selectedDistrict, districtPretty,
  } = ctx;
  if (!lstStats) return [];

  const out = [];

  let lstHtml = '';
  const lstTitle = sectionTitle(`LST · อุณหภูมิผิวพื้น · ปี ${year}`, { color: COLOR.red });
  const lstFig = lstThumb
    ? imageBox(lstThumb,
        `แผนที่ LST · ${selectedDistrict ? `อำเภอ ${districtPretty}, ${selectedProvince}` : `จังหวัด${selectedProvince}`} · Landsat 8/9 median ปี ${year}<br/>` +
        `<span style="font-family:monospace;">Palette: 20°C (น้ำเงิน) → 45°C (แดงเข้ม)</span>`,
        { heightHint: '320px' })
    : '';
  lstHtml += `<div class="no-split" style="page-break-inside:avoid;break-inside:avoid;">${lstTitle}${lstFig}</div>`;

  lstHtml += table(
    ['ตัวชี้วัด', 'ค่า'],
    [
      ['LST Mean', `${fmt(lstStats.lst_mean, 1)} °C`],
      ['LST Min', `${fmt(lstStats.lst_min, 1)} °C`],
      ['LST Max', `${fmt(lstStats.lst_max, 1)} °C (pixel ร้อนสุด)`],
    ],
    { firstColWidth: 200 }
  );
  lstHtml += note('LST = Land Surface Temperature จากดาวเทียม สูงกว่าอุณหภูมิอากาศ 5–20 °C ขึ้นกับชนิดผิว');

  out.push({ label: 'LST', html: lstHtml });

  if (lstMonthly?.length) {
    out.push({
      label: 'LST · Monthly',
      html: monthlyBarChart({
        title: 'LST รายเดือน',
        subtitle: 'ค่า median อุณหภูมิผิวพื้นในแต่ละเดือน',
        year, unit: '°C',
        data: lstMonthly, valueKey: 'lst',
        color: COLOR.orange,
        valueFmt: (v) => v != null ? v.toFixed(1) : '',
      }),
    });
  }

  return out;
};
