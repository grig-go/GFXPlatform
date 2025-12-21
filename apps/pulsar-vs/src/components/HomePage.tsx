import { useState } from 'react';
import { TopBar } from './TopBar';
import VirtualSetPage from './VirtualSetPage';
import ContentPage from './ContentPage';
import PlaylistPage from './PlaylistPage';
import { AdvancedSettingsDialog } from './AdvancedSettingsDialog';
import { AIPromptSettingsDialog } from './AIPromptSettingsDialog';
import { AIProvidersDialog } from './AIProvidersDialog';
import { ProjectProvider } from './ProjectContext';
import { ProjectManagementModal } from './ProjectManagementModal';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

type PageView = 'virtual-set' | 'playlist';

export default function HomePage() {
  const [layout, setLayout] = useState<'single' | 'split'>('single');
  const [leftPanelWidth, setLeftPanelWidth] = useState(40);
  const [isResizing, setIsResizing] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [aiPromptSettingsOpen, setAIPromptSettingsOpen] = useState(false);
  const [aiProvidersOpen, setAIProvidersOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageView>('virtual-set');

  // Keyboard shortcuts - actions will be passed to PlaylistPage
  const { shortcuts, updateShortcut, resetShortcuts } = useKeyboardShortcuts({}, false);

  const [sharedScene, setSharedScene] = useState<any | null>(null);
  const [sharedBackdrop, setSharedBackdrop] = useState<string | null>(null);
  const [selectedChannelName, setSelectedChannelName] = useState<string | null>(null);
  const [contentRefreshTrigger, setContentRefreshTrigger] = useState(0);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isResizing) return;

    const container = e.currentTarget as HTMLElement;
    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    if (newWidth >= 20 && newWidth <= 70) {
      setLeftPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  return (
    <ProjectProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <TopBar
          onLayoutChange={setLayout}
          currentLayout={layout}
          onOpenSettings={() => setAdvancedSettingsOpen(true)}
          onOpenAIPromptSettings={() => setAIPromptSettingsOpen(true)}
          onOpenAIProviders={() => setAIProvidersOpen(true)}
          onOpenProjects={() => setProjectsOpen(true)}
          onOpenKeyboardShortcuts={() => setKeyboardShortcutsOpen(true)}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

        {/* Playlist Page - full width, no split view */}
        {currentPage === 'playlist' && (
          <div className="flex-1 overflow-hidden">
            <PlaylistPage shortcuts={shortcuts} />
          </div>
        )}

        {/* Virtual Set Page with optional split view */}
        {currentPage === 'virtual-set' && (
          <div
            className="flex-1 flex overflow-hidden relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* ContentPage - only visible in split view */}
            <div
              className={`h-full overflow-hidden border-r ${layout === 'split' ? '' : 'hidden'}`}
              style={{ width: layout === 'split' ? `${leftPanelWidth}%` : '0%' }}
            >
              <ContentPage
                onPlayContent={(scene, backdrop) => {
                  setSharedScene(scene);
                  setSharedBackdrop(backdrop);
                }}
                selectedChannel={selectedChannelName || undefined}
                refreshTrigger={contentRefreshTrigger}
              />
            </div>

            {/* Resizer - only visible in split view */}
            <div
              className={`w-1 hover:w-1.5 bg-border hover:bg-blue-500/50 transition-all cursor-col-resize ${
                isResizing ? 'bg-blue-500/50 w-1.5' : ''
              } ${layout === 'split' ? '' : 'hidden'}`}
              onMouseDown={handleMouseDown}
            />

            {/* VirtualSetPage - always mounted, adjusts width based on layout */}
            <div
              className="h-full overflow-auto"
              style={{ width: layout === 'split' ? `${100 - leftPanelWidth}%` : '100%' }}
            >
              <VirtualSetPage
                externalScene={sharedScene}
                externalBackdrop={sharedBackdrop}
                onChannelChange={setSelectedChannelName}
                onContentSaved={() => setContentRefreshTrigger(prev => prev + 1)}
              />
            </div>
          </div>
        )}

        <AdvancedSettingsDialog
          open={advancedSettingsOpen}
          onOpenChange={setAdvancedSettingsOpen}
        />
        <AIPromptSettingsDialog
          open={aiPromptSettingsOpen}
          onOpenChange={setAIPromptSettingsOpen}
        />
        <AIProvidersDialog
          open={aiProvidersOpen}
          onOpenChange={setAIProvidersOpen}
        />
        <ProjectManagementModal
          open={projectsOpen}
          onOpenChange={setProjectsOpen}
        />
        <KeyboardShortcutsDialog
          open={keyboardShortcutsOpen}
          onOpenChange={setKeyboardShortcutsOpen}
          shortcuts={shortcuts}
          onUpdateShortcut={updateShortcut}
          onResetShortcuts={resetShortcuts}
        />
      </div>
    </ProjectProvider>
  );
}
