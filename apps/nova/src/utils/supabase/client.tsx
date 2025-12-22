/**
 * Supabase client for Nova
 * Re-exports from the shared @emergent-platform/supabase-client package
 */

import {
  supabase as _supabase,
  sessionReady as _sessionReady,
  withTimeout as _withTimeout,
  withAutoRecovery as _withAutoRecovery,
  startConnectionMonitor as _startConnectionMonitor,
  stopConnectionMonitor as _stopConnectionMonitor,
  isConnectionHealthy as _isConnectionHealthy,
  reconnectSupabase,
  markSupabaseSuccess,
  createFreshClient,
  getSupabaseUrl,
  getSupabaseAnonKey,
} from '@emergent-platform/supabase-client';

// Re-export core functionality
export const supabase = _supabase;
export const sessionReady = _sessionReady;
export const withTimeout = _withTimeout;
export const withAutoRecovery = _withAutoRecovery;
export const startConnectionMonitor = _startConnectionMonitor;
export const stopConnectionMonitor = _stopConnectionMonitor;
export const isConnectionHealthy = _isConnectionHealthy;

// Backward-compatible aliases for Nova
export const getSupabaseClient = () => _supabase;
export const resetSupabaseClient = reconnectSupabase;
export const markQuerySuccess = markSupabaseSuccess;
export const createFreshSupabaseClient = createFreshClient;

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
    await reconnectSupabase();
    console.log('[Supabase] Client reset. Run window.testSupabase() to verify.');
    return _supabase;
  };

  // Test with fresh client (bypasses singleton entirely)
  (window as any).testFreshSupabase = async () => {
    console.log('[Supabase Debug] Testing with FRESH client (bypassing singleton)...');
    const freshClient = createFreshClient();
    if (!freshClient) {
      console.error('[Supabase Debug] Failed to create fresh client');
      return { success: false, error: 'Failed to create fresh client' };
    }

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
        console.log('[Supabase Debug] Fresh client works! The singleton client may be stuck.');
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

    // Test 1: Simple select
    console.log('[Supabase Debug] Test 1: Simple SELECT...');
    const selectStart = Date.now();
    try {
      const { data, error } = await Promise.race([
        _supabase.from('data_sources').select('id').limit(1),
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
        _supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getSession timed out after 5s')), 5000)
        )
      ]);
      console.log('[Supabase Debug] getSession completed in', Date.now() - authStart, 'ms');
      console.log('[Supabase Debug] Session:', session ? 'exists' : 'null', error ? `Error: ${error.message}` : '');
    } catch (e) {
      console.error('[Supabase Debug] getSession failed:', e);
    }

    console.log('[Supabase Debug] Tests complete');
  };
}
