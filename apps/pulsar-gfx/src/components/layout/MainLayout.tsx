import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { PlayoutPanel } from '@/components/playout/PlayoutPanel';
import { ContentEditor } from '@/components/content/ContentEditor';
import { useUIStore } from '@/stores/uiStore';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@emergent-platform/ui';

export function MainLayout() {
  const { showPlayoutControls, showPreview, showContentEditor } = useUIStore();

  // Calculate if right panel should show
  const showRightPanel = showPreview || showContentEditor;

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - Navigation */}
        <Sidebar />

        {/* Main Resizable Area */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
          {/* Left Panel - Playout Controls (conditionally shown) */}
          {showPlayoutControls && (
            <>
              <ResizablePanel defaultSize={25} minSize={15}>
                <PlayoutPanel />
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-border/50 hover:bg-cyan-500/30 transition-colors" />
            </>
          )}

          {/* Center - Workspace (Pages, Playlists, Custom UI) */}
          <ResizablePanel defaultSize={showRightPanel ? 45 : 100} minSize={30}>
            <div className="h-full flex flex-col overflow-hidden bg-background/50">
              <Outlet />
            </div>
          </ResizablePanel>

          {/* Right Panel - Preview + Content Editor */}
          {showRightPanel && (
            <>
              <ResizableHandle withHandle className="bg-border/50 hover:bg-cyan-500/30 transition-colors" />
              <ResizablePanel defaultSize={30} minSize={20}>
                <ResizablePanelGroup direction="vertical">
                  {/* Preview Window */}
                  {showPreview && (
                    <>
                      <ResizablePanel defaultSize={showContentEditor ? 50 : 100} minSize={30}>
                        <PreviewPanel />
                      </ResizablePanel>
                      {showContentEditor && (
                        <ResizableHandle withHandle className="bg-border/50 hover:bg-cyan-500/30 transition-colors" />
                      )}
                    </>
                  )}

                  {/* Content Editor */}
                  {showContentEditor && (
                    <ResizablePanel defaultSize={showPreview ? 50 : 100} minSize={25}>
                      <ContentEditor />
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Bottom Status Bar - Layer Status */}
      <StatusBar />
    </div>
  );
}
