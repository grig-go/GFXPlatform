// Layer Descriptions API - for managing descriptions of map layers
import { projectId, publicAnonKey } from './supabase/info';

export interface LayerDescriptions {
  elections: string;
  population: string;
  wxRadar: string;
  stateInfo: string;
  aiInfra: string;
  worldCup: string;
}

const KV_KEY_PREFIX = 'layer_description_';

/**
 * Load all layer descriptions from KV store
 */
export async function loadLayerDescriptions(): Promise<LayerDescriptions> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/map_data/layer-descriptions`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load layer descriptions: ${errorText}`);
    }

    const data = await response.json();
    return data.descriptions || {
      elections: '',
      population: '',
      wxRadar: '',
      stateInfo: '',
      aiInfra: '',
      worldCup: ''
    };
  } catch (error) {
    console.error('[layerDescriptionsApi] Error loading layer descriptions:', error);
    // Return empty descriptions on error
    return {
      elections: '',
      population: '',
      wxRadar: '',
      stateInfo: '',
      aiInfra: '',
      worldCup: ''
    };
  }
}

/**
 * Save all layer descriptions to KV store
 */
export async function saveLayerDescriptions(descriptions: LayerDescriptions): Promise<void> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/map_data/layer-descriptions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ descriptions }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save layer descriptions: ${errorText}`);
    }

    console.log('[layerDescriptionsApi] Successfully saved layer descriptions');
  } catch (error) {
    console.error('[layerDescriptionsApi] Error saving layer descriptions:', error);
    throw error;
  }
}