import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Autocomplete
} from '@mui/material';
import { useTemplates } from '../contexts/TemplatesContext';

interface PlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (playlistData: {
    name: string;
    active: boolean;
    parent_id?: string;
    schedule?: string;
    carousel_type?: string;
    carousel_name?: string;
  }) => void;
  mode: 'create' | 'edit';
  initialData?: {
    name: string;
    active: boolean;
    schedule?: string;
    carousel_type?: string;
    carousel_name?: string;
  };
  parentChannel?: {
    id: string;
    name: string;
  };
  existingNames?: string[];
}

export const PlaylistDialog: React.FC<PlaylistDialogProps> = ({
  open,
  onClose,
  onSave,
  mode,
  initialData,
  parentChannel,
  existingNames = []
}) => {
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [carouselType, setCarouselType] = useState<string>('scrolling_carousel');
  const [carouselName, setCarouselName] = useState('');
  const [nameError, setNameError] = useState('');
  const { getUniqueCarouselNames } = useTemplates();
  const isInitializing = useRef(false);

  // Get unique carousel names from templates
  const carouselOptions = getUniqueCarouselNames();

  useEffect(() => {
    if (open) {
      isInitializing.current = true;
      if (initialData) {
        setName(initialData.name);
        setActive(initialData.active);
        setCarouselType(initialData.carousel_type || 'scrolling_carousel');
        setCarouselName(initialData.carousel_name || initialData.name);
      } else {
        // Reset for create mode
        setName('');
        setActive(true);
        setCarouselType('scrolling_carousel');
        setCarouselName('');
      }
      setNameError('');
      // Reset flag after state updates have been applied
      setTimeout(() => {
        isInitializing.current = false;
      }, 0);
    }
  }, [open, initialData]);


  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError('Name is required');
      return false;
    }
    
    // Check for duplicates (excluding current name in edit mode)
    const namesToCheck = mode === 'edit' && initialData
      ? existingNames.filter(n => n !== initialData.name)
      : existingNames;
    
    if (namesToCheck.includes(value.trim())) {
      setNameError('A playlist with this name already exists');
      return false;
    }
    
    setNameError('');
    return true;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    validateName(value);
  };

  const handleSave = () => {
    if (!validateName(name)) {
      return;
    }

    const playlistData: any = {
      name: name.trim(),
      active,
      carousel_type: carouselType,
      carousel_name: carouselName.trim() || name.trim() // Default to playlist name if empty
    };

    // Only include parent_id for create mode
    if (mode === 'create' && parentChannel) {
      playlistData.parent_id = parentChannel.id;
    }

    // Note: schedule is handled separately by the parent component
    
    onSave(playlistData);
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return; // Prevent closing
        }
        onClose();
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {mode === 'create' ? 'Create New Playlist' : 'Edit Playlist'}
        {parentChannel && mode === 'create' && (
          <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary', display: 'block' }}>
            in channel: {parentChannel.name}
          </Box>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Playlist Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            fullWidth
            required
            error={!!nameError}
            helperText={nameError}
            autoFocus
          />

          <FormControl fullWidth>
            <InputLabel>Carousel Type</InputLabel>
            <Select
              value={carouselType}
              onChange={(e) => setCarouselType(e.target.value)}
              label="Carousel Type"
            >
              <MenuItem value="scrolling_carousel">Scrolling Carousel</MenuItem>
              <MenuItem value="flipping_carousel">Flipping Carousel</MenuItem>
            </Select>
          </FormControl>

          <Autocomplete
            freeSolo
            options={carouselOptions}
            value={carouselName}
            onChange={(_event, newValue) => setCarouselName(newValue || '')}
            onInputChange={(_event, newInputValue) => setCarouselName(newInputValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Carousel Name"
                fullWidth
                helperText={carouselOptions.length > 0
                  ? "Select from imported carousels or enter a custom name"
                  : "Name used in the XML feed (defaults to playlist name if empty)"}
              />
            )}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
            }
            label="Active"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={!!nameError || !name.trim()}
        >
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};