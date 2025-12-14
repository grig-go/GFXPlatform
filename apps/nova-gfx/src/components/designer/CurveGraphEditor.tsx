import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
// @ts-ignore - bezier-js doesn't have type declarations
import { Bezier } from 'bezier-js';
import { cn } from '@emergent-platform/ui';
import { Eye, EyeOff } from 'lucide-react';
import type { Animation, Keyframe } from '@emergent-platform/types';

// Property colors for the curves
const PROPERTY_COLORS: Record<string, string> = {
  position_x: '#EF4444', // red
  position_y: '#22C55E', // green
  rotation: '#3B82F6',   // blue
  scale_x: '#F59E0B',    // amber
  scale_y: '#8B5CF6',    // violet
  opacity: '#EC4899',    // pink
  filter_blur: '#06B6D4', // cyan
  filter_brightness: '#F97316', // orange
};

// Get color for a property (with fallback)
const getPropertyColor = (prop: string): string => {
  return PROPERTY_COLORS[prop] || '#A3A3A3';
};

// Parse easing string to bezier control points
const parseEasing = (easing: string): [number, number, number, number] => {
  const presets: Record<string, [number, number, number, number]> = {
    'linear': [0, 0, 1, 1],
    'ease': [0.25, 0.1, 0.25, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
  };

  if (presets[easing]) {
    return presets[easing];
  }

  // Parse cubic-bezier(x1, y1, x2, y2)
  const match = easing.match(/cubic-bezier\s*\(\s*([\d.]+)\s*,\s*([\d.-]+)\s*,\s*([\d.]+)\s*,\s*([\d.-]+)\s*\)/);
  if (match) {
    return [
      parseFloat(match[1]),
      parseFloat(match[2]),
      parseFloat(match[3]),
      parseFloat(match[4]),
    ];
  }

  return [0.25, 0.1, 0.25, 1]; // default to ease
};

// Interpolate value using bezier easing
const interpolateWithEasing = (
  startVal: number,
  endVal: number,
  t: number,
  easing: string
): number => {
  const [x1, y1, x2, y2] = parseEasing(easing);

  // Create a bezier curve for timing
  const bezier = new Bezier(
    { x: 0, y: 0 },
    { x: x1, y: y1 },
    { x: x2, y: y2 },
    { x: 1, y: 1 }
  );

  // Find the y value at time t using the bezier curve
  // This is a simplified approach - we sample and find closest x
  const lut = bezier.getLUT(100);
  let closestIdx = 0;
  let closestDist = Infinity;

  for (let i = 0; i < lut.length; i++) {
    const dist = Math.abs(lut[i].x - t);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  }

  const easedT = lut[closestIdx].y;
  return startVal + (endVal - startVal) * easedT;
};

interface CurveData {
  property: string;
  keyframes: Array<{
    time: number; // in ms from animation start
    value: number;
    easing: string;
  }>;
  minValue: number;
  maxValue: number;
  visible: boolean;
}

interface CurveGraphEditorProps {
  animation: Animation;
  keyframes: Keyframe[];
  phaseDuration: number;
  zoom: number;
  playheadPosition: number;
  scrollLeft?: number;
  onKeyframeUpdate?: (keyframeId: string, property: string, value: number) => void;
  onScrollChange?: (scrollLeft: number) => void;
  className?: string;
}

export function CurveGraphEditor({
  animation,
  keyframes,
  phaseDuration,
  zoom,
  playheadPosition,
  scrollLeft = 0,
  onKeyframeUpdate,
  onScrollChange,
  className,
}: CurveGraphEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleProperties, setVisibleProperties] = useState<Set<string>>(new Set());
  const [hoveredKeyframe, setHoveredKeyframe] = useState<{ prop: string; idx: number } | null>(null);
  const [draggingKeyframe, setDraggingKeyframe] = useState<{ prop: string; idx: number; startY: number; startValue: number } | null>(null);

  // Height for the graph area
  const GRAPH_HEIGHT = 150;
  const PADDING_TOP = 20;
  const PADDING_BOTTOM = 20;
  // Left margin to match animation-timeline-js library default (25px)
  const LEFT_MARGIN = 25;

  // Calculate pixels per millisecond (matching timeline)
  // Timeline uses: stepPx: 50, stepVal: 100, and zoom multiplier
  // So 100ms = 50px at zoom 1, meaning 0.5px per ms at zoom 1
  const pxPerMs = 0.5 * zoom;

  // Extract curve data from keyframes
  const curveData = useMemo(() => {
    const curves: CurveData[] = [];
    const animKeyframes = keyframes
      .filter(kf => kf.animation_id === animation.id)
      .sort((a, b) => a.position - b.position);

    if (animKeyframes.length === 0) return curves;

    // Collect all properties across keyframes
    const allProperties = new Set<string>();
    animKeyframes.forEach(kf => {
      // Check typed properties
      if (kf.position_x !== null && kf.position_x !== undefined) allProperties.add('position_x');
      if (kf.position_y !== null && kf.position_y !== undefined) allProperties.add('position_y');
      if (kf.rotation !== null && kf.rotation !== undefined) allProperties.add('rotation');
      if (kf.scale_x !== null && kf.scale_x !== undefined) allProperties.add('scale_x');
      if (kf.scale_y !== null && kf.scale_y !== undefined) allProperties.add('scale_y');
      if (kf.opacity !== null && kf.opacity !== undefined) allProperties.add('opacity');
      if (kf.filter_blur !== null && kf.filter_blur !== undefined) allProperties.add('filter_blur');
      if (kf.filter_brightness !== null && kf.filter_brightness !== undefined) allProperties.add('filter_brightness');

      // Check properties object
      Object.keys(kf.properties || {}).forEach(prop => {
        const val = kf.properties[prop];
        if (typeof val === 'number') {
          allProperties.add(prop);
        }
      });
    });

    // Build curve data for each property
    allProperties.forEach(prop => {
      const kfData: CurveData['keyframes'] = [];
      let minVal = Infinity;
      let maxVal = -Infinity;

      animKeyframes.forEach(kf => {
        let value: number | null = null;

        // Get value from typed property or properties object
        if (prop === 'position_x' && kf.position_x !== null) value = kf.position_x;
        else if (prop === 'position_y' && kf.position_y !== null) value = kf.position_y;
        else if (prop === 'rotation' && kf.rotation !== null) value = kf.rotation;
        else if (prop === 'scale_x' && kf.scale_x !== null) value = kf.scale_x;
        else if (prop === 'scale_y' && kf.scale_y !== null) value = kf.scale_y;
        else if (prop === 'opacity' && kf.opacity !== null) value = kf.opacity;
        else if (prop === 'filter_blur' && kf.filter_blur !== null) value = kf.filter_blur;
        else if (prop === 'filter_brightness' && kf.filter_brightness !== null) value = kf.filter_brightness;
        else if (kf.properties && typeof kf.properties[prop] === 'number') {
          value = kf.properties[prop] as number;
        }

        if (value !== null) {
          const timeMs = animation.delay + (kf.position / 100) * animation.duration;
          kfData.push({
            time: timeMs,
            value,
            easing: kf.easing || animation.easing || 'ease',
          });
          minVal = Math.min(minVal, value);
          maxVal = Math.max(maxVal, value);
        }
      });

      if (kfData.length > 0) {
        // Add padding to value range
        const range = maxVal - minVal;
        const padding = range * 0.1 || 10;

        curves.push({
          property: prop,
          keyframes: kfData,
          minValue: minVal - padding,
          maxValue: maxVal + padding,
          visible: visibleProperties.size === 0 || visibleProperties.has(prop),
        });
      }
    });

    return curves;
  }, [animation, keyframes, visibleProperties]);

  // Initialize visible properties
  useEffect(() => {
    if (visibleProperties.size === 0 && curveData.length > 0) {
      setVisibleProperties(new Set(curveData.map(c => c.property)));
    }
  }, [curveData, visibleProperties.size]);

  // Toggle property visibility
  const toggleProperty = useCallback((prop: string) => {
    setVisibleProperties(prev => {
      const next = new Set(prev);
      if (next.has(prop)) {
        next.delete(prop);
      } else {
        next.add(prop);
      }
      return next;
    });
  }, []);

  // Sync scroll position when scrollLeft prop changes
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer && scrollLeft !== undefined) {
      scrollContainer.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  // Handle scroll and notify parent
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (onScrollChange) {
      onScrollChange(e.currentTarget.scrollLeft);
    }
  }, [onScrollChange]);

  // Draw the curves - canvas only contains the graph area (no legend)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas width includes left margin to match timeline library
    const canvasWidth = LEFT_MARGIN + phaseDuration * pxPerMs + 50;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = GRAPH_HEIGHT * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${GRAPH_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, canvasWidth, GRAPH_HEIGHT);

    // Draw grid lines
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 1;

    // Vertical grid lines (time markers) - every 500ms, offset by LEFT_MARGIN
    const gridInterval = 500;
    for (let t = 0; t <= phaseDuration; t += gridInterval) {
      const x = LEFT_MARGIN + t * pxPerMs;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GRAPH_HEIGHT);
      ctx.stroke();
    }

    // Horizontal grid lines
    const numHLines = 4;
    for (let i = 0; i <= numHLines; i++) {
      const y = PADDING_TOP + (i / numHLines) * (GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
      ctx.beginPath();
      ctx.moveTo(LEFT_MARGIN, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    // Draw zero line if applicable
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 1;

    // Get combined value range for all visible curves
    let globalMin = Infinity;
    let globalMax = -Infinity;
    curveData.filter(c => c.visible).forEach(curve => {
      globalMin = Math.min(globalMin, curve.minValue);
      globalMax = Math.max(globalMax, curve.maxValue);
    });

    if (globalMin !== Infinity && globalMax !== -Infinity) {
      const valueToY = (value: number) => {
        const normalized = (value - globalMin) / (globalMax - globalMin);
        return GRAPH_HEIGHT - PADDING_BOTTOM - normalized * (GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
      };

      // Draw zero line if in range
      if (globalMin < 0 && globalMax > 0) {
        const zeroY = valueToY(0);
        ctx.beginPath();
        ctx.moveTo(LEFT_MARGIN, zeroY);
        ctx.lineTo(canvasWidth, zeroY);
        ctx.stroke();
      }

      // Draw curves
      curveData.filter(c => c.visible).forEach(curve => {
        if (curve.keyframes.length < 2) {
          // Single keyframe - draw a horizontal line
          if (curve.keyframes.length === 1) {
            const kf = curve.keyframes[0];
            const y = valueToY(kf.value);
            ctx.strokeStyle = getPropertyColor(curve.property);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(LEFT_MARGIN, y);
            ctx.lineTo(LEFT_MARGIN + phaseDuration * pxPerMs, y);
            ctx.stroke();

            // Draw keyframe point
            const x = LEFT_MARGIN + kf.time * pxPerMs;
            ctx.fillStyle = getPropertyColor(curve.property);
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          return;
        }

        ctx.strokeStyle = getPropertyColor(curve.property);
        ctx.lineWidth = 2;
        ctx.beginPath();

        // Draw curve between keyframes
        for (let i = 0; i < curve.keyframes.length - 1; i++) {
          const kf1 = curve.keyframes[i];
          const kf2 = curve.keyframes[i + 1];

          // Sample points along the curve
          const numSamples = 50;
          for (let s = 0; s <= numSamples; s++) {
            const t = s / numSamples;
            const time = kf1.time + t * (kf2.time - kf1.time);
            const value = interpolateWithEasing(kf1.value, kf2.value, t, kf1.easing);

            const x = LEFT_MARGIN + time * pxPerMs;
            const y = valueToY(value);

            if (i === 0 && s === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();

        // Draw keyframe points
        curve.keyframes.forEach((kf, idx) => {
          const x = LEFT_MARGIN + kf.time * pxPerMs;
          const y = valueToY(kf.value);

          const isHovered = hoveredKeyframe?.prop === curve.property && hoveredKeyframe?.idx === idx;
          const isDragging = draggingKeyframe?.prop === curve.property && draggingKeyframe?.idx === idx;

          // Diamond shape for keyframes
          ctx.fillStyle = isHovered || isDragging ? '#FFFFFF' : getPropertyColor(curve.property);
          ctx.beginPath();
          const size = isHovered || isDragging ? 7 : 5;
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size, y);
          ctx.lineTo(x, y + size);
          ctx.lineTo(x - size, y);
          ctx.closePath();
          ctx.fill();

          // Stroke for visibility
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });

      // Draw playhead
      const playheadX = LEFT_MARGIN + playheadPosition * pxPerMs;
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, GRAPH_HEIGHT);
      ctx.stroke();
    }

  }, [curveData, phaseDuration, pxPerMs, playheadPosition, hoveredKeyframe, draggingKeyframe, GRAPH_HEIGHT, LEFT_MARGIN]);

  // Handle mouse events for keyframe interaction
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingKeyframe) {
      // Update keyframe value based on drag
      const curve = curveData.find(c => c.property === draggingKeyframe.prop);
      if (curve && onKeyframeUpdate) {
        const globalMin = Math.min(...curveData.filter(c => c.visible).map(c => c.minValue));
        const globalMax = Math.max(...curveData.filter(c => c.visible).map(c => c.maxValue));

        const normalized = 1 - (y - PADDING_TOP) / (GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
        const newValue = globalMin + normalized * (globalMax - globalMin);

        const kf = curve.keyframes[draggingKeyframe.idx];
        const keyframe = keyframes.find(k =>
          k.animation_id === animation.id &&
          Math.abs(animation.delay + (k.position / 100) * animation.duration - kf.time) < 1
        );

        if (keyframe) {
          onKeyframeUpdate(keyframe.id, curve.property, Math.round(newValue * 100) / 100);
        }
      }
      return;
    }

    // Check for keyframe hover
    let found: { prop: string; idx: number } | null = null;

    const globalMin = Math.min(...curveData.filter(c => c.visible).map(c => c.minValue));
    const globalMax = Math.max(...curveData.filter(c => c.visible).map(c => c.maxValue));

    curveData.filter(c => c.visible).forEach(curve => {
      curve.keyframes.forEach((kf, idx) => {
        const kfX = LEFT_MARGIN + kf.time * pxPerMs;
        const normalized = (kf.value - globalMin) / (globalMax - globalMin);
        const kfY = GRAPH_HEIGHT - PADDING_BOTTOM - normalized * (GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM);

        const dist = Math.sqrt((x - kfX) ** 2 + (y - kfY) ** 2);
        if (dist < 10) {
          found = { prop: curve.property, idx };
        }
      });
    });

    setHoveredKeyframe(found);
  }, [curveData, pxPerMs, draggingKeyframe, keyframes, animation, onKeyframeUpdate, GRAPH_HEIGHT]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredKeyframe) {
      const curve = curveData.find(c => c.property === hoveredKeyframe.prop);
      if (curve) {
        const kf = curve.keyframes[hoveredKeyframe.idx];
        setDraggingKeyframe({
          prop: hoveredKeyframe.prop,
          idx: hoveredKeyframe.idx,
          startY: e.clientY,
          startValue: kf.value,
        });
      }
    }
  }, [hoveredKeyframe, curveData]);

  const handleMouseUp = useCallback(() => {
    setDraggingKeyframe(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredKeyframe(null);
    setDraggingKeyframe(null);
  }, []);

  // Format property name for display
  const formatPropertyName = (prop: string): string => {
    return prop
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (curveData.length === 0) {
    return (
      <div className={cn("flex h-[150px]", className)}>
        {/* Left side: Empty legend area */}
        <div className="w-52 border-r border-border flex-shrink-0 bg-muted/30" />
        {/* Right side: Message */}
        <div className="flex-1 flex items-center justify-center bg-background/50 text-muted-foreground text-sm">
          No animated properties to display
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-[150px]", className)} ref={containerRef}>
      {/* Left side: Property legend - matches element list width (w-52) */}
      <div className="w-52 border-r border-border flex-shrink-0 bg-muted/30 overflow-y-auto">
        <div className="p-2 space-y-1 text-xs">
          {curveData.map(curve => (
            <button
              key={curve.property}
              onClick={() => toggleProperty(curve.property)}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-muted/50 transition-colors",
                !curve.visible && "opacity-40"
              )}
            >
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: getPropertyColor(curve.property) }}
              />
              <span className="truncate flex-1 text-left">
                {formatPropertyName(curve.property)}
              </span>
              {curve.visible ? (
                <Eye className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right side: Canvas with horizontal scroll - aligns with timeline canvas */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden bg-neutral-900"
        onScroll={handleScroll}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "block",
            hoveredKeyframe && "cursor-pointer",
            draggingKeyframe && "cursor-ns-resize"
          )}
        />
      </div>
    </div>
  );
}
