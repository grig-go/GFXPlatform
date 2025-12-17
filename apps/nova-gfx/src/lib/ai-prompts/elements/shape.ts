/**
 * Shape Element Documentation
 * Updated: 2024-12 - Includes texture/media asset support
 */

export const SHAPE_ELEMENT_DOCS = `### Shape Element

Shapes are the foundation for backgrounds, containers, and cards. They support gradients, glass effects, glow, and media textures.

## ⛔ TEXTURE URLS MUST USE \`{{GENERATE:...}}\` PLACEHOLDERS!

**For texture.url, NEVER use:**
- ❌ \`data:image/png;base64,...\` - Will break the graphic!
- ❌ \`https://...\` - External URLs not allowed!
- ❌ Any hardcoded image URL

**ALWAYS use:** \`"url": "{{GENERATE:your description here}}"\`

**Shapes Available**: rectangle, ellipse, rhombus, trapezoid, parallelogram

**TIP**: Use \`"shape": "ellipse"\` to create circular/oval elements. Combined with a texture, ellipses create perfect circular image frames.

#### Basic Shape:
\`\`\`json
{
  "element_type": "shape",
  "name": "Background",
  "position_x": 50,
  "position_y": 800,
  "width": 600,
  "height": 120,
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "fill": "#1E3A5F",
    "stroke": "#3B82F6",
    "strokeWidth": 2,
    "cornerRadius": 12
  }
}
\`\`\`

#### Gradient Fill:
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "gradient": {
      "enabled": true,
      "type": "linear",        // "linear" | "radial" | "conic"
      "direction": 135,        // Angle in degrees (0=right, 90=down, 180=left, 270=up)
      "colors": [
        { "color": "#3B82F6", "stop": 0 },
        { "color": "#8B5CF6", "stop": 50 },
        { "color": "#EC4899", "stop": 100 }
      ]
    }
  }
}
\`\`\`

#### Glass Effect (Frosted/Glassmorphism):
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "glass": {
      "enabled": true,
      "blur": 16,              // 0-50 pixels
      "opacity": 0.6,          // 0-1 (background opacity)
      "borderWidth": 1,
      "borderColor": "rgba(255, 255, 255, 0.1)",
      "saturation": 120        // 0-200%
    }
  }
}
\`\`\`

#### Glow Effect:
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "fill": "#3B82F6",
    "glow": {
      "enabled": true,
      "color": "#3B82F6",
      "blur": 30,              // 0-100 pixels
      "spread": 0,             // -50 to 50
      "intensity": 0.8         // 0-1
    }
  }
}
\`\`\`

#### Media Texture (Image or Video Background):

**IMPORTANT**: When the user wants a pattern, texture, or background image, use the \`{{GENERATE:query}}\` placeholder to generate an AI image.

**⚠️ ALWAYS set z_index: 1 for full-screen background shapes so other elements appear on top!**

\`\`\`json
{
  "element_type": "shape",
  "name": "Background",
  "position_x": 0,
  "position_y": 0,
  "width": 1920,
  "height": 1080,
  "z_index": 1,
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "texture": {
      "enabled": true,
      "url": "{{GENERATE:red white gray geometric pattern professional}}",
      "mediaType": "image",
      "fit": "cover"
    }
  }
}
\`\`\`

**Pattern/Texture Examples**:
- \`"url": "{{GENERATE:red white gray geometric pattern}}"\`
- \`"url": "{{GENERATE:dark blue abstract texture broadcast}}"\`
- \`"url": "{{GENERATE:golden gradient luxury background}}"\`
- \`"url": "{{GENERATE:sports arena dramatic lighting}}"\`

**Full texture properties**:
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "texture": {
      "enabled": true,
      "url": "{{GENERATE:your pattern description here}}",
      "mediaType": "image",    // "image" | "video"
      "fit": "cover",          // "cover" | "contain" | "fill" | "tile"
      "position": { "x": 0, "y": 0 },  // Offset -100 to 100
      "scale": 1,              // 0.1 to 5
      "rotation": 0,           // Degrees
      "opacity": 1,            // 0-1
      "blendMode": "normal"    // CSS blend modes
    }
  }
}
\`\`\`

#### Ellipse Shape - Circular Image Frame:

Use ellipse shape with a texture to create **circular image frames** (headshots, profile pictures, logos):

\`\`\`json
{
  "element_type": "shape",
  "name": "Profile Photo",
  "position_x": 100,
  "position_y": 100,
  "width": 120,
  "height": 120,
  "content": {
    "type": "shape",
    "shape": "ellipse",
    "texture": {
      "enabled": true,
      "url": "{{GENERATE:professional male news anchor headshot}}",
      "mediaType": "image",
      "fit": "cover"
    },
    "stroke": "#3B82F6",
    "strokeWidth": 3
  }
}
\`\`\`

**Why use ellipse + texture instead of image element?**
- Ellipse clips the image to a perfect circle/oval shape
- Supports stroke/border on the circular edge
- Supports glow effects on circular shape
- Best for: headshots, profile pictures, circular logos, avatar frames

**Ellipse with glow:**
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "ellipse",
    "texture": {
      "enabled": true,
      "url": "{{GENERATE:professional reporter portrait}}",
      "fit": "cover"
    },
    "stroke": "#FFFFFF",
    "strokeWidth": 2,
    "glow": {
      "enabled": true,
      "color": "#3B82F6",
      "blur": 20,
      "intensity": 0.6
    }
  }
}
\`\`\`

#### ⚠️ IMPORTANT: Texture vs Gradient - Choose ONE!
**Never combine \`texture\` and \`gradient\` on the same shape - they conflict!**

- Use **texture** for image backgrounds (with \`{{GENERATE:query}}\`)
- Use **gradient** for color-only backgrounds
- To darken a texture, use \`texture.opacity\` (e.g., 0.5) or add a SEPARATE overlay shape on top

**Wrong (will conflict):**
\`\`\`json
{"texture":{"enabled":true,"url":"..."},"gradient":{"enabled":true,"colors":[...]}}
\`\`\`

**Correct (texture with opacity for darkening):**
\`\`\`json
{"texture":{"enabled":true,"url":"{{GENERATE:query}}","fit":"cover","opacity":0.4}}
\`\`\`

**Correct (separate overlay element for darkening):**
Create TWO elements: Background (texture) + Dark Overlay (gradient/fill with rgba)

#### Combined Effects (Gradient + Glass):
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "gradient": {
      "enabled": true,
      "type": "linear",
      "direction": 135,
      "colors": [
        { "color": "rgba(139, 92, 246, 0.3)", "stop": 0 },
        { "color": "rgba(59, 130, 246, 0.3)", "stop": 100 }
      ]
    },
    "glass": {
      "enabled": true,
      "blur": 20,
      "opacity": 0.6
    }
  },
  "styles": {
    "boxShadow": "0 0 40px rgba(139, 92, 246, 0.3), 0 8px 32px rgba(0, 0, 0, 0.3)"
  }
}
\`\`\`

#### Common Presets:

**Modern Lower Third Background**:
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "glass": { "enabled": true, "blur": 16, "opacity": 0.7 }
  },
  "styles": {
    "borderLeft": "4px solid #3B82F6",
    "boxShadow": "0 8px 32px rgba(0, 0, 0, 0.4)"
  }
}
\`\`\`

**Score Bug Background**:
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "fill": "rgba(0, 0, 0, 0.85)"
  },
  "styles": {
    "borderRadius": "8px",
    "boxShadow": "0 4px 24px rgba(0, 0, 0, 0.5)"
  }
}
\`\`\`

**Blend Modes** (for textures): normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion`;
