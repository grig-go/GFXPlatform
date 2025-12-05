import { supabase } from '@/lib/supabase';

// Storage bucket name
const MEDIA_BUCKET = 'project-media';

// Supported file types
export type MediaType = 'image' | 'video' | 'audio';

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// File type detection
function getMediaType(mimeType: string): MediaType | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return null;
}

// Generate unique filename
function generateFilename(file: File): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = file.name.split('.').pop() || '';
  const safeName = file.name
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Sanitize
    .substring(0, 50); // Limit length
  return `${timestamp}-${random}-${safeName}.${ext}`;
}

// Ensure the storage bucket exists (called once on app init)
export async function ensureBucketExists(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === MEDIA_BUCKET);
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(MEDIA_BUCKET, {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'video/mp4',
          'video/webm',
          'video/quicktime',
          'audio/mpeg',
          'audio/wav',
          'audio/ogg',
          'audio/webm',
        ],
      });
      
      if (error && !error.message.includes('already exists')) {
        console.error('Failed to create storage bucket:', error);
      }
    }
  } catch (err) {
    console.warn('Could not verify storage bucket:', err);
  }
}

// Get the folder path for a project
function getProjectFolder(projectId: string, mediaType: MediaType): string {
  return `${projectId}/${mediaType}s`;
}

/**
 * Upload a media file to Supabase storage
 */
export async function uploadMedia(
  file: File,
  projectId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const mediaType = getMediaType(file.type);
  if (!mediaType) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  const folder = getProjectFolder(projectId, mediaType);
  const filename = generateFilename(file);
  const filePath = `${folder}/${filename}`;

  // Upload with progress tracking (if XMLHttpRequest is available)
  // Note: Supabase JS doesn't have built-in progress, so we simulate it
  if (onProgress) {
    onProgress({ loaded: 0, total: file.size, percentage: 0 });
  }

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: '31536000', // 1 year cache
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  if (onProgress) {
    onProgress({ loaded: file.size, total: file.size, percentage: 100 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
    size: file.size,
    mimeType: file.type,
  };
}

/**
 * Upload a media file from a data URL (base64)
 */
export async function uploadMediaFromDataUrl(
  dataUrl: string,
  filename: string,
  projectId: string
): Promise<UploadResult> {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], filename, { type: blob.type });
  
  return uploadMedia(file, projectId);
}

/**
 * Delete a media file from storage
 */
export async function deleteMedia(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove([path]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Delete all media for a project
 */
export async function deleteProjectMedia(projectId: string): Promise<void> {
  const folders = ['images', 'videos', 'audios'];
  
  for (const folder of folders) {
    const folderPath = `${projectId}/${folder}`;
    
    // List files in folder
    const { data: files } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(folderPath);
    
    if (files && files.length > 0) {
      const paths = files.map(f => `${folderPath}/${f.name}`);
      await supabase.storage
        .from(MEDIA_BUCKET)
        .remove(paths);
    }
  }
}

/**
 * List media files for a project
 */
export async function listProjectMedia(
  projectId: string,
  mediaType?: MediaType
): Promise<{ name: string; url: string; size: number; createdAt: string }[]> {
  const folders = mediaType 
    ? [getProjectFolder(projectId, mediaType)]
    : ['images', 'videos', 'audios'].map(f => `${projectId}/${f}`);
  
  const results: { name: string; url: string; size: number; createdAt: string }[] = [];
  
  for (const folder of folders) {
    const { data: files } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(folder);
    
    if (files) {
      for (const file of files) {
        const filePath = `${folder}/${file.name}`;
        const { data: urlData } = supabase.storage
          .from(MEDIA_BUCKET)
          .getPublicUrl(filePath);
        
        results.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.metadata?.size || 0,
          createdAt: file.created_at || new Date().toISOString(),
        });
      }
    }
  }
  
  return results;
}

/**
 * Get a signed URL for private access (if needed)
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}








