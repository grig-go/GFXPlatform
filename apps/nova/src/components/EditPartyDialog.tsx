import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Party } from "../types/election";
import { Plus, X } from "lucide-react";

interface EditPartyDialogProps {
  party: Party;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (party: Party) => void;
}

export function EditPartyDialog({ party, open, onOpenChange, onSave }: EditPartyDialogProps) {
  // Ensure arrays are always arrays
  const normalizeParty = (partyData: Party): Party => {
    return {
      ...partyData,
      abbreviations: Array.isArray(partyData.abbreviations) ? partyData.abbreviations : [],
      aliases: Array.isArray(partyData.aliases) ? partyData.aliases : [],
      leaders: Array.isArray(partyData.leaders) ? partyData.leaders : []
    };
  };

  const [editedParty, setEditedParty] = useState<Party>(normalizeParty(party));
  const [newAbbreviation, setNewAbbreviation] = useState("");
  const [newAlias, setNewAlias] = useState("");
  const [newLeader, setNewLeader] = useState({ title: "", name: "", since: "" });

  // Update state when party prop changes (important for when switching between parties)
  useEffect(() => {
    setEditedParty(normalizeParty(party));
  }, [party]);

  const handleSave = () => {
    // Create a copy of the party to save
    let partyToSave = { ...editedParty };

    // Add any typed but not yet added abbreviation
    if (newAbbreviation.trim()) {
      partyToSave.abbreviations = [...partyToSave.abbreviations, newAbbreviation.trim()];
    }

    // Add any typed but not yet added alias
    if (newAlias.trim()) {
      partyToSave.aliases = [...partyToSave.aliases, newAlias.trim()];
    }

    // Add any typed but not yet added leader
    if (newLeader.title.trim() && newLeader.name.trim()) {
      partyToSave.leaders = [...(partyToSave.leaders || []), { ...newLeader }];
    }

    onSave(partyToSave);
    onOpenChange(false);
  };

  const addAbbreviation = () => {
    if (newAbbreviation.trim()) {
      setEditedParty({
        ...editedParty,
        abbreviations: [...editedParty.abbreviations, newAbbreviation.trim()]
      });
      setNewAbbreviation("");
    }
  };

  const removeAbbreviation = (index: number) => {
    setEditedParty({
      ...editedParty,
      abbreviations: editedParty.abbreviations.filter((_, i) => i !== index)
    });
  };

  const addAlias = () => {
    if (newAlias.trim()) {
      setEditedParty({
        ...editedParty,
        aliases: [...editedParty.aliases, newAlias.trim()]
      });
      setNewAlias("");
    }
  };

  const removeAlias = (index: number) => {
    setEditedParty({
      ...editedParty,
      aliases: editedParty.aliases.filter((_, i) => i !== index)
    });
  };

  const addLeader = () => {
    if (newLeader.title.trim() && newLeader.name.trim()) {
      setEditedParty({
        ...editedParty,
        leaders: [...(editedParty.leaders || []), { ...newLeader }]
      });
      setNewLeader({ title: "", name: "", since: "" });
    }
  };

  const removeLeader = (index: number) => {
    setEditedParty({
      ...editedParty,
      leaders: editedParty.leaders?.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Party Information</DialogTitle>
          <DialogDescription>
            Update party details, leadership, and branding
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Logo/Color Preview */}
          <div className="flex items-center gap-4">
            <div 
              className="w-20 h-20 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: editedParty.colors.primary }}
            >
              {editedParty.code}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Party Code: {editedParty.code}</p>
              <p className="text-xs text-muted-foreground">Code cannot be changed</p>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Short Name</Label>
              <Input
                id="name"
                value={editedParty.name}
                onChange={(e) => setEditedParty({ ...editedParty, name: e.target.value })}
                placeholder="e.g., Democratic Party"
              />
            </div>
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={editedParty.fullName}
                onChange={(e) => setEditedParty({ ...editedParty, fullName: e.target.value })}
                placeholder="e.g., Democratic Party of the United States"
              />
            </div>
          </div>

          {/* Founded */}
          <div>
            <Label htmlFor="founded">Founded</Label>
            <Input
              id="founded"
              value={editedParty.founded || ""}
              onChange={(e) => setEditedParty({ ...editedParty, founded: e.target.value })}
              placeholder="e.g., 1828"
            />
          </div>

          {/* Color Palette */}
          <div>
            <Label>Color Palette</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="color-primary" className="text-sm">Primary</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-primary"
                    type="color"
                    value={editedParty.colors.primary}
                    onChange={(e) => setEditedParty({ 
                      ...editedParty, 
                      colors: { ...editedParty.colors, primary: e.target.value },
                      color: e.target.value
                    })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={editedParty.colors.primary}
                    onChange={(e) => setEditedParty({ 
                      ...editedParty, 
                      colors: { ...editedParty.colors, primary: e.target.value },
                      color: e.target.value
                    })}
                    placeholder="#0015BC"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-secondary" className="text-sm">Secondary</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-secondary"
                    type="color"
                    value={editedParty.colors.secondary}
                    onChange={(e) => setEditedParty({ 
                      ...editedParty, 
                      colors: { ...editedParty.colors, secondary: e.target.value }
                    })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={editedParty.colors.secondary}
                    onChange={(e) => setEditedParty({ 
                      ...editedParty, 
                      colors: { ...editedParty.colors, secondary: e.target.value }
                    })}
                    placeholder="#2E5EAA"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-light" className="text-sm">Light</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-light"
                    type="color"
                    value={editedParty.colors.light}
                    onChange={(e) => setEditedParty({ 
                      ...editedParty, 
                      colors: { ...editedParty.colors, light: e.target.value }
                    })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={editedParty.colors.light}
                    onChange={(e) => setEditedParty({ 
                      ...editedParty, 
                      colors: { ...editedParty.colors, light: e.target.value }
                    })}
                    placeholder="#6B9BD1"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-dark" className="text-sm">Dark</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-dark"
                    type="color"
                    value={editedParty.colors.dark}
                    onChange={(e) => setEditedParty({ 
                      ...editedParty, 
                      colors: { ...editedParty.colors, dark: e.target.value }
                    })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={editedParty.colors.dark}
                    onChange={(e) => setEditedParty({ 
                      ...editedParty, 
                      colors: { ...editedParty.colors, dark: e.target.value }
                    })}
                    placeholder="#001F7A"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Abbreviations */}
          <div>
            <Label>Abbreviations</Label>
            <div className="space-y-2 mt-2">
              {editedParty.abbreviations.map((abbr, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={abbr} readOnly className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAbbreviation(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newAbbreviation}
                  onChange={(e) => setNewAbbreviation(e.target.value)}
                  placeholder="Add abbreviation (e.g., Dem)"
                  onKeyPress={(e) => e.key === 'Enter' && addAbbreviation()}
                />
                <Button type="button" onClick={addAbbreviation} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Aliases */}
          <div>
            <Label>Aliases (Also Known As)</Label>
            <div className="space-y-2 mt-2">
              {editedParty.aliases.map((alias, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={alias} readOnly className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAlias(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="Add alias (e.g., Democrats)"
                  onKeyPress={(e) => e.key === 'Enter' && addAlias()}
                />
                <Button type="button" onClick={addAlias} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editedParty.description || ""}
              onChange={(e) => setEditedParty({ ...editedParty, description: e.target.value })}
              placeholder="Brief description of the party..."
              rows={2}
            />
          </div>

          {/* Ideology */}
          <div>
            <Label htmlFor="ideology">Ideology</Label>
            <Input
              id="ideology"
              value={editedParty.ideology || ""}
              onChange={(e) => setEditedParty({ ...editedParty, ideology: e.target.value })}
              placeholder="e.g., Modern liberalism, social liberalism"
            />
          </div>

          {/* Headquarters */}
          <div>
            <Label htmlFor="headquarters">Headquarters</Label>
            <Input
              id="headquarters"
              value={editedParty.headquarters || ""}
              onChange={(e) => setEditedParty({ ...editedParty, headquarters: e.target.value })}
              placeholder="e.g., Washington, D.C."
            />
          </div>

          {/* History */}
          <div>
            <Label htmlFor="history">History</Label>
            <Textarea
              id="history"
              value={editedParty.history || ""}
              onChange={(e) => setEditedParty({ ...editedParty, history: e.target.value })}
              placeholder="Historical background of the party..."
              rows={3}
            />
          </div>

          {/* Leaders */}
          <div>
            <Label>Leadership</Label>
            <div className="space-y-2 mt-2">
              {editedParty.leaders?.map((leader, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Title:</span> {leader.title}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Name:</span> {leader.name}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Since:</span> {leader.since || "N/A"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLeader(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={newLeader.title}
                  onChange={(e) => setNewLeader({ ...newLeader, title: e.target.value })}
                  placeholder="Title (e.g., Chair)"
                />
                <Input
                  value={newLeader.name}
                  onChange={(e) => setNewLeader({ ...newLeader, name: e.target.value })}
                  placeholder="Name"
                />
                <div className="flex gap-2">
                  <Input
                    value={newLeader.since}
                    onChange={(e) => setNewLeader({ ...newLeader, since: e.target.value })}
                    placeholder="Since (e.g., 2021)"
                  />
                  <Button type="button" onClick={addLeader} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={editedParty.website || ""}
              onChange={(e) => setEditedParty({ ...editedParty, website: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {/* Social Media */}
          <div>
            <Label>Social Media</Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <Label htmlFor="twitter" className="text-sm">Twitter/X</Label>
                <Input
                  id="twitter"
                  value={editedParty.socialMedia?.twitter || ""}
                  onChange={(e) => setEditedParty({ 
                    ...editedParty, 
                    socialMedia: { ...editedParty.socialMedia, twitter: e.target.value }
                  })}
                  placeholder="@handle"
                />
              </div>
              <div>
                <Label htmlFor="facebook" className="text-sm">Facebook</Label>
                <Input
                  id="facebook"
                  value={editedParty.socialMedia?.facebook || ""}
                  onChange={(e) => setEditedParty({ 
                    ...editedParty, 
                    socialMedia: { ...editedParty.socialMedia, facebook: e.target.value }
                  })}
                  placeholder="Page name"
                />
              </div>
              <div>
                <Label htmlFor="instagram" className="text-sm">Instagram</Label>
                <Input
                  id="instagram"
                  value={editedParty.socialMedia?.instagram || ""}
                  onChange={(e) => setEditedParty({ 
                    ...editedParty, 
                    socialMedia: { ...editedParty.socialMedia, instagram: e.target.value }
                  })}
                  placeholder="@handle"
                />
              </div>
            </div>
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
