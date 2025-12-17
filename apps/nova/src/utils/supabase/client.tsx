import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from './config';
import { cookieStorage, SHARED_AUTH_STORAGE_KEY, migrateLocalStorageToCookie } from '../../lib/cookieStorage';

/**
 * Singleton Supabase client for frontend use
 * This prevents multiple instances and the associated warnings
 *
 * Configuration priority:
 * 1. VITE_NOVA_SUPABASE_URL / VITE_NOVA_SUPABASE_ANON_KEY (Nova-specific)
 * 2. VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (generic fallback)
 * 3. Hardcoded values from info.tsx (last resort)
 *
 * For local development, set in root .env:
 *   VITE_NOVA_SUPABASE_URL=https://your-project.supabase.co
 *   VITE_NOVA_SUPABASE_ANON_KEY=your-anon-key
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
      const hasNovaEnvVars = !!import.meta.env.VITE_NOVA_SUPABASE_URL;
      const hasGenericEnvVars = !!import.meta.env.VITE_SUPABASE_URL;

      console.log('🔧 Nova Supabase Configuration:', {
        url: url,
        usingNovaEnvVars: hasNovaEnvVars,
        usingGenericEnvVars: hasGenericEnvVars,
        mode: url.includes('localhost') || url.includes('127.0.0.1') ? 'LOCAL' : 'REMOTE',
        VITE_NOVA_SUPABASE_URL: import.meta.env.VITE_NOVA_SUPABASE_URL || 'not set',
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'not set'
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
