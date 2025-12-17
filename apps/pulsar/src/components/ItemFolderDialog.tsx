import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Chip
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';

interface ItemFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (itemFolder: ItemFolderData) => void;
  initialData?: ItemFolderData;
  mode: 'create' | 'edit';
  parentContainer?: { id: string; name: string; type: 'bucket' | 'itemFolder' };
  existingNames?: string[];
}

interface ItemFolderData {
  name: string;
  active: boolean;
  parent_id?: string;
}

export const ItemFolderDialog: React.FC<ItemFolderDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  mode = 'create',
  parentContainer,
  existingNames = []
}) => {
  const [formData, setFormData] = useState<ItemFolderData>({
    name: '',
    active: true,
    parent_id: parentContainer?.id
  });
  const [nameError, setNameError] = useState<string>('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData(initialData);
      } else {
        // Generate a suggested name for new item folders
        const foldersInContainer = existingNames.filter(name => 
          name.match(/^Item Folder \d+$/)
        );
        const baseNumber = foldersInContainer.length + 1;
        setFormData({
          name: `Item Folder ${baseNumber}`,
          active: true,
          parent_id: parentContainer?.id
        });
      }
      setNameError('');
    }
  }, [open, initialData, parentContainer, existingNames]);

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
    
    // Validate name
    if (!value.trim()) {
      setNameError('Item folder name is required');
    } else if (mode === 'create' && existingNames.includes(value)) {
      setNameError('An item folder with this name already exists in this container');
    } else {
      setNameError('');
    }
  };

  const handleSave = () => {
    // Final validation
    if (!formData.name.trim()) {
      setNameError('Item folder name is required');
      return;
    }
    
    if (mode === 'create' && existingNames.includes(formData.name)) {
      setNameError('An item folder with this name already exists in this container');
      return;
    }

    if (mode === 'create' && !parentContainer) {
      // This shouldn't happen if dialog is properly controlled
      console.error('No parent container specified for new item folder');
      return;
    }

    onSave({
      ...formData,
      parent_id: formData.parent_id || parentContainer?.id
    });
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
      }}      maxWidth="sm"
      fullWidth
      aria-labelledby="item-folder-dialog-title"
    >
      <DialogTitle id="item-folder-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderIcon />
          {mode === 'create' ? 'Create New Item Folder' : 'Edit Item Folder'}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {parentContainer && mode === 'create' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Adding to {parentContainer.type === 'bucket' ? 'bucket' : 'folder'}:
              </Typography>
              <Chip
                icon={parentContainer.type === 'bucket' ? <ShoppingBasketIcon /> : <FolderIcon />}
                label={parentContainer.name}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          )}
          
          <TextField
            autoFocus
            label="Item Folder Name"
            fullWidth
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyPress={handleKeyPress}
            error={!!nameError}
            helperText={nameError}
            placeholder="Enter item folder name"
            required
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Active</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formData.active ? 'Folder is enabled' : 'Folder is disabled'}
                </Typography>
              </Box>
            }
          />
          
          <Box sx={{ 
            bgcolor: 'info.main', 
            color: 'info.contrastText',
            p: 2, 
            borderRadius: 1,
            opacity: 0.9
          }}>
            <Typography variant="body2">
              <strong>Tips:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Item folders help organize items within buckets</li>
                <li>Folders can be nested within other folders</li>
                <li>Items in folders inherit the bucket's properties</li>
              </ul>
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