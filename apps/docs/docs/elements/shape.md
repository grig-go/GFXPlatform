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
  fill: {
    type: 'linear',
    angle: 90,  // 0 = left to right, 90 = top to bottom
    stops: [
      { offset: 0, color: '#3B82F6' },
      { offset: 0.5, color: '#8B5CF6' },
      { offset: 1, color: '#EC4899' }
    ]
  }
}
```

### Radial Gradient

```typescript
{
  fill: {
    type: 'radial',
    centerX: 0.5,  // 0-1 relative position
    centerY: 0.5,
    radius: 0.5,
    stops: [
      { offset: 0, color: '#FFFFFF' },
      { offset: 1, color: '#000000' }
    ]
  }
}
```

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
