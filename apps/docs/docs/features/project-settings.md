---
sidebar_position: 7
---

# Project Settings

Project Settings configure canvas dimensions, frame rate, background, and integrations for your Nova GFX project.

## Accessing Settings

1. Click the **⚙️** settings icon in the top bar
2. Select **Project Settings**
3. Or use keyboard shortcut

## Settings Tabs

### General Tab

```
┌─────────────────────────────────────────────────────┐
│  General Settings                                   │
├─────────────────────────────────────────────────────┤
│  Project Name                                       │
│  [My News Graphics Package              ]           │
│                                                     │
│  Description                                        │
│  [Graphics package for evening news show           │
│   including lower thirds, full screens,            │
│   and score bugs.                       ]          │
│                                                     │
│  URL Slug                                          │
│  [my-news-graphics-package    ] [🔄 Generate]       │
│                                                     │
│  Publish URL                                        │
│  https://app.nova-gfx.com/p/my-news-graphics  [📋]  │
└─────────────────────────────────────────────────────┘
```

#### Properties

| Property | Description |
|----------|-------------|
| **Project Name** | Display name for the project |
| **Description** | Long-form description (optional) |
| **URL Slug** | Unique URL identifier |
| **Publish URL** | Public access URL |

#### URL Slug

- Auto-generated from project name
- Lowercase, alphanumeric, hyphens only
- Maximum 50 characters
- Click **Generate** to regenerate from name

### Canvas Tab

```
┌─────────────────────────────────────────────────────┐
│  Canvas Settings                                    │
├─────────────────────────────────────────────────────┤
│  Presets                                            │
│  [1080p HD] [720p HD] [4K UHD]                      │
│  [1080p Vertical] [Social Square]                   │
├─────────────────────────────────────────────────────┤
│  Custom Dimensions                                  │
│  Width:  [1920] px    Height: [1080] px            │
│  Range: 100 - 7680 px                              │
├─────────────────────────────────────────────────────┤
│  Frame Rate                                         │
│  [24] [25] [30] [50] [60] fps                      │
│  Current: 30 fps                                   │
├─────────────────────────────────────────────────────┤
│  Background Color                                   │
│  [#000000          ] [🎨] [Transparent]             │
│                                                     │
│  Preview: ████████████                              │
└─────────────────────────────────────────────────────┘
```

#### Canvas Presets

| Preset | Dimensions | Aspect Ratio | Use Case |
|--------|------------|--------------|----------|
| **1080p HD** | 1920 × 1080 | 16:9 | Standard broadcast HD |
| **720p HD** | 1280 × 720 | 16:9 | Lower bandwidth HD |
| **4K UHD** | 3840 × 2160 | 16:9 | Ultra HD broadcast |
| **1080p Vertical** | 1080 × 1920 | 9:16 | Mobile/social vertical |
| **Social Square** | 1080 × 1080 | 1:1 | Instagram/social |

#### Custom Dimensions

- **Width**: 100 - 7680 pixels
- **Height**: 100 - 7680 pixels
- Supports any aspect ratio

#### Frame Rate

| Rate | Use Case |
|------|----------|
| **24 fps** | Film/cinema look |
| **25 fps** | PAL broadcast |
| **30 fps** | NTSC broadcast (default) |
| **50 fps** | PAL high frame rate |
| **60 fps** | NTSC high frame rate |

#### Background Color

- **Color Input**: Enter hex, RGB, or named colors
- **Color Picker**: Click 🎨 for visual picker
- **Transparent**: Click button for transparent background
- **Supported Values**: hex, rgba(), named colors, "transparent"

### Integrations Tab

```
┌─────────────────────────────────────────────────────┐
│  Integrations                                       │
├─────────────────────────────────────────────────────┤
│  Supabase Database                                  │
│  Status: ✓ Connected                               │
│  Project: nova-gfx-production                       │
│  Bucket: media-assets                               │
├─────────────────────────────────────────────────────┤
│  Mapbox API Key                                     │
│  [pk.eyJ1Ijoi...                ] 👁️                │
│  Required for map elements                          │
│  Get a free API key at mapbox.com                   │
│                                                     │
│  ⚠ Using development key - add your own for        │
│    production use                                   │
└─────────────────────────────────────────────────────┘
```

#### Supabase Integration

| Property | Description |
|----------|-------------|
| **Status** | Connection status (Connected/Disconnected) |
| **Project** | Supabase project identifier |
| **Bucket** | Storage bucket for media assets |

#### Mapbox Integration

- **Required for**: Map elements
- **Free tier**: Available at mapbox.com
- **Development key**: Default key for testing
- **Production**: Add your own key for live use

## Canvas Best Practices

### Choosing Dimensions

1. **Match Output**: Set canvas to final output resolution
2. **Consider Scaling**: Higher resolution scales down better
3. **Performance**: Larger canvases use more resources

### Frame Rate Selection

| Broadcast Standard | Frame Rate |
|-------------------|------------|
| North America (NTSC) | 30 fps or 60 fps |
| Europe (PAL) | 25 fps or 50 fps |
| Film/Cinema | 24 fps |
| Web/Social | 30 fps or 60 fps |

### Background Configuration

| Use Case | Background Setting |
|----------|-------------------|
| **Overlay graphics** | Transparent |
| **Full screen** | Project background color |
| **Streaming** | Black (#000000) |
| **Social media** | Brand color |

## Settings Persistence

| Setting | Storage |
|---------|---------|
| Project name | Database |
| Canvas dimensions | Database |
| Frame rate | Database |
| Background color | Database |
| Mapbox API key | Project settings (database) |

Changes save automatically when you close the dialog.

## Reset to Defaults

Click **Reset to Defaults** to restore:

- Canvas: 1920 × 1080
- Frame rate: 30 fps
- Background: #000000 (black)

:::note
Project name and description are not reset.
:::

## Project URL

### Publish URL Format

```
https://{domain}/p/{slug}
```

### URL Uses

- **Sharing**: Share project with collaborators
- **Embedding**: Embed in external systems
- **API Access**: Reference in API calls

### Copy URL

Click the 📋 icon to copy the publish URL to clipboard.

## Common Configurations

### News Broadcast

| Setting | Value |
|---------|-------|
| Canvas | 1920 × 1080 (1080p HD) |
| Frame Rate | 30 fps (NTSC) or 25 fps (PAL) |
| Background | Transparent |

### Sports Overlay

| Setting | Value |
|---------|-------|
| Canvas | 1920 × 1080 (1080p HD) |
| Frame Rate | 60 fps (smooth motion) |
| Background | Transparent |

### Social Media

| Setting | Value |
|---------|-------|
| Canvas | 1080 × 1080 (Square) or 1080 × 1920 (Vertical) |
| Frame Rate | 30 fps |
| Background | Brand color or transparent |

### Corporate Presentation

| Setting | Value |
|---------|-------|
| Canvas | 1920 × 1080 (1080p HD) |
| Frame Rate | 30 fps |
| Background | Brand background color |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Canvas too large | Reduce dimensions for better performance |
| Animations choppy | Lower frame rate or simplify animations |
| Map not loading | Check Mapbox API key configuration |
| Background not transparent | Ensure "transparent" is set, not black |

## Related Features

- [Design Guidelines](/docs/features/design-guidelines) - Brand configuration
- [Map Element](/docs/elements/map) - Mapbox integration
- [Publishing](/docs/features/publishing) - Using publish URL
