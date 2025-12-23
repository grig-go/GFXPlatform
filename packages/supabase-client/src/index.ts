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
  // Connection health monitoring
  startConnectionMonitor,
  stopConnectionMonitor,
  isConnectionHealthy,
  // Fresh client for critical operations
  createFreshClient,
  // Direct REST API (bypasses Supabase client entirely)
  directRestUpdate,
  directRestSelect,
  directRestInsert,
  directRestDelete,
  // Beacon for window close scenarios
  sendBeaconUpdate,
  // Cookie storage for SSO
  cookieStorage,
  SHARED_AUTH_STORAGE_KEY,
  migrateLocalStorageToCookie,
  // Cross-app SSO helpers
  getUrlWithAuthToken,
  receiveAuthTokenFromUrl,
  navigateWithAuth,
  AUTH_TOKEN_PARAM,
  // URL and config helpers
  getSupabaseUrl,
  getSupabaseAnonKey,
  getProjectId,
  getEdgeFunctionUrl,
  getRestUrl,
  getSupabaseHeaders,
  // Timeout and auto-recovery helpers
  withTimeout,
  withAutoRecovery,
  // Session management
  sessionReady,
  refreshSessionIfNeeded,
  checkAuthStatus,
  ensureAuth,
  // JWT expiration handling
  setJwtExpiredHandler,
  clearJwtExpiredHandler,
  resetJwtExpiredTrigger,
} from './client';

export type { User, Session } from './client';

// Queries
export * from './queries';
