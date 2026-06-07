// Province choropleth — extruded NDVI GeoJsonLayer + click/hover handlers.
import { GeoJsonLayer } from '@deck.gl/layers';
import { PROVINCE_TH } from '../../constants';
import { getNdviRgba } from '../../colorUtils';

export const provinceLayers = (ctx) => {
  const {
    thailandData, ndviCache, selectedProvinceEN, showingDistricts,
    selectProvince, setTooltip,
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
        selectProvince(object.properties.name);
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
