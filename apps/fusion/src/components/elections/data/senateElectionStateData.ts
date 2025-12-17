import { supabase } from '../../../supabaseClient';

export interface SenateCandidateResult {
  votes: number;
  percent: number;
  winner: boolean;
}

export interface SenateStateResult {
  [candidateId: string]: SenateCandidateResult | string | number | undefined;
  percent_reporting?: number;
}

export interface SenatePartyInfo {
  name: string;
  color: string;
}

export interface SenateCandidateInfo {
  name: string;
  party_code: string;
  party_name?: string;
  img?: string;
}

export interface SenateElectionData {
  year: number;
  description: string;
  candidates: { [candidateId: string]: SenateCandidateInfo };
  parties: { [partyCode: string]: SenatePartyInfo };
  results: { [stateCode: string]: SenateStateResult };
}

// Cache structure
interface CacheEntry {
  data: SenateElectionData;
  hash: string;
}

class SenateElectionCache {
  private cache: Map<number, CacheEntry> = new Map();

  private generateHash(data: any): string {
    return JSON.stringify(data);
  }

  get(year: number): SenateElectionData | null {
    const entry = this.cache.get(year);
    return entry?.data || null;
  }

  set(year: number, data: SenateElectionData): void {
    const hash = this.generateHash(data);
    this.cache.set(year, { data, hash });
  }

  shouldUpdate(year: number, newData: any): boolean {
    const entry = this.cache.get(year);
    if (!entry) return true;
    
    const newHash = this.generateHash(newData);
    return entry.hash !== newHash;
  }

  clear(year?: number): void {
    if (year) {
      this.cache.delete(year);
    } else {
      this.cache.clear();
    }
  }
}

// Create cache instance
export const senateCache = new SenateElectionCache();

// Default colors for parties
const DEFAULT_PARTY_COLORS: Record<string, string> = {
  GOP: '#DC2626',
  Dem: '#2563EB'
};

const DEFAULT_COLOR = '#9CA3AF';

// Database query interface
interface SupabaseElectionRow {
  year: number;
  election_name: string;
  state_code: string;
  party_code: string;
  party_name: string;
  color_hex: string | null;
  candidate_id: string;
  full_name: string;
  photo_url: string | null;
  votes: number;
  vote_percentage: number;
  winner: boolean;
  percent_reporting: number;
}

// Fetch senate data from Supabase
// Fetch presidential data from Supabase using RPC
export async function fetchSenateDataFromSupabase(year: number): Promise<SenateElectionData | null> {
  try {
    console.log(`Fetching senate state data for year ${year}...`);
    
    // Use RPC to call the function with extended timeout
    const { data, error } = await supabase
      .rpc('fetch_senate_state_data_extended', {
        p_year: year
      });

    if (error) {
      console.error('Error fetching senate data:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`No senate election data found for year ${year}`);
      return null;
    }

    console.log(`✓ Fetched ${data.length} senate state records`);

    // Transform the flat data to your format
    // Data is already sorted by the database function
    const rows: SupabaseElectionRow[] = data.map((item: any) => ({
      year: item.election_year,
      election_name: item.election_name,
      state_code: item.state_code,
      party_code: item.party_abbreviation,
      party_name: item.party_name,
      color_hex: item.color_hex,
      candidate_id: item.candidate_id,
      full_name: item.full_name,
      photo_url: item.photo_url,
      votes: item.votes,
      vote_percentage: item.vote_percentage,
      winner: item.winner,
      percent_reporting: item.percent_reporting || 0
    }));

    return transformSupabaseDataToElectionData(rows);
  } catch (error) {
    console.error('Error in fetchPresidentialDataFromSupabase:', error);
    return null;
  }
}

/*export async function fetchSenateDataFromSupabase(year: number): Promise<SenateElectionData | null> {
  try {
    // Query from e_candidate_results as the main table
    const { data, error } = await supabase
      .from('e_candidate_results_effective')
      .select(`
        votes,
        vote_percentage,
        winner,
        e_candidates!inner (
          id,
          full_name,
          photo_url,
          e_parties!inner (
            abbreviation,
            name,
            color_hex
          )
        ),
        e_race_results_effective!inner (
          e_races!inner (
            metadata,
            type,
            e_geographic_divisions!inner (
              code,
              type,
              name
            ),
            e_elections!inner (
              year,
              name
            )
          )
        )
      `)
      .eq('e_race_results_effective.e_races.type', 'senate')
      .eq('e_race_results_effective.e_races.e_elections.year', year)
      .eq('e_race_results_effective.e_races.e_geographic_divisions.type', 'state')
      //.in('e_candidates.e_parties.abbreviation', ['GOP', 'Dem']);

    if (error) {
      console.error('Error fetching senate data:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`No senate election data found for year ${year}`);
      return null;
    }

    // Sort the data in JavaScript after fetching
    const sortedData = data.sort((a: any, b: any) => {
      // First sort by state code
      const stateA = a.e_race_results_effective.e_races.e_geographic_divisions.code;
      const stateB = b.e_race_results_effective.e_races.e_geographic_divisions.code;
      const stateCompare = stateA.localeCompare(stateB);
      if (stateCompare !== 0) return stateCompare;
      
      // Then sort by votes descending within each state
      return b.votes - a.votes;
    });

    // Transform the nested data structure to flat rows
    const rows: SupabaseElectionRow[] = sortedData.map((item: any) => ({
      year: item.e_race_results_effective.e_races.e_elections.year,
      election_name: item.e_race_results_effective.e_races.e_elections.name,
      state_code: item.e_race_results_effective.e_races.e_geographic_divisions.code,
      party_code: item.e_candidates.e_parties.abbreviation,
      party_name: item.e_candidates.e_parties.name,
      color_hex: item.e_candidates.e_parties.color_hex,
      candidate_id: item.e_candidates.id,
      full_name: item.e_candidates.full_name,
      photo_url: item.e_candidates.photo_url,
      votes: item.votes,
      vote_percentage: item.vote_percentage,
      winner: item.winner,
    }));

    return transformSupabaseDataToElectionData(rows);
  } catch (error) {
    console.error('Error in fetchSenateDataFromSupabase:', error);
    return null;
  }
}*/

// Transform Supabase data to match the SenateElectionData interface
function transformSupabaseDataToElectionData(rows: SupabaseElectionRow[]): SenateElectionData | null {
  if (!rows || rows.length === 0) return null;

  const firstRow = rows[0];
  const candidates: { [candidateId: string]: SenateCandidateInfo } = {};
  const parties: { [partyCode: string]: SenatePartyInfo } = {};
  const results: { [stateCode: string]: SenateStateResult } = {};

  console.log('transformSupabaseDataToElectionDataaaaaa')
  console.log(rows);
  
  // Process each row
  rows.forEach(row => {
    const candidateId = row.candidate_id;
    const stateCode = row.state_code;
    const partyCode = row.party_code;

    // Build candidates map
    if (!candidates[candidateId]) {
      candidates[candidateId] = {
        name: row.full_name,
        party_code: partyCode,
        party_name: row.party_name,
        img: row.photo_url || undefined
      };
    }

    // Build parties map with colors
    if (!parties[partyCode]) {
      parties[partyCode] = {
        name: row.party_name,
        color: row.color_hex || DEFAULT_PARTY_COLORS[partyCode] || DEFAULT_COLOR
      };
    }

    // Build results map
    if (!results[stateCode]) {
      results[stateCode] = {
        percent_reporting: row.percent_reporting || 0
      };
    }

    // Add candidate result to state
    results[stateCode][candidateId] = {
      votes: row.votes,
      percent: row.vote_percentage,
      winner: row.winner
    };
  });

  return {
    year: firstRow.year,
    description: firstRow.election_name || `Senate Election ${firstRow.year}`,
    candidates,
    parties,
    results
  };
}

// Main function to get Senate election data with caching
export async function getSenateElectionData(year: number): Promise<SenateElectionData | null> {
  // Check cache first
  const cachedData = senateCache.get(year);
  console.log(`Cache check for senate-${year}:`, cachedData ? 'HIT' : 'MISS');

  // DC: always use cachedData if available!
  if (cachedData) {
    console.log('Forced to use cached if available.')
    return cachedData;
  }

  // Fetch fresh data from Supabase
  const freshData = await fetchSenateDataFromSupabase(year);
  console.log(`Fresh data fetch for senate-${year}:`, freshData ? 'SUCCESS' : 'FAILED');

  if (!freshData) {
    // If fetch failed but we have cache, return cached data
    if (cachedData) {
      console.log(`Fetch failed, using cached data for senate-${year}`);
      return cachedData;
    }
    console.log(`No fresh data and no cache for senate-${year}, returning null`);
    return null;
  }

  // Check if data has changed or cache is empty
  const shouldUpdate = senateCache.shouldUpdate(year, freshData);
  console.log(`Should update cache for senate-${year}:`, shouldUpdate);

  if (shouldUpdate) {
    console.log(`Updating cache for senate-${year}`);
    senateCache.set(year, freshData);
    return freshData;
  }

  // Data hasn't changed, return fresh data (which is identical to cached version)
  console.log(`Data unchanged, returning fresh data for senate-${year}`);
  return freshData;
}

// Function to manually refresh cache for a specific year
export async function refreshSenateCache(year: number): Promise<SenateElectionData | null> {
  senateCache.clear(year);
  return getSenateElectionData(year);
}

// Function to clear all senate cache
export function clearSenateCache(): void {
  senateCache.clear();
  console.log('Senate election cache cleared');
}

// Function to prefetch and cache data for multiple years
export async function prefetchSenateData(years: number[]): Promise<void> {
  const promises = years.map(year => getSenateElectionData(year));
  await Promise.all(promises);
  console.log(`Prefetched senate data for years: ${years.join(', ')}`);
}