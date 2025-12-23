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
import { supabase, directRestUpdate, directRestSelect } from '@emergent-platform/supabase-client';
import { useChannelStore } from '@/stores/channelStore';
import { useProjectStore } from '@/stores/projectStore';

// Nova GFX player URL - configurable via environment variable
// In dev: defaults to localhost:3003 (Nova GFX dev server port)
// In prod: set VITE_NOVA_PREVIEW_URL to your deployed Nova GFX URL
const NOVA_GFX_PORT = import.meta.env.VITE_NOVA_GFX_PORT || '3003';
const NOVA_GFX_URL = import.meta.env.VITE_NOVA_PREVIEW_URL || `http://localhost:${NOVA_GFX_PORT}`;

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
  // Uses direct REST API for reliable database updates (bypasses stale Supabase client)
  const handlePublishToChannel = async (channelId: string) => {
    if (!selectedProjectId) return;

    setIsPublishing(true);
    setError(null);

    try {
      console.log('[PublishModal] Publishing project to channel:', channelId, 'Project:', selectedProjectId, 'Play immediately:', playImmediately);

      // Step 1: Update channel with loaded project using direct REST API
      const channelResult = await directRestUpdate(
        'pulsar_channels',
        {
          loaded_project_id: selectedProjectId,
          updated_at: new Date().toISOString(),
        },
        { column: 'id', value: channelId },
        5000
      );

      if (!channelResult.success) {
        throw new Error(channelResult.error || 'Failed to update channel');
      }

      // Step 2: Get current command sequence
      const stateResult = await directRestSelect<{ command_sequence: number }>(
        'pulsar_channel_state',
        'command_sequence',
        { column: 'channel_id', value: channelId },
        3000
      );

      const currentSequence = stateResult.data?.[0]?.command_sequence || 0;
      const newSequence = currentSequence + 1;

      // Step 3: Send command with unique ID
      const commandId = crypto.randomUUID();
      const command = {
        id: commandId,
        type: 'initialize',
        projectId: selectedProjectId,
        timestamp: new Date().toISOString(),
        forceReload: true,
      };

      const cmdResult = await directRestUpdate(
        'pulsar_channel_state',
        {
          pending_command: command,
          command_sequence: newSequence,
          last_command: command,
          last_command_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { column: 'channel_id', value: channelId },
        5000
      );

      if (!cmdResult.success) {
        throw new Error(cmdResult.error || 'Failed to send command');
      }

      // Mark channel as live locally
      setLiveChannelIds(prev => {
        const next = new Set(prev);
        next.add(channelId);
        return next;
      });

      // Reload channels to refresh status
      loadChannels().catch(() => {});

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
  // Uses direct REST API for reliable database updates (bypasses stale Supabase client)
  const handleStopChannel = async (channelId: string) => {
    setIsPublishing(true);
    setError(null);

    try {
      console.log('[PublishModal] Stopping channel:', channelId);

      // Step 1: Clear loaded_project_id on channel FIRST (most important for status)
      // Use direct REST API for reliable update
      const channelResult = await directRestUpdate(
        'pulsar_channels',
        {
          loaded_project_id: null,
          updated_at: new Date().toISOString(),
        },
        { column: 'id', value: channelId },
        5000
      );

      if (!channelResult.success) {
        console.error('[PublishModal] Failed to clear loaded_project_id:', channelResult.error);
        throw new Error(channelResult.error || 'Failed to clear channel project');
      }

      // Step 2: Get current command sequence
      const stateResult = await directRestSelect<{ command_sequence: number }>(
        'pulsar_channel_state',
        'command_sequence',
        { column: 'channel_id', value: channelId },
        3000
      );

      const currentSequence = stateResult.data?.[0]?.command_sequence || 0;
      const newSequence = currentSequence + 1;

      // Step 3: Send clear_all command with unique ID
      const commandId = crypto.randomUUID();
      const command = {
        id: commandId,
        type: 'clear_all',
        timestamp: new Date().toISOString(),
      };

      const cmdResult = await directRestUpdate(
        'pulsar_channel_state',
        {
          pending_command: command,
          command_sequence: newSequence,
          last_command: command,
          last_command_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { column: 'channel_id', value: channelId },
        5000
      );

      if (!cmdResult.success) {
        console.warn('[PublishModal] Stop command failed:', cmdResult.error);
        // Don't throw - the channel status clear was successful
      }

      // Remove from live channels locally
      setLiveChannelIds(prev => {
        const next = new Set(prev);
        next.delete(channelId);
        return next;
      });

      // Reload channels to refresh status across the app
      await loadChannels();

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
