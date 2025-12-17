/**
 * Weather Component Processors
 * Fetches weather data from Supabase tables (weather_current, weather_daily_forecast)
 */

/**
 * Process Weather Cities component - fetch current weather from database
 */
export async function processWeatherCitiesComponent(
  field: any,
  config: any,
  supabase: any
): Promise<{ fields: { name: string; value: string }[]; templateName: string | null }> {
  const fields = [];

  // Get component settings
  const templateName = config.templateName || '';
  const field1 = config.field1 || '01';
  const field2 = config.field2 || '02';
  const field3 = config.field3 || '03';
  const format = config.format || '{{name}} {{temperature}}°F';
  const fieldNames = [field1, field2, field3];

  // Parse the stored value to get selected city IDs
  let selectedCityIds = [];
  try {
    // The value might be stored as the XML output or as JSON array of IDs
    const value = field.value;
    if (value.startsWith('[')) {
      selectedCityIds = JSON.parse(value);
    } else {
      // Try to extract IDs from a different format, or re-query
      // For now, we'll need to store city IDs separately
      // Let's check if there's a companion field with IDs
      console.log('Weather Cities value is not JSON array, checking for city IDs');
    }
  } catch (e) {
    console.error('Error parsing weather cities value:', e);
  }

  // If we have city IDs, fetch weather data from database
  if (selectedCityIds.length > 0) {
    console.log(`🌤️ Fetching weather for ${selectedCityIds.length} cities:`, selectedCityIds);

    // Fetch weather locations from database
    const { data: locations, error: locError } = await supabase
      .from('weather_locations')
      .select('*')
      .in('id', selectedCityIds);

    if (locError) {
      console.error('❌ Error fetching weather locations:', locError);
    }

    console.log(`🌤️ Found ${(locations || []).length} weather locations`);

    // Create a map for quick lookup maintaining order
    const locationMap = new Map();
    for (const loc of locations || []) {
      locationMap.set(loc.id, loc);
    }

    // Fetch current weather for each city from database
    for (let i = 0; i < selectedCityIds.length && i < 3; i++) {
      const cityId = selectedCityIds[i];
      const location = locationMap.get(cityId);

      if (location) {
        // Fetch current weather from weather_current table
        const { data: weatherData, error: weatherError } = await supabase
          .from('weather_current')
          .select('*')
          .eq('location_id', cityId)
          .order('fetched_at', { ascending: false })
          .limit(1)
          .single();

        if (weatherError) {
          console.error(`❌ Error fetching weather for ${cityId}:`, weatherError);
        }

        if (weatherData) {
          console.log(`🌤️ Found weather data for ${location.name}:`, {
            temp: weatherData.temperature_value,
            unit: weatherData.temperature_unit,
            summary: weatherData.summary
          });
          // Convert temperature to Fahrenheit if needed
          let temperature = weatherData.temperature_value || 0;
          if (weatherData.temperature_unit === '°C') {
            temperature = (temperature * 9 / 5) + 32;
          }

          // Build template variables
          const vars = {
            name: location.custom_name || location.name || 'Unknown',
            country: location.country || '',
            admin1: location.admin1 || '',
            temperature: Math.round(temperature),
            conditions: weatherData.summary || weatherData.icon || 'N/A'
          };

          // Replace template variables in format string
          let formatted = format;
          for (const [key, value] of Object.entries(vars)) {
            formatted = formatted.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
          }

          fields.push({
            name: fieldNames[i],
            value: formatted
          });
        }
      }
    }
  }

  // Don't add _template field - the template is already handled by element.template
  // Return both fields and templateName for override
  console.log(`🌤️ Weather Cities returning ${fields.length} fields`);
  return {
    fields,
    templateName: templateName || null
  };
}

/**
 * Process Weather Forecast component - fetch multi-day forecast from database
 */
export async function processWeatherForecastComponent(
  field: any,
  config: any,
  supabase: any
): Promise<{ fields: { name: string; value: string }[]; templateName: string | null }> {
  const fields = [];

  // Get component settings
  const templateName = config.templateName || '';
  const dayPrefix = config.dayPrefix || 'DAY';
  const highPrefix = config.highPrefix || 'HI';
  const lowPrefix = config.lowPrefix || 'LO';
  const conditionPrefix = config.conditionPrefix || 'COND';
  const numDays = config.numDays || 3;

  // Parse the stored value to get selected location ID
  let locationId = null;
  try {
    const value = field.value;
    if (value && typeof value === 'string') {
      // The value should be the location ID
      locationId = value;
    }
  } catch (e) {
    console.error('Error parsing weather forecast value:', e);
  }

  // If we have a location ID, fetch forecast data from database
  if (locationId) {
    console.log(`🌤️ Fetching forecast for location: ${locationId}`);

    // Fetch weather location from database
    const { data: location, error: locError } = await supabase
      .from('weather_locations')
      .select('*')
      .eq('id', locationId)
      .single();

    if (locError) {
      console.error('❌ Error fetching weather location:', locError);
    }

    if (location) {
      console.log(`🌤️ Found location: ${location.name}`);

      // Fetch forecast from weather_daily_forecast table
      // Get the next N days AFTER today (excluding today)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      console.log(`🌤️ Fetching forecast starting from tomorrow: ${tomorrowStr}`);

      const { data: forecastData, error: forecastError } = await supabase
        .from('weather_daily_forecast')
        .select('*')
        .eq('location_id', locationId)
        .gte('forecast_date', tomorrowStr) // Start from tomorrow, not today
        .order('forecast_date', { ascending: true })
        .limit(numDays);

      if (forecastError) {
        console.error('❌ Error fetching forecast data:', forecastError);
      }

      console.log(`🌤️ Found ${(forecastData || []).length} forecast days`);

      if (forecastData && forecastData.length > 0) {
        const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Generate fields for each day
        for (let i = 0; i < Math.min(numDays, forecastData.length); i++) {
          const forecast = forecastData[i];
          const date = new Date(forecast.forecast_date);
          const dayAbbr = dayAbbreviations[date.getDay()];

          console.log(`🌤️ Day ${i} (${forecast.forecast_date}):`, {
            temp_max_value: forecast.temp_max_value,
            temp_max_f: forecast.temp_max_f,
            temp_max_unit: forecast.temp_max_unit,
            temp_min_value: forecast.temp_min_value,
            temp_min_f: forecast.temp_min_f,
            temp_min_unit: forecast.temp_min_unit
          });

          // Convert temperatures to Fahrenheit if needed
          let high = forecast.temp_max_value || 0;
          let low = forecast.temp_min_value || 0;

          // Check if we have direct Fahrenheit values
          if (forecast.temp_max_f !== null && forecast.temp_max_f !== undefined) {
            high = forecast.temp_max_f;
          } else if (forecast.temp_max_unit === '°C') {
            high = (high * 9 / 5) + 32;
          }

          if (forecast.temp_min_f !== null && forecast.temp_min_f !== undefined) {
            low = forecast.temp_min_f;
          } else if (forecast.temp_min_unit === '°C') {
            low = (low * 9 / 5) + 32;
          }

          console.log(`🌤️ Day ${i} computed temps: high=${high}, low=${low}`);

          // Add fields with numeric suffix (0, 1, 2, etc.)
          fields.push(
            { name: `${dayPrefix}${i}`, value: dayAbbr },
            { name: `${highPrefix}${i}`, value: String(Math.round(high)) },
            { name: `${lowPrefix}${i}`, value: String(Math.round(low)) }
          );
        }
      }
    }
  }

  console.log(`🌤️ Weather Forecast returning ${fields.length} fields`);
  return {
    fields,
    templateName: templateName || null
  };
}
