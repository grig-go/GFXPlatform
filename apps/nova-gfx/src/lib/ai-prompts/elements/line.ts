/**
 * Line Element Documentation
 * Updated: 2024-12
 */

export const LINE_ELEMENT_DOCS = `### Line Element

Lines, dividers, arrows, and multi-point paths.

#### Basic Line:
\`\`\`json
{
  "element_type": "line",
  "name": "Divider",
  "position_x": 50,
  "position_y": 870,
  "width": 600,
  "height": 4,
  "content": {
    "type": "line",
    "points": [
      { "x": 0, "y": 0 },
      { "x": 600, "y": 0 }
    ],
    "stroke": "#3B82F6",
    "strokeWidth": 4,
    "strokeLinecap": "round"
  }
}
\`\`\`

#### Line Properties:
\`\`\`json
{
  "content": {
    "type": "line",
    "points": [
      { "x": 0, "y": 0 },
      { "x": 300, "y": 50 },
      { "x": 600, "y": 0 }
    ],
    "stroke": "#FFFFFF",
    "strokeWidth": 3,
    "strokeLinecap": "round",     // "butt" | "round" | "square"
    "strokeLinejoin": "round",    // "miter" | "round" | "bevel"
    "strokeDasharray": "10,5",    // Dashed line pattern
    "strokeDashoffset": 0,
    "opacity": 1
  }
}
\`\`\`

#### Arrow Lines:
\`\`\`json
{
  "content": {
    "type": "line",
    "points": [
      { "x": 0, "y": 50 },
      { "x": 200, "y": 50 }
    ],
    "stroke": "#FFFFFF",
    "strokeWidth": 3,
    "arrowEnd": {
      "enabled": true,
      "type": "arrow",            // "none" | "arrow" | "triangle" | "circle" | "square"
      "size": 12,
      "color": "#FFFFFF"
    }
  }
}
\`\`\`

#### Double Arrow:
\`\`\`json
{
  "content": {
    "type": "line",
    "points": [
      { "x": 50, "y": 0 },
      { "x": 250, "y": 0 }
    ],
    "stroke": "#3B82F6",
    "strokeWidth": 2,
    "arrowStart": {
      "enabled": true,
      "type": "arrow",
      "size": 10
    },
    "arrowEnd": {
      "enabled": true,
      "type": "arrow",
      "size": 10
    }
  }
}
\`\`\`

#### Dashed Patterns:
| Pattern | Description |
|---------|-------------|
| "5,5" | Short dashes |
| "10,5" | Medium dashes |
| "20,10" | Long dashes |
| "5,10,15" | Varied pattern |
| "1,5" | Dotted |

#### Arrow Types:
| Type | Description |
|------|-------------|
| none | No arrow |
| arrow | Simple arrow > |
| triangle | Filled triangle |
| circle | Filled circle |
| square | Filled square |`;
