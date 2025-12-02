import type { TickerTopicType } from './database';
/**
 * A Page is a runtime instance of a Template with filled-in data values.
 * In Pulsar GFX, operators create Pages from Templates and populate the bindings.
 */
export interface PulsarPage {
    id: string;
    template_id: string;
    channel_id: string | null;
    playlist_id: string | null;
    name: string;
    description: string | null;
    field_values: Record<string, PageFieldValue>;
    data_bindings: PageDataBinding[];
    state: 'ready' | 'on-air' | 'queued' | 'archived';
    last_played_at: string | null;
    play_count: number;
    scheduled_at: string | null;
    auto_play: boolean;
    auto_out_delay: number | null;
    tags: string[];
    sort_order: number;
    created_at: string;
    updated_at: string;
    created_by: string | null;
}
/**
 * Value for a single field/binding in a Page
 */
export interface PageFieldValue {
    binding_key: string;
    value: string | number | boolean | null;
    formatted_value?: string;
    is_default: boolean;
}
/**
 * Data binding for live/dynamic content
 */
export interface PageDataBinding {
    id: string;
    binding_key: string;
    source_type: 'rest' | 'websocket' | 'supabase' | 'sheets' | 'manual';
    source_config: {
        url?: string;
        table?: string;
        query?: string;
        refresh_interval?: number;
        field_path?: string;
    };
    transform?: string;
    fallback_value?: string;
    last_updated_at: string | null;
}
/**
 * Playlist for organizing pages in sequence
 */
export interface PulsarPlaylist {
    id: string;
    channel_id: string;
    name: string;
    description: string | null;
    page_ids: string[];
    loop: boolean;
    auto_advance: boolean;
    default_hold_duration: number;
    current_index: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
/**
 * Loop configuration for continuous content (tickers, carousels)
 */
export interface PulsarLoop {
    id: string;
    channel_id: string;
    layer_id: string;
    name: string;
    loop_type: 'ticker' | 'carousel' | 'custom';
    items: PulsarLoopItem[];
    config: {
        speed?: number;
        direction?: 'left' | 'right' | 'up' | 'down';
        transition?: string;
        hold_duration?: number;
    };
    is_running: boolean;
    created_at: string;
    updated_at: string;
}
export interface PulsarLoopItem {
    id: string;
    content: string;
    topic?: TickerTopicType;
    metadata?: Record<string, unknown>;
    sort_order: number;
    enabled: boolean;
}
//# sourceMappingURL=page.d.ts.map