const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export interface DailyForecast {
  date: string;
  day: string;
  high: number;
  low: number;
  condition: string;
  icon?: string;
  sunrise?: string;
  sunset?: string;
  moon_phase?: string;
  uv_index_max?: number;
  precip_probability?: number;
  wind_speed?: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  condition: string;
  icon?: string;
  feels_like?: number;
  humidity?: number;
  wind_speed?: number;
  precip_probability?: number;
  uv_index?: number;
}

export interface WeatherAlert {
  type: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'extreme' | 'moderate' | 'minor';
  headline?: string;
  urgency?: string;
  certainty?: string;
  start_time?: string;
  end_time?: string;
  areas?: string;
  instruction?: string;
}

export interface WeatherLocation {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  current_temp?: number;
  feels_like?: number;
  current_condition?: string;
  icon?: string;
  admin1?: string;
  country?: string;
  humidity?: number;
  uv_index?: number;
  alerts?: WeatherAlert[];
  last_updated?: string;
  daily_forecast?: DailyForecast[];
  hourly_forecast?: HourlyForecast[];
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Fetch weather locations from the weather_dashboard edge function
 * Returns an array of weather locations with current weather and alerts
 * @param bounds - Optional map bounds to filter locations by viewport
 */
export async function fetchWeatherLocations(bounds?: MapBounds): Promise<WeatherLocation[]> {
  try {
    console.log('=== FETCHING WEATHER LOCATIONS FROM WEATHER_DASHBOARD ===');
    if (bounds) {
      console.log('🗺️ Filtering by viewport bounds:', bounds);
    }
    
    // Build URL with bounds query params if provided
    let url = `${supabaseUrl}/functions/v1/weather_dashboard/weather-data`;
    if (bounds) {
      const params = new URLSearchParams({
        north: bounds.north.toString(),
        south: bounds.south.toString(),
        east: bounds.east.toString(),
        west: bounds.west.toString(),
      });
      url += `?${params.toString()}`;
    }
    
    console.log('URL:', url);
    
    const response = await fetch(
      url,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300', // Cache for 5 minutes
        },
      }
    );

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Weather Dashboard API error response:', errorText);
      throw new Error(`Failed to fetch weather data: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Weather data from weather_dashboard:', result);
    console.log('📊 Full response structure:', JSON.stringify(result, null, 2));
    
    // The weather_dashboard endpoint returns: { ok: true, data: [...], providers: [...], locationsProcessed: number }
    if (!result.ok || !Array.isArray(result.data)) {
      console.error('❌ Unexpected response format:', result);
      throw new Error('Unexpected response format from weather_dashboard API');
    }

    console.log(`📍 ${result.data.length} weather locations fetched from ${result.providers?.join(', ') || 'providers'}`);
    console.log('🗺️ Raw locations from weather_dashboard:', result.data.map((item: any) => ({
      id: item.location?.id,
      name: typeof item.location?.name === 'string' ? item.location.name : item.location?.name?.overriddenValue || item.location?.name?.originalValue,
      lat: item.location?.lat,
      lon: item.location?.lon,
    })));
    
    // Transform the weather_dashboard response to our WeatherLocation format
    const weatherLocations: WeatherLocation[] = result.data.map((item: any) => {
      const { location, data } = item;
      
      // Handle location name (could be string or object with override)
      const locationName = typeof location.name === 'string' 
        ? location.name 
        : location.name?.overriddenValue || location.name?.originalValue || 'Unknown';

      // Transform daily forecast
      const dailyForecast: DailyForecast[] = (data.daily?.items || []).map((day: any) => ({
        date: day.date,
        day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' }),
        high: day.tempMax?.value || 0,
        low: day.tempMin?.value || 0,
        condition: day.summary || '',
        icon: day.icon,
        sunrise: day.sunrise,
        sunset: day.sunset,
        moon_phase: day.moon_phase,
        uv_index_max: day.uv_index_max,
        precip_probability: day.precipProbability,
        wind_speed: day.wind_speed?.value,
      }));

      // Transform hourly forecast
      const hourlyForecast: HourlyForecast[] = (data.hourly?.items || []).map((hour: any) => ({
        time: hour.time,
        temp: hour.temperature?.value || 0,
        condition: hour.summary || hour.icon || '',
        icon: hour.icon,
        feels_like: hour.feels_like?.value,
        humidity: hour.humidity,
        wind_speed: hour.wind?.speed?.value,
        precip_probability: hour.precipProbability,
        uv_index: hour.uv_index,
      }));

      // Transform alerts
      const alerts: WeatherAlert[] = (data.alerts || []).map((alert: any) => ({
        type: alert.event || 'Weather Alert',
        description: alert.description || '',
        severity: mapSeverity(alert.severity),
        headline: alert.headline,
        urgency: alert.urgency,
        certainty: alert.certainty,
        start_time: alert.start,
        end_time: alert.end,
        areas: Array.isArray(alert.areas) ? alert.areas.join(', ') : alert.areas,
        instruction: alert.instruction,
      }));

      return {
        id: location.id,
        location: locationName,
        latitude: location.lat,
        longitude: location.lon,
        current_temp: data.current?.temperature?.value,
        feels_like: data.current?.feelsLike?.value,
        current_condition: data.current?.summary,
        icon: data.current?.icon,
        admin1: location.admin1,
        country: location.country,
        humidity: data.current?.humidity,
        uv_index: data.current?.uvIndex,
        alerts,
        last_updated: data.current?.asOf,
        daily_forecast: dailyForecast,
        hourly_forecast: hourlyForecast,
      };
    });

    console.log(`✅ Transformed ${weatherLocations.length} weather locations`);
    return weatherLocations;
    
  } catch (error: any) {
    console.error('❌ Error fetching weather locations from weather_dashboard:', error);
    throw error;
  }
}

/**
 * Map severity string to our severity type
 */
function mapSeverity(severity?: string): 'low' | 'medium' | 'high' | 'extreme' | 'moderate' | 'minor' {
  if (!severity) return 'medium';
  const lower = severity.toLowerCase();
  if (lower.includes('extreme')) return 'extreme';
  if (lower.includes('high') || lower.includes('severe')) return 'high';
  if (lower.includes('moderate')) return 'moderate';
  if (lower.includes('minor') || lower.includes('low')) return 'minor';
  return 'medium';
}

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RadarData {
  version: string;
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast: RadarFrame[];
  };
}

/**
 * Fetch weather radar frames from RainViewer API via backend proxy
 * This avoids CORS issues by proxying through our Supabase backend
 */
export async function fetchRadarFrames(): Promise<RadarFrame[]> {
  try {
    console.log('🌧️ Fetching radar frames via backend proxy...');
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/map_data/weather/radar`,
      {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Radar API error response:', errorText);
      throw new Error(`Failed to fetch radar frames: ${response.statusText} - ${errorText}`);
    }

    const data: RadarData = await response.json();
    
    console.log('📦 API Response sample:', {
      version: data.version,
      host: data.host,
      hasRadar: !!data.radar,
      hasPast: !!data.radar?.past,
      pastLength: data.radar?.past?.length || 0,
      firstItem: data.radar?.past?.[0]
    });
    
    // RainViewer API returns: { radar: { past: [{time: number, path: string}], nowcast: [...] } }
    const pastData = data.radar?.past || [];
    const nowcastData = data.radar?.nowcast || [];
    
    console.log('📊 Frame counts - Past:', pastData.length, 'Nowcast:', nowcastData.length);
    
    // Combine past and nowcast data for full animation
    const radarData = [...pastData, ...nowcastData];
    
    if (radarData.length === 0) {
      console.warn('⚠️ No radar data available from API');
      return [];
    }
    
    const firstDate = new Date(radarData[0].time * 1000);
    const lastDate = new Date(radarData[radarData.length - 1].time * 1000);
    
    console.log(`✅ Fetched ${radarData.length} radar frames`);
    console.log(`📅 Time range: ${firstDate.toLocaleString()} to ${lastDate.toLocaleString()}`);
    
    return radarData;
  } catch (error: any) {
    console.warn('⚠️ Weather radar unavailable:', error.message);
    console.log('ℹ️ Radar data could not be loaded from backend');
    return [];
  }
}