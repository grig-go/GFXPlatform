import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { MenuItemDef, DefaultMenuItem } from 'ag-grid-community';
import {
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography
} from '@mui/material';
import WidgetsIcon from '@mui/icons-material/Widgets';
import WarningIcon from '@mui/icons-material/Warning';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import { supabase } from '../lib/supabase';
import AgCheckbox from '../components/AgCheckbox';
import { parseWidgetConfig, type ContentItem, type UE5WidgetConfig } from '../types/widget';

// Define the ref interface
export interface WidgetWindowPageRef {
  refreshWidgets: () => Promise<void>;
  openWidgetInBuilder: (widgetId: string) => void;
}

interface WidgetWindowPageProps {
  onWidgetSelect?: (widgetId: string) => void;
  onProductionWidgetOpen?: (widgetId: string) => void;
}

interface WidgetItem extends ContentItem {
  widgetConfig?: UE5WidgetConfig;
  connectionStatus?: 'connected' | 'disconnected' | 'error';
  lastConnected?: string;
  channels?: {
    name: string;
  };
}

const WidgetWindowPageComponent: React.ForwardRefRenderFunction<WidgetWindowPageRef, WidgetWindowPageProps> = (props, ref) => {
  const gridRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgets, setWidgets] = useState<WidgetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWidgets, setSelectedWidgets] = useState<WidgetItem[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [widgetsToDelete, setWidgetsToDelete] = useState<WidgetItem[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Expose functions via ref
  useImperativeHandle(ref, () => ({
    refreshWidgets: refreshWidgets,
    openWidgetInBuilder: openWidgetInBuilder
  }));

  // Fetch widgets from database
  const fetchWidgets = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, try to refresh the session if needed
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'widget')
        .order('created_at', { ascending: false });

      if (error) {
        // Handle specific RLS errors
        if (error.message.includes('JWT') || error.message.includes('session') || error.message.includes('expired')) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        throw error;
      }

      // Parse widget configurations
      const widgetsWithConfig = (data || []).map(widget => {
        const config = widget.config ? parseWidgetConfig(widget.config) : null;
        return {
          ...widget,
          widgetConfig: config,
          connectionStatus: 'disconnected' as const
        };
      });

      setWidgets(widgetsWithConfig);
    } catch (err) {
      console.error('Error fetching widgets:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching widgets';
      setError(errorMessage);
      
      // If it's a session error, suggest refreshing the page
      if (errorMessage.includes('session') || errorMessage.includes('expired')) {
        console.warn('Session issue detected. Consider refreshing the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshWidgets = async () => {
    setIsRefreshing(true);
    await fetchWidgets();
    setIsRefreshing(false);
  };

  const openWidgetInBuilder = useCallback((widgetId: string) => {
    console.log('Opening widget in builder:', widgetId);
    if (props.onWidgetSelect) {
      props.onWidgetSelect(widgetId);
    } else {
      // Fallback: try again after a short delay if handler is not available yet
      console.log('Handler not available yet, retrying in 500ms...');
      setTimeout(() => {
        if (props.onWidgetSelect) {
          props.onWidgetSelect(widgetId);
        } else {
          console.error('Widget select handler still not available after retry');
        }
      }, 500);
    }
  }, [props]);

  const openProductionWidget = useCallback((widgetId: string) => {
    console.log('Opening production widget:', widgetId);
    if (props.onProductionWidgetOpen) {
      props.onProductionWidgetOpen(widgetId);
    } else {
      console.log('Production widget handler not available yet, retrying in 500ms...');
      setTimeout(() => {
        if (props.onProductionWidgetOpen) {
          props.onProductionWidgetOpen(widgetId);
        } else {
          console.error('Production widget handler still not available after retry');
        }
      }, 500);
    }
  }, [props]);

  // Initial fetch
  useEffect(() => {
    fetchWidgets();
  }, []);

  // Set up real-time subscription for widget changes
  useEffect(() => {
    const channel = supabase
      .channel('widget-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
          filter: 'type=eq.widget'
        },
        (payload) => {
          console.log('Widget table changed:', payload);
          fetchWidgets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Grid column definitions - EXACTLY matching TemplatesPage design
  const columnDefs = useMemo(() => [
    {
      headerName: '',
      width: 40,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
      suppressMenu: true,
      sortable: false,
      filter: false,
      resizable: false
    },
    {
      field: 'active',
      headerName: 'Active',
      width: 100,
      filter: true, // Enable filter
      filterParams: {
        values: [true, false],
        suppressMiniFilter: true
      },
      cellRenderer: (params: any) => {
        // Show checkbox exactly like TemplatesPage
        return (
          <AgCheckbox
            checked={params.value}
            onChange={async (newValue) => {
              // Update the grid immediately for responsiveness
              params.node.setDataValue('active', newValue);

              // Update the database
              try {
                await toggleWidgetStatus(params.data);
              } catch (error) {
                console.error('Failed to update widget active status:', error);
                // Revert on error
                params.node.setDataValue('active', !newValue);
              }
            }}
          />
        );
      },
      editable: false // Set to false since we're handling changes in the renderer
    },
    {
      field: 'name',
      headerName: 'Widget Name',
      width: 200,
      cellRenderer: (params: any) => {
        const widget = params.data as WidgetItem;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{widget.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {widget.widgetConfig?.widgetType?.toUpperCase()} Widget
              </div>
            </div>
          </div>
        );
      },
      filter: 'agTextColumnFilter',
      filterParams: {
        filterOptions: ['contains', 'equals', 'startsWith'],
        defaultOption: 'contains'
      }
    },
    {
      field: 'created_by',
      headerName: 'Type',
      width: 120,
      cellRenderer: (_params: any) => {
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '500', color: '#2196F3' }}>Shared</div>
            </div>
          </div>
        );
      },
      filter: false
    },
    {
      field: 'created_at',
      headerName: 'Date Created',
      width: 150,
      cellRenderer: (params: any) => {
        const widget = params.data as WidgetItem;
        const createdDate = widget.created_at ? new Date(widget.created_at) : new Date();
        const formattedDate = createdDate.toLocaleDateString();
        const formattedTime = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '500' }}>{formattedDate}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{formattedTime}</div>
            </div>
          </div>
        );
      },
      filter: 'agDateColumnFilter',
      filterParams: {
        comparator: (filterLocalDateAtMidnight: Date, cellValue: string) => {
          const cellDate = new Date(cellValue);
          if (cellDate < filterLocalDateAtMidnight) return -1;
          if (cellDate > filterLocalDateAtMidnight) return 1;
          return 0;
        }
      }
    },
    {
      field: 'channel',
      headerName: 'Assigned Channel',
      width: 180,
      cellRenderer: (params: any) => {
        const widget = params.data as WidgetItem;
        const connectionSettings = widget.widgetConfig?.connectionSettings;
        const channelInfo = connectionSettings 
          ? `${connectionSettings.host}:${connectionSettings.port}` 
          : 'No Channel Assigned';
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '500' }}>{channelInfo}</div>
            </div>
          </div>
        );
      },
      filter: 'agTextColumnFilter',
      filterParams: {
        filterOptions: ['contains', 'equals', 'startsWith'],
        defaultOption: 'contains'
      }
    }
  ], []);

  // Default column definition - EXACTLY matching TemplatesPage
  const defaultColDef = useMemo(
    () => ({
      sortable: true, // Enable sorting by default
      filter: true, // Enable filtering by default
      resizable: true,
      floatingFilter: true // Show filter row below headers
    }),
    []
  );

  // Handle row double-click - Opens Production Widget
  const onRowDoubleClicked = useCallback((event: any) => {
    console.log('Double-clicked widget:', event.data);
    const { data } = event;
    if (data && data.id) {
      openProductionWidget(data.id);
    }
  }, [openProductionWidget]);

  // Handle selection changed - EXACTLY matching TemplatesPage
  const onSelectionChanged = useCallback(() => {
    if (!gridRef.current?.api) return;
    const selectedRows = gridRef.current.api.getSelectedRows();
    setSelectedWidgets(selectedRows || []);
  }, []);

  // Context menu items
  const getContextMenuItems = useCallback((params: any): (MenuItemDef | DefaultMenuItem)[] => {
    const widget = params.node?.data as WidgetItem;
    if (!widget) return [];

    return [
      {
        name: 'Open in Builder',
        icon: '<span class="ag-icon ag-icon-edit"></span>',
        action: () => openWidgetInBuilder(widget.id)
      },
      {
        name: widget.active ? 'Deactivate' : 'Activate',
        icon: '<span class="ag-icon ag-icon-tick"></span>',
        action: () => toggleWidgetStatus(widget)
      },
      'separator',
      {
        name: 'Delete',
        icon: '<span class="ag-icon ag-icon-cross"></span>',
        action: () => prepareDelete([widget])
      }
    ];
  }, [openWidgetInBuilder]);

  // Widget management functions
  const toggleWidgetStatus = async (widget: WidgetItem) => {
    try {
      const { error } = await supabase
        .from('content')
        .update({ active: !widget.active })
        .eq('id', widget.id);

      if (error) throw error;

      setSnackbarMessage(`Widget "${widget.name}" ${!widget.active ? 'activated' : 'deactivated'}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error toggling widget status:', error);
      setSnackbarMessage('Failed to update widget status');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const prepareDelete = (widgets?: WidgetItem[]) => {
    const toDelete = widgets || selectedWidgets;
    if (!toDelete || toDelete.length === 0) return;
    setWidgetsToDelete(toDelete);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!widgetsToDelete || widgetsToDelete.length === 0) return;
    try {
      const ids = widgetsToDelete.map(w => w.id);
      const { error } = await supabase
        .from('content')
        .delete()
        .in('id', ids);
      if (error) throw error;
      setSnackbarMessage(`Deleted ${ids.length} widget${ids.length > 1 ? 's' : ''}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      // Update local state instead of refreshing
      setWidgets(prev => prev.filter(widget => !ids.includes(widget.id)));
      // Clear selection in grid
      if (gridRef.current?.api) {
        gridRef.current.api.deselectAll();
      }
      setSelectedWidgets([]);
    } catch (error) {
      console.error('Failed to delete widgets:', error);
      setSnackbarMessage('Failed to delete selected widgets');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDeleteDialogOpen(false);
      setWidgetsToDelete([]);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%' 
      }}>
        <CircularProgress />
      </div>
    );
  }

  return (
    (<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar - matching TemplatesPage design */}
      <div className="toolbar" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div>Error: {error}</div>
          ) : (
            <>
              <Tooltip title="Edit Widget">
                <span>
                  <IconButton
                    onClick={() => {
                      if (selectedWidgets.length === 1) {
                        openWidgetInBuilder(selectedWidgets[0].id);
                      }
                    }}
                    disabled={selectedWidgets.length !== 1}
                    className="toolbar-button"
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tooltip title="Refresh">
            <IconButton onClick={refreshWidgets} disabled={isRefreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {selectedWidgets.length > 0 && (
            <Chip
              label={`${selectedWidgets.length} selected`}
              size="small"
              color="primary"
              onDelete={() => {
                if (gridRef.current?.api) {
                  gridRef.current.api.deselectAll();
                }
                setSelectedWidgets([]);
              }}
            />
          )}
          <Tooltip title="Delete Selected">
            <span>
              <IconButton
                onClick={() => prepareDelete()}
                disabled={selectedWidgets.length === 0}
                className="toolbar-button"
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>
      {/* Grid - matching TemplatesPage design */}
      <div 
        ref={containerRef}
        className="ag-theme-alpine" 
        style={{ 
          flex: 1, 
          overflow: 'auto'
        }}
      >
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={widgets}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={false}
          rowSelection={{
            mode: 'multiRow',
            checkboxes: false,
            enableSelectionWithoutKeys: false,
            enableClickSelection: true
          }}
          selectionColumnDef={{ hide: true } as any}
          onSelectionChanged={onSelectionChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          getContextMenuItems={getContextMenuItems}
          popupParent={document.body}
          rowHeight={40}
          tooltipShowDelay={1500}
          tooltipShowMode="whenTruncated" />
      </div>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        maxWidth="md"
      >
        <DialogTitle id="delete-dialog-title">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="error" style={{ marginRight: 8 }} />
            Confirm Deletion
          </div>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete the following widget{widgetsToDelete.length > 1 ? 's' : ''}? This action cannot be undone.
          </Typography>
          <List>
            {widgetsToDelete.map(widget => (
              <ListItem key={widget.id}>
                <ListItemIcon>
                  <WidgetsIcon />
                </ListItemIcon>
                <ListItemText
                  primary={widget.name}
                  secondary={widget.channels?.name ? `Channel: ${widget.channels.name}` : undefined}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>)
  );
};

const WidgetWindowPage = forwardRef(WidgetWindowPageComponent);
export default WidgetWindowPage;

