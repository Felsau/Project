import { useCallback, useState } from 'react';
import { API_BASE, CURRENT_YEAR } from '../constants';
import { pushError } from '../utils/toast';
import { fetchWithRetry } from '../utils/fetchRetry';

// NDVI ↔ LST cooling analysis (province-level, reads cached district rows).
// Fetch-on-demand like useTrendData — no auto-fetch on province select.
export function useCoolingData() {
  const [coolingData, setCoolingData]       = useState(null);
  const [coolingLoading, setCoolingLoading] = useState(false);
  const [coolingYear, setCoolingYear]       = useState(CURRENT_YEAR);

  const fetchCooling = async (provinceName, year) => {
    if (!provinceName) return;
    setCoolingLoading(true);
    setCoolingData(null);
    try {
      const res = await fetchWithRetry(
        `${API_BASE}/analysis/cooling/${encodeURIComponent(provinceName)}?year=${year}`);
      const json = await res.json();
      if (res.ok) {
        setCoolingData(json);
      } else {
        pushError(`วิเคราะห์ความเย็นไม่สำเร็จ — ${json.detail || 'ลองอีกครั้ง'}`);
      }
    } catch (err) {
      console.error('fetchCooling:', err);
      pushError('โหลดข้อมูลวิเคราะห์ความเย็นไม่สำเร็จ — ลองอีกครั้ง');
    } finally {
      setCoolingLoading(false);
    }
  };

  const resetCooling = useCallback(() => setCoolingData(null), []);

  return {
    coolingData, coolingLoading, coolingYear,
    setCoolingYear, fetchCooling, resetCooling,
  };
}
