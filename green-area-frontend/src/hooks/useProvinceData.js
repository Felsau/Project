import { useCallback, useState } from 'react';
import { API_BASE } from '../constants';
import { pushError } from '../utils/toast';

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

  const fetchNDVI = async (provinceName) => {
    setNdviLoading(true);
    setLstLoading(true);
    setNdviStats(null);
    setNdviMonthly([]);
    setLstStats(null);
    setLstMonthly([]);
    try {
      const enc = encodeURIComponent;
      const [statsRes, monthlyRes, lstRes, lstMonthlyRes] = await Promise.all([
        fetch(`${API_BASE}/ndvi/${enc(provinceName)}`),
        fetch(`${API_BASE}/ndvi/${enc(provinceName)}/monthly`),
        fetch(`${API_BASE}/lst/${enc(provinceName)}`),
        fetch(`${API_BASE}/lst/${enc(provinceName)}/monthly`),
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
      console.error('ดึงข้อมูล NDVI/LST ไม่สำเร็จ:', err);
      pushError(`โหลดข้อมูลจังหวัด ${provinceName} ไม่สำเร็จ — ลองอีกครั้ง`);
    } finally {
      setNdviLoading(false);
      setLstLoading(false);
    }
  };

  const resetProvince = useCallback(() => {
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
