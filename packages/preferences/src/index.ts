// Main exports for @gfx/preferences package

// Types
export type {
  ThemePreference,
  CommonPreferences,
  NovaGfxPreferences,
  PulsarGfxPreferences,
  AppPreferences,
  PreferenceBackend,
  PreferencesConfig,
} from './types';

// Store
export {
  usePreferencesStore,
  configurePreferencesStore,
  setupThemeSync,
} from './preferencesStore';

// Backends
export { createLocalStorageBackend } from './backends/localStorage';
export { createCookieBackend } from './backends/cookies';
export { createSupabaseBackend } from './backends/supabase';
