// buildCompareReport — side-by-side multi-province comparison for a single year.
import { PROVINCE_TH } from '../../constants';
import { ts, fmt, fmtInt } from './helpers';
import { cover, sectionTitle, table } from './components';
import { renderSegmentsToPdf } from './layout';

export const buildCompareReport = async (data) => {
  const { compareData, compareYear, compareMetric } = data;
  const docTitle = `Province Comparison — ${compareYear}`;

  const sections = [];
  sections.push({
    label: 'Cover',
    html: cover({
      kicker: 'PROVINCE COMPARISON',
      heading: `เปรียบเทียบ ${compareData.length} จังหวัด`,
      subheading: `ปี ${compareYear} · ${compareMetric === 'ndvi_mean' ? 'NDVI' : 'พื้นที่สีเขียว'}`,
    }),
  });

  let h = sectionTitle('ตารางเปรียบเทียบ');
  const sorted = [...compareData].sort(
    (a, b) => (b[compareMetric] || 0) - (a[compareMetric] || 0)
  );
  h += table(
    ['อันดับ', 'จังหวัด', 'NDVI Mean', 'พื้นที่สีเขียว %', 'Green Area km²'],
    sorted.map((d, i) => [
      String(i + 1),
      PROVINCE_TH[d.province] || d.province,
      fmt(d.ndvi_mean, 3),
      d.green_area_pct != null ? `${fmt(d.green_area_pct, 2)}%` : '—',
      d.green_area_km2 != null ? fmtInt(d.green_area_km2) : '—',
    ])
  );
  sections.push({ label: 'Comparison', html: h });

  await renderSegmentsToPdf(sections, `compare_report_${compareYear}_${ts()}.pdf`, { docTitle });
};
