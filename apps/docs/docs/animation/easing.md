---
sidebar_position: 4
---

# Easing Functions

Easing functions control the rate of change during animations, making motion feel more natural.

## What is Easing?

Without easing (linear), animations move at constant speed:

```
Start ─────────────── End
      constant speed
```

With easing, animations accelerate and/or decelerate:

```
Start ╭─────────────╮ End
      slow → fast → slow
```

## Standard Easing Functions

### Linear

Constant speed throughout:

```
linear
───────────────────────
No acceleration
```

**Use for:** Progress bars, clock hands, mechanical motion

### Ease

Slow start, fast middle, slow end:

```
ease (default)
╭─────────────────────╮
Smooth, natural feel
```

**Use for:** General purpose, most UI animations

### Ease-In

Starts slow, accelerates:

```
ease-in
╱─────────────────────
Builds momentum
```

**Use for:** Objects leaving screen, fade outs

### Ease-Out

Starts fast, decelerates:

```
ease-out
─────────────────────╲
Settles into place
```

**Use for:** Objects entering screen, fade ins

### Ease-In-Out

Slow at both ends:

```
ease-in-out
╭─────────────────────╮
Smooth both ways
```

**Use for:** Objects moving within screen, loops

## Cubic Bezier Curves

Define custom easing with control points:

```typescript
{
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
}
```

Format: `cubic-bezier(x1, y1, x2, y2)`

### Common Cubic Bezier Values

| Name | Value | Feel |
|------|-------|------|
| Material Standard | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth, responsive |
| Material Decelerate | `cubic-bezier(0, 0, 0.2, 1)` | Quick start, gentle stop |
| Material Accelerate | `cubic-bezier(0.4, 0, 1, 1)` | Slow start, quick end |
| Sharp | `cubic-bezier(0.4, 0, 0.6, 1)` | Snappy |
| Smooth | `cubic-bezier(0.45, 0, 0.55, 1)` | Very smooth |

## Extended Easing Functions

### Power Easing

Based on exponential curves:

| Function | Curve | Intensity |
|----------|-------|-----------|
| `ease-in-quad` | x² | Subtle |
| `ease-in-cubic` | x³ | Medium |
| `ease-in-quart` | x⁴ | Strong |
| `ease-in-quint` | x⁵ | Very strong |

Each has `-out` and `-in-out` variants.

### Sine Easing

Sinusoidal curves (very smooth):

- `ease-in-sine`
- `ease-out-sine`
- `ease-in-out-sine`

**Use for:** Natural, organic motion

### Expo Easing

Exponential curves (dramatic):

- `ease-in-expo`
- `ease-out-expo`
- `ease-in-out-expo`

**Use for:** Impactful entrances/exits

### Circ Easing

Circular curves:

- `ease-in-circ`
- `ease-out-circ`
- `ease-in-out-circ`

**Use for:** Circular motion, orbits

### Back Easing

Overshoots then settles:

- `ease-in-back` - Anticipation
- `ease-out-back` - Overshoot
- `ease-in-out-back` - Both

**Use for:** Playful, bouncy animations

### Elastic Easing

Spring-like oscillation:

- `ease-in-elastic`
- `ease-out-elastic`
- `ease-in-out-elastic`

**Use for:** Attention-grabbing, playful motion

### Bounce Easing

Bouncing ball effect:

- `ease-in-bounce`
- `ease-out-bounce`
- `ease-in-out-bounce`

**Use for:** Landing, impact animations

## Easing Visualization

### Ease-Out Comparison

```
linear:      ─────────────────────
ease-out:    ─────────╲
ease-out-quad:────────╲
ease-out-cubic:───────╲
ease-out-quart:──────╲
ease-out-expo: ─────╲
```

More dramatic curves settle faster.

### Ease-In Comparison

```
linear:      ─────────────────────
ease-in:              ╱─────────
ease-in-quad:          ╱────────
ease-in-cubic:          ╱───────
ease-in-quart:           ╱──────
ease-in-expo:             ╱─────
```

More dramatic curves start slower.

## Choosing the Right Easing

### For Entrances (IN Animation)

| Content Type | Recommended Easing |
|--------------|-------------------|
| Standard | `ease-out` |
| Urgent/Alert | `ease-out-expo` |
| Playful | `ease-out-back` |
| Elegant | `ease-out-cubic` |

### For Exits (OUT Animation)

| Content Type | Recommended Easing |
|--------------|-------------------|
| Standard | `ease-in` |
| Quick exit | `ease-in-expo` |
| Gentle | `ease-in-sine` |

### For Loops

| Animation Type | Recommended Easing |
|----------------|-------------------|
| Pulse | `ease-in-out-sine` |
| Breathing | `ease-in-out` |
| Bounce | `ease-out-bounce` |

## Per-Keyframe Easing

Set different easing for each keyframe:

```typescript
// Keyframe 1: ease-out to keyframe 2
{ position: 0, easing: 'ease-out', properties: { x: 0 } }

// Keyframe 2: linear to keyframe 3
{ position: 0.5, easing: 'linear', properties: { x: 100 } }

// Keyframe 3: (end, no next keyframe)
{ position: 1, properties: { x: 200 } }
```

## Best Practices

### Consistency

- Use consistent easing across similar animations
- Define project-wide easing standards
- Match easing to brand personality

### Performance

- Simpler curves perform better
- Avoid elastic/bounce for many elements
- Test on target hardware

### Subtlety

- Extreme easing can look unprofessional
- `ease-out` is often sufficient
- Save dramatic easing for emphasis

### Testing

- Preview at different speeds
- Check on various devices
- Ensure easing feels natural

## Common Mistakes

### Too Much Bounce

Excessive bounce/elastic looks unprofessional in broadcast.

### Inconsistent Easing

Mixing easing types randomly creates jarring transitions.

### Ignoring Motion Direction

Use `ease-in` for exits, `ease-out` for entrances.

### Over-Complicated

Simple `ease` or `ease-out` handles most cases well.
