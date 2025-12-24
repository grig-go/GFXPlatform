// Pulsar GFX Channel Types (Placeholder for future implementation)
// A "Channel" represents a video output destination with multiple layers

/**
 * Playback state for a layer
 */
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped' | 'error';

/**
 * A Channel represents a single video output (e.g., "Program", "Preview", "CG1")
 * Each channel can have multiple layers, each showing different graphics.
 */
export interface PulsarChannel {
  id: string;
  project_id: string;
  name: string;
  description: string | null;

  // Output configuration
  output_config: ChannelOutputConfig;

  // Layer configuration (references layers from Nova GFX project)
  layers: ChannelLayerConfig[];

  // State
  is_live: boolean;
  preview_enabled: boolean;

  // Session tracking
  current_session_id: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Output configuration for a channel
 */
export interface ChannelOutputConfig {
  // Resolution
  width: number;
  height: number;
  frame_rate: number;

  // Output type
  output_type: 'browser' | 'ndi' | 'webrtc' | 'srt';

  // Browser output settings
  browser_url?: string;

  // NDI settings
  ndi_name?: string;
  ndi_groups?: string[];

  // WebRTC settings
  webrtc_server?: string;
  webrtc_stream_id?: string;

  // SRT settings
  srt_url?: string;
  srt_latency?: number;

  // Background
  background_color: string;
  background_image?: string;
}

/**
 * Per-layer configuration within a channel
 */
export interface ChannelLayerConfig {
  layer_id: string;

  // Override layer settings for this channel
  enabled: boolean;
  opacity: number;

  // Current state on this layer
  current_template_id: string | null;
  current_page_id: string | null;
  playback_state: PlaybackState | null;

  // Keyer settings (for downstream keying)
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

  // Session timing
  started_at: string;
  ended_at: string | null;

  // Operator
  operator_id: string | null;
  operator_name: string | null;

  // Playback log
  events: ChannelSessionEvent[];

  // Statistics
  stats: {
    pages_played: number;
    total_on_air_time: number; // ms
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
