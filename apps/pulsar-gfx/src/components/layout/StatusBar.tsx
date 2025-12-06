import { useState, useEffect } from 'react';
import { cn } from '@emergent-platform/ui';
import { useChannelStore } from '@/stores/channelStore';
import { supabase } from '@emergent-platform/supabase-client';
import { Circle, Send } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@emergent-platform/ui';
import { PublishModal } from '@/components/dialogs/PublishModal';

export function StatusBar() {
  const { channels, selectedChannel, selectChannel, loadChannels } = useChannelStore();
  const [showPublishModal, setShowPublishModal] = useState(false);

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

        {/* Right side - Channels + Publish button */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Channel status indicators */}
          {channels.map((channel) => (
            <Tooltip key={channel.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleChannelClick(channel.id)}
                  className={cn(
                    'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs transition-all',
                    'hover:bg-muted/80 cursor-pointer border',
                    selectedChannel?.id === channel.id
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  <Circle
                    className={cn(
                      'w-2 h-2 fill-current',
                      getStatusColor(channel.playerStatus)
                    )}
                  />
                  <span className="font-medium">{channel.channelCode}</span>
                  <span className={cn(
                    'text-[9px] sm:text-[10px] hidden sm:inline',
                    channel.playerStatus === 'connected'
                      ? 'text-emerald-500'
                      : 'text-muted-foreground/70'
                  )}>
                    {getStatusText(channel.playerStatus)}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{channel.name}</span>
                  <span className="text-muted-foreground">
                    Status: {getStatusText(channel.playerStatus)}
                  </span>
                  <span className="text-muted-foreground/70 text-[10px] mt-1">
                    Click to select
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Publish button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowPublishModal(true)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-medium',
                  'bg-gradient-to-r from-cyan-500 to-blue-500 text-white',
                  'hover:from-cyan-600 hover:to-blue-600 transition-all',
                  'shadow-sm hover:shadow'
                )}
              >
                <Send className="w-3 h-3" />
                <span>Publish</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Publish to channel
            </TooltipContent>
          </Tooltip>
        </div>
      </footer>

      {/* Publish Modal */}
      <PublishModal open={showPublishModal} onOpenChange={setShowPublishModal} />
    </TooltipProvider>
  );
}
