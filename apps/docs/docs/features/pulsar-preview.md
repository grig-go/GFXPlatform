---
sidebar_position: 10
---

# Pulsar Preview

The Preview panel in Pulsar GFX displays live rendering of your pages with support for animations, real-time content editing, and multiple preview modes.

## Overview

Preview provides:

- **Live Rendering**: See pages exactly as they'll appear
- **Animation Testing**: Play IN/OUT animations
- **Real-time Updates**: Content changes appear instantly
- **Multiple Modes**: Isolated or composite preview
- **Background Options**: Customize preview environment

## Preview Panel Interface

```
┌─────────────────────────────────────────────────────┐
│  Preview                    [Isolated ▼] [⚙️] [↗️]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │           [Template Preview]                │   │
│  │                                             │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [▶ Play In]  [⏹ Play Out]  [🔄 Reset]  [▶▶ Full] │
└─────────────────────────────────────────────────────┘
```

## Preview Modes

### Isolated Mode

Preview a single template at a time:

```
┌─────────────────────────────────────────┐
│                                         │
│         Single Template View            │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Focus on one page
- Test animations independently
- Edit content with live preview
- Canvas matches template dimensions

### Composite Mode

Preview multiple templates stacked on layers:

```
┌─────────────────────────────────────────┐
│  Layer 3: Alert Overlay                 │
│  Layer 2: Score Bug                     │
│  Layer 1: Lower Third                   │
│  Layer 0: Background                    │
└─────────────────────────────────────────┘
```

**Features:**
- See final broadcast composition
- Multiple pages on different layers
- Toggle layer visibility
- Test layer interactions

### Switching Modes

Click the mode dropdown in the preview header:

```
[Isolated ▼]
├─ Isolated
└─ Composite
```

## Playback Controls

### Play In

Triggers the IN animation:

1. Click **▶ Play In**
2. Template animates from start keyframe
3. Enters LOOP state when complete

### Play Out

Triggers the OUT animation:

1. Click **⏹ Play Out**
2. Template animates to end keyframe
3. Returns to IDLE state when complete

### Reset

Returns to initial state:

1. Click **🔄 Reset**
2. Template returns to IDLE
3. Clears any animation state

### Full Playback

Plays complete animation sequence:

1. Click **▶▶ Full**
2. Plays: IN → LOOP (brief) → OUT
3. Returns to IDLE

## Animation Phases

Preview tracks animation state:

```
IDLE ──[Play In]──▶ IN ──▶ LOOPING ──[Play Out]──▶ OUT ──▶ IDLE
```

| Phase | Description |
|-------|-------------|
| **IDLE** | Initial state, not animating |
| **IN** | Entrance animation playing |
| **LOOPING** | Hold state (continuous or static) |
| **OUT** | Exit animation playing |

## Preview Settings

Access via the **⚙️** button:

```
┌─────────────────────────────────────────┐
│  Preview Settings                       │
├─────────────────────────────────────────┤
│  Background Color                       │
│  [#000000        ] [🎨]                 │
│                                         │
│  Background Media                       │
│  [No media selected] [Browse]           │
│  Type: (●) Image  ( ) Video            │
└─────────────────────────────────────────┘
```

### Background Color

- **Default**: Black (#000000)
- **Color Picker**: Click 🎨 for visual picker
- **Hex Input**: Enter any valid color
- **Transparent**: Use for alpha testing

### Background Media

Add image or video background:

1. Click **Browse**
2. Select media file
3. Choose type (Image or Video)
4. Media displays behind template

### Settings Persistence

Settings are stored in localStorage:
- `pulsar-preview-bg`: Background color
- `pulsar-preview-bg-media`: Media URL
- `pulsar-preview-bg-media-type`: Image or Video

## Real-time Content Updates

### Content Editor Integration

Changes in Content Editor appear instantly:

```
Content Editor                    Preview
┌─────────────────┐              ┌─────────────────┐
│ Name: [John   ] │  ──────▶    │    John Smith   │
│       [Smith  ] │              │   Senior Editor │
│ Title: [Senior] │              │                 │
│        [Editor] │              │                 │
└─────────────────┘              └─────────────────┘
```

### How It Works

1. Edit field in Content Editor
2. Change detected
3. PostMessage sent to preview iframe
4. Preview updates without reload

### Supported Updates

- Text content changes
- Image source changes
- Data binding updates
- Style modifications

## Composite Layer Configuration

In Composite mode, configure 4 layers:

### Layer Panel

```
┌─────────────────────────────────────────┐
│  Composite Layers                       │
├─────────────────────────────────────────┤
│  Layer 3: [Select Page ▼]     [👁️]     │
│  Layer 2: [Score Bug    ▼]     [👁️]     │
│  Layer 1: [Lower Third  ▼]     [👁️]     │
│  Layer 0: [Background   ▼]     [👁️]     │
└─────────────────────────────────────────┘
```

### Layer Properties

| Property | Description |
|----------|-------------|
| **Page** | Assigned page/template |
| **Visibility** | Toggle layer display |

### Layer Order

- **Layer 3**: Top (overlays everything)
- **Layer 2**: Upper middle
- **Layer 1**: Lower middle
- **Layer 0**: Bottom (background)

## External Preview

### Open in New Window

Click **↗️** to open preview in new window:

- **Full Size**: Displays at actual resolution
- **No Controls**: Clean view without UI
- **Independent**: Continues when main window changes

### OBS/vMix Ready

New window suitable for:
- Browser source capture
- Window capture
- NDI output (via tools)

## Page Selection

### From Playlist

1. Select page in playlist
2. Preview automatically loads
3. Content fields populate

### Direct Template

1. Use template browser
2. Select any template
3. Preview without playlist

### Auto-Loading

When project loads:
- Preview data fetched
- Templates prepared
- Ready for instant switching

## Best Practices

### Animation Testing

1. **Test All Phases**: Run IN, LOOP, and OUT
2. **Check Timing**: Verify animation duration
3. **Easing Review**: Ensure smooth motion
4. **Edge Cases**: Test with various content

### Composite Testing

1. **Stack Correctly**: Assign pages to right layers
2. **Check Overlap**: Verify no visual conflicts
3. **Toggle Layers**: Test with different combinations
4. **Match Output**: Compare to actual broadcast

### Content Review

1. **All Fields**: Check every content field
2. **Text Fitting**: Verify text doesn't overflow
3. **Image Quality**: Check image resolution
4. **Real Data**: Test with actual content

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Preview blank | Check page is selected |
| Animation not playing | Click Play In button |
| Content not updating | Check Content Editor sync |
| Wrong layer order | Verify layer assignments |
| Background not showing | Check background settings |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play In / Play Out toggle |
| `R` | Reset preview |
| `F` | Full playback |

## Related Features

- [Playlist](/docs/features/pulsar-playlist) - Page management
- [Loop Playback](/docs/features/pulsar-loop) - Continuous playback
- [Channels](/docs/features/pulsar-channels) - Output configuration
