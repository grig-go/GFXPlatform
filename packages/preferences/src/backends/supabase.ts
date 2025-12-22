import type { SupabaseClient } from '@supabase/supabase-js';
import type { PreferenceBackend } from '../types';

/**
 * Supabase backend for preferences
 * Stores preferences in pulsar_user_preferences table
 */
export function createSupabaseBackend(
  supabase: SupabaseClient,
  userId: string,
  tableName: string = 'pulsar_user_preferences'
): PreferenceBackend {
  // Debounce mechanism to prevent rapid saves
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingUpdates: Record<string, unknown> = {};
  let lastSaveTime = 0;
  const DEBOUNCE_MS = 500;
  const MIN_SAVE_INTERVAL_MS = 1000;

  const flushPendingUpdates = async () => {
    if (Object.keys(pendingUpdates).length === 0) return;

    const updates = { ...pendingUpdates };
    pendingUpdates = {};

    try {
      // First try to get existing record
      const { data: existing } = await supabase
        .from(tableName)
        .select('id, preferences')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Merge with existing preferences
        const mergedPrefs = { ...(existing.preferences || {}), ...updates };
        await supabase
          .from(tableName)
          .update({ preferences: mergedPrefs, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // Create new record
        await supabase
          .from(tableName)
          .insert({
            user_id: userId,
            preferences: updates,
          });
      }

      lastSaveTime = Date.now();
    } catch (e) {
      console.warn('Failed to save preferences to Supabase:', e);
      // Re-queue failed updates
      pendingUpdates = { ...updates, ...pendingUpdates };
    }
  };

  const scheduleSave = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Check if we should wait longer due to recent save
    const timeSinceLastSave = Date.now() - lastSaveTime;
    const delay = timeSinceLastSave < MIN_SAVE_INTERVAL_MS
      ? MIN_SAVE_INTERVAL_MS - timeSinceLastSave + DEBOUNCE_MS
      : DEBOUNCE_MS;

    saveTimeout = setTimeout(flushPendingUpdates, delay);
  };

  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('preferences')
          .eq('user_id', userId)
          .single();

        if (error || !data) return null;

        const prefs = data.preferences as Record<string, unknown>;
        return (prefs?.[key] as T) ?? null;
      } catch (e) {
        console.warn(`Failed to get preference ${key} from Supabase:`, e);
        return null;
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      // Queue the update
      pendingUpdates[key] = value;
      scheduleSave();
    },

    async remove(key: string): Promise<void> {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('id, preferences')
          .eq('user_id', userId)
          .single();

        if (error || !data) return;

        const prefs = { ...(data.preferences as Record<string, unknown> || {}) };
        delete prefs[key];

        await supabase
          .from(tableName)
          .update({ preferences: prefs, updated_at: new Date().toISOString() })
          .eq('id', data.id);
      } catch (e) {
        console.warn(`Failed to remove preference ${key} from Supabase:`, e);
      }
    },

    async getAll(): Promise<Record<string, unknown>> {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('preferences')
          .eq('user_id', userId)
          .single();

        if (error || !data) return {};

        return (data.preferences as Record<string, unknown>) || {};
      } catch (e) {
        console.warn('Failed to get all preferences from Supabase:', e);
        return {};
      }
    },
  };
}
