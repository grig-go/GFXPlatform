/**
 * Cookie-based storage for Supabase Auth
 *
 * Enables session sharing between apps on:
 * - Same domain with different ports (development)
 * - Subdomains (production, e.g., pulsar.example.com, nova.example.com)
 *
 * Usage: Import and use as the storage option in Supabase client config
 */

// Configuration for cookie domain
// In development (localhost), leave empty to use current domain
// In production, set to parent domain (e.g., '.example.com') to share across subdomains
const getCookieDomain = (): string => {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;

  // localhost or IP - don't set domain (browser will use current host)
  if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return '';
  }

  // For subdomains, return parent domain with leading dot
  // e.g., 'pulsar.example.com' -> '.example.com'
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return '.' + parts.slice(-2).join('.');
  }

  return '';
};

// Shared storage key - must be identical across all apps for SSO
export const SHARED_AUTH_STORAGE_KEY = 'sb-shared-auth-token';

/**
 * Cookie storage adapter for Supabase Auth
 * Implements the same interface as localStorage
 */
export const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [cookieKey, ...cookieValueParts] = cookie.split('=');
      if (cookieKey.trim() === key) {
        const value = cookieValueParts.join('=');
        try {
          return decodeURIComponent(value);
        } catch {
          return value;
        }
      }
    }
    return null;
  },

  setItem: (key: string, value: string): void => {
    if (typeof document === 'undefined') return;

    const domain = getCookieDomain();
    const domainAttr = domain ? `; domain=${domain}` : '';

    // Set cookie with:
    // - 7 day expiry (Supabase handles token refresh)
    // - Secure flag in production (HTTPS)
    // - SameSite=Lax for CSRF protection while allowing cross-subdomain
    // - Path=/ to be accessible from all paths
    const isSecure = window.location.protocol === 'https:';
    const secureAttr = isSecure ? '; Secure' : '';

    const encodedValue = encodeURIComponent(value);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();

    document.cookie = `${key}=${encodedValue}; path=/${domainAttr}; expires=${expires}; SameSite=Lax${secureAttr}`;
  },

  removeItem: (key: string): void => {
    if (typeof document === 'undefined') return;

    const domain = getCookieDomain();
    const domainAttr = domain ? `; domain=${domain}` : '';

    // Remove by setting expired date
    document.cookie = `${key}=; path=/${domainAttr}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  },
};

/**
 * Migrate existing localStorage session to cookie storage
 * Call this once during app initialization to migrate existing sessions
 */
export const migrateLocalStorageToCookie = (oldKeys: string[]): void => {
  if (typeof localStorage === 'undefined') return;

  for (const key of oldKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      // Copy to cookie storage with the shared key
      cookieStorage.setItem(SHARED_AUTH_STORAGE_KEY, value);
      console.log(`[Auth] Migrated session from localStorage (${key}) to cookie storage`);
      break; // Only need to migrate once
    }
  }
};
