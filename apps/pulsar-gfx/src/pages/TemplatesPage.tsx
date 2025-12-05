import { useState, useEffect } from 'react';
import { Plus, X, FileText, Loader2, ListOrdered } from 'lucide-react';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@emergent-platform/ui';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { PlaylistPanel } from '@/components/playlist/PlaylistPanel';
import { useProjectStore } from '@/stores/projectStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { usePageStore } from '@/stores/pageStore';

type PlaylistType = 'manual' | 'schedule' | 'loop';

export function TemplatesPage() {
  const { currentProject, isLoading: projectLoading } = useProjectStore();
  const {
    playlists,
    currentPlaylist,
    loadPlaylists,
    createPlaylist,
    openTabs,
    activeTabId,
    openTab,
    closeTab,
    setActiveTab,
    isLoading: playlistLoading,
  } = usePlaylistStore();
  const { loadPages, isLoading: pagesLoading } = usePageStore();

  // New playlist modal state
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistType, setNewPlaylistType] = useState<PlaylistType>('manual');
  const [isCreating, setIsCreating] = useState(false);

  // Load playlists when project changes
  useEffect(() => {
    if (currentProject) {
      loadPlaylists(currentProject.id);
    }
  }, [currentProject, loadPlaylists]);

  // Load pages when current playlist changes
  useEffect(() => {
    if (currentPlaylist) {
      loadPages(currentPlaylist.id);
    }
  }, [currentPlaylist, loadPages]);

  const handleOpenPlaylist = (playlist: { id: string; name: string }) => {
    openTab(playlist);
  };

  const handleClosePlaylist = (playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(playlistId);
  };

  const handleCreatePlaylist = async () => {
    if (!currentProject || !newPlaylistName.trim()) return;

    setIsCreating(true);
    try {
      const newPlaylist = await createPlaylist(newPlaylistName.trim(), currentProject.id);
      openTab({ id: newPlaylist.id, name: newPlaylist.name });
      setShowNewPlaylistModal(false);
      setNewPlaylistName('');
      setNewPlaylistType('manual');
    } catch (error: any) {
      console.error('Failed to create playlist:', error);
      alert(`Failed to create playlist: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const isLoading = projectLoading || playlistLoading || pagesLoading;

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
          <p className="text-sm">Select a project from the header to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Panel - Pages/Templates Sidebar */}
      <div className="w-80 border-r border-border flex flex-col overflow-hidden">
        <LeftSidebar defaultTab="templates" />
      </div>

      {/* Right Panel - Playlist Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Playlist Tabs */}
        <div className="h-10 flex items-center border-b border-border bg-card/50 px-2 shrink-0">
          <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
            {openTabs.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => setActiveTab(playlist.id)}
                role="tab"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveTab(playlist.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                  activeTabId === playlist.id
                    ? 'bg-background border-cyan-500 text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                {playlist.name}
                <button
                  onClick={(e) => handleClosePlaylist(playlist.id, e)}
                  className="ml-1 p-0.5 rounded hover:bg-muted"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Playlist Actions */}
          <div className="flex items-center gap-1 ml-2">
            {/* Open Playlist Dropdown */}
            <Select
              value=""
              onValueChange={(value) => {
                const playlist = playlists.find((p) => p.id === value);
                if (playlist) {
                  handleOpenPlaylist({ id: playlist.id, name: playlist.name });
                }
              }}
            >
              <SelectTrigger className="h-7 w-auto px-2 text-xs border-border">
                <span>Open</span>
              </SelectTrigger>
              <SelectContent>
                {playlists.length === 0 ? (
                  <SelectItem value="__no_playlists__" disabled>
                    No playlists available
                  </SelectItem>
                ) : (
                  playlists
                    .filter((p) => !openTabs.find((op) => op.id === p.id))
                    .map((playlist) => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        {playlist.name}
                      </SelectItem>
                    ))
                )}
                {playlists.length > 0 && playlists.filter((p) => !openTabs.find((op) => op.id === p.id)).length === 0 && (
                  <SelectItem value="__all_open__" disabled>
                    All playlists open
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {/* New Playlist Button */}
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setShowNewPlaylistModal(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New
            </Button>
          </div>
        </div>

        {/* Playlist Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
            </div>
          ) : activeTabId ? (
            <PlaylistPanel />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ListOrdered className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No playlist open</p>
                <p className="text-xs mt-1 opacity-60">Select or create a playlist to view pages</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Playlist Modal */}
      <Dialog open={showNewPlaylistModal} onOpenChange={setShowNewPlaylistModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Playlist Name</Label>
              <Input
                id="playlist-name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Enter playlist name..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-type">Playlist Type</Label>
              <Select value={newPlaylistType} onValueChange={(v) => setNewPlaylistType(v as PlaylistType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">
                    <div className="flex flex-col">
                      <span>Manual</span>
                      <span className="text-xs text-muted-foreground">Manually trigger pages</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="schedule">
                    <div className="flex flex-col">
                      <span>Schedule</span>
                      <span className="text-xs text-muted-foreground">Time-based page scheduling</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="loop">
                    <div className="flex flex-col">
                      <span>Loop</span>
                      <span className="text-xs text-muted-foreground">Auto-advance through pages</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPlaylistModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              disabled={!newPlaylistName.trim() || isCreating}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {isCreating ? 'Creating...' : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
