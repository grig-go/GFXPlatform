/**
 * Pulsar Channels Edge Function
 *
 * Handles all CRUD operations for pulsar_channels table.
 * This eliminates stale connection issues by using fresh HTTP connections.
 * Used by both nova-gfx and pulsar-gfx apps.
 *
 * Endpoints:
 * - GET /pulsar-channels - List all channels (supports ?organization_id=xxx filter)
 * - GET /pulsar-channels/:id - Get single channel by ID
 * - POST /pulsar-channels - Create new channel
 * - PATCH /pulsar-channels/:id - Update channel
 * - DELETE /pulsar-channels/:id - Delete channel
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

console.log("[pulsar-channels] Edge Function started");

serve(async (req) => {
  console.log(`[pulsar-channels] Incoming request: ${req.method} ${req.url}`);

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

    // Extract channel ID from path if present
    // Path format: /pulsar-channels or /pulsar-channels/:id
    const pathParts = url.pathname.split("/").filter(Boolean);
    const channelId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

    // Skip if channelId looks like function name (not a UUID)
    const isUUID = channelId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channelId);

    // ============================================================
    // GET - List or fetch single channel
    // ============================================================
    if (method === "GET") {
      // Single channel by ID
      if (isUUID && channelId) {
        console.log(`[pulsar-channels] Fetching channel: ${channelId}`);

        const { data, error } = await supabase
          .from("pulsar_channels")
          .select("*")
          .eq("id", channelId)
          .single();

        if (error) {
          console.error(`[pulsar-channels] Error fetching channel:`, error);
          return new Response(
            JSON.stringify({ error: "Channel not found", details: error.message }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // List all channels
      console.log(`[pulsar-channels] Listing channels`);

      const organizationId = url.searchParams.get("organization_id");

      let query = supabase
        .from("pulsar_channels")
        .select("*")
        .order("created_at", { ascending: true });

      // Filter by organization if provided
      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[pulsar-channels] Error listing channels:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch channels", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[pulsar-channels] Found ${data?.length || 0} channels`);

      return new Response(
        JSON.stringify({ data: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // POST - Create new channel
    // ============================================================
    if (method === "POST") {
      console.log(`[pulsar-channels] Creating new channel`);

      const body = await req.json();
      const {
        name,
        organization_id,
        channel_code,
        channel_mode = "fill",
        player_url,
        layer_count = 4,
        layer_config,
        auto_initialize_on_connect = true,
        auto_initialize_on_publish = true,
      } = body;

      if (!name) {
        return new Response(
          JSON.stringify({ error: "Channel name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("pulsar_channels")
        .insert({
          name,
          organization_id,
          channel_code: channel_code || `CH-${Date.now()}`,
          channel_mode,
          player_url,
          layer_count,
          layer_config,
          auto_initialize_on_connect,
          auto_initialize_on_publish,
          player_status: "disconnected",
        })
        .select()
        .single();

      if (error) {
        console.error(`[pulsar-channels] Error creating channel:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to create channel", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[pulsar-channels] Created channel: ${data.id}`);

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // PATCH - Update channel
    // ============================================================
    if (method === "PATCH") {
      if (!isUUID || !channelId) {
        return new Response(
          JSON.stringify({ error: "Channel ID is required for update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[pulsar-channels] Updating channel: ${channelId}`);

      const body = await req.json();

      // Only allow specific fields to be updated
      const allowedFields = [
        "name",
        "channel_code",
        "channel_mode",
        "player_url",
        "player_status",
        "last_heartbeat",
        "loaded_project_id",
        "last_initialized",
        "layer_count",
        "layer_config",
        "assigned_operators",
        "is_locked",
        "locked_by",
        "auto_initialize_on_connect",
        "auto_initialize_on_publish",
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

      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("pulsar_channels")
        .update(updateData)
        .eq("id", channelId)
        .select()
        .single();

      if (error) {
        console.error(`[pulsar-channels] Error updating channel:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to update channel", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[pulsar-channels] Updated channel: ${channelId}`);

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // DELETE - Delete channel
    // ============================================================
    if (method === "DELETE") {
      if (!isUUID || !channelId) {
        return new Response(
          JSON.stringify({ error: "Channel ID is required for delete" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[pulsar-channels] Deleting channel: ${channelId}`);

      // Delete associated channel state first (if exists)
      await supabase
        .from("pulsar_channel_state")
        .delete()
        .eq("channel_id", channelId);

      // Delete the channel
      const { error } = await supabase
        .from("pulsar_channels")
        .delete()
        .eq("id", channelId);

      if (error) {
        console.error(`[pulsar-channels] Error deleting channel:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to delete channel", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[pulsar-channels] Deleted channel: ${channelId}`);

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
    console.error("[pulsar-channels] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
