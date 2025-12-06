---
sidebar_position: 2
---

# Pulsar GFX (Playout)

Pulsar GFX is the playout control application for managing and triggering graphics during live productions.

## Interface Overview

### Main Workspace

```
┌─────────────────────────────────────────────────────────────┐
│  Header (Project, Channel selector)                         │
├───────────────┬─────────────────────────┬───────────────────┤
│               │                         │                   │
│   Playlist    │       Preview           │   Content         │
│               │                         │   Editor          │
│               │                         │                   │
│               ├─────────────────────────┤                   │
│               │   Playback Controls     │                   │
└───────────────┴─────────────────────────┴───────────────────┘
```

### Left Panel - Playlist

Manage your rundown of graphics:
- Create and organize pages
- Drag to reorder
- Quick status indicators

### Center - Preview

Live preview of your graphics:
- Real-time rendering
- Animation playback controls
- Background customization

### Right Panel - Content Editor

Edit content fields for the selected page:
- Text content
- Image selection
- Map locations
- Dynamic data

## Core Concepts

### Pages

Pages are instances of templates with specific content. Each page:
- References a template design
- Has its own content payload
- Can be triggered independently

### Channels

Channels are output destinations. Configure multiple channels for:
- Different output resolutions
- Multiple streaming platforms
- Preview vs. Program outputs

### Playlists

Organize pages into playlists for:
- Sequenced playback
- Quick access during shows
- Scheduled automation

## Creating Pages

### From Templates

1. Click **Add Page** in the playlist
2. Select a template from the dropdown
3. The page inherits the template's design

### Editing Content

1. Select a page in the playlist
2. Use the Content Editor panel:
   - Edit text fields
   - Select images from media library
   - Set map locations
   - Configure data bindings

### Page States

| State | Description |
|-------|-------------|
| Ready | Page is loaded and ready to play |
| Playing | Currently animating IN or in LOOP |
| Out | Animating OUT |
| Hidden | Not visible on output |

## Playback Controls

### Animation Controls

| Button | Action |
|--------|--------|
| **Play IN** | Trigger the IN animation |
| **Play OUT** | Trigger the OUT animation |
| **Reset** | Return to initial state |
| **Loop** | Toggle continuous loop |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play IN / Play OUT (toggle) |
| `Enter` | Play IN selected page |
| `Escape` | Play OUT current page |
| `↑` / `↓` | Navigate playlist |

## Preview Modes

### Isolated Mode

Preview a single template/page:
- Focus on one graphic at a time
- Test animations independently
- Edit content with live preview

### Composite Mode

Preview multiple layers together:
- See how graphics stack
- Test layer interactions
- Match production output

## Output Configuration

### Browser Source URL

Generate URLs for OBS/vMix:

```
http://localhost:5173/preview?template={id}&obs=1&loop=0
```

Parameters:
- `template` - Template ID to display
- `obs` - OBS mode (hides controls)
- `loop` - Auto-loop animations
- `bg` - Background color (or 'transparent')

### Real-time Updates

Content updates are pushed via postMessage:
- No page refresh needed
- Instant text/image changes
- Smooth transitions

## Integration with Nova GFX

### Workflow

1. **Design** in Nova GFX
   - Create templates
   - Define animations
   - Set up content fields

2. **Playout** in Pulsar GFX
   - Create pages from templates
   - Fill in content
   - Trigger during show

### Syncing Changes

Changes made in Nova GFX are automatically available in Pulsar GFX:
- New templates appear immediately
- Design updates reflect in real-time
- No restart required

## Best Practices

### Production Workflow

1. **Pre-show**: Create all pages, verify content
2. **During show**: Use playlist for quick access
3. **Post-show**: Archive playlist for reference

### Content Management

- Use descriptive page names
- Organize by segment/topic
- Preview before going live

### Performance

- Keep one page playing per layer
- Use OUT animation before switching
- Monitor system resources
