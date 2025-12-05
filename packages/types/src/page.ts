// Pulsar GFX Page Types (Placeholder for future implementation)
// A "Page" is an instance of a Template with specific content values

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

  // Binding values - key is the binding_key, value is the user-entered content
  field_values: Record<string, PageFieldValue>;

  // Data source bindings (for live data)
  data_bindings: PageDataBinding[];

  // Playback state
  state: 'ready' | 'on-air' | 'queued' | 'archived';
  last_played_at: string | null;
  play_count: number;

  // Scheduling
  scheduled_at: string | null;
  auto_play: boolean;
  auto_out_delay: number | null; // ms, null = manual out

  // Metadata
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
  // For images, this could be a URL or base64
  // For text, the actual text content
  // For numbers, the numeric value
  // etc.
  formatted_value?: string; // After applying formatter
  is_default: boolean; // Using template's default value
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
    refresh_interval?: number; // ms
    field_path?: string; // JSONPath or similar to extract value
  };
  transform?: string; // Optional JS expression to transform the value
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

  // Page ordering
  page_ids: string[];

  // Playback settings
  loop: boolean;
  auto_advance: boolean;
  default_hold_duration: number; // ms

  // State
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

  // Content type
  loop_type: 'ticker' | 'carousel' | 'custom';

  // Items in the loop
  items: PulsarLoopItem[];

  // Configuration
  config: {
    speed?: number;
    direction?: 'left' | 'right' | 'up' | 'down';
    transition?: string;
    hold_duration?: number;
  };

  // State
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
