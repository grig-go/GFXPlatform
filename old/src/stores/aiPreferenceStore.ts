import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AIPreferenceState {
  aiEnabled: boolean;
  setAiEnabled: (enabled: boolean) => void;
  toggleAi: () => void;
}

export const useAIPreferenceStore = create<AIPreferenceState>()(
  persist(
    (set) => ({
      aiEnabled: true, // Default to enabled
      setAiEnabled: (enabled: boolean) => set({ aiEnabled: enabled }),
      toggleAi: () => set((state) => ({ aiEnabled: !state.aiEnabled })),
    }),
    {
      name: 'nova-ai-preference', // localStorage key
    }
  )
);





