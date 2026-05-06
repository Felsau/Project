import { useState, useEffect } from 'react';
import { API_BASE } from '../constants';

export function useNdviCache() {
  const [ndviCache, setNdviCache] = useState({});

  useEffect(() => {
    fetch(`${API_BASE}/cache`)
      .then(r => r.json())
      .then(data => {
        const cache = {};
        const cacheYear = {};
        data.annual?.forEach(row => {
          if (row.ndvi_mean != null && (!cacheYear[row.province] || row.year > cacheYear[row.province])) {
            cache[row.province] = row.ndvi_mean;
            cacheYear[row.province] = row.year;
          }
        });
        setNdviCache(cache);
      })
      .catch(() => {});
  }, []);

  return { ndviCache, setNdviCache };
}
