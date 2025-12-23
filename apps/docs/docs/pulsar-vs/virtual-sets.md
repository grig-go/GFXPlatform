---
sidebar_position: 1
---

# Virtual Sets

Virtual Sets in Pulsar VS provide real-time control over 3D environments rendered in Unreal Engine.

## Overview

The Virtual Set interface allows you to:
- Configure environment elements (floors, walls, decorations)
- Adjust lighting and time of day
- Control camera positions
- Preview changes in real-time

## Interface

### Virtual Set Preview

The main preview area shows a live render from Unreal Engine:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                   Virtual Set Preview                        │
│                                                             │
│           (Real-time Unreal Engine render)                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Status: Connected │ Resolution: 1920x1080 │ FPS: 60       │
└─────────────────────────────────────────────────────────────┘
```

### Control Panel

Below the preview, the control panel provides access to:
- Environment options
- Lighting controls
- Camera selection
- Quick actions

## Environment Options

### Floor Options

Configure the studio floor appearance:

| Option | Description |
|--------|-------------|
| **Base Floor** | Primary floor material/texture |
| **Floor Overlay** | Additional floor graphics |
| **Reflectivity** | Floor reflection intensity |

### Wall Options

Control the virtual walls:

| Option | Description |
|--------|-------------|
| **Wall Left** | Left wall configuration |
| **Wall Back** | Back wall/backdrop |
| **Wall Right** | Right wall configuration |

### Decorations

Add set dressing elements:

| Element | Description |
|---------|-------------|
| **Deco Down** | Lower set decorations |
| **Deco Top** | Upper set decorations |
| **Element Down** | Ground-level props |
| **Element Middle** | Mid-height elements |
| **Element Top** | Overhead elements |

## Lighting & Environment

### Time of Day

Control the environmental lighting:

- **Morning** - Warm sunrise lighting
- **Day** - Bright daylight
- **Evening** - Golden hour warmth
- **Night** - Studio lighting with dark exterior

### Background

Configure the environment background:

- Cyclorama (solid color)
- Virtual environment (outdoor scenes)
- LED wall simulation
- Custom HDRI

## Camera Control

### Preset Cameras

Quick access to predefined camera positions:

| Preset | Description |
|--------|-------------|
| **Wide** | Full set overview |
| **Medium** | Standard presenter shot |
| **Close** | Tight framing |
| **Two-shot** | Multiple presenter view |

### Manual Control

Fine-tune camera parameters:
- Position (X, Y, Z)
- Rotation (Pan, Tilt, Roll)
- Field of View
- Focus distance

## Real-Time Updates

### How It Works

1. Changes made in Pulsar VS are sent via WebSocket
2. Unreal Engine receives commands immediately
3. Scene updates render in real-time
4. Preview reflects actual output

### Connection Status

The status bar shows connection health:

| Status | Meaning |
|--------|---------|
| **Connected** | Active connection to UE |
| **Reconnecting** | Attempting to restore connection |
| **Disconnected** | No connection to render node |

## Working with Virtual Sets

### Selecting Options

1. Open the environment panel
2. Browse available options per category
3. Click to select an option
4. Preview updates immediately

### Saving Configurations

Virtual set configurations are saved:
- Per playlist item (item-specific settings)
- Per project (default settings)
- As presets (reusable configurations)

### Live Updates

When a playlist item is live:
1. Changes are applied immediately to output
2. Smooth transitions between states
3. No interruption to the broadcast

## Best Practices

### Pre-Production

- Configure and save set presets before show
- Test all camera positions
- Verify lighting looks good on talent
- Create fallback configurations

### During Production

- Use presets for quick changes
- Monitor connection status
- Have backup channel ready
- Communicate changes with director

### Performance

- Limit simultaneous changes
- Use optimized assets
- Monitor render node resources
- Close unnecessary preview windows

## Troubleshooting

### Preview Not Updating

1. Check connection status
2. Verify channel configuration
3. Ensure UE project is running
4. Check network connectivity

### Slow Response

1. Check render node performance
2. Reduce preview quality temporarily
3. Close other resource-heavy applications
4. Verify network bandwidth

### Visual Artifacts

1. Reset the scene
2. Reload the virtual set
3. Restart the UE instance
4. Check asset integrity
