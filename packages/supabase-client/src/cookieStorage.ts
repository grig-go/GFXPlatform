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

// Track the last cookie value we set to avoid redundant writes
let lastCookieValueHash: string | null = null;

// Flag to prevent cookie restoration during/after signout
let isSigningOut = false;

// Simple hash function for deduplication
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

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
 *
 * KEY INSIGHT FROM RESEARCH: The cookie value must NOT contain characters
 * that could break parsing. We use base64url encoding (no +, /, or =) to be safe.
 */
function setCookie(name: string, value: string, domain?: string): void {
  if (typeof document === 'undefined') return;

  // Skip if we're setting the same value we just set (prevents redundant writes)
  const valueHash = simpleHash(value);
  if (lastCookieValueHash === valueHash) {
    console.log('[Auth SSO] Cookie value unchanged, skipping write');
    return;
  }

  const isSecure = window.location.protocol === 'https:';
  const hostname = window.location.hostname;

  // CRITICAL FIX: First delete ALL versions of this cookie to avoid shadowing
  // IMPORTANT: When deleting a cookie that was set with SameSite=None; Secure,
  // we must include those same attributes or the browser won't delete it!
  // Delete without domain (local cookie)
  if (isSecure) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=None; Secure`;
  } else {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
  // Delete with domain (shared cookie) - must also be deleted before re-setting
  if (domain) {
    if (isSecure) {
      document.cookie = `${name}=; Path=/; Max-Age=0; Domain=${domain}; SameSite=None; Secure`;
    } else {
      document.cookie = `${name}=; Path=/; Max-Age=0; Domain=${domain}; SameSite=Lax`;
    }
  }

  // Use base64url encoding for the value to avoid any special character issues
  // This is safer than just encodeURIComponent for cookie values
  const encodedValue = btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Build cookie with all required attributes
  // Order matters: name=value; Domain=x; Path=y; Secure; SameSite=z
  let cookie = `${name}=${encodedValue}`;

  if (domain) {
    cookie += `; Domain=${domain}`;
  }

  cookie += '; Path=/';
  cookie += '; Max-Age=31536000'; // 1 year

  if (isSecure) {
    cookie += '; SameSite=None; Secure';
  } else {
    cookie += '; SameSite=Lax';
  }

  console.log('[Auth SSO] Setting cookie:', {
    name,
    domain,
    hostname,
    isSecure,
    rawValueLength: value.length,
    encodedValueLength: encodedValue.length,
    cookieStringLength: cookie.length
  });

  document.cookie = cookie;

  // Remember what we set to avoid redundant writes
  lastCookieValueHash = valueHash;

  // Verify it was set (only on first write, not repeatedly)
  const allCookies = document.cookie;
  const wasSet = allCookies.includes(name + '=');
  console.log('[Auth SSO] Cookie set:', { wasSet, name, domain });

  if (!wasSet) {
    console.error('[Auth SSO] Cookie was NOT set! Check browser DevTools > Application > Cookies');
    lastCookieValueHash = null; // Allow retry
  }
}

/**
 * Get a cookie value by name
 * Handles both base64url encoded values (new format) and plain encoded values (legacy)
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const rawCookies = document.cookie;
  const cookies = rawCookies.split(';');

  for (const cookie of cookies) {
    const [cookieName, ...cookieValueParts] = cookie.trim().split('=');
    if (cookieName === name) {
      const rawValue = cookieValueParts.join('=');

      // Try to decode as base64url first (new format)
      try {
        // Restore standard base64 from base64url
        let base64 = rawValue
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        // Add padding if needed
        while (base64.length % 4) {
          base64 += '=';
        }
        const decoded = atob(base64);
        // Verify it's valid JSON (our token format)
        JSON.parse(decoded);
        return decoded;
      } catch {
        // Not base64url, try legacy URI decoding
        try {
          return decodeURIComponent(rawValue);
        } catch {
          // Return raw value as last resort
          return rawValue;
        }
      }
    }
  }

  return null;
}

/**
 * Delete a cookie
 * IMPORTANT: Must use the same attributes (SameSite, Secure) that were used when setting
 */
function deleteCookie(name: string, domain?: string): void {
  if (typeof document === 'undefined') return;

  const isSecure = window.location.protocol === 'https:';
  console.log('[Auth SSO] deleteCookie called:', { name, domain, isSecure });

  // Delete with domain (if provided) - must include SameSite/Secure to match set attributes
  if (domain) {
    if (isSecure) {
      document.cookie = `${name}=; Path=/; Max-Age=0; Domain=${domain}; SameSite=None; Secure`;
    } else {
      document.cookie = `${name}=; Path=/; Max-Age=0; Domain=${domain}; SameSite=Lax`;
    }
  }

  // Also delete without domain in case it was set that way
  if (isSecure) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=None; Secure`;
  } else {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
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

    // Don't restore from cookie if we're in the process of signing out
    // This prevents an infinite loop where signout triggers getItem which restores from cookie
    if (isSigningOut) {
      return null;
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
          console.log('[Auth SSO] Restored session from shared cookie');
          return cookieValue;
        }
      } catch (e) {
        console.error('[Auth SSO] Error parsing cookie:', e);
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
        // Reset signout flag - user is logging in again
        if (isSigningOut) {
          console.log('[Auth SSO] New login detected, resetting signout flag');
          isSigningOut = false;
        }

        const minimalTokens = JSON.stringify({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });

        // Base64 encoding adds ~33% overhead. Cookie limit is ~4KB.
        const base64Size = Math.ceil(minimalTokens.length * 4 / 3);

        // Cookies have a ~4KB limit. If too large, skip cookie
        if (base64Size <= 3800) {
          const cookieDomain = getCookieDomain();
          setCookie(SHARED_COOKIE_NAME, minimalTokens, cookieDomain);
        }
      }
    } catch {
      // Value might not be JSON, just store in localStorage only
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;

    // Always remove from localStorage
    localStorage.removeItem(key);

    // CRITICAL: Do NOT delete the shared cookie here!
    // Supabase calls removeItem during internal session management even during sign-in.
    // Cookie deletion only happens via clearSharedCookie() during actual logout.
  },
};

/**
 * Mark that we're starting the signout process
 * This prevents the storage adapter from restoring from cookie during signout
 */
export function beginSignOut(): void {
  isSigningOut = true;
  lastCookieValueHash = null; // Reset so cookie can be set again after re-login
  console.log('[Auth SSO] Beginning signout...');
}

/**
 * Explicitly clear the shared SSO cookie
 * Call this ONLY during actual logout (SIGNED_OUT event)
 * Do NOT call this during internal session management
 */
export function clearSharedCookie(): void {
  if (typeof window === 'undefined') return;
  console.log('[Auth SSO] Clearing shared cookie');
  deleteCookie(SHARED_COOKIE_NAME, getCookieDomain());
  // Keep isSigningOut true until page reload or new login
}

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
 * Parsed auth tokens from URL or cookie (stored for later use by setSession)
 * Source indicates where the tokens came from for logging purposes
 */
let pendingAuthTokens: { accessToken: string; refreshToken: string; source: 'url' | 'cookie' } | null = null;

/**
 * Get pending auth tokens that were received from URL or cookie
 * Used by client.ts to set the session after receiving tokens
 */
export function getPendingAuthTokens(): { accessToken: string; refreshToken: string; source: 'url' | 'cookie' } | null {
  const tokens = pendingAuthTokens;
  if (tokens) {
    console.log('[Auth] getPendingAuthTokens: returning tokens from', tokens.source, '(accessToken length:', tokens.accessToken.length, ')');
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
      pendingAuthTokens = { accessToken, refreshToken, source: 'url' };

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

  const cookieDomain = getCookieDomain();

  // If we already have a session in localStorage, sync it TO the cookie
  const existingLocal = localStorage.getItem(SHARED_AUTH_STORAGE_KEY);

  if (existingLocal) {
    try {
      const sessionData = JSON.parse(existingLocal);
      if (sessionData.access_token && sessionData.refresh_token) {
        // Ensure the cookie is set for other subdomains
        const minimalTokens = JSON.stringify({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
        setCookie(SHARED_COOKIE_NAME, minimalTokens, cookieDomain);
        return false; // Session existed, no restoration needed
      }
    } catch {
      // Continue to check cookie
    }
  }

  // No localStorage session, check if there's a shared cookie to restore from
  const cookieValue = getCookie(SHARED_COOKIE_NAME);

  if (cookieValue) {
    try {
      const sessionData = JSON.parse(cookieValue);
      if (sessionData.access_token && sessionData.refresh_token) {
        // Store tokens as pending for client.ts to use with setSession()
        pendingAuthTokens = {
          accessToken: sessionData.access_token,
          refreshToken: sessionData.refresh_token,
          source: 'cookie'
        };

        // Also write to localStorage for Supabase's storage adapter
        localStorage.setItem(SHARED_AUTH_STORAGE_KEY, cookieValue);

        console.log('[Auth SSO] Found shared cookie, restoring session...');
        return true;
      }
    } catch (e) {
      console.error('[Auth SSO] Error parsing shared cookie:', e);
    }
  }

  return false;
}

// Auto-run sync on module load (for immediate SSO on page load)
if (typeof window !== 'undefined') {
  console.log('[Auth SSO] v1.0.23 - ' + window.location.hostname);
  syncCookieToLocalStorage();
}
