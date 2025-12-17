const supabaseUrl = import.meta.env.VITE_NOVA_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_NOVA_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Get Supabase URL from environment variables
 */
export function getSupabaseUrl(): string {
  return supabaseUrl;
}

/**
 * Get Supabase Anon Key from environment variables
 */
export function getSupabaseAnonKey(): string {
  return publicAnonKey;
}

/**
 * Get the project ID (extracted from URL)
 */
export function getProjectId(): string {
  // If it's a local URL, return the host:port
  if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1') || supabaseUrl.match(/192\.168\./)) {
    return supabaseUrl.replace('https://', '').replace('http://', '');
  }

  // Extract project ID from URL: https://project-id.supabase.co
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (match && match[1]) {
    return match[1];
  }

  return supabaseUrl.replace('https://', '').replace('http://', '');
}

/**
 * Build a full URL for Supabase edge functions
 * @param path - The path after /functions/v1/ (e.g., 'news_dashboard/news-articles')
 * @returns Full URL to the edge function
 */
export function getEdgeFunctionUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${supabaseUrl}/functions/v1/${cleanPath}`;
}

/**
 * Build a full URL for Supabase REST API
 * @param path - The path after /rest/v1/ (e.g., 'media_assets')
 * @returns Full URL to the REST endpoint
 */
export function getRestUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${supabaseUrl}/rest/v1/${cleanPath}`;
}

/**
 * Get default headers for Supabase requests
 * @param additionalHeaders - Optional additional headers to merge
 */
export function getSupabaseHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    'Authorization': `Bearer ${publicAnonKey}`,
    'apikey': publicAnonKey,
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
}
