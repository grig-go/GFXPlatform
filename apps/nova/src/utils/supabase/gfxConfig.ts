/**
 * GFX Supabase Configuration
 * This config points to the Nova GFX Supabase instance where gfx_projects are stored.
 * Different from the main Nova Supabase used for dashboard_config, media, etc.
 */

// Use the main Supabase instance (where Nova GFX stores its data)
const gfxSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const gfxSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Get GFX Supabase URL
 */
export function getGfxSupabaseUrl(): string {
  return gfxSupabaseUrl;
}

/**
 * Get GFX Supabase Anon Key
 */
export function getGfxSupabaseAnonKey(): string {
  return gfxSupabaseAnonKey;
}

/**
 * Get headers for GFX Supabase requests
 */
export function getGfxSupabaseHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    'Authorization': `Bearer ${gfxSupabaseAnonKey}`,
    'apikey': gfxSupabaseAnonKey,
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
}

/**
 * Build a full URL for GFX Supabase REST API
 */
export function getGfxRestUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${gfxSupabaseUrl}/rest/v1/${cleanPath}`;
}

/**
 * Direct REST API select for GFX Supabase
 */
export async function gfxRestSelect<T = any>(
  table: string,
  columns = '*',
  filter?: { column: string; value: string },
  timeoutMs = 10000
): Promise<{ data: T[] | null; error?: string }> {
  if (!gfxSupabaseUrl || !gfxSupabaseAnonKey) {
    return { data: null, error: 'GFX Supabase not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let url = `${gfxSupabaseUrl}/rest/v1/${table}?select=${columns}`;
    if (filter) {
      url += `&${filter.column}=eq.${filter.value}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getGfxSupabaseHeaders(),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GFX Supabase] Error: ${response.status} ${errorText}`);
      return { data: null, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { data: null, error: `Timeout after ${timeoutMs}ms` };
    }
    return { data: null, error: err.message };
  }
}

/**
 * Direct REST API insert for GFX Supabase
 */
export async function gfxRestInsert<T = any>(
  table: string,
  data: Record<string, any> | Record<string, any>[],
  timeoutMs = 10000,
  accessToken?: string
): Promise<{ data: T[] | null; error?: string }> {
  if (!gfxSupabaseUrl || !gfxSupabaseAnonKey) {
    return { data: null, error: 'GFX Supabase not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const authToken = accessToken || gfxSupabaseAnonKey;

  try {
    const response = await fetch(`${gfxSupabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': gfxSupabaseAnonKey,
        'Authorization': `Bearer ${authToken}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GFX Supabase] Insert error: ${response.status} ${errorText}`);
      return { data: null, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    return { data: Array.isArray(result) ? result : [result] };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { data: null, error: `Timeout after ${timeoutMs}ms` };
    }
    return { data: null, error: err.message };
  }
}

/**
 * Direct REST API update for GFX Supabase
 */
export async function gfxRestUpdate(
  table: string,
  data: Record<string, any>,
  filter: { column: string; value: string },
  timeoutMs = 10000,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  if (!gfxSupabaseUrl || !gfxSupabaseAnonKey) {
    return { success: false, error: 'GFX Supabase not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const authToken = accessToken || gfxSupabaseAnonKey;

  try {
    const response = await fetch(
      `${gfxSupabaseUrl}/rest/v1/${table}?${filter.column}=eq.${filter.value}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': gfxSupabaseAnonKey,
          'Authorization': `Bearer ${authToken}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
        cache: 'no-store',
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, error: `Timeout after ${timeoutMs}ms` };
    }
    return { success: false, error: err.message };
  }
}

/**
 * Direct REST API delete for GFX Supabase
 */
export async function gfxRestDelete(
  table: string,
  filter: { column: string; value: string },
  timeoutMs = 10000
): Promise<{ success: boolean; error?: string }> {
  if (!gfxSupabaseUrl || !gfxSupabaseAnonKey) {
    return { success: false, error: 'GFX Supabase not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${gfxSupabaseUrl}/rest/v1/${table}?${filter.column}=eq.${filter.value}`,
      {
        method: 'DELETE',
        headers: getGfxSupabaseHeaders(),
        signal: controller.signal,
        cache: 'no-store',
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, error: `Timeout after ${timeoutMs}ms` };
    }
    return { success: false, error: err.message };
  }
}
