// AI Provider Settings Management

const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export type AIProvider = 'openai' | 'gemini';

export interface AIProviderSettings {
  provider: AIProvider;
  model: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
}

const STORAGE_KEY = 'fusion-ai-provider-settings';
const API_URL = `${supabaseUrl}/functions/v1/map_data`;

// Available models for each provider
export const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

export const GEMINI_MODELS = [
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
];

/**
 * Get the default AI provider settings
 */
export function getDefaultSettings(): AIProviderSettings {
  return {
    provider: 'openai',
    model: 'gpt-4o-mini',
  };
}

/**
 * Load AI provider settings from backend (with localStorage fallback)
 */
export async function loadAIProviderSettings(): Promise<AIProviderSettings> {
  try {
    // Try to load from backend first
    const response = await fetch(`${API_URL}/ai/provider-settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      // Remove backend metadata fields (updatedAt)
      const { updatedAt, ...settings } = data;
      console.log('[aiProviderSettings] ✅ Settings loaded from backend');
      return settings as AIProviderSettings;
    } else if (response.status === 404) {
      // No backend settings, check localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        console.log('[aiProviderSettings] Settings loaded from localStorage, migrating to backend...');
        // Migrate to backend
        await saveAIProviderSettings(settings);
        return settings;
      }
    }
  } catch (error) {
    console.error('[aiProviderSettings] Error loading settings from backend:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  }
  
  return getDefaultSettings();
}

/**
 * Load AI provider settings synchronously from localStorage only
 * Use this for initial render, then call loadAIProviderSettings() async
 */
export function loadAIProviderSettingsSync(): AIProviderSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[aiProviderSettings] Error loading settings:', error);
  }
  return getDefaultSettings();
}

/**
 * Save AI provider settings to backend (and localStorage as backup)
 */
export async function saveAIProviderSettings(settings: AIProviderSettings): Promise<void> {
  try {
    // Save to localStorage as backup
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    
    // Save to backend
    const response = await fetch(`${API_URL}/ai/provider-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save settings');
    }
    
    console.log('[aiProviderSettings] ✅ Settings saved to backend and localStorage');
  } catch (error) {
    console.error('[aiProviderSettings] Error saving settings:', error);
    throw error;
  }
}

/**
 * Get the current API key for the active provider
 */
export function getCurrentAPIKey(settings: AIProviderSettings): string | undefined {
  if (settings.provider === 'openai') {
    return settings.openaiApiKey;
  } else if (settings.provider === 'gemini') {
    return settings.geminiApiKey;
  }
  return undefined;
}

/**
 * Get available models for a provider
 */
export function getModelsForProvider(provider: AIProvider) {
  return provider === 'openai' ? OPENAI_MODELS : GEMINI_MODELS;
}