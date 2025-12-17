// Utility for fetching party data from Supabase e_parties table

import { supabase } from '../supabaseClient';

export interface Party {
  abbreviation: string;
  name: string;
  color_hex: string;
}

// Cache for party data to avoid repeated fetches
let partiesCache: { [abbreviation: string]: Party } | null = null;

/**
 * Fetches all parties from the e_parties table
 * @returns Map of party abbreviation to party data
 */
export async function fetchParties(): Promise<{ [abbreviation: string]: Party }> {
  // Return cached data if available
  if (partiesCache) {
    console.log('[partyData] Using cached party data');
    return partiesCache;
  }

  try {
    console.log('[partyData] Fetching parties from e_parties table...');
    
    const { data, error } = await supabase
      .from('e_parties')
      .select('abbreviation, name, color_hex');
    
    if (error) {
      console.error('[partyData] Error fetching parties:', error);
      throw new Error(`Failed to fetch parties: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.warn('[partyData] No party data returned');
      return {};
    }
    
    // Transform array to map with normalized keys (uppercase)
    const partiesMap: { [abbreviation: string]: Party } = {};
    data.forEach((party: any) => {
      // Normalize GOP -> REP for consistency, and make all keys uppercase
      let normalizedAbbr = party.abbreviation.toUpperCase();
      if (normalizedAbbr === 'GOP') {
        normalizedAbbr = 'REP';
      }
      
      partiesMap[normalizedAbbr] = {
        abbreviation: normalizedAbbr,
        name: party.name,
        color_hex: party.color_hex
      };
    });
    
    // Cache the result
    partiesCache = partiesMap;
    
    console.log('[partyData] ✅ Successfully fetched parties:', Object.keys(partiesMap).length);
    console.log('[partyData] Party colors:', Object.entries(partiesMap).map(([abbr, party]) => `${abbr}: ${party.color_hex}`).join(', '));
    
    return partiesMap;
    
  } catch (error: any) {
    console.error('[partyData] Failed to fetch parties:', error);
    throw error;
  }
}

/**
 * Clears the party cache (useful for testing or forced refresh)
 */
export function clearPartyCache() {
  partiesCache = null;
  console.log('[partyData] Party cache cleared');
}

/**
 * Maps common party codes to standard abbreviations
 * GOP -> REP, Dem -> DEM, etc.
 * Handles mixed case input
 */
export function normalizePartyCode(partyCode: string): string {
  if (!partyCode) return '';
  
  // Convert to uppercase first
  const upperCode = partyCode.toUpperCase();
  
  const mapping: { [key: string]: string } = {
    'GOP': 'REP',
    // Add other mappings as needed
  };
  
  return mapping[upperCode] || upperCode;
}