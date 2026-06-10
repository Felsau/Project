import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { FlyToInterpolator, WebMercatorViewport } from '@deck.gl/core';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';

import * as turf from '@turf/turf';
import { MAP_STYLE, MAP_STYLE_DARK, INITIAL_VIEW_STATE, PROVINCE_TH, CURRENT_YEAR, AVAILABLE_YEARS } from './constants';
import { useNdviCache }    from './hooks/useNdviCache';
import { useProvinceData } from './hooks/useProvinceData';
import { useDistrictData } from './hooks/useDistrictData';
import { useTrendData }    from './hooks/useTrendData';
import { useCompareData }  from './hooks/useCompareData';
import { useRankingData }  from './hooks/useRankingData';
import { useRecommendData } from './hooks/useRecommendData';
import { useTimelapseData } from './hooks/useTimelapseData';
import { useCoolingData } from './hooks/useCoolingData';
import { useCoverageCompute } from './hooks/useCoverageCompute';
import { useRasterOverlay } from './hooks/useRasterOverlay';
import { useSwipeCompare } from './hooks/useSwipeCompare';
import { buildMapLayers }  from './utils/mapLayers';
import { swipeLayers }     from './utils/mapLayers/swipeLayer';
import Sidebar    from './components/Sidebar';
import AppHeader  from './components/AppHeader';
import MapTooltip from './components/MapTooltip';
import MapLegend  from './components/MapLegend';
import Toast      from './components/Toast';
import TimelapsePlayer from './components/TimelapsePlayer';
import AboutModal from './components/AboutModal';
import { pushError } from './utils/toast';

// Stable empty layer array so panning while swipe is OFF doesn't churn the
// combined `layers` memo.
const EMPTY_LAYERS = [];

// Sidebar tab ids — whitelist for the ?tab= deep-link param (mirrors Sidebar TABS)
const TAB_IDS = ['stats', 'trend', 'cooling', 'compare', 'recommend'];

function App() {
  const [thailandData, setThailandData] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [viewState, setViewState]       = useState(INITIAL_VIEW_STATE);
  const [tooltip, setTooltip]           = useState(null);
  const [sidebarTab, setSidebarTab]     = useState('stats');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAbout, setShowAbout]       = useState(false);
  const [canvasSize, setCanvasSize]     = useState({ w: 0, h: 0 });
  const canvasRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const { ndviCache, setNdviCache } = useNdviCache();
  const province = useProvinceData({ setNdviCache });
  const district = useDistrictData();
  const trend    = useTrendData();
  const compare  = useCompareData();
  const ranking  = useRankingData();
  const recommend = useRecommendData();
  const timelapse = useTimelapseData();
  const cooling = useCoolingData();
  const coverage = useCoverageCompute({ setNdviCache });
  const raster = useRasterOverlay();
  const swipe = useSwipeCompare();
  // are BOTH swipe years' tiles fully rendered? (used to show "loading" until
  // ready, so dragging happens on cached tiles = instant GPU re-clip)
  const [swipeTilesReady, setSwipeTilesReady] = useState({ a: false, b: false });
  const onSwipeTileLoad = useCallback(
    (side) => setSwipeTilesReady(s => (s[side] ? s : { ...s, [side]: true })), []);

  const effectiveNdviCache = timelapse.timelapseCache || ndviCache;
  // time-lapse LST เล่นอยู่ → ค่าใน cache เป็น °C — provinceLayer ใช้สลับสเกลสี
  const timelapseMetric = timelapse.timelapseCache ? timelapse.metric : null;

  // Province list for the search/select box — Thai + English, sorted by Thai name.
  const provinceList = useMemo(
    () => Object.entries(PROVINCE_TH)
      .map(([en, th]) => ({ en, th }))
      .sort((a, b) => a.th.localeCompare(b.th, 'th')),
    []
  );

  // Apply + persist the colour theme on the root element.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* storage blocked — ignore */ }
  }, [theme]);

  // Reflect the current selection in the tab title — clearer bookmarks and a
  // readable name for shared deep-links (?p=…).
  useEffect(() => {
    const base = 'Green Area Analysis · Thailand';
    const scope = [province.selectedProvince, district.selectedDistrict].filter(Boolean).join(' · ');
    document.title = scope ? `${scope} — ${base}` : base;
  }, [province.selectedProvince, district.selectedDistrict]);

  // Raster/swipe overlays read poorly over the dark basemap (the blue→red /
  // green palettes get muddied). Force the light, neutral basemap whenever an
  // overlay is shown so the data colours stay true — regardless of theme.
  const overlayShown = !!raster.tileInfo?.tile_url || swipe.active;
  const mapStyle = overlayShown ? MAP_STYLE
                 : theme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE;

  useEffect(() => {
    fetch('/thailand.json')
      .then(r => r.json())
      .then(data => { setThailandData(data); setLoading(false); })
      .catch(() => {
        setLoading(false);
        pushError('โหลดขอบเขตจังหวัดไม่สำเร็จ — รีเฟรชหน้าเว็บใหม่');
      });
  }, []);

  // Deep-link: restore province (?p=), district (?d=), sidebar tab (?tab=) and
  // ranking year (?year=) from the URL once the map data is ready, then keep
  // the URL in sync for shareable links.
  const didInitFromUrl = useRef(false);
  const [urlReady, setUrlReady] = useState(false);
  // district restore ต้องรอ thailand_districts.json โหลดเสร็จ (async หลัง
  // selectProvince) — พักไว้ใน ref แล้วให้ effect ด้านล่างเลือกเมื่อข้อมูลมา
  const pendingDistrictRef = useRef(null);
  useEffect(() => {
    if (didInitFromUrl.current || !thailandData) return;
    didInitFromUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    const year = Number(params.get('year'));
    if (year && !Number.isNaN(year)) ranking.setRankingYear(year);
    const tab = params.get('tab');
    if (tab && TAB_IDS.includes(tab)) setSidebarTab(tab);
    const p = params.get('p');
    if (p && PROVINCE_TH[p]) {
      selectProvince(p);
      const d = params.get('d');
      if (d) pendingDistrictRef.current = { province: p, district: d };
    }
    setUrlReady(true);  // only now may the writer below touch the URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thailandData]);

  // Complete the ?d= restore once district boundaries are in — mirrors the
  // district-layer click handler, minus the tab switch (keep the ?tab= choice).
  useEffect(() => {
    const pending = pendingDistrictRef.current;
    if (!pending || !district.districtsData) return;
    pendingDistrictRef.current = null;
    const feat = district.districtsData.features.find(
      f => f.properties.province === pending.province
        && f.properties.name === pending.district);
    if (!feat) return;  // ชื่ออำเภอใน URL ไม่ตรงกับข้อมูล — ข้ามเงียบๆ
    district.setSelectedDistrict(feat.properties.name_th || feat.properties.name);
    district.setSelectedDistrictEN(feat.properties.name);
    district.setDistrictArea((turf.area(feat) / 1_000_000).toFixed(2));
    district.fetchDistrictNDVI(pending.province, feat.properties.name);
    // Intentional partial deps — district hook fns are stable setters/callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district.districtsData]);

  useEffect(() => {
    if (!urlReady) return;  // don't clobber the incoming URL before it's restored
    const params = new URLSearchParams();
    if (province.selectedProvinceEN) {
      params.set('p', province.selectedProvinceEN);
      if (district.selectedDistrictEN) params.set('d', district.selectedDistrictEN);
    }
    if (sidebarTab !== 'stats') params.set('tab', sidebarTab);
    if (ranking.rankingYear !== CURRENT_YEAR) params.set('year', ranking.rankingYear);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [urlReady, province.selectedProvinceEN, district.selectedDistrictEN,
      sidebarTab, ranking.rankingYear]);

  // cooling analysis is province-scoped — clear it whenever the province changes.
  // Intentional single dep: resetCooling is stable; depending on `cooling` re-fires each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cooling.resetCooling(); }, [province.selectedProvinceEN]);

  // Raster overlay: (re)fetch NDVI/LST tiles when the overlay or scope changes.
  // fetchTiles is a stable useCallback; province/district/overlay drive the refetch.
  useEffect(() => {
    if (raster.overlay === 'none' || !province.selectedProvinceEN) return;
    raster.fetchTiles(raster.overlay, province.selectedProvinceEN,
                      district.selectedDistrictEN || null, CURRENT_YEAR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raster.overlay, province.selectedProvinceEN, district.selectedDistrictEN]);

  // Track the map canvas size → derive geographic viewport bounds for the swipe
  // clip (Web-Mercator x is linear in longitude, so screen split ↔ clip lng).
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

  // Swipe compare: (re)fetch both years when active / scope / metric / years change.
  useEffect(() => {
    if (!swipe.active || !province.selectedProvinceEN) return;
    setSwipeTilesReady({ a: false, b: false });  // new tiles incoming → not ready
    swipe.load(province.selectedProvinceEN, district.selectedDistrictEN || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swipe.active, swipe.mode, swipe.metric, swipe.yearA, swipe.yearB,
      province.selectedProvinceEN, district.selectedDistrictEN]);

  const showingDistricts = !!(province.selectedProvinceEN && district.districtsData);

  const handleReset = useCallback(() => {
    province.resetProvince();
    district.resetDistrict();
    trend.resetTrend();
    compare.resetCompare();
    recommend.resetRecommend();
    cooling.resetCooling();
    raster.clearOverlay();
    swipe.reset();
    setSidebarTab('stats');
    setViewState({
      ...INITIAL_VIEW_STATE,
      transitionDuration: 800,
      transitionInterpolator: new FlyToInterpolator(),
    });
    // Intentional partial deps — reset fns are stable; objects would re-fire each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [province.resetProvince, district.resetDistrict, trend.resetTrend,
      compare.resetCompare, recommend.resetRecommend]);

  const handleViewStateChange = useCallback(({ viewState: vs }) => setViewState(vs), []);
  const getCursor = useCallback(({ isHovering }) => (isHovering ? 'pointer' : 'default'), []);

  // Drag the swipe divider — convert pointer x to a 0–1 split fraction.
  const { setSplit: setSwipeSplit } = swipe;
  const startSwipeDrag = useCallback((e) => {
    e.preventDefault();
    const el = canvasRef.current;
    if (!el) return;
    // keep receiving move events even if the pointer leaves the handle (touch)
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* unsupported */ }
    // Coalesce pointermove → at most ONE split update per animation frame.
    // pointermove fires ~120Hz; without this every event re-renders the whole
    // app (incl. the sidebar charts), dropping frames. The clip itself is a
    // cheap GPU re-clip (no tile re-fetch), so 60fps tracking is buttery.
    let rafId = 0;
    let pending = null;
    const commit = () => { rafId = 0; if (pending != null) setSwipeSplit(pending); };
    const move = (ev) => {
      const rect = el.getBoundingClientRect();
      pending = Math.max(0.05, Math.min(0.95, (ev.clientX - rect.left) / rect.width));
      if (!rafId) rafId = requestAnimationFrame(commit);
    };
    const end = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (pending != null) setSwipeSplit(pending);  // commit final position
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);  // touch cancel → no leak
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }, [setSwipeSplit]);

  // Enter swipe mode: clear the single overlay + flatten pitch/bearing so the
  // screen divider maps cleanly to a clip longitude (top-down).
  const enableSwipe = useCallback(() => {
    raster.clearOverlay();
    swipe.setActive(true);
    swipe.setSplit(0.5);   // always open centred, not wherever it was last dragged
    setViewState(vs => ({
      ...vs, pitch: 0, bearing: 0,
      transitionDuration: 400, transitionInterpolator: new FlyToInterpolator(),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single raster overlay — exit swipe + flatten to top-down so the pixel data
  // reads cleanly (3D extrusion is for the choropleth, not the raster).
  const enableOverlay = useCallback((kind) => {
    swipe.reset();
    raster.setOverlay(kind);
    setViewState(vs => ({
      ...vs, pitch: 0, bearing: 0,
      transitionDuration: 400, transitionInterpolator: new FlyToInterpolator(),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Select a province programmatically (from the search box) — mirrors the map
  // click handler so both entry points fly to, fetch, and open the same province.
  const selectProvince = useCallback((nameEN) => {
    if (!thailandData) return;
    const feature = thailandData.features.find(f => f.properties.name === nameEN);
    if (!feature) return;
    province.setSelectedProvince(PROVINCE_TH[nameEN] || nameEN);
    province.setSelectedProvinceEN(nameEN);
    province.setProvinceArea((turf.area(feature) / 1_000_000).toFixed(2));
    district.resetDistrict();
    trend.resetTrend();
    province.fetchNDVI(nameEN);
    district.ensureDistrictsLoaded();
    district.loadDistrictCache(nameEN);
    const [minLng, minLat, maxLng, maxLat] = turf.bbox(feature);
    const maxSpan = Math.max(maxLng - minLng, maxLat - minLat);
    const zoom = Math.min(10, Math.max(6, Math.log2(4 / maxSpan) + 7));
    setViewState({
      longitude: (minLng + maxLng) / 2, latitude: (minLat + maxLat) / 2,
      zoom, pitch: 40, bearing: 0,
      transitionDuration: 800, transitionInterpolator: new FlyToInterpolator(),
    });
    // Intentional partial deps — hook fns are stable (setters + refs); listing the
    // hook objects would re-create this each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thailandData]);

  const baseLayers = useMemo(() => buildMapLayers({
    thailandData, ndviCache: effectiveNdviCache, timelapseMetric,
    selectedProvinceEN:    province.selectedProvinceEN,
    setSelectedProvince:   province.setSelectedProvince,
    setSelectedProvinceEN: province.setSelectedProvinceEN,
    setProvinceArea:       province.setProvinceArea,
    fetchNDVI:             province.fetchNDVI,
    districtsData:         district.districtsData,
    districtCache:         district.districtCache,
    selectedDistrictEN:    district.selectedDistrictEN,
    setSelectedDistrict:   district.setSelectedDistrict,
    setSelectedDistrictEN: district.setSelectedDistrictEN,
    setDistrictArea:       district.setDistrictArea,
    fetchDistrictNDVI:     district.fetchDistrictNDVI,
    selectProvince,
    ensureDistrictsLoaded: district.ensureDistrictsLoaded,
    loadDistrictCache:     district.loadDistrictCache,
    resetDistrict:         district.resetDistrict,
    resetTrend:            trend.resetTrend,
    showingDistricts,
    setViewState, setTooltip, setSidebarTab,
    zoom: viewState.zoom,
    recommendData:    recommend.recommendData,
    recommendVisible: recommend.recommendVisible,
    rasterTileInfo:   raster.tileInfo,
    swipeActive:      swipe.active,
    // Intentional partial deps — only re-layer on data/selection/zoom changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    thailandData, effectiveNdviCache, timelapseMetric,
    province.selectedProvinceEN,
    district.districtsData, district.districtCache, district.selectedDistrictEN,
    showingDistricts,
    viewState.zoom,
    recommend.recommendData, recommend.recommendVisible,
    raster.tileInfo, swipe.active,
  ]);

  // Swipe layers built separately so panning (which changes viewportBounds) only
  // rebuilds the two clipped rasters, not the whole province choropleth.
  const swipeLayersMemo = useMemo(
    () => (swipe.active
      ? swipeLayers({
          swipe: { tileA: swipe.tileA, tileB: swipe.tileB, diffTile: swipe.diffTile,
                   bounds: viewportBounds, split: swipe.split },
          onTileLoad: onSwipeTileLoad,
        })
      : EMPTY_LAYERS),
    [swipe.active, swipe.tileA, swipe.tileB, swipe.diffTile, viewportBounds, swipe.split, onSwipeTileLoad]
  );

  const layers = useMemo(() => [...baseLayers, ...swipeLayersMemo],
                         [baseLayers, swipeLayersMemo]);

  const sidebarData = {
    provinceList,
    selectedProvince:     province.selectedProvince,
    selectedProvinceEN:   province.selectedProvinceEN,
    selectedDistrict:     district.selectedDistrict,    // Thai — for display
    selectedDistrictEN:   district.selectedDistrictEN,  // English — for API calls
    provinceArea:         province.provinceArea,
    districtArea:         district.districtArea,
    districtsLoading:     district.districtsLoading,
    ndviStats:            province.ndviStats,
    ndviMonthly:          province.ndviMonthly,
    ndviLoading:          province.ndviLoading,
    lstStats:             province.lstStats,
    lstMonthly:           province.lstMonthly,
    lstLoading:           province.lstLoading,
    districtNdviStats:    district.districtNdviStats,
    districtNdviMonthly:  district.districtNdviMonthly,
    districtNdviLoading:  district.districtNdviLoading,
    districtLstStats:     district.districtLstStats,
    districtLstMonthly:   district.districtLstMonthly,
    districtLstLoading:   district.districtLstLoading,
    sidebarTab,
    trendYears:    trend.trendYears,
    trendData:     trend.trendData,
    trendLoading:  trend.trendLoading,
    trendProgress: trend.trendProgress,
    trendMetric:   trend.trendMetric,
    trendForecast: trend.trendForecast,
    compareList:    compare.compareList,
    compareYear:    compare.compareYear,
    compareData:    compare.compareData,
    compareLoading: compare.compareLoading,
    compareMetric:  compare.compareMetric,
    ndviCache,
    rankingData:    ranking.rankingData,
    rankingStats:   ranking.rankingStats,
    rankingLoading: ranking.rankingLoading,
    rankingYear:    ranking.rankingYear,
    recommendData:    recommend.recommendData,
    recommendLoading: recommend.recommendLoading,
    recommendVisible: recommend.recommendVisible,
    recommendScope:   recommend.recommendScope,
    recommendYear:    recommend.recommendYear,
    recommendWeights: recommend.recommendWeights,
    coolingData:    cooling.coolingData,
    coolingLoading: cooling.coolingLoading,
    coolingYear:    cooling.coolingYear,
    computing:        coverage.computing,
    computeProgress:  coverage.computeProgress,
  };

  const sidebarHandlers = {
    onReset:            handleReset,
    onSelectProvince:   selectProvince,
    onClearDistrict:    district.resetDistrict,
    setSidebarTab,
    onToggleTrendYear:  trend.toggleTrendYear,
    setTrendMetric:     trend.setTrendMetric,
    onFetchTrend:       trend.fetchTrend,
    onAddToCompare:     compare.addToCompare,
    onRemoveFromCompare: compare.removeFromCompare,
    setCompareMetric:   compare.setCompareMetric,
    setCompareYear:     compare.setCompareYear,
    onFetchCompare:     compare.fetchCompareData,
    onFetchRanking:     ranking.fetchRanking,
    setRankingYear:     ranking.setRankingYear,
    onFetchRecommend:    recommend.fetchRecommendation,
    onToggleRecommend:   () => recommend.setRecommendVisible(v => !v),
    onClearRecommend:    recommend.resetRecommend,
    setRecommendYear:    recommend.setRecommendYear,
    setRecommendWeights: recommend.setRecommendWeights,
    onFetchCooling:  cooling.fetchCooling,
    setCoolingYear:  cooling.setCoolingYear,
    onComputeMissing: coverage.computeMissing,
    onCancelCompute:  coverage.cancelCompute,
  };

  return (
    <div className="App" data-sidebar={sidebarCollapsed ? 'collapsed' : 'open'}>
      <AppHeader
        loading={loading}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(c => !c)}
        theme={theme}
        onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
        onShowAbout={() => setShowAbout(true)}
      />

      <aside className="side">
        <Sidebar data={sidebarData} handlers={sidebarHandlers} />
      </aside>

      <div className="canvas" ref={canvasRef}>
        <DeckGL
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller={true}
          layers={layers}
          getCursor={getCursor}
          glOptions={{ preserveDrawingBuffer: true }}
        >
          <Map mapStyle={mapStyle} preserveDrawingBuffer={true} />
        </DeckGL>
        {tooltip && <MapTooltip tooltip={tooltip} />}
        <MapLegend
          overlay={swipe.active ? swipe.metric : raster.overlay}
          tileInfo={swipe.active
            ? (swipe.mode === 'diff' ? swipe.diffTile : swipe.tileA)
            : raster.tileInfo}
          choropleth={timelapseMetric === 'lst' ? 'lst' : 'ndvi'}
        />

        {province.selectedProvinceEN && (
          <div className="overlay-toggle" role="group" aria-label="ภาพถ่ายดาวเทียม (raster)">
            <span className="overlay-toggle__label">ภาพดาวเทียม</span>
            <div className="overlay-toggle__btns">
              <button className="overlay-btn" data-active={!swipe.active && raster.overlay === 'none'}
                onClick={() => { swipe.reset(); raster.clearOverlay(); }}>ปิด</button>
              <button className="overlay-btn" data-active={!swipe.active && raster.overlay === 'ndvi'}
                onClick={() => enableOverlay('ndvi')}>NDVI</button>
              <button className="overlay-btn" data-active={!swipe.active && raster.overlay === 'lst'}
                onClick={() => enableOverlay('lst')}>LST</button>
            </div>

            <button className="overlay-btn overlay-btn--full" data-active={swipe.active}
              onClick={() => (swipe.active ? swipe.reset() : enableSwipe())}>
              ⇆ เทียบ 2 ปี
            </button>

            {swipe.active && (
              <div className="swipe-control">
                <div className="overlay-toggle__btns">
                  <button className="overlay-btn" data-active={swipe.metric === 'ndvi'}
                    onClick={() => swipe.setMetric('ndvi')}>NDVI</button>
                  <button className="overlay-btn" data-active={swipe.metric === 'lst'}
                    onClick={() => swipe.setMetric('lst')}>LST</button>
                </div>
                <div className="overlay-toggle__btns">
                  <button className="overlay-btn" data-active={swipe.mode === 'split'}
                    onClick={() => swipe.setMode('split')}>ซ้าย-ขวา</button>
                  <button className="overlay-btn" data-active={swipe.mode === 'diff'}
                    onClick={() => swipe.setMode('diff')}>Δ ผลต่าง</button>
                </div>
                <div className="swipe-years">
                  <label>ซ้าย
                    <select value={swipe.yearA} onChange={(e) => swipe.setYearA(Number(e.target.value))}>
                      {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </label>
                  <label>ขวา
                    <select value={swipe.yearB} onChange={(e) => swipe.setYearB(Number(e.target.value))}>
                      {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            )}

            {(raster.loading || swipe.loading
              || (swipe.active && swipe.mode === 'diff' && swipe.diffTile && !swipeTilesReady.a)
              || (swipe.active && swipe.mode === 'split' && swipe.tileA && swipe.tileB
                  && !(swipeTilesReady.a && swipeTilesReady.b)))
              && <span className="overlay-toggle__status">กำลังโหลดภาพ…</span>}
          </div>
        )}

        {swipe.active && swipe.mode === 'split' && swipe.tileA && swipe.tileB && (
          <>
            <div className="swipe-divider" style={{ left: `${swipe.split * 100}%` }}>
              <button className="swipe-divider__handle" onPointerDown={startSwipeDrag}
                aria-label="ลากเพื่อเลื่อนเส้นเทียบ">⇆</button>
            </div>
            <span className="swipe-yearbadge swipe-yearbadge--a">{swipe.metric.toUpperCase()} · {swipe.yearA}</span>
            <span className="swipe-yearbadge swipe-yearbadge--b">{swipe.metric.toUpperCase()} · {swipe.yearB}</span>
          </>
        )}

        <div className="map-controls">
          <button
            className="map-btn"
            onClick={() => setViewState({
              ...INITIAL_VIEW_STATE,
              transitionDuration: 800,
              transitionInterpolator: new FlyToInterpolator(),
            })}
            aria-label="รีเซ็ตมุมมอง"
            title="รีเซ็ตมุมมอง"
          >⟲</button>
        </div>

        <TimelapsePlayer timelapse={timelapse} />
      </div>

      <Toast />
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}

export default App;
