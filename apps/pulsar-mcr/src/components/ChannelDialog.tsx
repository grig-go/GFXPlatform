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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';

interface ChannelDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (channel: ChannelData) => void;
  initialData?: ChannelData;
  mode: 'create' | 'edit';
  existingNames?: string[];
}

interface ChannelData {
  name: string;
  active: boolean;
  type: 'Unreal' | 'Vizrt' | 'Pixera' | 'Web';
  channelId?: string; // Optional: For linking to the channels table
  mse_host?: string; // MSE hostname/IP for Vizrt channels
  mse_port?: number; // MSE WebSocket port (default 8595)
}

export const ChannelDialog: React.FC<ChannelDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  mode = 'create',
  existingNames = []
}) => {
  const [formData, setFormData] = useState<ChannelData>({
    name: '',
    active: true,
    type: 'Unreal',
    mse_host: '',
    mse_port: 8595
  });
  const [nameError, setNameError] = useState<string>('');
  const [mseHostError, setMseHostError] = useState<string>('');

  // Channel type options with display labels
  const channelTypes = [
    { value: 'Unreal', label: 'Unreal Engine' },
    { value: 'Vizrt', label: 'Vizrt' },
    { value: 'Pixera', label: 'Pixera' },
    { value: 'Web', label: 'Web' }
  ];

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          ...initialData,
          mse_host: initialData.mse_host || '',
          mse_port: initialData.mse_port || 8595
        });
      } else {
        // Generate a suggested name for new channels
        const baseNumber = existingNames.filter(name =>
          name.match(/^Channel \d+$/)
        ).length + 1;
        setFormData({
          name: `Channel ${baseNumber}`,
          active: true,
          type: 'Unreal',
          mse_host: '',
          mse_port: 8595
        });
      }
      setNameError('');
      setMseHostError('');
    }
  }, [open, initialData, existingNames]);

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value }));

    // Validate name
    if (!value.trim()) {
      setNameError('Channel name is required');
    } else if (mode === 'create' && existingNames.includes(value)) {
      setNameError('A channel with this name already exists');
    } else {
      setNameError('');
    }
  };

  const handleTypeChange = (event: SelectChangeEvent) => {
    const newType = event.target.value as 'Unreal' | 'Vizrt' | 'Pixera' | 'Web';
    setFormData(prev => ({
      ...prev,
      type: newType,
      // Clear MSE fields when switching away from Vizrt
      mse_host: newType === 'Vizrt' ? prev.mse_host : '',
      mse_port: newType === 'Vizrt' ? prev.mse_port : 8595
    }));
    // Clear MSE host error when switching away from Vizrt
    if (newType !== 'Vizrt') {
      setMseHostError('');
    }
  };

  const handleMseHostChange = (value: string) => {
    setFormData(prev => ({ ...prev, mse_host: value }));

    // Validate MSE host (basic hostname/IP validation)
    if (formData.type === 'Vizrt' && value.trim()) {
      // Basic validation: not empty and looks like a hostname or IP
      const hostnameRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!hostnameRegex.test(value) && !ipRegex.test(value)) {
        setMseHostError('Enter a valid hostname or IP address');
      } else {
        setMseHostError('');
      }
    } else {
      setMseHostError('');
    }
  };

  const handleMsePortChange = (value: string) => {
    const port = parseInt(value, 10);
    if (!isNaN(port) && port >= 1 && port <= 65535) {
      setFormData(prev => ({ ...prev, mse_port: port }));
    }
  };

  const handleSave = () => {
    // Final validation
    if (!formData.name.trim()) {
      setNameError('Channel name is required');
      return;
    }

    if (mode === 'create' && existingNames.includes(formData.name)) {
      setNameError('A channel with this name already exists');
      return;
    }

    // For Vizrt channels, MSE host is optional but if provided must be valid
    if (formData.type === 'Vizrt' && formData.mse_host && mseHostError) {
      return;
    }

    // Clean up data before saving - only include mse fields for Vizrt
    const dataToSave: ChannelData = {
      ...formData,
      mse_host: formData.type === 'Vizrt' ? formData.mse_host : undefined,
      mse_port: formData.type === 'Vizrt' ? formData.mse_port : undefined
    };

    onSave(dataToSave);
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
      aria-labelledby="channel-dialog-title"
    >
      <DialogTitle id="channel-dialog-title">
        {mode === 'create' ? 'Create New Channel' : 'Edit Channel'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            autoFocus
            label="Channel Name"
            fullWidth
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyPress={handleKeyPress}
            error={!!nameError}
            helperText={nameError}
            placeholder="Enter channel name"
            required
          />

          <FormControl fullWidth required>
            <InputLabel id="channel-type-label">Channel Type</InputLabel>
            <Select
              labelId="channel-type-label"
              id="channel-type-select"
              value={formData.type}
              label="Channel Type"
              onChange={handleTypeChange}
            >
              {channelTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* MSE Connection Settings - Only shown for Vizrt channels */}
          {formData.type === 'Vizrt' && (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'action.hover'
            }}>
              <Typography variant="subtitle2" color="text.secondary">
                MSE Connection Settings
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="MSE Host"
                  fullWidth
                  value={formData.mse_host || ''}
                  onChange={(e) => handleMseHostChange(e.target.value)}
                  error={!!mseHostError}
                  helperText={mseHostError || 'Hostname or IP address of the Media Sequencer'}
                  placeholder="e.g., 192.168.68.83 or mse-server.local"
                  sx={{ flex: 3 }}
                />
                <TextField
                  label="Port"
                  type="number"
                  value={formData.mse_port || 8595}
                  onChange={(e) => handleMsePortChange(e.target.value)}
                  inputProps={{ min: 1, max: 65535 }}
                  helperText="WebSocket port"
                  sx={{ flex: 1, minWidth: 100 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Configure the MSE connection to monitor currently playing elements in LiveView.
                Leave empty to disable MSE monitoring for this channel.
              </Typography>
            </Box>
          )}

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
                  {formData.active ? 'Channel is enabled' : 'Channel is disabled'}
                </Typography>
              </Box>
            }
          />

          <Box sx={{
            bgcolor: 'var(--note-bg)',
            color: 'var(--note-text)',
            border: '1px solid var(--note-border)',
            p: 2,
            borderRadius: 1
          }}>
            <Typography variant="body2" sx={{ color: 'inherit' }}>
              <strong>Note:</strong> Channels define the output type for your playlists.
              Select the appropriate engine/platform for this channel.
              You can add playlists to channels after creation.
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
          {mode === 'create' ? 'Create Channel' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};