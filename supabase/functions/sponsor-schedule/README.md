# Sponsor Schedule Edge Function

Returns the currently active sponsor for a given channel by querying the `sponsor_schedules` table and joining with `media_assets`.

## Endpoints

### GET /sponsor-schedule/:channelName
Returns the currently active sponsor for the given channel.

**Accepts either channel name or UUID:**
- By name: `/sponsor-schedule/WBRE`
- By UUID: `/sponsor-schedule/550e8400-e29b-41d4-a716-446655440000`

Channel name lookup is case-insensitive.

**Priority Logic:**
1. First checks for scheduled sponsors (non-default) that are currently active based on:
   - Date range (start_date/end_date)
   - Day of week
   - Time ranges
2. If no scheduled sponsor is active, falls back to the default sponsor
3. Returns the highest priority sponsor if multiple are active

**Response:**
```json
{
  "ok": true,
  "sponsor": {
    "id": "uuid",
    "name": "Morning Sponsor",
    "is_default": false,
    "priority": 10,
    "media": {
      "id": "uuid",
      "name": "sponsor-logo.png",
      "file_url": "https://...",
      "thumbnail_url": "https://...",
      "media_type": "image"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /sponsor-schedule/:channelName/all
Returns all schedules for a channel (for debugging/admin purposes).

### GET /sponsor-schedule/health
Health check endpoint.

## Deploy

```bash
cd src/supabase
supabase functions deploy sponsor-schedule
```

## Test

```bash
# Health check
curl https://bgkjcngrslxyqjitksim.supabase.co/functions/v1/sponsor-schedule/health

# Get active sponsor by channel name (no auth required)
curl https://bgkjcngrslxyqjitksim.supabase.co/functions/v1/sponsor-schedule/WBRE

# Get active sponsor by UUID
curl https://bgkjcngrslxyqjitksim.supabase.co/functions/v1/sponsor-schedule/550e8400-e29b-41d4-a716-446655440000
```

## Usage in Applications

```typescript
const NOVADEVGRIG_URL = 'https://bgkjcngrslxyqjitksim.supabase.co';

// Fetch current sponsor by channel name (no auth required)
const response = await fetch(
  `${NOVADEVGRIG_URL}/functions/v1/sponsor-schedule/WBRE`
);

const data = await response.json();

if (data.ok && data.sponsor) {
  // Display sponsor media
  const sponsorUrl = data.sponsor.media?.file_url;
  // ...
}
```

## Schedule Logic

The function determines if a schedule is active based on:

1. **Date Range**: Schedule must be within `start_date` and `end_date` (if specified)
2. **Day of Week**: If any days are selected, current day must be checked
3. **Time Ranges**: Current time must fall within at least one time range
   - Supports overnight ranges (e.g., 22:00-06:00)
   - Empty time ranges = all day

## Database Requirements

The function expects the following tables:

### sponsor_schedules
```sql
- id UUID
- channel_ids JSONB (array of channel UUIDs)
- media_id UUID (references media_assets)
- name VARCHAR
- start_date TIMESTAMP WITH TIME ZONE (nullable)
- end_date TIMESTAMP WITH TIME ZONE (nullable)
- time_ranges JSONB (array of {start, end})
- days_of_week JSONB (object with boolean for each day)
- active BOOLEAN
- is_default BOOLEAN
- priority INTEGER
```

### media_assets
```sql
- id UUID
- name VARCHAR
- file_name VARCHAR
- file_url VARCHAR
- thumbnail_url VARCHAR
- media_type VARCHAR
```
