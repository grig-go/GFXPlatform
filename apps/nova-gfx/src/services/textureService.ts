import { supabase, ensureFreshConnection, markSupabaseSuccess, markSupabaseFailure, forceReconnect, directRestUpdate, directRestDelete, directRestSelect } from '@emergent-platform/supabase-client';

// Storage bucket name for textures
// Note: The bucket in Supabase is named "Texures" (without the second 't')
const TEXTURES_BUCKET = 'Texures';

// Types
export interface OrganizationTexture {
  id: string;
  organizationId: string;
  name: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  storagePath: string;
  mediaType: 'image' | 'video';
  size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  uploadedBy: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TextureListOptions {
  limit?: number;
  offset?: number;
  type?: 'image' | 'video';
  search?: string;
  tags?: string[];
}

export interface TextureListResult {
  data: OrganizationTexture[];
  count: number;
  hasMore: boolean;
}

export interface TextureUploadOptions {
  name?: string;
  tags?: string[];
}

// Helper: Convert database row to OrganizationTexture
function mapRowToTexture(row: Record<string, unknown>): OrganizationTexture {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    fileName: row.file_name as string,
    fileUrl: row.file_url as string,
    thumbnailUrl: row.thumbnail_url as string | null,
    storagePath: row.storage_path as string,
    mediaType: row.media_type as 'image' | 'video',
    size: row.size as number | null,
    width: row.width as number | null,
    height: row.height as number | null,
    duration: row.duration as number | null,
    uploadedBy: row.uploaded_by as string | null,
    tags: (row.tags as string[]) || [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Helper: Get media type from MIME type
function getMediaType(mimeType: string): 'image' | 'video' | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return null;
}

// Helper: Generate unique filename
function generateFilename(file: File): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = file.name.split('.').pop() || '';
  const safeName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 50);
  return `${timestamp}-${random}-${safeName}.${ext}`;
}

// Helper: Get image dimensions
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// Helper: Get video metadata (dimensions and duration)
async function getVideoMetadata(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };

    video.src = url;
  });
}

// Helper: Generate thumbnail for image
async function generateImageThumbnail(file: File, maxSize: number = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
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
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for thumbnail'));
    };

    img.src = url;
  });
}

// Helper: Generate thumbnail for video (first frame)
async function generateVideoThumbnail(file: File, maxSize: number = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.onloadeddata = () => {
      // Seek to 1 second or 10% of duration, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      URL.revokeObjectURL(url);

      // Calculate thumbnail dimensions
      let width = video.videoWidth;
      let height = video.videoHeight;

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

      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create video thumbnail blob'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video for thumbnail'));
    };

    video.src = url;
    video.load();
  });
}

/**
 * Fetch textures for the current user's organization
 * Includes automatic retry with reconnection on timeout
 */
export async function fetchOrganizationTextures(
  organizationId: string,
  options: TextureListOptions = {}
): Promise<TextureListResult> {
  const { limit = 50, offset = 0, type, search, tags } = options;
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 15000; // 15 seconds

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Ensure connection is fresh before querying
      // Force health check on retry attempts
      await ensureFreshConnection(attempt > 0);

      let query = supabase
        .from('organization_textures')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        query = query.eq('media_type', type);
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS);
      });

      const { data, error, count } = await Promise.race([query, timeoutPromise]);

      if (error) {
        console.error('Error fetching textures:', error);
        throw new Error(`Failed to fetch textures: ${error.message}`);
      }

      markSupabaseSuccess();

      return {
        data: (data || []).map(mapRowToTexture),
        count: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.message.includes('timeout');
      const isLastAttempt = attempt === MAX_RETRIES;

      console.error(`[TextureService] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, err);

      if (isLastAttempt) {
        // Mark failure and throw
        await markSupabaseFailure();
        throw err;
      }

      // On timeout or error, force reconnect before retry
      if (isTimeout) {
        console.log('[TextureService] Timeout detected, forcing reconnection...');
        const reconnected = await forceReconnect();
        if (reconnected) {
          console.log('[TextureService] Reconnected, retrying...');
        } else {
          console.warn('[TextureService] Reconnection failed, retrying anyway...');
        }
      } else {
        // For other errors, mark failure which may trigger reconnect
        const shouldRetry = await markSupabaseFailure();
        if (!shouldRetry) {
          throw err;
        }
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error('Failed to fetch textures after retries');
}

/**
 * Upload a texture to the organization's folder
 */
export async function uploadTexture(
  file: File,
  organizationId: string,
  userId: string,
  options: TextureUploadOptions = {}
): Promise<OrganizationTexture> {
  const mediaType = getMediaType(file.type);
  if (!mediaType) {
    throw new Error(`Unsupported file type: ${file.type}. Only images and videos are allowed.`);
  }

  const filename = generateFilename(file);
  const storagePath = `${organizationId}/${filename}`;
  const thumbnailPath = `${organizationId}/thumbnails/${filename}.jpg`;

  // Get file metadata
  let width: number | null = null;
  let height: number | null = null;
  let duration: number | null = null;

  try {
    if (mediaType === 'image') {
      const dims = await getImageDimensions(file);
      width = dims.width;
      height = dims.height;
    } else {
      const meta = await getVideoMetadata(file);
      width = meta.width;
      height = meta.height;
      duration = meta.duration;
    }
  } catch (err) {
    console.warn('Failed to get media metadata:', err);
  }

  // Generate thumbnail
  let thumbnailUrl: string | null = null;
  try {
    const thumbnailBlob = mediaType === 'image'
      ? await generateImageThumbnail(file)
      : await generateVideoThumbnail(file);

    // Upload thumbnail
    const { error: thumbError } = await supabase.storage
      .from(TEXTURES_BUCKET)
      .upload(thumbnailPath, thumbnailBlob, {
        cacheControl: '31536000',
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (!thumbError) {
      const { data: thumbUrlData } = supabase.storage
        .from(TEXTURES_BUCKET)
        .getPublicUrl(thumbnailPath);
      thumbnailUrl = thumbUrlData.publicUrl;
    } else {
      console.warn('Failed to upload thumbnail:', thumbError);
    }
  } catch (err) {
    console.warn('Failed to generate thumbnail:', err);
  }

  // Upload original file
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(TEXTURES_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload texture: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(TEXTURES_BUCKET)
    .getPublicUrl(uploadData.path);

  const fileUrl = urlData.publicUrl;

  // Insert database record
  const textureName = options.name || file.name.replace(/\.[^/.]+$/, '');

  const { data: textureData, error: dbError } = await supabase
    .from('organization_textures')
    .insert({
      organization_id: organizationId,
      name: textureName,
      file_name: file.name,
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl,
      storage_path: storagePath,
      media_type: mediaType,
      size: file.size,
      width,
      height,
      duration,
      uploaded_by: userId,
      tags: options.tags || [],
    })
    .select()
    .single();

  if (dbError) {
    // Try to clean up uploaded files on database error
    await supabase.storage.from(TEXTURES_BUCKET).remove([storagePath, thumbnailPath]);
    throw new Error(`Failed to save texture record: ${dbError.message}`);
  }

  return mapRowToTexture(textureData);
}

/**
 * Update texture metadata
 * Uses direct REST API for better connection resilience
 */
export async function updateTexture(
  textureId: string,
  updates: { name?: string; tags?: string[] }
): Promise<OrganizationTexture> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }

  if (updates.tags !== undefined) {
    updateData.tags = updates.tags;
  }

  // Use direct REST API for reliable updates
  const result = await directRestUpdate(
    'organization_textures',
    updateData,
    { column: 'id', value: textureId },
    10000
  );

  if (!result.success) {
    throw new Error(`Failed to update texture: ${result.error}`);
  }

  // Fetch the updated record using direct REST
  const selectResult = await directRestSelect<Record<string, unknown>>(
    'organization_textures',
    '*',
    { column: 'id', value: textureId },
    10000
  );

  if (selectResult.error || !selectResult.data?.[0]) {
    throw new Error(`Failed to fetch updated texture: ${selectResult.error}`);
  }

  return mapRowToTexture(selectResult.data[0]);
}

/**
 * Delete a texture
 * Uses direct REST API for better connection resilience
 */
export async function deleteTexture(textureId: string): Promise<void> {
  // First get the texture to get storage paths using direct REST
  const selectResult = await directRestSelect<{ storage_path: string; thumbnail_url: string | null }>(
    'organization_textures',
    'storage_path,thumbnail_url',
    { column: 'id', value: textureId },
    10000
  );

  if (selectResult.error || !selectResult.data?.[0]) {
    throw new Error(`Failed to find texture: ${selectResult.error}`);
  }

  const texture = selectResult.data[0];

  // Delete from storage
  const pathsToDelete = [texture.storage_path];

  // Extract thumbnail path from URL if it exists
  if (texture.thumbnail_url) {
    const thumbPath = texture.storage_path.replace(/([^/]+)$/, 'thumbnails/$1.jpg');
    pathsToDelete.push(thumbPath);
  }

  const { error: storageError } = await supabase.storage
    .from(TEXTURES_BUCKET)
    .remove(pathsToDelete);

  if (storageError) {
    console.warn('Failed to delete texture files:', storageError);
  }

  // Delete database record using direct REST API
  const deleteResult = await directRestDelete(
    'organization_textures',
    { column: 'id', value: textureId },
    10000
  );

  if (!deleteResult.success) {
    throw new Error(`Failed to delete texture record: ${deleteResult.error}`);
  }
}

/**
 * Upload an AI-generated image as a texture
 * Similar to uploadTexture but accepts a Blob instead of a File
 */
export async function uploadAIGeneratedTexture(
  imageBlob: Blob,
  organizationId: string,
  userId: string,
  options: {
    name?: string;
    description?: string;
    tags?: string[];
    aiModelUsed?: string;
  } = {}
): Promise<OrganizationTexture> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filename = `${timestamp}-${random}-ai-generated.png`;
  const storagePath = `${organizationId}/${filename}`;
  const thumbnailPath = `${organizationId}/thumbnails/${filename}.jpg`;

  // Create a File from the Blob for dimension extraction
  const file = new File([imageBlob], filename, { type: 'image/png' });

  // Get image dimensions
  let width: number | null = null;
  let height: number | null = null;

  try {
    const dims = await getImageDimensions(file);
    width = dims.width;
    height = dims.height;
  } catch (err) {
    console.warn('Failed to get AI image dimensions:', err);
  }

  // Generate thumbnail
  let thumbnailUrl: string | null = null;
  try {
    const thumbnailBlob = await generateImageThumbnail(file);

    const { error: thumbError } = await supabase.storage
      .from(TEXTURES_BUCKET)
      .upload(thumbnailPath, thumbnailBlob, {
        cacheControl: '31536000',
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (!thumbError) {
      const { data: thumbUrlData } = supabase.storage
        .from(TEXTURES_BUCKET)
        .getPublicUrl(thumbnailPath);
      thumbnailUrl = thumbUrlData.publicUrl;
    } else {
      console.warn('Failed to upload AI thumbnail:', thumbError);
    }
  } catch (err) {
    console.warn('Failed to generate AI thumbnail:', err);
  }

  // Upload original image
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(TEXTURES_BUCKET)
    .upload(storagePath, imageBlob, {
      cacheControl: '31536000',
      contentType: 'image/png',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload AI texture: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(TEXTURES_BUCKET)
    .getPublicUrl(uploadData.path);

  const fileUrl = urlData.publicUrl;

  // Insert database record
  const textureName = options.name || `AI Generated - ${new Date().toLocaleString()}`;

  const insertData: Record<string, unknown> = {
    organization_id: organizationId,
    name: textureName,
    file_name: filename,
    file_url: fileUrl,
    thumbnail_url: thumbnailUrl,
    storage_path: storagePath,
    media_type: 'image',
    size: imageBlob.size,
    width,
    height,
    duration: null,
    uploaded_by: userId,
    tags: [...(options.tags || []), 'ai-generated'],
  };

  const { data: textureData, error: dbError } = await supabase
    .from('organization_textures')
    .insert(insertData)
    .select()
    .single();

  if (dbError) {
    // Try to clean up uploaded files on database error
    await supabase.storage.from(TEXTURES_BUCKET).remove([storagePath, thumbnailPath]);
    throw new Error(`Failed to save AI texture record: ${dbError.message}`);
  }

  console.log('✅ AI-generated texture saved:', fileUrl);
  return mapRowToTexture(textureData);
}

/**
 * Batch update tags for multiple textures
 * Uses direct REST API for better connection resilience
 */
export async function batchUpdateTextureTags(
  textureIds: string[],
  tags: string[],
  mode: 'set' | 'add' | 'remove' = 'set'
): Promise<void> {
  if (textureIds.length === 0) return;

  if (mode === 'set') {
    // Set tags directly (replace all) - update each texture individually
    const updatePromises = textureIds.map((id) =>
      directRestUpdate(
        'organization_textures',
        { tags, updated_at: new Date().toISOString() },
        { column: 'id', value: id },
        10000
      )
    );

    const results = await Promise.all(updatePromises);
    const errors = results.filter((r) => !r.success);
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} texture tags`);
    }
  } else {
    // For add/remove, we need to fetch current tags and update individually
    // Fetch all textures first
    const fetchPromises = textureIds.map((id) =>
      directRestSelect<{ id: string; tags: string[] }>(
        'organization_textures',
        'id,tags',
        { column: 'id', value: id },
        10000
      )
    );

    const fetchResults = await Promise.all(fetchPromises);
    const textures: { id: string; tags: string[] }[] = [];

    for (const result of fetchResults) {
      if (result.data?.[0]) {
        textures.push(result.data[0]);
      }
    }

    // Update each texture with new tags
    const updatePromises = textures.map((texture) => {
      const currentTags = texture.tags || [];
      let newTags: string[];

      if (mode === 'add') {
        newTags = [...new Set([...currentTags, ...tags])];
      } else {
        newTags = currentTags.filter((t) => !tags.includes(t));
      }

      return directRestUpdate(
        'organization_textures',
        { tags: newTags, updated_at: new Date().toISOString() },
        { column: 'id', value: texture.id },
        10000
      );
    });

    const results = await Promise.all(updatePromises);
    const errors = results.filter((r) => !r.success);
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} textures`);
    }
  }
}

/**
 * Batch delete multiple textures
 * Uses direct REST API for better connection resilience
 */
export async function batchDeleteTextures(textureIds: string[]): Promise<void> {
  if (textureIds.length === 0) return;

  // First get all texture storage paths using direct REST
  const fetchPromises = textureIds.map((id) =>
    directRestSelect<{ id: string; storage_path: string; thumbnail_url: string | null }>(
      'organization_textures',
      'id,storage_path,thumbnail_url',
      { column: 'id', value: id },
      10000
    )
  );

  const fetchResults = await Promise.all(fetchPromises);
  const textures: { id: string; storage_path: string; thumbnail_url: string | null }[] = [];

  for (const result of fetchResults) {
    if (result.data?.[0]) {
      textures.push(result.data[0]);
    }
  }

  // Collect all paths to delete
  const pathsToDelete: string[] = [];
  for (const texture of textures) {
    pathsToDelete.push(texture.storage_path);
    if (texture.thumbnail_url) {
      const thumbPath = texture.storage_path.replace(/([^/]+)$/, 'thumbnails/$1.jpg');
      pathsToDelete.push(thumbPath);
    }
  }

  // Delete from storage
  if (pathsToDelete.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(TEXTURES_BUCKET)
      .remove(pathsToDelete);

    if (storageError) {
      console.warn('Failed to delete some texture files:', storageError);
    }
  }

  // Delete database records using direct REST API
  const deletePromises = textureIds.map((id) =>
    directRestDelete(
      'organization_textures',
      { column: 'id', value: id },
      10000
    )
  );

  const results = await Promise.all(deletePromises);
  const errors = results.filter((r) => !r.success);
  if (errors.length > 0) {
    throw new Error(`Failed to delete ${errors.length} texture records`);
  }
}

/**
 * Format duration for display (e.g., "1:23" or "10:05")
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size for display (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
