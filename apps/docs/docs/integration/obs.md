---
sidebar_position: 1
---

# OBS Integration

Integrate Nova GFX with OBS Studio for live streaming.

## Browser Source Setup

### 1. Get Browser Source URL

In Nova GFX or Pulsar GFX:
1. Open preview settings
2. Copy the Browser Source URL

URL format:
```
http://localhost:5173/preview?template={id}&obs=1&bg=transparent
```

### 2. Add to OBS

1. Open OBS Studio
2. Add new **Browser** source
3. Paste the URL
4. Set dimensions (1920×1080)
5. Enable "Control audio via OBS"

### 3. Configure Source

| Setting | Value |
|---------|-------|
| Width | 1920 (or canvas width) |
| Height | 1080 (or canvas height) |
| FPS | 30 or 60 |
| CSS | (leave empty) |

## URL Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `template` | Template ID | Which template to display |
| `obs` | `1` | Hide controls for clean output |
| `bg` | `transparent` | Transparent background |
| `loop` | `0` or `1` | Auto-loop animations |

## Triggering Animations

### Via Pulsar GFX

Control graphics from Pulsar GFX interface - OBS source updates automatically.

### Via API

```bash
# Play IN
curl -X POST http://localhost:5173/api/preview/playIn

# Play OUT
curl -X POST http://localhost:5173/api/preview/playOut
```

### Via OBS Hotkeys

Set up OBS hotkeys to trigger browser source interactions.

## Multiple Graphics

Add multiple browser sources for different layers:
- Source 1: Lower thirds
- Source 2: Score bug
- Source 3: Full screen graphics

Each source can use a different template URL.

## Best Practices

- Use transparent backgrounds
- Match OBS canvas to template size
- Test animations before going live
- Use hardware acceleration when available
