import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShortcutDefinition {
  id: string;
  name: string;
  description: string;
  category: 'playout' | 'playlist' | 'navigation';
  keys: string[];
  defaultKeys: string[];
  // The actual key event values for matching
  keyCode: string;
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
  };
}

// Default shortcuts configuration
const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // Playout Controls
  {
    id: 'play-take',
    name: 'Play / Take',
    description: 'Play the selected page on the current layer',
    category: 'playout',
    keys: ['F1'],
    defaultKeys: ['F1'],
    keyCode: 'F1',
  },
  {
    id: 'stop',
    name: 'Stop',
    description: 'Stop playback on the current layer',
    category: 'playout',
    keys: ['F2'],
    defaultKeys: ['F2'],
    keyCode: 'F2',
  },
  {
    id: 'clear-layer',
    name: 'Clear Layer',
    description: 'Clear the current layer',
    category: 'playout',
    keys: ['F3'],
    defaultKeys: ['F3'],
    keyCode: 'F3',
  },
  {
    id: 'clear-all',
    name: 'Clear All',
    description: 'Clear all layers',
    category: 'playout',
    keys: ['F4'],
    defaultKeys: ['F4'],
    keyCode: 'F4',
  },
  // Playlist
  {
    id: 'playlist-play-pause',
    name: 'Play / Pause Playlist',
    description: 'Toggle playlist playback (timed mode only)',
    category: 'playlist',
    keys: ['Space'],
    defaultKeys: ['Space'],
    keyCode: ' ',
  },
  {
    id: 'playlist-next',
    name: 'Next Page',
    description: 'Go to the next page in the playlist',
    category: 'playlist',
    keys: ['→'],
    defaultKeys: ['→'],
    keyCode: 'ArrowRight',
  },
  {
    id: 'playlist-previous',
    name: 'Previous Page',
    description: 'Go to the previous page in the playlist',
    category: 'playlist',
    keys: ['←'],
    defaultKeys: ['←'],
    keyCode: 'ArrowLeft',
  },
  // Navigation
  {
    id: 'layer-1',
    name: 'Select Layer 1',
    description: 'Switch to layer 1',
    category: 'navigation',
    keys: ['1'],
    defaultKeys: ['1'],
    keyCode: '1',
  },
  {
    id: 'layer-2',
    name: 'Select Layer 2',
    description: 'Switch to layer 2',
    category: 'navigation',
    keys: ['2'],
    defaultKeys: ['2'],
    keyCode: '2',
  },
  {
    id: 'layer-3',
    name: 'Select Layer 3',
    description: 'Switch to layer 3',
    category: 'navigation',
    keys: ['3'],
    defaultKeys: ['3'],
    keyCode: '3',
  },
  {
    id: 'layer-4',
    name: 'Select Layer 4',
    description: 'Switch to layer 4',
    category: 'navigation',
    keys: ['4'],
    defaultKeys: ['4'],
    keyCode: '4',
  },
  {
    id: 'show-shortcuts',
    name: 'Show Keyboard Shortcuts',
    description: 'Open the keyboard shortcuts dialog',
    category: 'navigation',
    keys: ['Ctrl', '/'],
    defaultKeys: ['Ctrl', '/'],
    keyCode: '/',
    modifiers: { ctrl: true },
  },
];

// Helper to convert display keys to keyCode
function keysToKeyCode(keys: string[]): { keyCode: string; modifiers?: ShortcutDefinition['modifiers'] } {
  const modifiers: ShortcutDefinition['modifiers'] = {};
  let keyCode = '';

  for (const key of keys) {
    if (key === 'Ctrl') modifiers.ctrl = true;
    else if (key === 'Alt') modifiers.alt = true;
    else if (key === 'Shift') modifiers.shift = true;
    else if (key === 'Space') keyCode = ' ';
    else if (key === '←') keyCode = 'ArrowLeft';
    else if (key === '→') keyCode = 'ArrowRight';
    else if (key === '↑') keyCode = 'ArrowUp';
    else if (key === '↓') keyCode = 'ArrowDown';
    else keyCode = key.length === 1 ? key : key;
  }

  return {
    keyCode,
    modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined,
  };
}

interface KeyboardShortcutsStore {
  shortcuts: ShortcutDefinition[];
  enabled: boolean;

  // Actions
  updateShortcut: (id: string, keys: string[]) => void;
  resetShortcut: (id: string) => void;
  resetAllShortcuts: () => void;
  setEnabled: (enabled: boolean) => void;

  // Helpers
  getShortcutByKeyEvent: (e: KeyboardEvent) => ShortcutDefinition | undefined;
  getShortcutById: (id: string) => ShortcutDefinition | undefined;
}

export const useKeyboardShortcutsStore = create<KeyboardShortcutsStore>()(
  persist(
    (set, get) => ({
      shortcuts: DEFAULT_SHORTCUTS,
      enabled: true,

      updateShortcut: (id, keys) => {
        const { keyCode, modifiers } = keysToKeyCode(keys);
        set((state) => ({
          shortcuts: state.shortcuts.map((s) =>
            s.id === id ? { ...s, keys, keyCode, modifiers } : s
          ),
        }));
      },

      resetShortcut: (id) => {
        const defaultShortcut = DEFAULT_SHORTCUTS.find((s) => s.id === id);
        if (defaultShortcut) {
          set((state) => ({
            shortcuts: state.shortcuts.map((s) =>
              s.id === id ? { ...defaultShortcut } : s
            ),
          }));
        }
      },

      resetAllShortcuts: () => {
        set({ shortcuts: [...DEFAULT_SHORTCUTS] });
      },

      setEnabled: (enabled) => {
        set({ enabled });
      },

      getShortcutByKeyEvent: (e) => {
        const { shortcuts } = get();
        return shortcuts.find((s) => {
          // Check key code matches
          if (s.keyCode.toLowerCase() !== e.key.toLowerCase()) return false;

          // Check modifiers
          const needsCtrl = s.modifiers?.ctrl ?? false;
          const needsAlt = s.modifiers?.alt ?? false;
          const needsShift = s.modifiers?.shift ?? false;

          const hasCtrl = e.ctrlKey || e.metaKey;
          const hasAlt = e.altKey;
          const hasShift = e.shiftKey;

          return needsCtrl === hasCtrl && needsAlt === hasAlt && needsShift === hasShift;
        });
      },

      getShortcutById: (id) => {
        return get().shortcuts.find((s) => s.id === id);
      },
    }),
    {
      name: 'pulsar-keyboard-shortcuts',
      partialize: (state) => ({
        // Only persist user customizations
        shortcuts: state.shortcuts,
        enabled: state.enabled,
      }),
    }
  )
);
