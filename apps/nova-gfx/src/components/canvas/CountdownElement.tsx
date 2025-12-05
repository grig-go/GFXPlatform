import { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@emergent-platform/ui';

export type CountdownMode = 'duration' | 'datetime' | 'clock';
export type OnCompleteAction = 'stop' | 'loop' | 'hide';
export type ClockFormat = '12h' | '24h';

export interface CountdownConfig {
  type?: 'countdown'; // To match element content type
  mode: CountdownMode;
  durationSeconds?: number;
  targetDatetime?: string | null;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  showMilliseconds?: boolean;
  showLabels?: boolean;
  separator?: string;
  padZeros?: boolean;
  onComplete?: OnCompleteAction;
  clockFormat?: ClockFormat;
  showDate?: boolean;
  timezone?: string;
}

interface CountdownElementProps {
  config: CountdownConfig;
  className?: string;
  style?: React.CSSProperties;
  isPlaying?: boolean; // Kept for API compatibility but countdown always runs
  startTime?: number; // timestamp when animation started (for preview syncing)
}

interface TimeValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  isComplete: boolean;
}

function formatNumber(num: number, pad: boolean, digits = 2): string {
  if (pad) {
    return String(num).padStart(digits, '0');
  }
  return String(num);
}

function getTimeInTimezone(timezone: string): Date {
  if (timezone === 'local') {
    return new Date();
  }
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const dateParts: Record<string, string> = {};
    parts.forEach(({ type, value }) => {
      dateParts[type] = value;
    });
    return new Date(
      `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`
    );
  } catch {
    return new Date();
  }
}

export function CountdownElement({
  config,
  className,
  style,
  isPlaying: _isPlaying, // Unused - countdown always runs
  startTime,
}: CountdownElementProps) {
  const [timeValues, setTimeValues] = useState<TimeValues>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
    isComplete: false,
  });
  const [isHidden, setIsHidden] = useState(false);
  const [countdownStartTime] = useState(() => startTime || Date.now());

  // Calculate time values based on mode
  const calculateTimeValues = useCallback((): TimeValues => {
    const now = Date.now();
    const timezone = config.timezone || 'local';
    const durationSeconds = config.durationSeconds ?? 60;

    if (config.mode === 'clock') {
      // Clock mode - show current time
      const currentTime = getTimeInTimezone(timezone);
      return {
        days: 0,
        hours: currentTime.getHours(),
        minutes: currentTime.getMinutes(),
        seconds: currentTime.getSeconds(),
        milliseconds: currentTime.getMilliseconds(),
        isComplete: false,
      };
    }

    let remainingMs: number;

    if (config.mode === 'datetime' && config.targetDatetime) {
      // Datetime mode - countdown to specific date/time
      const target = new Date(config.targetDatetime).getTime();
      remainingMs = target - now;
    } else {
      // Duration mode - countdown from specified seconds
      const elapsedMs = now - countdownStartTime;
      const totalMs = durationSeconds * 1000;
      remainingMs = totalMs - elapsedMs;
    }

    if (remainingMs <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
        isComplete: true,
      };
    }

    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
    const milliseconds = Math.floor((remainingMs % 1000) / 10); // Show centiseconds

    return { days, hours, minutes, seconds, milliseconds, isComplete: false };
  }, [config.mode, config.targetDatetime, config.durationSeconds, config.timezone, countdownStartTime]);

  // Update timer - All modes run continuously for live display
  // Clock: shows current time (always live)
  // Datetime: counts down to target (always live since target is fixed)
  // Duration: counts down from start time (always live once placed)
  useEffect(() => {
    // All modes run to show live values - this ensures the countdown is always visible
    // and updating in design, preview, and publish modes
    const updateInterval = config.showMilliseconds ? 10 : 100;

    const update = () => {
      const values = calculateTimeValues();
      setTimeValues(values);

      if (values.isComplete) {
        switch (config.onComplete) {
          case 'hide':
            setIsHidden(true);
            break;
          case 'loop':
            // Reset would need startTime management
            break;
          case 'stop':
          default:
            // Just stop at 0
            break;
        }
      }
    };

    update();
    const interval = setInterval(update, updateInterval);
    return () => clearInterval(interval);
  }, [config.showMilliseconds, config.onComplete, calculateTimeValues]);

  // Format clock time for 12h format
  const formatClockHours = useMemo(() => {
    if (config.mode !== 'clock' || config.clockFormat !== '12h') {
      return timeValues.hours;
    }
    const h = timeValues.hours % 12;
    return h === 0 ? 12 : h;
  }, [config.mode, config.clockFormat, timeValues.hours]);

  const amPm = useMemo(() => {
    if (config.mode !== 'clock' || config.clockFormat !== '12h') {
      return '';
    }
    return timeValues.hours >= 12 ? 'PM' : 'AM';
  }, [config.mode, config.clockFormat, timeValues.hours]);

  // Build display parts
  const displayParts = useMemo(() => {
    const parts: { value: string; label: string }[] = [];
    const padZeros = config.padZeros ?? true;
    const showLabels = config.showLabels ?? true;
    const mode = config.mode;

    if (mode === 'clock') {
      // Clock mode
      parts.push({
        value: formatNumber(formatClockHours, padZeros),
        label: showLabels ? 'hr' : '',
      });
      parts.push({
        value: formatNumber(timeValues.minutes, padZeros),
        label: showLabels ? 'min' : '',
      });
      if (config.showSeconds ?? true) {
        parts.push({
          value: formatNumber(timeValues.seconds, padZeros),
          label: showLabels ? 'sec' : '',
        });
      }
    } else {
      // Countdown modes
      if (config.showDays && (timeValues.days > 0 || config.showDays)) {
        parts.push({
          value: formatNumber(timeValues.days, padZeros),
          label: showLabels ? 'd' : '',
        });
      }
      if (config.showHours ?? true) {
        parts.push({
          value: formatNumber(timeValues.hours, padZeros),
          label: showLabels ? 'h' : '',
        });
      }
      if (config.showMinutes ?? true) {
        parts.push({
          value: formatNumber(timeValues.minutes, padZeros),
          label: showLabels ? 'm' : '',
        });
      }
      if (config.showSeconds ?? true) {
        parts.push({
          value: formatNumber(timeValues.seconds, padZeros),
          label: showLabels ? 's' : '',
        });
      }
      if (config.showMilliseconds) {
        parts.push({
          value: formatNumber(timeValues.milliseconds, padZeros),
          label: showLabels ? 'ms' : '',
        });
      }
    }

    return parts;
  }, [config, timeValues, formatClockHours]);

  // Get current date for clock mode
  const currentDate = useMemo(() => {
    if (config.mode !== 'clock' || !config.showDate) {
      return null;
    }
    const now = getTimeInTimezone(config.timezone || 'local');
    return now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [config.mode, config.showDate, config.timezone, timeValues]); // timeValues to trigger re-render

  if (isHidden) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full w-full',
        className
      )}
      style={style}
    >
      {currentDate && (
        <div className="text-sm opacity-70 mb-1">{currentDate}</div>
      )}
      <div className="flex items-baseline gap-1">
        {displayParts.map((part, index) => (
          <span key={index} className="flex items-baseline">
            {index > 0 && (
              <span className="opacity-60 mx-0.5">{config.separator}</span>
            )}
            <span className="tabular-nums">{part.value}</span>
            {part.label && (
              <span className="text-[0.5em] opacity-60 ml-0.5">{part.label}</span>
            )}
          </span>
        ))}
        {amPm && (
          <span className="text-[0.6em] ml-1 opacity-80">{amPm}</span>
        )}
      </div>
    </div>
  );
}

export default CountdownElement;
