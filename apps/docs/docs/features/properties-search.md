---
sidebar_position: 9
---

# Properties Panel Search

The Properties Panel includes a powerful search feature that helps you quickly find and access specific properties, settings, and controls for the selected element.

## Overview

With many properties available for different element types, finding the right setting can be time-consuming. The search feature instantly filters the Properties Panel to show only sections and controls matching your query.

## Using Search

### Accessing Search

1. Select an element on the canvas
2. In the Properties Panel, locate the search input at the top
3. Click the search field or press `/` to focus it

### Search Behavior

- **Instant filtering**: Results appear as you type
- **Section matching**: Searches section headers (e.g., "Layout", "Style", "Animation")
- **Property matching**: Searches individual property names
- **Case insensitive**: "font", "Font", and "FONT" all match

## Search Examples

| Query | Finds |
|-------|-------|
| `font` | Font family, font size, font weight, font style |
| `color` | Fill color, stroke color, background color, shadow color |
| `shadow` | Box shadow, text shadow, drop shadow settings |
| `position` | X, Y position controls |
| `size` | Width, height, font size |
| `animation` | Animation settings, character animation |
| `opacity` | Opacity controls |
| `border` | Border radius, border width, border color |
| `glass` | Glass effect settings (for shapes) |
| `gradient` | Gradient controls |
| `follow` | Auto Follow settings |
| `max` | Max Size option |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search input |
| `Escape` | Clear search and show all sections |
| `Enter` | Keep current filter (optional) |

## Tips

### Finding Hidden Settings

Some advanced properties are in collapsed sections. Search will:
- Automatically expand sections containing matches
- Highlight matched properties
- Hide non-matching sections entirely

### Searching Multiple Elements

When multiple elements are selected:
- Only properties common to all selected elements are shown
- Search filters these common properties

### Clearing Search

To return to the full Properties Panel view:
- Clear the search input
- Press `Escape`
- Click the X button in the search field

## Common Search Queries by Task

### Styling Text
```
font       → All font properties
letter     → Letter spacing
line       → Line height
shadow     → Text shadow
stroke     → Text outline/stroke
```

### Working with Shapes
```
corner     → Corner radius
fill       → Fill color
glass      → Glass/blur effect
glow       → Glow effect
gradient   → Gradient settings
texture    → Texture overlay
```

### Layout & Position
```
position   → X, Y coordinates
size       → Width, height
anchor     → Transform anchor point
rotation   → Rotation angle
scale      → Scale X, Y
follow     → Auto Follow settings
```

### Animation
```
animation  → All animation settings
easing     → Easing function
duration   → Animation duration
delay      → Animation delay
keyframe   → Keyframe controls
char       → Character animation
progress   → Animation progress
```

### Advanced Features
```
mask       → Screen mask settings
blend      → Blend mode
data       → Data binding
editable   → Content field settings
```

## Related Features

- [Elements Overview](/docs/elements/overview) - Element types and properties
- [Auto Follow](/docs/features/auto-follow) - Dynamic element positioning
- [Animation](/docs/animation/overview) - Animate element properties
