import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Upload, AlertTriangle } from "lucide-react";
import { supabase } from '../utils/supabase/client';

interface EditImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: {
    name: string;
    party: string;
    imageUrl?: string;
  };
  onImageUpdate: (imageUrl: string) => void;
  hasImageOverride: boolean;
  hasNameOverride?: boolean;
  hasPartyOverride?: boolean;
}

export function EditImageDialog({
  isOpen,
  onClose,
  candidate,
  onImageUpdate,
  hasImageOverride,
  hasNameOverride = false,
  hasPartyOverride = false,
}: EditImageDialogProps) {
  const [imageUrl, setImageUrl] = useState(candidate.imageUrl || '');
  const [isUploading, setIsUploading] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getPartyLabel = (party: string) => {
    switch (party) {
      case 'DEM': return 'Democratic';
      case 'REP': return 'Republican';
      case 'IND': return 'Independent';
      default: return party;
    }
  };

  const handleSetImage = () => {
    if (imageUrl.trim()) {
      onImageUpdate(imageUrl.trim());
      onClose();
    }
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

          // Update with the new URL
          onImageUpdate(imageUrl);
          setIsUploading(false);
          onClose();
        } catch (error) {
          console.error('Error uploading file:', error);
          alert('Failed to upload image. Please try again.');
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSetImage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle className="sr-only">Edit Candidate Image</DialogTitle>
          <DialogDescription className="sr-only">
            Update the headshot image for the selected candidate by entering a URL or uploading a file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Candidate Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={candidate.imageUrl} alt={candidate.name} />
              <AvatarFallback className="bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Upload className="w-6 h-6 opacity-60" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{candidate.name}</span>
                {hasNameOverride && (
                  <Badge variant="secondary" className="text-xs bg-amber-500 text-white flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Override
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{getPartyLabel(candidate.party)}</span>
                {hasPartyOverride && (
                  <Badge variant="secondary" className="text-xs bg-amber-500 text-white flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Override
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Edit Section */}
          <div className="space-y-4 pt-2 border-t">
            <h3 className="font-semibold">Edit</h3>
            
            {/* Image URL Input */}
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSetImage}
                  disabled={!imageUrl.trim()}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  Set
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Or upload file</Label>
              <Button
                variant="outline"
                onClick={handleFileUpload}
                disabled={isUploading}
                className="w-full flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>

            {/* Current Override Status */}
            {hasImageOverride && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  Image has been overridden from original source
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}