import { useSyntheticRaceWorkflow, ScenarioInput, AIProvider, SyntheticPreview, SyntheticGroup } from "../utils/useSyntheticRaceWorkflow";
import { Race, Candidate, getFieldValue, Party } from "../types/election";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Slider } from "./ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Bug,
  Plus,
  X,
  Search,
  UserPlus,
  Eye,
  Users,
  CheckCircle,
  FolderPlus,
  Database
} from "lucide-react";
import { supabase } from "../utils/supabase/client";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";

// State name to code mapping
const STATE_NAME_TO_CODE: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC', 'Puerto Rico': 'PR', 'Guam': 'GU', 'Virgin Islands': 'VI',
  'American Samoa': 'AS', 'Northern Mariana Islands': 'MP'
};

// Helper to get state code from state name or code
const getStateCode = (stateNameOrCode: string): string => {
  // If it's already a 2-letter code, return it
  if (stateNameOrCode.length === 2) {
    return stateNameOrCode.toUpperCase();
  }
  // Otherwise, look it up in the mapping
  return STATE_NAME_TO_CODE[stateNameOrCode] || stateNameOrCode;
};

// Party color mapping (fallback when parties data not available)
const fallbackPartyColors: Record<string, string> = {
  'DEM': '#0015BC',
  'Dem': '#0015BC',
  'GOP': '#E81B23',
  'REP': '#E81B23',
  'Rep': '#E81B23',
  'IND': '#9333EA',
  'Ind': '#9333EA',
  'GRN': '#2fa82f',
  'Grn': '#2fa82f',
  'LIB': '#efcb0a',
  'Lib': '#efcb0a',
  'OTH': '#808080',
  'Oth': '#808080'
};

// Helper function to get party color from database metadata or fallback
const getDynamicPartyColor = (partyCode: string, parties?: Party[]): string => {
  // First, check if we have parties data from backend
  if (parties && parties.length > 0) {
    const party = parties.find(p => p.code === partyCode || p.code === partyCode.toUpperCase());
    if (party && party.colors?.primary) {
      return party.colors.primary;
    }
  }
  // Fallback to hardcoded colors
  return fallbackPartyColors[partyCode] || fallbackPartyColors[partyCode.toUpperCase()] || '#808080';
};

// Helper function to normalize party abbreviation to party code
const normalizePartyCode = (partyAbbrev?: string): 'DEM' | 'REP' | 'IND' | 'GRN' | 'LIB' | 'OTH' => {
  if (!partyAbbrev) return 'IND';
  
  const abbrev = partyAbbrev.toUpperCase();
  
  // Direct match
  if (['DEM', 'REP', 'IND', 'GRN', 'LIB', 'OTH'].includes(abbrev)) {
    return abbrev as 'DEM' | 'REP' | 'IND' | 'GRN' | 'LIB' | 'OTH';
  }
  
  // Common abbreviations
  const mapping: Record<string, 'DEM' | 'REP' | 'IND' | 'GRN' | 'LIB' | 'OTH'> = {
    'D': 'DEM',
    'DEM': 'DEM',
    'DEMOCRAT': 'DEM',
    'DEMOCRATIC': 'DEM',
    'R': 'REP',
    'REP': 'REP',
    'REPUBLICAN': 'REP',
    'GOP': 'REP',
    'I': 'IND',
    'IND': 'IND',
    'INDEPENDENT': 'IND',
    'G': 'GRN',
    'GRN': 'GRN',
    'GREEN': 'GRN',
    'L': 'LIB',
    'LIB': 'LIB',
    'LIBERTARIAN': 'LIB',
  };
  
  return mapping[abbrev] || 'OTH';
};

interface CandidateProfile {
  id: string;
  full_name?: string;
  fullName?: string;
  party?: string;
  party_abbreviation?: string;
  party_name?: string;
  photo_url?: string;
  photov?: string;
  headshot?: string;
  incumbent?: boolean;
}

interface GenerateSyntheticScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  race: Race;
  candidates: Candidate[];
  providers: AIProvider[];
  syntheticGroups: SyntheticGroup[]; // Available synthetic groups
  onCreateGroup: (name: string, description?: string) => Promise<string | null>; // Callback to create new group
  onSubmitWorkflow: (scenario: ScenarioInput, modifiedCandidates: Candidate[]) => Promise<SyntheticPreview | null>;
  onConfirmSave: (synthetic: SyntheticPreview) => Promise<{ success: boolean; syntheticRaceId?: string; error?: string }>;
  isLoading: boolean;
  parties?: Party[]; // Add parties prop for dynamic party colors
}

type Step = 'input' | 'preview' | 'save';

export function GenerateSyntheticScenarioModal({
  isOpen,
  onClose,
  race,
  candidates,
  providers,
  syntheticGroups,
  onCreateGroup,
  onSubmitWorkflow,
  onConfirmSave,
  isLoading,
  parties
}: GenerateSyntheticScenarioModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [preview, setPreview] = useState<SyntheticPreview | null>(null);
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [showDebugPayload, setShowDebugPayload] = useState(false);
  const [debugAIResponse, setDebugAIResponse] = useState<any>(null); // Changed from debugAIPayload
  const [debugRPCPayload, setDebugRPCPayload] = useState<any>(null);
  const [aiPromptPreview, setAiPromptPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successRaceId, setSuccessRaceId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Form state
  const [scenarioName, setScenarioName] = useState('');
  const [turnoutShift, setTurnoutShift] = useState<number>(0);
  const [republicanShift, setRepublicanShift] = useState<number>(0);
  const [democratShift, setDemocratShift] = useState<number>(0);
  const [independentShift, setIndependentShift] = useState<number>(0);
  const [countyStrategy, setCountyStrategy] = useState<string>('uniform');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // Candidate management state
  const [modifiedCandidates, setModifiedCandidates] = useState<Candidate[]>([]);
  const [showCandidateSearch, setShowCandidateSearch] = useState(false);
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CandidateProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [manualCandidateName, setManualCandidateName] = useState('');
  const [manualCandidateParty, setManualCandidateParty] = useState<'DEM' | 'REP' | 'IND' | 'GRN' | 'LIB' | 'OTH'>('IND');
  const [showSearchDebug, setShowSearchDebug] = useState(false);

  // Synthetic group selection state
  // Use '__NEW__' as a special marker to indicate creating a new group
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);


  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setPreview(null);
      setShowDataPreview(false);
      setScenarioName('');
      setTurnoutShift(0);
      setRepublicanShift(0);
      setDemocratShift(0);
      setIndependentShift(0);
      setCountyStrategy('uniform');
      setCustomInstructions('');
      setModifiedCandidates([]);
      setShowCandidateSearch(false);
      setCandidateSearchTerm('');
      setSearchResults([]);
      setManualCandidateName('');
      setManualCandidateParty('IND');
      setShowSuccessDialog(false);
      setSuccessRaceId('');
      setErrorMessage('');
      // Reset group selection state
      setSelectedGroupId('');
      setNewGroupName('');
      setNewGroupDescription('');
    } else {
      // Initialize with current candidates when modal opens
      setModifiedCandidates([...candidates]);
      // Auto-select default group if available
      if (syntheticGroups.length > 0 && !selectedGroupId) {
        const defaultGroup = syntheticGroups.find(g => g.name === 'Default');
        setSelectedGroupId(defaultGroup?.id || syntheticGroups[0].id);
      }
    }
  }, [isOpen, candidates, syntheticGroups]);

  // Auto-select first provider if available
  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0].id);
    }
  }, [providers]);

  const handleGeneratePreview = async () => {
    // Validation
    if (!scenarioName.trim()) {
      alert('Please enter a scenario name');
      return;
    }
    if (!selectedProvider) {
      alert('Please select an AI provider');
      return;
    }

    const scenario: ScenarioInput = {
      name: scenarioName,
      turnoutShift,
      republicanShift,
      democratShift,
      independentShift,
      countyStrategy,
      customInstructions,
      aiProvider: selectedProvider,
    };

    const result = await onSubmitWorkflow(scenario, modifiedCandidates);
    if (result) {
      console.log('🎯 PREVIEW RESULT FROM WORKFLOW:', result);
      console.log('🎯 Preview aiResponse:', result.aiResponse);
      console.log('🎯 Preview aiResponse candidates:', result.aiResponse?.candidates);
      console.log('🎯 Preview synthesizedResults:', result.synthesizedResults);
      setPreview(result);
      setStep('preview');
    }
  };

  // Handler to proceed to save step (group selection)
  const handleProceedToSave = () => {
    if (!preview) return;
    setStep('save');
  };

  const handleSave = async () => {
    if (!preview) return;

    // Determine which group to save to
    let groupIdToSave = selectedGroupId;

    // If user typed a new group name, create the group first
    if (newGroupName.trim()) {
      setIsCreatingGroup(true);
      try {
        const newGroupId = await onCreateGroup(newGroupName.trim(), newGroupDescription.trim() || undefined);
        if (!newGroupId) {
          alert('Failed to create group. Please try again.');
          setIsCreatingGroup(false);
          return;
        }
        groupIdToSave = newGroupId;
        console.log('✅ Created new group:', newGroupId);
      } catch (err) {
        console.error('Error creating group:', err);
        alert('Failed to create group. Please try again.');
        setIsCreatingGroup(false);
        return;
      }
      setIsCreatingGroup(false);
    }

    // Validate we have a group to save to
    if (!groupIdToSave || groupIdToSave === '__NEW__') {
      alert('Please select a synthetic group or enter a new group name');
      return;
    }

    console.log('💾 SAVING WITH PREVIEW:', preview);
    console.log('💾 Preview aiResponse:', preview.aiResponse);
    console.log('💾 Preview aiResponse candidates:', preview.aiResponse?.candidates);
    console.log('💾 Preview synthesizedResults:', preview.synthesizedResults);
    console.log('💾 Saving to group:', groupIdToSave);

    // Update the preview scenario with the selected group ID
    const updatedPreview: SyntheticPreview = {
      ...preview,
      scenario: {
        ...preview.scenario,
        syntheticGroupId: groupIdToSave,
      }
    };

    const result = await onConfirmSave(updatedPreview);
    if (result.success) {
      // Close modal and optionally navigate
      onClose();

      // Note: Navigation should be handled by parent component
      // For now, just show success message
      setSuccessRaceId(result.syntheticRaceId || '');
      setShowSuccessDialog(true);
    } else {
      setErrorMessage(result.error || 'Unknown error');
      setShowSuccessDialog(true);
    }
  };

  const handleBack = () => {
    if (step === 'save') {
      setStep('preview');
    } else {
      setStep('input');
      setPreview(null);
    }
  };

  const raceTitle = getFieldValue(race.title);
  const raceTotalVotes = getFieldValue(race.totalVotes);

  // Search for candidates from backend
  const handleSearchCandidates = async () => {
    if (!candidateSearchTerm.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        getRestUrl('rpc/e_search_candidates'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getSupabaseAnonKey()}`,
            'apikey': getSupabaseAnonKey(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_query: candidateSearchTerm
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        if (data.length === 0) {
          console.log('No candidates found for:', candidateSearchTerm);
        }
      } else {
        console.error('Search failed:', response.status, await response.text());
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching candidates:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Add candidate from search results
  const handleAddCandidateFromSearch = (candidateProfile: CandidateProfile) => {
    // Normalize party code from party_abbreviation or party field
    const partyCode = normalizePartyCode(
      candidateProfile.party_abbreviation || candidateProfile.party
    );
    
    console.log('Adding candidate from search:', {
      name: candidateProfile.full_name || candidateProfile.fullName,
      raw_party_abbreviation: candidateProfile.party_abbreviation,
      raw_party: candidateProfile.party,
      normalized_party: partyCode
    });

    const newCandidate: Candidate = {
      id: `synthetic_${Date.now()}_${Math.random()}`,
      name: candidateProfile.full_name || candidateProfile.fullName || '',
      party: partyCode,
      votes: 0,
      percentage: 0,
      incumbent: candidateProfile.incumbent || false,
      headshot: candidateProfile.photo_url || candidateProfile.photov || candidateProfile.headshot || undefined,
    };

    setModifiedCandidates([...modifiedCandidates, newCandidate]);
    setShowCandidateSearch(false);
    setCandidateSearchTerm('');
    setSearchResults([]);
  };

  // Add manual candidate
  const handleAddManualCandidate = () => {
    if (!manualCandidateName.trim()) {
      alert('Please enter a candidate name');
      return;
    }

    const newCandidate: Candidate = {
      id: `synthetic_${Date.now()}_${Math.random()}`,
      name: manualCandidateName,
      party: manualCandidateParty,
      votes: 0,
      percentage: 0,
      incumbent: false,
    };

    setModifiedCandidates([...modifiedCandidates, newCandidate]);
    setManualCandidateName('');
    setManualCandidateParty('IND');
  };

  // Remove candidate
  const handleRemoveCandidate = (candidateId: string) => {
    setModifiedCandidates(modifiedCandidates.filter(c => c.id !== candidateId));
  };

  // Build preview data display
  const buildDataPreview = () => {
    const raceOffice = getFieldValue(race.office);
    const raceStatus = getFieldValue(race.status);
    const reportingPct = getFieldValue(race.reportingPercentage);
    
    const candidateData = modifiedCandidates.map(c => ({
      name: getFieldValue(c.name),
      party: getFieldValue(c.party),
      votes: getFieldValue(c.votes),
      percentage: getFieldValue(c.percentage),
      incumbent: getFieldValue(c.incumbent),
      winner: getFieldValue(c.winner || false),
    }));

    return {
      race: {
        title: raceTitle,
        office: raceOffice,
        state: race.state,
        district: race.district,
        status: raceStatus,
        reportingPercentage: reportingPct,
        totalVotes: raceTotalVotes,
      },
      candidates: candidateData,
    };
  };

  // Build RPC payload that will be sent to backend
  const buildRPCPayload = async () => {
    console.log('🔍 buildRPCPayload called, preview:', preview);
    
    if (!preview) {
      console.error('❌ No preview available');
      return null;
    }

    console.log('📋 Preview scenario:', preview.scenario);
    console.log('🤖 Preview aiResponse:', preview.aiResponse);
    console.log('📊 Preview aiResponse candidates:', preview.aiResponse?.candidates);
    console.log('🎯 Preview synthesizedResults:', preview.synthesizedResults);

    try {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();

      // The election_id might be a string code like "ap_p_2024" instead of the UUID
      let baseElectionUuid = race.election_id;
      
      // Check if election_id is a valid UUID (has dashes) or a string code
      const isUuid = race.election_id.includes('-');
      
      if (!isUuid) {
        // Fetch the election UUID from e_elections where election_id matches
        const { data: electionData, error: electionError } = await supabase
          .from('e_elections')
          .select('id')
          .eq('election_id', race.election_id)
          .single();
        
        if (!electionError && electionData) {
          baseElectionUuid = electionData.id;
        }
      }

      const payload = {
        function_name: 'e_create_synthetic_race',
        parameters: {
          p_user_id: user?.id ?? null,
          p_base_race_id: race.race_id,
          p_base_election_id: baseElectionUuid,
          p_name: preview.scenario.name,
          p_description: preview.scenario.customInstructions || '',
          p_scenario_input: {
            ...preview.scenario,
            override_by: user?.id ?? null,
          },
          p_ai_response: preview.aiResponse,
        },
        metadata: {
          election_id_resolved: {
            original: race.election_id,
            uuid: baseElectionUuid,
            was_string_code: !isUuid
          },
          county_results_count: preview.aiResponse?.county_results?.length || 0,
          candidates_count: preview.aiResponse?.candidates?.length || 0
        }
      };

      console.log('✅ Built RPC payload:', payload);
      console.log('✅ Built RPC payload (stringified):', JSON.stringify(payload, null, 2));
      return payload;
    } catch (error) {
      console.error('Error building payload:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Build the AI prompt payload (what we sent to AI)
  const buildAIPromptPayload = async () => {
    try {
      const raceTitle = getFieldValue(race.title);
      const raceOffice = getFieldValue(race.office);
      const raceTotalVotes = getFieldValue(race.totalVotes);

      const candidateData = modifiedCandidates.map(c => ({
        id: c.id,
        candidate_results_id: c.candidate_results_id,
        race_candidates_id: c.race_candidates_id,
        name: getFieldValue(c.name),
        party: getFieldValue(c.party),
        votes: getFieldValue(c.votes),
        percentage: getFieldValue(c.percentage),
        headshot: getFieldValue(c.headshot || ''),
      }));

      // Fetch county baseline data (same logic as in useSyntheticRaceWorkflow)
      let countyBaselineResults: Array<{
        division_id: string;
        division_name: string;
        precincts_reporting: number;
        precincts_total: number;
        total_votes: number;
        results: Array<{
          candidate_id: string;
          candidate_name: string;
          votes: number;
        }>;
      }> = [];

      console.log(`🔍 Fetching county-level results for race: ${race.race_id}`);

      // TODO: Fix county data fetching - temporarily commented out
      const countyResults = [];
      const resultsError = null;
      
      /* const { data: countyResults, error: resultsError } = await supabase
        .from('e_race_results')
        .select(`
          id,
          division_id,
          reporting_level,
          precincts_reporting,
          precincts_total,
          total_votes,
          e_geographic_divisions!inner(name),
          e_candidate_results!e_candidate_results_race_result_id_fkey(
            candidate_id,
            votes,
            e_candidates(full_name)
          )
        `)
        .eq('race_id', race.race_id)
        .eq('reporting_level', 'county'); */

      console.log('📊 County results query:', { 
        resultsError,
        count: countyResults?.length || 0,
        race_id: race.race_id,
        sample: countyResults?.[0]
      });

      if (resultsError) {
        console.error('❌ Error fetching county results:', resultsError);
      }

      if (!resultsError && countyResults && countyResults.length > 0) {
        console.log(`✅ Fetched ${countyResults.length} county-level results`);

        // Group results by division_id
        const resultsByDivision = new Map<string, typeof countyBaselineResults[0]>();

        for (const result of countyResults) {
          const divisionId = result.division_id;
          const divisionName = (result.e_geographic_divisions as any)?.name || 'Unknown County';

          if (!resultsByDivision.has(divisionId)) {
            resultsByDivision.set(divisionId, {
              division_id: divisionId,
              division_name: divisionName,
              precincts_reporting: result.precincts_reporting || 0,
              precincts_total: result.precincts_total || 0,
              total_votes: result.total_votes || 0,
              results: []
            });
          }

          const divisionData = resultsByDivision.get(divisionId)!;

          // Process candidate results
          const candidateResults = result.e_candidate_results as any;
          if (Array.isArray(candidateResults)) {
            for (const candResult of candidateResults) {
              const candidateName = candResult.e_candidates?.full_name || 'Unknown';
              const raceCandidateId = candResult.candidate_id;

              divisionData.results.push({
                candidate_id: raceCandidateId,
                candidate_name: candidateName,
                votes: candResult.votes || 0
              });
            }
          }
        }

        countyBaselineResults = Array.from(resultsByDivision.values());
        console.log(`✅ Processed baseline results for ${countyBaselineResults.length} counties`);
      } else {
        console.log('⚠️ No county-level baseline results found for this race');
      }

      return {
        race: {
          title: raceTitle,
          office: raceOffice,
          state: race.state,
          state_code: getStateCode(race.state),
          district: race.district,
          totalVotes: raceTotalVotes,
        },
        candidates: candidateData,
        county_baseline_results: countyBaselineResults,
        county_count: countyBaselineResults.length,
        scenario_parameters: {
          name: scenarioName || '(Not yet specified)',
          turnoutShift,
          republicanShift,
          democratShift,
          independentShift,
          countyStrategy,
          customInstructions,
          aiProvider: selectedProvider
        }
      };
    } catch (error) {
      console.error('Error building AI prompt payload:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'input' && 'Generate Synthetic Race Scenario'}
            {step === 'preview' && 'Preview Synthetic Scenario'}
            {step === 'save' && 'Save to Synthetic Group'}
          </DialogTitle>
          <DialogDescription>
            {step === 'input' && `Create a synthetic scenario for: ${raceTitle}`}
            {step === 'preview' && 'Review the AI-generated scenario before saving'}
            {step === 'save' && 'Choose which synthetic group to save this scenario to'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4 py-4">
            {/* Scenario Name */}
            <div className="space-y-2">
              <Label htmlFor="scenario-name">Scenario Name *</Label>
              <Input
                id="scenario-name"
                placeholder="e.g., High Turnout Scenario, Urban Shift"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
              />
            </div>

            {/* Candidates Section */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <Label>Candidates ({modifiedCandidates.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCandidateSearch(!showCandidateSearch)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Candidate
                </Button>
              </div>

              {/* Current Candidates List */}
              <div className="space-y-2">
                {modifiedCandidates.map((candidate) => {
                  const candName = getFieldValue(candidate.name);
                  const candParty = getFieldValue(candidate.party);
                  const candHeadshot = getFieldValue(candidate.headshot);
                  const partyColor = getDynamicPartyColor(candParty, parties);
                  return (
                    <div key={candidate.id} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="flex items-center gap-2">
                        {/* Party color indicator */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: partyColor }}
                        />
                        {candHeadshot && (
                          <img 
                            src={candHeadshot} 
                            alt={candName} 
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <span className="text-sm font-medium">{candName}</span>
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                          style={{ 
                            backgroundColor: `${partyColor}20`,
                            color: partyColor,
                            borderColor: partyColor
                          }}
                        >
                          {candParty}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCandidate(candidate.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Add Candidate Panel */}
              {showCandidateSearch && (
                <div className="space-y-3 p-3 bg-white rounded border">
                  <h4 className="text-sm font-medium">Add Candidate</h4>
                  
                  {/* Search from Backend */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Search from Database</Label>
                      {searchResults.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSearchDebug(!showSearchDebug)}
                          className="h-6 px-2"
                        >
                          <Bug className="w-3 h-3 mr-1" />
                          {showSearchDebug ? 'Hide' : 'Show'} Debug
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search candidate name..."
                        value={candidateSearchTerm}
                        onChange={(e) => setCandidateSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchCandidates()}
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleSearchCandidates}
                        disabled={isSearching}
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Debug View */}
                    {showSearchDebug && searchResults.length > 0 && (
                      <div className="p-3 bg-slate-900 rounded border">
                        <div className="text-xs text-slate-200 mb-2 font-medium">Raw Search Results ({searchResults.length} candidates):</div>
                        <div className="text-xs font-mono text-slate-100 bg-slate-950 p-2 rounded overflow-auto max-h-64">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(searchResults, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {searchResults.map((result) => {
                          const photoUrl = result.photo_url || result.photov || result.headshot;
                          const candidateName = result.full_name || result.fullName;
                          const displayParty = normalizePartyCode(result.party_abbreviation || result.party);
                          return (
                            <button
                              key={result.id}
                              onClick={() => handleAddCandidateFromSearch(result)}
                              className="w-full text-left p-2 hover:bg-slate-50 rounded border text-sm flex items-center gap-2"
                            >
                              {photoUrl && (
                                <img 
                                  src={photoUrl} 
                                  alt={candidateName} 
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex-1">
                                <div className="font-medium">{candidateName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {displayParty} {result.party_name && `(${result.party_name})`}
                                </div>
                              </div>
                              <Plus className="w-4 h-4 flex-shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  {/* Manual Entry */}
                  <div className="space-y-2">
                    <Label className="text-xs">Add Manually</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="e.g., Walt Disney"
                        value={manualCandidateName}
                        onChange={(e) => setManualCandidateName(e.target.value)}
                        className="text-sm"
                      />
                      <Select value={manualCandidateParty} onValueChange={(value: any) => setManualCandidateParty(value)}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEM">Democrat</SelectItem>
                          <SelectItem value="REP">Republican</SelectItem>
                          <SelectItem value="IND">Independent</SelectItem>
                          <SelectItem value="GRN">Green</SelectItem>
                          <SelectItem value="LIB">Libertarian</SelectItem>
                          <SelectItem value="OTH">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAddManualCandidate}
                      className="w-full"
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      Add Manual Candidate
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Turnout Shift */}
            <div className="space-y-2">
              <Label htmlFor="turnout-shift">Turnout Shift (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="turnout-shift"
                  type="number"
                  step="0.1"
                  value={turnoutShift}
                  onChange={(e) => setTurnoutShift(parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  {turnoutShift > 0 ? '+' : ''}{turnoutShift}% turnout change
                </span>
              </div>
            </div>

            {/* Party Shifts */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rep-shift">Republican Shift (%)</Label>
                <Input
                  id="rep-shift"
                  type="number"
                  step="0.1"
                  value={republicanShift}
                  onChange={(e) => setRepublicanShift(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dem-shift">Democrat Shift (%)</Label>
                <Input
                  id="dem-shift"
                  type="number"
                  step="0.1"
                  value={democratShift}
                  onChange={(e) => setDemocratShift(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ind-shift">Independent Shift (%)</Label>
                <Input
                  id="ind-shift"
                  type="number"
                  step="0.1"
                  value={independentShift}
                  onChange={(e) => setIndependentShift(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* County Strategy */}
            <div className="space-y-2">
              <Label htmlFor="county-strategy">County Strategy</Label>
              <Select value={countyStrategy} onValueChange={setCountyStrategy}>
                <SelectTrigger id="county-strategy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uniform">Uniform (Apply shifts evenly)</SelectItem>
                  <SelectItem value="urban-focus">Urban Focus</SelectItem>
                  <SelectItem value="rural-focus">Rural Focus</SelectItem>
                  <SelectItem value="suburban-focus">Suburban Focus</SelectItem>
                  <SelectItem value="competitive-counties">Competitive Counties Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label htmlFor="custom-instructions">Custom AI Instructions</Label>
              <Textarea
                id="custom-instructions"
                placeholder="Additional instructions for the AI (optional)..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={3}
              />
            </div>

            {/* AI Provider */}
            <div className="space-y-2">
              <Label htmlFor="ai-provider">AI Provider *</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger id="ai-provider">
                  <SelectValue placeholder="Select AI provider..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {providers.length === 0 && (
                <p className="text-sm text-amber-600">
                  No AI providers configured for Elections dashboard
                </p>
              )}
            </div>

            {/* Preview Race Data Button */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!showDataPreview) {
                    setIsLoadingPreview(true);
                    const payload = await buildAIPromptPayload();
                    setAiPromptPreview(payload);
                    setIsLoadingPreview(false);
                  }
                  setShowDataPreview(!showDataPreview);
                }}
                disabled={isLoadingPreview}
                className="w-full"
              >
                {isLoadingPreview ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                {showDataPreview ? 'Hide' : 'View'} Race Data Being Sent to AI
              </Button>
            </div>

            {/* Data Preview */}
            {showDataPreview && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-sm text-blue-900">
                  Complete AI Prompt Payload (with County Baseline Data):
                </h4>
                <div className="space-y-2 text-xs font-mono bg-white p-3 rounded border overflow-auto max-h-96">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(aiPromptPreview, null, 2)}
                  </pre>
                </div>
                <div className="text-xs text-blue-700">
                  ⚠️ This is the exact data that will be sent to the AI:
                  <ul className="list-disc ml-4 mt-1 space-y-1">
                    <li><strong>race</strong> - Basic race information</li>
                    <li><strong>candidates</strong> - All candidates with current vote totals</li>
                    <li><strong>county_baseline_results</strong> - County-level data including division_id, precincts, total_votes, and per-candidate results</li>
                    <li><strong>scenario_parameters</strong> - Your shifts and strategy (will be added when you click Generate Preview)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-6 py-4">
            {/* Scenario Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-medium">Scenario: {preview.scenario.name}</h3>
              {preview.scenario.turnoutShift !== 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Turnout {preview.scenario.turnoutShift > 0 ? '+' : ''}{preview.scenario.turnoutShift}%
                </Badge>
              )}
              {preview.scenario.republicanShift !== 0 && (
                <Badge variant="secondary">
                  GOP {preview.scenario.republicanShift > 0 ? '+' : ''}{preview.scenario.republicanShift}%
                </Badge>
              )}
              {preview.scenario.democratShift !== 0 && (
                <Badge variant="secondary">
                  DEM {preview.scenario.democratShift > 0 ? '+' : ''}{preview.scenario.democratShift}%
                </Badge>
              )}
            </div>

            {/* AI Summary */}
            <div className="space-y-2">
              <h4 className="font-medium">AI Analysis</h4>
              <p className="text-sm text-muted-foreground">{preview.aiSummary}</p>
            </div>

            {/* Synthesized Results */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Synthesized Results</h4>
                <span className="text-sm text-muted-foreground">
                  Total Votes: {preview.synthesizedResults.totalVotes.toLocaleString()}
                </span>
              </div>
              
              <div className="space-y-2">
                {preview.synthesizedResults.candidates.map((candidate) => {
                  // Find original candidate for comparison
                  const originalCandidate = modifiedCandidates.find(c => {
                    const cName = getFieldValue(c.name);
                    return cName === candidate.name || c.id === candidate.id;
                  });
                  const originalVotes = originalCandidate 
                    ? getFieldValue(originalCandidate.votes) 
                    : 0;
                  const voteDiff = candidate.votes - originalVotes;
                  const candidateHeadshot = originalCandidate ? getFieldValue(originalCandidate.headshot) : null;
                  
                  return (
                    <div 
                      key={candidate.id} 
                      className={`p-3 rounded border ${candidate.winner ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {candidateHeadshot && (
                            <img 
                              src={candidateHeadshot} 
                              alt={candidate.name} 
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{candidate.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {candidate.party}
                            </Badge>
                            {candidate.winner && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-medium">
                            {candidate.votes.toLocaleString()} ({candidate.percentage}%)
                          </div>
                          {voteDiff !== 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              {voteDiff > 0 ? (
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              )}
                              <span className={voteDiff > 0 ? 'text-green-600' : 'text-red-600'}>
                                {voteDiff > 0 ? '+' : ''}{voteDiff.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* County Changes */}
            {preview.synthesizedResults.countyChanges && preview.synthesizedResults.countyChanges.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">County-Level Impact</h4>
                <div className="space-y-2">
                  {preview.synthesizedResults.countyChanges.map((change, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded text-sm">
                      <div className="font-medium">{change.county}</div>
                      <div className="text-muted-foreground">{change.changeDescription}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debug Payload Button */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const payload = await buildRPCPayload();
                  console.log('📦 RPC Payload:', payload);
                  setShowDebugPayload(!showDebugPayload);
                  setDebugRPCPayload(payload);
                  setDebugAIResponse(await buildAIPromptPayload());
                }}
                className="w-full gap-2"
              >
                <Bug className="w-4 h-4" />
                {showDebugPayload ? 'Hide' : 'Show'} Save Payload Debug
              </Button>
            </div>

            {/* Debug Payload Display */}
            {showDebugPayload && (
              <div className="space-y-4">
                {/* AI Response from AI */}
                <div className="space-y-3 p-4 bg-purple-950 rounded-lg border border-purple-800">
                  <h4 className="font-medium text-sm text-purple-200">
                    1️⃣ AI Response (what AI returned):
                  </h4>
                  <div className="space-y-2 text-xs font-mono text-purple-100 bg-purple-900 p-3 rounded border border-purple-700 overflow-auto max-h-96">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(preview?.aiResponse, null, 2)}
                    </pre>
                  </div>
                  <div className="text-xs text-purple-300">
                    ℹ️ This is the actual JSON response returned by the AI:
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      <li><strong>candidates</strong> - Should include candidate_name, party, candidate_id, and metadata (votes, percentage, winner)</li>
                      <li><strong>county_results</strong> - County-level breakdown with division_id, precincts, and candidate votes</li>
                      <li><strong>summary</strong> - AI narrative summary of the scenario</li>
                      <li>⚠️ Check that candidate_name and party are NOT empty!</li>
                    </ul>
                  </div>
                </div>

                {/* RPC Save Payload */}
                <div className="space-y-3 p-4 bg-slate-900 rounded-lg border border-slate-700">
                  <h4 className="font-medium text-sm text-slate-200">
                    2️⃣ RPC Save Payload (will be sent to e_create_synthetic_race):
                  </h4>
                  <div className="space-y-2 text-xs font-mono text-slate-100 bg-slate-950 p-3 rounded border border-slate-800 overflow-auto max-h-96">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(debugRPCPayload, null, 2)}
                    </pre>
                  </div>
                  <div className="text-xs text-slate-400">
                    ⚠️ This is the exact payload that will be sent to your backend RPC function. Check that:
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      <li>candidate_id values are valid UUIDs from your database</li>
                      <li>division_id values are valid county UUIDs</li>
                      <li>p_base_election_id is the correct election UUID (not string code)</li>
                      <li>County results array contains data if AI generated it</li>
                      <li>precincts_reporting and precincts_total are included in county_results</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Step - Group Selection */}
        {step === 'save' && preview && (
          <div className="space-y-6 py-4">
            {/* Summary of what we're saving */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Saving: {preview.scenario.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {raceTitle} - {preview.synthesizedResults.candidates.length} candidates
              </p>
            </div>

            {/* Group Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Select or Create Synthetic Group</Label>

              {/* Create New Group - Always visible at top */}
              <div className={`p-4 rounded-lg border-2 transition-colors ${
                newGroupName.trim()
                  ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <FolderPlus className={`w-4 h-4 ${newGroupName.trim() ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className={`font-medium text-sm ${newGroupName.trim() ? 'text-blue-900' : 'text-slate-700'}`}>
                    Create New Group
                  </span>
                  {newGroupName.trim() && (
                    <Badge variant="default" className="ml-auto text-xs bg-blue-600">
                      Will be created on save
                    </Badge>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Input
                      id="new-group-name"
                      placeholder="Type a new group name..."
                      value={newGroupName}
                      onChange={(e) => {
                        setNewGroupName(e.target.value);
                        // Clear existing selection when typing new group
                        if (e.target.value.trim()) {
                          setSelectedGroupId('');
                        }
                      }}
                      className="bg-white"
                    />
                  </div>
                  {newGroupName.trim() && (
                    <div className="space-y-1">
                      <Input
                        id="new-group-desc"
                        placeholder="Description (optional)"
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        className="bg-white text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              {syntheticGroups.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or select existing</span>
                  </div>
                </div>
              )}

              {/* Existing Groups List */}
              <div className="space-y-2">
                {syntheticGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No synthetic groups found.</p>
                    <p className="text-sm">Create a new group to save your scenario.</p>
                  </div>
                ) : (
                  syntheticGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        // Clear new group form when selecting existing
                        setNewGroupName('');
                        setNewGroupDescription('');
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedGroupId === group.id && !newGroupName.trim()
                          ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            {group.name}
                          </div>
                          {group.description && (
                            <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {group.race_count !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {group.race_count} race{group.race_count !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {selectedGroupId === group.id && !newGroupName.trim() && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleGeneratePreview} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Preview'
                )}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleProceedToSave} disabled={isLoading}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Choose Group & Save
              </Button>
            </>
          )}

          {step === 'save' && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isLoading || isCreatingGroup}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading || isCreatingGroup || (!selectedGroupId && !newGroupName.trim())}
              >
                {isLoading || isCreatingGroup ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isCreatingGroup ? 'Creating Group...' : 'Saving...'}
                  </>
                ) : newGroupName.trim() ? (
                  <>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Create "{newGroupName.trim()}" & Save
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save to Group
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Success/Error Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {errorMessage ? (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span>Save Failed</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Success!</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {errorMessage ? (
                <span className="text-red-600">{errorMessage}</span>
              ) : (
                <span>
                  Synthetic race created successfully{successRaceId && `: ${successRaceId}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              onClick={() => {
                setShowSuccessDialog(false);
                setErrorMessage('');
                setSuccessRaceId('');
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}