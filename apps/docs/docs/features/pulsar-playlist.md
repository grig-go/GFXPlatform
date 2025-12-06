---
sidebar_position: 8
---

# Pulsar Playlist

The Playlist feature in Pulsar GFX provides comprehensive management of broadcast pages. Create playlists, organize pages into groups, and control playback during live productions.

## Overview

Playlists provide:

- **Page Organization**: Group and order pages for shows
- **Multiple Modes**: Manual, timed, and loop playback
- **Hierarchical Groups**: Nest related pages together
- **Channel Assignment**: Route pages to specific outputs
- **Real-time Control**: Play, stop, and transition live

## Playlist Panel Interface

```
┌─────────────────────────────────────────────────────┐
│  Playlist                              ⚙️  +  🔄    │
├─────────────────────────────────────────────────────┤
│  Mode: [Manual ▼]  Duration: [5000]ms              │
│  End Behavior: ( ) Stop (●) Hold ( ) Loop          │
├─────────────────────────────────────────────────────┤
│  ▶ Opening Segment                                  │
│    ├─ Welcome L3           [CH1] [▶ In] [⏹ Out]   │
│    └─ Host Introduction    [CH1] [▶ In] [⏹ Out]   │
│                                                     │
│  ▶ Main Content                                     │
│    ├─ Topic 1 GFX          [CH1] [▶ In] [⏹ Out]   │
│    ├─ Topic 2 GFX          [CH1] [▶ In] [⏹ Out]   │
│    └─ Interview Card       [CH1] [▶ In] [⏹ Out]   │
│                                                     │
│  ▶ Closing                                          │
│    ├─ Credits              [CH1] [▶ In] [⏹ Out]   │
│    └─ End Card             [CH1] [▶ In] [⏹ Out]   │
└─────────────────────────────────────────────────────┘
```

## Playlist Modes

### Manual Mode

Default mode for manual control:

- **User Triggered**: Click to play each page
- **Full Control**: Choose when to transition
- **Best For**: Live shows, unpredictable timing

### Timed Mode

Automatic playback with timing:

- **Duration Based**: Each page plays for set duration
- **Auto-Advance**: Moves to next page automatically
- **End Behavior**: Configure what happens at end

### Loop Mode

Continuous cycling through pages:

- **Automatic Transitions**: Pages cycle continuously
- **Configurable Timing**: Set duration per page
- **Queue Next**: Override next page manually

See [Loop Playback](/docs/features/pulsar-loop) for details.

## Playlist Settings

### Duration

Set default page duration (milliseconds):

| Setting | Value | Use Case |
|---------|-------|----------|
| Quick | 3000 | Fast-paced content |
| Normal | 5000 | Standard timing |
| Extended | 10000 | Complex graphics |

Individual pages can override this default.

### End Behavior (Timed Mode)

| Behavior | Description |
|----------|-------------|
| **Stop** | Playlist stops after last page |
| **Hold** | Last page stays on-air |
| **Loop** | Automatically restart from beginning |

## Creating Playlists

### New Playlist

1. Click **+** in the playlist panel header
2. Enter playlist name
3. Configure default settings
4. Playlist appears as new tab

### Multiple Playlists

- Open multiple playlists as tabs
- Switch between playlists during show
- Each playlist maintains its own state

## Working with Pages

### Adding Pages

1. Drag templates from library to playlist
2. Or click **+ Add Page** button
3. Select template from dropdown

### Page Properties

| Property | Description |
|----------|-------------|
| **Name** | Display name (from template or custom) |
| **Template** | Source template reference |
| **Channel** | Output destination |
| **Duration** | Override default duration (optional) |
| **Payload** | Content field values |

### Page Actions

| Button | Action |
|--------|--------|
| **▶ In** | Play IN animation |
| **⏹ Out** | Play OUT animation |
| **Channel** | Select output channel |
| **Edit** | Open content editor |
| **Delete** | Remove from playlist |

## Organizing with Groups

### Creating Groups

1. Click **+ Add Group** button
2. Enter group name
3. Drag pages into group

### Group Structure

```
▶ Group Name
  ├─ Page 1
  ├─ Page 2
  └─ Nested Group
      ├─ Page 3
      └─ Page 4
```

### Group Actions

- **Expand/Collapse**: Click arrow to toggle
- **Reorder**: Drag groups to reposition
- **Rename**: Double-click group name
- **Delete**: Remove group (pages move up)

## Channel Assignment

### Assigning Channels

1. Click channel dropdown on page row
2. Select from available channels
3. Page routes to that channel when played

### Multi-Channel Workflow

```
Page A → Channel 1 (Main Program)
Page B → Channel 2 (Preview)
Page C → Channel 1 (Main Program)
```

### Channel Status

Status indicators show channel health:

| Status | Indicator | Meaning |
|--------|-----------|---------|
| Connected | 🟢 | Ready for playback |
| Connecting | 🟡 | Establishing connection |
| Disconnected | ⚫ | Not available |

## Playback Control

### Playing Pages

**Manual Mode:**
1. Click **▶ In** to play IN animation
2. Page enters LOOP state
3. Click **⏹ Out** to play OUT animation

**Timed Mode:**
1. Click Play to start sequence
2. Pages auto-advance after duration
3. Click Stop to halt sequence

### On-Air Indicators

```
┌───────────────────────────────────────────────────┐
│ 🔴 Page Name (ON AIR)          [CH1] [⏹ Out]     │
└───────────────────────────────────────────────────┘
```

- **Red dot**: Page is currently on-air
- **Highlighted row**: Currently playing
- **Status column**: Shows animation phase

## Filtering and Search

### Filter Options

- **By Name**: Search page or template name
- **By Layer Type**: Filter by fullscreen, lower-third, etc.
- **By Channel**: Show only pages for specific channel

### Quick Filters

```
Filter: [________________] [All Types ▼] [All Channels ▼]
```

## Drag and Drop

### Reordering Pages

1. Click and hold page row
2. Drag to new position
3. Drop zone highlights valid locations
4. Release to reorder

### Moving Between Groups

1. Drag page over target group
2. Group expands to show insertion points
3. Release to move into group

### Reordering Groups

1. Click and hold group header
2. Drag to new position
3. Child items move with group

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `↑` / `↓` | Navigate pages |
| `Enter` | Play IN selected page |
| `Escape` | Play OUT current page |
| `Space` | Play/Pause (timed mode) |
| `Delete` | Remove selected page |

## Best Practices

### Pre-Show Setup

1. **Create Playlist**: Name for the show
2. **Add All Pages**: Import needed templates
3. **Organize Groups**: Group by segment
4. **Assign Channels**: Route to outputs
5. **Fill Content**: Edit page payloads
6. **Test**: Run through in preview

### During Show

1. **Follow Rundown**: Use groups as guide
2. **Watch Status**: Monitor on-air indicators
3. **Pre-cue**: Select next page before transition
4. **Use Keyboard**: Faster than mouse clicks

### Post-Show

1. **Save Playlist**: Keep for reference
2. **Archive**: Store for future shows
3. **Review**: Note what worked/didn't

## Common Workflows

### News Show

```
▶ Pre-Show
  └─ Countdown Timer

▶ Opening
  ├─ Intro Animation
  └─ Anchor Name L3

▶ Story 1
  ├─ Story Title GFX
  ├─ Reporter Name L3
  └─ Location Map

▶ Story 2
  └─ [Similar structure]

▶ Closing
  ├─ Credits Roll
  └─ End Card
```

### Sports Event

```
▶ Pre-Game
  ├─ Matchup Card
  └─ Team Lineups

▶ In-Game (Loop Mode)
  ├─ Score Bug [Always On]
  ├─ Player Stats
  └─ Replay Overlay

▶ Post-Game
  ├─ Final Score
  └─ Post-Game Analysis
```

## Related Features

- [Loop Playback](/docs/features/pulsar-loop) - Continuous loop mode
- [Preview](/docs/features/pulsar-preview) - Testing pages
- [Channels](/docs/features/pulsar-channels) - Output configuration
