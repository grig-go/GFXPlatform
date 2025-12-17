// AI Models API - for fetching and storing model lists

import { fetchOpenAIModels } from './openaiApi';
import { fetchGeminiModels } from './geminiApi';
import type { AIProvider } from './aiProviderSettings';

const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const API_URL = `${supabaseUrl}/functions/v1/map_data`;

/**
 * Fetch models from the AI provider and save to backend
 * @param provider - The AI provider ('openai' or 'gemini')
 * @param apiKey - The API key for the provider
 * @returns The list of models
 */
export async function fetchAndSaveModels(
  provider: AIProvider,
  apiKey: string
): Promise<Array<{ value: string; label: string }>> {
  try {
    console.log(`[aiModelsApi] Fetching models from ${provider}...`);
    
    // Fetch models from the provider
    let models: Array<{ value: string; label: string }>;
    if (provider === 'openai') {
      models = await fetchOpenAIModels(apiKey);
    } else if (provider === 'gemini') {
      models = await fetchGeminiModels(apiKey);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    // Save models to backend
    const response = await fetch(`${API_URL}/ai/models/${provider}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ models }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save models');
    }
    
    console.log(`[aiModelsApi] ✅ Successfully fetched and saved ${models.length} models for ${provider}`);
    return models;
    
  } catch (error: any) {
    console.error('[aiModelsApi] Error fetching and saving models:', error);
    throw error;
  }
}

/**
 * Get saved models from backend
 * @param provider - The AI provider ('openai' or 'gemini')
 * @returns The list of models or null if not found
 */
export async function getSavedModels(
  provider: AIProvider
): Promise<{ models: Array<{ value: string; label: string }>; updatedAt: string } | null> {
  try {
    console.log(`[aiModelsApi] Getting saved models for ${provider}...`);
    
    const response = await fetch(`${API_URL}/ai/models/${provider}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[aiModelsApi] No saved models found for ${provider}`);
        return null;
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to get models');
    }
    
    const data = await response.json();
    console.log(`[aiModelsApi] ✅ Retrieved ${data.models?.length || 0} saved models for ${provider}`);
    return data;
    
  } catch (error: any) {
    console.error('[aiModelsApi] Error getting saved models:', error);
    throw error;
  }
}