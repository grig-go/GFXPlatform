---
sidebar_position: 2
---

# Text Element

Text elements display formatted text with rich styling options.

## Creating Text

1. Press `T` or click the Text button
2. Click on canvas to place
3. Start typing immediately

## Content Properties

### Text Content

```typescript
{
  text: string;           // The actual text content
  placeholder?: string;   // Shown when text is empty
}
```

### Text Wrapping

| Mode | Description |
|------|-------------|
| `none` | Single line, no wrapping |
| `word` | Wrap at word boundaries |
| `character` | Wrap at any character |

## Style Properties

### Font

```typescript
{
  fontFamily: string;     // Font family name
  fontSize: number;       // Size in pixels
  fontWeight: number;     // 100-900 (400 = normal, 700 = bold)
  fontStyle: 'normal' | 'italic';
  letterSpacing: number;  // Letter spacing in pixels
  lineHeight: number;     // Line height multiplier
}
```

### Color & Fill

```typescript
{
  fill: string;           // Text color (hex, rgb, rgba)
  fillOpacity: number;    // Fill transparency (0-1)
}
```

### Alignment

**Horizontal:**
- `left` - Align to left edge
- `center` - Center horizontally
- `right` - Align to right edge
- `justify` - Stretch to fill width

**Vertical:**
- `top` - Align to top
- `middle` - Center vertically
- `bottom` - Align to bottom

### Text Effects

#### Stroke (Outline)

```typescript
{
  stroke: string;         // Stroke color
  strokeWidth: number;    // Stroke width in pixels
}
```

#### Shadow

```typescript
{
  shadow: {
    color: string;        // Shadow color
    blur: number;         // Blur radius
    offsetX: number;      // Horizontal offset
    offsetY: number;      // Vertical offset
  }
}
```

#### Background

```typescript
{
  backgroundColor: string;   // Background color
  backgroundPadding: number; // Padding around text
  backgroundRadius: number;  // Corner radius
}
```

## Text Styling Presets

Common text styles for broadcast:

### Lower Third Name
```typescript
{
  fontSize: 48,
  fontWeight: 700,
  fill: '#FFFFFF',
  shadow: { color: '#000000', blur: 4, offsetX: 2, offsetY: 2 }
}
```

### Lower Third Title
```typescript
{
  fontSize: 32,
  fontWeight: 400,
  fill: '#CCCCCC',
  letterSpacing: 1
}
```

### Score Display
```typescript
{
  fontSize: 72,
  fontWeight: 700,
  fontFamily: 'monospace',
  fill: '#FFFFFF',
  textAlign: 'center'
}
```

## Dynamic Content

### Content Fields

Mark text as editable for Pulsar GFX:
1. Select the text element
2. Enable "Editable" in properties
3. Set a field name

The text content becomes a content field that can be edited at playout time.

### Data Binding

Bind text to data sources:

```typescript
{
  dataBinding: {
    source: 'api',
    path: 'score.home',
    format: '{{value}}'
  }
}
```

## Animation

### Common Text Animations

#### Fade In
- Start: `opacity: 0`
- End: `opacity: 1`

#### Slide In
- Start: `x: -200` (off-screen left)
- End: `x: 100` (final position)

#### Scale In
- Start: `scale: 0`
- End: `scale: 1`

#### Typewriter Effect
- Animate `text` property character by character
- Use custom animation library

### Animatable Properties

| Property | Interpolation |
|----------|---------------|
| `x`, `y` | Linear |
| `opacity` | Linear |
| `scale` | Linear |
| `rotation` | Linear |
| `fontSize` | Linear |
| `letterSpacing` | Linear |
| `fill` | Color interpolation |

## Best Practices

### Font Selection
- Use web-safe fonts or embed custom fonts
- Limit to 2-3 fonts per project
- Ensure readability at broadcast size

### Text Sizing
- Minimum 24px for on-screen text
- Consider viewing distance
- Test on target display

### Contrast
- Ensure sufficient contrast with background
- Use shadows/outlines for visibility
- Test with various backgrounds

### Performance
- Avoid excessive text effects
- Limit shadow blur radius
- Pre-render complex text when possible
