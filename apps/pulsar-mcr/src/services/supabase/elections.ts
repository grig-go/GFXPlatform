import { supabase } from '../../lib/supabase';

export interface ElectionRace {
  id: string;
  region_id: string | null;
  race_id: string | null;
  race_type: string | null;
  title: string | null;
  subtitle: string | null;
  precincts_reporting: number | null;
  precincts_total: number | null;
  precincts_percent: number | null;
  candidates: ElectionCandidate[] | null;
  last_updated: string | null;
  source: string | null;
  raw_data: any;
}

export interface ElectionCandidate {
  name: string;
  party: string | null;
  votes: number;
  vote_percent: number | null;
  is_winner: boolean;
  is_incumbent: boolean;
}

export interface ElectionFilter {
  region_id?: string;
  race_type?: string;
}

/**
 * Fetch election races with optional filters
 */
export const getElectionRaces = async (
  filters?: ElectionFilter
): Promise<ElectionRace[]> => {
  let query = supabase
    .from('election_races')
    .select('*')
    .order('last_updated', { ascending: false });

  // Apply filters if provided
  if (filters?.region_id) {
    query = query.eq('region_id', filters.region_id);
  }

  if (filters?.race_type) {
    query = query.eq('race_type', filters.race_type);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * Get a single election race by ID
 */
export const getElectionRace = async (id: string): Promise<ElectionRace> => {
  const { data, error } = await supabase
    .from('election_races')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Get available regions for elections
 */
export const getElectionRegions = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('election_races')
    .select('region_id')
    .not('region_id', 'is', null);

  if (error) {
    throw error;
  }

  // Get unique region IDs
  const uniqueRegions = [...new Set(data?.map(d => d.region_id).filter(Boolean))] as string[];
  return uniqueRegions.sort();
};
