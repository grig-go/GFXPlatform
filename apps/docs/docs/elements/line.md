---
sidebar_position: 9
---

# Line Element

The Line element creates vector lines, connectors, and paths with customizable styling including arrows, dashes, and multi-point paths.

## Overview

Lines are SVG-based vector elements that support:

- **Multi-Point Paths**: Create straight lines or multi-segment paths
- **Arrow Endpoints**: Add arrows, triangles, circles, or squares
- **Dash Patterns**: Create dashed or dotted lines
- **Line Styling**: Customize thickness, color, and cap styles

## Creating a Line

1. Click the **Line** tool in the toolbar
2. Click and drag on canvas to draw
3. Release to create line

Or add via the Elements menu.

## Properties

### Basic Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `points` | Point[] | [(0,1), (200,1)] | Array of x,y coordinates |
| `stroke` | string | `#FFFFFF` | Line color |
| `strokeWidth` | number | 2 | Line thickness in pixels |
| `opacity` | number | 1 | Transparency (0-1) |

### Line Style

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `strokeLinecap` | string | `round` | Line end style |
| `strokeLinejoin` | string | `round` | Corner style |
| `strokeDasharray` | string | - | Dash pattern |
| `strokeDashoffset` | number | 0 | Dash offset |

#### Linecap Options

| Value | Description |
|-------|-------------|
| `butt` | Flat end at exact endpoint |
| `round` | Rounded end extending past endpoint |
| `square` | Square end extending past endpoint |

#### Linejoin Options

| Value | Description |
|-------|-------------|
| `miter` | Sharp corner |
| `round` | Rounded corner |
| `bevel` | Flat corner |

### Arrow Endpoints

Both start and end points can have arrows:

```typescript
arrowStart: {
  enabled: boolean;
  type: 'none' | 'arrow' | 'triangle' | 'circle' | 'square';
  size: number;       // pixels
  color: string;      // defaults to stroke color
}

arrowEnd: {
  // Same properties as arrowStart
}
```

#### Arrow Types

| Type | Description |
|------|-------------|
| `none` | No arrow |
| `arrow` | Standard arrow head |
| `triangle` | Filled triangle |
| `circle` | Filled circle |
| `square` | Filled square |

## Dash Patterns

Create dashed or dotted lines using `strokeDasharray`:

| Pattern | Result |
|---------|--------|
| `5,5` | Dashed (5px dash, 5px gap) |
| `10,5` | Long dash, short gap |
| `2,2` | Dotted |
| `10,5,2,5` | Dash-dot pattern |

### Animated Dashes

Animate `strokeDashoffset` to create moving dashes:

```
Keyframe 1: strokeDashoffset = 0
Keyframe 2: strokeDashoffset = 100
```

## Multi-Point Paths

Lines support multiple points for complex paths:

```typescript
points: [
  { x: 0, y: 0 },
  { x: 100, y: 50 },
  { x: 200, y: 0 }
]
```

### Adding Points

1. Select the line
2. Double-click on the line to add a point
3. Drag points to reposition

### Removing Points

1. Select a point
2. Press Delete to remove

## Animation Properties

| Property | Description |
|----------|-------------|
| `opacity` | Fade line in/out |
| `stroke` | Animate color |
| `strokeDashoffset` | Animate dash movement |
| `rotation` | Rotate entire line |

## Use Cases

### Connectors

Connect related elements:

```
┌─────────┐          ┌─────────┐
│  Box A  │────────▶│  Box B  │
└─────────┘          └─────────┘
```

### Dividers

Separate content areas:

```
Title
──────────────────────
Content below
```

### Decorative Lines

Add visual interest with styled lines:

- Dashed borders
- Animated progress lines
- Directional arrows

### Data Visualization

- Axis lines for charts
- Trend lines
- Connection paths

## Examples

### Simple Arrow

```typescript
{
  type: 'line',
  points: [{ x: 0, y: 0 }, { x: 200, y: 0 }],
  stroke: '#FFFFFF',
  strokeWidth: 2,
  arrowEnd: {
    enabled: true,
    type: 'arrow',
    size: 10
  }
}
```

### Dashed Divider

```typescript
{
  type: 'line',
  points: [{ x: 0, y: 0 }, { x: 400, y: 0 }],
  stroke: '#666666',
  strokeWidth: 1,
  strokeDasharray: '10,5',
  strokeLinecap: 'round'
}
```

### Animated Path

```typescript
{
  type: 'line',
  points: [
    { x: 0, y: 50 },
    { x: 100, y: 0 },
    { x: 200, y: 50 }
  ],
  stroke: '#3B82F6',
  strokeWidth: 3,
  strokeDasharray: '20,10'
}

// Animate strokeDashoffset from 0 to 60
```

## Best Practices

### Visual Clarity

- Use sufficient stroke width for visibility
- Contrast line color with background
- Keep arrow sizes proportional to line weight

### Performance

- Minimize number of points in paths
- Use simple dash patterns
- Avoid excessive animation complexity

### Accessibility

- Ensure sufficient contrast
- Don't rely solely on lines to convey information
- Consider color blindness in color choices
