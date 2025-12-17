import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  TextField,
  Divider,
  SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface AddChannelToPlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { channelId: string; channelName: string; channelType: string; active: boolean }) => void;
  onCreateNew: (data: { name: string; type: 'Unreal' | 'Vizrt' | 'Pixera' | 'Web'; active: boolean; description?: string }) => void;
  availableChannels: Array<{ id: string; name: string; type: string; active?: boolean }>;
  existingChannelIds: string[];
  isEditing?: boolean;
  editingChannelName?: string;
  editingChannelId?: string;
}

export const AddChannelToPlaylistDialog: React.FC<AddChannelToPlaylistDialogProps> = ({
  open,
  onClose,
  onSave,
  onCreateNew,
  availableChannels,
  existingChannelIds,
  isEditing = false,
  editingChannelName = '',
  editingChannelId
}) => {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');

  // For new channel creation
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [newChannelType, setNewChannelType] = useState<'Unreal' | 'Vizrt' | 'Pixera' | 'Web'>('Unreal');
  const [newChannelDescription, setNewChannelDescription] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');

  const channelTypes = [
    { value: 'Unreal', label: 'Unreal Engine' },
    { value: 'Vizrt', label: 'Vizrt' },
    { value: 'Pixera', label: 'Pixera' },
    { value: 'Web', label: 'Web' }
  ];

  // Filter out channels that already exist in the playlist, and inactive channels
  // But when editing, include the current channel so it can be shown as selected
  const filteredChannels = availableChannels.filter(
    channel => {
      // Exclude inactive channels (active is false or undefined defaults to true)
      const isActive = channel.active !== false;
      if (!isActive && !(isEditing && channel.id === editingChannelId)) {
        return false;
      }
      // Exclude channels already in use, except when editing the current one
      return !existingChannelIds.includes(channel.id) || (isEditing && channel.id === editingChannelId);
    }
  );

  // Debug logging to help troubleshoot
  useEffect(() => {
    if (open) {
      console.log('AddChannelToPlaylistDialog opened');
      console.log('Available channels:', availableChannels);
      console.log('Existing channel IDs:', existingChannelIds);
      console.log('Filtered channels:', filteredChannels);
    }
  }, [open, availableChannels, existingChannelIds, filteredChannels]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Reset form state
      setNewChannelName('');
      setNewChannelType('Unreal');
      setNewChannelDescription('');
      setNameError('');

      // If editing, pre-select the current channel
      if (isEditing && editingChannelId) {
        setSelectedChannelId(editingChannelId);
      } else {
        setSelectedChannelId('');
      }

      // Set mode based on available channels
      // If no channels are available after filtering, default to 'new'
      setMode(filteredChannels.length > 0 ? 'existing' : 'new');
    }
  }, [open, filteredChannels.length, isEditing, editingChannelId]);

  const handleChannelSelect = (event: SelectChangeEvent) => {
    setSelectedChannelId(event.target.value);
  };

  const handleTypeChange = (event: SelectChangeEvent) => {
    setNewChannelType(event.target.value as 'Unreal' | 'Vizrt' | 'Pixera' | 'Web');
  };

  const handleNameChange = (value: string) => {
    setNewChannelName(value);

    // Validate name
    if (!value.trim()) {
      setNameError('Channel name is required');
    } else if (availableChannels.some(ch => ch.name.toLowerCase() === value.toLowerCase())) {
      setNameError('A channel with this name already exists');
    } else {
      setNameError('');
    }
  };

  const handleSave = () => {
    if (mode === 'existing') {
      const selectedChannel = availableChannels.find(ch => ch.id === selectedChannelId);
      if (selectedChannel) {
        onSave({
          channelId: selectedChannel.id,
          channelName: selectedChannel.name,
          channelType: selectedChannel.type,
          active: true
        });
        onClose();
      }
    } else {
      // Validate new channel
      if (!newChannelName.trim()) {
        setNameError('Channel name is required');
        return;
      }

      if (availableChannels.some(ch => ch.name.toLowerCase() === newChannelName.toLowerCase())) {
        setNameError('A channel with this name already exists');
        return;
      }

      onCreateNew({
        name: newChannelName,
        type: newChannelType,
        active: true,
        description: newChannelDescription
      });
      onClose();
    }
  };

  const getChannelTypeLabel = (type: string) => {
    const typeItem = channelTypes.find(t => t.value === type);
    return typeItem ? typeItem.label : type;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="add-channel-dialog-title"
    >
      <DialogTitle id="add-channel-dialog-title">
        {isEditing ? `Switch Channel: ${editingChannelName}` : 'Add Channel to Schedule'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {filteredChannels.length > 0 && (
            <>
              <FormControl fullWidth>
                <InputLabel id="mode-label">Choose Option</InputLabel>
                <Select
                  labelId="mode-label"
                  value={mode}
                  label="Choose Option"
                  onChange={(e) => setMode(e.target.value as 'existing' | 'new')}
                >
                  <MenuItem value="existing">Select Existing Channel</MenuItem>
                  <MenuItem value="new">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AddIcon sx={{ mr: 1, fontSize: 18 }} />
                      Create New Channel
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <Divider />
            </>
          )}

          {mode === 'existing' ? (
            <>
              <FormControl fullWidth required>
                <InputLabel id="channel-label">Select Channel</InputLabel>
                <Select
                  labelId="channel-label"
                  value={selectedChannelId}
                  label="Select Channel"
                  onChange={handleChannelSelect}
                >
                  {filteredChannels.length === 0 ? (
                    <MenuItem disabled>
                      <Typography color="text.secondary">No available channels</Typography>
                    </MenuItem>
                  ) : (
                    [...filteredChannels].sort((a, b) => a.name.localeCompare(b.name)).map((channel) => (
                      <MenuItem key={channel.id} value={channel.id}>
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{channel.name}</span>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                            {getChannelTypeLabel(channel.type)}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              {filteredChannels.length === 0 && (
                <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                  All available channels have already been added. Please create a new channel.
                </Typography>
              )}
            </>
          ) : (
            <>
              <TextField
                autoFocus
                label="Channel Name"
                fullWidth
                value={newChannelName}
                onChange={(e) => handleNameChange(e.target.value)}
                error={!!nameError}
                helperText={nameError}
                placeholder="Enter channel name"
                required
              />

              <FormControl fullWidth required>
                <InputLabel id="type-label">Channel Type</InputLabel>
                <Select
                  labelId="type-label"
                  value={newChannelType}
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

              <TextField
                label="Description"
                fullWidth
                value={newChannelDescription}
                onChange={(e) => setNewChannelDescription(e.target.value)}
                placeholder="Enter channel description"
                multiline
                rows={3}
              />
            </>
          )}

          <Box sx={{
            bgcolor: 'info.main',
            color: 'info.contrastText',
            p: 2,
            borderRadius: 1,
            opacity: 0.9
          }}>
            <Typography variant="body2">
              <strong>Note:</strong> {isEditing
                ? (mode === 'existing'
                  ? 'Select a different channel to switch to. To edit channel properties (name, type), use the Channels page.'
                  : 'Create a new channel and switch to it. The new channel will be added to the Channels table.')
                : (mode === 'existing'
                  ? 'Select a channel from the Channels table to add it to your schedules hierarchy.'
                  : 'Create a new channel that will be added to both the Channels table and your schedules hierarchy.')
              }
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
          disabled={
            mode === 'existing'
              ? !selectedChannelId
              : (!newChannelName.trim() || !!nameError)
          }
        >
          {isEditing
            ? (mode === 'existing' ? 'Switch Channel' : 'Create & Switch')
            : (mode === 'existing' ? 'Add Channel' : 'Create & Add Channel')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};