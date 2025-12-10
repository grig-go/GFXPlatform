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
import { supabase } from '@emergent-platform/supabase-client';
import { Circle, Send, Square, Radio } from 'lucide-react';

// Nova GFX player URL - configurable via environment variable
const NOVA_GFX_URL = import.meta.env.VITE_NOVA_PREVIEW_URL || 'http://localhost:5173';

export function StatusBar() {
  const { channels, selectedChannel, selectChannel, loadChannels } = useChannelStore();
  const { currentProject } = useProjectStore();
  const [isPublishing, setIsPublishing] = useState(false);

  // Subscribe to realtime channel status updates
  useEffect(() => {
    if (!supabase) return;

    const subscription = supabase
      .channel('channel-status-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pulsar_channels',
        },
        () => {
          // Reload channels when status changes
          loadChannels();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadChannels]);

  // Handle channel click - select channel
  const handleChannelClick = (channelId: string) => {
    selectChannel(channelId);
  };

  // Publish to a single channel
  const handlePublishToChannel = async (channelId: string) => {
    if (!currentProject || !supabase) return;

    setIsPublishing(true);

    try {
      console.log('[StatusBar] Publishing project to channel:', channelId, 'Project:', currentProject.id);

      const command = {
        type: 'initialize',
        projectId: currentProject.id,
        timestamp: new Date().toISOString(),
      };

      // Update channel with loaded project
      const channelResult = await supabase
        .from('pulsar_channels')
        .update({
          loaded_project_id: currentProject.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', channelId);

      if (channelResult.error) {
        throw channelResult.error;
      }

      // Send command to channel state
      const stateResult = await supabase
        .from('pulsar_channel_state')
        .update({
          pending_command: command,
          updated_at: new Date().toISOString(),
        })
        .eq('channel_id', channelId);

      if (stateResult.error) {
        throw stateResult.error;
      }

      // Reload channels to get updated state
      await loadChannels();

      // Open Nova GFX player window
      const playerUrl = `${NOVA_GFX_URL}/player/${channelId}`;
      window.open(playerUrl, `nova-player-${channelId}`, 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes');

      console.log('[StatusBar] Publish successful');
    } catch (err) {
      console.error('[StatusBar] Publish failed:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  // Stop a single channel
  const handleStopChannel = async (channelId: string) => {
    if (!supabase) return;

    setIsPublishing(true);

    try {
      console.log('[StatusBar] Stopping channel:', channelId);

      const command = {
        type: 'stop',
        timestamp: new Date().toISOString(),
      };

      // Send stop command to channel state
      const stateResult = await supabase
        .from('pulsar_channel_state')
        .update({
          pending_command: command,
          updated_at: new Date().toISOString(),
        })
        .eq('channel_id', channelId);

      if (stateResult.error) {
        throw stateResult.error;
      }

      // Clear loaded_project_id on channel
      const channelResult = await supabase
        .from('pulsar_channels')
        .update({
          loaded_project_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', channelId);

      if (channelResult.error) {
        console.warn('[StatusBar] Failed to clear loaded_project_id:', channelResult.error);
      }

      // Reload channels to get updated state
      await loadChannels();

      console.log('[StatusBar] Stop successful');
    } catch (err) {
      console.error('[StatusBar] Stop failed:', err);
    } finally {
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
            // Channel is live if it has a loadedProjectId from the database
            const isLive = !!channel.loadedProjectId;

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
