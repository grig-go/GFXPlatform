/**
 * Singleton Supabase client for frontend use
 * Prevents multiple GoTrueClient instances
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use environment variables, fallback to hardcoded values from info.tsx for backwards compatibility
const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || 'https://bgkjcngrslxyqjitksim.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJna2pjbmdyc2x4eXFqaXRrc2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDk2MDgsImV4cCI6MjA3NzU4NTYwOH0.7BWAMP7l3PoPr9NnTUz2WT5qo2sqt8ggA2AAHrqfrR0';

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
