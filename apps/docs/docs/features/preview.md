---
sidebar_position: 2
---

# Preview Control Panel

The Preview Control Panel in Nova GFX lets you test animations and template playback before publishing to broadcast channels.

## Overview

Preview mode provides:

- **Animation Testing**: Play IN/OUT animations in isolation
- **Template Selection**: Choose which templates to preview
- **Always-On Integration**: See how persistent layers combine
- **Safe Testing**: Verify animations without affecting live output

## Preview Panel Interface

```
┌─────────────────────────────────────────────────┐
│  Preview Controls                          ⚙️   │
├─────────────────────────────────────────────────┤
│  ▶ Play In    ⏹ Play Out                        │
├─────────────────────────────────────────────────┤
│  Templates                    (2 selected)      │
│  ┌─────────────────────────────────────────┐   │
│  │ ☑️  Template 1 (Lower Third Layer)      │   │
│  │ ☑️  Template 2 (Bug Layer)              │   │
│  │ ☐  Template 3 (Fullscreen Layer)        │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  Always On Layers                               │
│  📌 Score Bug Layer                             │
│  📌 Logo Layer                                  │
└─────────────────────────────────────────────────┘
```

## Playback Controls

### Play In Button

- Triggers the **IN** animation for all selected templates
- Templates animate from their starting keyframe state to loop state
- After IN completes, templates enter **LOOP** phase

### Play Out Button

- Triggers the **OUT** animation for templates currently on-air
- Templates animate from loop state to their ending keyframe state
- After OUT completes, templates return to **IDLE** state

## Template Selection

### Manual Selection

1. Check the box next to templates you want to preview
2. Multiple templates can be selected across different layers
3. Selection summary shows count of selected templates

### Auto-Selection Rules

- **Always-On Layers**: Single templates auto-select
- **Multiple Templates**: Requires manual selection when layer has multiple templates
- **Deselection**: Cannot deselect the last template in an always-on layer

### Grouping

Templates are organized by layer:

```
Layer: Lower Thirds
  ☑️ Name Strap
  ☐ Title Card

Layer: Score Bug (Always On)
  ☑️ Main Score

Layer: Fullscreen
  ☐ Stats Card
  ☐ Photo Montage
```

## Always-On Layers

Always-on layers display persistently in preview:

| Feature | Behavior |
|---------|----------|
| **Auto-Display** | Always-on layers composite automatically |
| **Toggle** | Click pin icon to toggle always-on state |
| **Combined Preview** | See selected templates + always-on layers together |
| **Independent Control** | Each always-on layer can be toggled |

## Animation Phases

Preview respects the three-phase animation system:

```
IDLE → [Play In] → IN → LOOP → [Play Out] → OUT → IDLE
```

| Phase | Description |
|-------|-------------|
| **IDLE** | Initial state, not playing |
| **IN** | Entrance animation playing |
| **LOOP** | Hold state (continuous or static) |
| **OUT** | Exit animation playing |

## Preview Canvas

The preview canvas shows:

- Selected template(s) at project resolution
- Always-on layers composited
- Real-time animation playback
- Accurate timing and easing

### Canvas Controls

| Control | Description |
|---------|-------------|
| Zoom | Scroll to zoom in/out |
| Pan | Space+drag to pan |
| Fit | Double-click to fit to view |
| Reset | Button to reset view |

## Workflow

### Testing a Single Template

1. Select one template from the list
2. Click **Play In** to see entrance animation
3. Review the LOOP state
4. Click **Play Out** to see exit animation

### Testing Multiple Templates

1. Check multiple templates to select them
2. Click **Play In** - all selected animate simultaneously
3. Templates on different layers composite properly
4. Click **Play Out** to exit all

### Testing Always-On Combinations

1. Enable "Always On" on persistent layers (score bug, logo)
2. Select additional templates to preview
3. Play In to see how they combine
4. Always-on elements remain during OUT animation

## Best Practices

### Pre-Production Testing

- **Test All Templates**: Preview every template before show
- **Check Timing**: Verify IN/OUT durations feel natural
- **Layer Conflicts**: Ensure layers don't visually conflict

### Animation Verification

- **Smooth Transitions**: Check for jerky or choppy animations
- **Easing Functions**: Verify easing creates desired feel
- **Duration**: Ensure animations aren't too fast or slow

### Composite Testing

- **Z-Order**: Verify layer stacking looks correct
- **Overlap**: Check for unintended element overlap
- **Readability**: Ensure text remains readable with overlays

## Related Features

- [Animation Phases](/docs/animation/phases) - Understanding IN/LOOP/OUT
- [Keyframes](/docs/animation/keyframes) - Creating animation keyframes
- [Publishing](/docs/features/publishing) - Publishing to broadcast channels
