const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export type AIFeature = 'outliers' | 'summary' | 'correlation' | 'sentiment' | 'fullscreen';

export interface AIPromptSettings {
  feature: AIFeature;
  is_enabled: boolean;
  model: string | null;
  prompt_template: string | null;
  params: Record<string, any>;
  version: number;
}

const REST_API_URL = `${supabaseUrl}/rest/v1`;
const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

/**
 * Read all AI prompt settings from the database via Supabase REST API (anon key)
 */
export async function getAllAISettings(): Promise<AIPromptSettings[]> {
  try {
    const response = await fetch(
      `${REST_API_URL}/ai_prompt_injectors?select=feature,model,prompt_template,params,is_enabled,version&order=feature.asc`,
      {
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch AI settings: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    throw error;
  }
}

/**
 * Read a single AI prompt setting by feature name via Supabase REST API (anon key)
 */
export async function getAISettingByFeature(feature: AIFeature): Promise<AIPromptSettings | null> {
  try {
    const response = await fetch(
      `${REST_API_URL}/ai_prompt_injectors?feature=eq.${feature}&select=feature,model,prompt_template,params,is_enabled,version`,
      {
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch AI setting for ${feature}: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error(`Error fetching AI setting for ${feature}:`, error);
    throw error;
  }
}

/**
 * Save/update AI prompt setting via Edge Function (uses service role on server)
 */
export async function saveAISetting(settings: Partial<AIPromptSettings> & { feature: AIFeature }): Promise<{ ok: boolean; data: any }> {
  try {
    const response = await fetch(
      `${FUNCTIONS_URL}/map_data/ai-settings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          feature: settings.feature,
          is_enabled: settings.is_enabled ?? true,
          model: settings.model ?? null,
          prompt_template: settings.prompt_template ?? null,
          params: settings.params ?? {},
          version: settings.version ?? 1
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to save AI setting: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error saving AI setting:', error);
    throw error;
  }
}

/**
 * Save multiple AI settings at once
 */
export async function saveMultipleAISettings(settingsArray: Array<Partial<AIPromptSettings> & { feature: AIFeature }>): Promise<void> {
  try {
    await Promise.all(
      settingsArray.map(settings => saveAISetting(settings))
    );
  } catch (error) {
    console.error('Error saving multiple AI settings:', error);
    throw error;
  }
}