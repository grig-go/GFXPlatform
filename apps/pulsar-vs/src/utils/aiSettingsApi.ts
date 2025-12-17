import { supabase } from '../lib/supabase';

export interface AIPromptInjector {
  id?: string;
  feature: string;
  is_enabled: boolean;
  model?: string | null;
  provider_id?: string | null;
  prompt_template: string;
  params?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

// Get all AI settings
export const getAllAISettings = async (): Promise<AIPromptInjector[]> => {
  try {
    const { data, error } = await supabase
      .from('ai_prompt_injectors')
      .select('*')
      .order('feature', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return [];
  }
};

// Get single setting by feature
export const getAISettingByFeature = async (feature: string): Promise<AIPromptInjector[]> => {
  try {
    const { data, error } = await supabase
      .from('ai_prompt_injectors')
      .select('*')
      .eq('feature', feature);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching AI setting by feature:', error);
    return [];
  }
};

// Get Pulsar prompt injectors for image generation
export const getPulsarPromptInjectors = async (): Promise<{
  cameraAngle: string;
  pointOfView: string;
  sceneConsiderations: string;
}> => {
  try {
    const settings = await getAllAISettings();
    
    const cameraAngleSetting = settings.find(s => s.feature === 'camera_angle' && s.is_enabled);
    const pointOfViewSetting = settings.find(s => s.feature === 'point_of_view' && s.is_enabled);
    const sceneConsiderationsSetting = settings.find(s => s.feature === 'scene_considerations' && s.is_enabled);
    
    return {
      cameraAngle: cameraAngleSetting?.prompt_template || '',
      pointOfView: pointOfViewSetting?.prompt_template || '',
      sceneConsiderations: sceneConsiderationsSetting?.prompt_template || '',
    };
  } catch (error) {
    console.error('Error fetching Pulsar prompt injectors:', error);
    return {
      cameraAngle: '',
      pointOfView: '',
      sceneConsiderations: '',
    };
  }
};

// Get Airport instructions for AI prompts
export const getAirportInstructions = async (): Promise<string> => {
  try {
    const settings = await getAISettingByFeature('airport_instructions');
    const airportSetting = settings.find(s => s.is_enabled);
    return airportSetting?.prompt_template || '';
  } catch (error) {
    console.error('Error fetching Airport instructions:', error);
    return '';
  }
};

// Save AI settings with upsert
export const saveAISettings = async (settings: Partial<AIPromptInjector>[]): Promise<{ success: boolean; error?: string }> => {
  try {
    let failedCount = 0;
    let successCount = 0;

    for (const setting of settings) {
      try {
        const { error } = await supabase
          .from('ai_prompt_injectors')
          .upsert(
            {
              feature: setting.feature,
              prompt_template: setting.prompt_template,
              is_enabled: setting.is_enabled ?? true,
              params: setting.params || '{}',
              version: setting.version || 1,
              model: setting.model || null,
              provider_id: setting.provider_id || null,
            },
            { 
              onConflict: 'feature',
            }
          );

        if (error) {
          console.error('Error saving AI setting:', error);
          failedCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error('Error saving AI setting:', err);
        failedCount++;
      }
    }

    if (failedCount > 0) {
      throw new Error(`Failed to save ${failedCount} settings`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error batch saving AI settings:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};