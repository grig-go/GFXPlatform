---
sidebar_position: 9
---

# Loop Playback

Loop mode in Pulsar GFX provides automatic, continuous playback of pages with configurable timing and the ability to queue the next page.

## Overview

Loop playback provides:

- **Automatic Cycling**: Pages play in sequence continuously
- **Configurable Timing**: Set duration per page
- **Queue System**: Override the next page manually
- **Seamless Transitions**: Proper IN/OUT animations

## Enabling Loop Mode

1. Open playlist settings
2. Change mode to **Loop**
3. Configure default duration
4. Click Play to start

## Loop Control Bar

```
┌─────────────────────────────────────────────────────┐
│  🟣 Loop Mode                    Position: 3 / 12   │
│  [⏮ Prev] [▶ Play] [⏸ Pause] [⏹ Stop] [⏭ Next]    │
└─────────────────────────────────────────────────────┘
```

| Control | Action |
|---------|--------|
| **Previous** | Jump to previous page |
| **Play** | Start/resume loop playback |
| **Pause** | Pause at current page |
| **Stop** | Stop and reset to beginning |
| **Next** | Jump to next page |

## Playback Cycle

Each page follows this cycle:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   [Page Selected] ──▶ [Play IN] ──▶ [Hold/Loop]    │
│                                                     │
│         ▲                              │            │
│         │                              ▼            │
│         │                      [Wait Duration]      │
│         │                              │            │
│         │                              ▼            │
│   [Next Page] ◀── [Play OUT] ◀────────┘            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Cycle Steps

1. **Page Selected**: Current page identified
2. **Play IN**: IN animation plays
3. **Hold/Loop**: Page displays for duration
4. **Play OUT**: OUT animation plays
5. **Next Page**: Advances to next (or queued) page
6. **Repeat**: Cycle continues

## Duration Configuration

### Default Duration

Set in playlist settings:

```
Default Duration: [5000] ms
```

Applies to all pages without custom duration.

### Per-Page Duration

Override for specific pages:

1. Click page settings
2. Set custom duration
3. Page uses this instead of default

### Duration Hierarchy

```
Page Custom Duration (if set)
        ↓
Default Playlist Duration
        ↓
System Default (3000ms)
```

## Queue System

### Queueing Next Page

Override the natural sequence:

1. Find the page you want next
2. Click **Play Next** button
3. Button highlights to show queued
4. Page plays after current completes

### Queue Indicators

```
┌───────────────────────────────────────────────────┐
│ 🔴 Current Page (ON AIR)           [5s remaining] │
│    Next Page (Queued)              [▶ Play Next]  │
│    Another Page                    [▶ Play Next]  │
└───────────────────────────────────────────────────┘
```

### Dequeuing

Click **Play Next** again to dequeue:
- Button returns to normal
- Natural sequence resumes

## Flat Page List

Loop mode flattens the group hierarchy:

### Original Structure
```
▶ Group A
  ├─ Page 1
  └─ Page 2
▶ Group B
  ├─ Page 3
  └─ Page 4
```

### Flattened for Loop
```
1. Page 1
2. Page 2
3. Page 3
4. Page 4
→ Loops back to Page 1
```

Groups maintain visual organization but loop processes pages sequentially.

## Playback Controls

### Starting Loop

1. Switch to Loop mode
2. Optionally set starting page
3. Click **Play**
4. Loop begins from current/first page

### Pausing

Click **Pause** to:
- Stop at current page
- Current page stays on-air
- Timer pauses
- Resume continues from same point

### Stopping

Click **Stop** to:
- Play OUT on current page
- Reset to first page
- Clear timer
- Return to idle state

### Manual Navigation

**Previous/Next** buttons:
- Immediately transition
- Clears any queued page
- Loop continues from new position

## Timing Display

### Remaining Time

Shows time until next transition:

```
Page Name (ON AIR)              [3.2s remaining]
```

### Position Counter

Shows current position in sequence:

```
Position: 5 / 12
```

- **5**: Current page position
- **12**: Total pages in playlist

## Use Cases

### Digital Signage

Continuous display of information:

```
┌─────────────────────────────────────────┐
│ Welcome Message      │ 10s             │
│ Today's Events       │ 15s             │
│ Weather Forecast     │ 8s              │
│ Sponsor Messages     │ 5s each         │
└─────────────────────────────────────────┘
```

### Sports Replay

Cycling through statistics:

```
┌─────────────────────────────────────────┐
│ Team Stats           │ 8s              │
│ Player Highlights    │ 10s             │
│ Season Records       │ 8s              │
│ Upcoming Games       │ 6s              │
└─────────────────────────────────────────┘
```

### Breaking News

Rotating alerts:

```
┌─────────────────────────────────────────┐
│ Alert 1: Traffic     │ 10s             │
│ Alert 2: Weather     │ 10s             │
│ Alert 3: Sports      │ 10s             │
│ [Queue breaking news when it happens]  │
└─────────────────────────────────────────┘
```

## Modifying During Playback

### Safe Modifications

While loop is playing:
- ✅ Reorder pages via drag-drop
- ✅ Adjust default duration
- ✅ Queue different pages
- ✅ Edit page content

### Changes Take Effect

| Change | When Applied |
|--------|--------------|
| Page order | Next page selection |
| Duration | Next page |
| Content | Immediately (via preview sync) |
| Queue | Next transition |

## Best Practices

### Timing Considerations

- **Readability**: Allow enough time to read content
- **Pacing**: Match the energy of your content
- **Transitions**: Account for IN/OUT animation time

### Content Flow

- **Logical Order**: Arrange pages in meaningful sequence
- **Visual Variety**: Mix different graphic types
- **Smooth Transitions**: Ensure animations complement each other

### Monitoring

- **Watch Position**: Track where you are in the loop
- **Preview Queue**: Know what's coming next
- **Be Ready**: Have queue ready for breaking content

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `←` | Previous page |
| `→` | Next page |
| `Escape` | Stop loop |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Loop not starting | Check mode is set to Loop |
| Timing incorrect | Verify duration settings |
| Queue not working | Ensure page is in playlist |
| Transitions choppy | Check animation durations |
| Wrong order | Verify group flattening |

## Related Features

- [Playlist](/docs/features/pulsar-playlist) - Playlist management
- [Preview](/docs/features/pulsar-preview) - Testing pages
- [Channels](/docs/features/pulsar-channels) - Output configuration
