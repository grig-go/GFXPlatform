import { supabase } from '../lib/supabase';
import { supabaseUrl } from '../src/supabaseConfig';

// AI Generation Types
export type AIGenerationType = 'virtual-set' | 'backdrop';

// Dashboard assignment types for Pulsar VS
export type PulsarVSDashboard = 'pulsar-vs-text' | 'pulsar-vs-image-gen' | 'pulsar-vs-image-edit';

// AI Provider model from backend
export interface AIProviderModel {
  id: string;
  name: string;
  description?: string;
}

// AI Provider from backend
export interface AIProvider {
  id: string;
  name: string;
  providerName: string;
  type: string;
  description: string;
  apiKeyConfigured: boolean;
  endpoint: string;
  model: string;
  availableModels: AIProviderModel[];
  enabled: boolean;
  dashboardAssignments: string[];
}

// User-facing settings (no API keys - those are managed in admin panel)
export interface AISettings {
  storage: {
    enabled: boolean;
    bucket: string;
    publicUrl?: string;
  };
  virtualSet: {
    promptEnhancement?: string;
    defaultAspectRatio: string;
    boundSetVirtualSetFunction?: string;
    boundSetBackdropFunction?: string;
  };
  screenShare?: {
    type: 'screen' | 'window';
    screenToCapture: number;
    captureTarget: string;
  };
}

// Default Settings (no API keys - those come from backend ai_providers table)
export const DEFAULT_AI_SETTINGS: AISettings = {
  storage: {
    enabled: true,
    bucket: 'vsimages',
    publicUrl: undefined
  },
  virtualSet: {
    promptEnhancement: 'photorealistic, professional broadcast quality, high resolution',
    defaultAspectRatio: '16:9'
  },
  screenShare: {
    type: 'screen',
    screenToCapture: 0,
    captureTarget: 'chrome'
  }
};

// Aspect Ratios for Image Generation (static UI options)
export const ASPECT_RATIOS: Record<string, string> = {
  'square': '1:1',
  'mobile-portrait': '3:4',
  'mobile-landscape': '4:3',
  'portrait': '9:16',
  'landscape': '16:9'
};

// ============================================
// FETCH PROVIDERS BY DASHBOARD FROM BACKEND
// ============================================

// Cache for providers to avoid repeated fetches
let cachedProviders: {
  text?: AIProvider;
  imageGen?: AIProvider;
  imageEdit?: AIProvider;
  timestamp: number;
} | null = null;
const PROVIDER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fetch provider by dashboard assignment
export const fetchProviderByDashboard = async (dashboard: PulsarVSDashboard): Promise<AIProvider | null> => {
  try {
    const { supabaseAnonKey } = await import('../src/supabaseConfig');

    // Try to get user's session token for organization-based filtering
    let authToken = supabaseAnonKey;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authToken = session.access_token;
      }
    } catch (e) {
      // Fall back to anon key if session fetch fails
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/ai_provider/providers/by-dashboard/${dashboard}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch provider for dashboard ${dashboard}:`, response.status);
      return null;
    }

    const data = await response.json();
    if (!data.ok || !data.providers || data.providers.length === 0) {
      console.warn(`No provider found for dashboard ${dashboard}`);
      return null;
    }

    // Return the first enabled provider for this dashboard
    return data.providers[0] as AIProvider;
  } catch (error) {
    console.warn(`Failed to fetch provider for dashboard ${dashboard}:`, error);
    return null;
  }
};

// Fetch all Pulsar VS providers in parallel
export const fetchPulsarVSProviders = async (forceRefresh = false): Promise<{
  text: AIProvider | null;
  imageGen: AIProvider | null;
  imageEdit: AIProvider | null;
}> => {
  // Return cached if valid
  if (!forceRefresh && cachedProviders && (Date.now() - cachedProviders.timestamp) < PROVIDER_CACHE_TTL) {
    return {
      text: cachedProviders.text || null,
      imageGen: cachedProviders.imageGen || null,
      imageEdit: cachedProviders.imageEdit || null
    };
  }

  console.log('🔄 Fetching Pulsar VS providers from backend...');

  // Fetch all 3 dashboards in parallel
  const [textProvider, imageGenProvider, imageEditProvider] = await Promise.all([
    fetchProviderByDashboard('pulsar-vs-text'),
    fetchProviderByDashboard('pulsar-vs-image-gen'),
    fetchProviderByDashboard('pulsar-vs-image-edit')
  ]);

  // Cache the results
  cachedProviders = {
    text: textProvider || undefined,
    imageGen: imageGenProvider || undefined,
    imageEdit: imageEditProvider || undefined,
    timestamp: Date.now()
  };

  console.log('✅ Pulsar VS providers cached:', {
    text: textProvider?.id,
    imageGen: imageGenProvider?.id,
    imageEdit: imageEditProvider?.id
  });

  return {
    text: textProvider,
    imageGen: imageGenProvider,
    imageEdit: imageEditProvider
  };
};

// Invalidate provider cache
export const invalidateProviderCache = () => {
  cachedProviders = null;
  console.log('🔄 Provider cache invalidated');
};

// Get available models for a dashboard from backend provider
export const getAvailableModels = async (dashboard: PulsarVSDashboard): Promise<AIProviderModel[]> => {
  const providers = await fetchPulsarVSProviders();

  switch (dashboard) {
    case 'pulsar-vs-text':
      return providers.text?.availableModels || [];
    case 'pulsar-vs-image-gen':
      return providers.imageGen?.availableModels || [];
    case 'pulsar-vs-image-edit':
      return providers.imageEdit?.availableModels || [];
    default:
      return [];
  }
};

// Get current model for a dashboard from backend provider
export const getCurrentModel = async (dashboard: PulsarVSDashboard): Promise<string | null> => {
  const providers = await fetchPulsarVSProviders();

  switch (dashboard) {
    case 'pulsar-vs-text':
      return providers.text?.model || null;
    case 'pulsar-vs-image-gen':
      return providers.imageGen?.model || null;
    case 'pulsar-vs-image-edit':
      return providers.imageEdit?.model || null;
    default:
      return null;
  }
};

// ============================================
// BACKEND API CALL FUNCTIONS
// All AI operations go through the backend edge functions
// ============================================

/**
 * Call the backend ai_provider/chat endpoint for text generation
 * This uses the API key stored in the ai_providers table
 */
export const generateTextViaBackend = async (
  providerId: string,
  message: string,
  context?: string,
  dashboard?: string
): Promise<{ response: string; model: string }> => {
  const { supabaseAnonKey } = await import('../src/supabaseConfig');

  const response = await fetch(`${supabaseUrl}/functions/v1/ai_provider/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      providerId,
      message,
      context,
      dashboard
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || errorData.error || `Backend chat request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.detail || data.error || 'Backend chat request failed');
  }

  return {
    response: data.response,
    model: data.model
  };
};

/**
 * Call the backend ai_provider for image generation (Imagen)
 * This uses the API key stored in the ai_providers table
 */
export const generateImageViaBackend = async (
  providerId: string,
  prompt: string,
  options?: {
    aspectRatio?: string;
    numberOfImages?: number;
    safetyLevel?: string;
  }
): Promise<{ base64?: string; error?: string }> => {
  const { supabaseAnonKey } = await import('../src/supabaseConfig');

  const response = await fetch(`${supabaseUrl}/functions/v1/ai_provider/generate-imagen`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      providerId,
      prompt,
      ...options
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    return { error: errorData.detail || errorData.error || `Image generation failed: ${response.status}` };
  }

  const data = await response.json();
  if (!data.ok) {
    return { error: data.detail || data.error || 'Image generation failed' };
  }

  return { base64: data.base64 };
};

/**
 * Call the backend ai_provider for image editing (Gemini)
 * This uses the API key stored in the ai_providers table
 */
export const editImageViaBackend = async (
  providerId: string,
  sourceImage: string,
  prompt: string
): Promise<{ base64?: string; error?: string }> => {
  const { supabaseAnonKey } = await import('../src/supabaseConfig');

  const response = await fetch(`${supabaseUrl}/functions/v1/ai_provider/edit-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      providerId,
      sourceImage,
      prompt
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    return { error: errorData.detail || errorData.error || `Image editing failed: ${response.status}` };
  }

  const data = await response.json();
  if (!data.ok) {
    return { error: data.detail || data.error || 'Image editing failed' };
  }

  return { base64: data.base64 };
};

// ============================================
// LOCAL SETTINGS STORAGE (for non-AI settings like aspect ratio, RCP functions)
// ============================================

export const saveSettingsToSupabase = async (
  userId: string,
  settings: AISettings
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Always save to localStorage as backup
    localStorage.setItem('ai_settings_backup', JSON.stringify(settings));

    // Try to save to Supabase if we have a userId
    if (userId) {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          ai_settings: settings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.warn('Failed to save settings to Supabase (using local backup):', error);
      }
    }

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
    // Try to load from Supabase if we have a userId
    if (userId) {
      const { data, error } = await supabase
        .from('user_settings')
        .select('ai_settings')
        .eq('user_id', userId)
        .single();

      if (data?.ai_settings) {
        return data.ai_settings as AISettings;
      }
      if (error) {
        console.warn('Supabase settings load error (using local backup):', error);
      }
    }

    // Fallback to local storage
    const backup = localStorage.getItem('ai_settings_backup');
    if (backup) {
      return JSON.parse(backup);
    }
    return DEFAULT_AI_SETTINGS;

  } catch (error) {
    console.error('Error loading settings:', error);
    const backup = localStorage.getItem('ai_settings_backup');
    if (backup) {
      return JSON.parse(backup);
    }
    return DEFAULT_AI_SETTINGS;
  }
};

// ============================================
// STORAGE FUNCTIONS
// ============================================

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

    console.log('📤 Uploading to bucket:', bucket, 'filename:', filename);

    // Upload image
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
        throw new Error(`Storage bucket '${bucket}' does not exist. Please contact an administrator.`);
      }
      if (uploadError.message?.includes('policy') || uploadError.message?.includes('RLS')) {
        throw new Error(`Permission denied: Please check storage RLS policies. Error: ${uploadError.message}`);
      }
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    console.log('✅ Upload successful:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('❌ Storage error:', error);
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

// ============================================
// BACKWARD COMPATIBILITY FUNCTIONS
// ============================================

export const loadAIImageGenSettings = async (): Promise<AISettings> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.id) {
    return loadSettingsFromSupabase(user.id);
  }

  // If no user, load from local storage directly
  const backup = localStorage.getItem('ai_settings_backup');
  if (backup) {
    return JSON.parse(backup);
  }

  return DEFAULT_AI_SETTINGS;
};

export const saveAIImageGenSettings = async (settings: AISettings): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.id) {
    await saveSettingsToSupabase(user.id, settings);
  }
  // Always save to local storage as backup
  localStorage.setItem('ai_settings_backup', JSON.stringify(settings));
};

// Export for backward compatibility
export const loadVSGenSettings = loadAIImageGenSettings;
export const DEFAULT_AI_IMAGE_GEN_SETTINGS = DEFAULT_AI_SETTINGS;
export const DEFAULT_VS_GEN_SETTINGS = DEFAULT_AI_SETTINGS;
