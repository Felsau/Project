import { GeoJsonLayer, BitmapLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { FlyToInterpolator } from '@deck.gl/core';
import * as turf from '@turf/turf';
import { PROVINCE_TH } from '../constants';
import { getNdviRgba } from '../colorUtils';

export function buildMapLayers({
  thailandData, ndviCache, selectedProvinceEN,
  setSelectedProvince, setSelectedProvinceEN, setProvinceArea,
  fetchNDVI, ensureDistrictsLoaded, loadDistrictCache, resetDistrict, resetTrend,
  districtsData, districtCache, selectedDistrictEN,
  setSelectedDistrict, setSelectedDistrictEN, setDistrictArea,
  fetchDistrictNDVI, showingDistricts,
  setViewState, setTooltip, setSidebarTab,
  recommendData, recommendVisible,
}) {
  return [
    ...(thailandData ? [
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
    ] : []),

    ...(showingDistricts ? [
      new GeoJsonLayer({
        id: 'thailand-districts',
        data: {
          type: 'FeatureCollection',
          features: districtsData.features.filter(f => f.properties.province === selectedProvinceEN),
        },
        extruded: true,
        wireframe: false,
        getElevation: (f) => {
          const ndvi = districtCache[`${f.properties.province}::${f.properties.name}`];
          return ndvi != null ? Math.max(0, ndvi) * 20000 : 500;
        },
        getFillColor: (f) => {
          if (f.properties.name === selectedDistrictEN) return [26, 115, 232, 240];
          return getNdviRgba(districtCache[`${f.properties.province}::${f.properties.name}`], 220);
        },
        getLineColor: [60, 100, 60, 220],
        lineWidthMinPixels: 1,
        pickable: true,
        autoHighlight: true,
        highlightColor: [100, 160, 255, 120],
        onClick: ({ object }) => {
          if (!object) return;
          const districtEN = object.properties.name;
          setSelectedDistrict(districtEN);
          setSelectedDistrictEN(districtEN);
          setDistrictArea((turf.area(object) / 1_000_000).toFixed(2));
          setSidebarTab('stats');
          fetchDistrictNDVI(selectedProvinceEN, districtEN);
        },
        onHover: ({ object, x, y }) => {
          setTooltip(object ? {
            x, y,
            nameTH: object.properties.name,
            nameEN: `${selectedProvinceEN} › ${object.properties.name}`,
            ndvi: districtCache[`${object.properties.province}::${object.properties.name}`],
          } : null);
        },
        updateTriggers: {
          getElevation: districtCache,
          getFillColor: [districtCache, selectedDistrictEN],
        },
      }),
    ] : []),

    ...(recommendData && recommendVisible && recommendData.tile_url ? [
      new TileLayer({
        id: 'recommend-heatmap',
        data: recommendData.tile_url,
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        opacity: 0.65,
        renderSubLayers: (props) => {
          const { boundingBox } = props.tile;
          return new BitmapLayer(props, {
            data: null,
            image: props.data,
            bounds: [
              boundingBox[0][0], boundingBox[0][1],
              boundingBox[1][0], boundingBox[1][1],
            ],
          });
        },
      }),
    ] : []),

    ...(recommendData && recommendVisible && recommendData.top_locations?.length ? [
      new ScatterplotLayer({
        id: 'recommend-top-points',
        data: recommendData.top_locations,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: 80,
        radiusMinPixels: 8,
        radiusMaxPixels: 14,
        getFillColor: [220, 38, 38, 230],
        getLineColor: [255, 255, 255, 255],
        lineWidthMinPixels: 2,
        stroked: true,
        pickable: true,
        onHover: ({ object, index, x, y }) => {
          setTooltip(object ? {
            x, y,
            nameTH: `📍 จุดแนะนำปลูก #${index + 1}`,
            nameEN: `score ${object.score} · ${object.lat}, ${object.lng}`,
          } : null);
        },
      }),
      new TextLayer({
        id: 'recommend-top-labels',
        data: recommendData.top_locations,
        getPosition: (d) => [d.lng, d.lat],
        getText: (d, { index }) => String(index + 1),
        getSize: 12,
        getColor: [255, 255, 255, 255],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontWeight: 'bold',
      }),
    ] : []),
  ];
}
