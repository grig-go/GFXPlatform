// Ticker Types for Broadcast Graphics

export type TickerMode = 'scroll' | 'flip' | 'fade' | 'slide';
export type TickerDirection = 'left' | 'right' | 'up' | 'down';

// Topic/Category types for topic badges
export type TickerTopic = 
  | 'news'
  | 'breaking'
  | 'sports'
  | 'finance'
  | 'weather'
  | 'entertainment'
  | 'politics'
  | 'tech'
  | 'health'
  | 'world'
  | 'local'
  | 'alert'
  | 'live'
  | 'custom';

// Topic badge styling configuration
export interface TopicBadgeStyle {
  label: string;
  backgroundColor: string;
  textColor: string;
  icon?: string;
  borderColor?: string;
  animation?: 'none' | 'pulse' | 'flash' | 'glow';
}

// Pre-defined topic badge styles
export const TOPIC_BADGE_STYLES: Record<TickerTopic, TopicBadgeStyle> = {
  news: {
    label: 'NEWS',
    backgroundColor: '#1E40AF',
    textColor: '#FFFFFF',
    icon: '📰',
  },
  breaking: {
    label: 'BREAKING',
    backgroundColor: '#DC2626',
    textColor: '#FFFFFF',
    icon: '🔴',
    animation: 'pulse',
  },
  sports: {
    label: 'SPORTS',
    backgroundColor: '#059669',
    textColor: '#FFFFFF',
    icon: '⚽',
  },
  finance: {
    label: 'FINANCE',
    backgroundColor: '#0D9488',
    textColor: '#FFFFFF',
    icon: '📈',
  },
  weather: {
    label: 'WEATHER',
    backgroundColor: '#0284C7',
    textColor: '#FFFFFF',
    icon: '🌤️',
  },
  entertainment: {
    label: 'ENTERTAINMENT',
    backgroundColor: '#7C3AED',
    textColor: '#FFFFFF',
    icon: '🎬',
  },
  politics: {
    label: 'POLITICS',
    backgroundColor: '#B91C1C',
    textColor: '#FFFFFF',
    icon: '🏛️',
  },
  tech: {
    label: 'TECH',
    backgroundColor: '#4F46E5',
    textColor: '#FFFFFF',
    icon: '💻',
  },
  health: {
    label: 'HEALTH',
    backgroundColor: '#10B981',
    textColor: '#FFFFFF',
    icon: '🏥',
  },
  world: {
    label: 'WORLD',
    backgroundColor: '#6366F1',
    textColor: '#FFFFFF',
    icon: '🌍',
  },
  local: {
    label: 'LOCAL',
    backgroundColor: '#F59E0B',
    textColor: '#000000',
    icon: '📍',
  },
  alert: {
    label: 'ALERT',
    backgroundColor: '#EF4444',
    textColor: '#FFFFFF',
    icon: '⚠️',
    animation: 'flash',
  },
  live: {
    label: 'LIVE',
    backgroundColor: '#DC2626',
    textColor: '#FFFFFF',
    icon: '🔴',
    animation: 'pulse',
  },
  custom: {
    label: 'CUSTOM',
    backgroundColor: '#6B7280',
    textColor: '#FFFFFF',
  },
};

export interface TickerItem {
  id: string;
  content: string;
  // Topic/Category for topic badge
  topic?: TickerTopic;
  customTopicStyle?: Partial<TopicBadgeStyle>;
  // Optional rich content
  icon?: string;
  label?: string;
  value?: string;
  color?: string;
  backgroundColor?: string;
  // For sports/finance tickers
  change?: 'up' | 'down' | 'neutral';
  changeValue?: string;
  // Custom component render
  component?: React.ComponentType<{ item: TickerItem }>;
}

export interface TickerConfig {
  // Display mode
  mode: TickerMode;
  direction: TickerDirection;
  
  // Timing
  speed: number; // pixels per second for scroll, ms for flip/fade
  pauseOnHover: boolean;
  delay: number; // delay between items (flip/fade mode)
  
  // Appearance
  gap: number; // space between items in scroll mode
  itemWidth?: number | 'auto'; // fixed width or auto for scroll
  visibleItems?: number; // for flip/fade modes
  
  // Animation
  easing: string;
  loop: boolean;
  
  // Scroll-specific
  gradient?: boolean;
  gradientWidth?: number;
  gradientColor?: string;
  
  // Flip-specific
  flipDuration?: number;
  
  // Styling
  className?: string;
  itemClassName?: string;
}

export const DEFAULT_TICKER_CONFIG: TickerConfig = {
  mode: 'scroll',
  direction: 'left',
  speed: 80,
  pauseOnHover: true,
  delay: 3000,
  gap: 60,
  itemWidth: 'auto',
  visibleItems: 1,
  easing: 'linear',
  loop: true,
  gradient: false,
  gradientWidth: 50,
  gradientColor: 'rgba(0, 0, 0, 0)',
  flipDuration: 500,
};

// Pre-built ticker templates
export interface TickerTemplate {
  id: string;
  name: string;
  description: string;
  config: Partial<TickerConfig>;
  itemTemplate: Partial<TickerItem>;
  styles: React.CSSProperties;
}

export const TICKER_TEMPLATES: TickerTemplate[] = [
  {
    id: 'news-scroll',
    name: 'News Ticker',
    description: 'Classic scrolling news headline ticker',
    config: {
      mode: 'scroll',
      direction: 'left',
      speed: 60,
      gap: 80,
      gradient: true,
      gradientWidth: 50,
    },
    itemTemplate: {},
    styles: {
      backgroundColor: '#C41E3A',
      color: 'white',
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
  },
  {
    id: 'sports-scores',
    name: 'Sports Scores',
    description: 'Flipping score display for live sports',
    config: {
      mode: 'flip',
      direction: 'up',
      speed: 400,
      delay: 5000,
      visibleItems: 1,
    },
    itemTemplate: {},
    styles: {
      backgroundColor: '#1a1a2e',
      color: 'white',
    },
  },
  {
    id: 'stock-ticker',
    name: 'Stock Ticker',
    description: 'Financial ticker with up/down indicators',
    config: {
      mode: 'scroll',
      direction: 'left',
      speed: 40,
      gap: 60,
      gradient: true,
    },
    itemTemplate: {
      change: 'neutral',
    },
    styles: {
      backgroundColor: '#0a0a0a',
      color: '#00ff00',
      fontFamily: 'monospace',
    },
  },
  {
    id: 'social-feed',
    name: 'Social Feed',
    description: 'Fading social media posts/comments',
    config: {
      mode: 'fade',
      direction: 'up',
      speed: 800,
      delay: 4000,
      visibleItems: 1,
    },
    itemTemplate: {},
    styles: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '8px',
    },
  },
  {
    id: 'alert-banner',
    name: 'Alert Banner',
    description: 'Sliding alert/breaking news banner',
    config: {
      mode: 'slide',
      direction: 'up',
      speed: 300,
      delay: 6000,
      visibleItems: 1,
    },
    itemTemplate: {},
    styles: {
      backgroundColor: '#FF0000',
      color: 'white',
      fontWeight: 'bold',
    },
  },
];

