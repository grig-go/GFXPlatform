import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Upload, Image as ImageIcon, Video, Music, Loader2, Check,
  FolderOpen, UploadCloud, HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchNovaMedia,
  searchNovaMedia,
  uploadToNovaMedia,
  type NovaMediaAsset,
} from '@/services/novaMediaService';

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
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');
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
    if (selectedAsset) {
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
          onValueChange={(v) => setActiveTab(v as 'browse' | 'upload')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 py-3 border-b border-border flex items-center justify-between">
            <TabsList className="bg-muted">
              <TabsTrigger value="browse" className="gap-2 data-[state=active]:bg-background">
                <FolderOpen className="w-4 h-4" />
                Browse Nova Media
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
            {selectedAsset ? (
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
              disabled={!selectedAsset}
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

