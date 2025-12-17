import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { InlineTextEdit } from "./InlineEditField";
import { WeatherLocationWithOverrides, WeatherView, getFieldValue, isFieldOverridden } from "../types/weather";
import { getTranslation, translateCountry } from "../utils/weather-translations";
import { WeatherBackendDataDialog } from "./WeatherBackendDataDialog";
import { getSupabaseAnonKey, getEdgeFunctionUrl } from "../utils/supabase/config";
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Snowflake, 
  Zap, 
  Wind, 
  Eye, 
  Thermometer,
  Droplets,
  Gauge,
  AlertTriangle,
  MapPin,
  Clock,
  Sunrise,
  Sunset,
  Moon,
  TreePine,
  Waves,
  MoreHorizontal,
  RefreshCw,
  Brain,
  Flower2,
  Anchor,
  Flame,
  Database,
  Trash2,
  ChevronDown,
  Tv,
  Check
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { motion } from "framer-motion";

interface WeatherCardProps {
  location: WeatherLocationWithOverrides;
  onUpdate: (updatedLocation: WeatherLocationWithOverrides) => void;
  onDelete?: (locationId: string, locationName: string) => void;
  onRefresh?: () => void;
  onAIInsights?: (locationId: string) => void;
  view: WeatherView;
  language?: string;
  providerTemperatureUnit?: string;
}

const getWeatherIcon = (icon: string, size: number = 24) => {
  // Normalize icon string to lowercase for matching
  const normalizedIcon = (icon || '').toLowerCase();
  
  // Map both icon codes and human-readable text to icons
  const iconMap: { [key: string]: JSX.Element } = {
    // Icon codes
    'clear-day': <Sun className={`w-6 h-6`} />,
    'clear-night': <Moon className={`w-6 h-6`} />,
    'partly-cloudy-day': <Cloud className={`w-6 h-6`} />,
    'partly-cloudy-night': <Cloud className={`w-6 h-6`} />,
    'cloudy': <Cloud className={`w-6 h-6`} />,
    'fog': <Cloud className={`w-6 h-6`} />,
    'wind': <Wind className={`w-6 h-6`} />,
    'rain': <CloudRain className={`w-6 h-6`} />,
    'sleet': <CloudRain className={`w-6 h-6`} />,
    'snow': <Snowflake className={`w-6 h-6`} />,
    'thunderstorm': <Zap className={`w-6 h-6`} />,
    
    // Human-readable text
    'sunny': <Sun className={`w-6 h-6`} />,
    'clear': <Sun className={`w-6 h-6`} />,
    'mostly sunny': <Sun className={`w-6 h-6`} />,
    'partly cloudy': <Cloud className={`w-6 h-6`} />,
    'mostly cloudy': <Cloud className={`w-6 h-6`} />,
    'overcast': <Cloud className={`w-6 h-6`} />,
    'rainy': <CloudRain className={`w-6 h-6`} />,
    'drizzle': <CloudRain className={`w-6 h-6`} />,
    'showers': <CloudRain className={`w-6 h-6`} />,
    'snowy': <Snowflake className={`w-6 h-6`} />,
    'thunderstorms': <Zap className={`w-6 h-6`} />,
    'windy': <Wind className={`w-6 h-6`} />,
    'foggy': <Cloud className={`w-6 h-6`} />,
    'haze': <Cloud className={`w-6 h-6`} />,
  };
  
  // Try exact match first
  if (iconMap[normalizedIcon]) {
    return iconMap[normalizedIcon];
  }
  
  // Try partial matches for more flexibility
  if (normalizedIcon.includes('sun') || normalizedIcon.includes('clear')) {
    return <Sun className={`w-6 h-6`} />;
  }
  if (normalizedIcon.includes('rain') || normalizedIcon.includes('shower')) {
    return <CloudRain className={`w-6 h-6`} />;
  }
  if (normalizedIcon.includes('snow')) {
    return <Snowflake className={`w-6 h-6`} />;
  }
  if (normalizedIcon.includes('thunder') || normalizedIcon.includes('storm')) {
    return <Zap className={`w-6 h-6`} />;
  }
  if (normalizedIcon.includes('wind')) {
    return <Wind className={`w-6 h-6`} />;
  }
  if (normalizedIcon.includes('cloud')) {
    return <Cloud className={`w-6 h-6`} />;
  }
  
  // Default fallback
  return <Cloud className={`w-6 h-6`} />;
};

const formatTime = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch {
    return timestamp;
  }
};

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString([], { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

export function WeatherCard({ location, onUpdate, onDelete, onRefresh, onAIInsights, view, language = "en", providerTemperatureUnit = "f" }: WeatherCardProps) {
  // State for refresh loading
  const [refreshing, setRefreshing] = useState(false);
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // State for alerts collapsible (collapsed by default)
  const [alertsOpen, setAlertsOpen] = useState(false);
  // State for backend data dialog
  const [backendDataOpen, setBackendDataOpen] = useState(false);
  // State for channel assignment dialog
  const [assignChannelOpen, setAssignChannelOpen] = useState(false);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [assigningChannel, setAssigningChannel] = useState(false);
  // State for multi-select channel assignments
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  
  // Get translations for current language
  const t = getTranslation(language);
  
  // Helper function to save custom location name to backend
  const saveCustomNameToBackend = async (customName: string | null) => {
    try {
      console.log(`🔵 FRONTEND: Saving custom name for location ${location.location.id}:`, customName);
      
      const response = await fetch(
        getEdgeFunctionUrl(`weather_dashboard/locations/${location.location.id}`),
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ custom_name: customName })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔴 FRONTEND: Save failed (HTTP ${response.status}):`, errorText);
        
        // Try to parse as JSON for structured error
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          // Not JSON, use text as-is if available
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log(`✅ FRONTEND: Saved successfully. Backend returned:`, result);
      
      // Refresh the card to show the updated name
      if (onRefresh) {
        console.log(`🔄 FRONTEND: Refreshing weather data to show updated name`);
        onRefresh();
      }
    } catch (error) {
      console.error(`🔴 FRONTEND: Error saving custom name:`, error);
      toast.error(`Failed to save changes: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Helper function to update location name (only supported override)
  const updateLocationField = (fieldName: 'name', newValue: any) => {
    const updatedLocation = { 
      ...location, 
      location: { ...location.location, name: newValue }
    };
    onUpdate(updatedLocation);
    
    // Check if this is a revert or a new override
    const isNowOverridden = isFieldOverridden(newValue);
    const currentOriginalName = isFieldOverridden(location.location.name) 
      ? location.location.name.originalValue 
      : location.location.name;
    const newDisplayName = isNowOverridden ? getFieldValue(newValue) : newValue;
    
    console.log(`🔵 FRONTEND: updateLocationField called:`, {
      fieldName,
      isNowOverridden,
      newValue,
      newDisplayName,
      currentOriginalName
    });
    
    // Save custom name to backend
    // If newDisplayName differs from original, it's a custom name
    // If they match, we're reverting (set to null)
    const customName = (isNowOverridden && newDisplayName !== currentOriginalName) ? newDisplayName : null;
    
    console.log(`🔵 FRONTEND: Saving custom name to backend:`, {
      customName,
      reasoning: customName ? 'User changed name' : 'Reverted to original or no change'
    });
    
    saveCustomNameToBackend(customName);
  };



  const handleRefreshLocation = async () => {
    const locationName = getFieldValue(location.location.name);
    const locationId = location.location.id;
    
    if (refreshing) return; // Prevent double-clicks
    
    try {
      setRefreshing(true);
      toast.info(`Refreshing weather data for ${locationName}...`);
      
      // Trigger a full dashboard refresh (weather_dashboard doesn't have single-location refresh yet)
      // The full weather-data endpoint will be called by the onRefresh callback
      if (onRefresh) {
        await onRefresh();
      }
      
      toast.success(`✅ Weather data refreshed for ${locationName}`);
    } catch (error) {
      console.error("Error refreshing weather data:", error);
      toast.error(`Failed to refresh weather data for ${locationName}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fallback to general refresh if available
      if (onRefresh) {
        onRefresh();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleAIInsights = () => {
    console.log('🧠 AI Insights clicked for location:', location.location.id);
    if (onAIInsights) {
      onAIInsights(location.location.id);
    } else {
      console.warn('No onAIInsights handler provided');
      toast.info("AI Insights feature coming soon!");
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      setDeleteDialogOpen(true);
    } else {
      toast.error("Delete function not available");
    }
  };
  
  const confirmDelete = () => {
    const locationName = getFieldValue(location.location.name);
    if (onDelete) {
      onDelete(location.location.id, locationName);
    }
    setDeleteDialogOpen(false);
  };

  const handleViewBackendData = () => {
    setBackendDataOpen(true);
  };

  const handleAssignChannel = async () => {
    console.log('📺 Assign Channel clicked for location:', location.location.id);
    setAssignChannelOpen(true);

    // Fetch channels when opening the dialog
    if (channels.length === 0) {
      await fetchChannels();
    }

    // Fetch current channel assignments for this location
    await fetchCurrentChannelAssignments();
  };

  const fetchCurrentChannelAssignments = async () => {
    try {
      console.log('📺 Fetching current channel assignments for location:', location.location.id);
      const response = await fetch(
        getEdgeFunctionUrl(`weather_dashboard/locations/${location.location.id}/channels`),
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Current channel assignments:', result);
        if (result.ok && result.channel_ids) {
          setSelectedChannelIds(result.channel_ids);
        }
      }
    } catch (error) {
      console.error('Error fetching channel assignments:', error);
      // Fall back to legacy single channel_id if junction table fails
      if (location.location.channel_id) {
        setSelectedChannelIds([location.location.channel_id]);
      }
    }
  };

  const fetchChannels = async () => {
    try {
      setLoadingChannels(true);
      console.log('📺 Fetching channels list...');
      
      const response = await fetch(
        getEdgeFunctionUrl('weather_dashboard/channels'),
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch channels (HTTP ${response.status}):`, errorText);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Fetched channels:', result);
      
      if (result.ok && result.channels) {
        setChannels(result.channels);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast.error(`Failed to fetch channels: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoadingChannels(false);
    }
  };

  // Toggle channel selection (for multi-select)
  const toggleChannelSelection = (channelId: string) => {
    setSelectedChannelIds(prev => {
      if (prev.includes(channelId)) {
        return prev.filter(id => id !== channelId);
      } else {
        return [...prev, channelId];
      }
    });
  };

  // Save multiple channel assignments
  const saveChannelAssignments = async () => {
    try {
      setAssigningChannel(true);
      const selectedNames = selectedChannelIds
        .map(id => channels.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      console.log(`🔗 Saving ${selectedChannelIds.length} channel(s) for location "${locationNameValue}":`, selectedChannelIds);
      toast.info(`Saving channel assignments for "${locationNameValue}"...`);

      const response = await fetch(
        getEdgeFunctionUrl(`weather_dashboard/locations/${location.location.id}`),
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ channel_ids: selectedChannelIds })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to save channel assignments (HTTP ${response.status}):`, errorText);
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Channel assignments saved successfully:', result);

      // Update local assigned channels state immediately
      const newAssignedChannels = selectedChannelIds
        .map(id => channels.find(c => c.id === id))
        .filter((ch): ch is { id: string; name: string } => ch !== undefined);
      setAssignedChannels(newAssignedChannels);

      if (selectedChannelIds.length === 0) {
        toast.success(`✅ Removed all channel assignments from "${locationNameValue}"`);
      } else if (selectedChannelIds.length === 1) {
        toast.success(`✅ Assigned "${selectedNames}" to "${locationNameValue}"`);
      } else {
        toast.success(`✅ Assigned ${selectedChannelIds.length} channels to "${locationNameValue}"`);
      }
      setAssignChannelOpen(false);

      // Refresh the card to show updated data
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error saving channel assignments:', error);
      toast.error(`Failed to save channel assignments: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setAssigningChannel(false);
    }
  };

  // Check if location has any overrides (only location name override supported)
  const hasOverrides = isFieldOverridden(location.location.name);

  const locationNameValue = getFieldValue(location.location.name);
  const admin1Value = getFieldValue(location.location.admin1);
  const countryValueRaw = getFieldValue(location.location.country);
  const countryValue = translateCountry(countryValueRaw, language);
  const temperatureValue = getFieldValue(location.data?.current?.temperature?.value);
  const temperatureUnit = getFieldValue(location.data?.current?.temperature?.unit);
  const summaryValue = getFieldValue(location.data?.current?.summary);
  const humidityValue = getFieldValue(location.data?.current?.humidity);
  const uvIndexValue = getFieldValue(location.data?.current?.uvIndex);

  // Fetch assigned channel names (supports multiple channels)
  const [assignedChannels, setAssignedChannels] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchAssignedChannels = async () => {
      try {
        // First try to fetch from the junction table
        const response = await fetch(
          getEdgeFunctionUrl(`weather_dashboard/locations/${location.location.id}/channels`),
          {
            headers: {
              Authorization: `Bearer ${getSupabaseAnonKey()}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.channels) {
            setAssignedChannels(data.channels);
            return;
          }
        }

        // Fall back to legacy single channel_id
        if (location.location.channel_id) {
          // Try to get channel name from already fetched channels
          const existingChannel = channels.find(c => c.id === location.location.channel_id);
          if (existingChannel) {
            setAssignedChannels([existingChannel]);
            return;
          }

          // Otherwise fetch all channels to find the name
          const channelsResponse = await fetch(
            getEdgeFunctionUrl('weather_dashboard/channels'),
            {
              headers: {
                Authorization: `Bearer ${getSupabaseAnonKey()}`,
              },
            }
          );

          if (channelsResponse.ok) {
            const channelsData = await channelsResponse.json();
            const channel = channelsData.channels?.find((ch: { id: string; name: string }) => ch.id === location.location.channel_id);
            if (channel) {
              setAssignedChannels([channel]);
            }
          }
        } else {
          setAssignedChannels([]);
        }
      } catch (error) {
        console.error('Error fetching assigned channels:', error);
        setAssignedChannels([]);
      }
    };

    fetchAssignedChannels();
  }, [location.location.id, location.location.channel_id, channels]);

  // Common dropdown menu component
  const renderDropdownMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 relative z-10">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleAIInsights}>
          <Brain className="mr-2 h-4 w-4" />
          {t.aiInsights}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRefreshLocation} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : t.refreshData}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleAssignChannel}>
          <Tv className="mr-2 h-4 w-4" />
          Assign Channel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleViewBackendData}>
          <Database className="mr-2 h-4 w-4" />
          View Backend Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          {t.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Common channel assignment dialog component (multi-select)
  const renderChannelDialog = () => {
    return (
      <Dialog open={assignChannelOpen} onOpenChange={setAssignChannelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Channels to {locationNameValue}</DialogTitle>
            <DialogDescription>
              Select one or more channels to assign to this weather location
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingChannels ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading channels...</p>
              </div>
            ) : channels.length === 0 ? (
              <div className="text-center py-8">
                <Tv className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No active channels found</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-72 overflow-y-auto border rounded-md p-2">
                  {channels.map((channel) => {
                    const isSelected = selectedChannelIds.includes(channel.id);
                    return (
                      <div
                        key={channel.id}
                        className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border border-primary'
                            : 'bg-muted/50 hover:bg-muted border border-transparent'
                        }`}
                        onClick={() => toggleChannelSelection(channel.id)}
                      >
                        <div className="flex items-center">
                          <Tv className="mr-3 h-4 w-4 text-muted-foreground" />
                          <span className={isSelected ? 'font-medium' : ''}>{channel.name}</span>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedChannelIds.length} channel{selectedChannelIds.length !== 1 ? 's' : ''} selected
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedChannelIds([])}
                      disabled={selectedChannelIds.length === 0 || assigningChannel}
                    >
                      Clear All
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveChannelAssignments}
                      disabled={assigningChannel}
                    >
                      {assigningChannel ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Render delete confirmation dialog (shared across all views)
  const renderDeleteDialog = () => (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete {locationNameValue}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will remove all data including current weather, air quality, hourly forecasts, daily forecasts, and weather alerts.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (view === 'current') {
    const tempValue = temperatureValue || 0;
    const isHot = tempValue > 85;
    const isCold = tempValue < 32;
    
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 group">
            {/* Animated background gradient on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            
            {/* Temperature-based pulse for extreme weather */}
            {(isHot || isCold) && (
              <motion.div
                className={`absolute inset-0 ${isHot ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <InlineTextEdit
                    field={location.location.name}
                    fieldName="Location Name"
                    onUpdate={(newName) => updateLocationField('name', newName)}
                  >
                    <h3 className="font-semibold">{locationNameValue}</h3>
                  </InlineTextEdit>
                  {assignedChannels.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <Badge
                        variant="outline"
                        className="text-xs bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                      >
                        <Tv className="h-3 w-3 mr-1" />
                        {assignedChannels[0].name}
                      </Badge>
                      {assignedChannels.length > 1 && (
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="text-xs bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 cursor-pointer"
                            >
                              +{assignedChannels.length - 1} more
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" sideOffset={5}>
                            <div className="space-y-1">
                              <p className="font-medium text-xs">All channels:</p>
                              {assignedChannels.map((ch) => (
                                <div key={ch.id} className="flex items-center gap-1 text-xs">
                                  <Tv className="h-3 w-3" />
                                  {ch.name}
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {admin1Value}, {countryValue}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getWeatherIcon(getFieldValue(location.data?.current?.summary), 32)}
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {temperatureValue}{temperatureUnit}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t.feelsLike} {getFieldValue(location.data?.current?.feelsLike?.value)}{getFieldValue(location.data?.current?.feelsLike?.unit)}
                </div>
              </div>
              {renderDropdownMenu()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-muted-foreground">{summaryValue}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Droplets className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t.humidity}</p>
                <p className="font-medium">{Math.round(humidityValue)}%</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <Sun className="w-4 h-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t.uvIndex}</p>
                <p className="font-medium">{uvIndexValue}</p>
              </div>
            </div>
          </div>

          {location.data?.alerts?.length > 0 && (
            <Collapsible open={alertsOpen} onOpenChange={setAlertsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-0 h-auto hover:bg-transparent">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-800">{t.activeAlerts}</span>
                    <Badge variant="destructive" className="text-xs">
                      {location.data.alerts.length}
                    </Badge>
                    <ChevronDown className={`w-4 h-4 text-red-500 transition-transform ${alertsOpen ? 'rotate-180' : ''}`} />
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 mt-2">
                  {location.data.alerts.slice(0, 2).map((alert, index) => (
                    <div key={index} className="text-xs text-red-700 bg-red-50 p-2 rounded">
                      <strong>{getFieldValue(alert.event)}</strong>: {getFieldValue(alert.headline)}
                    </div>
                  ))}
                  {location.data.alerts.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{location.data.alerts.length - 2} more alerts
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="text-xs text-muted-foreground mt-4 flex items-center justify-between">
            <span>{t.lastUpdated}: {location.data?.current?.asOf ? formatTime(getFieldValue(location.data.current.asOf)) : 'N/A'}</span>
            {location.location.provider_name && (
              <span className="text-muted-foreground/70">Provider: {location.location.provider_name}</span>
            )}
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />

      {renderDeleteDialog()}
      {renderChannelDialog()}
      </>
    );
  }

  if (view === 'hourly') {
    return (
      <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
      <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 group">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          initial={false}
        />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <InlineTextEdit
                    field={location.location.name}
                    fieldName="Location Name"
                    onUpdate={(newName) => updateLocationField('name', newName)}
                  >
                    <h3 className="font-semibold">{locationNameValue}</h3>
                  </InlineTextEdit>
                </div>
                <div className="text-sm text-muted-foreground">
                  {admin1Value}, {countryValue}
                </div>
              </div>
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(location.data?.hourly?.items || []).slice(0, 12).map((hour, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-16">{formatTime(getFieldValue(hour.time))}</span>
                  {getWeatherIcon(getFieldValue(hour.icon), 20)}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{getFieldValue(hour.temperature.value)}{getFieldValue(hour.temperature.unit)}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Droplets className="w-3 h-3" />
                    {Math.round(getFieldValue(hour.precipProbability) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>{getFieldValue(location.data.hourly?.stepHours)}-hour {t.forecast} • {t.lastUpdated}: {location.data?.current?.asOf ? formatTime(getFieldValue(location.data.current.asOf)) : 'N/A'}</span>
            {location.location.provider_name && (
              <span className="text-muted-foreground/70">Provider: {location.location.provider_name}</span>
            )}
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />

      {renderDeleteDialog()}
      {renderChannelDialog()}
      </>
    );
  }

  if (view === 'daily') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
        <Card className="h-full relative transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 group">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            initial={false}
          />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Thermometer className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <InlineTextEdit
                    field={location.location.name}
                    fieldName="Location Name"
                    onUpdate={(newName) => updateLocationField('name', newName)}
                  >
                    <h3 className="font-semibold">{locationNameValue}</h3>
                  </InlineTextEdit>
                </div>
                <div className="text-sm text-muted-foreground">
                  {admin1Value}, {countryValue}
                </div>
              </div>
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {(location.data?.daily?.items || []).slice(0, 7).map((day, index) => {
              // Parse date as local date to avoid timezone offset issues
              const dateStr = getFieldValue(day.date);
              const [year, month, dayNum] = dateStr.split('-').map(Number);
              const localDate = new Date(year, month - 1, dayNum);
              const formattedDate = localDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              
              return (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-16">{formattedDate}</span>
                  {getWeatherIcon(getFieldValue(day.icon), 20)}
                  <span className="text-sm text-muted-foreground">{getFieldValue(day.summary)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {getFieldValue(day.tempMax.value)}{getFieldValue(day.tempMax.unit)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getFieldValue(day.tempMin.value)}{getFieldValue(day.tempMin.unit)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Droplets className="w-3 h-3" />
                    {Math.round(getFieldValue(day.precipProbability) * 100)}%
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>7-day {t.forecast} • {t.lastUpdated}: {location.data?.current?.asOf ? formatTime(getFieldValue(location.data.current.asOf)) : 'N/A'}</span>
            {location.location.provider_name && (
              <span className="text-muted-foreground/70">Provider: {location.location.provider_name}</span>
            )}
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />

      {renderDeleteDialog()}
      {renderChannelDialog()}
      </>
    );
  }

  if (view === 'alerts') {
    const hasAlerts = (location.data?.alerts?.length || 0) > 0;
    
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
        <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 group">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            initial={false}
          />
          
          {/* Alert pulse for active alerts */}
          {hasAlerts && (
            <motion.div
              className="absolute inset-0 bg-red-500/10"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <div className="flex items-center gap-2">
                  <InlineTextEdit
                    field={location.location.name}
                    fieldName="Location Name"
                    onUpdate={(newName) => updateLocationField('name', newName)}
                  >
                    <h3 className="font-semibold">{locationNameValue}</h3>
                  </InlineTextEdit>
                  {(location.data?.alerts?.length || 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {location.data.alerts.length}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {admin1Value}, {countryValue}
                </div>
              </div>
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent>
          {(location.data?.alerts?.length || 0) > 0 ? (
            <div className="space-y-4">
              {location.data.alerts.map((alert, index) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {getFieldValue(alert.severity)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getFieldValue(alert.urgency)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{getFieldValue(alert.source)}</span>
                  </div>
                  
                  <h4 className="font-medium text-red-800 mb-2">{getFieldValue(alert.event)}</h4>
                  <p className="text-sm text-red-700 mb-2">{getFieldValue(alert.headline)}</p>
                  <p className="text-xs text-red-600 mb-3">{getFieldValue(alert.description)}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>From: {formatTime(getFieldValue(alert.start))}</span>
                    <span>Until: {formatTime(getFieldValue(alert.end))}</span>
                  </div>
                  
                  {(() => {
                    const areas = getFieldValue(alert.areas);
                    const areasArray = Array.isArray(areas) ? areas : (areas ? [areas] : []);
                    return areasArray.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">Areas: {areasArray.join(', ')}</span>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h4 className="font-medium mb-2">{t.noActiveAlerts}</h4>
              <p className="text-sm text-muted-foreground">
                {t.noAlertsMessage}
              </p>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground mt-4 flex items-center justify-between">
            <span>{t.lastUpdated}: {location.data?.current?.asOf ? formatTime(getFieldValue(location.data.current.asOf)) : 'N/A'}</span>
            {location.location.provider_name && (
              <span className="text-muted-foreground/70">Provider: {location.location.provider_name}</span>
            )}
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />

      {renderDeleteDialog()}
      {renderChannelDialog()}
      </>
    );
  }

  if (view === 'tropical') {
    const hasTropicalSystems = location.data.tropical?.systems?.length > 0;
    
    return (
      <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
      <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 group">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          initial={false}
        />
        
        {/* Tropical system pulse */}
        {hasTropicalSystems && (
          <motion.div
            className="absolute inset-0 bg-purple-500/10"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">{locationNameValue}</h3>
              {location.data.tropical?.systems?.length > 0 && (
                <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800">
                  {location.data.tropical.systems.length} systems
                </Badge>
              )}
              {hasOverrides && (
                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-800">
                  <Database className="h-3 w-3 mr-1" />
                  {t.modified}
                </Badge>
              )}
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent>
          {location.data.tropical?.systems?.length > 0 ? (
            <div className="space-y-4">
              {location.data.tropical.systems.map((system, index) => (
                <div key={index} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-blue-800">{getFieldValue(system.name)}</h4>
                      <p className="text-sm text-blue-600">{getFieldValue(system.type)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getFieldValue(system.position.time)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Position</p>
                      <p className="font-medium">
                        {getFieldValue(system.position.lat).toFixed(2)}°, {getFieldValue(system.position.lon).toFixed(2)}°
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Winds</p>
                      <p className="font-medium">
                        {getFieldValue(system.windMax.value)} {getFieldValue(system.windMax.unit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pressure</p>
                      <p className="font-medium">
                        {getFieldValue(system.pressureMin.value)} {getFieldValue(system.pressureMin.unit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Movement</p>
                      <p className="font-medium">
                        {getFieldValue(system.motion.speed.value)} {getFieldValue(system.motion.speed.unit)}
                      </p>
                    </div>
                  </div>
                  
                  {getFieldValue(system.forecastPoints).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Forecast track ({getFieldValue(system.forecastPoints).length} points)
                      </p>
                      <div className="text-xs text-blue-600">
                        Next: {getFieldValue(getFieldValue(system.forecastPoints)[0].time)} - {getFieldValue(getFieldValue(system.forecastPoints)[0].type)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="text-xs text-muted-foreground">
                Advisory time: {getFieldValue(location.data.tropical.advisoryTime)} • Basin: {getFieldValue(location.data.tropical.basin)}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Waves className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h4 className="font-medium mb-2">{t.noTropicalSystems}</h4>
              <p className="text-sm text-muted-foreground">
                {t.noTropicalSystemsMessage}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>
      
      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />
      
      {renderChannelDialog()}
      </>
    );
  }

  if (view === 'air-quality') {
    return (
      <>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wind className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <InlineTextEdit
                    field={location.location.name}
                    fieldName="Location Name"
                    onUpdate={(newName) => updateLocationField('name', newName)}
                  >
                    <h3 className="font-semibold">{locationNameValue}</h3>
                  </InlineTextEdit>
                </div>
                <div className="text-sm text-muted-foreground">
                  {admin1Value}, {countryValue}
                </div>
              </div>
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <h4 className="font-medium mb-2">{t.airQuality}</h4>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-2xl font-bold">{getFieldValue(location.data.current?.airQuality?.aqi)}</div>
              <div className="text-sm text-muted-foreground">{getFieldValue(location.data.current?.airQuality?.category)}</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${
                  getFieldValue(location.data.current?.airQuality?.aqi) <= 50 ? 'bg-green-500' :
                  getFieldValue(location.data.current?.airQuality?.aqi) <= 100 ? 'bg-yellow-500' :
                  getFieldValue(location.data.current?.airQuality?.aqi) <= 150 ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (getFieldValue(location.data.current?.airQuality?.aqi) / 300) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground">Standard: {getFieldValue(location.data.current?.airQuality?.standard)}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">PM2.5</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.pm25)?.toFixed(1) || 'N/A'} μg/m³</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">PM10</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.pm10)?.toFixed(1) || 'N/A'} μg/m³</p>
              </div>
              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Ozone (O₃)</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.o3)?.toFixed(1) || 'N/A'} μg/m³</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">NO₂</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.no2)?.toFixed(1) || 'N/A'} μg/m³</p>
              </div>
              <div className="p-3 bg-lime-50 dark:bg-lime-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">SO₂</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.so2)?.toFixed(1) || 'N/A'} μg/m³</p>
              </div>
              <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">CO</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.co)?.toFixed(1) || 'N/A'} mg/m³</p>
              </div>
            </div>
          </div>
          
          {location.data?.current?.pollen && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Flower2 className="w-4 h-4" />
                Pollen Count
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tree</p>
                  <p className="font-medium">{getFieldValue(location.data.current.pollen.tree)}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Grass</p>
                  <p className="font-medium">{getFieldValue(location.data.current.pollen.grass)}</p>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Weed</p>
                  <p className="font-medium">{getFieldValue(location.data.current.pollen.weed)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Risk: {getFieldValue(location.data.current.pollen.risk)}</p>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Last updated: {location.data?.current?.asOf ? formatTime(getFieldValue(location.data.current.asOf)) : 'N/A'}</span>
            {location.location.provider_name && (
              <span className="text-muted-foreground/70">Provider: {location.location.provider_name}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />

      {renderDeleteDialog()}
      {renderChannelDialog()}
      </>
    );
  }

  if (view === 'other') {
    return (
      <>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gauge className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <InlineTextEdit
                    field={location.location.name}
                    fieldName="Location Name"
                    onUpdate={(newName) => updateLocationField('name', newName)}
                  >
                    <h3 className="font-semibold">{locationNameValue}</h3>
                  </InlineTextEdit>
                </div>
                <div className="text-sm text-muted-foreground">
                  {admin1Value}, {countryValue}
                </div>
              </div>
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Wind className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Wind</p>
                <p className="font-medium">
                  {getFieldValue(location.data?.current?.wind?.speed?.value)} {getFieldValue(location.data?.current?.wind?.speed?.unit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getFieldValue(location.data?.current?.wind?.direction_cardinal)} ({getFieldValue(location.data?.current?.wind?.direction_deg)}°)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <Gauge className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pressure</p>
                <p className="font-medium">
                  {getFieldValue(location.data?.current?.pressure?.value)} {getFieldValue(location.data?.current?.pressure?.unit)}
                </p>
                {getFieldValue(location.data?.current?.pressure?.tendency) && (
                  <p className="text-xs text-muted-foreground">
                    {getFieldValue(location.data.current.pressure.tendency)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
              <Eye className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">Visibility</p>
                <p className="font-medium">
                  {getFieldValue(location.data?.current?.visibility?.value)} {getFieldValue(location.data?.current?.visibility?.unit)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-lg">
              <Cloud className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-muted-foreground">Cloud Cover</p>
                <p className="font-medium">{Math.round(getFieldValue(location.data?.current?.cloudCover) || 0)}%</p>
              </div>
            </div>
          </div>
          
          {location.data?.current?.sun && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Sunrise className="w-4 h-4" />
                Sun & Moon
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sunrise</p>
                  <p className="font-medium">{formatTime(getFieldValue(location.data.current.sun.sunrise))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sunset</p>
                  <p className="font-medium">{formatTime(getFieldValue(location.data.current.sun.sunset))}</p>
                </div>
                {location.data.current.sun.moonPhase && (
                  <div>
                    <p className="text-sm text-muted-foreground">Moon Phase</p>
                    <p className="font-medium">{getFieldValue(location.data.current.sun.moonPhase)}</p>
                  </div>
                )}
                {location.data.current.sun.illumination && (
                  <div>
                    <p className="text-sm text-muted-foreground">Illumination</p>
                    <p className="font-medium">{Math.round(getFieldValue(location.data.current.sun.illumination))}%</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {location.data?.marine && (
            <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Anchor className="w-4 h-4" />
                Marine Conditions
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Wave Height</p>
                  <p className="font-medium">
                    {getFieldValue(location.data.marine?.waves?.significantHeight?.value)} {getFieldValue(location.data.marine?.waves?.significantHeight?.unit)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Wave Period</p>
                  <p className="font-medium">
                    {getFieldValue(location.data.marine?.waves?.period?.value)} {getFieldValue(location.data.marine?.waves?.period?.unit)}
                  </p>
                </div>
              </div>
              
              {(location.data.marine?.tides?.length || 0) > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground mb-2">Next Tide</p>
                  <div className="text-sm">
                    <span className="font-medium">{getFieldValue(location.data.marine.tides[0].type)}</span> at{' '}
                    {formatTime(getFieldValue(location.data.marine.tides[0].time))} ({getFieldValue(location.data.marine.tides[0].height.value)} {getFieldValue(location.data.marine.tides[0].height.unit)})
                  </div>
                </div>
              )}
            </div>
          )}
          
          {location.data?.smoke && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Smoke & Fire
              </h4>
              <p className="text-sm text-muted-foreground">
                {location.data.smoke?.fireSources?.length || 0} fire sources detected in area
              </p>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Last updated: {location.data?.current?.asOf ? formatTime(getFieldValue(location.data.current.asOf)) : 'N/A'}</span>
            {location.location.provider_name && (
              <span className="text-muted-foreground/70">Provider: {location.location.provider_name}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />

      {renderDeleteDialog()}
      {renderChannelDialog()}
      </>
    );
  }

  // Fallback for any unhandled view types
  return (
    <>
      <Card className="p-6">
        <p className="text-muted-foreground">View type "{view}" not yet implemented</p>
      </Card>
      
      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />
      
      {/* Channel Assignment Dialog */}
      <Dialog open={assignChannelOpen} onOpenChange={setAssignChannelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Channel to {locationNameValue}</DialogTitle>
            <DialogDescription>
              Select a channel to assign to this weather location
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingChannels ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading channels...</p>
              </div>
            ) : channels.length === 0 ? (
              <div className="text-center py-8">
                <Tv className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No active channels found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {channels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => assignChannel(channel.id)}
                    disabled={assigningChannel}
                  >
                    <Tv className="mr-2 h-4 w-4" />
                    {channel.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {renderDeleteDialog()}
    </>
  );
}