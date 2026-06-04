// Province choropleth — extruded NDVI GeoJsonLayer + click/hover handlers.
import { GeoJsonLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import * as turf from '@turf/turf';
import { PROVINCE_TH } from '../../constants';
import { getNdviRgba } from '../../colorUtils';

export const provinceLayers = (ctx) => {
  const {
    thailandData, ndviCache, selectedProvinceEN, showingDistricts,
    setSelectedProvince, setSelectedProvinceEN, setProvinceArea,
    fetchNDVI, ensureDistrictsLoaded, loadDistrictCache, resetDistrict, resetTrend,
    setViewState, setTooltip,
  } = ctx;
  if (!thailandData) return [];

  return [
    new GeoJsonLayer({
      id: 'thailand-provinces',
      data: thailandData,
      extruded: !showingDistricts,
      wireframe: false,
      getElevation: (f) => {
        if (showingDistricts) return 0;
        const ndvi = ndviCache[f.properties.name];
        return ndvi != null ? Math.max(0, ndvi) * 30000 : 0;
      },
      getFillColor: (f) => {
        if (showingDistricts) {
          return f.properties.name === selectedProvinceEN
            ? [26, 115, 232, 30] : [200, 230, 200, 20];
        }
        if (f.properties.name === selectedProvinceEN) return [26, 115, 232, 230];
        return getNdviRgba(ndviCache[f.properties.name], 200);
      },
      getLineColor: (f) => {
        if (showingDistricts) {
          return f.properties.name === selectedProvinceEN
            ? [26, 115, 232, 180] : [42, 74, 42, 30];
        }
        return [42, 74, 42, 160];
      },
      lineWidthMinPixels: 1,
      pickable: true,
      autoHighlight: !showingDistricts,
      highlightColor: [26, 115, 232, 80],
      onClick: ({ object }) => {
        if (!object) return;
        const nameEN = object.properties.name;
        const nameTH = PROVINCE_TH[nameEN] || nameEN;
        setSelectedProvince(nameTH);
        setSelectedProvinceEN(nameEN);
        setProvinceArea((turf.area(object) / 1_000_000).toFixed(2));
        resetDistrict();
        resetTrend();
        fetchNDVI(nameEN);
        ensureDistrictsLoaded();
        loadDistrictCache(nameEN);
        const [minLng, minLat, maxLng, maxLat] = turf.bbox(object);
        const maxSpan = Math.max(maxLng - minLng, maxLat - minLat);
        const zoom = Math.min(10, Math.max(6, Math.log2(4 / maxSpan) + 7));
        setViewState({
          longitude: (minLng + maxLng) / 2, latitude: (minLat + maxLat) / 2,
          zoom, pitch: 40, bearing: 0,
          transitionDuration: 800, transitionInterpolator: new FlyToInterpolator(),
        });
      },
      onHover: ({ object, x, y }) => {
        if (showingDistricts) { setTooltip(null); return; }
        setTooltip(object ? {
          x, y,
          nameTH: PROVINCE_TH[object.properties.name] || object.properties.name,
          nameEN: object.properties.name,
          ndvi: ndviCache[object.properties.name],
        } : null);
      },
      updateTriggers: {
        extruded:     showingDistricts,
        getElevation: [ndviCache, showingDistricts],
        getFillColor: [ndviCache, selectedProvinceEN, showingDistricts],
        getLineColor: [selectedProvinceEN, showingDistricts],
      },
    }),
  ];
};
