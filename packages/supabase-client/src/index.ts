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
  // Beacon for window close scenarios
  sendBeaconUpdate,
} from './client';

export type { User, Session } from './client';

// Queries
export * from './queries';
