import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-58b4ce0e/health", (c) => {
  return c.json({ status: "ok" });
});

// Templates endpoints
app.get("/make-server-58b4ce0e/templates", async (c) => {
  try {
    const templates = await kv.get("templates");
    if (!templates) {
      // Return default templates if none exist
      return c.json([]);
    }
    return c.json(templates);
  } catch (error) {
    console.log("Error fetching templates:", error);
    return c.json({ error: "Failed to fetch templates" }, 500);
  }
});

app.post("/make-server-58b4ce0e/templates", async (c) => {
  try {
    const templates = await c.req.json();
    await kv.set("templates", templates);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error saving templates:", error);
    return c.json({ error: "Failed to save templates" }, 500);
  }
});

// Content tree endpoints
app.get("/make-server-58b4ce0e/content", async (c) => {
  try {
    const content = await kv.get("content");
    if (!content) {
      return c.json([]);
    }
    return c.json(content);
  } catch (error) {
    console.log("Error fetching content:", error);
    return c.json({ error: "Failed to fetch content" }, 500);
  }
});

app.post("/make-server-58b4ce0e/content", async (c) => {
  try {
    const content = await c.req.json();
    await kv.set("content", content);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error saving content:", error);
    return c.json({ error: "Failed to save content" }, 500);
  }
});

// Schedule endpoints
app.get("/make-server-58b4ce0e/schedule", async (c) => {
  try {
    const schedule = await kv.get("schedule");
    if (!schedule) {
      return c.json([]);
    }
    return c.json(schedule);
  } catch (error) {
    console.log("Error fetching schedule:", error);
    return c.json({ error: "Failed to fetch schedule" }, 500);
  }
});

app.post("/make-server-58b4ce0e/schedule", async (c) => {
  try {
    const schedule = await c.req.json();
    await kv.set("schedule", schedule);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error saving schedule:", error);
    return c.json({ error: "Failed to save schedule" }, 500);
  }
});

// Channels endpoints
app.get("/make-server-58b4ce0e/channels", async (c) => {
  try {
    const channels = await kv.get("channels");
    if (!channels) {
      return c.json([]);
    }
    return c.json(channels);
  } catch (error) {
    console.log("Error fetching channels:", error);
    return c.json({ error: "Failed to fetch channels" }, 500);
  }
});

app.post("/make-server-58b4ce0e/channels", async (c) => {
  try {
    const channels = await c.req.json();
    await kv.set("channels", channels);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error saving channels:", error);
    return c.json({ error: "Failed to save channels" }, 500);
  }
});

app.post("/make-server-58b4ce0e/channels/create", async (c) => {
  try {
    const newChannel = await c.req.json();
    const channels = await kv.get("channels") || [];
    const channelWithId = {
      id: crypto.randomUUID(),
      ...newChannel,
      createdAt: new Date().toISOString(),
    };
    channels.push(channelWithId);
    await kv.set("channels", channels);
    return c.json({ success: true, channel: channelWithId });
  } catch (error) {
    console.log("Error creating channel:", error);
    return c.json({ error: "Failed to create channel" }, 500);
  }
});

app.post("/make-server-58b4ce0e/channels/update", async (c) => {
  try {
    const updatedChannel = await c.req.json();
    const channels = await kv.get("channels") || [];
    const index = channels.findIndex((ch: any) => ch.id === updatedChannel.id);
    if (index === -1) {
      return c.json({ error: "Channel not found" }, 404);
    }
    channels[index] = { ...channels[index], ...updatedChannel, updatedAt: new Date().toISOString() };
    await kv.set("channels", channels);
    return c.json({ success: true, channel: channels[index] });
  } catch (error) {
    console.log("Error updating channel:", error);
    return c.json({ error: "Failed to update channel" }, 500);
  }
});

app.post("/make-server-58b4ce0e/channels/delete", async (c) => {
  try {
    const { id } = await c.req.json();
    const channels = await kv.get("channels") || [];
    const filteredChannels = channels.filter((ch: any) => ch.id !== id);
    await kv.set("channels", filteredChannels);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting channel:", error);
    return c.json({ error: "Failed to delete channel" }, 500);
  }
});

app.post("/make-server-58b4ce0e/fetch-proxy", async (c) => {
  try {
    const { url, method = 'GET', headers = {}, body } = await c.req.json();

    if (!url) {
      return c.json({ error: 'Missing url parameter' }, 400);
    }

    // Make the proxied request
    const proxyResponse = await fetch(url, {
      method,
      headers: {
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await proxyResponse.text();
    let parsedData;

    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    return c.json({
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      data: parsedData,
      headers: Object.fromEntries(proxyResponse.headers.entries()),
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

Deno.serve(app.fetch);