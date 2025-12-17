import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  FormGroup,
  FormControlLabel,
  IconButton,
  Box,
  Typography,
  Divider,
  Grid,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

interface TimeRange {
  start: string;
  end: string;
}

interface Schedule {
  startDate: string;
  endDate: string;
  timeRanges: TimeRange[];
  daysOfWeek: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
}

interface ScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (schedule: Schedule) => void;
  initialSchedule?: Schedule | null; // Changed from string to Schedule object
}

const emptySchedule: Schedule = {
  startDate: '',
  endDate: '',
  timeRanges: [{ start: '', end: '' }],
  daysOfWeek: {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false
  }
};

export const ScheduleDialog: React.FC<ScheduleDialogProps> = ({
  open,
  onClose,
  onSave,
  initialSchedule
}) => {
  const [schedule, setSchedule] = useState<Schedule>(emptySchedule);
  const [error, setError] = useState<string | null>(null);
  const previousInitialSchedule = useRef();

  // Check if a time range spans midnight
  const isOvernightRange = (start: string, end: string): boolean => {
    if (!start || !end) return false;
    
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    
    return startMinutes > endMinutes;
  };

  // Convert time string to minutes
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Check if overnight schedule conflicts with end date
  const hasOvernightEndDateConflict = (
    endDate: string, 
    timeRanges: TimeRange[]
  ): boolean => {
    if (!endDate) return false;
    
    // Check if any time range is overnight
    const overnightRanges = timeRanges.filter(range => 
      range.start && range.end && isOvernightRange(range.start, range.end)
    );
    
    if (overnightRanges.length === 0) return false;
    
    // Parse the end date to check if it has a time component
    const endDateTime = new Date(endDate);
    const endHours = endDateTime.getHours();
    const endMinutes = endDateTime.getMinutes();
    const endTimeInMinutes = endHours * 60 + endMinutes;
    
    // Check each overnight range for conflicts
    for (const range of overnightRanges) {
      const rangeStartMinutes = timeToMinutes(range.start);
      const rangeEndMinutes = timeToMinutes(range.end);
      
      // CONFLICT 1: End date time is after midnight but before the overnight range ends
      // Example: Range is 1:00 PM → 2:00 AM, End date is 1:00 AM
      // The 1:00 AM - 2:00 AM portion would be cut off
      if (endTimeInMinutes > 0 && endTimeInMinutes < rangeEndMinutes) {
        return true;
      }
      
      // CONFLICT 2: End date is exactly at midnight (00:00) but range continues past midnight
      // Example: Range is 10:00 PM → 2:00 AM, End date is 12:00 AM
      // The entire 12:00 AM - 2:00 AM portion would be cut off
      if (endTimeInMinutes === 0 && rangeEndMinutes > 0) {
        return true;
      }
      
      // CONFLICT 3: End time falls within the same-day portion of the range
      // Example: Range is 1:00 PM → 1:00 AM, End date is 10:00 PM
      // Would cut off at 10:00 PM, never reaching the overnight portion
      if (endTimeInMinutes >= rangeStartMinutes && endTimeInMinutes < 1440) {
        return true;
      }
    }
    
    return false;
  };

  // Get all overnight ranges
  const getOvernightRanges = (timeRanges: TimeRange[]): TimeRange[] => {
    return timeRanges.filter(range => 
      isOvernightRange(range.start, range.end)
    );
  };

  useEffect(() => {
    // Only run if open changed or initialSchedule actually changed
    const scheduleChanged = JSON.stringify(previousInitialSchedule.current) !== JSON.stringify(initialSchedule);

    if (open && (scheduleChanged || !previousInitialSchedule.current)) {
      console.log('ScheduleDialog - schedule changed, updating');
      setError(null);

      if (initialSchedule) {
        const newSchedule = {
          startDate: initialSchedule.startDate || '',
          endDate: initialSchedule.endDate || '',
          timeRanges: initialSchedule.timeRanges && initialSchedule.timeRanges.length > 0 
            ? initialSchedule.timeRanges 
            : [{ start: '', end: '' }],
          daysOfWeek: initialSchedule.daysOfWeek || {
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false,
            sunday: false
          }
        };
        
        // @ts-ignore: Schedule type issue
        setSchedule(newSchedule as any);
        previousInitialSchedule.current = initialSchedule as any;
      } else {
        setSchedule(emptySchedule as any);
        previousInitialSchedule.current = undefined as any;
      }
    }
  }, [open, initialSchedule]);

  const handleAddTimeRange = () => {
    setSchedule(prev => ({
      ...prev,
      timeRanges: [...prev.timeRanges, { start: '', end: '' }]
    }));
  };

  const handleRemoveTimeRange = (index: number) => {
    setSchedule(prev => ({
      ...prev,
      timeRanges: prev.timeRanges.filter((_, i) => i !== index)
    }));
  };

  const handleTimeRangeChange = (index: number, field: 'start' | 'end', value: string) => {
    setSchedule(prev => ({
      ...prev,
      timeRanges: prev.timeRanges.map((range, i) =>
        i === index ? { ...range, [field]: value } : range
      )
    }));
  };

  const handleDayChange = (day: keyof Schedule['daysOfWeek']) => {
    setSchedule(prev => ({
      ...prev,
      daysOfWeek: {
        ...prev.daysOfWeek,
        [day]: !prev.daysOfWeek[day]
      }
    }));
  };

  const handleDateTimeChange = (field: 'startDate' | 'endDate', value: string) => {
    setSchedule(prev => ({ ...prev, [field]: value }));
  };

  const handleClearDateTime = (field: 'startDate' | 'endDate') => {
    setSchedule(prev => ({ ...prev, [field]: '' }));
  };

  const handleReset = () => {
    setSchedule(emptySchedule as any);
  };

  const handleSave = () => {
    // Validate: end date must be after start date (if both are set)
    if (schedule.startDate && schedule.endDate) {
      const start = new Date(schedule.startDate);
      const end = new Date(schedule.endDate);
      if (end < start) {
        setError('End date must be after start date');
        return;
      }
    }

    setError(null);

    // If no time ranges exist, create one empty time range to maintain structure
    const scheduleToSave = {
      ...schedule,
      timeRanges: schedule.timeRanges.length === 0 ? [{ start: '', end: '' }] : schedule.timeRanges
    };

    onSave(scheduleToSave);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  // Check if schedule is effectively empty (all fields are default/empty)
  const isScheduleEmpty = () => {
    const hasNoDateRange = !schedule.startDate && !schedule.endDate;
    const hasNoSelectedDays = !Object.values(schedule.daysOfWeek).some(selected => selected);
    const hasNoTimeRanges = schedule.timeRanges.length === 0 || 
      schedule.timeRanges.every(range => !range.start && !range.end);
    
    return hasNoDateRange && hasNoSelectedDays && hasNoTimeRanges;
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
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Schedule Settings</Typography>
          <IconButton 
            onClick={handleReset}
            title="Reset all fields"
            color="secondary"
          >
            <RestartAltIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Configure when this item should be active. Leave fields empty for "always active".
        </Typography>

        <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Date Range</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <TextField
                label="Start Date"
                type="datetime-local"
                value={schedule.startDate}
                onChange={(e) => handleDateTimeChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin="normal"
              />
              <IconButton 
                onClick={() => handleClearDateTime('startDate')}
                title="Clear start date"
                size="small"
                disabled={!schedule.startDate}
              >
                <ClearIcon />
              </IconButton>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <TextField
                label="End Date"
                type="datetime-local"
                value={schedule.endDate}
                onChange={(e) => handleDateTimeChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin="normal"
              />
              <IconButton 
                onClick={() => handleClearDateTime('endDate')}
                title="Clear end date"
                size="small"
                disabled={!schedule.endDate}
              >
                <ClearIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Time Ranges</Typography>
          <Typography variant="body2" color="textSecondary">
            Leave empty for "all day"
          </Typography>
        </Box>
        
        {schedule.timeRanges.length === 0 ? (
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" color="textSecondary" align="center">
              No time ranges defined - active all day
            </Typography>
          </Box>
        ) : (
          schedule.timeRanges.map((range, index) => (
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
                  title="Remove time range"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              
              {/* Overnight warning for this specific range */}
              {isOvernightRange(range.start, range.end) && (
                <Alert 
                  severity="info" 
                  icon={<InfoIcon />}
                  sx={{ mt: 1 }}
                >
                  <Typography variant="body2">
                    <strong>Overnight schedule:</strong> This time range spans midnight ({range.start} → {range.end}). The item will be active from {range.start} until {range.end} the <strong>next day</strong>.
                  </Typography>
                </Alert>
              )}
            </Box>
          ))
        )}
        
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddTimeRange}
          sx={{ mb: 3 }}
          variant="outlined"
        >
          Add Time Range
        </Button>

        {/* Global overnight + end date conflict warning */}
        {hasOvernightEndDateConflict(schedule.endDate, schedule.timeRanges) && (
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ mb: 3 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              ⚠️ Overnight Schedule Conflict
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              You have an overnight time range that may extend past your end date. The schedule will end at <strong>{new Date(schedule.endDate).toLocaleString()}</strong>, which could cut off the overnight period before it completes.
            </Typography>
            <Typography variant="body2">
              <strong>Recommendation:</strong> For overnight ranges, set your end date to include the full next-day portion. For example, if your range ends at 1:00 AM, set the end date to 1:00 AM (or later) on the final day.
            </Typography>
          </Alert>
        )}

        {/* Summary of all overnight ranges */}
        {getOvernightRanges(schedule.timeRanges).length > 0 && 
        !hasOvernightEndDateConflict(schedule.endDate, schedule.timeRanges) && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
          >
            <Typography variant="body2">
              <strong>Note:</strong> You have {getOvernightRanges(schedule.timeRanges).length} overnight time range{getOvernightRanges(schedule.timeRanges).length > 1 ? 's' : ''} configured. These will span across midnight into the next day.
            </Typography>
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Days of Week</Typography>
          <Typography variant="body2" color="textSecondary">
            Leave empty for "all days"
          </Typography>
        </Box>
        
        <FormGroup row>
          <FormControlLabel
            control={<Checkbox checked={schedule.daysOfWeek.monday} onChange={() => handleDayChange('monday')} />}
            label="Monday"
          />
          <FormControlLabel
            control={<Checkbox checked={schedule.daysOfWeek.tuesday} onChange={() => handleDayChange('tuesday')} />}
            label="Tuesday"
          />
          <FormControlLabel
            control={<Checkbox checked={schedule.daysOfWeek.wednesday} onChange={() => handleDayChange('wednesday')} />}
            label="Wednesday"
          />
          <FormControlLabel
            control={<Checkbox checked={schedule.daysOfWeek.thursday} onChange={() => handleDayChange('thursday')} />}
            label="Thursday"
          />
          <FormControlLabel
            control={<Checkbox checked={schedule.daysOfWeek.friday} onChange={() => handleDayChange('friday')} />}
            label="Friday"
          />
          <FormControlLabel
            control={<Checkbox checked={schedule.daysOfWeek.saturday} onChange={() => handleDayChange('saturday')} />}
            label="Saturday"
          />
          <FormControlLabel
            control={<Checkbox checked={schedule.daysOfWeek.sunday} onChange={() => handleDayChange('sunday')} />}
            label="Sunday"
          />
        </FormGroup>

        {isScheduleEmpty() && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2" color="info.contrastText">
              ℹ️ No schedule configured - this item will be active all the time
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
        >
          Save Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
};