import { supabase } from '../../../supabaseClient';

export interface BopDataItem {
  race_type: string;
  election_year: number;
  party_code: string;
  winning_trend: number;
}

export interface BopSummary {
  [partyCode: string]: number;
}

/**
 * Fetch Balance of Power data from Supabase for a specific race type and year
 * @param raceType - Either 'senate' or 'house'
 * @param year - Election year
 * @returns BopSummary object with party codes as keys and seat counts as values
 */
export async function getBopData(raceType: 'senate' | 'house', year: number): Promise<BopSummary> {
  console.log(`🏛️ Fetching BOP data for ${raceType} ${year}...`);

  try {
    const { data, error } = await supabase
      .from('bop_election_summary')
      .select('race_type, election_year, party_name, winning_trend')
      .eq('race_type', raceType)
      .eq('election_year', year);

    if (error) {
      console.error('🔴 Error fetching BOP data:', error);
      return {};
    }

    if (!data || data.length === 0) {
      console.log(`🟡 No BOP data found for ${raceType} ${year}`);
      return {};
    }

    console.log(`🟢 Fetched ${data.length} BOP entries for ${raceType} ${year}`);

    // Transform array into object with party_code as key and winning_trend as value
    const bopSummary: BopSummary = {};
    data.forEach((item: any) => {
      const party_code = item.party_name;
      bopSummary[party_code] = item.winning_trend;
    });

    console.log('🏛️ BOP Summary:', bopSummary);

    return bopSummary;
  } catch (error) {
    console.error('🔴 Exception fetching BOP data:', error);
    return {};
  }
}

/**
 * Fetch BOP data for both Senate and House for a specific year
 * @param year - Election year
 * @returns Object with senate and house BOP summaries
 */
export async function getAllBopData(year: number): Promise<{
  senate: BopSummary;
  house: BopSummary;
}> {
  console.log(`🏛️ Fetching all BOP data for ${year}...`);

  const [senateData, houseData] = await Promise.all([
    getBopData('senate', year),
    getBopData('house', year)
  ]);

  return {
    senate: senateData,
    house: houseData
  };
}