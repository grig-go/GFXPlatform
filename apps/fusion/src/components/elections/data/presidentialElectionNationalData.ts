import { supabase } from '../../../supabaseClient';

// Types
export type PresidentialYear = 2012 | 2016 | 2020 | 2024;

export interface CandidateResult {
  votes: number;
  percent: number;
  ElectoralVotes?: number;
  ElectoralVote?: number;
  winner: boolean;
}

export interface NationalResult {
  [candidateId: string]: CandidateResult | number | string | undefined;
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

export interface PresidentialElectionNationalData {
  year: number;
  description: string;
  candidates: { [candidateId: string]: CandidateInfo };
  parties: { [partyCode: string]: PartyInfo };
  winner: string;
  winnerImg?: string;
  results: NationalResult;
  percent_reporting?: number;
}

// Cache structure
interface CacheEntry {
  data: PresidentialElectionNationalData;
  hash: string;
}

class PresidentialElectionNationalCache {
  private cache: Map<PresidentialYear, CacheEntry> = new Map();

  private generateHash(data: any): string {
    return JSON.stringify(data);
  }

  get(year: PresidentialYear): PresidentialElectionNationalData | null {
    const entry = this.cache.get(year);
    return entry?.data || null;
  }

  set(year: PresidentialYear, data: PresidentialElectionNationalData): void {
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
export const presidentialNationalCache = new PresidentialElectionNationalCache();

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
  percent_reporting: number;
}

// Fetch presidential national data from Supabase using RPC
export async function fetchPresidentialNationalDataFromSupabase(year: PresidentialYear): Promise<PresidentialElectionNationalData | null> {
  try {
    console.log(`Fetching presidential national data for year ${year}...`);

    // Use RPC to call the function with extended timeout
    const { data, error } = await supabase
      .rpc('fetch_presidential_national_data_extended', {
        p_year: year
      });

    if (error) {
      console.error('Error fetching presidential national data:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`No presidential national election data found for year ${year}`);
      return null;
    }

    console.log(`✓ Fetched ${data.length} presidential national records`);

    // Transform the flat data to your format
    const rows: SupabaseElectionRow[] = data.map((item: any) => ({
      year: item.election_year,
      election_name: item.election_name,
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
      percent_reporting: item.percent_reporting || 0
    }));

    return transformSupabaseDataToElectionNationalData(rows);
  } catch (error) {
    console.error('Error in fetchPresidentialNationalDataFromSupabase:', error);
    return null;
  }
}

// Transform Supabase data to match the PresidentialElectionNationalData interface
function transformSupabaseDataToElectionNationalData(rows: SupabaseElectionRow[]): PresidentialElectionNationalData | null {
  if (!rows || rows.length === 0) return null;

  const firstRow = rows[0];
  const candidates: { [candidateId: string]: CandidateInfo } = {};
  const parties: { [partyCode: string]: PartyInfo } = {};
  const results: NationalResult = {};

  // Track electoral votes per candidate to determine winner
  let winner = '';
  let winnerImg: string | undefined;

  // Process each row
  rows.forEach(row => {
    const candidateId = row.candidate_id;
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

    // Add candidate result to national results
    results[candidateId] = {
      votes: row.votes,
      percent: row.vote_percentage,
      electoralVote: row.Electoral_votes,
      electoralVotes: row.Electoral_votes,
      winner: row.winner
    };

    // Determine winner
    if (row.winner) {
      winner = candidateId;
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
    results,
    percent_reporting: firstRow.percent_reporting || 0
  };
}

// Main function to get presidential election national data with caching
export async function getPresidentialElectionNationalData(year: PresidentialYear): Promise<PresidentialElectionNationalData | null> {
  // Check cache first
  const cachedData = presidentialNationalCache.get(year);
  console.log(`Cache check for presidential-national-${year}:`, cachedData ? 'HIT' : 'MISS');

  // DC: always use cachedData if available!
  if (cachedData) {
    console.log('Forced to use cached if available.')
    return cachedData;
  }

  // Fetch fresh data from Supabase
  const freshData = await fetchPresidentialNationalDataFromSupabase(year);
  console.log(`Fresh data fetch for presidential-national-${year}:`, freshData ? 'SUCCESS' : 'FAILED');

  if (!freshData) {
    // If fetch failed but we have cache, return cached data
    if (cachedData) {
      console.log(`Fetch failed, using cached data for presidential-national-${year}`);
      return cachedData;
    }
    console.log(`No fresh data and no cache for presidential-national-${year}, returning null`);
    return null;
  }

  // Check if data has changed or cache is empty
  const shouldUpdate = presidentialNationalCache.shouldUpdate(year, freshData);
  console.log(`Should update cache for presidential-national-${year}:`, shouldUpdate);

  if (shouldUpdate) {
    console.log(`Updating cache for presidential-national-${year}`);
    presidentialNationalCache.set(year, freshData);
    return freshData;
  }

  // Data hasn't changed, return fresh data (which is identical to cached version)
  console.log(`Data unchanged, returning fresh data for presidential-national-${year}`);
  return freshData;
}

// Function to manually refresh cache for a specific year
export async function refreshPresidentialNationalCache(year: PresidentialYear): Promise<PresidentialElectionNationalData | null> {
  presidentialNationalCache.clear(year);
  return getPresidentialElectionNationalData(year);
}

// Function to clear all presidential national cache
export function clearPresidentialNationalCache(): void {
  presidentialNationalCache.clear();
  console.log('Presidential national election cache cleared');
}

// Function to prefetch and cache data for multiple years
export async function prefetchPresidentialNationalData(years: PresidentialYear[]): Promise<void> {
  const promises = years.map(year => getPresidentialElectionNationalData(year));
  await Promise.all(promises);
  console.log(`Prefetched presidential national data for years: ${years.join(', ')}`);
}