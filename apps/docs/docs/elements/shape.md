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
