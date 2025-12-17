/**
 * MediaPickerDialog wrapper for Pulsar GFX
 * Uses the shared MediaPickerDialog from @emergent-platform/ui with Pulsar GFX services
 */
import {
  MediaPickerDialog as SharedMediaPickerDialog,
  type MediaPickerServices,
  type MediaAsset,
  removeWhiteBackground,
} from '@emergent-platform/ui';
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
      return uploadToNovaMedia(file, { ...options, createdBy: 'pulsar-gfx' });
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
    <SharedMediaPickerDialog
      open={open}
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
    />
  );
}
