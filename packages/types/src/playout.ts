// Pulsar GFX Playout Types (Placeholder for future implementation)
// Types for controlling playback state and sending commands to Nova Player

import type { PlaybackStateType, PlaybackCommandType } from './database';

/**
 * Real-time playout state for a layer
 * This is synced via Supabase Realtime to Nova Player instances
 */
export interface PlayoutLayerState {
  layer_id: string;
  channel_id: string;

  // Current content
  template_id: string | null;
  page_id: string | null;

  // Playback state
  state: PlaybackStateType;

  // Animation timing
  animation_start_time: number | null; // Unix timestamp ms
  animation_phase: 'in' | 'hold' | 'loop' | 'out' | null;
  animation_progress: number; // 0-1

  // Data overrides (for live updates)
  data_override: Record<string, unknown> | null;

  // Timing
  hold_start_time: number | null;
  auto_out_at: number | null;

  // Sync info
  last_updated: number;
  sequence_number: number; // For ordering updates
}

/**
 * Command sent from Pulsar GFX to Nova Player
 */
export interface PlayoutCommand {
  id: string;
  channel_id: string;
  layer_id: string | null; // null = affects all layers

  // Command type
  command: PlaybackCommandType | ExtendedPlayoutCommand;

  // Target
  template_id: string | null;
  page_id: string | null;

  // Data
  data: Record<string, unknown> | null;

  // Transition override
  transition: string | null;
  transition_duration: number | null;

  // Timing
  execute_at: number | null; // Unix timestamp, null = immediate

  // Acknowledgment
  acknowledged: boolean;
  acknowledged_at: number | null;
  acknowledged_by: string | null; // Nova Player instance ID

  // Error handling
  error: string | null;
  retry_count: number;

  created_at: string;
}

/**
 * Extended command types beyond basic playback
 */
export type ExtendedPlayoutCommand =
  | 'preview' // Show in preview only
  | 'take' // Cut from preview to program
  | 'fade' // Fade between states
  | 'crossfade' // Crossfade to new content
  | 'update_data' // Update bindings without replay
  | 'seek' // Seek to position in loop/timeline
  | 'pause' // Pause animation
  | 'resume' // Resume animation
  | 'restart' // Restart from beginning
  | 'clear_all' // Clear all layers
  | 'emergency_clear'; // Immediate clear (no animation)

/**
 * Nova Player instance registration
 */
export interface NovaPlayerInstance {
  id: string;
  channel_id: string;

  // Identity
  name: string;
  hostname: string;

  // Capabilities
  capabilities: {
    max_layers: number;
    supports_ndi: boolean;
    supports_webrtc: boolean;
    supports_4k: boolean;
    gpu_info: string | null;
  };

  // Status
  status: 'online' | 'offline' | 'error' | 'busy';
  last_heartbeat: number;
  current_load: number; // CPU/GPU load 0-100

  // Error tracking
  last_error: string | null;
  error_count: number;

  // Connection info
  connected_at: string;
  disconnected_at: string | null;
}

/**
 * Heartbeat message from Nova Player
 */
export interface PlayerHeartbeat {
  instance_id: string;
  timestamp: number;

  // Current state
  layers: {
    layer_id: string;
    state: PlaybackStateType;
    template_id: string | null;
    fps: number;
    dropped_frames: number;
  }[];

  // Performance
  cpu_usage: number;
  memory_usage: number;
  gpu_usage: number;

  // Queue status
  pending_commands: number;
}

/**
 * Sync state between Pulsar GFX and Nova Player
 */
export interface PlayoutSyncState {
  channel_id: string;

  // Version tracking for conflict resolution
  server_version: number;
  client_version: number;

  // Full state snapshot
  layers: PlayoutLayerState[];

  // Pending commands not yet acknowledged
  pending_commands: string[];

  // Last successful sync
  last_sync: number;
  sync_latency: number; // ms
}
