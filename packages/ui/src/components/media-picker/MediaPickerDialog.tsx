import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../dialog';
import { Button } from '../button';
import { Input } from '../input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';
import { ScrollArea } from '../scroll-area';
import { cn } from '../../utils';
import type {
  MediaPickerDialogProps,
  MediaAsset,
  OrganizationTexture,
  SportsTeam,
  LeagueKey,
  MediaPickerTab,
} from './types';

// Icons - inline SVG components for portability
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const VideoIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
  </svg>
);

const MusicIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={cn(className, 'animate-spin')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

const FolderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);

const UploadIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12v9" /><path d="m16 16-4-4-4 4" />
  </svg>
);

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const LayersIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const EraserIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" />
  </svg>
);

// Helper to format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  mediaType = 'all',
  title = 'Select Media',
  services,
  organizationId,
  userId,
  enableTextures = true,
  enableSports = true,
  enableBackgroundRemoval = true,
  defaultTab = 'browse',
  renderAIButton,
  renderAIEditButton,
}: MediaPickerDialogProps) {
  const [activeTab, setActiveTab] = useState<MediaPickerTab>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'audio'>(
    mediaType === 'all' ? 'all' : mediaType
  );
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textureFileInputRef = useRef<HTMLInputElement>(null);

  // Textures tab state
  const [textures, setTextures] = useState<OrganizationTexture[]>([]);
  const [texturesLoading, setTexturesLoading] = useState(false);
  const [textureSearchQuery, setTextureSearchQuery] = useState('');
  const [textureTypeFilter, setTextureTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedTexture, setSelectedTexture] = useState<OrganizationTexture | null>(null);
  const [textureUploadProgress, setTextureUploadProgress] = useState<string | null>(null);
  const [deletingTextureId, setDeletingTextureId] = useState<string | null>(null);

  // Sports tab state
  const [sportsTeams, setSportsTeams] = useState<SportsTeam[]>([]);
  const [sportsLoading, setSportsLoading] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<LeagueKey | null>(null);
  const [sportsSearchQuery, setSportsSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<SportsTeam | null>(null);
  const leagueCategories = services.getLeagueCategories?.() || [];

  // Background removal state
  const [removeBackground, setRemoveBackground] = useState(false);
  const [isProcessingBackground, setIsProcessingBackground] = useState(false);

  // Load initial media
  const loadMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await services.fetchMedia({
        limit: 50,
        type: typeFilter === 'all' ? undefined : typeFilter,
        search: searchQuery || undefined,
      });
      setAssets(result.data || []);
    } catch (error) {
      console.error('Failed to load media:', error);
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [services, typeFilter, searchQuery]);

  // Search media
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadMedia();
      return;
    }

    setIsLoading(true);
    try {
      const result = await services.searchMedia(searchQuery, {
        limit: 50,
        type: typeFilter === 'all' ? undefined : typeFilter,
      });
      setAssets(result.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [services, searchQuery, typeFilter, loadMedia]);

  // Load media when dialog opens or filter changes
  useEffect(() => {
    if (open) {
      loadMedia();
    }
  }, [open, typeFilter, loadMedia]);

  // Load sports teams when league is selected
  const loadSportsTeams = useCallback(async (league: LeagueKey) => {
    if (!services.getTeamsByLeague) return;
    setSportsLoading(true);
    try {
      const teams = await services.getTeamsByLeague(league);
      setSportsTeams(teams);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setSportsTeams([]);
    } finally {
      setSportsLoading(false);
    }
  }, [services]);

  // Handle sports team search
  const handleSportsSearch = useCallback(async () => {
    if (!services.searchTeams) return;

    if (!sportsSearchQuery.trim()) {
      if (selectedLeague) {
        loadSportsTeams(selectedLeague);
      } else {
        setSportsTeams([]);
      }
      return;
    }

    setSportsLoading(true);
    try {
      const teams = await services.searchTeams(sportsSearchQuery);
      setSportsTeams(teams);
    } catch (error) {
      console.error('Sports search failed:', error);
      setSportsTeams([]);
    } finally {
      setSportsLoading(false);
    }
  }, [services, sportsSearchQuery, selectedLeague, loadSportsTeams]);

  // Load teams when league changes
  useEffect(() => {
    if (selectedLeague && activeTab === 'sports') {
      loadSportsTeams(selectedLeague);
    }
  }, [selectedLeague, activeTab, loadSportsTeams]);

  // Load organization textures
  const loadTextures = useCallback(async () => {
    if (!organizationId || !services.fetchTextures) return;

    setTexturesLoading(true);
    try {
      const result = await services.fetchTextures(organizationId, {
        limit: 50,
        type: textureTypeFilter === 'all' ? undefined : textureTypeFilter,
        search: textureSearchQuery || undefined,
      });
      setTextures(result.data);
    } catch (error) {
      console.error('Failed to load textures:', error);
      setTextures([]);
    } finally {
      setTexturesLoading(false);
    }
  }, [services, organizationId, textureTypeFilter, textureSearchQuery]);

  // Load textures when tab is active
  useEffect(() => {
    if (open && activeTab === 'textures' && organizationId) {
      loadTextures();
    }
  }, [open, activeTab, organizationId, loadTextures]);

  // Handle texture search
  const handleTextureSearch = useCallback(() => {
    loadTextures();
  }, [loadTextures]);

  // Handle texture file upload
  const handleTextureUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !organizationId || !userId || !services.uploadTexture) return;

    const file = files[0];

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setTextureUploadProgress('Only images and videos are supported');
      setTimeout(() => setTextureUploadProgress(null), 3000);
      return;
    }

    setTextureUploadProgress('Uploading...');

    try {
      const texture = await services.uploadTexture(file, organizationId, userId, {
        tags: [],
      });

      setTextureUploadProgress('Upload complete!');
      setTextures((prev) => [texture, ...prev]);
      setSelectedTexture(texture);

      setTimeout(() => {
        setTextureUploadProgress(null);
      }, 2000);
    } catch (error) {
      console.error('Texture upload failed:', error);
      setTextureUploadProgress('Upload failed. Please try again.');
      setTimeout(() => {
        setTextureUploadProgress(null);
      }, 3000);
    }
  };

  // Handle texture delete
  const handleDeleteTexture = async (textureId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!services.deleteTexture) return;
    if (!confirm('Are you sure you want to delete this texture?')) return;

    setDeletingTextureId(textureId);
    try {
      await services.deleteTexture(textureId);
      setTextures((prev) => prev.filter((t) => t.id !== textureId));
      if (selectedTexture?.id === textureId) {
        setSelectedTexture(null);
      }
    } catch (error) {
      console.error('Failed to delete texture:', error);
    } finally {
      setDeletingTextureId(null);
    }
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadProgress('Uploading...');

    try {
      const asset = await services.uploadMedia(file, {
        tags: ['nova-gfx'],
      });

      setUploadProgress('Upload complete!');
      setAssets((prev) => [asset, ...prev]);
      setSelectedAsset(asset);
      setActiveTab('browse');

      setTimeout(() => {
        setUploadProgress(null);
      }, 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress('Upload failed. Please try again.');
      setTimeout(() => {
        setUploadProgress(null);
      }, 3000);
    }
  };

  // Confirm selection
  const handleConfirm = async () => {
    const processUrl = async (url: string, isImage: boolean): Promise<string> => {
      if (removeBackground && isImage && services.removeWhiteBackground) {
        setIsProcessingBackground(true);
        try {
          const processedUrl = await services.removeWhiteBackground(url);
          return processedUrl;
        } catch (err) {
          console.error('Failed to remove background:', err);
          return url;
        } finally {
          setIsProcessingBackground(false);
        }
      }
      return url;
    };

    if (activeTab === 'textures' && selectedTexture) {
      const isImage = selectedTexture.mediaType === 'image';
      const finalUrl = await processUrl(selectedTexture.fileUrl, isImage);

      onSelect(finalUrl, {
        id: selectedTexture.id,
        name: selectedTexture.name,
        file_name: selectedTexture.fileName,
        file_url: finalUrl,
        thumbnail_url: selectedTexture.thumbnailUrl || selectedTexture.fileUrl,
        media_type: selectedTexture.mediaType,
        tags: selectedTexture.tags,
        created_at: selectedTexture.createdAt,
      });
      onOpenChange(false);
    } else if (activeTab === 'sports' && selectedTeam) {
      const finalUrl = await processUrl(selectedTeam.logo, true);
      onSelect(finalUrl);
      onOpenChange(false);
    } else if (selectedAsset) {
      const isImage = selectedAsset.media_type === 'image';
      const finalUrl = await processUrl(selectedAsset.file_url, isImage);
      onSelect(finalUrl, { ...selectedAsset, file_url: finalUrl });
      onOpenChange(false);
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <VideoIcon className="w-3.5 h-3.5 text-white" />;
      case 'audio':
        return <MusicIcon className="w-3.5 h-3.5 text-white" />;
      default:
        return <ImageIcon className="w-3.5 h-3.5 text-white" />;
    }
  };

  // Determine which tabs to show
  const showTextures = enableTextures && services.fetchTextures;
  const showSports = enableSports && services.searchTeams && services.getTeamsByLeague;
  const showBackgroundRemoval = enableBackgroundRemoval && services.removeWhiteBackground;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 bg-card border-border">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as MediaPickerTab)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 py-3 border-b border-border flex items-center justify-between">
            <TabsList className="bg-muted">
              <TabsTrigger value="browse" className="gap-2 data-[state=active]:bg-background">
                <FolderIcon className="w-4 h-4" />
                Media Library
              </TabsTrigger>
              {showTextures && (
                <TabsTrigger value="textures" className="gap-2 data-[state=active]:bg-background">
                  <LayersIcon className="w-4 h-4" />
                  Textures
                </TabsTrigger>
              )}
              {showSports && (
                <TabsTrigger value="sports" className="gap-2 data-[state=active]:bg-background">
                  <TrophyIcon className="w-4 h-4" />
                  Teams
                </TabsTrigger>
              )}
            </TabsList>

            {activeTab === 'browse' && (
              <div className="flex items-center gap-2">
                <div className="flex border border-border rounded-md overflow-hidden bg-muted">
                  {['all', 'image', 'video', 'audio'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type as typeof typeFilter)}
                      className={cn(
                        'px-3 py-1.5 text-xs capitalize transition-colors',
                        typeFilter === type
                          ? 'bg-violet-500 text-white'
                          : 'text-muted-foreground hover:bg-background hover:text-foreground'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'textures' && (
              <div className="flex items-center gap-2">
                <div className="flex border border-border rounded-md overflow-hidden bg-muted">
                  {['all', 'image', 'video'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTextureTypeFilter(type as typeof textureTypeFilter)}
                      className={cn(
                        'px-3 py-1.5 text-xs capitalize transition-colors',
                        textureTypeFilter === type
                          ? 'bg-violet-500 text-white'
                          : 'text-muted-foreground hover:bg-background hover:text-foreground'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Browse Tab */}
          <TabsContent value="browse" className="flex-1 overflow-hidden m-0 bg-background">
            <div className="p-4 border-b border-border">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search media..."
                    className="pl-9 bg-muted border-border"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isLoading} className="bg-violet-500 hover:bg-violet-600 text-white">
                  {isLoading ? <LoaderIcon className="w-4 h-4" /> : 'Search'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!uploadProgress}
                  className="gap-2 border-border"
                >
                  <UploadIcon className="w-4 h-4" />
                  Upload
                </Button>
                {renderAIButton && renderAIButton({ onGenerate: () => {} })}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>
              {uploadProgress && (
                <div className="mt-2 text-sm text-violet-500 flex items-center gap-2">
                  <LoaderIcon className="w-4 h-4" />
                  {uploadProgress}
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 h-[calc(100%-120px)]">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoaderIcon className="w-8 h-8 text-violet-500" />
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <FolderIcon className="w-12 h-12 mb-4" />
                  <p>No media found</p>
                  <p className="text-sm">Try a different search or upload new media</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden border-2 transition-all group',
                        selectedAsset?.id === asset.id
                          ? 'border-violet-500 ring-2 ring-violet-500/30'
                          : 'border-transparent hover:border-violet-500/50'
                      )}
                    >
                      <img
                        src={asset.thumbnail_url || asset.file_url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1 text-white">
                        {getTypeIcon(asset.media_type)}
                      </div>

                      {selectedAsset?.id === asset.id && (
                        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                          <div className="bg-violet-500 rounded-full p-1">
                            <CheckIcon className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{asset.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Textures Tab */}
          {showTextures && (
            <TabsContent value="textures" className="flex-1 overflow-hidden m-0 bg-background">
              <div className="p-4 border-b border-border">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={textureSearchQuery}
                      onChange={(e) => setTextureSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTextureSearch()}
                      placeholder="Search textures..."
                      className="pl-9 bg-muted border-border"
                    />
                  </div>
                  <Button onClick={handleTextureSearch} disabled={texturesLoading} className="bg-violet-500 hover:bg-violet-600 text-white">
                    {texturesLoading ? <LoaderIcon className="w-4 h-4" /> : 'Search'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => textureFileInputRef.current?.click()}
                    disabled={!organizationId || !!textureUploadProgress}
                    className="gap-2 border-border"
                  >
                    <UploadIcon className="w-4 h-4" />
                    Upload
                  </Button>
                  <input
                    ref={textureFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => handleTextureUpload(e.target.files)}
                  />
                </div>
                {textureUploadProgress && (
                  <div className="mt-2 text-sm text-violet-500 flex items-center gap-2">
                    <LoaderIcon className="w-4 h-4" />
                    {textureUploadProgress}
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1 h-[calc(100%-120px)]">
                {texturesLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <LoaderIcon className="w-8 h-8 text-violet-500" />
                  </div>
                ) : !organizationId ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <LayersIcon className="w-12 h-12 mb-4" />
                    <p>Sign in to access organization textures</p>
                  </div>
                ) : textures.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <LayersIcon className="w-12 h-12 mb-4" />
                    <p>No textures found</p>
                    <p className="text-sm">Upload images or videos for your organization</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4">
                    {textures.map((texture) => (
                      <div
                        key={texture.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedTexture(texture)}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedTexture(texture)}
                        className={cn(
                          'relative aspect-square rounded-lg overflow-hidden border-2 transition-all group cursor-pointer',
                          selectedTexture?.id === texture.id
                            ? 'border-violet-500 ring-2 ring-violet-500/30'
                            : 'border-transparent hover:border-violet-500/50'
                        )}
                      >
                        <img
                          src={texture.thumbnailUrl || texture.fileUrl}
                          alt={texture.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />

                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1 text-white">
                          {texture.mediaType === 'video' ? (
                            <VideoIcon className="w-3.5 h-3.5" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5" />
                          )}
                          {texture.mediaType === 'video' && texture.duration && (
                            <span className="text-[10px]">{formatDuration(texture.duration)}</span>
                          )}
                        </div>

                        {services.deleteTexture && (
                          <button
                            onClick={(e) => handleDeleteTexture(texture.id, e)}
                            disabled={deletingTextureId === texture.id}
                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {deletingTextureId === texture.id ? (
                              <LoaderIcon className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <TrashIcon className="w-3.5 h-3.5 text-white" />
                            )}
                          </button>
                        )}

                        {selectedTexture?.id === texture.id && (
                          <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center pointer-events-none">
                            <div className="bg-violet-500 rounded-full p-1">
                              <CheckIcon className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <p className="text-white text-xs truncate">{texture.name}</p>
                          <p className="text-white/60 text-[10px] flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {new Date(texture.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          )}

          {/* Sports Tab */}
          {showSports && (
            <TabsContent value="sports" className="flex-1 overflow-hidden m-0 bg-background">
              <div className="flex h-full">
                <div className="w-56 border-r border-border p-3 overflow-y-auto">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                    Leagues
                  </h3>
                  {leagueCategories.map((category) => (
                    <div key={category.category} className="mb-4">
                      <p className="text-xs text-muted-foreground px-2 mb-1">{category.category}</p>
                      {category.leagues.map((league) => (
                        <button
                          key={league.key}
                          onClick={() => {
                            setSelectedLeague(league.key);
                            setSportsSearchQuery('');
                          }}
                          className={cn(
                            'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                            selectedLeague === league.key
                              ? 'bg-violet-500 text-white'
                              : 'text-foreground hover:bg-muted'
                          )}
                        >
                          {league.displayName || league.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b border-border">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={sportsSearchQuery}
                          onChange={(e) => setSportsSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSportsSearch()}
                          placeholder="Search all teams..."
                          className="pl-9 bg-muted border-border"
                        />
                      </div>
                      <Button onClick={handleSportsSearch} disabled={sportsLoading} className="bg-violet-500 hover:bg-violet-600 text-white">
                        {sportsLoading ? <LoaderIcon className="w-4 h-4" /> : 'Search'}
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    {sportsLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <LoaderIcon className="w-8 h-8 text-violet-500" />
                      </div>
                    ) : sportsTeams.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <TrophyIcon className="w-12 h-12 mb-4" />
                        <p>Select a league or search for teams</p>
                        <p className="text-sm">NFL, NBA, MLB, NHL, MLS, and more</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 md:grid-cols-5 gap-3 p-4">
                        {sportsTeams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => setSelectedTeam(team)}
                            className={cn(
                              'relative aspect-square rounded-lg overflow-hidden border-2 transition-all group bg-white p-2',
                              selectedTeam?.id === team.id
                                ? 'border-violet-500 ring-2 ring-violet-500/30'
                                : 'border-transparent hover:border-violet-500/50'
                            )}
                          >
                            <img
                              src={team.logo}
                              alt={team.name}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />

                            {selectedTeam?.id === team.id && (
                              <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                                <div className="bg-violet-500 rounded-full p-1">
                                  <CheckIcon className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-white text-xs truncate">{team.name}</p>
                              <p className="text-white/60 text-[10px] truncate">{team.league}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {activeTab === 'textures' && selectedTexture ? (
                <span className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-violet-500" />
                  Selected: <strong className="text-foreground">{selectedTexture.name}</strong>
                  <span className="text-xs">({selectedTexture.mediaType})</span>
                </span>
              ) : activeTab === 'sports' && selectedTeam ? (
                <span className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-violet-500" />
                  Selected: <strong className="text-foreground">{selectedTeam.name}</strong>
                  <span className="text-xs">({selectedTeam.league})</span>
                </span>
              ) : selectedAsset ? (
                <span className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-violet-500" />
                  Selected: <strong className="text-foreground">{selectedAsset.name}</strong>
                </span>
              ) : (
                'Select media or upload a new file'
              )}
            </div>

            {/* Remove Background Option */}
            {showBackgroundRemoval && (
              ((activeTab === 'textures' && selectedTexture?.mediaType === 'image') ||
                (activeTab === 'sports' && selectedTeam) ||
                (activeTab === 'browse' && selectedAsset?.media_type === 'image')) && (
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none group">
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      removeBackground
                        ? 'bg-violet-500 border-violet-500'
                        : 'border-muted-foreground/50 hover:border-violet-400'
                    )}
                    onClick={() => setRemoveBackground(!removeBackground)}
                  >
                    {removeBackground && <CheckIcon className="w-3 h-3 text-white" />}
                  </div>
                  <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
                    <EraserIcon className="w-3.5 h-3.5" />
                    Remove white background
                  </span>
                </label>
              )
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">
              Cancel
            </Button>
            {renderAIEditButton &&
              ((activeTab === 'textures' && selectedTexture?.mediaType === 'image') ||
                (activeTab === 'browse' && selectedAsset?.media_type === 'image')) &&
              renderAIEditButton({
                imageUrl: activeTab === 'textures' ? selectedTexture!.fileUrl : selectedAsset!.file_url,
                onEdit: () => {},
              })}
            <Button
              onClick={handleConfirm}
              disabled={
                isProcessingBackground ||
                (activeTab === 'textures' ? !selectedTexture :
                  activeTab === 'sports' ? !selectedTeam :
                    !selectedAsset)
              }
              className="bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
            >
              {isProcessingBackground ? (
                <>
                  <LoaderIcon className="w-4 h-4 mr-2" />
                  Processing...
                </>
              ) : (
                'Insert Media'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
