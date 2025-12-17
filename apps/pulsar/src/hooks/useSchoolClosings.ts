import { useState, useCallback } from 'react';
import {
  getSchoolClosings,
  SchoolClosing,
  SchoolClosingsFilter
} from '../services/supabase/schoolClosings';

/**
 * Custom hook for managing school closings data
 */
export const useSchoolClosings = () => {
  const [schoolClosings, setSchoolClosings] = useState<SchoolClosing[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch school closings with optional filters
  const fetchSchoolClosings = useCallback(async (filters?: SchoolClosingsFilter) => {
    setLoading(true);
    setError(null);

    try {
      const closings = await getSchoolClosings(filters);
      setSchoolClosings(closings);
      return closings;
    } catch (err) {
      console.error('Error fetching school closings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load school closings';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    schoolClosings,
    loading,
    error,
    fetchSchoolClosings
  };
};
