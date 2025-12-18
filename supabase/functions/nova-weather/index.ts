// Nova Weather API - Direct endpoint for weather dashboard data with filtering
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get field value from override structure
function getFieldValue(field: any): any {
  if (typeof field === 'object' && field !== null) {
    // Handle override structure
    if ('overriddenValue' in field) {
      return getFieldValue(field.overriddenValue); // Recursively extract
    }
    if ('originalValue' in field) {
      return getFieldValue(field.originalValue); // Recursively extract
    }
    // Handle value/unit structure
    if ('value' in field && 'unit' in field) {
      return field.value; // Extract just the numeric value
    }
  }
  return field;
}

// State code to full name mapping
const STATE_CODES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia', 'PR': 'Puerto Rico', 'VI': 'Virgin Islands', 'GU': 'Guam',
  'AS': 'American Samoa', 'MP': 'Northern Mariana Islands'
};

// Transform weather data for API response
function transformWeatherData(
  locations: any[],
  type: string,
  channel: string,
  dataProvider: string,
  state: string,
  channelMap: Map<string, string>
): any {
  const now = new Date().toISOString();

  // Filter by channel if specified
  let filteredLocations = locations;

  console.log(`Channel filter: ${channel}, Total locations before filter: ${locations.length}`);

  if (channel && channel !== 'all') {
    if (channel === 'assigned') {
      // Show all locations that have ANY channel assigned
      console.log('Filtering for assigned channels...');
      filteredLocations = filteredLocations.filter(
        (loc) => {
          const hasChannel = loc.location.channel_id != null && loc.location.channel_id !== "";
          if (hasChannel) {
            console.log(`Location ${loc.location.name} has channel: ${loc.location.channel_id}`);
          }
          return hasChannel;
        }
      );
      console.log(`Locations with assigned channels: ${filteredLocations.length}`);
    } else {
      // Show locations with specific channel
      filteredLocations = filteredLocations.filter(
        (loc) => loc.location.channel_id === channel
      );
    }
  }

  // Filter by data provider if specified
  if (dataProvider && dataProvider !== 'all') {
    filteredLocations = filteredLocations.filter(
      (loc) => loc.location.provider_id === dataProvider
    );
  }

  // Filter by state if specified
  if (state && state !== 'all') {
    console.log(`Filtering by state: ${state}`);
    console.log(`Sample admin1 values:`, filteredLocations.slice(0, 3).map(loc => loc.location.admin1));

    // Convert state code to full name if needed (e.g., "NJ" -> "New Jersey")
    const stateFullName = STATE_CODES[state.toUpperCase()] || state;
    console.log(`State full name: ${stateFullName}`);

    filteredLocations = filteredLocations.filter(
      (loc) => {
        const admin1Lower = loc.location.admin1?.toLowerCase();
        const stateMatch = admin1Lower === state.toLowerCase() || admin1Lower === stateFullName.toLowerCase();
        if (stateMatch) {
          console.log(`State match found: ${loc.location.name} (${loc.location.admin1})`);
        }
        return stateMatch;
      }
    );
    console.log(`Locations after state filter: ${filteredLocations.length}`);
  }

  // Transform based on type
  const transformedLocations = filteredLocations.map(location => {
    const channelId = location.location.channel_id;
    const baseLocation = {
      id: location.location.id,
      name: getFieldValue(location.location.name),
      customName: location.location.custom_name,
      latitude: location.location.latitude,
      longitude: location.location.longitude,
      country: location.location.country,
      state: location.location.admin1,
      timezone: location.location.timezone,
      channelId: channelId,
      channelName: channelId ? channelMap.get(channelId) || null : null,
      providerId: location.location.provider_id,
    };

    let weatherData: any = {};

    switch (type) {
      case 'current':
        if (location.data?.current) {
          const tempUnit = location.data.current.temperatureUnit || 'F';
          // Extract actual values from potential override objects
          const tempValue = getFieldValue(location.data.current.temperature);
          const feelsLikeValue = getFieldValue(location.data.current.feelsLike);
          const pressureValue = getFieldValue(location.data.current.pressure);
          const visibilityValue = getFieldValue(location.data.current.visibility);

          weatherData = {
            temperature: {
              value: tempValue,
              unit: `°${tempUnit}`,
              valueAndUnit: tempValue !== undefined && tempValue !== null ? `${tempValue}°${tempUnit}` : undefined,
            },
            feelsLike: {
              value: feelsLikeValue,
              unit: `°${tempUnit}`,
              valueAndUnit: feelsLikeValue !== undefined && feelsLikeValue !== null ? `${feelsLikeValue}°${tempUnit}` : undefined,
            },
            humidity: location.data.current.humidity,
            windSpeed: location.data.current.windSpeed,
            windDirection: location.data.current.windDirection,
            pressure: {
              value: pressureValue,
              unit: 'mb',
              valueAndUnit: pressureValue !== undefined && pressureValue !== null ? `${pressureValue}mb` : undefined,
            },
            visibility: {
              value: visibilityValue,
              unit: 'mi',
              valueAndUnit: visibilityValue !== undefined && visibilityValue !== null ? `${visibilityValue}mi` : undefined,
            },
            uvIndex: location.data.current.uvIndex,
            condition: location.data.current.condition,
            conditionCode: location.data.current.conditionCode,
            icon: location.data.current.icon,
            cloudCover: location.data.current.cloudCover,
            precipitation: location.data.current.precipitation,
            timestamp: location.data.current.timestamp,
          };
        }
        break;

      case 'hourly':
        if (location.data?.hourly?.items) {
          const tempUnit = location.data.current?.temperatureUnit || 'F';
          weatherData = {
            items: location.data.hourly.items.map((hour: any) => {
              // Extract actual values from potential override objects
              const tempValue = getFieldValue(hour.temperature);
              const feelsLikeValue = getFieldValue(hour.feelsLike);
              const pressureValue = getFieldValue(hour.pressure);
              const visibilityValue = getFieldValue(hour.visibility);

              return {
                time: hour.time,
                temperature: {
                  value: tempValue,
                  unit: `°${tempUnit}`,
                  valueAndUnit: tempValue !== undefined && tempValue !== null ? `${tempValue}°${tempUnit}` : undefined,
                },
                feelsLike: {
                  value: feelsLikeValue,
                  unit: `°${tempUnit}`,
                  valueAndUnit: feelsLikeValue !== undefined && feelsLikeValue !== null ? `${feelsLikeValue}°${tempUnit}` : undefined,
                },
                humidity: hour.humidity,
                windSpeed: hour.windSpeed,
                windDirection: hour.windDirection,
                pressure: {
                  value: pressureValue,
                  unit: 'mb',
                  valueAndUnit: pressureValue !== undefined && pressureValue !== null ? `${pressureValue}mb` : undefined,
                },
                visibility: {
                  value: visibilityValue,
                  unit: 'mi',
                  valueAndUnit: visibilityValue !== undefined && visibilityValue !== null ? `${visibilityValue}mi` : undefined,
                },
                uvIndex: hour.uvIndex,
                condition: hour.condition,
                conditionCode: hour.conditionCode,
                icon: hour.icon,
                cloudCover: hour.cloudCover,
                precipitationProbability: hour.precipProbability !== undefined && hour.precipProbability !== null ? hour.precipProbability : (hour.precipitationProbability !== undefined && hour.precipitationProbability !== null ? hour.precipitationProbability : 0),
                precipitationAmount: hour.precipitationAmount,
              };
            }),
            summary: location.data.hourly.summary,
          };
        }
        break;

      case 'daily':
        if (location.data?.daily?.items) {
          const tempUnit = location.data.current?.temperatureUnit || 'F';
          weatherData = {
            items: location.data.daily.items.map((day: any) => {
              // Extract actual values from potential override objects
              const tempMaxValue = getFieldValue(day.tempMax || day.temperatureMax);
              const tempMinValue = getFieldValue(day.tempMin || day.temperatureMin);
              const pressureValue = getFieldValue(day.pressure);

              return {
                date: day.date,
                temperatureMax: {
                  value: tempMaxValue,
                  unit: `°${tempUnit}`,
                  valueAndUnit: tempMaxValue !== undefined && tempMaxValue !== null ? `${tempMaxValue}°${tempUnit}` : undefined,
                },
                temperatureMin: {
                  value: tempMinValue,
                  unit: `°${tempUnit}`,
                  valueAndUnit: tempMinValue !== undefined && tempMinValue !== null ? `${tempMinValue}°${tempUnit}` : undefined,
                },
                humidity: day.humidity,
                windSpeed: day.windSpeed,
                windDirection: day.windDirection,
                pressure: {
                  value: pressureValue,
                  unit: 'mb',
                  valueAndUnit: pressureValue !== undefined && pressureValue !== null ? `${pressureValue}mb` : undefined,
                },
                uvIndex: day.uvIndex,
                condition: day.condition,
                conditionCode: day.conditionCode,
                icon: day.icon,
                sunrise: day.sunrise,
                sunset: day.sunset,
                moonPhase: day.moonPhase,
                precipitationProbability: day.precipProbability !== undefined && day.precipProbability !== null ? day.precipProbability : (day.precipitationProbability !== undefined && day.precipitationProbability !== null ? day.precipitationProbability : 0),
                precipitationAmount: day.precipitationAmount,
              };
            }),
            summary: location.data.daily.summary,
          };
        }
        break;

      case 'alerts':
        if (location.data?.alerts && location.data.alerts.length > 0) {
          weatherData = {
            alerts: location.data.alerts.map((alert: any) => ({
              id: alert.id,
              event: alert.event,
              headline: alert.headline,
              description: alert.description,
              severity: alert.severity,
              urgency: alert.urgency,
              certainty: alert.certainty,
              from: alert.start || alert.effective,
              until: alert.end || alert.expires,
              areas: alert.areas,
              source: alert.source,
            })),
          };
        }
        break;

      default:
        // Return all weather data
        weatherData = location.data || {};
    }

    return {
      location: baseLocation,
      weather: weatherData,
      lastUpdated: location.data?.current?.asOf || location.data?.lastUpdated || now,
    };
  });

  // Filter out locations with no weather data for the requested type
  const locationsWithData = transformedLocations.filter(loc => {
    if (type === 'alerts') {
      return loc.weather.alerts && loc.weather.alerts.length > 0;
    }
    return Object.keys(loc.weather).length > 0;
  });

  // Sort locations by city name (ascending)
  locationsWithData.sort((a, b) => {
    const nameA = a.location.name || '';
    const nameB = b.location.name || '';
    return nameA.localeCompare(nameB);
  });

  return {
    type,
    channel: channel || 'all',
    dataProvider: dataProvider || 'all',
    state: state || 'all',
    lastUpdated: now,
    totalLocations: locationsWithData.length,
    locations: locationsWithData,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const channelParam = url.searchParams.get('channel');
    const dataProviderParam = url.searchParams.get('dataProvider');
    const stateParam = url.searchParams.get('state');
    const typeParam = url.searchParams.get('type');

    console.log('Weather API Request:', {
      channel: channelParam,
      dataProvider: dataProviderParam,
      state: stateParam,
      type: typeParam
    });

    const channel = channelParam || 'all';
    const dataProvider = dataProviderParam || 'all';
    const state = stateParam || 'all';
    const type = typeParam || 'current';

    // Validate type parameter
    const validTypes = ['current', 'hourly', 'daily', 'alerts', 'all'];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid type parameter',
          details: `Type must be one of: ${validTypes.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch weather data from the weather_dashboard edge function
    const weatherResponse = await fetch(
      `${supabaseUrl}/functions/v1/weather_dashboard/weather-data`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      console.error("Weather data fetch failed:", weatherResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch weather data',
          details: errorText.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const weatherResult = await weatherResponse.json();

    if (!weatherResult.ok) {
      console.error("Weather fetch failed:", weatherResult.error || weatherResult.detail);
      return new Response(
        JSON.stringify({
          error: 'Weather fetch failed',
          details: weatherResult.error || weatherResult.detail
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const weatherData = weatherResult.data || [];

    console.log(`Successfully fetched ${weatherData.length} weather locations`);

    // Fetch all channels to get channel names
    const { data: channels, error: channelsError } = await supabase
      .from("channels")
      .select("id, name")
      .eq("active", true);

    if (channelsError) {
      console.error("Error fetching channels:", channelsError);
    }

    // Create a map of channel_id to channel_name
    const channelMap = new Map<string, string>();
    if (channels) {
      channels.forEach((ch: any) => {
        channelMap.set(ch.id, ch.name);
      });
    }

    // Transform the data to user-friendly format with filtering
    const transformedData = transformWeatherData(
      weatherData,
      type,
      channel,
      dataProvider,
      state,
      channelMap
    );

    return new Response(
      JSON.stringify(transformedData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});