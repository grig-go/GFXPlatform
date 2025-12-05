import { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin, Search, Plus, Trash2, ChevronDown, ChevronRight,
  Globe, Navigation, Bookmark, Palette, Info,
  Clock, HelpCircle, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KeyframableProperty } from './PropertiesPanel';
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
} from '@/types';

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

export function MapPropertiesPanel({ element, updateContent, selectedKeyframe, currentAnimation }: MapPropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<'location' | 'style'>('location');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MapSavedLocation[]>([]);
  const [newMarkerName, setNewMarkerName] = useState('');
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

  // Get all saved locations (built-in + custom)
  const allSavedLocations = useMemo(() => {
    const custom = mapContent.savedLocations || [];
    return [...BUILT_IN_LOCATIONS, ...custom];
  }, [mapContent.savedLocations]);

  // Get all marker templates (default + custom)
  const allMarkerTemplates = useMemo(() => {
    const custom = mapContent.markerTemplates || [];
    return [...DEFAULT_MARKER_TEMPLATES, ...custom];
  }, [mapContent.markerTemplates]);

  // Search for location using Mapbox Geocoding API
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use Mapbox Geocoding API
      const mapboxKey = 'pk.eyJ1IjoiZW1lcmdlbnRzb2x1dGlvbnMiLCJhIjoiY21mbGJuanZ1MDNhdDJqcTU1cHVjcWJycCJ9.Tk2txI10-WExxSoPnHlu_g';
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
  }, []);

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

  // Update marker
  const updateMarker = useCallback((markerId: string, updates: Partial<MapMarker>) => {
    const existing = mapContent.markers || [];
    updateContent({
      markers: existing.map(m => m.id === markerId ? { ...m, ...updates } : m),
    });
  }, [mapContent.markers, updateContent]);

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
    };
    const existing = mapContent.locationKeyframes || [];
    updateContent({ locationKeyframes: [...existing, newKeyframe] });
  }, [mapContent, updateContent]);

  // Remove keyframe
  const removeKeyframe = useCallback((keyframeId: string) => {
    const existing = mapContent.locationKeyframes || [];
    updateContent({ locationKeyframes: existing.filter(k => k.id !== keyframeId) });
  }, [mapContent.locationKeyframes, updateContent]);

  return (
    <div className="space-y-3">
      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="location" className="text-xs gap-1">
            <Navigation className="w-3 h-3" />
            Location
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs gap-1">
            <Palette className="w-3 h-3" />
            Style
          </TabsTrigger>
        </TabsList>

        {/* Location Tab */}
        <TabsContent value="location" className="mt-3 space-y-3">
          {/* Search Location */}
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

          {/* Manual Coordinates */}
          <PropertySection title="Coordinates" info="Enter exact longitude and latitude">
            <div className="grid grid-cols-2 gap-2">
              <KeyframableProperty
                title="Longitude"
                propertyKey="mapCenterLng"
                elementId={element.id}
                selectedKeyframe={selectedKeyframe}
                currentAnimation={currentAnimation}
                currentValue={mapContent.center[0]}
                onChange={(value) => updateContent({
                  center: [typeof value === 'number' ? value : parseFloat(String(value)) || 0, mapContent.center[1]],
                })}
              >
                {(displayValue, onChange) => (
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Longitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={typeof displayValue === 'number' ? displayValue : parseFloat(String(displayValue)) || 0}
                      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </KeyframableProperty>
              <KeyframableProperty
                title="Latitude"
                propertyKey="mapCenterLat"
                elementId={element.id}
                selectedKeyframe={selectedKeyframe}
                currentAnimation={currentAnimation}
                currentValue={mapContent.center[1]}
                onChange={(value) => updateContent({
                  center: [mapContent.center[0], typeof value === 'number' ? value : parseFloat(String(value)) || 0],
                })}
              >
                {(displayValue, onChange) => (
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Latitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={typeof displayValue === 'number' ? displayValue : parseFloat(String(displayValue)) || 0}
                      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                  </div>
                )}
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

          {/* Camera Controls */}
          <PropertySection title="Camera" info="Adjust zoom, pitch (tilt), and bearing (rotation)">
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
          <PropertySection title="Quick Locations" info="Jump to saved locations">
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

          {/* Location Animation */}
          <PropertySection title="Location Animation" info="Animate map between locations over time">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={mapContent.animateLocation || false}
                  onChange={(e) => updateContent({ animateLocation: e.target.checked })}
                  className="rounded"
                />
                Enable location animation
              </label>

              {mapContent.animateLocation && (
                <>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Duration (ms)</Label>
                    <Input
                      type="number"
                      step="100"
                      min="500"
                      value={mapContent.animationDuration || 2000}
                      onChange={(e) => updateContent({ animationDuration: parseInt(e.target.value) || 2000 })}
                      className="h-7 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-muted-foreground">Easing</Label>
                    <select
                      value={mapContent.animationEasing || 'ease-in-out'}
                      onChange={(e) => updateContent({ animationEasing: e.target.value })}
                      className="w-full h-7 text-xs bg-muted border border-input rounded-md px-2"
                    >
                      <option value="linear">Linear</option>
                      <option value="ease">Ease</option>
                      <option value="ease-in">Ease In</option>
                      <option value="ease-out">Ease Out</option>
                      <option value="ease-in-out">Ease In-Out</option>
                    </select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground">Keyframes</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={addLocationKeyframe}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Current
                    </Button>
                  </div>

                  {mapContent.locationKeyframes && mapContent.locationKeyframes.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {mapContent.locationKeyframes.map((kf, index) => (
                        <div
                          key={kf.id}
                          className="flex items-center gap-2 p-1.5 bg-muted/30 rounded text-[10px]"
                        >
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="flex-1">
                            {(kf.time / 1000).toFixed(1)}s - Lat: {kf.lat.toFixed(2)}, Lng: {kf.lng.toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => goToLocation({
                              id: kf.id,
                              name: `Keyframe ${index + 1}`,
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
                            onClick={() => removeKeyframe(kf.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center py-2">
                      No keyframes yet. Position the map and click "Add Current" to create keyframes.
                    </p>
                  )}
                </>
              )}
            </div>
          </PropertySection>
        </TabsContent>

        {/* Style Tab */}
        <TabsContent value="style" className="mt-3 space-y-3">
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
          <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-md">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
