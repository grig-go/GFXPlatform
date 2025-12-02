import { useMemo, useEffect, useState } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { TOPIC_BADGE_STYLES, type TickerTopic } from '@emergent-platform/types';
import type { TickerTopicType, TopicBadgeStyleData } from '@emergent-platform/types';
import { cn } from '@emergent-platform/ui';

interface TopicBadgeElementProps {
  linkedTickerId?: string;
  defaultTopic?: TickerTopicType;
  customLabel?: string;
  customStyle?: TopicBadgeStyleData;
  showIcon?: boolean;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function TopicBadgeElement({
  linkedTickerId,
  defaultTopic = 'news',
  customLabel,
  customStyle,
  showIcon = true,
  animated = true,
  className,
  style,
}: TopicBadgeElementProps) {
  const elements = useDesignerStore((s) => s.elements);
  const [currentTopic, setCurrentTopic] = useState<TickerTopic>(defaultTopic as TickerTopic);
  const [currentCustomStyle, setCurrentCustomStyle] = useState<TopicBadgeStyleData | undefined>(
    customStyle
  );

  // Find the linked ticker element
  const linkedTicker = useMemo(() => {
    if (!linkedTickerId) return null;
    return elements.find((e) => e.id === linkedTickerId && e.content.type === 'ticker');
  }, [elements, linkedTickerId]);

  // Get the current topic from the linked ticker (if flip/fade/slide mode)
  // For scroll mode, we can track based on which item is currently visible
  useEffect(() => {
    if (!linkedTicker || linkedTicker.content.type !== 'ticker') {
      setCurrentTopic(defaultTopic as TickerTopic);
      setCurrentCustomStyle(customStyle as Partial<TopicBadgeStyleData> | undefined);
      return;
    }

    const tickerContent = linkedTicker.content;
    const config = tickerContent.config;
    const items = tickerContent.items || [];

    if (items.length === 0) {
      setCurrentTopic(defaultTopic as TickerTopic);
      return;
    }

    // For non-scroll modes, track which item is currently displayed
    if (config.mode !== 'scroll') {
      const interval = setInterval(() => {
        const now = Date.now();
        const cycleTime = config.delay || 3000;
        const currentIndex = Math.floor((now / cycleTime) % items.length);
        const currentItem = items[currentIndex];
        
        if (currentItem?.topic) {
          setCurrentTopic(currentItem.topic as TickerTopic);
          setCurrentCustomStyle(currentItem.customTopicStyle as Partial<TopicBadgeStyleData> | undefined);
        } else {
          setCurrentTopic(defaultTopic as TickerTopic);
          setCurrentCustomStyle(customStyle as Partial<TopicBadgeStyleData> | undefined);
        }
      }, 100);

      return () => clearInterval(interval);
    }

    // For scroll mode, just use the first item's topic or cycle through
    // More sophisticated tracking could be implemented with IntersectionObserver
    const firstItemWithTopic = items.find((item) => item.topic);
    if (firstItemWithTopic?.topic) {
      setCurrentTopic(firstItemWithTopic.topic as TickerTopic);
      setCurrentCustomStyle(firstItemWithTopic.customTopicStyle as Partial<TopicBadgeStyleData> | undefined);
    }
  }, [linkedTicker, defaultTopic, customStyle]);

  // Get the badge style
  const badgeStyle = useMemo(() => {
    const baseStyle = TOPIC_BADGE_STYLES[currentTopic] || TOPIC_BADGE_STYLES.news;
    return {
      ...baseStyle,
      ...currentCustomStyle,
      label: customLabel || currentCustomStyle?.label || baseStyle.label,
    };
  }, [currentTopic, currentCustomStyle, customLabel]);

  // Build gradient background if enabled
  const gradientBackground = useMemo(() => {
    if (!currentCustomStyle?.gradient?.enabled) return null;
    const gradient = currentCustomStyle.gradient;
    const sortedColors = [...(gradient.colors || [])].sort((a, b) => a.stop - b.stop);
    const colorStops = sortedColors
      .map(c => `${c.color} ${c.stop}%`)
      .join(', ');

    if (gradient.type === 'linear') {
      const angle = gradient.direction || 0;
      return `linear-gradient(${angle}deg, ${colorStops})`;
    } else if (gradient.type === 'radial') {
      const pos = gradient.radialPosition || { x: 50, y: 50 };
      return `radial-gradient(circle at ${pos.x}% ${pos.y}%, ${colorStops})`;
    } else if (gradient.type === 'conic') {
      const angle = gradient.direction || 0;
      return `conic-gradient(from ${angle}deg, ${colorStops})`;
    }
    return null;
  }, [currentCustomStyle?.gradient]);

  // Build glass effect styles if enabled
  const glassStyles: React.CSSProperties = useMemo(() => {
    if (!currentCustomStyle?.glass?.enabled) return {};
    const glass = currentCustomStyle.glass;
    return {
      backgroundColor: glass.opacity !== undefined 
        ? `rgba(0, 0, 0, ${glass.opacity})` 
        : 'rgba(0, 0, 0, 0.6)',
      backdropFilter: glass.blur !== undefined 
        ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
        : 'blur(16px)',
      WebkitBackdropFilter: glass.blur !== undefined 
        ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
        : 'blur(16px)',
      border: glass.borderWidth !== undefined && glass.borderColor
        ? `${glass.borderWidth}px solid ${glass.borderColor}`
        : glass.borderWidth !== undefined
        ? `${glass.borderWidth}px solid rgba(255, 255, 255, 0.1)`
        : '1px solid rgba(255, 255, 255, 0.1)',
    };
  }, [currentCustomStyle?.glass]);

  // Animation class
  const animationClass = useMemo(() => {
    if (!animated || badgeStyle.animation === 'none') return '';
    switch (badgeStyle.animation) {
      case 'pulse':
        return 'animate-pulse';
      case 'flash':
        return 'animate-flash';
      case 'glow':
        return 'animate-glow';
      default:
        return '';
    }
  }, [animated, badgeStyle.animation]);

  // Determine background color/value
  const bgColorValue = useMemo(() => {
    if (currentCustomStyle?.glass?.enabled) {
      return undefined; // Glass handles its own background
    }
    if (gradientBackground) {
      return gradientBackground;
    }
    if (currentCustomStyle?.fill) {
      return currentCustomStyle.fill;
    }
    return badgeStyle.backgroundColor;
  }, [currentCustomStyle?.glass?.enabled, gradientBackground, currentCustomStyle?.fill, badgeStyle.backgroundColor]);

  return (
    <div
      className={cn(
        'flex items-center justify-center h-full px-4 py-2 font-bold uppercase tracking-wider whitespace-nowrap',
        animationClass,
        className
      )}
      style={{
        backgroundColor: bgColorValue,
        background: gradientBackground || undefined,
        color: currentCustomStyle?.textColor || badgeStyle.textColor,
        borderColor: currentCustomStyle?.borderColor || badgeStyle.borderColor,
        borderWidth: (currentCustomStyle?.borderColor || badgeStyle.borderColor) ? 2 : 0,
        borderStyle: 'solid',
        fontSize: currentCustomStyle?.fontSize ? `${currentCustomStyle.fontSize}px` : undefined,
        fontFamily: currentCustomStyle?.fontFamily || undefined,
        ...glassStyles,
        ...style,
      }}
    >
      {showIcon && badgeStyle.icon && (
        <span className="mr-2" style={{ fontSize: currentCustomStyle?.fontSize ? `${currentCustomStyle.fontSize}px` : undefined }}>
          {badgeStyle.icon}
        </span>
      )}
      <span>{badgeStyle.label}</span>
    </div>
  );
}

// Helper component to select topic for an item
export function TopicSelector({
  value,
  onChange,
  includeCustom = true,
}: {
  value?: TickerTopic;
  onChange: (topic: TickerTopic) => void;
  includeCustom?: boolean;
}) {
  const topics = Object.entries(TOPIC_BADGE_STYLES).filter(
    ([key]) => includeCustom || key !== 'custom'
  );

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value as TickerTopic)}
      className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
    >
      <option value="">No topic</option>
      {topics.map(([key, style]) => (
        <option key={key} value={key}>
          {style.icon} {style.label}
        </option>
      ))}
    </select>
  );
}

// Preview component for topic badges
export function TopicBadgePreview({
  topic,
  customStyle,
  showIcon = true,
}: {
  topic: TickerTopic;
  customStyle?: Partial<TopicBadgeStyleData> & {
    fontSize?: number;
    fontFamily?: string;
    fill?: string;
    gradient?: {
      enabled: boolean;
      type?: 'linear' | 'radial' | 'conic';
      direction?: number;
      colors: Array<{ color: string; stop: number }>;
      radialPosition?: { x: number; y: number };
    };
    glass?: {
      enabled: boolean;
      blur?: number;
      opacity?: number;
      borderWidth?: number;
      borderColor?: string;
      saturation?: number;
    };
  };
  showIcon?: boolean;
}) {
  const style = useMemo(() => {
    const baseStyle = TOPIC_BADGE_STYLES[topic] || TOPIC_BADGE_STYLES.news;
    return { ...baseStyle, ...customStyle };
  }, [topic, customStyle]);

  // Build gradient if enabled
  const gradientBackground = useMemo(() => {
    if (!customStyle?.gradient?.enabled) return null;
    const gradient = customStyle.gradient;
    const sortedColors = [...(gradient.colors || [])].sort((a, b) => a.stop - b.stop);
    const colorStops = sortedColors
      .map(c => `${c.color} ${c.stop}%`)
      .join(', ');

    if (gradient.type === 'linear') {
      const angle = gradient.direction || 0;
      return `linear-gradient(${angle}deg, ${colorStops})`;
    } else if (gradient.type === 'radial') {
      const pos = gradient.radialPosition || { x: 50, y: 50 };
      return `radial-gradient(circle at ${pos.x}% ${pos.y}%, ${colorStops})`;
    } else if (gradient.type === 'conic') {
      const angle = gradient.direction || 0;
      return `conic-gradient(from ${angle}deg, ${colorStops})`;
    }
    return null;
  }, [customStyle?.gradient]);

  // Build glass effect styles if enabled
  const glassStyles: React.CSSProperties = useMemo(() => {
    if (!customStyle?.glass?.enabled) return {};
    const glass = customStyle.glass;
    return {
      backgroundColor: glass.opacity !== undefined 
        ? `rgba(0, 0, 0, ${glass.opacity})` 
        : 'rgba(0, 0, 0, 0.6)',
      backdropFilter: glass.blur !== undefined 
        ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
        : 'blur(16px)',
      WebkitBackdropFilter: glass.blur !== undefined 
        ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
        : 'blur(16px)',
      border: glass.borderWidth !== undefined && glass.borderColor
        ? `${glass.borderWidth}px solid ${glass.borderColor}`
        : glass.borderWidth !== undefined
        ? `${glass.borderWidth}px solid rgba(255, 255, 255, 0.1)`
        : '1px solid rgba(255, 255, 255, 0.1)',
    };
  }, [customStyle?.glass]);

  // Determine background
  const bgColorValue = useMemo(() => {
    if (customStyle?.glass?.enabled) {
      return undefined; // Glass handles its own background
    }
    if (gradientBackground) {
      return gradientBackground;
    }
    if (customStyle?.fill) {
      return customStyle.fill;
    }
    return style.backgroundColor;
  }, [customStyle?.glass?.enabled, gradientBackground, customStyle?.fill, style.backgroundColor]);

  return (
    <div
      className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase"
      style={{
        backgroundColor: bgColorValue,
        background: gradientBackground || undefined,
        color: customStyle?.textColor || style.textColor,
        fontSize: customStyle?.fontSize ? `${customStyle.fontSize}px` : undefined,
        fontFamily: customStyle?.fontFamily || undefined,
        ...glassStyles,
      }}
    >
      {showIcon && style.icon && (
        <span className="mr-1" style={{ fontSize: customStyle?.fontSize ? `${customStyle.fontSize}px` : undefined }}>
          {style.icon}
        </span>
      )}
      <span>{style.label}</span>
    </div>
  );
}

export default TopicBadgeElement;



