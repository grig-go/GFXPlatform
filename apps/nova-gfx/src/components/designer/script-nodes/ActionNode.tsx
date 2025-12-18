/**
 * Action Node for Visual Logic Builder
 * Represents an action to execute (navigate, setState, etc.)
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap, Navigation, Variable, Eye, EyeOff, Play, Pause, RefreshCw, Send } from 'lucide-react';
import { cn } from '@emergent-platform/ui';

interface ActionNodeData {
  actionType: string;
  target?: string;
  value?: string;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  navigate: Navigation,
  setState: Variable,
  showElement: Eye,
  hideElement: EyeOff,
  playAnimation: Play,
  stopAnimation: Pause,
  fetchData: RefreshCw,
  submitForm: Send,
};

const ACTION_LABELS: Record<string, string> = {
  navigate: 'Navigate',
  setState: 'Set State',
  toggleState: 'Toggle State',
  showElement: 'Show Element',
  hideElement: 'Hide Element',
  toggleElement: 'Toggle Element',
  playAnimation: 'Play Animation',
  stopAnimation: 'Stop Animation',
  playTimeline: 'Play Timeline',
  fetchData: 'Fetch Data',
  submitForm: 'Submit Form',
  validateForm: 'Validate Form',
  log: 'Log',
};

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ActionNodeData;
  const Icon = ACTION_ICONS[nodeData.actionType] || Zap;

  return (
    <div
      className={cn(
        'px-4 py-2 rounded-lg border-2 bg-background shadow-md min-w-[140px]',
        'border-green-500/50',
        selected && 'border-green-500 ring-2 ring-green-500/20'
      )}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500 border-2 border-background"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1 rounded bg-green-500/10">
          <Icon className="w-3 h-3 text-green-500" />
        </div>
        <span className="text-[10px] font-medium text-green-500 uppercase">Action</span>
      </div>

      {/* Content */}
      <div className="text-sm font-medium">
        {ACTION_LABELS[nodeData.actionType] || nodeData.actionType}
      </div>
      {nodeData.target && (
        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
          {nodeData.target}
          {nodeData.value && ` = ${nodeData.value}`}
        </div>
      )}

      {/* Output handle (for chaining actions) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-background"
      />
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
