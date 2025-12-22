import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
} from '@emergent-platform/ui';
import {
  Monitor,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

// Edge function helper for reliable channel operations (no stale connections)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callChannelsEdgeFunction<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string = '',
  body?: Record<string, unknown>,
  params?: Record<string, string>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const url = new URL(`${SUPABASE_URL}/functions/v1/pulsar-channels${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[ChannelsModal] Edge function error:', result);
      return { data: null, error: result.error || 'Edge function request failed' };
    }
    return { data: result.data as T, error: null };
  } catch (err) {
    console.error('[ChannelsModal] Network error:', err);
    return { data: null, error: err instanceof Error ? err.message : 'Network error' };
  }
}

type ChannelMode = 'fill' | 'fill_key' | 'obs';

interface Channel {
  id: string;
  name: string;
  channel_code: string;
  channel_mode: ChannelMode;
  player_url: string | null;
  player_status: 'disconnected' | 'connecting' | 'connected' | 'error';
  organization_id: string;
  created_at: string;
}

interface ChannelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHANNEL_MODES: { value: ChannelMode; label: string; description: string }[] = [
  { value: 'fill', label: 'Fill', description: 'Video fill output only' },
  { value: 'fill_key', label: 'Fill + Key', description: 'Fill and alpha key outputs' },
  { value: 'obs', label: 'OBS', description: 'Browser source for OBS/vMix' },
];

export function ChannelsModal({ open, onOpenChange }: ChannelsModalProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New channel form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newMode, setNewMode] = useState<ChannelMode>('fill');
  const [isCreating, setIsCreating] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load channels via edge function (no stale connections!)
  const loadChannels = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await callChannelsEdgeFunction<Channel[]>('GET');

      if (fetchError) throw new Error(fetchError);
      setChannels(data || []);
    } catch (err) {
      console.error('Failed to load channels:', err);
      setError('Failed to load channels');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadChannels();
    }
  }, [open]);

  // Create new channel via edge function
  const handleCreate = async () => {
    if (!newName.trim() || !newCode.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      // Get organization ID (use default dev org for now)
      const orgId = '00000000-0000-0000-0000-000000000001';

      const { data, error: createError } = await callChannelsEdgeFunction<Channel>(
        'POST',
        '',
        {
          organization_id: orgId,
          name: newName.trim(),
          channel_code: newCode.trim().toUpperCase(),
          channel_mode: newMode,
        }
      );

      if (createError) throw new Error(createError);
      if (!data) throw new Error('No data returned');

      // Add to list
      setChannels(prev => [...prev, data]);

      // Reset form
      setNewName('');
      setNewCode('');
      setNewMode('fill');
      setShowNewForm(false);
    } catch (err: any) {
      console.error('Failed to create channel:', err);
      if (err.message?.includes('duplicate')) {
        setError('A channel with this code already exists');
      } else {
        setError(err.message || 'Failed to create channel');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Delete channel via edge function
  const handleDelete = async (channelId: string) => {
    try {
      const { error: deleteError } = await callChannelsEdgeFunction<{ success: boolean }>(
        'DELETE',
        `/${channelId}`
      );

      if (deleteError) throw new Error(deleteError);

      setChannels(prev => prev.filter(c => c.id !== channelId));
    } catch (err) {
      console.error('Failed to delete channel:', err);
      setError('Failed to delete channel');
    }
  };

  // Get player URL for a channel
  const getPlayerUrl = (channelId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/player/${channelId}`;
  };

  // Copy URL to clipboard
  const copyUrl = async (channelId: string) => {
    const url = getPlayerUrl(channelId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(channelId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Open player in new tab
  const openPlayer = (channelId: string) => {
    window.open(getPlayerUrl(channelId), '_blank');
  };

  // Get status color
  const getStatusColor = (status: Channel['player_status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-muted-foreground/30';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-violet-500" />
            Broadcast Channels
          </DialogTitle>
          <DialogDescription>
            Manage output channels for Nova Player. Each channel can be opened in Flux for NDI/SDI output.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
          ) : (
            <>
              {/* Channel List */}
              <div className="space-y-2">
                {channels.length === 0 && !showNewForm ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No channels configured yet.</p>
                    <p className="text-xs mt-1">Create your first channel to get started.</p>
                  </div>
                ) : (
                  channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      {/* Status indicator */}
                      <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(channel.player_status)}`} />

                      {/* Channel info */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{channel.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {channel.channel_code}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {CHANNEL_MODES.find(m => m.value === channel.channel_mode)?.label || channel.channel_mode}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5 max-w-full">
                          {getPlayerUrl(channel.id)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => copyUrl(channel.id)}
                          title="Copy URL"
                        >
                          {copiedId === channel.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openPlayer(channel.id)}
                          title="Open Player"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(channel.id)}
                          title="Delete Channel"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* New Channel Form */}
              {showNewForm && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">New Channel</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowNewForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="channel-name">Name</Label>
                      <Input
                        id="channel-name"
                        placeholder="Channel 1"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="channel-code">Code</Label>
                      <Input
                        id="channel-code"
                        placeholder="CH1"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                        className="uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {CHANNEL_MODES.map((mode) => (
                        <button
                          key={mode.value}
                          onClick={() => setNewMode(mode.value)}
                          className={`p-2 rounded-lg border text-left transition-colors ${
                            newMode === mode.value
                              ? 'border-violet-500 bg-violet-500/10'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="text-sm font-medium">{mode.label}</div>
                          <div className="text-xs text-muted-foreground">{mode.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleCreate}
                    disabled={!newName.trim() || !newCode.trim() || isCreating}
                    className="w-full"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Channel
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={loadChannels}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <div className="flex items-center gap-2">
            {!showNewForm && (
              <Button
                onClick={() => setShowNewForm(true)}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Channel
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
