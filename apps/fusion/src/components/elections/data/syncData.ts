import {
  fetchPresidentialDataFromSupabase,
  presidentialCache
} from './presidentialElectionStateData';
import {
  fetchPresidentialNationalDataFromSupabase,
  presidentialNationalCache
} from './presidentialElectionNationalData';
import {
  fetchPresidentialCountyDataFromSupabase,
  presidentialCountyCache
} from './presidentialElectionCountyData';
import {
  fetchSenateDataFromSupabase,
  senateCache
} from './senateElectionStateData';
import { 
  fetchSenateCountyDataFromSupabase,
  senateCountyCache
} from './senateElectionCountyData';
import { 
  fetchHouseDistrictDataFromSupabase,
  houseDistrictCache 
} from './houseElectionDistrictData';
import { getAllBopData, BopSummary } from './bopData';
import { PresidentialYear, SenateYear, HouseYear, ElectionType } from './electionData';
import { CURRENT_ELECTION_YEAR } from '../../../utils/constants';

interface UpdateEvent {
  type: ElectionType;
  year: number;
  dataType: 'state' | 'county' | 'district' | 'bop' | 'national';
  data: any;
}

// Event emitter for data updates
class DataUpdateEmitter extends EventTarget {
  emit(event: UpdateEvent) {
    this.dispatchEvent(new CustomEvent('dataUpdate', { detail: event }));
  }
}

export const dataUpdateEmitter = new DataUpdateEmitter();

// Cache for BOP data comparison (since BOP doesn't have its own cache)
let lastBopData: { senate: BopSummary; house: BopSummary } | null = null;

// Helper function to check if BOP data has changed
function hasBopDataChanged(oldData: any, newData: any): boolean {
  return JSON.stringify(oldData) !== JSON.stringify(newData);
}

// Check if a year is a presidential election year
function isPresidentialElectionYear(year: number): boolean {
  return year % 4 === 0 && year >= 1788;
}

// Main sync function
async function syncElectionData() {
  try {
    console.log(`🔄 Starting data sync for year ${CURRENT_ELECTION_YEAR}...`);

    const promises: Promise<void>[] = [];

    // Sync presidential data (only if it's a presidential election year)
    if (isPresidentialElectionYear(CURRENT_ELECTION_YEAR)) {
      // Presidential state data
      promises.push(
        fetchPresidentialDataFromSupabase(CURRENT_ELECTION_YEAR as PresidentialYear).then(freshData => {
          if (freshData && presidentialCache.shouldUpdate(CURRENT_ELECTION_YEAR as PresidentialYear, freshData)) {
            console.log('📊 Presidential state data updated');
            presidentialCache.set(CURRENT_ELECTION_YEAR as PresidentialYear, freshData);
            dataUpdateEmitter.emit({
              type: 'presidential',
              year: CURRENT_ELECTION_YEAR,
              dataType: 'state',
              data: freshData
            });
          }
        }).catch(err => console.error('Error fetching presidential state data:', err))
      );

      // Presidential national data
      promises.push(
        fetchPresidentialNationalDataFromSupabase(CURRENT_ELECTION_YEAR as PresidentialYear).then(freshData => {
          if (freshData && presidentialNationalCache.shouldUpdate(CURRENT_ELECTION_YEAR as PresidentialYear, freshData)) {
            console.log('📊 Presidential national data updated');
            presidentialNationalCache.set(CURRENT_ELECTION_YEAR as PresidentialYear, freshData);
            dataUpdateEmitter.emit({
              type: 'presidential',
              year: CURRENT_ELECTION_YEAR,
              dataType: 'national',
              data: freshData
            });
          }
        }).catch(err => console.error('Error fetching presidential national data:', err))
      );

      // Presidential county data
      promises.push(
        fetchPresidentialCountyDataFromSupabase(CURRENT_ELECTION_YEAR as PresidentialYear).then(freshData => {
          if (freshData && presidentialCountyCache.shouldUpdate(CURRENT_ELECTION_YEAR as PresidentialYear, freshData)) {
            console.log('📊 Presidential county data updated');
            presidentialCountyCache.set(CURRENT_ELECTION_YEAR as PresidentialYear, freshData);
            dataUpdateEmitter.emit({
              type: 'presidential',
              year: CURRENT_ELECTION_YEAR,
              dataType: 'county',
              data: freshData
            });
          }
        }).catch(err => console.error('Error fetching presidential county data:', err))
      );
    }

    // Senate state data
    promises.push(
      fetchSenateDataFromSupabase(CURRENT_ELECTION_YEAR as SenateYear).then(freshData => {
        if (freshData && senateCache.shouldUpdate(CURRENT_ELECTION_YEAR, freshData)) {
          console.log('🏛️ Senate state data updated');
          senateCache.set(CURRENT_ELECTION_YEAR, freshData);
          dataUpdateEmitter.emit({
            type: 'senate',
            year: CURRENT_ELECTION_YEAR,
            dataType: 'state',
            data: freshData
          });
        }
      }).catch(err => console.error('Error fetching senate state data:', err))
    );

    // Senate county data - using the regular getSenateCountyElectionData since it handles caching internally
    promises.push(
      fetchSenateCountyDataFromSupabase(CURRENT_ELECTION_YEAR as SenateYear).then(freshData => {
        if (freshData && senateCountyCache.shouldUpdate(CURRENT_ELECTION_YEAR as SenateYear, freshData)) {
          console.log('📊 Senate county data updated');
          senateCountyCache.set(CURRENT_ELECTION_YEAR as SenateYear, freshData);
          dataUpdateEmitter.emit({
            type: 'senate',
            year: CURRENT_ELECTION_YEAR,
            dataType: 'county',
            data: freshData
          });
        }
      }).catch(err => console.error('Error fetching senate county data:', err))
    );

    // House district data - using the regular getHouseElectionDistrictData since it handles caching internally
    promises.push(
      fetchHouseDistrictDataFromSupabase(CURRENT_ELECTION_YEAR as HouseYear).then(freshData => {
        if (freshData && houseDistrictCache.shouldUpdate(CURRENT_ELECTION_YEAR as HouseYear, freshData)) {
          console.log('📊 House district data updated');
          houseDistrictCache.set(CURRENT_ELECTION_YEAR as HouseYear, freshData);
          dataUpdateEmitter.emit({
            type: 'house',
            year: CURRENT_ELECTION_YEAR,
            dataType: 'district',
            data: freshData
          });
        }
      }).catch(err => console.error('Error fetching house district data:', err))
    );

    // BOP data (Balance of Power) - no cache for BOP data, so we handle it manually
    promises.push(
      getAllBopData(CURRENT_ELECTION_YEAR).then(data => {
        if (data && (!lastBopData || hasBopDataChanged(lastBopData, data))) {
          console.log('⚖️ BOP data updated');
          lastBopData = data;
          dataUpdateEmitter.emit({
            type: 'senate',
            year: CURRENT_ELECTION_YEAR,
            dataType: 'bop',
            data: data.senate
          });
          dataUpdateEmitter.emit({
            type: 'house',
            year: CURRENT_ELECTION_YEAR,
            dataType: 'bop',
            data: data.house
          });
        }
      }).catch(err => console.error('Error fetching BOP data:', err))
    );

    await Promise.all(promises);
    console.log('✅ Data sync completed');

  } catch (error) {
    console.error('❌ Error in data sync:', error);
  }
}

// Initialize sync interval
let syncInterval: NodeJS.Timeout | null = null;

export function startDataSync() {
  // Clear any existing interval
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  console.log(`🚀 Starting data sync service for year ${CURRENT_ELECTION_YEAR}`);

  // Initial sync
  //syncElectionData();

  // Set up interval for every 30 seconds
  syncInterval = setInterval(() => {
    syncElectionData();
  }, 30000);

  return syncInterval;
}

export function stopDataSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('🛑 Data sync service stopped');
  }
}

// Hook for components to use
export function useDataSync(
  electionType: ElectionType,
  year: number,
  onUpdate: (data: any, dataType: string) => void
) {
  if (typeof window === 'undefined') return;

  const handleUpdate = (event: Event) => {
    const customEvent = event as CustomEvent<UpdateEvent>;
    const { type, year: eventYear, dataType, data } = customEvent.detail;

    // Only update if the election type and year match the current election year
    if (type === electionType && eventYear === year && year === CURRENT_ELECTION_YEAR) {
      onUpdate(data, dataType);
    }
  };

  // Subscribe to updates
  dataUpdateEmitter.addEventListener('dataUpdate', handleUpdate);

  // Cleanup function
  return () => {
    dataUpdateEmitter.removeEventListener('dataUpdate', handleUpdate);
  };
}