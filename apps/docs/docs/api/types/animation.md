---
sidebar_position: 3
---

# Animation Types

TypeScript type definitions for animations.

## Animation Interface

```typescript
interface Animation {
  id: string;
  template_id: string;
  element_id: string;
  phase: 'in' | 'loop' | 'out';
  delay: number;
  duration: number;
  easing: string;
  iterations: number;
  direction: 'normal' | 'reverse' | 'alternate';
  created_at: string;
}
```

## Keyframe Interface

```typescript
interface Keyframe {
  id: string;
  animation_id: string;
  position: number;  // 0-1 normalized
  easing: string;
  properties: Record<string, any>;
  created_at: string;
}
```

## Map Location Keyframe

```typescript
interface MapLocationKeyframe {
  id: string;
  time: number;
  lng: number;
  lat: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
  easing?: string;
  phase?: 'in' | 'loop' | 'out';
  locationName?: string;
}
```
