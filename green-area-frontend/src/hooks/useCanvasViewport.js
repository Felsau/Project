import { useEffect, useMemo, useRef, useState } from 'react';
import { WebMercatorViewport } from '@deck.gl/core';

// Track the map canvas size (via ResizeObserver) and derive the geographic
// viewport bounds used by the swipe clip — Web-Mercator x is linear in
// longitude, so the on-screen split maps cleanly to a clip longitude.
//
// Returns `canvasRef` to attach to the canvas element plus `viewportBounds`
// ([minLng, minLat, maxLng, maxLat] or null until the size + view are known).
export function useCanvasViewport(viewState) {
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setCanvasSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const viewportBounds = useMemo(() => {
    if (!canvasSize.w || !canvasSize.h) return null;
    try {
      const vp = new WebMercatorViewport({ ...viewState, width: canvasSize.w, height: canvasSize.h });
      return vp.getBounds();  // [minLng, minLat, maxLng, maxLat]
    } catch {
      return null;
    }
  }, [viewState, canvasSize]);

  return { canvasRef, viewportBounds };
}
