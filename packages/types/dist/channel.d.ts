import type { PlaybackState } from './database';
/**
 * A Channel represents a single video output (e.g., "Program", "Preview", "CG1")
 * Each channel can have multiple layers, each showing different graphics.
 */
export interface PulsarChannel {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    output_config: ChannelOutputConfig;
    layers: ChannelLayerConfig[];
    is_live: boolean;
    preview_enabled: boolean;
    current_session_id: string | null;
    created_at: string;
    updated_at: string;
}
/**
 * Output configuration for a channel
 */
export interface ChannelOutputConfig {
    width: number;
    height: number;
    frame_rate: number;
    output_type: 'browser' | 'ndi' | 'webrtc' | 'srt';
    browser_url?: string;
    ndi_name?: string;
    ndi_groups?: string[];
    webrtc_server?: string;
    webrtc_stream_id?: string;
    srt_url?: string;
    srt_latency?: number;
    background_color: string;
    background_image?: string;
}
/**
 * Per-layer configuration within a channel
 */
export interface ChannelLayerConfig {
    layer_id: string;
    enabled: boolean;
    opacity: number;
    current_template_id: string | null;
    current_page_id: string | null;
    playback_state: PlaybackState | null;
    keyer: {
        enabled: boolean;
        type: 'luminance' | 'chroma' | 'linear';
        settings: Record<string, number>;
    } | null;
}
/**
 * A session tracks playback history and state for a channel
 */
export interface ChannelSession {
    id: string;
    channel_id: string;
    started_at: string;
    ended_at: string | null;
    operator_id: string | null;
    operator_name: string | null;
    events: ChannelSessionEvent[];
    stats: {
        pages_played: number;
        total_on_air_time: number;
        errors: number;
    };
}
/**
 * Event in a channel session (for logging/audit)
 */
export interface ChannelSessionEvent {
    id: string;
    timestamp: string;
    event_type: 'play' | 'out' | 'update' | 'error' | 'layer_change' | 'config_change';
    layer_id: string | null;
    template_id: string | null;
    page_id: string | null;
    data: Record<string, unknown> | null;
    error_message: string | null;
}
/**
 * Channel group for organizing multiple channels
 */
export interface ChannelGroup {
    id: string;
    name: string;
    description: string | null;
    channel_ids: string[];
    created_at: string;
}
//# sourceMappingURL=channel.d.ts.map