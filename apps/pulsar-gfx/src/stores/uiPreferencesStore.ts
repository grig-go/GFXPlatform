import { create } from 'zustand';
import { useAuthStore } from './authStore';

// Edge function URL for user preferences (bypasses stale Supabase client)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const PREFERENCES_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/pulsar-user-preferences`;

/**
 * UI Preferences Store
 *
 * Persists user UI preferences to Supabase database via edge function.
 * Uses edge function to avoid stale connection issues with Supabase client.
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

// Save preferences to Supabase via edge function (debounced)
// Uses edge function to bypass stale Supabase client connections
const savePreferencesToDB = async (preferences: UIPreferences, changedField?: keyof UIPreferences) => {
  // Track which field changed so we only update that field
  if (changedField) {
    pendingUpdates[changedField] = preferences[changedField] as any;
    console.log('[uiPreferencesStore] Queuing preference update:', changedField, '=', preferences[changedField]);
  }

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    try {
      // Get user from auth store
      const authUser = useAuthStore.getState().user;

      if (!authUser) {
        console.warn('[uiPreferencesStore] No auth user, skipping save');
        pendingUpdates = {};
        return;
      }

      const userId = authUser.id;

      // Capture pending updates before clearing
      const updatesToApply = { ...pendingUpdates };
      pendingUpdates = {};

      if (Object.keys(updatesToApply).length === 0) {
        return;
      }

      console.log('[uiPreferencesStore] Saving via edge function:', updatesToApply);

      // Use PATCH to update specific fields via edge function
      const response = await fetch(`${PREFERENCES_FUNCTION_URL}?user_id=${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(updatesToApply),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[uiPreferencesStore] Edge function error:', result);
      } else {
        console.log('[uiPreferencesStore] Preferences saved successfully via edge function');
      }
    } catch (err) {
      console.error('[uiPreferencesStore] Save error:', err);
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
        // Wait for auth to be initialized before loading preferences
        const authState = useAuthStore.getState();
        if (!authState.isInitialized) {
          // Wait up to 5 seconds for auth to initialize
          let waited = 0;
          while (waited < 5000) {
            const state = useAuthStore.getState();
            if (state.isInitialized) break;
            await new Promise(resolve => setTimeout(resolve, 100));
            waited += 100;
          }
        }

        // Get user from auth store
        const authUser = useAuthStore.getState().user;

        if (!authUser) {
          console.log('[uiPreferencesStore] No auth user, using defaults');
          set({ isLoading: false, isLoaded: true });
          return;
        }

        console.log('[uiPreferencesStore] Loading preferences via edge function for user:', authUser.id);

        // Use edge function to load preferences (bypasses stale Supabase client)
        const response = await fetch(`${PREFERENCES_FUNCTION_URL}?user_id=${authUser.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('[uiPreferencesStore] Edge function error:', result);
          throw new Error(result.error || 'Failed to load preferences');
        }

        const data = result.data;

        if (data) {
          console.log('[uiPreferencesStore] Loaded preferences:', {
            lastProjectId: data.last_project_id,
            openPlaylistIds: data.open_playlist_ids,
            activePlaylistId: data.active_playlist_id,
          });
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
          console.log('[uiPreferencesStore] No preferences found, using defaults');
          set({ isLoading: false, isLoaded: true });
        }
      } catch (err) {
        console.error('[uiPreferencesStore] Load failed:', err);
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
