/**
 * Election Component Processor
 * Generates multiple elements for election results display (headers, races, ballot measures, footers)
 */

/**
 * Process Election component - generates multiple elements (header items, races, proposals, footer items)
 */
export async function processElectionComponent(
  field: any,
  config: any,
  supabase: any,
  item: any
): Promise<any[]> {
  const elements = [];

  try {
    // Parse the component value to get election configuration
    let electionConfig;
    try {
      console.log('🗳️ Processing election component - field.value:', field.value);
      electionConfig = JSON.parse(field.value);
      console.log('🗳️ Parsed electionConfig:', JSON.stringify(electionConfig));
    } catch (e) {
      console.error('❌ Error parsing election component value:', e);
      return [];
    }

    const {
      electionId,
      regionId = '',
      showParty = false,
      showIncumbentStar = false,
      showZeroVotes = false,
      showEstimatedIn = true,
      headerItems = [],
      footerItems = [],
      presidentialTemplate = '',
      raceTemplate = 'VOTE_{numCandidates}HEADS',
      proposalTemplate = 'VOTE_PUBLIC_QUESTION',
      partyMaterialPrefix = 'MATERIAL*ONLINE_2019/N12/MASTER_CONTROL/ELECTIONS/'
    } = electionConfig;

    console.log('🗳️ Election config:', {
      electionId,
      regionId,
      headerItemsCount: headerItems.length,
      footerItemsCount: footerItems.length,
      presidentialTemplate,
      raceTemplate,
      proposalTemplate
    });

    if (!electionId) {
      console.log('⚠️ No electionId in election component config');
      return [];
    }

    // Generate header items
    for (let i = 0; i < headerItems.length; i++) {
      const headerItem = headerItems[i];

      // Extract template name from object or string
      let templateName = null;
      if (headerItem.template) {
        // Handle object format {label: "...", value: "..."}
        if (typeof headerItem.template === 'object' && headerItem.template.value) {
          templateName = headerItem.template.value;
        } else if (typeof headerItem.template === 'string') {
          templateName = headerItem.template;
        }
      } else if (headerItem.templateName) {
        templateName = headerItem.templateName;
      }

      // Skip if no template specified
      if (!templateName) {
        continue;
      }

      const element: {
        id: string;
        fields: { name: string; value: string }[];
        template?: string;
        duration?: string;
      } = {
        id: `${item.id}_header_${i}`,
        fields: []
      };

      element.template = templateName;

      // Add fields from headerItem if provided
      if (headerItem.fields && Array.isArray(headerItem.fields)) {
        for (const fieldDef of headerItem.fields) {
          if (fieldDef.name && fieldDef.value !== undefined) {
            element.fields.push({
              name: fieldDef.name,
              value: String(fieldDef.value)
            });
          }
        }
      }

      if (item.duration && item.duration > 0) {
        element.duration = item.duration.toString();
      }

      elements.push(element);
    }

    // Fetch election race data from e_race_results (which has the actual vote counts)
    let query = supabase
      .from('e_race_results')
      .select(`
        id,
        race_id,
        precincts_reporting,
        precincts_total,
        percent_reporting,
        total_votes,
        precincts_reporting_override,
        precincts_total_override,
        percent_reporting_override,
        total_votes_override,
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
            first_name,
            last_name,
            full_name,
            display_name,
            party_id,
            incumbent,
            incumbent_override,
            e_parties (
              name,
              abbreviation
            )
          )
        )
      `)
      .eq('e_races.e_elections.id', electionId);

    // Apply state filter if regionId is provided
    if (regionId) {
      query = query.eq('e_races.e_geographic_divisions.code', regionId.toUpperCase());
    }

    const { data: raceResults, error: racesError } = await query;

    if (racesError) {
      console.error('❌ Error fetching election races:', racesError);
    }

    console.log(`🗳️ Fetched ${(raceResults || []).length} race results from database`);

    // Sort races by priority_level (descending, so 10 comes first), then alphabetically by name
    const sortedRaceResults = (raceResults || []).sort((a: any, b: any) => {
      const priorityA = a.e_races?.priority_level || 0;
      const priorityB = b.e_races?.priority_level || 0;

      // First sort by priority_level descending (higher priority first)
      if (priorityB !== priorityA) {
        return priorityB - priorityA;
      }

      // Then sort alphabetically by race name
      const nameA = a.e_races?.display_name || a.e_races?.name || '';
      const nameB = b.e_races?.display_name || b.e_races?.name || '';
      return nameA.localeCompare(nameB);
    });

    console.log(`🗳️ Sorted races by priority_level (desc) then name (asc)`);

    // Also fetch e_race_candidates for withdrew status
    const raceIds = (sortedRaceResults || []).map((rr: any) => rr.race_id).filter(Boolean);
    let raceCandidatesMap = new Map();

    if (raceIds.length > 0) {
      const { data: raceCandidatesData } = await supabase
        .from('e_race_candidates')
        .select('race_id, candidate_id, withdrew, withdrew_override')
        .in('race_id', raceIds);

      if (raceCandidatesData) {
        for (const rc of raceCandidatesData) {
          const key = `${rc.race_id}-${rc.candidate_id}`;
          raceCandidatesMap.set(key, rc);
        }
      }
    }

    // Generate race elements
    for (let raceIndex = 0; raceIndex < (sortedRaceResults || []).length; raceIndex++) {
      const raceResult = sortedRaceResults[raceIndex];
      const race = raceResult.e_races;
      if (!race) continue;

      const candidateResults = raceResult.e_candidate_results || [];

      // Filter out withdrawn candidates and get actual vote data
      let candidates = [];
      for (const candidateResult of candidateResults) {
        const candidate = candidateResult.e_candidates;
        if (!candidate) continue;

        // Check if withdrew
        const raceCandidateKey = `${raceResult.race_id}-${candidateResult.candidate_id}`;
        const raceCandidate = raceCandidatesMap.get(raceCandidateKey);
        const withdrew = raceCandidate?.withdrew_override !== null && raceCandidate?.withdrew_override !== undefined
          ? raceCandidate.withdrew_override
          : raceCandidate?.withdrew;

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

        candidates.push({
          votes: votes || 0,
          votePercentage: votePercentage || 0,
          winner: winner || false,
          candidate: candidate,
          incumbent: incumbent || false
        });
      }

      // Sort candidates by votes (descending)
      let sortedCandidates = [...candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));

      // Check if this is a presidential race (priority_level=10)
      const isPresidential = race.priority_level === 10;

      // For presidential races, don't filter zero votes - we always want DEM and GOP
      if (!showZeroVotes && !isPresidential) {
        sortedCandidates = sortedCandidates.filter((c: any) => (c.votes || 0) > 0);
      }

      // For non-presidential races, limit to maximum 9 candidates for ticker display
      // Presidential races will be filtered to exactly 2 candidates (DEM, GOP) later
      if (!isPresidential) {
        sortedCandidates = sortedCandidates.slice(0, 9);
      }

      // Calculate total votes for percentages
      const totalVotes = sortedCandidates.reduce((sum, c) => sum + (c.votes || 0), 0);

      // Use override values for race-level data
      const percentReporting = raceResult.percent_reporting_override !== null && raceResult.percent_reporting_override !== undefined
        ? raceResult.percent_reporting_override
        : raceResult.percent_reporting;

      // Create element for this race
      const element: {
        id: string;
        fields: { name: string; value: string }[];
        template?: string;
        duration?: string;
      } = {
        id: `${item.id}_race_${raceIndex}`,
        fields: []
      };

      // Determine template and sort candidates accordingly
      let templateName: string;
      let candidatesToDisplay = sortedCandidates;

      if (isPresidential && presidentialTemplate) {
        // Presidential race - use special template
        templateName = presidentialTemplate;

        // Log all candidates and their parties for debugging
        console.log(`🗳️ Presidential race - all candidates:`, sortedCandidates.map(c => ({
          name: c.candidate?.display_name || c.candidate?.full_name,
          party: c.candidate?.e_parties?.abbreviation,
          votes: c.votes
        })));

        // Sort: Democrat first, Republican second
        // Find Democrat and Republican candidates (check both DEM/Dem and REP/GOP, case-insensitive)
        const democrat = sortedCandidates.find(c =>
          c.candidate?.e_parties?.abbreviation?.toUpperCase() === 'DEM'
        );
        const republican = sortedCandidates.find(c => {
          const party = c.candidate?.e_parties?.abbreviation?.toUpperCase();
          return party === 'GOP' || party === 'REP';
        });

        // Build ordered candidate list: Dem, GOP, then others by votes
        candidatesToDisplay = [];
        if (democrat) candidatesToDisplay.push(democrat);
        if (republican) candidatesToDisplay.push(republican);

        console.log(`🗳️ Presidential race detected, using template: ${templateName}, showing ${candidatesToDisplay.length} candidates (DEM: ${democrat ? 'found' : 'missing'}, GOP/REP: ${republican ? 'found' : 'missing'})`);
      } else {
        // Regular race - determine template based on number of candidates (after filtering)
        const numCandidates = sortedCandidates.length;
        templateName = raceTemplate.replace('{numCandidates}', String(numCandidates));
      }

      element.template = templateName;

      // Extract district from geographic division
      const division = race.e_geographic_divisions;
      const district = division?.fips_code || '';

      // Add race-level fields
      element.fields.push(
        { name: 'raceId', value: race.race_id || String(race.id) },
        { name: 'raceName', value: race.display_name || race.name || '' },
        { name: 'district', value: district },
        { name: 'pctRpt', value: String(percentReporting || 0) },
        { name: 'showParty', value: showParty ? '1' : '0' },
        { name: 'repOption', value: showEstimatedIn ? '1' : '0' }
      );

      // Add candidate fields (numbered 1-N)
      for (let i = 0; i < candidatesToDisplay.length; i++) {
        const candidateData = candidatesToDisplay[i];
        const candidateInfo = candidateData.candidate;
        const partyInfo = candidateInfo?.e_parties;
        const candidateNum = i + 1;

        const votes = candidateData.votes || 0;
        const percent = candidateData.votePercentage?.toFixed(1) || '0.0';
        const rank = i + 1;
        const isWinner = candidateData.winner || false;
        const isIncumbent = candidateData.incumbent || false;

        // Party color material path
        let partyColorMaterial = '';
        if (showParty && partyInfo?.abbreviation) {
          partyColorMaterial = `${partyMaterialPrefix}${partyInfo.abbreviation.toUpperCase()}`;
        }

        // Format last name with incumbent star if configured
        let lastName = candidateInfo?.last_name || '';
        if (showIncumbentStar && isIncumbent) {
          lastName += '*';
        }

        element.fields.push(
          { name: `partyColor${candidateNum}.material`, value: partyColorMaterial },
          { name: `partyTxt${candidateNum}`, value: partyInfo?.abbreviation || '' },
          { name: `firstName${candidateNum}`, value: candidateInfo?.first_name || '' },
          { name: `lastName${candidateNum}`, value: lastName },
          { name: `percent${candidateNum}`, value: percent },
          { name: `votes${candidateNum}`, value: String(votes) },
          { name: `rank${candidateNum}`, value: String(rank) },
          { name: `winner${candidateNum}`, value: isWinner ? '1' : '0' }
        );
      }

      if (item.duration && item.duration > 0) {
        element.duration = item.duration.toString();
      }

      elements.push(element);
    }

    // Fetch ballot measures for this election
    console.log(`🗳️ Fetching ballot measures for election ${electionId}`);

    let ballotMeasureQuery = supabase
      .from('e_ballot_measure_results')
      .select(`
        id,
        measure_id,
        yes_votes,
        no_votes,
        yes_percentage,
        no_percentage,
        passed,
        precincts_reporting,
        precincts_total,
        percent_reporting,
        e_ballot_measures!inner (
          id,
          measure_id,
          number,
          title,
          summary,
          type,
          election_id,
          e_elections!inner (
            id,
            election_id
          ),
          e_geographic_divisions (
            code,
            fips_code
          )
        )
      `)
      .eq('e_ballot_measures.election_id', electionId);

    // Apply state filter if regionId is provided
    if (regionId) {
      ballotMeasureQuery = ballotMeasureQuery.eq('e_ballot_measures.e_geographic_divisions.code', regionId.toUpperCase());
    }

    const { data: ballotMeasureResults, error: ballotMeasuresError } = await ballotMeasureQuery;

    if (ballotMeasuresError) {
      console.error('❌ Error fetching ballot measures:', ballotMeasuresError);
    }

    console.log(`🗳️ Fetched ${(ballotMeasureResults || []).length} ballot measure results from database`);

    // Generate ballot measure/proposal elements
    for (let measureIndex = 0; measureIndex < (ballotMeasureResults || []).length; measureIndex++) {
      const measureResult = ballotMeasureResults[measureIndex];
      const measure = measureResult.e_ballot_measures;
      if (!measure) continue;

      // Create element for this ballot measure
      const element: {
        id: string;
        fields: { name: string; value: string }[];
        template?: string;
        duration?: string;
      } = {
        id: `${item.id}_ballot_measure_${measureIndex}`,
        fields: [],
        template: proposalTemplate
      };

      // Get vote data
      const yesVotes = measureResult.yes_votes || 0;
      const noVotes = measureResult.no_votes || 0;
      const yesPercent = measureResult.yes_percentage?.toFixed(1) || '0.0';
      const noPercent = measureResult.no_percentage?.toFixed(1) || '0.0';
      const percentReporting = measureResult.percent_reporting || 0;
      const leading = yesVotes > noVotes ? 'YES' : 'NO';

      // Format measure name (e.g., "Prop 1" or just the title)
      const measureName = measure.number
        ? `${measure.type || 'Measure'} ${measure.number}: ${measure.title}`
        : measure.title;

      // Add proposal fields
      element.fields.push(
        { name: 'raceId', value: measure.measure_id || String(measure.id) },
        { name: 'raceName', value: measureName },
        { name: 'pctRpt', value: String(percentReporting) },
        { name: 'yesVotes', value: String(yesVotes) },
        { name: 'yesPercent', value: yesPercent },
        { name: 'noVotes', value: String(noVotes) },
        { name: 'noPercent', value: noPercent },
        { name: 'leading', value: leading }
      );

      if (item.duration && item.duration > 0) {
        element.duration = item.duration.toString();
      }

      elements.push(element);
    }

    // Generate footer items
    for (let i = 0; i < footerItems.length; i++) {
      const footerItem = footerItems[i];

      // Extract template name from object or string
      let templateName = null;
      if (footerItem.template) {
        // Handle object format {label: "...", value: "..."}
        if (typeof footerItem.template === 'object' && footerItem.template.value) {
          templateName = footerItem.template.value;
        } else if (typeof footerItem.template === 'string') {
          templateName = footerItem.template;
        }
      } else if (footerItem.templateName) {
        templateName = footerItem.templateName;
      }

      // Skip if no template specified
      if (!templateName) {
        continue;
      }

      const element: {
        id: string;
        fields: { name: string; value: string }[];
        template?: string;
        duration?: string;
      } = {
        id: `${item.id}_footer_${i}`,
        fields: []
      };

      element.template = templateName;

      // Add fields from footerItem if provided
      if (footerItem.fields && Array.isArray(footerItem.fields)) {
        for (const fieldDef of footerItem.fields) {
          if (fieldDef.name && fieldDef.value !== undefined) {
            element.fields.push({
              name: fieldDef.name,
              value: String(fieldDef.value)
            });
          }
        }
      }

      if (item.duration && item.duration > 0) {
        element.duration = item.duration.toString();
      }

      elements.push(element);
    }

  } catch (error) {
    console.error('❌ Error processing election component:', error);
  }

  console.log(`🗳️ Returning ${elements.length} total elements (headers + races + ballot measures + footers)`);
  return elements;
}
