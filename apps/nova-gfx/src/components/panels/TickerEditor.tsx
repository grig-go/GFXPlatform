import { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, Edit2, Check, X, ChevronDown } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Slider,
  cn,
} from '@emergent-platform/ui';
import type { TickerItem, TickerConfig, TickerMode, TickerDirection, TickerTopic, TickerTextAlign } from '@emergent-platform/types';
import { DEFAULT_TICKER_CONFIG, TICKER_TEMPLATES, TOPIC_BADGE_STYLES } from '@emergent-platform/types';
import { TopicBadgePreview } from '@/components/canvas/TopicBadgeElement';

interface TickerEditorProps {
  items: TickerItem[];
  config: Partial<TickerConfig>;
  onItemsChange: (items: TickerItem[]) => void;
  onConfigChange: (config: Partial<TickerConfig>) => void;
}

export function TickerEditor({
  items,
  config: configOverride,
  onItemsChange,
  onConfigChange,
}: TickerEditorProps) {
  const config = { ...DEFAULT_TICKER_CONFIG, ...configOverride };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  // Add new item
  const handleAddItem = useCallback(() => {
    if (!newItemText.trim()) return;

    const newItem: TickerItem = {
      id: `item-${Date.now()}`,
      content: newItemText.trim(),
    };

    onItemsChange([...items, newItem]);
    setNewItemText('');
  }, [newItemText, items, onItemsChange]);

  // Remove item
  const handleRemoveItem = useCallback((id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  }, [items, onItemsChange]);

  // Update item
  const handleUpdateItem = useCallback((id: string, updates: Partial<TickerItem>) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    setEditingId(null);
  }, [items, onItemsChange]);

  // Move item (drag and drop simulation)
  const handleMoveItem = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= items.length) return;

    const newItems = [...items];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);
    onItemsChange(newItems);
  }, [items, onItemsChange]);

  // Apply template
  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = TICKER_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      onConfigChange({
        ...config,
        ...template.config,
      });
    }
  }, [config, onConfigChange]);

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quick Templates</Label>
        <Select onValueChange={handleApplyTemplate}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Apply a template..." />
          </SelectTrigger>
          <SelectContent>
            {TICKER_TEMPLATES.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex flex-col">
                  <span>{template.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {template.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mode & Direction */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium w-full hover:bg-muted/50 p-1 rounded">
          <ChevronDown className="w-3 h-3" />
          Ticker Settings
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Mode</Label>
              <Select
                value={config.mode}
                onValueChange={(v) => onConfigChange({ ...config, mode: v as TickerMode })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scroll">Scroll</SelectItem>
                  <SelectItem value="flip">Flip</SelectItem>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Direction</Label>
              <Select
                value={config.direction}
                onValueChange={(v) => onConfigChange({ ...config, direction: v as TickerDirection })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="up">Up</SelectItem>
                  <SelectItem value="down">Down</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Text Alignment - only for flip/fade/slide modes */}
          {config.mode !== 'scroll' && (
            <div className="space-y-1">
              <Label className="text-xs">Text Align</Label>
              <Select
                value={config.textAlign || 'left'}
                onValueChange={(v) => onConfigChange({ ...config, textAlign: v as TickerTextAlign })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Speed / Delay */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs">
                {config.mode === 'scroll' ? 'Speed' : 'Delay'}
              </Label>
              <span className="text-xs text-muted-foreground">
                {config.mode === 'scroll' ? `${config.speed}px/s` : `${config.delay}ms`}
              </span>
            </div>
            <Slider
              value={[config.mode === 'scroll' ? config.speed : config.delay]}
              onValueChange={([v]) =>
                onConfigChange({
                  ...config,
                  [config.mode === 'scroll' ? 'speed' : 'delay']: v,
                })
              }
              min={config.mode === 'scroll' ? 10 : 500}
              max={config.mode === 'scroll' ? 200 : 10000}
              step={config.mode === 'scroll' ? 5 : 100}
              className="py-2"
            />
          </div>

          {/* Gap (scroll mode) */}
          {config.mode === 'scroll' && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs">Gap</Label>
                <span className="text-xs text-muted-foreground">{config.gap}px</span>
              </div>
              <Slider
                value={[config.gap]}
                onValueChange={([v]) => onConfigChange({ ...config, gap: v })}
                min={0}
                max={200}
                step={10}
                className="py-2"
              />
            </div>
          )}

          {/* Pause on hover */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.pauseOnHover}
              onChange={(e) => onConfigChange({ ...config, pauseOnHover: e.target.checked })}
              className="w-3 h-3 rounded"
            />
            <span className="text-xs">Pause on hover</span>
          </label>

          {/* Loop */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.loop}
              onChange={(e) => onConfigChange({ ...config, loop: e.target.checked })}
              className="w-3 h-3 rounded"
            />
            <span className="text-xs">Loop continuously</span>
          </label>

          {/* Gradient (scroll mode) */}
          {config.mode === 'scroll' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.gradient}
                onChange={(e) => onConfigChange({ ...config, gradient: e.target.checked })}
                className="w-3 h-3 rounded"
              />
              <span className="text-xs">Edge gradient fade</span>
            </label>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Items List */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium w-full hover:bg-muted/50 p-1 rounded">
          <ChevronDown className="w-3 h-3" />
          Ticker Items ({items.length})
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {/* Add new item */}
          <div className="flex gap-1">
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Add ticker item..."
              className="h-7 text-xs"
            />
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7 shrink-0"
              onClick={handleAddItem}
              disabled={!newItemText.trim()}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Items list */}
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {items.map((item, index) => (
              <TickerItemRow
                key={item.id}
                item={item}
                index={index}
                isEditing={editingId === item.id}
                onEdit={() => setEditingId(item.id)}
                onCancelEdit={() => setEditingId(null)}
                onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                onRemove={() => handleRemoveItem(item.id)}
                onMoveUp={() => handleMoveItem(index, 'up')}
                onMoveDown={() => handleMoveItem(index, 'down')}
                canMoveUp={index > 0}
                canMoveDown={index < items.length - 1}
              />
            ))}

            {items.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">
                No items. Add your first ticker item above.
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Item Row Component
interface TickerItemRowProps {
  item: TickerItem;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<TickerItem>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function TickerItemRow({
  item,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: TickerItemRowProps) {
  const [editValue, setEditValue] = useState(item.content);
  const [showTopicSelect, setShowTopicSelect] = useState(false);

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate({ content: editValue.trim() });
    } else {
      onCancelEdit();
    }
  };

  const topicStyle = item.topic ? TOPIC_BADGE_STYLES[item.topic] : null;

  if (isEditing) {
    return (
      <div className="space-y-2 p-2 bg-muted/50 rounded">
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="h-7 text-xs flex-1"
            autoFocus
            placeholder="Ticker item text..."
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}>
            <Check className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancelEdit}>
            <X className="w-3 h-3" />
          </Button>
        </div>
        {/* Topic selector */}
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground w-12">Topic:</Label>
          <select
            value={item.topic || ''}
            onChange={(e) => onUpdate({ topic: e.target.value as TickerTopic || undefined })}
            className="flex-1 h-6 text-[10px] bg-background border border-input rounded px-1"
          >
            <option value="">None</option>
            {Object.entries(TOPIC_BADGE_STYLES).map(([key, style]) => (
              <option key={key} value={key}>
                {style.icon} {style.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 hover:bg-muted/50 rounded group">
      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
        >
          <ChevronDown className="w-3 h-3 rotate-180" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
      
      <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab" />
      
      {/* Topic badge indicator */}
      {topicStyle && (
        <div
          className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0"
          style={{
            backgroundColor: topicStyle.backgroundColor,
            color: topicStyle.textColor,
          }}
        >
          {topicStyle.icon}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <span className="text-xs truncate block">
          {item.icon && !topicStyle && <span className="mr-1">{item.icon}</span>}
          {item.content}
        </span>
        {item.label && (
          <span className="text-[10px] text-muted-foreground truncate block">
            {item.label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}>
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default TickerEditor;

