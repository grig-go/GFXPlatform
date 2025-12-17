import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
const app = new Hono();
// Logger
app.use("*", logger(console.log));
// CORS
app.use("/*", cors({
  origin: "*",
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "apikey"
  ],
  allowMethods: [
    "GET",
    "POST",
    "DELETE",
    "OPTIONS"
  ],
  exposeHeaders: [
    "Content-Length"
  ],
  maxAge: 600
}));
const getUser = async (c)=>{
  const auth = c.req.header("Authorization");
  if (!auth) {
    console.log("⚠️ No Authorization header - using DEV user");
    return {
      id: "00000000-0000-0000-0000-000000000000"
    };
  }
  const token = auth.replace("Bearer ", "");
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), {
    global: {
      headers: {
        Authorization: auth
      }
    }
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    console.log("⚠️ Auth failed - using DEV user:", error?.message);
    return {
      id: "00000000-0000-0000-0000-000000000000"
    };
  }
  console.log("✅ Authenticated user:", data.user.id);
  return data.user;
};
const svc = ()=>createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
// FETCH FULL SETTINGS
app.get("/map_settings", async (c)=>{
  const user = await getUser(c);
  const { data, error } = await svc().rpc("get_map_settings", {
    p_user_id: user.id
  });
  if (error) return c.json({
    error: error.message
  }, 500);
  return c.json(data);
});
// SAVE SETTINGS
app.post("/map_settings", async (c)=>{
  const user = await getUser(c);
  const body = await c.req.json();
  console.log("📦 Request body:", JSON.stringify(body, null, 2));
  console.log("👤 User ID:", user.id);
  const { data, error } = await svc().rpc("save_map_settings", {
    p_user_id: user.id,
    p_settings: body
  });
  if (error) {
    console.error("❌ RPC Error:", error.message);
    return c.json({
      error: error.message
    }, 500);
  }
  console.log("✅ Settings saved successfully");
  return c.json({
    ok: true,
    settings: data
  });
});
// SAVE POSITION
app.post("/map_settings/save-position", async (c)=>{
  const user = await getUser(c);
  const { name, latitude, longitude, zoom } = await c.req.json();
  const { data, error } = await svc().rpc("save_map_position", {
    p_user_id: user.id,
    p_name: name,
    p_lat: latitude,
    p_lng: longitude,
    p_zoom: zoom
  });
  if (error) return c.json({
    error: error.message
  }, 500);
  return c.json({
    ok: true,
    settings: data
  });
});
// DELETE POSITION
app.delete("/map_settings/position/:id", async (c)=>{
  const user = await getUser(c);
  const { data, error } = await svc().rpc("delete_map_position", {
    p_user_id: user.id,
    p_position_id: c.req.param("id")
  });
  if (error) return c.json({
    error: error.message
  }, 500);
  return c.json({
    ok: true,
    settings: data
  });
});
Deno.serve(app.fetch);
