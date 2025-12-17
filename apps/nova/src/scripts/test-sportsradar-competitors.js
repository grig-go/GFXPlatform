#!/usr/bin/env node

/**
 * Sportsradar Competitors API Test Script
 * 
 * Quick standalone test for verifying Sportsradar API access
 * and competitor data structure.
 * 
 * Usage:
 *   SR_KEY=your_key node scripts/test-sportsradar-competitors.js
 *   SR_KEY=your_key SEASON_ID=sr:season:130805 node scripts/test-sportsradar-competitors.js
 */

const KEY = process.env.SR_KEY;
const base = "https://api.sportradar.com/soccer/trial/v4/en";
const SEASON_ID = process.env.SEASON_ID || "sr:season:130805";

if (!KEY) {
  console.error('❌ Error: SR_KEY environment variable not set');
  console.error('Usage: SR_KEY=your_key node scripts/test-sportsradar-competitors.js');
  process.exit(1);
}

async function j(u) {
  const r = await fetch(u, {
    headers: {
      accept: "application/json",
      "x-api-key": KEY
    }
  });
  
  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(`${r.status} ${errorText}`);
  }
  
  return r.json();
}

(async () => {
  console.log('🏃 Testing Sportsradar Competitors API...\n');
  console.log(`Season ID: ${SEASON_ID}`);
  console.log(`Endpoint: ${base}/seasons/${SEASON_ID}/competitors.json\n`);

  try {
    const data = await j(`${base}/seasons/${SEASON_ID}/competitors.json`);
    
    // Debug: Show actual response structure
    console.log('📦 Response keys:', Object.keys(data));
    
    // Handle different response structures
    let teams = [];
    if (data.season_competitors && Array.isArray(data.season_competitors)) {
      teams = data.season_competitors;
      console.log('✓ Using season_competitors array\n');
    } else if (data.competitors && Array.isArray(data.competitors)) {
      teams = data.competitors;
      console.log('✓ Using direct competitors array\n');
    } else if (data.season?.competitors && Array.isArray(data.season.competitors)) {
      teams = data.season.competitors;
      console.log('✓ Using season.competitors array\n');
    } else if (Array.isArray(data)) {
      teams = data;
      console.log('✓ Using root array\n');
    } else {
      console.error('❌ Could not find competitors in response');
      console.error('Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
      teams = [];
    }
    
    const result = {
      success: true,
      teamsAdded: teams.length,
      seasonId: SEASON_ID,
      seasonName: data.season?.name,
      seasonYear: data.season?.year,
      competitionId: data.season?.competition_id,
      competitionName: data.season?.competition?.name
    };

    console.log('✅ Success!\n');
    console.log(JSON.stringify(result, null, 2));
    
    if (teams.length > 0) {
      console.log('\n📊 Sample Team Data:\n');
      const sampleTeam = teams[0];
      console.log(JSON.stringify({
        id: sampleTeam.id,
        name: sampleTeam.name,
        abbreviation: sampleTeam.abbreviation,
        country: sampleTeam.country,
        country_code: sampleTeam.country_code
      }, null, 2));
      
      console.log(`\n📋 All ${teams.length} Teams:`);
      teams.forEach((team, i) => {
        console.log(`  ${i + 1}. ${team.name} (${team.abbreviation}) - ${team.id}`);
      });
      
      console.log('\n✅ Test completed successfully!');
    } else {
      console.log('\n⚠️  WARNING: Zero teams found!');
      console.log('\nThis could mean:');
      console.log('  1. Wrong endpoint or parsing (check response structure above)');
      console.log('  2. Trial plan limitation - season not available on trial');
      console.log('  3. Season coverage issue - try a different/previous season');
      console.log('  4. Competition/season mismatch');
      console.log('\n💡 Next steps:');
      console.log('  - Run: SR_KEY=$SR_KEY node scripts/test-sportsradar-seasons.js');
      console.log('  - Pick a different season_id and try again');
      console.log('  - Check Sportsradar trial plan coverage docs');
    }
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('401')) {
      console.error('\n💡 Tip: Check your SR_KEY environment variable');
    } else if (error.message.includes('404')) {
      console.error('\n💡 Tip: Season ID may not exist or may be for a different sport');
      console.error('   Try finding a valid season_id first with the seasons API');
    } else if (error.message.includes('429')) {
      console.error('\n💡 Tip: Rate limit exceeded. Wait 60 seconds and try again.');
    }
    
    process.exit(1);
  }
})();
