import { useState, useEffect } from 'react';
import {
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@emergent-platform/ui';
import { useChannelStore } from '@/stores/channelStore';
import { useProjectStore } from '@/stores/projectStore';
import { supabase, directRestUpdate, directRestSelect } from '@emergent-platform/supabase-client';
import { Circle, Send, Square, Radio, ExternalLink, RefreshCw } from 'lucide-react';

// Nova GFX player URL - configurable via environment variable
// Fallback uses VITE_NOVA_GFX_PORT (3003) for local dev
const NOVA_GFX_PORT = import.meta.env.VITE_NOVA_GFX_PORT || '3003';
const NOVA_GFX_URL = import.meta.env.VITE_NOVA_PREVIEW_URL || `http://localhost:${NOVA_GFX_PORT}`;

export function StatusBar() {
  const { channels, selectedChannel, selectChannel, loadChannels } = useChannelStore();
  const { currentProject } = useProjectStore();
  const [isPublishing, setIsPublishing] = useState(false);

  // Subscribe to realtime channel status updates + polling fallback
  useEffect(() => {
    if (!supabase) {
      return;
    }

    let realtimeWorking = false;

    const subscription = supabase
      .channel('statusbar-channel-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pulsar_channels',
        },
        () => {
          realtimeWorking = true;
          // Reload channels when status changes
          loadChannels();
        }
      )
      .subscribe((status, err) => {
        if (status === 'TIMED_OUT') {
          console.warn('[StatusBar] Subscription timed out - Realtime may not be enabled');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[StatusBar] Subscription error:', err?.message);
        }
      });

    // Polling fallback - refresh channels every 5 seconds to ensure status is accurate
    // This handles cases where Realtime is not enabled or unreliable
    const pollInterval = setInterval(() => {
      loadChannels();
    }, 5000);

    // Also do an immediate refresh after a short delay
    // This catches the initial state when Nova Player connects
    setTimeout(() => {
      loadChannels();
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [loadChannels]);

  // Handle channel click - select channel
  const handleChannelClick = (channelId: string) => {
    selectChannel(channelId);
  };

  // Open player window for a channel (always opens/refreshes the window)
  const openPlayerWindow = (channelId: string) => {
    const playerUrl = `${NOVA_GFX_URL}/player/${channelId}`;
    window.open(playerUrl, `nova-player-${channelId}`, 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes');
  };

  // Publish to a single channel
  // forceOpen: if true, always opens the player window (for recovery from bad states)
  // Uses direct REST API to bypass unreliable Supabase client
  const handlePublishToChannel = async (channelId: string, forceOpen = false) => {
    if (!currentProject) return;

    // Check if channel is already live with this project (just needs refresh, not full republish)
    const channel = channels.find(c => c.id === channelId);
    const isPlayerConnected = channel?.playerStatus === 'connected';

    setIsPublishing(true);

    // Safety timeout - NEVER lock UI for more than 8 seconds
    const safetyTimeout = setTimeout(() => {
      console.warn('[StatusBar] Publish safety timeout - resetting UI');
      setIsPublishing(false);
    }, 8000);

    try {
      // Generate unique command ID for reliable delivery tracking
      const commandId = crypto.randomUUID();
      const command = {
        id: commandId,
        type: 'initialize',
        projectId: currentProject.id,
        timestamp: new Date().toISOString(),
        forceReload: true,
      };

      // Step 1: Update channel with loaded project (direct REST - 5s timeout)
      const channelResult = await directRestUpdate(
        'pulsar_channels',
        {
          loaded_project_id: currentProject.id,
          updated_at: new Date().toISOString(),
        },
        { column: 'id', value: channelId },
        5000
      );

      if (!channelResult.success) {
        console.warn('[StatusBar] Channel update failed:', channelResult.error);
        // Continue anyway - command is more important
      }

      // Step 2: Get current sequence (direct REST - 3s timeout)
      const stateResult = await directRestSelect<{ command_sequence: number }>(
        'pulsar_channel_state',
        'command_sequence',
        { column: 'channel_id', value: channelId },
        3000
      );

      const currentSequence = stateResult.data?.[0]?.command_sequence || 0;
      const newSequence = currentSequence + 1;

      // Step 3: Send command (direct REST - 5s timeout)
      const cmdResult = await directRestUpdate(
        'pulsar_channel_state',
        {
          pending_command: command,
          command_sequence: newSequence,
          last_command: command,
          last_command_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { column: 'channel_id', value: channelId },
        5000
      );

      if (!cmdResult.success) {
        throw new Error(cmdResult.error || 'Command send failed');
      }

      // Reload channels (fire and forget)
      loadChannels().catch(() => {});

      // Open Nova Player window if needed
      if (!isPlayerConnected || forceOpen) {
        openPlayerWindow(channelId);
      }
    } catch (err) {
      console.error('[StatusBar] Publish failed:', err);
    } finally {
      clearTimeout(safetyTimeout);
      setIsPublishing(false);
    }
  };

  // Stop a single channel - clears the loaded project
  // Uses direct REST API to bypass unreliable Supabase client
  const handleStopChannel = async (channelId: string) => {
    setIsPublishing(true);

    // Safety timeout - NEVER lock UI for more than 8 seconds
    const safetyTimeout = setTimeout(() => {
      console.warn('[StatusBar] Stop safety timeout - resetting UI');
      setIsPublishing(false);
    }, 8000);

    try {
      // Step 1: Clear loaded_project_id (direct REST)
      await directRestUpdate(
        'pulsar_channels',
        {
          loaded_project_id: null,
          updated_at: new Date().toISOString(),
        },
        { column: 'id', value: channelId },
        5000
      );

      // Step 2: Get current sequence (direct REST)
      const stateResult = await directRestSelect<{ command_sequence: number }>(
        'pulsar_channel_state',
        'command_sequence',
        { column: 'channel_id', value: channelId },
        3000
      );

      const currentSequence = stateResult.data?.[0]?.command_sequence || 0;
      const newSequence = currentSequence + 1;

      // Send a clear command with unique ID
      const commandId = crypto.randomUUID();
      const command = {
        id: commandId,
        type: 'clear_all',
        timestamp: new Date().toISOString(),
      };

      // Step 3: Send command (direct REST)
      const cmdResult = await directRestUpdate(
        'pulsar_channel_state',
        {
          pending_command: command,
          command_sequence: newSequence,
          last_command: command,
          last_command_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { column: 'channel_id', value: channelId },
        5000
      );

      if (!cmdResult.success) {
        console.warn('[StatusBar] Stop command failed:', cmdResult.error);
      }

      // Reload channels (fire and forget)
      loadChannels().catch(() => {});
    } catch (err) {
      console.error('[StatusBar] Stop failed:', err);
    } finally {
      clearTimeout(safetyTimeout);
      setIsPublishing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-emerald-500';
      case 'connecting':
        return 'text-amber-500 animate-pulse';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-muted-foreground/50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Offline';
    }
  };

  return (
    <TooltipProvider>
      <footer className="h-9 sm:h-10 border-t border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 shrink-0">
        {/* Left spacer */}
        <div />

        {/* Right side - Channels with dropdown menus */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Channel buttons with dropdown */}
          {channels.map((channel) => {
            // Channel is LIVE only if player is connected AND has a loaded project
            // Just having loadedProjectId doesn't mean it's actually broadcasting
            const isPlayerConnected = channel.playerStatus === 'connected';
            const hasLoadedProject = !!channel.loadedProjectId;
            const isLive = isPlayerConnected && hasLoadedProject;

            return (
              <DropdownMenu key={channel.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={isPublishing}
                        className={cn(
                          'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs transition-all',
                          'hover:bg-muted/80 cursor-pointer border',
                          isLive
                            ? 'bg-red-500/10 border-red-500/50 text-foreground'
                            : selectedChannel?.id === channel.id
                              ? 'bg-cyan-500/10 border-cyan-500/50 text-foreground'
                              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                          isPublishing && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Circle
                          className={cn(
                            'w-2 h-2 fill-current',
                            getStatusColor(channel.playerStatus)
                          )}
                        />
                        <span className="font-medium">{channel.channelCode}</span>
                        {isLive ? (
                          <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-red-500">
                            <Radio className="w-2.5 h-2.5 animate-pulse" />
                            <span className="hidden sm:inline">LIVE</span>
                          </span>
                        ) : (
                          <span className={cn(
                            'text-[9px] sm:text-[10px] hidden sm:inline',
                            channel.playerStatus === 'connected'
                              ? 'text-emerald-500'
                              : 'text-muted-foreground/70'
                          )}>
                            {getStatusText(channel.playerStatus)}
                          </span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{channel.name}</span>
                      <span className="text-muted-foreground">
                        Status: {getStatusText(channel.playerStatus)}
                      </span>
                      {isLive && (
                        <span className="text-red-500 text-[10px]">Currently publishing</span>
                      )}
                      <span className="text-muted-foreground/70 text-[10px] mt-1">
                        Click for options
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handlePublishToChannel(channel.id)}
                    disabled={!currentProject || isPublishing}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Publish to Channel
                  </DropdownMenuItem>
                  {isPlayerConnected && (
                    <DropdownMenuItem
                      onClick={() => handlePublishToChannel(channel.id, true)}
                      disabled={!currentProject || isPublishing}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Force Republish
                    </DropdownMenuItem>
                  )}
                  {isLive && (
                    <DropdownMenuItem
                      onClick={() => handleStopChannel(channel.id)}
                      disabled={isPublishing}
                      className="text-red-500 focus:text-red-500"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Channel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openPlayerWindow(channel.id)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Player Window
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleChannelClick(channel.id)}>
                    Select Channel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      </footer>
    </TooltipProvider>
  );
}
