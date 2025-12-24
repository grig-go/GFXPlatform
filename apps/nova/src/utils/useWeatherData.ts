import { useState, useEffect } from "react";
import { WeatherLocationWithOverrides, createOverride, FieldOverride } from "../types/weather";
import { getEdgeFunctionUrl } from "./supabase/config";
import { getAccessToken } from "./supabase";
import { useAuth } from "../contexts/AuthContext";

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

// Timeout duration for weather data fetch (30 seconds)
const FETCH_TIMEOUT_MS = 30000;

export function useWeatherData() {
  // Get effective organization for impersonation support
  const { effectiveOrganization } = useAuth();

  // Don't use cached data - always start with loading state
  // Cache can contain data from a different user/org session
  const [stats, setStats] = useState<WeatherDataStats>({
    locations: [],
    totalLocations: 0,
    activeAlerts: 0,
    lastUpdated: new Date().toISOString(),
    loading: true,
    error: null,
  });

  const fetchWeatherData = async () => {
    const startTime = performance.now();
    console.log('[useWeatherData] 🚀 Starting weather data fetch...');

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(`[useWeatherData] ⏰ Fetch timed out after ${FETCH_TIMEOUT_MS}ms`);
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    try {
      const url = getEdgeFunctionUrl('weather_dashboard/weather-data');
      console.log('[useWeatherData] 📡 Fetching from:', url);

      const token = await getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      // Add effective org header for superuser impersonation support
      if (effectiveOrganization?.id) {
        headers['X-Effective-Org-Id'] = effectiveOrganization.id;
      }
      const response = await fetch(
        url,
        {
          headers,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      const fetchDuration = performance.now() - startTime;
      console.log(`[useWeatherData] 📥 Response received in ${fetchDuration.toFixed(0)}ms, status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Weather data fetch failed:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const parseStart = performance.now();
      const result = await response.json();
      const parseDuration = performance.now() - parseStart;

      console.log(`[useWeatherData] 📦 JSON parsed in ${parseDuration.toFixed(0)}ms`);
      console.log("[useWeatherData] 📊 Backend response structure:", {
        ok: result.ok,
        providers: result.providers,
        locationsProcessed: result.locationsProcessed,
        dataLength: result.data?.length || 0,
      });
      
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

      const totalDuration = performance.now() - startTime;
      console.log(`[useWeatherData] ✅ Weather data loaded successfully in ${totalDuration.toFixed(0)}ms`, {
        locations: newStats.totalLocations,
        alerts: newStats.activeAlerts,
      });

      setStats(newStats);
      saveCachedData(newStats);
    } catch (error) {
      clearTimeout(timeoutId);
      const errorDuration = performance.now() - startTime;

      // Handle abort/timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[useWeatherData] ❌ Request aborted after ${errorDuration.toFixed(0)}ms (timeout: ${FETCH_TIMEOUT_MS}ms)`);
        setStats((prev) => ({
          ...prev,
          loading: false,
          error: `Request timed out after ${Math.round(FETCH_TIMEOUT_MS / 1000)} seconds. The server may be slow or unresponsive.`,
        }));
        return;
      }

      console.error(`[useWeatherData] ❌ Error after ${errorDuration.toFixed(0)}ms:`, error);
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
    // Re-fetch when impersonation changes
  }, [effectiveOrganization?.id]);

  return { stats, refresh: fetchWeatherData };
}