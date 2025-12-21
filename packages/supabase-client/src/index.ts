// Client and auth
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
  directRestInsert,
  // Beacon for window close scenarios
  sendBeaconUpdate,
  // Cookie storage for SSO
  cookieStorage,
  SHARED_AUTH_STORAGE_KEY,
  migrateLocalStorageToCookie,
} from './client';

export type { User, Session } from './client';

// Queries
export * from './queries';
