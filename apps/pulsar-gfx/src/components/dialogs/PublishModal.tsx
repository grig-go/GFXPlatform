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
} from '@emergent-platform/ui';
import { Send, Loader2, Monitor, Plus } from 'lucide-react';
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
}

interface ProjectOption {
  id: string;
  name: string;
  slug: string;
}

export function PublishModal({ open, onOpenChange }: PublishModalProps) {
  const { channels, loadChannels } = useChannelStore();
  const { currentProject, projects, loadProjects } = useProjectStore();

  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>([]);
  const [playImmediately, setPlayImmediately] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Auto-select first channel
  useEffect(() => {
    if (channels.length > 0 && selectedChannelIds.size === 0) {
      setSelectedChannelIds(new Set([channels[0].id]));
    }
  }, [channels, selectedChannelIds.size]);

  // Toggle channel selection
  const toggleChannelSelection = (channelId: string) => {
    setSelectedChannelIds(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  // Get the selected project
  const selectedProject = availableProjects.find(p => p.id === selectedProjectId);

  // Publish to selected channels - sets loaded_project_id and sends command to player
  const handlePublish = async () => {
    if (selectedChannelIds.size === 0 || !selectedProjectId || !supabase) return;

    setIsPublishing(true);
    setError(null);

    try {
      const channelIds = Array.from(selectedChannelIds);

      console.log('[PublishModal] Publishing project to channels:', channelIds, 'Project:', selectedProjectId, 'Play immediately:', playImmediately);

      // Build the command - initialize loads project, play would start playback
      const command = {
        type: playImmediately ? 'play' : 'initialize',
        projectId: selectedProjectId,
        timestamp: new Date().toISOString(),
      };

      // Update loaded_project_id and send command for each selected channel
      const results = await Promise.all(
        channelIds.map(async (channelId) => {
          // Update channel with loaded project
          const channelResult = await supabase
            .from('pulsar_channels')
            .update({
              loaded_project_id: selectedProjectId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', channelId);

          if (channelResult.error) {
            return { error: channelResult.error };
          }

          // Send command to channel state
          const stateResult = await supabase
            .from('pulsar_channel_state')
            .update({
              pending_command: command,
              updated_at: new Date().toISOString(),
            })
            .eq('channel_id', channelId);

          return { error: stateResult.error };
        })
      );

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('[PublishModal] Some publish operations failed:', errors);
        throw new Error(`Failed to publish to ${errors.length} channel(s)`);
      }

      // Open Nova GFX player window for each selected channel
      // The player is hosted on Nova GFX (port 5173), not Pulsar GFX
      channelIds.forEach(channelId => {
        const debugParam = debugMode ? '?debug=1' : '';
        const playerUrl = `${NOVA_GFX_URL}/player/${channelId}${debugParam}`;
        window.open(playerUrl, `nova-player-${channelId}`, 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes');
      });

      console.log('[PublishModal] Publish successful');
      onOpenChange(false);
    } catch (err) {
      console.error('[PublishModal] Publish failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish to channel');
    } finally {
      setIsPublishing(false);
    }
  };

  // Get player URL for a channel (uses Nova GFX player)
  const getPlayerUrl = (channelId: string) => {
    return `${NOVA_GFX_URL}/player/${channelId}`;
  };

  const hasSelectedChannels = selectedChannelIds.size > 0;
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
              {/* Project Selection */}
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

              {/* Channel Selection */}
              <div className="space-y-3">
                <Label>Select Channel{channels.length > 1 ? 's' : ''}</Label>
                <div className="space-y-2">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => toggleChannelSelection(channel.id)}
                      disabled={isPublishing}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                        selectedChannelIds.has(channel.id)
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                      } ${isPublishing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedChannelIds.has(channel.id)}
                        onChange={() => {}}
                        disabled={isPublishing}
                        className="h-4 w-4 rounded border-border"
                      />
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        channel.playerStatus === 'connected'
                          ? 'bg-green-500'
                          : 'bg-muted-foreground/30'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{channel.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {channel.channelCode}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
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

              {/* Player URL Info */}
              {hasSelectedChannels && (
                <div className="rounded-lg bg-muted/30 border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Player URL{selectedChannelIds.size > 1 ? 's' : ''}
                  </p>
                  <div className="space-y-1">
                    {Array.from(selectedChannelIds).map(channelId => {
                      const channel = channels.find(c => c.id === channelId);
                      return (
                        <div key={channelId} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{channel?.channelCode}:</span>
                          <code className="text-xs bg-background px-2 py-0.5 rounded truncate flex-1">
                            {getPlayerUrl(channelId)}
                          </code>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!hasSelectedChannels || !hasProject || isPublishing || channels.length === 0}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publish
                {selectedChannelIds.size > 1 && ` (${selectedChannelIds.size})`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
