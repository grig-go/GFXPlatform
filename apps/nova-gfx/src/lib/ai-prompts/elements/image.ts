/**
 * Image Element Documentation
 * Updated: 2024-12
 */

export const IMAGE_ELEMENT_DOCS = `### Image Element

Images for logos, photos, and graphics. Supports various fit modes, borders, corner radius, and blur effects.

#### Basic Image:
\`\`\`json
{
  "element_type": "image",
  "name": "Logo",
  "position_x": 50,
  "position_y": 50,
  "width": 120,
  "height": 80,
  "content": {
    "type": "image",
    "src": "https://example.com/logo.png",
    "fit": "contain"
  }
}
\`\`\`

#### Image Properties:
\`\`\`json
{
  "content": {
    "type": "image",
    "src": "https://example.com/image.jpg",
    "fit": "cover",              // "cover" | "contain" | "fill" | "none" | "scale-down"
    "nativeAspectRatio": 1.78,   // Lock to aspect ratio
    "aspectRatioLocked": true,
    "border": {
      "enabled": true,
      "width": 3,
      "color": "#FFFFFF"
    },
    "cornerRadius": 12,          // Pixels
    "blur": {
      "enabled": true,
      "amount": 5                // 0-50 pixels
    },
    "opacity": 1,                // 0-1
    "blendMode": "normal"        // CSS blend modes
  }
}
\`\`\`

#### Fit Modes:
| Mode | Description |
|------|-------------|
| cover | Fill container, crop if needed (default) |
| contain | Fit entire image, may have gaps |
| fill | Stretch to fill exactly |
| none | Natural size, may overflow |
| scale-down | Like contain but won't enlarge |

**For logos**: Use \`fit: "contain"\` to preserve aspect ratio

#### Framed Image (with border):
\`\`\`json
{
  "content": {
    "type": "image",
    "src": "https://example.com/headshot.jpg",
    "fit": "cover",
    "border": {
      "enabled": true,
      "width": 4,
      "color": "#3B82F6"
    },
    "cornerRadius": 999       // Full circle for headshots
  }
}
\`\`\`

#### Sports Team Logo:
For team logos, use the \`{{LOGO:LEAGUE:TEAM}}\` placeholder:
\`\`\`json
{
  "element_type": "image",
  "name": "Home Team Logo",
  "width": 80,
  "height": 80,
  "content": {
    "type": "image",
    "src": "{{LOGO:NFL:Chiefs}}",
    "fit": "contain"
  }
}
\`\`\`

#### Blend Modes:
normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion

#### Image Sources:

**For Team Logos** - Use the logo placeholder syntax:
\`\`\`json
"src": "{{LOGO:NFL:Chiefs}}"
"src": "{{LOGO:NBA:Lakers}}"
"src": "{{LOGO:MLB:Yankees}}"
\`\`\`

**For Stock Images** - Use Pexels with the \`{{PEXELS:query}}\` placeholder:
\`\`\`json
"src": "{{PEXELS:basketball}}"
"src": "{{PEXELS:football stadium}}"
"src": "{{PEXELS:soccer player}}"
"src": "{{PEXELS:sports arena}}"
"src": "{{PEXELS:city skyline night}}"
\`\`\`

The system will resolve this to a real Pexels image URL. Use descriptive search terms.

**Common queries by use case**:
- Sports backgrounds: \`{{PEXELS:basketball court}}\`, \`{{PEXELS:football field}}\`, \`{{PEXELS:baseball stadium}}\`
- Action shots: \`{{PEXELS:basketball player}}\`, \`{{PEXELS:soccer action}}\`
- Venues: \`{{PEXELS:sports arena crowd}}\`, \`{{PEXELS:stadium lights}}\`
- Abstract/textures: \`{{PEXELS:dark texture}}\`, \`{{PEXELS:blue gradient}}\`

**For Player Headshots** - Ask the user to provide the image URL (Pexels won't have specific players):
\`\`\`json
"content": {
  "type": "image",
  "src": "",  // User will add their image
  "fit": "cover"
}
\`\`\`

**NEVER use**:
- unsplash.com direct links (they 404)
- Random placeholder URLs
- Made-up image URLs
- Direct pexels.com URLs (use the placeholder syntax instead)`;
