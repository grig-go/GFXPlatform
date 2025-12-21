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

### Step 3: Update AddDataModal (Primary Data Source Selector)

**File:** `apps/nova-gfx/src/components/dialogs/AddDataModal.tsx`

This is the main modal used by `DataBindingTab` to add data sources to templates.

**Current State (static):**
```typescript
// Lines 21-25 - imports static data
import {
  getCategories,
  getDataSourcesForCategory,
  type DataSourceConfig,
} from '@/data/sampleDataSources';

// Line 38 - gets static categories
const categories = useMemo(() => getCategories(), []);

// Lines 40-43 - filters static data by category
const dataSources = useMemo(() => {
  if (!selectedCategory) return [];
  return getDataSourcesForCategory(selectedCategory);
}, [selectedCategory]);
```

**Changes:**
1. Remove static `sampleDataSources` imports (`getCategories`, `getDataSourcesForCategory`)
2. Add state for endpoints: `const [endpoints, setEndpoints] = useState<NovaEndpoint[]>([])`
3. Add loading state: `const [loading, setLoading] = useState(false)`
4. Fetch endpoints on modal open using `novaEndpointService.listNovaEndpoints()`
5. Remove category dropdown (endpoints are already filtered by `target_app='nova-gfx'`)
6. Show all endpoints in a flat list with name, description, record count
7. When user selects endpoint, fetch data via `fetchEndpointData(slug)`
8. Show loading spinner while fetching
9. Preview first record of fetched data
10. On apply: pass fetched data to store

**Updated Flow:**
```typescript
// On modal open
useEffect(() => {
  if (open) {
    setLoading(true);
    listNovaEndpoints()
      .then(setEndpoints)
      .finally(() => setLoading(false));
  }
}, [open]);

// When user clicks endpoint card
const handleSelectEndpoint = async (endpoint: NovaEndpoint) => {
  setLoading(true);
  const data = await fetchEndpointData(endpoint.slug);
  setSelectedEndpoint(endpoint);
  setFetchedData(data);
  setLoading(false);
};

// On apply - uses fetched data
setDataSource(endpoint.id, endpoint.name, fetchedData, 'auto');
```

**UI Updates:**
```
┌─────────────────────────────────────────────────┐
│ Add Data Source                                 │
├─────────────────────────────────────────────────┤
│ Available Nova GFX Endpoints:                   │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ ● Nova GFX Current Weather                  │ │
│ │   /api/nova-gfx-current-weather             │ │
│ │   JSON • 12 records                         │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ ○ Nova GFX Election                         │ │
│ │   /api/nova-gfx-election                    │ │
│ │   JSON • 51 records                         │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ ○ Nova GFX Forecast Weather                 │ │
│ │   /api/nova-gfx-forecast-weather            │ │
│ │   JSON • 12 records                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Preview (First Record):                         │
│ ┌─────────────────────────────────────────────┐ │
│ │ { "location": { "name": "Atlanta", ... } }  │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│                        [Cancel] [Apply]         │
└─────────────────────────────────────────────────┘
```

---

### Step 3b: Update ChatPanel Data Source Dropdown

**File:** `apps/nova-gfx/src/components/designer/ChatPanel.tsx`

**Current State (static):**
```typescript
// Line 14 - imports static data
import { sampleDataSources, type DataSourceConfig, extractFieldsFromData } from '@/data/sampleDataSources';

// Lines 3285-3310 - builds dropdown from static array
{sampleDataSources.filter(ds => ds.category === category).map(ds => (
  <DropdownMenuItem ... />
))}
```

**Changes:**
1. Remove `sampleDataSources` import
2. Add state for dynamically loaded endpoints: `const [availableEndpoints, setAvailableEndpoints] = useState<NovaEndpoint[]>([])`
3. Fetch endpoints on mount using `novaEndpointService.listNovaEndpoints()`
4. Update dropdown to iterate `availableEndpoints` instead of `sampleDataSources`
5. When user selects endpoint, fetch data via `novaEndpointService.fetchEndpointData(slug)`
6. Keep `extractFieldsFromData()` - already works dynamically with any JSON structure

**Updated Dropdown Flow:**
```typescript
// On mount or when dropdown opens
useEffect(() => {
  async function loadEndpoints() {
    const endpoints = await listNovaEndpoints();
    setAvailableEndpoints(endpoints);
  }
  loadEndpoints();
}, []);

// In dropdown menu
{availableEndpoints.map(endpoint => (
  <DropdownMenuItem
    onClick={async () => {
      const data = await fetchEndpointData(endpoint.slug);
      setSelectedDataSource({
        id: endpoint.id,
        name: endpoint.name,
        data: data, // fetched array
        displayField: 'auto' // or from endpoint config
      });
      setIsDataMode(true);
    }}
  >
    {endpoint.name}
  </DropdownMenuItem>
))}
```

**AI Context Building (UNCHANGED):**
The `buildContext()` function already uses `extractFieldsFromData()` which dynamically walks any JSON structure. No changes needed - it will work with any endpoint schema:
```typescript
// Line 2107 - already dynamic
const fields = extractFieldsFromData(selectedDataSource.data);
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
| `designer/ChatPanel.tsx` | MODIFY | Dynamic endpoint dropdown for AI data mode |
| `stores/designerStore.ts` | MODIFY | Add endpoint state, keep dataPayload format |
| `designer/DataBindingTab.tsx` | MODIFY | Show endpoint info, refresh button |
| `data/sampleDataSources.ts` | KEEP (utilities only) | Keep `extractFieldsFromData()` and `getNestedValue()`, remove static data arrays |
| `lib/bindingResolver.ts` | UNCHANGED | Data format unchanged |
| `pages/Preview.tsx` | UNCHANGED | Uses same dataPayload |
| `components/canvas/StageElement.tsx` | UNCHANGED | Uses same resolution |

---

## API Dependencies

### Already Built
- `listEndpointsByTargetApp('nova-gfx')` - Returns endpoints with target_apps containing 'nova-gfx'
- Edge function: `agent-wizard/list-by-target-app`
- Database: `api_endpoints.target_apps` column with GIN index
- Endpoint serving: `api-endpoints/{slug}` routes that serve actual data

---

## Endpoint Compatibility Analysis

Three Nova GFX endpoints currently exist. The refactor must be **dynamic** - it should work with any endpoint structure, not just these specific ones.

### Current Endpoints

#### 1. Election (`nova-gfx-election`) - ✅ 100% Compatible
Flat structure with top-level fields: `Title`, `State`, `Candidate1`, `Votes1`, `Pct1`, `Winner1`, etc.

#### 2. Current Weather (`nova-gfx-current-weather`) - ⚠️ 90% Compatible
Nested structure: `location.name`, `weather.temperature.value`, etc.

**Missing fields (need to add to endpoint):**
- `weather.temperature.valueAndUnit` - computed convenience field
- `weather.feelsLike.valueAndUnit` - computed convenience field
- `lastUpdated` - timestamp field

#### 3. Forecast Weather (`nova-gfx-forecast-weather`) - ❌ Structure Mismatch

**Sample format** (parallel arrays):
```json
{
  "weather": {
    "items": [{
      "date": ["2025-12-18", "2025-12-19"],
      "temperatureMax": { "valueAndUnit": ["59°F", "48°F"] },
      "icon": ["am showers", "sunny"]
    }]
  }
}
```

**Endpoint format** (array of objects):
```json
{
  "forecast": {
    "daily": [
      { "date": "2025-12-21", "icon": "sunny", "tempMax": { "value": 64.6, "unit": "°F" } },
      { "date": "2025-12-22", ... }
    ]
  }
}
```

**Recommendation:** Update endpoint to use array-of-objects format (modern, cleaner). The field extraction in Nova GFX already supports both structures dynamically.

---

## Dynamic Data Handling Design

### Key Principle: Schema-Agnostic

The refactor must NOT hardcode any specific field names or structures. Future endpoints with completely different schemas should "just work."

### How It Works

1. **Endpoint returns JSON array** - Any structure allowed
2. **Field extraction is dynamic** - `extractFieldsFromData()` in `sampleDataSources.ts` already walks any JSON structure recursively
3. **Bindings use dot-notation paths** - e.g., `location.name`, `forecast.daily[0].tempMax.value`
4. **No schema validation** - Nova GFX accepts whatever the endpoint returns

### Example: Adding a New "Sports Scores" Endpoint

A future endpoint like `nova-gfx-sports` could return:
```json
[
  {
    "game": { "home": "Giants", "away": "Eagles", "score": { "home": 24, "away": 17 } },
    "status": "Final",
    "quarter": 4
  }
]
```

Nova GFX would automatically:
1. Discover the endpoint via `listEndpointsByTargetApp('nova-gfx')`
2. Extract fields: `game.home`, `game.away`, `game.score.home`, `status`, `quarter`
3. Allow binding any field to any element
4. No code changes required

### Implementation Requirements

| Component | Dynamic Behavior |
|-----------|------------------|
| `AddDataModal` | Shows ALL endpoints with `target_app='nova-gfx'`, no filtering |
| `extractFieldsFromData()` | Already dynamic - walks any JSON structure |
| `getNestedValue()` | Already supports dot notation + array indices |
| `bindingResolver` | Already uses dynamic path resolution |
| `dataPayload` | Holds raw array, no schema assumptions |

### Endpoint Schema Contract

The only requirement for an endpoint to work with Nova GFX:
```typescript
// Endpoint must return:
Record<string, unknown>[]  // Array of objects, any structure
```

No specific fields required. Nova GFX discovers and displays whatever fields exist.

---

## Endpoint Update Tasks (Pre-requisite)

| Endpoint | Task | Priority |
|----------|------|----------|
| `nova-gfx-current-weather` | Add `valueAndUnit` computed fields | High |
| `nova-gfx-current-weather` | Add `lastUpdated` timestamp | High |
| `nova-gfx-forecast-weather` | Change to array-of-objects structure | High |
| `nova-gfx-election` | None - ready to use | ✅ Done |

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
