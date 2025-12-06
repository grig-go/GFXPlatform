import { create } from 'zustand';
import { supabase } from '@emergent-platform/supabase-client';
import { useUIPreferencesStore } from './uiPreferencesStore';
import { usePageStore } from './pageStore';
import { usePlayoutLogStore } from './playoutLogStore';

// Dev user ID for development (no auth)
const DEV_USER_ID = '00000000-0000-0000-0000-000000000002';

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
    projectName?: string
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
      const { data, error } = await supabase
        .from('pulsar_channels')
        .select('*')
        .order('channel_code');

      if (error) throw error;

      const channels: Channel[] = (data || []).map((c: any) => ({
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
            console.log('[channelStore] Restoring saved channel:', savedChannel.channelCode);
            set({ selectedChannel: savedChannel });
            return;
          }
        }
        // Otherwise auto-select first channel
        console.log('[channelStore] Auto-selecting first channel:', channels[0].channelCode);
        set({ selectedChannel: channels[0] });
        prefs.setSelectedChannelId(channels[0].id);
      }

      // Load channel states
      for (const channel of channels) {
        const { data: stateData } = await supabase
          .from('pulsar_channel_state')
          .select('*')
          .eq('channel_id', channel.id)
          .single();

        if (stateData) {
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
      }
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
    await get().sendCommand({
      type: 'initialize',
      channelId,
      projectId,
      forceReload: force,
    });

    // Update loaded project
    await supabase
      .from('pulsar_channels')
      .update({
        loaded_project_id: projectId,
        last_initialized: new Date().toISOString(),
      })
      .eq('id', channelId);
  },

  sendCommand: async (command) => {
    const channel = get().selectedChannel;
    if (!channel) throw new Error('No channel selected');

    const fullCommand: PlayerCommand = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operatorId: DEV_USER_ID,
      ...command,
      channelId: command.channelId || channel.id,
    };

    // First get current state to increment sequence
    const { data: currentState, error: fetchError } = await supabase
      .from('pulsar_channel_state')
      .select('command_sequence')
      .eq('channel_id', channel.id)
      .single();

    if (fetchError) {
      console.error('Failed to fetch channel state:', fetchError);
      throw fetchError;
    }

    const newSequence = (currentState?.command_sequence || 0) + 1;

    // Write to channel state (Nova Player picks up via realtime)
    const { error } = await supabase
      .from('pulsar_channel_state')
      .update({
        pending_command: fullCommand,
        command_sequence: newSequence,
        last_command: fullCommand,
        last_command_at: fullCommand.timestamp,
      })
      .eq('channel_id', channel.id);

    if (error) throw error;

    // Log command
    await supabase.from('pulsar_command_log').insert({
      organization_id: channel.organizationId,
      channel_id: channel.id,
      command_type: command.type,
      layer_index: command.layerIndex,
      page_id: command.pageId,
      payload: command.payload,
      trigger_source: 'manual',
    });
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
      operatorId: DEV_USER_ID,
      channelId,
      ...command,
    };

    console.log('Sending command to channel:', channelId, fullCommand);

    // First get current state to increment sequence
    const { data: currentState, error: fetchError } = await supabase
      .from('pulsar_channel_state')
      .select('command_sequence')
      .eq('channel_id', channelId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch channel state:', fetchError);
      // Channel state might not exist, try to create it
      if (fetchError.code === 'PGRST116') {
        console.log('Channel state not found, creating...');
        const { error: insertError } = await supabase
          .from('pulsar_channel_state')
          .insert({
            channel_id: channelId,
            pending_command: fullCommand,
            command_sequence: 1,
            last_command: fullCommand,
            last_command_at: fullCommand.timestamp,
          });
        if (insertError) {
          console.error('Failed to create channel state:', insertError);
          throw insertError;
        }
        console.log('Channel state created with command');
        return;
      }
      throw fetchError;
    }

    const newSequence = (currentState?.command_sequence || 0) + 1;

    // Write to channel state (Nova Player picks up via realtime)
    const { error } = await supabase
      .from('pulsar_channel_state')
      .update({
        pending_command: fullCommand,
        command_sequence: newSequence,
        last_command: fullCommand,
        last_command_at: fullCommand.timestamp,
      })
      .eq('channel_id', channelId);

    if (error) {
      console.error('Failed to update channel state:', error);
      throw error;
    }

    console.log('Command sent successfully, sequence:', newSequence);

    // Log command (don't throw on error, just log)
    const { error: logError } = await supabase.from('pulsar_command_log').insert({
      organization_id: channel.organizationId,
      channel_id: channelId,
      command_type: command.type,
      layer_index: command.layerIndex,
      page_id: command.pageId,
      payload: command.payload,
      trigger_source: 'manual',
    });

    if (logError) {
      console.warn('Failed to log command:', logError);
    }
  },

  playOnChannel: async (channelId, pageId, layerIndex, template, payload, pageName?: string, projectName?: string) => {
    const channel = get().channels.find((c) => c.id === channelId);
    console.log('[channelStore] playOnChannel called:', { channelId, pageId, layerIndex, pageName, projectName, channel: !!channel });

    // Fire-and-forget: Log events async without blocking command execution
    // This ensures logging doesn't affect graphics performance or FPS
    if (channel) {
      console.log('[channelStore] Logging playout event for channel:', channel.name);

      // End any active playout on this layer (mark as 'replaced')
      usePlayoutLogStore.getState().logStop({
        channelId,
        layerIndex,
        endReason: 'replaced',
      }).catch((err) => console.warn('Failed to log stop:', err));

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
        operatorId: DEV_USER_ID,
        triggerSource: 'manual',
      }).catch((err) => console.warn('Failed to log play:', err));
    } else {
      console.warn('[channelStore] Channel not found, skipping playout log');
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
    });
  },

  stopOnChannel: async (channelId, layerIndex, layerId) => {
    // Fire-and-forget: Log stop event async without blocking command execution
    usePlayoutLogStore.getState().logStop({
      channelId,
      layerIndex,
      endReason: 'manual',
    }).catch((err) => console.warn('Failed to log stop:', err));

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
            console.log('[channelStore] Channel went offline:', newData.id, newData.channel_code);

            // Reset on-air state for all pages assigned to this channel
            usePageStore.getState().resetPagesOnAirForChannel(newData.id);

            // End all active playout log entries for this channel (fire-and-forget)
            supabase.rpc('end_all_channel_playout', {
              p_channel_id: newData.id,
              p_end_reason: 'channel_offline',
            }).then(({ error }) => {
              if (error) console.warn('Failed to end playout logs:', error);
            });
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
