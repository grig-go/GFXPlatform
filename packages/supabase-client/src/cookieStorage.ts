/**
 * Storage adapter for Supabase Auth
 *
 * Uses a hybrid approach for cross-subdomain SSO:
 * - Stores a minimal "session pointer" (access_token + refresh_token) in a cookie
 *   with domain=.emergent.new so it's shared across all subdomains
 * - Full session data stays in localStorage for performance
 *
 * This works because:
 * - The cookie (~2KB for tokens) fits within browser limits
 * - All subdomains can read the shared cookie
 * - Supabase can reconstruct the session from just the tokens
 */

// Shared storage key - must be identical across all apps
export const SHARED_AUTH_STORAGE_KEY = 'sb-shared-auth-token';

// Cookie name for cross-subdomain token sharing
const SHARED_COOKIE_NAME = 'sb-shared-tokens';

// URL parameter name for token relay
export const AUTH_TOKEN_PARAM = 'auth_token';

/**
 * Get the cookie domain for cross-subdomain sharing
 * Returns undefined for localhost (cookies work without domain on localhost)
 */
function getCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const hostname = window.location.hostname;
  // For emergent.new subdomains, use parent domain
  if (hostname.endsWith('.emergent.new')) {
    return '.emergent.new';
  }
  // For localhost or other domains, don't set domain
  return undefined;
}

/**
 * Set a cookie with optional domain for cross-subdomain sharing
 */
function setCookie(name: string, value: string, domain?: string): void {
  if (typeof document === 'undefined') return;

  const isSecure = window.location.protocol === 'https:';
  let cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;

  if (isSecure) {
    cookie += '; Secure';
  }

  if (domain) {
    cookie += `; domain=${domain}`;
  }

  document.cookie = cookie;
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, ...cookieValueParts] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValueParts.join('='));
    }
  }
  return null;
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string, domain?: string): void {
  if (typeof document === 'undefined') return;

  let cookie = `${name}=; path=/; max-age=0`;
  if (domain) {
    cookie += `; domain=${domain}`;
  }
  document.cookie = cookie;

  // Also delete without domain in case it was set that way
  document.cookie = `${name}=; path=/; max-age=0`;
}

/**
 * Storage adapter for Supabase Auth
 * Uses localStorage with cross-subdomain cookie sync
 */
export const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;

    // First check localStorage
    const localValue = localStorage.getItem(key);
    if (localValue) {
      return localValue;
    }

    // If not in localStorage, check shared cookie (for cross-subdomain SSO)
    const cookieValue = getCookie(SHARED_COOKIE_NAME);
    if (cookieValue) {
      try {
        // Cookie contains minimal tokens, reconstruct session format
        const tokens = JSON.parse(cookieValue);
        if (tokens.access_token && tokens.refresh_token) {
          // Store in localStorage for faster future access
          const sessionData = JSON.stringify({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });
          localStorage.setItem(key, sessionData);
          console.log('[Auth] Restored session from shared cookie');
          return sessionData;
        }
      } catch (e) {
        console.error('[Auth] Error parsing cookie:', e);
      }
    }

    return null;
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;

    // Always store in localStorage
    localStorage.setItem(key, value);

    // Also sync tokens to shared cookie for cross-subdomain access
    try {
      const sessionData = JSON.parse(value);
      if (sessionData.access_token && sessionData.refresh_token) {
        const minimalTokens = JSON.stringify({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
        setCookie(SHARED_COOKIE_NAME, minimalTokens, getCookieDomain());
      }
    } catch (e) {
      // Value might not be JSON, just store in localStorage only
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(key);
    deleteCookie(SHARED_COOKIE_NAME, getCookieDomain());
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

/**
 * Sync shared cookie to localStorage on app initialization
 * This ensures cross-subdomain SSO works by proactively restoring the session
 * BEFORE Supabase tries to read from storage.
 *
 * Call this function early in your app initialization.
 *
 * @returns true if a session was synced from cookie, false otherwise
 */
export function syncCookieToLocalStorage(): boolean {
  if (typeof window === 'undefined') return false;

  // If we already have a session in localStorage, sync it TO the cookie
  // (in case this is the first login and other subdomains need it)
  const existingLocal = localStorage.getItem(SHARED_AUTH_STORAGE_KEY);
  if (existingLocal) {
    try {
      const sessionData = JSON.parse(existingLocal);
      if (sessionData.access_token && sessionData.refresh_token) {
        // Ensure the cookie is set
        const minimalTokens = JSON.stringify({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
        setCookie(SHARED_COOKIE_NAME, minimalTokens, getCookieDomain());
        console.log('[Auth] Synced existing localStorage session to shared cookie');
        return false; // Session existed, no restoration needed
      }
    } catch (e) {
      // Continue to check cookie
    }
  }

  // No localStorage session, check if there's a shared cookie to restore from
  const cookieValue = getCookie(SHARED_COOKIE_NAME);
  if (cookieValue) {
    try {
      const tokens = JSON.parse(cookieValue);
      if (tokens.access_token && tokens.refresh_token) {
        // Restore to localStorage so Supabase finds it
        const sessionData = JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
        localStorage.setItem(SHARED_AUTH_STORAGE_KEY, sessionData);
        console.log('[Auth] Restored session from shared cookie to localStorage');
        return true;
      }
    } catch (e) {
      console.error('[Auth] Error parsing shared cookie:', e);
    }
  }

  return false;
}

// Auto-run sync on module load (for immediate SSO on page load)
if (typeof window !== 'undefined') {
  syncCookieToLocalStorage();
}
