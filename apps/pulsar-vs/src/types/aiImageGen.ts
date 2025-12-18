import { supabase } from '../lib/supabase';
import { supabaseUrl } from '../src/supabaseConfig';
import { getPulsarPromptInjectors } from '../utils/aiSettingsApi';

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
  imageEdit: {
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
    selectedImageEditModel?: string;
    boundSetVirtualSetFunction?: string;
    boundSetBackdropFunction?: string;
  };
  screenShare?: {
    type: 'screen' | 'window';
    screenToCapture: number;
    captureTarget: string;
  };
}

// Default Settings - API keys should come from backend ai_providers table, not env vars
export const DEFAULT_AI_SETTINGS: AISettings = {
  gemini: {
    apiKey: '', // Loaded from backend ai_providers table
    textModel: 'gemini-2.5-flash-lite',
    baseUrl: 'https://generativelanguage.googleapis.com'
  },
  imagen: {
    apiKey: '', // Loaded from backend ai_providers table
    model: 'imagen-4.0-fast-generate-001',
    baseUrl: 'https://generativelanguage.googleapis.com'
  },
  imageEdit: {
    apiKey: '', // Loaded from backend ai_providers table
    model: 'gemini-3-pro-image-preview',
    baseUrl: 'https://generativelanguage.googleapis.com'
  },
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

export const IMAGE_EDIT_MODELS = [
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image'
];

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

    const response = await fetch(`${supabaseUrl}/functions/v1/ai_provider/providers/by-dashboard/${dashboard}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
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
export const getCurrentModel = async (dashboard: PulsarVSDashboard): Promise<string> => {
  const providers = await fetchPulsarVSProviders();

  switch (dashboard) {
    case 'pulsar-vs-text':
      return providers.text?.model || DEFAULT_AI_SETTINGS.gemini.textModel;
    case 'pulsar-vs-image-gen':
      return providers.imageGen?.model || DEFAULT_AI_SETTINGS.imagen.model;
    case 'pulsar-vs-image-edit':
      return providers.imageEdit?.model || DEFAULT_AI_SETTINGS.imageEdit.model;
    default:
      return '';
  }
};

// Aspect Ratios for Image Generation
export const ASPECT_RATIOS = {
  'square': '1:1',
  'mobile-portrait': '3:4',
  'mobile-landscape': '4:3',
  'portrait': '9:16',
  'landscape': '16:9'                                               
};

// Supabase Storage Functions
// MODIFIED: Removed user dependency for offline mode
export const saveSettingsToSupabase = async (
  userId: string,
  settings: AISettings
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Fallback to localStorage only for offline/no-auth mode
    localStorage.setItem('ai_settings_backup', JSON.stringify(settings));
    
    // Try to save to Supabase if we have a userId, but don't fail if we can't
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
        console.warn('Failed to save AI settings to Supabase (using local backup):', error);
        // Don't return error, as we saved locally
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
    console.log('Using local settings backup or defaults');
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

// Helper function to call Google APIs via fetch-proxy
// MODIFIED: Removed session requirement for offline/no-auth mode
export const callGoogleAPIViaProxy = async (
  url: string,
  method: string = 'POST',
  headers: Record<string, string> = {},
  body: any = null
): Promise<any> => {
  // Try to get session but don't enforce it
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // If no token, we might rely on the server accepting anon requests for this specific proxy
  // However, usually the server verifies the user. 
  // If the user strictly wants NO sign in, we must assume the server allows anon or we use the anon key as bearer.
  // The Supabase Edge Function usually checks Authorization header.
  
  const proxyUrl = `${supabaseUrl}/functions/v1/fetch-proxy`;
  
  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    fetchHeaders['Authorization'] = `Bearer ${token}`;
  } else {
     // Use the anon key if no user session is present
     // This assumes the server function is configured to allow Anon access
     // For this specific app context ("remove sign in requirements"), we assume Anon access is desired.
     // Note: Client must provide some authorization usually, typically the Anon Key for Supabase.
     // If the Edge Function expects a USER token, this might fail unless updated on server side.
     // But we are editing client side only here as requested.
     // We will try sending the Anon Key as the Authorization header if no user token exists, 
     // or rely on the client library adding the apiKey header.
     
     // Usually Supabase client adds the apikey header automatically.
     // But for a direct fetch to the function URL, we should add Authorization.
     // Using the anon key as Bearer token mimics an anonymous user.
     
     // Get anon key from supabase instance if possible, or just rely on the fact that we don't have a user token.
     // For now, let's NOT send a Bearer token if we don't have one, and hope the server handles it (e.g. allows public access)
     // OR send the anon key.
     
     // Let's try to grab the key from the imported config
     const { supabaseAnonKey } = await import('../src/supabaseConfig');
     fetchHeaders['Authorization'] = `Bearer ${supabaseAnonKey}`;
  }

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: fetchHeaders,
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

// ============================================
// BACKEND API CALL FUNCTIONS
// ============================================

/**
 * Call the backend ai_provider/chat endpoint for text generation
 * This uses the API key stored in the ai_providers table, not from env/settings
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

  // Call the backend proxy that handles Imagen with backend API key
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

// Helper Functions for Generation (legacy - uses local API keys, prefer generateTextViaBackend)
export const generateWithGemini = async (
  prompt: string,
  settings?: Partial<AISettings>
): Promise<any> => {
  const config = { ...DEFAULT_AI_SETTINGS, ...settings };

  // If no local API key configured, throw an error directing to use backend
  if (!config.gemini.apiKey) {
    throw new Error('No local API key configured. Use generateTextViaBackend() with backend provider instead.');
  }

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
  settings?: Partial<AISettings>,
  customName?: string,
  customDescription?: string,
  usePromptInjectors: boolean = true // NEW: Control whether to use prompt injectors
): Promise<{ imageUrl?: string; base64?: string; error?: string }> => {
  const config = { ...DEFAULT_AI_SETTINGS, ...settings };
  const url = `${config.imagen.baseUrl}/v1beta/models/${config.imagen.model}:predict?key=${config.imagen.apiKey}`;

  // Build the enhanced prompt
  let enhancedPrompt = prompt;
  
  // Only fetch and apply prompt injectors for NEW image generation (not edits)
  if (usePromptInjectors) {
    const injectors = await getPulsarPromptInjectors();

    // Add framing/angle if provided (avoid the word "camera" to prevent AI from rendering cameras)
    if (injectors.cameraAngle) {
      enhancedPrompt = `${enhancedPrompt}. Framing: ${injectors.cameraAngle}`;
    }

    // Add perspective if provided
    if (injectors.pointOfView) {
      enhancedPrompt = `${enhancedPrompt}. Perspective: ${injectors.pointOfView}`;
    }

    // Add scene considerations if provided
    if (injectors.sceneConsiderations) {
      enhancedPrompt = `${enhancedPrompt}. ${injectors.sceneConsiderations}`;
    }

    console.log('🎨 Applied prompt injectors to new image generation');
  } else {
    console.log('✏️ Skipping prompt injectors for image editing');
  }
  
  // Add the general prompt enhancement
  if (config.virtualSet.promptEnhancement) {
    enhancedPrompt = `${enhancedPrompt}. ${config.virtualSet.promptEnhancement}`;
  }

  console.log('🎨 Final enhanced prompt:', enhancedPrompt);

  try {
    const requestBody = {
      instances: [{ prompt: enhancedPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: config.virtualSet.defaultAspectRatio,
        safetyFilterLevel: "block_some",
        personGeneration: "allow_adult"
      }
    };

    const data = await callGoogleAPIViaProxy(url, 'POST', { 'Content-Type': 'application/json' }, requestBody);

    if (data.predictions && data.predictions.length > 0) {
      const prediction = data.predictions[0];
      const imageData = prediction.bytesBase64Encoded || prediction.generated_images?.[0]?.bytesBase64Encoded;

      if (!imageData) {
        throw new Error('No image data in API response');
      }

      const base64Image = imageData.startsWith('data:')
        ? imageData.split(',')[1]
        : imageData;

      if (config.storage.enabled) {
        // Upload via media-library edge function instead of direct storage
        try {
          const supabaseUrl = import.meta.env.VITE_PULSAR_VS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
          const publicAnonKey = import.meta.env.VITE_PULSAR_VS_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

          // Convert base64 to blob
          const base64Response = await fetch(`data:image/png;base64,${base64Image}`);
          const imageBlob = await base64Response.blob();

          // Create FormData for the edge function
          const formData = new FormData();
          formData.append('file', imageBlob, `backdrop_${Date.now()}.png`);
          formData.append('name', customName || `Virtual Set Backdrop - ${new Date().toLocaleString()}`);
          formData.append('description', customDescription || enhancedPrompt);
          formData.append('media_type', 'image');
          formData.append('created_by', 'ai_generated');
          formData.append('ai_model_used', config.imagen.model || 'imagen-3.0-generate-001');
          formData.append('tags', JSON.stringify(['virtual-set', 'backdrop', 'ai-generated']));

          // Upload via edge function
          const uploadResponse = await fetch(
            `${supabaseUrl}/functions/v1/media-library`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: formData
            }
          );

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Failed to upload image');
          }

          const uploadData = await uploadResponse.json();
          const imageUrl = uploadData.data.file_url;
          
          return { imageUrl, base64: base64Image };
        } catch (uploadError) {
          console.error('Failed to upload to media library:', uploadError);
          // Fallback to returning just base64
          return { base64: base64Image, error: `Upload failed: ${uploadError}` };
        }
      }

      return { base64: base64Image };
    }

    throw new Error('No predictions returned from API');
  } catch (error) {
    console.error('Image generation error:', error);
    return { error: String(error) };
  }
};

/**
 * Edit an existing image using Gemini's native image editing capabilities
 * Gemini 2.0/2.5 Flash supports inpainting and image editing with natural language
 * @param sourceImage - Base64 encoded source image or URL
 * @param maskImage - Base64 encoded mask (white = edit areas) - used to guide the edit description
 * @param prompt - Description of what to change/generate in the image
 * @param settings - AI settings override
 */
export const editImageWithImagen = async (
  sourceImage: string,
  maskImage: string,
  prompt: string,
  settings?: Partial<AISettings>
): Promise<{ imageUrl?: string; base64?: string; error?: string }> => {
  const config = { ...DEFAULT_AI_SETTINGS, ...settings };

  // Use image edit model from settings or fallback to default
  const editModel = config.virtualSet?.selectedImageEditModel ||
    config.imageEdit?.model ||
    DEFAULT_AI_SETTINGS.imageEdit.model;

  const url = `${config.gemini.baseUrl}/v1beta/models/${editModel}:generateContent?key=${config.gemini.apiKey}`;

  console.log('✏️ Starting image edit with Gemini:', editModel);
  console.log('📝 Using API key from settings');

  try {
    // Convert URL to base64 if needed
    let sourceBase64 = sourceImage;
    if (sourceImage.startsWith('http')) {
      try {
        const response = await fetch(sourceImage);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        const reader = new FileReader();
        sourceBase64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (fetchError) {
        console.error('Failed to fetch source image:', fetchError);
        return { error: 'Failed to load source image for editing. Try generating a new image first.' };
      }
    } else if (sourceBase64.startsWith('data:')) {
      sourceBase64 = sourceBase64.split(',')[1];
    }

    // Build editing prompt that describes what to change
    const editPrompt = `Edit this image: ${prompt}. Keep the rest of the image unchanged. Only modify the areas that match the description.`;

    // Gemini multimodal request with image input and image output
    const requestBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: sourceBase64
            }
          },
          {
            text: editPrompt
          }
        ]
      }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        temperature: 0.4
      }
    };

    console.log('📤 Sending Gemini edit request...');

    const data = await callGoogleAPIViaProxy(url, 'POST', { 'Content-Type': 'application/json' }, requestBody);

    console.log('📥 Gemini edit response received');

    // Extract image from Gemini response
    let imageData: string | undefined;

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data;
            break;
          }
        }
      }
    }

    if (!imageData) {
      console.error('No image data found in Gemini response:', JSON.stringify(data).substring(0, 500));
      throw new Error('Gemini did not return an edited image. Try rephrasing your edit request.');
    }

    const base64Image = imageData.startsWith('data:')
      ? imageData.split(',')[1]
      : imageData;

    // Upload to storage if enabled
    if (config.storage.enabled) {
      try {
        const supabaseUrl = import.meta.env.VITE_PULSAR_VS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
        const publicAnonKey = import.meta.env.VITE_PULSAR_VS_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

        const base64Response = await fetch(`data:image/png;base64,${base64Image}`);
        const imageBlob = await base64Response.blob();

        const formData = new FormData();
        formData.append('file', imageBlob, `backdrop_edit_${Date.now()}.png`);
        formData.append('name', `Edited Backdrop - ${new Date().toLocaleString()}`);
        formData.append('description', `Edited: ${prompt}`);
        formData.append('media_type', 'image');
        formData.append('created_by', 'ai_edited');
        formData.append('ai_model_used', editModel);
        formData.append('tags', JSON.stringify(['virtual-set', 'backdrop', 'ai-edited']));

        const uploadResponse = await fetch(
          `${supabaseUrl}/functions/v1/media-library`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: formData
          }
        );

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          const imageUrl = uploadData.data.file_url;
          return { imageUrl, base64: base64Image };
        }
      } catch (uploadError) {
        console.error('Failed to upload edited image:', uploadError);
      }
    }

    return { base64: base64Image };
  } catch (error) {
    console.error('Image edit error:', error);
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

    console.log('📤 Uploading to bucket:', bucket, 'filename:', filename);

    // Upload image (bucket must already exist with proper RLS policies)
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

// Migration function
export const migrateSettingsToSupabase = async (userId: string): Promise<void> => {
  // Skip migration if no userId
  if (!userId) return;

  try {
    const oldSettings = localStorage.getItem('aiImageGenSettings');
    const vsSettings = localStorage.getItem('vsGenSettings');
    
    if (oldSettings || vsSettings) {
      console.log('Migrating settings from localStorage to Supabase...');
      
      const oldConfig = oldSettings ? JSON.parse(oldSettings) : {};
      const vsConfig = vsSettings ? JSON.parse(vsSettings) : {};
      
      const newSettings: AISettings = {
        gemini: {
          apiKey: oldConfig.apiKey || vsConfig.apiKey || DEFAULT_AI_SETTINGS.gemini.apiKey,
          textModel: oldConfig.model || vsConfig.model || DEFAULT_AI_SETTINGS.gemini.textModel,
          baseUrl: oldConfig.baseUrl || vsConfig.baseUrl || DEFAULT_AI_SETTINGS.gemini.baseUrl
        },
        imagen: DEFAULT_AI_SETTINGS.imagen,
        imageEdit: DEFAULT_AI_SETTINGS.imageEdit,
        storage: DEFAULT_AI_SETTINGS.storage,
        virtualSet: {
          promptEnhancement: oldConfig.promptEnhancement || vsConfig.promptEnhancement,
          defaultAspectRatio: '16:9'
        }
      };
      
      await saveSettingsToSupabase(userId, newSettings);
      
      localStorage.removeItem('aiImageGenSettings');
      localStorage.removeItem('vsGenSettings');
      
      console.log('Migration complete');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// ============================================
// API KEY CACHE (for performance optimization)
// ============================================
let cachedAPIKeys: { timestamp: number } | null = null;

// Function to invalidate the cache (call after saving new keys)
export const invalidateAPIKeyCache = () => {
  cachedAPIKeys = null;
  console.log('🔄 API key cache invalidated');
};

// Backward compatibility functions
export const loadAIImageGenSettings = async (): Promise<AISettings> => {
  // Don't force user login check, try to get user but fail gracefully
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.id) {
    await migrateSettingsToSupabase(user.id);
    return loadSettingsFromSupabase(user.id);
  }

  // If no user, load from local storage directly
  const backup = localStorage.getItem('ai_settings_backup');
  if (backup) {
    return JSON.parse(backup);
  }

  return DEFAULT_AI_SETTINGS;
};

// Save API key to ai_providers table via edge function (uses PUT to update existing provider)
const saveAPIKeyToProvider = async (
  providerId: string,
  apiKey: string,
  model?: string
): Promise<boolean> => {
  try {
    const { supabaseAnonKey } = await import('../src/supabaseConfig');

    const body: Record<string, unknown> = { apiKey };
    if (model) {
      body.model = model;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/ai_provider/providers/${providerId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.warn(`Failed to update ${providerId} provider:`, response.status);
      return false;
    }

    console.log(`✅ ${providerId} API key saved to database`);
    return true;
  } catch (error) {
    console.warn(`Failed to save ${providerId} API key to edge function:`, error);
    return false;
  }
};

export const saveAIImageGenSettings = async (settings: AISettings): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.id) {
    await saveSettingsToSupabase(user.id, settings);
  }
  // Always save to local storage as backup/primary for anon users
  localStorage.setItem('ai_settings_backup', JSON.stringify(settings));

  // Save API keys and models to ai_providers table via edge function (parallel for speed)
  const savePromises: Promise<boolean>[] = [];

  if (settings.gemini?.apiKey) {
    savePromises.push(
      saveAPIKeyToProvider('gemini', settings.gemini.apiKey, settings.virtualSet?.selectedGeminiModel || settings.gemini.textModel)
    );
  }

  if (settings.imagen?.apiKey) {
    savePromises.push(
      saveAPIKeyToProvider('imagen', settings.imagen.apiKey, settings.virtualSet?.selectedImagenModel || settings.imagen.model)
    );
  }

  if (settings.imageEdit?.apiKey) {
    savePromises.push(
      saveAPIKeyToProvider('gemini-image-edit', settings.imageEdit.apiKey, settings.virtualSet?.selectedImageEditModel || settings.imageEdit.model)
    );
  }

  if (savePromises.length > 0) {
    await Promise.all(savePromises);
    // Invalidate caches so next load gets fresh data
    invalidateAPIKeyCache();
    invalidateProviderCache();
  }
};

// Export for backward compatibility
export const loadVSGenSettings = loadAIImageGenSettings;
export const DEFAULT_AI_IMAGE_GEN_SETTINGS = DEFAULT_AI_SETTINGS;
export const DEFAULT_VS_GEN_SETTINGS = DEFAULT_AI_SETTINGS;