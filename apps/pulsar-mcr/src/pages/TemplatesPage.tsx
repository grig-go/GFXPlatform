import React, { useCallback, useMemo, useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { MenuItemDef, DefaultMenuItem } from 'ag-grid-community';
import { Form } from '@formio/react';
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
  Divider,
  FormControlLabel,
  Checkbox,
  FormGroup,
  TextField,
  Chip
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Import the enhanced Form.io components
import { supabase } from '../lib/supabase';
import { FormEditor, DataSourcesManager } from '../components/formio';
import { FormPreview } from '../components/formio';
import { ScriptingIntegration } from '../components/formio/ScriptEditor';
import AIAssistant from '../components/AIAssistant';
import { useTemplates } from '../hooks/useTemplates';
import { TemplateNameCellRenderer, CarouselCellRenderer } from '../components/ContentCellRenderers';
import AgCheckbox from '../components/AgCheckbox';
import { createImageComponent, fixImageComponentsInSchema } from '../components/formio/ImageComponent';
import { useGridExpandedRows, useGridColumnState } from '../contexts/GridStateContext';

interface TreeNode {
  id: string;
  name: string;
  active: boolean;
  type: 'templateFolder' | 'template';
  parent_id?: string;
  order?: number;
  is_favorite?: boolean;
  is_default?: boolean;
  carousel_name?: string;
  children?: TreeNode[];
  treePath?: string[];
  descendantCount?: number; // Used for delete dialog
  itemCount?: number; // Number of items using this template
  originalParentId?: string | null; // Used during drag operations
}

// Define the ref interface
export interface TemplatesPageRef {
  refreshTemplates: () => Promise<void>;
}

// Define props interface (even if empty for now)
interface TemplatesPageProps {}

const TemplatesPageComponent: React.ForwardRefRenderFunction<TemplatesPageRef, TemplatesPageProps> = (_props, ref) => {
  const gridRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]);
  const { templates, loading, error, createTemplate, updateTemplate, deleteTemplate, refreshTemplatesIfNeeded, toggleFavorite, setDefaultTemplate, getUniqueCarouselNames } = useTemplates();
  const { expandedRows, toggleRowExpanded } = useGridExpandedRows('templates');
  const { columnState, setColumnState, isLoaded: isGridStateLoaded } = useGridColumnState('templates');
  const [rowData, setRowData] = useState<TreeNode[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastOperation, setLastOperation] = useState<{ type: string; timestamp: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<TreeNode[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [draggedNodes, setDraggedNodes] = useState<TreeNode[]>([]);

  // Form dialog state
  const [formDialogOpen, setFormDialogOpen] = useState<boolean>(false);
  const [formSchema, setFormSchema] = useState<any>(null);
  const [formData, setFormData] = useState<any>(null);
  const [formJsonSchema, setFormJsonSchema] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  
  // Field editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldOptions, setFieldOptions] = useState<any>(null);

  // Form.io builder states
  const [formBuilderOpen, setFormBuilderOpen] = useState<boolean>(false);
  const [dataSourcesOpen, setDataSourcesOpen] = useState<boolean>(false);
  const [scriptEditorOpen, setScriptEditorOpen] = useState<boolean>(false);
  const [pendingFormBuilderSchema, setPendingFormBuilderSchema] = useState<any>(null);

  // Template name dialog state
  const [templateNameDialogOpen, setTemplateNameDialogOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [templateNameError, setTemplateNameError] = useState<string>('');

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState<boolean>(false);
  const [renameValue, setRenameValue] = useState<string>('');
  const [renameError, setRenameError] = useState<string>('');

  // No-select styles to prevent text selection
  const noSelectStyles = {
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    userSelect: 'none'
  };

  // Expose methods via ref with proper typing
  useImperativeHandle(ref, () => ({
    refreshTemplates: async () => {
      try {
        // Show loading indicator
        if (gridRef.current?.api) {
          gridRef.current.api.showLoadingOverlay();
        }
        
        // Call refresh
        await refreshTemplatesIfNeeded();
        
        // Hide loading indicator
        if (gridRef.current?.api) {
          gridRef.current.api.hideOverlay();
        }
      } catch (error) {
        console.error("Error refreshing templates:", error);
      }
    }
  }));

  // Convert flat database structure to tree
  useEffect(() => {
    if (!templates) return;

    const buildTree = (items: any[], parentId: string | null = null): TreeNode[] => {
      return items
        .filter(item => item.parent_id === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }));
    };

    const tree = buildTree(templates);
    setRowData(tree);
  }, [templates]);

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
    
    // Last resort fallback
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

  const flattenedRows = useMemo(() => getRows(rowData), [rowData]);
  
  const getDataPath = (data: any) => {
    return data.treePath;
  };
  
  const getUniqueNameInLevel = (name: string, siblings: TreeNode[]): string => {
    // If the name doesn't exist at all, just return it
    if (!siblings?.some(node => node.name === name)) {
      return name;
    }
  
    // Extract the base name (e.g., "Channel " from "Channel 3")
    const match = name.match(/^(.*?)(\d*)$/);
    const baseName = match ? match[1].trim() : name;
    
    // Find all existing numbers for this base name
    const existingNumbers: number[] = [];
    siblings.forEach(node => {
      const nodeMatch = node.name.match(new RegExp(`^${baseName}\\s*(\\d+)$`));
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
        // Found a gap
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

  // Find a node by its ID in a tree structure
  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Check if a node is a descendant of another node
  const isDescendantOf = (nodes: TreeNode[], descendantId: string, ancestorId: string): boolean => {
    // Find the ancestor node
    const ancestor = findNodeById(nodes, ancestorId);
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
    const updatedNodes = nodes.filter(node => {
      if (node.id === id) {
        removedNode = node;
        return false;
      }
      if (node.children) {
        const [found, updatedChildren] = findAndRemoveNode(node.children, id);
        if (found) {
          removedNode = found;
          node.children = updatedChildren;
        }
        return true;
      }
      return true;
    });
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

  const isValidDrop = (dragNodes: TreeNode[], dropNode: any): boolean => {
    if (!dropNode) return false;
    
    const dropType = dropNode.data.type;
    const dropId = dropNode.data.id;
    
    // Check each dragged node
    for (const dragNode of dragNodes) {
      const dragType = dragNode.type;
      const dragId = dragNode.id;
      
      // Can't drop on itself
      if (dragId === dropId) return false;
      
      // Can't drop a parent into its own child
      if (isDescendantOf(rowData, dropId, dragId)) return false;
      
      // Type-specific rules
      if (dragType === 'templateFolder') {
        // Folders can only be dropped at root level (on other folders)
        if (dropType !== 'templateFolder') return false;
      } else if (dragType === 'template') {
        // Templates can be dropped on folders or other templates
        if (dropType !== 'templateFolder' && dropType !== 'template') return false;
      }
    }
    
    return true;
  };

  // Track when drag starts
  const onRowDragMove = useCallback(() => {
    if (!isDragging) {
      setIsDragging(true);
      
      // Disable animations for better performance during drag
      if (gridRef.current?.api) {
        gridRef.current.api.setGridOption('animateRows', false);
      }
    }
  }, [isDragging]);

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

  const onRowDragEnd = useCallback((event: any) => {
    const { overNode } = event;
    
    // Get the nodes being dragged
    const nodesToDrag = draggedNodes.length > 0 ? draggedNodes : [event.node.data];
    
    if (!overNode || !isValidDrop(nodesToDrag, overNode)) {
      setIsDragging(false);
      setDraggedNodes([]);
      return;
    }
    
    // Skip if we had a recent operation
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      setIsDragging(false);
      setDraggedNodes([]);
      return;
    }
    setLastOperation({ type: 'drag', timestamp: now });
    
    // Store the original data for verification and rollback
    const initialData = JSON.parse(JSON.stringify(rowData));
    
    // Process multiple nodes
    let intermediateData = [...rowData];
    const updatePromises: Promise<any>[] = [];
    
    try {
      // First, collect original parent IDs for all dragged nodes
      const originalParentIds = new Map<string, string | null>();
      nodesToDrag.forEach(node => {
        const originalParentId = templates.find(item => item.id === node.id)?.parent_id || null;
        originalParentIds.set(node.id, originalParentId);
      });
      
      // Remove all dragged nodes from the tree
      const removedNodes: TreeNode[] = [];
      for (const draggedNode of nodesToDrag) {
        const [removed, newData] = findAndRemoveNode(intermediateData, draggedNode.id);
        if (removed) {
          // Store original parent ID with the removed node
          removed.originalParentId = originalParentIds.get(removed.id) || null;
          removedNodes.push(removed);
          intermediateData = newData;
        }
      }
      
      // Compute drop direction using flattenedRows
      const firstDraggedIndex = flattenedRows.findIndex(row => row.id === nodesToDrag[0].id);
      const overIndex = flattenedRows.findIndex(row => row.id === overNode.data.id);
      const dropBelow = firstDraggedIndex < overIndex;
      
      // Group nodes by type for processing
      const folderNodes = removedNodes.filter(n => n.type === 'templateFolder');
      const templateNodes = removedNodes.filter(n => n.type === 'template');
      
      let finalData = intermediateData;
      
      // Process folders (only root level reordering)
      if (folderNodes.length > 0 && overNode.data.type === 'templateFolder') {
        let targetIndex = finalData.findIndex(n => n.id === overNode.data.id);
        if (targetIndex !== -1) {
          if (dropBelow) targetIndex++;
          
          // Insert all folders at the target position
          finalData = [
            ...finalData.slice(0, targetIndex),
            ...folderNodes,
            ...finalData.slice(targetIndex)
          ];
          
          // Update database for each folder - preserve original names
          folderNodes.forEach((folder, idx) => {
            updatePromises.push(
              updateTemplate(folder.id, {
                parent_id: null as any,
                name: folder.name, // Preserve the original name
                order: targetIndex + idx
              }).catch(err => {
                console.error(err);
                return { error: true };
              })
            );
          });
          
          // Update order of all root level items
          finalData.forEach((item, index) => {
            if (!folderNodes.some(f => f.id === item.id)) {
              updatePromises.push(
                updateTemplate(item.id, { order: index })
                  .catch(err => {
                    console.error(err);
                    return { error: true };
                  })
              );
            }
          });
        }
      }
      
      // Process templates
      if (templateNodes.length > 0) {
        let targetParentId: string | null = null;
        
        // Determine target parent ID
        if (overNode.data.type === 'templateFolder') {
          targetParentId = overNode.data.id;
        } else if (overNode.data.type === 'template') {
          const parent = findParentNode(intermediateData, overNode.data.id);
          targetParentId = parent?.id || null;
        }
        
        if (targetParentId === null) {
          // Dropping at root level
          let rootTemplates = intermediateData.filter(node => node.type === 'template' && !node.parent_id);
          let targetIndex = 0;
          
          // Calculate position at root level
          if (overNode.data.type === 'templateFolder') {
            // If dropping after a folder, place at start of root templates
            targetIndex = 0;
          } else if (overNode.data.type === 'template' && !overNode.data.parent_id) {
            // If dropping relative to another root template
            targetIndex = rootTemplates.findIndex(t => t.id === overNode.data.id);
            if (targetIndex === -1) {
              targetIndex = rootTemplates.length;
            } else if (dropBelow) {
              targetIndex++;
            }
          }
          
          // Process each template
          const processedTemplates = templateNodes.map((template, idx) => {
            const originalParentId = template.originalParentId;
            const finalNodeName = originalParentId === null 
              ? template.name 
              : getUniqueNameInLevel(template.name, rootTemplates);
            
            updatePromises.push(
              updateTemplate(template.id, {
                parent_id: null as any,
                name: finalNodeName,
                order: targetIndex + idx
              }).catch(err => {
                console.error('Error updating template:', err);
                return { error: true };
              })
            );
            
            return { ...template, name: finalNodeName, parent_id: null };
          });
          
          // Find where to insert among all root nodes
          const rootNodes = intermediateData.filter(node => !node.parent_id);
          let insertIndex = rootNodes.length;
          
          for (let i = 0; i < rootNodes.length; i++) {
            if (rootNodes[i].type === 'template' && i >= targetIndex) {
              insertIndex = i;
              break;
            }
          }
          
          // Insert templates at root level
          finalData = [
            ...intermediateData.slice(0, insertIndex),
            ...(processedTemplates as unknown as TreeNode[]),
            ...intermediateData.slice(insertIndex)
          ];

          // Update order of other root templates
          rootTemplates = [
            ...rootTemplates.slice(0, targetIndex),
            ...(processedTemplates as unknown as TreeNode[]),
            ...rootTemplates.slice(targetIndex)
          ];
          
          rootTemplates.forEach((template, index) => {
            if (!processedTemplates.some(t => t.id === template.id)) {
              updatePromises.push(
                updateTemplate(template.id, { order: index })
                  .catch(err => {
                    console.error('Error updating template order:', err);
                    return { error: true };
                  })
              );
            }
          });
          
        } else {
          // Dropping into a folder - THIS IS WHERE THE FIX IS CRITICAL
          const targetContainer = findNodeById(finalData, targetParentId); // Use finalData instead of intermediateData
          if (!targetContainer) {
            setIsDragging(false);
            setDraggedNodes([]);
            return;
          }
          
          // CRITICAL FIX: Ensure we get the current children from the target container
          // This preserves existing children that weren't involved in the drag operation
          let children = targetContainer.children ? [...targetContainer.children] : [];
          
          // Calculate the position to insert
          let targetIndex = children.length;
          if (overNode.data.type === 'templateFolder') {
            // If dropping directly on a folder, add at the end
            targetIndex = children.length;
          } else if (overNode.data.type === 'template' && overNode.data.parent_id === targetParentId) {
            // If dropping relative to another template in the same folder
            targetIndex = children.findIndex(child => child.id === overNode.data.id);
            if (targetIndex === -1) {
              targetIndex = children.length;
            } else if (dropBelow) {
              targetIndex++;
            }
          }
          
          // Process each template
          const processedTemplates = templateNodes.map((template, idx) => {
            const originalParentId = template.originalParentId;
            const sameParent = originalParentId === targetParentId;
            
            // Determine final name: keep original if same parent, otherwise ensure uniqueness
            const finalNodeName = sameParent 
              ? template.name 
              : getUniqueNameInLevel(template.name, children);
            
            updatePromises.push(
              updateTemplate(template.id, {
                parent_id: targetParentId,
                name: finalNodeName,
                order: targetIndex + idx
              }).catch(err => {
                console.error('Error updating dragged template:', err);
                return { error: true };
              })
            );
            
            return { ...template, name: finalNodeName, parent_id: targetParentId };
          });
          
          // CRITICAL FIX: Create updated data by recursively finding and updating the target container
          // while preserving all existing children
          const updateContainerChildren = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.map(node => {
              if (node.id === targetParentId) {
                const newChildren = [
                  ...children.slice(0, targetIndex),
                  ...processedTemplates,
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
          
          finalData = updateContainerChildren(finalData);
          
          // Update order of all children in the folder
          const updatedChildren = [
            ...children.slice(0, targetIndex), 
            ...processedTemplates, 
            ...children.slice(targetIndex)
          ];
          
          updatedChildren.forEach((item, index) => {
            if (!processedTemplates.some(t => t.id === item.id)) {
              updatePromises.push(
                updateTemplate(item.id, { order: index })
                  .catch(err => {
                    console.error('Error updating template order:', err);
                    return { error: true };
                  })
              );
            }
          });
        }
      }
      
      // CRITICAL FIX: Use maintainSelection instead of direct setRowData
      // This ensures proper grid state management
      maintainSelection(finalData);
      
      // Execute all database updates
      Promise.all(updatePromises).then((results) => {
        const failedUpdates = results.filter(res => res && res.error);
        if (failedUpdates.length > 0 || !isGridInSync(finalData)) {
          refreshTemplatesIfNeeded();
        } else {
          // ADDITIONAL FIX: Ensure expanded state is restored after successful update
          setTimeout(() => {
            restoreExpandedState();
          }, 100);
        }
      }).catch(error => {
        console.error('Error updating database:', error);
        // If database updates fail, refresh the content from server
        refreshTemplatesIfNeeded();
      });
      
    } catch (error) {
      console.error('Error during drag and drop:', error);
      // In case of any error, revert to the initial data
      setRowData(initialData);
    } finally {
      // Reset dragging state after a delay (animations stay disabled for better performance)
      setTimeout(() => {
        setIsDragging(false);
        setDraggedNodes([]);
        restoreExpandedState();
      }, 100);
    }
    
  }, [draggedNodes, rowData, flattenedRows, isDragging, isValidDrop, lastOperation, updateTemplate, refreshTemplatesIfNeeded, isGridInSync, templates, maintainSelection, restoreExpandedState]);

  // Get icon for node type for delete dialog
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'templateFolder':
        return <FolderIcon fontSize="small" />;
      case 'template':
        return <InsertDriveFileIcon fontSize="small" />;
      default:
        return null;
    }
  };


  // Ref to hold the loadCompleteTemplateForm function (defined later)
  const loadCompleteTemplateFormRef = useRef<((template: TreeNode) => Promise<any>) | null>(null);

  // Callback for NameCellRenderer to handle edit clicks
  const handleNameEditClick = useCallback((data: TreeNode, node: any, api: any) => {
    if (data.type === 'template') {
      // Open form builder for templates
      setFormBuilderOpen(false);
      setPendingFormBuilderSchema(null);
      setSelectedNode(data);

      // Use the ref to call loadCompleteTemplateForm
      if (loadCompleteTemplateFormRef.current) {
        loadCompleteTemplateFormRef.current(data)
          .then((loadedSchema) => {
            setPendingFormBuilderSchema(loadedSchema);
            setFormBuilderOpen(true);
          })
          .catch(error => {
            console.error('Error loading template form:', error);
            setPendingFormBuilderSchema({
              display: 'form',
              components: [],
              customClass: 'formio-form-wrapper'
            });
            setFormBuilderOpen(true);
          });
      }
    } else if (data.type === 'templateFolder') {
      // Start inline editing for folders
      if (api && node) {
        api.startEditingCell({
          rowIndex: node.rowIndex,
          colKey: 'ag-Grid-AutoColumn'
        });
      }
    }
  }, []);

  const autoGroupColumnDef = useMemo(
    () => ({
      headerName: 'Name',
      minWidth: 300,
      flex: 1,
      rowDrag: false, // Disable row dragging
      editable: (params: any) => {
        // Only allow editing for templateFolder, not for template
        return params.data && params.data.type === 'templateFolder';
      },
      field: 'name',
      sortable: true, // Enable sorting
      sort: 'asc' as const, // Default sort ascending
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
        defaultOption: 'contains'
      },
      cellRendererParams: {
        suppressCount: true,
        innerRenderer: TemplateNameCellRenderer,
        onEdit: handleNameEditClick,
        checkbox: false
      }
    }),
    [handleNameEditClick]
  );
    
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
          // Show checkbox for both templateFolder and template
          return (
            <AgCheckbox
              checked={params.value}
              onChange={async (newValue) => {
                // Update the grid immediately for responsiveness
                params.node.setDataValue('active', newValue);

                // Update the database
                try {
                  await updateTemplate(params.data.id, { active: newValue });
                } catch (error) {
                  console.error('Failed to update template active status:', error);
                  // Revert on error
                  params.node.setDataValue('active', !newValue);
                }
              }}
            />
          );
        },
        editable: false, // Set to false since we're handling changes in the renderer
        initialPinned: 'left' as const
      },
      {
        field: 'carousel_name',
        headerName: 'Carousel',
        width: 180,
        filter: 'agTextColumnFilter',
        filterParams: {
          buttons: ['reset', 'apply'],
          closeOnApply: true
        },
        cellRenderer: CarouselCellRenderer,
        editable: (params: any) => params.data?.type === 'template',
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: () => {
          const carouselNames = getUniqueCarouselNames();
          // Add empty option to allow clearing, and existing options
          return {
            values: ['', ...carouselNames]
          };
        },
        valueSetter: (params: any) => {
          const newValue = params.newValue || null;
          if (params.data.carousel_name !== newValue) {
            params.data.carousel_name = newValue;
            // Update in database
            updateTemplate(params.data.id, { carousel_name: newValue });
            return true;
          }
          return false;
        }
      },
      {
        headerName: 'Actions',
        field: 'actions',
        width: 120,
        filter: false,
        sortable: false,
        resizable: false,
        suppressMovable: true,
        cellRenderer: (params: any) => {
          // Only show actions for templates, not folders
          if (params.data.type !== 'template') {
            return null;
          }
          const isFavorite = params.data.is_favorite;
          const isDefault = params.data.is_default;
          const templateId = params.data.id;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                <IconButton
                  size="small"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await toggleFavorite(templateId);
                      // Refresh to update the grid after state change
                      refreshTemplatesIfNeeded();
                    } catch (error) {
                      console.error('Failed to toggle favorite:', error);
                    }
                  }}
                  sx={{
                    padding: '2px',
                    color: isFavorite ? 'warning.main' : 'action.disabled'
                  }}
                >
                  {isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title={isDefault ? 'Remove as default template' : 'Set as default template'}>
                <IconButton
                  size="small"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await setDefaultTemplate(templateId);
                      refreshTemplatesIfNeeded();
                    } catch (error) {
                      console.error('Failed to set default template:', error);
                    }
                  }}
                  sx={{
                    padding: '2px',
                    color: isDefault ? 'success.main' : 'action.disabled'
                  }}
                >
                  {isDefault ? <CheckCircleIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
        editable: false
      }
    ],
    [updateTemplate, toggleFavorite, setDefaultTemplate, refreshTemplatesIfNeeded, getUniqueCarouselNames]
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true, // Enable sorting by default
      filter: true, // Enable filtering by default
      resizable: true,
      floatingFilter: true // Show filter row below headers
    }),
    []
  );

  const onCellValueChanged = useCallback((event: any) => {
    const { data, colDef, newValue } = event;
    
    // Skip if we had a recent operation
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    setLastOperation({ type: 'cellChange', timestamp: now });
    
    // Update database
    updateTemplate(data.id, { [colDef.field]: newValue })
      .catch(error => {
        console.error('Failed to update template:', error);
        // Revert the change in the grid
        if (gridRef.current?.api) {
          gridRef.current.api.applyTransaction({
            update: [{ ...data, [colDef.field]: data[colDef.field] }]
          });
        }
      });

    const updatedData = updateTreeNode(rowData, data.id, (node) => {
      if (colDef.field === 'name') {
        const parent = node.type === 'templateFolder' ? null : findParentNode(rowData, node.id);
        const siblings = parent ? parent.children || [] : rowData;
        const otherSiblings = siblings.filter(sibling => sibling.id !== node.id);
        const uniqueName = getUniqueNameInLevel(newValue, otherSiblings);
        return { ...node, name: uniqueName };
      }
      return { ...node, [colDef.field]: newValue };
    });
    maintainSelection(updatedData);
    if (colDef.field === 'name') {
      const parent = data.type === 'templateFolder' ? null : findParentNode(rowData, data.id);
      const siblings = parent ? parent.children || [] : rowData;
      const otherSiblings = siblings.filter(sibling => sibling.id !== data.id);
      const uniqueName = getUniqueNameInLevel(newValue, otherSiblings);
      if (uniqueName !== newValue && gridRef.current?.api) {
        gridRef.current.api.applyTransaction({
          update: [{ ...data, name: uniqueName }]
        });
      }
    }
  }, [rowData, maintainSelection, lastOperation, updateTemplate]);

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

  // Handle row double-click to open form dialog
  const onRowDoubleClicked = useCallback((event: any) => {
    const { data } = event;
    if (data.type === 'template') {
      // Close dialog and clear state first
      setFormBuilderOpen(false);
      setPendingFormBuilderSchema(null);

      // Load the form data and capture the returned schema
      loadCompleteTemplateForm(data)
        .then((loadedSchema) => {
          // Set the pending schema for the form builder
          setPendingFormBuilderSchema(loadedSchema);
          // Open form builder
          setFormBuilderOpen(true);
        })
        .catch(error => {
          console.error('Error loading template form:', error);
          // Even on error, open with empty schema
          setPendingFormBuilderSchema({
            display: 'form',
            components: [],
            customClass: 'formio-form-wrapper'
          });
          setFormBuilderOpen(true);
        });
    }
  }, []);

  // Helper function to ensure image component is registered
  const ensureImageComponentRegistered = () => {
    const Formio = (window as any).Formio;
    
    if (!Formio) {
      console.error('Formio not available');
      return false;
    }

    // In development mode, force re-registration to support HMR
    const isDev = import.meta.env.DEV;

    // Check if already registered
    if (isDev || !Formio.Components.components.image) {
      const ImageComponent = createImageComponent(Formio);
      if (ImageComponent) {
        Formio.Components.addComponent('image', ImageComponent);
      }
    }

    return true;
  };

  const loadCompleteTemplateForm = async (template: TreeNode) => {
    try {
      // STEP 1: Register image component BEFORE loading form
      ensureImageComponentRegistered();
      
      // Clear previous form state first to avoid stale data
      setFormJsonSchema(null);
      setFormSchema(null);
      setFormData({});
      
      // First check if we have a saved form schema
      const { data: formData } = await supabase
        .from('template_forms')
        .select('schema')
        .eq('template_id', template.id)
        .maybeSingle();
      
      let schemaToUse = null;
      
      if (formData && formData.schema) {
        // STEP 2: Fix image components in the loaded schema
        schemaToUse = fixImageComponentsInSchema(formData.schema);
        
        // Set the state variables
        setFormJsonSchema(schemaToUse);
        setFormSchema(schemaToUse);
        
        // Extract data from the schema or initialize empty object
        const initialData: any = {};
        if (schemaToUse.components) {
          schemaToUse.components.forEach((component: any) => {
            if (component.key) {
              // Handle different default value types
              if (component.defaultValue !== undefined) {
                initialData[component.key] = component.defaultValue;
              } else if (component.type === 'image') {
                // Initialize image fields
                initialData[component.key] = component.multiple ? [] : null;
              } else {
                initialData[component.key] = '';
              }
            }
          });
        }
        
        setFormData(initialData);
        
        // Return the schema so it can be used immediately
        return schemaToUse;
      }
      
      // Otherwise fall back to the legacy tabfields approach
      const { data: tabfields } = await supabase
        .from('tabfields')
        .select('*')
        .eq('template_id', template.id);

      if (tabfields && tabfields.length > 0) {
        // Create form.io schema from tabfields
        const components = tabfields.map((field: any) => {
          const baseComponent = {
            id: field.name,
            type: field.options?.type || 'textfield',
            key: field.name,
            label: field.options?.label || field.name,
            placeholder: field.options?.placeholder || '',
            description: field.options?.description || '',
            defaultValue: field.value,
            validate: {
              required: field.options?.required || false,
              ...field.options?.validation
            },
            input: true,  // ← Ensure all components have input: true
            persistent: true,
            customClass: 'formio-field-wrapper'
          };
          
          // Add image-specific properties if it's an image field
          if (field.options?.type === 'image') {
            return {
              ...baseComponent,
              storage: 'supabase',
              supabaseBucket: field.options?.supabaseBucket || 'images',
              supabaseFolder: field.options?.supabaseFolder || 'uploads',
              fileMaxSize: field.options?.fileMaxSize || '10MB',
              filePattern: field.options?.filePattern || '*.jpg,*.jpeg,*.png,*.gif,*.webp'
            };
          }
          
          return baseComponent;
        });

        schemaToUse = {
          display: 'form',
          components,
          customClass: 'formio-form-wrapper'
        };

        // Create initial form data
        const data = tabfields.reduce((acc: any, field: any) => {
          acc[field.name] = field.value || (field.options?.type === 'image' ? null : '');
          return acc;
        }, {});

        setFormSchema(schemaToUse);
        setFormJsonSchema(schemaToUse);
        setFormData(data);
        
        return schemaToUse;
      } else {
        // No existing form data, create a blank schema
        schemaToUse = {
          display: 'form',
          components: [],
          customClass: 'formio-form-wrapper'
        };
        
        setFormSchema(schemaToUse);
        setFormJsonSchema(schemaToUse);
        setFormData({});
        
        return schemaToUse;
      }
    } catch (error) {
      console.error('Error loading template form:', error);
      
      // Create fallback empty schema in case of errors
      const fallbackSchema = {
        display: 'form',
        components: [],
        customClass: 'formio-form-wrapper'
      };
      
      setFormSchema(fallbackSchema);
      setFormJsonSchema(fallbackSchema);
      setFormData({});
      
      return fallbackSchema;
    }
  };

  // Assign the ref so handleNameEditClick can use it
  loadCompleteTemplateFormRef.current = loadCompleteTemplateForm;

  // Save form schema function
  const saveFormSchema = async (templateId: string, schema: any) => {
    try {
      // STEP 1: Fix image components before saving
      const fixedSchema = fixImageComponentsInSchema(schema);
      
      // STEP 2: Save the complete schema with fixes
      const { error: saveError } = await supabase
        .from('template_forms')
        .upsert({
          template_id: templateId,
          schema: fixedSchema,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'template_id'
        });
      
      if (saveError) {
        console.error('Error saving to template_forms:', saveError);
        throw saveError;
      }
      
      // STEP 3: Update tabfields for backward compatibility
      const components = fixedSchema.components || [];
      
      // Filter out components without keys
      const validComponents = components.filter((c: any) => c.key);
      
      if (validComponents.length > 0) {
        const tabfieldUpdates = validComponents.map((component: any) => {
          const tabfieldData = {
            template_id: templateId,
            name: component.key,
            value: component.defaultValue || '',
            options: {
              type: component.type,
              label: component.label,
              placeholder: component.placeholder,
              description: component.description,
              required: component.validate?.required || false,
              // Store other Form.io options here
              validation: component.validate,
              conditional: component.conditional,
              customConditional: component.customConditional,
              calculateValue: component.calculateValue,
              logic: component.logic,
              dataSrc: component.dataSrc,
              data: component.data,
              // Store image-specific options
              ...(component.type === 'image' ? {
                storage: component.storage,
                supabaseBucket: component.supabaseBucket,
                supabaseFolder: component.supabaseFolder,
                fileMaxSize: component.fileMaxSize,
                filePattern: component.filePattern,
                multiple: component.multiple
              } : {})
            }
          };
          
          return supabase
            .from('tabfields')
            .upsert(tabfieldData, {
              onConflict: 'template_id,name'
            });
        });
        
        await Promise.all(tabfieldUpdates);
      }
      
      
      // STEP 4: Reload the form to verify
      await loadCompleteTemplateForm({ id: templateId } as TreeNode);
      
    } catch (error) {
      console.error('Error saving form schema:', error);
    }
  };
  // Handle field option changes
  const handleFieldOptionChange = async (fieldKey: string, options: any) => {
    if (!selectedNode || !formSchema) return;
    
    // Update the form schema with new field options
    const updatedComponents = formSchema.components.map((component: any) => {
      if (component.key === fieldKey) {
        return { ...component, ...options };
      }
      return component;
    });
    
    setFormSchema({
      ...formSchema,
      components: updatedComponents
    });
    
    // Update the field options in the database
    try {
      await supabase
        .from('tabfields')
        .update({ options: options })
        .eq('template_id', selectedNode.id)
        .eq('name', fieldKey);
    } catch (error) {
      console.error('Error updating field options:', error);
    }
  };

  // Handle field edit button click
  // Handle form population from AI
  const handleFormPopulate = useCallback((formData: any) => {
    if (!formRef.current) {
      console.error('Form reference not available');
      return;
    }
    
    // Update form with AI generated data
    try {
      if (formRef.current.form) {
        const form = formRef.current.form;
        
        // Update each field
        Object.entries(formData).forEach(([key, value]) => {
          const component = form.getComponent(key);
          if (component) {
            component.setValue(value);
          }
        });
        
        // Update local state
        setFormData((prevData: any) => ({
          ...prevData,
          ...formData
        }));
      }
    } catch (error) {
      console.error('Failed to update form fields with AI data:', error);
    }
  }, []);

  // Add a refresh function
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || loading) return;
    
    setIsRefreshing(true);
    
    // Show loading overlay
    if (gridRef.current?.api) {
      gridRef.current.api.showLoadingOverlay();
    }
    
    try {
      // Call the refresh function from your hook
      await refreshTemplatesIfNeeded();
    } catch (error) {
      console.error("Error refreshing templates:", error);
    } finally {
      setIsRefreshing(false);
      
      // Hide loading overlay
      if (gridRef.current?.api) {
        gridRef.current.api.hideOverlay();
      }
    }
  }, [isRefreshing, loading, refreshTemplatesIfNeeded]);

  const handleFormSubmit = async (submission: any) => {
    if (!selectedNode) return;

    try {
      // Update each tabfield with new values
      const updates = Object.entries(submission.data).map(([name, value]) => 
        supabase
          .from('tabfields')
          .upsert({
            template_id: selectedNode.id,
            name,
            value: value as string
          }, {
            onConflict: 'template_id,name'
          })
      );

      await Promise.all(updates);
      
      // Close the form dialog
      setFormDialogOpen(false);
    } catch (error) {
      console.error('Error updating tabfields:', error);
    }
  };

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

  useEffect(() => {
    if (formBuilderOpen && selectedNode && selectedNode.type === 'template') {
      loadCompleteTemplateForm(selectedNode)
        .then((loadedSchema) => {
          setPendingFormBuilderSchema(loadedSchema);
        });
    }
  }, [formBuilderOpen, selectedNode?.id])

  // Custom drag text implementation using DOM manipulation with error handling
  useEffect(() => {
    const gridElement = containerRef.current;
    if (!gridElement) return;
  
    const handleDragStart = (event: DragEvent) => {
      // Longer delay to ensure AG Grid has fully initialized the ghost element
      setTimeout(() => {
        try {
          const ghostElement = document.querySelector('.ag-dnd-ghost');
          if (ghostElement && gridRef.current?.api) {
            const selectedNodes = gridRef.current.api.getSelectedNodes();
            const count = selectedNodes.length;
            
            let dragText = 'Moving item';
            
            if (count <= 1) {
              // Single item - get the name from the dragged node
              const draggedNode = selectedNodes[0];
              if (draggedNode && draggedNode.data) {
                dragText = `Moving: ${draggedNode.data.name}`;
              } else {
                // Fallback: try to get from event target
                const rowElement = (event.target as Element)?.closest('.ag-row');
                const nameElement = rowElement?.querySelector('[col-id="ag-Grid-AutoColumn"] .ag-cell-value');
                const itemName = nameElement?.textContent?.trim() || 'item';
                dragText = `Moving: ${itemName}`;
              }
            } else {
              // Multiple items
              const folderCount = selectedNodes.filter((node: any) => node.data?.type === 'templateFolder').length;
              const templateCount = selectedNodes.filter((node: any) => node.data?.type === 'template').length;
              
              if (folderCount > 0 && templateCount > 0) {
                dragText = `Moving ${folderCount} folder${folderCount > 1 ? 's' : ''} & ${templateCount} template${templateCount > 1 ? 's' : ''}`;
              } else if (folderCount > 0) {
                dragText = `Moving ${folderCount} folder${folderCount > 1 ? 's' : ''}`;
              } else if (templateCount > 0) {
                dragText = `Moving ${templateCount} template${templateCount > 1 ? 's' : ''}`;
              } else {
                dragText = `Moving ${count} items`;
              }
            }
            
            // Safely update the ghost element text
            if (ghostElement instanceof HTMLElement) {
              ghostElement.textContent = dragText;
            }
          }
        } catch (error) {
          console.warn('Error updating drag text:', error);
          // Fallback: try to set a basic text
          const ghostElement = document.querySelector('.ag-dnd-ghost');
          if (ghostElement instanceof HTMLElement) {
            ghostElement.textContent = 'Moving items';
          }
        }
      }, 50); // Increased delay
    };
  
    gridElement.addEventListener('dragstart', handleDragStart, { passive: true });
    
    return () => {
      gridElement.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

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
    }
  }, [restoreExpandedState, columnState, isGridStateLoaded]);

  // Restore column state when it becomes available (handles async loading from DB)
  useEffect(() => {
    if (isGridStateLoaded && columnState && columnState.length > 0 && gridRef.current?.api && !columnStateRestoredRef.current) {
      gridRef.current.api.applyColumnState({ state: columnState, applyOrder: true });
      columnStateRestoredRef.current = true;
    }
  }, [isGridStateLoaded, columnState]);

  // Add a new Template Folder
  // Add a new Template
  const addTemplate = useCallback(() => {
    const now = Date.now();
    if (lastOperation && now - lastOperation.timestamp < 500) {
      return;
    }
    setLastOperation({ type: 'addTemplate', timestamp: now });

    // All templates are root-level (no folders)
    // Open dialog to prompt for template name
    setNewTemplateName('');
    setTemplateNameError('');
    setTemplateNameDialogOpen(true);
  }, [lastOperation]);

  // Handle creating template with custom name
  const handleCreateTemplate = useCallback(() => {
    const trimmedName = newTemplateName.trim();

    // Validate name is not empty
    if (!trimmedName) {
      setTemplateNameError('Template name cannot be empty');
      return;
    }

    // Check for uniqueness at root level (all templates are root-level)
    const existingTemplates = templates.filter(t => !t.parent_id);
    const isDuplicate = existingTemplates.some(t => t.name === trimmedName);

    if (isDuplicate) {
      setTemplateNameError('A template with this name already exists');
      return;
    }

    // Get order for the new template
    const order = existingTemplates.length;

    const newTemplate = {
      name: trimmedName,
      active: true,
      type: 'template' as const,
      order
    };

    // Close dialog
    setTemplateNameDialogOpen(false);

    // Create the template
    createTemplate(newTemplate)
      .then((createdTemplate) => {
        if (!createdTemplate) {
          console.error('No template returned from createTemplate');
          return;
        }

        // Create TreeNode from the created template
        const newTemplateNode: TreeNode = {
          id: createdTemplate.id,
          name: createdTemplate.name,
          active: createdTemplate.active,
          type: 'template' as const,
          parent_id: createdTemplate.parent_id,
          order: createdTemplate.order
        };

        // Set empty schema and open Form Builder
        const emptySchema = {
          display: 'form',
          components: [],
          customClass: 'formio-form-wrapper'
        };

        setPendingFormBuilderSchema(emptySchema);
        setSelectedNode(newTemplateNode);
        setFormBuilderOpen(true);
      })
      .catch(error => {
        console.error('Failed to create template:', error);
        setTemplateNameError('Failed to create template. Please try again.');
        setTemplateNameDialogOpen(true);
      });
  }, [newTemplateName, templates, createTemplate]);

  // Open rename dialog
  const openRenameDialog = useCallback(() => {
    if (selectedNodes.length !== 1) return;
    const node = selectedNodes[0];
    setRenameValue(node.name);
    setRenameError('');
    setRenameDialogOpen(true);
  }, [selectedNodes]);

  // Handle rename
  const handleRename = useCallback(async () => {
    if (selectedNodes.length !== 1) return;
    const node = selectedNodes[0];
    const trimmedName = renameValue.trim();

    // Validate name is not empty
    if (!trimmedName) {
      setRenameError('Name cannot be empty');
      return;
    }

    // Check if name changed
    if (trimmedName === node.name) {
      setRenameDialogOpen(false);
      return;
    }

    // Check for uniqueness among siblings (same parent_id)
    const siblings = templates.filter(t => t.parent_id === node.parent_id && t.id !== node.id);
    const isDuplicate = siblings.some(t => t.name === trimmedName);

    if (isDuplicate) {
      setRenameError('An item with this name already exists in this location');
      return;
    }

    try {
      await updateTemplate(node.id, { name: trimmedName });
      setRenameDialogOpen(false);

      // Update the grid
      if (gridRef.current?.api) {
        const rowNode = gridRef.current.api.getRowNode(node.id);
        if (rowNode) {
          rowNode.setDataValue('name', trimmedName);
        }
      }
    } catch (error) {
      console.error('Failed to rename:', error);
      setRenameError('Failed to rename. Please try again.');
    }
  }, [selectedNodes, renameValue, templates, updateTemplate]);

  // Prepare delete confirmation
  const prepareDelete = useCallback(async () => {
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
    
    // Check if any templates have associated items
    const templateIds: string[] = [];
    
    // Collect all template IDs (including children of folders)
    const collectTemplateIds = (node: TreeNode): void => {
      if (node.type === 'template') {
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
        itemCount: node.type === 'template' ? (itemCountByTemplate[node.id] || 0) : 0
      };
      
      // If it's a folder, sum up item counts from child templates
      if (node.type === 'templateFolder' && node.children) {
        let totalItemCount = 0;
        const countItemsInFolder = (n: TreeNode): void => {
          if (n.type === 'template' && itemCountByTemplate[n.id]) {
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
    setDeleteDialogOpen(true);
  }, [selectedNodes, rowData]);

  // Context menu
  const getContextMenuItems = useCallback((params: any): (MenuItemDef | DefaultMenuItem)[] => {
    const node = params.node?.data as TreeNode;
    if (!node) return [];

    const isTemplate = node.type === 'template';

    return [
      {
        name: 'Edit',
        icon: '<span class="ag-icon ag-icon-edit"></span>',
        action: () => {
          if (isTemplate) {
            onRowDoubleClicked({ data: node });
          }
        },
        disabled: !isTemplate
      },
      {
        name: node.is_favorite ? 'Remove from Favorites' : 'Add to Favorites',
        icon: node.is_favorite ? '<span class="ag-icon ag-icon-cancel"></span>' : '<span class="ag-icon ag-icon-plus"></span>',
        action: async () => {
          await toggleFavorite(node.id);
          refreshTemplatesIfNeeded();
        },
        disabled: !isTemplate
      },
      {
        name: node.is_default ? 'Remove Default' : 'Set as Default',
        icon: '<span class="ag-icon ag-icon-pin"></span>',
        checked: node.is_default,
        action: async () => {
          await setDefaultTemplate(node.id);
          refreshTemplatesIfNeeded();
        },
        disabled: !isTemplate
      },
      'separator',
      {
        name: 'Delete',
        icon: '<span class="ag-icon ag-icon-cross"></span>',
        action: () => {
          gridRef.current?.api.selectNode(params.node, true, false);
          prepareDelete();
        }
      }
    ];
  }, [onRowDoubleClicked, prepareDelete, toggleFavorite, setDefaultTemplate, refreshTemplatesIfNeeded]);

  // Helper function to get the depth of a node in the tree
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
    
    // Collect all IDs to delete, organized by hierarchy level
    const deleteGroups: string[][] = [];
    
    itemsToDelete.forEach(node => {
      // Get all descendant IDs to delete
      const idsToDelete = getAllNodeIds(node);
      
      // Group IDs by depth (children first)
      idsToDelete.forEach(id => {
        const depth = getNodeDepth(rowData, id);
        if (!deleteGroups[depth]) {
          deleteGroups[depth] = [];
        }
        deleteGroups[depth].push(id);
      });
      
      // Remove node from tree
      const [_, newTree] = findAndRemoveNode(newRowData, node.id);
      newRowData = newTree;
    });
    
    // Update the UI immediately
    setRowData(newRowData);
    setSelectedNodes([]);
    setSelectedNode(null);
    setDeleteDialogOpen(false);
    
    // Execute deletes sequentially, starting from deepest level (children first)
    const executeSequentialDeletes = async () => {
      try {
        // Reverse the array to delete from deepest level first
        const reversedGroups = deleteGroups.reverse().filter(group => group && group.length > 0);
        
        for (const group of reversedGroups) {
          // Delete items in this level sequentially
          for (const id of group) {
            try {
              await deleteTemplate(id);
            } catch (err) {
              console.error(`Failed to delete item with ID ${id}:`, err);
              // Continue with other deletions even if one fails
            }
          }
        }
        
      } catch (error) {
        console.error('Error during deletion process:', error);
        // Refresh to show current state
        refreshTemplatesIfNeeded();
      }
    };
    
    // Start the sequential deletion process
    executeSequentialDeletes();
    
  }, [itemsToDelete, rowData, lastOperation, deleteTemplate, refreshTemplatesIfNeeded]);
  
  // Cancel deletion
  const cancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setItemsToDelete([]);
  }, []);

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
              {/*
              <Tooltip title="Add New Template Folder">
                <span>
                  <IconButton
                    onClick={addTemplateFolder}
                    className="toolbar-button"
                    color="primary"
                  >
                    <CreateNewFolderIcon />
                  </IconButton>
                </span>
              </Tooltip>
              */}
              <Tooltip title="Add Template">
                <span>
                  <IconButton
                    onClick={addTemplate}
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
          <Tooltip title="Refresh Templates">
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
          <Tooltip title="Rename Selected Item">
            <span>
              <IconButton
                onClick={openRenameDialog}
                disabled={selectedNodes.length !== 1}
                className="toolbar-button"
                color="primary"
              >
                <EditIcon />
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
          ...noSelectStyles as any // Apply the no-select styles
        }}
      >
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={flattenedRows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          autoGroupColumnDef={autoGroupColumnDef}
          treeData={true}
          animateRows={!isDragging}
          getDataPath={getDataPath}
          onCellValueChanged={onCellValueChanged}
          rowSelection={{
            mode: 'multiRow',
            checkboxes: false,
            enableSelectionWithoutKeys: false,
            enableClickSelection: true
          }}
          selectionColumnDef={{ hide: true } as any}
          // Disable text selection within cells
          enableCellTextSelection={false}
          onSelectionChanged={onSelectionChanged}
          onRowGroupOpened={onRowGroupOpened}
          onRowDragEnd={onRowDragEnd}
          onRowDragMove={onRowDragMove}
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
          // Drag configuration
          // Let AG Grid manage the visual indicators
          rowDragManaged={true}
          // Enable multi-row drag
          rowDragMultiRow={true}
          suppressDragLeaveHidesColumns={false}
          // Prevent row reordering during drag
          suppressMoveWhenRowDragging={true}
          // Add these for better drag experience
          // Only drag from the drag handle
          rowDragEntireRow={false}
          // Ensure row drag is enabled
          suppressRowDrag={false}
          getContextMenuItems={getContextMenuItems}
          popupParent={document.body}
          tooltipShowDelay={1500}
          tooltipShowMode="whenTruncated" />
      </div>
      {/* Form Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return; // Prevent closing
          }
          
          setFormDialogOpen(false);
          setPreviewMode(false);
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
          {selectedNode?.name} {previewMode ? 'Preview' : 'Form'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <Box sx={{ 
              width: '100%', 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden' 
            }}>
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {formSchema ? (
                  previewMode ? (
                    <div style={{ padding: '20px 0' }}>
                      <Typography variant="h6" gutterBottom>Form Preview</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Form
                        form={formSchema}
                        options={{
                          readOnly: false // Allow interaction in preview
                        } as any}
                        submission={{ data: formData }}
                      />
                    </div>
                  ) : (
                    <FormPreview
                      key={selectedNode?.id || 'preview'}
                      ref={formRef}
                      schema={formSchema}
                      templateId={selectedNode?.id || ''}
                      initialData={formData}
                      showSubmitButton={true}
                      onSubmit={handleFormSubmit}
                    />
                  )
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    height: '100%',
                    color: 'text.secondary'
                  }}>
                    <Typography>Loading form...</Typography>
                  </Box>
                )}
              </Box>
              
              {/* AI Assistant Section */}
              {!previewMode && selectedNode && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ my: 2 }} />
                  <AIAssistant
                    formSchema={formSchema}
                    onPopulateForm={handleFormPopulate}
                    disabled={!selectedNode}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setFormDialogOpen(false);
              setPreviewMode(false);
            }}
          >
            Close
          </Button>
          {/* Replace the original Form Builder button with one that closes this dialog first */}
          <Button
            onClick={() => {
              setFormDialogOpen(false);
              setFormBuilderOpen(false);
              setPendingFormBuilderSchema(null);

              // Load the schema and then open the form builder
              if (selectedNode) {
                loadCompleteTemplateForm(selectedNode)
                  .then((loadedSchema) => {  // <-- Capture the returned schema
                    setPendingFormBuilderSchema(loadedSchema);  // <-- Set it
                    setFormBuilderOpen(true);
                  })
                  .catch(error => {
                    console.error('Error loading template form:', error);
                    setPendingFormBuilderSchema({
                      display: 'form',
                      components: [],
                      customClass: 'formio-form-wrapper'
                    });
                    setFormBuilderOpen(true);
                  });
              }
            }} 
            variant="contained" 
            color="primary"
          >
            Open Form Builder
          </Button>
          {/* Keep the preview toggle for users who still want to use this dialog */}
          <Button 
            onClick={() => setPreviewMode(!previewMode)} 
            variant="outlined" 
            color="primary"
          >
            {previewMode ? 'Edit Form' : 'Preview Form'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Field Options Dialog */}
      <Dialog
        open={!!editingField}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return; // Prevent closing
          }
          
          setEditingField(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Field Options</DialogTitle>
        <DialogContent>
          {fieldOptions && (
            <div style={{ padding: '20px 0' }}>
              <FormGroup>
                <Typography variant="subtitle2" gutterBottom>Field Type</Typography>
                <select
                  value={fieldOptions.type}
                  onChange={(e) => setFieldOptions({
                    ...fieldOptions,
                    type: e.target.value
                  })}
                  style={{ 
                    width: '100%',
                    padding: '8px',
                    marginBottom: '16px'
                  }}
                >
                  <option value="textfield">Text Field</option>
                  <option value="textarea">Text Area</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="radio">Radio</option>
                </select>
                
                <Typography variant="subtitle2" gutterBottom>Label</Typography>
                <input
                  type="text"
                  value={fieldOptions.label}
                  onChange={(e) => setFieldOptions({
                    ...fieldOptions,
                    label: e.target.value
                  })}
                  style={{ 
                    width: '100%',
                    padding: '8px',
                    marginBottom: '16px'
                  }}
                />
                
                <Typography variant="subtitle2" gutterBottom>Placeholder</Typography>
                <input
                  type="text"
                  value={fieldOptions.placeholder || ''}
                  onChange={(e) => setFieldOptions({
                    ...fieldOptions,
                    placeholder: e.target.value
                  })}
                  style={{ 
                    width: '100%',
                    padding: '8px',
                    marginBottom: '16px'
                  }}
                />
                
                <Typography variant="subtitle2" gutterBottom>Description</Typography>
                <textarea
                  value={fieldOptions.description || ''}
                  onChange={(e) => setFieldOptions({
                    ...fieldOptions,
                    description: e.target.value
                  })}
                  style={{ 
                    width: '100%',
                    padding: '8px',
                    marginBottom: '16px',
                    minHeight: '60px'
                  }}
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={fieldOptions.required || false}
                      onChange={(e) => setFieldOptions({
                        ...fieldOptions,
                        required: e.target.checked
                      })}
                    />
                  }
                  label="Required"
                />
              </FormGroup>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingField(null)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (editingField && fieldOptions) {
                handleFieldOptionChange(editingField, fieldOptions);
                setEditingField(null);
              }
            }}
            variant="contained" 
            color="primary"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
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
          
          {/* Check if any templates have associated items */}
          {itemsToDelete.some(item => item.itemCount && item.itemCount > 0) && (
            <Box 
              sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: 'error.light', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'error.main'
              }}
            >
              <Typography variant="body1" color="error.dark" fontWeight="bold">
                ⚠️ WARNING: Content Items Will Be Deleted!
              </Typography>
              <Typography variant="body2" color="error.dark">
                The following templates have content items that will be permanently deleted:
              </Typography>
            </Box>
          )}
          
          <List>
            {itemsToDelete.map(item => (
              <ListItem key={item.id}>
                <ListItemIcon>
                  {getNodeIcon(item.type)}
                </ListItemIcon>
                <ListItemText 
                  primary={item.name} 
                  secondary={
                    <>
                      {item.descendantCount && item.descendantCount > 0 && (
                        <Typography component="span" variant="body2" display="block">
                          Will also delete {item.descendantCount} child item{item.descendantCount !== 1 ? 's' : ''}
                        </Typography>
                      )}
                      {item.itemCount && item.itemCount > 0 && (
                        <Typography 
                          component="span" 
                          variant="body2" 
                          color="error" 
                          display="block"
                          fontWeight="bold"
                        >
                          🗑️ {item.itemCount} content item{item.itemCount !== 1 ? 's' : ''} using this template will be deleted!
                        </Typography>
                      )}
                    </>
                  } 
                />
              </ListItem>
            ))}
          </List>
          
          <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
            Total items to be deleted: {
              itemsToDelete.reduce((total, item) => {
                const templates = 1 + (item.descendantCount || 0);
                const content = item.itemCount || 0;
                return total + templates + content;
              }, 0)
            }
            {' '}({itemsToDelete.reduce((total, item) => total + 1 + (item.descendantCount || 0), 0)} templates, 
            {' '}{itemsToDelete.reduce((total, item) => total + (item.itemCount || 0), 0)} content items)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" autoFocus>
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
      {/* Template Name Dialog */}
      <Dialog
        open={templateNameDialogOpen}
        onClose={() => setTemplateNameDialogOpen(false)}
        aria-labelledby="template-name-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="template-name-dialog-title">
          Create New Template
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newTemplateName}
            onChange={(e) => {
              setNewTemplateName(e.target.value);
              setTemplateNameError('');
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateTemplate();
              }
            }}
            error={!!templateNameError}
            helperText={templateNameError || 'Enter a unique name for your template'}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateNameDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleCreateTemplate} color="primary" variant="contained">
            Create & Open Form Builder
          </Button>
        </DialogActions>
      </Dialog>
      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        aria-labelledby="rename-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="rename-dialog-title">
          Rename {selectedNodes.length === 1 ? (selectedNodes[0].type === 'templateFolder' ? 'Folder' : 'Template') : 'Item'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={renameValue}
            onChange={(e) => {
              setRenameValue(e.target.value);
              setRenameError('');
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleRename();
              }
            }}
            error={!!renameError}
            helperText={renameError || 'Enter a new name'}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleRename} color="primary" variant="contained">
            Rename
          </Button>
        </DialogActions>
      </Dialog>
      {/* Form.io Builder Modal */}
      <FormEditor
        key={selectedNode?.id || 'form-editor'}
        templateId={selectedNode?.id || null}
        open={formBuilderOpen}
        onClose={() => {
          setFormBuilderOpen(false);
          setPendingFormBuilderSchema(null); // Clear the pending schema
          setPreviewMode(false);
          if (formDialogOpen && selectedNode) {
            loadCompleteTemplateForm(selectedNode)
              .then((loadedSchema) => {
                // If you need to reload, capture and set the schema
                setFormSchema(loadedSchema);
                setFormJsonSchema(loadedSchema);
              });
          }
        }}
        onSave={(schema) => {
          if (selectedNode) {
            saveFormSchema(selectedNode.id, schema);
            // Update the pending schema with the saved one
            setPendingFormBuilderSchema(schema);
          }
        }}
        initialSchema={pendingFormBuilderSchema || formJsonSchema}
        // Add initial tab selection based on preview mode
        defaultTab={previewMode ? 'preview' : 'edit'}
      />
      {/* Data Sources Manager Modal */}
      <DataSourcesManager
        open={dataSourcesOpen}
        onClose={() => setDataSourcesOpen(false)}
        onSave={() => {
          // Refresh the form if needed
          if (selectedNode && selectedNode.type === 'template') {
            loadCompleteTemplateForm(selectedNode);
          }
        }}
      />
      {/* Scripting Integration */}
      <ScriptingIntegration
        {...{
          open: scriptEditorOpen,
          onClose: () => setScriptEditorOpen(false),
          templateId: selectedNode?.id || null
        } as any}
      />
    </div>)
  );
};

const TemplatesPage = forwardRef<TemplatesPageRef, TemplatesPageProps>(TemplatesPageComponent);

export default TemplatesPage;