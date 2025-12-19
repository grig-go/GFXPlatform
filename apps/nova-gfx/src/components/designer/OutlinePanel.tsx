import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Plus, Layers, LayoutTemplate, Folder,
  Eye, EyeOff, Lock, Unlock, MoreHorizontal, Trash2, Copy,
  Group, Ungroup, ArrowRightLeft, LogIn, LogOut, Settings, FolderOpen,
  PenLine, FilePlus, Save, SaveAll, Pin, GripHorizontal, ExternalLink, Spline,
  Search, X, Database,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Button,
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@emergent-platform/ui';
import { useDesignerStore } from '@/stores/designerStore';
import { PropertiesPanel } from './PropertiesPanel';
import { DataBindingTab } from './DataBindingTab';
import { AddDataModal } from '@/components/dialogs/AddDataModal';
import { NewProjectDialog } from '@/components/dialogs/NewProjectDialog';
import { useConfirm } from '@/hooks/useConfirm';
import type { Template, Element, Layer } from '@emergent-platform/types';

export function OutlinePanel() {
  const [activeTab, setActiveTab] = useState('elements');
  const [showNewLayerDialog, setShowNewLayerDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [showRenameProjectDialog, setShowRenameProjectDialog] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [showAddDataModal, setShowAddDataModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [selectedLayerType, setSelectedLayerType] = useState<string>('custom');
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [propertySearch, setPropertySearch] = useState('');

  // Resizable properties panel state
  const [propertiesHeight, setPropertiesHeight] = useState(() => {
    // Load saved height from localStorage or default to 300px
    const saved = localStorage.getItem('nova-properties-panel-height');
    return saved ? parseInt(saved, 10) : 300;
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const navigate = useNavigate();
  const confirm = useConfirm();
  const {
    project, layers, addLayer, addTemplate, updateProjectSettings, isDirty, saveProject, isSaving, deleteLayer,
    elements, selectedElementIds, groupElements, ungroupElements, dataSourceId, saveProjectAs,
  } = useDesignerStore();

  // Listen for "open add data modal" events from child components
  useEffect(() => {
    const handleOpenAddDataModal = () => {
      setShowAddDataModal(true);
    };
    window.addEventListener('open-add-data-modal', handleOpenAddDataModal);
    return () => {
      window.removeEventListener('open-add-data-modal', handleOpenAddDataModal);
    };
  }, []);

  // Check if we can group (2+ elements selected from same parent)
  const canGroup = useMemo(() => {
    if (selectedElementIds.length < 2) return false;
    const selectedElements = elements.filter(e => selectedElementIds.includes(e.id));
    const parentIds = new Set(selectedElements.map(e => e.parent_element_id));
    return parentIds.size === 1; // All must have same parent
  }, [selectedElementIds, elements]);

  // Check if selected element is a group
  const selectedIsGroup = useMemo(() => {
    if (selectedElementIds.length !== 1) return false;
    const selected = elements.find(e => e.id === selectedElementIds[0]);
    return selected?.element_type === 'group';
  }, [selectedElementIds, elements]);

  // Handle group action
  const handleGroup = useCallback(() => {
    if (canGroup) {
      groupElements(selectedElementIds);
    }
  }, [canGroup, selectedElementIds, groupElements]);

  // Handle ungroup action
  const handleUngroup = useCallback(() => {
    if (selectedIsGroup) {
      ungroupElements(selectedElementIds[0]);
    }
  }, [selectedIsGroup, selectedElementIds, ungroupElements]);

  // Keyboard shortcuts for group/ungroup (Ctrl+G / Ctrl+Shift+G)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'g' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          // Ctrl+Shift+G = Ungroup
          if (selectedIsGroup) {
            handleUngroup();
          }
        } else {
          // Ctrl+G = Group
          if (canGroup) {
            handleGroup();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGroup, selectedIsGroup, handleGroup, handleUngroup]);

  // Handle drag to resize properties panel
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = propertiesHeight;
  }, [propertiesHeight]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const minHeight = 100; // Minimum properties panel height
      const maxHeight = containerRect.height - 150; // Leave space for tabs

      // Calculate new height (dragging up increases height)
      const deltaY = dragStartY.current - e.clientY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, dragStartHeight.current + deltaY));

      setPropertiesHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save to localStorage
      localStorage.setItem('nova-properties-panel-height', propertiesHeight.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, propertiesHeight]);

  // Handle renaming the project
  const handleRenameProject = async () => {
    if (!newItemName.trim() || !project) return;
    await updateProjectSettings({ name: newItemName.trim() });
    setNewItemName('');
    setShowRenameProjectDialog(false);
  };

  // Handle creating a new project
  const handleNewProject = () => {
    setShowNewProjectDialog(true);
  };

  // Handle creating a new layer
  const handleCreateLayer = async () => {
    if (!newItemName.trim()) return;
    await addLayer(selectedLayerType, newItemName.trim());
    setNewItemName('');
    setShowNewLayerDialog(false);
  };

  // Handle creating a new template
  const handleCreateTemplate = () => {
    if (!selectedLayerId) return;
    addTemplate(selectedLayerId, newItemName.trim() || undefined);
    setNewItemName('');
    setShowNewTemplateDialog(false);
  };

  // Handle deleting a layer with confirmation
  const handleDeleteLayer = async (layerId: string, layerName: string) => {
    const confirmed = await confirm({
      title: 'Delete Layer',
      description: `Are you sure you want to delete "${layerName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (confirmed) {
      deleteLayer(layerId);
    }
  };

  // Handle Save As - create a copy of the project with a new name
  const handleSaveAs = async () => {
    if (!saveAsName.trim()) return;
    setIsSavingAs(true);
    const newProjectId = await saveProjectAs(saveAsName.trim());
    setIsSavingAs(false);
    if (newProjectId) {
      setShowSaveAsDialog(false);
      setSaveAsName('');
      // Navigate to the new project
      navigate(`/projects/${newProjectId}`);
    }
  };

  return (
    <div ref={containerRef} className="h-full w-full min-w-0 min-h-0 flex flex-col bg-card border-l border-border overflow-hidden">
      {/* Header with Project Name */}
      <div className="p-2 border-b border-border flex items-center justify-between gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 -ml-1 max-w-[180px]">
              <span className="truncate font-semibold text-xs">{project?.name || 'No Project'}</span>
              <ChevronDown className="w-3 h-3 opacity-60 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={() => {
              setNewItemName(project?.name || '');
              setShowRenameProjectDialog(true);
            }}>
              <PenLine className="mr-2 h-4 w-4" />
              Rename Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {}}>
              <Settings className="mr-2 h-4 w-4" />
              Project Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => saveProject()}
              disabled={isSaving || !isDirty}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Project'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSaveAsName(project?.name ? `${project.name} (Copy)` : '');
                setShowSaveAsDialog(true);
              }}
              disabled={isSaving}
            >
              <SaveAll className="mr-2 h-4 w-4" />
              Save As...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleNewProject}>
              <FilePlus className="mr-2 h-4 w-4" />
              New Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/projects')}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Switch Project...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (project?.id) {
                  // Pulsar GFX URL - configurable via env, defaults to localhost:5174
                  const pulsarUrl = import.meta.env.VITE_PULSAR_GFX_URL || 'http://localhost:5174';
                  window.open(`${pulsarUrl}?project=${project.id}`, '_blank');
                }
              }}
              disabled={!project?.id}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Pulsar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Unsaved indicator with Save/Save As buttons */}
        {isDirty && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-amber-500 flex items-center gap-0.5">
              <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
              Unsaved
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => saveProject()}
              disabled={isSaving}
              className="h-5 px-1.5 text-[9px] text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
            >
              <Save className="w-3 h-3 mr-0.5" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSaveAsName(project?.name ? `${project.name} (Copy)` : '');
                setShowSaveAsDialog(true);
              }}
              disabled={isSaving || isSavingAs}
              className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted/50"
              title="Save As..."
            >
              <SaveAll className="w-3 h-3" />
            </Button>
          </div>
        )}
        
        <div className="flex-1" />

        {/* Group/Ungroup button - only visible when on Elements tab and elements are selected */}
        {activeTab === 'elements' && (canGroup || selectedIsGroup) && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-6 w-6 font-bold text-xs",
                    canGroup && "border-violet-500/50 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 hover:border-violet-400",
                    selectedIsGroup && "border-amber-500/50 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-400"
                  )}
                  onClick={canGroup ? handleGroup : handleUngroup}
                >
                  G
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {canGroup ? `Group (Ctrl+G)` : 'Ungroup (Ctrl+Shift+G)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setNewItemName('');
              setSelectedLayerType('custom');
              setShowNewLayerDialog(true);
            }}>
              <Layers className="mr-2 h-4 w-4" />
              New Layer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setNewItemName('');
              setShowNewFolderDialog(true);
            }}>
              <Folder className="mr-2 h-4 w-4" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setNewItemName('');
              setSelectedLayerId(layers[0]?.id || '');
              setShowNewTemplateDialog(true);
            }}>
              <LayoutTemplate className="mr-2 h-4 w-4" />
              New Template
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              const { showAll } = useDesignerStore.getState();
              showAll();
            }}>
              <Eye className="mr-2 h-4 w-4" />
              Show All Layers
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-2 mt-1.5 h-6 p-0.5 gap-0.5 flex-shrink-0">
          <TabsTrigger value="elements" className="flex-1 gap-1 text-[10px] px-2 py-0.5 h-5 rounded data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none">
            <LayoutTemplate className="w-3 h-3" />
            Elements
          </TabsTrigger>
          <TabsTrigger value="layers" className="flex-1 gap-1 text-[10px] px-2 py-0.5 h-5 rounded data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none">
            <Layers className="w-3 h-3" />
            Layers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layers" className="flex-1 mt-0 min-h-0">
          <ScrollArea className="h-full">
            <LayersTree />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="elements" className="flex-1 mt-0 min-h-0">
          <ScrollArea className="h-full">
            <ElementsTree />
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Draggable Resize Handle */}
      <div
        className={cn(
          "relative flex-shrink-0 h-2 cursor-ns-resize group border-t border-border",
          "hover:bg-violet-500/20 transition-colors",
          isDragging && "bg-violet-500/30"
        )}
        onMouseDown={handleDragStart}
      >
        {/* Visible grip indicator */}
        <div className={cn(
          "absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center",
          "opacity-40 group-hover:opacity-100 transition-opacity",
          isDragging && "opacity-100"
        )}>
          <GripHorizontal className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Bottom Panel - contextual based on selection and data state */}
      <div
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{ height: propertiesHeight }}
      >
        {selectedElementIds.length > 0 ? (
          /* Properties Panel - when elements are selected */
          <>
            <div className="p-2 border-b border-border flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-medium text-muted-foreground">PROPERTIES</h3>
              {/* Property Search */}
              <div className="relative flex-1 max-w-32">
                <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  className="h-5 text-[10px] pl-5 pr-5 bg-muted/50 border-transparent focus:border-input"
                />
                {propertySearch && (
                  <button
                    onClick={() => setPropertySearch('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <ScrollArea className="flex-1">
              <PropertiesPanel searchFilter={propertySearch} />
            </ScrollArea>
          </>
        ) : dataSourceId ? (
          /* Data Binding Panel - when template selected (no elements) and data source connected */
          <>
            <div className="p-2 border-b border-border flex items-center gap-2">
              <Database className="w-3 h-3 text-emerald-500" />
              <h3 className="text-[10px] font-medium text-muted-foreground">DATA BINDING</h3>
            </div>
            <DataBindingTab />
          </>
        ) : (
          /* Add Data Prompt - when template selected but no data source */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
              <Database className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">No Data Connected</p>
            <p className="text-xs text-muted-foreground/70 mb-4 max-w-[200px]">
              Connect a data source to create dynamic, data-driven graphics
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
              onClick={() => setShowAddDataModal(true)}
            >
              <Database className="w-4 h-4 mr-2" />
              Add Data Source
            </Button>
          </div>
        )}
      </div>

      {/* New Layer Dialog */}
      <Dialog open={showNewLayerDialog} onOpenChange={setShowNewLayerDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Layer</DialogTitle>
            <DialogDescription>
              Add a new layer to organize your graphics
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="layer-name">Layer Name</Label>
              <Input
                id="layer-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g., Sidebar, Alert, Custom"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateLayer()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="layer-type">Layer Type</Label>
              <Select value={selectedLayerType} onValueChange={setSelectedLayerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fullscreen">Fullscreen</SelectItem>
                  <SelectItem value="lower-third">Lower Third</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="ticker">Ticker</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="overlay">Overlay</SelectItem>
                  <SelectItem value="background">Background</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewLayerDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLayer} disabled={!newItemName.trim()}>
              Create Layer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Organize templates into folders
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g., Sports, News, Weather"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // TODO: Implement folder creation
              setShowNewFolderDialog(false);
              setNewItemName('');
            }} disabled={!newItemName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Template Dialog */}
      <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Add a new template to a layer
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="template-layer">Layer</Label>
              <Select value={selectedLayerId} onValueChange={setSelectedLayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select layer" />
                </SelectTrigger>
                <SelectContent>
                  {layers.map((layer) => (
                    <SelectItem key={layer.id} value={layer.id}>
                      {layer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-name">Template Name (optional)</Label>
              <Input
                id="template-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Leave empty for auto-generated name"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTemplate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!selectedLayerId}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={showRenameProjectDialog} onOpenChange={setShowRenameProjectDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for your project
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="My Project"
                onKeyDown={(e) => e.key === 'Enter' && handleRenameProject()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameProjectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameProject} disabled={!newItemName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save As Dialog */}
      <Dialog open={showSaveAsDialog} onOpenChange={setShowSaveAsDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save Project As</DialogTitle>
            <DialogDescription>
              Create a copy of this project with a new name
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="save-as-name">New Project Name</Label>
              <Input
                id="save-as-name"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder="My Project (Copy)"
                onKeyDown={(e) => e.key === 'Enter' && !isSavingAs && handleSaveAs()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveAsDialog(false)} disabled={isSavingAs}>
              Cancel
            </Button>
            <Button onClick={handleSaveAs} disabled={!saveAsName.trim() || isSavingAs}>
              <SaveAll className="mr-2 h-4 w-4" />
              {isSavingAs ? 'Saving...' : 'Save As'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
      />

      {/* Add Data Modal */}
      <AddDataModal
        open={showAddDataModal}
        onOpenChange={setShowAddDataModal}
      />
    </div>
  );
}

// Track on-air templates and their playback state
type PlaybackState = 'idle' | 'in' | 'loop' | 'out';

function LayersTree() {
  const {
    layers,
    templates,
    elements,
    selectedElementIds,
    expandedNodes,
    toggleNode,
    selectTemplate,
    currentTemplateId,
    animations,
    onAirTemplates,
    playIn: storePlayIn,
    playOut: storePlayOut,
    setOnAirState,
    clearOnAir,
    addTemplate,
    duplicateTemplate,
    deleteTemplate,
    toggleLayerVisibility,
    toggleLayerLock,
    updateLayer,
    deleteLayer,
    toggleTemplateVisibility,
    toggleTemplateLock,
  } = useDesignerStore();

  const confirm = useConfirm();

  // Handle deleting a layer with confirmation
  const handleDeleteLayer = useCallback(async (layerId: string, layerName: string) => {
    const confirmed = await confirm({
      title: 'Delete Layer',
      description: `Are you sure you want to delete "${layerName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (confirmed) {
      deleteLayer(layerId);
    }
  }, [confirm, deleteLayer]);

  // Handle deleting a template with confirmation
  const handleDeleteTemplate = useCallback(async (templateId: string, templateName: string) => {
    const confirmed = await confirm({
      title: 'Delete Template',
      description: `Are you sure you want to delete "${templateName}"? This will also delete all elements in the template. This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (confirmed) {
      deleteTemplate(templateId);
    }
  }, [confirm, deleteTemplate]);

  const sortedLayers = [...layers].sort((a, b) => b.z_index - a.z_index);

  // Find template ID of selected element(s) for highlighting
  const selectedElementTemplateId = useMemo(() => {
    if (selectedElementIds.length === 0) return null;
    const selectedElement = elements.find(e => e.id === selectedElementIds[0]);
    return selectedElement?.template_id || null;
  }, [selectedElementIds, elements]);

  // Auto-expand layer containing selected element's template
  useEffect(() => {
    if (selectedElementTemplateId) {
      const template = templates.find(t => t.id === selectedElementTemplateId);
      if (template && !expandedNodes.has(template.layer_id)) {
        toggleNode(template.layer_id);
      }
    }
  }, [selectedElementTemplateId, templates, expandedNodes, toggleNode]);

  // Play IN animation for a template
  const playIn = useCallback((templateId: string, layerId: string) => {
    storePlayIn(templateId, layerId);
    
    // After IN duration, switch to LOOP
    const templateAnims = animations.filter(
      (a) => templates.find((t) => t.id === templateId)?.id && a.phase === 'in'
    );
    const maxDuration = Math.max(500, ...templateAnims.map((a) => a.delay + a.duration));
    
    setTimeout(() => {
      const current = useDesignerStore.getState().onAirTemplates[layerId];
      if (current?.templateId === templateId && current?.state === 'in') {
        setOnAirState(layerId, 'loop');
      }
    }, maxDuration);
  }, [animations, templates, storePlayIn, setOnAirState]);

  // Play OUT animation for a template
  const playOut = useCallback((layerId: string) => {
    const current = onAirTemplates[layerId];
    if (!current) return;
    
    storePlayOut(layerId);
    
    // After OUT duration, remove from on-air
    const templateAnims = animations.filter(
      (a) => templates.find((t) => t.id === current.templateId)?.id && a.phase === 'out'
    );
    const maxDuration = Math.max(500, ...templateAnims.map((a) => a.delay + a.duration));
    
    setTimeout(() => {
      const currentState = useDesignerStore.getState().onAirTemplates[layerId];
      if (currentState?.state === 'out') {
        clearOnAir(layerId);
      }
    }, maxDuration);
  }, [animations, templates, onAirTemplates, storePlayOut, clearOnAir]);

  // Switch to next template in layer (OUT current, then IN next)
  const switchLayerTemplate = useCallback((layerId: string) => {
    const layerTemplates = templates.filter((t) => t.layer_id === layerId);
    if (layerTemplates.length < 2) return; // Need at least 2 templates to switch
    
    const current = onAirTemplates[layerId];
    
    if (current) {
      // Find current template index
      const currentIndex = layerTemplates.findIndex((t) => t.id === current.templateId);
      // Get next template (cycle to first if at end)
      const nextIndex = (currentIndex + 1) % layerTemplates.length;
      const nextTemplate = layerTemplates[nextIndex];
      
      if (nextTemplate.id !== current.templateId) {
        // Play out current
        storePlayOut(layerId);
        
        const outAnims = animations.filter(
          (a) => templates.find((t) => t.id === current.templateId)?.id && a.phase === 'out'
        );
        const outDuration = Math.max(300, ...outAnims.map((a) => a.delay + a.duration));
        
        // After out, play in next
        setTimeout(() => {
          playIn(nextTemplate.id, layerId);
        }, outDuration);
      }
    } else {
      // No current template, just play in the first one
      playIn(layerTemplates[0].id, layerId);
    }
  }, [animations, templates, onAirTemplates, storePlayOut, playIn]);

  return (
    <div className="p-1.5 space-y-0.5">
      {sortedLayers.map((layer) => {
        const layerTemplates = templates.filter((t) => t.layer_id === layer.id);
        const isExpanded = expandedNodes.has(layer.id);
        const onAir = onAirTemplates[layer.id];

        return (
          <div key={layer.id}>
            {/* Layer Header */}
            <div
              className={cn(
                'flex items-center gap-1 px-1.5 py-1 rounded-md group hover:bg-muted/50 cursor-pointer',
                isExpanded && 'bg-muted/30',
                onAir && 'border-l-2 border-emerald-500'
              )}
              onClick={() => toggleNode(layer.id)}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(layer.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
              <Layers className="w-3 h-3 text-muted-foreground" />
              <span className="flex-1 text-xs truncate">{layer.name}</span>
              
              {/* On-Air indicator */}
              {onAir && (
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded font-medium",
                  onAir.state === 'in' && 'bg-emerald-500/20 text-emerald-400',
                  onAir.state === 'loop' && 'bg-emerald-500/30 text-emerald-300 animate-pulse',
                  onAir.state === 'out' && 'bg-amber-500/20 text-amber-400'
                )}>
                  {onAir.state === 'loop' ? 'ON AIR' : onAir.state.toUpperCase()}
                </span>
              )}
              
              <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100">
                z:{layer.z_index}
              </span>
              
              {/* Layer Action Buttons */}
              <TooltipProvider delayDuration={200}>
                <div className="flex items-center gap-0.5">
                  {/* Visibility Toggle - always visible if layer is hidden */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-4 w-4 p-0",
                          !layer.enabled ? "opacity-100 text-muted-foreground" : "opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerVisibility(layer.id);
                        }}
                      >
                        {layer.enabled ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-amber-500" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="text-[10px]">{layer.enabled ? 'Hide Layer' : 'Show Layer'}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Lock Toggle - always visible if layer is locked */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-4 w-4 p-0",
                          layer.locked ? "opacity-100 text-amber-500" : "opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerLock(layer.id);
                        }}
                      >
                        {layer.locked ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="text-xs">{layer.locked ? 'Unlock Layer' : 'Lock Layer'}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Always On Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-4 w-4 p-0",
                          layer.always_on ? "opacity-100 text-violet-500" : "opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateLayer(layer.id, { always_on: !layer.always_on });
                        }}
                      >
                        <Pin className={cn("w-3 h-3", layer.always_on && "fill-violet-500")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="text-xs">{layer.always_on ? 'Disable Always On' : 'Enable Always On'}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Switch Template (only show if multiple templates in layer) */}
                  {layerTemplates.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            switchLayerTemplate(layer.id);
                          }}
                          disabled={onAir && onAir.state !== 'loop'}
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="text-xs">Switch Template (OUT → IN)</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* Add Template Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          addTemplate(layer.id);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="text-xs">Add Template to {layer.name}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Delete Layer Button - only show if layer is empty */}
                  {layerTemplates.length === 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLayer(layer.id, layer.name);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="text-xs">Delete Layer</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            </div>

            {/* Templates in Layer */}
            {isExpanded && (
              <div className="ml-5 space-y-0.5 mt-0.5">
                {layerTemplates.length === 0 ? (
                  <div className="text-[10px] text-muted-foreground py-1 px-1.5">
                    No templates
                  </div>
                ) : (
                  layerTemplates.map((template) => (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      isSelected={currentTemplateId === template.id}
                      hasSelectedElement={selectedElementTemplateId === template.id}
                      isOnAir={onAir?.templateId === template.id}
                      playbackState={onAir?.templateId === template.id ? onAir.state : 'idle'}
                      onClick={() => selectTemplate(template.id)}
                      onPlayIn={() => playIn(template.id, layer.id)}
                      onPlayOut={() => playOut(layer.id)}
                      onDuplicate={() => duplicateTemplate(template.id)}
                      onDelete={() => handleDeleteTemplate(template.id, template.name)}
                      onToggleVisibility={() => toggleTemplateVisibility(template.id)}
                      onToggleLock={() => toggleTemplateLock(template.id)}
                      onAddData={() => {
                        selectTemplate(template.id);
                        window.dispatchEvent(new CustomEvent('open-add-data-modal'));
                      }}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface TemplateItemProps {
  template: Template;
  isSelected: boolean;
  hasSelectedElement: boolean;
  isOnAir: boolean;
  playbackState: PlaybackState;
  onClick: () => void;
  onPlayIn: () => void;
  onPlayOut: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onAddData: () => void;
}

function TemplateItem({
  template,
  isSelected,
  hasSelectedElement,
  isOnAir,
  playbackState,
  onClick,
  onPlayIn,
  onPlayOut,
  onDuplicate,
  onDelete,
  onToggleVisibility,
  onToggleLock,
  onAddData,
}: TemplateItemProps) {
  const { updateTemplate } = useDesignerStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(template.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setRenameValue(template.name);
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== template.name) {
      updateTemplate(template.id, { name: renameValue.trim() });
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setRenameValue(template.name);
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer group',
        isSelected && 'bg-violet-500/20 text-violet-300',
        // Highlight template when it contains a selected element (but not already selected)
        hasSelectedElement && !isSelected && 'bg-amber-500/20 border border-amber-500/40 text-amber-300',
        isOnAir && !isSelected && !hasSelectedElement && 'bg-emerald-500/10',
        !isSelected && !isOnAir && !hasSelectedElement && 'hover:bg-muted/50',
        !template.enabled && 'opacity-50'
      )}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
    >
      <LayoutTemplate className={cn(
        "w-3 h-3",
        hasSelectedElement && !isSelected ? "text-amber-400" : isOnAir ? "text-emerald-400" : "text-muted-foreground"
      )} />
      {isRenaming ? (
        <Input
          ref={renameInputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          className="h-5 text-xs px-1.5 flex-1"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-xs truncate">{template.name}</span>
      )}
      
      {/* Visibility & Lock toggles */}
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-0.5">
          {/* Visibility Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-4 w-4 p-0",
                  !template.enabled ? "opacity-100 text-amber-500" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility();
                }}
              >
                {template.enabled ? (
                  <Eye className="w-2.5 h-2.5" />
                ) : (
                  <EyeOff className="w-2.5 h-2.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-[10px]">{template.enabled ? 'Hide Template' : 'Show Template'}</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Lock Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-4 w-4 p-0",
                  template.locked ? "opacity-100 text-amber-500" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock();
                }}
              >
                {template.locked ? (
                  <Lock className="w-3 h-3" />
                ) : (
                  <Unlock className="w-3 h-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">{template.locked ? 'Unlock Template' : 'Lock Template'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      
      {/* Playback Action Buttons */}
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Play IN */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 p-0",
                  playbackState === 'in' && "bg-emerald-500/20 text-emerald-400"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayIn();
                }}
                disabled={playbackState === 'in'}
              >
                <LogIn className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Play IN Animation</p>
            </TooltipContent>
          </Tooltip>

          {/* Play OUT */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 p-0",
                  playbackState === 'out' && "bg-amber-500/20 text-amber-400"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayOut();
                }}
                disabled={!isOnAir || playbackState === 'out'}
              >
                <LogOut className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Play OUT Animation</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* More Options Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onPlayIn}>
            <LogIn className="mr-2 h-4 w-4" />
            Play IN
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPlayOut} disabled={!isOnAir}>
            <LogOut className="mr-2 h-4 w-4" />
            Play OUT
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            onAddData();
          }}>
            <Database className="mr-2 h-4 w-4 text-emerald-500" />
            Add Data Source
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ElementsTree() {
  const {
    elements,
    selectedElementIds,
    selectElements,
    updateElement,
    duplicateElement,
    deleteElements,
    groupElements,
    ungroupElements,
    moveElementsToTemplate,
    reorderElement,
    expandedNodes,
    toggleNode,
    templates,
    currentTemplateId,
    layers,
    addTemplate,
    setShowEasingEditor,
  } = useDesignerStore();

  // Handle opening the easing editor for an element
  const handleEditEasing = useCallback((elementId: string) => {
    selectElements([elementId], 'replace');
    setShowEasingEditor(true);
  }, [selectElements, setShowEasingEditor]);

  // Get layers that have no templates (empty layers)
  const emptyLayers = layers.filter(layer =>
    !templates.some(t => t.layer_id === layer.id)
  );

  // Handle moving elements to an empty layer (creates a template first)
  const handleMoveToEmptyLayer = useCallback(async (elementIds: string[], layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    // Create a new template in that layer
    const templateName = `${layer.name} Graphic`;
    const newTemplateId = addTemplate(layerId, templateName);

    // Move elements to the new template
    if (newTemplateId) {
      moveElementsToTemplate(elementIds, newTemplateId);
    }
  }, [layers, addTemplate, moveElementsToTemplate]);

  // Drag state for reordering
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  // Build element tree (only root elements)
  const rootElements = elements
    .filter((e) => !e.parent_element_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Handle multi-select with Ctrl/Cmd
  // Skip auto-expand since user is already in the outline panel
  const handleElementClick = useCallback((elementId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      selectElements([elementId], 'toggle', { expandInOutline: false });
    } else if (event.shiftKey && selectedElementIds.length > 0) {
      // Shift+click for range selection
      const allIds = elements.map(e => e.id);
      const lastSelected = selectedElementIds[selectedElementIds.length - 1];
      const lastIndex = allIds.indexOf(lastSelected);
      const clickedIndex = allIds.indexOf(elementId);
      const start = Math.min(lastIndex, clickedIndex);
      const end = Math.max(lastIndex, clickedIndex);
      const rangeIds = allIds.slice(start, end + 1);
      selectElements(rangeIds, 'replace', { expandInOutline: false });
    } else {
      selectElements([elementId], 'replace', { expandInOutline: false });
    }
  }, [selectElements, selectedElementIds, elements]);

  // Handle group action
  const handleGroup = useCallback(() => {
    if (selectedElementIds.length >= 2) {
      groupElements(selectedElementIds);
    }
  }, [selectedElementIds, groupElements]);

  // Handle ungroup action
  const handleUngroup = useCallback((groupId: string) => {
    ungroupElements(groupId);
  }, [ungroupElements]);

  // Check if selection can be grouped
  const canGroup = selectedElementIds.length >= 2;

  // Check if selected element is a group
  const selectedIsGroup = selectedElementIds.length === 1 &&
    elements.find(e => e.id === selectedElementIds[0])?.element_type === 'group';

  // Handle drag start
  const handleDragStart = useCallback((elementId: string) => {
    setDraggedId(elementId);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((targetId: string, position: 'before' | 'after' | 'inside') => {
    if (draggedId && targetId !== draggedId) {
      setDropTargetId(targetId);
      setDropPosition(position);
    }
  }, [draggedId]);

  // Handle drag end / drop
  const handleDrop = useCallback(() => {
    if (draggedId && dropTargetId && dropPosition) {
      const draggedElement = elements.find(e => e.id === draggedId);
      const targetElement = elements.find(e => e.id === dropTargetId);

      if (draggedElement && targetElement) {
        // Get siblings of the target element
        const targetParentId = dropPosition === 'inside' ? dropTargetId : targetElement.parent_element_id;
        const siblings = elements
          .filter(e => e.parent_element_id === targetParentId && e.id !== draggedId)
          .sort((a, b) => a.sort_order - b.sort_order);

        let targetIndex = 0;
        if (dropPosition === 'inside') {
          // Dropping inside a group - put at the end
          targetIndex = siblings.length;
        } else {
          // Find target's index among siblings
          const targetIdx = siblings.findIndex(e => e.id === dropTargetId);
          targetIndex = dropPosition === 'before' ? targetIdx : targetIdx + 1;
          if (targetIndex < 0) targetIndex = 0;
        }

        reorderElement(draggedId, targetIndex, targetParentId);
      }
    }

    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
  }, [draggedId, dropTargetId, dropPosition, elements, reorderElement]);

  // Handle drag cancel
  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
  }, []);

  if (elements.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No elements in this template
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="p-2 space-y-0.5">
          {rootElements.map((element, index) => (
            <ElementItem
              key={element.id}
              element={element}
              elements={elements}
              selectedElementIds={selectedElementIds}
              expandedNodes={expandedNodes}
              onToggleNode={toggleNode}
              onClick={handleElementClick}
              onToggleVisibility={(id, visible) => updateElement(id, { visible })}
              onToggleLock={(id, locked) => updateElement(id, { locked })}
              onDuplicate={duplicateElement}
              onDelete={(id) => deleteElements([id])}
              onUngroup={handleUngroup}
              onMoveToTemplate={moveElementsToTemplate}
              onMoveToEmptyLayer={handleMoveToEmptyLayer}
              onEditEasing={handleEditEasing}
              templates={templates}
              layers={layers}
              currentTemplateId={currentTemplateId}
              depth={0}
              index={index}
              draggedId={draggedId}
              dropTargetId={dropTargetId}
              dropPosition={dropPosition}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {canGroup && (
          <ContextMenuItem onClick={handleGroup}>
            <Group className="mr-2 h-4 w-4" />
            Group Selected ({selectedElementIds.length})
          </ContextMenuItem>
        )}
        {selectedIsGroup && (
          <ContextMenuItem onClick={() => handleUngroup(selectedElementIds[0])}>
            <Ungroup className="mr-2 h-4 w-4" />
            Ungroup
          </ContextMenuItem>
        )}
        {(canGroup || selectedIsGroup) && <ContextMenuSeparator />}
        {selectedElementIds.length > 0 && (templates.filter(t => t.id !== currentTemplateId).length > 0 || emptyLayers.length > 0) && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Move to Template
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
              {/* Group templates by layer */}
              {layers.map(layer => {
                const layerTemplates = templates.filter(t => t.layer_id === layer.id && t.id !== currentTemplateId);
                const isEmptyLayer = !templates.some(t => t.layer_id === layer.id);

                if (layerTemplates.length === 0 && !isEmptyLayer) return null;

                return (
                  <div key={layer.id}>
                    <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {layer.name}
                    </div>
                    {layerTemplates.map(template => (
                      <ContextMenuItem
                        key={template.id}
                        onClick={() => moveElementsToTemplate(selectedElementIds, template.id)}
                        className="pl-4"
                      >
                        {template.name}
                      </ContextMenuItem>
                    ))}
                    {isEmptyLayer && (
                      <ContextMenuItem
                        onClick={() => handleMoveToEmptyLayer(selectedElementIds, layer.id)}
                        className="pl-4 text-muted-foreground italic"
                      >
                        + Create new template
                      </ContextMenuItem>
                    )}
                  </div>
                );
              })}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        {selectedElementIds.length > 0 && <ContextMenuSeparator />}
        {selectedElementIds.length > 0 && (
          <ContextMenuItem
            onClick={() => deleteElements(selectedElementIds)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

interface ElementItemProps {
  element: Element;
  elements: Element[];
  selectedElementIds: string[];
  expandedNodes: Set<string>;
  onToggleNode: (id: string) => void;
  onClick: (id: string, event: React.MouseEvent) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
  onToggleLock: (id: string, locked: boolean) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onUngroup: (id: string) => void;
  onMoveToTemplate: (elementIds: string[], templateId: string) => void;
  onMoveToEmptyLayer: (elementIds: string[], layerId: string) => void;
  onEditEasing: (elementId: string) => void;
  templates: Template[];
  layers: Layer[];
  currentTemplateId: string | null;
  depth: number;
  index: number;
  draggedId: string | null;
  dropTargetId: string | null;
  dropPosition: 'before' | 'after' | 'inside' | null;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, position: 'before' | 'after' | 'inside') => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function ElementItem({
  element,
  elements,
  selectedElementIds,
  expandedNodes,
  onToggleNode,
  onClick,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onDelete,
  onUngroup,
  onMoveToTemplate,
  onMoveToEmptyLayer,
  onEditEasing,
  templates,
  layers,
  currentTemplateId,
  depth,
  index,
  draggedId,
  dropTargetId,
  dropPosition,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ElementItemProps) {
  const isDragging = draggedId === element.id;
  const isDropTarget = dropTargetId === element.id;
  const { updateElement } = useDesignerStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(element.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const isSelected = selectedElementIds.includes(element.id);
  const isGroup = element.element_type === 'group';
  const isShape = element.element_type === 'shape';
  const canHaveChildren = isGroup || isShape; // Groups and shapes can have children
  const children = elements.filter((e) => e.parent_element_id === element.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(element.id);

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setRenameValue(element.name);
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== element.name) {
      updateElement(element.id, { name: renameValue.trim() });
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setRenameValue(element.name);
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  // Element type icons/letters
  const getElementIcon = (type: string) => {
    const icons: Record<string, string> = {
      div: 'D',
      text: 'T',
      image: 'I',
      shape: 'S',
      group: 'G',
      video: 'V',
      lottie: 'L',
    };
    return icons[type] || type.charAt(0).toUpperCase();
  };

  // Calculate drop position based on mouse position in element
  const handleDragOverElement = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    // Determine position: top 25% = before, bottom 25% = after, middle = inside (for groups/shapes)
    if (y < height * 0.25) {
      onDragOver(element.id, 'before');
    } else if (y > height * 0.75) {
      onDragOver(element.id, 'after');
    } else if (canHaveChildren) {
      onDragOver(element.id, 'inside');
    } else {
      onDragOver(element.id, y < height / 2 ? 'before' : 'after');
    }
  }, [element.id, canHaveChildren, onDragOver]);

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer group relative',
              isSelected
                ? 'bg-violet-500/20 text-violet-300'
                : 'hover:bg-muted/50',
              isDragging && 'opacity-50',
              isDropTarget && dropPosition === 'inside' && 'ring-2 ring-violet-500 bg-violet-500/10'
            )}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
            onClick={(e) => onClick(element.id, e)}
            draggable={!isRenaming}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', element.id);
              onDragStart(element.id);
            }}
            onDragOver={handleDragOverElement}
            onDragLeave={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDrop();
            }}
            onDragEnd={onDragEnd}
          >
            {/* Drop indicator - before */}
            {isDropTarget && dropPosition === 'before' && (
              <div className="absolute left-0 right-0 top-0 h-0.5 bg-violet-500 -translate-y-0.5" />
            )}
            {/* Drop indicator - after */}
            {isDropTarget && dropPosition === 'after' && (
              <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-violet-500 translate-y-0.5" />
            )}
            {/* Expand/Collapse for groups and shapes with children */}
            {(canHaveChildren || hasChildren) ? (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-5 w-5 p-0 -ml-1",
                  isGroup && "text-violet-400 hover:text-violet-300",
                  isShape && hasChildren && "text-blue-400 hover:text-blue-300"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleNode(element.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            ) : (
              <div className="w-4" />
            )}

            {/* Type indicator */}
            <span className={cn(
              "w-5 h-5 flex items-center justify-center text-[10px] rounded",
              isGroup ? "bg-violet-500/30 text-violet-300 font-semibold" : "text-muted-foreground"
            )}>
              {getElementIcon(element.element_type)}
            </span>

            {/* Name */}
            {isRenaming ? (
              <Input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                className="h-5 text-xs px-1.5 flex-1"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="flex-1 text-xs truncate"
                onDoubleClick={handleDoubleClick}
              >
                {element.name}
                {/* Children count in parentheses for groups */}
                {isGroup && hasChildren && (
                  <span className="text-muted-foreground ml-1">({children.length})</span>
                )}
              </span>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(element.id, !element.visible);
                }}
                title={element.visible ? 'Hide' : 'Show'}
              >
                {element.visible ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(element.id, !element.locked);
                }}
                title={element.locked ? 'Unlock' : 'Lock'}
              >
                {element.locked ? (
                  <Lock className="w-3 h-3 text-amber-400" />
                ) : (
                  <Unlock className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(element.id);
                }}
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(element.id);
                }}
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {isGroup && (
            <>
              <ContextMenuItem onClick={() => onUngroup(element.id)}>
                <Ungroup className="mr-2 h-4 w-4" />
                Ungroup
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => onToggleVisibility(element.id, !element.visible)}>
            {element.visible ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Show
              </>
            )}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onToggleLock(element.id, !element.locked)}>
            {element.locked ? (
              <>
                <Unlock className="mr-2 h-4 w-4" />
                Unlock
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Lock
              </>
            )}
          </ContextMenuItem>
          {/* Move to Template submenu */}
          {(templates.filter(t => t.id !== currentTemplateId).length > 0 || layers.some(l => !templates.some(t => t.layer_id === l.id))) && (
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Move to Template
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
                {/* Group templates by layer */}
                {layers.map(layer => {
                  const layerTemplates = templates.filter(t => t.layer_id === layer.id && t.id !== currentTemplateId);
                  const isEmptyLayer = !templates.some(t => t.layer_id === layer.id);

                  if (layerTemplates.length === 0 && !isEmptyLayer) return null;

                  return (
                    <div key={layer.id}>
                      <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {layer.name}
                      </div>
                      {layerTemplates.map(template => (
                        <ContextMenuItem
                          key={template.id}
                          onClick={() => onMoveToTemplate([element.id], template.id)}
                          className="pl-4"
                        >
                          {template.name}
                        </ContextMenuItem>
                      ))}
                      {isEmptyLayer && (
                        <ContextMenuItem
                          onClick={() => onMoveToEmptyLayer([element.id], layer.id)}
                          className="pl-4 text-muted-foreground italic"
                        >
                          + Create new template
                        </ContextMenuItem>
                      )}
                    </div>
                  );
                })}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onEditEasing(element.id)}
            className="text-violet-400"
          >
            <Spline className="mr-2 h-4 w-4" />
            Edit Easing Curve...
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onDuplicate(element.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onDelete(element.id)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Children (for groups) */}
      {isExpanded && hasChildren && (
        <div className="space-y-0.5">
          {children
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((child, childIndex) => (
            <ElementItem
              key={child.id}
              element={child}
              elements={elements}
              selectedElementIds={selectedElementIds}
              expandedNodes={expandedNodes}
              onToggleNode={onToggleNode}
              onClick={onClick}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onUngroup={onUngroup}
              onMoveToTemplate={onMoveToTemplate}
              onMoveToEmptyLayer={onMoveToEmptyLayer}
              onEditEasing={onEditEasing}
              templates={templates}
              layers={layers}
              currentTemplateId={currentTemplateId}
              depth={depth + 1}
              index={childIndex}
              draggedId={draggedId}
              dropTargetId={dropTargetId}
              dropPosition={dropPosition}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
