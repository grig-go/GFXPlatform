// ============================================================================
// CHANNELS EDGE FUNCTION
// ============================================================================
// Dedicated edge function for managing channels (CRUD operations)
// ============================================================================

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono().basePath("/channels");

// ============================================================================
// SUPABASE CLIENT
// ============================================================================
const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  console.log("[CHANNELS] Creating Supabase client:", {
    hasUrl: !!supabaseUrl,
    hasKey: !!serviceRoleKey,
    urlPrefix: supabaseUrl?.substring(0, 20)
  });
  
  if (!supabaseUrl) {
    const error = new Error("SUPABASE_URL environment variable is not set");
    console.error("[CHANNELS]", error);
    throw error;
  }
  
  if (!serviceRoleKey) {
    const error = new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
    console.error("[CHANNELS]", error);
    throw error;
  }
  
  try {
    const client = createClient(supabaseUrl, serviceRoleKey);
    console.log("[CHANNELS] ✅ Supabase client created successfully");
    return client;
  } catch (error) {
    console.error("[CHANNELS] Failed to create Supabase client:", error);
    throw error;
  }
};

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Pragma",
      "x-client-info",
      "apikey",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "channels",
    message: "Channels service is running",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// GET ALL CHANNELS (with optional type and active filters)
// ============================================================================
app.get("/", async (c) => {
  try {
    console.log("[CHANNELS] GET all channels - path:", c.req.path);
    
    // Get query parameters
    const type = c.req.query("type");
    const active = c.req.query("active");
    
    console.log("[CHANNELS] Query params:", { type, active });
    
    const supabase = getSupabaseClient();
    
    // Build query
    let query = supabase
      .from("channels")
      .select("*");
    
    // Apply filters if provided
    if (type) {
      query = query.eq("type", type);
      console.log(`[CHANNELS] Filtering by type: ${type}`);
    }
    
    if (active !== undefined) {
      const isActive = active === "true" || active === "1";
      query = query.eq("active", isActive);
      console.log(`[CHANNELS] Filtering by active: ${isActive}`);
    }
    
    // Order by created_at
    query = query.order("created_at", { ascending: false });
    
    const { data, error } = await query;

    if (error) {
      console.error("[CHANNELS] Database error:", error);
      throw error;
    }

    console.log(`[CHANNELS] Fetched ${data?.length || 0} channels`);
    return c.json({ ok: true, channels: data || [] });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// CREATE NEW CHANNEL
// ============================================================================
app.post("/", async (c) => {
  try {
    console.log("[CHANNELS] POST create channel - start");
    
    // Parse body with error handling
    let body;
    try {
      body = await c.req.json();
      console.log("[CHANNELS] Request body:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("[CHANNELS] Failed to parse JSON body:", parseError);
      return c.json(
        { ok: false, error: "Invalid JSON in request body" },
        400
      );
    }

    const { name, description, type, active, config } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.log("[CHANNELS] Validation failed: name is required");
      return c.json(
        { ok: false, error: "Channel name is required and must be a non-empty string" },
        400
      );
    }

    // Validate optional fields
    if (type && typeof type !== 'string') {
      return c.json(
        { ok: false, error: "Channel type must be a string" },
        400
      );
    }

    if (active !== undefined && typeof active !== 'boolean') {
      return c.json(
        { ok: false, error: "Channel active must be a boolean (true/false)" },
        400
      );
    }

    if (config && typeof config !== 'object') {
      return c.json(
        { ok: false, error: "Channel config must be an object" },
        400
      );
    }

    console.log("[CHANNELS] Validation passed, creating Supabase client");
    const supabase = getSupabaseClient();

    const insertData = {
      name: name.trim(),
      description: description || null,
      type: type || null,
      active: active !== undefined ? active : true,
      config: config || {},
    };

    console.log("[CHANNELS] Insert data:", JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
      .from("channels")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[CHANNELS] Database insert error:", {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        fullError: JSON.stringify(error, null, 2)
      });
      
      return c.json(
        { 
          ok: false, 
          error: error.message || "Failed to create channel",
          code: error.code || "UNKNOWN",
          hint: error.hint || null,
          details: error.details || null,
          timestamp: new Date().toISOString()
        },
        500
      );
    }

    if (!data) {
      console.error("[CHANNELS] No data returned after insert");
      return c.json(
        { ok: false, error: "Channel created but no data returned" },
        500
      );
    }

    console.log(`[CHANNELS] ✅ Successfully created channel: ${name} (${data.id})`);
    return c.json({ ok: true, channel: data }, 201);
    
  } catch (error) {
    console.error("[CHANNELS] Unexpected error:", error);
    console.error("[CHANNELS] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error as any;
    
    return c.json(
      { 
        ok: false, 
        error: errorMessage,
        code: errorObj?.code || "UNKNOWN",
        hint: errorObj?.hint || null,
        details: errorObj?.details || null,
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString()
      },
      500
    );
  }
});

// ============================================================================
// GET SINGLE CHANNEL BY ID
// ============================================================================
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`[CHANNELS] GET single channel - id: ${id}, path: ${c.req.path}`);
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log(`[CHANNELS] Invalid UUID format: ${id}`);
      return c.json({ ok: false, error: "Invalid channel ID format" }, 400);
    }
    
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`[CHANNELS] Database error for id ${id}:`, error);
      throw error;
    }

    console.log(`[CHANNELS] Fetched channel: ${id}`);
    return c.json({ ok: true, channel: data });
  } catch (error) {
    console.error("Error fetching channel:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// UPDATE EXISTING CHANNEL
// ============================================================================
app.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`[CHANNELS] PATCH update channel - id: ${id}`);
    
    const body = await c.req.json();
    const { name, description, type, active, config } = body;

    const supabase = getSupabaseClient();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (active !== undefined) updateData.active = active;
    if (config !== undefined) updateData.config = config;

    console.log(`[CHANNELS] Update data:`, JSON.stringify(updateData, null, 2));

    const { data, error } = await supabase
      .from("channels")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`[CHANNELS] Database update error for id ${id}:`, error);
      throw error;
    }

    console.log(`[CHANNELS] ✅ Updated channel: ${id}`);
    return c.json({ ok: true, channel: data });
  } catch (error) {
    console.error("Error updating channel:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// DELETE CHANNEL
// ============================================================================
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`[CHANNELS] DELETE channel - id: ${id}`);
    
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("channels")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`[CHANNELS] Database delete error for id ${id}:`, error);
      throw error;
    }

    console.log(`[CHANNELS] ✅ Deleted channel: ${id}`);
    return c.json({ ok: true, message: "Channel deleted successfully" });
  } catch (error) {
    console.error("Error deleting channel:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// CATCH-ALL FOR DEBUGGING
// ============================================================================
app.all("*", (c) => {
  console.log(`[CHANNELS] Unmatched route - method: ${c.req.method}, path: ${c.req.path}, url: ${c.req.url}`);
  return c.json({ 
    ok: false, 
    error: "Route not found",
    debug: {
      method: c.req.method,
      path: c.req.path,
      url: c.req.url
    }
  }, 404);
});

// ============================================================================
// STARTUP
// ============================================================================
console.log("[CHANNELS] Edge function initialized");
Deno.serve(app.fetch);