import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

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
app.get("/health", (c) => {
  return c.json({ status: "ok", message: "Server function is active. Map data routes are in /map_data function." });
});

// Redirect endpoint to inform users of the new structure
app.all("*", (c) => {
  return c.json({ 
    error: "Route not found in server function", 
    message: "All map and data routes have been moved to the map_data function. Please update your API calls to use /functions/v1/map_data/ instead of /functions/v1/make-server-a366c887/",
    requestedPath: c.req.path,
    correctBasePath: "/functions/v1/map_data"
  }, 404);
});

Deno.serve(app.fetch);
