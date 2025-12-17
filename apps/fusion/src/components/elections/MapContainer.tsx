import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
// import { Chrome as Home } from 'lucide-react'; // Home button hidden - controlled via MapView
import { stateAbbreviations } from './data/stateData';
import { ElectionType, ElectionYear, getWinnerPartyName, PartyInfo } from './data/electionData';
import { GEOJSON_URLS } from '../../utils/constants';
import { loadMapSettings } from '../../utils/mapSettingsApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Bug } from 'lucide-react';
import { fetchParties, normalizePartyCode } from '../../utils/partyData';

// Set the Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZW1lcmdlbnRzb2x1dGlvbnMiLCJhIjoiY21mbGJuanZ1MDNhdDJqcTU1cHVjcWJycCJ9.Tk2txI10-WExxSoPnHlu_g';

// Helper function to transform synthetic race data into election data format
const transformSyntheticDataToElectionFormat = async (syntheticData: any[]) => {
  console.log('🎨 MapContainer: Fetching party colors from e_parties table...');
  let partiesData: any;
  try {
    partiesData = await fetchParties();
    console.log('🎨 MapContainer: ✅ Party colors fetched successfully!');
  } catch (error) {
    console.error('🎨 MapContainer: ❌ Error fetching parties, using fallback colors:', error);
    partiesData = {};
  }
  
  const results: any = {};
  const candidates: any = {};
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
  
  console.log('🎨 MapContainer: Final parties object with colors:');
  console.log('  DEM:', parties['DEM']);
  console.log('  REP:', parties['REP']);
  console.log('  IND:', parties['IND']);
  console.log('  LIB:', parties['LIB']);
  
  syntheticData.forEach((race) => {
    const stateCode = race.state_abbr;
    if (!stateCode) return;
    
    // Create result entry for this state
    results[stateCode] = {
      'cand-dem': {
        votes: race.democrat_votes || 0,
        percent: race.democrat_percent || 0,
        winner: race.winner === 'Democrat'
      },
      'cand-rep': {
        votes: race.republican_votes || 0,
        percent: race.republican_percent || 0,
        winner: race.winner === 'Republican'
      },
      'cand-ind': {
        votes: race.independent_votes || 0,
        percent: race.independent_percent || 0,
        winner: race.winner === 'Independent'
      },
      'cand-lib': {
        votes: race.libertarian_votes || 0,
        percent: race.libertarian_percent || 0,
        winner: race.winner === 'Libertarian'
      },
      stateElectoralVotes: race.electoral_votes || 0
    };
  });
  
  // Create candidate info
  candidates['cand-dem'] = { party_code: 'DEM', name: 'Democrat Candidate' };
  candidates['cand-rep'] = { party_code: 'REP', name: 'Republican Candidate' };
  candidates['cand-ind'] = { party_code: 'IND', name: 'Independent Candidate' };
  candidates['cand-lib'] = { party_code: 'LIB', name: 'Libertarian Candidate' };
  
  return {
    results,
    candidates,
    parties,
    winner: 'Synthetic Race Data'
  };
};

// Helper function to calculate bounds and fit to a feature's geometry
const fitBoundsToFeature = (map: mapboxgl.Map, feature: any, options?: { padding?: number; duration?: number }) => {
  if (!feature.geometry || feature.geometry.type === "GeometryCollection") {
    return;
  }

  const coordinates = feature.geometry.coordinates;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  const processCoordinates = (coords: any) => {
    if (typeof coords[0] === 'number') {
      minLng = Math.min(minLng, coords[0]);
      maxLng = Math.max(maxLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLat = Math.max(maxLat, coords[1]);
    } else {
      coords.forEach((coord: any) => processCoordinates(coord));
    }
  };

  processCoordinates(coordinates);

  if (minLng !== Infinity && maxLng !== -Infinity && minLat !== Infinity && maxLat !== -Infinity) {
    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      {
        padding: options?.padding ?? 50,
        duration: options?.duration ?? 1500,
        maxZoom: 17
      }
    );
  }
};

interface MapContainerProps {
  onStateClick: (event: any) => void;
  onHomeClick: () => void;
  sidebarVisible: boolean;
  selectedState: string | null;
  selectedType: 'presidential' | 'senate' | 'house';
  selectedYear: number;
  currentElection: any;
  currentCountyElection: any;
  currentDistrictElection: any;
  setSelectedYear: React.Dispatch<React.SetStateAction<ElectionYear>>;
  mapViewRef?: React.MutableRefObject<mapboxgl.Map | null>;
  electionMapRef?: React.MutableRefObject<mapboxgl.Map | null>;
  mapStyle?: 'light' | 'dark' | 'satellite';
  showMapLabels?: boolean;
  globeMode?: boolean;
  atmosphereEnabled?: boolean;
  projection?: 'mercator' | 'albers' | 'equirectangular';
  electionMapOpacity?: number;
  syntheticRaceData?: any[];
}

export function MapContainer({ onStateClick, onHomeClick, sidebarVisible, selectedState, selectedType, selectedYear, currentElection, currentCountyElection, currentDistrictElection, setSelectedYear, mapViewRef, electionMapRef, mapStyle = 'light', showMapLabels = true, globeMode = false, atmosphereEnabled = false, projection = 'mercator', electionMapOpacity = 1.0, syntheticRaceData }: MapContainerProps) {
  //console.log('🔄 MapContainer received mapViewRef:', !!mapViewRef);
  //console.log('🔄 MapContainer received electionMapRef:', !!electionMapRef);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const currentElectionType = useRef(selectedType);
  const currentElectionYear = useRef(selectedYear);
  const currentCountyElectionRef = useRef(currentCountyElection);
  const currentDistrictElectionRef = useRef(currentDistrictElection);
  const [lng, setLng] = useState(-97);
  const [lat, setLat] = useState(38);
  const [zoom, setZoom] = useState(3.5);
  const [defaultPosition, setDefaultPosition] = useState({ lng: -97, lat: 38, zoom: 3.5 });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [layersReady, setLayersReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isZoomedToState, setIsZoomedToState] = useState(false);
  const [zoomedStateName, setZoomedStateName] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const [showDebugDialog, setShowDebugDialog] = useState(false);

  // Update ref whenever currentCountyElection prop changes
  React.useEffect(() => {
    currentCountyElectionRef.current = currentCountyElection;
    console.log('🟢 MapContainer received currentCountyElection prop:', currentCountyElection ? 'EXISTS' : 'NULL');
    if (currentCountyElection && currentCountyElection.results) {
      console.log('🟢 Prop has', Object.keys(currentCountyElection.results).length, 'counties');
    }
  }, [currentCountyElection]);

  // Update ref whenever currentDistrictElection prop changes
  React.useEffect(() => {
    currentDistrictElectionRef.current = currentDistrictElection;
    console.log('🔷 MapContainer received currentDistrictElection prop:', currentDistrictElection ? 'EXISTS' : 'NULL');
    if (currentDistrictElection && currentDistrictElection.results) {
      console.log('🔷 Prop has', Object.keys(currentDistrictElection.results).length, 'districts');
    }
  }, [currentDistrictElection]);

  // Fetch default position from database on mount and apply to map
  React.useEffect(() => {
    const fetchAndApplyDefaultPosition = async () => {
      try {
        console.log('📍 MapContainer: Fetching default position via RPC...');
        const settings = await loadMapSettings();
        console.log('📍 MapContainer: RPC settings result:', settings);
        
        if (settings.default_latitude && settings.default_longitude && settings.default_zoom) {
          const position = {
            lng: settings.default_longitude,
            lat: settings.default_latitude,
            zoom: settings.default_zoom
          };
          
          setDefaultPosition(position);
          
          // Also update the map center/zoom state for initial render
          setLng(position.lng);
          setLat(position.lat);
          setZoom(position.zoom);
          
          console.log('✅ MapContainer: Loaded and applied default position via RPC:', position);
          
          // If map is already initialized, fly to the position
          if (map.current && map.current.loaded()) {
            console.log('✈️ MapContainer: Auto-flying to default position on app load');
            map.current.flyTo({
              center: [position.lng, position.lat],
              zoom: position.zoom,
              pitch: 0,
              bearing: 0,
              duration: 1500
            });
          }
        } else {
          console.log('⚠️ MapContainer: No default position in settings');
        }
      } catch (error) {
        console.error('❌ MapContainer: Error fetching default position:', error);
      }
    };

    fetchAndApplyDefaultPosition();
  }, []); 

  // Helper function to build color expression from election data
  const getColorExpression = React.useCallback((electionType: ElectionType, electionYear: ElectionYear): any => {
    let electionData = currentElection;
    console.log('🎨 getColorExpression called for', electionType, electionYear);
    console.log('🎨 Using currentElection:', currentElection ? 'EXISTS' : 'NULL');
    console.log(currentElection);

    if (!electionData || !electionData.parties || !Object.keys(electionData.parties).length) {
      console.log('Using district dataaaaaaaaaa');
      console.log(currentDistrictElection);
      electionData = currentDistrictElection;
    }

    if (!electionData || !electionData.parties) {
      console.log('🎨 No election data, using default gray');
      return ['case', ['==', ['get', 'winner'], 'Draw'], '#9CA3AF', '#9CA3AF'];
    }

    const colorCases: any[] = ['case'];

    // Build color cases for each party
    Object.entries(electionData.parties).forEach(([partyCode, partyInfo]) => {
      const party = partyInfo as PartyInfo;
      const color = party.color.startsWith('#') ? party.color : `#${party.color}`;
      colorCases.push(['==', ['get', 'winner'], party.name]);
      colorCases.push(color);
    });

    // Add Draw case
    colorCases.push(['==', ['get', 'winner'], 'Draw']);
    colorCases.push('#9CA3AF');

    // Default color
    colorCases.push('#9CA3AF');

    console.log('🎨 Color expression built with', Object.keys(electionData.parties).length, 'parties');

    console.log(colorCases);

    return colorCases;
  }, [currentElection, currentDistrictElection]);

  // Update refs whenever props change
  useEffect(() => {
    currentElectionType.current = selectedType;
    currentElectionYear.current = selectedYear;
    console.log('Updated refs - Type:', selectedType, 'Year:', selectedYear);
  }, [selectedType, selectedYear]);

  // Sync FROM MapView TO MapContainer - poll until MapView is ready
  useEffect(() => {
    console.log('🔄 Checking for MapView availability...');

    // Poll for mapViewRef to become available
    const checkInterval = setInterval(() => {
      if (mapViewRef?.current && map.current) {
        console.log('🔄 Both maps available! Setting up bidirectional sync');
        clearInterval(checkInterval);

        const handleMapViewMove = () => {
          if (!mapViewRef?.current || !map.current) return;

          // Check if this move is already a sync from election map
          if ((mapViewRef.current as any)._isSyncingFromElection) {
            return;
          }

          // MapView was moved by user, sync to election map
          if (!isSyncingRef.current) {
            isSyncingRef.current = true;
            const center = mapViewRef.current.getCenter();
            const zoom = mapViewRef.current.getZoom();
            const bearing = mapViewRef.current.getBearing();
            const pitch = mapViewRef.current.getPitch();

            map.current.jumpTo({
              center: [center.lng, center.lat],
              zoom: zoom,
              bearing: bearing,
              pitch: pitch
            });

            // Reset flag immediately using requestAnimationFrame
            requestAnimationFrame(() => {
              isSyncingRef.current = false;
            });
          }
        };

        mapViewRef.current.on('move', handleMapViewMove);
        console.log('🔄 MapView -> MapContainer sync listener attached');

        // Expose MapContainer's home function to MapView
        (mapViewRef.current as any)._electionMapHomeClick = handleHomeClick;
        console.log('🔄 Exposed MapContainer home function to MapView');
      }
    }, 100);

    // Cleanup after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      console.log('🔄 Stopped polling for MapView (timeout)');
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
      console.log('🔄 Cleaning up MapView -> MapContainer sync');
      if (mapViewRef?.current) {
        mapViewRef.current.off('move', () => {});
        // Clean up exposed function
        (mapViewRef.current as any)._electionMapHomeClick = undefined;
      }
    };
  }, [mapViewRef, mapLoaded]);

  const handleHomeClick = () => {
    if (map.current) {
     console.log('Home button clicked - resetting to state view');
     console.log('Current election type:', currentElectionType.current );
     console.log('Using default position:', defaultPosition);

      // Reset layers BEFORE animation to prevent white flash
      console.log('Resetting layers before animation...');

      // Hide counties immediately
      if (map.current.getLayer('counties-fill')) {
        map.current.setLayoutProperty('counties-fill', 'visibility', 'none');
        map.current.setFilter('counties-fill', null);
      }
      if (map.current.getLayer('counties-border')) {
        map.current.setLayoutProperty('counties-border', 'visibility', 'none');
        map.current.setFilter('counties-border', null);
      }
      if (map.current.getLayer('counties-highlight')) {
        map.current.setLayoutProperty('counties-highlight', 'visibility', 'none');
        map.current.setFilter('counties-highlight', null);
      }

      // Handle districts based on election type
      if (currentElectionType.current === 'house') {
        // For house elections, show districts at state level
        if (map.current.getLayer('districts-fill')) {
          map.current.setLayoutProperty('districts-fill', 'visibility', 'visible');
          map.current.setFilter('districts-fill', null);
        }
        if (map.current.getLayer('districts-border')) {
          map.current.setLayoutProperty('districts-border', 'visibility', 'visible');
          map.current.setFilter('districts-border', null);
        }
        if (map.current.getLayer('districts-highlight')) {
          map.current.setLayoutProperty('districts-highlight', 'visibility', 'none');
          map.current.setFilter('districts-highlight', null);
        }
      } else {
        // For presidential/senate, hide districts
        if (map.current.getLayer('districts-fill')) {
          map.current.setLayoutProperty('districts-fill', 'visibility', 'none');
          map.current.setFilter('districts-fill', null);
        }
        if (map.current.getLayer('districts-border')) {
          map.current.setLayoutProperty('districts-border', 'visibility', 'none');
          map.current.setFilter('districts-border', null);
        }
        if (map.current.getLayer('districts-highlight')) {
          map.current.setLayoutProperty('districts-highlight', 'visibility', 'none');
          map.current.setFilter('districts-highlight', null);
        }
      }

      // Show state layers immediately
      if (map.current.getLayer('states-fill')) {
        map.current.setLayoutProperty('states-fill', 'visibility', 'visible');
        if (currentElectionType.current === 'house') {
          map.current.setPaintProperty('states-fill', 'fill-opacity', 0.1);
        } else {
          map.current.setPaintProperty('states-fill', 'fill-opacity', 0.8);
        }
      }
      if (map.current.getLayer('states-border')) {
        map.current.setLayoutProperty('states-border', 'visibility', 'visible');
      }
      if (map.current.getLayer('states-grey')) {
        map.current.setLayoutProperty('states-grey', 'visibility', 'none');
        map.current.setFilter('states-grey', ['!=', 'name', '']);
      }
      if (map.current.getLayer('states-grey-border')) {
        map.current.setLayoutProperty('states-grey-border', 'visibility', 'none');
        map.current.setFilter('states-grey-border', ['!=', 'name', '']);
      }

      // Now start the animation with layers already configured
      map.current.flyTo({
        center: [defaultPosition.lng, defaultPosition.lat],
        zoom: defaultPosition.zoom,
        pitch: 0,
        bearing: 0,
        duration: 1500
      });

      setIsZoomedToState(false);
      setZoomedStateName(null);
    }
    onHomeClick();
  };

  useEffect(() => {
    console.log('MapContainer useEffect running...');
    console.log('mapContainer.current:', !!mapContainer.current);
    console.log('map.current:', !!map.current);
    console.log('Current props - selectedType:', selectedType, 'selectedYear:', selectedYear);
    
    if (map.current) return; // initialize map only once
    if (!mapContainer.current) return;

    try {
      console.log('Initializing Mapbox map...');
      const styleUrls = {
        light: 'mapbox://styles/mapbox/light-v11',
        dark: 'mapbox://styles/mapbox/dark-v11',
        satellite: 'mapbox://styles/mapbox/satellite-streets-v12'
      };
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: styleUrls[mapStyle],
        center: [lng, lat],
        zoom: zoom,
        projection: globeMode ? ('globe' as any) : (projection as any),
        preserveDrawingBuffer: true, // Required for screenshot capture
        doubleClickZoom: false, // Disable default double-click zoom
        // pitchWithRotate: false, // Disable tilt
        dragRotate: false, // Disable rotation
        touchZoomRotate: false, // Disable touch rotation
        attributionControl: false // Hide Mapbox attributions
      });
      console.log('Map created:', !!map.current);

      // Sync with external electionMapRef if provided
      if (electionMapRef) {
        electionMapRef.current = map.current;
        console.log('🔄 MapContainer: electionMapRef has been set!', !!electionMapRef.current);
      }

      // Store the move handler to prevent infinite loops
      const handleElectionMapMove = () => {
        if (map.current && !isSyncingRef.current) {
          setLng(parseFloat(map.current.getCenter().lng.toFixed(4)));
          setLat(parseFloat(map.current.getCenter().lat.toFixed(4)));
          setZoom(parseFloat(map.current.getZoom().toFixed(2)));

          // Sync with MapView if available
          if (mapViewRef?.current) {
            isSyncingRef.current = true;
            const center = map.current.getCenter();
            const zoom = map.current.getZoom();
            const bearing = map.current.getBearing();
            const pitch = map.current.getPitch();

            // Set flag on MapView to prevent it from syncing back
            (mapViewRef.current as any)._isSyncingFromElection = true;

            // Use jumpTo for instant sync without animation
            mapViewRef.current.jumpTo({
              center: [center.lng, center.lat],
              zoom: zoom,
              bearing: bearing,
              pitch: pitch
            });

            // Reset flags immediately after sync using requestAnimationFrame
            requestAnimationFrame(() => {
              isSyncingRef.current = false;
              if (mapViewRef?.current) {
                (mapViewRef.current as any)._isSyncingFromElection = false;
              }
            });
          }
        }
      };

      map.current.on('move', handleElectionMapMove);
      console.log('🔄 MapContainer move listener attached');

      map.current.on('load', () => {
        if (!map.current) return;
        console.log('Map loaded successfully!');
        setMapLoaded(true);

        console.log('Adding states source...');
        // Add US states data
        map.current.addSource('states', {
          type: 'geojson',
          data: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
        });

        // Add US counties data
        map.current.addSource('counties', {
          type: 'geojson',
          data: GEOJSON_URLS.COUNTIES
        });
        
        // Add US districts data
        map.current.addSource('districts', {
          type: 'geojson',
          data: GEOJSON_URLS.DISTRICTS
        });

        // Add a one-time listener for when the states source loads
        const handleSourceData = (e: any) => {
          console.log('Source data event:', e.sourceId, e.isSourceLoaded);
          if (e.sourceId === 'states' && e.isSourceLoaded && map.current) {
            console.log('States source loaded, adding layers...');
            // Remove this event listener to prevent repeated calls
            map.current.off('sourcedata', handleSourceData);
            
            // Fetch the GeoJSON data and merge with election results
            fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
              .then(response => response.json())
              .then(async (data) => {
                console.log('GeoJSON data loaded:', data);
                
                // Get election data - use synthetic data if available (must await since it's async)
                let electionData;
                if (syntheticRaceData && syntheticRaceData.length > 0) {
                  console.log('🔄 Transforming synthetic data (awaiting async)...');
                  electionData = await transformSyntheticDataToElectionFormat(syntheticRaceData);
                } else {
                  electionData = currentElection;
                }

                console.log('MapContainer on load currentElectionnnnn')
                console.log(electionData)
                console.log('🔥 Using synthetic data:', !!(syntheticRaceData && syntheticRaceData.length > 0))
                console.log('🔥 Synthetic race data count:', syntheticRaceData?.length || 0)
                if (syntheticRaceData && syntheticRaceData.length > 0) {
                  console.log('🔥 Sample synthetic race:', syntheticRaceData[0]);
                  console.log('🔥 Transformed election data:', electionData);
                  console.log('🔥 Election data results keys:', Object.keys(electionData?.results || {}));
                }

                // Hot Fix Don't Remove!!!
                if (!electionData) {
                  console.log('Election data not ready, retrying...');
                  setTimeout(() => {
                    setSelectedYear(2016 as ElectionYear);
                    setTimeout(() => {
                      setSelectedYear(selectedYear as ElectionYear)
                    }, 100);
                  }, 100);
                }

                // Add election results to each feature
                data.features.forEach((feature: any) => {
                  const stateName = feature.properties.name;
                  const stateCode = stateAbbreviations[stateName];

                  if (electionData && stateCode) {
                    const result = electionData.results[stateCode];

                    if (result) {
                      // Find winner party name
                      const winnerPartyName = getWinnerPartyName(result, electionData.candidates, electionData.parties);
                      //console.log('party nameeeeeeeee1');
                      //console.log(winnerPartyName);
                      feature.properties.winner = winnerPartyName;
                      feature.properties.stateCode = stateCode;

                      // Get electoral votes if available
                      feature.properties.electoralVotes = (result as any).stateElectoralVote || (result as any).stateElectoralVotes || 0;
                    } else {
                      feature.properties.winner = 'Unknown';
                      feature.properties.stateCode = stateCode;
                    }
                  } else {
                    feature.properties.winner = 'Unknown';
                    feature.properties.stateCode = 'UNKNOWN';
                  }
                });

                // Update the source with the enriched data
                const source = map.current?.getSource('states') as mapboxgl.GeoJSONSource;
                if (source) {
                  console.log('Updating source with election data...');
                  source.setData(data);
                }

                // Add layers after data is updated
                if (map.current) {
                  // Add district layers FIRST (they will be below everything else)
                  map.current.addLayer({
                    id: 'districts-fill',
                    type: 'fill',
                    source: 'districts',
                    paint: {
                      'fill-color': getColorExpression(selectedType, selectedYear as ElectionYear),
                      'fill-opacity': 1.0
                    },
                    layout: {
                      'visibility': 'none'
                    }
                  });

                  map.current.addLayer({
                    id: 'districts-border',
                    type: 'line',
                    source: 'districts',
                    paint: {
                      'line-color': '#9CA3AF',
                      'line-width': 0.5
                    },
                    layout: {
                      'visibility': 'none'
                    }
                  });

                  console.log('Adding fill layer...');
                  // Add fill layer for states (ABOVE districts)
                  map.current.addLayer({
                    id: 'states-fill',
                    type: 'fill',
                    source: 'states',
                    paint: {
                      'fill-color': getColorExpression(selectedType, selectedYear as ElectionYear),
                      'fill-opacity': 1.0
                    }
                  });

                  console.log('Adding border layer...');
                  // Add border layer for states
                  map.current.addLayer({
                    id: 'states-border',
                    type: 'line',
                    source: 'states',
                    paint: {
                      'line-color': '#FFFFFF',
                      'line-width': 2
                    }
                  });

                  // Add grey states layer for when viewing counties
                  map.current.addLayer({
                    id: 'states-grey',
                    type: 'fill',
                    source: 'states',
                    paint: {
                      'fill-color': '#000000',
                      'fill-opacity': 0.3
                    },
                    layout: {
                      'visibility': 'none'
                    },
                    filter: ['!=', 'name', '']
                  });

                  // Add grey states border
                  map.current.addLayer({
                    id: 'states-grey-border',
                    type: 'line',
                    source: 'states',
                    paint: {
                      'line-color': '#888888',
                      'line-width': 1
                    },
                    layout: {
                      'visibility': 'none'
                    },
                    filter: ['!=', 'name', '']
                  });

                  // Add county layers (initially hidden)
                  map.current.addLayer({
                    id: 'counties-fill',
                    type: 'fill',
                    source: 'counties',
                    paint: {
                      'fill-color': getColorExpression(selectedType, selectedYear as ElectionYear),
                      'fill-opacity': 1.0
                    },
                    layout: {
                      'visibility': 'none'
                    }
                  });

                  map.current.addLayer({
                    id: 'counties-border',
                    type: 'line',
                    source: 'counties',
                    paint: {
                      'line-color': '#9CA3AF',
                      'line-width': 0.5
                    },
                    layout: {
                      'visibility': 'none'
                    }
                  });

                  // Add county highlight layer
                  map.current.addLayer({
                    id: 'counties-highlight',
                    type: 'line',
                    source: 'counties',
                    paint: {
                      'line-color': '#FFD700',
                      'line-width': 3
                    },
                    layout: {
                      'visibility': 'none'
                    },
                    filter: ['==', 'fips', '']
                  });

                  // Add district highlight layer
                  map.current.addLayer({
                    id: 'districts-highlight',
                    type: 'line',
                    source: 'districts',
                    paint: {
                      'line-color': '#FFD700',
                      'line-width': 3
                    },
                    layout: {
                      'visibility': 'none'
                    },
                    filter: ['==', 'geoid', '']
                  });                

                  // Add highlight layer for selected state
                  map.current.addLayer({
                    id: 'states-highlight',
                    type: 'line',
                    source: 'states',
                    paint: {
                      'line-color': '#FFD700',
                      'line-width': 4
                    },
                    filter: ['==', 'name', '']
                  });

                  // Mark layers as ready - opacity can now be applied
                  console.log('✅ All election layers created and ready');
                  setLayersReady(true);

                  // Add click effects
                  map.current.on('click', 'states-fill', (e) => {
                    if (map.current) {
                      // Pass the complete feature data
                      onStateClick({
                        ...e,
                        featureData: e.features?.[0]?.properties || {}
                      });
                    }
                  });

                  // Add click handler for grey states when viewing counties
                  map.current.on('click', 'states-grey', (e) => {
                    if (map.current && e.features && e.features.length > 0) {
                      const feature = e.features[0];
                      const stateName = feature.properties?.name;
                      const stateCode = feature.properties?.stateCode;

                      // Query the full feature from the 'states' source to get complete geometry
                      const statesSource = map.current.getSource('states') as mapboxgl.GeoJSONSource;
                      if (statesSource && statesSource._data) {
                        const sourceData = statesSource._data as any;
                        const fullFeature = sourceData.features?.find((f: any) => f.properties?.name === stateName);

                        if (fullFeature) {
                          setTimeout(() => {
                            if (map.current) {
                              fitBoundsToFeature(map.current, fullFeature, { padding: 150 });
                            }
                          }, 1);
                        }
                      }

                      // Make the previously selected state grey and exclude the new state from grey
                      map.current.setFilter('states-grey', ['!=', 'name', stateName]);
                      map.current.setFilter('states-grey-border', ['!=', 'name', stateName]);

                      // Filter counties to show only those in the clicked state
                      const stateFilters = [
                        ['==', ['get', 'state_name'], stateName]
                      ];
                      
                      if (currentElectionType.current === 'house') {
                        // For house elections, show districts instead of counties
                        const districtFilters = [
                          ['==', ['get', 'state_id'], stateCode]
                        ];
                        
                        map.current.setLayoutProperty('districts-fill', 'visibility', 'visible');
                        map.current.setLayoutProperty('districts-border', 'visibility', 'visible');
                        map.current.setLayoutProperty('districts-highlight', 'visibility', 'none');
                        map.current.setFilter('districts-fill', districtFilters[0]);
                        map.current.setFilter('districts-border', districtFilters[0]);
                        map.current.setFilter('districts-highlight', ['==', 'geoid', '']);
                        
                        // Update district data with election results
                        console.log('ucd666666');
                        updateDistrictData(stateName, currentElectionType.current, currentElectionYear.current);
                      } else {
                        // For presidential/senate elections, show counties
                        map.current.setLayoutProperty('counties-fill', 'visibility', 'visible');
                        map.current.setLayoutProperty('counties-border', 'visibility', 'visible');
                        map.current.setLayoutProperty('counties-highlight', 'visibility', 'none');
                        console.log('hhhhhh2222');
                        map.current.setFilter('counties-fill', stateFilters[0]);
                        map.current.setFilter('counties-border', stateFilters[0]);
                        map.current.setFilter('counties-highlight', ['==', 'fips', '']);
                        
                        // Update county data with election results
                        console.log('ucd333333');
                        updateCountyData(stateName, currentElectionType.current, currentElectionYear.current);
                      }
                      
                      setZoomedStateName(stateName);
                      
                      // Pass the complete feature data
                      onStateClick({
                        ...e,
                        featureData: e.features?.[0]?.properties || {}
                      });
                    }
                  });

                  // Add double-click handler for zooming to state
                  map.current.on('dblclick', 'states-fill', (e) => {
                    if (map.current && e.features && e.features.length > 0) {                    
                      const feature = e.features[0];
                      const stateName = feature.properties?.name;
                      const stateCode = feature.properties?.stateCode;

                      console.log('Double-clicked state:', stateName);
                      console.log(feature.properties);

                      //use it only if you want to hardcode certain states
                      const flyTo: Record<string, { lng: number; lat: number; zoom: number }> = {
                        MTdeleted: {
                          lng: -109.7364,
                          lat: 46.6563,
                          zoom: 5.5
                        },
                        AKdeleted: {
                          lng: -153.5618,
                          lat: 61.9818,
                          zoom: 3.43
                        }
                      }

                      console.log(stateCode);
                      console.log(flyTo);
                      console.log(flyTo[stateCode]);
                      console.log('ffffffff');

                      if (flyTo[stateCode]) {
                        setTimeout(() => {
                          map.current?.flyTo({
                            center: [flyTo[stateCode].lng, flyTo[stateCode].lat],
                            zoom: flyTo[stateCode].zoom,
                            duration: 1500
                          });
                        }, 1);
                      }
                      else {
                        // Use the helper function to fit bounds
                        setTimeout(() => {
                          if (map.current) {
                            fitBoundsToFeature(map.current, feature, { padding: 150 });
                          }
                        }, 1);
                      }
                      
                      // Wait for the zoom animation to complete before switching layers
                      setTimeout(() => {
                        if (map.current) {
                          console.log('Switching to county view for:', stateName);
                          console.log('Current selectedType from props:', selectedType);
                          console.log('Current selectedYear from props:', selectedYear);
                          
                          // Hide states, show counties
                          map.current.setLayoutProperty('states-fill', 'visibility', 'none');
                          map.current.setLayoutProperty('states-border', 'visibility', 'none');
                          map.current.setLayoutProperty('states-grey', 'visibility', 'visible');
                          map.current.setLayoutProperty('states-grey-border', 'visibility', 'visible');
                          
                          // Filter grey states to exclude the selected state
                          map.current.setFilter('states-grey', ['!=', 'name', stateName]);
                          map.current.setFilter('states-grey-border', ['!=', 'name', stateName]);
                          
                          if (currentElectionType.current === 'house') {
                            // For house elections, show districts
                           console.log('Showing districts for House elections in state:', stateName);
                            map.current.setLayoutProperty('districts-fill', 'visibility', 'visible');
                            map.current.setLayoutProperty('districts-border', 'visibility', 'visible');
                            map.current.setLayoutProperty('districts-highlight', 'visibility', 'none');
                            
                           // Hide county layers
                           map.current.setLayoutProperty('counties-fill', 'visibility', 'none');
                           map.current.setLayoutProperty('counties-border', 'visibility', 'none');
                           map.current.setLayoutProperty('counties-highlight', 'visibility', 'none');
                            console.log('hhhhhh33333');
                            
                            const districtFilters = [
                              ['==', ['get', 'state_id'], stateCode]
                            ];
                            
                           console.log('Setting district filters for state:', stateName);
                            map.current.setFilter('districts-fill', districtFilters[0]);
                            map.current.setFilter('districts-border', districtFilters[0]);
                            map.current.setFilter('districts-highlight', ['==', 'geoid', '']);
                            
                            // Update district data with election results
                           console.log('Updating district data for:', stateName, currentElectionType.current, currentElectionYear.current);
                            updateDistrictData(stateName, currentElectionType.current, currentElectionYear.current);
                          } else {
                            // For presidential/senate elections, show counties
                            map.current.setLayoutProperty('counties-fill', 'visibility', 'visible');
                            map.current.setLayoutProperty('counties-border', 'visibility', 'visible');
                            map.current.setLayoutProperty('counties-highlight', 'visibility', 'none');
                            console.log('hhhhhh44444');
                            
                            const stateFilters = [
                              ['==', ['get', 'state_name'], stateName]
                            ];
                            
                            map.current.setFilter('counties-fill', stateFilters[0]);
                            map.current.setFilter('counties-border', stateFilters[0]);
                            map.current.setFilter('counties-highlight', ['==', 'fips', '']);
                            
                            // Update county data with election results
                            console.log('About to call updateCountyData with:', stateName, currentElectionType.current, currentElectionYear.current);
                            // Use the current props values directly to avoid closure issues
                            console.log('ucd44444');
                            updateCountyData(stateName, currentElectionType.current, currentElectionYear.current);
                          }
                        }
                      }, 100);

                      setIsZoomedToState(true);
                      setZoomedStateName(stateName);
                    }
                  });

                  // Add double-click handler for grey states - just prevent propagation
                  // The click handler will naturally fire twice and handle the state change
                  map.current.on('dblclick', 'states-grey', (e: mapboxgl.MapMouseEvent) => {
                    // Prevent event from propagating to other layers (like counties)
                    if (e.originalEvent) {
                      e.originalEvent.stopPropagation();
                    }
                  });

                  // Add click handler for counties
                  map.current.on('click', 'counties-fill', (e) => {
                    if (map.current && e.features && e.features.length > 0) {
                      const feature = e.features[0];
                      const fips = feature.properties?.fips;
                      
                      console.log('Clicked on county with FIPS:', fips);
                      console.log(feature);
                      
                      // Get county data and pass to state click handler
                      const countyData = getCountyElectionData(fips);
                      console.log(countyData);
                      if (countyData) {
                        // Highlight the clicked county
                        if (map.current.getLayer('counties-highlight')) {
                          map.current.setLayoutProperty('counties-highlight', 'visibility', 'visible');
                          map.current.setFilter('counties-highlight', ['==', 'fips', fips]);
                        }
                        
                        onStateClick({
                          ...e,
                          featureData: {
                            ...feature.properties,
                            ...countyData,
                            isCounty: true
                          }
                        });
                      }
                    }
                  });
                  
                  // Add click handler for districts
                  map.current.on('click', 'districts-fill', (e) => {
                    if (map.current && e.features && e.features.length > 0) {
                      // Check if we're viewing a specific state by checking if districts are filtered
                      const districtFilter = map.current.getFilter('districts-fill');
                      console.log('District click - current filter:', districtFilter);

                      // If there's no filter or filter is null (viewing all districts at state level), block the click
                      if (!districtFilter || districtFilter.length === 0) {
                        console.log('District click blocked - viewing state level (no filter)');
                        return;
                      }
                      const feature = e.features[0];
                      let geoid = feature.properties?.geo_id;
                      const orig_geoid = geoid;
                      if (geoid.slice(-2) === "00") {
                        geoid = geoid.slice(0, -2) + "01";
                      }

                      console.log('Clicked on district with GEOID:', geoid);
                      console.log('District properties:', feature.properties);

                      // Get district data and pass to state click handler
                      const districtData = getDistrictElectionDataFromCache(geoid);
                      console.log('getDistrictElectionDataFromCache');
                      console.log(districtData);
                      if (districtData) {
                        // Highlight the clicked district
                        if (map.current.getLayer('districts-highlight')) {
                          map.current.setLayoutProperty('districts-highlight', 'visibility', 'visible');
                          map.current.setFilter('districts-highlight', ['==', 'geo_id', orig_geoid]);
                        }

                        onStateClick({
                          ...e,
                          featureData: {
                            ...feature.properties,
                            ...districtData,
                            geoid: geoid,
                            districtName: districtData.districtName,
                            isDistrict: true
                          }
                        });
                      }
                    }
                  });

                  // Add hover cursor
                  map.current.on('mouseenter', 'states-fill', () => {
                    if (map.current) {
                      map.current.getCanvas().style.cursor = 'pointer';
                    }
                  });

                  map.current.on('mouseleave', 'states-fill', () => {
                    if (map.current) {
                      map.current.getCanvas().style.cursor = '';
                    }
                  });

                  // Add hover cursor for grey states
                  map.current.on('mouseenter', 'states-grey', () => {
                    if (map.current) {
                      map.current.getCanvas().style.cursor = 'pointer';
                    }
                  });

                  map.current.on('mouseleave', 'states-grey', () => {
                    if (map.current) {
                      map.current.getCanvas().style.cursor = '';
                    }
                  });

                  // Add hover cursor for counties
                  map.current.on('mouseenter', 'counties-fill', () => {
                    if (map.current) {
                      map.current.getCanvas().style.cursor = 'pointer';
                    }
                  });

                  map.current.on('mouseleave', 'counties-fill', () => {
                    if (map.current) {
                      map.current.getCanvas().style.cursor = '';
                    }
                  });
                  
                  // Add hover cursor for districts
                  map.current.on('mouseenter', 'districts-fill', () => {
                    if (map.current) {
                      map.current.getCanvas().style.cursor = 'pointer';
                    }
                  });

                  map.current.on('mouseleave', 'districts-fill', () => {
                    if (map.current) {
                      map.current.getCanvas().style.cursor = '';
                    }
                  });

                  console.log('Map setup complete!');

                  // Set map labels visibility
                  const visibility = showMapLabels ? 'visible' : 'none';
                  console.log(`MapContainer: Setting map labels visibility to: ${visibility}`);

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
                      if (map.current && map.current.getLayer(layerId)) {
                        map.current.setLayoutProperty(layerId, 'visibility', visibility);
                      }
                    } catch (e) {
                      // Layer doesn't exist in this style, skip
                    }
                  });

                  if (selectedState)
                    map.current.setFilter('states-highlight', ['==', 'name', selectedState]);
                }
              })
              .catch(error => {
                console.error('Error loading GeoJSON data:', error);
              });
          }
        };

        // Add the event listener
        map.current.on('sourcedata', handleSourceData);
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e.error?.message || 'Unknown Mapbox error');
      });

    } catch (error) {
      console.error('Error initializing map:', error instanceof Error ? error.message : 'Unknown error');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update projection when globe mode, projection type, or atmosphere changes
  useEffect(() => {
    if (!map.current) return;
    
    const projectionName = globeMode ? 'globe' : projection;
    
    const updateProjection = () => {
      if (!map.current) return;
      
      try {
        console.log(`MapContainer: Updating projection to: ${projectionName}`);
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
        console.error('MapContainer: Error setting projection:', error);
      }
    };
    
    // Wait for style to load before setting projection
    if (map.current.isStyleLoaded()) {
      updateProjection();
    } else {
      map.current.once('style.load', updateProjection);
    }
    
    return () => {
      // Clean up event listener if it was added
      if (map.current && !map.current.isStyleLoaded()) {
        map.current.off('style.load', updateProjection);
      }
    };
  }, [globeMode, projection, atmosphereEnabled]);

  // Note: We don't support dynamic map style changes in MapContainer
  // because changing the style destroys all election layers and event handlers.
  // The mapStyle is only used during initial map creation.
  // If you need to change the style, you must unmount and remount the component.

  // Function to get county election data
  const getCountyElectionData = React.useCallback((fips: string) => {
    // Use the ref to get the latest value
    const currentCountyElection = currentCountyElectionRef.current;

    console.log('getCountyElectionData called with FIPS:', fips);
    console.log('currentCountyElection:', currentCountyElection ? 'EXISTS' : 'NULL');

    if (!currentCountyElection) {
      console.error('currentCountyElection is null!');
      return null;
    }

    if (!currentCountyElection.results) {
      console.error('currentCountyElection.results is null!');
      return null;
    }

    console.log('Total counties in currentCountyElection:', Object.keys(currentCountyElection.results).length);
    const result = currentCountyElection.results[fips];
    console.log('County data for FIPS', fips, ':', result ? 'FOUND' : 'NOT FOUND');

    return result || null;
  }, []);

  // Function to get district election data from cache
  const getDistrictElectionDataFromCache = React.useCallback((geoid: string) => {
    // Use the ref to get the latest value
    const currentDistrictElection = currentDistrictElectionRef.current;

    console.log('getDistrictElectionDataFromCache called with GEOID:', geoid);
    console.log('currentDistrictElection:', currentDistrictElection ? 'EXISTS' : 'NULL');

    if (!currentDistrictElection) {
      console.error('currentDistrictElection is null!');
      return null;
    }

    if (!currentDistrictElection.results) {
      console.error('currentDistrictElection.results is null!');
      return null;
    }

    console.log('Total districts in currentDistrictElection:', Object.keys(currentDistrictElection.results).length);
    
    const result = currentDistrictElection.results[geoid];
    console.log('currentDistrictElection: ' + geoid);
    console.log(currentDistrictElection);
    console.log('District data for GEOID', geoid, ':', result ? 'FOUND' : 'NOT FOUND');

    return result || null;
  }, []);

  // Function to update county data with election results
  const updateCountyData = React.useCallback((stateName: string, selectedType: string, selectedYear: number, retryCount: number = 0) => {
    if (!map.current) return;

    // Use the ref to get the latest value
    const currentCountyElection = currentCountyElectionRef.current;

    console.log('=== UPDATING COUNTY DATA ===');
    console.log('State:', stateName);
    console.log('Type:', selectedType);
    console.log('Year:', selectedYear);
    console.log('currentCountyElection in updateCountyData:', currentCountyElection ? 'EXISTS' : 'NULL');
    if (currentCountyElection && currentCountyElection.results) {
      console.log('Has', Object.keys(currentCountyElection.results).length, 'counties in updateCountyData');
    }
    console.log('============================');

    const countySource = map.current.getSource('counties') as mapboxgl.GeoJSONSource;
    if (!countySource) return;

    // Check if county data is available, if not, retry after a delay
    //DC: this doesn't seem to work always!
    /*if (!currentCountyElection || !currentCountyElection.results) {
      if (retryCount < 10) { // Maximum 10 retries (5 seconds total)
        console.log(`County data not yet available, retrying in 500ms... (attempt ${retryCount + 1}/10)`);
        setTimeout(() => {
          updateCountyData(stateName, selectedType, selectedYear, retryCount + 1);
        }, 500);
      } else {
        console.error('County data failed to load after 10 attempts');
      }
      return;
    }*/

    // Use the currentCountyElection data
    const electionYearData = currentCountyElection;

    console.log('updateCountyData: electionYearData');
    console.log(electionYearData);

    // Fetch county GeoJSON data and update with election results
    fetch(GEOJSON_URLS.COUNTIES)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Fetched county GeoJSON data, updating with election results...');
        console.log('Current election type during update:', selectedType);
        console.log('Current year during update:', selectedYear);

        // Add election results to each county feature
        let foundCount = 0;
        let notFoundCount = 0;
        const stateCounties: any[] = [];

        data.features.forEach((feature: any) => {
          const fips = feature.properties.fips;
          const countyResult = electionYearData?.results[fips];

          if (feature.properties.state_name === stateName) {
            stateCounties.push({
              name: feature.properties.name,
              fips: fips,
              hasData: !!countyResult
            });
          }

          if (countyResult && electionYearData) {
            // Find the winner candidate
            let winnerPartyName = 'Unknown';
            for (const [candidateId, candidateResult] of Object.entries(countyResult)) {
              if (candidateId === 'stateElectoralVote' || candidateId === 'stateElectoralVotes') continue;
              const cr = candidateResult as any;
              if (cr.winner) {
                const candidateInfo = electionYearData.candidates[candidateId];
                if (candidateInfo) {
                  const partyInfo = electionYearData.parties[candidateInfo.party_code];
                  if (partyInfo) {
                    winnerPartyName = partyInfo.name;
                  }
                }
                break;
              }
            }

            feature.properties.winner = winnerPartyName;
            if (feature.properties.state_name === stateName) {
              foundCount++;
            }
          } else {
            feature.properties.winner = 'Unknown';
            if (feature.properties.state_name === stateName) {
              notFoundCount++;
            }
          }
        });

        console.log(`State ${stateName} county results:`);
        console.log(`  - Counties with data: ${foundCount}`);
        console.log(`  - Counties without data: ${notFoundCount}`);
        console.log(`  - Sample counties:`, stateCounties.slice(0, 5));

        console.log('Updated county data, setting source...');
        // Update the county source with the enriched data
        countySource.setData(data);

        // Force repaint of the counties layer
        if (map.current && map.current.getLayer('counties-fill')) {
          console.log('Forcing county layer repaint...');
          // Trigger a repaint by toggling a paint property
          const currentOpacity = map.current.getPaintProperty('counties-fill', 'fill-opacity') || 0.6;
          map.current.setPaintProperty('counties-fill', 'fill-opacity', currentOpacity);
        }
      })
      .catch(error => {
        console.error('Error updating county data:', error);
      });
  }, []);

  // Function to update ALL district data with election results (for state-level view)
  const updateAllDistrictsData = React.useCallback((selectedType: string, selectedYear: number, retryCount: number = 0) => {
    if (!map.current) return;

    // Use the ref to get the latest value
    const currentDistrictElection = currentDistrictElectionRef.current;

    console.log('=== UPDATING ALL DISTRICTS DATA ===');
    console.log('Type:', selectedType);
    console.log('Year:', selectedYear);
    console.log('currentDistrictElection in updateAllDistrictsData:', currentDistrictElection ? 'EXISTS' : 'NULL');
    if (currentDistrictElection && currentDistrictElection.results) {
      console.log('Has', Object.keys(currentDistrictElection.results).length, 'districts in updateAllDistrictsData');
    }
    console.log('====================================');

    const districtSource = map.current.getSource('districts') as mapboxgl.GeoJSONSource;
    if (!districtSource) {
      console.error('District source not found!');
      return;
    }

    // Check if district data is available, if not, retry after a delay
    if (!currentDistrictElection || !currentDistrictElection.results) {
      // If we're using synthetic data, districts aren't available - skip silently
      if (syntheticRaceData && syntheticRaceData.length > 0) {
        console.log('📊 Synthetic mode active - district data not available (state-level only)');
        return;
      }
      
      if (retryCount < 10) { // Maximum 10 retries (5 seconds total)
        console.log(`All districts data not yet available, retrying in 500ms... (attempt ${retryCount + 1}/10)`);
        setTimeout(() => {
          updateAllDistrictsData(selectedType, selectedYear, retryCount + 1);
        }, 500);
      } else {
        console.error('All districts data failed to load after 10 attempts');
      }
      return;
    }

    // Use the currentDistrictElection data
    const electionYearData = currentDistrictElection;

    // Fetch district GeoJSON data and update with election results
    fetch(GEOJSON_URLS.DISTRICTS)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Fetched ALL district GeoJSON data, updating with election results...');
        console.log('Total districts in data:', data.features.length);

        // Add election results to each district feature
        data.features.forEach((feature: any) => {
          let geoid = feature.properties.geo_id;
          if (geoid.slice(-2) === "00") {
            geoid = geoid.slice(0, -2) + "01";
          }
          const districtResult = electionYearData?.results[geoid];

          if (districtResult && electionYearData) {
            // Find the winner candidate
            let winnerPartyName = 'Unknown';
            for (const [candidateId, candidateResult] of Object.entries(districtResult)) {
              if (candidateId === 'stateElectoralVote' || candidateId === 'stateElectoralVotes') continue;
              const cr = candidateResult as any;
              if (cr.winner) {
                const candidateInfo = electionYearData.candidates[candidateId];
                if (candidateInfo) {
                  const partyInfo = electionYearData.parties[candidateInfo.party_code];
                  if (partyInfo) {
                    winnerPartyName = partyInfo.name;
                  }
                }
                break;
              }
            }

            feature.properties.winner = winnerPartyName;
          } else {
            feature.properties.winner = 'Unknown';
          }
        });

        console.log('Updated ALL district data, setting source...');
        // Update the district source with the enriched data
        districtSource.setData(data);
        console.log('All district source updated successfully');
      })
      .catch(error => {
        console.error('Error updating all district data:', error);
      });
  }, []);

  // Function to update district data with election results (for specific state)
  const updateDistrictData = React.useCallback((stateName: string, selectedType: string, selectedYear: number, retryCount: number = 0) => {
    if (!map.current) return;

    // Use the ref to get the latest value
    const currentDistrictElection = currentDistrictElectionRef.current;

    console.log('=== UPDATING DISTRICT DATA ===');
    console.log('State:', stateName);
    console.log('Type:', selectedType);
    console.log('Year:', selectedYear);
    console.log('currentDistrictElection in updateDistrictData:', currentDistrictElection ? 'EXISTS' : 'NULL');
    if (currentDistrictElection && currentDistrictElection.results) {
      console.log('Has', Object.keys(currentDistrictElection.results).length, 'districts in updateDistrictData');
    }
    console.log('===============================');

    const districtSource = map.current.getSource('districts') as mapboxgl.GeoJSONSource;
    if (!districtSource) {
      console.error('District source not found!');
      return;
    }

    // Check if district data is available, if not, retry after a delay
    if (!currentDistrictElection || !currentDistrictElection.results) {
      // If we're using synthetic data, districts aren't available - skip silently
      if (syntheticRaceData && syntheticRaceData.length > 0) {
        console.log('📊 Synthetic mode active - district data not available (state-level only)');
        return;
      }
      
      if (retryCount < 10) { // Maximum 10 retries (5 seconds total)
        console.log(`District data not yet available, retrying in 500ms... (attempt ${retryCount + 1}/10)`);
        setTimeout(() => {
          updateDistrictData(stateName, selectedType, selectedYear, retryCount + 1);
        }, 500);
      } else {
        console.error('District data failed to load after 10 attempts');
      }
      return;
    }

    // Use the currentDistrictElection data
    const electionYearData = currentDistrictElection;

    // Fetch district GeoJSON data and update with election results
    fetch(GEOJSON_URLS.DISTRICTS)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Fetched district GeoJSON data, updating with election results...');
        console.log('Current election type during update:', selectedType);
        console.log('Current year during update:', selectedYear);
        console.log('Total districts in data:', data.features.length);

        // Add election results to each district feature
        data.features.forEach((feature: any) => {
          let geoid = feature.properties.geo_id;
          if (geoid.slice(-2) === "00") {
            geoid = geoid.slice(0, -2) + "01";
          }
          const districtResult = electionYearData?.results[geoid];

          if (feature.properties.state_name === stateName) {
            console.log(`District ${geoid} (${feature.properties.name}): ${districtResult ? 'Found data' : 'No data'}`);
          }

          if (districtResult && electionYearData) {
            // Find the winner candidate
            let winnerPartyName = 'Unknown';
            for (const [candidateId, candidateResult] of Object.entries(districtResult)) {
              if (candidateId === 'stateElectoralVote' || candidateId === 'stateElectoralVotes') continue;
              const cr = candidateResult as any;
              if (cr.winner) {
                const candidateInfo = electionYearData.candidates[candidateId];
                if (candidateInfo) {
                  const partyInfo = electionYearData.parties[candidateInfo.party_code];
                  if (partyInfo) {
                    winnerPartyName = partyInfo.name;
                  }
                }
                break;
              }
            }

            feature.properties.winner = winnerPartyName;
          } else {
            feature.properties.winner = 'Unknown';
          }
        });

        console.log('Updated district data, setting source...');
        // Update the district source with the enriched data
        districtSource.setData(data);
        console.log('District source updated successfully');
      })
      .catch(error => {
        console.error('Error updating district data:', error);
      });
  }, []);

  // Update election data when it changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('states') as mapboxgl.GeoJSONSource;
    if (source) {
      // Get election data
      const electionData = currentElection;

      // Fetch the GeoJSON data again and update with new election results
      fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
        .then(response => response.json())
        .then(data => {
          // Add election results to each feature
          data.features.forEach((feature: any) => {
            const stateName = feature.properties.name;
            const stateCode = stateAbbreviations[stateName];

            if (electionData && stateCode) {
              const result = electionData.results[stateCode];

              if (result) {
                // Find winner party name
                const winnerPartyName = getWinnerPartyName(result, electionData.candidates, electionData.parties);
                feature.properties.winner = winnerPartyName;
                feature.properties.stateCode = stateCode;

                // Get electoral votes if available
                feature.properties.electoralVotes = (result as any).stateElectoralVote || (result as any).stateElectoralVotes || 0;
              } else {
                feature.properties.winner = 'Unknown';
                feature.properties.stateCode = stateCode;
              }
            } else {
              feature.properties.winner = 'Unknown';
              feature.properties.stateCode = 'UNKNOWN';
            }
          });

          // Update the source with the new data
          source.setData(data);
        })
        .catch(error => {
          console.error('Error updating election data:', error);
        });
    }

    console.log('🔄 Updating map layers for type/year change');

    // Update layer colors and opacity when election type or year changes
    if (map.current.getLayer('states-fill')) {
      map.current.setPaintProperty('states-fill', 'fill-color', getColorExpression(selectedType, selectedYear as ElectionYear));
      // Make state layer transparent for house elections at state level to show districts underneath
      if (selectedType === 'house' && !isZoomedToState) {
        map.current.setPaintProperty('states-fill', 'fill-opacity', 0.1);
        // Keep white state borders visible
        if (map.current.getLayer('states-border')) {
          map.current.setLayoutProperty('states-border', 'visibility', 'visible');
        }
        // Show districts layer underneath
        if (map.current.getLayer('districts-fill')) {
          map.current.setLayoutProperty('districts-fill', 'visibility', 'visible');
        }
        if (map.current.getLayer('districts-border')) {
          map.current.setLayoutProperty('districts-border', 'visibility', 'visible');
        }
        // Update ALL district data for state-level view
        updateAllDistrictsData(selectedType, selectedYear);
      } else {
        // Opacity for non-house election types is controlled by the electionMapOpacity prop
        // Ensure state borders are visible for non-house elections
        if (map.current.getLayer('states-border')) {
          map.current.setLayoutProperty('states-border', 'visibility', 'visible');
        }
        // Hide districts layer for non-house elections at state level
        if (selectedType !== 'house' && !isZoomedToState) {
          if (map.current.getLayer('districts-fill')) {
            map.current.setLayoutProperty('districts-fill', 'visibility', 'none');
          }
          if (map.current.getLayer('districts-border')) {
            map.current.setLayoutProperty('districts-border', 'visibility', 'none');
          }
        }
      }
    }
    else if (selectedType === 'house') {
      // Hot Fix Don't Remove!!!
      console.log('House states-fill layer not ready, retrying...');
      setTimeout(() => {
        setSelectedYear(2016 as ElectionYear);
        setTimeout(() => {
          setSelectedYear(selectedYear as ElectionYear)
        }, 100);
      }, 100);
    }
    
    if (map.current.getLayer('counties-fill')) {
      console.log('🔄 Updating counties-fill color expression');
      map.current.setPaintProperty('counties-fill', 'fill-color', getColorExpression(selectedType, selectedYear as ElectionYear));
    }
    if (map.current.getLayer('districts-fill')) {
      map.current.setPaintProperty('districts-fill', 'fill-color', getColorExpression(selectedType, selectedYear as ElectionYear));
    }

    // Update county data if we're currently viewing counties
    if (isZoomedToState && zoomedStateName) {
      console.log('🔄 Currently zoomed to state, updating data for:', zoomedStateName);
      if (selectedType === 'house') {
        updateDistrictData(zoomedStateName, selectedType, selectedYear);
      } else {
        console.log('🔄 Calling updateCountyData for new type/year');
        updateCountyData(zoomedStateName, selectedType, selectedYear);
      }
    }
  }, [mapLoaded, selectedType, selectedYear, currentElection, currentCountyElection, getColorExpression, updateCountyData, isZoomedToState, zoomedStateName]);

  // Update county data when selectedType or selectedYear changes
  useEffect(() => {
    console.log('🔄 Second effect - selectedType/selectedYear effect triggered:', selectedType, selectedYear);
    if (!map.current || !mapLoaded) return;

    // Update county data if we're currently viewing counties
    if (isZoomedToState && zoomedStateName) {
      console.log('🔄 Second effect - updating data for zoomed state:', zoomedStateName);
      if (selectedType === 'house') {
        updateDistrictData(zoomedStateName, selectedType, selectedYear);
      } else {
        console.log('🔄 Second effect - calling updateCountyData');
        updateCountyData(zoomedStateName, selectedType, selectedYear);
      }
    }
  }, [selectedType, selectedYear, mapLoaded, isZoomedToState, zoomedStateName, updateCountyData, currentCountyElection]);

  // Handle election type switching when zoomed to state
  useEffect(() => {
    if (!map.current || !mapLoaded || !isZoomedToState || !zoomedStateName) return;
    
    console.log('Election type switched while zoomed to state:', zoomedStateName, 'New type:', selectedType);
    
    // Get state code for the zoomed state
    const stateCode = stateAbbreviations[zoomedStateName];
    
    if (selectedType === 'house') {
      // Switch to districts
      console.log('Switching to districts for House elections');
      
      // Hide counties
      if (map.current.getLayer('counties-fill')) {
        map.current.setLayoutProperty('counties-fill', 'visibility', 'none');
      }
      if (map.current.getLayer('counties-border')) {
        map.current.setLayoutProperty('counties-border', 'visibility', 'none');
      }
      if (map.current.getLayer('counties-highlight')) {
        map.current.setLayoutProperty('counties-highlight', 'visibility', 'none');
        console.log('hhhhhh66666');
      }
      
      // Show districts
      if (map.current.getLayer('districts-fill')) {
        map.current.setLayoutProperty('districts-fill', 'visibility', 'visible');
        map.current.setLayoutProperty('districts-border', 'visibility', 'visible');
        map.current.setLayoutProperty('districts-highlight', 'visibility', 'none');
        
        // Filter districts for the current state
        const districtFilters = ['==', ['get', 'state_id'], stateCode];
        map.current.setFilter('districts-fill', districtFilters);
        map.current.setFilter('districts-border', districtFilters);
        map.current.setFilter('districts-highlight', ['==', 'geo_id', '']);
        
        // Update district data
        updateDistrictData(zoomedStateName, selectedType, selectedYear);
      }
      
      // Auto-select state data for House elections
      if (selectedState) {
        const stateCode2 = stateAbbreviations[selectedState];
        const electionData = currentElection;
        if (stateCode2 && electionData) {
          const stateData = {
            name: selectedState,
            properties: {
              name: selectedState,
              stateCode: stateCode2
            }
          };
          onStateClick({
            features: [stateData],
            featureData: null
          });
        }
      }
    } else {
      // Switch to counties for Presidential/Senate
      console.log('Switching to counties for Presidential/Senate elections');
      
      // Hide districts
      if (map.current.getLayer('districts-fill')) {
        map.current.setLayoutProperty('districts-fill', 'visibility', 'none');
      }
      if (map.current.getLayer('districts-border')) {
        map.current.setLayoutProperty('districts-border', 'visibility', 'none');
      }
      if (map.current.getLayer('districts-highlight')) {
        map.current.setLayoutProperty('districts-highlight', 'visibility', 'none');
      }
      
      // Show counties
      if (map.current.getLayer('counties-fill')) {
        map.current.setLayoutProperty('counties-fill', 'visibility', 'visible');
        map.current.setLayoutProperty('counties-border', 'visibility', 'visible');
        //map.current.setLayoutProperty('counties-highlight', 'visibility', 'none');
        console.log('hhhhhh777777');      
      
        // Auto-select state data for Presidential/Senate elections
        if (selectedState) {
          const stateCode = stateAbbreviations[selectedState];
          const electionData = currentElection;
          if (stateCode && electionData) {
            const stateData = {
              name: selectedState,
              properties: {
                name: selectedState,
                stateCode: stateCode
              }
            };
            onStateClick({
              features: [stateData],
              featureData: null
            });
          }
        }
        
        // Filter counties for the current state
        const stateFilters = ['==', ['get', 'state_name'], zoomedStateName];
        map.current.setFilter('counties-fill', stateFilters);
        map.current.setFilter('counties-border', stateFilters);
        //map.current.setFilter('counties-highlight', ['==', 'fips', '']);
        
        // Update county data
        console.log('🔄 Third effect - calling updateCountyData for type switch');
        updateCountyData(zoomedStateName, selectedType, selectedYear);
      }
    }
  }, [selectedType, mapLoaded, isZoomedToState, zoomedStateName, updateCountyData, currentCountyElection]);

  // Update highlight when selected state changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    console.log('aaaaaaaaa1');
    console.log('map.current exists:', !!map.current);
    
    const highlightLayer = map.current.getLayer('states-highlight');
    if (highlightLayer) {
      if (selectedState) {
        map.current.setFilter('states-highlight', ['==', 'name', selectedState]);
      } else {
        map.current.setFilter('states-highlight', ['==', 'name', '']);
      }
    }
  }, [selectedState, mapLoaded, selectedYear]);

  // Apply election map opacity to all election layers
  useEffect(() => {
    if (map.current && layersReady) {
      console.log('🎨 Applying election map opacity:', electionMapOpacity);
      const electionLayers = [
        { id: 'states-fill', type: 'fill' },
        { id: 'states-border', type: 'line' },
        { id: 'states-highlight', type: 'line' },
        { id: 'states-grey-border', type: 'line' },
        { id: 'counties-fill', type: 'fill' },
        { id: 'counties-border', type: 'line' },
        { id: 'districts-fill', type: 'fill' },
        { id: 'districts-border', type: 'line' }
      ];

      electionLayers.forEach(({ id, type }) => {
        if (map.current!.getLayer(id)) {
          if (type === 'fill') {
            map.current!.setPaintProperty(id, 'fill-opacity', electionMapOpacity);
          } else if (type === 'line') {
            map.current!.setPaintProperty(id, 'line-opacity', electionMapOpacity);
          }
        }
      });
    }
  }, [electionMapOpacity, layersReady]);

  return (
    <div className="relative w-full h-full min-h-screen">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: '100vh' }} />
      
      {/* Home Button - Hidden (controlled via MapView home button) */}
      {/* <button
        onClick={handleHomeClick}
        className={`absolute top-[3rem] z-40 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg hover:bg-white/60 dark:hover:bg-gray-800/60 p-3 rounded-lg shadow-xl border border-gray-200/30 dark:border-gray-600/30 transition-all duration-300 ease-in-out ${
          sidebarVisible ? 'left-[21rem]' : 'left-[1em]'
        }`}
        title="Reset map view"
        aria-label="Reset map to original view"
      >
        <Home className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button> */}
      
      {/* Coordinates Display */}
      <div className={`hidden absolute bottom-[3rem] z-40 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg px-3 py-2 rounded-lg shadow-xl border border-gray-200/30 dark:border-gray-600/30 text-sm font-mono text-gray-900 dark:text-gray-100 transition-all duration-300 ease-in-out ${
          sidebarVisible ? 'left-[8.5rem]' : 'left-[8.5rem]'
        }`}
      >
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-gray-900 dark:text-gray-100">Loading map...</div>
        </div>
      )}

      {/* Debug Dialog */}
      <Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map Debug Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Selected Type & Year:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify({ selectedType, selectedYear }, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Synthetic Race Data (Raw):</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-48">
                {JSON.stringify(syntheticRaceData, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Current Election (Prop):</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-48">
                {currentElection ? JSON.stringify({
                  hasResults: !!currentElection.results,
                  resultsKeys: currentElection.results ? Object.keys(currentElection.results) : [],
                  hasCandidates: !!currentElection.candidates,
                  hasParties: !!currentElection.parties,
                  partiesData: currentElection.parties,
                  sampleResults: currentElection.results ? Object.entries(currentElection.results).slice(0, 3) : []
                }, null, 2) : 'NULL'}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Transformed Synthetic Data:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-48">
                {syntheticRaceData && syntheticRaceData.length > 0 
                  ? '(Transformed async - check currentElection above)'
                  : 'No synthetic data'}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Map States Source Data:</h3>
              <p className="text-sm text-gray-600 mb-2">
                This shows whether the map's 'states' source has been updated with election data.
              </p>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-48">
                {map.current && map.current.getSource('states') 
                  ? 'States source exists'
                  : 'States source NOT loaded yet'}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Color Expression:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-48">
                {JSON.stringify(getColorExpression(selectedType, selectedYear as ElectionYear), null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}