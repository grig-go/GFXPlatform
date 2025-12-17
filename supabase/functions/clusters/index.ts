import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
const app = new Hono();
// Middleware
app.use("*", cors({
  origin: "*",
  allowMethods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS"
  ],
  allowHeaders: [
    "Content-Type",
    "Authorization"
  ]
}));
app.use("*", logger(console.log));
// Health check (specific route - must come before /:id)
app.get("/health", (c)=>{
  return c.json({
    status: "ok",
    service: "clusters"
  });
});
// Get cluster statistics (specific route - must come before /:id)
app.get("/stats", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { count: totalClusters } = await supabase.from("news_clusters").select("*", {
      count: "exact",
      head: true
    });
    const { data: clusters } = await supabase.from("news_clusters").select("category, sentiment, article_count");
    const categoryCount = {};
    const sentimentCount = {};
    let totalArticles = 0;
    clusters?.forEach((cluster)=>{
      if (cluster.category) {
        categoryCount[cluster.category] = (categoryCount[cluster.category] || 0) + 1;
      }
      if (cluster.sentiment) {
        sentimentCount[cluster.sentiment] = (sentimentCount[cluster.sentiment] || 0) + 1;
      }
      totalArticles += cluster.article_count || 0;
    });
    return c.json({
      totalClusters: totalClusters || 0,
      totalArticles,
      byCategory: categoryCount,
      bySentiment: sentimentCount
    });
  } catch (error) {
    console.error("[CLUSTERS] Unexpected error fetching stats:", error);
    return c.json({
      error: "Internal server error",
      details: String(error)
    }, 500);
  }
});
// Bulk delete clusters (specific route - must come before /:id)
app.post("/bulk-delete", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const body = await c.req.json();
    const { ids } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({
        error: "Invalid or empty ids array"
      }, 400);
    }
    const { error } = await supabase.from("news_clusters").delete().in("id", ids);
    if (error) {
      console.error("[CLUSTERS] Error bulk deleting clusters:", error);
      return c.json({
        error: "Failed to delete clusters",
        details: error.message
      }, 500);
    }
    console.log("[CLUSTERS] Bulk delete successful:", ids.length, "clusters");
    return c.json({
      success: true,
      deleted: ids.length
    });
  } catch (error) {
    console.error("[CLUSTERS] Unexpected error bulk deleting:", error);
    return c.json({
      error: "Internal server error",
      details: String(error)
    }, 500);
  }
});
// Get all clusters with optional filtering (root route)
app.get("/", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const category = c.req.query("category");
    const sentiment = c.req.query("sentiment");
    const limit = parseInt(c.req.query("limit") || "100");
    const offset = parseInt(c.req.query("offset") || "0");
    let query = supabase.from("news_clusters").select("*", {
      count: "exact"
    }).order("created_at", {
      ascending: false
    }).range(offset, offset + limit - 1);
    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    if (sentiment && sentiment !== "all") {
      query = query.eq("sentiment", sentiment);
    }
    const { data: clusters, error, count } = await query;
    if (error) {
      console.error("[CLUSTERS] Error fetching clusters:", error);
      return c.json({
        error: "Failed to fetch clusters",
        details: error.message
      }, 500);
    }
    return c.json({
      clusters: clusters || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error("[CLUSTERS] Unexpected error fetching clusters:", error);
    return c.json({
      error: "Internal server error",
      details: String(error)
    }, 500);
  }
});
// Create new cluster (root route)
app.post("/", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const body = await c.req.json();
    const { title, description, keywords, category, sentiment, article_ids } = body;
    if (!title) {
      return c.json({
        error: "Title is required"
      }, 400);
    }
    const clusterData = {
      title,
      description: description || null,
      keywords: keywords || [],
      category: category || null,
      sentiment: sentiment || null,
      article_ids: article_ids || [],
      article_count: article_ids?.length || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data: cluster, error } = await supabase.from("news_clusters").insert([
      clusterData
    ]).select().single();
    if (error) {
      console.error("[CLUSTERS] Error creating cluster:", error);
      return c.json({
        error: "Failed to create cluster",
        details: error.message
      }, 500);
    }
    console.log("[CLUSTERS] Cluster created successfully:", cluster.id);
    return c.json({
      cluster
    }, 201);
  } catch (error) {
    console.error("[CLUSTERS] Unexpected error creating cluster:", error);
    return c.json({
      error: "Internal server error",
      details: String(error)
    }, 500);
  }
});
// Get single cluster by ID (parameterized route - must come AFTER specific routes)
app.get("/:id", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const id = c.req.param("id");
    const { data: cluster, error } = await supabase.from("news_clusters").select("*").eq("id", id).single();
    if (error) {
      console.error("[CLUSTERS] Error fetching cluster:", error);
      return c.json({
        error: "Failed to fetch cluster",
        details: error.message
      }, 500);
    }
    if (!cluster) {
      return c.json({
        error: "Cluster not found"
      }, 404);
    }
    return c.json({
      cluster
    });
  } catch (error) {
    console.error("[CLUSTERS] Unexpected error fetching cluster:", error);
    return c.json({
      error: "Internal server error",
      details: String(error)
    }, 500);
  }
});
// Update cluster (parameterized route - must come AFTER specific routes)
app.put("/:id", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const id = c.req.param("id");
    const body = await c.req.json();
    const { title, description, keywords, category, sentiment, article_ids } = body;
    const updateData = {
      updated_at: new Date().toISOString()
    };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (category !== undefined) updateData.category = category;
    if (sentiment !== undefined) updateData.sentiment = sentiment;
    if (article_ids !== undefined) {
      updateData.article_ids = article_ids;
      updateData.article_count = article_ids.length;
    }
    const { data: cluster, error } = await supabase.from("news_clusters").update(updateData).eq("id", id).select().single();
    if (error) {
      console.error("[CLUSTERS] Error updating cluster:", error);
      return c.json({
        error: "Failed to update cluster",
        details: error.message
      }, 500);
    }
    if (!cluster) {
      return c.json({
        error: "Cluster not found"
      }, 404);
    }
    console.log("[CLUSTERS] Cluster updated successfully:", id);
    return c.json({
      cluster
    });
  } catch (error) {
    console.error("[CLUSTERS] Unexpected error updating cluster:", error);
    return c.json({
      error: "Internal server error",
      details: String(error)
    }, 500);
  }
});
// Delete cluster (parameterized route - must come AFTER specific routes)
app.delete("/:id", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const id = c.req.param("id");
    const { error } = await supabase.from("news_clusters").delete().eq("id", id);
    if (error) {
      console.error("[CLUSTERS] Error deleting cluster:", error);
      return c.json({
        error: "Failed to delete cluster",
        details: error.message
      }, 500);
    }
    console.log("[CLUSTERS] Cluster deleted successfully:", id);
    return c.json({
      success: true,
      message: "Cluster deleted"
    });
  } catch (error) {
    console.error("[CLUSTERS] Unexpected error deleting cluster:", error);
    return c.json({
      error: "Internal server error",
      details: String(error)
    }, 500);
  }
});
Deno.serve(app.fetch);
