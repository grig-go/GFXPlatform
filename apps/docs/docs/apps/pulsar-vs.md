---
sidebar_position: 4
---

# Pulsar VS (Virtual Sets)

Pulsar VS is the virtual studio control application for managing and controlling 3D virtual environments during live productions using Unreal Engine.

## Overview

Pulsar VS serves as the control surface for:
- **Virtual Set Control** - Real-time 3D environment manipulation
- **Playlist Management** - Organized scene sequencing with advanced scheduling
- **Multi-Channel Output** - Control multiple Unreal Engine instances
- **AI-Powered Assistance** - Intelligent scene suggestions and automation

## Interface Overview

### Main Workspace

```
┌─────────────────────────────────────────────────────────────┐
│  Header (Project, Apps, Tools, Window, Settings, Help)      │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│   Content     │            Virtual Set Preview              │
│   Browser     │                                             │
│               │                                             │
│               ├─────────────────────────────────────────────┤
│               │          Control Panel / Properties         │
└───────────────┴─────────────────────────────────────────────┘
```

### View Modes

Pulsar VS offers multiple view modes accessible from the Window menu:

| Mode | Description |
|------|-------------|
| **Single View** | Focus on the virtual set preview |
| **Content View** | Split view with content browser |
| **Playlist** | Full playlist management with calendar |

## Core Concepts

### Projects

Projects organize your virtual set configurations:
- Each project contains playlists, settings, and channel assignments
- Projects are shared across the organization
- Quick switching via the project selector dropdown

### Virtual Sets

Virtual sets are 3D environments rendered in Unreal Engine:
- Configure environment options (floor, walls, decorations)
- Adjust time of day and lighting
- Control camera positions and movements
- Real-time preview of all changes

### Channels

Channels represent connections to Unreal Engine instances:
- **Unreal Engine** - Direct connection to UE render nodes
- **Browser** - HTML5 output for web-based displays
- **NDI** - Network Device Interface for video routing

### Playlists

Playlists organize virtual set configurations:
- Sequence scenes for your production
- Schedule items with advanced time rules
- Group related items together
- Assign channel outputs per item

## Getting Started

### 1. Select a Project

1. Click the project dropdown in the header
2. Select an existing project or create new
3. Project settings load automatically

### 2. Configure Channels

1. Go to **Tools > Channels**
2. Add Unreal Engine endpoints
3. Test connections
4. Save channel configuration

### 3. Create a Playlist

1. Navigate to **Window > Playlist**
2. Click **Create Playlist**
3. Add pages from templates
4. Configure durations and scheduling

### 4. Control Virtual Set

1. Select a playlist item
2. View the virtual set preview
3. Adjust environment properties
4. Take changes live

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New playlist |
| `Ctrl+S` | Save changes |
| `Space` | Play/Pause |
| `Enter` | Take selected item live |
| `Escape` | Clear/Stop |
| `↑` / `↓` | Navigate playlist |
| `Delete` | Remove selected item |

Access all shortcuts via **Tools > Keyboard Shortcuts**.

## Integration

### With Nova GFX

Templates created in Nova GFX can be used as playlist items:
- Access shared template library
- Content fields remain editable
- Graphics overlay on virtual sets

### With Unreal Engine

Direct control of UE virtual sets:
- WebSocket connection to render nodes
- Real-time property updates
- Camera control and switching
- Scene transitions

### With Nova

Centralized data from Nova dashboards:
- Weather data for environment effects
- Sports data for stadium scenes
- Election data for news sets

## Next Steps

- [Virtual Sets](/pulsar-vs/virtual-sets) - Environment configuration
- [Playlists & Scheduling](/pulsar-vs/playlists) - Advanced playlist features
- [Channels](/pulsar-vs/channels) - Output configuration
- [AI Integration](/pulsar-vs/ai-integration) - AI-powered features
