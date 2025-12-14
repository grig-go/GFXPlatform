// Content Library Page - manages saved configurations
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Search,
  Play,
  Eye,
  Trash2,
  Loader2,
  RefreshCw,
  X,
  Folder,
  FolderPlus,
  MoreVertical,
  Edit,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Import,
  Check,
  Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { sendCommandToUnreal } from '../services/unreal/commandService';
import { useProject } from './ProjectContext';
import type { Project } from '../types/project';

interface ContentItem {
  id: string;
  name: string;
  description: string;
  created_at: string;
  scene_config: any;
  backdrop_url: string | null;
  tags: string[];
  is_public: boolean;
  created_by: string;
  folder_id: string | null;
  project_type?: string;
}

interface FolderItem {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

interface ContentPageProps {
  onPlayContent?: (scene: any, backdrop: string | null) => void;
  selectedChannel?: string; // Channel name from VirtualSetPage
  refreshTrigger?: number; // Increment to trigger refresh
}

function ContentPage({ onPlayContent, selectedChannel, refreshTrigger }: ContentPageProps = {}) {
  const { t, i18n } = useTranslation('content');
  // Project context
  const { activeProject, projects, loadProjects } = useProject();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isFoldersLoading, setIsFoldersLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<ContentItem | null>(null);
  const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Folder management state
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogMode, setFolderDialogMode] = useState<'create' | 'rename'>('create');
  const [folderName, setFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [isSavingFolder, setIsSavingFolder] = useState(false);

  // Move to folder state
  const [moveToFolderDialogOpen, setMoveToFolderDialogOpen] = useState(false);
  const [movingItem, setMovingItem] = useState<ContentItem | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Import content state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSourceProject, setImportSourceProject] = useState<string | null>(null);
  const [importContent, setImportContent] = useState<ContentItem[]>([]);
  const [importSelectedIds, setImportSelectedIds] = useState<Set<string>>(new Set());
  const [isLoadingImportContent, setIsLoadingImportContent] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Multi-select state for batch operations
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Edit mode state for view dialog
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedSceneConfig, setEditedSceneConfig] = useState<Record<string, any>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [availableOptions, setAvailableOptions] = useState<Record<string, Array<string | {id: string, name: string}>>>({});
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [currentProjectType, setCurrentProjectType] = useState<string>('VirtualSet');

  // Fallback options for Airport when instance data is not available
  const getAirportFallbackOptions = (): Record<string, Array<{id: string, name: string}>> => {
    return {
      timeOfDay: Array.from({ length: 24 }, (_, i) => ({ id: String(i + 1), name: `${i + 1}:00` })),
      environment_background: [{ id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
      BaseDown: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
      BaseTop: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
      DecoDown: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
      DecoTop: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
      ElementDown: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
      ElementMiddle: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
      ElementTop: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
    };
  };

  // Fallback options for VirtualSet when instance data is not available
  const getVirtualSetFallbackOptions = (): Record<string, string[]> => {
    return {
      Floor: ["BP_Floor:Wood2", "BP_Floor:Stone1", "BP_Floor:Marble"],
      WallLeft: ["BP_WallLeft_Wood:Wood1", "BP_WallLeft_Wood:Wood0", "BP_WallLeft_Wood:Brick1"],
      WallBack: ["BP_Back_Glass:Glass1", "BP_Back_Glass:Glass2"],
      WallRight: ["BP_WallRight_Wood:Wood1", "BP_WallRight_Wood:Wood0", "BP_WallRight_Wood:Brick1"],
      Platform: ["BP_Platform2"],
      Columns: ["Columns:Blue", "Columns:Yellow0", "Columns:White0"],
      Roof: ["BP_Roof_Glass:Glass1", "BP_Roof_Glass:Glass2"],
      Back: ["BP_Back2"],
      Screen: [],
    };
  };

  // Detect project type from scene config keys
  const detectProjectType = (sceneConfig: any): string => {
    if (!sceneConfig) return 'VirtualSet';
    const keys = Object.keys(sceneConfig);
    // Airport keys include timeOfDay, BaseDown, BaseTop, etc.
    const airportKeys = ['timeOfDay', 'BaseDown', 'BaseTop', 'DecoDown', 'DecoTop', 'ElementDown', 'ElementMiddle', 'ElementTop', 'environment_background'];
    // VirtualSet keys include Floor, WallLeft, WallBack, etc.
    const virtualSetKeys = ['Floor', 'WallLeft', 'WallBack', 'WallRight', 'Platform', 'Columns', 'Roof', 'Back', 'Screen'];

    const hasAirportKeys = airportKeys.some(k => keys.includes(k));
    const hasVirtualSetKeys = virtualSetKeys.some(k => keys.includes(k));

    if (hasAirportKeys) return 'Airport';
    if (hasVirtualSetKeys) return 'VirtualSet';
    return activeProject?.settings?.project_type || 'VirtualSet';
  };

  // Fetch options from the active project's instance
  const fetchInstanceOptions = async (itemProjectType?: string): Promise<Record<string, Array<string | {id: string, name: string}>> | null> => {
    // Use provided project type, or fall back to active project type
    const projectType = itemProjectType || activeProject?.settings?.project_type || 'VirtualSet';
    setCurrentProjectType(projectType);
    console.log('fetchInstanceOptions for projectType:', projectType);

    if (!activeProject?.default_channel_id) {
      console.log('No active project channel to fetch options from, using fallback');
      // Return fallback options based on project type
      if (projectType === 'Airport') {
        return getAirportFallbackOptions();
      } else {
        return getVirtualSetFallbackOptions();
      }
    }

    setIsLoadingOptions(true);
    try {
      // Get channel name from channel ID
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .select('name')
        .eq('id', activeProject.default_channel_id)
        .single();

      if (channelError || !channelData?.name) {
        console.error('Error fetching channel:', channelError);
        // Return fallback options
        if (projectType === 'Airport') {
          return getAirportFallbackOptions();
        } else {
          return getVirtualSetFallbackOptions();
        }
      }

      // Get instance by channel name
      const { data, error } = await supabase.rpc('get_instance_by_channel', {
        p_channel_name: channelData.name,
      });

      if (error || !data?.success) {
        console.error('Error fetching instance:', error, data);
        // Return fallback options
        if (projectType === 'Airport') {
          return getAirportFallbackOptions();
        } else {
          return getVirtualSetFallbackOptions();
        }
      }

      const instance = data.data;
      if (!instance?.set_manager_json) {
        console.log('No set_manager_json found in instance, using fallback');
        // Return fallback options
        if (projectType === 'Airport') {
          return getAirportFallbackOptions();
        } else {
          return getVirtualSetFallbackOptions();
        }
      }

      // Parse and extract options based on project type
      const parsed = typeof instance.set_manager_json === 'string'
        ? JSON.parse(instance.set_manager_json)
        : instance.set_manager_json;

      console.log('Parsed set_manager_json keys:', Object.keys(parsed));

      // Helper function to extract VirtualSet options from scene data
      const extractVirtualSetOptions = (sceneData: any): Record<string, string[]> => {
        const options: Record<string, string[]> = {
          Floor: [],
          WallLeft: [],
          WallBack: [],
          WallRight: [],
          Platform: [],
          Columns: [],
          Roof: [],
          Back: [],
          Screen: [],
        };

        const sectionToActors: Record<string, any[]> = {};

        Object.entries(sceneData.ActorTags).forEach(([, jsonString]) => {
          try {
            const actorInfo = JSON.parse(jsonString as string);
            const sectionMatch = actorInfo.tags?.match(/CFG_S_\w+/);
            if (sectionMatch) {
              const section = sectionMatch[0];
              if (!sectionToActors[section]) sectionToActors[section] = [];
              sectionToActors[section].push(actorInfo);
            }
          } catch (e) {
            // Skip invalid actor info
          }
        });

        const buildOptionsForSection = (sectionKey: string): string[] => {
          const actors = sectionToActors[sectionKey];
          if (!actors) return [];

          const combinations: string[] = [];
          actors.forEach((actor) => {
            const actorName = actor.actorName;
            const parts = actorName.split('_');
            const lastPart = parts[parts.length - 1];
            const knownMaterials = ['Glass', 'Brick', 'Wood'];
            const actorTheme = knownMaterials.includes(lastPart) ? lastPart : null;
            const actorSectionType = actor.section;

            const compatibleStyles = sceneData.Styles.filter((style: any) => {
              if (actorSectionType && style.Type && style.Type !== actorSectionType) {
                return false;
              }
              if (actorTheme) {
                return style.Theme?.includes(actorTheme);
              }
              return true;
            });

            compatibleStyles.forEach((style: any) => {
              combinations.push(`${actorName}:${style.Name}`);
            });
          });

          return combinations;
        };

        options.Floor = buildOptionsForSection('CFG_S_Floor');
        options.WallLeft = buildOptionsForSection('CFG_S_WallLeft');
        options.WallBack = buildOptionsForSection('CFG_S_WallBack');
        options.WallRight = buildOptionsForSection('CFG_S_WallRight');
        options.Platform = buildOptionsForSection('CFG_S_Platform');
        options.Columns = buildOptionsForSection('CFG_S_Columns');
        options.Roof = buildOptionsForSection('CFG_S_Roof');
        options.Back = buildOptionsForSection('CFG_S_Back');
        options.Screen = buildOptionsForSection('CFG_S_Screen');

        return options;
      };

      if (projectType === 'Airport' && parsed.sections && Array.isArray(parsed.sections)) {
        // Extract Airport options - these are {id, name} objects
        const options: Record<string, Array<{id: string, name: string}>> = {
          timeOfDay: Array.from({ length: 24 }, (_, i) => ({ id: String(i + 1), name: `${i + 1}:00` })),
          environment_background: [],
          BaseDown: [],
          BaseTop: [],
          DecoDown: [],
          DecoTop: [],
          ElementDown: [],
          ElementMiddle: [],
          ElementTop: [],
        };

        parsed.sections.forEach((section: any) => {
          const sectionId = section.id;
          if (sectionId in options && sectionId !== 'timeOfDay') {
            options[sectionId] = section.options.map((opt: any) => ({ id: opt.id, name: opt.name || opt.id }));
          }
        });

        if (parsed.environment_background && Array.isArray(parsed.environment_background)) {
          parsed.environment_background.forEach((bg: any) => {
            if (bg.options && Array.isArray(bg.options)) {
              const bgOptions = bg.options
                .filter((opt: any) => opt.id)
                .map((opt: any) => ({ id: opt.id, name: opt.name || opt.id }));
              options.environment_background.push(...bgOptions);
            }
          });
        }

        console.log('Extracted Airport options:', options);
        return options;
      } else if (parsed.Sections && parsed.Styles && parsed.ActorTags) {
        // Direct VirtualSet format
        const options = extractVirtualSetOptions(parsed);
        console.log('Extracted VirtualSet options (direct format):', options);
        return options;
      } else if (parsed.ExposedPropertyDescription || parsed.PropertyValues) {
        // RCP format - scene data is nested in PropertyValues
        const propertyValue = parsed.PropertyValues?.[0]?.PropertyValue;
        if (propertyValue && typeof propertyValue === 'string' && propertyValue.trim()) {
          try {
            const sceneData = JSON.parse(propertyValue);
            if (sceneData.Sections && sceneData.Styles && sceneData.ActorTags) {
              const options = extractVirtualSetOptions(sceneData);
              console.log('Extracted VirtualSet options (RCP format):', options);
              return options;
            }
          } catch (e) {
            console.warn('Could not parse PropertyValue as scene descriptor:', e);
          }
        }
        console.log('RCP format detected but no valid scene data, using fallback');
        return getVirtualSetFallbackOptions();
      }

      // If we can't parse, use fallback
      console.log('Unknown set_manager_json format, using fallback. Keys:', Object.keys(parsed));
      if (projectType === 'Airport') {
        return getAirportFallbackOptions();
      } else {
        return getVirtualSetFallbackOptions();
      }
    } catch (error) {
      console.error('Error fetching instance options:', error);
      // Return fallback options on error
      if (projectType === 'Airport') {
        return getAirportFallbackOptions();
      } else {
        return getVirtualSetFallbackOptions();
      }
    } finally {
      setIsLoadingOptions(false);
    }
  };

  // Load folders from database
  const loadFolders = async () => {
    setIsFoldersLoading(true);
    try {
      const { data, error } = await supabase.rpc('vs_content_folder_list');

      if (error) throw error;

      if (data && data.success && data.data) {
        setFolders(data.data);
        console.log(`Loaded ${data.data.length} folders`);
      } else {
        throw new Error(data?.error || 'Failed to load folders');
      }
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error(t('toast.failedLoadFolders', { error: error instanceof Error ? error.message : String(error) }));
      setFolders([]);
    } finally {
      setIsFoldersLoading(false);
    }
  };

  // Load content from database
  const loadContent = async () => {
    // If no active project, show empty content
    if (!activeProject) {
      setContent([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('vs_content_list', {
        p_limit: 1000,
        p_offset: 0,
        p_tags: null,
        p_search: searchQuery || null,
        p_my_content_only: false,
        p_public_only: false,
        p_folder_id: selectedFolderId, // Filter by folder
        p_project_id: activeProject.id // Filter by project
      });

      if (error) throw error;

      if (data && data.success && data.data) {
        setContent(data.data);
        console.log(`Loaded ${data.data.length} content items for project:`, activeProject.name);
      } else {
        throw new Error(data?.error || 'Failed to load content');
      }
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error(t('toast.failedLoadContent', { error: error instanceof Error ? error.message : String(error) }));
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load folders and content on mount
  useEffect(() => {
    loadFolders();
    loadProjects(); // Load projects for import feature
  }, []);

  // Load content when search, folder, project changes, or refresh is triggered
  useEffect(() => {
    loadContent();
  }, [searchQuery, selectedFolderId, activeProject?.id, refreshTrigger]);


  // Load content from source project for import
  const loadImportContent = async (projectId: string) => {
    setIsLoadingImportContent(true);
    setImportContent([]);
    setImportSelectedIds(new Set());

    try {
      const { data, error } = await supabase.rpc('vs_content_list', {
        p_limit: 1000,
        p_offset: 0,
        p_tags: null,
        p_search: null,
        p_my_content_only: false,
        p_public_only: false,
        p_folder_id: null,
        p_project_id: projectId
      });

      if (error) throw error;

      if (data && data.success && data.data) {
        setImportContent(data.data);
        console.log(`Loaded ${data.data.length} content items from source project`);
      } else {
        throw new Error(data?.error || 'Failed to load content');
      }
    } catch (error) {
      console.error('Error loading import content:', error);
      toast.error(t('toast.failedLoadFromProject'));
      setImportContent([]);
    } finally {
      setIsLoadingImportContent(false);
    }
  };

  // Handle source project change
  const handleImportSourceChange = (projectId: string) => {
    setImportSourceProject(projectId);
    loadImportContent(projectId);
  };

  // Toggle selection of import item
  const toggleImportSelection = (itemId: string) => {
    const newSet = new Set(importSelectedIds);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setImportSelectedIds(newSet);
  };

  // Select/deselect all import items
  const toggleSelectAllImport = () => {
    if (importSelectedIds.size === importContent.length) {
      setImportSelectedIds(new Set());
    } else {
      setImportSelectedIds(new Set(importContent.map(item => item.id)));
    }
  };

  // Import selected content to current project
  const handleImportContent = async () => {
    if (!activeProject || importSelectedIds.size === 0) return;

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const itemsToImport = importContent.filter(item => importSelectedIds.has(item.id));

      for (const item of itemsToImport) {
        try {
          const { data, error } = await supabase.rpc('vs_content_save', {
            p_id: null, // Create new
            p_name: item.name,
            p_scene_config: item.scene_config || {},
            p_backdrop_url: item.backdrop_url,
            p_description: item.description || '',
            p_tags: item.tags || [],
            p_is_public: false,
            p_folder_id: null,
            p_project_id: activeProject.id
          });

          if (error) throw error;
          if (data?.success) {
            successCount++;
          } else {
            throw new Error(data?.error || 'Failed to import');
          }
        } catch (err) {
          console.error(`Error importing "${item.name}":`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(t('import.importedCount', { count: successCount }));
        loadContent(); // Refresh content list
      }
      if (errorCount > 0) {
        toast.error(t('import.failedCount', { count: errorCount }));
      }

      // Close dialog if all succeeded
      if (errorCount === 0) {
        setImportDialogOpen(false);
        setImportSourceProject(null);
        setImportContent([]);
        setImportSelectedIds(new Set());
      }
    } catch (error) {
      console.error('Error importing content:', error);
      toast.error(t('import.failed'));
    } finally {
      setIsImporting(false);
    }
  };

  // Open import dialog
  const openImportDialog = () => {
    setImportDialogOpen(true);
    setImportSourceProject(null);
    setImportContent([]);
    setImportSelectedIds(new Set());
  };

  // Determine content type based on what's present (returns key for filtering)
  const getContentTypeKey = (item: ContentItem): string => {
    const hasScene = item.scene_config && Object.keys(item.scene_config).length > 0;
    const hasBackdrop = !!item.backdrop_url;

    if (hasScene && hasBackdrop) return 'both';
    if (hasScene) return 'environment';
    if (hasBackdrop) return 'background';
    return 'unknown';
  };

  // Get translated content type label for display
  const getContentTypeLabel = (item: ContentItem): string => {
    const key = getContentTypeKey(item);
    return t(`filter.${key}`);
  };

  const filteredContent = content.filter((item) => {
    const contentType = getContentTypeKey(item);
    const matchesFilter = 
      filterType === 'all' || 
      contentType === filterType.toLowerCase() ||
      (filterType === 'both' && contentType === 'both');
    return matchesFilter;
  });

  // Build folder tree structure
  const buildFolderTree = (parentId: string | null = null): FolderItem[] => {
    return folders
      .filter(f => f.parent_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Toggle folder expand/collapse
  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Render folder tree recursively
  const renderFolderTree = (parentId: string | null = null, depth: number = 0) => {
    const childFolders = buildFolderTree(parentId);
    
    return childFolders.map(folder => {
      const hasChildren = folders.some(f => f.parent_id === folder.id);
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolderId === folder.id;
      const itemCount = content.filter(c => c.folder_id === folder.id).length;

      return (
        <div key={folder.id}>
          <div
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all group hover:bg-muted ${
              isSelected ? 'bg-primary/10 hover:bg-primary/20' : ''
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {/* Expand/Collapse chevron */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}

            {/* Folder icon and name */}
            <div
              className="flex items-center gap-2 flex-1 min-w-0"
              onClick={() => setSelectedFolderId(folder.id)}
            >
              {isExpanded || !hasChildren ? (
                <FolderOpen className="h-4 w-4 text-blue-500 shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-blue-500 shrink-0" />
              )}
              <span className="text-sm truncate flex-1">{folder.name}</span>
              {itemCount > 0 && (
                <span className="text-xs text-muted-foreground shrink-0">({itemCount})</span>
              )}
            </div>

            {/* Folder menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openRenameFolderDialog(folder)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('actions.rename')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateFolderDialog(folder.id)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  {t('folder.newSubfolder')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('actions.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Render children if expanded */}
          {isExpanded && hasChildren && renderFolderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  // Open create folder dialog
  const openCreateFolderDialog = (parentId: string | null = null) => {
    setFolderDialogMode('create');
    setFolderName('');
    setParentFolderId(parentId);
    setEditingFolderId(null);
    setFolderDialogOpen(true);
  };

  // Open rename folder dialog
  const openRenameFolderDialog = (folder: FolderItem) => {
    setFolderDialogMode('rename');
    setFolderName(folder.name);
    setEditingFolderId(folder.id);
    setFolderDialogOpen(true);
  };

  // Save folder (create or rename)
  const handleSaveFolder = async () => {
    if (!folderName.trim()) {
      toast.error(t('toast.folderNameRequired'));
      return;
    }

    setIsSavingFolder(true);
    try {
      if (folderDialogMode === 'create') {
        const { data, error } = await supabase.rpc('vs_content_folder_create', {
          p_name: folderName,
          p_parent_id: parentFolderId
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);

        toast.success(t('toast.folderCreated'));
      } else {
        const { data, error } = await supabase.rpc('vs_content_folder_rename', {
          p_id: editingFolderId,
          p_name: folderName
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);

        toast.success(t('toast.folderRenamed'));
      }

      await loadFolders();
      setFolderDialogOpen(false);
    } catch (error) {
      console.error('Error saving folder:', error);
      toast.error(t('toast.failedSaveFolder', { error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setIsSavingFolder(false);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm(t('folder.deleteConfirm'))) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('vs_content_folder_delete', {
        p_id: folderId
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      toast.success(t('toast.folderDeleted'));

      // If deleted folder was selected, clear selection
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }

      await loadFolders();
      await loadContent();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error(t('toast.failedDeleteFolder', { error: error instanceof Error ? error.message : String(error) }));
    }
  };

  // Open move to folder dialog
  const openMoveToFolderDialog = (item: ContentItem) => {
    setMovingItem(item);
    setTargetFolderId(item.folder_id);
    setMoveToFolderDialogOpen(true);
  };

  // Move content to folder
  const handleMoveToFolder = async () => {
    if (!movingItem) return;

    try {
      const { data, error } = await supabase.rpc('vs_content_move_to_folder', {
        p_content_id: movingItem.id,
        p_folder_id: targetFolderId
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      toast.success(t('toast.movedTo', { name: movingItem.name, location: targetFolderId ? 'folder' : 'root' }));
      setMoveToFolderDialogOpen(false);
      await loadContent();
    } catch (error) {
      console.error('Error moving content:', error);
      toast.error(t('toast.failedMove', { error: error instanceof Error ? error.message : String(error) }));
    }
  };

  const handlePlay = async (item: ContentItem) => {
    console.log('🎬 Playing configuration:', item.name);

    try {
      // Use selectedChannel prop if provided, otherwise fall back to database query
      let channelName = selectedChannel;

      if (!channelName) {
        const { data: channelsData, error: channelsError } = await supabase
          .from('channels')
          .select('*')
          .eq('type', 'Unreal')
          .eq('active', true)
          .limit(1)
          .single();

        if (channelsError || !channelsData) {
          toast.error(t('toast.noActiveChannel'));
          console.error('Channel error:', channelsError);
          return;
        }
        channelName = channelsData.name;
      }

      console.log('📡 Using channel:', channelName);

      // Detect project type from tags, project_type field, or scene_config fields
      const isAirport = item.project_type === 'Airport' ||
        item.tags?.includes('airport') ||
        (item.scene_config && ('timeOfDay' in item.scene_config || 'BaseDown' in item.scene_config));

      console.log('📋 Project type:', isAirport ? 'Airport' : 'VirtualSet');

      if (isAirport) {
        // Airport: send scene parameters only
        const airportParams = item.scene_config || {};
        const messageObject = {
          objectPath: "/Game/UEDPIE_0_RigLevel01.RigLevel01:PersistentLevel.SceneController_C_1",
          functionName: "ChangeScene",
          parameters: {
            timeOfDay: airportParams.timeOfDay || "",
            environment_background: airportParams.environment_background || "",
            BaseDown: airportParams.BaseDown || "",
            BaseTop: airportParams.BaseTop || "",
            DecoDown: airportParams.DecoDown || "",
            DecoTop: airportParams.DecoTop || "",
            ElementDown: airportParams.ElementDown || "",
            ElementMiddle: airportParams.ElementMiddle || "",
            ElementTop: airportParams.ElementTop || "",
          },
        };
        console.log('✈️ Airport command:', messageObject);

        const result = await sendCommandToUnreal(channelName, messageObject);
        if (result.success) {
          toast.success(t('toast.appliedToUnreal', { name: item.name }), {
            description: t('toast.airportConfigSent')
          });
          setLastPlayedId(item.id);
          console.log('✅ Airport command sent successfully');
        } else {
          toast.error(t('toast.failedSendConfig'));
          console.error('❌ Command failed:', result.error);
        }
      } else {
        // VirtualSet: send scene parameters and backdrop as SEPARATE messages
        const vsParams = item.scene_config || {};

        // Message 1: Scene configuration (matches VirtualSetPage exactly)
        const sceneMessage = {
          objectPath: "/Game/-Levels/UEDPIE_0_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1",
          functionName: "ChangeScene",
          parameters: {
            WallLeft: vsParams.WallLeft || "",
            WallRight: vsParams.WallRight || "",
            WallBack: vsParams.WallBack || "",
            Back: vsParams.Back || "",
            Platform: vsParams.Platform || "",
            Roof: vsParams.Roof || "",
            Screen: vsParams.Screen || "",
            Columns: vsParams.Columns || "",
            Floor: vsParams.Floor || "",
          },
        };
        console.log('🏠 VirtualSet scene command:', sceneMessage);

        // Send scene config
        const sceneResult = await sendCommandToUnreal(channelName, sceneMessage);

        // Message 2: Backdrop image (separate command, matches VirtualSetPage exactly)
        let backdropResult = { success: true };
        if (item.backdrop_url) {
          // Wait 1 second before sending backdrop
          await new Promise(resolve => setTimeout(resolve, 1000));

          const backdropMessage = {
            objectPath: "/Game/-Levels/UEDPIE_0_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1",
            functionName: "SetBackdropImage",
            parameters: { URL: item.backdrop_url }
          };
          console.log('🖼️ VirtualSet backdrop command:', backdropMessage);
          backdropResult = await sendCommandToUnreal(channelName, backdropMessage);
        }

        if (sceneResult.success && backdropResult.success) {
          toast.success(t('toast.appliedToUnreal', { name: item.name }), {
            description: t('toast.sceneBackdropSent')
          });
          setLastPlayedId(item.id);
          console.log('✅ VirtualSet commands sent successfully');
        } else if (sceneResult.success) {
          toast.warning(t('toast.partialSuccess'), {
            description: t('toast.sceneBackdropFailed')
          });
          setLastPlayedId(item.id);
        } else {
          toast.error(t('toast.failedSendConfig'));
          console.error('❌ Command failed');
        }
      }

      // Call onPlayContent if provided
      if (onPlayContent) {
        onPlayContent(item.scene_config, item.backdrop_url);
      }

    } catch (error) {
      console.error('❌ Error in handlePlay:', error);
      toast.error(t('toast.failedApply', { error: error instanceof Error ? error.message : String(error) }));
    }
  };

  const handleView = async (item: ContentItem) => {
    console.log('👁️ View:', item.name);
    setViewingItem(item);

    // Set up edit mode by default
    setEditedName(item.name);
    setEditedDescription(item.description || '');
    setEditedSceneConfig({ ...item.scene_config } || {});

    // Determine project type from item or detect from scene config
    const itemProjectType = item.project_type || detectProjectType(item.scene_config);
    console.log('Detected project type for item:', itemProjectType, 'scene_config keys:', Object.keys(item.scene_config || {}));

    // Open dialog first, then load options
    setViewDialogOpen(true);

    // Fetch real options from the instance with the item's project type
    const instanceOptions = await fetchInstanceOptions(itemProjectType);
    if (instanceOptions) {
      setAvailableOptions(instanceOptions);
    } else {
      setAvailableOptions({});
    }
  };

  const handleDelete = async (item: ContentItem) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    console.log('🗑️ Deleting:', deletingItem.name);

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('vs_content')
        .delete()
        .eq('id', deletingItem.id);

      if (error) throw error;

      toast.success(t('toast.deletedSuccess', { name: deletingItem.name }));
      await loadContent();
    } catch (error) {
      console.error('❌ Delete failed:', error);
      toast.error(t('toast.failedDelete', { error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  // Batch delete selected items
  const confirmBatchDelete = async () => {
    if (selectedItems.size === 0) return;

    setIsBatchDeleting(true);
    try {
      const itemIds = Array.from(selectedItems);
      let successCount = 0;

      for (const id of itemIds) {
        const { error } = await supabase
          .from('vs_content')
          .delete()
          .eq('id', id);

        if (error) {
          console.error(`Failed to delete item ${id}:`, error);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(t('toast.deletedBatch', { count: successCount }));
        setSelectedItems(new Set());
        await loadContent();
      } else {
        toast.error(t('toast.failedBatchDelete'));
      }
    } catch (error) {
      console.error('Batch delete failed:', error);
      toast.error(t('toast.failedBatchDelete'));
    } finally {
      setIsBatchDeleting(false);
      setBatchDeleteDialogOpen(false);
    }
  };

  // Toggle select all items
  const toggleSelectAll = () => {
    if (selectedItems.size === filteredContent.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredContent.map(item => item.id)));
    }
  };

  // Toggle single item selection
  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Save edited content
  const saveEditedContent = async () => {
    if (!viewingItem || !editedName.trim()) {
      toast.error(t('toast.nameRequired'));
      return;
    }

    setIsSavingEdit(true);
    try {
      const { data, error } = await supabase.rpc('vs_content_save', {
        p_id: viewingItem.id, // Update existing
        p_name: editedName,
        p_scene_config: editedSceneConfig,
        p_backdrop_url: viewingItem.backdrop_url,
        p_description: editedDescription,
        p_tags: viewingItem.tags || [],
        p_is_public: viewingItem.is_public,
        p_folder_id: viewingItem.folder_id,
        p_project_id: activeProject?.id || null
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(t('toast.contentUpdated'));
        // Update the viewing item with new values
        setViewingItem({
          ...viewingItem,
          name: editedName,
          description: editedDescription,
          scene_config: editedSceneConfig
        });
        // Refresh content list
        await loadContent();
        // Close the modal
        setViewDialogOpen(false);
      } else {
        throw new Error(data?.error || 'Failed to update');
      }
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error(t('toast.failedUpdate', { error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Update a single scene config value
  const updateSceneConfigValue = (key: string, value: string) => {
    setEditedSceneConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const locale = i18n.language || 'en';

    // If today, show time only
    if (diffDays === 0) {
      return date.toLocaleString(locale, {
        hour: 'numeric',
        minute: '2-digit'
      });
    }

    // If within last 7 days, show day and time
    if (diffDays < 7) {
      return date.toLocaleString(locale, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
      });
    }

    // Otherwise show compact date
    return date.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="h-full flex bg-background">
      {/* Folder Sidebar */}
      <div className={`w-64 border-r bg-card flex flex-col ${isSidebarCollapsed ? 'hidden' : ''}`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm">{t('folder.title')}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => openCreateFolderDialog()}
              title={t('folder.new')}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Folder Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* All Items (Root) */}
          <div
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all hover:bg-muted mb-1 ${
              selectedFolderId === null ? 'bg-primary/10 hover:bg-primary/20' : ''
            }`}
            onClick={() => setSelectedFolderId(null)}
          >
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1">{t('folder.allItems')}</span>
            <span className="text-xs text-muted-foreground">
              ({content.filter(c => !c.folder_id).length})
            </span>
          </div>

          {/* Folder Tree */}
          {isFoldersLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderFolderTree()
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Toggle Sidebar Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                title={isSidebarCollapsed ? "Show Folders" : "Hide Folders"}
                className="h-8 w-8"
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
              
              <div>
                <h1 className="text-xl font-semibold">
                  {selectedFolderId
                    ? folders.find(f => f.id === selectedFolderId)?.name || t('title')
                    : t('title')
                  }
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openImportDialog}
                disabled={!activeProject}
                title={!activeProject ? "Select a project first" : "Import content from another project"}
              >
                <Import className="h-4 w-4 mr-2" />
                {t('actions.import')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadFolders();
                  loadContent();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {t('actions.refresh')}
              </Button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('filter.byType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTypes')}</SelectItem>
                <SelectItem value="environment">{t('filter.environment')}</SelectItem>
                <SelectItem value="background">{t('filter.background')}</SelectItem>
                <SelectItem value="both">{t('filter.both')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Batch Actions Bar */}
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-3 mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium">
                {t('batch.selected', { count: selectedItems.size })}
              </span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedItems(new Set())}
              >
                <X className="h-4 w-4 mr-1" />
                {t('batch.clearSelection')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBatchDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('batch.deleteSelected')}
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="rounded-lg border bg-card">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedItems.size === filteredContent.length && filteredContent.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>{t('table.name')}</TableHead>
                    <TableHead className="w-[120px]">{t('table.type')}</TableHead>
                    <TableHead className="w-[180px]">{t('table.timeCreated')}</TableHead>
                    <TableHead className="w-[150px] text-right">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContent.map((item) => (
                    <TableRow
                      key={item.id}
                      className={`hover:bg-muted/50 ${selectedItems.has(item.id) ? 'bg-primary/5' : ''}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                          {getContentTypeLabel(item)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 transition-all duration-300 active:scale-90 group relative overflow-hidden ${
                              lastPlayedId === item.id
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 hover:scale-125 shadow-lg shadow-green-200/50'
                                : 'hover:scale-125 hover:bg-blue-50 hover:text-blue-600 hover:shadow-lg hover:shadow-blue-200/50'
                            }`}
                            onClick={() => handlePlay(item)}
                            title="Apply to Virtual Set"
                          >
                            <Play className={`h-4 w-4 transition-all duration-300 ${
                              lastPlayedId === item.id
                                ? 'fill-green-600'
                                : 'group-hover:translate-x-1 group-hover:scale-110'
                            }`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleView(item)}
                            title={t('dialog.viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {/* More Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openMoveToFolderDialog(item)}>
                                <Folder className="h-4 w-4 mr-2" />
                                {t('dialog.moveToFolder')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(item)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('actions.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isLoading && filteredContent.length === 0 && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">{t('empty.noContent')}</p>
                  <p className="text-xs mt-1">
                    {content.length === 0
                      ? t('empty.createFirst')
                      : t('empty.adjustFilters')
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-card px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('table.showing', { filtered: filteredContent.length, total: content.length })}
          </p>
        </div>
      </div>

      {/* Folder Dialog (Create/Rename) */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {folderDialogMode === 'create' ? t('folder.createNew') : t('folder.rename')}
            </DialogTitle>
            <DialogDescription>
              {folderDialogMode === 'create'
                ? t('folder.enterName')
                : t('folder.enterNewName')
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Input
                placeholder={t('folder.namePlaceholder')}
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveFolder();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setFolderDialogOpen(false)}
                disabled={isSavingFolder}
              >
                {t('actions.cancel')}
              </Button>
              <Button
                onClick={handleSaveFolder}
                disabled={isSavingFolder || !folderName.trim()}
              >
                {isSavingFolder ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {folderDialogMode === 'create' ? t('actions.create') : t('actions.rename')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move to Folder Dialog */}
      <Dialog open={moveToFolderDialogOpen} onOpenChange={setMoveToFolderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialog.moveToFolder')}</DialogTitle>
            <DialogDescription>
              {t('dialog.moveDestination', { name: movingItem?.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Select value={targetFolderId || 'root'} onValueChange={(val) => setTargetFolderId(val === 'root' ? null : val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('folder.selectFolder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">📁 {t('folder.rootNoFolder')}</SelectItem>
                {folders.map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.icon} {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setMoveToFolderDialogOpen(false)}
              >
                {t('actions.cancel')}
              </Button>
              <Button onClick={handleMoveToFolder}>
                {t('actions.move')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Edit Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => {
        setViewDialogOpen(open);
        if (!open) {
          setEditedName('');
          setEditedDescription('');
          setEditedSceneConfig({});
          setAvailableOptions({});
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-b from-gray-50 to-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-xl font-semibold h-auto py-1"
                  placeholder={t('dialog.namePlaceholder')}
                />
                <Input
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="text-sm h-auto py-1"
                  placeholder={t('dialog.descriptionPlaceholder')}
                />
                <DialogDescription className="sr-only">
                  Edit details of saved configuration
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(85vh-180px)]">
            {viewingItem && (
              <div className="px-6 py-5 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium mb-1">{t('details.type')}</p>
                    <p className="text-sm font-semibold text-blue-900">{getContentTypeLabel(viewingItem)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <p className="text-xs text-purple-600 font-medium mb-1">{t('details.visibility')}</p>
                    <p className="text-sm font-semibold text-purple-900">
                      {viewingItem.is_public ? t('details.public') : t('details.private')}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-xs text-green-600 font-medium mb-1">{t('details.created')}</p>
                    <p className="text-sm font-semibold text-green-900">
                      {new Date(viewingItem.created_at).toLocaleDateString(i18n.language)}
                    </p>
                  </div>
                </div>

                {viewingItem.tags && viewingItem.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full"></span>
                      {t('details.tags')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {viewingItem.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(editedSceneConfig).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                      {t('details.sceneConfig')}
                    </h3>
                    <div className="rounded-xl border bg-muted/50 p-5 shadow-sm">
                      {isLoadingOptions && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                          <span className="text-sm text-muted-foreground">{t('details.loadingOptions')}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(editedSceneConfig)
                          .filter(([key]) => key !== 'summary')
                          .map(([key, value]) => {
                            const options = availableOptions[key] || [];
                            return (
                              <div key={key} className="space-y-1">
                                <label className="text-xs font-semibold text-foreground">{key}</label>
                                <Select
                                  value={value as string || "__none__"}
                                  onValueChange={(val) => {
                                    const newValue = val === "__none__" ? "" : val;
                                    updateSceneConfigValue(key, newValue);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder={t('details.noneDisabled')}>
                                      {value ? (
                                        // Display name for the currently selected value
                                        options.length > 0 && typeof options[0] !== 'string'
                                          ? (options as Array<{id: string, name: string}>).find(o => o.id === value)?.name || value
                                          : value
                                      ) : (
                                        <em>{t('details.noneDisabled')}</em>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__"><em>{t('details.noneDisabled')}</em></SelectItem>
                                    {options.map((option: string | {id: string, name: string}) => {
                                      // Handle both string (VirtualSet) and object (Airport) options
                                      const optionId = typeof option === 'string' ? option : option.id;
                                      const optionName = typeof option === 'string' ? option : option.name;
                                      return (
                                        <SelectItem key={optionId} value={optionId}>{optionName}</SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                                {value && (
                                  <p className="text-xs text-muted-foreground">
                                    ID: {value as string}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                {viewingItem.backdrop_url && (
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                      {t('details.backdropImage')}
                    </h3>
                    <div className="rounded-xl border overflow-hidden shadow-sm bg-muted/50">
                      <div className="aspect-video relative">
                        <img
                          src={viewingItem.backdrop_url}
                          alt="Backdrop"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="px-4 py-3 bg-card border-t">
                        <p className="text-xs text-muted-foreground font-mono break-all">
                          {viewingItem.backdrop_url}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-muted/50 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
              disabled={isSavingEdit}
            >
              {t('actions.close')}
            </Button>
            <Button
              onClick={() => {
                handlePlay(viewingItem!);
              }}
              disabled={isSavingEdit}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm"
            >
              <Play className="h-4 w-4 mr-2" />
              {t('actions.applyToVirtualSet')}
            </Button>
            <Button
              onClick={saveEditedContent}
              disabled={isSavingEdit || !editedName.trim()}
              className="bg-black hover:bg-gray-800 text-white shadow-sm"
            >
              {isSavingEdit ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t('actions.saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialog.confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('dialog.confirmDeleteMessage', { name: deletingItem?.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('actions.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialog.confirmBatchDelete')}</DialogTitle>
            <DialogDescription>
              {t('dialog.confirmBatchDeleteMessage', { count: selectedItems.size })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setBatchDeleteDialogOpen(false)}
              disabled={isBatchDeleting}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={confirmBatchDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isBatchDeleting}
            >
              {isBatchDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('batch.deleteCount', { count: selectedItems.size })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Content Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('import.title')}</DialogTitle>
            <DialogDescription>
              {t('import.description', { projectName: activeProject?.name || 'current project' })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Project Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('import.sourceProject')}</label>
              <Select
                value={importSourceProject || ""}
                onValueChange={handleImportSourceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('import.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter(p => p.id !== activeProject?.id) // Exclude current project
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <span>{project.icon || '📁'}</span>
                          <span>{project.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content List */}
            {importSourceProject && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">
                    {t('import.contentPages')} ({importContent.length})
                  </label>
                  {importContent.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAllImport}
                      className="h-7 text-xs"
                    >
                      {importSelectedIds.size === importContent.length ? t('import.deselectAll') : t('import.selectAll')}
                    </Button>
                  )}
                </div>

                {isLoadingImportContent ? (
                  <div className="flex-1 flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : importContent.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 text-muted-foreground">
                    {t('import.noContentFound')}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={importSelectedIds.size === importContent.length && importContent.length > 0}
                              onCheckedChange={toggleSelectAllImport}
                            />
                          </TableHead>
                          <TableHead>{t('table.name')}</TableHead>
                          <TableHead className="w-24">{t('table.type')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importContent.map((item) => (
                          <TableRow
                            key={item.id}
                            className={`cursor-pointer ${importSelectedIds.has(item.id) ? 'bg-primary/10' : ''}`}
                            onClick={() => toggleImportSelection(item.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={importSelectedIds.has(item.id)}
                                onCheckedChange={() => toggleImportSelection(item.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {item.backdrop_url && (
                                  <div className="w-12 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                                    <img
                                      src={item.backdrop_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-sm">{item.name}</div>
                                  {item.description && (
                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                      {item.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs px-2 py-1 rounded bg-muted">
                                {getContentTypeLabel(item)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {importSelectedIds.size > 0 && (
                <span>{t('import.itemsSelected', { count: importSelectedIds.size })}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(false)}
                disabled={isImporting}
              >
                {t('actions.cancel')}
              </Button>
              <Button
                onClick={handleImportContent}
                disabled={isImporting || importSelectedIds.size === 0}
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {t('actions.import')} {importSelectedIds.size > 0 ? `(${importSelectedIds.size})` : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContentPage;