import { useState, useCallback, useEffect, useRef } from 'react';
import { AVAILABLE_YEARS, CURRENT_YEAR } from '../constants';
import { pushError } from '../utils/toast';
import { fetchTileInfo, fetchDiffTile } from '../utils/fetchTiles';

// Compare two raster years of the same metric. Two modes:
//   'split' → fetch both years; the map clips them left/right of a divider.
//   'diff'  → fetch one (yearB − yearA) difference raster; shows change directly
//             (essential when both years look near-identical, e.g. forest NDVI).
export function useSwipeCompare() {
  const [active, setActive] = useState(false);
  const [mode, setMode]     = useState('split'); // 'split' | 'diff'
  const [metric, setMetric] = useState('ndvi');  // 'ndvi' | 'lst'
  const [yearA, setYearA]   = useState(AVAILABLE_YEARS[0]);
  const [yearB, setYearB]   = useState(CURRENT_YEAR);
  const [split, setSplit]   = useState(0.5);
  const [tileA, setTileA]   = useState(null);
  const [tileB, setTileB]   = useState(null);
  const [diffTile, setDiffTile] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const load = useCallback(async (provinceEN, districtEN) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setTileA(null);
    setTileB(null);
    setDiffTile(null);
    try {
      if (mode === 'diff') {
        const d = await fetchDiffTile(metric, provinceEN, districtEN, yearA, yearB, signal);
        if (signal.aborted) return;
        setDiffTile(d);
      } else {
        const [a, b] = await Promise.all([
          fetchTileInfo(metric, provinceEN, districtEN, yearA, signal),
          fetchTileInfo(metric, provinceEN, districtEN, yearB, signal),
        ]);
        if (signal.aborted) return;
        setTileA(a);
        setTileB(b);
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error('swipe load error:', err);
      pushError('โหลดภาพเทียบไม่สำเร็จ — ' + (err?.message || err));
      setTileA(null);
      setTileB(null);
      setDiffTile(null);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, [mode, metric, yearA, yearB]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setActive(false);
    setTileA(null);
    setTileB(null);
    setDiffTile(null);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    active, setActive, mode, setMode, metric, setMetric,
    yearA, setYearA, yearB, setYearB,
    split, setSplit, tileA, tileB, diffTile, loading,
    load, reset,
  };
}
