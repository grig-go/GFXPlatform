/**
 * GFX Projects Edge Function
 *
 * Handles all CRUD operations for gfx_projects table.
 * This eliminates stale connection issues by using fresh HTTP connections.
 *
 * Endpoints:
 * - GET /gfx-projects - List all projects (supports ?organization_id=xxx filter)
 * - GET /gfx-projects/:id - Get single project by ID
 * - POST /gfx-projects - Create new project
 * - PATCH /gfx-projects/:id - Update project
 * - DELETE /gfx-projects/:id - Archive project (soft delete)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

console.log("[gfx-projects] Edge Function started");

serve(async (req) => {
  console.log(`[gfx-projects] Incoming request: ${req.method} ${req.url}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract project ID from path if present
    // Path format: /gfx-projects or /gfx-projects/:id
    const pathParts = url.pathname.split("/").filter(Boolean);
    const projectId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

    // Skip if projectId looks like function name (not a UUID)
    const isUUID = projectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);

    // ============================================================
    // GET - List or fetch single project
    // ============================================================
    if (method === "GET") {
      // Single project by ID
      if (isUUID && projectId) {
        console.log(`[gfx-projects] Fetching project: ${projectId}`);

        const { data, error } = await supabase
          .from("gfx_projects")
          .select("*")
          .eq("id", projectId)
          .single();

        if (error) {
          console.error(`[gfx-projects] Error fetching project:`, error);
          return new Response(
            JSON.stringify({ error: "Project not found", details: error.message }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // List all projects
      console.log(`[gfx-projects] Listing projects`);

      const organizationId = url.searchParams.get("organization_id");
      const includeArchived = url.searchParams.get("include_archived") === "true";
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      let query = supabase
        .from("gfx_projects")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Filter by organization if provided
      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      // Filter out archived unless explicitly requested
      if (!includeArchived) {
        query = query.eq("archived", false);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error(`[gfx-projects] Error listing projects:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch projects", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[gfx-projects] Found ${data?.length || 0} projects (total: ${count})`);

      return new Response(
        JSON.stringify({ data: data || [], count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // POST - Create new project
    // ============================================================
    if (method === "POST") {
      console.log(`[gfx-projects] Creating new project`);

      const body = await req.json();
      const {
        name,
        description,
        organization_id,
        created_by,
        canvas_width = 1920,
        canvas_height = 1080,
        frame_rate = 60,
        background_color = "transparent",
        interactive_enabled = false,
        interactive_config = null,
      } = body;

      if (!name) {
        return new Response(
          JSON.stringify({ error: "Project name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("gfx_projects")
        .insert({
          name,
          description,
          organization_id,
          created_by,
          canvas_width,
          canvas_height,
          frame_rate,
          background_color,
          interactive_enabled,
          interactive_config,
        })
        .select()
        .single();

      if (error) {
        console.error(`[gfx-projects] Error creating project:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to create project", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[gfx-projects] Created project: ${data.id}`);

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // PATCH - Update project
    // ============================================================
    if (method === "PATCH") {
      if (!isUUID || !projectId) {
        return new Response(
          JSON.stringify({ error: "Project ID is required for update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[gfx-projects] Updating project: ${projectId}`);

      const body = await req.json();

      // Only allow specific fields to be updated
      const allowedFields = [
        "name",
        "description",
        "canvas_width",
        "canvas_height",
        "frame_rate",
        "background_color",
        "api_enabled",
        "is_live",
        "archived",
        "interactive_enabled",
        "interactive_config",
        "updated_by",
        "slug",
        "custom_url_slug",
      ];

      const updateData: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(
          JSON.stringify({ error: "No valid fields to update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("gfx_projects")
        .update(updateData)
        .eq("id", projectId)
        .select()
        .single();

      if (error) {
        console.error(`[gfx-projects] Error updating project:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to update project", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[gfx-projects] Updated project: ${projectId}`);

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // DELETE - Archive project (soft delete)
    // ============================================================
    if (method === "DELETE") {
      if (!isUUID || !projectId) {
        return new Response(
          JSON.stringify({ error: "Project ID is required for delete" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[gfx-projects] Archiving project: ${projectId}`);

      // Check if hard delete is requested
      const hardDelete = url.searchParams.get("hard") === "true";

      if (hardDelete) {
        // Hard delete - permanently remove the project
        const { error } = await supabase
          .from("gfx_projects")
          .delete()
          .eq("id", projectId);

        if (error) {
          console.error(`[gfx-projects] Error deleting project:`, error);
          return new Response(
            JSON.stringify({ error: "Failed to delete project", details: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[gfx-projects] Hard deleted project: ${projectId}`);
      } else {
        // Soft delete - just archive the project
        const { error } = await supabase
          .from("gfx_projects")
          .update({ archived: true })
          .eq("id", projectId);

        if (error) {
          console.error(`[gfx-projects] Error archiving project:`, error);
          return new Response(
            JSON.stringify({ error: "Failed to archive project", details: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[gfx-projects] Archived project: ${projectId}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // Default - Method not allowed
    // ============================================================
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error("[gfx-projects] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
