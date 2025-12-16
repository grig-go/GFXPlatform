/**
 * MediaPickerDialog wrapper for Nova GFX
 * Uses the shared MediaPickerDialog from @emergent-platform/ui with Nova GFX services
 */
import { useState } from 'react';
import {
  MediaPickerDialog as SharedMediaPickerDialog,
  type MediaPickerServices,
  type MediaAsset,
  removeWhiteBackground,
} from '@emergent-platform/ui';
import { Button } from '@emergent-platform/ui';
import {
  fetchNovaMedia,
  searchNovaMedia,
  uploadToNovaMedia,
  fetchOrganizationTextures,
  uploadTexture,
  deleteTexture,
  searchTeams,
  getTeamsByLeague,
  getLeagueCategories,
} from '@emergent-platform/supabase-client';
import { useAuthStore } from '@/stores/authStore';
import { AIImageGeneratorDialog, type AISaveMode } from './AIImageGeneratorDialog';
import { Sparkles } from 'lucide-react';

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, asset?: MediaAsset) => void;
  mediaType?: 'image' | 'video' | 'audio' | 'all';
  title?: string;
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  mediaType = 'all',
  title = 'Select Media',
}: MediaPickerDialogProps) {
  const { user, organization } = useAuthStore();

  // AI Generator state
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [aiGeneratorSaveMode, setAiGeneratorSaveMode] = useState<AISaveMode>('media-library');
  const [aiEditImageUrl, setAiEditImageUrl] = useState<string | undefined>(undefined);

  // Create services object for the shared component
  const services: MediaPickerServices = {
    // Media library
    fetchMedia: async (options) => {
      const result = await fetchNovaMedia(options);
      return { data: result.data || [], count: result.count || 0 };
    },
    searchMedia: async (query, options) => {
      const result = await searchNovaMedia(query, options);
      return { results: result.results || [], total: result.total || 0 };
    },
    uploadMedia: async (file, options) => {
      return uploadToNovaMedia(file, options);
    },

    // Textures
    fetchTextures: async (orgId, options) => {
      return fetchOrganizationTextures(orgId, options);
    },
    uploadTexture: async (file, orgId, userId, options) => {
      return uploadTexture(file, orgId, userId, options);
    },
    deleteTexture: async (textureId) => {
      return deleteTexture(textureId);
    },

    // Sports
    searchTeams: async (query) => {
      return searchTeams(query);
    },
    getTeamsByLeague: async (leagueKey) => {
      return getTeamsByLeague(leagueKey);
    },
    getLeagueCategories: () => {
      return getLeagueCategories();
    },

    // Image processing
    removeWhiteBackground: async (imageUrl) => {
      return removeWhiteBackground(imageUrl);
    },
  };

  return (
    <>
      <SharedMediaPickerDialog
        open={open && !aiGeneratorOpen}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        mediaType={mediaType}
        title={title}
        services={services}
        organizationId={organization?.id}
        userId={user?.id}
        enableTextures={true}
        enableSports={true}
        enableBackgroundRemoval={true}
        renderAIButton={({ onGenerate }) => (
          <Button
            variant="outline"
            onClick={() => {
              setAiEditImageUrl(undefined);
              setAiGeneratorSaveMode('media-library');
              setAiGeneratorOpen(true);
            }}
            className="gap-2 border-border"
          >
            <Sparkles className="w-4 h-4" />
            AI Gen
          </Button>
        )}
        renderAIEditButton={({ imageUrl, onEdit }) => (
          <Button
            variant="outline"
            onClick={() => {
              setAiEditImageUrl(imageUrl);
              setAiGeneratorSaveMode('media-library');
              setAiGeneratorOpen(true);
            }}
            className="gap-2 border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
          >
            <Sparkles className="w-4 h-4" />
            AI Edit
          </Button>
        )}
      />

      {/* AI Image Generator Dialog */}
      <AIImageGeneratorDialog
        open={aiGeneratorOpen}
        onOpenChange={(isOpen) => {
          setAiGeneratorOpen(isOpen);
          if (!isOpen) {
            setAiEditImageUrl(undefined);
          }
        }}
        existingImageUrl={aiEditImageUrl}
        onSelect={(url, asset) => {
          setAiGeneratorOpen(false);
          onSelect(url, asset);
          onOpenChange(false);
        }}
        saveMode={aiGeneratorSaveMode}
        organizationId={organization?.id}
        userId={user?.id}
      />
    </>
  );
}
