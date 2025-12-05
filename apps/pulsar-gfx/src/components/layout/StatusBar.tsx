import { cn } from '@emergent-platform/ui';
import { useChannelStore } from '@/stores/channelStore';
import { Circle, Play, Square } from 'lucide-react';

export function StatusBar() {
  const { selectedChannel, channelStates } = useChannelStore();
  const channelState = selectedChannel
    ? channelStates.get(selectedChannel.id)
    : null;
  const layers = channelState?.layers || [];

  // Default to 4 layers if no state
  const layerCount = selectedChannel?.layerCount || 4;
  const displayLayers = Array.from({ length: layerCount }, (_, i) => {
    return layers[i] || { index: i, state: 'empty', pageId: null };
  });

  return (
    <footer className="h-9 sm:h-10 border-t border-border bg-card/50 backdrop-blur-sm flex items-center px-3 sm:px-4 shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 overflow-x-auto">
        {displayLayers.map((layer, index) => (
          <LayerStatusItem
            key={index}
            layerIndex={index}
            state={layer.state}
            pageName={layer.pageName}
            templateName={layer.templateName}
            onAirSince={layer.onAirSince}
          />
        ))}
      </div>

      {/* Channel Info */}
      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground ml-2 sm:ml-4 shrink-0">
        {selectedChannel && (
          <>
            <span className="hidden sm:inline">
              {selectedChannel.channelCode} - {selectedChannel.name}
            </span>
            <span className="sm:hidden">{selectedChannel.channelCode}</span>
            <span
              className={cn(
                'flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs',
                selectedChannel.playerStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : selectedChannel.playerStatus === 'error'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Circle
                className={cn(
                  'w-1.5 h-1.5 sm:w-2 sm:h-2 fill-current',
                  selectedChannel.playerStatus === 'connected' && 'animate-pulse'
                )}
              />
              <span className="hidden sm:inline">{selectedChannel.playerStatus}</span>
            </span>
          </>
        )}
      </div>
    </footer>
  );
}

interface LayerStatusItemProps {
  layerIndex: number;
  state: 'empty' | 'loading' | 'ready' | 'on_air';
  pageName?: string;
  templateName?: string;
  onAirSince?: Date;
}

function LayerStatusItem({
  layerIndex,
  state,
  pageName,
  templateName,
  onAirSince,
}: LayerStatusItemProps) {
  const getStateStyles = () => {
    switch (state) {
      case 'on_air':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'ready':
        return 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400';
      case 'loading':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-400';
      default:
        return 'bg-muted/50 border-border/50 text-muted-foreground';
    }
  };

  const getStateIcon = () => {
    switch (state) {
      case 'on_air':
        return <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />;
      case 'ready':
        return <Square className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
      default:
        return null;
    }
  };

  // Calculate on-air duration
  const getOnAirDuration = () => {
    if (!onAirSince) return null;
    const start = new Date(onAirSince);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-md border text-[10px] sm:text-xs min-w-[140px] sm:min-w-[180px] transition-all duration-200',
        getStateStyles(),
        state === 'on_air' && 'on-air-pulse'
      )}
    >
      <span className="font-mono font-bold text-cyan-400">L{layerIndex + 1}</span>
      <span className="mx-0.5 sm:mx-1 text-border">|</span>

      {state === 'empty' ? (
        <span className="text-muted-foreground/60">Empty</span>
      ) : (
        <>
          {getStateIcon()}
          <span className="truncate max-w-[60px] sm:max-w-[100px]">{pageName || templateName}</span>
          {state === 'on_air' && onAirSince && (
            <span className="ml-auto font-mono text-[9px] sm:text-[10px] tabular-nums">
              {getOnAirDuration()}
            </span>
          )}
        </>
      )}
    </div>
  );
}
