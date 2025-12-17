import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser } from 'lucide-react';

interface TelestratorCanvasProps {
  enabled: boolean;
  color: string;
  onClear?: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
}

export function TelestratorCanvas({ enabled, color, onClear }: TelestratorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Resize canvas to match window size
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 64; // Subtract navbar height
    
    // Redraw all strokes after resize
    redrawCanvas();
  }, []);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      
      ctx.stroke();
    });
  }, [strokes]);

  // Get mouse/touch position relative to canvas
  const getEventPos = useCallback((e: MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  }, []);

  // Start drawing
  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    if (!enabled) return;
    
    e.preventDefault();
    setIsDrawing(true);
    const pos = getEventPos(e);
    setCurrentStroke([pos]);
  }, [enabled, getEventPos]);

  // Continue drawing
  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!enabled || !isDrawing) return;
    
    e.preventDefault();
    const pos = getEventPos(e);
    setCurrentStroke(prev => [...prev, pos]);

    // Draw current stroke in real-time
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentStroke.length > 0) {
      const lastPoint = currentStroke[currentStroke.length - 1];
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  }, [enabled, isDrawing, color, currentStroke, getEventPos]);

  // Stop drawing
  const stopDrawing = useCallback(() => {
    if (!enabled || !isDrawing) return;
    
    setIsDrawing(false);
    
    if (currentStroke.length > 1) {
      setStrokes(prev => [...prev, { points: currentStroke, color }]);
    }
    
    setCurrentStroke([]);
  }, [enabled, isDrawing, currentStroke, color]);

  // Clear all drawings
  const clearDrawings = useCallback((e?: MouseEvent) => {
    //if (!enabled) return;
    
    //if (e.button === 2) { // Right click
      if (e)
        e.preventDefault();
      setStrokes([]);
      setCurrentStroke([]);
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      onClear?.();
    //}
  }, [enabled, onClear]);

  // Setup event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    
    if (!canvas || !enabled) return;

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('contextmenu', clearDrawings);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('contextmenu', clearDrawings);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [enabled, startDrawing, draw, stopDrawing, clearDrawings]);

  // Handle window resize
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas, enabled]);

  // Redraw when strokes change
  useEffect(() => {
    redrawCanvas();
  }, [strokes, redrawCanvas]);

  if (!enabled) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed top-[3rem] left-0 pointer-events-auto z-[80] w-screen h-screen"
        style={{
          cursor: enabled ? 'crosshair' : 'default',
          //touchAction: 'none',
        }}
      />
      
      {/* Clear Button */}
      <button
        onClick={(e) => clearDrawings(e as any)}
        className="fixed bottom-5 right-4 z-[85] bg-black hover:bg-gray-800 text-white rounded-full p-3 shadow-lg transition-colors duration-200 flex items-center justify-center"
        title="Clear all drawings"
        aria-label="Clear all drawings"
      >
        <Eraser className="w-5 h-5" />
      </button>
    </>
  );
}