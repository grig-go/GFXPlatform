import { createClient, User, Session, SupabaseClient } from '@supabase/supabase-js';
import {
  cookieStorage,
  SHARED_AUTH_STORAGE_KEY,
  migrateLocalStorageToCookie,
  getUrlWithAuthToken,
  receiveAuthTokenFromUrl,
  navigateWithAuth,
  AUTH_TOKEN_PARAM,
} from './cookieStorage';

// Re-export cookie storage and SSO helpers for apps that need it
export {
  cookieStorage,
  SHARED_AUTH_STORAGE_KEY,
  migrateLocalStorageToCookie,
  // Cross-app SSO helpers
  getUrlWithAuthToken,
  receiveAuthTokenFromUrl,
  navigateWithAuth,
  AUTH_TOKEN_PARAM,
};

// Read Supabase credentials from environment variables
let supabaseUrl = '';
let supabaseAnonKey = '';

if (typeof import.meta !== 'undefined' && import.meta.env) {
  // Support app-specific env vars with generic fallback
  supabaseUrl = import.meta.env.VITE_NOVA_SUPABASE_URL ||
                import.meta.env.VITE_PULSAR_MCR_SUPABASE_URL ||
                import.meta.env.VITE_SUPABASE_URL || '';
  supabaseAnonKey = import.meta.env.VITE_NOVA_SUPABASE_ANON_KEY ||
                    import.meta.env.VITE_PULSAR_MCR_SUPABASE_ANON_KEY ||
                    import.meta.env.VITE_SUPABASE_ANON_KEY || '';
}

/**
 * Get the Supabase URL
 */
export function getSupabaseUrl(): string {
  return supabaseUrl;
}

/**
 * Get the Supabase anon key
 */
export function getSupabaseAnonKey(): string {
  return supabaseAnonKey;
}

/**
 * Get the project ID from URL
 */
export function getProjectId(): string {
  return supabaseUrl.split('//')[1]?.split('.')[0] || '';
}

/**
 * Get the Edge Function URL for a given function name
 */
export function getEdgeFunctionUrl(functionName: string): string {
  return `${supabaseUrl}/functions/v1/${functionName}`;
}

/**
 * Get the REST API URL
 */
export function getRestUrl(): string {
  return `${supabaseUrl}/rest/v1`;
}

/**
 * Get standard Supabase headers for REST API calls
 */
export function getSupabaseHeaders(accessToken?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
  };
}

// Dev user credentials from env (these are fine to read from env)
let devUserEmail: string | undefined;
let devUserPassword: string | undefined;

if (typeof import.meta !== 'undefined' && import.meta.env) {
  devUserEmail = import.meta.env.VITE_DEV_USER_EMAIL;
  devUserPassword = import.meta.env.VITE_DEV_USER_PASSWORD;
}


// Global JWT expiration handler - will be set by apps that want auto-logout
let onJwtExpired: (() => void) | null = null;

/**
 * Set the callback to be called when JWT expires (401 with JWT expired error)
 * This allows apps to auto-logout users when their session expires
 */
export function setJwtExpiredHandler(handler: () => void): void {
  onJwtExpired = handler;
}

/**
 * Clear the JWT expiration handler
 */
export function clearJwtExpiredHandler(): void {
  onJwtExpired = null;
}

// Track if we've already triggered the JWT expired handler to prevent multiple calls
let jwtExpiredTriggered = false;

/**
 * Reset the JWT expired trigger (call this after user logs in again)
 */
export function resetJwtExpiredTrigger(): void {
  jwtExpiredTriggered = false;
}

// Custom fetch that disables caching and handles JWT expiration
const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');

  const response = await fetch(url, { ...options, headers, cache: 'no-store' });

  // Check for JWT expired error (401 with specific message)
  if (response.status === 401 && onJwtExpired && !jwtExpiredTriggered) {
    // Clone response to read body without consuming it
    const clonedResponse = response.clone();
    try {
      const body = await clonedResponse.text();
      if (body.includes('JWT expired') || body.includes('PGRST303')) {
        console.warn('[Supabase] JWT expired detected, triggering logout handler');
        jwtExpiredTriggered = true;
        // Call handler asynchronously to not block the current request
        setTimeout(() => {
          onJwtExpired?.();
        }, 0);
      }
    } catch {
      // Ignore body read errors
    }
  }

  return response;
};

/**
 * Helper to check response for JWT expired errors and trigger handler
 */
function checkJwtExpired(response: Response, errorText: string): void {
  if (response.status === 401 && onJwtExpired && !jwtExpiredTriggered) {
    if (errorText.includes('JWT expired') || errorText.includes('PGRST303')) {
      console.warn('[Supabase] JWT expired detected in direct REST call, triggering logout handler');
      jwtExpiredTriggered = true;
      setTimeout(() => {
        onJwtExpired?.();
      }, 0);
    }
  }
}

/**
 * Send a beacon update - use this for window close/unload scenarios.
 * Uses navigator.sendBeacon which is designed to survive page unload.
 * Returns true if beacon was queued (doesn't mean it succeeded on server).
 */
export function sendBeaconUpdate(
  table: string,
  data: Record<string, any>,
  filter: { column: string; value: string }
): boolean {
  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const url = `${supabaseUrl}/rest/v1/${table}?${filter.column}=eq.${filter.value}`;

  // Note: sendBeacon uses POST but Supabase REST API needs PATCH for updates
  // Unfortunately sendBeacon only supports POST, so we need a workaround
  // Option 1: Use a serverless function that accepts POST
  // Option 2: Use fetch with keepalive flag (more reliable for PATCH)

  // Using fetch with keepalive - this allows the request to outlive the page
  try {
    fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
      keepalive: true, // Key: allows request to complete after page unload
    }).catch(() => {
      // Ignore errors - we're closing anyway
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Direct REST API call that completely bypasses the Supabase client.
 * Use this for critical operations when the Supabase client is unresponsive.
 * This is the most reliable way to interact with Supabase when connections are stale.
 * @param accessToken - Optional JWT access token for authenticated operations (required for RLS-protected tables)
 */
export async function directRestUpdate(
  table: string,
  data: Record<string, any>,
  filter: { column: string; value: string },
  timeoutMs = 10000,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Supabase not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Use access token if provided, otherwise fall back to anon key
  const authToken = accessToken || supabaseAnonKey;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${table}?${filter.column}=eq.${filter.value}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken}`,
          'Prefer': 'return=minimal',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
        cache: 'no-store',
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      checkJwtExpired(response, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    markSupabaseSuccess();
    return { success: true };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, error: `Timeout after ${timeoutMs}ms` };
    }
    return { success: false, error: err.message };
  }
}

/**
 * Direct REST API select that completely bypasses the Supabase client.
 */
export async function directRestSelect<T = any>(
  table: string,
  columns = '*',
  filter?: { column: string; value: string },
  timeoutMs = 10000
): Promise<{ data: T[] | null; error?: string }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { data: null, error: 'Supabase not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let url = `${supabaseUrl}/rest/v1/${table}?select=${columns}`;
    if (filter) {
      url += `&${filter.column}=eq.${filter.value}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      checkJwtExpired(response, errorText);
      return { data: null, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    markSupabaseSuccess();
    return { data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { data: null, error: `Timeout after ${timeoutMs}ms` };
    }
    return { data: null, error: err.message };
  }
}

/**
 * Direct REST API insert that completely bypasses the Supabase client.
 * Use this for creating new records when the Supabase client is unresponsive.
 * Returns the created record(s) when successful.
 * @param accessToken - Optional user access token (JWT) for authenticated requests.
 *                      If not provided, uses anon key (will fail for tables with auth-only RLS).
 */
export async function directRestInsert<T = any>(
  table: string,
  data: Record<string, any> | Record<string, any>[],
  timeoutMs = 10000,
  accessToken?: string
): Promise<{ data: T[] | null; error?: string }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { data: null, error: 'Supabase not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Use access token if provided, otherwise fall back to anon key
  const authToken = accessToken || supabaseAnonKey;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${authToken}`,
        'Prefer': 'return=representation', // Return the created records
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      checkJwtExpired(response, errorText);
      return { data: null, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    markSupabaseSuccess();
    return { data: Array.isArray(result) ? result : [result] };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { data: null, error: `Timeout after ${timeoutMs}ms` };
    }
    return { data: null, error: err.message };
  }
}

/**
 * Direct REST API delete that completely bypasses the Supabase client.
 * Use this for deleting records when the Supabase client is unresponsive.
 * @param accessToken - Optional user access token (JWT) for authenticated requests.
 */
export async function directRestDelete(
  table: string,
  filter: { column: string; value: string } | string[],
  timeoutMs = 10000,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Supabase not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const authToken = accessToken || supabaseAnonKey;

  try {
    // Support both array of IDs and single filter object
    let queryString: string;
    if (Array.isArray(filter)) {
      // Array of IDs - use in() filter
      if (filter.length === 0) {
        return { success: true }; // Nothing to delete
      }
      const idsParam = filter.map(id => `"${id}"`).join(',');
      queryString = `id=in.(${idsParam})`;
    } else {
      // Single filter object
      queryString = `${filter.column}=eq.${filter.value}`;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${table}?${queryString}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        signal: controller.signal,
        cache: 'no-store',
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      checkJwtExpired(response, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    markSupabaseSuccess();
    return { success: true };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, error: `Timeout after ${timeoutMs}ms` };
    }
    return { success: false, error: err.message };
  }
}

// Track last successful operation time
let lastSuccessfulOperation = Date.now();
let consecutiveFailures = 0;

// Function to create a new Supabase client
function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  // Migrate any existing localStorage sessions to cookie storage
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || '';
  migrateLocalStorageToCookie([
    `sb-${projectRef}-auth-token`, // Default Supabase key pattern
  ]);

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Prevents issues with URL detection conflicts
      flowType: 'pkce',
      storage: cookieStorage,
      storageKey: SHARED_AUTH_STORAGE_KEY,
    },
    global: {
      fetch: customFetch,
    },
  });
}

/**
 * Create a completely fresh, isolated Supabase client for one-time operations.
 * Use this for critical operations that need a guaranteed fresh connection.
 * The client does NOT persist session and does NOT share state with the main client.
 * @returns A fresh SupabaseClient or null if not configured
 */
export function createFreshClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] Cannot create fresh client - missing credentials');
    return null;
  }

  console.log('[Supabase] Creating fresh isolated client...');

  // Create a completely independent client with NO session persistence
  // This ensures no stale state from the main client
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Don't persist - this is a one-shot client
      autoRefreshToken: false, // Don't auto-refresh - we're doing a quick operation
    },
    global: {
      fetch: customFetch,
    },
  });
}

// Create initial Supabase client
let _supabase: SupabaseClient | null = createSupabaseClient();

// Export a proxy that allows us to swap the underlying client
export const supabase = _supabase as SupabaseClient;

/**
 * Check if the Supabase connection is healthy by doing a quick ping
 * @param timeoutMs - Timeout in milliseconds (default 5000)
 * @returns true if healthy, false if not
 */
export async function isSupabaseHealthy(timeoutMs = 5000): Promise<boolean> {
  if (!_supabase || !supabaseUrl || !supabaseAnonKey) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Use a simple REST API call to check connection
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 404; // 404 is OK, means server responded
  } catch (err) {
    console.warn('[Supabase] Health check failed:', err);
    return false;
  }
}

/**
 * Recreate the Supabase client to get a fresh connection
 * Call this when operations are timing out
 *
 * IMPORTANT: Properly disposes the old client to prevent multiple GoTrueClient instances
 */
export async function reconnectSupabase(): Promise<boolean> {
  console.log('[Supabase] Attempting to reconnect...');

  const oldClient = _supabase;

  try {
    // CRITICAL: Properly dispose the old client BEFORE creating a new one
    // This prevents "Multiple GoTrueClient instances detected" warning
    // which can cause session conflicts and connection instability
    if (oldClient) {
      try {
        // 1. Stop the auto-refresh timer to prevent background token refresh conflicts
        await oldClient.auth.stopAutoRefresh();
        console.log('[Supabase] Stopped auto-refresh on old client');

        // 2. Remove all realtime channels
        await oldClient.removeAllChannels();
        console.log('[Supabase] Removed all channels from old client');
      } catch (e) {
        // Don't block on cleanup errors - the old client might already be in a bad state
        console.warn('[Supabase] Error during old client cleanup:', e);
      }
    }

    // Get the session BEFORE disposing (we already stopped auto-refresh above)
    let sessionToRestore = null;
    if (oldClient) {
      try {
        const { data: { session } } = await oldClient.auth.getSession();
        sessionToRestore = session;
      } catch (e) {
        console.warn('[Supabase] Could not get session from old client:', e);
      }
    }

    // Create a new client
    const newClient = createSupabaseClient();
    if (!newClient) {
      console.error('[Supabase] Failed to create new client - missing credentials');
      return false;
    }

    // Restore the auth session if we had one
    if (sessionToRestore) {
      console.log('[Supabase] Restoring session...');
      await newClient.auth.setSession(sessionToRestore);
    }

    // Replace the client reference
    // Note: This replaces the internal reference, existing imports will get stale
    // But new calls through the proxy-like export will use the new client
    _supabase = newClient;
    Object.assign(supabase, newClient);

    // Test the new connection
    const isHealthy = await isSupabaseHealthy(3000);
    if (isHealthy) {
      console.log('[Supabase] Reconnected successfully');
      consecutiveFailures = 0;
      lastSuccessfulOperation = Date.now();
      return true;
    } else {
      console.error('[Supabase] Reconnected but health check failed');
      return false;
    }
  } catch (err) {
    console.error('[Supabase] Reconnection failed:', err);
    return false;
  }
}

/**
 * Mark a successful Supabase operation (call after successful queries)
 */
export function markSupabaseSuccess(): void {
  consecutiveFailures = 0;
  lastSuccessfulOperation = Date.now();
}

/**
 * Mark a failed Supabase operation and potentially trigger reconnection
 * @returns true if we should retry the operation
 */
export async function markSupabaseFailure(): Promise<boolean> {
  consecutiveFailures++;

  // After 2 consecutive failures, try to reconnect
  if (consecutiveFailures >= 2) {
    console.log(`[Supabase] ${consecutiveFailures} consecutive failures, attempting reconnect...`);
    const reconnected = await reconnectSupabase();
    if (reconnected) {
      return true; // Caller should retry
    }
  }

  return false;
}

/**
 * Get time since last successful operation
 */
export function getTimeSinceLastSuccess(): number {
  return Date.now() - lastSuccessfulOperation;
}

/**
 * Ensure connection is fresh before critical operations
 * Reconnects if no successful operation in the last 2 minutes OR if health check fails
 */
export async function ensureFreshConnection(forceHealthCheck = false): Promise<void> {
  const timeSinceSuccess = getTimeSinceLastSuccess();
  const STALE_THRESHOLD = 2 * 60 * 1000; // 2 minutes (reduced from 5)

  // Always do health check if forced or if stale
  if (forceHealthCheck || timeSinceSuccess > STALE_THRESHOLD) {
    console.log(`[Supabase] Checking connection health (${Math.round(timeSinceSuccess / 1000)}s since last success, forced=${forceHealthCheck})...`);
    const isHealthy = await isSupabaseHealthy(3000);

    if (!isHealthy) {
      console.log('[Supabase] Connection unhealthy, reconnecting...');
      await reconnectSupabase();
    } else {
      console.log('[Supabase] Connection healthy');
      lastSuccessfulOperation = Date.now();
    }
  }
}

/**
 * Force reconnect - use this before critical operations that have been failing
 */
export async function forceReconnect(): Promise<boolean> {
  console.log('[Supabase] Forcing reconnection...');
  return reconnectSupabase();
}

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Check if dev user is configured
export function isDevUserConfigured(): boolean {
  return Boolean(devUserEmail && devUserPassword);
}

// Track auth state
let currentUser: User | null = null;
let authInitialized = false;
let authInitPromise: Promise<User | null> | null = null;

/**
 * Initialize authentication - auto-login with dev user in development
 * Call this once on app startup
 */
export async function initializeAuth(): Promise<User | null> {
  // Return existing promise if already initializing
  if (authInitPromise) {
    return authInitPromise;
  }

  authInitPromise = (async () => {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, skipping auth');
      authInitialized = true;
      return null;
    }

    try {
      // Check for existing session first
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        console.log('Existing session found:', session.user.email);
        currentUser = session.user;
        authInitialized = true;
        return session.user;
      }

      // No existing session - try dev user login
      if (isDevUserConfigured()) {
        console.log('Attempting dev user login...');

        // Try to sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: devUserEmail!,
          password: devUserPassword!,
        });

        if (error) {
          // If user doesn't exist, try to create it
          if (error.message.includes('Invalid login credentials')) {
            console.log('Dev user not found, creating...');

            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: devUserEmail!,
              password: devUserPassword!,
              options: {
                data: {
                  name: 'Development User',
                  role: 'admin',
                },
              },
            });

            if (signUpError) {
              console.error('Failed to create dev user:', signUpError.message);
            } else if (signUpData.user) {
              console.log('Dev user created:', signUpData.user.email);

              // Sign in after signup (in case email confirmation is disabled)
              const { data: loginData } = await supabase.auth.signInWithPassword({
                email: devUserEmail!,
                password: devUserPassword!,
              });

              if (loginData.user) {
                currentUser = loginData.user;
                await ensureDevUserInDatabase(loginData.user);
              }
            }
          } else {
            console.error('Dev user login failed:', error.message);
          }
        } else if (data.user) {
          console.log('Dev user logged in:', data.user.email);
          currentUser = data.user;
          await ensureDevUserInDatabase(data.user);
        }
      } else {
        console.log('No dev user configured, running in anonymous mode');
        console.log('   Add VITE_DEV_USER_EMAIL and VITE_DEV_USER_PASSWORD to .env for auth');
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
    }

    authInitialized = true;
    return currentUser;
  })();

  return authInitPromise;
}

/**
 * Ensure the dev user exists in the users table and has an organization
 */
async function ensureDevUserInDatabase(user: User): Promise<void> {
  if (!supabase) return;

  try {
    // Check if user exists in u_users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('u_users')
      .select('id, organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected for new users
      console.error('Error checking user:', fetchError);
      return;
    }

    if (!existingUser) {
      // Get or create dev organization
      let orgId = '00000000-0000-0000-0000-000000000001'; // Default dev org

      const { data: org } = await supabase
        .from('u_organizations')
        .select('id')
        .eq('id', orgId)
        .single();

      if (!org) {
        // Create dev organization
        const { error: orgError } = await supabase
          .from('u_organizations')
          .insert({
            id: orgId,
            name: 'Nova Development',
            slug: 'nova-dev',
            settings: {},
          });

        if (orgError && !orgError.message.includes('duplicate')) {
          console.error('Error creating dev org:', orgError);
        }
      }

      // Create user record
      const { error: userError } = await supabase
        .from('u_users')
        .insert({
          auth_user_id: user.id,
          email: user.email,
          name: user.user_metadata?.name || 'Development User',
          organization_id: orgId,
          org_role: 'admin',
        });

      if (userError && !userError.message.includes('duplicate')) {
        console.error('Error creating user record:', userError);
      } else {
        console.log('User record created in database');
      }
    }
  } catch (err) {
    console.error('Error ensuring user in database:', err);
  }
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): User | null {
  return currentUser;
}

/**
 * Check if auth has been initialized
 */
export function isAuthInitialized(): boolean {
  return authInitialized;
}

/**
 * Wait for auth to be initialized
 */
export async function waitForAuth(): Promise<User | null> {
  if (authInitialized) {
    return currentUser;
  }
  return initializeAuth();
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
    currentUser = null;
  }
}

// Re-export types for convenience
export type { User, Session };

// ============================================================================
// Timeout and Auto-Recovery Helpers
// ============================================================================

/**
 * Helper to wrap a promise with a timeout
 * Useful for detecting hung database queries
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[Supabase] ${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Execute a Supabase operation with automatic recovery on timeout
 * If the operation times out, resets the client and retries once
 *
 * @param operationFn Function that takes a supabase client and returns a promise
 * @param timeoutMs Timeout in milliseconds (default: 10000)
 * @param operationName Name for logging
 */
export async function withAutoRecovery<T>(
  operationFn: (client: SupabaseClient) => Promise<T>,
  timeoutMs: number = 10000,
  operationName: string = 'operation'
): Promise<T> {
  const startTime = Date.now();

  try {
    // First attempt with current client
    const result = await withTimeout(operationFn(supabase), timeoutMs, operationName);
    markSupabaseSuccess();
    return result;
  } catch (error: any) {
    // Check if this was a timeout error
    if (error.message?.includes('timed out')) {
      console.warn(`[Supabase] ${operationName} timed out after ${Date.now() - startTime}ms, resetting client and retrying...`);

      // Reset the stuck client
      await reconnectSupabase();

      // Retry with fresh client
      const retryStart = Date.now();

      try {
        const result = await withTimeout(operationFn(supabase), timeoutMs, `${operationName} (retry)`);
        console.log(`[Supabase] ${operationName} succeeded on retry in ${Date.now() - retryStart}ms`);
        markSupabaseSuccess();
        return result;
      } catch (retryError: any) {
        console.error(`[Supabase] ${operationName} failed on retry:`, retryError.message);
        throw retryError;
      }
    }

    // Not a timeout, just rethrow
    throw error;
  }
}

// ============================================================================
// Connection Health Monitoring
// ============================================================================

let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
let connectionHealthy = true;

// Connection health configuration
const HEALTH_CHECK_INTERVAL = 30000; // Check every 30 seconds
const CONNECTION_STALE_THRESHOLD = 60000; // Consider stale after 60 seconds of no activity
const HEALTH_CHECK_TIMEOUT = 5000; // 5 second timeout for health checks

/**
 * Check if the connection is currently healthy
 */
export function isConnectionHealthy(): boolean {
  return connectionHealthy;
}

/**
 * Perform a lightweight health check to detect stuck connections
 */
async function performHealthCheck(): Promise<boolean> {
  if (!_supabase) return true;

  const timeSinceLastSuccess = Date.now() - lastSuccessfulOperation;
  if (timeSinceLastSuccess < CONNECTION_STALE_THRESHOLD) {
    return true;
  }

  console.log(`[Supabase] Health check - ${timeSinceLastSuccess}ms since last success`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(`${supabaseUrl}/rest/v1/?limit=0`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 404) {
      markSupabaseSuccess();
      return true;
    }

    console.warn('[Supabase] Health check failed with status:', response.status);
    return false;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('[Supabase] Health check timed out - connection may be stuck');
    } else {
      console.warn('[Supabase] Health check error:', error.message);
    }
    return false;
  }
}

/**
 * Start the connection health monitor
 * Periodically checks connection health and auto-recovers if stuck
 */
export function startConnectionMonitor(): void {
  if (healthCheckInterval) {
    return; // Already running
  }

  console.log('[Supabase] Starting connection health monitor');

  healthCheckInterval = setInterval(async () => {
    const healthy = await performHealthCheck();

    if (!healthy && connectionHealthy) {
      console.warn('[Supabase] Connection appears stuck, attempting recovery...');
      connectionHealthy = false;

      await reconnectSupabase();

      setTimeout(async () => {
        const recoveredHealthy = await performHealthCheck();
        if (recoveredHealthy) {
          console.log('[Supabase] Connection recovered after reset');
          connectionHealthy = true;
        } else {
          console.error('[Supabase] Connection still unhealthy after reset');
        }
      }, 1000);
    }
  }, HEALTH_CHECK_INTERVAL);
}

/**
 * Stop the connection health monitor
 */
export function stopConnectionMonitor(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('[Supabase] Stopped connection health monitor');
  }
}

// ============================================================================
// Session Initialization
// ============================================================================

/**
 * Ensure session is properly initialized from storage
 * This fixes issues where Supabase reads storage but doesn't set the auth headers
 */
const ensureSessionInitialized = async (): Promise<void> => {
  if (!_supabase) return;

  console.log('[Supabase] ensureSessionInitialized starting...');

  try {
    // First check if Supabase already has a session
    const { data: { session: existingSession }, error } = await Promise.race([
      _supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session init timeout')), 5000)
      )
    ]);

    console.log('[Supabase] getSession result:', { hasSession: !!existingSession, error: error?.message });

    if (existingSession) {
      console.log('[Supabase] Session already initialized, user:', existingSession.user?.email);
      return;
    }
  } catch (error) {
    console.warn('[Supabase] getSession() timed out, checking storage:', error);
  }

  // If no session from Supabase, check storage
  const storedSession = cookieStorage.getItem(SHARED_AUTH_STORAGE_KEY);
  console.log('[Supabase] Storage check:', { hasStored: !!storedSession, length: storedSession?.length });

  if (storedSession) {
    try {
      const sessionData = JSON.parse(storedSession);
      console.log('[Supabase] Found stored session data, keys:', Object.keys(sessionData));

      const accessToken = sessionData.access_token;
      const refreshToken = sessionData.refresh_token;

      if (accessToken && refreshToken) {
        console.log('[Supabase] Restoring session from storage');
        try {
          await Promise.race([
            _supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('setSession timeout')), 5000)
            )
          ]);
          console.log('[Supabase] Session restored successfully');
        } catch (e) {
          console.warn('[Supabase] setSession timed out or failed:', e);
          cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);
        }
      } else {
        console.warn('[Supabase] Storage exists but missing tokens');
        cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('[Supabase] Error parsing session from storage:', e);
      cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);
    }
  } else {
    console.log('[Supabase] No stored session found');
  }
};

/**
 * Promise that resolves when session is ready
 * Components can await this before making queries
 */
export const sessionReady: Promise<void> = _supabase ? ensureSessionInitialized() : Promise.resolve();

/**
 * Refresh session if needed (when token is about to expire)
 */
export async function refreshSessionIfNeeded(): Promise<Session | null> {
  if (!_supabase) return null;

  const { data: { session }, error } = await _supabase.auth.getSession();

  if (error) {
    console.error('Session error:', error);
    return null;
  }

  if (!session) {
    console.warn('No active session found');
    return null;
  }

  // Check if session is expired or about to expire (within 5 minutes)
  const now = new Date();
  const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : new Date(0);
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();

  if (timeUntilExpiry < 5 * 60 * 1000) {
    console.log('Session expiring soon, refreshing...');
    const { data: { session: refreshedSession }, error: refreshError } = await _supabase.auth.refreshSession();

    if (refreshError) {
      console.error('Failed to refresh session:', refreshError);
      return null;
    }

    return refreshedSession;
  }

  return session;
}

/**
 * Check current auth status
 */
export async function checkAuthStatus(): Promise<{
  isAuthenticated: boolean;
  user: User | null;
  expiresAt: Date | null;
}> {
  if (!_supabase) {
    return { isAuthenticated: false, user: null, expiresAt: null };
  }

  const { data: { session } } = await _supabase.auth.getSession();
  return {
    isAuthenticated: !!session,
    user: session?.user || null,
    expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null
  };
}

/**
 * Ensure auth before operation (throws if not authenticated)
 */
export async function ensureAuth(): Promise<Session> {
  if (!_supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}
