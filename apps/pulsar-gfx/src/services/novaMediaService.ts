/**
 * Nova Media Library Service
 * Connects to Nova's media-library edge function for browsing and searching media
 */

// Use environment variables - no hardcoded fallbacks
const NOVA_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const NOVA_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const MEDIA_LIBRARY_URL = `${NOVA_SUPABASE_URL}/functions/v1/media-library`;

export interface NovaMediaAsset {
  id: string;
  name: string;
  file_name: string;
  file_url: string;
  thumbnail_url: string;
  storage_path?: string;
  media_type: 'image' | 'video' | 'audio';
  created_by?: string;
  ai_model_used?: string;
  tags: string[];
  created_at: string;
  description?: string;
  size?: number;
  latitude?: number;
  longitude?: number;
  on_map?: boolean;
}

export interface MediaSearchResult {
  ok: boolean;
  results: NovaMediaAsset[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface MediaListResult {
  data: NovaMediaAsset[];
  count: number;
}

/**
 * Search media assets by query
 */
export async function searchNovaMedia(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    type?: 'image' | 'video' | 'audio';
    imagesOnly?: boolean;
  } = {}
): Promise<MediaSearchResult> {
  const { limit = 20, offset = 0, type, imagesOnly = false } = options;

  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: String(offset),
  });

  if (imagesOnly) {
    params.set('images_only', 'true');
  } else if (type) {
    params.set('type', type);
  }

  try {
    const response = await fetch(`${MEDIA_LIBRARY_URL}/search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NOVA_ANON_KEY}`,
        'apikey': NOVA_ANON_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Nova media search error:', error);
    throw error;
  }
}

/**
 * Fetch media assets with optional filters
 */
export async function fetchNovaMedia(
  options: {
    limit?: number;
    offset?: number;
    type?: 'image' | 'video' | 'audio';
    search?: string;
  } = {}
): Promise<MediaListResult> {
  const { limit = 24, offset = 0, type, search } = options;

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (type) {
    params.set('type', type);
  }
  if (search) {
    params.set('search', search);
  }

  try {
    const response = await fetch(`${MEDIA_LIBRARY_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NOVA_ANON_KEY}`,
        'apikey': NOVA_ANON_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Nova media fetch error:', error);
    throw error;
  }
}

/**
 * Upload a file to Nova Media Library
 */
export async function uploadToNovaMedia(
  file: File,
  options: {
    name?: string;
    description?: string;
    tags?: string[];
    mediaType?: 'image' | 'video' | 'audio';
  } = {}
): Promise<NovaMediaAsset> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', options.name || file.name);
  formData.append('description', options.description || '');
  formData.append('tags', JSON.stringify(options.tags || []));
  formData.append('media_type', options.mediaType || getMediaType(file));
  formData.append('created_by', 'pulsar-gfx');

  try {
    const response = await fetch(MEDIA_LIBRARY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOVA_ANON_KEY}`,
        'apikey': NOVA_ANON_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Nova media upload error:', error);
    throw error;
  }
}

/**
 * Determine media type from file
 */
function getMediaType(file: File): 'image' | 'video' | 'audio' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'image'; // default
}
