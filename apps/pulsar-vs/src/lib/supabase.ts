/**
 * Supabase client for Pulsar-VS
 * Re-exports from the shared @emergent-platform/supabase-client package
 * This enables SSO across all Emergent apps
 */

export {
  supabase,
  // Auth helpers
  sessionReady,
  receiveAuthTokenFromUrl,
  checkAuthStatus,
  signOut,
  // Connection management
  isSupabaseHealthy,
  reconnectSupabase,
  markSupabaseSuccess,
  withAutoRecovery,
  startConnectionMonitor,
  stopConnectionMonitor,
  isConnectionHealthy,
  // URL helpers
  getSupabaseUrl,
  getSupabaseAnonKey,
  getEdgeFunctionUrl,
  // Cookie storage for SSO (no longer needed - use signOut instead)
  cookieStorage,
  SHARED_AUTH_STORAGE_KEY,
} from '@emergent-platform/supabase-client';