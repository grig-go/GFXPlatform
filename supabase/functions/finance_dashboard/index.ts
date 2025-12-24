// ============================================================================
// Finance Dashboard Edge Function
// Handles Alpaca stocks/crypto + AI Insights + Overrides
// ============================================================================
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
// ============================================================================
// SUPABASE CLIENT
// ============================================================================
// Service role client - bypasses RLS (use only for admin operations)
const getServiceClient = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// User-scoped client - respects RLS based on user's JWT
const getUserClient = (authHeader: string | null) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // If we have a Bearer token, use it to create a user-scoped client
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  // Fallback to anon client (will still respect RLS, but as anonymous)
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Default to service client for backward compatibility with writes
const supabase = getServiceClient();
// ============================================================================
// SERVER SETUP
// ============================================================================
const BUILD_ID = new Date().toISOString();
console.log("[finance_dashboard] boot", BUILD_ID);
const app = new Hono().basePath("/finance_dashboard");
app.use("*", async (c, next)=>{
  await next();
});
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
// HELPERS
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
// Get Alpaca credentials from data_providers table
async function getAlpacaCredentials() {
  const { data, error } = await supabase.from("data_providers").select("api_key, api_secret, is_active").eq("category", "finance").eq("type", "alpaca").single();
  if (error || !data) {
    console.error("❌ Failed to fetch Alpaca credentials:", error);
    return null;
  }
  if (!data.is_active) {
    console.error("❌ Alpaca provider is not active");
    return null;
  }
  if (!data.api_key || !data.api_secret) {
    console.error("❌ Alpaca credentials are missing");
    return null;
  }
  return {
    apiKey: data.api_key,
    apiSecret: data.api_secret
  };
}
// Get CoinGecko credentials
async function getCoinGeckoCredentials() {
  const { data, error } = await supabase.from("data_providers").select("api_key, is_active").eq("category", "finance").eq("type", "coingecko").single();
  if (error || !data) {
    console.error("❌ Failed to fetch CoinGecko credentials:", error);
    return null;
  }
  if (!data.is_active) {
    console.error("❌ CoinGecko provider is not active");
    return null;
  }
  // Trim and validate API key
  const apiKey = data.api_key?.trim() || null;
  console.log(`🔑 CoinGecko API key status:`, {
    hasKey: !!apiKey,
    keyLength: apiKey?.length || 0,
    keyPrefix: apiKey ? `${apiKey.substring(0, 10)}...` : 'none'
  });
  return {
    apiKey
  };
}
// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (c)=>c.json({
    status: "ok",
    service: "finance_dashboard",
    build: BUILD_ID
  }));
// ============================================================================
// STOCKS / CRYPTO ROUTES (f_stocks table)
// ============================================================================
// GET all stocks/crypto
app.get("/stocks", async (c)=>{
  try {
    // Use user-scoped client to respect RLS organization filtering
    const authHeader = c.req.header("Authorization");
    const userClient = getUserClient(authHeader);
    console.log(`[/stocks] 🔐 Using ${authHeader ? 'user-scoped' : 'anonymous'} client for RLS`);

    const { data, error } = await userClient.from("f_stocks").select("*").order("symbol");
    if (error) {
      console.error(`[/stocks] ❌ Error:`, error);
      return jsonErr(c, 500, "STOCKS_FETCH_FAILED", error.message);
    }
    console.log(`[/stocks] ✅ Returning ${data?.length || 0} stocks`);
    return c.json({
      ok: true,
      stocks: data || []
    });
  } catch (err) {
    return jsonErr(c, 500, "STOCKS_FETCH_FAILED", err);
  }
});
// POST refresh all stocks/crypto prices from Alpaca API
app.post("/stocks/refresh", async (c)=>{
  try {
    console.log("🔄 Refreshing all stock/crypto prices from Alpaca API...");
    const alpacaCredentials = await getAlpacaCredentials();
    if (!alpacaCredentials) {
      return jsonErr(c, 500, "ALPACA_NOT_CONFIGURED", "Alpaca API credentials not configured");
    }
    // Get all stocks/crypto from database
    const { data: securities, error: fetchError } = await supabase.from("f_stocks").select("*");
    if (fetchError) {
      return jsonErr(c, 500, "STOCKS_FETCH_FAILED", fetchError.message);
    }
    if (!securities || securities.length === 0) {
      return c.json({
        ok: true,
        message: "No securities to refresh",
        updated: 0,
        failed: 0
      });
    }
    console.log(`📊 Found ${securities.length} securities to refresh`);
    let updated = 0;
    let failed = 0;
    const errors = [];
    // Refresh prices for each security
    for (const security of securities){
      try {
        const symbol = security.symbol;
        // Determine if it's crypto or stock based on type
        const isCrypto = security.type === "CRYPTO";
        // For crypto, use CoinGecko; for stocks/indices use Alpaca
        if (isCrypto) {
          // Try to get fresh price from CoinGecko
          const coinGeckoCredentials = await getCoinGeckoCredentials();
          if (!coinGeckoCredentials) {
            console.log(`⚠️ Skipping ${symbol} - CoinGecko not configured`);
            failed++;
            continue;
          }
          // Search for the coin first to get its ID
          const searchUrl = coinGeckoCredentials.apiKey ? `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}&x_cg_demo_api_key=${coinGeckoCredentials.apiKey}` : `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
          const searchResponse = await fetch(searchUrl);
          if (!searchResponse.ok) {
            console.log(`⚠️ Failed to search for ${symbol} on CoinGecko`);
            failed++;
            continue;
          }
          const searchData = await searchResponse.json();
          const coin = searchData.coins?.[0];
          if (!coin) {
            console.log(`⚠️ Coin ${symbol} not found on CoinGecko`);
            failed++;
            continue;
          }
          // Get market data
          const marketUrl = coinGeckoCredentials.apiKey ? `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin.id}&x_cg_demo_api_key=${coinGeckoCredentials.apiKey}` : `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin.id}`;
          const marketResponse = await fetch(marketUrl);
          if (!marketResponse.ok) {
            console.log(`⚠️ Failed to get market data for ${symbol}`);
            failed++;
            continue;
          }
          const [marketData] = await marketResponse.json();
          if (!marketData) {
            console.log(`⚠️ No market data for ${symbol}`);
            failed++;
            continue;
          }
          // Update database with fresh crypto price
          const updateData = {
            price: marketData.current_price,
            change_1d_pct: marketData.price_change_percentage_24h,
            volume: marketData.total_volume,
            year_high: marketData.high_24h,
            year_low: marketData.low_24h,
            logo_url: marketData.image,
            last_update: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const { error: updateError } = await supabase.from("f_stocks").update(updateData).eq("symbol", symbol);
          if (updateError) {
            console.error(`❌ Failed to update ${symbol}:`, updateError);
            failed++;
            errors.push({
              symbol,
              error: updateError.message
            });
          } else {
            console.log(`✅ Updated ${symbol}: $${marketData.current_price}`);
            updated++;
          }
        } else {
          // For stocks/indices, use Alpaca bars/snapshot API
          const url = `https://data.alpaca.markets/v2/stocks/${symbol}/bars/latest`;
          const response = await fetch(url, {
            headers: {
              "APCA-API-KEY-ID": alpacaCredentials.apiKey,
              "APCA-API-SECRET-KEY": alpacaCredentials.apiSecret
            }
          });
          if (!response.ok) {
            console.log(`⚠️ Failed to fetch ${symbol} from Alpaca (${response.status})`);
            failed++;
            errors.push({
              symbol,
              error: `HTTP ${response.status}`
            });
            continue;
          }
          const data = await response.json();
          const bar = data.bar;
          if (!bar) {
            console.log(`⚠️ No bar data for ${symbol}`);
            failed++;
            continue;
          }
          // Calculate 1-day change
          const currentPrice = bar.c; // Close price
          const previousClose = security.price || currentPrice;
          const change_1d = currentPrice - previousClose;
          const change_1d_pct = previousClose ? change_1d / previousClose * 100 : 0;
          // Update database with fresh price
          const updateData = {
            price: currentPrice,
            change_1d,
            change_1d_pct,
            volume: bar.v,
            year_high: Math.max(bar.h, security.year_high || 0),
            year_low: security.year_low ? Math.min(bar.l, security.year_low) : bar.l,
            last_update: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const { error: updateError } = await supabase.from("f_stocks").update(updateData).eq("symbol", symbol);
          if (updateError) {
            console.error(`❌ Failed to update ${symbol}:`, updateError);
            failed++;
            errors.push({
              symbol,
              error: updateError.message
            });
          } else {
            console.log(`✅ Updated ${symbol}: $${currentPrice} (${change_1d_pct > 0 ? '+' : ''}${change_1d_pct.toFixed(2)}%)`);
            updated++;
          }
        }
        // Add small delay to avoid rate limiting
        await new Promise((resolve)=>setTimeout(resolve, 100));
      } catch (err) {
        console.error(`❌ Error refreshing ${security.symbol}:`, err);
        failed++;
        errors.push({
          symbol: security.symbol,
          error: String(err)
        });
      }
    }
    console.log(`🎉 Refresh complete: ${updated} updated, ${failed} failed`);
    return c.json({
      ok: true,
      message: `Refreshed ${updated}/${securities.length} securities`,
      updated,
      failed,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error("❌ Refresh failed:", err);
    return jsonErr(c, 500, "REFRESH_FAILED", String(err));
  }
});
// GET single stock/crypto by symbol
app.get("/stocks/:symbol", async (c)=>{
  try {
    const symbol = c.req.param("symbol");
    const { data, error } = await supabase.from("f_stocks").select("*").eq("symbol", symbol).single();
    if (error) {
      if (error.code === "PGRST116") {
        return jsonErr(c, 404, "STOCK_NOT_FOUND", `Stock ${symbol} not found`);
      }
      return jsonErr(c, 500, "STOCK_FETCH_FAILED", error.message);
    }
    return c.json({
      ok: true,
      data
    });
  } catch (err) {
    return jsonErr(c, 500, "STOCK_FETCH_FAILED", err);
  }
});
// POST add or update a stock/crypto (auto-upsert)
app.post("/stocks", async (c)=>{
  try {
    const body = await safeJson(c);
    const { symbol, name, type, exchange, currency, price, change_1d, change_1d_pct, change_1w_pct, change_1y_pct, year_high, year_low, custom_name, class: assetClass, source, source_id, volume, logo_url } = body;
    if (!symbol || !name) {
      return jsonErr(c, 400, "INVALID_INPUT", "symbol and name are required");
    }
    // ✅ Normalize type — keep CRYPTO/ETF/INDEX as-is, but convert us_equity/STOCK to EQUITY
    const normalizedType = (()=>{
      if (!type) return "EQUITY";
      const t = type.toString().trim().toUpperCase();
      if ([
        "EQUITY",
        "ETF",
        "INDEX",
        "CRYPTO"
      ].includes(t)) return t;
      if ([
        "US_EQUITY",
        "STOCK"
      ].includes(t)) return "EQUITY";
      if (t === "CRYPTOCURRENCY") return "CRYPTO";
      return "EQUITY";
    })();
    console.log(`📥 Upserting stock/crypto:`, {
      symbol,
      name,
      type: normalizedType,
      exchange
    });
    const { data, error } = await supabase.from("f_stocks").upsert({
      symbol,
      name,
      type: normalizedType,
      exchange: exchange || null,
      price: price || null,
      change_1d: change_1d || null,
      change_1d_pct: change_1d_pct || null,
      change_1w_pct: change_1w_pct || null,
      change_1y_pct: change_1y_pct || null,
      year_high: year_high || null,
      year_low: year_low || null,
      custom_name: custom_name || null,
      class: assetClass || "stock",
      source: source || null,
      source_id: source_id || null,
      volume: volume || null,
      logo_url: logo_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_update: new Date().toISOString()
    }, {
      onConflict: "symbol"
    } // ✅ overwrite on symbol conflict
    ).select().single();
    if (error) {
      console.error(`❌ Database error upserting stock:`, error);
      return jsonErr(c, 500, "STOCK_UPSERT_FAILED", error.message);
    }
    console.log(`✅ Upserted stock/crypto: ${symbol} (${name})`);
    return c.json({
      ok: true,
      data
    });
  } catch (err) {
    console.error(`❌ Exception upserting stock:`, err);
    return jsonErr(c, 500, "STOCK_UPSERT_FAILED", String(err));
  }
});
// PUT update a stock/crypto
app.put("/stocks/:symbol", async (c)=>{
  try {
    const symbol = c.req.param("symbol");
    const body = await safeJson(c);
    const updateData = {
      updated_at: new Date().toISOString(),
      last_update: new Date().toISOString()
    };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.custom_name !== undefined) updateData.custom_name = body.custom_name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.exchange !== undefined) updateData.exchange = body.exchange;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.change_1d !== undefined) updateData.change_1d = body.change_1d;
    if (body.change_1d_pct !== undefined) updateData.change_1d_pct = body.change_1d_pct;
    if (body.change_1w_pct !== undefined) updateData.change_1w_pct = body.change_1w_pct;
    if (body.change_1y_pct !== undefined) updateData.change_1y_pct = body.change_1y_pct;
    if (body.year_high !== undefined) updateData.year_high = body.year_high;
    if (body.year_low !== undefined) updateData.year_low = body.year_low;
    if (body.class !== undefined) updateData.class = body.class;
    if (body.source !== undefined) updateData.source = body.source;
    if (body.source_id !== undefined) updateData.source_id = body.source_id;
    if (body.volume !== undefined) updateData.volume = body.volume;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url;
    const { data, error } = await supabase.from("f_stocks").update(updateData).eq("symbol", symbol).select().single();
    if (error) {
      if (error.code === "PGRST116") {
        return jsonErr(c, 404, "STOCK_NOT_FOUND", `Stock ${symbol} not found`);
      }
      return jsonErr(c, 500, "STOCK_UPDATE_FAILED", error.message);
    }
    console.log(`✅ Updated stock/crypto: ${symbol}`);
    return c.json({
      ok: true,
      data
    });
  } catch (err) {
    return jsonErr(c, 500, "STOCK_UPDATE_FAILED", err);
  }
});
// DELETE a stock/crypto
app.delete("/stocks/:symbol", async (c)=>{
  try {
    const symbol = c.req.param("symbol");
    const { error } = await supabase.from("f_stocks").delete().eq("symbol", symbol);
    if (error) return jsonErr(c, 500, "STOCK_DELETE_FAILED", error.message);
    console.log(`✅ Deleted stock/crypto: ${symbol}`);
    return c.json({
      ok: true,
      message: `Stock ${symbol} deleted successfully`
    });
  } catch (err) {
    return jsonErr(c, 500, "STOCK_DELETE_FAILED", err);
  }
});
// GET stocks with custom names (overrides)
app.get("/stocks/overrides/list", async (c)=>{
  try {
    const { data, error } = await supabase.from("f_stocks").select("symbol, name, custom_name, type").not("custom_name", "is", null);
    if (error) return jsonErr(c, 500, "OVERRIDES_FETCH_FAILED", error.message);
    return c.json({
      ok: true,
      overrides: data || []
    });
  } catch (err) {
    return jsonErr(c, 500, "OVERRIDES_FETCH_FAILED", err);
  }
});
// ============================================================================
// AI INSIGHTS ROUTES (ai_insights_finance table)
// ============================================================================
// GET all finance AI insights
app.get("/ai-insights", async (c)=>{
  try {
    const { data, error } = await supabase.from("ai_insights_finance").select("*").order("created_at", {
      ascending: false
    });
    if (error) return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error.message);
    return c.json({
      ok: true,
      insights: data || []
    });
  } catch (err) {
    return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", err);
  }
});
// GET single AI insight by ID
app.get("/ai-insights/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const { data, error } = await supabase.from("ai_insights_finance").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") {
        return jsonErr(c, 404, "INSIGHT_NOT_FOUND", `Insight ${id} not found`);
      }
      return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", error.message);
    }
    return c.json({
      ok: true,
      data
    });
  } catch (err) {
    return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", err);
  }
});
// POST create a new AI insight
app.post("/ai-insights", async (c)=>{
  try {
    const body = await safeJson(c);
    const { question, response, selectedIndex, selectedAssets, aiProvider, model, insightType } = body;
    if (!question || !response) {
      return jsonErr(c, 400, "INVALID_INPUT", "question and response are required");
    }
    console.log(`💾 Saving finance AI insight: "${question.substring(0, 50)}..."`);
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
      console.error("❌ Error saving insight to database:", error);
      return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", error.message);
    }
    console.log(`✅ Finance insight saved with ID: ${data.id}`);
    return c.json({
      ok: true,
      data
    });
  } catch (err) {
    console.error("❌ Exception saving insight:", err);
    return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", err);
  }
});
// DELETE an AI insight
app.delete("/ai-insights/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const { error } = await supabase.from("ai_insights_finance").delete().eq("id", id);
    if (error) return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error.message);
    console.log(`✅ Deleted finance AI insight: ${id}`);
    return c.json({
      ok: true,
      message: `Insight ${id} deleted successfully`
    });
  } catch (err) {
    return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", err);
  }
});
// ============================================================================
// ALPACA API INTEGRATION (Stock & Crypto Search)
// ============================================================================
// Search stocks via Alpaca API
app.get("/search/stocks", async (c)=>{
  try {
    const query = c.req.query("q");
    const assetClass = c.req.query("asset_class") || "us_equity"; // us_equity or crypto
    if (!query) {
      return jsonErr(c, 400, "INVALID_INPUT", "Query parameter 'q' is required");
    }
    const alpacaCredentials = await getAlpacaCredentials();
    if (!alpacaCredentials) {
      return jsonErr(c, 500, "ALPACA_NOT_CONFIGURED", "Alpaca API credentials not configured");
    }
    // Alpaca Assets API for searching
    const url = `https://paper-api.alpaca.markets/v2/assets?status=active&asset_class=${assetClass}`;
    const response = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": alpacaCredentials.apiKey,
        "APCA-API-SECRET-KEY": alpacaCredentials.apiSecret
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      return jsonErr(c, response.status, "ALPACA_API_ERROR", `Alpaca API error: ${errorText}`);
    }
    const assets = await response.json();
    // Filter assets by query
    const normalizedQuery = query.toLowerCase();
    const filteredAssets = assets.filter((asset)=>{
      const symbolMatch = asset.symbol?.toLowerCase().includes(normalizedQuery);
      const nameMatch = asset.name?.toLowerCase().includes(normalizedQuery);
      return symbolMatch || nameMatch;
    });
    // Sort by relevance: exact symbol match > symbol starts with > symbol contains > name match
    const sortedAssets = filteredAssets.sort((a, b)=>{
      const aSymbol = a.symbol?.toLowerCase() || "";
      const bSymbol = b.symbol?.toLowerCase() || "";
      const aName = a.name?.toLowerCase() || "";
      const bName = b.name?.toLowerCase() || "";
      // Exact symbol match (highest priority)
      if (aSymbol === normalizedQuery && bSymbol !== normalizedQuery) return -1;
      if (bSymbol === normalizedQuery && aSymbol !== normalizedQuery) return 1;
      // Symbol starts with query (second priority)
      const aStartsWith = aSymbol.startsWith(normalizedQuery);
      const bStartsWith = bSymbol.startsWith(normalizedQuery);
      if (aStartsWith && !bStartsWith) return -1;
      if (bStartsWith && !aStartsWith) return 1;
      // Symbol contains query (third priority)
      const aSymbolContains = aSymbol.includes(normalizedQuery);
      const bSymbolContains = bSymbol.includes(normalizedQuery);
      if (aSymbolContains && !bSymbolContains) return -1;
      if (bSymbolContains && !aSymbolContains) return 1;
      // Name contains query (fourth priority)
      const aNameContains = aName.includes(normalizedQuery);
      const bNameContains = bName.includes(normalizedQuery);
      if (aNameContains && !bNameContains) return -1;
      if (bNameContains && !aNameContains) return 1;
      // Alphabetical by symbol as final tiebreaker
      return aSymbol.localeCompare(bSymbol);
    });
    // Transform to our format
    const results = sortedAssets.slice(0, 50).map((asset)=>{
      // Map Alpaca asset class to valid type values
      let assetType = "EQUITY"; // Default
      if (asset.class === "crypto") {
        assetType = "CRYPTO";
      } else if (asset.class === "us_equity") {
        assetType = "us_equity";
      } else if (asset.class) {
        assetType = asset.class.toUpperCase();
      }
      return {
        symbol: asset.symbol,
        name: asset.name,
        exchange: asset.exchange,
        type: assetType,
        tradable: asset.tradable,
        marginable: asset.marginable,
        shortable: asset.shortable
      };
    });
    return c.json({
      ok: true,
      results,
      count: results.length
    });
  } catch (err) {
    return jsonErr(c, 500, "STOCK_SEARCH_FAILED", err);
  }
});
// Get latest quote for a stock/crypto
app.get("/quote/:symbol", async (c)=>{
  try {
    const symbol = c.req.param("symbol");
    const alpacaCredentials = await getAlpacaCredentials();
    if (!alpacaCredentials) {
      return jsonErr(c, 500, "ALPACA_NOT_CONFIGURED", "Alpaca API credentials not configured");
    }
    // Get latest trade/quote
    const url = `https://data.alpaca.markets/v2/stocks/${symbol}/quotes/latest`;
    const response = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": alpacaCredentials.apiKey,
        "APCA-API-SECRET-KEY": alpacaCredentials.apiSecret
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      return jsonErr(c, response.status, "ALPACA_QUOTE_ERROR", `Alpaca quote error: ${errorText}`);
    }
    const quoteData = await response.json();
    return c.json({
      ok: true,
      data: quoteData
    });
  } catch (err) {
    return jsonErr(c, 500, "QUOTE_FETCH_FAILED", err);
  }
});
// Get historical chart data for a stock/crypto
app.get("/chart/:symbol", async (c)=>{
  try {
    const symbol = c.req.param("symbol");
    const resolution = c.req.query("resolution") || "1d"; // 1d, 1w, 1m, 1y
    console.log(`📊 Chart request: symbol=${symbol}, resolution=${resolution}`);
    const alpacaCredentials = await getAlpacaCredentials();
    if (!alpacaCredentials) {
      console.error("❌ Alpaca credentials not configured");
      return c.json({
        ok: false,
        error: "Alpaca API credentials not configured. Please configure them in Data Providers.",
        detail: "ALPACA_NOT_CONFIGURED"
      }, 500);
    }
    // Map resolution to Alpaca timeframe and date range
    const now = new Date();
    const resolutionConfig = {
      "1d": {
        timeframe: "1Min",
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      "1w": {
        timeframe: "5Min",
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
      },
      "1m": {
        timeframe: "1Hour",
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 1 month ago
      },
      "1y": {
        timeframe: "1Day",
        start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) // 1 year ago
      }
    };
    const config = resolutionConfig[resolution] || resolutionConfig["1d"];
    // Format dates to ISO 8601 format (RFC3339)
    const startDate = config.start.toISOString();
    const endDate = now.toISOString();
    console.log(`📊 Fetching chart data for ${symbol}: ${config.timeframe} bars from ${startDate} to ${endDate}`);
    // Get bars from Alpaca with date range
    const url = `https://data.alpaca.markets/v2/stocks/${symbol}/bars?timeframe=${config.timeframe}&start=${startDate}&end=${endDate}&limit=10000&feed=iex`;
    const response = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": alpacaCredentials.apiKey,
        "APCA-API-SECRET-KEY": alpacaCredentials.apiSecret
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Alpaca bars error (${response.status}):`, errorText);
      return c.json({
        ok: false,
        error: `Failed to fetch chart data from Alpaca: ${response.status} ${response.statusText}`,
        detail: errorText
      }, response.status);
    }
    const barsData = await response.json();
    const bars = barsData.bars || [];
    console.log(`✅ Fetched ${bars.length} bars for ${symbol}`);
    if (bars.length === 0) {
      console.warn(`⚠️ No bars returned for ${symbol}`);
      return c.json({
        ok: false,
        error: `No chart data available for ${symbol}. This symbol may not be tradable or may not have historical data.`,
        bars: [],
        symbol,
        resolution,
        count: 0
      });
    }
    return c.json({
      ok: true,
      bars,
      symbol,
      resolution,
      count: bars.length
    });
  } catch (err) {
    console.error("❌ Chart fetch failed:", err);
    return c.json({
      ok: false,
      error: String(err),
      detail: "CHART_FETCH_FAILED"
    }, 500);
  }
});
// ============================================================================
// COINGECKO API INTEGRATION (Crypto Search)
// ============================================================================
// Search cryptocurrencies via CoinGecko API
app.get("/search/crypto", async (c)=>{
  try {
    const query = c.req.query("q");
    if (!query) {
      return jsonErr(c, 400, "INVALID_INPUT", "Query parameter 'q' is required");
    }
    const coinGeckoCredentials = await getCoinGeckoCredentials();
    if (!coinGeckoCredentials) {
      return jsonErr(c, 500, "COINGECKO_NOT_CONFIGURED", "CoinGecko API credentials not configured");
    }
    console.log(`🔍 Searching CoinGecko Demo API for: "${query}"`);
    // Use CoinGecko Demo API search endpoint
    const searchUrl = coinGeckoCredentials.apiKey ? `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}&x_cg_demo_api_key=${coinGeckoCredentials.apiKey}` : `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
    console.log(`🔍 CoinGecko search URL:`, searchUrl.replace(coinGeckoCredentials.apiKey || '', '***'));
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`❌ CoinGecko search error (${searchResponse.status}):`, errorText);
      return jsonErr(c, searchResponse.status, "COINGECKO_API_ERROR", `CoinGecko API error (${searchResponse.status}): ${errorText}`);
    }
    const searchData = await searchResponse.json();
    const coins = searchData.coins || [];
    console.log(`✅ Found ${coins.length} coins from CoinGecko search`);
    // Now fetch market data for the top results using coins/markets endpoint
    // Get coin IDs from search results (limit to top 50)
    const coinIds = coins.slice(0, 50).map((coin)=>coin.id).join(',');
    if (!coinIds) {
      return c.json({
        ok: true,
        results: [],
        count: 0
      });
    }
    // Fetch market data for these coins
    const marketsUrl = coinGeckoCredentials.apiKey ? `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&sparkline=false&x_cg_demo_api_key=${coinGeckoCredentials.apiKey}` : `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&sparkline=false`;
    console.log(`🔍 Fetching market data for ${coins.slice(0, 50).length} coins...`);
    const marketsResponse = await fetch(marketsUrl);
    if (!marketsResponse.ok) {
      const errorText = await marketsResponse.text();
      console.error(`❌ CoinGecko markets error (${marketsResponse.status}):`, errorText);
      // If markets endpoint fails, return search results without price data
      const results = coins.slice(0, 50).map((coin)=>({
          id: coin.id,
          symbol: coin.symbol?.toUpperCase(),
          name: coin.name,
          image: coin.large || coin.thumb,
          current_price: 0,
          market_cap: 0,
          market_cap_rank: coin.market_cap_rank || 9999,
          price_change_percentage_24h: 0
        }));
      return c.json({
        ok: true,
        results,
        count: results.length
      });
    }
    const marketsData = await marketsResponse.json();
    console.log(`✅ Fetched market data for ${marketsData.length} coins`);
    // Transform to our format with full market data
    const results = marketsData.map((coin)=>({
        id: coin.id,
        symbol: coin.symbol?.toUpperCase(),
        name: coin.name,
        image: coin.image,
        current_price: coin.current_price || 0,
        market_cap: coin.market_cap || 0,
        market_cap_rank: coin.market_cap_rank,
        price_change_percentage_24h: coin.price_change_percentage_24h || 0
      }));
    console.log(`✅ Returning ${results.length} crypto results for "${query}"`);
    return c.json({
      ok: true,
      results,
      count: results.length
    });
  } catch (err) {
    console.error(`❌ Crypto search failed:`, err);
    return jsonErr(c, 500, "CRYPTO_SEARCH_FAILED", String(err));
  }
});
// Get crypto price data from CoinGecko
app.get("/crypto-price/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const coinGeckoCredentials = await getCoinGeckoCredentials();
    if (!coinGeckoCredentials) {
      return jsonErr(c, 500, "COINGECKO_NOT_CONFIGURED", "CoinGecko API credentials not configured");
    }
    // Use CoinGecko Demo API
    const url = coinGeckoCredentials.apiKey ? `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&x_cg_demo_api_key=${coinGeckoCredentials.apiKey}` : `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      return jsonErr(c, response.status, "COINGECKO_PRICE_ERROR", `CoinGecko price error: ${errorText}`);
    }
    const data = await response.json();
    return c.json({
      ok: true,
      data: data[id] || null
    });
  } catch (err) {
    return jsonErr(c, 500, "CRYPTO_PRICE_FETCH_FAILED", err);
  }
});
// ============================================================================
// START SERVER
// ============================================================================
console.log(`[finance_dashboard] Ready at ${BUILD_ID}`);
Deno.serve(app.fetch);
