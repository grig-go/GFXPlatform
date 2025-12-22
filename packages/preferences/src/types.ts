// Preference types shared across all apps

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Common user preferences shared across apps
 */
export interface CommonPreferences {
  theme: ThemePreference;
  language?: string;
  timezone?: string;
}

/**
 * Nova-GFX specific preferences
 */
export interface NovaGfxPreferences extends CommonPreferences {
  aiEnabled?: boolean;
}

/**
 * Pulsar-GFX specific preferences
 */
export interface PulsarGfxPreferences extends CommonPreferences {
  lastProjectId?: string | null;
  openPlaylistIds?: string[];
  activePlaylistId?: string | null;
  selectedChannelId?: string | null;
  showPlayoutControls?: boolean;
  showPreview?: boolean;
  showContentEditor?: boolean;
}

/**
 * Union of all app preferences
 */
export type AppPreferences = CommonPreferences | NovaGfxPreferences | PulsarGfxPreferences;

/**
 * Backend interface for preference storage
 */
export interface PreferenceBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  getAll(): Promise<Record<string, unknown>>;
}

/**
 * Preference store configuration
 */
export interface PreferencesConfig {
  backend: PreferenceBackend;
  userId?: string;
  debounceMs?: number;
}
