// Global Prompt API - uses KV store for persistence
const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;
const GLOBAL_PROMPT_KEY = 'fusion:ai:global-prompt';

/**
 * Save global prompt to KV store
 */
export async function saveGlobalPrompt(prompt: string): Promise<void> {
  try {
    console.log('[globalPromptApi] Saving global prompt, length:', prompt.length);
    
    const response = await fetch(
      `${FUNCTIONS_URL}/map_data/kv/${GLOBAL_PROMPT_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ value: prompt })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to save global prompt: ${error.error || response.statusText}`);
    }

    console.log('[globalPromptApi] ✅ Global prompt saved successfully');
  } catch (error) {
    console.error('[globalPromptApi] Error saving global prompt:', error);
    throw error;
  }
}

/**
 * Load global prompt from KV store
 */
export async function loadGlobalPrompt(): Promise<string> {
  try {
    console.log('[globalPromptApi] Loading global prompt...');
    
    const response = await fetch(
      `${FUNCTIONS_URL}/map_data/kv/${GLOBAL_PROMPT_KEY}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );

    if (!response.ok) {
      // If not found, return empty string
      if (response.status === 404) {
        console.log('[globalPromptApi] No global prompt found (404), returning empty string');
        return '';
      }
      const error = await response.json();
      throw new Error(`Failed to load global prompt: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    // The KV endpoint returns { value: <stored_value> }
    // If the stored value is a string, use it directly
    // If it's wrapped in another object, extract it
    const prompt = typeof data?.value === 'string' ? data.value : (data?.value?.value || '');
    
    console.log('[globalPromptApi] ✅ Global prompt loaded successfully, length:', prompt.length);
    return prompt;
  } catch (error) {
    console.error('[globalPromptApi] Error loading global prompt:', error);
    // Return empty string on error to avoid breaking the app
    return '';
  }
}