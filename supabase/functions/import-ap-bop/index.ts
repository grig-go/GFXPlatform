// Optimized Supabase Edge Function - Batch processing for speed
// Deploy as: import-ap-state-results-fast
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from "../_shared/cors.ts";
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
    // Parse request
    let { electionDate, subType = 'S', resultsType = 'l', raceName = 'Senate Election', raceType = 'senate' } = await req.json();
    if (!electionDate) {
      electionDate = AP_CURRENT_ELECTION_DATE;
    }
    if (!electionDate) {
      throw new Error('electionDate is required');
    }
    if (!isYearDivisibleBy(electionDate, 2)) {
      throw new Error(`Invalid election year ${electionDate} for ${raceType} race`);
    }
    // Fetch AP data
    let apUrl = '';
    if (electionDate >= '2024-11-05') {
      apUrl = `https://api.ap.org/v3/reports?format=json&resultstype=${resultsType}&subtype=${subType}&electionDate=${electionDate}`;
    } else {
      let test = 0;
      if (resultsType === 't') test = 1; // AP API uses 'test=1' for all non-live results
      apUrl = `https://api.ap.org/v2/reports?format=json&test=${test}&type=trend&subtype=${subType}&electionDate=${electionDate}`;
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
    console.log(apData);
    if (!apData.reports?.length) {
      throw new Error(`Invalid election date ${electionDate} for ${raceType} race`);
    }
    const bopUrl = apData.reports[0].contentLink;
    console.log('Fetching BOP data from:', bopUrl);
    const bopResponse = await fetch(bopUrl, {
      headers: {
        'x-api-key': apApiKey
      }
    });
    if (!bopResponse.ok) {
      throw new Error(`BOP API error: ${bopResponse.status}`);
    }
    const bopData = await bopResponse.text();
    console.log(bopData);
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Process and store the fetched data into Supabase as needed
    // Parse XML using regex (simple approach for this structured XML)
    // Extract main attributes from trendtable
    const officeMatch = bopData.match(/office="([^"]+)"/);
    const officeTypeCodeMatch = bopData.match(/OfficeTypeCode="([^"]+)"/);
    const testMatch = bopData.match(/Test="([^"]+)"/);
    const timestampMatch = bopData.match(/timestamp="([^"]+)"/);
    const office = officeMatch ? officeMatch[1] : '';
    const officeTypeCode = officeTypeCodeMatch ? officeTypeCodeMatch[1] : '';
    const isTest = testMatch ? testMatch[1] === '1' : false;
    const timestamp = timestampMatch ? timestampMatch[1] : '';
    // Extract year from electionDate (format: YYYY-MM-DD)
    const electionYear = parseInt(electionDate.substring(0, 4));
    // Use race_type and election_year as the unique key (not timestamp)
    // This way we update the same record with new timestamps
    let { data: existingElection } = await supabase.from('bop_election_results').select('id').eq('race_type', raceType).eq('election_year', electionYear).maybeSingle(); // Use maybeSingle to avoid error if no row found
    let electionResultId;
    if (existingElection) {
      // Update existing record with new timestamp and data
      const { data: updatedElection, error: updateError } = await supabase.from('bop_election_results').update({
        office,
        office_type_code: officeTypeCode,
        is_test: isTest,
        timestamp
      }).eq('id', existingElection.id).select().single();
      if (updateError) throw new Error(`Failed to update election result: ${updateError.message}`);
      electionResultId = updatedElection.id;
      console.log(`Updated existing election result ID: ${electionResultId}`);
    } else {
      // Insert new record
      const { data: newElection, error: insertError } = await supabase.from('bop_election_results').insert({
        office,
        office_type_code: officeTypeCode,
        race_type: raceType,
        election_year: electionYear,
        is_test: isTest,
        timestamp
      }).select().single();
      if (insertError) throw new Error(`Failed to insert election result: ${insertError.message}`);
      electionResultId = newElection.id;
      console.log(`Created new election result ID: ${electionResultId}`);
    }
    // Helper function to extract trend value
    const extractTrendValue = (section, name)=>{
      const regex = new RegExp(`<trend\\s+name="${name}"\\s+value="([^"]+)"`, 'i');
      const match = section.match(regex);
      return parseInt(match ? match[1].replace(/[+\-]/g, '') : '0');
    };
    // Helper to extract signed number (keeps the sign)
    const extractSignedValue = (section, name)=>{
      const regex = new RegExp(`<trend\\s+name="${name}"\\s+value="([^"]+)"`, 'i');
      const match = section.match(regex);
      return match ? parseInt(match[1].replace('+', '')) : 0;
    };
    // Process party data
    const partyRegex = /<party\s+title="([^"]+)">([\s\S]*?)<\/party>/g;
    let partyMatch;
    const partyStats = {
      total_won: 0,
      total_leading: 0,
      parties_processed: 0
    };
    while((partyMatch = partyRegex.exec(bopData)) !== null){
      const partyName = partyMatch[1];
      const partyContent = partyMatch[2];
      // Extract main trends (not in NetChange)
      const mainTrendsSection = partyContent.split('<NetChange>')[0];
      const wonValue = extractTrendValue(mainTrendsSection, 'Won');
      const leadingValue = extractTrendValue(mainTrendsSection, 'Leading');
      const holdoversValue = extractTrendValue(mainTrendsSection, 'Holdovers');
      const winningTrendValue = extractTrendValue(mainTrendsSection, 'Winning Trend');
      const currentValue = extractTrendValue(mainTrendsSection, 'Current');
      const insufficientVoteValue = extractTrendValue(mainTrendsSection, 'InsufficientVote');
      // Upsert party result
      let { data: existingParty } = await supabase.from('bop_party_results').select('id').eq('election_result_id', electionResultId).eq('party_name', partyName).maybeSingle();
      let partyResultId;
      if (existingParty) {
        // Update existing party result
        const { data: updatedParty, error: updateError } = await supabase.from('bop_party_results').update({
          won: wonValue,
          leading: leadingValue,
          holdovers: holdoversValue,
          winning_trend: winningTrendValue,
          current_seats: currentValue,
          insufficient_vote: insufficientVoteValue
        }).eq('id', existingParty.id).select().single();
        if (updateError) throw new Error(`Failed to update party result for ${partyName}: ${updateError.message}`);
        partyResultId = updatedParty.id;
      } else {
        // Insert new party result
        const { data: newParty, error: insertError } = await supabase.from('bop_party_results').insert({
          election_result_id: electionResultId,
          party_name: partyName,
          won: wonValue,
          leading: leadingValue,
          holdovers: holdoversValue,
          winning_trend: winningTrendValue,
          current_seats: currentValue,
          insufficient_vote: insufficientVoteValue
        }).select().single();
        if (insertError) throw new Error(`Failed to insert party result for ${partyName}: ${insertError.message}`);
        partyResultId = newParty.id;
      }
      // Update statistics
      partyStats.total_won += wonValue;
      partyStats.total_leading += leadingValue;
      partyStats.parties_processed++;
      // Process NetChange if exists
      const netChangeMatch = partyContent.match(/<NetChange>([\s\S]*?)<\/NetChange>/);
      if (netChangeMatch) {
        const netChangeContent = netChangeMatch[1];
        const winnersChange = extractSignedValue(netChangeContent, 'Winners');
        const leadersChange = extractSignedValue(netChangeContent, 'Leaders');
        // Upsert net change
        let { data: existingNetChange } = await supabase.from('bop_net_changes').select('id').eq('party_result_id', partyResultId).maybeSingle();
        if (existingNetChange) {
          // Update existing net change
          const { error: updateError } = await supabase.from('bop_net_changes').update({
            winners_change: winnersChange,
            leaders_change: leadersChange
          }).eq('id', existingNetChange.id);
          if (updateError) throw new Error(`Failed to update net change for ${partyName}: ${updateError.message}`);
        } else {
          // Insert new net change
          const { error: insertError } = await supabase.from('bop_net_changes').insert({
            party_result_id: partyResultId,
            winners_change: winnersChange,
            leaders_change: leadersChange
          });
          if (insertError) throw new Error(`Failed to insert net change for ${partyName}: ${insertError.message}`);
        }
      }
    }
    // Process InsufficientVote details
    const insufficientVoteMatch = bopData.match(/<InsufficientVote>([\s\S]*?)<\/InsufficientVote>/);
    if (insufficientVoteMatch) {
      const ivContent = insufficientVoteMatch[1];
      const ivData = {
        dem_open: extractTrendValue(ivContent, 'Dem Open'),
        gop_open: extractTrendValue(ivContent, 'GOP Open'),
        oth_open: extractTrendValue(ivContent, 'Oth Open'),
        dem_incumbent: extractTrendValue(ivContent, 'Dem Incumbent'),
        gop_incumbent: extractTrendValue(ivContent, 'GOP Incumbent'),
        oth_incumbent: extractTrendValue(ivContent, 'Oth Incumbent'),
        total: extractTrendValue(ivContent, 'Total')
      };
      // Upsert insufficient vote details
      let { data: existingIV } = await supabase.from('bop_insufficient_vote_details').select('id').eq('election_result_id', electionResultId).maybeSingle();
      if (existingIV) {
        // Update existing record
        const { error: updateError } = await supabase.from('bop_insufficient_vote_details').update(ivData).eq('id', existingIV.id);
        if (updateError) throw new Error(`Failed to update insufficient vote details: ${updateError.message}`);
      } else {
        // Insert new record
        const { error: insertError } = await supabase.from('bop_insufficient_vote_details').insert({
          election_result_id: electionResultId,
          ...ivData
        });
        if (insertError) throw new Error(`Failed to insert insufficient vote details: ${insertError.message}`);
      }
    }
    // Update stats for logging
    const stats = {
      election_result_id: electionResultId,
      office,
      race_type: raceType,
      election_year: electionYear,
      timestamp,
      parties_processed: partyStats.parties_processed,
      total_seats_won: partyStats.total_won,
      total_seats_leading: partyStats.total_leading
    };
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    return new Response(JSON.stringify({
      success: true,
      message: `AP ${electionDate} ${raceType} bop data imported successfully`,
      duration: `${duration}s`,
      stats: stats,
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
