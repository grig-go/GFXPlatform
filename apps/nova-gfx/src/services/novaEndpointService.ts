/**
 * Nova Endpoint Service
 *
 * Fetches API endpoints registered for Nova GFX from the Nova backend.
 * These endpoints provide dynamic data (weather, elections, sports, etc.)
 * that can be bound to template elements.
 */

import { supabase, ensureFreshConnection } from '@/lib/supabase';
import type { NovaEndpoint, NovaEndpointListResponse, FetchedDataSource } from '@/types/dataEndpoint';

// Cache for endpoints list
let endpointsCache: {
  endpoints: NovaEndpoint[] | null;
  lastFetch: number;
} = {
  endpoints: null,
  lastFetch: 0,
};

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

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

    // Ensure fresh connection before making request
    await ensureFreshConnection();
    console.log('[novaEndpointService] Connection refreshed, invoking function...');

    const { data, error } = await supabase.functions.invoke<NovaEndpointListResponse>(
      'agent-wizard/list-by-target-app',
      {
        method: 'POST',
        body: { targetApp: 'nova-gfx' },
      }
    );

    console.log('[novaEndpointService] Response:', { data, error });

    if (error) {
      console.error('[novaEndpointService] Error fetching endpoints:', error);
      throw error;
    }

    if (!data?.data) {
      console.warn('[novaEndpointService] No endpoints returned, data:', data);
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
 */
export async function fetchEndpointData(slug: string): Promise<Record<string, unknown>[]> {
  try {
    console.log(`[novaEndpointService] Fetching data from endpoint: ${slug}`);

    // Ensure fresh connection before making request
    await ensureFreshConnection();

    const { data, error } = await supabase.functions.invoke<Record<string, unknown>[]>(
      `api-endpoints/${slug}`,
      {
        method: 'GET',
      }
    );

    if (error) {
      console.error(`[novaEndpointService] Error fetching data from ${slug}:`, error);
      throw error;
    }

    if (!data || !Array.isArray(data)) {
      console.warn(`[novaEndpointService] Invalid data from ${slug}:`, data);
      return [];
    }

    console.log(`[novaEndpointService] Fetched ${data.length} records from ${slug}`);
    return data;
  } catch (err) {
    console.error(`[novaEndpointService] Failed to fetch data from ${slug}:`, err);
    throw err;
  }
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
