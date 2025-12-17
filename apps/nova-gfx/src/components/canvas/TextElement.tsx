import { useEffect, useRef, useMemo, useLayoutEffect, useState } from 'react';
import { animate } from 'motion';
import Splitting from 'splitting';
import 'splitting/dist/splitting.css';
import 'splitting/dist/splitting-cells.css';

interface CharAnimationSettings {
  enabled: boolean;
  type: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale' | 'blur' | 'wave' | 'bounce';
  easing: string; // CSS easing function
  direction: 'forward' | 'backward' | 'center' | 'edges'; // Order of character animation
  spread: number; // How many characters animate at once (1 = one at a time)
  progress: number; // Animation progress 0-100
}

interface TextElementProps {
  text: string;
  animation?: {
    enabled: boolean;
    type?: 'fade' | 'slide' | 'scale' | 'blur' | 'glow' | 'typewriter' | 'wave' | 'bounce' | 'custom';
    duration?: number;
    delay?: number;
    easing?: string;
    direction?: 'in' | 'out' | 'in-out';
    keyframes?: Array<{
      offset: number;
      properties: Record<string, string | number>;
    }>;
    customProperties?: Record<string, string | number>;
  };
  charAnimation?: CharAnimationSettings;
  style?: React.CSSProperties;
  isPlaying?: boolean;
  playheadPosition?: number; // in milliseconds
  animationDuration?: number; // total animation duration in milliseconds
  animatedProps?: Record<string, any>; // Properties from timeline keyframes
  maxSize?: boolean; // When true, text scales to fit container instead of wrapping
  containerWidth?: number; // Width of the container for maxSize calculation
  containerHeight?: number; // Height of the container for maxSize calculation
}

// Get initial CSS properties for character animation
function getCharAnimationInitialStyles(type: CharAnimationSettings['type']): Record<string, number | string> {
  switch (type) {
    case 'fade':
      return { opacity: 0 };
    case 'slide-up':
      return { opacity: 0, translateY: 20 };
    case 'slide-down':
      return { opacity: 0, translateY: -20 };
    case 'slide-left':
      return { opacity: 0, translateX: 20 };
    case 'slide-right':
      return { opacity: 0, translateX: -20 };
    case 'scale':
      return { opacity: 0, scale: 0 };
    case 'blur':
      return { opacity: 0, blur: 10 };
    case 'wave':
      return { opacity: 0, translateY: 15, rotate: -5 };
    case 'bounce':
      return { opacity: 0, translateY: -30, scale: 0.5 };
    default:
      return { opacity: 0 };
  }
}

// Get final CSS properties for character animation
function getCharAnimationFinalStyles(type: CharAnimationSettings['type']): Record<string, number | string> {
  switch (type) {
    case 'fade':
      return { opacity: 1 };
    case 'slide-up':
    case 'slide-down':
      return { opacity: 1, translateY: 0 };
    case 'slide-left':
    case 'slide-right':
      return { opacity: 1, translateX: 0 };
    case 'scale':
      return { opacity: 1, scale: 1 };
    case 'blur':
      return { opacity: 1, blur: 0 };
    case 'wave':
      return { opacity: 1, translateY: 0, rotate: 0 };
    case 'bounce':
      return { opacity: 1, translateY: 0, scale: 1 };
    default:
      return { opacity: 1 };
  }
}

// Get character order based on direction
function getCharacterOrder(
  index: number,
  total: number,
  direction: CharAnimationSettings['direction']
): number {
  switch (direction) {
    case 'forward':
      return index;
    case 'backward':
      return total - 1 - index;
    case 'center': {
      const center = (total - 1) / 2;
      return Math.abs(index - center);
    }
    case 'edges': {
      const center = (total - 1) / 2;
      const distanceFromCenter = Math.abs(index - center);
      const maxDistance = Math.ceil(center);
      return maxDistance - distanceFromCenter;
    }
    default:
      return index;
  }
}

// Interpolate between two values
function interpolate(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

// Apply easing function
function applyEasing(t: number, easing: string): number {
  t = Math.max(0, Math.min(1, t));

  switch (easing) {
    case 'linear':
      return t;
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
    case 'ease':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      if (easing.includes('cubic-bezier')) {
        if (t < 0.5) {
          return 2 * t * t;
        } else {
          const t2 = t - 0.5;
          return 0.5 + 2 * t2 * (1 - t2) + 0.5 * t2;
        }
      }
      return t;
  }
}

export function TextElement({
  text,
  animation,
  charAnimation,
  style,
  isPlaying = false,
  playheadPosition = 0,
  animationDuration = 1000,
  animatedProps,
  maxSize = false,
  containerWidth,
  containerHeight,
}: TextElementProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null); // Hidden span for measuring natural text size
  const animationRef = useRef<any>(null);
  // Store splitting result persistently
  const splitCharsRef = useRef<HTMLElement[] | null>(null);
  // Track last split text to know when to re-split
  const lastSplitTextRef = useRef<string>('');
  // Counter to force re-split
  const [splitVersion, setSplitVersion] = useState(0);
  // Timer ref for debounce
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Scale factors for maxSize mode
  const [maxSizeScale, setMaxSizeScale] = useState({ scaleX: 1, scaleY: 1 });

  // Get the current progress value
  // Priority: animatedProps (from keyframes) > charAnimation.progress (from slider)
  const currentProgress = useMemo(() => {
    // Priority 1: If we have an animated value from keyframes, use it
    if (animatedProps?.charAnimation_progress !== undefined) {
      return Number(animatedProps.charAnimation_progress);
    }

    // Priority 2: When playing (in Preview/Player), if no keyframe value exists for
    // charAnimation_progress in the current phase, default to 100 (fully visible).
    // This handles phase transitions (e.g., IN -> LOOP) where LOOP may not have keyframes.
    if (isPlaying) {
      return 100;
    }

    // Priority 3: When NOT playing but playhead is at a non-zero position,
    // we're likely at the end of an animation that played, so hold at 100.
    // This ensures text stays visible after LOOP phase ends.
    if (playheadPosition && playheadPosition > 0) {
      return 100;
    }

    // Priority 4: In designer mode with playhead at 0, use the slider value for preview
    return charAnimation?.progress ?? 100;
  }, [animatedProps?.charAnimation_progress, charAnimation?.progress, isPlaying, playheadPosition]);

  // Calculate maxSize scale factors when enabled
  useLayoutEffect(() => {
    if (!maxSize || !measureRef.current || !containerWidth || !containerHeight) {
      if (!maxSize) {
        setMaxSizeScale({ scaleX: 1, scaleY: 1 });
      }
      return;
    }

    // Measure the natural text size
    const measureEl = measureRef.current;
    const naturalWidth = measureEl.scrollWidth;
    const naturalHeight = measureEl.scrollHeight;

    if (naturalWidth === 0 || naturalHeight === 0) {
      return;
    }

    // Calculate scale factors to fit within container
    const scaleX = Math.min(1, containerWidth / naturalWidth);
    const scaleY = Math.min(1, containerHeight / naturalHeight);

    setMaxSizeScale({ scaleX, scaleY });
  }, [maxSize, text, containerWidth, containerHeight, style?.fontSize, style?.fontFamily, style?.fontWeight, splitVersion]);

  // Debounce text changes - trigger re-split after 500ms of no changes
  useEffect(() => {
    // Clear any pending timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // If text hasn't changed from last split, nothing to do
    if (text === lastSplitTextRef.current) {
      return;
    }

    // Set debounce timer - increment version to trigger re-split
    debounceTimerRef.current = setTimeout(() => {
      setSplitVersion(v => v + 1);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [text]);

  // Split text whenever splitVersion changes or char animation is enabled/disabled
  useLayoutEffect(() => {
    if (!textRef.current) return;

    if (!charAnimation?.enabled) {
      // Disabled - reset if we have chars
      if (splitCharsRef.current) {
        textRef.current.innerHTML = text;
        splitCharsRef.current = null;
        lastSplitTextRef.current = '';
      }
      return;
    }

    // Check if we need to split (either text changed or no chars yet)
    const needsSplit = lastSplitTextRef.current !== text || !splitCharsRef.current;

    if (needsSplit) {

      // Clear existing split state
      splitCharsRef.current = null;
      lastSplitTextRef.current = text;

      // Instead of trying to clear Splitting.js cache, manually create the char spans
      // This is more reliable than fighting with Splitting.js's internal state
      const chars: HTMLElement[] = [];

      // Create character spans directly - wrapping happens naturally between inline-block elements
      // We don't need word wrappers - the browser will wrap at spaces naturally
      let html = '';

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === ' ') {
          // Space character - use inline (not inline-block) to allow natural line breaking after it
          // Using &nbsp; would prevent wrapping, so we use a regular space in an inline span
          html += `<span class="char whitespace" style="display:inline; white-space:pre;"> </span>`;
        } else {
          // Regular character - inline-block for animation transforms
          const escaped = char.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          html += `<span class="char" data-char="${escaped}" style="display:inline-block;">${escaped}</span>`;
        }
      }

      textRef.current.innerHTML = html;
      // Set container styles - block-level for layout
      textRef.current.style.display = 'block';
      textRef.current.style.width = '100%';
      // Only allow wrapping if maxSize is NOT enabled
      if (!maxSize) {
        textRef.current.style.whiteSpace = 'normal';
        textRef.current.style.wordWrap = 'break-word';
        textRef.current.style.overflowWrap = 'break-word';
      } else {
        // maxSize mode - no wrapping, text will be scaled to fit
        textRef.current.style.whiteSpace = 'nowrap';
      }

      // Collect only the .char spans (not the .word wrapper spans)
      const charElements = textRef.current.querySelectorAll('span.char');
      charElements.forEach((el) => {
        chars.push(el as HTMLElement);
      });

      splitCharsRef.current = chars;
    }
  }, [charAnimation?.enabled, text, splitVersion, maxSize]);

  // Apply animation styles to the chars (runs on every progress change)
  useLayoutEffect(() => {
    if (!charAnimation?.enabled || !splitCharsRef.current) {
      return;
    }

    const chars = splitCharsRef.current;
    if (!chars || chars.length === 0) return;

    const totalChars = chars.length;
    const type = charAnimation.type || 'fade';
    const direction = charAnimation.direction || 'forward';
    const spread = charAnimation.spread || 3;
    const easing = charAnimation.easing || 'ease-out';

    const initialStyles = getCharAnimationInitialStyles(type);
    const finalStyles = getCharAnimationFinalStyles(type);

    // Apply styles to each character
    chars.forEach((char, index) => {
      const order = getCharacterOrder(index, totalChars, direction);

      // Calculate character's animation progress
      const effectiveSpread = Math.min(spread, totalChars);
      const overlapFactor = (effectiveSpread - 1) / Math.max(totalChars - 1, 1);
      const charDuration = 100 * (overlapFactor + (1 - overlapFactor) / totalChars);
      const charStart = order * (100 - charDuration) / Math.max(totalChars - 1, 1);

      let charProgress: number;
      if (totalChars === 1) {
        charProgress = currentProgress / 100;
      } else if (currentProgress <= charStart) {
        charProgress = 0;
      } else if (currentProgress >= charStart + charDuration) {
        charProgress = 1;
      } else {
        charProgress = (currentProgress - charStart) / charDuration;
      }

      const easedProgress = applyEasing(charProgress, easing);

      // Apply styles directly
      let transform = '';

      if ('opacity' in initialStyles && 'opacity' in finalStyles) {
        const opacity = interpolate(initialStyles.opacity as number, finalStyles.opacity as number, easedProgress);
        char.style.opacity = String(opacity);
      }

      if ('translateX' in initialStyles && 'translateX' in finalStyles) {
        const translateX = interpolate(initialStyles.translateX as number, finalStyles.translateX as number, easedProgress);
        transform += `translateX(${translateX}px) `;
      }

      if ('translateY' in initialStyles && 'translateY' in finalStyles) {
        const translateY = interpolate(initialStyles.translateY as number, finalStyles.translateY as number, easedProgress);
        transform += `translateY(${translateY}px) `;
      }

      if ('scale' in initialStyles && 'scale' in finalStyles) {
        const scale = interpolate(initialStyles.scale as number, finalStyles.scale as number, easedProgress);
        transform += `scale(${scale}) `;
      }

      if ('rotate' in initialStyles && 'rotate' in finalStyles) {
        const rotate = interpolate(initialStyles.rotate as number, finalStyles.rotate as number, easedProgress);
        transform += `rotate(${rotate}deg) `;
      }

      if ('blur' in initialStyles && 'blur' in finalStyles) {
        const blur = interpolate(initialStyles.blur as number, finalStyles.blur as number, easedProgress);
        char.style.filter = blur > 0 ? `blur(${blur}px)` : '';
      } else {
        char.style.filter = '';
      }

      char.style.transform = transform.trim() || '';
    });
  }, [charAnimation?.enabled, charAnimation?.type, charAnimation?.direction, charAnimation?.spread, charAnimation?.easing, currentProgress, splitVersion, text]);

  // Standard element animation (non-character based)
  useEffect(() => {
    if (charAnimation?.enabled) return;
    if (!animation?.enabled || !textRef.current) return;

    const element = textRef.current;

    if (animationRef.current) {
      animationRef.current.stop();
    }

    if (isPlaying && animation.keyframes && animation.keyframes.length > 0) {
      const progress = Math.min(playheadPosition / animationDuration, 1);

      let currentKeyframe = animation.keyframes[0];
      let nextKeyframe = animation.keyframes[animation.keyframes.length - 1];

      for (let i = 0; i < animation.keyframes.length - 1; i++) {
        if (progress >= animation.keyframes[i].offset && progress <= animation.keyframes[i + 1].offset) {
          currentKeyframe = animation.keyframes[i];
          nextKeyframe = animation.keyframes[i + 1];
          break;
        }
      }

      const segmentProgress = currentKeyframe.offset === nextKeyframe.offset
        ? 0
        : (progress - currentKeyframe.offset) / (nextKeyframe.offset - currentKeyframe.offset);

      const props: Record<string, string | number> = {};
      const allProps = new Set([
        ...Object.keys(currentKeyframe.properties),
        ...Object.keys(nextKeyframe.properties),
      ]);

      allProps.forEach(prop => {
        const from = currentKeyframe.properties[prop] ?? 0;
        const to = nextKeyframe.properties[prop] ?? 0;

        if (typeof from === 'number' && typeof to === 'number') {
          props[prop] = from + (to - from) * segmentProgress;
        } else {
          props[prop] = segmentProgress < 0.5 ? from : to;
        }
      });

      Object.entries(props).forEach(([key, value]) => {
        (element.style as any)[key] = typeof value === 'number'
          ? (key.includes('opacity') || key.includes('scale') || key.includes('rotate') || key.includes('blur')
              ? value
              : `${value}px`)
          : value;
      });

      return;
    }

    if (!isPlaying) return;

    const duration = (animation.duration || 1) * 1000;
    const delay = (animation.delay || 0) * 1000;

    const getAnimationProps = (): { motionProps: Record<string, any>; options: Record<string, any> } => {
      const baseDuration = duration / 1000;
      const baseDelay = delay / 1000;
      const baseEasing = animation.easing || 'ease-out';

      const motionProps: Record<string, any> = {};
      const options: Record<string, any> = {
        duration: baseDuration,
        delay: baseDelay,
        easing: baseEasing,
      };

      switch (animation.type) {
        case 'fade':
          motionProps.opacity = animation.direction === 'out' ? [1, 0] : [0, 1];
          break;
        case 'slide':
          motionProps.x = animation.direction === 'out' ? [0, 100] : [-100, 0];
          motionProps.opacity = [0, 1];
          break;
        case 'scale':
          motionProps.scale = animation.direction === 'out' ? [1, 0] : [0, 1];
          motionProps.opacity = [0, 1];
          break;
        case 'blur':
          const blur = animation.direction === 'out' ? [0, 20] : [20, 0];
          motionProps.filter = `blur(${blur[0]}px)`;
          motionProps.opacity = [0, 1];
          break;
        case 'glow':
          motionProps.opacity = [0, 1];
          motionProps.textShadow = ['0 0 0px rgba(255,255,255,0)', '0 0 20px rgba(255,255,255,0.8)'];
          break;
        case 'typewriter':
          motionProps.opacity = [0, 1];
          break;
        case 'wave':
          motionProps.y = [0, -20, 0];
          motionProps.opacity = [0, 1];
          break;
        case 'bounce':
          motionProps.y = [0, -30, 0];
          motionProps.scale = [1, 1.1, 1];
          motionProps.opacity = [0, 1];
          break;
        case 'custom':
          Object.assign(motionProps, animation.customProperties || {});
          break;
        default:
          motionProps.opacity = [0, 1];
      }

      return { motionProps, options };
    };

    const { motionProps, options } = getAnimationProps();

    try {
      animationRef.current = animate(element, motionProps, options);
    } catch (error) {
      console.error('Motion animation error:', error);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [animation, charAnimation?.enabled, isPlaying, playheadPosition, animationDuration]);

  // Build final style - exclude opacity for char animation
  const finalStyle = useMemo(() => {
    const mergedStyle: React.CSSProperties = { ...style };

    // CRITICAL: When char animation is enabled, force opacity to 1 on container
    if (charAnimation?.enabled) {
      mergedStyle.opacity = 1;
    }

    if (!animatedProps || !isPlaying) return mergedStyle;

    Object.entries(animatedProps).forEach(([key, value]) => {
      // Skip opacity for character animation
      if (charAnimation?.enabled && (key === 'opacity' || key === 'filter' || key === 'blur')) {
        return;
      }
      if (key === 'opacity' || key === 'color' || key === 'textShadow' || key === 'filter' || key === 'blur') {
        (mergedStyle as any)[key] = value;
      } else if (key === 'transform') {
        mergedStyle.transform = value as string;
      }
    });

    return mergedStyle;
  }, [style, animatedProps, isPlaying, charAnimation?.enabled]);

  const textAlignStyle = useMemo(() => {
    const baseStyle = { ...finalStyle };

    if (baseStyle?.textAlign === 'justify') {
      baseStyle.textAlign = 'justify';
      baseStyle.width = '100%';
    }

    // When maxSize is enabled, prevent wrapping immediately (before scaling calculation)
    if (maxSize) {
      baseStyle.whiteSpace = 'nowrap';
      baseStyle.transformOrigin = 'top left';

      // Apply scaling if needed
      if (maxSizeScale.scaleX !== 1 || maxSizeScale.scaleY !== 1) {
        const existingTransform = baseStyle.transform || '';
        baseStyle.transform = `${existingTransform} scale(${maxSizeScale.scaleX}, ${maxSizeScale.scaleY})`.trim();
      }
    }

    return baseStyle;
  }, [finalStyle, maxSize, maxSizeScale]);

  // Styles for the hidden measurement span - same as text but invisible and no scaling
  const measureStyle = useMemo((): React.CSSProperties => {
    if (!maxSize) return { display: 'none' };

    return {
      ...finalStyle,
      position: 'absolute',
      visibility: 'hidden',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      // Reset any transforms that might affect measurement
      transform: 'none',
    };
  }, [finalStyle, maxSize]);

  // Set initial text via useLayoutEffect - don't use React children
  // This prevents React from fighting with Splitting.js over the DOM
  useLayoutEffect(() => {
    if (!textRef.current) return;
    // Only set text if charAnimation is disabled or not yet split
    if (!charAnimation?.enabled && textRef.current.innerHTML !== text) {
      textRef.current.innerHTML = text;
    }
  }, [text, charAnimation?.enabled]);

  // Update measure span with text for maxSize calculation
  useLayoutEffect(() => {
    if (!measureRef.current || !maxSize) return;
    measureRef.current.innerHTML = text;
  }, [text, maxSize]);

  // Render span with optional hidden measurement span for maxSize
  return (
    <>
      {maxSize && (
        <span ref={measureRef} style={measureStyle} aria-hidden="true" />
      )}
      <span ref={textRef} style={textAlignStyle} data-splitting="" />
    </>
  );
}
