import { supabase } from '../supabaseClient';

const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const BASE_URL = `${supabaseUrl}/functions/v1/map_settings`;

export interface MapSettings {
  map_style?: string;
  show_map_labels?: boolean;
  projection_type?: string;
  default_latitude?: number;
  default_longitude?: number;
  default_zoom?: number;
  saved_positions?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    zoom: number;
    created_at: string;
  }>;
  additional_settings?: Record<string, any>;
  globe_mode?: boolean;
  map_opacity?: number;
  election_map_opacity?: number;
  atmosphere_enabled?: boolean;
  [key: string]: any;
}

/**
 * Get Authorization header with JWT token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || publicAnonKey;
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': publicAnonKey,
  };
}

/**
 * Load map settings from the backend
 * GET /map_settings
 */
export async function loadMapSettings(): Promise<MapSettings> {
  try {
    console.log('📥 Loading map settings...');
    
    const headers = await getAuthHeaders();
    const response = await fetch(BASE_URL, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to load map settings:', errorText);
      return {};
    }
    
    const result = await response.json();
    console.log('✅ Loaded map settings:', result);
    
    // If isDefault=true, use defaults
    if (result.isDefault) {
      console.log('Using default settings');
      return result.settings || {};
    }
    
    return result.settings || {};
  } catch (error) {
    console.error('❌ Error loading map settings:', error);
    return {};
  }
}

/**
 * Save map settings to the backend
 * POST /map_settings
 * 
 * @param settings - Partial or full settings object. Only changed fields needed.
 */
export async function saveMapSettings(settings: MapSettings): Promise<boolean> {
  try {
    console.log('💾 Saving map settings:', settings);
    
    const headers = await getAuthHeaders();
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to save map settings:', errorText);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Map settings saved successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Error saving map settings:', error);
    return false;
  }
}

/**
 * Save a named map position
 * POST /map_settings/save-position
 */
export async function saveMapPosition(
  name: string,
  latitude: number,
  longitude: number,
  zoom: number
): Promise<boolean> {
  try {
    console.log('💾 Saving map position:', { name, latitude, longitude, zoom });
    
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/save-position`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, latitude, longitude, zoom }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to save position:', errorText);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Position saved successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Error saving position:', error);
    return false;
  }
}

/**
 * Delete a saved map position
 * DELETE /map_settings/position/{id}
 */
export async function deleteMapPosition(positionId: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting map position:', positionId);
    
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/position/${positionId}`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to delete position:', errorText);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Position deleted successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Error deleting position:', error);
    return false;
  }
}