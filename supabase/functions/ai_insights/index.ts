/**
 * AI Insights Edge Function
 * --------------------------------------------------------------
 * Centralized edge function for managing AI insights across dashboards.
 * Stores insights in dedicated tables per dashboard (e.g., ai_insights_elections, ai_insights_weather).
 * Also provides AI chat capabilities for all dashboards.
 */ import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
const app = new Hono();
app.use("*", logger());
app.use("/*", cors());
console.log("[ai_insights] Starting AI Insights server...");
const BUILD_ID = "ai_insights_v2.0.0";
// =============================================================================
// SUPABASE CLIENT SETUP
// =============================================================================
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
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
// =============================================================================
// HEALTH CHECK
// =============================================================================
app.get("/ai_insights/health", (c)=>{
  return c.json({
    status: "ok",
    service: "ai_insights",
    build: BUILD_ID
  });
});
// =============================================================================
// ELECTIONS AI INSIGHTS ROUTES
// =============================================================================
// Get all election AI insights
app.get("/ai_insights/elections", async (c)=>{
  try {
    console.log("📡 [ai_insights] Fetching election AI insights...");
    const { data, error } = await supabase.from("ai_insights_elections").select("*").order("created_at", {
      ascending: false
    });
    if (error) {
      console.error("❌ [ai_insights] Error fetching election insights:", error);
      return c.json({
        error: error.message
      }, 500);
    }
    console.log(`✅ [ai_insights] Fetched ${data?.length || 0} election insights`);
    return c.json({
      insights: data || []
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception fetching election insights:", error);
    return c.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});
// Save a new election AI insight
app.post("/ai_insights/elections", async (c)=>{
  try {
    const body = await c.req.json();
    const { question, response, selectedRaces = [], insightType, provider, model, category, topic, metadata = {} } = body;
    console.log("📡 [ai_insights] Saving new election AI insight...");
    console.log("   Question:", question?.substring(0, 100));
    console.log("   Insight Type:", insightType);
    console.log("   Category:", category);
    // Build metadata object
    const insightMetadata = {
      question,
      selectedRaces,
      insightType,
      provider,
      model,
      ...metadata
    };
    const { data, error } = await supabase.from("ai_insights_elections").insert({
      insight: response,
      category: category || insightType || "general",
      topic: topic || question?.substring(0, 100),
      metadata: insightMetadata
    }).select().single();
    if (error) {
      console.error("❌ [ai_insights] Error saving election insight:", error);
      return c.json({
        error: error.message
      }, 500);
    }
    console.log("✅ [ai_insights] Election insight saved with ID:", data.id);
    return c.json({
      insight: data
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception saving election insight:", error);
    return c.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});
// Delete an election AI insight
app.delete("/ai_insights/elections/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`📡 [ai_insights] Deleting election insight with ID: ${id}`);
    const { error } = await supabase.from("ai_insights_elections").delete().eq("id", id);
    if (error) {
      console.error("❌ [ai_insights] Error deleting election insight:", error);
      return c.json({
        error: error.message
      }, 500);
    }
    console.log("✅ [ai_insights] Election insight deleted");
    return c.json({
      success: true
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception deleting election insight:", error);
    return c.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});
// =============================================================================
// FINANCE AI INSIGHTS ROUTES
// =============================================================================
// Get all finance AI insights
app.get("/ai_insights/finance", async (c)=>{
  try {
    console.log("📡 [ai_insights] Fetching finance AI insights...");
    const { data, error } = await supabase.from("ai_insights_finance").select("*").order("created_at", {
      ascending: false
    });
    if (error) {
      console.error("❌ [ai_insights] Error fetching finance insights:", error);
      return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] Fetched ${data?.length || 0} finance insights`);
    return c.json({
      ok: true,
      insights: data || []
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception fetching finance insights:", error);
    return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error);
  }
});
// Get single finance AI insight by ID
app.get("/ai_insights/finance/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`📡 [ai_insights] Fetching finance insight with ID: ${id}`);
    const { data, error } = await supabase.from("ai_insights_finance").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") {
        return jsonErr(c, 404, "INSIGHT_NOT_FOUND", `Insight ${id} not found`);
      }
      return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] Finance insight fetched`);
    return c.json({
      ok: true,
      data
    });
  } catch (error) {
    return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", error);
  }
});
// Save a new finance AI insight
app.post("/ai_insights/finance", async (c)=>{
  try {
    const body = await safeJson(c);
    const { question, response, selectedIndex, selectedAssets, aiProvider, model, insightType } = body;
    if (!question || !response) {
      return jsonErr(c, 400, "INVALID_INPUT", "question and response are required");
    }
    console.log(`💾 [ai_insights] Saving finance AI insight: "${question.substring(0, 50)}..."`);
    const { data, error } = await supabase.from("ai_insights_finance").insert({
      topic: question,
      insight: response,
      category: insightType || "all",
      metadata: JSON.stringify({
        question,
        response,
        selectedIndex: selectedIndex || null,
        selectedAssets: selectedAssets || [],
        aiProvider: aiProvider || null,
        model: model || null,
        insightType: insightType || null
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select().single();
    if (error) {
      console.error("❌ [ai_insights] Error saving finance insight:", error);
      return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] Finance insight saved with ID: ${data.id}`);
    return c.json({
      ok: true,
      data
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception saving finance insight:", error);
    return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", error);
  }
});
// Delete a finance AI insight
app.delete("/ai_insights/finance/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`📡 [ai_insights] Deleting finance insight with ID: ${id}`);
    const { error } = await supabase.from("ai_insights_finance").delete().eq("id", id);
    if (error) {
      console.error("❌ [ai_insights] Error deleting finance insight:", error);
      return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] Finance insight deleted`);
    return c.json({
      ok: true,
      message: `Insight ${id} deleted successfully`
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception deleting finance insight:", error);
    return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error);
  }
});
// =============================================================================
// NEWS AI INSIGHTS ROUTES
// =============================================================================
// Get all news AI insights
app.get("/ai_insights/news", async (c)=>{
  try {
    console.log("📡 [ai_insights] Fetching news AI insights...");
    const { data, error } = await supabase.from("ai_insights_news").select("*").order("created_at", {
      ascending: false
    });
    if (error) {
      console.error("❌ [ai_insights] Error fetching news insights:", error);
      return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] Fetched ${data?.length || 0} news insights`);
    return c.json({
      ok: true,
      insights: data || []
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception fetching news insights:", error);
    return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error);
  }
});
// Get single news AI insight by ID
app.get("/ai_insights/news/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`📡 [ai_insights] Fetching news insight with ID: ${id}`);
    const { data, error } = await supabase.from("ai_insights_news").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") {
        return jsonErr(c, 404, "INSIGHT_NOT_FOUND", `Insight ${id} not found`);
      }
      return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] News insight fetched`);
    return c.json({
      ok: true,
      data
    });
  } catch (error) {
    return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", error);
  }
});
// Save a new news AI insight
app.post("/ai_insights/news", async (c)=>{
  try {
    const body = await safeJson(c);
    const { question, response, selectedArticles, aiProvider, model, insightType, category, topic } = body;
    if (!question || !response) {
      return jsonErr(c, 400, "INVALID_INPUT", "question and response are required");
    }
    console.log(`💾 [ai_insights] Saving news AI insight: "${question.substring(0, 50)}..."`);
    const { data, error } = await supabase.from("ai_insights_news").insert({
      topic: topic || question,
      insight: response,
      category: category || insightType || "general",
      metadata: JSON.stringify({
        question,
        response,
        selectedArticles: selectedArticles || [],
        aiProvider: aiProvider || null,
        model: model || null,
        insightType: insightType || null
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select().single();
    if (error) {
      console.error("❌ [ai_insights] Error saving news insight:", error);
      return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] News insight saved with ID: ${data.id}`);
    return c.json({
      ok: true,
      data
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception saving news insight:", error);
    return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", error);
  }
});
// Delete a news AI insight
app.delete("/ai_insights/news/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`📡 [ai_insights] Deleting news insight with ID: ${id}`);
    const { error } = await supabase.from("ai_insights_news").delete().eq("id", id);
    if (error) {
      console.error("❌ [ai_insights] Error deleting news insight:", error);
      return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] News insight deleted`);
    return c.json({
      ok: true,
      message: `Insight ${id} deleted successfully`
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception deleting news insight:", error);
    return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error);
  }
});
// =============================================================================
// SCHOOL CLOSINGS AI INSIGHTS ROUTES
// =============================================================================
// Get all school closings AI insights
app.get("/ai_insights/school-closings", async (c)=>{
  try {
    console.log("📡 [ai_insights] Fetching school closings AI insights...");
    const { data, error } = await supabase.from("ai_insights_school_closing").select("*").order("created_at", {
      ascending: false
    });
    if (error) {
      console.error("❌ [ai_insights] Error fetching school closings insights:", error);
      return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] Fetched ${data?.length || 0} school closings insights`);
    return c.json({
      ok: true,
      insights: data || []
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception fetching school closings insights:", error);
    return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error);
  }
});
// Get single school closings AI insight by ID
app.get("/ai_insights/school-closings/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`📡 [ai_insights] Fetching school closings insight with ID: ${id}`);
    const { data, error } = await supabase.from("ai_insights_school_closing").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") {
        return jsonErr(c, 404, "INSIGHT_NOT_FOUND", `Insight ${id} not found`);
      }
      return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] School closings insight fetched`);
    return c.json({
      ok: true,
      data
    });
  } catch (error) {
    return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", error);
  }
});
// Save a new school closings AI insight
app.post("/ai_insights/school-closings", async (c)=>{
  try {
    const body = await safeJson(c);
    const { question, response, selectedClosings, aiProvider, model, insightType, category, topic } = body;
    if (!question || !response) {
      return jsonErr(c, 400, "INVALID_INPUT", "question and response are required");
    }
    console.log(`💾 [ai_insights] Saving school closings AI insight: "${question.substring(0, 50)}..."`);
    const { data, error } = await supabase.from("ai_insights_school_closing").insert({
      topic: topic || question,
      insight: response,
      category: category || insightType || "general",
      metadata: JSON.stringify({
        question,
        response,
        selectedClosings: selectedClosings || [],
        aiProvider: aiProvider || null,
        model: model || null,
        insightType: insightType || null
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select().single();
    if (error) {
      console.error("❌ [ai_insights] Error saving school closings insight:", error);
      return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] School closings insight saved with ID: ${data.id}`);
    return c.json({
      ok: true,
      data
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception saving school closings insight:", error);
    return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", error);
  }
});
// Delete a school closings AI insight
app.delete("/ai_insights/school-closings/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`📡 [ai_insights] Deleting school closings insight with ID: ${id}`);
    const { error } = await supabase.from("ai_insights_school_closing").delete().eq("id", id);
    if (error) {
      console.error("❌ [ai_insights] Error deleting school closings insight:", error);
      return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] School closings insight deleted`);
    return c.json({
      ok: true,
      message: `Insight ${id} deleted successfully`
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception deleting school closings insight:", error);
    return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error);
  }
});
// =============================================================================
// WEATHER AI INSIGHTS ROUTES
// =============================================================================
// Get all weather AI insights
app.get("/ai_insights/weather", async (c)=>{
  try {
    console.log("📡 [ai_insights] Fetching weather AI insights...");
    const { data, error } = await supabase.from("ai_insights_weather").select("*").order("created_at", {
      ascending: false
    });
    if (error) {
      console.error("❌ [ai_insights] Error fetching weather insights:", error);
      return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] Fetched ${data?.length || 0} weather insights`);
    return c.json({
      ok: true,
      insights: data || []
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception fetching weather insights:", error);
    return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error);
  }
});
// Get single weather AI insight by ID
app.get("/ai_insights/weather/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`📡 [ai_insights] Fetching weather insight with ID: ${id}`);
    const { data, error } = await supabase.from("ai_insights_weather").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") {
        return jsonErr(c, 404, "INSIGHT_NOT_FOUND", `Insight ${id} not found`);
      }
      return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] Weather insight fetched`);
    return c.json({
      ok: true,
      data
    });
  } catch (error) {
    return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", error);
  }
});
// Save a new weather AI insight
app.post("/ai_insights/weather", async (c)=>{
  try {
    const body = await safeJson(c);
    const { question, response, selectedLocations, aiProvider, model, insightType, category, topic, provider } = body;
    if (!question || !response) {
      return jsonErr(c, 400, "INVALID_INPUT", "question and response are required");
    }
    console.log(`💾 [ai_insights] Saving weather AI insight: "${question.substring(0, 50)}..."`);
    const { data, error } = await supabase.from("ai_insights_weather").insert({
      topic: topic || question,
      insight: response,
      category: category || insightType || "general",
      metadata: JSON.stringify({
        question,
        response,
        selectedLocations: selectedLocations || [],
        aiProvider: aiProvider || provider || null,
        model: model || null,
        insightType: insightType || null
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select().single();
    if (error) {
      console.error("❌ [ai_insights] Error saving weather insight:", error);
      return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] Weather insight saved with ID: ${data.id}`);
    return c.json({
      ok: true,
      insight: data
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception saving weather insight:", error);
    return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", error);
  }
});
// Delete a weather AI insight
app.delete("/ai_insights/weather/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`📡 [ai_insights] Deleting weather insight with ID: ${id}`);
    const { error } = await supabase.from("ai_insights_weather").delete().eq("id", id);
    if (error) {
      console.error("❌ [ai_insights] Error deleting weather insight:", error);
      return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error.message);
    }
    console.log(`✅ [ai_insights] Weather insight deleted`);
    return c.json({
      ok: true,
      message: `Insight ${id} deleted successfully`
    });
  } catch (error) {
    console.error("❌ [ai_insights] Exception deleting weather insight:", error);
    return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error);
  }
});
// =============================================================================
// AI CHAT ENDPOINT (For All Dashboards)
// =============================================================================
// Chat with AI provider
app.post("/ai_insights/chat", async (c)=>{
  try {
    const body = await safeJson(c);
    const { providerId, message, context, dashboard } = body;
    if (!providerId || !message) {
      return jsonErr(c, 400, 'AI_CHAT_INVALID_INPUT', 'providerId and message are required');
    }
    console.log(`💬 [ai_insights] Chat request for ${dashboard || 'unknown'} dashboard`);
    // Get the AI provider from database
    const { data: provider, error } = await supabase.from("ai_providers").select("*").eq("id", providerId).single();
    if (error || !provider) {
      return jsonErr(c, 404, 'AI_PROVIDER_NOT_FOUND', error?.message);
    }
    if (!provider.enabled) {
      return jsonErr(c, 400, 'AI_PROVIDER_DISABLED', 'This AI provider is disabled');
    }
    if (!provider.api_key) {
      return jsonErr(c, 400, 'AI_PROVIDER_NO_KEY', 'This AI provider has no API key configured');
    }
    // Prepare the full message with context
    const fullMessage = context ? `${context}\n\n${message}` : message;
    console.log(`🤖 [ai_insights] Sending chat to ${provider.provider_name} (${provider.model})`);
    let aiResponse = '';
    // Call the appropriate AI API based on provider type
    if (provider.provider_name === 'claude') {
      // Anthropic Claude API
      const response = await fetch(`${provider.endpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.api_key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: provider.max_tokens || 4096,
          temperature: provider.temperature || 0.7,
          messages: [
            {
              role: 'user',
              content: fullMessage
            }
          ]
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(()=>({}));
        // Check for quota/rate limit errors
        if (response.status === 429 || errorData.error?.type === 'rate_limit_error') {
          return c.json({
            ok: false,
            error: 'Rate limit exceeded',
            details: errorData.error?.message || 'Too many requests',
            isQuotaError: true
          }, 429);
        }
        console.error('❌ [ai_insights] Claude API error:', errorData);
        return jsonErr(c, response.status, 'CLAUDE_API_ERROR', errorData.error?.message || 'Claude API error');
      }
      const data = await response.json();
      aiResponse = data.content[0]?.text || '';
    } else if (provider.provider_name === 'openai') {
      // OpenAI API
      const response = await fetch(`${provider.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.api_key}`
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: provider.max_tokens || 4096,
          temperature: provider.temperature || 0.7,
          messages: [
            {
              role: 'user',
              content: fullMessage
            }
          ]
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(()=>({}));
        // Check for quota/rate limit errors
        if (response.status === 429) {
          return c.json({
            ok: false,
            error: 'Rate limit exceeded',
            details: errorData.error?.message || 'Too many requests',
            isQuotaError: true
          }, 429);
        }
        console.error('❌ [ai_insights] OpenAI API error:', errorData);
        return jsonErr(c, response.status, 'OPENAI_API_ERROR', errorData.error?.message || 'OpenAI API error');
      }
      const data = await response.json();
      aiResponse = data.choices[0]?.message?.content || '';
    } else if (provider.provider_name === 'gemini') {
      // Google Gemini API
      const apiUrl = `${provider.endpoint}/${provider.model}:generateContent?key=${provider.api_key}`;
      console.log(`🌐 [ai_insights] Calling Gemini API: ${provider.model}`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullMessage
                }
              ]
            }
          ],
          generationConfig: {
            temperature: provider.temperature || 0.7,
            maxOutputTokens: provider.max_tokens || 4096
          }
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(()=>({}));
        console.error('❌ [ai_insights] Gemini API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        // Check for quota/rate limit errors
        if (response.status === 429 || errorData.error?.status === 'RESOURCE_EXHAUSTED') {
          return c.json({
            ok: false,
            error: 'API quota exceeded',
            details: errorData.error?.message || 'Quota exceeded for Gemini API',
            isQuotaError: true
          }, 429);
        }
        // Return detailed error message
        const errorMessage = errorData.error?.message || errorData.error?.status || `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ [ai_insights] Gemini detailed error:', errorMessage);
        return jsonErr(c, response.status, 'GEMINI_API_ERROR', errorMessage);
      }
      const data = await response.json();
      console.log('✅ [ai_insights] Gemini API response received:', {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length
      });
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      return jsonErr(c, 400, 'UNSUPPORTED_PROVIDER', `Provider ${provider.provider_name} is not supported for chat`);
    }
    console.log(`✅ [ai_insights] Chat response generated (${aiResponse.length} chars)`);
    return c.json({
      ok: true,
      response: aiResponse,
      provider: provider.provider_name,
      model: provider.model
    });
  } catch (error) {
    console.error("❌ [ai_insights] Error in AI chat:", error);
    return jsonErr(c, 500, 'AI_CHAT_FAILED', error);
  }
});
// =============================================================================
// EXPORT & START SERVER
// =============================================================================
console.log(`✅ [ai_insights] Server ready (${BUILD_ID})`);
export default {
  fetch: app.fetch
};
