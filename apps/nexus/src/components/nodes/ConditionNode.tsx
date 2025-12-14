import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConditionNodeData {
  title: string;
  params?: Record<string, any>;
  isSelected?: boolean;
}

export const ConditionNode = memo(({ data }: NodeProps<ConditionNodeData>) => {
  const { t } = useTranslation(['workflows']);
  const [operator, setOperator] = useState(data.params?.operator || '=');
  const [conditionValue, setConditionValue] = useState(data.params?.value || data.title);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 min-w-[240px] max-w-[300px]">
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-500 border-2 border-white dark:border-slate-800"
      />

      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-purple-500" />
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('nodes.condition')}</span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <input
          type="text"
          value={conditionValue}
          onChange={(e) => setConditionValue(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100"
          placeholder={t('nodes.conditionPlaceholder')}
        />
        
        <div className="flex gap-2">
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100"
          >
            <option value="=">=</option>
            <option value="!=">!=</option>
            <option value=">">{'>'}</option>
            <option value="<">{'<'}</option>
            <option value=">=">{'>='}</option>
            <option value="<=">{'<='}</option>
          </select>
        </div>
      </div>
      
      {/* Output handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!left-[30%] w-3 h-3 !bg-green-500 border-2 border-white dark:border-slate-800"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!left-[70%] w-3 h-3 !bg-red-500 border-2 border-white dark:border-slate-800"
      />
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';