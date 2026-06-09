// District-level map — FLAT NDVI choropleth + on-map Thai labels.
// (3D extrusion is kept for the province/national hero view only; at district
// level a clean 2D choropleth reads far better — crisp boundaries, clear
// "no data" state, and labels for identification.)
import { GeoJsonLayer, TextLayer } from '@deck.gl/layers';
import * as turf from '@turf/turf';
import { getNdviRgba } from '../../colorUtils';

// Thai amphoe name for the on-map label (keep "เมือง…" prefix — it's informative).
// English fallback: drop generic prefixes + split CamelCase.
function labelFor(props) {
  const th = props.name_th;
  if (th && th !== props.name) return th;
  return (props.name || '')
    .replace(/^(K\.|Amphoe |Khet |Muang |Mueang )/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

// Neutral fill for districts that have no NDVI cached yet — matches the
// "ยังไม่มีข้อมูล" swatch in MapLegend so partial coverage reads as
// "not computed yet", not "broken".
const NO_DATA_FILL = [225, 229, 226, 90];

export const districtLayers = (ctx) => {
  const {
    showingDistricts, districtFeatures, districtCache,
    selectedProvinceEN, selectedDistrictEN, zoom, rasterActive,
    setSelectedDistrict, setSelectedDistrictEN, setDistrictArea,
    setSidebarTab, fetchDistrictNDVI, setTooltip,
  } = ctx;
  if (!showingDistricts) return [];

  const cacheKey = (f) => `${f.properties.province}::${f.properties.name}`;

  // Labels: show all districts of the focused province once zoomed in a bit
  // (lower threshold than before so users can identify districts without
  // clicking); the selected district is always labelled.
  const labelData = zoom >= 7
    ? districtFeatures
    : districtFeatures.filter(f => f.properties.name === selectedDistrictEN);

  return [
    new GeoJsonLayer({
      id: 'thailand-districts',
      data: { type: 'FeatureCollection', features: districtFeatures },
      extruded: false,            // flat choropleth
      stroked: true,
      filled: true,
      getFillColor: (f) => {
        // raster overlay/swipe on → transparent so the pixel data shows through
        if (rasterActive) return [0, 0, 0, 0];
        if (f.properties.name === selectedDistrictEN) return [26, 115, 232, 230];
        const ndvi = districtCache[cacheKey(f)];
        return ndvi != null ? getNdviRgba(ndvi, 210) : NO_DATA_FILL;
      },
      getLineColor: (f) => {
        if (f.properties.name === selectedDistrictEN) return [26, 115, 232, 255];
        // crisp neutral boundary — visible on both green fills and the basemap;
        // a touch lighter when a raster sits underneath
        return rasterActive ? [255, 255, 255, 130] : [70, 92, 70, 200];
      },
      getLineWidth: (f) => (f.properties.name === selectedDistrictEN ? 2.5 : 0.8),
      lineWidthUnits: 'pixels',
      lineWidthMinPixels: 0.8,
      pickable: true,
      autoHighlight: !rasterActive,
      highlightColor: [26, 115, 232, 90],
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
        getFillColor: [districtCache, selectedDistrictEN, rasterActive],
        getLineColor: [selectedDistrictEN, rasterActive],
        getLineWidth: selectedDistrictEN,
      },
    }),

    // On-map district labels (Thai), anchored at each polygon centroid.
    // SDF + white halo keeps text readable over green/grey fills and the basemap.
    new TextLayer({
      id: 'thailand-district-labels',
      data: labelData,
      getPosition: (f) => {
        try { return turf.centroid(f).geometry.coordinates; }
        catch { return [0, 0]; }
      },
      getText: (f) => labelFor(f.properties),
      getSize: (f) => (f.properties.name === selectedDistrictEN ? 13 : 10.5),
      getColor: (f) => (f.properties.name === selectedDistrictEN
        ? [11, 13, 12, 255]
        : [31, 36, 33, 235]),
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: 'IBM Plex Sans Thai, Inter, sans-serif',
      fontWeight: 500,
      sizeUnits: 'pixels',
      billboard: true,
      fontSettings: { sdf: true, fontSize: 48, buffer: 8 },
      outlineWidth: 3,
      outlineColor: [251, 251, 250, 235],
      pickable: false,
      characterSet: 'auto',
      updateTriggers: {
        data:     [zoom >= 7, selectedDistrictEN, districtFeatures],
        getSize:  selectedDistrictEN,
        getColor: selectedDistrictEN,
      },
    }),
  ];
};
