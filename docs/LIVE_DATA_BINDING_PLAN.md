# Live Data Binding Implementation Plan

## Overview
Enable real-time data updates in Preview and Published graphics by polling JSON endpoints. This allows election results, stock data, sports scores, and other live data to automatically update bound elements.

## Use Cases
- **Election Graphics**: Vote counts, percentages, winner indicators
- **Stock Tickers**: Price, change, volume
- **Sports**: Scores, standings, race positions
- **Weather**: Temperature, conditions, forecasts

---

## Phase 1: Data Model & Types

### 1.1 Add LiveDataConfig to Template
Location: `packages/types/src/database.ts`

```typescript
export interface LiveDataConfig {
  enabled: boolean;
  endpoint: string;              // URL to fetch JSON from
  refreshInterval: number;       // Milliseconds (e.g., 10000 = 10s)
  headers?: Record<string, string>;  // Optional auth/API headers
  dataPath?: string;             // JSON path to data array (e.g., "results.candidates")
  method?: 'GET' | 'POST';       // HTTP method (default: GET)
  body?: string;                 // Request body for POST
  errorRetryInterval?: number;   // Retry interval on error (default: 30000)
  maxRetries?: number;           // Max consecutive retries (default: 3)
}
```

### 1.2 Extend Template.data_source_config
The existing `data_source_config` JSONB column on `gfx_templates` will store:
```typescript
interface DataSourceConfig {
  // Existing fields
  dataSourceId?: string;
  defaultRecordIndex?: number;
  dataDisplayField?: string;

  // New live data fields
  liveData?: LiveDataConfig;
}
```

No database migration needed - just extend the JSON structure.

---

## Phase 2: Live Data Service

### 2.1 Create liveDataService.ts
Location: `apps/nova-gfx/src/services/liveDataService.ts`

```typescript
export interface LiveDataState {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  lastUpdated?: Date;
  data: Record<string, unknown>[];
  retryCount: number;
}

export class LiveDataPoller {
  private config: LiveDataConfig;
  private intervalId?: number;
  private onUpdate: (data: Record<string, unknown>[]) => void;
  private onError: (error: string) => void;
  private retryCount: number = 0;

  constructor(
    config: LiveDataConfig,
    onUpdate: (data: Record<string, unknown>[]) => void,
    onError: (error: string) => void
  );

  start(): void;
  stop(): void;
  fetchNow(): Promise<void>;
  getState(): LiveDataState;
}
```

### 2.2 Service Features
- Configurable polling interval
- Automatic retry on failure with backoff
- JSON path extraction (using lodash `get`)
- Header injection for authenticated APIs
- Error state tracking
- Manual refresh capability

---

## Phase 3: Preview.tsx Integration

### 3.1 Add Live Data Hook
Location: `apps/nova-gfx/src/hooks/useLiveData.ts`

```typescript
export function useLiveData(config: LiveDataConfig | null) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [state, setState] = useState<LiveDataState>({...});

  useEffect(() => {
    if (!config?.enabled) return;

    const poller = new LiveDataPoller(config, setData, setError);
    poller.start();

    return () => poller.stop();
  }, [config]);

  return { data, state, refresh: () => poller.fetchNow() };
}
```

### 3.2 Integrate in Preview.tsx
```typescript
// In Preview.tsx
const liveDataConfig = localData?.dataSourceConfig?.liveData;

// Use live data if enabled, otherwise fall back to static dataPayload
const { data: liveData, state: liveDataState } = useLiveData(liveDataConfig);

const previewDataPayload = liveDataConfig?.enabled
  ? liveData
  : (localData?.dataPayload || []);
```

### 3.3 Add Live Data Indicator UI
- Show pulsing indicator when live data is active
- Show last update timestamp
- Show error state with retry countdown
- Manual refresh button

---

## Phase 4: NovaPlayer.tsx Integration

### 4.1 Same Integration Pattern
Apply the same `useLiveData` hook to NovaPlayer for published graphics.

### 4.2 URL Parameter Override
Allow endpoint override via URL params for flexibility:
```
/player/abc123?liveEndpoint=https://api.example.com/data&refreshInterval=5000
```

---

## Phase 5: Designer UI

### 5.1 Live Data Configuration Panel
Location: Add to existing Data Binding tab or new "Live Data" section

**UI Elements:**
- Toggle: "Enable Live Data"
- Input: "API Endpoint URL"
- Input: "Refresh Interval" (seconds, with presets: 5s, 10s, 30s, 1min)
- Input: "Data Path" (optional, e.g., "results.items")
- Collapsible: "Advanced Options"
  - Headers (key-value pairs)
  - HTTP Method (GET/POST)
  - Request Body (for POST)
  - Error retry settings

### 5.2 Test Connection Button
- Fetch endpoint and show sample data
- Validate response structure
- Show field mapping preview

### 5.3 Live Preview Toggle
- Enable live polling in designer preview
- Show real-time updates as you design

---

## Phase 6: Error Handling & Edge Cases

### 6.1 Network Errors
- Exponential backoff on failures
- Maximum retry limit before giving up
- Clear error messaging in UI

### 6.2 CORS Handling
- Document CORS requirements
- Suggest proxy solutions for restricted APIs
- Consider Supabase Edge Function proxy option

### 6.3 Data Validation
- Validate response is valid JSON
- Validate data path exists
- Handle empty arrays gracefully
- Type coercion for bound fields

### 6.4 Performance
- Debounce rapid config changes
- Cancel pending requests on unmount
- Limit concurrent requests

---

## Implementation Order

### Sprint 1: Foundation
1. [ ] Add `LiveDataConfig` type to `packages/types`
2. [ ] Create `liveDataService.ts` with `LiveDataPoller` class
3. [ ] Create `useLiveData` hook

### Sprint 2: Preview Integration
4. [ ] Integrate `useLiveData` in `Preview.tsx`
5. [ ] Add live data indicator UI (pulsing dot, timestamp)
6. [ ] Add error state display

### Sprint 3: Player Integration
7. [ ] Integrate `useLiveData` in `NovaPlayer.tsx`
8. [ ] Add URL parameter overrides
9. [ ] Test with real endpoints

### Sprint 4: Designer UI
10. [ ] Add Live Data configuration panel in designer
11. [ ] Add "Test Connection" functionality
12. [ ] Add live preview toggle in designer

### Sprint 5: Polish & Edge Cases
13. [ ] CORS proxy solution (optional Edge Function)
14. [ ] Comprehensive error handling
15. [ ] Documentation and examples

---

## Example Configurations

### Election Results
```json
{
  "enabled": true,
  "endpoint": "https://api.elections.com/results/2024",
  "refreshInterval": 30000,
  "dataPath": "races[0].candidates",
  "headers": {
    "Authorization": "Bearer xxx"
  }
}
```

### Stock Ticker
```json
{
  "enabled": true,
  "endpoint": "https://api.stocks.com/quotes?symbols=AAPL,GOOGL,MSFT",
  "refreshInterval": 5000,
  "dataPath": "quotes"
}
```

### Sports Scores
```json
{
  "enabled": true,
  "endpoint": "https://api.sports.com/live/nfl/scores",
  "refreshInterval": 10000,
  "dataPath": "games"
}
```

---

## Testing Checklist

- [ ] Polling starts correctly on mount
- [ ] Polling stops on unmount (no memory leaks)
- [ ] Config changes restart polling with new settings
- [ ] Error states display correctly
- [ ] Retry logic works as expected
- [ ] Data updates trigger re-render of bound elements
- [ ] Manual refresh works
- [ ] URL parameter overrides work in Player
- [ ] Designer test connection works
- [ ] CORS errors handled gracefully

---

## Future Enhancements

1. **WebSocket Support**: Add option for WebSocket connections for truly real-time data
2. **Supabase Realtime**: Direct subscription to Supabase table changes
3. **Data Caching**: Cache last known good data for offline resilience
4. **Rate Limiting**: Respect API rate limits with intelligent throttling
5. **Data Transformation**: Allow simple JS transforms on fetched data
6. **Multiple Endpoints**: Support multiple data sources per template
