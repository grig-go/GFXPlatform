#!/usr/bin/env node

/**
 * Minimal Sportsradar Test (User's Original Script)
 * 
 * Simplest possible test - exactly as provided by user.
 * Great for quick verification without any extras.
 * 
 * Usage:
 *   SR_KEY=your_key node scripts/minimal-test.js
 *   SR_KEY=your_key SEASON_ID=sr:season:130805 node scripts/minimal-test.js
 */

const KEY = process.env.SR_KEY;
const base = "https://api.sportradar.com/soccer/trial/v4/en";
const SEASON_ID = process.env.SEASON_ID || "sr:season:130805";

if (!KEY) {
  console.error('Error: SR_KEY environment variable required');
  process.exit(1);
}

async function j(u) {
  const r = await fetch(u, { headers: { accept: "application/json", "x-api-key": KEY } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

(async () => {
  const data = await j(`${base}/seasons/${SEASON_ID}/competitors.json`);
  const teams = data.competitors ?? [];
  console.log(JSON.stringify({
    success: true,
    teamsAdded: teams.length,
    seasonId: SEASON_ID,
    seasonName: data.season?.name
  }, null, 2));
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
