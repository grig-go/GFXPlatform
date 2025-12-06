---
sidebar_position: 6
---

# Timeline

The Timeline is the central animation control interface in Nova GFX. It provides precise control over keyframes, playback, and the three animation phases.

## Overview

The Timeline provides:

- **Phase Management**: Control IN, LOOP, and OUT animations
- **Keyframe Editing**: Create and position keyframes visually
- **Playback Control**: Preview animations in real-time
- **Time Navigation**: Scrub, zoom, and navigate through time

## Timeline Interface

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Background 1 ▼ │ IN 1.5s │ LOOP 3.0s │ OUT 1.5s │ ◀ ▶ ⏹ │ ⏮ ⏭ │ + │ 🔍 │
├─────────────────────────────────────────────────────────────────────────┤
│  0s         0.5s        1.0s        1.5s                     │ 100% │ ↗️ │
├─────────────────────────────────────────────────────────────────────────┤
│  Element 1  │ ◆─────────────────◆────────────────◆                      │
│  Element 2  │        ◆──────────────────◆                               │
│  Element 3  │ ◆──────────────────────────────────◆                      │
├─────────────────────────────────────────────────────────────────────────┤
│                          ▼ (Playhead)                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Animation Phases

All animations are organized into three phases:

### IN Phase (Entrance)

- **Purpose**: Template appears on screen
- **Default Duration**: 1500ms (1.5 seconds)
- **Color Code**: Emerald green (#10B981)
- **Typical Use**: Slide in, fade in, scale up

### LOOP Phase (Hold)

- **Purpose**: Template stays visible, can repeat
- **Default Duration**: 3000ms (3 seconds)
- **Color Code**: Violet (#8B5CF6)
- **Typical Use**: Idle animations, subtle movements, continuous effects

### OUT Phase (Exit)

- **Purpose**: Template disappears from screen
- **Default Duration**: 1500ms (1.5 seconds)
- **Color Code**: Amber (#F59E0B)
- **Typical Use**: Slide out, fade out, scale down

### Phase Tabs

Click the phase tabs to switch between phases:

```
│ IN 1.5s │ LOOP 3.0s │ OUT 1.5s │
```

- Active phase is highlighted
- Duration shown next to phase name
- Each phase has independent keyframes

## Toolbar Controls

### Playback Controls

| Control | Icon | Description |
|---------|------|-------------|
| **Play/Pause** | ▶/⏸ | Play or pause current phase |
| **Stop** | ⏹ | Stop and return to start |
| **Full Preview** | 📺 | Play all phases: IN → LOOP → OUT |
| **Loop Toggle** | 🔁 | Toggle looping of current phase |

### Navigation Controls

| Control | Icon | Description |
|---------|------|-------------|
| **Go to Start** | ⏮ | Jump to beginning (0ms) |
| **Previous Keyframe** | ⏪ | Jump to previous keyframe |
| **Next Keyframe** | ⏩ | Jump to next keyframe |
| **Go to End** | ⏭ | Jump to end of phase |

### Editing Controls

| Control | Icon | Description |
|---------|------|-------------|
| **Add Keyframe** | + | Create keyframe at playhead |
| **Delete Keyframes** | 🗑️ | Remove selected keyframes |

### View Controls

| Control | Icon | Description |
|---------|------|-------------|
| **Fit to Content** | ↔️ | Auto-zoom to show all animations |
| **Zoom In** | 🔍+ | Increase zoom (max 10x) |
| **Zoom Out** | 🔍- | Decrease zoom (min 0.1x) |

## Time Display

### Time Format

The timeline displays time in multiple formats based on zoom level:

```
High Zoom:   00:01.15f  (Minutes:Seconds.Frames)
Low Zoom:    00:01      (Minutes:Seconds)
```

### Frame Rate

- **Default**: 30 FPS (frames per second)
- **Frame Duration**: 33.33ms per frame
- **Display**: Shows current time and total duration

### Position Display

```
0.0s / 1.5s     (Current / Total)
```

## Working with Keyframes

### Creating Keyframes

1. **Position Playhead**: Move playhead to desired time
2. **Select Element**: Click element in outline or canvas
3. **Add Keyframe**: Click **+** button or press **K**
4. **Edit Properties**: Modify element properties in Properties panel

### Keyframe Indicators

Keyframes appear as diamond shapes on the timeline:

| Color | Meaning |
|-------|---------|
| 🔴 Red | Selected keyframe |
| 🟠 Orange | Normal keyframe |
| 🟡 Bright Orange | Keyframe with 3+ properties |
| ⚫ Gray | Empty keyframe (0 properties) |

### Selecting Keyframes

- **Single Select**: Click on keyframe
- **Multi-Select**: Ctrl+click additional keyframes
- **Range Select**: Shift+click for range
- **Deselect**: Click empty area or press Escape

### Moving Keyframes

1. Click and drag keyframe to new position
2. Keyframes snap to frame grid (33.33ms intervals)
3. Release to confirm new position

### Deleting Keyframes

- Select keyframe(s)
- Press **Delete** or **Backspace**
- Or click the trash icon in toolbar

## Element Rows

Each element in the template has a row in the timeline:

```
┌──────────────────────────────────────────────────────┐
│  Text Element    │ ◆──────────────◆                  │
│  Background      │ ◆─────────────────────────◆       │
│  Logo            │      ◆────────◆                   │
└──────────────────────────────────────────────────────┘
```

### Animation Bars

- Semi-transparent colored bar shows animation duration
- Bar spans from first to last keyframe
- Color matches current phase
- Fainter bars indicate animations without keyframes

### Row Height

- Standard height: 32px per element
- Grouped elements show hierarchy

## Playhead

The playhead is the vertical line showing current playback position:

### Scrubbing

- **Click and Drag**: Drag playhead to scrub through time
- **Click on Ruler**: Jump to clicked position
- **Snap to Grid**: Playhead snaps to frame boundaries

### During Playback

- Playhead moves automatically
- Shows real-time animation progress
- Stops at phase end (unless looping)

## Time Input Formats

When editing durations or positions, multiple formats are accepted:

| Input | Result |
|-------|--------|
| `5` | 5 seconds (5000ms) |
| `5s` | 5 seconds (5000ms) |
| `5000ms` | 5000 milliseconds |
| `1:30` | 1 minute 30 seconds |
| `1:30:15` | 1 min 30 sec 15 frames |

## Keyboard Shortcuts

### Playback

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause current phase |
| `Enter` | Play full preview |
| `Escape` | Stop playback |

### Navigation

| Shortcut | Action |
|----------|--------|
| `Home` | Go to start |
| `End` | Go to end |
| `←` | Move playhead left |
| `→` | Move playhead right |
| `Ctrl+←` | Previous keyframe |
| `Ctrl+→` | Next keyframe |

### Editing

| Shortcut | Action |
|----------|--------|
| `K` | Add keyframe at playhead |
| `Delete` | Delete selected keyframes |
| `Backspace` | Delete selected keyframes |

### Phase Switching

| Shortcut | Action |
|----------|--------|
| `1` | Switch to IN phase |
| `2` | Switch to LOOP phase |
| `3` | Switch to OUT phase |

## Zoom and Pan

### Zoom Levels

- **Minimum**: 0.1x (shows ~10 seconds)
- **Maximum**: 10x (shows ~100ms)
- **Default**: Fit to content

### Zoom Controls

- **Mouse Wheel**: Scroll to zoom (when hovering timeline)
- **Buttons**: Use zoom in/out buttons
- **Fit**: Click fit button to auto-zoom

### Panning

- **Horizontal Scroll**: Scroll bar at bottom
- **Drag**: Middle-mouse drag to pan
- **Auto-Follow**: Timeline follows playhead during playback

## Animation Workflow

### Basic Animation Setup

1. **Select Phase**: Choose IN, LOOP, or OUT tab
2. **Select Element**: Click element to animate
3. **Set Start State**: Position element, adjust properties
4. **Add Start Keyframe**: Click + at time 0
5. **Move Playhead**: Drag to animation end time
6. **Set End State**: Adjust element properties
7. **Add End Keyframe**: Click + at end position
8. **Preview**: Click play to test

### Multi-Element Animation

1. **Plan Timing**: Sketch out which elements move when
2. **Stagger Starts**: Offset keyframes for sequential entrance
3. **Overlap Carefully**: Avoid too many simultaneous animations
4. **Preview Together**: Use full preview to see combined effect

### Refining Animations

1. **Adjust Easing**: Select keyframe, change easing in Properties
2. **Fine-tune Timing**: Drag keyframes to adjust timing
3. **Add Intermediate**: Add keyframes between start/end for complex motion
4. **Test at Speed**: Always preview at real-time speed

## Special Timeline Features

### Location Keyframes (Maps)

Map elements have special location keyframes:

- **Shape**: Circular (not diamond)
- **Properties**: Center, zoom, pitch, bearing
- **Editing**: Done in Properties panel, not timeline
- **Display**: Read-only indicators on timeline

### Animation Properties

Keyframes can animate these properties:

| Property | Description |
|----------|-------------|
| `position_x` | Horizontal position |
| `position_y` | Vertical position |
| `rotation` | Rotation in degrees |
| `scale_x` | Horizontal scale |
| `scale_y` | Vertical scale |
| `opacity` | Transparency (0-1) |
| `color` | Text/element color |
| `background_color` | Background color |
| `clip_path` | CSS clip-path |
| `filter_blur` | Blur amount (0-50px) |
| `filter_brightness` | Brightness (0-200%) |

## Best Practices

### Timing

- **IN Duration**: 0.3-1.0 seconds for most elements
- **OUT Duration**: Usually equal or shorter than IN
- **LOOP Duration**: Depends on content, often 2-5 seconds

### Performance

- **Limit Keyframes**: Avoid excessive keyframes
- **Simple Easing**: Complex easing can slow playback
- **Test on Target**: Preview at target frame rate

### Organization

- **Name Elements**: Use descriptive names
- **Consistent Timing**: Keep similar elements in sync
- **Document Complex**: Note complex animation sequences

## Related Features

- [Animation Phases](/docs/animation/phases) - Phase details
- [Keyframes](/docs/animation/keyframes) - Keyframe properties
- [Easing](/docs/animation/easing) - Easing functions
- [Presets](/docs/animation/presets) - Animation presets
