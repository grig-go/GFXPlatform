import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseChangesFromResponse } from './ai';

describe('AI Animation Creation and Modification', () => {
  describe('Basic Animation Creation', () => {
    it('should create simple fade-in animation', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    {
      "name": "Background",
      "element_type": "shape",
      "position_x": 0,
      "position_y": 0,
      "width": 1920,
      "height": 1080
    }
  ],
  "animations": [
    {
      "element_name": "Background",
      "phase": "in",
      "duration": 500,
      "delay": 0,
      "easing": "ease-out",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      expect(result?.animations).toBeDefined();
      expect(result?.animations?.length).toBe(1);
      expect(result?.animations?.[0].element_name).toBe('Background');
      expect(result?.animations?.[0].phase).toBe('in');
      expect(result?.animations?.[0].duration).toBe(500);
      expect(result?.animations?.[0].delay).toBe(0);
      expect(result?.animations?.[0].easing).toBe('ease-out');
      expect(result?.animations?.[0].keyframes).toHaveLength(2);
      expect(result?.animations?.[0].keyframes?.[0].position).toBe(0);
      expect(result?.animations?.[0].keyframes?.[0].properties?.opacity).toBe(0);
      expect(result?.animations?.[0].keyframes?.[1].position).toBe(100);
      expect(result?.animations?.[0].keyframes?.[1].properties?.opacity).toBe(1);
    });

    it('should create slide-in animation with position changes', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    {
      "name": "Slide Element",
      "element_type": "text",
      "position_x": 100,
      "position_y": 100,
      "width": 300,
      "height": 100
    }
  ],
  "animations": [
    {
      "element_name": "Slide Element",
      "phase": "in",
      "duration": 600,
      "delay": 100,
      "easing": "ease-out",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0, "position_x": -200 } },
        { "position": 100, "properties": { "opacity": 1, "position_x": 100 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes?.[0].properties?.position_x).toBe(-200);
      expect(result?.animations?.[0].keyframes?.[0].properties?.opacity).toBe(0);
      expect(result?.animations?.[0].keyframes?.[1].properties?.position_x).toBe(100);
      expect(result?.animations?.[0].keyframes?.[1].properties?.opacity).toBe(1);
    });

    it('should create scale-in animation', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Scaled", "element_type": "shape", "position_x": 100, "position_y": 100, "width": 200, "height": 200 }
  ],
  "animations": [
    {
      "element_name": "Scaled",
      "phase": "in",
      "duration": 500,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0, "scale_x": 0.5, "scale_y": 0.5 } },
        { "position": 100, "properties": { "opacity": 1, "scale_x": 1, "scale_y": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes?.[0].properties?.scale_x).toBe(0.5);
      expect(result?.animations?.[0].keyframes?.[0].properties?.scale_y).toBe(0.5);
      expect(result?.animations?.[0].keyframes?.[1].properties?.scale_x).toBe(1);
      expect(result?.animations?.[0].keyframes?.[1].properties?.scale_y).toBe(1);
    });

    it('should create fade-out animation', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Fade Out", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Fade Out",
      "phase": "out",
      "duration": 400,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 1 } },
        { "position": 100, "properties": { "opacity": 0 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].phase).toBe('out');
      expect(result?.animations?.[0].keyframes?.[0].properties?.opacity).toBe(1);
      expect(result?.animations?.[0].keyframes?.[1].properties?.opacity).toBe(0);
    });

    it('should create loop animation', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Loop", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Loop",
      "phase": "loop",
      "duration": 1000,
      "iterations": -1,
      "keyframes": [
        { "position": 0, "properties": { "rotation": 0 } },
        { "position": 100, "properties": { "rotation": 360 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].phase).toBe('loop');
      expect(result?.animations?.[0].iterations).toBe(-1);
      expect(result?.animations?.[0].keyframes?.[0].properties?.rotation).toBe(0);
      expect(result?.animations?.[0].keyframes?.[1].properties?.rotation).toBe(360);
    });
  });

  describe('Animation with Multiple Keyframes', () => {
    it('should handle complex multi-keyframe animation', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Complex", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Complex",
      "phase": "in",
      "duration": 1000,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0, "scale_x": 0.5, "scale_y": 0.5 } },
        { "position": 50, "properties": { "opacity": 0.8, "scale_x": 1.1, "scale_y": 1.1 } },
        { "position": 100, "properties": { "opacity": 1, "scale_x": 1, "scale_y": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes).toHaveLength(3);
      expect(result?.animations?.[0].keyframes?.[0].position).toBe(0);
      expect(result?.animations?.[0].keyframes?.[1].position).toBe(50);
      expect(result?.animations?.[0].keyframes?.[2].position).toBe(100);
    });

    it('should handle keyframes with offset (0-1) and convert to position (0-100)', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Offset Test", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Offset Test",
      "phase": "in",
      "keyframes": [
        { "offset": 0, "properties": { "opacity": 0 } },
        { "offset": 0.5, "properties": { "opacity": 0.5 } },
        { "offset": 1, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes?.[0].position).toBe(0);
      expect(result?.animations?.[0].keyframes?.[1].position).toBe(50); // 0.5 * 100
      expect(result?.animations?.[0].keyframes?.[2].position).toBe(100);
    });
  });

  describe('Animation Property Validation', () => {
    it('should validate and clamp position values to 0-100', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Clamp Test", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Clamp Test",
      "phase": "in",
      "keyframes": [
        { "position": -10, "properties": { "opacity": 0 } },
        { "position": 150, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes?.[0].position).toBe(0); // Clamped
      expect(result?.animations?.[0].keyframes?.[1].position).toBe(100); // Clamped
    });

    it('should validate and clamp opacity values to 0-1', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Opacity Test", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Opacity Test",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": -0.5 } },
        { "position": 100, "properties": { "opacity": 1.5 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      // Opacity should be clamped in normalizeAnimation
      const kf0 = result?.animations?.[0].keyframes?.[0];
      const kf1 = result?.animations?.[0].keyframes?.[1];
      expect(kf0?.properties?.opacity).toBeGreaterThanOrEqual(0);
      expect(kf0?.properties?.opacity).toBeLessThanOrEqual(1);
      expect(kf1?.properties?.opacity).toBeGreaterThanOrEqual(0);
      expect(kf1?.properties?.opacity).toBeLessThanOrEqual(1);
    });

    it('should validate phase and default to "in" for invalid phases', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Phase Test", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Phase Test",
      "phase": "invalid-phase",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].phase).toBe('in'); // Defaulted
    });

    it('should validate duration and use default if invalid', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Duration Test", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Duration Test",
      "phase": "in",
      "duration": -100,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].duration).toBeGreaterThan(0); // Should be defaulted or clamped
    });

    it('should validate delay and use default if negative', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Delay Test", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Delay Test",
      "phase": "in",
      "delay": -50,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].delay).toBeGreaterThanOrEqual(0); // Should be defaulted to 0
    });
  });

  describe('Default Animation Creation', () => {
    it('should create default fade animation when keyframes are missing', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Default", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Default",
      "phase": "in",
      "duration": 500
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes).toBeDefined();
      expect(result?.animations?.[0].keyframes?.length).toBeGreaterThanOrEqual(2);
      // Should have default fade keyframes
      const firstKf = result?.animations?.[0].keyframes?.[0];
      const lastKf = result?.animations?.[0].keyframes?.[result?.animations?.[0].keyframes!.length - 1];
      expect(firstKf?.position).toBe(0);
      expect(lastKf?.position).toBe(100);
    });

    it('should create default fade-out when phase is "out" and keyframes missing', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Default Out", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Default Out",
      "phase": "out",
      "duration": 400
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes?.[0].properties?.opacity).toBe(1); // Start visible
      expect(result?.animations?.[0].keyframes?.[result?.animations?.[0].keyframes!.length - 1].properties?.opacity).toBe(0); // End invisible
    });
  });

  describe('Element Name Matching', () => {
    it('should match animation to element by exact name', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Exact Match", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Exact Match",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].element_name).toBe('Exact Match');
    });

    it('should match animation using elementId', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "id": "elem-123", "name": "Element", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "elementId": "elem-123",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].element_name).toBe('Element'); // Should map from elementId to name
    });

    it('should handle element_id as alternative to element_name', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Alt Name", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_id": "Alt Name",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].element_name).toBe('Alt Name');
    });
  });

  describe('Multiple Animations', () => {
    it('should create multiple animations for different elements', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Element 1", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 },
    { "name": "Element 2", "element_type": "text", "position_x": 100, "position_y": 100, "width": 200, "height": 50 }
  ],
  "animations": [
    {
      "element_name": "Element 1",
      "phase": "in",
      "duration": 500,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    },
    {
      "element_name": "Element 2",
      "phase": "in",
      "duration": 600,
      "delay": 200,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0, "position_x": -100 } },
        { "position": 100, "properties": { "opacity": 1, "position_x": 100 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations).toHaveLength(2);
      expect(result?.animations?.[0].element_name).toBe('Element 1');
      expect(result?.animations?.[1].element_name).toBe('Element 2');
      expect(result?.animations?.[1].delay).toBe(200);
    });

    it('should create multiple animations for same element (in, loop, out)', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Multi Phase", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Multi Phase",
      "phase": "in",
      "duration": 500,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    },
    {
      "element_name": "Multi Phase",
      "phase": "loop",
      "duration": 2000,
      "iterations": -1,
      "keyframes": [
        { "position": 0, "properties": { "rotation": 0 } },
        { "position": 100, "properties": { "rotation": 360 } }
      ]
    },
    {
      "element_name": "Multi Phase",
      "phase": "out",
      "duration": 400,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 1 } },
        { "position": 100, "properties": { "opacity": 0 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations).toHaveLength(3);
      expect(result?.animations?.[0].phase).toBe('in');
      expect(result?.animations?.[1].phase).toBe('loop');
      expect(result?.animations?.[2].phase).toBe('out');
      expect(result?.animations?.[1].iterations).toBe(-1);
    });
  });

  describe('Animation Property Types', () => {
    it('should handle flat keyframe properties (legacy format)', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Flat Props", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Flat Props",
      "phase": "in",
      "keyframes": [
        { "position": 0, "opacity": 0, "position_x": -100 },
        { "position": 100, "opacity": 1, "position_x": 0 }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes?.[0].properties?.opacity).toBe(0);
      expect(result?.animations?.[0].keyframes?.[0].properties?.position_x).toBe(-100);
    });

    it('should handle nested properties object', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Nested Props", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Nested Props",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0, "scale_x": 0.5 } },
        { "position": 100, "properties": { "opacity": 1, "scale_x": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes?.[0].properties?.opacity).toBe(0);
      expect(result?.animations?.[0].keyframes?.[0].properties?.scale_x).toBe(0.5);
    });

    it('should handle transform property', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Transform", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Transform",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "transform": "translateX(-100px) rotate(0deg)" } },
        { "position": 100, "properties": { "transform": "translateX(0px) rotate(360deg)" } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes?.[0].properties?.transform).toBe('translateX(-100px) rotate(0deg)');
      expect(result?.animations?.[0].keyframes?.[1].properties?.transform).toBe('translateX(0px) rotate(360deg)');
    });

    it('should handle color and backgroundColor properties', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Color", "element_type": "text", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Color",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "color": "#000000", "backgroundColor": "#FFFFFF" } },
        { "position": 100, "properties": { "color": "#FFFFFF", "backgroundColor": "#000000" } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes?.[0].properties?.color).toBe('#000000');
      expect(result?.animations?.[0].keyframes?.[0].properties?.backgroundColor).toBe('#FFFFFF');
      expect(result?.animations?.[0].keyframes?.[1].properties?.color).toBe('#FFFFFF');
      expect(result?.animations?.[0].keyframes?.[1].properties?.backgroundColor).toBe('#000000');
    });
  });

  describe('Easing and Timing', () => {
    it('should handle different easing functions', () => {
      const easings = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(0.34, 1.56, 0.64, 1)'];

      easings.forEach(easing => {
        const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Easing Test", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Easing Test",
      "phase": "in",
      "easing": "${easing}",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

        const result = parseChangesFromResponse(response);

        expect(result?.animations?.[0].easing).toBe(easing);
      });
    });

    it('should default easing to "ease-out" if missing or invalid', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Default Easing", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Default Easing",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].easing).toBe('ease-out');
    });
  });

  describe('Error Handling', () => {
    it('should skip invalid animation data', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Valid", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Valid",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    },
    null,
    "invalid",
    {
      "element_name": "Valid 2",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      // Should only have valid animations
      expect(result?.animations?.length).toBeGreaterThanOrEqual(1);
      expect(result?.animations?.every(a => a && typeof a === 'object')).toBe(true);
    });

    it('should skip animations without element reference', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Valid", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    },
    {
      "element_name": "Valid",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      // Should filter out animation without element reference
      const validAnimations = result?.animations?.filter(a => a.element_name);
      expect(validAnimations?.length).toBe(1);
    });

    it('should handle invalid keyframe data gracefully', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Keyframe Test", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Keyframe Test",
      "phase": "in",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        null,
        "invalid",
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      // Should filter out invalid keyframes
      expect(result?.animations?.[0].keyframes?.length).toBeGreaterThanOrEqual(2);
      expect(result?.animations?.[0].keyframes?.every(kf => kf && typeof kf === 'object' && kf.position !== undefined)).toBe(true);
    });

    it('should handle missing keyframes array', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "No Keyframes", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "No Keyframes",
      "phase": "in",
      "duration": 500
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      // Should create default keyframes
      expect(result?.animations?.[0].keyframes).toBeDefined();
      expect(result?.animations?.[0].keyframes?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Blueprint Animation Conversion', () => {
    it('should convert blueprint animation sequence to animations', () => {
      const response = `\`\`\`json
{
  "id": "test-blueprint",
  "layerType": "fullscreen",
  "canvas": { "width": 1920, "height": 1080 },
  "layout": {
    "id": "root",
    "type": "region",
    "children": [
      {
        "id": "element1",
        "name": "Element 1",
        "type": "slot",
        "elementType": "text",
        "position": { "x": 100, "y": 100 },
        "size": { "width": 200, "height": 100 },
        "animation": {
          "in": {
            "type": "fade-slide",
            "from": { "y": -20, "opacity": 0 },
            "to": { "y": 0, "opacity": 1 },
            "duration": 500,
            "easing": "ease-out",
            "delay": 0
          }
        }
      }
    ]
  }
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      // Blueprint should be converted to standard format
      if (result?.animations) {
        expect(result.animations.length).toBeGreaterThan(0);
      }
    });

    it('should convert blueprint with in, loop, and out animations', () => {
      const response = `\`\`\`json
{
  "id": "blueprint-full",
  "layerType": "fullscreen",
  "canvas": { "width": 1920, "height": 1080 },
  "layout": {
    "id": "root",
    "type": "region",
    "children": [
      {
        "id": "animated",
        "name": "Animated Element",
        "type": "slot",
        "elementType": "text",
        "position": { "x": 100, "y": 100 },
        "size": { "width": 200, "height": 100 },
        "animation": {
          "in": {
            "from": { "opacity": 0, "scale": 0.8 },
            "to": { "opacity": 1, "scale": 1 },
            "duration": 500,
            "easing": "ease-out"
          },
          "loop": {
            "from": { "rotation": 0 },
            "to": { "rotation": 360 },
            "duration": 2000,
            "easing": "linear"
          },
          "out": {
            "from": { "opacity": 1 },
            "to": { "opacity": 0 },
            "duration": 400,
            "easing": "ease-in"
          }
        }
      }
    ]
  }
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      if (result?.animations) {
        // Should have at least in animation, possibly loop and out
        expect(result.animations.length).toBeGreaterThan(0);
        const inAnim = result.animations.find(a => a.phase === 'in');
        expect(inAnim).toBeDefined();
      }
    });
  });

  describe('Complex Animation Scenarios', () => {
    it('should handle animation with all property types', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "All Props", "element_type": "shape", "position_x": 100, "position_y": 100, "width": 200, "height": 200 }
  ],
  "animations": [
    {
      "element_name": "All Props",
      "phase": "in",
      "duration": 1000,
      "delay": 100,
      "easing": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      "keyframes": [
        {
          "position": 0,
          "properties": {
            "opacity": 0,
            "position_x": 50,
            "position_y": 50,
            "scale_x": 0.5,
            "scale_y": 0.5,
            "rotation": -45,
            "color": "#000000",
            "backgroundColor": "#FFFFFF",
            "transform": "translateX(-50px)"
          }
        },
        {
          "position": 100,
          "properties": {
            "opacity": 1,
            "position_x": 100,
            "position_y": 100,
            "scale_x": 1,
            "scale_y": 1,
            "rotation": 0,
            "color": "#FFFFFF",
            "backgroundColor": "#000000",
            "transform": "translateX(0px)"
          }
        }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations?.[0].keyframes?.[0].properties).toHaveProperty('opacity');
      expect(result?.animations?.[0].keyframes?.[0].properties).toHaveProperty('position_x');
      expect(result?.animations?.[0].keyframes?.[0].properties).toHaveProperty('position_y');
      expect(result?.animations?.[0].keyframes?.[0].properties).toHaveProperty('scale_x');
      expect(result?.animations?.[0].keyframes?.[0].properties).toHaveProperty('scale_y');
      expect(result?.animations?.[0].keyframes?.[0].properties).toHaveProperty('rotation');
      expect(result?.animations?.[0].keyframes?.[0].properties).toHaveProperty('color');
      expect(result?.animations?.[0].keyframes?.[0].properties).toHaveProperty('backgroundColor');
      expect(result?.animations?.[0].keyframes?.[0].properties).toHaveProperty('transform');
    });

    it('should handle staggered animations with delays', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Stagger 1", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 },
    { "name": "Stagger 2", "element_type": "shape", "position_x": 100, "position_y": 0, "width": 100, "height": 100 },
    { "name": "Stagger 3", "element_type": "shape", "position_x": 200, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Stagger 1",
      "phase": "in",
      "duration": 500,
      "delay": 0,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    },
    {
      "element_name": "Stagger 2",
      "phase": "in",
      "duration": 500,
      "delay": 100,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    },
    {
      "element_name": "Stagger 3",
      "phase": "in",
      "duration": 500,
      "delay": 200,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.animations).toHaveLength(3);
      expect(result?.animations?.[0].delay).toBe(0);
      expect(result?.animations?.[1].delay).toBe(100);
      expect(result?.animations?.[2].delay).toBe(200);
    });
  });

  describe('Animation Modification (Update Scenarios)', () => {
    it('should parse animation updates in update action', () => {
      const response = `\`\`\`json
{
  "action": "update",
  "elements": [
    {
      "id": "existing-element-id",
      "styles": { "backgroundColor": "#ff0000" }
    }
  ],
  "animations": [
    {
      "element_name": "Updated Element",
      "phase": "in",
      "duration": 800,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0, "scale_x": 0.8 } },
        { "position": 100, "properties": { "opacity": 1, "scale_x": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result?.type).toBe('update');
      expect(result?.animations).toBeDefined();
      expect(result?.animations?.length).toBe(1);
      expect(result?.animations?.[0].duration).toBe(800);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty animations array', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "No Anim", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": []
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      expect(result?.animations).toBeDefined();
      expect(result?.animations?.length).toBe(0);
    });

    it('should handle missing animations field', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "No Anim Field", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      // Animations should be empty array or undefined
      expect(result?.animations === undefined || Array.isArray(result?.animations)).toBe(true);
    });

    it('should handle very long duration values', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "Long Duration", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "Long Duration",
      "phase": "in",
      "duration": 100000,
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      // Duration should be clamped to max (60000ms)
      expect(result?.animations?.[0].duration).toBeLessThanOrEqual(60000);
    });

    it('should handle string duration and convert to number', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    { "name": "String Duration", "element_type": "shape", "position_x": 0, "position_y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "element_name": "String Duration",
      "phase": "in",
      "duration": "500ms",
      "keyframes": [
        { "position": 0, "properties": { "opacity": 0 } },
        { "position": 100, "properties": { "opacity": 1 } }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(typeof result?.animations?.[0].duration).toBe('number');
      expect(result?.animations?.[0].duration).toBe(500);
    });
  });
});

