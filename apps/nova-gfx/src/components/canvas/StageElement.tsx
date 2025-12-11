import { useCallback, useMemo, useState } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { useDrag } from '@/hooks/useDrag';
import { useResize, RESIZE_CURSORS, type ResizeHandle } from '@/hooks/useResize';
import { useRotate } from '@/hooks/useRotate';
import { getAnimatedProperties } from '@/lib/animation';
import { ChartElement } from './ChartElement';
import { MapElement } from './MapElement';
import { VideoElement } from './VideoElement';
import { SVGElement } from './SVGElement';
import { IconElement } from './IconElement';
import { TableElement } from './TableElement';
import { TickerElement } from './TickerElement';
import { TopicBadgeElement } from './TopicBadgeElement';
import { CountdownElement } from './CountdownElement';
import { TextElement } from './TextElement';
import { ImageElement } from './ImageElement';
import { LineElement } from './LineElement';
import type { Element } from '@emergent-platform/types';
import { cn } from '@emergent-platform/ui';

// Convert box-shadow to filter: drop-shadow() for icon shape matching
function convertBoxShadowToFilter(boxShadow: string): string {
  if (!boxShadow || boxShadow === 'none') return '';
  
  // Parse box-shadow: offsetX offsetY blur spread color
  // Example: "0 2px 8px 0 rgba(0,0,0,0.3)"
  const match = boxShadow.match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)?px?\s+(.+)/);
  if (match) {
    const [, offsetX, offsetY, blur, spread = '0', color] = match;
    // drop-shadow doesn't support spread, so we approximate
    return `drop-shadow(${offsetX}px ${offsetY}px ${blur}px ${color})`;
  }
  
  // Fallback: try to extract just color and blur
  const colorMatch = boxShadow.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
  const blurMatch = boxShadow.match(/(\d+)px/);
  if (colorMatch && blurMatch) {
    return `drop-shadow(0 0 ${blurMatch[1]}px ${colorMatch[0]})`;
  }
  
  return '';
}

interface StageElementProps {
  element: Element;
  allElements: Element[];
  layerZIndex?: number; // z_index from the layer
}

export function StageElement({ element, allElements, layerZIndex = 0 }: StageElementProps) {
  const {
    selectedElementIds,
    selectElements,
    tool,
    hoveredElementId,
    setHoveredElement,
    animations,
    keyframes,
    currentPhase,
    playheadPosition,
    isPlaying,
    selectedKeyframeIds,
    phaseDurations,
  } = useDesignerStore();

  const { isDragging, handleMouseDown: handleDragStart } = useDrag();
  const { isResizing, handleResizeStart } = useResize();
  const { isRotating, handleRotateStart } = useRotate();

  const isSelected = selectedElementIds.includes(element.id);
  const isHovered = hoveredElementId === element.id;

  // Check if this element's parent is selected (for proper drag behavior)
  const isParentSelected = element.parent_element_id
    ? selectedElementIds.includes(element.parent_element_id)
    : false;

  // Get the selected keyframe if it belongs to this element
  const selectedKeyframeForElement = useMemo(() => {
    if (selectedKeyframeIds.length === 0) return null;

    // Find animation for this element in current phase
    const elementAnim = animations.find(
      a => a.element_id === element.id && a.phase === currentPhase
    );
    if (!elementAnim) return null;

    // Check if selected keyframe belongs to this element's animation
    const selectedKf = keyframes.find(
      kf => selectedKeyframeIds.includes(kf.id) && kf.animation_id === elementAnim.id
    );
    return selectedKf || null;
  }, [selectedKeyframeIds, animations, keyframes, element.id, currentPhase]);

  // Calculate animated properties (debug when playing to see animation values)
  const baseAnimatedProps = useMemo(() => {
    // Only enable debug for selected elements to reduce console spam
    const debug = isPlaying && isSelected;
    // Don't pass phase duration - let animation use its own duration for correct playback speed
    // The phase duration is for timeline display, but animation timing should use anim.duration
    return getAnimatedProperties(element, animations, keyframes, playheadPosition, currentPhase, debug);
  }, [element, animations, keyframes, playheadPosition, currentPhase, isPlaying, isSelected]);

  // When a keyframe is selected for this element, show keyframe values instead of interpolated
  const animatedProps = useMemo(() => {
    if (!selectedKeyframeForElement) return baseAnimatedProps;

    // Override with selected keyframe properties
    const result = { ...baseAnimatedProps };
    Object.entries(selectedKeyframeForElement.properties).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    });
    return result;
  }, [baseAnimatedProps, selectedKeyframeForElement]);

  // Get children sorted by z_index for proper layering within the group
  const children = allElements
    .filter((e) => e.parent_element_id === element.id && e.visible)
    .sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0));

  // Handle click for selection
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // If parent is selected, let clicks bubble up to the parent for dragging
      if (isParentSelected) {
        return; // Don't stop propagation - let parent handle it
      }

      e.stopPropagation();
      if (tool !== 'select' && tool !== 'rotate') return;

      if (e.shiftKey) {
        // Shift+click toggles selection
        selectElements([element.id], 'toggle');
      } else if (!isSelected) {
        // Only replace selection if clicking on a non-selected element
        // This allows dragging groups without breaking the selection
        selectElements([element.id], 'replace');
      }
      // If already selected without shift, do nothing - allows group dragging
    },
    [element.id, selectElements, tool, isSelected, isParentSelected]
  );

  // Handle mouse down for dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // If parent is selected, let the parent handle the drag
      if (isParentSelected) {
        return; // Don't stop propagation - parent will handle drag
      }

      if (element.locked) return;

      // Only handle drag for select tool - rotation is handled by rotation handles
      if (tool === 'select') {
        handleDragStart(e, element.id);
      }
    },
    [element.id, element.locked, handleDragStart, tool, isParentSelected]
  );

  // Build transform style with animated properties
  // Handle animated opacity
  const animatedOpacity = animatedProps.opacity !== undefined 
    ? Number(animatedProps.opacity) 
    : element.opacity;
  
  // Handle animated position
  const animatedX = animatedProps.position_x !== undefined 
    ? Number(animatedProps.position_x) 
    : element.position_x;
  const animatedY = animatedProps.position_y !== undefined 
    ? Number(animatedProps.position_y) 
    : element.position_y;
  
  // Handle animated rotation
  const animatedRotation = animatedProps.rotation !== undefined 
    ? Number(animatedProps.rotation) 
    : element.rotation;
  
  // Handle animated scale
  const animatedScaleX = animatedProps.scale_x !== undefined 
    ? Number(animatedProps.scale_x) 
    : element.scale_x;
  const animatedScaleY = animatedProps.scale_y !== undefined 
    ? Number(animatedProps.scale_y) 
    : element.scale_y;
  
  // Handle animated width/height
  const animatedWidth = animatedProps.width !== undefined 
    ? Number(animatedProps.width) 
    : element.width;
  const animatedHeight = animatedProps.height !== undefined 
    ? Number(animatedProps.height) 
    : element.height;
  
  // Build final transform
  const baseTransform = `rotate(${animatedRotation}deg) scale(${animatedScaleX}, ${animatedScaleY})`;
  const animatedTransform = animatedProps.transform 
    ? `${baseTransform} ${animatedProps.transform}` 
    : baseTransform;

  // Calculate effective z_index: layer z_index + element z_index
  // Layer z_index provides the base (e.g., 100 for fullscreen, 300 for lower-third)
  // Element z_index provides order within the layer (e.g., 0, 10, 20)
  const effectiveZIndex = layerZIndex + (element.z_index ?? 0);

  // Determine if tool is an "add" tool (not select/hand/rotate) - disable pointer events so clicks pass through
  const isAddTool = tool !== 'select' && tool !== 'hand' && tool !== 'rotate';

  // For icons, exclude boxShadow from container styles (it's applied as filter to the icon itself)
  const containerStyles = element.element_type === 'icon' && element.styles?.boxShadow
    ? { ...element.styles, boxShadow: undefined }
    : element.styles;

  // Extract opacity from containerStyles to prevent it from overriding master opacity
  // The master opacity (animatedOpacity) controls the entire element's visibility
  // Background opacity in styles should be handled at the element content level, not container level
  const { opacity: _styleOpacity, ...containerStylesWithoutOpacity } = (containerStyles || {}) as Record<string, unknown>;

  // Extract blend mode from content if it's an image or shape with texture
  const contentBlendMode = (() => {
    if (element.content.type === 'image' && element.content.blendMode) {
      return element.content.blendMode;
    }
    if (element.content.type === 'shape' && element.content.texture?.enabled && element.content.texture.blendMode) {
      return element.content.texture.blendMode;
    }
    return undefined;
  })();

  const transformStyle: React.CSSProperties = {
    position: 'absolute',
    left: animatedX,
    top: animatedY,
    width: animatedWidth ?? 'auto',
    height: animatedHeight ?? 'auto',
    transform: animatedTransform,
    transformOrigin: `${element.anchor_x * 100}% ${element.anchor_y * 100}%`,
    zIndex: effectiveZIndex, // Layer z_index + element z_index for proper layering
    cursor: !element.locked
      ? (tool === 'select'
          ? (isDragging ? 'grabbing' : 'grab')
          : (tool === 'rotate' && isSelected
              ? (isRotating ? 'grabbing' : 'grab')
              : 'default'))
      : 'default',
    // When using add tools, disable pointer events so clicks pass through to canvas
    pointerEvents: isAddTool ? 'none' : 'auto',
    ...containerStylesWithoutOpacity,
    // Apply any other animated properties (excluding ones we've already handled)
    ...Object.fromEntries(
      Object.entries(animatedProps).filter(([key]) =>
        !['opacity', 'position_x', 'position_y', 'rotation', 'scale_x', 'scale_y', 'width', 'height', 'transform'].includes(key)
      )
    ),
    // Master opacity always takes precedence - applied last to ensure it's not overridden
    opacity: animatedOpacity,
    // Apply blend mode at container level so it blends with elements behind
    ...(contentBlendMode && contentBlendMode !== 'normal' ? { mixBlendMode: contentBlendMode as React.CSSProperties['mixBlendMode'] } : {}),
  };

  // Render content based on type
  const renderContent = () => {
    switch (element.content.type) {
      case 'text':
        // Apply text-specific styles from element.styles (textShadow, fontWeight, etc.)
        const textContent = element.content;
        const verticalAlign = element.styles?.verticalAlign || 'middle';
        const alignItemsMap: Record<string, string> = {
          top: 'flex-start',
          middle: 'center',
          bottom: 'flex-end',
        };
        
        // Build text style with proper flex alignment for vertical positioning
        const textAlign = element.styles?.textAlign || 'left';
        const { verticalAlign: _, textAlign: __, ...otherStyles } = element.styles || {};
        
        const textStyle: React.CSSProperties = {
          whiteSpace: 'pre-wrap',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: alignItemsMap[verticalAlign] || 'center',
          // For horizontal alignment, use justifyContent on flex container
          // But textAlign will be applied to the inner span for justify to work
          justifyContent: textAlign === 'center' ? 'center' :
                         textAlign === 'right' ? 'flex-end' : 'flex-start',
          // Apply all other text-related styles
          ...otherStyles,
          // Ensure lineHeight is applied (can be unitless or with units)
          lineHeight: element.styles?.lineHeight || '1.2',
          // Pass textAlign to inner span (needed for justify to work)
          textAlign: textAlign as any,
        };
        // Calculate animation duration from keyframes or default
        const elementAnimations = animations.filter(a => a.element_id === element.id);
        // Keyframes use position (0-100) not time, so calculate max duration from animations
        const animationDuration = elementAnimations.reduce((max, a) => Math.max(max, (a.duration || 1000)), 1000);

        // Merge keyframe animation properties into animation object
        // These properties come from keyframes (textAnimationType, textAnimationDuration, etc.)
        const mergedAnimation = textContent.animation ? {
          ...textContent.animation,
          // Override with keyframe values if they exist in animatedProps
          type: (animatedProps.textAnimationType as string) || textContent.animation.type,
          duration: (animatedProps.textAnimationDuration as number) ?? textContent.animation.duration,
          delay: (animatedProps.textAnimationDelay as number) ?? textContent.animation.delay,
          easing: (animatedProps.textAnimationEasing as string) || textContent.animation.easing,
          direction: (animatedProps.textAnimationDirection as 'in' | 'out' | 'in-out') || textContent.animation.direction,
        } : undefined;

        return (
          <TextElement
            text={textContent.text || ''}
            animation={mergedAnimation}
            style={textStyle}
            isPlaying={isPlaying}
            playheadPosition={playheadPosition}
            animationDuration={animationDuration}
            animatedProps={animatedProps}
          />
        );

      case 'image':
        return (
          <ImageElement
            content={element.content}
            width={element.width}
            height={element.height}
            elementId={element.id}
            elementName={element.name}
            isSelected={isSelected}
            isPreview={false}
            style={element.styles}
          />
        );

      case 'shape': {
        // Apply animated backgroundColor (which could come from 'fill' keyframe property)
        const animatedBgColor = animatedProps.backgroundColor;
        const shapeContent = element.content;
        const glass = shapeContent.glass;
        const gradient = shapeContent.gradient;
        const glow = shapeContent.glow;
        const texture = shapeContent.texture;

        // For shapes, exclude backgroundColor from element.styles since background is controlled
        // by content.fill, gradient, glass, or texture - not styles.backgroundColor
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { backgroundColor: _excludedBgFromStyles, background: _excludedBgGradient, ...shapeSafeStyles } = element.styles || {};

        // Memoize gradient calculation to prevent infinite re-renders
        const gradientValue = useMemo(() => {
          if (!gradient?.enabled || !gradient.colors || gradient.colors.length < 2) {
            return null;
          }

          const colorStops = [...gradient.colors]
            .sort((a, b) => a.stop - b.stop)
            .map(c => `${c.color} ${c.stop}%`)
            .join(', ');

          if (gradient.type === 'linear') {
            const angle = gradient.direction || 0;
            return `linear-gradient(${angle}deg, ${colorStops})`;
          } else if (gradient.type === 'radial') {
            const pos = gradient.radialPosition || { x: 50, y: 50 };
            return `radial-gradient(circle at ${pos.x}% ${pos.y}%, ${colorStops})`;
          } else if (gradient.type === 'conic') {
            const angle = gradient.direction || 0;
            return `conic-gradient(from ${angle}deg, ${colorStops})`;
          }
          return null;
        }, [gradient?.enabled, gradient?.type, gradient?.direction, gradient?.radialPosition, gradient?.colors]);
        
        // Helper to convert color to rgba with opacity
        const colorToRgba = (color: string, opacity: number): string => {
          // Handle hex colors
          if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
          }
          // Handle rgb colors
          if (color.startsWith('rgb(')) {
            const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
              return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
            }
          }
          // Handle rgba colors - extract rgb and apply new opacity
          if (color.startsWith('rgba(')) {
            const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
            if (match) {
              return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
            }
          }
          // Handle named colors or transparent - fallback to semi-transparent black
          if (color === 'transparent' || !color) {
            return `rgba(0, 0, 0, ${opacity})`;
          }
          // For other named colors, just return with opacity (browser will handle)
          return `rgba(0, 0, 0, ${opacity})`;
        };

        // Memoize glass styles to prevent re-renders
        // Glass effect uses the fill color as base with applied opacity
        const glassStyles: React.CSSProperties = useMemo(() => {
          if (!glass?.enabled) return {};

          const fillColor = shapeContent.fill || '#000000';
          const glassOpacity = glass.opacity !== undefined ? glass.opacity : 0.6;

          // Determine border: respect 0 as "no border"
          const getBorder = () => {
            if (glass.borderWidth === 0) {
              return 'none';
            }
            if (glass.borderWidth !== undefined && glass.borderWidth > 0 && glass.borderColor) {
              return `${glass.borderWidth}px solid ${glass.borderColor}`;
            }
            if (glass.borderWidth !== undefined && glass.borderWidth > 0) {
              return `${glass.borderWidth}px solid rgba(255, 255, 255, 0.1)`;
            }
            return '1px solid rgba(255, 255, 255, 0.1)';
          };

          return {
            backgroundColor: colorToRgba(fillColor, glassOpacity),
            backdropFilter: glass.blur !== undefined
              ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
              : 'blur(16px)',
            WebkitBackdropFilter: glass.blur !== undefined
              ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
              : 'blur(16px)',
            border: getBorder(),
          };
        }, [glass?.enabled, glass?.opacity, glass?.blur, glass?.saturation, glass?.borderWidth, glass?.borderColor, shapeContent.fill]);

        // Compute glow box-shadow style
        const glowStyle = useMemo((): React.CSSProperties => {
          if (!glow?.enabled) return {};

          const glowColor = glow.color || shapeContent.fill || '#8B5CF6';
          const blur = glow.blur ?? 20;
          const spread = glow.spread ?? 0;
          const intensity = glow.intensity ?? 0.6;

          // Convert color to rgba with intensity
          let colorWithAlpha = glowColor;
          if (glowColor.startsWith('#')) {
            const hex = glowColor.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            colorWithAlpha = `rgba(${r}, ${g}, ${b}, ${intensity})`;
          } else if (glowColor.startsWith('rgb(')) {
            const match = glowColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
              colorWithAlpha = `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${intensity})`;
            }
          }

          return {
            boxShadow: `0 0 ${blur}px ${spread}px ${colorWithAlpha}`,
          };
        }, [glow?.enabled, glow?.color, glow?.blur, glow?.spread, glow?.intensity, shapeContent.fill]);

        // Compute texture style for background-image
        const textureStyle = useMemo((): React.CSSProperties => {
          if (!texture?.enabled || !texture.url) return {};

          const scale = texture.scale ?? 1;
          const posX = texture.position?.x ?? 0;
          const posY = texture.position?.y ?? 0;
          const rotation = texture.rotation ?? 0;
          const opacity = texture.opacity ?? 1;
          const fit = texture.fit || 'cover';
          const blendMode = texture.blendMode || 'normal';

          // Calculate background-size based on fit mode
          let backgroundSize: string;
          let backgroundRepeat: string = 'no-repeat';

          switch (fit) {
            case 'contain':
              backgroundSize = `${100 * scale}% auto`;
              break;
            case 'fill':
              backgroundSize = `${100 * scale}% ${100 * scale}%`;
              break;
            case 'tile':
              backgroundSize = `${50 * scale}%`;
              backgroundRepeat = 'repeat';
              break;
            case 'cover':
            default:
              backgroundSize = scale === 1 ? 'cover' : `${100 * scale}%`;
              break;
          }

          // Background position: 50% 50% is center, adjust by position offset
          const bgPosX = 50 + posX;
          const bgPosY = 50 + posY;

          return {
            backgroundImage: `url(${texture.url})`,
            backgroundSize,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
            backgroundRepeat,
            opacity,
            mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'],
            // Note: rotation would need a wrapper div or CSS transform
            ...(rotation !== 0 ? { transform: `rotate(${rotation}deg)` } : {}),
          };
        }, [texture?.enabled, texture?.url, texture?.scale, texture?.position, texture?.rotation, texture?.opacity, texture?.fit, texture?.blendMode]);

        // Determine background color/value
        const bgColorValue = typeof animatedBgColor === 'string'
          ? animatedBgColor
          : (shapeContent.fill || 'transparent');

        // Get clip path for special shapes
        const getClipPath = (shape: string): string | undefined => {
          switch (shape) {
            case 'rhombus':
              // Diamond shape: points at top, right, bottom, left (50% from each edge)
              return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
            case 'trapezoid':
              // Trapezoid: wider at bottom, narrower at top (20% inset on top)
              return 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)';
            case 'parallelogram':
              // Parallelogram: slanted sides (like a skewed rectangle)
              return 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)';
            default:
              return undefined;
          }
        };

        // Build shape style - When both glass and gradient are enabled, use a wrapper approach
        // The gradient goes on the outer div, and glass (with backdrop-filter) goes on an inner div
        // This allows backdrop-filter to blur the gradient behind it
        const clipPath = getClipPath(shapeContent.shape);
        const baseStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          borderRadius: (shapeContent.shape === 'rhombus' || shapeContent.shape === 'parallelogram') ? 0 : shapeContent.cornerRadius || 0,
          clipPath: clipPath,
          WebkitClipPath: clipPath,
        };

        // If both glass and gradient are enabled, use wrapper div approach
        // The gradient shows as the base, with glass blur effect on top (but transparent so gradient shows through)
        if (glass?.enabled && gradientValue) {
          // Determine border: glass border takes priority, then stroke if > 0, then default glass border
          const getBorder = () => {
            if (glass.borderWidth !== undefined && glass.borderWidth > 0 && glass.borderColor) {
              return `${glass.borderWidth}px solid ${glass.borderColor}`;
            }
            if (glass.borderWidth !== undefined && glass.borderWidth > 0) {
              return `${glass.borderWidth}px solid rgba(255, 255, 255, 0.1)`;
            }
            if (glass.borderWidth === 0) {
              return 'none';
            }
            if (shapeContent.stroke && shapeContent.strokeWidth && shapeContent.strokeWidth > 0) {
              return `${shapeContent.strokeWidth}px solid ${shapeContent.stroke}`;
            }
            return '1px solid rgba(255, 255, 255, 0.1)';
          };

          const outerStyle: React.CSSProperties = {
            ...baseStyle,
            background: gradientValue, // Gradient on outer div
            position: 'relative',
            overflow: 'hidden',
            // Glass border goes on outer
            border: getBorder(),
            // Apply glow effect
            ...glowStyle,
            // Apply element.styles (shadows, etc.) - excluding background properties
            ...shapeSafeStyles,
          };

          // For gradient + glass, inner div should be transparent with just blur
          const glassOpacity = glass.opacity !== undefined ? glass.opacity : 0.3;
          const innerStyle: React.CSSProperties = {
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(255, 255, 255, ${glassOpacity * 0.1})`, // Very subtle white overlay
            backdropFilter: glass.blur !== undefined
              ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
              : 'blur(16px)',
            WebkitBackdropFilter: glass.blur !== undefined
              ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
              : 'blur(16px)',
            borderRadius: 'inherit',
          };

          return (
            <div style={outerStyle}>
              <div style={innerStyle} />
            </div>
          );
        }
        
        // If only glass is enabled
        if (glass?.enabled) {
          const glassStyleFinal: React.CSSProperties = {
            ...baseStyle,
            ...glassStyles,
            // Regular border (only if glass doesn't have border and strokeWidth > 0)
            ...(!glass.borderWidth && shapeContent.stroke && shapeContent.strokeWidth && shapeContent.strokeWidth > 0 ? {
              border: `${shapeContent.strokeWidth}px solid ${shapeContent.stroke}`,
            } : {}),
            // Apply glow effect
            ...glowStyle,
            // Apply element.styles - excluding background properties
            ...shapeSafeStyles,
          };
          return <div style={glassStyleFinal} />;
        }

        // If only gradient is enabled
        if (gradientValue) {
          const gradientStyleFinal: React.CSSProperties = {
            ...baseStyle,
            background: gradientValue,
            // Regular border (only if strokeWidth > 0)
            ...(shapeContent.stroke && shapeContent.strokeWidth && shapeContent.strokeWidth > 0 ? {
              border: `${shapeContent.strokeWidth}px solid ${shapeContent.stroke}`,
            } : {}),
            // Apply glow effect
            ...glowStyle,
            // Apply element.styles - excluding background properties
            ...shapeSafeStyles,
          };
          return <div style={gradientStyleFinal} />;
        }

        // If texture is enabled, render with texture background
        if (texture?.enabled && texture.url) {
          const textureBaseStyle: React.CSSProperties = {
            ...baseStyle,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: bgColorValue,
            // Regular border
            ...(shapeContent.stroke && shapeContent.strokeWidth && shapeContent.strokeWidth > 0 ? {
              border: `${shapeContent.strokeWidth}px solid ${shapeContent.stroke}`,
            } : {}),
            // Apply glow effect
            ...glowStyle,
            // Apply element.styles - excluding background properties
            ...shapeSafeStyles,
          };

          const textureLayerStyle: React.CSSProperties = {
            position: 'absolute',
            inset: 0,
            ...textureStyle,
            borderRadius: 'inherit',
            pointerEvents: 'none',
          };

          // If texture is a video, render video element
          if (texture.mediaType === 'video') {
            return (
              <div style={textureBaseStyle}>
                <video
                  src={texture.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: (texture.fit === 'cover' ? 'cover' : texture.fit === 'contain' ? 'contain' : 'fill') as React.CSSProperties['objectFit'],
                    objectPosition: `${50 + (texture.position?.x ?? 0)}% ${50 + (texture.position?.y ?? 0)}%`,
                    opacity: texture.opacity ?? 1,
                    mixBlendMode: (texture.blendMode || 'normal') as React.CSSProperties['mixBlendMode'],
                    transform: texture.rotation ? `scale(${texture.scale ?? 1}) rotate(${texture.rotation}deg)` : `scale(${texture.scale ?? 1})`,
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            );
          }

          // For images, use background-image approach
          return (
            <div style={textureBaseStyle}>
              <div style={textureLayerStyle} />
            </div>
          );
        }

        // Default: solid color
        const solidStyle: React.CSSProperties = {
          ...baseStyle,
          backgroundColor: bgColorValue,
          // Regular border (only if strokeWidth > 0)
          ...(shapeContent.stroke && shapeContent.strokeWidth && shapeContent.strokeWidth > 0 ? {
            border: `${shapeContent.strokeWidth}px solid ${shapeContent.stroke}`,
          } : {}),
          // Apply glow effect
          ...glowStyle,
          // Apply element.styles (excluding backgroundColor/background which is controlled by content.fill)
          ...shapeSafeStyles,
          // Animated background color takes final precedence
          ...(animatedBgColor ? {
            backgroundColor: bgColorValue,
          } : {}),
        };

        return <div style={solidStyle} />;
      }

      case 'chart':
        return (
          <ChartElement
            chartType={element.content.chartType || 'bar'}
            data={element.content.data || { labels: [], datasets: [] }}
            options={element.content.options || {}}
            width={animatedWidth ?? element.width ?? 400}
            height={animatedHeight ?? element.height ?? 300}
            animatedProps={animatedProps}
            isPlaying={isPlaying}
          />
        );

      case 'map':
        // Merge animated map properties into content
        const mapContent = element.content as {
          type: 'map';
          center?: [number, number];
          zoom?: number;
          pitch?: number;
          bearing?: number;
          mapStyle?: string;
          projection?: string;
          markers?: unknown[];
          markerTemplates?: unknown[];
          locationKeyframes?: unknown[];
          savedLocations?: unknown[];
          animateLocation?: boolean;
          animationDuration?: number;
          animationEasing?: string;
          [key: string]: unknown;
        };
        // Handle mapCenter (combined) or separate mapCenterLng/mapCenterLat
        // Default center to [0, 0] if not provided
        const defaultCenter: [number, number] = [0, 0];
        let centerLng = mapContent.center?.[0] ?? defaultCenter[0];
        let centerLat = mapContent.center?.[1] ?? defaultCenter[1];
        
        if (animatedProps.mapCenter !== undefined) {
          // Combined center property (format: "lng,lat")
          const centerStr = String(animatedProps.mapCenter);
          const [lng, lat] = centerStr.split(',').map(v => parseFloat(v.trim()) || 0);
          if (!isNaN(lng) && !isNaN(lat)) {
            centerLng = lng;
            centerLat = lat;
          }
        } else {
          // Separate properties (backward compatibility)
          if (animatedProps.mapCenterLng !== undefined) {
            centerLng = Number(animatedProps.mapCenterLng);
          }
          if (animatedProps.mapCenterLat !== undefined) {
            centerLat = Number(animatedProps.mapCenterLat);
          }
        }
        
        // Check if any map properties are coming from keyframe animation
        const hasAnimatedMapProps = animatedProps.mapCenter !== undefined ||
          animatedProps.mapCenterLng !== undefined ||
          animatedProps.mapCenterLat !== undefined ||
          animatedProps.mapZoom !== undefined ||
          animatedProps.mapPitch !== undefined ||
          animatedProps.mapBearing !== undefined;

        // Check if we have location keyframes - these take priority for animation
        const hasLocationKeyframes = mapContent.locationKeyframes && mapContent.locationKeyframes.length >= 2;

        const animatedMapContent = {
          ...mapContent,
          center: [centerLng, centerLat] as [number, number],
          zoom: animatedProps.mapZoom !== undefined
            ? Number(animatedProps.mapZoom)
            : (mapContent.zoom ?? 10),
          pitch: animatedProps.mapPitch !== undefined
            ? Number(animatedProps.mapPitch)
            : (mapContent.pitch ?? 0),
          bearing: animatedProps.mapBearing !== undefined
            ? Number(animatedProps.mapBearing)
            : (mapContent.bearing ?? 0),
          // Preserve mapStyle, projection, and location keyframes
          mapStyle: mapContent.mapStyle || 'dark',
          projection: mapContent.projection,
          locationKeyframes: mapContent.locationKeyframes,
          animateLocation: mapContent.animateLocation,
          animationDuration: mapContent.animationDuration,
          animationEasing: mapContent.animationEasing,
        };
        return (
          <MapElement
            content={animatedMapContent}
            width={element.width}
            height={element.height}
            elementId={element.id}
            interactive={isSelected}
            isPlaying={isPlaying}
            isAnimated={hasAnimatedMapProps || hasLocationKeyframes}
            playheadPosition={playheadPosition}
            currentPhase={currentPhase}
          />
        );

      case 'video':
        return (
          <VideoElement
            content={element.content}
            width={element.width}
            height={element.height}
            elementId={element.id}
            isSelected={isSelected}
            isPreview={false} // In designer, show overlay when selected
          />
        );

      case 'ticker':
        return (
          <TickerElement
            items={element.content.items || []}
            config={element.content.config || {}}
            className="w-full h-full"
            style={element.styles}
          />
        );

      case 'topic-badge':
        return (
          <TopicBadgeElement
            linkedTickerId={element.content.linkedTickerId}
            defaultTopic={element.content.defaultTopic}
            customLabel={element.content.customLabel}
            customStyle={element.content.customStyle}
            showIcon={element.content.showIcon ?? true}
            animated={element.content.animated ?? true}
            className="w-full h-full"
          />
        );

      case 'countdown':
        return (
          <CountdownElement
            config={element.content}
            className="w-full h-full"
            isPlaying={isPlaying}
          />
        );

      case 'svg':
        return (
          <SVGElement
            content={element.content}
            width={element.width}
            height={element.height}
            elementId={element.id}
            isSelected={isSelected}
          />
        );

      case 'icon':
        // Extract shadow from element.styles and convert to filter for icon shape
        const iconShadow = element.styles?.boxShadow;
        const iconFilter = iconShadow ? convertBoxShadowToFilter(iconShadow) : undefined;
        return (
          <IconElement
            content={element.content}
            width={element.width}
            height={element.height}
            isSelected={isSelected}
            filter={iconFilter}
          />
        );

      case 'line':
        return (
          <LineElement
            content={element.content}
            width={element.width}
            height={element.height}
          />
        );

      case 'table':
        return (
          <TableElement
            content={element.content}
            width={element.width}
            height={element.height}
            isSelected={isSelected}
          />
        );

      case 'group':
      case 'div':
        // Render a styled container - useful for backgrounds with glass effects
        const containerStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          // Apply all styles from element.styles (glass, shadows, gradients, etc.)
          ...element.styles,
        };
        return <div style={containerStyle} />;

      default:
        return null;
    }
  };

  return (
    <div
      data-element-id={element.id}
      style={transformStyle}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHoveredElement(element.id)}
      onMouseLeave={() => setHoveredElement(null)}
      className={cn(
        'group transition-shadow',
        !element.locked && 'cursor-pointer',
        isHovered && !isSelected && 'ring-1 ring-violet-400/50',
        isSelected && 'ring-2 ring-violet-500 shadow-lg shadow-violet-500/20'
      )}
    >
      {renderContent()}

      {/* Render children */}
      {children.map((child) => (
        <StageElement key={child.id} element={child} allElements={allElements} layerZIndex={layerZIndex} />
      ))}

      {/* Drag overlay for selected elements - captures clicks/drags on children */}
      {isSelected && !element.locked && tool === 'select' && children.length > 0 && (
        <div
          className="absolute inset-0 z-[9998] cursor-grab active:cursor-grabbing"
          style={{ background: 'transparent' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleDragStart(e, element.id);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Selection handles */}
      {isSelected && !element.locked && tool === 'select' && (
        <SelectionHandles
          elementId={element.id}
          width={element.width ?? 100}
          height={element.height ?? 100}
          onResizeStart={handleResizeStart}
        />
      )}

      {/* Rotation handles - shown when rotate tool is active */}
      {isSelected && !element.locked && tool === 'rotate' && (
        <RotationHandles
          elementId={element.id}
          width={element.width ?? 100}
          height={element.height ?? 100}
          rotation={element.rotation ?? 0}
          onRotateStart={handleRotateStart}
        />
      )}
    </div>
  );
}

interface SelectionHandlesProps {
  elementId: string;
  width: number;
  height: number;
  onResizeStart: (e: React.MouseEvent, elementId: string, handle: ResizeHandle) => void;
}

function SelectionHandles({ elementId, width, height, onResizeStart }: SelectionHandlesProps) {
  const handleSize = 8;
  const halfSize = handleSize / 2;

  const handles: { handle: ResizeHandle; x: number; y: number }[] = [
    // Corners
    { handle: 'nw', x: -halfSize, y: -halfSize },
    { handle: 'ne', x: width - halfSize, y: -halfSize },
    { handle: 'se', x: width - halfSize, y: height - halfSize },
    { handle: 'sw', x: -halfSize, y: height - halfSize },
    // Edges
    { handle: 'n', x: width / 2 - halfSize, y: -halfSize },
    { handle: 's', x: width / 2 - halfSize, y: height - halfSize },
    { handle: 'e', x: width - halfSize, y: height / 2 - halfSize },
    { handle: 'w', x: -halfSize, y: height / 2 - halfSize },
  ];

  return (
    <>
      {handles.map(({ handle, x, y }) => (
        <div
          key={handle}
          className="absolute bg-white border-2 border-violet-500 rounded-sm z-10 hover:bg-violet-100"
          style={{
            left: x,
            top: y,
            width: handleSize,
            height: handleSize,
            cursor: RESIZE_CURSORS[handle],
          }}
          onMouseDown={(e) => onResizeStart(e, elementId, handle)}
        />
      ))}
    </>
  );
}

// Rotation handles component
interface RotationHandlesProps {
  elementId: string;
  width: number;
  height: number;
  rotation: number;
  onRotateStart: (e: React.MouseEvent, elementId: string) => void;
}

function RotationHandles({ elementId, width, height, rotation, onRotateStart }: RotationHandlesProps) {
  const handleSize = 24; // Larger handles for better visibility
  const halfSize = handleSize / 2;
  const cornerOffset = 8; // Small offset from corner

  // Position handles at corners, just slightly outside
  const handles = [
    { id: 'nw', x: -cornerOffset - halfSize, y: -cornerOffset - halfSize },
    { id: 'ne', x: width + cornerOffset - halfSize, y: -cornerOffset - halfSize },
    { id: 'se', x: width + cornerOffset - halfSize, y: height + cornerOffset - halfSize },
    { id: 'sw', x: -cornerOffset - halfSize, y: height + cornerOffset - halfSize },
  ];

  // Rotation icon SVG
  const RotateIcon = () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-violet-600"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );

  return (
    <>
      {/* Corner rotation handles with rotate icons */}
      {handles.map(({ id, x, y }) => (
        <div
          key={id}
          className="absolute z-10 bg-white border-2 border-violet-500 rounded-full hover:bg-violet-100 hover:border-violet-600 hover:scale-110 transition-all shadow-md flex items-center justify-center"
          style={{
            left: x,
            top: y,
            width: handleSize,
            height: handleSize,
            cursor: 'grab',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRotateStart(e, elementId);
          }}
        >
          <RotateIcon />
        </div>
      ))}

      {/* Rotation indicator showing current angle */}
      {rotation !== 0 && (
        <div
          className="absolute z-20 bg-violet-600 text-white text-xs font-medium px-2 py-1 rounded-md pointer-events-none shadow-lg"
          style={{
            left: width / 2,
            top: -40,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {Math.round(rotation)}°
        </div>
      )}
    </>
  );
}

// Check if URL is a placeholder/fake URL
function isPlaceholderUrl(url: string | undefined): boolean {
  if (!url) return true;
  const placeholderPatterns = [
    'example.com',
    'placeholder.com',
    'via.placeholder',
    'placehold.it',
    'placekitten',
    'picsum.photos',
    'fakeimg.pl',
    'dummyimage.com',
    'lorempixel',
    '/placeholder',
    'data:image/svg',
  ];
  return placeholderPatterns.some(pattern => url.toLowerCase().includes(pattern));
}

// Generate initials from element name
function getInitials(name: string): string {
  return name
    .split(/[\s-_]+/)
    .filter(word => word.length > 0)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');
}

// Generate a color from a string (for consistent placeholder colors)
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#EF4444', // Red
    '#F97316', // Orange
    '#FBBF24', // Amber
    '#22C55E', // Green
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
  ];
  return colors[Math.abs(hash) % colors.length];
}

interface ImageWithPlaceholderProps {
  src: string | undefined;
  alt: string;
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  elementName: string;
  style?: React.CSSProperties;
}

function ImageWithPlaceholder({ src, alt, fit = 'cover', elementName, style }: ImageWithPlaceholderProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const showPlaceholder = !src || hasError || isPlaceholderUrl(src);
  const initials = getInitials(elementName);
  const bgColor = stringToColor(elementName);
  
  if (showPlaceholder) {
    return (
      <div 
        className="w-full h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-600"
        style={{ backgroundColor: bgColor + '20' }}
      >
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
          style={{ backgroundColor: bgColor }}
        >
          {initials || '?'}
        </div>
        <span className="text-xs text-neutral-400 text-center px-2 truncate max-w-full">
          {elementName}
        </span>
        <span className="text-[10px] text-neutral-500">
          Click to add image
        </span>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit,
          display: isLoading ? 'none' : 'block',
          ...style, // Apply custom styles (border, borderRadius, blur, etc.)
        }}
        draggable={false}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </>
  );
}
