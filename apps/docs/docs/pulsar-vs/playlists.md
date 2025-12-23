---
sidebar_position: 2
---

# Playlists & Scheduling

Playlists in Pulsar VS organize your virtual set configurations into sequences with powerful scheduling capabilities.

## Overview

The Playlist system enables:
- Organized scene sequencing
- Advanced time-based scheduling
- Grouped items for complex shows
- Calendar view for long-term planning

## Playlist Interface

### Main View

```
┌─────────────────────────────────────────────────────────────┐
│  Playlists (3)              [+ Create] [Calendar] [Filter]  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Morning Show Playlist                          Active   ││
│  │ 12 items • Last updated: 2 hours ago                    ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ News at Noon                                   Ready    ││
│  │ 8 items • Last updated: Yesterday                       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Playlist Items

Each playlist contains items that can be:
- **Pages** - Template instances with content
- **Media** - Images or videos
- **Groups** - Collections of related items

## Creating Playlists

### New Playlist

1. Click **Create Playlist**
2. Enter a name and description
3. Configure default settings:
   - Loop enabled/disabled
   - Default duration
   - Auto-advance behavior

### Adding Items

#### From Templates

1. Click **Add Page** in the playlist
2. Browse available templates
3. Select and configure content
4. Set duration and channel

#### From Media Library

1. Click **Add Media**
2. Browse or search media assets
3. Select images or videos
4. Configure display duration

#### Creating Groups

1. Select multiple items
2. Right-click > **Group Items**
3. Name the group
4. Items play sequentially within the group

## Item Configuration

### Basic Properties

| Property | Description |
|----------|-------------|
| **Name** | Display name for the item |
| **Duration** | How long the item plays (seconds) |
| **Channel** | Output channel assignment |

### Content Fields

For page items, edit content fields:
- Text content
- Images from media library
- Data bindings
- Dynamic values

## Scheduling

### Schedule Types

Pulsar VS supports multiple scheduling modes:

| Type | Description |
|------|-------------|
| **Daily** | Plays every day at specified times |
| **Weekly** | Plays on selected days of the week |
| **Specific Dates** | Plays only on chosen dates |
| **Date Range** | Plays within a start/end date range |

### Time Windows

Define when items should play:

```
Time Windows:
├── 06:00 - 10:00 (Morning Block)
├── 12:00 - 14:00 (Noon Block)
└── 17:00 - 19:00 (Evening Block)
```

### Days of Week

Select active days for weekly scheduling:

- Monday through Sunday selection
- Common presets (Weekdays, Weekend)
- Custom combinations

### Exclusion Rules

Prevent playback during specific times:

- **Exclusion Dates** - Skip specific dates
- **Exclusion Times** - Skip time ranges

### Priority

When multiple items are scheduled for the same time:
- Higher priority items play first
- Equal priority uses playlist order
- Priority range: 1 (lowest) to 10 (highest)

## Calendar View

### Overview

The calendar provides a visual timeline of scheduled items:

```
┌─────────────────────────────────────────────────────────────┐
│  December 2025                              < Today >       │
├─────┬─────┬─────┬─────┬─────┬─────┬─────────────────────────┤
│ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat                     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────────────────────────┤
│     │  1  │  2  │  3  │  4  │  5  │  6                      │
│     │ ■■  │ ■■  │ ■■  │ ■■  │ ■■  │                         │
├─────┼─────┼─────┼─────┼─────┼─────┼─────────────────────────┤
│  7  │  8  │  9  │ 10  │ 11  │ 12  │ 13                      │
│     │ ■■  │ ■■  │ ■■  │ ■■  │ ■■  │                         │
└─────┴─────┴─────┴─────┴─────┴─────┴─────────────────────────┘
```

### Features

- **Day View** - Detailed hour-by-hour schedule
- **Week View** - Weekly overview
- **Month View** - Monthly planning
- **Click to Edit** - Select items to modify schedule

## Playback Control

### Manual Control

| Action | Description |
|--------|-------------|
| **Play** | Start playing selected item |
| **Pause** | Pause current playback |
| **Stop** | Stop and reset |
| **Next** | Advance to next item |
| **Previous** | Go to previous item |

### Auto-Advance

Configure automatic progression:

- **Enabled** - Automatically move to next item
- **Disabled** - Wait for manual advance
- **Loop** - Restart playlist when finished

### Live Indicator

Items currently on-air show:
- Green indicator badge
- Duration countdown
- Time remaining

## Drag and Drop

### Reordering

- Drag items to change order
- Drop between items to insert
- Hold Shift for multi-select drag

### Between Playlists

- Drag items between playlist panels
- Copy (Ctrl+Drag) or Move
- Maintains item configuration

### Into Groups

- Drag items onto a group to add
- Drag out of group to remove
- Collapse/expand groups

## Bulk Operations

### Multi-Select

Select multiple items for bulk actions:
- Click + Ctrl: Add to selection
- Click + Shift: Range selection
- Ctrl+A: Select all

### Bulk Actions

Available actions for multiple items:

| Action | Description |
|--------|-------------|
| **Set Channel** | Assign same channel to all |
| **Set Duration** | Apply same duration |
| **Delete** | Remove selected items |
| **Group** | Create group from selection |

## Best Practices

### Organization

- Use descriptive playlist names
- Group related items together
- Archive old playlists regularly
- Use consistent naming conventions

### Scheduling

- Test schedules before going live
- Account for timezone differences
- Set appropriate priorities
- Use exclusions for holidays/special events

### Performance

- Limit items per playlist (less than 100 recommended)
- Use groups for large sequences
- Archive completed playlists
- Regular cleanup of unused items

## Troubleshooting

### Item Not Playing at Scheduled Time

1. Verify schedule configuration
2. Check time zone settings
3. Confirm no exclusion rules apply
4. Verify playlist is active

### Wrong Item Playing

1. Check priority settings
2. Review overlapping schedules
3. Verify playlist order
4. Check group configuration

### Schedule Not Saving

1. Ensure valid time ranges
2. Check for conflicting rules
3. Verify network connection
4. Try refreshing the page
