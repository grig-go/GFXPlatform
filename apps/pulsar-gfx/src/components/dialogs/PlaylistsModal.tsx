import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  ScrollArea,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@emergent-platform/ui';
import {
  ListOrdered,
  Loader2,
  Search,
  MoreVertical,
  Trash2,
  Pencil,
  ExternalLink,
  Plus,
  Check,
  X,
  Clock,
  RotateCcw,
  Play,
} from 'lucide-react';
import { usePlaylistStore, type Playlist } from '@/stores/playlistStore';
import { useProjectStore } from '@/stores/projectStore';
import { useConfirm } from '@/hooks/useConfirm';

interface PlaylistsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODE_ICONS: Record<string, React.ElementType> = {
  manual: Play,
  timed: Clock,
  loop: RotateCcw,
};

const MODE_LABELS: Record<string, string> = {
  manual: 'Manual',
  timed: 'Scheduled',
  loop: 'Loop',
};

export function PlaylistsModal({ open, onOpenChange }: PlaylistsModalProps) {
  const { currentProject } = useProjectStore();
  const {
    playlists,
    currentPlaylist,
    loadPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    openTab,
    isLoading,
  } = usePlaylistStore();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Reload playlists when modal opens
  useEffect(() => {
    if (open && currentProject) {
      loadPlaylists(currentProject.id);
    }
  }, [open, currentProject, loadPlaylists]);

  // Filter playlists based on search
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const query = searchQuery.toLowerCase();
    return playlists.filter(
      (playlist) =>
        playlist.name.toLowerCase().includes(query) ||
        playlist.description?.toLowerCase().includes(query) ||
        playlist.mode.toLowerCase().includes(query)
    );
  }, [playlists, searchQuery]);

  // Group playlists by mode
  const groupedPlaylists = useMemo(() => {
    const groups: Record<string, Playlist[]> = {
      manual: [],
      timed: [],
      loop: [],
    };
    filteredPlaylists.forEach((playlist) => {
      if (groups[playlist.mode]) {
        groups[playlist.mode].push(playlist);
      } else {
        groups.manual.push(playlist);
      }
    });
    return groups;
  }, [filteredPlaylists]);

  const handleOpenPlaylist = (playlist: Playlist) => {
    openTab({ id: playlist.id, name: playlist.name });
    onOpenChange(false);
  };

  const handleStartEdit = (playlist: Playlist) => {
    setEditingId(playlist.id);
    setEditingName(playlist.name);
  };

  const handleSaveEdit = async (playlistId: string) => {
    if (!editingName.trim()) return;
    try {
      await updatePlaylist(playlistId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      console.error('Failed to update playlist:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = async (playlistId: string) => {
    const confirmed = await confirm({
      title: 'Delete Playlist',
      description: 'Are you sure you want to delete this playlist? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    setIsDeleting(playlistId);
    try {
      await deletePlaylist(playlistId);
    } catch (error) {
      console.error('Failed to delete playlist:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!currentProject || !newPlaylistName.trim()) return;
    setIsCreating(true);
    try {
      const newPlaylist = await createPlaylist(newPlaylistName.trim(), currentProject.id);
      openTab({ id: newPlaylist.id, name: newPlaylist.name });
      setNewPlaylistName('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create playlist:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const renderPlaylistItem = (playlist: Playlist) => {
    const isSelected = currentPlaylist?.id === playlist.id;
    const isEditing = editingId === playlist.id;
    const ModeIcon = MODE_ICONS[playlist.mode] || Play;

    return (
      <div
        key={playlist.id}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-colors',
          isSelected
            ? 'border-cyan-500 bg-cyan-500/10'
            : 'border-border bg-card hover:bg-muted/50'
        )}
      >
        {/* Playlist Icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            isSelected ? 'bg-cyan-500/20 text-cyan-500' : 'bg-muted text-muted-foreground'
          )}
        >
          <ListOrdered className="w-5 h-5" />
        </div>

        {/* Playlist Info */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="h-7 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit(playlist.id);
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => handleSaveEdit(playlist.id)}
              >
                <Check className="w-4 h-4 text-green-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleCancelEdit}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className={cn('font-medium text-sm truncate', isSelected && 'text-cyan-500')}>
                  {playlist.name}
                </span>
                {isSelected && <Check className="w-4 h-4 text-cyan-500 shrink-0" />}
              </div>
              {playlist.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {playlist.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                  <ModeIcon className="w-3 h-3" />
                  {MODE_LABELS[playlist.mode] || playlist.mode}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(playlist.createdAt).toLocaleDateString()}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => handleOpenPlaylist(playlist)}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStartEdit(playlist)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(playlist.id)}
                  className="text-destructive"
                  disabled={isDeleting === playlist.id}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting === playlist.id ? 'Deleting...' : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (mode: string, groupPlaylists: Playlist[]) => {
    if (groupPlaylists.length === 0) return null;
    const ModeIcon = MODE_ICONS[mode] || Play;

    return (
      <div key={mode} className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
          <ModeIcon className="w-3.5 h-3.5" />
          {MODE_LABELS[mode] || mode} ({groupPlaylists.length})
        </div>
        <div className="space-y-2">
          {groupPlaylists.map(renderPlaylistItem)}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-cyan-500" />
            Playlists
          </DialogTitle>
          <DialogDescription>
            Search, organize, and manage your playlists.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Create */}
        <div className="flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search playlists..."
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* New Playlist Input */}
        <div className="flex gap-2 shrink-0 pb-2 border-b">
          <Input
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="New playlist name..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreatePlaylist();
            }}
          />
          <Button
            onClick={handleCreatePlaylist}
            disabled={!newPlaylistName.trim() || isCreating || !currentProject}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </div>

        {/* Playlist List */}
        <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
          <div className="space-y-4 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPlaylists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListOrdered className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  {searchQuery
                    ? 'No playlists match your search'
                    : currentProject
                    ? 'No playlists yet. Create one above.'
                    : 'Select a project first'}
                </p>
              </div>
            ) : (
              <>
                {renderGroup('manual', groupedPlaylists.manual)}
                {renderGroup('timed', groupedPlaylists.timed)}
                {renderGroup('loop', groupedPlaylists.loop)}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t shrink-0">
          <span className="text-xs text-muted-foreground">
            {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''}
            {currentProject && ` in ${currentProject.name}`}
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
