import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Send, Radio, Square, Loader2, Monitor, Plus } from 'lucide-react';
import { supabase, directRestUpdate, markSupabaseSuccess, markSupabaseFailure } from '@/lib/supabase';
import { useDesignerStore } from '@/stores/designerStore';
import { getBoundValue } from '@/lib/bindingResolver';
import type { Project } from '@emergent-platform/types';

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
  const [playImmediately, setPlayImmediately] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  // const [fixedSize, setFixedSize] = useState(false); // Commented out - OBS users set transform manually
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [liveChannelIds, setLiveChannelIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Project selection state
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Track open player windows
  const playerWindowsRef = useRef<Map<string, Window>>(new Map());
  const windowCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    project,
    currentTemplateId,
    templates,
    elements,
    animations,
    keyframes,
    bindings,
    dataPayload,
    currentRecordIndex,
  } = useDesignerStore();

  // Initialize selected project to current project when modal opens
  useEffect(() => {
    if (open && project) {
      setSelectedProjectId(project.id);
    }
  }, [open, project]);

  // Get current template data
  const currentTemplate = templates.find(t => t.id === currentTemplateId);
  const templateElements = elements.filter(e => e.template_id === currentTemplateId);

  // Get selected project info (current project from Nova or selected from dropdown)
  const selectedProject = selectedProjectId === project?.id
    ? project
    : availableProjects.find(p => p.id === selectedProjectId);

  // Send stop command to a channel (extracted for reuse)
  const sendStopCommand = useCallback(async (channelId: string) => {
    try {
      const command = {
        type: 'stop',
        timestamp: new Date().toISOString(),
      };

      // Use direct REST API for reliability
      const result = await directRestUpdate(
        'pulsar_channel_state',
        {
          pending_command: command,
          updated_at: new Date().toISOString(),
        },
        { column: 'channel_id', value: channelId },
        5000
      );

      if (result.success) {
        console.log(`[PublishModal] Sent stop command to channel ${channelId}`);
      } else {
        console.error(`[PublishModal] Failed to send stop command to channel ${channelId}:`, result.error);
      }
    } catch (err) {
      console.error(`[PublishModal] Failed to send stop command to channel ${channelId}:`, err);
    }
  }, []);

  // Monitor player windows and send stop when closed
  useEffect(() => {
    // Start checking for closed windows when we have live channels
    if (liveChannelIds.size > 0 && !windowCheckIntervalRef.current) {
      windowCheckIntervalRef.current = setInterval(() => {
        const closedChannels: string[] = [];

        playerWindowsRef.current.forEach((win, channelId) => {
          if (win.closed) {
            console.log(`[PublishModal] Player window for channel ${channelId} was closed`);
            closedChannels.push(channelId);
          }
        });

        // Send stop commands for closed windows
        closedChannels.forEach(channelId => {
          sendStopCommand(channelId);
          playerWindowsRef.current.delete(channelId);
        });

        // Update live channels state
        if (closedChannels.length > 0) {
          setLiveChannelIds(prev => {
            const next = new Set(prev);
            closedChannels.forEach(id => next.delete(id));
            return next;
          });
        }

        // Stop checking if no more windows
        if (playerWindowsRef.current.size === 0 && windowCheckIntervalRef.current) {
          clearInterval(windowCheckIntervalRef.current);
          windowCheckIntervalRef.current = null;
        }
      }, 1000); // Check every second
    }

    return () => {
      if (windowCheckIntervalRef.current) {
        clearInterval(windowCheckIntervalRef.current);
        windowCheckIntervalRef.current = null;
      }
    };
  }, [liveChannelIds.size, sendStopCommand]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (windowCheckIntervalRef.current) {
        clearInterval(windowCheckIntervalRef.current);
      }
    };
  }, []);

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

      // Set a timeout to prevent infinite loading (increased to 30s for slow connections)
      timeoutId = setTimeout(() => {
        if (!isCancelled) {
          console.error('[PublishModal] Loading timed out');
          setError('Loading timed out. Please check your connection and try again.');
          setIsLoading(false);
        }
      }, 30000);

      // Helper to load channels with retry - ALWAYS uses direct REST API
      // This completely bypasses the Supabase client to avoid stale connection issues
      const loadChannelsWithRetry = async (retries = 3): Promise<typeof channels> => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase configuration missing');
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            console.log(`[PublishModal] Loading channels via REST API (attempt ${attempt}/${retries})...`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(
              `${supabaseUrl}/rest/v1/pulsar_channels?select=id,name,channel_code,player_url,player_status&order=name`,
              {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                },
                signal: controller.signal,
              }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`REST API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`[PublishModal] Loaded ${data.length} channels via REST API`);
            return data || [];
          } catch (err: any) {
            if (err.name === 'AbortError') {
              console.warn(`[PublishModal] Attempt ${attempt} timed out`);
            } else {
              console.warn(`[PublishModal] Attempt ${attempt} failed:`, err);
            }
            if (attempt === retries) throw err;
            // Wait 1 second before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        return [];
      };

      try {
        // Skip auth check entirely - it's not needed since RLS policies allow access
        // This removes a potential timeout point
        console.log('[PublishModal] Skipping auth check, loading channels directly...');

        const data = await loadChannelsWithRetry(3);

        if (isCancelled) return;

        console.log('[PublishModal] Channels loaded:', data.length, 'channels');
        markSupabaseSuccess(); // Mark successful operation

        if (data) {
          setChannels(data);
          // Select first channel by default if none selected
          if (data.length > 0 && selectedChannelIds.size === 0) {
            setSelectedChannelIds(new Set([data[0].id]));
          }
        }

        // Also load available projects using direct REST API
        await loadProjectsWithRetry();
      } catch (err) {
        if (isCancelled) return;
        console.error('[PublishModal] Failed to load channels after retries:', err);
        await markSupabaseFailure(); // Track failure for potential reconnect
        setError('Failed to load channels. Please check your connection and try again.');
      } finally {
        if (!isCancelled) {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    }

    // Load projects using direct REST API
    const loadProjectsWithRetry = async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) return;

      try {
        console.log('[PublishModal] Loading projects via REST API...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `${supabaseUrl}/rest/v1/gfx_projects?select=id,name,thumbnail_url,updated_at&archived=eq.false&order=updated_at.desc`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const projects = await response.json();
          console.log(`[PublishModal] Loaded ${projects.length} projects via REST API`);
          setAvailableProjects(projects);
        }
      } catch (err) {
        console.warn('[PublishModal] Failed to load projects (non-critical):', err);
      }
    };

    if (open) {
      loadChannels();
    }

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [open]);

  // Get current data record for binding resolution
  const currentRecord = dataPayload && dataPayload.length > 0
    ? dataPayload[currentRecordIndex] || null
    : null;

  // Get bindings for current template
  const templateBindings = bindings.filter(b => b.template_id === currentTemplateId);

  // Debug: Log binding filtering
  console.log('[PublishModal] Binding debug:', {
    totalBindings: bindings.length,
    currentTemplateId,
    templateBindings: templateBindings.length,
    allBindingTemplateIds: [...new Set(bindings.map(b => b.template_id))],
    hasDataPayload: dataPayload?.length || 0,
    currentRecordIndex,
    hasCurrentRecord: !!currentRecord,
  });

  // Build payload from current template elements, resolving bindings with current data
  const buildPayload = useCallback(() => {
    const payload: Record<string, string | null> = {};

    templateElements.forEach(element => {
      // Check if this element has a binding
      const binding = templateBindings.find(b => b.element_id === element.id);

      if (binding && currentRecord) {
        // Resolve the binding using current data record
        const boundValue = getBoundValue(binding, currentRecord);
        if (boundValue !== undefined && boundValue !== null) {
          const valueStr = String(boundValue);
          payload[element.id] = valueStr;
          if (element.name) {
            payload[element.name] = valueStr;
          }
          return; // Skip default content extraction
        }
      }

      // Fallback to element's static content if no binding or no data
      if (element.content?.type === 'text' && element.content.text) {
        // Check if text contains binding placeholder {{...}} - skip if so (will be resolved by player)
        const text = element.content.text;
        if (!text.includes('{{')) {
          payload[element.id] = text;
          if (element.name) {
            payload[element.name] = text;
          }
        }
      } else if (element.content?.type === 'image' && element.content.src) {
        const src = element.content.src;
        if (!src.includes('{{')) {
          payload[element.id] = src || null;
          if (element.name) {
            payload[element.name] = src || null;
          }
        }
      }
    });

    return payload;
  }, [templateElements, templateBindings, currentRecord]);

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
    // For current project, require a template. For other projects, just need the project ID
    const isCurrentProject = selectedProjectId === project?.id;
    if (selectedChannelIds.size === 0 || !selectedProjectId) return;
    if (isCurrentProject && !currentTemplate) return;

    setIsPublishing(true);
    setError(null);

    try {
      // Build the command payload
      let command: any;

      if (isCurrentProject && currentTemplate) {
        // Publishing current project - include full template data for real-time playback
        console.log('[PublishModal] Publishing current project with embedded data...');

        // Backup to localStorage (instant and reliable)
        try {
          const localBackup = {
            project,
            templates,
            elements,
            animations,
            keyframes,
            timestamp: new Date().toISOString(),
          };
          localStorage.setItem(`nova-project-backup-${project?.id}`, JSON.stringify(localBackup));
        } catch (backupErr) {
          console.warn('[PublishModal] localStorage backup failed (non-critical):', backupErr);
        }

        command = {
          type: playImmediately ? 'play' : 'load',
          template: {
            id: currentTemplate.id,
            name: currentTemplate.name,
            projectId: project?.id,
            layerId: currentTemplate.layer_id,
            // Include FULL element data for proper rendering
            elements: templateElements.map(el => ({
              id: el.id,
              template_id: el.template_id,
              name: el.name,
              element_id: el.element_id,
              element_type: el.element_type,
              parent_element_id: el.parent_element_id,
              sort_order: el.sort_order,
              z_index: el.z_index,
              position_x: el.position_x,
              position_y: el.position_y,
              width: el.width,
              height: el.height,
              rotation: el.rotation,
              scale_x: el.scale_x,
              scale_y: el.scale_y,
              anchor_x: el.anchor_x,
              anchor_y: el.anchor_y,
              opacity: el.opacity,
              content: el.content,
              styles: el.styles,
              classes: el.classes,
              visible: el.visible,
              locked: el.locked,
              // Include interactions for interactive elements
              interactions: el.interactions,
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
          // Include interactive mode configuration for interactive projects
          interactive_enabled: project?.interactive_enabled || false,
          interactive_config: project?.interactive_enabled ? project?.interactive_config : undefined,
          // Include bindings and current data record for runtime resolution
          bindings: templateBindings,
          currentRecord: currentRecord,
          payload: buildPayload(),
          timestamp: new Date().toISOString(),
        };

        // Debug: Log what we're sending
        console.log('[PublishModal] Command data:', {
          bindingsCount: templateBindings.length,
          hasCurrentRecord: !!currentRecord,
          currentRecord: currentRecord,
          payloadKeys: Object.keys(command.payload || {}),
        });
      } else {
        // Publishing different project - send initialize command with project ID
        // NovaPlayer will load the project data from DB (including interactive_config)
        console.log(`[PublishModal] Publishing project ${selectedProjectId} (initialize mode)...`);
        // For initialize mode, the player will fetch interactive_enabled and interactive_config from DB
        command = {
          type: 'initialize',
          projectId: selectedProjectId,
          timestamp: new Date().toISOString(),
        };
      }

      // Send command to all selected channels using DIRECT REST API
      // This completely bypasses the Supabase client which may have stale connections
      const channelIds = Array.from(selectedChannelIds);

      console.log('[PublishModal] Publishing to channels via direct REST API:', channelIds);

      // Publish to each channel using direct REST (no Supabase client)
      const publishResults = await Promise.all(
        channelIds.map(async (channelId) => {
          // Update channel state with pending command
          const stateResult = await directRestUpdate(
            'pulsar_channel_state',
            {
              pending_command: command,
              updated_at: new Date().toISOString(),
            },
            { column: 'channel_id', value: channelId },
            10000
          );

          if (!stateResult.success) {
            console.error(`[PublishModal] Failed to update channel state for ${channelId}:`, stateResult.error);
            return { channelId, success: false, error: stateResult.error };
          }

          // Set loaded_project_id on channel for always-on layer support
          const channelResult = await directRestUpdate(
            'pulsar_channels',
            {
              loaded_project_id: selectedProjectId,
              updated_at: new Date().toISOString(),
            },
            { column: 'id', value: channelId },
            10000
          );

          if (!channelResult.success) {
            console.warn(`[PublishModal] Failed to update channel loaded_project_id for ${channelId}:`, channelResult.error);
            // Don't fail the whole publish for this
          }

          return { channelId, success: true };
        })
      );

      // Check for errors
      const errors = publishResults.filter(r => !r.success);
      if (errors.length > 0) {
        console.error('[PublishModal] Some publish operations failed:', errors);
        throw new Error(`Failed to publish to ${errors.length} channel(s): ${errors.map(e => e.error).join(', ')}`);
      }

      // Track which channels are live
      setLiveChannelIds(prev => {
        const next = new Set(prev);
        channelIds.forEach(id => next.add(id));
        return next;
      });

      // Open player URL for each selected channel and track window references
      channelIds.forEach(channelId => {
        const debugParam = debugMode ? '?debug=1' : '';
        const playerUrl = `${window.location.origin}/player/${channelId}${debugParam}`;
        const playerWindow = window.open(playerUrl, `nova-player-${channelId}`, 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes');

        // Track the window reference for close detection
        if (playerWindow) {
          playerWindowsRef.current.set(channelId, playerWindow);
        }
      });

      console.log('[PublishModal] Publish successful');

      // Close the modal after successful publish
      onOpenChange(false);
    } catch (err) {
      console.error('[PublishModal] Publish failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish to channel');
    } finally {
      setIsPublishing(false);
    }
  };

  // Take off air (stop) - stops all live channels
  // If current template is selected, stop only that layer; otherwise stop all layers
  const handleStop = async () => {
    if (liveChannelIds.size === 0) return;

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

      // Use direct REST API for reliability (bypasses Supabase client)
      const channelIds = Array.from(liveChannelIds);
      console.log('[PublishModal] Sending stop command via direct REST API to channels:', channelIds);

      const stopResults = await Promise.all(
        channelIds.map(channelId =>
          directRestUpdate(
            'pulsar_channel_state',
            {
              pending_command: command,
              updated_at: new Date().toISOString(),
            },
            { column: 'channel_id', value: channelId },
            10000
          )
        )
      );

      const errors = stopResults.filter((r: { success: boolean; error?: string }) => !r.success);
      if (errors.length > 0) {
        console.error('[PublishModal] Some stop operations failed:', errors);
        throw new Error(`Failed to stop ${errors.length} channel(s)`);
      }

      // Only clear live channels if we did a global stop (no layerId)
      if (!currentTemplate?.layer_id) {
        setLiveChannelIds(new Set());
        // Clear all tracked windows
        playerWindowsRef.current.clear();
      }
    } catch (err) {
      console.error('Stop failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop playback');
    } finally {
      setIsPublishing(false);
    }
  };

  // Clear (immediate, no animation) - clears all live channels
  const handleClear = async () => {
    if (liveChannelIds.size === 0) return;

    setIsPublishing(true);
    setError(null);

    try {
      const command = {
        type: 'clear',
        timestamp: new Date().toISOString(),
      };

      // Use direct REST API for reliability (bypasses Supabase client)
      const channelIds = Array.from(liveChannelIds);
      console.log('[PublishModal] Sending clear command via direct REST API to channels:', channelIds);

      const clearResults = await Promise.all(
        channelIds.map(channelId =>
          directRestUpdate(
            'pulsar_channel_state',
            {
              pending_command: command,
              updated_at: new Date().toISOString(),
            },
            { column: 'channel_id', value: channelId },
            10000
          )
        )
      );

      const errors = clearResults.filter((r: { success: boolean; error?: string }) => !r.success);
      if (errors.length > 0) {
        console.error('[PublishModal] Some clear operations failed:', errors);
        throw new Error(`Failed to clear ${errors.length} channel(s)`);
      }

      setLiveChannelIds(new Set());
      // Clear all tracked windows
      playerWindowsRef.current.clear();
    } catch (err) {
      console.error('Clear failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear');
    } finally {
      setIsPublishing(false);
    }
  };

  // Get player URL for a channel
  const getPlayerUrl = (channelId: string) => {
    const baseUrl = window.location.origin;
    const debugParam = debugMode ? '?debug=1' : '';
    return `${baseUrl}/player/${channelId}${debugParam}`;
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
                {/* Fixed size option commented out - OBS users set transform manually
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fixedSize}
                    onChange={(e) => setFixedSize(e.target.checked)}
                    disabled={isPublishing}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">
                    Fixed size (for OBS browser source)
                  </span>
                </label>
                */}
              </div>

              {/* Project Selection */}
              <div className="space-y-3">
                <Label>Project</Label>
                <Select
                  value={selectedProjectId || ''}
                  onValueChange={(value) => setSelectedProjectId(value)}
                  disabled={isPublishing}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a project">
                      {selectedProject ? (
                        <div className="flex items-center gap-2">
                          <span>{selectedProject.name}</span>
                          {selectedProjectId === project?.id && (
                            <span className="text-xs text-muted-foreground">(current)</span>
                          )}
                        </div>
                      ) : (
                        'Select a project'
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {/* Current project first */}
                    {project && (
                      <SelectItem value={project.id}>
                        <div className="flex items-center gap-2">
                          <span>{project.name}</span>
                          <span className="text-xs text-muted-foreground">(current)</span>
                        </div>
                      </SelectItem>
                    )}
                    {/* Other available projects */}
                    {availableProjects
                      .filter(p => p.id !== project?.id)
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {/* Template info for current project */}
                {currentTemplate && selectedProjectId === project?.id && (
                  <div className="text-xs text-muted-foreground">
                    Template: {currentTemplate.name} ({templateElements.length} element{templateElements.length !== 1 ? 's' : ''})
                  </div>
                )}
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
              disabled={
                !hasSelectedChannels ||
                !selectedProjectId ||
                (selectedProjectId === project?.id && !currentTemplate) ||
                isPublishing ||
                channels.length === 0
              }
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
