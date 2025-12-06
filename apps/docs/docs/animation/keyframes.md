---
sidebar_position: 3
---

# Keyframes

Keyframes are snapshots of element properties at specific points in time. The animation system interpolates between keyframes to create smooth motion.

## Understanding Keyframes

### What is a Keyframe?

A keyframe records:
- **Time position** - When in the animation
- **Property values** - Element state at that time
- **Easing** - How to transition TO the next keyframe

```typescript
interface Keyframe {
  id: string;
  animation_id: string;
  position: number;      // 0-1 (normalized time)
  easing: string;        // Easing function
  properties: Record<string, any>;  // Property values
}
```

### Interpolation

The system calculates intermediate values:

```
Keyframe A              Keyframe B
x: 0, opacity: 0   →    x: 100, opacity: 1

At 50%: x: 50, opacity: 0.5
```

## Creating Keyframes

### Via Timeline

1. Move playhead to desired time
2. Adjust element properties
3. Press `K` to add keyframe

### Via Properties Panel

1. Find the property to animate
2. Click the keyframe diamond icon
3. Keyframe added at current playhead position

### Via Context Menu

1. Right-click on timeline
2. Select "Add Keyframe"
3. Keyframe added with current values

## Keyframe Operations

### Selecting

- Click on keyframe in timeline
- Shift+Click for multi-select
- Properties panel shows selected keyframe values

### Moving

- Drag keyframe horizontally on timeline
- Or edit time position in properties

### Copying

- `Ctrl+C` to copy selected keyframe(s)
- `Ctrl+V` to paste at playhead

### Deleting

- Select keyframe(s)
- Press `Delete` or `Backspace`

### Duplicating

- `Ctrl+D` duplicates to playhead position
- Useful for creating symmetric animations

## Keyframe Properties

### Position

Normalized time value (0 to 1):

| Position | Meaning |
|----------|---------|
| 0 | Start of animation |
| 0.5 | Middle of animation |
| 1 | End of animation |

With a 1-second animation:
- Position 0 = 0ms
- Position 0.5 = 500ms
- Position 1 = 1000ms

### Easing

Controls interpolation curve to NEXT keyframe:

```typescript
{
  easing: 'ease-out'  // Affects transition from THIS keyframe
}
```

See [Easing Functions](./easing) for options.

### Properties

All animatable property values at this time:

```typescript
{
  properties: {
    x: 100,
    y: 50,
    opacity: 1,
    rotation: 0,
    scale: 1
  }
}
```

## Keyframe Types

### Start Keyframe

First keyframe at position 0:

```typescript
// Element starts off-screen and transparent
{
  position: 0,
  properties: {
    x: -200,
    opacity: 0
  }
}
```

### End Keyframe

Final keyframe at position 1:

```typescript
// Element ends in final position
{
  position: 1,
  properties: {
    x: 100,
    opacity: 1
  }
}
```

### Intermediate Keyframe

Keyframes between start and end:

```typescript
// Element pauses midway
{
  position: 0.5,
  easing: 'linear',
  properties: {
    x: 50,
    opacity: 1
  }
}
```

## Multi-Property Animation

Animate multiple properties simultaneously:

```typescript
// Single keyframe with multiple properties
{
  position: 0,
  properties: {
    x: 0,
    y: 0,
    opacity: 0,
    rotation: -45,
    scale: 0.5
  }
}

{
  position: 1,
  properties: {
    x: 100,
    y: 50,
    opacity: 1,
    rotation: 0,
    scale: 1
  }
}
```

## Property-Specific Keyframes

Different properties can have different keyframe timing:

```typescript
// Opacity animation (0-500ms)
Opacity: [
  { position: 0, opacity: 0 },
  { position: 0.5, opacity: 1 }  // Fully visible at 50%
]

// Position animation (0-1000ms)
Position: [
  { position: 0, x: -200 },
  { position: 1, x: 100 }  // Still moving when fully visible
]
```

## Keyframe Patterns

### Linear Motion

Two keyframes, constant speed:

```
[A]──────────────[B]
```

### Ease In-Out

Two keyframes with easing:

```
[A]╭──────────────╮[B]
   slow → fast → slow
```

### Hold

Same value at two keyframes (pause):

```
[A]────────[B]════[C]
   motion    hold    motion
```

### Bounce

Multiple keyframes for bounce effect:

```
[A]──[B]──[C]──[D]
     overshoot  settle
```

### Stagger

Sequential keyframes for offset animation:

```
Element 1: [A]────[B]
Element 2:    [A]────[B]
Element 3:       [A]────[B]
```

## Map Location Keyframes

Special keyframes for map flight paths:

```typescript
interface MapLocationKeyframe {
  id: string;
  time: number;           // Time in milliseconds
  lng: number;            // Longitude
  lat: number;            // Latitude
  zoom: number;
  pitch?: number;
  bearing?: number;
  easing?: string;
  phase?: 'in' | 'loop' | 'out';
  locationName?: string;
}
```

These are stored separately from animation keyframes in the element content.

## Best Practices

### Minimum Keyframes

Use only necessary keyframes:
- Two keyframes for simple transitions
- Add more only for complex motion

### Keyframe Density

Balance smoothness and editability:
- Too few: Jerky motion
- Too many: Hard to edit

### Consistent Timing

Align keyframes across related elements for coordinated animation.

### Documentation

Name keyframes meaningfully when possible (via comments or naming convention).

### Testing

- Preview at different speeds
- Check all phase transitions
- Verify on target hardware
