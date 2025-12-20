import { useState, useMemo, useEffect } from "react";
import { RaceCard } from "./RaceCard";
import { ElectionFilters } from "./ElectionFilters";
import { ElectionSummary } from "./ElectionSummary";
import { ElectionAIInsights } from "./ElectionsAIInsightsNew";
import { EditCandidateDialog } from "./EditCandidateDialog";
import { EditPartyDialog } from "./EditPartyDialog";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { RefreshCw, Download, Plus, Database, AlertTriangle, BarChart3, List, Vote, Crown, Building, Users, Flag, Edit, X, Loader2, Rss } from "lucide-react";
import { Race, CandidateProfile, Party, getFieldValue, isFieldOverridden, ElectionData } from "../types/election";
import { Input } from "./ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { getFilteredElectionData, clearElectionDataCache } from "../data/electionData";
import { updateRaceFieldOverride, updateRacesFieldOverride, updateCandidateFieldOverride, updateCandidatesFieldOverride, updateRaceCandidatesFieldOverride } from "../data/overrideFieldMappings";
import { supabase, withAutoRecovery } from '../utils/supabase/client';
import { SyntheticGroup } from '../utils/useSyntheticRaceWorkflow';
import { currentElectionYear } from '../utils/constants';
import { getEdgeFunctionUrl, getSupabaseAnonKey } from '../utils/supabase/config';
import { motion } from "framer-motion";

interface ElectionDashboardProps {
  races: Race[];
  candidates?: CandidateProfile[];
  parties?: Party[];
  onUpdateRace: (race: Race) => void;
  //onUpdateCandidate?: (candidate: CandidateProfile) => void;
  //onUpdateParty?: (party: Party) => void;
  lastUpdated: string;
  onNavigateToFeeds?: () => void;
}

export function ElectionDashboard({ races, candidates = [], parties = [], onUpdateRace, lastUpdated, onNavigateToFeeds }: ElectionDashboardProps) {
  const [activeTab, setActiveTab] = useState('all-races');
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [partySearchTerm, setPartySearchTerm] = useState('');
  const [editingCandidate, setEditingCandidate] = useState<CandidateProfile | null>(null);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRaceType, setSelectedRaceType] = useState((parseInt(currentElectionYear) % 4) ? 'SENATE' : 'PRESIDENTIAL');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedState, setSelectedState] = useState((parseInt(currentElectionYear) % 4) ? 'all' : 'National');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [showOverridesDialog, setShowOverridesDialog] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);

  // State for filtered election data
  const [filteredElectionData, setFilteredElectionData] = useState<ElectionData | null>(null);
  const [isLoadingFiltered, setIsLoadingFiltered] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add trigger to force refresh
  const [syntheticRaces, setSyntheticRaces] = useState<any[]>([]); // State for synthetic races
  const [showingSyntheticRaces, setShowingSyntheticRaces] = useState(false); // Toggle for showing synthetic vs real races
  const [selectedSyntheticGroupId, setSelectedSyntheticGroupId] = useState<string | null>(null); // Currently selected synthetic group
  const [syntheticGroups, setSyntheticGroups] = useState<SyntheticGroup[]>([]); // Available synthetic groups
  const [showDebugDialog, setShowDebugDialog] = useState(false); // State for debug dialog
  const [debugRPCData, setDebugRPCData] = useState<any>(null); // Raw RPC response for debugging
  const [isLoadingDebugData, setIsLoadingDebugData] = useState(false); // Loading state for debug fetch

  // Fetch filtered data when year or race type changes
  useEffect(() => {
    let mounted = true;

    const fetchFilteredData = async () => {
      setIsLoadingFiltered(true);
      try {
        // Parse year - use undefined if 'all' to fetch all years (>= 2012)
        const year = selectedYear !== 'all' ? parseInt(selectedYear) : undefined;
        const raceType = selectedRaceType !== 'all' ? selectedRaceType.toUpperCase() : undefined;

        console.log('Fetching filtered data with params:', { year, raceType, refreshTrigger });
        const data = await getFilteredElectionData(year, raceType);

        if (mounted) {
          console.log('Filtered data received:', {
            racesCount: data.races.length,
            firstRace: data.races[0]
          });
          setFilteredElectionData(data);
        }
      } catch (error) {
        console.error('Failed to fetch filtered election data:', error);
      } finally {
        if (mounted) {
          setIsLoadingFiltered(false);
        }
      }
    };

    fetchFilteredData();

    return () => {
      mounted = false;
    };
  }, [selectedYear, selectedRaceType, refreshTrigger]);

  // Use filtered data once loaded, otherwise use props (for initial render)
  console.log('filteredElectionDataaaaaaa')
  console.log(filteredElectionData)
  
  // If showing synthetic races, use those instead of regular races
  const displayRaces = showingSyntheticRaces 
    ? syntheticRaces 
    : (filteredElectionData ? filteredElectionData.races : races);
  const displayCandidates = filteredElectionData ? filteredElectionData.candidates : candidates;
  const displayParties = filteredElectionData ? filteredElectionData.parties : parties;

  console.log('🎯 Display races source:', {
    showingSyntheticRaces,
    syntheticRacesCount: syntheticRaces.length,
    displayRacesCount: displayRaces.length,
    firstRace: displayRaces[0] ? {
      title: displayRaces[0].title,
      office: displayRaces[0].office,
      state: displayRaces[0].state
    } : null
  });

  // Get unique states for filter with National at the top
  const states = useMemo(() => {
    const stateSet = new Set<string>(displayRaces.map((race: Race) => race.state));
    const uniqueStates = Array.from(stateSet);

    // Sort with National first, then alphabetically
    return uniqueStates.sort((a, b) => {
      if (a === 'National') return -1;
      if (b === 'National') return 1;
      return a.localeCompare(b);
    });
  }, [displayRaces]);

  // Filter races
  const filteredRaces = useMemo(() => {
    const filtered = displayRaces.filter((race: Race) => {
      const titleValue = getFieldValue(race.title);
      const statusValue = getFieldValue(race.status);
      const raceTypeValue = getFieldValue(race.raceType);

      const matchesSearch = searchTerm === '' ||
        titleValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        race.candidates.some(candidate => {
          const candidateName = getFieldValue(candidate.name);
          return candidateName.toLowerCase().includes(searchTerm.toLowerCase());
        });

      // If we have filtered data from backend, don't re-filter by race type or year
      // since the backend already did that
      const matchesRaceType = !filteredElectionData || selectedRaceType === 'all' || raceTypeValue === selectedRaceType;
      const matchesStatus = selectedStatus === 'all' || statusValue === selectedStatus;
      const matchesState = selectedState === 'all' || race.state === selectedState;
      const matchesYear = !filteredElectionData || selectedYear === 'all' || race.year === selectedYear;

      // Debug logging
      if (!matchesRaceType && searchTerm === '' && selectedStatus === 'all' && selectedState === 'all') {
        console.log('Race filtered out by type:', {
          raceTitle: titleValue,
          raceType: raceTypeValue,
          selectedRaceType,
          matchesRaceType
        });
      }

      return matchesSearch && matchesRaceType && matchesStatus && matchesState && matchesYear;
    });

    console.log('Filtered races result:', {
      displayRacesCount: displayRaces.length,
      filteredCount: filtered.length,
      selectedRaceType,
      selectedYear
    });

    return filtered;
  }, [displayRaces, searchTerm, selectedRaceType, selectedStatus, selectedState, selectedYear, filteredElectionData]);

  // Get summary statistics
  const summary = useMemo(() => {
    console.log('summaryyyyyyyy')
    console.log(displayRaces);

    const totalRaces = displayRaces.length;
    const calledRaces = displayRaces.filter(r => getFieldValue(r.status) === 'CALLED').length;
    const projectedRaces = displayRaces.filter(r => getFieldValue(r.status) === 'PROJECTED').length;
    const notCalledRaces = displayRaces.filter(r => getFieldValue(r.status) === 'NOT_CALLED').length;

    // Calculate override statistics
    const racesWithOverrides = displayRaces.filter(race => {
      return isFieldOverridden(race.title) ||
             isFieldOverridden(race.status) ||
             //isFieldOverridden(race.raceType) ||
             isFieldOverridden(race.reportingPercentage) ||
             isFieldOverridden(race.precincts_reporting) ||
             isFieldOverridden(race.totalVotes) ||
             race.candidates.some(candidate =>
               isFieldOverridden(candidate.name) ||
               //isFieldOverridden(candidate.party) ||
               isFieldOverridden(candidate.incumbent) ||
               isFieldOverridden(candidate.winner) ||
               isFieldOverridden(candidate.votes) ||
               isFieldOverridden(candidate.withdrew)
             );
    });

    console.log('racesWithOverridesssssss')
    console.log(racesWithOverrides);

    // Track unique candidate global fields to avoid double counting
    // These fields are stored in e_candidates table and apply across all races
    const candidateNamesOverridden = new Set<string>();
    const candidateIncumbentOverridden = new Set<string>();

    const totalOverriddenFields = displayRaces.reduce((total, race) => {
      let fieldCount = 0;
      if (isFieldOverridden(race.title)) fieldCount++;
      if (isFieldOverridden(race.status)) fieldCount++;
      //if (isFieldOverridden(race.raceType)) fieldCount++;
      if (isFieldOverridden(race.reportingPercentage)) fieldCount++;
      if (isFieldOverridden(race.precincts_reporting)) fieldCount++;
      if (isFieldOverridden(race.totalVotes)) fieldCount++;
      race.candidates.forEach(candidate => {
        // Only count candidate name once globally (stored in e_candidates table)
        if (isFieldOverridden(candidate.name) && !candidateNamesOverridden.has(candidate.id)) {
          fieldCount++;
          candidateNamesOverridden.add(candidate.id);
        }
        // Only count candidate incumbent once globally (stored in e_candidates table)
        if (isFieldOverridden(candidate.incumbent) && !candidateIncumbentOverridden.has(candidate.id)) {
          fieldCount++;
          candidateIncumbentOverridden.add(candidate.id);
        }
        // Race-specific candidate fields (stored in e_candidate_results table)
        //if (isFieldOverridden(candidate.party)) fieldCount++;
        if (isFieldOverridden(candidate.winner)) fieldCount++;
        if (isFieldOverridden(candidate.votes)) fieldCount++;
        if (isFieldOverridden(candidate.percentage)) fieldCount++;
        if (isFieldOverridden(candidate.withdrew)) fieldCount++;
      });
      return total + fieldCount;
    }, 0);

    console.log('totalOverriddenFieldsssssss');
    console.log(totalOverriddenFields)

    return {
      totalRaces,
      calledRaces,
      projectedRaces,
      notCalledRaces,
      racesWithOverrides: racesWithOverrides.length,
      totalOverriddenFields
    };
  }, [displayRaces, refreshTrigger]);

  // Function to refresh filtered data after updates
  const refreshFilteredData = () => {
    console.log('Refreshing filtered election data...');

    // Clear the cache first to ensure we get fresh data
    clearElectionDataCache();

    // Then trigger a re-fetch
    setRefreshTrigger((prev: number) => prev + 1);
  };

  // Wrapper for onUpdateRace that also refreshes filtered data
  const handleUpdateRace = (updatedRace: Race) => {
    // Check if any global candidate fields were updated (name, incumbent)
    // These fields are stored in e_candidates table and apply across all races
    const originalRace = races.find(r => r.id === updatedRace.id);
    const changedCandidates: Array<{ id: string; name?: any; incumbent?: any }> = [];

    if (originalRace) {
      updatedRace.candidates.forEach((candidate) => {
        const originalCandidate = originalRace.candidates.find(c => c.id === candidate.id);
        if (originalCandidate) {
          const changes: { id: string; name?: any; incumbent?: any } = { id: candidate.id };
          let hasChanges = false;

          // Check if name changed
          if (JSON.stringify(candidate.name) !== JSON.stringify(originalCandidate.name)) {
            changes.name = candidate.name;
            hasChanges = true;
          }

          // Check if incumbent changed
          if (JSON.stringify(candidate.incumbent) !== JSON.stringify(originalCandidate.incumbent)) {
            changes.incumbent = candidate.incumbent;
            hasChanges = true;
          }

          if (hasChanges) {
            changedCandidates.push(changes);
          }
        }
      });
    }

    // First call the original update function for this race
    onUpdateRace(updatedRace);

    // If any global candidate fields changed, update ALL other races with those candidates
    if (changedCandidates.length > 0) {
      console.log('Global candidate field(s) changed - updating all races with these candidates:', changedCandidates);

      // Find and update all other races that have these candidates
      races.forEach((race: Race) => {
        if (race.id === updatedRace.id) return; // Skip the race we already updated

        const hasChangedCandidate = race.candidates.some(c =>
          changedCandidates.some(changed => changed.id === c.id)
        );

        if (hasChangedCandidate) {
          // Update this race with the new global candidate fields
          const updatedCandidates = race.candidates.map(c => {
            const changed = changedCandidates.find(ch => ch.id === c.id);
            if (changed) {
              const updates: any = { ...c };
              if (changed.name !== undefined) updates.name = changed.name;
              if (changed.incumbent !== undefined) updates.incumbent = changed.incumbent;
              return updates;
            }
            return c;
          });

          const updatedOtherRace = {
            ...race,
            candidates: updatedCandidates,
            lastUpdated: new Date().toISOString()
          };

          onUpdateRace(updatedOtherRace);
        }
      });
    }

    // Then trigger a refresh of filtered data after a short delay
    // to allow the database update to complete
    setTimeout(() => {
      refreshFilteredData();
    }, 500); // Increased delay to ensure DB write completes
  };

  // Handler for deleting synthetic races
  const handleDeleteRace = async (raceId: string) => {
    try {
      // Find the race - check both regular races and synthetic races
      let race = races.find(r => r.id === raceId);
      
      // If not in regular races, check synthetic races
      if (!race && showingSyntheticRaces) {
        race = syntheticRaces.find(r => r.id === raceId);
      }
      
      console.log('🗑️ Delete race requested:', {
        raceId,
        race_found: !!race,
        synthetic_race_id: race?.synthetic_race_id,
        race_type: race?.raceType,
        showingSyntheticRaces,
        race_object: race
      });
      
      if (!race?.synthetic_race_id) {
        console.error('Cannot delete race - no synthetic_race_id found');
        alert('Cannot delete race - missing synthetic race ID. This race may not be a synthetic race.');
        return;
      }

      // Call the delete RPC
      const { error } = await supabase.rpc('e_delete_synthetic_race', {
        p_synthetic_race_id: race.synthetic_race_id
      });

      if (error) {
        console.error('Failed to delete synthetic race:', error);
        alert('Failed to delete race: ' + error.message);
        return;
      }

      console.log('✅ Successfully deleted synthetic race');
      
      // If we're showing synthetic races, remove from local state
      if (showingSyntheticRaces) {
        setSyntheticRaces(prev => prev.filter(r => r.id !== raceId));
      } else {
        // Otherwise refresh the data to remove from regular races
        refreshFilteredData();
      }
    } catch (err) {
      console.error('Error deleting race:', err);
      alert('Failed to delete race');
    }
  };

  const handleUpdateCandidate = async (updatedCandidate: CandidateProfile) => {
    try {
      // Prepare the update data with proper array formatting for PostgreSQL
      if (updatedCandidate.incumbent !== null && typeof updatedCandidate.incumbent === 'object') {
        updatedCandidate.incumbent = updatedCandidate.incumbent.overriddenValue;
      }

      console.log('handleUpdateCandidateeeeeeee')
      console.log(updatedCandidate)

      let displayName = `${updatedCandidate.firstName} ${updatedCandidate.lastName}`;
      if (displayName === updatedCandidate.originalName)
        displayName = null;
      let incumbent = updatedCandidate.incumbent;
      if (incumbent === updatedCandidate.originalIncumbent)
        incumbent = null;

      console.log(displayName)

      const updateData: any = {
        photo_url: updatedCandidate.headshot || null,  // Fixed: ensure photo_url is saved
        display_name: displayName,
        bio: updatedCandidate.bio || null,
        date_of_birth: updatedCandidate.birthDate || null,
        bio_short: updatedCandidate.birthPlace || null,
        website: updatedCandidate.website || null,
        incumbent_override: incumbent
      };

      // Handle array fields - PostgreSQL needs arrays to be explicitly set
      // For education array
      if (updatedCandidate.education && updatedCandidate.education.length > 0) {
        updateData.education = updatedCandidate.education;
      } else {
        updateData.education = null;
      }

      // For occupation/professional_background array
      if (updatedCandidate.occupation && updatedCandidate.occupation.length > 0) {
        updateData.professional_background = updatedCandidate.occupation;
      } else {
        updateData.professional_background = null;
      }

      // For experience/political_experience array
      if (updatedCandidate.experience && updatedCandidate.experience.length > 0) {
        updateData.political_experience = updatedCandidate.experience;
      } else {
        updateData.political_experience = null;
      }

      console.log('Updating candidate with data:', updateData);
      console.log('Candidate ID:', updatedCandidate.id);

      // Update e_candidates table with all the new fields
      const { error } = await supabase
        .from('e_candidates')
        .update(updateData)
        .eq('candidate_id', updatedCandidate.id);

      if (error) {
        console.error('Error updating candidate:', error);
        throw error;
      }

      console.log('Candidate updated successfully:', updatedCandidate.id);

      // Update local races immediately with the new override structure
      const newDisplayName = `${updatedCandidate.firstName} ${updatedCandidate.lastName}`;
      const hasNameChanged = newDisplayName !== updatedCandidate.originalName;
      const hasIncumbentChanged = updatedCandidate.incumbent !== updatedCandidate.originalIncumbent;

      races.forEach((race: Race) => {
        const candidateInRace = race.candidates.find(c => c.id === updatedCandidate.id);
        if (candidateInRace) {
          const updatedCandidates = race.candidates.map(c => {
            if (c.id === updatedCandidate.id) {
              return {
                ...c,
                // Update name with FieldOverride if changed, otherwise keep original value
                name: hasNameChanged
                  ? {
                      originalValue: updatedCandidate.originalName || newDisplayName,
                      overriddenValue: newDisplayName,
                      isOverridden: true,
                      overriddenAt: new Date().toISOString(),
                      reason: 'Updated Name'
                    }
                  : updatedCandidate.originalName,
                // Update incumbent with FieldOverride if changed
                incumbent: hasIncumbentChanged
                  ? {
                      originalValue: updatedCandidate.originalIncumbent || false,
                      overriddenValue: updatedCandidate.incumbent || false,
                      isOverridden: true,
                      overriddenAt: new Date().toISOString(),
                      reason: 'Updated Incumbent Status'
                    }
                  : updatedCandidate.originalIncumbent,
                // Update headshot if provided
                headshot: updatedCandidate.headshot || c.headshot
              };
            }
            return c;
          });

          const updatedRace = {
            ...race,
            candidates: updatedCandidates,
            lastUpdated: new Date().toISOString()
          };

          onUpdateRace(updatedRace);
        }
      });

      // Refresh the filtered data to show the updates
      setTimeout(() => {
        refreshFilteredData();
      }, 500);
    } catch (error) {
      console.error('Failed to update candidate:', error);
      // You might want to show an error message to the user here
    }
  }

  const handleUpdateParty = async (updatedParty: Party) => {
    try {
      // Prepare the update data for PostgreSQL
      const updateData: any = {
        short_name: updatedParty.name || null,
        display_name: updatedParty.fullName || null,
        founded_year: updatedParty.founded ? updatedParty.founded : null,
        color_hex: updatedParty.colors.primary || null,
        color_secondary_hex: updatedParty.colors.secondary || null,
        description: updatedParty.description || null,
        ideology: updatedParty.ideology || null,
        headquarters_address: updatedParty.headquarters || null,
        historical_overview: updatedParty.history || null,
        website: updatedParty.website || null,
        twitter_handle: updatedParty.socialMedia?.twitter || null,
        facebook_page: updatedParty.socialMedia?.facebook || null,
        instagram_handle: updatedParty.socialMedia?.instagram || null
      };

      // Handle color_palette JSONB field
      updateData.color_palette = {
        primary: updatedParty.colors.primary || null,
        secondary: updatedParty.colors.secondary || null,
        light: updatedParty.colors.light || null,
        dark: updatedParty.colors.dark || null
      };

      // Handle leadership_structure JSONB field
      if (updatedParty.leaders && updatedParty.leaders.length > 0) {
        updateData.leadership_structure = updatedParty.leaders;
      } else {
        updateData.leadership_structure = null;
      }

      // Handle policy_priorities TEXT[] field (using abbreviations)
      if (updatedParty.abbreviations && updatedParty.abbreviations.length > 0) {
        updateData.policy_priorities = updatedParty.abbreviations;
      } else {
        updateData.policy_priorities = null;
      }

      // Handle coalition_partners TEXT[] field (using aliases)
      if (updatedParty.aliases && updatedParty.aliases.length > 0) {
        updateData.coalition_partners = updatedParty.aliases;
      } else {
        updateData.coalition_partners = null;
      }

      console.log('Updating party with data:', updateData);
      console.log('Party Code:', updatedParty.code);

      // Update e_parties table with all the new fields
      const { error } = await supabase
        .from('e_parties')
        .update(updateData)
        .eq('abbreviation', updatedParty.code);

      if (error) {
        console.error('Error updating party:', error);
        throw error;
      }

      console.log('Party updated successfully:', updatedParty.code);

      // Refresh the filtered data to show the updates
      setTimeout(() => {
        refreshFilteredData();
      }, 500);
    } catch (error) {
      console.error('Failed to update party:', error);
      // You might want to show an error message to the user here
    }
  }

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRaceType('all');
    setSelectedStatus('all');
    setSelectedState('all');
    setSelectedYear('2024');
    setFilteredElectionData(null); // Reset filtered data
  };

  // Handler for race type change with automatic state adjustment
  const handleRaceTypeChange = (raceType: string) => {
    setSelectedRaceType(raceType);

    // If switching to non-presidential race type and current state is "National",
    // automatically change to "all" since National is only valid for presidential races
    if (raceType !== 'PRESIDENTIAL' && selectedState === 'National') {
      setSelectedState('all');
    }
  };

  const handleRefresh = () => {
    // In a real app, this would fetch fresh data
    console.log('Refreshing election data...');
  };

  const handleExport = () => {
    // In a real app, this would export the data
    const dataStr = JSON.stringify(filteredRaces, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'election-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Clear a specific race field override
  const clearRaceOverride = async (race: Race, fieldName: keyof Race) => {
    // Update local state first
    const updatedRace = { ...race, [fieldName]: null };
    onUpdateRace(updatedRace);

    // Persist to database
    const raceResultsFields = ['reportingPercentage', 'precincts_reporting', 'precincts_total', 'status', 'called_timestamp', 'totalVotes'];
    const racesFields = ['title'];

    if (raceResultsFields.includes(fieldName as string)) {
      try {
        await updateRaceFieldOverride(
          race.race_results_id,
          fieldName as string,
          null,
          'Override cleared via UI'
        );
      } catch (error) {
        console.error(`Error clearing race field ${fieldName}:`, error);
      }
    } else if (racesFields.includes(fieldName as string)) {
      try {
        await updateRacesFieldOverride(
          race.race_id,
          fieldName as string,
          null,
          'Override cleared via UI'
        );
      } catch (error) {
        console.error(`Error clearing race field ${fieldName}:`, error);
      }
    }

    // Refresh filtered data
    setTimeout(() => {
      refreshFilteredData();
    }, 500);
  };

  // Clear a specific candidate field override
  const clearCandidateOverride = async (race: Race, candidateId: string, fieldName: string) => {
    const candidate = race.candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    // Update local state
    const updatedCandidates = race.candidates.map(c =>
      c.id === candidateId ? { ...c, [fieldName]: null } : c
    );

    const updatedRace = {
      ...race,
      candidates: updatedCandidates,
      lastUpdated: new Date().toISOString()
    };
    onUpdateRace(updatedRace);

    // Persist to database
    const candidateResultsFields = ['votes', 'percentage', 'winner', 'electoralVotes'];
    const candidatesFields = ['incumbent', 'name'];
    const raceCandidatesFields = ['withdrew'];

    if (candidateResultsFields.includes(fieldName) && candidate.candidate_results_id) {
      try {
        await updateCandidateFieldOverride(
          candidate.candidate_results_id,
          fieldName,
          null,
          'Override cleared via UI'
        );
      } catch (error) {
        console.error(`Error clearing candidate field ${fieldName}:`, error);
      }
    } else if (candidatesFields.includes(fieldName)) {
      try {
        await updateCandidatesFieldOverride(
          candidateId,
          fieldName,
          null,
          'Override cleared via UI'
        );
      } catch (error) {
        console.error(`Error clearing candidate field ${fieldName}:`, error);
      }
    } else if (raceCandidatesFields.includes(fieldName) && candidate.race_candidates_id) {
      try {
        await updateRaceCandidatesFieldOverride(
          candidate.race_candidates_id,
          fieldName,
          null,
          'Override cleared via UI'
        );
      } catch (error) {
        console.error(`Error clearing candidate field ${fieldName}:`, error);
      }
    }

    // Refresh filtered data
    setTimeout(() => {
      refreshFilteredData();
    }, 500);
  };

  // Clear candidate field override globally (across all races)
  // This is used for fields that are stored in e_candidates table (name, incumbent)
  // as opposed to e_candidate_results table (votes, percentage, winner)
  const clearGlobalCandidateFieldOverride = async (candidateId: string, fieldName: 'name' | 'incumbent') => {
    // Update local state immediately for all races that have this candidate
    races.forEach(race => {
      const hasCandidate = race.candidates.some(c => c.id === candidateId);
      if (hasCandidate) {
        const updatedCandidates = race.candidates.map(c =>
          c.id === candidateId ? { ...c, [fieldName]: null as any } : c
        );
        const updatedRace = {
          ...race,
          candidates: updatedCandidates,
          lastUpdated: new Date().toISOString()
        };
        onUpdateRace(updatedRace);
      }
    });

    // Persist to database in background - only needs to be done once since field is in e_candidates table
    updateCandidatesFieldOverride(
      candidateId,
      fieldName,
      null,
      `Global candidate ${fieldName} override cleared via UI`
    ).catch(error => {
      console.error(`Error clearing global candidate ${fieldName} override:`, error);
    });

    // Refresh filtered data after a delay
    setTimeout(() => {
      refreshFilteredData();
    }, 500);
  };

  // Clear all overrides across all races
  const clearAllOverrides = async () => {
    // Get all races with overrides from the currently displayed data (filtered by year)
    const racesWithOverrides = displayRaces.filter(race => {
      return isFieldOverridden(race.title) ||
             isFieldOverridden(race.status) ||
             isFieldOverridden(race.reportingPercentage) ||
             isFieldOverridden(race.precincts_reporting) ||
             isFieldOverridden(race.totalVotes) ||
             race.candidates.some(candidate =>
               isFieldOverridden(candidate.name) ||
               isFieldOverridden(candidate.incumbent) ||
               isFieldOverridden(candidate.winner) ||
               isFieldOverridden(candidate.votes) ||
               isFieldOverridden(candidate.percentage) || 
               isFieldOverridden(candidate.withdrew)
             );
    });

    // Update local state immediately for each race
    racesWithOverrides.forEach(race => {
      const updatedRace = { ...race };

      // Clear race-level overrides in local state
      if (isFieldOverridden(race.title)) updatedRace.title = null as any;
      if (isFieldOverridden(race.status)) updatedRace.status = null as any;
      if (isFieldOverridden(race.reportingPercentage)) updatedRace.reportingPercentage = null as any;
      if (isFieldOverridden(race.precincts_reporting)) updatedRace.precincts_reporting = null as any;
      if (isFieldOverridden(race.totalVotes)) updatedRace.totalVotes = null as any;

      // Clear candidate-level overrides in local state
      updatedRace.candidates = race.candidates.map(candidate => {
        const updatedCandidate = { ...candidate };
        if (isFieldOverridden(candidate.name)) updatedCandidate.name = null as any;
        if (isFieldOverridden(candidate.incumbent)) updatedCandidate.incumbent = null as any;
        if (isFieldOverridden(candidate.winner)) updatedCandidate.winner = null as any;
        if (isFieldOverridden(candidate.votes)) updatedCandidate.votes = null as any;
        if (isFieldOverridden(candidate.percentage)) updatedCandidate.percentage = null as any;
        if (isFieldOverridden(candidate.withdrew)) updatedCandidate.withdrew = null as any;
        return updatedCandidate;
      });

      updatedRace.lastUpdated = new Date().toISOString();
      onUpdateRace(updatedRace);
    });

    // Clear all overrides in database (in parallel)
    const clearPromises = racesWithOverrides.flatMap(race => {
      const promises: Promise<any>[] = [];

      // Clear race-level overrides
      if (isFieldOverridden(race.title)) {
        promises.push(
          updateRacesFieldOverride(race.race_id, 'title', null, 'All overrides cleared')
        );
      }
      if (isFieldOverridden(race.status)) {
        promises.push(
          updateRaceFieldOverride(race.race_results_id, 'status', null, 'All overrides cleared')
        );
      }
      if (isFieldOverridden(race.reportingPercentage)) {
        promises.push(
          updateRaceFieldOverride(race.race_results_id, 'reportingPercentage', null, 'All overrides cleared')
        );
      }
      if (isFieldOverridden(race.precincts_reporting)) {
        promises.push(
          updateRaceFieldOverride(race.race_results_id, 'precincts_reporting', null, 'All overrides cleared')
        );
      }
      if (isFieldOverridden(race.totalVotes)) {
        promises.push(
          updateRaceFieldOverride(race.race_results_id, 'totalVotes', null, 'All overrides cleared')
        );
      }

      // Clear candidate-level overrides
      race.candidates.forEach(candidate => {
        if (isFieldOverridden(candidate.name)) {
          promises.push(
            updateCandidatesFieldOverride(candidate.id, 'name', null, 'All overrides cleared')
          );
        }
        if (isFieldOverridden(candidate.incumbent)) {
          promises.push(
            updateCandidatesFieldOverride(candidate.id, 'incumbent', null, 'All overrides cleared')
          );
        }
        if (isFieldOverridden(candidate.winner) && candidate.candidate_results_id) {
          promises.push(
            updateCandidateFieldOverride(candidate.candidate_results_id, 'winner', null, 'All overrides cleared')
          );
        }
        if (isFieldOverridden(candidate.votes) && candidate.candidate_results_id) {
          promises.push(
            updateCandidateFieldOverride(candidate.candidate_results_id, 'votes', null, 'All overrides cleared')
          );
        }
        if (isFieldOverridden(candidate.percentage) && candidate.candidate_results_id) {
          promises.push(
            updateCandidateFieldOverride(candidate.candidate_results_id, 'percentage', null, 'All overrides cleared')
          );
        }
        if (isFieldOverridden(candidate.withdrew) && candidate.candidate_results_id) {
          promises.push(
            updateRaceCandidatesFieldOverride(candidate.race_candidates_id, 'withdrew', null, 'All overrides cleared')
          );
        }
      });

      return promises;
    });

    try {
      // Execute all database clear operations in background
      Promise.all(clearPromises).catch(error => {
        console.error('Error clearing all overrides in database:', error);
      });

      // Close dialog immediately since local state is already updated
      setShowOverridesDialog(false);

      // Refresh filtered data after a delay
      setTimeout(() => {
        refreshFilteredData();
      }, 500);
    } catch (error) {
      console.error('Error clearing all overrides:', error);
    }
  };

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0, type: "spring", stiffness: 100 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
      <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 group">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          initial={false}
        />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-4">
            <motion.div 
              className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Vote className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">Total Races</p>
              {isLoadingFiltered ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <motion.p 
                  className="text-2xl font-semibold"
                  key={summary.totalRaces}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  {summary.totalRaces}
                </motion.p>
              )}
              <p className="text-xs text-muted-foreground">
                {summary.calledRaces} called, {summary.projectedRaces} projected
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, type: "spring", stiffness: 100 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
      <Card 
        className={`h-full relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl group ${
          summary.racesWithOverrides > 0
            ? 'hover:shadow-amber-500/10 hover:border-amber-600'
            : 'hover:shadow-gray-500/10'
        }`}
        onClick={() => setShowOverridesDialog(true)}
      >
        {summary.racesWithOverrides > 0 && (
          <motion.div
            className="absolute inset-0 bg-amber-500/10"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${
            summary.racesWithOverrides > 0
              ? 'from-amber-500/5'
              : 'from-gray-500/5'
          } via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
          initial={false}
        />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-4">
            <motion.div 
              className={`p-3 rounded-lg ${
                summary.racesWithOverrides > 0
                  ? 'bg-amber-100 dark:bg-amber-900/20'
                  : 'bg-gray-100 dark:bg-gray-900/20'
              }`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Database className={`w-6 h-6 ${
                summary.racesWithOverrides > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`} />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">Data Overrides</p>
              <motion.p 
                className="text-2xl font-semibold"
                key={summary.totalOverriddenFields}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3 }}
              >
                {summary.totalOverriddenFields}
              </motion.p>
              <p className="text-xs text-muted-foreground">
                {summary.racesWithOverrides > 0
                  ? `${summary.racesWithOverrides} race${summary.racesWithOverrides !== 1 ? 's' : ''} modified`
                  : 'No changes made'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <ElectionAIInsights
        races={filteredRaces}
        compact={true}
        onClick={() => setShowAIInsights(!showAIInsights)}
        selectedRaceType={selectedRaceType}
        onRaceTypeChange={setSelectedRaceType}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3, type: "spring", stiffness: 100 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
      <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 group">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          initial={false}
        />
        <CardContent className="p-6 relative cursor-pointer hover:bg-muted/50 transition-colors" onClick={onNavigateToFeeds}>
          <div className="flex items-center gap-4">
            <motion.div 
              className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Rss className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">Data Providers</p>
              <motion.p 
                className="text-2xl font-semibold"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3 }}
              >
                1
              </motion.p>
              <p className="text-xs text-muted-foreground">
                1 active feed • AP
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );

  // Fetch synthetic groups using edge function (bypasses stuck client issue)
  const fetchSyntheticGroupsViaEdge = async () => {
    try {
      console.log('📦 Fetching synthetic groups via edge function...');
      const response = await fetch(
        getEdgeFunctionUrl('nova-election/synthetic-groups'),
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching synthetic groups:', errorData);
        return;
      }
      const result = await response.json();
      console.log('📦 Fetched synthetic groups via edge:', result.groups?.length || 0);
      setSyntheticGroups(result.groups || []);
    } catch (err) {
      console.error('Error fetching synthetic groups:', err);
    }
  };

  // Fetch synthetic groups on mount
  useEffect(() => {
    fetchSyntheticGroupsViaEdge();
  }, []);

  // Function to refresh synthetic groups (after creating a new group)
  const refreshSyntheticGroups = async () => {
    await fetchSyntheticGroupsViaEdge();
  };

  // Function to create a new synthetic group (via edge function)
  const handleCreateSyntheticGroup = async (name: string, description?: string): Promise<string | null> => {
    try {
      console.log('📦 Creating synthetic group via edge function:', name);
      const response = await fetch(
        getEdgeFunctionUrl('nova-election/synthetic-groups'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, description }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error creating synthetic group:', errorData);
        return null;
      }

      const result = await response.json();
      console.log('✅ Created synthetic group:', result.groupId);
      // Refresh groups after creation
      await refreshSyntheticGroups();
      return result.groupId || null;
    } catch (err) {
      console.error('Error creating synthetic group:', err);
      return null;
    }
  };

  const handleShowSyntheticRaces = (races: any[], groupId: string | null) => {
    console.log('🔍 Displaying synthetic races:', races, 'groupId:', groupId);
    setSelectedSyntheticGroupId(groupId);
    
    // Transform raw synthetic race data to match Race interface
    const transformedRaces = races.map(rawRace => {
      console.log('🔍 Raw synthetic race from backend:', JSON.stringify(rawRace, null, 2));
      
      // Backend returns nested structure: { race: {...}, candidates: [...], counties: [...] }
      const raceData = rawRace.race || rawRace;

      // First try rawRace.candidates (from e_synthetic_race_candidates table)
      // If empty, fallback to raceData.ai_response.candidates (newer races store candidates there)
      let candidatesData = Array.isArray(rawRace.candidates) && rawRace.candidates.length > 0
        ? rawRace.candidates
        : [];

      // Fallback to ai_response.candidates if candidatesData is empty
      const aiResponseCandidates = raceData.ai_response?.candidates;
      if (candidatesData.length === 0 && Array.isArray(aiResponseCandidates) && aiResponseCandidates.length > 0) {
        console.log('📌 Using ai_response.candidates fallback for race:', raceData.name);
        // Transform ai_response.candidates to match the expected format
        candidatesData = aiResponseCandidates.map((c: any, idx: number) => ({
          candidate_id: c.candidate_id || `synthetic-candidate-${idx}`,
          ballot_order: c.ballot_order || idx + 1,
          withdrew: c.withdrew || false,
          write_in: c.write_in || false,
          metadata: {
            candidate_name: c.candidate_name,
            party: c.party,
            headshot: c.headshot,
            ...c.metadata, // Include votes, vote_percentage, winner from nested metadata
          },
          candidate: null, // No linked candidate profile
        }));
      }

      console.log('📌 Extracted race fields:', {
        name: raceData.name,
        office: raceData.office,
        state: raceData.state,
        district: raceData.district,
        candidates_count: candidatesData.length,
        id: raceData.id,
        synthetic_race_id_source: raceData.id,
        all_keys: Object.keys(raceData),
        usedAiResponseFallback: candidatesData.length > 0 && rawRace.candidates?.length === 0
      });

      // Calculate total votes from candidates (metadata.metadata.votes - double nested!)
      const totalVotes = candidatesData.reduce((sum: number, c: any) => {
        const votes = c.metadata?.metadata?.votes || c.metadata?.votes || c.votes || 0;
        return sum + Number(votes);
      }, 0);

      // Transform the race data to match Race interface
      const transformedRace = {
        id: raceData.id,
        race_id: raceData.base_race_id || raceData.id,
        race_results_id: raceData.id,
        election_id: raceData.base_election_id || '',
        candidate_results_id: '',
        synthetic_race_id: raceData.id, // Add synthetic_race_id for delete functionality
        title: raceData.name || `Synthetic Race`,
        office: raceData.office || 'Unknown Office',
        state: raceData.state || 'Unknown',
        district: raceData.district,
        year: String(raceData.year || '2024'),
        raceType: 'SYNTHETIC',
        status: 'CALLED',
        reportingPercentage: 100,
        totalVotes: totalVotes,
        lastUpdated: raceData.created_at || new Date().toISOString(),
        candidates: candidatesData.map((c: any, idx: number) => {
          // Extract data from nested structure
          // c.candidate can be null, so we check c.metadata.candidate_name first
          const candidateInfo = c.candidate || {};
          const metadata = c.metadata || {};
          const nestedMetadata = metadata.metadata || {}; // votes are double nested!
          
          console.log('🔍 Candidate mapping:', {
            raw: c,
            candidateInfo,
            metadata,
            nestedMetadata,
            name: metadata.candidate_name || candidateInfo.full_name,
            party: metadata.party || candidateInfo.party_id,
            votes: nestedMetadata.votes || metadata.votes
          });
          
          return {
            id: c.candidate_id || `synthetic-candidate-${idx}`,
            candidate_results_id: c.candidate_results_id,
            race_candidates_id: c.candidate_id,
            name: metadata.candidate_name || candidateInfo.full_name || c.name || 'Unknown Candidate',
            party: (metadata.party || candidateInfo.party_id || c.party || 'IND').toUpperCase(),
            votes: Number(nestedMetadata.votes || metadata.votes || c.votes || 0),
            percentage: Number(nestedMetadata.vote_percentage || metadata.vote_percentage || metadata.percentage || c.percentage || 0),
            incumbent: Boolean(candidateInfo.incumbent || metadata.incumbent || c.incumbent),
            winner: Boolean(nestedMetadata.winner || metadata.winner || c.winner),
            withdrew: Boolean(metadata.withdrew || c.withdrew),
            headshot: metadata.headshot || candidateInfo.photo_url || candidateInfo.headshot || c.headshot,
            first_name: candidateInfo.first_name || metadata.candidate_name?.split(' ')[0],
            last_name: candidateInfo.last_name || metadata.candidate_name?.split(' ').slice(1).join(' '),
            ballot_order: metadata.ballot_order || c.ballot_order || idx + 1,
          };
        }),
        precincts_reporting: 100,
        precincts_total: 100,
        called_timestamp: raceData.created_at,
        uncontested: false,
        num_elect: 1,
        summary: raceData.summary, // Include summary from backend
        scenario_input: raceData.scenario_input, // Include scenario input from backend
      };
      
      console.log('✅ Transformed race:', {
        id: transformedRace.id,
        synthetic_race_id: transformedRace.synthetic_race_id,
        title: transformedRace.title,
        office: transformedRace.office,
        state: transformedRace.state,
        district: transformedRace.district,
        candidateCount: transformedRace.candidates.length,
        raceType: transformedRace.raceType
      });
      
      return transformedRace;
    });

    console.log('✅ All transformed synthetic races:', transformedRaces);
    setSyntheticRaces(transformedRaces);
    setShowingSyntheticRaces(true);
  };

  const handleHideSyntheticRaces = () => {
    setShowingSyntheticRaces(false);
    setSelectedSyntheticGroupId(null);
  };

  // Debug handler to show raw RPC data
  const handleDebugPayload = async () => {
    setIsLoadingDebugData(true);
    setShowDebugDialog(true);
    try {
      console.log('🔍 Fetching synthetic races using e_get_synthetic_races...');
      const { data, error } = await supabase.rpc('e_get_synthetic_races');
      
      if (error) {
        console.error('❌ RPC Error:', error);
        setDebugRPCData({ error: error.message });
      } else {
        console.log('✅ Raw RPC Response:', data);
        setDebugRPCData(data);
      }
    } catch (err) {
      console.error('❌ Failed to fetch debug data:', err);
      setDebugRPCData({ error: String(err) });
    } finally {
      setIsLoadingDebugData(false);
    }
  };

  const renderElectionFilters = () => (
    <ElectionFilters
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      selectedRaceType={selectedRaceType}
      onRaceTypeChange={handleRaceTypeChange}
      selectedStatus={selectedStatus}
      onStatusChange={setSelectedStatus}
      selectedState={selectedState}
      onStateChange={setSelectedState}
      selectedYear={selectedYear}
      onYearChange={setSelectedYear}
      onClearFilters={clearFilters}
      states={states}
      races={displayRaces}
      resultCount={filteredRaces.length}
      lastUpdated={lastUpdated}
      syntheticGroups={syntheticGroups}
      selectedSyntheticGroupId={selectedSyntheticGroupId}
      onShowSyntheticRaces={handleShowSyntheticRaces}
      showingSyntheticRaces={showingSyntheticRaces}
      onHideSyntheticRaces={handleHideSyntheticRaces}
      onDebugPayload={handleDebugPayload}
      isLoadingDebugData={isLoadingDebugData}
    />
  );

  return (
    <div className="space-y-6 relative">
      {/* Fixed Loading Indicator */}
      {isLoadingFiltered && (
        <div style={{top:"calc(var(--spacing) * 0.5)"} } className="fixed right-4 z-50 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg border border-gray-200 dark:border-gray-700">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 5
              }}
            >
              <Vote className="w-6 h-6 text-blue-600" />
            </motion.div>
            Elections Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage AP Election data with comprehensive race tracking and real-time updates
          </p>
        </div>
        <div className="flex items-center gap-4">
          <motion.div 
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Last updated ({new Date(lastUpdated).toLocaleTimeString()})
          </motion.div>
        </div>
      </div>

      {renderSummaryCards()}

      {/* Expanded AI Insights Section */}
      {showAIInsights && (
        <ElectionAIInsights 
          races={filteredRaces} 
          listView={true} 
          selectedRaceType={selectedRaceType}
          onRaceTypeChange={setSelectedRaceType}
        />
      )}

      {/* Overrides Management Dialog */}
      <Dialog open={showOverridesDialog} onOpenChange={setShowOverridesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-600" />
              Election Data Overrides
            </DialogTitle>
            <DialogDescription>
              Manage custom modifications you've made to election data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {summary.totalOverriddenFields === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data overrides yet
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {summary.totalOverriddenFields} override{summary.totalOverriddenFields === 1 ? '' : 's'} across {summary.racesWithOverrides} race{summary.racesWithOverrides === 1 ? '' : 's'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllOverrides}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Global Candidate Name Overrides */}
                  {(() => {
                    // Collect unique candidate name overrides across all races
                    const candidateNameOverrides = new Map<string, { candidateId: string; original: string, name: string; raceCount: number }>();

                    // First pass: identify all candidates with name overrides
                    displayRaces.forEach((race: Race) => {
                      race.candidates.forEach(candidate => {
                        if (isFieldOverridden(candidate.name) && !candidateNameOverrides.has(candidate.id)) {
                          candidateNameOverrides.set(candidate.id, {
                            candidateId: candidate.id,
                            original: candidate.name.originalValue,
                            name: getFieldValue(candidate.name),
                            raceCount: 0
                          });
                        }
                      });
                    });

                    // Second pass: count how many races each candidate appears in (across ALL races)
                    candidateNameOverrides.forEach((override, candidateId) => {
                      let count = 0;
                      displayRaces.forEach((race: Race) => {
                        if (race.candidates.some(c => c.id === candidateId)) {
                          count++;
                        }
                      });
                      override.raceCount = count;
                    });

                    console.log('candidateNameOverridesssssss')
                    console.log(candidateNameOverrides)

                    if (candidateNameOverrides.size > 0) {
                      return (
                        <div className="border rounded-lg p-4 space-y-3 bg-blue-50/50 dark:bg-blue-950/20">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Global Candidate Name Overrides</h3>
                            <Badge variant="outline" className="text-xs">
                              {candidateNameOverrides.size} candidate{candidateNameOverrides.size === 1 ? '' : 's'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            These name overrides apply across all races featuring these candidates
                          </p>
                          <div className="space-y-2">
                            {Array.from(candidateNameOverrides.values()).map(override => (
                              <div
                                key={override.candidateId}
                                className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded hover:bg-muted transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium"><s>{override.original}</s> → {override.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Applies to {override.raceCount} race{override.raceCount === 1 ? '' : 's'}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => clearGlobalCandidateFieldOverride(override.candidateId, 'name')}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Clear All
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Global Candidate Incumbent Overrides */}
                  {(() => {
                    // Collect unique candidate incumbent overrides across all races
                    const candidateIncumbentOverrides = new Map<string, { candidateId: string; original: boolean; name: string; incumbent: boolean; raceCount: number }>();

                    // First pass: identify all candidates with incumbent overrides
                    displayRaces.forEach((race: Race) => {
                      race.candidates.forEach(candidate => {
                        if (isFieldOverridden(candidate.incumbent) && !candidateIncumbentOverrides.has(candidate.id)) {
                          candidateIncumbentOverrides.set(candidate.id, {
                            candidateId: candidate.id,
                            original: candidate.incumbent.originalValue,
                            name: getFieldValue(candidate.name),
                            incumbent: getFieldValue(candidate.incumbent),
                            raceCount: 0
                          });
                        }
                      });
                    });

                    // Second pass: count how many races each candidate appears in (across ALL races)
                    candidateIncumbentOverrides.forEach((override, candidateId) => {
                      let count = 0;
                      displayRaces.forEach((race: Race) => {
                        if (race.candidates.some(c => c.id === candidateId)) {
                          count++;
                        }
                      });
                      override.raceCount = count;
                    });

                    if (candidateIncumbentOverrides.size > 0) {
                      return (
                        <div className="border rounded-lg p-4 space-y-3 bg-green-50/50 dark:bg-green-950/20">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Global Candidate Incumbent Overrides</h3>
                            <Badge variant="outline" className="text-xs">
                              {candidateIncumbentOverrides.size} candidate{candidateIncumbentOverrides.size === 1 ? '' : 's'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            These incumbent status overrides apply across all races featuring these candidates
                          </p>
                          <div className="space-y-2">
                            {Array.from(candidateIncumbentOverrides.values()).map(override => (
                              <div
                                key={override.candidateId}
                                className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded hover:bg-muted transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{override.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Incumbent: <s>{override.original ? 'Yes' : 'No'}</s> → {override.incumbent ? 'Yes' : 'No'} • Applies to {override.raceCount} race{override.raceCount === 1 ? '' : 's'}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => clearGlobalCandidateFieldOverride(override.candidateId, 'incumbent')}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Clear All
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Race-specific Overrides */}
                  {displayRaces.map((race: Race) => {
                    const raceOverrides: Array<{ field: string; label: string; original: any; value: any; clearFn: () => void }> = [];

                    // Check race-level overrides
                    if (isFieldOverridden(race.title)) {
                      raceOverrides.push({
                        field: 'title',
                        label: 'Race Title',
                        original: race.title.originalValue,
                        value: getFieldValue(race.title),
                        clearFn: () => clearRaceOverride(race, 'title')
                      });
                    }
                    if (isFieldOverridden(race.status)) {
                      raceOverrides.push({
                        field: 'status',
                        label: 'Status',
                        original: race.status.originalValue,
                        value: getFieldValue(race.status),
                        clearFn: () => clearRaceOverride(race, 'status')
                      });
                    }
                    if (isFieldOverridden(race.reportingPercentage)) {
                      raceOverrides.push({
                        field: 'reportingPercentage',
                        label: 'Reporting Percentage',
                        original: `${race.reportingPercentage.originalValue}%`,
                        value: `${getFieldValue(race.reportingPercentage)}%`,
                        clearFn: () => clearRaceOverride(race, 'reportingPercentage')
                      });
                    }
                    if (isFieldOverridden(race.precincts_reporting)) {
                      raceOverrides.push({
                        field: 'precincts_reporting',
                        label: 'Precincts Reporting',
                        original: race.precincts_reporting.originalValue,
                        value: getFieldValue(race.precincts_reporting),
                        clearFn: () => clearRaceOverride(race, 'precincts_reporting')
                      });
                    }
                    if (isFieldOverridden(race.totalVotes)) {
                      raceOverrides.push({
                        field: 'totalVotes',
                        label: 'Total Votes',
                        original: race.totalVotes.originalValue.toLocaleString(),
                        value: getFieldValue(race.totalVotes).toLocaleString(),
                        clearFn: () => clearRaceOverride(race, 'totalVotes')
                      });
                    }

                    // Check candidate-level overrides (excluding global fields: name and incumbent)
                    const candidateOverrides: Array<{ candidateId: string; candidateName: string; field: string; label: string; original: any; value: any; clearFn: () => void }> = [];
                    race.candidates.forEach((candidate: any) => {
                      // Skip name and incumbent - they're shown in global sections
                      // These are stored in e_candidates table and apply across all races
                      if (isFieldOverridden(candidate.winner)) {
                        candidateOverrides.push({
                          candidateId: candidate.id,
                          candidateName: getFieldValue(candidate.name),
                          field: 'winner',
                          label: 'Winner',
                          original: candidate.winner.originalValue ? 'Yes' : 'No',
                          value: getFieldValue(candidate.winner) ? 'Yes' : 'No',
                          clearFn: () => clearCandidateOverride(race, candidate.id, 'winner')
                        });
                      }
                      if (isFieldOverridden(candidate.votes)) {
                        candidateOverrides.push({
                          candidateId: candidate.id,
                          candidateName: getFieldValue(candidate.name),
                          field: 'votes',
                          label: 'Votes',
                          original: candidate.votes.originalValue.toLocaleString(),
                          value: getFieldValue(candidate.votes).toLocaleString(),
                          clearFn: () => clearCandidateOverride(race, candidate.id, 'votes')
                        });
                      }
                      if (isFieldOverridden(candidate.percentage)) {
                        candidateOverrides.push({
                          candidateId: candidate.id,
                          candidateName: getFieldValue(candidate.name),
                          field: 'percentage',
                          label: 'Percentage',
                          original: `${candidate.percentage.originalValue}%`,
                          value: `${getFieldValue(candidate.percentage)}%`,
                          clearFn: () => clearCandidateOverride(race, candidate.id, 'percentage')
                        });
                      }
                      if (isFieldOverridden(candidate.withdrew)) {
                        candidateOverrides.push({
                          candidateId: candidate.id,
                          candidateName: getFieldValue(candidate.name),
                          field: 'withdrew',
                          label: 'withdrew',
                          original: candidate.withdrew.originalValue ? 'Yes' : 'No',
                          value: getFieldValue(candidate.withdrew) ? 'Yes' : 'No',
                          clearFn: () => clearCandidateOverride(race, candidate.id, 'withdrew')
                        });
                      }
                    });

                    // Only render if there are overrides for this race
                    if (raceOverrides.length === 0 && candidateOverrides.length === 0) {
                      return null;
                    }

                    return (
                      <div key={race.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm">{getFieldValue(race.title)}</h3>
                          <Badge variant="outline" className="text-xs">
                            {raceOverrides.length + candidateOverrides.length} override{raceOverrides.length + candidateOverrides.length === 1 ? '' : 's'}
                          </Badge>
                        </div>

                        {/* Race-level overrides */}
                        {raceOverrides.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Race Fields</p>
                            {raceOverrides.map(override => (
                              <div
                                key={override.field}
                                className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{override.label}</p>
                                  <p className="text-xs text-muted-foreground truncate"><s>{override.original}</s> → {override.value}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={override.clearFn}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Clear
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Candidate-level overrides */}
                        {candidateOverrides.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Candidate Fields</p>
                            {candidateOverrides.map((override, idx) => (
                              <div
                                key={`${override.candidateId}-${override.field}`}
                                className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{override.candidateName} - {override.label}</p>
                                  <p className="text-xs text-muted-foreground truncate"><s>{override.original}</s> → {override.value}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={override.clearFn}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Clear
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <TabsTrigger value="all-races" className="flex items-center gap-2 w-full">
              <motion.div
                animate={{ rotate: activeTab === 'all-races' ? [0, 5, -5, 0] : 0 }}
                transition={{ duration: 0.3 }}
              >
                <List className="w-4 h-4" />
              </motion.div>
              All Races
            </TabsTrigger>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <TabsTrigger value="summary" className="flex items-center gap-2 w-full">
              <motion.div
                animate={{ rotate: activeTab === 'summary' ? [0, 5, -5, 0] : 0 }}
                transition={{ duration: 0.3 }}
              >
                <BarChart3 className="w-4 h-4" />
              </motion.div>
              Summary
            </TabsTrigger>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <TabsTrigger value="candidates" className="flex items-center gap-2 w-full">
              <motion.div
                animate={{ rotate: activeTab === 'candidates' ? [0, 5, -5, 0] : 0 }}
                transition={{ duration: 0.3 }}
              >
                <Users className="w-4 h-4" />
              </motion.div>
              Candidates
            </TabsTrigger>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <TabsTrigger value="parties" className="flex items-center gap-2 w-full">
              <motion.div
                animate={{ rotate: activeTab === 'parties' ? [0, 5, -5, 0] : 0 }}
                transition={{ duration: 0.3 }}
              >
                <Flag className="w-4 h-4" />
              </motion.div>
              Parties
            </TabsTrigger>
          </motion.div>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {/* Filters */}
          {renderElectionFilters()}

          {/* Full width summary - breaks out of container */}
          <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-8">
            <ElectionSummary races={displayRaces} onUpdateRace={handleUpdateRace} />
          </div>
        </TabsContent>

        <TabsContent value="all-races" className="space-y-6">
          {/* Filters */}
          {renderElectionFilters()}

          {/* Race Cards */}
          <div className="grid gap-6">

            {showingSyntheticRaces ? (
              syntheticRaces.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No synthetic races found.</p>
                  <Button variant="outline" onClick={() => setShowingSyntheticRaces(false)} className="mt-4">
                    Back to Real Races
                  </Button>
                </div>
              ) : (
                syntheticRaces.map((syntheticRace, index) => {
                  console.log('🎨 RENDERING SYNTHETIC RACE:', {
                    index,
                    id: syntheticRace.id,
                    title: syntheticRace.title,
                    office: syntheticRace.office,
                    state: syntheticRace.state,
                    'typeof title': typeof syntheticRace.title,
                    'typeof office': typeof syntheticRace.office,
                    'typeof state': typeof syntheticRace.state,
                    fullRace: syntheticRace
                  });
                  
                  return (
                    <motion.div
                      key={syntheticRace.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.3, 
                        delay: index * 0.05, 
                        type: "spring", 
                        stiffness: 100 
                      }}
                    >
                      <RaceCard
                        race={syntheticRace}
                        onUpdateRace={handleUpdateRace}
                        onDeleteRace={handleDeleteRace}
                        parties={displayParties}
                        syntheticGroups={syntheticGroups}
                        onCreateGroup={handleCreateSyntheticGroup}
                        onGroupsChange={refreshSyntheticGroups}
                      />
                    </motion.div>
                  );
                })
              )
            ) : filteredRaces.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No races found matching your filters.</p>
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              </div>
            ) : (
              filteredRaces.map((race, index) => (
                <motion.div
                  key={race.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.05, 
                    type: "spring", 
                    stiffness: 100 
                  }}
                >
                  <RaceCard
                    race={race}
                    onUpdateRace={handleUpdateRace}
                    onDeleteRace={handleDeleteRace}
                    parties={displayParties}
                    syntheticGroups={syntheticGroups}
                    onCreateGroup={handleCreateSyntheticGroup}
                    onGroupsChange={refreshSyntheticGroups}
                  />
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-6">
          {/* Filters */}
          {renderElectionFilters()}

          {/* Candidates Search */}
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search candidates by name, party, or office..."
              value={candidateSearchTerm}
              onChange={(e) => setCandidateSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Badge variant="secondary">{displayCandidates.filter(c =>
              c.fullName.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
              c.party.toLowerCase().includes(candidateSearchTerm.toLowerCase())
            ).length} candidates</Badge>
          </div>

          {/* Candidates Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Current Races</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bio</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayCandidates
                    .filter(candidate =>
                      candidateSearchTerm === '' ||
                      candidate.fullName.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
                      candidate.party.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
                      candidate.occupation?.some(occ => occ.toLowerCase().includes(candidateSearchTerm.toLowerCase()))
                    )
                    .map((candidate, index) => {
                      const partyData = displayParties.find(p => p.code === candidate.party);
                      return (
                        <motion.tr
                          key={candidate.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ 
                            duration: 0.2, 
                            delay: index * 0.03,
                            type: "spring",
                            stiffness: 100
                          }}
                          whileHover={{ 
                            backgroundColor: "rgba(59, 130, 246, 0.05)",
                            transition: { duration: 0.2 }
                          }}
                          className="border-b"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={candidate.headshot} alt={candidate.fullName} />
                                  <AvatarFallback>{candidate.firstName[0]}{candidate.lastName[0]}</AvatarFallback>
                                </Avatar>
                              </motion.div>
                              <div>
                                <p className="font-medium">{candidate.fullName}</p>
                                <p className="text-sm text-muted-foreground">{candidate.occupation?.join(', ')}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              <Badge
                                style={{
                                  backgroundColor: partyData?.colors.light || '#9333EA',
                                  color: partyData?.colors.dark || '#6B21A8'
                                }}
                              >
                                {partyData?.abbreviations[0] || candidate.party}
                              </Badge>
                            </motion.div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {candidate.currentRaces?.map(raceId => {
                                const race = displayRaces.find(r => r.id === raceId);
                                return race ? (
                                  <div key={raceId} className="text-sm">
                                    {getFieldValue(race.title)}
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2"> 
                              {candidate.incumbent && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 200 }}
                                >
                                  <Badge variant="outline" className="text-xs">Incumbent</Badge>
                                </motion.div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm text-muted-foreground truncate">
                              {candidate.bio}
                            </p>
                          </TableCell>
                          <TableCell>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingCandidate(candidate)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parties" className="space-y-6">
          {/* Filters */}
          {renderElectionFilters()}

          {/* Parties Search */}
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search parties by name or abbreviation..."
              value={partySearchTerm}
              onChange={(e) => setPartySearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Badge variant="secondary">{displayParties.filter(p =>
              p.name.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
              p.abbreviations.some(a => a.toLowerCase().includes(partySearchTerm.toLowerCase()))
            ).length} parties</Badge>
          </div>

          {/* Parties Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {displayParties
              .filter(party =>
                partySearchTerm === '' ||
                party.name.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
                party.fullName.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
                party.abbreviations.some(a => a.toLowerCase().includes(partySearchTerm.toLowerCase()))
              )
              .map((party, index) => (
                <motion.div
                  key={party.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ 
                    y: -4,
                    transition: { duration: 0.2 }
                  }}
                >
                <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-lg group">
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ 
                      background: `linear-gradient(135deg, ${party.colors.primary}10 0%, transparent 100%)`
                    }}
                    initial={false}
                  />
                  <CardContent className="p-6 relative">
                    <div className="space-y-4">
                      {/* Party Header */}
                      <div className="flex items-start gap-4">
                        <motion.div 
                          className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
                          style={{ backgroundColor: party.colors.primary }}
                          whileHover={{ 
                            scale: 1.1, 
                            rotate: 5,
                            transition: { type: "spring", stiffness: 400 }
                          }}
                        >
                          {party.code}
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{party.fullName}</h3>
                          <p className="text-sm text-muted-foreground">{party.name}</p>
                          {party.founded && (
                            <p className="text-xs text-muted-foreground mt-1">Founded: {party.founded}</p>
                          )}
                        </div>
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingParty(party)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      </div>

                      {/* Abbreviations & Aliases */}
                      <div>
                        <p className="text-sm font-medium mb-2">Abbreviations</p>
                        <div className="flex flex-wrap gap-2">
                          {party.abbreviations.map(abbr => (
                            <Badge 
                              key={abbr} 
                              variant="outline"
                              style={{ borderColor: party.colors.primary }}
                            >
                              {abbr}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {party.aliases && party.aliases.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Also known as</p>
                          <p className="text-sm text-muted-foreground">{party.aliases.join(', ')}</p>
                        </div>
                      )}

                      {/* Description */}
                      {party.description && (
                        <div>
                          <p className="text-sm font-medium mb-2">About</p>
                          <p className="text-sm text-muted-foreground">{party.description}</p>
                        </div>
                      )}

                      {/* Ideology */}
                      {party.ideology && (
                        <div>
                          <p className="text-sm font-medium mb-2">Ideology</p>
                          <p className="text-sm text-muted-foreground">{party.ideology}</p>
                        </div>
                      )}

                      {/* Leaders */}
                      {party.leaders && party.leaders.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Leadership</p>
                          <div className="space-y-2">
                            {party.leaders.map((leader, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{leader.title}</span>
                                <span className="font-medium">{leader.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Headquarters */}
                      {party.headquarters && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Headquarters</span>
                            <span>{party.headquarters}</span>
                          </div>
                        </div>
                      )}

                      {/* Color Palette */}
                      <div>
                        <p className="text-sm font-medium mb-2">Color Palette</p>
                        <div className="flex gap-2">
                          {Object.entries(party.colors).map(([name, color]) => (
                            <div key={name} className="flex flex-col items-center gap-1">
                              <div 
                                className="w-10 h-10 rounded border"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-xs text-muted-foreground capitalize">{name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Candidate Dialog */}
      {editingCandidate && handleUpdateCandidate && (
        <EditCandidateDialog
          candidate={editingCandidate}
          parties={parties}
          open={!!editingCandidate}
          onOpenChange={(open) => !open && setEditingCandidate(null)}
          onSave={handleUpdateCandidate}
        />
      )}

      {/* Edit Party Dialog */}
      {editingParty && (
        <EditPartyDialog
          party={editingParty}
          open={!!editingParty}
          onOpenChange={(open) => !open && setEditingParty(null)}
          onSave={handleUpdateParty}
        />
      )}

      {/* Debug Payload Dialog */}
      <Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>🐛 Synthetic Races Debug Payload</DialogTitle>
            <DialogDescription>
              Raw data structure from e_get_synthetic_races RPC
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingDebugData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3">Fetching RPC data...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Database className="w-4 h-4" />
                  <span>
                    {debugRPCData?.error 
                      ? 'Error fetching data'
                      : `${Array.isArray(debugRPCData) ? debugRPCData.length : 0} race${Array.isArray(debugRPCData) && debugRPCData.length !== 1 ? 's' : ''} from RPC`
                    }
                  </span>
                </div>
                
                {debugRPCData?.error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">RPC Error</span>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-300">{debugRPCData.error}</p>
                  </div>
                )}
                
                <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[60vh]">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(debugRPCData, null, 2)}
                  </pre>
                </div>
                
                {/* Mapping Hints */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="text-sm space-y-2">
                    <div className="font-medium text-blue-900 dark:text-blue-100">Expected Structure:</div>
                    <div className="text-xs font-mono text-blue-800 dark:text-blue-200 space-y-1">
                      <div>• <strong>candidates[].candidate.full_name</strong> → Card name</div>
                      <div>• <strong>candidates[].candidate.party_id</strong> → Card party</div>
                      <div>• <strong>candidates[].metadata.votes</strong> → Vote count</div>
                      <div>• <strong>candidates[].metadata.vote_percentage</strong> → Percentage</div>
                      <div>• <strong>name</strong> → Race title</div>
                      <div>• <strong>office</strong> → Race office</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(debugRPCData, null, 2));
                      alert('Payload copied to clipboard!');
                    }}
                  >
                    Copy to Clipboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('=== SYNTHETIC RACES RAW RPC PAYLOAD ===');
                      console.log('Raw Data:', debugRPCData);
                      console.log('Stringified:', JSON.stringify(debugRPCData, null, 2));
                      if (Array.isArray(debugRPCData) && debugRPCData.length > 0) {
                        console.log('First race structure:', debugRPCData[0]);
                        console.log('First race candidates:', debugRPCData[0]?.candidates);
                      }
                      alert('Payload logged to console. Press F12 to view.');
                    }}
                  >
                    Log to Console
                  </Button>
                  <Button onClick={() => setShowDebugDialog(false)}>
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
