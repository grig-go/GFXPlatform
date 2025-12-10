import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ScrollArea,
  cn,
} from '@emergent-platform/ui';
import {
  Search, Upload, Image as ImageIcon, Video, Music, Loader2, Check,
  FolderOpen, UploadCloud, HardDrive, Trophy, User, Layers, Trash2, Clock
} from 'lucide-react';
import {
  fetchNovaMedia,
  searchNovaMedia,
  uploadToNovaMedia,
  type NovaMediaAsset,
} from '@/services/novaMediaService';
import {
  searchTeams,
  getTeamsByLeague,
  getLeagueCategories,
  searchPlayers,
  getPlayersByTeam,
  type SportsTeam,
  type SportsPlayer,
  type LeagueKey,
} from '@/services/sportsDbService';
import {
  fetchOrganizationTextures,
  uploadTexture,
  deleteTexture,
  formatDuration,
  type OrganizationTexture,
} from '@/services/textureService';
import { useAuthStore } from '@/stores/authStore';

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, asset?: NovaMediaAsset) => void;
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
  const [activeTab, setActiveTab] = useState<'browse' | 'textures' | 'sports' | 'players' | 'upload'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<NovaMediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<NovaMediaAsset | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'audio'>(
    mediaType === 'all' ? 'all' : mediaType
  );
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textureFileInputRef = useRef<HTMLInputElement>(null);

  // Auth state for organization textures
  const { user, organization } = useAuthStore();

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
  const leagueCategories = getLeagueCategories();

  // Players tab state
  const [players, setPlayers] = useState<SportsPlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [playerTeamQuery, setPlayerTeamQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<SportsPlayer | null>(null);

  // Load initial media
  const loadMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchNovaMedia({
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
  }, [typeFilter, searchQuery]);

  // Search media
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadMedia();
      return;
    }

    setIsLoading(true);
    try {
      const result = await searchNovaMedia(searchQuery, {
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
  }, [searchQuery, typeFilter, loadMedia]);

  // Load media when dialog opens or filter changes
  useEffect(() => {
    if (open) {
      loadMedia();
    }
  }, [open, typeFilter, loadMedia]);

  // Load sports teams when league is selected
  const loadSportsTeams = useCallback(async (league: LeagueKey) => {
    setSportsLoading(true);
    try {
      const teams = await getTeamsByLeague(league);
      setSportsTeams(teams);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setSportsTeams([]);
    } finally {
      setSportsLoading(false);
    }
  }, []);

  // Handle sports team search
  const handleSportsSearch = useCallback(async () => {
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
      const teams = await searchTeams(sportsSearchQuery);
      setSportsTeams(teams);
    } catch (error) {
      console.error('Sports search failed:', error);
      setSportsTeams([]);
    } finally {
      setSportsLoading(false);
    }
  }, [sportsSearchQuery, selectedLeague, loadSportsTeams]);

  // Load teams when league changes
  useEffect(() => {
    if (selectedLeague && activeTab === 'sports') {
      loadSportsTeams(selectedLeague);
    }
  }, [selectedLeague, activeTab, loadSportsTeams]);

  // Handle player search by name
  const handlePlayerSearch = useCallback(async () => {
    if (!playerSearchQuery.trim()) {
      setPlayers([]);
      return;
    }

    setPlayersLoading(true);
    try {
      const results = await searchPlayers(playerSearchQuery);
      setPlayers(results);
    } catch (error) {
      console.error('Player search failed:', error);
      setPlayers([]);
    } finally {
      setPlayersLoading(false);
    }
  }, [playerSearchQuery]);

  // Handle player search by team
  const handlePlayerTeamSearch = useCallback(async () => {
    if (!playerTeamQuery.trim()) {
      setPlayers([]);
      return;
    }

    setPlayersLoading(true);
    try {
      const results = await getPlayersByTeam(playerTeamQuery);
      setPlayers(results);
    } catch (error) {
      console.error('Player team search failed:', error);
      setPlayers([]);
    } finally {
      setPlayersLoading(false);
    }
  }, [playerTeamQuery]);

  // Load organization textures
  const loadTextures = useCallback(async () => {
    if (!organization?.id) return;

    setTexturesLoading(true);
    try {
      const result = await fetchOrganizationTextures(organization.id, {
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
  }, [organization?.id, textureTypeFilter, textureSearchQuery]);

  // Load textures when tab is active
  useEffect(() => {
    if (open && activeTab === 'textures' && organization?.id) {
      loadTextures();
    }
  }, [open, activeTab, organization?.id, loadTextures]);

  // Handle texture search
  const handleTextureSearch = useCallback(() => {
    loadTextures();
  }, [loadTextures]);

  // Handle texture file upload
  const handleTextureUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !organization?.id || !user?.id) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setTextureUploadProgress('Only images and videos are supported');
      setTimeout(() => setTextureUploadProgress(null), 3000);
      return;
    }

    setTextureUploadProgress('Uploading...');

    try {
      const texture = await uploadTexture(file, organization.id, user.id, {
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

    if (!confirm('Are you sure you want to delete this texture?')) return;

    setDeletingTextureId(textureId);
    try {
      await deleteTexture(textureId);
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
      const asset = await uploadToNovaMedia(file, {
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

  // Handle local file selection (without uploading to Nova)
  const handleLocalFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Create a data URL for local files
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onSelect(dataUrl);
      onOpenChange(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Confirm selection
  const handleConfirm = () => {
    if (activeTab === 'textures' && selectedTexture) {
      // Convert OrganizationTexture to NovaMediaAsset-like object
      onSelect(selectedTexture.fileUrl, {
        id: selectedTexture.id,
        name: selectedTexture.name,
        file_name: selectedTexture.fileName,
        file_url: selectedTexture.fileUrl,
        thumbnail_url: selectedTexture.thumbnailUrl || selectedTexture.fileUrl,
        media_type: selectedTexture.mediaType,
        tags: selectedTexture.tags,
        created_at: selectedTexture.createdAt,
      } as NovaMediaAsset);
      onOpenChange(false);
    } else if (activeTab === 'sports' && selectedTeam) {
      onSelect(selectedTeam.logo);
      onOpenChange(false);
    } else if (activeTab === 'players' && selectedPlayer) {
      onSelect(selectedPlayer.headshot);
      onOpenChange(false);
    } else if (selectedAsset) {
      onSelect(selectedAsset.file_url, selectedAsset);
      onOpenChange(false);
    }
  };

  // Get type icon (always white for badge visibility)
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-3.5 h-3.5 text-white" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-white" />;
      default:
        return <ImageIcon className="w-3.5 h-3.5 text-white" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 bg-card border-border">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'browse' | 'textures' | 'sports' | 'players' | 'upload')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 py-3 border-b border-border flex items-center justify-between">
            <TabsList className="bg-muted">
              <TabsTrigger value="browse" className="gap-2 data-[state=active]:bg-background">
                <FolderOpen className="w-4 h-4" />
                Browse Nova
              </TabsTrigger>
              <TabsTrigger value="textures" className="gap-2 data-[state=active]:bg-background">
                <Layers className="w-4 h-4" />
                Textures
              </TabsTrigger>
              <TabsTrigger value="sports" className="gap-2 data-[state=active]:bg-background">
                <Trophy className="w-4 h-4" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="players" className="gap-2 data-[state=active]:bg-background">
                <User className="w-4 h-4" />
                Players
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2 data-[state=active]:bg-background">
                <Upload className="w-4 h-4" />
                Upload
              </TabsTrigger>
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

          <TabsContent value="browse" className="flex-1 overflow-hidden m-0 bg-background">
            <div className="p-4 border-b border-border">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search media..."
                    className="pl-9 bg-muted border-border"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isLoading} className="bg-violet-500 hover:bg-violet-600 text-white">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 h-[calc(100%-120px)]">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mb-4" />
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
                      
                      {/* Type badge */}
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1 text-white">
                        {getTypeIcon(asset.media_type)}
                      </div>

                      {/* Selection indicator */}
                      {selectedAsset?.id === asset.id && (
                        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                          <div className="bg-violet-500 rounded-full p-1">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Name overlay on hover */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{asset.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="textures" className="flex-1 overflow-hidden m-0 bg-background">
            <div className="p-4 border-b border-border">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={textureSearchQuery}
                    onChange={(e) => setTextureSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTextureSearch()}
                    placeholder="Search textures..."
                    className="pl-9 bg-muted border-border"
                  />
                </div>
                <Button onClick={handleTextureSearch} disabled={texturesLoading} className="bg-violet-500 hover:bg-violet-600 text-white">
                  {texturesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => textureFileInputRef.current?.click()}
                  disabled={!organization?.id || !!textureUploadProgress}
                  className="gap-2 border-border"
                >
                  <UploadCloud className="w-4 h-4" />
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
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {textureUploadProgress}
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 h-[calc(100%-120px)]">
              {texturesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : !organization?.id ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Layers className="w-12 h-12 mb-4" />
                  <p>Sign in to access organization textures</p>
                </div>
              ) : textures.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Layers className="w-12 h-12 mb-4" />
                  <p>No textures found</p>
                  <p className="text-sm">Upload images or videos for your organization</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4">
                  {textures.map((texture) => (
                    <button
                      key={texture.id}
                      onClick={() => setSelectedTexture(texture)}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden border-2 transition-all group',
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

                      {/* Type badge */}
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1 text-white">
                        {texture.mediaType === 'video' ? (
                          <Video className="w-3.5 h-3.5" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5" />
                        )}
                        {texture.mediaType === 'video' && texture.duration && (
                          <span className="text-[10px]">{formatDuration(texture.duration)}</span>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteTexture(texture.id, e)}
                        disabled={deletingTextureId === texture.id}
                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {deletingTextureId === texture.id ? (
                          <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>

                      {/* Selection indicator */}
                      {selectedTexture?.id === texture.id && (
                        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                          <div className="bg-violet-500 rounded-full p-1">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Name overlay on hover */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{texture.name}</p>
                        <p className="text-white/60 text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(texture.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sports" className="flex-1 overflow-hidden m-0 bg-background">
            <div className="flex h-full">
              {/* League sidebar */}
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

              {/* Teams grid */}
              <div className="flex-1 flex flex-col">
                {/* Search bar */}
                <div className="p-4 border-b border-border">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={sportsSearchQuery}
                        onChange={(e) => setSportsSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSportsSearch()}
                        placeholder="Search all teams..."
                        className="pl-9 bg-muted border-border"
                      />
                    </div>
                    <Button onClick={handleSportsSearch} disabled={sportsLoading} className="bg-violet-500 hover:bg-violet-600 text-white">
                      {sportsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                    </Button>
                  </div>
                </div>

                {/* Teams list */}
                <ScrollArea className="flex-1">
                  {sportsLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                    </div>
                  ) : sportsTeams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <Trophy className="w-12 h-12 mb-4" />
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

                          {/* Selection indicator */}
                          {selectedTeam?.id === team.id && (
                            <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                              <div className="bg-violet-500 rounded-full p-1">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}

                          {/* Name overlay on hover */}
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

          <TabsContent value="players" className="flex-1 overflow-hidden m-0 bg-background">
            <div className="flex flex-col h-full">
              {/* Search bars */}
              <div className="p-4 border-b border-border space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={playerSearchQuery}
                      onChange={(e) => setPlayerSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePlayerSearch()}
                      placeholder="Search player by name (e.g., LeBron James)"
                      className="pl-9 bg-muted border-border"
                    />
                  </div>
                  <Button onClick={handlePlayerSearch} disabled={playersLoading} className="bg-violet-500 hover:bg-violet-600 text-white">
                    {playersLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={playerTeamQuery}
                      onChange={(e) => setPlayerTeamQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePlayerTeamSearch()}
                      placeholder="Or browse by team name (e.g., Los Angeles Lakers)"
                      className="pl-9 bg-muted border-border"
                    />
                  </div>
                  <Button onClick={handlePlayerTeamSearch} disabled={playersLoading} variant="outline" className="border-border">
                    Browse Team
                  </Button>
                </div>
              </div>

              {/* Players grid */}
              <ScrollArea className="flex-1">
                {playersLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  </div>
                ) : players.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <User className="w-12 h-12 mb-4" />
                    <p>Search for player headshots</p>
                    <p className="text-sm">NFL, NBA, MLB, NHL, Soccer and more</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4">
                    {players.map((player) => (
                      <button
                        key={player.id}
                        onClick={() => setSelectedPlayer(player)}
                        className={cn(
                          'relative aspect-square rounded-lg overflow-hidden border-2 transition-all group bg-gradient-to-b from-gray-100 to-gray-200',
                          selectedPlayer?.id === player.id
                            ? 'border-violet-500 ring-2 ring-violet-500/30'
                            : 'border-transparent hover:border-violet-500/50'
                        )}
                      >
                        <img
                          src={player.headshot}
                          alt={player.name}
                          className="w-full h-full object-contain object-bottom"
                          loading="lazy"
                        />

                        {/* Selection indicator */}
                        {selectedPlayer?.id === player.id && (
                          <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                            <div className="bg-violet-500 rounded-full p-1">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Info overlay */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2">
                          <p className="text-white text-xs font-medium truncate">{player.name}</p>
                          <p className="text-white/70 text-[10px] truncate">
                            {player.team} {player.number && `#${player.number}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 overflow-hidden m-0 p-6 bg-background">
            <div
              className={cn(
                'h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors',
                dragActive ? 'border-violet-500 bg-violet-500/10' : 'border-muted-foreground/30'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploadProgress ? (
                <div className="text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-violet-500" />
                  <p className="text-lg font-medium text-foreground">{uploadProgress}</p>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2 text-foreground">
                    Drag & drop or click to upload
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Supports images, videos, and audio files
                  </p>

                  <div className="flex gap-4">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2 bg-violet-500 hover:bg-violet-600 text-white"
                    >
                      <UploadCloud className="w-4 h-4" />
                      Upload to Nova Library
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*,video/*,audio/*';
                        input.onchange = (e) => handleLocalFile((e.target as HTMLInputElement).files);
                        input.click();
                      }}
                      className="gap-2 border-border"
                    >
                      <HardDrive className="w-4 h-4" />
                      Use Local File
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer with selection info and confirm button */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
          <div className="text-sm text-muted-foreground">
            {activeTab === 'textures' && selectedTexture ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-violet-500" />
                Selected: <strong className="text-foreground">{selectedTexture.name}</strong>
                <span className="text-xs">({selectedTexture.mediaType})</span>
              </span>
            ) : activeTab === 'sports' && selectedTeam ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-violet-500" />
                Selected: <strong className="text-foreground">{selectedTeam.name}</strong>
                <span className="text-xs">({selectedTeam.league})</span>
              </span>
            ) : activeTab === 'players' && selectedPlayer ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-violet-500" />
                Selected: <strong className="text-foreground">{selectedPlayer.name}</strong>
                <span className="text-xs">({selectedPlayer.team})</span>
              </span>
            ) : selectedAsset ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-violet-500" />
                Selected: <strong className="text-foreground">{selectedAsset.name}</strong>
              </span>
            ) : (
              'Select media or upload a new file'
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                activeTab === 'textures' ? !selectedTexture :
                activeTab === 'sports' ? !selectedTeam :
                activeTab === 'players' ? !selectedPlayer :
                !selectedAsset
              }
              className="bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
            >
              Insert Media
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

