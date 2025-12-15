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

### Max Size Mode

When **Max Size** is enabled, text will not wrap. Instead, it will scale down horizontally and/or vertically to fit within the element's bounding box.

```typescript
{
  maxSize: boolean;  // Enable max size scaling mode
}
```

**How it works:**
1. Text is rendered without wrapping (`white-space: nowrap`)
2. The natural text width and height are measured
3. Scale factors are calculated to fit within the container
4. The text is scaled down (never up) to fit

:::tip Use Cases
Max Size is ideal for:
- Score displays that need to fit varying number lengths
- Names or titles that may vary in length
- Any text that should shrink to fit rather than wrap
:::

**Example:**
```typescript
{
  text: "CHAMPIONSHIP",
  maxSize: true,
  // Text will scale horizontally to fit container width
  // if the text is wider than the element
}
```

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
- `top` - Align to top (default for new text elements)
- `middle` - Center vertically
- `bottom` - Align to bottom

:::tip
New text elements default to `top` vertical alignment for better compatibility with the [Fit to Content](/docs/elements/shape#fit-to-content) feature on shapes.
:::

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

## Character Animation

Nova GFX includes a powerful character-level animation system powered by [Splitting.js](https://splitting.js.org/). This allows you to animate text on a per-character basis for dynamic reveals and effects.

### Enabling Character Animation

1. Select a text element
2. In the Properties panel, find **Character Animation**
3. Toggle **Enable Character Animation**

### Animation Types

| Type | Description |
|------|-------------|
| `fade` | Characters fade in from transparent |
| `slide-up` | Characters slide up from below |
| `slide-down` | Characters slide down from above |
| `slide-left` | Characters slide in from the right |
| `slide-right` | Characters slide in from the left |
| `scale` | Characters scale up from small to full size |
| `blur` | Characters transition from blurred to sharp |
| `wave` | Characters animate in a wave motion |
| `bounce` | Characters bounce into place |

### Animation Direction

Control the order in which characters animate:

| Direction | Description |
|-----------|-------------|
| `forward` | First character to last (left to right) |
| `backward` | Last character to first (right to left) |
| `center` | Middle characters first, expanding outward |
| `edges` | Outer characters first, converging to center |

### Animation Settings

```typescript
{
  charAnimation: {
    enabled: boolean;        // Enable/disable character animation
    type: string;            // Animation type (fade, slide-up, etc.)
    direction: string;       // Animation direction
    stagger: number;         // Delay between characters (ms)
    duration: number;        // Duration per character (ms)
    easing: string;          // CSS easing function
    progress: number;        // Animation progress (0-100%)
    spread: number;          // How many characters animate simultaneously
  }
}
```

### Progress Control

The `progress` property (0-100%) controls how much of the animation has completed:

- **0%**: All characters in their starting state (e.g., invisible for fade)
- **50%**: Half of the characters have animated in
- **100%**: All characters fully visible in final state

:::tip Keyframe Animation
You can keyframe the `progress` property to control character animation timing:

1. Add a keyframe at position 0% with `progress: 0`
2. Add a keyframe at position 100% with `progress: 100`
3. The characters will animate in sync with your timeline
:::

### Spread Setting

The `spread` value controls how many characters are animating simultaneously:

- **Low spread (1-3)**: Characters animate one at a time for a typewriter effect
- **High spread (5-10)**: Multiple characters animate together for a wave effect

### Example: News Lower Third

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

This creates a smooth left-to-right reveal with characters sliding up into position.

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
