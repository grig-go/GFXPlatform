import { useEffect, useRef, useState } from 'react';
import { 
  detectShape, 
  drawPerfectCircle, 
  drawPerfectRectangle, 
  drawPerfectLine,
  drawPerfectX,
  drawPerfectArrow,
  type Point,
  type ShapeType
} from '../utils/shapeDetection';

interface TelestratorProps {
  enabled: boolean;
  color: string | null;
  penSize: number;
  sidebarPosition: 'left' | 'right';
  isSidebarCollapsed: boolean;
  shapeDetectionEnabled: boolean;
}

interface DrawnStroke {
  points: Point[];
  color: string;
  penSize: number;
}

interface DetectedShapeOverlay {
  type: ShapeType;
  points: Point[];
  color: string;
  penSize: number;
}

export function Telestrator({ enabled, color, penSize, sidebarPosition, isSidebarCollapsed, shapeDetectionEnabled }: TelestratorProps) {
  // Two canvas layers: overlays (bottom) and freehand (top)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const freehandCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentStrokePoints = useRef<Point[]>([]);
  
  // Store all drawn strokes and detected shape overlays
  const [freehandStrokes, setFreehandStrokes] = useState<DrawnStroke[]>([]);
  const [shapeOverlays, setShapeOverlays] = useState<DetectedShapeOverlay[]>([]);
  
  // Use ref to avoid re-running effect when strokes change
  const freehandStrokesRef = useRef<DrawnStroke[]>([]);
  
  // Keep ref in sync with state
  useEffect(() => {
    freehandStrokesRef.current = freehandStrokes;
  }, [freehandStrokes]);

  // Clear canvases when color is set to null (eraser mode)
  useEffect(() => {
    if (color === null) {
      // Clear both canvases
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      }
      if (freehandCanvasRef.current) {
        const ctx = freehandCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, freehandCanvasRef.current.width, freehandCanvasRef.current.height);
        }
      }
      // Clear stored data
      setFreehandStrokes([]);
      setShapeOverlays([]);
    }
  }, [color]);

  // Set up canvas dimensions
  useEffect(() => {
    if (!enabled) return;
    
    const updateCanvasSize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      [overlayCanvasRef, freehandCanvasRef].forEach(canvasRef => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        
        // Only update if size actually changed
        if (canvas.width !== newWidth || canvas.height !== newHeight) {
          // Store current image data before resize
          const ctx = canvas.getContext('2d');
          const imageData = ctx ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
          
          canvas.width = newWidth;
          canvas.height = newHeight;
          
          // Restore image data after resize
          if (ctx && imageData) {
            ctx.putImageData(imageData, 0, 0);
          }
        }
      });
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [enabled]);

  // Redraw all freehand strokes when they change
  useEffect(() => {
    if (!freehandCanvasRef.current) return;
    
    const canvas = freehandCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw all freehand strokes
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (const stroke of freehandStrokes) {
      drawFreehandStroke(ctx, stroke.points, stroke.color, stroke.penSize);
    }
  }, [freehandStrokes]);

  // Redraw all shape overlays when they change
  useEffect(() => {
    if (!overlayCanvasRef.current) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw all shape overlays
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (const shape of shapeOverlays) {
      drawShapeOverlay(ctx, shape);
    }
  }, [shapeOverlays]);

  // Helper function to draw a freehand stroke (raw, no smoothing)
  const drawFreehandStroke = (ctx: CanvasRenderingContext2D, points: Point[], color: string, size: number) => {
    if (points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.stroke();
  };

  // Helper function to draw a shape overlay
  const drawShapeOverlay = (ctx: CanvasRenderingContext2D, shape: DetectedShapeOverlay) => {
    switch (shape.type) {
      case 'circle':
        drawPerfectCircle(ctx, shape.points, shape.color, shape.penSize);
        break;
      case 'rectangle':
        drawPerfectRectangle(ctx, shape.points, shape.color, shape.penSize);
        break;
      case 'line':
        drawPerfectLine(ctx, shape.points, shape.color, shape.penSize);
        break;
      case 'x':
        drawPerfectX(ctx, shape.points, shape.color, shape.penSize);
        break;
      case 'arrow':
        drawPerfectArrow(ctx, shape.points, shape.color, shape.penSize);
        break;
    }
  };

  // Handle drawing
  useEffect(() => {
    if (!enabled || !freehandCanvasRef.current) {
      return;
    }

    // Skip if color is null (clearing mode), but don't prevent re-initialization
    if (color === null) {
      return;
    }

    const canvas = freehandCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Configure drawing context for real-time drawing
    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      
      // Use clientX/Y directly since canvas is fixed at inset-0
      const point = e instanceof MouseEvent 
        ? { x: e.clientX, y: e.clientY }
        : { x: e.touches[0].clientX, y: e.touches[0].clientY };

      isDrawingRef.current = true;
      lastPointRef.current = point;
      currentStrokePoints.current = [point];
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();

      // Use clientX/Y directly since canvas is fixed at inset-0
      const point = e instanceof MouseEvent 
        ? { x: e.clientX, y: e.clientY }
        : { x: e.touches[0].clientX, y: e.touches[0].clientY };

      // Collect points for the stroke
      currentStrokePoints.current.push(point);

      // Draw in real-time (simple line segments)
      if (lastPointRef.current) {
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      lastPointRef.current = point;
    };

    const stopDrawing = () => {
      if (!isDrawingRef.current || currentStrokePoints.current.length === 0) {
        isDrawingRef.current = false;
        lastPointRef.current = null;
        currentStrokePoints.current = [];
        return;
      }

      const points = [...currentStrokePoints.current];
      let shapeDetected = false;

      // If shape detection is enabled, analyze and add overlay if applicable
      if (shapeDetectionEnabled && points.length > 5) {
        const shapeType = detectShape(points);
        
        // Only add overlay for recognized shapes (not freehand)
        if (shapeType !== 'freehand') {
          setShapeOverlays(prev => [...prev, {
            type: shapeType,
            points,
            color,
            penSize
          }]);
          shapeDetected = true;
          
          // Clear the real-time drawing from freehand canvas since we're showing the shape overlay instead
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Redraw all existing freehand strokes (but not the current one)
          for (const stroke of freehandStrokesRef.current) {
            drawFreehandStroke(ctx, stroke.points, stroke.color, stroke.penSize);
          }
        }
      }

      // Only keep the freehand stroke if NO shape was detected
      if (!shapeDetected) {
        setFreehandStrokes(prev => [...prev, {
          points,
          color,
          penSize
        }]);
      }
      
      isDrawingRef.current = false;
      lastPointRef.current = null;
      currentStrokePoints.current = [];
    };

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
      canvas.removeEventListener('touchcancel', stopDrawing);
    };
  }, [enabled, color, penSize, shapeDetectionEnabled]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Overlay canvas - drawn behind freehand */}
      <canvas
        ref={overlayCanvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 998,
        }}
      />
      
      {/* Freehand canvas - drawn on top */}
      <canvas
        ref={freehandCanvasRef}
        className="fixed inset-0 cursor-crosshair"
        style={{
          zIndex: 999,
        }}
      />
    </>
  );
}