import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Marquee from 'react-fast-marquee';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { TickerItem, TickerConfig, TickerMode } from '@/types/ticker';
import { DEFAULT_TICKER_CONFIG } from '@/types/ticker';
import { cn } from '@/lib/utils';

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
  const direction = config.direction === 'right' ? 'right' : 'left';

  return (
    <div className={cn('overflow-hidden', className)} style={style}>
      <Marquee
        speed={config.speed}
        direction={direction}
        pauseOnHover={config.pauseOnHover}
        gradient={config.gradient}
        gradientWidth={config.gradientWidth}
        gradientColor={config.gradientColor}
        loop={config.loop ? 0 : 1}
        className="h-full"
      >
        {items.map((item, index) => (
          <TickerItemRenderer
            key={item.id || index}
            item={item}
            config={config}
            onClick={onItemClick}
            style={{ marginRight: config.gap }}
          />
        ))}
      </Marquee>
    </div>
  );
}

// ============================================
// FLIP TICKER (Vertical flip between items)
// ============================================
function FlipTicker({ items, config, className, style, onItemClick }: TickerModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (!config.loop && currentIndex >= items.length - 1) return;

    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setIsFlipping(false);
      }, config.flipDuration || 500);
    }, config.delay);

    return () => clearInterval(interval);
  }, [items.length, config.delay, config.flipDuration, config.loop, currentIndex]);

  const currentItem = items[currentIndex];
  const direction = config.direction === 'down' ? 'down' : 'up';

  return (
    <div className={cn('relative overflow-hidden', className)} style={style}>
      <div
        className={cn(
          'transition-all duration-500 ease-out',
          isFlipping && direction === 'up' && 'transform -translate-y-full opacity-0',
          isFlipping && direction === 'down' && 'transform translate-y-full opacity-0'
        )}
        style={{
          transitionDuration: `${config.flipDuration || 500}ms`,
          transitionTimingFunction: config.easing,
        }}
      >
        <TickerItemRenderer
          item={currentItem}
          config={config}
          onClick={onItemClick}
        />
      </div>
      
      {/* Progress indicator */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
        {items.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-colors',
              idx === currentIndex ? 'bg-white' : 'bg-white/30'
            )}
          />
        ))}
      </div>
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

  return (
    <div
      className={cn(
        'flex items-center gap-3 h-full px-4 whitespace-nowrap',
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
        <span className="text-lg">{item.icon}</span>
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







