import { useState, useCallback, useEffect, useRef } from 'react';
import { useDesignerStore } from '@/stores/designerStore';

interface RotateState {
  isRotating: boolean;
  elementId: string;
  centerX: number;
  centerY: number;
  startAngle: number;
  startRotation: number;
}

export function useRotate() {
  const { elements, updateElement, pushHistory } = useDesignerStore();
  const [rotateState, setRotateState] = useState<RotateState | null>(null);
  const hasRotatedRef = useRef(false);

  const handleRotateStart = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      e.stopPropagation();
      e.preventDefault();

      const element = elements.find((el) => el.id === elementId);
      if (!element) return;

      // Find the element DOM node to get its actual screen position
      const elementNode = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
      if (!elementNode) return;

      // Get the bounding rect of the element in screen coordinates
      const rect = elementNode.getBoundingClientRect();

      // Calculate center of the element in screen coordinates
      const screenCenterX = rect.left + rect.width / 2;
      const screenCenterY = rect.top + rect.height / 2;

      // Calculate initial angle from center to mouse
      const deltaX = e.clientX - screenCenterX;
      const deltaY = e.clientY - screenCenterY;
      const startAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      setRotateState({
        isRotating: true,
        elementId,
        centerX: screenCenterX,
        centerY: screenCenterY,
        startAngle,
        startRotation: element.rotation ?? 0,
      });
      hasRotatedRef.current = false;
    },
    [elements]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!rotateState?.isRotating) return;

      // Calculate current angle from center to mouse
      const deltaX = e.clientX - rotateState.centerX;
      const deltaY = e.clientY - rotateState.centerY;
      const currentAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      // Calculate rotation delta
      let angleDelta = currentAngle - rotateState.startAngle;

      // Calculate new rotation
      let newRotation = rotateState.startRotation + angleDelta;

      // Normalize to 0-360 range
      newRotation = ((newRotation % 360) + 360) % 360;

      // Snap to 15-degree increments if shift is held
      if (e.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }

      // Snap to 0, 90, 180, 270 if within 5 degrees
      const snapAngles = [0, 90, 180, 270, 360];
      for (const snap of snapAngles) {
        if (Math.abs(newRotation - snap) < 5) {
          newRotation = snap === 360 ? 0 : snap;
          break;
        }
      }

      hasRotatedRef.current = true;

      updateElement(rotateState.elementId, {
        rotation: newRotation,
      });
    },
    [rotateState, updateElement]
  );

  const handleMouseUp = useCallback(() => {
    if (rotateState?.isRotating && hasRotatedRef.current) {
      pushHistory('Rotate element');
    }
    setRotateState(null);
    hasRotatedRef.current = false;
  }, [rotateState, pushHistory]);

  useEffect(() => {
    if (rotateState?.isRotating) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [rotateState?.isRotating, handleMouseMove, handleMouseUp]);

  return {
    isRotating: rotateState?.isRotating ?? false,
    handleRotateStart,
  };
}
