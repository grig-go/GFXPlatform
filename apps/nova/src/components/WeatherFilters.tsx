import { useState, useEffect } from "react";
import { WeatherLocationWithOverrides, WeatherView } from "../types/weather";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  CloudDrizzle,
  AlertTriangle,
  Wind,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Clock,
  CalendarDays,
  CloudRain,
  Gauge,
  MoreHorizontal,
  Check,
  Target,
} from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";

interface Provider {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface WeatherFiltersProps {
  locations: WeatherLocationWithOverrides[];
  onFilterChange: (filtered: WeatherLocationWithOverrides[], isUserAction: boolean) => void;
  currentView: WeatherView;
  onViewChange: (view: WeatherView) => void;
  currentPage: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
  sortOrder: "asc" | "desc";
  onSortChange: (order: "asc" | "desc") => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
}

export function WeatherFilters({
  locations,
  onFilterChange,
  currentView,
  onViewChange,
  currentPage,
  totalPages,
  totalResults,
  onPageChange,
  sortOrder,
  onSortChange,
  itemsPerPage,
  onItemsPerPageChange,
}: WeatherFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedTempRange, setSelectedTempRange] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [providers, setProviders] = useState<Provider[]>([]);

  // Track previous filter values to detect user-initiated changes
  const [prevFilters, setPrevFilters] = useState({
    searchTerm: "",
    selectedProvider: "all",
    selectedCountry: "all",
    selectedState: "all",
    selectedTempRange: "all",
    selectedChannel: "all",
    currentView: currentView,
  });

  // Load providers when component mounts
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch(
          getEdgeFunctionUrl('weather_dashboard/providers'),
          {
            headers: {
              Authorization: `Bearer ${getSupabaseAnonKey()}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProviders(data.providers || []);
        }
      } catch (error) {
        console.error('Error loading providers:', error);
      }
    };

    loadProviders();
  }, []);

  // Apply filters whenever inputs change
  useEffect(() => {
    let filtered = [...locations];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.location.name.toString().toLowerCase().includes(term) ||
          (typeof loc.location.name === "object" &&
            loc.location.name.originalValue?.toLowerCase().includes(term)) ||
          loc.location.admin1?.toLowerCase().includes(term) ||
          loc.location.country?.toLowerCase().includes(term)
      );
    }

    // Provider filter
    if (selectedProvider !== "all") {
      filtered = filtered.filter(
        (loc) => loc.location.provider_id === selectedProvider
      );
    }

    // Country filter
    if (selectedCountry !== "all") {
      filtered = filtered.filter(
        (loc) => loc.location.country?.toLowerCase() === selectedCountry
      );
    }

    // State filter
    if (selectedState !== "all") {
      filtered = filtered.filter(
        (loc) => loc.location.admin1?.toLowerCase() === selectedState
      );
    }

    // Temperature range filter
    if (selectedTempRange !== "all") {
      const [minTemp, maxTemp] = selectedTempRange.split("-").map(Number);
      filtered = filtered.filter(
        (loc) =>
          loc.data.current?.temperature >= minTemp &&
          loc.data.current?.temperature <= maxTemp
      );
    }

    // Channel filter
    if (selectedChannel !== "all") {
      if (selectedChannel === "assigned") {
        // Show all locations that have ANY channel assigned
        filtered = filtered.filter(
          (loc) => loc.location.channel_id != null && loc.location.channel_id !== ""
        );
      } else {
        // Show locations with specific channel
        filtered = filtered.filter(
          (loc) => loc.location.channel_id === selectedChannel
        );
      }
    }

    // View-specific filters
    if (currentView === "alerts") {
      filtered = filtered.filter((loc) => (loc.data.alerts?.length || 0) > 0);
    }

    // Check if any user-controlled filter changed (not just locations data refresh)
    const isUserAction =
      searchTerm !== prevFilters.searchTerm ||
      selectedProvider !== prevFilters.selectedProvider ||
      selectedCountry !== prevFilters.selectedCountry ||
      selectedState !== prevFilters.selectedState ||
      selectedTempRange !== prevFilters.selectedTempRange ||
      selectedChannel !== prevFilters.selectedChannel ||
      currentView !== prevFilters.currentView;

    // Update previous filters
    setPrevFilters({
      searchTerm,
      selectedProvider,
      selectedCountry,
      selectedState,
      selectedTempRange,
      selectedChannel,
      currentView,
    });

    onFilterChange(filtered, isUserAction);
  }, [searchTerm, selectedProvider, selectedCountry, selectedState, selectedTempRange, selectedChannel, currentView, locations]);

  // Get unique countries from locations
  const countries = Array.from(
    new Set(locations.map((loc) => loc.location.country).filter(Boolean))
  ).sort();

  // Get unique states from locations
  const states = Array.from(
    new Set(locations.map((loc) => loc.location.admin1).filter(Boolean))
  ).sort();

  // Get channels from locations that have channel assignments
  // We need to fetch full channel data to get channel names
  const [channelMap, setChannelMap] = useState<Map<string, string>>(new Map());
  
  useEffect(() => {
    const fetchChannelNames = async () => {
      // Get unique channel IDs from locations
      const channelIds = Array.from(
        new Set(
          locations
            .map((loc) => loc.location.channel_id)
            .filter(Boolean)
        )
      );

      if (channelIds.length === 0) {
        setChannelMap(new Map());
        return;
      }

      try {
        const response = await fetch(
          getEdgeFunctionUrl('weather_dashboard/channels'),
          {
            headers: {
              Authorization: `Bearer ${getSupabaseAnonKey()}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const allChannels = data.channels || [];
          
          // Filter to only channels that have locations assigned
          const assignedChannels = allChannels.filter((ch: { id: string; name: string }) =>
            channelIds.includes(ch.id)
          );
          
          // Create a map of channel_id -> channel_name
          const map = new Map(assignedChannels.map((ch: { id: string; name: string }) => [ch.id, ch.name]));
          setChannelMap(map);
        }
      } catch (error) {
        console.error('Error loading channel names:', error);
      }
    };

    fetchChannelNames();
  }, [locations]);

  // Get channels that have locations assigned (sorted by name)
  const channels = Array.from(channelMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const viewOptions: { value: WeatherView; label: string; icon: any }[] = [
    { value: "current", label: "Current", icon: CloudDrizzle },
    { value: "hourly", label: "Hourly", icon: Clock },
    { value: "daily", label: "Daily", icon: CalendarDays },
    { value: "alerts", label: "Alerts", icon: AlertTriangle },
    { value: "tropical", label: "Tropical", icon: CloudRain },
    { value: "air-quality", label: "Air Quality", icon: Wind },
    { value: "other", label: "Other", icon: MoreHorizontal },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Row 1: View Tabs */}
          <div className="flex flex-wrap gap-2">
            {viewOptions.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={currentView === value ? "default" : "outline"}
                size="sm"
                onClick={() => onViewChange(value)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}
          </div>

          {/* Row 2: Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
            {/* Search - spans 2 columns on large screens */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Country Filter */}
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country.toLowerCase()}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* State Filter */}
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state} value={state.toLowerCase()}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Temperature Range Filter */}
            <Select value={selectedTempRange} onValueChange={setSelectedTempRange}>
              <SelectTrigger>
                <SelectValue placeholder="All Temps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Temps</SelectItem>
                <SelectItem value="-50-0">Below 0°</SelectItem>
                <SelectItem value="0-32">0° - 32°</SelectItem>
                <SelectItem value="32-50">32° - 50°</SelectItem>
                <SelectItem value="50-70">50° - 70°</SelectItem>
                <SelectItem value="70-90">70° - 90°</SelectItem>
                <SelectItem value="90-150">Above 90°</SelectItem>
              </SelectContent>
            </Select>

            {/* Provider Filter */}
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="All Providers" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Data Providers</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name} ({provider.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Channel Filter */}
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="All Channels" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Data Channels</SelectItem>
                <SelectItem value="assigned">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-500" />
                    Assigned Channels
                  </div>
                </SelectItem>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pagination - Media Library Style */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4">
              <Select value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 per page</SelectItem>
                  <SelectItem value="9">9 per page</SelectItem>
                  <SelectItem value="12">12 per page</SelectItem>
                  <SelectItem value="15">15 per page</SelectItem>
                  <SelectItem value="24">24 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => onPageChange(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Showing {totalResults} location{totalResults !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}