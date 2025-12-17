import { supabase } from '../../../supabaseClient';

// Types
export type PresidentialYear = 2012 | 2016 | 2020 | 2024;

export interface CandidateResult {
  votes: number;
  percent: number;
  electoralVotes?: number;
  electoralVote?: number;
  winner: boolean;
}

export interface StateResult {
  [candidateId: string]: CandidateResult | number | string | undefined;
  stateElectoralVotes?: number;
  stateElectoralVote?: number;
  percent_reporting?: number;
}

export interface PartyInfo {
  name: string;
  color: string;
}

export interface CandidateInfo {
  name: string;
  party_code: string;
  party_name?: string;
  img?: string;
}

export interface PresidentialElectionData {
  year: number;
  description: string;
  candidates: { [candidateId: string]: CandidateInfo };
  parties: { [partyCode: string]: PartyInfo };
  winner: string;
  winnerImg?: string;
  results: { [stateCode: string]: StateResult };
}

// Cache structure
interface CacheEntry {
  data: PresidentialElectionData;
  hash: string;
}

class PresidentialElectionCache {
  private cache: Map<PresidentialYear, CacheEntry> = new Map();

  private generateHash(data: any): string {
    return JSON.stringify(data);
  }

  get(year: PresidentialYear): PresidentialElectionData | null {
    const entry = this.cache.get(year);
    return entry?.data || null;
  }

  set(year: PresidentialYear, data: PresidentialElectionData): void {
    const hash = this.generateHash(data);
    this.cache.set(year, { data, hash });
  }

  shouldUpdate(year: PresidentialYear, newData: any): boolean {
    const entry = this.cache.get(year);
    if (!entry) return true;
    
    const newHash = this.generateHash(newData);
    return entry.hash !== newHash;
  }

  clear(year?: PresidentialYear): void {
    if (year) {
      this.cache.delete(year);
    } else {
      this.cache.clear();
    }
  }
}

// Create cache instance
export const presidentialCache = new PresidentialElectionCache();

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
  Electoral_votes: number;
  winner: boolean;
  state_electoral_votes: string;
  percent_reporting: number;
}

// Fetch presidential data from Supabase using RPC
export async function fetchPresidentialDataFromSupabase(year: PresidentialYear): Promise<PresidentialElectionData | null> {
  try {
    console.log(`Fetching presidential state data for year ${year}...`);
    
    // Use RPC to call the function with extended timeout
    const { data, error } = await supabase
      .rpc('fetch_presidential_state_data_extended', {
        p_year: year
      });

    if (error) {
      console.error('Error fetching presidential data:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`No presidential election data found for year ${year}`);
      return null;
    }

    console.log(`✓ Fetched ${data.length} presidential state records`);

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
      Electoral_votes: item.electoral_votes,
      winner: item.winner,
      state_electoral_votes: item.state_electoral_votes?.toString() || '0',
      percent_reporting: item.percent_reporting || 0
    }));

    return transformSupabaseDataToElectionData(rows);
  } catch (error) {
    console.error('Error in fetchPresidentialDataFromSupabase:', error);
    return null;
  }
}

/*export async function fetchPresidentialDataFromSupabase(year: PresidentialYear): Promise<PresidentialElectionData | null> {
  try {
    // Query from e_candidate_results_effective as the main table
    const { data, error } = await supabase
      .from('e_candidate_results_effective')
      .select(`
        votes,
        vote_percentage,
        electoral_votes,
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
      .eq('e_race_results_effective.e_races.type', 'presidential')
      .eq('e_race_results_effective.e_races.e_elections.year', year)
      .eq('e_race_results_effective.e_races.e_geographic_divisions.type', 'state')
      .in('e_candidates.e_parties.abbreviation', ['GOP', 'Dem']);

    if (error) {
      console.error('Error fetching presidential data:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`No presidential election data found for year ${year}`);
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
      Electoral_votes: item.electoral_votes,
      winner: item.winner,
      state_electoral_votes: item.e_race_results_effective.e_races.metadata?.electoral_votes || '0'
    }));

    return transformSupabaseDataToElectionData(rows);
  } catch (error) {
    console.error('Error in fetchPresidentialDataFromSupabase:', error);
    return null;
  }
}*/

// Transform Supabase data to match the PresidentialElectionData interface
function transformSupabaseDataToElectionData(rows: SupabaseElectionRow[]): PresidentialElectionData | null {
  if (!rows || rows.length === 0) return null;

  const firstRow = rows[0];
  const candidates: { [candidateId: string]: CandidateInfo } = {};
  const parties: { [partyCode: string]: PartyInfo } = {};
  const results: { [stateCode: string]: StateResult } = {};
  
  // Track electoral votes per candidate to determine winner
  const candidateElectoralVotesTotal: Record<string, number> = {};

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
      const stateElectoralVotesNum = parseInt(row.state_electoral_votes) || 0;
      results[stateCode] = {
        stateElectoralVote: stateElectoralVotesNum,
        stateElectoralVotes: stateElectoralVotesNum,
        percent_reporting: row.percent_reporting || 0
      };
    }

    // Add candidate result to state
    results[stateCode][candidateId] = {
      votes: row.votes,
      percent: row.vote_percentage,
      electoralVote: row.Electoral_votes,
      electoralVotes: row.Electoral_votes,
      winner: row.winner
    };

    // Track total electoral votes for winner determination
    if (row.winner && row.Electoral_votes > 0) {
      candidateElectoralVotesTotal[candidateId] = 
        (candidateElectoralVotesTotal[candidateId] || 0) + row.Electoral_votes;
    }
  });

  // Determine overall winner based on total electoral votes
  let winner = '';
  let winnerImg: string | undefined;
  let maxElectoralVotes = 0;

  Object.entries(candidateElectoralVotesTotal).forEach(([candidateId, totalVotes]) => {
    if (totalVotes > maxElectoralVotes) {
      maxElectoralVotes = totalVotes;
      winner = candidateId;
      // Get the winner's image from candidates map
      winnerImg = candidates[candidateId]?.img;
    }
  });

  return {
    year: firstRow.year,
    description: firstRow.election_name || `Presidential Election ${firstRow.year}`,
    candidates,
    parties,
    winner,
    winnerImg,
    results
  };
}

// Main function to get presidential election data with caching
export async function getPresidentialElectionData(year: PresidentialYear): Promise<PresidentialElectionData | null> {
  // Check cache first
  const cachedData = presidentialCache.get(year);
  console.log(`Cache check for presidential-${year}:`, cachedData ? 'HIT' : 'MISS');

  // DC: always use cachedData if available!
  if (cachedData) {
    console.log('Forced to use cached if available.')
    return cachedData;
  }

  // Fetch fresh data from Supabase
  const freshData = await fetchPresidentialDataFromSupabase(year);
  console.log(`Fresh data fetch for presidential-${year}:`, freshData ? 'SUCCESS' : 'FAILED');

  if (!freshData) {
    // If fetch failed but we have cache, return cached data
    if (cachedData) {
      console.log(`Fetch failed, using cached data for presidential-${year}`);
      return cachedData;
    }
    console.log(`No fresh data and no cache for presidential-${year}, returning null`);
    return null;
  }

  // Check if data has changed or cache is empty
  const shouldUpdate = presidentialCache.shouldUpdate(year, freshData);
  console.log(`Should update cache for presidential-${year}:`, shouldUpdate);

  if (shouldUpdate) {
    console.log(`Updating cache for presidential-${year}`);
    presidentialCache.set(year, freshData);
    return freshData;
  }

  // Data hasn't changed, return fresh data (which is identical to cached version)
  console.log(`Data unchanged, returning fresh data for presidential-${year}`);
  return freshData;
}

// Function to manually refresh cache for a specific year
export async function refreshPresidentialCache(year: PresidentialYear): Promise<PresidentialElectionData | null> {
  presidentialCache.clear(year);
  return getPresidentialElectionData(year);
}

// Function to clear all presidential cache
export function clearPresidentialCache(): void {
  presidentialCache.clear();
  console.log('Presidential election cache cleared');
}

// Function to prefetch and cache data for multiple years
export async function prefetchPresidentialData(years: PresidentialYear[]): Promise<void> {
  const promises = years.map(year => getPresidentialElectionData(year));
  await Promise.all(promises);
  console.log(`Prefetched presidential data for years: ${years.join(', ')}`);
}