import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Marquee from 'react-fast-marquee';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import * as LucideIcons from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { findIconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { TickerItem, TickerConfig, TickerMode } from '@emergent-platform/types';
import { DEFAULT_TICKER_CONFIG } from '@emergent-platform/types';
import { cn } from '@emergent-platform/ui';

// Icon type for ticker items
interface TickerIcon {
  library: 'lucide' | 'fontawesome' | 'lottie' | 'weather';
  name: string;
  weight?: 'solid' | 'regular' | 'brands';
}

// Simple icon renderer for ticker items
function TickerIconRenderer({ icon, size = 18, color }: { icon: string | TickerIcon; size?: number; color?: string }) {
  // Handle string icons (emojis)
  if (typeof icon === 'string') {
    return <span style={{ fontSize: size }}>{icon}</span>;
  }

  // Handle icon objects
  const { library, name, weight } = icon;

  if (library === 'lucide') {
    const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[name];
    if (IconComponent) {
      return <IconComponent size={size} color={color} />;
    }
  }

  if (library === 'fontawesome') {
    const prefix = weight === 'regular' ? 'far' : weight === 'brands' ? 'fab' : 'fas';
    const iconDef = findIconDefinition({ prefix: prefix as 'fas' | 'far' | 'fab', iconName: name as any });
    if (iconDef) {
      return <FontAwesomeIcon icon={iconDef} style={{ fontSize: size, color }} />;
    }
  }

  return null;
}

interface TickerElementProps {
  items: TickerItem[];
  config?: Partial<TickerConfig>;
  className?: string;
  style?: React.CSSProperties;
  onItemClick?: (item: TickerItem) => void;
}

export function TickerElement({
  items,
  config: configOverride,
  className,
  style,
  onItemClick,
}: TickerElementProps) {
  const config = useMemo(
    () => ({ ...DEFAULT_TICKER_CONFIG, ...configOverride }),
    [configOverride]
  );

  if (items.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-muted-foreground', className)}
        style={style}
      >
        No ticker items
      </div>
    );
  }

  switch (config.mode) {
    case 'scroll':
      return (
        <ScrollTicker
          items={items}
          config={config}
          className={className}
          style={style}
          onItemClick={onItemClick}
        />
      );
    case 'flip':
      return (
        <FlipTicker
          items={items}
          config={config}
          className={className}
          style={style}
          onItemClick={onItemClick}
        />
      );
    case 'fade':
      return (
        <FadeTicker
          items={items}
          config={config}
          className={className}
          style={style}
          onItemClick={onItemClick}
        />
      );
    case 'slide':
      return (
        <SlideTicker
          items={items}
          config={config}
          className={className}
          style={style}
          onItemClick={onItemClick}
        />
      );
    default:
      return null;
  }
}

// ============================================
// SCROLL TICKER (Marquee)
// ============================================
interface TickerModeProps {
  items: TickerItem[];
  config: TickerConfig;
  className?: string;
  style?: React.CSSProperties;
  onItemClick?: (item: TickerItem) => void;
}

function ScrollTicker({ items, config, className, style, onItemClick }: TickerModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [singleSetWidth, setSingleSetWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const direction = config.direction === 'right' ? 'right' : 'left';

  // Measure container and single set width
  useEffect(() => {
    if (containerRef.current && measureRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
      setSingleSetWidth(measureRef.current.scrollWidth);
    }
  }, [items, config.gap]);

  // Calculate how many copies we need to fill the container + one extra for seamless loop
  const copiesNeeded = singleSetWidth > 0 ? Math.ceil(containerWidth / singleSetWidth) + 2 : 2;

  // Calculate animation duration based on single set width and speed (px/s)
  const duration = singleSetWidth > 0 ? singleSetWidth / config.speed : 10;

  // Render items with consistent gap
  const renderItems = (keyPrefix: string) => (
    <>
      {items.map((item, index) => (
        <div
          key={`${keyPrefix}-${item.id || index}`}
          className="inline-flex items-center h-full shrink-0"
          style={{ marginRight: config.gap }}
        >
          <TickerItemRenderer
            item={item}
            config={config}
            onClick={onItemClick}
          />
        </div>
      ))}
    </>
  );

  // Animation translate amount - move by exactly one set width
  const translateAmount = singleSetWidth > 0 ? singleSetWidth : 0;

  return (
    <div
      ref={containerRef}
      className={cn('overflow-hidden relative', className)}
      style={style}
      onMouseEnter={() => config.pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => config.pauseOnHover && setIsPaused(false)}
    >
      {/* Gradient overlays */}
      {config.gradient && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none"
            style={{
              width: config.gradientWidth,
              background: `linear-gradient(to right, ${config.gradientColor || 'rgba(0,0,0,1)'}, transparent)`,
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none"
            style={{
              width: config.gradientWidth,
              background: `linear-gradient(to left, ${config.gradientColor || 'rgba(0,0,0,1)'}, transparent)`,
            }}
          />
        </>
      )}

      {/* Hidden measure element */}
      <div
        ref={measureRef}
        className="inline-flex items-center h-full whitespace-nowrap absolute opacity-0 pointer-events-none"
        aria-hidden="true"
      >
        {renderItems('measure')}
      </div>

      {/* Scrolling content - multiple copies for seamless loop */}
      <div
        className="inline-flex items-center h-full whitespace-nowrap will-change-transform"
        style={{
          // Use individual animation properties to avoid conflict with animationPlayState
          animationName: translateAmount > 0 ? 'ticker-scroll-px' : 'none',
          animationDuration: `${duration}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: config.loop ? 'infinite' : '1',
          animationPlayState: isPaused ? 'paused' : 'running',
          '--ticker-translate': `-${translateAmount}px`,
        } as React.CSSProperties}
      >
        {Array.from({ length: copiesNeeded }, (_, i) => renderItems(`set${i}`))}
      </div>
    </div>
  );
}

// ============================================
// FLIP TICKER (Vertical flip between items)
// Sequential animation: enter from bottom → pause → exit up → next enters from bottom
// ============================================
function FlipTicker({ items, config, className, style, onItemClick }: TickerModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0); // Used to trigger re-render for animation
  // Animation phases: 'offscreen' | 'entering' | 'visible' | 'exiting'
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const flipDuration = config.flipDuration || 500;
  const animationRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // Ensure currentIndex is valid when items change
  const safeIndex = items.length > 0 ? currentIndex % items.length : 0;

  // Reset index if it's out of bounds
  useEffect(() => {
    if (items.length > 0 && currentIndex >= items.length) {
      setCurrentIndex(0);
      setAnimationKey(k => k + 1);
    }
  }, [items.length, currentIndex]);

  // Single animation cycle effect
  useEffect(() => {
    if (items.length === 0) return;

    // Create a cancellation token for this animation cycle
    const token = { cancelled: false };
    animationRef.current = token;

    // Start with entering phase
    setPhase('entering');

    // After enter animation completes, switch to visible (hold)
    const enterTimeout = setTimeout(() => {
      if (token.cancelled) return;
      setPhase('visible');

      // Should we continue to next item?
      const isLastItem = safeIndex >= items.length - 1;
      if (!config.loop && isLastItem) return;

      // After hold duration, start exit
      const holdTimeout = setTimeout(() => {
        if (token.cancelled) return;
        setPhase('exiting');

        // After exit animation completes, move to next item
        const exitTimeout = setTimeout(() => {
          if (token.cancelled) return;
          setCurrentIndex((prev) => (prev + 1) % items.length);
          setAnimationKey(k => k + 1);
        }, flipDuration);

        // Store for cleanup
        token.exitTimeout = exitTimeout;
      }, config.delay);

      // Store for cleanup
      token.holdTimeout = holdTimeout;
    }, flipDuration);

    // Store for cleanup
    token.enterTimeout = enterTimeout;

    return () => {
      token.cancelled = true;
      clearTimeout(token.enterTimeout);
      clearTimeout(token.holdTimeout);
      clearTimeout(token.exitTimeout);
    };
  }, [animationKey, items.length, config.delay, config.loop, safeIndex, flipDuration]);

  // Get current item safely
  const currentItem = items[safeIndex];

  // Don't render if no items
  if (!currentItem) {
    return (
      <div className={cn('relative overflow-hidden', className)} style={style}>
        <div className="h-full flex items-center justify-center text-muted-foreground">
          No items
        </div>
      </div>
    );
  }

  // Calculate transform based on phase
  // entering: animating from below to center (starts at 100%, animates to 0%)
  // visible: stays at center (0%)
  // exiting: animating from center to above (-100%)
  const getTransform = () => {
    switch (phase) {
      case 'entering':
        return 'translateY(0)'; // Animate to center (CSS animation handles the from)
      case 'visible':
        return 'translateY(0)'; // Hold in center
      case 'exiting':
        return 'translateY(-100%)'; // Exit to top
    }
  };

  return (
    <div className={cn('relative overflow-hidden', className)} style={style}>
      {/* Current item - key forces remount on index change to reset animation */}
      <div
        key={`${safeIndex}-${animationKey}`}
        className={cn(
          'h-full',
          phase === 'entering' && 'animate-flip-enter',
          phase === 'exiting' && 'animate-flip-exit'
        )}
        style={{
          '--flip-duration': `${flipDuration}ms`,
        } as React.CSSProperties}
      >
        <TickerItemRenderer
          item={currentItem}
          config={config}
          onClick={onItemClick}
        />
      </div>

      {/* Progress indicator (optional, off by default) */}
      {config.showIndicator && items.length > 1 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {items.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                idx === safeIndex ? 'bg-white' : 'bg-white/30'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// FADE TICKER (Crossfade between items)
// ============================================
function FadeTicker({ items, config, className, style, onItemClick }: TickerModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!config.loop && currentIndex >= items.length - 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, config.delay);

    return () => clearInterval(interval);
  }, [items.length, config.delay, config.loop, currentIndex]);

  return (
    <div className={cn('relative overflow-hidden', className)} style={style}>
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className={cn(
            'absolute inset-0 transition-opacity',
            index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          style={{
            transitionDuration: `${config.speed}ms`,
            transitionTimingFunction: config.easing,
          }}
        >
          <TickerItemRenderer
            item={item}
            config={config}
            onClick={onItemClick}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================
// SLIDE TICKER (Using Embla Carousel)
// ============================================
function SlideTicker({ items, config, className, style, onItemClick }: TickerModeProps) {
  const autoplayOptions = useMemo(
    () =>
      Autoplay({
        delay: config.delay,
        stopOnInteraction: false,
        stopOnMouseEnter: config.pauseOnHover,
      }),
    [config.delay, config.pauseOnHover]
  );

  const [emblaRef] = useEmblaCarousel(
    {
      loop: config.loop,
      axis: config.direction === 'up' || config.direction === 'down' ? 'y' : 'x',
      align: 'center',
      skipSnaps: false,
    },
    [autoplayOptions]
  );

  return (
    <div className={cn('overflow-hidden', className)} style={style} ref={emblaRef}>
      <div
        className={cn(
          'flex',
          (config.direction === 'up' || config.direction === 'down') && 'flex-col'
        )}
        style={{
          height: config.direction === 'up' || config.direction === 'down' ? '100%' : 'auto',
        }}
      >
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="flex-[0_0_100%] min-w-0"
            style={{
              transition: `transform ${config.speed}ms ${config.easing}`,
            }}
          >
            <TickerItemRenderer
              item={item}
              config={config}
              onClick={onItemClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// TICKER ITEM RENDERER
// ============================================
interface TickerItemRendererProps {
  item: TickerItem;
  config: TickerConfig;
  onClick?: (item: TickerItem) => void;
  style?: React.CSSProperties;
}

function TickerItemRenderer({ item, config, onClick, style }: TickerItemRendererProps) {
  // If item has custom component, render that
  if (item.component) {
    const Component = item.component;
    return <Component item={item} />;
  }

  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [onClick, item]);

  // Render based on item type
  const isFinanceTicker = item.change !== undefined;
  const hasLabelValue = item.label && item.value;

  // Map text alignment to justify-content
  const justifyMap = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };
  const justifyClass = justifyMap[config.textAlign || 'left'];

  return (
    <div
      className={cn(
        'flex items-center gap-3 h-full px-4 whitespace-nowrap w-full',
        justifyClass,
        onClick && 'cursor-pointer hover:opacity-80',
        config.itemClassName
      )}
      style={{
        ...style,
        color: item.color,
        backgroundColor: item.backgroundColor,
        width: config.itemWidth === 'auto' ? 'auto' : config.itemWidth,
      }}
      onClick={handleClick}
    >
      {/* Icon */}
      {item.icon && (
        <TickerIconRenderer icon={item.icon as string | TickerIcon} size={18} />
      )}

      {/* Finance-style ticker (symbol + change) */}
      {isFinanceTicker && (
        <>
          <span className="font-bold">{item.label || item.content}</span>
          <span className="font-mono">{item.value}</span>
          {item.changeValue && (
            <span
              className={cn(
                'font-mono text-sm',
                item.change === 'up' && 'text-green-500',
                item.change === 'down' && 'text-red-500',
                item.change === 'neutral' && 'text-gray-400'
              )}
            >
              {item.change === 'up' && '▲'}
              {item.change === 'down' && '▼'}
              {item.change === 'neutral' && '−'}
              {item.changeValue}
            </span>
          )}
        </>
      )}

      {/* Label + Value style */}
      {!isFinanceTicker && hasLabelValue && (
        <>
          <span className="font-medium">{item.label}</span>
          <span className="opacity-60">:</span>
          <span className="font-bold">{item.value}</span>
        </>
      )}

      {/* Plain text content */}
      {!isFinanceTicker && !hasLabelValue && (
        <span>{item.content}</span>
      )}
    </div>
  );
}

// ============================================
// TICKER MANAGER HOOK
// ============================================
export interface UseTickerManagerOptions {
  initialItems?: TickerItem[];
  maxItems?: number;
  autoRemoveAfter?: number; // ms to auto-remove items (for live feeds)
}

export function useTickerManager(options: UseTickerManagerOptions = {}) {
  const { initialItems = [], maxItems = 100, autoRemoveAfter } = options;
  const [items, setItems] = useState<TickerItem[]>(initialItems);
  const timerRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Add item
  const addItem = useCallback((item: TickerItem) => {
    setItems((prev) => {
      const newItems = [...prev, item];
      // Trim if exceeds max
      if (newItems.length > maxItems) {
        return newItems.slice(-maxItems);
      }
      return newItems;
    });

    // Auto-remove timer
    if (autoRemoveAfter) {
      const timer = setTimeout(() => {
        removeItem(item.id);
      }, autoRemoveAfter);
      timerRefs.current.set(item.id, timer);
    }
  }, [maxItems, autoRemoveAfter]);

  // Add multiple items
  const addItems = useCallback((newItems: TickerItem[]) => {
    setItems((prev) => {
      const combined = [...prev, ...newItems];
      if (combined.length > maxItems) {
        return combined.slice(-maxItems);
      }
      return combined;
    });
  }, [maxItems]);

  // Remove item
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    
    // Clear timer if exists
    const timer = timerRefs.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerRefs.current.delete(id);
    }
  }, []);

  // Update item
  const updateItem = useCallback((id: string, updates: Partial<TickerItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);

  // Clear all
  const clearItems = useCallback(() => {
    setItems([]);
    timerRefs.current.forEach((timer) => clearTimeout(timer));
    timerRefs.current.clear();
  }, []);

  // Reorder item
  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      return newItems;
    });
  }, []);

  // Replace all items
  const setAllItems = useCallback((newItems: TickerItem[]) => {
    setItems(newItems.slice(0, maxItems));
  }, [maxItems]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return {
    items,
    addItem,
    addItems,
    removeItem,
    updateItem,
    clearItems,
    moveItem,
    setAllItems,
    itemCount: items.length,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a news ticker item
 */
export function createNewsItem(
  headline: string,
  source?: string,
  breaking?: boolean
): TickerItem {
  return {
    id: `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: headline,
    label: source,
    icon: breaking ? '🔴' : undefined,
    backgroundColor: breaking ? '#C41E3A' : undefined,
    color: breaking ? 'white' : undefined,
  };
}

/**
 * Create a stock/finance ticker item
 */
export function createStockItem(
  symbol: string,
  price: string | number,
  change: 'up' | 'down' | 'neutral',
  changeValue: string | number
): TickerItem {
  return {
    id: `stock-${symbol}-${Date.now()}`,
    content: symbol,
    label: symbol,
    value: typeof price === 'number' ? price.toFixed(2) : price,
    change,
    changeValue: typeof changeValue === 'number' 
      ? (change === 'up' ? '+' : '') + changeValue.toFixed(2) + '%'
      : changeValue,
  };
}

/**
 * Create a sports score ticker item
 */
export function createScoreItem(
  team1: string,
  score1: number,
  team2: string,
  score2: number,
  status?: string
): TickerItem {
  return {
    id: `score-${team1}-${team2}-${Date.now()}`,
    content: `${team1} ${score1} - ${score2} ${team2}`,
    label: `${team1} vs ${team2}`,
    value: `${score1} - ${score2}`,
    icon: status === 'live' ? '🔴' : undefined,
  };
}

/**
 * Create a social feed ticker item
 */
export function createSocialItem(
  username: string,
  message: string,
  platform: 'twitter' | 'instagram' | 'facebook' | 'youtube'
): TickerItem {
  const icons: Record<string, string> = {
    twitter: '𝕏',
    instagram: '📷',
    facebook: 'f',
    youtube: '▶',
  };

  return {
    id: `social-${platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: message,
    label: `@${username}`,
    icon: icons[platform],
  };
}

export default TickerElement;





