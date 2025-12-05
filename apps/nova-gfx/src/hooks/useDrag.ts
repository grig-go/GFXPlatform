import { useState, useCallback, useEffect, useRef } from 'react';
import { useDesignerStore } from '@/stores/designerStore';

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  elementStartPositions: Map<string, { x: number; y: number }>;
}

export function useDrag() {
  const {
    selectedElementIds,
    elements,
    updateElement,
    zoom,
    panX,
    panY,
    tool,
    pushHistory,
  } = useDesignerStore();

  const [dragState, setDragState] = useState<DragState | null>(null);
  const hasMovedRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      if (tool !== 'select') return;
      if (e.button !== 0) return; // Left click only

      e.stopPropagation();
      e.preventDefault();

      // Store starting positions for all selected elements
      const startPositions = new Map<string, { x: number; y: number }>();
      const idsToMove = selectedElementIds.includes(elementId)
        ? selectedElementIds
        : [elementId];

      idsToMove.forEach((id) => {
        const el = elements.find((e) => e.id === id);
        if (el) {
          startPositions.set(id, { x: el.position_x, y: el.position_y });
        }
      });

      setDragState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        elementStartPositions: startPositions,
      });
      hasMovedRef.current = false;
    },
    [selectedElementIds, elements, tool]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState?.isDragging) return;

      const deltaX = (e.clientX - dragState.startX) / zoom;
      const deltaY = (e.clientY - dragState.startY) / zoom;

      // Only start moving after a small threshold to avoid accidental moves
      if (!hasMovedRef.current && Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) {
        return;
      }
      hasMovedRef.current = true;

      // Update all dragged elements
      dragState.elementStartPositions.forEach((startPos, id) => {
        updateElement(id, {
          position_x: startPos.x + deltaX,
          position_y: startPos.y + deltaY,
        });
      });

      setDragState((prev) =>
        prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null
      );
    },
    [dragState, zoom, updateElement]
  );

  const handleMouseUp = useCallback(() => {
    if (dragState?.isDragging && hasMovedRef.current) {
      pushHistory('Move elements');
    }
    setDragState(null);
    hasMovedRef.current = false;
  }, [dragState, pushHistory]);

  // Add global mouse event listeners
  useEffect(() => {
    if (dragState?.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState?.isDragging, handleMouseMove, handleMouseUp]);

  return {
    isDragging: dragState?.isDragging ?? false,
    handleMouseDown,
  };
}

