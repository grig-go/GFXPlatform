---
sidebar_position: 7
---

# Character Animation

Character animation allows you to animate text on a per-character basis, creating dynamic reveal effects like typewriter, wave, and bounce animations.

## Overview

Unlike standard element animations that affect the entire text block, character animation controls each individual character separately. This enables sophisticated text reveal effects commonly seen in broadcast graphics, titles, and motion graphics.

## Enabling Character Animation

1. Select a text element on the canvas
2. In the **Properties Panel**, find the **Character Animation** section
3. Toggle **Enable Character Animation**

Once enabled, you'll see controls for configuring the animation behavior.

## Animation Types

| Type | Description | Best For |
|------|-------------|----------|
| **Fade** | Characters fade in from transparent | Subtle reveals, elegant text |
| **Slide Up** | Characters slide up from below | Lower thirds, credits |
| **Slide Down** | Characters slide down from above | Titles, headings |
| **Slide Left** | Characters slide in from the right | News tickers, alerts |
| **Slide Right** | Characters slide in from the left | Call to actions |
| **Scale** | Characters scale up from small | Impact text, emphasis |
| **Blur** | Characters transition from blurred | Cinematic reveals |
| **Wave** | Characters animate in a wave motion | Playful, energetic text |
| **Bounce** | Characters bounce into place | Sports, entertainment |

## Animation Direction

Control the order in which characters animate:

| Direction | Description | Use Case |
|-----------|-------------|----------|
| **Forward** | First to last (left to right) | Standard reading order |
| **Backward** | Last to first (right to left) | Reverse reveal |
| **Center** | Middle outward | Dramatic emphasis |
| **Edges** | Outside inward | Converging effect |

## Configuration Settings

### Progress (0-100%)

The `progress` value controls how far through the animation the text is:

- **0%**: All characters in starting state (invisible/transformed)
- **50%**: Half the characters have completed their animation
- **100%**: All characters fully visible in final state

:::tip Keyframe Integration
The `progress` property can be keyframed in the timeline:

1. At 0% timeline position, set progress to `0`
2. At 100% timeline position, set progress to `100`
3. The character animation will sync with your timeline playback
:::

### Stagger (ms)

The delay between each character starting its animation.

- **Low values (10-30ms)**: Characters animate almost simultaneously
- **Medium values (50-100ms)**: Visible cascade effect
- **High values (150ms+)**: Typewriter-like appearance

### Duration (ms)

How long each individual character takes to complete its animation.

- **Short (200-400ms)**: Snappy, energetic
- **Medium (500-800ms)**: Smooth, professional
- **Long (1000ms+)**: Slow, dramatic

### Spread

Controls how many characters animate simultaneously.

- **Low (1-3)**: One character at a time (typewriter effect)
- **Medium (5-7)**: Small groups animate together
- **High (10+)**: Wave-like motion with many characters moving

### Easing

The acceleration curve for each character's animation:

- **ease-out**: Fast start, slow finish (recommended for reveals)
- **ease-in-out**: Smooth acceleration and deceleration
- **linear**: Constant speed
- **ease**: Default browser easing

## TypeScript Interface

```typescript
interface CharAnimationSettings {
  enabled: boolean;
  type: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale' | 'blur' | 'wave' | 'bounce';
  direction: 'forward' | 'backward' | 'center' | 'edges';
  stagger: number;      // Delay between characters (ms)
  duration: number;     // Duration per character (ms)
  easing: string;       // CSS easing function
  progress: number;     // Animation progress (0-100)
  spread: number;       // Characters animating simultaneously
}
```

## Examples

### News Lower Third Reveal

A professional left-to-right character reveal:

```typescript
{
  charAnimation: {
    enabled: true,
    type: 'slide-up',
    direction: 'forward',
    stagger: 30,
    duration: 400,
    easing: 'ease-out',
    spread: 3
  }
}
```

### Sports Score Announcement

Dramatic center-out scale animation:

```typescript
{
  charAnimation: {
    enabled: true,
    type: 'scale',
    direction: 'center',
    stagger: 50,
    duration: 500,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Bounce
    spread: 2
  }
}
```

### Breaking News Alert

Fast fade-in for urgent text:

```typescript
{
  charAnimation: {
    enabled: true,
    type: 'fade',
    direction: 'forward',
    stagger: 15,
    duration: 200,
    easing: 'ease-out',
    spread: 5
  }
}
```

### Credits Roll Name

Elegant blur reveal:

```typescript
{
  charAnimation: {
    enabled: true,
    type: 'blur',
    direction: 'forward',
    stagger: 40,
    duration: 600,
    easing: 'ease-in-out',
    spread: 4
  }
}
```

## Combining with Timeline

To create a complete animation sequence:

1. **In Phase**: Set keyframes to animate progress from 0 to 100
2. **Loop Phase**: Keep progress at 100 (text fully visible)
3. **Out Phase**: Optionally animate progress from 100 to 0 (reverse)

### Timeline Keyframe Example

```
In Phase (1000ms):
├── 0%: progress = 0 (characters hidden)
└── 100%: progress = 100 (characters visible)

Loop Phase:
└── progress = 100 (maintained)

Out Phase (500ms):
├── 0%: progress = 100
└── 100%: progress = 0 (characters hidden again)
```

## Best Practices

### Choose Appropriate Timing

- **Headlines**: Faster stagger (20-40ms), shorter duration
- **Body text**: Moderate stagger (40-60ms)
- **Dramatic reveals**: Slower stagger (80-120ms), longer duration

### Consider Reading Order

For Western languages (left-to-right):
- Use `forward` direction for natural reading flow
- Use `backward` for reverse/exit animations

### Match Your Content

| Content Type | Recommended Animation |
|--------------|----------------------|
| News headlines | Slide Up, Forward |
| Sports scores | Scale, Center |
| Breaking news | Fade, Forward (fast) |
| Entertainment | Wave, Bounce |
| Corporate | Fade, Forward (subtle) |
| Credits | Blur, Forward |

### Performance Considerations

- Character animation works best with shorter text (< 100 characters)
- Very long texts may benefit from simpler animations
- Test on target playback hardware

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Animation not playing | Ensure `enabled: true` and progress is animated |
| Characters not appearing | Check progress value (should be > 0) |
| Animation too fast/slow | Adjust stagger and duration values |
| Choppy animation | Reduce spread or simplify animation type |
| Text not re-splitting after edit | Text automatically re-splits after 500ms pause |

## Related Features

- [Text Element](/docs/elements/text) - Text element properties
- [Timeline](/docs/animation/timeline) - Keyframe animation
- [Keyframes](/docs/animation/keyframes) - Working with keyframes
- [Easing](/docs/animation/easing) - Animation easing functions
