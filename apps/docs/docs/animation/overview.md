---
sidebar_position: 1
---

# Animation Overview

Nova GFX provides a powerful animation system for creating professional broadcast motion graphics.

## Core Concepts

### Timeline-Based Animation

Animations are defined on a timeline with:
- **Keyframes** - Snapshots of element properties at specific times
- **Interpolation** - Smooth transitions between keyframes
- **Easing** - Control of animation acceleration/deceleration

### Three-Phase System

Every animation has three distinct phases:

| Phase | Purpose | Typical Duration |
|-------|---------|------------------|
| **IN** | Element entrance | 0.3 - 1.0 seconds |
| **LOOP** | Continuous display | Variable |
| **OUT** | Element exit | 0.3 - 1.0 seconds |

This matches standard broadcast workflow:
1. Trigger IN when graphic should appear
2. LOOP plays while graphic is on-screen
3. Trigger OUT when graphic should disappear

## Animation Workflow

### 1. Select Phase

Use the phase buttons or keyboard shortcuts:
- `1` - IN phase
- `2` - LOOP phase
- `3` - OUT phase

### 2. Position Playhead

Click on the timeline or drag the playhead to the desired time.

### 3. Set Properties

Adjust element properties:
- Position (X, Y)
- Size (Width, Height)
- Opacity
- Rotation
- Scale
- Custom properties

### 4. Add Keyframe

Press `K` or click the keyframe button to record the current state.

### 5. Repeat

Move to another time, change properties, add another keyframe.

## Animatable Properties

### Transform Properties

| Property | Type | Description |
|----------|------|-------------|
| `x` | number | Horizontal position |
| `y` | number | Vertical position |
| `width` | number | Element width |
| `height` | number | Element height |
| `rotation` | number | Rotation in degrees |
| `scale` | number | Scale factor |

### Visual Properties

| Property | Type | Description |
|----------|------|-------------|
| `opacity` | number | Transparency (0-1) |
| `fill` | string | Fill color |
| `stroke` | string | Stroke color |
| `strokeWidth` | number | Stroke thickness |

### Element-Specific Properties

Different elements have additional animatable properties:

- **Text**: `fontSize`, `letterSpacing`, `text`
- **Shape**: `borderRadius`, `fillOpacity`
- **Map**: `center`, `zoom`, `pitch`, `bearing`
- **Chart**: `data` values

## Timeline Interface

```
┌────────────────────────────────────────────────────────────┐
│  [IN] [LOOP] [OUT]           [◀ Play ▶]  [Reset]          │
├────────────────────────────────────────────────────────────┤
│                    Timeline Ruler                          │
│  0.0s     0.5s     1.0s     1.5s     2.0s                 │
├────────────────────────────────────────────────────────────┤
│  Element 1    [◆]─────────────[◆]                         │
│  Element 2         [◆]────────────[◆]                     │
│  Element 3    [◆]──────[◆]──────────[◆]                   │
└────────────────────────────────────────────────────────────┘
```

- **◆** = Keyframe
- **─** = Interpolation between keyframes
- **Ruler** = Time markers

## Preview Controls

| Control | Action |
|---------|--------|
| **Play** | Play current phase animation |
| **Pause** | Stop playback |
| **Reset** | Return to start of phase |
| **Scrub** | Drag playhead to preview any point |

## Animation Settings

### Per-Animation Settings

```typescript
{
  phase: 'in' | 'loop' | 'out',
  duration: number,      // Total phase duration
  delay: number,         // Delay before start
  easing: string,        // Default easing function
  iterations: number,    // Loop count (LOOP phase)
  direction: 'normal' | 'reverse' | 'alternate'
}
```

### Per-Keyframe Settings

```typescript
{
  position: number,      // Time position (0-1 normalized)
  easing: string,        // Easing to next keyframe
  properties: {          // Property values at this keyframe
    x: number,
    y: number,
    // ...
  }
}
```

## Best Practices

### Timing
- Keep IN/OUT animations 0.3-0.8 seconds
- Match animation speed to content importance
- Use consistent timing across similar elements

### Motion
- Follow natural movement patterns
- Avoid jarring direction changes
- Use appropriate easing for the motion type

### Performance
- Limit simultaneous animations
- Avoid animating expensive properties (blur, shadow)
- Test on target hardware

### Consistency
- Use animation presets for consistency
- Document custom animation patterns
- Match animation style to brand

## Next Steps

- [Learn about Animation Phases](./phases)
- [Master Keyframes](./keyframes)
- [Understand Easing Functions](./easing)
- [Use Animation Presets](./presets)
