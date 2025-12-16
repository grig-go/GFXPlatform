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
  // Transform-derived properties
  translateX: '#EF4444', // red (like position_x)
  translateY: '#22C55E', // green (like position_y)
  scale: '#F59E0B',      // amber (like scale_x)
  scaleX: '#F59E0B',     // amber
  scaleY: '#8B5CF6',     // violet (like scale_y)
  rotate: '#3B82F6',     // blue (like rotation)
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

interface CurveKeyframe {
  time: number; // in ms from animation start
  value: number;
  easing: string;
  keyframeId: string; // reference to original keyframe
}

interface CurveData {
  property: string;
  keyframes: CurveKeyframe[];
  minValue: number;
  maxValue: number;
  visible: boolean;
}

// Control handle identifier
interface HandleId {
  prop: string;
  segmentIdx: number; // which segment (between keyframe i and i+1)
  handle: 'cp1' | 'cp2'; // first or second control point
}

interface CurveGraphEditorProps {
  animation: Animation;
  keyframes: Keyframe[];
  phaseDuration: number;
  zoom: number;
  playheadPosition: number;
  scrollLeft?: number;
  onKeyframeUpdate?: (keyframeId: string, property: string, value: number) => void;
  onEasingUpdate?: (keyframeId: string, easing: string) => void;
  onScrollChange?: (scrollLeft: number) => void;
  onDeletePropertyCurve?: (property: string, keyframeIds: string[]) => void;
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
  onEasingUpdate,
  onScrollChange,
  onDeletePropertyCurve,
  className,
}: CurveGraphEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleProperties, setVisibleProperties] = useState<Set<string>>(new Set());
  const [hoveredKeyframe, setHoveredKeyframe] = useState<{ prop: string; idx: number } | null>(null);
  const [draggingKeyframe, setDraggingKeyframe] = useState<{ prop: string; idx: number; startY: number; startValue: number } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<{ prop: string; segmentIdx: number } | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<HandleId | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<HandleId | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; property: string } | null>(null);

  // Height for the graph area
  const GRAPH_HEIGHT = 150;
  const PADDING_TOP = 20;
  const PADDING_BOTTOM = 20;
  // Match animation-timeline-js default leftMargin (25px)
  const LEFT_MARGIN = 25;

  // Calculate pixels per millisecond (matching timeline)
  // Timeline library formula: px = val * (stepPx / (stepVal * zoom))
  // With stepPx=50, stepVal=100: pxPerMs = 50 / (100 * zoom) = 0.5 / zoom
  const pxPerMs = 0.5 / zoom;

  console.log('[CurveGraphEditor] phaseDuration:', phaseDuration, 'animation.duration:', animation.duration, 'animation.phase:', animation.phase, 'zoom:', zoom, 'pxPerMs:', pxPerMs, 'canvasWidth:', LEFT_MARGIN + phaseDuration * pxPerMs + 50);

  // Extract curve data from keyframes
  const curveData = useMemo(() => {
    const curves: CurveData[] = [];
    const animKeyframes = keyframes
      .filter(kf => kf.animation_id === animation.id)
      .sort((a, b) => a.position - b.position);

    console.log('[CurveGraphEditor] animation.id:', animation.id, 'keyframes count:', animKeyframes.length, 'total keyframes:', keyframes.length);
    if (animKeyframes.length > 0) {
      console.log('[CurveGraphEditor] First keyframe:', JSON.stringify(animKeyframes[0]));
      console.log('[CurveGraphEditor] Properties keys:', Object.keys(animKeyframes[0].properties || {}));
      console.log('[CurveGraphEditor] Properties values:', animKeyframes[0].properties);
    }

    if (animKeyframes.length === 0) return curves;

    // Helper to normalize property names to standard format
    const normalizePropertyName = (prop: string): string => {
      const lower = prop.toLowerCase().replace(/[_-]/g, '');
      if (lower === 'opacity') return 'opacity';
      if (lower === 'positionx') return 'position_x';
      if (lower === 'positiony') return 'position_y';
      if (lower === 'scalex') return 'scale_x';
      if (lower === 'scaley') return 'scale_y';
      if (lower === 'rotation') return 'rotation';
      if (lower === 'filterblur') return 'filter_blur';
      if (lower === 'filterbrightness') return 'filter_brightness';
      return prop; // Keep original for custom properties
    };

    // Collect all properties across keyframes
    const allProperties = new Set<string>();
    // Map from normalized prop name to original prop keys in properties object
    const propKeyMap = new Map<string, string[]>();

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

      // Check properties object with case-insensitive matching
      Object.keys(kf.properties || {}).forEach(originalKey => {
        const val = kf.properties[originalKey];
        if (typeof val === 'number') {
          const normalized = normalizePropertyName(originalKey);
          allProperties.add(normalized);
          // Track original key for later lookup
          if (!propKeyMap.has(normalized)) {
            propKeyMap.set(normalized, []);
          }
          if (!propKeyMap.get(normalized)!.includes(originalKey)) {
            propKeyMap.get(normalized)!.push(originalKey);
          }
        } else if (originalKey.toLowerCase() === 'transform' && typeof val === 'string') {
          // Parse CSS transform string to extract numeric values
          const transformStr = val as string;

          // Extract translateX
          const translateXMatch = transformStr.match(/translateX\s*\(\s*(-?[\d.]+)(?:px)?\s*\)/i);
          if (translateXMatch) {
            allProperties.add('translateX');
            if (!propKeyMap.has('translateX')) propKeyMap.set('translateX', []);
          }

          // Extract translateY
          const translateYMatch = transformStr.match(/translateY\s*\(\s*(-?[\d.]+)(?:px)?\s*\)/i);
          if (translateYMatch) {
            allProperties.add('translateY');
            if (!propKeyMap.has('translateY')) propKeyMap.set('translateY', []);
          }

          // Extract translate(x, y)
          const translateMatch = transformStr.match(/translate\s*\(\s*(-?[\d.]+)(?:px)?\s*,\s*(-?[\d.]+)(?:px)?\s*\)/i);
          if (translateMatch) {
            allProperties.add('translateX');
            allProperties.add('translateY');
            if (!propKeyMap.has('translateX')) propKeyMap.set('translateX', []);
            if (!propKeyMap.has('translateY')) propKeyMap.set('translateY', []);
          }

          // Extract scale (uniform) - use lookbehind/lookahead to avoid matching scaleX/scaleY
          const scaleMatch = transformStr.match(/(?<![a-zA-Z])scale\s*\(\s*(-?[\d.]+)\s*\)(?![XY])/i);
          if (scaleMatch) {
            allProperties.add('scale');
            if (!propKeyMap.has('scale')) propKeyMap.set('scale', []);
          }

          // Extract scaleX/scaleY
          const scaleXMatch = transformStr.match(/scaleX\s*\(\s*(-?[\d.]+)\s*\)/i);
          const scaleYMatch = transformStr.match(/scaleY\s*\(\s*(-?[\d.]+)\s*\)/i);
          if (scaleXMatch) {
            allProperties.add('scaleX');
            if (!propKeyMap.has('scaleX')) propKeyMap.set('scaleX', []);
          }
          if (scaleYMatch) {
            allProperties.add('scaleY');
            if (!propKeyMap.has('scaleY')) propKeyMap.set('scaleY', []);
          }

          // Extract rotate - use lookbehind/lookahead to avoid matching rotateX/Y/Z
          const rotateMatch = transformStr.match(/(?<![a-zA-Z])rotate\s*\(\s*(-?[\d.]+)(?:deg)?\s*\)(?![XYZ])/i);
          if (rotateMatch) {
            allProperties.add('rotate');
            if (!propKeyMap.has('rotate')) propKeyMap.set('rotate', []);
          }
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
        if (prop === 'position_x' && kf.position_x != null) value = kf.position_x;
        else if (prop === 'position_y' && kf.position_y != null) value = kf.position_y;
        else if (prop === 'rotation' && kf.rotation != null) value = kf.rotation;
        else if (prop === 'scale_x' && kf.scale_x != null) value = kf.scale_x;
        else if (prop === 'scale_y' && kf.scale_y != null) value = kf.scale_y;
        else if (prop === 'opacity' && kf.opacity != null) value = kf.opacity;
        else if (prop === 'filter_blur' && kf.filter_blur != null) value = kf.filter_blur;
        else if (prop === 'filter_brightness' && kf.filter_brightness != null) value = kf.filter_brightness;
        else if (kf.properties) {
          // Try direct property lookup first
          if (typeof kf.properties[prop] === 'number') {
            value = kf.properties[prop] as number;
          } else {
            // Try case-insensitive lookup using our propKeyMap
            const originalKeys = propKeyMap.get(prop);
            if (originalKeys) {
              for (const key of originalKeys) {
                if (typeof kf.properties[key] === 'number') {
                  value = kf.properties[key] as number;
                  break;
                }
              }
            }
          }

          // If still no value, try extracting from transform string
          if (value === null && kf.properties.transform && typeof kf.properties.transform === 'string') {
            const transformStr = kf.properties.transform;

            if (prop === 'translateX') {
              // Try translateX(value) first
              let match = transformStr.match(/translateX\s*\(\s*(-?[\d.]+)(?:px)?\s*\)/i);
              if (match) {
                value = parseFloat(match[1]);
              } else {
                // Try translate(x, y)
                match = transformStr.match(/translate\s*\(\s*(-?[\d.]+)(?:px)?\s*,\s*(-?[\d.]+)(?:px)?\s*\)/i);
                if (match) value = parseFloat(match[1]);
              }
            } else if (prop === 'translateY') {
              // Try translateY(value) first
              let match = transformStr.match(/translateY\s*\(\s*(-?[\d.]+)(?:px)?\s*\)/i);
              if (match) {
                value = parseFloat(match[1]);
              } else {
                // Try translate(x, y)
                match = transformStr.match(/translate\s*\(\s*(-?[\d.]+)(?:px)?\s*,\s*(-?[\d.]+)(?:px)?\s*\)/i);
                if (match) value = parseFloat(match[2]);
              }
            } else if (prop === 'scale') {
              // Use lookbehind/lookahead to avoid matching scaleX/scaleY
              const match = transformStr.match(/(?<![a-zA-Z])scale\s*\(\s*(-?[\d.]+)\s*\)(?![XY])/i);
              if (match) value = parseFloat(match[1]);
            } else if (prop === 'scaleX') {
              const match = transformStr.match(/scaleX\s*\(\s*(-?[\d.]+)\s*\)/i);
              if (match) value = parseFloat(match[1]);
            } else if (prop === 'scaleY') {
              const match = transformStr.match(/scaleY\s*\(\s*(-?[\d.]+)\s*\)/i);
              if (match) value = parseFloat(match[1]);
            } else if (prop === 'rotate') {
              // Use lookbehind/lookahead to avoid matching rotateX/Y/Z
              const match = transformStr.match(/(?<![a-zA-Z])rotate\s*\(\s*(-?[\d.]+)(?:deg)?\s*\)(?![XYZ])/i);
              if (match) value = parseFloat(match[1]);
            }
          }
        }

        if (value !== null) {
          // Calculate keyframe time position on the timeline
          // Keyframe position is stored as milliseconds relative to animation start
          // Add animation delay to get absolute timeline position
          const timeMs = animation.delay + kf.position;
          kfData.push({
            time: timeMs,
            value,
            easing: kf.easing || animation.easing || 'ease',
            keyframeId: kf.id,
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
          visible: true, // All properties visible by default, toggle via visibleProperties state
        });
      }
    });

    console.log('[CurveGraphEditor] All properties found:', Array.from(allProperties));
    console.log('[CurveGraphEditor] Curves generated:', curves.length, curves.map(c => c.property), 'phaseDuration:', phaseDuration);

    return curves;
  }, [animation, keyframes, phaseDuration]);

  // Initialize visible properties - always show all properties by default
  // Reset when animation changes to ensure new properties are visible
  useEffect(() => {
    if (curveData.length > 0) {
      // Always set all properties visible when curveData changes
      setVisibleProperties(new Set(curveData.map(c => c.property)));
    }
  }, [animation.id, curveData]); // Reset when animation or curves change

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

  // Handle right-click context menu on property
  const handlePropertyContextMenu = useCallback((e: React.MouseEvent, prop: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, property: prop });
  }, []);

  // Handle delete property curve
  const handleDeletePropertyCurve = useCallback(() => {
    if (!contextMenu || !onDeletePropertyCurve) return;

    const curve = curveData.find(c => c.property === contextMenu.property);
    if (curve) {
      const keyframeIds = curve.keyframes.map(kf => kf.keyframeId);
      onDeletePropertyCurve(contextMenu.property, keyframeIds);
    }
    setContextMenu(null);
  }, [contextMenu, curveData, onDeletePropertyCurve]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

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

    // Clear canvas - use same background as timeline (neutral-900 = #171717)
    ctx.fillStyle = '#171717';
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
    // Filter curves by visibleProperties state (empty means show all)
    const getVisibleCurves = () => curveData.filter(c =>
      visibleProperties.size === 0 || visibleProperties.has(c.property)
    );

    getVisibleCurves().forEach(curve => {
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
      getVisibleCurves().forEach(curve => {
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

        // Draw bezier control handles for selected segment
        for (let i = 0; i < curve.keyframes.length - 1; i++) {
          const isSelected = selectedSegment?.prop === curve.property && selectedSegment?.segmentIdx === i;
          if (!isSelected) continue;

          const kf1 = curve.keyframes[i];
          const kf2 = curve.keyframes[i + 1];

          const x1 = LEFT_MARGIN + kf1.time * pxPerMs;
          const y1 = valueToY(kf1.value);
          const x2 = LEFT_MARGIN + kf2.time * pxPerMs;
          const y2 = valueToY(kf2.value);

          // Get bezier control points from easing
          const [cp1x, cp1y, cp2x, cp2y] = parseEasing(kf1.easing);

          // Convert normalized bezier control points to canvas coordinates
          // Control points are relative to the segment
          const segmentWidth = x2 - x1;
          const segmentHeight = y1 - y2; // Inverted because canvas Y is flipped

          const handle1X = x1 + cp1x * segmentWidth;
          const handle1Y = y1 - cp1y * segmentHeight;
          const handle2X = x1 + cp2x * segmentWidth;
          const handle2Y = y1 - cp2y * segmentHeight;

          // Draw control lines
          ctx.strokeStyle = '#8B5CF6'; // violet-500
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(handle1X, handle1Y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(handle2X, handle2Y);
          ctx.stroke();

          ctx.setLineDash([]);

          // Draw control point handles
          const isHover1 = hoveredHandle?.prop === curve.property &&
                          hoveredHandle?.segmentIdx === i &&
                          hoveredHandle?.handle === 'cp1';
          const isHover2 = hoveredHandle?.prop === curve.property &&
                          hoveredHandle?.segmentIdx === i &&
                          hoveredHandle?.handle === 'cp2';
          const isDrag1 = draggingHandle?.prop === curve.property &&
                         draggingHandle?.segmentIdx === i &&
                         draggingHandle?.handle === 'cp1';
          const isDrag2 = draggingHandle?.prop === curve.property &&
                         draggingHandle?.segmentIdx === i &&
                         draggingHandle?.handle === 'cp2';

          // Handle 1 (from start keyframe)
          ctx.fillStyle = isHover1 || isDrag1 ? '#FFFFFF' : '#8B5CF6';
          ctx.beginPath();
          ctx.arc(handle1X, handle1Y, isHover1 || isDrag1 ? 7 : 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Handle 2 (from end keyframe)
          ctx.fillStyle = isHover2 || isDrag2 ? '#FFFFFF' : '#8B5CF6';
          ctx.beginPath();
          ctx.arc(handle2X, handle2Y, isHover2 || isDrag2 ? 7 : 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

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

  }, [curveData, phaseDuration, pxPerMs, playheadPosition, hoveredKeyframe, draggingKeyframe, selectedSegment, hoveredHandle, draggingHandle, visibleProperties, GRAPH_HEIGHT, LEFT_MARGIN]);

  // Helper to get handle positions for a segment
  const getHandlePositions = useCallback((curve: CurveData, segmentIdx: number) => {
    const visibleCurves = curveData.filter(c =>
      visibleProperties.size === 0 || visibleProperties.has(c.property)
    );
    const globalMin = Math.min(...visibleCurves.map(c => c.minValue));
    const globalMax = Math.max(...visibleCurves.map(c => c.maxValue));

    const valueToY = (value: number) => {
      const normalized = (value - globalMin) / (globalMax - globalMin);
      return GRAPH_HEIGHT - PADDING_BOTTOM - normalized * (GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
    };

    const kf1 = curve.keyframes[segmentIdx];
    const kf2 = curve.keyframes[segmentIdx + 1];

    const x1 = LEFT_MARGIN + kf1.time * pxPerMs;
    const y1 = valueToY(kf1.value);
    const x2 = LEFT_MARGIN + kf2.time * pxPerMs;
    const y2 = valueToY(kf2.value);

    const [cp1x, cp1y, cp2x, cp2y] = parseEasing(kf1.easing);

    const segmentWidth = x2 - x1;
    const segmentHeight = y1 - y2;

    return {
      x1, y1, x2, y2,
      handle1X: x1 + cp1x * segmentWidth,
      handle1Y: y1 - cp1y * segmentHeight,
      handle2X: x1 + cp2x * segmentWidth,
      handle2Y: y1 - cp2y * segmentHeight,
      segmentWidth,
      segmentHeight,
    };
  }, [curveData, pxPerMs, visibleProperties, GRAPH_HEIGHT]);

  // Handle mouse events for keyframe and handle interaction
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const visibleCurves = curveData.filter(c =>
      visibleProperties.size === 0 || visibleProperties.has(c.property)
    );
    const globalMin = Math.min(...visibleCurves.map(c => c.minValue));
    const globalMax = Math.max(...visibleCurves.map(c => c.maxValue));

    const valueToY = (value: number) => {
      const normalized = (value - globalMin) / (globalMax - globalMin);
      return GRAPH_HEIGHT - PADDING_BOTTOM - normalized * (GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
    };

    // Handle dragging control points
    if (draggingHandle && onEasingUpdate) {
      const curve = curveData.find(c => c.property === draggingHandle.prop);
      if (curve && curve.keyframes[draggingHandle.segmentIdx]) {
        const kf1 = curve.keyframes[draggingHandle.segmentIdx];
        const kf2 = curve.keyframes[draggingHandle.segmentIdx + 1];

        const x1 = LEFT_MARGIN + kf1.time * pxPerMs;
        const y1 = valueToY(kf1.value);
        const x2 = LEFT_MARGIN + kf2.time * pxPerMs;
        const y2 = valueToY(kf2.value);

        const segmentWidth = x2 - x1;
        const segmentHeight = y1 - y2;

        // Get current easing control points
        const [cp1x, cp1y, cp2x, cp2y] = parseEasing(kf1.easing);

        let newCp1x = cp1x;
        let newCp1y = cp1y;
        let newCp2x = cp2x;
        let newCp2y = cp2y;

        if (draggingHandle.handle === 'cp1') {
          // Update control point 1
          newCp1x = Math.max(0, Math.min(1, (x - x1) / segmentWidth));
          newCp1y = segmentHeight !== 0 ? (y1 - y) / segmentHeight : 0;
        } else {
          // Update control point 2
          newCp2x = Math.max(0, Math.min(1, (x - x1) / segmentWidth));
          newCp2y = segmentHeight !== 0 ? (y1 - y) / segmentHeight : 0;
        }

        // Round to 2 decimal places
        newCp1x = Math.round(newCp1x * 100) / 100;
        newCp1y = Math.round(newCp1y * 100) / 100;
        newCp2x = Math.round(newCp2x * 100) / 100;
        newCp2y = Math.round(newCp2y * 100) / 100;

        const newEasing = `cubic-bezier(${newCp1x}, ${newCp1y}, ${newCp2x}, ${newCp2y})`;
        onEasingUpdate(kf1.keyframeId, newEasing);
      }
      return;
    }

    // Handle dragging keyframes
    if (draggingKeyframe) {
      const curve = curveData.find(c => c.property === draggingKeyframe.prop);
      console.log('[CurveGraphEditor] Dragging keyframe:', {
        prop: draggingKeyframe.prop,
        idx: draggingKeyframe.idx,
        curveFound: !!curve,
        curveDataProps: curveData.map(c => c.property),
      });
      if (curve && onKeyframeUpdate) {
        const normalized = 1 - (y - PADDING_TOP) / (GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
        const newValue = globalMin + normalized * (globalMax - globalMin);

        const kf = curve.keyframes[draggingKeyframe.idx];
        console.log('[CurveGraphEditor] Calling onKeyframeUpdate:', {
          keyframeId: kf.keyframeId,
          property: curve.property,
          newValue: Math.round(newValue * 100) / 100,
        });
        onKeyframeUpdate(kf.keyframeId, curve.property, Math.round(newValue * 100) / 100);
      } else {
        console.log('[CurveGraphEditor] Cannot update - curve:', !!curve, 'onKeyframeUpdate:', !!onKeyframeUpdate);
      }
      return;
    }

    // Check for control handle hover (only if a segment is selected)
    let foundHandle: HandleId | null = null;
    if (selectedSegment) {
      const curve = curveData.find(c => c.property === selectedSegment.prop);
      if (curve && curve.keyframes.length > selectedSegment.segmentIdx + 1) {
        const handles = getHandlePositions(curve, selectedSegment.segmentIdx);

        const dist1 = Math.sqrt((x - handles.handle1X) ** 2 + (y - handles.handle1Y) ** 2);
        const dist2 = Math.sqrt((x - handles.handle2X) ** 2 + (y - handles.handle2Y) ** 2);

        if (dist1 < 10) {
          foundHandle = { prop: curve.property, segmentIdx: selectedSegment.segmentIdx, handle: 'cp1' };
        } else if (dist2 < 10) {
          foundHandle = { prop: curve.property, segmentIdx: selectedSegment.segmentIdx, handle: 'cp2' };
        }
      }
    }
    setHoveredHandle(foundHandle);

    // Check for keyframe hover
    let foundKeyframe: { prop: string; idx: number } | null = null;

    visibleCurves.forEach(curve => {
      curve.keyframes.forEach((kf, idx) => {
        const kfX = LEFT_MARGIN + kf.time * pxPerMs;
        const kfY = valueToY(kf.value);

        const dist = Math.sqrt((x - kfX) ** 2 + (y - kfY) ** 2);
        if (dist < 10) {
          foundKeyframe = { prop: curve.property, idx };
        }
      });
    });

    setHoveredKeyframe(foundKeyframe);
  }, [curveData, pxPerMs, draggingKeyframe, draggingHandle, selectedSegment, onKeyframeUpdate, onEasingUpdate, getHandlePositions, visibleProperties, GRAPH_HEIGHT]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Priority: handle > keyframe > curve segment
    if (hoveredHandle) {
      setDraggingHandle(hoveredHandle);
      return;
    }

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

        // Select the segment starting from this keyframe (if not the last keyframe)
        if (hoveredKeyframe.idx < curve.keyframes.length - 1) {
          setSelectedSegment({ prop: curve.property, segmentIdx: hoveredKeyframe.idx });
        } else if (hoveredKeyframe.idx > 0) {
          // If it's the last keyframe, select the previous segment
          setSelectedSegment({ prop: curve.property, segmentIdx: hoveredKeyframe.idx - 1 });
        }
      }
      return;
    }

    // Check if clicking on a curve segment to select it
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const visibleCurves = curveData.filter(c =>
      visibleProperties.size === 0 || visibleProperties.has(c.property)
    );
    const globalMin = Math.min(...visibleCurves.map(c => c.minValue));
    const globalMax = Math.max(...visibleCurves.map(c => c.maxValue));

    const valueToY = (value: number) => {
      const normalized = (value - globalMin) / (globalMax - globalMin);
      return GRAPH_HEIGHT - PADDING_BOTTOM - normalized * (GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
    };

    // Check if click is near any curve segment
    let foundSegment: { prop: string; segmentIdx: number } | null = null;

    visibleCurves.forEach(curve => {
      for (let i = 0; i < curve.keyframes.length - 1; i++) {
        const kf1 = curve.keyframes[i];
        const kf2 = curve.keyframes[i + 1];

        // Sample points along the curve and check distance
        for (let s = 0; s <= 20; s++) {
          const t = s / 20;
          const time = kf1.time + t * (kf2.time - kf1.time);
          const value = interpolateWithEasing(kf1.value, kf2.value, t, kf1.easing);

          const curveX = LEFT_MARGIN + time * pxPerMs;
          const curveY = valueToY(value);

          const dist = Math.sqrt((x - curveX) ** 2 + (y - curveY) ** 2);
          if (dist < 8) {
            foundSegment = { prop: curve.property, segmentIdx: i };
            break;
          }
        }
        if (foundSegment) break;
      }
    });

    if (foundSegment) {
      setSelectedSegment(foundSegment);
    } else {
      // Click on empty area - deselect
      setSelectedSegment(null);
    }
  }, [hoveredKeyframe, hoveredHandle, curveData, pxPerMs, visibleProperties, GRAPH_HEIGHT]);

  const handleMouseUp = useCallback(() => {
    setDraggingKeyframe(null);
    setDraggingHandle(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredKeyframe(null);
    setHoveredHandle(null);
    setDraggingKeyframe(null);
    setDraggingHandle(null);
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
              onContextMenu={(e) => handlePropertyContextMenu(e, curve.property)}
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
              {visibleProperties.size === 0 || visibleProperties.has(curve.property) ? (
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
            (hoveredKeyframe || hoveredHandle) && "cursor-pointer",
            (draggingKeyframe || draggingHandle) && "cursor-grabbing"
          )}
        />
      </div>

      {/* Context menu for property curves */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] bg-popover border border-border rounded-md shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
            onClick={handleDeletePropertyCurve}
            disabled={!onDeletePropertyCurve}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete "{formatPropertyName(contextMenu.property)}" curve
          </button>
        </div>
      )}
    </div>
  );
}
