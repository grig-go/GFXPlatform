---
sidebar_position: 2
---

# Animation Phases

Nova GFX uses a three-phase animation system that mirrors professional broadcast workflows.

## The Three Phases

### IN Phase

The entrance animation - how elements appear on screen.

**Characteristics:**
- Plays once when triggered
- Elements typically start off-screen or invisible
- Ends with elements in their "on-screen" state

**Common IN Animations:**
- Slide in from edge
- Fade in
- Scale up from zero
- Wipe reveal

**Duration:** Typically 0.3 - 1.0 seconds

### LOOP Phase

What happens while the graphic is displayed.

**Characteristics:**
- Plays continuously until OUT is triggered
- Can be static (no animation) or animated
- Maintains viewer attention

**Common LOOP Animations:**
- Subtle pulse/glow
- Rotating elements
- Scrolling ticker
- Data updates

**Duration:** Variable (until OUT is triggered)

### OUT Phase

The exit animation - how elements disappear.

**Characteristics:**
- Plays once when triggered
- Elements return to off-screen or invisible state
- Typically mirrors IN animation

**Common OUT Animations:**
- Slide out to edge
- Fade out
- Scale down to zero
- Wipe hide

**Duration:** Typically 0.3 - 0.8 seconds (often faster than IN)

## Phase Transitions

### IN → LOOP

Automatic transition when IN completes:

```
[IN Phase]───────────────►[LOOP Phase]
    Element enters           Element stays visible
```

### LOOP → OUT

Triggered transition (manual or API):

```
[LOOP Phase]───trigger───►[OUT Phase]
    Element visible           Element exits
```

### OUT → Hidden

Element is no longer rendered after OUT completes.

## Phase-Specific Keyframes

### Map Location Keyframes

For map elements, location keyframes can be assigned to specific phases:

```typescript
{
  locationKeyframes: [
    { time: 0, lng: -74, lat: 40, phase: 'in' },      // NYC - IN
    { time: 1000, lng: -87, lat: 41, phase: 'in' },   // Chicago - IN
    { time: 0, lng: -87, lat: 41, phase: 'loop' },    // Stay at Chicago - LOOP
    { time: 0, lng: -87, lat: 41, phase: 'out' },     // Chicago - OUT
    { time: 1000, lng: -118, lat: 34, phase: 'out' }  // LA - OUT
  ]
}
```

During each phase, only keyframes with matching `phase` are used.

### General Keyframes

Standard animation keyframes apply within their assigned phase:

```typescript
// IN phase keyframes
Animation: phase='in', duration=500
├── Keyframe at 0ms: { x: -200, opacity: 0 }
└── Keyframe at 500ms: { x: 100, opacity: 1 }

// LOOP phase keyframes
Animation: phase='loop', duration=2000
├── Keyframe at 0ms: { scale: 1 }
├── Keyframe at 1000ms: { scale: 1.05 }
└── Keyframe at 2000ms: { scale: 1 }

// OUT phase keyframes
Animation: phase='out', duration=300
├── Keyframe at 0ms: { x: 100, opacity: 1 }
└── Keyframe at 300ms: { x: 200, opacity: 0 }
```

## Phase Settings

### Duration

Set the length of each phase:

```typescript
{
  in: { duration: 500 },      // 0.5 seconds
  loop: { duration: 2000 },   // 2 seconds per iteration
  out: { duration: 300 }      // 0.3 seconds
}
```

### Delay

Add delay before phase begins:

```typescript
{
  in: { delay: 200 },  // Wait 200ms before starting IN
}
```

### Iterations

Control LOOP behavior:

```typescript
{
  loop: {
    iterations: 3,          // Loop 3 times (0 = infinite)
    direction: 'alternate'  // Reverse every other iteration
  }
}
```

## Triggering Phases

### In Nova GFX Designer

- Click phase buttons in timeline
- Use keyboard shortcuts (`1`, `2`, `3`)
- Use playback controls

### In Pulsar GFX

- Click "Play IN" to trigger IN
- Click "Play OUT" to trigger OUT
- Use keyboard shortcuts

### Via API

```typescript
// Trigger IN
POST /api/preview/playIn

// Trigger OUT
POST /api/preview/playOut

// Get current phase
GET /api/preview/phase
// Returns: { phase: 'in' | 'loop' | 'out' | 'idle' }
```

## Phase Design Patterns

### Mirror Pattern

OUT is the reverse of IN:

```
IN:  [Left] ─────────► [Center]
OUT: [Center] ────────► [Left]
```

### Continue Pattern

OUT continues in the same direction:

```
IN:  [Left] ─────────► [Center]
OUT: [Center] ────────► [Right]
```

### Different Exit

OUT uses a completely different animation:

```
IN:  Scale up from 0 to 100%
OUT: Fade out
```

### Minimal Loop

LOOP has no animation (static display):

```
IN:  Slide in
LOOP: (static)
OUT: Slide out
```

### Active Loop

LOOP has continuous animation:

```
IN:  Fade in
LOOP: Pulse glow continuously
OUT: Fade out
```

## Best Practices

### Timing

| Phase | Recommended Duration |
|-------|---------------------|
| IN | 0.3 - 0.8 seconds |
| LOOP | 1 - 3 seconds per cycle |
| OUT | 0.2 - 0.5 seconds |

- OUT is often faster than IN
- Complex graphics need longer transitions
- Simple graphics can be snappier

### Consistency

- Use consistent phase timing across project
- Mirror IN/OUT when appropriate
- Match animation speed to content type

### Testing

- Test all three phases
- Verify clean transitions
- Check performance with multiple elements

### Production

- Brief IN animations for time-sensitive content
- Consider loop duration for long displays
- Ensure OUT completes cleanly
