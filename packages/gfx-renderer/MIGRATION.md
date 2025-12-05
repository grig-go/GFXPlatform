# GFX Renderer Migration Guide

This document tracks the migration of rendering components from Nova GFX to the shared `@emergent-platform/gfx-renderer` package.

## Purpose

Make Pulsar GFX independent of Nova GFX by extracting shared rendering code into a reusable package.

## Current Status

| Component | Status | Nova Path | Notes |
|-----------|--------|-----------|-------|
| animation.ts | ✅ DONE | `src/lib/animation.ts` | Core animation engine - fully migrated |
| TextElement | ✅ DONE | `src/components/canvas/TextElement.tsx` | Basic text rendering |
| ImageElement | ⏳ TODO | `src/components/canvas/ImageElement.tsx` | 304 lines |
| ChartElement | ⏳ TODO | `src/components/canvas/ChartElement.tsx` | 597 lines, needs Chart.js |
| MapElement | ⏳ TODO | `src/components/canvas/MapElement.tsx` | 564 lines, needs Mapbox GL |
| VideoElement | ⏳ TODO | `src/components/canvas/VideoElement.tsx` | 451 lines |
| IconElement | ⏳ TODO | `src/components/canvas/IconElement.tsx` | 365 lines |
| TickerElement | ⏳ TODO | `src/components/canvas/TickerElement.tsx` | 565 lines |
| TopicBadgeElement | ⏳ TODO | `src/components/canvas/TopicBadgeElement.tsx` | 347 lines |
| SVGElement | ⏳ TODO | `src/components/canvas/SVGElement.tsx` | 265 lines |
| TableElement | ⏳ TODO | `src/components/canvas/TableElement.tsx` | 194 lines |
| LineElement | ⏳ TODO | `src/components/canvas/LineElement.tsx` | 209 lines |
| Stage | ⏳ TODO | `src/components/canvas/Stage.tsx` | 159 lines |
| StageElement | ⏳ TODO | `src/components/canvas/StageElement.tsx` | 995 lines - main wrapper |
| Preview | ⏳ TODO | `src/pages/Preview.tsx` | 1341 lines - preview page |
| useOnAirAnimation | ⏳ TODO | `src/hooks/useOnAirAnimation.ts` | 229 lines |

**Total remaining: ~6,000+ lines**

---

## Nova GFX Reconnection Steps

After migrating components to `@emergent-platform/gfx-renderer`, Nova GFX needs these changes:

### Step 1: Add Dependency

Edit `apps/nova-gfx/package.json`:

```json
{
  "dependencies": {
    "@emergent-platform/gfx-renderer": "workspace:*"
  }
}
```

### Step 2: Update Imports

#### Animation Engine

**Before:**
```typescript
import { getAnimatedProperties, easings } from '@/lib/animation';
```

**After:**
```typescript
import { getAnimatedProperties, easings } from '@emergent-platform/gfx-renderer';
```

**Files to update:**
- `src/components/canvas/StageElement.tsx`
- `src/pages/Preview.tsx`
- `src/components/designer/Timeline.tsx`
- `src/hooks/useOnAirAnimation.ts`

#### Element Components

**Before:**
```typescript
import { TextElement } from '@/components/canvas/TextElement';
import { ImageElement } from '@/components/canvas/ImageElement';
```

**After:**
```typescript
import { TextElement, ImageElement } from '@emergent-platform/gfx-renderer';
```

**Files to update:**
- `src/components/canvas/StageElement.tsx`
- `src/pages/Preview.tsx`

### Step 3: Keep Nova-Specific Code

Some code should stay in Nova GFX (editor-specific):

- `src/components/canvas/StageElement.tsx` - has selection/editing logic
- `src/components/designer/*` - design tools
- `src/stores/designerStore.ts` - editor state

The shared package should contain ONLY rendering logic (no editing UI).

---

## Pulsar GFX Integration

### Step 1: Add Dependency

Edit `apps/pulsar-gfx/package.json`:

```json
{
  "dependencies": {
    "@emergent-platform/gfx-renderer": "workspace:*"
  }
}
```

### Step 2: Create PreviewPanel with Native Renderer

Replace the iframe-based preview with native rendering:

```typescript
// apps/pulsar-gfx/src/components/preview/PreviewPanel.tsx
import {
  getAnimatedProperties,
  TextElement,
  ImageElement,
  // ... other elements
} from '@emergent-platform/gfx-renderer';

export function PreviewPanel() {
  // Load data from database
  const { templates, elements, animations, keyframes } = useProjectData();

  // Render using shared components
  return (
    <div className="preview-container">
      {elements.map(element => {
        const animatedProps = getAnimatedProperties(
          element,
          animations,
          keyframes,
          playheadPosition,
          currentPhase
        );

        // Render based on element type
        switch (element.element_type) {
          case 'text':
            return <TextElement key={element.id} {...element.content} animatedProps={animatedProps} />;
          case 'image':
            return <ImageElement key={element.id} {...element.content} animatedProps={animatedProps} />;
          // ... etc
        }
      })}
    </div>
  );
}
```

### Step 3: Handle Content Updates

Replace postMessage with direct state updates:

```typescript
// Content updates go directly to local state
const handleFieldChange = (fieldId: string, value: string) => {
  setContentOverrides(prev => ({
    ...prev,
    [fieldId]: value
  }));
};
```

---

## Migration Order (Recommended)

1. **Animation engine** ✅ - No UI dependencies
2. **TextElement** ✅ - Simplest, most common
3. **ImageElement** - Common, has media handling
4. **IconElement** - Uses Lucide icons
5. **Stage + StageElement** - Core rendering logic
6. **Preview page logic** - Extract as hook/component
7. **ChartElement** - External Chart.js dependency
8. **MapElement** - External Mapbox dependency
9. **VideoElement, TickerElement, etc.** - Specialized elements

---

## Testing After Migration

### Nova GFX
- [ ] Designer canvas still renders elements
- [ ] Timeline animations work
- [ ] Preview page works in isolation
- [ ] IN/LOOP/OUT phases animate correctly
- [ ] Element editing (drag, resize, rotate) works

### Pulsar GFX
- [ ] Templates load from database
- [ ] Elements render correctly
- [ ] Content editor fields populate
- [ ] Real-time preview updates work
- [ ] Animation controls work (Play IN, Play OUT)

---

## File Sizes Reference

| File | Lines | Size |
|------|-------|------|
| animation.ts | 634 | Core |
| TextElement.tsx | 218 | Simple |
| ImageElement.tsx | 304 | Medium |
| IconElement.tsx | 365 | Medium |
| VideoElement.tsx | 451 | Medium |
| MapElement.tsx | 564 | Complex |
| TickerElement.tsx | 565 | Complex |
| ChartElement.tsx | 597 | Complex |
| Stage.tsx | 159 | Simple |
| StageElement.tsx | 995 | Complex |
| Preview.tsx | 1341 | Complex |
| useOnAirAnimation.ts | 229 | Medium |

**Total: ~6,400+ lines to migrate**

---

## Dependencies to Include

```json
{
  "dependencies": {
    "motion": "^11.15.0",
    "chart.js": "^4.4.1",
    "react-chartjs-2": "^5.2.0",
    "mapbox-gl": "^3.3.0",
    "lucide-react": "^0.469.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

---

## Questions for Consideration

1. **Editor-specific code**: Some components have editor features (selection, drag handles). Should we:
   - Keep two versions (editor + renderer)?
   - Pass `isEditable` prop to toggle features?
   - Split into separate components?

2. **State management**: Components currently use Zustand store. Should we:
   - Pass all data as props (pure rendering)?
   - Create a shared rendering context?
   - Allow optional store integration?

3. **Mapbox/Chart.js**: These have significant bundle size. Should we:
   - Make them optional imports?
   - Lazy load them?
   - Keep in separate sub-packages?
