/**
 * Nova Endpoint Service
 *
 * Fetches API endpoints registered for Nova GFX from the Nova backend.
 * These endpoints provide dynamic data (weather, elections, sports, etc.)
 * that can be bound to template elements.
 *
 * Includes retry logic and organization filtering to handle stale connections.
 */

import { supabase, ensureFreshConnection, forceReconnect } from '@/lib/supabase';
import { useAuthStore, getOrganizationId } from '@/stores/authStore';
import type { NovaEndpoint, NovaEndpointListResponse, FetchedDataSource } from '@/types/dataEndpoint';

// Cache for endpoints list - includes organization ID for cache invalidation
let endpointsCache: {
  endpoints: NovaEndpoint[] | null;
  lastFetch: number;
  organizationId: string | null;
} = {
  endpoints: null,
  lastFetch: 0,
  organizationId: null,
};

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const MAX_RETRIES = 2; // Maximum retry attempts for stale connections

/**
 * List all endpoints registered for Nova GFX
 * Calls the agent-wizard/list-by-target-app edge function
 * Filters by organization if user is authenticated
 * Includes retry logic for stale connection issues
 */
export async function listNovaEndpoints(forceRefresh = false): Promise<NovaEndpoint[]> {
  const now = Date.now();

  // Get current user's organization ID
  const user = useAuthStore.getState().user;
  const organizationId = getOrganizationId(user);

  // Check if organization changed (invalidates cache)
  const orgChanged = organizationId !== endpointsCache.organizationId;

  // Return cached data if still valid and org hasn't changed
  if (!forceRefresh && !orgChanged && endpointsCache.endpoints && (now - endpointsCache.lastFetch) < CACHE_TTL_MS) {
    console.log('[novaEndpointService] Returning cached endpoints');
    return endpointsCache.endpoints;
  }

  // If organization changed, clear cache first
  if (orgChanged) {
    console.log('[novaEndpointService] Organization changed, clearing cache');
    clearEndpointsCache();
  }

  // Try fetching with retry logic for stale connections
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[novaEndpointService] Fetching endpoints for nova-gfx (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);

      // On retry, force reconnect to get a fresh connection
      if (attempt > 0) {
        console.log('[novaEndpointService] Forcing reconnect due to previous failure...');
        await forceReconnect();
      } else {
        // First attempt: just ensure connection is fresh
        await ensureFreshConnection();
      }

      console.log('[novaEndpointService] Connection ready, invoking function...');

      const { data, error } = await supabase.functions.invoke<NovaEndpointListResponse>(
        'agent-wizard/list-by-target-app',
        {
          method: 'POST',
          body: {
            targetApp: 'nova-gfx',
            organizationId: organizationId || undefined,
          },
        }
      );

      if (error) {
        console.error('[novaEndpointService] Error fetching endpoints:', error);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a connection/auth error that might benefit from retry
        const errorMessage = String(error?.message || error).toLowerCase();
        const isRetryableError = errorMessage.includes('fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('jwt');

        if (isRetryableError && attempt < MAX_RETRIES) {
          console.log('[novaEndpointService] Retryable error, will retry...');
          continue;
        }

        throw error;
      }

      if (!data?.data) {
        console.warn('[novaEndpointService] No endpoints returned, data:', data);
        // Update cache with empty array to prevent repeated fetches
        endpointsCache = {
          endpoints: [],
          lastFetch: now,
          organizationId,
        };
        return [];
      }

      console.log(`[novaEndpointService] Found ${data.data.length} endpoints`);

      // Update cache with organization ID
      endpointsCache = {
        endpoints: data.data,
        lastFetch: now,
        organizationId,
      };

      return data.data;
    } catch (err) {
      console.error(`[novaEndpointService] Attempt ${attempt + 1} failed:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on final attempt
      if (attempt >= MAX_RETRIES) {
        break;
      }
    }
  }

  // All retries failed
  console.error('[novaEndpointService] All retry attempts failed:', lastError);

  // Return cached data if available, even if stale
  if (endpointsCache.endpoints) {
    console.log('[novaEndpointService] Returning stale cached endpoints');
    return endpointsCache.endpoints;
  }
  return [];
}

/**
 * Fetch data from a specific endpoint by slug
 * Returns the array of records from the endpoint
 * Includes retry logic for stale connection issues
 */
export async function fetchEndpointData(slug: string): Promise<Record<string, unknown>[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[novaEndpointService] Fetching data from endpoint: ${slug} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);

      // On retry, force reconnect to get a fresh connection
      if (attempt > 0) {
        console.log('[novaEndpointService] Forcing reconnect due to previous failure...');
        await forceReconnect();
      } else {
        // First attempt: just ensure connection is fresh
        await ensureFreshConnection();
      }

      const { data, error } = await supabase.functions.invoke<Record<string, unknown>[]>(
        `api-endpoints/${slug}`,
        {
          method: 'GET',
        }
      );

      if (error) {
        console.error(`[novaEndpointService] Error fetching data from ${slug}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a connection/auth error that might benefit from retry
        const errorMessage = String(error?.message || error).toLowerCase();
        const isRetryableError = errorMessage.includes('fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('jwt');

        if (isRetryableError && attempt < MAX_RETRIES) {
          console.log('[novaEndpointService] Retryable error, will retry...');
          continue;
        }

        throw error;
      }

      if (!data || !Array.isArray(data)) {
        console.warn(`[novaEndpointService] Invalid data from ${slug}:`, data);
        return [];
      }

      console.log(`[novaEndpointService] Fetched ${data.length} records from ${slug}`);
      return data;
    } catch (err) {
      console.error(`[novaEndpointService] Attempt ${attempt + 1} failed:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on final attempt
      if (attempt >= MAX_RETRIES) {
        break;
      }
    }
  }

  // All retries failed
  console.error(`[novaEndpointService] All retry attempts failed for ${slug}:`, lastError);
  throw lastError || new Error(`Failed to fetch data from ${slug}`);
}

/**
 * Fetch endpoint metadata and data together
 * Convenience function that gets both the endpoint info and its data
 */
export async function fetchEndpointWithData(slug: string): Promise<FetchedDataSource | null> {
  try {
    // Get endpoint info from cache or fetch
    const endpoints = await listNovaEndpoints();
    const endpoint = endpoints.find(e => e.slug === slug);

    if (!endpoint) {
      console.error(`[novaEndpointService] Endpoint not found: ${slug}`);
      return null;
    }

    // Fetch the actual data
    const data = await fetchEndpointData(slug);

    // Determine display field from schema config or auto-detect
    let displayField = 'auto';
    const schemaFields = endpoint.schema_config?.schema?.metadata?.jsonMappingConfig?.outputTemplate?.fields;
    if (schemaFields && schemaFields.length > 0) {
      // Try to find a "name" or "title" field, otherwise use first string field
      const nameField = schemaFields.find(f =>
        f.path.toLowerCase().includes('name') ||
        f.path.toLowerCase().includes('title')
      );
      if (nameField) {
        displayField = nameField.path;
      } else {
        const firstStringField = schemaFields.find(f => f.type === 'string');
        if (firstStringField) {
          displayField = firstStringField.path;
        }
      }
    }

    // Auto-detect display field from data if not found in schema
    if (displayField === 'auto' && data.length > 0) {
      const firstRecord = data[0];
      // Look for common display field patterns
      const candidates = ['name', 'title', 'label', 'State', 'location.name'];
      for (const candidate of candidates) {
        if (candidate.includes('.')) {
          // Nested path
          const parts = candidate.split('.');
          let val: unknown = firstRecord;
          for (const part of parts) {
            val = (val as Record<string, unknown>)?.[part];
          }
          if (val && typeof val === 'string') {
            displayField = candidate;
            break;
          }
        } else if (firstRecord[candidate] && typeof firstRecord[candidate] === 'string') {
          displayField = candidate;
          break;
        }
      }
    }

    return {
      id: endpoint.id,
      name: endpoint.name,
      slug: endpoint.slug,
      data,
      displayField,
      endpointUrl: endpoint.endpoint_url,
      lastFetched: Date.now(),
    };
  } catch (err) {
    console.error(`[novaEndpointService] Failed to fetch endpoint with data: ${slug}`, err);
    return null;
  }
}

/**
 * Clear the endpoints cache
 * Useful when you need to force a fresh fetch
 */
export function clearEndpointsCache(): void {
  endpointsCache = {
    endpoints: null,
    lastFetch: 0,
    organizationId: null,
  };
  console.log('[novaEndpointService] Cache cleared');
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
 * This is used to restore data sources when templates have data_source_id but no slug in config
 */
export async function getEndpointById(id: string): Promise<NovaEndpoint | null> {
  const endpoints = await listNovaEndpoints();
  return endpoints.find(e => e.id === id) || null;
}
