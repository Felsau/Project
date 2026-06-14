// Province choropleth — extruded NDVI GeoJsonLayer + click/hover handlers.
// ตอน time-lapse LST (timelapseMetric='lst') ค่าใน ndviCache เป็น °C —
// สลับสเกลสี/ความสูงให้ตรง metric
import { GeoJsonLayer } from '@deck.gl/layers';
import { PROVINCE_TH } from '../../constants';
import { getNdviRgba, getLstRgba } from '../../colorUtils';

// LST ~20–45°C → 0–30000 m (สูง = ร้อน) ให้ extrusion เทียบเคียงสเกล NDVI เดิม
const lstElevation = (v) => Math.max(0, Math.min(1, (v - 20) / 25)) * 30000;

export const provinceLayers = (ctx) => {
  const {
    thailandData, ndviCache, selectedProvinceEN, showingDistricts,
    selectProvince, setTooltip, rasterActive, timelapseMetric, drawActive,
  } = ctx;
  if (!thailandData) return [];

  const isLst = timelapseMetric === 'lst';

  return [
    new GeoJsonLayer({
      id: 'thailand-provinces',
      data: thailandData,
      // flat when drilled into districts OR a raster overlay/swipe is shown
      extruded: !showingDistricts && !rasterActive,
      wireframe: false,
      getElevation: (f) => {
        if (showingDistricts || rasterActive) return 0;
        const v = ndviCache[f.properties.name];
        if (v == null) return 0;
        return isLst ? lstElevation(v) : Math.max(0, v) * 30000;
      },
      getFillColor: (f) => {
        // raster overlay: transparent fill so the pixel data underneath stays clean.
        // The layer is kept (not dropped) so clicks/hover still pick provinces.
        if (rasterActive) return [0, 0, 0, 0];
        if (showingDistricts) {
          return f.properties.name === selectedProvinceEN
            ? [26, 115, 232, 30] : [200, 230, 200, 20];
        }
        if (f.properties.name === selectedProvinceEN) return [26, 115, 232, 230];
        const v = ndviCache[f.properties.name];
        return isLst ? getLstRgba(v, 200) : getNdviRgba(v, 200);
      },
      getLineColor: (f) => {
        if (rasterActive) {
          // subtle outline for context over the (light) raster basemap
          return f.properties.name === selectedProvinceEN
            ? [26, 115, 232, 200] : [80, 80, 80, 90];
        }
        if (showingDistricts) {
          return f.properties.name === selectedProvinceEN
            ? [26, 115, 232, 180] : [42, 74, 42, 30];
        }
        return [42, 74, 42, 160];
      },
      lineWidthMinPixels: 1,
      // draw mode → ปิด picking เพื่อให้คลิกบนแผนที่ปักหมุดแทนการเลือกจังหวัด
      pickable: !drawActive,
      // don't repaint a highlight over the raster on hover
      autoHighlight: !showingDistricts && !rasterActive && !drawActive,
      highlightColor: [26, 115, 232, 80],
      onClick: ({ object }) => {
        if (!object) return;
        selectProvince(object.properties.name);
      },
      onHover: ({ object, x, y }) => {
        if (showingDistricts) { setTooltip(null); return; }
        if (!object) { setTooltip(null); return; }
        const v = ndviCache[object.properties.name];
        setTooltip({
          x, y,
          nameTH: PROVINCE_TH[object.properties.name] || object.properties.name,
          nameEN: object.properties.name,
          ...(isLst ? { lst: v } : { ndvi: v }),
        });
      },
      updateTriggers: {
        extruded:     [showingDistricts, rasterActive],
        getElevation: [ndviCache, showingDistricts, rasterActive, isLst],
        getFillColor: [ndviCache, selectedProvinceEN, showingDistricts, rasterActive, isLst],
        getLineColor: [selectedProvinceEN, showingDistricts, rasterActive],
      },
    }),
  ];
};
