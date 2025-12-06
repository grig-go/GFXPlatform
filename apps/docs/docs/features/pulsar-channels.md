---
sidebar_position: 11
---

# Pulsar Channels

Channels in Pulsar GFX represent broadcast output destinations. Configure and manage channels for routing graphics to video outputs, streaming software, and production systems.

## Overview

Channels provide:

- **Output Routing**: Send graphics to specific destinations
- **Status Monitoring**: Real-time connection status
- **Multi-Output**: Support for multiple simultaneous outputs
- **Player Management**: Control remote player instances

## Accessing Channels

1. Click **Channels** in the header menu
2. Or use the keyboard shortcut
3. Channels modal opens

## Channels Modal

```
┌─────────────────────────────────────────────────────┐
│  Channels                                  🔄  ✕    │
├─────────────────────────────────────────────────────┤
│  🟢 Main Output (CH1)                 Fill         │
│     URL: http://localhost:5173/player/abc123       │
│     [📋 Copy URL] [▶ Open Player] [🗑️ Delete]      │
│                                                     │
│  🟢 Preview Monitor (CH2)              OBS         │
│     URL: http://localhost:5173/player/def456       │
│     [📋 Copy URL] [▶ Open Player] [🗑️ Delete]      │
│                                                     │
│  ⚫ Backup Output (CH3)            Disconnected    │
│     URL: http://localhost:5173/player/ghi789       │
│     [📋 Copy URL] [▶ Open Player] [🗑️ Delete]      │
├─────────────────────────────────────────────────────┤
│  + New Channel                                      │
└─────────────────────────────────────────────────────┘
```

## Creating Channels

### New Channel Form

```
┌─────────────────────────────────────────────────────┐
│  + New Channel                                      │
├─────────────────────────────────────────────────────┤
│  Name:  [Main Output               ]                │
│  Code:  [CH1 ]  (auto-uppercase)                   │
│                                                     │
│  Mode:                                              │
│  (●) Fill        Standard video output             │
│  ( ) Fill + Key  Fill and alpha key outputs        │
│  ( ) OBS         Browser source mode               │
│                                                     │
│                             [Create Channel]        │
└─────────────────────────────────────────────────────┘
```

### Channel Properties

| Property | Description |
|----------|-------------|
| **Name** | Display name (e.g., "Main Output") |
| **Code** | Unique identifier (e.g., "CH1") |
| **Mode** | Output type |

### Channel Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Fill** | Video fill output only | Standard NDI/SDI output |
| **Fill + Key** | Fill and alpha key | Downstream keying systems |
| **OBS** | Browser source mode | OBS Studio, vMix, Wirecast |

## Channel Status

### Status Indicators

| Status | Indicator | Description |
|--------|-----------|-------------|
| Connected | 🟢 Green | Player connected and ready |
| Connecting | 🟡 Yellow | Establishing connection |
| Error | 🔴 Red | Connection failed |
| Disconnected | ⚫ Gray | No player connected |

### Status Monitoring

The system tracks:

- **Connection Status**: Real-time player health
- **Last Heartbeat**: Time since last communication
- **Loaded Project**: Project currently on player
- **Last Initialized**: When player was last set up

## Player URLs

### URL Format

```
{origin}/player/{channelId}
```

Example:
```
http://localhost:5173/player/abc123-def456-ghi789
```

### Using Player URLs

1. **Copy URL**: Click 📋 to copy to clipboard
2. **Open Player**: Click ▶ to open in new tab
3. **Browser Source**: Paste URL in OBS/vMix

## Channel Actions

### Copy URL

Copies the player URL to clipboard:

1. Click **📋 Copy URL**
2. URL copied
3. Paste into streaming software

### Open Player

Opens player in new browser tab:

1. Click **▶ Open Player**
2. New tab opens with player
3. Player connects to channel

### Delete Channel

Removes channel from system:

1. Click **🗑️ Delete**
2. Confirm deletion
3. Channel removed

### Refresh

Click **🔄** to reload channel list from database.

## Playlist Integration

### Assigning Channels to Pages

In the playlist, each page has a channel selector:

```
Page Name                    [CH1 ▼] [▶ In] [⏹ Out]
```

### Playback Routing

When you play a page:

1. Page triggers on assigned channel
2. Player receives command
3. Graphics render on output
4. Status updates in playlist

## Command System

### How Commands Work

```
Pulsar GFX ──▶ Command Queue ──▶ Player
     │                              │
     └──── Status Updates ◀─────────┘
```

### Command Types

| Command | Description |
|---------|-------------|
| **initialize** | Set up player with project |
| **load** | Load specific template |
| **play** | Trigger IN animation |
| **update** | Update content values |
| **stop** | Trigger OUT animation |
| **clear** | Immediately clear output |
| **clear_all** | Clear all layers |

## Multi-Layer Support

### Layer Configuration

Each channel supports multiple layers:

```
Channel: Main Output (CH1)
├─ Layer 0: Background
├─ Layer 1: Lower Third
├─ Layer 2: Score Bug
└─ Layer 3: Alert Overlay
```

### Layer Assignment

When playing pages, specify the layer:

- **Auto-Assign**: Based on template layer type
- **Manual**: Override layer assignment
- **Stacking**: Multiple pages on different layers

## Output Configurations

### Standard Broadcast

```
┌─────────────────────────────────────────┐
│ Channel: Program (CH1)                  │
│ Mode: Fill                              │
│ Output: NDI via Flux                    │
│                                         │
│ Channel: Preview (CH2)                  │
│ Mode: Fill                              │
│ Output: Monitor via Flux                │
└─────────────────────────────────────────┘
```

### OBS Integration

```
┌─────────────────────────────────────────┐
│ Channel: Lower Thirds (LT1)             │
│ Mode: OBS                               │
│ OBS Source: Browser Source              │
│                                         │
│ Channel: Full Screens (FS1)             │
│ Mode: OBS                               │
│ OBS Source: Browser Source              │
└─────────────────────────────────────────┘
```

### Fill + Key Setup

```
┌─────────────────────────────────────────┐
│ Channel: Keyed Output (KEY1)            │
│ Mode: Fill + Key                        │
│ Fill Output: SDI 1 via Flux             │
│ Key Output: SDI 2 via Flux              │
└─────────────────────────────────────────┘
```

## Best Practices

### Channel Naming

Use descriptive, consistent names:

- ✅ "Main Program"
- ✅ "Preview Monitor"
- ✅ "Backup Output"
- ❌ "Channel 1"
- ❌ "Output"

### Channel Codes

Keep codes short and memorable:

- ✅ "CH1", "PREV", "BU"
- ❌ "CHANNEL_ONE", "MainOutput123"

### Mode Selection

| Scenario | Recommended Mode |
|----------|------------------|
| NDI/SDI output | Fill |
| Downstream keyer | Fill + Key |
| OBS/vMix | OBS |
| Streaming direct | OBS |

### Redundancy

Set up backup channels:

```
Primary: CH1 (Fill) → Main SDI
Backup:  CH2 (Fill) → Backup SDI
Preview: CH3 (OBS)  → Confidence monitor
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Channel disconnected | Refresh player window |
| Commands not executing | Check player status |
| Wrong output | Verify channel assignment |
| No video | Check player URL is correct |
| Delayed response | Check network connection |

### Connection Recovery

If channel disconnects:

1. Click **Refresh** (🔄) in modal
2. Open player again if needed
3. Player auto-reconnects
4. Status updates to Connected

### Player Not Loading

1. Verify URL is correct
2. Check browser console for errors
3. Ensure project is loaded
4. Try refreshing player

## Advanced Configuration

### Channel Locking

Prevent concurrent control:

- **Lock**: Channel marked as controlled
- **Unlock**: Release for other users
- **Force Unlock**: Admin override

### Auto-Initialize

| Setting | Behavior |
|---------|----------|
| On Connect | Initialize when player connects |
| On Publish | Initialize before first playback |

## Related Features

- [Playlist](/docs/features/pulsar-playlist) - Page management
- [Preview](/docs/features/pulsar-preview) - Testing output
- [Loop Playback](/docs/features/pulsar-loop) - Automated playback
