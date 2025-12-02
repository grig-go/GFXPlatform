export type TickerMode = 'scroll' | 'flip' | 'fade' | 'slide';
export type TickerDirection = 'left' | 'right' | 'up' | 'down';
export type TickerTopic = 'news' | 'breaking' | 'sports' | 'finance' | 'weather' | 'entertainment' | 'politics' | 'tech' | 'health' | 'world' | 'local' | 'alert' | 'live' | 'custom';
export interface TopicBadgeStyle {
    label: string;
    backgroundColor: string;
    textColor: string;
    icon?: string;
    borderColor?: string;
    animation?: 'none' | 'pulse' | 'flash' | 'glow';
}
export declare const TOPIC_BADGE_STYLES: Record<TickerTopic, TopicBadgeStyle>;
export interface TickerItem {
    id: string;
    content: string;
    topic?: TickerTopic;
    customTopicStyle?: Partial<TopicBadgeStyle>;
    icon?: string;
    label?: string;
    value?: string;
    color?: string;
    backgroundColor?: string;
    change?: 'up' | 'down' | 'neutral';
    changeValue?: string;
}
export interface TickerConfig {
    mode: TickerMode;
    direction: TickerDirection;
    speed: number;
    pauseOnHover: boolean;
    delay: number;
    gap: number;
    itemWidth?: number | 'auto';
    visibleItems?: number;
    easing: string;
    loop: boolean;
    gradient?: boolean;
    gradientWidth?: number;
    gradientColor?: string;
    flipDuration?: number;
    className?: string;
    itemClassName?: string;
}
export declare const DEFAULT_TICKER_CONFIG: TickerConfig;
export interface TickerTemplate {
    id: string;
    name: string;
    description: string;
    config: Partial<TickerConfig>;
    itemTemplate: Partial<TickerItem>;
    styles: Record<string, string | number>;
}
export declare const TICKER_TEMPLATES: TickerTemplate[];
//# sourceMappingURL=ticker.d.ts.map