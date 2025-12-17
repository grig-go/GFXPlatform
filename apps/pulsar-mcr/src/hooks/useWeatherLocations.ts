import { useState, useCallback } from 'react';
import {
  getWeatherLocations,
  WeatherLocation,
  WeatherLocationsFilter
} from '../services/supabase/weatherLocations';

/**
 * Custom hook for managing weather locations data
 */
export const useWeatherLocations = () => {
  const [weatherLocations, setWeatherLocations] = useState<WeatherLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch weather locations with optional filters
  const fetchWeatherLocations = useCallback(async (filters?: WeatherLocationsFilter) => {
    setLoading(true);
    setError(null);

    try {
      const locations = await getWeatherLocations(filters);
      setWeatherLocations(locations);
      return locations;
    } catch (err) {
      console.error('Error fetching weather locations:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load weather locations';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    weatherLocations,
    loading,
    error,
    fetchWeatherLocations
  };
};
