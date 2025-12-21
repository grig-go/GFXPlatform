/**
 * Nova Endpoint Service for Pulsar GFX
 *
 * Fetches API endpoints registered for Nova GFX from the Nova backend.
 * These endpoints provide dynamic data (weather, elections, sports, etc.)
 * that can be bound to template elements.
 */

import { supabase } from '@emergent-platform/supabase-client';

export interface NovaEndpoint {
  id: string;
  name: string;
  slug: string;
  endpoint_url: string;
  schema_config?: {
    schema?: {
      metadata?: {
        jsonMappingConfig?: {
          outputTemplate?: {
            fields?: Array<{ path: string; type: string }>;
          };
        };
      };
    };
  };
}

interface NovaEndpointListResponse {
  data: NovaEndpoint[];
}

// Cache for endpoints list
let endpointsCache: {
  endpoints: NovaEndpoint[] | null;
  lastFetch: number;
} = {
  endpoints: null,
  lastFetch: 0,
};

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Cache for endpoint data
const dataCache: Map<string, {
  data: Record<string, unknown>[];
  timestamp: number;
}> = new Map();
const DATA_CACHE_TTL_MS = 30 * 1000; // 30 seconds for data (refreshes more often)

/**
 * List all endpoints registered for Nova GFX
 * Calls the agent-wizard/list-by-target-app edge function
 */
export async function listNovaEndpoints(forceRefresh = false): Promise<NovaEndpoint[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (!forceRefresh && endpointsCache.endpoints && (now - endpointsCache.lastFetch) < CACHE_TTL_MS) {
    console.log('[novaEndpointService] Returning cached endpoints');
    return endpointsCache.endpoints;
  }

  try {
    console.log('[novaEndpointService] Fetching endpoints for nova-gfx...');

    const { data, error } = await supabase.functions.invoke<NovaEndpointListResponse>(
      'agent-wizard/list-by-target-app',
      {
        method: 'POST',
        body: { targetApp: 'nova-gfx' },
      }
    );

    if (error) {
      console.error('[novaEndpointService] Error fetching endpoints:', error);
      throw error;
    }

    if (!data?.data) {
      console.warn('[novaEndpointService] No endpoints returned');
      return [];
    }

    console.log(`[novaEndpointService] Found ${data.data.length} endpoints`);

    // Update cache
    endpointsCache = {
      endpoints: data.data,
      lastFetch: now,
    };

    return data.data;
  } catch (err) {
    console.error('[novaEndpointService] Failed to fetch endpoints:', err);
    // Return cached data if available, even if stale
    if (endpointsCache.endpoints) {
      console.log('[novaEndpointService] Returning stale cached endpoints');
      return endpointsCache.endpoints;
    }
    return [];
  }
}

/**
 * Fetch data from a specific endpoint by slug
 * Returns the array of records from the endpoint
 * Uses caching for faster subsequent loads
 */
export async function fetchEndpointData(slug: string, forceRefresh = false): Promise<Record<string, unknown>[]> {
  const now = Date.now();
  const cached = dataCache.get(slug);

  // Return cached data if still valid
  if (!forceRefresh && cached && (now - cached.timestamp) < DATA_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase.functions.invoke<Record<string, unknown>[]>(
      `api-endpoints/${slug}`,
      {
        method: 'GET',
      }
    );

    if (error) {
      throw error;
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Cache the result
    dataCache.set(slug, { data, timestamp: now });
    return data;
  } catch (err) {
    // Return stale cache if available
    if (cached) {
      return cached.data;
    }
    throw err;
  }
}

/**
 * Get endpoint info by slug (from cache if available)
 */
export async function getEndpointBySlug(slug: string): Promise<NovaEndpoint | null> {
  const endpoints = await listNovaEndpoints();
  return endpoints.find(e => e.slug === slug) || null;
}

/**
 * Get endpoint info by ID/UUID (from cache if available)
 */
export async function getEndpointById(id: string): Promise<NovaEndpoint | null> {
  const endpoints = await listNovaEndpoints();
  return endpoints.find(e => e.id === id) || null;
}

/**
 * Clear the endpoints cache
 */
export function clearEndpointsCache(): void {
  endpointsCache = {
    endpoints: null,
    lastFetch: 0,
  };
  dataCache.clear();
}

/**
 * Prefetch data for multiple slugs in parallel (fire-and-forget)
 * Call this when project loads to warm the cache
 */
export function prefetchEndpointData(slugs: string[]): void {
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))];
  if (uniqueSlugs.length === 0) return;

  // Fetch all in parallel, don't await
  Promise.all(
    uniqueSlugs.map(slug => fetchEndpointData(slug).catch(() => null))
  );
}
