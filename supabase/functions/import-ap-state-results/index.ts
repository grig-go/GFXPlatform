// Optimized Supabase Edge Function - Batch processing for speed
// Deploy as: import-ap-state-results-fast
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from "../_shared/cors.ts";
import { stateFIPS } from "../election/state-fips.ts";
import { isYearDivisibleBy } from "../election/functions.ts";
import { AP_CURRENT_ELECTION_DATE } from "../election/config.ts";
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const startTime = Date.now();
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apApiKey = Deno.env.get('AP_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Parse request
    let { electionDate, officeID = 'P', resultsType = 'l', raceName = 'Presidential Election', raceType = 'presidential' } = await req.json();
    if (!electionDate) {
      electionDate = AP_CURRENT_ELECTION_DATE;
    }
    if (!electionDate) {
      throw new Error('electionDate is required');
    }
    if (raceType === 'presidential' && !isYearDivisibleBy(electionDate, 4)) {
      throw new Error(`Invalid election year ${electionDate} for presidential state race`);
    } else if (raceType === 'senate' && !isYearDivisibleBy(electionDate, 2)) {
      throw new Error(`Invalid election year ${electionDate} for senate state race`);
    }
    // Fetch AP call history
    const { data: apHistory, error: apError } = await supabase.from('e_ap_call_history').select('id, nextrequest').eq('officeid', officeID).eq('resultstype', resultsType).eq('level', 'state').eq('electiondate', electionDate).limit(1).maybeSingle();
    //return new Response(JSON.stringify({ error: apHistory }), { status: 500 })
    if (apError) {
      return new Response(JSON.stringify({
        error: apError.message
      }), {
        status: 500
      });
    }
    let apUrl = '';
    if (!apHistory) {
      // Fetch AP data
      apUrl = `https://api.ap.org/v2/elections/${electionDate}?format=json&officeID=${officeID}&level=state&resultstype=${resultsType}`;
    } else {
      apUrl = apHistory.nextrequest;
    }
    console.log('Fetching AP data from:', apUrl);
    const apResponse = await fetch(apUrl, {
      headers: {
        'x-api-key': apApiKey
      }
    });
    if (!apResponse.ok) {
      throw new Error(`AP API error: ${apResponse.status}`);
    }
    const apData = await apResponse.json();
    if (!apData.races?.length) {
      throw new Error(`Invalid election date or no new data for ${electionDate} ${raceType} state race`);
    }
    if (apData.nextrequest) {
      // Build the row to upsert
      const aprow = {
        officeid: officeID,
        resultstype: resultsType,
        electiondate: electionDate,
        level: 'state',
        nextrequest: apData.nextrequest
      };
      // Only include id if it exists (updating existing row)
      if (apHistory?.id) {
        aprow.id = apHistory.id;
      }
      const { data: apInsertHistory, error: apError } = await supabase.from('e_ap_call_history').upsert([
        aprow
      ], {
        onConflict: [
          'id'
        ]
      }).select() // optional — returns inserted row(s)
      ;
      if (apError) {
        console.error('Error inserting call history:', apError);
        return new Response(JSON.stringify({
          apError
        }), {
          status: 500
        });
      }
    }
    // Get country ID (cached after first run)
    const { data: country } = await supabase.from('e_countries').select('id').eq('code_iso2', 'US').single();
    if (!country) throw new Error('USA e_country not found');
    // BATCH 1: Create election
    const electionYear = electionDate.substring(0, 4);
    const electionId = `ap_${officeID.toLowerCase()}_${electionYear}`;
    const { data: election, error: electionError } = await supabase.from('e_elections').upsert({
      election_id: electionId,
      country_id: country.id,
      name: `${electionYear} United States ${raceName}`,
      type: 'general',
      level: 'national',
      election_date: electionDate,
      status: 'completed',
      cycle: electionYear,
      metadata: {
        ap_event_id: apData.races?.[0]?.eventID,
        timestamp: apData.timestamp,
        office_id: officeID
      }
    }, {
      onConflict: 'election_id'
    }).select().single();
    if (electionError) {
      console.error('Election error:', electionError);
      throw new Error(`Failed to create election: ${electionError.message}`);
    }
    console.log('Election UUID:', election.id);
    // BATCH 2: Prepare all parties at once
    const { data: existParties } = await supabase.from('e_parties').select('abbreviation, color_hex, name').in('abbreviation', [
      'GOP',
      'Dem',
      'Grn',
      'Lib',
      'Ind'
    ]);
    const existingParties = {};
    for(let i = 0; i < existParties.length; i++){
      const { abbreviation, color_hex, name } = existParties[i];
      if (!existingParties[abbreviation]) {
        existingParties[abbreviation] = {
          name,
          color_hex
        };
      }
    }
    const partyData = [
      {
        code: 'GOP',
        name: existingParties['GOP']?.name ? existingParties['GOP'].name : 'Republican Party',
        color: existingParties['GOP']?.color_hex ? existingParties['GOP'].color_hex : '#FF0000'
      },
      {
        code: 'Dem',
        name: existingParties['Dem']?.name ? existingParties['Dem'].name : 'Democratic Party',
        color: existingParties['Dem']?.color_hex ? existingParties['Dem'].color_hex : '#0000FF'
      },
      {
        code: 'Grn',
        name: existingParties['Grn']?.name ? existingParties['Grn'].name : 'Green Party',
        color: existingParties['Grn']?.color_hex ? existingParties['Grn'].color_hex : '#2fa82f'
      },
      {
        code: 'Lib',
        name: existingParties['Lib']?.name ? existingParties['Lib'].name : 'Libertarian Party',
        color: existingParties['Lib']?.color_hex ? existingParties['Lib'].color_hex : '#efcb0a'
      },
      {
        code: 'Ind',
        name: existingParties['Ind']?.name ? existingParties['Ind'].name : 'Independent',
        color: existingParties['Ind']?.color_hex ? existingParties['Ind'].color_hex : '#808080'
      }
    ].map((p)=>({
        party_id: `ap_party_${p.code}`,
        country_id: country.id,
        name: p.name,
        //short_name: p.code,
        abbreviation: p.code,
        color_hex: p.color,
        active: true
      }));
    await supabase.from('e_parties').upsert(partyData, {
      onConflict: 'party_id'
    });
    // Get party mapping (abbreviation -> UUID)
    const { data: parties } = await supabase.from('e_parties').select('id, abbreviation').in('party_id', partyData.map((p)=>p.party_id));
    const partyMap = Object.fromEntries(parties?.map((p)=>[
        p.abbreviation,
        p.id
      ]) || []);
    // BATCH 3: Collect all unique data
    const statesData = [];
    const racesData = [];
    const candidatesData = [];
    const uniqueCandidates = new Map();
    // First pass: collect unique candidates and states
    for (const race of apData.races || []){
      const reportingUnit = race.reportingUnits?.[0];
      if (!reportingUnit || raceType === 'presidential' && race.seatNum) continue;
      const stateCode = reportingUnit.statePostal;
      const stateName = reportingUnit.stateName;
      // Collect state divisions (skip national 'US')
      if (stateCode !== 'US') {
        const divisionId = `ap_state_${stateCode.toLowerCase()}`;
        statesData.push({
          division_id: divisionId,
          country_id: country.id,
          name: stateName,
          type: 'state',
          code: stateCode,
          fips_code: stateFIPS[stateCode] || null,
          metadata: {
            ap_state_id: race.stateID
          }
        });
      } else {
        statesData.push({
          division_id: 'ap_national_us',
          country_id: country.id,
          name: stateName,
          type: 'national',
          code: stateCode,
          fips_code: stateFIPS[stateCode] || null,
          metadata: {
            ap_state_id: race.stateID
          }
        });
      }
      // Collect unique candidates
      for (const candidate of reportingUnit.candidates || []){
        // Skip "Other" and similar aggregate candidates
        if (candidate.polID === '100013' || candidate.polID === '100008') continue;
        if (!uniqueCandidates.has(candidate.polID)) {
          uniqueCandidates.set(candidate.polID, {
            candidate_id: `ap_candidate_${candidate.polID}`,
            first_name: candidate.first || null,
            last_name: candidate.last,
            full_name: `${candidate.first || ''} ${candidate.last}`.trim(),
            party_id: partyMap[candidate.party] || partyMap['Ind'],
            incumbent: candidate.incumbent || false,
            metadata: {
              ap_pol_id: candidate.polID,
              ap_pol_num: candidate.polNum
            }
          });
        }
      }
    }
    // Remove duplicate states
    const uniqueStates = statesData.filter((v, i, a)=>a.findIndex((e)=>e.division_id === v.division_id) === i);
    // BATCH 4: Insert states and get UUID mapping
    if (uniqueStates.length > 0) {
      console.log('Inserting geographic divisions:', uniqueStates.length);
      const { error: statesError } = await supabase.from('e_geographic_divisions').upsert(uniqueStates, {
        onConflict: 'division_id'
      });
      if (statesError) {
        console.error('Failed to upsert divisions:', statesError);
        throw new Error(`Division insert failed: ${statesError.message}`);
      }
    }
    // Get division UUID mapping (division_id -> UUID)
    // Only query if we have states to query for
    let divisionIdMap = {};
    if (uniqueStates.length > 0) {
      const { data: divisionRecords, error: divisionError } = await supabase.from('e_geographic_divisions').select('id, division_id').in('division_id', uniqueStates.map((s)=>s.division_id));
      if (divisionError) {
        console.error('Failed to fetch divisions:', divisionError);
        throw new Error(`Division fetch failed: ${divisionError.message}`);
      }
      divisionIdMap = Object.fromEntries(divisionRecords?.map((d)=>[
          d.division_id,
          d.id
        ]) || []);
      console.log('Division ID map:', divisionIdMap);
    }
    // BATCH 5: Insert candidates and get UUID mapping
    const candidatesArray = Array.from(uniqueCandidates.values());
    console.log('Total unique candidates to insert:', candidatesArray.length);
    if (candidatesArray.length > 0) {
      console.log('Inserting candidates:', candidatesArray.length);
      const { error: candidatesError } = await supabase.from('e_candidates').upsert(candidatesArray, {
        onConflict: 'candidate_id'
      });
      if (candidatesError) {
        console.error('Failed to upsert candidates:', candidatesError);
        throw new Error(`Candidate insert failed: ${candidatesError.message}`);
      }
    }
    const candidateIds = candidatesArray.map((c)=>c.candidate_id); // should be an array
    // Get candidate UUID mapping (candidate_id -> UUID)
    const BATCH_SIZE = 500;
    let candidateRecords = [];
    for(let i = 0; i < candidateIds.length; i += BATCH_SIZE){
      const batch = candidateIds.slice(i, i + BATCH_SIZE);
      const { data, candError } = await supabase.from('e_candidates').select('id, candidate_id').in('candidate_id', batch);
      if (candError) console.error('Batch error:', candError);
      if (data) candidateRecords.push(...data);
    }
    console.log('Fetched candidate records:', candidateRecords?.length || 0);
    const candidateIdMap = Object.fromEntries(candidateRecords?.map((c)=>[
        c.candidate_id,
        c.id
      ]) || []);
    console.log('Candidate ID map size:', Object.keys(candidateIdMap).length);
    // BATCH 6: Prepare races with correct UUID references
    for (const race of apData.races || []){
      const reportingUnit = race.reportingUnits?.[0];
      if (!reportingUnit || raceType === 'presidential' && race.seatNum) continue;
      const stateCode = reportingUnit.statePostal;
      const stateName = reportingUnit.stateName;
      // Get division UUID (null for national races)
      let divisionUUID = null;
      if (stateCode !== 'US') {
        const divisionExternalId = `ap_state_${stateCode.toLowerCase()}`;
        divisionUUID = divisionIdMap[divisionExternalId];
        if (!divisionUUID) {
          console.error(`Missing division UUID for ${divisionExternalId}`);
          console.error('Available divisions:', Object.keys(divisionIdMap));
          throw new Error(`Division UUID not found for state: ${stateCode}`);
        }
      } else {
        const divisionNationalId = 'ap_national_us';
        divisionUUID = divisionIdMap[divisionNationalId];
        if (!divisionUUID) {
          console.error(`Missing division UUID for ${divisionNationalId}`);
          console.error('Available divisions:', Object.keys(divisionIdMap));
          throw new Error(`Division UUID not found for state: ${stateCode}`);
        }
      }
      const raceId = `ap_${officeID.toLowerCase()}_${electionYear}_${stateCode.toLowerCase()}_${race.raceID || '0'}`;
      racesData.push({
        race_id: raceId,
        election_id: election.id,
        division_id: divisionUUID,
        name: race.seatName ? `${race.officeName} - ${stateName} ${race.seatName}` : `${race.officeName} - ${stateName}`,
        type: raceType,
        office: race.officeName,
        seat_name: race.seatName,
        term_length_years: officeID === 'P' ? 4 : officeID === 'S' ? 6 : 2,
        num_elect: 1,
        partisan: true,
        uncontested: false,
        rating: race.keyRace ? 'toss-up' : null,
        priority_level: stateCode === 'US' ? 10 : race.keyRace ? 8 : 5,
        metadata: {
          ap_race_id: race.raceID,
          electoral_votes: reportingUnit.electTotal,
          call_status: race.raceCallStatus,
          eevp: race.eevp
        }
      });
    }
    // Insert races
    if (racesData.length > 0) {
      console.log('Inserting races:', racesData.length);
      const { error: racesError } = await supabase.from('e_races').upsert(racesData, {
        onConflict: 'race_id'
      });
      if (racesError) {
        console.error('Failed to upsert races:', racesError);
        throw new Error(`Race insert failed: ${racesError.message}`);
      }
    }
    // Get race UUID mapping (race_id -> UUID)
    const { data: raceRecords } = await supabase.from('e_races').select('id, race_id').in('race_id', racesData.map((r)=>r.race_id));
    const raceIdMap = Object.fromEntries(raceRecords?.map((r)=>[
        r.race_id,
        r.id
      ]) || []);
    console.log('Race ID map size:', Object.keys(raceIdMap).length);
    // BATCH 7: Prepare race-candidates junction
    const raceCandidatesData = [];
    for (const race of apData.races || []){
      const reportingUnit = race.reportingUnits?.[0];
      if (!reportingUnit || raceType === 'presidential' && race.seatNum) continue;
      const stateCode = reportingUnit.statePostal;
      const raceExternalId = `ap_${officeID.toLowerCase()}_${electionYear}_${stateCode.toLowerCase()}_${race.raceID || '0'}`;
      const raceUUID = raceIdMap[raceExternalId];
      if (!raceUUID) continue;
      for (const candidate of reportingUnit.candidates || []){
        if (candidate.polID === '100013' || candidate.polID === '100008') continue;
        const candidateExternalId = `ap_candidate_${candidate.polID}`;
        const candidateUUID = candidateIdMap[candidateExternalId];
        if (candidateUUID) {
          raceCandidatesData.push({
            race_id: raceUUID,
            candidate_id: candidateUUID,
            ballot_order: candidate.ballotOrder,
            withdrew: false
          });
        }
      }
    }
    // Insert race-candidates junction
    if (raceCandidatesData.length > 0) {
      console.log('Inserting race-candidates:', raceCandidatesData.length);
      const { error: rcError } = await supabase.from('e_race_candidates').upsert(raceCandidatesData, {
        onConflict: 'race_id,candidate_id'
      });
      if (rcError) {
        console.error('Failed to upsert race_candidates:', rcError);
      }
    }
    // BATCH 8: Prepare race results with correct UUID references
    const raceResultsData = [];
    let candidateResultsData = [] // Declare here so it's in scope for stats
    ;
    for (const race of apData.races || []){
      const reportingUnit = race.reportingUnits?.[0];
      if (!reportingUnit || raceType === 'presidential' && race.seatNum) continue;
      const stateCode = reportingUnit.statePostal;
      const raceExternalId = `ap_${officeID.toLowerCase()}_${electionYear}_${stateCode.toLowerCase()}_${race.raceID || '0'}`;
      const raceUUID = raceIdMap[raceExternalId];
      if (!raceUUID) continue;
      const divisionExternalId = stateCode !== 'US' ? `ap_state_${stateCode.toLowerCase()}` : 'ap_national_us';
      const divisionUUID = divisionExternalId ? divisionIdMap[divisionExternalId] : null;
      const reportingLevel = stateCode === 'US' ? 'national' : 'state';
      // Calculate total votes (excluding aggregate candidates)
      let totalVotes = 0;
      for (const candidate of reportingUnit.candidates || []){
        if (candidate.polID !== '100013' && candidate.polID !== '100008') {
          totalVotes += candidate.voteCount || 0;
        }
      }
      // Find winner
      const winnerCandidate = reportingUnit.candidates?.find((c)=>c.winner === 'X');
      const winnerCandidateExternalId = winnerCandidate ? `ap_candidate_${winnerCandidate.polID}` : null;
      const winnerCandidateUUID = winnerCandidateExternalId ? candidateIdMap[winnerCandidateExternalId] : null;
      raceResultsData.push({
        race_id: raceUUID,
        division_id: divisionUUID,
        reporting_level: reportingLevel,
        precincts_reporting: reportingUnit.precinctsReporting || 0,
        precincts_total: reportingUnit.precinctsTotal,
        percent_reporting: reportingUnit.precinctsReportingPct,
        total_votes: totalVotes,
        called: race.raceCallStatus === 'Called',
        called_status: race.raceCallStatus === 'Called' ? 'CALLED' : 'NOT_CALLED',
        called_timestamp: winnerCandidate?.winnerDateTime || null,
        called_by_source: 'ap',
        winner_candidate_id: winnerCandidateUUID,
        last_updated: reportingUnit.lastUpdated || new Date().toISOString(),
        metadata: {
          eevp: reportingUnit.eevp,
          electoral_total: reportingUnit.electTotal
        }
      });
    }
    // Insert race results
    if (raceResultsData.length > 0) {
      console.log('Inserting race results:', raceResultsData.length);
      const { data: raceResultRecords, error: rrError } = await supabase.from('e_race_results').upsert(raceResultsData, {
        onConflict: 'race_id,division_id,reporting_level'
      }).select('id, race_id, division_id, reporting_level');
      if (rrError) {
        console.error('Failed to upsert race_results:', rrError);
        throw new Error(`Race results insert failed: ${rrError.message}`);
      }
      // Create mapping for race results (composite key -> UUID)
      const raceResultIdMap = new Map();
      for (const rr of raceResultRecords || []){
        const key = `${rr.race_id}_${rr.division_id}_${rr.reporting_level}`;
        raceResultIdMap.set(key, rr.id);
      }
      // BATCH 9: Prepare candidate results
      candidateResultsData = [] // Re-initialize, don't redeclare
      ;
      for (const race of apData.races || []){
        const reportingUnit = race.reportingUnits?.[0];
        if (!reportingUnit || raceType === 'presidential' && race.seatNum) continue;
        const stateCode = reportingUnit.statePostal;
        const raceExternalId = `ap_${officeID.toLowerCase()}_${electionYear}_${stateCode.toLowerCase()}_${race.raceID || '0'}`;
        const raceUUID = raceIdMap[raceExternalId];
        if (!raceUUID) continue;
        const divisionExternalId = stateCode !== 'US' ? `ap_state_${stateCode.toLowerCase()}` : 'ap_national_us';
        const divisionUUID = divisionExternalId ? divisionIdMap[divisionExternalId] : null;
        const reportingLevel = stateCode === 'US' ? 'national' : 'state';
        const rrKey = `${raceUUID}_${divisionUUID}_${reportingLevel}`;
        const raceResultUUID = raceResultIdMap.get(rrKey);
        if (!raceResultUUID) continue;
        // Calculate total votes for percentage
        let totalVotes = 0;
        for (const candidate of reportingUnit.candidates || []){
          if (candidate.polID !== '100013' && candidate.polID !== '100008') {
            totalVotes += candidate.voteCount || 0;
          }
        }
        for (const candidate of reportingUnit.candidates || []){
          if (candidate.polID === '100013' || candidate.polID === '100008') continue;
          const candidateExternalId = `ap_candidate_${candidate.polID}`;
          const candidateUUID = candidateIdMap[candidateExternalId];
          if (!candidateUUID) continue;
          candidateResultsData.push({
            race_result_id: raceResultUUID,
            candidate_id: candidateUUID,
            votes: candidate.voteCount || 0,
            vote_percentage: totalVotes > 0 ? Math.round(candidate.voteCount / totalVotes * 10000) / 100 : 0,
            electoral_votes: candidate.electWon || 0,
            winner: candidate.winner === 'X',
            metadata: {
              winner_datetime: candidate.winnerDateTime || null
            }
          });
        }
      }
      // Insert candidate results in batches
      if (candidateResultsData.length > 0) {
        console.log('Inserting candidate results:', candidateResultsData.length);
        const batchSize = 100;
        for(let i = 0; i < candidateResultsData.length; i += batchSize){
          const batch = candidateResultsData.slice(i, i + batchSize);
          const { error: crError } = await supabase.from('e_candidate_results').upsert(batch, {
            onConflict: 'race_result_id,candidate_id'
          });
          if (crError) {
            console.error(`Failed to upsert e_candidate_results batch ${i}:`, crError);
          }
        }
      }
    }
    // Get data_source_id for 'AP Election API'
    const { data: ds, error: dsError } = await supabase.from('data_sources').select('id').eq('name', 'AP Election API').limit(1);
    if (dsError || !ds || ds.length === 0) {
      return new Response(JSON.stringify({
        error: 'Failed to find data_source_id',
        details: dsError
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const record = {
      data_source_id: ds[0].id,
      election_id: election.id,
      provider: 'ap',
      feed_type: 'results',
      update_frequency_seconds: 30,
      priority: 1,
      active: true,
      config: {},
      field_mapping: {
        level: 'state',
        duration: `${duration}s`
      },
      last_fetch_at: new Date().toISOString(),
      last_success_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    // Only update these fields on conflict
    const { data: dsData, error } = await supabase.from('e_election_data_sources').upsert(record, {
      onConflict: 'data_source_id,election_id,provider,feed_type'
    }).select();
    if (error) {
      console.error('Upsert election data source error:', error);
      return new Response(JSON.stringify({
        error
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    /*const { data: logData, error: logError } = await supabase
    .from("e_election_data_ingestion_log")
    .insert({
      election_data_source_id: dsData[0].id,
      duration_ms: duration * 1000,
      completed_at: new Date().toISOString(),
      status: 'success'
    });

    if (logError) {
      console.error('Insert election data ingestion log error:', logError)
      return new Response(JSON.stringify({ error: logError }), {
        status: 500,
        headers: corsHeaders,
      })
    }*/ return new Response(JSON.stringify({
      success: true,
      message: `AP ${electionDate} ${raceType} election state data imported successfully`,
      duration: `${duration}s`,
      stats: {
        elections: 1,
        states: uniqueStates.length,
        races: racesData.length,
        candidates: candidatesArray.length,
        raceResults: raceResultsData.length,
        candidateResults: candidateResultsData.length || 0
      },
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
