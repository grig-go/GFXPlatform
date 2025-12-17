// Modular Image Storage System
// Easy to change storage backend (local, S3, Cloudinary, etc.)

export interface ImageStorageResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface ImageStorageConfig {
  baseUrl: string;
  uploadPath: string;
  maxFileSize: number; // in bytes
  allowedFormats: string[];
}

// Storage interface for easy backend switching
export interface ImageStorageProvider {
  uploadImage(file: File, config: ImageStorageConfig): Promise<ImageStorageResult>;
  deleteImage(path: string): Promise<boolean>;
  getImageUrl(path: string): string;
  convertDataUrlToProperUrl?(dataUrl: string): string | null;
}

// Local file system storage implementation
export class LocalImageStorage implements ImageStorageProvider {
  private basePath: string;
  private imageCache: Map<string, string> = new Map(); // Cache for data URLs

  constructor(basePath: string = '/public/images/ai-generated') {
    this.basePath = basePath;
    this.loadFromLocalStorage();
  }
  
  // Load cached images from localStorage on initialization
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('ai_generated_images');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.imageCache = new Map(Object.entries(parsed));
        console.log('🔍 [DEBUG] Loaded', this.imageCache.size, 'images from localStorage');
      }
    } catch (error) {
      console.warn('Failed to load images from localStorage:', error);
    }
  }
  
  // Save cached images to localStorage
  private saveToLocalStorage(): void {
    try {
      const serialized = Object.fromEntries(this.imageCache);
      localStorage.setItem('ai_generated_images', JSON.stringify(serialized));
      console.log('🔍 [DEBUG] Saved', this.imageCache.size, 'images to localStorage');
    } catch (error) {
      console.warn('Failed to save images to localStorage:', error);
    }
  }

  async uploadImage(file: File, config: ImageStorageConfig): Promise<ImageStorageResult> {
    try {
      // Validate file
      if (file.size > config.maxFileSize) {
        return {
          success: false,
          error: `File too large. Max size: ${config.maxFileSize / 1024 / 1024}MB`
        };
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !config.allowedFormats.includes(fileExtension)) {
        return {
          success: false,
          error: `Invalid file format. Allowed: ${config.allowedFormats.join(', ')}`
        };
      }

      // Create unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileName = `ai-image-${timestamp}-${randomId}.${fileExtension}`;
      const relativePath = `${this.basePath}/${fileName}`;

      // Convert to data URL and cache it
      const reader = new FileReader();
      
      return new Promise((resolve) => {
        reader.onload = () => {
          const dataUrl = reader.result as string;
          
          // Cache the data URL with the path as key
          this.imageCache.set(relativePath, dataUrl);
          
          // Also cache with a shorter key for easier retrieval
          const shortKey = `img_${timestamp}_${randomId}`;
          this.imageCache.set(shortKey, dataUrl);
          
          // Save to localStorage for persistence
          this.saveToLocalStorage();
          
          console.log('🔍 [DEBUG] Image cached with keys:', relativePath, shortKey);
          console.log('🔍 [DEBUG] Data URL length:', dataUrl.length);
          
          const properUrl = `${window.location.origin}${relativePath}`;
          console.log('🔍 [DEBUG] Returning proper URL instead of base64:', properUrl);
          console.log('🔍 [DEBUG] URL length difference:', dataUrl.length, 'vs', properUrl.length);
          
          resolve({
            success: true,
            url: properUrl, // Return proper URL instead of base64
            path: relativePath
          });
        };
        reader.onerror = () => {
          resolve({
            success: false,
            error: 'Failed to read file'
          });
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteImage(path: string): Promise<boolean> {
    // In a real implementation, this would call a server endpoint to delete the file
    console.log(`Would delete image at: ${path}`);
    return true;
  }

  getImageUrl(path: string): string {
    // For data URLs, return as-is
    if (path.startsWith('data:')) {
      return path;
    }
    
    // Check cache first - if we have a cached data URL, use it for display
    const cachedUrl = this.imageCache.get(path);
    if (cachedUrl) {
      console.log('🔍 [DEBUG] Retrieved image from cache for path:', path);
      return cachedUrl; // Return the cached data URL for immediate display
    }
    
    // For file paths, construct URL
    return `${window.location.origin}${path}`;
  }
  
  // Method to get cached image by any key
  getCachedImage(key: string): string | null {
    return this.imageCache.get(key) || null;
  }
  
  // Method to list all cached images (for debugging)
  listCachedImages(): Array<{key: string, urlLength: number}> {
    return Array.from(this.imageCache.entries()).map(([key, url]) => ({
      key,
      urlLength: url.length
    }));
  }
  
  // Method to clear all cached images
  clearCache(): void {
    this.imageCache.clear();
    localStorage.removeItem('ai_generated_images');
    console.log('🔍 [DEBUG] Image cache cleared');
  }
  
  // Method to get cache size
  getCacheSize(): number {
    return this.imageCache.size;
  }
  
  // Convert a data URL to a proper URL if it exists in cache
  convertDataUrlToProperUrl(dataUrl: string): string | null {
    // Check if this data URL exists in our cache
    for (const [key, cachedUrl] of this.imageCache.entries()) {
      if (cachedUrl === dataUrl) {
        // Return the proper URL for this cached image
        if (key.startsWith('/public/images/ai-generated/')) {
          return `${window.location.origin}${key}`;
        } else if (key.startsWith('img_')) {
          // Convert short key to proper path
          const fileName = key.replace('img_', 'ai-image-').replace('_', '-') + '.png';
          return `${window.location.origin}/public/images/ai-generated/${fileName}`;
        }
      }
    }
    return null;
  }
}

// Future: S3 storage implementation
export class S3ImageStorage implements ImageStorageProvider {

  constructor(_bucketName: string, _region: string) {
    // Constructor parameters prefixed with _ to indicate intentionally unused
    // Implementation will be added in the future
  }

  async uploadImage(_file: File, _config: ImageStorageConfig): Promise<ImageStorageResult> {
    // TODO: Implement S3 upload
    throw new Error('S3 storage not implemented yet');
  }

  async deleteImage(_path: string): Promise<boolean> {
    // TODO: Implement S3 delete
    throw new Error('S3 storage not implemented yet');
  }

  getImageUrl(_path: string): string {
    // TODO: Implement S3 URL generation
    throw new Error('S3 storage not implemented yet');
  }
}

// Storage factory for easy provider switching
export class ImageStorageFactory {
  private static instance: ImageStorageProvider;

  static getInstance(): ImageStorageProvider {
    if (!this.instance) {
      // Default to local storage
      this.instance = new LocalImageStorage();
    }
    return this.instance;
  }

  static setProvider(provider: ImageStorageProvider): void {
    this.instance = provider;
  }

  static createLocalStorage(basePath?: string): ImageStorageProvider {
    return new LocalImageStorage(basePath);
  }

  static createS3Storage(bucketName: string, region: string): ImageStorageProvider {
    return new S3ImageStorage(bucketName, region);
  }
}

// Default configuration
export const DEFAULT_IMAGE_CONFIG: ImageStorageConfig = {
  baseUrl: window.location.origin,
  uploadPath: '/public/images/ai-generated',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
};
