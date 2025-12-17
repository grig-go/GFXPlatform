import { supabase } from '../../../supabaseClient';

export type SenateYear = 2012 | 2014 | 2016 | 2018 | 2020 | 2022 | 2024;

export interface SenateCountyCandidateResult {
  votes: number;
  percent: number;
  winner: boolean;
}

export interface SenateCountyResult {
  [candidateId: string]: SenateCountyCandidateResult | string | number | undefined;
  percent_reporting?: number;
}

export interface SenateCountyPartyInfo {
  name: string;
  color: string;
}

export interface SenateCountyCandidateInfo {
  name: string;
  party_code: string;
  party_name?: string;
  img?: string;
}

export interface SenateCountyElectionData {
  year: number;
  description: string;
  candidates: { [candidateId: string]: SenateCountyCandidateInfo };
  parties: { [partyCode: string]: SenateCountyPartyInfo };
  results: { [fipsCode: string]: SenateCountyResult };
}

// Cache structure
interface CacheEntry {
  data: SenateCountyElectionData;
  hash: string;
}

class SenateCountyElectionCache {
  private cache: Map<SenateYear, CacheEntry> = new Map();

  private generateHash(data: SenateCountyElectionData): string {
    // Create a deterministic hash that's independent of order
    // Sort the results by FIPS code to ensure consistent ordering
    const sortedResults: any = {};
    if (data.results) {
      const fipsCodes = Object.keys(data.results).sort();
      fipsCodes.forEach(fips => {
        // Also sort candidate IDs within each FIPS result for consistency
        const countyResult = data.results[fips];
        const sortedCountyResult: any = {};
        const candidateIds = Object.keys(countyResult).sort();
        candidateIds.forEach(candidateId => {
          sortedCountyResult[candidateId] = countyResult[candidateId];
        });
        sortedResults[fips] = sortedCountyResult;
      });
    }

    // Sort candidates and parties by their keys too
    const sortedCandidates: any = {};
    const candidateKeys = Object.keys(data.candidates || {}).sort();
    candidateKeys.forEach(key => {
      sortedCandidates[key] = data.candidates[key];
    });

    const sortedParties: any = {};
    const partyKeys = Object.keys(data.parties || {}).sort();
    partyKeys.forEach(key => {
      sortedParties[key] = data.parties[key];
    });

    // Create a hash object with sorted everything
    const hashObject = {
      year: data.year,
      description: data.description,
      candidates: sortedCandidates,
      parties: sortedParties,
      results: sortedResults
    };

    // Simple browser-compatible hash function
    const jsonString = JSON.stringify(hashObject);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  get(year: SenateYear): SenateCountyElectionData | null {
    const entry = this.cache.get(year);
    return entry?.data || null;
  }

  set(year: SenateYear, data: SenateCountyElectionData): void {
    const hash = this.generateHash(data);
    this.cache.set(year, { data, hash });
  }

  shouldUpdate(year: SenateYear, newData: SenateCountyElectionData): boolean {
    const entry = this.cache.get(year);
    if (!entry) return true;

    const newHash = this.generateHash(newData);
    return entry.hash !== newHash;
  }

  clear(year?: SenateYear): void {
    if (year) {
      this.cache.delete(year);
    } else {
      this.cache.clear();
    }
  }
}

// Create cache instance
export const senateCountyCache = new SenateCountyElectionCache();

// Default colors for parties
const DEFAULT_PARTY_COLORS: Record<string, string> = {
  GOP: '#DC2626',
  Dem: '#2563EB'
};

const DEFAULT_COLOR = '#9CA3AF';

// Database query interface
interface SupabaseCountyElectionRow {
  year: number;
  election_name: string;
  state_code: string;
  fips_code: string;
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

// Fetch senate county data from Supabase with pagination
export async function fetchSenateCountyDataFromSupabase(year: SenateYear): Promise<SenateCountyElectionData | null> {
  try {
    const BATCH_SIZE = 5000;
    let allData: any[] = [];
    let offset = 0;
    let hasMore = true;

    console.log(`Starting to fetch senate county data for year ${year}...`);

    while (hasMore) {
      // Use RPC to call the function with extended timeout
      const { data, error } = await supabase
        .rpc('fetch_county_data_extended', {
          p_race_type: 'senate',
          p_year: year,
          p_offset: offset,
          p_limit: BATCH_SIZE
        });

      if (error) {
        console.error('Supabase query error:', error);
        return null;
      }

      if (!data || data.length === 0) {
        break;
      }

      allData = allData.concat(data);
      console.log(`Fetched ${allData.length} senate county records so far...`);

      hasMore = data.length === BATCH_SIZE;
      offset += BATCH_SIZE;
    }

    if (allData.length === 0) {
      console.log('No senate county data returned from Supabase');
      return null;
    }

    console.log(`✓ Total senate county records fetched: ${allData.length}`);

    // Transform to your format
    const rows: SupabaseCountyElectionRow[] = allData.map((item: any) => ({
      year: item.election_year,
      election_name: item.election_name,
      state_code: item.state_code,
      fips_code: item.fips_code,
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

    return transformSupabaseCountyDataToElectionData(rows);
  } catch (error) {
    console.error('Error in fetchSenateCountyDataFromSupabase:', error);
    return null;
  }
}

/*export async function fetchSenateCountyDataFromSupabase(year: SenateYear): Promise<SenateCountyElectionData | null> {
  try {
    const BATCH_SIZE = 5000;
    let allData: any[] = [];
    let start = 0;
    let hasMore = true;

    console.log(`Starting to fetch senate county data for year ${year}...`);

    // Fetch data in batches
    while (hasMore) {
      const { data, error, count } = await supabase
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
              type,
              e_geographic_divisions!inner (
                code,
                fips_code,
                type,
                name
              ),
              e_elections!inner (
                year,
                name
              )
            )
          )
        `, { count: 'exact' })
        .eq('e_race_results_effective.e_races.type', 'senate')
        .eq('e_race_results_effective.e_races.e_elections.year', year)
        .eq('e_race_results_effective.e_races.e_geographic_divisions.type', 'county')
        .range(start, start + BATCH_SIZE - 1)
        //.order('votes', { ascending: false }); //don't order, causing cache issue!!!

      if (error) {
        console.error('Supabase query error:', error);
        return null;
      }

      if (!data || data.length === 0) {
        break;
      }

      allData = allData.concat(data);
      console.log(`Fetched ${allData.length} senate county records so far... (Total in DB: ${count || 'unknown'})`);

      // Check if we have more data to fetch
      if (data.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        start += BATCH_SIZE;
      }
    }

    if (allData.length === 0) {
      console.log('No senate county data returned from Supabase');
      return null;
    }

    console.log(`✓ Total senate county records fetched: ${allData.length}`);

    // Transform the nested data structure to flat rows (no sorting to maintain consistent hash)
    const rows: SupabaseCountyElectionRow[] = allData.map((item: any) => ({
      year: item.e_race_results_effective.e_races.e_elections.year,
      election_name: item.e_race_results_effective.e_races.e_elections.name,
      state_code: item.e_race_results_effective.e_races.e_geographic_divisions.code,
      fips_code: item.e_race_results_effective.e_races.e_geographic_divisions.fips_code,
      party_code: item.e_candidates.e_parties.abbreviation,
      party_name: item.e_candidates.e_parties.name,
      color_hex: item.e_candidates.e_parties.color_hex,
      candidate_id: item.e_candidates.id,
      full_name: item.e_candidates.full_name,
      photo_url: item.e_candidates.photo_url,
      votes: item.votes,
      vote_percentage: item.vote_percentage,
      winner: item.winner,
      percent_reporting: item.percent_reporting || 0
    }));

    return transformSupabaseCountyDataToElectionData(rows);
  } catch (error) {
    console.error('Error in fetchSenateCountyDataFromSupabase:', error);
    return null;
  }
}*/

// Transform Supabase data to match the SenateCountyElectionData interface
function transformSupabaseCountyDataToElectionData(rows: SupabaseCountyElectionRow[]): SenateCountyElectionData | null {
  if (!rows || rows.length === 0) return null;

  const firstRow = rows[0];
  const candidates: { [candidateId: string]: SenateCountyCandidateInfo } = {};
  const parties: { [partyCode: string]: SenateCountyPartyInfo } = {};
  const results: { [fipsCode: string]: SenateCountyResult } = {};

  // First pass: Build the data structures and track which counties have winners
  const countiesWithWinners = new Set<string>();

  rows.forEach(row => {
    const candidateId = row.candidate_id;
    const fipsCode = row.fips_code;
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
    if (!results[fipsCode]) {
      results[fipsCode] = {
        percent_reporting: row.percent_reporting || 0
      };
    }

    // Add candidate result to county
    results[fipsCode][candidateId] = {
      votes: row.votes,
      percent: row.vote_percentage,
      winner: row.winner
    };

    // Track counties that have at least one winner
    if (row.winner) {
      countiesWithWinners.add(fipsCode);
    }
  });

  // Recalculate winner ONLY for counties that had a winner in the database
  countiesWithWinners.forEach(fipsCode => {
    const countyResults = results[fipsCode];
    let maxVotes = -1;
    let winnerCandidateId: string | null = null;

    // First, set all candidates to false (skip percent_reporting)
    Object.keys(countyResults).forEach(candidateId => {
      if (candidateId === 'percent_reporting') return;
      const result = countyResults[candidateId];
      if (result && typeof result === 'object' && 'votes' in result) {
        (result as SenateCountyCandidateResult).winner = false;
      }
    });

    // Find the candidate with the highest votes
    Object.keys(countyResults).forEach(candidateId => {
      if (candidateId === 'percent_reporting') return;
      const result = countyResults[candidateId];
      if (result && typeof result === 'object' && 'votes' in result) {
        const candidateResult = result as SenateCountyCandidateResult;
        if (candidateResult.votes > maxVotes) {
          maxVotes = candidateResult.votes;
          winnerCandidateId = candidateId;
        }
      }
    });

    // Set winner flag for the candidate with highest votes
    if (winnerCandidateId) {
      (countyResults[winnerCandidateId] as SenateCountyCandidateResult).winner = true;
    }
  });

  return {
    year: firstRow.year,
    description: firstRow.election_name || `Senate Election ${firstRow.year} - County Results`,
    candidates,
    parties,
    results
  };
}

// Main function to get senate county election data with caching
export async function getSenateCountyElectionData(year: SenateYear): Promise<SenateCountyElectionData | null> {
  // Check cache first
  const cachedData = senateCountyCache.get(year);
  console.log(`Cache check for senate-county-${year}:`, cachedData ? 'HIT' : 'MISS');

  // DC: always use cachedData if available!
  if (cachedData) {
    console.log('Forced to use cached if available.')
    return cachedData;
  }

  // Fetch fresh data from Supabase
  const freshData = await fetchSenateCountyDataFromSupabase(year);
  console.log(`Fresh data fetch for senate-county-${year}:`, freshData ? 'SUCCESS' : 'FAILED');

  if (!freshData) {
    // If fetch failed but we have cache, return cached data
    if (cachedData) {
      console.log(`Fetch failed, using cached data for senate-county-${year}`);
      return cachedData;
    }
    console.log(`No fresh data and no cache for senate-county-${year}, returning null`);
    return null;
  }

  // Check if data has changed or cache is empty
  const shouldUpdate = senateCountyCache.shouldUpdate(year, freshData);
  console.log(`Should update cache for senate-county-${year}:`, shouldUpdate);

  if (shouldUpdate) {
    console.log(`Updating cache for senate-county-${year}`);
    senateCountyCache.set(year, freshData);
    return freshData;
  }

  // Data hasn't changed, return fresh data (which is identical to cache)
  console.log(`Data unchanged, returning fresh data for senate-county-${year}`);
  return freshData;
}

export const senateElectionCountyData: Partial<Record<SenateYear, SenateCountyElectionData>> = {
  2024: {
    year: 2024,
    description: "2024 Senate Election - County Level Results",
    candidates: {
      "32b7cd71-139c-4e89-8e4a-ff32d378d058": { name: "Donald Trump9", party_code: "GOP", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/45_donald_trump.jpg" },
      "438c3cc8-5516-423e-89da-24407293855b": { name: "Kamala Harris9", party_code: "Dem", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/46_kamala_harris.jpg" },
      "3": { name: "Denny Choi9", party_code: "Ind", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/46_kamala_harris.jpg" }
    },
    parties: {
      GOP: { name: "Republican", color: "#DC2626" },
      Dem: { name: "Democratic", color: "2563EB" },
      Ind: { name: "Independent", color: "9CA3AF" }
    },
    results: {
      "38001": { 
	      "32b7cd71-139c-4e89-8e4a-ff32d378d058": { votes: 43, percent: 64.83, winner: true },
	      "438c3cc8-5516-423e-89da-24407293855b": { votes: 43, percent: 34.22, winner: false },
        "3": { votes: 511, percent: 1, winner: false }
      },
      "30001": { 
	      "32b7cd71-139c-4e89-8e4a-ff32d378d058": { votes: 584458, percent: 54.54, winner: true },
	      "438c3cc8-5516-423e-89da-24407293855b": { votes: 540026, percent: 41.41, winner: false },
        "3": { votes: 51256, percent: 1, winner: false },
      }
    }
  },
  2022: {
    year: 2022,
    description: "2022 Senate Election - County Level Results",
    candidates: {
      "32b7cd71-139c-4e89-8e4a-ff32d378d058": { name: "Donald Trump10", party_code: "GOP", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/45_donald_trump.jpg" },
      "438c3cc8-5516-423e-89da-24407293855b": { name: "Kamala Harris10", party_code: "Dem", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/46_kamala_harris.jpg" },
      "3": { name: "Denny Choi10", party_code: "Ind", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/46_kamala_harris.jpg" }
    },
    parties: {
      GOP: { name: "Republican", color: "#DC2626" },
      Dem: { name: "Democratic", color: "2563EB" },
      Ind: { name: "Independent", color: "9CA3AF" }
    },
    results: {
      "38001": { 
	      "32b7cd71-139c-4e89-8e4a-ff32d378d058": { votes: 2257704, percent: 64.83, winner: true },
	      "438c3cc8-5516-423e-89da-24407293855b": { votes: 229391, percent: 34.22, winner: false },
        "3": { votes: 9111, percent: 1, winner: false }
      },
      "30001": { 
	      "32b7cd71-139c-4e89-8e4a-ff32d378d058": { votes: 444458, percent: 54.54, winner: true },
	      "438c3cc8-5516-423e-89da-24407293855b": { votes: 440026, percent: 41.41, winner: false },
        "3": { votes: 9121, percent: 1, winner: false },
      }
    }
  },
}