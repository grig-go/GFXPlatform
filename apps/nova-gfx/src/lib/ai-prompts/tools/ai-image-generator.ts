/**
 * AI Image Generator Tool
 *
 * Generates images using Gemini Image API and stores them in Supabase.
 * Resolves {{GENERATE:query}} placeholders to real image URLs.
 *
 * Flow:
 * 1. Check if image with matching prompt hash already exists in organization_textures
 * 2. If found, return existing URL
 * 3. If not, generate new image via Gemini API
 * 4. Upload to Supabase storage
 * 5. Save to organization_textures with tags ["ai-generated", "auto"]
 * 6. Return public URL
 */

import { getGeminiApiKey, getAIImageModel, AI_IMAGE_MODELS } from '../../ai';

// Constants
const TEXTURES_BUCKET = 'Texures'; // Note: bucket name has typo in Supabase
const AI_GENERATED_TAGS = ['ai-generated', 'auto'];
const IMAGE_WIDTH = 1280;
const IMAGE_HEIGHT = 720;
const PLACEHOLDER_PATH = 'do-no-delete/placeholder.png';

/**
 * Get the fallback placeholder URL dynamically from env
 * This ensures the URL is always correct regardless of which Supabase project is configured
 */
export function getFallbackPlaceholderUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    // Fallback to a generic placeholder
    return '';
  }
  return `${supabaseUrl}/storage/v1/object/public/${TEXTURES_BUCKET}/${PLACEHOLDER_PATH}`;
}

/**
 * Generate a hash for the prompt to use as cache key
 */
function hashPrompt(prompt: string): string {
  // Simple hash function for prompt deduplication
  let hash = 0;
  const str = prompt.toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `prompt_${Math.abs(hash).toString(16)}`;
}

/**
 * Enhance the user's query for better broadcast-quality image generation
 */
function enhancePromptForBroadcast(query: string): string {
  const normalizedQuery = query.toLowerCase().trim();

  // Check if this is a logo/crest/emblem request - needs vector/flat styling
  const isLogoRequest = normalizedQuery.includes('logo') ||
    normalizedQuery.includes('crest') ||
    normalizedQuery.includes('emblem') ||
    normalizedQuery.includes('badge') ||
    normalizedQuery.includes('team') && (normalizedQuery.includes('flag') || normalizedQuery.includes('national'));

  if (isLogoRequest) {
    // For logos, ensure vector/flat design style (graphical, not photorealistic)
    const hasVectorKeywords = normalizedQuery.includes('vector') ||
      normalizedQuery.includes('flat') ||
      normalizedQuery.includes('graphic');

    if (hasVectorKeywords) {
      // Already has the right keywords, just clean up
      return `${query}, clean sharp edges, solid colors, no gradients, centered, simple background`;
    } else {
      // Add vector/flat design keywords for graphical style
      return `${query}, vector graphic style, flat design, clean sharp edges, solid colors, no gradients, centered, simple solid color background, professional sports logo illustration`;
    }
  }

  // Category-specific enhancements for non-logo images
  const enhancements: Record<string, string> = {
    // Sports
    'basketball': 'Professional basketball action shot, dynamic lighting, sports broadcast quality, HD, cinematic',
    'football': 'American football game action, stadium atmosphere, broadcast quality, dramatic lighting, HD',
    'soccer': 'Professional soccer/football match, stadium environment, broadcast quality, dynamic action, HD',
    'baseball': 'Baseball game action, stadium setting, broadcast quality, dramatic lighting, HD',
    'hockey': 'Ice hockey action shot, arena lighting, broadcast quality, dynamic movement, HD',
    'stadium': 'Professional sports stadium, dramatic lighting, broadcast quality, cinematic, HD',
    'arena': 'Sports arena interior, professional lighting, broadcast quality, atmospheric, HD',

    // Urban/City
    'city': 'Modern city skyline, professional photography, broadcast quality, cinematic lighting, HD',
    'skyline': 'Dramatic city skyline, golden hour or night, broadcast quality, cinematic, HD',
    'downtown': 'Urban downtown scene, professional quality, broadcast ready, atmospheric lighting, HD',

    // Abstract/Backgrounds
    'background': 'Professional dark abstract background, subtle texture, broadcast quality, HD',
    'texture': 'High-quality abstract texture, dark tones, professional, broadcast ready, HD',
    'gradient': 'Smooth professional gradient, broadcast quality, subtle colors, HD',
    'abstract': 'Modern abstract design, professional quality, broadcast ready, dark tones, HD',

    // Weather/Nature
    'weather': 'Dramatic weather scene, professional photography, broadcast quality, cinematic, HD',
    'storm': 'Dramatic storm clouds, cinematic lighting, broadcast quality, atmospheric, HD',
    'clouds': 'Beautiful cloud formation, professional photography, broadcast quality, HD',
  };

  // Check for keyword matches and apply enhancement
  for (const [keyword, enhancement] of Object.entries(enhancements)) {
    if (normalizedQuery.includes(keyword)) {
      return `${query}, ${enhancement}`;
    }
  }

  // Default enhancement for any query
  return `${query}, professional quality, suitable for broadcast graphics, high resolution, cinematic lighting, 16:9 aspect ratio`;
}

/**
 * Check if an image with this prompt already exists in the organization's textures
 * Uses the prompt hash in the filename for cache lookup
 * Uses REST API to avoid Supabase client hangs
 */
async function findExistingGeneratedImage(
  organizationId: string,
  promptHash: string
): Promise<string | null> {
  try {
    // Get Supabase config from env
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Cache lookup: Missing Supabase env config');
      return null;
    }

    // Look for existing AI-generated image by checking if the filename contains the prompt hash
    // The hash is embedded in filenames like: timestamp-random-ai-prompt_HASH.png
    // Use REST API with ilike filter
    const queryUrl = `${supabaseUrl}/rest/v1/organization_textures?select=file_url&organization_id=eq.${organizationId}&name=ilike.*${promptHash}*&limit=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`⚠️ Cache lookup error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (!data || data.length === 0) {
        return null;
      }

      console.log(`🎯 Found cached AI-generated image for prompt hash: ${promptHash}`);
      return data[0].file_url;
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        console.warn(`⚠️ Cache lookup timed out after 5s`);
      } else {
        console.warn(`⚠️ Cache lookup fetch error:`, fetchErr);
      }
      return null;
    }
  } catch (err) {
    console.warn(`⚠️ Cache lookup exception:`, err);
    return null;
  }
}

/**
 * Generate an image using the Gemini API
 */
async function generateImageWithGemini(prompt: string): Promise<Blob | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.error('❌ No Gemini API key configured for image generation');
    return null;
  }

  const modelId = getAIImageModel();
  const modelConfig = AI_IMAGE_MODELS[modelId];
  if (!modelConfig) {
    console.error(`❌ Invalid image model: ${modelId}`);
    return null;
  }

  const apiModel = modelConfig.apiModel;
  const enhancedPrompt = enhancePromptForBroadcast(prompt);

  console.log(`🎨 Generating image with ${apiModel}: "${enhancedPrompt.substring(0, 100)}..."`);

  try {
    // Build generation config for Gemini 2.5 Flash Image
    // Reference: https://developers.googleblog.com/en/gemini-2-5-flash-image-now-ready-for-production-with-new-aspect-ratios/
    const generationConfig: Record<string, unknown> = {
      responseModalities: ['IMAGE', 'TEXT'],
      // imageConfig specifies aspect ratio for generated images
      // Supported: 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
      imageConfig: {
        aspectRatio: '16:9',
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: enhancedPrompt,
                },
              ],
            },
          ],
          generationConfig,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();

    // Extract image data from response
    const candidates = data.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          // Decode base64 image data
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';

          // Convert base64 to Blob
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          console.log(`✅ Image generated successfully (${mimeType})`);
          return new Blob([bytes], { type: mimeType });
        }
      }
    }

    console.error('❌ No image data in Gemini response');
    return null;
  } catch (error) {
    console.error('❌ Failed to generate image:', error);
    return null;
  }
}

/**
 * Upload generated image to Supabase storage and create texture record
 */
async function uploadGeneratedImage(
  imageBlob: Blob,
  organizationId: string,
  userId: string,
  originalPrompt: string,
  promptHash: string,
  accessToken: string
): Promise<string | null> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = imageBlob.type === 'image/jpeg' ? 'jpg' : 'png';
  const filename = `${timestamp}-${random}-ai-${promptHash}.${extension}`;
  const storagePath = `${organizationId}/${filename}`;
  const thumbnailPath = `${organizationId}/thumbnails/${filename}.jpg`;

  try {
    console.log(`📤 [Upload] Starting upload for: ${storagePath}`);

    // Skip thumbnail for now - just upload main image
    const thumbnailUrl: string | null = null;

    // Get Supabase URL and anon key from env
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ [Upload] Missing Supabase URL or anon key');
      return null;
    }

    // Upload using direct REST API with user's access token (required for authenticated policies)
    console.log(`📤 [Upload] Uploading via REST (size: ${imageBlob.size} bytes, type: ${imageBlob.type})...`);

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${TEXTURES_BUCKET}/${storagePath}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': imageBlob.type,
        'x-upsert': 'true',
      },
      body: imageBlob,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ [Upload] REST upload failed:', uploadResponse.status, errorText);
      return null;
    }

    console.log(`📤 [Upload] REST upload successful`);

    // Construct public URL directly
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/${TEXTURES_BUCKET}/${storagePath}`;

    // Create database record - skip for now, just return the URL
    // The file is already uploaded and publicly accessible
    const textureName = `AI: ${originalPrompt.substring(0, 50)} (${promptHash})`;

    // Save to database using REST API (not Supabase client to avoid potential hangs)
    console.log(`📤 [Upload] Saving to database via REST...`);

    const dbInsertUrl = `${supabaseUrl}/rest/v1/organization_textures`;
    const dbPayload = {
      organization_id: organizationId,
      name: textureName,
      file_name: filename,
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl,
      storage_path: storagePath,
      media_type: 'image',
      size: imageBlob.size,
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      duration: null,
      uploaded_by: userId,
      tags: AI_GENERATED_TAGS,
    };

    try {
      const dbResponse = await fetch(dbInsertUrl, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(dbPayload),
      });

      if (!dbResponse.ok) {
        const dbErrorText = await dbResponse.text();
        console.error('❌ [Upload] Failed to save texture record:', dbResponse.status, dbErrorText);
        // Don't clean up - the file is still useful even without DB record
        console.warn('⚠️ Continuing with URL despite DB error - file is uploaded');
      } else {
        console.log(`📤 [Upload] Database record saved`);
      }
    } catch (dbErr) {
      console.error('❌ [Upload] DB insert exception:', dbErr);
      console.warn('⚠️ Continuing with URL despite DB error - file is uploaded');
    }

    console.log(`✅ AI-generated image saved: ${fileUrl}`);
    return fileUrl;
  } catch (error) {
    console.error('❌ Failed to upload generated image:', error);
    return null;
  }
}

/**
 * Generate a thumbnail from an image blob (with 5s timeout)
 */
async function generateThumbnail(imageBlob: Blob, maxSize: number = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Thumbnail generation timed out'));
    }, 5000);

    img.onload = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);

      // Calculate thumbnail dimensions
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for thumbnail'));
    };

    img.src = url;
  });
}

/**
 * Main function to get or generate an image URL for a prompt
 */
export async function getOrGenerateImageUrl(
  prompt: string,
  organizationId: string,
  userId: string,
  accessToken: string
): Promise<string> {
  const promptHash = hashPrompt(prompt);
  console.log(`🖼️ [getOrGenerateImageUrl] Starting for: "${prompt.substring(0, 40)}..."`);

  // Skip cache check - database queries are too slow/hanging
  // TODO: Re-enable once Supabase performance is fixed
  // const existingUrl = await findExistingGeneratedImage(organizationId, promptHash);
  // if (existingUrl) return existingUrl;
  console.log(`🖼️ [getOrGenerateImageUrl] Generating new image (cache disabled)...`);

  // 2. Generate new image
  const imageBlob = await generateImageWithGemini(prompt);
  console.log(`🖼️ [getOrGenerateImageUrl] Generation complete, blob:`, imageBlob ? 'OK' : 'NULL');
  if (!imageBlob) {
    console.warn(`⚠️ Image generation failed, using fallback placeholder for: "${prompt}"`);
    return getFallbackPlaceholderUrl();
  }

  // 3. Upload and save
  const uploadedUrl = await uploadGeneratedImage(
    imageBlob,
    organizationId,
    userId,
    prompt,
    promptHash,
    accessToken
  );

  if (!uploadedUrl) {
    console.warn(`⚠️ Image upload failed, using fallback placeholder for: "${prompt}"`);
    return getFallbackPlaceholderUrl();
  }

  return uploadedUrl;
}

/**
 * Pattern for GENERATE placeholders: {{GENERATE:query}}
 */
const GENERATE_PATTERN = /\{\{GENERATE:([^}]+)\}\}/g;

/**
 * Extract all GENERATE placeholders from text
 */
export function extractGeneratePlaceholders(text: string): string[] {
  const placeholders: string[] = [];
  let match;

  // Debug: Log what we're searching in
  console.log(`🔍 Extracting GENERATE placeholders from text (length: ${text.length})`);
  console.log(`🔍 Text sample: ${text.substring(0, 200)}...`);

  // Reset regex state before starting
  GENERATE_PATTERN.lastIndex = 0;

  while ((match = GENERATE_PATTERN.exec(text)) !== null) {
    console.log(`🔍 Found placeholder: ${match[0]} -> query: ${match[1]}`);
    placeholders.push(match[1].trim());
  }

  // Reset regex state
  GENERATE_PATTERN.lastIndex = 0;

  console.log(`🔍 Total placeholders found: ${placeholders.length}`);

  return placeholders;
}

/**
 * Resolve all GENERATE placeholders in text
 * This is an async operation that may take time for image generation
 */
export async function resolveGeneratePlaceholders(
  text: string,
  organizationId: string,
  userId: string,
  accessToken: string
): Promise<string> {
  const placeholders = extractGeneratePlaceholders(text);

  if (placeholders.length === 0) {
    return text;
  }

  console.log(`🖼️ Resolving ${placeholders.length} GENERATE placeholder(s)...`);

  // Generate all images in parallel for better performance
  const urlPromises = placeholders.map((prompt) =>
    getOrGenerateImageUrl(prompt, organizationId, userId, accessToken)
  );

  const urls = await Promise.all(urlPromises);

  // Replace placeholders with URLs
  let result = text;
  placeholders.forEach((prompt, index) => {
    const placeholder = `{{GENERATE:${prompt}}}`;
    result = result.replace(placeholder, urls[index]);
    console.log(`🖼️ Resolved: "${prompt}" → ${urls[index]}`);
  });

  return result;
}

/**
 * Check if text contains any GENERATE placeholders
 */
export function hasGeneratePlaceholders(text: string): boolean {
  GENERATE_PATTERN.lastIndex = 0;
  return GENERATE_PATTERN.test(text);
}

/**
 * Replace all GENERATE placeholders with the fallback placeholder URL
 * Used when user wants to skip AI image generation
 */
export function replaceGenerateWithPlaceholder(text: string): string {
  const placeholderUrl = getFallbackPlaceholderUrl();
  GENERATE_PATTERN.lastIndex = 0;
  return text.replace(GENERATE_PATTERN, placeholderUrl);
}
