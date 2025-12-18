/**
 * Icon Element Documentation
 * Updated: 2024-12
 */

export const ICON_ELEMENT_DOCS = `### Icon Element

Icons from multiple libraries: Lucide, FontAwesome, Weather icons, and Lottie animations.

#### Basic Icon (Lucide):
\`\`\`json
{
  "element_type": "icon",
  "name": "Star Icon",
  "position_x": 100,
  "position_y": 100,
  "width": 60,
  "height": 60,
  "content": {
    "type": "icon",
    "library": "lucide",
    "iconName": "Star",
    "size": 48,
    "color": "#FFFFFF"
  }
}
\`\`\`

**IMPORTANT**:
- \`width/height\`: Container size (for positioning)
- \`content.size\`: Actual icon size (icon is centered in container)
- \`color\`: ALWAYS set explicitly (use #FFFFFF for white on dark backgrounds)

#### Icon Libraries:

**Lucide** (modern, clean icons):
\`\`\`json
{ "library": "lucide", "iconName": "Star", "size": 48, "color": "#FFFFFF" }
\`\`\`
Common: Star, Heart, Settings, Play, Pause, ChevronRight, Check, X, Menu, Search, User, Bell, Clock, Calendar

**FontAwesome**:
\`\`\`json
{
  "library": "fontawesome",
  "iconName": "trophy",
  "size": 48,
  "color": "#FFD700",
  "weight": "solid"      // "solid" | "regular" | "brands"
}
\`\`\`

**Weather Icons** (for weather graphics):

**PREFER ANIMATED ICONS** - They are the default and recommended:
\`\`\`json
{ "library": "weather", "iconName": "animated-clear-day", "size": 64, "color": "#FFD700" }
\`\`\`

**Animated Weather Icons (RECOMMENDED)**:
| Condition | Icon Name |
|-----------|-----------|
| Sunny Day | animated-clear-day |
| Clear Night | animated-clear-night |
| Partly Cloudy Day | animated-partly-cloudy-day |
| Partly Cloudy Night | animated-partly-cloudy-night |
| Cloudy | animated-cloudy |
| Rain | animated-rain |
| Sleet | animated-sleet |
| Snow | animated-snow |
| Wind | animated-wind |
| Fog | animated-fog |

**Alternative static icon collections**:
- **Meteocons**: meteocons-1 (sun) to meteocons-47
- **Weather Icons (wi-)**: wi-day-sunny, wi-night-clear, wi-cloud, wi-rain, wi-snow, wi-thunderstorm, wi-fog, wi-thermometer
- **Basicons**: basicons-sun-day, basicons-cloud, basicons-rain-cloud-weather

#### Lottie Animation:
\`\`\`json
{
  "library": "lottie",
  "lottieUrl": "https://example.com/animation.json",
  "lottieLoop": true,
  "lottieAutoplay": true
}
\`\`\`

Or inline JSON:
\`\`\`json
{
  "library": "lottie",
  "lottieJson": "{ ...lottie json... }",
  "lottieLoop": true
}
\`\`\``;
