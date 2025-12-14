// types/playlist.ts
// Playlist system types and interfaces

export type PlaylistItemType = 'page' | 'group' | 'media';

// Day of week for scheduling
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Schedule rule types
export type ScheduleRuleType = 'daily' | 'weekly' | 'specific_dates' | 'date_range';

// Time range for scheduling
export interface TimeRange {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

// Schedule configuration for playlist items
export interface ScheduleConfig {
  enabled: boolean;
  ruleType: ScheduleRuleType;
  // Date range
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  // Specific dates (for specific_dates rule type)
  specificDates?: string[]; // Array of ISO date strings
  // Days of week (for weekly rule type)
  daysOfWeek?: DayOfWeek[];
  // Time windows - when the item should play
  timeWindows?: TimeRange[];
  // Exclusion dates - dates when item should NOT play
  exclusionDates?: string[];
  // Exclusion time windows - times when item should NOT play
  exclusionTimes?: TimeRange[];
  // Priority (higher = plays first when multiple items match)
  priority?: number;
  // Custom rules (for advanced scheduling)
  customRules?: {
    name: string;
    condition: string; // e.g., "first_monday_of_month", "last_day_of_month"
    enabled: boolean;
  }[];
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  project_id?: string;
  is_active: boolean;
  loop_enabled: boolean;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  item_type: PlaylistItemType;
  content_id?: string;
  media_id?: string;
  name: string;
  channel_id?: string;
  channel_name?: string;
  channel_type?: string;
  duration: number; // seconds, 0 = manual advance
  scheduled_time?: string; // Legacy simple time field
  schedule_config?: ScheduleConfig; // New advanced scheduling
  sort_order: number;
  metadata?: Record<string, any>;
  created_at: string;
  // Joined data
  content_backdrop?: string;
  media_url?: string;
  media_thumbnail?: string;
  media_type?: string;
}

export interface PlaylistWithItems extends Playlist {
  items: PlaylistItem[];
}

export interface CreatePlaylistParams {
  name: string;
  description?: string;
  project_id?: string;
  loop_enabled?: boolean;
}

export interface AddPlaylistItemParams {
  playlist_id: string;
  item_type: PlaylistItemType;
  name: string;
  content_id?: string;
  media_id?: string;
  channel_id?: string;
  duration?: number;
  scheduled_time?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePlaylistItemParams {
  id: string;
  name?: string;
  channel_id?: string;
  duration?: number;
  scheduled_time?: string;
  metadata?: Record<string, any>;
  media_id?: string;
}

// Icon mapping for item types
export const ITEM_TYPE_ICONS: Record<PlaylistItemType, string> = {
  page: 'FileText',
  group: 'Folder',
  media: 'Image',
};

export const ITEM_TYPE_COLORS: Record<PlaylistItemType, string> = {
  page: 'bg-blue-100 text-blue-800',
  group: 'bg-purple-100 text-purple-800',
  media: 'bg-green-100 text-green-800',
};
