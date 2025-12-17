// Utility for fetching synthetic races from Supabase RPC

import { supabase } from '../supabaseClient';

export interface SyntheticRace {
  state: string;
  state_abbr: string;
  democrat_votes: number;
  republican_votes: number;
  independent_votes?: number;
  libertarian_votes?: number;
  total_votes: number;
  winner: string;
  margin: number;
  [key: string]: any; // Allow for additional fields
}

/**
 * Fetches synthetic race data using the e_get_synthetic_races RPC function
 * @returns Array of synthetic race results
 */
export async function fetchSyntheticRaces(): Promise<SyntheticRace[]> {
  try {
    console.log('[syntheticRacesApi] Fetching synthetic races via RPC...');
    
    const { data, error } = await supabase.rpc('e_get_synthetic_races');
    
    if (error) {
      console.error('[syntheticRacesApi] Error fetching synthetic races:', error);
      throw new Error(`Failed to fetch synthetic races: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.warn('[syntheticRacesApi] No synthetic race data returned');
      return [];
    }
    
    console.log('[syntheticRacesApi] 🔥 RAW RPC RESPONSE:', data.length, 'records');
    console.log('[syntheticRacesApi] 🔥 First 3 states:', data.slice(0, 3).map((r: any) => r.state));
    console.log('[syntheticRacesApi] 🔥 All state names:', data.map((r: any) => r.state));
    
    // Don't transform here - pass raw data through
    // The transformation will happen in ElectionDashboard
    console.log('[syntheticRacesApi] ✅ Returning RAW synthetic races (no transformation):', data.length);
    return data as SyntheticRace[];
    
  } catch (error: any) {
    console.error('[syntheticRacesApi] Failed to fetch synthetic races:', error);
    throw error;
  }
}

/**
 * Transforms synthetic race data into the format expected by election visualizations
 * @param syntheticRaces - Raw synthetic race data
 * @returns Formatted election data compatible with existing visualization components
 */
export function transformSyntheticRacesToElectionData(syntheticRaces: SyntheticRace[]) {
  return syntheticRaces.map(race => {
    // Check if votes are in the candidates array structure
    let democratVotes = race.democrat_votes || 0;
    let republicanVotes = race.republican_votes || 0;
    let independentVotes = race.independent_votes || 0;
    let libertarianVotes = race.libertarian_votes || 0;
    
    // If top-level votes are 0 but we have candidates array, extract from there
    if (democratVotes === 0 && republicanVotes === 0 && race.candidates && Array.isArray(race.candidates)) {
      console.log(`[syntheticRacesApi] Extracting votes from candidates array for ${race.state}`);
      
      race.candidates.forEach((candidate: any) => {
        const party = candidate.metadata?.party || candidate.metadata?.candidate_party;
        const votes = candidate.metadata?.metadata?.votes || 0;
        
        // Normalize party code to uppercase for comparison
        const normalizedParty = party ? party.toUpperCase() : '';
        
        console.log(`[syntheticRacesApi]   Candidate party: "${party}" -> normalized: "${normalizedParty}", votes: ${votes}`);
        
        // Map party codes: GOP/REP → REP, DEM → DEM, etc.
        if (normalizedParty === 'DEM') {
          democratVotes += votes;
        } else if (normalizedParty === 'REP' || normalizedParty === 'GOP') {
          republicanVotes += votes;
        } else if (normalizedParty === 'IND') {
          independentVotes += votes;
        } else if (normalizedParty === 'LIB') {
          libertarianVotes += votes;
        }
      });
      
      console.log(`[syntheticRacesApi] Extracted votes for ${race.state}: DEM=${democratVotes}, REP=${republicanVotes}`);
    }
    
    const totalVotes = race.total_votes || (democratVotes + republicanVotes + independentVotes + libertarianVotes);
    
    // Calculate percentages
    const democratPercent = totalVotes > 0 ? (democratVotes / totalVotes) * 100 : 0;
    const republicanPercent = totalVotes > 0 ? (republicanVotes / totalVotes) * 100 : 0;
    
    // Determine winner
    let winner = 'Uncalled';
    if (democratVotes > republicanVotes && democratVotes > independentVotes && democratVotes > libertarianVotes) {
      winner = 'Democrat';
    } else if (republicanVotes > democratVotes && republicanVotes > independentVotes && republicanVotes > libertarianVotes) {
      winner = 'Republican';
    } else if (independentVotes > democratVotes && independentVotes > republicanVotes && independentVotes > libertarianVotes) {
      winner = 'Independent';
    } else if (libertarianVotes > democratVotes && libertarianVotes > republicanVotes && libertarianVotes > independentVotes) {
      winner = 'Libertarian';
    }
    
    return {
      state: race.state,
      state_abbr: race.state_abbr,
      democrat_votes: democratVotes,
      republican_votes: republicanVotes,
      independent_votes: independentVotes,
      libertarian_votes: libertarianVotes,
      total_votes: totalVotes,
      democrat_percent: democratPercent,
      republican_percent: republicanPercent,
      winner: winner,
      margin: race.margin || Math.abs(democratPercent - republicanPercent),
      Electoral_votes: race.electoral_votes || 0,
      ...race // Include any additional fields
    };
  });
}