import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  // Panel visibility
  showPlayoutControls: boolean;
  showPreview: boolean;
  showContentEditor: boolean;

  // Panel actions
  togglePlayoutControls: () => void;
  togglePreview: () => void;
  toggleContentEditor: () => void;
  setPlayoutControls: (show: boolean) => void;
  setPreview: (show: boolean) => void;
  setContentEditor: (show: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Default visibility - Playout controls hidden by default
      showPlayoutControls: false,
      showPreview: true,
      showContentEditor: true,

      // Toggle actions
      togglePlayoutControls: () =>
        set((state) => ({ showPlayoutControls: !state.showPlayoutControls })),
      togglePreview: () =>
        set((state) => ({ showPreview: !state.showPreview })),
      toggleContentEditor: () =>
        set((state) => ({ showContentEditor: !state.showContentEditor })),

      // Set actions
      setPlayoutControls: (show) => set({ showPlayoutControls: show }),
      setPreview: (show) => set({ showPreview: show }),
      setContentEditor: (show) => set({ showContentEditor: show }),
    }),
    {
      name: 'pulsar-ui-settings',
    }
  )
);
