import { supabase, ensureFreshConnection } from '@emergent-platform/supabase-client';
import type { AIContext, AIResponse, AIChanges } from '@emergent-platform/types';
import {
  buildDynamicSystemPrompt,
  buildContextMessage as buildDynamicContextMessage,
} from './ai-prompts';
import { resolveLogoPlaceholders } from './ai-prompts/tools/sports-logos';
import { resolvePexelsPlaceholders, convertStockPhotoUrls } from './ai-prompts/tools/pexels-images';
import { resolveGeneratePlaceholders, hasGeneratePlaceholders, getFallbackPlaceholderUrl, extractGeneratePlaceholders } from './ai-prompts/tools/ai-image-generator';
import { useAuthStore, getOrganizationId } from '@/stores/authStore';
import {
  getTextProviders,
  revealProviderApiKey,
} from '@/services/aiProviderService';

// Supabase edge function URL for AI chat (more reliable than Netlify functions)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const AI_EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;

// Track last activity time for connection health checks
let lastActivityTime = Date.now();
const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Update activity timestamp - call this when user interacts with chat
 */
export function markChatActivity(): void {
  lastActivityTime = Date.now();
}

/**
 * Check if browser has been idle and refresh connection if needed
 * Also tests AI endpoint connectivity to ensure requests will succeed
 */
async function ensureFreshConnectionIfIdle(): Promise<void> {
  const idleTime = Date.now() - lastActivityTime;
  if (idleTime > IDLE_THRESHOLD_MS) {
    console.log(`[AI] Browser was idle for ${Math.round(idleTime / 1000)}s, ensuring fresh connection...`);
    try {
      // Refresh the Supabase session to ensure token is valid
      if (supabase) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn('[AI] Session refresh warning:', error.message);
        } else if (data?.session) {
          // Update the auth store with refreshed token
          useAuthStore.getState().accessToken && useAuthStore.setState({ accessToken: data.session.access_token });
          console.log('[AI] Session refreshed successfully');
        }
      }
      // Also ensure Supabase connection is healthy
      await ensureFreshConnection(true);

      // Warm up the AI edge function endpoint
      // This helps prevent cold start delays after idle periods
      try {
        const warmupController = new AbortController();
        const warmupTimeout = setTimeout(() => warmupController.abort(), 5000);
        await fetch(AI_EDGE_FUNCTION_URL, {
          method: 'OPTIONS',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
          },
          signal: warmupController.signal,
        }).catch(() => {
          // Ignore errors - this is just a warmup
        });
        clearTimeout(warmupTimeout);
        console.log('[AI] Edge function warmup complete');
      } catch {
        // Ignore warmup errors
      }
    } catch (err) {
      console.warn('[AI] Connection refresh failed, continuing anyway:', err);
    }
  }
  // Update activity time
  lastActivityTime = Date.now();
}

/**
 * Callback for image generation progress updates
 */
export type ImageProgressCallback = (message: string, current: number, total: number) => void;

/**
 * Resolve all image placeholders in AI response text
 * Handles: {{LOGO:LEAGUE:TEAM}}, {{PEXELS:query}}, {{GENERATE:query}}
 *
 * GENERATE placeholders are async because they may need to generate images via AI
 * and upload them to Supabase storage.
 */
async function resolveImagePlaceholders(
  text: string,
  onProgress?: ImageProgressCallback
): Promise<string> {
  // First convert any raw stock photo URLs to GENERATE placeholders
  let resolved = convertStockPhotoUrls(text);
  // Then resolve synchronous placeholders
  resolved = resolveLogoPlaceholders(resolved);
  resolved = resolvePexelsPlaceholders(resolved);

  // Then resolve AI-generated images (async)
  const hasGenerate = hasGeneratePlaceholders(resolved);
  if (hasGenerate) {
    console.log('🖼️ Found GENERATE placeholders in text');
    const authState = useAuthStore.getState();
    const organizationId = getOrganizationId(authState.user);
    const userId = authState.user?.id;
    const accessToken = authState.accessToken; // Get from store, not supabase.auth.getSession()
    console.log('🖼️ Auth state:', { organizationId, userId: userId?.substring(0, 8), hasToken: !!accessToken });

    if (organizationId && userId && accessToken) {
      console.log('🖼️ Resolving GENERATE placeholders...');

      // Extract placeholders to get count and show progress
      const placeholders = extractGeneratePlaceholders(resolved);
      const total = placeholders.length;

      if (onProgress && total > 0) {
        // Report initial progress
        onProgress('Generating AI images...', 0, total);
      }

      // Resolve each placeholder individually to report progress
      for (let i = 0; i < placeholders.length; i++) {
        const placeholder = placeholders[i];
        const placeholderStr = `{{GENERATE:${placeholder}}}`;

        // Report progress for this image
        if (onProgress) {
          const shortName = placeholder.length > 30 ? placeholder.substring(0, 30) + '...' : placeholder;
          onProgress(`Generating: ${shortName}`, i + 1, total);
        }

        // Resolve just this one placeholder
        const singleResolved = await resolveGeneratePlaceholders(placeholderStr, organizationId, userId, accessToken);
        resolved = resolved.replace(placeholderStr, singleResolved);
      }
    } else {
      console.warn('⚠️ Cannot generate images: missing org, user, or access token');
      // Replace GENERATE placeholders with fallback
      const fallbackUrl = getFallbackPlaceholderUrl();
      resolved = resolved.replace(/\{\{GENERATE:[^}]+\}\}/g, fallbackUrl);
    }
  }

  return resolved;
}

// AI Providers
export type AIProvider = 'gemini' | 'claude';

// Available AI models for chat/text generation
export const AI_MODELS = {
  // Gemini 3.0 Models (Latest)
  'gemini-3.0-pro': {
    id: 'gemini-3.0-pro',
    name: 'Gemini 3.0 Pro',
    description: 'Most intelligent Gemini model, advanced reasoning',
    provider: 'gemini' as AIProvider,
    apiModel: 'gemini-3-pro-preview',
  },
  // Gemini 2.5 Models
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Advanced reasoning model, best for complex designs',
    provider: 'gemini' as AIProvider,
    apiModel: 'gemini-2.5-pro',
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Best price-performance ratio, great balance',
    provider: 'gemini' as AIProvider,
    apiModel: 'gemini-2.5-flash',
  },
  'gemini-2.5-flash-lite': {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Cost-optimized, ultra-fast for simple tasks',
    provider: 'gemini' as AIProvider,
    apiModel: 'gemini-2.5-flash-lite',
  },
  // Claude Models
  'sonnet-fast': {
    id: 'sonnet-fast',
    name: 'Claude Sonnet',
    description: 'Fast Claude responses, great for most tasks',
    provider: 'claude' as AIProvider,
    apiModel: 'claude-sonnet-4-20250514',
  },
  'opus-advanced': {
    id: 'opus-advanced',
    name: 'Claude Opus 4.5',
    description: 'Most capable Claude, best for complex designs',
    provider: 'claude' as AIProvider,
    apiModel: 'claude-opus-4-20250514',
  },
  'haiku-instant': {
    id: 'haiku-instant',
    name: 'Claude Haiku',
    description: 'Fastest Claude responses, simple tasks',
    provider: 'claude' as AIProvider,
    apiModel: 'claude-3-5-haiku-20241022',
  },
} as const;

export type AIModelId = keyof typeof AI_MODELS;

// Default model ID - empty string means "use first backend provider"
// The hardcoded AI_MODELS are kept for backwards compatibility but backend providers take priority
export const DEFAULT_AI_MODEL = '';

// ============================================================================
// IMAGE GENERATION MODELS
// Uses same Gemini API key for all models
// Reference: https://ai.google.dev/gemini-api/docs/image-generation
// ============================================================================
export const AI_IMAGE_MODELS = {
  // Gemini native image generation (uses generateContent endpoint)
  // "Nano Banana Pro" - Gemini 3 Pro Image model for professional asset production
  'gemini-3-pro-image': {
    id: 'gemini-3-pro-image',
    name: 'Gemini 3 Pro Image (Nano Banana Pro)',
    description: 'Professional asset production, up to 4K, advanced reasoning',
    provider: 'gemini' as AIProvider,
    apiModel: 'gemini-3-pro-image-preview',
    apiEndpoint: 'generateContent' as const,
  },
  // "Nano Banana" - Gemini 2.5 Flash Image model optimized for speed
  'gemini-2.5-flash-image': {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image (Nano Banana)',
    description: 'Fast image generation, 1024px, optimized for speed',
    provider: 'gemini' as AIProvider,
    apiModel: 'gemini-2.5-flash-image',
    apiEndpoint: 'generateContent' as const,
  },
  // Imagen 3 model (uses predict endpoint)
  'imagen-3': {
    id: 'imagen-3',
    name: 'Imagen 3',
    description: 'High quality image generation ($0.03/image)',
    provider: 'gemini' as AIProvider,
    apiModel: 'imagen-3.0-generate-002',
    apiEndpoint: 'generateImages' as const,
  },
} as const;

export type AIImageModelId = keyof typeof AI_IMAGE_MODELS;

// Default image model ID - empty string means "use first backend provider"
export const DEFAULT_AI_IMAGE_MODEL = '';

// Get/set image model preference from organization settings
// Now accepts dynamic model IDs from backend, not just hardcoded AI_IMAGE_MODELS
export function getAIImageModel(): string {
  // Check organization settings only
  const orgSettings = useAuthStore.getState().organization?.settings;
  if (orgSettings?.ai_image_model) {
    return orgSettings.ai_image_model;
  }
  return DEFAULT_AI_IMAGE_MODEL;
}

export async function setAIImageModel(modelId: string): Promise<void> {
  const result = await useAuthStore.getState().updateOrganizationSettings({ ai_image_model: modelId });
  if (!result.success) {
    console.error('[AI] Failed to save ai_image_model to organization settings:', result.error);
  }
}

// Get/set model preference from organization settings
// Now accepts dynamic model IDs from backend, not just hardcoded AI_MODELS
export function getAIModel(): string {
  // Check organization settings only
  const orgSettings = useAuthStore.getState().organization?.settings;
  // Return saved model or empty string (backend will provide default)
  return orgSettings?.ai_model || DEFAULT_AI_MODEL;
}

export async function setAIModel(modelId: string): Promise<void> {
  console.log('[AI] setAIModel called with:', modelId);
  const result = await useAuthStore.getState().updateOrganizationSettings({ ai_model: modelId });
  if (result.success) {
    console.log('[AI] Successfully saved ai_model to organization settings');
  } else {
    console.error('[AI] Failed to save ai_model to organization settings:', result.error);
  }
}

/**
 * Initialize AI models from backend providers on login.
 * If no model is saved in org settings, saves the backend default.
 * Call this after user auth/organization is loaded.
 */
export async function initializeAIModelsFromBackend(): Promise<void> {
  const orgSettings = useAuthStore.getState().organization?.settings;

  try {
    // Only initialize if we have providers and no model is saved yet
    const currentTextModel = orgSettings?.ai_model;
    const currentImageModel = orgSettings?.ai_image_model;

    const [textProviders, imageProviders] = await Promise.all([
      getTextProviders(true), // Force refresh
      import('@/services/aiProviderService').then(m => m.getImageProviders(true)),
    ]);

    // Initialize text model if not set
    if (!currentTextModel && textProviders.length > 0) {
      const defaultTextProvider = textProviders.find(p => p.apiKeyConfigured) || textProviders[0];
      if (defaultTextProvider?.model) {
        console.log('[AI] Initializing text model from backend:', defaultTextProvider.model);
        await setAIModel(defaultTextProvider.model);
      }
    }

    // Initialize image model if not set
    if (!currentImageModel && imageProviders.length > 0) {
      const defaultImageProvider = imageProviders.find(p => p.apiKeyConfigured) || imageProviders[0];
      if (defaultImageProvider?.model) {
        console.log('[AI] Initializing image model from backend:', defaultImageProvider.model);
        await setAIImageModel(defaultImageProvider.model);
      }
    }

    // Clear cache to use fresh config
    clearResolvedProviderCache();
    console.log('[AI] AI models initialized from backend');
  } catch (err) {
    console.warn('[AI] Failed to initialize AI models from backend:', err);
  }
}

// Get API keys from organization settings only
export function getGeminiApiKey(): string | null {
  const orgSettings = useAuthStore.getState().organization?.settings;
  return orgSettings?.gemini_api_key || null;
}

export function getClaudeApiKey(): string | null {
  const orgSettings = useAuthStore.getState().organization?.settings;
  return orgSettings?.claude_api_key || null;
}

// Set API keys to organization settings
export async function setGeminiApiKey(apiKey: string): Promise<void> {
  const result = await useAuthStore.getState().updateOrganizationSettings({ gemini_api_key: apiKey });
  if (!result.success) {
    console.error('[AI] Failed to save gemini_api_key to organization settings:', result.error);
  }
}

export async function setClaudeApiKey(apiKey: string): Promise<void> {
  const result = await useAuthStore.getState().updateOrganizationSettings({ claude_api_key: apiKey });
  if (!result.success) {
    console.error('[AI] Failed to save claude_api_key to organization settings:', result.error);
  }
}

// Check if we're in production (backend proxy available)
function isProductionMode(): boolean {
  return import.meta.env.PROD;
}

// Check if we should use the backend proxy (no local key available)
// In production without VITE_ keys, this will use the serverless function
// In development, we require a local API key
function shouldUseBackendProxy(provider: AIProvider): boolean {
  // In development, never use backend proxy - require local key
  if (!isProductionMode()) {
    return false;
  }
  // In production, use proxy only if no local key
  if (provider === 'gemini') {
    return !getGeminiApiKey();
  }
  return !getClaudeApiKey();
}

// Check if AI is available in current environment (sync version - uses cache)
export function isAIAvailableInCurrentEnv(): { available: boolean; reason?: string } {
  // If we have a cached resolved provider, AI is available
  if (resolvedProviderCache) {
    return { available: true };
  }

  // Check for legacy local API keys as fallback
  const hasGeminiKey = !!getGeminiApiKey();
  const hasClaudeKey = !!getClaudeApiKey();

  if (hasGeminiKey || hasClaudeKey) {
    return { available: true };
  }

  // In production, backend proxy is available
  if (isProductionMode()) {
    return { available: true };
  }

  // No keys found - but backend might have providers, so don't block
  // The actual check will happen async when making the request
  return {
    available: false,
    reason: 'No AI provider configured. Please configure an AI provider in the Nova dashboard (AI Connections).',
  };
}

// Check if AI is available (async version - checks backend)
export async function checkAIAvailability(): Promise<{ available: boolean; reason?: string }> {
  try {
    const providers = await getTextProviders();
    if (providers.length > 0 && providers.some(p => p.apiKeyConfigured)) {
      return { available: true };
    }
  } catch (err) {
    console.warn('[AI] Failed to check backend providers:', err);
  }

  // Fallback to local keys
  const hasGeminiKey = !!getGeminiApiKey();
  const hasClaudeKey = !!getClaudeApiKey();

  if (hasGeminiKey || hasClaudeKey) {
    return { available: true };
  }

  return {
    available: false,
    reason: 'No AI provider configured. Please configure an AI provider in the Nova dashboard (AI Connections).',
  };
}

// ============================================================================
// BACKEND PROVIDER RESOLUTION
// Resolves model IDs to backend provider configuration and API keys
// ============================================================================

interface ResolvedModelConfig {
  provider: AIProvider;
  apiModel: string;
  apiKey: string;
  providerId: string;
}

// Cache for resolved provider configs
let resolvedProviderCache: {
  modelId: string;
  config: ResolvedModelConfig;
  timestamp: number;
} | null = null;

const RESOLVED_CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Resolve a model ID to its backend provider configuration and API key.
 * This is the primary way to get model config for AI calls.
 * Falls back to hardcoded AI_MODELS for backwards compatibility.
 */
async function resolveModelConfig(modelId: string): Promise<ResolvedModelConfig | null> {
  // Check cache first
  if (
    resolvedProviderCache &&
    resolvedProviderCache.modelId === modelId &&
    Date.now() - resolvedProviderCache.timestamp < RESOLVED_CACHE_TTL_MS
  ) {
    console.log('[AI] Using cached provider config for:', modelId);
    return resolvedProviderCache.config;
  }

  // Try to find provider from backend
  try {
    const providers = await getTextProviders();

    // First try exact match
    let matchingProvider = providers.find(p => p.model === modelId);

    // If no exact match and we have backend providers, use the first available one
    // This handles the case where user hasn't explicitly saved a model yet
    if (!matchingProvider && providers.length > 0) {
      matchingProvider = providers.find(p => p.apiKeyConfigured);
      if (matchingProvider) {
        console.log('[AI] No exact match for', modelId, ', using backend default:', matchingProvider.model);
      }
    }

    if (matchingProvider && matchingProvider.apiKeyConfigured) {
      // Get the actual API key from backend
      const apiKey = await revealProviderApiKey(matchingProvider.id);

      if (apiKey) {
        // Use the provider's configured model, not the requested modelId
        const actualModelId = matchingProvider.model;
        const config: ResolvedModelConfig = {
          provider: matchingProvider.providerName as AIProvider,
          apiModel: actualModelId, // Use the provider's configured model
          apiKey,
          providerId: matchingProvider.id,
        };

        // Cache the result with the actual model being used
        resolvedProviderCache = {
          modelId: actualModelId,
          config,
          timestamp: Date.now(),
        };

        console.log('[AI] Resolved model from backend:', { requestedModel: modelId, actualModel: actualModelId, provider: config.provider });
        return config;
      }
    }
  } catch (err) {
    console.warn('[AI] Failed to resolve model from backend:', err);
  }

  // Fallback to hardcoded AI_MODELS for backwards compatibility (only if no backend providers)
  if (modelId in AI_MODELS) {
    const hardcodedModel = AI_MODELS[modelId as keyof typeof AI_MODELS];
    const apiKey = hardcodedModel.provider === 'gemini' ? getGeminiApiKey() : getClaudeApiKey();

    if (apiKey) {
      const config: ResolvedModelConfig = {
        provider: hardcodedModel.provider,
        apiModel: hardcodedModel.apiModel,
        apiKey,
        providerId: 'local',
      };
      console.log('[AI] Using hardcoded model config (no backend providers):', { modelId, provider: config.provider });
      return config;
    }
  }

  console.warn('[AI] Could not resolve model config for:', modelId);
  return null;
}

/**
 * Clear the resolved provider cache (call after settings changes)
 */
export function clearResolvedProviderCache(): void {
  resolvedProviderCache = null;
}

/**
 * Get display info for the current AI model.
 * Returns name and provider from backend providers, or falls back to hardcoded AI_MODELS.
 */
export interface AIModelDisplayInfo {
  name: string;
  provider: AIProvider;
  modelId: string;
}

export async function getCurrentModelDisplayInfo(): Promise<AIModelDisplayInfo> {
  const requestedModelId = getAIModel();

  // Try to find in backend providers first
  try {
    const providers = await getTextProviders();

    // First try exact match
    let matchingProvider = providers.find(p => p.model === requestedModelId);

    // If no exact match but backend providers exist, use the first one with API key
    if (!matchingProvider && providers.length > 0) {
      matchingProvider = providers.find(p => p.apiKeyConfigured);
    }

    if (matchingProvider) {
      const actualModelId = matchingProvider.model;
      // Find the model in availableModels for display name
      const modelInfo = matchingProvider.availableModels?.find(m => m.id === actualModelId);
      return {
        name: modelInfo?.name || actualModelId,
        provider: matchingProvider.providerName as AIProvider,
        modelId: actualModelId,
      };
    }
  } catch (err) {
    console.warn('[AI] Failed to get model display info from backend:', err);
  }

  // Fallback to hardcoded AI_MODELS (only if no backend providers)
  if (requestedModelId in AI_MODELS) {
    const hardcoded = AI_MODELS[requestedModelId as keyof typeof AI_MODELS];
    return {
      name: hardcoded.name,
      provider: hardcoded.provider,
      modelId: requestedModelId,
    };
  }

  // Last resort - return the model ID as name
  return {
    name: requestedModelId,
    provider: 'gemini', // Default assumption
    modelId: requestedModelId,
  };
}

/**
 * Synchronous version that returns cached info or falls back to hardcoded.
 * Use this for immediate UI display; it may not have the latest backend info.
 */
export function getCurrentModelDisplayInfoSync(): AIModelDisplayInfo {
  const modelId = getAIModel();

  // Check hardcoded models first (synchronous)
  if (modelId in AI_MODELS) {
    const hardcoded = AI_MODELS[modelId as keyof typeof AI_MODELS];
    return {
      name: hardcoded.name,
      provider: hardcoded.provider,
      modelId,
    };
  }

  // If cached provider info exists, use it
  if (resolvedProviderCache && resolvedProviderCache.modelId === modelId) {
    return {
      name: modelId, // We don't have the display name in cache, use ID
      provider: resolvedProviderCache.config.provider,
      modelId,
    };
  }

  // Return model ID as name (backend model not in cache)
  return {
    name: modelId,
    provider: 'gemini', // Default assumption for Gemini models
    modelId,
  };
}

// ============================================================================
// IMAGE MODEL DISPLAY INFO & RESOLUTION
// Parallel to text model functions, for AIImageGeneratorDialog
// ============================================================================

/**
 * Display info for AI image models (used in AIImageGeneratorDialog)
 */
export interface AIImageModelDisplayInfo {
  name: string;
  description: string;
  provider: AIProvider;
  modelId: string;
  apiModel: string;
  apiEndpoint: 'generateContent' | 'generateImages';
}

// Cache for resolved image provider configs
let resolvedImageProviderCache: {
  modelId: string;
  config: AIImageModelDisplayInfo & { apiKey: string; providerId: string };
  timestamp: number;
} | null = null;

/**
 * Get display info for the current AI image model.
 * Returns name and provider from backend providers, or falls back to hardcoded AI_IMAGE_MODELS.
 */
export async function getCurrentImageModelDisplayInfo(): Promise<AIImageModelDisplayInfo> {
  const requestedModelId = getAIImageModel();

  // Try to find in backend providers first
  try {
    const { getImageProviders } = await import('@/services/aiProviderService');
    const providers = await getImageProviders();

    // First try exact match
    let matchingProvider = providers.find(p => p.model === requestedModelId);

    // If no exact match but backend providers exist, use the first one with API key
    if (!matchingProvider && providers.length > 0) {
      matchingProvider = providers.find(p => p.apiKeyConfigured);
    }

    if (matchingProvider) {
      const actualModelId = matchingProvider.model;
      // Find the model in availableModels for display name
      const modelInfo = matchingProvider.availableModels?.find(m => m.id === actualModelId);
      return {
        name: modelInfo?.name || matchingProvider.name || actualModelId,
        description: modelInfo?.description || matchingProvider.description || '',
        provider: matchingProvider.providerName as AIProvider,
        modelId: actualModelId,
        apiModel: actualModelId,
        apiEndpoint: 'generateContent', // Default for Gemini models
      };
    }
  } catch (err) {
    console.warn('[AI] Failed to get image model display info from backend:', err);
  }

  // Fallback to hardcoded AI_IMAGE_MODELS (only if no backend providers)
  if (requestedModelId in AI_IMAGE_MODELS) {
    const hardcoded = AI_IMAGE_MODELS[requestedModelId as keyof typeof AI_IMAGE_MODELS];
    return {
      name: hardcoded.name,
      description: hardcoded.description,
      provider: hardcoded.provider,
      modelId: requestedModelId,
      apiModel: hardcoded.apiModel,
      apiEndpoint: hardcoded.apiEndpoint,
    };
  }

  // Last resort - return the model ID as name (for dynamic backend models)
  return {
    name: requestedModelId || 'No Model Selected',
    description: 'Configure a model in AI Settings',
    provider: 'gemini',
    modelId: requestedModelId,
    apiModel: requestedModelId,
    apiEndpoint: 'generateContent',
  };
}

/**
 * Resolve image model to backend provider with API key.
 * This is the primary way to get image model config for generation calls.
 */
export async function resolveImageModelConfig(): Promise<{
  apiKey: string;
  apiModel: string;
  apiEndpoint: 'generateContent' | 'generateImages';
  provider: AIProvider;
  providerId: string;
} | null> {
  const requestedModelId = getAIImageModel();

  // Check cache first
  if (
    resolvedImageProviderCache &&
    resolvedImageProviderCache.modelId === requestedModelId &&
    Date.now() - resolvedImageProviderCache.timestamp < RESOLVED_CACHE_TTL_MS
  ) {
    console.log('[AI] Using cached image provider config for:', requestedModelId);
    const cached = resolvedImageProviderCache.config;
    return {
      apiKey: cached.apiKey,
      apiModel: cached.apiModel,
      apiEndpoint: cached.apiEndpoint,
      provider: cached.provider,
      providerId: cached.providerId,
    };
  }

  // Try to find provider from backend
  try {
    const { getImageProviders, revealProviderApiKey } = await import('@/services/aiProviderService');
    const providers = await getImageProviders();

    // First try exact match
    let matchingProvider = providers.find(p => p.model === requestedModelId);

    // If no exact match but backend providers exist, use the first one with API key
    if (!matchingProvider && providers.length > 0) {
      matchingProvider = providers.find(p => p.apiKeyConfigured);
      if (matchingProvider) {
        console.log('[AI] No exact image model match for', requestedModelId, ', using backend default:', matchingProvider.model);
      }
    }

    if (matchingProvider && matchingProvider.apiKeyConfigured) {
      // Get the actual API key from backend
      const apiKey = await revealProviderApiKey(matchingProvider.id);

      if (apiKey) {
        const actualModelId = matchingProvider.model;
        const modelInfo = matchingProvider.availableModels?.find(m => m.id === actualModelId);

        const config = {
          name: modelInfo?.name || matchingProvider.name || actualModelId,
          description: modelInfo?.description || matchingProvider.description || '',
          provider: matchingProvider.providerName as AIProvider,
          modelId: actualModelId,
          apiModel: actualModelId,
          apiEndpoint: 'generateContent' as const,
          apiKey,
          providerId: matchingProvider.id,
        };

        // Cache the result
        resolvedImageProviderCache = {
          modelId: actualModelId,
          config,
          timestamp: Date.now(),
        };

        console.log('[AI] Resolved image model from backend:', { requestedModel: requestedModelId, actualModel: actualModelId, provider: config.provider });
        return {
          apiKey: config.apiKey,
          apiModel: config.apiModel,
          apiEndpoint: config.apiEndpoint,
          provider: config.provider,
          providerId: config.providerId,
        };
      }
    }
  } catch (err) {
    console.warn('[AI] Failed to resolve image model from backend:', err);
  }

  // Fallback to hardcoded AI_IMAGE_MODELS with legacy API key
  if (requestedModelId in AI_IMAGE_MODELS) {
    const hardcodedModel = AI_IMAGE_MODELS[requestedModelId as keyof typeof AI_IMAGE_MODELS];
    const apiKey = getGeminiApiKey();

    if (apiKey) {
      console.log('[AI] Using hardcoded image model config (no backend providers):', { modelId: requestedModelId, provider: hardcodedModel.provider });
      return {
        apiKey,
        apiModel: hardcodedModel.apiModel,
        apiEndpoint: hardcodedModel.apiEndpoint,
        provider: hardcodedModel.provider,
        providerId: 'local',
      };
    }
  }

  console.warn('[AI] Could not resolve image model config for:', requestedModelId);
  return null;
}

/**
 * Clear the resolved image provider cache (call after settings changes)
 */
export function clearResolvedImageProviderCache(): void {
  resolvedImageProviderCache = null;
}

// DEPRECATED: Legacy static system prompt - kept for reference
// Now using dynamic prompts from ./ai-prompts/ that are built based on user intent
// @ts-ignore - Intentionally keeping for reference/rollback
const _LEGACY_SYSTEM_PROMPT = `You are Nova, an AI assistant for broadcast graphics design.

## QUICK REFERENCE
- **ALWAYS check context FIRST** for existing elements in the current template
- **Use element IDs** when updating existing elements
- **Shapes**: Use "content.gradient" and "content.glass" (not "styles")
- **Other elements**: Use "styles" for CSS properties
- **Available elements**: text, shape, image, icon, svg, table, chart, map, video, ticker, topic-badge

## CRITICAL: PRIORITIZE CURRENT TEMPLATE

**The user is ALWAYS working on their CURRENTLY SELECTED TEMPLATE.** When you see "Currently Editing Template" in the context, that's what the user is focused on. ALL elements listed under "EXISTING ELEMENTS ON CANVAS" belong to this template.

## CRITICAL: UPDATE vs CREATE

**KEYWORDS THAT MEAN UPDATE (not create):**
- "improve", "enhance", "better", "nicer", "cleaner"
- "update", "change", "modify", "edit", "adjust"
- "fix", "tweak", "refine", "polish"
- "make it", "make the", "make this"
- References to "this", "the", "current", "my"

**When user uses ANY of these words → UPDATE the existing elements, don't create new ones!**

**ALWAYS check the context for existing elements before responding!**

When the context shows "EXISTING ELEMENTS ON CANVAS" with elements listed:
1. The user wants to work with THESE elements
2. Use "action": "update" with the element IDs shown
3. Do NOT create new elements unless explicitly asked to "create", "add", or "make new"

**IMPORTANT**: Do NOT assume what type of graphic the user has. Look at the ACTUAL elements in the context. If there are shapes and text elements, those ARE the graphic - update THOSE elements regardless of whether it's a "lower third", "score bug", or any other type.

**CRITICAL: ALWAYS INCLUDE BOTH IN AND OUT ANIMATIONS!** When creating NEW elements, you MUST include animations in the "animations" array. Every element MUST have BOTH:
- An "in" animation (entrance: fade-in, slide-in, scale-in, etc.)
- An "out" animation (exit: fade-out, slide-out, scale-out, etc.)

The "out" animation should be the reverse/opposite of the "in" animation. This is REQUIRED for broadcast graphics to work properly.

### Examples of UPDATE requests (use existing element IDs!):
- "improve the design" → UPDATE all elements in context with better styling
- "make it look better" → UPDATE elements with improved colors, spacing, effects
- "change the background to red" → Find the shape element and UPDATE its fill/backgroundColor
- "make the text bigger" → Find text elements and UPDATE their fontSize
- "update this graphic" → UPDATE all elements shown in EXISTING ELEMENTS ON CANVAS
- "move this up" → UPDATE position_y of existing elements

**NEVER say "no elements found" or "no lower third found" if there ARE elements in the context!** The elements in context ARE the user's graphic - update them!

**USE THE ELEMENT ID** when updating! Copy the exact ID from "EXISTING ELEMENTS ON CANVAS".

### Action Types:
- **"create"** - Only for NEW elements that don't exist
- **"update"** - Modify EXISTING elements (use their ID!)
- **"delete"** - Remove elements (use their ID!)

### Update Format (IMPORTANT!):
\`\`\`json
{
  "action": "update",
  "elements": [
    {
      "id": "existing-element-uuid-here",
      "styles": { "backgroundColor": "#ff0000" }
    }
  ]
}
\`\`\`

Only include the properties you want to change. Keep the ID from the existing element!

**IMPORTANT: Do NOT include "layer_type" for update/delete actions!** The user's currently selected template will be used. Only include "layer_type" when creating NEW graphics.

## Layer Detection (Only for CREATE actions!)

| Keyword(s)                          | Layer Type      |
|-------------------------------------|-----------------|
| "fullscreen", "full screen"         | fullscreen      |
| "background", "bg"                  | background      |
| "lower third", "l3", "name", "title"| lower-third     |
| "ticker", "crawl", "scroll"         | ticker          |
| "bug", "score", "corner", "logo"    | bug             |
| "alert", "breaking"                 | alert           |

## Response Format

ALWAYS include a JSON code block:

### For CREATING new elements (include layer_type):
\`\`\`json
{
  "action": "create",
  "layer_type": "lower-third",
  "elements": [
    {
      "name": "Element Name",
      "element_type": "shape",
      "position_x": 100,
      "position_y": 800,
      "width": 500,
      "height": 120,
      "styles": { "backgroundColor": "#3B82F6", "borderRadius": "8px" },
      "content": { "type": "shape", "shape": "rectangle", "fill": "#3B82F6" }
    }
  ],
  "animations": [
    {
      "element_name": "Element Name",  // MUST match element name exactly
      "phase": "in",
      "duration": 500,
      "delay": 0,
      "easing": "ease-out",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0, "transform": "translateX(-50px)" } },
        { "position": 100, "properties": { "opacity": 1, "transform": "translateX(0)" } }
      ]
    },
    {
      "element_name": "Element Name",  // Same element, "out" phase
      "phase": "out",
      "duration": 400,
      "delay": 0,
      "easing": "ease-in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 1, "transform": "translateX(0)" } },
        { "position": 100, "properties": { "opacity": 0, "transform": "translateX(-50px)" } }
      ]
    }
  ]
}
\`\`\`

**MANDATORY**: ALWAYS include BOTH "in" AND "out" animations for EVERY element. The "out" animation is the reverse of the "in" animation.

### Common Animation Patterns (use these!):
- **Slide Left**: in: translateX(-50px)→translateX(0), out: translateX(0)→translateX(-50px)
- **Slide Right**: in: translateX(50px)→translateX(0), out: translateX(0)→translateX(50px)
- **Slide Up**: in: translateY(50px)→translateY(0), out: translateY(0)→translateY(-50px)
- **Slide Down**: in: translateY(-50px)→translateY(0), out: translateY(0)→translateY(50px)
- **Fade**: in: opacity 0→1, out: opacity 1→0
- **Scale**: in: scale(0.8)→scale(1), out: scale(1)→scale(0.8)
- **Combined**: Use both transform and opacity together for professional look

### For UPDATING existing elements (use ID from context!):
\`\`\`json
{
  "action": "update",
  "elements": [
    {
      "id": "uuid-from-existing-element",
      "styles": { "backgroundColor": "#ff0000" }
    }
  ]
}
\`\`\`

### For DELETING elements:
\`\`\`json
{
  "action": "delete",
  "elementsToDelete": ["uuid-1", "uuid-2"]
}
\`\`\`

## Element Types

### Core Elements
- **text**: Labels, names, titles (supports motion animations)
- **shape**: Backgrounds, containers (rectangle/ellipse, supports gradients & glass)
- **image**: Logos, photos (supports border, corner radius, blur)
- **icon**: Icons from Lucide, FontAwesome, Lottie animations, or Weather icons
- **svg**: SVG graphics (supports patterns from hero-patterns library)
- **table**: Data tables/grids (standings, statistics with customizable styling)
- **video**: Video embeds (YouTube, Vimeo, file uploads)
- **map**: Maps and locations (Mapbox GL)
- **chart**: Charts and graphs (bar, line, pie, donut, gauge with D3/Chart.js)
- **ticker**: Scrolling text tickers (scroll, flip, fade modes)
- **topic-badge**: Dynamic topic indicators (linked to tickers, customizable styling)

## Text Animations (Motion Library)
Text elements support rich animations using the Motion library. You can animate text with:

### Animation Types:
- **fade**: Fade in/out (opacity animation)
- **slide**: Slide from side (x/y translation)
- **scale**: Scale up/down (size animation)
- **blur**: Blur in/out (filter animation)
- **glow**: Glow effect (text-shadow animation)
- **typewriter**: Character-by-character reveal
- **wave**: Wave motion (y-axis animation)
- **bounce**: Bounce effect (y + scale)
- **custom**: Custom properties (full control)

### Text Animation Format:
\`\`\`json
{
  "content": {
    "type": "text",
    "text": "Animated Text",
    "animation": {
      "enabled": true,
      "type": "fade",
      "duration": 1.0,
      "delay": 0.2,
      "easing": "ease-out",
      "direction": "in"
    }
  }
}
\`\`\`

### Keyframe Animations:
For complex animations, use keyframes in the Timeline. Keyframes allow animating any CSS property over time:
\`\`\`json
{
  "animation": {
    "enabled": true,
    "type": "custom",
    "keyframes": [
      { "offset": 0, "properties": { "opacity": 0, "x": -100 } },
      { "offset": 0.5, "properties": { "opacity": 1, "x": 0 } },
      { "offset": 1, "properties": { "opacity": 0.8, "x": 50 } }
    ]
  }
}
\`\`\`

### Animation Properties:
- **duration**: Animation duration in seconds (0.1-10)
- **delay**: Delay before animation starts (0-5 seconds)
- **easing**: CSS easing function ("linear", "ease-in", "ease-out", "ease-in-out", "ease", or cubic-bezier)
- **direction**: "in" (entrance), "out" (exit), "in-out" (both)
- **keyframes**: Array of keyframe objects with offset (0-1) and properties (CSS properties as strings/numbers)

### Common Animation Examples:
- **Fade in**: type: "fade", direction: "in", duration: 0.5
- **Slide from left**: type: "slide", direction: "in", duration: 0.8
- **Bounce entrance**: type: "bounce", direction: "in", duration: 1.0
- **Glow effect**: type: "glow", direction: "in", duration: 1.5

## Shape Elements (Advanced Styling)

Shapes support gradients and glass effects via "content" (not "styles"):

### Gradient Fill:
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "gradient": {
      "enabled": true,
      "type": "linear",  // or "radial", "conic"
      "direction": 90,   // For linear: 0=right, 90=down, 180=left, 270=up
      "colors": [
        { "color": "#3B82F6", "stop": 0 },
        { "color": "#1D4ED8", "stop": 100 }
      ]
    }
  }
}
\`\`\`

### Glass Effect (Frosted):
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "glass": {
      "enabled": true,
      "blur": 16,           // 0-50px
      "opacity": 0.6,       // 0-1
      "borderWidth": 1,
      "borderColor": "rgba(255, 255, 255, 0.1)",
      "saturation": 120     // 0-200%
    }
  }
}
\`\`\`

**Note**: Gradient and glass can be used together - gradient provides background, glass adds blur on top.

## Image Elements

Images support styling via "content":
\`\`\`json
{
  "content": {
    "type": "image",
    "src": "https://example.com/image.jpg",
    "fit": "cover",        // cover, contain, fill, none, scale-down
    "border": {
      "enabled": true,
      "width": 2,
      "color": "#FFFFFF"
    },
    "cornerRadius": 8,
    "blur": {
      "enabled": true,
      "amount": 5          // 0-50px
    }
  }
}
\`\`\`

### Sports Team Logos (TheSportsDB)
For sports graphics, use official team logos. **IMPORTANT**: Only use exact URLs from this list - do NOT guess or construct URLs.

**NFL Teams** (all 32):
- Arizona Cardinals: \`https://r2.thesportsdb.com/images/media/team/badge/xvuwtw1420646838.png\`
- Atlanta Falcons: \`https://r2.thesportsdb.com/images/media/team/badge/rrpvpr1420658174.png\`
- Baltimore Ravens: \`https://r2.thesportsdb.com/images/media/team/badge/einz3p1546172463.png\`
- Buffalo Bills: \`https://r2.thesportsdb.com/images/media/team/badge/6pb37b1515849026.png\`
- Carolina Panthers: \`https://r2.thesportsdb.com/images/media/team/badge/xxyvvy1420940478.png\`
- Chicago Bears: \`https://r2.thesportsdb.com/images/media/team/badge/ji22531698678538.png\`
- Cincinnati Bengals: \`https://r2.thesportsdb.com/images/media/team/badge/qqtwwv1420941670.png\`
- Cleveland Browns: \`https://r2.thesportsdb.com/images/media/team/badge/squvxy1420942389.png\`
- Dallas Cowboys: \`https://r2.thesportsdb.com/images/media/team/badge/wrxssu1450018209.png\`
- Denver Broncos: \`https://r2.thesportsdb.com/images/media/team/badge/upsspx1421635647.png\`
- Detroit Lions: \`https://r2.thesportsdb.com/images/media/team/badge/lgsgkr1546168257.png\`
- Green Bay Packers: \`https://r2.thesportsdb.com/images/media/team/badge/rqpwtr1421434717.png\`
- Houston Texans: \`https://r2.thesportsdb.com/images/media/team/badge/wqyryy1421436627.png\`
- Indianapolis Colts: \`https://r2.thesportsdb.com/images/media/team/badge/wqqvpx1421434058.png\`
- Jacksonville Jaguars: \`https://r2.thesportsdb.com/images/media/team/badge/0mrsd41546427902.png\`
- Kansas City Chiefs: \`https://r2.thesportsdb.com/images/media/team/badge/936t161515847222.png\`
- Las Vegas Raiders: \`https://r2.thesportsdb.com/images/media/team/badge/xqusqy1421724291.png\`
- Los Angeles Chargers: \`https://r2.thesportsdb.com/images/media/team/badge/vrqanp1687734910.png\`
- Los Angeles Rams: \`https://r2.thesportsdb.com/images/media/team/badge/8e8v4i1599764614.png\`
- Miami Dolphins: \`https://r2.thesportsdb.com/images/media/team/badge/trtusv1421435081.png\`
- Minnesota Vikings: \`https://r2.thesportsdb.com/images/media/team/badge/qstqqr1421609163.png\`
- New England Patriots: \`https://r2.thesportsdb.com/images/media/team/badge/xtwxyt1421431860.png\`
- New Orleans Saints: \`https://r2.thesportsdb.com/images/media/team/badge/nd46c71537821337.png\`
- New York Giants: \`https://r2.thesportsdb.com/images/media/team/badge/vxppup1423669459.png\`
- New York Jets: \`https://r2.thesportsdb.com/images/media/team/badge/hz92od1607953467.png\`
- Philadelphia Eagles: \`https://r2.thesportsdb.com/images/media/team/badge/pnpybf1515852421.png\`
- Pittsburgh Steelers: \`https://r2.thesportsdb.com/images/media/team/badge/2975411515853129.png\`
- San Francisco 49ers: \`https://r2.thesportsdb.com/images/media/team/badge/bqbtg61539537328.png\`
- Seattle Seahawks: \`https://r2.thesportsdb.com/images/media/team/badge/wwuqyr1421434817.png\`
- Tampa Bay Buccaneers: \`https://r2.thesportsdb.com/images/media/team/badge/2dfpdl1537820969.png\`
- Tennessee Titans: \`https://r2.thesportsdb.com/images/media/team/badge/m48yia1515847376.png\`
- Washington Commanders: \`https://r2.thesportsdb.com/images/media/team/badge/rn0c7v1643826119.png\`

**NBA Teams** (all 30):
- Atlanta Hawks: \`https://r2.thesportsdb.com/images/media/team/badge/q3bx641635067495.png\`
- Boston Celtics: \`https://r2.thesportsdb.com/images/media/team/badge/4j85bn1667936589.png\`
- Brooklyn Nets: \`https://r2.thesportsdb.com/images/media/team/badge/hkafe61739948361.png\`
- Charlotte Hornets: \`https://r2.thesportsdb.com/images/media/team/badge/xqtvvp1422380623.png\`
- Chicago Bulls: \`https://r2.thesportsdb.com/images/media/team/badge/yk7swg1547214677.png\`
- Cleveland Cavaliers: \`https://r2.thesportsdb.com/images/media/team/badge/tys75k1664478652.png\`
- Dallas Mavericks: \`https://r2.thesportsdb.com/images/media/team/badge/yqrxrs1420568796.png\`
- Denver Nuggets: \`https://r2.thesportsdb.com/images/media/team/badge/8o8j5k1546016274.png\`
- Detroit Pistons: \`https://r2.thesportsdb.com/images/media/team/badge/lg7qrc1621594751.png\`
- Golden State Warriors: \`https://r2.thesportsdb.com/images/media/team/badge/irobi61565197527.png\`
- Houston Rockets: \`https://r2.thesportsdb.com/images/media/team/badge/yezpho1597486052.png\`
- Indiana Pacers: \`https://r2.thesportsdb.com/images/media/team/badge/v6jzgm1503741821.png\`
- Los Angeles Clippers: \`https://r2.thesportsdb.com/images/media/team/badge/3gtb8s1719303125.png\`
- Los Angeles Lakers: \`https://r2.thesportsdb.com/images/media/team/badge/d8uoxw1714254511.png\`
- Memphis Grizzlies: \`https://r2.thesportsdb.com/images/media/team/badge/m64v461565196789.png\`
- Miami Heat: \`https://r2.thesportsdb.com/images/media/team/badge/5v67x51547214763.png\`
- Milwaukee Bucks: \`https://r2.thesportsdb.com/images/media/team/badge/olhug01621594702.png\`
- Minnesota Timberwolves: \`https://r2.thesportsdb.com/images/media/team/badge/5xpgjg1621594771.png\`
- New Orleans Pelicans: \`https://r2.thesportsdb.com/images/media/team/badge/cak6261696446261.png\`
- New York Knicks: \`https://r2.thesportsdb.com/images/media/team/badge/wyhpuf1511810435.png\`
- Oklahoma City Thunder: \`https://r2.thesportsdb.com/images/media/team/badge/27v8861746610370.png\`
- Orlando Magic: \`https://r2.thesportsdb.com/images/media/team/badge/sjsv3b1748974231.png\`
- Philadelphia 76ers: \`https://r2.thesportsdb.com/images/media/team/badge/71545f1518464849.png\`
- Phoenix Suns: \`https://r2.thesportsdb.com/images/media/team/badge/qrtuxq1422919040.png\`
- Portland Trail Blazers: \`https://r2.thesportsdb.com/images/media/team/badge/ljkd1r1696445959.png\`
- Sacramento Kings: \`https://r2.thesportsdb.com/images/media/team/badge/5d3dpz1611859587.png\`
- San Antonio Spurs: \`https://r2.thesportsdb.com/images/media/team/badge/obucan1611859537.png\`
- Toronto Raptors: \`https://r2.thesportsdb.com/images/media/team/badge/ax36vz1635070057.png\`
- Utah Jazz: \`https://r2.thesportsdb.com/images/media/team/badge/9v9c5p1751703267.png\`
- Washington Wizards: \`https://r2.thesportsdb.com/images/media/team/badge/rhxi9w1621594729.png\`

**MLB Teams** (all 30):
- Arizona Diamondbacks: \`https://r2.thesportsdb.com/images/media/team/badge/xe5wlo1713861863.png\`
- Atlanta Braves: \`https://r2.thesportsdb.com/images/media/team/badge/yjs76e1617811496.png\`
- Baltimore Orioles: \`https://r2.thesportsdb.com/images/media/team/badge/ytywvu1431257088.png\`
- Boston Red Sox: \`https://r2.thesportsdb.com/images/media/team/badge/stpsus1425120215.png\`
- Chicago Cubs: \`https://r2.thesportsdb.com/images/media/team/badge/wxbe071521892391.png\`
- Chicago White Sox: \`https://r2.thesportsdb.com/images/media/team/badge/yyz5dh1554140884.png\`
- Cincinnati Reds: \`https://r2.thesportsdb.com/images/media/team/badge/wspusr1431538832.png\`
- Cleveland Guardians: \`https://r2.thesportsdb.com/images/media/team/badge/3zvzao1640964590.png\`
- Colorado Rockies: \`https://r2.thesportsdb.com/images/media/team/badge/r7q6ko1687608395.png\`
- Detroit Tigers: \`https://r2.thesportsdb.com/images/media/team/badge/9dib6o1554032173.png\`
- Houston Astros: \`https://r2.thesportsdb.com/images/media/team/badge/miwigx1521893583.png\`
- Kansas City Royals: \`https://r2.thesportsdb.com/images/media/team/badge/ii3rz81554031260.png\`
- Los Angeles Angels: \`https://r2.thesportsdb.com/images/media/team/badge/vswsvx1432577476.png\`
- Los Angeles Dodgers: \`https://r2.thesportsdb.com/images/media/team/badge/p2oj631663889783.png\`
- Miami Marlins: \`https://r2.thesportsdb.com/images/media/team/badge/0722fs1546001701.png\`
- Milwaukee Brewers: \`https://r2.thesportsdb.com/images/media/team/badge/08kh2a1595775193.png\`
- Minnesota Twins: \`https://r2.thesportsdb.com/images/media/team/badge/necd5v1521905719.png\`
- New York Mets: \`https://r2.thesportsdb.com/images/media/team/badge/rxqspq1431540337.png\`
- New York Yankees: \`https://r2.thesportsdb.com/images/media/team/badge/wqwwxx1423478766.png\`
- Oakland Athletics: \`https://r2.thesportsdb.com/images/media/team/badge/cyvrv31741640777.png\`
- Philadelphia Phillies: \`https://r2.thesportsdb.com/images/media/team/badge/3xrldf1617528682.png\`
- Pittsburgh Pirates: \`https://r2.thesportsdb.com/images/media/team/badge/kw6uqr1617527138.png\`
- San Diego Padres: \`https://r2.thesportsdb.com/images/media/team/badge/6wt1cn1617527530.png\`
- San Francisco Giants: \`https://r2.thesportsdb.com/images/media/team/badge/mq81yb1521896622.png\`
- Seattle Mariners: \`https://r2.thesportsdb.com/images/media/team/badge/39x9ph1521903933.png\`
- St. Louis Cardinals: \`https://r2.thesportsdb.com/images/media/team/badge/uvyvyr1424003273.png\`
- Tampa Bay Rays: \`https://r2.thesportsdb.com/images/media/team/badge/littyt1554031623.png\`
- Texas Rangers: \`https://r2.thesportsdb.com/images/media/team/badge/qt9qki1521893151.png\`
- Toronto Blue Jays: \`https://r2.thesportsdb.com/images/media/team/badge/f9zk3l1617527686.png\`
- Washington Nationals: \`https://r2.thesportsdb.com/images/media/team/badge/wpqrut1423694764.png\`

**NHL Teams** (all 32):
- Anaheim Ducks: \`https://r2.thesportsdb.com/images/media/team/badge/1d465t1719573796.png\`
- Boston Bruins: \`https://r2.thesportsdb.com/images/media/team/badge/b1r86e1720023232.png\`
- Buffalo Sabres: \`https://r2.thesportsdb.com/images/media/team/badge/3m3jhp1619536655.png\`
- Calgary Flames: \`https://r2.thesportsdb.com/images/media/team/badge/v8vkk11619536610.png\`
- Carolina Hurricanes: \`https://r2.thesportsdb.com/images/media/team/badge/v07m3x1547232585.png\`
- Chicago Blackhawks: \`https://r2.thesportsdb.com/images/media/team/badge/tuwyvr1422041801.png\`
- Colorado Avalanche: \`https://r2.thesportsdb.com/images/media/team/badge/wqutut1421173572.png\`
- Columbus Blue Jackets: \`https://r2.thesportsdb.com/images/media/team/badge/ssytwt1421792535.png\`
- Dallas Stars: \`https://r2.thesportsdb.com/images/media/team/badge/qrvywq1422042125.png\`
- Detroit Red Wings: \`https://r2.thesportsdb.com/images/media/team/badge/1c24ow1546544080.png\`
- Edmonton Oilers: \`https://r2.thesportsdb.com/images/media/team/badge/uxxsyw1421618428.png\`
- Florida Panthers: \`https://r2.thesportsdb.com/images/media/team/badge/8qtaz11547158220.png\`
- Los Angeles Kings: \`https://r2.thesportsdb.com/images/media/team/badge/w408rg1719220748.png\`
- Minnesota Wild: \`https://r2.thesportsdb.com/images/media/team/badge/swtsxs1422042685.png\`
- Montreal Canadiens: \`https://r2.thesportsdb.com/images/media/team/badge/stpryx1421791753.png\`
- Nashville Predators: \`https://r2.thesportsdb.com/images/media/team/badge/twqyvy1422052908.png\`
- New Jersey Devils: \`https://r2.thesportsdb.com/images/media/team/badge/z4rsvp1619536740.png\`
- New York Islanders: \`https://r2.thesportsdb.com/images/media/team/badge/hqn8511619536714.png\`
- New York Rangers: \`https://www.thesportsdb.com/images/media/team/badge/ts2nhq1763454676.png\`
- Ottawa Senators: \`https://r2.thesportsdb.com/images/media/team/badge/2tc1qy1619536592.png\`
- Philadelphia Flyers: \`https://r2.thesportsdb.com/images/media/team/badge/qxxppp1421794965.png\`
- Pittsburgh Penguins: \`https://r2.thesportsdb.com/images/media/team/badge/dsj3on1546192477.png\`
- San Jose Sharks: \`https://r2.thesportsdb.com/images/media/team/badge/yui7871546193006.png\`
- Seattle Kraken: \`https://r2.thesportsdb.com/images/media/team/badge/zsx49m1595775836.png\`
- St. Louis Blues: \`https://r2.thesportsdb.com/images/media/team/badge/rsqtwx1422053715.png\`
- Tampa Bay Lightning: \`https://r2.thesportsdb.com/images/media/team/badge/swysut1421791822.png\`
- Toronto Maple Leafs: \`https://r2.thesportsdb.com/images/media/team/badge/mxig4p1570129307.png\`
- Vancouver Canucks: \`https://r2.thesportsdb.com/images/media/team/badge/xqxxpw1421875519.png\`
- Vegas Golden Knights: \`https://r2.thesportsdb.com/images/media/team/badge/7fd4521619536689.png\`
- Washington Capitals: \`https://r2.thesportsdb.com/images/media/team/badge/99ca9a1638974052.png\`
- Winnipeg Jets: \`https://r2.thesportsdb.com/images/media/team/badge/bwn9hr1547233611.png\`

**For sports graphics**: Use \`fit: "contain"\` to preserve logo aspect ratio.

## Icon Elements

Icons from multiple libraries:
\`\`\`json
{
  "element_type": "icon",
  "width": 80,           // Container width (for positioning)
  "height": 80,          // Container height (for positioning)
  "content": {
    "type": "icon",
    "library": "lucide",   // "lucide", "fontawesome", "lottie", "weather"
    "iconName": "Star",    // Icon name (varies by library)
    "size": 48,            // ICON SIZE in pixels (NOT container size!)
    "color": "#FFFFFF",
    "weight": "solid"      // For FontAwesome: "solid", "regular", "brands"
  }
}
\`\`\`

**IMPORTANT - Icon Size vs Container Size:**
- **content.size**: The actual icon size in pixels (e.g., 48px icon)
- **width/height**: The container size for positioning (icon is centered within)
- Example: A 48px icon in a 100x100 container will be centered

**Display Icon Libraries:**
- **lucide**: Modern icons - Star, Heart, Settings, Sun, Cloud, Wind, Thermometer, etc.
- **fontawesome**: FontAwesome icons (weight: "solid"/"regular"/"brands")
- **lottie**: Animated Lottie JSON (use lottieUrl or lottieJson)

**Weather Icon Libraries** (library: "weather"):
- **Meteocons** (47 icons): meteocons-1 to meteocons-47
  - meteocons-1 (Sun), meteocons-2 (Moon), meteocons-3 (Partly Cloudy Day)
  - meteocons-7 (Light Rain), meteocons-8 (Rain), meteocons-13 (Snow)
  - meteocons-19 (Thunder), meteocons-20 (Thunderstorm), meteocons-23 (Wind)

- **Weather Icons** (69 common icons): wi-day-sunny, wi-night-clear, wi-cloud, etc.
  - Day: wi-day-sunny, wi-day-cloudy, wi-day-rain, wi-day-snow, wi-day-thunderstorm
  - Night: wi-night-clear, wi-night-alt-cloudy, wi-night-alt-rain, wi-night-alt-snow
  - Neutral: wi-cloud, wi-cloudy, wi-rain, wi-snow, wi-thunderstorm, wi-fog
  - Temperature: wi-thermometer, wi-celsius, wi-fahrenheit, wi-humidity
  - Misc: wi-sunrise, wi-sunset, wi-windy, wi-strong-wind, wi-tornado

- **Basicons** (12 weather icons): basicons-sun-day, basicons-cloud, basicons-rain-cloud-weather, etc.

**Weather Icon Examples (ALWAYS include color!):**
\`\`\`json
// Sunny weather - note: color is REQUIRED, use white for dark backgrounds
{ "library": "weather", "iconName": "meteocons-1", "size": 64, "color": "#FFFFFF" }
{ "library": "weather", "iconName": "wi-day-sunny", "size": 64, "color": "#FFD700" }

// Rain
{ "library": "weather", "iconName": "meteocons-8", "size": 64, "color": "#FFFFFF" }
{ "library": "weather", "iconName": "wi-rain", "size": 64, "color": "#87CEEB" }

// Temperature
{ "library": "weather", "iconName": "meteocons-31", "size": 48, "color": "#FFFFFF" }
{ "library": "weather", "iconName": "wi-thermometer", "size": 48, "color": "#FF6B6B" }
\`\`\`

## SVG Elements

SVG graphics with optional patterns:
\`\`\`json
{
  "element_type": "svg",
  "content": {
    "type": "svg",
    "svgContent": "<svg>...</svg>",  // Or use "src" for URL
    "pattern": {
      "type": "hero-pattern",         // or "custom"
      "patternName": "dots",          // hero-pattern name
      "color": "#FFFFFF",
      "opacity": 0.1
    }
  }
}
\`\`\`

## Table/Grid Elements

Data tables for standings, statistics:
\`\`\`json
{
  "element_type": "table",
  "content": {
    "type": "table",
    "columns": [
      { "id": "col1", "header": "Team", "accessorKey": "team", "width": 200, "align": "left" },
      { "id": "col2", "header": "W", "accessorKey": "wins", "width": 80, "align": "center", "format": "number" }
    ],
    "data": [
      { "id": "row1", "team": "Team A", "wins": 10 },
      { "id": "row2", "team": "Team B", "wins": 8 }
    ],
    "showHeader": true,
    "striped": false,
    "bordered": false,
    "headerBackgroundColor": "#000000",
    "headerTextColor": "#FFFFFF",
    "rowBackgroundColor": "transparent",
    "rowTextColor": "#FFFFFF"
  }
}
\`\`\`

## Charts

Use element_type "chart" (not "d3-chart"):
\`\`\`json
{
  "element_type": "chart",
  "content": {
    "type": "chart",
    "chartType": "bar",    // "bar", "line", "pie", "donut", "gauge"
    "data": {
      "labels": ["A", "B", "C"],
      "datasets": [{
        "label": "Values",
        "data": [10, 20, 30]
      }]
    },
    "options": {
      "showLegend": true,
      "animated": true,
      "colors": ["#3B82F6", "#EF4444", "#22C55E"],
      "titleFontSize": 24,
      "barBorderRadius": 4
    }
  }
}
\`\`\`

**Chart Types**: bar, line, pie, donut, gauge
**Styling**: Colors (global/per-bar), fonts (title/labels/values/legend), bar options (border, radius, spacing), line options (width, tension), axis/grid controls

## Maps (Mapbox GL)

Interactive map elements with markers, location animations, and custom marker templates.

### Basic Map:
\`\`\`json
{
  "element_type": "map",
  "content": {
    "type": "map",
    "mapStyle": "dark",
    "center": [-74.006, 40.7128],  // [longitude, latitude]
    "zoom": 12,
    "pitch": 0,                    // Camera tilt (0-85 degrees)
    "bearing": 0,                  // Camera rotation (0-360 degrees)
    "projection": "mercator"       // Map projection
  }
}
\`\`\`

### Map Styles:
- **streets**: Default street map
- **outdoors**: Terrain and outdoor features
- **light**: Light minimal style
- **dark**: Dark minimal style (best for broadcast)
- **satellite**: Satellite imagery
- **satellite-streets**: Satellite with street labels
- **navigation-day**: Navigation optimized (day)
- **navigation-night**: Navigation optimized (night)

### Map Projections:
- **mercator**: Standard flat projection (default)
- **globe**: 3D globe view
- **albers**: Conic projection (good for US)
- **equalEarth**: Equal-area projection
- **equirectangular**: Cylindrical projection
- **naturalEarth**: Compromise projection
- **winkelTripel**: Balanced world map projection

### Simple Markers:
\`\`\`json
{
  "element_type": "map",
  "content": {
    "type": "map",
    "mapStyle": "dark",
    "center": [-74.006, 40.7128],
    "zoom": 10,
    "markers": [
      {
        "id": "marker1",
        "lng": -74.006,
        "lat": 40.7128,
        "color": "#EF4444",
        "label": "New York City",
        "popup": "Population: 8.3M",
        "visible": true
      }
    ]
  }
}
\`\`\`

### Marker Templates (Advanced):
Create reusable marker designs with icons, text, and shapes for weather maps, traffic overlays, etc.

\`\`\`json
{
  "element_type": "map",
  "content": {
    "type": "map",
    "mapStyle": "dark",
    "center": [-98.5795, 39.8283],
    "zoom": 4,
    "markerTemplates": [
      {
        "id": "weather-template",
        "name": "Weather Marker",
        "width": 80,
        "height": 100,
        "anchorX": 0.5,
        "anchorY": 1,
        "elements": [
          {
            "type": "shape",
            "offsetX": 0,
            "offsetY": 0,
            "width": 80,
            "height": 80,
            "shapeType": "rectangle",
            "fill": "rgba(0,0,0,0.7)",
            "cornerRadius": 8
          },
          {
            "type": "icon",
            "offsetX": 20,
            "offsetY": 8,
            "iconLibrary": "weather",
            "iconName": "meteocons-1",
            "iconSize": 40,
            "iconColor": "#FFD700"
          },
          {
            "type": "text",
            "offsetX": 10,
            "offsetY": 55,
            "width": 60,
            "text": "{{temperature}}",
            "fontSize": 18,
            "fontWeight": 700,
            "textColor": "#FFFFFF",
            "textAlign": "center"
          }
        ]
      }
    ],
    "markers": [
      {
        "id": "nyc-weather",
        "lng": -74.006,
        "lat": 40.7128,
        "templateId": "weather-template",
        "data": { "temperature": "72°F", "city": "NYC" }
      },
      {
        "id": "la-weather",
        "lng": -118.2437,
        "lat": 34.0522,
        "templateId": "weather-template",
        "data": { "temperature": "85°F", "city": "LA" }
      }
    ]
  }
}
\`\`\`

**Marker Template Elements:**
- **shape**: Rectangle/ellipse backgrounds with fill, stroke, cornerRadius
- **text**: Dynamic text with \`{{placeholder}}\` syntax for data binding
- **icon**: Icons from lucide, fontawesome, or weather libraries
- **image**: Image elements with imageSrc

**Data Binding:** Use \`{{key}}\` in text elements to bind to marker.data values.

### Location Keyframes (Animation):
Animate the map camera between locations over time:

\`\`\`json
{
  "element_type": "map",
  "content": {
    "type": "map",
    "mapStyle": "satellite-streets",
    "center": [-74.006, 40.7128],
    "zoom": 12,
    "animateLocation": true,
    "animationDuration": 2000,
    "animationEasing": "ease-in-out",
    "locationKeyframes": [
      {
        "id": "kf1",
        "time": 0,
        "lng": -74.006,
        "lat": 40.7128,
        "zoom": 12,
        "pitch": 0,
        "bearing": 0
      },
      {
        "id": "kf2",
        "time": 3000,
        "lng": -118.2437,
        "lat": 34.0522,
        "zoom": 10,
        "pitch": 45,
        "bearing": 90
      }
    ]
  }
}
\`\`\`

### Weather Map Example:
\`\`\`json
{
  "element_type": "map",
  "name": "Weather Map",
  "position_x": 100,
  "position_y": 100,
  "width": 800,
  "height": 500,
  "content": {
    "type": "map",
    "mapStyle": "dark",
    "center": [-98.5795, 39.8283],
    "zoom": 4,
    "pitch": 30,
    "markerTemplates": [
      {
        "id": "temp-marker",
        "name": "Temperature",
        "width": 60,
        "height": 70,
        "anchorX": 0.5,
        "anchorY": 1,
        "elements": [
          {
            "type": "shape",
            "offsetX": 0,
            "offsetY": 0,
            "width": 60,
            "height": 50,
            "shapeType": "rectangle",
            "fill": "rgba(59, 130, 246, 0.8)",
            "cornerRadius": 6
          },
          {
            "type": "text",
            "offsetX": 5,
            "offsetY": 15,
            "width": 50,
            "text": "{{temp}}",
            "fontSize": 20,
            "fontWeight": 700,
            "textColor": "#FFFFFF",
            "textAlign": "center"
          }
        ]
      }
    ],
    "markers": [
      { "id": "m1", "lng": -74.006, "lat": 40.7128, "templateId": "temp-marker", "data": { "temp": "68°" } },
      { "id": "m2", "lng": -87.6298, "lat": 41.8781, "templateId": "temp-marker", "data": { "temp": "72°" } },
      { "id": "m3", "lng": -118.2437, "lat": 34.0522, "templateId": "temp-marker", "data": { "temp": "82°" } },
      { "id": "m4", "lng": -95.3698, "lat": 29.7604, "templateId": "temp-marker", "data": { "temp": "88°" } }
    ]
  }
}
\`\`\`

### Common City Coordinates:
- New York: [-74.006, 40.7128]
- Los Angeles: [-118.2437, 34.0522]
- Chicago: [-87.6298, 41.8781]
- Houston: [-95.3698, 29.7604]
- Miami: [-80.1918, 25.7617]
- Seattle: [-122.3321, 47.6062]
- Denver: [-104.9903, 39.7392]
- London: [-0.1276, 51.5074]
- Paris: [2.3522, 48.8566]
- Tokyo: [139.6917, 35.6895]

## Topic Badge Elements

Dynamic topic indicators (often linked to tickers):
\`\`\`json
{
  "element_type": "topic-badge",
  "content": {
    "type": "topic-badge",
    "defaultTopic": "news",    // "news", "sports", "finance", "weather", "breaking"
    "customLabel": "BREAKING",
    "showIcon": true,
    "animated": true,
    "customStyle": {
      "fontSize": 14,
      "fontFamily": "Inter",
      "fill": "#EF4444",
      "gradient": { "enabled": false },
      "glass": { "enabled": false }
    }
  }
}
\`\`\`

Topic badges support same styling as shapes: gradients, glass effects, custom fonts.

## Styling Reference (IMPORTANT!)

### Glass Effects (Glassmorphism)

**For shapes**: Use "content.glass" (see Shape Elements section above)

**For other elements**: Use "styles" with backdrop-filter:
\`\`\`json
{
  "styles": {
    "backgroundColor": "rgba(0, 0, 0, 0.6)",
    "backdropFilter": "blur(16px)",
    "WebkitBackdropFilter": "blur(16px)",
    "border": "1px solid rgba(255, 255, 255, 0.1)",
    "borderRadius": "12px"
  }
}
\`\`\`

Glass variations:
- **Light glass**: backgroundColor: "rgba(255, 255, 255, 0.1)", blur 12-16px
- **Dark glass**: backgroundColor: "rgba(0, 0, 0, 0.6)", blur 16-24px
- **Frosted**: blur 20-40px
- **Colored**: rgba(59, 130, 246, 0.3) for blue, rgba(239, 68, 68, 0.3) for red

### Drop Shadows (boxShadow)
- **Subtle**: "0 2px 8px rgba(0, 0, 0, 0.15)"
- **Medium**: "0 4px 16px rgba(0, 0, 0, 0.2)"
- **Elevated**: "0 8px 32px rgba(0, 0, 0, 0.3)"
- **Dramatic**: "0 20px 60px rgba(0, 0, 0, 0.4)"
- **Glow (blue)**: "0 0 30px rgba(59, 130, 246, 0.6), 0 8px 32px rgba(0, 0, 0, 0.3)"
- **Glow (red)**: "0 0 30px rgba(239, 68, 68, 0.6), 0 8px 32px rgba(0, 0, 0, 0.3)"

### Gradient Backgrounds

**For shapes**: Use "content.gradient" (see Shape Elements section above)

**For other elements**: Use "styles.background" (not backgroundColor):
- **Horizontal blue**: "linear-gradient(90deg, #3B82F6 0%, #1D4ED8 100%)"
- **Diagonal purple**: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)"
- **Sports dark**: "linear-gradient(180deg, #1E3A5F 0%, #0D1B2A 100%)"
- **Gold premium**: "linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #F59E0B 100%)"

### Text Shadows
- **Subtle**: "0 2px 4px rgba(0, 0, 0, 0.3)"
- **Heavy**: "0 4px 16px rgba(0, 0, 0, 0.7)"
- **Glow**: "0 0 20px rgba(59, 130, 246, 0.8)"

### Border Radius
- **Subtle**: 4-8px
- **Rounded**: 12-16px
- **Pill**: "9999px"
- **Circle**: "50%"

### Complete Preset Examples:

**Modern Lower Third (Shape with Glass)**:
\`\`\`json
{
  "element_type": "shape",
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "glass": {
      "enabled": true,
      "blur": 16,
      "opacity": 0.7,
      "borderWidth": 1,
      "borderColor": "rgba(255, 255, 255, 0.1)"
    }
  },
  "styles": {
    "borderLeft": "4px solid #3B82F6",
    "boxShadow": "0 8px 32px rgba(0, 0, 0, 0.4)"
  }
}
\`\`\`

**Premium Card (Shape with Gradient + Glass)**:
\`\`\`json
{
  "element_type": "shape",
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "gradient": {
      "enabled": true,
      "type": "linear",
      "direction": 135,
      "colors": [
        { "color": "rgba(139, 92, 246, 0.3)", "stop": 0 },
        { "color": "rgba(59, 130, 246, 0.3)", "stop": 100 }
      ]
    },
    "glass": {
      "enabled": true,
      "blur": 20,
      "opacity": 0.6
    }
  },
  "styles": {
    "boxShadow": "0 0 40px rgba(139, 92, 246, 0.3), 0 8px 32px rgba(0, 0, 0, 0.3)"
  }
}
\`\`\`

**Score Bug (Simple Shape)**:
\`\`\`json
{
  "element_type": "shape",
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "fill": "rgba(0, 0, 0, 0.85)"
  },
  "styles": {
    "borderRadius": "8px",
    "boxShadow": "0 4px 24px rgba(0, 0, 0, 0.5)"
  }
}
\`\`\`

### Font Sizes
- **Headline**: 32-48px, fontWeight: 700-800
- **Name**: 28-36px, fontWeight: 600-700
- **Title/Subtitle**: 18-24px, fontWeight: 400-500

### Key Colors
- Blue: #3B82F6, Red: #EF4444, Green: #22C55E
- Purple: #8B5CF6, Gold: #F59E0B, Teal: #14B8A6

## Ticker Elements

Scrolling text tickers with multiple modes:
\`\`\`json
{
  "element_type": "ticker",
  "content": {
    "type": "ticker",
    "items": [
      { "id": "1", "content": "Breaking: First item" },
      { "id": "2", "content": "Second item" }
    ],
    "config": {
      "mode": "scroll",      // "scroll", "flip", "fade", "slide"
      "direction": "left",
      "speed": 50,
      "gap": 60
    }
  }
}
\`\`\`

## Text Elements (Advanced Typography)

Text elements support comprehensive typography controls similar to Photoshop:

### Text Alignment & Justification:
\`\`\`json
{
  "element_type": "text",
  "styles": {
    "textAlign": "left",      // "left", "center", "right", "justify"
    "verticalAlign": "middle" // "top", "middle", "bottom"
  },
  "content": {
    "type": "text",
    "text": "Sample Text"
  }
}
\`\`\`

### Text Spacing:
\`\`\`json
{
  "element_type": "text",
  "styles": {
    "lineHeight": "1.5",           // Unitless multiplier (0.5-5.0) or "24px"
    "letterSpacing": "2px",        // Character spacing in pixels
    "wordSpacing": "4px"            // Word spacing in pixels
  },
  "content": {
    "type": "text",
    "text": "Sample Text"
  }
}
\`\`\`

### Complete Text Example:
\`\`\`json
{
  "element_type": "text",
  "name": "Headline",
  "position_x": 100,
  "position_y": 100,
  "width": 800,
  "height": 100,
  "styles": {
    "fontSize": "48px",
    "fontFamily": "Oswald",
    "fontWeight": "700",
    "color": "#FFFFFF",
    "textAlign": "center",          // left, center, right, justify
    "verticalAlign": "middle",       // top, middle, bottom
    "lineHeight": "1.2",             // Line spacing (unitless or px)
    "letterSpacing": "1px",         // Character spacing
    "wordSpacing": "2px",            // Word spacing
    "textShadow": "0 2px 8px rgba(0, 0, 0, 0.5)"
  },
  "content": {
    "type": "text",
    "text": "Breaking News"
  }
}
\`\`\`

**Text Properties Summary**:
- **textAlign**: "left" | "center" | "right" | "justify" - Horizontal alignment
- **verticalAlign**: "top" | "middle" | "bottom" - Vertical alignment within container
- **lineHeight**: Number (0.5-5.0) or string with units - Line spacing
- **letterSpacing**: Number with "px" - Character spacing
- **wordSpacing**: Number with "px" - Word spacing
- **fontSize**: Number with "px" - Text size
- **fontFamily**: String - Font name
- **fontWeight**: Number (100-900) or string - Font weight
- **color**: Hex color string - Text color

## Quick Element Reference

| Element Type | Use Case | Key Properties |
|-------------|----------|----------------|
| **text** | Labels, titles | text, animation (motion library), textAlign, verticalAlign, lineHeight, letterSpacing, wordSpacing |
| **shape** | Backgrounds, containers | shape (rectangle/ellipse), fill, gradient, glass |
| **image** | Logos, photos | src, fit, border, cornerRadius, blur |
| **icon** | Icons | library (lucide/fontawesome/lottie/weather), iconName, size, **color (REQUIRED - use #FFFFFF for white)**. Weather library includes Meteocons, Weather Icons (Erik Flowers), QWeather, and Weather Iconic |
| **svg** | Vector graphics | svgContent/src, pattern (hero-patterns) |
| **table** | Data tables | columns, data, styling options |
| **chart** | Charts/graphs | chartType, data, options (colors, fonts, styling) |
| **map** | Maps, weather overlays | mapStyle, center, zoom, pitch, bearing, projection, markers, markerTemplates (with data binding), locationKeyframes |
| **video** | Video embeds | src, videoType (youtube/vimeo/file) |
| **ticker** | Scrolling text | items, config (mode, direction, speed) |
| **topic-badge** | Topic indicators | defaultTopic, customStyle (gradient/glass) |

## Important Notes

1. **Shapes**: Use "content.gradient" and "content.glass" (NOT "styles") for gradients and glass effects
2. **Other elements**: Use "styles" for CSS properties (backgroundColor, backdropFilter, etc.)
3. **Gradient + Glass**: Can be combined on shapes - gradient provides background, glass adds blur
4. **Icons**: Default size is 2x larger on canvas (96px if size=48). **IMPORTANT: Always set iconColor explicitly** - default is white (#FFFFFF) for broadcast graphics. Match icon colors to surrounding text colors for visual consistency
5. **Charts**: Support keyframe animations for entrance/exit effects
6. **Text**: Supports motion library animations (fade, slide, scale, blur, glow, typewriter, wave, bounce)
7. **Maps**: Use markerTemplates with \`{{placeholder}}\` text for data-bound markers (weather, traffic). Use locationKeyframes for camera animations between locations.

## Animation Basics

**IMPORTANT: Always include animations when creating new elements!** Every element should have at least an "in" animation.

### Animation Format:
\`\`\`json
{
  "action": "create",
  "layer_type": "fullscreen",
  "elements": [
    {
      "name": "Background",
      "element_type": "shape",
      ...
    }
  ],
  "animations": [
    {
      "element_name": "Background",  // Must match element name exactly
      "phase": "in",                  // "in", "loop", or "out"
      "duration": 500,                // milliseconds
      "delay": 0,                     // milliseconds
      "easing": "ease-out",           // CSS easing function
      "keyframes": [
        {
          "position": 0,              // 0-100 (percentage)
          "properties": {
            "opacity": 0,
            "scale_x": 0.8,
            "scale_y": 0.8
          }
        },
        {
          "position": 100,
          "properties": {
            "opacity": 1,
            "scale_x": 1,
            "scale_y": 1
          }
        }
      ]
    }
  ]
}
\`\`\`

### Common Animation Patterns:

**Fade In:**
\`\`\`json
{
  "element_name": "Element Name",
  "phase": "in",
  "duration": 500,
  "keyframes": [
    { "position": 0, "properties": { "opacity": 0 } },
    { "position": 100, "properties": { "opacity": 1 } }
  ]
}
\`\`\`

**Slide In from Left:**
\`\`\`json
{
  "element_name": "Element Name",
  "phase": "in",
  "duration": 600,
  "easing": "ease-out",
  "keyframes": [
    { "position": 0, "properties": { "opacity": 0, "position_x": -200 } },
    { "position": 100, "properties": { "opacity": 1, "position_x": 100 } }
  ]
}
\`\`\`

**Scale In:**
\`\`\`json
{
  "element_name": "Element Name",
  "phase": "in",
  "duration": 500,
  "easing": "cubic-bezier(0.34, 1.56, 0.64, 1)",
  "keyframes": [
    { "position": 0, "properties": { "opacity": 0, "scale_x": 0.5, "scale_y": 0.5 } },
    { "position": 100, "properties": { "opacity": 1, "scale_x": 1, "scale_y": 1 } }
  ]
}
\`\`\`

**Fade Out:**
\`\`\`json
{
  "element_name": "Element Name",
  "phase": "out",
  "duration": 400,
  "keyframes": [
    { "position": 0, "properties": { "opacity": 1 } },
    { "position": 100, "properties": { "opacity": 0 } }
  ]
}
\`\`\`

### Animation Guidelines:
- **IN phase**: slide-in-left/right/up/down, fade-in, scale-in (500-800ms)
- **OUT phase**: matching exit animations (400-600ms)
- **Easing**: cubic-bezier(0.34, 1.56, 0.64, 1) for bouncy, ease-out for smooth
- **Always include animations** when creating new elements - at minimum, add a fade-in
- **element_name must match** the element's "name" field exactly

**Remember**: Be concise. Only include properties you're actually using. Don't include every possible option unless needed.

**CRITICAL**: When creating elements, ALWAYS include animations in the "animations" array. Every new element should have at least an "in" animation.

After the JSON, briefly explain what you did.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Determine if AI changes are "drastic" and should require user confirmation.
 * Drastic changes include:
 * - Deleting elements
 * - Modifying more than 5 elements at once
 * - Mixed operations (create + delete)
 */
export function isDrasticChange(changes: AIChanges | undefined): boolean {
  if (!changes) return false;

  // Pure deletions always require confirmation
  if (changes.type === 'delete') return true;

  // For create actions, ignore elementsToDelete - we're making a new template anyway
  // The AI sometimes includes elementsToDelete when it shouldn't
  const isCreating = changes.type === 'create';

  // Deletions during update/replace require confirmation
  if (!isCreating && changes.elementsToDelete && changes.elementsToDelete.length > 0) return true;

  // Only flag as drastic if there are a huge number of elements (100+)
  // Broadcast graphics like standings, leaderboards can easily have 60-80 elements
  const elementCount = changes.elements?.length || 0;
  if (elementCount > 100) return true;

  // Mixed operations with deletions
  if (changes.type === 'mixed' && changes.elementsToDelete && changes.elementsToDelete.length > 0) {
    return true;
  }

  return false;
}

export interface ImageAttachment {
  data: string; // Base64 encoded image data (without prefix)
  mimeType: string; // e.g., 'image/png', 'image/jpeg'
}

// Callback type for streaming responses
export type StreamCallback = (chunk: string, fullText: string) => void;

export async function sendChatMessage(
  messages: ChatMessage[],
  context: AIContext,
  modelId?: string,
  images?: ImageAttachment[],
  signal?: AbortSignal
): Promise<AIResponse> {
  // Ensure connection is fresh if browser was idle (prevents stale connection issues)
  await ensureFreshConnectionIfIdle();

  // Get the user's latest message to detect intent
  const lastUserMessage = messages[messages.length - 1]?.content || '';

  // Build dynamic system prompt based on user intent
  const dynamicSystemPrompt = buildDynamicSystemPrompt(lastUserMessage, context);
  const contextInfo = buildDynamicContextMessage(context);

  const selectedModel = modelId || getAIModel();

  // Resolve model config from backend or fallback to hardcoded
  const resolvedConfig = await resolveModelConfig(selectedModel);

  // If we couldn't resolve the config, try with default model
  const fallbackConfig = resolvedConfig || await resolveModelConfig(DEFAULT_AI_MODEL);

  if (!fallbackConfig) {
    throw new Error('No AI model configured. Please configure an AI provider in Nova dashboard or set API keys locally.');
  }

  const provider = fallbackConfig.provider;
  // Create a compatible model config object for the existing send functions
  const modelConfig = {
    id: selectedModel,
    name: selectedModel,
    description: '',
    provider: fallbackConfig.provider,
    apiModel: fallbackConfig.apiModel,
    // Store the resolved API key for use in the send functions
    _resolvedApiKey: fallbackConfig.apiKey,
  };

  // Try Supabase Edge Function first (only in production, without images)
  // In development, Edge Function has CORS issues, so skip directly to direct API
  const shouldTryEdgeFunction = isProductionMode() && (!images || images.length === 0);

  if (shouldTryEdgeFunction) {
    try {
      // Check if already aborted before making the request
      if (signal?.aborted) {
        const abortError = new Error('Request was cancelled');
        abortError.name = 'AbortError';
        throw abortError;
      }

      // Create an AbortController for the Edge Function call
      const edgeFunctionController = new AbortController();

      // Link the external signal to our internal controller
      const abortListener = () => edgeFunctionController.abort();
      signal?.addEventListener('abort', abortListener);

      try {
        const { data, error } = await supabase.functions.invoke('ai-chat', {
          body: {
            message: contextInfo
              ? `[Context]\n${contextInfo}\n[End Context]\n\n${messages[messages.length - 1]?.content || ''}`
              : messages[messages.length - 1]?.content || '',
            history: messages.slice(0, -1).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            systemPrompt: dynamicSystemPrompt,
            model: selectedModel,
            provider: provider,
          },
        });

        // Check if aborted after the request
        if (signal?.aborted) {
          const abortError = new Error('Request was cancelled');
          abortError.name = 'AbortError';
          throw abortError;
        }

        if (error) throw error;

        // Resolve image placeholders in the response (logos, Pexels images, AI-generated)
        const responseText = await resolveImagePlaceholders(data.message || '');
        const changes = parseChangesFromResponse(responseText);

        return {
          message: responseText,
          changes: changes || undefined,
        };
      } finally {
        // Clean up the abort listener
        signal?.removeEventListener('abort', abortListener);
      }
    } catch (edgeFunctionError: any) {
      // If user cancelled, propagate the abort error immediately
      if (edgeFunctionError?.name === 'AbortError' || signal?.aborted) {
        const abortError = new Error('Request was cancelled');
        abortError.name = 'AbortError';
        throw abortError;
      }
      console.warn('Edge function not available, trying direct API...', edgeFunctionError);
    }
  }
  
  // Check if aborted before falling back to direct API
  if (signal?.aborted) {
    const abortError = new Error('Request was cancelled');
    abortError.name = 'AbortError';
    throw abortError;
  }

  // Direct API call (supports images)
  let response: AIResponse;
  if (provider === 'gemini') {
    response = await sendGeminiMessage(messages, context, modelConfig, dynamicSystemPrompt, contextInfo, images, signal);
  } else {
    response = await sendClaudeMessage(messages, context, modelConfig, dynamicSystemPrompt, contextInfo, images, signal);
  }

  // Resolve any image placeholders in the response (logos, Pexels images, AI-generated)
  if (response.message) {
    response.message = await resolveImagePlaceholders(response.message);
  }

  return response;
}

// Helper: Delay function for retry backoff
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Default timeout for AI requests (2 minutes - AI calls can take a while)
const AI_REQUEST_TIMEOUT_MS = 120000;
// Extended timeout for requests with images (3 minutes - image analysis takes longer)
const AI_REQUEST_WITH_IMAGES_TIMEOUT_MS = 180000;

/**
 * Helper: Wrap a fetch with timeout to prevent indefinite hangs
 * Returns an AbortController that can be used to cancel the request
 */
function createTimeoutSignal(timeoutMs: number, existingSignal?: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Set up timeout
  timeoutId = setTimeout(() => {
    console.warn(`⏱️ [AI] Request timed out after ${timeoutMs / 1000} seconds`);
    controller.abort(new DOMException('Request timed out after ' + (timeoutMs / 1000) + ' seconds', 'TimeoutError'));
  }, timeoutMs);

  // If there's an existing signal, listen for its abort
  if (existingSignal) {
    if (existingSignal.aborted) {
      controller.abort(existingSignal.reason);
    } else {
      existingSignal.addEventListener('abort', () => {
        controller.abort(existingSignal.reason);
      }, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}

// Send message to Gemini API with retry logic
async function sendGeminiMessage(
  messages: ChatMessage[],
  context: AIContext,
  modelConfig: { apiModel: string; _resolvedApiKey?: string; provider: AIProvider } & Record<string, any>,
  systemPrompt: string,
  contextInfo: string,
  images?: ImageAttachment[],
  signal?: AbortSignal,
  retryCount: number = 0
): Promise<AIResponse> {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 2000; // 2 seconds

  // Use resolved API key from backend, or fallback to legacy getGeminiApiKey
  const geminiApiKey = modelConfig._resolvedApiKey || getGeminiApiKey();
  const useProxy = shouldUseBackendProxy('gemini');

  // In development without API key, throw a clear error
  if (!useProxy && !geminiApiKey) {
    throw new Error('Gemini API key not configured. Please configure an AI provider in Nova dashboard or set VITE_GEMINI_API_KEY in .env.local.');
  }

  // Build Gemini-format messages (convert assistant to model role)
  const geminiContents: any[] = [
    // Add system instruction as first user message with model acknowledgment
    ...(contextInfo ? [
      { role: 'user', parts: [{ text: `[System Instructions]\n${systemPrompt}\n\n[Context]\n${contextInfo}\n[End Context]` }] },
      { role: 'model', parts: [{ text: 'I understand the instructions and context. I will help you create broadcast graphics and respond with structured JSON when creating elements.' }] },
    ] : [
      { role: 'user', parts: [{ text: `[System Instructions]\n${systemPrompt}` }] },
      { role: 'model', parts: [{ text: 'I understand. I will help you create broadcast graphics and respond with structured JSON when creating elements.' }] },
    ]),
    // Add conversation history (except last message if we have images)
    ...messages.slice(0, images && images.length > 0 ? -1 : undefined).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ];

  // If we have images, add the last user message with images
  if (images && images.length > 0 && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    const parts: any[] = [];

    // Add images first
    images.forEach((img) => {
      parts.push({
        inline_data: {
          mime_type: img.mimeType,
          data: img.data,
        },
      });
    });

    // Add text
    parts.push({ text: lastMessage.content });

    geminiContents.push({
      role: 'user',
      parts,
    });
  }

  // Create timeout signal that also respects the user's abort signal
  const { signal: timeoutSignal, cleanup: cleanupTimeout } = createTimeoutSignal(AI_REQUEST_TIMEOUT_MS, signal);

  try {
    let response;

    if (useProxy) {
      // Use backend proxy for API call
      response = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'gemini',
          model: modelConfig.apiModel,
          messages: geminiContents,
          maxTokens: 16384,
          temperature: 0.7,
        }),
        signal: timeoutSignal,
      });
    } else {
      // Direct API call with user-supplied key
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.apiModel}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: geminiContents,
            generationConfig: {
              maxOutputTokens: 16384,
              temperature: 0.7,
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
          }),
          signal: timeoutSignal,
        }
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `Gemini API request failed: ${response.status}`;

      // Check if it's an overload/rate limit error (503 or 429)
      if ((response.status === 503 || response.status === 429) && retryCount < MAX_RETRIES) {
        const retryDelay = BASE_DELAY * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Gemini API overloaded (${response.status}). Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await delay(retryDelay);
        return sendGeminiMessage(messages, context, modelConfig, systemPrompt, contextInfo, images, signal, retryCount + 1);
      }

      // For overload errors after max retries, provide a user-friendly message
      if (response.status === 503 || response.status === 429) {
        throw new Error('The AI model is currently overloaded. Please wait a moment and try again, or switch to a different model in Settings.');
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Resolve image placeholders before parsing changes (includes AI-generated images)
    const responseText = await resolveImagePlaceholders(rawText);
    const changes = parseChangesFromResponse(responseText);

    // Clean up timeout on success
    cleanupTimeout();

    return {
      message: responseText,
      changes: changes || undefined,
    };
  } catch (fetchError: any) {
    // Clean up timeout on error
    cleanupTimeout();

    // Preserve AbortError for proper cancellation handling
    if (fetchError.name === 'AbortError') {
      throw fetchError;
    }

    // Handle timeout errors
    if (fetchError.name === 'TimeoutError') {
      console.error('❌ [Gemini] Request timed out');
      throw new Error('AI request timed out. Please try again or check your internet connection.');
    }

    // Check if it's a network error that might be retryable
    if (fetchError.message?.includes('overloaded') && retryCount < MAX_RETRIES) {
      const retryDelay = BASE_DELAY * Math.pow(2, retryCount);
      console.log(`Gemini API overloaded. Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await delay(retryDelay);
      return sendGeminiMessage(messages, context, modelConfig, systemPrompt, contextInfo, images, signal, retryCount + 1);
    }

    console.error('Gemini API call failed:', fetchError);
    throw new Error(fetchError.message || 'Failed to connect to Gemini. Please try again.');
  }
}

// Send message to Claude API
async function sendClaudeMessage(
  messages: ChatMessage[],
  _context: AIContext, // Context is now passed via contextInfo parameter
  modelConfig: { apiModel: string; _resolvedApiKey?: string; provider: AIProvider } & Record<string, any>,
  systemPrompt: string,
  contextInfo: string,
  images?: ImageAttachment[],
  signal?: AbortSignal
): Promise<AIResponse> {
  // Use resolved API key from backend, or fallback to legacy getClaudeApiKey
  const claudeApiKey = modelConfig._resolvedApiKey || getClaudeApiKey();
  const useProxy = shouldUseBackendProxy('claude');

  // In development without API key, throw a clear error
  if (!useProxy && !claudeApiKey) {
    throw new Error('Claude API key not configured. Please configure an AI provider in Nova dashboard or set VITE_CLAUDE_API_KEY in .env.local.');
  }

  // Build Claude-format messages
  const apiMessages: any[] = [
    ...(contextInfo ? [{
      role: 'user' as const,
      content: `[Context]\n${contextInfo}\n\n[End Context]`,
    }, {
      role: 'assistant' as const,
      content: 'I understand the context. How can I help you with your broadcast graphics?',
    }] : []),
    // Add conversation history (except last message if we have images)
    ...messages.slice(0, images && images.length > 0 ? -1 : undefined).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  // If we have images, add the last user message with images (Claude vision format)
  if (images && images.length > 0 && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    const content: any[] = [];

    // Add images first
    images.forEach((img) => {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mimeType,
          data: img.data,
        },
      });
    });

    // Add text
    content.push({
      type: 'text',
      text: lastMessage.content,
    });

    apiMessages.push({
      role: 'user',
      content,
    });
  }

  // Create timeout signal that also respects the user's abort signal
  const { signal: timeoutSignal, cleanup: cleanupTimeout } = createTimeoutSignal(AI_REQUEST_TIMEOUT_MS, signal);

  try {
    let response;

    if (useProxy) {
      // Use backend proxy for API call
      response = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'claude',
          model: modelConfig.apiModel,
          messages: apiMessages,
          systemPrompt: systemPrompt,
          maxTokens: 16384,
        }),
        signal: timeoutSignal,
      });
    } else {
      // Direct API call with user-supplied key
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey!,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: modelConfig.apiModel,
          max_tokens: 16384,
          system: systemPrompt,
          messages: apiMessages,
        }),
        signal: timeoutSignal,
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Claude API request failed: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.content?.find((c: any) => c.type === 'text');
    const rawText = textContent?.text || '';
    // Resolve image placeholders before parsing changes (includes AI-generated images)
    const responseText = await resolveImagePlaceholders(rawText);
    const changes = parseChangesFromResponse(responseText);

    // Clean up timeout on success
    cleanupTimeout();

    return {
      message: responseText,
      changes: changes || undefined,
    };
  } catch (fetchError: any) {
    // Clean up timeout on error
    cleanupTimeout();

    // Preserve AbortError for proper cancellation handling
    if (fetchError.name === 'AbortError') {
      throw fetchError;
    }

    // Handle timeout errors
    if (fetchError.name === 'TimeoutError') {
      console.error('❌ [Claude] Request timed out');
      throw new Error('AI request timed out. Please try again or check your internet connection.');
    }

    console.error('Claude API call failed:', fetchError);
    throw new Error(fetchError.message || 'Failed to connect to Claude. Please try again.');
  }
}

// DEPRECATED: Legacy context builder - now using buildContextMessage from ./ai-prompts/
// @ts-ignore - Intentionally keeping for reference/rollback
function _legacyBuildContextMessage(context: AIContext): string {
  const parts: string[] = [];

  if (context.project) {
    parts.push(`Canvas: ${context.project.canvasWidth}x${context.project.canvasHeight}`);
  }

  // Include design guidelines based on enabled sections
  if (context.designSystem && typeof context.designSystem === 'object' && context.designSystem !== null) {
    const ds = context.designSystem as any;
    const enabledSections = ds.enabledSections || {
      colors: false,
      typography: true,
      spacing: true,
      animation: true,
      constraints: true,
    };
    
    const designGuidelines: string[] = [];
    
    if (enabledSections.colors && ds.colors) {
      designGuidelines.push(`Colors: Primary ${ds.colors.primary}, Secondary ${ds.colors.secondary}, Accent ${ds.colors.accent}, Background ${ds.colors.background}, Text ${ds.colors.text}`);
    }
    
    if (enabledSections.typography && ds.fonts) {
      designGuidelines.push(`Typography: Heading "${ds.fonts.heading?.family || 'Inter'}", Body "${ds.fonts.body?.family || 'Inter'}"`);
      if (ds.typeScale) {
        const scale = Object.entries(ds.typeScale)
          .map(([key, val]: [string, any]) => `${key}: ${val.size}px`)
          .join(', ');
        designGuidelines.push(`Type Scale: ${scale}`);
      }
      if (ds.textTreatment) {
        designGuidelines.push(`Text Treatment: ${ds.textTreatment.type}${ds.textTreatment.shadow ? ' with shadow' : ''}${ds.textTreatment.outline ? ' with outline' : ''}`);
      }
    }
    
    if (enabledSections.spacing && ds.spacing) {
      designGuidelines.push(`Spacing Scale: ${ds.spacing.join(', ')}px`);
      if (ds.radii) {
        designGuidelines.push(`Border Radius: ${ds.radii.map((r: number) => r === 9999 ? 'full' : `${r}px`).join(', ')}`);
      }
      if (ds.shadows) {
        designGuidelines.push(`Shadows: sm, md, lg available`);
      }
    }
    
    if (enabledSections.animation && ds.animationDefaults) {
      designGuidelines.push(`Animation Defaults: IN ${ds.animationDefaults.in?.duration || 500}ms (${ds.animationDefaults.in?.easing || 'ease-out'}), OUT ${ds.animationDefaults.out?.duration || 300}ms (${ds.animationDefaults.out?.easing || 'ease-in'}), Stagger ${ds.animationDefaults.stagger || 100}ms`);
    }
    
    if (enabledSections.constraints && ds.constraints) {
      designGuidelines.push(`Constraints: Font size ${ds.constraints.minFontSize || 18}-${ds.constraints.maxFontSize || 96}px, Min contrast ${ds.constraints.minContrast || 4.5}:1, Max animation ${ds.constraints.maxAnimationDuration || 1000}ms`);
      if (ds.safeAreas) {
        designGuidelines.push(`Safe Areas: Title safe ${ds.safeAreas.titleSafe?.margin || 192}px, Action safe ${ds.safeAreas.actionSafe?.margin || 96}px`);
      }
    }
    
    if (designGuidelines.length > 0) {
      parts.push(`Design Guidelines:\n${designGuidelines.join('\n')}`);
    }
  }
  
  // Include available layers so AI knows where to add graphics
  if (context.availableLayers && context.availableLayers.length > 0) {
    const layerList = context.availableLayers
      .map(l => `- ${l.name} (${l.type})${l.hasTemplates ? '' : ' [empty]'}`)
      .join('\n');
    parts.push(`Available Layers:\n${layerList}`);
  }

  if (context.currentTemplate) {
    parts.push(`🎯 CURRENT TEMPLATE: "${context.currentTemplate.name}" - This is what the user is working on!`);
    if (context.currentTemplate.elements.length > 0) {
      // Include element IDs so AI can reference them for updates
      const elementList = context.currentTemplate.elements
        .map((e) => {
          const details = [`id: ${e.id}`, `type: ${e.element_type}`];
          if (e.position_x !== undefined) details.push(`pos: ${e.position_x},${e.position_y}`);
          if (e.width !== undefined) details.push(`size: ${e.width}x${e.height}`);
          if (e.styles?.backgroundColor) details.push(`bg: ${e.styles.backgroundColor}`);
          // Type-safe content access
          const content = e.content as Record<string, any> | undefined;
          if (content?.type === 'text' && content.text) {
            const text = content.text as string;
            details.push(`text: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
          }
          if (content?.fill) details.push(`fill: ${content.fill}`);
          if (content?.shape) details.push(`shape: ${content.shape}`);
          return `  • "${e.name}" (${details.join(', ')})`;
        })
        .join('\n');
      parts.push(`⚠️ EXISTING ELEMENTS ON CANVAS (${context.currentTemplate.elements.length} total) - USE THESE IDs FOR UPDATES:\n${elementList}\n\n👆 These ARE the user's graphic! When they say "improve", "update", "change", "modify" - UPDATE these elements using their IDs!`);
    } else {
      parts.push(`📭 Template has NO elements yet - you should CREATE new elements.`);
    }
  } else {
    parts.push(`⚠️ No template selected - will auto-create one in the appropriate layer.`);
  }

  if (context.selectedElements.length > 0) {
    // Include full details for selected elements so AI can modify them
    const selected = context.selectedElements
      .map((e) => `"${e.name}" (id: ${e.id}, type: ${e.element_type})`)
      .join(', ');
    parts.push(`🎯 SELECTED ELEMENT(S) - User specifically selected these to modify: ${selected}`);
  }

  return parts.join('\n\n');
}

// Layer type defaults and z-index mapping
const LAYER_DEFAULTS: Record<string, { z_index: number; position: { x: number; y: number } }> = {
  'fullscreen': { z_index: 100, position: { x: 0, y: 0 } },
  'background': { z_index: 50, position: { x: 0, y: 0 } },
  'overlay': { z_index: 200, position: { x: 0, y: 0 } },
  'lower-third': { z_index: 300, position: { x: 50, y: 800 } },
  'side-panel': { z_index: 350, position: { x: 1550, y: 200 } },
  'ticker': { z_index: 400, position: { x: 0, y: 1020 } },
  'bug': { z_index: 450, position: { x: 50, y: 50 } },
  'alert': { z_index: 500, position: { x: 400, y: 150 } },
};

// Helper to safely parse a numeric value with fallback
function safeParseNumber(value: any, fallback: number, min?: number, max?: number): number {
  if (value === null || value === undefined) return fallback;

  let result: number;
  if (typeof value === 'number') {
    result = isNaN(value) ? fallback : value;
  } else if (typeof value === 'string') {
    // Handle string values like "100px", "50%", "auto"
    if (value === 'auto' || value === '') return fallback;
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    result = isNaN(parsed) ? fallback : parsed;
  } else {
    result = fallback;
  }

  // Apply bounds
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;

  return result;
}

// Helper to normalize element data from various formats
function normalizeElement(el: any, index: number): any {
  if (!el || typeof el !== 'object') {
    console.warn(`Invalid element at index ${index}, skipping`);
    return null;
  }

  // Normalize field names (handle x/y, position_x/position_y, type/element_type)
  const posX = safeParseNumber(el.position_x ?? el.x, 100);
  const posY = safeParseNumber(el.position_y ?? el.y, 100);
  const width = safeParseNumber(el.width, 200, 1);
  const height = safeParseNumber(el.height, 100, 1);
  const rotation = safeParseNumber(el.rotation, 0);
  const opacity = safeParseNumber(el.opacity, 1, 0, 1);
  const scaleX = safeParseNumber(el.scale_x ?? el.scaleX, 1, 0.01);
  const scaleY = safeParseNumber(el.scale_y ?? el.scaleY, 1, 0.01);
  let zIndex = safeParseNumber(el.zIndex ?? el.z_index ?? el._zIndex, index);

  // Force z_index to 1 for background elements (so they appear behind other elements)
  const nameLower = (el.name || '').toLowerCase();
  if (nameLower.includes('background') || nameLower === 'bg') {
    console.log(`🎯 Forcing z_index=1 for background element: "${el.name}"`);
    zIndex = 1;
  }

  // Normalize element type
  let elementType = el.element_type || el.type || 'shape';
  // Map common aliases
  const typeMap: Record<string, string> = {
    'rectangle': 'shape',
    'rect': 'shape',
    'ellipse': 'shape',
    'circle': 'shape',
    'img': 'image',
    'txt': 'text',
    'container': 'shape',
  };
  elementType = typeMap[elementType] || elementType;

  // Normalize content
  let content = el.content;
  if (!content || typeof content !== 'object') {
    // Create default content based on type
    if (elementType === 'text') {
      content = { type: 'text', text: el.text || el.name || 'Text' };
    } else if (elementType === 'image') {
      content = { type: 'image', src: el.src || '' };
    } else if (elementType === 'chart') {
      // Create default chart content with valid structure
      content = {
        type: 'chart',
        chartType: el.chartType || 'bar',
        data: {
          labels: el.labels || ['A', 'B', 'C', 'D'],
          datasets: [{
            label: 'Data',
            data: el.data || [25, 50, 75, 100],
          }],
        },
        options: el.options || {},
      };
    } else {
      content = {
        type: 'shape',
        shape: el.shape || 'rectangle',
        fill: el.fill || el.backgroundColor || el.styles?.backgroundColor || '#3B82F6',
        cornerRadius: safeParseNumber(el.cornerRadius ?? el.styles?.borderRadius, 0, 0)
      };
    }
  }

  // Validate and fix chart content if present
  if (elementType === 'chart' || content?.type === 'chart') {
    elementType = 'chart';
    content.type = 'chart';
    content.chartType = content.chartType || 'bar';

    // Ensure data structure is valid
    if (!content.data || typeof content.data !== 'object') {
      content.data = { labels: [], datasets: [] };
    }
    if (!Array.isArray(content.data.labels)) {
      content.data.labels = [];
    }
    if (!Array.isArray(content.data.datasets)) {
      content.data.datasets = [];
    }
    // Ensure at least one dataset exists
    if (content.data.datasets.length === 0) {
      content.data.datasets = [{
        label: 'Data',
        data: [25, 50, 75, 100],
      }];
      // Add default labels if none exist
      if (content.data.labels.length === 0) {
        content.data.labels = ['A', 'B', 'C', 'D'];
      }
    }
    // Validate each dataset has a data array
    content.data.datasets = content.data.datasets.map((ds: any) => ({
      ...ds,
      data: Array.isArray(ds?.data) ? ds.data : [0],
      label: ds?.label || 'Data',
    }));

    // Set reference dimensions for proportional scaling
    // These capture the dimensions at which the chart options (seatRadius, rowHeight, etc.) were designed
    // When the element is resized, the chart will scale proportionally based on these reference dimensions
    if (!content.options) content.options = {};
    if (!content.options.referenceWidth) {
      content.options.referenceWidth = width;
    }
    if (!content.options.referenceHeight) {
      content.options.referenceHeight = height;
    }
  }

  // Normalize styles
  let styles = el.styles || {};
  if (typeof styles !== 'object') styles = {};

  // Preserve binding configuration for data-driven design
  // AI generates binding objects on elements to specify which data field they should display
  const binding = el.binding || undefined;

  // Preserve interactive flag for elements that should respond to clicks in interactive mode
  const interactive = el.interactive === true;

  return {
    id: el.id || undefined,
    name: el.name || `Element ${index + 1}`,
    element_type: elementType,
    position_x: posX,
    position_y: posY,
    width,
    height,
    rotation,
    opacity,
    scale_x: scaleX,
    scale_y: scaleY,
    z_index: zIndex,
    _zIndex: zIndex,
    content,
    styles,
    // Include binding if AI provided one (for data-driven design)
    ...(binding && { binding }),
    // Include interactive flag if AI marked element as clickable
    ...(interactive && { interactive }),
  };
}

// Helper to normalize animation data
function normalizeAnimation(anim: any, elementIdMap: Map<string, string>): any {
  if (!anim || typeof anim !== 'object') {
    console.warn('Invalid animation data, skipping');
    return null;
  }

  // Get element name - try elementId, element_id, element_name, targetElement
  const elementRef = anim.elementId || anim.element_id || anim.element_name || anim.targetElement || anim.target;
  if (!elementRef) {
    console.warn('Animation missing element reference, skipping');
    return null;
  }

  // Map elementId to element_name if it's an ID we know about
  const elementName = elementIdMap.get(elementRef) || elementRef;

  // Normalize phase
  const validPhases = ['in', 'loop', 'out'];
  let phase = (anim.phase || 'in').toLowerCase();
  if (!validPhases.includes(phase)) phase = 'in';

  // Normalize timing
  const delay = safeParseNumber(anim.delay, 0, 0);
  const duration = safeParseNumber(anim.duration, 500, 1, 60000);
  const iterations = safeParseNumber(anim.iterations, phase === 'loop' ? -1 : 1);

  // Normalize easing
  let easing = anim.easing || 'ease-out';
  if (typeof easing !== 'string') easing = 'ease-out';

  // Normalize direction
  const validDirections = ['normal', 'reverse', 'alternate', 'alternate-reverse'];
  let direction = anim.direction || 'normal';
  if (!validDirections.includes(direction)) direction = 'normal';

  // Normalize keyframes
  let keyframes = anim.keyframes;
  if (!Array.isArray(keyframes) || keyframes.length === 0) {
    // Create default fade animation
    keyframes = [
      { position: 0, opacity: phase === 'out' ? 1 : 0 },
      { position: 100, opacity: phase === 'out' ? 0 : 1 }
    ];
  } else {
    keyframes = keyframes.map((kf: any, idx: number) => {
      if (!kf || typeof kf !== 'object') {
        return { position: idx === 0 ? 0 : 100, properties: {} };
      }

      // Normalize position (handle both offset 0-1 and position 0-100)
      let position = kf.position ?? kf.offset;
      if (typeof position === 'number') {
        // If value is 0-1, convert to 0-100
        if (position >= 0 && position <= 1 && position !== 0 && position !== 1) {
          position = position * 100;
        }
        position = safeParseNumber(position, idx === 0 ? 0 : 100, 0, 100);
      } else {
        position = idx === 0 ? 0 : 100;
      }

      // Build properties object
      const properties: Record<string, any> = {};

      // Handle flat properties (opacity, position_x, etc at keyframe level)
      if (kf.opacity !== undefined) properties.opacity = safeParseNumber(kf.opacity, 1, 0, 1);
      if (kf.position_x !== undefined) properties.position_x = safeParseNumber(kf.position_x, 0);
      if (kf.position_y !== undefined) properties.position_y = safeParseNumber(kf.position_y, 0);
      if (kf.scale_x !== undefined) properties.scale_x = safeParseNumber(kf.scale_x, 1, 0);
      if (kf.scale_y !== undefined) properties.scale_y = safeParseNumber(kf.scale_y, 1, 0);
      if (kf.rotation !== undefined) properties.rotation = safeParseNumber(kf.rotation, 0);
      if (kf.transform) properties.transform = kf.transform;
      if (kf.color) properties.color = kf.color;
      if (kf.backgroundColor) properties.backgroundColor = kf.backgroundColor;

      // Handle nested properties object
      if (kf.properties && typeof kf.properties === 'object') {
        Object.assign(properties, kf.properties);
      }

      return { position, properties };
    });
  }

  return {
    element_name: elementName,
    phase,
    delay,
    duration,
    iterations,
    direction,
    easing,
    keyframes,
  };
}

/**
 * Generate default fade-in/out animations for elements that don't have explicit animations.
 * This ensures all elements have at least basic animations when the AI response is incomplete.
 */
function generateDefaultAnimationsForElements(
  elements: any[],
  existingAnimations: any[]
): any[] {
  // Build set of element names that already have animations (any phase)
  const animatedElementNames = new Set<string>();
  for (const anim of existingAnimations) {
    if (anim?.element_name) {
      animatedElementNames.add(anim.element_name);
    }
  }

  const defaultAnimations: any[] = [];
  const baseDelay = 200; // Base delay for staggered animations
  let elementIndex = 0;

  for (const element of elements) {
    const elementName = element.name;
    if (!elementName || animatedElementNames.has(elementName)) {
      continue; // Skip if already has animation
    }

    // Calculate staggered delay based on element index (not counting already-animated elements)
    const staggerDelay = Math.min(baseDelay + (elementIndex * 50), 800); // Cap at 800ms

    // Create default IN animation (fade + slight scale)
    defaultAnimations.push({
      element_name: elementName,
      phase: 'in',
      delay: staggerDelay,
      duration: 400,
      iterations: 1,
      easing: 'ease-out',
      keyframes: [
        { position: 0, properties: { opacity: 0, scale_x: 0.95, scale_y: 0.95 } },
        { position: 100, properties: { opacity: 1, scale_x: 1, scale_y: 1 } },
      ],
    });

    // Create default OUT animation (fade)
    defaultAnimations.push({
      element_name: elementName,
      phase: 'out',
      delay: 0,
      duration: 300,
      iterations: 1,
      easing: 'ease-in',
      keyframes: [
        { position: 0, properties: { opacity: 1 } },
        { position: 100, properties: { opacity: 0 } },
      ],
    });

    elementIndex++;
  }

  if (defaultAnimations.length > 0) {
    console.log(`🎬 Generated ${defaultAnimations.length / 2} default animation sets for elements without explicit animations`);
  }

  return defaultAnimations;
}

// Normalize animation for action-based format - similar to normalizeAnimation but for action format
function normalizeAnimationForAction(anim: any, elementName: string, elementIdMap?: Map<string, string>): any {
  if (!anim || typeof anim !== 'object') {
    return null;
  }

  // Resolve element name from various possible references
  let resolvedElementName = elementName;
  if (!resolvedElementName || resolvedElementName === 'all') {
    // Try to get from animation properties
    const elementRef = anim.elementId || anim.element_id || anim.element_name || anim.targetElement || anim.target;
    if (elementRef && elementIdMap) {
      // First check if it's an ID that we can map to a name
      resolvedElementName = elementIdMap.get(elementRef) || elementRef;
    } else if (elementRef) {
      resolvedElementName = elementRef;
    }
  }

  // If we still don't have a valid element name, skip this animation
  if (!resolvedElementName) {
    return null;
  }

  // Normalize phase
  const validPhases = ['in', 'loop', 'out'];
  let phase = (anim.phase || 'in').toLowerCase();
  if (!validPhases.includes(phase)) phase = 'in';

  // Normalize timing with proper parsing and clamping
  const delay = safeParseNumber(anim.delay, 0, 0);
  const duration = safeParseNumber(anim.duration, 500, 1, 60000);
  const iterations = safeParseNumber(anim.iterations, phase === 'loop' ? -1 : 1);

  // Normalize easing
  let easing = anim.easing || 'ease-out';
  if (typeof easing !== 'string') easing = 'ease-out';

  // Normalize keyframes - filter invalid entries
  let keyframes = anim.keyframes;
  if (!Array.isArray(keyframes) || keyframes.length === 0) {
    // Create default keyframes for the phase
    keyframes = [
      { position: 0, properties: { opacity: phase === 'out' ? 1 : 0 } },
      { position: 100, properties: { opacity: phase === 'out' ? 0 : 1 } }
    ];
  } else {
    // Filter out invalid keyframes and normalize valid ones
    keyframes = keyframes
      .filter((kf: any) => kf && typeof kf === 'object' && (kf.position !== undefined || kf.offset !== undefined || kf.properties))
      .map((kf: any, idx: number, filteredArr: any[]) => {
        // Normalize position (handle both offset 0-1 and position 0-100)
        let position = kf.position ?? kf.offset;
        if (typeof position === 'number') {
          // If the keyframe has offset property, it's likely 0-1 format
          // Convert from 0-1 scale to 0-100 scale when position seems to be in 0-1 range
          const hasOffset = kf.offset !== undefined;
          if (hasOffset && position >= 0 && position <= 1) {
            position = position * 100;
          } else if (position > 0 && position < 1 && position !== 0.5) {
            // Also convert non-offset values if they look like 0-1 scale
            position = position * 100;
          }
          position = safeParseNumber(position, idx === 0 ? 0 : 100, 0, 100);
        } else {
          position = idx === 0 ? 0 : (idx === filteredArr.length - 1 ? 100 : (idx / (filteredArr.length - 1)) * 100);
        }

        // Build properties object
        const properties: Record<string, any> = {};

        // Handle nested properties object first
        if (kf.properties && typeof kf.properties === 'object') {
          // Clone and normalize properties values
          for (const [key, value] of Object.entries(kf.properties)) {
            if (key === 'opacity' && typeof value === 'number') {
              properties.opacity = safeParseNumber(value, 1, 0, 1);
            } else {
              properties[key] = value;
            }
          }
        }

        // Handle flat properties (opacity, transform, etc at keyframe level)
        if (kf.opacity !== undefined) properties.opacity = safeParseNumber(kf.opacity, 1, 0, 1);
        if (kf.transform) properties.transform = kf.transform;
        if (kf.scale !== undefined) properties.transform = `scale(${kf.scale})`;
        if (kf.position_x !== undefined) properties.position_x = safeParseNumber(kf.position_x, 0);
        if (kf.position_y !== undefined) properties.position_y = safeParseNumber(kf.position_y, 0);

        return { position, properties };
      });

    // Ensure we have at least 2 keyframes
    if (keyframes.length === 0) {
      keyframes = [
        { position: 0, properties: { opacity: phase === 'out' ? 1 : 0 } },
        { position: 100, properties: { opacity: phase === 'out' ? 0 : 1 } }
      ];
    } else if (keyframes.length === 1) {
      // Add start or end keyframe depending on what we have
      if (keyframes[0].position === 0) {
        keyframes.push({ position: 100, properties: { opacity: 1 } });
      } else {
        keyframes.unshift({ position: 0, properties: { opacity: 0 } });
      }
    }
  }

  return {
    element_name: resolvedElementName,
    phase,
    delay,
    duration,
    iterations,
    easing,
    keyframes,
  };
}

// Collect validation hints for user feedback
interface ValidationHint {
  type: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion?: string;
}

function collectValidationHints(data: any): ValidationHint[] {
  const hints: ValidationHint[] = [];

  if (data.elements && Array.isArray(data.elements)) {
    data.elements.forEach((el: any, idx: number) => {
      if (!el) {
        hints.push({ type: 'error', field: `elements[${idx}]`, message: 'Element is null or undefined' });
        return;
      }

      // Check for common field name mistakes
      if (el.x !== undefined && el.position_x === undefined) {
        hints.push({ type: 'info', field: `elements[${idx}].x`, message: 'Using "x" instead of "position_x"', suggestion: 'Consider using "position_x" for clarity' });
      }
      if (el.y !== undefined && el.position_y === undefined) {
        hints.push({ type: 'info', field: `elements[${idx}].y`, message: 'Using "y" instead of "position_y"', suggestion: 'Consider using "position_y" for clarity' });
      }
      if (el.type !== undefined && el.element_type === undefined) {
        hints.push({ type: 'info', field: `elements[${idx}].type`, message: 'Using "type" instead of "element_type"', suggestion: 'Consider using "element_type" for clarity' });
      }

      // Check for string values where numbers expected
      if (typeof el.width === 'string' && el.width.includes('%')) {
        hints.push({ type: 'warning', field: `elements[${idx}].width`, message: `Percentage width "${el.width}" will be converted to pixels`, suggestion: 'Use numeric pixel values for predictable results' });
      }
      if (typeof el.height === 'string' && el.height.includes('%')) {
        hints.push({ type: 'warning', field: `elements[${idx}].height`, message: `Percentage height "${el.height}" will be converted to pixels`, suggestion: 'Use numeric pixel values for predictable results' });
      }

      // Check for out-of-bounds values
      if (typeof el.opacity === 'number' && (el.opacity < 0 || el.opacity > 1)) {
        hints.push({ type: 'warning', field: `elements[${idx}].opacity`, message: `Opacity ${el.opacity} is out of range`, suggestion: 'Use values between 0 and 1' });
      }
    });
  }

  if (data.animations && Array.isArray(data.animations)) {
    data.animations.forEach((anim: any, idx: number) => {
      if (!anim) {
        hints.push({ type: 'error', field: `animations[${idx}]`, message: 'Animation is null or undefined' });
        return;
      }

      // Check for element reference
      const elementRef = anim.elementId || anim.element_id || anim.element_name;
      if (!elementRef) {
        hints.push({ type: 'error', field: `animations[${idx}]`, message: 'Animation missing element reference', suggestion: 'Add "elementId" or "element_name" field' });
      }

      // Check for using elementId vs element_name
      if (anim.elementId && !anim.element_name) {
        hints.push({ type: 'info', field: `animations[${idx}].elementId`, message: 'Using "elementId" - will try to match by ID then name' });
      }

      // Check keyframes
      if (anim.keyframes && Array.isArray(anim.keyframes)) {
        anim.keyframes.forEach((kf: any, kfIdx: number) => {
          if (kf.offset !== undefined && kf.position === undefined) {
            hints.push({ type: 'info', field: `animations[${idx}].keyframes[${kfIdx}].offset`, message: 'Using "offset" (0-1) instead of "position" (0-100)', suggestion: 'Consider using "position" with 0-100 range' });
          }
          if (typeof kf.position === 'number' && (kf.position < 0 || kf.position > 100)) {
            hints.push({ type: 'warning', field: `animations[${idx}].keyframes[${kfIdx}].position`, message: `Position ${kf.position} is out of 0-100 range`, suggestion: 'Values will be clamped to 0-100' });
          }
        });
      }
    });
  }

  return hints;
}

/**
 * Try to extract valid elements individually from corrupted JSON
 * This handles cases where streaming corruption garbled part of the response
 */
function tryExtractElementsIndividually(jsonStr: string): { elements: any[]; animations: any[] } {
  const validElements: any[] = [];
  const validAnimations: any[] = [];

  // Find the elements array section
  const elementsMatch = jsonStr.match(/"elements"\s*:\s*\[/);
  if (!elementsMatch) {
    return { elements: [], animations: [] };
  }

  const elementsStart = jsonStr.indexOf(elementsMatch[0]) + elementsMatch[0].length;

  // Strategy: Look for individual element objects by finding {"name" patterns
  // Each element should start with {"name": or { "name":
  const elementStartPattern = /\{\s*"(?:name|id|element_type)"\s*:/g;
  let match;
  const elementStartPositions: number[] = [];

  while ((match = elementStartPattern.exec(jsonStr)) !== null) {
    // Only consider positions after elementsStart
    if (match.index >= elementsStart) {
      elementStartPositions.push(match.index);
    }
  }

  console.log(`🔧 Found ${elementStartPositions.length} potential element start positions`);

  // Try to parse each element individually
  for (let i = 0; i < elementStartPositions.length; i++) {
    const startPos = elementStartPositions[i];
    // Try to find where this element ends by counting braces
    let braceCount = 0;
    let endPos = -1;

    for (let j = startPos; j < jsonStr.length; j++) {
      if (jsonStr[j] === '{') braceCount++;
      if (jsonStr[j] === '}') braceCount--;

      if (braceCount === 0) {
        endPos = j + 1;
        break;
      }
    }

    if (endPos > startPos) {
      const elementStr = jsonStr.slice(startPos, endPos);
      try {
        const element = JSON.parse(elementStr);
        // Validate it looks like an element
        if (element && (element.name || element.element_type || element.id)) {
          validElements.push(element);
        }
      } catch {
        // This element is corrupted, skip it
        console.log(`🔧 Skipping corrupted element at position ${startPos}`);
      }
    }
  }

  // Now try to extract animations similarly
  const animationsMatch = jsonStr.match(/"animations"\s*:\s*\[/);
  if (animationsMatch) {
    const animationsStart = jsonStr.indexOf(animationsMatch[0]) + animationsMatch[0].length;

    // Reset pattern
    const animStartPattern = /\{\s*"(?:element_name|element_id|animation_type)"\s*:/g;
    const animStartPositions: number[] = [];

    while ((match = animStartPattern.exec(jsonStr)) !== null) {
      if (match.index >= animationsStart) {
        animStartPositions.push(match.index);
      }
    }

    for (let i = 0; i < animStartPositions.length; i++) {
      const startPos = animStartPositions[i];
      let braceCount = 0;
      let endPos = -1;

      for (let j = startPos; j < jsonStr.length; j++) {
        if (jsonStr[j] === '{') braceCount++;
        if (jsonStr[j] === '}') braceCount--;

        if (braceCount === 0) {
          endPos = j + 1;
          break;
        }
      }

      if (endPos > startPos) {
        const animStr = jsonStr.slice(startPos, endPos);
        try {
          const anim = JSON.parse(animStr);
          if (anim && (anim.element_name || anim.element_id || anim.animation_type)) {
            validAnimations.push(anim);
          }
        } catch {
          // Skip corrupted animation
        }
      }
    }
  }

  return { elements: validElements, animations: validAnimations };
}

export function parseChangesFromResponse(response: string): AIResponse['changes'] | null {
  console.log('🔍 Parsing AI response for changes...');

  // Check if this is a blueprint JSON format (has "layout", "canvas", "dataSchema" etc.)
  let isBlueprint = false;
  let blueprintData: any = null;

  try {
    // Try multiple patterns to find blueprint JSON
    // Pattern 1: JSON code block
    let blueprintMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (blueprintMatch) {
      try {
        const parsed = JSON.parse(blueprintMatch[1]);
        if (parsed.layout && (parsed.canvas || parsed.layerType)) {
          isBlueprint = true;
          blueprintData = parsed;
          console.log('✅ Found blueprint in JSON code block');
        }
      } catch (e) {
        // Continue to next pattern
      }
    }

    // Pattern 2: Raw JSON object with layout
    if (!isBlueprint) {
      blueprintMatch = response.match(/\{[\s\S]*?"layout"[\s\S]*?\}/);
      if (blueprintMatch) {
        try {
          const parsed = JSON.parse(blueprintMatch[0]);
          if (parsed.layout && (parsed.canvas || parsed.layerType)) {
            isBlueprint = true;
            blueprintData = parsed;
            console.log('✅ Found blueprint in raw JSON');
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }
    
    // Pattern 3: Multi-line JSON (common in AI responses)
    if (!isBlueprint) {
      // Try to find JSON that spans multiple lines
      const lines = response.split('\n');
      let jsonStart = -1;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('{') && lines[i].includes('"layout"')) {
          jsonStart = i;
          braceCount = (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
          break;
        }
      }
      
      if (jsonStart >= 0) {
        let jsonLines: string[] = [];
        for (let i = jsonStart; i < lines.length; i++) {
          jsonLines.push(lines[i]);
          braceCount += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
          if (braceCount === 0 && jsonLines.length > 1) {
            try {
              const parsed = JSON.parse(jsonLines.join('\n'));
              if (parsed.layout && (parsed.canvas || parsed.layerType)) {
                isBlueprint = true;
                blueprintData = parsed;
                console.log('✅ Found blueprint in multi-line JSON');
                break;
              }
            } catch (e) {
              // Continue searching
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('⚠️ Blueprint detection error:', e);
    // Not a blueprint, continue with normal parsing
  }
  
  // If it's a blueprint, convert it to our format
  if (isBlueprint && blueprintData) {
    console.log('🔄 Converting blueprint to changes...');
    const result = convertBlueprintToChanges(blueprintData);
    if (result) {
      console.log(`✅ Blueprint converted: ${result.elements?.length || 0} elements`);
    } else {
      console.warn('⚠️ Blueprint conversion returned null');
    }
    return result;
  }

  // Pattern 4: Simplified format - { elements: [...], animations: [...] } without action
  // This is a common format for user-provided blueprints
  try {
    let simplifiedMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (simplifiedMatch) {
      const parsed = JSON.parse(simplifiedMatch[1]);
      // Check if it has elements array but NO action (simplified format)
      if (parsed.elements && Array.isArray(parsed.elements) && !parsed.action && !parsed.layout) {
        console.log('🔄 Found simplified elements+animations format...');

        // Collect validation hints
        const hints = collectValidationHints(parsed);
        if (hints.length > 0) {
          console.log('📋 Validation hints:');
          hints.forEach(h => console.log(`  ${h.type}: ${h.field} - ${h.message}`));
        }

        // Build element ID to name map for animation linking
        const elementIdMap = new Map<string, string>();
        parsed.elements.forEach((el: any) => {
          if (el.id && el.name) {
            elementIdMap.set(el.id, el.name);
          }
        });

        // Normalize elements using our helper
        const normalizedElements = parsed.elements
          .map((el: any, idx: number) => normalizeElement(el, idx))
          .filter((el: any) => el !== null);

        // Normalize animations using our helper
        const normalizedAnimations = (parsed.animations || [])
          .map((anim: any) => normalizeAnimation(anim, elementIdMap))
          .filter((anim: any) => anim !== null);

        // Generate default animations for elements that don't have any
        console.log(`🎬 [Pre-default] ${normalizedElements.length} elements, ${normalizedAnimations.length} parsed animations`);
        const defaultAnimations = generateDefaultAnimationsForElements(normalizedElements, normalizedAnimations);
        const finalAnimations = [...normalizedAnimations, ...defaultAnimations];

        console.log(`✅ Simplified format parsed: ${normalizedElements.length} elements, ${finalAnimations.length} animations (${defaultAnimations.length} defaults added)`);

        return {
          type: 'create' as const,
          layerType: 'fullscreen',
          elements: normalizedElements,
          animations: finalAnimations,
          elementsToDelete: [],
          validationHints: hints.length > 0 ? hints : undefined,
          // Preserve dynamic_elements for template expansion
          ...(parsed.dynamic_elements && { dynamic_elements: parsed.dynamic_elements }),
          // Preserve visualScript for interactive elements (legacy, basic users)
          ...(parsed.visualScript && { visualScript: parsed.visualScript }),
          // Preserve script for interactive elements (code script, primary method)
          ...(parsed.script && { script: parsed.script }),
        };
      }
    }
  } catch (e) {
    console.log('⚠️ Simplified format parsing failed:', e);
    // Continue to other patterns
  }

  // Look for JSON code blocks (complete or incomplete)
  let jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

  // If no complete block, try to match incomplete (truncated response)
  if (!jsonMatch) {
    jsonMatch = response.match(/```json\s*([\s\S]*)$/);
  }

  // Also try to find raw JSON object without code blocks
  if (!jsonMatch) {
    const rawJsonMatch = response.match(/\{\s*"action"\s*:\s*"(?:create|update|delete)"[\s\S]*\}/);
    if (rawJsonMatch) {
      jsonMatch = [rawJsonMatch[0], rawJsonMatch[0]];
      console.log('✅ Found raw JSON with action');
    }
  }

  if (!jsonMatch) {
    console.log('❌ No JSON found in response. Response preview:', response.substring(0, 200));
    return null;
  }

  console.log('✅ JSON match found, length:', jsonMatch[1]?.length || 0);

  let jsonStr = jsonMatch[1].trim();
  const originalJson = jsonStr; // Keep original for fallback

  // Check if JSON is truncated (unbalanced brackets)
  const countChar = (str: string, char: string) => (str.match(new RegExp('\\' + char, 'g')) || []).length;
  const openBraces = countChar(jsonStr, '{');
  const closeBraces = countChar(jsonStr, '}');
  const openBrackets = countChar(jsonStr, '[');
  const closeBrackets = countChar(jsonStr, ']');
  const isTruncated = openBraces > closeBraces || openBrackets > closeBrackets;
  let wasRepaired = false;

  // First, try parsing as-is (handles valid JSON)
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.action && parsed.elements) {
      // Valid JSON, process it below
      jsonStr = JSON.stringify(parsed); // Normalize
    }
  } catch (e) {
    // JSON is invalid - could be truncated OR corrupted mid-stream
    // The error position tells us where corruption occurred
    const parseError = e as SyntaxError;
    const errorMatch = parseError.message.match(/position (\d+)/);
    const errorPosition = errorMatch ? parseInt(errorMatch[1]) : -1;

    console.log('🔧 JSON parse error at position:', errorPosition, 'Total length:', jsonStr.length);

    // NEW STRATEGY: Try element-by-element extraction for mid-stream corruption
    // This works even when the JSON is corrupted in the middle (not just truncated)
    const extractedElements = tryExtractElementsIndividually(jsonStr);
    if (extractedElements.elements.length > 0) {
      wasRepaired = true;
      console.log(`🔧 Extracted ${extractedElements.elements.length} valid elements using individual parsing`);

      // Reconstruct the JSON with extracted elements
      try {
        // Try to extract action and layer_type from the beginning
        const actionMatch = jsonStr.match(/"action"\s*:\s*"(create|update|delete)"/);
        const layerTypeMatch = jsonStr.match(/"layer_type"\s*:\s*"([^"]+)"/);

        const reconstructed = {
          action: actionMatch ? actionMatch[1] : 'create',
          layer_type: layerTypeMatch ? layerTypeMatch[1] : 'lower-third',
          elements: extractedElements.elements,
          animations: extractedElements.animations,
        };

        jsonStr = JSON.stringify(reconstructed);
        console.log('🔧 Reconstructed JSON with', extractedElements.elements.length, 'elements and', extractedElements.animations.length, 'animations');
      } catch (reconstructError) {
        console.warn('🔧 Failed to reconstruct JSON:', reconstructError);
      }
    }

    // If element extraction didn't help and JSON is truncated, try bracket-based repair
    if (isTruncated) {
      wasRepaired = true;
      console.log('🔧 Detected truncated JSON, attempting repair...', {
        openBraces, closeBraces, openBrackets, closeBrackets,
        length: jsonStr.length
      });

      // Strategy: Find the last complete element object in the elements array
      // An element object ends with "}" and is followed by "," or "]" or end of array

      // First, try to find where the elements array starts
      const elementsStart = jsonStr.indexOf('"elements"');
      if (elementsStart > -1) {
        // Find the opening bracket of elements array
        const arrayStart = jsonStr.indexOf('[', elementsStart);
        if (arrayStart > -1) {
          // Find all complete element objects (look for closing braces that are part of element objects)
          // We'll work backwards to find the last valid cut point

          // Find positions of all "}," and "}\n" patterns (potential element ends)
          const cutPoints: number[] = [];
          let searchPos = arrayStart;
          while (searchPos < jsonStr.length) {
            const commaEnd = jsonStr.indexOf('},', searchPos);
            const newlineEnd = jsonStr.indexOf('}\n', searchPos);

            if (commaEnd === -1 && newlineEnd === -1) break;

            const nextPoint = commaEnd === -1 ? newlineEnd :
                             newlineEnd === -1 ? commaEnd :
                             Math.min(commaEnd, newlineEnd);

            if (nextPoint > arrayStart) {
              cutPoints.push(nextPoint);
            }
            searchPos = nextPoint + 1;
          }

          // Try cut points from latest to earliest (we want to keep as much as possible)
          for (let i = cutPoints.length - 1; i >= 0; i--) {
            const cutPoint = cutPoints[i];
            let testJson = jsonStr.slice(0, cutPoint + 1);

            // Clean up trailing comma
            testJson = testJson.replace(/,\s*$/, '');

            // Balance brackets
            const testOpenBrackets = countChar(testJson, '[');
            const testCloseBrackets = countChar(testJson, ']');
            const testOpenBraces = countChar(testJson, '{');
            const testCloseBraces = countChar(testJson, '}');

            for (let j = 0; j < testOpenBrackets - testCloseBrackets; j++) testJson += ']';
            for (let j = 0; j < testOpenBraces - testCloseBraces; j++) testJson += '}';

            try {
              const testParsed = JSON.parse(testJson);
              if (testParsed.action && testParsed.elements && testParsed.elements.length > 0) {
                console.log(`🔧 Repaired JSON by cutting at position ${cutPoint}, kept ${testParsed.elements.length} elements`);
                jsonStr = testJson;
                break;
              }
            } catch {
              // This cut point didn't work, try the next one
              continue;
            }
          }
        }
      }

      // If we still can't parse, try simple bracket balancing as last resort
      try {
        JSON.parse(jsonStr);
      } catch {
        // Simple repair: just balance brackets
        let repairedJson = originalJson;
        // Remove incomplete trailing properties
        repairedJson = repairedJson.replace(/,\s*"[^"]*"\s*:\s*("[^"]*)?$/, '');
        repairedJson = repairedJson.replace(/,\s*$/, '');

        const finalOpenBrackets = countChar(repairedJson, '[');
        const finalCloseBrackets = countChar(repairedJson, ']');
        const finalOpenBraces = countChar(repairedJson, '{');
        const finalCloseBraces = countChar(repairedJson, '}');

        for (let i = 0; i < finalOpenBrackets - finalCloseBrackets; i++) repairedJson += ']';
        for (let i = 0; i < finalOpenBraces - finalCloseBraces; i++) repairedJson += '}';

        try {
          JSON.parse(repairedJson);
          jsonStr = repairedJson;
          console.log('🔧 Repaired JSON with simple bracket balancing');
        } catch {
          console.warn('🔧 Could not repair truncated JSON');
        }
      }
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);
    
    if (parsed.action && parsed.elements) {
      const isUpdate = parsed.action === 'update';
      const layerType = parsed.layer_type || 'lower-third';
      const layerDefaults = LAYER_DEFAULTS[layerType] || LAYER_DEFAULTS['lower-third'];
      
      // For UPDATE operations, just pass through what was specified - no defaults
      if (isUpdate) {
        // Build element ID to name map for animation linking
        const updateElementIdMap = new Map<string, string>();
        parsed.elements.forEach((el: any) => {
          if (el.id && el.name) {
            updateElementIdMap.set(el.id, el.name);
          }
        });

        // Process animations for update
        const updateAnimations = (parsed.animations || [])
          .map((anim: any) => normalizeAnimationForAction(anim, anim.element_name, updateElementIdMap))
          .filter((a: any) => a !== null);

        return {
          type: 'update' as const,
          layerType: layerType,
          elements: parsed.elements.map((el: any) => ({
            // Only include properties that were explicitly specified
            ...(el.id && { id: el.id }),
            ...(el.name && { name: el.name }),
            ...(el.element_type && { element_type: el.element_type }),
            ...(el.position_x !== undefined && { position_x: el.position_x }),
            ...(el.position_y !== undefined && { position_y: el.position_y }),
            ...(el.width !== undefined && { width: el.width }),
            ...(el.height !== undefined && { height: el.height }),
            ...(el.rotation !== undefined && { rotation: el.rotation }),
            ...(el.opacity !== undefined && { opacity: el.opacity }),
            ...(el.scale_x !== undefined && { scale_x: el.scale_x }),
            ...(el.scale_y !== undefined && { scale_y: el.scale_y }),
            ...(el.styles && { styles: el.styles }),
            ...(el.content && { content: el.content }),
          })),
          animations: updateAnimations,
          elementsToDelete: parsed.elementsToDelete || [],
          // Preserve dynamic_elements for template expansion
          ...(parsed.dynamic_elements && { dynamic_elements: parsed.dynamic_elements }),
          // Preserve visualScript for interactive elements (legacy, basic users)
          ...(parsed.visualScript && { visualScript: parsed.visualScript }),
          // Preserve script for interactive elements (code script, primary method)
          ...(parsed.script && { script: parsed.script }),
          // Add truncation warning if response was repaired
          ...(wasRepaired && { _truncationWarning: 'Response was truncated and repaired. Some elements or animations may be incomplete.' }),
        };
      }

      // For CREATE operations, flatten nested elements (for groups with child elements)
      const flattenElements = (elements: any[], parentX = 0, parentY = 0): any[] => {
        const result: any[] = [];
        elements.forEach((el: any) => {
          // Calculate absolute position for nested elements
          const absX = (el.position_x ?? 0) + parentX;
          const absY = (el.position_y ?? 0) + parentY;
          
          // If element has nested elements (group), flatten them
          if (el.elements && Array.isArray(el.elements)) {
            // Add the group container itself
            // Note: Group containers don't set backgroundColor in styles - they use content.fill
            const groupStyles = { ...el.styles };
            delete groupStyles.backgroundColor; // Remove to avoid conflicts with content.fill
            // Force z_index to 1 for background groups
            const groupName = (el.name || '').toLowerCase();
            const isBackgroundGroup = groupName.includes('background') || groupName === 'bg';
            const groupZIndex = isBackgroundGroup ? 1 : (el.z_index ?? el.zIndex ?? layerDefaults.z_index + result.length);

            result.push({
              name: el.name || 'Group',
              element_type: 'shape',
              position_x: absX,
              position_y: absY,
              width: el.width ?? 600,
              height: el.height ?? 400,
              rotation: el.rotation ?? 0,
              opacity: el.opacity ?? 1,
              scale_x: el.scale_x ?? 1,
              scale_y: el.scale_y ?? 1,
              styles: groupStyles,
              content: { type: 'shape', shape: 'rectangle', fill: 'transparent', opacity: 0 },
              _layerType: layerType,
              _zIndex: groupZIndex,
            });
            
            // Recursively flatten child elements with parent offset
            const children = flattenElements(el.elements, absX, absY);
            result.push(...children);
          } else {
            // Sanitize styles for shape elements - remove transparent backgroundColor
            // since shapes use content.fill for their fill color
            const elementType = el.element_type || 'shape';
            let elementStyles = el.styles || {};
            if (elementType === 'shape' || el.content?.type === 'shape') {
              elementStyles = { ...elementStyles };
              if (elementStyles.backgroundColor === 'transparent') {
                delete elementStyles.backgroundColor;
              }
            }

            // Force z_index to 1 for background elements
            const elName = (el.name || '').toLowerCase();
            const isBackground = elName.includes('background') || elName === 'bg';
            const zIndex = isBackground ? 1 : (el.z_index ?? el.zIndex ?? layerDefaults.z_index + result.length);

            result.push({
              // IMPORTANT: Preserve ID for update operations
              ...(el.id && { id: el.id }),
              name: el.name || 'Untitled',
              element_type: elementType,
              position_x: absX || layerDefaults.position.x,
              position_y: absY || layerDefaults.position.y,
              width: el.width ?? 200,
              height: el.height ?? 100,
              rotation: el.rotation ?? 0,
              opacity: el.opacity ?? 1,
              scale_x: el.scale_x ?? 1,
              scale_y: el.scale_y ?? 1,
              styles: elementStyles,
              content: el.content || { type: 'shape', shape: 'rectangle', fill: '#3B82F6' },
              _layerType: layerType,
              _zIndex: zIndex,
              // Preserve binding for data-driven design
              ...(el.binding && { binding: el.binding }),
            });
          }
        });
        return result;
      };

      const flatElements = flattenElements(parsed.elements);
      
      // Build element ID to name map for animation linking
      const elementIdMapForAction = new Map<string, string>();
      flatElements.forEach((el: any) => {
        if (el.id && el.name) {
          elementIdMapForAction.set(el.id, el.name);
        }
      });

      // Process animations, handling "all" target
      // First filter out invalid animation entries (null, strings, etc.)
      const validAnimations = (parsed.animations || []).filter((anim: any) => anim && typeof anim === 'object');

      const processedAnimations = validAnimations.flatMap((anim: any) => {
        // If animation targets "all", create animation for each element
        if (anim.element_name === 'all') {
          return flatElements.map((el: any) => {
            const normalized = normalizeAnimationForAction(anim, el.name, elementIdMapForAction);
            return normalized;
          }).filter((a: any) => a !== null);
        }

        const normalized = normalizeAnimationForAction(anim, anim.element_name, elementIdMapForAction);
        return normalized ? [normalized] : [];
      });

      // Generate default animations for elements that don't have any (only for create actions)
      // This handles cases where AI response was truncated or incomplete
      let finalAnimations = processedAnimations;
      if (parsed.action === 'create') {
        const defaultAnimations = generateDefaultAnimationsForElements(flatElements, processedAnimations);
        if (defaultAnimations.length > 0) {
          finalAnimations = [...processedAnimations, ...defaultAnimations];
        }
      }

      console.log(`✅ Parsed successfully: type=${parsed.action}, elements=${flatElements.length}, animations=${finalAnimations.length}, layerType=${layerType}${parsed.visualScript ? ', has visualScript' : ''}${parsed.script ? ', has script' : ''}`);
      return {
        type: parsed.action as 'create' | 'update' | 'delete',
        layerType: layerType,
        elements: flatElements,
        animations: finalAnimations,
        elementsToDelete: parsed.elementsToDelete || [],
        // Preserve dynamic_elements for template expansion in ChatPanel
        ...(parsed.dynamic_elements && { dynamic_elements: parsed.dynamic_elements }),
        // Preserve visualScript for interactive elements (legacy, basic users)
        ...(parsed.visualScript && { visualScript: parsed.visualScript }),
        // Preserve script for interactive elements (code script, primary method)
        ...(parsed.script && { script: parsed.script }),
        // Add truncation warning if response was repaired
        ...(wasRepaired && { _truncationWarning: 'Response was truncated and repaired. Some elements or animations may be incomplete.' }),
      };
    }
  } catch (e) {
    console.warn('❌ Failed to parse AI JSON response:', e);
    // Try to extract partial data if possible
    try {
      // Look for any valid JSON structure
      const fallbackMatch = response.match(/\{[\s\S]{0,5000}\}/);
      if (fallbackMatch) {
        const fallback = JSON.parse(fallbackMatch[0]);
        if (fallback.action && fallback.elements) {
          console.warn('Using fallback parsing with partial data');
          return {
            type: fallback.action === 'update' ? 'update' : 'create',
            layerType: fallback.layer_type || 'fullscreen',
            elements: Array.isArray(fallback.elements) ? fallback.elements.slice(0, 10) : [],
            animations: Array.isArray(fallback.animations) ? fallback.animations : [],
            elementsToDelete: [],
            // Preserve script if present
            ...(fallback.script && { script: fallback.script }),
          };
        }
      }
    } catch (e2) {
      console.error('Fallback parsing also failed:', e2);
    }
  }

  return null;
}

// Convert blueprint JSON format to our changes format
function convertBlueprintToChanges(blueprint: any): AIResponse['changes'] | null {
  try {
    console.log('🔄 Converting blueprint to changes...', { layerType: blueprint.layerType, hasLayout: !!blueprint.layout });
    const elements: any[] = [];
    const animations: any[] = [];
    
    // Extract layer type from blueprint
    const layerType = blueprint.layerType || 'fullscreen';
    const canvasWidth = blueprint.canvas?.width || 1920;
    const canvasHeight = blueprint.canvas?.height || 1080;
    
    // Helper to calculate position based on anchor
    function calculatePosition(node: any, parentX = 0, parentY = 0): { x: number; y: number } {
      const pos = node.position || {};
      let x = pos.x || 0;
      let y = pos.y || 0;
      
      // Handle anchor-based positioning
      if (pos.anchor === 'center') {
        x = (canvasWidth / 2) + (pos.x || 0);
        y = (canvasHeight / 2) + (pos.y || 0);
      } else if (pos.anchor === 'top-left') {
        x = pos.x || 0;
        y = pos.y || 0;
      } else if (pos.anchor === 'bottom-left') {
        x = pos.x || 0;
        y = canvasHeight - (pos.y || 0);
      } else if (pos.anchor === 'top-right') {
        x = canvasWidth - (pos.x || 0);
        y = pos.y || 0;
      } else if (pos.anchor === 'bottom-right') {
        x = canvasWidth - (pos.x || 0);
        y = canvasHeight - (pos.y || 0);
      }
      
      return { x: x + parentX, y: y + parentY };
    }
    
    // Recursively convert layout structure to elements
    function convertLayoutNode(node: any, parentX = 0, parentY = 0, depth = 0): void {
      if (!node || depth > 20) return; // Prevent infinite recursion
      
      const { x, y } = calculatePosition(node, parentX, parentY);
      let width = node.size?.width || node.width || 200;
      let height = node.size?.height || node.height || 100;
      
      // Handle string dimensions (%, px, auto, etc.)
      if (typeof width === 'string') {
        if (width === '100%') {
          width = canvasWidth;
        } else if (width.includes('%')) {
          const percent = parseFloat(width) / 100;
          width = isNaN(percent) ? 200 : canvasWidth * percent;
        } else if (width.includes('px')) {
          const parsed = parseFloat(width);
          width = isNaN(parsed) ? 200 : parsed;
        } else if (width === 'auto') {
          width = 200; // Default for auto
        } else {
          // Try to parse as number, fallback to default
          const parsed = parseFloat(width);
          width = isNaN(parsed) ? 200 : parsed;
        }
      }
      // Ensure width is a valid number
      if (typeof width !== 'number' || isNaN(width) || width <= 0) {
        width = 200;
      }

      if (typeof height === 'string') {
        if (height === '100%') {
          height = canvasHeight;
        } else if (height.includes('%')) {
          const percent = parseFloat(height) / 100;
          height = isNaN(percent) ? 100 : canvasHeight * percent;
        } else if (height.includes('px')) {
          const parsed = parseFloat(height);
          height = isNaN(parsed) ? 100 : parsed;
        } else if (height === 'auto') {
          height = 100; // Default for auto
        } else {
          // Try to parse as number, fallback to default
          const parsed = parseFloat(height);
          height = isNaN(parsed) ? 100 : parsed;
        }
      }
      // Ensure height is a valid number
      if (typeof height !== 'number' || isNaN(height) || height <= 0) {
        height = 100;
      }
      
      // Convert regions as container shapes
      if (node.type === 'region') {
        const regionElement: any = {
          name: node.name || node.id || `Container ${elements.length + 1}`,
          element_type: 'shape',
          position_x: x,
          position_y: y,
          width: width,
          height: height,
          styles: {
            backgroundColor: node.background?.color === 'background' ? 'rgba(0, 0, 0, 0.95)' :
                           node.background?.color === 'secondary' ? 'rgba(255, 255, 255, 0.1)' :
                           node.background?.type === 'solid' ? node.background.color || 'transparent' : 'transparent',
            opacity: node.background?.opacity ?? 1,
            borderRadius: node.border?.radius ? `${node.border.radius}px` : '0px',
            border: node.border?.width ? `${node.border.width}px solid ${node.border.color || 'transparent'}` : 'none',
            boxShadow: node.shadow?.enabled ? `${node.shadow.x || 0}px ${node.shadow.y || 0}px ${node.shadow.blur || 0}px ${node.shadow.color || 'rgba(0,0,0,0.4)'}` : 'none',
          },
          content: {
            type: 'shape',
            shape: 'rectangle',
            fill: node.background?.color === 'background' ? 'rgba(0, 0, 0, 0.95)' :
                  node.background?.color === 'secondary' ? 'rgba(255, 255, 255, 0.1)' :
                  node.background?.type === 'solid' ? node.background.color || 'transparent' : 'transparent',
          },
        };
        
        elements.push(regionElement);
        
        // Convert region animations
        if (node.animation) {
          if (node.animation.in) {
            animations.push({
              element_name: regionElement.name,
              phase: 'in',
              duration: node.animation.in.duration || 500,
              delay: node.animation.in.delay || 0,
              easing: node.animation.in.easing || 'ease-out',
              keyframes: [
                { position: 0, properties: node.animation.in.from || { opacity: 0 } },
                { position: 100, properties: node.animation.in.to || { opacity: 1 } },
              ],
            });
          }
        }
        
        // Process children with region as parent
        if (node.children && Array.isArray(node.children)) {
          // Calculate child position relative to region
          const childX = x + (node.padding?.left || 0);
          const childY = y + (node.padding?.top || 0);
          node.children.forEach((child: any) => {
            convertLayoutNode(child, childX, childY, depth + 1);
          });
        }
        return;
      }
      
      // Convert slots (actual content elements)
      if (node.type === 'slot' && node.elementType) {
        const element: any = {
          name: node.name || node.id || `Element ${elements.length + 1}`,
          element_type: node.elementType,
          position_x: x,
          position_y: y,
          width: typeof width === 'string' ? 200 : width,
          height: typeof height === 'string' ? 100 : height,
          styles: {},
          content: {},
        };
        
        // Set content based on element type
        if (node.elementType === 'text') {
          const textValue = node.exampleData?.[node.dataKey] || 
                           node.defaultValue || 
                           (node.dataKey === 'title' ? '3-Day Forecast' :
                            node.dataKey === 'location' ? 'New York, NY' :
                            node.dataKey?.includes('name') ? 'Today' :
                            node.dataKey?.includes('temp') ? '72°' :
                            node.dataKey?.includes('condition') ? 'Sunny' : 'Text');
          
          element.content = {
            type: 'text',
            text: textValue,
          };
          
          if (node.textStyle) {
            element.styles = {
              fontSize: node.textStyle.fontSize ? `${node.textStyle.fontSize}px` : '32px',
              fontFamily: node.textStyle.fontFamily || 'Inter',
              fontWeight: node.textStyle.fontWeight || 400,
              color: node.textStyle.color === 'text' ? '#FFFFFF' :
                     node.textStyle.color === 'textSecondary' ? 'rgba(255, 255, 255, 0.7)' :
                     node.textStyle.color || '#FFFFFF',
              textAlign: node.textStyle.textAlign || node.ALIGNMENT?.toLowerCase() || 'left',
              width: node.size?.width === '100%' ? '100%' : undefined,
            };
          }
        } else if (node.elementType === 'icon') {
          // Map weather icon names to weather library
          const iconName = node.dataKey?.includes('icon') ? 
            (node.exampleData?.[node.dataKey] || 'sun') : 'Sparkles';
          
          element.content = {
            type: 'icon',
            library: iconName === 'sun' || iconName === 'cloud' || iconName === 'cloud-rain' ? 'weather' : 'lucide',
            iconName: iconName,
            size: node.size?.width ? Math.min(node.size.width, node.size.height || 180) : 180,
            color: node.style?.color === 'accent' ? '#06B6D4' : node.style?.color || '#FFFFFF',
          };
          
          // Center icon
          if (node.ALIGNMENT === 'CENTER' || node.horizontalAlign === 'center') {
            element.styles = {
              margin: '0 auto',
              display: 'block',
            };
          }
        } else if (node.elementType === 'shape') {
          element.content = {
            type: 'shape',
            shape: node.shapeType || 'rectangle',
            fill: node.style?.fill === 'accent' ? '#06B6D4' : node.style?.fill || '#3B82F6',
          };
          if (node.style) {
            element.styles = {
              borderRadius: node.border?.radius ? `${node.border.radius}px` : undefined,
              opacity: node.style.opacity ?? 1,
            };
          }
        }
        
        elements.push(element);
        console.log(`✅ Created element: ${element.name} (${element.element_type}) at (${element.position_x}, ${element.position_y})`);
        
        // Convert animations
        if (node.animation) {
          if (node.animation.in) {
            animations.push({
              element_name: element.name,
              phase: 'in',
              duration: node.animation.in.duration || 500,
              delay: node.animation.in.delay || 0,
              easing: node.animation.in.easing || 'ease-out',
              keyframes: [
                { position: 0, properties: node.animation.in.from || { opacity: 0 } },
                { position: 100, properties: node.animation.in.to || { opacity: 1 } },
              ],
            });
          }
          if (node.animation.out) {
            animations.push({
              element_name: element.name,
              phase: 'out',
              duration: node.animation.out.duration || 300,
              delay: node.animation.out.delay || 0,
              easing: node.animation.out.easing || 'ease-in',
              keyframes: [
                { position: 0, properties: node.animation.out.from || { opacity: 1 } },
                { position: 100, properties: node.animation.out.to || { opacity: 0 } },
              ],
            });
          }
        }
      }
      
      // Recursively process children (for non-region nodes)
      if (node.children && Array.isArray(node.children) && node.type !== 'region') {
        node.children.forEach((child: any) => {
          convertLayoutNode(child, x, y, depth + 1);
        });
      }
    }
    
    // Start conversion from root layout
    if (blueprint.layout) {
      convertLayoutNode(blueprint.layout);
    }
    
    // Generate default animations for elements that don't have any
    const defaultAnimations = generateDefaultAnimationsForElements(elements, animations);
    const finalAnimations = [...animations, ...defaultAnimations];

    console.log(`📊 Blueprint conversion complete: ${elements.length} elements, ${finalAnimations.length} animations`);

    if (elements.length === 0) {
      console.warn('⚠️ No elements created from blueprint');
      return null;
    }

    return {
      type: 'create',
      layerType,
      elements,
      animations: finalAnimations,
      elementsToDelete: [],
      // Preserve visualScript for interactive elements (from blueprint, legacy)
      ...(blueprint.visualScript && { visualScript: blueprint.visualScript }),
      // Preserve script for interactive elements (code script, primary method)
      ...(blueprint.script && { script: blueprint.script }),
    };
  } catch (error) {
    console.error('❌ Error converting blueprint:', error);
    return null;
  }
}

// Quick prompt templates
export const QUICK_PROMPTS = {
  createLowerThird: 'Create a modern lower third with a name and title field. Use blue gradient background with white text.',
  addAnimation: 'Add a slide-in animation from the left to the selected element.',
  improveDesign: 'Review the current design and suggest improvements.',
  addBinding: 'Add data bindings for dynamic text content.',
  createScoreBug: 'Create a sports score bug with home team, away team, scores, and a clock.',
  createTicker: 'Create a scrolling news ticker at the bottom of the screen.',
  createBarChart: 'Create a bar chart showing team standings with 4 teams.',
  createPieChart: 'Create a pie chart showing vote distribution.',
  createGauge: 'Create a gauge showing win probability at 72%.',
  createLeaderboard: 'Create a horizontal bar chart leaderboard with player rankings.',
  createMap: 'Create a map showing New York City with a venue marker.',
  createWeatherMap: 'Create a weather map showing the current location with dark style.',
  createStandings: `Create a fullscreen NBA Eastern Conference standings graphic. Layout:
Title "NBA STANDINGS" at top center with "EASTERN CONFERENCE" subtitle below
Header row with labels: TEAM, W, L, GB
8 team rows below the header
Create explicit elements for each of the 8 teams:
Boston Celtics - 35 wins, 12 losses, GB: -
Milwaukee Bucks - 32 wins, 15 losses, GB: 3.0
Cleveland Cavaliers - 31 wins, 17 losses, GB: 4.5
New York Knicks - 29 wins, 19 losses, GB: 6.5
Miami Heat - 27 wins, 21 losses, GB: 8.5
Philadelphia 76ers - 26 wins, 21 losses, GB: 9.0
Indiana Pacers - 25 wins, 23 losses, GB: 10.5
Chicago Bulls - 23 wins, 25 losses, GB: 12.5
Each team row should have:
Row background shape (alternating dark colors)
Rank number on left
Team name
Wins, Losses, and GB text aligned to the right
Style: Dark professional sports broadcast look with blue accents. Top 3 teams should have gold/silver/bronze accent on the rank.`,
};

// Simple documentation chat - for helping users learn about Nova GFX and Pulsar GFX
export async function sendDocsChatMessage(
  messages: ChatMessage[],
  systemPrompt: string,
  signal?: AbortSignal
): Promise<string> {
  const modelId = getAIModel();

  // Resolve model config from backend or fallback to hardcoded
  const resolvedConfig = await resolveModelConfig(modelId);
  const fallbackConfig = resolvedConfig || await resolveModelConfig(DEFAULT_AI_MODEL);

  if (!fallbackConfig) {
    throw new Error('No AI model configured. Please configure an AI provider in Nova dashboard or set API keys locally.');
  }

  const provider = fallbackConfig.provider;
  const apiKey = fallbackConfig.apiKey;
  const apiModel = fallbackConfig.apiModel;

  // Create timeout signal that also respects the user's abort signal
  const { signal: timeoutSignal, cleanup: cleanupTimeout } = createTimeoutSignal(AI_REQUEST_TIMEOUT_MS, signal);

  try {
    if (provider === 'gemini') {
      const useProxy = shouldUseBackendProxy('gemini');

      // Build Gemini-format messages with docs system prompt
      const geminiContents: any[] = [
        { role: 'user', parts: [{ text: `[System Instructions]\n${systemPrompt}` }] },
        { role: 'model', parts: [{ text: 'I understand. I am a documentation assistant for Nova GFX and Pulsar GFX. How can I help you?' }] },
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      ];

      let response;
      if (useProxy) {
        response = await fetch('/.netlify/functions/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'gemini',
            model: apiModel,
            messages: geminiContents,
            maxTokens: 16384,
            temperature: 0.7,
          }),
          signal: timeoutSignal,
        });
      } else {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: { maxOutputTokens: 16384, temperature: 0.7 },
            }),
            signal: timeoutSignal,
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      cleanupTimeout();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

    } else {
      // Claude
      const useProxy = shouldUseBackendProxy('claude');

      const apiMessages = messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      let response;
      if (useProxy) {
        response = await fetch('/.netlify/functions/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'claude',
            model: apiModel,
            systemPrompt,
            messages: apiMessages,
            maxTokens: 16384,
            temperature: 0.7,
          }),
          signal: timeoutSignal,
        });
      } else {
        // Use Vite proxy in development to avoid CORS issues
        const apiUrl = import.meta.env.DEV
          ? '/api/anthropic/v1/messages'
          : 'https://api.anthropic.com/v1/messages';

        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: apiModel,
            max_tokens: 16384,
            system: systemPrompt,
            messages: apiMessages,
          }),
          signal: timeoutSignal,
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      cleanupTimeout();
      return data.content?.[0]?.text || 'Sorry, I could not generate a response.';
    }
  } catch (error: any) {
    // Clean up timeout on error
    cleanupTimeout();

    // Preserve AbortError for proper cancellation handling
    if (error.name === 'AbortError') {
      throw error;
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError') {
      console.error('❌ [Docs Chat] Request timed out');
      throw new Error('AI request timed out. Please try again or check your internet connection.');
    }

    throw error;
  }
}

/**
 * Send a chat message with streaming support
 * This allows showing real-time progress as the AI generates content
 */
export async function sendChatMessageStreaming(
  messages: ChatMessage[],
  context: AIContext,
  onChunk: StreamCallback,
  modelId?: string,
  images?: ImageAttachment[],
  signal?: AbortSignal,
  onImageProgress?: ImageProgressCallback
): Promise<AIResponse> {
  // Ensure connection is fresh if browser was idle (prevents stale connection issues)
  await ensureFreshConnectionIfIdle();

  // Debug: Log incoming parameters
  console.log('🔍 [sendChatMessageStreaming] Called with:');
  console.log('  - messages:', messages.length);
  console.log('  - images:', images?.length || 0);
  console.log('  - modelId:', modelId);
  console.log('  - signal:', !!signal);
  if (images?.length) {
    images.forEach((img, i) => {
      console.log(`  - Image ${i + 1}: mimeType=${img.mimeType}, data length=${img.data?.length || 0}`);
    });
  }

  // Get the user's latest message to detect intent
  const lastUserMessage = messages[messages.length - 1]?.content || '';

  // Build dynamic system prompt based on user intent
  const dynamicSystemPrompt = buildDynamicSystemPrompt(lastUserMessage, context);
  const contextInfo = buildDynamicContextMessage(context);

  const selectedModel = modelId || getAIModel();

  // Resolve model config from backend or fallback to hardcoded
  const resolvedConfig = await resolveModelConfig(selectedModel);
  const fallbackConfig = resolvedConfig || await resolveModelConfig(DEFAULT_AI_MODEL);

  if (!fallbackConfig) {
    throw new Error('No AI model configured. Please configure an AI provider in Nova dashboard or set API keys locally.');
  }

  const provider = fallbackConfig.provider;
  const modelConfig = {
    id: selectedModel,
    name: selectedModel,
    description: '',
    provider: fallbackConfig.provider,
    apiModel: fallbackConfig.apiModel,
    _resolvedApiKey: fallbackConfig.apiKey,
  };

  // Helper to make the streaming API call
  const makeStreamingCall = async (): Promise<AIResponse> => {
    if (provider === 'gemini') {
      return sendGeminiMessageStreaming(messages, context, modelConfig, dynamicSystemPrompt, contextInfo, onChunk, images, signal);
    } else {
      return sendClaudeMessageStreaming(messages, context, modelConfig, dynamicSystemPrompt, contextInfo, onChunk, images, signal);
    }
  };

  // For streaming, we need direct API access (can't stream through Edge Function easily)
  let response = await makeStreamingCall();

  // Check if response looks like it should have JSON changes but parsing failed
  // This could indicate streaming corruption - retry once if so
  const looksLikeGraphicResponse = response.message &&
    (response.message.includes('"action"') || response.message.includes('"elements"') || response.message.includes('```json'));

  if (looksLikeGraphicResponse && !response.changes) {
    console.warn('⚠️ Response appears to contain graphic JSON but parsing failed - retrying request once...');
    onChunk('\n\n🔄 Retrying due to response corruption...', '');

    // Wait a brief moment before retry
    await new Promise(resolve => setTimeout(resolve, 500));

    // Retry the request
    try {
      response = await makeStreamingCall();
      if (response.changes) {
        console.log('✅ Retry successful - JSON parsed correctly');
      } else {
        console.warn('⚠️ Retry also failed to produce valid JSON - proceeding with repair attempt');
      }
    } catch (retryError) {
      console.error('❌ Retry failed:', retryError);
      // Continue with original response and let the repair logic handle it
    }
  }

  // Resolve any image placeholders in the response (logos, Pexels images, AI-generated)
  // This is done here so the progress callback can be passed through
  if (response.message) {
    response.message = await resolveImagePlaceholders(response.message, onImageProgress);
    // Re-parse changes after image placeholders are resolved
    const resolvedChanges = parseChangesFromResponse(response.message);
    if (resolvedChanges) {
      response.changes = resolvedChanges;
    }
  }

  return response;
}

// Streaming Gemini API call
async function sendGeminiMessageStreaming(
  messages: ChatMessage[],
  context: AIContext,
  modelConfig: { apiModel: string; _resolvedApiKey?: string; provider: AIProvider } & Record<string, any>,
  systemPrompt: string,
  contextInfo: string,
  onChunk: StreamCallback,
  images?: ImageAttachment[],
  signal?: AbortSignal
): Promise<AIResponse> {
  // Use resolved API key from backend, or fallback to legacy getGeminiApiKey
  const geminiApiKey = modelConfig._resolvedApiKey || getGeminiApiKey();

  if (!geminiApiKey) {
    // Fall back to non-streaming if no direct API key
    console.log('No Gemini API key for streaming, falling back to non-streaming');
    return sendGeminiMessage(messages, context, modelConfig, systemPrompt, contextInfo, images, signal);
  }

  // Build Gemini-format messages
  const geminiContents: any[] = [
    ...(contextInfo ? [
      { role: 'user', parts: [{ text: `[System Instructions]\n${systemPrompt}\n\n[Context]\n${contextInfo}\n[End Context]` }] },
      { role: 'model', parts: [{ text: 'I understand the instructions and context. I will help you create broadcast graphics and respond with structured JSON when creating elements.' }] },
    ] : [
      { role: 'user', parts: [{ text: `[System Instructions]\n${systemPrompt}` }] },
      { role: 'model', parts: [{ text: 'I understand. I will help you create broadcast graphics and respond with structured JSON when creating elements.' }] },
    ]),
    ...messages.slice(0, images && images.length > 0 ? -1 : undefined).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ];

  // Add images if present
  if (images && images.length > 0 && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    const parts: any[] = [];
    images.forEach((img) => {
      parts.push({
        inline_data: {
          mime_type: img.mimeType,
          data: img.data,
        },
      });
    });
    parts.push({ text: lastMessage.content });
    geminiContents.push({ role: 'user', parts });
  }

  // Create timeout signal - use extended timeout when processing images
  const timeoutMs = images && images.length > 0 ? AI_REQUEST_WITH_IMAGES_TIMEOUT_MS : AI_REQUEST_TIMEOUT_MS;
  const { signal: timeoutSignal, cleanup: cleanupTimeout } = createTimeoutSignal(timeoutMs, signal);

  try {
    // Use streamGenerateContent endpoint for streaming
    console.log('🔄 [Gemini Streaming] Starting stream with model:', modelConfig.apiModel, images?.length ? `(with ${images.length} images)` : '');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.apiModel}:streamGenerateContent?key=${geminiApiKey}&alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: 16384,
            temperature: 0.7,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
        signal: timeoutSignal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini streaming API request failed: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body for streaming');
    }

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE events
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              fullText += text;
              onChunk(text, fullText);
            }
          } catch (parseError) {
            // Log the problematic data for debugging
            console.debug('[Gemini Streaming] Skipped chunk:', data.substring(0, 100));
          }
        }
      }
    }

    // Clean up timeout on success
    cleanupTimeout();

    // Return raw text - image placeholders will be resolved in sendChatMessageStreaming with progress callback
    const changes = parseChangesFromResponse(fullText);
    return {
      message: fullText,
      changes: changes || undefined,
    };
  } catch (fetchError: any) {
    // Clean up timeout on error
    cleanupTimeout();

    // Handle abort and timeout errors
    if (fetchError.name === 'AbortError') {
      throw fetchError;
    }
    if (fetchError.name === 'TimeoutError') {
      console.error('❌ [Gemini Streaming] Request timed out');
      throw new Error('AI request timed out. Please try again or check your internet connection.');
    }
    console.error('❌ [Gemini Streaming] API call failed:', fetchError);
    console.log('⚠️ [Gemini Streaming] Falling back to non-streaming mode');
    // Fall back to non-streaming
    return sendGeminiMessage(messages, context, modelConfig, systemPrompt, contextInfo, images, signal);
  }
}

// Streaming Claude API call
async function sendClaudeMessageStreaming(
  messages: ChatMessage[],
  context: AIContext,
  modelConfig: { apiModel: string; _resolvedApiKey?: string; provider: AIProvider } & Record<string, any>,
  systemPrompt: string,
  contextInfo: string,
  onChunk: StreamCallback,
  images?: ImageAttachment[],
  signal?: AbortSignal
): Promise<AIResponse> {
  // Use resolved API key from backend, or fallback to legacy getClaudeApiKey
  const claudeApiKey = modelConfig._resolvedApiKey || getClaudeApiKey();

  if (!claudeApiKey) {
    // Fall back to non-streaming if no direct API key
    console.log('No Claude API key for streaming, falling back to non-streaming');
    return sendClaudeMessage(messages, context, modelConfig, systemPrompt, contextInfo, images, signal);
  }

  // Build Claude-format messages
  const apiMessages: any[] = messages.map((m) => {
    if (m.role === 'user' && images && images.length > 0 && m === messages[messages.length - 1]) {
      return {
        role: 'user',
        content: [
          ...images.map((img) => ({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mimeType,
              data: img.data,
            },
          })),
          { type: 'text', text: m.content },
        ],
      };
    }
    return {
      role: m.role,
      content: m.content,
    };
  });

  // Add context as first user message if available
  if (contextInfo && apiMessages.length > 0) {
    const firstUserIdx = apiMessages.findIndex((m) => m.role === 'user');
    if (firstUserIdx !== -1) {
      const firstMsg = apiMessages[firstUserIdx];
      if (typeof firstMsg.content === 'string') {
        firstMsg.content = `[Context]\n${contextInfo}\n[End Context]\n\n${firstMsg.content}`;
      }
    }
  }

  // Create timeout signal - use extended timeout when processing images
  const timeoutMs = images && images.length > 0 ? AI_REQUEST_WITH_IMAGES_TIMEOUT_MS : AI_REQUEST_TIMEOUT_MS;
  const { signal: timeoutSignal, cleanup: cleanupTimeout } = createTimeoutSignal(timeoutMs, signal);

  try {
    console.log('🔄 [Claude Streaming] Starting stream with model:', modelConfig.apiModel, images?.length ? `(with ${images.length} images)` : '');
    console.log('🔄 [Claude Streaming] Message count:', apiMessages.length);
    console.log('🔄 [Claude Streaming] Last message type:', typeof apiMessages[apiMessages.length - 1]?.content);
    if (images?.length) {
      console.log('🔄 [Claude Streaming] Image details:');
      images.forEach((img, i) => {
        console.log(`   Image ${i + 1}: mimeType=${img.mimeType}, data length=${img.data?.length || 0}`);
      });
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: modelConfig.apiModel,
        max_tokens: 16384,
        system: systemPrompt,
        messages: apiMessages,
        stream: true,
      }),
      signal: timeoutSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude streaming API request failed: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body for streaming');
    }

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE events from Claude
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);

            // Handle content_block_delta events
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              const text = parsed.delta.text;
              fullText += text;
              onChunk(text, fullText);
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }
    }

    // Clean up timeout on success
    cleanupTimeout();

    // Return raw text - image placeholders will be resolved in sendChatMessageStreaming with progress callback
    const changes = parseChangesFromResponse(fullText);
    return {
      message: fullText,
      changes: changes || undefined,
    };
  } catch (fetchError: any) {
    // Clean up timeout on error
    cleanupTimeout();

    // Handle abort and timeout errors
    if (fetchError.name === 'AbortError') {
      throw fetchError;
    }
    if (fetchError.name === 'TimeoutError') {
      console.error('❌ [Claude Streaming] Request timed out');
      throw new Error('AI request timed out. Please try again or check your internet connection.');
    }
    console.error('Claude streaming API call failed:', fetchError);
    // Fall back to non-streaming
    return sendClaudeMessage(messages, context, modelConfig, systemPrompt, contextInfo, images, signal);
  }
}
