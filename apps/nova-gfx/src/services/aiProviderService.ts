/**
 * AI Provider Service
 *
 * Fetches AI provider configuration from the backend (ai_providers table).
 * This enables centralized management of AI models and API keys via Nova dashboard.
 */

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// Dashboard identifier for Nova-GFX
// The Nova dashboard uses object format: {dashboard: 'nova-gfx', textProvider: true, imageProvider: true}
export const NOVA_GFX_DASHBOARD = 'nova-gfx';

// Provider types
export type AIProviderType = 'gemini' | 'claude' | 'openai';

// Model from backend
export interface AIProviderModel {
  id: string;
  name: string;
  description: string;
  provider: AIProviderType;
  contextWindow?: number;
  capabilities?: string[];
}

// Provider from backend (formatted response)
export interface AIProvider {
  id: string;
  name: string;
  providerName: AIProviderType;
  type: 'text' | 'image-generation' | 'image-edit' | 'multimodal';
  description: string;
  apiKeyMasked: string;
  apiKeyConfigured: boolean;
  endpoint: string;
  model: string;  // Default model ID
  availableModels: AIProviderModel[];
  enabled: boolean;
  dashboardAssignments: string[];
  rateLimitPerMinute?: number;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

// Cache for providers
let providersCache: {
  text: AIProvider[] | null;
  image: AIProvider[] | null;
  lastFetch: number;
} = {
  text: null,
  image: null,
  lastFetch: 0,
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch AI providers for a specific dashboard from the backend
 * @param dashboard The dashboard name (e.g., 'nova-gfx')
 * @param type Optional provider type filter: 'text', 'image', 'video', 'imageEdit'
 */
export async function fetchProvidersByDashboard(dashboard: string, type?: 'text' | 'image' | 'video' | 'imageEdit'): Promise<AIProvider[]> {
  if (!supabase) {
    console.warn('[aiProviderService] Supabase not configured');
    return [];
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[aiProviderService] Supabase URL or key not configured');
      return [];
    }

    // Build URL with optional type parameter
    let url = `${supabaseUrl}/functions/v1/ai_provider/providers/by-dashboard/${dashboard}`;
    if (type) {
      url += `?type=${type}`;
    }

    // Use user's access token if available, otherwise fall back to anon key
    const accessToken = useAuthStore.getState().accessToken;
    const authHeader = accessToken ? `Bearer ${accessToken}` : `Bearer ${supabaseKey}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || 'Failed to fetch providers');
    }

    return result.providers || [];
  } catch (err) {
    console.error('[aiProviderService] Error fetching providers:', err);
    return [];
  }
}

/**
 * Get text AI providers for Nova-GFX (cached)
 */
export async function getTextProviders(forceRefresh = false): Promise<AIProvider[]> {
  const now = Date.now();

  if (!forceRefresh && providersCache.text && (now - providersCache.lastFetch) < CACHE_TTL_MS) {
    return providersCache.text;
  }

  const providers = await fetchProvidersByDashboard(NOVA_GFX_DASHBOARD, 'text');
  providersCache.text = providers;
  providersCache.lastFetch = now;

  return providers;
}

/**
 * Get image AI providers for Nova-GFX (cached)
 */
export async function getImageProviders(forceRefresh = false): Promise<AIProvider[]> {
  const now = Date.now();

  if (!forceRefresh && providersCache.image && (now - providersCache.lastFetch) < CACHE_TTL_MS) {
    return providersCache.image;
  }

  const providers = await fetchProvidersByDashboard(NOVA_GFX_DASHBOARD, 'image');
  providersCache.image = providers;
  providersCache.lastFetch = now;

  return providers;
}

/**
 * Get all available text models from all providers
 */
export async function getAllTextModels(): Promise<AIProviderModel[]> {
  const providers = await getTextProviders();
  const models: AIProviderModel[] = [];

  for (const provider of providers) {
    if (provider.availableModels) {
      models.push(...provider.availableModels);
    }
  }

  return models;
}

/**
 * Get all available image models from all providers
 */
export async function getAllImageModels(): Promise<AIProviderModel[]> {
  const providers = await getImageProviders();
  const models: AIProviderModel[] = [];

  for (const provider of providers) {
    if (provider.availableModels) {
      models.push(...provider.availableModels);
    }
  }

  return models;
}

/**
 * Get provider by model ID
 */
export async function getProviderByModelId(modelId: string, type: 'text' | 'image' = 'text'): Promise<AIProvider | null> {
  const providers = type === 'text' ? await getTextProviders() : await getImageProviders();

  for (const provider of providers) {
    const hasModel = provider.availableModels?.some(m => m.id === modelId);
    if (hasModel) {
      return provider;
    }
  }

  return null;
}

/**
 * Get the full API key for a provider (calls reveal endpoint)
 * Only use this when actually making API calls - not for display
 */
export async function revealProviderApiKey(providerId: string): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    // Use user's access token if available, otherwise fall back to anon key
    const accessToken = useAuthStore.getState().accessToken;
    const authHeader = accessToken ? `Bearer ${accessToken}` : `Bearer ${supabaseKey}`;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/ai_provider/providers/${providerId}/reveal`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.apiKey || null;
  } catch (err) {
    console.error('[aiProviderService] Error revealing API key:', err);
    return null;
  }
}

/**
 * Clear the providers cache (call after updating settings)
 */
export function clearProvidersCache(): void {
  providersCache = {
    text: null,
    image: null,
    lastFetch: 0,
  };
}

/**
 * Check if backend providers are available
 */
export async function hasBackendProviders(): Promise<boolean> {
  const providers = await getTextProviders();
  return providers.length > 0;
}
