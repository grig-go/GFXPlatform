#!/usr/bin/env node

/**
 * Sportsradar Seasons API Test Script
 * 
 * Quick test to find available seasons for a competition.
 * Use this to discover valid season_ids for testing.
 * 
 * Usage:
 *   SR_KEY=your_key node scripts/test-sportsradar-seasons.js
 *   SR_KEY=your_key COMPETITION_ID=sr:competition:8 node scripts/test-sportsradar-seasons.js
 */

const KEY = process.env.SR_KEY;
const base = "https://api.sportradar.com/soccer/trial/v4/en";
const COMPETITION_ID = process.env.COMPETITION_ID || "sr:competition:8"; // LaLiga by default

if (!KEY) {
  console.error('❌ Error: SR_KEY environment variable not set');
  console.error('Usage: SR_KEY=your_key node scripts/test-sportsradar-seasons.js');
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
  console.log('🏃 Testing Sportsradar Seasons API...\n');
  console.log(`Competition ID: ${COMPETITION_ID}`);
  console.log(`Endpoint: ${base}/competitions/${COMPETITION_ID}/seasons.json\n`);

  try {
    const data = await j(`${base}/competitions/${COMPETITION_ID}/seasons.json`);
    const seasons = data.seasons ?? [];
    
    console.log('✅ Success!\n');
    console.log(`Competition: ${data.competition?.name ?? 'Unknown'}`);
    console.log(`Total Seasons: ${seasons.length}\n`);
    
    if (seasons.length > 0) {
      console.log('📅 Available Seasons:\n');
      
      // Find current season
      const currentSeason = seasons.find(s => s.current === true);
      
      seasons.forEach((season, i) => {
        const isCurrent = season.id === currentSeason?.id ? '⭐ CURRENT' : '';
        const status = season.disabled ? '❌ DISABLED' : '✅ ACTIVE';
        
        console.log(`${i + 1}. ${season.name}`);
        console.log(`   ID: ${season.id}`);
        console.log(`   Year: ${season.year}`);
        console.log(`   Status: ${status} ${isCurrent}`);
        console.log(`   Start: ${season.start_date ?? 'N/A'}`);
        console.log(`   End: ${season.end_date ?? 'N/A'}`);
        console.log('');
      });

      if (currentSeason) {
        console.log('\n🎯 Test the current season with:');
        console.log(`SR_KEY=$SR_KEY SEASON_ID=${currentSeason.id} node scripts/test-sportsradar-competitors.js\n`);
      }
    }

    console.log('✅ Test completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('401')) {
      console.error('\n💡 Tip: Check your SR_KEY environment variable');
    } else if (error.message.includes('404')) {
      console.error('\n💡 Tip: Competition ID may not exist');
      console.error('   Common IDs:');
      console.error('   - sr:competition:8 (LaLiga)');
      console.error('   - sr:competition:17 (Premier League)');
      console.error('   - sr:competition:23 (Serie A)');
      console.error('   - sr:competition:34 (Bundesliga)');
    } else if (error.message.includes('429')) {
      console.error('\n💡 Tip: Rate limit exceeded. Wait 60 seconds and try again.');
    }
    
    process.exit(1);
  }
})();
