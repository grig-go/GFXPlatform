import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { SummaryView } from './components/SummaryView';
import { MapView } from './components/MapView';
import { Telestrator } from './components/Telestrator';
import { BackendDataViewer } from './components/BackendDataViewer';
import { AIAnalysisPanel } from './components/AIAnalysisPanel';
import { initializeBackendData } from './utils/initializeData';
import { fetchPopulationData, initializePopulationData } from './utils/populationApi';
import { initializeWorldCupData } from './utils/worldCupApi';
import { loadAIProviderSettingsSync, type AIProviderSettings } from './utils/aiProviderSettings';
import { loadMapSettings, saveMapSettings } from './utils/mapSettingsApi';
import type mapboxgl from 'mapbox-gl';
import { Toaster } from './components/ui/sonner';
import AuthGate from './components/AuthGate';
import UserMenu from './components/UserMenu';
import ElectionDashboard from './components/elections/ElectionDashboard';

export type ViewType = 'balanceOfPower' | 'ageBreakdown' | 'raceDiversity' | 'education' | 'yearsInOffice' | 'map' | 'backendData';
export type RaceType = 'president' | 'senate' | 'house' | 'governor' | 'ag';

export default function App() {
  const [selectedView, setSelectedView] = useState<ViewType>('map');
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('left');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCountyPanelCollapsed, setIsCountyPanelCollapsed] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  const [selectedRace, setSelectedRace] = useState<RaceType>('president');
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const electionMapRef = useRef<mapboxgl.Map | null>(null);

  const [selectedChambers, setSelectedChambers] = useState({
    house: true,
    senate: true,
  });
  
  const [selectedDataOptions, setSelectedDataOptions] = useState({
    raceDetails: true,
    raceStatusBreakdown: true,
    autoRefresh: false,
    refreshData: false,
    weather: false,
    weatherRadar: false,
    stateInfo: false,
    aiInfra: false,
    population: false,
    worldCup2026: false,
    elections: true,
  });

  const [telestratorEnabled, setTelestratorEnabled] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>('#eab308'); // Default to yellow
  const [penSize, setPenSize] = useState(4);
  const [shapeDetectionEnabled, setShapeDetectionEnabled] = useState(false); // Shape detection off by default
  
  // Map settings state
  const [mapStyle, setMapStyle] = useState<'light' | 'dark' | 'satellite'>('light');
  const [showMapLabels, setShowMapLabels] = useState(true);
  const [globeMode, setGlobeMode] = useState(false);
  const [atmosphereEnabled, setAtmosphereEnabled] = useState(true);
  const [projection, setProjection] = useState<'mercator' | 'albers' | 'equirectangular'>('mercator');
  const [electionMapOpacity, setElectionMapOpacity] = useState<number>(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const [countyCount, setCountyCount] = useState<number>(0);
  const [isFetchingCensus, setIsFetchingCensus] = useState(false);
  
  // AI Analysis Panel state
  const [showAIAnalysisPanel, setShowAIAnalysisPanel] = useState(false);
  const [screenshotImage, setScreenshotImage] = useState<string | null>(null);
  const [aiAnalysis, setAIAnalysis] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentAIFeature, setCurrentAIFeature] = useState<'summary' | 'outliers' | 'correlation' | 'sentiment'>('summary');
  const [aiProviderSettings, setAIProviderSettings] = useState<AIProviderSettings>(loadAIProviderSettingsSync());
  const [openAISettingsCallback, setOpenAISettingsCallback] = useState<(() => void) | null>(null);

  // Shared state for election selectedData between ElectionDashboard and MapView
  const [electionSelectedData, setElectionSelectedData] = useState<any>(null);

  // Synthetic race data state
  const [syntheticRaceData, setSyntheticRaceData] = useState<any[]>([]);

  // Store the default position updater function from MapView
  const [defaultPositionUpdater, setDefaultPositionUpdater] = useState<((position: { latitude: number; longitude: number; zoom: number }) => void) | null>(null);

  // Load map settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await loadMapSettings();
      console.log('📥 Loaded ALL map settings from database via RPC:', settings);
      
      if (settings.election_map_opacity !== undefined) {
        setElectionMapOpacity(settings.election_map_opacity);
      }
      if (settings.map_style) {
        setMapStyle(settings.map_style as 'light' | 'dark' | 'satellite');
      }
      if (settings.show_map_labels !== undefined) {
        setShowMapLabels(settings.show_map_labels);
      }
      if (settings.atmosphere_enabled !== undefined) {
        setAtmosphereEnabled(settings.atmosphere_enabled);
      }
      if (settings.globe_mode !== undefined) {
        setGlobeMode(settings.globe_mode);
      }
      if (settings.projection_type) {
        setProjection(settings.projection_type as 'mercator' | 'albers' | 'equirectangular');
      }
      
      // Update default position in MapView if available
      if (settings.default_latitude && settings.default_longitude && settings.default_zoom) {
        if (defaultPositionUpdater) {
          defaultPositionUpdater({
            latitude: settings.default_latitude,
            longitude: settings.default_longitude,
            zoom: settings.default_zoom
          });
        }
      }
      
      // Mark initial load as complete
      setIsInitialLoad(false);
    };
    loadSettings();
  }, [defaultPositionUpdater]);

  // Save election map opacity to database when it changes (skip initial load)
  useEffect(() => {
    // Skip saving during initial load
    if (isInitialLoad) return;
    
    const saveOpacity = async () => {
      try {
        await saveMapSettings({ election_map_opacity: electionMapOpacity });
        console.log(`💾 Auto-saved election map opacity: ${electionMapOpacity}`);
      } catch (error) {
        console.error('Failed to save election map opacity:', error);
      }
    };
    
    // Debounce the save to avoid excessive API calls while dragging slider
    const timeoutId = setTimeout(saveOpacity, 500);
    return () => clearTimeout(timeoutId);
  }, [electionMapOpacity]);

  // Initialize backend data on first load
  useEffect(() => {
    const initData = async () => {
      try {
        await initializeBackendData();
        console.log('Successfully initialized all demographic data in backend');
        
        // Initialize World Cup data
        await initializeWorldCupData();
        console.log('Successfully initialized World Cup 2026 data in backend');
        
        // Check county count
        const popData = await fetchPopulationData();
        if (popData) {
          setCountyCount(popData.features.length);
        }
      } catch (error) {
        console.error('Failed to initialize backend data:', error);
      }
    };
    
    initData();
  }, []);
  
  // Update county count when population option is toggled
  useEffect(() => {
    if (selectedDataOptions.population) {
      const updateCount = async () => {
        const popData = await fetchPopulationData();
        if (popData) {
          setCountyCount(popData.features.length);
          console.log(`County count updated: ${popData.features.length}`);
        }
      };
      updateCount();
    }
  }, [selectedDataOptions.population]);
  
  // Manual Census fetch handler
  const handleFetchAllCounties = async () => {
    setIsFetchingCensus(true);
    try {
      console.log('Manually triggering full Census API fetch...');
      const data = await initializePopulationData();
      if (data) {
        setCountyCount(data.features.length);
        console.log(`✅ Successfully fetched ${data.features.length} counties`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch Census data:', error);
    } finally {
      setIsFetchingCensus(false);
    }
  };

  return (
    // <AuthGate>
    <>
      <UserMenu />
      <div className="flex h-screen bg-gray-50 relative">
      
      {/* Single Sidebar instance that moves position */}
      <div 
        className={`relative z-[1000] ${
          sidebarPosition === 'right' ? 'order-last' : 'order-first'
        }`}
      >
        <Sidebar
          selectedView={selectedView}
          setSelectedView={setSelectedView}
          sidebarPosition={sidebarPosition}
          setSidebarPosition={setSidebarPosition}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedRace={selectedRace}
          setSelectedRace={setSelectedRace}
          selectedChambers={selectedChambers}
          setSelectedChambers={setSelectedChambers}
          selectedDataOptions={selectedDataOptions}
          setSelectedDataOptions={setSelectedDataOptions}
          telestratorEnabled={telestratorEnabled}
          setTelestratorEnabled={setTelestratorEnabled}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          penSize={penSize}
          setPenSize={setPenSize}
          shapeDetectionEnabled={shapeDetectionEnabled}
          setShapeDetectionEnabled={setShapeDetectionEnabled}
          mapStyle={mapStyle}
          setMapStyle={setMapStyle}
          showMapLabels={showMapLabels}
          setShowMapLabels={setShowMapLabels}
          globeMode={globeMode}
          setGlobeMode={setGlobeMode}
          atmosphereEnabled={atmosphereEnabled}
          setAtmosphereEnabled={setAtmosphereEnabled}
          projection={projection}
          setProjection={setProjection}
          electionMapOpacity={electionMapOpacity}
          setElectionMapOpacity={setElectionMapOpacity}
          mapRef={mapRef}
          electionMapRef={electionMapRef}
          setShowAIAnalysisPanel={setShowAIAnalysisPanel}
          setScreenshotImage={setScreenshotImage}
          setAIAnalysis={setAIAnalysis}
          setIsAnalyzingImage={setIsAnalyzingImage}
          setAnalysisError={setAnalysisError}
          setCurrentAIFeature={setCurrentAIFeature}
          aiProviderSettings={aiProviderSettings}
          setAIProviderSettings={setAIProviderSettings}
          onRegisterOpenAISettings={setOpenAISettingsCallback}
          defaultPositionUpdater={defaultPositionUpdater}
          syntheticRaceData={syntheticRaceData}
          setSyntheticRaceData={setSyntheticRaceData}
        />
      </div>
      
      <main 
        id="main-content"
        className="flex-1 overflow-auto"
        style={{ pointerEvents: telestratorEnabled ? 'none' : 'auto' }}
      >
        {/* Backend Data View - Commented out */}
        {/* {selectedView === 'backendData' ? (
          <BackendDataViewer 
            countyCount={countyCount}
            isFetchingCensus={isFetchingCensus}
            onFetchAllCounties={handleFetchAllCounties}
          />
        ) : */}
        {selectedView === 'map' ? (
          <>
            {/* Election Dashboard - always mounted to preserve map sync, hidden when elections disabled */}
            <div
              className="absolute inset-0"
              style={{
                zIndex: 0,
                visibility: selectedDataOptions.elections ? 'visible' : 'hidden',
                pointerEvents: selectedDataOptions.elections ? 'auto' : 'none'
              }}
            >
              <ElectionDashboard
                initialYear={selectedYear === 'synthetic' ? 2024 : parseInt(selectedYear) as 2012 | 2016 | 2020 | 2024}
                initialRace={selectedRace}
                onYearChange={(year: number) => setSelectedYear(year.toString())}
                onRaceChange={setSelectedRace}
                mapViewRef={mapRef}
                electionMapRef={electionMapRef}
                selectedDataOptions={selectedDataOptions}
                mapStyle={mapStyle}
                showMapLabels={showMapLabels}
                globeMode={globeMode}
                atmosphereEnabled={atmosphereEnabled}
                projection={projection}
                electionMapOpacity={electionMapOpacity}
                sidebarPosition={sidebarPosition}
                isSidebarCollapsed={isSidebarCollapsed}
                syntheticRaceData={syntheticRaceData}
                isSyntheticMode={selectedYear === 'synthetic'}
                onSelectedDataChange={setElectionSelectedData}
              />
            </div>

            {/* MapView - always rendered, transparent background when elections enabled */}
            <div
              className="absolute inset-0"
              style={{
                zIndex: selectedDataOptions.elections ? 10 : 1,
                // pointerEvents: selectedDataOptions.elections && !selectedDataOptions.weather &&
                //                !selectedDataOptions.weatherRadar && !selectedDataOptions.stateInfo &&
                //                !selectedDataOptions.aiInfra && !selectedDataOptions.population &&
                //                !selectedDataOptions.worldCup2026 ? 'none' : 'auto'
                pointerEvents: 'auto'
              }}
            >
              <MapView
                key={`${mapStyle}-${showMapLabels}`}
                selectedChambers={selectedChambers}
                selectedDataOptions={selectedDataOptions}
                sidebarPosition={sidebarPosition}
                mapStyle={mapStyle}
                showMapLabels={showMapLabels}
                globeMode={globeMode}
                atmosphereEnabled={atmosphereEnabled}
                projection={projection}
                mapRef={mapRef}
                electionMapRef={electionMapRef}
                isSidebarCollapsed={isSidebarCollapsed}
                isCountyPanelCollapsed={isCountyPanelCollapsed}
                setIsCountyPanelCollapsed={setIsCountyPanelCollapsed}
                setShowAIAnalysisPanel={setShowAIAnalysisPanel}
                setScreenshotImage={setScreenshotImage}
                setAIAnalysis={setAIAnalysis}
                setIsAnalyzingImage={setIsAnalyzingImage}
                setAnalysisError={setAnalysisError}
                setCurrentAIFeature={setCurrentAIFeature}
                aiProviderSettings={aiProviderSettings}
                selectedYear={selectedYear}
                selectedRace={selectedRace}
                externalSelectedData={electionSelectedData}
                onRegisterDefaultPositionUpdater={setDefaultPositionUpdater}
                syntheticRaceData={syntheticRaceData}
                isSyntheticMode={selectedYear === 'synthetic'}
              />
            </div>
          </>
        ) : (
          <SummaryView 
            selectedView={selectedView}
            selectedChambers={selectedChambers}
            selectedDataOptions={selectedDataOptions}
            setShowAIAnalysisPanel={setShowAIAnalysisPanel}
            setScreenshotImage={setScreenshotImage}
            setAIAnalysis={setAIAnalysis}
            setIsAnalyzingImage={setIsAnalyzingImage}
            setAnalysisError={setAnalysisError}
            setCurrentAIFeature={setCurrentAIFeature}
            aiProviderSettings={aiProviderSettings}
          />
        )}
      </main>
      
      {/* Telestrator overlay - blocks interaction with map when enabled */}
      <Telestrator
        enabled={telestratorEnabled}
        color={selectedColor}
        penSize={penSize}
        sidebarPosition={sidebarPosition}
        isSidebarCollapsed={isSidebarCollapsed}
        shapeDetectionEnabled={shapeDetectionEnabled}
      />
      
      {/* AI Analysis Panel - Rendered at app level */}
      {showAIAnalysisPanel && (
        <AIAnalysisPanel
          screenshotImage={screenshotImage}
          aiAnalysis={aiAnalysis}
          isAnalyzingImage={isAnalyzingImage}
          analysisError={analysisError}
          aiProviderSettings={aiProviderSettings}
          sidebarPosition={sidebarPosition}
          currentFeature={currentAIFeature}
          onClose={() => setShowAIAnalysisPanel(false)}
          onOpenAISettings={openAISettingsCallback || undefined}
        />
      )}
      
      {/* Toast notifications */}
      <Toaster />
    </div>
    {/* </AuthGate> */}
    </>
  );
}