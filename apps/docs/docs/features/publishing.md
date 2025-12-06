---
sidebar_position: 3
---

# Publishing & Channels

Nova GFX's publishing system sends your graphics to broadcast channels for live output. This guide covers the publish workflow and channel management.

## Publishing Overview

Publishing connects your designed templates to output destinations:

1. **Select Channels**: Choose where to send graphics
2. **Configure Options**: Set playback behavior
3. **Publish**: Send template to channel players
4. **Control**: Play IN/OUT animations remotely

## Publish Modal

Access the Publish modal from the top bar or use keyboard shortcut.

```
┌─────────────────────────────────────────────────────┐
│  Publish to Channels                           ✕    │
├─────────────────────────────────────────────────────┤
│  Template: Lower Third - John Smith                 │
├─────────────────────────────────────────────────────┤
│  Select Channels                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ ☑️  🟢 Main Output      (CH1)   Connected   │   │
│  │ ☑️  🟡 Preview Monitor  (CH2)   Connecting  │   │
│  │ ☐  ⚫ Backup Output    (CH3)   Disconnected│   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Options                                            │
│  ☑️  Play immediately after publish                 │
│  ☐  Debug mode (show status overlay)               │
├─────────────────────────────────────────────────────┤
│  Player URL: http://localhost:5173/player/abc123    │
├─────────────────────────────────────────────────────┤
│  [Stop (OUT)]  [Clear]           [Close] [Publish]  │
└─────────────────────────────────────────────────────┘
```

## Channel Selection

### Channel Status Indicators

| Status | Indicator | Description |
|--------|-----------|-------------|
| Connected | 🟢 Green | Player is connected and ready |
| Connecting | 🟡 Yellow | Player is establishing connection |
| Error | 🔴 Red | Connection failed |
| Disconnected | ⚫ Gray | Player not connected |

### Multi-Channel Selection

- Check multiple channels to publish to all simultaneously
- First channel auto-selects if none selected
- Different channels can run different content

## Publish Options

### Play Immediately

When enabled (default):
- Template loads and immediately plays IN animation
- Useful for quick playout during live shows

When disabled:
- Template loads but stays in IDLE state
- Use remote controls to trigger animations

### Debug Mode

When enabled:
- Shows status overlay in player window
- Displays animation phase, frame rate, connection status
- Useful for troubleshooting

## Player Controls

Once published, control playback remotely:

| Button | Action |
|--------|--------|
| **Stop (OUT)** | Plays OUT animation on all live channels |
| **Clear** | Immediately clears channels (no animation) |
| **Publish** | Send template to selected channels |
| **Close** | Close modal (channels stay live) |

## Player Windows

When you publish:

1. **New Window**: Player opens in new browser tab
2. **Per Channel**: One window per channel
3. **Full Screen**: Player can be fullscreened
4. **Auto-Close Detection**: Closing window triggers stop command

### Player URL Format

```
{origin}/player/{channelId}
```

Parameters available:
- `template` - Template ID
- `obs` - OBS mode (1 = hide controls)
- `loop` - Auto-loop (1 = enabled)
- `bg` - Background color

## Channels Management

### Channels Modal

Access from the top bar menu to manage channels:

```
┌─────────────────────────────────────────────────────┐
│  Channels                                  🔄  ✕    │
├─────────────────────────────────────────────────────┤
│  🟢 Main Output (CH1)                 Fill         │
│     [📋 Copy URL] [▶ Open Player] [🗑️ Delete]      │
│                                                     │
│  🟢 Preview (CH2)                     OBS          │
│     [📋 Copy URL] [▶ Open Player] [🗑️ Delete]      │
├─────────────────────────────────────────────────────┤
│  + New Channel                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Name: [________________]                     │   │
│  │ Code: [____]                                 │   │
│  │ Mode: (●) Fill  ( ) Fill+Key  ( ) OBS       │   │
│  │                              [Create Channel]│   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Creating a Channel

1. Click **+ New Channel**
2. Enter a descriptive name (e.g., "Main Output")
3. Enter a channel code (e.g., "CH1") - auto-uppercased
4. Select output mode
5. Click **Create Channel**

### Channel Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Fill** | Video fill output only | Standard video output |
| **Fill + Key** | Fill and alpha key outputs | Downstream keying systems |
| **OBS** | Browser source mode | OBS Studio, vMix integration |

### Channel Actions

| Action | Description |
|--------|-------------|
| **Copy URL** | Copy player URL to clipboard |
| **Open Player** | Open player in new browser tab |
| **Delete** | Remove channel from system |
| **Refresh** | Reload channel list |

## Channel Configuration

### Channel Properties

| Property | Description |
|----------|-------------|
| `name` | Display name |
| `channel_code` | Unique identifier (e.g., CH1) |
| `channel_mode` | Output type (fill, fill_key, obs) |
| `player_status` | Connection status |

### Status Monitoring

Channels track:
- **Connection Status**: Real-time player health
- **Last Heartbeat**: Time since last communication
- **Loaded Project**: Currently loaded project on player

## Integration Workflows

### OBS Integration

1. Create channel with **OBS** mode
2. Copy the player URL
3. In OBS, add **Browser Source**
4. Paste the player URL
5. Set dimensions to match project canvas

### NDI/SDI Output (via Flux)

1. Create channel with **Fill** or **Fill+Key** mode
2. Open player URL in Flux renderer
3. Configure NDI/SDI output in Flux
4. Graphics render to professional video outputs

### Multi-Output Setup

```
Channel 1 (CH1): Main Program - Fill mode
  └─ Flux → SDI Output 1

Channel 2 (CH2): Preview Monitor - OBS mode
  └─ OBS → Preview window

Channel 3 (CH3): Backup - Fill mode
  └─ Flux → SDI Output 2 (redundancy)
```

## Best Practices

### Channel Setup

- **Descriptive Names**: Use clear names (Main Output, Preview, etc.)
- **Consistent Codes**: Use logical codes (CH1, CH2, PREV)
- **Mode Selection**: Match mode to output destination

### Publishing Workflow

1. **Verify Template**: Preview before publishing
2. **Check Channels**: Ensure channels are connected
3. **Test Run**: Test with debug mode first
4. **Monitor**: Watch player status during show

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Channel disconnected | Refresh player window |
| Animation not playing | Check "Play immediately" option |
| Wrong channel | Verify channel selection |
| Slow response | Check network connection |

## Related Features

- [Preview](/docs/features/preview) - Testing before publish
- [OBS Integration](/docs/integration/obs) - OBS setup guide
- [vMix Integration](/docs/integration/vmix) - vMix setup guide
