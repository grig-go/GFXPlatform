# Election Data API

## Overview

The Election Data API provides access to election results with all overrides pre-applied. This API is built using Supabase Edge Functions and is accessible through a Vite proxy.

## Endpoint

```
GET /nova/election
```

## Query Parameters

All parameters are optional. If no parameters are provided, all election data will be returned.

| Parameter | Type | Description | Example Values |
|-----------|------|-------------|----------------|
| `year` | integer | Filter by election year | `2024`, `2020`, `2016` |
| `raceType` | string | Filter by race type | `presidential`, `senate`, `house` |
| `level` | string | Filter by geographic level | `national`, `state`, `district`, `county` |

## Examples

### Get all 2024 presidential results at state level
```
http://localhost:5177/nova/election?year=2024&raceType=presidential&level=state
```

### Get all senate races (all years)
```
http://localhost:5177/nova/election?raceType=senate
```

### Get all county-level data for 2020
```
http://localhost:5177/nova/election?year=2020&level=county
```

### Get all data (no filters)
```
http://localhost:5177/nova/election
```

## Response Format

```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "last_fetch_at": "2024-11-14T10:30:00Z",
      "election_id": "2024-general",
      "election_name": "2024 United States General Election",
      "year": 2024,
      "race_id": "...",
      "race_race_id": "...",
      "race_name": "...",
      "race_display_name": "...",
      "office": "President",
      "race_type": "presidential",
      "num_elect": 1,
      "uncontested": false,
      "division_type": "state",
      "state_code": "CA",
      "fips_code": "06",
      "race_results_id": "...",
      "called": true,
      "called_status": "CALLED",
      "percent_reporting": 98.5,
      "last_updated": "2024-11-14T10:30:00Z",
      "precincts_reporting": 23500,
      "precincts_total": 24000,
      "called_timestamp": "2024-11-14T09:00:00Z",
      "total_votes": 15000000,
      "candidate_id": "...",
      "full_name": "John Doe",
      "first_name": "John",
      "last_name": "Doe",
      "candidate_display_name": "John Doe",
      "party_code": "DEM",
      "party_name": "Democratic Party",
      "party_color_primary": "#0015BC",
      "votes": 8500000,
      "vote_percentage": 56.67,
      "incumbent": false,
      "winner": true,
      "photo_url": "https://...",
      "electoral_votes": 54,
      "state_electoral_votes": 54
    }
  ],
  "params": {
    "year": 2024,
    "raceType": "presidential",
    "level": "state"
  }
}
```

## Key Features

### Override Values Pre-Applied
Unlike the UI endpoint (`fetch_election_data_for_ui`), this API returns data with all override values already merged:
- Race results (called status, reporting percentages, etc.) use override values if they exist
- Candidate results (votes, percentages, winner status) use override values if they exist
- Candidate metadata (incumbent status, withdrawn status) uses override values if they exist

### Ordering
Data is ordered by:
1. Election year (descending - most recent first)
2. Race type (presidential, senate, house)
3. Geographic level:
   - National level first (for presidential)
   - Then by state code (alphabetically)
   - For counties: ordered by FIPS code
   - For districts: ordered by district number
4. Within each race: candidates ordered by votes (descending)

## Usage in Code

### Using the TypeScript Helper Function

```typescript
import { fetchElectionDataFromAPI } from '@/data/electionData';

// Get 2024 presidential state-level results
const data = await fetchElectionDataFromAPI(2024, 'presidential', 'state');

// Get all senate races
const senateData = await fetchElectionDataFromAPI(undefined, 'senate');

// Get all 2020 data
const allData = await fetchElectionDataFromAPI(2020);
```

### Using Fetch Directly

```typescript
const response = await fetch('/nova/election?year=2024&raceType=presidential&level=state');
const result = await response.json();

if (result.success) {
  console.log(`Received ${result.count} records`);
  console.log(result.data);
}
```

## Database Function

The API calls the PostgreSQL RPC function `fetch_election_data_for_api` which is defined in the migration file:
- Location: `src/supabase/migrations/20251004180318_add_election_schema.sql`
- Function: `public.fetch_election_data_for_api(p_year, p_race_type, p_level)`

## Edge Function

The Supabase Edge Function that powers this API is located at:
- Path: `supabase/functions/nova-election/index.ts`
- Deployment: Must be deployed to Supabase using `supabase functions deploy nova-election`

## Vite Proxy Configuration

The Vite development server proxies `/nova/election` requests to the Supabase Edge Function:
- Configuration: `vite.config.ts`
- Proxy path: `/nova/election` → `https://{projectId}.supabase.co/functions/v1/nova-election`

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad request (invalid parameters)
- `500`: Server error (database or edge function error)

Error response format:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Deployment

To deploy the edge function to Supabase:

```bash
supabase functions deploy nova-election
```

To test the edge function locally:

```bash
supabase functions serve nova-election
```
