---
sidebar_position: 7
---

# Scheduling

Pulsar MCR provides powerful scheduling capabilities for playlists, sponsors, and banners.

## Channel Schedules

Channel Schedules allow you to organize and schedule content for playback on your channels.

### Creating Playlists

1. Navigate to the **Channel Schedules** page
2. Select a channel from the left sidebar
3. Click **Add Playlist** button
4. Enter a **Name** for the playlist
5. Optionally select a **Carousel** to group related playlists
6. Click **Create**

### Adding Content to Playlists

1. Select a playlist from the list
2. Click **Add Content** or use the **Bucket Selector**
3. Browse the content hierarchy:
   - Expand folders to find content buckets
   - Select the bucket(s) you want to add
4. Click **Add** to include the content in your playlist

### Scheduling Playback

1. Select a playlist or content item in the schedule grid
2. Click the **Schedule** button or double-click to edit
3. Configure the schedule settings:

| Setting | Description |
|---------|-------------|
| **Start Time** | When playback begins |
| **End Time** | When playback ends |
| **Days of Week** | Which days the schedule is active |
| **Active** | Toggle the schedule on/off |

4. Click **Save** to apply the schedule

## Sponsor Scheduling

The Sponsors page manages sponsor media scheduling with time-based display rules.

### Creating Sponsor Schedules

1. Navigate to the **Sponsors** page
2. Click **Add Sponsor Schedule**
3. Configure the schedule:

| Field | Description |
|-------|-------------|
| **Name** | Descriptive name for the schedule |
| **Media** | Select sponsor image or video |
| **Start Time** | Time when sponsor begins displaying |
| **End Time** | Time when sponsor stops displaying |
| **Days** | Days of the week the schedule is active |
| **Active** | Toggle schedule on/off |

4. Preview the media selection
5. Click **Save**

### Time-Based Rules

#### Time Range
- Set specific **Start Time** and **End Time**
- Times are in 24-hour format
- Schedules repeat daily within the time range

#### Days of Week
- Check which days the schedule should be active
- Uncheck days to skip (e.g., weekends)
- Schedules automatically repeat each week

#### Examples

| Schedule | Start | End | Days |
|----------|-------|-----|------|
| Morning Show Sponsor | 06:00 | 09:00 | Mon-Fri |
| Weekend Special | 10:00 | 22:00 | Sat-Sun |
| Prime Time Ad | 19:00 | 23:00 | Daily |

## Banner Scheduling

The Banners page manages dynamic banner scheduling with trigger-based display rules.

### Creating Banner Schedules

1. Navigate to the **Banners** page
2. Click **Add Banner Schedule**
3. Configure:
   - **Name** - Banner schedule name
   - **Media** - Banner image or video
   - **Priority** - Display priority (higher = more important)
   - **Duration** - How long the banner displays
   - **Active** - Enable/disable the schedule
4. Click **Save**

### Trigger Configuration

Banners can be triggered by various conditions:

| Trigger Type | Description | Example |
|--------------|-------------|---------|
| **Time** | Display at specific times | Breaking news banner at top of hour |
| **Event** | Display on external events | Weather alert triggers |
| **Manual** | Manually activated | Operator-triggered announcements |
| **Data** | Based on data conditions | Score threshold triggers |

## Ticker Wizard

The Ticker Wizard helps you import ticker and template data from files quickly.

### Importing Ticker Data

1. Access the Ticker Wizard from the toolbar
2. **Step 1: Upload File**
   - Drag and drop or browse to select a file
   - Supported formats: CSV, Excel, JSON
3. **Step 2: Preview Data**
   - Review the imported data in the grid
   - Verify column detection

### Template Selection

1. **Select Target Template** - Choose from available templates
2. **Select Carousel** (optional) - Group imported data
3. **Select Target Bucket** - Choose where to create content items

### Data Mapping

1. Map imported columns to template fields
2. Configure import options:
   - **Create new items** vs. **Update existing**
   - **Duration** for new items
   - **Active status** default
3. Click **Import** to create content items
