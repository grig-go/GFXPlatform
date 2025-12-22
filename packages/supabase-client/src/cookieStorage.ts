/**
 * Storage adapter for Supabase Auth
 *
 * Note: Originally used cookies for cross-app session sharing, but Supabase
 * sessions (~4KB) exceed the browser's ~4KB cookie limit. Now uses localStorage.
 *
 * Cross-app SSO in development:
 * Since localStorage is isolated per origin (different ports = different origins),
 * we provide helper functions to share auth tokens between apps via URL parameters.
 */

// Shared storage key - must be identical across all apps
export const SHARED_AUTH_STORAGE_KEY = 'sb-shared-auth-token';

// URL parameter name for token relay
export const AUTH_TOKEN_PARAM = 'auth_token';

/**
 * Storage adapter for Supabase Auth
 * Uses localStorage (no size limits, unlike cookies)
 */
export const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;

    const value = localStorage.getItem(key);
    if (value) {
      return value;
    }

    return null;
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(key, value);
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(key);
  },
};

/**
 * Migrate existing localStorage session (legacy function - now a no-op since we use localStorage)
 */
export const migrateLocalStorageToCookie = (oldKeys: string[]): void => {
  // Check if there's an old key that needs to be renamed to the shared key
  for (const key of oldKeys) {
    if (key === SHARED_AUTH_STORAGE_KEY) continue; // Skip if it's already the shared key

    const value = localStorage.getItem(key);
    if (value && !localStorage.getItem(SHARED_AUTH_STORAGE_KEY)) {
      // Copy to shared key
      localStorage.setItem(SHARED_AUTH_STORAGE_KEY, value);
      console.log(`[Auth] Migrated session from localStorage (${key}) to shared key`);
      break;
    }
  }
};

/**
 * Generate a URL with auth token for cross-app navigation
 * Use this when linking to another app to share authentication
 *
 * Note: Supabase uses JWTs, not session IDs. The access_token (~1.5KB) and
 * refresh_token (~200 bytes) are required - there's no way to use just an ID
 * because Supabase auth is stateless/JWT-based.
 *
 * @param targetUrl - The URL to navigate to (e.g., 'http://localhost:3003')
 * @returns URL with encoded auth token, or original URL if no session
 */
export function getUrlWithAuthToken(targetUrl: string): string {
  if (typeof window === 'undefined') return targetUrl;

  const session = localStorage.getItem(SHARED_AUTH_STORAGE_KEY);
  if (!session) return targetUrl;

  try {
    // Only include the essential tokens (access_token + refresh_token)
    // This is the minimum needed - Supabase JWTs can't be shortened
    const sessionData = JSON.parse(session);
    const minimalSession = {
      a: sessionData.access_token,  // ~1.5KB JWT
      r: sessionData.refresh_token, // ~200 bytes
    };

    // Use URL-safe base64 encoding
    const encoded = btoa(JSON.stringify(minimalSession))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const url = new URL(targetUrl);
    url.searchParams.set(AUTH_TOKEN_PARAM, encoded);
    return url.toString();
  } catch (e) {
    console.error('[Auth] Failed to encode session for URL:', e);
    return targetUrl;
  }
}

/**
 * Check for auth token in URL and restore session if found
 * Call this on app initialization to receive shared auth from another app
 *
 * @returns true if a token was found and restored, false otherwise
 */
export function receiveAuthTokenFromUrl(): boolean {
  if (typeof window === 'undefined') return false;

  const url = new URL(window.location.href);
  const encodedToken = url.searchParams.get(AUTH_TOKEN_PARAM);

  if (!encodedToken) return false;

  try {
    // Restore URL-safe base64 to standard base64
    const standardBase64 = encodedToken
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const sessionData = JSON.parse(atob(standardBase64));

    // Handle both compact format (a/r) and full format (access_token/refresh_token)
    const accessToken = sessionData.a || sessionData.access_token;
    const refreshToken = sessionData.r || sessionData.refresh_token;

    if (accessToken && refreshToken) {
      // Store in the format Supabase expects
      localStorage.setItem(SHARED_AUTH_STORAGE_KEY, JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
      }));
      console.log('[Auth] Received and stored session from URL');

      // Clean up the URL (remove auth_token param)
      url.searchParams.delete(AUTH_TOKEN_PARAM);
      window.history.replaceState({}, '', url.toString());

      return true;
    }
  } catch (e) {
    console.error('[Auth] Failed to decode auth token from URL:', e);
  }

  // Clean up invalid token from URL
  url.searchParams.delete(AUTH_TOKEN_PARAM);
  window.history.replaceState({}, '', url.toString());

  return false;
}

/**
 * Navigate to another app with shared authentication
 *
 * @param targetUrl - Base URL of the target app (e.g., 'http://localhost:3003')
 * @param path - Optional path to append (e.g., '/projects/123')
 */
export function navigateWithAuth(targetUrl: string, path = ''): void {
  if (typeof window === 'undefined') return;

  const fullUrl = path ? `${targetUrl.replace(/\/$/, '')}${path}` : targetUrl;
  const urlWithAuth = getUrlWithAuthToken(fullUrl);
  window.location.href = urlWithAuth;
}
