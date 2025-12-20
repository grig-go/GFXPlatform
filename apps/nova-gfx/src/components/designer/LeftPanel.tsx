/**
 * Left Panel - Tabbed container for AI Chat and Script Editor
 *
 * Switches between:
 * - AI Chat: For AI-assisted design and documentation
 * - Script Editor: For creating interactive logic (when interactive mode is enabled)
 */

import { useState } from 'react';
import { Code2, Sparkles, BookOpen, Database } from 'lucide-react';
import { cn } from '@emergent-platform/ui';
import { ChatPanel } from './ChatPanel';
import { ScriptEditorPanel } from './ScriptEditorPanel';
import { useDesignerStore } from '@/stores/designerStore';
import { AI_MODELS, getAIModel } from '@/lib/ai';

type TabValue = 'chat' | 'script';

export function LeftPanel() {
  const [activeTab, setActiveTab] = useState<TabValue>('chat');
  const { project, isDocsMode, isDataMode, selectedDataSource } = useDesignerStore();
  const isInteractive = project?.interactive_enabled ?? false;

  // Get AI model info for display
  const aiModel = AI_MODELS[getAIModel()];
  const isGemini = aiModel?.provider === 'gemini';

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Combined header with AI Assistant info and Scripts tab */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        {/* AI Assistant / Chat tab - clickable */}
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
            activeTab === 'chat'
              ? 'bg-muted'
              : 'hover:bg-muted/50 opacity-70 hover:opacity-100'
          )}
        >
          <div className={cn(
            "h-5 w-5 rounded-lg flex items-center justify-center flex-shrink-0",
            isDocsMode
              ? "bg-gradient-to-br from-blue-500 to-blue-600"
              : isDataMode
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                : isGemini
                  ? "bg-gradient-to-br from-blue-500 to-cyan-400"
                  : "bg-gradient-to-br from-violet-500 to-fuchsia-400"
          )}>
            {isDocsMode ? (
              <BookOpen className="w-3 h-3 text-white" />
            ) : isDataMode ? (
              <Database className="w-3 h-3 text-white" />
            ) : (
              <Sparkles className="w-3 h-3 text-white" />
            )}
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-xs leading-tight">
              {isDocsMode ? 'Docs Helper' : isDataMode ? 'Data Design' : 'AI Assistant'}
            </h2>
            <p className="text-[9px] text-muted-foreground leading-tight truncate max-w-[100px]">
              {isDocsMode ? 'Nova/Pulsar GFX' : isDataMode ? selectedDataSource?.name : (aiModel?.name || 'AI')}
            </p>
          </div>
        </button>

        {/* Script Editor tab */}
        <button
          onClick={() => isInteractive && setActiveTab('script')}
          disabled={!isInteractive}
          title={!isInteractive ? 'Enable Interactive Mode in Project Settings' : 'Visual Script Editor'}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
            activeTab === 'script'
              ? 'bg-muted'
              : 'hover:bg-muted/50 opacity-70 hover:opacity-100',
            !isInteractive && 'opacity-40 cursor-not-allowed hover:opacity-40 hover:bg-transparent'
          )}
        >
          <Code2 className="w-4 h-4" />
          <span className="text-xs font-medium">Script Editor</span>
        </button>
      </div>

      {/* Tab content - both panels always mounted, visibility controlled via CSS */}
      <div className="flex-1 overflow-hidden relative">
        <div className={cn('absolute inset-0', activeTab !== 'chat' && 'hidden')}>
          <ChatPanel hideHeader />
        </div>
        <div className={cn('absolute inset-0', activeTab !== 'script' && 'hidden')}>
          <ScriptEditorPanel />
        </div>
      </div>
    </div>
  );
}
