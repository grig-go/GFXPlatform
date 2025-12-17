import { supabase } from '../utils/supabase/client';

export interface AgentsData {
  totalCount: number;
  activeCount: number;
  lastUpdated: string;
}

// Default data structure
const defaultAgentsData: AgentsData = {
  totalCount: 0,
  activeCount: 0,
  lastUpdated: new Date().toISOString()
};

// Export the agentsData for compatibility with existing code
export let agentsData: AgentsData = defaultAgentsData;

// Loading state
export let isAgentsDataLoading = true;
export let agentsDataError: Error | null = null;

// Promise that resolves when data is loaded
let dataLoadPromise: Promise<AgentsData> | null = null;

// Callback to notify when data changes
let onDataChangeCallback: ((data: AgentsData) => void) | null = null;

export function setOnDataChange(callback: (data: AgentsData) => void) {
  onDataChangeCallback = callback;
}

// Function to fetch agents counts from Supabase
async function getAgentsData(): Promise<AgentsData> {
  try {
    const { data, error } = await supabase
      .from('api_endpoints')
      .select('id, active');

    if (error) {
      console.error('Failed to fetch agents data:', error);
      throw error;
    }

    const totalCount = data?.length || 0;
    const activeCount = data?.filter((agent: any) => agent.active).length || 0;

    return {
      totalCount,
      activeCount,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching agents data:', error);
    throw error;
  }
}

// Initialize on first import
export const initializeAgentsData = async (): Promise<AgentsData> => {
  if (dataLoadPromise) return dataLoadPromise;

  dataLoadPromise = (async () => {
    try {
      console.log('Starting to fetch agents data...');
      isAgentsDataLoading = true;
      agentsDataError = null;

      const data = await getAgentsData();
      agentsData = data;

      console.log('Agents data loaded successfully:', agentsData);
      isAgentsDataLoading = false;

      // Notify callback if set
      if (onDataChangeCallback) {
        onDataChangeCallback(agentsData);
      }

      return agentsData;
    } catch (error) {
      console.error('Failed to initialize agents data:', error);
      agentsDataError = error as Error;
      isAgentsDataLoading = false;

      // Keep the default structure if initialization fails
      agentsData = defaultAgentsData;
      return agentsData;
    }
  })();

  return dataLoadPromise;
};

// Start loading immediately
initializeAgentsData();

// Function to manually refresh the data
export async function refreshAgentsData(): Promise<AgentsData> {
  dataLoadPromise = null; // Clear promise
  return await initializeAgentsData();
}
