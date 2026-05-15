import { useState, useEffect } from 'react';
import { API_BASE } from '../constants';
import { pushError } from '../utils/toast';

export function useNdviCache() {
  const [ndviCache, setNdviCache] = useState({});

  useEffect(() => {
    fetch(`${API_BASE}/cache`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
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
      .catch(err => {
        console.warn('NDVI cache load failed:', err);
        pushError('โหลด NDVI cache ไม่สำเร็จ — แผนที่อาจไม่มีสี ลองรีเฟรชหน้าเว็บ');
      });
  }, []);

  return { ndviCache, setNdviCache };
}
