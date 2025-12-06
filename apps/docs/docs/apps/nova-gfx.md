---
sidebar_position: 1
---

# Nova GFX (Designer)

Nova GFX is the design application where you create and animate broadcast graphics templates.

## Interface Overview

### Main Workspace

The Nova GFX interface consists of several key areas:

```
┌─────────────────────────────────────────────────────────────┐
│  Header (Project selector, Tools, Settings)                 │
├─────────┬───────────────────────────────────┬───────────────┤
│         │                                   │               │
│ Layers  │         Canvas                    │  Properties   │
│   &     │                                   │     Panel     │
│ Elements│                                   │               │
│         │                                   │               │
├─────────┴───────────────────────────────────┴───────────────┤
│                    Timeline                                  │
└─────────────────────────────────────────────────────────────┘
```

### Left Panel - Layers & Elements

- **Layers Tab**: Manage template layers and z-ordering
- **Elements Tab**: View and select elements in the current template
- **Add Element**: Quick access to add new elements

### Center - Canvas

The main design area where you:
- Visually position and resize elements
- Preview animations
- See real-time updates

### Right Panel - Properties

Context-sensitive properties panel showing:
- **Transform**: Position, size, rotation, opacity
- **Style**: Colors, borders, shadows, effects
- **Content**: Element-specific content (text, image source, etc.)
- **Animation**: Keyframe editor and animation properties

### Bottom - Timeline

The animation timeline where you:
- Switch between IN, LOOP, and OUT phases
- Add and edit keyframes
- Scrub through animations
- Control playback

## Creating Your First Template

### 1. Create a New Template

1. Click the **+** button in the Layers panel
2. Enter a template name
3. Choose a layer (determines z-order)

### 2. Add Elements

Click the element type buttons or use keyboard shortcuts:

| Element | Shortcut | Description |
|---------|----------|-------------|
| Text | `T` | Text with rich formatting |
| Image | `I` | Static or animated images |
| Shape | `S` | Rectangles, circles, custom shapes |
| Map | `M` | Interactive Mapbox maps |
| Chart | `C` | Data visualizations |
| Icon | - | Lucide icon library |

### 3. Position and Style

1. Select an element on the canvas
2. Use the Properties panel to adjust:
   - Position (X, Y)
   - Size (Width, Height)
   - Rotation and Scale
   - Colors and effects

### 4. Animate

1. Select the **IN** phase in the timeline
2. Set the starting state of your element (e.g., off-screen, transparent)
3. Add a keyframe at the start
4. Move to the end of the IN phase
5. Set the final state (on-screen, visible)
6. Add another keyframe

The system will interpolate between keyframes automatically.

## Keyboard Shortcuts

### General
| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save project |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Delete` | Delete selected |
| `Ctrl+D` | Duplicate selected |

### Canvas Navigation
| Shortcut | Action |
|----------|--------|
| `Space+Drag` | Pan canvas |
| `Scroll` | Zoom in/out |
| `Ctrl+0` | Reset zoom |
| `Ctrl+1` | Zoom to fit |

### Timeline
| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `←` / `→` | Move playhead |
| `K` | Add keyframe |
| `1` | Switch to IN phase |
| `2` | Switch to LOOP phase |
| `3` | Switch to OUT phase |

### Elements
| Shortcut | Action |
|----------|--------|
| `T` | Add Text |
| `I` | Add Image |
| `S` | Add Shape |
| `M` | Add Map |
| `G` | Group selected |
| `Ctrl+G` | Ungroup |

## Preview Mode

Press `P` or click the Preview button to enter preview mode:

- Test animations in isolation
- View at actual broadcast resolution
- Generate browser source URLs for OBS

## Best Practices

### Performance
- Keep element count reasonable (< 50 per template)
- Use PNG for transparency, JPEG for photos
- Optimize animation complexity

### Organization
- Use descriptive element names
- Group related elements
- Organize templates by layer purpose

### Animation
- Keep IN/OUT durations between 0.3-1.0 seconds
- Use appropriate easing functions
- Test at target frame rate
