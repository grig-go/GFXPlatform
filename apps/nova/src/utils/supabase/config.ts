import { projectId, publicAnonKey } from './info';

/**
 * Get Supabase URL from environment variables or fallback to info.tsx
 * Priority: VITE_NOVA_SUPABASE_URL > VITE_SUPABASE_URL > info.tsx fallback
 */
export function getSupabaseUrl(): string {
  // Check if import.meta.env exists (Vite environment)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // First check Nova-specific env var
    if (import.meta.env.VITE_NOVA_SUPABASE_URL) {
      return import.meta.env.VITE_NOVA_SUPABASE_URL;
    }
    // Fallback to generic env var
    if (import.meta.env.VITE_SUPABASE_URL) {
      return import.meta.env.VITE_SUPABASE_URL;
    }
  }

  // Fallback to projectId from info.tsx
  return `https://${projectId}.supabase.co`;
}

/**
 * Get Supabase Anon Key from environment variables or fallback to info.tsx
 * Priority: VITE_NOVA_SUPABASE_ANON_KEY > VITE_SUPABASE_ANON_KEY > info.tsx fallback
 */
export function getSupabaseAnonKey(): string {
  // Check if import.meta.env exists (Vite environment)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // First check Nova-specific env var
    if (import.meta.env.VITE_NOVA_SUPABASE_ANON_KEY) {
      return import.meta.env.VITE_NOVA_SUPABASE_ANON_KEY;
    }
    // Fallback to generic env var
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
  }

  // Fallback to publicAnonKey from info.tsx
  return publicAnonKey;
}

/**
 * Get the project ID (extracted from URL or from info.tsx)
 */
export function getProjectId(): string {
  const url = getSupabaseUrl();
  
  // If it's a local URL, return the fallback projectId
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return projectId;
  }
  
  // Extract project ID from URL: https://project-id.supabase.co
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (match && match[1]) {
    return match[1];
  }
  
  // Fallback
  return projectId;
}

/**
 * Build a full URL for Supabase edge functions
 * @param path - The path after /functions/v1/ (e.g., 'news_dashboard/news-articles')
 * @returns Full URL to the edge function
 */
export function getEdgeFunctionUrl(path: string): string {
  const baseUrl = getSupabaseUrl();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/functions/v1/${cleanPath}`;
}

/**
 * Build a full URL for Supabase REST API
 * @param path - The path after /rest/v1/ (e.g., 'media_assets')
 * @returns Full URL to the REST endpoint
 */
export function getRestUrl(path: string): string {
  const baseUrl = getSupabaseUrl();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/rest/v1/${cleanPath}`;
}

/**
 * Get default headers for Supabase requests
 * @param additionalHeaders - Optional additional headers to merge
 */
export function getSupabaseHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  const anonKey = getSupabaseAnonKey();
  return {
    'Authorization': `Bearer ${anonKey}`,
    'apikey': anonKey,
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
}