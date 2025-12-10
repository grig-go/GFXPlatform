import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  ScrollArea,
  cn,
} from '@emergent-platform/ui';
import { Keyboard, RotateCcw, Search, X } from 'lucide-react';
import { useKeyboardShortcutsStore, type ShortcutDefinition } from '@/stores/keyboardShortcutsStore';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Group shortcuts by category
const CATEGORIES = [
  { id: 'playout', label: 'Playout Controls' },
  { id: 'playlist', label: 'Playlist' },
  { id: 'navigation', label: 'Navigation' },
] as const;

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const { shortcuts, updateShortcut, resetShortcut, resetAllShortcuts } = useKeyboardShortcutsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter shortcuts based on search
  const filteredShortcuts = shortcuts.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.keys.join('+').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group filtered shortcuts by category
  const groupedShortcuts = CATEGORIES.map((cat) => ({
    ...cat,
    shortcuts: filteredShortcuts.filter((s) => s.category === cat.id),
  })).filter((group) => group.shortcuts.length > 0);

  // Handle key recording for editing
  useEffect(() => {
    if (!editingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Build key combination
      const keys: string[] = [];
      if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');

      // Get the main key
      let mainKey = e.key;
      if (mainKey === ' ') mainKey = 'Space';
      else if (mainKey === 'ArrowLeft') mainKey = '←';
      else if (mainKey === 'ArrowRight') mainKey = '→';
      else if (mainKey === 'ArrowUp') mainKey = '↑';
      else if (mainKey === 'ArrowDown') mainKey = '↓';
      else if (mainKey.length === 1) mainKey = mainKey.toUpperCase();

      // Don't add modifier keys alone
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        keys.push(mainKey);
      }

      if (keys.length > 0 && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        setRecordedKeys(keys);

        // Check for conflicts
        const keyCombo = keys.join('+');
        const conflict = shortcuts.find(
          (s) => s.id !== editingId && s.keys.join('+') === keyCombo
        );

        if (conflict) {
          setConflictWarning(`Already used by "${conflict.name}"`);
        } else {
          setConflictWarning(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editingId, shortcuts]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const startEditing = (shortcut: ShortcutDefinition) => {
    setEditingId(shortcut.id);
    setRecordedKeys(shortcut.keys);
    setConflictWarning(null);
  };

  const saveShortcut = () => {
    if (editingId && recordedKeys.length > 0 && !conflictWarning) {
      updateShortcut(editingId, recordedKeys);
    }
    cancelEditing();
  };

  const cancelEditing = () => {
    setEditingId(null);
    setRecordedKeys([]);
    setConflictWarning(null);
  };

  const handleResetShortcut = (id: string) => {
    resetShortcut(id);
    if (editingId === id) {
      cancelEditing();
    }
  };

  const formatKeys = (keys: string[]) => {
    return keys.map((key, i) => (
      <span key={i} className="inline-flex items-center">
        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border border-border rounded">
          {key}
        </kbd>
        {i < keys.length - 1 && <span className="mx-0.5 text-muted-foreground">+</span>}
      </span>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-cyan-500" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            View and customize keyboard shortcuts. Click on a shortcut to edit it.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shortcuts..."
            className="pl-9"
          />
        </div>

        {/* Shortcuts List */}
        <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
          <div className="space-y-6 py-2">
            {groupedShortcuts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Keyboard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No shortcuts match your search</p>
              </div>
            ) : (
              groupedShortcuts.map((group) => (
                <div key={group.id}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg transition-colors',
                          editingId === shortcut.id
                            ? 'bg-cyan-500/10 border border-cyan-500/30'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{shortcut.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {shortcut.description}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {editingId === shortcut.id ? (
                            // Editing mode
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 min-w-[100px]">
                                {recordedKeys.length > 0 ? (
                                  formatKeys(recordedKeys)
                                ) : (
                                  <span className="text-xs text-muted-foreground animate-pulse">
                                    Press keys...
                                  </span>
                                )}
                              </div>
                              <input
                                ref={inputRef}
                                className="sr-only"
                                onBlur={() => setTimeout(cancelEditing, 100)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={saveShortcut}
                                disabled={recordedKeys.length === 0 || !!conflictWarning}
                              >
                                <span className="text-green-500">✓</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={cancelEditing}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            // View mode
                            <>
                              <button
                                onClick={() => startEditing(shortcut)}
                                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                              >
                                {formatKeys(shortcut.keys)}
                              </button>
                              {shortcut.keys.join('+') !== shortcut.defaultKeys.join('+') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                  onClick={() => handleResetShortcut(shortcut.id)}
                                  title="Reset to default"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Conflict Warning */}
          {conflictWarning && (
            <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
              {conflictWarning}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={resetAllShortcuts}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1.5" />
            Reset All
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
