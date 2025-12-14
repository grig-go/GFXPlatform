import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TriggerNodeData {
  title: string;
  params?: Record<string, any>;
  isSelected?: boolean;
}

export const TriggerNode = memo(({ data }: NodeProps<TriggerNodeData>) => {
  const { t } = useTranslation(['workflows']);
  const [triggerValue, setTriggerValue] = useState(data.params?.value || data.title);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 min-w-[240px] max-w-[300px]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Zap className="w-4 h-4 text-blue-500" />
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('nodes.trigger')}</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <input
          type="text"
          value={triggerValue}
          onChange={(e) => setTriggerValue(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
          placeholder={t('nodes.triggerPlaceholder')}
        />
      </div>
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500 border-2 border-white dark:border-slate-800"
      />
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';
