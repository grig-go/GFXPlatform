/**
 * Animation Node for Visual Logic Builder
 * Represents playing a template animation on a layer
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play, Layers, Clapperboard } from 'lucide-react';
import { cn } from '@emergent-platform/ui';

interface AnimationNodeData {
  templateId?: string;
  templateName?: string;
  layerId?: string;
  layerName?: string;
  phase?: 'in' | 'loop' | 'out';
  data?: string;
}

const PHASE_COLORS: Record<string, string> = {
  in: 'text-emerald-500',
  loop: 'text-violet-500',
  out: 'text-amber-500',
};

const PHASE_LABELS: Record<string, string> = {
  in: 'In',
  loop: 'Loop',
  out: 'Out',
};

export const AnimationNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as AnimationNodeData;

  return (
    <div
      className={cn(
        'px-4 py-2 rounded-lg border-2 bg-background shadow-md min-w-[160px]',
        'border-purple-500/50',
        selected && 'border-purple-500 ring-2 ring-purple-500/20'
      )}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500 border-2 border-background"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1 rounded bg-purple-500/10">
          <Play className="w-3 h-3 text-purple-500" />
        </div>
        <span className="text-[10px] font-medium text-purple-500 uppercase">Animation</span>
      </div>

      {/* Content */}
      <div className="text-sm font-medium flex items-center gap-1.5">
        <Clapperboard className="w-3.5 h-3.5 text-muted-foreground" />
        {nodeData.templateName || 'Select Template'}
      </div>

      {nodeData.layerName && (
        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          {nodeData.layerName}
        </div>
      )}

      {nodeData.phase && (
        <div className={cn('text-[10px] mt-0.5 font-medium', PHASE_COLORS[nodeData.phase])}>
          Phase: {PHASE_LABELS[nodeData.phase]}
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500 border-2 border-background"
      />
    </div>
  );
});

AnimationNode.displayName = 'AnimationNode';
