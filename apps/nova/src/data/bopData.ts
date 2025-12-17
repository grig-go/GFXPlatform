import { supabase } from '../utils/supabase/client';

// Types for BOP data
export interface BOPPartyResult {
  election_year: number;
  race_type: string;
  party_name: string;
  won: number;
  leading: number;
  holdovers: number;
  winning_trend: number;
  current_seats: number;
  insufficient_vote: number;
  total_seats: number;
}

export interface BOPData {
  senate?: BOPPartyResult[];
  house?: BOPPartyResult[];
  lastUpdated: string;
}

// Cache for BOP data
let cachedBOPData: {
  data: BOPData;
  year: number;
  timestamp: string;
} | null = null;

// Cache duration (5 minutes)
const CACHE_DURATION_MS = 5 * 60 * 1000;

/**
 * Fetch Balance of Power data from Supabase
 * @param year - Election year to fetch data for
 * @param raceType - Optional race type filter ('senate', 'house', or undefined for both)
 */
export async function fetchBOPData(year: number, raceType?: string): Promise<BOPData> {
  // Check cache
  if (cachedBOPData &&
      cachedBOPData.year === year &&
      Date.now() - new Date(cachedBOPData.timestamp).getTime() < CACHE_DURATION_MS) {
    console.log('Returning cached BOP data');
    return cachedBOPData.data;
  }

  try {
    console.log(`Fetching BOP data for year ${year}, race type: ${raceType || 'all'}`);

    // Use RPC function for optimized query
    const { data, error } = await supabase.rpc('fetch_bop_data', {
      p_election_year: year,
      p_race_type: raceType || null
    });

    console.log('BOP data fetched:', {
      year,
      raceType,
      dataLength: data?.length || 0,
      sampleData: data?.[0] || null
    })

    if (error) {
      console.error('Error fetching BOP data:', error);
      throw error;
    }

    // Group results by race type
    const bopData: BOPData = {
      lastUpdated: new Date().toISOString()
    };

    if (data && Array.isArray(data)) {
      const senateData = data.filter((row: BOPPartyResult) => row.race_type === 'senate');
      const houseData = data.filter((row: BOPPartyResult) => row.race_type === 'house');

      if (senateData.length > 0) {
        bopData.senate = senateData;
      }
      if (houseData.length > 0) {
        bopData.house = houseData;
      }
    }

    // Update cache
    cachedBOPData = {
      data: bopData,
      year,
      timestamp: new Date().toISOString()
    };

    return bopData;
  } catch (error) {
    console.error('Failed to fetch BOP data:', error);

    // Return empty data on error
    return {
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Calculate majority threshold for a chamber
 */
export function getMajorityThreshold(raceType: 'senate' | 'house'): number {
  return raceType === 'senate' ? 51 : 218;
}

/**
 * Determine which party controls a chamber
 */
export function determineControl(bopData: BOPPartyResult[]): {
  controller: string | null;
  demSeats: number;
  repSeats: number;
  otherSeats: number;
  majorityThreshold: number;
} {
  const demData = bopData.find(p => p.party_name === 'Dem');
  const repData = bopData.find(p => p.party_name === 'GOP');

  // Handle all "Others" variants as independents
  const othersData = bopData.filter(p =>
    p.party_name === 'Others' ||
    p.party_name === 'Others caucus with Dem' ||
    p.party_name === 'Others caucus with GOP'
  );

  const demSeats = demData?.winning_trend || 0;
  const repSeats = repData?.winning_trend || 0;
  const otherSeats = othersData.reduce((sum, p) => sum + (p.winning_trend || 0), 0);
  const totalSeats = bopData[0]?.total_seats || (bopData[0]?.race_type === 'senate' ? 100 : 435);
  const majorityThreshold = Math.floor(totalSeats / 2) + 1;

  let controller: string | null = null;
  if (demSeats >= majorityThreshold) {
    controller = 'Democratic';
  } else if (repSeats >= majorityThreshold) {
    controller = 'Republican';
  }

  return {
    controller,
    demSeats,
    repSeats,
    otherSeats,
    majorityThreshold
  };
}

/**
 * Get formatted BOP summary for display
 */
export function getBOPSummary(bopData: BOPPartyResult[]): {
  demWon: number;
  demLeading: number;
  demTotal: number;
  repWon: number;
  repLeading: number;
  repTotal: number;
  indWon: number;
  indLeading: number;
  indTotal: number;
  undecided: number;
  majorityThreshold: number;
  controller: string | null;
} {
  const demData = bopData.find(p => p.party_name === 'Dem');
  const repData = bopData.find(p => p.party_name === 'GOP');

  // Handle all "Others" variants as independents
  const othersData = bopData.filter(p =>
    p.party_name === 'Others' ||
    p.party_name === 'Others caucus with Dem' ||
    p.party_name === 'Others caucus with GOP'
  );

  const totalSeats = bopData[0]?.total_seats || (bopData[0]?.race_type === 'senate' ? 100 : 435);
  const majorityThreshold = Math.floor(totalSeats / 2) + 1;

  const demWon = demData?.won || 0;
  const demLeading = demData?.leading || 0;
  const demTotal = demData?.winning_trend || 0;

  const repWon = repData?.won || 0;
  const repLeading = repData?.leading || 0;
  const repTotal = repData?.winning_trend || 0;

  // Sum up all "Others" variants as independents
  const indWon = othersData.reduce((sum, p) => sum + (p.won || 0), 0);
  const indLeading = othersData.reduce((sum, p) => sum + (p.leading || 0), 0);
  const indTotal = othersData.reduce((sum, p) => sum + (p.winning_trend || 0), 0);

  const undecided = totalSeats - demTotal - repTotal - indTotal;

  let controller: string | null = null;
  if (demTotal >= majorityThreshold) {
    controller = 'Democratic';
  } else if (repTotal >= majorityThreshold) {
    controller = 'Republican';
  }

  return {
    demWon,
    demLeading,
    demTotal,
    repWon,
    repLeading,
    repTotal,
    indWon,
    indLeading,
    indTotal,
    undecided,
    majorityThreshold,
    controller
  };
}