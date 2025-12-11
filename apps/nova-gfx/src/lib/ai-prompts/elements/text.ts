/**
 * Text Element Documentation
 * Updated: 2024-12 - Includes motion animations and typography controls
 */

export const TEXT_ELEMENT_DOCS = `### Text Element

Text elements for labels, titles, names, and headlines. Supports rich typography and motion animations.

#### Basic Text:
\`\`\`json
{
  "element_type": "text",
  "name": "Name",
  "position_x": 70,
  "position_y": 820,
  "width": 400,
  "height": 50,
  "styles": {
    "fontSize": "36px",
    "fontFamily": "Inter",
    "fontWeight": "700",
    "color": "#FFFFFF",
    "textShadow": "0 2px 8px rgba(0, 0, 0, 0.5)"
  },
  "content": {
    "type": "text",
    "text": "John Smith"
  }
}
\`\`\`

#### Typography Controls:
\`\`\`json
{
  "styles": {
    "fontSize": "48px",
    "fontFamily": "Oswald",
    "fontWeight": "700",
    "color": "#FFFFFF",
    "textAlign": "center",       // "left" | "center" | "right" | "justify"
    "verticalAlign": "middle",   // "top" | "middle" | "bottom"
    "lineHeight": "1.2",         // Unitless or "48px"
    "letterSpacing": "2px",      // Character spacing
    "wordSpacing": "4px",        // Word spacing
    "textTransform": "uppercase" // "uppercase" | "lowercase" | "capitalize"
  }
}
\`\`\`

#### Text Shadows:
- **Subtle**: \`"0 2px 4px rgba(0, 0, 0, 0.3)"\`
- **Heavy**: \`"0 4px 16px rgba(0, 0, 0, 0.7)"\`
- **Glow (blue)**: \`"0 0 20px rgba(59, 130, 246, 0.8)"\`
- **Multiple**: \`"0 0 10px #fff, 0 0 20px #3B82F6"\`

#### Motion Animations:

Text supports built-in motion animations via the \`animation\` property in content:

\`\`\`json
{
  "content": {
    "type": "text",
    "text": "Breaking News",
    "animation": {
      "enabled": true,
      "type": "fade",           // Animation type (see below)
      "duration": 0.8,          // Seconds
      "delay": 0.2,             // Seconds before start
      "easing": "ease-out",     // CSS easing
      "direction": "in"         // "in" | "out" | "in-out"
    }
  }
}
\`\`\`

**Animation Types**:
| Type | Description |
|------|-------------|
| fade | Fade in/out (opacity) |
| slide | Slide from direction |
| scale | Scale up/down |
| blur | Blur in/out |
| glow | Glow effect |
| typewriter | Character-by-character reveal |
| wave | Wave motion on Y axis |
| bounce | Bounce effect |
| custom | Full keyframe control |

#### Custom Keyframe Animation:
\`\`\`json
{
  "content": {
    "type": "text",
    "text": "Custom Animation",
    "animation": {
      "enabled": true,
      "type": "custom",
      "keyframes": [
        { "offset": 0, "properties": { "opacity": 0, "x": -100 } },
        { "offset": 0.5, "properties": { "opacity": 1, "x": 0 } },
        { "offset": 1, "properties": { "opacity": 0.8, "x": 50 } }
      ]
    }
  }
}
\`\`\`

#### Font Size Guidelines:
| Purpose | Size | Weight |
|---------|------|--------|
| Headline | 48-64px | 700-800 |
| Name | 32-42px | 600-700 |
| Title/Subtitle | 20-28px | 400-500 |
| Label | 14-18px | 400-500 |
| Caption | 12-14px | 400 |

#### Common Fonts:
- **Sans-serif**: Inter, Roboto, Open Sans, Lato, Montserrat
- **Display**: Oswald, Bebas Neue, Anton, Poppins
- **Serif**: Playfair Display, Merriweather, Georgia`;
