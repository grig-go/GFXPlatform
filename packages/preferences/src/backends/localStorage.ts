import type { PreferenceBackend } from '../types';

/**
 * localStorage backend for preferences
 * Stores preferences in browser localStorage
 */
export function createLocalStorageBackend(prefix: string = 'gfx-prefs'): PreferenceBackend {
  const getKey = (key: string) => `${prefix}:${key}`;

  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const value = localStorage.getItem(getKey(key));
        if (value === null) return null;
        return JSON.parse(value) as T;
      } catch (e) {
        console.warn(`Failed to get preference ${key}:`, e);
        return null;
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      try {
        localStorage.setItem(getKey(key), JSON.stringify(value));
      } catch (e) {
        console.warn(`Failed to set preference ${key}:`, e);
      }
    },

    async remove(key: string): Promise<void> {
      try {
        localStorage.removeItem(getKey(key));
      } catch (e) {
        console.warn(`Failed to remove preference ${key}:`, e);
      }
    },

    async getAll(): Promise<Record<string, unknown>> {
      const result: Record<string, unknown> = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const fullKey = localStorage.key(i);
          if (fullKey?.startsWith(`${prefix}:`)) {
            const key = fullKey.substring(prefix.length + 1);
            const value = localStorage.getItem(fullKey);
            if (value !== null) {
              try {
                result[key] = JSON.parse(value);
              } catch {
                result[key] = value;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to get all preferences:', e);
      }
      return result;
    },
  };
}
