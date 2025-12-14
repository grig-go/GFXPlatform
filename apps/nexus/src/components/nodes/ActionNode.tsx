import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ActionNodeData {
  title: string;
  params?: Record<string, any>;
  isSelected?: boolean;
}

export const ActionNode = memo(({ data }: NodeProps<ActionNodeData>) => {
  const { t } = useTranslation(['workflows']);
  const [actionValue, setActionValue] = useState(data.params?.value || data.title);
  const [intensity, setIntensity] = useState(data.params?.intensity || 50);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 min-w-[240px] max-w-[300px]">
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-green-500 border-2 border-white dark:border-slate-800"
      />

      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Play className="w-4 h-4 text-green-500" />
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('nodes.action')}</span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <input
          type="text"
          value={actionValue}
          onChange={(e) => setActionValue(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-slate-100"
          placeholder={t('nodes.actionPlaceholder')}
        />

        <div className="space-y-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">{t('nodes.intensity')}</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300 min-w-[3ch] text-right">{intensity}</span>
          </div>
        </div>
      </div>
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500 border-2 border-white dark:border-slate-800"
      />
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
