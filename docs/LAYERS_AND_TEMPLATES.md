# Layers and Templates in Nova GFX

This document explains how layers and templates work in Nova GFX, including the z-order system for controlling which graphics appear on top.

---

## Table of Contents

1. [Understanding Layers](#understanding-layers)
2. [Templates](#templates)
3. [Z-Order and Stacking](#z-order-and-stacking)
4. [Layer Reordering](#layer-reordering)
5. [Layer Properties](#layer-properties)
6. [On-Air Control](#on-air-control)

---

## Understanding Layers

Layers are the top-level organizational structure in Nova GFX. Each layer can contain multiple templates, but only one template per layer can be "on air" at a time.

### Common Layer Types

| Layer | Purpose | Example Templates |
|-------|---------|-------------------|
| **Fullscreen** | Full-screen graphics | Breaking news, election maps |
| **Lower Third** | Bottom-third graphics | Name supers, topic bars |
| **Bug** | Corner graphics | Station logo, time/temp |
| **Ticker** | Scrolling text | Headlines, stocks, scores |
| **Alert** | Emergency overlays | Weather alerts, breaking news |

### Layer Hierarchy

```
Project
├── Layer: Alerts (z-index: 300)
│   └── Template: Weather Alert
├── Layer: Lower Third (z-index: 200)
│   ├── Template: Name Super
│   └── Template: Topic Bar
├── Layer: Fullscreen (z-index: 100)
│   ├── Template: Election Map
│   └── Template: Breaking News
└── Layer: Bug (z-index: 50)
    └── Template: Station Logo
```

---

## Templates

Templates are the individual graphic designs within a layer. Each template contains elements (text, shapes, images) and has its own animation timeline.

### Template Properties

- **Name**: Display name for the template
- **Visible**: Whether template is visible in designer
- **Locked**: Prevent accidental edits
- **Data Source**: Associated data source for bindings
- **Record Index**: Which data record to use (0 = first)

### Template Switching

Within a layer, you can switch between templates:

1. Click the **switch icon** on a layer row
2. The current template plays OUT
3. The new template plays IN
4. Only one template per layer is ever on-air

---

## Z-Order and Stacking

Z-order controls which graphics appear on top of others. Nova GFX uses a two-level z-order system:

### Effective Z-Index Formula

```
effectiveZIndex = layer.z_index + element.z_index
```

### Layer Z-Index

- Higher z-index = renders on top
- Range: 0 to 1000 (recommended)
- Typical assignments:
  - Bug/Logo: 50
  - Fullscreen: 100
  - Lower Third: 200
  - Alerts: 300

### Element Z-Index

Within a template, elements have their own z-index:
- Range: 0 to 100 (relative to layer)
- Higher values render on top of lower values
- Use sparingly - layer z-index is the primary control

### Example

| Layer | Layer Z | Element | Element Z | Effective Z |
|-------|---------|---------|-----------|-------------|
| Alerts | 300 | Alert Box | 10 | 310 |
| Lower Third | 200 | Background | 0 | 200 |
| Lower Third | 200 | Text | 10 | 210 |
| Fullscreen | 100 | Map | 0 | 100 |

Result: Alert Box (310) > Text (210) > Background (200) > Map (100)

---

## Layer Reordering

You can reorder layers to change their z-index using drag and drop.

### Drag and Drop Reordering

1. In the **Outline Panel** (left side), hover over a layer row
2. Grab the **grip handle** (vertical dots) on the left
3. Drag the layer up or down
4. A blue line indicates where the layer will be placed
5. Drop to reorder

### Visual Indicators

- **Dragging layer**: Shows at 50% opacity
- **Drop target**: Blue border appears above or below
- **Z-index display**: Shows on hover (`z:200`)

### Z-Index Updates

When you reorder layers:
- Z-index values are automatically swapped
- Changes are marked as "dirty" (unsaved)
- Save the project to persist the new order
- The order is stored in the database

### Keyboard Shortcuts

Currently, layer reordering is drag-and-drop only. Future versions may add:
- `Ctrl+[` / `Ctrl+]` to move layer down/up
- Right-click context menu options

---

## Layer Properties

### Visibility

- **Eye icon**: Toggle layer visibility in designer
- Hidden layers don't render in preview or publish
- Use for temporarily hiding layers while editing

### Lock

- **Lock icon**: Prevent editing layer elements
- Locked layers can still be toggled on-air
- Useful for finalized graphics

### Always On

- **Pin icon**: Layer is always visible in publish
- Always-on templates don't need to be manually triggered
- Useful for bugs, logos, persistent graphics

### Layer Settings

Right-click a layer to access:
- Rename layer
- Duplicate layer
- Delete layer (with confirmation)
- Layer properties

---

## On-Air Control

### Playing Templates On-Air

1. **Click the layer row** to select/expand
2. **Click the play button** on a template to play IN
3. **Click again** to play OUT
4. Or use the **switch button** to cycle templates

### On-Air States

| State | Indicator | Description |
|-------|-----------|-------------|
| **IN** | Green "IN" badge | Template playing in |
| **LOOP** | Pulsing "ON AIR" | Template in loop phase |
| **OUT** | Amber "OUT" badge | Template playing out |

### Pulsar GFX Integration

When publishing to Pulsar GFX:
- Layers maintain their z-order
- Multiple layers can be on-air simultaneously
- Each layer's active template is rendered
- Always-on layers are automatically included

---

## Best Practices

### Layer Organization

1. **Separate concerns**: One purpose per layer
2. **Name clearly**: `Lower Third - Names` not `Layer 1`
3. **Set z-index intentionally**: Plan your stacking order
4. **Use always-on sparingly**: Only for truly persistent graphics

### Z-Order Guidelines

1. **Leave gaps**: Use 50, 100, 200 not 1, 2, 3 (room to insert)
2. **Document your scheme**: Keep notes on layer purposes
3. **Test in publish**: Verify stacking in actual output
4. **Consider interactions**: Alert over lower third over fullscreen

### Performance

1. **Limit always-on layers**: Each adds rendering overhead
2. **Consolidate when possible**: Multiple elements in one template
3. **Use visibility**: Toggle off unused layers vs. keeping many active

---

## Troubleshooting

### Lower Third Behind Fullscreen

1. Check layer z-index values (Lower Third should be higher)
2. Use drag-and-drop to reorder layers
3. Save and republish

### Template Not Appearing

1. Verify layer is not hidden (eye icon)
2. Check template is not hidden
3. Confirm layer is not locked
4. Verify z-index isn't 0

### Z-Order Correct in Preview but Wrong in Publish

1. Save the project after reordering
2. Republish to update the player
3. Clear browser cache on player
4. Check NovaPlayer is using effectiveZIndex

---

## API Reference

### Layer Object

```typescript
interface Layer {
  id: string;
  name: string;
  project_id: string;
  z_index: number;      // Layer stacking order
  enabled: boolean;     // Visibility
  locked: boolean;      // Edit protection
  always_on: boolean;   // Persistent display
  created_at: string;
  updated_at: string;
}
```

### Template Object

```typescript
interface Template {
  id: string;
  name: string;
  layer_id: string;
  sort_order: number;   // Order within layer
  visible: boolean;
  locked: boolean;
  data_source_config: {
    dataSourceId?: string;
    defaultRecordIndex?: number;
    liveData?: LiveDataConfig;
  };
}
```

### Reorder Layer Action

```typescript
// In designerStore
reorderLayer(layerId: string, direction: 'up' | 'down'): void

// Usage
useDesignerStore.getState().reorderLayer('layer-123', 'up');
```
