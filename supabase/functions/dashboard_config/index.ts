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
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// ----------------------------------------------------------------------------
// App setup
// ----------------------------------------------------------------------------
const app = new Hono().basePath("/dashboard_config");
app.use("*", cors({
  origin: "*",
  allowMethods: [
    "GET",
    "PATCH",
    "OPTIONS"
  ],
  allowHeaders: [
    "Authorization",
    "Content-Type",
    "apikey"
  ]
}));
// ============================================================================
// GET / - Fetch dashboard configurations
// Optional query params: ?customer_id=&deployment_id=
// ============================================================================
app.get("/", async (c)=>{
  try {
    const customerId = c.req.query("customer_id");
    const deploymentId = c.req.query("deployment_id");
    console.log("🔍 Fetching dashboard config", {
      customerId,
      deploymentId
    });
    let query = supabase.from("customer_dashboards").select("*").order("order_index", {
      ascending: true
    });
    if (customerId) query = query.eq("customer_id", customerId);
    if (deploymentId) query = query.eq("deployment_id", deploymentId);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({
      ok: true,
      count: data.length,
      dashboards: data
    });
  } catch (err) {
    console.error("❌ Fetch error:", err);
    return c.json({
      ok: false,
      error: err.message
    }, 500);
  }
});
// ============================================================================
// PATCH /update
// Body: can update one or many dashboards
// - Single object: { id, visible?, order_index?, access_level? }
// - Array of objects for bulk reorder
// ============================================================================
app.patch("/update", async (c)=>{
  try {
    const body = await c.req.json();
    // Handle bulk update
    if (Array.isArray(body)) {
      console.log("🔃 Bulk updating dashboards:", body.length);
      const updates = body.map((item)=>({
          id: item.id,
          visible: item.visible,
          order_index: item.order_index,
          access_level: item.access_level,
          updated_at: new Date().toISOString()
        }));
      for (const update of updates){
        if (!update.id) continue;
        await supabase.from("customer_dashboards").update(update).eq("id", update.id);
      }
      return c.json({
        ok: true,
        message: "✅ Bulk update complete",
        count: updates.length
      });
    }
    // Single update
    const { id, visible, order_index, access_level } = body;
    if (!id) return c.json({
      error: "Missing dashboard id"
    }, 400);
    const updates = {
      updated_at: new Date().toISOString()
    };
    if (visible !== undefined) updates.visible = visible;
    if (order_index !== undefined) updates.order_index = order_index;
    if (access_level !== undefined) updates.access_level = access_level;
    console.log("✏️ Updating dashboard config:", updates);
    const { data, error } = await supabase.from("customer_dashboards").update(updates).eq("id", id).select().single();
    if (error) throw error;
    console.log("✅ Dashboard updated:", data);
    return c.json({
      ok: true,
      data
    });
  } catch (err) {
    console.error("❌ Update error:", err);
    return c.json({
      ok: false,
      error: err.message
    }, 500);
  }
});
// ----------------------------------------------------------------------------
// Run server
// ----------------------------------------------------------------------------
console.log("[dashboard_config] Ready");
Deno.serve(app.fetch);
