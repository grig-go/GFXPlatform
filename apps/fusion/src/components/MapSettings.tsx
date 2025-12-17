import { useState, useEffect } from 'react';
import { Settings, Crosshair, Save, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { toast } from 'sonner@2.0.3';
import { loadMapSettings, saveMapSettings, type MapSettings as MapSettingsType } from '../utils/mapSettingsApi';

interface MapSettingsProps {
  mapStyle: 'light' | 'dark' | 'satellite';
  showMapLabels: boolean;
  globeMode: boolean;
  atmosphereEnabled: boolean;
  projection: 'mercator' | 'albers' | 'equirectangular';
  electionMapOpacity?: number;
  onMapStyleChange: (style: 'light' | 'dark' | 'satellite') => void;
  onMapLabelsChange: (show: boolean) => void;
  onGlobeModeChange: (enabled: boolean) => void;
  onAtmosphereChange: (enabled: boolean) => void;
  onProjectionChange: (projection: 'mercator' | 'albers' | 'equirectangular') => void;
  onElectionMapOpacityChange?: (opacity: number) => void;
  onSavePosition: () => void;
  onResetPosition: (position: { latitude: number; longitude: number; zoom: number }) => void;
  onFetchCurrentPosition?: () => { latitude: number; longitude: number; zoom: number } | null;
  currentLatitude?: number;
  currentLongitude?: number;
  currentZoom?: number;
  onSettingsLoaded?: (settings: { latitude?: number; longitude?: number; zoom?: number }) => void;
  sidebarPosition?: 'left' | 'right';
}

export function MapSettings({ 
  mapStyle, 
  showMapLabels, 
  globeMode,
  atmosphereEnabled,
  projection,
  electionMapOpacity,
  onMapStyleChange, 
  onMapLabelsChange,
  onGlobeModeChange,
  onAtmosphereChange,
  onProjectionChange,
  onElectionMapOpacityChange,
  onSavePosition,
  onResetPosition,
  onFetchCurrentPosition,
  currentLatitude,
  currentLongitude,
  currentZoom,
  onSettingsLoaded,
  sidebarPosition
}: MapSettingsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Store loaded position from database (null until loaded from backend)
  const [defaultLatitude, setDefaultLatitude] = useState<number | null>(null);
  const [defaultLongitude, setDefaultLongitude] = useState<number | null>(null);
  const [defaultZoom, setDefaultZoom] = useState<number | null>(null);

  // Store fetched current position
  const [fetchedLatitude, setFetchedLatitude] = useState<number | undefined>(undefined);
  const [fetchedLongitude, setFetchedLongitude] = useState<number | undefined>(undefined);
  const [fetchedZoom, setFetchedZoom] = useState<number | undefined>(undefined);

  // Load settings on mount
  useEffect(() => {
    handleLoadSettings(true);
  }, []);

  // Reload settings when dialog opens
  useEffect(() => {
    if (open) {
      handleLoadSettings(false);
    }
  }, [open]);

  const handleLoadSettings = async (isInitialLoad: boolean = false) => {
    setLoading(true);
    try {
      const settings = await loadMapSettings();
      
      if (settings) {
        // Apply settings to component state
        if (settings.map_style) onMapStyleChange(settings.map_style as any);
        if (settings.show_map_labels !== undefined) onMapLabelsChange(settings.show_map_labels);
        if (settings.globe_mode !== undefined) onGlobeModeChange(settings.globe_mode);
        if (settings.projection_type) onProjectionChange(settings.projection_type as any);
        if (settings.atmosphere_enabled !== undefined) onAtmosphereChange(settings.atmosphere_enabled);
        if (settings.election_map_opacity !== undefined && onElectionMapOpacityChange) {
          onElectionMapOpacityChange(settings.election_map_opacity);
        }
        
        // Load default position from the database
        if (settings.default_latitude !== undefined && 
            settings.default_longitude !== undefined && 
            settings.default_zoom !== undefined) {
          setDefaultLatitude(settings.default_latitude);
          setDefaultLongitude(settings.default_longitude);
          setDefaultZoom(settings.default_zoom);
          
          // Only auto-restore position on initial app load
          if (isInitialLoad && onSettingsLoaded) {
            onSettingsLoaded({
              latitude: settings.default_latitude,
              longitude: settings.default_longitude,
              zoom: settings.default_zoom
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Use fetched values if available, otherwise use current props
      const latitudeToSave = fetchedLatitude !== undefined ? fetchedLatitude : currentLatitude;
      const longitudeToSave = fetchedLongitude !== undefined ? fetchedLongitude : currentLongitude;
      const zoomToSave = fetchedZoom !== undefined ? fetchedZoom : currentZoom;
      
      const settings: MapSettingsType = {
        map_style: mapStyle,
        projection_type: projection,
        show_map_labels: showMapLabels,
        globe_mode: globeMode,
        atmosphere_enabled: atmosphereEnabled,
        election_map_opacity: electionMapOpacity,
        default_latitude: latitudeToSave,
        default_longitude: longitudeToSave,
        default_zoom: zoomToSave,
      };

      const success = await saveMapSettings(settings);
      
      if (success) {
        // Update default position after save
        if (latitudeToSave !== undefined && longitudeToSave !== undefined && zoomToSave !== undefined) {
          setDefaultLatitude(latitudeToSave);
          setDefaultLongitude(longitudeToSave);
          setDefaultZoom(zoomToSave);
        }
        
        // Clear fetched values after successful save
        setFetchedLatitude(undefined);
        setFetchedLongitude(undefined);
        setFetchedZoom(undefined);
        
        toast.success('Settings and map position saved to cloud');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePosition = async () => {
    onSavePosition();
    // TODO: Save position to edge function
    toast.success('Position saved locally');
  };

  const handleResetPosition = async () => {
    // Pass the database default position to the reset handler
    if (onResetPosition && defaultLatitude !== null && defaultLongitude !== null && defaultZoom !== null) {
      onResetPosition({
        latitude: defaultLatitude,
        longitude: defaultLongitude,
        zoom: defaultZoom
      });
      toast.success('Map reset to saved position');
    } else {
      toast.error('Default position not loaded from backend');
    }
  };

  const handleFetchCurrentPosition = async () => {
    if (onFetchCurrentPosition) {
      const currentPosition = onFetchCurrentPosition();
      if (currentPosition) {
        toast.success(`Position: ${currentPosition.latitude.toFixed(4)}°, ${currentPosition.longitude.toFixed(4)}° @ ${currentPosition.zoom.toFixed(1)}x`);
        setFetchedLatitude(currentPosition.latitude);
        setFetchedLongitude(currentPosition.longitude);
        setFetchedZoom(currentPosition.zoom);
      } else {
        toast.error('Map position not available');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="bg-white hover:bg-gray-100 shadow-lg h-7 w-7"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className={`sm:max-w-[425px] fixed top-[50%] translate-y-[-50%] ${
        sidebarPosition === 'right' 
          ? 'left-4 right-auto translate-x-0' 
          : 'right-4 left-auto translate-x-0'
      }`}>
        <DialogHeader>
          <DialogTitle>Map Settings</DialogTitle>
          <DialogDescription>
            Customize your map appearance and save preferences to the cloud.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Map Projection Section */}
            <div className="space-y-3">
              <Label htmlFor="projection">Map Projection</Label>
              <Select 
                value={globeMode ? 'globe' : projection} 
                onValueChange={(value) => {
                  if (value === 'globe') {
                    onGlobeModeChange(true);
                  } else {
                    onGlobeModeChange(false);
                    onProjectionChange(value as any);
                  }
                }}
              >
                <SelectTrigger id="projection">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mercator">Mercator</SelectItem>
                  <SelectItem value="albers">Albers USA</SelectItem>
                  <SelectItem value="equirectangular">Equirectangular</SelectItem>
                  <SelectItem value="globe">Globe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Map Labels Section */}
            <div className="flex items-center justify-between">
              <Label htmlFor="map-labels" className="cursor-pointer">
                Map Labels
              </Label>
              <Switch
                id="map-labels"
                checked={showMapLabels}
                onCheckedChange={onMapLabelsChange}
              />
            </div>

            {/* Map Style Section */}
            <div className="space-y-3">
              <Label htmlFor="map-style">Map Style</Label>
              <Select value={mapStyle} onValueChange={(value) => onMapStyleChange(value as any)}>
                <SelectTrigger id="map-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Atmosphere Section (only show when in globe mode) */}
            {globeMode && (
              <div className="flex items-center justify-between">
                <Label htmlFor="atmosphere" className="cursor-pointer">
                  Atmosphere
                </Label>
                <Switch
                  id="atmosphere"
                  checked={atmosphereEnabled}
                  onCheckedChange={onAtmosphereChange}
                />
              </div>
            )}

            {/* Election Map Transparency Section */}
            {onElectionMapOpacityChange && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="election-opacity">Election Map Transparency</Label>
                  <span className="text-sm text-gray-600">{Math.round((electionMapOpacity || 1) * 100)}%</span>
                </div>
                <Slider
                  id="election-opacity"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[electionMapOpacity || 1]}
                  onValueChange={(value) => onElectionMapOpacityChange(value[0])}
                  className="w-full"
                />
              </div>
            )}

            {/* Divider */}
            <div className="border-t pt-4 space-y-3">
              <Label>Map Position</Label>
              
              {/* Current Position Display */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current:</span>
                  <span className="font-mono">
                    {fetchedLatitude !== undefined && fetchedLongitude !== undefined && fetchedZoom !== undefined
                      ? `${fetchedLatitude.toFixed(4)}°, ${fetchedLongitude.toFixed(4)}° @ ${fetchedZoom.toFixed(1)}x`
                      : 'Not fetched yet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Default:</span>
                  <span className="font-mono">
                    {defaultLatitude !== null && defaultLongitude !== null && defaultZoom !== null
                      ? `${defaultLatitude.toFixed(4)}°, ${defaultLongitude.toFixed(4)}° @ ${defaultZoom.toFixed(1)}x`
                      : 'Loading from backend...'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFetchCurrentPosition}
                  className="w-full justify-start"
                  disabled={currentLatitude === undefined}
                >
                  <Crosshair className="h-4 w-4 mr-2" />
                  Fetch Current Map Position
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPosition}
                  className="w-full justify-start"
                >
                  <Crosshair className="h-4 w-4 mr-2" />
                  Reset Map Position
                </Button>
              </div>
            </div>

            {/* Save Settings Button */}
            <div className="border-t pt-4">
              <Button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}