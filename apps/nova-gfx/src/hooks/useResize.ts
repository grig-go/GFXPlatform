import { useState, useCallback, useEffect, useRef } from 'react';
import { useDesignerStore } from '@/stores/designerStore';

export type ResizeHandle =
  | 'n' | 's' | 'e' | 'w'
  | 'ne' | 'nw' | 'se' | 'sw';

interface ChildSnapshot {
  id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
}

interface ResizeState {
  isResizing: boolean;
  handle: ResizeHandle;
  elementId: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startPosX: number;
  startPosY: number;
  aspectRatio: number | null; // Native aspect ratio if locked
  isGroup: boolean;
  childSnapshots: ChildSnapshot[]; // Snapshot of children at resize start
}

export function useResize() {
  const { elements, updateElement, zoom, pushHistory } = useDesignerStore();
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const hasResizedRef = useRef(false);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, elementId: string, handle: ResizeHandle) => {
      e.stopPropagation();
      e.preventDefault();

      const element = elements.find((el) => el.id === elementId);
      if (!element) return;

      // Check if aspect ratio is locked (for images)
      let aspectRatio: number | null = null;
      if (element.content.type === 'image' && element.content.aspectRatioLocked) {
        aspectRatio = element.content.nativeAspectRatio ||
          (element.width && element.height ? element.width / element.height : null);
      }

      // Check if this is a group and capture children snapshots
      const isGroup = element.element_type === 'group';
      const childSnapshots: ChildSnapshot[] = [];

      if (isGroup) {
        // Get all direct children of this group
        const children = elements.filter(el => el.parent_element_id === elementId);
        children.forEach(child => {
          childSnapshots.push({
            id: child.id,
            position_x: child.position_x,
            position_y: child.position_y,
            width: child.width ?? 100,
            height: child.height ?? 100,
          });
        });
      }

      setResizeState({
        isResizing: true,
        handle,
        elementId,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: element.width ?? 100,
        startHeight: element.height ?? 100,
        startPosX: element.position_x,
        startPosY: element.position_y,
        aspectRatio,
        isGroup,
        childSnapshots,
      });
      hasResizedRef.current = false;
    },
    [elements]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizeState?.isResizing) return;

      const deltaX = (e.clientX - resizeState.startX) / zoom;
      const deltaY = (e.clientY - resizeState.startY) / zoom;

      hasResizedRef.current = true;

      let newWidth = resizeState.startWidth;
      let newHeight = resizeState.startHeight;
      let newX = resizeState.startPosX;
      let newY = resizeState.startPosY;

      const handle = resizeState.handle;
      const aspectRatio = resizeState.aspectRatio;
      const isCorner = handle.length === 2; // 'ne', 'nw', 'se', 'sw'

      // If aspect ratio is locked, handle resizing differently
      if (aspectRatio !== null) {
        if (isCorner) {
          // For corners, use the larger delta to determine the resize
          const absDeltaX = Math.abs(deltaX);
          const absDeltaY = Math.abs(deltaY);
          
          if (absDeltaX > absDeltaY) {
            // Use width as the primary dimension
            if (handle.includes('e')) {
              newWidth = Math.max(20, resizeState.startWidth + deltaX);
            } else if (handle.includes('w')) {
              newWidth = Math.max(20, resizeState.startWidth - deltaX);
            }
            newHeight = newWidth / aspectRatio;
          } else {
            // Use height as the primary dimension
            if (handle.includes('s')) {
              newHeight = Math.max(20, resizeState.startHeight + deltaY);
            } else if (handle.includes('n')) {
              newHeight = Math.max(20, resizeState.startHeight - deltaY);
            }
            newWidth = newHeight * aspectRatio;
          }

          // Ensure minimum sizes
          if (newWidth < 20) {
            newWidth = 20;
            newHeight = 20 / aspectRatio;
          }
          if (newHeight < 20) {
            newHeight = 20;
            newWidth = 20 * aspectRatio;
          }

          // Adjust position for handles that affect position
          if (handle.includes('w')) {
            newX = resizeState.startPosX + (resizeState.startWidth - newWidth);
          }
          if (handle.includes('n')) {
            newY = resizeState.startPosY + (resizeState.startHeight - newHeight);
          }
        } else {
          // For edge handles when locked, resize both dimensions proportionally
          if (handle === 'e' || handle === 'w') {
            if (handle === 'e') {
              newWidth = Math.max(20, resizeState.startWidth + deltaX);
            } else {
              newWidth = Math.max(20, resizeState.startWidth - deltaX);
              newX = resizeState.startPosX + (resizeState.startWidth - newWidth);
            }
            newHeight = newWidth / aspectRatio;
          } else if (handle === 's' || handle === 'n') {
            if (handle === 's') {
              newHeight = Math.max(20, resizeState.startHeight + deltaY);
            } else {
              newHeight = Math.max(20, resizeState.startHeight - deltaY);
              newY = resizeState.startPosY + (resizeState.startHeight - newHeight);
            }
            newWidth = newHeight * aspectRatio;
          }
        }
      } else {
        // Standard resize without aspect ratio lock
        // East (right side)
        if (handle.includes('e')) {
          newWidth = Math.max(20, resizeState.startWidth + deltaX);
        }
        // West (left side)
        if (handle.includes('w')) {
          const widthDelta = -deltaX;
          newWidth = Math.max(20, resizeState.startWidth + widthDelta);
          if (newWidth > 20) {
            newX = resizeState.startPosX + deltaX;
          }
        }
        // South (bottom)
        if (handle.includes('s')) {
          newHeight = Math.max(20, resizeState.startHeight + deltaY);
        }
        // North (top)
        if (handle.includes('n')) {
          const heightDelta = -deltaY;
          newHeight = Math.max(20, resizeState.startHeight + heightDelta);
          if (newHeight > 20) {
            newY = resizeState.startPosY + deltaY;
          }
        }
      }

      updateElement(resizeState.elementId, {
        width: newWidth,
        height: newHeight,
        position_x: newX,
        position_y: newY,
      });

      // If this is a group, scale all children proportionally
      if (resizeState.isGroup && resizeState.childSnapshots.length > 0) {
        const scaleX = newWidth / resizeState.startWidth;
        const scaleY = newHeight / resizeState.startHeight;

        resizeState.childSnapshots.forEach(childSnapshot => {
          updateElement(childSnapshot.id, {
            position_x: childSnapshot.position_x * scaleX,
            position_y: childSnapshot.position_y * scaleY,
            width: childSnapshot.width * scaleX,
            height: childSnapshot.height * scaleY,
          });
        });
      }
    },
    [resizeState, zoom, updateElement]
  );

  const handleMouseUp = useCallback(() => {
    if (resizeState?.isResizing && hasResizedRef.current) {
      pushHistory('Resize element');
    }
    setResizeState(null);
    hasResizedRef.current = false;
  }, [resizeState, pushHistory]);

  useEffect(() => {
    if (resizeState?.isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizeState?.isResizing, handleMouseMove, handleMouseUp]);

  return {
    isResizing: resizeState?.isResizing ?? false,
    handleResizeStart,
  };
}

// Cursor styles for each handle
export const RESIZE_CURSORS: Record<ResizeHandle, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

