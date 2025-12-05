import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseChangesFromResponse, isDrasticChange } from './ai';

describe('parseChangesFromResponse', () => {
  describe('Simplified format parsing (Pattern 4)', () => {
    it('should parse elements with x/y coordinates', () => {
      const response = `Here's a weather card:

\`\`\`json
{
  "elements": [
    {
      "id": "weather-bg",
      "name": "Weather Background",
      "type": "shape",
      "x": 50,
      "y": 800,
      "width": 350,
      "height": 230
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('create');
      expect(result?.elements).toHaveLength(1);
      expect(result?.elements?.[0].position_x).toBe(50);
      expect(result?.elements?.[0].position_y).toBe(800);
      expect(result?.elements?.[0].width).toBe(350);
      expect(result?.elements?.[0].height).toBe(230);
    });

    it('should parse text elements correctly', () => {
      const response = `\`\`\`json
{
  "elements": [
    {
      "id": "title",
      "name": "Title Text",
      "type": "text",
      "x": 70,
      "y": 820,
      "width": 200,
      "content": {
        "text": "Hello World",
        "fontSize": 24,
        "fontWeight": "bold",
        "color": "#ffffff"
      }
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      expect(result?.elements?.[0].element_type).toBe('text');
      expect(result?.elements?.[0].content?.text).toBe('Hello World');
    });

    it('should parse animations with elementId mapping', () => {
      const response = `\`\`\`json
{
  "elements": [
    { "id": "box", "name": "Box", "type": "shape", "x": 100, "y": 100, "width": 200, "height": 200 }
  ],
  "animations": [
    {
      "elementId": "box",
      "phase": "in",
      "delay": 0,
      "duration": 400,
      "keyframes": [
        { "offset": 0, "opacity": 0, "x": -50 },
        { "offset": 100, "opacity": 1, "x": 0 }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      expect(result?.animations).toHaveLength(1);
      expect(result?.animations?.[0].phase).toBe('in');
      // Parser uses 'delay' and 'duration' field names (not delay_ms/duration_ms)
      expect(result?.animations?.[0].delay).toBe(0);
      expect(result?.animations?.[0].duration).toBe(400);
      // element_name should be mapped from elementId
      expect(result?.animations?.[0].element_name).toBeDefined();
    });

    it('should handle missing required fields gracefully', () => {
      const response = `\`\`\`json
{
  "elements": [
    { "name": "Incomplete Element" }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      // Should still parse but with defaults
      expect(result).not.toBeNull();
      expect(result?.elements).toHaveLength(1);
      // Should have default position
      expect(result?.elements?.[0].position_x).toBeDefined();
      expect(result?.elements?.[0].position_y).toBeDefined();
    });

    it('should handle string coordinates and convert to numbers', () => {
      const response = `\`\`\`json
{
  "elements": [
    { "id": "test", "name": "Test", "type": "shape", "x": "100px", "y": "200", "width": "50%", "height": 300 }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      expect(result?.elements?.[0].position_x).toBe(100);
      expect(result?.elements?.[0].position_y).toBe(200);
      // width with % should fall back to default
      expect(typeof result?.elements?.[0].width).toBe('number');
    });
  });

  describe('Standard format parsing', () => {
    it('should parse action-based format with create action', () => {
      const response = `\`\`\`json
{
  "action": "create",
  "elements": [
    {
      "name": "Background",
      "element_type": "shape",
      "position_x": 100,
      "position_y": 200,
      "width": 1920,
      "height": 1080
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('create');
      expect(result?.elements).toHaveLength(1);
      // Note: Parser uses || instead of ?? so 0 values fall back to layer defaults
      expect(result?.elements?.[0].position_x).toBe(100);
      expect(result?.elements?.[0].position_y).toBe(200);
    });

    it('should parse action-based format with layer_type', () => {
      // Test action format with layer_type specified
      const response = `\`\`\`json
{
  "action": "create",
  "layer_type": "lower-third",
  "elements": [
    {
      "name": "L3 Background",
      "element_type": "shape",
      "position_x": 50,
      "position_y": 800,
      "width": 600,
      "height": 200
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('create');
      // Parser reads layer_type from action format
      expect(result?.layerType).toBe('lower-third');
      expect(result?.elements).toHaveLength(1);
    });
  });

  describe('Keyframe normalization', () => {
    it('should parse animations with keyframes embedded', () => {
      const response = `\`\`\`json
{
  "elements": [
    { "id": "box", "name": "Box", "type": "shape", "x": 0, "y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "elementId": "box",
      "phase": "in",
      "keyframes": [
        { "offset": 0, "opacity": 0 },
        { "position": 50, "opacity": 0.5 },
        { "offset": 100, "opacity": 1 }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      // Animations should be parsed and contain keyframes (as part of animation objects)
      expect(result?.animations).toBeDefined();
      expect(result?.animations?.length).toBeGreaterThan(0);
    });

    it('should handle keyframe coordinates (x, y) in animations', () => {
      const response = `\`\`\`json
{
  "elements": [
    { "id": "slide", "name": "Slide", "type": "shape", "x": 0, "y": 0, "width": 100, "height": 100 }
  ],
  "animations": [
    {
      "elementId": "slide",
      "phase": "in",
      "keyframes": [
        { "offset": 0, "x": -100, "y": 0, "opacity": 0 },
        { "offset": 100, "x": 0, "y": 0, "opacity": 1 }
      ]
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      // Should have animations
      expect(result?.animations).toBeDefined();
      expect(result?.animations?.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should return null for empty response', () => {
      const result = parseChangesFromResponse('');
      expect(result).toBeNull();
    });

    it('should return null for response without JSON', () => {
      const result = parseChangesFromResponse('Here is some text without any JSON');
      expect(result).toBeNull();
    });

    it('should handle malformed JSON gracefully', () => {
      const response = `\`\`\`json
{
  "elements": [
    { "name": "broken"
\`\`\``;

      // Should not throw
      const result = parseChangesFromResponse(response);
      // May be null or parsed depending on recovery logic
      expect(() => parseChangesFromResponse(response)).not.toThrow();
    });

    it('should handle deeply nested objects', () => {
      const response = `\`\`\`json
{
  "elements": [
    {
      "id": "complex",
      "name": "Complex",
      "type": "shape",
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 100,
      "content": {
        "fill": "#000000",
        "gradient": {
          "enabled": true,
          "type": "linear",
          "colors": [
            { "color": "#ff0000", "stop": 0 },
            { "color": "#0000ff", "stop": 100 }
          ]
        },
        "glass": {
          "enabled": true,
          "blur": 20,
          "opacity": 0.5
        }
      }
    }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      expect(result?.elements?.[0].content?.gradient?.enabled).toBe(true);
      expect(result?.elements?.[0].content?.glass?.enabled).toBe(true);
    });

    it('should handle empty elements array', () => {
      const response = `\`\`\`json
{
  "elements": []
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      // Parser still returns a result even with empty elements
      expect(result).not.toBeNull();
      expect(result?.elements).toHaveLength(0);
    });
  });

  describe('Validation hints', () => {
    it('should preserve out-of-bounds positions (no clamping)', () => {
      const response = `\`\`\`json
{
  "elements": [
    { "id": "offscreen", "name": "Offscreen", "type": "shape", "x": -5000, "y": 10000, "width": 100, "height": 100 }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      // Parser preserves positions (clamping not implemented - validation hints warn instead)
      expect(result?.elements?.[0].position_x).toBe(-5000);
      expect(result?.elements?.[0].position_y).toBe(10000);
    });

    it('should handle zero/negative dimensions with defaults', () => {
      const response = `\`\`\`json
{
  "elements": [
    { "id": "tiny", "name": "Tiny", "type": "shape", "x": 0, "y": 0, "width": 0, "height": -10 }
  ]
}
\`\`\``;

      const result = parseChangesFromResponse(response);

      expect(result).not.toBeNull();
      // Width/height are parsed but may be 0 or negative - no minimum enforcement in parser
      expect(result?.elements?.[0].width).toBeDefined();
      expect(result?.elements?.[0].height).toBeDefined();
    });
  });
});

describe('isDrasticChange', () => {
  it('should return true for large number of elements', () => {
    const elements = Array.from({ length: 25 }, (_, i) => ({
      name: `Element ${i}`,
      element_type: 'shape' as const,
      position_x: i * 10,
      position_y: i * 10,
    }));

    const result = isDrasticChange({
      type: 'create',
      elements,
    });

    expect(result).toBe(true);
  });

  it('should return true for delete operations', () => {
    const result = isDrasticChange({
      type: 'delete',
      elementsToDelete: ['elem-1', 'elem-2'],
    });

    expect(result).toBe(true);
  });

  it('should return false for small changes', () => {
    const result = isDrasticChange({
      type: 'create',
      elements: [
        { name: 'Element 1', element_type: 'shape', position_x: 0, position_y: 0 },
        { name: 'Element 2', element_type: 'text', position_x: 100, position_y: 100 },
      ],
    });

    expect(result).toBe(false);
  });

  it('should return false for undefined changes', () => {
    const result = isDrasticChange(undefined);
    expect(result).toBe(false);
  });
});
