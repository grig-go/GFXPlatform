/**
 * Supabase client for Pulsar MCR
 * Re-exports from the shared @emergent-platform/supabase-client package
 */

export {
  // Client
  supabase,

  // Session management
  sessionReady,
  refreshSessionIfNeeded,
  checkAuthStatus,
  ensureAuth,

  // Connection management
  startConnectionMonitor,
  stopConnectionMonitor,
  isConnectionHealthy,
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
  directRestDelete,

  // Beacon for window close scenarios
  sendBeaconUpdate,

  // Storage
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

  // Auth
  isSupabaseConfigured,
  isDevUserConfigured,
  initializeAuth,
  getCurrentUser,
  isAuthInitialized,
  waitForAuth,
  signOut,
} from '@emergent-platform/supabase-client';

export type { User, Session } from '@emergent-platform/supabase-client';

// Backward-compatible aliases
import { startConnectionMonitor, stopConnectionMonitor, supabase } from '@emergent-platform/supabase-client';

// Alias for backward compatibility with existing code
export const startSessionMonitor = startConnectionMonitor;
export const stopSessionMonitor = stopConnectionMonitor;

// Listen for auth state changes to manage connection monitoring
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    startConnectionMonitor();
  } else if (event === 'SIGNED_OUT') {
    stopConnectionMonitor();
  }
});
