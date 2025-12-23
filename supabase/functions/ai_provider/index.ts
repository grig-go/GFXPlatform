import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const BUILD_ID = new Date().toISOString();
console.log("[ai_provider] boot", BUILD_ID);

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// CORS configuration
const corsHeaders = {
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
};

// Enable CORS for all routes
app.use("/*", cors(corsHeaders));

// Health check endpoint
app.get("/ai_provider/health", (c) => {
  return c.json({
    status: "ok",
    build: BUILD_ID
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Mask API key for safe display (show first 3 and last 4 characters)
 */
function maskApiKey(apiKey: string | null | undefined): string {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '••••';
  return `${apiKey.slice(0, 3)}•••${apiKey.slice(-4)}`;
}

/**
 * Format AI provider data for safe client response (masks API keys)
 */
function formatAIProvider(provider: any) {
  return {
    id: provider.id,
    name: provider.name,
    providerName: provider.provider_name,
    type: provider.type,
    description: provider.description || "",
    apiKeyMasked: maskApiKey(provider.api_key),
    apiSecretMasked: provider.api_secret ? maskApiKey(provider.api_secret) : undefined,
    apiKeyConfigured: !!provider.api_key,
    apiSecretConfigured: !!provider.api_secret,
    endpoint: provider.endpoint || "",
    model: provider.model || "",
    availableModels: provider.available_models || [],
    enabled: provider.enabled ?? true,
    rateLimitPerMinute: provider.rate_limit_per_minute,
    maxTokens: provider.max_tokens,
    temperature: provider.temperature,
    topP: provider.top_p,
    dashboardAssignments: provider.dashboard_assignments || [],
    createdAt: provider.created_at,
    updatedAt: provider.updated_at
  };
}

/**
 * Safe JSON parsing helper for Hono/Deno requests
 */
async function safeJson(c: any) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

/**
 * Error response helper with logging
 */
function jsonErr(c: any, status: number, code: string, detail?: any) {
  console.error(`[${code}]`, detail ?? '');
  return c.json({
    ok: false,
    error: code,
    detail: String(detail ?? '')
  }, status);
}

/**
 * Sleep utility for rate limiting
 */
const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Get user's organization ID from JWT token
 * Returns null if token is invalid or user has no organization
 */
async function getUserOrganizationId(c: any): Promise<string | null> {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.replace("Bearer ", "");

    // Create a client with the user's token to get their info
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` }
        }
      }
    );

    // Get the user's info
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.warn("[getUserOrganizationId] Auth error:", authError?.message);
      return null;
    }

    // Get the user's organization from the u_users table (auth_user_id links to auth.uid())
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userError } = await serviceSupabase
      .from("u_users")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !userData) {
      console.warn("[getUserOrganizationId] User lookup error:", userError?.message);
      return null;
    }

    return userData.organization_id;
  } catch (err) {
    console.warn("[getUserOrganizationId] Error:", err);
    return null;
  }
}

// ============================================================================
// AI PROVIDER INITIALIZATION
// ============================================================================

app.post("/ai_provider/initialize", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if Claude provider exists
    const { data: existingClaude } = await supabase
      .from("ai_providers")
      .select("id")
      .eq("id", "claude-default")
      .single();

    if (!existingClaude) {
      console.log("Initializing default Claude AI provider...");
      const claudeApiKey = "";

      let availableModels: any[] = [
        {
          id: 'claude-3-7-sonnet-20250219',
          name: 'Claude 3.7 Sonnet',
          description: 'Latest Claude model with enhanced capabilities',
          contextWindow: 200000,
          capabilities: ['text', 'vision']
        },
        {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          description: 'Advanced reasoning and multimodal model',
          contextWindow: 200000,
          capabilities: ['text', 'vision']
        },
        {
          id: 'claude-3-5-haiku-20241022',
          name: 'Claude 3.5 Haiku',
          description: 'Fast and efficient model',
          contextWindow: 200000,
          capabilities: ['text', 'vision']
        }
      ];

      await supabase.from("ai_providers").insert({
        id: "claude-default",
        name: "Anthropic Claude (Production)",
        provider_name: "claude",
        type: "multimodal",
        description: "Anthropic Claude AI for advanced text and vision tasks",
        api_key: claudeApiKey,
        endpoint: "https://api.anthropic.com/v1",
        model: availableModels[0]?.id || "claude-3-7-sonnet-20250219",
        available_models: availableModels,
        enabled: true,
        dashboard_assignments: []
      });
      console.log("✓ Default Claude AI provider initialized");
    } else {
      console.log("✓ Claude AI provider already exists");
    }

    // Initialize Gemini if not exists
    const { data: existingGemini } = await supabase
      .from("ai_providers")
      .select("id")
      .eq("id", "gemini-default")
      .single();

    if (!existingGemini) {
      console.log("Initializing default Gemini AI provider...");

      await supabase.from("ai_providers").insert({
        id: "gemini-default",
        name: "Google Gemini (Production)",
        provider_name: "gemini",
        type: "multimodal",
        description: "Google Gemini AI for text, image, and video generation",
        api_key: "",
        endpoint: "https://generativelanguage.googleapis.com/v1beta",
        model: "gemini-2.0-flash-exp",
        available_models: [
          {
            id: 'gemini-2.0-flash-exp',
            name: 'Gemini 2.0 Flash (Experimental)',
            description: 'Latest experimental multimodal model',
            contextWindow: 1048576,
            capabilities: ['text', 'image', 'video']
          },
          {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            description: 'Advanced reasoning and multimodal model',
            contextWindow: 2097152,
            capabilities: ['text', 'image', 'video']
          }
        ],
        enabled: true,
        dashboard_assignments: []
      });
      console.log("✓ Default Gemini AI provider initialized");
    } else {
      console.log("✓ Gemini AI provider already exists");
    }

    // Initialize OpenAI if not exists
    const { data: existingOpenAI } = await supabase
      .from("ai_providers")
      .select("id")
      .eq("id", "openai-default")
      .single();

    if (!existingOpenAI) {
      console.log("Initializing default OpenAI provider...");

      await supabase.from("ai_providers").insert({
        id: "openai-default",
        name: "OpenAI GPT (Production)",
        provider_name: "openai",
        type: "multimodal",
        description: "OpenAI GPT models for text and vision tasks",
        api_key: "",
        endpoint: "https://api.openai.com/v1",
        model: "gpt-4o",
        available_models: [
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            description: 'Most capable multimodal model',
            contextWindow: 128000,
            capabilities: ['text', 'vision']
          },
          {
            id: 'gpt-4-turbo',
            name: 'GPT-4 Turbo',
            description: 'Fast and capable model',
            contextWindow: 128000,
            capabilities: ['text', 'vision']
          }
        ],
        enabled: true,
        dashboard_assignments: []
      });
      console.log("✓ Default OpenAI provider initialized");
    } else {
      console.log("✓ OpenAI provider already exists");
    }

    // ========================================================================
    // PULSAR VS SPECIFIC PROVIDERS
    // ========================================================================

    // Initialize Pulsar VS Text provider (Gemini for text generation)
    const { data: existingPulsarVSText } = await supabase.from("ai_providers").select("id").eq("id", "gemini").single();
    if (!existingPulsarVSText) {
      console.log("Initializing Pulsar VS Text provider (Gemini)...");
      await supabase.from("ai_providers").insert({
        id: "gemini",
        name: "Gemini (Text Generation)",
        provider_name: "gemini",
        type: "text",
        description: "Google Gemini for text generation and AI responses in Pulsar VS",
        api_key: "",
        endpoint: "https://generativelanguage.googleapis.com/v1beta",
        model: "gemini-2.5-flash-lite",
        available_models: [
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast and capable' },
          { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Lightweight and fast' },
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable' },
          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Previous generation fast' },
          { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Previous generation lite' }
        ],
        enabled: true,
        dashboard_assignments: ['pulsar-vs-text']
      });
      console.log("✓ Pulsar VS Text provider initialized");
    } else {
      // Update existing to ensure dashboard assignment
      await supabase.from("ai_providers").update({
        dashboard_assignments: ['pulsar-vs-text'],
        available_models: [
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast and capable' },
          { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Lightweight and fast' },
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable' },
          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Previous generation fast' },
          { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Previous generation lite' }
        ]
      }).eq("id", "gemini");
      console.log("✓ Pulsar VS Text provider updated");
    }

    // Initialize Pulsar VS Image Gen provider (Imagen)
    const { data: existingPulsarVSImageGen } = await supabase.from("ai_providers").select("id").eq("id", "imagen").single();
    if (!existingPulsarVSImageGen) {
      console.log("Initializing Pulsar VS Image Gen provider (Imagen)...");
      await supabase.from("ai_providers").insert({
        id: "imagen",
        name: "Imagen (Image Generation)",
        provider_name: "imagen",
        type: "image-generation",
        description: "Google Imagen for backdrop and image generation in Pulsar VS",
        api_key: "",
        endpoint: "https://generativelanguage.googleapis.com/v1beta",
        model: "imagen-4.0-fast-generate-001",
        available_models: [
          { id: 'imagen-4.0-generate-001', name: 'Imagen 4.0', description: 'Latest generation model' },
          { id: 'imagen-4.0-fast-generate-001', name: 'Imagen 4.0 Fast', description: 'Fast generation' },
          { id: 'imagen-4.0-ultra-generate-001', name: 'Imagen 4.0 Ultra', description: 'Highest quality' },
          { id: 'imagen-3.0-generate-002', name: 'Imagen 3.0', description: 'Previous generation' }
        ],
        enabled: true,
        dashboard_assignments: ['pulsar-vs-image-gen']
      });
      console.log("✓ Pulsar VS Image Gen provider initialized");
    } else {
      // Update existing to ensure dashboard assignment
      await supabase.from("ai_providers").update({
        dashboard_assignments: ['pulsar-vs-image-gen'],
        available_models: [
          { id: 'imagen-4.0-generate-001', name: 'Imagen 4.0', description: 'Latest generation model' },
          { id: 'imagen-4.0-fast-generate-001', name: 'Imagen 4.0 Fast', description: 'Fast generation' },
          { id: 'imagen-4.0-ultra-generate-001', name: 'Imagen 4.0 Ultra', description: 'Highest quality' },
          { id: 'imagen-3.0-generate-002', name: 'Imagen 3.0', description: 'Previous generation' }
        ]
      }).eq("id", "imagen");
      console.log("✓ Pulsar VS Image Gen provider updated");
    }

    // Initialize Pulsar VS Image Edit provider (Gemini for image editing)
    const { data: existingPulsarVSImageEdit } = await supabase.from("ai_providers").select("id").eq("id", "gemini-image-edit").single();
    if (!existingPulsarVSImageEdit) {
      console.log("Initializing Pulsar VS Image Edit provider...");
      await supabase.from("ai_providers").insert({
        id: "gemini-image-edit",
        name: "Gemini (Image Editing)",
        provider_name: "gemini",
        type: "image-edit",
        description: "Google Gemini for image editing and inpainting in Pulsar VS",
        api_key: "",
        endpoint: "https://generativelanguage.googleapis.com/v1beta",
        model: "gemini-3-pro-image-preview",
        available_models: [
          { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro (Gemini 3 Pro)', description: 'Professional quality image editing with complex instructions' },
          { id: 'gemini-2.5-flash-image', name: 'Nano Banana (Gemini 2.5 Flash)', description: 'Fast image editing optimized for speed' }
        ],
        enabled: true,
        dashboard_assignments: ['pulsar-vs-image-edit']
      });
      console.log("✓ Pulsar VS Image Edit provider initialized");
    } else {
      // Update existing to ensure dashboard assignment and correct models
      await supabase.from("ai_providers").update({
        dashboard_assignments: ['pulsar-vs-image-edit'],
        model: "gemini-3-pro-image-preview",
        available_models: [
          { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro (Gemini 3 Pro)', description: 'Professional quality image editing with complex instructions' },
          { id: 'gemini-2.5-flash-image', name: 'Nano Banana (Gemini 2.5 Flash)', description: 'Fast image editing optimized for speed' }
        ]
      }).eq("id", "gemini-image-edit");
      console.log("✓ Pulsar VS Image Edit provider updated");
    }

    return c.json({
      ok: true,
      success: true,
      message: "AI providers initialized successfully"
    });
  } catch (error) {
    console.error("Error initializing AI providers:", error);
    return c.json({
      error: "Failed to initialize AI providers",
      details: String(error)
    }, 500);
  }
});

// ============================================================================
// FETCH MODELS FROM AI PROVIDER API
// ============================================================================

app.post("/ai_provider/fetch-models", async (c) => {
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const { providerName, apiKey, endpoint } = body;

  console.log('🔍 Fetching models for provider:', providerName);

  if (!providerName || !apiKey) {
    return jsonErr(c, 400, 'MISSING_REQUIRED_FIELDS', 'providerName and apiKey are required');
  }

  try {
    let models: any[] = [];

    switch (providerName.toLowerCase()) {
      case 'claude':
        {
          console.log('📡 Fetching Claude models...');
          const response = await fetch('https://api.anthropic.com/v1/models', {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            signal: AbortSignal.timeout(10000)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Claude API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          models = data.data.map((m: any) => ({
            id: m.id,
            name: m.display_name || m.id,
            description: m.created_at ? `Created: ${new Date(m.created_at).toLocaleDateString()}` : '',
            contextWindow: m.max_tokens || 200000,
            capabilities: ['text', 'vision']
          }));
          break;
        }

      case 'openai':
        {
          console.log('📡 Fetching OpenAI models...');
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          const gptModels = data.data.filter((m: any) => m.id.includes('gpt'));
          models = gptModels.map((m: any) => ({
            id: m.id,
            name: m.id.toUpperCase(),
            description: `Created: ${new Date(m.created * 1000).toLocaleDateString()}`,
            contextWindow: 128000,
            capabilities: m.id.includes('vision') || m.id.includes('gpt-4') ? ['text', 'vision'] : ['text']
          }));
          break;
        }

      case 'gemini':
        {
          console.log('📡 Fetching Gemini models from API...');
          // Try to fetch from Google API first
          const geminiEndpoint = endpoint || 'https://generativelanguage.googleapis.com/v1beta';
          try {
            const response = await fetch(`${geminiEndpoint}/models?key=${apiKey}`, {
              signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
              const data = await response.json();
              // Filter to only include generative models (not embedding models)
              const generativeModels = (data.models || []).filter((m: any) =>
                m.name?.includes('gemini') &&
                m.supportedGenerationMethods?.includes('generateContent')
              );

              models = generativeModels.map((m: any) => {
                const modelId = m.name.replace('models/', '');
                return {
                  id: modelId,
                  name: m.displayName || modelId,
                  description: m.description || '',
                  contextWindow: m.inputTokenLimit || 1000000,
                  capabilities: ['text', 'image', 'video']
                };
              });

              // Sort by name descending to show newest first
              models.sort((a: any, b: any) => b.id.localeCompare(a.id));
              console.log(`✅ Fetched ${models.length} Gemini models from API`);
            } else {
              throw new Error(`Gemini API error: ${response.status}`);
            }
          } catch (fetchError) {
            console.warn('⚠️ Failed to fetch Gemini models from API, using predefined list:', fetchError);
            // Fallback to predefined list if API fetch fails
            models = [
              {
                id: 'gemini-2.5-pro-preview-06-05',
                name: 'Gemini 2.5 Pro Preview',
                description: 'Latest Gemini 2.5 Pro with enhanced capabilities',
                contextWindow: 1048576,
                capabilities: ['text', 'image', 'video']
              },
              {
                id: 'gemini-2.0-flash',
                name: 'Gemini 2.0 Flash',
                description: 'Fast and efficient Gemini 2.0 model',
                contextWindow: 1048576,
                capabilities: ['text', 'image', 'video']
              },
              {
                id: 'gemini-2.0-flash-exp',
                name: 'Gemini 2.0 Flash (Experimental)',
                description: 'Experimental multimodal model',
                contextWindow: 1048576,
                capabilities: ['text', 'image', 'video']
              },
              {
                id: 'gemini-1.5-pro',
                name: 'Gemini 1.5 Pro',
                description: 'Advanced reasoning and multimodal model',
                contextWindow: 2097152,
                capabilities: ['text', 'image', 'video']
              },
              {
                id: 'gemini-1.5-flash',
                name: 'Gemini 1.5 Flash',
                description: 'Fast and efficient model',
                contextWindow: 1048576,
                capabilities: ['text', 'image', 'video']
              }
            ];
          }
          break;
        }

      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }

    console.log(`✅ Found ${models.length} models for ${providerName}`);

    return c.json({
      ok: true,
      models,
      count: models.length
    });

  } catch (error: any) {
    console.error('❌ Error fetching models:', error);
    return jsonErr(c, 500, 'MODEL_FETCH_FAILED', error.message || String(error));
  }
});

// ============================================================================
// AI PROVIDER CRUD ROUTES
// ============================================================================

// Get providers by dashboard assignment (e.g., pulsar-vs, nova-gfx)
// Optional query params: ?type=text|image|video|imageEdit to filter by provider type
// Filters by user's organization (or returns global providers if org_id is null)
app.get("/ai_provider/providers/by-dashboard/:dashboard", async (c) => {
  try {
    const dashboard = c.req.param("dashboard");
    const providerType = c.req.query("type"); // text, image, video, imageEdit

    // Get user's organization ID for filtering
    const organizationId = await getUserOrganizationId(c);
    console.log("🔍 Fetching providers for dashboard:", dashboard, "type:", providerType || "all", "org:", organizationId || "global");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build query - filter by organization or global (null org_id)
    let query = supabase
      .from("ai_providers")
      .select("*")
      .eq("enabled", true);

    // Filter by organization: show org-specific providers OR global providers (org_id is null)
    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    } else {
      // If no org ID (anonymous), only show global providers
      query = query.is("organization_id", null);
    }

    const { data, error } = await query.order("name");

    if (error) {
      console.error("Error fetching providers by dashboard:", error);
      return jsonErr(c, 500, 'AI_PROVIDERS_FETCH_FAILED', error.message);
    }

    // Filter providers that match the dashboard assignment
    const filteredData = (data || []).filter((provider: any) => {
      const assignments = provider.dashboard_assignments;
      if (!assignments || !Array.isArray(assignments)) return false;

      return assignments.some((assignment: any) => {
        // Handle string format: ["nova-gfx-text", "nova-gfx-image"]
        if (typeof assignment === 'string') {
          // If a type is specified, match dashboard-type pattern
          if (providerType) {
            return assignment === `${dashboard}-${providerType}`;
          }
          // Otherwise match any assignment starting with dashboard
          return assignment === dashboard || assignment.startsWith(`${dashboard}-`);
        }
        // Handle object format: [{"dashboard": "nova-gfx", "textProvider": true, "imageProvider": true}]
        if (typeof assignment === 'object' && assignment.dashboard) {
          if (assignment.dashboard !== dashboard) return false;
          // If a type is specified, check the corresponding provider flag
          if (providerType) {
            const typeMap: Record<string, string> = {
              text: 'textProvider',
              image: 'imageProvider',
              video: 'videoProvider',
              imageEdit: 'imageEditProvider'
            };
            const flagKey = typeMap[providerType];
            return flagKey ? assignment[flagKey] === true : false;
          }
          // Otherwise return true if any provider type is enabled
          return assignment.textProvider || assignment.imageProvider || assignment.videoProvider || assignment.imageEditProvider;
        }
        return false;
      });
    });

    const providers = filteredData.map(formatAIProvider);
    console.log(`✅ Found ${providers.length} providers for dashboard: ${dashboard}, type: ${providerType || "all"}, org: ${organizationId || "global"}`);
    return c.json({
      ok: true,
      dashboard,
      type: providerType || null,
      organizationId: organizationId || null,
      providers
    });
  } catch (error) {
    return jsonErr(c, 500, 'AI_PROVIDERS_FETCH_FAILED', error);
  }
});

// List AI providers (masks sensitive fields in response)
app.get("/ai_provider/providers", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("ai_providers")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching AI providers:", error);
      return jsonErr(c, 500, 'AI_PROVIDERS_FETCH_FAILED', error.message);
    }

    const providers = (data || []).map(formatAIProvider);

    return c.json({
      ok: true,
      providers
    });
  } catch (error) {
    return jsonErr(c, 500, 'AI_PROVIDERS_FETCH_FAILED', error);
  }
});

// Create AI provider
app.post("/ai_provider/providers", async (c) => {
  try {
    const body = await safeJson(c);
    console.log("📝 Creating AI provider:", {
      name: body.name,
      providerName: body.providerName
    });

    // Get user's organization ID to auto-assign
    const organizationId = await getUserOrganizationId(c);
    console.log("📝 Auto-assigning to organization:", organizationId || "none (global)");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate ID from provider name and timestamp
    const timestamp = Date.now();
    const providerId = `${body.providerName.toLowerCase()}-${timestamp}`;

    const newProvider: any = {
      id: providerId,
      name: body.name,
      provider_name: body.providerName,
      type: body.type || 'multimodal',
      description: body.description || '',
      api_key: body.apiKey || '',
      api_secret: body.apiSecret,
      endpoint: body.endpoint || '',
      model: body.model || '',
      available_models: body.availableModels || [],
      enabled: body.enabled ?? true,
      rate_limit_per_minute: body.rateLimitPerMinute,
      max_tokens: body.maxTokens,
      temperature: body.temperature,
      top_p: body.topP,
      dashboard_assignments: body.dashboardAssignments || []
    };

    // Auto-assign organization if user is authenticated
    if (organizationId) {
      newProvider.organization_id = organizationId;
    }

    const { data, error } = await supabase
      .from("ai_providers")
      .insert(newProvider)
      .select()
      .single();

    if (error) {
      console.error("❌ Database error creating AI provider:", error);
      return jsonErr(c, 500, 'AI_PROVIDER_CREATE_FAILED', error.message);
    }

    console.log("✅ AI provider created successfully:", data.id);
    return c.json({
      ok: true,
      provider: formatAIProvider(data)
    });
  } catch (error) {
    console.error("❌ Unexpected error creating AI provider:", error);
    return jsonErr(c, 500, 'AI_PROVIDER_CREATE_FAILED', error);
  }
});

// Update AI provider
app.put("/ai_provider/providers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await safeJson(c);
    console.log("🔄 Updating AI provider:", id);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.apiKey !== undefined) updates.api_key = body.apiKey;
    if (body.apiSecret !== undefined) updates.api_secret = body.apiSecret;
    if (body.endpoint !== undefined) updates.endpoint = body.endpoint;
    if (body.model !== undefined) updates.model = body.model;
    if (body.availableModels !== undefined) updates.available_models = body.availableModels;
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.rateLimitPerMinute !== undefined) updates.rate_limit_per_minute = body.rateLimitPerMinute;
    if (body.maxTokens !== undefined) updates.max_tokens = body.maxTokens;
    if (body.temperature !== undefined) updates.temperature = body.temperature;
    if (body.topP !== undefined) updates.top_p = body.topP;
    if (body.dashboardAssignments !== undefined) updates.dashboard_assignments = body.dashboardAssignments;

    const { data, error } = await supabase
      .from("ai_providers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Database error updating AI provider:", error);
      return jsonErr(c, 500, 'AI_PROVIDER_UPDATE_FAILED', error.message);
    }

    console.log("✅ AI provider updated successfully");
    return c.json({
      ok: true,
      provider: formatAIProvider(data)
    });
  } catch (error) {
    console.error("❌ Unexpected error updating AI provider:", error);
    return jsonErr(c, 500, 'AI_PROVIDER_UPDATE_FAILED', error);
  }
});

// Delete AI provider
app.delete("/ai_provider/providers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log("🗑️ Deleting AI provider from database:", id);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if provider exists first
    const { data: existing } = await supabase
      .from("ai_providers")
      .select("id")
      .eq("id", id)
      .single();

    if (!existing) {
      return jsonErr(c, 404, 'AI_PROVIDER_NOT_FOUND', id);
    }

    const { error } = await supabase
      .from("ai_providers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("❌ Database error deleting AI provider:", error);
      return jsonErr(c, 500, 'AI_PROVIDER_DELETE_FAILED', error.message);
    }

    console.log("✅ AI provider deleted successfully");
    return c.json({ ok: true, success: true });
  } catch (error) {
    console.error("❌ Unexpected error deleting AI provider:", error);
    return jsonErr(c, 500, 'AI_PROVIDER_DELETE_FAILED', error);
  }
});

// Reveal both API key and secret (return full unmasked credentials)
app.post("/ai_provider/providers/:id/reveal", async (c) => {
  try {
    const id = c.req.param("id");
    console.log("🔓 Revealing credentials for AI provider:", id);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("ai_providers")
      .select("api_key, api_secret")
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ Database error revealing credentials:", error);
      return jsonErr(c, 500, 'AI_CREDENTIALS_REVEAL_FAILED', error.message);
    }

    if (!data) {
      return jsonErr(c, 404, 'AI_PROVIDER_NOT_FOUND', id);
    }

    return c.json({
      ok: true,
      apiKey: data.api_key || '',
      apiSecret: data.api_secret || ''
    });
  } catch (error) {
    console.error("❌ Unexpected error revealing credentials:", error);
    return jsonErr(c, 500, 'AI_CREDENTIALS_REVEAL_FAILED', error);
  }
});

// ============================================================================
// AI CHAT ENDPOINT
// ============================================================================

app.post("/ai_provider/chat", async (c) => {
  try {
    const body = await safeJson(c);
    const { providerId, message, context, dashboard } = body;

    if (!providerId || !message) {
      return jsonErr(c, 400, 'AI_CHAT_INVALID_INPUT', 'providerId and message are required');
    }

    console.log(`💬 AI Chat request: provider=${providerId}, dashboard=${dashboard}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch provider details
    const { data: provider, error: providerError } = await supabase
      .from("ai_providers")
      .select("*")
      .eq("id", providerId)
      .single();

    if (providerError || !provider) {
      return jsonErr(c, 404, 'AI_PROVIDER_NOT_FOUND', providerId);
    }

    if (!provider.enabled) {
      return jsonErr(c, 400, 'AI_PROVIDER_DISABLED', 'This AI provider is disabled');
    }

    let response: any;

    // Call the appropriate AI API based on provider
    switch (provider.provider_name.toLowerCase()) {
      case 'claude':
        {
          console.log('🤖 Calling Claude API...');
          const apiResponse = await fetch(`${provider.endpoint}/messages`, {
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
                  content: context ? `${context}\n\n${message}` : message
                }
              ]
            }),
            signal: AbortSignal.timeout(30000)
          });

          if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`Claude API error: ${apiResponse.status} - ${errorText}`);
          }

          const data = await apiResponse.json();
          response = data.content[0].text;
          break;
        }

      case 'openai':
        {
          console.log('🤖 Calling OpenAI API...');
          // Use higher token limit for elections dashboard (synthetic scenarios need ~100K tokens)
          const isElections = dashboard === 'elections';
          const maxTokens = isElections ? 100000 : (provider.max_tokens || 4096);
          const timeout = isElections ? 300000 : 30000; // 5 minutes for elections
          const useStreaming = isElections; // Use streaming for elections to get full response

          console.log(`📊 Using max_tokens=${maxTokens}, timeout=${timeout}ms, streaming=${useStreaming} for dashboard=${dashboard}`);

          const apiResponse = await fetch(`${provider.endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${provider.api_key}`
            },
            body: JSON.stringify({
              model: provider.model,
              max_tokens: maxTokens,
              temperature: provider.temperature || 0.7,
              stream: useStreaming,
              messages: [
                {
                  role: 'user',
                  content: context ? `${context}\n\n${message}` : message
                }
              ]
            }),
            signal: AbortSignal.timeout(timeout)
          });

          if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`OpenAI API error: ${apiResponse.status} - ${errorText}`);
          }

          if (useStreaming) {
            // Handle streaming response using Deno-compatible approach
            console.log('📡 Processing streaming response with getReader()...');
            let fullContent = '';
            let chunkCount = 0;

            const reader = apiResponse.body?.getReader();
            if (!reader) {
              throw new Error('No response body for streaming');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              // Process complete lines from buffer
              const lines = buffer.split('\n');
              // Keep the last incomplete line in buffer
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') continue;
                  if (!data) continue;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    if (content) {
                      fullContent += content;
                      chunkCount++;
                    }
                  } catch (e) {
                    // Skip malformed JSON chunks
                  }
                }
              }
            }

            // Process any remaining data in buffer
            if (buffer.startsWith('data: ')) {
              const data = buffer.slice(6).trim();
              if (data && data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    fullContent += content;
                    chunkCount++;
                  }
                } catch (e) {
                  // Skip malformed
                }
              }
            }

            console.log(`✅ Streaming complete: ${chunkCount} chunks, ${fullContent.length} chars`);
            response = fullContent;
          } else {
            const data = await apiResponse.json();
            response = data.choices[0].message.content;
          }
          break;
        }

      case 'gemini':
        {
          console.log('🤖 Calling Gemini API...');
          // Use higher token limit for elections dashboard
          const isElections = dashboard === 'elections';
          const maxTokens = isElections ? 100000 : (provider.max_tokens || 4096);
          const timeout = isElections ? 300000 : 30000; // 5 minutes for elections
          const useStreaming = isElections;

          console.log(`📊 Gemini: max_tokens=${maxTokens}, timeout=${timeout}ms, streaming=${useStreaming}`);

          if (useStreaming) {
            // Use Gemini streaming endpoint for large responses
            const apiUrl = `${provider.endpoint}/models/${provider.model}:streamGenerateContent?key=${provider.api_key}&alt=sse`;

            const apiResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: context ? `${context}\n\n${message}` : message
                      }
                    ]
                  }
                ],
                generationConfig: {
                  temperature: provider.temperature || 0.7,
                  maxOutputTokens: maxTokens
                }
              }),
              signal: AbortSignal.timeout(timeout)
            });

            if (!apiResponse.ok) {
              const errorText = await apiResponse.text();
              throw new Error(`Gemini streaming API error: ${apiResponse.status} - ${errorText}`);
            }

            console.log('📡 Processing Gemini streaming response...');
            let fullContent = '';
            let chunkCount = 0;

            const reader = apiResponse.body?.getReader();
            if (!reader) {
              throw new Error('No response body for Gemini streaming');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              // Process complete lines from buffer
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (!data) continue;

                  try {
                    const parsed = JSON.parse(data);
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) {
                      fullContent += text;
                      chunkCount++;
                    }
                  } catch (e) {
                    // Skip malformed chunks
                  }
                }
              }
            }

            console.log(`✅ Gemini streaming complete: ${chunkCount} chunks, ${fullContent.length} chars`);
            response = fullContent;
          } else {
            // Non-streaming for smaller requests
            const apiResponse = await fetch(
              `${provider.endpoint}/models/${provider.model}:generateContent?key=${provider.api_key}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          text: context ? `${context}\n\n${message}` : message
                        }
                      ]
                    }
                  ],
                  generationConfig: {
                    temperature: provider.temperature || 0.7,
                    maxOutputTokens: maxTokens
                  }
                }),
                signal: AbortSignal.timeout(timeout)
              }
            );

            if (!apiResponse.ok) {
              const errorText = await apiResponse.text();
              throw new Error(`Gemini API error: ${apiResponse.status} - ${errorText}`);
            }

            const data = await apiResponse.json();
            response = data.candidates[0].content.parts[0].text;
          }
          break;
        }

      default:
        throw new Error(`Unsupported AI provider: ${provider.provider_name}`);
    }

    console.log('✅ AI chat completed successfully');

    return c.json({
      ok: true,
      response,
      providerId,
      model: provider.model
    });

  } catch (error: any) {
    console.error('❌ AI chat error:', error);
    return jsonErr(c, 500, 'AI_CHAT_FAILED', error.message || String(error));
  }
});

// ============================================================================
// AI IMAGE GENERATION (Imagen for Pulsar VS)
// ============================================================================

app.post("/ai_provider/generate-imagen", async (c) => {
  try {
    const body = await safeJson(c);
    const { providerId, prompt, aspectRatio, numberOfImages, safetyLevel } = body;

    if (!providerId || !prompt) {
      return jsonErr(c, 400, 'AI_IMAGEN_INVALID_INPUT', 'providerId and prompt are required');
    }

    console.log(`🎨 Imagen generation: provider=${providerId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch provider details
    const { data: provider, error: providerError } = await supabase
      .from("ai_providers")
      .select("*")
      .eq("id", providerId)
      .single();

    if (providerError || !provider) {
      return jsonErr(c, 404, 'AI_PROVIDER_NOT_FOUND', providerId);
    }

    if (!provider.enabled) {
      return jsonErr(c, 400, 'AI_PROVIDER_DISABLED', 'This AI provider is disabled');
    }

    if (!provider.api_key) {
      return jsonErr(c, 400, 'AI_PROVIDER_NO_KEY', 'No API key configured for this provider');
    }

    // Call Imagen API
    const apiUrl = `${provider.endpoint}/models/${provider.model}:predict?key=${provider.api_key}`;

    console.log('🎨 Calling Imagen API with model:', provider.model);

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: numberOfImages || 1,
          aspectRatio: aspectRatio || '16:9',
          safetyFilterLevel: safetyLevel || 'block_some',
          personGeneration: 'allow_adult'
        }
      }),
      signal: AbortSignal.timeout(120000) // 2 minute timeout for image generation
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Imagen API error:', errorText);
      throw new Error(`Imagen API error: ${apiResponse.status} - ${errorText}`);
    }

    const data = await apiResponse.json();

    if (!data.predictions || data.predictions.length === 0) {
      throw new Error('No predictions returned from Imagen API');
    }

    const prediction = data.predictions[0];
    const imageData = prediction.bytesBase64Encoded || prediction.generated_images?.[0]?.bytesBase64Encoded;

    if (!imageData) {
      throw new Error('No image data in Imagen response');
    }

    console.log('✅ Imagen generation completed successfully');

    return c.json({
      ok: true,
      base64: imageData,
      providerId,
      model: provider.model
    });

  } catch (error: any) {
    console.error('❌ Imagen generation error:', error);
    return jsonErr(c, 500, 'AI_IMAGEN_GENERATION_FAILED', error.message || String(error));
  }
});

// ============================================================================
// AI IMAGE EDITING (Gemini for Pulsar VS)
// ============================================================================

app.post("/ai_provider/edit-image", async (c) => {
  try {
    const body = await safeJson(c);
    const { providerId, sourceImage, prompt } = body;

    if (!providerId || !sourceImage || !prompt) {
      return jsonErr(c, 400, 'AI_IMAGE_EDIT_INVALID_INPUT', 'providerId, sourceImage, and prompt are required');
    }

    console.log(`✏️ Image edit: provider=${providerId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch provider details
    const { data: provider, error: providerError } = await supabase
      .from("ai_providers")
      .select("*")
      .eq("id", providerId)
      .single();

    if (providerError || !provider) {
      return jsonErr(c, 404, 'AI_PROVIDER_NOT_FOUND', providerId);
    }

    if (!provider.enabled) {
      return jsonErr(c, 400, 'AI_PROVIDER_DISABLED', 'This AI provider is disabled');
    }

    if (!provider.api_key) {
      return jsonErr(c, 400, 'AI_PROVIDER_NO_KEY', 'No API key configured for this provider');
    }

    // Call Gemini API for image editing
    const apiUrl = `${provider.endpoint}/models/${provider.model}:generateContent?key=${provider.api_key}`;

    console.log('✏️ Calling Gemini image edit API with model:', provider.model);

    // Convert sourceImage to base64 - handle both URL and base64 input
    let imageBase64 = sourceImage;
    let mimeType = 'image/png';

    if (sourceImage.startsWith('http://') || sourceImage.startsWith('https://')) {
      // Fetch the image from URL and convert to base64
      console.log('📥 Fetching image from URL:', sourceImage);
      try {
        const imageResponse = await fetch(sourceImage);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        // Get mime type from response headers
        const contentType = imageResponse.headers.get('content-type');
        if (contentType) {
          mimeType = contentType.split(';')[0].trim();
        }

        // Convert to base64
        const imageBuffer = await imageResponse.arrayBuffer();
        const uint8Array = new Uint8Array(imageBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        imageBase64 = btoa(binary);
        console.log('✅ Image fetched and converted to base64, size:', imageBase64.length, 'mimeType:', mimeType);
      } catch (fetchError) {
        console.error('❌ Failed to fetch image from URL:', fetchError);
        throw new Error(`Failed to fetch source image: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      }
    } else if (imageBase64.startsWith('data:')) {
      // Extract mime type and base64 data from data URL
      const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageBase64 = matches[2];
      } else {
        imageBase64 = imageBase64.split(',')[1];
      }
    }
    // else assume it's already raw base64

    const editPrompt = `Edit this image: ${prompt}. Keep the rest of the image unchanged. Only modify the areas that match the description.`;

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64
              }
            },
            {
              text: editPrompt
            }
          ]
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          temperature: 0.4
        }
      }),
      signal: AbortSignal.timeout(120000)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Gemini image edit API error:', errorText);
      throw new Error(`Gemini image edit error: ${apiResponse.status} - ${errorText}`);
    }

    const data = await apiResponse.json();

    // Extract image from response
    let resultImageData: string | undefined;
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            resultImageData = part.inlineData.data;
            break;
          }
        }
      }
    }

    if (!resultImageData) {
      throw new Error('Gemini did not return an edited image. Try rephrasing your edit request.');
    }

    console.log('✅ Image edit completed successfully');

    return c.json({
      ok: true,
      base64: resultImageData,
      providerId,
      model: provider.model
    });

  } catch (error: any) {
    console.error('❌ Image edit error:', error);
    return jsonErr(c, 500, 'AI_IMAGE_EDIT_FAILED', error.message || String(error));
  }
});

// ============================================================================
// AI IMAGE GENERATION (Generic - OpenAI DALL-E)
// ============================================================================

app.post("/ai_provider/generate-image", async (c) => {
  try {
    const body = await safeJson(c);
    const { providerId, prompt, dashboard } = body;

    if (!providerId || !prompt) {
      return jsonErr(c, 400, 'AI_IMAGE_INVALID_INPUT', 'providerId and prompt are required');
    }

    console.log(`🎨 AI Image generation: provider=${providerId}, dashboard=${dashboard}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch provider details
    const { data: provider, error: providerError } = await supabase
      .from("ai_providers")
      .select("*")
      .eq("id", providerId)
      .single();

    if (providerError || !provider) {
      return jsonErr(c, 404, 'AI_PROVIDER_NOT_FOUND', providerId);
    }

    if (!provider.enabled) {
      return jsonErr(c, 400, 'AI_PROVIDER_DISABLED', 'This AI provider is disabled');
    }

    let imageUrl: string;

    // Call the appropriate AI API based on provider
    switch (provider.provider_name.toLowerCase()) {
      case 'openai':
        {
          console.log('🎨 Calling OpenAI DALL-E API...');
          const apiResponse = await fetch(`${provider.endpoint}/images/generations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${provider.api_key}`
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt,
              n: 1,
              size: '1024x1024'
            }),
            signal: AbortSignal.timeout(60000)
          });

          if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`OpenAI DALL-E error: ${apiResponse.status} - ${errorText}`);
          }

          const data = await apiResponse.json();
          imageUrl = data.data[0].url;
          break;
        }

      default:
        throw new Error(`Image generation not supported for provider: ${provider.provider_name}`);
    }

    console.log('✅ AI image generation completed successfully');

    return c.json({
      ok: true,
      imageUrl,
      providerId,
      prompt
    });

  } catch (error: any) {
    console.error('❌ AI image generation error:', error);
    return jsonErr(c, 500, 'AI_IMAGE_GENERATION_FAILED', error.message || String(error));
  }
});

// Start server
serve(app.fetch);
