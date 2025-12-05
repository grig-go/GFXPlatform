import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Plus, Layers, LayoutTemplate, Folder,
  Eye, EyeOff, Lock, Unlock, MoreHorizontal, Trash2, Copy,
  Group, Ungroup, ArrowRightLeft, LogIn, LogOut, Settings, FolderOpen,
  PenLine, FilePlus, Save, Play, Pin, GripHorizontal,
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
import { PreviewControlPanel } from './PreviewControlPanel';
import { NewProjectDialog } from '@/components/dialogs/NewProjectDialog';
import { useConfirm } from '@/hooks/useConfirm';
import type { Template, Element } from '@emergent-platform/types';

export function OutlinePanel() {
  const [activeTab, setActiveTab] = useState('layers');
  const [showNewLayerDialog, setShowNewLayerDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [showRenameProjectDialog, setShowRenameProjectDialog] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [selectedLayerType, setSelectedLayerType] = useState<string>('custom');
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');

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
  const { project, layers, addLayer, addTemplate, updateProjectSettings, isDirty, saveProject, isSaving, deleteLayer } = useDesignerStore();

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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleNewProject}>
              <FilePlus className="mr-2 h-4 w-4" />
              New Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/projects')}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Switch Project...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Unsaved indicator */}
        {isDirty && (
          <span className="text-[9px] text-amber-500 flex items-center gap-0.5">
            <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
            Unsaved
          </span>
        )}
        
        <div className="flex-1" />
        
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-1.5 h-6 p-0.5 gap-0.5">
          <TabsTrigger value="layers" className="flex-1 gap-1 text-[10px] px-2 py-0.5 h-5 rounded data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none">
            <Layers className="w-3 h-3" />
            Layers
          </TabsTrigger>
          <TabsTrigger value="elements" className="flex-1 gap-1 text-[10px] px-2 py-0.5 h-5 rounded data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none">
            <LayoutTemplate className="w-3 h-3" />
            Elements
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex-1 gap-1 text-[10px] px-2 py-0.5 h-5 rounded data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none">
            <Play className="w-3 h-3" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layers" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <LayersTree />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="elements" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <ElementsTree />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 mt-0">
          <PreviewControlPanel />
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

      {/* Properties Section */}
      <div
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{ height: propertiesHeight }}
      >
        <div className="p-2 border-b border-border">
          <h3 className="text-[10px] font-medium text-muted-foreground">PROPERTIES</h3>
        </div>
        <ScrollArea className="flex-1">
          <PropertiesPanel />
        </ScrollArea>
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

      {/* New Project Dialog */}
      <NewProjectDialog 
        open={showNewProjectDialog} 
        onOpenChange={setShowNewProjectDialog} 
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
                      onDelete={() => deleteTemplate(template.id)}
                      onToggleVisibility={() => toggleTemplateVisibility(template.id)}
                      onToggleLock={() => toggleTemplateLock(template.id)}
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
    deleteElements,
    groupElements,
    ungroupElements,
    moveElementsToTemplate,
    expandedNodes,
    toggleNode,
    templates,
    currentTemplateId,
  } = useDesignerStore();

  // Build element tree (only root elements)
  const rootElements = elements
    .filter((e) => !e.parent_element_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Handle multi-select with Ctrl/Cmd
  const handleElementClick = useCallback((elementId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      selectElements([elementId], 'toggle');
    } else if (event.shiftKey && selectedElementIds.length > 0) {
      // Shift+click for range selection
      const allIds = elements.map(e => e.id);
      const lastSelected = selectedElementIds[selectedElementIds.length - 1];
      const lastIndex = allIds.indexOf(lastSelected);
      const clickedIndex = allIds.indexOf(elementId);
      const start = Math.min(lastIndex, clickedIndex);
      const end = Math.max(lastIndex, clickedIndex);
      const rangeIds = allIds.slice(start, end + 1);
      selectElements(rangeIds, 'replace');
    } else {
      selectElements([elementId], 'replace');
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
          {/* Toolbar for group actions */}
          {(canGroup || selectedIsGroup) && (
            <div className="flex gap-1 mb-2 px-1">
              {canGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleGroup}
                >
                  <Group className="w-3 h-3" />
                  Group
                </Button>
              )}
              {selectedIsGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleUngroup(selectedElementIds[0])}
                >
                  <Ungroup className="w-3 h-3" />
                  Ungroup
                </Button>
              )}
            </div>
          )}
          
          {rootElements.map((element) => (
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
              onDelete={(id) => deleteElements([id])}
              onUngroup={handleUngroup}
              onMoveToTemplate={moveElementsToTemplate}
              templates={templates}
              currentTemplateId={currentTemplateId}
              depth={0}
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
        {selectedElementIds.length > 0 && templates.filter(t => t.id !== currentTemplateId).length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Move to Template
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {templates
                .filter(t => t.id !== currentTemplateId)
                .map(template => (
                  <ContextMenuItem
                    key={template.id}
                    onClick={() => moveElementsToTemplate(selectedElementIds, template.id)}
                  >
                    {template.name}
                  </ContextMenuItem>
                ))}
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
  onDelete: (id: string) => void;
  onUngroup: (id: string) => void;
  onMoveToTemplate: (elementIds: string[], templateId: string) => void;
  templates: Template[];
  currentTemplateId: string | null;
  depth: number;
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
  onDelete,
  onUngroup,
  onMoveToTemplate,
  templates,
  currentTemplateId,
  depth,
}: ElementItemProps) {
  const { updateElement } = useDesignerStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(element.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const isSelected = selectedElementIds.includes(element.id);
  const isGroup = element.element_type === 'group';
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

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer group',
              isSelected
                ? 'bg-violet-500/20 text-violet-300'
                : 'hover:bg-muted/50'
            )}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
            onClick={(e) => onClick(element.id, e)}
          >
            {/* Expand/Collapse for groups */}
            {(isGroup || hasChildren) ? (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-5 w-5 p-0 -ml-1",
                  isGroup && "text-violet-400 hover:text-violet-300"
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
              </span>
            )}
            
            {/* Children count for groups */}
            {isGroup && hasChildren && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded">
                {children.length}
              </span>
            )}

            {/* Action buttons */}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(element.id, !element.visible);
              }}
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
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock(element.id, !element.locked);
              }}
            >
              {element.locked ? (
                <Lock className="w-3 h-3 text-amber-400" />
              ) : (
                <Unlock className="w-3 h-3" />
              )}
            </Button>
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
          {templates.filter(t => t.id !== currentTemplateId).length > 0 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Move to Template
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {templates
                  .filter(t => t.id !== currentTemplateId)
                  .map(template => (
                    <ContextMenuItem
                      key={template.id}
                      onClick={() => onMoveToTemplate([element.id], template.id)}
                    >
                      {template.name}
                    </ContextMenuItem>
                  ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem>
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
          {children.map((child) => (
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
              onDelete={onDelete}
              onUngroup={onUngroup}
              onMoveToTemplate={onMoveToTemplate}
              templates={templates}
              currentTemplateId={currentTemplateId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
