// buildMapLayers — composes deck.gl layers for the map: province choropleth,
// district choropleth + labels, and planting-recommendation overlays.
import { provinceLayers } from './provinceLayer';
import { districtLayers } from './districtLayers';
import { recommendLayers } from './recommendLayers';

export const buildMapLayers = (params) => {
  const { showingDistricts, districtsData, selectedProvinceEN, zoom = 6 } = params;

  // Pre-compute the filtered district features once per render so both the
  // district GeoJsonLayer and the TextLayer below see the same data.
  const districtFeatures = showingDistricts
    ? districtsData.features.filter(f => f.properties.province === selectedProvinceEN)
    : [];

  const ctx = { ...params, zoom, districtFeatures };

  return [
    ...provinceLayers(ctx),
    ...districtLayers(ctx),
    ...recommendLayers(ctx),
  ];
};
