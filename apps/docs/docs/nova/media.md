---
sidebar_position: 6
---

# Media Library

The Media Library provides centralized asset management for images, videos, audio, and other media files.

## Overview

Manage media assets with:
- Upload and organize files
- AI-generated content tracking
- Tagging and categorization
- Geolocation support
- Bulk operations
- Distribution tracking

## Interface

```
┌─────────────────────────────────────────────────────────────┐
│  Media Library            Upload | Folders | Filter | Search│
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  Folders   │   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐         │
│            │   │     │  │     │  │     │  │     │         │
│  - Images  │   │ IMG │  │ IMG │  │ VID │  │ IMG │         │
│  - Videos  │   │     │  │     │  │     │  │     │         │
│  - Audio   │   └─────┘  └─────┘  └─────┘  └─────┘         │
│  - AI Gen  │                                                │
│            │   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐         │
│            │   │     │  │     │  │     │  │     │         │
│            │   │ IMG │  │ AUD │  │ IMG │  │ IMG │         │
│            │   │     │  │     │  │     │  │     │         │
│            │   └─────┘  └─────┘  └─────┘  └─────┘         │
│            │                                                │
└────────────┴────────────────────────────────────────────────┘
```

## Features

### Upload

#### Supported Formats

**Images**
- JPEG, PNG, GIF, WebP
- SVG
- BMP, TIFF

**Video**
- MP4, WebM, MOV
- AVI, MKV

**Audio**
- MP3, WAV, AAC
- OGG, FLAC

**Documents**
- PDF
- JSON, XML

#### Upload Methods
- Drag and drop
- File browser
- Paste from clipboard
- URL import

#### Bulk Upload
Upload multiple files simultaneously:
1. Select or drag multiple files
2. Apply common metadata
3. Choose destination folder
4. Monitor upload progress

### Organization

#### Folders
Create folder hierarchy:
- Nested folders supported
- Move assets between folders
- Folder permissions

#### Tags
Categorize with tags:
- Create custom tags
- Multi-tag assets
- Tag-based search
- Tag management

#### Smart Collections
Auto-organized collections:
- By file type
- By date
- By source
- By AI-generated status

### Asset Details

View and edit asset metadata:

| Field | Description |
|-------|-------------|
| Name | File name |
| Type | MIME type |
| Size | File size |
| Dimensions | Width x Height (images/video) |
| Duration | Length (video/audio) |
| Created | Upload date |
| Modified | Last modified |
| Tags | Associated tags |
| Location | Geolocation data |

### Geolocation

Add location data to assets:
- Map picker interface
- Coordinate input
- Location search
- Bulk location assignment

Use cases:
- News story locations
- Weather reporting locations
- Sports venue locations

### AI-Generated Content

Track AI-created assets:
- AI generation source
- Prompt used
- Generation date
- Model information

Filter to view:
- AI-generated only
- Human-created only
- Mixed

## Search and Filter

### Search
- Filename search
- Tag search
- Full-text search
- Metadata search

### Filters
| Filter | Options |
|--------|---------|
| Type | Image, Video, Audio, Document |
| Date | Today, This Week, Custom Range |
| Size | Small, Medium, Large, Custom |
| Source | Upload, AI, Import |
| Tags | Select tags |
| Location | Has location / No location |

### Sorting
- Name (A-Z, Z-A)
- Date (Newest, Oldest)
- Size (Largest, Smallest)
- Type

## Bulk Operations

Select multiple assets for:
- Move to folder
- Add tags
- Remove tags
- Delete
- Export
- Set location

## Distribution

Track where assets are used:
- Graphics projects
- Templates
- Output channels
- External systems

### Distribution Settings
- Auto-sync to channels
- Format conversion
- Resolution scaling
- CDN integration

## Preview

### Image Preview
- Zoom and pan
- Full-screen view
- Metadata overlay

### Video Preview
- Built-in player
- Timeline scrubbing
- Frame extraction
- Thumbnail generation

### Audio Preview
- Waveform display
- Playback controls
- Volume adjustment

## Integration

### Graphics Projects
Use assets in Nova GFX:
- Browse library from designer
- Drag assets to canvas
- Automatic path resolution

### Channels
Distribute to output channels:
- Automatic format conversion
- Resolution optimization
- CDN upload

### API Access
```typescript
// Fetch assets
const assets = await mediaService.getAssets({
  folder: 'images',
  tags: ['news', 'breaking'],
  limit: 20
});

// Upload asset
const uploaded = await mediaService.upload(file, {
  folder: 'uploads',
  tags: ['imported']
});
```

## Storage

### Quotas
- Storage limits per organization
- Usage tracking
- Quota alerts

### Cleanup
- Delete unused assets
- Archive old assets
- Duplicate detection

## Best Practices

### Organization
- Use consistent naming conventions
- Create logical folder structure
- Tag assets thoroughly
- Add location data when relevant

### Performance
- Optimize image sizes before upload
- Use appropriate formats
- Compress video files
- Set up CDN for distribution

### Maintenance
- Review unused assets regularly
- Archive old content
- Check for duplicates
- Validate asset links

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `U` | Upload |
| `N` | New folder |
| `Delete` | Delete selected |
| `T` | Add tags |
| `Enter` | Open preview |
| `Esc` | Close preview |
| `Ctrl+A` | Select all |

## Next Steps

- [Data Sources](/nova/data-sources) - Configure providers
- [Field Overrides](/nova/overrides) - Data correction system
- [Permissions](/nova/permissions) - User access control
