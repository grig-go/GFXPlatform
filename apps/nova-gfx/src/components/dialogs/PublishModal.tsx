import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Label,
} from '@emergent-platform/ui';
import { Send, Radio, Square, Loader2, Monitor, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useDesignerStore } from '@/stores/designerStore';

interface Channel {
  id: string;
  name: string;
  channel_code: string;
  player_url: string | null;
  player_status: string;
}

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishModal({ open, onOpenChange }: PublishModalProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set());
  const [playImmediately, setPlayImmediately] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [liveChannelIds, setLiveChannelIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const {
    project,
    currentTemplateId,
    templates,
    elements,
    animations,
    keyframes,
    saveProject,
  } = useDesignerStore();

  // Get current template data
  const currentTemplate = templates.find(t => t.id === currentTemplateId);
  const templateElements = elements.filter(e => e.template_id === currentTemplateId);

  // Load available channels
  useEffect(() => {
    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function loadChannels() {
      if (!open) {
        return;
      }

      if (!supabase) {
        console.error('[PublishModal] Supabase client not available');
        setError('Database connection not available');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (!isCancelled) {
          console.error('[PublishModal] Loading timed out');
          setError('Loading timed out. Please check your connection and try again.');
          setIsLoading(false);
        }
      }, 10000);

      try {
        // First check if we have an authenticated session
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('[PublishModal] Auth session:', sessionData?.session ? 'authenticated' : 'not authenticated');

        if (!sessionData?.session) {
          throw new Error('Not authenticated. Please log in first.');
        }

        console.log('[PublishModal] Loading channels...');

        const { data, error: fetchError } = await supabase
          .from('pulsar_channels')
          .select('id, name, channel_code, player_url, player_status')
          .order('name');

        if (isCancelled) return;

        console.log('[PublishModal] Channels query result:', { data, error: fetchError });

        if (fetchError) throw fetchError;

        if (data) {
          setChannels(data);
          // Select first channel by default if none selected
          if (data.length > 0 && selectedChannelIds.size === 0) {
            setSelectedChannelIds(new Set([data[0].id]));
          }
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('[PublishModal] Failed to load channels:', err);
        setError(err instanceof Error ? err.message : 'Failed to load channels');
      } finally {
        if (!isCancelled) {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    }

    if (open) {
      loadChannels();
    }

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [open]);

  // Build payload from current template elements
  const buildPayload = useCallback(() => {
    const payload: Record<string, string | null> = {};

    templateElements.forEach(element => {
      if (element.content?.type === 'text' && element.content.text) {
        payload[element.id] = element.content.text;
        if (element.name) {
          payload[element.name] = element.content.text;
        }
      } else if (element.content?.type === 'image' && element.content.src) {
        payload[element.id] = element.content.src || null;
        if (element.name) {
          payload[element.name] = element.content.src || null;
        }
      }
    });

    return payload;
  }, [templateElements]);

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

  // Publish to selected channels
  const handlePublish = async () => {
    if (selectedChannelIds.size === 0 || !currentTemplate || !supabase) return;

    setIsPublishing(true);
    setError(null);

    try {
      // Save project first to ensure all changes are persisted
      await saveProject();

      // Build the command payload
      const command = {
        type: playImmediately ? 'play' : 'load',
        template: {
          id: currentTemplate.id,
          name: currentTemplate.name,
          projectId: project?.id,
          layerId: currentTemplate.layer_id, // Include layerId for animated layer switching
          // Include element data for dynamic rendering
          elements: templateElements.map(el => ({
            id: el.id,
            name: el.name,
            type: el.content?.type,
            content: el.content,
            position_x: el.position_x,
            position_y: el.position_y,
            width: el.width,
            height: el.height,
            styles: el.styles,
          })),
          // Include animation data
          animations: animations.filter(a =>
            templateElements.some(e => e.id === a.element_id)
          ),
          keyframes: keyframes.filter(k =>
            animations.some(a => a.id === k.animation_id &&
              templateElements.some(e => e.id === a.element_id))
          ),
        },
        payload: buildPayload(),
        timestamp: new Date().toISOString(),
      };

      // Send command to all selected channels
      const channelIds = Array.from(selectedChannelIds);

      // Update channel state and also set loaded_project_id on channel
      const results = await Promise.all(
        channelIds.flatMap(channelId => [
          // Update channel state with pending command
          supabase
            .from('pulsar_channel_state')
            .update({
              pending_command: command,
              updated_at: new Date().toISOString(),
            })
            .eq('channel_id', channelId),
          // Set loaded_project_id on channel for always-on layer support
          supabase
            .from('pulsar_channels')
            .update({
              loaded_project_id: project?.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', channelId),
        ])
      );

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to publish to ${errors.length} channel(s)`);
      }

      // Track which channels are live
      setLiveChannelIds(prev => {
        const next = new Set(prev);
        channelIds.forEach(id => next.add(id));
        return next;
      });

      // Open player URL for each selected channel
      channelIds.forEach(channelId => {
        const debugParam = debugMode ? '?debug=1' : '';
        const playerUrl = `${window.location.origin}/player/${channelId}${debugParam}`;
        window.open(playerUrl, `nova-player-${channelId}`, 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes');
      });

      // Close the modal after successful publish
      onOpenChange(false);
    } catch (err) {
      console.error('Publish failed:', err);
      setError('Failed to publish to channel');
    } finally {
      setIsPublishing(false);
    }
  };

  // Take off air (stop) - stops all live channels
  // If current template is selected, stop only that layer; otherwise stop all layers
  const handleStop = async () => {
    if (liveChannelIds.size === 0 || !supabase) return;

    setIsPublishing(true);
    setError(null);

    try {
      // Include layerId to stop only the current template's layer
      // If no layerId, it will stop all layers (global stop)
      const command = {
        type: 'stop',
        layerId: currentTemplate?.layer_id,
        template: currentTemplate ? {
          id: currentTemplate.id,
          name: currentTemplate.name,
          projectId: project?.id,
          layerId: currentTemplate.layer_id,
        } : undefined,
        timestamp: new Date().toISOString(),
      };

      const channelIds = Array.from(liveChannelIds);
      await Promise.all(
        channelIds.map(channelId =>
          supabase
            .from('pulsar_channel_state')
            .update({
              pending_command: command,
              updated_at: new Date().toISOString(),
            })
            .eq('channel_id', channelId)
        )
      );

      // Only clear live channels if we did a global stop (no layerId)
      if (!currentTemplate?.layer_id) {
        setLiveChannelIds(new Set());
      }
    } catch (err) {
      console.error('Stop failed:', err);
      setError('Failed to stop playback');
    } finally {
      setIsPublishing(false);
    }
  };

  // Clear (immediate, no animation) - clears all live channels
  const handleClear = async () => {
    if (liveChannelIds.size === 0 || !supabase) return;

    setIsPublishing(true);
    setError(null);

    try {
      const command = {
        type: 'clear',
        timestamp: new Date().toISOString(),
      };

      const channelIds = Array.from(liveChannelIds);
      await Promise.all(
        channelIds.map(channelId =>
          supabase
            .from('pulsar_channel_state')
            .update({
              pending_command: command,
              updated_at: new Date().toISOString(),
            })
            .eq('channel_id', channelId)
        )
      );

      setLiveChannelIds(new Set());
    } catch (err) {
      console.error('Clear failed:', err);
      setError('Failed to clear');
    } finally {
      setIsPublishing(false);
    }
  };

  // Get player URL for a channel
  const getPlayerUrl = (channelId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/player/${channelId}`;
  };

  const hasLiveChannels = liveChannelIds.size > 0;
  const hasSelectedChannels = selectedChannelIds.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-violet-500" />
            Publish to Channel
          </DialogTitle>
          <DialogDescription>
            Send this graphic to a broadcast channel for live output.
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
            /* No Channels */
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
                          ? 'border-violet-500 bg-violet-500/10'
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
                        channel.player_status === 'connected'
                          ? 'bg-green-500'
                          : 'bg-muted-foreground/30'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{channel.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {channel.channel_code}
                        </div>
                      </div>
                      {liveChannelIds.has(channel.id) && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                          <Radio className="h-3 w-3 animate-pulse" />
                          LIVE
                        </div>
                      )}
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

              {/* Template Info */}
              {currentTemplate && (
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{currentTemplate.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {templateElements.length} element{templateElements.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {project && (
                      <div className="text-xs text-muted-foreground">
                        {project.name}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                          <span className="text-xs text-muted-foreground">{channel?.channel_code}:</span>
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
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <div>
            {hasLiveChannels && (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStop}
                  disabled={isPublishing}
                >
                  <Square className="h-3 w-3 mr-1.5" />
                  Stop (OUT)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={isPublishing}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {hasLiveChannels ? 'Close' : 'Cancel'}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!hasSelectedChannels || !currentTemplate || isPublishing || channels.length === 0}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {hasLiveChannels ? 'Update' : 'Publish'}
                  {selectedChannelIds.size > 1 && ` (${selectedChannelIds.size})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
