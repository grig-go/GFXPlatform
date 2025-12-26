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

// Cookie name for cross-subdomain token sharing (matches localStorage key for consistency)
const SHARED_COOKIE_NAME = 'sb-shared-auth-token';

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
 *
 * IMPORTANT: For cross-subdomain cookies to work:
 * 1. Domain MUST be set to parent domain (e.g., .emergent.new)
 * 2. SameSite=None is required for cross-site cookie access
 * 3. Secure is REQUIRED when using SameSite=None (even on HTTPS)
 * 4. Path=/ ensures cookie is available on all paths
 */
function setCookie(name: string, value: string, domain?: string): void {
  if (typeof document === 'undefined') return;

  // SameSite=None REQUIRES Secure attribute - always include it on HTTPS
  // On HTTP (localhost), we can't use Secure, but SameSite=None won't work anyway
  const isSecure = window.location.protocol === 'https:';
  const hostname = window.location.hostname;

  // Delete any existing cookie WITHOUT domain to avoid shadowing
  // A local cookie (without domain) takes precedence over a shared cookie (with domain)
  // So we must delete any local cookie first
  // NOTE: We do NOT delete the shared domain cookie - we want to preserve it for SSO
  document.cookie = `${name}=; Path=/; Max-Age=0`;

  // Build cookie parts as an array for clarity
  const parts: string[] = [
    `${name}=${encodeURIComponent(value)}`,
  ];

  // Domain MUST come early in the cookie string
  if (domain) {
    parts.push(`Domain=${domain}`);
  }

  parts.push('Path=/');
  parts.push('Max-Age=31536000'); // 1 year

  // For cross-subdomain to work on HTTPS, we need SameSite=None + Secure
  if (isSecure) {
    parts.push('SameSite=None');
    parts.push('Secure');
  } else {
    // On localhost/HTTP, use Lax (None won't work without Secure)
    parts.push('SameSite=Lax');
  }

  const cookie = parts.join('; ');

  console.log('[Auth SSO] Setting cookie:', {
    name,
    domain,
    hostname,
    isSecure,
    valueLength: value.length,
    fullCookieString: cookie
  });

  document.cookie = cookie;

  // Verify it was set
  const allCookies = document.cookie;
  const wasSet = allCookies.includes(name);
  console.log('[Auth SSO] Cookie set result:', { wasSet, allCookies: allCookies.substring(0, 200) });

  if (!wasSet) {
    console.error('[Auth SSO] Cookie was NOT set! This may be due to browser restrictions.');
    console.error('[Auth SSO] Attempted cookie string:', cookie);
  }
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const rawCookies = document.cookie;
  const cookies = rawCookies.split(';');

  console.log('[Auth SSO] getCookie called:', {
    lookingFor: name,
    hostname: window.location.hostname,
    totalCookies: cookies.length,
    rawCookiesPreview: rawCookies.substring(0, 300)
  });

  for (const cookie of cookies) {
    const [cookieName, ...cookieValueParts] = cookie.trim().split('=');
    if (cookieName === name) {
      const value = decodeURIComponent(cookieValueParts.join('='));
      console.log('[Auth SSO] Found cookie:', { name, valueLength: value.length });
      return value;
    }
  }

  console.log('[Auth SSO] Cookie not found:', name);
  return null;
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string, domain?: string): void {
  if (typeof document === 'undefined') return;

  console.log('[Auth SSO] deleteCookie called:', { name, domain });

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
    console.log('[Auth SSO] getItem called', { key, hasLocalValue: !!localValue, localValueLength: localValue?.length });
    if (localValue) {
      return localValue;
    }

    // If not in localStorage, check shared cookie (for cross-subdomain SSO)
    const cookieValue = getCookie(SHARED_COOKIE_NAME);
    if (cookieValue) {
      try {
        // Cookie contains full session, store and return it as-is
        const sessionData = JSON.parse(cookieValue);
        if (sessionData.access_token && sessionData.refresh_token) {
          // Store in localStorage for faster future access
          localStorage.setItem(key, cookieValue);
          console.log('[Auth] Restored session from shared cookie');
          return cookieValue;
        }
      } catch (e) {
        console.error('[Auth] Error parsing cookie:', e);
      }
    }

    return null;
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;

    console.log('[Auth SSO] setItem called', { key, valueLength: value?.length });

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
        const encodedSize = encodeURIComponent(minimalTokens).length;
        console.log('[Auth SSO] Cookie data sizes', {
          rawSize: minimalTokens.length,
          encodedSize,
          accessTokenLen: sessionData.access_token.length,
          refreshTokenLen: sessionData.refresh_token.length
        });

        // Cookies have a ~4KB limit. If too large, skip cookie (will use URL token relay instead)
        if (encodedSize > 4000) {
          console.warn('[Auth SSO] Cookie too large, skipping cookie storage. Use URL token relay for SSO.');
        } else {
          const cookieDomain = getCookieDomain();
          setCookie(SHARED_COOKIE_NAME, minimalTokens, cookieDomain);
          console.log('[Auth SSO] Cookie set on login', { cookieDomain, cookieName: SHARED_COOKIE_NAME, encodedSize });
        }
      }
    } catch (e) {
      // Value might not be JSON, just store in localStorage only
      console.log('[Auth SSO] setItem value is not JSON, skipping cookie sync');
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;

    console.log('[Auth SSO] removeItem called - DELETING cookie and localStorage', { key });
    console.trace('[Auth SSO] removeItem stack trace');

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
 * Parsed auth tokens from URL (stored for later use by setSession)
 */
let pendingAuthTokens: { accessToken: string; refreshToken: string } | null = null;

/**
 * Get pending auth tokens that were received from URL
 * Used by client.ts to set the session after receiving tokens
 */
export function getPendingAuthTokens(): { accessToken: string; refreshToken: string } | null {
  const tokens = pendingAuthTokens;
  if (tokens) {
    console.log('[Auth] getPendingAuthTokens: returning tokens (accessToken length:', tokens.accessToken.length, ')');
  } else {
    console.log('[Auth] getPendingAuthTokens: no pending tokens');
  }
  pendingAuthTokens = null; // Clear after reading
  return tokens;
}

/**
 * Check for auth token in URL and restore session if found
 * Call this on app initialization to receive shared auth from another app
 *
 * IMPORTANT: This function stores the tokens for later use. The actual
 * supabase.auth.setSession() call must be made by client.ts after this
 * returns true, since we can't import supabase here (circular dependency).
 *
 * @returns true if a token was found and stored, false otherwise
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

      // Also store for immediate use by client.ts
      pendingAuthTokens = { accessToken, refreshToken };

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

  const hostname = window.location.hostname;
  const cookieDomain = getCookieDomain();
  console.log('[Auth SSO] syncCookieToLocalStorage called', { hostname, cookieDomain });

  // If we already have a session in localStorage, sync it TO the cookie
  // (in case this is the first login and other subdomains need it)
  const existingLocal = localStorage.getItem(SHARED_AUTH_STORAGE_KEY);
  console.log('[Auth SSO] localStorage check:', { hasLocal: !!existingLocal, key: SHARED_AUTH_STORAGE_KEY });

  if (existingLocal) {
    try {
      const sessionData = JSON.parse(existingLocal);
      if (sessionData.access_token && sessionData.refresh_token) {
        // Ensure the cookie is set
        const minimalTokens = JSON.stringify({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
        setCookie(SHARED_COOKIE_NAME, minimalTokens, cookieDomain);
        console.log('[Auth SSO] Synced existing localStorage session to shared cookie', { cookieDomain });
        return false; // Session existed, no restoration needed
      }
    } catch (e) {
      console.error('[Auth SSO] Error parsing localStorage:', e);
      // Continue to check cookie
    }
  }

  // No localStorage session, check if there's a shared cookie to restore from
  const cookieValue = getCookie(SHARED_COOKIE_NAME);
  console.log('[Auth SSO] Cookie check:', { hasCookie: !!cookieValue, cookieName: SHARED_COOKIE_NAME });

  if (cookieValue) {
    try {
      const sessionData = JSON.parse(cookieValue);
      if (sessionData.access_token && sessionData.refresh_token) {
        // Restore full session to localStorage so Supabase finds it
        // The cookie may contain the full session object, so store it as-is
        localStorage.setItem(SHARED_AUTH_STORAGE_KEY, cookieValue);
        console.log('[Auth SSO] Restored session from shared cookie to localStorage', {
          hasUser: !!sessionData.user,
          hasAccessToken: !!sessionData.access_token
        });
        return true;
      }
    } catch (e) {
      console.error('[Auth SSO] Error parsing shared cookie:', e);
    }
  } else {
    console.log('[Auth SSO] No shared cookie found, user not logged in on any subdomain');
  }

  return false;
}

// Auto-run sync on module load (for immediate SSO on page load)
if (typeof window !== 'undefined') {
  console.log('[Auth SSO] Module loaded - version 1.0.13');
  console.log('[Auth SSO] Current hostname:', window.location.hostname);
  console.log('[Auth SSO] Cookie domain will be:', getCookieDomain());
  syncCookieToLocalStorage();
}
