---
sidebar_position: 5
---

# Map Element

Map elements display interactive Mapbox maps with full animation support, including multi-location flight path animations.

## Creating Maps

1. Press `M` or click the Map button
2. Click on canvas to place
3. Configure location and style

## Content Properties

### Location

```typescript
{
  center: [number, number];  // [longitude, latitude]
  zoom: number;              // Zoom level (0-22)
  pitch: number;             // Tilt angle (0-85 degrees)
  bearing: number;           // Rotation (0-360 degrees)
}
```

### Location Examples

| Location | Coordinates | Zoom |
|----------|-------------|------|
| New York | [-74.006, 40.7128] | 12 |
| London | [-0.1276, 51.5074] | 11 |
| Tokyo | [139.6917, 35.6895] | 11 |
| Sydney | [151.2093, -33.8688] | 12 |

## Map Styles

Available map styles:

| Style | Description |
|-------|-------------|
| `streets` | Standard street map |
| `outdoors` | Terrain and outdoor features |
| `light` | Light-themed minimal style |
| `dark` | Dark-themed minimal style |
| `satellite` | Satellite imagery |
| `satellite-streets` | Satellite with street labels |
| `navigation-day` | Navigation optimized (day) |
| `navigation-night` | Navigation optimized (night) |

## Projections

Map projections change how the globe is displayed:

| Projection | Description |
|------------|-------------|
| `mercator` | Standard flat projection (default) |
| `globe` | 3D globe view |
| `naturalEarth` | Natural Earth projection |
| `equalEarth` | Equal-area projection |

## Flight Path Animation

Create animated journeys between multiple locations.

### Location Keyframes

Each keyframe defines a point in the flight path:

```typescript
interface MapLocationKeyframe {
  id: string;
  time: number;           // Time in milliseconds
  lng: number;            // Longitude
  lat: number;            // Latitude
  zoom: number;           // Zoom level
  pitch?: number;         // Tilt angle
  bearing?: number;       // Rotation
  easing?: string;        // Easing function
  phase?: 'in' | 'loop' | 'out';  // Animation phase
  locationName?: string;  // Display name
}
```

### Creating Flight Paths

1. Open the **Flight Path Animation** section
2. Click **Add Current Location** to add a keyframe
3. Navigate to the next location
4. Add another keyframe
5. Repeat for all stops

### Phase-Based Keyframes

Assign keyframes to animation phases:

- **IN**: Keyframes for entrance animation
- **LOOP**: Keyframes for continuous loop
- **OUT**: Keyframes for exit animation

During playback, only keyframes matching the current phase are used.

### Filtering Keyframes

Use the phase filter to view specific keyframes:
- **All**: Show all keyframes
- **IN**: Show only IN phase keyframes
- **LOOP**: Show only LOOP phase keyframes
- **OUT**: Show only OUT phase keyframes

### Keyframe Timing

Keyframes are interpolated based on time values:

```
Keyframe 1: time=0, New York
Keyframe 2: time=2000, Chicago
Keyframe 3: time=4000, Los Angeles
```

The map smoothly flies between locations based on elapsed time.

## Styling Options

### Visual Effects

```typescript
{
  borderRadius: number;      // Corner radius
  borderWidth: number;       // Border thickness
  borderColor: string;       // Border color
  overlayColor: string;      // Color overlay
  overlayOpacity: number;    // Overlay transparency
}
```

### Attribution

Toggle map attribution visibility:
- Required for public-facing applications
- Can be hidden for internal use

## Markers

Add custom markers to maps:

```typescript
interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  icon?: string;           // Custom icon URL
  color?: string;          // Marker color
  size?: number;           // Marker size
  label?: string;          // Text label
}
```

### Marker Templates

Pre-defined marker styles:
- `pin` - Standard map pin
- `dot` - Simple dot marker
- `custom` - Custom image marker

## Saved Locations

Save frequently used locations:

1. Navigate to desired location
2. Enter a name in "Save as..."
3. Click the bookmark icon

Access saved locations from the Quick Locations dropdown.

## Animation

### Animatable Properties

| Property | Description |
|----------|-------------|
| `center` | Pan to new location |
| `zoom` | Zoom in/out |
| `pitch` | Change tilt angle |
| `bearing` | Rotate map |
| `opacity` | Fade map |

### Smooth Transitions

Enable smooth location transitions:

```typescript
{
  animateLocation: true,
  animationDuration: 2000,  // milliseconds
  animationEasing: 'ease-in-out'
}
```

### Flight Animation Example

Create a news-style location reveal:

**IN Phase:**
1. Start zoomed out on globe
2. Keyframe: World view, zoom 2
3. Fly to continent
4. Keyframe: Region view, zoom 6
5. Zoom to city
6. Keyframe: City view, zoom 14

## Integration with Pulsar GFX

### Editing Locations

In Pulsar GFX Content Editor:
1. Select a page with a map element
2. Expand the Flight Path section
3. Click "Set" on any keyframe
4. Search for or enter new coordinates

### Real-time Updates

Map location changes are applied instantly:
- No page reload required
- Smooth transitions between locations
- Preview updates in real-time

## Best Practices

### Performance
- Use appropriate zoom levels
- Limit marker count
- Cache map tiles when possible

### Visual Design
- Match map style to overall design
- Use overlays for branding consistency
- Consider contrast with text overlays

### Flight Paths
- Keep keyframe count reasonable (3-6)
- Use appropriate timing between stops
- Match animation to narrative pace

### Accessibility
- Provide context with labels
- Don't rely solely on map for information
- Include text descriptions when needed
