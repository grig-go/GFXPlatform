---
sidebar_position: 4
---

# Shape Element

Shape elements create vector graphics like rectangles, circles, and custom paths.

## Creating Shapes

1. Press `S` or click the Shape button
2. Click and drag on canvas to draw
3. Hold `Shift` for proportional shapes

## Shape Types

### Rectangle

```typescript
{
  type: 'rectangle',
  width: number,
  height: number,
  borderRadius: number | [number, number, number, number]  // Individual corners
}
```

### Circle / Ellipse

```typescript
{
  type: 'ellipse',
  width: number,    // Horizontal diameter
  height: number    // Vertical diameter
}
```

### Polygon

```typescript
{
  type: 'polygon',
  sides: number,    // Number of sides (3 = triangle, 6 = hexagon)
  radius: number
}
```

### Star

```typescript
{
  type: 'star',
  points: number,       // Number of points
  outerRadius: number,
  innerRadius: number
}
```

### Line

```typescript
{
  type: 'line',
  points: [number, number][],  // Array of [x, y] coordinates
  closed: boolean              // Connect last to first point
}
```

## Style Properties

### Fill

```typescript
{
  fill: string;              // Solid color
  fillOpacity: number;       // 0-1
  // Or gradient:
  fill: {
    type: 'linear' | 'radial',
    stops: [
      { offset: 0, color: '#FF0000' },
      { offset: 1, color: '#0000FF' }
    ],
    angle: number  // For linear gradients
  }
}
```

### Stroke

```typescript
{
  stroke: string;            // Stroke color
  strokeWidth: number;       // Stroke thickness
  strokeOpacity: number;     // 0-1
  strokeDasharray: string;   // Dash pattern e.g., '5,5'
  strokeLinecap: 'butt' | 'round' | 'square';
  strokeLinejoin: 'miter' | 'round' | 'bevel';
}
```

### Shadow

```typescript
{
  shadow: {
    color: string,
    blur: number,
    offsetX: number,
    offsetY: number
  }
}
```

## Gradients

### Linear Gradient

```typescript
{
  gradient: {
    enabled: true,
    type: 'linear',
    direction: 90,  // 0-360 degrees
    colors: [
      { color: '#3B82F6', stop: 0 },
      { color: '#8B5CF6', stop: 50 },
      { color: '#EC4899', stop: 100 }
    ]
  }
}
```

### Radial Gradient

```typescript
{
  gradient: {
    enabled: true,
    type: 'radial',
    radialPosition: { x: 50, y: 50 },  // 0-100 percentage
    colors: [
      { color: '#FFFFFF', stop: 0 },
      { color: '#000000', stop: 100 }
    ]
  }
}
```

### Conic Gradient

```typescript
{
  gradient: {
    enabled: true,
    type: 'conic',
    direction: 0,  // Starting angle
    colors: [
      { color: '#FF0000', stop: 0 },
      { color: '#00FF00', stop: 50 },
      { color: '#0000FF', stop: 100 }
    ]
  }
}
```

## Advanced Effects

### Glassmorphism

Create frosted glass effects:

```typescript
{
  glass: {
    enabled: true,
    blur: 10,           // 0-50 pixels
    opacity: 0.8,       // 0-1
    borderWidth: 1,     // pixels
    borderColor: 'rgba(255,255,255,0.2)',
    saturation: 100     // 0-200%
  }
}
```

### Glow Effect

Add glowing edges:

```typescript
{
  glow: {
    enabled: true,
    color: '#3B82F6',   // Glow color
    blur: 20,           // 0-100 pixels
    spread: 0,          // -50 to 50 pixels
    intensity: 0.8      // 0-1
  }
}
```

### Texture Fill

Apply image textures to shapes:

```typescript
{
  texture: {
    enabled: true,
    url: 'https://example.com/texture.jpg',  // Texture image URL
    opacity: 0.8,        // 0-1 texture opacity
    scale: 1,            // Texture scale factor
    repeat: 'repeat',    // 'repeat', 'repeat-x', 'repeat-y', 'no-repeat'
    position: 'center',  // CSS background-position value
    blendMode: 'normal'  // CSS blend mode
  }
}
```

#### Organization Textures

Your organization can upload shared textures:
1. Go to Organization Settings
2. Upload texture images to the texture library
3. Select from library when configuring shape textures

:::tip Texture Use Cases
- Carbon fiber patterns for sports graphics
- Paper textures for vintage looks
- Noise/grain for subtle depth
- Geometric patterns for backgrounds
:::

## Screen Masking

Elements can use a **Screen Mask** to show only where a designated shape is visible. This is useful for reveal effects and complex compositions.

### Enabling Screen Mask

1. Select an element (image, video, group, etc.)
2. In the Properties panel, find **Screen Mask**
3. Select a shape element from the dropdown

### How It Works

```typescript
{
  screenMask: 'shape-element-id'  // ID of the masking shape
}
```

The masked element will only be visible where the mask shape has pixels. The mask shape:
- Uses its position, size, and rotation
- Respects animations (animate the mask to reveal content)
- Can be any shape type (rectangle, ellipse, custom)

### Animated Masks

Create reveal effects by animating the mask shape:

1. Create a rectangle shape as the mask
2. Assign it as the screenMask for your content
3. Animate the mask's width from 0 to full width
4. Content reveals as the mask expands

### Use Cases

- **Wipe transitions**: Rectangular mask expanding
- **Circular reveals**: Ellipse mask scaling from center
- **Complex reveals**: Custom shape masks for creative effects
- **Text reveals**: Mask animated text for dramatic entrances

## Shape Types

Nova GFX supports multiple shape types:

| Shape | Description |
|-------|-------------|
| `rectangle` | Standard rectangle with corner radius |
| `rhombus` | Diamond/rotated square |
| `trapezoid` | Four-sided with two parallel sides |
| `parallelogram` | Slanted rectangle |

## Common Use Cases

### Lower Third Background

```typescript
{
  type: 'rectangle',
  width: 600,
  height: 80,
  fill: {
    type: 'linear',
    angle: 90,
    stops: [
      { offset: 0, color: 'rgba(0,0,0,0.8)' },
      { offset: 1, color: 'rgba(0,0,0,0.6)' }
    ]
  },
  borderRadius: [0, 8, 8, 0]
}
```

### Accent Line

```typescript
{
  type: 'rectangle',
  width: 4,
  height: 60,
  fill: '#3B82F6'
}
```

### Bug Background

```typescript
{
  type: 'rectangle',
  width: 200,
  height: 60,
  fill: '#1E1E1E',
  borderRadius: 8,
  stroke: '#3B82F6',
  strokeWidth: 2
}
```

## Animation

### Animatable Properties

| Property | Effect |
|----------|--------|
| `width`, `height` | Resize |
| `fill` | Color change |
| `fillOpacity` | Fade |
| `stroke`, `strokeWidth` | Border animation |
| `borderRadius` | Corner morphing |
| `rotation` | Spin |
| `scale` | Grow/shrink |

### Shape Morphing

Animate between shapes by changing:
- `borderRadius` (rectangle to circle)
- `width` / `height` ratios
- `points` array for custom paths

### Wipe Animation

Use shapes as animated masks:
1. Create a rectangle covering content
2. Animate `width` from 0 to full
3. Use as clipping mask

## Fit to Content

Shapes can automatically resize to fit their child elements (like text). This is useful for creating dynamic backgrounds that adjust to text length.

### Enabling Fit to Content

1. Select a shape element
2. Go to the **Layout** tab in the Properties panel
3. Enable **Fit to Children**
4. Adjust padding for each side (top, right, bottom, left)

### How It Works

When enabled, the shape will:
- Measure the actual bounds of child text elements (not the text box, but the rendered characters)
- Resize to fit all children with the specified padding
- Update automatically when child content changes

### Configuration

```typescript
{
  content: {
    type: 'shape',
    shape: 'rectangle',
    fill: '#3B82F6',
    fitToContent: true,
    fitPadding: {
      top: 16,
      right: 24,
      bottom: 16,
      left: 24
    }
  }
}
```

### Adding Children to Shapes

To make a text element a child of a shape:
1. Open the **Elements** tab in the Outliner
2. Drag the text element onto the shape
3. Drop it when you see the purple highlight indicating "inside"

The shape will expand to show a chevron, and the text will be indented underneath.

### Use Cases

- **Dynamic lower thirds**: Background shapes that resize based on name/title length
- **Buttons**: Auto-sizing button backgrounds
- **Labels**: Tags that fit their content
- **Score bugs**: Backgrounds that adapt to team names

### Best Practices

- Set text vertical alignment to "top" for predictable positioning
- Use consistent padding values across similar elements
- The shape position adjusts to keep children within the padded area

## Best Practices

### Performance
- Use simple shapes when possible
- Avoid complex gradients on many elements
- Minimize shadow blur radius

### Design
- Use shapes for structure and hierarchy
- Consistent border radius across design
- Match stroke widths throughout

### Organization
- Name shapes by purpose ("Background", "Accent Bar")
- Group shapes with related content
- Use consistent layer ordering
