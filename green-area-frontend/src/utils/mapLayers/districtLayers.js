// District choropleth + on-map Thai labels (anchored at centroids).
import { GeoJsonLayer, TextLayer } from '@deck.gl/layers';
import * as turf from '@turf/turf';
import { getNdviRgba } from '../../colorUtils';

// Strip prefixes that are noise when used as on-map labels
//   "เมืองเชียงใหม่" → "เมืองเชียงใหม่"  (keep — it's the actual amphoe name)
//   "Amphoe X"     → "X"               (fallback for English labels)
// For Thai names we keep them as-is — Mueang prefix is informative.
function labelFor(props) {
  const th = props.name_th;
  if (th && th !== props.name) return th;
  // English fallback — break CamelCase into spaces, drop generic prefixes
  return (props.name || '')
    .replace(/^(K\.|Amphoe |Khet |Muang |Mueang )/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

export const districtLayers = (ctx) => {
  const {
    showingDistricts, districtFeatures, districtCache,
    selectedProvinceEN, selectedDistrictEN, zoom,
    setSelectedDistrict, setSelectedDistrictEN, setDistrictArea,
    setSidebarTab, fetchDistrictNDVI, setTooltip,
  } = ctx;
  if (!showingDistricts) return [];

  return [
    new GeoJsonLayer({
      id: 'thailand-districts',
      data: { type: 'FeatureCollection', features: districtFeatures },
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
        const districtTH = object.properties.name_th || districtEN;
        setSelectedDistrict(districtTH);     // shown in sidebar
        setSelectedDistrictEN(districtEN);   // used for API calls
        setDistrictArea((turf.area(object) / 1_000_000).toFixed(2));
        setSidebarTab('stats');
        fetchDistrictNDVI(selectedProvinceEN, districtEN);
      },
      onHover: ({ object, x, y }) => {
        setTooltip(object ? {
          x, y,
          nameTH: object.properties.name_th || object.properties.name,
          nameEN: `${selectedProvinceEN} › ${object.properties.name}`,
          ndvi: districtCache[`${object.properties.province}::${object.properties.name}`],
        } : null);
      },
      updateTriggers: {
        getElevation: districtCache,
        getFillColor: [districtCache, selectedDistrictEN],
      },
    }),

    // On-map district labels (Thai) — anchored at each polygon centroid.
    // Two-stage visibility:
    //   zoom < 7.5 → only the selected district is labelled
    //   zoom ≥ 7.5 → all districts in the province get a label
    // SDF rendering + white halo keeps text readable on top of green/red NDVI fills.
    new TextLayer({
      id: 'thailand-district-labels',
      data: zoom >= 7.5
        ? districtFeatures
        : districtFeatures.filter(f => f.properties.name === selectedDistrictEN),
      getPosition: (f) => {
        try { return turf.centroid(f).geometry.coordinates; }
        catch { return [0, 0]; }
      },
      getText: (f) => labelFor(f.properties),
      getSize: (f) => f.properties.name === selectedDistrictEN ? 13 : 10.5,
      getColor: (f) => f.properties.name === selectedDistrictEN
        ? [11, 13, 12, 255]
        : [31, 36, 33, 235],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: 'IBM Plex Sans Thai, Inter, sans-serif',
      fontWeight: 500,
      sizeUnits: 'pixels',
      billboard: true,
      // SDF + halo for legibility against polygon fills
      fontSettings: { sdf: true, fontSize: 48, buffer: 8 },
      outlineWidth: 3,
      outlineColor: [251, 251, 250, 230],
      pickable: false,
      characterSet: 'auto',
      updateTriggers: {
        data:     [zoom >= 7.5, selectedDistrictEN, districtFeatures],
        getSize:  selectedDistrictEN,
        getColor: selectedDistrictEN,
      },
    }),
  ];
};
