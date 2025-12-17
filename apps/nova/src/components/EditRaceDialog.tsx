import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Trash2, Plus, RotateCcw, AlertTriangle } from "lucide-react";
import { Race, Candidate, createOverride, revertOverride, getFieldValue, isFieldOverridden } from "../types/election";
import { OverrideIndicator } from "./OverrideIndicator";

interface EditRaceDialogProps {
  race: Race | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (race: Race) => void;
}

interface OverrideReasonDialogProps {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  fieldName: string;
  currentValue: string;
  newValue: string;
}

function OverrideReasonDialog({ open, onConfirm, onCancel, fieldName, currentValue, newValue }: OverrideReasonDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  const handleCancel = () => {
    onCancel();
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Override AP Data
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              You're about to override the AP data for: <strong>{fieldName}</strong>
            </p>
          </div>
          
          <div className="space-y-2">
            <div>
              <Label className="text-sm">Current (AP) Value:</Label>
              <div className="bg-muted px-3 py-2 rounded text-sm font-mono">{currentValue}</div>
            </div>
            <div>
              <Label className="text-sm">New Override Value:</Label>
              <div className="bg-blue-50 px-3 py-2 rounded text-sm font-mono border-l-2 border-blue-400">{newValue}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Override (optional):</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Correcting reporting error, Updated from official source..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Create Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditRaceDialog({ race, open, onOpenChange, onSave }: EditRaceDialogProps) {
  const [editedRace, setEditedRace] = useState<Race | null>(null);
  const [overrideDialog, setOverrideDialog] = useState<{
    open: boolean;
    fieldName: string;
    fieldPath: string;
    currentValue: string;
    newValue: string;
    onConfirm: (reason: string) => void;
  }>({
    open: false,
    fieldName: '',
    fieldPath: '',
    currentValue: '',
    newValue: '',
    onConfirm: () => {}
  });

  useState(() => {
    if (race) {
      setEditedRace({ ...race, candidates: [...race.candidates] });
    }
  }, [race]);

  if (!editedRace || !race) return null;

  const createFieldOverride = (fieldPath: string, fieldName: string, newValue: any, reason: string) => {
    const pathParts = fieldPath.split('.');
    
    setEditedRace(prev => {
      if (!prev) return null;
      
      if (pathParts.length === 1) {
        // Race field
        const field = pathParts[0] as keyof Race;
        const currentValue = getFieldValue(prev[field]);
        
        return {
          ...prev,
          [field]: createOverride(currentValue, newValue, reason)
        };
      } else if (pathParts[0] === 'candidates') {
        // Candidate field
        const candidateId = pathParts[1];
        const field = pathParts[2] as keyof Candidate;
        
        const candidates = prev.candidates.map(c => {
          if (c.id === candidateId) {
            const currentValue = getFieldValue(c[field]);
            return {
              ...c,
              [field]: createOverride(currentValue, newValue, reason)
            };
          }
          return c;
        });
        
        // Recalculate totals
        const totalVotes = candidates.reduce((sum, c) => sum + getFieldValue(c.votes), 0);
        const updatedCandidates = candidates.map(c => ({
          ...c,
          percentage: totalVotes > 0 ? Number(((getFieldValue(c.votes) / totalVotes) * 100).toFixed(1)) : 0
        }));
        
        return { ...prev, candidates: updatedCandidates, totalVotes };
      }
      
      return prev;
    });
  };

  const updateField = (fieldPath: string, fieldName: string, newValue: any) => {
    const pathParts = fieldPath.split('.');
    
    if (pathParts.length === 1) {
      // Race field
      const field = pathParts[0] as keyof Race;
      const currentField = editedRace[field];
      const currentValue = getFieldValue(currentField);
      
      if (String(currentValue) !== String(newValue)) {
        if (isFieldOverridden(currentField) && currentField.isOverridden) {
          // Already overridden, just update the override value
          setEditedRace(prev => prev ? {
            ...prev,
            [field]: { ...currentField, overriddenValue: newValue }
          } : null);
        } else {
          // Need to create an override
          setOverrideDialog({
            open: true,
            fieldName,
            fieldPath,
            currentValue: String(currentValue),
            newValue: String(newValue),
            onConfirm: (reason) => {
              createFieldOverride(fieldPath, fieldName, newValue, reason);
              setOverrideDialog(prev => ({ ...prev, open: false }));
            }
          });
        }
      }
    } else if (pathParts[0] === 'candidates') {
      // Candidate field
      const candidateId = pathParts[1];
      const field = pathParts[2] as keyof Candidate;
      
      const candidate = editedRace.candidates.find(c => c.id === candidateId);
      if (!candidate) return;
      
      const currentField = candidate[field];
      const currentValue = getFieldValue(currentField);
      
      if (String(currentValue) !== String(newValue)) {
        if (isFieldOverridden(currentField) && currentField.isOverridden) {
          // Already overridden, just update the override value
          setEditedRace(prev => {
            if (!prev) return null;
            const candidates = prev.candidates.map(c => {
              if (c.id === candidateId) {
                return { ...c, [field]: { ...currentField, overriddenValue: newValue } };
              }
              return c;
            });
            
            // Recalculate totals if votes changed
            if (field === 'votes') {
              const totalVotes = candidates.reduce((sum, c) => sum + getFieldValue(c.votes), 0);
              const updatedCandidates = candidates.map(c => ({
                ...c,
                percentage: totalVotes > 0 ? Number(((getFieldValue(c.votes) / totalVotes) * 100).toFixed(1)) : 0
              }));
              return { ...prev, candidates: updatedCandidates, totalVotes };
            }
            
            return { ...prev, candidates };
          });
        } else {
          // Need to create an override
          setOverrideDialog({
            open: true,
            fieldName: `${candidate.name || 'Candidate'} - ${fieldName}`,
            fieldPath,
            currentValue: String(currentValue),
            newValue: String(newValue),
            onConfirm: (reason) => {
              createFieldOverride(fieldPath, fieldName, newValue, reason);
              setOverrideDialog(prev => ({ ...prev, open: false }));
            }
          });
        }
      }
    }
  };

  const revertFieldOverride = (fieldPath: string) => {
    const pathParts = fieldPath.split('.');
    
    setEditedRace(prev => {
      if (!prev) return null;
      
      if (pathParts.length === 1) {
        // Race field
        const field = pathParts[0] as keyof Race;
        const currentField = prev[field];
        
        if (isFieldOverridden(currentField)) {
          return {
            ...prev,
            [field]: revertOverride(currentField)
          };
        }
      } else if (pathParts[0] === 'candidates') {
        // Candidate field
        const candidateId = pathParts[1];
        const field = pathParts[2] as keyof Candidate;
        
        const candidates = prev.candidates.map(c => {
          if (c.id === candidateId) {
            const currentField = c[field];
            if (isFieldOverridden(currentField)) {
              return {
                ...c,
                [field]: revertOverride(currentField)
              };
            }
          }
          return c;
        });
        
        // Recalculate totals if votes changed
        if (field === 'votes') {
          const totalVotes = candidates.reduce((sum, c) => sum + getFieldValue(c.votes), 0);
          const updatedCandidates = candidates.map(c => ({
            ...c,
            percentage: totalVotes > 0 ? Number(((getFieldValue(c.votes) / totalVotes) * 100).toFixed(1)) : 0
          }));
          return { ...prev, candidates: updatedCandidates, totalVotes };
        }
        
        return { ...prev, candidates };
      }
      
      return prev;
    });
  };

  const addCandidate = () => {
    const newCandidate: Candidate = {
      id: `cand-${Date.now()}`,
      name: 'New Candidate',
      party: 'DEM',
      votes: 0,
      percentage: 0,
      incumbent: false
    };
    
    setEditedRace(prev => {
      if (!prev) return null;
      return { ...prev, candidates: [...prev.candidates, newCandidate] };
    });
  };

  const removeCandidate = (candidateId: string) => {
    setEditedRace(prev => {
      if (!prev) return null;
      const candidates = prev.candidates.filter(c => c.id !== candidateId);
      const totalVotes = candidates.reduce((sum, c) => sum + getFieldValue(c.votes), 0);
      const updatedCandidates = candidates.map(c => ({
        ...c,
        percentage: totalVotes > 0 ? Number(((getFieldValue(c.votes) / totalVotes) * 100).toFixed(1)) : 0
      }));
      
      return { ...prev, candidates: updatedCandidates, totalVotes };
    });
  };

  const handleSave = () => {
    if (editedRace) {
      onSave({
        ...editedRace,
        lastUpdated: new Date().toISOString()
      });
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Race: {getFieldValue(editedRace.title)}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Race Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Race Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="title">Race Title</Label>
                    <OverrideIndicator 
                      field={editedRace.title} 
                      fieldName="Title"
                      onRevert={() => revertFieldOverride('title')}
                    />
                  </div>
                  <Input
                    id="title"
                    value={getFieldValue(editedRace.title)}
                    onChange={(e) => updateField('title', 'Title', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="status">Status</Label>
                    <OverrideIndicator 
                      field={editedRace.status} 
                      fieldName="Status"
                      onRevert={() => revertFieldOverride('status')}
                    />
                  </div>
                  <Select
                    value={getFieldValue(editedRace.status)}
                    onValueChange={(value: any) => updateField('status', 'Status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOT_CALLED">Not Called</SelectItem>
                      <SelectItem value="PROJECTED">Projected</SelectItem>
                      <SelectItem value="CALLED">Called</SelectItem>
                      <SelectItem value="RECOUNT">Recount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="reporting">Reporting Percentage</Label>
                    <OverrideIndicator 
                      field={editedRace.reportingPercentage} 
                      fieldName="Reporting %"
                      onRevert={() => revertFieldOverride('reportingPercentage')}
                    />
                  </div>
                  <Input
                    id="reporting"
                    type="number"
                    min="0"
                    max="100"
                    value={getFieldValue(editedRace.reportingPercentage)}
                    onChange={(e) => updateField('reportingPercentage', 'Reporting %', Number(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={editedRace.state}
                    onChange={(e) => setEditedRace(prev => prev ? { ...prev, state: e.target.value } : null)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Candidates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Candidates</h3>
                <Button onClick={addCandidate} size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Candidate
                </Button>
              </div>
              
              <div className="space-y-3">
                {editedRace.candidates.map((candidate) => {
                  const candidateHasOverrides = isFieldOverridden(candidate.name) ||
                                                isFieldOverridden(candidate.party) ||
                                                isFieldOverridden(candidate.votes) ||
                                                isFieldOverridden(candidate.incumbent) ||
                                                isFieldOverridden(candidate.winner);

                  return (
                    <div key={candidate.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{getFieldValue(candidate.party)}</Badge>
                          {getFieldValue(candidate.incumbent) && <Badge variant="outline">INC</Badge>}
                          {getFieldValue(candidate.winner) && <Badge variant="default">WINNER</Badge>}
                          {candidateHasOverrides && (
                            <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Modified
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCandidate(candidate.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Name</Label>
                            <OverrideIndicator 
                              field={candidate.name} 
                              fieldName="Name"
                              onRevert={() => revertFieldOverride(`candidates.${candidate.id}.name`)}
                            />
                          </div>
                          <Input
                            value={getFieldValue(candidate.name)}
                            onChange={(e) => updateField(`candidates.${candidate.id}.name`, 'Name', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Party</Label>
                            <OverrideIndicator 
                              field={candidate.party} 
                              fieldName="Party"
                              onRevert={() => revertFieldOverride(`candidates.${candidate.id}.party`)}
                            />
                          </div>
                          <Select
                            value={getFieldValue(candidate.party)}
                            onValueChange={(value: any) => updateField(`candidates.${candidate.id}.party`, 'Party', value)}
                          >
                            <SelectTrigger>
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
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Votes</Label>
                            <OverrideIndicator 
                              field={candidate.votes} 
                              fieldName="Votes"
                              onRevert={() => revertFieldOverride(`candidates.${candidate.id}.votes`)}
                            />
                          </div>
                          <Input
                            type="number"
                            min="0"
                            value={getFieldValue(candidate.votes)}
                            onChange={(e) => updateField(`candidates.${candidate.id}.votes`, 'Votes', Number(e.target.value))}
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={getFieldValue(candidate.incumbent)}
                              onChange={(e) => updateField(`candidates.${candidate.id}.incumbent`, 'Incumbent', e.target.checked)}
                              className="rounded"
                            />
                            Incumbent
                          </label>
                          <OverrideIndicator 
                            field={candidate.incumbent} 
                            fieldName="Incumbent"
                            onRevert={() => revertFieldOverride(`candidates.${candidate.id}.incumbent`)}
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={getFieldValue(candidate.winner) || false}
                              onChange={(e) => updateField(`candidates.${candidate.id}.winner`, 'Winner', e.target.checked)}
                              className="rounded"
                            />
                            Winner
                          </label>
                          <OverrideIndicator 
                            field={candidate.winner} 
                            fieldName="Winner"
                            onRevert={() => revertFieldOverride(`candidates.${candidate.id}.winner`)}
                          />
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Percentage: {candidate.percentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OverrideReasonDialog
        open={overrideDialog.open}
        fieldName={overrideDialog.fieldName}
        currentValue={overrideDialog.currentValue}
        newValue={overrideDialog.newValue}
        onConfirm={overrideDialog.onConfirm}
        onCancel={() => setOverrideDialog(prev => ({ ...prev, open: false }))}
      />
    </>
  );
}
