/**
 * Left Panel - Tabbed container for AI Chat and Script Editor
 *
 * Switches between:
 * - AI Chat: For AI-assisted design and documentation
 * - Script Editor: For creating interactive logic (when interactive mode is enabled)
 */

import { useState } from 'react';
import { Code2, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, cn } from '@emergent-platform/ui';
import { ChatPanel } from './ChatPanel';
import { ScriptEditorPanel } from './ScriptEditorPanel';
import { useDesignerStore } from '@/stores/designerStore';

type TabValue = 'chat' | 'script';

export function LeftPanel() {
  const [activeTab, setActiveTab] = useState<TabValue>('chat');
  const { project } = useDesignerStore();
  const isInteractive = project?.interactive_enabled ?? false;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tab header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
          <TabsList className="h-8 w-full justify-start bg-transparent p-0 gap-1">
            <TabsTrigger
              value="chat"
              className={cn(
                'h-7 px-3 text-xs gap-1.5 rounded-md data-[state=active]:bg-muted',
                'data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground'
              )}
            >
              <Sparkles className="w-3 h-3" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger
              value="script"
              className={cn(
                'h-7 px-3 text-xs gap-1.5 rounded-md data-[state=active]:bg-muted',
                'data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground',
                !isInteractive && 'opacity-50'
              )}
              disabled={!isInteractive}
              title={!isInteractive ? 'Enable Interactive Mode in Project Settings' : undefined}
            >
              <Code2 className="w-3 h-3" />
              Scripts
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <ChatPanel />
        ) : (
          <ScriptEditorPanel />
        )}
      </div>
    </div>
  );
}
