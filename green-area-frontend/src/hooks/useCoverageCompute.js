import { useCallback, useRef, useState } from 'react';
import { API_BASE } from '../constants';
import { pushError } from '../utils/toast';
import { fetchWithRetry } from '../utils/fetchRetry';

// Computes NDVI for provinces that don't yet have cached data for a given year,
// so the national ranking can cover all 77 provinces. Runs a small concurrency
// pool (GEE compute is the bottleneck) with live progress and cancel support.
// Each finished province is pushed into ndviCache so the map fills in as it goes.
const CONCURRENCY = 4;

export function useCoverageCompute({ setNdviCache }) {
  const [computing, setComputing] = useState(false);
  const [computeProgress, setComputeProgress] = useState({ done: 0, total: 0, failed: 0 });
  const abortRef = useRef(null);

  // missing: array of { en } (English province names) to compute for `year`.
  const computeMissing = useCallback(async (year, missing) => {
    if (!missing?.length) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setComputing(true);
    setComputeProgress({ done: 0, total: missing.length, failed: 0 });

    let index = 0, done = 0, failed = 0;

    const worker = async () => {
      while (index < missing.length && !signal.aborted) {
        const { en } = missing[index++];
        try {
          const res = await fetchWithRetry(
            `${API_BASE}/ndvi/${encodeURIComponent(en)}?year=${year}`, { signal });
          if (res.ok) {
            const data = await res.json();
            if (data.ndvi_mean != null) {
              setNdviCache(prev => ({ ...prev, [en]: data.ndvi_mean }));
            }
          } else {
            failed++;
          }
        } catch (err) {
          if (err?.name === 'AbortError') return;
          failed++;
        } finally {
          done++;
          setComputeProgress({ done, total: missing.length, failed });
        }
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, missing.length) }, worker));
      if (!signal.aborted && failed > 0) {
        pushError(`คำนวณไม่สำเร็จ ${failed} จังหวัด — ลองกดคำนวณอีกครั้งได้`);
      }
    } finally {
      if (abortRef.current === controller) {
        setComputing(false);
        abortRef.current = null;
      }
    }
  }, [setNdviCache]);

  const cancelCompute = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setComputing(false);
  }, []);

  return { computing, computeProgress, computeMissing, cancelCompute };
}
