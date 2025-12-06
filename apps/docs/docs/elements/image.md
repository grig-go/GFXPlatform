---
sidebar_position: 3
---

# Image Element

Image elements display static images, animated GIFs, and video content.

## Creating Images

1. Press `I` or click the Image button
2. Click on canvas to place
3. Select an image from the media library

## Content Properties

```typescript
{
  src: string;              // Image URL or data URI
  alt?: string;             // Alternative text
  objectFit: 'contain' | 'cover' | 'fill' | 'none';
  objectPosition: string;   // e.g., 'center', 'top left'
}
```

### Object Fit Modes

| Mode | Description |
|------|-------------|
| `contain` | Fit entire image within bounds (may letterbox) |
| `cover` | Fill bounds completely (may crop) |
| `fill` | Stretch to fill (may distort) |
| `none` | Display at natural size |

## Supported Formats

| Format | Extension | Best For |
|--------|-----------|----------|
| PNG | .png | Logos, graphics with transparency |
| JPEG | .jpg, .jpeg | Photos, complex images |
| GIF | .gif | Simple animations |
| WebP | .webp | Modern efficient format |
| SVG | .svg | Vector graphics, icons |

## Style Properties

### Border & Radius

```typescript
{
  borderRadius: number;     // Corner radius in pixels
  borderWidth: number;      // Border thickness
  borderColor: string;      // Border color
}
```

### Effects

```typescript
{
  shadow: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  filter: string;           // CSS filter string
}
```

### Blend Modes

| Mode | Effect |
|------|--------|
| `normal` | No blending |
| `multiply` | Darken |
| `screen` | Lighten |
| `overlay` | Contrast |
| `color-dodge` | Brighten |

## Media Library

### Uploading Images

1. Open the Media Library
2. Drag and drop files or click to browse
3. Images are automatically optimized

### Organization

- Create folders for different projects
- Tag images for easy searching
- Use descriptive file names

### Image Optimization

Images are automatically:
- Resized to appropriate dimensions
- Compressed for performance
- Converted to efficient formats

## Dynamic Images

### Content Fields

Make images editable at playout time:
1. Enable "Editable" in properties
2. Set a field name
3. Edit in Pulsar GFX

### Data Binding

Bind image source to data:

```typescript
{
  dataBinding: {
    source: 'api',
    path: 'player.avatar',
    fallback: '/images/default-avatar.png'
  }
}
```

## Animation

### Animatable Properties

| Property | Effect |
|----------|--------|
| `opacity` | Fade in/out |
| `scale` | Grow/shrink |
| `x`, `y` | Slide |
| `rotation` | Spin |
| `borderRadius` | Morph corners |

### Common Animations

#### Fade In
```typescript
// Start keyframe
{ opacity: 0 }
// End keyframe
{ opacity: 1 }
```

#### Scale Pop
```typescript
// Start keyframe
{ scale: 0.5, opacity: 0 }
// End keyframe
{ scale: 1, opacity: 1 }
```

#### Ken Burns Effect
```typescript
// Animate scale and position over time
{ scale: 1, x: 0, y: 0 }
// After 10 seconds
{ scale: 1.2, x: -50, y: -30 }
```

## Best Practices

### Image Preparation

- Export at 2x resolution for crisp display
- Use PNG for graphics with transparency
- Use JPEG for photos (80-90% quality)
- Optimize file sizes before upload

### Performance

- Keep image dimensions reasonable
- Avoid very large images (> 4000px)
- Use appropriate formats
- Consider lazy loading for off-screen images

### Design

- Maintain consistent aspect ratios
- Use masks/clips for complex shapes
- Consider how images will animate
