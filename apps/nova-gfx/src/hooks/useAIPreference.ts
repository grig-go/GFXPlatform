import { useState, useEffect } from 'react';

const AI_ENABLED_KEY = 'nova-ai-enabled';

export function useAIPreference() {
  // Default to true (enabled)
  const [aiEnabled, setAiEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(AI_ENABLED_KEY);
    if (stored === null) {
      // First time - default to enabled
      return true;
    }
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(AI_ENABLED_KEY, String(aiEnabled));
  }, [aiEnabled]);

  const setAiEnabled = (enabled: boolean) => {
    setAiEnabledState(enabled);
  };

  const toggleAi = () => {
    setAiEnabledState(prev => !prev);
  };

  return { aiEnabled, setAiEnabled, toggleAi };
}



