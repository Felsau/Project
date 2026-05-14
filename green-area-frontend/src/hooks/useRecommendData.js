import { useState, useCallback } from 'react';
import { API_BASE, CURRENT_YEAR } from '../constants';
import { pushError } from '../utils/toast';
import { fetchWithRetry } from '../utils/fetchRetry';

// Default น้ำหนัก — ตรงกับ backend (W_NDVI / W_LST / W_POP)
export const DEFAULT_WEIGHTS = { ndvi: 0.40, lst: 0.30, pop: 0.30 };

export function useRecommendData() {
  const [recommendData, setRecommendData]       = useState(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendVisible, setRecommendVisible] = useState(true);
  const [recommendScope, setRecommendScope]     = useState(null); // {province, district?, year}
  const [recommendYear, setRecommendYear]       = useState(CURRENT_YEAR);
  const [recommendWeights, setRecommendWeights] = useState(DEFAULT_WEIGHTS);

  const fetchRecommendation = useCallback(async (provinceEN, districtEN = null, year, weights) => {
    setRecommendLoading(true);
    setRecommendData(null);
    try {
      const enc  = encodeURIComponent;
      const path = districtEN
        ? `/recommend/${enc(provinceEN)}/districts/${enc(districtEN)}`
        : `/recommend/${enc(provinceEN)}`;
      const params = new URLSearchParams();
      if (year) params.set('year', year);
      if (weights) {
        params.set('w_ndvi', weights.ndvi);
        params.set('w_lst',  weights.lst);
        params.set('w_pop',  weights.pop);
      }
      const qs  = params.toString();
      const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
      const res  = await fetchWithRetry(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRecommendData(json);
      setRecommendScope({ province: provinceEN, district: districtEN, year: year || CURRENT_YEAR });
      setRecommendVisible(true);
    } catch (err) {
      console.error('fetchRecommendation error:', err);
      setRecommendData(null);
      pushError('วิเคราะห์ AI Recommend ไม่สำเร็จ — ลองอีกครั้ง');
    } finally {
      setRecommendLoading(false);
    }
  }, []);

  const resetRecommend = useCallback(() => {
    setRecommendData(null);
    setRecommendScope(null);
  }, []);

  return {
    recommendData, recommendLoading, recommendVisible, recommendScope, recommendYear,
    recommendWeights, setRecommendWeights,
    setRecommendVisible, setRecommendYear, fetchRecommendation, resetRecommend,
  };
}
