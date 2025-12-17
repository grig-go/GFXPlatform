import { supabase } from './client';

export interface SchoolClosing {
  id: string;
  provider_id: string | null;
  region_id: string | null;
  region_name: string | null;
  state: string | null;
  city: string | null;
  county_name: string | null;
  organization_name: string | null;
  status_day: string | null;
  status_description: string | null;
  notes: string | null;
  source_format: string | null;
  fetched_at: string | null;
  updated_time: string | null;
  source_url: string | null;
  raw_data: any;
  type: string | null;
  is_manual: boolean | null;
  zone_id: string | null;
}

export interface SchoolClosingsFilter {
  region_id?: string;
  zone_id?: string;
}

/**
 * Fetch school closings with optional filters
 */
export const getSchoolClosings = async (
  filters?: SchoolClosingsFilter
): Promise<SchoolClosing[]> => {
  let query = supabase
    .from('school_closings')
    .select('*')
    .order('fetched_at', { ascending: false });

  // Apply filters if provided
  if (filters?.region_id) {
    query = query.eq('region_id', filters.region_id);
  }

  if (filters?.zone_id) {
    query = query.eq('zone_id', filters.zone_id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * Get a single school closing by ID
 */
export const getSchoolClosing = async (id: string): Promise<SchoolClosing> => {
  const { data, error } = await supabase
    .from('school_closings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};
