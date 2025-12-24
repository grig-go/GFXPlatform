/**
 * Supabase configuration helpers for Nova
 * Re-exports from the shared @emergent-platform/supabase-client package
 * with backward-compatible function signatures
 */

import {
  getSupabaseUrl as _getSupabaseUrl,
  getSupabaseAnonKey as _getSupabaseAnonKey,
  getProjectId as _getProjectId,
  getEdgeFunctionUrl as _getEdgeFunctionUrl,
  getSupabaseHeaders as _getSupabaseHeaders,
  supabase,
} from '@emergent-platform/supabase-client';

/**
 * Get the current user's access token for authenticated API calls.
 * This should be used instead of anon key when calling edge functions
 * that need to respect RLS organization filtering.
 * @returns The access token or anon key as fallback
 */
export async function getAccessToken(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
  } catch (e) {
    console.warn('[getAccessToken] Failed to get session:', e);
  }
  // Fallback to anon key
  return _getSupabaseAnonKey();
}

/**
 * Get Supabase URL from environment variables
 */
export function getSupabaseUrl(): string {
  return _getSupabaseUrl();
}

/**
 * Get Supabase Anon Key from environment variables
 */
export function getSupabaseAnonKey(): string {
  return _getSupabaseAnonKey();
}

/**
 * Get the project ID (extracted from URL)
 */
export function getProjectId(): string {
  return _getProjectId();
}

/**
 * Build a full URL for Supabase edge functions
 * @param path - The path after /functions/v1/ (e.g., 'news_dashboard/news-articles')
 * @returns Full URL to the edge function
 */
export function getEdgeFunctionUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return _getEdgeFunctionUrl(cleanPath);
}

/**
 * Build a full URL for Supabase REST API
 * @param path - The path after /rest/v1/ (e.g., 'media_assets')
 * @returns Full URL to the REST endpoint
 */
export function getRestUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${_getSupabaseUrl()}/rest/v1/${cleanPath}`;
}

/**
 * Get default headers for Supabase requests
 * @param additionalHeaders - Optional additional headers to merge
 */
export function getSupabaseHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    ..._getSupabaseHeaders(),
    ...additionalHeaders,
  };
}
