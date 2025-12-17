/**
 * Singleton Supabase client for frontend use
 * Prevents multiple GoTrueClient instances
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use environment variables - no hardcoded fallbacks
const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get the singleton Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    console.log('[Supabase Client] Singleton instance created');
  }
  return supabaseInstance;
}
