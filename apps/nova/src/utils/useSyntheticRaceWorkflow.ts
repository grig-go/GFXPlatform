import { useState } from 'react';
import { getEdgeFunctionUrl, getSupabaseAnonKey } from './supabase/config';
import { Race, Candidate } from '../types/election';
import { supabase } from './supabase/client';

// State name to code mapping
const STATE_NAME_TO_CODE: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC', 'Puerto Rico': 'PR', 'Guam': 'GU', 'Virgin Islands': 'VI',
  'American Samoa': 'AS', 'Northern Mariana Islands': 'MP'
};

// Helper to get state code from state name or code
const getStateCode = (stateNameOrCode: string): string => {
  // If it's already a 2-letter code, return it
  if (stateNameOrCode.length === 2) {
    return stateNameOrCode.toUpperCase();
  }
  // Otherwise, look it up in the mapping
  return STATE_NAME_TO_CODE[stateNameOrCode] || stateNameOrCode;
};

// Helper to determine race type from office string
const getRaceTypeFromOffice = (office: string): string => {
  const officeLower = office.toLowerCase();
  if (officeLower.includes('president')) return 'presidential';
  if (officeLower.includes('senate') || officeLower.includes('senator')) return 'senate';
  if (officeLower.includes('house') || officeLower.includes('representative')) return 'house';
  if (officeLower.includes('governor')) return 'governor';
  return 'other';
};

// Helper to extract year from election_id or race data
const getElectionYear = (electionId: string): number => {
  // Try to extract year from election_id like "ap_p_2024" or "2024_general"
  // Use a simpler pattern that matches 20XX anywhere in the string
  const yearMatch = electionId.match(/(20\d{2})/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }
  // Default to current year if not found
  return new Date().getFullYear();
};

export interface SyntheticGroup {
  id: string;
  name: string;
  description?: string;
  race_count?: number;
  created_at?: string;
}

export interface ScenarioInput {
  name: string;
  turnoutShift: number;
  republicanShift: number;
  democratShift: number;
  independentShift: number;
  countyStrategy: string;
  customInstructions: string;
  aiProvider: string;
  syntheticGroupId?: string; // Optional group ID to save to
  includeCountyData?: boolean; // Whether to include county-level data for AI (default: true)
}

export interface SyntheticPreview {
  scenario: ScenarioInput;
  synthesizedResults: {
    candidates: Array<{
      id: string;
      name: string;
      party: string;
      votes: number;
      percentage: number;
      winner?: boolean;
    }>;
    totalVotes: number;
    countyChanges?: Array<{
      county: string;
      changeDescription: string;
    }>;
  };
  aiSummary: string;
  aiResponse: any;
  originalCandidates: Candidate[]; // Store the modified candidates list used in the preview
}

export interface AIProvider {
  id: string;
  name: string;
  provider_name: string;
  enabled: boolean;
}

export function useSyntheticRaceWorkflow() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [syntheticGroups, setSyntheticGroups] = useState<SyntheticGroup[]>([]);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);

  // Fetch synthetic groups from database
  const fetchSyntheticGroups = async (): Promise<SyntheticGroup[]> => {
    try {
      const { data, error } = await supabase.rpc('e_list_synthetic_groups');

      if (error) {
        console.error('Error fetching synthetic groups:', error);
        return [];
      }

      const groups = (data || []) as SyntheticGroup[];
      setSyntheticGroups(groups);
      return groups;
    } catch (err) {
      console.error('Error fetching synthetic groups:', err);
      return [];
    }
  };

  // Create a new synthetic group
  const createSyntheticGroup = async (
    name: string,
    description?: string
  ): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('e_create_synthetic_group', {
        p_name: name,
        p_description: description || null,
        p_user_id: user?.id || null
      });

      if (error) {
        console.error('Error creating synthetic group:', error);
        setError(error.message);
        return null;
      }

      // Refresh groups list
      await fetchSyntheticGroups();

      return data as string;
    } catch (err) {
      console.error('Error creating synthetic group:', err);
      setError(err instanceof Error ? err.message : 'Failed to create group');
      return null;
    }
  };

  // Delete a synthetic group
  const deleteSyntheticGroup = async (
    groupId: string,
    cascadeDeleteRaces: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('e_delete_synthetic_group', {
        p_group_id: groupId,
        p_cascade_delete_races: cascadeDeleteRaces
      });

      if (error) {
        console.error('Error deleting synthetic group:', error);
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; error?: string };

      if (result.success) {
        await fetchSyntheticGroups();
      }

      return result;
    } catch (err) {
      console.error('Error deleting synthetic group:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete group' };
    }
  };

  // Fetch AI providers assigned to elections dashboard
  const fetchProviders = async () => {
    try {
      const response = await fetch(
        getEdgeFunctionUrl('ai_provider/providers'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch AI providers');
      }

      const data = await response.json();
      
      // Filter for providers assigned to elections dashboard
      const electionsProviders = data.providers?.filter((p: any) =>
        p.enabled && p.dashboardAssignments?.some((d: any) => 
          d.dashboard === 'elections'
        )
      ) || [];

      setProviders(electionsProviders);
      return electionsProviders;
    } catch (err) {
      console.error('Error fetching AI providers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch providers');
      return [];
    }
  };

  // Build AI prompt from race data and scenario
  const buildAIPrompt = async (
    race: Race,
    candidates: Candidate[],
    scenario: ScenarioInput
  ): Promise<string> => {
    const raceTitle = typeof race.title === 'object' ? race.title.overriddenValue || race.title.originalValue : race.title;
    const raceOffice = typeof race.office === 'object' ? race.office.overriddenValue || race.office.originalValue : race.office;
    const raceTotalVotes = typeof race.totalVotes === 'object' ? race.totalVotes.overriddenValue || race.totalVotes.originalValue : race.totalVotes;

    const candidateData = candidates.map(c => {
      const name = typeof c.name === 'object' ? c.name.overriddenValue || c.name.originalValue : c.name;
      const party = typeof c.party === 'object' ? c.party.overriddenValue || c.party.originalValue : c.party;
      const votes = typeof c.votes === 'object' ? c.votes.overriddenValue || c.votes.originalValue : c.votes;
      const percentage = typeof c.percentage === 'object' ? c.percentage.overriddenValue || c.percentage.originalValue : c.percentage;
      
      return { 
        id: c.id, 
        ap_candidate_id: c.ap_candidate_id,
        candidate_results_id: c.candidate_results_id,
        race_candidates_id: c.race_candidates_id,
        name, 
        party, 
        votes, 
        percentage 
      };
    });

    // Fetch counties for this state to generate county-level results
    // Default to including county data (can be disabled via scenario.includeCountyData)
    const shouldIncludeCountyData = scenario.includeCountyData !== false;

    let countyData: Array<{ id: string; name: string }> = [];
    let countyBaselineResults: Array<{
      division_id: string;
      division_name: string;
      fips_code: string;
      precincts_reporting: number;
      precincts_total: number;
      total_votes: number;
      results: Array<{
        candidate_id: string;
        candidate_name: string;
        party: string;
        votes: number;
      }>;
    }> = [];

    if (shouldIncludeCountyData) {
      try {
        const stateCode = getStateCode(race.state);
        const raceType = getRaceTypeFromOffice(raceOffice);
        const electionYear = getElectionYear(race.election_id);

        console.log(`🔍 Fetching county-level results using RPC:`);
        console.log(`   - race_type: ${raceType}`);
        console.log(`   - year: ${electionYear}`);
        console.log(`   - state: ${stateCode}`);
        console.log(`   - race.id: ${race.id}`);
        console.log(`   - race.race_id: ${race.race_id}`);
        console.log(`   - race.election_id: ${race.election_id}`);

        // Use the RPC function to fetch county data
        const BATCH_SIZE = 5000;
        let allCountyData: any[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase.rpc('fetch_county_data_extended', {
            p_race_type: raceType,
            p_year: electionYear,
            p_state: stateCode,
            p_offset: offset,
            p_limit: BATCH_SIZE
          });

          if (error) {
            console.warn('⚠️ RPC fetch_county_data_extended error:', error);
            break;
          }

          if (!data || data.length === 0) {
            break;
          }

          allCountyData = allCountyData.concat(data);
          console.log(`📊 Fetched ${allCountyData.length} county records so far...`);

          hasMore = data.length === BATCH_SIZE;
          offset += BATCH_SIZE;
        }

        console.log(`✅ Total county records fetched: ${allCountyData.length}`);

        if (allCountyData.length > 0) {
          // Group results by division_id (UUID) - the actual database ID for counties
          const countyMap = new Map<string, {
            division_id: string; // UUID from database
            fips_code: string;
            county_name: string;
            state_code: string;
            total_votes: number;
            percent_reporting: number;
            candidates: Array<{
              candidate_id: string;
              candidate_name: string;
              party: string;
              votes: number;
            }>;
          }>();

          for (const row of allCountyData) {
            // Use division_id (UUID) as the key if available, fallback to fips_code
            const divisionId = row.division_id || row.fips_code;
            if (!divisionId) continue;

            if (!countyMap.has(divisionId)) {
              countyMap.set(divisionId, {
                division_id: row.division_id || row.fips_code, // Prefer UUID
                fips_code: row.fips_code || '',
                county_name: row.county_name || row.division_name || 'Unknown County',
                state_code: row.state_code,
                total_votes: 0,
                percent_reporting: row.percent_reporting || 100,
                candidates: []
              });
            }

            const county = countyMap.get(divisionId)!;
            const votes = row.votes || 0;
            county.total_votes += votes;
            county.candidates.push({
              candidate_id: row.candidate_id,
              candidate_name: row.full_name || 'Unknown',
              party: row.party_abbreviation || 'IND',
              votes: votes
            });
          }

          // Convert map to array format expected by AI prompt
          for (const [divisionId, county] of countyMap) {
            countyData.push({ id: county.division_id, name: county.county_name });
            countyBaselineResults.push({
              division_id: county.division_id, // Using actual UUID from RPC
              division_name: county.county_name,
              fips_code: county.fips_code,
              precincts_reporting: Math.round(county.percent_reporting),
              precincts_total: 100, // Default to 100 as baseline
              total_votes: county.total_votes,
              results: county.candidates
            });
          }

          console.log(`✅ Processed baseline results for ${countyBaselineResults.length} counties`);
        } else {
          console.warn('⚠️ No county data returned from RPC');
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch county results:', error);
      }
    } else {
      console.log('ℹ️ County data excluded by user preference');
    }

    // Create compact county data to reduce prompt size
    // Format: division_id|county_name|total_votes|candidate1_votes,candidate2_votes,...
    const compactCountyBaseline = countyBaselineResults.map(county => {
      const candidateVotes = county.results.map(r => `${r.candidate_id}:${r.votes}`).join(',');
      return `${county.division_id}|${county.division_name}|${county.total_votes}|${candidateVotes}`;
    });

    const countyListText = countyData.length > 0
      ? `\n\nCOUNTIES (${countyData.length} total) - Format: DIVISION_ID|NAME|TOTAL_VOTES|CANDIDATE_VOTES\n${compactCountyBaseline.join('\n')}`
      : '';

    const countyBaselineText = countyBaselineResults.length > 0
      ? `\n\n🚨 MANDATORY: You MUST output county_results for ALL ${countyBaselineResults.length} counties listed above. Do NOT skip any counties. Do NOT truncate. The response MUST contain exactly ${countyBaselineResults.length} county entries.`
      : countyData.length > 0
        ? `\n\n⚠️ No baseline county data available - generate realistic county results from scratch based on state totals.`
        : '';

    return `You are a political analyst creating a synthetic election scenario.

BASE RACE INFORMATION:
- Race: ${raceTitle}
- Office: ${raceOffice}
- State: ${race.state}
- District: ${race.district || 'N/A'}
- Total Votes (Baseline): ${raceTotalVotes}

CANDIDATES IN THIS SCENARIO (USE ONLY THESE CANDIDATES):
${candidateData.map((c, idx) => `- Candidate ${idx + 1}: ${c.name} (${c.party}): ${c.votes.toLocaleString()} votes (${c.percentage}%)
  CANDIDATE_ID: ${c.ap_candidate_id || c.id}`).join('\n')}

⚠️ CRITICAL: You MUST use the exact CANDIDATE_ID values listed above. Do NOT generate new IDs.${countyListText}${countyBaselineText}

SCENARIO PARAMETERS:
- Turnout Shift: ${scenario.turnoutShift > 0 ? '+' : ''}${scenario.turnoutShift}%
- Republican Vote Shift: ${scenario.republicanShift > 0 ? '+' : ''}${scenario.republicanShift}%
- Democrat Vote Shift: ${scenario.democratShift > 0 ? '+' : ''}${scenario.democratShift}%
- Independent Vote Shift: ${scenario.independentShift > 0 ? '+' : ''}${scenario.independentShift}%
- County Strategy: ${scenario.countyStrategy}
- Custom Instructions: ${scenario.customInstructions || 'None'}

TASK:
Generate a synthetic election scenario based on these parameters with FULL COUNTY-LEVEL RESULTS.

⭐ YOU MUST OUTPUT COMPACT JSON (no extra whitespace, no newlines within arrays).

SCHEMA - Use this exact structure but OUTPUT ON MINIMAL LINES:
{"race":{"title":"...","office":"...","state":"...","state_code":"XX","totalVotes":N},"candidates":[{"candidate_id":"...","candidate_name":"...","party":"...","ballot_order":N,"withdrew":false,"write_in":false,"metadata":{"votes":N,"vote_percentage":N,"winner":BOOL}}],"county_results":[{"division_id":"UUID","precincts_reporting":N,"precincts_total":N,"total_votes":N,"results":[{"candidate_id":"...","votes":N}]}],"summary":"..."}

CRITICAL RULES:
1. Include the "race" object with title, office, state, state_code, and totalVotes
2. Include EXACTLY ${candidateData.length} candidate(s) - one for each candidate listed above
3. Copy-paste the exact CANDIDATE_ID for each candidate (e.g., \"${candidateData[0]?.ap_candidate_id || candidateData[0]?.id}\")
4. ⚠️ MUST include candidate_name and party for EVERY candidate - copy exactly from the candidate list above
5. DO NOT use thousand separators in numbers (write 805374 NOT 805,374)
6. Apply the party-specific vote shifts to calculate new vote totals
7. Apply the turnout shift to adjust overall total votes
8. Ensure all percentages add up to 100%
9. Mark the candidate with the most votes as winner: true in metadata
10. Set ballot_order as 1, 2, 3, etc.
11. ${countyData.length > 0 ? `🚨 MANDATORY: Generate county_results for ALL ${countyData.length} counties. Your response MUST have exactly ${countyData.length} entries in county_results array. Do NOT stop early.` : 'county_results can be an empty array if no counties available'}
12. For each county, include results for ALL candidates with votes and rank
13. County total_votes should equal the sum of all candidate votes in that county
14. Rank candidates in each county (1 = most votes, 2 = second, etc.)
15. Use exact DIVISION_ID from the county list above
16. For state_code, use the two-letter abbreviation (e.g., GA for Georgia, TX for Texas, CA for California)
17. Output ONLY valid JSON - no markdown, no code blocks, no extra text
18. ⚠️ CRITICAL: Output COMPACT JSON - NO pretty-printing, NO newlines between array items, NO indentation.

🚨 FINAL CHECK: Your county_results array MUST contain exactly ${countyData.length} entries. Count: ${countyData.length}. Do not stop until you have output all ${countyData.length} counties.`;
  };

  // Generate preview using AI
  const runPreview = async (
    scenario: ScenarioInput,
    race: Race,
    candidates: Candidate[]
  ): Promise<SyntheticPreview | null> => {
    setIsLoading(true);
    setError(null);
    setProgressStatus('Building prompt with county data...');

    try {
      const prompt = await buildAIPrompt(race, candidates, scenario);

      console.log('📊 Generating synthetic scenario with AI...');
      console.log('🗳️ Race:', race.title);
      console.log('👥 Candidates:', candidates.length);

      // Count counties in prompt
      const countyCount = (prompt.match(/COUNTIES \((\d+) total\)/)?.[1]) || '0';
      setProgressStatus(`Sending request to AI (${countyCount} counties)... This may take 1-3 minutes.`);

      // Call AI provider chat endpoint to generate scenario
      const response = await fetch(
        getEdgeFunctionUrl('ai_provider/chat'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            providerId: scenario.aiProvider,
            message: prompt,
            dashboard: 'elections',
          }),
        }
      );

      setProgressStatus('Receiving AI response...');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to generate preview');
      }

      const aiResponse = await response.json();
      setProgressStatus('Parsing AI response...');
      
      // Parse AI response
      let parsedContent;
      try {
        // Try to extract JSON from the response
        let content = aiResponse.response || aiResponse.content || aiResponse.text || '';
        
        console.log('🔍 Raw AI response:', content.substring(0, 500));
        
        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // More aggressive thousand separator removal
        // Match numbers with commas and remove all commas from them
        content = content.replace(/(\d+),(\d+)/g, (match, p1, p2) => {
          // Keep removing commas until none are left
          let result = match;
          while (result.includes(',')) {
            result = result.replace(/(\d+),(\d+)/g, '$1$2');
          }
          return result;
        });
        
        // Remove trailing commas before closing braces/brackets (invalid JSON)
        content = content.replace(/,(\s*[}\]])/g, '$1');
        
        // Remove any non-JSON text before the opening brace
        const jsonStart = content.indexOf('{');
        if (jsonStart > 0) {
          content = content.substring(jsonStart);
        }
        
        // Remove any non-JSON text after the closing brace
        const jsonEnd = content.lastIndexOf('}');
        if (jsonEnd >= 0 && jsonEnd < content.length - 1) {
          content = content.substring(0, jsonEnd + 1);
        }
        
        console.log('🧹 Cleaned content:', content.substring(0, 500));
        
        parsedContent = JSON.parse(content);
        console.log('✅ Successfully parsed JSON:', parsedContent);
        
        // Enrich candidate data with names and parties if AI didn't include them
        if (parsedContent.candidates && Array.isArray(parsedContent.candidates)) {
          parsedContent.candidates = parsedContent.candidates.map((c: any) => {
            // If candidate_name or party is missing, look it up from original candidates
            if (!c.candidate_name || !c.party) {
              const originalCandidate = candidates.find(orig => 
                orig.ap_candidate_id === c.candidate_id || orig.race_candidates_id === c.candidate_id || orig.id === c.candidate_id
              );
              
              if (originalCandidate) {
                const name = typeof originalCandidate.name === 'object' 
                  ? originalCandidate.name.overriddenValue || originalCandidate.name.originalValue 
                  : originalCandidate.name;
                const party = typeof originalCandidate.party === 'object'
                  ? originalCandidate.party.overriddenValue || originalCandidate.party.originalValue
                  : originalCandidate.party;
                
                return {
                  ...c,
                  candidate_name: c.candidate_name || name,
                  party: c.party || party,
                };
              }
            }
            return c;
          });
        }
        
        // Log county results info
        if (parsedContent.county_results && parsedContent.county_results.length > 0) {
          console.log(`🗺️ Generated county-level results for ${parsedContent.county_results.length} counties`);
        } else {
          console.log('⚠️ No county-level results generated');
        }
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError);
        console.error('Raw AI Response:', aiResponse);
        console.error('Content that failed to parse:', content?.substring(0, 1000));
        throw new Error(`AI response was not in expected format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      const preview: SyntheticPreview = {
        scenario,
        synthesizedResults: {
          // Transform the AI's candidate format to our display format
          candidates: (parsedContent.candidates || []).map((c: any) => {
            // Find the matching candidate from the original list by ap_candidate_id first, then fall back
            const originalCandidate = candidates.find(orig => 
              orig.ap_candidate_id === c.candidate_id || orig.race_candidates_id === c.candidate_id || orig.id === c.candidate_id
            );
            
            const name = originalCandidate 
              ? (typeof originalCandidate.name === 'object' 
                  ? originalCandidate.name.overriddenValue || originalCandidate.name.originalValue 
                  : originalCandidate.name)
              : 'Unknown Candidate';
            
            const party = originalCandidate
              ? (typeof originalCandidate.party === 'object'
                  ? originalCandidate.party.overriddenValue || originalCandidate.party.originalValue
                  : originalCandidate.party)
              : 'IND';
            
            return {
              id: c.candidate_id,
              name,
              party,
              votes: c.metadata?.votes || 0,
              percentage: c.metadata?.vote_percentage || 0,
              winner: c.metadata?.winner || false,
            };
          }),
          totalVotes: (parsedContent.candidates || []).reduce((sum: number, c: any) => 
            sum + (c.metadata?.votes || 0), 0),
          countyChanges: parsedContent.county_results || [],
        },
        aiSummary: parsedContent.summary || 'No summary provided',
        aiResponse: parsedContent, // Store the full structured response for the RPC
        originalCandidates: candidates, // Store the original candidates list used in the preview
      };

      const countyResultsCount = parsedContent.county_results?.length || 0;
      setProgressStatus(`Complete! Generated ${countyResultsCount} county results.`);

      setIsLoading(false);
      setProgressStatus(null);
      return preview;
    } catch (err) {
      console.error('Error generating preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
      setIsLoading(false);
      setProgressStatus(null);
      return null;
    }
  };

  // Save synthetic race to database
  const confirmSave = async (
    preview: SyntheticPreview,
    race: Race,
    candidates: Candidate[] // This parameter is now deprecated, use preview.originalCandidates instead
  ): Promise<{ success: boolean; syntheticRaceId?: string; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the candidates from the preview (includes modified/synthetic candidates)
      const candidatesForLookup = preview.originalCandidates;
      
      console.log('🔍 Using candidates from preview for lookup:', candidatesForLookup.map(c => ({
        id: c.id,
        name: typeof c.name === 'object' ? c.name.overriddenValue || c.name.originalValue : c.name,
        isSynthetic: String(c.id).startsWith('synthetic_')
      })));
      
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();

      console.log('🔍 DEBUG: Race object structure:', {
        id: race.id,
        race_id: race.race_id,
        election_id: race.election_id,
        race_results_id: race.race_results_id,
        election_id_type: typeof race.election_id
      });

      // The election_id might be a string code like "ap_p_2024" instead of the UUID
      // We need to fetch the actual UUID from e_elections table
      let baseElectionUuid = race.election_id;
      
      // Check if election_id is a valid UUID (has dashes) or a string code
      const isUuid = race.election_id.includes('-');
      
      if (!isUuid) {
        console.log('⚠️ election_id is not a UUID, looking up the actual UUID from e_elections...');
        
        // Fetch the election UUID from e_elections where election_id matches
        const { data: electionData, error: electionError } = await supabase
          .from('e_elections')
          .select('id')
          .eq('election_id', race.election_id)
          .single();
        
        if (electionError || !electionData) {
          console.error('❌ Failed to lookup election UUID:', electionError);
          throw new Error(`Could not find election with election_id: ${race.election_id}`);
        }
        
        baseElectionUuid = electionData.id;
        console.log('✅ Found election UUID:', baseElectionUuid);
      }

      console.log('Saving synthetic race with params:', {
        p_user_id: user?.id ?? null,
        p_base_race_id: race.race_id, // UUID from e_races table
        p_base_election_id: baseElectionUuid, // UUID from e_elections.id
        race_object: { 
          id: race.id, 
          race_id: race.race_id, 
          election_id: race.election_id,
          resolved_election_uuid: baseElectionUuid,
          race_results_id: race.race_results_id 
        }
      });

      // Check if race_id is a valid UUID
      const isRaceIdUuid = race.race_id && typeof race.race_id === 'string' && race.race_id.includes('-');
      
      // If race_id is not a UUID (e.g., it's a synthetic race), set it to null
      const baseRaceId = isRaceIdUuid ? race.race_id : null;
      
      console.log('🔍 Base race ID check:', {
        original_race_id: race.race_id,
        is_uuid: isRaceIdUuid,
        will_use: baseRaceId
      });

      // Call Supabase RPC to create synthetic race
      const rpcPayload = {
        p_user_id: user?.id ?? null,
        p_base_race_id: baseRaceId, // UUID from e_races table or null if synthetic base
        p_base_election_id: baseElectionUuid, // UUID from e_elections.id (not election_id code)
        p_name: preview.scenario.name, // The scenario name entered by the user
        p_description: preview.scenario.customInstructions || '',
        p_office: typeof race.office === 'object' 
          ? race.office.overriddenValue || race.office.originalValue 
          : race.office,
        p_state: race.state,
        p_district: race.district || null,
        p_summary: typeof preview.aiResponse.summary === 'string' 
          ? { text: preview.aiResponse.summary }
          : preview.aiResponse.summary,
        p_scenario_input: {
          ...preview.scenario,
          override_by: user?.id ?? null,
        },
        p_ai_response: {
          // Map county results candidate IDs from AP ID to race_candidates_id
          county_results: (preview.aiResponse.county_results || []).map((county: any) => ({
            ...county,
            results: (county.results || []).map((result: any) => {
              const originalCandidate = candidatesForLookup.find(orig => 
                orig.ap_candidate_id === result.candidate_id
              );
              
              console.log(`🔍 County mapping: "${result.candidate_id}" → "${originalCandidate?.race_candidates_id || 'NOT FOUND'}"`);
              
              return {
                ...result,
                candidate_id: originalCandidate?.race_candidates_id || result.candidate_id
              };
            })
          })),
          // Map AP candidate IDs back to race_candidates_id (UUID) for database operations
          candidates: (preview.aiResponse.candidates || []).map((c: any) => {
            const isSynthetic = c.candidate_id && String(c.candidate_id).startsWith('synthetic_');
            
            // Look up the original candidate to get race_candidates_id from ap_candidate_id OR id (for synthetic candidates)
            const originalCandidate = candidatesForLookup.find(orig => 
              orig.ap_candidate_id === c.candidate_id || orig.id === c.candidate_id
            );
            
            // Find display candidate for synthetic scenarios
            const displayCandidate = preview.synthesizedResults.candidates.find(
              (sc: any) => sc.id === c.candidate_id
            );
            
            // Extract headshot value (handle FieldOverride type)
            let headshotUrl = null;
            if (originalCandidate?.headshot) {
              headshotUrl = typeof originalCandidate.headshot === 'object' 
                ? (originalCandidate.headshot.overriddenValue || originalCandidate.headshot.originalValue)
                : originalCandidate.headshot;
            }
            
            console.log(`🔍 Mapping candidate: AI returned "${c.candidate_id}"`);
            console.log(`   - Looking up ap_candidate_id: "${c.candidate_id}"`);
            console.log(`   - Found original candidate:`, originalCandidate ? 'YES' : 'NO');
            if (originalCandidate) {
              console.log(`   - race_candidates_id: "${originalCandidate.race_candidates_id}"`);
              console.log(`   - headshot field exists:`, originalCandidate.headshot ? 'YES' : 'NO');
              console.log(`   - headshot type:`, typeof originalCandidate.headshot);
              console.log(`   - headshot raw value:`, originalCandidate.headshot);
              console.log(`   - extracted headshot URL:`, headshotUrl || 'NULL');
            }
            
            return {
              ...c,
              // Convert ap_candidate_id to race_candidates_id (UUID) for database, or null for synthetic
              candidate_id: isSynthetic ? null : (originalCandidate?.race_candidates_id || c.candidate_id),
              // Preserve headshot from original candidate data
              headshot: headshotUrl,
              // Add candidate metadata for backend to create new records if synthetic
              ...(isSynthetic && displayCandidate ? {
                candidate_name: displayCandidate.name,
                candidate_party: displayCandidate.party,
              } : {})
            };
          })
        },
      };

      console.log('🚀 === ACTUAL SAVE PAYLOAD BEING SENT TO RPC ===');
      console.log(JSON.stringify(rpcPayload, null, 2));
      console.log('===========================================');
      
      // Debug: Log just the candidates array with headshots
      console.log('🖼️ === CANDIDATES WITH HEADSHOTS ===');
      rpcPayload.p_ai_response.candidates.forEach((c: any, idx: number) => {
        console.log(`Candidate ${idx + 1}:`, {
          candidate_id: c.candidate_id,
          candidate_name: c.candidate_name,
          party: c.party,
          headshot: c.headshot || 'MISSING'
        });
      });
      console.log('=========================================');

      // Call RPC with exact parameter order required by the backend
      const { data, error } = await supabase.rpc('e_create_synthetic_race', {
        p_user_id: rpcPayload.p_user_id,
        p_base_race_id: rpcPayload.p_base_race_id,
        p_base_election_id: rpcPayload.p_base_election_id,
        p_name: rpcPayload.p_name,
        p_description: rpcPayload.p_description,
        p_scenario_input: rpcPayload.p_scenario_input,
        p_ai_response: rpcPayload.p_ai_response,
        p_office: rpcPayload.p_office,
        p_state: rpcPayload.p_state,
        p_district: rpcPayload.p_district,
        p_summary: rpcPayload.p_summary,
        p_synthetic_group_id: preview.scenario.syntheticGroupId || null, // Pass group ID if specified
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        throw new Error(error.message || 'Failed to save synthetic race');
      }

      const syntheticRaceId = data?.synthetic_race_id || data?.id;

      setIsLoading(false);
      return { success: true, syntheticRaceId };
    } catch (err) {
      console.error('Error saving synthetic race:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save synthetic race';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  return {
    isLoading,
    error,
    providers,
    fetchProviders,
    runPreview,
    confirmSave,
    deleteSyntheticRace: async (syntheticRaceId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log('🗑️ Deleting synthetic race:', syntheticRaceId);

        const { error } = await supabase.rpc('e_delete_synthetic_race', {
          p_synthetic_race_id: syntheticRaceId
        });

        if (error) {
          console.error('❌ Delete RPC Error:', error);
          throw new Error(error.message || 'Failed to delete synthetic race');
        }

        console.log('✅ Successfully deleted synthetic race');
        return { success: true };
      } catch (err) {
        console.error('Error deleting synthetic race:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete synthetic race';
        return { success: false, error: errorMessage };
      }
    },
    // Synthetic groups functions
    syntheticGroups,
    fetchSyntheticGroups,
    createSyntheticGroup,
    deleteSyntheticGroup,
    // Progress status for UI
    progressStatus,
  };
}