---
sidebar_position: 15
---

# Lottie Element

The Lottie element displays Lottie animations - lightweight, scalable vector animations exported from After Effects.

## Overview

Lottie elements support:

- **JSON Animations**: Load Lottie JSON from URL
- **Auto-Playback**: Animations play automatically
- **Loop Control**: Single play or continuous loop
- **Scalable**: Vector animations at any size

## Creating a Lottie

1. Click **Lottie** in the Elements menu
2. Set the animation source URL in Properties panel
3. Configure playback options

## Properties

### Source Properties

| Property | Type | Description |
|----------|------|-------------|
| `src` | string | URL to Lottie JSON file |

### Playback Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `loop` | boolean | true | Loop animation continuously |

## Lottie Files

### What is Lottie?

Lottie is an animation format that renders After Effects animations in real-time. Animations are exported as JSON files using the Bodymovin plugin.

### File Sources

- **LottieFiles**: [lottiefiles.com](https://lottiefiles.com)
- **IconScout**: [iconscout.com/lottie](https://iconscout.com/lottie)
- **Custom**: Export from After Effects with Bodymovin

### File Format

Lottie files are JSON:

```json
{
  "v": "5.5.7",
  "fr": 30,
  "ip": 0,
  "op": 60,
  "w": 512,
  "h": 512,
  "assets": [],
  "layers": []
}
```

## Configuration

### Basic Setup

```typescript
{
  type: 'lottie',
  src: 'https://assets.lottiefiles.com/animation.json',
  loop: true
}
```

### Single Play

```typescript
{
  type: 'lottie',
  src: 'https://example.com/intro.json',
  loop: false
}
```

## Animation Properties

| Property | Description |
|----------|-------------|
| `opacity` | Fade animation in/out |
| `scale_x` | Scale horizontally |
| `scale_y` | Scale vertically |
| `rotation` | Rotate animation |
| `position_x` | Move horizontally |
| `position_y` | Move vertically |

## Use Cases

### Animated Icons

Replace static icons with animated versions:

```typescript
{
  type: 'lottie',
  src: 'https://lottiefiles.com/loading-spinner.json',
  loop: true,
  width: 48,
  height: 48
}
```

### Intro Animations

Play once animations for intros:

```typescript
{
  type: 'lottie',
  src: 'https://example.com/logo-reveal.json',
  loop: false
}
```

### Background Effects

Subtle animated backgrounds:

```typescript
{
  type: 'lottie',
  src: 'https://example.com/particles.json',
  loop: true,
  opacity: 0.3
}
```

### Loading States

Loading indicators:

```typescript
{
  type: 'lottie',
  src: 'https://lottiefiles.com/spinner.json',
  loop: true
}
```

### Celebrations

Victory or achievement animations:

```typescript
{
  type: 'lottie',
  src: 'https://example.com/confetti.json',
  loop: false
}
```

## Lottie vs Icon Element

| Feature | Lottie | Icon (Lottie mode) |
|---------|--------|-------------------|
| Source | Any Lottie URL | URL or inline |
| Loop control | Yes | Yes |
| Autoplay | Yes | Yes |
| Color override | No | Limited |
| Best for | Full animations | Simple animated icons |

Use Lottie Element for:
- Complex animations
- Multi-element animations
- Animated scenes

Use Icon Element (Lottie mode) for:
- Simple animated icons
- Consistent icon styling
- Quick insertion

## Performance

### Optimization

- **File Size**: Keep Lottie files small (< 100KB ideal)
- **Complexity**: Simpler animations perform better
- **Frame Rate**: 30fps is usually sufficient

### Best Practices

- Host files on fast CDN
- Preload important animations
- Use appropriate dimensions

## Finding Lottie Animations

### Free Resources

- **LottieFiles**: Large free library
- **Icons8**: Animated icons
- **Google Fonts**: Animated illustrations

### Creating Custom

1. Design in After Effects
2. Install Bodymovin plugin
3. Export as Lottie JSON
4. Host JSON file
5. Use URL in Nova GFX

## Examples

### Loading Spinner

```typescript
{
  type: 'lottie',
  src: 'https://assets.lottiefiles.com/packages/lf20_p8bfn5to.json',
  loop: true,
  width: 100,
  height: 100
}
```

### Success Checkmark

```typescript
{
  type: 'lottie',
  src: 'https://assets.lottiefiles.com/packages/lf20_success.json',
  loop: false,
  width: 120,
  height: 120
}
```

### Animated Background

```typescript
{
  type: 'lottie',
  src: 'https://example.com/wave-background.json',
  loop: true,
  width: 1920,
  height: 1080,
  opacity: 0.2
}
```

## Troubleshooting

### Animation Not Playing

- Check URL is accessible
- Verify JSON format is valid
- Check browser console for errors

### Poor Performance

- Reduce animation complexity
- Lower frame rate in source
- Simplify paths in After Effects

### Wrong Size

- Set explicit width/height
- Check source dimensions
- Use transform scale

## Best Practices

### File Management

- Host on reliable CDN
- Use versioned URLs
- Keep backups of animations

### Design

- Test at broadcast resolution
- Ensure animations are visible
- Don't overwhelm with motion

### Integration

- Time Lottie with template animations
- Use loop: false for intro sequences
- Combine with keyframe animations carefully
