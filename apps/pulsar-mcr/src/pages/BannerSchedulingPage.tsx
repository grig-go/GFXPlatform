import React, { useState, useRef, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  ICellRendererParams,
  MenuItemDef,
  DefaultMenuItem
} from 'ag-grid-community';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ImageIcon from '@mui/icons-material/Image';

import { useChannels } from '../hooks/useChannels';
import { useBannerSchedules } from '../hooks/useBannerSchedules';
import {
  BannerSchedule,
  BannerScheduleFormData,
  formatTimeRange,
  formatDaysOfWeek,
  formatTriggers,
  isScheduleActiveNow
} from '../types/banner';
import { BannerScheduleDialog } from '../components/BannerScheduleDialog';
import { RetryImage } from '../components/MediaSelector';
import AgCheckbox from '../components/AgCheckbox';

// Media thumbnail cell renderer
const MediaCellRenderer: React.FC<ICellRendererParams> = (params) => {
  const schedule = params.data as BannerSchedule;

  if (!schedule?.media) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
        <Box
          sx={{
            width: 40,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.200',
            borderRadius: 0.5
          }}
        >
          <ImageIcon sx={{ fontSize: 20, color: 'grey.500' }} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          No media
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
      <RetryImage
        src={schedule.media.thumbnail_url || schedule.media.file_url}
        alt={schedule.media.name}
        style={{
          width: 40,
          height: 30,
          objectFit: 'cover',
          borderRadius: 4
        }}
      />
      <Typography variant="body2" noWrap title={schedule.media.name}>
        {schedule.media.name}
      </Typography>
    </Box>
  );
};

// Status cell renderer
const StatusCellRenderer: React.FC<ICellRendererParams> = (params) => {
  const schedule = params.data as BannerSchedule;
  const isActive = schedule?.active;
  const isCurrentlyActive = schedule && isScheduleActiveNow(schedule);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
      {isActive ? (
        isCurrentlyActive ? (
          <Chip
            icon={<CheckCircleIcon />}
            label="Active Now"
            color="success"
            size="small"
          />
        ) : (
          <Chip
            icon={<CheckCircleIcon />}
            label="Scheduled"
            color="primary"
            size="small"
            variant="outlined"
          />
        )
      ) : (
        <Chip
          icon={<CancelIcon />}
          label="Inactive"
          color="default"
          size="small"
          variant="outlined"
        />
      )}
    </Box>
  );
};

// Schedule summary cell renderer
const ScheduleCellRenderer: React.FC<ICellRendererParams> = (params) => {
  const schedule = params.data as BannerSchedule;

  if (!schedule) return null;

  const timeRangeText = schedule.time_ranges.length > 0 &&
    schedule.time_ranges.some(r => r.start && r.end)
    ? schedule.time_ranges.map(formatTimeRange).join(', ')
    : 'All Day';

  const daysText = formatDaysOfWeek(schedule.days_of_week);

  const hasDateRange = schedule.start_date || schedule.end_date;
  const dateText = hasDateRange
    ? `${schedule.start_date ? new Date(schedule.start_date).toLocaleDateString() : 'Start'} - ${schedule.end_date ? new Date(schedule.end_date).toLocaleDateString() : 'End'}`
    : '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', py: 0.5 }}>
      <Typography variant="body2" noWrap>
        {timeRangeText}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap>
        {daysText}{dateText ? ` | ${dateText}` : ''}
      </Typography>
    </Box>
  );
};

const BannerSchedulingPage: React.FC = () => {
  const gridRef = useRef<AgGridReact>(null);
  const { channels, loading: channelsLoading } = useChannels();
  const {
    schedules,
    loading: schedulesLoading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    deleteSchedules,
    findConflicts,
    refresh
  } = useBannerSchedules();

  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingSchedule, setEditingSchedule] = useState<BannerSchedule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<BannerSchedule | null>(null);
  const [selectedRows, setSelectedRows] = useState<BannerSchedule[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  // Filter schedules by selected channel
  const filteredSchedules = useMemo(() => {
    if (selectedChannel === 'all') return schedules;
    return schedules.filter(s => s.channel_ids?.includes(selectedChannel));
  }, [schedules, selectedChannel]);

  // Column definitions
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'active',
      headerName: 'Active',
      width: 100,
      filter: true,
      filterParams: {
        values: [true, false],
        suppressMiniFilter: true
      },
      cellRenderer: (params: any) => {
        return (
          <AgCheckbox
            checked={params.value}
            onChange={async (newValue) => {
              try {
                await updateSchedule(params.data.id, { active: newValue });
              } catch (error) {
                console.error('Failed to update banner schedule active status:', error);
              }
            }}
          />
        );
      },
      editable: false,
      initialPinned: 'left' as const
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 150,
      filter: 'agTextColumnFilter'
    },
    {
      field: 'channel_ids',
      headerName: 'Channels',
      width: 200,
      filter: false,
      hide: selectedChannel !== 'all',
      cellRenderer: (params: ICellRendererParams) => {
        const schedule = params.data as BannerSchedule;
        if (!schedule?.channel_ids || schedule.channel_ids.length === 0) {
          return <Typography variant="body2" color="text.secondary">No channels</Typography>;
        }
        const channelNames = schedule.channel_ids.map(id => {
          const channel = channels.find(c => c.id === id);
          return channel?.name || id;
        });
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
            {channelNames.slice(0, 2).map((name, idx) => (
              <Chip key={idx} label={name} size="small" variant="outlined" />
            ))}
            {channelNames.length > 2 && (
              <Tooltip title={channelNames.slice(2).join(', ')}>
                <Chip label={`+${channelNames.length - 2}`} size="small" />
              </Tooltip>
            )}
          </Box>
        );
      },
      tooltipValueGetter: (params: any) => {
        const schedule = params.data as BannerSchedule;
        if (!schedule?.channel_ids || schedule.channel_ids.length === 0) return 'No channels';
        return schedule.channel_ids.map((id: string) => {
          const channel = channels.find(c => c.id === id);
          return channel?.name || id;
        }).join(', ');
      }
    },
    {
      field: 'media',
      headerName: 'Media',
      flex: 1,
      minWidth: 200,
      cellRenderer: MediaCellRenderer,
      sortable: false,
      filter: false,
      tooltipValueGetter: (params: any) => {
        const schedule = params.data as BannerSchedule;
        return schedule?.media?.name || 'No media';
      }
    },
    {
      field: 'schedule',
      headerName: 'Schedule',
      flex: 1,
      minWidth: 200,
      cellRenderer: ScheduleCellRenderer,
      sortable: false,
      filter: false,
      tooltipValueGetter: (params: any) => {
        const schedule = params.data as BannerSchedule;
        if (!schedule) return null;
        const parts: string[] = [];
        const timeRangeText = schedule.time_ranges?.length > 0 &&
          schedule.time_ranges.some(r => r.start && r.end)
          ? schedule.time_ranges.map(formatTimeRange).join(', ')
          : 'All Day';
        parts.push(timeRangeText);
        parts.push(formatDaysOfWeek(schedule.days_of_week));
        if (schedule.start_date || schedule.end_date) {
          const dateText = `${schedule.start_date ? new Date(schedule.start_date).toLocaleDateString() : 'Start'} - ${schedule.end_date ? new Date(schedule.end_date).toLocaleDateString() : 'End'}`;
          parts.push(dateText);
        }
        return parts.join(' | ');
      }
    },
    {
      field: 'triggers',
      headerName: 'Triggers',
      width: 150,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams) => {
        const schedule = params.data as BannerSchedule;
        if (!schedule) return null;
        const triggersText = formatTriggers(schedule.triggers);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2" noWrap title={triggersText}>
              {triggersText}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 100,
      filter: 'agNumberColumnFilter'
    },
    {
      field: 'active',
      headerName: 'Status',
      width: 130,
      cellRenderer: StatusCellRenderer,
      filter: 'agSetColumnFilter'
    }
  ], [selectedChannel, channels, updateSchedule]);

  // Default column settings
  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true
  }), []);

  // Handle row selection
  const onSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    setSelectedRows(selectedNodes.map(node => node.data));
  }, []);

  // Context menu
  const getContextMenuItems = useCallback((params: any): (MenuItemDef | DefaultMenuItem)[] => {
    const schedule = params.node?.data as BannerSchedule;
    if (!schedule) return [];

    return [
      {
        name: 'Edit',
        icon: '<span class="ag-icon ag-icon-edit"></span>',
        action: () => handleEdit(schedule)
      },
      'separator',
      {
        name: 'Delete',
        icon: '<span class="ag-icon ag-icon-cross"></span>',
        action: () => handleDeleteClick(schedule)
      }
    ];
  }, []);

  // Handlers
  const handleCreate = () => {
    setEditingSchedule(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEdit = (schedule: BannerSchedule) => {
    setEditingSchedule(schedule);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDeleteClick = (schedule: BannerSchedule) => {
    setScheduleToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return;

    try {
      await deleteSchedule(scheduleToDelete.id);
      setSnackbar({
        open: true,
        message: 'Schedule deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to delete schedule',
        severity: 'error'
      });
    } finally {
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    try {
      await deleteSchedules(selectedRows.map(s => s.id));
      setSnackbar({
        open: true,
        message: `${selectedRows.length} schedule(s) deleted`,
        severity: 'success'
      });
      setSelectedRows([]);
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to delete schedules',
        severity: 'error'
      });
    }
  };

  const handleSave = async (data: BannerScheduleFormData) => {
    if (dialogMode === 'create') {
      await createSchedule(data);
      setSnackbar({
        open: true,
        message: 'Schedule created successfully',
        severity: 'success'
      });
    } else if (editingSchedule) {
      await updateSchedule(editingSchedule.id, data);
      setSnackbar({
        open: true,
        message: 'Schedule updated successfully',
        severity: 'success'
      });
    }
    setDialogOpen(false);
  };

  const handleValidate = (data: BannerScheduleFormData) => {
    return findConflicts(
      data.channel_ids,
      data.time_ranges,
      data.days_of_week,
      data.start_date,
      data.end_date,
      editingSchedule?.id
    );
  };

  const handleRefresh = async () => {
    await refresh();
    setSnackbar({
      open: true,
      message: 'Schedules refreshed',
      severity: 'info'
    });
  };

  // Double-click to edit
  const onRowDoubleClicked = useCallback((event: any) => {
    handleEdit(event.data);
  }, []);

  const loading = channelsLoading || schedulesLoading;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshWithAnimation = async () => {
    if (isRefreshing || loading) return;
    setIsRefreshing(true);
    try {
      await handleRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    (<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="toolbar">
        <div className="toolbar-left">
          <Tooltip title="Add New Banner Schedule">
            <span>
              <IconButton
                onClick={handleCreate}
                className="toolbar-button"
                color="primary"
              >
                <AddIcon />
              </IconButton>
            </span>
          </Tooltip>
          <FormControl size="small" sx={{ minWidth: 150, ml: 1 }}>
            <Select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              displayEmpty
              sx={{ height: 32 }}
            >
              <MenuItem value="all">All Channels</MenuItem>
              {[...channels].sort((a, b) => a.name.localeCompare(b.name)).map(channel => (
                <MenuItem key={channel.id} value={channel.id}>
                  {channel.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className="toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tooltip title="Refresh Schedules">
            <span>
              <IconButton
                onClick={handleRefreshWithAnimation}
                disabled={loading || isRefreshing}
                className="toolbar-button"
                color="primary"
              >
                <RefreshIcon style={{
                  animation: isRefreshing ? 'spin 1.5s linear infinite' : 'none'
                }} />
              </IconButton>
            </span>
          </Tooltip>
          {selectedRows.length > 0 && (
            <Chip
              label={`${selectedRows.length} selected`}
              size="small"
              color="primary"
              onDelete={() => {
                if (gridRef.current?.api) {
                  gridRef.current.api.deselectAll();
                }
                setSelectedRows([]);
              }}
            />
          )}
          <Tooltip title="Delete Selected Schedules">
            <span>
              <IconButton
                onClick={handleBulkDelete}
                disabled={selectedRows.length === 0}
                className="toolbar-button"
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>
      {error && (
        <Alert severity="error" sx={{ mx: 1, mb: 1 }}>
          {error}
        </Alert>
      )}
      <div style={{ flex: 1, overflow: 'visible', position: 'relative' }}>
        <div className="ag-theme-alpine" style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <AgGridReact
            ref={gridRef}
            theme="legacy"
            rowData={filteredSchedules}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection={{
              mode: 'multiRow',
              checkboxes: false,
              enableClickSelection: true
            }}
            selectionColumnDef={{ hide: true } as any}
            onSelectionChanged={onSelectionChanged}
            onRowDoubleClicked={onRowDoubleClicked}
            getContextMenuItems={getContextMenuItems}
            animateRows={false}
            popupParent={document.body}
            tooltipShowDelay={1500}
            tooltipShowMode="whenTruncated"
            overlayLoadingTemplate={'<span>Loading schedules...</span>'}
            overlayNoRowsTemplate={
              selectedChannel === 'all'
                ? '<span>No banner schedules found. Click + to create one.</span>'
                : '<span>No schedules for this channel. Click + to create one.</span>'
            }
          />
        </div>
      </div>
      {/* Create/Edit Dialog */}
      <BannerScheduleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        initialData={editingSchedule}
        channels={channels}
        mode={dialogMode}
        onValidate={handleValidate}
      />
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Confirm Delete
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the schedule "{scheduleToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>)
  );
};

export default BannerSchedulingPage;
