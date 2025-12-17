import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  TextField,
  Box,
  Typography,
  Divider,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import { supabase } from '../lib/supabase';

interface BucketSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selectedBuckets: any[], parentId: string | null) => Promise<void>;
  parentId: string | null;
  existingBuckets: string[];
}

interface Bucket {
  id: string;
  name: string;
  type: string;
  active: boolean;
  schedule?: string;
  parent_id?: string;
}

// Component to select buckets from content grid to add to a channel
const BucketSelector: React.FC<BucketSelectorProps> = ({ 
  open, 
  onClose, 
  onSelect, 
  parentId, 
  existingBuckets = [] 
}) => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [allBuckets, setAllBuckets] = useState<Bucket[]>([]);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showAllBuckets, setShowAllBuckets] = useState<boolean>(true);

  // Reset selected buckets when dialog closes (retain filter and showAllBuckets)
  useEffect(() => {
    if (!open) {
      setSelectedBuckets([]);
    }
  }, [open]);

  // Load all buckets from the content grid
  useEffect(() => {
    if (!open) return;

    const fetchBuckets = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Query content table for items with type 'bucket'
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .eq('type', 'bucket')
          .order('name');
        
        if (error) throw error;
        
        // Store all buckets
        setAllBuckets(data || []);
        
        // Filter out buckets that are already in this playlist if not showing all
        const availableBuckets = showAllBuckets 
          ? data 
          : data.filter((bucket: Bucket) => !existingBuckets.includes(bucket.id));
        
        setBuckets(availableBuckets);
      } catch (err) {
        console.error('Error fetching buckets:', err);
        setError('Failed to load buckets. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBuckets();
  }, [open, existingBuckets, showAllBuckets]);

  // Handle bucket selection toggle
  const handleToggleBucket = (bucketId: string) => {
    setSelectedBuckets(prev => {
      if (prev.includes(bucketId)) {
        return prev.filter(id => id !== bucketId);
      } else {
        return [...prev, bucketId];
      }
    });
  };

  // Toggle showing all buckets vs. only new ones
  const handleToggleShowAll = () => {
    setShowAllBuckets(prev => !prev);
  };

  // Apply the new filter when showAllBuckets changes
  useEffect(() => {
    if (allBuckets.length === 0) return;
    
    const filteredBuckets = showAllBuckets 
      ? allBuckets 
      : allBuckets.filter(bucket => !existingBuckets.includes(bucket.id));
    
    setBuckets(filteredBuckets);
  }, [showAllBuckets, allBuckets, existingBuckets]);

  // Filter buckets based on search term
  const filteredBuckets = buckets.filter(bucket => 
    bucket.name.toLowerCase().includes(filter.toLowerCase())
  );

  // Handle confirmation and pass selected buckets back
  const handleConfirm = async () => {
    // If no buckets selected, just close
    if (selectedBuckets.length === 0) {
      onClose();
      return;
    }

    try {
      // Get details of selected buckets
      const selectedBucketDetails = allBuckets.filter(bucket => 
        selectedBuckets.includes(bucket.id)
      );

      // Call the parent's onSelect handler with the selected buckets
      await onSelect(selectedBucketDetails, parentId);
      onClose();
    } catch (error) {
      console.error('Error adding buckets:', error);
      setError('Failed to add selected buckets. Please try again.');
    }
  };

  // Reset selections when dialog is closed (retain filter and showAllBuckets)
  const handleClose = () => {
    setSelectedBuckets([]);
    onClose();
  };

  // Helper to determine if a bucket is already in the playlist
  const isExistingBucket = (bucketId: string) => {
    return existingBuckets.includes(bucketId);
  };

  return (
    <Dialog 
      open={open} 
      onClose={(_event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return; // Prevent closing
        }
        handleClose();
      }}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '70vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle>
        Add Buckets to Playlist
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Filter Buckets"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            variant="outlined"
          />
          
          <FormControlLabel
            control={
              <Switch 
                checked={showAllBuckets}
                onChange={handleToggleShowAll}
                color="primary"
              />
            }
            label="Show all buckets (including those already in playlist)"
          />
        </Box>
        
        <Divider />
        
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 3, color: 'error.main' }}>
              <Typography>{error}</Typography>
            </Box>
          ) : filteredBuckets.length === 0 ? (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', color: 'text.secondary' }}>
              <Typography>
                {filter ? 'No matching buckets found' : 'No available buckets to add'}
              </Typography>
            </Box>
          ) : (
            <List>
              {filteredBuckets.map((bucket) => (
                <ListItem 
                  key={bucket.id}
                  button
                  onClick={() => handleToggleBucket(bucket.id)}
                  sx={isExistingBucket(bucket.id) ? { backgroundColor: 'rgba(0, 0, 0, 0.04)' } : {}}
                >
                  <ListItemIcon>
                    <Checkbox 
                      edge="start"
                      checked={selectedBuckets.includes(bucket.id)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemIcon>
                    <ShoppingBasketIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                        {bucket.name}
                        {isExistingBucket(bucket.id) && (
                          <Typography 
                            component="span" 
                            variant="caption" 
                            sx={{ ml: 1, backgroundColor: 'primary.light', color: 'white', px: 1, borderRadius: 1 }}
                          >
                            Already in playlist
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={bucket.schedule || 'Always'}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Typography variant="body2" sx={{ mr: 2 }}>
          {selectedBuckets.length} bucket{selectedBuckets.length !== 1 ? 's' : ''} selected
        </Typography>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="primary"
          disabled={loading || selectedBuckets.length === 0}
        >
          Add Selected
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BucketSelector;