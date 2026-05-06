import { useState, useCallback } from 'react';
import axios from 'axios';
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
      const res = await axios.get(`${API_BASE}/analysis/ranking?year=${y}`);
      setRankingData(res.data.data || []);
      setRankingStats({
        total:    res.data.total_cached,
        whoPass:  res.data.who_pass_count,
        whoFail:  res.data.who_fail_count,
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
