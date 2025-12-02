import type { PlaybackStateType, PlaybackCommandType } from './database';
/**
 * Real-time playout state for a layer
 * This is synced via Supabase Realtime to Nova Player instances
 */
export interface PlayoutLayerState {
    layer_id: string;
    channel_id: string;
    template_id: string | null;
    page_id: string | null;
    state: PlaybackStateType;
    animation_start_time: number | null;
    animation_phase: 'in' | 'hold' | 'loop' | 'out' | null;
    animation_progress: number;
    data_override: Record<string, unknown> | null;
    hold_start_time: number | null;
    auto_out_at: number | null;
    last_updated: number;
    sequence_number: number;
}
/**
 * Command sent from Pulsar GFX to Nova Player
 */
export interface PlayoutCommand {
    id: string;
    channel_id: string;
    layer_id: string | null;
    command: PlaybackCommandType | ExtendedPlayoutCommand;
    template_id: string | null;
    page_id: string | null;
    data: Record<string, unknown> | null;
    transition: string | null;
    transition_duration: number | null;
    execute_at: number | null;
    acknowledged: boolean;
    acknowledged_at: number | null;
    acknowledged_by: string | null;
    error: string | null;
    retry_count: number;
    created_at: string;
}
/**
 * Extended command types beyond basic playback
 */
export type ExtendedPlayoutCommand = 'preview' | 'take' | 'fade' | 'crossfade' | 'update_data' | 'seek' | 'pause' | 'resume' | 'restart' | 'clear_all' | 'emergency_clear';
/**
 * Nova Player instance registration
 */
export interface NovaPlayerInstance {
    id: string;
    channel_id: string;
    name: string;
    hostname: string;
    capabilities: {
        max_layers: number;
        supports_ndi: boolean;
        supports_webrtc: boolean;
        supports_4k: boolean;
        gpu_info: string | null;
    };
    status: 'online' | 'offline' | 'error' | 'busy';
    last_heartbeat: number;
    current_load: number;
    last_error: string | null;
    error_count: number;
    connected_at: string;
    disconnected_at: string | null;
}
/**
 * Heartbeat message from Nova Player
 */
export interface PlayerHeartbeat {
    instance_id: string;
    timestamp: number;
    layers: {
        layer_id: string;
        state: PlaybackStateType;
        template_id: string | null;
        fps: number;
        dropped_frames: number;
    }[];
    cpu_usage: number;
    memory_usage: number;
    gpu_usage: number;
    pending_commands: number;
}
/**
 * Sync state between Pulsar GFX and Nova Player
 */
export interface PlayoutSyncState {
    channel_id: string;
    server_version: number;
    client_version: number;
    layers: PlayoutLayerState[];
    pending_commands: string[];
    last_sync: number;
    sync_latency: number;
}
//# sourceMappingURL=playout.d.ts.map