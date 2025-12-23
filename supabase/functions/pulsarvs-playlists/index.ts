import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey"
};

// Create admin client once at module level for connection reuse
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Helper to get user and org in one query using JWT claims
async function getUserOrgFromToken(authHeader: string): Promise<{ userId: string; orgId: string } | null> {
  try {
    // Extract JWT and decode to get user ID directly (faster than API call)
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.sub;

    if (!userId) return null;

    // Get org_id from u_users
    const { data, error } = await supabaseAdmin
      .from("u_users")
      .select("organization_id")
      .eq("auth_user_id", userId)
      .single();

    if (error || !data) return null;
    return { userId, orgId: data.organization_id };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get user and org from token (single DB call instead of two)
    const auth = await getUserOrgFromToken(authHeader);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userOrgId = auth.orgId;

    // Parse path and query params
    // Edge function path is like /pulsarvs-playlists or /pulsarvs-playlists/items/:playlistId
    const pathParts = url.pathname.split("/").filter(Boolean);
    // First part is function name (pulsarvs-playlists), so actual paths start at index 1
    const pathSegment1 = pathParts.length > 1 ? pathParts[1] : null;
    const pathSegment2 = pathParts.length > 2 ? pathParts[2] : null;

    // Get IDs from query params (preferred) or path segments
    let playlistId = url.searchParams.get("id");
    let subResource: string | null = null;
    let itemId: string | null = null;

    // Check for /items/:playlistId pattern
    if (pathSegment1 === "items" && pathSegment2) {
      subResource = "items";
      playlistId = pathSegment2;
    } else if (pathSegment1 === "nested" && pathSegment2) {
      subResource = "nested";
      itemId = pathSegment2;
    }

    console.log("[pulsarvs-playlists] Parsed - playlistId:", playlistId, "subResource:", subResource, "itemId:", itemId);

    // ============================================================
    // ITEMS SUB-RESOURCE
    // ============================================================
    if (playlistId && subResource === "items") {
      // Verify playlist belongs to user's org
      const { data: playlist, error: playlistError } = await supabaseAdmin
        .from("pulsarvs_playlists")
        .select("id")
        .eq("id", playlistId)
        .eq("organization_id", userOrgId)
        .single();

      if (playlistError || !playlist) {
        return new Response(JSON.stringify({ success: false, error: "Playlist not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // GET items
      if (method === "GET") {
        const { data, error } = await supabaseAdmin
          .from("pulsarvs_playlist_items")
          .select(`
            *,
            media:media_assets(file_url, thumbnail_url, media_type),
            channel:channels(name, type)
          `)
          .eq("playlist_id", playlistId)
          .is("parent_item_id", null)
          .order("sort_order", { ascending: true });

        if (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Transform items to flatten joined data and extract metadata URLs
        const transformedItems = (data || []).map((item: any) => ({
          ...item,
          // Use joined media data or fall back to metadata URLs
          media_url: item.media?.file_url || item.metadata?.media_url || null,
          media_thumbnail: item.media?.thumbnail_url || item.metadata?.media_thumbnail || null,
          media_type: item.media?.media_type || item.metadata?.media_type || null,
          channel_name: item.channel?.name || null,
          channel_type: item.channel?.type || null,
          // Extract schedule_config from metadata for frontend
          schedule_config: item.metadata?.schedule_config || null,
          // Remove the nested objects from response
          media: undefined,
          channel: undefined,
        }));

        return new Response(JSON.stringify({ success: true, data: transformedItems }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // POST - Add item
      if (method === "POST") {
        const body = await req.json();
        const { item_type, name, content_id, media_id, channel_id, duration, scheduled_time, metadata, parent_item_id } = body;

        // Get max sort_order
        const { data: maxOrder } = await supabaseAdmin
          .from("pulsarvs_playlist_items")
          .select("sort_order")
          .eq("playlist_id", playlistId)
          .is("parent_item_id", parent_item_id || null)
          .order("sort_order", { ascending: false })
          .limit(1)
          .single();

        const sortOrder = (maxOrder?.sort_order || 0) + 1;

        const { data, error } = await supabaseAdmin
          .from("pulsarvs_playlist_items")
          .insert({
            playlist_id: playlistId,
            item_type: item_type || "page",
            name: name || "Untitled",
            content_id: content_id || null,
            media_id: media_id || null,
            channel_id: channel_id || null,
            duration: duration || 10,
            scheduled_time: scheduled_time || null,
            metadata: metadata || {},
            parent_item_id: parent_item_id || null,
            sort_order: sortOrder
          })
          .select()
          .single();

        if (error) {
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

      // PUT - Update item
      if (method === "PUT" && itemId) {
        const body = await req.json();
        const updateData: Record<string, any> = {};

        if (body.name !== undefined) updateData.name = body.name;
        if (body.content_id !== undefined) updateData.content_id = body.content_id;
        if (body.media_id !== undefined) updateData.media_id = body.media_id;
        if (body.channel_id !== undefined) updateData.channel_id = body.channel_id;
        if (body.duration !== undefined) updateData.duration = body.duration;
        if (body.scheduled_time !== undefined) updateData.scheduled_time = body.scheduled_time;
        if (body.metadata !== undefined) updateData.metadata = body.metadata;

        const { data, error } = await supabaseAdmin
          .from("pulsarvs_playlist_items")
          .update(updateData)
          .eq("id", itemId)
          .eq("playlist_id", playlistId)
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // DELETE - Delete item(s)
      if (method === "DELETE") {
        const idsParam = url.searchParams.get("ids");
        if (idsParam) {
          const ids = idsParam.split(",");
          let deleted = 0;

          for (const id of ids) {
            const { error } = await supabaseAdmin
              .from("pulsarvs_playlist_items")
              .delete()
              .eq("id", id.trim())
              .eq("playlist_id", playlistId);

            if (!error) deleted++;
          }

          return new Response(JSON.stringify({ success: true, deleted }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (itemId) {
          const { error } = await supabaseAdmin
            .from("pulsarvs_playlist_items")
            .delete()
            .eq("id", itemId)
            .eq("playlist_id", playlistId);

          if (error) {
            return new Response(JSON.stringify({ success: false, error: error.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: false, error: "Item ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // PATCH - Batch operations on items (reorder, group, set channel, set duration)
      if (method === "PATCH") {
        const body = await req.json();
        const { operation } = body;

        if (operation === "reorder") {
          const { item_ids } = body;
          if (!Array.isArray(item_ids)) {
            return new Response(JSON.stringify({ success: false, error: "item_ids array required" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          for (let i = 0; i < item_ids.length; i++) {
            await supabaseAdmin
              .from("pulsarvs_playlist_items")
              .update({ sort_order: i + 1 })
              .eq("id", item_ids[i])
              .eq("playlist_id", playlistId);
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (operation === "group") {
          const { item_ids, group_name } = body;
          if (!Array.isArray(item_ids) || !group_name) {
            return new Response(JSON.stringify({ success: false, error: "item_ids and group_name required" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Create group item
          const { data: maxOrder } = await supabaseAdmin
            .from("pulsarvs_playlist_items")
            .select("sort_order")
            .eq("playlist_id", playlistId)
            .is("parent_item_id", null)
            .order("sort_order", { ascending: false })
            .limit(1)
            .single();

          const { data: groupItem, error: groupError } = await supabaseAdmin
            .from("pulsarvs_playlist_items")
            .insert({
              playlist_id: playlistId,
              item_type: "group",
              name: group_name,
              sort_order: (maxOrder?.sort_order || 0) + 1
            })
            .select()
            .single();

          if (groupError) {
            return new Response(JSON.stringify({ success: false, error: groupError.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Move items into group
          for (let i = 0; i < item_ids.length; i++) {
            await supabaseAdmin
              .from("pulsarvs_playlist_items")
              .update({ parent_item_id: groupItem.id, sort_order: i + 1 })
              .eq("id", item_ids[i])
              .eq("playlist_id", playlistId);
          }

          return new Response(JSON.stringify({ success: true, data: groupItem }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (operation === "ungroup") {
          const { group_id } = body;
          if (!group_id) {
            return new Response(JSON.stringify({ success: false, error: "group_id required" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Move child items out of group
          await supabaseAdmin
            .from("pulsarvs_playlist_items")
            .update({ parent_item_id: null })
            .eq("parent_item_id", group_id)
            .eq("playlist_id", playlistId);

          // Delete the group
          await supabaseAdmin
            .from("pulsarvs_playlist_items")
            .delete()
            .eq("id", group_id)
            .eq("playlist_id", playlistId);

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (operation === "set_channel") {
          const { item_ids, channel_id } = body;
          if (!Array.isArray(item_ids)) {
            return new Response(JSON.stringify({ success: false, error: "item_ids required" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          for (const id of item_ids) {
            await supabaseAdmin
              .from("pulsarvs_playlist_items")
              .update({ channel_id })
              .eq("id", id)
              .eq("playlist_id", playlistId);
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (operation === "set_duration") {
          const { item_ids, duration } = body;
          if (!Array.isArray(item_ids) || duration === undefined) {
            return new Response(JSON.stringify({ success: false, error: "item_ids and duration required" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          for (const id of item_ids) {
            await supabaseAdmin
              .from("pulsarvs_playlist_items")
              .update({ duration })
              .eq("id", id)
              .eq("playlist_id", playlistId);
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (operation === "delete") {
          const { item_ids } = body;
          if (!Array.isArray(item_ids)) {
            return new Response(JSON.stringify({ success: false, error: "item_ids required" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          let deleted = 0;
          for (const id of item_ids) {
            const { error } = await supabaseAdmin
              .from("pulsarvs_playlist_items")
              .delete()
              .eq("id", id)
              .eq("playlist_id", playlistId);

            if (!error) deleted++;
          }

          return new Response(JSON.stringify({ success: true, deleted }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: false, error: `Unknown operation: ${operation}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ============================================================
    // NESTED ITEMS SUB-RESOURCE
    // ============================================================
    if (subResource === "nested" && itemId) {
      // Get nested items for a group
      if (method === "GET") {
        const { data, error } = await supabaseAdmin
          .from("pulsarvs_playlist_items")
          .select(`
            *,
            media:media_assets(file_url, thumbnail_url, media_type),
            channel:channels(name, type)
          `)
          .eq("parent_item_id", itemId)
          .order("sort_order", { ascending: true });

        if (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Transform items to flatten joined data and extract metadata URLs
        const transformedItems = (data || []).map((item: any) => ({
          ...item,
          media_url: item.media?.file_url || item.metadata?.media_url || null,
          media_thumbnail: item.media?.thumbnail_url || item.metadata?.media_thumbnail || null,
          media_type: item.media?.media_type || item.metadata?.media_type || null,
          channel_name: item.channel?.name || null,
          channel_type: item.channel?.type || null,
          schedule_config: item.metadata?.schedule_config || null,
          media: undefined,
          channel: undefined,
        }));

        return new Response(JSON.stringify({ success: true, data: transformedItems }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ============================================================
    // GET — List playlists or get single playlist
    // ============================================================
    if (method === "GET") {
      const projectId = url.searchParams.get("project_id");

      if (playlistId) {
        // Get single playlist with items
        const { data: playlist, error: playlistError } = await supabaseAdmin
          .from("pulsarvs_playlists")
          .select("*")
          .eq("id", playlistId)
          .eq("organization_id", userOrgId)
          .single();

        if (playlistError) {
          return new Response(JSON.stringify({ success: false, error: "Playlist not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Get items with joined data
        const { data: items } = await supabaseAdmin
          .from("pulsarvs_playlist_items")
          .select(`
            *,
            media:media_assets(file_url, thumbnail_url, media_type),
            channel:channels(name, type)
          `)
          .eq("playlist_id", playlistId)
          .is("parent_item_id", null)
          .order("sort_order", { ascending: true });

        // Transform items to flatten joined data and extract metadata URLs
        const transformedItems = (items || []).map((item: any) => ({
          ...item,
          // Use joined media data or fall back to metadata URLs
          media_url: item.media?.file_url || item.metadata?.media_url || null,
          media_thumbnail: item.media?.thumbnail_url || item.metadata?.media_thumbnail || null,
          media_type: item.media?.media_type || item.metadata?.media_type || null,
          channel_name: item.channel?.name || null,
          channel_type: item.channel?.type || null,
          // Extract schedule_config from metadata for frontend
          schedule_config: item.metadata?.schedule_config || null,
          // Remove the nested objects from response
          media: undefined,
          channel: undefined,
        }));

        return new Response(JSON.stringify({
          success: true,
          data: { ...playlist, items: transformedItems }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // List playlists
      let query = supabaseAdmin
        .from("pulsarvs_playlists")
        .select("*, item_count:pulsarvs_playlist_items(count)")
        .eq("organization_id", userOrgId)
        .order("name", { ascending: true });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Format data with item count
      const formattedData = (data || []).map(p => ({
        ...p,
        item_count: p.item_count?.[0]?.count || 0
      }));

      return new Response(JSON.stringify({ success: true, data: formattedData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ============================================================
    // POST — Create playlist
    // ============================================================
    if (method === "POST") {
      const body = await req.json();
      const { name, description, project_id, loop_enabled } = body;

      if (!name) {
        return new Response(JSON.stringify({ success: false, error: "Name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data, error } = await supabaseAdmin
        .from("pulsarvs_playlists")
        .insert({
          name,
          description: description || null,
          project_id: project_id || null,
          loop_enabled: loop_enabled || false,
          organization_id: userOrgId
        })
        .select()
        .single();

      if (error) {
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
    // PUT — Update playlist
    // ============================================================
    if (method === "PUT") {
      const body = await req.json();

      // Get playlist ID from query params or body
      const targetPlaylistId = playlistId || body.id;
      if (!targetPlaylistId) {
        return new Response(JSON.stringify({ success: false, error: "Playlist ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.loop_enabled !== undefined) updateData.loop_enabled = body.loop_enabled;
      if (body.is_active !== undefined) updateData.is_active = body.is_active;

      const { data, error } = await supabaseAdmin
        .from("pulsarvs_playlists")
        .update(updateData)
        .eq("id", targetPlaylistId)
        .eq("organization_id", userOrgId)
        .select()
        .single();

      if (error) {
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
    // DELETE — Delete playlist(s)
    // ============================================================
    if (method === "DELETE") {
      const idsParam = url.searchParams.get("ids");
      if (idsParam) {
        const ids = idsParam.split(",");
        let deleted = 0;

        for (const id of ids) {
          // Delete items first
          await supabaseAdmin
            .from("pulsarvs_playlist_items")
            .delete()
            .eq("playlist_id", id.trim());

          const { error } = await supabaseAdmin
            .from("pulsarvs_playlists")
            .delete()
            .eq("id", id.trim())
            .eq("organization_id", userOrgId);

          if (!error) deleted++;
        }

        return new Response(JSON.stringify({ success: true, deleted }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (!playlistId) {
        return new Response(JSON.stringify({ success: false, error: "Playlist ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Delete items first
      await supabaseAdmin
        .from("pulsarvs_playlist_items")
        .delete()
        .eq("playlist_id", playlistId);

      const { error } = await supabaseAdmin
        .from("pulsarvs_playlists")
        .delete()
        .eq("id", playlistId)
        .eq("organization_id", userOrgId);

      if (error) {
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
    // PATCH — Batch operations on playlists
    // ============================================================
    if (method === "PATCH") {
      const body = await req.json();
      const { operation, ids } = body;

      if (!operation || !Array.isArray(ids)) {
        return new Response(JSON.stringify({ success: false, error: "operation and ids required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (operation === "delete") {
        let deleted = 0;
        for (const id of ids) {
          await supabaseAdmin
            .from("pulsarvs_playlist_items")
            .delete()
            .eq("playlist_id", id);

          const { error } = await supabaseAdmin
            .from("pulsarvs_playlists")
            .delete()
            .eq("id", id)
            .eq("organization_id", userOrgId);

          if (!error) deleted++;
        }

        return new Response(JSON.stringify({ success: true, deleted }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: false, error: `Unknown operation: ${operation}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[pulsarvs-playlists] Error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
