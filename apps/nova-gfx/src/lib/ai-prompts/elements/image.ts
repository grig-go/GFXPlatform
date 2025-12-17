/**
 * Image Element Documentation
 * Updated: 2024-12
 */

export const IMAGE_ELEMENT_DOCS = `### Image Element

Images for logos, photos, and graphics. Supports various fit modes, borders, corner radius, and blur effects.

## ⛔ CRITICAL: ALL IMAGE SOURCES MUST USE PLACEHOLDERS!

**NEVER use:**
- ❌ \`data:image/png;base64,...\` - Will break the graphic!
- ❌ \`https://example.com/...\` - External URLs not allowed!
- ❌ \`/assets/...\` - Local paths not allowed!
- ❌ Any hardcoded URL or inline image data

**ALWAYS use:** \`{{GENERATE:description}}\` for ALL images (backgrounds, icons, photos, logos, etc.)

#### Basic Image with AI Generation:
\`\`\`json
{
  "element_type": "image",
  "name": "Background",
  "position_x": 0,
  "position_y": 0,
  "width": 1920,
  "height": 1080,
  "z_index": 1,
  "content": {
    "type": "image",
    "src": "{{GENERATE:sports stadium night dramatic lighting}}",
    "fit": "cover"
  }
}
\`\`\`

**⚠️ ALWAYS set z_index: 1 for background images so other elements appear on top!**

#### Image Properties:
\`\`\`json
{
  "content": {
    "type": "image",
    "src": "{{GENERATE:basketball court professional broadcast}}",
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
    "src": "{{GENERATE:professional news anchor headshot}}",
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

#### Blend Modes:
normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion

#### Common \`{{GENERATE:...}}\` Queries:
- Backgrounds: \`basketball court professional broadcast\`, \`football field stadium lights\`, \`sports arena crowd\`
- People: \`professional male news anchor headshot\`, \`female sports reporter portrait\`
- Abstract: \`dark abstract texture broadcast\`, \`blue gradient professional background\``;
