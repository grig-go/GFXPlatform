/**
 * Supabase client for Pulsar Hub
 * Re-exports from the shared @emergent-platform/supabase-client package
 * This enables SSO across all Emergent apps via shared cookie storage
 */

export {
  supabase,
  // Auth helpers
  sessionReady,
  receiveAuthTokenFromUrl,
  checkAuthStatus,
  initializeAuth,
  getCurrentUser,
  isAuthInitialized,
  waitForAuth,
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
  // Cookie storage for SSO
  cookieStorage,
  SHARED_AUTH_STORAGE_KEY,
} from '@emergent-platform/supabase-client';

export type { User, Session } from '@supabase/supabase-js';

// Backward-compatible exports
import { getSupabaseUrl, getSupabaseAnonKey } from '@emergent-platform/supabase-client';
export const supabaseUrl = getSupabaseUrl();
export const publicAnonKey = getSupabaseAnonKey();
