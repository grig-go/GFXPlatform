---
sidebar_position: 1
---

# Layers Panel

The Layers panel in Nova GFX provides hierarchical organization for your broadcast graphics. Layers control z-ordering, visibility, and serve as containers for templates.

## Understanding Layers

Layers are the fundamental organizational unit in Nova GFX:

- **Containers**: Each layer holds one or more templates
- **Stacking Order**: Higher z-index layers appear on top
- **Independent Control**: Visibility, locking, and "always on" states per layer
- **Type-Based**: Layers have semantic types (fullscreen, lower-third, etc.)

## Layer Types

| Type | Description | Typical Use |
|------|-------------|-------------|
| `fullscreen` | Full canvas coverage | Full-screen graphics, backgrounds |
| `lower-third` | Bottom portion | Name straps, titles |
| `bug` | Corner element | Logos, score bugs |
| `ticker` | Scrolling content | News tickers, crawls |
| `alert` | Overlay notifications | Breaking news, alerts |
| `overlay` | General overlay | Watermarks, frames |
| `background` | Bottom layer | Video/image backgrounds |
| `custom` | User-defined | Special purpose |

## Layers Panel Interface

### Layer Row

Each layer displays:

```
┌──────────────────────────────────────────────────────┐
│ ▶  🔒  👁️  📌  Layer Name            [Type]  [z:3]  │
│    └─ Template 1                                      │
│    └─ Template 2                                      │
└──────────────────────────────────────────────────────┘
```

| Control | Icon | Description |
|---------|------|-------------|
| Expand/Collapse | ▶ | Show/hide templates in layer |
| Lock | 🔒 | Prevent editing (amber when locked) |
| Visibility | 👁️ | Toggle layer visibility (amber when hidden) |
| Always On | 📌 | Layer always visible (violet when enabled) |
| Z-Index | [z:n] | Stacking order number |

### Visual Indicators

- **On-Air Border**: Colored left border when layer's template is live
- **Amber Highlight**: Locked or hidden state
- **Violet Pin**: "Always on" layer

## Working with Layers

### Creating a Layer

1. Click the **+** button in the Layers panel header
2. Select a layer type from the dropdown
3. Enter a descriptive name
4. The layer is created with a default z-index

### Layer Properties

| Property | Description |
|----------|-------------|
| `name` | Display name |
| `layer_type` | Semantic type (fullscreen, lower-third, etc.) |
| `enabled` | Visibility toggle |
| `locked` | Edit protection |
| `always_on` | Persistent visibility |
| `z_index` | Stacking order (higher = on top) |

### Reordering Layers

- **Drag and Drop**: Click and drag layer rows to reorder
- **Z-Index Updates**: Z-index automatically adjusts when reordering
- The layer list is sorted by z-index (highest at top)

### Layer Actions

Right-click a layer or use the action buttons:

| Action | Description |
|--------|-------------|
| Toggle Visibility | Show/hide layer (eye icon) |
| Toggle Lock | Prevent/allow editing (lock icon) |
| Toggle Always On | Set persistent visibility (pin icon) |
| Add Template | Create new template in this layer |
| Delete Layer | Remove layer (only if empty) |

## Always On Layers

"Always on" layers display regardless of which template is selected:

- **Use Case**: Persistent elements like logo bugs, score displays
- **Behavior**: Templates in always-on layers composite with the active template
- **Preview**: Preview panel shows always-on layers combined with selected template
- **Control**: Pin icon toggles this state (shown in violet when enabled)

## Layer Visibility vs. Lock

| Feature | Visibility | Lock |
|---------|------------|------|
| **Purpose** | Show/hide output | Prevent changes |
| **Affects** | Preview & publish | Selection & editing |
| **Output** | Hidden layers not rendered | Locked layers still render |
| **Indicator** | Eye icon (amber when hidden) | Lock icon (amber when locked) |

## Templates Within Layers

Each layer can contain multiple templates:

- **Expand** the layer to see templates
- **Select** a template to edit it
- **Reorder** templates within a layer via drag-drop
- **Add** templates using the plus button on the layer row

### Template Row

```
└─ Template Name    [📋 Duplicate]  [🗑️ Delete]
```

## Common Layer Setups

### News Production

| Layer | Type | Content |
|-------|------|---------|
| 4 | alert | Breaking news banner |
| 3 | fullscreen | Full-screen graphics |
| 2 | bug | Network logo |
| 1 | lower-third | Name straps |

### Sports Production

| Layer | Type | Content |
|-------|------|---------|
| 5 | ticker | Score ticker |
| 4 | alert | Replay/review overlays |
| 3 | fullscreen | Statistics cards |
| 2 | bug | Score bug (always on) |
| 1 | lower-third | Player identifications |

### Corporate Event

| Layer | Type | Content |
|-------|------|---------|
| 3 | overlay | Event branding frame |
| 2 | bug | Company logo (always on) |
| 1 | lower-third | Speaker names |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` | Delete selected template |
| `Ctrl+D` | Duplicate selected template |

## Best Practices

### Organization

- **Consistent Types**: Use appropriate layer types for content
- **Descriptive Names**: Name layers by purpose (e.g., "Score Bug", "Lower Thirds")
- **Logical Z-Order**: Plan stacking before creating templates

### Performance

- **Limit Layers**: Keep to 4-6 layers for optimal performance
- **One Active Per Layer**: Generally have one template active per layer
- **Always On Sparingly**: Use always-on for truly persistent elements only

### Workflow

- **Pre-Production**: Set up layer structure before designing templates
- **Team Consistency**: Document layer purposes for team members
- **Lock When Done**: Lock layers to prevent accidental changes
