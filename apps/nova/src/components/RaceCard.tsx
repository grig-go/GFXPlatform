import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { useState, useEffect } from "react";
import { Clock, CheckCircle, AlertCircle, Database, User, X, ChevronDown, ChevronUp, Sparkles, Bot, FileText, Settings, MapPin, Trash2 } from "lucide-react";
import { Race, Candidate, Party, getFieldValue, isFieldOverridden, FieldOverride, revertOverride } from "../types/election";
import { InlineTextEdit, InlineNumberEdit, InlineSelectEdit, InlineBooleanEdit } from "./InlineEditField";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { updateRacesFieldOverride, updateRaceFieldOverride, updateCandidateFieldOverride, updateCandidatesFieldOverride, updateRaceCandidatesFieldOverride } from "../data/overrideFieldMappings";
import { EditImageDialog } from "./EditImageDialog";
import { motion } from "framer-motion";
import { GenerateSyntheticScenarioModal } from "./GenerateSyntheticScenarioModal";
import { useSyntheticRaceWorkflow } from "../utils/useSyntheticRaceWorkflow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface RaceCardProps {
  race: Race;
  onUpdateRace: (race: Race) => void;
  onDeleteRace?: (raceId: string) => void; // Add delete callback
  parties?: Party[];
}

const statusConfig = {
  NOT_CALLED: { label: 'Not Called', color: 'bg-gray-500', icon: Clock },
  PROJECTED: { label: 'Projected', color: 'bg-blue-500', icon: AlertCircle },
  CALLED: { label: 'Called', color: 'bg-green-500', icon: CheckCircle },
  RECOUNT: { label: 'Recount', color: 'bg-yellow-500', icon: AlertCircle }
};

const statusOptions = [
  { value: 'NOT_CALLED' as const, label: 'Not Called' },
  { value: 'PROJECTED' as const, label: 'Projected' },
  { value: 'CALLED' as const, label: 'Called' },
  { value: 'RECOUNT' as const, label: 'Recount' }
];

const partyOptions = [
  { value: 'DEM' as const, label: 'Democrat' },
  { value: 'REP' as const, label: 'Republican' },
  { value: 'IND' as const, label: 'Independent' },
  { value: 'GRN' as const, label: 'Green' },
  { value: 'LIB' as const, label: 'Libertarian' },
  { value: 'OTH' as const, label: 'Other' }
];

const raceTypeOptions = [
  { value: 'PRESIDENT' as const, label: 'Presidential' },
  { value: 'SENATE' as const, label: 'Senate' },
  { value: 'HOUSE' as const, label: 'House' },
  { value: 'GOVERNOR' as const, label: 'Governor' },
  { value: 'LOCAL' as const, label: 'Local' },
  { value: 'SYNTHETIC' as const, label: 'Synthetic' }
];

// Fallback colors if party data is not available
const fallbackPartyColors: Record<string, string> = {
  'Dem': '#0015BC',
  'GOP': '#E81B23',
  'Ind': '#9333EA',
  'Grn': '#2fa82f',
  'Lib': '#efcb0a',
  'Oth': '#808080'
};

// Helper function to get party color from database or fallback
const getPartyColor = (partyCode: string, parties?: Party[]): string => {
  const normalizedCode = partyCode.trim().toUpperCase();

  if (parties && parties.length > 0) {
    const party = parties.find(p => {
      const pCode = p.code.toUpperCase();
      if (normalizedCode === 'REP' || normalizedCode === 'GOP') {
        return pCode === 'REP' || pCode === 'GOP';
      }
      if (normalizedCode === 'DEM') {
        return pCode === 'DEM';
      }
      return pCode === normalizedCode;
    });
    if (party) {
      return party.colors.primary;
    }
  }

  if (normalizedCode === 'REP' || normalizedCode === 'GOP') return fallbackPartyColors['GOP'];
  if (normalizedCode === 'DEM') return fallbackPartyColors['Dem'];
  if (normalizedCode === 'IND') return fallbackPartyColors['Ind'];
  if (normalizedCode === 'GRN') return fallbackPartyColors['Grn'];
  if (normalizedCode === 'LIB') return fallbackPartyColors['Lib'];
  
  return fallbackPartyColors[partyCode] || '#808080';
};

export function RaceCard({ race, onUpdateRace, onDeleteRace, parties }: RaceCardProps) {
  const [editingImageCandidate, setEditingImageCandidate] = useState<string | null>(null);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [showSyntheticModal, setShowSyntheticModal] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Synthetic race workflow
  const { 
    isLoading: isSyntheticLoading, 
    providers, 
    fetchProviders,
    runPreview, 
    confirmSave 
  } = useSyntheticRaceWorkflow();

  // Fetch providers when component mounts
  useEffect(() => {
    fetchProviders();
  }, []);
  
  const statusValue = getFieldValue(race.status);
  const titleValue = getFieldValue(race.title);
  const officeValue = getFieldValue(race.office);
  const raceTypeValue = getFieldValue(race.raceType);
  const reportingValue = getFieldValue(race.reportingPercentage);
  const precinctsReportingValue = getFieldValue(race.precincts_reporting || 0);
  const calledTimestampValue = getFieldValue(race.called_timestamp || '');
  const totalVotesValue = getFieldValue(race.totalVotes);

  // Helper functions to update specific fields
  const updateRaceField = async <K extends keyof Race>(fieldName: K, newValue: Race[K]) => {
    // First update the local state
    const updatedRace = { ...race, [fieldName]: newValue };
    onUpdateRace(updatedRace);

    // Then persist to database if it's a supported override field
    const overrideableFields = ['reportingPercentage', 'precincts_reporting', 'precincts_total', 'status', 'called_timestamp', 'totalVotes'];

    if (overrideableFields.includes(fieldName as string)) {
      try {
        const result = await updateRaceFieldOverride(
          race.race_results_id,
          fieldName as string,
          newValue,
          `Updated via UI`
        );

        if (!result.success) {
          console.error(`Failed to persist ${fieldName} override:`, result.error);
          // Could show a toast notification here
        } else {
          console.log(`Successfully persisted ${fieldName} override for race results id: ${race.race_id}`);
        }
      } catch (error) {
        console.error(`Error persisting ${fieldName} override:`, error);
      }
    }

    const overrideableRacesFields = ['title'];

    if (overrideableRacesFields.includes(fieldName as string)) {
      try {
        const result = await updateRacesFieldOverride(
          race.race_id,
          fieldName as string,
          newValue,
          `Field ${fieldName} updated via UI`
        );

        if (!result.success) {
          console.error(`Failed to persist ${fieldName} override:`, result.error);
          // Could show a toast notification here
        } else {
          console.log(`Successfully persisted ${fieldName} override for race id: ${race.race_id}`);
        }
      } catch (error) {
        console.error(`Error persisting ${fieldName} override:`, error);
      }
    }
  };

  const revertAllOverrides = () => {
    if (isFieldOverridden(race.title)) updateRaceField('title', null);
    if (isFieldOverridden(race.reportingPercentage)) updateRaceField('reportingPercentage', null);
    if (isFieldOverridden(race.precincts_reporting)) updateRaceField('precincts_reporting', null);
    if (isFieldOverridden(race.status)) updateRaceField('status', null);
    if (isFieldOverridden(race.totalVotes)) updateRaceField('totalVotes', null);

    race.candidates.map(candidate => {
      if (isFieldOverridden(candidate.name)) updateCandidateField(candidate.id, 'name', null);
      if (isFieldOverridden(candidate.incumbent)) updateCandidateField(candidate.id, 'incumbent', null);
      if (isFieldOverridden(candidate.winner)) updateCandidateField(candidate.id, 'winner', null);
      if (isFieldOverridden(candidate.votes)) updateCandidateField(candidate.id, 'votes', null);
      if (isFieldOverridden(candidate.percentage)) updateCandidateField(candidate.id, 'percentage', null);
      if (isFieldOverridden(candidate.withdrew)) updateCandidateField(candidate.id, 'withdrew', null);
    });

    const revertedRace: Race = {
      ...race,
      title: isFieldOverridden(race.title) ? revertOverride(race.title) : race.title,
      office: isFieldOverridden(race.office) ? revertOverride(race.office) : race.office,
      raceType: isFieldOverridden(race.raceType) ? revertOverride(race.raceType) : race.raceType,
      status: isFieldOverridden(race.status) ? revertOverride(race.status) : race.status,
      reportingPercentage: isFieldOverridden(race.reportingPercentage) ? revertOverride(race.reportingPercentage) : race.reportingPercentage,
      precincts_reporting: isFieldOverridden(race.precincts_reporting) ? revertOverride(race.precincts_reporting as FieldOverride<number>) : race.precincts_reporting,
      called_timestamp: isFieldOverridden(race.called_timestamp) ? revertOverride(race.called_timestamp as FieldOverride<string>) : race.called_timestamp,
      totalVotes: isFieldOverridden(race.totalVotes) ? revertOverride(race.totalVotes) : race.totalVotes,
      candidates: race.candidates.map(candidate => ({
        ...candidate,
        name: isFieldOverridden(candidate.name) ? revertOverride(candidate.name) : candidate.name,
        party: isFieldOverridden(candidate.party) ? revertOverride(candidate.party) : candidate.party,
        votes: isFieldOverridden(candidate.votes) ? revertOverride(candidate.votes) : candidate.votes,
        percentage: isFieldOverridden(candidate.percentage) ? revertOverride(candidate.percentage) : candidate.percentage,
        incumbent: isFieldOverridden(candidate.incumbent) ? revertOverride(candidate.incumbent) : candidate.incumbent,
        winner: isFieldOverridden(candidate.winner) ? revertOverride(candidate.winner as FieldOverride<boolean>) : candidate.winner,
        withdrew: isFieldOverridden(candidate.withdrew) ? revertOverride(candidate.withdrew as FieldOverride<boolean>) : candidate.withdrew,
        headshot: isFieldOverridden(candidate.headshot) ? revertOverride(candidate.headshot as FieldOverride<string>) : candidate.headshot,
      })),
      lastUpdated: new Date().toISOString()
    };

    onUpdateRace(revertedRace);
  };

  const revertCandidateOverrides = (candidateId: string) => {
    const updatedCandidates = race.candidates.map(candidate => {
      if (candidate.id === candidateId) {
        console.log('cccccccc')
        console.log(candidate)
        if (isFieldOverridden(candidate.name)) updateCandidateField(candidate.id, 'name', null);
        if (isFieldOverridden(candidate.incumbent)) updateCandidateField(candidate.id, 'incumbent', null);
        if (isFieldOverridden(candidate.winner)) updateCandidateField(candidate.id, 'winner', null);
        if (isFieldOverridden(candidate.votes)) updateCandidateField(candidate.id, 'votes', null);
        if (isFieldOverridden(candidate.percentage)) updateCandidateField(candidate.id, 'percentage', null);
        if (isFieldOverridden(candidate.withdrew)) updateCandidateField(candidate.id, 'withdrew', null);

        return {
          ...candidate,
          name: isFieldOverridden(candidate.name) ? revertOverride(candidate.name) : candidate.name,
          party: isFieldOverridden(candidate.party) ? revertOverride(candidate.party) : candidate.party,
          votes: isFieldOverridden(candidate.votes) ? revertOverride(candidate.votes) : candidate.votes,
          percentage: isFieldOverridden(candidate.percentage) ? revertOverride(candidate.percentage) : candidate.percentage,
          incumbent: isFieldOverridden(candidate.incumbent) ? revertOverride(candidate.incumbent) : candidate.incumbent,
          winner: isFieldOverridden(candidate.winner) ? revertOverride(candidate.winner as FieldOverride<boolean>) : candidate.winner,
          withdrew: isFieldOverridden(candidate.withdrew) ? revertOverride(candidate.withdrew as FieldOverride<boolean>) : candidate.withdrew,
          headshot: isFieldOverridden(candidate.headshot) ? revertOverride(candidate.headshot as FieldOverride<string>) : candidate.headshot,
        };
      }
      return candidate;
    });

    // Recalculate totals
    const calculatedTotalVotes = updatedCandidates.reduce((sum, c) => sum + getFieldValue(c.votes), 0);
    const candidatesWithPercentages = updatedCandidates.map(c => {
      if (!isFieldOverridden(c.percentage)) {
        return {
          ...c,
          percentage: calculatedTotalVotes > 0 ? Math.round((getFieldValue(c.votes) / calculatedTotalVotes) * 100 * 100) / 100 : 0
        };
      }
      return c;
    });

    const updatedTotalVotes = isFieldOverridden(race.totalVotes) ? race.totalVotes : calculatedTotalVotes;

    const updatedRace = {
      ...race,
      candidates: candidatesWithPercentages,
      totalVotes: updatedTotalVotes,
      lastUpdated: new Date().toISOString()
    };
    onUpdateRace(updatedRace);
  };

  const updateCandidateField = async <K extends keyof Candidate>(candidateId: string, fieldName: K, newValue: Candidate[K]) => {
    const updatedCandidates = race.candidates.map(candidate =>
      candidate.id === candidateId
        ? { ...candidate, [fieldName]: newValue }
        : candidate
    );

    // Only auto-calculate percentages and total votes if they haven't been manually overridden
    const calculatedTotalVotes = updatedCandidates.reduce((sum, c) => sum + getFieldValue(c.votes), 0);

    const candidatesWithPercentages = updatedCandidates.map(c => {
      // Only auto-calculate percentage if it's not overridden
      if (!isFieldOverridden(c.percentage)) {
        return {
          ...c,
          percentage: calculatedTotalVotes > 0 ? Math.round((getFieldValue(c.votes) / calculatedTotalVotes) * 100 * 100) / 100 : 0
        };
      }
      return c;
    });

    // Only update total votes if it's not overridden
    const updatedTotalVotes = isFieldOverridden(race.totalVotes) ? race.totalVotes : calculatedTotalVotes;

    const updatedRace = {
      ...race,
      candidates: candidatesWithPercentages,
      totalVotes: updatedTotalVotes,
      lastUpdated: new Date().toISOString()
    };
    onUpdateRace(updatedRace);

    const updatedCandidate = race.candidates.find(c => c.id === candidateId);

    // Persist to database if it's a supported override field
    const overrideableFields = ['votes', 'percentage', 'winner', 'electoralVotes'];

    if (overrideableFields.includes(fieldName as string)) {
      try {
        console.log('updateCandidateFieldOverrideeeeeeeee');
        console.log(race.candidates);
        console.log(candidateId);      
        const updateCandidateId = updatedCandidate.candidate_results_id;
        console.log(updatedCandidate);
        const result = await updateCandidateFieldOverride(
          updateCandidateId,
          fieldName as string,
          newValue,
          `Field ${fieldName} updated via UI`
        );

        if (!result.success) {
          console.error(`Failed to persist candidate ${fieldName} override:`, result.error);
          // Could show a toast notification here
        } else {
          console.log(`Successfully persisted ${fieldName} override for candidate results id: ${updateCandidateId}`);
        }
      } catch (error) {
        console.error(`Error persisting candidate ${fieldName} override:`, error);
      }
    }

    const overrideableCandidatesFields = ['incumbent', 'name', 'headshot'];

    if (overrideableCandidatesFields.includes(fieldName as string)) {
      try {
        const result = await updateCandidatesFieldOverride(
          candidateId,
          fieldName as string,
          newValue,
          `Field ${fieldName} updated via UI`
        );

        if (!result.success) {
          console.error(`Failed to persist candidate ${fieldName} override:`, result.error);
          // Could show a toast notification here
        } else {
          console.log(`Successfully persisted ${fieldName} override for candidate id: ${candidateId}`);
        }
      } catch (error) {
        console.error(`Error persisting candidate ${fieldName} override:`, error);
      }
    }

    const overrideableRaceCandidatesFields = ['withdrew'];

    if (overrideableRaceCandidatesFields.includes(fieldName as string)) {
      try {
        const result = await updateRaceCandidatesFieldOverride(
          updatedCandidate.race_candidates_id,
          fieldName as string,
          newValue,
          `Field ${fieldName} updated via UI`
        );

        if (!result.success) {
          console.error(`Failed to persist candidate ${fieldName} override:`, result.error);
          // Could show a toast notification here
        } else {
          console.log(`Successfully persisted ${fieldName} override for race candidate id: ${updatedCandidate.race_candidates_id}`);
        }
      } catch (error) {
        console.error(`Error persisting candidate ${fieldName} override:`, error);
      }
    }
  };
  
  const statusInfo = statusConfig[statusValue] || statusConfig.NOT_CALLED;
  const StatusIcon = statusInfo.icon;
  
  const sortedCandidates = [...(race.candidates || [])].sort((a, b) => {
    const aVotes = getFieldValue(a.votes);
    const bVotes = getFieldValue(b.votes);
    return bVotes - aVotes;
  });

  // Show only first 3 candidates when collapsed
  const visibleCandidates = showAllCandidates ? sortedCandidates : sortedCandidates.slice(0, 3);
  const hasMoreCandidates = sortedCandidates.length > 3;

  // Check if race has any overrides
  const hasOverrides = isFieldOverridden(race.title) || 
                      isFieldOverridden(race.office) ||
                      isFieldOverridden(race.raceType) ||
                      isFieldOverridden(race.status) || 
                      isFieldOverridden(race.reportingPercentage) ||
                      isFieldOverridden(race.precincts_reporting) ||
                      isFieldOverridden(race.called_timestamp) ||
                      isFieldOverridden(race.totalVotes) ||
                      (race.candidates || []).some(c => 
                        isFieldOverridden(c.name) || 
                        isFieldOverridden(c.party) || 
                        isFieldOverridden(c.votes) ||
                        isFieldOverridden(c.percentage) ||
                        isFieldOverridden(c.winner) ||
                        isFieldOverridden(c.incumbent) ||
                        isFieldOverridden(c.withdrew) ||
                        isFieldOverridden(c.headshot)
                      );

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <InlineTextEdit
                field={race.title}
                fieldName="Title"
                onUpdate={(newTitle) => updateRaceField('title', newTitle)}
              >
                <CardTitle className="text-lg">{titleValue}</CardTitle>
              </InlineTextEdit>
              <Badge 
                variant="outline" 
                className="text-xs bg-blue-50 border-blue-200 text-blue-800 font-mono"
                title={`Race ID: ${race.id}`}
              >
                {race.id}
              </Badge>
              {hasOverrides && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-800">
                    <Database className="h-3 w-3 mr-1" />
                    Modified
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      revertAllOverrides();
                    }}
                    className="h-5 w-5 p-0 hover:bg-amber-100 hover:text-amber-900"
                    title="Clear all overrides"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {/*<InlineTextEdit
                  field={race.office}
                  fieldName="Office"
                  onUpdate={(newOffice) => updateRaceField('office', newOffice)}
                >
                  <span>{officeValue}</span>
                </InlineTextEdit>*/}
                <span>{officeValue}</span>
                <span>•</span>
                {/*<InlineSelectEdit
                  field={race.raceType}
                  fieldName="Race Type"
                  onUpdate={(newRaceType) => updateRaceField('raceType', newRaceType)}
                  options={raceTypeOptions}
                >
                  <span>{raceTypeValue}</span>
                </InlineSelectEdit>*/}
                {raceTypeValue === 'SYNTHETIC' ? (
                  <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 border-purple-300 text-purple-700">
                    <Bot className="h-3 w-3" />
                    Synthetic
                  </Badge>
                ) : (
                  <span>{raceTypeValue}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{race.state}</span>
                {race.district && <span>• District {race.district}</span>}
                <InlineNumberEdit
                  field={race.reportingPercentage}
                  fieldName="Reporting %"
                  onUpdate={(newReporting) => updateRaceField('reportingPercentage', newReporting)}
                  min={0}
                  max={100}
                  step={0.1}
                >
                  <span>• {reportingValue}% reporting</span>
                </InlineNumberEdit>
                {race.precincts_total && (
                  <InlineNumberEdit
                    field={race.precincts_reporting || 0}
                    fieldName="Precincts Reporting"
                    onUpdate={(newPrecincts) => updateRaceField('precincts_reporting', newPrecincts)}
                    min={0}
                    max={race.precincts_total}
                    step={1}
                  >
                    <span>• {precinctsReportingValue}/{race.precincts_total} precincts</span>
                  </InlineNumberEdit>
                )}
              </div>
              {race.uncontested && (
                <div className="text-sm text-amber-600">
                  • Uncontested
                </div>
              )}
              {race.num_elect && race.num_elect > 1 && (
                <div className="text-sm text-muted-foreground">
                  • {race.num_elect} seats to elect
                </div>
              )}
              {calledTimestampValue && statusValue === 'CALLED' && (
                <div className="text-sm text-green-600">
                  • {raceTypeValue === 'SYNTHETIC' ? 'Created' : 'Called'}: {new Date(calledTimestampValue).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSyntheticModal(true)}
              className="text-xs px-3 py-1 rounded-md border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 transition flex items-center gap-1.5"
              title="Generate synthetic race scenario"
            >
              <Bot className="w-3 h-3" />
              Gen Synthetic
            </button>
            {race.summary && (
              <button
                onClick={() => setShowSummaryDialog(true)}
                className="text-xs px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-100 transition flex items-center gap-1.5"
                title="View race summary"
              >
                <FileText className="w-3 h-3" />
                Summary
              </button>
            )}
            {/* Delete button for synthetic races only */}
            {raceTypeValue === 'SYNTHETIC' && race.synthetic_race_id && onDeleteRace && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs px-3 py-1 rounded-md border border-red-300 hover:bg-red-50 hover:border-red-400 text-red-600 hover:text-red-700 transition flex items-center gap-1.5"
                title="Delete synthetic race"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
            <InlineSelectEdit
              field={race.status}
              fieldName="Status"
              onUpdate={(newStatus) => updateRaceField('status', newStatus)}
              options={statusOptions}
            >
              <Badge variant="outline" className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </InlineSelectEdit>

          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {visibleCandidates.map((candidate) => {
            const candidateName = getFieldValue(candidate.name);
            const candidateParty = getFieldValue(candidate.party);
            const candidateVotes = getFieldValue(candidate.votes);
            const candidateIncumbent = getFieldValue(candidate.incumbent);
            const candidateWinner = getFieldValue(candidate.winner);
            const candidateWithdrew = getFieldValue(candidate.withdrew || false);

            const candidateHasOverrides = isFieldOverridden(candidate.name) ||
                                        isFieldOverridden(candidate.party) ||
                                        isFieldOverridden(candidate.votes) ||
                                        isFieldOverridden(candidate.percentage) ||
                                        isFieldOverridden(candidate.incumbent) ||
                                        isFieldOverridden(candidate.winner) ||
                                        isFieldOverridden(candidate.withdrew) ||
                                        isFieldOverridden(candidate.headshot);

            return (
              <div key={candidate.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getPartyColor(candidateParty, parties) }}
                    />
                    <button
                      onClick={() => setEditingImageCandidate(candidate.id)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={getFieldValue(candidate.headshot || '')} 
                          alt={candidateName} 
                        />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <InlineTextEdit
                      field={candidate.name}
                      fieldName="Name"
                      onUpdate={(newName) => updateCandidateField(candidate.id, 'name', newName)}
                    >
                      <span className="font-medium">{candidateName}</span>
                    </InlineTextEdit>
                    {/*<InlineSelectEdit
                      field={candidate.party}
                      fieldName="Party"
                      onUpdate={(newParty) => updateCandidateField(candidate.id, 'party', newParty)}
                      options={partyOptions}
                    >
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {candidateParty}
                      </Badge>
                    </InlineSelectEdit>*/}
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {candidateParty}
                    </Badge>
                    <InlineBooleanEdit
                      field={candidate.incumbent}
                      fieldName="Incumbent"
                      onUpdate={(newIncumbent) => updateCandidateField(candidate.id, 'incumbent', newIncumbent)}
                    >
                      {candidateIncumbent && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          INC
                        </Badge>
                      )}
                    </InlineBooleanEdit>
                    <InlineBooleanEdit
                      field={candidate.winner}
                      fieldName="Winner"
                      onUpdate={(newWinner) => updateCandidateField(candidate.id, 'winner', newWinner)}
                    >
                      {candidateWinner && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </InlineBooleanEdit>
                    <InlineBooleanEdit
                      field={candidate.withdrew || false}
                      fieldName="Withdrew"
                      onUpdate={(newWithdrew) => updateCandidateField(candidate.id, 'withdrew', newWithdrew)}
                    >
                      {candidateWithdrew && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0">
                          WITHDREW
                        </Badge>
                      )}
                    </InlineBooleanEdit>
                    {candidateHasOverrides && (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800">
                          Modified
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            revertCandidateOverrides(candidate.id);
                          }}
                          className="h-5 w-5 p-0 hover:bg-blue-100 hover:text-blue-900"
                          title="Clear candidate overrides"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {candidate.ballot_order && (
                      <span className="text-xs text-muted-foreground">
                        #{candidate.ballot_order}
                      </span>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <InlineNumberEdit
                      field={candidate.percentage}
                      fieldName="Percentage"
                      onUpdate={(newPercentage) => updateCandidateField(candidate.id, 'percentage', newPercentage)}
                      min={0}
                      max={100}
                      step={0.1}
                    >
                      <div className="font-medium">{getFieldValue(candidate.percentage)}%</div>
                    </InlineNumberEdit>&nbsp;&nbsp;
                    <InlineNumberEdit
                      field={candidate.votes}
                      fieldName="Votes"
                      onUpdate={(newVotes) => updateCandidateField(candidate.id, 'votes', newVotes)}
                      min={0}
                      step={1}
                      className="text-sm text-muted-foreground"
                    >
                      <span>{candidateVotes?.toLocaleString()}</span>
                    </InlineNumberEdit>
                  </div>
                </div>
                <Progress value={getFieldValue(candidate.percentage)} className="h-2" />
              </div>
            );
          })}
          
          {/* Expand/Collapse Button */}
          {hasMoreCandidates && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCandidates(!showAllCandidates)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showAllCandidates ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show {sortedCandidates.length - 3} More
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        <div className="pt-2 border-t text-sm text-muted-foreground">
          <div className="flex justify-between">
            <InlineNumberEdit
              field={race.totalVotes}
              fieldName="Total Votes"
              onUpdate={(newTotalVotes) => updateRaceField('totalVotes', newTotalVotes)}
              min={0}
              step={1}
            >
              <span>Total Votes: {(totalVotesValue || 0).toLocaleString()}</span>
            </InlineNumberEdit>
            <div className="flex items-center gap-2">
              <span>Updated: {new Date(race.lastUpdated).toLocaleTimeString()}</span>
              {race.lastApUpdate && (
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  AP: {new Date(race.lastApUpdate).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Edit Image Dialog */}
      {editingImageCandidate && (() => {
        const candidate = race.candidates.find(c => c.id === editingImageCandidate);
        if (!candidate) return null;
        
        return (
          <EditImageDialog
            isOpen={true}
            onClose={() => setEditingImageCandidate(null)}
            candidate={{
              name: getFieldValue(candidate.name),
              party: getFieldValue(candidate.party),
              imageUrl: getFieldValue(candidate.headshot || '')
            }}
            onImageUpdate={(imageUrl) => {
              updateCandidateField(candidate.id, 'headshot', imageUrl);
              setEditingImageCandidate(null);
            }}
            hasImageOverride={isFieldOverridden(candidate.headshot)}
            hasNameOverride={isFieldOverridden(candidate.name)}
            hasPartyOverride={isFieldOverridden(candidate.party)}
          />
        );
      })()}

      {/* Generate Synthetic Scenario Modal */}
      <GenerateSyntheticScenarioModal
        isOpen={showSyntheticModal}
        onClose={() => setShowSyntheticModal(false)}
        race={race}
        candidates={race.candidates}
        providers={providers}
        onSubmitWorkflow={(scenario, modifiedCandidates) => runPreview(scenario, race, modifiedCandidates)}
        onConfirmSave={(preview) => confirmSave(preview, race, race.candidates)}
        isLoading={isSyntheticLoading}
        parties={parties}
      />

      {/* Race Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="!max-w-[1120px] max-h-[90vh] overflow-hidden flex flex-col" style={{ maxWidth: '1120px' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Race Summary
            </DialogTitle>
            <DialogDescription>
              {titleValue}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 pr-2">
            {/* Text Summary - Moved to Top */}
            <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                AI Analysis
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {typeof race.summary === 'string' 
                  ? race.summary 
                  : race.summary?.text || 'No summary available'}
              </p>
            </div>
            
            {/* Scenario Input Display */}
            {race.scenario_input && (
              <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Scenario Parameters
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* AI Provider */}
                  {race.scenario_input.aiProvider && (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">AI Provider</div>
                        <div className="text-sm font-medium">{race.scenario_input.aiProvider}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* County Strategy */}
                  {race.scenario_input.countyStrategy && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">County Strategy</div>
                        <div className="text-sm font-medium capitalize">{race.scenario_input.countyStrategy}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Shifts Display */}
                <div className="mt-4 space-y-2">
                  {/* Democrat Shift */}
                  {race.scenario_input.democratShift !== undefined && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Democrat Shift</span>
                        <span className="font-medium text-blue-600">{race.scenario_input.democratShift > 0 ? '+' : ''}{race.scenario_input.democratShift}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${Math.abs(race.scenario_input.democratShift)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Republican Shift */}
                  {race.scenario_input.republicanShift !== undefined && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Republican Shift</span>
                        <span className="font-medium text-red-600">{race.scenario_input.republicanShift > 0 ? '+' : ''}{race.scenario_input.republicanShift}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 transition-all duration-500"
                          style={{ width: `${Math.abs(race.scenario_input.republicanShift)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Independent Shift */}
                  {race.scenario_input.independentShift !== undefined && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Independent Shift</span>
                        <span className="font-medium text-purple-600">{race.scenario_input.independentShift > 0 ? '+' : ''}{race.scenario_input.independentShift}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 transition-all duration-500"
                          style={{ width: `${Math.abs(race.scenario_input.independentShift)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Turnout Shift */}
                  {race.scenario_input.turnoutShift !== undefined && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Turnout Shift</span>
                        <span className="font-medium text-green-600">{race.scenario_input.turnoutShift > 0 ? '+' : ''}{race.scenario_input.turnoutShift}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${Math.abs(race.scenario_input.turnoutShift)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Custom Instructions */}
                {race.scenario_input.customInstructions && race.scenario_input.customInstructions.trim() && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs text-muted-foreground mb-1">Custom Instructions</div>
                    <div className="text-sm italic text-foreground/80">"{race.scenario_input.customInstructions}"</div>
                  </div>
                )}
              </div>
            )}
            
            {/* Visual Results Summary */}
            <div className="space-y-4">
              {/* Top Candidates Visual */}
              <div className="grid grid-cols-1 gap-3">
                {sortedCandidates.slice(0, 3).map((candidate, index) => {
                  const candidateName = getFieldValue(candidate.name);
                  const candidateParty = getFieldValue(candidate.party);
                  const candidateVotes = getFieldValue(candidate.votes);
                  const candidatePercentage = getFieldValue(candidate.percentage);
                  const candidateWinner = getFieldValue(candidate.winner);
                  
                  return (
                    <motion.div 
                      key={candidate.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border"
                    >
                      <div className="flex-shrink-0">
                        <Avatar className="h-12 w-12 border-2" style={{ borderColor: getPartyColor(candidateParty, parties) }}>
                          <AvatarImage src={getFieldValue(candidate.headshot || '')} alt={candidateName} />
                          <AvatarFallback>
                            <User className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold truncate">{candidateName}</span>
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-1.5 py-0"
                            style={{ 
                              backgroundColor: `${getPartyColor(candidateParty, parties)}20`,
                              color: getPartyColor(candidateParty, parties),
                              borderColor: getPartyColor(candidateParty, parties)
                            }}
                          >
                            {candidateParty}
                          </Badge>
                          {candidateWinner && (
                            <Badge variant="default" className="text-xs px-1.5 py-0 bg-green-500">
                              WINNER
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full transition-all duration-500"
                                style={{ 
                                  width: `${candidatePercentage}%`,
                                  backgroundColor: getPartyColor(candidateParty, parties)
                                }}
                              />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-lg" style={{ color: getPartyColor(candidateParty, parties) }}>
                              {candidatePercentage}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {candidateVotes?.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Total Votes</div>
                  <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {totalVotesValue?.toLocaleString() || 0}
                  </div>
                </div>
                
                <div className="p-3 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-xs text-green-600 dark:text-green-400 mb-1">Reporting</div>
                  <div className="text-xl font-bold text-green-900 dark:text-green-100">
                    {reportingValue}%
                  </div>
                </div>
                
                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Candidates</div>
                  <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
                    {race.candidates.length}
                  </div>
                </div>
              </div>
              
              {/* Vote Margin Visualization */}
              {sortedCandidates.length >= 2 && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Vote Margin
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">{getFieldValue(sortedCandidates[0].name)}</div>
                      <div className="font-bold text-lg">{getFieldValue(sortedCandidates[0].percentage)}%</div>
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="text-center mb-1">
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {(getFieldValue(sortedCandidates[0].percentage) - getFieldValue(sortedCandidates[1].percentage)).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-center text-muted-foreground">
                        {(getFieldValue(sortedCandidates[0].votes) - getFieldValue(sortedCandidates[1].votes)).toLocaleString()} votes
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">{getFieldValue(sortedCandidates[1].name)}</div>
                      <div className="font-bold text-lg">{getFieldValue(sortedCandidates[1].percentage)}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the race.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                setIsDeleting(true);
                if (onDeleteRace) {
                  await onDeleteRace(race.id);
                }
                setIsDeleting(false);
                setShowDeleteConfirm(false);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}