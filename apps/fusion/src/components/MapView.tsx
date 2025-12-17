import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AnimatePresence } from 'motion/react';
import { CountyInfoPanel } from './CountyInfoPanel';
import { fetchWeatherLocations, fetchRadarFrames, type WeatherLocation } from '../utils/weatherApi';
import { WeatherMarker } from './WeatherMarker';
import { StateInfoPopup } from './StateInfoPopup';
import { StateInfoPanel } from './StateInfoPanel';
import { AIInfraPopup } from './AIInfraPopup';
import { AIInfraMarker } from './AIInfraMarker';
import { AIInfraInfoPanel } from './AIInfraInfoPanel';
import { StadiumInfoPanel } from './StadiumInfoPanel';
import { StadiumMarker } from './StadiumMarker';
import { RadarControls } from './RadarControls';
import { StateQuickLinksPanel } from './StateQuickLinksPanel';
import { MediaMarker } from './MediaMarker';
import { MediaInfoPanel } from './MediaInfoPanel';
import { getStateInfo, stateData } from '../utils/stateData';
import { fetchAIInfraData, type AIInfraFeature } from '../utils/aiInfraApi';
import { fetchPopulationData, type PopulationData } from '../utils/populationApi';
import { fetchWorldCupData, initializeWorldCupData, type WorldCupStadium } from '../utils/worldCupApi';
import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, Server, MapPin, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { getElectionData, getCountyElectionData, getDistrictElectionData, type ElectionType, type ElectionYear } from './elections/data/electionData';
import { getPresidentialElectionNationalData } from './elections/data/presidentialElectionNationalData';
import { stateAbbreviations } from './elections/data/stateData';
import { useDataSync } from './elections/data/syncData';
import { CURRENT_ELECTION_YEAR } from '../utils/constants';
import { loadMapSettings } from '../utils/mapSettingsApi';
import { fetchParties, normalizePartyCode, clearPartyCache } from '../utils/partyData';

interface MapViewProps {
  selectedChambers: {
    house: boolean;
    senate: boolean;
  };
  selectedDataOptions: {
    elections?: boolean;
    [key: string]: any;
  };
  sidebarPosition: 'left' | 'right';
  mapStyle: 'light' | 'dark' | 'satellite';
  showMapLabels: boolean;
  globeMode: boolean;
  atmosphereEnabled: boolean;
  projection: 'mercator' | 'albers' | 'equirectangular';
  mapRef?: React.MutableRefObject<mapboxgl.Map | null>;
  electionMapRef?: React.MutableRefObject<mapboxgl.Map | null>;
  isSidebarCollapsed: boolean;
  isCountyPanelCollapsed: boolean;
  setIsCountyPanelCollapsed: (collapsed: boolean) => void;
  setShowAIAnalysisPanel?: (show: boolean) => void;
  setScreenshotImage?: (image: string | null) => void;
  setAIAnalysis?: (analysis: string | null) => void;
  setIsAnalyzingImage?: (analyzing: boolean) => void;
  setAnalysisError?: (error: string | null) => void;
  setCurrentAIFeature?: (feature: 'summary' | 'outliers' | 'correlation' | 'sentiment') => void;
  aiProviderSettings?: any;
  selectedYear?: string;
  selectedRace?: 'president' | 'senate' | 'house' | 'governor' | 'ag';
  onSelectedDataChange?: (data: any) => void;
  externalSelectedData?: any;
  onRegisterDefaultPositionUpdater?: (updater: (position: { latitude: number; longitude: number; zoom: number }) => void) => void;
  syntheticRaceData?: any[];
  isSyntheticMode?: boolean;
}

mapboxgl.accessToken = 'pk.eyJ1IjoiZW1lcmdlbnRzb2x1dGlvbnMiLCJhIjoiY21mbGJuanZ1MDNhdDJqcTU1cHVjcWJycCJ9.Tk2txI10-WExxSoPnHlu_g';

function getWeatherIcon(condition?: string): string {
  if (!condition) return '☀️';
  const lower = condition.toLowerCase();
  if (lower.includes('rain')) return '🌧️';
  if (lower.includes('snow')) return '❄️';
  if (lower.includes('cloud')) return '☁️';
  if (lower.includes('sun') || lower.includes('clear')) return '☀️';
  if (lower.includes('storm') || lower.includes('thunder')) return '⛈️';
  return '☀️';
}

// Generate Mapbox expression for state colors based on registered voter data
function getStateColorExpression(): any[] {
  const expression: any[] = ['match', ['get', 'STATE_NAME']];
  
  // Light blue for Democrats, light red for Republicans
  const democratColor = '#93c5fd'; // lighter blue
  const republicanColor = '#fca5a5'; // lighter red
  const defaultColor = '#e5e7eb'; // gray for states without data
  
  Object.entries(stateData).forEach(([stateName, info]) => {
    const { democrat, republican } = info.registeredVoters;
    const color = democrat > republican ? democratColor : republicanColor;
    expression.push(stateName, color);
  });
  
  expression.push(defaultColor); // fallback color
  return expression;
}

export function MapView({ selectedChambers, selectedDataOptions, sidebarPosition, mapStyle, showMapLabels, globeMode, atmosphereEnabled, projection, mapRef, electionMapRef, isSidebarCollapsed, isCountyPanelCollapsed, setIsCountyPanelCollapsed, setShowAIAnalysisPanel, setScreenshotImage, setAIAnalysis, setIsAnalyzingImage, setAnalysisError, setCurrentAIFeature, aiProviderSettings, selectedYear = '2024', selectedRace = 'president', onSelectedDataChange, externalSelectedData, onRegisterDefaultPositionUpdater, syntheticRaceData, isSyntheticMode = false }: MapViewProps) {
  console.log('🗺️ MapView render - selectedDataOptions:', selectedDataOptions);
  console.log('🌦️ weatherRadar enabled?', selectedDataOptions?.weatherRadar);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [weatherLocations, setWeatherLocations] = useState<WeatherLocation[]>([]);
  const [aiInfraFeatures, setAIInfraFeatures] = useState<AIInfraFeature[]>([]);
  const [worldCupStadiums, setWorldCupStadiums] = useState<WorldCupStadium[]>([]);
  const [selectedStadium, setSelectedStadium] = useState<WorldCupStadium | null>(null);
  const [showStadiumPanel, setShowStadiumPanel] = useState(false);
  const [populationData, setPopulationData] = useState<PopulationData | null>(null);
  const [showStateQuickLinks, setShowStateQuickLinks] = useState(false);
  
  // Marker positions for DOM rendering
  const [stadiumPositions, setStadiumPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [weatherPositions, setWeatherPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [aiInfraPositions, setAIInfraPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [mediaPositions, setMediaPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  
  // Selected AI infra feature for popup
  const [selectedAIInfra, setSelectedAIInfra] = useState<AIInfraFeature | null>(null);
  const [showAIInfraPanel, setShowAIInfraPanel] = useState(false);
  
  // Media assets and selected media
  interface MediaAsset {
    id: string;
    name: string;
    file_url: string;
    thumbnail_url: string;
    media_type: string;
    latitude: number;
    longitude: number;
    created_at: string;
    tags: string[];
  }
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  
  // Selected state for panel
  const [selectedState, setSelectedState] = useState<any | null>(null);
  const [showStatePanel, setShowStatePanel] = useState(false);
  
  // Track selected state ID for highlighting
  const selectedStateIdRef = useRef<string | number | null>(null);
  
  const statePopupRef = useRef<mapboxgl.Popup | null>(null);
  const currentStyleUrlRef = useRef<string>('mapbox://styles/mapbox/light-v11');
  const pendingStyleRef = useRef<string | null>(null); // Store pending style when Elections is checked
  
  // Default map position from database (null until loaded)
  const [defaultPosition, setDefaultPosition] = useState<{ latitude: number; longitude: number; zoom: number } | null>(null);

  // Weather radar state
  const [radarFrames, setRadarFrames] = useState<Array<{time: number, path: string}>>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isRadarPlaying, setIsRadarPlaying] = useState(false);
  const [radarOpacity, setRadarOpacity] = useState(0.7);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const radarActiveLayerRef = useRef<'radarA' | 'radarB'>('radarA');
  const previousFrameIndexRef = useRef<number>(0);

  // Election data state
  const [currentElection, setCurrentElection] = useState<any>(null);
  const [currentNationalElection, setCurrentNationalElection] = useState<any>(null);
  const [currentCountyElection, setCurrentCountyElection] = useState<any>(null);
  const [currentDistrictElection, setCurrentDistrictElection] = useState<any>(null);
  const [currentResults, setCurrentResults] = useState<any>(null);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [displayResult, setDisplayResult] = useState<any>(null);
  const [stateName, setStateName] = useState<string>('');
  const [countyName, setCountyName] = useState<string>('');

  // Map race type to ElectionType
  const mapRaceToElectionType = (race: 'president' | 'senate' | 'house' | 'governor' | 'ag'): ElectionType => {
    if (race === 'president') return 'presidential';
    if (race === 'senate') return 'senate';
    if (race === 'house') return 'house';
    return 'presidential';
  };

  const electionType = mapRaceToElectionType(selectedRace);
  const electionYear = (selectedYear === 'synthetic' ? 2024 : parseInt(selectedYear)) as ElectionYear;

  // Register default position updater function using useEffect to avoid setState during render
  useEffect(() => {
    if (onRegisterDefaultPositionUpdater) {
      const updater = (position: { latitude: number; longitude: number; zoom: number }) => {
        console.log('📍 MapView: Updating default position from external source (MapSettings):', position);
        setDefaultPosition(position);
      };
      onRegisterDefaultPositionUpdater(updater);
    }
  }, [onRegisterDefaultPositionUpdater]);

  // Fetch default position from database on mount and fly to it
  useEffect(() => {
    const fetchAndApplyDefaultPosition = async () => {
      try {
        console.log('📍 MapView: Fetching default position via RPC...');
        const settings = await loadMapSettings();
        console.log('📍 MapView: RPC settings result:', settings);
        
        if (settings.default_latitude && settings.default_longitude && settings.default_zoom) {
          const position = {
            latitude: settings.default_latitude,
            longitude: settings.default_longitude,
            zoom: settings.default_zoom
          };
          
          console.log('📍 MapView: Setting default position to:', position);
          setDefaultPosition(position);
          
          // Wait for map to be ready, then automatically fly to the default position
          const flyToDefault = () => {
            if (mapRef?.current) {
              console.log('✈️ MapView: Auto-flying to default position on app load');
              mapRef.current.flyTo({
                center: [position.longitude, position.latitude],
                zoom: position.zoom,
                pitch: 0,
                bearing: 0,
                duration: 1500,
                essential: true
              });
            }
          };
          
          // Try immediately if map is ready, otherwise wait for map to load
          if (mapRef?.current && (mapRef.current as any).loaded()) {
            flyToDefault();
          } else if (mapRef?.current) {
            mapRef.current.once('load', flyToDefault);
          }
          
          console.log('✅ Loaded default position from database via RPC');
        } else {
          console.log('⚠️ MapView: No default position in settings');
        }
      } catch (error) {
        console.error('❌ Error fetching default position:', error);
      }
    };

    fetchAndApplyDefaultPosition();
  }, [mapRef]);

  // Fetch election data when year or race changes
  useEffect(() => {
    if (!selectedDataOptions?.elections) return;
    // Transform and use synthetic data if in synthetic mode
    if (selectedYear === 'synthetic') {
      console.log('⚡ MapView: Synthetic mode active, transforming synthetic data');
      
      if (syntheticRaceData && syntheticRaceData.length > 0) {
        // Make transformation async to fetch party colors
        const transformSyntheticData = async () => {
          // Extract race name from first race
          // If the name is like "FL 2028", extract just "2028" as the common year
          // If there's a race_name field at the top level, use that instead
          let raceName = 'Synthetic Race';
          if (syntheticRaceData.length > 0) {
            const firstRace = syntheticRaceData[0];
            
            // Check if there's a race_name field (common to all states)
            if (firstRace.race_name) {
              raceName = firstRace.race_name;
            } else if (firstRace.name) {
               raceName = firstRace.name; // Use full name!
            }
          }
          
          console.log('🏁 MapView: Race name from synthetic data:', raceName);
          
          // Clear party cache to ensure we get fresh colors from database
          // console.log('🗑️ MapView: Clearing party cache...');
          clearPartyCache();
          
          // Fetch real party data from backend
          // console.log('🎨 MapView: Fetching party colors from e_parties table...');
          let partiesData: any;
          try {
            partiesData = await fetchParties();
            // console.log('🎨 MapView: ✅ Party colors fetched successfully!');
            // console.log('🎨 MapView: DEM color from fetch:', partiesData['DEM']?.color_hex);
            // console.log('🎨 MapView: REP color from fetch:', partiesData['REP']?.color_hex);
          } catch (error) {
            console.error('🎨 MapView: ❌ Error fetching parties, using fallback colors:', error);
            partiesData = {};
          }
          
          const results: any = {};
          const candidates: any = {};
          
          // Build parties object using fetched data
          const parties: any = {
            'DEM': {
              name: partiesData['DEM']?.name || 'Democratic',
              color: partiesData['DEM']?.color_hex || '#60a5fa'
            },
            'REP': {
              name: partiesData['REP']?.name || 'Republican', 
              color: partiesData['REP']?.color_hex || '#ef4444'
            },
            'IND': {
              name: partiesData['IND']?.name || 'Independent',
              color: partiesData['IND']?.color_hex || '#a855f7'
            },
            'LIB': {
              name: partiesData['LIB']?.name || 'Libertarian',
              color: partiesData['LIB']?.color_hex || '#f59e0b'
            }
          };
          
          console.log('🎨 MapView: Final parties object with colors:');
          console.log('  DEM:', parties['DEM']);
          console.log('  REP:', parties['REP']);
          console.log('  IND:', parties['IND']);
          console.log('  LIB:', parties['LIB']);
        
        console.log('🔥 MapView: Processing synthetic data:', syntheticRaceData.length, 'records');
          
          syntheticRaceData.forEach((race, index) => {
            // Get state code - either from state_abbr or by looking up the full state name
            let stateCode = race.state_abbr;
            
            if (!stateCode && race.state) {
              // Look up abbreviation from full state name
              stateCode = stateAbbreviations[race.state];
              console.log(`🔍 MapView: Mapped state name "${race.state}" -> "${stateCode}"`);
            }
            
            if (!stateCode) {
              // console.log(`❌ MapView: SKIPPING race ${index} - NO state_abbr`, race);
              return;
            }

            // Build state-specific candidate info and vote results
            const stateCandidates: Record<string, any> = {};
            const voteResults: any = {}; // Start empty to avoid duplicate keys overwriting each other

            if (race.candidates && Array.isArray(race.candidates)) {
              race.candidates.forEach((candidate: any, idx: number) => {
                const party = candidate.metadata?.party || candidate.metadata?.candidate_party;
                const candidateName = candidate.metadata?.candidate_name || 'Unknown';
                const candidatePhoto = candidate.metadata?.headshot || '';
                const votes = candidate.metadata?.metadata?.votes || 0;
                const percent = candidate.metadata?.metadata?.vote_percentage || 0;
                const isWinner = candidate.metadata?.metadata?.winner || false;
                
                // Normalize party code (GOP → REP)
                const normalizedParty = normalizePartyCode(party);
                
                // Always use index-based ID to ensure uniqueness and avoid potential issues with payload IDs
                // This guarantees that even if IDs are missing or duplicated, we get unique entries
                const candId = `cand-${normalizedParty.toLowerCase()}-${idx}`;
                
                voteResults[candId] = { votes, percent, winner: isWinner };

                // Store candidate info
                const candInfo = { 
                  party_code: normalizedParty, 
                  name: candidateName,
                  img: candidatePhoto
                };
                
                // Add to state-specific candidates
                stateCandidates[candId] = candInfo;
                
                // Add to global candidates if not present
                if (!candidates[candId]) {
                  candidates[candId] = candInfo;
                }

                // If it's a new party, make sure we have a basic entry in parties object so getPartyColor works
                if (!parties[normalizedParty]) {
                  parties[normalizedParty] = {
                      name: partiesData[normalizedParty]?.name || normalizedParty,
                      color: partiesData[normalizedParty]?.color_hex || '#808080' // Default gray
                  };
                }
              });
            }
            
            // Create result entry for this state
            results[stateCode] = {
              ...voteResults,
              stateElectoralVotes: race.electoral_votes || race.Electoral_votes || 0,
              stateCandidates: Object.keys(stateCandidates).length > 0 ? stateCandidates : undefined,
              raceName: race.race_name || race.name || 'Synthetic Race'
            };
          });
        
          if (!candidates['cand-dem']) candidates['cand-dem'] = { party_code: 'DEM', name: 'Democrat Candidate' };
          if (!candidates['cand-rep']) candidates['cand-rep'] = { party_code: 'REP', name: 'Republican Candidate' };
          if (!candidates['cand-ind']) candidates['cand-ind'] = { party_code: 'IND', name: 'Independent Candidate' };
          if (!candidates['cand-lib']) candidates['cand-lib'] = { party_code: 'LIB', name: 'Libertarian Candidate' };
          
          const transformedData = {
            results,
            candidates,
            parties,
            winner: raceName, // Use extracted race name
            year: raceName, // Use extracted race name as year for display
            description: 'Synthetic race data from Nova'
          };
          
          console.log('🔍 [MapView transformSyntheticData] About to set currentElection and currentResults');
          console.log('🔍 transformedData.results keys:', Object.keys(results));
          console.log('🔍 transformedData.results:', results);
          
          setCurrentElection(transformedData);
          setCurrentResults(transformedData.results);
          console.log('⚡ MapView: Synthetic data transformed and set', transformedData);
        };
        
        // Call the async transformation function
        transformSyntheticData().catch(error => {
          console.error('❌ MapView: Error transforming synthetic data:', error);
          setCurrentElection(null);
          setCurrentResults(null);
        });
      } else {
        setCurrentElection(null);
        setCurrentResults(null);
      }
      
      return;
    }

    let isCancelled = false;

    const fetchElectionData = async () => {
      try {
        const data = await getElectionData(electionType, electionYear);
        if (!isCancelled) {
          setCurrentElection(data);
          setCurrentResults(data?.results || null);
        }
      } catch (error) {
        console.error('Error fetching election data in MapView:', error);
        if (!isCancelled) {
          setCurrentElection(null);
          setCurrentResults(null);
        }
      }
    };

    const fetchCountyData = async () => {
      try {
        const data = await getCountyElectionData(electionType, electionYear);
        if (!isCancelled) {
          setCurrentCountyElection(data);
        }
      } catch (error) {
        console.error('Error fetching county election data in MapView:', error);
        if (!isCancelled) {
          setCurrentCountyElection(null);
        }
      }
    };

    const fetchDistrictData = async () => {
      try {
        const data = await getDistrictElectionData(electionType, electionYear);
        if (!isCancelled) {
          setCurrentDistrictElection(data);
        }
      } catch (error) {
        console.error('Error fetching district election data in MapView:', error);
        if (!isCancelled) {
          setCurrentDistrictElection(null);
        }
      }
    };

    fetchElectionData();
    fetchCountyData();
    fetchDistrictData();

    return () => {
      isCancelled = true;
    };
  }, [selectedYear, selectedRace, electionType, electionYear, selectedDataOptions?.elections, syntheticRaceData]);

  // Fetch national-level presidential election data when type or year changes
  useEffect(() => {
    if (!selectedDataOptions?.elections) return;
    // Skip fetching if in synthetic mode - data comes from ElectionDashboard
    if (selectedYear === 'synthetic') {
      console.log('⚡ MapView: Synthetic mode active, skipping national election data fetch');
      setCurrentNationalElection(null);
      return;
    }

    let isCancelled = false;

    const fetchNationalData = async () => {
      if (electionType === 'presidential') {
        try {
          const data = await getPresidentialElectionNationalData(electionYear as 2012 | 2016 | 2020 | 2024);
          console.log('MapView: National data fetched:', data ? 'SUCCESS' : 'NULL');
          if (!isCancelled) {
            setCurrentNationalElection(data);
          }
        } catch (error) {
          console.error('MapView: Error updating national election data:', error);
          if (!isCancelled) {
            setCurrentNationalElection(null);
          }
        }
      } else {
        setCurrentNationalElection(null);
      }
    };

    fetchNationalData();

    return () => {
      isCancelled = true;
    };
  }, [electionType, electionYear, selectedDataOptions?.elections]);

  // Subscribe to data updates for current election year (30 second sync)
  useEffect(() => {
    if (!selectedDataOptions?.elections) return;
    
    // Skip data sync if in synthetic mode
    if (isSyntheticMode) {
      console.log('⚡ MapView: Synthetic mode active, skipping data sync subscription');
      return;
    }

    // Only subscribe if we're viewing the current election year
    if (electionYear !== CURRENT_ELECTION_YEAR) {
      console.log(`MapView: Not subscribing to updates: electionYear (${electionYear}) !== CURRENT_ELECTION_YEAR (${CURRENT_ELECTION_YEAR})`);
      return;
    }

    console.log(`MapView: 📡 Subscribing to data updates for ${electionType} ${electionYear}`);

    const cleanup = useDataSync(electionType, electionYear, (data, dataType) => {
      console.log(`MapView: 📨 Received ${dataType} update for ${electionType} ${electionYear}`);

      // Update the appropriate state based on data type
      if (dataType === 'state') {
        console.log('MapView: Updating state-level election data');
        setCurrentElection(data);
        setCurrentResults(data?.results || null);
      } else if (dataType === 'national') {
        console.log('MapView: Updating national-level election data');
        setCurrentNationalElection(data);
      } else if (dataType === 'county') {
        console.log('MapView: Updating county-level election data');
        setCurrentCountyElection(data);
      } else if (dataType === 'district') {
        console.log('MapView: Updating district-level election data');
        setCurrentDistrictElection(data);
      }
    });

    return cleanup;
  }, [electionType, electionYear, CURRENT_ELECTION_YEAR, selectedDataOptions?.elections, isSyntheticMode]);

  // Helper function to convert election data format to display format
  const convertNewFormatToDisplayFormat = (rawData: any, geoId: string) => {
    const result = rawData?.results?.[geoId];
    if (!result) return null;

    const candidates: any = {};
    let winner: string | undefined;
    let percentReporting = 0;

    // Check if this state has state-specific candidate info
    const stateCandidates = result.stateCandidates;
    const candidateInfo = stateCandidates || rawData.candidates; // Use state-specific if available, else global
    
    console.log(`🎯 [MapView] Using ${stateCandidates ? 'STATE-SPECIFIC' : 'GLOBAL'} candidate info for ${geoId}`);
    if (stateCandidates) {
      console.log('🎯 State candidates:', stateCandidates);
    }

    for (const [candidateId, candidateResult] of Object.entries(result)) {
      if (candidateId === 'stateElectoralVote' || candidateId === 'stateElectoralVotes') continue;
      if (candidateId === 'stateCandidates') continue; // Skip the metadata field
      if (candidateId === 'percent_reporting') {
        percentReporting = candidateResult as number;
        continue;
      }

      const cr = candidateResult as any;
      if (cr.votes !== undefined) {
        candidates[candidateId] = cr;
        if (cr.winner) {
          const candInfo = candidateInfo[candidateId];
          if (candInfo) {
            const partyInfo = rawData.parties[candInfo.party_code];
            winner = partyInfo ? partyInfo.name : 'Unknown';
          }
        }
      }
    }

    return {
      candidates,
      candidateInfo: candidateInfo, // Return state-specific or global candidates
      parties: rawData.parties,
      winner,
      electoralVotes: (result as any).stateElectoralVote || (result as any).stateElectoralVotes || 0,
      percent_reporting: percentReporting,
      raceName: (result as any).raceName
    };
  };

  // Helper function to get display result based on selected data
  const getDisplayResult = (data: any): any => {
    if (!data) return null;

    if (data.data?.isDistrict) {
      const geoid = data.data.geoid;
      if (currentDistrictElection) {
        const converted = convertNewFormatToDisplayFormat(currentDistrictElection, geoid);
        if (converted) {
          return {
            ...converted,
            isDistrict: true,
          };
        }
      }
    } else if (data.isCounty) {
      const fips = data.data.fips;
      if (currentCountyElection) {
        const converted = convertNewFormatToDisplayFormat(currentCountyElection, fips);
        if (converted) {
          return {
            ...converted,
            isCounty: true,
          };
        }
      }
    } else {
      const stateCode = stateAbbreviations[data.name];
      console.log(`🎯 [MapView getDisplayResult] STATE LOOKUP for "${data.name}"`);
      console.log(`🎯 stateCode: "${stateCode}"`);
      console.log(`🎯 currentElection exists:`, !!currentElection);
      console.log(`🎯 currentResults exists:`, !!currentResults);
      console.log(`🎯 currentResults keys:`, currentResults ? Object.keys(currentResults) : 'N/A');
      console.log(`🎯 currentResults["${stateCode}"] exists:`, currentResults?.[stateCode] ? 'YES' : 'NO');
      
      if (stateCode && currentElection && currentResults && currentResults[stateCode]) {
        console.log(`✅ All conditions met! Calling convertNewFormatToDisplayFormat for ${stateCode}`);
        const converted = convertNewFormatToDisplayFormat(currentElection, stateCode);
        console.log(`🎯 converted result:`, converted);
        if (converted) {
          return {
            ...converted,
            isCounty: false,
            isDistrict: false
          };
        }
      } else {
        console.log(`❌ Condition failed - returning null`);
      }
    }
    return null;
  };

  // Helper function to get state name from selected data
  const getStateName = (data: any): string => {
    if (!data) return '';

    if (data.data?.isDistrict) {
      const stateName = data.data.stateName || data.data.state_name || 'Unknown State';
      return `${stateName}`;
    } else if (data.isCounty) {
      const stateName = data.data.stateName || data.data.state_name || 'Unknown State';
      return `${stateName}`;
    } else {
      // For states, just show the state name
      return data.name;
    }
  };

  // Helper function to get county/district name from selected data
  const getCountyName = (data: any): string => {
    if (!data) return '';

    if (data.data?.isDistrict) {
      return data.data.districtName || data.name;
    } else if (data.isCounty) {
      return data.data.countyName || data.name;
    } else {
      // For states, return empty string
      return '';
    }
  };

  // Sync external selectedData from ElectionDashboard
  useEffect(() => {
    if (externalSelectedData !== undefined) {
      setSelectedData(externalSelectedData);
    }
  }, [externalSelectedData]);

  // Update displayResult whenever selectedData changes
  useEffect(() => {
    // DEBUG: Log currentElection for race name tracking
    console.log('🚀 MapView currentElection state:', {
      year: currentElection?.year,
      winner: currentElection?.winner,
      description: currentElection?.description,
      hasResults: !!currentElection?.results
    });
    
    if (selectedData) {
      const result = getDisplayResult(selectedData);
      setDisplayResult(result);

      // Update state name and county/district name
      setStateName(getStateName(selectedData));
      setCountyName(getCountyName(selectedData));

      // Notify parent if callback is provided
      if (onSelectedDataChange) {
        onSelectedDataChange(selectedData);
      }
    } else {
      // No selectedData - show national results for presidential elections
      if (electionType === 'presidential' && currentNationalElection) {
        console.log('MapView: Using national election data for display');

        // Convert national data to display format
        const nationalDisplay = {
          candidates: currentNationalElection.results || {},
          candidateInfo: currentNationalElection.candidates || {},
          parties: currentNationalElection.parties || {},
          winner: currentNationalElection.winner,
          electoralVotes: 0,
          isCounty: false,
          isDistrict: false,
          percent_reporting: currentNationalElection.percent_reporting || 0
        };

        setDisplayResult(nationalDisplay);
        setStateName('');
        setCountyName('');
      } else {
        setDisplayResult(null);
        setStateName('');
        setCountyName('');
      }
    }
  }, [selectedData, currentElection, currentCountyElection, currentDistrictElection, currentResults, currentNationalElection, electionType]);

  // Refs to track current values for restoreLayers closure
  const selectedDataOptionsRef = useRef(selectedDataOptions);
  const populationDataRef = useRef(populationData);
  const radarFramesRef = useRef(radarFrames);
  const currentFrameIndexRef = useRef(currentFrameIndex);
  const radarOpacityRef = useRef(radarOpacity);
  const showMapLabelsRef = useRef(showMapLabels);

  // Update refs whenever values change
  useEffect(() => {
    selectedDataOptionsRef.current = selectedDataOptions;
    populationDataRef.current = populationData;
    radarFramesRef.current = radarFrames;
    currentFrameIndexRef.current = currentFrameIndex;
    radarOpacityRef.current = radarOpacity;
    showMapLabelsRef.current = showMapLabels;
  }, [selectedDataOptions, populationData, radarFrames, currentFrameIndex, radarOpacity, showMapLabels]);

  // Debug function - can be called from console
  (window as any).debugWeather = async () => {
    console.log('=== WEATHER DEBUG ===');
    const locations = await fetchWeatherLocations();
    console.log('Fetched locations:', locations);
    console.log('Current state:', weatherLocations);
    console.log('Weather option enabled:', selectedDataOptions.weather);
    console.log('Map exists:', !!map.current);
    return locations;
  };

  // Debug AI Infrastructure
  (window as any).debugAIInfra = async () => {
    console.log('=== AI INFRASTRUCTURE DEBUG ===');
    const data = await fetchAIInfraData();
    console.log('Fetched AI Infra data:', data);
    console.log('Features count:', data?.features?.length || 0);
    console.log('Current state:', aiInfraFeatures);
    console.log('AI Infra option enabled:', selectedDataOptions?.aiInfra);
    console.log('Map exists:', !!map.current);
    if (data?.features?.length > 0) {
      console.log('First feature:', data.features[0]);
    }
    return data;
  };

  // Debug Population Layer
  (window as any).debugPopulation = async () => {
    console.log('=== POPULATION DEBUG ===');
    const data = await fetchPopulationData();
    console.log('Fetched population data features count:', data?.features?.length || 0);
    console.log('Current state features count:', populationData?.features?.length || 0);
    console.log('Population option enabled:', selectedDataOptions?.population);
    console.log('Map exists:', !!map.current);
    if (map.current) {
      console.log('Map style loaded:', map.current.isStyleLoaded());
      const layer = map.current.getLayer('county-population-circles');
      const source = map.current.getSource('county-population');
      console.log('Layer exists:', !!layer);
      console.log('Source exists:', !!source);
      if (layer) {
        console.log('Layer type:', layer.type);
        console.log('Layer ID:', layer.id);
      }
      if (source) {
        console.log('Source type:', source.type);
      }
    }
    if (data?.features?.length > 0) {
      console.log('First 5 features:', data.features.slice(0, 5));
    }
    return data;
  };

  // Debug Radar
  (window as any).debugRadar = () => {
    console.log('=== RADAR DEBUG ===');
    console.log('Weather Radar option enabled:', selectedDataOptions?.weatherRadar);
    console.log('Radar frames count:', radarFrames.length);
    console.log('Current frame index:', currentFrameIndex);
    console.log('Is playing:', isRadarPlaying);
    console.log('Opacity:', radarOpacity);
    console.log('Active layer:', radarActiveLayerRef.current);
    console.log('Map exists:', !!map.current);
    if (map.current) {
      console.log('Map style loaded:', map.current.isStyleLoaded());
      const layerA = map.current.getLayer('radarA');
      const layerB = map.current.getLayer('radarB');
      const sourceA = map.current.getSource('radarA');
      const sourceB = map.current.getSource('radarB');
      console.log('RadarA layer exists:', !!layerA);
      console.log('RadarB layer exists:', !!layerB);
      console.log('RadarA source exists:', !!sourceA);
      console.log('RadarB source exists:', !!sourceB);
      if (layerA) {
        console.log('RadarA opacity:', map.current.getPaintProperty('radarA', 'raster-opacity'));
      }
      if (layerB) {
        console.log('RadarB opacity:', map.current.getPaintProperty('radarB', 'raster-opacity'));
      }
    }
    if (radarFrames.length > 0) {
      console.log('First frame:', radarFrames[0]);
      console.log('Current frame:', radarFrames[currentFrameIndex]);
      console.log('Last frame:', radarFrames[radarFrames.length - 1]);
    }
  };

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once
    if (!mapContainer.current) return;

    try {
      const styleUrls = {
        light: 'mapbox://styles/mapbox/light-v11',
        dark: 'mapbox://styles/mapbox/dark-v11',
        satellite: 'mapbox://styles/mapbox/satellite-streets-v12'
      };
      const initialStyleUrl = styleUrls[mapStyle];
      currentStyleUrlRef.current = initialStyleUrl;

      // Use empty style if elections are enabled, otherwise use the selected style
      const mapStyleConfig = selectedDataOptions?.elections
        ? { 
            version: 8, 
            name: 'Empty Style',
            metadata: {},
            center: [-97, 38],
            zoom: 3.5,
            sources: {}, 
            layers: [],
            glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
            sprite: 'mapbox://sprites/mapbox/basic-v9'
          } as any
        : initialStyleUrl;

      console.log('Initializing Mapbox map with style:', selectedDataOptions?.elections ? 'empty (elections mode)' : initialStyleUrl);
      console.log('Globe mode:', globeMode);
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyleConfig,
        center: [-97, 38],
        zoom: 3.5,
        // DO NOT set projection here - it must be set after style.load
        pitch: 0,
        bearing: 0,
        preserveDrawingBuffer: true, // Required for canvas toDataURL()
        dragRotate: true,
        pitchWithRotate: true,
        touchPitch: true,
        // Disable telemetry to prevent CORS errors
        collectResourceTiming: false,
        // Disable both logo and attribution to avoid SVG loading issues
        logoPosition: 'bottom-left' as any, // Will be hidden via CSS
        attributionControl: false
      });
    } catch (error) {
      console.error('Error initializing map:', error instanceof Error ? error.message : 'Unknown error');
      return;
    }

    // Sync with external mapRef if provided
    if (mapRef) {
      mapRef.current = map.current;
      console.log('🔄 MapView: mapRef has been set!');
    }

    // Initial projection will be set by the projection update useEffect (line ~757)
    // No need for a persistent style.load listener here as it conflicts with dynamic updates

    // Expose map screenshot capture function globally
    (window as any).captureMapScreenshot = async () => {
      if (!map.current) {
        throw new Error('Map not initialized');
      }
      
      // Wait for map to be fully idle (all tiles and layers rendered)
      await new Promise<void>(resolve => map.current!.once('idle', () => resolve()));
      
      // Flush one more frame to ensure everything is rendered
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      
      // Get the map canvas and convert to PNG
      const canvas = map.current.getCanvas();
      return canvas.toDataURL('image/png');
    };

    map.current.on('load', () => {
      console.log('Mapbox map loaded successfully');

      // Add state boundaries source and layer (hidden by default)
      if (map.current && !map.current.getSource('state-boundaries')) {
        map.current.addSource('state-boundaries', {
          type: 'vector',
          url: 'mapbox://mapbox.us_census_states_2015'
        });

        // Add fill layer for state boundaries (no borders - just fill)
        map.current.addLayer({
          id: 'state-fills',
          type: 'fill',
          source: 'state-boundaries',
          'source-layer': 'states',
          layout: {
            visibility: 'none'
          },
          paint: {
            'fill-color': getStateColorExpression(),
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.5,
              0.3
            ]
          }
        });
      }

      // Add global click handler to forward clicks to MapContainer when elections are enabled
      if (map.current) {
        map.current.on('click', (e) => {
          // Forward all clicks to MapContainer if elections are enabled
          if (selectedDataOptions?.elections && electionMapRef?.current) {
            console.log('🖱️ MapView click - forwarding to MapContainer');
            const clickEvent = new MouseEvent('click', {
              clientX: e.originalEvent.clientX,
              clientY: e.originalEvent.clientY,
              bubbles: true
            });
            electionMapRef.current.getCanvas().dispatchEvent(clickEvent);
          }
        });

        map.current.on('dblclick', (e) => {
          // Forward all double-clicks to MapContainer if elections are enabled
          if (selectedDataOptions?.elections && electionMapRef?.current) {
            console.log('🖱️ MapView dblclick - forwarding to MapContainer');
            const dblclickEvent = new MouseEvent('dblclick', {
              clientX: e.originalEvent.clientX,
              clientY: e.originalEvent.clientY,
              bubbles: true
            });
            electionMapRef.current.getCanvas().dispatchEvent(dblclickEvent);
          }
        });
      }
    });

    // Navigation controls hidden per user request
    // map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      // Clean up global function
      delete (window as any).captureMapScreenshot;
      map.current?.remove();
    };
  }, []);

  // Update projection when globe mode, projection type, or atmosphere changes
  useEffect(() => {
    if (!map.current) return;
    
    const projectionName = globeMode ? 'globe' : projection;
    
    const updateProjection = () => {
      if (!map.current) return;
      
      try {
        console.log(`Updating projection to: ${projectionName}`);
        map.current.setProjection(projectionName as any);
        
        // Enable fog and atmosphere for globe mode, but only if atmosphere is enabled
        if (globeMode && atmosphereEnabled) {
          map.current.setFog({
            'star-intensity': 0.3,
            color: 'rgb(186, 210, 235)',
            'high-color': 'rgb(36, 92, 223)',
            'horizon-blend': 0.02,
            'space-color': 'rgb(11, 11, 25)'
          });
        } else {
          map.current.setFog(null);
        }
      } catch (error) {
        console.error('Error setting projection:', error);
      }
    };
    
    // Always wait for style.load event - this is the only reliable way
    if (map.current.isStyleLoaded()) {
      // If style is already loaded, trigger immediately
      updateProjection();
    } else {
      // Otherwise wait for style to load
      map.current.once('style.load', updateProjection);
    }
    
    return () => {
      // Clean up event listener if it was added
      if (map.current && !map.current.isStyleLoaded()) {
        map.current.off('style.load', updateProjection);
      }
    };
  }, [globeMode, projection, atmosphereEnabled]);

  // Resize map when sidebar or county panel collapse state changes
  useEffect(() => {
    if (!map.current) return;

    // Use a small timeout to ensure DOM has updated before resizing
    const resizeTimer = setTimeout(() => {
      if (map.current) {
        console.log('🔄 Resizing map due to sidebar/panel state change');
        map.current.resize();
      }
    }, 100);

    return () => clearTimeout(resizeTimer);
  }, [isSidebarCollapsed, isCountyPanelCollapsed]);

  // Toggle map style based on elections checkbox
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;
    const styleUrls = {
      light: 'mapbox://styles/mapbox/light-v11',
      dark: 'mapbox://styles/mapbox/dark-v11',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12'
    };

    const toggleMapStyle = () => {
      if (!mapInstance) return;
      
      // Wait for current style to finish loading before switching
      if (!mapInstance.isStyleLoaded()) {
        console.log('⏳ Style still loading, waiting before toggle...');
        mapInstance.once('style.load', toggleMapStyle);
        return;
      }

      if (selectedDataOptions?.elections) {
        // Switch to empty style when elections are enabled
        console.log('Elections enabled - switching to empty map style');
        mapInstance.setStyle({ version: 8, sources: {}, layers: [] } as any);
      } else {
        // Restore the map style when elections are disabled
        // Use pending style if available, otherwise use current mapStyle prop
        const targetUrl = pendingStyleRef.current || styleUrls[mapStyle];
        console.log('Elections disabled - restoring map style:', targetUrl);

        // Clear pending style after applying it
        if (pendingStyleRef.current) {
          console.log('Applying pending style:', pendingStyleRef.current);
          pendingStyleRef.current = null;
        }

        // Listen for the style to finish loading, then restore layers
        const restoreLayers = () => {
          console.log('🔄 Restoring layers after style change...');

          // Use refs to get current values (not stale closure values)
          const currentOptions = selectedDataOptionsRef.current;
          const currentPopulationData = populationDataRef.current;
          const currentRadarFrames = radarFramesRef.current;
          const currentFrameIdx = currentFrameIndexRef.current;
          const currentRadarOpacity = radarOpacityRef.current;

          console.log('🔄 Restore check - stateInfo:', currentOptions?.stateInfo);
          console.log('🔄 Restore check - population:', currentOptions?.population, 'data:', !!currentPopulationData);
          console.log('🔄 Restore check - weatherRadar:', currentOptions?.weatherRadar, 'frames:', currentRadarFrames?.length);

          // Re-add state boundaries if enabled
          if (currentOptions?.stateInfo && !mapInstance.getSource('state-boundaries')) {
            console.log('✅ Restoring state boundaries layer');
            mapInstance.addSource('state-boundaries', {
              type: 'vector',
              url: 'mapbox://mapbox.us_census_states_2015'
            });

            mapInstance.addLayer({
              id: 'state-fills',
              type: 'fill',
              source: 'state-boundaries',
              'source-layer': 'states',
              layout: {
                visibility: 'visible'
              },
              paint: {
                'fill-color': getStateColorExpression(),
                'fill-opacity': [
                  'case',
                  ['boolean', ['feature-state', 'hover'], false],
                  0.5,
                  0.3
                ]
              }
            });
          }

          // Re-add population layer if enabled
          if (currentOptions?.population && currentPopulationData && currentPopulationData.features.length > 0 && !mapInstance.getSource('county-population')) {
            console.log('✅ Restoring population layer');
            mapInstance.addSource('county-population', {
              type: 'geojson',
              data: currentPopulationData
            });

            mapInstance.addLayer({
              id: 'county-population-circles',
              type: 'circle',
              source: 'county-population',
              paint: {
                'circle-color': '#3b82f6',
                'circle-opacity': 0.6,
                'circle-stroke-color': '#1e40af',
                'circle-stroke-width': 1,
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  3, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 1,
                    316, 2.5,
                    1000, 5,
                    2236, 8
                  ],
                  4, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 2,
                    316, 5,
                    1000, 10,
                    2236, 16
                  ],
                  5, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 3.5,
                    316, 8.75,
                    1000, 17.5,
                    2236, 28
                  ],
                  6, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 5,
                    316, 12.5,
                    1000, 25,
                    2236, 40
                  ],
                  7, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 6.5,
                    316, 16.25,
                    1000, 32.5,
                    2236, 52
                  ],
                  10, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 10,
                    316, 25,
                    1000, 50,
                    2236, 80
                  ]
                ]
              }
            });
          }

          // Re-add radar layers if enabled
          if (currentOptions?.weatherRadar && currentRadarFrames && currentRadarFrames.length > 0 && !mapInstance.getSource('radarA')) {
            console.log('✅ Restoring weather radar layers');
            const currentFrame = currentRadarFrames[currentFrameIdx] || currentRadarFrames[currentRadarFrames.length - 1];
            const tileUrl = `https://tilecache.rainviewer.com${currentFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;

            mapInstance.addSource('radarA', {
              type: 'raster',
              tiles: [tileUrl],
              tileSize: 256,
              minzoom: 0,
              maxzoom: 12,
            });

            mapInstance.addSource('radarB', {
              type: 'raster',
              tiles: [tileUrl],
              tileSize: 256,
              minzoom: 0,
              maxzoom: 12,
            });

            let beforeLayer = undefined;
            const possibleLayers = ['waterway-label', 'water-point-label', 'poi-label', 'road-label'];
            for (const layerName of possibleLayers) {
              if (mapInstance.getLayer(layerName)) {
                beforeLayer = layerName;
                break;
              }
            }

            mapInstance.addLayer({
              id: 'radarA',
              type: 'raster',
              source: 'radarA',
              paint: {
                'raster-opacity': currentRadarOpacity,
                'raster-fade-duration': 0,
              },
            }, beforeLayer);

            mapInstance.addLayer({
              id: 'radarB',
              type: 'raster',
              source: 'radarB',
              paint: {
                'raster-opacity': 0,
                'raster-fade-duration': 0,
              },
            }, beforeLayer);
          }

          // Restore map labels visibility
          const currentShowMapLabels = showMapLabelsRef.current;
          const visibility = currentShowMapLabels ? 'visible' : 'none';
          console.log(`🔄 Restoring map labels visibility to: ${visibility}`);

          const labelLayers = [
            'settlement-label',
            'settlement-major-label',
            'settlement-minor-label',
            'settlement-subdivision-label',
            'state-label',
            'country-label',
            'place-city-lg-n',
            'place-city-lg-s',
            'place-city-md-n',
            'place-city-md-s',
            'place-city-sm',
            'place-town',
            'place-village',
            'place-hamlet',
            'place-suburb',
            'place-neighbourhood',
            'place-islet-archipelago-aboriginal',
            'admin-0-boundary-bg',
            'admin-1-boundary-bg',
            'admin-0-boundary',
            'admin-1-boundary'
          ];

          labelLayers.forEach(layerId => {
            try {
              if (mapInstance.getLayer(layerId)) {
                mapInstance.setLayoutProperty(layerId, 'visibility', visibility);
              }
            } catch (e) {
              // Layer doesn't exist in this style, skip
            }
          });
        };

        mapInstance.once('style.load', restoreLayers);
        mapInstance.setStyle(targetUrl);
        currentStyleUrlRef.current = targetUrl;
      }
    };

    toggleMapStyle();
  }, [selectedDataOptions?.elections]);

  // Toggle state boundaries visibility and add click handlers
  useEffect(() => {
    if (!map.current) return;

    const toggleStateLayers = () => {
      if (!map.current) return;

      const visibility = selectedDataOptions.stateInfo ? 'visible' : 'none';

      // Check if layer exists, if not and state info is enabled, add it
      if (selectedDataOptions.stateInfo && !map.current.getLayer('state-fills')) {
        // Add source if it doesn't exist
        if (!map.current.getSource('state-boundaries')) {
          map.current.addSource('state-boundaries', {
            type: 'vector',
            url: 'mapbox://mapbox.us_census_states_2015'
          });
        }

        // Add fill layer
        map.current.addLayer({
          id: 'state-fills',
          type: 'fill',
          source: 'state-boundaries',
          'source-layer': 'states',
          layout: {
            visibility: 'visible'
          },
          paint: {
            'fill-color': getStateColorExpression() as any,
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.5,
              0.3
            ] as any
          }
        });

        // Add outline layer for selected state
        map.current.addLayer({
          id: 'state-outline-selected',
          type: 'line',
          source: 'state-boundaries',
          'source-layer': 'states',
          layout: {
            visibility: 'visible'
          },
          paint: {
            'line-color': '#1e40af',
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              4,
              0
            ] as any,
            'line-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              1,
              0
            ] as any
          }
        });
      } else if (map.current.getLayer('state-fills')) {
        // Layer exists, just toggle visibility
        map.current.setLayoutProperty('state-fills', 'visibility', visibility);
      }
    };

    // Wait for map to be fully loaded
    const stateStyleLoadHandler = () => {
      toggleStateLayers();
    };

    if (map.current.isStyleLoaded()) {
      toggleStateLayers();
    } else {
      // Use 'on' instead of 'once' so multiple layers can all respond to the same event
      map.current.on('style.load', stateStyleLoadHandler);
    }

    // Add click handler for states
    const handleStateClick = (e: mapboxgl.MapMouseEvent) => {
      if (!map.current || !selectedDataOptions.stateInfo) return;

      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['state-fills']
      });

      if (features.length > 0) {
        const stateName = features[0].properties?.STATE_NAME;
        if (stateName) {
          console.log('State clicked:', stateName);

          // Get state info from our data
          const stateInfo = getStateInfo(stateName);

          if (stateInfo) {
            const clickedStateId = features[0].id as string | number;
            
            // Toggle: if clicking the same state, close the panel
            if (selectedState?.name === stateInfo.name && showStatePanel) {
              // Clear the highlight of the selected state
              if (selectedStateIdRef.current !== null && map.current) {
                map.current.setFeatureState(
                  { source: 'state-boundaries', sourceLayer: 'states', id: selectedStateIdRef.current },
                  { selected: false }
                );
              }
              setShowStatePanel(false);
              selectedStateIdRef.current = null;
            } else {
              // Clear previous selected state highlight
              if (selectedStateIdRef.current !== null && map.current) {
                map.current.setFeatureState(
                  { source: 'state-boundaries', sourceLayer: 'states', id: selectedStateIdRef.current },
                  { selected: false }
                );
              }
              
              setSelectedState(stateInfo);
              setShowStatePanel(true);
              
              // Highlight the selected state
              selectedStateIdRef.current = clickedStateId;
              if (map.current) {
                map.current.setFeatureState(
                  { source: 'state-boundaries', sourceLayer: 'states', id: clickedStateId },
                  { selected: true }
                );
              }
            }
          }
        }
      }
    };

    // Add hover effect
    let hoveredStateId: string | number | null = null;
    const handleStateHover = (e: mapboxgl.MapMouseEvent) => {
      if (!map.current || !selectedDataOptions.stateInfo) return;
      
      if (e.features && e.features.length > 0) {
        if (hoveredStateId !== null) {
          map.current.setFeatureState(
            { source: 'state-boundaries', sourceLayer: 'states', id: hoveredStateId },
            { hover: false }
          );
        }
        hoveredStateId = e.features[0].id as string | number;
        map.current.setFeatureState(
          { source: 'state-boundaries', sourceLayer: 'states', id: hoveredStateId },
          { hover: true }
        );
      }
    };

    const handleStateLeave = () => {
      if (!map.current) return;
      
      if (hoveredStateId !== null) {
        map.current.setFeatureState(
          { source: 'state-boundaries', sourceLayer: 'states', id: hoveredStateId },
          { hover: false }
        );
      }
      hoveredStateId = null;
    };

    if (selectedDataOptions.stateInfo) {
      map.current.on('click', 'state-fills', handleStateClick);
      map.current.on('mousemove', 'state-fills', handleStateHover);
      map.current.on('mouseleave', 'state-fills', handleStateLeave);
      
      // Change cursor on hover
      map.current.on('mouseenter', 'state-fills', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'state-fills', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    }

    return () => {
      if (map.current) {
        // Remove style.load listener
        try {
          map.current.off('style.load', stateStyleLoadHandler);
        } catch (e) {
          // Map might be destroyed
        }

        map.current.off('click', 'state-fills', handleStateClick);
        map.current.off('mousemove', 'state-fills', handleStateHover);
        map.current.off('mouseleave', 'state-fills', handleStateLeave);
      }

      // Clean up state popup when disabling state info
      if (statePopupRef.current) {
        statePopupRef.current.remove();
        statePopupRef.current = null;
      }
    };
  }, [selectedDataOptions.stateInfo]);

  // Fetch weather locations when weather option is enabled
  useEffect(() => {
    if (selectedDataOptions.weather && map.current) {
      console.log('Fetching weather locations for current viewport...');
      
      // Get current map bounds
      const bounds = map.current.getBounds();
      const mapBounds = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      };
      
      fetchWeatherLocations(mapBounds).then((locations) => {
        // Filter out locations with invalid coordinates (lat=0, lon=0 from CSV imports)
        const validLocations = locations.filter(loc => {
          const hasValidCoords = loc.latitude !== 0 && loc.longitude !== 0;
          if (!hasValidCoords) {
            console.log(`⚠️ Skipping location with invalid coordinates: ${loc.location} (${loc.latitude}, ${loc.longitude})`);
          }
          return hasValidCoords;
        });
        
        console.log(`✓ Loaded ${validLocations.length} valid weather locations (filtered ${locations.length - validLocations.length} invalid)`);
        setWeatherLocations(validLocations);
      }).catch(error => {
        console.error('Failed to fetch weather locations:', error);
      });
    } else {
      setWeatherLocations([]);
    }
  }, [selectedDataOptions.weather]);

  // Refetch weather locations when map moves (debounced)
  useEffect(() => {
    if (!map.current || !selectedDataOptions.weather) return;

    let moveTimeout: NodeJS.Timeout;

    const handleMapMove = () => {
      // Clear previous timeout
      clearTimeout(moveTimeout);
      
      // Debounce: wait 500ms after map stops moving
      moveTimeout = setTimeout(() => {
        const bounds = map.current!.getBounds();
        const mapBounds = {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        };
        
        console.log('🗺️ Map moved, refetching weather locations...');
        fetchWeatherLocations(mapBounds).then((locations) => {
          // Filter out locations with invalid coordinates
          const validLocations = locations.filter(loc => 
            loc.latitude !== 0 && loc.longitude !== 0
          );
          console.log(`✓ Reloaded ${validLocations.length} valid weather locations for new viewport`);
          setWeatherLocations(validLocations);
        }).catch(error => {
          console.error('Failed to refetch weather locations:', error);
        });
      }, 500);
    };

    map.current.on('moveend', handleMapMove);

    return () => {
      clearTimeout(moveTimeout);
      if (map.current) {
        map.current.off('moveend', handleMapMove);
      }
    };
  }, [selectedDataOptions.weather]);

  // Update weather positions on map move/zoom
  useEffect(() => {
    if (!map.current || !selectedDataOptions.weather || weatherLocations.length === 0) {
      return;
    }

    const updateWeatherPositions = () => {
      if (!map.current) return;
      
      const newPositions = new Map<string, { x: number; y: number }>();
      
      weatherLocations.forEach((location) => {
        // Validate coordinates
        if (!location.latitude || !location.longitude) {
          return;
        }
        
        // Project lng/lat to screen pixel position
        const point = map.current!.project([location.longitude, location.latitude]);
        // Use location name + coords as unique key
        const key = `${location.location}-${location.latitude}-${location.longitude}`;
        newPositions.set(key, { x: point.x, y: point.y });
      });
      
      setWeatherPositions(newPositions);
    };

    // Initial position calculation
    updateWeatherPositions();

    // Update on map move and zoom
    map.current.on('move', updateWeatherPositions);
    map.current.on('zoom', updateWeatherPositions);

    return () => {
      if (map.current) {
        map.current.off('move', updateWeatherPositions);
        map.current.off('zoom', updateWeatherPositions);
      }
    };
  }, [selectedDataOptions.weather, weatherLocations]);

  // Clear weather positions when option is disabled
  useEffect(() => {
    if (!selectedDataOptions.weather) {
      setWeatherPositions(new Map());
    }
  }, [selectedDataOptions.weather]);

  // Fetch AI infrastructure data when AI Infra option is enabled
  useEffect(() => {
    console.log('=== AI INFRA FETCH EFFECT ===');
    console.log('AI Infra option changed:', selectedDataOptions?.aiInfra);
    if (selectedDataOptions?.aiInfra) {
      console.log('Fetching AI infrastructure data from Supabase...');
      fetchAIInfraData().then((data) => {
        console.log('AI infrastructure features received from API:', data?.features?.length || 0);
        setAIInfraFeatures(data?.features || []);
      }).catch((error) => {
        console.error('Error fetching AI infrastructure data:', error);
        setAIInfraFeatures([]);
      });
    } else {
      console.log('AI Infra option disabled, clearing features');
      setAIInfraFeatures([]);
    }
  }, [selectedDataOptions?.aiInfra]);

  // Update AI infra positions on map move/zoom
  useEffect(() => {
    if (!map.current || !selectedDataOptions?.aiInfra || !aiInfraFeatures || aiInfraFeatures.length === 0) {
      return;
    }

    const updateAIInfraPositions = () => {
      if (!map.current) return;
      
      const newPositions = new Map<string, { x: number; y: number }>();
      
      aiInfraFeatures.forEach((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        
        // Validate coordinates
        if (!lng || !lat || typeof lng !== 'number' || typeof lat !== 'number') {
          return;
        }
        
        // Project lng/lat to screen pixel position
        const point = map.current!.project([lng, lat]);
        // Use feature name as unique key
        const key = feature.properties.name;
        newPositions.set(key, { x: point.x, y: point.y });
      });
      
      setAIInfraPositions(newPositions);
    };

    // Initial position calculation
    updateAIInfraPositions();

    // Update on map move and zoom
    map.current.on('move', updateAIInfraPositions);
    map.current.on('zoom', updateAIInfraPositions);

    return () => {
      if (map.current) {
        map.current.off('move', updateAIInfraPositions);
        map.current.off('zoom', updateAIInfraPositions);
      }
    };
  }, [selectedDataOptions?.aiInfra, aiInfraFeatures]);

  // Clear AI infra positions when option is disabled
  useEffect(() => {
    if (!selectedDataOptions?.aiInfra) {
      setAIInfraPositions(new Map());
      setSelectedAIInfra(null);
      setShowAIInfraPanel(false);
    }
  }, [selectedDataOptions?.aiInfra]);

  // Load media assets from backend and listen for updates
  useEffect(() => {
    const loadMediaAssets = async () => {
      try {
        const { projectId, publicAnonKey } = await import('../utils/supabase/info');
        const supabaseUrl = `https://${projectId}.supabase.co`;

        // Request with high limit to get all media assets
        // The edge function defaults to limit=24, we need to override this
        const response = await fetch(`${supabaseUrl}/functions/v1/media-library?limit=1000`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch media assets');
        }

        const result = await response.json();
        
        console.log('📦 Total media assets returned from API:', result.data?.length);
        console.log('🗺️ All media assets:', result.data);
        
        // Filter for media with on_map=true, latitude, and longitude
        const onMapMedia = (result.data || []).filter((asset: any) => 
          asset.on_map === true &&
          asset.latitude !== null && 
          asset.longitude !== null
        );
        
        console.log('📍 Loaded media assets from backend (on_map=true):', onMapMedia);
        console.log('🔍 Assets with coordinates but on_map=false:', 
          (result.data || []).filter((asset: any) => 
            asset.on_map !== true &&
            asset.latitude !== null && 
            asset.longitude !== null
          ).length
        );
        setMediaAssets(onMapMedia);
      } catch (error) {
        console.error('Error loading media assets:', error);
        setMediaAssets([]);
      }
    };

    // Initial load
    loadMediaAssets();

    // Listen for custom event when media is saved
    const handleMediaUpdate = () => {
      console.log('🔄 Media markers updated, reloading...');
      loadMediaAssets();
    };

    window.addEventListener('mediaMarkersUpdated', handleMediaUpdate);

    return () => {
      window.removeEventListener('mediaMarkersUpdated', handleMediaUpdate);
    };
  }, []);

  // Update media marker positions when map moves or media changes
  useEffect(() => {
    if (!selectedDataOptions?.media || !map.current || mediaAssets.length === 0) {
      return;
    }

    const updateMediaPositions = () => {
      if (!map.current) return;
      
      const newPositions = new Map<string, { x: number; y: number }>();
      
      mediaAssets.forEach((asset) => {
        const { longitude, latitude } = asset;
        
        // Validate coordinates
        if (!longitude || !latitude || typeof longitude !== 'number' || typeof latitude !== 'number') {
          return;
        }
        
        // Project lng/lat to screen pixel position
        const point = map.current!.project([longitude, latitude]);
        newPositions.set(asset.id, { x: point.x, y: point.y });
      });
      
      setMediaPositions(newPositions);
    };

    // Initial position calculation
    updateMediaPositions();

    // Update on map move and zoom
    map.current.on('move', updateMediaPositions);
    map.current.on('zoom', updateMediaPositions);

    return () => {
      if (map.current) {
        map.current.off('move', updateMediaPositions);
        map.current.off('zoom', updateMediaPositions);
      }
    };
  }, [selectedDataOptions?.media, mediaAssets]);

  // Clear media positions when option is disabled
  useEffect(() => {
    if (!selectedDataOptions?.media) {
      setMediaPositions(new Map());
      setSelectedMedia(null);
      setShowMediaPanel(false);
    }
  }, [selectedDataOptions?.media]);

  // Fetch World Cup stadium data when World Cup 2026 option is enabled
  useEffect(() => {
    console.log('=== WORLD CUP FETCH EFFECT ===');
    console.log('World Cup option changed:', selectedDataOptions?.worldCup2026);
    if (selectedDataOptions?.worldCup2026) {
      console.log('Fetching World Cup stadium data from backend...');
      fetchWorldCupData().then(async (stadiums) => {
        // If no stadiums returned (404), initialize first then fetch again
        if (!stadiums || stadiums.length === 0) {
          console.log('No World Cup data found, initializing...');
          await initializeWorldCupData();
          const retryStadiums = await fetchWorldCupData();
          console.log('World Cup stadiums received after initialization:', retryStadiums);
          setWorldCupStadiums(retryStadiums || []);
        } else {
          console.log('World Cup stadiums received from API:', stadiums);
          setWorldCupStadiums(stadiums);
        }
      }).catch((error) => {
        console.error('Error fetching World Cup data:', error);
        setWorldCupStadiums([]);
      });
    } else {
      console.log('World Cup option disabled, clearing stadiums');
      setWorldCupStadiums([]);
    }
  }, [selectedDataOptions?.worldCup2026]);

  // Update stadium positions on map move/zoom
  useEffect(() => {
    if (!map.current || !selectedDataOptions?.worldCup2026 || worldCupStadiums.length === 0) {
      return;
    }

    const updateStadiumPositions = () => {
      if (!map.current) return;
      
      const newPositions = new Map<string, { x: number; y: number }>();
      
      worldCupStadiums.forEach((stadium) => {
        const [lng, lat] = stadium.coordinates;
        
        // Validate coordinates
        if (!lng || !lat || typeof lng !== 'number' || typeof lat !== 'number') {
          return;
        }
        
        // Project lng/lat to screen pixel position
        const point = map.current!.project([lng, lat]);
        newPositions.set(stadium.name, { x: point.x, y: point.y });
      });
      
      setStadiumPositions(newPositions);
    };

    // Initial position calculation
    updateStadiumPositions();

    // Update on map move and zoom
    map.current.on('move', updateStadiumPositions);
    map.current.on('zoom', updateStadiumPositions);

    return () => {
      if (map.current) {
        map.current.off('move', updateStadiumPositions);
        map.current.off('zoom', updateStadiumPositions);
      }
    };
  }, [selectedDataOptions?.worldCup2026, worldCupStadiums]);

  // Clear selected stadium when option is disabled
  useEffect(() => {
    if (!selectedDataOptions?.worldCup2026) {
      setSelectedStadium(null);
      setShowStadiumPanel(false);
      setStadiumPositions(new Map());
    }
  }, [selectedDataOptions?.worldCup2026]);

  // Clear selected state when option is disabled
  useEffect(() => {
    if (!selectedDataOptions?.stateInfo) {
      // Clear the highlight
      if (selectedStateIdRef.current !== null && map.current) {
        map.current.setFeatureState(
          { source: 'state-boundaries', sourceLayer: 'states', id: selectedStateIdRef.current },
          { selected: false }
        );
        selectedStateIdRef.current = null;
      }
      setSelectedState(null);
      setShowStatePanel(false);
    }
  }, [selectedDataOptions?.stateInfo]);

  // Fetch population data when population option is enabled
  useEffect(() => {
    console.log('=== POPULATION FETCH EFFECT ===');
    console.log('Population option changed:', selectedDataOptions?.population);
    if (selectedDataOptions?.population) {
      console.log('Fetching population data...');
      fetchPopulationData().then((data) => {
        console.log('Population data received:', data?.features?.length || 0, 'counties');
        setPopulationData(data);
      }).catch((error) => {
        console.error('Error fetching population data:', error);
        setPopulationData(null);
      });
    } else {
      console.log('Population option disabled, clearing data');
      setPopulationData(null);
    }
  }, [selectedDataOptions?.population]);

  // Add/remove population circles based on population option
  useEffect(() => {
    console.log('\n=== POPULATION LAYER EFFECT ===');
    console.log('Map exists:', !!map.current);
    console.log('Population option:', selectedDataOptions?.population);
    console.log('Population data:', populationData?.features?.length || 0);
    
    if (!map.current) {
      console.log('❌ No map instance, exiting');
      return;
    }

    const mapInstance = map.current;

    // Wait for map to be loaded
    const addPopulationLayer = () => {
      if (!mapInstance) {
        console.log('No map instance');
        return;
      }
      
      try {
        if (!mapInstance.isStyleLoaded || !mapInstance.isStyleLoaded()) {
          console.log('Waiting for style to load...');
          return;
        }
      } catch (e) {
        console.log('Error checking style load status:', e);
        return;
      }

      // Remove existing population layer and source if they exist
      try {
        const layer = mapInstance.getLayer('county-population-circles');
        if (layer) {
          mapInstance.removeLayer('county-population-circles');
          console.log('Removed existing population layer');
        }
      } catch (e) {
        // Layer doesn't exist, that's fine
      }
      
      try {
        const source = mapInstance.getSource('county-population');
        if (source) {
          mapInstance.removeSource('county-population');
          console.log('Removed existing population source');
        }
      } catch (e) {
        // Source doesn't exist, that's fine
      }

      // Add population circles if option is enabled and data exists
      if (selectedDataOptions?.population && populationData && populationData.features.length > 0) {
        console.log('✅ Adding population circles layer...');
        console.log('First 3 features:', JSON.stringify(populationData.features.slice(0, 3), null, 2));
        
        mapInstance.addSource('county-population', {
          type: 'geojson',
          data: populationData
        });

        mapInstance.addLayer({
          id: 'county-population-circles',
          type: 'circle',
          source: 'county-population',
          paint: {
            'circle-color': '#3b82f6',
            'circle-opacity': 0.6,
            'circle-stroke-color': '#1e40af',
            'circle-stroke-width': 1,
            // Zoom-dependent radius: use interpolate with zoom at top level
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              3, [
                'interpolate', ['linear'],
                ['sqrt', ['to-number', ['get', 'POP']]],
                100, 1,      // sqrt(10k) -> 1px at zoom 3
                316, 2.5,
                1000, 5,
                2236, 8
              ],
              4, [
                'interpolate', ['linear'],
                ['sqrt', ['to-number', ['get', 'POP']]],
                100, 2,      // sqrt(10k) -> 2px at zoom 4
                316, 5,
                1000, 10,
                2236, 16
              ],
              5, [
                'interpolate', ['linear'],
                ['sqrt', ['to-number', ['get', 'POP']]],
                100, 3.5,    // sqrt(10k) -> 3.5px at zoom 5
                316, 8.75,
                1000, 17.5,
                2236, 28
              ],
              6, [
                'interpolate', ['linear'],
                ['sqrt', ['to-number', ['get', 'POP']]],
                100, 5,      // sqrt(10k) -> 5px at zoom 6
                316, 12.5,
                1000, 25,
                2236, 40
              ],
              7, [
                'interpolate', ['linear'],
                ['sqrt', ['to-number', ['get', 'POP']]],
                100, 6.5,    // sqrt(10k) -> 6.5px at zoom 7
                316, 16.25,
                1000, 32.5,
                2236, 52
              ],
              10, [
                'interpolate', ['linear'],
                ['sqrt', ['to-number', ['get', 'POP']]],
                100, 10,     // sqrt(10k) -> 10px at zoom 10
                316, 25,
                1000, 50,
                2236, 80
              ]
            ]
          }
        });

        // Add hover effect
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false
        });

        mapInstance.on('mousemove', 'county-population-circles', (e) => {
          if (!e.features || e.features.length === 0) return;
          
          mapInstance.getCanvas().style.cursor = 'pointer';
          
          const feature = e.features[0];
          const name = feature.properties?.name || 'Unknown';
          const pop = Number(feature.properties?.POP || 0).toLocaleString();
          
          popup
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${name}</strong><br/>Population: ${pop}`)
            .addTo(mapInstance);
        });

        mapInstance.on('mouseleave', 'county-population-circles', () => {
          mapInstance.getCanvas().style.cursor = '';
          popup.remove();
        });

        console.log('✅ Population circles layer added successfully');
        console.log('Layer ID: county-population-circles');
        console.log('Source ID: county-population');
      } else {
        console.log('❌ Not adding population layer:', {
          optionEnabled: selectedDataOptions?.population,
          dataExists: !!populationData,
          featuresCount: populationData?.features?.length || 0
        });
      }
    };

    // Safely check if style is loaded and add the layer
    const styleLoadHandler = () => {
      console.log('Style loaded - adding population layer');
      addPopulationLayer();
    };

    try {
      if (mapInstance && mapInstance.isStyleLoaded && mapInstance.isStyleLoaded()) {
        console.log('Style already loaded, adding population layer immediately');
        addPopulationLayer();
      } else if (mapInstance) {
        console.log('Style not loaded, waiting for style.load event');
        // Use 'on' instead of 'once' so multiple layers can all respond to the same event
        mapInstance.on('style.load', styleLoadHandler);
      }
    } catch (e) {
      console.error('Error adding population layer:', e);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (!mapInstance) return;

      // Remove style.load listener
      try {
        mapInstance.off('style.load', styleLoadHandler);
      } catch (e) {
        // Map might be destroyed
      }

      try {
        if (mapInstance.getLayer('county-population-circles')) {
          mapInstance.removeLayer('county-population-circles');
        }
      } catch (e) {
        // Layer doesn't exist or map is already destroyed
      }

      try {
        if (mapInstance.getSource('county-population')) {
          mapInstance.removeSource('county-population');
        }
      } catch (e) {
        // Source doesn't exist or map is already destroyed
      }
    };
  }, [selectedDataOptions?.population, selectedDataOptions?.elections, populationData]);

  // Fetch radar frames via backend proxy
  const fetchRadarFramesData = async () => {
    try {
      const radarData = await fetchRadarFrames();
      
      if (radarData.length === 0) {
        console.warn('⚠️ No radar data available');
        setRadarFrames([]);
        return [];
      }
      
      setRadarFrames(radarData);
      setCurrentFrameIndex(radarData.length - 1); // Start at newest frame
      return radarData;
    } catch (error) {
      console.warn('⚠️ Weather radar unavailable:', error instanceof Error ? error.message : error);
      setRadarFrames([]);
      return [];
    }
  };

  // Log radar frames state changes
  useEffect(() => {
    console.log('📊 RADAR FRAMES STATE CHANGED:', radarFrames.length, 'frames');
  }, [radarFrames]);

  // Initialize radar when enabled
  useEffect(() => {
    if (selectedDataOptions.weatherRadar) {
      fetchRadarFramesData();
    } else {
      // Cancel any ongoing animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setRadarFrames([]);
      setCurrentFrameIndex(0);
      setIsRadarPlaying(false);
    }
  }, [selectedDataOptions.weatherRadar]);

  // Add/remove radar layers
  useEffect(() => {
    if (!map.current) {
      console.log('No map instance for radar');
      return;
    }

    const mapInstance = map.current;

    const addRadarLayers = () => {
      console.log('addRadarLayers called');
      console.log('Style loaded:', mapInstance.isStyleLoaded());
      console.log('Weather radar enabled:', selectedDataOptions.weatherRadar);
      console.log('Radar frames:', radarFrames.length);
      
      if (!mapInstance.isStyleLoaded()) {
        console.log('Style not loaded yet, waiting...');
        return;
      }

      // Remove existing radar layers
      ['radarA', 'radarB'].forEach((layerId) => {
        try {
          if (mapInstance.getLayer(layerId)) {
            console.log(`Removing existing layer: ${layerId}`);
            mapInstance.removeLayer(layerId);
          }
        } catch (e) {
          // Layer doesn't exist
        }
      });

      ['radarA', 'radarB'].forEach((sourceId) => {
        try {
          if (mapInstance.getSource(sourceId)) {
            console.log(`Removing existing source: ${sourceId}`);
            mapInstance.removeSource(sourceId);
          }
        } catch (e) {
          // Source doesn't exist
        }
      });

      if (selectedDataOptions.weatherRadar && radarFrames.length > 0) {
        console.log('✅ Adding radar layers...');
        const currentFrame = radarFrames[currentFrameIndex] || radarFrames[radarFrames.length - 1];
        const tileUrl = `https://tilecache.rainviewer.com${currentFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;
        console.log('Tile URL:', tileUrl);
        console.log('Current frame:', currentFrame);

        try {
          // Add two sources for instant switching
          mapInstance.addSource('radarA', {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 12,
          });
          console.log('Added radarA source');

          mapInstance.addSource('radarB', {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 12,
          });
          console.log('Added radarB source');

          // Add layers on top (no beforeLayer parameter = added on top of all layers)
          // A is visible, B is hidden
          mapInstance.addLayer({
            id: 'radarA',
            type: 'raster',
            source: 'radarA',
            paint: {
              'raster-opacity': 0.7,
              'raster-fade-duration': 0,
            },
          });
          console.log('Added radarA layer');

          mapInstance.addLayer({
            id: 'radarB',
            type: 'raster',
            source: 'radarB',
            paint: {
              'raster-opacity': 0,
              'raster-fade-duration': 0,
            },
          });
          console.log('Added radarB layer');

          console.log('✅ Radar layers added successfully');
        } catch (error) {
          console.error('❌ Error adding radar layers:', error);
        }
      } else {
        console.log('Not adding radar layers - conditions not met');
      }
    };

    const radarStyleLoadHandler = () => {
      console.log('Style loaded - adding radar layers');
      addRadarLayers();
    };

    if (mapInstance.isStyleLoaded()) {
      console.log('Style already loaded, adding radar layers immediately');
      addRadarLayers();
    } else {
      console.log('Style not loaded, waiting for style.load event');
      // Use 'on' instead of 'once' so multiple layers can all respond to the same event
      mapInstance.on('style.load', radarStyleLoadHandler);
    }

    return () => {
      console.log('Cleaning up radar layers');

      // Remove style.load listener
      try {
        mapInstance.off('style.load', radarStyleLoadHandler);
      } catch (e) {
        // Map might be destroyed
      }
      
      // Cancel any ongoing animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Cancel interval animation
      if (animationIntervalRef.current !== null) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      
      ['radarA', 'radarB'].forEach((layerId) => {
        try {
          if (mapInstance.getLayer(layerId)) {
            mapInstance.removeLayer(layerId);
          }
        } catch (e) {
          // Layer doesn't exist or map destroyed
        }
      });

      ['radarA', 'radarB'].forEach((sourceId) => {
        try {
          if (mapInstance.getSource(sourceId)) {
            mapInstance.removeSource(sourceId);
          }
        } catch (e) {
          // Source doesn't exist or map destroyed
        }
      });
    };
  }, [selectedDataOptions.weatherRadar, selectedDataOptions?.elections, radarFrames]);

  // Update radar frame - instant switching between two layers
  const setRadarFrame = (frameIndex: number) => {
    if (!map.current || radarFrames.length === 0) {
      return;
    }

    const mapInstance = map.current;
    
    // Check if style is loaded before accessing layers
    if (!mapInstance.isStyleLoaded()) {
      return;
    }

    const frame = radarFrames[frameIndex];
    // Correct RainViewer tile URL format: host + path + /256/{z}/{x}/{y}/{color}/{smooth}_{snow}.png
    const tileUrl = `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
    
    const activeLayer = radarActiveLayerRef.current;
    const inactiveLayer = activeLayer === 'radarA' ? 'radarB' : 'radarA';

    try {
      // Check if both layers exist
      if (!mapInstance.getLayer('radarA') || !mapInstance.getLayer('radarB')) {
        console.warn('Radar layers missing, skipping frame update');
        return;
      }

      // Find the layer to insert before (for re-adding)
      let beforeLayer = undefined;
      const possibleLayers = ['waterway-label', 'water-point-label', 'poi-label', 'road-label'];
      for (const layerName of possibleLayers) {
        if (mapInstance.getLayer(layerName)) {
          beforeLayer = layerName;
          break;
        }
      }

      // Update the inactive layer with new tiles
      const inactiveSourceId = inactiveLayer;
      
      // Remove the inactive layer temporarily
      mapInstance.removeLayer(inactiveLayer);
      
      // Remove and re-add the source with new tiles
      if (mapInstance.getSource(inactiveSourceId)) {
        mapInstance.removeSource(inactiveSourceId);
      }
      
      // Add source with new tile URL
      mapInstance.addSource(inactiveSourceId, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 12,
      });
      
      // Re-add the layer with full opacity
      mapInstance.addLayer({
        id: inactiveLayer,
        type: 'raster',
        source: inactiveSourceId,
        paint: {
          'raster-opacity': radarOpacity,
          'raster-fade-duration': 0,
        },
      }, beforeLayer);

      // Instantly swap: hide active layer, show inactive layer (no delay)
      mapInstance.setPaintProperty(activeLayer, 'raster-opacity', 0);
      
      // Swap which layer is considered "active"
      radarActiveLayerRef.current = inactiveLayer;
      
    } catch (error) {
      console.error('Error updating radar frame:', error);
    }
  };

  // Handle frame change
  useEffect(() => {
    if (selectedDataOptions.weatherRadar && radarFrames.length > 0 && map.current) {
      // Wait for style to load if it's not ready
      if (!map.current.isStyleLoaded()) {
        const onStyleLoad = () => {
          setRadarFrame(currentFrameIndex);
        };
        
        map.current.once('style.load', onStyleLoad);
        return () => {
          map.current?.off('style.load', onStyleLoad);
        };
      }
      
      setRadarFrame(currentFrameIndex);
    }
  }, [currentFrameIndex, radarFrames, selectedDataOptions.weatherRadar]);

  // Handle opacity change
  useEffect(() => {
    if (!map.current || !selectedDataOptions.weatherRadar || radarFrames.length === 0) return;

    const mapInstance = map.current;
    
    // Check if style is loaded before accessing layers
    if (!mapInstance.isStyleLoaded()) return;
    
    const activeLayer = radarActiveLayerRef.current;

    try {
      if (mapInstance.getLayer(activeLayer)) {
        console.log('Updating radar opacity to:', radarOpacity, 'for layer:', activeLayer);
        mapInstance.setPaintProperty(activeLayer, 'raster-opacity', radarOpacity);
      }
    } catch (error) {
      console.error('Error updating radar opacity:', error);
    }
  }, [radarOpacity, selectedDataOptions.weatherRadar, radarFrames]);

  // Handle animation play/pause
  useEffect(() => {
    if (isRadarPlaying && radarFrames.length > 0) {
      animationIntervalRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % radarFrames.length);
      }, 1000 / 4); // 4 fps
    } else {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    }

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [isRadarPlaying, radarFrames]);

  // Handle map style changes
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;
    const styleUrls = {
      light: 'mapbox://styles/mapbox/light-v11',
      dark: 'mapbox://styles/mapbox/dark-v11',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12'
    };

    const targetUrl = styleUrls[mapStyle];

    // If Elections is checked, store the desired style but don't apply it yet
    if (selectedDataOptions?.elections) {
      console.log(`MapView: Elections is checked, storing pending style: ${mapStyle}`);
      pendingStyleRef.current = targetUrl;
      return;
    }

    // Only change style if it's different from current
    if (currentStyleUrlRef.current !== targetUrl) {
      // Wait for current style to finish loading before switching
      if (!mapInstance.isStyleLoaded()) {
        console.log('⏳ Style still loading, waiting before change...');
        mapInstance.once('style.load', () => {
          // Re-run this effect logic after style loads
          if (currentStyleUrlRef.current !== targetUrl) {
            applyStyleChange();
          }
        });
        return;
      }
      
      applyStyleChange();
    }
    
    function applyStyleChange() {
      console.log(`Changing map style from ${currentStyleUrlRef.current} to: ${targetUrl}`);
      
      // When we change the style, all custom layers/sources are removed
      // We need to re-add them after the new style loads
      const restoreLayers = () => {
        console.log('🔄 Restoring layers after style change...');
        
        // Re-add state boundaries if enabled
        if (selectedDataOptions.stateInfo) {
          if (!mapInstance.getSource('state-boundaries')) {
            mapInstance.addSource('state-boundaries', {
              type: 'vector',
              url: 'mapbox://mapbox.us_census_states_2015'
            });

            mapInstance.addLayer({
              id: 'state-fills',
              type: 'fill',
              source: 'state-boundaries',
              'source-layer': 'states',
              layout: {
                visibility: 'visible'
              },
              paint: {
                'fill-color': getStateColorExpression(),
                'fill-opacity': [
                  'case',
                  ['boolean', ['feature-state', 'hover'], false],
                  0.5,
                  0.3
                ]
              }
            });
            console.log('✅ Restored state boundaries layer');
          }
        }
        
        // Re-add population layer if enabled
        if (selectedDataOptions?.population && populationData && populationData.features.length > 0) {
          if (!mapInstance.getSource('county-population')) {
            mapInstance.addSource('county-population', {
              type: 'geojson',
              data: populationData
            });

            mapInstance.addLayer({
              id: 'county-population-circles',
              type: 'circle',
              source: 'county-population',
              paint: {
                'circle-color': '#3b82f6',
                'circle-opacity': 0.6,
                'circle-stroke-color': '#1e40af',
                'circle-stroke-width': 1,
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  3, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 1,
                    316, 2.5,
                    1000, 5,
                    2236, 8
                  ],
                  4, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 2,
                    316, 5,
                    1000, 10,
                    2236, 16
                  ],
                  5, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 3.5,
                    316, 8.75,
                    1000, 17.5,
                    2236, 28
                  ],
                  6, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 5,
                    316, 12.5,
                    1000, 25,
                    2236, 40
                  ],
                  7, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 6.5,
                    316, 16.25,
                    1000, 32.5,
                    2236, 52
                  ],
                  10, [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['get', 'POP']]],
                    100, 10,
                    316, 25,
                    1000, 50,
                    2236, 80
                  ]
                ]
              }
            });
            console.log('✅ Restored population layer');
          }
        }
        
        // Re-add radar layers if enabled
        if (selectedDataOptions.weatherRadar && radarFrames.length > 0) {
          const currentFrame = radarFrames[currentFrameIndex] || radarFrames[radarFrames.length - 1];
          const tileUrl = `https://tilecache.rainviewer.com${currentFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;
          
          if (!mapInstance.getSource('radarA')) {
            mapInstance.addSource('radarA', {
              type: 'raster',
              tiles: [tileUrl],
              tileSize: 256,
              minzoom: 0,
              maxzoom: 12,
            });

            mapInstance.addSource('radarB', {
              type: 'raster',
              tiles: [tileUrl],
              tileSize: 256,
              minzoom: 0,
              maxzoom: 12,
            });

            // Find a good layer to insert before
            let beforeLayer = undefined;
            const possibleLayers = ['waterway-label', 'water-point-label', 'poi-label', 'road-label'];
            for (const layerName of possibleLayers) {
              if (mapInstance.getLayer(layerName)) {
                beforeLayer = layerName;
                break;
              }
            }

            mapInstance.addLayer({
              id: 'radarA',
              type: 'raster',
              source: 'radarA',
              paint: {
                'raster-opacity': radarOpacity,
                'raster-fade-duration': 0,
              },
            }, beforeLayer);

            mapInstance.addLayer({
              id: 'radarB',
              type: 'raster',
              source: 'radarB',
              paint: {
                'raster-opacity': 0,
                'raster-fade-duration': 0,
              },
            }, beforeLayer);
            
            console.log('✅ Restored radar layers');
          }
        }
        
        console.log('✅ All layers restored after style change');
      };
      
      // Listen for the style to finish loading, then restore layers
      mapInstance.once('style.load', restoreLayers);
      
      mapInstance.setStyle(targetUrl);
      currentStyleUrlRef.current = targetUrl;
    }
  }, [mapStyle, selectedDataOptions, populationData, radarFrames, currentFrameIndex, radarOpacity]);

  // Handle map labels visibility (city, state, country)
  useEffect(() => {
    if (!map.current) return;
    
    const mapInstance = map.current;
    
    // Wait for style to be loaded
    const updateLabels = () => {
      if (!mapInstance.isStyleLoaded()) {
        mapInstance.once('style.load', updateLabels);
        return;
      }
      
      const visibility = showMapLabels ? 'visible' : 'none';
      console.log(`Setting map labels visibility to: ${visibility}`);
      
      // Layer IDs vary by map style, so we try common label layer patterns
      const labelLayers = [
        'settlement-label',
        'settlement-major-label',
        'settlement-minor-label',
        'settlement-subdivision-label',
        'state-label',
        'country-label',
        'place-city-lg-n',
        'place-city-lg-s',
        'place-city-md-n',
        'place-city-md-s',
        'place-city-sm',
        'place-town',
        'place-village',
        'place-hamlet',
        'place-suburb',
        'place-neighbourhood',
        'place-islet-archipelago-aboriginal',
        'admin-0-boundary-bg',
        'admin-1-boundary-bg',
        'admin-0-boundary',
        'admin-1-boundary'
      ];
      
      labelLayers.forEach(layerId => {
        try {
          if (mapInstance.getLayer(layerId)) {
            mapInstance.setLayoutProperty(layerId, 'visibility', visibility);
          }
        } catch (e) {
          // Layer doesn't exist in this style, skip
        }
      });
    };
    
    updateLabels();
  }, [showMapLabels, mapStyle]); // Re-run when style changes too

  console.log('🎬 RENDER - weatherRadar:', selectedDataOptions.weatherRadar, 'frames:', radarFrames.length);
  
  return (
    <div id="map-frame" className="w-full h-full relative">
      <div id="map" ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      
      {/* Overlay container for all DOM elements that should be captured in screenshots */}
      <div id="map-overlays" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* World Cup Stadium Markers - DOM rendered */}
        {selectedDataOptions?.worldCup2026 && worldCupStadiums.length > 0 && (
          <div id="stadium-markers-container" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {worldCupStadiums.map((stadium) => {
              const position = stadiumPositions.get(stadium.name);
              if (!position) return null;
              
              const isSelected = selectedStadium?.name === stadium.name;
              
              return (
                <div
                  key={stadium.name}
                  style={{
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    transform: 'translate(-50%, -100%)', // Center horizontally, anchor at bottom
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    console.log('Stadium marker clicked:', stadium.name);
                    // Toggle: if clicking the same stadium, close the panel
                    if (selectedStadium?.name === stadium.name && showStadiumPanel) {
                      setShowStadiumPanel(false);
                    } else {
                      setSelectedStadium(stadium);
                      setShowStadiumPanel(true);
                    }
                  }}
                >
                  <StadiumMarker 
                    stadium={stadium}
                    onClick={() => {}}
                    isSelected={isSelected}
                  />
                </div>
              );
            })}
          </div>
        )}
        
        {/* Weather Markers - DOM rendered */}
        {selectedDataOptions.weather && weatherLocations.length > 0 && (
          <div id="weather-markers-container" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {weatherLocations.map((location) => {
              const key = `${location.location}-${location.latitude}-${location.longitude}`;
              const position = weatherPositions.get(key);
              if (!position) return null;
              
              // Skip invalid coordinates
              if (!location.latitude || !location.longitude) {
                return null;
              }
              
              return (
                <div
                  key={key}
                  style={{
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    transform: 'translate(0, -100%)', // Anchor at bottom-left (matching old anchor)
                    pointerEvents: 'auto',
                  }}
                >
                  <WeatherMarker 
                    data={{
                      location: location.location,
                      admin1: location.admin1,
                      country: location.country,
                      temperature: location.current_temp || 0,
                      feelsLike: location.feels_like,
                      condition: location.current_condition || 'N/A',
                      humidity: location.humidity,
                      uvIndex: location.uv_index,
                      alerts: location.alerts,
                      lastUpdated: location.last_updated,
                      icon: location.icon,
                      dailyForecast: location.daily_forecast,
                      hourlyForecast: location.hourly_forecast
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
        
        {/* AI Infrastructure Markers - DOM rendered */}
        {selectedDataOptions?.aiInfra && aiInfraFeatures && aiInfraFeatures.length > 0 && (
          <div id="ai-infra-markers-container" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {aiInfraFeatures.map((feature) => {
              const position = aiInfraPositions.get(feature.properties.name);
              if (!position) return null;
              
              const [lng, lat] = feature.geometry.coordinates;
              
              // Skip invalid coordinates
              if (!lng || !lat || typeof lng !== 'number' || typeof lat !== 'number') {
                return null;
              }
              
              const isSelected = selectedAIInfra?.properties.name === feature.properties.name;
              
              return (
                <div
                  key={feature.properties.name}
                  style={{
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    transform: 'translate(-50%, -50%)', // Center marker
                    pointerEvents: 'auto',
                  }}
                >
                  <AIInfraMarker
                    feature={feature}
                    onClick={() => {
                      // Toggle: if clicking the same feature, close the panel
                      if (isSelected && showAIInfraPanel) {
                        setShowAIInfraPanel(false);
                      } else {
                        setSelectedAIInfra(feature);
                        setShowAIInfraPanel(true);
                      }
                    }}
                    isSelected={isSelected}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Media Markers - DOM rendered */}
        {selectedDataOptions?.media && mediaAssets && mediaAssets.length > 0 && (
          <div id="media-markers-container" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {mediaAssets.map((asset) => {
              const position = mediaPositions.get(asset.id);
              if (!position) return null;
              
              // Skip invalid coordinates
              if (!asset.longitude || !asset.latitude || typeof asset.longitude !== 'number' || typeof asset.latitude !== 'number') {
                return null;
              }
              
              const isSelected = selectedMedia?.id === asset.id;
              
              return (
                <div
                  key={asset.id}
                  style={{
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    transform: 'translate(-50%, -50%)', // Center marker
                    pointerEvents: 'auto',
                  }}
                >
                  <MediaMarker
                    asset={asset}
                    onClick={() => {
                      // Toggle: if clicking the same asset, close the panel
                      if (isSelected && showMediaPanel) {
                        setShowMediaPanel(false);
                      } else {
                        setSelectedMedia(asset);
                        setShowMediaPanel(true);
                      }
                    }}
                    isSelected={isSelected}
                  />
                </div>
              );
            })}
          </div>
        )}
        
        {/* Each child element needs pointerEvents: 'auto' individually */}
        <div style={{ pointerEvents: 'none', position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <CountyInfoPanel
              sidebarPosition={sidebarPosition}
              showElections={selectedDataOptions?.elections}
              isMinimized={isCountyPanelCollapsed}
              setIsMinimized={setIsCountyPanelCollapsed}
              mapRef={mapRef}
              electionMapRef={electionMapRef}
              setShowAIAnalysisPanel={setShowAIAnalysisPanel}
              setScreenshotImage={setScreenshotImage}
              setAIAnalysis={setAIAnalysis}
              setIsAnalyzingImage={setIsAnalyzingImage}
              setAnalysisError={setAnalysisError}
              setCurrentAIFeature={setCurrentAIFeature}
              aiProviderSettings={aiProviderSettings}
              displayResult={displayResult}
              selectedType={electionType}
              year={currentElection?.year || electionYear}
              raceName={displayResult?.raceName || currentElection?.year || currentElection?.description || ''}
              stateName={stateName}
              countyName={countyName}
            />
          </div>
          
          {/* Stadium info panel - show when a stadium is selected */}
          <AnimatePresence mode="wait" onExitComplete={() => {
            if (!showStadiumPanel) {
              setSelectedStadium(null);
            }
          }}>
            {selectedStadium && showStadiumPanel && (
              <div key="stadium-panel" style={{ pointerEvents: 'auto' }}>
                <StadiumInfoPanel 
                  stadium={selectedStadium}
                  sidebarPosition={sidebarPosition}
                  onClose={() => setShowStadiumPanel(false)}
                />
              </div>
            )}
          </AnimatePresence>
          
          {/* AI Infrastructure info panel - show when a feature is selected */}
          <AnimatePresence mode="wait" onExitComplete={() => {
            if (!showAIInfraPanel) {
              setSelectedAIInfra(null);
            }
          }}>
            {selectedAIInfra && showAIInfraPanel && (
              <div key="ai-infra-panel" style={{ pointerEvents: 'auto' }}>
                <AIInfraInfoPanel 
                  feature={selectedAIInfra}
                  sidebarPosition={sidebarPosition}
                  onClose={() => setShowAIInfraPanel(false)}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Media info panel - show when a media asset is selected */}
          <AnimatePresence mode="wait">
            {selectedMedia && showMediaPanel && (
              <MediaInfoPanel 
                key="media-panel"
                asset={selectedMedia}
                onClose={() => setShowMediaPanel(false)}
              />
            )}
          </AnimatePresence>

          {/* State info panel - show when a state is selected */}
          <AnimatePresence mode="wait" onExitComplete={() => {
            if (!showStatePanel) {
              // Clear the highlight when panel is closed
              if (selectedStateIdRef.current !== null && map.current) {
                map.current.setFeatureState(
                  { source: 'state-boundaries', sourceLayer: 'states', id: selectedStateIdRef.current },
                  { selected: false }
                );
                selectedStateIdRef.current = null;
              }
              setSelectedState(null);
            }
          }}>
            {selectedState && showStatePanel && (
              <div key="state-panel" style={{ pointerEvents: 'auto' }}>
                <StateInfoPanel 
                  stateInfo={selectedState}
                  sidebarPosition={sidebarPosition}
                  onClose={() => setShowStatePanel(false)}
                />
              </div>
            )}
          </AnimatePresence>
          
          {/* Radar controls - ALWAYS show when weatherRadar is enabled */}
          {selectedDataOptions.weatherRadar && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 z-10 min-w-[500px]" style={{ pointerEvents: 'auto' }}>
              <div className="text-sm text-center mb-2">
                Weather Radar Controls
              </div>
              {radarFrames.length === 0 ? (
                <div className="text-sm text-gray-500 text-center">
                  Loading radar data...
                </div>
              ) : (
                <RadarControls
                  frames={radarFrames}
                  currentFrameIndex={currentFrameIndex}
                  isPlaying={isRadarPlaying}
                  opacity={radarOpacity}
                  onFrameChange={setCurrentFrameIndex}
                  onPlayPause={() => setIsRadarPlaying(!isRadarPlaying)}
                  onFetchLatest={fetchRadarFramesData}
                  onOpacityChange={setRadarOpacity}
                />
              )}
            </div>
          )}
          
          {/* Map Control Buttons - positioned near sidebar */}
          <div 
            className={`absolute top-2 flex gap-1 transition-all duration-300 ${
              sidebarPosition === 'left' 
                ? (isSidebarCollapsed ? 'left-[44px]' : 'left-[133px]') 
                : (isSidebarCollapsed ? 'right-[44px]' : 'right-[133px]')
            }`}
            style={{ pointerEvents: 'auto' }}
          >
            {/* Home Button - Reset to default view */}
            <button
              type="button"
              onClick={async (e) => {
                console.log('🏠 Home button clicked!');
                console.log('mapRef exists:', !!mapRef?.current);
                
                e.preventDefault();
                e.stopPropagation();
                
                if (!mapRef?.current) {
                  console.error('❌ Map reference not available');
                  return;
                }
                
                // Reset all selections to initial state
                console.log('🔄 Resetting all selections...');
                setSelectedData(null);
                setIsCountyPanelCollapsed(true);
                setStateName('');
                setCountyName('');
                setDisplayResult(null);
                
                // Notify parent component of reset
                if (onSelectedDataChange) {
                  onSelectedDataChange(null);
                }
                
                // Trigger ElectionDashboard's home click to reset state/district selections
                if ((mapRef.current as any)._electionMapHomeClick) {
                  console.log('🗳️ Triggering ElectionDashboard home reset...');
                  (mapRef.current as any)._electionMapHomeClick();
                }
                
                // Fetch latest default position from database
                console.log('📥 Fetching default position from database...');
                const settings = await loadMapSettings();
                
                const lat = settings.default_latitude;
                const lng = settings.default_longitude;
                const zoom = settings.default_zoom;
                
                if (!lat || !lng || !zoom) {
                  console.error('❌ Default position not found in database');
                  return;
                }
                
                // Wait briefly to let MapContainer's flyTo start, then override it with database position
                // This ensures we always end up at the database-stored default position
                setTimeout(() => {
                  if (!mapRef?.current) return;
                  
                  console.log('✅ Flying to database position:', { lat, lng, zoom });
                  mapRef.current.flyTo({
                    center: [lng, lat],
                    zoom: zoom,
                    pitch: 0,
                    bearing: 0,
                    duration: 1500,
                    essential: true
                  });
                }, 100);
              }}
              className="h-8 w-8 bg-white hover:bg-gray-50 rounded-lg shadow-sm flex items-center justify-center transition-colors border border-gray-200 cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              aria-label="Reset to default view"
            >
              <Home className="w-4 h-4 text-gray-600" />
            </button>
            
            {/* State Quick Links Button */}
            <button
              onClick={() => setShowStateQuickLinks(!showStateQuickLinks)}
              className="h-8 w-8 bg-white hover:bg-gray-50 rounded-lg shadow-sm flex items-center justify-center transition-colors border border-gray-200"
              aria-label="State Quick Links"
            >
              <MapPin className="w-4 h-4 text-blue-600" />
            </button>
          </div>
          
          {/* Election Panel Toggle Button - positioned dynamically */}
          {selectedDataOptions?.elections && (
            <div 
              className={`absolute top-2 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                sidebarPosition === 'left' 
                  ? (isCountyPanelCollapsed ? 'right-2' : 'right-[532px]')
                  : (isCountyPanelCollapsed ? 'left-2' : 'left-[532px]')
              }`}
              style={{ pointerEvents: 'auto' }}
            >
              <button
                onClick={() => setIsCountyPanelCollapsed(!isCountyPanelCollapsed)}
                className="h-8 w-8 bg-white/80 backdrop-blur-md hover:bg-white/90 hover:scale-110 rounded-lg shadow-lg flex items-center justify-center transition-all duration-300 border border-white/20"
                aria-label="Toggle election panel"
              >
                {isCountyPanelCollapsed ? (
                  sidebarPosition === 'left' ? (
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )
                ) : (
                  sidebarPosition === 'left' ? (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  )
                )}
              </button>
            </div>
          )}
          
          {/* State Quick Links Panel */}
          {showStateQuickLinks && (
            <div 
              className={`absolute top-[52px] transition-all duration-300 ${
                sidebarPosition === 'left' 
                  ? (isSidebarCollapsed ? 'left-[44px]' : 'left-[133px]') 
                  : (isSidebarCollapsed ? 'right-[44px]' : 'right-[133px]')
              }`}
              style={{ pointerEvents: 'auto' }}
            >
              <StateQuickLinksPanel
                mapRef={mapRef}
                onClose={() => setShowStateQuickLinks(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
