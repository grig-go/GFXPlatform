import { useState, useEffect } from "react";
import { WeatherLocationWithOverrides, createOverride, FieldOverride } from "../types/weather";
import { getEdgeFunctionUrl, getSupabaseAnonKey } from "./supabase/config";

export interface WeatherDataStats {
  locations: WeatherLocationWithOverrides[];
  totalLocations: number;
  activeAlerts: number;
  lastUpdated: string;
  loading: boolean;
  error: string | null;
  providerSettings?: {
    temperatureUnit: string;
    language: string;
  };
}

const CACHE_KEY = 'weather-data-cache';

// Load cached data from localStorage
function loadCachedData(): WeatherDataStats | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Error loading cached weather data:', error);
  }
  return null;
}

// Save data to localStorage
function saveCachedData(data: WeatherDataStats) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving cached weather data:', error);
  }
}

export function useWeatherData() {
  // Initialize with cached data if available, otherwise empty
  const cachedData = loadCachedData();
  const [stats, setStats] = useState<WeatherDataStats>(cachedData || {
    locations: [],
    totalLocations: 0,
    activeAlerts: 0,
    lastUpdated: new Date().toISOString(),
    loading: true,
    error: null,
  });

  const fetchWeatherData = async () => {
    try {
      const response = await fetch(
        getEdgeFunctionUrl('weather_dashboard/weather-data'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Weather data fetch failed:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const result = await response.json();

      console.log("🔴 Backend response structure:", result);
      
      // ✅ Handle new response format with metadata
      if (result.ok) {
        console.log("✅ Providers:", result.providers);
        console.log("✅ Total Locations Processed:", result.locationsProcessed);
      } else {
        console.error("❌ Weather fetch failed:", result.error || result.detail);
        throw new Error(result.error || result.detail || "Weather fetch failed");
      }
      
      // Extract the data array from the response
      const weatherData = result.data || [];
      
      console.log("🔍 CRITICAL: First location from backend response:", JSON.stringify(weatherData?.[0]?.location, null, 2));
      
      // Handle empty locations
      if (!weatherData || weatherData.length === 0) {
        setStats({
          locations: [],
          totalLocations: 0,
          activeAlerts: 0,
          lastUpdated: result.lastUpdated || new Date().toISOString(),
          loading: false,
          error: null,
        });
        return;
      }

      // Transform backend response to WeatherLocationWithOverrides format
      // The backend now handles override processing, so we just pass through the data
      console.log(`🔴 RAW DATA from backend (backend handles overrides now):`, weatherData);
      
      const weatherLocations: WeatherLocationWithOverrides[] = weatherData.map((weatherItem: any) => {
        console.log(`🔵 FRONTEND: Received location from backend:`, {
          id: weatherItem.location.id,
          name: weatherItem.location.name,
          name_type: typeof weatherItem.location.name,
          is_override: typeof weatherItem.location.name === 'object' && weatherItem.location.name?.isOverridden,
        });
        
        console.log(`🟢 FRONTEND: Weather data structure for ${weatherItem.location.name}:`, {
          hasData: !!weatherItem.data,
          hasCurrent: !!weatherItem.data?.current,
          hasHourly: !!weatherItem.data?.hourly,
          hasDaily: !!weatherItem.data?.daily,
          hasAlerts: !!weatherItem.data?.alerts,
          hourlyItems: weatherItem.data?.hourly?.items?.length || 0,
          dailyItems: weatherItem.data?.daily?.items?.length || 0,
          alertsCount: weatherItem.data?.alerts?.length || 0
        });
        
        return {
          location: weatherItem.location,
          data: weatherItem.data, // Use the weather data from backend response
        };
      });

      // Calculate active alerts
      const activeAlerts = weatherLocations.filter(
        (loc) => loc.data?.alerts && loc.data.alerts.length > 0
      ).length;

      const newStats: WeatherDataStats = {
        locations: weatherLocations,
        totalLocations: weatherLocations.length,
        activeAlerts,
        lastUpdated: result.lastUpdated || new Date().toISOString(),
        loading: false,
        error: null,
        providerSettings: result.providerSettings,
      };

      setStats(newStats);
      saveCachedData(newStats);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setStats((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  };

  useEffect(() => {
    fetchWeatherData();
    
    // Auto-refresh removed - use manual refresh button instead
  }, []);

  return { stats, refresh: fetchWeatherData };
}