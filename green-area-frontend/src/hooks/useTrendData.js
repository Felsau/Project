import { useCallback, useState } from 'react';
import { API_BASE, CURRENT_YEAR } from '../constants';

export function useTrendData() {
  const [trendYears, setTrendYears]     = useState([CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]);
  const [trendData, setTrendData]       = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendProgress, setTrendProgress] = useState('');
  const [trendMetric, setTrendMetric]   = useState('ndvi_mean');

  const fetchTrend = async (provinceName, years) => {
    if (!years.length) return;
    setTrendLoading(true);
    setTrendData([]);
    setTrendProgress('');
    const sorted = [...years].sort((a, b) => a - b);
    const results = [];
    for (let i = 0; i < sorted.length; i++) {
      const year = sorted[i];
      setTrendProgress(`กำลังโหลดปี ${year} (${i + 1}/${sorted.length})...`);
      try {
        const res  = await fetch(`${API_BASE}/ndvi/${encodeURIComponent(provinceName)}?year=${year}`);
        const json = await res.json();
        if (json.ndvi_mean != null) {
          results.push({ year, ndvi_mean: json.ndvi_mean, green_area_pct: json.green_area_pct });
          setTrendData([...results]);
        }
      } catch (err) {
        console.error(`fetchTrend year ${year}:`, err);
      }
    }
    setTrendProgress('');
    setTrendLoading(false);
  };

  const toggleTrendYear = (year) => {
    setTrendYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort((a, b) => a - b)
    );
  };

  const resetTrend = useCallback(() => setTrendData([]), []);

  return {
    trendYears, trendData, trendLoading, trendProgress, trendMetric,
    setTrendMetric, fetchTrend, toggleTrendYear, resetTrend,
  };
}
