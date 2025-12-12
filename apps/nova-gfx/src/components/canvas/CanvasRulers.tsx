import { useMemo, useState, useCallback, useEffect } from 'react';

export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number; // Canvas pixel position
}

interface CanvasRulersProps {
  /** Container width in pixels */
  containerWidth: number;
  /** Container height in pixels */
  containerHeight: number;
  /** Current zoom level */
  zoom: number;
  /** Current pan X offset */
  panX: number;
  /** Current pan Y offset */
  panY: number;
  /** Array of guides */
  guides?: Guide[];
  /** Callback when a new guide is created by dragging from ruler */
  onAddGuide?: (guide: Guide) => void;
  /** Callback when a guide is moved */
  onMoveGuide?: (id: string, newPosition: number) => void;
  /** Callback when a guide is removed (dragged off canvas) */
  onRemoveGuide?: (id: string) => void;
}

const RULER_SIZE = 12; // pixels - ruler thickness (halved from 24)
const MAJOR_TICK_INTERVAL = 100; // canvas pixels between major ticks
const MINOR_TICK_INTERVAL = 10; // canvas pixels between minor ticks

/**
 * Fixed viewport rulers that display canvas pixel coordinates.
 * Rulers stay at the viewport edges and update their numbers
 * based on zoom/pan to show which canvas pixels are visible.
 * Supports dragging from rulers to create guides.
 */
export function CanvasRulers({
  containerWidth,
  containerHeight,
  zoom,
  panX,
  panY,
  guides = [],
  onAddGuide,
  onMoveGuide,
  onRemoveGuide,
}: CanvasRulersProps) {
  // Dragging state for creating new guides
  const [isDragging, setIsDragging] = useState(false);
  const [dragOrientation, setDragOrientation] = useState<'horizontal' | 'vertical' | null>(null);
  const [dragPosition, setDragPosition] = useState<number>(0);
  const [draggingGuideId, setDraggingGuideId] = useState<string | null>(null);

  // Calculate which canvas coordinates are visible at the viewport edges
  const canvasStartX = -panX / zoom;
  const canvasEndX = (containerWidth - panX) / zoom;
  const canvasStartY = -panY / zoom;
  const canvasEndY = (containerHeight - panY) / zoom;

  // Handle mouse down on ruler to start creating a guide
  const handleRulerMouseDown = useCallback((
    e: React.MouseEvent,
    orientation: 'horizontal' | 'vertical'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.closest('[data-canvas-area]')?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragOrientation(orientation);
    setDraggingGuideId(null);

    if (orientation === 'horizontal') {
      const canvasY = (e.clientY - rect.top - panY) / zoom;
      setDragPosition(canvasY);
    } else {
      const canvasX = (e.clientX - rect.left - panX) / zoom;
      setDragPosition(canvasX);
    }
  }, [panX, panY, zoom]);

  // Handle mouse down on existing guide to start dragging it
  const handleGuideMouseDown = useCallback((
    e: React.MouseEvent,
    guide: Guide
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setDragOrientation(guide.orientation);
    setDragPosition(guide.position);
    setDraggingGuideId(guide.id);
  }, []);

  // Global mouse event handlers for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragOrientation) return;

      const canvasArea = document.querySelector('[data-canvas-area]');
      if (!canvasArea) return;

      const rect = canvasArea.getBoundingClientRect();

      if (dragOrientation === 'horizontal') {
        const canvasY = (e.clientY - rect.top - panY) / zoom;
        setDragPosition(canvasY);
      } else {
        const canvasX = (e.clientX - rect.left - panX) / zoom;
        setDragPosition(canvasX);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const canvasArea = document.querySelector('[data-canvas-area]');
      if (!canvasArea || !dragOrientation) {
        setIsDragging(false);
        setDragOrientation(null);
        setDraggingGuideId(null);
        return;
      }

      const rect = canvasArea.getBoundingClientRect();
      const isInsideCanvas =
        e.clientX >= rect.left + RULER_SIZE &&
        e.clientX <= rect.right - RULER_SIZE &&
        e.clientY >= rect.top + RULER_SIZE &&
        e.clientY <= rect.bottom - RULER_SIZE;

      if (draggingGuideId) {
        // Moving an existing guide
        if (isInsideCanvas) {
          onMoveGuide?.(draggingGuideId, Math.round(dragPosition));
        } else {
          // Dragged outside - remove the guide
          onRemoveGuide?.(draggingGuideId);
        }
      } else if (isInsideCanvas) {
        // Creating a new guide
        const newGuide: Guide = {
          id: `guide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          orientation: dragOrientation,
          position: Math.round(dragPosition),
        };
        onAddGuide?.(newGuide);
      }

      setIsDragging(false);
      setDragOrientation(null);
      setDraggingGuideId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOrientation, dragPosition, draggingGuideId, panX, panY, zoom, onAddGuide, onMoveGuide, onRemoveGuide]);

  // Generate horizontal ruler ticks (top and bottom)
  const horizontalTicks = useMemo(() => {
    const ticks: { canvasPos: number; screenPos: number; isMajor: boolean; label?: string }[] = [];

    const startTick = Math.floor(canvasStartX / MINOR_TICK_INTERVAL) * MINOR_TICK_INTERVAL;
    const endTick = Math.ceil(canvasEndX / MINOR_TICK_INTERVAL) * MINOR_TICK_INTERVAL;

    for (let canvasPos = startTick; canvasPos <= endTick; canvasPos += MINOR_TICK_INTERVAL) {
      const screenPos = canvasPos * zoom + panX;
      if (screenPos >= -50 && screenPos <= containerWidth + 50) {
        const isMajor = canvasPos % MAJOR_TICK_INTERVAL === 0;
        ticks.push({
          canvasPos,
          screenPos,
          isMajor,
          label: isMajor ? String(canvasPos) : undefined,
        });
      }
    }

    return ticks;
  }, [canvasStartX, canvasEndX, zoom, panX, containerWidth]);

  // Generate vertical ruler ticks (left and right)
  const verticalTicks = useMemo(() => {
    const ticks: { canvasPos: number; screenPos: number; isMajor: boolean; label?: string }[] = [];

    const startTick = Math.floor(canvasStartY / MINOR_TICK_INTERVAL) * MINOR_TICK_INTERVAL;
    const endTick = Math.ceil(canvasEndY / MINOR_TICK_INTERVAL) * MINOR_TICK_INTERVAL;

    for (let canvasPos = startTick; canvasPos <= endTick; canvasPos += MINOR_TICK_INTERVAL) {
      const screenPos = canvasPos * zoom + panY;
      if (screenPos >= -50 && screenPos <= containerHeight + 50) {
        const isMajor = canvasPos % MAJOR_TICK_INTERVAL === 0;
        ticks.push({
          canvasPos,
          screenPos,
          isMajor,
          label: isMajor ? String(canvasPos) : undefined,
        });
      }
    }

    return ticks;
  }, [canvasStartY, canvasEndY, zoom, panY, containerHeight]);

  return (
    <>
      {/* Top Ruler - draggable to create horizontal guides */}
      <div
        className="absolute top-0 left-0 right-0 bg-neutral-900/95 border-b border-neutral-700 z-20 cursor-ns-resize"
        style={{ height: RULER_SIZE, marginLeft: RULER_SIZE, marginRight: RULER_SIZE }}
        onMouseDown={(e) => handleRulerMouseDown(e, 'horizontal')}
      >
        <svg
          width={containerWidth - RULER_SIZE * 2}
          height={RULER_SIZE}
          className="text-neutral-400 pointer-events-none"
        >
          {horizontalTicks.map((tick) => (
            <g key={`h-top-${tick.canvasPos}`}>
              <line
                x1={tick.screenPos - RULER_SIZE}
                y1={tick.isMajor ? RULER_SIZE - 8 : RULER_SIZE - 4}
                x2={tick.screenPos - RULER_SIZE}
                y2={RULER_SIZE - 1}
                stroke="currentColor"
                strokeWidth={tick.isMajor ? 1 : 0.5}
                opacity={tick.isMajor ? 0.9 : 0.4}
              />
              {tick.label && (
                <text
                  x={tick.screenPos - RULER_SIZE + 2}
                  y={7}
                  fontSize="8"
                  fill="currentColor"
                  opacity={0.8}
                >
                  {tick.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Bottom Ruler - draggable to create horizontal guides */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-neutral-900/95 border-t border-neutral-700 z-20 cursor-ns-resize"
        style={{ height: RULER_SIZE, marginLeft: RULER_SIZE, marginRight: RULER_SIZE }}
        onMouseDown={(e) => handleRulerMouseDown(e, 'horizontal')}
      >
        <svg
          width={containerWidth - RULER_SIZE * 2}
          height={RULER_SIZE}
          className="text-neutral-400 pointer-events-none"
        >
          {horizontalTicks.map((tick) => (
            <g key={`h-bottom-${tick.canvasPos}`}>
              <line
                x1={tick.screenPos - RULER_SIZE}
                y1={1}
                x2={tick.screenPos - RULER_SIZE}
                y2={tick.isMajor ? 8 : 4}
                stroke="currentColor"
                strokeWidth={tick.isMajor ? 1 : 0.5}
                opacity={tick.isMajor ? 0.9 : 0.4}
              />
              {tick.label && (
                <text
                  x={tick.screenPos - RULER_SIZE + 2}
                  y={RULER_SIZE - 2}
                  fontSize="8"
                  fill="currentColor"
                  opacity={0.8}
                >
                  {tick.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Left Ruler - draggable to create vertical guides */}
      <div
        className="absolute top-0 bottom-0 left-0 bg-neutral-900/95 border-r border-neutral-700 z-20 cursor-ew-resize"
        style={{ width: RULER_SIZE, marginTop: RULER_SIZE, marginBottom: RULER_SIZE }}
        onMouseDown={(e) => handleRulerMouseDown(e, 'vertical')}
      >
        <svg
          width={RULER_SIZE}
          height={containerHeight - RULER_SIZE * 2}
          className="text-neutral-400 pointer-events-none"
        >
          {verticalTicks.map((tick) => (
            <g key={`v-left-${tick.canvasPos}`}>
              <line
                x1={tick.isMajor ? RULER_SIZE - 8 : RULER_SIZE - 4}
                y1={tick.screenPos - RULER_SIZE}
                x2={RULER_SIZE - 1}
                y2={tick.screenPos - RULER_SIZE}
                stroke="currentColor"
                strokeWidth={tick.isMajor ? 1 : 0.5}
                opacity={tick.isMajor ? 0.9 : 0.4}
              />
              {tick.label && (
                <text
                  x={RULER_SIZE / 2}
                  y={tick.screenPos - RULER_SIZE - 2}
                  fontSize="8"
                  fill="currentColor"
                  opacity={0.8}
                  textAnchor="middle"
                  transform={`rotate(-90, ${RULER_SIZE / 2}, ${tick.screenPos - RULER_SIZE - 2})`}
                >
                  {tick.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Right Ruler - draggable to create vertical guides */}
      <div
        className="absolute top-0 bottom-0 right-0 bg-neutral-900/95 border-l border-neutral-700 z-20 cursor-ew-resize"
        style={{ width: RULER_SIZE, marginTop: RULER_SIZE, marginBottom: RULER_SIZE }}
        onMouseDown={(e) => handleRulerMouseDown(e, 'vertical')}
      >
        <svg
          width={RULER_SIZE}
          height={containerHeight - RULER_SIZE * 2}
          className="text-neutral-400 pointer-events-none"
        >
          {verticalTicks.map((tick) => (
            <g key={`v-right-${tick.canvasPos}`}>
              <line
                x1={1}
                y1={tick.screenPos - RULER_SIZE}
                x2={tick.isMajor ? 8 : 4}
                y2={tick.screenPos - RULER_SIZE}
                stroke="currentColor"
                strokeWidth={tick.isMajor ? 1 : 0.5}
                opacity={tick.isMajor ? 0.9 : 0.4}
              />
              {tick.label && (
                <text
                  x={RULER_SIZE / 2}
                  y={tick.screenPos - RULER_SIZE + 2}
                  fontSize="8"
                  fill="currentColor"
                  opacity={0.8}
                  textAnchor="middle"
                  transform={`rotate(90, ${RULER_SIZE / 2}, ${tick.screenPos - RULER_SIZE + 2})`}
                >
                  {tick.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Corner squares */}
      <div
        className="absolute top-0 left-0 bg-neutral-900/95 border-r border-b border-neutral-700 pointer-events-none z-30"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      />
      <div
        className="absolute top-0 right-0 bg-neutral-900/95 border-l border-b border-neutral-700 pointer-events-none z-30"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      />
      <div
        className="absolute bottom-0 left-0 bg-neutral-900/95 border-r border-t border-neutral-700 pointer-events-none z-30"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      />
      <div
        className="absolute bottom-0 right-0 bg-neutral-900/95 border-l border-t border-neutral-700 pointer-events-none z-30"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      />

      {/* Drag preview line */}
      {isDragging && dragOrientation && (
        <div
          className="absolute pointer-events-none z-40"
          style={
            dragOrientation === 'horizontal'
              ? {
                  left: RULER_SIZE,
                  right: RULER_SIZE,
                  top: dragPosition * zoom + panY,
                  height: 1,
                  backgroundColor: '#22d3ee',
                  boxShadow: '0 0 4px #22d3ee',
                }
              : {
                  top: RULER_SIZE,
                  bottom: RULER_SIZE,
                  left: dragPosition * zoom + panX,
                  width: 1,
                  backgroundColor: '#22d3ee',
                  boxShadow: '0 0 4px #22d3ee',
                }
          }
        />
      )}

      {/* Existing guides */}
      {guides.map((guide) => {
        const screenPos = guide.orientation === 'horizontal'
          ? guide.position * zoom + panY
          : guide.position * zoom + panX;

        // Don't render the guide being dragged (it's shown as drag preview)
        if (isDragging && draggingGuideId === guide.id) return null;

        return (
          <div
            key={guide.id}
            className="absolute z-15"
            style={
              guide.orientation === 'horizontal'
                ? {
                    left: RULER_SIZE,
                    right: RULER_SIZE,
                    top: screenPos - 2,
                    height: 5,
                    cursor: 'ns-resize',
                  }
                : {
                    top: RULER_SIZE,
                    bottom: RULER_SIZE,
                    left: screenPos - 2,
                    width: 5,
                    cursor: 'ew-resize',
                  }
            }
            onMouseDown={(e) => handleGuideMouseDown(e, guide)}
          >
            <div
              className="absolute"
              style={
                guide.orientation === 'horizontal'
                  ? {
                      left: 0,
                      right: 0,
                      top: 2,
                      height: 1,
                      backgroundColor: '#22d3ee',
                      opacity: 0.8,
                    }
                  : {
                      top: 0,
                      bottom: 0,
                      left: 2,
                      width: 1,
                      backgroundColor: '#22d3ee',
                      opacity: 0.8,
                    }
              }
            />
          </div>
        );
      })}
    </>
  );
}

export const RULER_SIZE_PX = RULER_SIZE;
