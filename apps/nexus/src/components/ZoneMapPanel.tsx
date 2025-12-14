import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ZoomIn, ZoomOut, Maximize2, Info, Plane, Coffee, ShoppingBag, Shield, Users, Package, Map as MapIcon, Satellite, Moon, Sun, Edit3, Save, X } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';

mapboxgl.accessToken = 'pk.eyJ1IjoiZW1lcmdlbnRzb2x1dGlvbnMiLCJhIjoiY21mbGJuanZ1MDNhdDJqcTU1cHVjcWJycCJ9.Tk2txI10-WExxSoPnHlu_g';

interface ZoneArea {
  id: string;
  name: string;
  type: 'gate' | 'security' | 'immigration' | 'baggage' | 'retail' | 'food' | 'lounge';
  coordinates: [number, number]; // [lng, lat]
  polygon?: [number, number][]; // For zone boundaries
  color: string;
  icon: any;
  label: string; // Add a label for logging purposes
}

// Newark Terminal A approximate coordinates
const NEWARK_TERMINAL_A = {
  center: [-74.1855391031648, 40.68366429526537] as [number, number],
  zoom: 16.01129750454523
};

// Zone data with real geographic coordinates around Newark Terminal A
const zoneAreas: ZoneArea[] = [
  // Gates along the concourse (north to south)
  { 
    id: "gate-a10", 
    name: "Gate A10", 
    type: "gate", 
    coordinates: [-74.18313307899254, 40.68311492952006],
    polygon: [[-74.1687, 40.6906], [-74.1683, 40.6906], [-74.1683, 40.6904], [-74.1687, 40.6904], [-74.1687, 40.6906]],
    color: "#3b82f6", 
    icon: Plane,
    label: "Gate A10"
  },
  { 
    id: "gate-a11", 
    name: "Gate A11", 
    type: "gate", 
    coordinates: [-74.1854656380842, 40.684392413784934],
    polygon: [[-74.1687, 40.6903], [-74.1683, 40.6903], [-74.1683, 40.6901], [-74.1687, 40.6901], [-74.1687, 40.6903]],
    color: "#3b82f6", 
    icon: Plane,
    label: "Gate A11"
  },
  { 
    id: "gate-a12", 
    name: "Gate A12", 
    type: "gate", 
    coordinates: [-74.18381360372095, 40.68318779409395],
    polygon: [[-74.1687, 40.6900], [-74.1683, 40.6900], [-74.1683, 40.6898], [-74.1687, 40.6898], [-74.1687, 40.6900]],
    color: "#3b82f6", 
    icon: Plane,
    label: "Gate A12"
  },
  { 
    id: "gate-a13", 
    name: "Gate A13", 
    type: "gate", 
    coordinates: [-74.1849310932929, 40.68431871343532],
    polygon: [[-74.1673, 40.6906], [-74.1677, 40.6906], [-74.1677, 40.6904], [-74.1673, 40.6904], [-74.1673, 40.6906]],
    color: "#3b82f6", 
    icon: Plane,
    label: "Gate A13"
  },
  { 
    id: "gate-a14", 
    name: "Gate A14", 
    type: "gate", 
    coordinates: [-74.18382960705463, 40.684220446175175],
    polygon: [[-74.1673, 40.6903], [-74.1677, 40.6903], [-74.1677, 40.6901], [-74.1673, 40.6901], [-74.1673, 40.6903]],
    color: "#3b82f6", 
    icon: Plane,
    label: "Gate A14"
  },
  { 
    id: "gate-a15", 
    name: "Gate A15", 
    type: "gate", 
    coordinates: [-74.18596628992657, 40.683288769511734],
    polygon: [[-74.1673, 40.6900], [-74.1677, 40.6900], [-74.1677, 40.6898], [-74.1673, 40.6898], [-74.1673, 40.6900]],
    color: "#3b82f6", 
    icon: Plane,
    label: "Gate A15"
  },
  { 
    id: "gate-a16", 
    name: "Gate A16", 
    type: "gate", 
    coordinates: [-74.18527831804654, 40.68327194028609],
    polygon: [[-74.1687, 40.6897], [-74.1683, 40.6897], [-74.1683, 40.6895], [-74.1687, 40.6895], [-74.1687, 40.6897]],
    color: "#3b82f6", 
    icon: Plane,
    label: "Gate A16"
  },
  { 
    id: "gate-a17", 
    name: "Gate A17", 
    type: "gate", 
    coordinates: [-74.18459034616653, 40.68323828182196],
    polygon: [[-74.1673, 40.6897], [-74.1677, 40.6897], [-74.1677, 40.6895], [-74.1673, 40.6895], [-74.1673, 40.6897]],
    color: "#3b82f6", 
    icon: Plane,
    label: "Gate A17"
  },
  { 
    id: "gate-a18", 
    name: "Gate A18", 
    type: "gate", 
    coordinates: [-74.18441280503592, 40.68428168630794],
    polygon: [[-74.1673, 40.6894], [-74.1677, 40.6894], [-74.1677, 40.6892], [-74.1673, 40.6892], [-74.1673, 40.6894]],
    color: "#3b82f6", 
    icon: Plane,
    label: "Gate A18"
  },
  
  // Central amenities
  { 
    id: "security-a", 
    name: "Security Checkpoint", 
    type: "security", 
    coordinates: [-74.1879925771007, 40.68392564352661],
    polygon: [[-74.1682, 40.6909], [-74.1678, 40.6909], [-74.1678, 40.6907], [-74.1682, 40.6907], [-74.1682, 40.6909]],
    color: "#ef4444", 
    icon: Shield,
    label: "Security Checkpoint"
  },
  { 
    id: "immigration-a", 
    name: "Immigration", 
    type: "immigration", 
    coordinates: [-74.18765241223333, 40.68336060147274],
    polygon: [[-74.1682, 40.6906], [-74.1678, 40.6906], [-74.1678, 40.6904], [-74.1682, 40.6904], [-74.1682, 40.6906]],
    color: "#8b5cf6", 
    icon: Users,
    label: "Immigration"
  },
  { 
    id: "food-court-a", 
    name: "Food Court", 
    type: "food", 
    coordinates: [-74.18669671093846, 40.683937926996606],
    polygon: [[-74.1682, 40.6903], [-74.1678, 40.6903], [-74.1678, 40.6899], [-74.1682, 40.6899], [-74.1682, 40.6903]],
    color: "#f59e0b", 
    icon: Coffee,
    label: "Food Court"
  },
  { 
    id: "retail-a", 
    name: "Duty Free", 
    type: "retail", 
    coordinates: [-74.18305905675741, 40.683675839669604],
    polygon: [[-74.1682, 40.6900], [-74.1678, 40.6900], [-74.1678, 40.6896], [-74.1682, 40.6896], [-74.1682, 40.6900]],
    color: "#06b6d4", 
    icon: ShoppingBag,
    label: "Duty Free"
  },
  { 
    id: "lounge-a", 
    name: "Premium Lounge", 
    type: "lounge", 
    coordinates: [-74.18534489881117, 40.68386095979699],
    polygon: [[-74.1683, 40.6896], [-74.1677, 40.6896], [-74.1677, 40.6892], [-74.1683, 40.6892], [-74.1683, 40.6896]],
    color: "#84cc16", 
    icon: Coffee,
    label: "Premium Lounge"
  },
  { 
    id: "baggage-a", 
    name: "Baggage Claim", 
    type: "baggage", 
    coordinates: [-74.18415357359541, 40.68380280870514],
    polygon: [[-74.1683, 40.6892], [-74.1677, 40.6892], [-74.1677, 40.6888], [-74.1683, 40.6888], [-74.1683, 40.6892]],
    color: "#10b981", 
    icon: Package,
    label: "Baggage Claim"
  },
];

interface ZoneMapPanelProps {
  hoveredZone: string | null;
  selectedZone: string | null;
  onZoneClick: (zoneId: string) => void;
  onZoneNavigate?: (zoneId: string) => void; // New prop for map navigation
}

export function ZoneMapPanel({ hoveredZone, selectedZone, onZoneClick, onZoneNavigate }: ZoneMapPanelProps) {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'light' | 'dark' | 'satellite'>('light');
  const [isEditMode, setIsEditMode] = useState(false);
  const [customPositions, setCustomPositions] = useState<{ [key: string]: [number, number] }>({});
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [mapInfo, setMapInfo] = useState({
    center: { lng: 0, lat: 0 },
    zoom: 0,
    pitch: 0,
    bearing: 0
  });
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const markerElements = useRef<{ [key: string]: HTMLDivElement }>({});
  const isDragging = useRef<{ [key: string]: boolean }>({});
  const { theme } = useTheme();
  const { t } = useTranslation('zones');

  // Load saved positions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('zone-marker-positions');
    if (saved) {
      try {
        setCustomPositions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved positions:', e);
      }
    }
  }, []);

  // Map style URLs
  const getMapStyle = () => {
    switch (mapStyle) {
      case 'light':
        return 'mapbox://styles/mapbox/light-v11';
      case 'dark':
        return 'mapbox://styles/mapbox/dark-v11';
      case 'satellite':
        return 'mapbox://styles/mapbox/satellite-streets-v12';
      default:
        return 'mapbox://styles/mapbox/light-v11';
    }
  };

  // Get marker coordinates (custom or default)
  const getMarkerCoordinates = (area: ZoneArea): [number, number] => {
    return customPositions[area.id] || area.coordinates;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapStyle(),
      center: NEWARK_TERMINAL_A.center,
      zoom: NEWARK_TERMINAL_A.zoom,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Log initial map configuration
      console.log('🗺️ MAP CONFIGURATION:');
      console.log('Center Position:', map.current.getCenter());
      console.log('Zoom Level:', map.current.getZoom());
      console.log('Pitch:', map.current.getPitch());
      console.log('Bearing:', map.current.getBearing());
      console.log('---');

      // Create GeoJSON features for all zones
      const features = zoneAreas.map((area) => {
        const position = getMarkerCoordinates(area);
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: position
          },
          properties: {
            id: area.id,
            name: area.name,
            type: area.type,
            color: area.color,
            label: area.label
          }
        };
      });

      // Check if source already exists before adding
      if (!map.current.getSource('zones')) {
        // Add source for zone markers
        map.current.addSource('zones', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: features
          }
        });
      }

      // Check if layer already exists before adding
      if (!map.current.getLayer('zone-circles')) {
        // Add circle layer for markers
        map.current.addLayer({
          id: 'zone-circles',
          type: 'circle',
          source: 'zones',
          paint: {
            'circle-radius': 16,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 1
          }
        });
      }

      // Check if layer already exists before adding
      if (!map.current.getLayer('zone-labels')) {
        // Add text labels
        map.current.addLayer({
          id: 'zone-labels',
          type: 'symbol',
          source: 'zones',
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 10,
            'text-offset': [0, 2],
            'text-anchor': 'top'
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1
          }
        });
      }

      // Add click handler for markers
      map.current.on('click', 'zone-circles', (e) => {
        if (!e.features || e.features.length === 0) return;
        
        const feature = e.features[0];
        const areaId = feature.properties?.id;
        const areaType = feature.properties?.type;
        
        if (isEditMode) {
          e.preventDefault();
          return;
        }
        
        // All gate markers should navigate to the Gate Cluster zone
        if (areaType === 'gate') {
          if (onZoneNavigate) {
            onZoneNavigate('gate-a10-a18');
          } else {
            onZoneClick('gate-a10-a18');
          }
        } else if (areaId) {
          if (onZoneNavigate) {
            onZoneNavigate(areaId);
          } else {
            onZoneClick(areaId);
          }
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'zone-circles', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'zone-circles', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });

      // Log marker positions
      zoneAreas.forEach((area) => {
        const position = getMarkerCoordinates(area);
        console.log(`📍 ${area.label} Marker:`, {
          id: area.id,
          coordinates: position,
          lng: position[0],
          lat: position[1],
          color: area.color
        });
      });
    });

    // Add event listeners to log map changes
    map.current.on('move', () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      setMapInfo({
        center: { lng: center.lng, lat: center.lat },
        zoom: map.current.getZoom(),
        pitch: map.current.getPitch(),
        bearing: map.current.getBearing()
      });
      console.log('🔄 Map Moved - Center:', {
        lng: center.lng,
        lat: center.lat,
        zoom: map.current.getZoom()
      });
    });

    map.current.on('zoom', () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      setMapInfo({
        center: { lng: center.lng, lat: center.lat },
        zoom: map.current.getZoom(),
        pitch: map.current.getPitch(),
        bearing: map.current.getBearing()
      });
      console.log('🔍 Zoom Changed:', map.current.getZoom());
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map style when changed
  useEffect(() => {
    if (!map.current) return;
    map.current.setStyle(getMapStyle());
    
    // Re-add layers after style loads
    map.current.once('style.load', () => {
      if (!map.current) return;
      
      // Recreate GeoJSON features
      const features = zoneAreas.map((area) => {
        const position = getMarkerCoordinates(area);
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: position
          },
          properties: {
            id: area.id,
            name: area.name,
            type: area.type,
            color: area.color,
            label: area.label
          }
        };
      });

      // Add source for zone markers
      map.current.addSource('zones', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: features
        }
      });

      // Add circle layer for markers
      map.current.addLayer({
        id: 'zone-circles',
        type: 'circle',
        source: 'zones',
        paint: {
          'circle-radius': 16,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1
        }
      });

      // Add text labels
      map.current.addLayer({
        id: 'zone-labels',
        type: 'symbol',
        source: 'zones',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-offset': [0, 2],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      });
    });
  }, [mapStyle, customPositions]);

  // Handle edit mode toggle
  useEffect(() => {
    Object.entries(markers.current).forEach(([id, marker]) => {
      marker.setDraggable(isEditMode);
      const el = markerElements.current[id];
      if (el) {
        if (isEditMode) {
          el.style.cursor = 'move';
          el.style.border = '3px dashed yellow';
          // Store the original click handler and replace with a no-op in edit mode
          el.style.pointerEvents = 'auto';
          el.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
          };
        } else {
          el.style.cursor = 'pointer';
          el.style.border = '2px solid white';
          el.style.pointerEvents = 'auto';
          // Restore click functionality for navigation
          const area = zoneAreas.find(a => a.id === id);
          if (area) {
            el.onclick = () => {
              // All gate markers should navigate to the Gate Cluster zone
              if (area.type === 'gate') {
                if (onZoneNavigate) {
                  onZoneNavigate('gate-a10-a18');
                } else {
                  onZoneClick('gate-a10-a18');
                }
              } else {
                if (onZoneNavigate) {
                  onZoneNavigate(id);
                } else {
                  onZoneClick(id);
                }
              }
            };
          }
        }
      }
    });
  }, [isEditMode, onZoneClick, onZoneNavigate]);

  // Handle save positions
  const handleSavePositions = () => {
    localStorage.setItem('zone-marker-positions', JSON.stringify(customPositions));
    setIsEditMode(false);
    alert(t('mapPanel.saveSuccess'));
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    // Restore markers to saved or default positions
    zoneAreas.forEach((area) => {
      const marker = markers.current[area.id];
      if (marker) {
        const saved = localStorage.getItem('zone-marker-positions');
        const savedPositions = saved ? JSON.parse(saved) : {};
        const coords = savedPositions[area.id] || area.coordinates;
        marker.setLngLat(coords);
      }
    });
    setCustomPositions(() => {
      const saved = localStorage.getItem('zone-marker-positions');
      return saved ? JSON.parse(saved) : {};
    });
    setIsEditMode(false);
  };

  // Zoom controls
  const handleZoomIn = () => {
    map.current?.zoomIn();
  };

  const handleZoomOut = () => {
    map.current?.zoomOut();
  };

  const handleResetView = () => {
    map.current?.flyTo({
      center: NEWARK_TERMINAL_A.center,
      zoom: NEWARK_TERMINAL_A.zoom,
      pitch: 0,
      bearing: 0,
    });
  };

  // Copy to clipboard with fallback
  const copyToClipboard = (text: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => resolve(true))
          .catch(() => {
            // Fallback to legacy method
            fallbackCopyToClipboard(text, resolve);
          });
      } else {
        // Use fallback directly
        fallbackCopyToClipboard(text, resolve);
      }
    });
  };

  // Legacy clipboard copy method
  const fallbackCopyToClipboard = (text: string, callback: (success: boolean) => void) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      callback(successful);
    } catch (err) {
      console.error('Fallback copy failed:', err);
      document.body.removeChild(textArea);
      callback(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-900 dark:text-slate-100">{t('mapPanel.title')}</h2>
            <p className="text-slate-600 dark:text-slate-400">{t('mapPanel.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Edit Mode Controls */}
            {isEditMode ? (
              <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-1.5">
                <span className="text-yellow-800 dark:text-yellow-200 text-xs">{t('mapPanel.editModeHint')}</span>
                <button
                  onClick={handleSavePositions}
                  className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-xs"
                >
                  <Save className="w-3 h-3" />
                  {t('mapPanel.save')}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors text-xs"
                >
                  <X className="w-3 h-3" />
                  {t('mapPanel.cancel')}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="text-xs">{t('mapPanel.editPositions')}</span>
                </button>
              </>
            )}

            {/* Map Style Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setMapStyle('light')}
                className={`p-1.5 rounded transition-colors ${
                  mapStyle === 'light'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={t('mapPanel.lightMode')}
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMapStyle('dark')}
                className={`p-1.5 rounded transition-colors ${
                  mapStyle === 'dark'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={t('mapPanel.darkMode')}
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`p-1.5 rounded transition-colors ${
                  mapStyle === 'satellite'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={t('mapPanel.satelliteView')}
              >
                <Satellite className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative h-[600px]">
        {/* Map Container */}
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* Legend */}
        <div className="absolute bottom-4 start-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-lg max-w-xs z-10">
          <div className="text-slate-900 dark:text-slate-100 mb-2">{t('mapPanel.legend')}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#3b82f6" }}></div>
              <span className="text-slate-700 dark:text-slate-300 text-xs">{t('mapPanel.legendGates')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }}></div>
              <span className="text-slate-700 dark:text-slate-300 text-xs">{t('mapPanel.legendSecurity')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f59e0b" }}></div>
              <span className="text-slate-700 dark:text-slate-300 text-xs">{t('mapPanel.legendFood')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#06b6d4" }}></div>
              <span className="text-slate-700 dark:text-slate-300 text-xs">{t('mapPanel.legendRetail')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#84cc16" }}></div>
              <span className="text-slate-700 dark:text-slate-300 text-xs">{t('mapPanel.legendLounge')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#10b981" }}></div>
              <span className="text-slate-700 dark:text-slate-300 text-xs">{t('mapPanel.legendBaggage')}</span>
            </div>
          </div>
        </div>
        
        {/* Current Area Display */}
        {hoveredArea && !isEditMode && (
          <div className="absolute top-4 left-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 shadow-lg z-10">
            <div className="text-slate-900 dark:text-slate-100">
              {zoneAreas.find(a => a.id === hoveredArea)?.name}
            </div>
          </div>
        )}

        {/* Debug Info Panel */}
        {showDebugInfo && (
          <div className="absolute top-4 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-10 max-w-md max-h-[calc(100%-2rem)] overflow-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between">
              <h3 className="text-slate-900 dark:text-slate-100">{t('mapPanel.configTitle')}</h3>
              <button
                onClick={() => setShowDebugInfo(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Current Map Position */}
              <div className="space-y-2">
                <h4 className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Current View</h4>
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Longitude:</span>
                    <span className="text-slate-900 dark:text-slate-100">{mapInfo.center.lng.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Latitude:</span>
                    <span className="text-slate-900 dark:text-slate-100">{mapInfo.center.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Zoom:</span>
                    <span className="text-slate-900 dark:text-slate-100">{mapInfo.zoom.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Center:</span>
                    <span className="text-slate-900 dark:text-slate-100">[{mapInfo.center.lng.toFixed(4)}, {mapInfo.center.lat.toFixed(4)}]</span>
                  </div>
                </div>
              </div>

              {/* Marker Positions */}
              <div className="space-y-2">
                <h4 className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Marker Positions</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {zoneAreas.map((area) => {
                    const position = getMarkerCoordinates(area);
                    return (
                      <div key={area.id} className="bg-slate-50 dark:bg-slate-800 rounded p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: area.color }}
                          />
                          <span className="text-xs text-slate-900 dark:text-slate-100">{area.label}</span>
                        </div>
                        <div className="font-mono text-xs space-y-0.5 pl-5">
                          <div className="text-slate-600 dark:text-slate-400">
                            id: "{area.id}"
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            lng: {position[0].toFixed(6)}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            lat: {position[1].toFixed(6)}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            coords: [{position[0]}, {position[1]}]
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Copy Config Button */}
              <button
                onClick={async () => {
                  const config = {
                    center: [mapInfo.center.lng, mapInfo.center.lat],
                    zoom: mapInfo.zoom,
                    markers: Object.fromEntries(
                      zoneAreas.map(area => [
                        area.id,
                        getMarkerCoordinates(area)
                      ])
                    )
                  };
                  const success = await copyToClipboard(JSON.stringify(config, null, 2));
                  if (success) {
                    alert(t('mapPanel.copySuccess'));
                  } else {
                    alert(t('mapPanel.copyFailed'));
                  }
                }}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs"
              >
                {t('mapPanel.copyConfig')}
              </button>
            </div>
          </div>
        )}

        {/* Toggle Debug Button (when hidden) */}
        {!showDebugInfo && (
          <button
            onClick={() => setShowDebugInfo(true)}
            className="absolute top-4 right-4 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-10 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}