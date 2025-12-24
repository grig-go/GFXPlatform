import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';

const BUILD_ID = new Date().toISOString();
console.log('[sports_dashboard] boot', BUILD_ID);
const app = new Hono().basePath('/sports_dashboard');
// Disable noisy logger that breaks JSON responses
// app.use('*', logger(console.log));
// CORS configuration
app.use('/*', cors({
  origin: '*',
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'x-client-info',
    'apikey',
    'X-Effective-Org-Id' // For superuser impersonation
  ],
  allowMethods: [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'OPTIONS'
  ],
  exposeHeaders: [
    'Content-Length'
  ],
  maxAge: 600
}));
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
async function safeJson(c) {
  try {
    return await c.req.json();
  } catch  {
    return {};
  }
}
function jsonErr(c, status, code, detail) {
  console.error(`[${code}]`, detail ?? '');
  return c.json({
    ok: false,
    error: code,
    detail: String(detail ?? '')
  }, status);
}
// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (c)=>{
  return c.json({
    status: 'ok',
    build: BUILD_ID,
    service: 'sports_dashboard'
  });
});
// ============================================================================
// SPORTS PROVIDER ROUTES (KV Store)
// ============================================================================
// COMMENTED OUT - not using kv store right now
// app.get('/sports-providers', async (c) => {
//   try {
//     const providers = await kv.getByPrefix('sports_provider:');
//     const providersList = Array.isArray(providers) ? providers : [];
//     const maskedProviders = providersList.map((provider: any) => ({
//       ...provider,
//       apiKey: provider.apiKey ? '***' + provider.apiKey.slice(-4) : undefined,
//       apiSecret: provider.apiSecret ? '***' + provider.apiSecret.slice(-4) : undefined,
//     }));
//     return c.json(maskedProviders);
//   } catch (error) {
//     return jsonErr(c, 500, 'SPORTS_PROVIDERS_FETCH_FAILED', error);
//   }
// });
// COMMENTED OUT - not using kv store right now
// app.post('/sports-providers', async (c) => {
//   try {
//     const body = await safeJson(c);
//     if (!body.id) return jsonErr(c, 400, 'MISSING_ID', 'Provider ID is required');
//     await kv.set(`sports_provider:${body.id}`, body);
//     return c.json({ ok: true, success: true, id: body.id });
//   } catch (error) {
//     return jsonErr(c, 500, 'SPORTS_PROVIDER_SAVE_FAILED', error);
//   }
// });
// COMMENTED OUT - not using kv store right now
// app.delete('/sports-providers/:id', async (c) => {
//   try {
//     const id = c.req.param('id');
//     await kv.del(`sports_provider:${id}`);
//     return c.json({ success: true });
//   } catch (error) {
//     console.error('Error deleting sports provider:', error);
//     return c.json({ error: 'Failed to delete sports provider', details: String(error) }, 500);
//   }
// });
// Test connection for a provider - COMMENTED OUT - not using kv store right now
// app.post('/sports-providers/:id/test', async (c) => {
//   try {
//     const id = c.req.param('id');
//     const provider = await kv.get(`sports_provider:${id}`);
//     
//     if (!provider) {
//       return c.json({ success: false, error: 'Provider not found' }, 404);
//     }
//     
//     // For now, just return a success response
//     // In a real implementation, you'd test the actual API connection
//     return c.json({
//       success: true,
//       testData: {
//         provider: provider.name,
//         competitionsAvailable: 0,
//       },
//     });
//   } catch (error) {
//     console.error('Error testing provider:', error);
//     return c.json({ success: false, error: 'Connection test failed', details: String(error) }, 500);
//   }
// });
// Data sync endpoint
app.post('/sports-data/sync', async (c)=>{
  try {
    const body = await safeJson(c);
    // For now, return a placeholder response
    return c.json({
      success: true,
      results: {
        teams: 0,
        games: 0,
        tournaments: 0
      }
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    return c.json({
      error: 'Failed to sync data',
      details: String(error)
    }, 500);
  }
});
// ============================================================================
// SPORTS DATA ROUTES (Database)
// ============================================================================
// Service role client - bypasses RLS (use only for admin operations)
const getSupabase = ()=>createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
// User-scoped client - respects RLS based on user's JWT
const getUserClient = (authHeader)=>{
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  // If we have a Bearer token, use it to create a user-scoped client
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }
  // Fallback to anon client (will still respect RLS, but as anonymous)
  return createClient(supabaseUrl, supabaseAnonKey);
};
// Get effective organization ID for impersonation support
// Returns: { orgId: string | null, isSuperuser: boolean }
async function getEffectiveOrgId(authHeader, effectiveOrgHeader) {
  const userClient = getUserClient(authHeader);
  // First get the authenticated user's ID from the JWT
  const { data: { user: authUser }, error: authError } = await userClient.auth.getUser();
  if (authError || !authUser) {
    console.log('[getEffectiveOrgId] Could not get auth user, returning null org');
    return {
      orgId: null,
      isSuperuser: false
    };
  }
  console.log(`[getEffectiveOrgId] Auth user: ${authUser.email}`);
  // Check if user is superuser - filter by auth_user_id to get only this user's row
  const { data: userData, error } = await userClient.from('u_users').select('is_superuser, organization_id').eq('auth_user_id', authUser.id).single();
  if (error || !userData) {
    console.log('[getEffectiveOrgId] Could not get user data, returning null org', error);
    return {
      orgId: null,
      isSuperuser: false
    };
  }
  const isSuperuser = userData.is_superuser === true;
  // If superuser and effective org header is provided, use it for impersonation
  if (isSuperuser && effectiveOrgHeader) {
    console.log(`[getEffectiveOrgId] 🎭 Superuser impersonating org: ${effectiveOrgHeader}`);
    return {
      orgId: effectiveOrgHeader,
      isSuperuser: true
    };
  }
  // If superuser without impersonation header, show all data (null org)
  if (isSuperuser) {
    console.log('[getEffectiveOrgId] 👑 Superuser viewing all orgs');
    return {
      orgId: null,
      isSuperuser: true
    };
  }
  // Regular user - use their actual organization
  console.log(`[getEffectiveOrgId] 👤 Regular user, org: ${userData.organization_id}`);
  return {
    orgId: userData.organization_id,
    isSuperuser: false
  };
}
// Get all teams
app.get('/sports-data/teams', async (c)=>{
  try {
    // Get effective organization for impersonation support
    const authHeader = c.req.header('Authorization');
    const effectiveOrgHeader = c.req.header('X-Effective-Org-Id');
    const { orgId, isSuperuser } = await getEffectiveOrgId(authHeader, effectiveOrgHeader);
    console.log(`[/sports-data/teams] 🔐 Effective org: ${orgId || 'ALL'}, isSuperuser: ${isSuperuser}`);
    // Use service client with manual org filter for impersonation support
    const supabase = getSupabase();
    let query = supabase.from('sports_teams').select('*');
    // Apply org filter if we have an effective org ID
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }
    const { data: teams, error } = await query.order('name');
    if (error) throw error;
    console.log(`[/sports-data/teams] ✅ Returning ${teams?.length || 0} teams`);
    return c.json({
      teams: teams || []
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return c.json({
      error: 'Failed to fetch teams',
      details: String(error)
    }, 500);
  }
});
// Get all games
app.get('/sports-data/games', async (c)=>{
  try {
    // Get effective organization for impersonation support
    const authHeader = c.req.header('Authorization');
    const effectiveOrgHeader = c.req.header('X-Effective-Org-Id');
    const { orgId, isSuperuser } = await getEffectiveOrgId(authHeader, effectiveOrgHeader);
    console.log(`[/sports-data/games] 🔐 Effective org: ${orgId || 'ALL'}, isSuperuser: ${isSuperuser}`);
    // Use service client with manual org filter for impersonation support
    const supabase = getSupabase();
    let query = supabase.from('sports_events').select(`
      id,
      sportradar_id,
      start_time,
      start_time_confirmed,
      venue_name,
      venue_city,
      venue_capacity,
      round,
      round_number,
      match_day,
      status,
      home_score,
      away_score,
      attendance,
      referee,
      organization_id,
      home_team:sports_teams!sports_events_home_team_id_fkey (
        id,
        name,
        short_name,
        abbreviation,
        logo_url,
        colors
      ),
      away_team:sports_teams!sports_events_away_team_id_fkey (
        id,
        name,
        short_name,
        abbreviation,
        logo_url,
        colors
      ),
      sports_seasons (
        id,
        name,
        sports_leagues (
          id,
          name,
          logo_url
        )
      )
    `);
    // Apply org filter if we have an effective org ID
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }
    const { data: games, error } = await query.order('start_time', {
      ascending: false
    });
    if (error) throw error;
    // Transform games to include league and season info
    const transformedGames = (games || []).map((game)=>({
        ...game,
        league: game.sports_seasons?.sports_leagues ? {
          id: game.sports_seasons.sports_leagues.id,
          name: game.sports_seasons.sports_leagues.name,
          logo_url: game.sports_seasons.sports_leagues.logo_url
        } : undefined,
        season: game.sports_seasons ? {
          id: game.sports_seasons.id,
          name: game.sports_seasons.name
        } : undefined
      }));
    console.log(`[/sports-data/games] ✅ Returning ${transformedGames?.length || 0} games`);
    return c.json({
      games: transformedGames
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    return c.json({
      error: 'Failed to fetch games',
      details: String(error)
    }, 500);
  }
});
// Get all venues
app.get('/sports-data/venues', async (c)=>{
  try {
    // Get effective organization for impersonation support
    const authHeader = c.req.header('Authorization');
    const effectiveOrgHeader = c.req.header('X-Effective-Org-Id');
    const { orgId, isSuperuser } = await getEffectiveOrgId(authHeader, effectiveOrgHeader);
    console.log(`[/sports-data/venues] 🔐 Effective org: ${orgId || 'ALL'}, isSuperuser: ${isSuperuser}`);
    // Use service client with manual org filter for impersonation support
    // Call get_venues RPC which extracts unique venues from sports_events
    const supabase = getSupabase();
    const { data: venues, error } = await supabase.rpc('get_venues', {
      p_country: null,
      p_limit: 100
    });
    if (error) throw error;
    // Note: get_venues RPC doesn't filter by org, so we filter here if needed
    // This is a workaround until get_venues supports org filtering
    let filteredVenues = venues || [];
    // TODO: Add organization filtering to get_venues RPC for proper impersonation support
    console.log(`[/sports-data/venues] ✅ Returning ${filteredVenues?.length || 0} venues`);
    return c.json({
      venues: filteredVenues
    });
  } catch (error) {
    console.error('Error fetching venues:', error);
    return c.json({
      error: 'Failed to fetch venues',
      details: String(error)
    }, 500);
  }
});
// Get all tournaments
app.get('/sports-data/tournaments', async (c)=>{
  try {
    // Get effective organization for impersonation support
    const authHeader = c.req.header('Authorization');
    const effectiveOrgHeader = c.req.header('X-Effective-Org-Id');
    const { orgId, isSuperuser } = await getEffectiveOrgId(authHeader, effectiveOrgHeader);
    console.log(`[/sports-data/tournaments] 🔐 Effective org: ${orgId || 'ALL'}, isSuperuser: ${isSuperuser}`);
    // Use service client with manual org filter for impersonation support
    const supabase = getSupabase();
    let query = supabase.from('sports_leagues').select('*');
    // Apply org filter if we have an effective org ID
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }
    const { data: leagues, error } = await query.order('name');
    if (error) throw error;
    const tournaments = (leagues || []).map((league)=>({
        id: league.id,
        external_id: league.external_id,
        name: league.name,
        provider_id: league.provider_id,
        provider_name: league.provider_name,
        sport: league.sport,
        country: league.country,
        logo_url: league.logo_url,
        is_active: league.is_active
      }));
    console.log(`[/sports-data/tournaments] ✅ Returning ${tournaments?.length || 0} tournaments`);
    return c.json({
      tournaments
    });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return c.json({
      error: 'Failed to fetch tournaments',
      details: String(error)
    }, 500);
  }
});
// ============================================================================
// SPORTS AI INSIGHTS (KV Store)
// ============================================================================
// COMMENTED OUT - not using kv store right now
// app.get('/sports-ai-insights', async (c) => {
//   try {
//     const insights = await kv.getByPrefix('sports_ai_insight:');
//     return c.json({
//       ok: true,
//       insights: insights.map((i: any) => ({
//         ...i,
//         id: i.key?.replace('sports_ai_insight:', '') || i.id,
//       })),
//     });
//   } catch (error) {
//     console.error('Error loading sports AI insights:', error);
//     return jsonErr(c, 500, 'SPORTS_INSIGHTS_LOAD_FAILED', error);
//   }
// });
// COMMENTED OUT - not using kv store right now
// app.post('/sports-ai-insights', async (c) => {
//   try {
//     const body = await safeJson(c);
//     const { question, response, selectedLeagues, selectedTeams, provider, model } = body;
//     
//     if (!question || !response) {
//       return jsonErr(c, 400, 'INVALID_INSIGHT', 'question and response are required');
//     }
//     
//     const id = `insight_${Date.now()}`;
//     const insight = {
//       id,
//       question,
//       response,
//       selectedLeagues: selectedLeagues || [],
//       selectedTeams: selectedTeams || [],
//       provider,
//       model,
//       createdAt: new Date().toISOString(),
//     };
//     
//     await kv.set(`sports_ai_insight:${id}`, insight);
//     return c.json({ ok: true, success: true, insight });
//   } catch (error) {
//     console.error('Error saving sports AI insight:', error);
//     return jsonErr(c, 500, 'SPORTS_INSIGHT_SAVE_FAILED', error);
//   }
// });
// COMMENTED OUT - not using kv store right now
// app.delete('/sports-ai-insights/:id', async (c) => {
//   try {
//     const id = c.req.param('id');
//     await kv.del(`sports_ai_insight:${id}`);
//     return c.json({ ok: true, success: true });
//   } catch (error) {
//     console.error('Error deleting sports AI insight:', error);
//     return jsonErr(c, 500, 'SPORTS_INSIGHT_DELETE_FAILED', error);
//   }
// });
// ============================================================================
// SPORTS PROVIDER SPECIFIC ROUTES
// ============================================================================
app.get('/sports/providers/active', async (c)=>{
  try {
    const supabase = getSupabase();
    const { data: providers, error } = await supabase.from('data_providers').select('id, name, type').eq('category', 'sports').eq('is_active', true);
    if (error) throw error;
    const providerDetails = [];
    for (const prov of providers || []){
      const { data: details } = await supabase.rpc('get_data_provider_credentials', {
        provider_id: prov.id
      });
      if (details) {
        providerDetails.push({
          id: details.id,
          name: details.name,
          type: details.type,
          category: details.category,
          baseUrl: details.base_url,
          isActive: details.is_active,
          apiKeyConfigured: !!details.api_key
        });
      }
    }
    return c.json({
      providers: providerDetails
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return c.json({
      error: 'Failed to fetch providers',
      details: String(error)
    }, 500);
  }
});
app.get('/sports/sportmonks/soccer/leagues', async (c)=>{
  try {
    const supabase = getSupabase();
    const { data: providers } = await supabase.from('data_providers').select('id').ilike('type', 'sportmonks').eq('category', 'sports').eq('is_active', true);
    if (!providers || providers.length === 0) {
      return c.json({
        error: 'No active SportMonks provider found'
      }, 400);
    }
    const { data: provider } = await supabase.rpc('get_data_provider_credentials', {
      provider_id: providers[0].id
    });
    if (!provider?.api_key) {
      return c.json({
        error: 'SportMonks provider not configured'
      }, 400);
    }
    const baseUrl = provider.base_url || 'https://api.sportmonks.com/v3';
    const apiUrl = `${baseUrl}/football/leagues?api_token=${provider.api_key}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorText = await response.text();
      return c.json({
        error: `SportMonks API error: ${response.status}`,
        details: errorText.substring(0, 200)
      }, response.status);
    }
    const data = await response.json();
    return c.json({
      ok: true,
      leagues: data.data || [],
      subscription: data.subscription,
      rate_limit: data.rate_limit
    });
  } catch (error) {
    console.error('SportMonks error:', error);
    return c.json({
      error: 'Failed to fetch leagues',
      details: String(error)
    }, 500);
  }
});
app.post('/sports/add-league', async (c)=>{
  try {
    const body = await safeJson(c);
    const { leagueId, leagueData, seasonId } = body;
    if (!leagueId || !leagueData) {
      return jsonErr(c, 400, 'INVALID_REQUEST', 'leagueId and leagueData required');
    }
    const supabase = getSupabase();
    // Save league
    const leagueRecord = {
      id: leagueId,
      external_id: leagueData.external_id || leagueData.id,
      name: leagueData.name,
      provider_id: leagueData.provider_id,
      provider_name: leagueData.provider_name || 'sportmonks',
      sport: leagueData.sport || 'soccer',
      country: leagueData.country,
      logo_url: leagueData.logo_url || leagueData.image_path,
      season_id: seasonId,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { error: leagueError } = await supabase.from('sports_leagues').upsert(leagueRecord, {
      onConflict: 'id'
    });
    if (leagueError) {
      return c.json({
        error: 'Failed to save league',
        details: leagueError.message
      }, 500);
    }
    return c.json({
      success: true,
      leagueId,
      teamsAdded: 0,
      message: 'League saved successfully'
    });
  } catch (error) {
    console.error('Error adding league:', error);
    return c.json({
      error: 'Failed to add league',
      details: String(error)
    }, 500);
  }
});
app.post('/sports/remove-league', async (c)=>{
  try {
    const body = await safeJson(c);
    const { leagueId } = body;
    if (!leagueId) {
      return jsonErr(c, 400, 'INVALID_REQUEST', 'leagueId required');
    }
    const supabase = getSupabase();
    const { error } = await supabase.from('sports_teams').delete().eq('league_id', leagueId);
    if (error) {
      return c.json({
        error: 'Failed to delete teams',
        details: error.message
      }, 500);
    }
    return c.json({
      success: true,
      leagueId,
      message: 'League teams removed successfully'
    });
  } catch (error) {
    console.error('Error removing league:', error);
    return c.json({
      error: 'Failed to remove league',
      details: String(error)
    }, 500);
  }
});
app.get('/sports-teams', async (c)=>{
  try {
    const supabase = getSupabase();
    const { data: teams, error } = await supabase.from('sports_teams').select('*').order('name');
    if (error) throw error;
    return c.json({
      teams: teams || []
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return c.json({
      error: 'Failed to fetch teams',
      details: String(error)
    }, 500);
  }
});
app.delete('/sports-teams/:id', async (c)=>{
  try {
    const id = c.req.param('id');
    const supabase = getSupabase();
    const { error } = await supabase.from('sports_teams').delete().eq('id', id);
    if (error) throw error;
    return c.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    return c.json({
      error: 'Failed to delete team',
      details: String(error)
    }, 500);
  }
});
// ============================================================================
// START SERVER
// ============================================================================
console.log(`[sports_dashboard] Ready at ${BUILD_ID}`);
Deno.serve(app.fetch);
