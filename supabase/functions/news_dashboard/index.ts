// trigger redeploy 2025-11-11 - migrated AI insights to ai_insights_news table
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
// ============================================================================
// SUPABASE CLIENT
// ============================================================================
const getSupabaseClient = ()=>createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
// ============================================================================
// SERVER SETUP
// ============================================================================
const BUILD_ID = new Date().toISOString();
console.log("[news_dashboard] boot", BUILD_ID);
const app = new Hono().basePath("/news_dashboard");
// Enable logger
app.use("*", logger(console.log));
// CORS configuration
app.use("/*", cors({
  origin: "*",
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "Cache-Control",
    "Pragma",
    "x-client-info",
    "apikey"
  ],
  allowMethods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS"
  ],
  exposeHeaders: [
    "Content-Length"
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
  console.error(`[${code}]`, detail ?? "");
  return c.json({
    ok: false,
    error: code,
    detail: String(detail ?? "")
  }, status);
}
// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (c)=>{
  return c.json({
    status: "ok",
    service: "news_dashboard",
    build: BUILD_ID
  });
});
// ============================================================================
// NEWS ARTICLES ROUTES
// ============================================================================
// Get stored articles from database
app.get("/news-articles/stored", async (c)=>{
  try {
    const supabase = getSupabaseClient();
    // Get query parameters
    const url = new URL(c.req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const provider = url.searchParams.get("provider");
    const source = url.searchParams.get("source");
    const language = url.searchParams.get("language");
    const country = url.searchParams.get("country");
    const search = url.searchParams.get("search");
    console.log("[NEWS STORED] Query params:", {
      limit,
      provider,
      source,
      language,
      country,
      search
    });
    // Build query
    let query = supabase.from("news_articles").select("*", {
      count: "exact"
    });
    // Apply filters
    if (provider) query = query.eq("provider", provider);
    if (source) query = query.eq("source", source);
    if (language) query = query.eq("language", language);
    if (country) query = query.eq("country", country);
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    // Apply ordering and limit
    query = query.order("published_at", {
      ascending: false
    }).limit(limit);
    const { data, error, count } = await query;
    if (error) {
      console.error("[NEWS STORED] Error fetching articles:", error);
      return jsonErr(c, 500, "FETCH_FAILED", error.message);
    }
    console.log(`[NEWS STORED] ✅ Fetched ${data?.length || 0} articles`);
    return c.json({
      ok: true,
      articles: data || [],
      total: count || 0
    });
  } catch (error) {
    return jsonErr(c, 500, "STORED_ARTICLES_FETCH_FAILED", error);
  }
});
// Fetch new articles from external APIs
app.post("/news-articles", async (c)=>{
  try {
    console.log("[NEWS FETCH] ========== NEW REQUEST ==========");
    const body = await safeJson(c);
    const { providers: clientProviders, q, country, language, perProviderLimit = 10, totalLimit = 50 } = body;

    const supabase = getSupabaseClient();

    // SECURE: Fetch providers directly from database instead of trusting client data
    // This ensures API keys come from the secure database, not the frontend
    const { data: dbProviders, error: providerError } = await supabase
      .from("data_providers")
      .select("id, name, type, api_key, config, is_active")
      .eq("category", "news")
      .eq("is_active", true);

    if (providerError) {
      console.error("[NEWS FETCH] ❌ Error fetching providers from DB:", providerError);
      return jsonErr(c, 500, "PROVIDER_FETCH_FAILED", providerError.message);
    }

    // Use database providers, but allow client to filter which ones to use
    let providers = dbProviders || [];

    // If client specified providers, filter to only those (but still use DB credentials)
    if (Array.isArray(clientProviders) && clientProviders.length > 0) {
      const clientProviderNames = clientProviders.map((p: any) => p.name?.toLowerCase());
      providers = providers.filter(p => clientProviderNames.includes(p.name?.toLowerCase()));
    }

    console.log("[NEWS FETCH] DB providers found:", providers.map(p => ({ name: p.name, type: p.type, hasKey: !!p.api_key })));
    console.log("[NEWS FETCH] Request params:", {
      providerCount: providers?.length,
      q,
      country,
      language,
      perProviderLimit,
      totalLimit
    });

    if (providers.length === 0) {
      console.error("[NEWS FETCH] ❌ No active news providers found");
      return jsonErr(c, 400, "NO_PROVIDERS", "No active news providers configured");
    }
    // Fetch from all providers in parallel
    const fetchPromises = providers.map(async (provider)=>{
      try {
        // DB fields use snake_case
        const { name, type, api_key: apiKey, config } = provider;
        const providerCountry = config?.country;
        const providerLanguage = config?.language;
        if (!apiKey) {
          console.log(`[NEWS FETCH] Skipping ${name} - no API key`);
          return [];
        }
        // -----------------------------------------------------------------------
        // Build provider request URLs with freshness filters
        // -----------------------------------------------------------------------
        const now = new Date();
        // Use 24-hour window for better article coverage (3 hours was too narrow)
        const hoursBack = 24;
        const fromDate = new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();
        let url;
        if (type === "newsapi") {
          // NewsAPI: /everything REQUIRES at least one of: q, qInTitle, sources, domains
          // Use fallback query if none provided to avoid parametersMissing error
          const defaultQuery = q && q.trim() !== "" ? q.trim() : "technology OR business OR finance OR world";
          url = `https://newsapi.org/v2/everything?apiKey=${apiKey}&sortBy=publishedAt&from=${fromDate}`;
          url += `&q=${encodeURIComponent(defaultQuery)}`;
          if (language || providerLanguage) url += `&language=${language || providerLanguage}`;
          url += `&pageSize=${perProviderLimit}`;
        } else if (type === "gnews") {
          url = `https://gnews.io/api/v4/top-headlines?token=${apiKey}&sortby=publishedAt`;
          if (q) url += `&q=${encodeURIComponent(q)}`;
          if (country || providerCountry) url += `&country=${country || providerCountry}`;
          if (language || providerLanguage) url += `&lang=${language || providerLanguage}`;
          url += `&max=${perProviderLimit}`;
        } else if (type === "newsdata") {
          // NewsData.io: use /latest endpoint for recent news (free tier friendly)
          // from_date requires paid plan
          url = `https://newsdata.io/api/1/latest?apikey=${apiKey}`;
          if (q) url += `&q=${encodeURIComponent(q)}`;
          if (country || providerCountry) url += `&country=${country || providerCountry}`;
          if (language || providerLanguage) url += `&language=${language || providerLanguage}`;
          url += `&size=${perProviderLimit}`;
        } else if (type === "currents") {
          const since = new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString();
          url = `https://api.currentsapi.services/v1/search?apiKey=${apiKey}&start_date=${since}&sort_by=published`;
          if (q) url += `&keywords=${encodeURIComponent(q)}`;
          if (country || providerCountry) url += `&country=${country || providerCountry}`;
          if (language || providerLanguage) url += `&language=${language || providerLanguage}`;
          url += `&page_size=${perProviderLimit}`;
        } else {
          console.log(`[NEWS FETCH] Unknown provider type: ${type}`);
          return [];
        }
        console.log(`[NEWS FETCH] Fetching from ${name} (${type})`);
        // Don't log full URL with API key in production - mask it
        const maskedUrl = url.replace(/(apiKey=|token=|apikey=)[^&]+/, '$1***MASKED***');
        console.log(`[NEWS FETCH] URL → ${maskedUrl}`);
        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[NEWS FETCH] ${name} failed:`, response.status, errorText);
          return [];
        }
        const data = await response.json();

        // Check for API-level errors (some APIs return 200 with error in body)
        if (data.status === 'error' || data.error) {
          console.error(`[NEWS FETCH] ${name} API error:`, data.message || data.error || JSON.stringify(data));
          return [];
        }

        console.log(`[NEWS FETCH] ${name} response status:`, data.status, 'totalResults:', data.totalResults || data.total || 'N/A');
        // -----------------------------------------------------------------------
        // Normalize articles based on provider type
        // -----------------------------------------------------------------------
        let articles = [];
        if (type === "newsapi") {
          articles = (data.articles || []).map((a)=>({
              provider: name.toLowerCase(),
              provider_article_id: `${name.toLowerCase()}-${a.url}`,
              title: a.title,
              description: a.description,
              content: a.content,
              url: a.url,
              image_url: a.urlToImage,
              published_at: a.publishedAt,
              source_name: a.source?.name || name,
              author: a.author,
              country: country || providerCountry || null,
              language: language || providerLanguage || null
            }));
        } else if (type === "gnews") {
          articles = (data.articles || []).map((a)=>({
              provider: name.toLowerCase(),
              provider_article_id: `${name.toLowerCase()}-${a.url}`,
              title: a.title,
              description: a.description,
              content: a.content,
              url: a.url,
              image_url: a.image,
              published_at: a.publishedAt,
              source_name: a.source?.name || name,
              author: null,
              country: country || providerCountry || null,
              language: language || providerLanguage || null
            }));
        } else if (type === "newsdata") {
          articles = (data.results || []).map((a)=>({
              provider: name.toLowerCase(),
              provider_article_id: `${name.toLowerCase()}-${a.link}`,
              title: a.title,
              description: a.description,
              content: a.content,
              url: a.link,
              image_url: a.image_url,
              published_at: a.pubDate,
              source_name: a.source_id || name,
              author: a.creator?.[0],
              country: country || providerCountry || null,
              language: language || providerLanguage || null
            }));
        } else if (type === "currents") {
          articles = (data.news || []).map((a)=>({
              provider: name.toLowerCase(),
              provider_article_id: `${name.toLowerCase()}-${a.url}`,
              title: a.title,
              description: a.description,
              content: a.description,
              url: a.url,
              image_url: a.image,
              published_at: a.published,
              source_name: name,
              author: a.author,
              country: country || providerCountry || null,
              language: language || providerLanguage || null
            }));
        }
        console.log(`[NEWS FETCH] ${name} returned ${articles.length} articles`);
        return articles;
      } catch (error) {
        console.error(`[NEWS FETCH] Error fetching from ${provider.name}:`, error);
        return [];
      }
    });
    const results = await Promise.all(fetchPromises);
    const allArticles = results.flat();
    // Apply total limit
    const limitedArticles = allArticles.slice(0, totalLimit);
    // Save articles to DB (upsert avoids duplicates)
    if (limitedArticles.length > 0) {
      const { data: inserted, error: insertError } = await supabase.from("news_articles").upsert(limitedArticles, {
        onConflict: "provider_article_id",
        ignoreDuplicates: false
      }).select();
      if (insertError) {
        console.error("[NEWS FETCH] Error saving articles:", insertError);
        return jsonErr(c, 500, "DB_INSERT_FAILED", insertError.message);
      }
      console.log(`[NEWS FETCH] ✅ Upserted ${inserted?.length || 0} new / ${limitedArticles.length} fetched`);
    }
    // Fetch and return saved articles
    const { data: savedArticles, error: fetchError } = await supabase.from("news_articles").select("*").in("provider_article_id", limitedArticles.map((a)=>a.provider_article_id)).order("created_at", {
      ascending: false
    });
    if (fetchError) {
      console.error("[NEWS FETCH] Error fetching saved articles:", fetchError);
    }
    return c.json({
      ok: true,
      articles: savedArticles || limitedArticles,
      total: savedArticles?.length || limitedArticles.length
    });
  } catch (error) {
    return jsonErr(c, 500, "NEWS_FETCH_FAILED", error);
  }
});
// ============================================================================
// START SERVER
// ============================================================================
Deno.serve(app.fetch);
