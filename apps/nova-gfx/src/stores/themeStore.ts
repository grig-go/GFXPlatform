import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  isLoading: boolean;
  setTheme: (theme: Theme, userId?: string) => Promise<void>;
  loadUserTheme: (userId: string) => Promise<void>;
  /** Returns the resolved theme (light or dark) based on system preference if theme is 'system' */
  resolvedTheme: () => 'light' | 'dark';
}

/** Get the system's preferred color scheme */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // Default to dark if can't detect
}

/** Apply theme class to document root */
export function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Default to dark mode
      isLoading: false,

      setTheme: async (theme: Theme, userId?: string) => {
        // Update local state immediately for responsiveness
        set({ theme });

        // Apply theme to DOM
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(resolved);

        // If user is logged in, save to Supabase
        if (userId && supabase) {
          try {
            // Upsert to pulsar_user_preferences
            const { error } = await supabase
              .from('pulsar_user_preferences')
              .upsert(
                { user_id: userId, theme },
                { onConflict: 'user_id' }
              );

            if (error) {
              console.warn('Failed to save theme preference:', error.message);
            } else {
              console.log('Theme preference saved:', theme);
            }
          } catch (err) {
            console.warn('Error saving theme preference:', err);
          }
        }
      },

      loadUserTheme: async (userId: string) => {
        if (!supabase) return;

        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('pulsar_user_preferences')
            .select('theme')
            .eq('user_id', userId)
            .maybeSingle();

          if (error) {
            console.warn('Failed to load theme preference:', error.message);
            // Apply default dark theme on error
            applyTheme('dark');
          } else if (data?.theme) {
            const theme = data.theme as Theme;
            set({ theme });
            const resolved = theme === 'system' ? getSystemTheme() : theme;
            applyTheme(resolved);
            console.log('Loaded user theme preference:', theme);
          } else {
            // No saved preference - apply default dark theme for new users
            set({ theme: 'dark' });
            applyTheme('dark');
            console.log('No theme preference found, using default: dark');
          }
        } catch (err) {
          console.warn('Error loading theme preference:', err);
          // Apply default dark theme on error
          applyTheme('dark');
        } finally {
          set({ isLoading: false });
        }
      },

      resolvedTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          return getSystemTheme();
        }
        return theme;
      },
    }),
    {
      name: 'nova-theme-preference', // localStorage key as fallback
    }
  )
);

/** Listen for system theme changes */
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}
