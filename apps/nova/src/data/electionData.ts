import { ElectionData, Race, Candidate, CandidateProfile, Party, createOverride } from '../types/election';
import { currentElectionYear } from '../utils/constants';
import { supabase, sessionReady } from '../utils/supabase/client';

// State name mapping
const stateNames: Record<string, string> = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

// Cache interface
interface CachedData {
  data: ElectionData;
  lastFetchedAt: string;
  dataVersion: string;
}

// Pagination metadata interface
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalRaces: number;
  totalPages: number;
}

// Result with pagination
export interface ElectionDataWithPagination extends ElectionData {
  pagination: PaginationInfo;
}

// In-memory cache
let cachedElectionData: CachedData | null = null;

// Helper function to get district number from FIPS code
function getDistrictFromFips(fipsCode: string | null): string | undefined {
  if (!fipsCode) return undefined;
  const lastTwoDigits = fipsCode.slice(-2);
  const districtNum = parseInt(lastTwoDigits, 10);
  if (isNaN(districtNum)) return undefined;
  return districtNum.toString();
}

// Helper function to format race type
function formatRaceType(type: string): string {
  switch (type.toLowerCase()) {
    case 'presidential':
      return 'PRESIDENTIAL';
    case 'senate':
      return 'SENATE';
    case 'house':
      return 'HOUSE';
    case 'governor':
      return 'GOVERNOR';
    default:
      return type.toUpperCase();
  }
}

// Helper function to determine race status
function getRaceStatus(called: boolean | null): string {
  return called === false || called === null ? 'NOT_CALLED' : 'CALLED';
}

// Helper function to format title based on race type and location
function formatRaceTitle(
  electionTitle: string,
  raceType: string,
  stateCode: string | null,
  fipsCode: string | null,
  divisionType: string,
  year: string
): string {
  const stateName = stateCode ? stateNames[stateCode] : null;

  // For house elections with districts
  if (raceType === 'house' && fipsCode) {
    const district = getDistrictFromFips(fipsCode);
    if (stateName && district) {
      return `${stateName} District ${district} House Election ${year}`;
    }
  }

  // For senate elections
  if (raceType === 'senate') {
    return `${stateName} Senate Election ${year}`; // State level
  }

  // For presidential elections
  if (raceType === 'presidential') {
    if (divisionType === 'national') {
      return `National Presidential Election ${year}`; // National level
    } else if (stateName) {
      return `${stateName} Presidential Election ${year}`; // State level
    }
  }

  // For senate and other races
  if (stateName && raceType !== 'presidential') {
    return `${stateName} ${electionTitle}`;
  }

  return electionTitle;
}

// Main function to fetch election data from Supabase using RPC for better performance
async function fetchElectionDataFromSupabase(year?: number): Promise<any[]> {
  // Wait for session to be initialized (with timeout to prevent blocking)
  // Note: The RPC function is SECURITY DEFINER so it bypasses RLS anyway,
  // but we still wait to ensure the Supabase client is ready
  try {
    await Promise.race([
      sessionReady,
      new Promise((_, reject) => setTimeout(() => reject(new Error('sessionReady timeout')), 5000))
    ]);
  } catch (e) {
    console.warn('[electionData] sessionReady timed out, proceeding anyway:', e);
  }

  const allResults: any[] = [];

  console.log('Fetching election data from Supabase...', year ? `for year ${year}` : 'all years');

  // Fetch all data in one go with a large limit (RPC functions don't paginate well with .range())
  // The default Supabase limit is 1000, so we must explicitly set a higher limit
  const { data, error } = await supabase
    .rpc('fetch_election_data_for_ui', { p_year: year || null })
    .limit(50000); // Set a high limit to get all rows

  if (error) {
    console.error('Error fetching election data:', error);
    throw error;
  }

  if (data && data.length > 0) {
    allResults.push(...data);
    console.log(`Fetched ${data.length} rows from RPC`);

    // Debug: Log the first row to see what fields are available
    console.log('🔍 First row from RPC - checking election ID fields:', {
      election_id: data[0].election_id,
      election_uuid: data[0].election_uuid,
      available_election_fields: Object.keys(data[0]).filter(k => k.includes('election')),
      sample_full_row: data[0]
    });
  }

  console.log(`Total election data rows fetched: ${allResults.length}`);
  return allResults;
}

// New paginated function - fetches from server with filters applied at database level
async function fetchElectionDataPaginated(
  year?: number,
  raceType?: string,
  page: number = 1,
  pageSize: number = 50,
  effectiveOrgId?: string  // For superuser impersonation
): Promise<{ data: any[], pagination: PaginationInfo }> {
  // Wait for session to be initialized
  try {
    await Promise.race([
      sessionReady,
      new Promise((_, reject) => setTimeout(() => reject(new Error('sessionReady timeout')), 5000))
    ]);
  } catch (e) {
    console.warn('[electionData] sessionReady timed out, proceeding anyway:', e);
  }

  console.log(`[fetchElectionDataPaginated] Fetching page ${page} with pageSize ${pageSize}`, {
    year, raceType, effectiveOrgId
  });

  // Call the new paginated RPC function with org filter support
  const { data, error } = await supabase
    .rpc('fetch_election_data_paginated', {
      p_year: year || null,
      p_race_type: raceType || null,
      p_page: page,
      p_page_size: pageSize,
      p_effective_org_id: effectiveOrgId || null  // Pass impersonated org ID
    });

  if (error) {
    console.error('Error fetching paginated election data:', error);
    throw error;
  }

  // Extract pagination info from first row (all rows have the same total counts)
  const totalRaces = data && data.length > 0 ? Number(data[0].total_races) : 0;
  const totalPages = Math.ceil(totalRaces / pageSize);

  console.log(`[fetchElectionDataPaginated] Fetched ${data?.length || 0} rows, ${totalRaces} total races, ${totalPages} pages`);

  return {
    data: data || [],
    pagination: {
      currentPage: page,
      pageSize,
      totalRaces,
      totalPages
    }
  };
}

// Transform Supabase data to match ElectionData format
function transformToElectionData(rawData: any[], filterYear?: number, filterRaceType?: string): ElectionData {
  const now = new Date().toISOString();

  // Group data by race
  const racesMap = new Map<string, any[]>();
  let lastApSync: string | null = null;
  const yearsInData = new Set<number>();
  const raceTypesInData = new Set<string>();

  rawData.forEach(row => {
    // Get the last AP sync time from the first row
    if (!lastApSync && row.last_fetch_at) {
      lastApSync = row.last_fetch_at;
    }

    // Track years and race types in the data
    yearsInData.add(row.year);
    raceTypesInData.add(row.race_type);

    // Filter by year and race type if specified
    if (filterYear && row.year !== filterYear) {
      // Debug first few mismatches
      if (racesMap.size < 3) {
        console.log('[transformToElectionData] Year mismatch:', { filterYear, rowYear: row.year, rowYearType: typeof row.year });
      }
      return;
    }
    if (filterRaceType && row.race_type !== filterRaceType) {
      // Debug first few mismatches
      if (racesMap.size < 3) {
        console.log('[transformToElectionData] RaceType mismatch:', { filterRaceType, rowRaceType: row.race_type });
      }
      return;
    }

    const raceKey = `${row.race_type}-${row.year}-${row.race_race_id}`;

    if (!racesMap.has(raceKey)) {
      racesMap.set(raceKey, []);
    }
    racesMap.get(raceKey)!.push(row);
  });

  // Transform races and sort them properly
  const races: Race[] = Array.from(racesMap.entries()).map(([raceKey, raceRows]) => {
    const firstRow = raceRows[0];

    // Determine state/location
    let state = 'National';
    let district: string | undefined;

    if (firstRow.division_type === 'state' && firstRow.state_code) {
      state = stateNames[firstRow.state_code] || firstRow.state_code;
    } else if (firstRow.division_type === 'district') {
      const stateCode = firstRow.state_code?.substring(0, 2);
      if (stateCode) {
        state = stateNames[stateCode] || stateCode;
      }
      district = getDistrictFromFips(firstRow.fips_code);
    }

    // Build candidates array
    const candidatesMap = new Map<string, Candidate>();

    raceRows.forEach(row => {
      const candidateId = row.candidate_id;

      if (!candidatesMap.has(candidateId)) {
        // Debug party_code for specific candidates
        if (row.full_name && (row.full_name.includes('Obama') || row.full_name.includes('Harris') || row.full_name.includes('Trump'))) {
          console.log(`Candidate party debug - ${row.full_name}:`, {
            party_code: row.party_code,
            party_override: row.party_override,
            will_use: row.party_override !== null && row.party_override !== undefined ? row.party_override : (row.party_code || 'IND')
          });
        }

        const candidateObj: Candidate = {
          id: candidateId,
          ap_candidate_id: candidateId, // Use the candidate_id as-is (it's already in format ap_candidate_xxx)
          candidate_results_id: row.candidate_results_id,
          race_candidates_id: row.race_candidates_id,
          name: row.candidate_display_name !== null && row.candidate_display_name !== undefined && row.candidate_display_name
            ? createOverride(row.full_name || '', row.candidate_display_name, row.candidate_override_reason || 'Modified via UI')
            : (row.full_name || ''),
          original_name: row.full_name,
          first_name: row.first_name,
          last_name: row.last_name,
          party: (row.party_code || 'IND') as Candidate['party'],
          // Use createOverride if override value exists
          votes: row.votes_override !== null && row.votes_override !== undefined
            ? createOverride(row.votes || 0, row.votes_override, row.candidate_override_reason || 'Modified via UI')
            : (row.votes || 0),
          percentage: row.vote_percentage_override !== null && row.vote_percentage_override !== undefined
            ? createOverride(row.vote_percentage || 0, row.vote_percentage_override, row.candidate_override_reason || 'Modified via UI')
            : (row.vote_percentage || 0),
          incumbent: row.incumbent_override !== null && row.incumbent_override !== undefined
            ? createOverride(row.incumbent || false, row.incumbent_override, row.candidate_override_reason || 'Modified via UI')
            : (row.incumbent || false),
          original_incumbent: row.incumbent,
          winner: row.winner_override !== null && row.winner_override !== undefined
            ? createOverride(row.winner || false, row.winner_override, row.candidate_override_reason || 'Modified via UI')
            : (row.winner || false),
          withdrew: row.withdrew_override !== null && row.withdrew_override !== undefined
            ? createOverride(row.withdrew || false, row.withdrew_override, row.candidate_override_reason || 'Modified via UI')
            : (row.withdrew || false),
          headshot: row.photo_url || undefined,
          ballot_order: row.ballot_order,
          ElectoralVotes: row.electoral_votes_override !== null && row.electoral_votes_override !== undefined
            ? createOverride(row.electoral_votes || undefined, row.electoral_votes_override, row.candidate_override_reason || 'Modified via UI')
            : (row.electoral_votes || undefined)
        };

        candidatesMap.set(candidateId, candidateObj);
      }
    });

    const candidates = Array.from(candidatesMap.values())
      .sort((a, b) => {
        const votesA = typeof a.votes === 'number' ? a.votes : 0;
        const votesB = typeof b.votes === 'number' ? b.votes : 0;
        return votesB - votesA;
      });

    // Calculate total votes (not used for now)
    const totalVotes = candidates.reduce((sum, c) => {
      const votes = typeof c.votes === 'number' ? c.votes : 0;
      return sum + votes;
    }, 0);

    // Helper function to get race status with override support
    const getRaceStatusWithOverride = (row: any): Race['status'] => {
      if (row.called_override !== null && row.called_override !== undefined) {
        const originalStatus = getRaceStatus(row.called);
        const overrideStatus = getRaceStatus(row.called_override);
        return createOverride(
          originalStatus as ('NOT_CALLED' | 'PROJECTED' | 'CALLED' | 'RECOUNT'),
          overrideStatus as ('NOT_CALLED' | 'PROJECTED' | 'CALLED' | 'RECOUNT'),
          row.race_override_reason || 'Modified via UI'
        );
      }
      return getRaceStatus(row.called) as ('NOT_CALLED' | 'PROJECTED' | 'CALLED' | 'RECOUNT');
    };

    const title = formatRaceTitle(firstRow.election_name, firstRow.race_type, firstRow.state_code, firstRow.fips_code, firstRow.division_type, firstRow.year);

    const raceObj: Race = {
      id: raceKey,
      race_id: firstRow.race_id,
      race_results_id: firstRow.race_results_id,
      election_id: firstRow.election_uuid || firstRow.election_id, // UUID from e_elections.id (NOT election_id string code!)
      ap_race_id: `AP-${firstRow.race_type.toUpperCase()}-${firstRow.year}-${firstRow.race_race_id}`,
      synthetic_race_id: firstRow.synthetic_race_id || undefined, // Include synthetic_race_id if available
      office: firstRow.office,
      state,
      district,
      year: firstRow.year.toString(),
      raceType: formatRaceType(firstRow.race_type) as Race['raceType'],
      // Handle status override
      //status: getRaceStatusWithOverride(firstRow),
      status: firstRow.called_status_override !== null && firstRow.called_status_override !== undefined 
        ? createOverride(firstRow.called_status || 0, firstRow.called_status_override, firstRow.race_override_reason || 'Modified via UI')
        : (firstRow.called_status || 'NOT_CALLED'),
      // Handle title (race name) override
      title: firstRow.race_display_name !== null && firstRow.race_display_name !== undefined && firstRow.race_display_name
        ? createOverride(title, firstRow.race_display_name, firstRow.race_override_reason || 'Modified via UI') : title,
      // Handle reportingPercentage override
      reportingPercentage: firstRow.percent_reporting_override !== null && firstRow.percent_reporting_override !== undefined
        ? createOverride(firstRow.percent_reporting || 0, firstRow.percent_reporting_override, firstRow.race_override_reason || 'Modified via UI')
        : (firstRow.percent_reporting || 0),
      // Handle totalVotes override
      totalVotes: firstRow.total_votes_override !== null && firstRow.total_votes_override !== undefined
        ? createOverride(totalVotes, firstRow.total_votes_override, firstRow.race_override_reason || 'Modified via UI')
        : firstRow.total_votes,
      lastUpdated: now,
      lastApUpdate: firstRow.last_updated || now,
      // Handle precincts_reporting override
      precincts_reporting: firstRow.precincts_reporting_override !== null && firstRow.precincts_reporting_override !== undefined
        ? createOverride(firstRow.precincts_reporting || 0, firstRow.precincts_reporting_override, firstRow.race_override_reason || 'Modified via UI')
        : (firstRow.precincts_reporting || 0),
      precincts_total: firstRow.precincts_total_override !== null && firstRow.precincts_total_override !== undefined
        ? createOverride(firstRow.precincts_total || 0, firstRow.precincts_total_override, firstRow.race_override_reason || 'Modified via UI')
        : (firstRow.precincts_total || 0),
      // Handle called_timestamp override
      called_timestamp: firstRow.called_override_timestamp !== null && firstRow.called_override_timestamp !== undefined
        ? createOverride(firstRow.called_timestamp, firstRow.called_override_timestamp, firstRow.race_override_reason || 'Modified via UI')
        : firstRow.called_timestamp,
      num_elect: firstRow.num_elect || 1,
      ElectoralVotes: firstRow.state_electoral_votes || firstRow.electoral_votes || undefined,
      uncontested: firstRow.uncontested || false,
      summary: firstRow.summary || firstRow.race_summary || undefined,
      candidates
    };

    return raceObj;
  });

  // Sort races properly: National first for presidential, then by state name, then by district
  races.sort((a, b) => {
    // First sort by year (most recent first)
    if (a.year !== b.year) {
      return parseInt(b.year) - parseInt(a.year);
    }

    // Then by race type (presidential, senate, house)
    const typeOrder = { 'PRESIDENTIAL': 0, 'SENATE': 1, 'HOUSE': 2, 'GOVERNOR': 3 };
    const aTypeOrder = typeOrder[a.raceType as keyof typeof typeOrder] ?? 99;
    const bTypeOrder = typeOrder[b.raceType as keyof typeof typeOrder] ?? 99;
    if (aTypeOrder !== bTypeOrder) {
      return aTypeOrder - bTypeOrder;
    }

    // For presidential races, National comes first
    if (a.raceType === 'PRESIDENTIAL') {
      if (a.state === 'National' && b.state !== 'National') return -1;
      if (a.state !== 'National' && b.state === 'National') return 1;
    }

    // Then sort by state name
    if (a.state !== b.state) {
      return a.state.localeCompare(b.state);
    }

    // Finally, for house races, sort by district number
    if (a.district && b.district) {
      return parseInt(a.district) - parseInt(b.district);
    }

    return 0;
  });

  // Build unique candidates list for the candidates section
  const uniqueCandidatesMap = new Map<string, CandidateProfile>();

  races.forEach(race => {
    race.candidates.forEach(candidate => {
      // For presidential races, only include National level in currentRaces
      const shouldIncludeRace = race.raceType !== 'PRESIDENTIAL' || race.state === 'National';

      if (!uniqueCandidatesMap.has(candidate.id)) {
        // Get the additional fields from the raw data for this candidate
        const candidateRow = rawData.find(row => row.candidate_id === candidate.id);

        const profile: CandidateProfile = {
          id: candidate.id,
          ap_candidate_id: candidate.ap_candidate_id || '',
          candidate_results_id: candidate.candidate_results_id || '',
          firstName: candidate.first_name || '',
          lastName: candidate.last_name || '',
          fullName: typeof candidate.name === 'object' ? candidate.name.overriddenValue : candidate.name,
          originalName: candidate.original_name,
          party: typeof candidate.party === 'string' ? candidate.party : (candidate.party && typeof candidate.party === 'object' ? (candidate.party.overriddenValue || candidate.party.originalValue) : 'IND'),
          incumbent: candidate.incumbent || false,
          originalIncumbent: candidate.original_incumbent,
          headshot: typeof candidate.headshot === 'string' ? candidate.headshot : undefined,
          currentRaces: shouldIncludeRace ? [race.id] : [],
          // Add new fields from database
          bio: candidateRow?.bio || undefined,
          birthDate: candidateRow?.date_of_birth || undefined,
          birthPlace: candidateRow?.bio_short || undefined,
          education: candidateRow?.education || undefined,
          occupation: candidateRow?.professional_background || undefined,
          experience: candidateRow?.political_experience || undefined,
          website: candidateRow?.website || undefined
        };
        uniqueCandidatesMap.set(candidate.id, profile);
      } else {
        const existing = uniqueCandidatesMap.get(candidate.id)!;
        if (shouldIncludeRace && existing.currentRaces && !existing.currentRaces.includes(race.id)) {
          existing.currentRaces.push(race.id);
        }
      }
    });
  });

  // Filter out candidates with no current races (after filtering)
  const candidates = Array.from(uniqueCandidatesMap.values())
    .filter(candidate => candidate.currentRaces && candidate.currentRaces.length > 0);

  // Default party configurations
  const defaultParties: Record<string, Party> = {
    'Dem': {
      id: 'dem',
      code: 'DEM',
      name: 'Democratic Party',
      fullName: 'Democratic Party',
      abbreviations: ['DEM', 'D', 'Dem', 'Democratic'],
      aliases: ['Democrats', 'Dems'],
      color: '#0015BC',
      colors: {
        primary: '#0015BC',
        secondary: '#2E5EAA',
        light: '#6B9BD1',
        dark: '#001F7A'
      }
    },
    'REP': {
      id: 'rep',
      code: 'REP',
      name: 'Republican Party',
      fullName: 'Republican Party',
      abbreviations: ['REP', 'R', 'Rep', 'Republican', 'GOP'],
      aliases: ['Republicans', 'GOP', 'Grand Old Party'],
      color: '#E81B23',
      colors: {
        primary: '#E81B23',
        secondary: '#C8102E',
        light: '#FF6B6B',
        dark: '#A50C15'
      }
    },
    'GOP': {
      id: 'rep',
      code: 'REP',
      name: 'Republican Party',
      fullName: 'Republican Party',
      abbreviations: ['REP', 'R', 'Rep', 'Republican', 'GOP'],
      aliases: ['Republicans', 'GOP', 'Grand Old Party'],
      color: '#E81B23',
      colors: {
        primary: '#E81B23',
        secondary: '#C8102E',
        light: '#FF6B6B',
        dark: '#A50C15'
      }
    },
    'Ind': {
      id: 'ind',
      code: 'IND',
      name: 'Independent',
      fullName: 'Independent',
      abbreviations: ['IND', 'I', 'Ind'],
      aliases: ['Independents', 'Non-partisan'],
      color: '#9333EA',
      colors: {
        primary: '#9333EA',
        secondary: '#7C3AED',
        light: '#C084FC',
        dark: '#6B21A8'
      }
    },
    'Lib': {
      id: 'lib',
      code: 'LIB',
      name: 'Libertarian Party',
      fullName: 'Libertarian Party',
      abbreviations: ['LIB', 'L', 'Lib'],
      aliases: ['Libertarians'],
      color: '#efcb0a',
      colors: {
        primary: '#efcb0a',
        secondary: '#d4b208',
        light: '#f5d842',
        dark: '#b89a06'
      }
    },
    'Grn': {
      id: 'grn',
      code: 'GRN',
      name: 'Green Party',
      fullName: 'Green Party',
      abbreviations: ['GRN', 'G', 'Grn'],
      aliases: ['Greens'],
      color: '#2fa82f',
      colors: {
        primary: '#2fa82f',
        secondary: '#258f25',
        light: '#4fc54f',
        dark: '#1e6e1e'
      }
    }
  };

  // Build parties from filtered data only
  const partiesMap = new Map<string, Party>();

  // Only include parties that appear in the filtered races
  races.forEach(race => {
    race.candidates.forEach(candidate => {
      // Handle FieldOverride type - extract the actual string value
      const partyCode = typeof candidate.party === 'string' ? candidate.party :
                       (candidate.party && typeof candidate.party === 'object' ? (candidate.party.overriddenValue || candidate.party.originalValue) : 'IND');

      if (partyCode && !partiesMap.has(partyCode)) {
        const defaultParty = defaultParties[partyCode] || {
          id: partyCode.toLowerCase(),
          code: partyCode,
          name: partyCode,
          fullName: partyCode,
          abbreviations: [partyCode],
          aliases: [],
          color: '#808080',
          colors: {
            primary: '#808080',
            secondary: '#606060',
            light: '#a0a0a0',
            dark: '#404040'
          }
        };

        // Find party info from raw data
        const partyRow = rawData.find(row => row.party_code === partyCode);

        // Use database values if available, otherwise use defaults
        const party: Party = {
          id: defaultParty.id,
          code: partyCode as Party['code'], // Cast to proper type
          name: partyRow?.party_short_name || partyRow?.party_name || defaultParty.name,
          fullName: partyRow?.party_display_name || partyRow?.party_name || defaultParty.fullName,
          abbreviations: Array.isArray(partyRow?.party_abbreviations) ? partyRow.party_abbreviations : defaultParty.abbreviations,
          aliases: Array.isArray(partyRow?.party_aliases) ? partyRow.party_aliases : defaultParty.aliases,
          color: partyRow?.party_color_primary || defaultParty.color,
          colors: {
            primary: partyRow?.party_color_primary_override || partyRow?.party_color_primary || defaultParty.colors.primary,
            secondary: partyRow?.party_color_secondary || defaultParty.colors.secondary,
            light: partyRow?.party_color_light || defaultParty.colors.light,
            dark: partyRow?.party_color_dark || defaultParty.colors.dark
          },
          founded: partyRow?.party_founded_year ? partyRow.party_founded_year.toString() : defaultParty.founded,
          ideology: partyRow?.party_ideology || defaultParty.ideology,
          headquarters: partyRow?.party_headquarters || defaultParty.headquarters,
          leaders: Array.isArray(partyRow?.party_leadership) ? partyRow.party_leadership : (defaultParty.leaders || []),
          description: partyRow?.party_description || defaultParty.description,
          history: partyRow?.party_history || defaultParty.history,
          website: partyRow?.party_website || defaultParty.website,
          socialMedia: {
            twitter: partyRow?.party_twitter || defaultParty.socialMedia?.twitter,
            facebook: partyRow?.party_facebook || defaultParty.socialMedia?.facebook,
            instagram: partyRow?.party_instagram || defaultParty.socialMedia?.instagram
          }
        };

        partiesMap.set(partyCode, party);
      }
    });
  });

  // Convert map to array and sort by common usage
  const parties: Party[] = Array.from(partiesMap.values()).sort((a, b) => {
    // GOP and REP should be treated as the same for ordering
    const normalizeCode = (code: string) => {
      if (code === 'GOP' || code === 'REP') return 'GOP';
      if (code === 'Dem' || code === 'DEM') return 'DEM';
      return code;
    };

    const order = ['DEM', 'GOP', 'Ind', 'Lib', 'Grn'];

    const aCode = normalizeCode(a.code);
    const bCode = normalizeCode(b.code);

    const aIndex = order.indexOf(aCode);
    const bIndex = order.indexOf(bCode);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    return a.code.localeCompare(b.code);
  });

  return {
    lastUpdated: now,
    lastApSync: lastApSync || now,
    races,
    candidates,
    parties
  };
}

// Check if cached data is still valid
async function isCacheValid(): Promise<boolean> {
  if (!cachedElectionData) return false;

  try {
    // Wait for session to be initialized (with timeout)
    try {
      await Promise.race([
        sessionReady,
        new Promise((_, reject) => setTimeout(() => reject(new Error('sessionReady timeout')), 3000))
      ]);
    } catch (e) {
      console.warn('[electionData] isCacheValid sessionReady timed out');
    }

    // Check if data has changed by comparing the last_fetch_at from the data source
    const { data, error } = await supabase
      .from('e_election_data_sources')
      .select('last_fetch_at')
      .eq('provider', 'ap')
      .order('last_fetch_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return false;

    // If the data source has been updated since our cache, invalidate
    return data.last_fetch_at === cachedElectionData.dataVersion;
  } catch {
    return false;
  }
}

// Cache for raw data - now year-aware
let cachedRawData: Map<string, any[]> = new Map();

// Main export function to get election data
export async function getElectionData(filterYear?: number, filterRaceType?: string): Promise<ElectionData> {
  try {
    // Create cache key based on year (use 'all' for undefined)
    const cacheKey = filterYear ? filterYear.toString() : 'all';

    // Check if we have raw data cached for this specific year
    let rawData: any[];
    const hasCachedData = cachedRawData.has(cacheKey);

    if (!hasCachedData || !(await isCacheValid())) {
      console.log(`Cache miss for year ${cacheKey} - fetching fresh election data from Supabase`);
      console.log('Cache status:', {
        cacheKey,
        hasCachedForYear: hasCachedData,
        totalCachedYears: cachedRawData.size
      });
      rawData = await fetchElectionDataFromSupabase(filterYear);
      cachedRawData.set(cacheKey, rawData);
      console.log('Fetched', rawData.length, 'rows from database');

      // Get the latest data version for cache validation (sessionReady already called in fetchElectionDataFromSupabase)
      const { data: versionData } = await supabase
        .from('e_election_data_sources')
        .select('last_fetch_at')
        .eq('provider', 'ap')
        .order('last_fetch_at', { ascending: false })
        .limit(1)
        .single();

      // Transform to ElectionData format (unfiltered for cache)
      const unfiltered = transformToElectionData(rawData);

      console.log('getElectionData => transformToElectionData')
      console.log(unfiltered)

      // Update cache with unfiltered data
      cachedElectionData = {
        data: unfiltered,
        lastFetchedAt: new Date().toISOString(),
        dataVersion: versionData?.last_fetch_at || new Date().toISOString()
      };
    } else {
      console.log(`Using cached raw data for year ${cacheKey}`);
      rawData = cachedRawData.get(cacheKey)!;
    }

    // Debug: log first row to see actual values
    if (rawData.length > 0) {
      // Check ALL rows for unique values, not just first 100
      const allYears = [...new Set(rawData.map(r => r.year))];
      const allRaceTypes = [...new Set(rawData.map(r => r.race_type))];
      console.log('[getElectionData] Raw data sample:', {
        totalRows: rawData.length,
        firstRowYear: rawData[0].year,
        firstRowYearType: typeof rawData[0].year,
        firstRowRaceType: rawData[0].race_type,
        allUniqueYears: allYears,
        allUniqueRaceTypes: allRaceTypes,
        raceTypeBreakdown: allRaceTypes.map(rt => ({
          type: rt,
          count: rawData.filter(r => r.race_type === rt).length
        }))
      });
    }

    // Apply filters if provided
    if (filterYear || filterRaceType) {
      console.log(`Applying filters - Year: ${filterYear}, Race Type: ${filterRaceType}`);
      return transformToElectionData(rawData, filterYear, filterRaceType);
    }

    // Return cached unfiltered data if no filters
    if (cachedElectionData) {
      return cachedElectionData.data;
    }

    // Transform if no cache exists
    return transformToElectionData(rawData);
  } catch (error) {
    console.error('Failed to fetch election data:', error);

    // If we have cached data, return it even if stale
    if (cachedElectionData) {
      console.log('Returning stale cached data due to error');
      // Apply filters to cached data if provided
      if ((filterYear || filterRaceType) && cachedRawData.size > 0) {
        const cachedYear = filterYear ? filterYear.toString() : 'all';
        const cachedForYear = cachedRawData.get(cachedYear);
        if (cachedForYear) {
          return transformToElectionData(cachedForYear, filterYear, filterRaceType);
        }
      }
      return cachedElectionData.data;
    }

    // If no cache and error, throw
    throw error;
  }
}

// Default empty election data structure
const defaultElectionData: ElectionData = {
  lastUpdated: new Date().toISOString(),
  lastApSync: new Date().toISOString(),
  races: [],
  candidates: [],
  parties: [
    {
      id: 'dem',
      code: 'DEM',
      name: 'Democratic Party',
      fullName: 'Democratic Party',
      abbreviations: ['DEM', 'D', 'Dem', 'Democratic'],
      aliases: ['Democrats', 'Dems'],
      color: '#0015BC',
      colors: {
        primary: '#0015BC',
        secondary: '#2E5EAA',
        light: '#6B9BD1',
        dark: '#001F7A'
      }
    },
    {
      id: 'rep',
      code: 'REP',
      name: 'Republican Party',
      fullName: 'Republican Party',
      abbreviations: ['REP', 'R', 'Rep', 'Republican', 'GOP'],
      aliases: ['Republicans', 'GOP', 'Grand Old Party'],
      color: '#E81B23',
      colors: {
        primary: '#E81B23',
        secondary: '#C8102E',
        light: '#FF6B6B',
        dark: '#A50C15'
      }
    },
    {
      id: 'ind',
      code: 'IND',
      name: 'Independent',
      fullName: 'Independent',
      abbreviations: ['IND', 'I', 'Ind'],
      aliases: ['Independents', 'Non-partisan'],
      color: '#9333EA',
      colors: {
        primary: '#9333EA',
        secondary: '#7C3AED',
        light: '#C084FC',
        dark: '#6B21A8'
      }
    },
    {
      id: 'lib',
      code: 'LIB',
      name: 'Libertarian Party',
      fullName: 'Libertarian Party',
      abbreviations: ['LIB', 'L', 'Lib'],
      aliases: ['Libertarians'],
      color: '#efcb0a',
      colors: {
        primary: '#efcb0a',
        secondary: '#d4b208',
        light: '#f5d842',
        dark: '#b89a06'
      }
    },
    {
      id: 'grn',
      code: 'GRN',
      name: 'Green Party',
      fullName: 'Green Party',
      abbreviations: ['GRN', 'G', 'Grn'],
      aliases: ['Greens'],
      color: '#2fa82f',
      colors: {
        primary: '#2fa82f',
        secondary: '#258f25',
        light: '#4fc54f',
        dark: '#1e6e1e'
      }
    }
  ]
};

// Export the electionData for compatibility with existing code
export let electionData: ElectionData = defaultElectionData;

// Loading state
export let isElectionDataLoading = true;
export let electionDataError: Error | null = null;

// Promise that resolves when data is loaded
let dataLoadPromise: Promise<ElectionData> | null = null;

// Initialize on first import
export const initializeElectionData = async (): Promise<ElectionData> => {
  if (dataLoadPromise) return dataLoadPromise;

  dataLoadPromise = (async () => {
    try {
      console.log('[initializeElectionData] 🚀 Starting to fetch election data...');
      console.log('[initializeElectionData] currentElectionYear:', currentElectionYear);
      isElectionDataLoading = true;
      electionDataError = null;

      // Use currentElectionYear as default if available
      const data = await getElectionData(currentElectionYear || undefined);
      electionData = data;

      console.log('[initializeElectionData] ✅ Election data loaded successfully with', electionData.races.length, 'races');
      isElectionDataLoading = false;

      return electionData;
    } catch (error) {
      console.error('[initializeElectionData] ❌ Failed to initialize election data:', error);
      console.error('[initializeElectionData] Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      electionDataError = error as Error;
      isElectionDataLoading = false;

      // Keep the default structure if initialization fails
      electionData = defaultElectionData;
      return electionData;
    }
  })();

  return dataLoadPromise;
};

// Start loading immediately
console.log('[electionData] Module loaded, supabase client exists:', !!supabase);
console.log('[electionData] Clearing cache to force fresh fetch...');
cachedRawData.clear();
cachedElectionData = null;
dataLoadPromise = null;
console.log('[electionData] Calling initializeElectionData...');
initializeElectionData().then(() => {
  console.log('[electionData] initializeElectionData completed');
}).catch(e => {
  console.error('[electionData] initializeElectionData failed:', e);
});

// Function to get filtered election data (legacy - uses client-side filtering)
export async function getFilteredElectionData(year?: number, raceType?: string): Promise<ElectionData> {
  // Convert race type to lowercase to match database
  const dbRaceType = raceType?.toLowerCase();

  return await getElectionData(year, dbRaceType);
}

// New function: Get paginated election data with server-side filtering
export async function getPaginatedElectionData(
  year?: number,
  raceType?: string,
  page: number = 1,
  pageSize: number = 50,
  effectiveOrgId?: string  // For superuser impersonation - pass the impersonated org ID
): Promise<ElectionDataWithPagination> {
  try {
    // Convert race type to lowercase to match database
    const dbRaceType = raceType?.toLowerCase();

    console.log(`[getPaginatedElectionData] Fetching page ${page}, pageSize ${pageSize}, year ${year}, raceType ${dbRaceType}, effectiveOrgId ${effectiveOrgId}`);

    // Fetch paginated data from server with filters applied at DB level
    const { data: rawData, pagination } = await fetchElectionDataPaginated(year, dbRaceType, page, pageSize, effectiveOrgId);

    // Transform to ElectionData format (no additional filtering needed - already done at DB level)
    const electionData = transformToElectionData(rawData);

    console.log(`[getPaginatedElectionData] Transformed ${electionData.races.length} races`);

    return {
      ...electionData,
      pagination
    };
  } catch (error) {
    console.error('[getPaginatedElectionData] Error:', error);
    throw error;
  }
}

// Function to manually refresh the data
export async function refreshElectionData(): Promise<ElectionData> {
  cachedElectionData = null; // Clear cache
  cachedRawData.clear(); // Clear raw data cache
  dataLoadPromise = null; // Clear promise
  return await initializeElectionData();
}

// Function to just clear the cache without re-initializing
export function clearElectionDataCache(): void {
  console.log('Clearing election data cache - forcing fresh fetch on next call');
  cachedElectionData = null; // Clear cache
  cachedRawData.clear(); // Clear raw data cache
}

// Function to fetch election data from the API endpoint
export async function fetchElectionDataFromAPI(
  year?: number,
  raceType?: 'presidential' | 'senate' | 'house',
  level?: 'national' | 'state' | 'district' | 'county'
): Promise<any> {
  try {
    // Build query string
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (raceType) params.append('raceType', raceType);
    if (level) params.append('level', level);

    const queryString = params.toString();
    const url = `/nova/election${queryString ? '?' + queryString : ''}`;

    console.log('Fetching from API:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();

    console.log(`API returned response`);
    return result;

  } catch (error) {
    console.error('Failed to fetch from API:', error);
    throw error;
  }
}