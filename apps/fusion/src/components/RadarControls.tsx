import { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';
import { Slider } from './ui/slider';
import { Button } from './ui/button';

interface RadarControlsProps {
  frames: Array<{time: number, path: string}>;
  currentFrameIndex: number;
  isPlaying: boolean;
  opacity: number;
  onFrameChange: (index: number) => void;
  onPlayPause: () => void;
  onFetchLatest: () => void;
  onOpacityChange: (opacity: number) => void;
}

export function RadarControls({
  frames,
  currentFrameIndex,
  isPlaying,
  opacity,
  onFrameChange,
  onPlayPause,
  onFetchLatest,
  onOpacityChange,
}: RadarControlsProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
    return `${dateStr} ${timeStr}`;
  };

  if (frames.length === 0) {
    return null;
  }

  const currentFrame = frames[currentFrameIndex];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 z-10 min-w-[500px]">
      <div className="flex flex-col gap-3">
        {/* Time display */}
        <div className="text-center text-sm">
          {currentFrame && formatTime(currentFrame.time)}
        </div>

        {/* Timeline scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {currentFrameIndex + 1} / {frames.length}
          </span>
          <Slider
            value={[currentFrameIndex]}
            min={0}
            max={frames.length - 1}
            step={1}
            onValueChange={(values) => onFrameChange(values[0])}
            className="flex-1"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPlayPause}
              className="w-20"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Play
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onFetchLatest}
              title="Fetch latest radar data"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>

          {/* Opacity control */}
          <div className="flex items-center gap-2 min-w-[180px]">
            <span className="text-xs text-gray-500 whitespace-nowrap">Opacity:</span>
            <Slider
              value={[opacity * 100]}
              min={0}
              max={100}
              step={5}
              onValueChange={(values) => onOpacityChange(values[0] / 100)}
              className="flex-1"
            />
            <span className="text-xs text-gray-500 w-8 text-right">
              {Math.round(opacity * 100)}%
            </span>
          </div>
        </div>


      </div>
    </div>
  );
}
