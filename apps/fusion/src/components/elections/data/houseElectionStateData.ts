import { electoralVotes } from './stateData';

export type HouseYear = 2012 | 2014 | 2016 | 2018 | 2020 | 2022 | 2024;

export interface HouseCandidateResult {
  votes: number;
  percent: number;
  winner: boolean;
}

export interface HouseStateResult {
  [candidateId: string]: HouseCandidateResult | string;
}

export interface HousePartyInfo {
  name: string;
  color: string;
}

export interface HouseCandidateInfo {
  name: string;
  party_code: string;
  party_name?: string;
  img?: string;
}

export interface HouseElectionData {
  year: number;
  description: string;
  candidates: { [candidateId: string]: HouseCandidateInfo };
  parties: { [partyCode: string]: HousePartyInfo };
  results: { [stateCode: string]: HouseStateResult };
}

// Define all state codes (50 states + DC)
const stateCodes = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

// Define the election years
const electionYears = [2024, 2022, 2020, 2018, 2016, 2014, 2012];

// Create the object
const generatedHouseElectionStateData: { [year: number]: HouseElectionData } = {};

// Fill it dynamically
for (const year of electionYears) {
  generatedHouseElectionStateData[year] = {
    year,
    description: `${year} United States House Election`,
    candidates: {},
    parties: {},
    results: Object.fromEntries(stateCodes.map(code => [code, {}]))
  };
}

// Finally export it
export const houseElectionStateData: { [year: number]: HouseElectionData } = generatedHouseElectionStateData;