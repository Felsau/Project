import { useCallback, useRef, useState } from 'react';
import { API_BASE } from '../constants';
import { pushError } from '../utils/toast';
import { fetchWithRetry } from '../utils/fetchRetry';

export function useProvinceData({ setNdviCache }) {
  const [selectedProvince, setSelectedProvince]     = useState(null);
  const [selectedProvinceEN, setSelectedProvinceEN] = useState(null);
  const [provinceArea, setProvinceArea]             = useState(null);
  const [ndviStats, setNdviStats]                   = useState(null);
  const [ndviMonthly, setNdviMonthly]               = useState([]);
  const [ndviLoading, setNdviLoading]               = useState(false);
  const [lstStats, setLstStats]                     = useState(null);
  const [lstMonthly, setLstMonthly]                 = useState([]);
  const [lstLoading, setLstLoading]                 = useState(false);
  // last-click-wins: abort any in-flight province fetch when a new one starts,
  // so a slow response for province A can't overwrite the panel after B is picked
  const abortRef = useRef(null);

  const fetchNDVI = async (provinceName) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setNdviLoading(true);
    setLstLoading(true);
    setNdviStats(null);
    setNdviMonthly([]);
    setLstStats(null);
    setLstMonthly([]);
    try {
      const enc = encodeURIComponent;
      const [statsRes, monthlyRes, lstRes, lstMonthlyRes] = await Promise.all([
        fetchWithRetry(`${API_BASE}/ndvi/${enc(provinceName)}`, { signal }),
        fetchWithRetry(`${API_BASE}/ndvi/${enc(provinceName)}/monthly`, { signal }),
        fetchWithRetry(`${API_BASE}/lst/${enc(provinceName)}`, { signal }),
        fetchWithRetry(`${API_BASE}/lst/${enc(provinceName)}/monthly`, { signal }),
      ]);
      const [stats, monthly, lst, lstMonthlyJson] = await Promise.all([
        statsRes.json(), monthlyRes.json(), lstRes.json(), lstMonthlyRes.json(),
      ]);
      if (statsRes.ok) setNdviStats(stats);
      setNdviMonthly(monthlyRes.ok ? (monthly.monthly?.filter(m => m.ndvi !== null) ?? []) : []);
      if (lstRes.ok) setLstStats(lst);
      setLstMonthly(lstMonthlyRes.ok ? (lstMonthlyJson.monthly?.filter(m => m.lst !== null) ?? []) : []);
      if (statsRes.ok && stats.ndvi_mean != null) {
        setNdviCache(prev => ({ ...prev, [provinceName]: stats.ndvi_mean }));
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;  // superseded by a newer selection
      console.error('ดึงข้อมูล NDVI/LST ไม่สำเร็จ:', err);
      pushError(`โหลดข้อมูลจังหวัด ${provinceName} ไม่สำเร็จ — ลองอีกครั้ง`);
    } finally {
      // only the most-recent request may clear the loading flags
      if (abortRef.current === controller) {
        setNdviLoading(false);
        setLstLoading(false);
      }
    }
  };

  const resetProvince = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSelectedProvince(null);
    setSelectedProvinceEN(null);
    setNdviStats(null);
    setNdviMonthly([]);
    setProvinceArea(null);
    setLstStats(null);
    setLstMonthly([]);
  }, []);

  return {
    selectedProvince, setSelectedProvince,
    selectedProvinceEN, setSelectedProvinceEN,
    provinceArea, setProvinceArea,
    ndviStats, ndviMonthly, ndviLoading,
    lstStats, lstMonthly, lstLoading,
    fetchNDVI, resetProvince,
  };
}
