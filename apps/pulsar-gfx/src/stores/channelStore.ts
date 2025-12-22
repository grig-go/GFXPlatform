import { create } from 'zustand';
import { supabase, directRestUpdate, directRestSelect } from '@emergent-platform/supabase-client';
import { useUIPreferencesStore } from './uiPreferencesStore';
import { usePageStore } from './pageStore';
import { usePlayoutLogStore } from './playoutLogStore';

// Note: We don't use a fake DEV_USER_ID anymore since it caused 409 conflicts
// The operator_id field should be null when running without authentication

// Edge function helper for reliable channel loading (no stale connections)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchChannelsViaEdgeFunction(organizationId?: string): Promise<any[]> {
  try {
    const url = new URL(`${SUPABASE_URL}/functions/v1/pulsar-channels`);
    if (organizationId) {
      url.searchParams.set('organization_id', organizationId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[channelStore] Edge function error:', result);
      return [];
    }
    return result.data || [];
  } catch (err) {
    console.error('[channelStore] Network error:', err);
    return [];
  }
}

export interface Channel {
  id: string;
  organizationId: string;
  name: string;
  channelCode: string;
  channelType: 'graphics' | 'ticker' | 'fullscreen' | 'preview';
  playerUrl?: string;
  playerStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastHeartbeat?: Date;
  loadedProjectId?: string;
  lastInitialized?: Date;
  layerCount: number;
  layerConfig: LayerConfig[];
  assignedOperators: string[];
  isLocked: boolean;
  lockedBy?: string;
  autoInitializeOnConnect: boolean;
  autoInitializeOnPublish: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LayerConfig {
  index: number;
  name: string;
  allowedTypes: string[];
}

export interface ChannelState {
  id: string;
  channelId: string;
  layers: LayerState[];
  pendingCommand?: PlayerCommand;
  commandSequence: number;
  lastCommand?: PlayerCommand;
  lastCommandAt?: Date;
  lastAcknowledgedAt?: Date;
  controlledBy?: string;
  controlLockedAt?: Date;
  updatedAt: Date;
}

export interface LayerState {
  index: number;
  state: 'empty' | 'loading' | 'ready' | 'on_air';
  pageId?: string;
  pageName?: string;
  templateName?: string;
  onAirSince?: Date;
}

export interface PlayerCommand {
  id: string;
  type: 'initialize' | 'load' | 'play' | 'update' | 'stop' | 'clear' | 'clear_all';
  channelId: string;
  layerIndex?: number;
  pageId?: string;
  projectId?: string;
  forceReload?: boolean;
  // Data binding support
  bindings?: Array<{
    id: string;
    element_id: string;
    template_id: string;
    binding_key: string;
    target_property: string;
    binding_type: string;
    formatter_options?: Record<string, any> | null;
  }>;
  currentRecord?: Record<string, unknown> | null;
  // Template info for Nova Player
  template?: {
    id: string;
    name: string;
    projectId?: string;
    layerId?: string;
    // Elements with FULL data for proper rendering (position, transform, etc.)
    elements?: Array<{
      id: string;
      template_id: string;
      name: string;
      element_id?: string;
      element_type?: string;
      parent_element_id?: string | null;
      sort_order?: number;
      z_index?: number;
      position_x: number;
      position_y: number;
      width?: number | null;
      height?: number | null;
      rotation?: number;
      scale_x?: number;
      scale_y?: number;
      anchor_x?: number;
      anchor_y?: number;
      opacity?: number;
      content: any;
      styles?: Record<string, any>;
      classes?: string[];
      visible?: boolean;
      locked?: boolean;
    }>;
    // Animation data for direct rendering
    animations?: any[];
    keyframes?: any[];
  };
  payload?: Record<string, any>;
  timestamp: string;
  operatorId: string;
}

interface ChannelStore {
  channels: Channel[];
  selectedChannel: Channel | null;
  channelStates: Map<string, ChannelState>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadChannels: () => Promise<void>;
  selectChannel: (channelId: string) => void;
  initializeChannel: (channelId: string, projectId: string, force?: boolean) => Promise<void>;
  sendCommand: (command: Omit<PlayerCommand, 'id' | 'timestamp' | 'operatorId'>) => Promise<void>;
  sendCommandToChannel: (channelId: string, command: Omit<PlayerCommand, 'id' | 'timestamp' | 'operatorId' | 'channelId'>) => Promise<void>;

  // Playout shortcuts
  play: (pageId: string, layerIndex: number) => Promise<void>;
  stop: (layerIndex: number) => Promise<void>;
  update: (layerIndex: number, payload: Record<string, any>) => Promise<void>;
  clear: (layerIndex: number) => Promise<void>;
  clearAll: () => Promise<void>;

  // Per-channel playout (for playlist controls)
  playOnChannel: (
    channelId: string,
    pageId: string,
    layerIndex: number,
    template: {
      id: string;
      name: string;
      projectId: string;
      layerId?: string;
      elements?: Array<{
        id: string;
        template_id: string;
        name: string;
        element_id?: string;
        element_type?: string;
        parent_element_id?: string | null;
        sort_order?: number;
        z_index?: number;
        position_x: number;
        position_y: number;
        width?: number | null;
        height?: number | null;
        rotation?: number;
        scale_x?: number;
        scale_y?: number;
        anchor_x?: number;
        anchor_y?: number;
        opacity?: number;
        content: any;
        styles?: Record<string, any>;
        classes?: string[];
        visible?: boolean;
        locked?: boolean;
      }>;
      animations?: any[];
      keyframes?: any[];
    },
    payload?: Record<string, any>,
    pageName?: string,
    projectName?: string,
    bindings?: Array<{
      id: string;
      element_id: string;
      template_id: string;
      binding_key: string;
      target_property: string;
      binding_type: string;
      formatter_options?: Record<string, any> | null;
    }>,
    currentRecord?: Record<string, unknown> | null
  ) => Promise<void>;
  stopOnChannel: (channelId: string, layerIndex: number, layerId?: string) => Promise<void>;

  // Realtime subscription
  subscribeToChannelState: (channelId: string) => () => void;
  subscribeToChannelStatus: () => () => void;
}

export const useChannelStore = create<ChannelStore>((set, get) => ({
  channels: [],
  selectedChannel: null,
  channelStates: new Map(),
  isLoading: false,
  error: null,

  loadChannels: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use edge function for reliable channel loading (no stale connections!)
      console.log('[channelStore] Loading channels via edge function...');
      const rawData = await fetchChannelsViaEdgeFunction();

      // Sort by channel_code
      const data = rawData.sort((a: any, b: any) =>
        (a.channel_code || '').localeCompare(b.channel_code || '')
      );

      const channels: Channel[] = data.map((c: any) => ({
        id: c.id,
        organizationId: c.organization_id,
        name: c.name,
        channelCode: c.channel_code,
        channelType: c.channel_type,
        playerUrl: c.player_url,
        playerStatus: c.player_status,
        lastHeartbeat: c.last_heartbeat ? new Date(c.last_heartbeat) : undefined,
        loadedProjectId: c.loaded_project_id,
        lastInitialized: c.last_initialized ? new Date(c.last_initialized) : undefined,
        layerCount: c.layer_count,
        layerConfig: c.layer_config || [],
        assignedOperators: c.assigned_operators || [],
        isLocked: c.is_locked,
        lockedBy: c.locked_by,
        autoInitializeOnConnect: c.auto_initialize_on_connect,
        autoInitializeOnPublish: c.auto_initialize_on_publish,
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at),
      }));

      set({ channels, isLoading: false });

      // Try to restore saved channel selection from preferences
      const prefs = useUIPreferencesStore.getState();
      const savedChannelId = prefs.selectedChannelId;

      if (channels.length > 0 && !get().selectedChannel) {
        // Try to restore the saved channel
        if (savedChannelId) {
          const savedChannel = channels.find(c => c.id === savedChannelId);
          if (savedChannel) {
            set({ selectedChannel: savedChannel });
            return;
          }
        }
        // Otherwise auto-select first channel
        set({ selectedChannel: channels[0] });
        prefs.setSelectedChannelId(channels[0].id);
      }

      // Load channel states (in parallel for better performance)
      const statePromises = channels.map(async (channel) => {
        const stateResult = await directRestSelect<any>(
          'pulsar_channel_state',
          '*',
          { column: 'channel_id', value: channel.id },
          3000
        );

        if (stateResult.data?.[0]) {
          const stateData = stateResult.data[0];
          const state: ChannelState = {
            id: stateData.id,
            channelId: stateData.channel_id,
            layers: stateData.layers || [],
            pendingCommand: stateData.pending_command,
            commandSequence: stateData.command_sequence,
            lastCommand: stateData.last_command,
            lastCommandAt: stateData.last_command_at ? new Date(stateData.last_command_at) : undefined,
            lastAcknowledgedAt: stateData.last_acknowledged_at ? new Date(stateData.last_acknowledged_at) : undefined,
            controlledBy: stateData.controlled_by,
            controlLockedAt: stateData.control_locked_at ? new Date(stateData.control_locked_at) : undefined,
            updatedAt: new Date(stateData.updated_at),
          };
          get().channelStates.set(channel.id, state);
        }
      });

      await Promise.all(statePromises);
    } catch (error) {
      console.error('Failed to load channels:', error);
      set({ error: 'Failed to load channels', isLoading: false });
    }
  },

  selectChannel: (channelId: string) => {
    const channel = get().channels.find((c) => c.id === channelId);
    set({ selectedChannel: channel || null });
    // Save to preferences
    const prefs = useUIPreferencesStore.getState();
    prefs.setSelectedChannelId(channelId);
  },

  initializeChannel: async (channelId, projectId, force = false) => {
    await get().sendCommandToChannel(channelId, {
      type: 'initialize',
      projectId,
      forceReload: force,
    });

    // Update loaded project using direct REST API
    await directRestUpdate(
      'pulsar_channels',
      {
        loaded_project_id: projectId,
        last_initialized: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { column: 'id', value: channelId },
      5000
    );
  },

  sendCommand: async (command) => {
    const channel = get().selectedChannel;
    if (!channel) throw new Error('No channel selected');

    const fullCommand: PlayerCommand = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operatorId: undefined,
      ...command,
      channelId: command.channelId || channel.id,
    };

    // Use direct REST API for reliable command delivery
    // Step 1: Get current sequence
    const stateResult = await directRestSelect<{ command_sequence: number }>(
      'pulsar_channel_state',
      'command_sequence',
      { column: 'channel_id', value: channel.id },
      5000
    );

    if (stateResult.error) {
      console.error('[channelStore] Failed to fetch channel state:', stateResult.error);
      throw new Error(stateResult.error);
    }

    const currentSequence = stateResult.data?.[0]?.command_sequence || 0;
    const newSequence = currentSequence + 1;

    // Step 2: Send command via direct REST
    const updateResult = await directRestUpdate(
      'pulsar_channel_state',
      {
        pending_command: fullCommand,
        command_sequence: newSequence,
        last_command: fullCommand,
        last_command_at: fullCommand.timestamp,
        updated_at: new Date().toISOString(),
      },
      { column: 'channel_id', value: channel.id },
      5000
    );

    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Command send failed');
    }

    // Log command (fire and forget - don't block on this)
    supabase.from('pulsar_command_log').insert({
      organization_id: channel.organizationId,
      channel_id: channel.id,
      command_type: command.type,
      layer_index: command.layerIndex,
      page_id: command.pageId,
      payload: command.payload,
      trigger_source: 'manual',
    }).then(() => {});
  },

  play: async (pageId, layerIndex) => {
    await get().sendCommand({
      type: 'play',
      channelId: get().selectedChannel!.id,
      layerIndex,
      pageId,
    });
  },

  stop: async (layerIndex) => {
    await get().sendCommand({
      type: 'stop',
      channelId: get().selectedChannel!.id,
      layerIndex,
    });
  },

  update: async (layerIndex, payload) => {
    await get().sendCommand({
      type: 'update',
      channelId: get().selectedChannel!.id,
      layerIndex,
      payload,
    });
  },

  clear: async (layerIndex) => {
    await get().sendCommand({
      type: 'clear',
      channelId: get().selectedChannel!.id,
      layerIndex,
    });
  },

  clearAll: async () => {
    await get().sendCommand({
      type: 'clear_all',
      channelId: get().selectedChannel!.id,
    });
  },

  sendCommandToChannel: async (channelId, command) => {
    const channel = get().channels.find((c) => c.id === channelId);
    if (!channel) {
      console.error('Channel not found:', channelId);
      throw new Error('Channel not found');
    }

    const fullCommand: PlayerCommand = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operatorId: undefined,
      channelId,
      ...command,
    };

    // Use direct REST API for reliable command delivery
    // Step 1: Get current sequence
    const stateResult = await directRestSelect<{ command_sequence: number }>(
      'pulsar_channel_state',
      'command_sequence',
      { column: 'channel_id', value: channelId },
      5000
    );

    if (stateResult.error) {
      console.error('[channelStore] Failed to fetch channel state:', stateResult.error);
      throw new Error(stateResult.error);
    }

    const currentSequence = stateResult.data?.[0]?.command_sequence || 0;
    const newSequence = currentSequence + 1;

    // Step 2: Send command via direct REST
    const updateResult = await directRestUpdate(
      'pulsar_channel_state',
      {
        pending_command: fullCommand,
        command_sequence: newSequence,
        last_command: fullCommand,
        last_command_at: fullCommand.timestamp,
        updated_at: new Date().toISOString(),
      },
      { column: 'channel_id', value: channelId },
      5000
    );

    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Command send failed');
    }

    // Log command (fire and forget - don't block on this)
    supabase.from('pulsar_command_log').insert({
      organization_id: channel.organizationId,
      channel_id: channelId,
      command_type: command.type,
      layer_index: command.layerIndex,
      page_id: command.pageId,
      payload: command.payload,
      trigger_source: 'manual',
    }).then(() => {});
  },

  playOnChannel: async (channelId, pageId, layerIndex, template, payload, pageName?: string, projectName?: string, bindings?, currentRecord?) => {
    const channel = get().channels.find((c) => c.id === channelId);

    // Fire-and-forget: Log events async without blocking command execution
    // This ensures logging doesn't affect graphics performance or FPS
    if (channel) {

      // End any active playout on this layer (mark as 'replaced')
      usePlayoutLogStore.getState().logStop({
        channelId,
        layerIndex,
        endReason: 'replaced',
      }).catch(() => {});

      // Log the new play event
      const layerConfig = channel.layerConfig?.find((l) => l.index === layerIndex);
      usePlayoutLogStore.getState().logPlay({
        organizationId: channel.organizationId,
        channelId,
        channelCode: channel.channelCode,
        channelName: channel.name,
        layerIndex,
        layerName: layerConfig?.name,
        pageId,
        pageName: pageName || 'Unknown Page',
        templateId: template.id,
        templateName: template.name,
        projectId: template.projectId,
        projectName: projectName,
        payload: payload,
        operatorId: undefined,
        triggerSource: 'manual',
      }).catch(() => {});
    }

    await get().sendCommandToChannel(channelId, {
      type: 'play',
      layerIndex,
      pageId,
      // Nova Player expects template at command level
      // Include elements, animations, keyframes for templates that may not be in DB yet
      template: {
        id: template.id,
        name: template.name,
        projectId: template.projectId,
        layerId: template.layerId,
        elements: template.elements,
        animations: template.animations,
        keyframes: template.keyframes,
      },
      payload,
      // Data binding support - include bindings and current record if available
      bindings,
      currentRecord,
    });
  },

  stopOnChannel: async (channelId, layerIndex, layerId) => {
    // Fire-and-forget: Log stop event async without blocking command execution
    usePlayoutLogStore.getState().logStop({
      channelId,
      layerIndex,
      endReason: 'manual',
    }).catch(() => {});

    await get().sendCommandToChannel(channelId, {
      type: 'stop',
      layerIndex,
      // Send layerId directly - Nova Player uses this to identify the correct layer
      ...(layerId && { layerId }),
    });
  },

  subscribeToChannelState: (channelId: string) => {
    const subscription = supabase
      .channel(`channel-state-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pulsar_channel_state',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: any) => {
          if (payload.new) {
            const stateData = payload.new as any;
            const state: ChannelState = {
              id: stateData.id,
              channelId: stateData.channel_id,
              layers: stateData.layers || [],
              pendingCommand: stateData.pending_command,
              commandSequence: stateData.command_sequence,
              lastCommand: stateData.last_command,
              lastCommandAt: stateData.last_command_at ? new Date(stateData.last_command_at) : undefined,
              lastAcknowledgedAt: stateData.last_acknowledged_at ? new Date(stateData.last_acknowledged_at) : undefined,
              controlledBy: stateData.controlled_by,
              controlLockedAt: stateData.control_locked_at ? new Date(stateData.control_locked_at) : undefined,
              updatedAt: new Date(stateData.updated_at),
            };
            get().channelStates.set(channelId, state);
            set({ channelStates: new Map(get().channelStates) });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  subscribeToChannelStatus: () => {
    // Subscribe to all channel status changes (player_status updates)
    const subscription = supabase
      .channel('channel-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pulsar_channels',
        },
        (payload: any) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // Check if player_status changed to 'disconnected'
          if (newData.player_status === 'disconnected' && oldData?.player_status !== 'disconnected') {

            // Reset on-air state for all pages assigned to this channel
            usePageStore.getState().resetPagesOnAirForChannel(newData.id);

            // End all active playout log entries for this channel (fire-and-forget)
            supabase.rpc('end_all_channel_playout', {
              p_channel_id: newData.id,
              p_end_reason: 'channel_offline',
            }).then(() => {});
          }

          // Update the channel in our local state
          const updatedChannel: Channel = {
            id: newData.id,
            organizationId: newData.organization_id,
            name: newData.name,
            channelCode: newData.channel_code,
            channelType: newData.channel_type,
            playerUrl: newData.player_url,
            playerStatus: newData.player_status,
            lastHeartbeat: newData.last_heartbeat ? new Date(newData.last_heartbeat) : undefined,
            loadedProjectId: newData.loaded_project_id,
            lastInitialized: newData.last_initialized ? new Date(newData.last_initialized) : undefined,
            layerCount: newData.layer_count,
            layerConfig: newData.layer_config || [],
            assignedOperators: newData.assigned_operators || [],
            isLocked: newData.is_locked,
            lockedBy: newData.locked_by,
            autoInitializeOnConnect: newData.auto_initialize_on_connect,
            autoInitializeOnPublish: newData.auto_initialize_on_publish,
            createdAt: new Date(newData.created_at),
            updatedAt: new Date(newData.updated_at),
          };

          set({
            channels: get().channels.map((c) =>
              c.id === updatedChannel.id ? updatedChannel : c
            ),
            // Update selectedChannel if it's the one that changed
            selectedChannel: get().selectedChannel?.id === updatedChannel.id
              ? updatedChannel
              : get().selectedChannel,
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
}));
