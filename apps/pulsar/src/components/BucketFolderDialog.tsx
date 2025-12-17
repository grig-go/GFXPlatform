import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography
} from '@mui/material';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';

interface BucketFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (bucketFolder: BucketFolderData) => void;
  initialData?: BucketFolderData;
  mode: 'create' | 'edit';
  existingNames?: string[];
}

interface BucketFolderData {
  name: string;
  active: boolean;
}

export const BucketFolderDialog: React.FC<BucketFolderDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  mode = 'create',
  existingNames = []
}) => {
  const [formData, setFormData] = useState<BucketFolderData>({
    name: '',
    active: true
  });
  const [nameError, setNameError] = useState<string>('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData(initialData);
      } else {
        // Generate a suggested name for new bucket folders
        const baseNumber = existingNames.filter(name => 
          name.match(/^Bucket Folder \d+$/)
        ).length + 1;
        setFormData({
          name: `Bucket Folder ${baseNumber}`,
          active: true
        });
      }
      setNameError('');
    }
  }, [open, initialData, existingNames]);

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
    
    // Validate name
    if (!value.trim()) {
      setNameError('Bucket folder name is required');
    } else if (mode === 'create' && existingNames.includes(value)) {
      setNameError('A bucket folder with this name already exists');
    } else {
      setNameError('');
    }
  };

  const handleSave = () => {
    // Final validation
    if (!formData.name.trim()) {
      setNameError('Bucket folder name is required');
      return;
    }
    
    if (mode === 'create' && existingNames.includes(formData.name)) {
      setNameError('A bucket folder with this name already exists');
      return;
    }

    onSave(formData);
    onClose();
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !nameError && formData.name.trim()) {
      handleSave();
    }
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
      aria-labelledby="bucket-folder-dialog-title"
    >
      <DialogTitle id="bucket-folder-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CreateNewFolderIcon />
          {mode === 'create' ? 'Create New Bucket Folder' : 'Edit Bucket Folder'}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            autoFocus
            label="Bucket Folder Name"
            fullWidth
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyPress={handleKeyPress}
            error={!!nameError}
            helperText={nameError}
            placeholder="Enter bucket folder name"
            required
          />
          
          <Box sx={{ 
            bgcolor: 'info.main', 
            color: 'info.contrastText',
            p: 2, 
            borderRadius: 1,
            opacity: 0.9
          }}>
            <Typography variant="body2">
              <strong>Note:</strong> Bucket folders are top-level containers for organizing buckets. 
              You can add buckets to folders after creation.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!!nameError || !formData.name.trim()}
        >
          {mode === 'create' ? 'Create Folder' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};