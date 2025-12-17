import { supabase } from '../../../supabaseClient';

export type PresidentialYear = 2012 | 2016 | 2020 | 2024;

export interface CountyCandidateResult {
  votes: number;
  percent: number;
  winner: boolean;
}

export interface CountyResult {
  [candidateId: string]: CountyCandidateResult | string | number | undefined;
  percent_reporting?: number;
}

export interface CountyPartyInfo {
  name: string;
  color: string;
}

export interface CountyCandidateInfo {
  name: string;
  party_code: string;
  party_name?: string;
  img?: string;
}

export interface PresidentialCountyElectionData {
  year: number;
  description: string;
  candidates: { [candidateId: string]: CountyCandidateInfo };
  parties: { [partyCode: string]: CountyPartyInfo };
  results: { [fipsCode: string]: CountyResult };
}

// Cache structure
interface CacheEntry {
  data: PresidentialCountyElectionData;
  hash: string;
}

class PresidentialCountyElectionCache {
  private cache: Map<PresidentialYear, CacheEntry> = new Map();

  private generateHash(data: PresidentialCountyElectionData): string {
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

  get(year: PresidentialYear): PresidentialCountyElectionData | null {
    const entry = this.cache.get(year);
    return entry?.data || null;
  }

  set(year: PresidentialYear, data: PresidentialCountyElectionData): void {
    const hash = this.generateHash(data);
    this.cache.set(year, { data, hash });
  }

  shouldUpdate(year: PresidentialYear, newData: PresidentialCountyElectionData): boolean {
    const entry = this.cache.get(year);
    if (!entry) return true;

    const newHash = this.generateHash(newData);
    console.log('hash ' + year + ':' + newHash);
    console.log('old hash ' + year + ':' + entry.hash);
    console.log('compare hash ' + year + ':' + (entry.hash === newHash));

    // Debug: Let's compare the actual JSON to find the difference
    if (entry.hash !== newHash) {
      const oldData = entry.data;

      let has_different = false;

      // Create the same sorted structure for both old and new data
      const createSortedStructure = (data: PresidentialCountyElectionData) => {
        const sortedResults: any = {};
        if (data.results) {
          const fipsCodes = Object.keys(data.results).sort();
          fipsCodes.forEach(fips => {
            const countyResult = data.results[fips];
            const sortedCountyResult: any = {};
            const candidateIds = Object.keys(countyResult).sort();
            candidateIds.forEach(candidateId => {
              sortedCountyResult[candidateId] = countyResult[candidateId];
            });
            sortedResults[fips] = sortedCountyResult;
          });
        }

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

        return {
          year: data.year,
          description: data.description,
          candidates: sortedCandidates,
          parties: sortedParties,
          results: sortedResults
        };
      };

      const oldSorted = createSortedStructure(oldData);
      const newSorted = createSortedStructure(newData);

      console.log(oldSorted);
      console.log(newSorted);
      console.log('sssssssssorted')

      const findDiff = (obj1: any, obj2: any, path = '', diffs: string[] = [], limit = 10): string[] => {
        if (diffs.length >= limit) return diffs; // stop if too many diffs

        for (const key in obj1) {
          const fullPath = path ? `${path}.${key}` : key;
          if (!(key in obj2)) {
            diffs.push(`🟥 Missing in obj2: ${fullPath}`);
          } else if (typeof obj1[key] === 'object' && obj1[key] && obj2[key]) {
            this.findDiff2(obj1[key], obj2[key], fullPath, diffs, limit);
          } else if (obj1[key] !== obj2[key]) {
            diffs.push(`🟨 Difference at ${fullPath}: ${obj1[key]} !== ${obj2[key]}`);
          }
          if (diffs.length >= limit) break;
        }

        for (const key in obj2) {
          if (!(key in obj1)) {
            const fullPath = path ? `${path}.${key}` : key;
            diffs.push(`🟦 Missing in obj1: ${fullPath}`);
          }
          if (diffs.length >= limit) break;
        }

        return diffs;
      }

      // Compare specific parts
      if (JSON.stringify(oldSorted.year) !== JSON.stringify(newSorted.year)) {
        console.log('Year different');
      }
      if (JSON.stringify(oldSorted.description) !== JSON.stringify(newSorted.description)) {
        console.log('Description different:', oldSorted.description, 'vs', newSorted.description);
      }
      if (JSON.stringify(oldSorted.candidates) !== JSON.stringify(newSorted.candidates)) {
        console.log('Candidates different');
      }
      if (JSON.stringify(oldSorted.parties) !== JSON.stringify(newSorted.parties)) {
        console.log('Parties different');
      }
      if (JSON.stringify(oldSorted.results) !== JSON.stringify(newSorted.results)) {        
        console.log('Results different');
        const diffs = findDiff(oldSorted.results, newSorted.results)
        if (diffs.length > 0) {
          console.log('🧩 Differences found:');
          diffs.forEach(d => console.log(d));
        } else {
          console.log('✅ No differences found.');
        }
      }

      // Check first few results to see what's different
      const oldFips = Object.keys(oldSorted.results);
      const newFips = Object.keys(newSorted.results);
      console.log('Number of counties:', oldFips.length, 'vs', newFips.length);

      // Sample check
      const firstFips = oldFips[0];
      if (firstFips && JSON.stringify(oldSorted.results[firstFips]) !== JSON.stringify(newSorted.results[firstFips])) {
        console.log('First county different:', firstFips);
        console.log('Old:', JSON.stringify(oldSorted.results[firstFips]).substring(0, 200));
        console.log('New:', JSON.stringify(newSorted.results[firstFips]).substring(0, 200));
      }
    }

    return entry.hash !== newHash;
  }

  findDiff2(obj1: any, obj2: any, path = '', diffs: string[] = [], limit = 10): string[] {
    if (diffs.length >= limit) return diffs; // stop if too many diffs

    for (const key in obj1) {
      const fullPath = path ? `${path}.${key}` : key;
      if (!(key in obj2)) {
        diffs.push(`🟥 Missing in obj2: ${fullPath}`);
      } else if (typeof obj1[key] === 'object' && obj1[key] && obj2[key]) {
        this.findDiff2(obj1[key], obj2[key], fullPath, diffs, limit);
      } else if (obj1[key] !== obj2[key]) {
        diffs.push(`🟨 Difference at ${fullPath}: ${obj1[key]} !== ${obj2[key]}`);
      }
      if (diffs.length >= limit) break;
    }

    for (const key in obj2) {
      if (!(key in obj1)) {
        const fullPath = path ? `${path}.${key}` : key;
        diffs.push(`🟦 Missing in obj1: ${fullPath}`);
      }
      if (diffs.length >= limit) break;
    }

    return diffs;
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
export const presidentialCountyCache = new PresidentialCountyElectionCache();

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

// Fetch presidential county data from Supabase with pagination
export async function fetchPresidentialCountyDataFromSupabase(year: PresidentialYear): Promise<PresidentialCountyElectionData | null> {
  try {
    const BATCH_SIZE = 20000;
    let allData: any[] = [];
    let offset = 0;
    let hasMore = true;

    console.log(`Starting to fetch presidential county data for year ${year}...`);

    while (hasMore) {
      // Use RPC to call the function with extended timeout
      const { data, error } = await supabase
        .rpc('fetch_county_data_extended', {
          p_race_type: 'presidential',
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
      console.log(`Fetched ${allData.length} presidential county records so far...`);

      hasMore = data.length === BATCH_SIZE;
      offset += BATCH_SIZE;
    }

    if (allData.length === 0) {
      console.log('No presidential county data returned from Supabase');
      return null;
    }

    console.log(`✓ Total presidential county records fetched: ${allData.length}`);
    console.log(allData);

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
    console.error('Error in fetchPresidentialCountyDataFromSupabase:', error);
    return null;
  }
}

/*export async function fetchPresidentialCountyDataFromSupabase(year: PresidentialYear): Promise<PresidentialCountyElectionData | null> {
  try {
    const BATCH_SIZE = 20000;
    let allData: any[] = [];
    let start = 0;
    let hasMore = true;

    console.log(`Starting to fetch presidential county data for year ${year}...`);

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
        .eq('e_race_results_effective.e_races.type', 'presidential')
        .eq('e_race_results_effective.e_races.e_elections.year', year)
        .eq('e_race_results_effective.e_races.e_geographic_divisions.type', 'county')
        .range(start, start + BATCH_SIZE - 1);
        //.order('votes', { ascending: false }); //don't order, causing cache issue!!!

      if (error) {
        console.error('Supabase query error:', error);
        return null;
      }

      if (!data || data.length === 0) {
        break;
      }

      allData = allData.concat(data);
      console.log(`Fetched ${allData.length} presidential county records so far... (Total in DB: ${count || 'unknown'})`);

      // Check if we have more data to fetch
      if (data.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        start += BATCH_SIZE;
      }
    }

    if (allData.length === 0) {
      console.log('No county data returned from Supabase');
      return null;
    }

    console.log(`✓ Total presidential county records fetched: ${allData.length}`);

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
    console.error('Error in fetchPresidentialCountyDataFromSupabase:', error);
    return null;
  }
}*/

// Transform Supabase data to match the PresidentialCountyElectionData interface
function transformSupabaseCountyDataToElectionData(rows: SupabaseCountyElectionRow[]): PresidentialCountyElectionData | null {
  if (!rows || rows.length === 0) return null;

  const firstRow = rows[0];
  const candidates: { [candidateId: string]: CountyCandidateInfo } = {};
  const parties: { [partyCode: string]: CountyPartyInfo } = {};
  const results: { [fipsCode: string]: CountyResult } = {};

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
        (result as CountyCandidateResult).winner = false;
      }
    });

    // Find the candidate with the highest votes
    Object.keys(countyResults).forEach(candidateId => {
      if (candidateId === 'percent_reporting') return;
      const result = countyResults[candidateId];
      if (result && typeof result === 'object' && 'votes' in result) {
        const candidateResult = result as CountyCandidateResult;
        if (candidateResult.votes > maxVotes) {
          maxVotes = candidateResult.votes;
          winnerCandidateId = candidateId;
        }
      }
    });

    // Set winner flag for the candidate with highest votes
    if (winnerCandidateId) {
      (countyResults[winnerCandidateId] as CountyCandidateResult).winner = true;
    }
  });

  return {
    year: firstRow.year,
    description: firstRow.election_name + ' (County)' || `Presidential Election ${firstRow.year} - County Results`,
    candidates,
    parties,
    results
  };
}

// Main function to get presidential county election data with caching
export async function getPresidentialCountyElectionData(year: PresidentialYear): Promise<PresidentialCountyElectionData | null> {
  // Check cache first
  let cachedData = presidentialCountyCache.get(year);
  console.log(`Cache check for presidential-county-${year}:`, cachedData ? 'HIT' : 'MISS');

  // DC: always use cachedData if available!
  if (cachedData) {
    console.log('Forced to use cached if available.')
    return cachedData;
  }

  // Fetch fresh data from Supabase
  const freshData = await fetchPresidentialCountyDataFromSupabase(year);
  console.log(`Fresh data fetch for presidential-county-${year}:`, freshData ? 'SUCCESS' : 'FAILED');

  if (!freshData) {
    // If fetch failed but we have cache, return cached data
    if (cachedData) {
      console.log(`Fetch failed, using cached data for presidential-county-${year}`);
      return cachedData;
    }
    console.log(`No fresh data and no cache for presidential-county-${year}, returning null`);
    return null;
  }

  // Check if data has changed or cache is empty
  const shouldUpdate = presidentialCountyCache.shouldUpdate(year, freshData);
  console.log(`Should update cache for presidential-county-${year}:`, shouldUpdate);

  if (shouldUpdate) {
    console.log(`Updating cache for presidential-county-${year}`);
    presidentialCountyCache.set(year, freshData);
    return freshData;
  }

  // Data hasn't changed, return cached version
  console.log(`Data unchanged, returning cached data for presidential-county-${year}`);
  if (!cachedData)
    cachedData = freshData;
  return cachedData;
}

export const presidentialElectionCountyData: Partial<Record<PresidentialYear, PresidentialCountyElectionData>> = {
  2024: {
    year: 2024,
    description: "2024 Presidential Election - County Level Results",
    candidates: {
      "32b7cd71-139c-4e89-8e4a-ff32d378d058": { name: "Donald Trump7", party_code: "GOP", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/45_donald_trump.jpg" },
      "438c3cc8-5516-423e-89da-24407293855b": { name: "Kamala Harris7", party_code: "Dem", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/46_kamala_harris.jpg" },
      "3": { name: "Denny Choi7", party_code: "Ind", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/46_kamala_harris.jpg" }
    },
    parties: {
      GOP: { name: "Republican", color: "#DC2626" },
      Dem: { name: "Democratic", color: "2563EB" },
      Ind: { name: "Independent", color: "9CA3AF" }
    },
    results: {
      "38001": { 
	      "32b7cd71-139c-4e89-8e4a-ff32d378d058": { votes: 65, percent: 64.83, winner: true },
	      "438c3cc8-5516-423e-89da-24407293855b": { votes: 65, percent: 34.22, winner: false },
        "3": { votes: 511, percent: 1, winner: false }
      },
      "30001": { 
	      "32b7cd71-139c-4e89-8e4a-ff32d378d058": { votes: 584458, percent: 54.54, winner: true },
	      "438c3cc8-5516-423e-89da-24407293855b": { votes: 540026, percent: 41.41, winner: false },
        "3": { votes: 5125, percent: 1, winner: false },
      }
    }
  },
  2020: {
    year: 2020,
    description: "2020 Presidential Election - County Level Results",
    candidates: {
      "32b7cd71-139c-4e89-8e4a-ff32d378d058": { name: "Donald Trump8", party_code: "GOP", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/45_donald_trump.jpg" },
      "438c3cc8-5516-423e-89da-24407293855b": { name: "Kamala Harris8", party_code: "Dem", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/46_kamala_harris.jpg" },
      "3": { name: "Denny Choi8", party_code: "Ind", img: "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/46_kamala_harris.jpg" }
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