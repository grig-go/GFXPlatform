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
  Box,
  TextField,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
  LinearProgress,
  Chip,
  Paper,
  Switch,
  FormControlLabel
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import DescriptionIcon from '@mui/icons-material/Description';
import StarIcon from '@mui/icons-material/Star';
import { useContent } from '../hooks/useContent';
import { useTemplates } from '../hooks/useTemplates';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import RefreshIcon from '@mui/icons-material/Refresh';

import { supabase } from '../lib/supabase';
import { FormPreview } from '../components/formio';
import { isAnyImageUploading } from '../components/formio/ImageComponent';
import AIAssistant from '../components/AIAssistant';
import { updateFormFields } from '../utils/formFieldUpdater';
import { ScheduleCellRenderer, normalizeSchedule, isScheduleActive, formatScheduleTooltip } from '../components/ScheduleCellRenderer';
import { NameCellRenderer, DurationCellRenderer } from '../components/ContentCellRenderers';
import { ScheduleDialog } from '../components/ScheduleDialog';
import { BucketFolderDialog } from '../components/BucketFolderDialog';
import { BucketDialog } from '../components/BucketDialog';
import { ItemFolderDialog } from '../components/ItemFolderDialog';
import { getWeatherLocations } from '../services/supabase/weatherLocations';
import { useCrossGridDrag, DraggedBucket } from '../contexts/CrossGridDragContext';
import { useGridExpandedRows, useGridColumnState } from '../contexts/GridStateContext';
import AgCheckbox from '../components/AgCheckbox';

// Define an interface for the row data structure with ID paths
interface TreeNodeWithPaths extends TreeNode {
  idPath?: string[];
  displayName?: string;
}

export interface TreeNode {
  id: string;
  name: string;
  active: boolean;
  schedule?: any;
  children?: TreeNode[];
  bucket_config?: any;
  type: 'bucketFolder' | 'bucket' | 'itemFolder' | 'item';
  treePath?: string[];
  descendantCount?: number; // Used for delete dialog
  template_id?: string; // Added for items to track associated template
  template_name?: string; // Added to store template name
  fields?: Record<string, any>; // Added to store item fields
  duration?: number | null; // Added to store item duration
}

const ContentPage: React.FC = () => {
  const gridRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<any>(null); // Reference to the form component
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]);
  const { content, loading, error, createContent, updateContent, deleteContent, deleteContentBatch, refreshContentIfNeeded, refreshContent } = useContent();
  const { expandedRows, setExpandedRows, toggleRowExpanded } = useGridExpandedRows('content');
  const { columnState, setColumnState, isLoaded: isGridStateLoaded } = useGridColumnState('content');
  const [lastOperation, setLastOperation] = useState<{ type: string; timestamp: number } | null>(null);
  const [rowData, setRowData] = useState<TreeNode[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dropTargetRef = useRef<{ nodeId: string; dropBelow: boolean } | null>(null);
  const dragInProgressRef = useRef<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<TreeNode[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Cross-grid drag and drop
  const { channelPlaylistsGridApi, channelPlaylistsContainer, bucketDropHandler, registeredDropZones } = useCrossGridDrag();
  const dropZoneRegisteredRef = useRef<boolean>(false);

  // Hide inactive toggle state
  const [hideInactive, setHideInactive] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Template selection state
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateFilter, setTemplateFilter] = useState('');
  const { templates, templateSettings, loading: templatesLoading, refreshTemplates } = useTemplates();
  
  // Edit item dialog state
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TreeNode | null>(null);
  const [itemFields, setItemFields] = useState<Record<string, any>>({});
  const [bucketFolderDialogOpen, setBucketFolderDialogOpen] = useState(false);
  const [bucketDialogOpen, setBucketDialogOpen] = useState(false);
  const [itemFolderDialogOpen, setItemFolderDialogOpen] = useState(false);
  const [editingBucketFolder, setEditingBucketFolder] = useState<TreeNode | null>(null);
  const [editingBucket, setEditingBucket] = useState<TreeNode | null>(null);
  const [editingItemFolder, setEditingItemFolder] = useState<TreeNode | null>(null);
  const [targetParent, setTargetParent] = useState<{ id: string; name: string; type: string } | null>(null);
  
  // AI form population state
  const [formSchema, setFormSchema] = useState<any>(null);

  // State for clipboard data
  const [copiedData, setCopiedData] = useState<TreeNode | null>(null);
  const [isCut, setIsCut] = useState<boolean>(false);
  const [cutRowIds, setCutRowIds] = useState<Set<string>>(new Set());

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // Add state for tracking loaded fields
  const [loadedFieldsMap, setLoadedFieldsMap] = useState<Record<string, Record<string, any>>>({});
  const [loadingFields, setLoadingFields] = useState<Set<string>>(new Set());
  const [isUpdatingFields, setIsUpdatingFields] = useState(false);

  // Add state for bulk operations
  const [bulkDeleteInProgress, setBulkDeleteInProgress] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });

  // Add state for duration and schedule:
  const [itemDuration, setItemDuration] = useState<number | null>(null);
  const [itemSchedule, setItemSchedule] = useState<any>(null);

  // Initial tab for edit item dialog (0=Form, 1=Data, 2=Settings)
  const [editItemInitialTab, setEditItemInitialTab] = useState<number>(0);

  // Schedule dialog state (lifted from cell renderer to survive re-renders)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingScheduleRow, setEditingScheduleRow] = useState<{
    data: any;
    node: any;
    colDef: any;
    api: any;
  } | null>(null);

    // Handle scroll events with debouncing
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const selectionTimeoutRef = useRef<NodeJS.Timeout>();
  const modelUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  const expansionLoadTimeoutRef = useRef<NodeJS.Timeout>();

  // Track what's already loaded
  const loadedItemsRef = useRef(new Set());
  const contentVersionRef = useRef(0);
  const lastLoadedVersionRef = useRef(-1);

  const DEFAULT_EXPIRATION_HOURS = parseInt(import.meta.env.VITE_DEFAULT_EXPIRATION_HOURS || '0');

  // Get the default template for auto-selection
  const defaultTemplate = useMemo(() => {
    return templates?.find(t => t.type === 'template' && t.is_default);
  }, [templates]);

  useEffect(() => {
    if (addItemDialogOpen) {
      // Clear form fields when dialog opens
      if (formRef.current?.formio) {
        // Reset the form submission data
        formRef.current.formio.submission = { data: {} };

        // Trigger a change to update the UI
        if (typeof formRef.current.formio.triggerChange === 'function') {
          formRef.current.formio.triggerChange();
        }

        // Also trigger redraw if available
        if (typeof formRef.current.formio.redraw === 'function') {
          formRef.current.formio.redraw();
        }
      }

      // Also clear any local field state
      setItemFields({});

      // Reset duration and schedule
      setItemDuration(null);

      // Set default schedule with expiration if configured
      if (DEFAULT_EXPIRATION_HOURS > 0) {
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + DEFAULT_EXPIRATION_HOURS);
        // Format as datetime-local value (YYYY-MM-DDTHH:mm) in local time
        const year = expirationDate.getFullYear();
        const month = String(expirationDate.getMonth() + 1).padStart(2, '0');
        const day = String(expirationDate.getDate()).padStart(2, '0');
        const hours = String(expirationDate.getHours()).padStart(2, '0');
        const minutes = String(expirationDate.getMinutes()).padStart(2, '0');
        const endDateStr = `${year}-${month}-${day}T${hours}:${minutes}`;
        setItemSchedule({
          startDate: '',
          endDate: endDateStr,
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
        });
      } else {
        setItemSchedule(null);
      }

      // Auto-select the default template if one exists
      if (defaultTemplate && !selectedTemplate) {
        setSelectedTemplate(defaultTemplate);
      }
    }
  }, [addItemDialogOpen, defaultTemplate]);

  useEffect(() => {
    return () => {
      if (modelUpdateTimeoutRef.current) {
        clearTimeout(modelUpdateTimeoutRef.current);
      }
      if (expansionLoadTimeoutRef.current) {
        clearTimeout(expansionLoadTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Update currentTime every minute when hideInactive is enabled
  useEffect(() => {
    if (!hideInactive) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [hideInactive]);

  const handleSchemaLoad = useCallback((loadedSchema: any) => {
    setFormSchema(loadedSchema);
  }, []); 

  const getBucketNamesInFolder = useCallback((folderId: string): string[] => {
    return content
      .filter(item => item.parent_id === folderId && item.type === 'bucket')
      .map(item => item.name);
  }, [content]);
  
  const getItemFolderNamesInContainer = useCallback((containerId: string): string[] => {
    return content
      .filter(item => item.parent_id === containerId && item.type === 'itemFolder')
      .map(item => item.name);
  }, [content]);

  const getAllBucketNames = useCallback((): string[] => {
    return content
      .filter(item => item.type === 'bucket')
      .map(item => item.name);
  }, [content]);
  
  // Filter templates to show only actual templates (not folders)
  // Sort by: favorites first, then default, then alphabetically
  const availableTemplates = useMemo(() => {
    if (!templates || !Array.isArray(templates)) return [];

    return templates
      .filter(t => t.type === 'template') // Only show actual templates, not folders
      .filter(t => t.active === true) // Only show active templates
      .filter(t =>
        t.name.toLowerCase().includes(templateFilter.toLowerCase())
      )
      .sort((a, b) => {
        // Favorites first
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        // Then default
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });
  }, [templates, templateFilter]);

  // No-select styles to prevent text selection
  const noSelectStyles = {
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    userSelect: 'none'
  };

  // Format item name with fields using template's displayNameFormat if available
  const formatItemName = (item: TreeNode): string => {
    if (item.type !== 'item') {
      return item.name;
    }

    if (loadingFields.has(item.id)) {
      return 'Loading...';
    }

    const fields = item.fields || {};

    // Check if the template has a custom displayNameFormat
    if (item.template_id && templateSettings[item.template_id]?.displayNameFormat) {
      const format = templateSettings[item.template_id].displayNameFormat!;

      // Replace {fieldName} placeholders with actual values
      // {name} is a special placeholder for the item's name
      let result = format.replace(/\{(\w+)\}/g, (_match: string, fieldName: string) => {
        if (fieldName === 'name') {
          return item.name;
        }
        // Check for display-friendly versions of the field first
        // Priority: locationNames (array) > locationName (single) > electionName > filename > raw value
        const locationNamesKey = `__${fieldName}_locationNames`;
        if (fields[locationNamesKey]) {
          try {
            const names = JSON.parse(fields[locationNamesKey]);
            if (Array.isArray(names)) {
              return names.join(' / ');
            }
          } catch {
            // Fall through to other options
          }
        }
        const locationNameKey = `__${fieldName}_locationName`;
        if (fields[locationNameKey]) {
          return fields[locationNameKey];
        }
        const electionNameKey = `__${fieldName}_electionName`;
        if (fields[electionNameKey]) {
          return fields[electionNameKey];
        }
        const filenameKey = `__${fieldName}_filename`;
        if (fields[filenameKey]) {
          return fields[filenameKey];
        }
        // Check if the value is a schoolClosings-style JSON object with regionId/zoneId
        const rawValue = fields[fieldName];
        if (rawValue && rawValue.startsWith('{')) {
          try {
            const parsed = JSON.parse(rawValue);
            if (parsed.regionId !== undefined || parsed.zoneId !== undefined) {
              const parts: string[] = [];
              if (parsed.regionId) parts.push(`Region: ${parsed.regionId}`);
              if (parsed.zoneId) parts.push(`Zone: ${parsed.zoneId}`);
              return parts.join(', ') || '';
            }
          } catch {
            // Not valid JSON, fall through
          }
        }
        return rawValue || '';
      });

      // Clean up empty placeholders and extra spaces
      result = result.replace(/\s+/g, ' ').trim();

      // If the result is empty or only whitespace, fall back to item name
      if (!result) {
        return item.name;
      }

      return result;
    }

    // Default behavior: show item name with up to 2 fields
    if (Object.keys(fields).length > 0) {
      const fieldsToShow: string[] = [];

      Object.entries(fields).forEach(([key, value]) => {
        // Skip internal fields (starting with __)
        if (key.startsWith('__')) {
          return;
        }

        // Check for display-friendly versions first
        // Priority: locationNames (array) > locationName (single) > electionName > filename > raw value
        const locationNamesKey = `__${key}_locationNames`;
        const locationNameKey = `__${key}_locationName`;
        const electionNameKey = `__${key}_electionName`;
        const filenameKey = `__${key}_filename`;
        if (fields[locationNamesKey]) {
          // Show location names (array) joined
          try {
            const names = JSON.parse(fields[locationNamesKey]);
            if (Array.isArray(names)) {
              fieldsToShow.push(`${key}: ${names.join(' / ')}`);
              return;
            }
          } catch {
            // Fall through
          }
        }
        if (fields[locationNameKey]) {
          // Show location name instead of ID
          fieldsToShow.push(`${key}: ${fields[locationNameKey]}`);
        } else if (fields[electionNameKey]) {
          // Show election name instead of ID
          fieldsToShow.push(`${key}: ${fields[electionNameKey]}`);
        } else if (fields[filenameKey]) {
          // Show filename instead of URL
          fieldsToShow.push(`${key}: ${fields[filenameKey]}`);
        } else if (value) {
          // Check if it's a schoolClosings-style JSON object with regionId/zoneId
          if (typeof value === 'string' && value.startsWith('{')) {
            try {
              const parsed = JSON.parse(value);
              if (parsed.regionId !== undefined || parsed.zoneId !== undefined) {
                const parts: string[] = [];
                if (parsed.regionId) parts.push(`Region: ${parsed.regionId}`);
                if (parsed.zoneId) parts.push(`Zone: ${parsed.zoneId}`);
                if (parts.length > 0) {
                  fieldsToShow.push(`${key}: ${parts.join(', ')}`);
                  return;
                }
              }
            } catch {
              // Not valid JSON, fall through
            }
          }
          // Regular field
          fieldsToShow.push(`${key}: ${value}`);
        }
      });

      // If no fields to show after filtering, fall back to item name
      if (fieldsToShow.length === 0) {
        return item.name;
      }

      const fieldsString = fieldsToShow.slice(0, 2).join(', ');
      const moreFields = fieldsToShow.length > 2
        ? ` (+${fieldsToShow.length - 2} more)`
        : '';
      return `${item.name} [${fieldsString}${moreFields}]`;
    }

    // Fallback to item name if fields are empty or couldn't be loaded
    return item.name;
  };

  // Set up real-time subscription for template changes
  useEffect(() => {
    // Subscribe to changes in the templates table
    const channel = supabase
      .channel('template-changes')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'templates'
        },
        (payload) => {
          console.log('Template deleted:', payload);
          refreshTemplates();
          setSnackbarMessage("Template deleted - refreshing content...");
          setSnackbarSeverity("info");
          setSnackbarOpen(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshTemplates]);


  // Set up real-time subscription for content changes
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout;
    let changeCount = 0;
    
    // Subscribe to changes in the content table
    const channel = supabase
      .channel('content-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'content'
        },
        (payload) => {
          console.log('Content table changed:', payload);
          
          // Skip if we're in the middle of a user operation
          const now = Date.now();
          if (isDragging || (lastOperation && now - lastOperation.timestamp < 2000)) {
            console.log('Skipping auto-refresh during user operation');
            return;
          }
          
          // Increment change count
          changeCount++;
          
          // Clear existing timeout
          if (refreshTimeout) {
            clearTimeout(refreshTimeout);
          }
          
          // Set a new timeout to batch multiple changes
          refreshTimeout = setTimeout(() => {
            console.log(`Auto-refreshing content after ${changeCount} changes...`);
            changeCount = 0;
            
            // Show notification for cascade deletes
            if (payload.eventType === 'DELETE') {
              setSnackbarMessage("Content updated - items may have been deleted");
              setSnackbarSeverity("info");
              setSnackbarOpen(true);
            }
            
            refreshContent();
          }, 1000); // Wait 1 second to batch changes
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [isDragging, lastOperation, refreshContent]);

  // Simplified initial content processing - NO field loading
  useEffect(() => {
    if (!content) return;
    
    const buildTree = (items: any[], parentId: string | null = null): TreeNode[] => {
      return items
        .filter(item => item.parent_id === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(item => ({
          ...item,
          children: buildTree(items, item.id),
          template_name: item.type === 'item' && item.template_id 
            ? templates.find(t => t.id === item.template_id)?.name 
            : undefined,
          fields: loadedFieldsMap[item.id] || {} // Use cached fields if available
        }));
    };
    
    const tree = buildTree(content);
    setRowData(tree);
  }, [content, templates, templateSettings, loadedFieldsMap]);

  // Load fields for visible items only
  // Update loadVisibleItemFields to prevent feedback loops
  const loadVisibleItemFields = useCallback(async () => {
    if (!gridRef.current?.api || isUpdatingFields) return; // Prevent re-entry

    const itemsToLoad: string[] = [];
    const startRow = gridRef.current.api.getFirstDisplayedRowIndex();
    const endRow = gridRef.current.api.getLastDisplayedRowIndex();

    // Collect visible items that need fields
    for (let i = startRow; i <= endRow; i++) {
      const rowNode = gridRef.current.api.getDisplayedRowAtIndex(i);
      if (rowNode?.data?.type === 'item' &&
          rowNode.data.template_id &&
          !loadedFieldsMap[rowNode.data.id] &&
          !loadingFields.has(rowNode.data.id)) {
        itemsToLoad.push(rowNode.data.id);
      }
    }

    if (itemsToLoad.length === 0) return;
    
    // Set flag to prevent re-entry
    setIsUpdatingFields(true);
    
    // Mark items as loading
    setLoadingFields(prev => {
      const newSet = new Set(prev);
      itemsToLoad.forEach(id => newSet.add(id));
      return newSet;
    });
    
    try {
      // Batch load fields
      const { data: fields, error } = await supabase
        .from('item_tabfields')
        .select('item_id, name, value')
        .in('item_id', itemsToLoad);
      
      if (error) throw error;
      
      // Process results
      const newFieldsMap: Record<string, Record<string, any>> = {};
      fields?.forEach(field => {
        if (!newFieldsMap[field.item_id]) {
          newFieldsMap[field.item_id] = {};
        }
        newFieldsMap[field.item_id][field.name] = field.value;
      });
      
      // Update the loaded fields map
      setLoadedFieldsMap(prev => ({ ...prev, ...newFieldsMap }));
      
      // Clear loading state
      setLoadingFields(prev => {
        const newSet = new Set(prev);
        itemsToLoad.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      // Update only the specific cells that changed, not the entire grid
      if (gridRef.current?.api) {
        const nodesToRefresh: any[] = [];
        gridRef.current.api.forEachNode((node: any) => {
          if (node.data && newFieldsMap[node.data.id]) {
            nodesToRefresh.push(node);
          }
        });
        
        // Use refreshCells with specific nodes to avoid full refresh
        if (nodesToRefresh.length > 0) {
          gridRef.current.api.refreshCells({
            rowNodes: nodesToRefresh,
            columns: ['name'], // Only refresh the name column
            force: true
          });
        }
      }
    } catch (error) {
      console.error('Error loading visible item fields:', error);
      
      // Clear loading state on error
      setLoadingFields(prev => {
        const newSet = new Set(prev);
        itemsToLoad.forEach(id => newSet.delete(id));
        return newSet;
      });
    } finally {
      // Clear the updating flag after a short delay
      setTimeout(() => {
        setIsUpdatingFields(false);
      }, 100);
    }
  }, [loadedFieldsMap, loadingFields, isUpdatingFields]);

  // Increment version when content meaningfully changes
  useEffect(() => {
    contentVersionRef.current += 1;
  }, [content?.length]); // Only increment on length change

  useEffect(() => {
    // Only load if version changed
    if (contentVersionRef.current === lastLoadedVersionRef.current) {
      return; // Already loaded for this version
    }
    
    if (content && content.length > 0) {
      const loadFieldsTimer = setTimeout(() => {
        loadVisibleItemFields();
        lastLoadedVersionRef.current = contentVersionRef.current;
      }, 100);
      
      return () => clearTimeout(loadFieldsTimer);
    }
  }, [contentVersionRef.current]);

  useEffect(() => {
    if (rowData && rowData.length > 0 && gridRef.current?.api) {
      const newItems = rowData.filter(item => !loadedItemsRef.current.has(item.id));
      
      if (newItems.length > 0) {
        setTimeout(() => {
          loadVisibleItemFields();
          newItems.forEach(item => loadedItemsRef.current.add(item.id));
        }, 200);
      }
    }
  }, [rowData.length]);

  const onBodyScroll = useCallback(() => {
    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Debounce scroll events to avoid too many loads
    scrollTimeoutRef.current = setTimeout(() => {
      loadVisibleItemFields();
    }, 150); // Wait 150ms after scroll stops
  }, [loadVisibleItemFields]);
  
  // Add this useEffect to see what data is being passed to the form
  useEffect(() => {
    if (editItemDialogOpen) {
      console.log('Edit dialog opened with fields:', itemFields);
      console.log('Selected template:', selectedTemplate);
    }
  }, [editItemDialogOpen, itemFields, selectedTemplate]);
  
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

  const getRows = (nodes: TreeNode[], parentIdPath: string[] = []): TreeNodeWithPaths[] => {
    let allRows: TreeNodeWithPaths[] = [];
    
    // Ensure nodes is always treated as an array
    const nodeArray = Array.isArray(nodes) ? nodes : [];
    
    nodeArray.forEach((node: TreeNode) => {
      // Build ID path for tree structure
      const currentIdPath = [...parentIdPath, node.id];
      
      // Build display path (names) for visual purposes
      const currentDisplayPath = parentIdPath.map(id => {
        // Find node name by ID
        const foundNode = content.find(item => item.id === id);
        return foundNode ? foundNode.name : id;
      });
      
      const displayName = node.type === 'item' ? formatItemName(node) : node.name;
      currentDisplayPath.push(displayName);
      
      const row: TreeNodeWithPaths = {
        ...node,
        idPath: currentIdPath, // For path calculation
        treePath: currentDisplayPath, // For display
        displayName: displayName
      };
      
      allRows.push(row);
      
      if (node.children && node.children.length > 0) {
        const childRows = getRows(node.children, currentIdPath);
        allRows = [...allRows, ...childRows];
      }
    });
    
    return allRows;
  };

  const flattenedRows = useMemo(() => {
    const allRows = getRows(rowData);

    if (!hideInactive) {
      return allRows;
    }

    // When hiding inactive, filter rows whose schedule is not currently active
    // Types with schedules: 'bucket', 'item' (and potentially 'playlist' in channel context)
    // Keep bucketFolder and itemFolder visible if they have active descendants
    const schedulableTypes = ['bucket', 'item'];

    // First, find all active row IDs
    const activeRowIds = new Set<string>();

    allRows.forEach(row => {
      if (schedulableTypes.includes(row.type)) {
        if (isScheduleActive(row.schedule, currentTime)) {
          activeRowIds.add(row.id);
          // Also add all ancestor IDs to keep parent folders visible
          if (row.idPath) {
            row.idPath.forEach((ancestorId: string) => activeRowIds.add(ancestorId));
          }
        }
      } else {
        // Non-schedulable types (folders) - keep them by default, they'll be filtered if empty
        activeRowIds.add(row.id);
      }
    });

    // For folders, only keep them if they have active descendants
    const hasActiveDescendant = (nodeId: string): boolean => {
      const directChildren = allRows.filter(r => r.idPath && r.idPath[r.idPath.length - 2] === nodeId);
      return directChildren.some(child => {
        if (schedulableTypes.includes(child.type)) {
          return isScheduleActive(child.schedule, currentTime);
        }
        // For folders, check their descendants
        return hasActiveDescendant(child.id);
      });
    };

    return allRows.filter(row => {
      if (schedulableTypes.includes(row.type)) {
        return isScheduleActive(row.schedule, currentTime);
      }
      // For folders, keep them if they have active descendants
      return hasActiveDescendant(row.id);
    });
  }, [rowData, hideInactive, currentTime]);
  
  const getDataPath = (data: TreeNode): string[] => {
    // Use IDs for path instead of names to ensure uniqueness
    return (data as any).idPath || [];
  };
  
  // The getUniqueNameInLevel function is already updated in the content provided
  const getUniqueNameInLevel = (name: string, siblings: TreeNode[], itemType?: string): string => {
    // For buckets, check against ALL buckets
    if (itemType === 'bucket') {
      const allBucketNames = getAllBucketNames();
      
      if (!allBucketNames.includes(name)) {
        return name;
      }
      
      // Extract the base name
      const match = name.match(/^(.*?)(\d*)$/);
      const baseName = match ? match[1].trim() : name;
      
      // Find all existing numbers for this base name across ALL buckets
      const existingNumbers: number[] = [];
      allBucketNames.forEach(bucketName => {
        const nodeMatch = bucketName.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d+)$`));
        if (nodeMatch && nodeMatch[1]) {
          const num = parseInt(nodeMatch[1], 10);
          if (!isNaN(num)) {
            existingNumbers.push(num);
          }
        }
      });
      
      // Sort existing numbers
      existingNumbers.sort((a, b) => a - b);
      
      // If there are no numbers, start with 1
      if (existingNumbers.length === 0) {
        return `${baseName} 1`;
      }
      
      // Find the first gap in the sequence
      let expectedNumber = 1;
      for (const num of existingNumbers) {
        if (num > expectedNumber) {
          break;
        }
        expectedNumber = num + 1;
      }
      
      return `${baseName} ${expectedNumber}`;
    }
    
    // Original logic for non-buckets
    if (!siblings?.some(node => node.name === name)) {
      return name;
    }
    
    const match = name.match(/^(.*?)(\d*)$/);
    const baseName = match ? match[1].trim() : name;
    
    const existingNumbers: number[] = [];
    siblings.forEach(node => {
      const nodeMatch = node.name.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d+)$`));
      if (nodeMatch && nodeMatch[1]) {
        const num = parseInt(nodeMatch[1], 10);
        if (!isNaN(num)) {
          existingNumbers.push(num);
        }
      }
    });
    
    existingNumbers.sort((a, b) => a - b);
    
    if (existingNumbers.length === 0) {
      return `${baseName} 1`;
    }
    
    let expectedNumber = 1;
    for (const num of existingNumbers) {
      if (num > expectedNumber) {
        break;
      }
      expectedNumber = num + 1;
    }
    
    return `${baseName} ${expectedNumber}`;
  };
  
  const findParentNode = (nodes: TreeNode[], targetId: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.children?.some(child => child.id === targetId)) {
        return node;
      }
      if (node.children) {
        const parent = findParentNode(node.children, targetId);
        if (parent) return parent;
      }
    }
    return null;
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

  const updateTreeNode = (
    nodes: TreeNode[],
    id: string,
    updater: (node: TreeNode) => TreeNode
  ): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        return updater(node);
      }
      if (node.children) {
        return { ...node, children: updateTreeNode(node.children, id, updater) };
      }
      return node;
    });
  };

  const findAndRemoveNode = (
    nodes: TreeNode[],
    id: string
  ): [TreeNode | null, TreeNode[]] => {
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

  // Check if grid is in sync with expected data
  const isGridInSync = useCallback((expectedData: TreeNode[]) => {
    if (!gridRef.current?.api) return false;
    
    const expectedFlattened = getRows(expectedData);
    const displayedCount = gridRef.current.api.getDisplayedRowCount();
    
    if (displayedCount !== expectedFlattened.length) return false;
    
    for (let i = 0; i < Math.min(displayedCount, expectedFlattened.length); i++) {
      const expectedRow = expectedFlattened[i];
      const rowNode = gridRef.current.api.getDisplayedRowAtIndex(i);
      if (!rowNode || rowNode.data.id !== expectedRow.id) {
        return false;
      }
    }
    
    return true;
  }, []);

  const maintainSelection = useCallback((newData: TreeNode[]) => {
    setRowData(newData);
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

  const isValidDrop = (dragNode: any, dropNode: any): boolean => {
    if (!dropNode) return false;
    const dragType = dragNode.data.type;
    const dropType = dropNode.data.type;
    if (dragType === 'bucketFolder') {
      // Allow bucketFolder to be dropped on any node - we'll find the correct
      // bucketFolder position in onRowDragEnd based on the overNode's parent
      return true;
    }
    if (dragType === 'bucket') {
      return dropType === 'bucketFolder' || dropType === 'bucket';
    }
    if (dragType === 'itemFolder') {
      return dropType === 'bucket' || dropType === 'itemFolder';
    }
    if (dragType === 'item') {
      return dropType === 'itemFolder' || dropType === 'item' || dropType === 'bucket';
    }
    return false;
  };

  
  // Track when drag starts and provide visual feedback
  const onRowDragMove = useCallback((event: any) => {
    if (!isDragging) {
      setIsDragging(true);

      // Disable animations for better performance during drag
      if (gridRef.current?.api) {
        gridRef.current.api.setGridOption('animateRows', false);
      }
    }

    // Add visual feedback for drag over
    const { overNode, y } = event;

    // Remove any existing drag classes from ALL row elements (pinned + viewport)
    document.querySelectorAll('.ag-row-drag-target-above, .ag-row-drag-target-below').forEach(el => {
      el.classList.remove('ag-row-drag-target-above', 'ag-row-drag-target-below');
    });

    if (overNode && gridRef.current?.api) {
      // Get ALL row elements with the same row-id (handles pinned columns + main viewport)
      const rowElements = document.querySelectorAll(`[row-id="${overNode.id}"]`);
      if (rowElements.length > 0) {
        // Use the first element for position calculation
        const rect = rowElements[0].getBoundingClientRect();

        // IMPORTANT: event.y is relative to the grid viewport, not the screen
        // Use event.event.clientY for screen coordinates that match getBoundingClientRect
        const clientY = event.event?.clientY ?? y;
        const midpoint = rect.top + rect.height / 2;
        let dropBelow = clientY >= midpoint;

        // Special case: when dragging a bucketFolder over another bucketFolder,
        // use the bottom 25% of the row to trigger "drop below" - this makes it
        // easier to drop after a bucketFolder even when its children are expanded
        const dragNode = event.node;
        if (dragNode?.data?.type === 'bucketFolder' && overNode.data.type === 'bucketFolder') {
          const bottomQuarter = rect.top + rect.height * 0.75;
          if (clientY >= bottomQuarter) {
            dropBelow = true;
          }
        }

        const className = dropBelow ? 'ag-row-drag-target-below' : 'ag-row-drag-target-above';

        // Store the drop target info for use in onRowDragEnd
        dropTargetRef.current = { nodeId: overNode.id, dropBelow };

        // Add class to ALL matching row elements
        rowElements.forEach(el => {
          el.classList.add(className);
        });
      }
    }
  }, [isDragging]);

  const onRowDragLeave = useCallback(() => {
    // Clean up any drag indicator classes from ALL row elements
    document.querySelectorAll('.ag-row-drag-target-above, .ag-row-drag-target-below').forEach(el => {
      el.classList.remove('ag-row-drag-target-above', 'ag-row-drag-target-below');
    });
  }, []);

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

    if (!overNode || !isValidDrop(node, overNode)) {
      setIsDragging(false);
      return;
    }

    setLastOperation({ type: 'drag', timestamp: Date.now() });

    // Store the original data for verification and rollback
    const initialData = JSON.parse(JSON.stringify(rowData));

    // Important: Capture the original parent ID and original name BEFORE any modifications
    const originalNodeData = node.data;
    const originalNodeId = originalNodeData.id;
    const originalNodeName = originalNodeData.name;

    // Find original parent ID directly from the flat content structure
    const originalParentId = content.find(item => item.id === originalNodeId)?.parent_id || null;

    // Step 1: Remove the dragged node from the tree - but keep the original intact
    const [draggedNode, intermediateData] = findAndRemoveNode(rowData, node.data.id);
    if (!draggedNode) {
      setIsDragging(false);
      return;
    }

    // Step 2: Make a deep copy of the dragged node to avoid reference issues
    const draggedNodeCopy = JSON.parse(JSON.stringify(draggedNode));

    // Use drop direction from the visual indicator (more accurate than index calculation)
    // This ensures we drop where the blue line was shown
    const dropBelow = dropTargetInfo?.dropBelow ?? (flattenedRows.findIndex(row => row.id === draggedNode.id) < flattenedRows.findIndex(row => row.id === overNode.data.id));

    let finalData: TreeNode[] = [];
    let updatePromises: Promise<any>[] = [];
    let targetIndex = -1;
    let targetParentId: string | null | undefined = undefined;

    try {
      // Process based on the type of the dragged node.
      switch (draggedNodeCopy.type) {
        // ─── Case 1: bucketFolder (top-level reordering) ───────────────────────────
        case 'bucketFolder': {
          // For top-level folders, parent is always null
          targetParentId = null;

          // Find the target bucketFolder - if overNode is not a bucketFolder,
          // find its root ancestor (bucketFolder)
          let targetBucketFolderId = overNode.data.id;
          let hoveredOverChild = false;
          if (overNode.data.type !== 'bucketFolder') {
            hoveredOverChild = true;
            // Find the root bucketFolder for this node by traversing up
            let currentId = overNode.data.id;
            let parent = findParentNode(intermediateData, currentId);
            while (parent) {
              if (parent.type === 'bucketFolder') {
                targetBucketFolderId = parent.id;
                break;
              }
              currentId = parent.id;
              parent = findParentNode(intermediateData, currentId);
            }
            // If we couldn't find a bucketFolder ancestor, it might be directly under root
            if (!parent) {
              // Check if this node is directly in intermediateData (it's a bucketFolder itself)
              const directMatch = intermediateData.find(n => n.id === overNode.data.id);
              if (directMatch) {
                targetBucketFolderId = directMatch.id;
              }
            }
          }

          let targetIndex = intermediateData.findIndex(n => n.id === targetBucketFolderId);
          if (targetIndex === -1) {
            setIsDragging(false);
            return;
          }
          // When hovering over a child node, always place after the parent bucketFolder
          // (since we're inside that folder's expanded content)
          if (hoveredOverChild || dropBelow) {
            targetIndex++;
          }
          finalData = [
            ...intermediateData.slice(0, targetIndex),
            draggedNodeCopy,
            ...intermediateData.slice(targetIndex)
          ];
  
          // Update the dragged folder - preserve original name
          updatePromises.push(
            updateContent(draggedNodeCopy.id, {
              parent_id: undefined,
              name: originalNodeName, // Preserve the original name
              order: targetIndex
            }).catch(err => {
              console.error(err);
              return { error: true };
            })
          );
  
          // Update order of other folders
          finalData.forEach((folder, index) => {
            if (folder.id !== draggedNodeCopy.id) {
              updatePromises.push(
                updateContent(folder.id, { order: index })
                  .catch(err => {
                    console.error(err);
                    return { error: true };
                  })
              );
            }
          });
          break;
        }
      
        // ─── Case 2: bucket (should be dropped into a bucketFolder) ──────────────
        case 'bucket': {
          // Determine target folder ID
          if (overNode.data.type === 'bucketFolder') {
            targetParentId = overNode.data.id;
          } else if (overNode.data.type === 'bucket') {
            const parent = findParentNode(intermediateData, overNode.data.id);
            targetParentId = parent?.id || null;
          }

          // EDGE CASE FIX: If dropping "above" a sibling bucketFolder,
          // the user likely intended to drop at the END of their original bucketFolder.
          // This happens when dragging below the last bucket - AG Grid reports the
          // next sibling bucketFolder as the overNode with dropBelow=false.
          if (!dropBelow && overNode.data.type === 'bucketFolder' && targetParentId !== originalParentId) {
            // Check if the original folder is immediately before the target folder in the tree
            // If so, the user was trying to drop at the end of their original folder
            const targetFolderIndex = intermediateData.findIndex(f => f.id === targetParentId);
            const originalFolderIndex = intermediateData.findIndex(f => f.id === originalParentId);

            // If original folder is immediately before target folder, keep in original folder
            if (originalFolderIndex >= 0 && targetFolderIndex >= 0 && originalFolderIndex === targetFolderIndex - 1) {
              targetParentId = originalParentId;
            }
          }

          if (!targetParentId) {
            setIsDragging(false);
            return;
          }

          // Find the target folder
          const targetFolder = intermediateData.find(n => n.id === targetParentId);
          if (!targetFolder) {
            setIsDragging(false);
            return;
          }

          // Ensure the folder has a children array
          let children = targetFolder.children ? [...targetFolder.children] : [];

          // Determine if this is a same-parent move
          const sameParent = originalParentId === targetParentId;

          // Determine insert position
          if (sameParent && overNode.data.type === 'bucketFolder') {
            // Edge case: dropping at end of original folder (overNode is next sibling folder)
            targetIndex = children.length;
          } else {
            targetIndex = children.findIndex(child => child.id === overNode.data.id);
            if (targetIndex === -1) targetIndex = children.length;
            if (dropBelow) {
              targetIndex++;
            }
          }

          // Determine final name: keep original if same parent, otherwise ensure uniqueness
          const finalNodeName = sameParent
            ? originalNodeName
            : getUniqueNameInLevel(originalNodeName, children);

          // Set the name in the node copy
          draggedNodeCopy.name = finalNodeName;

          // Create the new list of children
          const newChildren = [
            ...children.slice(0, targetIndex),
            draggedNodeCopy,
            ...children.slice(targetIndex)
          ];
          
          // Create the final data structure
          finalData = intermediateData.map(folder => {
            if (folder.id === targetParentId) {
              return { ...folder, children: newChildren };
            }
            return folder;
          });
  
          // Update the dragged bucket
          updatePromises.push(
            updateContent(draggedNodeCopy.id, {
              parent_id: targetParentId,
              name: finalNodeName,
              order: targetIndex
            }).catch(err => {
              console.error(err);
              return { error: true };
            })
          );
  
          // Update order of other buckets
          newChildren.forEach((bucket, index) => {
            if (bucket.id !== draggedNodeCopy.id) {
              updatePromises.push(
                updateContent(bucket.id, { order: index })
                  .catch(err => {
                    console.error(err);
                    return { error: true };
                  })
              );
            }
          });
          break;
        }
      
        // ─── Case 3: itemFolder (should be dropped into a bucket) ───────────────────
        case 'itemFolder': {
          // Determine target bucket
          if (overNode.data.type === 'bucket') {
            targetParentId = overNode.data.id;
          } else if (overNode.data.type === 'item' || overNode.data.type === 'itemFolder') {
            const parent = findParentNode(intermediateData, overNode.data.id);
            targetParentId = parent?.id || null;
          }

          // EDGE CASE FIX: If dropping "above" a sibling bucket,
          // the user likely intended to drop at the END of their original bucket.
          // This happens when dragging below the last itemFolder - AG Grid reports the
          // next sibling bucket as the overNode with dropBelow=false.
          if (!dropBelow && overNode.data.type === 'bucket' && targetParentId && targetParentId !== originalParentId) {
            // Check if the original bucket is immediately before the target bucket in the parent folder
            const parentFolder = findParentNode(intermediateData, targetParentId);
            if (parentFolder?.children) {
              const targetBucketIndex = parentFolder.children.findIndex(b => b.id === targetParentId);
              const originalBucketIndex = parentFolder.children.findIndex(b => b.id === originalParentId);

              // If original bucket is immediately before target bucket, keep in original bucket
              if (originalBucketIndex >= 0 && targetBucketIndex >= 0 && originalBucketIndex === targetBucketIndex - 1) {
                targetParentId = originalParentId;
              }
            }
          }

          if (!targetParentId) {
            setIsDragging(false);
            return;
          }

          // Find the target bucket
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

          const targetBucket = findNode(intermediateData, targetParentId);
          if (!targetBucket) {
            setIsDragging(false);
            return;
          }

          // Ensure the bucket has a children array
          let children = targetBucket.children ? [...targetBucket.children] : [];

          // Determine if this is a same-parent move
          const sameParent = originalParentId === targetParentId;

          // Determine insert position
          if (overNode.data.type === 'bucket') {
            // If dropping directly on a bucket, add at the end
            targetIndex = children.length;
          } else {
            // If dropping relative to an item or folder, position accordingly
            targetIndex = children.findIndex(child => child.id === overNode.data.id);
            if (targetIndex === -1) targetIndex = children.length;
            if (dropBelow) {
              targetIndex++;
            }
          }
          
          // Determine final name: keep original if same parent, otherwise ensure uniqueness
          const finalNodeName = sameParent 
            ? originalNodeName 
            : getUniqueNameInLevel(originalNodeName, children);
          
          // Set the name in the node copy
          draggedNodeCopy.name = finalNodeName;
          
          // Create updated data by recursively finding and updating the target bucket
          const updateBucketChildren = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.map(node => {
              if (node.id === targetParentId) {
                const newChildren = [
                  ...children.slice(0, targetIndex),
                  draggedNodeCopy,
                  ...children.slice(targetIndex)
                ];
                return { ...node, children: newChildren };
              } 
              if (node.children) {
                return { ...node, children: updateBucketChildren(node.children) };
              }
              return node;
            });
          };
          
          finalData = updateBucketChildren(intermediateData);
  
          // Update the dragged folder
          updatePromises.push(
            updateContent(draggedNodeCopy.id, {
              parent_id: targetParentId,
              name: finalNodeName,
              order: targetIndex
            }).catch(err => {
              console.error(err);
              return { error: true };
            })
          );
  
          // Update order of other items in the bucket
          const updatedChildren = [...children.slice(0, targetIndex), draggedNodeCopy, ...children.slice(targetIndex)];
          
          updatedChildren.forEach((item, index) => {
            if (item.id !== draggedNodeCopy.id) {
              updatePromises.push(
                updateContent(item.id, { order: index })
                  .catch(err => {
                    console.error(err);
                    return { error: true };
                  })
              );
            }
          });
          break;
        }
      
        // ─── Case 4: item (can be dropped into an itemFolder or directly into a bucket) ─
        case 'item': {
          // Helper to find container
          const findContainer = (nodes: TreeNode[], id: string): TreeNode | null => {
            for (const node of nodes) {
              if (node.id === id) return node;
              if (node.children) {
                const found = findContainer(node.children, id);
                if (found) return found;
              }
            }
            return null;
          };

          // Determine target container
          if (overNode.data.type === 'itemFolder' || overNode.data.type === 'bucket') {
            targetParentId = overNode.data.id;
          } else if (overNode.data.type === 'item') {
            const parent = findParentNode(intermediateData, overNode.data.id);
            targetParentId = parent?.id || null;
          }

          // EDGE CASE FIX: If dropping "above" a sibling bucket/container,
          // the user likely intended to drop at the END of their original container.
          // This happens when dragging below the last item - AG Grid reports the
          // next sibling container as the overNode with dropBelow=false (above it).
          if (!dropBelow && (overNode.data.type === 'bucket' || overNode.data.type === 'itemFolder') && targetParentId && targetParentId !== originalParentId) {
            // Check if the original container is immediately before the target container
            const parentOfTarget = findParentNode(intermediateData, targetParentId);
            if (parentOfTarget?.children) {
              const targetContainerIndex = parentOfTarget.children.findIndex(c => c.id === targetParentId);
              const originalContainerIndex = parentOfTarget.children.findIndex(c => c.id === originalParentId);

              // If original container is immediately before target container, keep in original
              if (originalContainerIndex >= 0 && targetContainerIndex >= 0 && originalContainerIndex === targetContainerIndex - 1) {
                targetParentId = originalParentId;
              }
            }
          }

          if (!targetParentId) {
            setIsDragging(false);
            return;
          }

          const targetContainer = findContainer(intermediateData, targetParentId);
          if (!targetContainer) {
            console.error('Target container not found after removal of dragged item');
            setIsDragging(false);
            return;
          }

          // Ensure the container has a children array
          let children = targetContainer.children ? [...targetContainer.children] : [];

          // Determine if this is a same-parent move
          const sameParent = originalParentId === targetParentId;

          // Calculate the position to insert
          if (overNode.data.type === 'itemFolder' || overNode.data.type === 'bucket') {
            // Dropping directly on a container, add at the end
            targetIndex = children.length;
          } else if (sameParent && findParentNode(intermediateData, overNode.data.id)?.id !== targetParentId) {
            // Edge case: dropping at end of original bucket (overNode is in next bucket)
            targetIndex = children.length;
          } else {
            // Dropping relative to another item
            targetIndex = children.findIndex(child => child.id === overNode.data.id);
            if (targetIndex === -1) {
              targetIndex = children.length;
            } else if (dropBelow) {
              targetIndex++;
            }
          }
          
          // Determine final name: keep original if same parent, otherwise ensure uniqueness
          const finalNodeName = sameParent 
            ? originalNodeName 
            : getUniqueNameInLevel(originalNodeName, children);
          
          // Set the name in the node copy
          draggedNodeCopy.name = finalNodeName;
          
          // Create updated data by recursively finding and updating the target container
          const updateContainerChildren = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.map(node => {
              if (node.id === targetParentId) {
                const newChildren = [
                  ...children.slice(0, targetIndex),
                  draggedNodeCopy,
                  ...children.slice(targetIndex)
                ];
                return { ...node, children: newChildren };
              }
              if (node.children) {
                return { ...node, children: updateContainerChildren(node.children) };
              }
              return node;
            });
          };
          
          finalData = updateContainerChildren(intermediateData);
          
          // Update the dragged item
          updatePromises.push(
            updateContent(draggedNodeCopy.id, {
              parent_id: targetParentId,
              name: finalNodeName,
              order: targetIndex
            }).catch(err => {
              console.error('Error updating dragged item:', err);
              return { error: true };
            })
          );
  
          // Update order of other items in the container
          const updatedChildren = [...children.slice(0, targetIndex), draggedNodeCopy, ...children.slice(targetIndex)];
          
          updatedChildren.forEach((item, index) => {
            if (item.id !== draggedNodeCopy.id) {
              updatePromises.push(
                updateContent(item.id, { order: index })
                  .catch(err => {
                    console.error('Error updating item order:', err);
                    return { error: true };
                  })
              );
            }
          });
          break;
        }
      
        default:
          finalData = intermediateData;
          break;
      }
    } catch (error) {
      console.error('Error during drag and drop:', error);
      // In case of any error, revert to the initial data
      setRowData(initialData);
      setIsDragging(false);
      return;
    }
    
    // Update grid using applyTransaction for minimal visual updates
    const flattenedFinalRows = getRows(finalData);
    if (gridRef.current?.api) {
      gridRef.current.api.applyTransaction({ update: flattenedFinalRows });
    }

    // Execute all database updates
    Promise.all(updatePromises).then((results) => {
      const failedUpdates = results.filter(res => res && res.error);
      if (failedUpdates.length > 0) {
        refreshContentIfNeeded(finalData);
      } else {
        // Only update React state after successful DB update to avoid flicker
        setRowData(finalData);
      }
    }).catch(error => {
      console.error('Error updating database:', error);
      refreshContentIfNeeded(initialData);
    });
    
    // Reset dragging state after a delay (animations stay disabled for better performance)
    setTimeout(() => {
      setIsDragging(false);
      restoreExpandedState();
    }, 100);
    
  }, [rowData, flattenedRows, isDragging, isValidDrop, lastOperation, updateContent, refreshContentIfNeeded, isGridInSync, content]);

  // Get icon for node type for delete dialog
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'bucketFolder':
        return <CreateNewFolderIcon fontSize="small" />;
      case 'bucket':
        return <ShoppingBasketIcon fontSize="small" />;
      case 'itemFolder':
        return <FolderIcon fontSize="small" />;
      case 'item':
        return <InsertDriveFileIcon fontSize="small" />;
      default:
        return null;
    }
  };

  // Helper function to open item edit dialog with optional initial tab
  const openItemEditDialog = useCallback((data: TreeNode, initialTab: number = 0) => {
    setItemFields({ name: data.name });
    setEditingItem(data);
    setItemDuration(data.duration || null);
    setItemSchedule(data.schedule || null);
    setEditItemInitialTab(initialTab);

    refreshTemplates().then(() => {
      setTimeout(() => {
        if (data.template_id) {
          supabase
            .from('templates')
            .select('*')
            .eq('id', data.template_id)
            .single()
            .then(({ data: template, error }) => {
              if (error || !template) {
                setSnackbarMessage("The template for this item no longer exists");
                setSnackbarSeverity("warning");
                setSnackbarOpen(true);
                setSelectedTemplate(null);
              } else {
                setSelectedTemplate(template);

                const loadItemTabfields = async () => {
                  try {
                    const { data: tabfields, error } = await supabase
                      .from('item_tabfields')
                      .select('name, value')
                      .eq('item_id', data.id);

                    if (error) throw error;

                    const fieldsObject: Record<string, any> = {};
                    tabfields.forEach((field: { name: string; value: any }) => {
                      fieldsObject[field.name] = field.value;
                    });

                    setItemFields(prev => ({ ...prev, ...fieldsObject }));
                  } catch (err) {
                    console.error('Error loading item tabfields:', err);
                  }
                };

                loadItemTabfields();
              }
            });
        }

        setEditItemDialogOpen(true);
      }, 100);
    });
  }, [refreshTemplates]);


  const autoGroupColumnDef = useMemo(
    () => ({
      headerName: 'Name',
      minWidth: 300,
      flex: 1,
      rowDrag: true,
      editable: false, // Disable inline editing since we're using dialogs
      suppressClickEdit: true,
      valueGetter: (params: any) => {
        return params.data.type === 'item' ? params.data.displayName : params.data.name;
      },
      field: 'name',
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
        innerRenderer: NameCellRenderer,
        suppressDoubleClickExpand: true,
        checkbox: false
      },
      tooltipValueGetter: (params: any) => {
        return params.data?.type === 'item' ? params.data?.displayName : params.data?.name;
      }
    }),
    []
  );

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


  const columnDefs = useMemo(
    () => [
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
          // Hide for bucketFolder and bucket
          if (params.data && (params.data.type === 'bucketFolder' || params.data.type === 'bucket')) {
            return <span style={{ color: '#ccc' }}>—</span>;
          }
          // Show checkbox for itemFolder and item
          return (
            <AgCheckbox
              checked={params.value}
              onChange={async (newValue) => {
                try {
                  await updateContent(params.data.id, { active: newValue });
                } catch (error) {
                  console.error('Failed to update content active status:', error);
                }
              }}
            />
          );
        },
        initialPinned: 'left' as const,
        editable: false // Set to false since we're handling changes in the renderer
      },
      {
        field: 'template_name',
        headerName: 'Template',
        width: 200,
        cellRenderer: (params: any) => {
          const data = params.data;

          // Only show template for items
          if (!data || data.type !== 'item') {
            return <span style={{ color: 'var(--text-disabled)' }}>—</span>;
          }

          // Show template name or indicate if missing
          if (data.template_name) {
            return (
              <Chip
                label={data.template_name}
                size="small"
                variant="outlined"
                sx={{
                  height: '22px',
                  fontSize: '0.75rem',
                  borderColor: 'var(--primary-blue)',
                  color: 'var(--primary-blue)',
                  '& .MuiChip-label': {
                    px: 1
                  }
                }}
              />
            );
          } else if (data.template_id) {
            // Template ID exists but name not found (template might be deleted)
            return (
              <Chip
                icon={<WarningIcon style={{ fontSize: '14px' }} />}
                label="Missing Template"
                size="small"
                variant="outlined"
                sx={{
                  height: '22px',
                  fontSize: '0.75rem',
                  borderColor: '#ff9800',
                  color: '#ff9800',
                  '& .MuiChip-label': {
                    px: 1
                  },
                  '& .MuiChip-icon': {
                    color: '#ff9800'
                  }
                }}
              />
            );
          } else {
            // No template assigned
            return (
              <span style={{
                color: 'var(--text-muted)',
                fontStyle: 'italic'
              }}>
                No Template
              </span>
            );
          }
        },
        editable: false,
        // Add tooltip to show template ID for debugging
        tooltipField: 'template_id',
        // Allow filtering by template name
        filter: 'agTextColumnFilter',
        filterParams: {
          textMatcher: (params: any) => {
            const filterText = params.filterText.toLowerCase();
            const value = params.value ? params.value.toLowerCase() : '';
            return value.includes(filterText);
          }
        }
      },
      {
        field: 'schedule',
        headerName: 'Schedule',
        width: 300, // Increased width to accommodate schedule display
        cellRenderer: ScheduleCellRenderer,
        cellRendererParams: {
          editableTypes: ['item'], // Only items for content grid
          onEditSchedule: handleEditSchedule
        },
        editable: false, // Disable inline editing since we're using the dialog
        valueGetter: (params: any) =>
          params.data.type === 'item' ? params.data.schedule : '',
        valueSetter: (params: any) => {
          if (params.data.type !== 'item') return false;
          params.data.schedule = params.newValue;
          return true;
        },
        tooltipValueGetter: (params: any) => {
          if (params.data.type !== 'item') return null;
          return formatScheduleTooltip(params.data.schedule);
        }
      },
      {
        field: 'duration',
        headerName: 'Duration',
        width: 120,
        cellRenderer: DurationCellRenderer,
        editable: false,
        filter: 'agNumberColumnFilter'
      }
    ],
    [handleEditSchedule]
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: false,
      filter: true,
      resizable: true,
      floatingFilter: true
    }),
    []
  );

  const onCellValueChanged = useCallback((event: any) => {
    const { data, colDef, newValue } = event;
    
    // Skip if this is an item (should not be editable)
    if (data.type === 'item') return false;
    
    // Skip if we had a recent operation
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    setLastOperation({ type: 'cellChange', timestamp: now });
    
    // Update database
    updateContent(data.id, { [colDef.field]: newValue })
      .catch(error => {
        console.error('Failed to update content:', error);
        // Revert the change in the grid
        if (gridRef.current?.api) {
          gridRef.current.api.applyTransaction({
            update: [{ ...data, [colDef.field]: data[colDef.field] }]
          });
        }
      });

    const updatedData = updateTreeNode(rowData, data.id, (node) => {
      if (colDef.field === 'name') {
        const parent = node.type === 'bucketFolder' ? null : findParentNode(rowData, node.id);
        const siblings = parent ? parent.children || [] : rowData;
        const otherSiblings = siblings.filter(sibling => sibling.id !== node.id);
        const uniqueName = getUniqueNameInLevel(newValue, otherSiblings);
        return { ...node, name: uniqueName };
      }
      return { ...node, [colDef.field]: newValue };
    });
    maintainSelection(updatedData);
    if (colDef.field === 'name') {
      const parent = data.type === 'bucketFolder' ? null : findParentNode(rowData, data.id);
      const siblings = parent ? parent.children || [] : rowData;
      const otherSiblings = siblings.filter(sibling => sibling.id !== data.id);
      const uniqueName = getUniqueNameInLevel(newValue, otherSiblings);
      if (uniqueName !== newValue && gridRef.current?.api) {
        gridRef.current.api.applyTransaction({
          update: [{ ...data, name: uniqueName }]
        });
      }
    }
  }, [rowData, maintainSelection, lastOperation, updateContent]);

  // Optimize selection handling for large selections
  const onSelectionChanged = useCallback(() => {
    if (!gridRef.current?.api) return;

    const selectedRows = gridRef.current.api.getSelectedRows();

    // For very large selections, throttle the update
    if (selectedRows.length > 100) {
      // Debounce the selection update
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      selectionTimeoutRef.current = setTimeout(() => {
        setSelectedNodes(selectedRows);
        setSelectedNode(selectedRows.length === 1 ? selectedRows[0] : null);
      }, 300);
    } else {
      setSelectedNodes(selectedRows);
      setSelectedNode(selectedRows.length === 1 ? selectedRows[0] : null);
    }

    // Redraw all rows to update edit icon background color on selection change
    const allRowNodes: any[] = [];
    gridRef.current.api.forEachNode((node: any) => allRowNodes.push(node));
    gridRef.current.api.redrawRows({ rowNodes: allRowNodes });
  }, []);

  const restoreExpandedState = useCallback(() => {
    if (!gridRef.current?.api) return;
    
    setTimeout(() => {
      const rowNodes: any[] = [];
      gridRef.current.api.forEachNode((node: any) => rowNodes.push(node));
      
      rowNodes.forEach((node: any) => {
        if (node.data && node.data.id && expandedRows.has(node.data.id)) {
          node.setExpanded(true);
        }
      });
    }, 50);
  }, [expandedRows]);

  const onRowGroupOpened = useCallback((event: any) => {
    const { node } = event;
    if (!node.data || !node.data.id) return;

    // Use toggleRowExpanded from context for persistence
    toggleRowExpanded(node.data.id, node.expanded);

    if (node.expanded) {
      // Simple delayed load - no need for multiple timeouts
      setTimeout(() => {
        loadVisibleItemFields();
      }, 200); // Give grid time to render
    }
  }, [toggleRowExpanded, loadVisibleItemFields]);

  // Restore expanded rows whenever the grid data changes
  useEffect(() => {
    if (gridRef.current?.api) {
      restoreExpandedState();
    }
  }, [rowData, restoreExpandedState]);

// Track if ContentPage grid is ready
  const [contentGridReady, setContentGridReady] = useState(false);
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
      // Column state will be restored by the useEffect below when isGridStateLoaded becomes true
      if (!isGridStateLoaded) {
        gridRef.current.api.sizeColumnsToFit();
      } else if (columnState && columnState.length > 0) {
        gridRef.current.api.applyColumnState({ state: columnState, applyOrder: true });
        columnStateRestoredRef.current = true;
      } else {
        gridRef.current.api.sizeColumnsToFit();
      }
      restoreExpandedState();
      setContentGridReady(true);
    }

    // Load fields for initially visible items
    setTimeout(() => {
      loadVisibleItemFields();
    }, 100);
  }, [restoreExpandedState, columnState, isGridStateLoaded]);

  // Restore column state when it becomes available (handles async loading from DB)
  useEffect(() => {
    if (isGridStateLoaded && columnState && columnState.length > 0 && gridRef.current?.api && !columnStateRestoredRef.current) {
      gridRef.current.api.applyColumnState({ state: columnState, applyOrder: true });
      columnStateRestoredRef.current = true;
    }
  }, [isGridStateLoaded, columnState]);

  // Register ChannelPlaylistsPage grid as a drop zone for bucket rows
  useEffect(() => {
    // Only register if both grids are fully ready
    if (!contentGridReady || !channelPlaylistsGridApi || !channelPlaylistsContainer) {
      return;
    }

    const contentGridApi = gridRef.current?.api;
    if (!contentGridApi) {
      return;
    }

    // Check if already registered
    if (dropZoneRegisteredRef.current) {
      return;
    }

    // Small delay to ensure both grids are fully initialized
    const timeoutId = setTimeout(() => {
      try {
        // Get drop zone params from ChannelPlaylistsPage grid
        const dropZoneParams = channelPlaylistsGridApi.getRowDropZoneParams({
          onDragEnter: () => {
            // Add visual indicator when dragging enters the target grid
            channelPlaylistsContainer?.classList.add('cross-grid-drag-over');
          },
          onDragLeave: () => {
            // Remove visual indicator when dragging leaves
            channelPlaylistsContainer?.classList.remove('cross-grid-drag-over');
          },
          onDragStop: (params: any) => {
            // Remove visual indicator
            channelPlaylistsContainer?.classList.remove('cross-grid-drag-over');

            // Get the dropped nodes - filter for buckets only
            const droppedNodes = params.nodes || [];
            const bucketNodes = droppedNodes.filter((node: any) => node.data?.type === 'bucket');

            if (bucketNodes.length === 0) {
              return; // Only allow bucket drops
            }

            // Check if handler is available
            if (!bucketDropHandler.current) {
              console.log('No bucket drop handler available');
              return;
            }

            // Find the target playlist from the ChannelPlaylists grid
            // The overNode indicates where the drop occurred
            const overNode = params.overNode;
            if (!overNode) {
              console.log('No target node for drop');
              return;
            }

            // Determine the target playlist ID
            let targetPlaylistId: string | null = null;
            const targetData = overNode.data;

            if (targetData?.type === 'playlist') {
              targetPlaylistId = targetData.id;
            } else if (targetData?.type === 'bucket') {
              // If dropped on a bucket, use its parent playlist
              // The parent_id field contains the playlist ID for buckets in ChannelPlaylists
              targetPlaylistId = targetData.parent_id || null;
            }
            // Don't allow dropping directly on channels

            if (!targetPlaylistId) {
              console.log('Could not determine target playlist');
              return;
            }

            // Convert to DraggedBucket format
            const draggedBuckets: DraggedBucket[] = bucketNodes.map((node: any) => ({
              id: node.data.id,
              name: node.data.name,
              schedule: node.data.schedule,
              type: 'bucket' as const
            }));

            // Call the drop handler
            bucketDropHandler.current(draggedBuckets, targetPlaylistId);
          }
        });

        // Add the drop zone to ContentPage grid
        contentGridApi.addRowDropZone(dropZoneParams);
        dropZoneRegisteredRef.current = true;

        // Store for cleanup
        registeredDropZones.set('channelPlaylists', dropZoneParams);

        console.log('Cross-grid drop zone registered: ContentPage -> ChannelPlaylistsPage');

      } catch (error) {
        console.error('Failed to register cross-grid drop zone:', error);
      }
    }, 100);

    // Cleanup when component unmounts or dependencies change
    return () => {
      clearTimeout(timeoutId);
      if (dropZoneRegisteredRef.current && contentGridApi) {
        const storedParams = registeredDropZones.get('channelPlaylists');
        if (storedParams) {
          try {
            contentGridApi.removeRowDropZone(storedParams);
          } catch (e) {
            // Grid may already be destroyed
          }
          registeredDropZones.delete('channelPlaylists');
        }
        dropZoneRegisteredRef.current = false;
      }
    };
  }, [contentGridReady, channelPlaylistsGridApi, channelPlaylistsContainer, bucketDropHandler, registeredDropZones]);

  const addBucketFolder = useCallback(() => {
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    setLastOperation({ type: 'addBucketFolder', timestamp: now });
    
    // Open the dialog instead of creating directly
    setEditingBucketFolder(null);
    setBucketFolderDialogOpen(true);
  }, [lastOperation]);
  
  const addBucket = useCallback(() => {
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    setLastOperation({ type: 'addBucket', timestamp: now });
  
    if (!selectedNode || (selectedNode.type !== 'bucketFolder' && selectedNode.type !== 'bucket')) {
      setSnackbarMessage("Please select a bucket folder to add a bucket to");
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }
  
    // Determine parent folder
    let parentFolder;
    let parentId;
    if (selectedNode.type === 'bucket') {
      parentFolder = findParentNode(rowData, selectedNode.id);
      parentId = parentFolder?.id;
    } else {
      parentFolder = selectedNode;
      parentId = selectedNode.id;
    }
    
    if (!parentId || !parentFolder) {
      console.error('Could not find parent folder');
      setSnackbarMessage("Could not find parent folder");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
  
    // Set the target parent and open the dialog
    setTargetParent({
      id: parentId,
      name: parentFolder.name,
      type: 'bucketFolder'
    });
    setEditingBucket(null); // Make sure we're in create mode
    setBucketDialogOpen(true);
  }, [selectedNode, rowData, lastOperation, findParentNode]);
  
  const addItemFolder = useCallback(() => {
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    setLastOperation({ type: 'addItemFolder', timestamp: now });
  
    if (!selectedNode || (selectedNode.type !== 'bucket' && selectedNode.type !== 'itemFolder')) {
      setSnackbarMessage("Please select a bucket or item folder to add a folder to");
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }
  
    // Determine parent container
    let parentContainer;
    if (selectedNode.type === 'itemFolder') {
      parentContainer = findParentNode(rowData, selectedNode.id);
    } else {
      parentContainer = selectedNode;
    }
    
    if (!parentContainer) {
      console.error('Could not find parent container');
      return;
    }
  
    // Set the target parent and open dialog
    setTargetParent({ 
      id: parentContainer.id, 
      name: parentContainer.name, 
      type: parentContainer.type 
    });
    setEditingItemFolder(null);
    setItemFolderDialogOpen(true);
  }, [selectedNode, rowData, lastOperation]);

  const handleSaveBucketFolder = useCallback((bucketFolderData: { name: string; active: boolean }) => {
    if (editingBucketFolder) {
      // Update existing bucket folder
      updateContent(editingBucketFolder.id, {
        name: bucketFolderData.name,
        active: bucketFolderData.active
      })
        .then(() => {
          setBucketFolderDialogOpen(false);
          setEditingBucketFolder(null);
          
          setSnackbarMessage(`Bucket folder "${bucketFolderData.name}" updated successfully`);
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        })
        .catch(error => {
          console.error('Failed to update bucket folder:', error);
          setSnackbarMessage("Failed to update bucket folder");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
    } else {
      // Create new bucket folder
      const newBucketFolder = {
        name: bucketFolderData.name,
        active: bucketFolderData.active,
        type: 'bucketFolder' as const,
        order: rowData.length,
        parent_id: null
      };
      
      createContent(newBucketFolder as any)
        .then(() => {
          setBucketFolderDialogOpen(false);
          
          setSnackbarMessage(`Bucket folder "${bucketFolderData.name}" created successfully`);
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        })
        .catch(error => {
          console.error('Failed to create bucket folder:', error);
          setSnackbarMessage("Failed to create bucket folder");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
    }
  }, [rowData, createContent, updateContent, editingBucketFolder]);
  
  const handleSaveBucket = useCallback((bucketData: { name: string; active: boolean; parent_id?: string; bucket_config?: any }) => {
    // Check if name is unique across ALL buckets
    const allBucketNames = getAllBucketNames();
    
    if (editingBucket) {
      // For edit mode, exclude the current bucket from the check
      const otherBucketNames = allBucketNames.filter(name => name !== editingBucket.name);
      if (otherBucketNames.includes(bucketData.name)) {
        setSnackbarMessage("A bucket with this name already exists");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      
      // Update existing bucket
      updateContent(editingBucket.id, {
        name: bucketData.name,
        active: bucketData.active,
        bucket_config: bucketData.bucket_config
      } as any)
        .then(() => {
          setBucketDialogOpen(false);
          setEditingBucket(null);
          setTargetParent(null);
          
          setSnackbarMessage(`Bucket "${bucketData.name}" updated successfully`);
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        })
        .catch(error => {
          console.error('Failed to update bucket:', error);
          setSnackbarMessage("Failed to update bucket");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
    } else {
      // For create mode, check against all bucket names
      if (allBucketNames.includes(bucketData.name)) {
        setSnackbarMessage("A bucket with this name already exists");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      
      // Create new bucket
      if (!bucketData.parent_id) {
        return;
      }
  
      const existingChildren = content.filter(c => c.parent_id === bucketData.parent_id);
      const order = existingChildren.length;
  
      const newBucket = {
        name: bucketData.name,
        active: bucketData.active,
        type: 'bucket' as const,
        parent_id: bucketData.parent_id,
        order,
        bucket_config: bucketData.bucket_config
      };
  
      createContent(newBucket)
        .then(() => {
          setBucketDialogOpen(false);
          setTargetParent(null);
          
          setSnackbarMessage(`Bucket "${bucketData.name}" created successfully`);
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        })
        .catch(error => {
          console.error('Failed to create bucket:', error);
          setSnackbarMessage("Failed to create bucket");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
    }
  }, [content, createContent, updateContent, editingBucket, getAllBucketNames]);
  
  const handleSaveItemFolder = useCallback((itemFolderData: { name: string; active: boolean; parent_id?: string }) => {
    if (editingItemFolder) {
      // Update existing item folder
      updateContent(editingItemFolder.id, {
        name: itemFolderData.name,
        active: itemFolderData.active
      })
        .then(() => {
          setItemFolderDialogOpen(false);
          setEditingItemFolder(null);
          setTargetParent(null);
          
          setSnackbarMessage(`Item folder "${itemFolderData.name}" updated successfully`);
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        })
        .catch(error => {
          console.error('Failed to update item folder:', error);
          setSnackbarMessage("Failed to update item folder");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
    } else {
      // Create new item folder
      if (!itemFolderData.parent_id) {
        return;
      }
  
      const existingChildren = content.filter(c => c.parent_id === itemFolderData.parent_id);
      const order = existingChildren.length;
  
      const newItemFolder = {
        name: itemFolderData.name,
        active: itemFolderData.active,
        type: 'itemFolder' as const,
        parent_id: itemFolderData.parent_id,
        order
      };
  
      createContent(newItemFolder)
        .then(() => {
          setItemFolderDialogOpen(false);
          setTargetParent(null);
          
          setSnackbarMessage(`Item folder "${itemFolderData.name}" created successfully`);
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        })
        .catch(error => {
          console.error('Failed to create item folder:', error);
          setSnackbarMessage("Failed to create item folder");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
    }
  }, [content, createContent, updateContent, editingItemFolder]);

  const addItem = useCallback(() => {
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    setLastOperation({ type: 'addItem', timestamp: now });
  
    if (!selectedNode) {
      return;
    }
  
    // Determine parent container
    let parentContainer;
    let parentId;
    
    // Handle different types of selected nodes
    if (selectedNode.type === 'item') {
      // If an item is selected, add sibling item (same parent)
      parentContainer = findParentNode(rowData, selectedNode.id);
      parentId = parentContainer?.id;
    } else if (selectedNode.type === 'itemFolder') {
      // If an itemFolder is selected, add item inside it
      parentContainer = selectedNode;
      parentId = selectedNode.id;
    } else if (selectedNode.type === 'bucket') {
      // If a bucket is selected, add item directly inside it
      parentContainer = selectedNode;
      parentId = selectedNode.id;
    } else {
      console.log('Cannot add item: Invalid selection type', selectedNode.type);
      return;
    }
    
    if (!parentId || !parentContainer) {
      console.error('Could not find parent container');
      return;
    }

    console.log('Adding item to parent:', parentContainer.type, parentId);
    
    // Store the actual parent ID to use when creating the item
    // Use a ref or state variable to preserve this information across component renders
    sessionStorage.setItem('pendingItemParentId', parentId);
  
    // Refresh templates before opening dialog to ensure we have the latest list
    refreshTemplates().then(() => {
      // Open the add item dialog
      setAddItemDialogOpen(true);
    });
  }, [selectedNode, rowData, lastOperation, refreshTemplates]);
  
  const prepareDelete = useCallback(async () => {
    if (!selectedNodes.length) return;
    
    // Remove redundant nodes (if parent selected, ignore children)
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
    
    // Check if any templates have associated items
    const templateIds: string[] = [];
    
    // Collect all template IDs (including children of folders)
    const collectTemplateIds = (node: TreeNode): void => {
      if ((node.type as any) === 'template') {
        templateIds.push(node.id);
      }
      if (node.children) {
        node.children.forEach(child => collectTemplateIds(child));
      }
    };
    
    nodesToDelete.forEach(node => collectTemplateIds(node));
    
    // If we have templates, check for items using them
    let itemCountByTemplate: Record<string, number> = {};
    if (templateIds.length > 0) {
      const { data: itemsUsingTemplates, error } = await supabase
        .from('content')
        .select('id, template_id')
        .in('template_id', templateIds)
        .eq('type', 'item');
      
      if (!error && itemsUsingTemplates) {
        // Count items per template
        itemCountByTemplate = itemsUsingTemplates.reduce((acc, item) => {
          acc[item.template_id] = (acc[item.template_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }
    
    // Add descendant and item counts to nodes
    const enrichNodes = (node: TreeNode): TreeNode => {
      const enrichedNode = {
        ...node,
        descendantCount: countDescendants(node),
        itemCount: (node.type as any) === 'template' ? (itemCountByTemplate[node.id] || 0) : 0
      };
      
      // If it's a folder, sum up item counts from child templates
      if ((node.type as any) === 'templateFolder' && node.children) {
        let totalItemCount = 0;
        const countItemsInFolder = (n: TreeNode): void => {
          if ((n.type as any) === 'template' && itemCountByTemplate[n.id]) {
            totalItemCount += itemCountByTemplate[n.id];
          }
          if (n.children) {
            n.children.forEach(child => countItemsInFolder(child));
          }
        };
        countItemsInFolder(node);
        enrichedNode.itemCount = totalItemCount;
      }
      
      return enrichedNode;
    };
    
    const nodesWithCounts = nodesToDelete.map(enrichNodes);
    
    setItemsToDelete(nodesWithCounts);
    setDeleteDialogOpen(true); // Opens the EXISTING detailed dialog
  }, [selectedNodes, rowData]);

  const getNodeDepth = (nodes: TreeNode[], targetId: string, depth: number = 0): number => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return depth;
      }
      if (node.children) {
        const foundDepth = getNodeDepth(node.children, targetId, depth + 1);
        if (foundDepth !== -1) {
          return foundDepth;
        }
      }
    }
    return -1;
  };
  
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

    // Collect all IDs to delete
    const allIdsToDelete: string[] = [];

    itemsToDelete.forEach(node => {
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
    setDeleteDialogOpen(false);

    // Execute batch delete in a single database operation
    deleteContentBatch(allIdsToDelete)
      .then(() => {
        setSnackbarMessage("Selected items deleted successfully");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      })
      .catch((error) => {
        console.error('Error during deletion:', error);
        setSnackbarMessage("Some items could not be deleted");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        // Refresh to restore correct state
        refreshContent();
      });
  }, [itemsToDelete, rowData, lastOperation, deleteContentBatch, refreshContent]);
  
  // Cancel deletion
  const cancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setItemsToDelete([]);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || loading) return;

    setIsRefreshing(true);

    // Show loading overlay
    if (gridRef.current?.api) {
      gridRef.current.api.showLoadingOverlay();
    }

    try {
      // Clear the fields cache so fresh data is loaded from database
      setLoadedFieldsMap({});
      setLoadingFields(new Set());
      setIsUpdatingFields(false);
      loadedItemsRef.current.clear();

      // Call the refresh function from your hook
      await refreshContent();
    } catch (error) {
      console.error("Error refreshing content:", error);
    } finally {
      setIsRefreshing(false);

      // Hide loading overlay
      if (gridRef.current?.api) {
        gridRef.current.api.hideOverlay();
      }
    }
  }, [isRefreshing, loading, refreshContent]);

  // After refresh completes, force reload fields for visible items
  const prevIsRefreshingRef = useRef(isRefreshing);
  useEffect(() => {
    // Detect when refresh just completed (was true, now false)
    if (prevIsRefreshingRef.current && !isRefreshing) {
      // Wait for grid to fully update with new content, then load fields
      const timer = setTimeout(() => {
        if (gridRef.current?.api) {
          loadVisibleItemFields();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    prevIsRefreshingRef.current = isRefreshing;
  }, [isRefreshing, loadVisibleItemFields]);

  // Get form schema when template is selected
  useEffect(() => {
    // FormSchema is now handled by the onSchemaLoad callback
    // This effect can be removed or simplified
    if (!selectedTemplate) {
      setFormSchema(null);
    }
  }, [selectedTemplate]);

  // Handle form field population from AI
  const handleFormPopulate = useCallback((formData: any) => {
    if (!formRef.current) {
      console.error('Form reference not available for populating');
      return;
    }
    
    // Process field keys to handle data[XX] format
    const processedData: Record<string, any> = {};
    
    Object.entries(formData).forEach(([key, value]) => {
      let processedKey = key;
      
      // Handle "data[XX]" format from Claude API
      if (key.startsWith('data[') && key.endsWith(']')) {
        processedKey = key.substring(5, key.length - 1);
        console.log(`Converted "${key}" to "${processedKey}"`);
      }
      
      // Handle "data.XX" format
      if (key.startsWith('data.')) {
        processedKey = key.substring(5);
        console.log(`Converted "${key}" to "${processedKey}"`);
      }
      
      processedData[processedKey] = value;
    });
    
    // Try using the enhanced updateFields method from the form ref first
    if (typeof formRef.current.updateFields === 'function') {
      console.log('Using formRef.updateFields method');
      const success = formRef.current.updateFields(formData);
      
      if (success) {
        // Update local state to reflect changes
        setItemFields(prevFields => ({
          ...prevFields,
          ...processedData // Use the processed data for state
        }));
        
        console.log('Form populated successfully with updateFields method');
        return;
      }
    }
    
    // Fall back to the utility function
    const success = updateFormFields(formRef, formData);
    
    if (!success) {
      console.error('Failed to update form fields with AI data');
      
      // Last resort: direct DOM manipulation
      setTimeout(() => {
        const formElement = document.querySelector('.formio-form');
        if (formElement) {
          Object.entries(processedData).forEach(([key, value]) => {
            const selectors = [
              `[name="${key}"]`,
              `[name="data[${key}]"]`,
              `[data-key="${key}"]`,
              `[id="${key}"]`
            ];
            
            for (const selector of selectors) {
              const input = formElement.querySelector(selector) as HTMLInputElement;
              if (input && 'value' in input) {
                input.value = String(value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`Updated field "${key}" via direct DOM selector: ${selector}`);
                break;
              }
            }
          });
        }
      }, 100);
    } else {
      // Update local state to reflect changes
      setItemFields(prevFields => ({
        ...prevFields,
        ...processedData // Use the processed data for state
      }));
      
      console.log('Form populated successfully with updateFormFields utility');
    }
  }, []);

  // Handle form submission for creating new items
  const handleFormSubmit = async (submission: any) => {
    if (!selectedTemplate || !submission.data || !selectedNode) return;

    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Full submission object:', submission);
    console.log('Submission data:', submission.data);
    console.log('Fields to process:', Object.keys(submission.data));
    console.log('Has __Image_filename?', '__Image_filename' in submission.data);
    console.log('===========================');

    try {
      // Step 1: Determine the correct parent ID and insertion point
      let parentId;
      let insertOrder;

      if (selectedNode.type === 'item') {
        // For items, get the parent ID and order from the database
        const { data, error } = await supabase
          .from('content')
          .select('parent_id, order')
          .eq('id', selectedNode.id)
          .single();
        
        if (error) {
          console.error('Error finding parent:', error);
          return;
        }
        
        parentId = data.parent_id;
        // Insert right after the selected item
        insertOrder = data.order + 1;
        console.log(`Will insert after item at order ${data.order} with parent ${parentId}`);
      } else {
        // For folders/buckets, use their ID directly as parent
        parentId = selectedNode.id;
        
        // For containers, add at the end
        const { data: siblings } = await supabase
          .from('content')
          .select('id, order')
          .eq('parent_id', parentId)
          .order('order', { ascending: false });
        
        insertOrder = siblings && siblings.length > 0 
          ? Math.max(...siblings.map(s => s.order || 0)) + 1 
          : 0;
        
        console.log(`Will add at end of container with order ${insertOrder}`);
      }
      
      // Step 2: Before inserting, manually shift items
      if (selectedNode.type === 'item') {
        console.log(`Shifting items with order >= ${insertOrder}`);
        
        // Get items that need to be shifted - fixed query syntax
        const { data: itemsToShift } = await supabase
          .from('content')
          .select('id, order')
          .eq('parent_id', parentId)
          .gte('order', insertOrder) // Corrected filter syntax
          .order('order', { ascending: false }); // Separate ordering
        
        if (itemsToShift && itemsToShift.length > 0) {
          console.log(`Found ${itemsToShift.length} items to shift`);
          
          // Update each item's order individually, starting from the highest order
          for (const item of itemsToShift) {
            const { error: updateError } = await supabase
              .from('content')
              .update({ order: item.order + 1 })
              .eq('id', item.id);
            
            if (updateError) {
              console.error(`Error shifting item ${item.id}:`, updateError);
            }
          }
        }
      }
      
      // Step 3: Extract name from submission data (if provided) or use default
      const itemName = submission.data.name || `New ${selectedTemplate.name} Item`;
      
      // Remove 'name' from fields to save as tabfields (since it's used as the item name)
      const fieldsToSave = { ...submission.data };
      delete fieldsToSave.name;
      
      // Step 3: Insert the new item
      console.log(`Inserting new item at order ${insertOrder}`);
      const { data: newItem, error: insertError } = await supabase
        .from('content')
        .insert({
          name: itemName,
          type: 'item',
          active: true,
          parent_id: parentId,
          order: insertOrder,
          template_id: selectedTemplate.id,
          duration: itemDuration,
        schedule: itemSchedule || null
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error inserting new item:', insertError);
        return;
      }
      
      // Step 4: Save form fields (excluding 'name' which was used for the item name)
      // Also look up location names for weather components
      const tabFieldPromises = [];

      // Check if we need to look up weather locations
      let weatherLocations: any[] = [];
      const needsWeatherLookup = Object.keys(fieldsToSave).some(key =>
        !key.startsWith('__') && typeof fieldsToSave[key] === 'string' &&
        (fieldsToSave[key].startsWith('[') || fieldsToSave[key].match(/^[a-zA-Z0-9-]+$/))
      );
      if (needsWeatherLookup) {
        try {
          weatherLocations = await getWeatherLocations();
        } catch (e) {
          console.error('Error fetching weather locations for name lookup:', e);
        }
      }

      for (const [key, value] of Object.entries(fieldsToSave)) {
        if (value !== undefined && value !== null) {
          const cleanKey = key.replace(/^data\[(.*)\]$/, '$1');

          tabFieldPromises.push(
            supabase.from('item_tabfields').insert({
              item_id: newItem.id,
              name: cleanKey,
              value: String(value)
            })
          );

          // For weather components, also save location names
          if (!cleanKey.startsWith('__') && weatherLocations.length > 0) {
            const strValue = String(value);

            // Check if it's a JSON array of IDs (weatherCities)
            if (strValue.startsWith('[')) {
              try {
                const ids = JSON.parse(strValue);
                if (Array.isArray(ids)) {
                  const names = ids.map((id: string) => {
                    const loc = weatherLocations.find((l: any) => l.id === id);
                    return loc ? (loc.custom_name || loc.name) : id;
                  });
                  tabFieldPromises.push(
                    supabase.from('item_tabfields').insert({
                      item_id: newItem.id,
                      name: `__${cleanKey}_locationNames`,
                      value: JSON.stringify(names)
                    })
                  );
                }
              } catch {
                // Not valid JSON, skip
              }
            }
            // Check if it's a single location ID (weatherForecast)
            else if (strValue.match(/^[a-zA-Z0-9-]+$/) && !strValue.includes(' ')) {
              const loc = weatherLocations.find((l: any) => l.id === strValue);
              if (loc) {
                tabFieldPromises.push(
                  supabase.from('item_tabfields').insert({
                    item_id: newItem.id,
                    name: `__${cleanKey}_locationName`,
                    value: loc.custom_name || loc.name
                  })
                );
              }
            }
          }

          // For election components, save election name
          // Skip if this was already handled as a weather component
          const isWeatherData = weatherLocations.length > 0 &&
            (String(value).startsWith('[') || String(value).match(/^[a-zA-Z0-9-]+$/));

          if (!cleanKey.startsWith('__') && !isWeatherData) {
            const strValue = String(value);
            // Check if it's an election JSON object with electionId
            if (strValue.startsWith('{')) {
              try {
                const parsed = JSON.parse(strValue);
                if (parsed.electionId) {
                  // Fetch election name
                  const { data: election, error } = await supabase
                    .from('e_elections')
                    .select('name')
                    .eq('id', parsed.electionId)
                    .single();

                  if (!error && election) {
                    tabFieldPromises.push(
                      supabase.from('item_tabfields').insert({
                        item_id: newItem.id,
                        name: `__${cleanKey}_electionName`,
                        value: election.name
                      })
                    );
                  }
                }
              } catch {
                // Not valid JSON or no electionId, skip
              }
            }
          }
        }
      }

      if (tabFieldPromises.length > 0) {
        await Promise.all(tabFieldPromises);
      }
      
      // Close dialog and refresh
      setAddItemDialogOpen(false);
      setSelectedTemplate(null);
      
      // Force a full refresh
      await refreshContent();
      
      setSnackbarMessage(`Item "${itemName}" created successfully`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Error in handleFormSubmit:', error);
      setSnackbarMessage("Failed to create item");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };
  
  // Helper to check if we have data to paste
  const hasCopiedData = useCallback(() => {
    return copiedData !== null;
  }, [copiedData]);
  
  // Handler for the cut operation
  const handleCut = useCallback(async (params: any) => {
    if (!params.node || !params.node.data) return;

    // Collect all item IDs that need fields loaded
    const collectItemIds = (node: TreeNode): string[] => {
      const ids: string[] = [];
      if (node.type === 'item' && node.template_id) {
        ids.push(node.id);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          ids.push(...collectItemIds(child));
        });
      }
      return ids;
    };

    const itemIds = collectItemIds(params.node.data);

    // Load all fields from database for these items
    let fieldsMap: Record<string, Record<string, any>> = {};
    if (itemIds.length > 0) {
      const { data: fields, error } = await supabase
        .from('item_tabfields')
        .select('item_id, name, value')
        .in('item_id', itemIds);

      if (!error && fields) {
        fields.forEach(field => {
          if (!fieldsMap[field.item_id]) {
            fieldsMap[field.item_id] = {};
          }
          fieldsMap[field.item_id][field.name] = field.value;
        });
      }
    }

    // Create a deep copy with loaded fields
    const copyNodeWithFields = (node: TreeNode): TreeNode => {
      const nodeAny = node as any;
      const {
        treePath,
        idPath,
        displayName,
        ...nodeCopy
      } = nodeAny;

      // Use fields from database if available
      if (node.type === 'item' && fieldsMap[node.id]) {
        nodeCopy.fields = fieldsMap[node.id];
      }

      if (node.children && node.children.length > 0) {
        nodeCopy.children = node.children.map(child => copyNodeWithFields(child));
      }

      return nodeCopy;
    };

    const fullCopy = copyNodeWithFields(params.node.data);

    // Store the clean data with fields
    setCopiedData(fullCopy);
    setIsCut(true);

    // Mark cut rows using a safer approach with dedicated state
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

    // Set a small timeout before showing feedback
    setTimeout(() => {
      // Visual feedback (optional)
      if (gridRef.current?.api) {
        gridRef.current.api.refreshCells({ force: true });
      }

      // Show a snackbar confirmation
      setSnackbarMessage("Item cut to clipboard with all children");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
    }, 50);
  }, []);

  // Handler for the copy operation
  const handleCopy = useCallback(async (params: any) => {
    if (!params.node || !params.node.data) return;

    // Collect all item IDs that need fields loaded
    const collectItemIds = (node: TreeNode): string[] => {
      const ids: string[] = [];
      if (node.type === 'item' && node.template_id) {
        ids.push(node.id);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          ids.push(...collectItemIds(child));
        });
      }
      return ids;
    };

    const itemIds = collectItemIds(params.node.data);

    // Load all fields from database for these items
    let fieldsMap: Record<string, Record<string, any>> = {};
    if (itemIds.length > 0) {
      const { data: fields, error } = await supabase
        .from('item_tabfields')
        .select('item_id, name, value')
        .in('item_id', itemIds);

      if (!error && fields) {
        fields.forEach(field => {
          if (!fieldsMap[field.item_id]) {
            fieldsMap[field.item_id] = {};
          }
          fieldsMap[field.item_id][field.name] = field.value;
        });
      }
    }

    // Create a deep copy of the node data including its children with loaded fields
    const copyNodeWithChildren = (node: TreeNode): TreeNode => {
      // Make a copy of the node first
      const nodeAny = node as any;
      const {
        treePath,
        idPath,
        displayName,
        descendantCount,
        ...nodeCopy
      } = nodeAny;

      // Use fields from database if available, otherwise use existing fields
      if (node.type === 'item' && fieldsMap[node.id]) {
        nodeCopy.fields = fieldsMap[node.id];
      }

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
  
  // Create unique name function with parentheses
  const createUniqueName = (baseName: string, siblings: TreeNode[], itemType: string): string => {
    // For buckets, check against ALL buckets in the system
    if (itemType === 'bucket') {
      const allBucketNames = getAllBucketNames();
      
      // If the name doesn't exist at all, just return it
      if (!allBucketNames.includes(baseName)) {
        return baseName;
      }
      
      // Clean up base name by removing any existing numbering
      let cleanBaseName = baseName;
      const parenthesesMatch = baseName.match(/^(.*?)\s*\(\d+\)$/);
      if (parenthesesMatch) {
        cleanBaseName = parenthesesMatch[1];
      }
      
      // Find existing instances with numbering across ALL buckets
      const regex = new RegExp(`^${cleanBaseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\((\\d+)\\)$`);
      
      const numbers = allBucketNames
        .map(name => {
          const match = name.match(regex);
          if (match && match[1]) {
            return parseInt(match[1], 10);
          }
          return null;
        })
        .filter(num => num !== null) as number[];
      
      // Count the base name without number as instance #1
      if (allBucketNames.includes(cleanBaseName)) {
        numbers.push(1);
      }
      
      // Get the highest number
      const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
      
      // Next available number is one higher
      const nextNumber = maxNumber + 1;
      
      // For first duplicate, use (2)
      return `${cleanBaseName} (${nextNumber})`;
    }
    
    // For non-buckets, use the original logic (check within siblings)
    const hasExactMatch = siblings ? siblings.some(node => node.name === baseName) : false;
    
    if (!hasExactMatch) {
      return baseName;
    }
    
    // Rest of the original logic for non-buckets...
    let cleanBaseName = baseName;
    const parenthesesMatch = baseName.match(/^(.*?)\s*\(\d+\)$/);
    if (parenthesesMatch) {
      cleanBaseName = parenthesesMatch[1];
    }
    
    const regex = new RegExp(`^${cleanBaseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\((\\d+)\\)$`);
    
    const numbers = siblings
      .map(node => {
        const match = node.name.match(regex);
        if (match && match[1]) {
          return parseInt(match[1], 10);
        }
        return null;
      })
      .filter(num => num !== null) as number[];
    
    if (siblings.some(node => node.name === cleanBaseName)) {
      numbers.push(1);
    }
    
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    
    return `${cleanBaseName} (${nextNumber})`;
  };  
  
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
      
      // Content types hierarchy: bucketFolder > bucket > itemFolder > item
      if (targetNode.type === 'bucketFolder') {
        if (copiedData.type === 'bucketFolder') {
          // Paste bucketFolder as sibling of another bucketFolder
          parentId = null; // Top level
          pasteAsSibling = true;
        } else if (copiedData.type === 'bucket') {
          // Paste bucket into bucketFolder
          parentId = targetNode.id;
        } else {
          setSnackbarMessage("Cannot paste this item type here");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }
      } else if (targetNode.type === 'bucket') {
        if (copiedData.type === 'bucket') {
          // Paste bucket as sibling of another bucket
          const parentFolder = findParentNode(rowData, targetNode.id);
          parentId = parentFolder?.id || null;
          pasteAsSibling = true;
        } else if (copiedData.type === 'itemFolder' || copiedData.type === 'item') {
          // Paste itemFolder or item into bucket
          parentId = targetNode.id;
        } else {
          setSnackbarMessage("Cannot paste this item type here");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }
      } else if (targetNode.type === 'itemFolder') {
        if (copiedData.type === 'itemFolder') {
          // Special case: itemFolders CAN nest, so paste into the target
          parentId = targetNode.id;
          pasteAsSibling = false; // This is the exception - we want nesting
        } else if (copiedData.type === 'item') {
          // Paste item into itemFolder
          parentId = targetNode.id;
        } else {
          setSnackbarMessage("Cannot paste this item type here");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }
      } else if (targetNode.type === 'item') {
        if (copiedData.type === 'item') {
          // Paste item as sibling of another item
          const parentContainer = findParentNode(rowData, targetNode.id);
          parentId = parentContainer?.id || null;
          pasteAsSibling = true;
        } else {
          setSnackbarMessage("Cannot paste this item type here");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }
      }
      
      if (parentId === null && copiedData.type !== 'bucketFolder') {
        setSnackbarMessage("Could not determine where to paste this item");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      
      // Helper functions
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
      
      // Recursive paste function
      const pasteNodeWithChildren = async (node: TreeNode, parentId: string | null, order: number): Promise<string> => {
        const nodeAny = node as any;
        const {
          id: originalId,
          children,
          treePath,
          idPath,
          displayName,
          descendantCount,
          fields,
          template_name,
          ...itemToKeep
        } = nodeAny;
        
        const newItem = {
          name: "",
          type: itemToKeep.type,
          active: itemToKeep.active !== undefined ? itemToKeep.active : true,
          schedule: itemToKeep.schedule,
          parent_id: parentId ?? undefined,
          order: order,
          template_id: itemToKeep.template_id || null,
          bucket_config: itemToKeep.bucket_config || null
        };
        
        // Generate a unique name
        if (parentId !== null) {
          const siblings = getSiblings(parentId);
          newItem.name = createUniqueName(node.name, siblings, node.type);
        } else {
          // Top-level item
          newItem.name = createUniqueName(node.name, rowData, node.type);
        }
        
        try {
          // First, shift existing items if we're inserting as sibling
          if (pasteAsSibling && parentId !== null) {
            const { data: itemsToShift } = await supabase
              .from('content')
              .select('id, order')
              .eq('parent_id', parentId)
              .gte('order', order)
              .order('order', { ascending: false });
            
            if (itemsToShift && itemsToShift.length > 0) {
              for (const item of itemsToShift) {
                await supabase
                  .from('content')
                  .update({ order: item.order + 1 })
                  .eq('id', item.id);
              }
            }
          }
          
          // Create the new item
          const createdItem = await createContent(newItem);
          
          // Copy tabfields for items
          if (node.type === 'item' && node.fields && Object.keys(node.fields).length > 0 && createdItem.id) {
            const fieldPromises = Object.entries(node.fields).map(([key, value]) => {
              return supabase.from('item_tabfields').insert({
                item_id: createdItem.id,
                name: key,
                value: value as string
              });
            });
            
            await Promise.all(fieldPromises);
          }
          
          // Recursively create children
          if (children && children.length > 0) {
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
      
      // Start the paste operation with the determined order
      pasteNodeWithChildren(copiedData, parentId, targetOrder)
        .then((newTopLevelId) => {
          // Handle cut vs copy
          if (isCut) {
            deleteContent(copiedData.id)
              .then(() => {
                setCopiedData(null);
                setIsCut(false);
                setCutRowIds(new Set());
                refreshContent();
                
                setSnackbarMessage("Item moved successfully with all children");
                setSnackbarSeverity("success");
                setSnackbarOpen(true);
                
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
              })
              .catch(error => {
                console.error('Failed to delete original item:', error);
                setSnackbarMessage("Failed to complete cut operation");
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
                refreshContent();
              });
          } else {
            // Copy operation
            refreshContent();
            
            setSnackbarMessage("Item pasted successfully with all children");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            
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
          }
        })
        .catch(error => {
          console.error('Failed to paste item with children:', error);
          setSnackbarMessage("Failed to paste item with children");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          refreshContent();
        });
        
    } catch (error) {
      console.error('Error during paste operation:', error);
      setSnackbarMessage("Error during paste operation");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [copiedData, isCut, rowData, findParentNode, createContent, deleteContent, refreshContent, createUniqueName]);
  
  // Context menu items provider
  const getContextMenuItems = useCallback((params: any): (DefaultMenuItem | MenuItemDef)[] => {
    // Prevent event propagation to avoid menu closing
    if (params.event) {
      params.event.stopPropagation();
      params.event.preventDefault();
    }

    const { node } = params;
    if (!node || !node.data) return [];

    // Capture selected node data for safety
    const selectedNodeData = params.node ? params.node.data : null;

    // Determine edit action based on node type
    const getEditAction = () => {
      if (!selectedNodeData) return;
      const parentFolder = findParentNode(rowData, selectedNodeData.id);

      switch (selectedNodeData.type) {
        case 'bucketFolder':
          setEditingBucketFolder(selectedNodeData);
          setBucketFolderDialogOpen(true);
          break;
        case 'bucket':
          if (parentFolder) {
            setTargetParent({ id: parentFolder.id, name: parentFolder.name, type: parentFolder.type });
          }
          setEditingBucket(selectedNodeData);
          setBucketDialogOpen(true);
          break;
        case 'itemFolder':
          if (parentFolder) {
            setTargetParent({
              id: parentFolder.id,
              name: parentFolder.name,
              type: parentFolder.type
            });
          }
          setEditingItemFolder(selectedNodeData);
          setItemFolderDialogOpen(true);
          break;
        case 'item':
          openItemEditDialog(selectedNodeData, 0);
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
  }, [handleCut, handleCopy, handlePaste, hasCopiedData, rowData, findParentNode, openItemEditDialog, prepareDelete]);

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Grid context for cell renderers - provides callbacks without recreating cell renderers
  const gridContext = useMemo(() => ({
    onEditBucketFolder: (data: any) => {
      setEditingBucketFolder(data);
      setBucketFolderDialogOpen(true);
    },
    onEditBucket: (data: any) => {
      const parentFolder = findParentNode(rowData, data.id);
      if (parentFolder) {
        setTargetParent({ id: parentFolder.id, name: parentFolder.name, type: parentFolder.type });
      }
      setEditingBucket(data);
      setBucketDialogOpen(true);
    },
    onEditItemFolder: (data: any) => {
      const parentContainer = findParentNode(rowData, data.id);
      if (parentContainer) {
        setTargetParent({
          id: parentContainer.id,
          name: parentContainer.name,
          type: parentContainer.type
        });
      }
      setEditingItemFolder(data);
      setItemFolderDialogOpen(true);
    },
    onEditItem: (data: any, tabIndex?: number) => {
      openItemEditDialog(data, tabIndex ?? 0);
    }
  }), [rowData, openItemEditDialog]);

  // Memoized getRowClass to prevent unnecessary re-renders
  const getRowClass = useCallback((params: any) => {
    if (params.data?.id && cutRowIds.has(params.data.id)) {
      return 'row-cut';
    }
    return '';
  }, [cutRowIds]);

  // Grid options optimized for virtual scrolling
  const gridOptions = useMemo(() => ({
    // Row buffer for smoother scrolling
    rowBuffer: 10,
    
    // Viewport row model configuration
    viewportRowModelPageSize: 100,
    viewportRowModelBufferSize: 50,
    
    // Animation settings
    animateRows: false, // Disable for better performance

    // Suppress large dataset warnings
    suppressMaxRenderedRowRestriction: true,
    
    // Enable quick filter
    quickFilterText: '',
    
    // Tree data settings
    treeData: true,
    getDataPath: getDataPath,

    // Performance optimizations
    suppressColumnVirtualisation: false,
    suppressScrollOnNewData: true,
    
    // Events
    onBodyScroll: onBodyScroll,
    onFirstDataRendered: () => {
      // Load fields for initially visible items
      loadVisibleItemFields();
    },
    onSortChanged: () => {
      // Reload fields for newly visible items after sort
      setTimeout(loadVisibleItemFields, 100);
    },
    onFilterChanged: () => {
      // Reload fields for newly visible items after filter
      setTimeout(loadVisibleItemFields, 100);
    },
    onRowGroupOpened: (event: any) => {
      // Handle existing expand/collapse logic
      onRowGroupOpened(event);
      // Load fields for newly visible items
      setTimeout(loadVisibleItemFields, 100);
    }
  }), [onBodyScroll, loadVisibleItemFields, onRowGroupOpened]);

  // Clear cached fields when content changes significantly
  useEffect(() => {
    // If content count changes significantly, clear the cache
    const contentIds = new Set(content.map(item => item.id));
    const cachedIds = Object.keys(loadedFieldsMap);
    
    // Remove cached fields for items that no longer exist
    const validCachedFields: Record<string, Record<string, any>> = {};
    cachedIds.forEach(id => {
      if (contentIds.has(id)) {
        validCachedFields[id] = loadedFieldsMap[id];
      }
    });
    
    if (Object.keys(validCachedFields).length !== cachedIds.length) {
      setLoadedFieldsMap(validCachedFields);
    }
  }, [content]);


  // Optimized delete preparation
  const prepareOptimizedDelete = useCallback(async () => {
    if (!selectedNodes.length) return;
    
    // For bulk operations, show a simplified dialog
    if (selectedNodes.length > 20) {
      // Count all items that will be deleted (including children)
      let totalCount = 0;
      const allIdsToDelete = new Set<string>();
      
      const collectAllIds = (node: TreeNode) => {
        allIdsToDelete.add(node.id);
        totalCount++;
        if (node.children) {
          node.children.forEach(child => collectAllIds(child));
        }
      };
      
      selectedNodes.forEach(node => collectAllIds(node));
      
      // Show bulk delete confirmation
      setBulkDeleteDialog({
        open: true,
        selectedCount: selectedNodes.length,
        totalCount: totalCount,
        idsToDelete: Array.from(allIdsToDelete)
      });
    } else {
      // Use existing detailed delete dialog for small selections
      prepareDelete();
    }
  }, [selectedNodes]);

  // Bulk delete dialog state
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState({
    open: false,
    selectedCount: 0,
    totalCount: 0,
    idsToDelete: [] as string[]
  });

  // Optimized bulk delete function
  const performBulkDelete = useCallback(async () => {
    const { idsToDelete } = bulkDeleteDialog;
    
    setBulkDeleteInProgress(true);
    setDeleteProgress({ current: 0, total: idsToDelete.length });
    setBulkDeleteDialog({ ...bulkDeleteDialog, open: false });
    
    try {
      // Disable grid interactions during delete
      if (gridRef.current?.api) {
        gridRef.current.api.showLoadingOverlay();
      }
      
      // Delete in chunks to avoid timeout
      const chunkSize = 100;
      
      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        
        // Single query to delete multiple items
        const { error } = await supabase
          .from('content')
          .delete()
          .in('id', chunk);
        
        if (error) throw error;
        
        // Update progress
        setDeleteProgress({
          current: Math.min(i + chunkSize, idsToDelete.length),
          total: idsToDelete.length
        });
        
        // Small delay between chunks to prevent overwhelming the server
        if (i + chunkSize < idsToDelete.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Clear selections
      setSelectedNodes([]);
      setSelectedNode(null);
      
      // Refresh the entire content tree
      await refreshContent();
      
      setSnackbarMessage(`Successfully deleted ${idsToDelete.length} items`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Bulk delete error:', error);
      setSnackbarMessage(`Error during bulk delete: ${(error as any).message}`);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setBulkDeleteInProgress(false);
      setDeleteProgress({ current: 0, total: 0 });
      
      if (gridRef.current?.api) {
        gridRef.current.api.hideOverlay();
      }
    }
  }, [bulkDeleteDialog, refreshContent]);

  // Bulk delete confirmation dialog
  const BulkDeleteDialog = () => (
    <Dialog
      open={bulkDeleteDialog.open}
      onClose={(_event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return; // Prevent closing
        }
        if (!bulkDeleteInProgress) {
          setBulkDeleteDialog({ ...bulkDeleteDialog, open: false });
        }
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="error" />
          Confirm Bulk Delete
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This action cannot be undone!
        </Alert>
        <Typography variant="body1" gutterBottom>
          You have selected <strong>{bulkDeleteDialog.selectedCount}</strong> items.
        </Typography>
        {bulkDeleteDialog.totalCount > bulkDeleteDialog.selectedCount && (
          <Typography variant="body1" gutterBottom>
            Including all nested items, a total of <strong>{bulkDeleteDialog.totalCount}</strong> items will be deleted.
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Large deletions may take a few moments to complete.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => setBulkDeleteDialog({ ...bulkDeleteDialog, open: false })}
          disabled={bulkDeleteInProgress}
        >
          Cancel
        </Button>
        <Button
          onClick={performBulkDelete}
          color="error"
          variant="contained"
          disabled={bulkDeleteInProgress}
          startIcon={bulkDeleteInProgress ? <CircularProgress size={16} /> : <DeleteIcon />}
        >
          {bulkDeleteInProgress ? 'Deleting...' : `Delete ${bulkDeleteDialog.totalCount} Items`}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Progress overlay during bulk operations
  const BulkOperationOverlay = () => {
    if (!bulkDeleteInProgress) return null;
    
    const progress = deleteProgress.total > 0 
      ? (deleteProgress.current / deleteProgress.total) * 100 
      : 0;
    
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
      >
        <Paper sx={{ p: 4, minWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            Deleting Items...
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" align="center">
            {deleteProgress.current} of {deleteProgress.total} items deleted
          </Typography>
        </Paper>
      </Box>
    );
  };

  // Add keyboard shortcut for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger delete if a FormIO dialog is open (e.g., component settings)
      const formioDialog = document.querySelector('.formio-dialog, .formio-dialog-overlay, .formio-component-modal-wrapper');
      if (formioDialog) {
        return;
      }

      // Don't trigger delete if focus is in an input field
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' ||
                          target.tagName === 'TEXTAREA' ||
                          target.isContentEditable;
      if (isInputField) {
        return;
      }

      if (e.key === 'Delete' && selectedNodes.length > 0 && !bulkDeleteInProgress) {
        prepareOptimizedDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes, bulkDeleteInProgress, prepareOptimizedDelete]);

  // Listen for openBucket events from other pages (e.g., ChannelPlaylistsPage)
  useEffect(() => {
    const handleOpenBucket = (event: CustomEvent<{ bucketId: string }>) => {
      const { bucketId } = event.detail;
      if (!bucketId || !gridRef.current?.api) return;

      // Find the bucket node in flattened rows
      const bucketNode = flattenedRows.find(
        (row: any) => row.id === bucketId && row.type === 'bucket'
      );

      if (!bucketNode) {
        console.warn(`Bucket with id ${bucketId} not found in content`);
        setSnackbarMessage('Bucket not found in content');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        return;
      }

      // Expand all parent nodes using the idPath
      const nodeWithPath = bucketNode as TreeNodeWithPaths;
      if (nodeWithPath.idPath && nodeWithPath.idPath.length > 1) {
        const newExpandedRows = new Set(expandedRows);
        // Add all parent IDs to expanded set (excluding the bucket itself - last in path)
        for (let i = 0; i < nodeWithPath.idPath.length - 1; i++) {
          newExpandedRows.add(nodeWithPath.idPath[i]);
        }
        setExpandedRows(newExpandedRows);
      }

      // Wait for expansion to take effect, then scroll and select
      setTimeout(() => {
        if (!gridRef.current?.api) return;

        // Find and select the row
        gridRef.current.api.forEachNode((node: any) => {
          if (node.data?.id === bucketId) {
            // Select the node
            node.setSelected(true, true);
            setSelectedNode(bucketNode);
            setSelectedNodes([bucketNode]);

            // Expand the bucket to show its contents
            const newExpandedRows = new Set(expandedRows);
            newExpandedRows.add(bucketId);
            setExpandedRows(newExpandedRows);

            // Scroll to the row
            gridRef.current.api.ensureNodeVisible(node, 'middle');
          }
        });
      }, 100);
    };

    window.addEventListener('openBucket', handleOpenBucket as EventListener);
    return () => window.removeEventListener('openBucket', handleOpenBucket as EventListener);
  }, [flattenedRows, expandedRows]);

  const handleUpdateItem = async (fieldsToUpdate: Record<string, any>) => {
    if (!editingItem || !selectedTemplate) return;
    
    try {
      // Build updates object
      const updates: any = {};
      if (itemFields.name && itemFields.name !== editingItem.name) {
        updates.name = itemFields.name;
      }
      if (itemDuration !== undefined && itemDuration !== editingItem.duration) {
        updates.duration = itemDuration;
      }
      if (itemSchedule !== undefined) {
        updates.schedule = itemSchedule;
      }
      
      if (Object.keys(updates).length > 0) {
        await updateContent(editingItem.id, updates);
      }
      
      // Filter out 'name' from fields to save as tabfields
      const fieldsToSave = { ...fieldsToUpdate };
      delete fieldsToSave.name;
      
      // Delete existing tabfields for this item
      const { error: deleteError } = await supabase
        .from('item_tabfields')
        .delete()
        .eq('item_id', editingItem.id);
      
      if (deleteError) {
        console.error('Error deleting existing fields:', deleteError);
      }
      
      // Save new tabfields (if any)
      if (Object.keys(fieldsToSave).length > 0) {
        const insertPromises = [];

        // Check if we need to look up weather locations
        let weatherLocations: any[] = [];
        const needsWeatherLookup = Object.keys(fieldsToSave).some(key =>
          !key.startsWith('__') && typeof fieldsToSave[key] === 'string' &&
          (fieldsToSave[key].startsWith('[') || fieldsToSave[key].match(/^[a-zA-Z0-9-]+$/))
        );
        if (needsWeatherLookup) {
          try {
            weatherLocations = await getWeatherLocations();
          } catch (e) {
            console.error('Error fetching weather locations for name lookup:', e);
          }
        }

        // Track metadata fields to add to fieldsToSave for display name formatting
        const metadataFields: Record<string, string> = {};

        for (const [key, value] of Object.entries(fieldsToSave)) {
          if (value !== undefined && value !== null && value !== '') {
            insertPromises.push(
              supabase
                .from('item_tabfields')
                .insert({
                  item_id: editingItem.id,
                  name: key,
                  value: String(value)
                })
            );

            // For weather components, also save location names
            if (!key.startsWith('__') && weatherLocations.length > 0) {
              const strValue = String(value);

              // Check if it's a JSON array of IDs (weatherCities)
              if (strValue.startsWith('[')) {
                try {
                  const ids = JSON.parse(strValue);
                  if (Array.isArray(ids)) {
                    const names = ids.map((id: string) => {
                      const loc = weatherLocations.find((l: any) => l.id === id);
                      return loc ? (loc.custom_name || loc.name) : id;
                    });
                    const metadataKey = `__${key}_locationNames`;
                    const metadataValue = JSON.stringify(names);
                    metadataFields[metadataKey] = metadataValue;
                    insertPromises.push(
                      supabase.from('item_tabfields').insert({
                        item_id: editingItem.id,
                        name: metadataKey,
                        value: metadataValue
                      })
                    );
                  }
                } catch {
                  // Not valid JSON, skip
                }
              }
              // Check if it's a single location ID (weatherForecast)
              else if (strValue.match(/^[a-zA-Z0-9-]+$/) && !strValue.includes(' ')) {
                const loc = weatherLocations.find((l: any) => l.id === strValue);
                if (loc) {
                  const metadataKey = `__${key}_locationName`;
                  const metadataValue = loc.custom_name || loc.name;
                  metadataFields[metadataKey] = metadataValue;
                  insertPromises.push(
                    supabase.from('item_tabfields').insert({
                      item_id: editingItem.id,
                      name: metadataKey,
                      value: metadataValue
                    })
                  );
                }
              }
            }

            // For election components, save election name
            // Skip if this was already handled as a weather component
            const isWeatherData = weatherLocations.length > 0 &&
              (String(value).startsWith('[') || String(value).match(/^[a-zA-Z0-9-]+$/));

            if (!key.startsWith('__') && !isWeatherData) {
              const strValue = String(value);
              // Check if it's an election JSON object with electionId
              if (strValue.startsWith('{')) {
                try {
                  const parsed = JSON.parse(strValue);
                  if (parsed.electionId) {
                    // Fetch election name
                    const { data: election, error } = await supabase
                      .from('e_elections')
                      .select('name')
                      .eq('id', parsed.electionId)
                      .single();

                    if (!error && election) {
                      const metadataKey = `__${key}_electionName`;
                      metadataFields[metadataKey] = election.name;
                      insertPromises.push(
                        supabase.from('item_tabfields').insert({
                          item_id: editingItem.id,
                          name: metadataKey,
                          value: election.name
                        })
                      );
                    }
                  }
                } catch {
                  // Not valid JSON or no electionId, skip
                }
              }
            }
          }
        }

        // Merge metadata fields into fieldsToSave for display name formatting
        Object.assign(fieldsToSave, metadataFields);

        if (insertPromises.length > 0) {
          await Promise.all(insertPromises);
        }
      }
      
      // Update item in tree with new fields
      const updatedData = updateTreeNode(rowData, editingItem.id, (node) => {
        return { 
          ...node, 
          name: fieldsToUpdate.name || node.name,
          fields: fieldsToSave,
          displayName: formatItemName({
            ...node,
            name: fieldsToUpdate.name || node.name,
            fields: fieldsToSave,
            template_name: selectedTemplate.name
          })
        };
      });
      
      setRowData(updatedData);

      // Update the fields cache with new field values
      setLoadedFieldsMap(prev => ({
        ...prev,
        [editingItem.id]: fieldsToSave
      }));

      // Refresh grid with updated data
      if (gridRef.current?.api) {
        gridRef.current.api.refreshCells({ force: true });
      }

      setEditItemDialogOpen(false);
      setEditingItem(null);
      setSelectedTemplate(null);
      setItemDuration(null);
      setItemSchedule(null);
      setEditItemInitialTab(0);

      setSnackbarMessage(`Item updated successfully`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Error updating item fields:', error);
      setSnackbarMessage("Failed to update item");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

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
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div>Error: {error}</div>
          ) : (
            <>
              <Tooltip title="Add New Bucket Folder">
                <span>
                  <IconButton
                    onClick={addBucketFolder}
                    className="toolbar-button"
                    color="primary"
                  >
                    <CreateNewFolderIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Add Bucket to Selected Bucket Folder or Below Selected Bucket">
                <span>
                  <IconButton
                    onClick={addBucket}
                    disabled={!selectedNode || (selectedNode.type !== 'bucketFolder' && selectedNode.type !== 'bucket')}
                    className="toolbar-button"
                    color="primary"
                  >
                    <ShoppingBasketIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Add Item Folder to Selected Bucket or Below Selected Item Folder">
                <span>
                  <IconButton
                    onClick={addItemFolder}
                    disabled={!selectedNode || (selectedNode.type !== 'bucket' && selectedNode.type !== 'itemFolder')}
                    className="toolbar-button"
                    color="primary"
                  >
                    <FolderIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Add Item to Selected Item Folder, Bucket, or Below Selected Item">
                <span>
                  <IconButton
                    onClick={addItem}
                    disabled={!selectedNode || (selectedNode.type !== 'itemFolder' && selectedNode.type !== 'bucket' && selectedNode.type !== 'item')}
                    className="toolbar-button" 
                    color="primary"
                  >
                    <InsertDriveFileIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tooltip title="Hide items whose schedule is not currently active">
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
          <Tooltip title="Refresh Content">
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
                onClick={prepareOptimizedDelete}
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
          ...noSelectStyles as any // Apply the no-select styles
        }}
      >
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={flattenedRows}
          columnDefs={columnDefs as any}
          autoGroupColumnDef={autoGroupColumnDef as any}
          defaultColDef={defaultColDef}
          gridOptions={gridOptions}
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
          enableCellTextSelection={false}
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
          groupDefaultExpanded={0}
          alwaysShowHorizontalScroll={false}
          alwaysShowVerticalScroll={false}
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
      {/* Bulk operation overlay - ADD THIS */}
      <BulkOperationOverlay />
      {/* Bulk delete dialog */}
      <BulkDeleteDialog />
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
                  primary={item.type === 'item' ? ((item as any).displayName || formatItemName(item)) : item.name}
                  secondary={
                    item.descendantCount && item.descendantCount > 0
                      ? `Will also delete ${item.descendantCount} child item${item.descendantCount !== 1 ? 's' : ''}`
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
      {/* Add Item Dialog */}
      <Dialog
        open={addItemDialogOpen}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return; // Prevent closing
          }
          setAddItemDialogOpen(false);
          setSelectedTemplate(null);
        }}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle>Add New Item</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Left side - Template Selection */}
            <Box sx={{ 
              width: '30%', 
              borderRight: 1, 
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ p: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Filter Templates"
                  value={templateFilter}
                  onChange={(e) => setTemplateFilter(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
              </Box>
              <List sx={{ 
                flex: 1, 
                overflow: 'auto',
                bgcolor: 'background.paper' 
              }}>
                {templatesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : availableTemplates.length === 0 ? (
                  <Typography sx={{ p: 2, color: 'text.secondary' }}>
                    No templates found
                  </Typography>
                ) : (
                  availableTemplates.map((template) => (
                    <ListItem
                      key={template.id}
                      button
                      selected={selectedTemplate?.id === template.id}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <ListItemIcon>
                        {template.is_favorite ? (
                          <StarIcon sx={{ color: 'warning.main' }} />
                        ) : (
                          <DescriptionIcon />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{template.name}</span>
                            {template.is_default && (
                              <Chip
                                label="Default"
                                size="small"
                                color="success"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
            
            {/* Right side - Form Preview */}
            <Box sx={{ 
              width: '70%', 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden' 
            }}>
              {/* Add name field at the top */}
              <TextField
                label="Item Name"
                value={itemFields.name || editingItem?.name || ''}
                onChange={(e) => setItemFields(prev => ({ ...prev, name: e.target.value }))}
                fullWidth
                margin="normal"
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {selectedTemplate ? (
                  <div>
                    <FormPreview
                      ref={formRef}
                      templateId={selectedTemplate?.id}
                      initialData={itemFields} // Make sure itemFields is correctly formatted
                      showSubmitButton={false}
                      key={`form-${selectedTemplate?.id}`}
                      onSchemaLoad={handleSchemaLoad}
                      showSettingsTab={true}
                      itemDuration={itemDuration}
                      itemSchedule={itemSchedule}
                      onDurationChange={setItemDuration}
                      onScheduleChange={setItemSchedule}
                    />
                    {/* Add a message if the template has no form components */}
                    <Box sx={{ 
                      mt: 2, 
                      p: 2, 
                      bgcolor: 'info.light', 
                      borderRadius: 1,
                      display: formSchema?.components?.length > 0 ? 'none' : 'block'
                    }}>
                      <Typography variant="body2" color="info.dark">
                        This template has no form fields defined. The item will be created with just a name.
                      </Typography>
                    </Box>
                    <AIAssistant
                      formSchema={formSchema}
                      onPopulateForm={handleFormPopulate}
                      disabled={!selectedTemplate}
                      templateName={selectedTemplate?.name}
                    />
                  </div>
                ) : (
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: 'text.secondary'
                  }}>
                    <Typography>Select a template to view its form</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddItemDialogOpen(false);
            setSelectedTemplate(null);
          }}>
            Cancel
          </Button>
          {selectedTemplate && (
            <Button
              onClick={async () => {
                // Check if any uploads are in progress
                if (isAnyImageUploading()) {
                  alert('Please wait for image uploads to complete');
                  return;
                }

                if (formRef.current) {
                  const submission = formRef.current.getSubmissionData();
                  console.log('Form submission data:', submission);
                  handleFormSubmit(submission);
                } else {
                  console.error('Form ref not available');
                }
              }}
              variant="contained"
              color="primary"
              disabled={!selectedTemplate}
            >
              Save Item
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {/* Edit Item Dialog */}
      <Dialog
        open={editItemDialogOpen}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return; // Prevent closing
          }

          setEditItemDialogOpen(false);
          setEditingItem(null);
          setItemDuration(null);
          setItemSchedule(null);
          setSelectedTemplate(null);
          setEditItemInitialTab(0);
        }}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle>
          Edit Item: {editingItem?.name}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Right side - Form Preview */}
            <Box sx={{
              width: '100%',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {selectedTemplate ? (
                  <div>
                    <FormPreview
                      ref={formRef}
                      templateId={selectedTemplate?.id}
                      initialData={itemFields}
                      showSubmitButton={false}
                      key={`form-${selectedTemplate?.id}-${editItemInitialTab}`}
                      onSchemaLoad={handleSchemaLoad}
                      showSettingsTab={true}
                      itemDuration={itemDuration}
                      itemSchedule={itemSchedule}
                      onDurationChange={setItemDuration}
                      onScheduleChange={setItemSchedule}
                      initialTab={editItemInitialTab}
                    />
                    {/* Add a message if the template has no form components */}
                    <Box sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: 'info.light',
                      borderRadius: 1,
                      display: formSchema?.components?.length > 0 ? 'none' : 'block'
                    }}>
                      <Typography variant="body2" color="info.dark">
                        This template has no form fields defined. Only the item name can be edited.
                      </Typography>
                    </Box>
                    <AIAssistant
                      formSchema={formSchema}
                      onPopulateForm={handleFormPopulate}
                      disabled={!selectedTemplate}
                      templateName={selectedTemplate?.name}
                    />
                  </div>
                ) : (
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: 'text.secondary'
                  }}>
                    <CircularProgress />
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditItemDialogOpen(false);
            setEditingItem(null);
            setItemDuration(null);
            setItemSchedule(null);
            setSelectedTemplate(null);
            setEditItemInitialTab(0);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={async () => {
              // Check if any uploads are in progress
              if (isAnyImageUploading()) {
                alert('Please wait for image uploads to complete');
                return;
              }
              
              if (formRef.current) {
                // Get the form data directly from the form instance
                const submission = formRef.current.getSubmissionData();
                console.log('Edit form submission data:', submission);
                
                // Merge the submission data with itemFields
                const updatedFields = {
                  ...itemFields,
                  ...submission.data
                };
                
                console.log('Updated fields to save:', updatedFields);
                
                // Update itemFields state
                setItemFields(updatedFields);
                
                // Call handleUpdateItem but pass the updated fields
                handleUpdateItem(updatedFields);
              } else {
                console.error('Form ref not available');
              }
            }}
            variant="contained" 
            color="primary"
            disabled={!selectedTemplate}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
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
      {/* Bucket Folder Dialog */}
      <BucketFolderDialog
        open={bucketFolderDialogOpen}
        onClose={() => {
          setBucketFolderDialogOpen(false);
          setEditingBucketFolder(null);
        }}
        onSave={handleSaveBucketFolder}
        mode={editingBucketFolder ? 'edit' : 'create'}
        initialData={editingBucketFolder ? {
          name: editingBucketFolder.name,
          active: editingBucketFolder.active
        } : undefined}
        existingNames={rowData
          .filter(node => node.type === 'bucketFolder' && node.id !== editingBucketFolder?.id)
          .map(folder => folder.name)}
      />
      {/* Bucket Dialog */}
      <BucketDialog
        open={bucketDialogOpen}
        onClose={() => {
          setBucketDialogOpen(false);
          setEditingBucket(null);
          setTargetParent(null);
        }}
        onSave={handleSaveBucket}
        mode={editingBucket ? 'edit' : 'create'}
        initialData={editingBucket ? {
          name: editingBucket.name,
          active: editingBucket.active,
          bucket_config: editingBucket.bucket_config
        } : undefined}
        parentFolder={targetParent && targetParent.type === 'bucketFolder' ? 
          { id: targetParent.id, name: targetParent.name } : undefined}
        existingNames={targetParent ? 
          getBucketNamesInFolder(targetParent.id)
            .filter(name => name !== editingBucket?.name) : []}
        allBucketNames={getAllBucketNames()
          .filter(name => name !== editingBucket?.name)}
      />
      {/* Item Folder Dialog */}
      <ItemFolderDialog
        open={itemFolderDialogOpen}
        onClose={() => {
          setItemFolderDialogOpen(false);
          setEditingItemFolder(null);
          setTargetParent(null);
        }}
        onSave={handleSaveItemFolder}
        mode={editingItemFolder ? 'edit' : 'create'}
        initialData={editingItemFolder ? {
          name: editingItemFolder.name,
          active: editingItemFolder.active
        } : undefined}
        parentContainer={targetParent ? {
          id: targetParent.id,
          name: targetParent.name,
          type: targetParent.type as 'bucket' | 'itemFolder'
        } : undefined}
        existingNames={targetParent ?
          getItemFolderNamesInContainer(targetParent.id)
            .filter(name => name !== editingItemFolder?.name) : []}
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
    </div>)
  );
};

export default ContentPage;