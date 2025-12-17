import { projectId, publicAnonKey } from './supabase/info';

export interface PopulationFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    GEOID: string;
    name: string;
    POP: number;
  };
}

export interface PopulationData {
  type: 'FeatureCollection';
  features: PopulationFeature[];
}

// Fetch population data (will return cached data if available)
export async function fetchPopulationData(): Promise<PopulationData | null> {
  try {
    console.log('Fetching population data from server...');
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/map_data/population`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      // If data doesn't exist, trigger fetch from Census API
      if (response.status === 404) {
        console.log('Population data not found, fetching from Census API...');
        return await initializePopulationData();
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Fetched population data with ${data.features?.length || 0} counties`);
    return data;
  } catch (error) {
    console.error('Error fetching population data:', error);
    return null;
  }
}

// Initialize population data by fetching from Census API (with fallback to sample data)
export async function initializePopulationData(): Promise<PopulationData | null> {
  try {
    console.log('Initializing population data from Census API...');
    
    // Try to fetch full Census data first
    const fetchResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/map_data/population/fetch`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (fetchResponse.ok) {
      const fetchResult = await fetchResponse.json();
      console.log('✅ Full Census data initialized:', fetchResult.message);
      return await fetchPopulationData();
    }

    // If Census API fails, fall back to sample data
    console.log('Census API failed, falling back to sample data...');
    const seedResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/map_data/population/seed`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!seedResponse.ok) {
      const errorData = await seedResponse.json().catch(() => ({}));
      throw new Error(`Failed to initialize population data: ${errorData.error || 'Unknown error'}`);
    }

    const seedResult = await seedResponse.json();
    console.log('✅ Sample population data initialized:', seedResult.message);
    
    // Fetch and return the seeded data
    return await fetchPopulationData();
  } catch (error) {
    console.error('❌ Error initializing population data:', error);
    return null;
  }
}