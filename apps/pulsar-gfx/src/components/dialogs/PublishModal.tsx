import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@emergent-platform/ui';
import { Send, Loader2, Monitor, Plus, MoreVertical, Square, ExternalLink, Radio } from 'lucide-react';
import { supabase } from '@emergent-platform/supabase-client';
import { useChannelStore } from '@/stores/channelStore';
import { useProjectStore } from '@/stores/projectStore';

// Nova GFX player URL - configurable via environment variable
// In dev: defaults to localhost:5173 (Nova GFX dev server)
// In prod: set VITE_NOVA_PREVIEW_URL to your deployed Nova GFX URL
const NOVA_GFX_URL = import.meta.env.VITE_NOVA_PREVIEW_URL || 'http://localhost:5173';

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedChannelId?: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
  slug: string;
}

export function PublishModal({ open, onOpenChange, preselectedChannelId }: PublishModalProps) {
  const { channels, loadChannels } = useChannelStore();
  const { currentProject, projects, loadProjects } = useProjectStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>([]);
  const [playImmediately, setPlayImmediately] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveChannelIds, setLiveChannelIds] = useState<Set<string>>(new Set());

  // Load channels and projects when modal opens
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setError(null);

      Promise.all([
        loadChannels(),
        loadProjects(),
      ]).then(() => {
        setIsLoading(false);
      }).catch(err => {
        console.error('[PublishModal] Failed to load data:', err);
        setError('Failed to load data');
        setIsLoading(false);
      });
    }
  }, [open, loadChannels, loadProjects]);

  // Update available projects from store
  useEffect(() => {
    if (projects.length > 0) {
      setAvailableProjects(projects.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
      })));
    }
  }, [projects]);

  // Pre-select the current project when it changes or modal opens
  useEffect(() => {
    if (open && currentProject && !selectedProjectId) {
      setSelectedProjectId(currentProject.id);
    }
  }, [open, currentProject, selectedProjectId]);

  // Check which channels have loaded projects (are "live")
  useEffect(() => {
    const liveIds = new Set<string>();
    channels.forEach(ch => {
      if (ch.loadedProjectId) {
        liveIds.add(ch.id);
      }
    });
    setLiveChannelIds(liveIds);
  }, [channels]);

  // Get the selected project
  const selectedProject = availableProjects.find(p => p.id === selectedProjectId);

  // Publish to a single channel
  const handlePublishToChannel = async (channelId: string) => {
    if (!selectedProjectId || !supabase) return;

    setIsPublishing(true);
    setError(null);

    try {
      console.log('[PublishModal] Publishing project to channel:', channelId, 'Project:', selectedProjectId, 'Play immediately:', playImmediately);

      // Build the command - initialize loads project, play would start playback
      const command = {
        type: playImmediately ? 'play' : 'initialize',
        projectId: selectedProjectId,
        timestamp: new Date().toISOString(),
      };

      // Update channel with loaded project
      const channelResult = await supabase
        .from('pulsar_channels')
        .update({
          loaded_project_id: selectedProjectId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', channelId);

      if (channelResult.error) {
        throw channelResult.error;
      }

      // Send command to channel state
      const stateResult = await supabase
        .from('pulsar_channel_state')
        .update({
          pending_command: command,
          updated_at: new Date().toISOString(),
        })
        .eq('channel_id', channelId);

      if (stateResult.error) {
        throw stateResult.error;
      }

      // Mark channel as live locally
      setLiveChannelIds(prev => {
        const next = new Set(prev);
        next.add(channelId);
        return next;
      });

      // Open Nova GFX player window
      const debugParam = debugMode ? '?debug=1' : '';
      const playerUrl = `${NOVA_GFX_URL}/player/${channelId}${debugParam}`;
      window.open(playerUrl, `nova-player-${channelId}`, 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes');

      console.log('[PublishModal] Publish successful');
      onOpenChange(false);
    } catch (err) {
      console.error('[PublishModal] Publish failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish to channel');
    } finally {
      setIsPublishing(false);
    }
  };

  // Stop a single channel
  const handleStopChannel = async (channelId: string) => {
    if (!supabase) return;

    setIsPublishing(true);
    setError(null);

    try {
      console.log('[PublishModal] Stopping channel:', channelId);

      const command = {
        type: 'stop',
        timestamp: new Date().toISOString(),
      };

      // Send stop command to channel state
      const stateResult = await supabase
        .from('pulsar_channel_state')
        .update({
          pending_command: command,
          updated_at: new Date().toISOString(),
        })
        .eq('channel_id', channelId);

      if (stateResult.error) {
        throw stateResult.error;
      }

      // Clear loaded_project_id on channel
      const channelResult = await supabase
        .from('pulsar_channels')
        .update({
          loaded_project_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', channelId);

      if (channelResult.error) {
        console.warn('[PublishModal] Failed to clear loaded_project_id:', channelResult.error);
      }

      // Remove from live channels locally
      setLiveChannelIds(prev => {
        const next = new Set(prev);
        next.delete(channelId);
        return next;
      });

      console.log('[PublishModal] Stop successful');
    } catch (err) {
      console.error('[PublishModal] Stop failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop channel');
    } finally {
      setIsPublishing(false);
    }
  };

  // Open player window for a channel
  const handleOpenPlayer = (channelId: string) => {
    const debugParam = debugMode ? '?debug=1' : '';
    const playerUrl = `${NOVA_GFX_URL}/player/${channelId}${debugParam}`;
    window.open(playerUrl, `nova-player-${channelId}`, 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes');
  };

  const hasLiveChannels = liveChannelIds.size > 0;
  const hasProject = !!selectedProjectId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-cyan-500" />
            Publish to Channel
          </DialogTitle>
          <DialogDescription>
            Load a project onto a broadcast channel for live playout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No channels configured yet.
              </p>
              <Button variant="outline" size="sm" disabled>
                <Plus className="h-4 w-4 mr-2" />
                Add Channel (Coming Soon)
              </Button>
            </div>
          ) : (
            <>
              {/* Project Selection - Moved to top */}
              <div className="space-y-3">
                <Label>Project</Label>
                <Select
                  value={selectedProjectId || ''}
                  onValueChange={(value) => setSelectedProjectId(value)}
                  disabled={isPublishing}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a project to publish" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProject && (
                  <p className="text-xs text-muted-foreground">
                    Slug: {selectedProject.slug}
                  </p>
                )}
              </div>

              {/* Play Options */}
              <div className="space-y-3">
                <Label>Options</Label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={playImmediately}
                    onChange={(e) => setPlayImmediately(e.target.checked)}
                    disabled={isPublishing}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">
                    Play immediately (animate IN)
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    disabled={isPublishing}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">
                    Debug mode (show status overlay)
                  </span>
                </label>
              </div>

              {/* Channel List with Actions */}
              <div className="space-y-3">
                <Label>Channels</Label>
                <div className="space-y-2">
                  {channels.map((channel) => {
                    const isLive = liveChannelIds.has(channel.id) || !!channel.loadedProjectId;
                    const loadedProject = channel.loadedProjectId
                      ? availableProjects.find(p => p.id === channel.loadedProjectId)
                      : null;

                    return (
                      <div
                        key={channel.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isLive
                            ? 'border-red-500/50 bg-red-500/5'
                            : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                        }`}
                      >
                        {/* Status indicator */}
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          channel.playerStatus === 'connected'
                            ? 'bg-green-500'
                            : 'bg-muted-foreground/30'
                        }`} />

                        {/* Channel info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{channel.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {channel.channelCode}
                          </div>
                          {/* Show loaded project */}
                          {loadedProject && (
                            <div className="text-xs text-cyan-400 mt-0.5 truncate">
                              Publishing: {loadedProject.name}
                            </div>
                          )}
                        </div>

                        {/* Live badge */}
                        {isLive && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                            <Radio className="h-3 w-3 animate-pulse" />
                            LIVE
                          </div>
                        )}

                        {/* Actions dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isPublishing}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handlePublishToChannel(channel.id)}
                              disabled={!hasProject || isPublishing}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Publish to Channel
                            </DropdownMenuItem>
                            {isLive && (
                              <DropdownMenuItem
                                onClick={() => handleStopChannel(channel.id)}
                                disabled={isPublishing}
                                className="text-red-500 focus:text-red-500"
                              >
                                <Square className="h-4 w-4 mr-2" />
                                Stop Channel
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenPlayer(channel.id)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Player Window
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions - Simplified */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {hasLiveChannels ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
