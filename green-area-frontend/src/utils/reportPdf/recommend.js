// buildRecommendReport — AI tree-planting recommendations (weights + locations + species).
import { ts, esc, formatEnName } from './helpers';
import { COLOR, cover, sectionTitle, paragraph, table } from './components';
import { renderSegmentsToPdf } from './layout';

export const buildRecommendReport = async (data) => {
  const { recommendData, selectedProvince, selectedProvinceEN, selectedDistrict } = data;
  if (!recommendData) return;

  const districtEN = data.selectedDistrictEN || selectedDistrict;
  const districtPretty = formatEnName(districtEN);
  const docTitle = `AI Recommendation — ${selectedProvinceEN}${selectedDistrict ? ` / ${districtPretty}` : ''}`;
  const sections = [];

  sections.push({
    label: 'Cover',
    html: cover({
      kicker: 'AI RECOMMENDATION',
      heading: 'แผนปลูกต้นไม้เชิงพื้นที่',
      subheading: `${selectedProvince}${selectedDistrict ? ' — ' + districtPretty : ''}`,
      accent: COLOR.green,
    }),
  });

  let h = sectionTitle('วิธีการวิเคราะห์');
  const popYearNote = recommendData.worldpop_year ? ` ปี ${recommendData.worldpop_year}` : '';
  h += paragraph(
    `ระบบวิเคราะห์จุดที่เหมาะสมในการปลูกต้นไม้โดยถ่วงน้ำหนัก 4 ปัจจัย: ดัชนีพืชพรรณ <b>NDVI</b> (พื้นที่ที่ขาดต้นไม้), อุณหภูมิผิวพื้น <b>LST</b> (พื้นที่ร้อน), ความหนาแน่นประชากร (WorldPop 100m${popYearNote}) และระยะถึงพื้นที่สีเขียวเดิม (การเข้าถึง — ESA WorldCover)`
  );
  const w = recommendData.weights || {};
  const weightRows = [
    ['NDVI ต่ำ (ขาดต้นไม้)', `${(w.ndvi * 100).toFixed(0)}%`],
    ['LST สูง (ความร้อน)', `${(w.lst * 100).toFixed(0)}%`],
    ['ประชากรหนาแน่น', `${(w.population * 100).toFixed(0)}%`],
  ];
  if (w.access != null) weightRows.push(['เข้าถึงพื้นที่สีเขียวยาก', `${(w.access * 100).toFixed(0)}%`]);
  h += table(['ปัจจัย', 'น้ำหนัก'], weightRows, { firstColWidth: 240 });
  sections.push({ label: 'Method', html: h });

  if (recommendData.top_locations?.length > 0) {
    sections.push({
      label: 'Top จุดปลูก',
      html: sectionTitle(`Top ${recommendData.top_locations.length} จุดที่ควรปลูกต้นไม้`) +
        table(
          ['อันดับ', 'Latitude', 'Longitude', 'Score', 'ความเร่งด่วน'],
          recommendData.top_locations.map((p, i) => [
            String(i + 1),
            p.lat.toFixed(5), p.lng.toFixed(5),
            p.score.toFixed(3),
            p.score >= 0.7 ? 'เร่งด่วนสูง' : p.score >= 0.5 ? 'เร่งด่วน' : 'ปานกลาง',
          ])
        ),
    });
  }

  const sp = recommendData.recommended_species;
  if (sp?.species?.length > 0) {
    let sh = sectionTitle(`พันธุ์ไม้แนะนำ${sp.region ? ` (ภาค${sp.region})` : ''}`, { color: COLOR.green });
    sh += sp.species.map(s => `
      <div style="margin:6px 40px 10px;padding:12px 16px;background:#f8f9fa;border-radius:6px;border-left:3px solid ${COLOR.green};">
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
          <div style="font-size:13pt;font-weight:700;color:${COLOR.text};">${esc(s.name_th)}</div>
          <div style="font-size:9.5pt;font-style:italic;color:${COLOR.muted};">${esc(s.scientific || '')}</div>
        </div>
        <div style="font-size:10pt;color:${COLOR.text};margin-top:4px;">${esc(s.purpose)} · สูง ${esc(s.height_m)} ม.${s.traits?.length ? ' · ' + s.traits.map(esc).join(' / ') : ''}</div>
        <div style="font-size:9.5pt;color:${COLOR.muted};margin-top:4px;line-height:1.6;">เหตุผล: ${esc(s.reason)}</div>
      </div>
    `).join('');
    sections.push({ label: 'Species', html: sh });
  }

  await renderSegmentsToPdf(
    sections,
    `recommend_report_${(districtEN || selectedProvinceEN || 'thailand').replace(/\s+/g, '_')}_${ts()}.pdf`,
    { docTitle }
  );
};
