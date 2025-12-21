import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, RotateCcw, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { formatShortcut, parseKeyEvent } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: KeyboardShortcut[];
  onUpdateShortcut: (id: string, updates: Partial<KeyboardShortcut>) => void;
  onResetShortcuts: () => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  shortcuts,
  onUpdateShortcut,
  onResetShortcuts,
}: KeyboardShortcutsDialogProps) {
  const { t } = useTranslation('settings');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<{ key: string; modifiers: KeyboardShortcut['modifiers'] } | null>(null);

  const handleKeyCapture = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore modifier-only keypresses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }

    const parsed = parseKeyEvent(e.nativeEvent);
    setPendingKey(parsed);
  }, []);

  const handleStartEditing = (id: string) => {
    setEditingId(id);
    setPendingKey(null);
  };

  const handleSaveKey = (id: string) => {
    if (pendingKey) {
      onUpdateShortcut(id, {
        key: pendingKey.key,
        modifiers: pendingKey.modifiers,
      });
    }
    setEditingId(null);
    setPendingKey(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPendingKey(null);
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    onUpdateShortcut(id, { enabled });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {t('shortcuts.title', 'Keyboard Shortcuts')}
          </DialogTitle>
          <DialogDescription>
            {t('shortcuts.description', 'Configure keyboard shortcuts for playlist controls. Click on a shortcut to change it.')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-2">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  editingId === shortcut.id ? 'border-blue-500 bg-blue-50' : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{shortcut.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {shortcut.description}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  {editingId === shortcut.id ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="px-3 py-1.5 bg-white border-2 border-blue-500 rounded text-sm font-mono min-w-[100px] text-center focus:outline-none"
                        tabIndex={0}
                        onKeyDown={handleKeyCapture}
                        autoFocus
                      >
                        {pendingKey ? formatShortcut({ ...shortcut, key: pendingKey.key, modifiers: pendingKey.modifiers }) : t('shortcuts.pressKey', 'Press a key...')}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSaveKey(shortcut.id)}
                        disabled={!pendingKey}
                      >
                        {t('shortcuts.save', 'Save')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Badge
                        variant="secondary"
                        className="font-mono cursor-pointer hover:bg-secondary/80 min-w-[80px] justify-center"
                        onClick={() => handleStartEditing(shortcut.id)}
                      >
                        {formatShortcut(shortcut)}
                      </Badge>
                      <Switch
                        checked={shortcut.enabled}
                        onCheckedChange={(checked) => handleToggleEnabled(shortcut.id, checked)}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onResetShortcuts}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t('shortcuts.reset', 'Reset to Defaults')}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            {t('shortcuts.done', 'Done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
