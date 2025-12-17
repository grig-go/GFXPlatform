// ============================================================================
// Weather Dashboard Edge Function
// Handles WeatherAPI + CSV providers + AI Insights safely
// ============================================================================
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
// ============================================================================
// SUPABASE CLIENT
// ============================================================================
const getSupabaseClient = ()=>createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
const supabase = getSupabaseClient();
// ============================================================================
// SERVER SETUP
// ============================================================================
const BUILD_ID = new Date().toISOString();
console.log("[weather_dashboard] boot", BUILD_ID);
const app = new Hono().basePath("/weather_dashboard");
// Disable noisy logger that breaks JSON responses
// app.use("*", logger(console.log));
app.use("*", async (c, next)=>{
  await next();
});
app.use("/*", cors({
  origin: "*",
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "Cache-Control",
    "Pragma",
    "x-client-info",
    "apikey"
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
// ============================================================================
// HELPERS
// ============================================================================
async function safeJson(c) {
  try {
    return await c.req.json();
  } catch  {
    return {};
  }
}
function jsonErr(c, status, code, detail) {
  console.error(`[${code}]`, detail ?? "");
  return c.json({
    ok: false,
    error: code,
    detail: String(detail ?? "")
  }, status);
}
function generateLocationId(name, region) {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (region) {
    const cleanRegion = region.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const shortRegion = cleanRegion.split("-")[0];
    return `${cleanName}-${shortRegion}`;
  }
  return cleanName;
}
// ============================================================================
// HEALTH
// ============================================================================
app.get("/health", (c)=>c.json({
    status: "ok",
    service: "weather_dashboard",
    build: BUILD_ID
  }));
// ============================================================================
// WEATHER LOCATIONS
// ============================================================================
// GET all locations
app.get("/locations", async (c)=>{
  try {
    const { data, error } = await supabase.from("weather_locations").select("*").eq("is_active", true).neq("provider_id", "weather_provider:news12_local") // ✅ exclude static CSV provider
    .order("name");
    if (error) return jsonErr(c, 500, "LOCATIONS_FETCH_FAILED", error.message);
    return c.json({
      ok: true,
      locations: data || []
    });
  } catch (err) {
    return jsonErr(c, 500, "LOCATIONS_FETCH_FAILED", err);
  }
});
// SEARCH locations using WeatherAPI geocoding (MUST be before /locations/:id)
app.get("/locations/search", async (c)=>{
  try {
    const query = c.req.query("q");
    if (!query) {
      return jsonErr(c, 400, "INVALID_QUERY", "Query parameter 'q' is required");
    }
    // Get active provider
    const { data: providers, error: provError } = await supabase.from("data_providers").select("*").eq("category", "weather").eq("is_active", true);
    if (provError) {
      console.error("Error fetching provider:", provError);
      return jsonErr(c, 500, "PROVIDER_FETCH_FAILED", provError.message);
    }
    // Find WeatherAPI provider
    const weatherApiProvider = providers?.find((p)=>p.type === "weatherapi" || p.name === "WeatherAPI.com");
    if (!weatherApiProvider) {
      console.error("No WeatherAPI provider found. Available providers:", providers);
      return jsonErr(c, 400, "NO_ACTIVE_PROVIDER", "No active WeatherAPI provider configured. Please configure a provider in Settings.");
    }
    console.log(`Using provider: ${weatherApiProvider.name}`);
    const apiKey = weatherApiProvider.api_key;
    if (!apiKey) {
      return jsonErr(c, 500, "API_KEY_MISSING", "WeatherAPI key not configured");
    }
    const searchUrl = `https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${query}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      throw new Error(`Weather API error: ${searchRes.status}`);
    }
    const searchResults = await searchRes.json();
    const formattedResults = searchResults.map((loc)=>{
      return {
        id: generateLocationId(loc.name, loc.region),
        name: loc.name,
        admin1: loc.region,
        country: loc.country,
        lat: loc.lat,
        lon: loc.lon,
        provider_id: weatherApiProvider.id,
        provider_name: weatherApiProvider.name,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    return c.json({
      ok: true,
      results: formattedResults
    });
  } catch (err) {
    console.error("Error searching locations:", err);
    return jsonErr(c, 500, "LOCATION_SEARCH_FAILED", err);
  }
});
// GET a single location by ID
app.get("/locations/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const { data, error } = await supabase.from("weather_locations").select("*").eq("id", id).single();
    if (error) {
      if (error.code === 'PGRST116') {
        return jsonErr(c, 404, "LOCATION_NOT_FOUND", `Location with id ${id} not found`);
      }
      return jsonErr(c, 500, "LOCATION_FETCH_FAILED", error.message);
    }
    return c.json({
      ok: true,
      location: data
    });
  } catch (err) {
    return jsonErr(c, 500, "LOCATION_FETCH_FAILED", err);
  }
});
// POST add a new location
app.post("/locations", async (c)=>{
  try {
    const body = await safeJson(c);
    const { id, name, admin1, country, lat, lon, elevation_m, stationId, provider_id, provider_name } = body;
    if (!id || !name || lat === undefined || lon === undefined) {
      return jsonErr(c, 400, "INVALID_LOCATION", "Missing required fields: id, name, lat, lon");
    }
    // Get default provider if not specified
    let finalProviderId = provider_id;
    let finalProviderName = provider_name;
    if (!finalProviderId) {
      const { data: providers, error: provError } = await supabase.from("data_providers").select("*").eq("category", "weather").eq("is_active", true);
      if (provError) {
        console.error("Error fetching provider:", provError);
        return jsonErr(c, 500, "PROVIDER_FETCH_FAILED", provError.message);
      }
      const weatherApiProvider = providers?.find((p)=>p.type === "weatherapi" || p.name === "WeatherAPI.com");
      if (weatherApiProvider) {
        finalProviderId = weatherApiProvider.id;
        finalProviderName = weatherApiProvider.name;
      }
    }
    const locationData = {
      id,
      name,
      admin1: admin1 || "",
      country: country || "",
      lat,
      lon,
      elevation_m: elevation_m || null,
      station_id: stationId || null,
      provider_id: finalProviderId,
      provider_name: finalProviderName,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    console.log(`📍 Adding location: ${name} (${lat}, ${lon})`);
    const { data, error } = await supabase.from("weather_locations").upsert(locationData, {
      onConflict: "id"
    }).select().single();
    if (error) {
      console.error("Failed to add location:", error);
      return jsonErr(c, 500, "LOCATION_ADD_FAILED", error.message);
    }
    console.log(`✅ Location added: ${name}`);
    return c.json({
      ok: true,
      location: data
    });
  } catch (err) {
    console.error("Error adding location:", err);
    return jsonErr(c, 500, "LOCATION_ADD_FAILED", err);
  }
});
// DELETE a location
app.delete("/locations/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`🗑️ Deleting location: ${id}`);
    // Delete location and all related data
    const { error: locError } = await supabase.from("weather_locations").delete().eq("id", id);
    if (locError) {
      console.error("Failed to delete location:", locError);
      return jsonErr(c, 500, "LOCATION_DELETE_FAILED", locError.message);
    }
    console.log(`✅ Location deleted: ${id}`);
    return c.json({
      ok: true,
      success: true
    });
  } catch (err) {
    console.error("Error deleting location:", err);
    return jsonErr(c, 500, "LOCATION_DELETE_FAILED", err);
  }
});
// PUT update location (for overrides like custom_name and channel assignments)
app.put("/locations/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const body = await safeJson(c);
    const { custom_name, channel_id, channel_ids } = body;
    console.log(`✏️ Updating location ${id}`, {
      custom_name,
      channel_id,
      channel_ids
    });
    const updateData = {
      updated_at: new Date().toISOString()
    };
    if (custom_name !== undefined) {
      updateData.custom_name = custom_name || null;
    }
    // Handle legacy single channel_id (for backward compatibility)
    if (channel_id !== undefined && channel_ids === undefined) {
      updateData.channel_id = channel_id || null;
      console.log(`🔗 ${channel_id ? 'Assigning' : 'Unassigning'} single channel for location ${id}`);
    }
    const { data, error } = await supabase.from("weather_locations").update(updateData).eq("id", id).select().single();
    if (error) {
      console.error("Failed to update location:", error);
      return jsonErr(c, 500, "LOCATION_UPDATE_FAILED", error.message);
    }
    // Handle multiple channel assignments via junction table
    if (channel_ids !== undefined) {
      console.log(`📺 Updating channel assignments for location ${id}:`, channel_ids);
      // First, delete all existing channel assignments for this location
      const { error: deleteError } = await supabase
        .from("weather_location_channels")
        .delete()
        .eq("location_id", id);
      if (deleteError) {
        console.error("Failed to clear existing channel assignments:", deleteError);
        return jsonErr(c, 500, "CHANNEL_ASSIGNMENT_FAILED", deleteError.message);
      }
      // Then, insert new channel assignments
      if (channel_ids.length > 0) {
        const channelAssignments = channel_ids.map((channelId: string) => ({
          location_id: id,
          channel_id: channelId
        }));
        const { error: insertError } = await supabase
          .from("weather_location_channels")
          .insert(channelAssignments);
        if (insertError) {
          console.error("Failed to insert channel assignments:", insertError);
          return jsonErr(c, 500, "CHANNEL_ASSIGNMENT_FAILED", insertError.message);
        }
      }
      // Also update the legacy channel_id field with the first channel (for backward compatibility)
      const primaryChannelId = channel_ids.length > 0 ? channel_ids[0] : null;
      await supabase
        .from("weather_locations")
        .update({ channel_id: primaryChannelId })
        .eq("id", id);
      console.log(`✅ Updated ${channel_ids.length} channel assignment(s) for location ${id}`);
    }
    // Fetch the updated channel assignments
    const { data: channelAssignments } = await supabase
      .from("weather_location_channels")
      .select("channel_id")
      .eq("location_id", id);
    const assignedChannelIds = channelAssignments?.map(a => a.channel_id) || [];
    console.log(`✅ Location updated: ${id}`);
    return c.json({
      ok: true,
      location: {
        ...data,
        channel_ids: assignedChannelIds
      }
    });
  } catch (err) {
    console.error("Error updating location:", err);
    return jsonErr(c, 500, "LOCATION_UPDATE_FAILED", err);
  }
});
// ============================================================================
// WEATHER DATA FETCH & UPSERT (Multi-provider, skips CSV / News12 providers)
// ============================================================================
async function fetchWeatherAPI(provider, locations) {
  const apiKey = provider.api_key;
  if (!apiKey) {
    console.error(`⚠️ API key missing for ${provider.name}`);
    return [];
  }
  const results = await Promise.all(locations.map(async (loc)=>{
    try {
      const { id, lat, lon, name, custom_name, admin1, country, channel_id } = loc;
      if (!lat || !lon || lat === 0 || lon === 0) {
        console.warn(`[skip] ${name}: invalid lat/lon (${lat}, ${lon})`);
        return {
          success: false,
          name,
          reason: "invalid lat/lon"
        };
      }
      console.log(`🌤️ Fetching WeatherAPI for ${name} (${lat},${lon})`);
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${lat},${lon}&days=14&aqi=yes&alerts=yes`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`WeatherAPI error: ${res.status}`);
      const forecast = await res.json();
      const current = forecast.current;
      const location = forecast.location;
      // UPSERT current weather — unified CSV-style schema
      // ============================================================================
      const { error: currentErr } = await supabase.from("weather_current").upsert({
        location_id: id,
        as_of: new Date(current.last_updated).toISOString(),
        summary: current.condition.text,
        icon: current.condition.icon,
        temperature_value: current.temp_f,
        temperature_unit: "°F",
        feels_like_value: current.feelslike_f,
        feels_like_unit: "°F",
        dew_point_value: current.dewpoint_c ?? null,
        dew_point_unit: "°C",
        humidity: current.humidity,
        pressure_value: current.pressure_mb,
        pressure_unit: "mb",
        cloud_cover: current.cloud,
        uv_index: current.uv,
        visibility_value: current.vis_miles,
        visibility_unit: "mi",
        wind_speed_value: current.wind_mph,
        wind_speed_unit: "mph",
        wind_gust_value: current.gust_mph ?? null,
        wind_gust_unit: "mph",
        wind_direction_deg: current.wind_degree,
        wind_direction_cardinal: current.wind_dir,
        precip_last_hr_value: current.precip_mm,
        precip_last_hr_unit: "mm",
        provider_id: provider.id,
        provider_type: "weatherapi",
        admin1: admin1 || location.region,
        country: country || location.country,
        lat,
        lon,
        name,
        fetched_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: "location_id"
      });
      if (currentErr) {
        console.error(`❌ weather_current upsert failed for ${name}:`, currentErr);
      } else {
        console.log(`✅ weather_current upserted for ${name}`);
      }
      // ============================================================================
      // UPSERT AIR QUALITY (aligned to weather_air_quality schema)
      // ============================================================================
      if (current?.air_quality) {
        try {
          const aq = current.air_quality;
          // Calculate AQI and category
          const aqi = Math.round(aq["us-epa-index"] || aq["gb-defra-index"] || 0);
          const aqiCategory = aqi === 1 ? "Good" : aqi === 2 ? "Moderate" : aqi === 3 ? "Unhealthy for Sensitive Groups" : aqi === 4 ? "Unhealthy" : aqi === 5 ? "Very Unhealthy" : aqi === 6 ? "Hazardous" : "Unknown";
          console.log(`💨 Inserting air quality for ${name}: AQI ${aqi} (${aqiCategory})`);
          const { error: aqError } = await supabase.from("weather_air_quality").upsert({
            location_id: id,
            as_of: new Date(current.last_updated),
            aqi,
            aqi_category: aqiCategory,
            aqi_standard: "US EPA",
            pm25: aq.pm2_5 ?? null,
            pm10: aq.pm10 ?? null,
            o3: aq.o3 ?? null,
            no2: aq.no2 ?? null,
            so2: aq.so2 ?? null,
            co: aq.co ?? null,
            pollen_tree: null,
            pollen_grass: null,
            pollen_weed: null,
            pollen_risk: null,
            fetched_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: "location_id,as_of"
          });
          if (aqError) {
            console.error(`❌ Failed to save air quality for ${name}:`, aqError);
          } else {
            console.log(`✅ Air quality saved for ${name}`);
          }
        } catch (err) {
          console.error(`❌ Exception saving air quality for ${name}:`, err);
        }
      } else {
        console.log(`⚠️ No air quality data available for ${name}`);
      }
      // ============================================================================
      // HOURLY FORECAST UPSERT (aligned to table structure)
      // ============================================================================
      if (forecast?.forecast?.forecastday?.length) {
        const hourlyItems = forecast.forecast.forecastday.flatMap((d)=>d.hour.map((h)=>({
              location_id: id,
              forecast_time: new Date(h.time),
              summary: h.condition.text,
              icon: h.condition.icon,
              condition_text: h.condition.text,
              condition_icon: h.condition.icon,
              temp_c: h.temp_c,
              temp_f: h.temp_f,
              temperature_value: h.temp_f,
              temperature_unit: "F",
              feels_like_value: h.feelslike_f,
              feels_like_unit: "F",
              dew_point_value: h.dewpoint_c,
              dew_point_unit: "C",
              humidity: h.humidity,
              cloud_cover: h.cloud,
              uv_index: Math.round(h.uv),
              visibility_value: h.vis_km,
              visibility_unit: "km",
              wind_speed_value: h.wind_kph,
              wind_speed_unit: "kph",
              wind_gust_value: h.gust_kph,
              wind_gust_unit: "kph",
              wind_direction_deg: h.wind_degree,
              wind_dir: h.wind_dir,
              pressure_value: h.pressure_mb,
              pressure_unit: "mb",
              precip_probability: h.chance_of_rain,
              precip_intensity_value: h.precip_mm,
              precip_intensity_unit: "mm",
              precip_mm: h.precip_mm,
              provider_id: provider.id,
              provider_type: provider.type,
              fetched_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })));
        if (hourlyItems.length > 0) {
          console.log(`💾 Inserting ${hourlyItems.length} hourly forecast rows for ${name}`);
          const { error: hourlyErr } = await supabase.from("weather_hourly_forecast").upsert(hourlyItems, {
            onConflict: "location_id,forecast_time"
          });
          if (hourlyErr) console.error("❌ Hourly upsert failed:", hourlyErr);
        }
      }
      // ============================================================================
      // ============================================================================
      // 🗓️ UPSERT daily forecast — unified CSV-style schema (with safe time parser)
      // ============================================================================
      // Helper: safely parse "6:15 AM" or "07:45 PM" into ISO date string
      function parseAstroTime(baseDate, timeStr) {
        try {
          if (!baseDate || !timeStr || typeof timeStr !== "string") return null;
          const trimmed = timeStr.trim();
          if (!trimmed.match(/\d/)) return null; // skip invalid strings
          const [time, modifier] = trimmed.split(" ");
          if (!time || !modifier) return null;
          let [hours, minutes] = time.split(":").map(Number);
          if (isNaN(hours)) return null;
          if (modifier.toUpperCase() === "PM" && hours < 12) hours += 12;
          if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;
          const [year, month, day] = baseDate.split("-").map(Number);
          const parsed = new Date(year, month - 1, day, hours, minutes || 0);
          return isNaN(parsed.getTime()) ? null : parsed.toISOString();
        } catch  {
          return null;
        }
      }
      const dailyItems = (forecast.forecast?.forecastday || []).map((d)=>{
        const dayData = d.day || {};
        const astro = d.astro || {};
        return {
          location_id: id,
          forecast_date: d.date,
          summary: dayData.condition?.text || null,
          icon: dayData.condition?.icon || null,
          temp_max_value: dayData.maxtemp_f ?? null,
          temp_max_unit: "°F",
          temp_min_value: dayData.mintemp_f ?? null,
          temp_min_unit: "°F",
          precip_probability: (dayData.daily_chance_of_rain ?? 0) / 100,
          uv_index_max: dayData.uv ?? null,
          humidity: dayData.avghumidity ?? null,
          pressure_value: dayData.pressure_mb ?? null,
          pressure_unit: "mb",
          visibility_value: dayData.avgvis_miles ?? null,
          visibility_unit: "mi",
          wind_speed_value: dayData.maxwind_mph ?? null,
          wind_speed_unit: "mph",
          wind_direction_deg: dayData.wind_degree ?? null,
          wind_direction_cardinal: dayData.wind_dir || null,
          sunrise: parseAstroTime(d.date, astro.sunrise),
          sunset: parseAstroTime(d.date, astro.sunset),
          moon_phase: astro.moon_phase || null,
          moon_illumination: astro.moon_illumination || null,
          provider_id: provider.id,
          provider_type: "weatherapi",
          fetched_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
      if (dailyItems.length > 0) {
        console.log(`💾 Inserting ${dailyItems.length} daily forecast rows for ${name}`);
        const { error: dailyErr } = await supabase.from("weather_daily_forecast").upsert(dailyItems, {
          onConflict: "location_id,forecast_date,provider_id"
        });
        if (dailyErr) {
          console.error(`❌ weather_daily_forecast upsert failed for ${name}:`, {
            message: dailyErr.message || dailyErr,
            hint: dailyErr.hint || "",
            details: dailyErr.details || "",
            code: dailyErr.code || "",
            dataPreview: dailyItems?.[0] || {}
          });
        } else {
          console.log(`✅ weather_daily_forecast upserted for ${name}`);
        }
      }
      // UPSERT alerts (unchanged)
      // ============================================================================
      const alertItems = forecast.alerts?.alert?.map((a)=>{
        const alertId = `${id}_${a.event}_${a.effective}`;
        return {
          id: alertId,
          location_id: id,
          event: a.event,
          headline: a.headline,
          description: a.desc,
          severity: a.severity,
          urgency: a.urgency,
          certainty: a.certainty,
          areas: a.areas ? [
            a.areas
          ] : [],
          start_time: a.effective,
          end_time: a.expires,
          source: "WeatherAPI",
          instruction: a.instruction || "",
          links: [],
          provider_id: provider.id,
          provider_type: "weatherapi",
          fetched_at: new Date().toISOString()
        };
      }) || [];
      if (alertItems.length > 0) {
        await supabase.from("weather_alerts").upsert(alertItems, {
          onConflict: "id"
        });
      }
      // Build location name field with override support
      // ============================================================================
      const locationNameField = custom_name ? {
        originalValue: name,
        overriddenValue: custom_name,
        isOverridden: true
      } : name;
      // Return data in the format frontend expects
      // ============================================================================
      return {
        success: true,
        name,
        data: {
          location: {
            id,
            name: locationNameField,
            admin1: admin1 || location.region,
            country: country || location.country,
            lat,
            lon,
            provider_id: loc.provider_id,
            provider_name: loc.provider_name || provider.name,
            channel_id: channel_id || null
          },
          data: {
            locationProvider: loc.provider_name || provider.name,
            current: {
              asOf: current.last_updated,
              temperature: {
                value: current.temp_f,
                unit: "°F"
              },
              feelsLike: {
                value: current.feelslike_f,
                unit: "°F"
              },
              humidity: current.humidity,
              uvIndex: current.uv,
              summary: current.condition.text,
              icon: current.condition.text.toLowerCase(),
              wind: {
                speed: {
                  value: current.wind_mph,
                  unit: "mph"
                },
                direction_deg: current.wind_degree,
                direction_cardinal: current.wind_dir
              },
              pressure: {
                value: current.pressure_in,
                unit: "in"
              },
              visibility: {
                value: current.vis_miles,
                unit: "mi"
              },
              cloudCover: current.cloud,
              airQuality: current.air_quality ? {
                aqi: Math.round(current.air_quality["us-epa-index"] || 0),
                category: "Good",
                standard: "US EPA",
                pm25: current.air_quality.pm2_5,
                pm10: current.air_quality.pm10,
                o3: current.air_quality.o3,
                no2: current.air_quality.no2,
                so2: current.air_quality.so2,
                co: current.air_quality.co
              } : null
            },
            hourly: {
              items: forecast.forecast.forecastday[0]?.hour?.slice(0, 24).map((h)=>({
                  time: h.time,
                  temperature: {
                    value: h.temp_f,
                    unit: "°F"
                  },
                  icon: h.condition.text.toLowerCase(),
                  precipProbability: h.chance_of_rain / 100
                })) || [],
              stepHours: 1
            },
            daily: {
              items: forecast.forecast.forecastday?.map((d)=>({
                  date: d.date,
                  summary: d.day.condition.text,
                  icon: d.day.condition.text.toLowerCase(),
                  tempMax: {
                    value: d.day.maxtemp_f,
                    unit: "°F"
                  },
                  tempMin: {
                    value: d.day.mintemp_f,
                    unit: "°F"
                  },
                  precipProbability: d.day.daily_chance_of_rain / 100
                })) || []
            },
            alerts: forecast.alerts?.alert?.map((a)=>({
                event: a.event,
                headline: a.headline,
                description: a.desc,
                severity: a.severity,
                urgency: a.urgency,
                areas: [
                  a.areas
                ],
                start: a.effective,
                end: a.expires,
                source: "WeatherAPI"
              })) || []
          }
        }
      };
    } catch (err) {
      // ✅ Capture detailed cause and return structured info
      console.error(`❌ Weather fetch failed for ${loc.name}:`, err);
      let reasonText = "Unknown error during fetch";
      try {
        if (typeof err === "string") {
          reasonText = err;
        } else if (err?.message) {
          reasonText = err.message;
        } else {
          reasonText = JSON.stringify(err, Object.getOwnPropertyNames(err));
        }
      } catch (e) {
        reasonText = "[Error stringification failed]";
      }
      return {
        success: false,
        name: loc.name,
        reason: reasonText,
        error: {
          stack: err?.stack || null,
          type: err?.name || "Error",
          raw: err
        }
      };
    }
  }));
  // ✅ Log a summary if any failed
  const failed = results.filter((r)=>!r.success);
  if (failed.length > 0) {
    console.warn(`⚠️ ${failed.length} failed fetch(es):`);
    failed.forEach((f, i)=>{
      console.warn(`  ${i + 1}. ${f.name} — ${f.reason}`);
    });
  }
  return results;
}
// ============================================================================
// Fetch weather data from database tables (for CSV/other providers)
// ============================================================================
async function fetchFromDatabase(locations) {
  const results = await Promise.all(locations.map(async (loc)=>{
    try {
      const { id, lat, lon, name, custom_name, admin1, country, provider_id, channel_id } = loc;
      console.log(`📊 Fetching data from DB for ${name} (${id})`);
      // Fetch current weather
      const { data: currentData } = await supabase.from("weather_current").select("*").eq("location_id", id).single();
      // Fetch hourly forecast (next 24 hours)
      const { data: hourlyData } = await supabase.from("weather_hourly_forecast").select("*").eq("location_id", id).gte("forecast_time", new Date().toISOString()).order("forecast_time").limit(24);
      // Fetch daily forecast
      const { data: dailyData } = await supabase.from("weather_daily_forecast").select("*").eq("location_id", id).gte("forecast_date", new Date().toISOString().split('T')[0]).order("forecast_date").limit(14);
      // Fetch alerts
      const { data: alertsData } = await supabase.from("weather_alerts").select("*").eq("location_id", id).gte("end_time", new Date().toISOString()).order("start_time");
      // Fetch air quality
      const { data: aqData } = await supabase.from("weather_air_quality").select("*").eq("location_id", id).single();
      // Build location name field with override support
      const locationNameField = custom_name ? {
        originalValue: name,
        overriddenValue: custom_name,
        isOverridden: true
      } : name;
      // Helper function to get temperature value (handles both schemas)
      const getTemp = (data, fahrenheitField, valueField)=>{
        // WeatherAPI schema uses temp_f, feels_like_f, etc.
        if (data[fahrenheitField] !== undefined && data[fahrenheitField] !== null) {
          return data[fahrenheitField];
        }
        // CSV schema uses temperature_value, feels_like_value, etc.
        if (data[valueField] !== undefined && data[valueField] !== null) {
          return data[valueField];
        }
        return null;
      };
      // Helper function to get wind speed
      const getWindSpeed = (data)=>{
        if (data.wind_mph !== undefined && data.wind_mph !== null) {
          return data.wind_mph; // WeatherAPI schema
        }
        if (data.wind_speed_value !== undefined && data.wind_speed_value !== null) {
          return data.wind_speed_value; // CSV schema
        }
        return null;
      };
      // Helper function to get wind direction
      const getWindDirection = (data)=>{
        if (data.wind_direction !== undefined && data.wind_direction !== null) {
          return data.wind_direction; // WeatherAPI schema
        }
        if (data.wind_direction_cardinal !== undefined && data.wind_direction_cardinal !== null) {
          return data.wind_direction_cardinal; // CSV schema
        }
        return null;
      };
      // Helper function to get pressure
      const getPressure = (data)=>{
        if (data.pressure_in !== undefined && data.pressure_in !== null) {
          return data.pressure_in; // WeatherAPI schema
        }
        if (data.pressure_value !== undefined && data.pressure_value !== null) {
          return data.pressure_value; // CSV schema
        }
        return null;
      };
      // Helper function to get visibility
      const getVisibility = (data)=>{
        if (data.visibility_miles !== undefined && data.visibility_miles !== null) {
          return data.visibility_miles; // WeatherAPI schema
        }
        if (data.visibility_value !== undefined && data.visibility_value !== null) {
          return data.visibility_value; // CSV schema
        }
        return null;
      };
      return {
        success: true,
        name,
        data: {
          location: {
            id,
            name: locationNameField,
            admin1: admin1 || "",
            country: country || "",
            lat,
            lon,
            provider_id,
            provider_name: loc.provider_name,
            channel_id: channel_id || null
          },
          data: {
            locationProvider: loc.provider_name,
            current: currentData ? {
              asOf: currentData.timestamp || currentData.as_of,
              temperature: {
                value: getTemp(currentData, 'temp_f', 'temperature_value'),
                unit: "°F"
              },
              feelsLike: {
                value: getTemp(currentData, 'feels_like_f', 'feels_like_value'),
                unit: "°F"
              },
              humidity: currentData.humidity,
              uvIndex: currentData.uv_index,
              summary: currentData.condition_text || currentData.summary,
              icon: (currentData.condition_text || currentData.summary || "")?.toLowerCase(),
              wind: {
                speed: {
                  value: getWindSpeed(currentData),
                  unit: "mph"
                },
                direction_deg: currentData.wind_degree || currentData.wind_direction_deg,
                direction_cardinal: getWindDirection(currentData)
              },
              pressure: {
                value: getPressure(currentData),
                unit: "in"
              },
              visibility: {
                value: getVisibility(currentData),
                unit: "mi"
              },
              cloudCover: currentData.cloud_cover,
              airQuality: aqData ? {
                aqi: aqData.aqi,
                category: aqData.category || "Good",
                standard: aqData.standard || "US EPA",
                pm25: aqData.pm25,
                pm10: aqData.pm10,
                o3: aqData.o3,
                no2: aqData.no2,
                so2: aqData.so2,
                co: aqData.co
              } : null
            } : null,
            hourly: {
              items: (hourlyData || []).map((h)=>({
                  time: h.forecast_time,
                  temperature: {
                    value: getTemp(h, 'temp_f', 'temperature_value'),
                    unit: "°F"
                  },
                  icon: (h.condition_text || h.summary || "")?.toLowerCase(),
                  precipProbability: h.precip_probability || 0
                })),
              stepHours: 1
            },
            daily: {
              items: (dailyData || []).map((d)=>({
                  date: d.forecast_date,
                  summary: d.condition_text || d.summary,
                  icon: (d.condition_text || d.summary || "")?.toLowerCase(),
                  tempMax: {
                    value: getTemp(d, 'temp_max_f', 'temp_max_value'),
                    unit: "°F"
                  },
                  tempMin: {
                    value: getTemp(d, 'temp_min_f', 'temp_min_value'),
                    unit: "°F"
                  },
                  precipProbability: d.precip_probability || 0
                }))
            },
            alerts: (alertsData || []).map((a)=>({
                event: a.event,
                headline: a.headline,
                description: a.description,
                severity: a.severity,
                urgency: a.urgency,
                areas: a.areas || [],
                start: a.start_time,
                end: a.end_time,
                source: a.source || "Unknown"
              }))
          }
        }
      };
    } catch (err) {
      console.error(`❌ Failed to fetch data from DB for ${loc.name}:`, err);
      return {
        success: false,
        name: loc.name,
        error: String(err)
      };
    }
  }));
  return results;
}
// ============================================================================
// GET /weather-data — Fetch all active providers + all locations
// ============================================================================
app.get("/weather-data", async (c)=>{
  try {
    // ============================================================================
    // SUPPORT FOR provider_id FROM SCHEDULER
    // ============================================================================
    const url = new URL(c.req.url);
    const providerId = url.searchParams.get("provider_id");
    if (providerId) {
      console.log(`🚀 Ingest triggered for specific provider: ${providerId}`);
    } else {
      console.log(`🌍 Ingest triggered for ALL active providers`);
    }
    // ============================================================================
    // 📡 Fetch provider(s)
    // ============================================================================
    let providers = [];
    if (providerId) {
      console.log(`🎯 Fetching data only for provider: ${providerId}`);
      const { data: singleProvider, error: provError } = await supabase.from("data_providers").select("*").eq("id", providerId).eq("is_active", true).maybeSingle();
      if (provError || !singleProvider) {
        console.error("❌ Provider fetch failed or not found:", provError?.message);
        return jsonErr(c, 404, "PROVIDER_NOT_FOUND", provError?.message || "Provider not found");
      }
      providers = [
        singleProvider
      ];
    } else {
      console.log("🌍 Fetching all active weather providers...");
      const { data: allProviders, error: provError } = await supabase.from("data_providers").select("*").eq("category", "weather").eq("is_active", true);
      if (provError) {
        console.error("❌ Error fetching all providers:", provError.message);
        return jsonErr(c, 500, "PROVIDERS_FETCH_FAILED", provError.message);
      }
      providers = allProviders || [];
    }
    if (!providers.length) {
      return jsonErr(c, 400, "NO_PROVIDERS", "No active weather providers configured.");
    }
    console.log(`✅ Found ${providers.length} active weather provider(s) to process.`);
    console.log(`🔍 Found ${providers.length} active weather providers`);
    // ✅ Fetch ALL active locations (including CSV/News12)
    const { data: allLocations, error: locError } = await supabase.from("weather_locations").select("*").eq("is_active", true).order("name");
    if (locError) {
      console.error("Error fetching locations:", locError);
      return jsonErr(c, 500, "LOCATIONS_FETCH_FAILED", locError.message);
    }
    if (!allLocations?.length) {
      console.log("⚠️ No active weather locations found");
      return c.json({
        ok: true,
        providers: [],
        locationsProcessed: 0,
        data: []
      });
    }
    console.log(`📍 Found ${allLocations.length} total active locations`);
    // Group by provider_id for efficiency
    const grouped = allLocations.reduce((acc, loc)=>{
      if (!acc[loc.provider_id]) acc[loc.provider_id] = [];
      acc[loc.provider_id].push(loc);
      return acc;
    }, {});
    const allResults = [];
    // Loop through each provider and its matching locations
    for (const provider of providers){
      const locations = grouped[provider.id] || [];
      console.log(`🌐 Processing provider ${provider.name} (${provider.type}) with ${locations.length} locations`);
      if (!locations.length) continue;
      let results = [];
      switch(provider.type){
        case "weatherapi":
          // Fetch from WeatherAPI and save to database
          results = await fetchWeatherAPI(provider, locations);
          break;
        case "csv":
          // Fetch from database only (CSV data already imported)
          console.log(`📄 Fetching CSV provider (${provider.name}) data from database`);
          results = await fetchFromDatabase(locations);
          break;
        default:
          console.warn(`⚠️ No fetch logic yet for provider type: ${provider.type}`);
          // Default: try to fetch from database
          results = await fetchFromDatabase(locations);
      }
      allResults.push(...results);
    }
    // Combine and report
    const successful = allResults.filter((r)=>r.success);
    const failed = allResults.filter((r)=>!r.success);
    console.log(`✅ Weather fetch complete: ${successful.length}/${allResults.length} successful`);
    if (failed.length > 0) {
      console.warn(`⚠️ ${failed.length} Failed location(s):`);
      failed.forEach((f, i)=>{
        console.warn(`  ${i + 1}. ${f.name} — ${f.error || f.reason || "Unknown error"}`);
      });
      // Optional: print compact JSON line for visibility in Supabase logs
      console.warn("⚠️ Failed locations (details):", JSON.stringify(failed.map((f)=>({
          name: f.name,
          reason: f.reason || f.error || "Unknown error"
        })), null, 2));
    }
    return c.json({
      ok: true,
      providers: providers.map((p)=>p.name),
      locationsProcessed: allLocations.length,
      data: successful.map((r)=>r.data)
    });
  } catch (error) {
    console.error("❌ WEATHER_DATA_FETCH_FAILED:", error);
    return jsonErr(c, 500, "WEATHER_DATA_FETCH_FAILED", error);
  }
});
// ============================================================================
// PROVIDERS
// ============================================================================
app.get("/providers", async (c)=>{
  try {
    const { data, error } = await supabase.from("data_providers").select("*").eq("category", "weather").order("name");
    if (error) return jsonErr(c, 500, "PROVIDERS_FETCH_FAILED", error.message);
    const formatted = (data || []).map((p)=>({
        id: p.id,
        name: p.name,
        type: p.type,
        isActive: p.is_active,
        source_url: p.source_url,
        language: p.metadata?.language || "en",
        temperatureUnit: p.metadata?.temperature_unit || "f",
        metadata: p.metadata || {}
      }));
    return c.json({
      ok: true,
      providers: formatted
    });
  } catch (err) {
    return jsonErr(c, 500, "PROVIDERS_FETCH_FAILED", err);
  }
});
// POST/PUT provider (for updating API keys, settings, etc.)
app.post("/providers", async (c)=>{
  try {
    const body = await safeJson(c);
    const { id, name, type, source_url, is_active, metadata } = body;
    if (!id || !name || !type) {
      return jsonErr(c, 400, "INVALID_PROVIDER", "Missing required fields: id, name, type");
    }
    const providerData = {
      id,
      name,
      type,
      category: "weather",
      source_url: source_url || null,
      is_active: is_active ?? true,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from("data_providers").upsert(providerData, {
      onConflict: "id"
    }).select().single();
    if (error) return jsonErr(c, 500, "PROVIDER_SAVE_FAILED", error.message);
    return c.json({
      ok: true,
      provider: data
    });
  } catch (err) {
    return jsonErr(c, 500, "PROVIDER_SAVE_FAILED", err);
  }
});
app.put("/providers", async (c)=>{
  // Reuse POST logic for PUT
  return app.post("/providers", c);
});
// ============================================================================
// CHANNELS (for assigning to weather locations)
// ============================================================================
app.get("/channels", async (c)=>{
  try {
    console.log("📺 Fetching channels list for weather location assignment");
    const { data, error } = await supabase.from("channels").select("id, name").eq("active", true).order("name");
    if (error) {
      console.error("Failed to fetch channels:", error);
      return jsonErr(c, 500, "CHANNELS_FETCH_FAILED", error.message);
    }
    console.log(`✅ Found ${data?.length || 0} active channels`);
    return c.json({
      ok: true,
      channels: data || []
    });
  } catch (err) {
    console.error("Error fetching channels:", err);
    return jsonErr(c, 500, "CHANNELS_FETCH_FAILED", err);
  }
});

// GET channel assignments for a specific location
app.get("/locations/:id/channels", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`📺 Fetching channel assignments for location ${id}`);

    const { data, error } = await supabase
      .from("weather_location_channels")
      .select("channel_id, channels(id, name)")
      .eq("location_id", id);

    if (error) {
      console.error("Failed to fetch channel assignments:", error);
      return jsonErr(c, 500, "CHANNEL_ASSIGNMENTS_FETCH_FAILED", error.message);
    }

    const channels = data?.map((item: any) => ({
      id: item.channel_id,
      name: item.channels?.name || 'Unknown'
    })) || [];

    console.log(`✅ Found ${channels.length} channel assignment(s) for location ${id}`);
    return c.json({
      ok: true,
      channel_ids: channels.map((ch: any) => ch.id),
      channels: channels
    });
  } catch (err) {
    console.error("Error fetching channel assignments:", err);
    return jsonErr(c, 500, "CHANNEL_ASSIGNMENTS_FETCH_FAILED", err);
  }
});
// ============================================================================
// TEST PROVIDER
// ============================================================================
app.post("/test-provider", async (c)=>{
  try {
    const body = await safeJson(c);
    const { type, api_key, base_url, config } = body;
    if (!api_key || !base_url) {
      return jsonErr(c, 400, "MISSING_FIELDS", "api_key and base_url are required");
    }
    const providerConfig = config || {};
    const language = providerConfig.language || "en";
    const temperatureUnit = (providerConfig.temperatureUnit || "f").toLowerCase();
    const tempSuffix = temperatureUnit === "c" ? "_c" : "_f";
    const tempUnitSymbol = temperatureUnit === "c" ? "°C" : "°F";
    console.log(`🌤️ Testing weather provider with unit: ${temperatureUnit.toUpperCase()} (${tempUnitSymbol})`);
    // Test with London coordinates
    const testUrl = `${base_url}/forecast.json?key=${api_key}&q=51.5074,-0.1278&days=3&aqi=no&alerts=no&lang=${language}`;
    console.log(`🌤️ Weather test URL: ${testUrl.replace(api_key, "***")}`);
    const res = await fetch(testUrl, {
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      const txt = await res.text();
      return c.json({
        success: false,
        message: `Weather API returned HTTP ${res.status}`,
        details: txt.substring(0, 200)
      });
    }
    const data = await res.json();
    const currentData = data.current || {};
    const location = data.location || {};
    const forecast = data.forecast?.forecastday || [];
    const result = {
      location: {
        name: location.name,
        region: location.region,
        country: location.country,
        lat: location.lat,
        lon: location.lon,
        localtime: location.localtime
      },
      current: {
        condition: currentData.condition?.text,
        icon: currentData.condition?.icon,
        temperature: currentData[`temp${tempSuffix}`],
        feelsLike: currentData[`feelslike${tempSuffix}`],
        dewPoint: currentData[`dewpoint${tempSuffix}`] || 0,
        wind: {
          speed: currentData.wind_mph || currentData.wind_kph,
          direction: currentData.wind_dir
        },
        humidity: currentData.humidity,
        pressure: currentData.pressure_mb,
        uv: currentData.uv
      },
      forecast: forecast.map((day)=>({
          date: day.date,
          day: {
            condition: day.day.condition?.text,
            icon: day.day.condition?.icon,
            tempMax: day.day[`maxtemp${tempSuffix}`],
            tempMin: day.day[`mintemp${tempSuffix}`],
            humidity: day.day.avghumidity,
            rainChance: day.day.daily_chance_of_rain
          },
          hours: (day.hour || []).map((hour)=>({
              time: hour.time,
              condition: hour.condition?.text,
              icon: hour.condition?.icon,
              temperature: hour[`temp${tempSuffix}`],
              feelsLike: hour[`feelslike${tempSuffix}`],
              dewPoint: hour[`dewpoint${tempSuffix}`] || 0,
              humidity: hour.humidity,
              wind: {
                speed: hour.wind_mph || hour.wind_kph,
                direction: hour.wind_dir
              },
              rainChance: hour.chance_of_rain
            }))
        }))
    };
    return c.json({
      success: true,
      message: "Weather provider OK",
      details: {
        ...result,
        providerSettings: {
          temperatureUnit,
          language
        }
      }
    });
  } catch (error) {
    console.error("Weather provider test error:", error);
    return c.json({
      success: false,
      message: `Weather API test failed: ${error.message}`,
      details: error.stack
    });
  }
});
// ============================================================================
// AI INSIGHTS - MIGRATED TO ai_insights EDGE FUNCTION
// ============================================================================
// All weather AI insights routes have been migrated to the ai_insights edge function.
// Use the following endpoints instead:
//   GET    /functions/v1/ai_insights/weather
//   POST   /functions/v1/ai_insights/weather
//   DELETE /functions/v1/ai_insights/weather/:id
// ============================================================================
// ============================================================================
// WEATHER CSV INGEST (News12 format — with timestamp + dedupe fix)
// Supports: source_url (direct URL) or local_file_path (via FILE_SERVER_URL)
// ============================================================================
const FILE_SERVER_URL = Deno.env.get("FILE_SERVER_URL");

app.get("/weather-data-csv", async (c)=>{
  try {
    console.log("🌦️ [CSV] Starting ingestion (News12 with time/dedupe fixes)");
    // 1️⃣ Load provider
    const { data: providers, error: provErr } = await supabase.from("data_providers").select("*").eq("category", "weather").eq("type", "csv").eq("is_active", true);
    if (provErr) throw new Error(provErr.message);
    const provider = providers?.[0];

    // Check for local_file_path in config (preferred) or fall back to source_url
    const config = typeof provider?.config === "string" ? JSON.parse(provider.config) : provider?.config || {};
    const localFilePath = config.local_file_path;

    if (!localFilePath && !provider?.source_url) {
      throw new Error("No active CSV provider with source_url or local_file_path configured");
    }

    // 2️⃣ Fetch CSV - either from file server or direct URL
    let csvText: string;

    if (localFilePath && FILE_SERVER_URL) {
      // Fetch from local file server via GET request
      const fileUrl = `${FILE_SERVER_URL.replace(/\/$/, '')}/${localFilePath.replace(/^\//, '')}`;
      console.log(`📁 Fetching CSV from file server: ${fileUrl}`);
      const fileServerRes = await fetch(fileUrl);

      if (!fileServerRes.ok) {
        throw new Error(`File server error: ${fileServerRes.status} ${fileServerRes.statusText}`);
      }

      csvText = await fileServerRes.text();
      console.log(`✅ Loaded ${csvText.length} bytes from file server`);
    } else if (provider?.source_url) {
      // Fetch from direct URL
      console.log(`🌐 Fetching CSV from URL: ${provider.source_url}`);
      const res = await fetch(provider.source_url);
      if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
      csvText = await res.text();
    } else {
      throw new Error("FILE_SERVER_URL not configured and no source_url available");
    }
    const delimiter = csvText.includes("\t") ? "\t" : ",";
    let lines = csvText.trim().split(/\r?\n/);
    // 🕓 Extract "Generated:" timestamp BEFORE removing it
    let generatedBaseDate = new Date();
    if (lines[0].startsWith("Generated:")) {
      const match = lines[0].match(/^Generated:\s*(.+)$/);
      if (match) {
        generatedBaseDate = new Date(match[1].trim());
        console.log(`🕓 Using Generated base date: ${generatedBaseDate.toISOString()}`);
      } else {
        console.warn("⚠️ Could not parse Generated timestamp, using current date instead");
      }
      // Always log the final base date for verification
      console.log(`[weather-data-csv] ✅ Parsed Generated base date: ${generatedBaseDate.toISOString()}`);
      // Remove the header line so parsing continues correctly
      lines = lines.slice(1);
    }
    // Continue parsing CSV
    const headers = lines[0].split(delimiter).map((h)=>h.trim());
    const rows = lines.slice(1).map((l)=>{
      const vals = l.split(delimiter);
      return Object.fromEntries(headers.map((h, i)=>[
          h,
          vals[i]?.trim()
        ]));
    });
    console.log(`✅ Parsed ${rows.length} CSV rows`);
    // 🕓 Helper to parse time-only strings (like "6:15 AM")
    function parseTime(timeStr) {
      if (!timeStr || !timeStr.trim()) return null;
      const now = new Date();
      const [time, modifier] = timeStr.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (modifier?.toUpperCase() === "PM" && hours < 12) hours += 12;
      if (modifier?.toUpperCase() === "AM" && hours === 12) hours = 0;
      const parsed = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes || 0);
      return parsed.toISOString();
    }

    // City to State mapping for News12 tri-state area
    const cityStateMap: Record<string, string> = {
      // New York
      "Bronx": "New York",
      "Brooklyn": "New York",
      "Central Park": "New York",
      "East Hampton": "New York",
      "Farmingdale": "New York",
      "Islip": "New York",
      "JFK Airport": "New York",
      "LGA Airport": "New York",
      "Montauk": "New York",
      "Newburgh": "New York",
      "New York/Central Park": "New York",
      "Poughkeepsie": "New York",
      "Shirley": "New York",
      "Stewart": "New York",
      "Wall Street - NYC": "New York",
      "Westhampton Beach": "New York",
      "White Plains": "New York",
      // New Jersey
      "Atlantic City": "New Jersey",
      "Caldwell": "New Jersey",
      "Freehold": "New Jersey",
      "Jackson Township": "New Jersey",
      "Morristown": "New Jersey",
      "Newark": "New Jersey",
      "Ridgewood": "New Jersey",
      "Sussex": "New Jersey",
      "Teterboro": "New Jersey",
      "Trenton": "New Jersey",
      // Connecticut
      "Bridgeport": "Connecticut",
      "Danbury": "Connecticut",
      "Groton": "Connecticut",
      "Hartford": "Connecticut",
      "Meriden": "Connecticut",
      "New Haven": "Connecticut",
      "Oxford": "Connecticut",
      "Waterbury": "Connecticut",
      "Windsor Locks": "Connecticut",
      "Montgomery": "New Jersey",
    };

    // 3️⃣ Create/Upsert weather_locations
    const uniqueLocs = new Map();
    for (const r of rows){
      const locName = r.LocationName?.trim();
      if (!locName) continue;
      if (!uniqueLocs.has(locName)) {
        const state = cityStateMap[locName] || "New York"; // Default to NY if unknown
        uniqueLocs.set(locName, {
          id: generateLocationId(locName, "news12"),
          name: locName,
          admin1: state,
          country: "United States of America",
          lat: 0,
          lon: 0,
          provider_id: provider.id,
          provider_name: provider.name,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
    const locations = Array.from(uniqueLocs.values());
    const { error: locErr } = await supabase.from("weather_locations").upsert(locations, {
      onConflict: "id"
    });
    if (locErr) throw new Error("weather_locations upsert failed: " + locErr.message);
    console.log(`📍 Upserted ${locations.length} weather_locations`);
    // 4️⃣ Build current + forecast arrays
    const currentRows = [];
    const forecastRows = [];
    for (const r of rows){
      const location = r.LocationName?.trim();
      const forecastName = r.ForecastName?.trim().toLowerCase();
      if (!location || !forecastName) continue;
      const location_id = generateLocationId(location, "news12");
      const common = {
        wind_speed_value: Number(r.WindSpeed) || null,
        wind_speed_unit: "mph",
        wind_direction_cardinal: r.WindDirection || null,
        wind_direction_deg: Number(r.WindDegree) || null,
        humidity: Number(r.Humidity) || null,
        pressure_value: Number(r.Pressure) || null,
        pressure_unit: "mb",
        uv_index: Number(r.UvIndexVal) || null,
        visibility_value: Number(r.Visibility) || null,
        visibility_unit: "mi",
        summary: r.ShortText || null,
        icon: r.MediaFile || null,
        sunrise: parseTime(r.Sunrise),
        sunset: parseTime(r.Sunset)
      };
      if (forecastName === "current") {
        currentRows.push({
          location_id,
          as_of: new Date().toISOString(),
          temperature_value: Number(r.Temp) || null,
          temperature_unit: "F",
          feels_like_value: Number(r.Temp2) || null,
          feels_like_unit: "F",
          ...common,
          provider_id: provider.id,
          provider_type: "csv",
          fetched_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      } else {
        // Compute forecast date using current time as base (not CSV Generated timestamp)
        // Day 1 (Today) = offset 0, Day 2 = offset 1, etc.
        function computeForecastDate(forecastName) {
          const base = new Date(); // Use current date as base
          base.setHours(0, 0, 0, 0); // Normalize to start of day
          const lower = forecastName.toLowerCase();
          let offset = 0;
          // Skip "Tonight" entries - they have same high/low and overlap with "Today"
          if (lower.includes("tonight")) {
            return null; // Will be filtered out
          }
          if (lower.includes("today") || lower.includes("day 1")) offset = 0;
          else if (lower.includes("tomorrow") || lower.includes("day 2")) offset = 1;
          else if (lower.includes("day 3")) offset = 2;
          else if (lower.includes("day 4")) offset = 3;
          else if (lower.includes("day 5")) offset = 4;
          else if (lower.includes("day 6")) offset = 5;
          else if (lower.includes("day 7")) offset = 6;
          const result = new Date(base);
          result.setDate(base.getDate() + offset);
          return result;
        }
        const fcDate = computeForecastDate(forecastName);
        if (!fcDate) continue; // Skip "Tonight" entries
        forecastRows.push({
          location_id,
          forecast_date: fcDate.toISOString().split("T")[0],
          temp_max_value: Number(r.Temp) || null,
          temp_min_value: Number(r.Temp2) || null,
          temp_max_unit: "F",
          temp_min_unit: "F",
          precip_probability: Number(r.Pop) || null,
          uv_index_max: Number(r.UvIndexVal) || null,
          ...common,
          provider_id: provider.id,
          created_at: new Date().toISOString()
        });
      }
    }
    // Deduplicate by location_id for current, and by (location_id, forecast_date) for forecast
    const dedupe = (arr, keyFn)=>{
      const map = new Map();
      for (const item of arr)map.set(keyFn(item), item);
      return Array.from(map.values());
    };
    const dedupedCurrent = dedupe(currentRows, (r)=>r.location_id);
    const dedupedForecast = dedupe(forecastRows, (r)=>`${r.location_id}-${r.forecast_date}`);
    console.log(`🌡️ Prepared ${dedupedCurrent.length} current rows and ${dedupedForecast.length} forecast rows`);
    // 5️⃣ Upsert current + forecast
    if (dedupedCurrent.length > 0) {
      const { error: currErr } = await supabase.from("weather_current").upsert(dedupedCurrent, {
        onConflict: "location_id"
      });
      if (currErr) throw new Error("weather_current upsert failed: " + currErr.message);
    }
    // 🧹 Clean up old forecasts before inserting new ones
    const uniqueForecastLocations = [
      ...new Set(dedupedForecast.map((f)=>f.location_id))
    ];
    for (const locId of uniqueForecastLocations){
      const { error: delErr } = await supabase.from("weather_daily_forecast").delete().eq("location_id", locId);
      if (delErr) {
        console.warn(`⚠️ Failed to delete old forecasts for ${locId}:`, delErr.message);
      } else {
        console.log(`🧹 Cleared old forecasts for ${locId}`);
      }
    }
    // 💾 Now insert the new forecast rows
    if (dedupedForecast.length > 0) {
      const { error: foreErr } = await supabase.from("weather_daily_forecast").upsert(dedupedForecast, {
        onConflict: "location_id,forecast_date,provider_id"
      });
      if (foreErr) {
        throw new Error("weather_daily_forecast upsert failed: " + foreErr.message);
      } else {
        console.log(`✅ Upserted ${dedupedForecast.length} new forecast rows`);
      }
    }
    await supabase.from("data_providers").update({
      last_run: new Date().toISOString()
    }).eq("id", provider.id);
    console.log(`✅ Import complete: ${locations.length} locations, ${dedupedCurrent.length} current, ${dedupedForecast.length} forecast`);
    return c.json({
      ok: true,
      imported: dedupedCurrent.length + dedupedForecast.length,
      provider: provider.name,
      success: true
    });
  } catch (err) {
    console.error("❌ CSV import failed:", err);
    return c.json({
      ok: false,
      imported: 0,
      warning: "CSV import failed",
      detail: err.message
    }, 500);
  }
});
// ============================================================================
// START SERVER
// ============================================================================
console.log(`[weather_dashboard] Ready at ${BUILD_ID}`);
Deno.serve(app.fetch);
