import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { MenuItemDef, DefaultMenuItem } from 'ag-grid-community';
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Snackbar,
  Alert,
  Chip,
  Switch,
  FormControlLabel
} from '@mui/material';
import TvIcon from '@mui/icons-material/Tv';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useChannels } from '../hooks/useChannels';
import BucketSelector from '../components/BucketSelector';
import { supabase } from '../lib/supabase';

import { AddChannelToPlaylistDialog } from '../components/AddChannelToPlaylistDialog';
import { PlaylistDialog } from '../components/PlaylistDialog';
import { PasteChannelDialog } from '../components/PasteChannelDialog';
import { ScheduleCellRenderer, normalizeSchedule, isScheduleActive, formatScheduleTooltip } from '../components/ScheduleCellRenderer';
import { PlaylistNameCellRenderer } from '../components/ContentCellRenderers';
import { ScheduleDialog } from '../components/ScheduleDialog';
import { useCrossGridDrag, DraggedBucket } from '../contexts/CrossGridDragContext';
import { useGridExpandedRows, useGridColumnState } from '../contexts/GridStateContext';
import AgCheckbox from '../components/AgCheckbox';

interface TreeNode {
  id: string;
  name: string;
  active: boolean;
  schedule?: string;
  children?: TreeNode[];
  type: 'channel' | 'playlist' | 'bucket';
  content_id?: string; // Added to link to content grid buckets
  carousel_type?: string; // Add this
  carousel_name?: string; // Add this
  order?: number; // Add order property
  treePath?: string[]; // Add treePath property
  idPath?: string[]; // Add idPath property
  displayName?: string; // Add displayName property
  descendantCount?: number; // Add descendantCount property
  channel_id?: string; // Foreign key to channels table
  channel_type?: 'Unreal' | 'Vizrt' | 'Pixera' | 'Web'; // Type from channels table
}

// Interface for bucket mappings from paste dialog
interface BucketMapping {
  originalBucketName: string;
  originalContentId: string;
  newBucketName: string | null;
  newContentId: string | null;
}

const ChannelPlaylistsPage: React.FC = () => {
  const gridRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]);
  const {
    channelPlaylists,
    channels,
    loading,
    createChannel,
    createChannelPlaylist,
    updateChannelPlaylist,
    deleteChannelPlaylist,
    deleteChannelPlaylistBatch,
    refreshChannelsIfNeeded,
    refreshChannelsAndPlaylists,
    refreshChannels
  } = useChannels();

  // Cross-grid drag and drop context
  const { setChannelPlaylistsGrid, setBucketDropHandler } = useCrossGridDrag();
  const { expandedRows, toggleRowExpanded } = useGridExpandedRows('channel-playlists');
  const { columnState, setColumnState, isLoaded: isGridStateLoaded } = useGridColumnState('channel-playlists');
  const [rowData, setRowData] = useState<TreeNode[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dropTargetRef = useRef<{ nodeId: string; dropBelow: boolean } | null>(null);
  const dragInProgressRef = useRef<boolean>(false);
  const [lastOperation, setLastOperation] = useState<{ type: string; timestamp: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<TreeNode[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Hide inactive toggle state
  const [hideInactive, setHideInactive] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const [bucketSelectorOpen, setBucketSelectorOpen] = useState(false);
  const [targetPlaylistId, setTargetPlaylistId] = useState<string | null>(null);
  const [editingBucketInstance, setEditingBucketInstance] = useState<TreeNode | null>(null);
  const [copiedData, setCopiedData] = useState<TreeNode | null>(null);
  const [isCut, setIsCut] = useState<boolean>(false);
  const [cutRowIds, setCutRowIds] = useState<Set<string>>(new Set());
  const [addChannelDialogOpen, setAddChannelDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<TreeNode | null>(null);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [targetChannel, setTargetChannel] = useState<{ id: string; name: string } | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<TreeNode | null>(null);
  // Schedule dialog state (lifted from cell renderer to survive re-renders)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingScheduleRow, setEditingScheduleRow] = useState<{
    data: any;
    node: any;
    colDef: any;
    api: any;
  } | null>(null);
  // Paste channel dialog state
  const [pasteChannelDialogOpen, setPasteChannelDialogOpen] = useState(false);
  const [pasteTargetNode, setPasteTargetNode] = useState<TreeNode | null>(null);
  const [allBuckets, setAllBuckets] = useState<{ id: string; name: string }[]>([]);

  // Set up real-time subscription for channel playlist changes
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout;

    const channel = supabase
      .channel('channel-playlist-changes')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'channel_playlists'
        },
        () => {

          // Skip if we're in the middle of a user operation
          const now = Date.now();
          if (isDragging || (lastOperation && now - lastOperation.timestamp < 2000)) {
            return;
          }

          // Clear existing timeout
          if (refreshTimeout) {
            clearTimeout(refreshTimeout);
          }
          
          // Set a timeout to batch multiple deletes
          refreshTimeout = setTimeout(() => {
            
            setSnackbarMessage("Channel buckets updated");
            setSnackbarSeverity("info");
            setSnackbarOpen(true);
            
            refreshChannelsAndPlaylists();
          }, 1000);
        }
      )
      .subscribe();
  
    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [isDragging, lastOperation, refreshChannels]);

  useEffect(() => {
    const handleContentBucketDeleted = () => {
      refreshChannelsAndPlaylists();
    };
    
    window.addEventListener('content-buckets-deleted', handleContentBucketDeleted as EventListener);
    
    return () => {
      window.removeEventListener('content-buckets-deleted', handleContentBucketDeleted as EventListener);
    };
  }, [refreshChannelsAndPlaylists]);

  // Update currentTime every minute when hideInactive is enabled
  useEffect(() => {
    if (!hideInactive) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [hideInactive]);

  // Convert flat database structure to tree
  useEffect(() => {
    if (!channelPlaylists) return;

    // Create a map of channel_id to channel type for quick lookup
    const channelTypeMap = new Map<string, 'Unreal' | 'Vizrt' | 'Pixera' | 'Web'>();
    channels.forEach(channel => {
      channelTypeMap.set(channel.id, channel.type);
    });

    const buildTree = (items: any[], parentId: string | null = null): TreeNode[] => {
      return items
        .filter(item => item.parent_id === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(item => {
          // Add channel type if this item has a channel_id
          const channelType = item.channel_id ? channelTypeMap.get(item.channel_id) : undefined;

          return {
            ...item,
            channel_type: channelType,
            children: buildTree(items, item.id)
          };
        });
    };

    const tree = buildTree(channelPlaylists);
    setRowData(tree);
  }, [channelPlaylists, channels]);

  // Create a more robust getRowId function that guarantees uniqueness
  const getRowId = useCallback((params: any) => {
    // For normal nodes, use their id
    if (params.data && params.data.id) {
      return params.data.id;
    }
    
    // For tree nodes, use the full path as a fallback
    if (params.data && params.data.treePath) {
      return 'path_' + params.data.treePath.join('_');
    }
    
    // Last resort fallback (should never happen with well-formed data)
    console.warn('Missing id for row:', params.data);
    return 'unknown_' + Math.random();
  }, []);

  const getRows = (nodes: TreeNode[], parentPath: string[] = []): any[] => {
    return nodes.reduce((acc: any[], node: TreeNode) => {
      const currentPath = [...parentPath, node.name];
      const row = {
        ...node,
        treePath: currentPath
      };
      
      const rows = [row];
      if (node.children) {
        rows.push(...getRows(node.children, currentPath));
      }
      return [...acc, ...rows];
    }, []);
  };

  const flattenedRows = useMemo(() => {
    const allRows = getRows(rowData);

    if (!hideInactive) {
      return allRows;
    }

    // When hiding inactive, filter rows whose schedule is not currently active
    // Types with schedules: 'playlist', 'bucket'
    // Keep 'channel' visible if it has active descendants
    const schedulableTypes = ['playlist', 'bucket'];

    // Helper to check if a row or its descendants are active
    const isRowOrDescendantsActive = (row: any): boolean => {
      if (schedulableTypes.includes(row.type)) {
        return isScheduleActive(row.schedule, currentTime);
      }
      // For channels, check if any descendants are active
      if (row.type === 'channel') {
        const descendants = allRows.filter(r =>
          r.treePath && r.treePath.length > 1 && r.treePath[0] === row.name
        );
        return descendants.some(d => {
          if (schedulableTypes.includes(d.type)) {
            return isScheduleActive(d.schedule, currentTime);
          }
          return true; // Keep non-schedulable types by default
        });
      }
      return true;
    };

    return allRows.filter(row => {
      if (schedulableTypes.includes(row.type)) {
        return isScheduleActive(row.schedule, currentTime);
      }
      // For channels, keep them if they have active descendants
      if (row.type === 'channel') {
        return isRowOrDescendantsActive(row);
      }
      return true;
    });
  }, [rowData, hideInactive, currentTime]);
  
  const getDataPath = (data: any) => {
    return data.treePath;
  };
  
  const getUniqueNameInLevel = (name: string, siblings: TreeNode[]): string => {
    // If the name doesn't exist at all, just return it
    if (!siblings?.some(node => node.name === name)) {
      return name;
    }
  
    // Remove existing parentheses numbering if present
    let baseName = name;
    const parenthesesMatch = name.match(/^(.*?)\s*\(\d+\)$/);
    if (parenthesesMatch) {
      baseName = parenthesesMatch[1];
    }
    
    // Find all existing numbers for this base name
    const existingNumbers: number[] = [];
    siblings.forEach(node => {
      const nodeMatch = node.name.match(new RegExp(`^${baseName}\\s*\\((\\d+)\\)$`));
      if (nodeMatch && nodeMatch[1]) {
        const num = parseInt(nodeMatch[1], 10);
        if (!isNaN(num)) {
          existingNumbers.push(num);
        }
      } else if (node.name === baseName) {
        // If there's an exact match without number, consider it as instance #1
        existingNumbers.push(1);
      }
    });
    
    // Sort existing numbers
    existingNumbers.sort((a, b) => a - b);
    
    // If there are no numbers, start with 2 (since the original without number is instance 1)
    if (existingNumbers.length === 0) {
      return baseName;
    } else if (!existingNumbers.includes(1) && !siblings.some(node => node.name === baseName)) {
      // If instance #1 doesn't exist and the base name isn't used, return just the base name
      return baseName;
    }
    
    // Find the first gap in the sequence, starting from 2 (since 1 is the unnumbered instance)
    let expectedNumber = 2;
    for (const num of existingNumbers) {
      if (num > expectedNumber) {
        // Found a gap
        break;
      }
      expectedNumber = num + 1;
    }
    
    return `${baseName} (${expectedNumber})`;
  }

  const findParentNode = (nodes: TreeNode[], targetId: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.children?.some(child => child.id === targetId)) {
        return node;
      }
      if (node.children) {
        const parent = findParentNode(node.children, targetId);
        if (parent) {
          return parent;
        }
      }
    }
    return null;
  };

  const updateTreeNode = (nodes: TreeNode[], id: string, updater: (node: TreeNode) => TreeNode): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        return updater(node);
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeNode(node.children, id, updater)
        };
      }
      return node;
    });
  };

  // Check if a node is a descendant of another node
  const isDescendantOf = (nodes: TreeNode[], descendantId: string, ancestorId: string): boolean => {
    // Find the ancestor node
    const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const ancestor = findNode(nodes, ancestorId);
    if (!ancestor || !ancestor.children) return false;
    
    // Check if descendant is a direct child or a child of any children
    for (const child of ancestor.children) {
      if (child.id === descendantId) return true;
      if (child.children && isDescendantOf([child], descendantId, child.id)) return true;
    }
    
    return false;
  };


  const autoGroupColumnDef = useMemo(() => ({
    headerName: 'Name',
    minWidth: 300,
    flex: 1,
    rowDrag: true,
    editable: false,
    field: 'name',
    suppressClickEdit: true,
    filter: 'agTextColumnFilter', // Enable text filter
    filterParams: {
      buttons: ['reset', 'apply'],
      closeOnApply: true,
      filterOptions: [
        'contains',
        'notContains',
        'startsWith',
        'endsWith',
        'equals',
        'notEqual'
      ],
      defaultOption: 'contains',
      textFormatter: (text: string) => {
        // Handle both name and displayName for items
        return text ? text.toLowerCase() : '';
      }
    },
    cellRendererParams: {
      suppressCount: true,
      innerRenderer: PlaylistNameCellRenderer,
      suppressDoubleClickExpand: true,
      checkbox: false
    },
    tooltipValueGetter: (params: any) => params.data?.name || null
  }), []);

  // Callback for schedule cell renderer to open dialog (survives cell re-renders)
  const handleEditSchedule = useCallback((data: any, node: any, colDef: any, api: any) => {
    setEditingScheduleRow({ data, node, colDef, api });
    setScheduleDialogOpen(true);
  }, []);

  // Handle schedule save
  const handleSaveSchedule = useCallback((schedule: any) => {
    if (editingScheduleRow?.node && editingScheduleRow?.colDef) {
      // Update the node data
      editingScheduleRow.node.setDataValue(editingScheduleRow.colDef.field, schedule);
    }
    setScheduleDialogOpen(false);
    setEditingScheduleRow(null);
  }, [editingScheduleRow]);

  const columnDefs = useMemo(() => [
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
        // Hide for channels
        if (params.data && params.data.type === 'channel') {
          return <span style={{ color: '#ccc' }}>—</span>;
        }
        // Show checkbox for playlists and buckets
        return (
          <AgCheckbox
            checked={params.value}
            onChange={async (newValue) => {
              try {
                const { error } = await supabase
                  .from('channel_playlists')
                  .update({ active: newValue })
                  .eq('id', params.data.id);
                if (error) throw error;
                params.node.setDataValue('active', newValue);
              } catch (error) {
                console.error('Failed to update playlist active status:', error);
              }
            }}
          />
        );
      },
      initialPinned: 'left' as const,
      editable: false // Set to false since we're handling changes in the renderer
    },
    {
      field: 'carousel_type',
      headerName: 'Carousel Type',
      width: 150,
      hide: true, // Hidden - now shown as chip in name column
      filter: 'agSetColumnFilter', // Use set filter for predefined values
      filterParams: {
        values: ['Flipping', 'Scrolling', ''], // Include empty string for non-playlists
        comparator: (a: string, b: string) => {
          // Custom comparator to handle empty values
          if (a === b) return 0;
          if (a === '') return -1;
          if (b === '') return 1;
          return a.localeCompare(b);
        },
        suppressMiniFilter: false, // Show mini filter for quick selection
        buttons: ['reset', 'apply'],
        closeOnApply: true
      },
      valueGetter: (params: any) => {
        if (params.data.type === 'playlist') {
          return params.data.carousel_type === 'flipping_carousel' ? 'Flipping' : 'Scrolling';
        }
        return '';
      }
    },
    {
      field: 'schedule',
      headerName: 'Schedule',
      width: 300, // Increased width to accommodate schedule display
      cellRenderer: ScheduleCellRenderer,
      cellRendererParams: {
        editableTypes: ['playlist', 'bucket'], // Only playlists and buckets for channels grid
        onEditSchedule: handleEditSchedule
      },
      editable: false, // Disable inline editing since we're using the dialog
      valueGetter: (params: any) => params.data.type === 'channel' ? '' : params.data.schedule,
      valueSetter: (params: any) => {
        if (params.data.type === 'channel') return false;
        params.data.schedule = params.newValue;
        return true;
      },
      tooltipValueGetter: (params: any) => {
        if (params.data.type === 'channel') return null;
        return formatScheduleTooltip(params.data.schedule);
      }
    },
    {
      field: 'channel_type',
      headerName: 'Channel Type',
      width: 150,
      hide: true,  // Hidden as channel types are managed in the separate Channels page
      filter: 'agSetColumnFilter',
      filterParams: {
        values: ['Unreal', 'Vizrt', 'Pixera', 'Web', ''],
        suppressMiniFilter: false,
        buttons: ['reset', 'apply'],
        closeOnApply: true
      },
      valueGetter: (params: any) => {
        // Only show channel type for channel items
        if (params.data.type === 'channel') {
          return params.data.channel_type || '';
        }
        return '';
      },
      valueFormatter: (params: any) => {
        // Format the display value
        const typeLabels: Record<string, string> = {
          'Unreal': 'Unreal Engine',
          'Vizrt': 'Vizrt',
          'Pixera': 'Pixera',
          'Web': 'Web'
        };
        return params.value ? typeLabels[params.value] || params.value : '';
      }
    },
    {
      field: 'content_id',
      headerName: 'Content Link',
      width: 150,
      hide: true  // Hidden by default, but useful for debugging
    }
  ], [handleEditSchedule]);

  const defaultColDef = useMemo(() => ({
    sortable: false,
    filter: true,
    resizable: true,
    floatingFilter: true,
    cellClassRules: {
      'row-cut': (params: any) => !!params.data?.__isCut
    }
  }), []);

  // Enhanced validation for multi-drag operations
  const isValidDrop = (dragNode: any, dropNode: any, selectedNodes: TreeNode[] = []): boolean => {
    if (!dropNode) return false;

    // Single node drag validation
    if (!selectedNodes.length || selectedNodes.length === 1) {
      const dragType = dragNode.data.type;
      const dropType = dropNode.data.type;

      if (dragType === 'channel') {
        // Channels can be reordered at the top level - allow dropping on any node
        // and we'll find the correct channel position in onRowDragEnd
        return true;
      }

      if (dragType === 'playlist') {
        // Playlists can be dropped on channels or other playlists (as siblings)
        // Also allow dropping on buckets - the edge case logic will handle keeping in original channel
        return dropType === 'channel' || dropType === 'playlist' || dropType === 'bucket';
      }

      if (dragType === 'bucket') {
        // Buckets can be dropped on playlists or other buckets (as siblings)
        // Also allow dropping on channels - the edge case logic will handle keeping in original playlist
        return dropType === 'playlist' || dropType === 'bucket' || dropType === 'channel';
      }

      return false;
    }
    
    // Multi-node drag validation - check if all selected nodes can be dropped on the target
    const dropType = dropNode.data.type;
    
    // Get node types being dragged
    const nodeTypes = selectedNodes.map(node => node.type);
    
    // All nodes must be the same type for multi-drag
    const allSameType = nodeTypes.every(type => type === nodeTypes[0]);
    if (!allSameType) {
      return false;
    }
    
    // Now check based on the common type
    const commonType = nodeTypes[0];
    
    if (commonType === 'channel') {
      // Channels can be reordered at the top level - allow dropping on any node
      // and we'll find the correct channel position in onRowDragEnd
      return true;
    }
  
    if (commonType === 'playlist') {
      // Also allow dropping on buckets - the edge case logic will handle keeping in original channel
      return dropType === 'channel' || dropType === 'playlist' || dropType === 'bucket';
    }

    if (commonType === 'bucket') {
      // Also allow dropping on channels - the edge case logic will handle keeping in original playlist
      return dropType === 'playlist' || dropType === 'bucket' || dropType === 'channel';
    }
  
    return false;
  };

  // Enhanced version that removes multiple nodes
  const findAndRemoveNodes = (nodes: TreeNode[], idsToRemove: string[]): [TreeNode[], TreeNode[]] => {
    let removedNodes: TreeNode[] = [];
    const remainingNodes = nodes.map(node => {
      if (idsToRemove.includes(node.id)) {
        removedNodes.push(node);
        return null; // Mark for removal
      }
      if (node.children) {
        const [found, updatedChildren] = findAndRemoveNodes(node.children, idsToRemove);
        removedNodes = [...removedNodes, ...found];
        // Return new node object instead of mutating
        return { ...node, children: updatedChildren };
      }
      return node;
    }).filter((node): node is TreeNode => node !== null);
    return [removedNodes, remainingNodes];
  };

  // Original single node removal function (kept for backward compatibility)
  const findAndRemoveNode = (nodes: TreeNode[], id: string): [TreeNode | null, TreeNode[]] => {
    let removedNode: TreeNode | null = null;
    const updatedNodes = nodes.map(node => {
      if (node.id === id) {
        removedNode = node;
        return null; // Mark for removal
      }
      if (node.children) {
        const [found, updatedChildren] = findAndRemoveNode(node.children, id);
        if (found) {
          removedNode = found;
          // Return new node object instead of mutating
          return { ...node, children: updatedChildren };
        }
      }
      return node;
    }).filter((node): node is TreeNode => node !== null);
    return [removedNode, updatedNodes];
  };

  // Declare restoreExpandedState first to avoid circular dependency
  const restoreExpandedState = useCallback(() => {
    if (!gridRef.current?.api) return;
    
    setTimeout(() => {
      const rowNodes: any[] = [];
      gridRef.current.api.forEachNode((node: any) => rowNodes.push(node));
      
      rowNodes.forEach((node: any) => {
        if (expandedRows.has(node.data.id)) {
          node.setExpanded(true);
        }
      });
    }, 50);
  }, [expandedRows]);

  const onSelectionChanged = useCallback(() => {
    if (!gridRef.current?.api) return;

    const selectedRows = gridRef.current.api.getSelectedRows();
    setSelectedNodes(selectedRows || []);
    setSelectedNode(selectedRows.length === 1 ? selectedRows[0] : null);

    // Redraw all rows to update edit icon background color on selection change
    const allRowNodes: any[] = [];
    gridRef.current.api.forEachNode((node: any) => allRowNodes.push(node));
    gridRef.current.api.redrawRows({ rowNodes: allRowNodes });
  }, []);

  // Simplified maintainSelection that just updates data
  const maintainSelection = useCallback((newData: TreeNode[]) => {
    setRowData(newData);
    
    // Restore selection without scrolling to it
    if (selectedNodes.length > 0) {
      setTimeout(() => {
        if (gridRef.current?.api) {
          const rows: any[] = [];
          gridRef.current.api.forEachNode((node: any) => {
            if (node.data) rows.push(node);
          });
          
          // Get nodes that still exist after the operation
          const selectedIds = selectedNodes.map(node => node.id);
          const rowsToSelect = rows.filter(row => selectedIds.includes(row.data.id));
          
          // Select the rows
          rowsToSelect.forEach(row => {
            row.setSelected(true, false);
          });
        }
      }, 100);
    }
  }, [selectedNodes]);

  // Track when drag starts
  const onRowDragMove = useCallback((event: any) => {
    if (!isDragging) {
      setIsDragging(true);

      // Disable animations for better performance during drag
      if (gridRef.current?.api) {
        gridRef.current.api.setGridOption('animateRows', false);
      }
    }

    // Add visual feedback for drag over
    const { node, overNode, y } = event;

    // Remove any existing drag classes from ALL row elements (pinned + viewport)
    document.querySelectorAll('.ag-row-drag-target-above, .ag-row-drag-target-below').forEach(el => {
      el.classList.remove('ag-row-drag-target-above', 'ag-row-drag-target-below');
    });

    if (overNode && gridRef.current?.api) {
      const dragType = node.data.type;
      const overType = overNode.data.type;

      // Get original parent ID from channelPlaylists
      const draggedItem = channelPlaylists.find(item => item.id === node.data.id);
      const originalParentId = draggedItem?.parent_id || null;

      // Default: use the overNode
      let targetNodeId = overNode.id;
      let dropBelow = false;

      // Get row elements for position calculation
      // Try multiple selectors - AG Grid might use different row-id formats
      let rowElements = document.querySelectorAll(`[row-id="${overNode.id}"]`);
      if (rowElements.length === 0) {
        // Try with the data id directly
        rowElements = document.querySelectorAll(`[row-id="${overNode.data?.id}"]`);
      }

      // Find a row element with actual dimensions (not the dragging ghost which has 0 height)
      let targetRowElement: Element | null = null;
      for (const el of rowElements) {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0) {
          targetRowElement = el;
          break;
        }
      }

      if (targetRowElement) {
        const rect = targetRowElement.getBoundingClientRect();
        // IMPORTANT: event.y is relative to the grid viewport, not the screen
        // Use event.event.clientY for screen coordinates that match getBoundingClientRect
        const clientY = event.event?.clientY ?? y;
        const midpoint = rect.top + rect.height / 2;
        dropBelow = clientY >= midpoint;

        // Special case: when dragging a channel over another channel,
        // use the bottom 25% of the row to trigger "drop below" - this makes it
        // easier to drop after a channel even when its children are expanded
        if (dragType === 'channel' && overType === 'channel') {
          const bottomQuarter = rect.top + rect.height * 0.75;
          if (clientY >= bottomQuarter) {
            dropBelow = true;
          }
        }
      }

      // EDGE CASE: When dragging a playlist and hovering over a different channel,
      // redirect indicator to the last playlist/bucket of the original channel
      if (dragType === 'playlist' && overType === 'channel' && overNode.data.id !== originalParentId && originalParentId) {
        // Find the original channel in rowData
        const originalChannel = rowData.find(ch => ch.id === originalParentId);
        if (originalChannel?.children && originalChannel.children.length > 0) {
          // Get the last playlist in the original channel
          const lastPlaylist = originalChannel.children[originalChannel.children.length - 1];

          // Build a list of candidate IDs to try (in order of preference)
          const candidates: string[] = [];

          // Check if playlist is expanded (has visible children in flattenedRows)
          const lastPlaylistIdx = flattenedRows.findIndex(r => r.id === lastPlaylist.id);
          if (lastPlaylistIdx >= 0 && lastPlaylist.children && lastPlaylist.children.length > 0) {
            const nextRow = flattenedRows[lastPlaylistIdx + 1];
            if (nextRow && lastPlaylist.children.some(c => c.id === nextRow.id)) {
              // Playlist is expanded - add buckets in reverse order
              for (let i = lastPlaylist.children.length - 1; i >= 0; i--) {
                candidates.push(lastPlaylist.children[i].id);
              }
            }
          }

          // Add all playlists in the channel in reverse order as fallbacks
          for (let i = originalChannel.children.length - 1; i >= 0; i--) {
            candidates.push(originalChannel.children[i].id);
          }

          // Try each candidate until we find one in the DOM
          for (const candidateId of candidates) {
            const newRowElements = document.querySelectorAll(`[row-id="${candidateId}"]`);
            if (newRowElements.length > 0) {
              targetNodeId = candidateId;
              dropBelow = true;
              rowElements = newRowElements;
              break;
            }
          }
        }
      }

      // EDGE CASE: When dragging a bucket and hovering over a channel,
      // redirect to the last bucket of the original playlist
      if (dragType === 'bucket' && overType === 'channel' && originalParentId) {
        // Find original playlist in rowData
        for (const channel of rowData) {
          if (channel.children) {
            const playlist = channel.children.find(p => p.id === originalParentId);
            if (playlist?.children && playlist.children.length > 0) {
              // Try buckets in reverse order until we find one in DOM
              for (let i = playlist.children.length - 1; i >= 0; i--) {
                const bucket = playlist.children[i];
                const newRowElements = document.querySelectorAll(`[row-id="${bucket.id}"]`);
                if (newRowElements.length > 0) {
                  targetNodeId = bucket.id;
                  dropBelow = true;
                  rowElements = newRowElements;
                  break;
                }
              }
              break;
            }
          }
        }
      }

      if (rowElements.length > 0) {
        const className = dropBelow ? 'ag-row-drag-target-below' : 'ag-row-drag-target-above';

        // Store the drop target info for use in onRowDragEnd
        dropTargetRef.current = { nodeId: targetNodeId, dropBelow };

        // Add class to ALL matching row elements
        rowElements.forEach(el => {
          el.classList.add(className);
        });
      }
    }
  }, [isDragging, channelPlaylists, rowData, flattenedRows]);

  const onRowDragLeave = useCallback((_event: any) => {
    // Clean up any drag indicator classes from ALL row elements
    document.querySelectorAll('.ag-row-drag-target-above, .ag-row-drag-target-below').forEach(el => {
      el.classList.remove('ag-row-drag-target-above', 'ag-row-drag-target-below');
    });
  }, []);

  // Updated onRowDragEnd to support multi-drag
  const onRowDragEnd = useCallback((event: any) => {
    const { node, overNode } = event;

    // Clean up drag indicator classes from ALL row elements
    document.querySelectorAll('.ag-row-drag-target-above, .ag-row-drag-target-below').forEach(el => {
      el.classList.remove('ag-row-drag-target-above', 'ag-row-drag-target-below');
    });

    // Get the drop target info from the ref (set during onRowDragMove)
    const dropTargetInfo = dropTargetRef.current;
    dropTargetRef.current = null; // Clear the ref

    // Guard against duplicate drag end events (AG-Grid v34 can fire multiple times)
    if (dragInProgressRef.current) {
      setIsDragging(false);
      return;
    }
    dragInProgressRef.current = true;

    // Reset the guard after a delay
    setTimeout(() => {
      dragInProgressRef.current = false;
    }, 500);

    if (!overNode) {
      setIsDragging(false);
      return;
    }

    // Check if this is a multi-drag operation
    const isMultiDrag = selectedNodes.length > 1 && selectedNodes.some(n => n.id === node.data.id);

    // Validate drop location for either single node or all selected nodes
    if (isMultiDrag) {
      if (!isValidDrop(node, overNode, selectedNodes)) {
        setSnackbarMessage("Cannot move these items to the selected location");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsDragging(false);
        return;
      }
    } else if (!isValidDrop(node, overNode)) {
      setIsDragging(false);
      return;
    }
    
    setLastOperation({ type: 'drag', timestamp: Date.now() });
    
    // Capture properties needed for the drag operation
    let nodesToDrag: TreeNode[] = [];
    let intermediateData = [...rowData];
    let nodeIds: string[] = [];
    
    if (isMultiDrag) {
      // Filter out nodes that can't be dragged to the target
      const draggableNodes = selectedNodes.filter(n => {
        const canDrag = !isDescendantOf(rowData, overNode.data.id, n.id);
        return canDrag;
      });
      
      if (draggableNodes.length === 0) {
        setSnackbarMessage("Cannot move these items to their own descendants");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsDragging(false);
        return;
      }
      
      // Get original parent IDs for each node
      // (use channelPlaylists which has parent_id for playlists and buckets)
      const originalParentMap = new Map<string, string | null>();
      draggableNodes.forEach(n => {
        const originalParentId = channelPlaylists.find(item => item.id === n.id)?.parent_id || null;
        originalParentMap.set(n.id, originalParentId);
      });
      
      nodeIds = draggableNodes.map(n => n.id);
      
      // Remove all selected nodes from the tree
      const [removedNodes, remainingNodes] = findAndRemoveNodes(intermediateData, nodeIds);
      nodesToDrag = removedNodes;
      intermediateData = remainingNodes;
      
      if (nodesToDrag.length === 0) {
        setIsDragging(false);
        return;
      }
      
      // Sort nodes to maintain their relative order
      nodesToDrag.sort((a, b) => {
        const aIndex = flattenedRows.findIndex(row => row.id === a.id);
        const bIndex = flattenedRows.findIndex(row => row.id === b.id);
        return aIndex - bIndex;
      });
      
      // Perform the drag operation based on the type of the nodes
      const commonType = nodesToDrag[0].type;
      let finalData: TreeNode[] = [];
      let updatePromises: Promise<any>[] = [];

      // Use drop direction from the visual indicator (more accurate than index calculation)
      const dropBelow = dropTargetInfo?.dropBelow ?? (flattenedRows.findIndex(row => row.id === node.data.id) < flattenedRows.findIndex(row => row.id === overNode.data.id));
      
      if (commonType === 'channel') {
        // Multi-channel reordering
        // Find the target channel - if overNode is not a channel, find its root ancestor
        let targetChannelId = overNode.data.id;
        if (overNode.data.type !== 'channel') {
          // Find the root channel for this node by traversing up
          let currentId = overNode.data.id;
          let parent = findParentNode(intermediateData, currentId);
          while (parent) {
            if (parent.type === 'channel') {
              targetChannelId = parent.id;
              break;
            }
            currentId = parent.id;
            parent = findParentNode(intermediateData, currentId);
          }
        }

        let targetIndex = intermediateData.findIndex(n => n.id === targetChannelId);
        if (targetIndex === -1) {
          setIsDragging(false);
          return;
        }
        // When hovering over children, always place after the parent channel
        if (overNode.data.type !== 'channel' || dropBelow) {
          targetIndex++;
        }
        
        // Insert all channels at the target position
        finalData = [
          ...intermediateData.slice(0, targetIndex),
          ...nodesToDrag,
          ...intermediateData.slice(targetIndex)
        ];
        
        // Update order of all channels in database
        finalData.forEach((channel, index) => {
          updatePromises.push(
            updateChannelPlaylist(channel.id, {
              parent_id: undefined,
              order: index
            }).catch(err => {
              console.error(err);
              return { error: true };
            })
          );
        });
      } else if (commonType === 'playlist') {
        // Multi-playlist reordering - always as siblings when dropped on another playlist
        let targetChannelId: string | null = null;
        let targetIndex = -1;
        
        if (overNode.data.type === 'channel') {
          targetChannelId = overNode.data.id;
        } else if (overNode.data.type === 'playlist') {
          // When dropping on a playlist, find its parent channel
          const parent = findParentNode(rowData, overNode.data.id);
          if (parent && parent.type === 'channel') {
            targetChannelId = parent.id;
          }
        }
        
        if (!targetChannelId) {
          setIsDragging(false);
          return;
        }
        
        const targetChannel = intermediateData.find(ch => ch.id === targetChannelId);
        if (!targetChannel) {
          setIsDragging(false);
          return;
        }
        
        let children = targetChannel.children ? [...targetChannel.children] : [];
        
        // Determine insertion position
        if (overNode.data.type === 'channel') {
          targetIndex = children.length; // Add at end when dropped on channel
        } else {
          // When dropped on a playlist, insert after it
          targetIndex = children.findIndex(child => child.id === overNode.data.id);
          if (targetIndex === -1) {
            targetIndex = children.length;
          } else if (dropBelow) {
            targetIndex++;
          }
        }
        
        // For each node, check if we need to rename it for the target parent
        const processedNodes: TreeNode[] = [];
        
        for (const draggedNode of nodesToDrag) {
          const originalParentId = originalParentMap.get(draggedNode.id);
          const sameParent = originalParentId === targetChannelId;
          
          // Choose name - keep original if same parent, get unique name if different
          let finalNodeName;
          if (sameParent) {
            finalNodeName = draggedNode.name;
          } else {
            // When creating unique names, exclude nodes we've already processed
            const existingPlusProcessed = [...children, ...processedNodes];
            finalNodeName = getUniqueNameInLevel(draggedNode.name, existingPlusProcessed);
          }
          
          // Update node with possibly new name
          const draggedNodeCopy = { ...draggedNode, name: finalNodeName };
          processedNodes.push(draggedNodeCopy);
          
          // Queue update in database
          updatePromises.push(
            updateChannelPlaylist(draggedNode.id, {
              parent_id: targetChannelId,
              name: finalNodeName,
              order: targetIndex + processedNodes.length - 1
            }).catch(err => {
              console.error(err);
              return { error: true };
            })
          );
        }
        
        // Insert all playlists at the target position
        children = [
          ...children.slice(0, targetIndex),
          ...processedNodes,
          ...children.slice(targetIndex)
        ];
        
        // Update order of all children
        children.forEach((playlist, index) => {
          if (!processedNodes.some(n => n.id === playlist.id)) {
            updatePromises.push(
              updateChannelPlaylist(playlist.id, { order: index })
                .catch(err => {
                  console.error(err);
                  return { error: true };
                })
            );
          }
        });
        
        finalData = intermediateData.map(ch => {
          if (ch.id === targetChannelId) {
            return { ...ch, children };
          }
          return ch;
        });
      } else if (commonType === 'bucket') {
        // Multi-bucket reordering
        let targetPlaylistId: string | null = null;
        let targetIndex = -1;
        
        if (overNode.data.type === 'playlist') {
          targetPlaylistId = overNode.data.id;
        } else if (overNode.data.type === 'bucket') {
          const parent = findParentNode(rowData, overNode.data.id);
          if (parent && parent.type === 'playlist') {
            targetPlaylistId = parent.id;
          }
        }
        
        if (!targetPlaylistId) {
          setIsDragging(false);
          return;
        }
        
        const bucketUpdatePromises: Promise<any>[] = [];
        
        // Helper function to find the playlist and update its children
        const updatePlaylistWithBuckets = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map(n => {
            if (n.id === targetPlaylistId && n.type === 'playlist') {
              let children = n.children ? [...n.children] : [];
              
              if (overNode.data.type === 'playlist') {
                targetIndex = children.length;
              } else {
                targetIndex = children.findIndex(child => child.id === overNode.data.id);
                if (targetIndex === -1) {
                  targetIndex = children.length;
                } else if (dropBelow) {
                  targetIndex++;
                }
              }
              
              // Process each bucket for insertion
              const processedNodes: TreeNode[] = [];
              
              for (const draggedNode of nodesToDrag) {
                const originalParentId = originalParentMap.get(draggedNode.id);
                const sameParent = originalParentId === targetPlaylistId;
                
                // Choose name - keep original if same parent, get unique name if different
                let finalNodeName;
                if (sameParent) {
                  finalNodeName = draggedNode.name;
                } else {
                  // When creating unique names, exclude nodes we've already processed
                  const existingPlusProcessed = [...children, ...processedNodes];
                  finalNodeName = getUniqueNameInLevel(draggedNode.name, existingPlusProcessed);
                }
                
                // Update node with possibly new name
                const draggedNodeCopy = { ...draggedNode, name: finalNodeName };
                processedNodes.push(draggedNodeCopy);
                
                // Queue update in database
                bucketUpdatePromises.push(
                  updateChannelPlaylist(draggedNode.id, {
                    parent_id: targetPlaylistId,
                    name: finalNodeName,
                    order: targetIndex + processedNodes.length - 1
                  }).catch(err => {
                    console.error(err);
                    return { error: true };
                  })
                );
              }
              
              // Insert all buckets at the target position
              const newChildren = [
                ...children.slice(0, targetIndex),
                ...processedNodes,
                ...children.slice(targetIndex)
              ];
              
              // Update order of all children that weren't part of the drag
              newChildren.forEach((bucket, index) => {
                if (!processedNodes.some(n => n.id === bucket.id)) {
                  bucketUpdatePromises.push(
                    updateChannelPlaylist(bucket.id, { order: index })
                      .catch(err => {
                        console.error(err);
                        return { error: true };
                      })
                  );
                }
              });
              
              return { ...n, children: newChildren };
            } else if (n.children) {
              return { ...n, children: updatePlaylistWithBuckets(n.children) };
            }
            return n;
          });
        };
        
        finalData = updatePlaylistWithBuckets(intermediateData);
        updatePromises = bucketUpdatePromises;
      }
      
      // Update the UI
      setRowData(finalData);
      const updatedFlattenedRows = getRows(finalData);
      gridRef.current.api.applyTransaction({ update: updatedFlattenedRows });
      
      // Execute all database updates
      Promise.all(updatePromises).then((results) => {
        const failedUpdates = results.filter(res => res && res.error);
        if (failedUpdates.length > 0) {
          setSnackbarMessage("Some items failed to update. Refreshing data...");
          setSnackbarSeverity("warning");
          setSnackbarOpen(true);
          refreshChannelsIfNeeded(finalData);
        } else {
          setSnackbarMessage(`Successfully moved ${nodesToDrag.length} items`);
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }
      }).catch(error => {
        console.error('Error updating database:', error);
        setSnackbarMessage("Failed to update items. Refreshing data...");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        refreshChannelsIfNeeded();
      });
    } else {
      // Original single-node drag logic
      // Capture original properties of the node being dragged
      const originalNodeData = node.data;
      const originalNodeId = originalNodeData.id;
      const originalNodeName = originalNodeData.name;
      
      // Find original parent ID directly from the flat channelPlaylists structure
      // (channels don't have parent_id, but playlists and buckets in channelPlaylists do)
      const originalParentId = channelPlaylists.find(item => item.id === originalNodeId)?.parent_id || null;
      
      // Remove the dragged node from the tree.
      const [draggedNode, intermediateData] = findAndRemoveNode(rowData, node.data.id);
      if (!draggedNode) {
        setIsDragging(false);
        return;
      }

      // Use drop direction from the visual indicator (more accurate than index calculation)
      const dropBelow = dropTargetInfo?.dropBelow ?? (flattenedRows.findIndex(row => row.id === node.data.id) < flattenedRows.findIndex(row => row.id === overNode.data.id));
    
      let finalData: TreeNode[] = [];
      let updatePromises: Promise<any>[] = [];

      if (draggedNode.type === 'channel') {
        // Channel reordering logic - parent is always null
        // Find the target channel - if overNode is not a channel, find its root ancestor
        let targetChannelId = overNode.data.id;
        if (overNode.data.type !== 'channel') {
          // Find the root channel for this node by traversing up
          let currentId = overNode.data.id;
          let parent = findParentNode(intermediateData, currentId);
          while (parent) {
            if (parent.type === 'channel') {
              targetChannelId = parent.id;
              break;
            }
            currentId = parent.id;
            parent = findParentNode(intermediateData, currentId);
          }
        }

        let targetIndex = intermediateData.findIndex(n => n.id === targetChannelId);
        if (targetIndex === -1) {
          setIsDragging(false);
          return;
        }
        // When hovering over children, always place after the parent channel
        if (overNode.data.type !== 'channel' || dropBelow) {
          targetIndex++;
        }
    
        finalData = [
          ...intermediateData.slice(0, targetIndex),
          draggedNode,
          ...intermediateData.slice(targetIndex)
        ];
    
        // Always use originalNodeName for channel since it's a top-level reordering
        updatePromises.push(
          updateChannelPlaylist(draggedNode.id, {
            parent_id: undefined,
            name: originalNodeName, // Always use original name for same-level moves
            order: targetIndex
          }).catch(err => {
            console.error(err);
            return { error: true };
          })
        );
    
        // Update order of other channels.
        finalData.forEach((channel, index) => {
          if (channel.id !== draggedNode.id) {
            updatePromises.push(
              updateChannelPlaylist(channel.id, { order: index })
                .catch(err => {
                  console.error(err);
                  return { error: true };
                })
            );
          }
        });
    
      } else if (draggedNode.type === 'playlist') {
        // Playlist reordering logic - always as siblings
        let targetChannelId: string | null = null;
        let targetIndex = -1;

        if (overNode.data.type === 'channel') {
          targetChannelId = overNode.data.id;
        } else if (overNode.data.type === 'playlist') {
          // When dropping on a playlist, treat as sibling
          const parent = findParentNode(rowData, overNode.data.id);
          if (parent && parent.type === 'channel') {
            targetChannelId = parent.id;
          }
        } else if (overNode.data.type === 'bucket') {
          // When dropping on a bucket, find its parent playlist, then the channel
          const parentPlaylist = findParentNode(rowData, overNode.data.id);
          if (parentPlaylist && parentPlaylist.type === 'playlist') {
            const parentChannel = findParentNode(rowData, parentPlaylist.id);
            if (parentChannel && parentChannel.type === 'channel') {
              targetChannelId = parentChannel.id;
            }
          }
        }

        // EDGE CASE FIX: If dropping on a different channel,
        // the user likely intended to drop at the END of their original channel.
        // This can happen when:
        // 1. overNode is a channel (AG Grid reports next sibling channel) - regardless of dropBelow
        // 2. overNode is a playlist/bucket in the next channel with dropBelow=false
        if (targetChannelId !== originalParentId) {
          // Check if the original channel is immediately before the target channel in the tree
          const targetChannelIndex = intermediateData.findIndex(ch => ch.id === targetChannelId);
          const originalChannelIndex = intermediateData.findIndex(ch => ch.id === originalParentId);

          // If original channel is immediately before target channel, keep in original channel
          // For channels: always redirect (user can't drop playlist into another channel row)
          // For playlists/buckets: only redirect if dropBelow is false (dropping "above")
          const shouldRedirect = overNode.data.type === 'channel'
            ? true  // Always redirect when hovering over the next channel
            : !dropBelow;  // Only redirect when dropping "above" a playlist/bucket

          if (shouldRedirect && originalChannelIndex >= 0 && targetChannelIndex >= 0 && originalChannelIndex === targetChannelIndex - 1) {
            targetChannelId = originalParentId;
          }
        }

        if (!targetChannelId) {
          setIsDragging(false);
          return;
        }

        const targetChannel = intermediateData.find(ch => ch.id === targetChannelId);
        if (!targetChannel) {
          setIsDragging(false);
          return;
        }

        // Check if we're moving within the same parent
        const sameParent = originalParentId === targetChannelId;
        
        let children = targetChannel.children ? [...targetChannel.children] : [];
        
        if (overNode.data.type === 'channel') {
          targetIndex = children.length;
        } else {
          // Insert after the target playlist
          targetIndex = children.findIndex(child => child.id === overNode.data.id);
          if (targetIndex === -1) {
            targetIndex = children.length;
          } else if (dropBelow) {
            targetIndex++;
          }
        }
        
        // If same parent, remove from original position
        if (sameParent) {
          const originalIndex = children.findIndex(child => child.id === draggedNode.id);
          if (originalIndex !== -1) {
            if (originalIndex < targetIndex) {
              targetIndex--;
            }
            children = children.filter(child => child.id !== draggedNode.id);
          }
        }
        
        // Choose the right name - original if same parent, unique if different
        const finalNodeName = sameParent 
          ? originalNodeName 
          : getUniqueNameInLevel(originalNodeName, children);
        
        // Update the dragged node with the clone and the correct name
        const draggedNodeCopy = { ...draggedNode, name: finalNodeName };
        
        children = [
          ...children.slice(0, targetIndex),
          draggedNodeCopy,
          ...children.slice(targetIndex)
        ];
    
        updatePromises.push(
          updateChannelPlaylist(draggedNode.id, {
            parent_id: targetChannelId,
            name: finalNodeName,
            order: targetIndex
          }).catch(err => {
            console.error(err);
            return { error: true };
          })
        );
        
        children.forEach((playlist, index) => {
          if (playlist.id !== draggedNode.id) {
            updatePromises.push(
              updateChannelPlaylist(playlist.id, { order: index })
                .catch(err => {
                  console.error(err);
                  return { error: true };
                })
            );
          }
        });
    
        finalData = intermediateData.map(ch => {
          if (ch.id === targetChannelId) {
            return { ...ch, children };
          }
          return ch;
        });
    
      } else if (draggedNode.type === 'bucket') {
        // Bucket reordering logic.
        let targetPlaylistId: string | null = null;
        let targetIndex = -1;

        if (overNode.data.type === 'playlist') {
          targetPlaylistId = overNode.data.id;
        } else if (overNode.data.type === 'bucket') {
          const parent = findParentNode(rowData, overNode.data.id);
          if (parent && parent.type === 'playlist') {
            targetPlaylistId = parent.id;
          }
        } else if (overNode.data.type === 'channel') {
          // When dropping on a channel, this happens when dragging a bucket to the end of its playlist
          // and the next visible item is the next channel. We should keep it in the original playlist.
          // The edge case logic below will handle this by checking if original parent is adjacent.
          // For now, set targetPlaylistId to the last playlist of the previous channel (which is originalParentId).
          targetPlaylistId = originalParentId;
        }

        // EDGE CASE FIX: If dropping "above" in a different playlist,
        // the user likely intended to drop at the END of their original playlist.
        // This can happen in three scenarios:
        // 1. overNode is a bucket in the next playlist (AG Grid reports first bucket of next playlist)
        // 2. overNode is the next playlist itself (when next playlist is collapsed or empty)
        // 3. overNode is a channel (handled above by setting targetPlaylistId = originalParentId)
        if (!dropBelow && targetPlaylistId && targetPlaylistId !== originalParentId) {
          // Find parent channels for both playlists
          const targetParentChannel = findParentNode(rowData, targetPlaylistId);
          const originalParentChannel = originalParentId ? findParentNode(rowData, originalParentId) : null;

          if (targetParentChannel && originalParentChannel) {
            if (targetParentChannel.id === originalParentChannel.id) {
              // Same channel - check if original playlist is immediately before target playlist
              const targetPlaylistIndex = targetParentChannel.children?.findIndex(p => p.id === targetPlaylistId) ?? -1;
              const originalPlaylistIndex = targetParentChannel.children?.findIndex(p => p.id === originalParentId) ?? -1;

              if (originalPlaylistIndex >= 0 && targetPlaylistIndex >= 0 && originalPlaylistIndex === targetPlaylistIndex - 1) {
                targetPlaylistId = originalParentId;
              }
            } else {
              // Different channels - check if original channel is immediately before target channel
              const targetChannelIndex = intermediateData.findIndex(ch => ch.id === targetParentChannel.id);
              const originalChannelIndex = intermediateData.findIndex(ch => ch.id === originalParentChannel.id);

              // If original channel is immediately before target channel, keep in original playlist
              if (originalChannelIndex >= 0 && targetChannelIndex >= 0 && originalChannelIndex === targetChannelIndex - 1) {
                targetPlaylistId = originalParentId;
              }
            }
          }
        }

        if (!targetPlaylistId) {
          setIsDragging(false);
          return;
        }

        // Check if we're moving within the same parent
        const sameParent = originalParentId === targetPlaylistId;
        
        const bucketUpdatePromises: Promise<any>[] = [];
        
        const updatePlaylistChildren = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map(n => {
            if (n.id === targetPlaylistId && n.type === 'playlist') {
              let children = n.children ? [...n.children] : [];
              
              targetIndex = children.findIndex(child => child.id === overNode.data.id);
              if (targetIndex === -1) {
                targetIndex = children.length;
              } else if (dropBelow) {
                targetIndex++;
              }
              
              // If same parent, remove from original position
              if (sameParent) {
                const originalIndex = children.findIndex(child => child.id === draggedNode.id);
                if (originalIndex !== -1) {
                  if (originalIndex < targetIndex) {
                    targetIndex--;
                  }
                  children = children.filter(child => child.id !== draggedNode.id);
                }
              }
              
              // Choose the right name - original if same parent, unique if different
              const finalNodeName = sameParent 
                ? originalNodeName 
                : getUniqueNameInLevel(originalNodeName, children);
                
              // Create a copy with the right name
              const draggedNodeCopy = { ...draggedNode, name: finalNodeName };
              
              const newChildren = [
                ...children.slice(0, targetIndex),
                draggedNodeCopy,
                ...children.slice(targetIndex)
              ];
              
              bucketUpdatePromises.push(
                updateChannelPlaylist(draggedNode.id, {
                  parent_id: targetPlaylistId,
                  name: finalNodeName, // Use the determined name
                  order: targetIndex
                }).catch(err => {
                  console.error(err);
                  return { error: true };
                })
              );
              
              newChildren.forEach((bucket, index) => {
                if (bucket.id !== draggedNode.id) {
                  bucketUpdatePromises.push(
                    updateChannelPlaylist(bucket.id, { order: index })
                      .catch(err => {
                        console.error(err);
                        return { error: true };
                      })
                  );
                }
              });
              
              return { ...n, children: newChildren };
            } else if (n.children) {
              return { ...n, children: updatePlaylistChildren(n.children) };
            }
            return n;
          });
        };
        
        finalData = updatePlaylistChildren(intermediateData);
        updatePromises = bucketUpdatePromises;
      }
    
      // Update grid using applyTransaction for minimal visual updates
      const flattenedFinalRows = getRows(finalData);
      if (gridRef.current?.api) {
        // Use applyTransaction to update only changed rows
        gridRef.current.api.applyTransaction({ update: flattenedFinalRows });
      }

      // Execute all database updates
      Promise.all(updatePromises).then((results) => {
        const failedUpdates = results.filter(res => res && res.error);
        if (failedUpdates.length > 0) {
          refreshChannelsIfNeeded(finalData);
        } else {
          // Only update React state after successful DB update to avoid flicker
          setRowData(finalData);
        }
      }).catch(error => {
        console.error('Error updating database:', error);
        refreshChannelsIfNeeded();
      });
    }

    // Reset dragging state after a delay
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  }, [lastOperation, isDragging, flattenedRows, isValidDrop, rowData, updateChannelPlaylist, refreshChannelsIfNeeded, channelPlaylists, selectedNodes]);

  // Disabled double-click handler - using hover edit icon instead
  // const onCellDoubleClicked = useCallback((params: any) => {
  //   const { colDef, data, event, node } = params;

  //   // Skip if we had a recent operation
  //   const now = Date.now();
  //   if (lastOperation && now - lastOperation.timestamp < 500) {
  //     return;
  //   }

  //   // Handle name column double-click
  //   if (colDef.field === 'name' || colDef.field === "carousel_type") {
  //     // Store the current expanded state before opening dialog
  //     const wasExpanded = node?.expanded;

  //     // Prevent default behavior and stop event propagation to avoid expanding/collapsing the row
  //     if (event) {
  //       event.preventDefault();
  //       event.stopPropagation();
  //     }

  //     setLastOperation({ type: 'editDialog', timestamp: now });

  //     if (data.type === 'channel') {
  //       // Open dialog to switch to a different channel
  //       // Cannot edit channel properties here - must use Channels page for that
  //       setEditingChannel(data);
  //       refreshChannelsAndPlaylists().then(() => {
  //         setAddChannelDialogOpen(true);
  //       });
  //     } else if (data.type === 'playlist') {
  //       // Find parent channel for context
  //       let parentChannel = findParentNode(rowData, data.id);
  //       while (parentChannel && parentChannel.type !== 'channel') {
  //         parentChannel = findParentNode(rowData, parentChannel.id);
  //       }

  //       if (parentChannel) {
  //         setTargetChannel({ id: parentChannel.id, name: parentChannel.name, channel_id: parentChannel.channel_id });
  //         setEditingPlaylist(data);
  //         setPlaylistDialogOpen(true);
  //       }
  //     } else if (data.type === 'bucket') {
  //       // Find parent playlist
  //       const parentPlaylist = findParentNode(rowData, data.id);
  //       if (parentPlaylist && parentPlaylist.type === 'playlist') {
  //         setEditingBucketInstance(data);
  //         setTargetPlaylistId(parentPlaylist.id);
  //         setBucketSelectorOpen(true);
  //       }
  //     }

  //     // Restore the expanded state using requestAnimationFrame to ensure it runs after AG Grid's expand/collapse handler
  //     requestAnimationFrame(() => {
  //       if (node && node.expanded !== wasExpanded) {
  //         node.setExpanded(wasExpanded);
  //       }
  //     });
  //   }

  //   // Note: Schedule column double-click is already handled by ScheduleCellRenderer
  // }, [lastOperation, rowData]);

  const onCellValueChanged = useCallback((event: any) => {
    const { data, colDef, newValue } = event;
    
    // Skip if we had a recent operation
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    
    setLastOperation({ type: 'cellChange', timestamp: now });
    
    // Update database
    updateChannelPlaylist(data.id, { [colDef.field]: newValue })
      .catch(error => {
        console.error('Failed to update channel:', error);
        // Revert the change in the grid
        if (gridRef.current?.api) {
          gridRef.current.api.applyTransaction({
            update: [{ ...data, [colDef.field]: data[colDef.field] }]
          });
        }
      });

    const updatedData = updateTreeNode(rowData, data.id, (node) => {
      if (colDef.field === 'name') {
        const parent = node.type === 'channel' ? null : findParentNode(rowData, node.id);
        const siblings = parent ? parent.children || [] : rowData;
        const otherSiblings = siblings.filter(sibling => sibling.id !== node.id);
        const uniqueName = getUniqueNameInLevel(newValue, otherSiblings);
        return { ...node, name: uniqueName };
      }
      return { ...node, [colDef.field]: newValue };
    });

    maintainSelection(updatedData);

    if (colDef.field === 'name') {
      const parent = data.type === 'channel' ? null : findParentNode(rowData, data.id);
      const siblings = parent ? parent.children || [] : rowData;
      const otherSiblings = siblings.filter(sibling => sibling.id !== data.id);
      const uniqueName = getUniqueNameInLevel(newValue, otherSiblings);
      if (uniqueName !== newValue && gridRef.current?.api) {
        gridRef.current.api.applyTransaction({
          update: [{ ...data, name: uniqueName }]
        });
      }
    }
  }, [rowData, maintainSelection, lastOperation, updateChannelPlaylist]);

  const onRowGroupOpened = useCallback((event: any) => {
    const { node } = event;
    if (!node.data || !node.data.id) return;

    // Use toggleRowExpanded from context for persistence
    toggleRowExpanded(node.data.id, node.expanded);
  }, [toggleRowExpanded]);

  // Restore expanded rows whenever the grid data changes
  useEffect(() => {
    if (gridRef.current?.api) {
      restoreExpandedState();
    }
  }, [rowData, restoreExpandedState]);

  // Track if we've already restored column state (to avoid re-applying on every render)
  const columnStateRestoredRef = useRef(false);

  // Save column state when columns are resized, moved, or visibility changes
  const saveColumnState = useCallback(() => {
    if (gridRef.current?.api) {
      const state = gridRef.current.api.getColumnState();
      setColumnState(state);
    }
  }, [setColumnState]);

  const onGridReady = useCallback(() => {
    if (gridRef.current?.api) {
      // Only size to fit if no saved column state is available yet
      if (!isGridStateLoaded) {
        gridRef.current.api.sizeColumnsToFit();
      } else if (columnState && columnState.length > 0) {
        gridRef.current.api.applyColumnState({ state: columnState, applyOrder: true });
        columnStateRestoredRef.current = true;
      } else {
        gridRef.current.api.sizeColumnsToFit();
      }
      restoreExpandedState();

      // Register this grid for cross-grid drag and drop
      setChannelPlaylistsGrid(gridRef.current.api, containerRef.current);
    }
  }, [restoreExpandedState, setChannelPlaylistsGrid, columnState, isGridStateLoaded]);

  // Restore column state when it becomes available (handles async loading from DB)
  useEffect(() => {
    if (isGridStateLoaded && columnState && columnState.length > 0 && gridRef.current?.api && !columnStateRestoredRef.current) {
      gridRef.current.api.applyColumnState({ state: columnState, applyOrder: true });
      columnStateRestoredRef.current = true;
    }
  }, [isGridStateLoaded, columnState]);

  const addChannel = useCallback(() => {
    // Skip if we had a recent operation
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    
    setLastOperation({ type: 'addChannel', timestamp: now });

    // Clear any editing state and refresh channels before opening dialog
    setEditingChannel(null);
    refreshChannelsAndPlaylists().then(() => {
      // Open the new add channel dialog
      setAddChannelDialogOpen(true);
    });
  }, [lastOperation, refreshChannelsAndPlaylists]);

  const addPlaylist = useCallback(() => {
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    setLastOperation({ type: 'addPlaylist', timestamp: now });
    
    // Only allow adding playlists when a channel or playlist is selected
    if (!selectedNode || (selectedNode.type !== 'channel' && selectedNode.type !== 'playlist')) {
      setSnackbarMessage("Please select a channel or playlist to add a playlist to");
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }
  
    // Determine parent channel
    let channel;
    if (selectedNode.type === 'playlist') {
      // Find the parent channel of the selected playlist
      channel = findParentNode(rowData, selectedNode.id);
      while (channel && channel.type !== 'channel') {
        channel = findParentNode(rowData, channel.id);
      }
    } else {
      channel = selectedNode;
    }
    
    if (!channel) {
      console.error('Could not find parent channel');
      return;
    }
  
    // Set the target channel and open dialog
    setTargetChannel({ id: channel.id, name: channel.name });
    setPlaylistDialogOpen(true);
  }, [selectedNode, rowData, lastOperation]);
  
  // Updated addBucket function for ChannelsPage.tsx to work with duplicate buckets  
  const addBucket = useCallback(() => {
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    setLastOperation({ type: 'addBucket', timestamp: now });
    
    // Only allow adding buckets when a playlist or bucket is selected.
    if (!selectedNode || (selectedNode.type !== 'playlist' && selectedNode.type !== 'bucket')) {
      setSnackbarMessage("Please select a playlist to add buckets to");
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }
  
    // Determine parent playlist
    let parentPlaylist;
    let parentId;
    
    if (selectedNode.type === 'bucket') {
      parentPlaylist = findParentNode(rowData, selectedNode.id);
      parentId = parentPlaylist?.id;
    } else {
      parentPlaylist = selectedNode;
      parentId = selectedNode.id;
    }
    
    if (!parentId || !parentPlaylist) {
      console.error('Could not find parent playlist');
      return;
    }

    // Get existing buckets for reference, but we'll still allow duplicates
    const getExistingBucketContentIds = (playlistNode: TreeNode): string[] => {
      if (!playlistNode.children) return [];

      return playlistNode.children
        .filter(child => child.type === 'bucket' && child.content_id)
        .map(bucket => bucket.content_id as string);
    };

    // Find the playlist and get its existing bucket content_ids - just for reference
      
    // @ts-ignore: Unused for future functionality
    const _existingContentIds = getExistingBucketContentIds(parentPlaylist);
    
    // Save the target playlist ID and open the selector
    setTargetPlaylistId(parentId);
    setBucketSelectorOpen(true);
    
  }, [selectedNode, lastOperation, rowData, findParentNode]);

  const createUniqueBucketName = (baseName: string, siblings: TreeNode[]): string => {
    // Check if base name is already used
    const hasExactMatch = siblings ? siblings.some(node => node.name === baseName) : false;
    
    // If the name isn't already used, return it as is
    if (!hasExactMatch) {
      return baseName;
    }
    
    // Clean up base name by removing any existing numbering
    let cleanBaseName = baseName;
    const parenthesesMatch = baseName.match(/^(.*?)\s*\(\d+\)$/);
    if (parenthesesMatch) {
      cleanBaseName = parenthesesMatch[1];
    }
    
    // Find existing instances with numbering
    const regex = new RegExp(`^${cleanBaseName}\\s*\\((\\d+)\\)$`);
    
    const numbers = siblings
      .map(node => {
        const match = node.name.match(regex);
        if (match && match[1]) {
          return parseInt(match[1], 10);
        }
        return null;
      })
      .filter(num => num !== null) as number[];
    
    // Count the base name without number as instance #1
    if (siblings.some(node => node.name === cleanBaseName)) {
      numbers.push(1);
    }
    
    // Get the highest number
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    
    // Next available number is one higher
    const nextNumber = maxNumber + 1;
    
    // Return with parentheses format
    return `${cleanBaseName} (${nextNumber})`;
  };

  // Updated handler function for ChannelsPage.tsx that allows adding duplicate buckets
  const handleAddSelectedBuckets = async (selectedBuckets: any, parentPlaylistId: any) => {
    if (!parentPlaylistId || selectedBuckets.length === 0) return;

    try {
      // Check if we're editing an existing bucket instance
      if (editingBucketInstance) {
        // Replace mode: update the existing bucket instance to point to the new bucket
        const newBucket = selectedBuckets[0]; // Only use first selected bucket in edit mode

        await updateChannelPlaylist(editingBucketInstance.id, {
          content_id: newBucket.id,
          name: newBucket.name // Update name to match the new bucket
        });

        setSnackbarMessage('Bucket changed successfully');
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        // Clear editing state
        setEditingBucketInstance(null);
      } else {
        // Add mode: create new bucket instances
        // Find the parent playlist
        let parentPlaylist;
        const findPlaylist = (nodes: TreeNode[], id: string): TreeNode | null => {
          for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
              const found = findPlaylist(node.children, id);
              if (found) return found;
            }
          }
          return null;
        };

        parentPlaylist = findPlaylist(rowData, parentPlaylistId);
        if (!parentPlaylist) {
          throw new Error('Parent playlist not found');
        }

        // Get the highest order value in the parent's children
        const maxOrder = parentPlaylist.children
          ? Math.max(...parentPlaylist.children.map(child => child.order || 0), -1)
          : -1;

        // Create bucket entries in channels table for each selected bucket
        const addPromises = selectedBuckets.map((bucket: any, index: number) => {
          // Create a unique name for this bucket instance
          const uniqueName = createUniqueBucketName(
            bucket.name,
            parentPlaylist.children || []
          );

          return createChannelPlaylist({
            name: uniqueName,
            active: true,
            schedule: bucket.schedule,
            type: 'bucket',
            parent_id: parentPlaylistId,
            order: maxOrder + 1 + index,
            content_id: bucket.id // Link to the content bucket ID
          });
        });

        await Promise.all(addPromises);

        // Show success message
        setSnackbarMessage(`Added ${selectedBuckets.length} bucket${selectedBuckets.length !== 1 ? 's' : ''} to playlist`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      }

      // Refresh the grid to show the changes
      refreshChannelsAndPlaylists();

    } catch (error) {
      console.error('Error with buckets:', error);
      setSnackbarMessage(`Failed to ${editingBucketInstance ? 'change' : 'add'} bucket${selectedBuckets.length > 1 ? 's' : ''}. Please try again.`);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  // Handler for buckets dropped from ContentPage via cross-grid drag
  const handleExternalBucketDrop = useCallback(async (buckets: DraggedBucket[], targetPlaylistId: string) => {
    if (!targetPlaylistId || buckets.length === 0) return;

    try {
      // Find the parent playlist
      const findPlaylist = (nodes: TreeNode[], id: string): TreeNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findPlaylist(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const parentPlaylist = findPlaylist(rowData, targetPlaylistId);
      if (!parentPlaylist) {
        throw new Error('Parent playlist not found');
      }

      // Get the highest order value in the parent's children
      const maxOrder = parentPlaylist.children
        ? Math.max(...parentPlaylist.children.map(child => child.order || 0), -1)
        : -1;

      // Create bucket entries for each dropped bucket
      const addPromises = buckets.map((bucket, index) => {
        // Create a unique name for this bucket instance
        const uniqueName = createUniqueBucketName(
          bucket.name,
          parentPlaylist.children || []
        );

        return createChannelPlaylist({
          name: uniqueName,
          active: true,
          schedule: bucket.schedule,
          type: 'bucket',
          parent_id: targetPlaylistId,
          order: maxOrder + 1 + index,
          content_id: bucket.id
        });
      });

      await Promise.all(addPromises);

      // Show success message
      setSnackbarMessage(`Added ${buckets.length} bucket${buckets.length !== 1 ? 's' : ''} from Content`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      // Refresh the grid to show the changes
      refreshChannelsAndPlaylists();

    } catch (error) {
      console.error('Error adding buckets from Content:', error);
      setSnackbarMessage('Failed to add buckets. Please try again.');
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [rowData, createChannelPlaylist, refreshChannelsAndPlaylists, createUniqueBucketName]);

  // Register the bucket drop handler with the context
  useEffect(() => {
    setBucketDropHandler(handleExternalBucketDrop);
    return () => {
      setBucketDropHandler(null);
    };
  }, [handleExternalBucketDrop, setBucketDropHandler]);

  // Delete selected nodes

  // @ts-ignore: Unused for future functionality
  const _deleteSelected = useCallback(() => {
    if (!selectedNodes.length) return;
    
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    setLastOperation({ type: 'delete', timestamp: now });
    
    // Filter out nodes that are descendants of other selected nodes
    // (no need to delete them separately as they'll be deleted with their parent)
    const nodesToDelete = selectedNodes.filter(node => {
      return !selectedNodes.some(potentialParent => 
        potentialParent.id !== node.id && isDescendantOf(rowData, node.id, potentialParent.id)
      );
    });
    
    // Create a new tree without the deleted nodes
    let newRowData = [...rowData];

    // Function to deeply collect all node IDs including children
    const getAllNodeIds = (node: TreeNode): string[] => {
      const ids = [node.id];
      if (node.children) {
        node.children.forEach(child => {
          ids.push(...getAllNodeIds(child));
        });
      }
      return ids;
    };
    
    // Collect all IDs to delete
    const allIdsToDelete: string[] = [];

    // Delete each node and all its children
    nodesToDelete.forEach(node => {
      // Get all descendant IDs to delete
      const idsToDelete = getAllNodeIds(node);
      allIdsToDelete.push(...idsToDelete);

      // Remove node from tree
      const [_, newTree] = findAndRemoveNode(newRowData, node.id);
      newRowData = newTree;
    });

    // Update the UI immediately
    setRowData(newRowData);
    setSelectedNodes([]);
    setSelectedNode(null);

    // Execute batch delete in a single database operation
    deleteChannelPlaylistBatch(allIdsToDelete).catch(error => {
      console.error('Error during deletion:', error);
      refreshChannelsIfNeeded(newRowData);
    });
  }, [selectedNodes, rowData, lastOperation, deleteChannelPlaylistBatch, refreshChannelsIfNeeded]);

  // Get icon for node type
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'channel':
        return <TvIcon fontSize="small" />;
      case 'playlist':
        return <PlaylistAddIcon fontSize="small" />;
      case 'bucket':
        return <ShoppingBasketIcon fontSize="small" />;
      default:
        return null;
    }
  };
  
  // Prepare delete confirmation
  const prepareDelete = useCallback(() => {
    if (!selectedNodes.length) return;
    
    // Filter out nodes that are descendants of other selected nodes
    const nodesToDelete = selectedNodes.filter(node => {
      return !selectedNodes.some(potentialParent => 
        potentialParent.id !== node.id && isDescendantOf(rowData, node.id, potentialParent.id)
      );
    });
    
    // Function to deeply count all descendants
    const countDescendants = (node: TreeNode): number => {
      if (!node.children || node.children.length === 0) return 0;
      return node.children.length + node.children.reduce((acc, child) => 
        acc + countDescendants(child), 0);
    };
    
    // Add descendant count to nodes
    const nodesWithCounts = nodesToDelete.map(node => ({
      ...node,
      descendantCount: countDescendants(node)
    }));
    
    setItemsToDelete(nodesWithCounts);
    setDeleteDialogOpen(true);
  }, [selectedNodes, rowData]);
  
  // Perform actual deletion
  const confirmDelete = useCallback(() => {
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      setDeleteDialogOpen(false);
      return;
    }
    setLastOperation({ type: 'delete', timestamp: now });
    
    // Create a new tree without the deleted nodes
    let newRowData = [...rowData];
    
    // Function to deeply collect all node IDs including children
    const getAllNodeIds = (node: TreeNode): string[] => {
      const ids = [node.id];
      if (node.children) {
        node.children.forEach(child => {
          ids.push(...getAllNodeIds(child));
        });
      }
      return ids;
    };
    
    // Execute deletion operations
    const executeDeletes = async () => {
      // Collect all IDs to delete
      const allIdsToDelete: string[] = [];

      // Process each node to delete
      for (const node of itemsToDelete) {
        // Get all descendant IDs to delete
        const idsToDelete = getAllNodeIds(node);
        allIdsToDelete.push(...idsToDelete);

        // Remove node from tree
        const [_, newTree] = findAndRemoveNode(newRowData, node.id);
        newRowData = newTree;
      }

      // Update the UI immediately
      setRowData(newRowData);
      setSelectedNodes([]);
      setSelectedNode(null);

      // Execute batch delete in a single database operation
      try {
        await deleteChannelPlaylistBatch(allIdsToDelete);
        setSnackbarMessage("Items deleted successfully");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } catch (err) {
        console.error('Batch delete failed:', err);
        setSnackbarMessage("Some items failed to delete. Refreshing data...");
        setSnackbarSeverity("warning");
        setSnackbarOpen(true);
        refreshChannelsIfNeeded();
      }
    };
    
    // Close dialog first
    setDeleteDialogOpen(false);
    
    // Start the deletion process
    executeDeletes().catch(error => {
      console.error('Error during deletion:', error);
      setSnackbarMessage("Error during deletion. Please refresh.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      refreshChannelsIfNeeded();
    });
  }, [itemsToDelete, rowData, lastOperation, deleteChannelPlaylistBatch, refreshChannelsIfNeeded]);
    
  // Cancel deletion
  const cancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setItemsToDelete([]);
  }, []);

  // Get channel IDs that already exist in channel_playlists
  // When editing/switching, exclude the current channel's channel_id so it can be reselected
  const getExistingChannelIds = useCallback((): string[] => {
    return channelPlaylists
      .filter(item => {
        // Filter out channels that already exist
        if (item.type !== 'channel' || !item.channel_id) return false;
        // If we're editing/switching a channel, exclude its current channel_id
        if (editingChannel && item.id === editingChannel.id) return false;
        return true;
      })
      .map(item => item.channel_id as string);
  }, [channelPlaylists, editingChannel]);

  // Handler for adding/switching to an existing channel from the channels table
  const handleAddExistingChannel = useCallback(async (data: { channelId: string; channelName: string; channelType: string; active: boolean }) => {
    try {
      if (editingChannel) {
        // Switching an existing channel to a different one
        // Check if the target channel is already in use (excluding the current one being edited)
        const isChannelInUse = channelPlaylists.some(
          item => item.type === 'channel' && item.channel_id === data.channelId && item.id !== editingChannel.id
        );

        if (isChannelInUse) {
          setSnackbarMessage(`Channel "${data.channelName}" is already in use and cannot be selected`);
          setSnackbarSeverity("warning");
          setSnackbarOpen(true);
          return;
        }

        await updateChannelPlaylist(editingChannel.id, {
          name: data.channelName,
          active: data.active,
          channel_id: data.channelId // Update to link to the new channel
        });

        setAddChannelDialogOpen(false);
        setEditingChannel(null);
        setSnackbarMessage(`Channel switched to "${data.channelName}" successfully`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } else {
        // Adding a new channel to the playlists
        // Check if the channel is already in use
        const isChannelInUse = channelPlaylists.some(
          item => item.type === 'channel' && item.channel_id === data.channelId
        );

        if (isChannelInUse) {
          setSnackbarMessage(`Channel "${data.channelName}" is already in use and cannot be added again`);
          setSnackbarSeverity("warning");
          setSnackbarOpen(true);
          return;
        }

        const newChannelPlaylist = {
          name: data.channelName,
          active: data.active,
          schedule: '',
          type: 'channel' as const,
          order: rowData.length,
          parent_id: undefined,
          channel_id: data.channelId // Link to the existing channel
        };

        await createChannelPlaylist(newChannelPlaylist);

        setAddChannelDialogOpen(false);
        setSnackbarMessage(`Channel "${data.channelName}" added successfully`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Failed to add/switch channel:', error);
      setSnackbarMessage(editingChannel ? "Failed to switch channel" : "Failed to add channel");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [rowData, editingChannel, createChannelPlaylist, updateChannelPlaylist, channelPlaylists]);

  // Handler for creating a new channel and adding/switching to it
  const handleCreateNewChannel = useCallback(async (data: { name: string; type: 'Unreal' | 'Vizrt' | 'Pixera' | 'Web'; active: boolean; description?: string }) => {
    try {
      // Step 1: Create the channel in the channels table
      const createdChannel = await createChannel({
        name: data.name,
        type: data.type,
        active: data.active,
        description: data.description
      });

      if (editingChannel) {
        // Switching to the newly created channel
        await updateChannelPlaylist(editingChannel.id, {
          name: data.name,
          active: data.active,
          channel_id: createdChannel.id // Update to link to the new channel
        });

        setAddChannelDialogOpen(false);
        setEditingChannel(null);
        setSnackbarMessage(`Channel created and switched to "${data.name}" successfully`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } else {
        // Step 2: Create the channel playlist entry with the channel_id reference
        const newChannelPlaylist = {
          name: data.name,
          active: data.active,
          schedule: '',
          type: 'channel' as const,
          order: rowData.length,
          parent_id: undefined,
          channel_id: createdChannel.id // Link to the created channel
        };

        await createChannelPlaylist(newChannelPlaylist);

        setAddChannelDialogOpen(false);
        setSnackbarMessage(`Channel "${data.name}" created and added successfully`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Failed to create channel:', error);
      setSnackbarMessage(editingChannel ? "Failed to create and switch channel" : "Failed to create channel");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [rowData, editingChannel, createChannel, createChannelPlaylist, updateChannelPlaylist]);

  const handleSavePlaylist = useCallback((playlistData: { 
    name: string; 
    active: boolean; 
    parent_id?: string; 
    schedule?: string;
    carousel_type?: string;
    carousel_name?: string;
  }) => {
    if (editingPlaylist) {
      // Update existing playlist
      const updates: any = {
        name: playlistData.name,
        active: playlistData.active,
        carousel_type: playlistData.carousel_type || 'scrolling_carousel',
        carousel_name: playlistData.carousel_name || playlistData.name
      };
      
      // Only update schedule if it was provided
      if (playlistData.schedule !== undefined) {
        updates.schedule = playlistData.schedule;
      }
      
      updateChannelPlaylist(editingPlaylist.id, updates)
        .then(() => {
          setPlaylistDialogOpen(false);
          setEditingPlaylist(null);
          setTargetChannel(null);
          
          setSnackbarMessage(`Playlist "${playlistData.name}" updated successfully`);
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        })
        .catch(error => {
          console.error('Failed to update playlist:', error);
          setSnackbarMessage("Failed to update playlist");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
    } else {
      // Create new playlist
      if (!playlistData.parent_id) {
        console.error('No parent ID provided for playlist');
        return;
      }
  
      const existingChildren = channelPlaylists.filter(ch => ch.parent_id === playlistData.parent_id);
      const order = existingChildren.length;
  
      const newPlaylist = {
        name: playlistData.name,
        active: playlistData.active,
        schedule: playlistData.schedule || '',
        type: 'playlist' as const,
        parent_id: playlistData.parent_id,
        order,
        carousel_type: playlistData.carousel_type || 'scrolling_carousel',
        carousel_name: playlistData.carousel_name || playlistData.name
      };
  
      createChannelPlaylist(newPlaylist)
        .then(() => {
          setPlaylistDialogOpen(false);
          setTargetChannel(null);
          
          setSnackbarMessage(`Playlist "${playlistData.name}" created successfully`);
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        })
        .catch(error => {
          console.error('Failed to create playlist:', error);
          setSnackbarMessage("Failed to create playlist");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
    }
  }, [channelPlaylists, createChannelPlaylist, updateChannelPlaylist, editingPlaylist]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || loading) return;
    
    setIsRefreshing(true);
    
    // Show loading overlay
    if (gridRef.current?.api) {
      gridRef.current.api.showLoadingOverlay();
    }
    
    try {
      // Call the refresh function from your hook
      await refreshChannelsAndPlaylists();
      
      setSnackbarMessage("Channels refreshed successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error refreshing channels:", error);
      
      setSnackbarMessage("Error refreshing channels");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsRefreshing(false);
      
      // Hide loading overlay
      if (gridRef.current?.api) {
        gridRef.current.api.hideOverlay();
      }
    }
  }, [isRefreshing, loading, refreshChannels]);
  
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const getExistingContentIds = useCallback((playlistId: string): string[] => {
    const playlist = channelPlaylists
      .filter(ch => ch.type === 'playlist')
      .find(pl => pl.id === playlistId);

    if (!playlist) return [];

    // Find all buckets that are children of this playlist
    const buckets = channelPlaylists
      .filter(ch => (ch as any).parent_id === playlistId && ch.type === 'bucket')
      .map(bucket => (bucket as any).content_id)
      .filter(Boolean) as string[];

    return buckets;
  }, [channelPlaylists]);

  const hasCopiedData = useCallback(() => {
    return copiedData !== null;
  }, [copiedData]);

  // Handler for the cut operation
  const handleCut = useCallback((params: any) => {
    if (!params.node || !params.node.data) return;
    
    // Store the complete node data with its children (preserve full hierarchy)
    const {
      treePath,
      idPath,
      displayName,
      ...dbData
    } = params.node.data;
    
    // Store the clean data with children preserved
    setCopiedData(dbData);
    setIsCut(true);
    
    // Mark cut rows using a safer approach with dedicated state instead of modifying the grid directly
    const cutIds = new Set<string>();
    
    // Add the main node ID
    cutIds.add(params.node.data.id);
    
    // Helper function to collect child IDs
    const collectChildIds = (node: TreeNode): void => {
      if (!node.children) return;
      
      for (const child of node.children) {
        cutIds.add(child.id);
        collectChildIds(child);
      }
    };
    
    // Add all child IDs if present
    if (params.node.data.children) {
      collectChildIds(params.node.data);
    }
    
    // Update the state with all cut row IDs
    setCutRowIds(cutIds);
    
    // Set a small timeout before redrawing to avoid context menu conflicts
    setTimeout(() => {
      if (gridRef.current?.api) {
        // Just refresh the rows without direct data modification
        gridRef.current.api.refreshCells({ force: true });
      }
      
      // Show feedback after a slight delay
      setSnackbarMessage("Item cut to clipboard (with all children)");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
    }, 100);
  }, []);  
  
  // Handler for the copy operation
  const handleCopy = useCallback((params: any) => {
    if (!params.node || !params.node.data) return;
    
    // Create a deep copy of the node data including its children
    const copyNodeWithChildren = (node: TreeNode): TreeNode => {
      // Make a copy of the node first
      const { 
        treePath, 
        idPath, 
        displayName,
        descendantCount,
        ...nodeCopy 
      } = node;
      
      // If node has children, recursively copy them too
      if (node.children && node.children.length > 0) {
        nodeCopy.children = node.children.map(child => copyNodeWithChildren(child));
      }
      
      return nodeCopy;
    };
    
    // Create a deep copy of the data with all children
    const fullCopy = copyNodeWithChildren(params.node.data);
    
    // Store the clean data with children
    setCopiedData(fullCopy);
    setIsCut(false);
    
    // Show a snackbar confirmation
    setSnackbarMessage("Item copied to clipboard with all children");
    setSnackbarSeverity("info");
    setSnackbarOpen(true);
  }, []);

  // Fetch all buckets for the paste channel dialog
  const fetchAllBuckets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('id, name')
        .eq('type', 'bucket')
        .order('name');

      if (error) throw error;
      setAllBuckets(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching buckets:', err);
      return [];
    }
  }, []);

  // Handler for the paste operation
  const handlePaste = useCallback((params: any) => {
    if (!copiedData) return;

    // Determine target node and parent
    const targetNode = params.node?.data;
    if (!targetNode) return;

    try {
      // Determine valid paste location based on node types
      let parentId: string | null = null;
      let pasteAsSibling = false;

      // Logic to determine where to paste based on target type
      if (targetNode.type === 'channel') {
        if (copiedData.type === 'channel') {
          // For channel paste, show the dialog to select target channel
          // Fetch buckets first for the retargeting feature
          fetchAllBuckets().then(() => {
            setPasteTargetNode(targetNode);
            setPasteChannelDialogOpen(true);
          });
          return;
        } else if (copiedData.type === 'playlist') {
          // Paste playlist into channel
          parentId = targetNode.id;
        } else if (copiedData.type === 'bucket') {
          setSnackbarMessage("Cannot paste bucket directly into channel");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }
      } else if (targetNode.type === 'playlist') {
        if (copiedData.type === 'playlist') {
          // Paste playlist as sibling of another playlist
          // Find the parent channel of the target playlist
          const parentChannel = findParentNode(rowData, targetNode.id);
          if (parentChannel && parentChannel.type === 'channel') {
            parentId = parentChannel.id;
            pasteAsSibling = true;
          } else {
            setSnackbarMessage("Could not find parent channel");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
          }
        } else if (copiedData.type === 'bucket') {
          // Paste bucket into playlist
          parentId = targetNode.id;
        } else if (copiedData.type === 'channel') {
          setSnackbarMessage("Cannot paste channel here");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }
      } else if (targetNode.type === 'bucket') {
        if (copiedData.type === 'bucket') {
          // Paste bucket as sibling of another bucket
          const parentPlaylist = findParentNode(rowData, targetNode.id);
          parentId = parentPlaylist?.id || null;
          pasteAsSibling = true;
        } else {
          setSnackbarMessage("Cannot paste this item type here");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }
      }
      
      if (parentId === null && copiedData.type !== 'channel') {
        setSnackbarMessage("Could not determine where to paste this item");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      
      // Get siblings helper function
      const getSiblings = (parentNodeId: string | null): TreeNode[] => {
        if (!parentNodeId) return rowData;
        
        const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
          for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
              const found = findNode(node.children, id);
              if (found) return found;
            }
          }
          return null;
        };
        
        const parent = findNode(rowData, parentNodeId);
        return parent?.children || [];
      };
      
      // Get position information for sibling paste
      let targetOrder = 0;
      if (pasteAsSibling) {
        // Find the target node's order
        const siblings = getSiblings(parentId);
        const targetIndex = siblings.findIndex(s => s.id === targetNode.id);
        if (targetIndex !== -1) {
          // Insert after the target node
          targetOrder = targetIndex + 1;
        }
      } else {
        // Pasting as child - add at the end
        const children = getSiblings(parentId);
        targetOrder = children.length;
      }
      
      // Function to recursively paste nodes with their children
      const pasteNodeWithChildren = async (node: TreeNode, parentId: string | null, order: number): Promise<string> => {
        // Create a clean copy of the node to paste
        const {
          id: originalId,
          children,
          treePath,
          idPath,
          displayName,
          descendantCount,
          ...itemToKeep
        } = node;
        
        // Set the parent ID and order for the new item
        const newItem = {
          ...itemToKeep,
          parent_id: parentId ?? undefined,
          order: order
        };
        
        // Generate a unique name if needed
        if (parentId !== null) {
          const siblings = getSiblings(parentId);
          newItem.name = createUniqueBucketName(node.name, siblings);
        } else {
          // Top-level item (channel)
          newItem.name = createUniqueBucketName(node.name, rowData);
        }
        
        try {
          // First, shift existing items if we're inserting as sibling
          if (pasteAsSibling && parentId !== null) {
            const { data: itemsToShift } = await supabase
              .from('channels')
              .select('id, order')
              .eq('parent_id', parentId)
              .gte('order', order)
              .order('order', { ascending: false });
            
            if (itemsToShift && itemsToShift.length > 0) {
              for (const item of itemsToShift) {
                await supabase
                  .from('channels')
                  .update({ order: item.order + 1 })
                  .eq('id', item.id);
              }
            }
          } else if (pasteAsSibling && parentId === null) {
            // For top-level channels
            const { data: itemsToShift } = await supabase
              .from('channels')
              .select('id, order')
              .is('parent_id', null)
              .gte('order', order)
              .order('order', { ascending: false });
            
            if (itemsToShift && itemsToShift.length > 0) {
              for (const item of itemsToShift) {
                await supabase
                  .from('channels')
                  .update({ order: item.order + 1 })
                  .eq('id', item.id);
              }
            }
          }
          
          // Create the new item in the database
          const createdItem = await createChannelPlaylist(newItem);
          
          // If the original node had children, create them too
          if (children && children.length > 0) {
            // Process children in order
            for (let i = 0; i < children.length; i++) {
              await pasteNodeWithChildren(children[i], createdItem.id, i);
            }
          }
          
          return createdItem.id;
        } catch (error) {
          console.error('Failed to create item during paste:', error);
          throw error;
        }
      };
      
      // Start the recursive paste operation
      pasteNodeWithChildren(copiedData, parentId, targetOrder)
        .then((newTopLevelId) => {
          // If this was a cut operation, delete the original
          if (isCut) {
            deleteChannelPlaylist(copiedData.id)
              .then(() => {
                // Clear the clipboard
                setCopiedData(null);
                setIsCut(false);
                setCutRowIds(new Set()); // Clear the cut row styling
                
                // Refresh the grid
                refreshChannelsAndPlaylists();
                
                setSnackbarMessage("Item moved successfully with all children");
                setSnackbarSeverity("success");
                setSnackbarOpen(true);
                
                // Optional: select the newly created item
                setTimeout(() => {
                  if (gridRef.current?.api) {
                    gridRef.current.api.forEachNode((node: any) => {
                      if (node.data && node.data.id === newTopLevelId) {
                        node.setSelected(true);
                      }
                    });
                  }
                }, 300);
              })
              .catch(error => {
                console.error('Failed to delete original item:', error);
                setSnackbarMessage("Failed to complete cut operation");
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
                refreshChannelsAndPlaylists(); // Still refresh to show new items
              });
          } else {
            // For copy operations, just refresh the grid
            refreshChannelsAndPlaylists();
            
            setSnackbarMessage("Item pasted successfully with all children");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            
            // Optional: select the newly created item
            setTimeout(() => {
              if (gridRef.current?.api) {
                gridRef.current.api.forEachNode((node: any) => {
                  if (node.data && node.data.id === newTopLevelId) {
                    node.setSelected(true);
                  }
                });
              }
            }, 300);
          }
        })
        .catch(error => {
          console.error('Failed to paste item with children:', error);
          setSnackbarMessage("Failed to paste item with children");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          refreshChannelsAndPlaylists(); // Refresh in case partial changes were made
        });
        
    } catch (error) {
      console.error('Error during paste operation:', error);
      setSnackbarMessage("Error during paste operation");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [copiedData, isCut, rowData, findParentNode, createChannelPlaylist, deleteChannelPlaylist, refreshChannels, createUniqueBucketName, fetchAllBuckets]);

  // Handler for when user confirms the paste channel dialog
  const handlePasteChannelConfirm = useCallback(async (
    targetChannelId: string,
    targetChannelName: string,
    bucketMappings: BucketMapping[] | null
  ) => {
    if (!copiedData || copiedData.type !== 'channel') return;

    try {
      // Get siblings helper function
      const getSiblings = (parentNodeId: string | null): TreeNode[] => {
        if (!parentNodeId) return rowData;

        const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
          for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
              const found = findNode(node.children, id);
              if (found) return found;
            }
          }
          return null;
        };

        const parent = findNode(rowData, parentNodeId);
        return parent?.children || [];
      };

      // Get position information - paste after the target channel
      let targetOrder = 0;
      if (pasteTargetNode) {
        const siblings = getSiblings(null);
        const targetIndex = siblings.findIndex(s => s.id === pasteTargetNode.id);
        if (targetIndex !== -1) {
          targetOrder = targetIndex + 1;
        }
      }

      // Create a mapping lookup for quick bucket content_id and name replacement
      const bucketContentIdMap = new Map<string, { newContentId: string; newName: string }>();
      if (bucketMappings) {
        bucketMappings.forEach(mapping => {
          if (mapping.newContentId && mapping.newBucketName) {
            bucketContentIdMap.set(mapping.originalContentId, {
              newContentId: mapping.newContentId,
              newName: mapping.newBucketName
            });
          }
        });
      }

      // Function to recursively paste nodes with their children
      const pasteNodeWithChildren = async (node: TreeNode, parentId: string | null, order: number, isTopLevel: boolean = false): Promise<string> => {
        // Create a clean copy of the node to paste
        const {
          id: originalId,
          children,
          treePath,
          idPath,
          displayName,
          descendantCount,
          channel_type,
          ...itemToKeep
        } = node;

        // Set the parent ID and order for the new item
        const newItem: any = {
          ...itemToKeep,
          parent_id: parentId ?? undefined,
          order: order
        };

        // For the top-level channel, use the target channel info
        if (isTopLevel) {
          newItem.name = targetChannelName;
          newItem.channel_id = targetChannelId;
        } else {
          // Generate a unique name if needed
          if (parentId !== null) {
            const siblings = getSiblings(parentId);
            newItem.name = createUniqueBucketName(node.name, siblings);
          } else {
            newItem.name = createUniqueBucketName(node.name, rowData);
          }
        }

        // For bucket nodes, check if we should retarget the content_id and name
        if (node.type === 'bucket' && node.content_id && bucketContentIdMap.has(node.content_id)) {
          const mapping = bucketContentIdMap.get(node.content_id)!;
          newItem.content_id = mapping.newContentId;
          newItem.name = mapping.newName;
        }

        try {
          // First, shift existing items if we're inserting as sibling at top level
          if (isTopLevel && parentId === null) {
            try {
              const { data: itemsToShift } = await supabase
                .from('channel_playlists')
                .select('id, "order"')
                .is('parent_id', null)
                .gte('order', order);

              if (itemsToShift && itemsToShift.length > 0) {
                // Sort in descending order manually to avoid column name conflict
                const sortedItems = [...itemsToShift].sort((a, b) => (b.order || 0) - (a.order || 0));
                for (const item of sortedItems) {
                  await supabase
                    .from('channel_playlists')
                    .update({ order: (item.order || 0) + 1 })
                    .eq('id', item.id);
                }
              }
            } catch (shiftError) {
              console.warn('Failed to shift existing items, continuing anyway:', shiftError);
            }
          }

          // Create the new item in the database
          const createdItem = await createChannelPlaylist(newItem);

          // If the original node had children, create them too
          if (children && children.length > 0) {
            // Process children in order
            for (let i = 0; i < children.length; i++) {
              await pasteNodeWithChildren(children[i], createdItem.id, i, false);
            }
          }

          return createdItem.id;
        } catch (error) {
          console.error('Failed to create item during paste:', error);
          throw error;
        }
      };

      // Start the recursive paste operation
      const newTopLevelId = await pasteNodeWithChildren(copiedData, null, targetOrder, true);

      // If this was a cut operation, delete the original
      if (isCut) {
        await deleteChannelPlaylist(copiedData.id);
        setCopiedData(null);
        setIsCut(false);
        setCutRowIds(new Set());
        setSnackbarMessage("Channel moved successfully with all children");
      } else {
        setSnackbarMessage("Channel pasted successfully with all children");
      }

      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      // Refresh the grid
      refreshChannelsAndPlaylists();

      // Select the newly created item
      setTimeout(() => {
        if (gridRef.current?.api) {
          gridRef.current.api.forEachNode((node: any) => {
            if (node.data && node.data.id === newTopLevelId) {
              node.setSelected(true);
            }
          });
        }
      }, 300);

    } catch (error) {
      console.error('Failed to paste channel:', error);
      setSnackbarMessage("Failed to paste channel");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      refreshChannelsAndPlaylists();
    }
  }, [copiedData, isCut, rowData, pasteTargetNode, createChannelPlaylist, deleteChannelPlaylist, refreshChannelsAndPlaylists, createUniqueBucketName]);

  const getContextMenuItems = useCallback((params: any): (DefaultMenuItem | MenuItemDef)[] => {
    // Capture the selected node reference before any async operations
    const selectedNodeData = params.node ? params.node.data : null;

    // Determine edit action based on node type
    const getEditAction = () => {
      if (!selectedNodeData) return;
      const parentNode = findParentNode(rowData, selectedNodeData.id);

      switch (selectedNodeData.type) {
        case 'channel':
          setTargetChannel({ id: selectedNodeData.id, name: selectedNodeData.name });
          setAddChannelDialogOpen(true);
          break;
        case 'playlist':
          setEditingPlaylist(selectedNodeData);
          setPlaylistDialogOpen(true);
          break;
        case 'bucket':
          if (parentNode && parentNode.type === 'playlist') {
            setEditingBucketInstance(selectedNodeData);
            setTargetPlaylistId(parentNode.id);
            setBucketSelectorOpen(true);
          }
          break;
      }
    };

    const result: (DefaultMenuItem | MenuItemDef)[] = [
      {
        name: 'Edit',
        icon: '<span class="ag-icon ag-icon-edit"></span>',
        action: getEditAction
      },
      'separator',
      {
        name: 'Cut',
        icon: '<span class="ag-icon ag-icon-cut"></span>',
        action: () => {
          // Use captured node data for safety
          if (selectedNodeData) {
            const safeParams = { node: { data: selectedNodeData } };
            handleCut(safeParams);
          }
        }
      },
      {
        name: 'Copy',
        icon: '<span class="ag-icon ag-icon-copy"></span>',
        action: () => {
          // Use captured node data for safety
          if (selectedNodeData) {
            const safeParams = { node: { data: selectedNodeData } };
            handleCopy(safeParams);
          }
        }
      },
      {
        name: 'Paste',
        icon: '<span class="ag-icon ag-icon-paste"></span>',
        action: () => {
          // Use captured node data for safety
          if (selectedNodeData) {
            const safeParams = { node: { data: selectedNodeData } };
            handlePaste(safeParams);
          }
        },
        disabled: !hasCopiedData()
      },
      'separator',
      {
        name: 'Delete',
        icon: '<span class="ag-icon ag-icon-cross"></span>',
        action: () => {
          if (selectedNodeData) {
            gridRef.current?.api.deselectAll();
            params.node.setSelected(true);
            prepareDelete();
          }
        }
      }
    ];

    return result;
  }, [handleCut, handleCopy, handlePaste, hasCopiedData, rowData, findParentNode, prepareDelete]);

  const getPlaylistNamesInChannel = useCallback((channelId: string): string[] => {
    return channelPlaylists
      .filter(item => item.parent_id === channelId && item.type === 'playlist')
      .map(item => item.name);
  }, [channelPlaylists]);

  // Grid context for cell renderers - provides callbacks without recreating cell renderers
  const gridContext = useMemo(() => ({
    onEditChannel: (data: any) => {
      setTargetChannel({ id: data.id, name: data.name });
      setAddChannelDialogOpen(true);
    },
    onEditPlaylist: (data: any) => {
      setEditingPlaylist(data);
      setPlaylistDialogOpen(true);
    },
    onEditBucket: (data: any) => {
      // Find parent playlist
      const parentPlaylist = findParentNode(rowData, data.id);
      if (parentPlaylist && parentPlaylist.type === 'playlist') {
        setEditingBucketInstance(data);
        setTargetPlaylistId(parentPlaylist.id);
        setBucketSelectorOpen(true);
      }
    },
    onOpenBucket: (data: any) => {
      // Open the bucket in ContentPage
      // data.content_id is the actual bucket ID in the content table
      if (data.content_id) {
        // First, focus or open the Content tab
        window.dispatchEvent(new CustomEvent('focusContentTab'));
        // Then, after a short delay to allow the tab to render, dispatch the openBucket event
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openBucket', { detail: { bucketId: data.content_id } }));
        }, 150);
      }
    }
  }), [rowData]);

  // Memoized getRowClass to prevent unnecessary re-renders
  const getRowClass = useCallback((params: any) => {
    if (params.data?.id && cutRowIds.has(params.data.id)) {
      return 'row-cut';
    }
    return '';
  }, [cutRowIds]);

  return (
    (<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="toolbar">
        <div className="toolbar-left">
          <Tooltip title="Add New Channel">
            <span>
              <IconButton
                onClick={addChannel}
                className="toolbar-button"
                color="primary"
              >
                <TvIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Add Playlist to Channel or Below Selected Playlist">
            <span>
              <IconButton
                onClick={addPlaylist}
                disabled={!selectedNode || (selectedNode.type !== 'channel' && selectedNode.type !== 'playlist')}
                className="toolbar-button"
                color="primary"
              >
                <PlaylistAddIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Add Bucket to Selected Playlist or Below Selected Bucket">
            <span>
              <IconButton
                onClick={addBucket}
                disabled={!selectedNode || (selectedNode.type !== 'playlist' && selectedNode.type !== 'bucket')}
                className="toolbar-button"
                color="primary"
              >
                <ShoppingBasketIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>
        <div className="toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tooltip title="Hide playlists and buckets whose schedule is not currently active">
            <FormControlLabel
              control={
                <Switch
                  checked={hideInactive}
                  onChange={(e) => {
                    setHideInactive(e.target.checked);
                    if (e.target.checked) {
                      setCurrentTime(new Date());
                    }
                  }}
                  size="small"
                  color="primary"
                />
              }
              label={<Typography variant="body2">Hide Inactive</Typography>}
              sx={{ mr: 1 }}
            />
          </Tooltip>
          <Tooltip title="Refresh Channels">
            <span>
              <IconButton
                onClick={handleRefresh}
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
          {selectedNodes.length > 0 && (
            <Chip
              label={`${selectedNodes.length} selected`}
              size="small"
              color="primary"
              onDelete={() => {
                if (gridRef.current?.api) {
                  gridRef.current.api.deselectAll();
                }
                setSelectedNodes([]);
              }}
            />
          )}
          <Tooltip title="Delete Selected Items">
            <span>
              <IconButton
                onClick={prepareDelete}
                disabled={selectedNodes.length === 0}
                className="toolbar-button"
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>        
      </div>
      <div 
        ref={containerRef}
        className="ag-theme-alpine" 
        style={{ 
          flex: 1, 
          overflow: 'auto',
          height: '100%'
        }}
      >
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={flattenedRows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          autoGroupColumnDef={autoGroupColumnDef}
          context={gridContext}
          treeData={true}
          getDataPath={getDataPath}
          onCellValueChanged={onCellValueChanged}
          rowSelection={{
            mode: 'multiRow',
            checkboxes: false,
            enableSelectionWithoutKeys: false,
            enableClickSelection: true
          }}
          selectionColumnDef={{ hide: true } as any}
          suppressMultiSort={false}
          onSelectionChanged={onSelectionChanged}
          onRowGroupOpened={onRowGroupOpened}
          onRowDragEnd={onRowDragEnd}
          onRowDragMove={onRowDragMove}
          onRowDragLeave={onRowDragLeave}
          getRowId={getRowId}
          onGridReady={onGridReady}
          onColumnResized={saveColumnState}
          onColumnMoved={saveColumnState}
          onColumnVisible={saveColumnState}
          stopEditingWhenCellsLoseFocus={true}
          suppressClickEdit={isDragging}
          suppressScrollOnNewData={true}
          alwaysShowHorizontalScroll={false}
          alwaysShowVerticalScroll={false}
          rowDragMultiRow={true}
          rowDragManaged={false}
          suppressMoveWhenRowDragging={false}
          getContextMenuItems={getContextMenuItems}
          allowContextMenuWithControlKey={true}
          suppressContextMenu={false}
          preventDefaultOnContextMenu={true}
          popupParent={document.body}
          getRowClass={getRowClass}
          tooltipShowDelay={1500}
          tooltipShowMode="whenTruncated" />
      </div>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return; // Prevent closing
          }
          cancelDelete();
        }}
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
            Are you sure you want to delete the following items? This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="error" gutterBottom>
            All children of these items will also be deleted.
          </Typography>
          <List>
            {itemsToDelete.map(item => (
              <ListItem key={item.id}>
                <ListItemIcon>
                  {getNodeIcon(item.type)}
                </ListItemIcon>
                <ListItemText 
                  primary={item.name}
                  secondary={
                    (item.descendantCount ?? 0) > 0
                      ? `Will also delete ${item.descendantCount || 0} child item${(item.descendantCount || 0) !== 1 ? 's' : ''}`
                      : ''
                  } 
                />
              </ListItem>
            ))}
          </List>
          <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
            Total items to be deleted: {
              itemsToDelete.reduce((total, item) => total + 1 + (item.descendantCount || 0), 0)
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Bucket Selector Dialog */}
      <BucketSelector
        open={bucketSelectorOpen}
        onClose={() => {
          setBucketSelectorOpen(false);
          setTargetPlaylistId(null);
          setEditingBucketInstance(null);
        }}
        onSelect={handleAddSelectedBuckets}
        parentId={targetPlaylistId}
        existingBuckets={targetPlaylistId ? getExistingContentIds(targetPlaylistId) : []}
      />
      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      {/* Add/Switch Channel Dialog */}
      <AddChannelToPlaylistDialog
        open={addChannelDialogOpen}
        onClose={() => {
          setAddChannelDialogOpen(false);
          setEditingChannel(null);
        }}
        onSave={handleAddExistingChannel}
        onCreateNew={handleCreateNewChannel}
        availableChannels={channels.map(ch => ({
          id: ch.id,
          name: ch.name,
          type: ch.type,
          active: ch.active
        }))}
        existingChannelIds={getExistingChannelIds()}
        isEditing={!!editingChannel}
        editingChannelName={editingChannel?.name}
        editingChannelId={editingChannel?.channel_id}
      />
      {/* Playlist Dialog */}
      <PlaylistDialog
        open={playlistDialogOpen}
        onClose={() => {
          setPlaylistDialogOpen(false);
          setEditingPlaylist(null);
          setTargetChannel(null);
        }}
        onSave={handleSavePlaylist}
        mode={editingPlaylist ? 'edit' : 'create'}
        initialData={editingPlaylist ? {
          name: editingPlaylist.name,
          active: editingPlaylist.active,
          schedule: editingPlaylist.schedule,
          carousel_type: editingPlaylist.carousel_type,
          carousel_name: editingPlaylist.carousel_name
        } : undefined}
        parentChannel={targetChannel || undefined}
        existingNames={targetChannel ?
          getPlaylistNamesInChannel(targetChannel.id)
            .filter(name => name !== editingPlaylist?.name) : []}
      />
      {/* Schedule Dialog (lifted from cell renderer to survive re-renders) */}
      <ScheduleDialog
        open={scheduleDialogOpen}
        onClose={() => {
          setScheduleDialogOpen(false);
          setEditingScheduleRow(null);
        }}
        onSave={handleSaveSchedule}
        initialSchedule={editingScheduleRow?.data?.schedule ? normalizeSchedule(editingScheduleRow.data.schedule) || undefined : undefined}
      />
      {/* Paste Channel Dialog */}
      <PasteChannelDialog
        open={pasteChannelDialogOpen}
        onClose={() => {
          setPasteChannelDialogOpen(false);
          setPasteTargetNode(null);
        }}
        onPaste={handlePasteChannelConfirm}
        copiedChannelName={copiedData?.name || ''}
        copiedNode={copiedData}
        availableChannels={channels.map(ch => ({
          id: ch.id,
          name: ch.name,
          type: ch.type,
          active: ch.active
        }))}
        existingChannelIds={getExistingChannelIds()}
        allBuckets={allBuckets}
      />
    </div>)
  );
};

export default ChannelPlaylistsPage;