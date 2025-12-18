/**
 * Event Node for Visual Logic Builder
 * Represents an event trigger (click, change, load, etc.)
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MousePointer, Type, RefreshCw, Eye, Clock, Pointer } from 'lucide-react';
import { cn } from '@emergent-platform/ui';

interface EventNodeData {
  eventType: string;
  elementName?: string;
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  click: MousePointer,
  change: Type,
  load: RefreshCw,
  hover: Eye,
  timer: Clock,
  submit: Pointer,
};

const EVENT_LABELS: Record<string, string> = {
  click: 'On Click',
  doubleClick: 'On Double Click',
  change: 'On Change',
  hover: 'On Hover',
  load: 'On Load',
  timer: 'On Timer',
  submit: 'On Submit',
  focus: 'On Focus',
  blur: 'On Blur',
};

export const EventNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as EventNodeData;
  const Icon = EVENT_ICONS[nodeData.eventType] || MousePointer;

  return (
    <div
      className={cn(
        'px-4 py-2 rounded-lg border-2 bg-background shadow-md min-w-[140px]',
        'border-blue-500/50',
        selected && 'border-blue-500 ring-2 ring-blue-500/20'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1 rounded bg-blue-500/10">
          <Icon className="w-3 h-3 text-blue-500" />
        </div>
        <span className="text-[10px] font-medium text-blue-500 uppercase">Event</span>
      </div>

      {/* Content */}
      <div className="text-sm font-medium">
        {EVENT_LABELS[nodeData.eventType] || nodeData.eventType}
      </div>
      {nodeData.elementName && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {nodeData.elementName}
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-background"
      />
    </div>
  );
});

EventNode.displayName = 'EventNode';
