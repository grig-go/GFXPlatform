import type { PreferenceBackend } from '../types';

/**
 * Cookie backend for cross-domain preference sharing
 * Useful for syncing preferences across apps on different subdomains
 */
export function createCookieBackend(options: {
  prefix?: string;
  domain?: string;
  maxAgeDays?: number;
} = {}): PreferenceBackend {
  const { prefix = 'gfx-prefs', domain, maxAgeDays = 365 } = options;

  const getKey = (key: string) => `${prefix}_${key}`;

  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const part = parts.pop();
      if (part) {
        return part.split(';').shift() || null;
      }
    }
    return null;
  };

  const setCookie = (name: string, value: string): void => {
    const maxAge = maxAgeDays * 24 * 60 * 60;
    let cookieString = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
    if (domain) {
      cookieString += `; domain=${domain}`;
    }
    document.cookie = cookieString;
  };

  const deleteCookie = (name: string): void => {
    let cookieString = `${name}=; max-age=0; path=/`;
    if (domain) {
      cookieString += `; domain=${domain}`;
    }
    document.cookie = cookieString;
  };

  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const value = getCookie(getKey(key));
        if (value === null) return null;
        return JSON.parse(decodeURIComponent(value)) as T;
      } catch (e) {
        console.warn(`Failed to get cookie preference ${key}:`, e);
        return null;
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      try {
        setCookie(getKey(key), JSON.stringify(value));
      } catch (e) {
        console.warn(`Failed to set cookie preference ${key}:`, e);
      }
    },

    async remove(key: string): Promise<void> {
      try {
        deleteCookie(getKey(key));
      } catch (e) {
        console.warn(`Failed to remove cookie preference ${key}:`, e);
      }
    },

    async getAll(): Promise<Record<string, unknown>> {
      const result: Record<string, unknown> = {};
      try {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name?.startsWith(`${prefix}_`)) {
            const key = name.substring(prefix.length + 1);
            if (value) {
              try {
                result[key] = JSON.parse(decodeURIComponent(value));
              } catch {
                result[key] = decodeURIComponent(value);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to get all cookie preferences:', e);
      }
      return result;
    },
  };
}
