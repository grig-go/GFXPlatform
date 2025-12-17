import { useState, useEffect } from 'react';
import {
  getPreference,
  setPreference,
  migratePreferencesFromLocalStorage,
  subscribeToPreferenceChanges,
} from '../lib/sharedPreferences';

type Theme = 'light' | 'dark';

// Migrate on module load (runs once)
migratePreferencesFromLocalStorage();

export const useTheme = () => {
  // Initialize from shared preferences
  const [theme, setTheme] = useState<Theme>(() => getPreference('theme'));

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);

    // Save to shared preferences (syncs across apps)
    setPreference('theme', theme);
  }, [theme]);

  // Listen for changes from other tabs/apps
  useEffect(() => {
    const unsubscribe = subscribeToPreferenceChanges((prefs) => {
      if (prefs.theme !== theme) {
        setTheme(prefs.theme);
      }
    });

    return unsubscribe;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
};
