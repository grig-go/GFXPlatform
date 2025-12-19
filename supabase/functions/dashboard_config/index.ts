// ============================================================================
// /supabase/functions/dashboard_config/index.ts
// ============================================================================
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

// ----------------------------------------------------------------------------
// Supabase client
// ----------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// ----------------------------------------------------------------------------
// Default home page dashboards (4 main categories + 6 sub-categories)
// ----------------------------------------------------------------------------
const HOME_PAGE_DEFAULTS = [
  { dashboard_id: "data", name: "Data", visible: true, order_index: 0, category: "home", is_subcategory: false },
  { dashboard_id: "graphics", name: "Graphics", visible: true, order_index: 1, category: "home", is_subcategory: false },
  { dashboard_id: "agents", name: "Agent", visible: true, order_index: 2, category: "home", is_subcategory: false },
  { dashboard_id: "media_library", name: "Media Library", visible: true, order_index: 3, category: "home", is_subcategory: false },
  // Sub-categories (off by default)
  { dashboard_id: "election", name: "Elections (sub category)", visible: false, order_index: 4, category: "home", is_subcategory: true },
  { dashboard_id: "finance", name: "Finance (sub category)", visible: false, order_index: 5, category: "home", is_subcategory: true },
  { dashboard_id: "weather", name: "Weather (sub category)", visible: false, order_index: 6, category: "home", is_subcategory: true },
  { dashboard_id: "sports", name: "Sports (sub category)", visible: false, order_index: 7, category: "home", is_subcategory: true },
  { dashboard_id: "school_closings", name: "School Closings (sub category)", visible: false, order_index: 8, category: "home", is_subcategory: true },
  { dashboard_id: "news", name: "News (sub category)", visible: false, order_index: 9, category: "home", is_subcategory: true },
];

// Default data dashboards (6 data options)
const DATA_PAGE_DEFAULTS = [
  { dashboard_id: "election", name: "Elections", visible: true, order_index: 0, category: "data", is_default: true },
  { dashboard_id: "finance", name: "Finance", visible: true, order_index: 1, category: "data", is_default: false },
  { dashboard_id: "weather", name: "Weather", visible: true, order_index: 2, category: "data", is_default: false },
  { dashboard_id: "sports", name: "Sports", visible: true, order_index: 3, category: "data", is_default: false },
  { dashboard_id: "school_closings", name: "School Closings", visible: true, order_index: 4, category: "data", is_default: false },
  { dashboard_id: "news", name: "News", visible: true, order_index: 5, category: "data", is_default: false },
];

// ----------------------------------------------------------------------------
// App setup
// ----------------------------------------------------------------------------
const app = new Hono().basePath("/dashboard_config");

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "PATCH", "POST", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type", "apikey"]
}));

// ============================================================================
// GET / - Fetch dashboard configurations
// Query params:
//   - page: "home" | "data" - which page's config to fetch
//   - customer_id: optional customer filter
//   - deployment_id: optional deployment filter
// ============================================================================
app.get("/", async (c) => {
  try {
    const page = c.req.query("page") || "all";
    const customerId = c.req.query("customer_id");
    const deploymentId = c.req.query("deployment_id");

    console.log("🔍 Fetching dashboard config", { page, customerId, deploymentId });

    // Build query
    let query = supabase
      .from("customer_dashboards")
      .select("*")
      .order("order_index", { ascending: true });

    if (customerId) query = query.eq("customer_id", customerId);
    if (deploymentId) query = query.eq("deployment_id", deploymentId);

    const { data: dbData, error } = await query;
    if (error) throw error;

    // Check if database has category column (new schema)
    const hasCategory = dbData && dbData.length > 0 && 'category' in dbData[0];

    if (page === "home") {
      // Return home page dashboards
      if (hasCategory) {
        const homeDashboards = dbData.filter((d: any) => d.category === "home");
        if (homeDashboards.length > 0) {
          return c.json({ ok: true, count: homeDashboards.length, dashboards: homeDashboards, page: "home" });
        }
      }
      // Fallback to defaults with virtual IDs
      const defaults = HOME_PAGE_DEFAULTS.map((d, i) => ({
        id: `home-${d.dashboard_id}`,
        ...d,
        customer_id: customerId || null,
        deployment_id: deploymentId || null,
        access_level: "admin",
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      return c.json({ ok: true, count: defaults.length, dashboards: defaults, page: "home" });
    }

    if (page === "data") {
      // Return data page dashboards
      if (hasCategory) {
        const dataDashboards = dbData.filter((d: any) => d.category === "data");
        if (dataDashboards.length > 0) {
          return c.json({ ok: true, count: dataDashboards.length, dashboards: dataDashboards, page: "data" });
        }
      }
      // Use existing data or fallback to defaults
      const dataDashboardIds = ["election", "finance", "weather", "sports", "school_closings", "news"];
      const existingData = dbData.filter((d: any) => dataDashboardIds.includes(d.dashboard_id));

      if (existingData.length > 0) {
        // Add is_default flag (first one is default if not set)
        const withDefaults = existingData.map((d: any, i: number) => ({
          ...d,
          category: "data",
          is_default: d.is_default ?? (i === 0),
        }));
        return c.json({ ok: true, count: withDefaults.length, dashboards: withDefaults, page: "data" });
      }

      // Fallback to defaults
      const defaults = DATA_PAGE_DEFAULTS.map((d) => ({
        id: `data-${d.dashboard_id}`,
        ...d,
        customer_id: customerId || null,
        deployment_id: deploymentId || null,
        access_level: "admin",
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      return c.json({ ok: true, count: defaults.length, dashboards: defaults, page: "data" });
    }

    // Return all dashboards (legacy behavior)
    return c.json({ ok: true, count: dbData.length, dashboards: dbData });

  } catch (err: any) {
    console.error("❌ Fetch error:", err);
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ============================================================================
// GET /default - Get the default data dashboard
// ============================================================================
app.get("/default", async (c) => {
  try {
    const customerId = c.req.query("customer_id");
    const deploymentId = c.req.query("deployment_id");

    console.log("🔍 Fetching default dashboard", { customerId, deploymentId });

    // Try to find a dashboard marked as default
    let query = supabase
      .from("customer_dashboards")
      .select("*")
      .eq("is_default", true)
      .single();

    const { data, error } = await query;

    if (data && !error) {
      return c.json({ ok: true, default_dashboard: data.dashboard_id });
    }

    // Fallback: return first visible data dashboard or "election"
    const { data: allData } = await supabase
      .from("customer_dashboards")
      .select("*")
      .order("order_index", { ascending: true });

    if (allData && allData.length > 0) {
      const dataDashboardIds = ["election", "finance", "weather", "sports", "school_closings", "news"];
      const firstData = allData.find((d: any) => dataDashboardIds.includes(d.dashboard_id) && d.visible);
      if (firstData) {
        return c.json({ ok: true, default_dashboard: firstData.dashboard_id });
      }
    }

    // Ultimate fallback
    return c.json({ ok: true, default_dashboard: "election" });

  } catch (err: any) {
    console.error("❌ Fetch default error:", err);
    return c.json({ ok: true, default_dashboard: "election" }); // Safe fallback
  }
});

// ============================================================================
// PATCH /update
// Body: can update one or many dashboards
// - Single object: { id, visible?, order_index?, access_level?, is_default? }
// - Array of objects for bulk reorder
// ============================================================================
app.patch("/update", async (c) => {
  try {
    const body = await c.req.json();

    // Handle bulk update
    if (Array.isArray(body)) {
      console.log("🔃 Bulk updating dashboards:", body.length);

      const updates = body.map((item) => ({
        id: item.id,
        visible: item.visible,
        order_index: item.order_index,
        access_level: item.access_level,
        is_default: item.is_default,
        updated_at: new Date().toISOString()
      }));

      // If setting a new default, unset others first
      const newDefault = updates.find(u => u.is_default === true);
      if (newDefault) {
        await supabase
          .from("customer_dashboards")
          .update({ is_default: false })
          .neq("id", newDefault.id);
      }

      for (const update of updates) {
        if (!update.id) continue;

        // Handle virtual IDs (home-*, data-*) - create actual records
        if (update.id.startsWith("home-") || update.id.startsWith("data-")) {
          const dashboardId = update.id.replace("home-", "").replace("data-", "");
          const category = update.id.startsWith("home-") ? "home" : "data";

          console.log("📝 Creating/updating virtual dashboard:", update.id, "->", dashboardId);

          // Find the default config for this dashboard
          const defaults = category === "home" ? HOME_PAGE_DEFAULTS : DATA_PAGE_DEFAULTS;
          const defaultConfig = defaults.find(d => d.dashboard_id === dashboardId);

          if (defaultConfig) {
            // Check if record already exists
            const { data: existing } = await supabase
              .from("customer_dashboards")
              .select("id")
              .eq("dashboard_id", dashboardId)
              .eq("category", category)
              .single();

            if (existing) {
              // Update existing record
              await supabase
                .from("customer_dashboards")
                .update({
                  visible: update.visible ?? defaultConfig.visible,
                  order_index: update.order_index ?? defaultConfig.order_index,
                  is_default: update.is_default ?? false,
                  updated_at: new Date().toISOString()
                })
                .eq("id", existing.id);
              console.log("✅ Updated existing record:", existing.id);
            } else {
              // Insert new record
              const { data: inserted, error: insertError } = await supabase
                .from("customer_dashboards")
                .insert({
                  dashboard_id: dashboardId,
                  name: defaultConfig.name,
                  visible: update.visible ?? defaultConfig.visible,
                  order_index: update.order_index ?? defaultConfig.order_index,
                  category: category,
                  is_subcategory: defaultConfig.is_subcategory ?? false,
                  is_default: update.is_default ?? false,
                  access_level: "admin"
                })
                .select()
                .single();

              if (insertError) {
                console.error("❌ Insert error:", insertError);
              } else {
                console.log("✅ Inserted new record:", inserted?.id);
              }
            }
          }
          continue;
        }

        await supabase
          .from("customer_dashboards")
          .update(update)
          .eq("id", update.id);
      }

      return c.json({
        ok: true,
        message: "✅ Bulk update complete",
        count: updates.length
      });
    }

    // Single update
    const { id, visible, order_index, access_level, is_default } = body;

    if (!id) {
      return c.json({ error: "Missing dashboard id" }, 400);
    }

    // Skip virtual IDs
    if (id.startsWith("home-") || id.startsWith("data-")) {
      return c.json({ ok: true, message: "Virtual dashboard - no update needed" });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (visible !== undefined) updates.visible = visible;
    if (order_index !== undefined) updates.order_index = order_index;
    if (access_level !== undefined) updates.access_level = access_level;

    // If setting as default, unset others first
    if (is_default === true) {
      await supabase
        .from("customer_dashboards")
        .update({ is_default: false })
        .neq("id", id);
      updates.is_default = true;
    } else if (is_default === false) {
      updates.is_default = false;
    }

    console.log("✏️ Updating dashboard config:", updates);

    const { data, error } = await supabase
      .from("customer_dashboards")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Dashboard updated:", data);
    return c.json({ ok: true, data });

  } catch (err: any) {
    console.error("❌ Update error:", err);
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ============================================================================
// POST /set-default
// Body: { dashboard_id: string }
// Sets the specified dashboard as the default data dashboard
// ============================================================================
app.post("/set-default", async (c) => {
  try {
    const { dashboard_id } = await c.req.json();

    if (!dashboard_id) {
      return c.json({ error: "Missing dashboard_id" }, 400);
    }

    console.log("⭐ Setting default dashboard:", dashboard_id);

    // First, unset all defaults
    await supabase
      .from("customer_dashboards")
      .update({ is_default: false })
      .neq("dashboard_id", "");

    // Then set the new default
    const { data, error } = await supabase
      .from("customer_dashboards")
      .update({ is_default: true })
      .eq("dashboard_id", dashboard_id)
      .select()
      .single();

    if (error) {
      console.log("⚠️ Could not update is_default column, may not exist:", error.message);
      // Column might not exist, that's ok - we store it client-side
      return c.json({ ok: true, default_dashboard: dashboard_id, note: "Stored client-side" });
    }

    return c.json({ ok: true, default_dashboard: dashboard_id, data });

  } catch (err: any) {
    console.error("❌ Set default error:", err);
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ----------------------------------------------------------------------------
// Run server
// ----------------------------------------------------------------------------
console.log("[dashboard_config] Ready");
Deno.serve(app.fetch);
