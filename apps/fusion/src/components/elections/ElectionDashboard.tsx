import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  Tag,
  Callout,
  H2,
  H4,
  Icon,
} from '@blueprintjs/core';
import { MapContainer } from './MapContainer';
import { ElectionSidebar } from './ElectionSidebar';
// import { ElectionNavbar } from './ElectionNavbar'; // Hidden - controlled via Sidebar
import { WinnerDashboard } from './WinnerDashboard';
import { DataDashboard } from './DataDashboard';
import { SettingsPanel } from './SettingsPanel';
import { TelestratorCanvas } from './TelestratorCanvas';
import { getElectionData, getCountyElectionData, getDistrictElectionData, ElectionYear, ElectionType } from './data/electionData';
import { stateAbbreviations } from './data/stateData';
import { startDataSync, stopDataSync, useDataSync } from './data/syncData';
import { getAllBopData } from './data/bopData';
import { getPresidentialElectionNationalData } from './data/presidentialElectionNationalData';
import { CURRENT_ELECTION_YEAR } from '../../utils/constants';
import type mapboxgl from 'mapbox-gl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Bug } from 'lucide-react';
import { fetchParties, normalizePartyCode, clearPartyCache } from '../../utils/partyData';

interface HoverInfo {
  state: string;
  x: number;
  y: number;
  featureData?: any;
}

interface SelectedData {
  name: string;
  data: any;
  isCounty: boolean;
}

interface ElectionDashboardProps {
  initialYear?: ElectionYear;
  initialRace?: 'president' | 'senate' | 'house' | 'governor' | 'ag';
  onYearChange?: (year: ElectionYear) => void;
  onRaceChange?: (race: 'president' | 'senate' | 'house' | 'governor' | 'ag') => void;
  mapViewRef?: React.MutableRefObject<mapboxgl.Map | null>;
  electionMapRef?: React.MutableRefObject<mapboxgl.Map | null>;
  selectedDataOptions?: any;
  mapStyle?: 'light' | 'dark' | 'satellite';
  showMapLabels?: boolean;
  globeMode?: boolean;
  atmosphereEnabled?: boolean;
  projection?: 'mercator' | 'albers' | 'equirectangular';
  electionMapOpacity?: number;
  sidebarPosition?: 'left' | 'right';
  isSidebarCollapsed?: boolean;
  syntheticRaceData?: any[];
  isSyntheticMode?: boolean;
  onSelectedDataChange?: (data: any) => void;
}

export default function ElectionDashboard({
  initialYear = 2024,
  initialRace = 'president',
  onYearChange,
  onRaceChange,
  mapViewRef,
  electionMapRef,
  selectedDataOptions,
  mapStyle = 'light',
  showMapLabels = true,
  globeMode = false,
  atmosphereEnabled = false,
  projection = 'mercator',
  electionMapOpacity = 1.0,
  sidebarPosition = 'left',
  isSidebarCollapsed = false,
  syntheticRaceData,
  isSyntheticMode = false,
  onSelectedDataChange
}: ElectionDashboardProps) {
  console.log('🔄 ElectionDashboard received mapViewRef:', !!mapViewRef);
  console.log('📊 selectedDataOptions:', selectedDataOptions);
  // Map race types from Sidebar format to ElectionType format
  const mapRaceToElectionType = (race: 'president' | 'senate' | 'house' | 'governor' | 'ag'): ElectionType => {
    if (race === 'president') return 'presidential';
    if (race === 'senate') return 'senate';
    if (race === 'house') return 'house';
    // Default to presidential for unsupported types
    return 'presidential';
  };

  const mapElectionTypeToRace = (type: ElectionType): 'president' | 'senate' | 'house' | 'governor' | 'ag' => {
    if (type === 'presidential') return 'president';
    if (type === 'senate') return 'senate';
    if (type === 'house') return 'house';
    return 'president';
  };

  const [selectedYear, setSelectedYear] = useState<ElectionYear>(initialYear);
  const [selectedType, setSelectedType] = useState<ElectionType>(mapRaceToElectionType(initialRace));
  const [selectedData, setSelectedData] = useState<SelectedData | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  // const [settingsOpen, setSettingsOpen] = useState(false); // Settings removed with navbar
  const [telestratorEnabled, setTelestratorEnabled] = useState(false);
  const [telestratorColor, setTelestratorColor] = useState('#000000');
  const [currentBopData, setCurrentBopData] = useState<any>(null);
  const [homeClickCount, setHomeClickCount] = useState(0);
  const [winnerDashboardOpenedByUser, setWinnerDashboardOpenedByUser] = useState(true); // Track if user wants it open
  const [winnerDashboardManuallyClosed, setWinnerDashboardManuallyClosed] = useState(false); // Track if user closed it
  const [showDebugDialog, setShowDebugDialog] = useState(false); // Debug dialog state

  // Refs to track current values for callbacks
  const winnerDashboardManuallyClosedRef = useRef(false);
  const winnerDashboardOpenedByUserRef = useRef(true);
  const selectedDataOptionsRef = useRef(selectedDataOptions);

  // Notify parent when selectedData changes
  React.useEffect(() => {
    if (onSelectedDataChange) {
      console.log('📡 ElectionDashboard: selectedData changed, notifying parent:', selectedData);
      onSelectedDataChange(selectedData);
    }
  }, [selectedData, onSelectedDataChange]);

  // Start data sync service on mount
  React.useEffect(() => {
    console.log('🚀 Starting data sync service from ElectionDashboard');
    startDataSync();

    return () => {
      console.log('🛑 Stopping data sync service');
      stopDataSync();
    };
  }, []);

  // Fetch BOP data when year or race type changes (for senate/house)
  React.useEffect(() => {
    // Always fetch BOP data for senate/house races, regardless of year
    if (selectedType === 'senate' || selectedType === 'house') {
      console.log(`🏛️ Fetching BOP data for ${selectedType} ${selectedYear}`);
      getAllBopData(selectedYear).then(bopData => {
        if (bopData) {
          const relevantBopData = selectedType === 'senate' ? bopData.senate : bopData.house;
          console.log(`🏛️ BOP data fetched for ${selectedType}:`, relevantBopData);
          setCurrentBopData(relevantBopData);
        } else {
          console.log(`🏛️ No BOP data available for ${selectedType} ${selectedYear}`);
          setCurrentBopData(null);
        }
      }).catch(err => {
        console.error(`❌ Error fetching BOP data for ${selectedType} ${selectedYear}:`, err);
        setCurrentBopData(null);
      });
    } else {
      // Clear BOP data for presidential races
      setCurrentBopData(null);
    }
  }, [selectedType, selectedYear]);

  // Subscribe to data updates for current election year
  React.useEffect(() => {
    // Only subscribe if we're viewing the current election year
    if (selectedYear !== CURRENT_ELECTION_YEAR) {
      console.log(`Not subscribing to updates: selectedYear (${selectedYear}) !== CURRENT_ELECTION_YEAR (${CURRENT_ELECTION_YEAR})`);
      return;
    }

    console.log(`📡 Subscribing to data updates for ${selectedType} ${selectedYear}`);

    const cleanup = useDataSync(selectedType, selectedYear, (data, dataType) => {
      console.log(`📨 Received ${dataType} update for ${selectedType} ${selectedYear}`);

      // Update the appropriate state based on data type
      if (dataType === 'state') {
        console.log('Updating state-level election data');
        setCurrentElection(data);
      } else if (dataType === 'national') {
        console.log('Updating national-level election data');
        setCurrentNationalElection(data);
      } else if (dataType === 'county') {
        console.log('Updating county-level election data');
        setCurrentCountyElection(data);
      } else if (dataType === 'district') {
        console.log('Updating district-level election data');
        setCurrentDistrictElection(data);
      } else if (dataType === 'bop') {
        console.log('Updating BOP data from sync service');
        setCurrentBopData(data);
      }
    });

    return cleanup;
  }, [selectedType, selectedYear, CURRENT_ELECTION_YEAR]);

  // Clear selected data when election type changes to avoid showing wrong data
  React.useEffect(() => {
    console.log('Election type or year changed, clearing selected data');
    
    // If we have selected data and are switching election types
    if (selectedData) {
      console.log('Selected data exists during election type change:', selectedData);
      console.log(selectedType); 
      
      // If we're switching from a district or county view, we need to switch to state view
      if (selectedData.data.isDistrict || (selectedData.isCounty && selectedType === 'house')) {
        console.log('Switching from district/county to state view');
        
        // Get the state name from the selected data
        let stateName = selectedData.data.stateName || selectedData.data.state_name || selectedData.name;
        
        // Create state-level data
        let stateCode: string | undefined;

        if (selectedData.data.isDistrict) {
          stateCode = selectedData.data.state_id;
          stateName = Object.keys(stateAbbreviations)
            .find(name => stateAbbreviations[name] === stateCode);
        }
        else {
          // First try to find by full state name
          stateCode = Object.keys(stateAbbreviations).find(state => state === stateName);
        }
        
        // If not found, try to find by abbreviation
        if (!stateCode) {
          stateCode = Object.keys(stateAbbreviations).find(
            state => stateAbbreviations[state] === stateName
          );
        }

        console.log('State name for switching:', stateName);
        
        // If still not found, the stateName might already be the full name
        if (!stateCode && stateName) {
          stateCode = stateName;
        }

        console.log('ddddddd');
        console.log(stateCode);
        if (stateCode) {
          console.log('Found state code:', stateCode, 'for state:', stateName);
          
          // Set state-level selected data
          setSelectedData({
            name: stateName,
            data: { name: stateName },
            isCounty: false
          });
        }
      } else if (selectedData && !selectedData.data.isDistrict && !selectedData.isCounty) {
        // If we're switching between election types at state level, maintain the state selection
        console.log('Maintaining state selection during election type switch');
        
        // Keep the same state selected but ensure it's properly formatted
        const stateName = selectedData.name;
        console.log('Maintaining state selection for:', stateName);
        
        setSelectedData({
          name: stateName,
          data: { name: stateName },
          isCounty: false
        });
      }
    }
  }, [selectedType]);

  // Add effect to log when selectedType changes
  React.useEffect(() => {
    console.log('=== SELECTED TYPE CHANGED ===');
    console.log('New selectedType:', selectedType);
    console.log('New selectedYear:', selectedYear);
    console.log('==============================');
  }, [selectedType, selectedYear]);

  const [currentElection, setCurrentElection] = React.useState<any>(null);
  const [currentNationalElection, setCurrentNationalElection] = React.useState<any>(null);
  const [currentCountyElection, setCurrentCountyElection] = React.useState<any>(null);
  const [currentDistrictElection, setCurrentDistrictElection] = React.useState<any>(null);
  const [isLoadingElection, setIsLoadingElection] = React.useState(true);
  const [isLoadingCountyElection, setIsLoadingCountyElection] = React.useState(true);
  const [isLoadingDistrictElection, setIsLoadingDistrictElection] = React.useState(true);

  // Fetch state-level election data when type or year changes
  React.useEffect(() => {
    // Skip fetching if in synthetic mode
    if (isSyntheticMode) {
      console.log('⚡ Synthetic mode active, skipping election data fetch');
      setIsLoadingElection(false);
      // Transform synthetic data to election format if available
      if (syntheticRaceData && syntheticRaceData.length > 0) {
        console.log('🔄 Transforming synthetic data...');
        transformSyntheticDataToElectionFormat(syntheticRaceData).then(transformedData => {
          console.log('✅ Synthetic data transformed successfully!');
          console.log('✅ Transformed data year:', transformedData.year);
          console.log('✅ Transformed data keys:', Object.keys(transformedData));
          setCurrentElection(transformedData);
          console.log('✅ currentElection state updated');
        }).catch(error => {
          console.error('❌ Error transforming synthetic data:', error);
          setCurrentElection(null);
        });
      } else {
        console.log('⚠️ No synthetic race data available');
        setCurrentElection(null);
      }
      return;
    }

    let isCancelled = false;

    console.log('fetchData..........');

    const fetchData = async () => {
      setIsLoadingElection(true);
      try {
        const data = await getElectionData(selectedType, selectedYear);
        console.log('data.....');
        console.log(data);
        if (!isCancelled) {
          setCurrentElection(data);
        }
      } catch (error) {
        console.error('Error updating election data:', error);
        if (!isCancelled) {
          setCurrentElection(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingElection(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [selectedType, selectedYear, isSyntheticMode, syntheticRaceData]);

  // Helper function to transform synthetic race data into election data format
  const transformSyntheticDataToElectionFormat = async (syntheticData: any[]) => {
    const results: any = {};
    const candidates: any = {};
    
    // Extract race name from first race
    // If the name is like "FL 2028", extract just "2028" as the common year
    // If there's a race_name field at the top level, use that instead
    let raceName = 'Synthetic Race';
    let raceYear = 'Synthetic Race';
    if (syntheticData.length > 0) {
      const firstRace = syntheticData[0];
      
      // Check if there's a race_name field (common to all states)
      if (firstRace.race_name) {
        raceName = firstRace.race_name;
        // Try to extract year from race_name
        const yearMatch = firstRace.race_name.match(/(\d{4})/);
        raceYear = yearMatch ? yearMatch[1] : firstRace.race_name;
      } else if (firstRace.name) {
        // Extract year from state-specific name like "FL 2028" -> "2028"
        const nameMatch = firstRace.name.match(/(\d{4})/);
        if (nameMatch) {
          raceYear = nameMatch[1]; // Just the year for header
          raceName = firstRace.name; // Full name for display
        } else {
          raceName = firstRace.name; // Use full name if no year pattern found
          raceYear = firstRace.name;
        }
      }
    }
    
    console.log('🏁 Race name from synthetic data:', raceName);
    
    // Clear party cache to ensure we get fresh colors from database
    // console.log('🗑️ Clearing party cache for synthetic mode...');
    clearPartyCache();
    
    // Fetch real party data from backend
    // console.log('🎨 Fetching party colors from e_parties table...');
    let partiesData: any;
    try {
      partiesData = await fetchParties();
      // console.log('🎨 ✅ Party colors fetched successfully!');
      // console.log('🎨 Party data structure:', JSON.stringify(partiesData, null, 2));
      // console.log('🎨 DEM color from fetch:', partiesData['DEM']?.color_hex);
      // console.log('🎨 REP color from fetch:', partiesData['REP']?.color_hex);
    } catch (error) {
      console.error('🎨 ❌ Error fetching parties, using fallback colors:', error);
      partiesData = {};
    }
    
    // Build parties object using fetched data
    const parties: any = {
      'DEM': {
        name: partiesData['DEM']?.name || 'Democratic',
        color: partiesData['DEM']?.color_hex || '#60a5fa'
      },
      'REP': {
        name: partiesData['REP']?.name || 'Republican', 
        color: partiesData['REP']?.color_hex || '#ef4444'
      },
      'IND': {
        name: partiesData['IND']?.name || 'Independent',
        color: partiesData['IND']?.color_hex || '#a855f7'
      },
      'LIB': {
        name: partiesData['LIB']?.name || 'Libertarian',
        color: partiesData['LIB']?.color_hex || '#f59e0b'
      }
    };
    
    console.log('🎨 Final parties object with colors:');
    console.log('  DEM:', parties['DEM']);
    console.log('  REP:', parties['REP']);
    console.log('  IND:', parties['IND']);
    console.log('  LIB:', parties['LIB']);
    
    console.log('🔥 ABOUT TO PROCESS SYNTHETIC DATA');
    console.log('🔥 syntheticData length:', syntheticData.length);
    console.log('🔥 syntheticData[0] keys:', Object.keys(syntheticData[0]));
    console.log('🔥 syntheticData[0].state_abbr:', syntheticData[0].state_abbr);
    console.log('🔥 syntheticData[0].state:', syntheticData[0].state);
    
    syntheticData.forEach((race, index) => {
      console.log(`🔄 Processing race ${index}: state="${race.state}", state_abbr="${race.state_abbr}"`);
      
      // Get state code - either from state_abbr or by looking up the full state name
      let stateCode = race.state_abbr;
      
      if (!stateCode && race.state) {
        // Look up abbreviation from full state name
        stateCode = stateAbbreviations[race.state];
        console.log(`🔍 Mapped state name "${race.state}" -> "${stateCode}"`);
      }
      
      if (!stateCode) {
        console.log(`❌ SKIPPING race ${index} - NO state_abbr and couldn't map state name! Full race:`, race);
        return;
      }
      
      console.log(`✅ Processing ${stateCode} (${race.state})`);
      
      // DEBUG: Log Illinois data specifically
      if (stateCode === 'IL') {
        console.log('🔍 ILLINOIS SYNTHETIC DATA:', JSON.stringify(race, null, 2));
        console.log('🔍 ILLINOIS candidates array:', race.candidates);
        console.log('🔍 ILLINOIS - Is candidates an array?:', Array.isArray(race.candidates));
        console.log('🔍 ILLINOIS - Candidates length:', race.candidates?.length);
      }
      
      // Build state-specific candidate info from the candidates array
      const stateCandidates: Record<string, any> = {};
      
      console.log(`🔎 ${stateCode}: Checking candidates array...`, {
        hasCandidates: !!race.candidates,
        isArray: Array.isArray(race.candidates),
        length: race.candidates?.length
      });
      
      if (race.candidates && Array.isArray(race.candidates)) {
        console.log(`📋 Processing ${race.candidates.length} candidates for ${stateCode}`);
        race.candidates.forEach((candidate: any) => {
          const party = candidate.metadata?.party || candidate.metadata?.candidate_party;
          const candidateName = candidate.metadata?.candidate_name || 'Unknown';
          const candidatePhoto = candidate.metadata?.headshot || '';
          
          console.log(`  👤 ${stateCode} Candidate: ${candidateName} (${party})`);
          
          // Normalize party code (GOP → REP)
          const normalizedParty = normalizePartyCode(party);
          
          // Map party to candidate ID
          let candId = '';
          if (normalizedParty === 'DEM') {
            candId = 'cand-dem';
            stateCandidates[candId] = { 
              party_code: 'DEM', 
              name: candidateName,
              img: candidatePhoto
            };
            if (!candidates[candId]) {
              candidates[candId] = { 
                party_code: 'DEM', 
                name: candidateName,
                img: candidatePhoto
              };
            }
          } else if (normalizedParty === 'REP') {
            candId = 'cand-rep';
            stateCandidates[candId] = { 
              party_code: 'REP', 
              name: candidateName,
              img: candidatePhoto
            };
            if (!candidates[candId]) {
              candidates[candId] = { 
                party_code: 'REP', 
                name: candidateName,
                img: candidatePhoto
              };
            }
          } else if (normalizedParty === 'IND') {
            candId = 'cand-ind';
            stateCandidates[candId] = { 
              party_code: 'IND', 
              name: candidateName,
              img: candidatePhoto
            };
            if (!candidates[candId]) {
              candidates[candId] = { 
                party_code: 'IND', 
                name: candidateName,
                img: candidatePhoto
              };
            }
          } else if (normalizedParty === 'LIB') {
            candId = 'cand-lib';
            stateCandidates[candId] = { 
              party_code: 'LIB', 
              name: candidateName,
              img: candidatePhoto
            };
            if (!candidates[candId]) {
              candidates[candId] = { 
                party_code: 'LIB', 
                name: candidateName,
                img: candidatePhoto
              };
            }
          }
        });
        
        console.log(`✅ State candidates for ${stateCode}:`, stateCandidates);
      } else {
        console.log(`⚠️ No candidates array for ${stateCode}`);
      }
      
      // Build vote results from candidates array (not top-level fields which may be wrong)
      const voteResults: any = {
        'cand-dem': { votes: 0, percent: 0, winner: false },
        'cand-rep': { votes: 0, percent: 0, winner: false },
        'cand-ind': { votes: 0, percent: 0, winner: false },
        'cand-lib': { votes: 0, percent: 0, winner: false }
      };
      
      // Extract votes from candidates array
      if (race.candidates && Array.isArray(race.candidates)) {
        race.candidates.forEach((candidate: any) => {
          const party = candidate.metadata?.party || candidate.metadata?.candidate_party;
          const normalizedParty = normalizePartyCode(party);
          const votes = candidate.metadata?.metadata?.votes || 0;
          const percent = candidate.metadata?.metadata?.vote_percentage || 0;
          const isWinner = candidate.metadata?.metadata?.winner || false;
          
          console.log(`  📊 ${stateCode} - Party: "${party}" -> "${normalizedParty}", Votes: ${votes}, %: ${percent}`);
          
          if (normalizedParty === 'DEM') {
            voteResults['cand-dem'] = { votes, percent, winner: isWinner };
          } else if (normalizedParty === 'REP') {
            voteResults['cand-rep'] = { votes, percent, winner: isWinner };
          } else if (normalizedParty === 'IND') {
            voteResults['cand-ind'] = { votes, percent, winner: isWinner };
          } else if (normalizedParty === 'LIB') {
            voteResults['cand-lib'] = { votes, percent, winner: isWinner };
          }
        });
      }
      
      console.log(`📊 Vote results for ${stateCode}:`, voteResults);
      
      // Create result entry for this state WITH state-specific candidate info
      results[stateCode] = {
        ...voteResults,
        stateElectoralVotes: race.electoral_votes || race.Electoral_votes || 0,
        // NEW: Store state-specific candidate info
        stateCandidates: Object.keys(stateCandidates).length > 0 ? stateCandidates : undefined
      };
    });
    
    // Add default candidates if not already added
    if (!candidates['cand-dem']) candidates['cand-dem'] = { party_code: 'DEM', name: 'Democrat Candidate' };
    if (!candidates['cand-rep']) candidates['cand-rep'] = { party_code: 'REP', name: 'Republican Candidate' };
    if (!candidates['cand-ind']) candidates['cand-ind'] = { party_code: 'IND', name: 'Independent Candidate' };
    if (!candidates['cand-lib']) candidates['cand-lib'] = { party_code: 'LIB', name: 'Libertarian Candidate' };
    
    console.log('🏁 Returning election data with race name:', raceName);
    console.log('🏁 Total states in results:', Object.keys(results).length);
    console.log('🏁 State codes in results:', Object.keys(results));
    console.log('🏁 IL result:', results['IL']);
    console.log('🏁 Sample results (first 3 states):', Object.fromEntries(Object.entries(results).slice(0, 3)));
    
    return {
      results,
      candidates,
      parties,
      winner: raceName, // Use race name instead of 'Synthetic Race Data'
      year: raceName, // Use full race name for header display
      description: raceName
    };
  };

  // Fetch national-level presidential election data when type or year changes
  React.useEffect(() => {
    // Skip fetching if in synthetic mode
    if (isSyntheticMode) {
      console.log('⚡ Synthetic mode active, skipping national election data fetch');
      setCurrentNationalElection(null);
      return;
    }

    let isCancelled = false;

    const fetchNationalData = async () => {
      if (selectedType === 'presidential') {
        try {
          const data = await getPresidentialElectionNationalData(selectedYear as 2012 | 2016 | 2020 | 2024);
          console.log('National data fetched:', data ? 'SUCCESS' : 'NULL');
          if (!isCancelled) {
            setCurrentNationalElection(data);
          }
        } catch (error) {
          console.error('Error updating national election data:', error);
          if (!isCancelled) {
            setCurrentNationalElection(null);
          }
        }
      } else {
        setCurrentNationalElection(null);
      }
    };

    fetchNationalData();

    return () => {
      isCancelled = true;
    };
  }, [selectedType, selectedYear, isSyntheticMode]);

  // Fetch county-level election data when type or year changes
  React.useEffect(() => {
    // Skip fetching if in synthetic mode
    if (isSyntheticMode) {
      console.log('⚡ Synthetic mode active, skipping county election data fetch');
      setIsLoadingCountyElection(false);
      setCurrentCountyElection(null);
      return;
    }

    let isCancelled = false;

    const fetchCountyData = async () => {
      console.log(`🔵 Starting to fetch county data for ${selectedType} ${selectedYear}...`);
      setIsLoadingCountyElection(true);
      try {
        const data = await getCountyElectionData(selectedType, selectedYear);
        console.log('🔵 County data fetched:', data ? 'SUCCESS' : 'NULL');
        if (data && data.results) {
          console.log('🔵 County data has', Object.keys(data.results).length, 'counties');
        }
        if (!isCancelled) {
          setCurrentCountyElection(data);
          console.log('🔵 County data set to state');
        }
      } catch (error) {
        console.error('🔴 Error updating county election data:', error);
        if (!isCancelled) {
          setCurrentCountyElection(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCountyElection(false);
          console.log('🔵 County data loading finished');
        }
      }
    };

    fetchCountyData();

    return () => {
      isCancelled = true;
    };
  }, [selectedType, selectedYear, isSyntheticMode]);

  // Fetch district-level election data when type or year changes (for house elections)
  React.useEffect(() => {
    // Skip fetching if in synthetic mode
    if (isSyntheticMode) {
      console.log('⚡ Synthetic mode active, skipping district election data fetch');
      setIsLoadingDistrictElection(false);
      setCurrentDistrictElection(null);
      return;
    }

    let isCancelled = false;

    const fetchDistrictData = async () => {
      if (selectedType !== 'house') {
        setCurrentDistrictElection(null);
        return;
      }

      console.log(`🔷 Starting to fetch district data for ${selectedType} ${selectedYear}...`);
      setIsLoadingDistrictElection(true);
      try {
        const data = await getDistrictElectionData(selectedType, selectedYear);
        console.log('🔷 District data fetched:', data ? 'SUCCESS' : 'NULL');
        if (data && data.results) {
          console.log('🔷 District data has', Object.keys(data.results).length, 'districts');
        }
        if (!isCancelled) {
          setCurrentDistrictElection(data);
          console.log('🔷 District data set to state');
        }
      } catch (error) {
        console.error('🔴 Error updating district election data:', error);
        if (!isCancelled) {
          setCurrentDistrictElection(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDistrictElection(false);
          console.log('🔷 District data loading finished');
        }
      }
    };

    fetchDistrictData();

    return () => {
      isCancelled = true;
    };
  }, [selectedType, selectedYear, isSyntheticMode]);

  const currentResults = currentElection?.results || null;

  // Debug log to see what we have
  React.useEffect(() => {
    console.log('=== CURRENT ELECTION DEBUG ===');
    console.log('currentElection:', currentElection);
    console.log('currentResults:', currentResults);
    console.log('Has results?', currentElection?.results ? 'YES' : 'NO');
    console.log('Winner:', currentElection?.winner);
    console.log('WinnerImg:', currentElection?.winnerImg);
    console.log('WinnerDashboard condition check:', {
      isPres: selectedType === 'presidential',
      hasElection: !!currentElection,
      hasResults: !!currentResults,
      hasWinnerImg: !!currentElection?.winnerImg,
      noSelectedData: !selectedData,
      allConditions: selectedType === 'presidential' && !!currentElection && !!currentResults && !!currentElection?.winnerImg && !selectedData
    });
    if (currentElection?.results) {
      console.log('Number of states in results:', Object.keys(currentElection.results).length);
      console.log('Sample result keys:', Object.keys(currentElection.results).slice(0, 5));
    }
    console.log('==============================');
  }, [currentElection, currentResults, selectedData, selectedType]);

  // Sync state to refs
  React.useEffect(() => {
    winnerDashboardManuallyClosedRef.current = winnerDashboardManuallyClosed;
    winnerDashboardOpenedByUserRef.current = winnerDashboardOpenedByUser;
  }, [winnerDashboardManuallyClosed, winnerDashboardOpenedByUser]);

  // Sync selectedDataOptions to ref
  React.useEffect(() => {
    selectedDataOptionsRef.current = selectedDataOptions;
    console.log('📊 selectedDataOptions updated in ref:', selectedDataOptions);
  }, [selectedDataOptions]);

  const handleStateClick = useCallback((event: any) => {
    const { features, featureData } = event;

    console.log('=== STATE CLICK HANDLER ===');
    console.log('Current selectedType:', selectedType);
    console.log('Current selectedYear:', selectedYear);
    console.log('============================');

    console.log(featureData);

    // User manually closed WinnerDashboard by clicking on a state/county/district
    console.log('🗺️ State clicked - closing WinnerDashboard');
    setWinnerDashboardManuallyClosed(true);
    setWinnerDashboardOpenedByUser(false);
    winnerDashboardManuallyClosedRef.current = true;
    winnerDashboardOpenedByUserRef.current = false;

    if (featureData && featureData.isDistrict) {
      // Handle district click
      if (featureData.CD === "00")
          featureData.districtName = 'At-Large';
      else
          featureData.districtName = 'District ' + Number(featureData.CD);
      featureData.state_name = Object.keys(stateAbbreviations)
            .find(name => stateAbbreviations[name] === featureData.state_id);
      setSelectedData({
        name: featureData.districtName || featureData.name || 'Unknown District',
        data: featureData,
        isCounty: false
      });
    } else if (featureData && featureData.isCounty) {
      // Handle county click
      setSelectedData({
        name: featureData.countyName || featureData.name || 'Unknown County',
        data: featureData,
        isCounty: true
      });
    } else if (features && features.length > 0) {
      // Handle state click
      const state = features[0].properties.name;
      setSelectedData({
        name: state,
        data: features[0].properties,
        isCounty: false
      });
    }

    // Call the onSelectedDataChange callback if provided
    if (onSelectedDataChange) {
      onSelectedDataChange(selectedData);
    }
  }, [selectedType, selectedYear, onSelectedDataChange]);

  const handleCloseDataDashboard = useCallback(() => {
    console.log('❌ DataDashboard closed');
    setSelectedData(null);
    // Don't reset the manually closed flag here - it was set when state was clicked
  }, []);

  const handleHomeClick = useCallback(() => {
    // IMPORTANT: Use ref to get the latest selectedDataOptions value!
    const currentOptions = selectedDataOptionsRef.current;

    // Check if only elections is enabled
    const onlyElectionsEnabled = currentOptions?.elections &&
      !currentOptions?.weather &&
      !currentOptions?.weatherRadar &&
      !currentOptions?.stateInfo &&
      !currentOptions?.aiInfra &&
      !currentOptions?.population &&
      !currentOptions?.worldCup2026;

    console.log('🏠 Home clicked, onlyElectionsEnabled:', onlyElectionsEnabled);
    console.log('🏠 selectedDataOptions FROM REF:', JSON.stringify(currentOptions, null, 2));
    console.log('🏠 population value FROM REF:', currentOptions?.population);
    console.log('🏠 Current flags from REF - manuallyClosed:', winnerDashboardManuallyClosedRef.current, 'openedByUser:', winnerDashboardOpenedByUserRef.current);

    // Always clear selectedData on home click
    setSelectedData(null);
    setHomeClickCount(prev => prev + 1);

    // Only reset manually closed flag if only elections is enabled
    // If other options are enabled, keep it closed
    if (onlyElectionsEnabled) {
      console.log('🏠 Only elections enabled - resetting flags');
      setWinnerDashboardManuallyClosed(false);
      setWinnerDashboardOpenedByUser(true);
      winnerDashboardManuallyClosedRef.current = false;
      winnerDashboardOpenedByUserRef.current = true;
    } else {
      console.log('🏠 Other options enabled - keeping WinnerDashboard closed');
      // Don't modify the flags - keep dashboard closed
    }
  }, []); // No dependencies - always use ref for latest values!

  // Settings panel handlers removed with navbar
  // const handleSettingsClick = useCallback(() => {
  //   setSettingsOpen(true);
  // }, []);

  // const handleSettingsClose = useCallback(() => {
  //   setSettingsOpen(false);
  // }, []);

  const handleTelestratorToggle = useCallback((enabled: boolean) => {
    setTelestratorEnabled(enabled);
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setTelestratorColor(color);
  }, []);

  // Helper function to convert new party-based format
  const convertNewFormatToDisplayFormat = useCallback((rawData: any, geoId: string) => {
    console.log(`🎯 [ElectionDashboard] convertNewFormatToDisplayFormat called for ${geoId}`);
    console.log(`🎯 rawData.results exists:`, !!rawData.results);
    console.log(`🎯 rawData.results[${geoId}] exists:`, !!rawData.results?.[geoId]);
    
    const result = rawData.results[geoId];
    if (!result) {
      console.log(`❌ No result found for ${geoId}`);
      return null;
    }

    const candidates: any = {};
    let winner: string | undefined;
    
    // Check if this state has state-specific candidate info (for synthetic data)
    const stateCandidates = result.stateCandidates;
    const candidateInfo = stateCandidates || rawData.candidates; // Use state-specific if available, else global
    
    console.log(`🎯 [ElectionDashboard] Using ${stateCandidates ? 'STATE-SPECIFIC' : 'GLOBAL'} candidate info for ${geoId}`);
    if (stateCandidates) {
      console.log('🎯 State candidates:', stateCandidates);
    }

    for (const [candidateId, candidateResult] of Object.entries(result)) {
      if (candidateId === 'stateElectoralVote' || candidateId === 'stateElectoralVotes') continue;
      if (candidateId === 'stateCandidates') continue; // Skip the metadata field

      const cr = candidateResult as any;
      if (cr.votes !== undefined) {
        candidates[candidateId] = cr;
        if (cr.winner) {
          const candInfo = candidateInfo[candidateId];
          if (candInfo) {
            const partyInfo = rawData.parties[candInfo.party_code];
            winner = partyInfo ? partyInfo.name : 'Unknown';
          }
        }
      }
    }

    return {
      candidates,
      candidateInfo: candidateInfo, // Return state-specific or global candidates
      parties: rawData.parties,
      winner,
      ElectoralVotes: (result as any).stateElectoralVote || (result as any).stateElectoralVotes || 0,
    };
  }, []);

  const getDisplayResult = useCallback((data: SelectedData): any => {
    console.log('getDisplayResult called with:', data);
    console.log('Current selectedType:', selectedType);
    console.log('Current selectedYear:', selectedYear);

    if (data.data.isDistrict) {
      console.log('Processing district data');
      const geoid = data.data.geoid;
      if (selectedType === 'house' && currentDistrictElection && currentDistrictElection.results) {
        const converted = convertNewFormatToDisplayFormat(currentDistrictElection, geoid);
        if (converted) {
          return {
            ...converted,
            isDistrict: true,
          };
        }
      }
      return {
        candidates: data.data.candidates || {},
        candidateInfo: data.data.candidateInfo || {},
        parties: data.data.parties || {},
        winner: data.data.winner || 'Unknown',
        electoralVotes: 0,
        isDistrict: true
      };
    } else if (data.isCounty) {
      console.log('Processing county data');
      const fips = data.data.fips;

      // Use the currentCountyElection data that's already fetched from Supabase
      if (currentCountyElection && currentCountyElection.results) {
        const converted = convertNewFormatToDisplayFormat(currentCountyElection, fips);
        if (converted) {
          return {
            ...converted,
            isCounty: true,
          };
        }
      }

      // Fallback if no data available
      return {
        candidates: data.data.candidates || {},
        candidateInfo: data.data.candidateInfo || {},
        parties: data.data.parties || {},
        winner: data.data.winner || 'Unknown',
        electoralVotes: 0,
        isCounty: true
      };
    } else {
      console.log('Processing state data');
      const stateCode = stateAbbreviations[data.name];
      console.log('State code lookup:', data.name, '->', stateCode);

      if (stateCode && currentElection && currentResults && currentResults[stateCode]) {
        const geoResult = currentResults[stateCode];
        const converted = convertNewFormatToDisplayFormat(currentElection, stateCode);
        if (converted) {
          return {
            ...converted,
            isCounty: false,
            isDistrict: false
          };
        }
      }

      return null;
    }
  }, [currentResults, currentElection, currentCountyElection, currentDistrictElection, selectedType, selectedYear, convertNewFormatToDisplayFormat]);

  const getStateName = useCallback((data: SelectedData): string => {
    if (data.data.isDistrict) {
      const stateName = data.data.stateName || data.data.state_name || 'Unknown State';
      return `${stateName}`;
    } else if (data.isCounty) {
      const stateName = data.data.stateName || data.data.state_name || 'Unknown State';
      return `${stateName}`;
    } else {
      // For states, just show the state name
      return data.name;
    }
  }, []);

  const getCountyName = useCallback((data: SelectedData): string => {
    if (data.data.isDistrict) {
      return data.data.districtName || data.name;
    } else if (data.isCounty) {
      return data.data.countyName || data.name;
    } else {
      // For states, just show the state name
      return '';
    }
  }, []);

  // Year/type change handlers removed - now controlled externally via Sidebar
  // const handleYearChange = (year: ElectionYear) => {
  //   setSelectedYear(year);
  //   if (onYearChange) {
  //     onYearChange(year);
  //   }
  // };

  // const handleTypeChange = (type: ElectionType) => {
  //   setSelectedType(type);
  //   if (onRaceChange) {
  //     onRaceChange(mapElectionTypeToRace(type));
  //   }
  // };

  // Sync with external changes from Sidebar
  React.useEffect(() => {
    const mappedType = mapRaceToElectionType(initialRace);
    if (mappedType !== selectedType) {
      setSelectedType(mappedType);
    }
  }, [initialRace, selectedType]);

  React.useEffect(() => {
    if (initialYear !== selectedYear) {
      setSelectedYear(initialYear);
    }
  }, [initialYear, selectedYear]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* ElectionNavbar hidden - controlled via Sidebar */}
      {/* <ElectionNavbar
        selectedYear={selectedYear}
        selectedType={selectedType}
        onYearChange={handleYearChange}
        onTypeChange={handleTypeChange}
        onSettingsClick={handleSettingsClick}
      /> */}

      <div className="flex flex-1 overflow-hidden">
        {/* Election Sidebar - add margin when main sidebar is on left */}
        {false && (
        <div className={`z-30 relative transition-all duration-300 ease-in-out pointer-events-auto ${
          sidebarVisible ? 'translate-x-0' : '-translate-x-full'
        } ${
          sidebarPosition === 'left' && !isSidebarCollapsed ? 'ml-32' : ''
        }`}>
          {currentElection && currentResults ? (
            <ElectionSidebar
              currentElection={currentElection}
              currentDistrictElection={currentDistrictElection}
              currentResults={currentResults}
              electionType={selectedType}
              selectedYear={selectedYear}
              bopData={currentBopData}
              sidebarPosition={sidebarPosition}
              isSidebarCollapsed={isSidebarCollapsed}
              selectedState={selectedData?.name || null}
              selectedStateCode={selectedData?.name ? stateAbbreviations[selectedData.name] : null}
            />
          ) : (
            <div className="w-80 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg shadow-xl border border-gray-200/50 dark:border-gray-600/50 overflow-y-auto z-30 relative">
              <div className="p-4 space-y-4">
                <div>
                  <H2 className="mb-2 text-gray-900 dark:text-gray-100">{selectedYear} {selectedType === 'presidential' ? 'Presidential' : selectedType === 'senate' ? 'Senate' : 'House'} Elections</H2>
                  <Callout intent="primary" title={selectedType === 'presidential' ? 'Presidential Elections' : selectedType === 'senate' ? 'Senate Elections' : 'House Elections'}>
                    <div className="space-y-2">
                      <p>{selectedType === 'presidential' ? 'Presidential elections occur every 4 years' : selectedType === 'senate' ? 'Senate elections occur every 2 years' : 'House elections occur every 2 years'}:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li><strong>{selectedType === 'presidential' ? 'Electoral College' : selectedType === 'senate' ? 'Senate' : 'House'}:</strong> {selectedType === 'presidential' ? '538 electoral votes' : selectedType === 'senate' ? '100 seats up for election' : '435 seats up for election'}</li>
                      </ul>
                      <p className="text-sm mt-3">
                        Data for {selectedYear} {selectedType} races will be available in a future update.
                      </p>
                    </div>
                  </Callout>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Sidebar Toggle Button - REMOVED */}

        {/* Map Container */}
        <div className="absolute inset-0" style={{ minHeight: '600px' }}>
          {(() => {
            // Check if only elections is enabled
            const onlyElectionsEnabled = selectedDataOptions?.elections &&
              !selectedDataOptions?.weather &&
              !selectedDataOptions?.weatherRadar &&
              !selectedDataOptions?.stateInfo &&
              !selectedDataOptions?.aiInfra &&
              !selectedDataOptions?.population &&
              !selectedDataOptions?.worldCup2026;

            // Logic for showing WinnerDashboard:
            // 1. If user manually closed it (clicked a state), don't show unless only elections is enabled
            // 2. If it's open and user enables other checkboxes, keep it open (winnerDashboardOpenedByUser)
            // 3. If only elections is enabled and no selection, show it
            const shouldShowWinner = selectedType === 'presidential' &&
              currentElection &&
              currentResults &&
              !selectedData &&
              !winnerDashboardManuallyClosed &&
              (onlyElectionsEnabled || winnerDashboardOpenedByUser);

            console.log('🎯 WinnerDashboard Debug:', {
              selectedType,
              hasElection: !!currentElection,
              hasResults: !!currentResults,
              selectedData: !!selectedData,
              winnerDashboardManuallyClosed,
              onlyElectionsEnabled,
              winnerDashboardOpenedByUser,
              shouldShowWinner
            });

            // Track WinnerDashboard visibility
            React.useEffect(() => {
              if (shouldShowWinner && onlyElectionsEnabled && !winnerDashboardOpenedByUser) {
                // WinnerDashboard is showing with only elections enabled for the first time
                // Mark it as opened so it stays open when other options are enabled
                console.log('🎯 Setting winnerDashboardOpenedByUser = true (first time open)');
                setWinnerDashboardOpenedByUser(true);
                // DON'T reset winnerDashboardManuallyClosed here - it might have been set by user
              } else if (!shouldShowWinner && !onlyElectionsEnabled && winnerDashboardOpenedByUser) {
                // Other options were enabled while WinnerDashboard was open
                // Keep winnerDashboardOpenedByUser true so it stays open
              } else if (!shouldShowWinner && selectedData) {
                // User selected a state/county - will be handled by handleStateClick
              }
            }, [shouldShowWinner, onlyElectionsEnabled, selectedData, winnerDashboardOpenedByUser]);

            return false && shouldShowWinner && (
              <WinnerDashboard
                key={`winner-${selectedYear}-${homeClickCount}`}
                currentElection={currentElection}
                currentNationalElection={currentNationalElection}
                currentResults={currentResults}
                selectedYear={selectedYear}
                sidebarPosition={sidebarPosition}
                isSidebarCollapsed={isSidebarCollapsed}
                onClose={() => {
                  console.log('🎯 WinnerDashboard onClose callback - setting flags');
                  setWinnerDashboardManuallyClosed(true);
                  setWinnerDashboardOpenedByUser(false);
                  winnerDashboardManuallyClosedRef.current = true;
                  winnerDashboardOpenedByUserRef.current = false;
                }}
              />
            );
          })()}

          {false && selectedData && currentResults && (
            <DataDashboard
              stateName={getStateName(selectedData)}
              countyName={getCountyName(selectedData)}
              stateResult={getDisplayResult(selectedData)}
              selectedType={selectedType}
              sidebarPosition={sidebarPosition}
              isSidebarCollapsed={isSidebarCollapsed}
              onClose={handleCloseDataDashboard}
            />
          )}

          <MapContainer
            key={`${mapStyle}-${showMapLabels}`}
            onStateClick={handleStateClick}
            onHomeClick={handleHomeClick}
            sidebarVisible={sidebarVisible}
            selectedState={selectedData?.name || null}
            selectedType={selectedType}
            selectedYear={selectedYear}
            currentElection={currentElection}
            currentCountyElection={currentCountyElection}
            currentDistrictElection={currentDistrictElection}
            setSelectedYear={setSelectedYear}
            mapViewRef={mapViewRef}
            electionMapRef={electionMapRef}
            mapStyle={mapStyle}
            showMapLabels={showMapLabels}
            globeMode={globeMode}
            atmosphereEnabled={atmosphereEnabled}
            projection={projection}
            electionMapOpacity={electionMapOpacity}
            syntheticRaceData={syntheticRaceData}
          />
        </div>
      </div>

      {/* Settings Panel - removed with navbar */}
      {/* <SettingsPanel
        isOpen={settingsOpen}
        onClose={handleSettingsClose}
        telestratorEnabled={telestratorEnabled}
        onTelestratorToggle={handleTelestratorToggle}
        telestratorColor={telestratorColor}
        onColorChange={handleColorChange}
      /> */}

      {/* Debug Dialog */}
      <Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" style={{ zIndex: 10001 }}>
          <DialogHeader>
            <DialogTitle>Election Map Debug Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Mode & Selection:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify({ 
                  selectedType, 
                  selectedYear, 
                  isSyntheticMode,
                  initialRace,
                  initialYear
                }, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Synthetic Race Data (Raw from RPC):</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-48">
                {syntheticRaceData ? JSON.stringify(syntheticRaceData, null, 2) : 'NULL'}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Current Election (State to MapContainer):</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-48">
                {currentElection ? JSON.stringify({
                  hasResults: !!currentElection.results,
                  resultsCount: currentElection.results ? Object.keys(currentElection.results).length : 0,
                  resultsKeys: currentElection.results ? Object.keys(currentElection.results) : [],
                  hasCandidates: !!currentElection.candidates,
                  candidatesKeys: currentElection.candidates ? Object.keys(currentElection.candidates) : [],
                  hasParties: !!currentElection.parties,
                  partiesData: currentElection.parties,
                  winner: currentElection.winner,
                  sampleResults: currentElection.results ? Object.fromEntries(Object.entries(currentElection.results).slice(0, 2)) : {}
                }, null, 2) : 'NULL'}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Transformed Synthetic Data (Check Format):</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-48">
                {'Transformation function is async - check console logs for output'}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Loading States:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify({
                  isLoadingElection,
                  isLoadingCountyElection,
                  isLoadingDistrictElection
                }, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Props Received:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-32">
                {JSON.stringify({
                  syntheticRaceDataLength: syntheticRaceData?.length || 0,
                  isSyntheticMode,
                  selectedDataOptions: selectedDataOptions || {}
                }, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Telestrator Canvas */}
      <TelestratorCanvas
        enabled={telestratorEnabled}
        color={telestratorColor}
      />
    </div>
  );
}