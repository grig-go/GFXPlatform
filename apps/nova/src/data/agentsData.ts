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
  const startTime = performance.now();
  console.log('[getAgentsData] 🚀 Starting agents count fetch...');

  try {
    const { data, error } = await supabase
      .from('api_endpoints')
      .select('id, active');

    const queryDuration = performance.now() - startTime;

    if (error) {
      console.error(`[getAgentsData] ❌ Query failed after ${queryDuration.toFixed(0)}ms:`, error);
      throw error;
    }

    const totalCount = data?.length || 0;
    const activeCount = data?.filter((agent: any) => agent.active).length || 0;

    console.log(`[getAgentsData] ✅ Fetched in ${queryDuration.toFixed(0)}ms:`, { totalCount, activeCount });

    return {
      totalCount,
      activeCount,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    const errorDuration = performance.now() - startTime;
    console.error(`[getAgentsData] ❌ Error after ${errorDuration.toFixed(0)}ms:`, error);
    throw error;
  }
}

// Initialize on first import
export const initializeAgentsData = async (): Promise<AgentsData> => {
  if (dataLoadPromise) {
    console.log('[initializeAgentsData] ⏳ Already loading, returning existing promise');
    return dataLoadPromise;
  }

  const startTime = performance.now();
  console.log('[initializeAgentsData] 🚀 Starting initialization...');

  dataLoadPromise = (async () => {
    try {
      isAgentsDataLoading = true;
      agentsDataError = null;

      const data = await getAgentsData();
      agentsData = data;

      const totalDuration = performance.now() - startTime;
      console.log(`[initializeAgentsData] ✅ Completed in ${totalDuration.toFixed(0)}ms:`, agentsData);
      isAgentsDataLoading = false;

      // Notify callback if set
      if (onDataChangeCallback) {
        onDataChangeCallback(agentsData);
      }

      return agentsData;
    } catch (error) {
      const errorDuration = performance.now() - startTime;
      console.error(`[initializeAgentsData] ❌ Failed after ${errorDuration.toFixed(0)}ms:`, error);
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
