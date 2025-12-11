/**
 * Animation Reference - Included when creating new elements or asking about animations
 */

export const ANIMATION_REFERENCE = `## Animation Reference

**IMPORTANT**: When creating NEW elements, ALWAYS include both "in" AND "out" animations.

### Animation Array Format
\`\`\`json
{
  "animations": [
    {
      "element_name": "Element Name",   // Must match element's "name" exactly
      "phase": "in",                     // "in" | "loop" | "out"
      "duration": 500,                   // Milliseconds
      "delay": 0,                        // Delay before start
      "easing": "ease-out",              // CSS easing
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\`

### Animatable Properties
| Property | Description |
|----------|-------------|
| opacity | 0-1 transparency |
| position_x | X position (pixels) |
| position_y | Y position (pixels) |
| scale_x | Horizontal scale |
| scale_y | Vertical scale |
| rotation | Rotation (degrees) |
| width | Element width |
| height | Element height |

### Common Animation Patterns

**Fade In/Out**:
\`\`\`json
// IN
{ "position": 0, "properties": { "opacity": 0 } },
{ "position": 100, "properties": { "opacity": 1 } }
// OUT
{ "position": 0, "properties": { "opacity": 1 } },
{ "position": 100, "properties": { "opacity": 0 } }
\`\`\`

**Slide from Left**:
\`\`\`json
// IN (slide in from -100px)
{ "position": 0, "properties": { "opacity": 0, "position_x": -100 } },
{ "position": 100, "properties": { "opacity": 1, "position_x": 50 } }
// OUT (slide out to -100px)
{ "position": 0, "properties": { "opacity": 1, "position_x": 50 } },
{ "position": 100, "properties": { "opacity": 0, "position_x": -100 } }
\`\`\`

**Slide from Right**:
\`\`\`json
// IN
{ "position": 0, "properties": { "opacity": 0, "position_x": 200 } },
{ "position": 100, "properties": { "opacity": 1, "position_x": 50 } }
\`\`\`

**Scale In (Pop)**:
\`\`\`json
// IN
{ "position": 0, "properties": { "opacity": 0, "scale_x": 0.5, "scale_y": 0.5 } },
{ "position": 100, "properties": { "opacity": 1, "scale_x": 1, "scale_y": 1 } }
\`\`\`

**Slide Up**:
\`\`\`json
// IN
{ "position": 0, "properties": { "opacity": 0, "position_y": 50 } },
{ "position": 100, "properties": { "opacity": 1, "position_y": 0 } }
\`\`\`

### Easing Functions
| Easing | Feel |
|--------|------|
| ease-out | Smooth deceleration (recommended for IN) |
| ease-in | Smooth acceleration (recommended for OUT) |
| ease-in-out | Smooth both ends |
| linear | Constant speed |
| cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy/overshoot |

### Staggered Animations
Use \`delay\` to stagger elements:
\`\`\`json
{ "element_name": "Background", "phase": "in", "delay": 0, ... },
{ "element_name": "Name Text", "phase": "in", "delay": 100, ... },
{ "element_name": "Title Text", "phase": "in", "delay": 200, ... }
\`\`\`

### Duration Guidelines
- **IN animations**: 400-800ms
- **OUT animations**: 300-500ms (slightly faster)
- **Loop animations**: 1000-3000ms
- **Stagger delay**: 50-150ms between elements`;
