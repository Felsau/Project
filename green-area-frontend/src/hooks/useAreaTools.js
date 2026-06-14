import { useCallback, useState } from 'react';
import { FlyToInterpolator } from '@deck.gl/core';
import * as turf from '@turf/turf';
import { useDrawArea } from './useDrawArea';
import { useSavedAreas } from './useSavedAreas';

// รวม orchestration ของฟีเจอร์ "วาดพื้นที่เอง" + "บันทึกพื้นที่" ไว้ที่เดียว
// (เดิมกระจายอยู่ใน App.js) — คืน hook objects + handlers ให้ App ใช้ต่อ
//
// deps: thailandData (หาจังหวัดจาก centroid), setViewState (บินไปยังพื้นที่ที่โหลด)
export function useAreaTools({ thailandData, setViewState }) {
  const draw = useDrawArea();
  const savedAreas = useSavedAreas();
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);

  // ระหว่างวาด: คลิกบนแผนที่ = ปักหมุดมุม polygon
  const { addPoint } = draw;
  const handleMapClick = useCallback((info) => {
    if (draw.drawActive && info?.coordinate) addPoint(info.coordinate);
  }, [draw.drawActive, addPoint]);

  // หาจังหวัด (อังกฤษ) ที่ centroid ของ polygon ตกอยู่ — ใช้เลือกพันธุ์ไม้ตามภาค
  const resolveProvince = useCallback((pts) => {
    if (!thailandData || !pts || pts.length < 3) return null;
    try {
      const c = turf.centroid(turf.polygon([[...pts, pts[0]]]));
      const feat = thailandData.features.find(f => turf.booleanPointInPolygon(c, f));
      return feat?.properties?.name || null;
    } catch {
      return null;
    }
  }, [thailandData]);

  // เปิด/ปิด panel รายการพื้นที่ที่บันทึก — โหลด list ใหม่ตอนเปิด
  const { refresh, getOne, save } = savedAreas;
  const toggleSavedPanel = useCallback(() => {
    setSavedPanelOpen(open => {
      if (!open) refresh();
      return !open;
    });
  }, [refresh]);

  // บันทึกพื้นที่ที่วาด + ผลวิเคราะห์ปัจจุบัน
  const handleSaveArea = useCallback((label) => {
    const pts = draw.points;
    if (!draw.result || pts.length < 3) return Promise.resolve(null);
    return save({
      label,
      geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] },
      year: draw.result.year,
      area_km2: draw.result.area_km2,
      province: resolveProvince(pts),
      analysis: draw.result,
      recommendation: draw.recommendResult || null,
    });
  }, [draw.points, draw.result, draw.recommendResult, save, resolveProvince]);

  // โหลดพื้นที่ที่บันทึก → ดึงตัวเต็ม + วาง polygon/ผลลัพธ์ + บินไปยังพื้นที่นั้น
  const { loadSaved } = draw;
  const handleLoadSaved = useCallback(async (row) => {
    const full = await getOne(row.id);
    if (!full) return;
    loadSaved(full);
    setSavedPanelOpen(false);
    const ring = full.geometry?.coordinates?.[0];
    if (ring && ring.length >= 3) {
      try {
        const [minLng, minLat, maxLng, maxLat] = turf.bbox(turf.polygon([ring]));
        const maxSpan = Math.max(maxLng - minLng, maxLat - minLat) || 0.05;
        const zoom = Math.min(13, Math.max(8, Math.log2(2 / maxSpan) + 8));
        setViewState({
          longitude: (minLng + maxLng) / 2, latitude: (minLat + maxLat) / 2,
          zoom, pitch: 0, bearing: 0,
          transitionDuration: 800, transitionInterpolator: new FlyToInterpolator(),
        });
      } catch { /* bbox error — ข้ามการบิน */ }
    }
  }, [getOne, loadSaved, setViewState]);

  return {
    draw, savedAreas, savedPanelOpen, setSavedPanelOpen,
    handleMapClick, resolveProvince, toggleSavedPanel, handleSaveArea, handleLoadSaved,
  };
}
