import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
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
    'apikey'
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
const getSupabase = ()=>createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
// Get all teams
app.get('/sports-data/teams', async (c)=>{
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
// Get all games
app.get('/sports-data/games', async (c)=>{
  try {
    return c.json({
      games: []
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
    return c.json({
      venues: []
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
    const supabase = getSupabase();
    const { data: leagues, error } = await supabase.from('sports_leagues').select('*').order('name');
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
