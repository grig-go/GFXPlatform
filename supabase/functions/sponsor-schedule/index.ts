// ============================================================================
// SPONSOR SCHEDULE EDGE FUNCTION
// ============================================================================
// Returns the currently active sponsor for a given channel
// Queries sponsor_schedules table and joins with media_assets
// ============================================================================
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono().basePath("/sponsor-schedule");

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
// HELPER: Check if schedule is active now
// ============================================================================
interface TimeRange {
  start: string;
  end: string;
}

interface DaysOfWeek {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface SponsorSchedule {
  id: string;
  channel_ids: string[];
  media_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  time_ranges: TimeRange[];
  days_of_week: DaysOfWeek;
  active: boolean;
  priority: number;
  category: string | null;
}

// Timezone for schedule evaluation - configurable via environment variable
// Falls back to America/New_York if not set
const SCHEDULE_TIMEZONE = Deno.env.get("TIMEZONE") || Deno.env.get("SCHEDULE_TIMEZONE") || "America/New_York";

// Helper to get current time in the configured timezone
const getNowInTimezone = (): { date: Date; timeString: string; dayOfWeek: number } => {
  const now = new Date();
  // Get the time string in the target timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: SCHEDULE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short"
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(now);

  const hour = parts.find(p => p.type === "hour")?.value || "00";
  const minute = parts.find(p => p.type === "minute")?.value || "00";
  const weekday = parts.find(p => p.type === "weekday")?.value || "Sun";

  const timeString = `${hour}:${minute}`;

  // Map weekday abbreviation to day number (0 = Sunday)
  const dayMap: Record<string, number> = {
    "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
  };
  const dayOfWeek = dayMap[weekday] ?? 0;

  return { date: now, timeString, dayOfWeek };
};

const isScheduleActiveNow = (schedule: SponsorSchedule): boolean => {
  const { date: now, timeString: currentTime, dayOfWeek } = getNowInTimezone();

  // Check date range
  if (schedule.start_date) {
    const startDate = new Date(schedule.start_date);
    if (now < startDate) return false;
  }

  if (schedule.end_date) {
    const endDate = new Date(schedule.end_date);
    if (now > endDate) return false;
  }

  // Check day of week
  const dayNames: (keyof DaysOfWeek)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[dayOfWeek];
  const anyDaySelected = Object.values(schedule.days_of_week).some(v => v);

  if (anyDaySelected && !schedule.days_of_week[today]) {
    return false;
  }

  // Check time ranges
  const validTimeRanges = schedule.time_ranges.filter(r => r.start && r.end);
  if (validTimeRanges.length === 0) {
    // No time ranges = all day
    return true;
  }

  return validTimeRanges.some(range => {
    const isOvernight = range.start > range.end;

    if (isOvernight) {
      // Overnight: active if current time >= start OR current time <= end
      return currentTime >= range.start || currentTime <= range.end;
    } else {
      // Normal: active if current time is within range
      return currentTime >= range.start && currentTime <= range.end;
    }
  });
};

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "sponsor-schedule",
    message: "Sponsor schedule service is running",
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// GET ACTIVE SPONSOR FOR CHANNEL
// ============================================================================
// GET /sponsor-schedule/:channelNameOrId
// Returns the currently active sponsor for the given channel
// Accepts either channel name or UUID
// Priority: scheduled sponsors (by priority) > default sponsor
// ============================================================================
app.get("/:channelNameOrId", async (c) => {
  try {
    const channelNameOrId = c.req.param("channelNameOrId");
    const category = c.req.query("category"); // Optional category filter
    console.log(`[SPONSOR-SCHEDULE] GET active sponsor for channel: ${channelNameOrId}${category ? `, category: ${category}` : ''}`);

    const supabase = getSupabase();

    // Check if input is a UUID or a channel name
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let channelId: string;

    if (uuidRegex.test(channelNameOrId)) {
      // It's a UUID, verify it exists in the channels table
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .select("id")
        .eq("id", channelNameOrId)
        .single();

      if (channelError || !channel) {
        console.log(`[SPONSOR-SCHEDULE] Channel UUID not found: ${channelNameOrId}`);
        return c.json({
          ok: false,
          error: "Channel not found",
          channel_id: channelNameOrId
        }, 404);
      }

      channelId = channelNameOrId;
    } else {
      // It's a channel name, look it up (case-insensitive)
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .select("id")
        .ilike("name", channelNameOrId)
        .single();

      if (channelError || !channel) {
        console.log(`[SPONSOR-SCHEDULE] Channel name not found: ${channelNameOrId}`);
        return c.json({
          ok: false,
          error: "Channel not found",
          channel_name: channelNameOrId
        }, 404);
      }

      channelId = channel.id;
      console.log(`[SPONSOR-SCHEDULE] Resolved channel name "${channelNameOrId}" to ID: ${channelId}`);
    }

    // Fetch all active schedules for this channel
    // Using filter with @> operator to check if channelId is in the channel_ids JSONB array
    let query = supabase
      .from("sponsor_schedules")
      .select("*")
      .eq("active", true)
      .filter("channel_ids", "cs", `["${channelId}"]`);

    // Apply category filter
    if (category) {
      // Specific category requested
      query = query.eq("category", category);
    } else {
      // No category specified - return only General sponsors (null or empty category)
      query = query.or("category.is.null,category.eq.");
    }

    const { data: schedules, error: fetchError } = await query
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("[SPONSOR-SCHEDULE] Error fetching schedules:", fetchError);
      return c.json({
        ok: false,
        error: "Failed to fetch sponsor schedules",
        details: fetchError.message
      }, 500);
    }

    if (!schedules || schedules.length === 0) {
      console.log(`[SPONSOR-SCHEDULE] No schedules found for channel ${channelId}`);
      return c.json({
        ok: true,
        sponsor: null,
        message: "No sponsor schedules found for this channel"
      });
    }

    // Parse JSON fields and find active sponsor
    const parsedSchedules: SponsorSchedule[] = schedules.map((s: any) => ({
      ...s,
      channel_ids: Array.isArray(s.channel_ids) ? s.channel_ids : JSON.parse(s.channel_ids || "[]"),
      time_ranges: Array.isArray(s.time_ranges) ? s.time_ranges : JSON.parse(s.time_ranges || "[]"),
      days_of_week: typeof s.days_of_week === "object" ? s.days_of_week : JSON.parse(s.days_of_week || "{}")
    }));

    // Log all schedules for debugging
    const { timeString: currentTime, dayOfWeek } = getNowInTimezone();
    const dayNames: (keyof DaysOfWeek)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[dayOfWeek];
    console.log(`[SPONSOR-SCHEDULE] Current time: ${currentTime} (${SCHEDULE_TIMEZONE}), Day: ${today}`);
    console.log(`[SPONSOR-SCHEDULE] Found ${parsedSchedules.length} schedules:`);
    parsedSchedules.forEach(s => {
      const isActive = isScheduleActiveNow(s);
      console.log(`  - ${s.name}: priority=${s.priority}, category=${s.category || 'general'}, active_now=${isActive}`);
      console.log(`    days_of_week: ${JSON.stringify(s.days_of_week)}`);
      console.log(`    time_ranges: ${JSON.stringify(s.time_ranges)}`);
      console.log(`    start_date: ${s.start_date}, end_date: ${s.end_date}`);
    });

    // Find the first schedule that is currently active (highest priority first, already sorted by priority desc)
    const activeSponsor = parsedSchedules.find(s => isScheduleActiveNow(s));

    if (!activeSponsor) {
      console.log(`[SPONSOR-SCHEDULE] No active sponsor for channel ${channelId}`);
      return c.json({
        ok: true,
        sponsor: null,
        message: "No active sponsor for this channel at this time"
      });
    }

    console.log(`[SPONSOR-SCHEDULE] Active sponsor found: ${activeSponsor.name} (${activeSponsor.id})`);

    // Fetch the media asset from local database
    const { data: mediaAsset, error: mediaError } = await supabase
      .from("media_assets")
      .select("id, name, file_name, file_url, thumbnail_url, media_type")
      .eq("id", activeSponsor.media_id)
      .single();

    if (mediaError) {
      console.warn(`[SPONSOR-SCHEDULE] Media asset not found: ${activeSponsor.media_id}`, mediaError);
    }

    // Parse the schedule's time_ranges
    const timeRanges = Array.isArray(activeSponsor.time_ranges)
      ? activeSponsor.time_ranges
      : JSON.parse(activeSponsor.time_ranges || "[]");

    // Get the active time range - find the one that's currently active, or first valid one, or default to all day
    let activeTimeRange = { start: "0:00", end: "23:59" };
    const validTimeRanges = timeRanges.filter((r: TimeRange) => r.start && r.end);

    if (validTimeRanges.length > 0) {
      // Find which time range is currently active
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

      const currentlyActive = validTimeRanges.find((range: TimeRange) => {
        const isOvernight = range.start > range.end;
        if (isOvernight) {
          return currentTime >= range.start || currentTime <= range.end;
        } else {
          return currentTime >= range.start && currentTime <= range.end;
        }
      });

      activeTimeRange = currentlyActive || validTimeRanges[0];
    }

    // Extract file name and extension from the file_url (storage path)
    // The file_url contains the actual storage filename like: .../media/image/1764623024199_xxx.jpg
    let sponsor = "";
    let extension = "";
    if (mediaAsset && mediaAsset.file_url) {
      // Get the filename from the URL path
      const urlPath = mediaAsset.file_url.split("?")[0]; // Remove query params
      const pathParts = urlPath.split("/");
      const fileName = pathParts[pathParts.length - 1]; // Get last part (the filename)

      const lastDotIndex = fileName.lastIndexOf(".");
      if (lastDotIndex > 0) {
        sponsor = fileName.substring(0, lastDotIndex);
        extension = fileName.substring(lastDotIndex + 1);
      } else {
        sponsor = fileName;
      }
    }

    // Build simplified response
    const response = {
      ok: true,
      start: activeTimeRange.start,
      end: activeTimeRange.end,
      sponsor,
      extension
    };

    return c.json(response);

  } catch (error) {
    console.error("[SPONSOR-SCHEDULE] Unexpected error:", error);
    return c.json({
      ok: false,
      error: "Internal server error",
      details: String(error)
    }, 500);
  }
});

// ============================================================================
// GET TODAY'S SPONSORS FOR CHANNEL
// ============================================================================
// GET /sponsor-schedule/:channelNameOrId/today
// Returns all sponsors scheduled for today on the given channel
// Each sponsor uses the same schema as the active sponsor endpoint
// ============================================================================
app.get("/:channelNameOrId/today", async (c) => {
  try {
    const channelNameOrId = c.req.param("channelNameOrId");
    const category = c.req.query("category"); // Optional category filter
    console.log(`[SPONSOR-SCHEDULE] GET today's sponsors for channel: ${channelNameOrId}${category ? `, category: ${category}` : ''}`);

    const supabase = getSupabase();

    // Check if input is a UUID or a channel name
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let channelId: string;

    if (uuidRegex.test(channelNameOrId)) {
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .select("id")
        .eq("id", channelNameOrId)
        .single();

      if (channelError || !channel) {
        return c.json({
          ok: false,
          error: "Channel not found",
          channel_id: channelNameOrId
        }, 404);
      }

      channelId = channelNameOrId;
    } else {
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .select("id")
        .ilike("name", channelNameOrId)
        .single();

      if (channelError || !channel) {
        return c.json({
          ok: false,
          error: "Channel not found",
          channel_name: channelNameOrId
        }, 404);
      }

      channelId = channel.id;
    }

    // Get current day and time info
    const { dayOfWeek } = getNowInTimezone();
    const dayNames: (keyof DaysOfWeek)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[dayOfWeek];

    // Fetch all active schedules for this channel
    let todayQuery = supabase
      .from("sponsor_schedules")
      .select("*")
      .eq("active", true)
      .filter("channel_ids", "cs", `["${channelId}"]`);

    // Apply category filter
    if (category) {
      // Specific category requested
      todayQuery = todayQuery.eq("category", category);
    } else {
      // No category specified - return only General sponsors (null or empty category)
      todayQuery = todayQuery.or("category.is.null,category.eq.");
    }

    const { data: schedules, error: fetchError } = await todayQuery
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    // Parse and filter to only schedules active today
    const todaysSponsors: Array<{
      ok: boolean;
      start: string;
      end: string;
      sponsor: string;
      extension: string;
      name: string;
      priority: number;
    }> = [];

    for (const s of schedules || []) {
      const parsed: SponsorSchedule = {
        ...s,
        channel_ids: Array.isArray(s.channel_ids) ? s.channel_ids : JSON.parse(s.channel_ids || "[]"),
        time_ranges: Array.isArray(s.time_ranges) ? s.time_ranges : JSON.parse(s.time_ranges || "[]"),
        days_of_week: typeof s.days_of_week === "object" ? s.days_of_week : JSON.parse(s.days_of_week || "{}")
      };

      // Check if this schedule applies to today
      const anyDaySelected = Object.values(parsed.days_of_week).some(v => v);
      const appliesToday = !anyDaySelected || parsed.days_of_week[today];

      // Check date range
      const now = new Date();
      let inDateRange = true;
      if (parsed.start_date) {
        const startDate = new Date(parsed.start_date);
        if (now < startDate) inDateRange = false;
      }
      if (parsed.end_date) {
        const endDate = new Date(parsed.end_date);
        if (now > endDate) inDateRange = false;
      }

      if (!appliesToday || !inDateRange) continue;

      // Fetch media asset
      const { data: mediaAsset } = await supabase
        .from("media_assets")
        .select("id, name, file_name, file_url, thumbnail_url, media_type")
        .eq("id", parsed.media_id)
        .single();

      // Get time ranges for this schedule
      const timeRanges = parsed.time_ranges.filter(r => r.start && r.end);

      // If no time ranges specified, it's all day
      if (timeRanges.length === 0) {
        // Extract filename from URL
        let sponsor = "";
        let extension = "";
        if (mediaAsset && mediaAsset.file_url) {
          const urlPath = mediaAsset.file_url.split("?")[0];
          const pathParts = urlPath.split("/");
          const fileName = pathParts[pathParts.length - 1];
          const lastDotIndex = fileName.lastIndexOf(".");
          if (lastDotIndex > 0) {
            sponsor = fileName.substring(0, lastDotIndex);
            extension = fileName.substring(lastDotIndex + 1);
          } else {
            sponsor = fileName;
          }
        }

        todaysSponsors.push({
          ok: true,
          start: "00:00",
          end: "23:59",
          sponsor,
          extension,
          name: parsed.name,
          priority: parsed.priority
        });
      } else {
        // Add an entry for each time range
        for (const range of timeRanges) {
          let sponsor = "";
          let extension = "";
          if (mediaAsset && mediaAsset.file_url) {
            const urlPath = mediaAsset.file_url.split("?")[0];
            const pathParts = urlPath.split("/");
            const fileName = pathParts[pathParts.length - 1];
            const lastDotIndex = fileName.lastIndexOf(".");
            if (lastDotIndex > 0) {
              sponsor = fileName.substring(0, lastDotIndex);
              extension = fileName.substring(lastDotIndex + 1);
            } else {
              sponsor = fileName;
            }
          }

          todaysSponsors.push({
            ok: true,
            start: range.start,
            end: range.end,
            sponsor,
            extension,
            name: parsed.name,
            priority: parsed.priority
          });
        }
      }
    }

    // Sort by priority (highest first), then by start time
    // Priority 0 sponsors (fallbacks) go to the end
    todaysSponsors.sort((a, b) => {
      // Priority 0 (fallback) sponsors go to the end
      if (a.priority === 0 && b.priority !== 0) return 1;
      if (a.priority !== 0 && b.priority === 0) return -1;
      // Higher priority first
      if (b.priority !== a.priority) return b.priority - a.priority;
      // Same priority: sort by start time
      return a.start.localeCompare(b.start);
    });

    return c.json({
      ok: true,
      day: today,
      timezone: SCHEDULE_TIMEZONE,
      sponsors: todaysSponsors,
      count: todaysSponsors.length
    });

  } catch (error) {
    console.error("[SPONSOR-SCHEDULE] Error:", error);
    return c.json({
      ok: false,
      error: String(error)
    }, 500);
  }
});

// ============================================================================
// GET ALL SCHEDULES FOR CHANNEL (for debugging/admin)
// ============================================================================
// Returns all sponsors for this channel (active and inactive)
// Each sponsor uses the same schema as the active sponsor endpoint
// ============================================================================
app.get("/:channelNameOrId/all", async (c) => {
  try {
    const channelNameOrId = c.req.param("channelNameOrId");
    console.log(`[SPONSOR-SCHEDULE] GET all schedules for channel: ${channelNameOrId}`);

    const supabase = getSupabase();

    // Check if input is a UUID or a channel name
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let channelId: string;

    if (uuidRegex.test(channelNameOrId)) {
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .select("id")
        .eq("id", channelNameOrId)
        .single();

      if (channelError || !channel) {
        return c.json({
          ok: false,
          error: "Channel not found",
          channel_id: channelNameOrId
        }, 404);
      }

      channelId = channelNameOrId;
    } else {
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .select("id")
        .ilike("name", channelNameOrId)
        .single();

      if (channelError || !channel) {
        return c.json({
          ok: false,
          error: "Channel not found",
          channel_name: channelNameOrId
        }, 404);
      }

      channelId = channel.id;
    }

    const { data: schedules, error } = await supabase
      .from("sponsor_schedules")
      .select("*")
      .filter("channel_ids", "cs", `["${channelId}"]`)
      .order("priority", { ascending: false });

    if (error) {
      throw error;
    }

    // Build sponsors list with consistent schema
    const allSponsors: Array<{
      ok: boolean;
      start: string;
      end: string;
      sponsor: string;
      extension: string;
      name: string;
      priority: number;
      active: boolean;
      is_active_now: boolean;
      days_of_week: DaysOfWeek;
    }> = [];

    for (const s of schedules || []) {
      const parsed: SponsorSchedule = {
        ...s,
        channel_ids: Array.isArray(s.channel_ids) ? s.channel_ids : JSON.parse(s.channel_ids || "[]"),
        time_ranges: Array.isArray(s.time_ranges) ? s.time_ranges : JSON.parse(s.time_ranges || "[]"),
        days_of_week: typeof s.days_of_week === "object" ? s.days_of_week : JSON.parse(s.days_of_week || "{}")
      };

      // Fetch media asset
      const { data: mediaAsset } = await supabase
        .from("media_assets")
        .select("id, name, file_name, file_url, thumbnail_url, media_type")
        .eq("id", parsed.media_id)
        .single();

      // Get time ranges for this schedule
      const timeRanges = parsed.time_ranges.filter(r => r.start && r.end);

      // Extract filename from URL helper
      const extractFileInfo = (url: string | null) => {
        let sponsor = "";
        let extension = "";
        if (url) {
          const urlPath = url.split("?")[0];
          const pathParts = urlPath.split("/");
          const fileName = pathParts[pathParts.length - 1];
          const lastDotIndex = fileName.lastIndexOf(".");
          if (lastDotIndex > 0) {
            sponsor = fileName.substring(0, lastDotIndex);
            extension = fileName.substring(lastDotIndex + 1);
          } else {
            sponsor = fileName;
          }
        }
        return { sponsor, extension };
      };

      const { sponsor, extension } = extractFileInfo(mediaAsset?.file_url || null);

      // If no time ranges specified, it's all day
      if (timeRanges.length === 0) {
        allSponsors.push({
          ok: true,
          start: "00:00",
          end: "23:59",
          sponsor,
          extension,
          name: parsed.name,
          priority: parsed.priority,
          active: parsed.active,
          is_active_now: isScheduleActiveNow(parsed),
          days_of_week: parsed.days_of_week
        });
      } else {
        // Add an entry for each time range
        for (const range of timeRanges) {
          allSponsors.push({
            ok: true,
            start: range.start,
            end: range.end,
            sponsor,
            extension,
            name: parsed.name,
            priority: parsed.priority,
            active: parsed.active,
            is_active_now: isScheduleActiveNow(parsed),
            days_of_week: parsed.days_of_week
          });
        }
      }
    }

    // Sort by priority (highest first), then by start time
    // Priority 0 sponsors (fallbacks) go to the end
    allSponsors.sort((a, b) => {
      // Priority 0 (fallback) sponsors go to the end
      if (a.priority === 0 && b.priority !== 0) return 1;
      if (a.priority !== 0 && b.priority === 0) return -1;
      // Higher priority first
      if (b.priority !== a.priority) return b.priority - a.priority;
      // Same priority: sort by start time
      return a.start.localeCompare(b.start);
    });

    return c.json({
      ok: true,
      timezone: SCHEDULE_TIMEZONE,
      sponsors: allSponsors,
      count: allSponsors.length
    });

  } catch (error) {
    console.error("[SPONSOR-SCHEDULE] Error:", error);
    return c.json({
      ok: false,
      error: String(error)
    }, 500);
  }
});

// ============================================================================
// GET ALL IMAGE URLS FOR TODAY'S SPONSORS
// ============================================================================
// GET /sponsor-schedule/:channelNameOrId/images
// Returns array of full URLs for all sponsor images used today
// ============================================================================
app.get("/:channelNameOrId/images", async (c) => {
  try {
    const channelNameOrId = c.req.param("channelNameOrId");
    const category = c.req.query("category"); // Optional category filter
    console.log(`[SPONSOR-SCHEDULE] GET images for channel: ${channelNameOrId}${category ? `, category: ${category}` : ''}`);

    const supabase = getSupabase();

    // Check if input is a UUID or a channel name
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let channelId: string;

    if (uuidRegex.test(channelNameOrId)) {
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .select("id")
        .eq("id", channelNameOrId)
        .single();

      if (channelError || !channel) {
        return c.json([], 404);
      }

      channelId = channelNameOrId;
    } else {
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .select("id")
        .ilike("name", channelNameOrId)
        .single();

      if (channelError || !channel) {
        return c.json([], 404);
      }

      channelId = channel.id;
    }

    // Get current day info
    const { dayOfWeek } = getNowInTimezone();
    const dayNames: (keyof DaysOfWeek)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[dayOfWeek];

    // Fetch all active schedules for this channel
    let imagesQuery = supabase
      .from("sponsor_schedules")
      .select("*")
      .eq("active", true)
      .filter("channel_ids", "cs", `["${channelId}"]`);

    // Apply category filter
    if (category) {
      // Specific category requested
      imagesQuery = imagesQuery.eq("category", category);
    } else {
      // No category specified - return only General sponsors (null or empty category)
      imagesQuery = imagesQuery.or("category.is.null,category.eq.");
    }

    const { data: schedules, error: fetchError } = await imagesQuery;

    if (fetchError || !schedules) {
      return c.json([]);
    }

    // Collect unique media IDs that are active today
    const mediaIds = new Set<string>();

    for (const s of schedules) {
      const parsed: SponsorSchedule = {
        ...s,
        channel_ids: Array.isArray(s.channel_ids) ? s.channel_ids : JSON.parse(s.channel_ids || "[]"),
        time_ranges: Array.isArray(s.time_ranges) ? s.time_ranges : JSON.parse(s.time_ranges || "[]"),
        days_of_week: typeof s.days_of_week === "object" ? s.days_of_week : JSON.parse(s.days_of_week || "{}")
      };

      // Check if this schedule applies to today
      const anyDaySelected = Object.values(parsed.days_of_week).some(v => v);
      const appliesToday = !anyDaySelected || parsed.days_of_week[today];

      // Check date range
      const now = new Date();
      let inDateRange = true;
      if (parsed.start_date) {
        const startDate = new Date(parsed.start_date);
        if (now < startDate) inDateRange = false;
      }
      if (parsed.end_date) {
        const endDate = new Date(parsed.end_date);
        if (now > endDate) inDateRange = false;
      }

      if (appliesToday && inDateRange && parsed.media_id) {
        mediaIds.add(parsed.media_id);
      }
    }

    if (mediaIds.size === 0) {
      return c.json([]);
    }

    // Fetch media assets
    const { data: mediaAssets, error: mediaError } = await supabase
      .from("media_assets")
      .select("id, file_url")
      .in("id", Array.from(mediaIds));

    if (mediaError || !mediaAssets) {
      return c.json([]);
    }

    // Return the file_url directly from media_assets
    // Replace internal Docker hostname with proper Supabase URL if needed
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const publicStorageUrl = Deno.env.get("PUBLIC_STORAGE_URL") || supabaseUrl;

    const urls: string[] = mediaAssets
      .filter(asset => asset.file_url)
      .map(asset => {
        let url = asset.file_url;
        // Replace internal Docker proxy hostname with public URL
        if (url.includes("supabase_edge_runtime") || url.includes("kong:8000") || url.includes("localhost:54321")) {
          url = url.replace(/https?:\/\/[^\/]+/, publicStorageUrl);
        }
        return url;
      });

    return c.json(urls);

  } catch (error) {
    console.error("[SPONSOR-SCHEDULE] Error getting images:", error);
    return c.json([]);
  }
});

// ============================================================================
// CATCH-ALL
// ============================================================================
app.all("*", (c) => {
  return c.json({
    ok: false,
    error: "Route not found",
    usage: {
      "GET /sponsor-schedule/:channelName": "Get currently active sponsor for channel (by name or UUID)",
      "GET /sponsor-schedule/:channelName?category=X": "Get active sponsor filtered by category",
      "GET /sponsor-schedule/:channelName/today": "Get all sponsors scheduled for today on channel",
      "GET /sponsor-schedule/:channelName/today?category=X": "Get today's sponsors filtered by category",
      "GET /sponsor-schedule/:channelName/images": "Get all image URLs for today's sponsors",
      "GET /sponsor-schedule/:channelName/images?category=X": "Get today's image URLs filtered by category",
      "GET /sponsor-schedule/:channelName/all": "Get all schedules for channel (admin)",
      "GET /sponsor-schedule/health": "Health check"
    },
    examples: {
      "by_name": "/sponsor-schedule/WBRE",
      "by_uuid": "/sponsor-schedule/550e8400-e29b-41d4-a716-446655440000",
      "with_category": "/sponsor-schedule/WBRE?category=ticker"
    }
  }, 404);
});

// ============================================================================
// STARTUP
// ============================================================================
console.log("[SPONSOR-SCHEDULE] Edge function initialized");
Deno.serve(app.fetch);
