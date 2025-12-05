import { useCallback, useMemo, useState } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { useDrag } from '@/hooks/useDrag';
import { useResize, RESIZE_CURSORS, type ResizeHandle } from '@/hooks/useResize';
import { getAnimatedProperties } from '@/lib/animation';
import { ChartElement } from './ChartElement';
import { MapElement } from './MapElement';
import { VideoElement } from './VideoElement';
import { SVGElement } from './SVGElement';
import { IconElement } from './IconElement';
import { TableElement } from './TableElement';
import { TickerElement } from './TickerElement';
import { TopicBadgeElement } from './TopicBadgeElement';
import { TextElement } from './TextElement';
import type { Element } from '@/types/database';
import { cn } from '@/lib/utils';

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
  } = useDesignerStore();

  const { isDragging, handleMouseDown: handleDragStart } = useDrag();
  const { isResizing, handleResizeStart } = useResize();

  const isSelected = selectedElementIds.includes(element.id);
  const isHovered = hoveredElementId === element.id;

  // Calculate animated properties (debug when playing to see animation values)
  const animatedProps = useMemo(() => {
    // Only enable debug for selected elements to reduce console spam
    const debug = isPlaying && isSelected;
    return getAnimatedProperties(element, animations, keyframes, playheadPosition, currentPhase, debug);
  }, [element, animations, keyframes, playheadPosition, currentPhase, isPlaying, isSelected]);

  // Get children sorted by z_index for proper layering within the group
  const children = allElements
    .filter((e) => e.parent_element_id === element.id && e.visible)
    .sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0));

  // Handle click for selection
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (tool !== 'select') return;

      if (e.shiftKey) {
        selectElements([element.id], 'toggle');
      } else {
        selectElements([element.id], 'replace');
      }
    },
    [element.id, selectElements, tool]
  );

  // Handle mouse down for dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (element.locked) return;
      handleDragStart(e, element.id);
    },
    [element.id, element.locked, handleDragStart]
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

  const transformStyle: React.CSSProperties = {
    position: 'absolute',
    left: animatedX,
    top: animatedY,
    width: animatedWidth ?? 'auto',
    height: animatedHeight ?? 'auto',
    transform: animatedTransform,
    transformOrigin: `${element.anchor_x * 100}% ${element.anchor_y * 100}%`,
    opacity: animatedOpacity,
    zIndex: effectiveZIndex, // Layer z_index + element z_index for proper layering
    cursor: tool === 'select' && !element.locked ? (isDragging ? 'grabbing' : 'grab') : 'default',
    ...element.styles,
    // Apply any other animated properties (excluding ones we've already handled)
    ...Object.fromEntries(
      Object.entries(animatedProps).filter(([key]) => 
        !['opacity', 'position_x', 'position_y', 'rotation', 'scale_x', 'scale_y', 'width', 'height', 'transform'].includes(key)
      )
    ),
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
            text={textContent.text}
            animation={mergedAnimation}
            style={textStyle}
            isPlaying={isPlaying}
            playheadPosition={playheadPosition}
            animationDuration={animationDuration}
            animatedProps={animatedProps}
          />
        );

      case 'image':
        const imageContent = element.content;
        const imageStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          objectFit: imageContent.fit || 'cover',
          borderRadius: imageContent.cornerRadius ? `${imageContent.cornerRadius}px` : undefined,
          border: imageContent.border?.enabled
            ? `${imageContent.border.width || 2}px solid ${imageContent.border.color || '#FFFFFF'}`
            : undefined,
          filter: imageContent.blur?.enabled
            ? `blur(${imageContent.blur.amount || 0}px)`
            : undefined,
          // Apply any additional styles from element.styles
          ...element.styles,
        };
        return (
          <ImageWithPlaceholder
            src={imageContent.src}
            alt={element.name}
            fit={imageContent.fit || 'cover'}
            elementName={element.name}
            style={imageStyle}
          />
        );

      case 'shape': {
        // Apply animated backgroundColor (which could come from 'fill' keyframe property)
        const animatedBgColor = animatedProps.backgroundColor;
        const shapeContent = element.content;
        const glass = shapeContent.glass;
        const gradient = shapeContent.gradient;
        
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
        
        // Memoize glass styles to prevent re-renders
        const glassStyles: React.CSSProperties = useMemo(() => {
          if (!glass?.enabled) return {};
          
          return {
            backgroundColor: glass.opacity !== undefined 
              ? `rgba(0, 0, 0, ${glass.opacity})` 
              : 'rgba(0, 0, 0, 0.6)',
            backdropFilter: glass.blur !== undefined 
              ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
              : 'blur(16px)',
            WebkitBackdropFilter: glass.blur !== undefined 
              ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
              : 'blur(16px)',
            border: glass.borderWidth !== undefined && glass.borderColor
              ? `${glass.borderWidth}px solid ${glass.borderColor}`
              : glass.borderWidth !== undefined
              ? `${glass.borderWidth}px solid rgba(255, 255, 255, 0.1)`
              : '1px solid rgba(255, 255, 255, 0.1)',
          };
        }, [glass?.enabled, glass?.opacity, glass?.blur, glass?.saturation, glass?.borderWidth, glass?.borderColor]);
        
        // Determine background color/value
        const bgColorValue = typeof animatedBgColor === 'string' 
          ? animatedBgColor 
          : (shapeContent.fill || 'transparent');
        
        // Build shape style - When both glass and gradient are enabled, use a wrapper approach
        // Glass effect needs backdrop-filter which works on the element itself
        // Gradient can be applied as background, but glass needs to be on top
        const shapeStyle: React.CSSProperties = useMemo(() => {
          const baseStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            borderRadius: shapeContent.shape === 'ellipse' ? '50%' : shapeContent.cornerRadius || 0,
          };

          // If both glass and gradient are enabled, apply gradient as background
          // and glass effects on top (glass will blur the gradient behind it)
          if (glass?.enabled && gradientValue) {
            return {
              ...baseStyle,
              background: gradientValue, // Gradient as base background
              ...glassStyles, // Glass effects on top (backdrop-filter will blur the gradient)
            };
          }
          
          // If only glass is enabled
          if (glass?.enabled) {
            return {
              ...baseStyle,
              ...glassStyles,
            };
          }
          
          // If only gradient is enabled
          if (gradientValue) {
            return {
              ...baseStyle,
              background: gradientValue,
            };
          }
          
          // Default: solid color
          return {
            ...baseStyle,
            backgroundColor: bgColorValue,
          };
        }, [glass?.enabled, gradientValue, glassStyles, shapeContent.shape, shapeContent.cornerRadius, bgColorValue]);
        
        // Build final style object immutably
        const finalStyle: React.CSSProperties = {
          ...shapeStyle,
          // Regular border (only if glass is not enabled or doesn't have border)
          ...(!glass?.enabled && shapeContent.stroke ? {
            border: `${shapeContent.strokeWidth || 2}px solid ${shapeContent.stroke}`,
          } : {}),
          // Apply element.styles (includes additional effects, shadows, etc.)
          ...(element.styles || {}),
          // Animated background color takes final precedence (only if no gradient and no glass)
          ...(animatedBgColor && !gradientValue && !glass?.enabled ? {
            backgroundColor: bgColorValue,
          } : {}),
        };

        return <div style={finalStyle} />;
      }

      case 'chart':
        return (
          <ChartElement
            chartType={element.content.chartType}
            data={element.content.data}
            options={element.content.options}
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
          center: [number, number];
          zoom: number;
          pitch?: number;
          bearing?: number;
          [key: string]: unknown;
        };
        const animatedMapContent = {
          ...mapContent,
          center: [
            (animatedProps.mapCenterLng !== undefined 
              ? Number(animatedProps.mapCenterLng) 
              : mapContent.center[0]) as number,
            (animatedProps.mapCenterLat !== undefined 
              ? Number(animatedProps.mapCenterLat) 
              : mapContent.center[1]) as number,
          ] as [number, number],
          zoom: animatedProps.mapZoom !== undefined 
            ? Number(animatedProps.mapZoom) 
            : mapContent.zoom,
          pitch: animatedProps.mapPitch !== undefined 
            ? Number(animatedProps.mapPitch) 
            : mapContent.pitch,
          bearing: animatedProps.mapBearing !== undefined 
            ? Number(animatedProps.mapBearing) 
            : mapContent.bearing,
        };
        return (
          <MapElement
            content={animatedMapContent}
            width={element.width}
            height={element.height}
            elementId={element.id}
            interactive={isSelected}
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
          />
        );

      case 'ticker':
        return (
          <TickerElement
            items={element.content.items || []}
            config={element.content.config || {}}
            className="w-full h-full"
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
        return (
          <IconElement
            content={element.content}
            width={element.width}
            height={element.height}
            isSelected={isSelected}
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

      {/* Selection handles */}
      {isSelected && !element.locked && tool === 'select' && (
        <SelectionHandles
          elementId={element.id}
          width={element.width ?? 100}
          height={element.height ?? 100}
          onResizeStart={handleResizeStart}
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
