// Media Library Types

export type MediaType = 'image' | 'video' | 'audio' | '3d';
export type MediaSource = 'ai-generated' | 'user-uploaded';
export type SyncStatus = 'synced' | 'pending' | 'error' | 'paused' | 'none';

export interface SystemDistribution {
  system_name: string;
  system_type: string;
  path: string;
  status: SyncStatus;
  last_sync?: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  thumbnail_url?: string;
  file_type: MediaType;
  file_size: number; // in bytes
  dimensions?: {
    width: number;
    height: number;
  };
  source: MediaSource;
  ai_model_used?: string;
  generation_prompt?: string;
  generation_metadata?: Record<string, any>;
  created_by: string; // user email or 'auto:Pulsar'
  created_at: string; // ISO date
  tags: string[];
  checksum?: string; // SHA256
  usage_count: number;
  sync_status: SyncStatus;
  last_synced?: string; // ISO date
  distribution?: SystemDistribution[];
  latitude?: number; // Latitude coordinate (optional)
  longitude?: number; // Longitude coordinate (optional)
}

export interface MediaFilters {
  search: string;
  type?: MediaType;
  source?: MediaSource;
  aiModel?: string;
  creator?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  syncStatus?: SyncStatus;
  sortBy: 'date' | 'name' | 'size' | 'model';
  sortOrder: 'asc' | 'desc';
}