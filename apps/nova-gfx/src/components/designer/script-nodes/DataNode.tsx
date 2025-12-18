/**
 * Data Node for Visual Logic Builder
 * Represents data operations (get, transform, filter, aggregate)
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Database, Filter, ArrowUpDown, Calculator, Search } from 'lucide-react';
import { cn } from '@emergent-platform/ui';

interface DataNodeData {
  operation: string;
  path?: string;
  outputTo?: string;
}

const OPERATION_ICONS: Record<string, React.ElementType> = {
  get: Search,
  filter: Filter,
  sort: ArrowUpDown,
  aggregate: Calculator,
  transform: Database,
};

const OPERATION_LABELS: Record<string, string> = {
  get: 'Get Value',
  filter: 'Filter Data',
  sort: 'Sort Data',
  aggregate: 'Aggregate',
  transform: 'Transform',
};

export const DataNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as DataNodeData;
  const Icon = OPERATION_ICONS[nodeData.operation] || Database;

  return (
    <div
      className={cn(
        'px-4 py-2 rounded-lg border-2 bg-background shadow-md min-w-[140px]',
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
          <Icon className="w-3 h-3 text-purple-500" />
        </div>
        <span className="text-[10px] font-medium text-purple-500 uppercase">Data</span>
      </div>

      {/* Content */}
      <div className="text-sm font-medium">
        {OPERATION_LABELS[nodeData.operation] || nodeData.operation}
      </div>
      {nodeData.path && (
        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate max-w-[120px]">
          {nodeData.path}
        </div>
      )}
      {nodeData.outputTo && (
        <div className="text-[10px] text-purple-400 mt-0.5">
          → {nodeData.outputTo}
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

DataNode.displayName = 'DataNode';
