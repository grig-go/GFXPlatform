import { useEffect, useCallback } from 'react';
import { useChannelStore } from '@/stores/channelStore';
import { usePageStore } from '@/stores/pageStore';
import { usePlaylistStore } from '@/stores/playlistStore';

// Keyboard shortcuts for Pulsar GFX
// F1 - Play/Take
// F2 - Stop
// F3 - Clear Layer
// F4 - Clear All
// Space - Play/Pause Playlist (Timed Mode)
// Arrow Right - Next Page
// Arrow Left - Previous Page
// 1-4 - Select Layer 1-4

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  selectedLayer?: number;
  onLayerChange?: (layer: number) => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, selectedLayer = 0, onLayerChange } = options;

  const { selectedChannel, play, stop, clear, clearAll } = useChannelStore();
  const { selectedPage } = usePageStore();
  const {
    currentPlaylist,
    isPlaying,
    play: playPlaylist,
    pause: pausePlaylist,
    next,
    previous,
  } = usePlaylistStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if focused on an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const isConnected = selectedChannel?.playerStatus === 'connected';

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          // Take/Play
          if (isConnected && selectedPage) {
            play(selectedPage.id, selectedLayer);
          }
          break;

        case 'F2':
          e.preventDefault();
          // Stop
          if (isConnected) {
            stop(selectedLayer);
          }
          break;

        case 'F3':
          e.preventDefault();
          // Clear Layer
          if (isConnected) {
            clear(selectedLayer);
          }
          break;

        case 'F4':
          e.preventDefault();
          // Clear All
          if (isConnected) {
            clearAll();
          }
          break;

        case ' ':
          // Space - Play/Pause (only in timed mode)
          if (currentPlaylist?.mode === 'timed') {
            e.preventDefault();
            if (isPlaying) {
              pausePlaylist();
            } else {
              playPlaylist();
            }
          }
          break;

        case 'ArrowRight':
          // Next page
          if (currentPlaylist?.mode === 'timed') {
            e.preventDefault();
            next();
          }
          break;

        case 'ArrowLeft':
          // Previous page
          if (currentPlaylist?.mode === 'timed') {
            e.preventDefault();
            previous();
          }
          break;

        case '1':
        case '2':
        case '3':
        case '4':
          // Select Layer 1-4
          e.preventDefault();
          const layerIndex = parseInt(e.key) - 1;
          onLayerChange?.(layerIndex);
          break;

        default:
          break;
      }
    },
    [
      selectedChannel,
      selectedPage,
      selectedLayer,
      currentPlaylist,
      isPlaying,
      play,
      stop,
      clear,
      clearAll,
      playPlaylist,
      pausePlaylist,
      next,
      previous,
      onLayerChange,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: [
      { key: 'F1', action: 'Take/Play', context: 'Global' },
      { key: 'F2', action: 'Stop', context: 'Global' },
      { key: 'F3', action: 'Clear Layer', context: 'Global' },
      { key: 'F4', action: 'Clear All', context: 'Global' },
      { key: 'Space', action: 'Play/Pause Playlist', context: 'Timed Mode' },
      { key: '→', action: 'Next Page', context: 'Playlist' },
      { key: '←', action: 'Previous Page', context: 'Playlist' },
      { key: '1-4', action: 'Select Layer', context: 'Global' },
    ],
  };
}
