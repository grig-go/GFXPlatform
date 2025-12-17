import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from './config';
import { cookieStorage, SHARED_AUTH_STORAGE_KEY, migrateLocalStorageToCookie } from '../../lib/cookieStorage';

/**
 * Singleton Supabase client for frontend use
 * This prevents multiple instances and the associated warnings
 *
 * Configuration priority:
 * 1. Environment variables (.env file or .env.local)
 * 2. Hardcoded values from info.tsx (fallback)
 *
 * For local development, create a .env.local file with:
 *   VITE_SUPABASE_URL=http://localhost:54321
 *   VITE_SUPABASE_ANON_KEY=your-local-anon-key
 */
let supabaseClient: ReturnType<typeof createClient> | null = null;

// Migrate existing localStorage sessions on module load
const supabaseUrl = getSupabaseUrl();
const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || '';
migrateLocalStorageToCookie([
  `sb-${projectRef}-auth-token`, // Default Supabase key pattern
]);

export function getSupabaseClient() {
  if (!supabaseClient) {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();

    // Log configuration in development (helps with debugging)
    // Check if import.meta exists before accessing DEV property
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      const hasEnvVars = typeof import.meta !== 'undefined' &&
                         import.meta.env &&
                         !!import.meta.env.VITE_SUPABASE_URL;

      console.log('🔧 Supabase Configuration:', {
        url: url,
        usingEnvVars: hasEnvVars,
        mode: url.includes('localhost') || url.includes('127.0.0.1') ? 'LOCAL' : 'REMOTE'
      });
    }

    supabaseClient = createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: cookieStorage,
        storageKey: SHARED_AUTH_STORAGE_KEY
      }
    });
  }
  return supabaseClient;
}

// Default export for convenience
export const supabase = getSupabaseClient();
