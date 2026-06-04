// Custom HTML/CSS/SVG chart blocks — yearly line chart + monthly bar chart.
// Rendered as HTML so html2canvas captures crisp axes/labels with Thai font.
import { COLOR, niceStep } from './components';
import { MONTH_NAMES_TH } from './helpers';

// ตำแหน่ง transform ของ value label ตาม % ของแกน X
// — ขอบซ้าย/ขวาให้ anchor ฝั่งเดียว ไม่ทับ y-axis tick หรือ overflow ออกขวา
const _xLabelTransform = (xPct) => {
  if (xPct < 6) return 'translateX(0)';
  if (xPct > 94) return 'translateX(-100%)';
  return 'translateX(-50%)';
};

// Yearly line chart — สำหรับ multi-year trend (Phase B-2)
export const yearlyLineChart = ({
  title, subtitle, data, valueKey, valueLabel,
  color = COLOR.green, valueFmt = (v) => v?.toFixed(2),
  yMinPad = 0.05, yMaxPad = 0.05, footnote = null,
}) => {
  const points = data.filter(d => d[valueKey] != null);
  if (points.length === 0) {
    return `<div class="chart-block" style="margin:6px 40px 14px;padding:12px 14px;background:#fff;border:1px solid ${COLOR.border};border-radius:6px;">
      <div style="font-size:11.5pt;font-weight:700;color:${COLOR.text};">${title}</div>
      <div style="font-size:9pt;color:${COLOR.muted};margin-top:6px;">ไม่มีข้อมูล cached ในช่วงปีที่ระบุ</div>
    </div>`;
  }

  // Single-point: แสดงเป็น stat card แทน line chart
  // (กราฟเส้นจุดเดียวกับสเกล y แคบจัดดูเข้าใจผิดง่าย)
  if (points.length === 1) {
    const p = points[0];
    return `
      <div class="chart-block" style="margin:6px 40px 14px;padding:14px 18px;background:#fff;border:1px solid ${COLOR.border};border-radius:6px;page-break-inside:avoid;break-inside:avoid;">
        <div style="font-size:11.5pt;font-weight:700;color:${COLOR.text};">${title}</div>
        ${subtitle ? `<div style="font-size:9pt;color:${COLOR.muted};margin-top:2px;">${subtitle}</div>` : ''}
        <div style="display:flex;align-items:baseline;gap:14px;margin-top:10px;padding:12px 16px;background:#f8f9fa;border-left:3px solid ${color};border-radius:4px;">
          <div style="font-size:18pt;font-weight:700;color:${color};font-family:monospace;">${valueFmt(p[valueKey])}</div>
          <div style="font-size:10pt;color:${COLOR.muted};">ปี ${p.year}${valueLabel ? ` · ${valueLabel}` : ''}</div>
        </div>
        <div style="font-size:8.5pt;color:${COLOR.muted};margin-top:8px;font-style:italic;line-height:1.5;">
          มีข้อมูล cached ปีเดียว — ยังไม่สามารถแสดงแนวโน้มได้ · เปิดดูปีอื่นในแอปก่อน trigger compute เพื่อให้รายงานครั้งถัดไปมีเส้นแนวโน้ม
        </div>
      </div>
    `;
  }

  const values = points.map(p => p[valueKey]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || 1;
  let yMin = rawMin - span * yMinPad;
  let yMax = rawMax + span * yMaxPad;
  const step = niceStep(yMax - yMin, 4);
  yMin = Math.floor(yMin / step) * step;
  yMax = Math.ceil(yMax / step) * step;
  const range = yMax - yMin || 1;
  const tickCount = Math.max(2, Math.round(range / step));
  const gridValues = Array.from({ length: tickCount + 1 }, (_, i) => yMin + i * step);

  const chartH = 150;
  const chartW = 560;

  const years = points.map(p => p.year);
  const xMin = Math.min(...years), xMax = Math.max(...years);
  const xRange = xMax - xMin || 1;
  const yearToX = (y) => points.length === 1 ? chartW / 2 : ((y - xMin) / xRange) * chartW;
  const valToY = (v) => chartH - ((v - yMin) / range) * chartH;

  const linePoints = points.map(p => `${yearToX(p.year).toFixed(1)},${valToY(p[valueKey]).toFixed(1)}`).join(' ');

  return `
    <div class="chart-block" style="margin:6px 40px 14px;padding:12px 14px 10px;background:#fff;border:1px solid ${COLOR.border};border-radius:6px;page-break-inside:avoid;break-inside:avoid;">
      <div style="margin-bottom:8px;">
        <div style="font-size:11.5pt;font-weight:700;color:${COLOR.text};">${title}</div>
        ${subtitle ? `<div style="font-size:9pt;color:${COLOR.muted};margin-top:2px;">${subtitle}</div>` : ''}
      </div>

      <div style="display:flex;gap:8px;">
        <div style="width:46px;height:${chartH}px;position:relative;flex-shrink:0;">
          ${gridValues.map((v, i) => {
            const top = chartH - (i / tickCount * chartH);
            return `<div style="position:absolute;right:0;top:${top - 6}px;font-size:8pt;color:${COLOR.muted};font-family:monospace;">${valueFmt(v)}</div>`;
          }).join('')}
        </div>

        <div style="flex:1;position:relative;height:${chartH}px;border-left:1px solid ${COLOR.border};border-bottom:1px solid ${COLOR.border};overflow:visible;">
          ${gridValues.map((_, i) => {
            const top = chartH - (i / tickCount * chartH);
            return `<div style="position:absolute;left:0;right:0;top:${top}px;border-top:1px dashed ${COLOR.light};"></div>`;
          }).join('')}

          <svg viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="none"
               style="position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;">
            ${points.length >= 2
              ? `<polyline points="${linePoints}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`
              : ''}
            ${points.map(p => {
              const x = yearToX(p.year);
              const y = valToY(p[valueKey]);
              return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
            }).join('')}
          </svg>

          ${points.map(p => {
            const xPct = ((p.year - xMin) / xRange) * 100;
            const yPx = valToY(p[valueKey]);
            return `<div style="position:absolute;left:${xPct.toFixed(1)}%;top:${(yPx - 18).toFixed(1)}px;transform:${_xLabelTransform(xPct)};font-size:7.5pt;color:${COLOR.text};font-weight:700;font-family:monospace;background:#ffffffcc;padding:0 3px;border-radius:2px;">${valueFmt(p[valueKey])}</div>`;
          }).join('')}
        </div>
      </div>

      <div style="position:relative;height:14px;margin:4px 4px 0 54px;">
        ${points.map(p => {
          const xPct = ((p.year - xMin) / xRange) * 100;
          return `<div style="position:absolute;left:${xPct.toFixed(1)}%;top:0;transform:${_xLabelTransform(xPct)};font-size:8pt;color:${COLOR.muted};">${p.year}</div>`;
        }).join('')}
      </div>

      <div style="margin-top:6px;display:flex;justify-content:space-between;gap:14px;">
        <div style="font-size:8pt;color:${COLOR.muted};line-height:1.5;flex:1;">${footnote || ''}</div>
        ${valueLabel ? `<div style="font-size:8pt;color:${COLOR.muted};font-style:italic;white-space:nowrap;">หน่วย: ${valueLabel}</div>` : ''}
      </div>
    </div>
  `;
};

// Monthly bar chart — always renders 12 months; distinguishes "no data" (cloud/missing) vs "future".
export const monthlyBarChart = ({
  title, subtitle, year, unit, data, valueKey, color = COLOR.green,
  yMax, yMin = 0, valueFmt = (v) => v?.toFixed(2),
  refLine = null, footnote = null,
}) => {
  // Clone each item so we can attach _future/_missing flags
  // (React state objects are frozen — direct mutation throws TypeError)
  const today = new Date();
  const isCurrentYear = year && Number(year) === today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const full = Array.from({ length: 12 }, (_, i) => {
    const found = data.find(d => d.month_num === i + 1);
    const base = found
      ? { ...found }
      : { month_num: i + 1, [valueKey]: null, image_count: 0 };
    base._future = isCurrentYear && base.month_num > currentMonth && base[valueKey] == null;
    base._missing = !base._future && base[valueKey] == null;
    return base;
  });

  const values = full.map(d => d[valueKey]).filter(v => v != null);
  const computedMax = values.length ? Math.max(...values) : 1;
  let max = yMax != null ? yMax : Math.max(computedMax * 1.1, 1);
  const min = yMin;

  const step = niceStep(max - min, 5);
  max = Math.ceil(max / step) * step;
  const range = max - min || 1;
  const tickCount = Math.round(range / step);
  const gridValues = Array.from({ length: tickCount + 1 }, (_, i) => min + i * step);

  const chartH = 180;
  const refY = refLine != null && refLine >= min && refLine <= max
    ? chartH - ((refLine - min) / range * chartH)
    : null;

  const dataStartedAt = full.find(d => d._missing) ? 'มีข้อมูลขาดบางเดือน — ดูหมายเหตุท้ายกราฟ' : null;

  return `
    <div class="chart-block" style="margin:6px 40px 14px;padding:12px 14px 10px;background:#fff;border:1px solid ${COLOR.border};border-radius:6px;page-break-inside:avoid;break-inside:avoid;">
      <div style="margin-bottom:8px;">
        <div style="font-size:11.5pt;font-weight:700;color:${COLOR.text};">${title}${year ? ` · ปี ${year}` : ''}</div>
        ${subtitle ? `<div style="font-size:9pt;color:${COLOR.muted};margin-top:2px;">${subtitle}</div>` : ''}
      </div>

      <div style="display:flex;gap:8px;">
        <div style="width:42px;height:${chartH}px;position:relative;flex-shrink:0;">
          ${gridValues.map((v, i) => {
            const top = chartH - (i / tickCount * chartH);
            return `<div style="position:absolute;right:0;top:${top - 6}px;font-size:8pt;color:${COLOR.muted};font-family:monospace;">${valueFmt(v)}</div>`;
          }).join('')}
        </div>

        <div style="flex:1;position:relative;height:${chartH}px;border-left:1px solid ${COLOR.border};border-bottom:1px solid ${COLOR.border};">
          ${gridValues.map((v, i) => {
            const top = chartH - (i / tickCount * chartH);
            return `<div style="position:absolute;left:0;right:0;top:${top}px;border-top:1px dashed ${COLOR.light};"></div>`;
          }).join('')}

          ${refY != null ? `
            <div style="position:absolute;left:0;right:0;top:${refY}px;border-top:1.5px dashed #ef4444;"></div>
            <div style="position:absolute;right:4px;top:${refY - 14}px;font-size:8pt;color:#ef4444;font-weight:700;">WHO ${valueFmt(refLine)}</div>
          ` : ''}

          <div style="position:absolute;left:0;right:0;bottom:0;top:0;display:flex;align-items:flex-end;gap:3px;padding:0 4px;">
            ${full.map((d) => {
              const v = d[valueKey];
              const hasData = v != null;
              const h = hasData ? Math.max(2, ((v - min) / range) * chartH) : 0;
              if (hasData) {
                return `
                  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
                    <div style="font-size:7.5pt;color:${COLOR.text};margin-bottom:2px;font-family:monospace;font-weight:600;">${valueFmt(v)}</div>
                    <div style="width:80%;height:${h}px;background:${color};border-radius:2px 2px 0 0;"></div>
                  </div>`;
              }
              if (d._future) {
                return `
                  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
                    <div style="font-size:6.5pt;color:#bbb;margin-bottom:2px;">ยังไม่มา</div>
                    <div style="width:80%;height:${chartH * 0.92}px;background:repeating-linear-gradient(45deg,#f5f5f5,#f5f5f5 4px,#fff 4px,#fff 8px);border:1px dashed #ddd;border-radius:2px 2px 0 0;"></div>
                  </div>`;
              }
              return `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
                  <div style="font-size:6.5pt;color:#dc2626;margin-bottom:2px;font-weight:600;">N/A</div>
                  <div style="width:80%;height:${chartH * 0.92}px;background:repeating-linear-gradient(135deg,#fee2e2,#fee2e2 4px,#fff 4px,#fff 8px);border:1px dashed #fca5a5;border-radius:2px 2px 0 0;"></div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div style="display:flex;gap:3px;padding:4px 4px 0 50px;">
        ${full.map(d => `
          <div style="flex:1;text-align:center;font-size:8pt;color:${d._future ? '#bbb' : COLOR.muted};">${MONTH_NAMES_TH[d.month_num - 1]}</div>
        `).join('')}
      </div>

      <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:flex-start;gap:14px;">
        <div style="font-size:8pt;color:${COLOR.muted};line-height:1.5;flex:1;">
          ${footnote ? `${footnote}<br/>` : ''}
          ${dataStartedAt ? `เดือนที่แสดง <span style="color:#dc2626;font-weight:600;">N/A</span> = ไม่มีภาพดาวเทียมที่ผ่านเงื่อนไขเมฆในเดือนนั้น<br/>` : ''}
          ${full.some(d => d._future) ? `เดือนที่แสดง "ยังไม่มา" = อยู่ในอนาคต (ปีปัจจุบัน)` : ''}
        </div>
        ${unit ? `<div style="font-size:8pt;color:${COLOR.muted};font-style:italic;white-space:nowrap;">หน่วย: ${unit}</div>` : ''}
      </div>
    </div>
  `;
};
