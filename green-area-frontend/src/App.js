import { useCallback, useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { FlyToInterpolator } from '@deck.gl/core';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';

import { MAP_STYLE, INITIAL_VIEW_STATE } from './constants';
import { useNdviCache }    from './hooks/useNdviCache';
import { useProvinceData } from './hooks/useProvinceData';
import { useDistrictData } from './hooks/useDistrictData';
import { useTrendData }    from './hooks/useTrendData';
import { useCompareData }  from './hooks/useCompareData';
import { useRankingData }  from './hooks/useRankingData';
import { useRecommendData } from './hooks/useRecommendData';
import { useTimelapseData } from './hooks/useTimelapseData';
import { buildMapLayers }  from './utils/mapLayers';
import Sidebar    from './components/Sidebar';
import AppHeader  from './components/AppHeader';
import MapTooltip from './components/MapTooltip';
import Toast      from './components/Toast';
import TimelapsePlayer from './components/TimelapsePlayer';
import { pushError } from './utils/toast';

function App() {
  const [thailandData, setThailandData] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [viewState, setViewState]       = useState(INITIAL_VIEW_STATE);
  const [tooltip, setTooltip]           = useState(null);
  const [sidebarTab, setSidebarTab]     = useState('stats');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { ndviCache, setNdviCache } = useNdviCache();
  const province = useProvinceData({ setNdviCache });
  const district = useDistrictData();
  const trend    = useTrendData();
  const compare  = useCompareData();
  const ranking  = useRankingData();
  const recommend = useRecommendData();
  const timelapse = useTimelapseData();

  const effectiveNdviCache = timelapse.timelapseCache || ndviCache;

  useEffect(() => {
    fetch('/thailand.json')
      .then(r => r.json())
      .then(data => { setThailandData(data); setLoading(false); })
      .catch(() => {
        setLoading(false);
        pushError('โหลดขอบเขตจังหวัดไม่สำเร็จ — รีเฟรชหน้าเว็บใหม่');
      });
  }, []);

  const showingDistricts = !!(province.selectedProvinceEN && district.districtsData);

  const handleReset = useCallback(() => {
    province.resetProvince();
    district.resetDistrict();
    trend.resetTrend();
    compare.resetCompare();
    recommend.resetRecommend();
    setSidebarTab('stats');
    setViewState({
      ...INITIAL_VIEW_STATE,
      transitionDuration: 800,
      transitionInterpolator: new FlyToInterpolator(),
    });
  }, [province.resetProvince, district.resetDistrict, trend.resetTrend,
      compare.resetCompare, recommend.resetRecommend]);

  const handleViewStateChange = useCallback(({ viewState: vs }) => setViewState(vs), []);
  const getCursor = useCallback(({ isHovering }) => (isHovering ? 'pointer' : 'default'), []);

  const layers = useMemo(() => buildMapLayers({
    thailandData, ndviCache: effectiveNdviCache,
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
    ensureDistrictsLoaded: district.ensureDistrictsLoaded,
    loadDistrictCache:     district.loadDistrictCache,
    resetDistrict:         district.resetDistrict,
    resetTrend:            trend.resetTrend,
    showingDistricts,
    setViewState, setTooltip, setSidebarTab,
    zoom: viewState.zoom,
    recommendData:    recommend.recommendData,
    recommendVisible: recommend.recommendVisible,
  }), [
    thailandData, effectiveNdviCache,
    province.selectedProvinceEN,
    district.districtsData, district.districtCache, district.selectedDistrictEN,
    showingDistricts,
    viewState.zoom,
    recommend.recommendData, recommend.recommendVisible,
  ]);

  const sidebarData = {
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
  };

  const sidebarHandlers = {
    onReset:            handleReset,
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
  };

  return (
    <div className="App" data-sidebar={sidebarCollapsed ? 'collapsed' : 'open'}>
      <AppHeader
        loading={loading}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(c => !c)}
      />

      <aside className="side">
        <Sidebar data={sidebarData} handlers={sidebarHandlers} />
      </aside>

      <div className="canvas">
        <DeckGL
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller={true}
          layers={layers}
          getCursor={getCursor}
          glOptions={{ preserveDrawingBuffer: true }}
        >
          <Map mapStyle={MAP_STYLE} preserveDrawingBuffer={true} />
        </DeckGL>
        {tooltip && <MapTooltip tooltip={tooltip} />}

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
    </div>
  );
}

export default App;
