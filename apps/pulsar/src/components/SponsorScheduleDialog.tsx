import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Divider,
  IconButton,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Card,
  CardMedia,
  Switch,
  OutlinedInput,
  ListItemText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import ImageIcon from '@mui/icons-material/Image';
import { Channel } from '../hooks/useChannels';
import {
  SponsorSchedule,
  SponsorScheduleFormData,
  MediaAsset,
  ScheduleConflict,
  isOvernightRange,
  SPONSOR_CATEGORIES
} from '../types/sponsor';
import { MediaSelector } from './MediaSelector';

interface SponsorScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: SponsorScheduleFormData) => Promise<void>;
  initialData?: SponsorSchedule | null;
  channels: Channel[];
  mode: 'create' | 'edit';
  conflicts?: ScheduleConflict[];
  onValidate?: (data: SponsorScheduleFormData) => ScheduleConflict[];
}

export const SponsorScheduleDialog: React.FC<SponsorScheduleDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  channels,
  mode,
  conflicts: externalConflicts,
  onValidate
}) => {
  const [formData, setFormData] = useState<SponsorScheduleFormData>({
    channel_ids: [],
    media_id: '',
    name: '',
    start_date: '',
    end_date: '',
    time_ranges: [{ start: '', end: '' }],
    days_of_week: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    },
    active: true,
    priority: 0,
    category: ''
  });

  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);

  // Initialize form when dialog opens or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          channel_ids: initialData.channel_ids || [],
          media_id: initialData.media_id,
          name: initialData.name,
          start_date: initialData.start_date || '',
          end_date: initialData.end_date || '',
          time_ranges: initialData.time_ranges.length > 0
            ? initialData.time_ranges
            : [{ start: '', end: '' }],
          days_of_week: initialData.days_of_week,
          active: initialData.active,
          priority: initialData.priority,
          category: initialData.category || ''
        });
        if (initialData.media) {
          setSelectedMedia(initialData.media);
        }
      } else {
        // Reset to defaults for create mode
        setFormData({
          channel_ids: [],
          media_id: '',
          name: '',
          start_date: '',
          end_date: '',
          time_ranges: [{ start: '', end: '' }],
          days_of_week: {
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false,
            sunday: false
          },
          active: true,
          priority: 0,
          category: ''
        });
        setSelectedMedia(null);
      }
      setConflicts(externalConflicts || []);
      setError(null);
    }
  }, [open, initialData, externalConflicts]);

  // Validate when form data changes
  useEffect(() => {
    if (onValidate && formData.channel_ids.length > 0) {
      const newConflicts = onValidate(formData);
      setConflicts(newConflicts);
    }
  }, [formData, onValidate]);

  const handleFieldChange = (field: keyof SponsorScheduleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTimeRangeChange = (index: number, field: 'start' | 'end', value: string) => {
    setFormData(prev => ({
      ...prev,
      time_ranges: prev.time_ranges.map((range, i) =>
        i === index ? { ...range, [field]: value } : range
      )
    }));
  };

  const handleAddTimeRange = () => {
    setFormData(prev => ({
      ...prev,
      time_ranges: [...prev.time_ranges, { start: '', end: '' }]
    }));
  };

  const handleRemoveTimeRange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      time_ranges: prev.time_ranges.filter((_, i) => i !== index)
    }));
  };

  const handleDayChange = (day: keyof typeof formData.days_of_week) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: {
        ...prev.days_of_week,
        [day]: !prev.days_of_week[day]
      }
    }));
  };

  const handleMediaSelect = (media: MediaAsset) => {
    setSelectedMedia(media);
    setFormData(prev => ({
      ...prev,
      media_id: media.id,
      name: prev.name || media.name // Auto-fill name if empty
    }));
  };

  const handleReset = () => {
    setFormData({
      channel_ids: formData.channel_ids, // Keep channels
      media_id: formData.media_id, // Keep media
      name: formData.name, // Keep name
      start_date: '',
      end_date: '',
      time_ranges: [{ start: '', end: '' }],
      days_of_week: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      },
      active: true,
      priority: 0,
      category: formData.category // Keep category
    });
  };

  const handleSave = async () => {
    // Validation
    if (formData.channel_ids.length === 0) {
      setError('Please select at least one channel');
      return;
    }
    if (!formData.media_id) {
      setError('Please select media');
      return;
    }
    if (!formData.name.trim()) {
      setError('Please enter a name');
      return;
    }
    // Validate: end date must be after start date (if both are set)
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) {
        setError('End date must be after start date');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {mode === 'create' ? 'Create Sponsor Schedule' : 'Edit Sponsor Schedule'}
            </Typography>
            <IconButton onClick={handleReset} title="Reset schedule settings" color="secondary">
              <RestartAltIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {conflicts.length > 0 && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Schedule Conflicts Detected
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {conflicts.map((conflict, idx) => (
                  <li key={idx}>
                    <Typography variant="body2">
                      Overlaps with "{conflict.conflictingScheduleName}" ({conflict.overlapStart} - {conflict.overlapEnd})
                    </Typography>
                  </li>
                ))}
              </Box>
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Channel Selection - Multi-select */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Channels</InputLabel>
                <Select
                  multiple
                  value={formData.channel_ids}
                  onChange={(e) => handleFieldChange('channel_ids', e.target.value as string[])}
                  input={<OutlinedInput label="Channels" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((channelId) => {
                        const channel = channels.find(c => c.id === channelId);
                        return (
                          <Chip
                            key={channelId}
                            label={channel?.name || channelId}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {[...channels].sort((a, b) => a.name.localeCompare(b.name)).map(channel => (
                    <MenuItem key={channel.id} value={channel.id}>
                      <Checkbox checked={formData.channel_ids.includes(channel.id)} />
                      <ListItemText primary={channel.name} />
                      <Chip
                        label={channel.type}
                        size="small"
                        sx={{ ml: 1, height: 20 }}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Name */}
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Schedule Name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g., Morning Sponsor, Holiday Special"
              />
            </Grid>

            {/* Category */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  label="Category"
                >
                  {SPONSOR_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Media Selection */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Sponsor Media
              </Typography>
              <Card
                variant="outlined"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
                onClick={() => setMediaSelectorOpen(true)}
              >
                {selectedMedia ? (
                  <>
                    {selectedMedia.media_type === 'image' ? (
                      <CardMedia
                        component="img"
                        sx={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 1 }}
                        image={selectedMedia.thumbnail_url || selectedMedia.file_url}
                        alt={selectedMedia.name}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 80,
                          height: 60,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'grey.200',
                          borderRadius: 1
                        }}
                      >
                        <ImageIcon />
                      </Box>
                    )}
                    <Box sx={{ ml: 2, flex: 1 }}>
                      <Typography variant="subtitle2">{selectedMedia.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedMedia.media_type} • Click to change
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      color: 'text.secondary'
                    }}
                  >
                    <ImageIcon sx={{ mr: 2, fontSize: 40, opacity: 0.5 }} />
                    <Box>
                      <Typography variant="subtitle2">Select Media</Typography>
                      <Typography variant="caption">
                        Click to browse the media library
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Card>
            </Grid>

            {/* Priority & Default */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Priority"
                value={formData.priority}
                onChange={(e) => handleFieldChange('priority', parseInt(e.target.value) || 0)}
                helperText="Higher priority schedules take precedence"
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.active}
                      onChange={(e) => handleFieldChange('active', e.target.checked)}
                    />
                  }
                  label="Active"
                />
              </Box>
            </Grid>

            {/* Schedule Settings */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Schedule Rules</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Leave all fields empty for an always-on fallback sponsor (use priority 0).
              </Typography>
            </Grid>

            {/* Date Range */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Date Range</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => handleFieldChange('start_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <IconButton
                      onClick={() => handleFieldChange('start_date', '')}
                      disabled={!formData.start_date}
                      size="small"
                    >
                      <ClearIcon />
                    </IconButton>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => handleFieldChange('end_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <IconButton
                      onClick={() => handleFieldChange('end_date', '')}
                      disabled={!formData.end_date}
                      size="small"
                    >
                      <ClearIcon />
                    </IconButton>
                  </Box>
                </Grid>

                {/* Time Ranges */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="subtitle2">Time Ranges</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Leave empty for "all day"
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  {formData.time_ranges.length === 0 ? (
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" align="center">
                        No time ranges defined - active all day
                      </Typography>
                    </Box>
                  ) : (
                    formData.time_ranges.map((range, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <TextField
                            label="Start Time"
                            type="time"
                            value={range.start}
                            onChange={(e) => handleTimeRangeChange(index, 'start', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 140 }}
                          />
                          <TextField
                            label="End Time"
                            type="time"
                            value={range.end}
                            onChange={(e) => handleTimeRangeChange(index, 'end', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 140 }}
                          />
                          <IconButton
                            onClick={() => handleRemoveTimeRange(index)}
                            color="error"
                            disabled={formData.time_ranges.length === 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>

                        {isOvernightRange(range.start, range.end) && (
                          <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              <strong>Overnight schedule:</strong> This time range spans midnight
                              ({range.start} → {range.end} next day)
                            </Typography>
                          </Alert>
                        )}
                      </Box>
                    ))
                  )}

                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddTimeRange}
                    variant="outlined"
                    size="small"
                  >
                    Add Time Range
                  </Button>
                </Grid>

                {/* Days of Week */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="subtitle2">Days of Week</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Leave empty for "all days"
                    </Typography>
                  </Box>

                  <FormGroup row>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.days_of_week.monday}
                          onChange={() => handleDayChange('monday')}
                        />
                      }
                      label="Mon"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.days_of_week.tuesday}
                          onChange={() => handleDayChange('tuesday')}
                        />
                      }
                      label="Tue"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.days_of_week.wednesday}
                          onChange={() => handleDayChange('wednesday')}
                        />
                      }
                      label="Wed"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.days_of_week.thursday}
                          onChange={() => handleDayChange('thursday')}
                        />
                      }
                      label="Thu"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.days_of_week.friday}
                          onChange={() => handleDayChange('friday')}
                        />
                      }
                      label="Fri"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.days_of_week.saturday}
                          onChange={() => handleDayChange('saturday')}
                        />
                      }
                      label="Sat"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.days_of_week.sunday}
                          onChange={() => handleDayChange('sunday')}
                        />
                      }
                      label="Sun"
                    />
                  </FormGroup>
                </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || formData.channel_ids.length === 0 || !formData.media_id || !formData.name}
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Media Selector Dialog */}
      <MediaSelector
        open={mediaSelectorOpen}
        onClose={() => setMediaSelectorOpen(false)}
        onSelect={handleMediaSelect}
        selectedMediaId={formData.media_id}
        allowedTypes={['image', 'video']}
        title="Select Sponsor Media"
      />
    </>
  );
};

export default SponsorScheduleDialog;
