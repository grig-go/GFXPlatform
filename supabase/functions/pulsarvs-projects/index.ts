import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey"
};

console.log("[pulsarvs-projects] Edge Function started");

serve(async (req) => {
  console.log(`[pulsarvs-projects] Incoming request: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();

    // Create Supabase client with service role for database access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create client with user's auth token for RLS
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[pulsarvs-projects] Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[pulsarvs-projects] User: ${user.email}`);

    // Get user's organization_id from u_users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from("u_users")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !userData) {
      console.error("[pulsarvs-projects] User lookup error:", userError);
      return new Response(JSON.stringify({ error: "User not found in organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userOrgId = userData.organization_id;
    console.log(`[pulsarvs-projects] User org: ${userOrgId}`);

    // Extract project ID from query params (preferred) or check for active flag
    const projectId = url.searchParams.get("id");
    const activeParam = url.searchParams.get("active");
    console.log(`[pulsarvs-projects] Params - id: ${projectId}, active: ${activeParam}`);

    // ============================================================
    // GET — List all projects or get single project
    // ============================================================
    if (method === "GET") {
      if (projectId) {
        // Get single project
        const { data, error } = await supabaseAdmin
          .from("pulsarvs_projects")
          .select("*")
          .eq("id", projectId)
          .eq("organization_id", userOrgId)
          .single();

        if (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get active project
      if (activeParam === "true") {
        const { data, error } = await supabaseAdmin
          .from("pulsarvs_projects")
          .select("*")
          .eq("organization_id", userOrgId)
          .eq("is_active", true)
          .single();

        if (error) {
          return new Response(JSON.stringify({ success: false, error: "No active project" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // List all projects
      const { data, error } = await supabaseAdmin
        .from("pulsarvs_projects")
        .select("*")
        .eq("organization_id", userOrgId)
        .order("name", { ascending: true });

      if (error) {
        console.error("[pulsarvs-projects] List error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`[pulsarvs-projects] Found ${data?.length || 0} projects`);
      return new Response(JSON.stringify({ success: true, data: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ============================================================
    // POST — Create new project
    // ============================================================
    if (method === "POST") {
      const body = await req.json();
      const { name, description, default_channel_id, default_instance_id, color, icon, settings } = body;

      if (!name) {
        return new Response(JSON.stringify({ success: false, error: "Name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data, error } = await supabaseAdmin
        .from("pulsarvs_projects")
        .insert({
          name,
          description: description || null,
          default_channel_id: default_channel_id || null,
          default_instance_id: default_instance_id || null,
          color: color || "blue",
          icon: icon || "📁",
          settings: settings || {},
          organization_id: userOrgId
        })
        .select()
        .single();

      if (error) {
        console.error("[pulsarvs-projects] Create error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ============================================================
    // PUT — Update project or set active
    // ============================================================
    if (method === "PUT") {
      const body = await req.json();

      // Get project ID from query params or body
      const targetProjectId = projectId || body.id;
      if (!targetProjectId) {
        return new Response(JSON.stringify({ success: false, error: "Project ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Check if this is a "set active" request
      if (body.setActive === true || body.action === "setActive") {
        // Deactivate all projects for this org
        await supabaseAdmin
          .from("pulsarvs_projects")
          .update({ is_active: false })
          .eq("organization_id", userOrgId)
          .eq("is_active", true);

        // Activate the requested project
        const { data, error } = await supabaseAdmin
          .from("pulsarvs_projects")
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq("id", targetProjectId)
          .eq("organization_id", userOrgId)
          .select()
          .single();

        if (error) {
          console.error("[pulsarvs-projects] Set active error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Regular update
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.default_channel_id !== undefined) updateData.default_channel_id = body.default_channel_id;
      if (body.default_instance_id !== undefined) updateData.default_instance_id = body.default_instance_id;
      if (body.color !== undefined) updateData.color = body.color;
      if (body.icon !== undefined) updateData.icon = body.icon;
      if (body.settings !== undefined) updateData.settings = body.settings;

      const { data, error } = await supabaseAdmin
        .from("pulsarvs_projects")
        .update(updateData)
        .eq("id", targetProjectId)
        .eq("organization_id", userOrgId)
        .select()
        .single();

      if (error) {
        console.error("[pulsarvs-projects] Update error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ============================================================
    // DELETE — Delete project(s)
    // ============================================================
    if (method === "DELETE") {
      // Check for batch delete via query param
      const idsParam = url.searchParams.get("ids");
      if (idsParam) {
        const ids = idsParam.split(",");
        const results = { success: 0, failed: 0, errors: [] as string[] };

        for (const id of ids) {
          const { error } = await supabaseAdmin
            .from("pulsarvs_projects")
            .delete()
            .eq("id", id.trim())
            .eq("organization_id", userOrgId);

          if (error) {
            results.failed++;
            results.errors.push(`${id}: ${error.message}`);
          } else {
            results.success++;
          }
        }

        return new Response(JSON.stringify({ success: true, ...results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (!projectId) {
        return new Response(JSON.stringify({ success: false, error: "Project ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { error } = await supabaseAdmin
        .from("pulsarvs_projects")
        .delete()
        .eq("id", projectId)
        .eq("organization_id", userOrgId);

      if (error) {
        console.error("[pulsarvs-projects] Delete error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ============================================================
    // PATCH — Batch operations
    // ============================================================
    if (method === "PATCH") {
      const body = await req.json();
      const { operation, ids, updates } = body;

      if (!operation || !Array.isArray(ids) || ids.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "operation and ids array required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };

      if (operation === "delete") {
        for (const id of ids) {
          const { error } = await supabaseAdmin
            .from("pulsarvs_projects")
            .delete()
            .eq("id", id)
            .eq("organization_id", userOrgId);

          if (error) {
            results.failed++;
            results.errors.push(`${id}: ${error.message}`);
          } else {
            results.success++;
          }
        }
      } else if (operation === "update") {
        for (const id of ids) {
          const { error } = await supabaseAdmin
            .from("pulsarvs_projects")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("organization_id", userOrgId);

          if (error) {
            results.failed++;
            results.errors.push(`${id}: ${error.message}`);
          } else {
            results.success++;
          }
        }
      } else {
        return new Response(JSON.stringify({ success: false, error: `Unknown operation: ${operation}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, ...results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[pulsarvs-projects] Error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
