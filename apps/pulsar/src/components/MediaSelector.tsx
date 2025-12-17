import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  CircularProgress,
  InputAdornment,
  Chip,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import { MediaAsset, MediaType } from '../types/sponsor';

// Image component that retries loading on error (for newly uploaded images)
export const RetryImage: React.FC<{
  src: string;
  alt: string;
  style?: React.CSSProperties;
  maxRetries?: number;
  retryDelay?: number;
}> = ({ src, alt, style, maxRetries = 5, retryDelay = 500 }) => {
  const [retryCount, setRetryCount] = useState(0);
  const [imgSrc, setImgSrc] = useState(src);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setImgSrc(src);
    setRetryCount(0);
    setLoading(true);
  }, [src]);

  const handleError = () => {
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        // Add cache-busting query param to force reload
        setImgSrc(`${src}${src.includes('?') ? '&' : '?'}retry=${retryCount + 1}`);
      }, retryDelay);
    } else {
      setLoading(false);
    }
  };

  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <>
      {loading && retryCount > 0 && (
        <Box
          sx={{
            width: style?.width || 60,
            height: style?.height || 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.200',
            borderRadius: style?.borderRadius || 1
          }}
        >
          <CircularProgress size={20} />
        </Box>
      )}
      <img
        src={imgSrc}
        alt={alt}
        style={{
          ...style,
          display: loading && retryCount > 0 ? 'none' : 'block'
        }}
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  );
};

// Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MEDIA_LIBRARY_URL = `${SUPABASE_URL}/functions/v1/media-library`;

interface MediaSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaAsset) => void;
  selectedMediaId?: string;
  allowedTypes?: MediaType[];
  title?: string;
  zIndex?: number;
}

export const MediaSelector: React.FC<MediaSelectorProps> = ({
  open,
  onClose,
  onSelect,
  selectedMediaId,
  allowedTypes = ['image', 'video'],
  title = 'Select Media',
  zIndex
}) => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [tabValue, setTabValue] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (search) params.append('search', search);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const url = `${MEDIA_LIBRARY_URL}?${params}`;
      console.log('Fetching media from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.details?.includes('relation "media_assets" does not exist')) {
          setAssets([]);
          setError('Media library is not set up yet. Please set up the media library first.');
          return;
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // Helper to construct storage URL from path
      const getStorageUrl = (storagePath: string | null) => {
        if (!storagePath) return null;
        return `${SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`;
      };

      // Helper to check if URL contains internal Docker addresses
      const isInternalUrl = (url: string | null) => {
        if (!url) return false;
        return url.includes('kong:8000') ||
               url.includes('supabase_kong') ||
               url.includes('supabase_edge_runtime');
      };

      // Transform to our MediaAsset type
      const transformed: MediaAsset[] = (result.data || []).map((asset: any) => {
        // Use storage_path to construct URL if file_url contains internal Docker addresses
        const fileUrl = (asset.file_url && !isInternalUrl(asset.file_url))
          ? asset.file_url
          : getStorageUrl(asset.storage_path);

        const thumbnailUrl = (asset.thumbnail_url && !isInternalUrl(asset.thumbnail_url))
          ? asset.thumbnail_url
          : fileUrl;

        return {
          id: asset.id,
          name: asset.name || asset.file_name,
          description: asset.description,
          file_url: fileUrl,
          thumbnail_url: thumbnailUrl,
          media_type: asset.media_type as MediaType,
          file_size: asset.size,
          tags: asset.tags || [],
          created_at: asset.created_at,
          created_by: asset.created_by
        };
      });

      // Filter by allowed types
      const filtered = transformed.filter(
        asset => allowedTypes.includes(asset.media_type)
      );

      setAssets(filtered);
    } catch (err) {
      console.error('Error fetching media:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch media');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, allowedTypes]);

  // Upload file to media library
  const uploadMedia = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Determine media type from file
      const fileType = file.type;
      const mediaType: MediaType = fileType.startsWith('image')
        ? 'image'
        : fileType.startsWith('video')
        ? 'video'
        : fileType.startsWith('audio')
        ? 'audio'
        : 'image';

      // Check if this type is allowed
      if (!allowedTypes.includes(mediaType)) {
        throw new Error(`File type "${mediaType}" is not allowed. Please upload ${allowedTypes.join(' or ')}.`);
      }

      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.[^/.]+$/, '')); // Remove extension for name
      formData.append('description', '');
      formData.append('tags', JSON.stringify([]));
      formData.append('media_type', mediaType);
      formData.append('created_by', 'pulsar-sponsor-scheduling');

      setUploadProgress(30);

      const response = await fetch(MEDIA_LIBRARY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: formData
      });

      setUploadProgress(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      setUploadProgress(100);

      // Helper to construct storage URL from path
      const getStorageUrl = (storagePath: string | null) => {
        if (!storagePath) return null;
        return `${SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`;
      };

      // Helper to check if URL contains internal Docker addresses
      const isInternalUrl = (url: string | null) => {
        if (!url) return false;
        return url.includes('kong:8000') ||
               url.includes('supabase_kong') ||
               url.includes('supabase_edge_runtime');
      };

      // Use storage_path to construct URL if file_url contains internal Docker addresses
      const fileUrl = (result.data.file_url && !isInternalUrl(result.data.file_url))
        ? result.data.file_url
        : getStorageUrl(result.data.storage_path);

      const thumbnailUrl = (result.data.thumbnail_url && !isInternalUrl(result.data.thumbnail_url))
        ? result.data.thumbnail_url
        : fileUrl;

      // Transform the uploaded asset to our MediaAsset type
      const uploadedAsset: MediaAsset = {
        id: result.data.id,
        name: result.data.name || result.data.file_name,
        description: result.data.description,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        media_type: result.data.media_type as MediaType,
        file_size: result.data.metadata?.size,
        tags: result.data.tags || [],
        created_at: result.data.created_at,
        created_by: result.data.created_by
      };

      setUploadSuccess(`Successfully uploaded "${uploadedAsset.name}"`);

      // Refresh the asset list and select the new asset
      await fetchAssets();
      setSelectedAsset(uploadedAsset);

      // Clear success message after a few seconds
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (err) {
      console.error('Error uploading media:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to upload media');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [allowedTypes, fetchAssets]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMedia(file);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadMedia]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (open) {
      fetchAssets();
      // Find and select the currently selected asset
      if (selectedMediaId) {
        const found = assets.find(a => a.id === selectedMediaId);
        setSelectedAsset(found || null);
      }
      // Clear any previous upload messages
      setUploadError(null);
      setUploadSuccess(null);
    }
  }, [open, fetchAssets, selectedMediaId]);

  const handleSelect = () => {
    if (selectedAsset) {
      onSelect(selectedAsset);
      onClose();
    }
  };

  const handleAssetClick = (asset: MediaAsset) => {
    setSelectedAsset(asset);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 0) {
      setTypeFilter('all');
    } else if (newValue === 1) {
      setTypeFilter('image');
    } else if (newValue === 2) {
      setTypeFilter('video');
    }
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case 'image':
        return <ImageIcon />;
      case 'video':
        return <VideoLibraryIcon />;
      case 'audio':
        return <AudiotrackIcon />;
      default:
        return <ImageIcon />;
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
      sx={zIndex ? { zIndex } : undefined}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{title}</Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Upload New Media">
              <IconButton
                onClick={handleUploadClick}
                disabled={loading || uploading}
                color="primary"
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchAssets} disabled={loading || uploading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.map(t => t === 'image' ? 'image/*' : t === 'video' ? 'video/*' : 'audio/*').join(',')}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
        {/* Upload progress */}
        {uploading && (
          <Box sx={{ px: 2, pt: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Uploading media... Please wait.
            </Alert>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}

        {/* Upload success message */}
        {uploadSuccess && (
          <Box sx={{ px: 2, pt: 2 }}>
            <Alert severity="success" onClose={() => setUploadSuccess(null)}>
              {uploadSuccess}
            </Alert>
          </Box>
        )}

        {/* Upload error message */}
        {uploadError && (
          <Box sx={{ px: 2, pt: 2 }}>
            <Alert severity="error" onClose={() => setUploadError(null)}>
              {uploadError}
            </Alert>
          </Box>
        )}

        {/* Search and filters */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            placeholder="Search media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchAssets()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            size="small"
            disabled={uploading}
          />
        </Box>

        {/* Type tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="All" />
            {allowedTypes.includes('image') && <Tab icon={<ImageIcon />} label="Images" />}
            {allowedTypes.includes('video') && <Tab icon={<VideoLibraryIcon />} label="Videos" />}
          </Tabs>
        </Box>

        {/* Content area */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : assets.length === 0 ? (
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              height="100%"
              color="text.secondary"
            >
              <CloudUploadIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6">No media found</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Upload media to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleUploadClick}
                disabled={uploading}
              >
                Upload Media
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {assets.map((asset) => (
                <Grid item xs={6} sm={4} md={3} key={asset.id}>
                  <Card
                    sx={{
                      position: 'relative',
                      border: selectedAsset?.id === asset.id ? 2 : 0,
                      borderColor: 'primary.main',
                      transition: 'all 0.2s'
                    }}
                  >
                    <CardActionArea onClick={() => handleAssetClick(asset)}>
                      {asset.media_type === 'video' ? (
                        <Box
                          sx={{
                            height: 140,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'grey.900'
                          }}
                        >
                          {asset.thumbnail_url ? (
                            <CardMedia
                              component="img"
                              height="140"
                              image={asset.thumbnail_url}
                              alt={asset.name}
                              sx={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <VideoLibraryIcon sx={{ fontSize: 48, color: 'grey.500' }} />
                          )}
                        </Box>
                      ) : (
                        <CardMedia
                          component="img"
                          height="140"
                          image={asset.thumbnail_url || asset.file_url}
                          alt={asset.name}
                          sx={{ objectFit: 'cover', bgcolor: 'grey.100' }}
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          title={asset.name}
                          sx={{ fontWeight: 500 }}
                        >
                          {asset.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                          <Chip
                            icon={getMediaIcon(asset.media_type)}
                            label={asset.media_type}
                            size="small"
                            sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(asset.file_size)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </CardActionArea>

                    {/* Selection indicator */}
                    {selectedAsset?.id === asset.id && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'primary.main',
                          borderRadius: '50%',
                          p: 0.5,
                          display: 'flex'
                        }}
                      >
                        <CheckCircleIcon sx={{ color: 'white', fontSize: 20 }} />
                      </Box>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Selected preview */}
        {selectedAsset && (
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            {selectedAsset.media_type === 'image' ? (
              <RetryImage
                src={selectedAsset.thumbnail_url || selectedAsset.file_url}
                alt={selectedAsset.name}
                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
              />
            ) : (
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.300',
                  borderRadius: 1
                }}
              >
                {getMediaIcon(selectedAsset.media_type)}
              </Box>
            )}
            <Box flex={1}>
              <Typography variant="subtitle2">{selectedAsset.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedAsset.media_type} • {formatFileSize(selectedAsset.file_size)}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSelect}
          variant="contained"
          disabled={!selectedAsset}
        >
          Select
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaSelector;
