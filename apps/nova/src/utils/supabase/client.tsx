import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from './config';
import { cookieStorage, SHARED_AUTH_STORAGE_KEY, migrateLocalStorageToCookie } from '../../lib/cookieStorage';

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
  operationFn: (client: ReturnType<typeof createClient>) => Promise<T>,
  timeoutMs: number = 10000,
  operationName: string = 'operation'
): Promise<T> {
  const startTime = Date.now();

  try {
    // First attempt with current client
    const client = getSupabaseClient();
    const result = await withTimeout(operationFn(client), timeoutMs, operationName);
    // Mark successful query for health monitoring
    markQuerySuccess();
    return result;
  } catch (error: any) {
    // Check if this was a timeout error
    if (error.message?.includes('timed out')) {
      console.warn(`[Supabase] ${operationName} timed out after ${Date.now() - startTime}ms, resetting client and retrying...`);

      // Reset the stuck client (properly disposes old client)
      await resetSupabaseClient();

      // Retry with fresh client
      const freshClient = getSupabaseClient();
      const retryStart = Date.now();

      try {
        const result = await withTimeout(operationFn(freshClient), timeoutMs, `${operationName} (retry)`);
        console.log(`[Supabase] ${operationName} succeeded on retry in ${Date.now() - retryStart}ms`);
        // Mark successful query for health monitoring
        markQuerySuccess();
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

/**
 * Singleton Supabase client for frontend use
 * This prevents multiple instances and the associated warnings
 *
 * Configuration priority:
 * 1. VITE_NOVA_SUPABASE_URL / VITE_NOVA_SUPABASE_ANON_KEY (Nova-specific)
 * 2. VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (generic fallback)
 * 3. Hardcoded values from info.tsx (last resort)
 *
 * For local development, set in root .env:
 *   VITE_NOVA_SUPABASE_URL=https://your-project.supabase.co
 *   VITE_NOVA_SUPABASE_ANON_KEY=your-anon-key
 */
let supabaseClient: ReturnType<typeof createClient> | null = null;
let clientVersion = 0; // Track client version for debugging
let lastSuccessfulQuery = Date.now(); // Track last successful operation
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
let connectionHealthy = true;

// Connection health configuration
const HEALTH_CHECK_INTERVAL = 30000; // Check every 30 seconds
const CONNECTION_STALE_THRESHOLD = 60000; // Consider stale after 60 seconds of no activity
const HEALTH_CHECK_TIMEOUT = 5000; // 5 second timeout for health checks

// Migrate existing localStorage sessions on module load
const supabaseUrl = getSupabaseUrl();
const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || '';
migrateLocalStorageToCookie([
  `sb-${projectRef}-auth-token`, // Default Supabase key pattern
]);

/**
 * Mark a successful query - called to track connection health
 */
export function markQuerySuccess(): void {
  lastSuccessfulQuery = Date.now();
  if (!connectionHealthy) {
    console.log('[Supabase] Connection restored');
    connectionHealthy = true;
  }
}

/**
 * Check if the connection is currently healthy
 */
export function isConnectionHealthy(): boolean {
  return connectionHealthy;
}

/**
 * Reset the Supabase client singleton
 * Use this when the client gets into a stuck state (e.g., auth lock hung)
 * This forces creation of a fresh client on next getSupabaseClient() call
 *
 * IMPORTANT: Properly disposes the old client to prevent multiple GoTrueClient instances
 */
export async function resetSupabaseClient(): Promise<void> {
  const oldClient = supabaseClient;

  console.log('[Supabase] Resetting client (version was:', clientVersion, ')');

  // CRITICAL: Properly dispose the old client before creating a new one
  // This prevents "Multiple GoTrueClient instances detected" warning
  if (oldClient) {
    try {
      // 1. Stop the auto-refresh timer to prevent background token refresh conflicts
      await oldClient.auth.stopAutoRefresh();
      console.log('[Supabase] Stopped auto-refresh on old client');

      // 2. Remove all realtime channels
      await oldClient.removeAllChannels();
      console.log('[Supabase] Removed all channels from old client');
    } catch (e) {
      // Don't block on cleanup errors
      console.warn('[Supabase] Error during client cleanup:', e);
    }
  }

  supabaseClient = null;
  clientVersion++;
  connectionHealthy = false; // Mark as unhealthy until next successful query
}

/**
 * Perform a lightweight health check to detect stuck connections
 * Uses a simple query with strict timeout
 */
async function performHealthCheck(): Promise<boolean> {
  const client = supabaseClient;
  if (!client) return true; // No client to check

  // Skip if we had a recent successful query
  const timeSinceLastSuccess = Date.now() - lastSuccessfulQuery;
  if (timeSinceLastSuccess < CONNECTION_STALE_THRESHOLD) {
    return true;
  }

  console.log(`[Supabase] Health check - ${timeSinceLastSuccess}ms since last success`);

  try {
    // Use raw fetch to bypass potentially stuck client
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(`${url}/rest/v1/?limit=0`, {
      method: 'HEAD',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      markQuerySuccess();
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

      // Reset the client to force a fresh connection (properly disposes old client)
      await resetSupabaseClient();

      // Trigger a new health check after reset
      setTimeout(async () => {
        const recoveredHealthy = await performHealthCheck();
        if (recoveredHealthy) {
          console.log('[Supabase] Connection recovered after reset');
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

/**
 * Create a fresh Supabase client (bypasses singleton)
 * Use for testing or when you specifically need a new instance
 */
export function createFreshSupabaseClient(): ReturnType<typeof createClient> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  console.log('[Supabase] Creating fresh client instance');

  return createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Don't detect URL on fresh instances to avoid conflicts
      flowType: 'pkce',
      storage: cookieStorage,
      storageKey: SHARED_AUTH_STORAGE_KEY
    }
  });
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();

    // Log configuration in development (helps with debugging)
    // Check if import.meta exists before accessing DEV property
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      const hasNovaEnvVars = !!import.meta.env.VITE_NOVA_SUPABASE_URL;
      const hasGenericEnvVars = !!import.meta.env.VITE_SUPABASE_URL;

      console.log('🔧 Nova Supabase Configuration:', {
        url: url,
        usingNovaEnvVars: hasNovaEnvVars,
        usingGenericEnvVars: hasGenericEnvVars,
        mode: url.includes('localhost') || url.includes('127.0.0.1') ? 'LOCAL' : 'REMOTE',
        clientVersion: clientVersion,
        VITE_NOVA_SUPABASE_URL: import.meta.env.VITE_NOVA_SUPABASE_URL || 'not set',
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'not set'
      });
    }

    supabaseClient = createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        // DISABLED: detectSessionInUrl causes blocking issues when the auth lock gets stuck
        // The session is already restored from cookie storage in ensureSessionInitialized()
        detectSessionInUrl: false,
        flowType: 'pkce',
        storage: cookieStorage,
        storageKey: SHARED_AUTH_STORAGE_KEY
      }
    });
  }
  return supabaseClient;
}

// Default export for convenience
export const supabase = getSupabaseClient();

/**
 * Ensure session is properly initialized from cookie storage
 * This fixes issues where Supabase reads the cookie but doesn't set the auth headers
 *
 * IMPORTANT: We check the cookie FIRST before calling any Supabase auth methods,
 * because getSession() can hang if the internal auth lock is stuck.
 */
const ensureSessionInitialized = async (): Promise<void> => {
  const client = getSupabaseClient();

  // First, check if there's a session in cookie storage
  const storedSession = cookieStorage.getItem(SHARED_AUTH_STORAGE_KEY);

  if (storedSession) {
    try {
      const sessionData = JSON.parse(storedSession);
      console.log('[Supabase] Found stored session data, keys:', Object.keys(sessionData));

      const accessToken = sessionData.access_token;
      const refreshToken = sessionData.refresh_token;

      if (accessToken && refreshToken) {
        console.log('[Supabase] Restoring session from cookie storage');
        try {
          await Promise.race([
            client.auth.setSession({
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
          // Clear the potentially corrupted cookie
          cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);
          await resetSupabaseClient();
        }
      } else {
        console.warn('[Supabase] Cookie exists but missing tokens:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });
        // Clear invalid cookie
        cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('[Supabase] Error parsing session from cookie:', e);
      // Clear corrupted cookie
      cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);
    }
  } else {
    console.log('[Supabase] No stored session cookie found');
  }
};

/**
 * Promise that resolves when session is ready
 * Components can await this before making queries to avoid the stuck client issue
 */
export const sessionReady = ensureSessionInitialized();

/**
 * Debug function to test Supabase connectivity
 * Can be called from browser console: window.testSupabase()
 */
if (typeof window !== 'undefined') {
  // Test raw fetch to see if it's a network issue
  (window as any).testRawFetch = async () => {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    console.log('[Raw Fetch] Testing direct fetch to:', url);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${url}/rest/v1/data_sources?select=id&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      console.log('[Raw Fetch] Success! Status:', response.status, 'Data:', data);
      return { success: true, data };
    } catch (e: any) {
      console.error('[Raw Fetch] Failed:', e.message);
      return { success: false, error: e.message };
    }
  };

  // Reset the client and create a fresh one
  (window as any).resetSupabase = async () => {
    console.log('[Supabase] Manual reset triggered');
    await resetSupabaseClient();
    // Get new client to trigger recreation
    const newClient = getSupabaseClient();
    console.log('[Supabase] New client created. Run window.testSupabase() to verify.');
    return newClient;
  };

  // Test with fresh client (bypasses singleton entirely)
  (window as any).testFreshSupabase = async () => {
    console.log('[Supabase Debug] Testing with FRESH client (bypassing singleton)...');
    const freshClient = createFreshSupabaseClient();

    const selectStart = Date.now();
    try {
      const { data, error } = await Promise.race([
        freshClient.from('data_sources').select('id').limit(1),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SELECT timed out after 5s')), 5000)
        )
      ]);
      console.log('[Supabase Debug] Fresh client SELECT completed in', Date.now() - selectStart, 'ms');
      console.log('[Supabase Debug] Fresh client result:', { data, error });

      if (data) {
        console.log('[Supabase Debug] Fresh client works! The singleton client is stuck.');
        console.log('[Supabase Debug] Run window.resetSupabase() to fix the singleton.');
      }
      return { success: true, data };
    } catch (e) {
      console.error('[Supabase Debug] Fresh client also failed:', e);
      return { success: false, error: e };
    }
  };

  console.log('💡 Debug commands: window.testRawFetch(), window.testSupabase(), window.testFreshSupabase(), window.resetSupabase()');

  (window as any).testSupabase = async () => {
    console.log('[Supabase Debug] Starting connectivity test...');
    const client = getSupabaseClient();

    // Test 1: Simple select
    console.log('[Supabase Debug] Test 1: Simple SELECT...');
    const selectStart = Date.now();
    try {
      const { data, error } = await Promise.race([
        client.from('data_sources').select('id').limit(1),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SELECT timed out after 5s')), 5000)
        )
      ]);
      console.log('[Supabase Debug] SELECT completed in', Date.now() - selectStart, 'ms');
      console.log('[Supabase Debug] SELECT result:', { data, error });
    } catch (e) {
      console.error('[Supabase Debug] SELECT failed:', e);
    }

    // Test 2: Auth state
    console.log('[Supabase Debug] Test 2: Auth state...');
    const authStart = Date.now();
    try {
      const { data: { session }, error } = await Promise.race([
        client.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getSession timed out after 5s')), 5000)
        )
      ]);
      console.log('[Supabase Debug] getSession completed in', Date.now() - authStart, 'ms');
      console.log('[Supabase Debug] Session:', session ? 'exists' : 'null', error ? `Error: ${error.message}` : '');
    } catch (e) {
      console.error('[Supabase Debug] getSession failed:', e);
    }

    // Test 3: Insert (will be rolled back by checking for error)
    console.log('[Supabase Debug] Test 3: INSERT test...');
    const insertStart = Date.now();
    try {
      const testData = {
        name: '__test_' + Date.now(),
        type: 'api',
        category: 'Test',
        active: false
      };
      const { data, error } = await Promise.race([
        client.from('data_sources').insert(testData).select().single(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('INSERT timed out after 10s')), 10000)
        )
      ]);
      console.log('[Supabase Debug] INSERT completed in', Date.now() - insertStart, 'ms');
      console.log('[Supabase Debug] INSERT result:', { data, error });

      // Clean up test record
      if (data && (data as any).id) {
        await client.from('data_sources').delete().eq('id', (data as any).id);
        console.log('[Supabase Debug] Test record cleaned up');
      }
    } catch (e) {
      console.error('[Supabase Debug] INSERT failed:', e);
    }

    console.log('[Supabase Debug] Tests complete');
  };
}
