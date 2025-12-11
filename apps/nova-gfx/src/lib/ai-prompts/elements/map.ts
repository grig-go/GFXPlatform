/**
 * Map Element Documentation
 * Updated: 2024-12
 */

export const MAP_ELEMENT_DOCS = `### Map Element

Interactive maps using Mapbox GL. Supports markers, custom marker templates, and location animations.

#### Basic Map:
\`\`\`json
{
  "element_type": "map",
  "name": "Location Map",
  "position_x": 100,
  "position_y": 100,
  "width": 800,
  "height": 500,
  "content": {
    "type": "map",
    "mapStyle": "dark",
    "center": [-74.006, 40.7128],    // [longitude, latitude]
    "zoom": 12,
    "pitch": 0,                       // Camera tilt (0-85 degrees)
    "bearing": 0                      // Camera rotation (0-360)
  }
}
\`\`\`

#### Map Styles:
| Style | Description |
|-------|-------------|
| dark | Dark minimal (best for broadcast) |
| light | Light minimal |
| streets | Default street map |
| outdoors | Terrain and outdoor |
| satellite | Satellite imagery |
| satellite-streets | Satellite with labels |
| navigation-day | Navigation (day) |
| navigation-night | Navigation (night) |

#### Projections:
mercator (default), globe, albers, equalEarth, equirectangular, naturalEarth, winkelTripel

#### Simple Markers:
\`\`\`json
{
  "content": {
    "type": "map",
    "mapStyle": "dark",
    "center": [-74.006, 40.7128],
    "zoom": 10,
    "markers": [
      {
        "id": "nyc",
        "lng": -74.006,
        "lat": 40.7128,
        "color": "#EF4444",
        "label": "New York City",
        "popup": "Population: 8.3M",
        "visible": true
      }
    ]
  }
}
\`\`\`

#### Marker Templates (for weather, data overlays):
\`\`\`json
{
  "content": {
    "type": "map",
    "mapStyle": "dark",
    "center": [-98.5795, 39.8283],
    "zoom": 4,
    "markerTemplates": [
      {
        "id": "weather-marker",
        "name": "Weather",
        "width": 80,
        "height": 100,
        "anchorX": 0.5,
        "anchorY": 1,
        "elements": [
          {
            "type": "shape",
            "offsetX": 0,
            "offsetY": 0,
            "width": 80,
            "height": 80,
            "shapeType": "rectangle",
            "fill": "rgba(0, 0, 0, 0.7)",
            "cornerRadius": 8
          },
          {
            "type": "icon",
            "offsetX": 20,
            "offsetY": 8,
            "iconLibrary": "weather",
            "iconName": "wi-day-sunny",
            "iconSize": 40,
            "iconColor": "#FFD700"
          },
          {
            "type": "text",
            "offsetX": 10,
            "offsetY": 55,
            "width": 60,
            "text": "{{temp}}",
            "fontSize": 18,
            "fontWeight": 700,
            "textColor": "#FFFFFF",
            "textAlign": "center"
          }
        ]
      }
    ],
    "markers": [
      { "id": "m1", "lng": -74.006, "lat": 40.7128, "templateId": "weather-marker", "data": { "temp": "68°F" } },
      { "id": "m2", "lng": -118.2437, "lat": 34.0522, "templateId": "weather-marker", "data": { "temp": "82°F" } }
    ]
  }
}
\`\`\`

**Data Binding**: Use \`{{key}}\` in text elements to bind to marker.data values.

#### Location Animation (Camera Flythrough):
\`\`\`json
{
  "content": {
    "type": "map",
    "mapStyle": "satellite-streets",
    "center": [-74.006, 40.7128],
    "zoom": 12,
    "animateLocation": true,
    "animationDuration": 2000,
    "animationEasing": "ease-in-out",
    "locationKeyframes": [
      { "id": "kf1", "time": 0, "lng": -74.006, "lat": 40.7128, "zoom": 12, "pitch": 0, "bearing": 0 },
      { "id": "kf2", "time": 3000, "lng": -118.2437, "lat": 34.0522, "zoom": 10, "pitch": 45, "bearing": 90 }
    ]
  }
}
\`\`\`

#### Common City Coordinates:
| City | Coordinates [lng, lat] |
|------|----------------------|
| New York | [-74.006, 40.7128] |
| Los Angeles | [-118.2437, 34.0522] |
| Chicago | [-87.6298, 41.8781] |
| Houston | [-95.3698, 29.7604] |
| Miami | [-80.1918, 25.7617] |
| Seattle | [-122.3321, 47.6062] |
| Denver | [-104.9903, 39.7392] |
| London | [-0.1276, 51.5074] |
| Paris | [2.3522, 48.8566] |
| Tokyo | [139.6917, 35.6895] |`;
