import { useState, useEffect } from "react";
import { getRestUrl, getAccessToken } from "./supabase/config";

export interface SchoolClosingsDataStats {
  activeClosings: number;
  loading: boolean;
  error: string | null;
}

export function useSchoolClosingsData() {
  const [stats, setStats] = useState<SchoolClosingsDataStats>({
    activeClosings: 0,
    loading: true,
    error: null,
  });

  const fetchSchoolClosingsData = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }));

      // Fetch all school closings from the database
      const token = await getAccessToken();
      const response = await fetch(
        getRestUrl('school_closings?select=id,status_day'),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("School closings fetch failed:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const closings = await response.json();

      // Count active closings (those with non-null status_day)
      const activeClosings = closings.filter((closing: any) => 
        closing.status_day && closing.status_day.trim() !== ''
      ).length;

      setStats({
        activeClosings,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching school closings data:", error);
      setStats({
        activeClosings: 0,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  useEffect(() => {
    fetchSchoolClosingsData();

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchSchoolClosingsData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { stats, refresh: fetchSchoolClosingsData };
}
