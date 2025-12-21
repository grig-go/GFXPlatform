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
  // Connection management
  isSupabaseHealthy,
  reconnectSupabase,
  markSupabaseSuccess,
  markSupabaseFailure,
  ensureFreshConnection,
  forceReconnect,
  getTimeSinceLastSuccess,
  // Fresh client for critical operations
  createFreshClient,
  // Direct REST API (bypasses Supabase client entirely)
  directRestUpdate,
  directRestSelect,
  // Beacon for window close scenarios
  sendBeaconUpdate,
  // Cookie storage for SSO
  cookieStorage,
  SHARED_AUTH_STORAGE_KEY,
  migrateLocalStorageToCookie,
} from '@emergent-platform/supabase-client';

export type { User, Session } from '@supabase/supabase-js';
