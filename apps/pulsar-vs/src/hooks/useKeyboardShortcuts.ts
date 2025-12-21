import { useEffect, useCallback, useState } from 'react';

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  key: string;
  modifiers: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
  action: string;
  enabled: boolean;
}

export interface ShortcutActions {
  [key: string]: () => void;
}

// Default keyboard shortcuts
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'play-in',
    name: 'Play In',
    description: 'Play the selected item in',
    key: 'F1',
    modifiers: {},
    action: 'playIn',
    enabled: true,
  },
  {
    id: 'play-out',
    name: 'Play Out',
    description: 'Play the selected item out',
    key: 'F2',
    modifiers: {},
    action: 'playOut',
    enabled: true,
  },
  {
    id: 'start-playlist',
    name: 'Start Playlist',
    description: 'Start or resume the playlist',
    key: 'F5',
    modifiers: {},
    action: 'startPlaylist',
    enabled: true,
  },
  {
    id: 'stop-playlist',
    name: 'Stop Playlist',
    description: 'Stop the playlist',
    key: 'F6',
    modifiers: {},
    action: 'stopPlaylist',
    enabled: true,
  },
  {
    id: 'skip-next',
    name: 'Skip Next',
    description: 'Skip to the next item',
    key: 'F7',
    modifiers: {},
    action: 'skipNext',
    enabled: true,
  },
  {
    id: 'select-next',
    name: 'Select Next',
    description: 'Select the next item in the list',
    key: 'ArrowDown',
    modifiers: {},
    action: 'selectNext',
    enabled: true,
  },
  {
    id: 'select-previous',
    name: 'Select Previous',
    description: 'Select the previous item in the list',
    key: 'ArrowUp',
    modifiers: {},
    action: 'selectPrevious',
    enabled: true,
  },
  {
    id: 'play-selected',
    name: 'Play Selected',
    description: 'Play the currently selected item',
    key: 'Enter',
    modifiers: {},
    action: 'playSelected',
    enabled: true,
  },
  {
    id: 'play-and-next',
    name: 'Play & Next',
    description: 'Play current row and move to next',
    key: 'F3',
    modifiers: {},
    action: 'playAndNext',
    enabled: true,
  },
  {
    id: 'clear-selection',
    name: 'Clear Selection',
    description: 'Clear the current selection',
    key: 'Escape',
    modifiers: {},
    action: 'clearSelection',
    enabled: true,
  },
];

const STORAGE_KEY = 'pulsarvs_keyboard_shortcuts';

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.modifiers.ctrl) parts.push('Ctrl');
  if (shortcut.modifiers.alt) parts.push('Alt');
  if (shortcut.modifiers.shift) parts.push('Shift');
  parts.push(shortcut.key);
  return parts.join(' + ');
}

export function parseKeyEvent(e: KeyboardEvent): { key: string; modifiers: KeyboardShortcut['modifiers'] } {
  return {
    key: e.key,
    modifiers: {
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
    },
  };
}

export function matchesShortcut(e: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const eventKey = e.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();

  // Check key match
  if (eventKey !== shortcutKey) return false;

  // Check modifiers
  const ctrlMatch = (shortcut.modifiers.ctrl || false) === (e.ctrlKey || e.metaKey);
  const shiftMatch = (shortcut.modifiers.shift || false) === e.shiftKey;
  const altMatch = (shortcut.modifiers.alt || false) === e.altKey;

  return ctrlMatch && shiftMatch && altMatch;
}

export function useKeyboardShortcuts(actions: ShortcutActions, enabled: boolean = true) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load keyboard shortcuts:', e);
    }
    return DEFAULT_SHORTCUTS;
  });

  // Save shortcuts to localStorage
  const saveShortcuts = useCallback((newShortcuts: KeyboardShortcut[]) => {
    setShortcuts(newShortcuts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newShortcuts));
    } catch (e) {
      console.error('Failed to save keyboard shortcuts:', e);
    }
  }, []);

  // Update a single shortcut
  const updateShortcut = useCallback((id: string, updates: Partial<KeyboardShortcut>) => {
    setShortcuts(prev => {
      const newShortcuts = prev.map(s =>
        s.id === id ? { ...s, ...updates } : s
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newShortcuts));
      return newShortcuts;
    });
  }, []);

  // Reset all shortcuts to defaults
  const resetShortcuts = useCallback(() => {
    saveShortcuts(DEFAULT_SHORTCUTS);
  }, [saveShortcuts]);

  // Handle keydown events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      for (const shortcut of shortcuts) {
        if (!shortcut.enabled) continue;

        if (matchesShortcut(e, shortcut)) {
          const action = actions[shortcut.action];
          if (action) {
            e.preventDefault();
            e.stopPropagation();
            action();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, actions, enabled]);

  return {
    shortcuts,
    updateShortcut,
    resetShortcuts,
    saveShortcuts,
  };
}
