---
sidebar_position: 5
---

# Animation Presets

Animation presets are pre-configured animations that can be quickly applied to elements.

## Built-in Presets

### Entrance Presets (IN)

#### Fade In
```typescript
{
  name: 'fadeIn',
  keyframes: [
    { position: 0, properties: { opacity: 0 } },
    { position: 1, properties: { opacity: 1 } }
  ],
  duration: 500,
  easing: 'ease-out'
}
```

#### Slide In Left
```typescript
{
  name: 'slideInLeft',
  keyframes: [
    { position: 0, properties: { x: -200, opacity: 0 } },
    { position: 1, properties: { x: 0, opacity: 1 } }
  ],
  duration: 500,
  easing: 'ease-out'
}
```

#### Slide In Right
```typescript
{
  name: 'slideInRight',
  keyframes: [
    { position: 0, properties: { x: 200, opacity: 0 } },
    { position: 1, properties: { x: 0, opacity: 1 } }
  ],
  duration: 500,
  easing: 'ease-out'
}
```

#### Slide In Up
```typescript
{
  name: 'slideInUp',
  keyframes: [
    { position: 0, properties: { y: 100, opacity: 0 } },
    { position: 1, properties: { y: 0, opacity: 1 } }
  ],
  duration: 500,
  easing: 'ease-out'
}
```

#### Slide In Down
```typescript
{
  name: 'slideInDown',
  keyframes: [
    { position: 0, properties: { y: -100, opacity: 0 } },
    { position: 1, properties: { y: 0, opacity: 1 } }
  ],
  duration: 500,
  easing: 'ease-out'
}
```

#### Scale In
```typescript
{
  name: 'scaleIn',
  keyframes: [
    { position: 0, properties: { scale: 0, opacity: 0 } },
    { position: 1, properties: { scale: 1, opacity: 1 } }
  ],
  duration: 400,
  easing: 'ease-out-back'
}
```

#### Pop In
```typescript
{
  name: 'popIn',
  keyframes: [
    { position: 0, properties: { scale: 0.5, opacity: 0 } },
    { position: 0.7, properties: { scale: 1.1, opacity: 1 } },
    { position: 1, properties: { scale: 1, opacity: 1 } }
  ],
  duration: 500,
  easing: 'ease-out'
}
```

### Exit Presets (OUT)

#### Fade Out
```typescript
{
  name: 'fadeOut',
  keyframes: [
    { position: 0, properties: { opacity: 1 } },
    { position: 1, properties: { opacity: 0 } }
  ],
  duration: 300,
  easing: 'ease-in'
}
```

#### Slide Out Left
```typescript
{
  name: 'slideOutLeft',
  keyframes: [
    { position: 0, properties: { x: 0, opacity: 1 } },
    { position: 1, properties: { x: -200, opacity: 0 } }
  ],
  duration: 400,
  easing: 'ease-in'
}
```

#### Slide Out Right
```typescript
{
  name: 'slideOutRight',
  keyframes: [
    { position: 0, properties: { x: 0, opacity: 1 } },
    { position: 1, properties: { x: 200, opacity: 0 } }
  ],
  duration: 400,
  easing: 'ease-in'
}
```

#### Scale Out
```typescript
{
  name: 'scaleOut',
  keyframes: [
    { position: 0, properties: { scale: 1, opacity: 1 } },
    { position: 1, properties: { scale: 0, opacity: 0 } }
  ],
  duration: 300,
  easing: 'ease-in'
}
```

### Loop Presets

#### Pulse
```typescript
{
  name: 'pulse',
  keyframes: [
    { position: 0, properties: { scale: 1 } },
    { position: 0.5, properties: { scale: 1.05 } },
    { position: 1, properties: { scale: 1 } }
  ],
  duration: 1000,
  easing: 'ease-in-out-sine',
  iterations: 0  // Infinite
}
```

#### Glow
```typescript
{
  name: 'glow',
  keyframes: [
    { position: 0, properties: { opacity: 0.8 } },
    { position: 0.5, properties: { opacity: 1 } },
    { position: 1, properties: { opacity: 0.8 } }
  ],
  duration: 2000,
  easing: 'ease-in-out-sine',
  iterations: 0
}
```

#### Float
```typescript
{
  name: 'float',
  keyframes: [
    { position: 0, properties: { y: 0 } },
    { position: 0.5, properties: { y: -10 } },
    { position: 1, properties: { y: 0 } }
  ],
  duration: 3000,
  easing: 'ease-in-out-sine',
  iterations: 0
}
```

#### Rotate
```typescript
{
  name: 'rotate',
  keyframes: [
    { position: 0, properties: { rotation: 0 } },
    { position: 1, properties: { rotation: 360 } }
  ],
  duration: 2000,
  easing: 'linear',
  iterations: 0
}
```

## Applying Presets

### Via Properties Panel

1. Select element
2. Open Animation section
3. Click "Apply Preset"
4. Choose from preset library

### Via Right-Click

1. Right-click on element
2. Animation → Apply Preset
3. Select preset

### Via Keyboard

- Quick apply: Select element, press `A` to open preset picker

## Customizing Presets

### After Applying

Presets can be modified after applying:

1. Apply preset
2. Edit keyframe timing
3. Adjust property values
4. Change easing functions

### Creating Custom Presets

1. Create animation manually
2. Select animation
3. Click "Save as Preset"
4. Name your preset

```typescript
// Custom preset example
{
  name: 'mySlideIn',
  keyframes: [
    { position: 0, properties: { x: -300, opacity: 0, rotation: -15 } },
    { position: 1, properties: { x: 0, opacity: 1, rotation: 0 } }
  ],
  duration: 600,
  easing: 'ease-out-back'
}
```

## Preset Categories

### By Use Case

| Category | Presets |
|----------|---------|
| Lower Thirds | slideInLeft, slideOutLeft, fadeIn, fadeOut |
| Full Screen | scaleIn, scaleOut, fadeIn, fadeOut |
| Alerts | popIn, slideOutUp, pulse |
| Bugs | fadeIn, fadeOut, pulse |

### By Motion Type

| Type | Presets |
|------|---------|
| Sliding | slideIn/Out Left/Right/Up/Down |
| Scaling | scaleIn, scaleOut, popIn |
| Fading | fadeIn, fadeOut |
| Looping | pulse, glow, float, rotate |

## Preset Parameters

### Duration Override

Apply preset with custom duration:

```typescript
applyPreset('slideInLeft', { duration: 800 })
```

### Property Overrides

Modify specific values:

```typescript
applyPreset('slideInLeft', {
  overrides: {
    x: -500  // Slide from further left
  }
})
```

### Easing Override

```typescript
applyPreset('slideInLeft', { easing: 'ease-out-expo' })
```

## Best Practices

### Consistency

- Use the same presets for similar elements
- Create project-specific preset library
- Document custom presets

### Performance

- Simpler presets perform better
- Avoid complex loops on many elements
- Test with full template

### Appropriateness

- Match preset energy to content
- Use subtle presets for professional content
- Reserve dramatic presets for emphasis

### Organization

- Name presets descriptively
- Group by category
- Version custom presets

## Common Preset Combinations

### Lower Third

```
IN: slideInLeft (0.5s)
LOOP: subtle pulse (optional)
OUT: slideOutLeft (0.3s)
```

### Full Screen Graphic

```
IN: fadeIn with scaleIn (0.8s)
LOOP: none (static)
OUT: fadeOut (0.4s)
```

### Alert/Notification

```
IN: popIn (0.4s)
LOOP: glow (continuous)
OUT: fadeOut (0.2s)
```

### Score Bug

```
IN: slideInDown (0.4s)
LOOP: none
OUT: slideOutUp (0.3s)
```
