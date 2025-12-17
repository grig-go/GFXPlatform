import { createOverride } from '../types/election';
import { supabase } from '../utils/supabase/client';

/**
 * Mapping of Race fields to database override columns
 * Based on e_race_results_effective view
 */
export const raceFieldToOverride: Record<string, { table: string; overrideColumn: string; originalColumn: string }> = {
  // Fields from e_races table
  title: {
    table: 'e_races',
    overrideColumn: 'display_name',
    originalColumn: 'name'
  },
  // Fields from e_race_results table
  reportingPercentage: {
    table: 'e_race_results',
    overrideColumn: 'percent_reporting_override',
    originalColumn: 'percent_reporting'
  },
  precincts_reporting: {
    table: 'e_race_results',
    overrideColumn: 'precincts_reporting_override',
    originalColumn: 'precincts_reporting'
  },
  precincts_total: {
    table: 'e_race_results',
    overrideColumn: 'precincts_total_override',
    originalColumn: 'precincts_total'
  },
  status: {
    table: 'e_race_results',
    overrideColumn: 'called_status_override',
    originalColumn: 'called_status'
  },
  called_timestamp: {
    table: 'e_race_results',
    overrideColumn: 'called_override_timestamp',
    originalColumn: 'called_timestamp'
  },
  totalVotes: {
    table: 'e_race_results',
    overrideColumn: 'total_votes_override',
    originalColumn: 'total_votes'
  }
};

/**
 * Mapping of Candidate fields to database override columns
 * Based on e_candidate_results_effective view
 */
export const candidateFieldToOverride: Record<string, { table: string; overrideColumn: string; originalColumn: string }> = {
  // Fields from e_candidates table
  name: {
    table: 'e_candidates',
    overrideColumn: 'display_name',
    originalColumn: 'full_name'
  },
  headshot: {
    table: 'e_candidates',
    overrideColumn: 'photo_url',
    originalColumn: 'photo_url'
  },
  incumbent: {
    table: 'e_candidates',
    overrideColumn: 'incumbent_override',
    originalColumn: 'incumbent'
  },
  // Fields from e_candidate_results table
  votes: {
    table: 'e_candidate_results',
    overrideColumn: 'votes_override',
    originalColumn: 'votes'
  },
  percentage: {
    table: 'e_candidate_results',
    overrideColumn: 'vote_percentage_override',
    originalColumn: 'vote_percentage'
  },
  winner: {
    table: 'e_candidate_results',
    overrideColumn: 'winner_override',
    originalColumn: 'winner'
  },
  electoralVotes: {
    table: 'e_candidate_results',
    overrideColumn: 'electoral_votes_override',
    originalColumn: 'electoral_votes'
  },
  // Fields from e_race_candidates table
  withdrew: {
    table: 'e_race_candidates',
    overrideColumn: 'withdrew_override',
    originalColumn: 'withdrew'
  }
};

/**
 * Convert frontend status value to database boolean
 */
function convertStatusToDb(status: string): boolean | null {
  switch (status) {
    case 'CALLED':
      return true;
    case 'NOT_CALLED':
      return false;
    case 'PROJECTED':
    case 'RECOUNT':
      // These would need additional handling
      return null;
    default:
      return false;
  }
}

/**
 * Update a race field override in the database
 */
export async function updateRaceFieldOverride(
  raceResultsId: string,
  fieldName: string,
  newValue: any,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const mapping = raceFieldToOverride[fieldName];

  if (!mapping) {
    return { success: false, error: `Field ${fieldName} does not support overrides` };
  }

  try {
    // Special handling for status field
    let dbValue = newValue;

    console.log('2222')
    console.log(dbValue)
    if (dbValue !== null && typeof dbValue === 'object') {
      dbValue = dbValue.overriddenValue;
    }

    console.log(mapping)
    console.log(dbValue);

    // Update the override field
    const updateData: any = {
      [mapping.overrideColumn]: dbValue,
      override_at: new Date().toISOString(),
      //override_by: 'user', // This should be the actual user ID (must be uuid)
      override_reason: reason || `Updated via UI`
    };

    const { error: updateError } = await supabase
      .from(mapping.table)
      .update(updateData)
      .eq('id', raceResultsId);

    if (updateError) {
      console.error('Failed to update race override:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`Updated ${mapping.overrideColumn} override to ${dbValue} for race results id: ${raceResultsId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating race field override:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update a e_races field override in the database
 */
export async function updateRacesFieldOverride(
  raceId: string,
  fieldName: string,
  newValue: any,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const mapping = raceFieldToOverride[fieldName];

  if (!mapping) {
    return { success: false, error: `Field ${fieldName} does not support overrides` };
  }

  try {
    // Special handling for status field
    let dbValue = newValue;

    if (dbValue !== null && typeof dbValue === 'object') {
      dbValue = dbValue.overriddenValue;
    }

    console.log(mapping)
    console.log(dbValue);

    // Update the override field
    const updateData: any = {
      [mapping.overrideColumn]: dbValue
    };

    const { error: updateError } = await supabase
      .from(mapping.table)
      .update(updateData)
      .eq('id', raceId);

    if (updateError) {
      console.error('Failed to update races override:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`Updated ${mapping.overrideColumn} to ${dbValue} for race id: ${raceId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating races field override:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update a candidate field override in the database
 */
export async function updateCandidateFieldOverride(
  candidateResultsId: string,
  fieldName: string,
  newValue: any,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const mapping = candidateFieldToOverride[fieldName];

  if (!mapping) {
    return { success: false, error: `Field ${fieldName} does not support overrides` };
  }

  try {
    let dbValue = newValue;

    if (dbValue !== null && typeof dbValue === 'object') {
      dbValue = dbValue.overriddenValue;
    }

    // Update the override field
    const updateData: any = {
      [mapping.overrideColumn]: dbValue,
      override_at: new Date().toISOString(),
      //override_by: 'user', // This should be the actual user ID (must be uuid)
      override_reason: reason || `Field ${fieldName} updated via UI`
    };

    console.log(mapping)
    console.log(dbValue);

    const { error: updateError } = await supabase
      .from(mapping.table)
      .update(updateData)
      .eq('id', candidateResultsId);

    if (updateError) {
      console.error('Failed to update candidate override:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`Updated ${mapping.overrideColumn} override to ${dbValue} for ${mapping.table} id: ${candidateResultsId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating candidate field override:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateCandidatesFieldOverride(
  candidateId: string,
  fieldName: string,
  newValue: any,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const mapping = candidateFieldToOverride[fieldName];

  if (!mapping) {
    return { success: false, error: `Field ${fieldName} does not support overrides` };
  }

  try {
    let dbValue = newValue;

    if (dbValue !== null && typeof dbValue === 'object') {
      dbValue = dbValue.overriddenValue;
    }

    // Update the override field
    const updateData: any = {
      [mapping.overrideColumn]: dbValue
    };

    console.log(mapping)
    console.log(dbValue);

    const { error: updateError } = await supabase
      .from(mapping.table)
      .update(updateData)
      .eq('candidate_id', candidateId);

    if (updateError) {
      console.error('Failed to update candidate:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`Updated ${mapping.overrideColumn} to ${dbValue} for candidate id: ${candidateId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating candidate field:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateRaceCandidatesFieldOverride(
  raceCandidatesId: string,
  fieldName: string,
  newValue: any,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const mapping = candidateFieldToOverride[fieldName];

  if (!mapping) {
    return { success: false, error: `Field ${fieldName} does not support overrides` };
  }

  try {
    let dbValue = newValue;

    if (dbValue !== null && typeof dbValue === 'object') {
      dbValue = dbValue.overriddenValue;
    }

    // Update the override field
    const updateData: any = {
      [mapping.overrideColumn]: dbValue
    };

    console.log(mapping)
    console.log(dbValue);

    const { error: updateError } = await supabase
      .from(mapping.table)
      .update(updateData)
      .eq('id', raceCandidatesId);

    if (updateError) {
      console.error('Failed to update candidate:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`Updated ${mapping.overrideColumn} to ${dbValue} for race candidates id: ${raceCandidatesId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating candidate field:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if a race field has an override value
 */
export function shouldUseOverride(row: any, fieldName: string): boolean {
  const mapping = raceFieldToOverride[fieldName];
  if (!mapping) return false;

  const overrideColumn = mapping.overrideColumn.replace('_override', '_override');
  return row[overrideColumn] !== null && row[overrideColumn] !== undefined;
}

/**
 * Create a FieldOverride object from database values
 */
export function createOverrideFromDb<T>(
  originalValue: T,
  overrideValue: T | null | undefined,
  overrideInfo?: any
): T | ReturnType<typeof createOverride> {
  if (overrideValue === null || overrideValue === undefined) {
    return originalValue;
  }

  return createOverride(
    originalValue,
    overrideValue,
    overrideInfo?.override_reason || 'Modified via UI'
  );
}