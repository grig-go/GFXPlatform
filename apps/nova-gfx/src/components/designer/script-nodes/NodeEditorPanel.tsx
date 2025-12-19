/**
 * Node Editor Panel
 * Shows property editor for selected script nodes
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@emergent-platform/ui';
import {
  X,
  MousePointer,
  Zap,
  Filter,
  Database,
  Play,
} from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import { setDropdownOpen } from '../ScriptEditorPanel';
import type { Node } from '@xyflow/react';

// Event types available
const EVENT_TYPES = [
  { value: 'click', label: 'On Click' },
  { value: 'doubleClick', label: 'On Double Click' },
  { value: 'change', label: 'On Change' },
  { value: 'submit', label: 'On Submit' },
  { value: 'focus', label: 'On Focus' },
  { value: 'blur', label: 'On Blur' },
  { value: 'hover', label: 'On Hover' },
  { value: 'load', label: 'On Load' },
  { value: 'timer', label: 'On Timer' },
];

// Action types available
const ACTION_TYPES = [
  { value: 'setState', label: 'Set State' },
  { value: 'toggleState', label: 'Toggle State' },
  { value: 'navigate', label: 'Navigate to Screen' },
  { value: 'playAnimation', label: 'Play Animation' },
  { value: 'stopAnimation', label: 'Stop Animation' },
  { value: 'playTemplate', label: 'Play Template' },
  { value: 'showElement', label: 'Show Element' },
  { value: 'hideElement', label: 'Hide Element' },
  { value: 'toggleElement', label: 'Toggle Element' },
  { value: 'fetchData', label: 'Fetch Data' },
  { value: 'submitForm', label: 'Submit Form' },
  { value: 'validateForm', label: 'Validate Form' },
  { value: 'log', label: 'Log Message' },
  { value: 'delay', label: 'Delay' },
  { value: 'callFunction', label: 'Call Function' },
];

// Condition operators
const OPERATORS = [
  { value: 'equals', label: '= equals' },
  { value: 'notEquals', label: '!= not equals' },
  { value: 'greaterThan', label: '> greater than' },
  { value: 'lessThan', label: '< less than' },
  { value: 'greaterOrEqual', label: '>= greater or equal' },
  { value: 'lessOrEqual', label: '<= less or equal' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
  { value: 'isTrue', label: 'is true' },
  { value: 'isFalse', label: 'is false' },
];

// Data operations
const DATA_OPERATIONS = [
  { value: 'get', label: 'Get Value' },
  { value: 'set', label: 'Set Value' },
  { value: 'filter', label: 'Filter Array' },
  { value: 'map', label: 'Transform Array' },
  { value: 'find', label: 'Find Item' },
  { value: 'count', label: 'Count Items' },
  { value: 'sum', label: 'Sum Values' },
  { value: 'sort', label: 'Sort Array' },
];

// Animation phases
const ANIMATION_PHASES = [
  { value: 'in', label: 'In (Entrance)' },
  { value: 'loop', label: 'Loop (Middle)' },
  { value: 'out', label: 'Out (Exit)' },
];

interface NodeEditorPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeEditorPanel({ node, onUpdate, onClose }: NodeEditorPanelProps) {
  const { elements, templates, layers } = useDesignerStore();
  const [localData, setLocalData] = useState<Record<string, unknown>>({});

  // Sync local state with node data
  useEffect(() => {
    if (node) {
      setLocalData(node.data as Record<string, unknown>);
    }
  }, [node]);

  // Update handler - supports single key or multiple keys via object
  const handleUpdate = useCallback((keyOrUpdates: string | Record<string, unknown>, value?: unknown) => {
    let newData: Record<string, unknown>;
    if (typeof keyOrUpdates === 'string') {
      newData = { ...localData, [keyOrUpdates]: value };
    } else {
      newData = { ...localData, ...keyOrUpdates };
    }
    setLocalData(newData);
    if (node) {
      onUpdate(node.id, newData);
    }
  }, [localData, node, onUpdate]);

  if (!node) return null;

  const nodeType = node.type;
  const Icon = nodeType === 'event' ? MousePointer
    : nodeType === 'action' ? Zap
    : nodeType === 'condition' ? Filter
    : nodeType === 'animation' ? Play
    : Database;

  const color = nodeType === 'event' ? 'blue'
    : nodeType === 'action' ? 'green'
    : nodeType === 'condition' ? 'yellow'
    : nodeType === 'animation' ? 'purple'
    : 'purple';

  // Stop events from propagating to React Flow and parent components
  const stopPropagation = (e: React.MouseEvent | React.KeyboardEvent | React.PointerEvent) => {
    e.stopPropagation();
    // Also prevent default for pointer events to avoid unintended interactions
    if ('nativeEvent' in e && e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation?.();
    }
  };

  return (
    <div
      className="absolute right-2 top-12 w-56 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl z-50"
      onMouseDown={stopPropagation}
      onKeyDown={stopPropagation}
      onClick={stopPropagation}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3 h-3 text-${color}-400`} />
          <span className="text-xs font-medium capitalize text-zinc-200">{nodeType} Node</span>
        </div>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={onClose}>
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto">
        {/* Event Node Editor */}
        {nodeType === 'event' && (
          <>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Event Type</Label>
              <Select
                value={localData.eventType as string || 'click'}
                onValueChange={(v) => handleUpdate('eventType', v)}
                onOpenChange={setDropdownOpen}
              >
                <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {EVENT_TYPES.map((evt) => (
                    <SelectItem key={evt.value} value={evt.value} className="text-xs text-zinc-200">
                      {evt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Target Element</Label>
              <Select
                value={localData.elementId as string || ''}
                onValueChange={(v) => {
                  const el = elements.find(e => e.id === v);
                  handleUpdate({
                    elementId: v,
                    elementName: el?.name || 'Unknown',
                  });
                }}
                onOpenChange={setDropdownOpen}
              >
                <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue placeholder="Select element..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="__any__" className="text-xs text-zinc-200">Any Element</SelectItem>
                  {elements.map((el) => (
                    <SelectItem key={el.id} value={el.id} className="text-xs text-zinc-200">
                      {el.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {localData.eventType === 'timer' && (
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400">Interval (ms)</Label>
                <Input
                  type="number"
                  className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200"
                  value={localData.interval as number || 1000}
                  onChange={(e) => handleUpdate('interval', parseInt(e.target.value))}
                />
              </div>
            )}
          </>
        )}

        {/* Action Node Editor */}
        {nodeType === 'action' && (
          <>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Action Type</Label>
              <Select
                value={localData.actionType as string || 'setState'}
                onValueChange={(v) => handleUpdate('actionType', v)}
                onOpenChange={setDropdownOpen}
              >
                <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {ACTION_TYPES.map((act) => (
                    <SelectItem key={act.value} value={act.value} className="text-xs text-zinc-200">
                      {act.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* State actions */}
            {(localData.actionType === 'setState' || localData.actionType === 'toggleState') && (
              <>
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">State Key</Label>
                  <Input
                    className="h-7 text-xs font-mono bg-zinc-800 border-zinc-700 text-zinc-200"
                    placeholder="e.g., isLoggedIn"
                    value={localData.target as string || ''}
                    onChange={(e) => handleUpdate('target', e.target.value)}
                  />
                </div>
                {localData.actionType === 'setState' && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Value</Label>
                    <Input
                      className="h-7 text-xs font-mono bg-zinc-800 border-zinc-700 text-zinc-200"
                      placeholder="e.g., true, 'hello', 42"
                      value={localData.value as string || ''}
                      onChange={(e) => handleUpdate('value', e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {/* Navigate action */}
            {localData.actionType === 'navigate' && (
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400">Target Screen</Label>
                <Select
                  value={localData.target as string || ''}
                  onValueChange={(v) => handleUpdate('target', v)}
                  onOpenChange={setDropdownOpen}
                >
                  <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs text-zinc-200">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Play template action */}
            {localData.actionType === 'playTemplate' && (
              <>
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Template</Label>
                  <Select
                    value={localData.templateId as string || ''}
                    onValueChange={(v) => {
                      const template = templates.find(t => t.id === v);
                      handleUpdate({
                        templateId: v,
                        templateName: template?.name || 'Unknown',
                      });
                    }}
                    onOpenChange={setDropdownOpen}
                  >
                    <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs text-zinc-200">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Layer</Label>
                  <Select
                    value={localData.layerId as string || ''}
                    onValueChange={(v) => {
                      const layer = layers.find(l => l.id === v);
                      handleUpdate({
                        layerId: v,
                        layerName: layer?.name || 'Unknown',
                      });
                    }}
                    onOpenChange={setDropdownOpen}
                  >
                    <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {layers.map((l) => (
                        <SelectItem key={l.id} value={l.id} className="text-xs text-zinc-200">
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Show/Hide/Toggle element */}
            {(localData.actionType === 'showElement' ||
              localData.actionType === 'hideElement' ||
              localData.actionType === 'toggleElement') && (
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400">Target Element</Label>
                <Select
                  value={localData.elementId as string || ''}
                  onValueChange={(v) => handleUpdate('elementId', v)}
                  onOpenChange={setDropdownOpen}
                >
                  <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {elements.map((el) => (
                      <SelectItem key={el.id} value={el.id} className="text-xs text-zinc-200">
                        {el.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Play/Stop animation */}
            {(localData.actionType === 'playAnimation' || localData.actionType === 'stopAnimation') && (
              <>
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Element</Label>
                  <Select
                    value={localData.elementId as string || ''}
                    onValueChange={(v) => handleUpdate('elementId', v)}
                    onOpenChange={setDropdownOpen}
                  >
                    <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {elements.map((el) => (
                        <SelectItem key={el.id} value={el.id} className="text-xs text-zinc-200">
                          {el.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Phase</Label>
                  <Select
                    value={localData.phase as string || 'in'}
                    onValueChange={(v) => handleUpdate('phase', v)}
                    onOpenChange={setDropdownOpen}
                  >
                    <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {ANIMATION_PHASES.map((p) => (
                        <SelectItem key={p.value} value={p.value} className="text-xs text-zinc-200">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Log action */}
            {localData.actionType === 'log' && (
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400">Message</Label>
                <Input
                  className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200"
                  placeholder="Debug message..."
                  value={localData.message as string || ''}
                  onChange={(e) => handleUpdate('message', e.target.value)}
                />
              </div>
            )}

            {/* Delay action */}
            {localData.actionType === 'delay' && (
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400">Duration (ms)</Label>
                <Input
                  type="number"
                  className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200"
                  value={localData.duration as number || 1000}
                  onChange={(e) => handleUpdate('duration', parseInt(e.target.value))}
                />
              </div>
            )}

            {/* Call function */}
            {localData.actionType === 'callFunction' && (
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400">Function Name</Label>
                <Input
                  className="h-7 text-xs font-mono bg-zinc-800 border-zinc-700 text-zinc-200"
                  placeholder="myFunction"
                  value={localData.functionName as string || ''}
                  onChange={(e) => handleUpdate('functionName', e.target.value)}
                />
              </div>
            )}
          </>
        )}

        {/* Condition Node Editor */}
        {nodeType === 'condition' && (
          <>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Left Value</Label>
              <Input
                className="h-7 text-xs font-mono bg-zinc-800 border-zinc-700 text-zinc-200"
                placeholder="state.count"
                value={localData.condition as string || ''}
                onChange={(e) => handleUpdate('condition', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Operator</Label>
              <Select
                value={localData.operator as string || 'equals'}
                onValueChange={(v) => handleUpdate('operator', v)}
                onOpenChange={setDropdownOpen}
              >
                <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value} className="text-xs text-zinc-200">
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(localData.operator as string) && (
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400">Right Value</Label>
                <Input
                  className="h-7 text-xs font-mono bg-zinc-800 border-zinc-700 text-zinc-200"
                  placeholder="10"
                  value={localData.value as string || ''}
                  onChange={(e) => handleUpdate('value', e.target.value)}
                />
              </div>
            )}
          </>
        )}

        {/* Data Node Editor */}
        {nodeType === 'data' && (
          <>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Operation</Label>
              <Select
                value={localData.operation as string || 'get'}
                onValueChange={(v) => handleUpdate('operation', v)}
                onOpenChange={setDropdownOpen}
              >
                <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {DATA_OPERATIONS.map((op) => (
                    <SelectItem key={op.value} value={op.value} className="text-xs text-zinc-200">
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Data Path</Label>
              <Input
                className="h-7 text-xs font-mono bg-zinc-800 border-zinc-700 text-zinc-200"
                placeholder="state.items"
                value={localData.path as string || ''}
                onChange={(e) => handleUpdate('path', e.target.value)}
              />
            </div>

            {localData.operation === 'set' && (
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400">Value</Label>
                <Input
                  className="h-7 text-xs font-mono bg-zinc-800 border-zinc-700 text-zinc-200"
                  placeholder="Value"
                  value={localData.value as string || ''}
                  onChange={(e) => handleUpdate('value', e.target.value)}
                />
              </div>
            )}

            {(localData.operation === 'filter' || localData.operation === 'find') && (
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400">Filter</Label>
                <Input
                  className="h-7 text-xs font-mono bg-zinc-800 border-zinc-700 text-zinc-200"
                  placeholder="item.active"
                  value={localData.filter as string || ''}
                  onChange={(e) => handleUpdate('filter', e.target.value)}
                />
              </div>
            )}

            {localData.operation === 'sort' && (
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400">Sort By</Label>
                <Input
                  className="h-7 text-xs font-mono bg-zinc-800 border-zinc-700 text-zinc-200"
                  placeholder="name"
                  value={localData.sortBy as string || ''}
                  onChange={(e) => handleUpdate('sortBy', e.target.value)}
                />
              </div>
            )}
          </>
        )}

        {/* Animation Node Editor */}
        {nodeType === 'animation' && (
          <>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Template</Label>
              <Select
                value={localData.templateId as string || ''}
                onValueChange={(v) => {
                  const template = templates.find(t => t.id === v);
                  handleUpdate({
                    templateId: v,
                    templateName: template?.name || 'Unknown',
                  });
                }}
                onOpenChange={setDropdownOpen}
              >
                <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs text-zinc-200">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Layer</Label>
              <Select
                value={localData.layerId as string || ''}
                onValueChange={(v) => {
                  const layer = layers.find(l => l.id === v);
                  handleUpdate({
                    layerId: v,
                    layerName: layer?.name || 'Unknown',
                  });
                }}
                onOpenChange={setDropdownOpen}
              >
                <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {layers.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs text-zinc-200">
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Phase</Label>
              <Select
                value={localData.phase as string || 'in'}
                onValueChange={(v) => handleUpdate('phase', v)}
                onOpenChange={setDropdownOpen}
              >
                <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {ANIMATION_PHASES.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs text-zinc-200">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Data (JSON)</Label>
              <Input
                className="h-7 text-xs font-mono bg-zinc-800 border-zinc-700 text-zinc-200"
                placeholder='{"title": "Hi"}'
                value={localData.data as string || ''}
                onChange={(e) => handleUpdate('data', e.target.value)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
