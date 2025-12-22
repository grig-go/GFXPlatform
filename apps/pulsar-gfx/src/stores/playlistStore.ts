import { create } from 'zustand';
import { supabase } from '@emergent-platform/supabase-client';
import { useUIPreferencesStore } from './uiPreferencesStore';

// Dev organization ID for development (no auth)
const DEV_ORG_ID = '00000000-0000-0000-0000-000000000001';

export interface Playlist {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  description?: string;
  mode: 'manual' | 'timed' | 'loop';
  defaultDuration: number;
  endBehavior: 'stop' | 'hold' | 'loop';
  status: 'idle' | 'playing' | 'paused';
  currentPageId?: string;
  channelId?: string; // Default channel for this playlist
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface OpenPlaylistTab {
  id: string;
  name: string;
}

interface PlaylistStore {
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  isPlaying: boolean;
  currentIndex: number;
  isLoading: boolean;
  error: string | null;

  // Open tabs state (persists across page navigations)
  openTabs: OpenPlaylistTab[];
  activeTabId: string | null;

  // Actions
  loadPlaylists: (projectId: string) => Promise<void>;
  selectPlaylist: (playlistId: string | null) => void;
  clearPlaylists: () => void;
  createPlaylist: (name: string, projectId: string, mode?: 'manual' | 'timed' | 'loop') => Promise<Playlist>;
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;

  // Tab management
  openTab: (playlist: OpenPlaylistTab) => void;
  closeTab: (playlistId: string) => void;
  setActiveTab: (playlistId: string | null) => void;

  // Playback (Timed Mode)
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  goToPage: (pageId: string) => void;

  // Settings
  setMode: (mode: 'manual' | 'timed' | 'loop') => Promise<void>;
  setEndBehavior: (behavior: 'stop' | 'hold' | 'loop') => Promise<void>;
  setDefaultDuration: (duration: number) => Promise<void>;
  setChannelId: (channelId: string | null) => Promise<void>;

  // Loop mode state
  setCurrentIndex: (index: number) => void;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [],
  currentPlaylist: null,
  isPlaying: false,
  currentIndex: 0,
  isLoading: false,
  error: null,
  openTabs: [],
  activeTabId: null,

  loadPlaylists: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('pulsar_playlists')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');

      if (error) throw error;

      const playlists: Playlist[] = (data || []).map((p: any) => ({
        id: p.id,
        organizationId: p.organization_id,
        projectId: p.project_id,
        name: p.name,
        description: p.description,
        mode: p.mode,
        defaultDuration: p.default_duration,
        endBehavior: p.end_behavior,
        status: p.status,
        currentPageId: p.current_page_id,
        channelId: p.channel_id,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
        createdBy: p.created_by,
      }));

      set({ playlists, isLoading: false });

      // Try to restore saved playlist tabs from preferences
      const prefs = useUIPreferencesStore.getState();
      const savedOpenIds = prefs.openPlaylistIds;
      const savedActiveId = prefs.activePlaylistId;

      // Filter saved tabs to only include playlists that still exist in this project
      const validSavedTabs: OpenPlaylistTab[] = savedOpenIds
        .map(id => playlists.find(p => p.id === id))
        .filter((p): p is Playlist => p !== undefined)
        .map(p => ({ id: p.id, name: p.name }));

      const { openTabs } = get();

      if (validSavedTabs.length > 0) {
        // Restore saved tabs
        const activePlaylist = savedActiveId
          ? playlists.find(p => p.id === savedActiveId)
          : playlists.find(p => p.id === validSavedTabs[0].id);

        set({
          openTabs: validSavedTabs,
          activeTabId: activePlaylist?.id || validSavedTabs[0].id,
          currentPlaylist: activePlaylist || null,
        });
      } else if (playlists.length > 0 && openTabs.length === 0) {
        // No saved tabs, auto-select first playlist
        const first = playlists[0];
        set({
          openTabs: [{ id: first.id, name: first.name }],
          activeTabId: first.id,
          currentPlaylist: first,
        });
        // Save to preferences
        prefs.setOpenPlaylistIds([first.id]);
        prefs.setActivePlaylistId(first.id);
      } else if (get().activeTabId && !get().currentPlaylist) {
        // Restore current playlist from active tab
        const playlist = playlists.find((p) => p.id === get().activeTabId);
        if (playlist) {
          set({ currentPlaylist: playlist });
        }
      }
    } catch {
      set({ error: 'Failed to load playlists', isLoading: false });
    }
  },

  selectPlaylist: (playlistId: string | null) => {
    if (!playlistId) {
      set({ currentPlaylist: null });
      return;
    }
    const playlist = get().playlists.find((p) => p.id === playlistId);
    set({ currentPlaylist: playlist || null, currentIndex: 0, isPlaying: false });
  },

  clearPlaylists: () => {
    // Clear playlist state in memory
    set({
      playlists: [],
      currentPlaylist: null,
      isPlaying: false,
      currentIndex: 0,
      openTabs: [],
      activeTabId: null,
      error: null,
    });
    // Clear playlist preferences (project switch will save new playlists)
    const prefs = useUIPreferencesStore.getState();
    prefs.setOpenPlaylistIds([]);
    prefs.setActivePlaylistId(null);
  },

  createPlaylist: async (name, projectId, mode = 'manual') => {
    // Get the organization_id from the project
    const { data: projectData, error: projectError } = await supabase
      .from('gfx_projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();

    if (projectError) {
      throw projectError;
    }

    let organizationId = projectData?.organization_id;

    // If project doesn't have an organization_id, try to get one from user's memberships
    if (!organizationId) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Try to get user's organization membership
        const { data: membershipData } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (membershipData) {
          organizationId = membershipData.organization_id;

          // Also update the project to have this organization_id
          await supabase
            .from('gfx_projects')
            .update({ organization_id: organizationId })
            .eq('id', projectId);
        }
      }
    }

    // If still no organization_id, use dev organization as fallback (for anon/dev mode)
    if (!organizationId) {
      organizationId = DEV_ORG_ID;

      // Also update the project to have this organization_id
      await supabase
        .from('gfx_projects')
        .update({ organization_id: organizationId })
        .eq('id', projectId);
    }

    const { data, error } = await supabase
      .from('pulsar_playlists')
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        name,
        mode,
        default_duration: 5000,
        end_behavior: 'stop',
      })
      .select()
      .single();

    if (error) throw error;

    const newPlaylist: Playlist = {
      id: data.id,
      organizationId: data.organization_id,
      projectId: data.project_id,
      name: data.name,
      description: data.description,
      mode: data.mode,
      defaultDuration: data.default_duration,
      endBehavior: data.end_behavior,
      status: data.status,
      currentPageId: data.current_page_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
    };

    set({ playlists: [...get().playlists, newPlaylist] });
    return newPlaylist;
  },

  updatePlaylist: async (playlistId, updates) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.mode !== undefined) dbUpdates.mode = updates.mode;
    if (updates.defaultDuration !== undefined) dbUpdates.default_duration = updates.defaultDuration;
    if (updates.endBehavior !== undefined) dbUpdates.end_behavior = updates.endBehavior;
    if (updates.channelId !== undefined) dbUpdates.channel_id = updates.channelId;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('pulsar_playlists')
      .update(dbUpdates)
      .eq('id', playlistId);

    if (error) throw error;

    set({
      playlists: get().playlists.map((p) =>
        p.id === playlistId ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
      currentPlaylist:
        get().currentPlaylist?.id === playlistId
          ? { ...get().currentPlaylist!, ...updates, updatedAt: new Date() }
          : get().currentPlaylist,
    });
  },

  deletePlaylist: async (playlistId) => {
    const { error } = await supabase
      .from('pulsar_playlists')
      .delete()
      .eq('id', playlistId);

    if (error) throw error;

    set({
      playlists: get().playlists.filter((p) => p.id !== playlistId),
      currentPlaylist:
        get().currentPlaylist?.id === playlistId ? null : get().currentPlaylist,
    });
  },

  // Tab management
  openTab: (playlist) => {
    const { openTabs } = get();
    const prefs = useUIPreferencesStore.getState();

    if (!openTabs.find((t) => t.id === playlist.id)) {
      const newTabs = [...openTabs, playlist];
      set({ openTabs: newTabs });
      // Save to preferences
      prefs.setOpenPlaylistIds(newTabs.map(t => t.id));
    }
    // Also set as active and select the playlist
    const fullPlaylist = get().playlists.find((p) => p.id === playlist.id);
    set({
      activeTabId: playlist.id,
      currentPlaylist: fullPlaylist || null,
      currentIndex: 0,
      isPlaying: false,
    });
    // Save active tab to preferences
    prefs.setActivePlaylistId(playlist.id);
  },

  closeTab: (playlistId) => {
    const { openTabs, activeTabId } = get();
    const prefs = useUIPreferencesStore.getState();
    const newTabs = openTabs.filter((t) => t.id !== playlistId);
    set({ openTabs: newTabs });

    // Save to preferences
    prefs.setOpenPlaylistIds(newTabs.map(t => t.id));

    // If closing the active tab, switch to another
    if (activeTabId === playlistId) {
      if (newTabs.length > 0) {
        const newActiveId = newTabs[newTabs.length - 1].id;
        const fullPlaylist = get().playlists.find((p) => p.id === newActiveId);
        set({
          activeTabId: newActiveId,
          currentPlaylist: fullPlaylist || null,
        });
        prefs.setActivePlaylistId(newActiveId);
      } else {
        set({ activeTabId: null, currentPlaylist: null });
        prefs.setActivePlaylistId(null);
      }
    }
  },

  setActiveTab: (playlistId) => {
    const prefs = useUIPreferencesStore.getState();

    if (!playlistId) {
      set({ activeTabId: null, currentPlaylist: null });
      prefs.setActivePlaylistId(null);
      return;
    }
    const fullPlaylist = get().playlists.find((p) => p.id === playlistId);
    set({
      activeTabId: playlistId,
      currentPlaylist: fullPlaylist || null,
      currentIndex: 0,
      isPlaying: false,
    });
    // Save to preferences
    prefs.setActivePlaylistId(playlistId);
  },

  play: () => {
    set({ isPlaying: true });
    // TODO: Start timed playback timer
  },

  pause: () => {
    set({ isPlaying: false });
    // TODO: Pause timed playback timer
  },

  stop: () => {
    set({ isPlaying: false, currentIndex: 0 });
    // TODO: Stop and reset timed playback
  },

  next: () => {
    // TODO: Implement next page logic
  },

  previous: () => {
    // TODO: Implement previous page logic
  },

  goToPage: (_pageId: string) => {
    // TODO: Implement go to specific page
  },

  setMode: async (mode) => {
    const playlist = get().currentPlaylist;
    if (!playlist) return;
    await get().updatePlaylist(playlist.id, { mode });
  },

  setEndBehavior: async (behavior) => {
    const playlist = get().currentPlaylist;
    if (!playlist) return;
    await get().updatePlaylist(playlist.id, { endBehavior: behavior });
  },

  setDefaultDuration: async (duration) => {
    const playlist = get().currentPlaylist;
    if (!playlist) return;
    await get().updatePlaylist(playlist.id, { defaultDuration: duration });
  },

  setChannelId: async (channelId) => {
    const playlist = get().currentPlaylist;
    if (!playlist) return;
    await get().updatePlaylist(playlist.id, { channelId: channelId || undefined });
  },

  setCurrentIndex: (index) => {
    set({ currentIndex: index });
  },
}));
