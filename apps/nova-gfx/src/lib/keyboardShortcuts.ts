// Keyboard shortcuts configuration and utilities

export type ShortcutCategory =
  | 'general'
  | 'tools'
  | 'editing'
  | 'view'
  | 'timeline'
  | 'playback'
  | 'layers';

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  category: ShortcutCategory;
  defaultKeys: string[];
  keys: string[]; // Current custom keys
  action: string; // Action identifier for the handler
}

// Key display names for UI
export const KEY_DISPLAY_NAMES: Record<string, string> = {
  'ctrl': 'Ctrl',
  'cmd': 'Cmd',
  'alt': 'Alt',
  'shift': 'Shift',
  'meta': navigator.platform.includes('Mac') ? 'Cmd' : 'Win',
  'enter': 'Enter',
  'escape': 'Esc',
  'backspace': 'Backspace',
  'delete': 'Delete',
  'space': 'Space',
  'arrowup': '↑',
  'arrowdown': '↓',
  'arrowleft': '←',
  'arrowright': '→',
  'tab': 'Tab',
};

// Category display names
export const CATEGORY_NAMES: Record<ShortcutCategory, string> = {
  general: 'General',
  tools: 'Tools',
  editing: 'Editing',
  view: 'View',
  timeline: 'Timeline',
  playback: 'Playback',
  layers: 'Layers & Templates',
};

// Default keyboard shortcuts configuration
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // General
  {
    id: 'save',
    name: 'Save',
    description: 'Save the current project',
    category: 'general',
    defaultKeys: ['ctrl+s'],
    keys: ['ctrl+s'],
    action: 'save',
  },
  {
    id: 'undo',
    name: 'Undo',
    description: 'Undo the last action',
    category: 'general',
    defaultKeys: ['ctrl+z'],
    keys: ['ctrl+z'],
    action: 'undo',
  },
  {
    id: 'redo',
    name: 'Redo',
    description: 'Redo the last undone action',
    category: 'general',
    defaultKeys: ['ctrl+shift+z', 'ctrl+y'],
    keys: ['ctrl+shift+z', 'ctrl+y'],
    action: 'redo',
  },
  {
    id: 'shortcuts-help',
    name: 'Keyboard Shortcuts',
    description: 'Show keyboard shortcuts dialog',
    category: 'general',
    defaultKeys: ['ctrl+/', 'ctrl+shift+/'],
    keys: ['ctrl+/', 'ctrl+shift+/'],
    action: 'showShortcuts',
  },
  {
    id: 'escape',
    name: 'Cancel/Deselect',
    description: 'Cancel current action or deselect elements',
    category: 'general',
    defaultKeys: ['escape'],
    keys: ['escape'],
    action: 'escape',
  },

  // Tools
  {
    id: 'tool-select',
    name: 'Select Tool',
    description: 'Switch to selection tool',
    category: 'tools',
    defaultKeys: ['v', 's'],
    keys: ['v', 's'],
    action: 'tool-select',
  },
  {
    id: 'tool-hand',
    name: 'Hand Tool',
    description: 'Switch to hand/pan tool',
    category: 'tools',
    defaultKeys: ['h'],
    keys: ['h'],
    action: 'tool-hand',
  },
  {
    id: 'tool-zoom',
    name: 'Zoom Tool',
    description: 'Switch to zoom tool',
    category: 'tools',
    defaultKeys: ['z'],
    keys: ['z'],
    action: 'tool-zoom',
  },
  {
    id: 'tool-text',
    name: 'Text Tool',
    description: 'Switch to text tool',
    category: 'tools',
    defaultKeys: ['t'],
    keys: ['t'],
    action: 'tool-text',
  },
  {
    id: 'tool-rectangle',
    name: 'Rectangle Tool',
    description: 'Switch to rectangle shape tool',
    category: 'tools',
    defaultKeys: ['r'],
    keys: ['r'],
    action: 'tool-rectangle',
  },
  {
    id: 'tool-ellipse',
    name: 'Ellipse Tool',
    description: 'Switch to ellipse shape tool',
    category: 'tools',
    defaultKeys: ['o'],
    keys: ['o'],
    action: 'tool-ellipse',
  },
  {
    id: 'tool-image',
    name: 'Image Tool',
    description: 'Switch to image tool',
    category: 'tools',
    defaultKeys: ['i'],
    keys: ['i'],
    action: 'tool-image',
  },
  {
    id: 'tool-video',
    name: 'Video Tool',
    description: 'Switch to video tool',
    category: 'tools',
    defaultKeys: ['shift+v'],
    keys: ['shift+v'],
    action: 'tool-video',
  },
  {
    id: 'tool-icon',
    name: 'Icon Tool',
    description: 'Switch to icon tool',
    category: 'tools',
    defaultKeys: ['shift+i'],
    keys: ['shift+i'],
    action: 'tool-icon',
  },
  {
    id: 'tool-svg',
    name: 'SVG Tool',
    description: 'Switch to SVG tool',
    category: 'tools',
    defaultKeys: ['shift+s'],
    keys: ['shift+s'],
    action: 'tool-svg',
  },
  {
    id: 'tool-chart',
    name: 'Chart Tool',
    description: 'Switch to chart tool',
    category: 'tools',
    defaultKeys: ['c'],
    keys: ['c'],
    action: 'tool-chart',
  },
  {
    id: 'tool-map',
    name: 'Map Tool',
    description: 'Switch to map tool',
    category: 'tools',
    defaultKeys: ['m'],
    keys: ['m'],
    action: 'tool-map',
  },
  {
    id: 'tool-ticker',
    name: 'Ticker Tool',
    description: 'Switch to ticker tool',
    category: 'tools',
    defaultKeys: ['shift+t'],
    keys: ['shift+t'],
    action: 'tool-ticker',
  },
  {
    id: 'tool-table',
    name: 'Table Tool',
    description: 'Switch to table tool',
    category: 'tools',
    defaultKeys: ['shift+b'],
    keys: ['shift+b'],
    action: 'tool-table',
  },

  // Editing
  {
    id: 'copy',
    name: 'Copy',
    description: 'Copy selected elements',
    category: 'editing',
    defaultKeys: ['ctrl+c'],
    keys: ['ctrl+c'],
    action: 'copy',
  },
  {
    id: 'cut',
    name: 'Cut',
    description: 'Cut selected elements',
    category: 'editing',
    defaultKeys: ['ctrl+x'],
    keys: ['ctrl+x'],
    action: 'cut',
  },
  {
    id: 'paste',
    name: 'Paste',
    description: 'Paste elements from clipboard',
    category: 'editing',
    defaultKeys: ['ctrl+v'],
    keys: ['ctrl+v'],
    action: 'paste',
  },
  {
    id: 'duplicate',
    name: 'Duplicate',
    description: 'Duplicate selected elements',
    category: 'editing',
    defaultKeys: ['ctrl+d'],
    keys: ['ctrl+d'],
    action: 'duplicate',
  },
  {
    id: 'delete',
    name: 'Delete',
    description: 'Delete selected elements',
    category: 'editing',
    defaultKeys: ['delete', 'backspace'],
    keys: ['delete', 'backspace'],
    action: 'delete',
  },
  {
    id: 'select-all',
    name: 'Select All',
    description: 'Select all elements in template',
    category: 'editing',
    defaultKeys: ['ctrl+a'],
    keys: ['ctrl+a'],
    action: 'selectAll',
  },
  {
    id: 'deselect-all',
    name: 'Deselect All',
    description: 'Deselect all elements',
    category: 'editing',
    defaultKeys: ['ctrl+shift+a'],
    keys: ['ctrl+shift+a'],
    action: 'deselectAll',
  },
  {
    id: 'group',
    name: 'Group',
    description: 'Group selected elements',
    category: 'editing',
    defaultKeys: ['ctrl+g'],
    keys: ['ctrl+g'],
    action: 'group',
  },
  {
    id: 'ungroup',
    name: 'Ungroup',
    description: 'Ungroup selected elements',
    category: 'editing',
    defaultKeys: ['ctrl+shift+g'],
    keys: ['ctrl+shift+g'],
    action: 'ungroup',
  },
  {
    id: 'bring-forward',
    name: 'Bring Forward',
    description: 'Bring element forward in layer order',
    category: 'editing',
    defaultKeys: ['ctrl+]'],
    keys: ['ctrl+]'],
    action: 'bringForward',
  },
  {
    id: 'send-backward',
    name: 'Send Backward',
    description: 'Send element backward in layer order',
    category: 'editing',
    defaultKeys: ['ctrl+['],
    keys: ['ctrl+['],
    action: 'sendBackward',
  },
  {
    id: 'bring-to-front',
    name: 'Bring to Front',
    description: 'Bring element to front',
    category: 'editing',
    defaultKeys: ['ctrl+shift+]'],
    keys: ['ctrl+shift+]'],
    action: 'bringToFront',
  },
  {
    id: 'send-to-back',
    name: 'Send to Back',
    description: 'Send element to back',
    category: 'editing',
    defaultKeys: ['ctrl+shift+['],
    keys: ['ctrl+shift+['],
    action: 'sendToBack',
  },
  {
    id: 'lock',
    name: 'Lock/Unlock',
    description: 'Toggle lock on selected element',
    category: 'editing',
    defaultKeys: ['ctrl+l'],
    keys: ['ctrl+l'],
    action: 'toggleLock',
  },
  {
    id: 'hide',
    name: 'Hide/Show',
    description: 'Toggle visibility of selected element',
    category: 'editing',
    defaultKeys: ['ctrl+h'],
    keys: ['ctrl+h'],
    action: 'toggleVisibility',
  },

  // Nudge
  {
    id: 'nudge-up',
    name: 'Nudge Up',
    description: 'Move element up by 1px',
    category: 'editing',
    defaultKeys: ['arrowup'],
    keys: ['arrowup'],
    action: 'nudgeUp',
  },
  {
    id: 'nudge-down',
    name: 'Nudge Down',
    description: 'Move element down by 1px',
    category: 'editing',
    defaultKeys: ['arrowdown'],
    keys: ['arrowdown'],
    action: 'nudgeDown',
  },
  {
    id: 'nudge-left',
    name: 'Nudge Left',
    description: 'Move element left by 1px',
    category: 'editing',
    defaultKeys: ['arrowleft'],
    keys: ['arrowleft'],
    action: 'nudgeLeft',
  },
  {
    id: 'nudge-right',
    name: 'Nudge Right',
    description: 'Move element right by 1px',
    category: 'editing',
    defaultKeys: ['arrowright'],
    keys: ['arrowright'],
    action: 'nudgeRight',
  },
  {
    id: 'nudge-up-big',
    name: 'Nudge Up (10px)',
    description: 'Move element up by 10px',
    category: 'editing',
    defaultKeys: ['shift+arrowup'],
    keys: ['shift+arrowup'],
    action: 'nudgeUpBig',
  },
  {
    id: 'nudge-down-big',
    name: 'Nudge Down (10px)',
    description: 'Move element down by 10px',
    category: 'editing',
    defaultKeys: ['shift+arrowdown'],
    keys: ['shift+arrowdown'],
    action: 'nudgeDownBig',
  },
  {
    id: 'nudge-left-big',
    name: 'Nudge Left (10px)',
    description: 'Move element left by 10px',
    category: 'editing',
    defaultKeys: ['shift+arrowleft'],
    keys: ['shift+arrowleft'],
    action: 'nudgeLeftBig',
  },
  {
    id: 'nudge-right-big',
    name: 'Nudge Right (10px)',
    description: 'Move element right by 10px',
    category: 'editing',
    defaultKeys: ['shift+arrowright'],
    keys: ['shift+arrowright'],
    action: 'nudgeRightBig',
  },

  // View
  {
    id: 'zoom-in',
    name: 'Zoom In',
    description: 'Zoom in on canvas',
    category: 'view',
    defaultKeys: ['ctrl+=', 'ctrl++'],
    keys: ['ctrl+=', 'ctrl++'],
    action: 'zoomIn',
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    description: 'Zoom out on canvas',
    category: 'view',
    defaultKeys: ['ctrl+-'],
    keys: ['ctrl+-'],
    action: 'zoomOut',
  },
  {
    id: 'zoom-fit',
    name: 'Zoom to Fit',
    description: 'Fit canvas in viewport',
    category: 'view',
    defaultKeys: ['ctrl+0'],
    keys: ['ctrl+0'],
    action: 'zoomFit',
  },
  {
    id: 'zoom-100',
    name: 'Zoom to 100%',
    description: 'Reset zoom to 100%',
    category: 'view',
    defaultKeys: ['ctrl+1'],
    keys: ['ctrl+1'],
    action: 'zoom100',
  },
  {
    id: 'toggle-grid',
    name: 'Toggle Grid',
    description: 'Show/hide grid overlay',
    category: 'view',
    defaultKeys: ['ctrl+\''],
    keys: ['ctrl+\''],
    action: 'toggleGrid',
  },
  {
    id: 'toggle-guides',
    name: 'Toggle Guides',
    description: 'Show/hide guides',
    category: 'view',
    defaultKeys: ['ctrl+;'],
    keys: ['ctrl+;'],
    action: 'toggleGuides',
  },
  {
    id: 'toggle-safe-zone',
    name: 'Toggle Safe Zone',
    description: 'Show/hide safe zone overlay',
    category: 'view',
    defaultKeys: ['ctrl+shift+s'],
    keys: ['ctrl+shift+s'],
    action: 'toggleSafeZone',
  },

  // Timeline
  {
    id: 'timeline-play-pause',
    name: 'Play/Pause Timeline',
    description: 'Toggle timeline playback',
    category: 'timeline',
    defaultKeys: ['space'],
    keys: ['space'],
    action: 'timelinePlayPause',
  },
  {
    id: 'timeline-stop',
    name: 'Stop Timeline',
    description: 'Stop timeline and reset to start',
    category: 'timeline',
    defaultKeys: ['shift+space'],
    keys: ['shift+space'],
    action: 'timelineStop',
  },
  {
    id: 'timeline-start',
    name: 'Go to Start',
    description: 'Move playhead to start',
    category: 'timeline',
    defaultKeys: ['home'],
    keys: ['home'],
    action: 'timelineStart',
  },
  {
    id: 'timeline-end',
    name: 'Go to End',
    description: 'Move playhead to end',
    category: 'timeline',
    defaultKeys: ['end'],
    keys: ['end'],
    action: 'timelineEnd',
  },
  {
    id: 'timeline-frame-next',
    name: 'Next Frame',
    description: 'Move playhead forward one frame',
    category: 'timeline',
    defaultKeys: ['.'],
    keys: ['.'],
    action: 'timelineFrameNext',
  },
  {
    id: 'timeline-frame-prev',
    name: 'Previous Frame',
    description: 'Move playhead backward one frame',
    category: 'timeline',
    defaultKeys: [','],
    keys: [','],
    action: 'timelineFramePrev',
  },
  {
    id: 'add-keyframe',
    name: 'Add Keyframe',
    description: 'Add keyframe at current position',
    category: 'timeline',
    defaultKeys: ['k'],
    keys: ['k'],
    action: 'addKeyframe',
  },
  {
    id: 'phase-in',
    name: 'Switch to In Phase',
    description: 'Switch timeline to In phase',
    category: 'timeline',
    defaultKeys: ['1'],
    keys: ['1'],
    action: 'phaseIn',
  },
  {
    id: 'phase-loop',
    name: 'Switch to Loop Phase',
    description: 'Switch timeline to Loop phase',
    category: 'timeline',
    defaultKeys: ['2'],
    keys: ['2'],
    action: 'phaseLoop',
  },
  {
    id: 'phase-out',
    name: 'Switch to Out Phase',
    description: 'Switch timeline to Out phase',
    category: 'timeline',
    defaultKeys: ['3'],
    keys: ['3'],
    action: 'phaseOut',
  },

  // Playback
  {
    id: 'play-in',
    name: 'Play In',
    description: 'Play the selected template(s)',
    category: 'playback',
    defaultKeys: ['f1'],
    keys: ['f1'],
    action: 'playIn',
  },
  {
    id: 'play-out',
    name: 'Play Out',
    description: 'Play out the on-air template(s)',
    category: 'playback',
    defaultKeys: ['f2'],
    keys: ['f2'],
    action: 'playOut',
  },
  {
    id: 'preview-toggle',
    name: 'Toggle Preview',
    description: 'Toggle live preview mode',
    category: 'playback',
    defaultKeys: ['p'],
    keys: ['p'],
    action: 'previewToggle',
  },

  // Layers & Templates
  {
    id: 'new-template',
    name: 'New Template',
    description: 'Create a new template',
    category: 'layers',
    defaultKeys: ['ctrl+n'],
    keys: ['ctrl+n'],
    action: 'newTemplate',
  },
  {
    id: 'duplicate-template',
    name: 'Duplicate Template',
    description: 'Duplicate current template',
    category: 'layers',
    defaultKeys: ['ctrl+shift+d'],
    keys: ['ctrl+shift+d'],
    action: 'duplicateTemplate',
  },
];

// Storage key for custom shortcuts
const SHORTCUTS_STORAGE_KEY = 'nova-gfx-keyboard-shortcuts';

// Load shortcuts from localStorage
export function loadShortcuts(): KeyboardShortcut[] {
  try {
    const stored = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (stored) {
      const customKeys = JSON.parse(stored) as Record<string, string[]>;
      return DEFAULT_SHORTCUTS.map(shortcut => ({
        ...shortcut,
        keys: customKeys[shortcut.id] || shortcut.defaultKeys,
      }));
    }
  } catch (e) {
    console.warn('Failed to load custom shortcuts:', e);
  }
  return DEFAULT_SHORTCUTS.map(s => ({ ...s }));
}

// Save shortcuts to localStorage
export function saveShortcuts(shortcuts: KeyboardShortcut[]): void {
  try {
    const customKeys: Record<string, string[]> = {};
    shortcuts.forEach(s => {
      // Only save if different from defaults
      if (JSON.stringify(s.keys) !== JSON.stringify(s.defaultKeys)) {
        customKeys[s.id] = s.keys;
      }
    });
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(customKeys));
  } catch (e) {
    console.warn('Failed to save custom shortcuts:', e);
  }
}

// Reset all shortcuts to defaults
export function resetShortcuts(): KeyboardShortcut[] {
  localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
  return DEFAULT_SHORTCUTS.map(s => ({ ...s, keys: [...s.defaultKeys] }));
}

// Format key combination for display
export function formatKeyCombo(keys: string): string {
  return keys
    .split('+')
    .map(key => KEY_DISPLAY_NAMES[key.toLowerCase()] || key.toUpperCase())
    .join(' + ');
}

// Parse keyboard event to key combo string
export function eventToKeyCombo(e: KeyboardEvent): string {
  const parts: string[] = [];

  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');

  const key = e.key.toLowerCase();
  if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
    parts.push(key);
  }

  return parts.join('+');
}

// Check if a key combo matches a shortcut
export function matchesShortcut(combo: string, shortcut: KeyboardShortcut): boolean {
  return shortcut.keys.some(key => key.toLowerCase() === combo.toLowerCase());
}

// Find shortcut by key combo
export function findShortcutByCombo(
  combo: string,
  shortcuts: KeyboardShortcut[]
): KeyboardShortcut | undefined {
  return shortcuts.find(s => matchesShortcut(combo, s));
}

// Get shortcuts by category
export function getShortcutsByCategory(
  shortcuts: KeyboardShortcut[]
): Map<ShortcutCategory, KeyboardShortcut[]> {
  const grouped = new Map<ShortcutCategory, KeyboardShortcut[]>();

  shortcuts.forEach(shortcut => {
    const existing = grouped.get(shortcut.category) || [];
    existing.push(shortcut);
    grouped.set(shortcut.category, existing);
  });

  return grouped;
}
