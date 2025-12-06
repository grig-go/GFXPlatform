---
sidebar_position: 8
---

# Icon Element

Icon elements display vector icons from the Lucide icon library.

## Creating Icons

1. Click the Icon button in the toolbar
2. Click on canvas to place
3. Select an icon from the picker

## Content Properties

```typescript
{
  iconName: string;         // Lucide icon name (e.g., 'Star', 'Heart')
  iconLibrary: string;      // Icon library (default: 'lucide')
}
```

## Available Icons

Nova GFX uses the [Lucide](https://lucide.dev) icon library, which includes 1000+ icons:

### Common Categories

| Category | Examples |
|----------|----------|
| Arrows | `ArrowUp`, `ArrowRight`, `ChevronDown` |
| Media | `Play`, `Pause`, `Volume2`, `Mic` |
| Social | `Twitter`, `Facebook`, `Instagram` |
| Actions | `Check`, `X`, `Plus`, `Minus` |
| Objects | `Star`, `Heart`, `Clock`, `Calendar` |
| Weather | `Sun`, `Cloud`, `CloudRain`, `Snowflake` |
| Sports | `Trophy`, `Medal`, `Target` |

### Searching Icons

Use the icon picker search to find icons:
- Search by name: "arrow", "check", "user"
- Browse categories
- View recently used

## Style Properties

### Size

```typescript
{
  width: number;    // Icon width
  height: number;   // Icon height (usually same as width)
}
```

### Color

```typescript
{
  fill: string;         // Icon color
  fillOpacity: number;  // Transparency (0-1)
}
```

### Stroke

```typescript
{
  stroke: string;       // Stroke color
  strokeWidth: number;  // Stroke thickness (default: 2)
}
```

## Styling Examples

### Solid Icon

```typescript
{
  iconName: 'Star',
  fill: '#FBBF24',
  strokeWidth: 0
}
```

### Outlined Icon

```typescript
{
  iconName: 'Star',
  stroke: '#FBBF24',
  fill: 'transparent',
  strokeWidth: 2
}
```

### Dual-tone Icon

```typescript
{
  iconName: 'Star',
  fill: 'rgba(251, 191, 36, 0.3)',
  stroke: '#FBBF24',
  strokeWidth: 2
}
```

## Animation

### Animatable Properties

| Property | Effect |
|----------|--------|
| `opacity` | Fade in/out |
| `scale` | Grow/shrink |
| `rotation` | Spin |
| `fill` | Color change |
| `x`, `y` | Movement |

### Common Animations

#### Pop In

```typescript
// Start
{ scale: 0, opacity: 0 }
// End
{ scale: 1, opacity: 1 }
```

#### Spin

```typescript
// Continuous rotation
{ rotation: 0 }
{ rotation: 360 }
```

#### Pulse

```typescript
// Scale up and down
{ scale: 1 }
{ scale: 1.2 }
{ scale: 1 }
```

#### Color Flash

```typescript
// Change color temporarily
{ fill: '#FFFFFF' }
{ fill: '#FBBF24' }
{ fill: '#FFFFFF' }
```

## Common Use Cases

### Status Indicators

```typescript
// Online status
{
  iconName: 'Circle',
  fill: '#10B981',
  width: 12,
  height: 12
}

// Alert
{
  iconName: 'AlertTriangle',
  fill: '#F59E0B',
  width: 24,
  height: 24
}
```

### Navigation

```typescript
// Next
{
  iconName: 'ChevronRight',
  stroke: '#FFFFFF',
  strokeWidth: 3
}

// Back
{
  iconName: 'ArrowLeft',
  stroke: '#FFFFFF'
}
```

### Social Media

```typescript
// Twitter/X
{
  iconName: 'Twitter',
  fill: '#1DA1F2'
}

// YouTube
{
  iconName: 'Youtube',
  fill: '#FF0000'
}
```

### Sports

```typescript
// Winner
{
  iconName: 'Trophy',
  fill: '#FBBF24'
}

// Score up
{
  iconName: 'TrendingUp',
  stroke: '#10B981'
}
```

## Dynamic Icons

### Content Fields

Make icon selectable at playout:

1. Enable "Editable" in properties
2. Set field name
3. Select icon in Pulsar GFX

### Data Binding

Bind icon to data:

```typescript
{
  dataBinding: {
    source: 'api',
    path: 'status.icon',
    mapping: {
      'online': 'Circle',
      'offline': 'CircleOff',
      'away': 'Clock'
    }
  }
}
```

## Icon + Text Combinations

Pair icons with text elements:

### Label with Icon

```
[Icon] Label Text
```

Group an icon and text element, animate together.

### Icon Button

```typescript
// Group containing:
// - Shape (background)
// - Icon (centered)
```

## Best Practices

### Sizing
- Use consistent icon sizes (16, 20, 24, 32px)
- Match icon weight to text weight
- Ensure visibility at broadcast size

### Color
- Use design system colors
- Ensure sufficient contrast
- Consider color blindness

### Alignment
- Align icons with text baselines
- Use consistent spacing
- Center icons in containers

### Performance
- Icons are lightweight (vector)
- Prefer icons over images for simple graphics
- Limit animation complexity
