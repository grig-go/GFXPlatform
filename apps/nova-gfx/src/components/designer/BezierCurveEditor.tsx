import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
// @ts-ignore - bezier-js doesn't have type declarations
import { Bezier } from 'bezier-js';
import { Button, cn } from '@emergent-platform/ui';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface BezierPoint {
  x: number;
  y: number;
}

// Standard CSS easing presets
export const EASING_PRESETS = {
  'linear': { name: 'Linear', points: [0, 0, 1, 1] },
  'ease': { name: 'Ease', points: [0.25, 0.1, 0.25, 1] },
  'ease-in': { name: 'Ease In', points: [0.42, 0, 1, 1] },
  'ease-out': { name: 'Ease Out', points: [0.0, 0, 0.58, 1] },
  'ease-in-out': { name: 'Ease In Out', points: [0.42, 0, 0.58, 1] },
  'ease-in-quad': { name: 'Ease In Quad', points: [0.55, 0.085, 0.68, 0.53] },
  'ease-out-quad': { name: 'Ease Out Quad', points: [0.25, 0.46, 0.45, 0.94] },
  'ease-in-out-quad': { name: 'Ease In Out Quad', points: [0.455, 0.03, 0.515, 0.955] },
  'ease-in-cubic': { name: 'Ease In Cubic', points: [0.55, 0.055, 0.675, 0.19] },
  'ease-out-cubic': { name: 'Ease Out Cubic', points: [0.215, 0.61, 0.355, 1] },
  'ease-in-out-cubic': { name: 'Ease In Out Cubic', points: [0.645, 0.045, 0.355, 1] },
  'ease-in-back': { name: 'Ease In Back', points: [0.6, -0.28, 0.735, 0.045] },
  'ease-out-back': { name: 'Ease Out Back', points: [0.175, 0.885, 0.32, 1.275] },
  'ease-in-out-back': { name: 'Ease In Out Back', points: [0.68, -0.55, 0.265, 1.55] },
} as const;

export type EasingPresetKey = keyof typeof EASING_PRESETS;

// Parse cubic-bezier string to control points
export function parseEasing(easing: string): [number, number, number, number] {
  // Check if it's a preset name
  if (easing in EASING_PRESETS) {
    return EASING_PRESETS[easing as EasingPresetKey].points as [number, number, number, number];
  }

  // Parse cubic-bezier(x1, y1, x2, y2) format
  const match = easing.match(/cubic-bezier\(\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*\)/);
  if (match) {
    return [
      parseFloat(match[1]),
      parseFloat(match[2]),
      parseFloat(match[3]),
      parseFloat(match[4]),
    ];
  }

  // Default to ease
  return EASING_PRESETS['ease'].points as [number, number, number, number];
}

// Convert control points to cubic-bezier string
export function toEasingString(points: [number, number, number, number]): string {
  // Check if it matches a preset
  for (const [key, preset] of Object.entries(EASING_PRESETS)) {
    const [p1, p2, p3, p4] = preset.points;
    if (
      Math.abs(points[0] - p1) < 0.001 &&
      Math.abs(points[1] - p2) < 0.001 &&
      Math.abs(points[2] - p3) < 0.001 &&
      Math.abs(points[3] - p4) < 0.001
    ) {
      return key;
    }
  }
  return `cubic-bezier(${points[0].toFixed(3)}, ${points[1].toFixed(3)}, ${points[2].toFixed(3)}, ${points[3].toFixed(3)})`;
}

interface BezierCurveEditorProps {
  easing: string;
  onChange: (easing: string) => void;
  width?: number;
  height?: number;
  className?: string;
  showPresets?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  label?: string;
}

export function BezierCurveEditor({
  easing,
  onChange,
  width = 200,
  height = 200,
  className,
  showPresets = true,
  collapsed = false,
  onToggleCollapse,
  label = 'Easing Curve',
}: BezierCurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState<'p1' | 'p2' | null>(null);
  const [controlPoints, setControlPoints] = useState<[number, number, number, number]>(() =>
    parseEasing(easing)
  );

  // Padding for the canvas to allow control points outside 0-1 range
  const padding = 30;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  // Update control points when easing prop changes
  useEffect(() => {
    setControlPoints(parseEasing(easing));
  }, [easing]);

  // Create Bezier curve
  const bezierCurve = useMemo(() => {
    return new Bezier(
      0, 0,
      controlPoints[0], controlPoints[1],
      controlPoints[2], controlPoints[3],
      1, 1
    );
  }, [controlPoints]);

  // Convert normalized coords (0-1) to canvas coords
  const toCanvas = useCallback((x: number, y: number) => ({
    x: padding + x * graphWidth,
    y: height - padding - y * graphHeight, // Flip Y axis
  }), [graphWidth, graphHeight, padding, height]);

  // Convert canvas coords to normalized coords
  const fromCanvas = useCallback((canvasX: number, canvasY: number) => ({
    x: (canvasX - padding) / graphWidth,
    y: (height - padding - canvasY) / graphHeight,
  }), [graphWidth, graphHeight, padding, height]);

  // Draw the curve
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 0; i <= 4; i++) {
      const x = padding + (i / 4) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i / 4) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw diagonal reference line (linear)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const start = toCanvas(0, 0);
    const end = toCanvas(1, 1);
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw control handles
    const p0 = toCanvas(0, 0);
    const p1 = toCanvas(controlPoints[0], controlPoints[1]);
    const p2 = toCanvas(controlPoints[2], controlPoints[3]);
    const p3 = toCanvas(1, 1);

    // Handle lines
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)'; // violet-500
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Draw the bezier curve
    ctx.strokeStyle = '#8B5CF6'; // violet-500
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Sample the curve at many points
    const lut: BezierPoint[] = bezierCurve.getLUT(100);
    lut.forEach((point: BezierPoint, i: number) => {
      const canvasPoint = toCanvas(point.x, point.y);
      if (i === 0) {
        ctx.moveTo(canvasPoint.x, canvasPoint.y);
      } else {
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
      }
    });
    ctx.stroke();

    // Draw control points
    // P1 (first control point)
    ctx.fillStyle = isDragging === 'p1' ? '#A78BFA' : '#8B5CF6';
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // P2 (second control point)
    ctx.fillStyle = isDragging === 'p2' ? '#A78BFA' : '#8B5CF6';
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw anchor points (start and end)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p3.x, p3.y, 4, 0, Math.PI * 2);
    ctx.fill();

  }, [width, height, controlPoints, bezierCurve, toCanvas, isDragging, graphWidth, graphHeight, padding]);

  // Draw on mount and when deps change
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle mouse interactions
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const p1 = toCanvas(controlPoints[0], controlPoints[1]);
    const p2 = toCanvas(controlPoints[2], controlPoints[3]);

    const distToP1 = Math.hypot(x - p1.x, y - p1.y);
    const distToP2 = Math.hypot(x - p2.x, y - p2.y);

    if (distToP1 < 12) {
      setIsDragging('p1');
    } else if (distToP2 < 12) {
      setIsDragging('p2');
    }
  }, [controlPoints, toCanvas]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const { x, y } = fromCanvas(canvasX, canvasY);

    // Clamp x to 0-1, allow y to go beyond for overshoot effects
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(-0.5, Math.min(1.5, y));

    setControlPoints(prev => {
      const newPoints: [number, number, number, number] = [...prev];
      if (isDragging === 'p1') {
        newPoints[0] = clampedX;
        newPoints[1] = clampedY;
      } else if (isDragging === 'p2') {
        newPoints[2] = clampedX;
        newPoints[3] = clampedY;
      }
      return newPoints;
    });
  }, [isDragging, fromCanvas]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      // Emit the change
      onChange(toEasingString(controlPoints));
    }
    setIsDragging(null);
  }, [isDragging, controlPoints, onChange]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      onChange(toEasingString(controlPoints));
      setIsDragging(null);
    }
  }, [isDragging, controlPoints, onChange]);

  const handlePresetClick = useCallback((presetKey: EasingPresetKey) => {
    const preset = EASING_PRESETS[presetKey];
    setControlPoints(preset.points as [number, number, number, number]);
    onChange(presetKey);
  }, [onChange]);

  const handleReset = useCallback(() => {
    setControlPoints(EASING_PRESETS['ease'].points as [number, number, number, number]);
    onChange('ease');
  }, [onChange]);

  // Get current preset name if it matches one
  const currentPresetName = useMemo(() => {
    for (const [_key, preset] of Object.entries(EASING_PRESETS)) {
      const [p1, p2, p3, p4] = preset.points;
      if (
        Math.abs(controlPoints[0] - p1) < 0.01 &&
        Math.abs(controlPoints[1] - p2) < 0.01 &&
        Math.abs(controlPoints[2] - p3) < 0.01 &&
        Math.abs(controlPoints[3] - p4) < 0.01
      ) {
        return preset.name;
      }
    }
    return 'Custom';
  }, [controlPoints]);

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 text-xs bg-muted/30 hover:bg-muted/50 border-t border-border transition-colors',
          className
        )}
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <ChevronDown className="w-3 h-3" />
          <span>{label}</span>
        </span>
        <span className="text-violet-400 font-medium">{currentPresetName}</span>
      </button>
    );
  }

  return (
    <div className={cn('bg-muted/20 border-t border-border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronUp className="w-3 h-3" />
          <span>{label}</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-violet-400 font-medium">{currentPresetName}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={handleReset}
            title="Reset to default"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Canvas */}
        <div className="p-2">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="cursor-crosshair rounded"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
        </div>

        {/* Presets */}
        {showPresets && (
          <div className="flex-1 p-2 border-l border-border/50 overflow-y-auto max-h-[200px]">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Presets</div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(EASING_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handlePresetClick(key as EasingPresetKey)}
                  className={cn(
                    'px-2 py-1 text-[10px] rounded transition-colors text-left truncate',
                    currentPresetName === preset.name
                      ? 'bg-violet-500/30 text-violet-300'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Control point values */}
      <div className="px-3 py-2 border-t border-border/50 text-[10px] text-muted-foreground font-mono">
        cubic-bezier({controlPoints[0].toFixed(2)}, {controlPoints[1].toFixed(2)}, {controlPoints[2].toFixed(2)}, {controlPoints[3].toFixed(2)})
      </div>
    </div>
  );
}

// Mini version for inline use (e.g., in properties panel)
export function BezierCurvePreview({
  easing,
  size = 40,
  className,
}: {
  easing: string;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlPoints = useMemo(() => parseEasing(easing), [easing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 4;
    const graphSize = size - padding * 2;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.fillRect(0, 0, size, size);

    // Create bezier curve
    const bezier = new Bezier(
      0, 0,
      controlPoints[0], controlPoints[1],
      controlPoints[2], controlPoints[3],
      1, 1
    );

    // Draw curve
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const lut: BezierPoint[] = bezier.getLUT(50);
    lut.forEach((point: BezierPoint, i: number) => {
      const x = padding + point.x * graphSize;
      const y = size - padding - point.y * graphSize;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

  }, [controlPoints, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={cn('rounded', className)}
    />
  );
}
