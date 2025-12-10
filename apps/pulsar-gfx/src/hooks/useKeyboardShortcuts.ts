import { useEffect, useCallback } from 'react';
import { useChannelStore } from '@/stores/channelStore';
import { usePageStore } from '@/stores/pageStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useKeyboardShortcutsStore } from '@/stores/keyboardShortcutsStore';

// Keyboard shortcuts for Pulsar GFX - now configurable via store
// Default shortcuts:
// F1 - Play/Take
// F2 - Stop
// F3 - Clear Layer
// F4 - Clear All
// Space - Play/Pause Playlist (Timed Mode)
// Arrow Right - Next Page
// Arrow Left - Previous Page
// 1-4 - Select Layer 1-4
// Ctrl+/ - Show Keyboard Shortcuts

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  selectedLayer?: number;
  onLayerChange?: (layer: number) => void;
  onShowShortcuts?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, selectedLayer = 0, onLayerChange, onShowShortcuts } = options;

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
  const { shortcuts, getShortcutByKeyEvent, enabled: shortcutsEnabled } = useKeyboardShortcutsStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if focused on an input (except for Ctrl+/ to open shortcuts)
      const isInInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      // Get the matching shortcut from store
      const shortcut = getShortcutByKeyEvent(e);

      // Allow Ctrl+/ even in inputs to open shortcuts dialog
      if (shortcut?.id === 'show-shortcuts') {
        e.preventDefault();
        onShowShortcuts?.();
        return;
      }

      // For all other shortcuts, don't trigger if in input
      if (isInInput) {
        return;
      }

      if (!shortcut) return;

      const isConnected = selectedChannel?.playerStatus === 'connected';

      switch (shortcut.id) {
        case 'play-take':
          e.preventDefault();
          if (isConnected && selectedPage) {
            play(selectedPage.id, selectedLayer);
          }
          break;

        case 'stop':
          e.preventDefault();
          if (isConnected) {
            stop(selectedLayer);
          }
          break;

        case 'clear-layer':
          e.preventDefault();
          if (isConnected) {
            clear(selectedLayer);
          }
          break;

        case 'clear-all':
          e.preventDefault();
          if (isConnected) {
            clearAll();
          }
          break;

        case 'playlist-play-pause':
          if (currentPlaylist?.mode === 'timed') {
            e.preventDefault();
            if (isPlaying) {
              pausePlaylist();
            } else {
              playPlaylist();
            }
          }
          break;

        case 'playlist-next':
          if (currentPlaylist?.mode === 'timed') {
            e.preventDefault();
            next();
          }
          break;

        case 'playlist-previous':
          if (currentPlaylist?.mode === 'timed') {
            e.preventDefault();
            previous();
          }
          break;

        case 'layer-1':
          e.preventDefault();
          onLayerChange?.(0);
          break;

        case 'layer-2':
          e.preventDefault();
          onLayerChange?.(1);
          break;

        case 'layer-3':
          e.preventDefault();
          onLayerChange?.(2);
          break;

        case 'layer-4':
          e.preventDefault();
          onLayerChange?.(3);
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
      onShowShortcuts,
      getShortcutByKeyEvent,
    ]
  );

  useEffect(() => {
    if (!enabled || !shortcutsEnabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, shortcutsEnabled, handleKeyDown]);

  return {
    shortcuts,
  };
}
