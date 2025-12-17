// Override tracking for individual fields
export interface FieldOverride<T = any> {
  originalValue: T;
  overriddenValue: T;
  isOverridden: boolean;
  overriddenAt?: string;
  overriddenBy?: string;
  reason?: string;
}

// Enhanced candidate with override support
export interface Candidate {
  id: string;
  ap_candidate_id?: string; // Original AP ID
  candidate_results_id?: string; // Database ID for candidate results
  race_candidates_id?: string; // Database ID for race candidates
  name: string | FieldOverride<string>;
  original_name?: string;
  party: ('DEM' | 'REP' | 'IND' | 'GRN' | 'LIB' | 'OTH') | FieldOverride<'DEM' | 'REP' | 'IND' | 'GRN' | 'LIB' | 'OTH'>;
  votes: number | FieldOverride<number>;
  percentage: number | FieldOverride<number>; // Can be overridden for display
  incumbent: boolean | FieldOverride<boolean>;
  original_incumbent?: boolean;
  winner?: boolean | FieldOverride<boolean>;
  withdrew?: boolean | FieldOverride<boolean>;
  headshot?: string | FieldOverride<string>; // Candidate photo URL
  // Additional AP fields
  first_name?: string;
  last_name?: string;
  ballot_order?: number;
  ElectoralVotes?: number; // Electoral votes won by this candidate (for presidential races)
}

// Enhanced race with override support
export interface Race {
  id: string;
  race_id: string; // UUID from e_races table
  race_results_id: string;
  election_id: string; // UUID from e_elections table
  candidate_results_id: string;
  ap_race_id?: string; // Original AP Race ID
  synthetic_race_id?: string; // UUID from e_synthetic_races table (for synthetic races only)
  title: string | FieldOverride<string>;
  office: string | FieldOverride<string>;
  state: string;
  district?: string;
  year: string; // Election year
  raceType: ('PRESIDENTIAL' | 'SENATE' | 'HOUSE' | 'GOVERNOR' | 'LOCAL') | FieldOverride<'PRESIDENTIAL' | 'SENATE' | 'HOUSE' | 'GOVERNOR' | 'LOCAL'>;
  status: ('NOT_CALLED' | 'PROJECTED' | 'CALLED' | 'RECOUNT') | FieldOverride<'NOT_CALLED' | 'PROJECTED' | 'CALLED' | 'RECOUNT'>;
  reportingPercentage: number | FieldOverride<number>;
  totalVotes: number | FieldOverride<number>; // Can be overridden for display
  lastUpdated: string;
  lastApUpdate?: string; // When AP data was last fetched
  candidates: Candidate[];
  // Additional AP fields
  precincts_reporting?: number | FieldOverride<number>;
  precincts_total?: number;
  called_timestamp?: string | FieldOverride<string>;
  uncontested?: boolean;
  num_elect?: number;
  ElectoralVotes?: number; // For presidential races
  // AI/Synthetic race fields
  summary?: string | { text: string }; // AI-generated summary for synthetic races
  scenario_input?: {
    name?: string;
    aiProvider?: string;
    override_by?: string | null;
    turnoutShift?: number;
    democratShift?: number;
    countyStrategy?: string;
    republicanShift?: number;
    independentShift?: number;
    customInstructions?: string;
  };
}

// Political Party with detailed information
export interface Party {
  id: string;
  code: 'DEM' | 'REP' | 'IND' | 'GRN' | 'LIB' | 'OTH';
  name: string;
  fullName: string;
  abbreviations: string[];
  aliases: string[];
  color: string; // Primary party color
  colors: {
    primary: string;
    secondary: string;
    light: string;
    dark: string;
  };
  logo?: string;
  founded?: string;
  ideology?: string;
  headquarters?: string;
  leaders?: {
    title: string;
    name: string;
    since?: string;
  }[];
  description?: string;
  history?: string;
  website?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
}

// Full Candidate Profile (extends basic candidate data)
export interface CandidateProfile {
  id: string;
  ap_candidate_id?: string;
  candidate_id?: string; // From search results
  candidate_results_id?: string; // Database ID for candidate results
  firstName?: string;
  lastName?: string;
  fullName?: string;
  full_name?: string; // From search results
  display_name?: string; // From search results
  short_name?: string; // From search results
  originalName?: string; // Original name before any overrides
  party?: 'DEM' | 'REP' | 'IND' | 'GRN' | 'LIB' | 'OTH';
  party_id?: string; // From search results
  party_name?: string; // From search results (e.g., "Democratic Party")
  party_abbreviation?: string; // From search results (e.g., "Dem")
  headshot?: string;
  photov?: string; // From search results - alternate field name
  photo_url?: string; // From search results - alternate field name
  bio?: string;
  birthDate?: string;
  birthPlace?: string;
  education?: string[];
  occupation?: string[]; // Changed from string to string[]
  experience?: string[];
  currentRaces?: string[]; // Race IDs
  pastRaces?: {
    year: string;
    office: string;
    result: 'WON' | 'LOST';
  }[];
  endorsements?: string[];
  website?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  fundraising?: {
    total: number;
    lastQuarter: number;
  };
  incumbent?: boolean;
  originalIncumbent?: boolean; // Original incumbent status before any overrides
}

export interface ElectionData {
  races: Race[];
  candidates?: CandidateProfile[];
  parties?: Party[];
  lastUpdated: string;
  lastApSync?: string;
}

// Helper functions for working with overrides
export function isFieldOverridden<T>(field: T | FieldOverride<T>): field is FieldOverride<T> {
  return typeof field === 'object' && field !== null && 'isOverridden' in field;
}

export function getFieldValue<T>(field: T | FieldOverride<T>): T {
  if (isFieldOverridden(field)) {
    return field.isOverridden ? field.overriddenValue : field.originalValue;
  }
  return field;
}

export function getOriginalValue<T>(field: T | FieldOverride<T>): T {
  if (isFieldOverridden(field)) {
    return field.originalValue;
  }
  return field;
}

export function createOverride<T>(originalValue: T, overriddenValue: T, reason?: string): FieldOverride<T> {
  return {
    originalValue,
    overriddenValue,
    isOverridden: true,
    overriddenAt: new Date().toISOString(),
    reason
  };
}

export function revertOverride<T>(field: FieldOverride<T>): T {
  return field.originalValue;
}