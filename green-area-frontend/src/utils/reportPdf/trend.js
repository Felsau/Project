// buildTrendReport — yearly trend for a single province/metric.
import { ts, fmt } from './helpers';
import { COLOR, cover, sectionTitle, table, calloutBox } from './components';
import { renderSegmentsToPdf } from './layout';

export const buildTrendReport = async (data) => {
  const { selectedProvince, selectedProvinceEN, trendData, trendMetric } = data;
  const docTitle = `Trend Report — ${selectedProvinceEN}`;

  const sections = [];
  sections.push({
    label: 'Cover',
    html: cover({
      kicker: 'YEARLY TREND',
      heading: selectedProvince,
      subheading: `แนวโน้ม ${trendMetric === 'ndvi_mean' ? 'NDVI' : 'พื้นที่สีเขียว'} รายปี`,
    }),
  });

  let h = sectionTitle('ข้อมูลรายปี');
  h += table(
    ['ปี', 'NDVI Mean', 'พื้นที่สีเขียว'],
    trendData.map(d => [
      String(d.year), fmt(d.ndvi_mean, 3),
      d.green_area_pct != null ? `${fmt(d.green_area_pct, 2)}%` : '—',
    ])
  );
  if (trendData.length >= 2) {
    const first = trendData[0], last = trendData[trendData.length - 1];
    if (first[trendMetric] != null && last[trendMetric] != null) {
      const diff = last[trendMetric] - first[trendMetric];
      const sign = diff >= 0 ? '↑ เพิ่มขึ้น' : '↓ ลดลง';
      const color = diff >= 0 ? COLOR.green : COLOR.red;
      h += calloutBox(
        `<b>${sign} ${Math.abs(diff).toFixed(trendMetric === 'ndvi_mean' ? 3 : 2)}</b> จากปี ${first.year} → ${last.year}`,
        color
      );
    }
  }
  sections.push({ label: 'Trend Data', html: h });

  await renderSegmentsToPdf(sections, `trend_report_${selectedProvinceEN || 'province'}_${ts()}.pdf`, { docTitle });
};
