import { useState, useCallback } from 'react';
import { API_BASE, CURRENT_YEAR } from '../constants';

export function useRankingData() {
  const [rankingData, setRankingData]   = useState([]);
  const [rankingStats, setRankingStats] = useState(null);
  const [rankingYear, setRankingYear]   = useState(CURRENT_YEAR);
  const [rankingLoading, setRankingLoading] = useState(false);

  const fetchRanking = useCallback(async (year) => {
    const y = year !== undefined ? year : rankingYear;
    setRankingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/analysis/ranking?year=${y}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRankingData(data.data || []);
      setRankingStats({
        total:    data.total_cached,
        whoPass:  data.who_pass_count,
        whoFail:  data.who_fail_count,
      });
    } catch (e) {
      setRankingData([]);
      setRankingStats(null);
    } finally {
      setRankingLoading(false);
    }
  }, [rankingYear]);

  return { rankingData, rankingStats, rankingLoading, rankingYear, setRankingYear, fetchRanking };
}
