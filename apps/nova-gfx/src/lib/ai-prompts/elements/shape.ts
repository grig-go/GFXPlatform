/**
 * Shape Element Documentation
 * Updated: 2024-12 - Includes texture/media asset support
 */

export const SHAPE_ELEMENT_DOCS = `### Shape Element

Shapes are the foundation for backgrounds, containers, and cards. They support gradients, glass effects, glow, and media textures.

**Shapes Available**: rectangle, rhombus, trapezoid, parallelogram

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
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "texture": {
      "enabled": true,
      "url": "https://example.com/texture.jpg",
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

**Video Texture Example**:
\`\`\`json
{
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "texture": {
      "enabled": true,
      "url": "https://example.com/background.mp4",
      "thumbnailUrl": "https://example.com/thumb.jpg",
      "mediaType": "video",
      "fit": "cover",
      "opacity": 0.8
    }
  }
}
\`\`\`

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
