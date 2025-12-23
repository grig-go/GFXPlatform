/**
 * Pulsar User Preferences Edge Function
 *
 * Handles CRUD operations for pulsar_user_preferences table.
 * Uses fresh HTTP connections to avoid stale Supabase client issues.
 *
 * Endpoints:
 * - GET /pulsar-user-preferences?user_id=xxx - Get preferences for a user
 * - POST /pulsar-user-preferences - Create or update preferences (upsert)
 * - PATCH /pulsar-user-preferences?user_id=xxx - Update specific fields
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

console.log("[pulsar-user-preferences] Edge Function started");

serve(async (req) => {
  console.log(`[pulsar-user-preferences] Incoming request: ${req.method} ${req.url}`);

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

    const userId = url.searchParams.get("user_id");

    // ============================================================
    // GET - Fetch user preferences
    // ============================================================
    if (method === "GET") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "user_id query parameter is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[pulsar-user-preferences] Fetching preferences for user: ${userId}`);

      const { data, error } = await supabase
        .from("pulsar_user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error(`[pulsar-user-preferences] Error fetching preferences:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch preferences", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[pulsar-user-preferences] Found preferences:`, data ? 'yes' : 'no');

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // POST - Create or update preferences (upsert)
    // ============================================================
    if (method === "POST") {
      const body = await req.json();
      const { user_id, ...preferences } = body;

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id is required in body" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[pulsar-user-preferences] Upserting preferences for user: ${user_id}`);

      // Map camelCase to snake_case
      const data: Record<string, unknown> = {
        user_id,
      };

      if (preferences.lastProjectId !== undefined) data.last_project_id = preferences.lastProjectId;
      if (preferences.openPlaylistIds !== undefined) data.open_playlist_ids = preferences.openPlaylistIds;
      if (preferences.activePlaylistId !== undefined) data.active_playlist_id = preferences.activePlaylistId;
      if (preferences.selectedChannelId !== undefined) data.selected_channel_id = preferences.selectedChannelId;
      if (preferences.showPlayoutControls !== undefined) data.show_playout_controls = preferences.showPlayoutControls;
      if (preferences.showPreview !== undefined) data.show_preview = preferences.showPreview;
      if (preferences.showContentEditor !== undefined) data.show_content_editor = preferences.showContentEditor;

      // Use upsert - insert if not exists, update if exists
      const { data: result, error } = await supabase
        .from("pulsar_user_preferences")
        .upsert(data, { onConflict: "user_id" })
        .select()
        .single();

      if (error) {
        console.error(`[pulsar-user-preferences] Error upserting preferences:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to save preferences", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[pulsar-user-preferences] Saved preferences successfully`);

      return new Response(
        JSON.stringify({ data: result, success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // PATCH - Update specific fields
    // ============================================================
    if (method === "PATCH") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "user_id query parameter is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();

      console.log(`[pulsar-user-preferences] Updating preferences for user: ${userId}`, body);

      // Map camelCase to snake_case for update
      const updateData: Record<string, unknown> = {};

      if (body.lastProjectId !== undefined) updateData.last_project_id = body.lastProjectId;
      if (body.openPlaylistIds !== undefined) updateData.open_playlist_ids = body.openPlaylistIds;
      if (body.activePlaylistId !== undefined) updateData.active_playlist_id = body.activePlaylistId;
      if (body.selectedChannelId !== undefined) updateData.selected_channel_id = body.selectedChannelId;
      if (body.showPlayoutControls !== undefined) updateData.show_playout_controls = body.showPlayoutControls;
      if (body.showPreview !== undefined) updateData.show_preview = body.showPreview;
      if (body.showContentEditor !== undefined) updateData.show_content_editor = body.showContentEditor;

      // Also support snake_case directly
      if (body.last_project_id !== undefined) updateData.last_project_id = body.last_project_id;
      if (body.open_playlist_ids !== undefined) updateData.open_playlist_ids = body.open_playlist_ids;
      if (body.active_playlist_id !== undefined) updateData.active_playlist_id = body.active_playlist_id;
      if (body.selected_channel_id !== undefined) updateData.selected_channel_id = body.selected_channel_id;
      if (body.show_playout_controls !== undefined) updateData.show_playout_controls = body.show_playout_controls;
      if (body.show_preview !== undefined) updateData.show_preview = body.show_preview;
      if (body.show_content_editor !== undefined) updateData.show_content_editor = body.show_content_editor;

      if (Object.keys(updateData).length === 0) {
        return new Response(
          JSON.stringify({ error: "No valid fields to update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // First check if row exists
      const { data: existing } = await supabase
        .from("pulsar_user_preferences")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // Update existing row
        const { data: result, error } = await supabase
          .from("pulsar_user_preferences")
          .update(updateData)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) {
          console.error(`[pulsar-user-preferences] Error updating preferences:`, error);
          return new Response(
            JSON.stringify({ error: "Failed to update preferences", details: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[pulsar-user-preferences] Updated preferences successfully`);

        return new Response(
          JSON.stringify({ data: result, success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Insert new row with defaults
        const insertData = {
          user_id: userId,
          open_playlist_ids: [],
          show_playout_controls: true,
          show_preview: true,
          show_content_editor: true,
          ...updateData,
        };

        const { data: result, error } = await supabase
          .from("pulsar_user_preferences")
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error(`[pulsar-user-preferences] Error inserting preferences:`, error);
          return new Response(
            JSON.stringify({ error: "Failed to create preferences", details: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[pulsar-user-preferences] Created preferences successfully`);

        return new Response(
          JSON.stringify({ data: result, success: true }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ============================================================
    // Default - Method not allowed
    // ============================================================
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error("[pulsar-user-preferences] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
