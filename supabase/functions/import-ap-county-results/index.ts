import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from "../_shared/cors.ts";
import { isYearDivisibleBy } from "../election/functions.ts";
import { AP_CURRENT_ELECTION_DATE } from "../election/config.ts";
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  const startTime = Date.now();
  const logs = [];
  function log(message, data) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const logMsg = `[${elapsed}s] ${message}`;
    logs.push(logMsg);
    console.log(logMsg, data || '');
  }
  try {
    log('Starting county-only import');
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const body = await req.json();
    let { electionDate, officeID, resultsType, raceType, raceName } = body;
    if (!electionDate) {
      electionDate = AP_CURRENT_ELECTION_DATE;
    }
    if (!electionDate) {
      throw new Error('electionDate is required');
    }
    if (raceType === 'presidential' && !isYearDivisibleBy(electionDate, 4)) {
      throw new Error(`Invalid election year ${electionDate} for presidential county race`);
    } else if (raceType === 'senate' && !isYearDivisibleBy(electionDate, 2)) {
      throw new Error(`Invalid election year ${electionDate} for senate county race`);
    }
    log(`Processing ${raceType} counties for ${electionDate}`);
    // Fetch AP call history
    const { data: apHistory, error: apError } = await supabaseClient.from('e_ap_call_history').select('id, nextrequest').eq('officeid', officeID).eq('resultstype', resultsType).eq('level', 'county').eq('electiondate', electionDate).limit(1).maybeSingle();
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
      apUrl = `https://api.ap.org/v2/elections/${electionDate}?format=json&officeID=${officeID}&level=fipscode&resultstype=${resultsType}`;
    } else {
      apUrl = apHistory.nextrequest;
    }
    console.log('Fetching AP data from:', apUrl);
    // Fetch AP data
    const apApiKey = Deno.env.get('AP_API_KEY');
    log('Fetching AP data');
    const apResponse = await fetch(apUrl, {
      headers: {
        'x-api-key': apApiKey
      }
    });
    if (!apResponse.ok) {
      throw new Error(`AP API error: ${apResponse.status}`);
    }
    const apData = await apResponse.json();
    log(`Received ${apData.races?.length || 0} races`);
    if (!apData.races?.length) {
      throw new Error(`Invalid election date or no new data for ${electionDate} ${raceType} county race`);
    }
    if (apData.nextrequest) {
      // Build the row to upsert
      const aprow = {
        officeid: officeID,
        resultstype: resultsType,
        electiondate: electionDate,
        level: 'county',
        nextrequest: apData.nextrequest
      };
      // Only include id if it exists (updating existing row)
      if (apHistory?.id) {
        aprow.id = apHistory.id;
      }
      const { data: apInsertHistory, error: apError } = await supabaseClient.from('e_ap_call_history').upsert([
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
    // Get country and election (should already exist)
    const { data: country } = await supabaseClient.from('e_countries').select('id').eq('code_iso2', 'US').single();
    const electionYear = new Date(electionDate).getFullYear();
    const electionIdStr = `ap_${officeID.toLowerCase()}_${electionYear}`;
    const { data: election } = await supabaseClient.from('e_elections').select('id').eq('election_id', electionIdStr).single();
    if (!election) {
      throw new Error('Election not found - run state import first');
    }
    log(`Election: ${election.id}`);
    // Pre-fetch existing candidates
    log('Loading existing candidates');
    const { data: existingCandidates } = await supabaseClient.from('e_candidates').select('id, candidate_id');
    const candidateUuidMap = new Map();
    for (const c of existingCandidates || []){
      candidateUuidMap.set(c.candidate_id, c.id);
    }
    log(`Loaded ${candidateUuidMap.size} candidates`);
    // Initialize division map (empty on first run)
    const divisionUuidMap = new Map();
    // Arrays for batch processing
    const divisionsToUpsert = [];
    const racesToUpsert = [];
    const raceResultsToUpsert = [];
    const candidateResultsToUpsert = [];
    const raceCandidatesToUpsert = [];
    const raceSet = new Set();
    const raceResultKeys = new Set();
    const raceCandidateKeys = new Set();
    let countyCount = 0;
    // STEP 1: Build all data arrays (strings only, no UUIDs yet)
    log('Building data arrays');
    for (const race of apData.races || []){
      const countyUnits = (race.reportingUnits || []).filter((u)=>u.level === 'FIPSCode');
      for (const unit of countyUnits){
        if (!unit.candidates?.length) continue;
        countyCount++;
        const divisionIdStr = `us-county-${unit.fipsCode}`;
        const raceIdStr = `${electionYear}-${raceType}-county-${unit.fipsCode}`;
        // Add county if new (using string division_id)
        if (!divisionsToUpsert.find((d)=>d.division_id === divisionIdStr)) {
          divisionsToUpsert.push({
            division_id: divisionIdStr,
            country_id: country.id,
            name: unit.reportingunitName || `County ${unit.fipsCode}`,
            type: 'county',
            code: unit.statePostal,
            fips_code: unit.fipsCode
          });
        }
        // Add race (using string division_id for now)
        if (!raceSet.has(raceIdStr)) {
          racesToUpsert.push({
            race_id: raceIdStr,
            election_id: election.id,
            division_id: divisionIdStr,
            name: `${raceName} - ${unit.reportingunitName || unit.fipsCode}`,
            type: raceType,
            office: race.officeName
          });
          raceSet.add(raceIdStr);
        }
        // Add race result (using strings for now)
        const raceResultKey = `${raceIdStr}|${divisionIdStr}|county`;
        if (!raceResultKeys.has(raceResultKey)) {
          raceResultsToUpsert.push({
            race_id: raceIdStr,
            division_id: divisionIdStr,
            reporting_level: 'county',
            precincts_reporting: unit.precinctsReporting || 0,
            precincts_total: unit.precinctsTotal || null,
            percent_reporting: unit.precinctsReportingPct || null,
            total_votes: unit.candidates.reduce((sum, c)=>sum + (c.voteCount || 0), 0),
            called: race.raceCallStatus === 'Called',
            called_status: race.raceCallStatus === 'Called' ? 'CALLED' : 'NOT_CALLED',
            called_timestamp: race.raceCallStatus === 'Called' ? new Date().toISOString() : null,
            last_updated: unit.lastUpdated || new Date().toISOString()
          });
          raceResultKeys.add(raceResultKey);
        }
        // Calculate total votes for percentage
        let totalVotes = 0;
        for (const candidate of unit.candidates || []){
          if (candidate.polID !== '100013' && candidate.polID !== '100008') {
            totalVotes += candidate.voteCount || 0;
          }
        }
        // Add candidate results (using temp key)
        for (const candidate of unit.candidates){
          const candidateId = `ap_candidate_${candidate.polID}`;
          // Race candidate junction (deduplicated)
          const raceCandidateKey = `${raceIdStr}|${candidateId}`;
          if (!raceCandidateKeys.has(raceCandidateKey)) {
            raceCandidatesToUpsert.push({
              race_id: raceIdStr,
              candidate_id: candidateId,
              ballot_order: candidate.ballotOrder || null
            });
            raceCandidateKeys.add(raceCandidateKey);
          }
          candidateResultsToUpsert.push({
            race_result_temp_key: `${raceIdStr}|${divisionIdStr}`,
            candidate_id: candidateId,
            votes: candidate.voteCount || 0,
            vote_percentage: totalVotes > 0 ? Math.round(candidate.voteCount / totalVotes * 10000) / 100 : 0,
            electoral_votes: candidate.electWon || 0,
            winner: candidate.winner === 'X'
          });
        }
      }
    }
    log('Data prepared', {
      counties: countyCount,
      newCounties: divisionsToUpsert.length,
      races: racesToUpsert.length,
      raceResults: raceResultsToUpsert.length,
      raceCandidates: raceCandidatesToUpsert.length,
      candidateResults: candidateResultsToUpsert.length
    });
    // Batch upsert helper
    const BATCH_SIZE = 5000;
    const BATCH_SIZE_SELECT = 300;
    async function batchUpsert(table, data, conflictKey) {
      if (!data.length) return;
      const batches = Math.ceil(data.length / BATCH_SIZE);
      log(`Upserting ${data.length} to ${table} (${batches} batches)`);
      for(let i = 0; i < batches; i++){
        const batch = data.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        const { error } = await supabaseClient.from(table).upsert(batch, {
          onConflict: conflictKey
        });
        if (error) throw new Error(`${table} batch ${i + 1}: ${error.message}`);
      }
      log(`✓ ${table}`);
    }
    // STEP 2: Upsert divisions
    await batchUpsert('e_geographic_divisions', divisionsToUpsert, 'division_id');
    // STEP 3: Fetch division UUIDs and populate map
    if (divisionsToUpsert.length > 0) {
      log('Fetching division UUIDs');
      const divisionIds = divisionsToUpsert.map((d)=>d.division_id);
      for(let i = 0; i < divisionIds.length; i += BATCH_SIZE_SELECT){
        const batch = divisionIds.slice(i, i + BATCH_SIZE_SELECT);
        const { data: newDivs, error: newDivsError } = await supabaseClient.from('e_geographic_divisions').select('id, division_id').in('division_id', batch);
        if (newDivsError) {
          log(`Error fetching division batch: ${newDivsError.message}`);
        } else {
          for (const d of newDivs || []){
            divisionUuidMap.set(d.division_id, d.id);
          }
        }
      }
      log(`divisionUuidMap populated with ${divisionUuidMap.size} entries`);
    }
    // STEP 4: Convert races to use UUIDs
    const racesWithUuids = racesToUpsert.map((r)=>({
        ...r,
        division_id: divisionUuidMap.get(r.division_id)
      })).filter((r)=>r.division_id);
    log(`Converted ${racesWithUuids.length} races to use UUIDs`);
    await batchUpsert('e_races', racesWithUuids, 'race_id');
    // STEP 5: Fetch race UUIDs
    log('Fetching race UUIDs');
    const raceIds = racesToUpsert.map((r)=>r.race_id);
    const raceUuidMap = new Map();
    for(let i = 0; i < raceIds.length; i += BATCH_SIZE_SELECT){
      const batch = raceIds.slice(i, i + BATCH_SIZE_SELECT);
      const { data: raceData, error: raceError } = await supabaseClient.from('e_races').select('id, race_id').in('race_id', batch);
      if (raceError) {
        log(`Error fetching race batch: ${raceError.message}`);
      } else {
        for (const r of raceData || []){
          raceUuidMap.set(r.race_id, r.id);
        }
      }
    }
    log(`Mapped ${raceUuidMap.size} race UUIDs`);
    // STEP 5.1: Upsert race_candidates junction table
    const raceCandidatesWithUuids = raceCandidatesToUpsert.map((rc)=>({
        race_id: raceUuidMap.get(rc.race_id),
        candidate_id: candidateUuidMap.get(rc.candidate_id),
        ballot_order: rc.ballot_order
      })).filter((rc)=>rc.race_id && rc.candidate_id);
    log(`Converted ${raceCandidatesWithUuids.length} race_candidates to use UUIDs`);
    await batchUpsert('e_race_candidates', raceCandidatesWithUuids, 'race_id,candidate_id');
    // STEP 6: Convert race results to use UUIDs
    const raceResultsWithUuids = raceResultsToUpsert.map((rr)=>({
        ...rr,
        race_id: raceUuidMap.get(rr.race_id),
        division_id: divisionUuidMap.get(rr.division_id)
      })).filter((rr)=>rr.race_id && rr.division_id);
    log(`Converted ${raceResultsWithUuids.length} race results to use UUIDs`);
    const rrBatches = Math.ceil(raceResultsWithUuids.length / BATCH_SIZE);
    log(`Upserting ${raceResultsWithUuids.length} race results (${rrBatches} batches)`);
    for(let i = 0; i < rrBatches; i++){
      const batch = raceResultsWithUuids.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const { error } = await supabaseClient.from('e_race_results').upsert(batch, {
        onConflict: 'race_id,division_id,reporting_level',
        ignoreDuplicates: false
      });
      if (error) throw new Error(`race_results batch ${i + 1}: ${error.message}`);
    }
    const raceUuidList = [
      ...raceUuidMap.values()
    ];
    log('✓ race_results');
    // Verify race_results were inserted
    const { data: verifyRR, error: verifyError } = await supabaseClient.from('e_race_results').select('id, race_id').limit(3);
    log(`Verification: ${verifyRR?.length || 0} race_results exist in DB`);
    if (verifyRR?.length) {
      log(`Sample race_result race_id: ${verifyRR[0].race_id}`);
      log(`Is this UUID in raceUuidList? ${raceUuidList.includes(verifyRR[0].race_id)}`);
    }
    // STEP 7: Fetch race_result UUIDs with optimized reverse lookup
    log('Fetching race_result UUIDs');
    // Create reverse maps for efficient lookup (O(n) instead of O(n²))
    const uuidToRaceId = new Map();
    for (const [raceId, uuid] of raceUuidMap.entries()){
      uuidToRaceId.set(uuid, raceId);
    }
    const uuidToDivisionId = new Map();
    for (const [divId, uuid] of divisionUuidMap.entries()){
      uuidToDivisionId.set(uuid, divId);
    }
    const rrUuidMap = new Map();
    for(let i = 0; i < raceUuidList.length; i += BATCH_SIZE_SELECT){
      const batch = raceUuidList.slice(i, i + BATCH_SIZE_SELECT);
      const { data: rrData, error: rrError } = await supabaseClient.from('e_race_results').select('id, race_id, division_id').in('race_id', batch).eq('reporting_level', 'county');
      if (rrError) {
        log(`Error fetching race_result batch: ${rrError.message}`);
      } else {
        for (const rr of rrData || []){
          // Use reverse maps for fast O(1) lookup
          const raceIdStr = uuidToRaceId.get(rr.race_id);
          const divIdStr = uuidToDivisionId.get(rr.division_id);
          if (raceIdStr && divIdStr) {
            rrUuidMap.set(`${raceIdStr}|${divIdStr}`, rr.id);
          }
        }
      }
    }
    log(`Mapped ${rrUuidMap.size} race_result UUIDs`);
    // STEP 8: Convert candidate results to use UUIDs and deduplicate
    const candidateResultsMap = new Map();
    for (const cr of candidateResultsToUpsert){
      const rrId = rrUuidMap.get(cr.race_result_temp_key);
      const candId = candidateUuidMap.get(cr.candidate_id);
      if (rrId && candId) {
        // Create unique key for this combination
        const uniqueKey = `${rrId}|${candId}`;
        // Only keep the latest/highest vote count if duplicate
        const existing = candidateResultsMap.get(uniqueKey);
        if (!existing || cr.votes >= existing.votes) {
          candidateResultsMap.set(uniqueKey, {
            race_result_id: rrId,
            candidate_id: candId,
            votes: cr.votes,
            vote_percentage: cr.vote_percentage,
            electoral_votes: cr.electoral_votes,
            winner: cr.winner
          });
        }
      }
    }
    const candidateResultsWithIds = Array.from(candidateResultsMap.values());
    log(`Converted ${candidateResultsWithIds.length} candidate results to use UUIDs (deduplicated from ${candidateResultsToUpsert.length})`);
    await batchUpsert('e_candidate_results', candidateResultsWithIds, 'race_result_id,candidate_id');
    // Get data_source_id for 'AP Election API'
    const { data: ds, error: dsError } = await supabaseClient.from('data_sources').select('id').eq('name', 'AP Election API').limit(1);
    if (dsError || !ds || ds.length === 0) {
      return new Response(JSON.stringify({
        error: 'Failed to find data_source_id',
        details: dsError
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
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
        level: 'county',
        duration: `${duration}s`
      },
      last_fetch_at: new Date().toISOString(),
      last_success_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    // Only update these fields on conflict
    const { data: dsData, error } = await supabaseClient.from('e_election_data_sources').upsert(record, {
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
    log(`✓ Complete in ${duration}s`);
    /*const { data: logData, error: logError } = await supabaseClient
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
      message: `AP ${electionDate} ${raceType} election county data imported successfully`,
      duration: `${duration}s`,
      stats: {
        countiesProcessed: countyCount,
        newCounties: divisionsToUpsert.length,
        racesCreated: racesWithUuids.length,
        raceResultsCreated: raceResultsWithUuids.length,
        candidateResultsCreated: candidateResultsWithIds.length
      },
      logs
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`ERROR: ${error.message}`);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      duration: `${duration}s`,
      logs
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
