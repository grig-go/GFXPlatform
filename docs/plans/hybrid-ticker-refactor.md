# Hybrid Ticker Refactor Plan

## Overview
Refactor the ticker element to support per-item mode control, allowing each item in a data feed to specify its own animation mode (scroll, flip, fade, slide) with graceful transitions between modes.

## Current State
- Ticker supports 4 modes: scroll, flip, fade, slide
- Mode is set at the ticker element level (all items use same mode)
- No external data feed support (XML/JSON)

## Target State
- Each item can specify its own mode
- Graceful transitions between modes (current item completes before next begins)
- JSON/XML feed support for live data
- All timing/animation settings controlled in Nova GFX designer

---

## JSON Feed Format

```json
{
  "feedId": "breaking-news",
  "items": [
    {
      "id": "item-001",
      "mode": "scroll",
      "text": "BREAKING: Major earthquake strikes coastal region",
      "topic": "BREAKING NEWS",
      "topicColor": "#ef4444"
    },
    {
      "id": "item-002",
      "mode": "flip",
      "text": "DOW +2.3%",
      "topic": "MARKETS",
      "topicColor": "#22c55e"
    },
    {
      "id": "item-003",
      "mode": "fade",
      "text": "Weather Alert: Heavy snow expected",
      "topic": "WEATHER",
      "topicColor": "#3b82f6"
    },
    {
      "id": "item-004",
      "mode": "slide",
      "text": "Championship Finals Tonight",
      "topic": "SPORTS",
      "topicColor": "#f59e0b"
    }
  ]
}
```

### Item Fields
| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier |
| `mode` | Yes | `scroll`, `flip`, `fade`, or `slide` |
| `text` | Yes | Content to display |
| `topic` | No | Label badge (e.g., "BREAKING NEWS") |
| `topicColor` | No | Color override for topic badge |

---

## Architecture

### 1. Extended Types

```typescript
// packages/types/src/ticker.ts

type TickerMode = 'scroll' | 'flip' | 'fade' | 'slide';

interface TickerFeedItem {
  id: string;
  mode: TickerMode;
  text: string;
  topic?: string;
  topicColor?: string;
}

interface TickerFeed {
  feedId: string;
  items: TickerFeedItem[];
}

type ItemState = 'queued' | 'entering' | 'active' | 'exiting' | 'complete';

interface TickerItemState {
  item: TickerFeedItem;
  state: ItemState;
  progress: number; // 0-1
}
```

### 2. State Machine

```
QUEUED → ENTERING → ACTIVE → EXITING → COMPLETE
                              ↓
                        (next item ENTERING)
```

- **QUEUED**: Waiting in queue
- **ENTERING**: Animation starting (mode-specific entrance)
- **ACTIVE**: Fully visible, running (scroll moves, flip/fade/slide holds)
- **EXITING**: Animation ending (mode-specific exit)
- **COMPLETE**: Done, removed from queue

### 3. Component Architecture

```
TickerOrchestrator
├── manages item queue
├── tracks current/next item states
├── handles mode transitions
└── renders appropriate component:
    ├── ScrollRenderer
    ├── FlipRenderer
    ├── FadeRenderer
    └── SlideRenderer
```

### 4. Transition Behavior

| Current Mode | Next Mode | Transition |
|--------------|-----------|------------|
| scroll | flip | Scroll exits fully, then flip enters |
| scroll | fade | Scroll exits fully, then fade enters |
| scroll | slide | Scroll exits fully, then slide enters |
| flip | scroll | Flip exits, scroll enters from right |
| flip | flip | Direct flip to next |
| fade | any | Fade out, then next enters |
| slide | any | Slide out, then next enters |

Key principle: **Current item always completes its exit before next item enters**

---

## Implementation Phases

### Phase 1: Types & Data Layer
- [ ] Add new types to `packages/types/src/ticker.ts`
- [ ] Create feed parser service
- [ ] Add feed URL field to ticker element properties

### Phase 2: State Machine
- [ ] Create `useTickerOrchestrator` hook
- [ ] Implement item queue management
- [ ] Implement state transitions

### Phase 3: Renderers
- [ ] Extract current mode logic into separate renderer components
- [ ] Ensure each renderer handles enter/active/exit states
- [ ] Add callbacks for state completion

### Phase 4: Feed Integration
- [ ] Add fetch logic with polling interval
- [ ] Handle feed updates (new items, removed items)
- [ ] Cache management

### Phase 5: Designer UI
- [ ] Add "Data Feed" mode toggle in TickerEditor
- [ ] Add feed URL input
- [ ] Add refresh interval setting
- [ ] Preview with sample feed data

---

## Files to Modify

- `packages/types/src/ticker.ts` - Add new types
- `apps/nova-gfx/src/components/canvas/TickerElement.tsx` - Refactor to orchestrator pattern
- `apps/nova-gfx/src/components/panels/TickerEditor.tsx` - Add feed configuration UI
- New: `apps/nova-gfx/src/components/canvas/ticker/TickerOrchestrator.tsx`
- New: `apps/nova-gfx/src/components/canvas/ticker/renderers/ScrollRenderer.tsx`
- New: `apps/nova-gfx/src/components/canvas/ticker/renderers/FlipRenderer.tsx`
- New: `apps/nova-gfx/src/components/canvas/ticker/renderers/FadeRenderer.tsx`
- New: `apps/nova-gfx/src/components/canvas/ticker/renderers/SlideRenderer.tsx`
- New: `apps/nova-gfx/src/hooks/useTickerOrchestrator.ts`
- New: `apps/nova-gfx/src/services/tickerFeedService.ts`

---

## Notes
- All timing/speed/duration settings remain in the Nova GFX designer (per-mode settings on the element)
- Feed only provides content and which mode to use per item
- Backward compatible: manual items still work, feed is optional data source
