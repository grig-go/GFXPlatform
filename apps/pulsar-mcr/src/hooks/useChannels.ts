import { useState, useEffect, useCallback } from 'react';
import { supabase, sessionReady } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// New Channel type - represents the main channels table
export interface Channel {
  id: string;
  name: string;
  type: 'Unreal' | 'Vizrt' | 'Pixera' | 'Web';
  active?: boolean;
  description?: string;
  mse_host?: string; // MSE hostname/IP for Vizrt channels
  mse_port?: number; // MSE WebSocket port (default 8595)
  created_at?: string;
  updated_at?: string;
}

// Channel Playlist type - represents the channel_playlists table (formerly channels)
export interface ChannelPlaylist {
  id: string;
  name: string;
  type: 'channel' | 'playlist' | 'bucket';
  active: boolean;
  schedule?: string;
  parent_id?: string;
  user_id?: string;
  order?: number;
  content_id?: string;
  display_name?: string;
  carousel_name?: string;
  carousel_type?: string;
  channel_id?: string; // Foreign key to channels table (only used for type='channel' entries)
  created_at?: string;
  updated_at?: string;
  // Optionally add children if you need tree structure:
  children?: ChannelPlaylist[];
}

// Helper: Build your tree from a flat channel playlists array.
const buildTree = (playlists: ChannelPlaylist[]): ChannelPlaylist[] => {
  const build = (items: ChannelPlaylist[], parentId: string | null = null): ChannelPlaylist[] =>
    items
      .filter(item => item.parent_id === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(item => ({
        ...item,
        children: build(items, item.id)
      }));
  return build(playlists);
};

// Helper: Deep equality check (for simple objects, JSON.stringify works for many cases)
const deepEqual = (a: any, b: any): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

export const useChannels = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelPlaylists, setChannelPlaylists] = useState<ChannelPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get effective organization for impersonation support
  const { effectiveOrganization, isSuperuser, user } = useAuth();

  const fetchChannelsAndPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Wait for session to be restored from cookies before checking
      await sessionReady;

      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('No active session - user needs to log in');
        setChannels([]);
        setChannelPlaylists([]);
        setError('Please log in to view channels');
        return;
      }

      console.log('Fetching channels and playlists for user:', session.user.id);

      // Get the effective organization ID for impersonation support
      const effectiveOrgId = effectiveOrganization?.id;
      console.log('[useChannels] Fetching with effectiveOrgId:', effectiveOrgId);

      // Build channels query with organization filter for superusers
      let channelsQuery = supabase
        .from('channels')
        .select('*')
        .order('created_at');

      // For superusers, filter by effective org to support impersonation
      if (isSuperuser && effectiveOrgId) {
        channelsQuery = channelsQuery.eq('organization_id', effectiveOrgId);
      }

      const { data: channelsData, error: channelsError } = await channelsQuery;

      if (channelsError) {
        console.error('Error fetching channels:', channelsError);
        throw channelsError;
      }

      // Fetch channel playlists from the renamed table with organization filter
      let playlistsQuery = supabase
        .from('channel_playlists')
        .select('*')
        .order('order');

      // For superusers, filter by effective org to support impersonation
      if (isSuperuser && effectiveOrgId) {
        playlistsQuery = playlistsQuery.eq('organization_id', effectiveOrgId);
      }

      const { data: playlistsData, error: playlistsError } = await playlistsQuery;

      if (playlistsError) {
        console.error('Error fetching channel playlists:', playlistsError);
        throw playlistsError;
      }

      console.log('[useChannels] Fetched channels:', channelsData?.length || 0, 'for org:', effectiveOrgId);
      console.log('[useChannels] Fetched channel playlists:', playlistsData?.length || 0);
      setChannels(channelsData || []);
      setChannelPlaylists(playlistsData || []);
    } catch (err) {
      console.error('Error in fetchChannelsAndPlaylists:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [effectiveOrganization?.id, isSuperuser]);

  useEffect(() => {
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchChannelsAndPlaylists();
      } else if (event === 'SIGNED_OUT') {
        setChannels([]);
        setChannelPlaylists([]);
        setError('You must be logged in to view channels');
      }
    });

    // Initial fetch
    fetchChannelsAndPlaylists();

    // Cleanup
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchChannelsAndPlaylists]);

  // Keep the old fetchChannels as an alias for compatibility
  const fetchChannels = fetchChannelsAndPlaylists;

  /**
   * refreshChannelsIfNeeded:
   * Compares the expected tree (provided as a parameter) with the latest DB tree.
   * If they differ, updates the local channels state.
   */
  const refreshChannelsIfNeeded = useCallback(async (expectedTree?: ChannelPlaylist[]) => {
    try {
      // Check session first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session for refresh');
        return;
      }

      // Get the effective organization ID for impersonation support
      const effectiveOrgId = effectiveOrganization?.id;

      // Refresh both channels and playlists with organization filter
      let channelsQuery = supabase
        .from('channels')
        .select('*')
        .order('created_at');

      // For superusers, filter by effective org to support impersonation
      if (isSuperuser && effectiveOrgId) {
        channelsQuery = channelsQuery.eq('organization_id', effectiveOrgId);
      }

      const { data: channelsData } = await channelsQuery;

      // Build playlists query with organization filter
      let playlistsQuery = supabase
        .from('channel_playlists')
        .select('*')
        .order('order');

      // For superusers, filter by effective org to support impersonation
      if (isSuperuser && effectiveOrgId) {
        playlistsQuery = playlistsQuery.eq('organization_id', effectiveOrgId);
      }

      const { data: playlistsData, error } = await playlistsQuery;

      if (error) throw error;

      const dbPlaylists = playlistsData || [];

      // If expectedTree is provided, compare
      if (expectedTree) {
        const dbTree = buildTree(dbPlaylists);
        const expectedTreeBuilt = buildTree(expectedTree);
        if (!deepEqual(dbTree, expectedTreeBuilt)) {
          // Only update if the trees differ
          setChannelPlaylists(dbPlaylists);
        }
      } else {
        // Just refresh
        setChannelPlaylists(dbPlaylists);
      }

      // Always update channels
      if (channelsData) {
        setChannels(channelsData);
      }
    } catch (err) {
      console.error('Error in refreshChannelsIfNeeded:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [effectiveOrganization?.id, isSuperuser]);

  const createChannel = useCallback(async (channel: Omit<Channel, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Use effective organization for new channels
      const effectiveOrgId = effectiveOrganization?.id;
      const channelData = {
        ...channel,
        organization_id: effectiveOrgId,
      };

      const { data, error } = await supabase
        .from('channels')
        .insert([channelData])
        .select()
        .single();

      if (error) {
        console.error('Error creating channel:', error);
        throw error;
      }

      setChannels(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error in createChannel:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [effectiveOrganization?.id]);

  const createChannelPlaylist = useCallback(async (playlist: Omit<ChannelPlaylist, 'id' | 'user_id'>) => {
    try {
      // Remove children and computed properties from the playlist object before sending to the database
      const { children, channel_type, ...playlistWithoutChildren } = playlist as any;

      // Get the current maximum order value for the target parent
      let query = supabase
        .from('channel_playlists')
        .select('order');

      if (playlistWithoutChildren.parent_id) {
        query = query.eq('parent_id', playlistWithoutChildren.parent_id);
      } else {
        query = query.is('parent_id', null);
      }

      const { data: existingPlaylists } = await query;
      const maxOrder = existingPlaylists?.reduce((max, pl) =>
        pl.order > max ? pl.order : max, -1) ?? -1;

      // Use user from auth context
      if (!user?.auth_user_id) {
        throw new Error('User must be authenticated to create channel playlists');
      }

      // Use effective organization for new playlists
      const effectiveOrgId = effectiveOrganization?.id;

      // Add the user_id and organization_id to the playlist data
      const playlistData = {
        ...playlistWithoutChildren,
        user_id: user.auth_user_id,
        organization_id: effectiveOrgId,
        order: maxOrder + 1
      };

      const { data, error } = await supabase
        .from('channel_playlists')
        .insert([playlistData])
        .select()
        .single();

      if (error) {
        console.error('Error creating channel playlist:', error);
        throw error;
      }

      setChannelPlaylists(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error in createChannelPlaylist:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [user?.auth_user_id, effectiveOrganization?.id]);

  const updateChannel = async (id: string, updates: Partial<Channel>) => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating channel:', error);
        throw error;
      }

      setChannels(prev => prev.map(channel =>
        channel.id === id ? { ...channel, ...data } : channel
      ));
      return data;
    } catch (err) {
      console.error('Error in updateChannel:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateChannelPlaylist = useCallback(async (id: string, updates: Partial<ChannelPlaylist>) => {
    try {
      // Remove children from the updates object before sending to the database
      const { children, ...updatesWithoutChildren } = updates as any;

      if (!user?.auth_user_id) {
        throw new Error('User must be authenticated to update channel playlists');
      }

      // Don't override user_id in updates
      const updateData = {
        ...updatesWithoutChildren
      };

      const { data, error } = await supabase
        .from('channel_playlists')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating channel playlist:', error);
        throw error;
      }

      setChannelPlaylists(prev => prev.map(playlist =>
        playlist.id === id ? { ...playlist, ...data } : playlist
      ));
      return data;
    } catch (err) {
      console.error('Error in updateChannelPlaylist:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [user?.auth_user_id]);

  const checkChannelUsage = async (channelId: string): Promise<{ isUsed: boolean; count: number }> => {
    try {
      const { data, error } = await supabase
        .from('channel_playlists')
        .select('id', { count: 'exact' })
        .eq('channel_id', channelId);

      if (error) {
        console.error('Error checking channel usage:', error);
        throw error;
      }

      return {
        isUsed: (data?.length || 0) > 0,
        count: data?.length || 0
      };
    } catch (err) {
      console.error('Error in checkChannelUsage:', err);
      throw err;
    }
  };

  const deleteChannel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting channel:', error);
        throw error;
      }

      setChannels(prev => prev.filter(channel => channel.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error in deleteChannel:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteChannelPlaylist = useCallback(async (id: string) => {
    try {
      if (!user?.auth_user_id) {
        throw new Error('User must be authenticated to delete channel playlists');
      }

      const { error } = await supabase
        .from('channel_playlists')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting channel playlist:', error);
        throw error;
      }

      setChannelPlaylists(prev => prev.filter(playlist => playlist.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error in deleteChannelPlaylist:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [user?.auth_user_id]);

  // Batch delete multiple channel playlist items in a single database operation
  const deleteChannelPlaylistBatch = useCallback(async (ids: string[]) => {
    try {
      if (ids.length === 0) return { success: true };

      if (!user?.auth_user_id) {
        throw new Error('User must be authenticated to delete channel playlists');
      }

      const { error } = await supabase
        .from('channel_playlists')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('Error batch deleting channel playlists:', error);
        throw error;
      }

      setChannelPlaylists(prev => prev.filter(playlist => !ids.includes(playlist.id)));
      return { success: true };
    } catch (err) {
      console.error('Error in deleteChannelPlaylistBatch:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [user?.auth_user_id]);

  return {
    // Main channels data
    channels,
    channelPlaylists,
    loading,
    error,

    // Channel CRUD operations
    createChannel,
    updateChannel,
    deleteChannel,
    checkChannelUsage,

    // Channel Playlist CRUD operations
    createChannelPlaylist,
    updateChannelPlaylist,
    deleteChannelPlaylist,
    deleteChannelPlaylistBatch,

    // Refresh functions
    refreshChannels: fetchChannels,
    refreshChannelsAndPlaylists: fetchChannelsAndPlaylists,
    refreshChannelsIfNeeded,

    // Helper functions
    buildTree,
    deepEqual,

    // Legacy compatibility - map old methods to channel playlist methods
    channels_old: channelPlaylists // Temporary alias for compatibility
  };
};