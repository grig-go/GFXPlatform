// Nova Election API - Direct RPC endpoint with data transformation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// State name mapping
const stateNames = {
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
// Default party data for main parties (also check for GOP alias)
const defaultPartyData = {
  'DEM': {
    abbreviations: [
      'DEM',
      'D',
      'Dem',
      'Democratic'
    ],
    aliases: [
      'Democrats',
      'Dems'
    ],
    colors: {
      primary: '#0015BC',
      secondary: '#2E5EAA',
      light: '#6B9BD1',
      dark: '#001A8A'
    }
  },
  'REP': {
    abbreviations: [
      'REP',
      'R',
      'Rep',
      'Republican',
      'GOP'
    ],
    aliases: [
      'Republicans',
      'GOP',
      'Grand Old Party'
    ],
    colors: {
      primary: '#E81B23',
      secondary: '#C8102E',
      light: '#FF6B6B',
      dark: '#B71C1C'
    }
  },
  'GOP': {
    abbreviations: [
      'REP',
      'R',
      'Rep',
      'Republican',
      'GOP'
    ],
    aliases: [
      'Republicans',
      'GOP',
      'Grand Old Party'
    ],
    colors: {
      primary: '#E81B23',
      secondary: '#C8102E',
      light: '#FF6B6B',
      dark: '#B71C1C'
    }
  },
  'IND': {
    abbreviations: [
      'IND',
      'I',
      'Ind'
    ],
    aliases: [
      'Independents',
      'Non-partisan'
    ],
    colors: {
      primary: '#9333EA',
      secondary: '#7C3AED',
      light: '#C084FC',
      dark: '#6B21A8'
    }
  },
  'LIB': {
    abbreviations: [
      'LIB',
      'L',
      'Lib'
    ],
    aliases: [
      'Libertarians'
    ],
    colors: {
      primary: '#efcb0a',
      secondary: '#d4b208',
      light: '#f5d842',
      dark: '#c0a307'
    }
  },
  'GRN': {
    abbreviations: [
      'GRN',
      'G',
      'Grn'
    ],
    aliases: [
      'Greens'
    ],
    colors: {
      primary: '#2fa82f',
      secondary: '#258f25',
      light: '#4fc54f',
      dark: '#1e7a1e'
    }
  }
};
// Helper to get district number from FIPS code
function getDistrictFromFips(fipsCode) {
  if (!fipsCode) return undefined;
  const lastTwoDigits = fipsCode.slice(-2);
  const districtNum = parseInt(lastTwoDigits, 10);
  if (isNaN(districtNum)) return undefined;
  return districtNum.toString();
}
// Helper to format race type
function formatRaceType(type) {
  switch(type.toLowerCase()){
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
// Helper to format race title
function formatRaceTitle(electionTitle, raceType, stateCode, fipsCode, divisionType, year) {
  const stateName = stateCode ? stateNames[stateCode] : null;
  if (raceType === 'house' && fipsCode) {
    const district = getDistrictFromFips(fipsCode);
    if (stateName && district) {
      return `${stateName} District ${district} House Election ${year}`;
    }
  }
  if (raceType === 'senate') {
    return `${stateName} Senate Election ${year}`;
  }
  if (raceType === 'presidential') {
    if (divisionType === 'national') {
      return `National Presidential Election ${year}`;
    } else if (stateName) {
      return `${stateName} Presidential Election ${year}`;
    }
  }
  if (stateName && raceType !== 'presidential') {
    return `${stateName} ${electionTitle}`;
  }
  return electionTitle;
}
// Transform raw data to user-friendly format
function transformElectionData(rawData) {
  const now = new Date().toISOString();
  const racesMap = new Map();
  let lastApSync = null;
  // Group data by race
  rawData.forEach((row)=>{
    if (!lastApSync && row.last_fetch_at) {
      lastApSync = row.last_fetch_at;
    }
    const raceKey = `${row.race_type}-${row.year}-${row.race_race_id}`;
    if (!racesMap.has(raceKey)) {
      racesMap.set(raceKey, []);
    }
    racesMap.get(raceKey).push(row);
  });
  // Transform races
  const races = Array.from(racesMap.entries()).map(([raceKey, raceRows])=>{
    const firstRow = raceRows[0];
    // Determine state/location
    let state = 'National';
    let stateCode = null;
    let district;
    let fipsCode = null;
    if (firstRow.division_type === 'state' && firstRow.state_code) {
      stateCode = firstRow.state_code;
      state = stateNames[firstRow.state_code] || firstRow.state_code;
    } else if (firstRow.division_type === 'district') {
      stateCode = firstRow.state_code?.substring(0, 2) || null;
      fipsCode = firstRow.fips_code;
      if (stateCode) {
        state = stateNames[stateCode] || stateCode;
      }
      district = getDistrictFromFips(firstRow.fips_code);
    } else if (firstRow.division_type === 'county' && firstRow.state_code) {
      // Fix for county level - extract state code from FIPS or state_code
      stateCode = firstRow.state_code?.substring(0, 2) || null;
      fipsCode = firstRow.fips_code;
      if (stateCode) {
        state = stateNames[stateCode] || stateCode;
      }
    }
    // Build candidates array
    const candidatesMap = new Map();
    raceRows.forEach((row)=>{
      const candidateId = row.candidate_id;
      if (!candidatesMap.has(candidateId)) {
        candidatesMap.set(candidateId, {
          id: candidateId,
          name: row.candidate_display_name || row.full_name,
          firstName: row.first_name,
          lastName: row.last_name,
          party: row.party_code || 'IND',
          votes: row.votes || 0,
          percentage: row.vote_percentage || 0,
          incumbent: row.incumbent || false,
          winner: row.winner || false,
          withdrew: row.withdrew || false,
          headshot: row.photo_url,
          ballotOrder: row.ballot_order,
          electoralVotes: row.electoral_votes
        });
      }
    });
    const candidates = Array.from(candidatesMap.values()).sort((a, b)=>b.votes - a.votes);
    const title = formatRaceTitle(firstRow.election_name, firstRow.race_type, firstRow.state_code, firstRow.fips_code, firstRow.division_type, firstRow.year);
    return {
      id: raceKey,
      raceId: firstRow.race_id,
      apRaceId: `AP-${firstRow.race_type.toUpperCase()}-${firstRow.year}-${firstRow.race_race_id}`,
      title: firstRow.race_display_name || title,
      office: firstRow.office,
      state,
      stateCode,
      fipsCode,
      district,
      year: firstRow.year.toString(),
      raceType: formatRaceType(firstRow.race_type),
      status: firstRow.called_status || 'NOT_CALLED',
      reportingPercentage: firstRow.percent_reporting || 0,
      totalVotes: firstRow.total_votes || 0,
      lastUpdated: now,
      lastApUpdate: firstRow.last_updated || now,
      precinctsReporting: firstRow.precincts_reporting || 0,
      precinctsTotal: firstRow.precincts_total || 0,
      calledTimestamp: firstRow.called_timestamp,
      numElect: firstRow.num_elect || 1,
      electoralVotes: firstRow.state_electoral_votes || firstRow.electoral_votes,
      uncontested: firstRow.uncontested || false,
      candidates
    };
  });
  // Sort races
  races.sort((a, b)=>{
    if (a.year !== b.year) return parseInt(b.year) - parseInt(a.year);
    const typeOrder = {
      'PRESIDENTIAL': 0,
      'SENATE': 1,
      'HOUSE': 2,
      'GOVERNOR': 3
    };
    const aTypeOrder = typeOrder[a.raceType] ?? 99;
    const bTypeOrder = typeOrder[b.raceType] ?? 99;
    if (aTypeOrder !== bTypeOrder) return aTypeOrder - bTypeOrder;
    if (a.raceType === 'PRESIDENTIAL') {
      if (a.state === 'National' && b.state !== 'National') return -1;
      if (a.state !== 'National' && b.state === 'National') return 1;
    }
    if (a.state !== b.state) return a.state.localeCompare(b.state);
    if (a.district && b.district) return parseInt(a.district) - parseInt(b.district);
    return 0;
  });
  // Build unique candidates and parties with full profile data
  const uniqueCandidatesMap = new Map();
  const partiesMap = new Map();
  // First, collect all unique candidates from raw data with full profile info
  rawData.forEach((row)=>{
    const candidateId = row.candidate_id;
    if (!uniqueCandidatesMap.has(candidateId)) {
      uniqueCandidatesMap.set(candidateId, {
        id: candidateId,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: row.candidate_display_name || row.full_name,
        originalName: row.full_name,
        party: row.party_code || 'IND',
        headshot: row.photo_url,
        bio: row.bio,
        birthDate: row.date_of_birth,
        birthPlace: row.bio_short,
        education: row.education || [],
        occupation: row.professional_background || [],
        experience: row.political_experience || [],
        incumbent: row.incumbent || false,
        originalIncumbent: row.incumbent || false,
        website: row.website,
        currentRaces: []
      });
    }
  });
  // Build parties map with full party data
  rawData.forEach((row)=>{
    const partyCode = row.party_code || 'IND';
    if (!partiesMap.has(partyCode)) {
      // Get default data if available for this party
      const defaults = defaultPartyData[partyCode] || {
        abbreviations: [
          partyCode
        ],
        aliases: [],
        colors: {
          primary: '#808080',
          secondary: '#606060',
          light: '#a0a0a0',
          dark: '#505050'
        }
      };
      // Build abbreviations array from database or defaults
      let abbreviations = defaults.abbreviations;
      if (Array.isArray(row.party_abbreviations) && row.party_abbreviations.length > 0) {
        abbreviations = row.party_abbreviations;
      } else if (row.party_short_name && !abbreviations.includes(row.party_short_name)) {
        abbreviations = [
          row.party_short_name,
          ...abbreviations
        ];
      }
      // Build aliases array from database or defaults
      let aliases = defaults.aliases;
      if (Array.isArray(row.party_aliases) && row.party_aliases.length > 0) {
        aliases = row.party_aliases;
      }
      partiesMap.set(partyCode, {
        id: partyCode.toLowerCase(),
        code: partyCode,
        name: row.party_short_name || row.party_name || partyCode,
        fullName: row.party_display_name || row.party_name || partyCode,
        abbreviations,
        aliases,
        color: row.party_color_primary?.trim() || null || defaults.colors.primary,
        colors: {
          primary: row.party_color_primary?.trim() || null || defaults.colors.primary,
          secondary: row.party_color_secondary?.trim() || null || defaults.colors.secondary,
          light: row.party_color_light?.trim() || null || defaults.colors.light,
          dark: row.party_color_dark?.trim() || null || defaults.colors.dark
        },
        logo: undefined,
        founded: row.party_founded_year,
        ideology: row.party_ideology,
        headquarters: row.party_headquarters,
        leaders: row.party_leadership ? Array.isArray(row.party_leadership) ? row.party_leadership : [] : [],
        description: row.party_description,
        history: row.party_history,
        website: row.party_website,
        socialMedia: {
          twitter: row.party_twitter,
          facebook: row.party_facebook,
          instagram: row.party_instagram
        }
      });
    }
  });
  // Then, populate currentRaces from the transformed races
  races.forEach((race)=>{
    race.candidates.forEach((candidate)=>{
      const existing = uniqueCandidatesMap.get(candidate.id);
      if (existing && !existing.currentRaces.includes(race.id)) {
        existing.currentRaces.push(race.id);
      }
    });
  });
  return {
    lastUpdated: now,
    lastApSync: lastApSync || now,
    races,
    candidates: Array.from(uniqueCandidatesMap.values()),
    parties: Array.from(partiesMap.values())
  };
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Route: GET /nova-election/synthetic-groups - List synthetic groups
    if (pathname.endsWith('/synthetic-groups') && req.method === 'GET') {
      console.log('📦 Fetching synthetic groups...');
      const { data, error } = await supabase.rpc('e_list_synthetic_groups');
      if (error) {
        console.error('Error fetching synthetic groups:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log(`✅ Fetched ${data?.length || 0} synthetic groups`);
      return new Response(JSON.stringify({ ok: true, groups: data || [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: POST /nova-election/synthetic-groups - Create synthetic group
    if (pathname.endsWith('/synthetic-groups') && req.method === 'POST') {
      const body = await req.json();
      const { name, description } = body;
      console.log('📦 Creating synthetic group:', name);
      const { data, error } = await supabase.rpc('e_create_synthetic_group', {
        p_name: name,
        p_description: description || null
      });
      if (error) {
        console.error('Error creating synthetic group:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log('✅ Created synthetic group:', data);
      return new Response(JSON.stringify({ ok: true, groupId: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: DELETE /nova-election/synthetic-groups/:id - Delete synthetic group
    if (pathname.includes('/synthetic-groups/') && req.method === 'DELETE') {
      const groupId = pathname.split('/synthetic-groups/')[1];
      const cascadeDelete = url.searchParams.get('cascade') === 'true';
      console.log('🗑️ Deleting synthetic group:', groupId, 'cascade:', cascadeDelete);
      const { data, error } = await supabase.rpc('e_delete_synthetic_group', {
        p_group_id: groupId,
        p_cascade_delete_races: cascadeDelete
      });
      if (error) {
        console.error('Error deleting synthetic group:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log('✅ Deleted synthetic group:', data);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default route: Election data
    const yearParam = url.searchParams.get('year');
    const raceTypeParam = url.searchParams.get('raceType');
    const levelParam = url.searchParams.get('level');
    console.log('Election API Request:', {
      year: yearParam,
      raceType: raceTypeParam,
      level: levelParam
    });
    const year = yearParam ? parseInt(yearParam, 10) : null;
    const raceType = raceTypeParam || null;
    const level = levelParam || null;
    const { data, error } = await supabase.rpc('fetch_election_data_for_api', {
      p_year: year,
      p_race_type: raceType,
      p_level: level
    });
    if (error) {
      console.error('RPC Error:', error);
      return new Response(JSON.stringify({
        error: 'Database error',
        details: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Successfully fetched ${data?.length || 0} records`);
    // Transform the data to user-friendly format
    const transformedData = transformElectionData(data || []);
    return new Response(JSON.stringify(transformedData), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
