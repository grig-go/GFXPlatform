import { useState, useCallback, useMemo, useEffect } from 'react';
import { Input, Button, Label, Separator, Collapsible, CollapsibleContent, CollapsibleTrigger } from '@emergent-platform/ui';
import {
  MapPin, Search, Plus, Trash2, ChevronDown, ChevronRight,
  Globe, Navigation, Bookmark, Info,
  Clock, HelpCircle, Copy, Filter
} from 'lucide-react';
import { cn } from '@emergent-platform/ui';
import { KeyframableProperty } from './PropertiesPanel';
import { useMapboxStore } from '@/stores/mapboxStore';
import type {
  Element,
  MapStyle,
  MapProjection,
  MapMarker,
  MapMarkerTemplate,
  MapLocationKeyframe,
  MapSavedLocation,
  Keyframe,
  Animation,
} from '@emergent-platform/types';

// Property section component
function PropertySection({
  title,
  children,
  defaultOpen = true,
  info,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  info?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors">
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          {title}
        </div>
        {info && (
          <span title={info} className="cursor-help">
            <Info className="w-3 h-3 text-muted-foreground/50" />
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2 space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Built-in locations
const BUILT_IN_LOCATIONS: MapSavedLocation[] = [
  { id: 'nyc', name: 'New York City', lng: -74.006, lat: 40.7128, zoom: 12 },
  { id: 'la', name: 'Los Angeles', lng: -118.2437, lat: 34.0522, zoom: 12 },
  { id: 'chicago', name: 'Chicago', lng: -87.6298, lat: 41.8781, zoom: 12 },
  { id: 'miami', name: 'Miami', lng: -80.1918, lat: 25.7617, zoom: 12 },
  { id: 'seattle', name: 'Seattle', lng: -122.3321, lat: 47.6062, zoom: 12 },
  { id: 'london', name: 'London', lng: -0.1276, lat: 51.5074, zoom: 12 },
  { id: 'paris', name: 'Paris', lng: 2.3522, lat: 48.8566, zoom: 12 },
  { id: 'tokyo', name: 'Tokyo', lng: 139.6917, lat: 35.6895, zoom: 12 },
  { id: 'sydney', name: 'Sydney', lng: 151.2093, lat: -33.8688, zoom: 12 },
  { id: 'dubai', name: 'Dubai', lng: 55.2708, lat: 25.2048, zoom: 12 },
  { id: 'beijing', name: 'Beijing', lng: 116.4074, lat: 39.9042, zoom: 12 },
  { id: 'moscow', name: 'Moscow', lng: 37.6173, lat: 55.7558, zoom: 12 },
  { id: 'rio', name: 'Rio de Janeiro', lng: -43.1729, lat: -22.9068, zoom: 12 },
  { id: 'singapore', name: 'Singapore', lng: 103.8198, lat: 1.3521, zoom: 12 },
  { id: 'mumbai', name: 'Mumbai', lng: 72.8777, lat: 19.0760, zoom: 12 },
];

// Map style options
const MAP_STYLE_OPTIONS: { value: MapStyle; label: string; description: string }[] = [
  { value: 'dark', label: 'Dark', description: 'Dark theme, great for news' },
  { value: 'light', label: 'Light', description: 'Light theme, clean look' },
  { value: 'streets', label: 'Streets', description: 'Standard street map' },
  { value: 'outdoors', label: 'Outdoors', description: 'Terrain and trails' },
  { value: 'satellite', label: 'Satellite', description: 'Satellite imagery' },
  { value: 'satellite-streets', label: 'Satellite + Streets', description: 'Satellite with labels' },
  { value: 'navigation-day', label: 'Navigation Day', description: 'Clear navigation style' },
  { value: 'navigation-night', label: 'Navigation Night', description: 'Night navigation style' },
];

// Map projection options
const MAP_PROJECTION_OPTIONS: { value: MapProjection; label: string; description: string }[] = [
  { value: 'mercator', label: 'Mercator', description: 'Standard flat map' },
  { value: 'globe', label: 'Globe', description: '3D globe view' },
  { value: 'albers', label: 'Albers USA', description: 'USA-focused projection' },
  { value: 'equalEarth', label: 'Equal Earth', description: 'Equal area world map' },
  { value: 'equirectangular', label: 'Equirectangular', description: 'Simple latitude/longitude' },
  { value: 'naturalEarth', label: 'Natural Earth', description: 'Compromise projection' },
  { value: 'winkelTripel', label: 'Winkel Tripel', description: 'National Geographic style' },
];

// Default marker templates (exported for use in MapElement)
export const DEFAULT_MARKER_TEMPLATES: MapMarkerTemplate[] = [
  {
    id: 'weather-marker',
    name: 'Weather Location',
    width: 120,
    height: 80,
    anchorX: 0.5,
    anchorY: 1,
    elements: [
      {
        type: 'shape',
        offsetX: 0,
        offsetY: 0,
        width: 120,
        height: 60,
        shapeType: 'rectangle',
        fill: 'rgba(0,0,0,0.8)',
        cornerRadius: 8,
        zIndex: 0,
      },
      {
        type: 'icon',
        offsetX: 10,
        offsetY: 10,
        width: 40,
        height: 40,
        iconLibrary: 'weather',
        iconName: 'wi-day-sunny',
        iconColor: '#FFD700',
        iconSize: 32,
        zIndex: 1,
      },
      {
        type: 'text',
        offsetX: 55,
        offsetY: 12,
        text: '{{temperature}}',
        textColor: '#FFFFFF',
        fontSize: 20,
        fontWeight: 700,
        zIndex: 2,
      },
      {
        type: 'text',
        offsetX: 55,
        offsetY: 36,
        text: '{{city}}',
        textColor: '#AAAAAA',
        fontSize: 11,
        zIndex: 2,
      },
      {
        type: 'shape',
        offsetX: 55,
        offsetY: 65,
        width: 10,
        height: 15,
        shapeType: 'rectangle',
        fill: 'rgba(0,0,0,0.8)',
        zIndex: 0,
      },
    ],
  },
  {
    id: 'simple-pin',
    name: 'Simple Pin',
    width: 32,
    height: 40,
    anchorX: 0.5,
    anchorY: 1,
    elements: [
      {
        type: 'icon',
        offsetX: 0,
        offsetY: 0,
        width: 32,
        height: 40,
        iconLibrary: 'lucide',
        iconName: 'MapPin',
        iconColor: '#EF4444',
        iconSize: 32,
        zIndex: 1,
      },
    ],
  },
  {
    id: 'traffic-marker',
    name: 'Traffic/News Location',
    width: 100,
    height: 50,
    anchorX: 0.5,
    anchorY: 1,
    elements: [
      {
        type: 'shape',
        offsetX: 0,
        offsetY: 0,
        width: 100,
        height: 36,
        shapeType: 'rectangle',
        fill: '#DC2626',
        cornerRadius: 6,
        zIndex: 0,
      },
      {
        type: 'text',
        offsetX: 10,
        offsetY: 8,
        text: '{{label}}',
        textColor: '#FFFFFF',
        fontSize: 14,
        fontWeight: 600,
        zIndex: 1,
      },
      {
        type: 'shape',
        offsetX: 40,
        offsetY: 36,
        width: 20,
        height: 14,
        shapeType: 'rectangle',
        fill: '#DC2626',
        zIndex: 0,
      },
    ],
  },
];

interface MapPropertiesPanelProps {
  element: Element;
  updateContent: (updates: Record<string, unknown>) => void;
  selectedKeyframe: Keyframe | null;
  currentAnimation: Animation | null;
}

// Map Content Editor - Location properties for Content tab
export function MapContentEditor({ element, updateContent, selectedKeyframe, currentAnimation }: MapPropertiesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MapSavedLocation[]>([]);
  const [newMarkerName, setNewMarkerName] = useState('');

  // Get Mapbox API key from store
  const mapboxKey = useMapboxStore((state) => state.apiKey);
  const fetchMapboxKey = useMapboxStore((state) => state.fetchApiKey);

  // Fetch Mapbox key on mount
  useEffect(() => {
    fetchMapboxKey();
  }, [fetchMapboxKey]);

  // Get map content with type safety
  const mapContent = element.content as {
    type: 'map';
    center: [number, number];
    zoom: number;
    pitch?: number;
    bearing?: number;
    mapStyle?: MapStyle;
    projection?: MapProjection;
    markers?: MapMarker[];
    markerTemplates?: MapMarkerTemplate[];
    locationKeyframes?: MapLocationKeyframe[];
    savedLocations?: MapSavedLocation[];
    animateLocation?: boolean;
    animationDuration?: number;
    animationEasing?: string;
  };

  // Get all saved locations (built-in + custom)
  const allSavedLocations = useMemo(() => {
    const custom = mapContent.savedLocations || [];
    return [...BUILT_IN_LOCATIONS, ...custom];
  }, [mapContent.savedLocations]);

  // Search for location using Mapbox Geocoding API
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use Mapbox Geocoding API with key from store
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxKey}&limit=5`
      );
      const data = await response.json();

      if (data.features) {
        const results: MapSavedLocation[] = data.features.map((feature: any, index: number) => ({
          id: `search-${index}`,
          name: feature.place_name,
          lng: feature.center[0],
          lat: feature.center[1],
          zoom: feature.bbox ? 10 : 14, // Larger areas get lower zoom
        }));
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [mapboxKey]);

  // Jump to location
  const goToLocation = useCallback((location: MapSavedLocation) => {
    updateContent({
      center: [location.lng, location.lat],
      zoom: location.zoom || mapContent.zoom,
      pitch: location.pitch ?? mapContent.pitch,
      bearing: location.bearing ?? mapContent.bearing,
    });
  }, [updateContent, mapContent.zoom, mapContent.pitch, mapContent.bearing]);

  // Save current location
  const saveCurrentLocation = useCallback((name: string) => {
    const newLocation: MapSavedLocation = {
      id: `custom-${Date.now()}`,
      name,
      lng: mapContent.center[0],
      lat: mapContent.center[1],
      zoom: mapContent.zoom,
      pitch: mapContent.pitch,
      bearing: mapContent.bearing,
    };
    const existing = mapContent.savedLocations || [];
    updateContent({ savedLocations: [...existing, newLocation] });
  }, [mapContent, updateContent]);

  // Add location keyframe
  const addLocationKeyframe = useCallback(() => {
    const newKeyframe: MapLocationKeyframe = {
      id: `keyframe-${Date.now()}`,
      time: (mapContent.locationKeyframes?.length || 0) * 2000, // 2 seconds apart
      lng: mapContent.center[0],
      lat: mapContent.center[1],
      zoom: mapContent.zoom,
      pitch: mapContent.pitch,
      bearing: mapContent.bearing,
      easing: 'ease-in-out',
      phase: 'in', // Default to IN phase
    };
    const existing = mapContent.locationKeyframes || [];
    updateContent({ locationKeyframes: [...existing, newKeyframe] });
  }, [mapContent, updateContent]);

  // Update keyframe location from search
  const updateKeyframeLocation = useCallback((keyframeId: string, location: MapSavedLocation) => {
    const existing = mapContent.locationKeyframes || [];
    updateContent({
      locationKeyframes: existing.map(k =>
        k.id === keyframeId
          ? {
              ...k,
              lng: location.lng,
              lat: location.lat,
              zoom: location.zoom || k.zoom,
              pitch: location.pitch ?? k.pitch,
              bearing: location.bearing ?? k.bearing,
              locationName: location.name,
            }
          : k
      ),
    });
  }, [mapContent.locationKeyframes, updateContent]);

  // State for per-keyframe location search
  const [keyframeSearchQuery, setKeyframeSearchQuery] = useState<Record<string, string>>({});
  const [keyframeSearchResults, setKeyframeSearchResults] = useState<Record<string, MapSavedLocation[]>>({});
  const [activeSearchKeyframeId, setActiveSearchKeyframeId] = useState<string | null>(null);

  // State for phase filter (null = show all)
  const [keyframePhaseFilter, setKeyframePhaseFilter] = useState<'in' | 'loop' | 'out' | null>(null);

  // Search for location for a specific keyframe
  const searchKeyframeLocation = useCallback(async (keyframeId: string, query: string) => {
    setKeyframeSearchQuery(prev => ({ ...prev, [keyframeId]: query }));

    if (!query.trim()) {
      setKeyframeSearchResults(prev => ({ ...prev, [keyframeId]: [] }));
      return;
    }

    try {
      // Use Mapbox Geocoding API with key from store
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxKey}&limit=5`
      );
      const data = await response.json();

      if (data.features) {
        const results: MapSavedLocation[] = data.features.map((feature: any, index: number) => ({
          id: `search-${index}`,
          name: feature.place_name,
          lng: feature.center[0],
          lat: feature.center[1],
          zoom: feature.bbox ? 10 : 14,
        }));
        setKeyframeSearchResults(prev => ({ ...prev, [keyframeId]: results }));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setKeyframeSearchResults(prev => ({ ...prev, [keyframeId]: [] }));
    }
  }, [mapboxKey]);

  // Remove keyframe
  const removeKeyframe = useCallback((keyframeId: string) => {
    const existing = mapContent.locationKeyframes || [];
    updateContent({ locationKeyframes: existing.filter(k => k.id !== keyframeId) });
  }, [mapContent.locationKeyframes, updateContent]);

  // Check if we have location keyframes - if so, hide the default location sections
  const hasLocationKeyframes = mapContent.locationKeyframes && mapContent.locationKeyframes.length > 0;

  return (
    <div className="space-y-3">
          {/* Search Location - hidden when keyframes exist */}
          {!hasLocationKeyframes && (
          <PropertySection title="Search Location" info="Search for any location by name, address, or coordinates">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search city, address, or coordinates..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchLocation(e.target.value);
                }}
                className="h-8 text-xs pl-8"
              />
            </div>
            {isSearching && (
              <p className="text-xs text-muted-foreground">Searching...</p>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      goToLocation(result);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted/50 transition-colors"
                  >
                    {result.name}
                  </button>
                ))}
              </div>
            )}
          </PropertySection>
          )}

          {/* Manual Coordinates - hidden when keyframes exist */}
          {!hasLocationKeyframes && (
          <PropertySection title="Coordinates" info="Enter exact longitude and latitude" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={mapContent.center[0]}
                  onChange={(e) => {
                    const lng = parseFloat(e.target.value) || 0;
                    updateContent({
                      center: [lng, mapContent.center[1]],
                    });
                  }}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={mapContent.center[1]}
                  onChange={(e) => {
                    const lat = parseFloat(e.target.value) || 0;
                    updateContent({
                      center: [mapContent.center[0], lat],
                    });
                  }}
                  className="h-7 text-xs"
                />
              </div>
            </div>
            {/* Combined keyframe control for center coordinates */}
            <div className="mt-2">
              <KeyframableProperty
                title="Center Position"
                propertyKey="mapCenter"
                elementId={element.id}
                selectedKeyframe={selectedKeyframe}
                currentAnimation={currentAnimation}
                currentValue={`${mapContent.center[0]},${mapContent.center[1]}`}
                onChange={(value) => {
                  if (typeof value === 'string') {
                    const [lng, lat] = value.split(',').map(v => parseFloat(v) || 0);
                    updateContent({
                      center: [lng, lat],
                    });
                  }
                }}
              >
                {(displayValue, onChange) => {
                  const [lng, lat] = typeof displayValue === 'string' 
                    ? displayValue.split(',').map(v => parseFloat(v) || 0)
                    : [mapContent.center[0], mapContent.center[1]];
                  return (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-[10px] text-muted-foreground">Longitude</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={lng}
                          onChange={(e) => {
                            const newLng = parseFloat(e.target.value) || 0;
                            onChange(`${newLng},${lat}`);
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[10px] text-muted-foreground">Latitude</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={lat}
                          onChange={(e) => {
                            const newLat = parseFloat(e.target.value) || 0;
                            onChange(`${lng},${newLat}`);
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  );
                }}
              </KeyframableProperty>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => {
                const coords = `${mapContent.center[1].toFixed(6)}, ${mapContent.center[0].toFixed(6)}`;
                navigator.clipboard.writeText(coords);
              }}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy Coordinates
            </Button>
          </PropertySection>
          )}

          {/* Camera Controls */}
          <PropertySection title="Camera" info="Adjust zoom, pitch (tilt), and bearing (rotation)" defaultOpen={false}>
            <div className="space-y-3">
              <KeyframableProperty
                title="Zoom"
                propertyKey="mapZoom"
                elementId={element.id}
                selectedKeyframe={selectedKeyframe}
                currentAnimation={currentAnimation}
                currentValue={mapContent.zoom}
                onChange={(value) => updateContent({ zoom: typeof value === 'number' ? value : parseFloat(String(value)) || 0 })}
              >
                {(displayValue, onChange) => {
                  const zoomValue = typeof displayValue === 'number' ? displayValue : parseFloat(String(displayValue)) || 0;
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-[10px] text-muted-foreground">Zoom</Label>
                        <span className="text-[10px] text-muted-foreground">{zoomValue.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="22"
                        step="0.5"
                        value={zoomValue}
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  );
                }}
              </KeyframableProperty>
              <KeyframableProperty
                title="Pitch (Tilt)"
                propertyKey="mapPitch"
                elementId={element.id}
                selectedKeyframe={selectedKeyframe}
                currentAnimation={currentAnimation}
                currentValue={mapContent.pitch || 0}
                onChange={(value) => updateContent({ pitch: typeof value === 'number' ? value : parseFloat(String(value)) || 0 })}
              >
                {(displayValue, onChange) => {
                  const pitchValue = typeof displayValue === 'number' ? displayValue : parseFloat(String(displayValue)) || 0;
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-[10px] text-muted-foreground">Pitch (Tilt)</Label>
                        <span className="text-[10px] text-muted-foreground">{pitchValue}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="85"
                        step="5"
                        value={pitchValue}
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  );
                }}
              </KeyframableProperty>
              <KeyframableProperty
                title="Bearing (Rotation)"
                propertyKey="mapBearing"
                elementId={element.id}
                selectedKeyframe={selectedKeyframe}
                currentAnimation={currentAnimation}
                currentValue={mapContent.bearing || 0}
                onChange={(value) => updateContent({ bearing: typeof value === 'number' ? value : parseFloat(String(value)) || 0 })}
              >
                {(displayValue, onChange) => {
                  const bearingValue = typeof displayValue === 'number' ? displayValue : parseFloat(String(displayValue)) || 0;
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-[10px] text-muted-foreground">Bearing (Rotation)</Label>
                        <span className="text-[10px] text-muted-foreground">{bearingValue}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="15"
                        value={bearingValue}
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  );
                }}
              </KeyframableProperty>
            </div>
          </PropertySection>

          {/* Quick Locations */}
          <PropertySection title="Quick Locations" info="Jump to saved locations" defaultOpen={false}>
            <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
              {allSavedLocations.slice(0, 15).map((loc) => (
                <Button
                  key={loc.id}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] px-2 justify-start"
                  onClick={() => goToLocation(loc)}
                >
                  {loc.name.split(',')[0].substring(0, 12)}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Save as..."
                value={newMarkerName}
                onChange={(e) => setNewMarkerName(e.target.value)}
                className="h-7 text-xs flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => {
                  if (newMarkerName.trim()) {
                    saveCurrentLocation(newMarkerName);
                    setNewMarkerName('');
                  }
                }}
                disabled={!newMarkerName.trim()}
              >
                <Bookmark className="w-3 h-3" />
              </Button>
            </div>
          </PropertySection>

          {/* Location Flight Path */}
          <PropertySection title="Flight Path Animation" info="Create a multi-location flight path. The map will fly through each keyframe during timeline playback.">
            <div className="space-y-3">
              {/* Info box */}
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-md">
                <p className="text-[10px] text-cyan-200">
                  <strong>How it works:</strong> Add keyframes at different locations. During playback, the map smoothly flies between locations based on the time values. First keyframe = "From", Last keyframe = "To".
                </p>
              </div>

              {/* Add Keyframe Button + Phase Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    Keyframes ({keyframePhaseFilter
                      ? `${mapContent.locationKeyframes?.filter(kf => (kf.phase || 'in') === keyframePhaseFilter).length || 0}/${mapContent.locationKeyframes?.length || 0}`
                      : mapContent.locationKeyframes?.length || 0})
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={addLocationKeyframe}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Current Location
                  </Button>
                </div>

                {/* Phase Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Filter:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setKeyframePhaseFilter(null)}
                      className={cn(
                        "px-2 py-0.5 text-[9px] rounded transition-colors",
                        keyframePhaseFilter === null
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setKeyframePhaseFilter('in')}
                      className={cn(
                        "px-2 py-0.5 text-[9px] rounded transition-colors",
                        keyframePhaseFilter === 'in'
                          ? "bg-emerald-500/30 text-emerald-300"
                          : "text-muted-foreground hover:text-emerald-400"
                      )}
                    >
                      IN
                    </button>
                    <button
                      onClick={() => setKeyframePhaseFilter('loop')}
                      className={cn(
                        "px-2 py-0.5 text-[9px] rounded transition-colors",
                        keyframePhaseFilter === 'loop'
                          ? "bg-violet-500/30 text-violet-300"
                          : "text-muted-foreground hover:text-violet-400"
                      )}
                    >
                      LOOP
                    </button>
                    <button
                      onClick={() => setKeyframePhaseFilter('out')}
                      className={cn(
                        "px-2 py-0.5 text-[9px] rounded transition-colors",
                        keyframePhaseFilter === 'out'
                          ? "bg-amber-500/30 text-amber-300"
                          : "text-muted-foreground hover:text-amber-400"
                      )}
                    >
                      OUT
                    </button>
                  </div>
                </div>
              </div>

              {/* Keyframes List */}
              {mapContent.locationKeyframes && mapContent.locationKeyframes.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {[...mapContent.locationKeyframes]
                    .filter((kf) => keyframePhaseFilter === null || (kf.phase || 'in') === keyframePhaseFilter)
                    .sort((a, b) => a.time - b.time)
                    .map((kf, index) => {
                      const phase = kf.phase || 'in';
                      const phaseColors = {
                        in: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
                        loop: { border: 'border-violet-500/50', bg: 'bg-violet-500/10', text: 'text-violet-400' },
                        out: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400' },
                      };
                      const colors = phaseColors[phase];

                      return (
                    <div
                      key={kf.id}
                      className={cn(
                        "p-2 rounded-md border transition-colors",
                        colors.border,
                        colors.bg
                      )}
                    >
                      {/* Header row with phase badge and actions */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {/* Phase selector */}
                          <select
                            value={phase}
                            onChange={(e) => {
                              const existing = mapContent.locationKeyframes || [];
                              updateContent({
                                locationKeyframes: existing.map(k =>
                                  k.id === kf.id ? { ...k, phase: e.target.value as 'in' | 'loop' | 'out' } : k
                                ),
                              });
                            }}
                            className={cn(
                              "h-5 text-[9px] font-medium rounded px-1.5 border-0",
                              phase === 'in' && "bg-emerald-500/30 text-emerald-300",
                              phase === 'loop' && "bg-violet-500/30 text-violet-300",
                              phase === 'out' && "bg-amber-500/30 text-amber-300"
                            )}
                          >
                            <option value="in">IN</option>
                            <option value="loop">LOOP</option>
                            <option value="out">OUT</option>
                          </select>
                          <span className="text-[10px] text-muted-foreground">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            title="Use current map location"
                            onClick={() => {
                              const existing = mapContent.locationKeyframes || [];
                              updateContent({
                                locationKeyframes: existing.map(k =>
                                  k.id === kf.id
                                    ? {
                                        ...k,
                                        lng: mapContent.center[0],
                                        lat: mapContent.center[1],
                                        zoom: mapContent.zoom,
                                        pitch: mapContent.pitch,
                                        bearing: mapContent.bearing,
                                        locationName: undefined,
                                      }
                                    : k
                                ),
                              });
                            }}
                          >
                            <MapPin className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            title="Go to this location"
                            onClick={() => goToLocation({
                              id: kf.id,
                              name: kf.locationName || `Keyframe ${index + 1}`,
                              lng: kf.lng,
                              lat: kf.lat,
                              zoom: kf.zoom,
                              pitch: kf.pitch,
                              bearing: kf.bearing,
                            })}
                          >
                            <Navigation className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-destructive"
                            title="Delete keyframe"
                            onClick={() => removeKeyframe(kf.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Location search/display */}
                      <div className="mb-2">
                        <div className="relative">
                          <Search className="absolute left-1.5 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          <Input
                            placeholder={kf.locationName || "Search location..."}
                            value={keyframeSearchQuery[kf.id] || ''}
                            onChange={(e) => searchKeyframeLocation(kf.id, e.target.value)}
                            onFocus={() => setActiveSearchKeyframeId(kf.id)}
                            className="h-6 text-[10px] pl-6"
                          />
                        </div>
                        {/* Search results dropdown */}
                        {activeSearchKeyframeId === kf.id && keyframeSearchResults[kf.id]?.length > 0 && (
                          <div className="mt-1 border border-border rounded-md bg-popover shadow-md z-10 max-h-24 overflow-y-auto">
                            {keyframeSearchResults[kf.id].map((result) => (
                              <button
                                key={result.id}
                                onClick={() => {
                                  updateKeyframeLocation(kf.id, result);
                                  setKeyframeSearchQuery(prev => ({ ...prev, [kf.id]: '' }));
                                  setKeyframeSearchResults(prev => ({ ...prev, [kf.id]: [] }));
                                  setActiveSearchKeyframeId(null);
                                }}
                                className="w-full text-left px-2 py-1 text-[10px] hover:bg-muted/50 transition-colors truncate"
                              >
                                {result.name}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Current location display */}
                        {kf.locationName && !keyframeSearchQuery[kf.id] && (
                          <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
                            {kf.locationName}
                          </p>
                        )}
                      </div>

                      {/* Time and settings row */}
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Time (s)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            value={(kf.time / 1000).toFixed(1)}
                            onChange={(e) => {
                              const newTime = parseFloat(e.target.value) * 1000 || 0;
                              const existing = mapContent.locationKeyframes || [];
                              updateContent({
                                locationKeyframes: existing.map(k =>
                                  k.id === kf.id ? { ...k, time: newTime } : k
                                ),
                              });
                            }}
                            className="h-6 text-[10px]"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Zoom</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="22"
                            value={kf.zoom.toFixed(1)}
                            onChange={(e) => {
                              const newZoom = parseFloat(e.target.value) || 10;
                              const existing = mapContent.locationKeyframes || [];
                              updateContent({
                                locationKeyframes: existing.map(k =>
                                  k.id === kf.id ? { ...k, zoom: newZoom } : k
                                ),
                              });
                            }}
                            className="h-6 text-[10px]"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Easing</Label>
                          <select
                            value={kf.easing || 'ease-in-out'}
                            onChange={(e) => {
                              const existing = mapContent.locationKeyframes || [];
                              updateContent({
                                locationKeyframes: existing.map(k =>
                                  k.id === kf.id ? { ...k, easing: e.target.value } : k
                                ),
                              });
                            }}
                            className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1"
                          >
                            <option value="linear">Linear</option>
                            <option value="ease-in">Ease In</option>
                            <option value="ease-out">Ease Out</option>
                            <option value="ease-in-out">Ease In-Out</option>
                          </select>
                        </div>
                      </div>

                      {/* Coordinates info */}
                      <div className="mt-1 text-[9px] text-muted-foreground">
                        {kf.lat.toFixed(4)}, {kf.lng.toFixed(4)}
                        {kf.pitch ? ` • ${kf.pitch}° pitch` : ''}
                        {kf.bearing ? ` • ${kf.bearing}° bearing` : ''}
                      </div>
                    </div>
                      );
                    })}
                </div>
              ) : (
                <div className="p-4 text-center border border-dashed border-muted-foreground/30 rounded-md">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-[10px] text-muted-foreground">
                    No keyframes yet.
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Position the map and click "Add Current Location" to create your first keyframe.
                  </p>
                </div>
              )}

              {/* Timeline info when we have 2+ keyframes */}
              {mapContent.locationKeyframes && mapContent.locationKeyframes.length >= 2 && (
                <div className="p-2 bg-muted/30 rounded-md">
                  <p className="text-[10px] text-muted-foreground">
                    <strong>Total duration:</strong>{' '}
                    {(Math.max(...mapContent.locationKeyframes.map(k => k.time)) / 1000).toFixed(1)}s
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Press Play in the timeline to preview the flight path.
                  </p>
                </div>
              )}
            </div>
          </PropertySection>
    </div>
  );
}

// Map Style Editor - Style properties for Style tab
export function MapStyleEditor({ element, updateContent, selectedKeyframe, currentAnimation }: MapPropertiesPanelProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Get map content with type safety
  const mapContent = element.content as {
    type: 'map';
    center: [number, number];
    zoom: number;
    pitch?: number;
    bearing?: number;
    mapStyle?: MapStyle;
    projection?: MapProjection;
    markers?: MapMarker[];
    markerTemplates?: MapMarkerTemplate[];
    locationKeyframes?: MapLocationKeyframe[];
    savedLocations?: MapSavedLocation[];
    animateLocation?: boolean;
    animationDuration?: number;
    animationEasing?: string;
  };

  // Get all marker templates (default + custom)
  const allMarkerTemplates = useMemo(() => {
    const custom = mapContent.markerTemplates || [];
    return [...DEFAULT_MARKER_TEMPLATES, ...custom];
  }, [mapContent.markerTemplates]);

  // Jump to location
  const goToLocation = useCallback((location: MapSavedLocation) => {
    updateContent({
      center: [location.lng, location.lat],
      zoom: location.zoom || mapContent.zoom,
      pitch: location.pitch ?? mapContent.pitch,
      bearing: location.bearing ?? mapContent.bearing,
    });
  }, [updateContent, mapContent.zoom, mapContent.pitch, mapContent.bearing]);

  // Add marker at current center
  const addMarker = useCallback((templateId?: string) => {
    const newMarker: MapMarker = {
      id: `marker-${Date.now()}`,
      lng: mapContent.center[0],
      lat: mapContent.center[1],
      templateId,
      color: templateId ? undefined : '#8B5CF6',
      visible: true,
    };
    const existing = mapContent.markers || [];
    updateContent({ markers: [...existing, newMarker] });
  }, [mapContent, updateContent]);

  // Remove marker
  const removeMarker = useCallback((markerId: string) => {
    const existing = mapContent.markers || [];
    updateContent({ markers: existing.filter(m => m.id !== markerId) });
  }, [mapContent.markers, updateContent]);

  return (
    <div className="space-y-3">
      {/* Map Style */}
      <PropertySection title="Map Theme" info="Visual style of the map">
        <div className="grid grid-cols-2 gap-1.5">
          {MAP_STYLE_OPTIONS.map((style) => (
            <Button
              key={style.value}
              variant={mapContent.mapStyle === style.value ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-[10px] justify-start"
              onClick={() => updateContent({ mapStyle: style.value })}
              title={style.description}
            >
              {style.label}
            </Button>
          ))}
        </div>
      </PropertySection>

      {/* Projection */}
      <PropertySection title="Projection" info="How the 3D earth is displayed on 2D">
        <div className="grid grid-cols-2 gap-1.5">
          {MAP_PROJECTION_OPTIONS.map((proj) => (
            <Button
              key={proj.value}
              variant={mapContent.projection === proj.value ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-[10px] justify-start"
              onClick={() => updateContent({ projection: proj.value })}
              title={proj.description}
            >
              {proj.value === 'globe' && <Globe className="w-3 h-3 mr-1" />}
              {proj.label}
            </Button>
          ))}
        </div>
      </PropertySection>

      <Separator className="my-3" />

      {/* Markers Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-medium">Markers</h3>
        </div>
        {/* Marker Templates Info */}
        <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-md mb-3">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-[10px] text-blue-200 space-y-1">
              <p className="font-medium">How to use Map Markers:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-200/80">
                <li>Choose a marker template (Weather, Pin, or Traffic)</li>
                <li>Click "Add Marker" to place it at the current map center</li>
                <li>Drag markers on the map to reposition them</li>
                <li>Use {'{{placeholder}}'} syntax in templates for dynamic data</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Add Marker */}
        <PropertySection title="Add Marker" defaultOpen>
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground">Select Template</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {allMarkerTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplateId(
                    selectedTemplateId === template.id ? null : template.id
                  )}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded border text-left transition-colors",
                    selectedTemplateId === template.id
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-border hover:bg-muted/30"
                  )}
                >
                  <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{template.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {template.width}x{template.height}px
                    </p>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setSelectedTemplateId(null)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded border text-left transition-colors",
                  selectedTemplateId === null
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-border hover:bg-muted/30"
                )}
              >
                <div className="w-6 h-6 bg-violet-500 rounded-full" />
                <div className="flex-1">
                  <p className="text-xs font-medium">Simple Dot</p>
                  <p className="text-[10px] text-muted-foreground">Basic colored marker</p>
                </div>
              </button>
            </div>
            <Button
              className="w-full"
              size="sm"
              onClick={() => addMarker(selectedTemplateId || undefined)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Marker at Center
            </Button>
          </div>
        </PropertySection>

        {/* Current Markers */}
        <PropertySection title={`Markers (${mapContent.markers?.length || 0})`}>
          {mapContent.markers && mapContent.markers.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {mapContent.markers.map((marker, index) => {
                const template = marker.templateId
                  ? allMarkerTemplates.find(t => t.id === marker.templateId)
                  : null;

                return (
                  <div
                    key={marker.id}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: marker.color || '#8B5CF6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">
                        {template?.name || `Marker ${index + 1}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => goToLocation({
                        id: marker.id,
                        name: template?.name || `Marker ${index + 1}`,
                        lng: marker.lng,
                        lat: marker.lat,
                      })}
                    >
                      <Navigation className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => removeMarker(marker.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No markers yet. Add your first marker above.
            </p>
          )}
        </PropertySection>
      </div>
    </div>
  );
}
