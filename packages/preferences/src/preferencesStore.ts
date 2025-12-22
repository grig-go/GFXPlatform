import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ThemePreference, PreferenceBackend, CommonPreferences } from './types';

// Store configuration
interface PreferencesStoreConfig {
  backend?: PreferenceBackend;
  userId?: string;
}

let config: PreferencesStoreConfig = {};

/**
 * Configure the preferences store
 */
export function configurePreferencesStore(cfg: PreferencesStoreConfig): void {
  config = cfg;
}

interface PreferencesState extends CommonPreferences {
  // State
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
  setTimezone: (timezone: string) => Promise<void>;
  setPreference: <K extends keyof CommonPreferences>(key: K, value: CommonPreferences[K]) => Promise<void>;
  loadFromBackend: () => Promise<void>;

  // Computed
  resolvedTheme: () => 'light' | 'dark';
}

/**
 * Resolve 'system' theme to actual light/dark
 */
function resolveSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isLoading: false,
      isInitialized: false,

      initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true });

        try {
          await get().loadFromBackend();
        } catch (e) {
          console.warn('Failed to load preferences:', e);
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      loadFromBackend: async () => {
        if (!config.backend) return;

        try {
          const all = await config.backend.getAll();
          const updates: Partial<CommonPreferences> = {};

          if (all.theme && ['light', 'dark', 'system'].includes(all.theme as string)) {
            updates.theme = all.theme as ThemePreference;
          }
          if (all.language && typeof all.language === 'string') {
            updates.language = all.language;
          }
          if (all.timezone && typeof all.timezone === 'string') {
            updates.timezone = all.timezone;
          }

          if (Object.keys(updates).length > 0) {
            set(updates);
          }
        } catch (e) {
          console.warn('Failed to load from backend:', e);
        }
      },

      setTheme: async (theme) => {
        set({ theme });

        // Apply theme to document
        const resolved = theme === 'system' ? resolveSystemTheme() : theme;
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(resolved);
        }

        // Save to backend
        if (config.backend) {
          await config.backend.set('theme', theme);
        }
      },

      setLanguage: async (language) => {
        set({ language });
        if (config.backend) {
          await config.backend.set('language', language);
        }
      },

      setTimezone: async (timezone) => {
        set({ timezone });
        if (config.backend) {
          await config.backend.set('timezone', timezone);
        }
      },

      setPreference: async (key, value) => {
        set({ [key]: value } as Partial<PreferencesState>);
        if (config.backend) {
          await config.backend.set(key, value);
        }
      },

      resolvedTheme: () => {
        const { theme } = get();
        return theme === 'system' ? resolveSystemTheme() : theme;
      },
    }),
    {
      name: 'gfx-preferences',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        timezone: state.timezone,
      }),
    }
  )
);

/**
 * Hook to sync theme with system preference changes
 */
export function setupThemeSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = () => {
    const { theme, resolvedTheme } = usePreferencesStore.getState();
    if (theme === 'system') {
      const resolved = resolvedTheme();
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
    }
  };

  mediaQuery.addEventListener('change', handleChange);

  // Apply initial theme
  const { theme } = usePreferencesStore.getState();
  const resolved = theme === 'system' ? resolveSystemTheme() : theme;
  document.documentElement.classList.add(resolved);

  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}
