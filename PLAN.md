# Nova GFX Data Binding Refactor Plan

## Overview

Refactor nova-gfx data binding to connect to Nova agent endpoints instead of local JSON files. The data format remains the same - only the source changes from static files to live API endpoints.

**Key Constraint:** The downstream consumers (AI Chat, Preview, Pulsar GFX) remain unchanged. They all consume `dataPayload` from the store in the same format as before.

---

## Current State

### How It Works Now
1. **Static Data** - All data sources are hardcoded in `sampleDataSources.ts` (elections, weather)
2. **No API Fetching** - Data is embedded directly, no network calls
3. **Store Holds Raw Data** - `designerStore.dataPayload` contains the actual data array
4. **AddDataModal** - Reads from static `sampleDataSources` only

### Data Consumers (NO CHANGES NEEDED)
- **AI Chat** - Uses `dataPayload` for context
- **Preview** - Uses `dataPayload` + `bindingResolver`
- **Pulsar GFX** - Uses same data format
- **StageElement** - Uses `resolveElementBindings()`

### Key Files
- `apps/nova-gfx/src/data/sampleDataSources.ts` - Static sample data (TO BE DELETED)
- `apps/nova-gfx/src/components/dialogs/AddDataModal.tsx` - Data source selection UI
- `apps/nova-gfx/src/components/designer/DataBindingTab.tsx` - Binding management UI
- `apps/nova-gfx/src/stores/designerStore.ts` - Data state management
- `apps/nova-gfx/src/lib/bindingResolver.ts` - Applies bindings to elements (UNCHANGED)

---

## Target State

### Architecture
```
Nova Agent Registry (Supabase)
    ↓
listEndpointsByTargetApp('nova-gfx')
    ↓
AddDataModal shows available endpoints
    ↓
User selects endpoint → fetch data from /api/{slug}
    ↓
Store receives data in SAME FORMAT as before
    ↓
dataPayload → AI Chat, Preview, Pulsar GFX (unchanged)
```

### Data Format Contract
The endpoint must return data in the same structure:
```typescript
// Array of records - same as sampleDataSources format
Record<string, unknown>[]
```

All downstream code continues to work because `dataPayload` format is unchanged.

---

## Implementation Steps

### Step 1: Create Nova Endpoint Service

**File:** `apps/nova-gfx/src/services/novaEndpointService.ts`

```typescript
// Functions to implement:
- listNovaEndpoints(): Fetch endpoints with target_app='nova-gfx'
- fetchEndpointData(slug: string): Fetch actual data from endpoint URL
```

**Uses:**
- The `listEndpointsByTargetApp` API we already created
- Nova API base URL for fetching actual endpoint data

---

### Step 2: Create Endpoint Types

**File:** `apps/nova-gfx/src/types/dataEndpoint.ts`

```typescript
interface NovaEndpoint {
  id: string;
  name: string;
  slug: string;
  description?: string;
  endpoint_url: string;      // /api/{slug}
  output_format: string;     // json, rss, etc.
  schema_config?: object;    // Field schema
  sample_data?: object;      // Sample payload for preview
}
```

---

### Step 3: Update AddDataModal

**File:** `apps/nova-gfx/src/components/dialogs/AddDataModal.tsx`

**Changes:**
1. Remove static `sampleDataSources` references
2. Fetch endpoint list from `novaEndpointService.listNovaEndpoints()`
3. Show endpoint cards with name, description, format
4. Preview endpoint data (live fetch)
5. On select: fetch data and pass to store in same format as before

**UI Flow:**
```
┌─────────────────────────────────┐
│ Nova GFX Weather                │
│ /api/nova-gfx-current-weather   │
│ Format: JSON | Records: 150     │
│ [Preview] [Select]              │
└─────────────────────────────────┘
```

---

### Step 4: Update Designer Store

**File:** `apps/nova-gfx/src/stores/designerStore.ts`

**Add new state:**
```typescript
// Endpoint reference (for refresh/reconnect)
dataEndpoint: {
  id: string | null;
  slug: string | null;
  url: string | null;
  name: string | null;
} | null;

// Loading/error states
dataLoading: boolean;
dataError: string | null;
dataLastFetched: number | null;
```

**Add new actions:**
```typescript
- setDataEndpoint(endpoint, data): Set endpoint ref + fetched data
- refreshData(): Re-fetch from current endpoint
- clearDataEndpoint(): Clear endpoint and data
```

**UNCHANGED:**
- `dataPayload` format stays the same (array of records)
- `currentRecordIndex`, `nextRecord()`, `prevRecord()` - unchanged
- `getDataRecordForTemplate()` - unchanged

---

### Step 5: Update DataBindingTab

**File:** `apps/nova-gfx/src/components/designer/DataBindingTab.tsx`

**Changes:**
1. Show endpoint info (name, URL) instead of just source name
2. Add refresh button to re-fetch data
3. Show loading spinner during fetch
4. Show error state if fetch fails
5. Show "last updated" timestamp
6. Keep ALL existing field binding UI unchanged

**UI Updates:**
```
Data Source: Nova GFX Weather
Endpoint: /api/nova-gfx-current-weather
Last updated: 2 minutes ago [Refresh]

[Record selector dropdown - UNCHANGED]
[Field bindings list - UNCHANGED]
```

---

### Step 6: Update Template Persistence

**In template data_source_config:**
```typescript
{
  endpointId: 'uuid',
  endpointSlug: 'nova-gfx-current-weather',
  displayField: 'location.name',
  refreshInterval: 60000,  // optional
  defaultRecordIndex: 0
}
```

**On template load:**
1. Read `endpointSlug` from config
2. Fetch fresh data from endpoint
3. Populate `dataPayload` in same format as before
4. If fetch fails, show error

---

### Step 7: Delete Sample Data

**File:** `apps/nova-gfx/src/data/sampleDataSources.ts` - DELETE

Remove all static sample data. All data comes from Nova endpoints.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `services/novaEndpointService.ts` | CREATE | API calls to fetch endpoints and data |
| `types/dataEndpoint.ts` | CREATE | TypeScript interfaces |
| `dialogs/AddDataModal.tsx` | MODIFY | Fetch endpoints instead of static data |
| `stores/designerStore.ts` | MODIFY | Add endpoint state, keep dataPayload format |
| `designer/DataBindingTab.tsx` | MODIFY | Show endpoint info, refresh button |
| `data/sampleDataSources.ts` | DELETE | Remove static sample data |
| `lib/bindingResolver.ts` | UNCHANGED | Data format unchanged |
| `pages/Preview.tsx` | UNCHANGED | Uses same dataPayload |
| `components/canvas/StageElement.tsx` | UNCHANGED | Uses same resolution |

---

## API Dependencies

### Already Built
- `listEndpointsByTargetApp('nova-gfx')` - Returns endpoints with target_apps containing 'nova-gfx'
- Edge function: `agent-wizard/list-by-target-app`
- Database: `api_endpoints.target_apps` column with GIN index

### Need to Verify
- Nova API endpoint serving: `/api/{slug}` routes that serve actual data
- Endpoints must return JSON array in same format as current sample data

---

## Testing Plan

1. Create test agent with target_app='nova-gfx'
2. Verify it appears in AddDataModal endpoint list
3. Select endpoint and verify data fetches correctly
4. Verify `dataPayload` format matches old sample data format
5. Bind fields to elements and verify rendering
6. Test AI Chat with bound data - should work unchanged
7. Test Preview - should work unchanged
8. Save template and reload - verify endpoint reconnects
9. Test refresh button

---

## Key Principle

**Only change where data comes FROM, not how it's USED.**

```
BEFORE: sampleDataSources.ts → dataPayload → [AI Chat, Preview, Pulsar]
AFTER:  Nova API endpoints   → dataPayload → [AI Chat, Preview, Pulsar]
                               ↑
                         Same format
```
