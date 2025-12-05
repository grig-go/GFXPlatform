// Re-export everything from the shared supabase-client package
// This ensures there's only ONE Supabase client instance across the app
export {
  supabase,
  isSupabaseConfigured,
  isDevUserConfigured,
  initializeAuth,
  getCurrentUser,
  isAuthInitialized,
  waitForAuth,
  signOut,
} from '@emergent-platform/supabase-client';

export type { User, Session } from '@supabase/supabase-js';
