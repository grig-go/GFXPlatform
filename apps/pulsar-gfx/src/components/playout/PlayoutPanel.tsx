import { Button, cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@emergent-platform/ui';
import { Play, Square, Trash2, AlertCircle, Radio } from 'lucide-react';
import { useChannelStore } from '@/stores/channelStore';
import { usePageStore } from '@/stores/pageStore';
import { useState } from 'react';

export function PlayoutPanel() {
  const { selectedChannel, play, stop, clear, clearAll } = useChannelStore();
  const { selectedPage } = usePageStore();
  const [selectedLayer, setSelectedLayer] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState(false);

  const layerCount = selectedChannel?.layerCount || 4;

  const handleTake = async () => {
    if (!selectedPage || !selectedChannel) return;
    setIsExecuting(true);
    try {
      await play(selectedPage.id, selectedLayer);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStop = async () => {
    if (!selectedChannel) return;
    setIsExecuting(true);
    try {
      await stop(selectedLayer);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClear = async () => {
    if (!selectedChannel) return;
    setIsExecuting(true);
    try {
      await clear(selectedLayer);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClearAll = async () => {
    if (!selectedChannel) return;
    setIsExecuting(true);
    try {
      await clearAll();
    } finally {
      setIsExecuting(false);
    }
  };

  const isConnected = selectedChannel?.playerStatus === 'connected';

  return (
    <div className="h-full flex flex-col bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <div className="h-9 sm:h-10 flex items-center justify-between px-2 sm:px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
          <span className="text-xs sm:text-sm font-medium">Playout Control</span>
        </div>

        {/* Channel Status */}
        {selectedChannel && (
          <div
            className={cn(
              'flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full transition-all duration-200',
              isConnected
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full',
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              )}
            />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex-1 p-2 sm:p-4 flex flex-col gap-2 sm:gap-4">
        {/* Layer Selection */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm text-muted-foreground">Layer:</span>
          <Select
            value={selectedLayer.toString()}
            onValueChange={(v) => setSelectedLayer(parseInt(v))}
          >
            <SelectTrigger className="w-[100px] sm:w-[120px] h-7 sm:h-8 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: layerCount }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  Layer {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Page Info */}
        {selectedPage ? (
          <div className="bg-muted/30 rounded-lg p-2 sm:p-3 border border-cyan-500/30">
            <div className="text-[10px] sm:text-xs text-cyan-400 mb-1">Selected:</div>
            <div className="text-sm sm:text-base font-medium truncate">{selectedPage.name}</div>
            {selectedPage.template && (
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Template: {selectedPage.template.name}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-muted/20 rounded-lg p-2 sm:p-3 border border-dashed border-border/50 text-center">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-muted-foreground/50" />
            <div className="text-[10px] sm:text-xs text-muted-foreground/60">
              Select a page to take
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-auto">
          <Button
            size="lg"
            onClick={handleTake}
            disabled={!selectedPage || !isConnected || isExecuting}
            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold h-10 sm:h-12 text-sm sm:text-base"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 fill-current" />
            TAKE
          </Button>

          <Button
            size="lg"
            variant="destructive"
            onClick={handleStop}
            disabled={!isConnected || isExecuting}
            className="font-bold h-10 sm:h-12 text-sm sm:text-base"
          >
            <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            STOP
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={!isConnected || isExecuting}
            className="gap-1 sm:gap-1.5 h-8 sm:h-9 text-xs sm:text-sm"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Clear Layer
          </Button>

          <Button
            variant="outline"
            onClick={handleClearAll}
            disabled={!isConnected || isExecuting}
            className="gap-1 sm:gap-1.5 h-8 sm:h-9 text-xs sm:text-sm text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Clear All
          </Button>
        </div>

        {/* Keyboard Hints */}
        <div className="text-[9px] sm:text-[10px] text-muted-foreground/60 text-center mt-1 sm:mt-2 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-mono bg-muted/30 px-1 py-0.5 rounded text-cyan-400/70">F1</span>
          <span>Take</span>
          <span className="text-border">|</span>
          <span className="font-mono bg-muted/30 px-1 py-0.5 rounded text-cyan-400/70">F2</span>
          <span>Stop</span>
          <span className="text-border">|</span>
          <span className="font-mono bg-muted/30 px-1 py-0.5 rounded text-cyan-400/70">F3</span>
          <span>Clear</span>
          <span className="text-border">|</span>
          <span className="font-mono bg-muted/30 px-1 py-0.5 rounded text-cyan-400/70">F4</span>
          <span>Clear All</span>
        </div>
      </div>
    </div>
  );
}
