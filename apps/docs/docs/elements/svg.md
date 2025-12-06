---
sidebar_position: 11
---

# SVG Element

The SVG element displays Scalable Vector Graphics from URLs, inline markup, or decorative patterns.

## Overview

SVG elements support:

- **External SVGs**: Load from URL
- **Inline SVGs**: Direct SVG markup
- **Hero Patterns**: Decorative pattern library
- **Color Customization**: Override SVG colors

## Creating an SVG

1. Click the **SVG** option in Elements menu
2. Set source (URL or inline) in Properties panel
3. Adjust size and position as needed

## Properties

### Source Properties

| Property | Type | Description |
|----------|------|-------------|
| `src` | string | URL to external SVG file |
| `svgContent` | string | Inline SVG markup |

Use either `src` OR `svgContent`, not both.

### Dimension Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | number | auto | Width in pixels |
| `height` | number | auto | Height in pixels |
| `preserveAspectRatio` | string | `xMidYMid meet` | SVG scaling behavior |

### Pattern Properties

| Property | Type | Description |
|----------|------|-------------|
| `pattern.type` | string | `hero-pattern` or `custom` |
| `pattern.patternName` | string | Hero pattern name |
| `pattern.customPattern` | string | Custom pattern SVG |
| `pattern.color` | string | Pattern color |
| `pattern.opacity` | number | Pattern opacity (0-1) |

## Loading Methods

### External URL

Load SVG from a URL:

```typescript
{
  type: 'svg',
  src: 'https://example.com/logo.svg'
}
```

Supported URLs:
- Direct SVG file links
- CDN hosted SVGs
- Supabase storage URLs

### Inline SVG

Embed SVG markup directly:

```typescript
{
  type: 'svg',
  svgContent: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="currentColor"/></svg>'
}
```

Benefits:
- No network request
- Instant rendering
- Full control over markup

### Hero Patterns

Use decorative background patterns:

```typescript
{
  type: 'svg',
  pattern: {
    type: 'hero-pattern',
    patternName: 'topography',
    color: '#3B82F6',
    opacity: 0.5
  }
}
```

Available patterns include:
- topography
- circuit-board
- diagonal-lines
- plus
- squares
- and many more

## Preserve Aspect Ratio

Control how SVG scales within its container:

| Value | Align | Meet/Slice |
|-------|-------|------------|
| `xMidYMid meet` | Center | Fit inside |
| `xMidYMid slice` | Center | Cover container |
| `xMinYMin meet` | Top-left | Fit inside |
| `none` | - | Stretch to fill |

### Examples

```
xMidYMid meet   - Center, fit entirely (letterbox)
xMidYMid slice  - Center, fill entirely (crop)
none            - Stretch to container size
```

## Color Customization

### Using currentColor

SVGs using `currentColor` inherit the element's color:

```svg
<svg>
  <path fill="currentColor" d="..." />
</svg>
```

Then set color in Nova GFX:

```typescript
styles: {
  color: '#FF5733'
}
```

### Direct Color Override

For inline SVGs, modify fill/stroke directly:

```typescript
{
  type: 'svg',
  svgContent: '<svg><rect fill="#3B82F6" /></svg>'
}
```

## Animation Properties

| Property | Description |
|----------|-------------|
| `opacity` | Fade SVG in/out |
| `scale_x` | Scale horizontally |
| `scale_y` | Scale vertically |
| `rotation` | Rotate SVG |
| `position_x` | Move horizontally |
| `position_y` | Move vertically |

## Use Cases

### Logos

Display vector logos at any size:

```typescript
{
  type: 'svg',
  src: 'https://brand.com/logo.svg',
  width: 200,
  height: 50
}
```

### Icons

Custom icons beyond the Icon element:

```typescript
{
  type: 'svg',
  svgContent: '<svg viewBox="0 0 24 24">...</svg>',
  width: 48,
  height: 48
}
```

### Decorative Backgrounds

Hero pattern backgrounds:

```typescript
{
  type: 'svg',
  pattern: {
    type: 'hero-pattern',
    patternName: 'circuit-board',
    color: '#1E40AF',
    opacity: 0.1
  }
}
```

### Custom Graphics

Complex vector artwork:

```typescript
{
  type: 'svg',
  src: 'https://example.com/illustration.svg'
}
```

## Examples

### Animated Logo

```typescript
{
  type: 'svg',
  src: 'https://brand.com/animated-logo.svg'
}

// Some SVGs contain SMIL animations that play automatically
```

### Pattern Background

```typescript
{
  type: 'svg',
  pattern: {
    type: 'hero-pattern',
    patternName: 'topography',
    color: '#8B5CF6',
    opacity: 0.3
  }
}
```

### Inline Icon

```typescript
{
  type: 'svg',
  svgContent: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  `
}
```

## Best Practices

### File Size

- Keep SVGs optimized (use SVGO)
- Remove unnecessary metadata
- Simplify paths when possible

### Accessibility

- Include `<title>` in SVGs for screen readers
- Use descriptive file names
- Add alt text via element name

### Cross-Browser

- Use standard SVG features
- Test in multiple browsers
- Avoid SVG filters for critical graphics

### Performance

- Prefer external URLs for large SVGs (caching)
- Use inline for small, frequently used SVGs
- Limit pattern complexity

## SVG vs Icon Element

| Feature | SVG Element | Icon Element |
|---------|-------------|--------------|
| Source | Any SVG | Icon libraries |
| Size control | Full | Size property |
| Color | currentColor/direct | Color property |
| Patterns | Yes | No |
| Complexity | Any | Simple icons |

Use SVG Element for:
- Custom logos
- Complex illustrations
- Decorative patterns
- Animated SVGs

Use Icon Element for:
- Standard icons (Lucide, FontAwesome)
- Simple, uniform icons
- Quick icon insertion
