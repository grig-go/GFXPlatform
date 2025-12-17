/**
 * usePageSettings Hook
 *
 * Fetches and manages page visibility settings from the database.
 * Used to hide/show pages based on admin configuration.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import type { PageSetting, AppKey } from '../types/permissions';

interface UsePageSettingsReturn {
  pageSettings: PageSetting[];
  isLoading: boolean;
  error: string | null;
  isPageVisible: (pageKey: string) => boolean;
  refreshSettings: () => Promise<void>;
}

export function usePageSettings(appKey: AppKey = 'nova'): UsePageSettingsReturn {
  const [pageSettings, setPageSettings] = useState<PageSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('u_page_settings')
        .select('*')
        .eq('app_key', appKey);

      if (fetchError) {
        console.error('Error fetching page settings:', fetchError);
        setError(fetchError.message);
        return;
      }

      setPageSettings(data || []);
    } catch (err) {
      console.error('Error in usePageSettings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [appKey]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const isPageVisible = useCallback((pageKey: string): boolean => {
    // If still loading or error, default to visible
    if (isLoading || error) return true;

    // Find the page setting
    const setting = pageSettings.find(p => p.page_key === pageKey);

    // If no setting found, default to visible
    if (!setting) return true;

    return setting.is_visible;
  }, [pageSettings, isLoading, error]);

  return {
    pageSettings,
    isLoading,
    error,
    isPageVisible,
    refreshSettings: fetchSettings,
  };
}

// Hook to update page visibility (admin only)
export function useUpdatePageSetting() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePageVisibility = useCallback(async (
    pageKey: string,
    appKey: AppKey,
    isVisible: boolean
  ): Promise<boolean> => {
    try {
      setIsUpdating(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('u_page_settings')
        .update({
          is_visible: isVisible,
          updated_at: new Date().toISOString(),
        })
        .eq('page_key', pageKey)
        .eq('app_key', appKey);

      if (updateError) {
        console.error('Error updating page setting:', updateError);
        setError(updateError.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in updatePageVisibility:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    updatePageVisibility,
    isUpdating,
    error,
  };
}
