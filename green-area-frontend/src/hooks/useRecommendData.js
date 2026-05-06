import { useState, useCallback } from 'react';
import { API_BASE } from '../constants';

export function useRecommendData() {
  const [recommendData, setRecommendData]       = useState(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendVisible, setRecommendVisible] = useState(true);
  const [recommendScope, setRecommendScope]     = useState(null); // {province, district?}

  const fetchRecommendation = useCallback(async (provinceEN, districtEN = null, year) => {
    setRecommendLoading(true);
    setRecommendData(null);
    try {
      const enc  = encodeURIComponent;
      const path = districtEN
        ? `/recommend/${enc(provinceEN)}/districts/${enc(districtEN)}`
        : `/recommend/${enc(provinceEN)}`;
      const url  = `${API_BASE}${path}${year ? `?year=${year}` : ''}`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRecommendData(json);
      setRecommendScope({ province: provinceEN, district: districtEN });
      setRecommendVisible(true);
    } catch (err) {
      console.error('fetchRecommendation error:', err);
      setRecommendData(null);
    } finally {
      setRecommendLoading(false);
    }
  }, []);

  const resetRecommend = useCallback(() => {
    setRecommendData(null);
    setRecommendScope(null);
  }, []);

  return {
    recommendData, recommendLoading, recommendVisible, recommendScope,
    setRecommendVisible, fetchRecommendation, resetRecommend,
  };
}
