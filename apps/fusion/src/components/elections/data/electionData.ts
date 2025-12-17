export type PresidentialYear = 2012 | 2016 | 2020 | 2024;
export type SenateYear = 2012 | 2014 | 2016 | 2018 | 2020 | 2022 | 2024;
export type HouseYear = 2012 | 2014 | 2016 | 2018 | 2020 | 2022 | 2024;
export type ElectionYear = PresidentialYear | SenateYear | HouseYear;

export type ElectionType = 'presidential' | 'senate' | 'house';

import { getPresidentialElectionData } from './presidentialElectionStateData';
import { getSenateElectionData } from './senateElectionStateData';
import { houseElectionStateData } from './houseElectionStateData';
import { getPresidentialCountyElectionData } from './presidentialElectionCountyData';
import { getSenateCountyElectionData } from './senateElectionCountyData';
import { getHouseElectionDistrictData } from './houseElectionDistrictData';
import { getBopData, getAllBopData, BopSummary } from './bopData';

export interface PartyInfo {
  name: string;
  color: string;
}

export interface CandidateInfo {
  name: string;
  party_code: string;
  img?: string;
  party_name?: string;
}

export interface CandidateResult {
  votes: number;
  percent: number;
  winner: boolean;
  electoralVotes?: number;
  electoralVote?: number;
}

export interface GeoResult {
  [candidateId: string]: CandidateResult | number | undefined;
}

export interface ElectionData {
  year: ElectionYear;
  description: string;
  candidates: { [candidateId: string]: CandidateInfo };
  parties: { [partyCode: string]: PartyInfo };
  results: { [geoId: string]: GeoResult };
  winner?: string;
  winnerImg?: string;
  senateControl?: string;
  houseControl?: string;
}

export interface DisplayResult {
  candidates: { [candidateId: string]: CandidateResult };
  candidateInfo: { [candidateId: string]: CandidateInfo };
  parties: { [partyCode: string]: PartyInfo };
  winner?: string;
  electoralVotes?: number;
  isCounty?: boolean;
  isDistrict?: boolean;
  percent_reporting?: number;
}

// Get election data for a specific type and year
export async function getElectionData(type: ElectionType, year: ElectionYear): Promise<ElectionData | null> {
  let data: any = null;

  if (type === 'presidential') {
    data = await getPresidentialElectionData(year as PresidentialYear);
    
  } else if (type === 'senate') {
    data = await getSenateElectionData(year as SenateYear);
  } else if (type === 'house') {
    data = houseElectionStateData[year as HouseYear];
  }

  console.log('pppppdata_'+type);
  console.log(data);

  return data || null;
}

// Get county-level election data for a specific type and year
export async function getCountyElectionData(type: ElectionType, year: ElectionYear): Promise<ElectionData | null> {
  let data: any = null;

  if (type === 'presidential') {
    data = await getPresidentialCountyElectionData(year as PresidentialYear);
  } else if (type === 'senate') {
    data = await getSenateCountyElectionData(year as SenateYear);
  }
  // House elections use district data, not county data

  console.log('county_data_' + type);
  console.log(data);

  return data || null;
}

// Helper function to get county result by FIPS code
export function getCountyResult(
  countyElectionData: ElectionData | null,
  fips: string
): GeoResult | null {
  if (!countyElectionData || !countyElectionData.results) {
    return null;
  }
  return countyElectionData.results[fips] || null;
}

// Function to get district election data (now async to fetch from Supabase)
export async function getDistrictElectionData(type: ElectionType, year: ElectionYear): Promise<ElectionData | null> {
  console.log('Getting district data for Type:', type, 'Year:', year);

  if (type === 'house') {
    const data = await getHouseElectionDistrictData(year as HouseYear);
    console.log('House district data fetched:', data ? 'SUCCESS' : 'NULL');
    return data as any;
  }

  // Presidential and senate don't use district data
  console.log('No district data for type:', type);
  return null;
}

// Get available years for a specific election type
// Simple function that returns hardcoded arrays
export function getAvailableYears(type: ElectionType): ElectionYear[] {
  // Hardcode the available years
  const AVAILABLE_YEARS = {
    presidential: [2024, 2020, 2016, 2012] as PresidentialYear[],
    senate: [2024, 2022, 2020, 2018, 2016, 2014, 2012] as SenateYear[], // adjust based on your actual years
    house: [2024, 2022, 2020, 2018, 2016, 2014, 2012] as HouseYear[] // adjust based on your actual years
  };
  return AVAILABLE_YEARS[type] || [];
}

// Helper function to get winner party name from result
export function getWinnerPartyName(
  result: GeoResult,
  candidates: { [candidateId: string]: CandidateInfo },
  parties: { [partyCode: string]: PartyInfo }
): string {
  for (const [candidateId, candidateResult] of Object.entries(result)) {
    if (candidateId === 'stateElectoralVote' || candidateId === 'stateElectoralVotes') continue;

    const cr = candidateResult as CandidateResult;
    if (cr.winner) {
      const candidateInfo = candidates[candidateId];
      if (candidateInfo) {
        const partyInfo = parties[candidateInfo.party_code];
        if (partyInfo) {
          return partyInfo.name;
        }
      }
    }
  }
  return 'Unknown';
}

// Helper function to get winner party color from result
export function getWinnerPartyColor(
  result: GeoResult,
  candidates: { [candidateId: string]: CandidateInfo },
  parties: { [partyCode: string]: PartyInfo }
): string {
  for (const [candidateId, candidateResult] of Object.entries(result)) {
    if (candidateId === 'stateElectoralVote' || candidateId === 'stateElectoralVotes') continue;

    const cr = candidateResult as CandidateResult;
    if (cr.winner) {
      const candidateInfo = candidates[candidateId];
      if (candidateInfo) {
        const partyInfo = parties[candidateInfo.party_code];
        if (partyInfo) {
          const color = partyInfo.color;
          return color.startsWith('#') ? color : `#${color}`;
        }
      }
    }
  }
  return '#9CA3AF'; // Default gray
}

// Export BOP data functions
export { getBopData, getAllBopData };
export type { BopSummary };
