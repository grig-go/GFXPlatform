/**
 * Organization Textures Edge Function
 *
 * Handles all CRUD operations for organization_textures table.
 * This eliminates stale connection issues by using fresh HTTP connections.
 * Used by nova-gfx and pulsar-gfx apps.
 *
 * Endpoints:
 * - GET /organization-textures - List all textures (requires ?organization_id=xxx)
 * - GET /organization-textures/:id - Get single texture by ID
 * - POST /organization-textures - Create new texture record (metadata only, upload handled client-side)
 * - PATCH /organization-textures/:id - Update texture metadata
 * - DELETE /organization-textures/:id - Delete texture and storage files
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

// Storage bucket name for textures
// Note: The bucket in Supabase is named "Texures" (without the second 't')
const TEXTURES_BUCKET = "Texures";

console.log("[organization-textures] Edge Function started");

serve(async (req) => {
  console.log(`[organization-textures] Incoming request: ${req.method} ${req.url}`);

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

    // Extract texture ID from path if present
    // Path format: /organization-textures or /organization-textures/:id
    const pathParts = url.pathname.split("/").filter(Boolean);
    const textureId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

    // Skip if textureId looks like function name (not a UUID)
    const isUUID = textureId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(textureId);

    // ============================================================
    // GET - List or fetch single texture
    // ============================================================
    if (method === "GET") {
      // Single texture by ID
      if (isUUID && textureId) {
        console.log(`[organization-textures] Fetching texture: ${textureId}`);

        const { data, error } = await supabase
          .from("organization_textures")
          .select("*")
          .eq("id", textureId)
          .single();

        if (error) {
          console.error(`[organization-textures] Error fetching texture:`, error);
          return new Response(
            JSON.stringify({ error: "Texture not found", details: error.message }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // List textures - requires organization_id
      const organizationId = url.searchParams.get("organization_id");
      if (!organizationId) {
        return new Response(
          JSON.stringify({ error: "organization_id query parameter is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[organization-textures] Listing textures for org: ${organizationId}`);

      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const type = url.searchParams.get("type"); // 'image' or 'video'
      const search = url.searchParams.get("search");
      const tagsParam = url.searchParams.get("tags"); // comma-separated

      let query = supabase
        .from("organization_textures")
        .select("*", { count: "exact" })
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        query = query.eq("media_type", type);
      }

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      if (tagsParam) {
        const tags = tagsParam.split(",").filter(Boolean);
        if (tags.length > 0) {
          query = query.contains("tags", tags);
        }
      }

      const { data, error, count } = await query;

      if (error) {
        console.error(`[organization-textures] Error listing textures:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch textures", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[organization-textures] Found ${data?.length || 0} textures (total: ${count})`);

      return new Response(
        JSON.stringify({
          data: data || [],
          count: count || 0,
          hasMore: (count || 0) > offset + limit,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // POST - Create new texture record
    // Note: File upload is handled client-side to Supabase Storage
    // This just creates the database record with the file URL
    // ============================================================
    if (method === "POST") {
      console.log(`[organization-textures] Creating new texture record`);

      const body = await req.json();
      const {
        organization_id,
        name,
        file_name,
        file_url,
        thumbnail_url,
        storage_path,
        media_type,
        size,
        width,
        height,
        duration,
        uploaded_by,
        tags = [],
      } = body;

      if (!organization_id || !name || !file_url || !storage_path) {
        return new Response(
          JSON.stringify({ error: "organization_id, name, file_url, and storage_path are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("organization_textures")
        .insert({
          organization_id,
          name,
          file_name: file_name || name,
          file_url,
          thumbnail_url,
          storage_path,
          media_type: media_type || "image",
          size,
          width,
          height,
          duration,
          uploaded_by,
          tags,
        })
        .select()
        .single();

      if (error) {
        console.error(`[organization-textures] Error creating texture:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to create texture", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[organization-textures] Created texture: ${data.id}`);

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // PATCH - Update texture metadata
    // ============================================================
    if (method === "PATCH") {
      if (!isUUID || !textureId) {
        return new Response(
          JSON.stringify({ error: "Texture ID is required for update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[organization-textures] Updating texture: ${textureId}`);

      const body = await req.json();

      // Only allow specific fields to be updated
      const allowedFields = [
        "name",
        "tags",
        "thumbnail_url",
      ];

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }

      if (Object.keys(updateData).length === 1) { // Only updated_at
        return new Response(
          JSON.stringify({ error: "No valid fields to update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("organization_textures")
        .update(updateData)
        .eq("id", textureId)
        .select()
        .single();

      if (error) {
        console.error(`[organization-textures] Error updating texture:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to update texture", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[organization-textures] Updated texture: ${textureId}`);

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // DELETE - Delete texture and storage files
    // ============================================================
    if (method === "DELETE") {
      if (!isUUID || !textureId) {
        return new Response(
          JSON.stringify({ error: "Texture ID is required for delete" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[organization-textures] Deleting texture: ${textureId}`);

      // First get the texture to get storage paths
      const { data: texture, error: fetchError } = await supabase
        .from("organization_textures")
        .select("storage_path, thumbnail_url")
        .eq("id", textureId)
        .single();

      if (fetchError) {
        console.error(`[organization-textures] Error finding texture:`, fetchError);
        return new Response(
          JSON.stringify({ error: "Texture not found", details: fetchError.message }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete from storage
      const pathsToDelete = [texture.storage_path];

      // Extract thumbnail path from storage_path if thumbnail exists
      if (texture.thumbnail_url && texture.storage_path) {
        const thumbPath = texture.storage_path.replace(/([^/]+)$/, "thumbnails/$1.jpg");
        pathsToDelete.push(thumbPath);
      }

      const { error: storageError } = await supabase.storage
        .from(TEXTURES_BUCKET)
        .remove(pathsToDelete);

      if (storageError) {
        console.warn(`[organization-textures] Failed to delete storage files:`, storageError);
        // Continue with database deletion even if storage fails
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from("organization_textures")
        .delete()
        .eq("id", textureId);

      if (dbError) {
        console.error(`[organization-textures] Error deleting texture:`, dbError);
        return new Response(
          JSON.stringify({ error: "Failed to delete texture", details: dbError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[organization-textures] Deleted texture: ${textureId}`);

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
    console.error("[organization-textures] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
