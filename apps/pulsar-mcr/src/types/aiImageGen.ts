import { supabase } from '../lib/supabase';

// AI Generation Types
export type AIGenerationType = 'virtual-set' | 'backdrop';

// AI Generation Settings Interface
export interface AIGenSettings {
  apiKey: string;
  model: string;
  baseUrl: string;
  promptEnhancement?: string;
  generationType?: AIGenerationType;
  // Image generation specific
  imageModel?: string;
  aspectRatio?: string;
  numberOfImages?: number;
  safetyLevel?: 'block_none' | 'block_some' | 'block_most';
  // Storage settings
  storageEnabled: boolean;
  storageBucket?: string;
  storagePrefix?: string;
}

// Comprehensive AI Settings Interface
export interface AISettings {
  gemini: {
    apiKey: string;
    textModel: string;
    baseUrl: string;
  };
  imagen: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  storage: {
    enabled: boolean;
    bucket: string;
    publicUrl?: string;
  };
  virtualSet: {
    promptEnhancement?: string;
    defaultAspectRatio: string;
    selectedGeminiModel?: string;
    selectedImagenModel?: string;
    boundSetVirtualSetFunction?: string;
    boundSetBackdropFunction?: string;
  };
}

// Default Settings
export const DEFAULT_AI_SETTINGS: AISettings = {
  gemini: {
    apiKey: 'AIzaSyCYROiSPunHlgdDgdqVp3VLBrAA0dx8rbI',
    textModel: 'gemini-2.5-flash-lite',
    baseUrl: 'https://generativelanguage.googleapis.com'
  },
  imagen: {
    apiKey: 'AIzaSyCYROiSPunHlgdDgdqVp3VLBrAA0dx8rbI', // Same key for Google AI
    model: 'imagen-4.0-fast-generate-001',
    baseUrl: 'https://generativelanguage.googleapis.com'
  },
  storage: {
    enabled: true,
    bucket: 'vsimages',
    publicUrl: undefined // Will be set from Supabase URL
  },
  virtualSet: {
    promptEnhancement: 'photorealistic, professional broadcast quality, high resolution',
    defaultAspectRatio: '16:9'
  }
};

// Available Models
export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite'
];

export const IMAGEN_MODELS = [
  'imagen-4.0-generate-001',
  'imagen-4.0-fast-generate-001',
  'imagen-4.0-ultra-generate-001',  
  'imagen-3.0-generate-002'
];

// Aspect Ratios for Image Generation
// Officially supported by Imagen API: 1:1, 3:4, 4:3, 9:16, 16:9
export const ASPECT_RATIOS = {
  'square': '1:1',
  'mobile-portrait': '3:4',
  'mobile-landscape': '4:3',
  'portrait': '9:16',
  'landscape': '16:9'                                               
};

// Supabase Storage Functions
export const saveSettingsToSupabase = async (
  userId: string,
  settings: AISettings
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ai_settings: settings,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to save AI settings to Supabase:', error);
      return { success: false, error: error.message };
    }

    // Also save to localStorage as fallback
    localStorage.setItem('ai_settings_backup', JSON.stringify(settings));
    
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, error: String(error) };
  }
};

export const loadSettingsFromSupabase = async (
  userId: string
): Promise<AISettings> => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('ai_settings')
      .eq('user_id', userId)
      .single();

    if (error || !data?.ai_settings) {
      console.log('No settings found in Supabase, using defaults');
      // Try localStorage backup
      const backup = localStorage.getItem('ai_settings_backup');
      if (backup) {
        return JSON.parse(backup);
      }
      return DEFAULT_AI_SETTINGS;
    }

    return data.ai_settings as AISettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    // Fallback to localStorage
    const backup = localStorage.getItem('ai_settings_backup');
    if (backup) {
      return JSON.parse(backup);
    }
    return DEFAULT_AI_SETTINGS;
  }
};

// Helper function to call Google APIs via fetch-proxy to avoid CORS
export const callGoogleAPIViaProxy = async (
  url: string,
  method: string = 'POST',
  headers: Record<string, string> = {},
  body: any = null
): Promise<any> => {
  // Get Supabase session for authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated. Please sign in.');
  }

  // Call fetch-proxy
  const proxyUrl = `${import.meta.env.VITE_PULSAR_MCR_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-proxy`;
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      method,
      headers,
      body
    })
  });

  if (!response.ok) {
    throw new Error(`Proxy request failed: ${response.status}`);
  }

  const proxyResponse = await response.json();

  if (proxyResponse.status >= 400) {
    throw new Error(`API request failed: ${proxyResponse.status} - ${JSON.stringify(proxyResponse.data)}`);
  }

  return proxyResponse.data;
};

// Helper Functions for Generation
export const generateWithGemini = async (
  prompt: string,
  settings?: Partial<AISettings>
): Promise<any> => {
  const config = { ...DEFAULT_AI_SETTINGS, ...settings };
  const url = `${config.gemini.baseUrl}/v1beta/models/${config.gemini.textModel}:generateContent?key=${config.gemini.apiKey}`;

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 500,
      responseMimeType: "application/json"
    }
  };

  return callGoogleAPIViaProxy(url, 'POST', { 'Content-Type': 'application/json' }, requestBody);
};

export const generateImageWithImagen = async (
  prompt: string,
  settings?: Partial<AISettings>
): Promise<{ imageUrl?: string; base64?: string; error?: string }> => {
  const config = { ...DEFAULT_AI_SETTINGS, ...settings };
  // Use :predict endpoint for Imagen API
  const url = `${config.imagen.baseUrl}/v1beta/models/${config.imagen.model}:predict?key=${config.imagen.apiKey}`;

  // Enhance prompt for virtual set if needed
  const enhancedPrompt = config.virtualSet.promptEnhancement
    ? `${prompt}. ${config.virtualSet.promptEnhancement}`
    : prompt;

  try {
    // Imagen API uses instances/parameters format
    const requestBody = {
      instances: [
        {
          prompt: enhancedPrompt
        }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: config.virtualSet.defaultAspectRatio,
        safetyFilterLevel: "block_some",
        personGeneration: "allow_adult"
      }
    };

    const data = await callGoogleAPIViaProxy(url, 'POST', { 'Content-Type': 'application/json' }, requestBody);

    // Imagen returns predictions array
    if (data.predictions && data.predictions.length > 0) {
      const prediction = data.predictions[0];
      const imageData = prediction.bytesBase64Encoded || prediction.generated_images?.[0]?.bytesBase64Encoded;

      if (!imageData) {
        throw new Error('No image data in API response');
      }

      const base64Image = imageData.startsWith('data:')
        ? imageData.split(',')[1]
        : imageData;

      // Store in Supabase if enabled
      if (config.storage.enabled) {
        const imageUrl = await storeImageInSupabase(base64Image, config.storage.bucket);
        return { imageUrl: imageUrl || undefined, base64: base64Image };
      }

      return { base64: base64Image };
    }

    throw new Error('No predictions returned from API');
  } catch (error) {
    console.error('Image generation error:', error);
    return { error: String(error) };
  }
};

export const storeImageInSupabase = async (
  base64Image: string,
  bucket: string = 'vsimages'
): Promise<string | null> => {
  try {
    // Convert base64 to blob
    const byteCharacters = atob(base64Image);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `generated-${timestamp}.png`;

    // Upload image (bucket must already exist)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload failed:', uploadError);
      // Check if it's a bucket not found error
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
        throw new Error(`Storage bucket '${bucket}' does not exist. Please contact an administrator to create it.`);
      }
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);
    
    return publicUrl;
  } catch (error) {
    console.error('Storage error:', error);
    return null;
  }
};

export const listStoredImages = async (
  bucket: string = 'vsimages',
  limit: number = 10
): Promise<string[]> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', {
        limit,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) {
      console.error('Error listing images:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Get public URLs for each file
    const urls = data.map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(file.name);
      return publicUrl;
    });
    
    return urls;
  } catch (error) {
    console.error('Failed to list images:', error);
    return [];
  }
};

// Migration function from localStorage to Supabase
export const migrateSettingsToSupabase = async (userId: string): Promise<void> => {
  try {
    // Check for old localStorage settings
    const oldSettings = localStorage.getItem('aiImageGenSettings');
    const vsSettings = localStorage.getItem('vsGenSettings');
    
    if (oldSettings || vsSettings) {
      console.log('Migrating settings from localStorage to Supabase...');
      
      // Parse old settings
      const oldConfig = oldSettings ? JSON.parse(oldSettings) : {};
      const vsConfig = vsSettings ? JSON.parse(vsSettings) : {};
      
      // Create new settings format
      const newSettings: AISettings = {
        gemini: {
          apiKey: oldConfig.apiKey || vsConfig.apiKey || DEFAULT_AI_SETTINGS.gemini.apiKey,
          textModel: oldConfig.model || vsConfig.model || DEFAULT_AI_SETTINGS.gemini.textModel,
          baseUrl: oldConfig.baseUrl || vsConfig.baseUrl || DEFAULT_AI_SETTINGS.gemini.baseUrl
        },
        imagen: DEFAULT_AI_SETTINGS.imagen,
        storage: DEFAULT_AI_SETTINGS.storage,
        virtualSet: {
          promptEnhancement: oldConfig.promptEnhancement || vsConfig.promptEnhancement,
          defaultAspectRatio: '16:9'
        }
      };
      
      // Save to Supabase
      await saveSettingsToSupabase(userId, newSettings);
      
      // Clean up old localStorage
      localStorage.removeItem('aiImageGenSettings');
      localStorage.removeItem('vsGenSettings');
      
      console.log('Migration complete');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// Backward compatibility functions
export const loadAIImageGenSettings = async (): Promise<AISettings> => {
  // Try to get user ID from Supabase auth
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.id) {
    // Migrate old settings if they exist
    await migrateSettingsToSupabase(user.id);
    // Load from Supabase
    return loadSettingsFromSupabase(user.id);
  }
  
  // Fallback to localStorage
  const backup = localStorage.getItem('ai_settings_backup');
  if (backup) {
    return JSON.parse(backup);
  }
  
  return DEFAULT_AI_SETTINGS;
};

export const saveAIImageGenSettings = async (settings: AISettings): Promise<void> => {
  // Try to get user ID from Supabase auth
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.id) {
    await saveSettingsToSupabase(user.id, settings);
  } else {
    // Fallback to localStorage
    localStorage.setItem('ai_settings_backup', JSON.stringify(settings));
  }
};

// Export for backward compatibility
export const loadVSGenSettings = loadAIImageGenSettings;
export const DEFAULT_AI_IMAGE_GEN_SETTINGS = DEFAULT_AI_SETTINGS;
export const DEFAULT_VS_GEN_SETTINGS = DEFAULT_AI_SETTINGS;