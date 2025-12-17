import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

interface ScheduleCellRendererProps {
  value: string | object;
  data: any;
  api: any;
  colDef: any;
  node: any;
  // Optional prop to specify which types can have schedules
  editableTypes?: string[];
  // Callback to open schedule dialog at parent level (to survive re-renders)
  onEditSchedule?: (data: any, node: any, colDef: any, api: any) => void;
}

export const ScheduleCellRenderer: React.FC<ScheduleCellRendererProps> = ({
  value,
  data,
  api,
  colDef,
  node,
  editableTypes = ['playlist', 'bucket', 'item'], // Default to all schedule-capable types
  onEditSchedule
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  // Check if row is selected
  const isSelected = node?.isSelected?.() || false;

  // Attach hover listeners to the parent cell element
  useEffect(() => {
    const cellElement = cellRef.current?.closest('.ag-cell');
    if (cellElement) {
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      cellElement.addEventListener('mouseenter', handleMouseEnter);
      cellElement.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        cellElement.removeEventListener('mouseenter', handleMouseEnter);
        cellElement.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  // Check if this row type supports schedules based on editableTypes prop
  const isScheduleEditable = data && editableTypes.includes(data.type);

  const handleClick = (e: React.MouseEvent) => {
    // Only stop propagation, don't do anything else
    e.stopPropagation();
  };

  // Helper function to normalize schedule data (handle both object and string formats)
  const normalizeSchedule = (scheduleValue: string | object | null | undefined) => {
    // Handle null/undefined
    if (!scheduleValue) {
      return null;
    }

    // If it's already an object, return it
    if (typeof scheduleValue === 'object' && scheduleValue !== null) {
      return scheduleValue;
    }

    // If it's a string, try to parse it
    if (typeof scheduleValue === 'string') {
      const trimmedValue = scheduleValue.trim();
      if (!trimmedValue || trimmedValue === 'null' || trimmedValue === 'undefined') {
        return null;
      }

      // Try to parse JSON
      try {
        const parsed = JSON.parse(trimmedValue);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
        return null;
      } catch (error) {
        // Legacy text schedules or invalid JSON
        return null;
      }
    }

    return null;
  };

  const renderScheduleDisplay = () => {
    // Always show empty for non-editable types
    if (!isScheduleEditable) {
      return <Typography variant="body2" color="text.disabled">—</Typography>;
    }

    const schedule = normalizeSchedule(value);

    // If no valid schedule, show "Always"
    if (!schedule) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <Typography variant="body2">Always</Typography>
        </Box>
      );
    }

    try {
      // Safely check for schedule properties with defaults
      const daysOfWeek = schedule.daysOfWeek || {};
      const timeRanges = Array.isArray(schedule.timeRanges) ? schedule.timeRanges : [];

      // Check if schedule has any meaningful data
      const hasSelectedDays = typeof daysOfWeek === 'object' &&
        Object.values(daysOfWeek).some(enabled => enabled === true);
      const hasTimeRanges = timeRanges.length > 0 &&
        timeRanges.some((range: any) =>
          range && typeof range === 'object' && range.start && range.end
        );
      const hasStartDate = !!schedule.startDate;
      const hasEndDate = !!schedule.endDate;
      const hasDateRange = hasStartDate || hasEndDate;

      // If no meaningful data, show "Always"
      if (!hasSelectedDays && !hasTimeRanges && !hasDateRange) {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2">Always</Typography>
          </Box>
        );
      }

      // Format time ranges (primary line)
      const timeRangeText = hasTimeRanges
        ? timeRanges
            .filter((range: any) =>
              range && typeof range === 'object' && range.start && range.end
            )
            .map((range: any) => `${range.start} - ${range.end}`)
            .join(', ')
        : 'All Day';

      // Format days of week (secondary line)
      const daysText = hasSelectedDays
        ? Object.entries(daysOfWeek)
            .filter(([day, enabled]) => enabled === true && typeof day === 'string')
            .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1, 3))
            .join(', ')
        : 'Every Day';

      // Format dates with error handling
      let dateDisplay = '';
      if (hasDateRange) {
        try {
          // Helper to format date with time (MM/dd HH:mm)
          const formatDateTime = (date: Date) => {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${month}/${day} ${hours}:${minutes}`;
          };

          if (hasStartDate && hasEndDate) {
            const startDate = new Date(schedule.startDate);
            const endDate = new Date(schedule.endDate);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              dateDisplay = `${formatDateTime(startDate)} - ${formatDateTime(endDate)}`;
            }
          } else if (hasStartDate) {
            const startDate = new Date(schedule.startDate);
            if (!isNaN(startDate.getTime())) {
              dateDisplay = `From ${formatDateTime(startDate)}`;
            }
          } else if (hasEndDate) {
            const endDate = new Date(schedule.endDate);
            if (!isNaN(endDate.getTime())) {
              dateDisplay = `Until ${formatDateTime(endDate)}`;
            }
          }
        } catch (dateError) {
          console.warn('Error parsing dates:', dateError);
        }
      }

      // Build secondary line
      const secondaryParts = [daysText, dateDisplay].filter(Boolean);

      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', py: 0.5 }}>
          <Typography variant="body2" noWrap>
            {timeRangeText}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {secondaryParts.join(' | ')}
          </Typography>
        </Box>
      );
    } catch (error) {
      console.error('Error rendering schedule:', error);
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <Typography variant="body2">Always</Typography>
        </Box>
      );
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (isScheduleEditable && onEditSchedule) {
      // Call parent's callback to open dialog (survives cell re-renders)
      onEditSchedule(data, node, colDef, api);
    }
  };

  return (
    <Box
      ref={cellRef}
      onClick={handleClick}
      sx={{
        cursor: isScheduleEditable ? 'pointer' : 'default',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}
    >
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {renderScheduleDisplay()}
      </Box>
      {isScheduleEditable && (
        <Box
          component="span"
          sx={{
            color: '#1976d2',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: isSelected ? 'var(--ag-selected-row-background-color)' : 'var(--ag-row-hover-color)',
            visibility: isHovered ? 'visible' : 'hidden',
            flexShrink: 0
          }}
          onClick={handleEditClick}
          onMouseDown={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={(e: React.PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <i className="fa fa-edit"></i>
        </Box>
      )}
    </Box>
  );
};

// Export the normalizeSchedule helper for use in parent components
export const normalizeSchedule = (scheduleValue: string | object | null | undefined) => {
  // Handle null/undefined
  if (!scheduleValue) {
    return null;
  }

  // If it's already an object, return it
  if (typeof scheduleValue === 'object' && scheduleValue !== null) {
    return scheduleValue;
  }

  // If it's a string, try to parse it
  if (typeof scheduleValue === 'string') {
    const trimmedValue = scheduleValue.trim();
    if (!trimmedValue || trimmedValue === 'null' || trimmedValue === 'undefined') {
      return null;
    }

    // Try to parse JSON
    try {
      const parsed = JSON.parse(trimmedValue);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return null;
    } catch (error) {
      // Legacy text schedules or invalid JSON
      return null;
    }
  }

  return null;
};

// Format schedule as a readable tooltip string
export const formatScheduleTooltip = (scheduleValue: string | object | null | undefined): string => {
  const schedule = normalizeSchedule(scheduleValue);

  // If no schedule, return "Always"
  if (!schedule) {
    return 'Always';
  }

  const parts: string[] = [];

  // Check for meaningful schedule data
  const daysOfWeek = schedule.daysOfWeek || {};
  const timeRanges = Array.isArray(schedule.timeRanges) ? schedule.timeRanges : [];
  const hasSelectedDays = typeof daysOfWeek === 'object' &&
    Object.values(daysOfWeek).some(enabled => enabled === true);
  const hasTimeRanges = timeRanges.length > 0 &&
    timeRanges.some((range: any) => range && range.start && range.end);
  const hasStartDate = !!schedule.startDate;
  const hasEndDate = !!schedule.endDate;

  // If no meaningful data, return "Always"
  if (!hasSelectedDays && !hasTimeRanges && !hasStartDate && !hasEndDate) {
    return 'Always';
  }

  // Format time ranges
  if (hasTimeRanges) {
    const timeText = timeRanges
      .filter((range: any) => range && range.start && range.end)
      .map((range: any) => `${range.start} - ${range.end}`)
      .join(', ');
    parts.push(timeText);
  } else {
    parts.push('All Day');
  }

  // Format days of week
  if (hasSelectedDays) {
    const daysText = Object.entries(daysOfWeek)
      .filter(([_, enabled]) => enabled === true)
      .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1, 3))
      .join(', ');
    parts.push(daysText);
  } else {
    parts.push('Every Day');
  }

  // Format date range
  if (hasStartDate || hasEndDate) {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (hasStartDate && hasEndDate) {
      parts.push(`${formatDate(schedule.startDate)} - ${formatDate(schedule.endDate)}`);
    } else if (hasStartDate) {
      parts.push(`From ${formatDate(schedule.startDate)}`);
    } else if (hasEndDate) {
      parts.push(`Until ${formatDate(schedule.endDate)}`);
    }
  }

  return parts.join(' | ');
};

// Check if a schedule is currently active based on the current time
export const isScheduleActive = (scheduleValue: string | object | null | undefined, now?: Date): boolean => {
  const schedule = normalizeSchedule(scheduleValue);

  // If no schedule, it's always active
  if (!schedule) {
    return true;
  }

  const currentTime = now || new Date();

  // Check date range
  const hasStartDate = !!schedule.startDate;
  const hasEndDate = !!schedule.endDate;

  if (hasStartDate) {
    const startDate = new Date(schedule.startDate);
    if (!isNaN(startDate.getTime()) && currentTime < startDate) {
      return false; // Before start date
    }
  }

  if (hasEndDate) {
    const endDate = new Date(schedule.endDate);
    if (!isNaN(endDate.getTime()) && currentTime > endDate) {
      return false; // After end date
    }
  }

  // Check days of week
  const daysOfWeek = schedule.daysOfWeek || {};
  const hasSelectedDays = typeof daysOfWeek === 'object' &&
    Object.values(daysOfWeek).some(enabled => enabled === true);

  if (hasSelectedDays) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[currentTime.getDay()];
    if (!daysOfWeek[currentDayName]) {
      return false; // Current day not enabled
    }
  }

  // Check time ranges
  const timeRanges = Array.isArray(schedule.timeRanges) ? schedule.timeRanges : [];
  const hasTimeRanges = timeRanges.length > 0 &&
    timeRanges.some((range: any) =>
      range && typeof range === 'object' && range.start && range.end
    );

  if (hasTimeRanges) {
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTimeMinutes = currentHours * 60 + currentMinutes;

    const isInAnyRange = timeRanges.some((range: any) => {
      if (!range || !range.start || !range.end) return false;

      const [startHour, startMin] = range.start.split(':').map(Number);
      const [endHour, endMin] = range.end.split(':').map(Number);

      if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
        return false;
      }

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Handle overnight ranges (e.g., 22:00 - 06:00)
      if (endMinutes < startMinutes) {
        return currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes;
      }

      return currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
    });

    if (!isInAnyRange) {
      return false; // Not in any active time range
    }
  }

  return true;
};