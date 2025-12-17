// ============================================================================
// CURRENT WEATHER EDGE FUNCTION
// ============================================================================
// Returns current weather data for a location assigned to a given channel
// Accepts channel name as parameter and returns weather data in legacy format
// ============================================================================
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono().basePath("/current-weather");

// ============================================================================
// SUPABASE CLIENT
// ============================================================================
const getSupabase = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma", "x-client-info", "apikey"],
  allowMethods: ["GET", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600
}));

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "current-weather",
    message: "Current weather service is running",
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// GET CURRENT WEATHER BY CHANNEL NAME
// ============================================================================
// GET /current-weather/:channelName
// Returns current weather for the location assigned to the given channel
// Channel lookup is case-insensitive
// ============================================================================
app.get("/:channelName", async (c) => {
  try {
    const channelName = c.req.param("channelName");
    console.log(`[CURRENT-WEATHER] GET weather for channel: ${channelName}`);

    const supabase = getSupabase();

    // Look up channel by name (case-insensitive)
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id, name")
      .ilike("name", channelName)
      .single();

    if (channelError || !channel) {
      console.log(`[CURRENT-WEATHER] Channel not found: ${channelName}`);
      return c.json({
        ok: false,
        error: "Channel not found",
        channel_name: channelName
      }, 404);
    }

    console.log(`[CURRENT-WEATHER] Found channel: ${channel.name} (${channel.id})`);

    // Find location assigned to this channel via junction table
    const { data: locationChannel, error: locationError } = await supabase
      .from("weather_location_channels")
      .select(`
        location_id,
        weather_locations (
          id,
          name,
          custom_name,
          admin1,
          country
        )
      `)
      .eq("channel_id", channel.id)
      .limit(1)
      .single();

    if (locationError || !locationChannel) {
      console.log(`[CURRENT-WEATHER] No location assigned to channel: ${channel.name}`);
      return c.json({
        ok: false,
        error: "No weather location assigned to this channel",
        channel_name: channel.name,
        channel_id: channel.id
      }, 404);
    }

    const location = locationChannel.weather_locations as {
      id: string;
      name: string;
      custom_name: string | null;
      admin1: string | null;
      country: string | null;
    };

    console.log(`[CURRENT-WEATHER] Found location: ${location.name} (${location.id})`);

    // Get current weather data for this location
    const { data: weather, error: weatherError } = await supabase
      .from("weather_current")
      .select("*")
      .eq("location_id", location.id)
      .single();

    if (weatherError || !weather) {
      console.log(`[CURRENT-WEATHER] No weather data for location: ${location.name}`);
      return c.json({
        ok: false,
        error: "No current weather data available for this location",
        location_name: location.custom_name || location.name,
        location_id: location.id
      }, 404);
    }

    // Format response in the requested legacy format
    const locationName = location.custom_name || location.name;
    const response = {
      LocationName: locationName,
      Temp: weather.temperature_value?.toString() || "",
      ShortText: weather.summary || "",
      MediaFile: weather.icon || ""
    };

    console.log(`[CURRENT-WEATHER] Returning weather for ${locationName}: ${weather.temperature_value}°F, ${weather.summary}`);

    return c.json(response);

  } catch (err) {
    console.error("[CURRENT-WEATHER] Error:", err);
    return c.json({
      ok: false,
      error: "Internal server error",
      detail: err instanceof Error ? err.message : String(err)
    }, 500);
  }
});

// ============================================================================
// START SERVER
// ============================================================================
console.log("[current-weather] Ready");
Deno.serve(app.fetch);
