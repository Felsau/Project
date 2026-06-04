// Monthly NDVI/LST bar chart — recharts, per-bar coloring by value.
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getNdviColor, getLstColor } from '../../../colorUtils';

export default function MonthlyChart({ data, kind = 'ndvi', height = 130 }) {
  const fmt = (v) => kind === 'ndvi' ? [v?.toFixed(3), 'NDVI'] : [v?.toFixed(1) + '°C', 'LST'];
  const colorFn = kind === 'ndvi' ? getNdviColor : getLstColor;
  // NDVI is 0..1; LST is roughly 20–50°C — auto-fit with 2° padding so bars
  // never collapse to zero height when all months sit in a tight range.
  const yDomain = kind === 'ndvi'
    ? [0, 1]
    : [(min) => Math.max(0, Math.floor(min) - 2), (max) => Math.ceil(max) + 2];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fill: '#6b736d', fontSize: 10 }} axisLine={{ stroke: '#cdd1ca' }} tickLine={false} />
        <YAxis
          domain={yDomain}
          allowDecimals={kind === 'ndvi'}
          tick={{ fill: '#6b736d', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #cdd1ca', borderRadius: 3, fontSize: 12, padding: '4px 8px' }}
          formatter={fmt} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey={kind} radius={[1, 1, 0, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={colorFn(entry[kind])} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
