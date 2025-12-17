import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { CandidateProfile, Party } from "../types/election";
import { Plus, X, Upload } from "lucide-react";
import { supabase } from '../utils/supabase/client';

interface EditCandidateDialogProps {
  candidate: CandidateProfile;
  parties: Party[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (candidate: CandidateProfile) => void;
}

export function EditCandidateDialog({ candidate, parties, open, onOpenChange, onSave }: EditCandidateDialogProps) {
  // Helper function to split fullName intelligently
  const splitFullName = (fullName: string) => {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) {
      return { firstName: nameParts[0], lastName: '' };
    } else if (nameParts.length === 2) {
      return { firstName: nameParts[0], lastName: nameParts[1] };
    } else {
      // For names with more than 2 parts, treat everything except the last as first name
      const lastName = nameParts[nameParts.length - 1];
      const firstName = nameParts.slice(0, -1).join(' ');
      return { firstName, lastName };
    }
  };

  // Initialize candidate with proper name splitting
  const initializeCandidate = (candidateData: CandidateProfile) => {
    const { firstName, lastName } = splitFullName(candidateData.fullName);
    return {
      ...candidateData,
      firstName: firstName || candidateData.firstName,
      lastName: lastName || candidateData.lastName
    };
  };

  const [editedCandidate, setEditedCandidate] = useState<CandidateProfile>(initializeCandidate(candidate));
  const [newEducation, setNewEducation] = useState("");
  const [newExperience, setNewExperience] = useState("");
  const [newOccupation, setNewOccupation] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Update state when candidate prop changes (important for when switching between candidates)
  useEffect(() => {
    setEditedCandidate(initializeCandidate(candidate));
  }, [candidate]);

  console.log('EditCandidateDialog....apply...')
  console.log(candidate)

  const handleSave = () => {
    // Create a copy of the candidate to save
    let candidateToSave = { ...editedCandidate };

    // Add any typed but not yet added education
    if (newEducation.trim()) {
      candidateToSave.education = [...(candidateToSave.education || []), newEducation.trim()];
    }

    // Add any typed but not yet added occupation
    if (newOccupation.trim()) {
      candidateToSave.occupation = [...(candidateToSave.occupation || []), newOccupation.trim()];
    }

    // Add any typed but not yet added experience
    if (newExperience.trim()) {
      candidateToSave.experience = [...(candidateToSave.experience || []), newExperience.trim()];
    }

    onSave(candidateToSave);
    onOpenChange(false);
  };

  const addEducation = () => {
    if (newEducation.trim()) {
      setEditedCandidate({
        ...editedCandidate,
        education: [...(editedCandidate.education || []), newEducation.trim()]
      });
      setNewEducation("");
    }
  };

  const removeEducation = (index: number) => {
    setEditedCandidate({
      ...editedCandidate,
      education: editedCandidate.education?.filter((_, i) => i !== index)
    });
  };

  const addExperience = () => {
    if (newExperience.trim()) {
      setEditedCandidate({
        ...editedCandidate,
        experience: [...(editedCandidate.experience || []), newExperience.trim()]
      });
      setNewExperience("");
    }
  };

  const removeExperience = (index: number) => {
    setEditedCandidate({
      ...editedCandidate,
      experience: editedCandidate.experience?.filter((_, i) => i !== index)
    });
  };

  const addOccupation = () => {
    if (newOccupation.trim()) {
      setEditedCandidate({
        ...editedCandidate,
        occupation: [...(editedCandidate.occupation || []), newOccupation.trim()]
      });
      setNewOccupation("");
    }
  };

  const removeOccupation = (index: number) => {
    setEditedCandidate({
      ...editedCandidate,
      occupation: editedCandidate.occupation?.filter((_, i) => i !== index)
    });
  };

  const handleFileUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsUploading(true);
        try {
          // Use singleton Supabase client

          // Generate unique filename using timestamp and original filename
          const timestamp = Date.now();
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filename = `${timestamp}_${sanitizedName}`;
          const filePath = `candidate-images/${filename}`;

          // Upload to Supabase Storage
          const { error } = await supabase.storage
            .from('election-images')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) {
            throw error;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('election-images')
            .getPublicUrl(filePath);

          const imageUrl = urlData.publicUrl;

          // Update the candidate with the new image URL
          setEditedCandidate({ ...editedCandidate, headshot: imageUrl });
          setIsUploading(false);
        } catch (error) {
          console.error('Error uploading file:', error);
          alert('Failed to upload image. Please try again.');
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Candidate Profile</DialogTitle>
          <DialogDescription>
            Update candidate information and biographical details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Headshot Preview */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={editedCandidate.headshot} alt={editedCandidate.fullName} />
              <AvatarFallback>{editedCandidate.firstName[0]}{editedCandidate.lastName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Label htmlFor="headshot">Headshot URL</Label>
              <Input
                id="headshot"
                value={editedCandidate.headshot || ""}
                onChange={(e) => setEditedCandidate({ ...editedCandidate, headshot: e.target.value })}
                placeholder="https://..."
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleFileUpload}
                disabled={isUploading}
                className="w-full flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={editedCandidate.firstName}
                onChange={(e) => setEditedCandidate({ 
                  ...editedCandidate, 
                  firstName: e.target.value,
                  fullName: `${e.target.value} ${editedCandidate.lastName}`
                })}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={editedCandidate.lastName}
                onChange={(e) => setEditedCandidate({ 
                  ...editedCandidate, 
                  lastName: e.target.value,
                  fullName: `${editedCandidate.firstName} ${e.target.value}`
                })}
              />
            </div>
          </div>

          {/* Party Selection */}
          <div>
            <Label htmlFor="party">Party</Label>
            <Select
              value={editedCandidate.party}
              onValueChange={(value) => setEditedCandidate({ 
                ...editedCandidate, 
                party: value as CandidateProfile['party']
              })}
              disabled={true}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {parties.map(party => (
                  <SelectItem key={party.code} value={party.code}>
                    {party.name} ({party.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Occupation */}
          <div>
            <Label>Occupation</Label>
            <div className="space-y-2 mt-2">
              {editedCandidate.occupation?.map((occ, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={occ} readOnly className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOccupation(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newOccupation}
                  onChange={(e) => setNewOccupation(e.target.value)}
                  placeholder="Add occupation (e.g., U.S. Senator, Governor)"
                  onKeyPress={(e) => e.key === 'Enter' && addOccupation()}
                />
                <Button onClick={addOccupation} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Biography</Label>
            <Textarea
              id="bio"
              value={editedCandidate.bio || ""}
              onChange={(e) => setEditedCandidate({ ...editedCandidate, bio: e.target.value })}
              placeholder="Brief biography..."
              rows={3}
            />
          </div>

          {/* Birth Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                type="date"
                value={editedCandidate.birthDate || ""}
                onChange={(e) => setEditedCandidate({ ...editedCandidate, birthDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="birthPlace">Birth Place</Label>
              <Input
                id="birthPlace"
                value={editedCandidate.birthPlace || ""}
                onChange={(e) => setEditedCandidate({ ...editedCandidate, birthPlace: e.target.value })}
                placeholder="City, State"
              />
            </div>
          </div>

          {/* Education */}
          <div>
            <Label>Education</Label>
            <div className="space-y-2 mt-2">
              {editedCandidate.education?.map((edu, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={edu} readOnly className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEducation(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newEducation}
                  onChange={(e) => setNewEducation(e.target.value)}
                  placeholder="Add education (e.g., Harvard University - BA)"
                  onKeyPress={(e) => e.key === 'Enter' && addEducation()}
                />
                <Button onClick={addEducation} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div>
            <Label>Experience</Label>
            <div className="space-y-2 mt-2">
              {editedCandidate.experience?.map((exp, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={exp} readOnly className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExperience(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newExperience}
                  onChange={(e) => setNewExperience(e.target.value)}
                  placeholder="Add experience (e.g., U.S. Senator 2013-Present)"
                  onKeyPress={(e) => e.key === 'Enter' && addExperience()}
                />
                <Button onClick={addExperience} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={editedCandidate.website || ""}
              onChange={(e) => setEditedCandidate({ ...editedCandidate, website: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {/* Incumbent Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="incumbent"
              checked={editedCandidate.incumbent || false}
              onChange={(e) => setEditedCandidate({ ...editedCandidate, incumbent: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="incumbent">Incumbent</Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
