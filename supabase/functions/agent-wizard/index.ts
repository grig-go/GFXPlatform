/**
 * Agent Wizard Edge Function
 *
 * Handles all database operations for the Agent Wizard, bypassing
 * client-side Supabase JS to avoid auth lock issues.
 *
 * Endpoints:
 *   POST /agent-wizard/check-slug     - Check if slug exists
 *   POST /agent-wizard/data-sources   - List data sources by category
 *   POST /agent-wizard/save-source    - Save a data source
 *   POST /agent-wizard/save-agent     - Save an agent (endpoint + sources)
 *   POST /agent-wizard/delete-agent   - Delete an agent
 *   POST /agent-wizard/delete-source  - Delete a data source
 *   POST /agent-wizard/get-source     - Get a data source by ID
 *   POST /agent-wizard/get-user       - Get current user info
 *   POST /agent-wizard/list-leagues   - List sports leagues
 *   POST /agent-wizard/list-seasons   - List current seasons
 *   POST /agent-wizard/list-agents    - List all agents with data sources
 *   POST /agent-wizard/get-agent      - Get a single agent by ID
 *   POST /agent-wizard/duplicate-agent - Duplicate an agent
 *   POST /agent-wizard/toggle-agent-status - Toggle agent active status
 *   POST /agent-wizard/cleanup-nova-sources - Clean up unused Nova data sources
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "./lib/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // Expected path: /agent-wizard/<action>
    if (pathParts.length < 2 || pathParts[0] !== "agent-wizard") {
      return jsonResponse({ error: "Invalid endpoint path" }, 404);
    }

    const action = pathParts[1];
    const body = req.method === "POST" ? await req.json() : {};

    // Get user from auth header if provided
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      } catch (e) {
        console.warn("Failed to get user from token:", e);
      }
    }

    console.log(`[agent-wizard] Action: ${action}, User: ${userId || 'anonymous'}`);

    switch (action) {
      case "check-slug":
        return await checkSlug(supabase, body);

      case "data-sources":
        return await listDataSources(supabase, body);

      case "save-source":
        return await saveDataSource(supabase, body, userId);

      case "save-agent":
        return await saveAgent(supabase, body, userId);

      case "delete-agent":
        return await deleteAgent(supabase, body);

      case "delete-source":
        return await deleteDataSource(supabase, body);

      case "get-source":
        return await getDataSource(supabase, body);

      case "get-user":
        return jsonResponse({ userId, authenticated: !!userId });

      case "list-leagues":
        return await listLeagues(supabase);

      case "list-seasons":
        return await listSeasons(supabase, body);

      case "list-current-seasons":
        return await listCurrentSeasons(supabase);

      case "list-agents":
        return await listAgents(supabase);

      case "get-agent":
        return await getAgent(supabase, body);

      case "duplicate-agent":
        return await duplicateAgent(supabase, body, userId);

      case "toggle-agent-status":
        return await toggleAgentStatus(supabase, body);

      case "cleanup-nova-sources":
        return await cleanupNovaSources(supabase);

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 404);
    }

  } catch (error) {
    console.error("[agent-wizard] Error:", error);
    return jsonResponse({
      error: "Internal server error",
      details: error.message
    }, 500);
  }
});

// Helper to create JSON responses
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// Check if a slug already exists
async function checkSlug(supabase: any, body: { slug: string; excludeId?: string }) {
  const { slug, excludeId } = body;

  if (!slug) {
    return jsonResponse({ error: "slug is required" }, 400);
  }

  let query = supabase
    .from("api_endpoints")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[check-slug] Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({
    exists: data && data.length > 0,
    slug
  });
}

// List data sources by category
async function listDataSources(supabase: any, body: { categories?: string[] }) {
  const { categories } = body;

  let query = supabase
    .from("data_sources")
    .select("id, name, type, category")
    .order("name");

  if (categories && categories.length > 0) {
    query = query.in("category", categories);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[data-sources] Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({
    data: data || [],
    count: data?.length || 0
  });
}

// Save a data source (insert or update)
async function saveDataSource(supabase: any, body: any, userId: string | null) {
  const { id, isExisting, ...sourceData } = body;

  // Add user_id if provided
  if (userId) {
    sourceData.user_id = userId;
  }

  let result;

  if (isExisting && id) {
    // Update existing
    result = await supabase
      .from("data_sources")
      .update(sourceData)
      .eq("id", id)
      .select()
      .single();
  } else {
    // Insert new
    result = await supabase
      .from("data_sources")
      .insert(sourceData)
      .select()
      .single();
  }

  if (result.error) {
    console.error("[save-source] Error:", result.error);
    return jsonResponse({ error: result.error.message }, 500);
  }

  return jsonResponse({
    data: result.data,
    isNew: !isExisting
  });
}

// Save an agent (endpoint + junction records)
async function saveAgent(supabase: any, body: any, userId: string | null) {
  const {
    id,
    isEdit,
    name,
    slug,
    description,
    format,
    formatOptions,
    environment,
    autoStart,
    generateDocs,
    transforms,
    relationships,
    cache,
    auth,
    requiresAuth,
    authConfig,
    status,
    dataSourceIds
  } = body;

  // Build schema_config
  const schema_config = {
    environment: environment || "production",
    autoStart: autoStart !== undefined ? autoStart : true,
    generateDocs: generateDocs !== undefined ? generateDocs : true,
    schema: {
      metadata: formatOptions || {}
    },
    mapping: []
  };

  // Build endpoint data
  const endpointData: any = {
    name,
    slug,
    description: description || null,
    output_format: format?.toLowerCase(),
    schema_config,
    transform_config: {
      transformations: transforms || [],
      pipeline: []
    },
    relationship_config: { relationships: relationships || [] },
    cache_config: {
      enabled: cache !== "OFF",
      ttl: parseCacheDuration(cache || "15M")
    },
    auth_config: {
      required: requiresAuth ?? false,
      type: auth || "none",
      config: authConfig || {}
    },
    rate_limit_config: {
      enabled: false,
      requests_per_minute: 60
    },
    active: status === "ACTIVE"
  };

  if (userId) {
    endpointData.user_id = userId;
  }

  let endpoint;

  if (isEdit && id) {
    // Update existing endpoint
    const { data, error } = await supabase
      .from("api_endpoints")
      .update(endpointData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[save-agent] Update error:", error);
      return jsonResponse({ error: error.message }, 500);
    }
    endpoint = data;

    // Delete existing junction records
    await supabase
      .from("api_endpoint_sources")
      .delete()
      .eq("endpoint_id", id);
  } else {
    // Insert new endpoint
    const { data, error } = await supabase
      .from("api_endpoints")
      .insert(endpointData)
      .select()
      .single();

    if (error) {
      console.error("[save-agent] Insert error:", error);
      return jsonResponse({ error: error.message }, 500);
    }
    endpoint = data;
  }

  // Create junction records for data sources
  if (dataSourceIds && dataSourceIds.length > 0 && endpoint) {
    const junctionRecords = dataSourceIds.map((sourceId: string, index: number) => ({
      endpoint_id: endpoint.id,
      data_source_id: sourceId,
      is_primary: index === 0,
      join_config: {},
      filter_config: {},
      sort_order: index
    }));

    const { error: junctionError } = await supabase
      .from("api_endpoint_sources")
      .insert(junctionRecords);

    if (junctionError) {
      console.error("[save-agent] Junction error:", junctionError);
      // Don't fail the whole operation, just log it
    }
  }

  return jsonResponse({
    data: endpoint,
    isEdit: !!isEdit
  });
}

// Delete an agent
async function deleteAgent(supabase: any, body: { id: string }) {
  const { id } = body;

  if (!id) {
    return jsonResponse({ error: "id is required" }, 400);
  }

  // Delete junction records first
  await supabase
    .from("api_endpoint_sources")
    .delete()
    .eq("endpoint_id", id);

  // Delete the endpoint
  const { error } = await supabase
    .from("api_endpoints")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[delete-agent] Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ success: true, id });
}

// Delete a data source
async function deleteDataSource(supabase: any, body: { id: string }) {
  const { id } = body;

  if (!id) {
    return jsonResponse({ error: "id is required" }, 400);
  }

  const { error } = await supabase
    .from("data_sources")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[delete-source] Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ success: true, id });
}

// Get a data source by ID
async function getDataSource(supabase: any, body: { id: string }) {
  const { id } = body;

  if (!id) {
    return jsonResponse({ error: "id is required" }, 400);
  }

  const { data, error } = await supabase
    .from("data_sources")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[get-source] Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ data });
}

// List sports leagues
async function listLeagues(supabase: any) {
  const { data, error } = await supabase
    .from("sports_leagues")
    .select("id, name, alternative_name")
    .order("name");

  if (error) {
    console.error("[list-leagues] Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ data: data || [] });
}

// List seasons for a league
async function listSeasons(supabase: any, body: { leagueId: string }) {
  const { leagueId } = body;

  if (!leagueId) {
    return jsonResponse({ error: "leagueId is required" }, 400);
  }

  const { data, error } = await supabase
    .from("sports_seasons")
    .select("id, name, year, league_id")
    .eq("league_id", leagueId)
    .order("year", { ascending: false });

  if (error) {
    console.error("[list-seasons] Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ data: data || [] });
}

// List all current seasons (across all leagues)
async function listCurrentSeasons(supabase: any) {
  const { data, error } = await supabase
    .from("sports_seasons")
    .select("id, name, year, league_id")
    .eq("is_current", true)
    .order("name");

  if (error) {
    console.error("[list-current-seasons] Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ data: data || [] });
}

// List all agents with their data sources
async function listAgents(supabase: any) {
  const { data, error } = await supabase
    .from("api_endpoints")
    .select(`
      *,
      api_endpoint_sources (
        data_source_id,
        is_primary,
        sort_order,
        data_source:data_sources (*)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[list-agents] Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ data: data || [] });
}

// Get a single agent by ID with full data
async function getAgent(supabase: any, body: { id: string }) {
  const { id } = body;

  if (!id) {
    return jsonResponse({ error: "id is required" }, 400);
  }

  const { data, error } = await supabase
    .from("api_endpoints")
    .select(`
      *,
      api_endpoint_sources (
        *,
        data_source:data_sources (*)
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("[get-agent] Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ data });
}

// Duplicate an agent
async function duplicateAgent(supabase: any, body: { id: string }, userId: string | null) {
  const { id } = body;

  if (!id) {
    return jsonResponse({ error: "id is required" }, 400);
  }

  // Fetch the original agent with all relationships
  const { data: original, error: fetchError } = await supabase
    .from("api_endpoints")
    .select(`
      *,
      api_endpoint_sources (
        *,
        data_source:data_sources (*)
      )
    `)
    .eq("id", id)
    .single();

  if (fetchError) {
    console.error("[duplicate-agent] Fetch error:", fetchError);
    return jsonResponse({ error: fetchError.message }, 500);
  }

  // Create duplicated endpoint
  const duplicatedEndpoint = {
    name: `${original.name} (Copy)`,
    slug: `${original.slug}-copy-${Date.now()}`,
    description: original.description,
    output_format: original.output_format,
    schema_config: original.schema_config,
    transform_config: original.transform_config,
    relationship_config: original.relationship_config,
    cache_config: original.cache_config,
    auth_config: original.auth_config,
    rate_limit_config: original.rate_limit_config,
    active: false, // Start inactive
    user_id: userId
  };

  const { data: newEndpoint, error: insertError } = await supabase
    .from("api_endpoints")
    .insert(duplicatedEndpoint)
    .select()
    .single();

  if (insertError) {
    console.error("[duplicate-agent] Insert error:", insertError);
    return jsonResponse({ error: insertError.message }, 500);
  }

  // Duplicate the api_endpoint_sources relationships
  if (original.api_endpoint_sources && original.api_endpoint_sources.length > 0) {
    const sourceRelations = original.api_endpoint_sources.map((source: any) => ({
      endpoint_id: newEndpoint.id,
      data_source_id: source.data_source_id,
      is_primary: source.is_primary,
      join_config: source.join_config || {},
      filter_config: source.filter_config || {},
      sort_order: source.sort_order
    }));

    const { error: relationsError } = await supabase
      .from("api_endpoint_sources")
      .insert(sourceRelations);

    if (relationsError) {
      console.error("[duplicate-agent] Relations error:", relationsError);
      return jsonResponse({ error: relationsError.message }, 500);
    }
  }

  return jsonResponse({ data: newEndpoint });
}

// Toggle agent active status
async function toggleAgentStatus(supabase: any, body: { id: string; active: boolean }) {
  const { id, active } = body;

  if (!id) {
    return jsonResponse({ error: "id is required" }, 400);
  }

  const { data, error } = await supabase
    .from("api_endpoints")
    .update({ active })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[toggle-agent-status] Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ data });
}

// Cleanup unused Nova data sources
async function cleanupNovaSources(supabase: any) {
  // Get all Nova Weather, Nova Election, Nova Finance, and Nova Sports data sources
  const { data: novaSources, error: sourcesError } = await supabase
    .from("data_sources")
    .select("id, name, category")
    .in("category", ["Nova Weather", "Nova Election", "Nova Finance", "Nova Sports"]);

  if (sourcesError) {
    console.error("[cleanup-nova-sources] Fetch error:", sourcesError);
    return jsonResponse({ error: sourcesError.message }, 500);
  }

  if (!novaSources || novaSources.length === 0) {
    return jsonResponse({ cleaned: 0, message: "No Nova sources found" });
  }

  // Get all data source IDs that are referenced by api_endpoint_sources
  const { data: usedSources, error: usedError } = await supabase
    .from("api_endpoint_sources")
    .select("data_source_id")
    .in("data_source_id", novaSources.map((s: any) => s.id));

  if (usedError) {
    console.error("[cleanup-nova-sources] Used sources error:", usedError);
    return jsonResponse({ error: usedError.message }, 500);
  }

  const usedIds = new Set((usedSources || []).map((s: any) => s.data_source_id));
  const unusedSources = novaSources.filter((s: any) => !usedIds.has(s.id));

  if (unusedSources.length === 0) {
    return jsonResponse({ cleaned: 0, message: "No unused Nova sources found" });
  }

  // Delete unused Nova sources
  const { error: deleteError } = await supabase
    .from("data_sources")
    .delete()
    .in("id", unusedSources.map((s: any) => s.id));

  if (deleteError) {
    console.error("[cleanup-nova-sources] Delete error:", deleteError);
    return jsonResponse({ error: deleteError.message }, 500);
  }

  return jsonResponse({ cleaned: unusedSources.length, message: `Cleaned up ${unusedSources.length} unused Nova data source(s)` });
}

// Parse cache duration string to seconds
function parseCacheDuration(duration: string): number {
  const match = duration.match(/^(\d+)([SMH])$/i);
  if (!match) return 900; // Default 15 minutes

  const value = parseInt(match[1], 10);
  const unit = match[2].toUpperCase();

  switch (unit) {
    case "S": return value;
    case "M": return value * 60;
    case "H": return value * 3600;
    default: return 900;
  }
}
