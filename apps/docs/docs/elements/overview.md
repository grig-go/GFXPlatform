---
sidebar_position: 1
---

# Elements Overview

Elements are the visual building blocks of your graphics in Nova GFX. Each element type has specific properties and capabilities.

## Element Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| [Text](./text) | Rich text with formatting | Lower thirds, titles, scores |
| [Image](./image) | Static and animated images | Logos, photos, backgrounds |
| [Shape](./shape) | Vector shapes | Backgrounds, decorations, masks |
| [Map](./map) | Interactive Mapbox maps | Location graphics, weather maps |
| [Chart](./chart) | Data visualizations | Statistics, polls, leaderboards |
| [Ticker](./ticker) | Scrolling text | News crawls, alerts |
| [Icon](./icon) | Vector icons | UI elements, indicators |
| [Group](./group) | Container for elements | Organization, shared transforms |

## Common Properties

All elements share these core properties:

### Transform

```typescript
{
  x: number;          // Horizontal position (pixels)
  y: number;          // Vertical position (pixels)
  width: number;      // Element width (pixels)
  height: number;     // Element height (pixels)
  rotation: number;   // Rotation in degrees
  scale: number;      // Scale factor (1 = 100%)
  opacity: number;    // Transparency (0-1)
}
```

### Anchor Point

The anchor point determines the origin for transformations:

| Anchor | Description |
|--------|-------------|
| `top-left` | Top-left corner (default) |
| `top-center` | Top edge center |
| `top-right` | Top-right corner |
| `center-left` | Left edge center |
| `center` | Element center |
| `center-right` | Right edge center |
| `bottom-left` | Bottom-left corner |
| `bottom-center` | Bottom edge center |
| `bottom-right` | Bottom-right corner |

### Visibility

- **Visible**: Element renders on canvas
- **Locked**: Cannot be selected or edited
- **Hidden**: Not rendered but preserved

## Element Hierarchy

Elements exist within a hierarchy:

```
Template
├── Group
│   ├── Text
│   ├── Image
│   └── Shape
├── Map
└── Text
```

### Z-Order (Sort Order)

Elements are rendered in order from back to front. Lower sort order = behind.

**Reordering:**
- Drag in the Elements panel
- Right-click → "Bring Forward" / "Send Backward"
- Keyboard: `Ctrl+]` (forward), `Ctrl+[` (backward)

## Creating Elements

### Via UI

1. Click the element type button in the toolbar
2. Click on the canvas to place
3. Drag to resize (optional)

### Via Keyboard

| Key | Element |
|-----|---------|
| `T` | Text |
| `I` | Image |
| `S` | Shape |
| `M` | Map |
| `C` | Chart |

### Default Properties

New elements are created with sensible defaults:
- Centered on visible canvas area
- Reasonable default size
- Template's design system colors/fonts

## Selecting Elements

### Single Selection
- Click on element
- Click in Elements panel

### Multi-Selection
- `Shift+Click` to add/remove
- `Ctrl+Click` for toggle
- Drag rectangle to select area

### Selection Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+A` | Select all |
| `Escape` | Deselect all |
| `Tab` | Select next |
| `Shift+Tab` | Select previous |

## Transforming Elements

### Move
- Drag on canvas
- Arrow keys (1px)
- Shift+Arrow (10px)
- Properties panel X/Y

### Resize
- Drag corner handles
- Shift+Drag for proportional
- Properties panel W/H

### Rotate
- Drag rotation handle (outside corners)
- Properties panel rotation value
- Shift for 15° increments

## Content vs. Style

Elements separate **content** (what is displayed) from **style** (how it looks):

### Content Examples
- Text: The actual text string
- Image: The image source URL
- Map: Center coordinates, zoom level

### Style Examples
- Text: Font, size, color, alignment
- Image: Border radius, shadow, blend mode
- Map: Map style, overlay colors

This separation enables:
- Reusable templates with editable content
- Consistent styling across content variations
- Dynamic content updates at playout time

## Best Practices

### Naming
- Use descriptive names: "Score - Home Team" not "Text 1"
- Include purpose in name
- Use consistent naming conventions

### Organization
- Group related elements
- Use layers appropriately
- Keep hierarchy shallow when possible

### Performance
- Limit total element count
- Optimize image sizes
- Avoid excessive blur/shadow effects
