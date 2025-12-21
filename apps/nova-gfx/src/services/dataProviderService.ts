/**
 * Data Provider Service
 * Fetches data provider configurations (API keys, settings) from the backend
 *
 * This service fetches API keys and configuration from the data_providers table.
 * It uses the get_provider_details RPC function which has SECURITY DEFINER
 * to return the actual API keys (not masked).
 */

export interface DataProvider {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string | null;
  is_active: boolean;
  api_key: string | null;
  api_secret: string | null;
  base_url: string | null;
  source_url: string | null;
  storage_path: string | null;
  api_version: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  refresh_interval_minutes: number | null;
  last_run: string | null;
}

// Cache for provider data to avoid repeated calls
const providerCache: Map<string, { data: DataProvider | null; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get provider details by ID using the get_provider_details RPC
 * Uses direct REST API call for reliability
 */
export async function getProviderDetails(providerId: string): Promise<DataProvider | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[DataProvider] Supabase not configured (missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY)');
    return null;
  }

  // Check cache first
  const cached = providerCache.get(providerId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[DataProvider] Using cached data for ${providerId}`);
    return cached.data;
  }

  try {
    console.log(`[DataProvider] Fetching provider details for: ${providerId}`);

    // Use RPC via REST API for SECURITY DEFINER access to sensitive data
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_provider_details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ p_id: providerId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DataProvider] RPC error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[DataProvider] RPC response for ${providerId}:`, data ? `found ${Array.isArray(data) ? data.length : 1} record(s)` : 'null');

    // RPC returns an array, get first item
    const provider = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!provider) {
      console.warn(`[DataProvider] Provider not found: ${providerId}`);
    } else {
      console.log(`[DataProvider] Provider found: ${provider.name} (active: ${provider.is_active}, has key: ${!!provider.api_key})`);
    }

    // Cache the result
    providerCache.set(providerId, { data: provider, timestamp: Date.now() });

    return provider;
  } catch (err) {
    console.error('[DataProvider] Exception fetching provider:', err);
    return null;
  }
}

/**
 * Get Mapbox API key from data providers
 */
export async function getMapboxApiKey(): Promise<string | null> {
  console.log('[DataProvider] Fetching Mapbox API key...');
  const provider = await getProviderDetails('maps_provider:mapbox');

  if (!provider) {
    console.warn('[DataProvider] Mapbox provider not found in data_providers');
    return null;
  }

  if (!provider.is_active) {
    console.warn('[DataProvider] Mapbox provider exists but is not active');
    return null;
  }

  if (!provider.api_key) {
    console.warn('[DataProvider] Mapbox provider exists but has no API key configured');
    return null;
  }

  console.log(`[DataProvider] Mapbox API key retrieved (${provider.api_key.substring(0, 10)}...)`);
  return provider.api_key;
}

/**
 * Clear the provider cache (useful after updates)
 */
export function clearProviderCache(providerId?: string): void {
  if (providerId) {
    providerCache.delete(providerId);
  } else {
    providerCache.clear();
  }
}
