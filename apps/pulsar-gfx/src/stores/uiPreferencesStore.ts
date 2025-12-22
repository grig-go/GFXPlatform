import { create } from 'zustand';
import { supabase } from '@emergent-platform/supabase-client';
import { useAuthStore } from './authStore';

/**
 * UI Preferences Store
 *
 * Persists user UI preferences to Supabase database.
 * Preferences are loaded on app startup and saved on change.
 *
 * Current preferences:
 * - lastProjectId: The last selected project
 * - openPlaylistIds: Array of playlist IDs that were open as tabs
 * - activePlaylistId: The currently active playlist tab
 * - selectedChannelId: The last selected channel
 *
 * Future preferences to consider:
 * - Panel sizes/layouts
 * - Theme preferences
 * - Sort preferences
 * - Filter preferences
 * - Collapsed/expanded states
 */

interface UIPreferences {
  // Project & Playlist state
  lastProjectId: string | null;
  openPlaylistIds: string[];
  activePlaylistId: string | null;
  selectedChannelId: string | null;

  // Panel visibility
  showPlayoutControls: boolean;
  showPreview: boolean;
  showContentEditor: boolean;
}

interface UIPreferencesStore extends UIPreferences {
  // Loading state
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  loadPreferences: () => Promise<void>;
  setLastProjectId: (projectId: string | null) => void;
  setOpenPlaylistIds: (playlistIds: string[]) => void;
  addOpenPlaylist: (playlistId: string) => void;
  removeOpenPlaylist: (playlistId: string) => void;
  setActivePlaylistId: (playlistId: string | null) => void;
  setSelectedChannelId: (channelId: string | null) => void;

  // Panel visibility
  setShowPlayoutControls: (show: boolean) => void;
  setShowPreview: (show: boolean) => void;
  setShowContentEditor: (show: boolean) => void;
  togglePlayoutControls: () => void;
  togglePreview: () => void;
  toggleContentEditor: () => void;

  // Utility
  resetPreferences: () => void;
}

const DEFAULT_PREFERENCES: UIPreferences = {
  lastProjectId: null,
  openPlaylistIds: [],
  activePlaylistId: null,
  selectedChannelId: null,
  showPlayoutControls: true,
  showPreview: true,
  showContentEditor: true,
};

// Debounce helper for saving preferences
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 500;

// Track pending preference updates to batch them
let pendingUpdates: Partial<UIPreferences> = {};

// Track the loading promise to prevent race conditions
// This MUST be set synchronously before any await to prevent race conditions
let loadingPromise: Promise<void> | null = null;

// Save preferences to Supabase (debounced)
const savePreferencesToDB = async (preferences: UIPreferences, changedField?: keyof UIPreferences) => {
  // Track which field changed so we only update that field
  if (changedField) {
    pendingUpdates[changedField] = preferences[changedField] as any;
  }

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    try {
      // Wait for auth to be initialized AND have an access token before saving
      const authState = useAuthStore.getState();
      if (!authState.isInitialized || !authState.accessToken) {
        // Wait up to 5 seconds for auth to initialize with a valid session
        let waited = 0;
        while (waited < 5000) {
          const state = useAuthStore.getState();
          if (state.isInitialized && state.accessToken) break;
          await new Promise(resolve => setTimeout(resolve, 100));
          waited += 100;
        }
      }

      // Get user and access token from auth store
      const currentAuthState = useAuthStore.getState();
      const authUser = currentAuthState.user;
      const accessToken = currentAuthState.accessToken;

      if (!authUser || !accessToken) {
        pendingUpdates = {};
        return;
      }

      const userId = authUser.id;

      // Map store fields to DB column names
      const fieldMapping: Record<keyof UIPreferences, string> = {
        lastProjectId: 'last_project_id',
        openPlaylistIds: 'open_playlist_ids',
        activePlaylistId: 'active_playlist_id',
        selectedChannelId: 'selected_channel_id',
        showPlayoutControls: 'show_playout_controls',
        showPreview: 'show_preview',
        showContentEditor: 'show_content_editor',
      };

      // Capture pending updates before clearing
      const updatesToApply = { ...pendingUpdates };
      pendingUpdates = {};

      if (Object.keys(updatesToApply).length === 0) {
        return;
      }

      // Check if preferences row exists for this user
      const { data: existingRow, error: checkError } = await supabase
        .from('pulsar_user_preferences')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        return;
      }

      if (existingRow) {
        // UPDATE existing row - only update changed fields
        const updateData: Record<string, any> = {};
        for (const [field, value] of Object.entries(updatesToApply)) {
          const dbField = fieldMapping[field as keyof UIPreferences];
          if (dbField) {
            updateData[dbField] = value;
          }
        }

        await supabase
          .from('pulsar_user_preferences')
          .update(updateData)
          .eq('user_id', userId)
          .select();
      } else {
        // INSERT new row with defaults + changed fields
        const insertData: Record<string, any> = {
          user_id: userId,
          // Defaults
          open_playlist_ids: [],
          show_playout_controls: true,
          show_preview: true,
          show_content_editor: true,
        };

        // Apply the changed fields
        for (const [field, value] of Object.entries(updatesToApply)) {
          const dbField = fieldMapping[field as keyof UIPreferences];
          if (dbField) {
            insertData[dbField] = value;
          }
        }

        await supabase
          .from('pulsar_user_preferences')
          .insert(insertData)
          .select();
      }
    } catch {
      pendingUpdates = {};
    }
  }, SAVE_DEBOUNCE_MS);
};

export const useUIPreferencesStore = create<UIPreferencesStore>()((set, get) => ({
  ...DEFAULT_PREFERENCES,
  isLoading: false,
  isLoaded: false,
  error: null,

  loadPreferences: async () => {
    // If already loaded, return immediately
    if (get().isLoaded) {
      return;
    }

    // If already loading, wait for the existing promise
    // CRITICAL: This check must happen BEFORE we create a new promise
    if (loadingPromise) {
      return loadingPromise;
    }

    // Set loading state
    set({ isLoading: true, error: null });

    // CRITICAL: Create and assign the promise SYNCHRONOUSLY before any await
    // This prevents React StrictMode double-render from creating two separate loads
    loadingPromise = (async () => {
      try {
        // Wait for auth to be initialized AND have an access token before loading preferences
        const authState = useAuthStore.getState();
        if (!authState.isInitialized || !authState.accessToken) {
          // Wait up to 5 seconds for auth to initialize with a valid session
          let waited = 0;
          while (waited < 5000) {
            const state = useAuthStore.getState();
            if (state.isInitialized && state.accessToken) break;
            await new Promise(resolve => setTimeout(resolve, 100));
            waited += 100;
          }
        }

        // Get user and access token from auth store
        const currentAuthState = useAuthStore.getState();
        const authUser = currentAuthState.user;
        const accessToken = currentAuthState.accessToken;

        if (!authUser || !accessToken) {
          set({ isLoading: false, isLoaded: true });
          return;
        }

        const { data, error } = await supabase
          .from('pulsar_user_preferences')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No preferences found, use defaults
            set({ isLoading: false, isLoaded: true });
            return;
          }
          throw error;
        }

        if (data) {
          set({
            lastProjectId: data.last_project_id,
            openPlaylistIds: data.open_playlist_ids || [],
            activePlaylistId: data.active_playlist_id,
            selectedChannelId: data.selected_channel_id,
            showPlayoutControls: data.show_playout_controls ?? true,
            showPreview: data.show_preview ?? true,
            showContentEditor: data.show_content_editor ?? true,
            isLoading: false,
            isLoaded: true,
          });
        } else {
          set({ isLoading: false, isLoaded: true });
        }
      } catch {
        set({ error: 'Failed to load preferences', isLoading: false, isLoaded: true });
      } finally {
        // Clear the loading promise so future calls can reload if needed
        loadingPromise = null;
      }
    })();

    return loadingPromise;
  },

  setLastProjectId: (projectId) => {
    set({ lastProjectId: projectId });
    savePreferencesToDB(get(), 'lastProjectId');
  },

  setOpenPlaylistIds: (playlistIds) => {
    set({ openPlaylistIds: playlistIds });
    savePreferencesToDB(get(), 'openPlaylistIds');
  },

  addOpenPlaylist: (playlistId) => {
    const current = get().openPlaylistIds;
    if (!current.includes(playlistId)) {
      set({ openPlaylistIds: [...current, playlistId] });
      savePreferencesToDB(get(), 'openPlaylistIds');
    }
  },

  removeOpenPlaylist: (playlistId) => {
    const current = get().openPlaylistIds;
    const activeId = get().activePlaylistId;
    const newList = current.filter(id => id !== playlistId);

    // If we're removing the active playlist, select another one
    const newActiveId = activeId === playlistId
      ? (newList.length > 0 ? newList[newList.length - 1] : null)
      : activeId;

    set({
      openPlaylistIds: newList,
      activePlaylistId: newActiveId
    });
    // Both fields changed
    savePreferencesToDB(get(), 'openPlaylistIds');
    savePreferencesToDB(get(), 'activePlaylistId');
  },

  setActivePlaylistId: (playlistId) => {
    set({ activePlaylistId: playlistId });
    // Also ensure it's in the open list
    if (playlistId) {
      const current = get().openPlaylistIds;
      if (!current.includes(playlistId)) {
        set({ openPlaylistIds: [...current, playlistId] });
        savePreferencesToDB(get(), 'openPlaylistIds');
      }
    }
    savePreferencesToDB(get(), 'activePlaylistId');
  },

  setSelectedChannelId: (channelId) => {
    set({ selectedChannelId: channelId });
    savePreferencesToDB(get(), 'selectedChannelId');
  },

  // Panel visibility
  setShowPlayoutControls: (show) => {
    set({ showPlayoutControls: show });
    savePreferencesToDB(get(), 'showPlayoutControls');
  },
  setShowPreview: (show) => {
    set({ showPreview: show });
    savePreferencesToDB(get(), 'showPreview');
  },
  setShowContentEditor: (show) => {
    set({ showContentEditor: show });
    savePreferencesToDB(get(), 'showContentEditor');
  },

  togglePlayoutControls: () => {
    set((state) => ({ showPlayoutControls: !state.showPlayoutControls }));
    savePreferencesToDB(get(), 'showPlayoutControls');
  },
  togglePreview: () => {
    set((state) => ({ showPreview: !state.showPreview }));
    savePreferencesToDB(get(), 'showPreview');
  },
  toggleContentEditor: () => {
    set((state) => ({ showContentEditor: !state.showContentEditor }));
    savePreferencesToDB(get(), 'showContentEditor');
  },

  resetPreferences: () => {
    set(DEFAULT_PREFERENCES);
    // Reset all fields
    Object.keys(DEFAULT_PREFERENCES).forEach(key => {
      savePreferencesToDB(get(), key as keyof UIPreferences);
    });
  },
}));

// Export helper for waiting for preferences to load
export const waitForPreferences = (): Promise<void> => {
  return new Promise((resolve) => {
    const state = useUIPreferencesStore.getState();
    if (state.isLoaded) {
      resolve();
      return;
    }

    const unsubscribe = useUIPreferencesStore.subscribe((newState) => {
      if (newState.isLoaded) {
        unsubscribe();
        resolve();
      }
    });
  });
};
