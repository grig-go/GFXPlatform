---
sidebar_position: 1
---

# Channels

Channels represent the broadcast destinations where your content will be displayed. Pulsar MCR supports multiple channel types to integrate with various broadcast systems.

## Channel Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Unreal** | Unreal Engine integration | Real-time graphics and virtual sets |
| **Vizrt** | Vizrt graphics system | Traditional broadcast graphics |
| **Pixera** | Pixera media server | LED walls and projection mapping |
| **Web** | Web-based output | Digital signage and web displays |

## Creating a Channel

1. Navigate to the **Channels** page
2. Click the **Add Channel** button (+ icon)
3. In the dialog that appears:
   - Enter a **Name** for your channel
   - Select a **Type** from the dropdown
   - Add an optional **Description**
4. Click **Save** to create the channel

## Managing Channels

### Editing a Channel

1. Right-click on the channel in the grid
2. Select **Edit** from the context menu
3. Modify the channel properties
4. Click **Save**

### Deleting a Channel

1. Right-click on the channel in the grid
2. Select **Delete** from the context menu
3. Confirm the deletion when prompted

:::warning
Deleting a channel will also affect any playlists associated with it.
:::

## Channel Grid

The channels page displays all channels in an AG Grid with the following columns:

| Column | Description |
|--------|-------------|
| **Name** | Channel display name |
| **Type** | Channel type (Unreal, Vizrt, etc.) |
| **Description** | Optional description |
| **Created** | Creation timestamp |
| **Updated** | Last modified timestamp |

### Grid Features

- **Sorting** - Click column headers to sort
- **Filtering** - Use the filter row to search
- **Context Menu** - Right-click for actions
- **Inline Editing** - Double-click cells to edit
