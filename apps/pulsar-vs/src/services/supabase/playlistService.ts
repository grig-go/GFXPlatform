// services/playlistService.ts
// Service for playlist CRUD operations via Supabase Edge Functions

import { supabase, getEdgeFunctionUrl } from '../../lib/supabase';
import type { Playlist, PlaylistItem } from '../../types/playlist';

// Edge function URL for PulsarVS playlists
const PLAYLISTS_EDGE_FN = () => getEdgeFunctionUrl('pulsarvs-playlists');

/**
 * Helper to get auth headers for edge function calls
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ''}`,
  };
}

// ========== PLAYLIST OPERATIONS ==========

/**
 * Fetch all playlists for a project
 */
export async function getPlaylists(projectId: string): Promise<{ success: boolean; data?: Playlist[]; error?: string }> {
  try {
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}?project_id=${projectId}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch playlists' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Fetch a single playlist with items
 */
export async function getPlaylist(playlistId: string): Promise<{ success: boolean; data?: Playlist; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}?id=${playlistId}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error fetching playlist:', data.error);
      return { success: false, error: data.error || 'Failed to fetch playlist' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in getPlaylist:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Create a new playlist
 */
export async function createPlaylist(params: {
  name: string;
  description?: string;
  project_id: string;
  loop_enabled?: boolean;
}): Promise<{ success: boolean; data?: Playlist; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: params.name,
        description: params.description || null,
        project_id: params.project_id,
        loop_enabled: params.loop_enabled ?? true,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error creating playlist:', data.error);
      return { success: false, error: data.error || 'Failed to create playlist' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in createPlaylist:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update a playlist
 */
export async function updatePlaylist(params: {
  id: string;
  name?: string;
  description?: string;
  loop_enabled?: boolean;
  is_active?: boolean;
}): Promise<{ success: boolean; data?: Playlist; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error updating playlist:', data.error);
      return { success: false, error: data.error || 'Failed to update playlist' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in updatePlaylist:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(playlistId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}?id=${playlistId}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error deleting playlist:', data.error);
      return { success: false, error: data.error || 'Failed to delete playlist' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deletePlaylist:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Batch delete multiple playlists
 */
export async function deletePlaylists(playlistIds: string[]): Promise<{ success: boolean; deleted_count?: number; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        action: 'delete',
        ids: playlistIds,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error batch deleting playlists:', data.error);
      return { success: false, error: data.error || 'Failed to delete playlists' };
    }

    return { success: true, deleted_count: data.deleted_count };
  } catch (error) {
    console.error('Error in deletePlaylists:', error);
    return { success: false, error: String(error) };
  }
}

// ========== PLAYLIST ITEM OPERATIONS ==========

/**
 * Add an item to a playlist
 */
export async function addPlaylistItem(params: {
  playlist_id: string;
  item_type: string;
  name: string;
  content_id?: string;
  media_id?: string;
  folder_id?: string;
  channel_id?: string;
  duration?: number;
  scheduled_time?: string;
  metadata?: Record<string, unknown>;
  parent_item_id?: string;
}): Promise<{ success: boolean; data?: PlaylistItem; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}/items/${params.playlist_id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        item_type: params.item_type,
        name: params.name,
        content_id: params.content_id || null,
        media_id: params.media_id || null,
        folder_id: params.folder_id || null,
        channel_id: params.channel_id || null,
        duration: params.duration || 30,
        scheduled_time: params.scheduled_time || null,
        metadata: params.metadata || {},
        parent_item_id: params.parent_item_id || null,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error adding playlist item:', data.error);
      return { success: false, error: data.error || 'Failed to add item' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in addPlaylistItem:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update a playlist item
 */
export async function updatePlaylistItem(params: {
  id: string;
  name?: string;
  duration?: number;
  channel_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; data?: PlaylistItem; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}/items/update`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error updating playlist item:', data.error);
      return { success: false, error: data.error || 'Failed to update item' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in updatePlaylistItem:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a playlist item
 */
export async function deletePlaylistItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}/items/${itemId}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error deleting playlist item:', data.error);
      return { success: false, error: data.error || 'Failed to delete item' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deletePlaylistItem:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Batch delete multiple playlist items
 */
export async function deletePlaylistItems(itemIds: string[]): Promise<{ success: boolean; deleted_count?: number; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        action: 'delete_items',
        item_ids: itemIds,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error batch deleting items:', data.error);
      return { success: false, error: data.error || 'Failed to delete items' };
    }

    return { success: true, deleted_count: data.deleted_count };
  } catch (error) {
    console.error('Error in deletePlaylistItems:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Reorder playlist items
 */
export async function reorderPlaylistItems(params: {
  playlist_id: string;
  item_orders: Array<{ id: string; sort_order: number }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        action: 'reorder',
        playlist_id: params.playlist_id,
        item_orders: params.item_orders,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error reordering items:', data.error);
      return { success: false, error: data.error || 'Failed to reorder items' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in reorderPlaylistItems:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Group playlist items under a parent
 */
export async function groupPlaylistItems(params: {
  playlist_id: string;
  item_ids: string[];
  group_name: string;
}): Promise<{ success: boolean; data?: PlaylistItem; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        action: 'group',
        playlist_id: params.playlist_id,
        item_ids: params.item_ids,
        group_name: params.group_name,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error grouping items:', data.error);
      return { success: false, error: data.error || 'Failed to group items' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in groupPlaylistItems:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Ungroup playlist items (move children to top level)
 */
export async function ungroupPlaylistItems(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        action: 'ungroup',
        group_id: groupId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error ungrouping items:', data.error);
      return { success: false, error: data.error || 'Failed to ungroup items' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in ungroupPlaylistItems:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Set channel for multiple items
 */
export async function setItemsChannel(itemIds: string[], channelId: string): Promise<{ success: boolean; updated_count?: number; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        action: 'set_channel',
        item_ids: itemIds,
        channel_id: channelId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error setting channel:', data.error);
      return { success: false, error: data.error || 'Failed to set channel' };
    }

    return { success: true, updated_count: data.updated_count };
  } catch (error) {
    console.error('Error in setItemsChannel:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Set duration for multiple items
 */
export async function setItemsDuration(itemIds: string[], duration: number): Promise<{ success: boolean; updated_count?: number; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        action: 'set_duration',
        item_ids: itemIds,
        duration: duration,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error setting duration:', data.error);
      return { success: false, error: data.error || 'Failed to set duration' };
    }

    return { success: true, updated_count: data.updated_count };
  } catch (error) {
    console.error('Error in setItemsDuration:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get nested items for a group/parent item
 */
export async function getNestedItems(itemId: string): Promise<{ success: boolean; data?: PlaylistItem[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PLAYLISTS_EDGE_FN()}/nested/${itemId}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error fetching nested items:', data.error);
      return { success: false, error: data.error || 'Failed to fetch nested items' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in getNestedItems:', error);
    return { success: false, error: String(error) };
  }
}
