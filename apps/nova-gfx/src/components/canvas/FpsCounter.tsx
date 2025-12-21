import { useEffect, useRef, useState } from 'react';
import { useDesignerStore } from '@/stores/designerStore';

interface FpsCounterProps {
  className?: string;
}

export function FpsCounter({ className }: FpsCounterProps) {
  const { project } = useDesignerStore();
  const targetFps = project?.frame_rate ?? 30;

  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>();

  useEffect(() => {
    const updateFps = (currentTime: number) => {
      frameCountRef.current++;

      const elapsed = currentTime - lastTimeRef.current;

      // Update FPS display every 500ms for smoother reading
      if (elapsed >= 500) {
        const rawFps = Math.round((frameCountRef.current * 1000) / elapsed);
        // Cap at target FPS - we can't render faster than the project setting
        const currentFps = Math.min(rawFps, targetFps);
        setFps(currentFps);
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      rafIdRef.current = requestAnimationFrame(updateFps);
    };

    rafIdRef.current = requestAnimationFrame(updateFps);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Color based on FPS performance relative to target
  const getColor = () => {
    const ratio = fps / targetFps;
    if (ratio >= 0.95) return 'text-green-400'; // Within 5% of target
    if (ratio >= 0.5) return 'text-yellow-400'; // At least 50% of target
    return 'text-red-400';
  };

  return (
    <div
      className={`absolute top-3 right-3 px-3 py-2 bg-black/80 rounded-lg font-mono pointer-events-none shadow-lg ${className || ''}`}
      style={{ zIndex: 999999 }}
    >
      <span className={`text-2xl font-bold ${getColor()}`}>{fps}</span>
      <span className="text-white/50 text-lg">/{targetFps}</span>
      <span className="text-white/70 text-lg ml-1">FPS</span>
    </div>
  );
}
