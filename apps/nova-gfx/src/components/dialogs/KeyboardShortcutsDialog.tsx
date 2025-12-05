import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  ScrollArea,
  Badge,
  Separator,
  cn,
} from '@emergent-platform/ui';
import {
  Search,
  RotateCcw,
  Keyboard,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  type KeyboardShortcut,
  type ShortcutCategory,
  CATEGORY_NAMES,
  formatKeyCombo,
  eventToKeyCombo,
  getShortcutsByCategory,
} from '@/lib/keyboardShortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: KeyboardShortcut[];
  onUpdateShortcut: (id: string, newKeys: string[]) => void;
  onResetAll: () => void;
}

// Shortcut key input component
function ShortcutKeyInput({
  shortcut,
  onUpdate,
  allShortcuts,
}: {
  shortcut: KeyboardShortcut;
  onUpdate: (newKeys: string[]) => void;
  allShortcuts: KeyboardShortcut[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [conflict, setConflict] = useState<KeyboardShortcut | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Escape cancels editing
    if (e.key === 'Escape') {
      setIsEditing(false);
      setNewKey('');
      setConflict(null);
      return;
    }

    // Enter confirms the new key
    if (e.key === 'Enter' && newKey) {
      if (!conflict) {
        onUpdate([newKey]);
        setIsEditing(false);
        setNewKey('');
      }
      return;
    }

    // Ignore modifier-only keypresses
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return;
    }

    const combo = eventToKeyCombo(e.nativeEvent);
    setNewKey(combo);

    // Check for conflicts
    const conflicting = allShortcuts.find(
      s => s.id !== shortcut.id && s.keys.some(k => k.toLowerCase() === combo.toLowerCase())
    );
    setConflict(conflicting || null);
  };

  const handleConfirm = () => {
    if (newKey && !conflict) {
      onUpdate([newKey]);
      setIsEditing(false);
      setNewKey('');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewKey('');
    setConflict(null);
  };

  const handleReset = () => {
    onUpdate([...shortcut.defaultKeys]);
    setIsEditing(false);
    setNewKey('');
    setConflict(null);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input
            ref={inputRef}
            data-shortcut-input
            value={newKey ? formatKeyCombo(newKey) : 'Press keys...'}
            onKeyDown={handleKeyDown}
            readOnly
            className={cn(
              'w-40 text-sm font-mono text-center',
              conflict && 'border-red-500 focus-visible:ring-red-500'
            )}
          />
          {conflict && (
            <div className="absolute -bottom-5 left-0 text-[10px] text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Used by "{conflict.name}"
            </div>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={handleConfirm}
          disabled={!newKey || !!conflict}
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={handleCancel}
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground"
          onClick={handleReset}
          title="Reset to default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  const isCustom = JSON.stringify(shortcut.keys) !== JSON.stringify(shortcut.defaultKeys);

  return (
    <div
      className="flex items-center gap-2 cursor-pointer group"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex gap-1.5 flex-wrap">
        {shortcut.keys.map((key, i) => (
          <Badge
            key={i}
            variant="secondary"
            className={cn(
              'font-mono text-xs px-2 py-0.5 hover:bg-violet-500/20',
              isCustom && 'border-violet-500/50'
            )}
          >
            {formatKeyCombo(key)}
          </Badge>
        ))}
      </div>
      {isCustom && (
        <span className="text-[10px] text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
          (customized)
        </span>
      )}
    </div>
  );
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  shortcuts,
  onUpdateShortcut,
  onResetAll,
}: KeyboardShortcutsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | 'all'>('all');

  // Filter shortcuts
  const filteredShortcuts = shortcuts.filter(shortcut => {
    if (selectedCategory !== 'all' && shortcut.category !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        shortcut.name.toLowerCase().includes(query) ||
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.keys.some(k => k.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Group by category
  const groupedShortcuts = getShortcutsByCategory(filteredShortcuts);

  // Category order
  const categoryOrder: ShortcutCategory[] = [
    'general',
    'tools',
    'editing',
    'view',
    'timeline',
    'playback',
    'layers',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetAll}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'ghost'}
              onClick={() => setSelectedCategory('all')}
              className="text-xs"
            >
              All
            </Button>
            {categoryOrder.map(cat => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? 'default' : 'ghost'}
                onClick={() => setSelectedCategory(cat)}
                className="text-xs"
              >
                {CATEGORY_NAMES[cat]}
              </Button>
            ))}
          </div>

          {/* Shortcuts List */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-4 space-y-6">
              {categoryOrder.map(category => {
                const categoryShortcuts = groupedShortcuts.get(category);
                if (!categoryShortcuts || categoryShortcuts.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                      {CATEGORY_NAMES[category]}
                    </h3>
                    <div className="space-y-2">
                      {categoryShortcuts.map(shortcut => (
                        <div
                          key={shortcut.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="font-medium text-sm">{shortcut.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {shortcut.description}
                            </div>
                          </div>
                          <ShortcutKeyInput
                            shortcut={shortcut}
                            onUpdate={(newKeys) => onUpdateShortcut(shortcut.id, newKeys)}
                            allShortcuts={shortcuts}
                          />
                        </div>
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                );
              })}

              {filteredShortcuts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No shortcuts found matching "{searchQuery}"
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="text-xs text-muted-foreground flex items-center justify-between pt-2 border-t">
            <span>Click any shortcut to customize it</span>
            <span>Press Ctrl+/ to open this dialog anytime</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
