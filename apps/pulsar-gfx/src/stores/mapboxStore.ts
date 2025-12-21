/**
 * Mapbox Store
 * Centralized store for Mapbox API key management
 *
 * The Mapbox API key is fetched from the backend data_providers table
 * and cached for use by all map elements across the application.
 */

import { create } from 'zustand';
import { getMapboxApiKey } from '@/services/dataProviderService';

// Fallback key for development/testing (will be used if backend fetch fails)
const DEV_MAPBOX_KEY = 'pk.eyJ1IjoiZW1lcmdlbnRzb2x1dGlvbnMiLCJhIjoiY21mbGJuanZ1MDNhdDJqcTU1cHVjcWJycCJ9.Tk2txI10-WExxSoPnHlu_g';

interface MapboxState {
  apiKey: string;
  isLoading: boolean;
  isFromBackend: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchApiKey: () => Promise<string>;
  clearCache: () => void;
}

export const useMapboxStore = create<MapboxState>((set, get) => ({
  apiKey: DEV_MAPBOX_KEY,
  isLoading: false,
  isFromBackend: false,
  error: null,
  lastFetched: null,

  fetchApiKey: async () => {
    const state = get();

    // If already loading, wait for current fetch
    if (state.isLoading) {
      // Wait a bit and return current key
      await new Promise((resolve) => setTimeout(resolve, 100));
      return get().apiKey;
    }

    // If recently fetched (within 5 minutes), use cached
    if (state.lastFetched && Date.now() - state.lastFetched < 5 * 60 * 1000) {
      console.log('[MapboxStore] Using cached API key');
      return state.apiKey;
    }

    set({ isLoading: true, error: null });

    try {
      console.log('[MapboxStore] Fetching Mapbox API key from backend...');
      const key = await getMapboxApiKey();

      if (key) {
        console.log('[MapboxStore] Successfully fetched API key from backend');
        set({
          apiKey: key,
          isFromBackend: true,
          isLoading: false,
          lastFetched: Date.now(),
        });
        return key;
      } else {
        console.warn('[MapboxStore] Backend returned no key, using fallback');
        set({
          apiKey: DEV_MAPBOX_KEY,
          isFromBackend: false,
          isLoading: false,
          error: 'Could not fetch from backend',
          lastFetched: Date.now(),
        });
        return DEV_MAPBOX_KEY;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[MapboxStore] Failed to fetch API key:', errorMessage);
      set({
        apiKey: DEV_MAPBOX_KEY,
        isFromBackend: false,
        isLoading: false,
        error: errorMessage,
        lastFetched: Date.now(),
      });
      return DEV_MAPBOX_KEY;
    }
  },

  clearCache: () => {
    set({
      lastFetched: null,
      error: null,
    });
  },
}));

/**
 * Get the current Mapbox API key (synchronous)
 * Returns the cached key or fallback - use fetchApiKey() to ensure latest
 */
export function getMapboxKey(): string {
  return useMapboxStore.getState().apiKey;
}

/**
 * Initialize Mapbox key fetch
 * Call this early in app startup to pre-fetch the key
 */
export async function initializeMapboxKey(): Promise<string> {
  return useMapboxStore.getState().fetchApiKey();
}
