/**
 * Service for fetching election data from Supabase
 */

import { supabase } from './supabase/client';

export interface Election {
  id: string;
  election_id: string;
  name: string;
  type: string;
  level: string;
  election_date: string;
  year: number;
  status: string;
}

export interface ElectionRace {
  id: string;
  race_id: string;
  title: string;
  office?: string;
  state: string;
  district?: string;
  year: string;
  raceType: 'PRESIDENTIAL' | 'SENATE' | 'HOUSE' | 'GOVERNOR' | 'LOCAL';
  status: 'NOT_CALLED' | 'PROJECTED' | 'CALLED' | 'RECOUNT';
  reportingPercentage: number;
  totalVotes: number;
  precincts_reporting?: number;
  precincts_total?: number;
  priority_level?: number;
  candidates: ElectionCandidate[];
  lastUpdated: string;
}

export interface ElectionCandidate {
  id: string;
  name: string;
  party: 'DEM' | 'REP' | 'IND' | 'GRN' | 'LIB' | 'OTH';
  votes: number;
  percentage: number;
  incumbent: boolean;
  winner?: boolean;
  headshot?: string;
}

export interface ElectionDataFilters {
  electionId?: string;
  year?: number;
  raceType?: string;
  state?: string;
  limit?: number;
}

export interface ElectionDataResult {
  races: ElectionRace[];
  totalCount: number;
}

export interface Template {
  id: string;
  name: string;
  type: 'templateFolder' | 'template';
  active: boolean;
}

/**
 * Fetch all active templates from Supabase, ordered by name
 */
export async function fetchTemplates(): Promise<Template[]> {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('id, name, type, active')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
}

/**
 * Fetch all elections from Supabase, ordered by date descending (most recent first)
 */
export async function fetchElections(): Promise<Election[]> {
  try {
    const { data, error } = await supabase
      .from('e_elections')
      .select('id, election_id, name, type, level, election_date, year, status')
      .order('election_date', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching elections:', error);
    throw error;
  }
}

/**
 * Fetch election data from Supabase using direct table queries
 */
export async function fetchElectionData(filters?: ElectionDataFilters): Promise<ElectionDataResult> {
  try {
    console.log('🎯 fetchElectionData called with filters:', filters);

    const limit = filters?.limit || 100;

    // Build the count query with same joins as main query
    let countQuery = supabase
      .from('e_race_results')
      .select('id, e_races!inner(id, e_elections!inner(id), e_geographic_divisions(code))', { count: 'exact', head: true });

    // Build the data query for race results with all related data
    let query = supabase
      .from('e_race_results')
      .select(`
        id,
        race_id,
        precincts_reporting,
        precincts_total,
        percent_reporting,
        total_votes,
        called,
        called_status,
        called_timestamp,
        last_updated,
        precincts_reporting_override,
        precincts_total_override,
        percent_reporting_override,
        total_votes_override,
        called_override,
        called_status_override,
        e_races!inner (
          id,
          race_id,
          name,
          display_name,
          type,
          office,
          priority_level,
          e_elections!inner (
            id,
            election_id,
            name,
            year
          ),
          e_geographic_divisions (
            code,
            fips_code,
            type
          )
        ),
        e_candidate_results (
          id,
          candidate_id,
          votes,
          vote_percentage,
          winner,
          votes_override,
          vote_percentage_override,
          winner_override,
          e_candidates (
            id,
            candidate_id,
            full_name,
            display_name,
            photo_url,
            incumbent,
            incumbent_override,
            e_parties (
              abbreviation,
              name,
              color_hex
            )
          )
        )
      `)
      .limit(limit);

    // Apply election filter
    if (filters?.electionId) {
      query = query.eq('e_races.e_elections.id', filters.electionId);
      countQuery = countQuery.eq('e_races.e_elections.id', filters.electionId);
      console.log('🔍 Filtering by election_id:', filters.electionId);
    } else if (filters?.year) {
      query = query.eq('e_races.e_elections.year', filters.year);
      countQuery = countQuery.eq('e_races.e_elections.year', filters.year);
      console.log('🔍 Filtering by year:', filters.year);
    }

    // Apply race type filter
    if (filters?.raceType) {
      query = query.eq('e_races.type', filters.raceType.toLowerCase());
      countQuery = countQuery.eq('e_races.type', filters.raceType.toLowerCase());
      console.log('🔍 Filtering by race type:', filters.raceType);
    }

    // Apply state filter
    if (filters?.state) {
      query = query.eq('e_races.e_geographic_divisions.code', filters.state.toUpperCase());
      countQuery = countQuery.eq('e_races.e_geographic_divisions.code', filters.state.toUpperCase());
      console.log('🔍 Filtering by state:', filters.state);
    }

    // Execute both queries in parallel
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ]);

    if (error) {
      console.error('❌ Query error:', error);
      throw error;
    }

    if (countError) {
      console.warn('⚠️ Count query error:', countError);
    }

    const totalCount = count || 0;
    console.log('📊 Total count:', totalCount, '| Query returned', data?.length || 0, 'race results');

    if (!data || data.length === 0) {
      return { races: [], totalCount };
    }

    // Get race IDs from the results
    const raceIds = [...new Set(data.map((rr: any) => rr.race_id))];
    console.log('📊 Fetching race_candidates for', raceIds.length, 'races');

    // Fetch e_race_candidates separately for withdrew status
    const { data: raceCandidatesData, error: raceCandidatesError } = await supabase
      .from('e_race_candidates')
      .select('race_id, candidate_id, withdrew, withdrew_override')
      .in('race_id', raceIds);

    if (raceCandidatesError) {
      console.warn('⚠️ Error fetching race_candidates:', raceCandidatesError);
    }

    // Create a map for quick lookup: race_id + candidate_id -> withdrew info
    const raceCandidatesMap = new Map<string, any>();
    if (raceCandidatesData) {
      for (const rc of raceCandidatesData) {
        const key = `${rc.race_id}-${rc.candidate_id}`;
        raceCandidatesMap.set(key, rc);
      }
    }

    console.log('📊 Race candidates map has', raceCandidatesMap.size, 'entries');

    // Transform the data to our race format
    const races = transformDirectQueryData(data, raceCandidatesMap);

    console.log('✅ Returning', races.length, 'transformed races out of', totalCount, 'total');
    return { races, totalCount };
  } catch (error) {
    console.error('Error fetching election data from Supabase:', error);
    throw error;
  }
}

/**
 * Transform direct query data to ElectionRace format
 */
function transformDirectQueryData(rawData: any[], raceCandidatesMap: Map<string, any>): ElectionRace[] {
  const raceMap = new Map<string, ElectionRace>();

  for (const raceResult of rawData) {
    const race = raceResult.e_races;
    if (!race) continue;

    const raceId = race.id;
    const election = race.e_elections;
    const division = race.e_geographic_divisions;

    if (!raceMap.has(raceId)) {
      // Use override values if present, otherwise use original values
      const percentReporting = raceResult.percent_reporting_override !== null && raceResult.percent_reporting_override !== undefined
        ? raceResult.percent_reporting_override
        : raceResult.percent_reporting;
      const precinctsReporting = raceResult.precincts_reporting_override !== null && raceResult.precincts_reporting_override !== undefined
        ? raceResult.precincts_reporting_override
        : raceResult.precincts_reporting;
      const precinctsTotal = raceResult.precincts_total_override !== null && raceResult.precincts_total_override !== undefined
        ? raceResult.precincts_total_override
        : raceResult.precincts_total;
      const totalVotes = raceResult.total_votes_override !== null && raceResult.total_votes_override !== undefined
        ? raceResult.total_votes_override
        : raceResult.total_votes;
      const calledStatus = raceResult.called_status_override || raceResult.called_status;
      const called = raceResult.called_override !== null && raceResult.called_override !== undefined
        ? raceResult.called_override
        : raceResult.called;

      raceMap.set(raceId, {
        id: raceResult.id,
        race_id: race.race_id,
        title: race.display_name || race.name || 'Unknown Race',
        office: race.office || '',
        state: division?.code || '',
        district: division?.fips_code ? extractDistrict(division.fips_code) : undefined,
        year: election?.year?.toString() || new Date().getFullYear().toString(),
        raceType: race.type?.toUpperCase() || 'LOCAL',
        priority_level: race.priority_level,
        status: mapStatus(called, calledStatus),
        reportingPercentage: percentReporting || 0,
        totalVotes: totalVotes || 0,
        precincts_reporting: precinctsReporting,
        precincts_total: precinctsTotal,
        candidates: [],
        lastUpdated: raceResult.last_updated || new Date().toISOString()
      });
    }

    // Add candidates from candidate_results
    const candidateResults = raceResult.e_candidate_results || [];
    const existingRace = raceMap.get(raceId)!;

    for (const candidateResult of candidateResults) {
      const candidate = candidateResult.e_candidates;
      if (!candidate) continue;

      const party = candidate.e_parties;

      // Look up withdrew status from the raceCandidatesMap
      const raceCandidateKey = `${raceId}-${candidateResult.candidate_id}`;
      const raceCandidate = raceCandidatesMap.get(raceCandidateKey);

      // Check if withdrew
      const withdrew = raceCandidate?.withdrew_override !== null && raceCandidate?.withdrew_override !== undefined
        ? raceCandidate.withdrew_override
        : raceCandidate?.withdrew;

      // Skip withdrawn candidates
      if (withdrew) continue;

      // Use override values if present
      const votes = candidateResult.votes_override !== null && candidateResult.votes_override !== undefined
        ? candidateResult.votes_override
        : candidateResult.votes;
      const votePercentage = candidateResult.vote_percentage_override !== null && candidateResult.vote_percentage_override !== undefined
        ? candidateResult.vote_percentage_override
        : candidateResult.vote_percentage;
      const winner = candidateResult.winner_override !== null && candidateResult.winner_override !== undefined
        ? candidateResult.winner_override
        : candidateResult.winner;
      const incumbent = candidate.incumbent_override !== null && candidate.incumbent_override !== undefined
        ? candidate.incumbent_override
        : candidate.incumbent;

      existingRace.candidates.push({
        id: candidateResult.id,
        name: candidate.display_name || candidate.full_name || 'Unknown',
        party: party?.abbreviation || 'OTH',
        votes: votes || 0,
        percentage: votePercentage || 0,
        incumbent: incumbent || false,
        winner: winner || false,
        headshot: candidate.photo_url
      });
    }
  }

  return Array.from(raceMap.values());
}

/**
 * Transform raw Supabase data to ElectionRace format (legacy RPC format)
 * @internal Reserved for future use with direct Supabase queries
 */
export function transformElectionData(rawData: any[], filters?: ElectionDataFilters): ElectionRace[] {
  // Group by race_id to consolidate candidates
  const raceMap = new Map<string, any>();

  for (const row of rawData) {
    const raceId = row.race_id;

    if (!raceMap.has(raceId)) {
      // Use override values if present, otherwise use original values
      const displayName = row.race_display_name || row.race_name;
      const percentReporting = row.percent_reporting_override !== null && row.percent_reporting_override !== undefined
        ? row.percent_reporting_override
        : row.percent_reporting;
      const precinctsReporting = row.precincts_reporting_override !== null && row.precincts_reporting_override !== undefined
        ? row.precincts_reporting_override
        : row.precincts_reporting;
      const precinctsTotal = row.precincts_total_override !== null && row.precincts_total_override !== undefined
        ? row.precincts_total_override
        : row.precincts_total;
      const totalVotes = row.total_votes_override !== null && row.total_votes_override !== undefined
        ? row.total_votes_override
        : row.total_votes;
      const calledStatus = row.called_status_override || row.called_status;

      raceMap.set(raceId, {
        id: row.race_results_id || row.race_id,
        race_id: row.race_id,
        title: displayName || 'Unknown Race',
        office: row.office || '',
        state: row.state_code || '',
        district: row.fips_code ? extractDistrict(row.fips_code) : undefined,
        year: row.year ? row.year.toString() : new Date().getFullYear().toString(),
        raceType: row.race_type?.toUpperCase() || 'LOCAL',
        status: mapStatus(row.called, calledStatus),
        reportingPercentage: percentReporting || 0,
        totalVotes: totalVotes || 0,
        precincts_reporting: precinctsReporting,
        precincts_total: precinctsTotal,
        candidates: [],
        lastUpdated: row.last_updated || new Date().toISOString()
      });
    }

    // Add candidate if present
    if (row.candidate_id) {
      const race = raceMap.get(raceId);

      // Use override values if present
      const votes = row.votes_override !== null && row.votes_override !== undefined
        ? row.votes_override
        : row.votes;
      const votePercentage = row.vote_percentage_override !== null && row.vote_percentage_override !== undefined
        ? row.vote_percentage_override
        : row.vote_percentage;
      const winner = row.winner_override !== null && row.winner_override !== undefined
        ? row.winner_override
        : row.winner;
      const incumbent = row.incumbent_override !== null && row.incumbent_override !== undefined
        ? row.incumbent_override
        : row.incumbent;
      const withdrew = row.withdrew_override !== null && row.withdrew_override !== undefined
        ? row.withdrew_override
        : row.withdrew;

      // Skip withdrawn candidates unless explicitly shown
      if (!withdrew) {
        race.candidates.push({
          id: row.candidate_results_id || row.candidate_id,
          name: row.candidate_display_name || row.full_name || 'Unknown',
          party: row.party_code || 'OTH',
          votes: votes || 0,
          percentage: votePercentage || 0,
          incumbent: incumbent || false,
          winner: winner || false,
          headshot: row.photo_url
        });
      }
    }
  }

  let races = Array.from(raceMap.values());

  // Apply filters
  if (filters?.raceType) {
    races = races.filter(r => r.raceType === filters.raceType?.toUpperCase());
  }

  if (filters?.state) {
    races = races.filter(r => r.state === filters.state?.toUpperCase());
  }

  return races;
}

/**
 * Extract district number from FIPS code
 */
function extractDistrict(fipsCode: string): string | undefined {
  if (!fipsCode || fipsCode.length < 2) return undefined;
  const lastTwo = fipsCode.slice(-2);
  const districtNum = parseInt(lastTwo, 10);
  return isNaN(districtNum) ? undefined : districtNum.toString();
}

/**
 * Map called status to our status enum
 */
function mapStatus(called: boolean | null, calledStatus: string | null): 'NOT_CALLED' | 'PROJECTED' | 'CALLED' | 'RECOUNT' {
  if (calledStatus) {
    const status = calledStatus.toUpperCase();
    if (status === 'RECOUNT') return 'RECOUNT';
    if (status === 'PROJECTED') return 'PROJECTED';
    if (status === 'CALLED') return 'CALLED';
  }

  if (called === true) return 'CALLED';
  return 'NOT_CALLED';
}

/**
 * Transform race to display format (no-op since we don't use FieldOverride in RPC)
 */
export function transformRaceForDisplay(race: ElectionRace): ElectionRace {
  return race;
}

/**
 * Transform candidate to display format (no-op since we don't use FieldOverride in RPC)
 */
export function transformCandidateForDisplay(candidate: ElectionCandidate): ElectionCandidate {
  return candidate;
}
