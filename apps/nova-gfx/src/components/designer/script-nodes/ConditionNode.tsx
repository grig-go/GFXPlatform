/**
 * Condition Node for Visual Logic Builder
 * Represents a conditional branch (if/else)
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { cn } from '@emergent-platform/ui';

interface ConditionNodeData {
  condition: string;
  operator: string;
  value: string;
}

const OPERATOR_LABELS: Record<string, string> = {
  equals: '=',
  notEquals: '!=',
  greaterThan: '>',
  lessThan: '<',
  greaterOrEqual: '>=',
  lessOrEqual: '<=',
  contains: 'contains',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
};

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ConditionNodeData;

  return (
    <div
      className={cn(
        'px-4 py-2 rounded-lg border-2 bg-background shadow-md min-w-[160px]',
        'border-yellow-500/50',
        selected && 'border-yellow-500 ring-2 ring-yellow-500/20'
      )}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-yellow-500 border-2 border-background"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1 rounded bg-yellow-500/10">
          <GitBranch className="w-3 h-3 text-yellow-500" />
        </div>
        <span className="text-[10px] font-medium text-yellow-500 uppercase">Condition</span>
      </div>

      {/* Content */}
      <div className="text-sm font-medium text-center">
        {nodeData.condition}
      </div>
      <div className="text-xs text-muted-foreground text-center mt-0.5">
        {OPERATOR_LABELS[nodeData.operator] || nodeData.operator} {nodeData.value}
      </div>

      {/* Output handles - True and False */}
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
        <span className="text-green-500">Yes</span>
        <span className="text-red-500">No</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 bg-green-500 border-2 border-background"
        style={{ top: '60%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="w-3 h-3 bg-red-500 border-2 border-background"
        style={{ top: '85%' }}
      />
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
