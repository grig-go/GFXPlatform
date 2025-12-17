import React, { useCallback, useMemo, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { MenuItemDef, DefaultMenuItem } from 'ag-grid-community';
import {
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Switch,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import { useChannels } from '../hooks/useChannels';
import AgCheckbox from '../components/AgCheckbox';
import { ChannelNameCellRenderer, ChannelTypeCellRenderer, MSECellRenderer } from '../components/ContentCellRenderers';

interface ChannelFormData {
  name: string;
  type: 'Unreal' | 'Vizrt' | 'Pixera' | 'Web';
  active: boolean;
  description: string;
  mse_host: string;
  mse_port: number;
}

const ChannelsPage: React.FC = () => {
  const gridRef = useRef<any>(null);
  const { channels, loading, createChannel, updateChannel, deleteChannel, checkChannelUsage, refreshChannelsAndPlaylists } = useChannels();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<any[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [channelsToDelete, setChannelsToDelete] = useState<any[]>([]);
  const [formData, setFormData] = useState<ChannelFormData>({
    name: '',
    type: 'Unreal',
    active: true,
    description: '',
    mse_host: '',
    mse_port: 8595
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const channelTypes = [
    { value: 'Unreal', label: 'Unreal Engine' },
    { value: 'Vizrt', label: 'Vizrt' },
    { value: 'Pixera', label: 'Pixera' },
    { value: 'Web', label: 'Web' }
  ];

  const handleEdit = useCallback((channel: any) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name || '',
      type: channel.type || 'Unreal',
      active: channel.active ?? true,
      description: channel.description || '',
      mse_host: channel.mse_host || '',
      mse_port: channel.mse_port || 8595
    });
    setDialogOpen(true);
  }, []);

  // Column definitions
  const columnDefs = useMemo(() => [
    {
      field: 'active',
      headerName: 'Active',
      width: 120,
      sortable: true,
      filter: 'agSetColumnFilter',
      cellRenderer: (params: any) => {
        return (
          <AgCheckbox
            checked={params.value ?? true}
            onChange={async (newValue) => {
              // Update the grid immediately for responsiveness
              params.node.setDataValue('active', newValue);

              // Update the database
              try {
                await updateChannel(params.data.id, { active: newValue });
              } catch (error) {
                console.error('Failed to update channel active status:', error);
                // Revert on error
                params.node.setDataValue('active', !newValue);
              }
            }}
          />
        );
      },
      filterParams: {
        values: [true, false],
        valueFormatter: (params: any) => params.value ? 'Active' : 'Inactive'
      },
      editable: false
    },
    {
      field: 'name',
      headerName: 'Channel Name',
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: 'agTextColumnFilter',
      editable: false,
      cellRenderer: ChannelNameCellRenderer,
      cellRendererParams: {
        onEdit: handleEdit
      }
    },
    {
      field: 'type',
      headerName: 'Channel Type',
      width: 200,
      sortable: true,
      cellRenderer: ChannelTypeCellRenderer,
      cellRendererParams: {
        onEdit: handleEdit
      },
      filter: 'agSetColumnFilter',
      filterParams: {
        values: ['Unreal', 'Vizrt', 'Pixera', 'Web']
      },
      editable: false,
      tooltipValueGetter: (params: any) => {
        if (!params.value) return null;
        const typeLabels: Record<string, string> = {
          'Unreal': 'Unreal Engine',
          'Vizrt': 'Vizrt',
          'Pixera': 'Pixera',
          'Web': 'Web'
        };
        return typeLabels[params.value] || params.value;
      }
    },
    {
      field: 'mse_host',
      headerName: 'MSE',
      width: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      editable: false,
      cellRenderer: MSECellRenderer,
      cellRendererParams: {
        onEdit: handleEdit
      },
      valueGetter: (params: any) => params.data?.mse_host || ''
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: 'agTextColumnFilter',
      editable: true
    }
  ], [updateChannel, handleEdit]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true
  }), []);

  // Handle selection changes
  const onSelectionChanged = useCallback(() => {
    if (!gridRef.current?.api) return;
    const selectedRows = gridRef.current.api.getSelectedRows();
    setSelectedChannels(selectedRows || []);
  }, []);

  // Handle cell value changes for editable columns
  const onCellValueChanged = useCallback(async (event: any) => {
    const { data, colDef, newValue, oldValue } = event;

    // Handle all editable fields (active is handled in cellRenderer)
    if (colDef.field === 'name' || colDef.field === 'type' || colDef.field === 'description') {
      try {
        await updateChannel(data.id, { [colDef.field]: newValue });
      } catch (error) {
        console.error(`Failed to update channel ${colDef.field}:`, error);
        // Revert on error
        event.node.setDataValue(colDef.field, oldValue);
      }
    }
  }, [updateChannel]);

  const handleAdd = useCallback(() => {
    setEditingChannel(null);
    setFormData({
      name: '',
      type: 'Unreal',
      active: true,
      description: '',
      mse_host: '',
      mse_port: 8595
    });
    setDialogOpen(true);
  }, []);

  // Prepare delete confirmation
  const prepareDelete = useCallback(async () => {
    if (!selectedChannels.length) return;

    // Check if any of the selected channels are being used in channel playlists
    const usageChecks = await Promise.all(
      selectedChannels.map(async (channel) => {
        const usage = await checkChannelUsage(channel.id);
        return { channel, ...usage };
      })
    );

    const channelsInUse = usageChecks.filter(check => check.isUsed);

    if (channelsInUse.length > 0) {
      // Show alert that channels are in use
      const channelNames = channelsInUse.map(c => c.channel.name).join(', ');
      const message = channelsInUse.length === 1
        ? `Channel "${channelNames}" is currently used in ${channelsInUse[0].count} Channel Playlist(s) and cannot be deleted.`
        : `The following channels are currently used in Channel Playlists and cannot be deleted: ${channelNames}`;

      setSnackbarMessage(message);
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    // If no channels are in use, proceed with delete confirmation
    setChannelsToDelete(selectedChannels);
    setDeleteDialogOpen(true);
  }, [selectedChannels, checkChannelUsage]);

  // Context menu
  const getContextMenuItems = useCallback((params: any): (MenuItemDef | DefaultMenuItem)[] => {
    const channel = params.node?.data;
    if (!channel) return [];

    return [
      {
        name: 'Edit',
        icon: '<span class="ag-icon ag-icon-edit"></span>',
        action: () => {
          handleEdit(channel);
        }
      },
      'separator',
      {
        name: 'Delete',
        icon: '<span class="ag-icon ag-icon-cross"></span>',
        action: () => {
          gridRef.current?.api.deselectAll();
          params.node.setSelected(true);
          prepareDelete();
        }
      }
    ];
  }, [prepareDelete, handleEdit]);

  // Execute deletion
  const executeDeletes = useCallback(async () => {
    const deletePromises: Promise<any>[] = [];

    for (const channel of channelsToDelete) {
      deletePromises.push(
        deleteChannel(channel.id).catch(err => {
          console.error(`Failed to delete channel ${channel.name}:`, err);
          return { error: err, channel };
        })
      );
    }

    const results = await Promise.all(deletePromises);
    const errors = results.filter(r => r?.error);

    if (errors.length > 0) {
      setSnackbarMessage(`Failed to delete ${errors.length} channel(s)`);
      setSnackbarSeverity('error');
    } else {
      setSnackbarMessage(`Successfully deleted ${channelsToDelete.length} channel(s)`);
      setSnackbarSeverity('success');
    }

    setSnackbarOpen(true);
    setDeleteDialogOpen(false);
    setChannelsToDelete([]);

    // Clear selection
    if (gridRef.current?.api) {
      gridRef.current.api.deselectAll();
    }
  }, [channelsToDelete, deleteChannel]);

  // Cancel deletion
  const cancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setChannelsToDelete([]);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      // Only include MSE fields for Vizrt channels
      const channelData = {
        name: formData.name,
        type: formData.type,
        active: formData.active,
        description: formData.description,
        ...(formData.type === 'Vizrt' ? {
          mse_host: formData.mse_host || undefined,
          mse_port: formData.mse_port || 8595
        } : {
          mse_host: undefined,
          mse_port: undefined
        })
      };

      if (editingChannel) {
        await updateChannel(editingChannel.id, channelData);
        setSnackbarMessage(`Channel "${formData.name}" updated successfully`);
      } else {
        await createChannel(channelData);
        setSnackbarMessage(`Channel "${formData.name}" created successfully`);
      }
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setDialogOpen(false);
      setEditingChannel(null);
    } catch (error) {
      console.error('Failed to save channel:', error);
      setSnackbarMessage('Failed to save channel');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [formData, editingChannel, createChannel, updateChannel]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshChannelsAndPlaylists();
      setSnackbarMessage('Channels refreshed successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to refresh channels:', error);
      setSnackbarMessage('Failed to refresh channels');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshChannelsAndPlaylists]);

  return (
    (<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="toolbar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Add Channel">
            <span>
              <IconButton
                onClick={handleAdd}
                className="toolbar-button"
                color="primary"
              >
                <AddIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tooltip title="Refresh">
            <span>
              <IconButton
                onClick={handleRefresh}
                disabled={loading || isRefreshing}
                className="toolbar-button"
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          {selectedChannels.length > 0 && (
            <Chip
              label={`${selectedChannels.length} selected`}
              size="small"
              color="primary"
              onDelete={() => {
                if (gridRef.current?.api) {
                  gridRef.current.api.deselectAll();
                }
                setSelectedChannels([]);
              }}
            />
          )}
          <Tooltip title="Delete Selected Channels">
            <span>
              <IconButton
                onClick={prepareDelete}
                disabled={selectedChannels.length === 0}
                className="toolbar-button"
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            theme="legacy"
            rowData={channels}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection={{
              mode: 'multiRow',
              checkboxes: false,
              enableSelectionWithoutKeys: false,
              enableClickSelection: true
            }}
            selectionColumnDef={{ hide: true } as any}
            animateRows={false}
            onSelectionChanged={onSelectionChanged}
            onCellValueChanged={onCellValueChanged}
            loading={loading}
            getRowId={(params) => params.data.id}
            getContextMenuItems={getContextMenuItems}
            popupParent={document.body}
            tooltipShowDelay={1500}
            tooltipShowMode="whenTruncated" />
        </div>
      </div>
      {/* Channel Form Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingChannel ? 'Edit Channel' : 'Create New Channel'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              autoFocus
              label="Channel Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Channel Type</InputLabel>
              <Select
                value={formData.type}
                label="Channel Type"
                onChange={(e) => setFormData({
                  ...formData,
                  type: e.target.value as any,
                  // Clear MSE fields when switching away from Vizrt
                  mse_host: e.target.value === 'Vizrt' ? formData.mse_host : '',
                  mse_port: e.target.value === 'Vizrt' ? formData.mse_port : 8595
                })}
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
                    value={formData.mse_host}
                    onChange={(e) => setFormData({ ...formData, mse_host: e.target.value })}
                    helperText="Hostname or IP address of the Media Sequencer"
                    placeholder="e.g., 192.168.68.83 or mse-server.local"
                    sx={{ flex: 3 }}
                  />
                  <TextField
                    label="Port"
                    type="number"
                    value={formData.mse_port}
                    onChange={(e) => {
                      const port = parseInt(e.target.value, 10);
                      if (!isNaN(port) && port >= 1 && port <= 65535) {
                        setFormData({ ...formData, mse_port: port });
                      }
                    }}
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

            <TextField
              label="Description"
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              placeholder="Enter a description for this channel"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
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
              bgcolor: 'info.main',
              color: 'info.contrastText',
              p: 2,
              borderRadius: 1,
              opacity: 0.9
            }}>
              <Typography variant="body2">
                <strong>Note:</strong> Channels define the output engine/platform type.
                This determines how content will be rendered for this channel.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            disabled={!formData.name.trim()}
          >
            {editingChannel ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon color="warning" sx={{ mr: 1 }} />
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          {channelsToDelete.length === 1 ? (
            <Typography>
              Are you sure you want to delete the channel "{channelsToDelete[0]?.name}"?
            </Typography>
          ) : (
            <>
              <Typography gutterBottom>
                Are you sure you want to delete {channelsToDelete.length} channels?
              </Typography>
              <List dense>
                {channelsToDelete.map(channel => (
                  <ListItem key={channel.id}>
                    <ListItemText
                      primary={channel.name}
                      secondary={channel.type}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancel</Button>
          <Button onClick={executeDeletes} color="error" variant="contained">
            Delete {channelsToDelete.length === 1 ? 'Channel' : `${channelsToDelete.length} Channels`}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>)
  );
};

export default ChannelsPage;