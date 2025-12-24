import { useState, useMemo, useEffect, useRef } from "react";
import { WeatherLocationWithOverrides, WeatherView, isFieldOverridden, getFieldValue, SavedWeatherLocation } from "../types/weather";
import { WeatherCard } from "./WeatherCard";
import { WeatherFilters } from "./WeatherFilters";
import { WeatherAIInsights } from "./WeatherAIInsights";
import { WeatherAIInsightsVisual } from "./WeatherAIInsightsVisual";
import { WeatherLocationSearch } from "./WeatherLocationSearch";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "./ui/dialog";
import { Loader2, Rss } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { useWeatherData } from "../utils/useWeatherData";
import { useLocalStorage } from "../utils/useLocalStorage";
import { motion } from "framer-motion";

import { 
  RefreshCw, 
  Plus, 
  Cloud, 
  Sun, 
  AlertTriangle, 
  Wind,
  Thermometer,
  Droplets,
  TrendingUp,
  TrendingDown,
  Database,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface WeatherDashboardProps {
  onNavigateToFeeds?: () => void;
  onNavigateToProviders?: () => void;
}

export function WeatherDashboard({ 
  onNavigateToFeeds,
  onNavigateToProviders
}: WeatherDashboardProps) {
  // Use the useWeatherData hook which handles override processing
  const { stats: weatherDataStats, refresh: refreshWeatherData } = useWeatherData();
  
  const [currentView, setCurrentView] = useState<WeatherView>('current');
  const [filteredLocations, setFilteredLocations] = useState<WeatherLocationWithOverrides[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [refreshing, setRefreshing] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [aiInsightsDialogOpen, setAIInsightsDialogOpen] = useState(false);
  const [selectedLocationForAI, setSelectedLocationForAI] = useState<string | undefined>();
  const [weatherProviders, setWeatherProviders] = useState<any[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");
  
  // Overrides dialog state
  const [overridesDialogOpen, setOverridesDialogOpen] = useState(false);
  const [overrides, setOverrides] = useState<Array<{ id: string; name: string; custom_name: string; lat: number; lon: number; admin1?: string; country?: string }>>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [removingOverride, setRemovingOverride] = useState<string | null>(null);
  
  // Pagination state - using simple useState like Media Library
  const [currentPage, setCurrentPage] = useState(1);
  const [locationsPerPage, setLocationsPerPage] = useState(9);
  const previousLocationCountRef = useRef<number>(0);
  
  // Destructure from the hook stats
  const locations = weatherDataStats.locations;
  const loading = weatherDataStats.loading;
  const providerTemperatureUnit = weatherDataStats.providerSettings?.temperatureUnit || 'f';
  const lastUpdated = weatherDataStats.lastUpdated;
  
  // Fetch weather providers from backend using RPC
  const fetchWeatherProviders = async () => {
    try {
      const url = getRestUrl('rpc/list_providers_with_status_category');
      console.log("Fetching weather providers from RPC:", url);

      const anonKey = getSupabaseAnonKey();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_category: 'weather' }),
      });

      if (!response.ok) {
        console.error("Failed to fetch weather providers. Status:", response.status);
        throw new Error(`Failed to fetch weather providers: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched weather providers from RPC:", data);
      
      // Transform RPC response to expected format
      const formattedProviders = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: p.category,
        isActive: p.is_active,
        apiKeyConfigured: p.api_key_configured,
      }));
      
      setWeatherProviders(formattedProviders);
      
      // For language, we need to fetch full details of the active provider
      const activeProvider = formattedProviders.find((p: any) => p.isActive);
      if (activeProvider) {
        await fetchProviderLanguage(activeProvider.id);
      }
    } catch (error) {
      console.error("Error fetching weather providers:", error);
      setWeatherProviders([]);
    }
  };
  
  // Fetch language config from the active provider
  const fetchProviderLanguage = async (providerId: string) => {
    try {
      const url = getRestUrl('rpc/get_provider_details');
      const anonKey = getSupabaseAnonKey();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_id: providerId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const providerDetails = data[0];
          const config = providerDetails.config || {};
          if (config.language) {
            setCurrentLanguage(config.language);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching provider language:", error);
    }
  };

  // Fetch weather providers
  useEffect(() => {
    fetchWeatherProviders();
    
    // Refresh providers every 5 minutes
    const interval = setInterval(() => {
      fetchWeatherProviders();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Update filtered locations when locations change
  useEffect(() => {
    setFilteredLocations(locations);
    
    // Reset to page 1 only when the count actually changes (add/delete), not on data refresh
    const currentCount = locations.length;
    if (currentCount !== previousLocationCountRef.current) {
      setCurrentPage(1);
      previousLocationCountRef.current = currentCount;
    }
    
    // Ensure current page doesn't exceed total pages (e.g., after deletion)
    const totalPages = Math.ceil(currentCount / locationsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [locations]); // Only depend on locations array changes

  // fetchWeatherData is now handled by useWeatherData hook
  // Error handling for provider configuration
  useEffect(() => {
    if (!loading && weatherDataStats.error && weatherDataStats.error.includes("No active weather provider")) {
      toast.error("No weather provider configured", {
        description: "Go to Data Feeds → Weather to configure providers",
        action: {
          label: "Go to Feeds",
          onClick: onNavigateToProviders,
        },
      });
    }
  }, [weatherDataStats.error, loading, onNavigateToProviders]);

  const handleAddLocation = async (newLocation: SavedWeatherLocation) => {
    try {
      const anonKey = getSupabaseAnonKey();
      const response = await fetch(
        getEdgeFunctionUrl('weather_dashboard/locations'),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify(newLocation),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Failed to add location:", errorData);
        throw new Error(errorData.error || errorData.detail || "Failed to add location");
      }

      toast.success(`Added ${newLocation.name} to weather monitoring`);
      
      // Refresh weather data
      await refreshWeatherData();
    } catch (error) {
      console.error("Error adding location:", error);
      toast.error(`Failed to add location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteLocation = async (locationId: string, locationName: string) => {
    try {
      console.log(`🗑️ Attempting to delete weather location: ${locationId} (${locationName})`);

      const url = getEdgeFunctionUrl(`weather_dashboard/locations/${locationId}`);
      console.log(`🗑️ DELETE URL: ${url}`);

      const anonKey = getSupabaseAnonKey();
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${anonKey}`,
        },
      });

      console.log(`🗑️ Delete response status: ${response.status}`);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: await response.text() };
        }
        console.error("🗑️ Delete failed:", errorData);
        throw new Error(errorData.error || errorData.details || "Failed to delete location");
      }

      // Show success toast
      toast.success(`Deleted ${locationName}`);
      console.log(`✅ Successfully deleted location: ${locationId}`);
      
      // Refresh weather data
      await refreshWeatherData();
    } catch (error) {
      console.error("❌ Error deleting location:", error);
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold">❌ Delete Failed</div>
          <div className="text-sm">
            {error instanceof Error ? error.message : "Failed to delete location"}
          </div>
        </div>,
        {
          duration: 5000,
        }
      );
    }
  };

  const handleUpdateLocation = async (updatedLocation: WeatherLocationWithOverrides) => {
    // Note: The override saving happens inside WeatherCard via API calls
    // This function is called after a successful save to trigger a refresh
    // We refresh the data to get the updated values from the backend
    await refreshWeatherData();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWeatherData();
    setRefreshing(false);
  };

  const handleOpenAIInsights = (locationId?: string) => {
    console.log('🧠 Opening AI Insights dialog for location:', locationId);
    setSelectedLocationForAI(locationId);
    setAIInsightsDialogOpen(true);
    console.log('🧠 AI Insights dialog state set to true');
  };

  const handleOpenOverridesDialog = async () => {
    setOverridesDialogOpen(true);
    setLoadingOverrides(true);
    
    try {
      console.log('🔍 Fetching custom name overrides...');

      // Fetch all weather locations from backend API
      const anonKey = getSupabaseAnonKey();
      const response = await fetch(
        getEdgeFunctionUrl('weather_dashboard/locations'),
        {
          headers: {
            Authorization: `Bearer ${anonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch overrides: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const allLocations = result.locations || [];
      
      // Filter to only locations with custom_name
      const locationsWithCustomNames = allLocations.filter((loc: any) => loc.custom_name);
      
      setOverrides(locationsWithCustomNames);
      console.log(`📋 Loaded ${locationsWithCustomNames.length} custom name overrides from ${allLocations.length} total locations`);
    } catch (error) {
      console.error("❌ Error fetching overrides:", error);
      toast.error(`Failed to load overrides: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setOverrides([]); // Clear on error
    } finally {
      setLoadingOverrides(false);
    }
  };

  const handleRemoveOverride = async (locationId: string) => {
    setRemovingOverride(locationId);
    
    try {
      // Update the location to set custom_name to null
      const anonKey = getSupabaseAnonKey();
      const response = await fetch(
        getEdgeFunctionUrl(`weather_dashboard/locations/${locationId}`),
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ custom_name: null })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      // Remove from local state
      setOverrides(prev => prev.filter(o => o.id !== locationId));
      
      toast.success(`Removed custom name override`);
      
      // Refresh backend data to update the main view
      await refreshWeatherData();
    } catch (error) {
      console.error("Error removing override:", error);
      toast.error(`Failed to remove override: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRemovingOverride(null);
    }
  };

  const handleRemoveAllOverrides = async () => {
    if (overrides.length === 0) return;
    
    const confirmRemove = window.confirm(
      `Remove all ${overrides.length} custom name overrides? This action cannot be undone.`
    );
    
    if (!confirmRemove) return;
    
    setLoadingOverrides(true);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      const anonKey = getSupabaseAnonKey();
      for (const override of overrides) {
        try {
          const response = await fetch(
            getEdgeFunctionUrl(`weather_dashboard/locations/${override.id}`),
            {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${anonKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ custom_name: null })
            }
          );
          
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Failed to remove override for location ${override.id}:`, error);
          failCount++;
        }
      }
      
      setOverrides([]);
      
      if (failCount > 0) {
        toast.warning(`Removed ${successCount} overrides, ${failCount} failed`);
      } else {
        toast.success(`Removed all ${successCount} custom name overrides`);
      }
      
      // Refresh backend data to update the main view
      await refreshWeatherData();
    } catch (error) {
      console.error("Error removing all overrides:", error);
      toast.error("Failed to remove all overrides");
    } finally {
      setLoadingOverrides(false);
    }
  };

  // Memoize pagination calculation to prevent unnecessary recalculations
  const { totalPages, paginatedLocations } = useMemo(() => {
    // Sort the filtered locations
    const sorted = [...filteredLocations].sort((a, b) => {
      const aName = getFieldValue(a.location.name) || '';
      const bName = getFieldValue(b.location.name) || '';
      
      if (sortOrder === "asc") {
        return aName.localeCompare(bName);
      } else {
        return bName.localeCompare(aName);
      }
    });
    
    const total = Math.ceil(sorted.length / locationsPerPage);
    const startIndex = (currentPage - 1) * locationsPerPage;
    const endIndex = startIndex + locationsPerPage;
    const paginated = sorted.slice(startIndex, endIndex);
    
    return {
      totalPages: total,
      paginatedLocations: paginated
    };
  }, [filteredLocations, currentPage, locationsPerPage, sortOrder]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of cards
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Summary statistics
  const stats = useMemo(() => {
    const alertLocations = locations.filter(loc => loc.data?.alerts?.length > 0);
    
    // Calculate override statistics - only checking location.name for custom_name overrides
    const locationsWithOverrides = locations.filter(location => {
      // Only check if the location name has been overridden with a custom_name
      return isFieldOverridden(location.location.name);
    });

    const totalOverriddenFields = locationsWithOverrides.length; // Each location can only have 1 override (custom_name)
    
    // Get provider names from weather providers
    const providerNames = weatherProviders.map(p => p.name).filter(Boolean);
    
    return {
      totalLocations: locations.length,
      activeAlerts: alertLocations.length,
      providers: providerNames,
      alertLocations,
      tropicalSystems: locations.reduce((sum, loc) => sum + (loc.data?.tropical?.systems?.length || 0), 0),
      locationsWithOverrides: locationsWithOverrides.length,
      totalOverriddenFields
    };
  }, [locations, weatherProviders]);

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0, type: "spring", stiffness: 100 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
      <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 group">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          initial={false}
        />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-4">
            <motion.div 
              className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Thermometer className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">Total Locations</p>
              <motion.p 
                className="text-2xl font-semibold"
                key={stats.totalLocations}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3 }}
              >
                {stats.totalLocations}
              </motion.p>
              <p className="text-xs text-muted-foreground">Monitoring sites</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, type: "spring", stiffness: 100 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
      <Card 
        className={`h-full relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl group ${
          stats.locationsWithOverrides > 0 
            ? 'hover:shadow-amber-500/10 hover:border-amber-600' 
            : 'hover:shadow-gray-500/10'
        }`}
        onClick={handleOpenOverridesDialog}
      >
        {stats.locationsWithOverrides > 0 && (
          <motion.div
            className="absolute inset-0 bg-amber-500/10"
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
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${
            stats.locationsWithOverrides > 0 
              ? 'from-amber-500/5' 
              : 'from-gray-500/5'
          } via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
          initial={false}
        />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-4">
            <motion.div 
              className={`p-3 rounded-lg ${
                stats.locationsWithOverrides > 0 
                  ? 'bg-amber-100 dark:bg-amber-900/20' 
                  : 'bg-gray-100 dark:bg-gray-900/20'
              }`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Database className={`w-6 h-6 ${
                stats.locationsWithOverrides > 0 
                  ? 'text-amber-600 dark:text-amber-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`} />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">Data Overrides</p>
              <motion.p 
                className="text-2xl font-semibold"
                key={stats.locationsWithOverrides}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3 }}
              >
                {stats.locationsWithOverrides}
              </motion.p>
              <p className="text-xs text-muted-foreground">
                {stats.locationsWithOverrides > 0 
                  ? `${stats.locationsWithOverrides} location${stats.locationsWithOverrides !== 1 ? 's' : ''} modified` 
                  : 'No changes made'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <WeatherAIInsights 
        locations={filteredLocations} 
        compact={true} 
        onClick={() => setShowAIInsights(!showAIInsights)}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3, type: "spring", stiffness: 100 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
      <Card 
        className={`h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 group ${
          onNavigateToFeeds ? "cursor-pointer" : ""
        }`}
        onClick={onNavigateToFeeds}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          initial={false}
        />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-4">
            <motion.div 
              className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Rss className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">Data Providers</p>
              <motion.p 
                className="text-2xl font-semibold"
                key={stats.providers.length}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3 }}
              >
                {stats.providers.length}
              </motion.p>
              <p className="text-xs text-muted-foreground">
                {stats.providers[0] || 'No provider'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );


  // Don't block the entire page while loading - show the dashboard with loading states

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <Cloud className="w-6 h-6 text-blue-600" />
            Weather Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading weather data...
              </span>
            ) : (
              `Monitor conditions across ${stats.totalLocations} locations with real-time data and forecasts`
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-muted-foreground">
            Last updated {new Date(lastUpdated).toLocaleTimeString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
              {refreshing || loading ? 'Loading...' : 'Refresh'}
            </Button>
            <WeatherLocationSearch 
              onAddLocation={handleAddLocation}
              existingLocationIds={locations.map(loc => loc.location.id)}
            />
          </div>
        </div>
      </div>

      {/* Always show summary cards, fetch happens in background */}
      {renderSummaryCards()}

      {/* AI Insights Section - Visual horizontal scroll layout */}
      {showAIInsights && (
        <WeatherAIInsightsVisual 
          locations={filteredLocations}
        />
      )}
      
      {/* AI Insights Dialog - Opened from location cards */}
      <WeatherAIInsights 
        locations={locations} 
        open={aiInsightsDialogOpen}
        onOpenChange={setAIInsightsDialogOpen}
        defaultLocationId={selectedLocationForAI}
        listView={false}
      />

      <WeatherFilters
        locations={locations}
        onFilterChange={(filtered, isUserAction) => {
          setFilteredLocations(filtered);
          if (isUserAction) {
            setCurrentPage(1); // Only reset to first page when user changes filters
          }
        }}
        currentView={currentView}
        onViewChange={setCurrentView}
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={filteredLocations.length}
        onPageChange={handlePageChange}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        itemsPerPage={locationsPerPage}
        onItemsPerPageChange={(value) => {
          setLocationsPerPage(value);
          setCurrentPage(1); // Reset to first page when changing items per page
        }}
      />



      {/* Alert Summary - Only show when alerts view is active */}
      {stats.activeAlerts > 0 && currentView === 'alerts' && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-800 dark:text-red-200">Active Weather Alerts</h3>
              <Badge variant="destructive">{stats.activeAlerts} locations</Badge>
            </div>
            <div className="grid gap-2">
              {stats.alertLocations.slice(0, 3).map((location) => (
                <div key={location.location.id} className="flex items-center justify-between text-sm">
                  <span>{getFieldValue(location.location.name)}: {location.data.alerts[0].event}</span>
                  <Badge variant="outline" className="text-xs">
                    {location.data.alerts[0].severity}
                  </Badge>
                </div>
              ))}
              {stats.alertLocations.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{stats.alertLocations.length - 3} more locations with alerts
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedLocations.map((location, index) => (
          <motion.div
            key={location.location.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.02, 
              type: "spring", 
              stiffness: 100 
            }}
          >
            <WeatherCard
              location={location}
              onUpdate={handleUpdateLocation}
              onDelete={handleDeleteLocation}
              onRefresh={refreshWeatherData}
              onAIInsights={handleOpenAIInsights}
              view={currentView}
              language={currentLanguage}
              providerTemperatureUnit={providerTemperatureUnit}
            />
          </motion.div>
        ))}
      </div>

      {!loading && filteredLocations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Cloud className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No locations found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or search criteria
            </p>
            <Button 
              variant="outline" 
              onClick={() => setFilteredLocations(locations)}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tropical Systems Summary - Only show when tropical view is active */}
      {stats.tropicalSystems > 0 && currentView === 'tropical' && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Cloud className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold">Active Tropical Systems</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.tropicalSystems} active system{stats.tropicalSystems !== 1 ? 's' : ''} being tracked
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Name Overrides Dialog */}
      <Dialog open={overridesDialogOpen} onOpenChange={setOverridesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-600" />
              Custom Name Overrides
            </DialogTitle>
            <DialogDescription>
              Manage custom names for weather locations. Overrides replace the original location names.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {loadingOverrides ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : overrides.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No custom name overrides found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Edit location names in cards to create overrides
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary Card */}
                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                          {overrides.length} Custom Name{overrides.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Button
                        onClick={handleRemoveAllOverrides}
                        variant="destructive"
                        size="sm"
                        disabled={loadingOverrides}
                      >
                        Remove All
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Overrides List */}
                {overrides.map((override) => {
                  return (
                    <Card key={override.id} className="hover:border-amber-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {override.name}
                              </Badge>
                              {override.admin1 && (
                                <Badge variant="secondary" className="text-xs">
                                  {override.admin1}
                                </Badge>
                              )}
                              {override.country && (
                                <Badge variant="secondary" className="text-xs">
                                  {override.country}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                {override.lat.toFixed(4)}, {override.lon.toFixed(4)}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs text-muted-foreground">Original:</span>
                                <span className="text-muted-foreground line-through">
                                  {override.name}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs text-muted-foreground">Custom:</span>
                                <span className="font-semibold text-amber-700 dark:text-amber-400">
                                  {override.custom_name}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => handleRemoveOverride(override.id)}
                            variant="ghost"
                            size="sm"
                            disabled={removingOverride === override.id}
                            className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/20"
                          >
                            {removingOverride === override.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button onClick={() => setOverridesDialogOpen(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}