import { createClient, User, Session, SupabaseClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
// Note: These are accessed via import.meta.env in Vite apps
let supabaseUrl: string | undefined;
let supabaseAnonKey: string | undefined;
let devUserEmail: string | undefined;
let devUserPassword: string | undefined;

// Try to access environment variables (will be set by consuming app)
if (typeof import.meta !== 'undefined' && import.meta.env) {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  devUserEmail = import.meta.env.VITE_DEV_USER_EMAIL;
  devUserPassword = import.meta.env.VITE_DEV_USER_PASSWORD;
}

// Validate environment variables
if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Custom fetch that disables caching
const customFetch = (url: RequestInfo | URL, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');
  return fetch(url, { ...options, headers, cache: 'no-store' });
};

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
    console.warn('[Supabase Beacon] Cannot send - not configured');
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

    console.log(`[Supabase Beacon] Queued update for ${table}`);
    return true;
  } catch (err) {
    console.warn('[Supabase Beacon] Failed to queue:', err);
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
    console.log(`[Supabase REST] PATCH ${table} where ${filter.column}=${filter.value}`);

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
      console.error(`[Supabase REST] Error: ${response.status} ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    console.log(`[Supabase REST] Success`);
    markSupabaseSuccess();
    return { success: true };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error(`[Supabase REST] Timeout after ${timeoutMs}ms`);
      return { success: false, error: `Timeout after ${timeoutMs}ms` };
    }
    console.error(`[Supabase REST] Error:`, err);
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
      console.error(`[Supabase REST] Error: ${response.status} ${errorText}`);
      return { data: null, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    markSupabaseSuccess();
    return { data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error(`[Supabase REST] Timeout after ${timeoutMs}ms`);
      return { data: null, error: `Timeout after ${timeoutMs}ms` };
    }
    console.error(`[Supabase REST] Error:`, err);
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
    console.log(`[Supabase REST] POST ${table} (insert, auth: ${accessToken ? 'user' : 'anon'})`);

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
      console.error(`[Supabase REST] Insert error: ${response.status} ${errorText}`);
      return { data: null, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    console.log(`[Supabase REST] Insert success`);
    markSupabaseSuccess();
    return { data: Array.isArray(result) ? result : [result] };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error(`[Supabase REST] Insert timeout after ${timeoutMs}ms`);
      return { data: null, error: `Timeout after ${timeoutMs}ms` };
    }
    console.error(`[Supabase REST] Insert error:`, err);
    return { data: null, error: err.message };
  }
}

// Track last successful operation time
let lastSuccessfulOperation = Date.now();
let consecutiveFailures = 0;

// Function to create a new Supabase client
function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
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
 */
export async function reconnectSupabase(): Promise<boolean> {
  console.log('[Supabase] Attempting to reconnect...');

  try {
    // Create a new client
    const newClient = createSupabaseClient();
    if (!newClient) {
      console.error('[Supabase] Failed to create new client - missing credentials');
      return false;
    }

    // Restore the auth session if we had one
    if (_supabase) {
      const { data: { session } } = await _supabase.auth.getSession();
      if (session) {
        console.log('[Supabase] Restoring session...');
        await newClient.auth.setSession(session);
      }
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
    // Check if user exists in users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', user.id)
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
        .from('organizations')
        .select('id')
        .eq('id', orgId)
        .single();

      if (!org) {
        // Create dev organization
        const { error: orgError } = await supabase
          .from('organizations')
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
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || 'Development User',
          organization_id: orgId,
          role: 'admin',
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
