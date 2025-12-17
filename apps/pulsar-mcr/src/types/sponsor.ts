// Sponsor Scheduling Types
// Based on the legacy ipsum sponsor system and item/bucket/playlist scheduling patterns

export type MediaType = 'image' | 'video' | 'audio';
export type SyncStatus = 'synced' | 'pending' | 'error' | 'none';

// Media asset from Novadevgrig media library
export interface MediaAsset {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  thumbnail_url?: string;
  media_type: MediaType;
  file_size?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  tags?: string[];
  created_at?: string;
  created_by?: string;
}

// Time range for schedule (HH:MM format)
export interface SponsorTimeRange {
  start: string; // HH:MM format (e.g., "09:00")
  end: string;   // HH:MM format (e.g., "17:00")
}

// Schedule conflict information
export interface ScheduleConflict {
  conflictingScheduleId: string;
  conflictingScheduleName: string;
  conflictingMediaName: string;
  overlapStart: string;
  overlapEnd: string;
  date?: string;
}

// Main sponsor schedule entry
export interface SponsorSchedule {
  id: string;
  channel_ids: string[];     // Array of channel IDs this schedule applies to
  media_id: string;          // Foreign key to media_assets (from Novadevgrig)
  name: string;              // Display name for this schedule entry

  // Schedule configuration (similar to item/bucket/playlist)
  start_date?: string;       // ISO date string - when schedule starts
  end_date?: string;         // ISO date string - when schedule ends
  time_ranges: SponsorTimeRange[]; // Multiple time ranges per day
  days_of_week: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };

  // Status
  active: boolean;
  priority: number;          // Higher priority overrides lower. Priority 0 with no schedule restrictions acts as fallback.
  category?: string;         // Category for filtering (e.g., "ticker", "banner", "fullscreen")

  // Metadata
  user_id?: string;
  created_at?: string;
  updated_at?: string;

  // Joined data (populated when fetched)
  media?: MediaAsset;
  channel_names?: string[];  // Names of channels this applies to
}

// Default days of week (all false)
export const DEFAULT_DAYS_OF_WEEK = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false
};

// Empty schedule template
export const EMPTY_SPONSOR_SCHEDULE: Omit<SponsorSchedule, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  channel_ids: [],
  media_id: '',
  name: '',
  start_date: '',
  end_date: '',
  time_ranges: [{ start: '', end: '' }],
  days_of_week: { ...DEFAULT_DAYS_OF_WEEK },
  active: true,
  priority: 0,
  category: ''
};

// Form data for creating/editing schedules
export interface SponsorScheduleFormData {
  channel_ids: string[];
  media_id: string;
  name: string;
  start_date: string;
  end_date: string;
  time_ranges: SponsorTimeRange[];
  days_of_week: SponsorSchedule['days_of_week'];
  active: boolean;
  priority: number;
  category: string;
}

// Fixed sponsor categories - each category can have its own default sponsor per channel
export const SPONSOR_CATEGORIES = [
  { value: '', label: 'General', description: 'General sponsor (no specific category)' },
  { value: 'school_closings', label: 'School Closings', description: 'Sponsor for school closings ticker' },
  { value: 'elections', label: 'Elections', description: 'Sponsor for elections coverage' },
  { value: 'weather', label: 'Weather', description: 'Sponsor for weather content' },
  { value: 'sports', label: 'Sports', description: 'Sponsor for sports content' },
  { value: 'news', label: 'News', description: 'Sponsor for news content' },
  { value: 'finance', label: 'Finance', description: 'Sponsor for finance/stocks content' },
  { value: 'traffic', label: 'Traffic', description: 'Sponsor for traffic content' }
] as const;

export type SponsorCategory = typeof SPONSOR_CATEGORIES[number]['value'];

// Filter options for the schedule list
export interface SponsorScheduleFilters {
  channel_id?: string;
  active?: boolean;
  search?: string;
  date_from?: string;
  date_to?: string;
}

// API response types
export interface SponsorScheduleResponse {
  data: SponsorSchedule[];
  count: number;
}

// Validation result
export interface ScheduleValidationResult {
  isValid: boolean;
  errors: string[];
  conflicts: ScheduleConflict[];
}

// Helper function to check if a time range is overnight (spans midnight)
export const isOvernightRange = (start: string, end: string): boolean => {
  if (!start || !end) return false;
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;
  return startTotal > endTotal;
};

// Helper function to format time range for display
export const formatTimeRange = (range: SponsorTimeRange): string => {
  if (!range.start && !range.end) return 'All Day';
  if (!range.start || !range.end) return 'Invalid';

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
  };

  const overnight = isOvernightRange(range.start, range.end);
  return `${formatTime(range.start)} - ${formatTime(range.end)}${overnight ? ' (overnight)' : ''}`;
};

// Helper function to format days of week for display
export const formatDaysOfWeek = (days: SponsorSchedule['days_of_week']): string => {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayKeys: (keyof typeof days)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const selectedDays = dayKeys
    .filter(key => days[key])
    .map((_, idx) => dayNames[idx]);

  if (selectedDays.length === 0) return 'Every Day';
  if (selectedDays.length === 7) return 'Every Day';
  if (selectedDays.length === 5 && !days.saturday && !days.sunday) return 'Weekdays';
  if (selectedDays.length === 2 && days.saturday && days.sunday) return 'Weekends';

  return selectedDays.join(', ');
};

// Helper function to check if schedule is currently active
export const isScheduleActiveNow = (schedule: SponsorSchedule): boolean => {
  const now = new Date();

  // Check date range
  if (schedule.start_date) {
    const startDate = new Date(schedule.start_date);
    if (now < startDate) return false;
  }
  if (schedule.end_date) {
    const endDate = new Date(schedule.end_date);
    if (now > endDate) return false;
  }

  // Check day of week
  const dayMap: (keyof typeof schedule.days_of_week)[] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];
  const todayKey = dayMap[now.getDay()];
  const anyDaySelected = Object.values(schedule.days_of_week).some(v => v);
  if (anyDaySelected && !schedule.days_of_week[todayKey]) return false;

  // Check time ranges
  if (schedule.time_ranges.length === 0) return true;
  const hasValidTimeRange = schedule.time_ranges.some(range => range.start && range.end);
  if (!hasValidTimeRange) return true;

  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return schedule.time_ranges.some(range => {
    if (!range.start || !range.end) return true;

    if (isOvernightRange(range.start, range.end)) {
      // Overnight: active if current time >= start OR current time <= end
      return currentTime >= range.start || currentTime <= range.end;
    } else {
      // Normal: active if current time is within range
      return currentTime >= range.start && currentTime <= range.end;
    }
  });
};
