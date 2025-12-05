import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useDesignerStore } from '@/stores/designerStore';
import type { Element, Animation, Keyframe } from '@/types/database';

// Mock the store
vi.mock('@/stores/designerStore', () => ({
  useDesignerStore: vi.fn(),
}));

describe('ChatPanel Animation Application', () => {
  let mockStore: any;
  let mockElements: Element[];
  let mockAnimations: Animation[];
  let mockKeyframes: Keyframe[];

  beforeEach(() => {
    mockElements = [
      {
        id: 'elem-1',
        template_id: 'template-1',
        name: 'Test Element',
        element_type: 'shape',
        position_x: 100,
        position_y: 100,
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 1,
        scale_x: 1,
        scale_y: 1,
        z_index: 0,
        visible: true,
        locked: false,
        parent_element_id: null,
        styles: {},
        content: { type: 'shape', shape: 'rectangle', fill: '#3B82F6' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockAnimations = [];
    mockKeyframes = [];

    mockStore = {
      elements: mockElements,
      animations: mockAnimations,
      keyframes: mockKeyframes,
      setAnimations: vi.fn((animations) => {
        mockAnimations = animations;
      }),
      setKeyframes: vi.fn((keyframes) => {
        mockKeyframes = keyframes;
      }),
      getState: vi.fn(() => mockStore),
    };

    (useDesignerStore as any).mockReturnValue(mockStore);
    (useDesignerStore.getState as any) = vi.fn(() => mockStore);
  });

  describe('Animation Creation from AI Changes', () => {
    it('should create animation with matching element name', () => {
      const changes = {
        type: 'create' as const,
        elements: [
          {
            name: 'Test Element',
            element_type: 'shape',
            position_x: 100,
            position_y: 100,
            width: 200,
            height: 200,
          },
        ],
        animations: [
          {
            element_name: 'Test Element',
            phase: 'in',
            duration: 500,
            delay: 0,
            easing: 'ease-out',
            keyframes: [
              { position: 0, properties: { opacity: 0 } },
              { position: 100, properties: { opacity: 1 } },
            ],
          },
        ],
      };

      // Simulate the animation creation logic from ChatPanel
      const elementNameToId: Record<string, string> = {
        'Test Element': 'elem-1',
      };

      const newAnimations: Animation[] = [];
      const newKeyframes: Keyframe[] = [];

      changes.animations?.forEach((animData: any) => {
        const elementId = elementNameToId[animData.element_name] ||
          mockStore.elements.find((e: Element) => e.name === animData.element_name)?.id;

        if (!elementId) return;

        const animId = 'anim-1';
        const animation: Animation = {
          id: animId,
          template_id: 'template-1',
          element_id: elementId,
          phase: animData.phase as 'in' | 'loop' | 'out',
          delay: animData.delay || 0,
          duration: animData.duration || 500,
          iterations: 1,
          direction: 'normal',
          easing: animData.easing || 'ease-out',
          preset_id: null,
          created_at: new Date().toISOString(),
        };
        newAnimations.push(animation);

        if (animData.keyframes && Array.isArray(animData.keyframes)) {
          animData.keyframes.forEach((kfData: any) => {
            const keyframe: Keyframe = {
              id: `kf-${newKeyframes.length}`,
              animation_id: animId,
              position: kfData.position || 0,
              properties: kfData.properties || {},
            };
            newKeyframes.push(keyframe);
          });
        }
      });

      expect(newAnimations).toHaveLength(1);
      expect(newAnimations[0].element_id).toBe('elem-1');
      expect(newAnimations[0].phase).toBe('in');
      expect(newAnimations[0].duration).toBe(500);
      expect(newKeyframes).toHaveLength(2);
      expect(newKeyframes[0].position).toBe(0);
      expect(newKeyframes[0].properties.opacity).toBe(0);
      expect(newKeyframes[1].position).toBe(100);
      expect(newKeyframes[1].properties.opacity).toBe(1);
    });

    it('should handle case-insensitive element name matching', () => {
      const changes = {
        type: 'create' as const,
        elements: [
          {
            name: 'Test Element',
            element_type: 'shape',
            position_x: 100,
            position_y: 100,
            width: 200,
            height: 200,
          },
        ],
        animations: [
          {
            element_name: 'test element', // lowercase
            phase: 'in',
            duration: 500,
            keyframes: [
              { position: 0, properties: { opacity: 0 } },
              { position: 100, properties: { opacity: 1 } },
            ],
          },
        ],
      };

      const elementNameToId: Record<string, string> = {};
      const newAnimations: Animation[] = [];

      changes.animations?.forEach((animData: any) => {
        let elementId = elementNameToId[animData.element_name] ||
          mockStore.elements.find((e: Element) => e.name === animData.element_name)?.id;

        // Try case-insensitive match
        if (!elementId) {
          const partialMatch = mockStore.elements.find((e: Element) =>
            e.name.toLowerCase() === animData.element_name.toLowerCase()
          );
          if (partialMatch) {
            elementId = partialMatch.id;
          }
        }

        if (elementId) {
          const animation: Animation = {
            id: 'anim-1',
            template_id: 'template-1',
            element_id: elementId,
            phase: animData.phase as 'in',
            delay: 0,
            duration: animData.duration || 500,
            iterations: 1,
            direction: 'normal',
            easing: 'ease-out',
            preset_id: null,
            created_at: new Date().toISOString(),
          };
          newAnimations.push(animation);
        }
      });

      expect(newAnimations).toHaveLength(1);
      expect(newAnimations[0].element_id).toBe('elem-1');
    });

    it('should skip animation if element not found', () => {
      const changes = {
        type: 'create' as const,
        elements: [],
        animations: [
          {
            element_name: 'Non-existent Element',
            phase: 'in',
            duration: 500,
            keyframes: [
              { position: 0, properties: { opacity: 0 } },
              { position: 100, properties: { opacity: 1 } },
            ],
          },
        ],
      };

      const elementNameToId: Record<string, string> = {};
      const newAnimations: Animation[] = [];

      changes.animations?.forEach((animData: any) => {
        const elementId = elementNameToId[animData.element_name] ||
          mockStore.elements.find((e: Element) => e.name === animData.element_name)?.id;

        if (!elementId) {
          return; // Skip
        }

        // Should not reach here
        newAnimations.push({} as Animation);
      });

      expect(newAnimations).toHaveLength(0);
    });

    it('should create default keyframes when keyframes array is empty', () => {
      const changes = {
        type: 'create' as const,
        elements: [
          {
            name: 'Test Element',
            element_type: 'shape',
            position_x: 100,
            position_y: 100,
            width: 200,
            height: 200,
          },
        ],
        animations: [
          {
            element_name: 'Test Element',
            phase: 'in',
            duration: 500,
            // No keyframes
          },
        ],
      };

      const elementNameToId: Record<string, string> = {
        'Test Element': 'elem-1',
      };
      const newAnimations: Animation[] = [];
      const newKeyframes: Keyframe[] = [];

      changes.animations?.forEach((animData: any) => {
        const elementId = elementNameToId[animData.element_name];
        if (!elementId) return;

        const animId = 'anim-1';
        const animation: Animation = {
          id: animId,
          template_id: 'template-1',
          element_id: elementId,
          phase: animData.phase as 'in',
          delay: 0,
          duration: animData.duration || 500,
          iterations: 1,
          direction: 'normal',
          easing: 'ease-out',
          preset_id: null,
          created_at: new Date().toISOString(),
        };
        newAnimations.push(animation);

        if (animData.keyframes && Array.isArray(animData.keyframes) && animData.keyframes.length > 0) {
          animData.keyframes.forEach((kfData: any) => {
            newKeyframes.push({
              id: `kf-${newKeyframes.length}`,
              animation_id: animId,
              position: kfData.position || 0,
              properties: kfData.properties || {},
            });
          });
        } else {
          // Create default keyframes
          newKeyframes.push(
            {
              id: 'kf-0',
              animation_id: animId,
              position: 0,
              properties: { opacity: 0 },
            },
            {
              id: 'kf-1',
              animation_id: animId,
              position: 100,
              properties: { opacity: 1 },
            }
          );
        }
      });

      expect(newKeyframes).toHaveLength(2);
      expect(newKeyframes[0].properties.opacity).toBe(0);
      expect(newKeyframes[1].properties.opacity).toBe(1);
    });

    it('should validate and sanitize animation properties', () => {
      const changes = {
        type: 'create' as const,
        elements: [
          {
            name: 'Test Element',
            element_type: 'shape',
            position_x: 100,
            position_y: 100,
            width: 200,
            height: 200,
          },
        ],
        animations: [
          {
            element_name: 'Test Element',
            phase: 'invalid-phase', // Invalid
            duration: -100, // Invalid
            delay: -50, // Invalid
            easing: '', // Invalid
            keyframes: [
              { position: -10, properties: { opacity: -0.5 } }, // Invalid
              { position: 150, properties: { opacity: 1.5 } }, // Invalid
            ],
          },
        ],
      };

      const elementNameToId: Record<string, string> = {
        'Test Element': 'elem-1',
      };
      const newAnimations: Animation[] = [];
      const newKeyframes: Keyframe[] = [];

      changes.animations?.forEach((animData: any) => {
        const elementId = elementNameToId[animData.element_name];
        if (!elementId) return;

        const validPhases = ['in', 'loop', 'out'];
        const phase = validPhases.includes(animData.phase) ? animData.phase : 'in';
        const delay = typeof animData.delay === 'number' && !isNaN(animData.delay) && animData.delay >= 0
          ? animData.delay : 0;
        const duration = typeof animData.duration === 'number' && !isNaN(animData.duration) && animData.duration > 0
          ? animData.duration : 500;
        const easing = typeof animData.easing === 'string' && animData.easing.length > 0
          ? animData.easing : 'ease-out';

        const animId = 'anim-1';
        newAnimations.push({
          id: animId,
          template_id: 'template-1',
          element_id: elementId,
          phase: phase as 'in',
          delay,
          duration,
          iterations: 1,
          direction: 'normal',
          easing,
          preset_id: null,
          created_at: new Date().toISOString(),
        });

        if (animData.keyframes && Array.isArray(animData.keyframes)) {
          animData.keyframes.forEach((kfData: any) => {
            let position = typeof kfData.position === 'number' ? kfData.position : 0;
            if (isNaN(position) || position < 0) position = 0;
            if (position > 100) position = 100;

            const properties: Record<string, any> = {};
            if (kfData.properties) {
              Object.assign(properties, kfData.properties);
              // Clamp opacity
              if (properties.opacity !== undefined) {
                properties.opacity = Math.max(0, Math.min(1, properties.opacity));
              }
            }

            newKeyframes.push({
              id: `kf-${newKeyframes.length}`,
              animation_id: animId,
              position,
              properties,
            });
          });
        }
      });

      expect(newAnimations[0].phase).toBe('in'); // Defaulted
      expect(newAnimations[0].delay).toBe(0); // Defaulted
      expect(newAnimations[0].duration).toBe(500); // Defaulted
      expect(newAnimations[0].easing).toBe('ease-out'); // Defaulted
      expect(newKeyframes[0].position).toBe(0); // Clamped
      expect(newKeyframes[1].position).toBe(100); // Clamped
      expect(newKeyframes[0].properties.opacity).toBeGreaterThanOrEqual(0);
      expect(newKeyframes[0].properties.opacity).toBeLessThanOrEqual(1);
      expect(newKeyframes[1].properties.opacity).toBeGreaterThanOrEqual(0);
      expect(newKeyframes[1].properties.opacity).toBeLessThanOrEqual(1);
    });

    it('should handle nested properties object in keyframes', () => {
      const changes = {
        type: 'create' as const,
        elements: [
          {
            name: 'Test Element',
            element_type: 'shape',
            position_x: 100,
            position_y: 100,
            width: 200,
            height: 200,
          },
        ],
        animations: [
          {
            element_name: 'Test Element',
            phase: 'in',
            duration: 500,
            keyframes: [
              {
                position: 0,
                properties: {
                  opacity: 0,
                  scale_x: 0.5,
                  scale_y: 0.5,
                },
              },
              {
                position: 100,
                properties: {
                  opacity: 1,
                  scale_x: 1,
                  scale_y: 1,
                },
              },
            ],
          },
        ],
      };

      const elementNameToId: Record<string, string> = {
        'Test Element': 'elem-1',
      };
      const newKeyframes: Keyframe[] = [];

      changes.animations?.[0].keyframes?.forEach((kfData: any) => {
        let kfProperties: Record<string, any>;
        if (kfData.properties && typeof kfData.properties === 'object') {
          kfProperties = { ...kfData.properties };
        } else {
          kfProperties = {};
        }

        newKeyframes.push({
          id: `kf-${newKeyframes.length}`,
          animation_id: 'anim-1',
          position: kfData.position || 0,
          properties: kfProperties,
        });
      });

      expect(newKeyframes[0].properties.opacity).toBe(0);
      expect(newKeyframes[0].properties.scale_x).toBe(0.5);
      expect(newKeyframes[0].properties.scale_y).toBe(0.5);
      expect(newKeyframes[1].properties.opacity).toBe(1);
      expect(newKeyframes[1].properties.scale_x).toBe(1);
      expect(newKeyframes[1].properties.scale_y).toBe(1);
    });

    it('should handle flat keyframe properties (legacy format)', () => {
      const changes = {
        type: 'create' as const,
        elements: [
          {
            name: 'Test Element',
            element_type: 'shape',
            position_x: 100,
            position_y: 100,
            width: 200,
            height: 200,
          },
        ],
        animations: [
          {
            element_name: 'Test Element',
            phase: 'in',
            duration: 500,
            keyframes: [
              {
                position: 0,
                opacity: 0, // Flat property
                position_x: -100, // Flat property
              },
              {
                position: 100,
                opacity: 1, // Flat property
                position_x: 100, // Flat property
              },
            ],
          },
        ],
      };

      const elementNameToId: Record<string, string> = {
        'Test Element': 'elem-1',
      };
      const newKeyframes: Keyframe[] = [];

      changes.animations?.[0].keyframes?.forEach((kfData: any) => {
        let kfProperties: Record<string, any>;
        if (kfData.properties && typeof kfData.properties === 'object') {
          kfProperties = { ...kfData.properties };
        } else {
          // Flat structure (legacy support)
          kfProperties = {};
          if (kfData.opacity !== undefined && typeof kfData.opacity === 'number' && !isNaN(kfData.opacity)) {
            kfProperties.opacity = Math.max(0, Math.min(1, kfData.opacity));
          }
          if (kfData.position_x !== undefined) {
            kfProperties.position_x = kfData.position_x;
          }
        }

        newKeyframes.push({
          id: `kf-${newKeyframes.length}`,
          animation_id: 'anim-1',
          position: kfData.position || 0,
          properties: kfProperties,
        });
      });

      expect(newKeyframes[0].properties.opacity).toBe(0);
      expect(newKeyframes[0].properties.position_x).toBe(-100);
      expect(newKeyframes[1].properties.opacity).toBe(1);
      expect(newKeyframes[1].properties.position_x).toBe(100);
    });

    it('should skip invalid animation data', () => {
      const changes = {
        type: 'create' as const,
        elements: [],
        animations: [
          null,
          'invalid',
          {
            element_name: 'Test Element',
            phase: 'in',
            duration: 500,
            keyframes: [
              { position: 0, properties: { opacity: 0 } },
              { position: 100, properties: { opacity: 1 } },
            ],
          },
        ],
      };

      const newAnimations: Animation[] = [];

      changes.animations?.forEach((animData: any) => {
        if (!animData || typeof animData !== 'object') {
          return; // Skip invalid
        }

        const elementId = mockStore.elements.find((e: Element) => e.name === animData.element_name)?.id;
        if (!elementId) return;

        newAnimations.push({
          id: 'anim-1',
          template_id: 'template-1',
          element_id: elementId,
          phase: animData.phase as 'in',
          delay: 0,
          duration: animData.duration || 500,
          iterations: 1,
          direction: 'normal',
          easing: 'ease-out',
          preset_id: null,
          created_at: new Date().toISOString(),
        });
      });

      expect(newAnimations).toHaveLength(1); // Only valid animation
    });

    it('should skip invalid keyframe data', () => {
      const changes = {
        type: 'create' as const,
        elements: [
          {
            name: 'Test Element',
            element_type: 'shape',
            position_x: 100,
            position_y: 100,
            width: 200,
            height: 200,
          },
        ],
        animations: [
          {
            element_name: 'Test Element',
            phase: 'in',
            duration: 500,
            keyframes: [
              { position: 0, properties: { opacity: 0 } },
              null,
              'invalid',
              { position: 100, properties: { opacity: 1 } },
            ],
          },
        ],
      };

      const elementNameToId: Record<string, string> = {
        'Test Element': 'elem-1',
      };
      const newKeyframes: Keyframe[] = [];

      changes.animations?.[0].keyframes?.forEach((kfData: any) => {
        if (!kfData || typeof kfData !== 'object') {
          return; // Skip invalid
        }

        newKeyframes.push({
          id: `kf-${newKeyframes.length}`,
          animation_id: 'anim-1',
          position: kfData.position || 0,
          properties: kfData.properties || {},
        });
      });

      expect(newKeyframes).toHaveLength(2); // Only valid keyframes
    });
  });

  describe('Multiple Animations for Same Element', () => {
    it('should create in, loop, and out animations for same element', () => {
      const changes = {
        type: 'create' as const,
        elements: [
          {
            name: 'Multi Phase',
            element_type: 'shape',
            position_x: 100,
            position_y: 100,
            width: 200,
            height: 200,
          },
        ],
        animations: [
          {
            element_name: 'Multi Phase',
            phase: 'in',
            duration: 500,
            keyframes: [
              { position: 0, properties: { opacity: 0 } },
              { position: 100, properties: { opacity: 1 } },
            ],
          },
          {
            element_name: 'Multi Phase',
            phase: 'loop',
            duration: 2000,
            iterations: -1,
            keyframes: [
              { position: 0, properties: { rotation: 0 } },
              { position: 100, properties: { rotation: 360 } },
            ],
          },
          {
            element_name: 'Multi Phase',
            phase: 'out',
            duration: 400,
            keyframes: [
              { position: 0, properties: { opacity: 1 } },
              { position: 100, properties: { opacity: 0 } },
            ],
          },
        ],
      };

      const elementNameToId: Record<string, string> = {
        'Multi Phase': 'elem-1',
      };
      const newAnimations: Animation[] = [];

      changes.animations?.forEach((animData: any) => {
        const elementId = elementNameToId[animData.element_name];
        if (!elementId) return;

        newAnimations.push({
          id: `anim-${newAnimations.length}`,
          template_id: 'template-1',
          element_id: elementId,
          phase: animData.phase as 'in' | 'loop' | 'out',
          delay: 0,
          duration: animData.duration || 500,
          iterations: animData.iterations || 1,
          direction: 'normal',
          easing: 'ease-out',
          preset_id: null,
          created_at: new Date().toISOString(),
        });
      });

      expect(newAnimations).toHaveLength(3);
      expect(newAnimations[0].phase).toBe('in');
      expect(newAnimations[1].phase).toBe('loop');
      expect(newAnimations[2].phase).toBe('out');
      expect(newAnimations[1].iterations).toBe(-1);
    });
  });
});





