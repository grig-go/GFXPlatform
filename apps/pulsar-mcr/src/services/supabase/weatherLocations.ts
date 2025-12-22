import { supabase } from '../../lib/supabase';

export interface WeatherLocation {
  id: string;
  name: string;
  admin1: string | null;
  country: string;
  lat: number | string;
  lon: number | string;
  elevation_m: number | string | null;
  station_id: string | null;
  timezone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  custom_name: string | null;
  provider_id: string | null;
  provider_name: string | null;
  channel_id: string | null;
}

export interface WeatherDailyForecast {
  id: number;
  location_id: string;
  forecast_date: string;
  summary: string | null;
  condition_text: string | null;
  // WeatherAPI uses temp_max_f/temp_min_f, CSV uses temp_max_value/temp_min_value
  temp_max_f: number | null;
  temp_min_f: number | null;
  temp_max_value: number | null;
  temp_min_value: number | null;
}

export interface WeatherCurrent {
  id: number;
  location_id: string;
  summary: string | null;
  temperature_value: number | null;
  temperature_unit: string | null;
}

export interface WeatherLocationsFilter {
  channel_id?: string;
  provider_id?: string;
  country?: string;
  is_active?: boolean;
}

/**
 * Fetch weather locations from Supabase
 * Note: Ensure RLS policies allow SELECT on weather_locations table
 */
export const getWeatherLocations = async (
  filters?: WeatherLocationsFilter
): Promise<WeatherLocation[]> => {
  try {
    let query = supabase
      .from('weather_locations')
      .select('*');

    // Apply filters if provided
    if (filters?.channel_id) {
      query = query.eq('channel_id', filters.channel_id);
    }

    if (filters?.provider_id) {
      query = query.eq('provider_id', filters.provider_id);
    }

    if (filters?.country) {
      query = query.eq('country', filters.country);
    }

    // Always filter for active locations only
    query = query.eq('is_active', true);

    // Add ordering
    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching weather locations:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('Exception fetching weather locations:', err);
    throw err;
  }
};

/**
 * Get a single weather location by ID
 */
export const getWeatherLocation = async (id: string): Promise<WeatherLocation> => {
  const { data, error } = await supabase
    .from('weather_locations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Get daily forecast data for a location
 * Returns forecasts for the next N days (excluding today)
 */
export const getWeatherDailyForecast = async (
  locationId: string,
  numDays: number = 3
): Promise<WeatherDailyForecast[]> => {
  // Get tomorrow's date (skip today)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startDate = tomorrow.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('weather_daily_forecast')
    .select('id, location_id, forecast_date, summary, condition_text, temp_max_f, temp_min_f, temp_max_value, temp_min_value')
    .eq('location_id', locationId)
    .gte('forecast_date', startDate)
    .order('forecast_date', { ascending: true })
    .limit(numDays);

  if (error) {
    console.error('Error fetching daily forecast:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get current weather for a location
 */
export const getWeatherCurrent = async (locationId: string): Promise<WeatherCurrent | null> => {
  const { data, error } = await supabase
    .from('weather_current')
    .select('id, location_id, summary, temperature_value, temperature_unit')
    .eq('location_id', locationId)
    .order('fetched_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching current weather:', error);
    throw error;
  }

  // Return first result or null if no data
  return data && data.length > 0 ? data[0] : null;
};
