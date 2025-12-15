import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  ScrollArea,
  cn,
} from '@emergent-platform/ui';
import {
  Search,
  Image as ImageIcon,
  Video,
  Loader2,
  Check,
  UploadCloud,
  Layers,
  Trash2,
  Clock,
  Sparkles,
  Tag,
  X,
  CheckSquare,
  Square,
  Plus,
} from 'lucide-react';
import {
  fetchOrganizationTextures,
  uploadTexture,
  deleteTexture,
  batchDeleteTextures,
  batchUpdateTextureTags,
  formatDuration,
  type OrganizationTexture,
} from '@/services/textureService';
import { AIImageGeneratorDialog } from './AIImageGeneratorDialog';
import { useAuthStore } from '@/stores/authStore';

interface TexturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TexturesDialog({ open, onOpenChange }: TexturesDialogProps) {
  // Auth state for organization textures
  const { user, organization } = useAuthStore();

  // Textures state
  const [textures, setTextures] = useState<OrganizationTexture[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedTexture, setSelectedTexture] = useState<OrganizationTexture | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [deletingTextureId, setDeletingTextureId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tagMode, setTagMode] = useState<'add' | 'remove' | 'set'>('add');

  // AI Image Generator state
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);

  // Load textures
  const loadTextures = useCallback(async () => {
    if (!organization?.id) return;

    setIsLoading(true);
    try {
      const result = await fetchOrganizationTextures(organization.id, {
        limit: 100,
        type: typeFilter === 'all' ? undefined : typeFilter,
        search: searchQuery || undefined,
      });
      setTextures(result.data);
    } catch (error) {
      console.error('Failed to load textures:', error);
      setTextures([]);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, typeFilter, searchQuery]);

  // Load textures when dialog opens or filter changes
  useEffect(() => {
    if (!open) return;
    if (!organization?.id) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const result = await fetchOrganizationTextures(organization.id, {
          limit: 100,
          type: typeFilter === 'all' ? undefined : typeFilter,
          search: searchQuery || undefined,
        });
        if (!cancelled) {
          setTextures(result.data);
          setLoadError(null);
        }
      } catch (error) {
        console.error('Failed to load textures:', error);
        if (!cancelled) {
          setTextures([]);
          setLoadError(error instanceof Error ? error.message : 'Failed to load textures');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, organization?.id, typeFilter, searchQuery]);

  // Handle search
  const handleSearch = useCallback(() => {
    loadTextures();
  }, [loadTextures]);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !organization?.id || !user?.id) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setUploadProgress('Only images and videos are supported');
      setTimeout(() => setUploadProgress(null), 3000);
      return;
    }

    setUploadProgress('Uploading...');

    try {
      const texture = await uploadTexture(file, organization.id, user.id, {
        tags: [],
      });

      setUploadProgress('Upload complete!');
      setTextures((prev) => [texture, ...prev]);
      setSelectedTexture(texture);

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

  // Handle AI generated texture
  const handleAIGenerated = useCallback(
    (_url: string) => {
      setAiGeneratorOpen(false);
      // Reload textures to show the newly generated one
      loadTextures();
    },
    [loadTextures]
  );

  // Handle texture click with multi-select support
  const handleTextureClick = useCallback((texture: OrganizationTexture, e: React.MouseEvent) => {
    if (!isBatchMode) {
      setSelectedTexture(texture);
      return;
    }

    const textureIndex = textures.findIndex((t) => t.id === texture.id);

    if (e.shiftKey && lastClickedId) {
      // Shift+click: select range
      const lastIndex = textures.findIndex((t) => t.id === lastClickedId);
      const start = Math.min(lastIndex, textureIndex);
      const end = Math.max(lastIndex, textureIndex);
      const rangeIds = textures.slice(start, end + 1).map((t) => t.id);
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        rangeIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+click: toggle selection
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(texture.id)) {
          newSet.delete(texture.id);
        } else {
          newSet.add(texture.id);
        }
        return newSet;
      });
    } else {
      // Regular click in batch mode: toggle selection
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(texture.id)) {
          newSet.delete(texture.id);
        } else {
          newSet.add(texture.id);
        }
        return newSet;
      });
    }
    setLastClickedId(texture.id);
  }, [isBatchMode, lastClickedId, textures]);

  // Toggle batch mode
  const toggleBatchMode = useCallback(() => {
    setIsBatchMode((prev) => {
      if (prev) {
        // Exiting batch mode - clear selection
        setSelectedIds(new Set());
        setShowTagInput(false);
      }
      return !prev;
    });
  }, []);

  // Select all
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(textures.map((t) => t.id)));
  }, [textures]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Batch delete
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} textures?`)) return;

    setIsBatchProcessing(true);
    try {
      await batchDeleteTextures(Array.from(selectedIds));
      setTextures((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
      if (selectedTexture && selectedIds.has(selectedTexture.id)) {
        setSelectedTexture(null);
      }
    } catch (error) {
      console.error('Batch delete failed:', error);
      alert('Failed to delete some textures. Please try again.');
    } finally {
      setIsBatchProcessing(false);
    }
  }, [selectedIds, selectedTexture]);

  // Batch add tag
  const handleBatchAddTag = useCallback(async () => {
    if (selectedIds.size === 0 || !newTag.trim()) return;

    setIsBatchProcessing(true);
    try {
      await batchUpdateTextureTags(Array.from(selectedIds), [newTag.trim()], tagMode);
      // Refresh textures to show updated tags
      await loadTextures();
      setNewTag('');
      setShowTagInput(false);
    } catch (error) {
      console.error('Batch tag update failed:', error);
      alert('Failed to update tags. Please try again.');
    } finally {
      setIsBatchProcessing(false);
    }
  }, [selectedIds, newTag, tagMode, loadTextures]);

  return (
    <>
      <Dialog open={open && !aiGeneratorOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 bg-card border-border">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Organization Textures
            </DialogTitle>
            <DialogDescription className="sr-only">
              Browse and manage your organization's texture library
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search and filter bar */}
            <div className="p-4 border-b border-border">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search textures..."
                    className="pl-9 bg-muted border-border"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="bg-violet-500 hover:bg-violet-600 text-white"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!organization?.id || !!uploadProgress}
                  className="gap-2 border-border"
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAiGeneratorOpen(true)}
                  disabled={!organization?.id}
                  className="gap-2 border-border"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Gen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>

              {/* Type filter and Batch Mode toggle */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filter:</span>
                  <div className="flex border border-border rounded-md overflow-hidden bg-muted">
                    {['all', 'image', 'video'].map((type) => (
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

                {/* Batch Mode Toggle */}
                <Button
                  variant={isBatchMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleBatchMode}
                  className={cn(
                    'gap-2',
                    isBatchMode ? 'bg-violet-500 hover:bg-violet-600 text-white' : 'border-border'
                  )}
                >
                  {isBatchMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  Batch Mode
                </Button>
              </div>

              {/* Batch Operations Toolbar */}
              {isBatchMode && (
                <div className="mt-3 p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-violet-400">
                        {selectedIds.size} selected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAll}
                        className="h-7 text-xs text-violet-400 hover:text-violet-300"
                      >
                        Select All
                      </Button>
                      {selectedIds.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSelection}
                          className="h-7 text-xs text-violet-400 hover:text-violet-300"
                        >
                          Clear
                        </Button>
                      )}
                    </div>

                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-2">
                        {/* Tag assignment */}
                        {!showTagInput ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTagInput(true)}
                            disabled={isBatchProcessing}
                            className="h-7 gap-1 text-xs border-violet-500/50 text-violet-400 hover:bg-violet-500/20"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            Add Tags
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={tagMode}
                              onChange={(e) => setTagMode(e.target.value as typeof tagMode)}
                              className="h-7 text-xs bg-muted border border-border rounded px-2"
                            >
                              <option value="add">Add</option>
                              <option value="remove">Remove</option>
                              <option value="set">Replace</option>
                            </select>
                            <Input
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleBatchAddTag()}
                              placeholder="Enter tag..."
                              className="h-7 w-32 text-xs bg-muted border-border"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleBatchAddTag}
                              disabled={isBatchProcessing || !newTag.trim()}
                              className="h-7 w-7 p-0"
                            >
                              {isBatchProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowTagInput(false);
                                setNewTag('');
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}

                        {/* Batch delete */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBatchDelete}
                          disabled={isBatchProcessing}
                          className="h-7 gap-1 text-xs border-red-500/50 text-red-400 hover:bg-red-500/20"
                        >
                          {isBatchProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {uploadProgress && (
                <div className="mt-2 text-sm text-violet-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress}
                </div>
              )}
            </div>

            {/* Textures grid */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Layers className="w-12 h-12 mb-4 text-red-400" />
                  <p className="text-red-400">Failed to load textures</p>
                  <p className="text-sm text-red-400/70">{loadError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setLoadError(null);
                      setIsLoading(true);
                      fetchOrganizationTextures(organization!.id, {
                        limit: 100,
                        type: typeFilter === 'all' ? undefined : typeFilter,
                        search: searchQuery || undefined,
                      }).then(result => {
                        setTextures(result.data);
                        setIsLoading(false);
                      }).catch(err => {
                        setLoadError(err.message);
                        setIsLoading(false);
                      });
                    }}
                  >
                    Retry
                  </Button>
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
                  {textures.map((texture) => {
                    const isSelected = isBatchMode ? selectedIds.has(texture.id) : selectedTexture?.id === texture.id;
                    return (
                      <div
                        key={texture.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleTextureClick(texture, e)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTextureClick(texture, e as unknown as React.MouseEvent)}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden border-2 transition-all group cursor-pointer',
                        isSelected
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

                      {/* Batch mode checkbox indicator */}
                      {isBatchMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <div className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                            isSelected
                              ? 'bg-violet-500 border-violet-500'
                              : 'bg-black/50 border-white/50 group-hover:border-white'
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </div>
                      )}

                      {/* Type badge */}
                      <div className={cn(
                        "absolute bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1 text-white",
                        isBatchMode ? "top-2 left-9" : "top-2 left-2"
                      )}>
                        {texture.mediaType === 'video' ? (
                          <Video className="w-3.5 h-3.5" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5" />
                        )}
                        {texture.mediaType === 'video' && texture.duration && (
                          <span className="text-[10px]">{formatDuration(texture.duration)}</span>
                        )}
                      </div>

                      {/* Tags badge */}
                      {texture.tags && texture.tags.length > 0 && (
                        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                          {texture.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] px-1.5 py-0.5 bg-violet-500/80 backdrop-blur-sm rounded text-white truncate max-w-[60px]"
                            >
                              {tag}
                            </span>
                          ))}
                          {texture.tags.length > 2 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-violet-500/80 backdrop-blur-sm rounded text-white">
                              +{texture.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Delete button - only show when not in batch mode */}
                      {!isBatchMode && (
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
                      )}

                      {/* Selection indicator - only show in normal mode */}
                      {!isBatchMode && selectedTexture?.id === texture.id && (
                        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center pointer-events-none">
                          <div className="bg-violet-500 rounded-full p-1">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Name overlay on hover */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <p className="text-white text-xs truncate">{texture.name}</p>
                        <p className="text-white/60 text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(texture.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Footer with selection info */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
            <div className="text-sm text-muted-foreground">
              {selectedTexture ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-violet-500" />
                  Selected: <strong className="text-foreground">{selectedTexture.name}</strong>
                  <span className="text-xs">({selectedTexture.mediaType})</span>
                </span>
              ) : (
                `${textures.length} texture${textures.length !== 1 ? 's' : ''} available`
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Image Generator Dialog */}
      <AIImageGeneratorDialog
        open={aiGeneratorOpen}
        onOpenChange={(isOpen) => {
          setAiGeneratorOpen(isOpen);
        }}
        onSelect={handleAIGenerated}
        saveMode="texture"
        organizationId={organization?.id}
        userId={user?.id}
      />
    </>
  );
}
