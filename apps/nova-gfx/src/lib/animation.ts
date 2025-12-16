// Animation Engine for Nova GFX
// Handles playback, interpolation, and timing

import type { Animation, Keyframe, Element } from '@emergent-platform/types';

export const FRAME_RATE = 30; // 30 fps
export const FRAME_DURATION = 1000 / FRAME_RATE; // ~33.33ms per frame

// Convert milliseconds to frames
export function msToFrames(ms: number): number {
  return Math.round(ms / FRAME_DURATION);
}

// Convert frames to milliseconds
export function framesToMs(frames: number): number {
  return frames * FRAME_DURATION;
}

// Format time for display
export function formatTime(ms: number, showFrames: boolean = false): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = msToFrames(ms % 1000);

  if (showFrames) {
    // Show frames when zoomed in (e.g., "00:01:15" for 1 second + 15 frames)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  } else {
    // Show seconds (e.g., "0:01.5")
    const decimal = Math.floor((ms % 1000) / 100);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${decimal}`;
    }
    return `${seconds}.${decimal}s`;
  }
}

// Format short time (for rulers)
export function formatTimeShort(ms: number, showFrames: boolean = false): string {
  const totalSeconds = ms / 1000;
  const seconds = Math.floor(totalSeconds);
  const frames = msToFrames(ms % 1000);

  if (showFrames && ms < 1000) {
    return `${frames}f`;
  }
  return `${seconds}s`;
}

// Easing functions
export const easings: Record<string, (t: number) => number> = {
  linear: (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  'ease': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'cubic-in': (t) => t * t * t,
  'cubic-out': (t) => 1 - Math.pow(1 - t, 3),
  'cubic-in-out': (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  'elastic-out': (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  'bounce-out': (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// Apply easing function
export function applyEasing(t: number, easing: string): number {
  return (easings[easing] || easings.linear)(Math.max(0, Math.min(1, t)));
}

// Interpolate between two values
export function interpolate(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

// Parse CSS value to number (handles px, %, deg, etc.)
export function parseCSSValue(value: string | number): { value: number; unit: string } {
  if (typeof value === 'number') return { value, unit: '' };
  const match = value.match(/^(-?[\d.]+)(.*)$/);
  if (!match) return { value: 0, unit: '' };
  return { value: parseFloat(match[1]), unit: match[2] };
}

// Named colors to hex mapping
const namedColors: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#00ff00', 
  blue: '#0000ff', yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff',
  orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', gray: '#808080',
  grey: '#808080', brown: '#a52a2a', navy: '#000080', teal: '#008080',
  lime: '#00ff00', aqua: '#00ffff', maroon: '#800000', olive: '#808000',
  silver: '#c0c0c0', fuchsia: '#ff00ff', transparent: 'rgba(0,0,0,0)',
};

// Parse color to RGB values
export function parseColor(color: string | number | null | undefined): { r: number; g: number; b: number; a: number } | null {
  if (color == null) return null;
  
  const colorStr = String(color).toLowerCase().trim();
  
  // Handle named colors
  if (namedColors[colorStr]) {
    return parseColor(namedColors[colorStr]);
  }
  
  // Handle hex colors
  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }
  
  // Handle rgb/rgba
  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }
  
  return null;
}

// Interpolate between two colors
export function interpolateColor(from: string | number | null | undefined, to: string | number | null | undefined, progress: number): string {
  const fromColor = parseColor(from);
  const toColor = parseColor(to);
  
  if (!fromColor || !toColor) {
    // Can't interpolate, snap at 50%
    return progress < 0.5 ? String(from || '') : String(to || '');
  }
  
  const r = Math.round(interpolate(fromColor.r, toColor.r, progress));
  const g = Math.round(interpolate(fromColor.g, toColor.g, progress));
  const b = Math.round(interpolate(fromColor.b, toColor.b, progress));
  const a = interpolate(fromColor.a, toColor.a, progress);
  
  if (a === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

// Check if a value looks like a color
function isColorProperty(prop: string): boolean {
  const colorProps = ['color', 'backgroundColor', 'background', 'borderColor', 'fill', 'stroke', 'outlineColor', 'textDecorationColor'];
  return colorProps.some(cp => prop.toLowerCase().includes(cp.toLowerCase()));
}

function isColorValue(value: string | number | null | undefined): boolean {
  if (value == null) return false;
  const str = String(value).toLowerCase().trim();
  return str.startsWith('#') || str.startsWith('rgb') || str.startsWith('hsl') || namedColors[str] !== undefined;
}

// Interpolate CSS transform
export function interpolateTransform(from: string, to: string, progress: number): string {
  // Parse transform functions
  const parseTransform = (str: string) => {
    const result: Record<string, { value: number; unit: string }[]> = {};
    const regex = /(\w+)\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
      const fn = match[1];
      const args = match[2].split(',').map((s) => parseCSSValue(s.trim()));
      result[fn] = args;
    }
    return result;
  };

  const fromTransforms = parseTransform(from);
  const toTransforms = parseTransform(to);
  const allFunctions = new Set([...Object.keys(fromTransforms), ...Object.keys(toTransforms)]);

  const parts: string[] = [];
  allFunctions.forEach((fn) => {
    const fromArgs = fromTransforms[fn] || getDefaultTransform(fn);
    const toArgs = toTransforms[fn] || getDefaultTransform(fn);

    const interpolatedArgs = fromArgs.map((fromArg, i) => {
      const toArg = toArgs[i] || fromArg;
      const value = interpolate(fromArg.value, toArg.value, progress);
      return `${value}${fromArg.unit || toArg.unit}`;
    });

    parts.push(`${fn}(${interpolatedArgs.join(', ')})`);
  });

  return parts.join(' ');
}

// Get default transform values
function getDefaultTransform(fn: string): { value: number; unit: string }[] {
  switch (fn) {
    case 'translateX':
    case 'translateY':
    case 'translateZ':
      return [{ value: 0, unit: 'px' }];
    case 'scale':
    case 'scaleX':
    case 'scaleY':
      return [{ value: 1, unit: '' }];
    case 'rotate':
    case 'rotateX':
    case 'rotateY':
    case 'rotateZ':
      return [{ value: 0, unit: 'deg' }];
    case 'skewX':
    case 'skewY':
      return [{ value: 0, unit: 'deg' }];
    default:
      return [{ value: 0, unit: '' }];
  }
}

// Map internal property names to CSS property names
const propertyToCSSMap: Record<string, string> = {
  fill: 'backgroundColor',
  stroke: 'borderColor',
};

// Properties that are element-level (not CSS styles)
const elementProperties = new Set([
  'position_x', 'position_y', 'rotation', 'scale_x', 'scale_y',
  'width', 'height', 'opacity', 'anchor_x', 'anchor_y',
  // Screen mask properties
  'screenMask_x', 'screenMask_y', 'screenMask_width', 'screenMask_height',
  'screenMask_feather_top', 'screenMask_feather_right', 'screenMask_feather_bottom', 'screenMask_feather_left',
  // Character animation progress
  'charAnimation_progress'
]);

// Calculate animated properties for an element at a given time
export function getAnimatedProperties(
  element: Element,
  animations: Animation[],
  keyframes: Keyframe[],
  time: number,
  phase: 'in' | 'loop' | 'out',
  debug: boolean = false,
  phaseDuration?: number  // Optional phase duration - if provided, use it instead of animation duration
): Record<string, string | number> {
  // Only enable debug when explicitly requested (too noisy otherwise)
  const shouldDebug = debug;

  const phaseAnimations = animations.filter((a) => a.element_id === element.id && a.phase === phase);

  if (phaseAnimations.length === 0) {
    if (shouldDebug) console.log('[Animation] No animations for element', element.id, 'in phase', phase);
    return {};
  }

  const result: Record<string, string | number> = {};

  phaseAnimations.forEach((anim) => {
    const animKeyframes = keyframes
      .filter((k) => k.animation_id === anim.id)
      .sort((a, b) => a.position - b.position);

    // If no keyframes, nothing to animate
    if (animKeyframes.length === 0) return;

    // If only 1 keyframe, just apply its values
    if (animKeyframes.length === 1) {
      const props = animKeyframes[0].properties;
      Object.keys(props).forEach((prop) => {
        const cssProperty = propertyToCSSMap[prop] || prop;
        result[cssProperty] = props[prop] as string | number;
      });
      if (shouldDebug) console.log('[Animation] Only 1 keyframe, applying:', result);
      return;
    }

    // Use phaseDuration for loop handling
    const effectiveDuration = phaseDuration || anim.duration;

    // Calculate time within this animation (accounting for delay)
    let localTime = time - anim.delay;
    if (localTime < 0) {
      // Before animation starts - use first keyframe values
      const firstKf = animKeyframes[0];
      Object.keys(firstKf.properties).forEach((prop) => {
        const cssProperty = propertyToCSSMap[prop] || prop;
        result[cssProperty] = firstKf.properties[prop] as string | number;
      });
      return;
    }

    // Handle loop - localTime can exceed effectiveDuration, so wrap it
    if (phase === 'loop' && localTime > effectiveDuration) {
      localTime = localTime % effectiveDuration;
    } else {
      localTime = Math.min(localTime, effectiveDuration);
    }

    // Find the two keyframes we're between
    // Keyframe positions are now stored as absolute milliseconds
    // IMPORTANT: Use raw time (not eased) to find keyframe positions
    // Easing should only affect interpolation BETWEEN keyframes, not when we reach them
    const keyframeTime = localTime; // Time in ms
    const firstKf = animKeyframes[0];
    const lastKf = animKeyframes[animKeyframes.length - 1];

    // BEFORE first keyframe - use first keyframe values (no animation yet)
    if (keyframeTime < firstKf.position) {
      Object.keys(firstKf.properties).forEach((prop) => {
        const cssProperty = propertyToCSSMap[prop] || prop;
        result[cssProperty] = firstKf.properties[prop] as string | number;
      });
      return; // Exit forEach for this animation
    }

    // AFTER last keyframe - use last keyframe values (animation complete)
    if (keyframeTime >= lastKf.position) {
      Object.keys(lastKf.properties).forEach((prop) => {
        const cssProperty = propertyToCSSMap[prop] || prop;
        result[cssProperty] = lastKf.properties[prop] as string | number;
      });
      return; // Exit forEach for this animation
    }

    // BETWEEN keyframes - find which two we're between and interpolate
    let fromKf = firstKf;
    let toKf = lastKf;

    for (let i = 0; i < animKeyframes.length - 1; i++) {
      if (keyframeTime >= animKeyframes[i].position && keyframeTime < animKeyframes[i + 1].position) {
        fromKf = animKeyframes[i];
        toKf = animKeyframes[i + 1];
        break;
      }
    }

    // Interpolate between keyframes
    // Position is in milliseconds, so kfRange is in ms and kfProgress is 0-1
    const kfRange = toKf.position - fromKf.position;
    let kfProgress = kfRange > 0 ? (keyframeTime - fromKf.position) / kfRange : 0;
    // Clamp kfProgress to 0-1 to prevent extrapolation beyond keyframes
    kfProgress = Math.max(0, Math.min(1, kfProgress));
    // Apply easing to the interpolation between keyframes
    const easedKfProgress = applyEasing(kfProgress, anim.easing);

    // Get all unique property names from both keyframes
    const allProps = new Set([...Object.keys(fromKf.properties), ...Object.keys(toKf.properties)]);

    allProps.forEach((prop) => {
      const fromValue = fromKf.properties[prop];
      const toValue = toKf.properties[prop];
      const cssProperty = propertyToCSSMap[prop] || prop;

      // If property only exists in one keyframe, use that value
      if (fromValue === undefined && toValue !== undefined) {
        result[cssProperty] = toValue as string | number;
        return;
      }
      if (toValue === undefined && fromValue !== undefined) {
        result[cssProperty] = fromValue as string | number;
        return;
      }
      if (fromValue === undefined && toValue === undefined) {
        return;
      }

      // Both values exist - interpolate using eased progress
      if (typeof fromValue === 'number' && typeof toValue === 'number') {
        result[cssProperty] = interpolate(fromValue, toValue, easedKfProgress);
      } else if (prop === 'transform') {
        result[cssProperty] = interpolateTransform(String(fromValue || ''), String(toValue || ''), easedKfProgress);
      } else if (isColorProperty(prop) || (isColorValue(fromValue) && isColorValue(toValue))) {
        // Interpolate colors
        result[cssProperty] = interpolateColor(fromValue, toValue, easedKfProgress);
      } else {
        // For non-interpolatable values, snap at 50%
        result[cssProperty] = easedKfProgress < 0.5 ? (fromValue as string | number) : (toValue as string | number);
      }
    });

    if (debug) {
      console.log('[Animation] Result at time', time, '- kfProgress:', kfProgress.toFixed(3), 'easedKfProgress:', easedKfProgress.toFixed(3), 'result:', result);
    }
  });

  // Debug: log charAnimation_progress specifically if it exists
  if (result.charAnimation_progress !== undefined) {
    console.log('[Animation] charAnimation_progress interpolated:', result.charAnimation_progress, 'at time:', time, 'for element:', element.id, 'phase:', phase);
  }

  return result;
}

// Animation type definitions
export type InOutAnimationType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'scale' | 'custom';
export type LoopAnimationType = 'pulse' | 'side-to-side' | 'up-and-down' | 'gentle-twist' | 'custom';
export type AnimationType = InOutAnimationType | LoopAnimationType;

// Create default animation for an element
export function createDefaultAnimation(
  elementId: string,
  templateId: string,
  phase: 'in' | 'loop' | 'out',
  animationType: AnimationType = 'fade'
): { animation: Omit<Animation, 'id'>; keyframes: Omit<Keyframe, 'id' | 'animation_id'>[] } {
  const baseAnimation = {
    template_id: templateId,
    element_id: elementId,
    phase,
    delay: 0,
    duration: phase === 'in' ? 500 : phase === 'out' ? 300 : 1500,
    easing: phase === 'loop' ? 'ease-in-out' : 'ease-out',
    library: null,
    library_config: null,
  };

  let keyframes: Omit<Keyframe, 'id' | 'animation_id'>[];

  switch (animationType) {
    // IN/OUT animations
    case 'fade':
      keyframes = phase === 'out'
        ? [
            { position: 0, properties: { opacity: 1 } },
            { position: 100, properties: { opacity: 0 } },
          ]
        : [
            { position: 0, properties: { opacity: 0 } },
            { position: 100, properties: { opacity: 1 } },
          ];
      break;

    case 'slide-left':
      keyframes = phase === 'out'
        ? [
            { position: 0, properties: { opacity: 1, transform: 'translateX(0)' } },
            { position: 100, properties: { opacity: 0, transform: 'translateX(-100px)' } },
          ]
        : [
            { position: 0, properties: { opacity: 0, transform: 'translateX(-100px)' } },
            { position: 100, properties: { opacity: 1, transform: 'translateX(0)' } },
          ];
      break;

    case 'slide-right':
      keyframes = phase === 'out'
        ? [
            { position: 0, properties: { opacity: 1, transform: 'translateX(0)' } },
            { position: 100, properties: { opacity: 0, transform: 'translateX(100px)' } },
          ]
        : [
            { position: 0, properties: { opacity: 0, transform: 'translateX(100px)' } },
            { position: 100, properties: { opacity: 1, transform: 'translateX(0)' } },
          ];
      break;

    case 'slide-up':
      keyframes = phase === 'out'
        ? [
            { position: 0, properties: { opacity: 1, transform: 'translateY(0)' } },
            { position: 100, properties: { opacity: 0, transform: 'translateY(-50px)' } },
          ]
        : [
            { position: 0, properties: { opacity: 0, transform: 'translateY(50px)' } },
            { position: 100, properties: { opacity: 1, transform: 'translateY(0)' } },
          ];
      break;

    case 'slide-down':
      keyframes = phase === 'out'
        ? [
            { position: 0, properties: { opacity: 1, transform: 'translateY(0)' } },
            { position: 100, properties: { opacity: 0, transform: 'translateY(50px)' } },
          ]
        : [
            { position: 0, properties: { opacity: 0, transform: 'translateY(-50px)' } },
            { position: 100, properties: { opacity: 1, transform: 'translateY(0)' } },
          ];
      break;

    case 'scale':
      keyframes = phase === 'out'
        ? [
            { position: 0, properties: { opacity: 1, transform: 'scale(1)' } },
            { position: 100, properties: { opacity: 0, transform: 'scale(0.8)' } },
          ]
        : [
            { position: 0, properties: { opacity: 0, transform: 'scale(0.8)' } },
            { position: 100, properties: { opacity: 1, transform: 'scale(1)' } },
          ];
      break;

    // LOOP animations - all designed to be perfect loops (start and end at same state)
    case 'pulse':
      // Gentle scale pulse - grows slightly then returns to original size
      keyframes = [
        { position: 0, properties: { transform: 'scale(1)' } },
        { position: 50, properties: { transform: 'scale(1.05)' } },
        { position: 100, properties: { transform: 'scale(1)' } },
      ];
      break;

    case 'side-to-side':
      // Horizontal oscillation - moves left, right, then back to center
      keyframes = [
        { position: 0, properties: { transform: 'translateX(0)' } },
        { position: 25, properties: { transform: 'translateX(-10px)' } },
        { position: 75, properties: { transform: 'translateX(10px)' } },
        { position: 100, properties: { transform: 'translateX(0)' } },
      ];
      break;

    case 'up-and-down':
      // Vertical oscillation - moves up, down, then back to center
      keyframes = [
        { position: 0, properties: { transform: 'translateY(0)' } },
        { position: 25, properties: { transform: 'translateY(-8px)' } },
        { position: 75, properties: { transform: 'translateY(8px)' } },
        { position: 100, properties: { transform: 'translateY(0)' } },
      ];
      break;

    case 'gentle-twist':
      // Subtle rotation - rotates slightly clockwise then counter-clockwise
      keyframes = [
        { position: 0, properties: { transform: 'rotate(0deg)' } },
        { position: 25, properties: { transform: 'rotate(-2deg)' } },
        { position: 75, properties: { transform: 'rotate(2deg)' } },
        { position: 100, properties: { transform: 'rotate(0deg)' } },
      ];
      break;

    default:
      keyframes = [
        { position: 0, properties: { opacity: 1 } },
        { position: 100, properties: { opacity: 1 } },
      ];
  }

  return { animation: baseAnimation, keyframes };
}

// Create chart-specific animation presets
export function createChartAnimation(
  elementId: string,
  templateId: string,
  phase: 'in' | 'loop' | 'out',
  animationType: 'grow' | 'count-up' | 'stagger' | 'pulse' | 'reveal' = 'grow',
  chartData?: { datasets: { data: number[] }[] }
): { animation: Omit<Animation, 'id'>; keyframes: Omit<Keyframe, 'id' | 'animation_id'>[] } {
  const baseAnimation = {
    template_id: templateId,
    element_id: elementId,
    phase,
    delay: 0,
    duration: phase === 'in' ? 1000 : phase === 'out' ? 500 : 2000,
    easing: 'ease-out',
    library: null,
    library_config: null,
  };

  let keyframes: Omit<Keyframe, 'id' | 'animation_id'>[];

  switch (animationType) {
    case 'grow':
      // Bars/data grow from 0 to full value
      keyframes = phase === 'out'
        ? [
            { position: 0, properties: { chartProgress: 1, opacity: 1 } },
            { position: 100, properties: { chartProgress: 0, opacity: 0 } },
          ]
        : [
            { position: 0, properties: { chartProgress: 0, opacity: 0 } },
            { position: 20, properties: { chartProgress: 0, opacity: 1 } },
            { position: 100, properties: { chartProgress: 1, opacity: 1 } },
          ];
      break;

    case 'count-up':
      // Similar to grow but with bounce easing for a "counting" effect
      baseAnimation.easing = 'elastic-out';
      keyframes = phase === 'out'
        ? [
            { position: 0, properties: { chartProgress: 1, opacity: 1 } },
            { position: 100, properties: { chartProgress: 0, opacity: 0 } },
          ]
        : [
            { position: 0, properties: { chartProgress: 0 } },
            { position: 100, properties: { chartProgress: 1 } },
          ];
      break;

    case 'stagger':
      // Staggered reveal - each bar appears one after another
      // This creates intermediate keyframes for each data point
      if (chartData && chartData.datasets[0]?.data) {
        const dataCount = chartData.datasets[0].data.length;
        keyframes = [];

        if (phase === 'out') {
          // Reverse stagger for out animation
          for (let i = 0; i <= dataCount; i++) {
            const position = (i / dataCount) * 100;
            const props: Record<string, number> = {};

            // Set each data point to 0 progressively
            for (let j = 0; j < dataCount; j++) {
              const targetValue = chartData.datasets[0].data[j];
              props[`chartData_${j}`] = j <= i ? 0 : targetValue;
            }

            keyframes.push({ position, properties: props });
          }
        } else {
          // Forward stagger for in animation
          for (let i = 0; i <= dataCount; i++) {
            const position = (i / dataCount) * 100;
            const props: Record<string, number> = {};

            // Each keyframe reveals one more data point
            for (let j = 0; j < dataCount; j++) {
              const targetValue = chartData.datasets[0].data[j];
              props[`chartData_${j}`] = j < i ? targetValue : 0;
            }

            if (i === 0) props['opacity'] = 0;
            else if (i === 1) props['opacity'] = 1;

            keyframes.push({ position, properties: props });
          }
        }
      } else {
        // Fallback if no data provided
        keyframes = [
          { position: 0, properties: { chartProgress: 0, opacity: 0 } },
          { position: 100, properties: { chartProgress: 1, opacity: 1 } },
        ];
      }
      break;

    case 'pulse':
      // For loop phase - creates a pulsing scale effect
      baseAnimation.duration = 1500;
      keyframes = [
        { position: 0, properties: { scale_x: 1, scale_y: 1 } },
        { position: 50, properties: { scale_x: 1.05, scale_y: 1.05 } },
        { position: 100, properties: { scale_x: 1, scale_y: 1 } },
      ];
      break;

    case 'reveal':
      // Clip-based reveal from left to right (using scale as fallback)
      keyframes = phase === 'out'
        ? [
            { position: 0, properties: { opacity: 1, scale_x: 1 } },
            { position: 100, properties: { opacity: 0, scale_x: 0 } },
          ]
        : [
            { position: 0, properties: { opacity: 0, scale_x: 0 } },
            { position: 100, properties: { opacity: 1, scale_x: 1 } },
          ];
      break;

    default:
      keyframes = [
        { position: 0, properties: { chartProgress: 0 } },
        { position: 100, properties: { chartProgress: 1 } },
      ];
  }

  return { animation: baseAnimation, keyframes };
}

// List of available chart animation types
export const CHART_ANIMATION_TYPES = [
  { value: 'grow', label: 'Grow', description: 'Bars grow from zero to their values' },
  { value: 'count-up', label: 'Count Up', description: 'Values count up with bounce effect' },
  { value: 'stagger', label: 'Stagger', description: 'Bars appear one after another' },
  { value: 'pulse', label: 'Pulse', description: 'Gentle pulsing scale animation (for loop)' },
  { value: 'reveal', label: 'Reveal', description: 'Chart reveals with scale effect' },
] as const;

export type ChartAnimationType = typeof CHART_ANIMATION_TYPES[number]['value'];

