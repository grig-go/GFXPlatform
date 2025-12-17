/**
 * Types for MediaPickerDialog component
 */

export interface MediaAsset {
  id: string;
  name: string;
  file_name: string;
  file_url: string;
  thumbnail_url: string | null;
  media_type: 'image' | 'video' | 'audio';
  tags: string[];
  created_at: string;
}

export interface OrganizationTexture {
  id: string;
  organizationId: string;
  name: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  storagePath: string;
  mediaType: 'image' | 'video';
  size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  uploadedBy: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SportsTeam {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  logoBadge?: string;
  banner?: string;
  jersey?: string;
  stadium?: string;
  location?: string;
  league: string;
  sport: string;
  country?: string;
  description?: string;
}

export type LeagueKey = 'NFL' | 'NBA' | 'WNBA' | 'MLB' | 'NHL' | 'EPL' | 'MLS' | 'LaLiga' | 'Bundesliga' | 'SerieA' | 'Ligue1' | 'NCAAF' | 'NCAAB';

export interface LeagueCategory {
  category: string;
  leagues: Array<{
    key: LeagueKey;
    id: string;
    name: string;
    sport: string;
    displayName: string;
  }>;
}

export type MediaPickerTab = 'browse' | 'textures' | 'sports';

export interface MediaPickerServices {
  // Media library
  fetchMedia: (options?: {
    limit?: number;
    offset?: number;
    type?: 'image' | 'video' | 'audio';
    search?: string;
  }) => Promise<{ data: MediaAsset[]; count: number }>;
  searchMedia: (query: string, options?: {
    limit?: number;
    offset?: number;
    type?: 'image' | 'video' | 'audio';
  }) => Promise<{ results: MediaAsset[]; total: number }>;
  uploadMedia: (file: File, options?: {
    name?: string;
    tags?: string[];
  }) => Promise<MediaAsset>;

  // Textures (optional)
  fetchTextures?: (organizationId: string, options?: {
    limit?: number;
    type?: 'image' | 'video';
    search?: string;
  }) => Promise<{ data: OrganizationTexture[]; count: number; hasMore: boolean }>;
  uploadTexture?: (file: File, organizationId: string, userId: string, options?: {
    name?: string;
    tags?: string[];
  }) => Promise<OrganizationTexture>;
  deleteTexture?: (textureId: string) => Promise<void>;

  // Sports (optional)
  searchTeams?: (query: string) => Promise<SportsTeam[]>;
  getTeamsByLeague?: (leagueKey: LeagueKey) => Promise<SportsTeam[]>;
  getLeagueCategories?: () => LeagueCategory[];

  // Image processing (optional)
  removeWhiteBackground?: (imageUrl: string) => Promise<string>;
}

export interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, asset?: MediaAsset) => void;
  mediaType?: 'image' | 'video' | 'audio' | 'all';
  title?: string;

  // Services
  services: MediaPickerServices;

  // Auth context (for textures)
  organizationId?: string;
  userId?: string;

  // Feature flags
  enableTextures?: boolean;
  enableSports?: boolean;
  enableBackgroundRemoval?: boolean;

  // Custom tabs
  defaultTab?: MediaPickerTab;

  // Render props for additional features
  renderAIButton?: (props: { onGenerate: () => void }) => React.ReactNode;
  renderAIEditButton?: (props: { imageUrl: string; onEdit: () => void }) => React.ReactNode;
}
