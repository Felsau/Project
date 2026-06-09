// buildMapLayers — composes deck.gl layers for the map: province choropleth,
// district choropleth + labels, and planting-recommendation overlays.
import { provinceLayers } from './provinceLayer';
import { districtLayers } from './districtLayers';
import { recommendLayers } from './recommendLayers';
import { rasterLayers } from './rasterLayer';

export const buildMapLayers = (params) => {
  const { showingDistricts, districtsData, selectedProvinceEN, zoom = 6,
          rasterTileInfo, swipeActive } = params;

  // Pre-compute the filtered district features once per render so both the
  // district GeoJsonLayer and the TextLayer below see the same data.
  const districtFeatures = showingDistricts
    ? districtsData.features.filter(f => f.properties.province === selectedProvinceEN)
    : [];

  // When a raster overlay OR swipe is shown, flatten + fade the choropleth so the
  // real pixel data on top isn't muddied by the (blue) selected-province fill.
  const rasterActive = !!rasterTileInfo?.tile_url || !!swipeActive;
  const ctx = { ...params, zoom, districtFeatures, rasterActive };

  return [
    ...provinceLayers(ctx),
    ...rasterLayers(ctx),
    ...districtLayers(ctx),
    ...recommendLayers(ctx),
  ];
};
