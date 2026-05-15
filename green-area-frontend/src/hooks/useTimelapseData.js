import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { API_BASE, CURRENT_YEAR } from '../constants';
import { pushError } from '../utils/toast';
import { fetchWithRetry } from '../utils/fetchRetry';

const DEFAULT_START = 2015;

// Time-lapse animation บนแผนที่ — เล่น NDVI annual จาก cache (ไม่ trigger GEE)
// timelapseCache ทำงานเป็น drop-in replacement ของ ndviCache: { province: ndvi_value }
// ตอนปีที่เลือก ระบบจะส่งให้ mapLayers ใช้แทน ndviCache ปกติ
export function useTimelapseData() {
  const [active, setActive]     = useState(false);
  const [data, setData]         = useState(null);
  const [year, setYear]         = useState(null);
  const [playing, setPlaying]   = useState(false);
  const [speed, setSpeed]       = useState(1);
  const [loading, setLoading]   = useState(false);
  // loadError แยกจาก data=null เพื่อกัน infinite loop ใน auto-fetch effect:
  // fail → data ยัง null → loading=false → effect re-fire ถ้าไม่มี gate ตัวนี้
  const [loadError, setLoadError] = useState(false);
  const intervalRef = useRef(null);
  // เก็บ AbortController ของ request ล่าสุด กัน race + กัน toast หลังปิด panel
  const abortRef = useRef(null);

  const fetchTimelapse = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setLoadError(false);
    try {
      const url = `${API_BASE}/timelapse/ndvi/provinces?start_year=${DEFAULT_START}&end_year=${CURRENT_YEAR}`;
      const r = await fetchWithRetry(url, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      if (controller.signal.aborted) return;
      // setData ก่อนเสมอ (แม้ years จะว่าง) เพื่อให้ TimelapsePlayer แสดง branch
      // "ไม่มีข้อมูล cache เพียงพอ" แทนที่จะค้างที่ spinner
      setData(json);
      setYear(json.years?.[0] ?? null);
      if (!json.years?.length) {
        pushError('ยังไม่มีข้อมูลพอสำหรับ time-lapse — ลองคลิกจังหวัดเพื่อ cache ก่อน');
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;  // ถูก cancel ไม่ต้อง toast
      console.error('fetchTimelapse error:', e);
      pushError('โหลดข้อมูล time-lapse ไม่สำเร็จ — ' + (e?.message || e));
      setLoadError(true);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  // เปิด panel ครั้งแรก → fetch อัตโนมัติ (เฉพาะตอนยังไม่มี data และยังไม่เคย fail)
  // loadError gate กัน loop: ถ้า fail → ต้องให้ user กด "ลองใหม่" หรือ close+open
  useEffect(() => {
    if (active && !data && !loading && !loadError) fetchTimelapse();
  }, [active, data, loading, loadError, fetchTimelapse]);

  // unmount → cancel pending request กัน setState บน unmounted component
  useEffect(() => () => abortRef.current?.abort(), []);

  // หยุดเล่นเมื่อปิด panel
  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);

  // Auto-tick — เลื่อนปีอัตโนมัติเมื่อ playing
  // speed 1× = 800 ms ต่อปี · 2× = 400 ms · 0.5× = 1600 ms
  useEffect(() => {
    if (!playing || !data?.years?.length) return undefined;
    const baseMs = 800;
    const ms = baseMs / speed;
    intervalRef.current = setInterval(() => {
      setYear(y => {
        if (y == null) return data.years[0];
        const i = data.years.indexOf(y);
        return data.years[(i + 1) % data.years.length];
      });
    }, ms);
    return () => clearInterval(intervalRef.current);
  }, [playing, data, speed]);

  // Drop-in replacement ของ ndviCache สำหรับปีที่เลือก
  const timelapseCache = useMemo(() => {
    if (!active || !data || year == null) return null;
    const cache = {};
    Object.entries(data.data).forEach(([province, byYear]) => {
      const v = byYear[String(year)];
      if (v != null) cache[province] = v;
    });
    return cache;
  }, [active, data, year]);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setPlaying(false);
    setActive(false);
    setLoadError(false);  // เปิดใหม่ → fetch ใหม่ได้
  }, []);

  return {
    active, setActive, close,
    data, year, setYear,
    playing, setPlaying, speed, setSpeed,
    loading, loadError, fetchTimelapse,
    timelapseCache,
  };
}
