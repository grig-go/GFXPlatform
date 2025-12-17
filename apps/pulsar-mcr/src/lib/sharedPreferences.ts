/**
 * Shared Preferences Storage
 *
 * Cookie-based storage for user preferences that sync across apps.
 * Uses the same domain strategy as auth cookies for cross-app sharing.
 *
 * Preferences stored:
 * - theme: 'light' | 'dark'
 * - (add more as needed)
 */

// Get cookie domain for cross-app sharing
const getCookieDomain = (): string => {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return '';
  }

  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return '.' + parts.slice(-2).join('.');
  }

  return '';
};

// Cookie name for shared preferences
const PREFERENCES_COOKIE_KEY = 'app-shared-preferences';

// Type for all shared preferences
export interface SharedPreferences {
  theme: 'light' | 'dark';
  // Add more preferences here as needed
  // e.g., language: string;
  // e.g., sidebarCollapsed: boolean;
}

// Default preferences
const DEFAULT_PREFERENCES: SharedPreferences = {
  theme: 'light',
};

/**
 * Get all shared preferences
 */
export const getPreferences = (): SharedPreferences => {
  if (typeof document === 'undefined') return DEFAULT_PREFERENCES;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieKey, ...cookieValueParts] = cookie.split('=');
    if (cookieKey.trim() === PREFERENCES_COOKIE_KEY) {
      const value = cookieValueParts.join('=');
      try {
        const decoded = decodeURIComponent(value);
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(decoded) };
      } catch {
        return DEFAULT_PREFERENCES;
      }
    }
  }
  return DEFAULT_PREFERENCES;
};

/**
 * Save all shared preferences
 */
export const savePreferences = (prefs: SharedPreferences): void => {
  if (typeof document === 'undefined') return;

  const domain = getCookieDomain();
  const domainAttr = domain ? `; domain=${domain}` : '';
  const isSecure = window.location.protocol === 'https:';
  const secureAttr = isSecure ? '; Secure' : '';

  // Long expiry for preferences (1 year)
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  const encodedValue = encodeURIComponent(JSON.stringify(prefs));

  document.cookie = `${PREFERENCES_COOKIE_KEY}=${encodedValue}; path=/${domainAttr}; expires=${expires}; SameSite=Lax${secureAttr}`;
};

/**
 * Get a single preference value
 */
export const getPreference = <K extends keyof SharedPreferences>(key: K): SharedPreferences[K] => {
  return getPreferences()[key];
};

/**
 * Set a single preference value
 */
export const setPreference = <K extends keyof SharedPreferences>(key: K, value: SharedPreferences[K]): void => {
  const prefs = getPreferences();
  prefs[key] = value;
  savePreferences(prefs);
};

/**
 * Migrate localStorage preferences to cookie storage
 * Call once during app initialization
 */
export const migratePreferencesFromLocalStorage = (): void => {
  // Check if we already have cookie preferences
  const existingPrefs = getPreferences();
  const hasExistingCookiePrefs = document.cookie.includes(PREFERENCES_COOKIE_KEY);

  if (hasExistingCookiePrefs) {
    // Already migrated, just apply theme
    return;
  }

  // Migrate theme from localStorage if it exists
  const localTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
  if (localTheme && (localTheme === 'light' || localTheme === 'dark')) {
    existingPrefs.theme = localTheme;
    savePreferences(existingPrefs);
    console.log(`[Preferences] Migrated theme '${localTheme}' from localStorage to shared cookies`);
  }
};

/**
 * Subscribe to preference changes from other tabs/windows
 * Returns unsubscribe function
 */
export const subscribeToPreferenceChanges = (callback: (prefs: SharedPreferences) => void): (() => void) => {
  // Poll for changes (cookies don't have a native change event)
  let lastValue = JSON.stringify(getPreferences());

  const interval = setInterval(() => {
    const currentValue = JSON.stringify(getPreferences());
    if (currentValue !== lastValue) {
      lastValue = currentValue;
      callback(getPreferences());
    }
  }, 1000); // Check every second

  return () => clearInterval(interval);
};
