---
sidebar_position: 10
---

# Video Element

The Video element embeds video content from files, YouTube, Vimeo, or streaming sources directly into your graphics.

## Overview

Video elements support:

- **Multiple Sources**: Local files, YouTube, Vimeo, streams
- **Auto-Detection**: Automatically detects video type from URL
- **Playback Control**: Loop, autoplay, mute options
- **Poster Images**: Thumbnail display before playback

## Creating a Video

1. Click the **Video** tool in the toolbar or Elements menu
2. A default video placeholder appears
3. Set the video source in Properties panel

## Properties

### Source Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `src` | string | YouTube sample | Video URL |
| `videoType` | string | auto | Source type |
| `poster` | string | - | Thumbnail image URL |

### Playback Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `autoplay` | boolean | true | Start playing automatically |
| `loop` | boolean | true | Loop video continuously |
| `muted` | boolean | true | Mute audio |

## Video Types

### Auto-Detection

The video type is automatically detected from the URL:

| Domain/Extension | Type |
|-----------------|------|
| youtube.com, youtu.be | YouTube |
| vimeo.com | Vimeo |
| .mp4, .webm, .ogg, .mov | File |
| .m3u8 | HLS Stream |
| .mpd | DASH Stream |

### File Videos

Direct video file support:

```
https://example.com/video.mp4
https://example.com/video.webm
https://example.com/video.ogg
```

Supported formats:
- MP4 (H.264)
- WebM (VP8/VP9)
- OGG (Theora)
- MOV (QuickTime)

### YouTube Videos

Embed YouTube videos:

```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
```

Features:
- Automatic embed conversion
- Privacy-enhanced mode
- No branding overlay

### Vimeo Videos

Embed Vimeo videos:

```
https://vimeo.com/VIDEO_ID
```

Features:
- Clean embed
- No controls overlay
- Background mode support

### Streaming (HLS/DASH)

Live stream support:

```
https://stream.example.com/live.m3u8
https://stream.example.com/manifest.mpd
```

Features:
- Adaptive bitrate
- Live stream support
- VOD playback

## Poster Image

Set a thumbnail to display before video plays:

```typescript
{
  type: 'video',
  src: 'https://example.com/video.mp4',
  poster: 'https://example.com/thumbnail.jpg'
}
```

The poster displays:
- Before autoplay starts
- While video is loading
- If video fails to load

## Animation Properties

| Property | Description |
|----------|-------------|
| `opacity` | Fade video in/out |
| `scale_x` | Scale horizontally |
| `scale_y` | Scale vertically |
| `rotation` | Rotate video |
| `position_x` | Move horizontally |
| `position_y` | Move vertically |

## Use Cases

### Video Background

Full-canvas looping background:

```typescript
{
  type: 'video',
  src: 'https://example.com/background.mp4',
  loop: true,
  muted: true,
  autoplay: true
}
```

Position at z-index 0, full canvas dimensions.

### Embedded YouTube

Show YouTube content in graphics:

```typescript
{
  type: 'video',
  src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  autoplay: false
}
```

### Live Stream Display

Embed live stream feed:

```typescript
{
  type: 'video',
  src: 'https://stream.example.com/live.m3u8',
  loop: false,
  muted: false,
  autoplay: true
}
```

### Video Overlay

Picture-in-picture style:

1. Add video element
2. Size to smaller dimensions
3. Position in corner
4. Add border/shadow styling

## Playback Behavior

### Autoplay Considerations

Modern browsers have autoplay restrictions:

- **Muted videos**: Can autoplay
- **Unmuted videos**: May require user interaction
- **Recommendation**: Keep `muted: true` for reliable autoplay

### Loop Behavior

When `loop: true`:
- Video restarts seamlessly at end
- No gap or loading between loops
- Ideal for backgrounds

### Performance

Video decoding uses hardware acceleration when available:
- GPU-accelerated playback
- Minimal CPU impact
- Smooth frame rates

## Styling Options

### Border and Radius

```css
borderRadius: 8px
border: 2px solid #FFFFFF
```

### Shadow

```css
boxShadow: 0 4px 20px rgba(0,0,0,0.3)
```

### Aspect Ratio

Videos maintain aspect ratio by default. Use object-fit to control:

| Fit | Description |
|-----|-------------|
| `cover` | Fill container, crop if needed |
| `contain` | Fit within container |
| `fill` | Stretch to fill |

## Examples

### YouTube Background

```typescript
{
  type: 'video',
  src: 'https://www.youtube.com/watch?v=bImk2wEVVCc',
  loop: true,
  muted: true,
  autoplay: true
}
```

### Corporate Video Overlay

```typescript
{
  type: 'video',
  src: 'https://company.com/promo.mp4',
  poster: 'https://company.com/promo-thumb.jpg',
  loop: false,
  muted: false,
  autoplay: false
}

// Styles
{
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
}
```

## Best Practices

### File Videos

- Use MP4 with H.264 for widest compatibility
- Compress videos appropriately (720p-1080p sufficient)
- Keep file sizes reasonable for loading

### Performance

- Limit video elements per template (1-2 recommended)
- Use appropriate resolution (don't upscale SD to 4K)
- Consider poster images for slower connections

### Audio

- Default to muted for broadcast overlays
- Unmuted only when audio is intentional
- Be aware of autoplay audio restrictions

### Accessibility

- Provide poster images for context
- Consider captions if audio is important
- Don't rely solely on video for information
