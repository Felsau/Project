// Draw-your-own-area overlay — แสดง polygon ที่ผู้ใช้กำลังวาด/วาดเสร็จ.
//   ≥3 จุด → PolygonLayer (เติมสีโปร่ง + เส้นขอบ)
//   2 จุด  → PathLayer (เส้นเชื่อม)
//   ทุกจุด → ScatterplotLayer (หมุดมุม)
// ใช้สี accent (น้ำเงิน) เดียวกับ selection ของแผนที่เพื่อความสอดคล้อง
import { ScatterplotLayer, PolygonLayer, PathLayer } from '@deck.gl/layers';

const ACCENT = [26, 115, 232];

export const drawLayers = ({ points }) => {
  if (!points || points.length === 0) return [];
  const layers = [];

  if (points.length >= 3) {
    layers.push(new PolygonLayer({
      id: 'draw-polygon',
      data: [{ polygon: points }],
      getPolygon: (d) => d.polygon,
      getFillColor: [...ACCENT, 45],
      getLineColor: [...ACCENT, 235],
      getLineWidth: 2,
      lineWidthUnits: 'pixels',
      lineWidthMinPixels: 2,
      stroked: true,
      filled: true,
      pickable: false,
    }));
  } else if (points.length === 2) {
    layers.push(new PathLayer({
      id: 'draw-path',
      data: [{ path: points }],
      getPath: (d) => d.path,
      getColor: [...ACCENT, 235],
      getWidth: 2,
      widthUnits: 'pixels',
      widthMinPixels: 2,
      pickable: false,
    }));
  }

  layers.push(new ScatterplotLayer({
    id: 'draw-vertices',
    data: points,
    getPosition: (p) => p,
    getFillColor: [255, 255, 255, 255],
    getLineColor: [...ACCENT, 255],
    stroked: true,
    getLineWidth: 2,
    lineWidthUnits: 'pixels',
    getRadius: 5,
    radiusUnits: 'pixels',
    radiusMinPixels: 4,
    pickable: false,
  }));

  return layers;
};
