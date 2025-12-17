import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
// IMPORTANT: prefix all routes with /map_data
const app = new Hono().basePath("/map_data");
// Enable logger
app.use("*", logger(console.log));
// Enable CORS for all routes and methods
app.use("/*", cors({
  origin: "*",
  allowHeaders: [
    "Content-Type",
    "Authorization"
  ],
  allowMethods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS"
  ],
  exposeHeaders: [
    "Content-Length"
  ],
  maxAge: 600
}));
// Health check endpoint
app.get("/health", (c)=>{
  return c.json({
    status: "ok"
  });
});
// Get age data by chamber
app.get("/demographics/age/:chamber", async (c)=>{
  try {
    const chamber = c.req.param("chamber"); // 'house' or 'senate'
    const key = `2024:national:${chamber}:age`;
    const data = await kv.get(key);
    if (!data) {
      return c.json({
        error: "Age data not found"
      }, 404);
    }
    return c.json(data);
  } catch (error) {
    console.log(`Error fetching age data: ${error}`);
    return c.json({
      error: `Failed to fetch age data: ${error}`
    }, 500);
  }
});
// Set age data by chamber
app.post("/demographics/age/:chamber", async (c)=>{
  try {
    const chamber = c.req.param("chamber");
    const data = await c.req.json();
    const key = `2024:national:${chamber}:age`;
    await kv.set(key, data);
    return c.json({
      success: true
    });
  } catch (error) {
    console.log(`Error saving age data: ${error}`);
    return c.json({
      error: `Failed to save age data: ${error}`
    }, 500);
  }
});
// Get race/ethnicity data by chamber
app.get("/demographics/race/:chamber", async (c)=>{
  try {
    const chamber = c.req.param("chamber");
    const key = `2024:national:${chamber}:race`;
    const data = await kv.get(key);
    if (!data) {
      return c.json({
        error: "Race data not found"
      }, 404);
    }
    return c.json(data);
  } catch (error) {
    console.log(`Error fetching race data: ${error}`);
    return c.json({
      error: `Failed to fetch race data: ${error}`
    }, 500);
  }
});
// Set race/ethnicity data by chamber
app.post("/demographics/race/:chamber", async (c)=>{
  try {
    const chamber = c.req.param("chamber");
    const data = await c.req.json();
    const key = `2024:national:${chamber}:race`;
    await kv.set(key, data);
    return c.json({
      success: true
    });
  } catch (error) {
    console.log(`Error saving race data: ${error}`);
    return c.json({
      error: `Failed to save race data: ${error}`
    }, 500);
  }
});
// Get education data by chamber
app.get("/demographics/education/:chamber", async (c)=>{
  try {
    const chamber = c.req.param("chamber");
    const key = `2024:national:${chamber}:education`;
    const data = await kv.get(key);
    if (!data) {
      return c.json({
        error: "Education data not found"
      }, 404);
    }
    return c.json(data);
  } catch (error) {
    console.log(`Error fetching education data: ${error}`);
    return c.json({
      error: `Failed to fetch education data: ${error}`
    }, 500);
  }
});
// Set education data by chamber
app.post("/demographics/education/:chamber", async (c)=>{
  try {
    const chamber = c.req.param("chamber");
    const data = await c.req.json();
    const key = `2024:national:${chamber}:education`;
    await kv.set(key, data);
    return c.json({
      success: true
    });
  } catch (error) {
    console.log(`Error saving education data: ${error}`);
    return c.json({
      error: `Failed to save education data: ${error}`
    }, 500);
  }
});
// Get years in office data (contains both house and senate)
app.get("/demographics/office", async (c)=>{
  try {
    const key = `2024:national:office`;
    const data = await kv.get(key);
    if (!data) {
      return c.json({
        error: "Office data not found"
      }, 404);
    }
    return c.json(data);
  } catch (error) {
    console.log(`Error fetching office data: ${error}`);
    return c.json({
      error: `Failed to fetch office data: ${error}`
    }, 500);
  }
});
// Set years in office data
app.post("/demographics/office", async (c)=>{
  try {
    const data = await c.req.json();
    const key = `2024:national:office`;
    await kv.set(key, data);
    return c.json({
      success: true
    });
  } catch (error) {
    console.log(`Error saving office data: ${error}`);
    return c.json({
      error: `Failed to save office data: ${error}`
    }, 500);
  }
});
// Initialize all data with defaults
app.post("/demographics/initialize", async (c)=>{
  try {
    const data = await c.req.json();
    // Set all the data using mset with separate keys and values arrays
    const keys = [
      '2024:national:house:age',
      '2024:national:senate:age',
      '2024:national:house:race',
      '2024:national:senate:race',
      '2024:national:house:education',
      '2024:national:senate:education',
      '2024:national:office'
    ];
    const values = [
      data.age.house,
      data.age.senate,
      data.race.house,
      data.race.senate,
      data.education.house,
      data.education.senate,
      data.office
    ];
    await kv.mset(keys, values);
    return c.json({
      success: true
    });
  } catch (error) {
    console.log(`Error initializing data: ${error}`);
    return c.json({
      error: `Failed to initialize data: ${error}`
    }, 500);
  }
});
// Debug endpoint for weather daily forecast
app.get("/weather/daily-debug", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Fetch locations
    const { data: locations, error: locError } = await supabase.from('weather_locations').select('*');
    // Fetch forecasts
    const { data: forecasts, error: forecastError } = await supabase.from('weather_daily_forecast').select('*').order('forecast_date', {
      ascending: true
    });
    return c.json({
      locations: locations || [],
      forecasts: forecasts || [],
      locationIds: (locations || []).map((l)=>l.id),
      forecastLocationIds: [
        ...new Set((forecasts || []).map((f)=>f.location_id))
      ],
      matches: (locations || []).map((loc)=>({
          locationId: loc.id,
          locationName: loc.name,
          forecastCount: (forecasts || []).filter((f)=>f.location_id === loc.id).length
        }))
    });
  } catch (error) {
    return c.json({
      error: String(error)
    }, 500);
  }
});
// Fetch weather locations from weather_locations table with current weather data and daily forecast
app.get("/weather", async (c)=>{
  try {
    console.log('=== FETCHING WEATHER LOCATIONS ===');
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Fetch all locations from weather_locations table
    const { data: locations, error: locError } = await supabase.from('weather_locations').select('*');
    if (locError) {
      console.error('❌ Error fetching weather locations:', locError);
      return c.json({
        error: locError.message
      }, 500);
    }
    if (!locations || locations.length === 0) {
      console.log('No weather locations found');
      return c.json([]);
    }
    // Fetch current weather data for all locations
    const { data: weatherData, error: weatherError } = await supabase.from('weather_current').select('*');
    if (weatherError) {
      console.error('❌ Error fetching weather current data:', weatherError);
    // Still return locations even if weather data fails
    }
    // Fetch daily forecast data for all locations
    const { data: dailyForecastData, error: forecastError } = await supabase.from('weather_daily_forecast').select('*').order('forecast_date', {
      ascending: true
    });
    if (forecastError) {
      console.error('❌ Error fetching daily forecast data:', forecastError);
    // Still return locations even if forecast data fails
    }
    // Fetch hourly forecast data for all locations
    const { data: hourlyForecastData, error: hourlyError } = await supabase.from('weather_hourly_forecast').select('*').order('forecast_time', {
      ascending: true
    });
    if (hourlyError) {
      console.error('❌ Error fetching hourly forecast data:', hourlyError);
    // Still return locations even if hourly data fails
    }
    // Fetch weather alerts for all locations
    const { data: alertsData, error: alertsError } = await supabase.from('weather_alerts').select('*').order('start_time', {
      ascending: true
    });
    if (alertsError) {
      console.error('❌ Error fetching weather alerts data:', alertsError);
    // Still return locations even if alerts data fails
    }
    // Create a map of location_id to weather data for quick lookup
    const weatherMap = new Map();
    (weatherData || []).forEach((weather)=>{
      weatherMap.set(weather.location_id, weather);
    });
    // Create a map of location_id to daily forecast array
    const forecastMap = new Map();
    (dailyForecastData || []).forEach((forecast)=>{
      if (!forecastMap.has(forecast.location_id)) {
        forecastMap.set(forecast.location_id, []);
      }
      forecastMap.get(forecast.location_id).push(forecast);
    });
    // Create a map of location_id to hourly forecast array
    const hourlyMap = new Map();
    (hourlyForecastData || []).forEach((hourly)=>{
      if (!hourlyMap.has(hourly.location_id)) {
        hourlyMap.set(hourly.location_id, []);
      }
      hourlyMap.get(hourly.location_id).push(hourly);
    });
    // Create a map of location_id to alerts array
    const alertsMap = new Map();
    (alertsData || []).forEach((alert)=>{
      if (!alertsMap.has(alert.location_id)) {
        alertsMap.set(alert.location_id, []);
      }
      alertsMap.get(alert.location_id).push(alert);
    });
    console.log('📊 Daily Forecast Data Debug:');
    console.log(`  - Total forecast records: ${dailyForecastData?.length || 0}`);
    console.log(`  - Unique location_ids in forecasts:`, Array.from(forecastMap.keys()));
    console.log(`  - Location IDs from weather_locations:`, locations.map((l)=>l.id));
    console.log('📊 Hourly Forecast Data Debug:');
    console.log(`  - Total hourly records: ${hourlyForecastData?.length || 0}`);
    console.log(`  - Unique location_ids in hourly:`, Array.from(hourlyMap.keys()));
    console.log('📊 Alerts Data Debug:');
    console.log(`  - Total alert records: ${alertsData?.length || 0}`);
    console.log(`  - Unique location_ids in alerts:`, Array.from(alertsMap.keys()));
    // Helper function to get day of week from date
    const getDayOfWeek = (dateString)=>{
      const days = [
        'Sun',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat'
      ];
      const date = new Date(dateString);
      return days[date.getDay()];
    };
    // Helper function to format time from datetime string
    const formatTime = (dateTimeString)=>{
      const date = new Date(dateTimeString);
      const hours = date.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours} ${ampm}`;
    };
    // Combine location, weather, and forecast data
    const mappedLocations = locations.map((loc)=>{
      const weather = weatherMap.get(loc.id);
      const forecasts = forecastMap.get(loc.id) || [];
      const hourlies = hourlyMap.get(loc.id) || [];
      const alerts = alertsMap.get(loc.id) || [];
      console.log(`📍 Location "${loc.name}" (id: ${loc.id}): ${forecasts.length} daily, ${hourlies.length} hourly, ${alerts.length} alerts found`);
      // Map daily forecast to frontend format
      const daily_forecast = forecasts.map((f)=>({
          date: f.forecast_date,
          day: getDayOfWeek(f.forecast_date),
          high: f.temp_max_value,
          low: f.temp_min_value,
          condition: f.summary || 'N/A',
          icon: f.icon,
          sunrise: f.sunrise,
          sunset: f.sunset,
          moon_phase: f.moon_phase,
          uv_index_max: f.uv_index_max,
          precip_probability: f.precip_probability,
          wind_speed: f.wind_speed_avg_value
        }));
      // Map hourly forecast to frontend format
      const hourly_forecast = hourlies.map((h)=>({
          time: formatTime(h.forecast_time),
          temp: h.temperature_value,
          condition: h.summary || 'N/A',
          icon: h.icon,
          feels_like: h.feels_like_value,
          humidity: h.humidity,
          wind_speed: h.wind_speed_value,
          precip_probability: h.precip_probability,
          uv_index: h.uv_index
        }));
      // Map alerts to frontend format
      const mapped_alerts = alerts.map((a)=>({
          type: a.event,
          description: a.description,
          severity: a.severity?.toLowerCase() || 'medium',
          headline: a.headline,
          urgency: a.urgency,
          certainty: a.certainty,
          start_time: a.start_time,
          end_time: a.end_time,
          areas: a.areas,
          instruction: a.instruction
        }));
      return {
        id: loc.id,
        location: loc.name || loc.location,
        latitude: loc.lat,
        longitude: loc.lon,
        current_temp: weather?.temperature_value,
        feels_like: weather?.feels_like_value,
        current_condition: weather?.summary,
        icon: weather?.icon,
        humidity: weather?.humidity,
        uv_index: weather?.uv_index,
        last_updated: weather?.created_at,
        daily_forecast,
        hourly_forecast,
        alerts: mapped_alerts
      };
    });
    console.log(`✓ Found ${mappedLocations.length} weather locations`);
    console.log('Sample location with weather:', JSON.stringify(mappedLocations[0], null, 2));
    return c.json(mappedLocations);
  } catch (error) {
    console.error('❌ Error in weather endpoint:', error);
    return c.json({
      error: String(error)
    }, 500);
  }
});
// Debug endpoint to check weather_locations table
app.get("/weather/debug", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: locations, error } = await supabase.from('weather_locations').select('*');
    return c.json({
      success: !error,
      count: locations?.length || 0,
      locations: locations || [],
      error: error ? error.message : null
    });
  } catch (error) {
    return c.json({
      success: false,
      error: String(error)
    }, 500);
  }
});
// Schema inspection endpoint
app.get("/weather/schema", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Get one row to see the structure
    const { data: sample, error } = await supabase.from('weather_locations').select('*').limit(1);
    if (error) {
      return c.json({
        error: error.message,
        columns: []
      });
    }
    const columns = sample && sample.length > 0 ? Object.keys(sample[0]) : [];
    return c.json({
      table: 'weather_locations',
      columns,
      sampleRow: sample && sample.length > 0 ? sample[0] : null
    });
  } catch (error) {
    return c.json({
      error: String(error)
    }, 500);
  }
});
// Seed AI infrastructure data - one-time setup
app.post("/ai-infra/seed", async (c)=>{
  try {
    console.log('=== SEEDING AI INFRASTRUCTURE DATA ===');
    const aiInfraData = await c.req.json();
    if (!aiInfraData.features || !Array.isArray(aiInfraData.features)) {
      return c.json({
        error: "Invalid GeoJSON format"
      }, 400);
    }
    // Store each AI datacenter with a unique key
    for(let i = 0; i < aiInfraData.features.length; i++){
      const feature = aiInfraData.features[i];
      const key = `ai_infra:${i}`;
      console.log(`Storing ${key}:`, feature);
      await kv.set(key, feature);
    }
    console.log('Successfully seeded AI infrastructure data');
    return c.json({
      success: true,
      message: `Seeded ${aiInfraData.features.length} AI datacenters`
    });
  } catch (error) {
    console.error('Error seeding AI infrastructure data:', error);
    return c.json({
      error: String(error)
    }, 500);
  }
});
// Debug endpoint for AI infrastructure
app.get("/ai-infra/debug", async (c)=>{
  try {
    console.log('=== DEBUG: Fetching raw AI infrastructure data ===');
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: aiInfraData, error } = await supabase.from("map_data").select("key, value").like("key", "ai_infra:%");
    if (error) {
      return c.json({
        error: error.message
      }, 500);
    }
    console.log('Raw AI infra data count:', aiInfraData?.length || 0);
    console.log('Raw AI infra data:', JSON.stringify(aiInfraData, null, 2));
    return c.json({
      count: aiInfraData?.length || 0,
      data: aiInfraData
    });
  } catch (error) {
    console.log('Debug endpoint error:', error);
    return c.json({
      error: String(error)
    }, 500);
  }
});
// Get AI infrastructure locations
app.get("/ai-infra", async (c)=>{
  try {
    console.log('Fetching AI infrastructure data from Supabase...');
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    console.log('Querying map_data for ai_infra keys...');
    const { data: aiInfraData, error } = await supabase.from("map_data").select("key, value").like("key", "ai_infra:%");
    if (error) {
      console.error('Error querying Supabase:', error);
      return c.json({
        error: error.message
      }, 500);
    }
    console.log(`Successfully fetched ${aiInfraData?.length || 0} AI infrastructure locations from Supabase`);
    if (!aiInfraData || aiInfraData.length === 0) {
      console.log('No AI infrastructure data found in map_data');
      return c.json({
        type: "FeatureCollection",
        features: []
      });
    }
    // Transform the data - extract values (features) from the key-value pairs
    const features = aiInfraData.map((item)=>item.value);
    console.log(`Transformed AI infrastructure features: ${features.length}`);
    return c.json({
      type: "FeatureCollection",
      features: features
    });
  } catch (error) {
    console.log(`Error in AI infrastructure endpoint: ${error}`);
    return c.json({
      error: `Failed to fetch AI infrastructure data: ${error.message || error}`
    }, 500);
  }
});
// Fetch and store county population data from Census API
app.post("/population/fetch", async (c)=>{
  try {
    console.log('=== FETCHING COUNTY POPULATION DATA ===');
    // Helper to zero-pad numbers
    const zeroPad = (n, len)=>{
      const s = String(n);
      return s.length >= len ? s : "0".repeat(len - s.length) + s;
    };
    // Try different Census API endpoints
    let pep = null;
    let successfulVintage = null;
    let popKey = 'POP';
    // Strategy 1: Try ACS 5-year estimates (most reliable)
    try {
      const ACS_URL = 'https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E,STATE,COUNTY&for=county:*';
      console.log('Trying ACS 5-year estimates (2022)...');
      console.log(`URL: ${ACS_URL}`);
      const acsRes = await fetch(ACS_URL);
      if (acsRes.ok) {
        pep = await acsRes.json();
        successfulVintage = '2022 ACS';
        popKey = 'B01003_001E'; // Total population variable
        console.log(`✅ Successfully fetched ACS 2022`);
      } else {
        const errorText = await acsRes.text();
        console.log(`ACS 2022 failed with status ${acsRes.status}: ${errorText}`);
      }
    } catch (error) {
      console.log('ACS 2022 error:', error);
    }
    // Strategy 2: Try older PEP vintages
    if (!pep) {
      const PEP_VINTAGES = [
        2021,
        2020,
        2019
      ];
      for (const vintage of PEP_VINTAGES){
        try {
          const PEP_URL = `https://api.census.gov/data/${vintage}/pep/population?get=NAME,POP,STATE,COUNTY&for=county:*`;
          console.log(`Trying PEP vintage ${vintage}...`);
          console.log(`URL: ${PEP_URL}`);
          const pepRes = await fetch(PEP_URL);
          if (!pepRes.ok) {
            console.log(`Vintage ${vintage} failed with status ${pepRes.status}`);
            continue;
          }
          pep = await pepRes.json();
          successfulVintage = vintage;
          popKey = 'POP';
          console.log(`✅ Successfully fetched vintage ${vintage}`);
          break;
        } catch (error) {
          console.log(`Vintage ${vintage} error:`, error);
          continue;
        }
      }
    }
    if (!pep || !successfulVintage) {
      throw new Error('All Census API endpoints failed. Please check Census API status.');
    }
    const [pepHeader, ...pepBody] = pep;
    console.log('Census Headers:', pepHeader);
    const pepIdx = Object.fromEntries(pepHeader.map((h, i)=>[
        h,
        i
      ]));
    // Verify we have the population column
    if (!pepIdx[popKey]) {
      console.error('Available columns:', Object.keys(pepIdx));
      throw new Error(`Population column '${popKey}' not found in data`);
    }
    console.log(`Using population column: ${popKey}`);
    // Map GEOID -> { name, POP }
    const demoByGeo = new Map();
    for (const r of pepBody){
      try {
        const state = zeroPad(Number(r[pepIdx.STATE]), 2);
        const county = zeroPad(Number(r[pepIdx.COUNTY]), 3);
        const GEOID = state + county;
        demoByGeo.set(GEOID, {
          name: r[pepIdx.NAME],
          pop: Number(r[pepIdx[popKey]])
        });
      } catch (error) {
        console.log('Error processing PEP row:', error, r);
      }
    }
    console.log(`PEP rows processed: ${demoByGeo.size}`);
    let geoData = null;
    let geoSource = null;
    console.log('Fetching county geographic data...');
    // Try GitHub-hosted GeoJSON (most reliable)
    try {
      const GITHUB_URL = 'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json';
      console.log(`Trying GitHub county GeoJSON: ${GITHUB_URL}`);
      const githubRes = await fetch(GITHUB_URL);
      if (githubRes.ok) {
        geoData = await githubRes.json();
        geoSource = 'GitHub plotly datasets';
        console.log(`✅ Successfully fetched county GeoJSON from GitHub`);
      } else {
        console.log(`GitHub URL failed with status ${githubRes.status}`);
      }
    } catch (error) {
      console.log('GitHub URL error:', error);
    }
    if (!geoData) {
      throw new Error('Failed to fetch county geographic data');
    }
    console.log(`Using geographic data from: ${geoSource}`);
    console.log(`GeoData type: ${geoData.type}, features: ${geoData.features?.length || 0}`);
    // Build features by matching GEOIDs
    console.log('Matching population data with geographic data...');
    // Create lookup map for faster matching
    const geoByFips = new Map();
    if (geoData.features) {
      for (const feature of geoData.features){
        const fips = feature.properties?.GEO_ID?.slice(-5) || feature.properties?.GEOID || feature.properties?.id || feature.id;
        if (fips) {
          geoByFips.set(String(fips).padStart(5, '0'), feature);
        }
      }
    }
    console.log(`Built geo lookup with ${geoByFips.size} counties`);
    // Match with population data
    const features = [];
    let matched = 0;
    let skippedNoGeo = 0;
    let skippedNoCentroid = 0;
    for (const [GEOID, rec] of demoByGeo.entries()){
      const geoFeature = geoByFips.get(GEOID);
      if (!geoFeature) {
        skippedNoGeo++;
        continue;
      }
      // Calculate centroid from geometry
      let lon, lat;
      if (geoFeature.geometry.type === 'Point') {
        [lon, lat] = geoFeature.geometry.coordinates;
      } else if (geoFeature.geometry.type === 'Polygon') {
        // Calculate centroid from polygon
        const coords = geoFeature.geometry.coordinates[0];
        if (coords && coords.length > 0) {
          let sumLon = 0, sumLat = 0;
          for (const coord of coords){
            sumLon += coord[0];
            sumLat += coord[1];
          }
          lon = sumLon / coords.length;
          lat = sumLat / coords.length;
        }
      } else if (geoFeature.geometry.type === 'MultiPolygon') {
        // Use first polygon for centroid
        const coords = geoFeature.geometry.coordinates[0][0];
        if (coords && coords.length > 0) {
          let sumLon = 0, sumLat = 0;
          for (const coord of coords){
            sumLon += coord[0];
            sumLat += coord[1];
          }
          lon = sumLon / coords.length;
          lat = sumLat / coords.length;
        }
      }
      if (!lon || !lat || Number.isNaN(lon) || Number.isNaN(lat)) {
        skippedNoCentroid++;
        continue;
      }
      matched++;
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            lon,
            lat
          ]
        },
        properties: {
          GEOID,
          name: rec.name,
          POP: rec.pop
        }
      });
    }
    console.log(`Join results: ${matched} matched, ${skippedNoGeo} no geo data, ${skippedNoCentroid} no centroid`);
    if (matched === 0) {
      throw new Error('No counties matched! Check data format.');
    }
    // Store in KV store
    const key = 'population:counties:2024';
    const geojson = {
      type: "FeatureCollection",
      features
    };
    console.log(`Storing ${features.length} features in KV store...`);
    await kv.set(key, geojson);
    console.log('✅ Successfully stored county population data');
    return c.json({
      success: true,
      message: `Fetched and stored ${matched} counties (vintage ${successfulVintage})`,
      vintage: successfulVintage,
      counties: matched
    });
  } catch (error) {
    console.error('❌ Error fetching county population data:', error);
    console.error('Error stack:', error.stack);
    return c.json({
      error: error.message || String(error),
      stack: error.stack
    }, 500);
  }
});
// Seed sample population data (for testing/demo)
app.post("/population/seed", async (c)=>{
  try {
    console.log('=== SEEDING SAMPLE COUNTY POPULATION DATA ===');
    // Comprehensive sample data representing counties across all 50 states
    const sampleCounties = [
      // Major metropolitan counties (>1M)
      {
        GEOID: "06037",
        name: "Los Angeles County, California",
        POP: 10014009,
        lon: -118.2437,
        lat: 34.0522
      },
      {
        GEOID: "17031",
        name: "Cook County, Illinois",
        POP: 5275541,
        lon: -87.6298,
        lat: 41.8781
      },
      {
        GEOID: "48201",
        name: "Harris County, Texas",
        POP: 4731145,
        lon: -95.3698,
        lat: 29.7604
      },
      {
        GEOID: "04013",
        name: "Maricopa County, Arizona",
        POP: 4485414,
        lon: -112.0740,
        lat: 33.4484
      },
      {
        GEOID: "06073",
        name: "San Diego County, California",
        POP: 3298634,
        lon: -117.1611,
        lat: 32.7157
      },
      {
        GEOID: "06059",
        name: "Orange County, California",
        POP: 3186989,
        lon: -117.8311,
        lat: 33.7175
      },
      {
        GEOID: "12086",
        name: "Miami-Dade County, Florida",
        POP: 2701767,
        lon: -80.1918,
        lat: 25.7617
      },
      {
        GEOID: "36047",
        name: "Kings County, New York",
        POP: 2559903,
        lon: -73.9442,
        lat: 40.6782
      },
      {
        GEOID: "48113",
        name: "Dallas County, Texas",
        POP: 2613539,
        lon: -96.7970,
        lat: 32.7767
      },
      {
        GEOID: "06085",
        name: "Santa Clara County, California",
        POP: 1936259,
        lon: -121.8863,
        lat: 37.3541
      },
      {
        GEOID: "36061",
        name: "New York County, New York",
        POP: 1629153,
        lon: -73.9712,
        lat: 40.7831
      },
      {
        GEOID: "06001",
        name: "Alameda County, California",
        POP: 1671329,
        lon: -122.0822,
        lat: 37.6017
      },
      {
        GEOID: "53033",
        name: "King County, Washington",
        POP: 2269675,
        lon: -121.8339,
        lat: 47.4907
      },
      {
        GEOID: "42101",
        name: "Philadelphia County, Pennsylvania",
        POP: 1584064,
        lon: -75.1652,
        lat: 39.9526
      },
      {
        GEOID: "26163",
        name: "Wayne County, Michigan",
        POP: 1793561,
        lon: -83.0458,
        lat: 42.3314
      },
      {
        GEOID: "27053",
        name: "Hennepin County, Minnesota",
        POP: 1281565,
        lon: -93.2650,
        lat: 44.9778
      },
      {
        GEOID: "32003",
        name: "Clark County, Nevada",
        POP: 2266715,
        lon: -115.1398,
        lat: 36.1699
      },
      {
        GEOID: "39035",
        name: "Cuyahoga County, Ohio",
        POP: 1264817,
        lon: -81.6944,
        lat: 41.4993
      },
      {
        GEOID: "06067",
        name: "Sacramento County, California",
        POP: 1585055,
        lon: -121.4944,
        lat: 38.5816
      },
      {
        GEOID: "36081",
        name: "Queens County, New York",
        POP: 2405464,
        lon: -73.7949,
        lat: 40.7282
      },
      // Medium counties (250K-1M)
      {
        GEOID: "12103",
        name: "Pinellas County, Florida",
        POP: 959107,
        lon: -82.6810,
        lat: 27.8661
      },
      {
        GEOID: "06075",
        name: "San Francisco County, California",
        POP: 873965,
        lon: -122.4194,
        lat: 37.7749
      },
      {
        GEOID: "25025",
        name: "Suffolk County, Massachusetts",
        POP: 797936,
        lon: -71.0589,
        lat: 42.3601
      },
      {
        GEOID: "51059",
        name: "Fairfax County, Virginia",
        POP: 1150309,
        lon: -77.3069,
        lat: 38.8462
      },
      {
        GEOID: "35001",
        name: "Bernalillo County, New Mexico",
        POP: 676444,
        lon: -106.6504,
        lat: 35.0844
      },
      {
        GEOID: "40109",
        name: "Oklahoma County, Oklahoma",
        POP: 796292,
        lon: -97.5164,
        lat: 35.4676
      },
      {
        GEOID: "49035",
        name: "Salt Lake County, Utah",
        POP: 1185238,
        lon: -111.8910,
        lat: 40.7608
      },
      {
        GEOID: "08031",
        name: "Denver County, Colorado",
        POP: 715522,
        lon: -104.9903,
        lat: 39.7392
      },
      {
        GEOID: "29189",
        name: "St. Louis County, Missouri",
        POP: 1004125,
        lon: -90.3994,
        lat: 38.6270
      },
      {
        GEOID: "18097",
        name: "Marion County, Indiana",
        POP: 964582,
        lon: -86.1581,
        lat: 39.7684
      },
      {
        GEOID: "47157",
        name: "Shelby County, Tennessee",
        POP: 929744,
        lon: -89.9711,
        lat: 35.1495
      },
      {
        GEOID: "21111",
        name: "Jefferson County, Kentucky",
        POP: 782969,
        lon: -85.7585,
        lat: 38.2527
      },
      {
        GEOID: "37119",
        name: "Mecklenburg County, North Carolina",
        POP: 1115482,
        lon: -80.8431,
        lat: 35.2271
      },
      {
        GEOID: "41051",
        name: "Multnomah County, Oregon",
        POP: 815428,
        lon: -122.6765,
        lat: 45.5152
      },
      {
        GEOID: "24031",
        name: "Montgomery County, Maryland",
        POP: 1062061,
        lon: -77.1528,
        lat: 39.1434
      },
      {
        GEOID: "13121",
        name: "Fulton County, Georgia",
        POP: 1066710,
        lon: -84.3880,
        lat: 33.7490
      },
      {
        GEOID: "06067",
        name: "Sacramento County, California",
        POP: 1585055,
        lon: -121.4944,
        lat: 38.5816
      },
      {
        GEOID: "55079",
        name: "Milwaukee County, Wisconsin",
        POP: 945726,
        lon: -87.9065,
        lat: 43.0389
      },
      {
        GEOID: "05119",
        name: "Pulaski County, Arkansas",
        POP: 399125,
        lon: -92.2746,
        lat: 34.7465
      },
      {
        GEOID: "01073",
        name: "Jefferson County, Alabama",
        POP: 674721,
        lon: -86.8104,
        lat: 33.5207
      },
      // Smaller counties (50K-250K)
      {
        GEOID: "31055",
        name: "Douglas County, Nebraska",
        POP: 571327,
        lon: -96.0969,
        lat: 41.2565
      },
      {
        GEOID: "28049",
        name: "Hinds County, Mississippi",
        POP: 227742,
        lon: -90.2879,
        lat: 32.2988
      },
      {
        GEOID: "22051",
        name: "Jefferson Parish, Louisiana",
        POP: 440781,
        lon: -90.0715,
        lat: 29.9499
      },
      {
        GEOID: "16001",
        name: "Ada County, Idaho",
        POP: 481587,
        lon: -116.2023,
        lat: 43.6150
      },
      {
        GEOID: "19153",
        name: "Polk County, Iowa",
        POP: 492401,
        lon: -93.6091,
        lat: 41.5868
      },
      {
        GEOID: "20173",
        name: "Sedgwick County, Kansas",
        POP: 523824,
        lon: -97.3301,
        lat: 37.6872
      },
      {
        GEOID: "23005",
        name: "Cumberland County, Maine",
        POP: 303069,
        lon: -70.2553,
        lat: 43.6591
      },
      {
        GEOID: "33011",
        name: "Hillsborough County, New Hampshire",
        POP: 422937,
        lon: -71.6886,
        lat: 42.9382
      },
      {
        GEOID: "50007",
        name: "Chittenden County, Vermont",
        POP: 168323,
        lon: -73.0818,
        lat: 44.4759
      },
      {
        GEOID: "44007",
        name: "Providence County, Rhode Island",
        POP: 660741,
        lon: -71.4128,
        lat: 41.8240
      },
      {
        GEOID: "09003",
        name: "Hartford County, Connecticut",
        POP: 894014,
        lon: -72.6819,
        lat: 41.7658
      },
      {
        GEOID: "34003",
        name: "Bergen County, New Jersey",
        POP: 955732,
        lon: -74.0431,
        lat: 40.9595
      },
      {
        GEOID: "10003",
        name: "New Castle County, Delaware",
        POP: 570719,
        lon: -75.5277,
        lat: 39.5500
      },
      {
        GEOID: "54039",
        name: "Kanawha County, West Virginia",
        POP: 178041,
        lon: -81.6326,
        lat: 38.3498
      },
      {
        GEOID: "45045",
        name: "Greenville County, South Carolina",
        POP: 525534,
        lon: -82.3940,
        lat: 34.8526
      },
      {
        GEOID: "45079",
        name: "Charleston County, South Carolina",
        POP: 408235,
        lon: -79.9959,
        lat: 32.7765
      },
      {
        GEOID: "30111",
        name: "Yellowstone County, Montana",
        POP: 164731,
        lon: -108.5007,
        lat: 45.7833
      },
      {
        GEOID: "56025",
        name: "Natrona County, Wyoming",
        POP: 79955,
        lon: -106.3372,
        lat: 42.8666
      },
      {
        GEOID: "38017",
        name: "Cass County, North Dakota",
        POP: 184525,
        lon: -96.7898,
        lat: 46.8772
      },
      {
        GEOID: "46099",
        name: "Minnehaha County, South Dakota",
        POP: 197214,
        lon: -96.7314,
        lat: 43.5460
      },
      // Small/rural counties (<50K)
      {
        GEOID: "02020",
        name: "Anchorage Municipality, Alaska",
        POP: 291247,
        lon: -149.9003,
        lat: 61.2181
      },
      {
        GEOID: "15003",
        name: "Honolulu County, Hawaii",
        POP: 1016508,
        lon: -157.8583,
        lat: 21.3099
      },
      {
        GEOID: "02105",
        name: "Hoonah-Angoon Census Area, Alaska",
        POP: 2365,
        lon: -135.4447,
        lat: 58.1089
      },
      {
        GEOID: "30067",
        name: "Park County, Montana",
        POP: 17191,
        lon: -110.5385,
        lat: 45.4506
      },
      {
        GEOID: "48301",
        name: "Loving County, Texas",
        POP: 64,
        lon: -103.5733,
        lat: 31.8493
      },
      {
        GEOID: "56007",
        name: "Carbon County, Wyoming",
        POP: 14537,
        lon: -106.8003,
        lat: 41.7258
      },
      {
        GEOID: "35028",
        name: "Los Alamos County, New Mexico",
        POP: 19369,
        lon: -106.2909,
        lat: 35.8803
      },
      {
        GEOID: "08025",
        name: "Crowley County, Colorado",
        POP: 5922,
        lon: -103.8269,
        lat: 38.2286
      },
      {
        GEOID: "04012",
        name: "La Paz County, Arizona",
        POP: 16557,
        lon: -113.9833,
        lat: 33.7194
      },
      {
        GEOID: "32510",
        name: "Esmeralda County, Nevada",
        POP: 729,
        lon: -117.3992,
        lat: 37.7107
      },
      {
        GEOID: "30091",
        name: "Sheridan County, Montana",
        POP: 3509,
        lon: -104.4824,
        lat: 48.7850
      }
    ];
    const features = sampleCounties.map((county)=>({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            county.lon,
            county.lat
          ]
        },
        properties: {
          GEOID: county.GEOID,
          name: county.name,
          POP: county.POP
        }
      }));
    const geojson = {
      type: "FeatureCollection",
      features
    };
    const key = 'population:counties:2024';
    await kv.set(key, geojson);
    console.log(`✅ Successfully seeded ${features.length} sample counties`);
    return c.json({
      success: true,
      message: `Seeded ${features.length} sample counties`,
      counties: features.length
    });
  } catch (error) {
    console.error('❌ Error seeding population data:', error);
    return c.json({
      error: error.message || String(error)
    }, 500);
  }
});
// Get county population data
app.get("/population", async (c)=>{
  try {
    console.log('Fetching county population data from KV store...');
    const key = 'population:counties:2024';
    const data = await kv.get(key);
    if (!data) {
      console.log('No population data found - needs to be fetched first');
      return c.json({
        error: 'Population data not found. Please fetch it first using POST /population/fetch'
      }, 404);
    }
    console.log(`Successfully fetched population data with ${data.features?.length || 0} counties`);
    return c.json(data);
  } catch (error) {
    console.log(`Error in population endpoint: ${error}`);
    return c.json({
      error: `Failed to fetch population data: ${error}`
    }, 500);
  }
});
// Get weather locations - KV Store + cross-reference to tables (DEPRECATED - using line 233 instead)
/*
app.get("/weather-deprecated", async (c) => {
  try {
    console.log('=== FETCHING WEATHER DATA (KV Store + Cross-Reference) ===');
    
    // Step 1: Get active location IDs from KV Store
    console.log('Step 1: Fetching active location IDs from KV Store...');
    const locationIds = await kv.get('weather:active_locations');
    
    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      console.log('No active weather locations in KV Store');
      return c.json([]);
    }
    
    console.log(`Found ${locationIds.length} active location IDs:`, locationIds);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    );
    
    // Step 2: Cross-reference to weather_locations table
    console.log('Step 2: Cross-referencing to weather_locations table...');
    const { data: locations, error: locError } = await supabase
      .from("weather_locations")
      .select("*")
      .in('id', locationIds);
    
    if (locError) {
      console.error('Error querying weather_locations:', locError);
      return c.json({ error: `Failed to fetch locations: ${locError.message}` }, 500);
    }
    
    console.log(`Fetched ${locations?.length || 0} location records`);
    
    // Step 3: Cross-reference to weather_current table
    console.log('Step 3: Cross-referencing to weather_current table...');
    const { data: currentWeather, error: currentError } = await supabase
      .from("weather_current")
      .select("*")
      .in('location_id', locationIds);
    
    if (currentError) {
      console.error('Error querying weather_current:', currentError);
      return c.json({ error: `Failed to fetch current weather: ${currentError.message}` }, 500);
    }
    
    console.log(`Fetched ${currentWeather?.length || 0} current weather records`);
    
    // Step 4: Cross-reference to weather_alerts table
    console.log('Step 4: Cross-referencing to weather_alerts table...');
    const { data: alerts, error: alertsError } = await supabase
      .from("weather_alerts")
      .select("*")
      .in('location_id', locationIds);
    
    if (alertsError) {
      console.error('Error querying weather_alerts:', alertsError);
      // Don't fail if alerts query fails, just continue without alerts
    }
    
    console.log(`Fetched ${alerts?.length || 0} weather alerts`);
    
    // Step 5: Create lookup maps for efficient joining
    const locationMap = new Map();
    if (locations) {
      locations.forEach((loc: any) => {
        locationMap.set(loc.id, loc);
      });
    }
    
    const currentMap = new Map();
    if (currentWeather) {
      currentWeather.forEach((curr: any) => {
        currentMap.set(curr.location_id, curr);
      });
    }
    
    const alertsMap = new Map();
    if (alerts) {
      alerts.forEach((alert: any) => {
        if (!alertsMap.has(alert.location_id)) {
          alertsMap.set(alert.location_id, []);
        }
        alertsMap.get(alert.location_id).push({
          type: alert.alert_type,
          description: alert.description,
          severity: alert.severity || 'medium',
        });
      });
    }
    
    // Step 6: Join all data together
    console.log('Step 6: Joining all data...');
    const weatherLocations = locationIds.map((locId: string) => {
      const loc = locationMap.get(locId);
      const curr = currentMap.get(locId);
      const locAlerts = alertsMap.get(locId) || [];
      
      if (!loc) {
        console.warn(`Location ${locId} not found in weather_locations table`);
        return null;
      }
      
      // Handle different possible column names for weather condition
      const condition = curr?.summary || curr?.description || curr?.condition || curr?.current_condition || curr?.weather_condition || curr?.weather_summary;
      
      // Handle different possible column names for temperature
      const temperature = curr?.temp_f || curr?.temperature || curr?.temp || curr?.current_temp;
      const feelsLike = curr?.feels_like_f || curr?.feels_like || curr?.feelslike_f;
      
      return {
        id: locId,
        location: loc.name,
        latitude: loc.lat,
        longitude: loc.lon,
        current_temp: temperature,
        feels_like: feelsLike,
        current_condition: condition,
        icon: curr?.icon,
        admin1: loc.admin1,
        country: loc.country,
        humidity: curr?.humidity,
        uv_index: curr?.uv_index || curr?.uv,
        alerts: locAlerts,
        last_updated: curr?.updated_at || curr?.as_of || new Date().toISOString(),
      };
    }).filter(Boolean); // Remove any null entries
    
    console.log(`✅ Successfully joined ${weatherLocations.length} weather locations`);
    
    // Set no-cache headers to ensure fresh data
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    
    return c.json(weatherLocations);
  } catch (error: any) {
    console.error(`❌ Error in weather endpoint: ${error}`);
    if (error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    const errorMessage = error && error.message ? error.message : String(error);
    return c.json({ error: `Failed to fetch weather locations: ${errorMessage}` }, 500);
  }
});
*/ // Initialize World Cup 2026 stadium data
app.post("/worldcup/initialize", async (c)=>{
  try {
    console.log('=== INITIALIZING WORLD CUP 2026 STADIUM DATA ===');
    const worldCupData = {
      "features": [
        {
          "geometry": {
            "coordinates": [
              -74.07444,
              40.81361
            ]
          },
          "properties": {
            "name": "MetLife Stadium",
            "fifa_name": "New York New Jersey Stadium",
            "city": "East Rutherford, NJ",
            "country": "United States",
            "capacity": 78576,
            "address": "1 MetLife Stadium Dr, East Rutherford, NJ 07073, USA",
            "images": {
              "file": "https://images.unsplash.com/photo-1539297991909-a76b23f3936c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxNZXRMaWZlJTIwU3RhZGl1bSUyMGFlcmlhbHxlbnwxfHx8fDE3NjA3MjY2NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://simple.wikipedia.org/wiki/MetLife_Stadium"
            ],
            "match_numbers": [
              7,
              17,
              41,
              56,
              67,
              77,
              91,
              104
            ],
            "stage_summary": {
              "Group": 5,
              "Round of 32": 1,
              "Round of 16": 1,
              "Final": 1
            },
            "matches": [
              {
                "number": 7,
                "date": "2026-06-13",
                "stage": "Group"
              },
              {
                "number": 17,
                "date": "2026-06-16",
                "stage": "Group"
              },
              {
                "number": 41,
                "date": "2026-06-22",
                "stage": "Group"
              },
              {
                "number": 56,
                "date": "2026-06-25",
                "stage": "Group"
              },
              {
                "number": 67,
                "date": "2026-06-27",
                "stage": "Group"
              },
              {
                "number": 77,
                "date": "2026-06-30",
                "stage": "Round of 32"
              },
              {
                "number": 91,
                "date": "2026-07-05",
                "stage": "Round of 16"
              },
              {
                "number": 104,
                "date": "2026-07-19",
                "stage": "Final"
              }
            ],
            "timezone": "America/New_York"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -97.09278,
              32.74778
            ]
          },
          "properties": {
            "name": "AT&T Stadium",
            "fifa_name": "Dallas Stadium",
            "city": "Arlington, TX",
            "country": "United States",
            "capacity": 70122,
            "address": "1 AT&T Way, Arlington, TX 76011, USA",
            "images": {
              "file": "https://images.unsplash.com/photo-1641174128300-658ada3167a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBVCUyNlQlMjBTdGFkaXVtJTIwRGFsbGFzfGVufDF8fHx8MTc2MDcyNjY2M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/AT%26T_Stadium"
            ],
            "match_numbers": [
              11,
              22,
              43,
              57,
              70,
              78,
              88,
              93,
              101
            ],
            "stage_summary": {
              "Group": 5,
              "Round of 32": 2,
              "Round of 16": 1,
              "Semifinal": 1
            },
            "matches": [
              {
                "number": 11,
                "date": "2026-06-14",
                "stage": "Group"
              },
              {
                "number": 22,
                "date": "2026-06-17",
                "stage": "Group"
              },
              {
                "number": 43,
                "date": "2026-06-22",
                "stage": "Group"
              },
              {
                "number": 57,
                "date": "2026-06-25",
                "stage": "Group"
              },
              {
                "number": 70,
                "date": "2026-06-27",
                "stage": "Group"
              },
              {
                "number": 78,
                "date": "2026-06-30",
                "stage": "Round of 32"
              },
              {
                "number": 88,
                "date": "2026-07-03",
                "stage": "Round of 32"
              },
              {
                "number": 93,
                "date": "2026-07-06",
                "stage": "Round of 16"
              },
              {
                "number": 101,
                "date": "2026-07-14",
                "stage": "Semifinal"
              }
            ],
            "timezone": "America/Chicago"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -84.40322,
              33.75634
            ]
          },
          "properties": {
            "name": "Mercedes-Benz Stadium",
            "fifa_name": "Atlanta Stadium",
            "city": "Atlanta, GA",
            "country": "United States",
            "capacity": 67382,
            "address": "1 AMB Dr NW, Atlanta, GA 30313, USA",
            "images": {
              "file": "https://images.unsplash.com/photo-1549333580-4cb2c5c8e421?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxNZXJjZWRlcy1CZW56JTIwU3RhZGl1bSUyMEF0bGFudGF8ZW58MXx8fHwxNzYwNzI2NjYzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/Mercedes-Benz_Stadium"
            ],
            "match_numbers": [
              14,
              25,
              38,
              50,
              72,
              80,
              95,
              102
            ],
            "stage_summary": {
              "Group": 5,
              "Round of 32": 1,
              "Round of 16": 1,
              "Semifinal": 1
            },
            "matches": [
              {
                "number": 14,
                "date": "2026-06-15",
                "stage": "Group"
              },
              {
                "number": 25,
                "date": "2026-06-18",
                "stage": "Group"
              },
              {
                "number": 38,
                "date": "2026-06-21",
                "stage": "Group"
              },
              {
                "number": 50,
                "date": "2026-06-24",
                "stage": "Group"
              },
              {
                "number": 72,
                "date": "2026-06-27",
                "stage": "Group"
              },
              {
                "number": 80,
                "date": "2026-07-01",
                "stage": "Round of 32"
              },
              {
                "number": 95,
                "date": "2026-07-07",
                "stage": "Round of 16"
              },
              {
                "number": 102,
                "date": "2026-07-15",
                "stage": "Semifinal"
              }
            ],
            "timezone": "America/New_York"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -80.23889,
              25.95806
            ]
          },
          "properties": {
            "name": "Hard Rock Stadium",
            "fifa_name": "Miami Stadium",
            "city": "Miami Gardens, FL",
            "country": "United States",
            "capacity": 64091,
            "address": "347 Don Shula Dr, Miami Gardens, FL 33056, USA",
            "images": {
              "file": "https://images.unsplash.com/photo-1751232576230-e065bfa42aaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxIYXJkJTIwUm9jayUyMFN0YWRpdW0lMjBNaWFtaXxlbnwxfHx8fDE3NjA3MjY2NjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/Hard_Rock_Stadium"
            ],
            "match_numbers": [
              13,
              37,
              49,
              71,
              86,
              99,
              103
            ],
            "stage_summary": {
              "Group": 4,
              "Round of 32": 1,
              "Quarterfinal": 1,
              "Third place": 1
            },
            "matches": [
              {
                "number": 13,
                "date": "2026-06-15",
                "stage": "Group"
              },
              {
                "number": 37,
                "date": "2026-06-21",
                "stage": "Group"
              },
              {
                "number": 49,
                "date": "2026-06-24",
                "stage": "Group"
              },
              {
                "number": 71,
                "date": "2026-06-27",
                "stage": "Group"
              },
              {
                "number": 86,
                "date": "2026-07-03",
                "stage": "Round of 32"
              },
              {
                "number": 99,
                "date": "2026-07-11",
                "stage": "Quarterfinal"
              },
              {
                "number": 103,
                "date": "2026-07-18",
                "stage": "Third place"
              }
            ],
            "timezone": "America/New_York"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -118.33831,
              33.95011
            ]
          },
          "properties": {
            "name": "SoFi Stadium",
            "fifa_name": "Los Angeles Stadium",
            "city": "Inglewood, CA",
            "country": "United States",
            "capacity": 69650,
            "address": "1001 Stadium Dr, Inglewood, CA 90301, USA",
            "images": {
              "file": "https://images.unsplash.com/photo-1644291833042-1361b57de761?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTb0ZpJTIwU3RhZGl1bSUyMExvcyUyMEFuZ2VsZXN8ZW58MXx8fHwxNzYwNzI2NjY0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/SoFi_Stadium"
            ],
            "match_numbers": [
              4,
              15,
              26,
              39,
              59,
              73,
              84,
              98
            ],
            "stage_summary": {
              "Group": 5,
              "Round of 32": 2,
              "Quarterfinal": 1
            },
            "matches": [
              {
                "number": 4,
                "date": "2026-06-12",
                "stage": "Group"
              },
              {
                "number": 15,
                "date": "2026-06-15",
                "stage": "Group"
              },
              {
                "number": 26,
                "date": "2026-06-18",
                "stage": "Group"
              },
              {
                "number": 39,
                "date": "2026-06-21",
                "stage": "Group"
              },
              {
                "number": 59,
                "date": "2026-06-25",
                "stage": "Group"
              },
              {
                "number": 73,
                "date": "2026-06-28",
                "stage": "Round of 32"
              },
              {
                "number": 84,
                "date": "2026-07-02",
                "stage": "Round of 32"
              },
              {
                "number": 98,
                "date": "2026-07-10",
                "stage": "Quarterfinal"
              }
            ],
            "timezone": "America/Los_Angeles"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -122.33103,
              47.59445
            ]
          },
          "properties": {
            "name": "Lumen Field",
            "fifa_name": "Seattle Stadium",
            "city": "Seattle, WA",
            "country": "United States",
            "capacity": 65123,
            "address": "800 Occidental Ave S, Seattle, WA 98134, USA",
            "images": {
              "file": "https://images.unsplash.com/photo-1719805364391-7cee9feb98ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxMdW1lbiUyMEZpZWxkJTIwU2VhdHRsZXxlbnwxfHx8fDE3NjA3MjY2NjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/Lumen_Field"
            ],
            "match_numbers": [
              16,
              32,
              52,
              63,
              82,
              94
            ],
            "stage_summary": {
              "Group": 4,
              "Round of 32": 1,
              "Round of 16": 1
            },
            "matches": [
              {
                "number": 16,
                "date": "2026-06-15",
                "stage": "Group"
              },
              {
                "number": 32,
                "date": "2026-06-19",
                "stage": "Group"
              },
              {
                "number": 52,
                "date": "2026-06-24",
                "stage": "Group"
              },
              {
                "number": 63,
                "date": "2026-06-26",
                "stage": "Group"
              },
              {
                "number": 82,
                "date": "2026-07-01",
                "stage": "Round of 32"
              },
              {
                "number": 94,
                "date": "2026-07-06",
                "stage": "Round of 16"
              }
            ],
            "timezone": "America/Los_Angeles"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -121.97519,
              37.39737
            ]
          },
          "properties": {
            "name": "Levi's Stadium",
            "fifa_name": "San Francisco Bay Area Stadium",
            "city": "Santa Clara, CA",
            "country": "United States",
            "capacity": 69391,
            "address": "4900 Marie P DeBartolo Way, Santa Clara, CA 95054, USA",
            "images": {
              "file": "https://images.unsplash.com/photo-1588917917061-565469424de9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxMZXZpcyUyMFN0YWRpdW18ZW58MXx8fHwxNzYwNzI2NjY1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/Levi%27s_Stadium"
            ],
            "match_numbers": [
              8,
              20,
              31,
              44,
              60,
              81
            ],
            "stage_summary": {
              "Group": 5,
              "Round of 32": 1
            },
            "matches": [
              {
                "number": 8,
                "date": "2026-06-13",
                "stage": "Group"
              },
              {
                "number": 20,
                "date": "2026-06-16",
                "stage": "Group"
              },
              {
                "number": 31,
                "date": "2026-06-19",
                "stage": "Group"
              },
              {
                "number": 44,
                "date": "2026-06-22",
                "stage": "Group"
              },
              {
                "number": 60,
                "date": "2026-06-25",
                "stage": "Group"
              },
              {
                "number": 81,
                "date": "2026-07-01",
                "stage": "Round of 32"
              }
            ],
            "timezone": "America/Los_Angeles"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -75.1675,
              39.90083
            ]
          },
          "properties": {
            "name": "Lincoln Financial Field",
            "fifa_name": "Philadelphia Stadium",
            "city": "Philadelphia, PA",
            "country": "United States",
            "capacity": 65827,
            "address": "1 Lincoln Financial Field Way, Philadelphia, PA 19148, USA",
            "images": {
              "file": "https://images.unsplash.com/photo-1705588852060-7f80fc786c63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxMaW5jb2xuJTIwRmluYW5jaWFsJTIwRmllbGQlMjBQaGlsYWRlbHBoaWF8ZW58MXx8fHwxNzYwNzI2NjY1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/Lincoln_Financial_Field"
            ],
            "match_numbers": [
              9,
              29,
              42,
              55,
              68,
              89
            ],
            "stage_summary": {
              "Group": 5,
              "Round of 16": 1
            },
            "matches": [
              {
                "number": 9,
                "date": "2026-06-14",
                "stage": "Group"
              },
              {
                "number": 29,
                "date": "2026-06-19",
                "stage": "Group"
              },
              {
                "number": 42,
                "date": "2026-06-22",
                "stage": "Group"
              },
              {
                "number": 55,
                "date": "2026-06-25",
                "stage": "Group"
              },
              {
                "number": 68,
                "date": "2026-06-27",
                "stage": "Group"
              },
              {
                "number": 89,
                "date": "2026-07-04",
                "stage": "Round of 16"
              }
            ],
            "timezone": "America/New_York"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -95.40972,
              29.68472
            ]
          },
          "properties": {
            "name": "NRG Stadium",
            "fifa_name": "Houston Stadium",
            "city": "Houston, TX",
            "country": "United States",
            "capacity": 68311,
            "address": "1 NRG Pkwy, Houston, TX 77054, USA",
            "images": {
              "file": "https://images.unsplash.com/photo-1729801154586-f1f47b876342?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxOUkclMjBTdGFkaXVtJTIwSG91c3RvbnxlbnwxfHx8fDE3NjA3MjY2NjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/NRG_Stadium"
            ],
            "match_numbers": [
              10,
              23,
              35,
              47,
              65,
              76,
              90
            ],
            "stage_summary": {
              "Group": 5,
              "Round of 32": 1,
              "Round of 16": 1
            },
            "matches": [
              {
                "number": 10,
                "date": "2026-06-14",
                "stage": "Group"
              },
              {
                "number": 23,
                "date": "2026-06-17",
                "stage": "Group"
              },
              {
                "number": 35,
                "date": "2026-06-20",
                "stage": "Group"
              },
              {
                "number": 47,
                "date": "2026-06-23",
                "stage": "Group"
              },
              {
                "number": 65,
                "date": "2026-06-26",
                "stage": "Group"
              },
              {
                "number": 76,
                "date": "2026-06-29",
                "stage": "Round of 32"
              },
              {
                "number": 90,
                "date": "2026-07-04",
                "stage": "Round of 16"
              }
            ],
            "timezone": "America/Chicago"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -94.48404,
              39.04894
            ]
          },
          "properties": {
            "name": "GEHA Field at Arrowhead Stadium",
            "fifa_name": "Kansas City Stadium",
            "city": "Kansas City, MO",
            "country": "United States",
            "capacity": 67513,
            "address": "1 Arrowhead Dr, Kansas City, MO 64129, USA",
            "images": {
              "file": "https://images.unsplash.com/photo-1567294236450-072696640bb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBcnJvd2hlYWQlMjBTdGFkaXVtJTIwS2Fuc2FzfGVufDF8fHx8MTc2MDcyNjY2N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/Arrowhead_Stadium"
            ],
            "match_numbers": [
              19,
              34,
              58,
              69,
              87,
              100
            ],
            "stage_summary": {
              "Group": 4,
              "Round of 32": 1,
              "Quarterfinal": 1
            },
            "matches": [
              {
                "number": 19,
                "date": "2026-06-16",
                "stage": "Group"
              },
              {
                "number": 34,
                "date": "2026-06-20",
                "stage": "Group"
              },
              {
                "number": 58,
                "date": "2026-06-25",
                "stage": "Group"
              },
              {
                "number": 69,
                "date": "2026-06-27",
                "stage": "Group"
              },
              {
                "number": 87,
                "date": "2026-07-03",
                "stage": "Round of 32"
              },
              {
                "number": 100,
                "date": "2026-07-11",
                "stage": "Quarterfinal"
              }
            ],
            "timezone": "America/Chicago"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -71.26434,
              42.09094
            ]
          },
          "properties": {
            "name": "Gillette Stadium",
            "fifa_name": "Boston Stadium",
            "city": "Foxborough, MA",
            "country": "United States",
            "capacity": 63815,
            "address": "1 Patriot Pl, Foxborough, MA 02035, USA",
            "images": {
              "file": "https://images.unsplash.com/photo-1587583777328-c17781b72d6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxHaWxsZXR0ZSUyMFN0YWRpdW18ZW58MXx8fHwxNzYwNzI2NjY2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/Gillette_Stadium"
            ],
            "match_numbers": [
              5,
              18,
              30,
              45,
              61,
              74,
              97
            ],
            "stage_summary": {
              "Group": 5,
              "Round of 32": 1,
              "Quarterfinal": 1
            },
            "matches": [
              {
                "number": 5,
                "date": "2026-06-13",
                "stage": "Group"
              },
              {
                "number": 18,
                "date": "2026-06-16",
                "stage": "Group"
              },
              {
                "number": 30,
                "date": "2026-06-19",
                "stage": "Group"
              },
              {
                "number": 45,
                "date": "2026-06-23",
                "stage": "Group"
              },
              {
                "number": 61,
                "date": "2026-06-26",
                "stage": "Group"
              },
              {
                "number": 74,
                "date": "2026-06-29",
                "stage": "Round of 32"
              },
              {
                "number": 97,
                "date": "2026-07-09",
                "stage": "Quarterfinal"
              }
            ],
            "timezone": "America/New_York"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -123.11194,
              49.27667
            ]
          },
          "properties": {
            "name": "BC Place",
            "fifa_name": "BC Place Vancouver Stadium",
            "city": "Vancouver, BC",
            "country": "Canada",
            "capacity": 48821,
            "address": "777 Pacific Blvd, Vancouver, BC V6B 4Y8, Canada",
            "images": {
              "file": "https://images.unsplash.com/photo-1660079277807-87b9d25c447e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxCQyUyMFBsYWNlJTIwVmFuY291dmVyfGVufDF8fHx8MTc2MDcyNjY2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/BC_Place"
            ],
            "match_numbers": [
              6,
              27,
              40,
              51,
              64,
              85,
              96
            ],
            "stage_summary": {
              "Group": 5,
              "Round of 32": 1,
              "Round of 16": 1
            },
            "matches": [
              {
                "number": 6,
                "date": "2026-06-13",
                "stage": "Group"
              },
              {
                "number": 27,
                "date": "2026-06-18",
                "stage": "Group"
              },
              {
                "number": 40,
                "date": "2026-06-21",
                "stage": "Group"
              },
              {
                "number": 51,
                "date": "2026-06-24",
                "stage": "Group"
              },
              {
                "number": 64,
                "date": "2026-06-26",
                "stage": "Group"
              },
              {
                "number": 85,
                "date": "2026-07-02",
                "stage": "Round of 32"
              },
              {
                "number": 96,
                "date": "2026-07-07",
                "stage": "Round of 16"
              }
            ],
            "timezone": "America/Vancouver"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -79.41889,
              43.63361
            ]
          },
          "properties": {
            "name": "BMO Field",
            "fifa_name": "Toronto Stadium",
            "city": "Toronto, ON",
            "country": "Canada",
            "capacity": 44315,
            "address": "170 Princes' Blvd, Toronto, ON M6K 3C3, Canada",
            "images": {
              "file": "https://images.unsplash.com/photo-1733021194533-2626c433373b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxCTU8lMjBGaWVsZCUyMFRvcm9udG98ZW58MXx8fHwxNzYwNzI2NjY3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/BMO_Field"
            ],
            "match_numbers": [
              3,
              21,
              33,
              46,
              62,
              83
            ],
            "stage_summary": {
              "Group": 5,
              "Round of 32": 1
            },
            "matches": [
              {
                "number": 3,
                "date": "2026-06-12",
                "stage": "Group"
              },
              {
                "number": 21,
                "date": "2026-06-17",
                "stage": "Group"
              },
              {
                "number": 33,
                "date": "2026-06-20",
                "stage": "Group"
              },
              {
                "number": 46,
                "date": "2026-06-23",
                "stage": "Group"
              },
              {
                "number": 62,
                "date": "2026-06-26",
                "stage": "Group"
              },
              {
                "number": 83,
                "date": "2026-07-02",
                "stage": "Round of 32"
              }
            ],
            "timezone": "America/Toronto"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -99.15052,
              19.3029
            ]
          },
          "properties": {
            "name": "Estadio Azteca",
            "fifa_name": "Estadio Azteca Mexico City",
            "city": "Mexico City",
            "country": "Mexico",
            "capacity": 72766,
            "address": "Calz. de Tlalpan 3465, Sta. Úrsula Coapa, Coyoacán, Mexico City, Mexico",
            "images": {
              "file": "https://images.unsplash.com/photo-1671332045012-9a708cfb78fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxFc3RhZGlvJTIwQXp0ZWNhJTIwTWV4aWNvfGVufDF8fHx8MTc2MDcyNjY2N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/Estadio_Azteca"
            ],
            "match_numbers": [
              1,
              24,
              53,
              79,
              92
            ],
            "stage_summary": {
              "Group": 3,
              "Round of 32": 1,
              "Round of 16": 1
            },
            "matches": [
              {
                "number": 1,
                "date": "2026-06-11",
                "stage": "Group"
              },
              {
                "number": 24,
                "date": "2026-06-17",
                "stage": "Group"
              },
              {
                "number": 53,
                "date": "2026-06-24",
                "stage": "Group"
              },
              {
                "number": 79,
                "date": "2026-06-30",
                "stage": "Round of 32"
              },
              {
                "number": 92,
                "date": "2026-07-05",
                "stage": "Round of 16"
              }
            ],
            "timezone": "America/Mexico_City"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -100.24456,
              25.6689
            ]
          },
          "properties": {
            "name": "Estadio BBVA",
            "fifa_name": "Estadio Monterrey",
            "city": "Guadalupe (Monterrey)",
            "country": "Mexico",
            "capacity": 50113,
            "address": "Av. Pablo Livas 2011, La Pastora, 67140 Guadalupe, N.L., Mexico",
            "images": {
              "file": "https://images.unsplash.com/photo-1676729880091-4c6a7e36e9f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBzdGFkaXVtJTIwTW9udGVycmV5fGVufDF8fHx8MTc2MDcyNjY2OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/Estadio_BBVA"
            ],
            "match_numbers": [
              12,
              36,
              54,
              75
            ],
            "stage_summary": {
              "Group": 3,
              "Round of 32": 1
            },
            "matches": [
              {
                "number": 12,
                "date": "2026-06-14",
                "stage": "Group"
              },
              {
                "number": 36,
                "date": "2026-06-20",
                "stage": "Group"
              },
              {
                "number": 54,
                "date": "2026-06-24",
                "stage": "Group"
              },
              {
                "number": 75,
                "date": "2026-06-29",
                "stage": "Round of 32"
              }
            ],
            "timezone": "America/Monterrey"
          }
        },
        {
          "geometry": {
            "coordinates": [
              -103.4623,
              20.7033
            ]
          },
          "properties": {
            "name": "Estadio Akron",
            "fifa_name": "Estadio Guadalajara",
            "city": "Zapopan (Guadalajara)",
            "country": "Mexico",
            "capacity": 44330,
            "address": "Circuito J.V.C. 2800, El Bajío, 45014 Zapopan, Jalisco, Mexico",
            "images": {
              "file": "https://images.unsplash.com/photo-1707798178440-84403072d249?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBzdGFkaXVtJTIwR3VhZGFsYWphcmF8ZW58MXx8fHwxNzYwNzI2NjY4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            },
            "sources": [
              "https://en.wikipedia.org/wiki/Estadio_Akron"
            ],
            "match_numbers": [
              2,
              28,
              48,
              66
            ],
            "stage_summary": {
              "Group": 4
            },
            "matches": [
              {
                "number": 2,
                "date": "2026-06-11",
                "stage": "Group"
              },
              {
                "number": 28,
                "date": "2026-06-18",
                "stage": "Group"
              },
              {
                "number": 48,
                "date": "2026-06-23",
                "stage": "Group"
              },
              {
                "number": 66,
                "date": "2026-06-26",
                "stage": "Group"
              }
            ],
            "timezone": "America/Mexico_City"
          }
        }
      ]
    };
    // Store each stadium with a unique key
    for(let i = 0; i < worldCupData.features.length; i++){
      const feature = worldCupData.features[i];
      const stadium = {
        ...feature.properties,
        coordinates: feature.geometry.coordinates
      };
      const key = `worldcup_2026:stadium:${i}`;
      console.log(`Storing ${key}:`, stadium.name);
      await kv.set(key, stadium);
    }
    console.log('✅ Successfully initialized World Cup 2026 stadium data');
    return c.json({
      success: true,
      message: `Initialized ${worldCupData.features.length} World Cup 2026 stadiums`,
      count: worldCupData.features.length,
      stadiums: worldCupData.features.map((f)=>f.properties.name)
    });
  } catch (error) {
    console.error('Error initializing World Cup data:', error);
    return c.json({
      error: String(error)
    }, 500);
  }
});
// Get World Cup 2026 stadium data
app.get("/worldcup", async (c)=>{
  try {
    console.log('Fetching World Cup 2026 stadium data from KV store...');
    const stadiumKeys = await kv.getByPrefix('worldcup_2026:stadium:');
    if (!stadiumKeys || stadiumKeys.length === 0) {
      console.log('No World Cup stadium data found - needs to be initialized first');
      return c.json({
        error: 'World Cup data not found. Please initialize it first using POST /worldcup/initialize'
      }, 404);
    }
    console.log(`Successfully fetched ${stadiumKeys.length} stadiums`);
    return c.json({
      stadiums: stadiumKeys
    });
  } catch (error) {
    console.log(`Error in World Cup endpoint: ${error}`);
    return c.json({
      error: `Failed to fetch World Cup data: ${error}`
    }, 500);
  }
});
// Get weather locations with current weather and alerts - NEW SIMPLIFIED APPROACH (DEPRECATED - using line 233 instead)
/*
app.get("/weather-alt", async (c) => {
  try {
    console.log('=== FETCHING WEATHER DATA (Direct from weather_location table) ===');
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    );
    
    // Step 1: Fetch all active locations from weather_locations table
    console.log('Fetching locations from weather_locations table...');
    const { data: locations, error: locError } = await supabase
      .from('weather_locations')
      .select('*')
      .eq('is_active', true);
    
    if (locError) {
      console.error('❌ Error fetching locations:', locError);
      return c.json({ 
        success: false, 
        error: `Failed to fetch weather locations: ${locError.message}`
      }, 500);
    }
    
    if (!locations || locations.length === 0) {
      console.log('⚠️ No active weather locations found');
      return c.json([]);  // Return empty array (not an error)
    }
    
    console.log(`✅ Found ${locations.length} active locations`);
    
    // Step 2: Fetch current weather for all locations
    const locationIds = locations.map(loc => loc.id);
    console.log('Fetching current weather for location IDs:', locationIds);
    
    const { data: currentWeather, error: currentError } = await supabase
      .from('weather_current')
      .select('*')
      .in('location_id', locationIds);
    
    if (currentError) {
      console.error('⚠️ Error fetching current weather:', currentError);
      // Continue without current weather
    }
    
    // Step 3: Fetch alerts for all locations
    console.log('Fetching weather alerts...');
    const { data: alerts, error: alertsError } = await supabase
      .from('weather_alerts')
      .select('*')
      .in('location_id', locationIds);
    
    if (alertsError) {
      console.error('⚠️ Error fetching alerts:', alertsError);
      // Continue without alerts
    }
    
    // Step 4: Combine the data
    const weatherData = locations.map(location => {
      // Find current weather for this location
      const current = currentWeather?.find(w => w.location_id === location.id);
      
      // Find alerts for this location
      const locationAlerts = alerts?.filter(a => a.location_id === location.id) || [];
      
      return {
        id: location.id,
        location: location.name,
        latitude: location.lat,
        longitude: location.lon,
        admin1: location.admin1,
        country: location.country,
        current_temp: current?.temp_c,
        feels_like: current?.feels_like_c,
        current_condition: current?.condition_text,
        icon: current?.condition_icon,
        humidity: current?.humidity_percent,
        uv_index: current?.uv_index,
        last_updated: current?.last_updated,
        alerts: locationAlerts.map(alert => ({
          type: alert.event,
          description: alert.description,
          severity: alert.severity
        }))
      };
    });
    
    console.log(`✅ Successfully combined weather data for ${weatherData.length} locations`);
    return c.json(weatherData);
    
  } catch (error: any) {
    console.error('❌ Error in weather endpoint:', error);
    return c.json({ 
      success: false,
      error: error.message || String(error)
    }, 500);
  }
});
*/ // Generic table query endpoint - query any Supabase table
app.get("/table/:tableName", async (c)=>{
  try {
    const tableName = c.req.param("tableName");
    console.log(`Querying table: ${tableName}`);
    // Whitelist of allowed tables for security
    // Include all common tables from both Fusion and Nova
    const allowedTables = [
      // Weather tables
      'weather_air_quality',
      'weather_alerts',
      'weather_current',
      'weather_daily_forecast',
      'weather_hourly_forecast',
      'weather_locations',
      // KV stores
      'map_data',
      'kv_store_cbef71cf',
      // AI provider tables
      'ai_providers',
      'ai_providers_public',
      // News tables
      'news_provider_configs'
    ];
    if (!allowedTables.includes(tableName)) {
      console.warn(`Attempted to access non-whitelisted table: ${tableName}`);
      return c.json({
        error: `Table '${tableName}' is not accessible`,
        hint: 'Only specific tables are whitelisted for security',
        allowedTables
      }, 403);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? '', Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '');
    const { data, error } = await supabase.from(tableName).select("*").limit(100); // Limit to 100 rows for safety
    if (error) {
      console.error(`Error querying table ${tableName}:`, error);
      return c.json({
        error: error.message
      }, 500);
    }
    console.log(`✅ Successfully fetched ${data?.length || 0} rows from ${tableName}`);
    return c.json({
      table: tableName,
      count: data?.length || 0,
      data: data || []
    });
  } catch (error) {
    console.error(`Error in table query endpoint: ${error}`);
    console.error('Error stack:', error.stack);
    return c.json({
      error: `Failed to query table: ${error.message || error}`
    }, 500);
  }
});
// List all available tables
app.get("/tables", async (c)=>{
  try {
    console.log('=== LISTING ALL TABLES ===');
    // Comprehensive list of all known tables in the database
    // This is more reliable than trying to query information_schema through PostgREST
    const tables = [
      // AI Provider tables
      {
        name: 'ai_providers',
        description: 'AI provider configurations and API keys',
        type: 'ai'
      },
      {
        name: 'ai_providers_public',
        description: 'Public AI provider configurations',
        type: 'ai'
      },
      // News tables
      {
        name: 'news_provider_configs',
        description: 'News API provider configurations',
        type: 'news'
      },
      // Weather tables
      {
        name: 'weather_air_quality',
        description: 'Air quality data for weather locations',
        type: 'weather'
      },
      {
        name: 'weather_alerts',
        description: 'Active weather alerts and warnings',
        type: 'weather'
      },
      {
        name: 'weather_current',
        description: 'Current weather conditions',
        type: 'weather'
      },
      {
        name: 'weather_daily_forecast',
        description: 'Daily weather forecasts',
        type: 'weather'
      },
      {
        name: 'weather_hourly_forecast',
        description: 'Hourly weather forecasts',
        type: 'weather'
      },
      {
        name: 'weather_locations',
        description: 'Weather station locations',
        type: 'weather'
      },
      // KV stores
      {
        name: 'map_data',
        description: 'Key-value store (Fusion app)',
        type: 'system'
      },
      {
        name: 'kv_store_cbef71cf',
        description: 'Key-value store (Nova app)',
        type: 'system'
      }
    ];
    console.log(`✅ Returning ${tables.length} tables:`, tables.map((t)=>t.name));
    return c.json({
      tables
    });
  } catch (error) {
    console.error('❌ Error listing tables:', error);
    console.error('Error stack:', error.stack);
    return c.json({
      error: `Failed to list tables: ${error.message || error}`,
      tables: []
    }, 500);
  }
});
// AI Prompt Injector Settings - Write (POST)
app.post("/ai-settings", async (c)=>{
  try {
    console.log('=== SAVING AI PROMPT SETTINGS ===');
    const body = await c.req.json();
    const { feature, is_enabled, model, prompt_template, params, version } = body;
    if (!feature) {
      return c.json({
        error: "feature required"
      }, 400);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // upsert by feature
    const { data, error } = await supabase.from("ai_prompt_injectors").upsert({
      feature,
      is_enabled: is_enabled ?? true,
      model: model ?? null,
      prompt_template: prompt_template ?? null,
      params: params ?? {},
      version: version ?? 1,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "feature"
    }).select("*");
    if (error) {
      console.error('Error saving AI settings:', error);
      return c.json({
        error: error.message
      }, 400);
    }
    console.log('✅ Successfully saved AI settings for feature:', feature);
    return c.json({
      ok: true,
      data
    });
  } catch (error) {
    console.error('Error in AI settings endpoint:', error);
    return c.json({
      error: error.message || String(error)
    }, 500);
  }
});
// Save AI provider models list
app.post("/ai/models/:provider", async (c)=>{
  try {
    const provider = c.req.param("provider"); // 'openai' or 'gemini'
    const { models } = await c.req.json();
    if (!models || !Array.isArray(models)) {
      return c.json({
        error: "Invalid models data"
      }, 400);
    }
    const key = `ai_models:${provider}`;
    await kv.set(key, {
      models,
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Successfully saved ${models.length} models for ${provider}`);
    return c.json({
      ok: true,
      count: models.length
    });
  } catch (error) {
    console.error(`Error saving AI models: ${error}`);
    return c.json({
      error: `Failed to save AI models: ${error}`
    }, 500);
  }
});
// Get AI provider models list
app.get("/ai/models/:provider", async (c)=>{
  try {
    const provider = c.req.param("provider"); // 'openai' or 'gemini'
    const key = `ai_models:${provider}`;
    const data = await kv.get(key);
    if (!data) {
      return c.json({
        error: "Models not found"
      }, 404);
    }
    console.log(`✅ Retrieved ${data.models?.length || 0} models for ${provider}`);
    return c.json(data);
  } catch (error) {
    console.error(`Error fetching AI models: ${error}`);
    return c.json({
      error: `Failed to fetch AI models: ${error}`
    }, 500);
  }
});
// Save AI provider API key
app.post("/ai/api-key/:provider", async (c)=>{
  try {
    const provider = c.req.param("provider"); // 'openai' or 'gemini'
    const { apiKey } = await c.req.json();
    if (!apiKey || typeof apiKey !== 'string') {
      return c.json({
        error: "Invalid API key"
      }, 400);
    }
    const key = `ai_api_key:${provider}`;
    await kv.set(key, {
      apiKey,
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Successfully saved API key for ${provider}`);
    return c.json({
      ok: true
    });
  } catch (error) {
    console.error(`Error saving API key: ${error}`);
    return c.json({
      error: `Failed to save API key: ${error}`
    }, 500);
  }
});
// Get AI provider API key
app.get("/ai/api-key/:provider", async (c)=>{
  try {
    const provider = c.req.param("provider"); // 'openai' or 'gemini'
    const key = `ai_api_key:${provider}`;
    const data = await kv.get(key);
    if (!data) {
      return c.json({
        error: "API key not found"
      }, 404);
    }
    console.log(`✅ Retrieved API key for ${provider}`);
    return c.json(data);
  } catch (error) {
    console.error(`Error fetching API key: ${error}`);
    return c.json({
      error: `Failed to fetch API key: ${error}`
    }, 500);
  }
});
// Get all AI provider settings (provider, model, API keys)
app.get("/ai/provider-settings", async (c)=>{
  try {
    const key = 'ai_provider_settings';
    const data = await kv.get(key);
    if (!data) {
      return c.json({
        error: "Settings not found"
      }, 404);
    }
    console.log(`✅ Retrieved AI provider settings`);
    return c.json(data);
  } catch (error) {
    console.error(`Error fetching AI provider settings: ${error}`);
    return c.json({
      error: `Failed to fetch AI provider settings: ${error}`
    }, 500);
  }
});
// Save all AI provider settings (provider, model, API keys)
app.post("/ai/provider-settings", async (c)=>{
  try {
    const settings = await c.req.json();
    const key = 'ai_provider_settings';
    await kv.set(key, {
      ...settings,
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Successfully saved AI provider settings`);
    return c.json({
      ok: true
    });
  } catch (error) {
    console.error(`Error saving AI provider settings: ${error}`);
    return c.json({
      error: `Failed to save AI provider settings: ${error}`
    }, 500);
  }
});
// Generic KV store endpoints
// Get value from KV store
app.get("/kv/:key", async (c)=>{
  try {
    const key = c.req.param("key");
    const data = await kv.get(key);
    if (!data) {
      return c.json({
        error: "Key not found"
      }, 404);
    }
    console.log(`✅ Retrieved value for key: ${key}`);
    return c.json({
      value: data
    });
  } catch (error) {
    console.error(`Error fetching KV value: ${error}`);
    return c.json({
      error: `Failed to fetch value: ${error}`
    }, 500);
  }
});
// Set value in KV store
app.post("/kv/:key", async (c)=>{
  try {
    const key = c.req.param("key");
    const { value } = await c.req.json();
    await kv.set(key, value);
    console.log(`✅ Successfully saved value for key: ${key}`);
    return c.json({
      ok: true
    });
  } catch (error) {
    console.error(`Error saving KV value: ${error}`);
    return c.json({
      error: `Failed to save value: ${error}`
    }, 500);
  }
});
// Delete value from KV store
app.delete("/kv/:key", async (c)=>{
  try {
    const key = c.req.param("key");
    await kv.del(key);
    console.log(`✅ Successfully deleted key: ${key}`);
    return c.json({
      ok: true
    });
  } catch (error) {
    console.error(`Error deleting KV value: ${error}`);
    return c.json({
      error: `Failed to delete value: ${error}`
    }, 500);
  }
});
// Get layer descriptions
app.get("/layer-descriptions", async (c)=>{
  try {
    const layerKeys = [
      'elections',
      'population',
      'wxRadar',
      'stateInfo',
      'aiInfra',
      'worldCup'
    ];
    const descriptions = {};
    for (const layer of layerKeys){
      const key = `layer_description_${layer}`;
      const data = await kv.get(key);
      descriptions[layer] = data || '';
    }
    console.log(`✅ Retrieved layer descriptions`);
    return c.json({
      descriptions
    });
  } catch (error) {
    console.error(`Error fetching layer descriptions: ${error}`);
    return c.json({
      error: `Failed to fetch layer descriptions: ${error}`
    }, 500);
  }
});
// Save layer descriptions
app.post("/layer-descriptions", async (c)=>{
  try {
    const { descriptions } = await c.req.json();
    if (!descriptions || typeof descriptions !== 'object') {
      return c.json({
        error: "Invalid descriptions data"
      }, 400);
    }
    // Save each layer description individually
    for (const [layer, description] of Object.entries(descriptions)){
      const key = `layer_description_${layer}`;
      await kv.set(key, description);
    }
    console.log(`✅ Successfully saved layer descriptions`);
    return c.json({
      ok: true
    });
  } catch (error) {
    console.error(`Error saving layer descriptions: ${error}`);
    return c.json({
      error: `Failed to save layer descriptions: ${error}`
    }, 500);
  }
});
// Proxy endpoint for RainViewer weather radar API (to avoid CORS issues)
app.get("/weather/radar", async (c)=>{
  try {
    console.log('🌧️ Proxying RainViewer API request...');
    const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!response.ok) {
      console.error(`❌ RainViewer API returned status ${response.status}`);
      return c.json({
        error: `RainViewer API error: ${response.status}`
      }, response.status);
    }
    const data = await response.json();
    console.log('✅ Successfully fetched radar data from RainViewer');
    console.log(`  - Past frames: ${data.radar?.past?.length || 0}`);
    console.log(`  - Nowcast frames: ${data.radar?.nowcast?.length || 0}`);
    return c.json(data);
  } catch (error) {
    console.error('❌ Error proxying RainViewer API:', error);
    return c.json({
      error: `Failed to fetch radar data: ${error}`
    }, 500);
  }
});
Deno.serve(app.fetch);
