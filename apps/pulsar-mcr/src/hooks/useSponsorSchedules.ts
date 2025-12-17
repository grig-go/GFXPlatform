import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  SponsorSchedule,
  SponsorScheduleFormData,
  SponsorScheduleFilters,
  ScheduleConflict,
  ScheduleValidationResult,
  SponsorTimeRange,
  MediaAsset,
  MediaType,
  isOvernightRange
} from '../types/sponsor';

// Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MEDIA_LIBRARY_URL = `${SUPABASE_URL}/functions/v1/media-library`;

// Fetch media assets by IDs
const fetchMediaAssets = async (mediaIds: string[]): Promise<Map<string, MediaAsset>> => {
  const mediaMap = new Map<string, MediaAsset>();
  if (mediaIds.length === 0) return mediaMap;

  try {
    const uniqueIds = [...new Set(mediaIds)];

    // Fetch all media from the API (it returns a list)
    // We request a high limit to ensure we get all needed assets
    const response = await fetch(`${MEDIA_LIBRARY_URL}?limit=100`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      // result.data is an array of media assets
      const allAssets = result.data || [];

      // Helper to construct storage URL from path
      const getStorageUrl = (storagePath: string | null) => {
        if (!storagePath) return null;
        return `${SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`;
      };

      // Helper to check if URL contains internal Docker addresses
      const isInternalUrl = (url: string | null) => {
        if (!url) return false;
        return url.includes('kong:8000') ||
               url.includes('supabase_kong') ||
               url.includes('supabase_edge_runtime');
      };

      // Filter to only the IDs we need and transform to our MediaAsset type
      for (const asset of allAssets) {
        if (uniqueIds.includes(asset.id)) {
          // Use storage_path to construct URL if file_url contains internal Docker addresses
          const fileUrl = (asset.file_url && !isInternalUrl(asset.file_url))
            ? asset.file_url
            : getStorageUrl(asset.storage_path);

          const thumbnailUrl = (asset.thumbnail_url && !isInternalUrl(asset.thumbnail_url))
            ? asset.thumbnail_url
            : fileUrl;

          const mediaAsset: MediaAsset = {
            id: asset.id,
            name: asset.name || asset.file_name,
            description: asset.description,
            file_url: fileUrl,
            thumbnail_url: thumbnailUrl,
            media_type: asset.media_type as MediaType,
            file_size: asset.size,
            tags: asset.tags || [],
            created_at: asset.created_at,
            created_by: asset.created_by
          };
          mediaMap.set(asset.id, mediaAsset);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching media assets:', err);
  }

  return mediaMap;
};

// Get the current user's ID
const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

// Helper to convert time string to minutes for comparison
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to check if two time ranges overlap (handles overnight ranges)
const timeRangesOverlap = (
  range1: SponsorTimeRange,
  range2: SponsorTimeRange
): boolean => {
  if (!range1.start || !range1.end || !range2.start || !range2.end) {
    return false;
  }

  const r1Start = timeToMinutes(range1.start);
  const r1End = timeToMinutes(range1.end);
  const r2Start = timeToMinutes(range2.start);
  const r2End = timeToMinutes(range2.end);

  const r1Overnight = isOvernightRange(range1.start, range1.end);
  const r2Overnight = isOvernightRange(range2.start, range2.end);

  // Both normal ranges
  if (!r1Overnight && !r2Overnight) {
    return r1Start < r2End && r2Start < r1End;
  }

  // Both overnight ranges - always overlap (they both span midnight)
  if (r1Overnight && r2Overnight) {
    return true;
  }

  // One overnight, one normal
  const overnight = r1Overnight ? { start: r1Start, end: r1End } : { start: r2Start, end: r2End };
  const normal = r1Overnight ? { start: r2Start, end: r2End } : { start: r1Start, end: r1End };

  // Overnight range is essentially two ranges: [start, 24:00) and [00:00, end]
  // Check if normal range overlaps with either part
  return (normal.start < 1440 && overnight.start < normal.end) || // Overlap with [start, 24:00)
         (normal.start < overnight.end); // Overlap with [00:00, end]
};

// Check if two schedules overlap on days
const daysOverlap = (
  days1: SponsorSchedule['days_of_week'],
  days2: SponsorSchedule['days_of_week']
): boolean => {
  const anyDays1Selected = Object.values(days1).some(v => v);
  const anyDays2Selected = Object.values(days2).some(v => v);

  // If either has no days selected, treat as "all days"
  if (!anyDays1Selected || !anyDays2Selected) return true;

  // Check for common days
  return (
    (days1.monday && days2.monday) ||
    (days1.tuesday && days2.tuesday) ||
    (days1.wednesday && days2.wednesday) ||
    (days1.thursday && days2.thursday) ||
    (days1.friday && days2.friday) ||
    (days1.saturday && days2.saturday) ||
    (days1.sunday && days2.sunday)
  );
};

// Check if two date ranges overlap
const dateRangesOverlap = (
  start1: string | undefined,
  end1: string | undefined,
  start2: string | undefined,
  end2: string | undefined
): boolean => {
  // If no dates specified, treat as "always"
  const s1 = start1 ? new Date(start1).getTime() : -Infinity;
  const e1 = end1 ? new Date(end1).getTime() : Infinity;
  const s2 = start2 ? new Date(start2).getTime() : -Infinity;
  const e2 = end2 ? new Date(end2).getTime() : Infinity;

  return s1 <= e2 && s2 <= e1;
};

export interface UseSponsorSchedulesReturn {
  schedules: SponsorSchedule[];
  loading: boolean;
  error: string | null;

  // CRUD operations
  fetchSchedules: (filters?: SponsorScheduleFilters) => Promise<void>;
  createSchedule: (data: SponsorScheduleFormData) => Promise<SponsorSchedule>;
  updateSchedule: (id: string, data: Partial<SponsorScheduleFormData>) => Promise<SponsorSchedule>;
  deleteSchedule: (id: string) => Promise<void>;
  deleteSchedules: (ids: string[]) => Promise<void>;

  // Validation
  validateSchedule: (
    data: SponsorScheduleFormData,
    excludeId?: string
  ) => Promise<ScheduleValidationResult>;

  // Conflict detection (only within the same category)
  findConflicts: (
    channelIds: string[],
    timeRanges: SponsorTimeRange[],
    daysOfWeek: SponsorSchedule['days_of_week'],
    startDate?: string,
    endDate?: string,
    excludeId?: string,
    category?: string
  ) => ScheduleConflict[];

  // Get schedules for a specific channel
  getSchedulesForChannel: (channelId: string) => SponsorSchedule[];

  // Refresh
  refresh: () => Promise<void>;
}

export const useSponsorSchedules = (): UseSponsorSchedulesReturn => {
  const [schedules, setSchedules] = useState<SponsorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async (filters?: SponsorScheduleFilters) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSchedules([]);
        setError('Please log in to view sponsor schedules');
        return;
      }

      let query = supabase
        .from('sponsor_schedules')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply filters - for channel_id filter, check if it's in the channel_ids array
      if (filters?.channel_id) {
        query = query.contains('channel_ids', [filters.channel_id]);
      }
      if (filters?.active !== undefined) {
        query = query.eq('active', filters.active);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      if (filters?.date_from) {
        query = query.gte('start_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('end_date', filters.date_to);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching sponsor schedules:', fetchError);
        throw fetchError;
      }

      // Helper to convert ISO timestamp to datetime-local format (YYYY-MM-DDTHH:mm)
      const toDateTimeLocal = (isoString: string | null | undefined): string => {
        if (!isoString) return '';
        try {
          const date = new Date(isoString);
          if (isNaN(date.getTime())) return '';
          // Format as YYYY-MM-DDTHH:mm in local time
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch {
          return '';
        }
      };

      // Transform data to ensure JSON fields are parsed
      const transformedData = (data || []).map((schedule: any) => ({
        ...schedule,
        // Convert ISO timestamps to datetime-local format for form inputs
        start_date: toDateTimeLocal(schedule.start_date),
        end_date: toDateTimeLocal(schedule.end_date),
        // Ensure channel_ids is an array
        channel_ids: Array.isArray(schedule.channel_ids)
          ? schedule.channel_ids
          : typeof schedule.channel_ids === 'string'
            ? JSON.parse(schedule.channel_ids)
            : [],
        // Ensure JSON fields are parsed
        time_ranges: typeof schedule.time_ranges === 'string'
          ? JSON.parse(schedule.time_ranges)
          : schedule.time_ranges || [],
        days_of_week: typeof schedule.days_of_week === 'string'
          ? JSON.parse(schedule.days_of_week)
          : schedule.days_of_week || {
              monday: false,
              tuesday: false,
              wednesday: false,
              thursday: false,
              friday: false,
              saturday: false,
              sunday: false
            }
      }));

      // Fetch media assets
      const mediaIds = transformedData
        .map((s: any) => s.media_id)
        .filter((id: string) => id);
      const mediaMap = await fetchMediaAssets(mediaIds);

      // Attach media to schedules
      const schedulesWithMedia = transformedData.map((schedule: any) => ({
        ...schedule,
        media: mediaMap.get(schedule.media_id)
      }));

      setSchedules(schedulesWithMedia);
    } catch (err) {
      console.error('Error in fetchSchedules:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSchedule = useCallback(async (data: SponsorScheduleFormData): Promise<SponsorSchedule> => {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to create sponsor schedules');
    }

    // Helper to convert datetime-local string to ISO string preserving local time intent
    // datetime-local gives us "2024-12-01T00:00" which we interpret as local time
    const toISOString = (dateTimeLocal: string | null | undefined): string | null => {
      if (!dateTimeLocal) return null;
      try {
        // Parse as local time and convert to ISO string
        const date = new Date(dateTimeLocal);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      } catch {
        return null;
      }
    };

    // Prepare insert data - convert empty strings to null for timestamp fields
    const insertData = {
      ...data,
      user_id: userId,
      start_date: toISOString(data.start_date),
      end_date: toISOString(data.end_date),
      time_ranges: JSON.stringify(data.time_ranges),
      days_of_week: JSON.stringify(data.days_of_week)
    };

    const { data: newSchedule, error: createError } = await supabase
      .from('sponsor_schedules')
      .insert([insertData])
      .select()
      .single();

    if (createError) {
      console.error('Error creating sponsor schedule:', createError);
      throw createError;
    }

    // Refresh the list
    await fetchSchedules();

    return newSchedule;
  }, [fetchSchedules]);

  const updateSchedule = useCallback(async (
    id: string,
    data: Partial<SponsorScheduleFormData>
  ): Promise<SponsorSchedule> => {
    // Helper to convert datetime-local string to ISO string preserving local time intent
    const toISOString = (dateTimeLocal: string | null | undefined): string | null => {
      if (!dateTimeLocal) return null;
      try {
        const date = new Date(dateTimeLocal);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      } catch {
        return null;
      }
    };

    const updateData: any = { ...data };

    // Convert datetime-local strings to ISO format for timestamp fields
    if ('start_date' in data) {
      updateData.start_date = toISOString(data.start_date);
    }
    if ('end_date' in data) {
      updateData.end_date = toISOString(data.end_date);
    }

    // Convert JSON fields to strings for storage
    if (data.time_ranges) {
      updateData.time_ranges = JSON.stringify(data.time_ranges);
    }
    if (data.days_of_week) {
      updateData.days_of_week = JSON.stringify(data.days_of_week);
    }

    const { data: updatedSchedule, error: updateError } = await supabase
      .from('sponsor_schedules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating sponsor schedule:', updateError);
      throw updateError;
    }

    // Parse JSON fields from the response
    const parsedSchedule = {
      ...updatedSchedule,
      time_ranges: typeof updatedSchedule.time_ranges === 'string'
        ? JSON.parse(updatedSchedule.time_ranges)
        : updatedSchedule.time_ranges || [],
      days_of_week: typeof updatedSchedule.days_of_week === 'string'
        ? JSON.parse(updatedSchedule.days_of_week)
        : updatedSchedule.days_of_week
    };

    // Update local state - refresh to ensure we have latest state after default changes
    await fetchSchedules();

    return parsedSchedule;
  }, [fetchSchedules]);

  const deleteSchedule = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('sponsor_schedules')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting sponsor schedule:', deleteError);
      throw deleteError;
    }

    // Refresh the list
    await fetchSchedules();
  }, [fetchSchedules]);

  const deleteSchedules = useCallback(async (ids: string[]): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('sponsor_schedules')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error('Error deleting sponsor schedules:', deleteError);
      throw deleteError;
    }

    // Refresh the list
    await fetchSchedules();
  }, [fetchSchedules]);

  const findConflicts = useCallback((
    channelIds: string[],
    timeRanges: SponsorTimeRange[],
    daysOfWeek: SponsorSchedule['days_of_week'],
    startDate?: string,
    endDate?: string,
    excludeId?: string,
    category?: string
  ): ScheduleConflict[] => {
    const conflicts: ScheduleConflict[] = [];

    // Normalize category - empty string and undefined/null are all "General"
    const normalizedCategory = category || '';

    // Get schedules that share at least one channel with the given channel_ids
    // AND are in the same category (schedules only conflict within the same category)
    const channelSchedules = schedules.filter(
      s => s.id !== excludeId &&
           s.active &&
           s.channel_ids.some(cId => channelIds.includes(cId)) &&
           (s.category || '') === normalizedCategory
    );

    for (const existing of channelSchedules) {
      // Check date overlap
      if (!dateRangesOverlap(startDate, endDate, existing.start_date, existing.end_date)) {
        continue;
      }

      // Check day overlap
      if (!daysOverlap(daysOfWeek, existing.days_of_week)) {
        continue;
      }

      // Check time overlap
      for (const newRange of timeRanges) {
        if (!newRange.start || !newRange.end) continue;

        for (const existingRange of existing.time_ranges) {
          if (!existingRange.start || !existingRange.end) continue;

          if (timeRangesOverlap(newRange, existingRange)) {
            conflicts.push({
              conflictingScheduleId: existing.id,
              conflictingScheduleName: existing.name,
              conflictingMediaName: existing.media?.name || 'Unknown',
              overlapStart: existingRange.start,
              overlapEnd: existingRange.end
            });
          }
        }
      }

      // If no time ranges specified, entire day conflicts
      const hasValidNewRanges = timeRanges.some(r => r.start && r.end);
      const hasValidExistingRanges = existing.time_ranges.some(r => r.start && r.end);

      if (!hasValidNewRanges || !hasValidExistingRanges) {
        // At least one covers all day - they conflict
        if (!conflicts.some(c => c.conflictingScheduleId === existing.id)) {
          conflicts.push({
            conflictingScheduleId: existing.id,
            conflictingScheduleName: existing.name,
            conflictingMediaName: existing.media?.name || 'Unknown',
            overlapStart: 'All Day',
            overlapEnd: 'All Day'
          });
        }
      }
    }

    return conflicts;
  }, [schedules]);

  const validateSchedule = useCallback(async (
    data: SponsorScheduleFormData,
    excludeId?: string
  ): Promise<ScheduleValidationResult> => {
    const errors: string[] = [];

    // Basic validation
    if (!data.channel_ids || data.channel_ids.length === 0) {
      errors.push('At least one channel is required');
    }
    if (!data.media_id) {
      errors.push('Media is required');
    }
    if (!data.name?.trim()) {
      errors.push('Name is required');
    }

    // Date validation
    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      if (start > end) {
        errors.push('End date must be after start date');
      }
    }

    // Time range validation
    for (const range of data.time_ranges) {
      if ((range.start && !range.end) || (!range.start && range.end)) {
        errors.push('Both start and end time must be specified for time ranges');
      }
    }

    // Find conflicts (only within the same category)
    const conflicts = findConflicts(
      data.channel_ids,
      data.time_ranges,
      data.days_of_week,
      data.start_date,
      data.end_date,
      excludeId,
      data.category
    );

    return {
      isValid: errors.length === 0,
      errors,
      conflicts
    };
  }, [findConflicts]);

  const getSchedulesForChannel = useCallback((channelId: string): SponsorSchedule[] => {
    return schedules.filter(s => s.channel_ids.includes(channelId));
  }, [schedules]);

  const refresh = useCallback(async () => {
    await fetchSchedules();
  }, [fetchSchedules]);

  // Initial fetch
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchSchedules();
      } else if (event === 'SIGNED_OUT') {
        setSchedules([]);
        setError('You must be logged in to view sponsor schedules');
      }
    });

    fetchSchedules();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchSchedules]);

  return {
    schedules,
    loading,
    error,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    deleteSchedules,
    validateSchedule,
    findConflicts,
    getSchedulesForChannel,
    refresh
  };
};
