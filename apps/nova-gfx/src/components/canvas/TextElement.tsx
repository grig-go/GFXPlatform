import { useEffect, useRef, useMemo } from 'react';
import { animate } from 'motion';

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
  style?: React.CSSProperties;
  isPlaying?: boolean;
  playheadPosition?: number; // in milliseconds
  animationDuration?: number; // total animation duration in milliseconds
  animatedProps?: Record<string, any>; // Properties from timeline keyframes
}

export function TextElement({
  text,
  animation,
  style,
  isPlaying = false,
  playheadPosition = 0,
  animationDuration = 1000,
  animatedProps,
}: TextElementProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (!animation?.enabled || !textRef.current) return;

    const element = textRef.current;

    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // If playing and we have keyframes, use keyframe-based animation
    if (isPlaying && animation.keyframes && animation.keyframes.length > 0) {
      // Calculate current keyframe based on playhead position
      const progress = Math.min(playheadPosition / animationDuration, 1);
      
      // Find the current keyframe segment
      let currentKeyframe = animation.keyframes[0];
      let nextKeyframe = animation.keyframes[animation.keyframes.length - 1];
      
      for (let i = 0; i < animation.keyframes.length - 1; i++) {
        if (progress >= animation.keyframes[i].offset && progress <= animation.keyframes[i + 1].offset) {
          currentKeyframe = animation.keyframes[i];
          nextKeyframe = animation.keyframes[i + 1];
          break;
        }
      }

      // Interpolate between keyframes
      const segmentProgress = currentKeyframe.offset === nextKeyframe.offset
        ? 0
        : (progress - currentKeyframe.offset) / (nextKeyframe.offset - currentKeyframe.offset);
      
      // Apply interpolated properties
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

      // Apply properties directly
      Object.entries(props).forEach(([key, value]) => {
        (element.style as any)[key] = typeof value === 'number' 
          ? (key.includes('opacity') || key.includes('scale') || key.includes('rotate') || key.includes('blur')
              ? value
              : `${value}px`)
          : value;
      });

      return;
    }

    // Otherwise, use preset animations
    if (!isPlaying) return;

    const duration = (animation.duration || 1) * 1000; // Convert to milliseconds
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
          // Typewriter effect - animate text character by character
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

    // Motion library API: animate(element, properties, options)
    try {
      animationRef.current = animate(
        element,
        motionProps,
        options
      );
    } catch (error) {
      console.error('Motion animation error:', error);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [animation, isPlaying, playheadPosition, animationDuration]);

  // Apply animated properties from timeline keyframes
  const finalStyle = useMemo(() => {
    if (!animatedProps || !isPlaying) return style;
    
    const mergedStyle: React.CSSProperties = { ...style };
    
    // Apply animated properties that are relevant to text
    Object.entries(animatedProps).forEach(([key, value]) => {
      if (key === 'opacity' || key === 'color' || key === 'textShadow' || key === 'filter' || key === 'blur') {
        (mergedStyle as any)[key] = value;
      } else if (key === 'transform') {
        mergedStyle.transform = value as string;
      }
    });
    
    return mergedStyle;
  }, [style, animatedProps, isPlaying]);

  // Ensure text element respects text-align for justify
  const textAlignStyle = useMemo(() => {
    if (finalStyle?.textAlign === 'justify') {
      return {
        ...finalStyle,
        textAlign: 'justify',
        width: '100%',
      };
    }
    return finalStyle;
  }, [finalStyle]);

  return (
    <span ref={textRef} style={textAlignStyle}>
      {text}
    </span>
  );
}

