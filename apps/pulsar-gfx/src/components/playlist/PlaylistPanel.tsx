import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  useDroppable,
  pointerWithin,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollArea,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@emergent-platform/ui';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Settings,
  Clock,
  Hand,
  Repeat,
  StopCircle,
  PauseCircle,
  MoreVertical,
  Copy,
  Trash2,
  FileText,
  Monitor,
  Tv,
  Radio,
  Type,
  Grid3X3,
  Image,
  LogIn,
  LogOut,
  GripVertical,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Folder,
  Filter,
  X,
  Library,
} from 'lucide-react';
import { usePlaylistStore } from '@/stores/playlistStore';
import { usePageStore, type Page, type PageGroup } from '@/stores/pageStore';
import { useProjectStore, type Template } from '@/stores/projectStore';
import { usePreviewStore } from '@/stores/previewStore';
import { useChannelStore, type Channel } from '@/stores/channelStore';
import { usePageLibraryStore } from '@/stores/pageRepositoryStore';
import { PAGE_DRAG_TYPE } from '@/components/pages/PageList';
import { useConfirm } from '@/hooks/useConfirm';
import { resolvePayloadBindings, type Binding } from '@/lib/bindingResolver';
import { getDataSourceById } from '@/data/sampleDataSources';
import { supabase } from '@emergent-platform/supabase-client';
import { fetchEndpointData } from '@/services/novaEndpointService';

// Helper to generate next group name like "Group 1", "Group 2", etc.
const generateGroupName = (existingGroups: PageGroup[]): string => {
  const existingNumbers = existingGroups
    .map(g => {
      const match = g.name.match(/^Group (\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `Group ${nextNumber}`;
};

const LAYER_TYPE_ICONS: Record<string, React.ElementType> = {
  fullscreen: Monitor,
  'lower-third': Tv,
  lower_third: Tv,
  bug: Radio,
  ticker: Type,
  background: Image,
  custom: Grid3X3,
};

// Map layer types to layer indices (standard broadcast layer ordering)
const LAYER_TYPE_INDEX: Record<string, number> = {
  background: 0,
  fullscreen: 0,
  'lower-third': 1,
  lower_third: 1,
  bug: 2,
  ticker: 3,
  custom: 0,
};

const getLayerIndex = (layerType?: string): number => {
  if (!layerType) return 0;
  return LAYER_TYPE_INDEX[layerType] ?? 0;
};

export function PlaylistPanel() {
  const confirm = useConfirm();
  const {
    currentPlaylist,
    isPlaying,
    currentIndex,
    play,
    pause,
    stop,
    next,
    previous,
    setMode,
    setDefaultDuration,
    setEndBehavior,
    setChannelId,
    setCurrentIndex,
  } = usePlaylistStore();

  const {
    pages,
    pageGroups,
    selectedPage,
    selectPage,
    deletePage,
    duplicatePage,
    updatePageChannel,
    createPageGroup,
    deletePageGroup,
    toggleGroupCollapsed,
    setPageOnAir,
  } = usePageStore();
  const { templates, currentProject, loadTemplateElements } = useProjectStore();
  const { selectPage: selectPageForPreview, setMode: setPreviewMode } = usePreviewStore();
  const { channels, selectedChannel, loadChannels, playOnChannel, stopOnChannel } = useChannelStore();

  const [showSettings, setShowSettings] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Filter state
  const [filterName, setFilterName] = useState('');
  const [filterLayer, setFilterLayer] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Track last played groups that are "on air" (pages use isOnAir from store)
  const [onAirGroupIds, setOnAirGroupIds] = useState<Set<string>>(new Set());

  // Track last played page ID for quick "Play Out" action
  const [lastPlayedPageId, setLastPlayedPageId] = useState<string | null>(null);

  // Track external page drag (from PageList)
  const [isExternalDragOver, setIsExternalDragOver] = useState(false);

  // Loop mode: track the timeout for transitioning between pages
  const [loopTimeoutId, setLoopTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Loop mode: track manually queued next page index (null = auto-advance to natural next)
  const [queuedNextIndex, setQueuedNextIndex] = useState<number | null>(null);

  // Ref to track current queued index for use in setTimeout callbacks (avoids stale closure)
  const queuedNextIndexRef = useRef<number | null>(null);
  useEffect(() => {
    queuedNextIndexRef.current = queuedNextIndex;
  }, [queuedNextIndex]);

  // For loop mode: flatten all pages (including grouped) into a single ordered list
  const loopFlatPages = useMemo(() => {
    const flatPages: Page[] = [];

    // Helper to recursively get pages from groups
    const addPagesFromGroup = (groupId: string) => {
      // Add child groups first (in sort order)
      const childGroups = pageGroups
        .filter(g => g.parentGroupId === groupId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      for (const childGroup of childGroups) {
        addPagesFromGroup(childGroup.id);
      }
      // Then add direct pages in this group
      const groupPages = pages
        .filter(p => p.pageGroupId === groupId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      flatPages.push(...groupPages);
    };

    // Get top-level items (groups without parents + ungrouped pages)
    const topLevelGroups = pageGroups
      .filter(g => !g.parentGroupId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const ungroupedPages = pages
      .filter(p => !p.pageGroupId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // Build a combined list sorted by sortOrder
    const allTopLevel = [
      ...topLevelGroups.map(g => ({ type: 'group' as const, item: g, sortOrder: g.sortOrder })),
      ...ungroupedPages.map(p => ({ type: 'page' as const, item: p, sortOrder: p.sortOrder })),
    ].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const entry of allTopLevel) {
      if (entry.type === 'group') {
        addPagesFromGroup(entry.item.id);
      } else {
        flatPages.push(entry.item as Page);
      }
    }

    return flatPages;
  }, [pages, pageGroups]);

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get unique layer names for filter dropdown
  const uniqueLayerNames = useMemo(() => {
    const layerNames = new Set<string>();
    pages.forEach(page => {
      const template = templates.find(t => t.id === page.templateId);
      if (template?.layerName) {
        layerNames.add(template.layerName);
      }
    });
    return Array.from(layerNames).sort();
  }, [pages, templates]);

  // Filter pages based on current filters
  const filteredPages = useMemo(() => {
    return pages.filter(page => {
      // Name filter
      if (filterName) {
        const nameMatch = page.name.toLowerCase().includes(filterName.toLowerCase());
        const template = templates.find(t => t.id === page.templateId);
        const templateMatch = template?.name.toLowerCase().includes(filterName.toLowerCase());
        if (!nameMatch && !templateMatch) return false;
      }

      // Layer filter
      if (filterLayer !== 'all') {
        const template = templates.find(t => t.id === page.templateId);
        if (template?.layerName !== filterLayer) return false;
      }

      // Channel filter
      if (filterChannel !== 'all') {
        if (filterChannel === 'unassigned') {
          if (page.channelId) return false;
        } else {
          if (page.channelId !== filterChannel) return false;
        }
      }

      return true;
    });
  }, [pages, templates, filterName, filterLayer, filterChannel]);

  // Check if any filters are active
  const hasActiveFilters = filterName || filterLayer !== 'all' || filterChannel !== 'all';

  // Clear all filters
  const clearFilters = () => {
    setFilterName('');
    setFilterLayer('all');
    setFilterChannel('all');
  };

  // Organize pages by groups (uses filteredPages when filtering is active)
  const groupedPages = useMemo(() => {
    const grouped: Record<string, Page[]> = {};
    const pagesToUse = hasActiveFilters ? filteredPages : pages;
    pageGroups.forEach(group => {
      grouped[group.id] = pagesToUse
        .filter(p => p.pageGroupId === group.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    });
    return grouped;
  }, [pages, pageGroups, filteredPages, hasActiveFilters]);

  // Create a unified sorted list of items (groups and ungrouped pages mixed together)
  // Each item has a type and the actual data
  type PlaylistItem =
    | { type: 'group'; group: PageGroup }
    | { type: 'page'; page: Page };

  const sortedItems = useMemo(() => {
    const items: PlaylistItem[] = [];
    const pagesToUse = hasActiveFilters ? filteredPages : pages;

    // When filtering, only show groups that have matching pages (or their descendants do)
    const groupsWithMatchingPages = new Set<string>();
    if (hasActiveFilters) {
      pagesToUse.forEach(page => {
        if (page.pageGroupId) {
          // Mark this group and all ancestors as having matching pages
          let currentGroupId: string | null = page.pageGroupId;
          while (currentGroupId) {
            groupsWithMatchingPages.add(currentGroupId);
            const currentGroup = pageGroups.find(g => g.id === currentGroupId);
            currentGroupId = currentGroup?.parentGroupId || null;
          }
        }
      });
    }

    // Add only TOP-LEVEL groups (no parent) with their sortOrder
    // When filtering, only show groups that have matching pages
    pageGroups
      .filter(group => !group.parentGroupId)
      .filter(group => !hasActiveFilters || groupsWithMatchingPages.has(group.id))
      .forEach(group => {
        items.push({ type: 'group', group });
      });

    // Add ungrouped pages with their sortOrder
    pagesToUse.filter(p => !p.pageGroupId).forEach(page => {
      items.push({ type: 'page', page });
    });

    // Sort all items by their sortOrder
    items.sort((a, b) => {
      const orderA = a.type === 'group' ? a.group.sortOrder : a.page.sortOrder;
      const orderB = b.type === 'group' ? b.group.sortOrder : b.page.sortOrder;
      return orderA - orderB;
    });

    return items;
  }, [pages, pageGroups, filteredPages, hasActiveFilters]);

  // Get all sortable IDs (prefixed to distinguish groups from pages)
  // This includes ALL groups (including nested), ungrouped pages, AND grouped pages so they can all be dragged
  const sortableIds = useMemo(() => {
    const ids: string[] = [];

    // Recursively add a group and its children
    const addGroupAndChildren = (group: PageGroup) => {
      ids.push(`group:${group.id}`);
      // Add all pages within this group
      const groupPages = pages.filter(p => p.pageGroupId === group.id);
      groupPages.forEach(p => ids.push(`page:${p.id}`));
      // Add child groups recursively
      const childGroups = pageGroups.filter(g => g.parentGroupId === group.id);
      childGroups.forEach(addGroupAndChildren);
    };

    // Add top-level groups and their descendants
    sortedItems.forEach(item => {
      if (item.type === 'group') {
        addGroupAndChildren(item.group);
      } else {
        ids.push(`page:${item.page.id}`);
      }
    });

    return ids;
  }, [sortedItems, pages, pageGroups]);

  // Load channels on mount
  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const handleSelectPage = (page: Page) => {
    selectPage(page.id);
    // Switch to isolated mode and update preview with the page payload
    setPreviewMode('isolated');
    selectPageForPreview(page.id, page.payload);
  };

  const handleDelete = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Delete Page',
      description: 'Are you sure you want to delete this page?',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (confirmed) {
      await deletePage(pageId);
    }
  };

  const handleDuplicate = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await duplicatePage(pageId);
  };

  const handleAddToLibrary = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const page = pages.find((p) => p.id === pageId);
    if (!page || !currentProject) return;

    try {
      const { addToLibrary, loadPageLibrary } = usePageLibraryStore.getState();
      await addToLibrary({
        projectId: currentProject.id,
        organizationId: page.organizationId,
        templateId: page.templateId,
        name: page.name,
        payload: page.payload,
        duration: page.duration,
      });
      // Reload the library to show the new page
      await loadPageLibrary(currentProject.id);
    } catch (error) {
      console.error('[PlaylistPanel] Failed to add page to library:', error);
    }
  };

  const handleChannelChange = async (pageId: string, channelId: string | null) => {
    try {
      await updatePageChannel(pageId, channelId);
    } catch (error) {
      console.error('[PlaylistPanel] Failed to update page channel:', error);
    }
  };

  // Helper to get animations and keyframes from localStorage for a template
  const getAnimationDataForTemplate = (templateId: string) => {
    try {
      const previewDataStr = localStorage.getItem('pulsar-preview-data');
      if (!previewDataStr) return { animations: [], keyframes: [] };

      const previewData = JSON.parse(previewDataStr);
      const allAnimations = previewData.animations || [];
      const allKeyframes = previewData.keyframes || [];
      const elements = previewData.elements || [];

      // Get element IDs for this template
      const templateElementIds = new Set(
        elements.filter((e: any) => e.template_id === templateId).map((e: any) => e.id)
      );

      // Filter animations for this template's elements
      const templateAnimations = allAnimations.filter((a: any) =>
        templateElementIds.has(a.element_id)
      );

      // Get animation IDs for keyframe filtering
      const templateAnimationIds = new Set(templateAnimations.map((a: any) => a.id));

      // Filter keyframes for this template's animations
      const templateKeyframes = allKeyframes.filter((k: any) =>
        templateAnimationIds.has(k.animation_id)
      );

      return { animations: templateAnimations, keyframes: templateKeyframes };
    } catch (e) {
      console.warn('[PlaylistPanel] Failed to get animation data from localStorage:', e);
      return { animations: [], keyframes: [] };
    }
  };

  const handlePlayIn = async (page: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!page.channelId) {
      alert('Please assign a channel to this page first');
      return;
    }
    let template = templates.find((t) => t.id === page.templateId);
    if (!template || !currentProject) {
      console.error('Template or project not found');
      return;
    }

    // Ensure template elements are loaded for payload filtering
    if (!template.elements || template.elements.length === 0) {
      const elements = await loadTemplateElements(template.id);
      // Re-fetch template with loaded elements
      template = templates.find((t) => t.id === page.templateId) || template;
      // If elements were loaded, use them directly (state might not have updated yet)
      if (elements.length > 0 && (!template.elements || template.elements.length === 0)) {
        template = { ...template, elements };
      }
    }

    const layerIndex = getLayerIndex(template.layerType);

    // Resolve data bindings using the page's saved dataRecordIndex
    // Also collect bindings and currentRecord to send with the play command
    let resolvedPayload = { ...page.payload };
    let bindingsForCommand: Binding[] = [];
    let currentRecordForCommand: Record<string, unknown> | null = null;

    // Fetch bindings and endpoint data directly - same approach as nova-gfx PublishModal
    try {
      // 1. Load bindings from database
      const { data: dbBindings, error: bindingsError } = await supabase
        .from('gfx_bindings')
        .select('*')
        .eq('template_id', template.id);

      if (bindingsError) {
        console.warn('[PlaylistPanel] Error fetching bindings from DB:', bindingsError);
      }

      const templateBindings = (dbBindings || []) as Binding[];

      // 2. Fetch endpoint data using the template's dataSourceConfig slug
      let endpointData: Record<string, unknown>[] = [];
      const dataSourceConfig = template.dataSourceConfig as { slug?: string } | null;
      const slug = dataSourceConfig?.slug;

      if (slug) {
        try {
          endpointData = await fetchEndpointData(slug);
        } catch (endpointErr) {
          console.warn('[PlaylistPanel] Error fetching endpoint data:', endpointErr);
        }
      }

      // 3. Get current record based on page's dataRecordIndex
      if (endpointData.length > 0) {
        const recordIndex = page.dataRecordIndex ?? dataSourceConfig?.defaultRecordIndex ?? 0;
        const safeIndex = Math.max(0, Math.min(recordIndex, endpointData.length - 1));
        const currentRecord = endpointData[safeIndex];

        if (currentRecord) {
          // Resolve bindings into payload (for pre-resolved values)
          resolvedPayload = resolvePayloadBindings(resolvedPayload, templateBindings, currentRecord);

          // Store bindings and record to send with command (for runtime resolution)
          bindingsForCommand = templateBindings;
          currentRecordForCommand = currentRecord;
        }
      } else if (templateBindings.length > 0) {
        // No endpoint data but have bindings - send bindings for NovaPlayer to resolve
        bindingsForCommand = templateBindings;
      }
    } catch (err) {
      console.error('[PlaylistPanel] Error loading bindings/data:', err);
    }

    // Filter payload to only include keys that belong to this template's elements
    // This ensures we only send relevant data for this specific template
    let filteredPayload = resolvedPayload;
    if (template.elements && template.elements.length > 0) {
      const elementIds = new Set(template.elements.map(el => el.id));
      const elementNames = new Set(template.elements.map(el => el.name?.toLowerCase().replace(/\s+/g, '_')));

      filteredPayload = Object.fromEntries(
        Object.entries(resolvedPayload).filter(([key]) => {
          const keyLower = key.toLowerCase().replace(/\s+/g, '_');
          return elementIds.has(key) || elementNames.has(keyLower);
        })
      );
    }

    try {
      // Send FULL element data so NovaPlayer can render correctly (position, transform, etc.)
      const elementsForCommand = template.elements?.map(el => ({
        id: el.id,
        template_id: el.templateId,
        name: el.name,
        element_id: el.elementId,
        element_type: el.elementType,
        parent_element_id: el.parentElementId,
        sort_order: el.sortOrder,
        z_index: el.zIndex,
        position_x: el.positionX,
        position_y: el.positionY,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        scale_x: el.scaleX,
        scale_y: el.scaleY,
        anchor_x: el.anchorX,
        anchor_y: el.anchorY,
        opacity: el.opacity,
        content: el.content,
        styles: el.styles,
        classes: el.classes,
        visible: el.visible,
        locked: el.locked,
      }));

      // Get animation data from localStorage
      const { animations: animationsForCommand, keyframes: keyframesForCommand } =
        getAnimationDataForTemplate(template.id);

      await playOnChannel(
        page.channelId,
        page.id,
        layerIndex,
        {
          id: template.id,
          name: template.name,
          projectId: currentProject.id,
          layerId: template.layerId,
          elements: elementsForCommand,
          animations: animationsForCommand,
          keyframes: keyframesForCommand,
        },
        filteredPayload,
        page.name,
        currentProject.name,
        // Pass bindings and currentRecord for Nova Player data binding resolution
        bindingsForCommand.length > 0 ? bindingsForCommand : undefined,
        currentRecordForCommand
      );

      // Clear on-air state from other pages on the same channel + layer
      // This ensures only one page per layer/channel is marked as on-air
      const pagesToClear = pages.filter(p => {
        if (p.id === page.id) return false; // Skip the page we're playing
        if (!p.isOnAir) return false; // Skip pages not on-air
        if (p.channelId !== page.channelId) return false; // Skip pages on different channels

        // Check if same layer type
        const pTemplate = templates.find(t => t.id === p.templateId);
        return pTemplate?.layerType === template.layerType;
      });

      // Clear on-air state for conflicting pages
      for (const p of pagesToClear) {
        await setPageOnAir(p.id, false);
      }

      // Mark page as on-air (persisted to database)
      await setPageOnAir(page.id, true);

      // Track last played page for quick Play Out action
      setLastPlayedPageId(page.id);
    } catch (error) {
      console.error('Failed to play in:', error);
    }
  };

  const handlePlayOut = async (page: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!page.channelId) {
      alert('Please assign a channel to this page first');
      return;
    }
    const template = templates.find((t) => t.id === page.templateId);
    const layerIndex = getLayerIndex(template?.layerType);
    // Pass layerId to ensure correct layer is stopped (layerIndex is fallback)
    const layerId = template?.layerId;
    try {
      await stopOnChannel(page.channelId, layerIndex, layerId);
      // Remove page from on-air (persisted to database)
      await setPageOnAir(page.id, false);
    } catch (error) {
      console.error('Failed to play out:', error);
    }
  };

  // Helper to get all pages in a group recursively (including nested groups)
  const getAllPagesInGroup = (groupId: string): Page[] => {
    const allPagesInGroup: Page[] = [];

    // Get direct pages in this group
    const directPages = pages.filter(p => p.pageGroupId === groupId);
    allPagesInGroup.push(...directPages);

    // Recursively get pages from child groups
    const childGroups = pageGroups.filter(g => g.parentGroupId === groupId);
    for (const childGroup of childGroups) {
      allPagesInGroup.push(...getAllPagesInGroup(childGroup.id));
    }

    return allPagesInGroup;
  };

  // Play in all pages in a group (including nested groups)
  const handleGroupPlayIn = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const groupPages = getAllPagesInGroup(groupId);
    const pagesWithChannel = groupPages.filter(p => p.channelId);

    if (pagesWithChannel.length === 0) {
      alert('No pages with assigned channels in this group');
      return;
    }

    // Mark group as on-air
    setOnAirGroupIds(prev => new Set(prev).add(groupId));

    // Execute play in for each page sequentially (to avoid overwhelming the system)
    for (const page of pagesWithChannel) {
      const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
      await handlePlayIn(page, fakeEvent);
    }
  };

  // Play out all pages in a group (including nested groups)
  const handleGroupPlayOut = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const groupPages = getAllPagesInGroup(groupId);
    const pagesWithChannel = groupPages.filter(p => p.channelId);

    if (pagesWithChannel.length === 0) {
      alert('No pages with assigned channels in this group');
      return;
    }

    // Execute play out for each page sequentially
    for (const page of pagesWithChannel) {
      const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
      await handlePlayOut(page, fakeEvent);
    }

    // Remove group from on-air
    setOnAirGroupIds(prev => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
  };

  // ========================================
  // QUICK ACTION HANDLERS (for top bar buttons)
  // ========================================

  // Quick Play Current - plays the currently selected page
  const handleQuickPlayCurrent = async () => {
    if (!selectedPage) {
      return;
    }
    // Get fresh page data from pages array to ensure we have latest channelId
    const freshPage = pages.find(p => p.id === selectedPage.id);
    if (!freshPage) {
      return;
    }
    const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
    await handlePlayIn(freshPage, fakeEvent);
  };

  // Quick Play Current & Next - plays current page and selects next in list
  const handleQuickPlayCurrentAndNext = async () => {
    if (!selectedPage) {
      return;
    }
    // Get fresh page data from pages array to ensure we have latest channelId
    const freshPage = pages.find(p => p.id === selectedPage.id);
    if (!freshPage) {
      return;
    }
    const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
    await handlePlayIn(freshPage, fakeEvent);

    // Select the next page in the list using the properly ordered loopFlatPages
    // Use same behavior as handleSelectPage: update both page store AND preview store
    const currentIdx = loopFlatPages.findIndex(p => p.id === selectedPage.id);
    if (currentIdx !== -1 && loopFlatPages.length > 1) {
      const nextIdx = (currentIdx + 1) % loopFlatPages.length;
      const nextPage = loopFlatPages[nextIdx];
      selectPage(nextPage.id);
      selectPageForPreview(nextPage.id, nextPage.payload);
    }
  };

  // Quick Play Out - plays out the last played page (not dependent on selection)
  const handleQuickPlayOut = async () => {
    // Find any page that is currently on air, prioritizing the last played one
    let pageToPlayOut: Page | undefined;

    if (lastPlayedPageId) {
      pageToPlayOut = loopFlatPages.find(p => p.id === lastPlayedPageId && p.isOnAir);
    }

    // If last played page is not on air, find any page that is on air
    if (!pageToPlayOut) {
      pageToPlayOut = loopFlatPages.find(p => p.isOnAir);
    }

    if (!pageToPlayOut) {
      return;
    }

    const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
    await handlePlayOut(pageToPlayOut, fakeEvent);
  };

  // Check if any page is currently on air
  const hasOnAirPage = useMemo(() => loopFlatPages.some(p => p.isOnAir), [loopFlatPages]);

  // ========================================
  // LOOP MODE HANDLERS
  // ========================================

  // Helper: play a page without event (for loop mode)
  const playPageDirect = async (page: Page) => {
    if (!page.channelId) return;

    let template = templates.find((t) => t.id === page.templateId);
    if (!template || !currentProject) return;

    // Ensure template elements are loaded
    if (!template.elements || template.elements.length === 0) {
      const elements = await loadTemplateElements(template.id);
      template = templates.find((t) => t.id === page.templateId) || template;
      if (elements.length > 0 && (!template.elements || template.elements.length === 0)) {
        template = { ...template, elements };
      }
    }

    const layerIndex = getLayerIndex(template.layerType);

    // Resolve data bindings for loop mode - same approach as regular play
    let resolvedPayload = { ...page.payload };
    let bindingsForCommand: Binding[] = [];
    let currentRecordForCommand: Record<string, unknown> | null = null;

    try {
      // 1. Load bindings from database
      const { data: dbBindings, error: bindingsError } = await supabase
        .from('gfx_bindings')
        .select('*')
        .eq('template_id', template.id);

      if (bindingsError) {
        console.warn('[PlaylistPanel] Error fetching bindings (loop mode):', bindingsError);
      }

      const templateBindings = (dbBindings || []) as Binding[];

      // 2. Fetch endpoint data
      let endpointData: Record<string, unknown>[] = [];
      const dataSourceConfig = template.dataSourceConfig as { slug?: string } | null;
      const slug = dataSourceConfig?.slug;

      if (slug) {
        try {
          endpointData = await fetchEndpointData(slug);
        } catch (endpointErr) {
          console.warn('[PlaylistPanel] Error fetching endpoint data (loop mode):', endpointErr);
        }
      }

      // 3. Get current record
      if (endpointData.length > 0) {
        const recordIndex = page.dataRecordIndex ?? dataSourceConfig?.defaultRecordIndex ?? 0;
        const safeIndex = Math.max(0, Math.min(recordIndex, endpointData.length - 1));
        const currentRecord = endpointData[safeIndex];

        if (currentRecord) {
          resolvedPayload = resolvePayloadBindings(resolvedPayload, templateBindings, currentRecord);
          bindingsForCommand = templateBindings;
          currentRecordForCommand = currentRecord;
        }
      } else if (templateBindings.length > 0) {
        bindingsForCommand = templateBindings;
      }
    } catch (err) {
      console.error('[PlaylistPanel] Error loading bindings/data (loop mode):', err);
    }

    // Filter payload
    let filteredPayload = resolvedPayload;
    if (template.elements && template.elements.length > 0) {
      const elementIds = new Set(template.elements.map(el => el.id));
      const elementNames = new Set(template.elements.map(el => el.name?.toLowerCase().replace(/\s+/g, '_')));
      filteredPayload = Object.fromEntries(
        Object.entries(resolvedPayload).filter(([key]) => {
          const keyLower = key.toLowerCase().replace(/\s+/g, '_');
          return elementIds.has(key) || elementNames.has(keyLower);
        })
      );
    }

    // Send FULL element data so NovaPlayer can render correctly (position, transform, etc.)
    const elementsForCommand = template.elements?.map(el => ({
      id: el.id,
      template_id: el.templateId,
      name: el.name,
      element_id: el.elementId,
      element_type: el.elementType,
      parent_element_id: el.parentElementId,
      sort_order: el.sortOrder,
      z_index: el.zIndex,
      position_x: el.positionX,
      position_y: el.positionY,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      scale_x: el.scaleX,
      scale_y: el.scaleY,
      anchor_x: el.anchorX,
      anchor_y: el.anchorY,
      opacity: el.opacity,
      content: el.content,
      styles: el.styles,
      classes: el.classes,
      visible: el.visible,
      locked: el.locked,
    }));

    // Get animation data from localStorage
    const { animations: animationsForCommand, keyframes: keyframesForCommand } =
      getAnimationDataForTemplate(template.id);

    await playOnChannel(
      page.channelId,
      page.id,
      layerIndex,
      {
        id: template.id,
        name: template.name,
        projectId: currentProject.id,
        layerId: template.layerId,
        elements: elementsForCommand,
        animations: animationsForCommand,
        keyframes: keyframesForCommand,
      },
      filteredPayload,
      page.name,
      currentProject.name,
      // Pass bindings and currentRecord for Nova Player data binding resolution
      bindingsForCommand.length > 0 ? bindingsForCommand : undefined,
      currentRecordForCommand
    );

    // Clear on-air from other pages on same channel + layer, then set this page
    const pagesToClear = pages.filter(p => {
      if (p.id === page.id) return false;
      if (!p.isOnAir) return false;
      if (p.channelId !== page.channelId) return false;
      const pTemplate = templates.find(t => t.id === p.templateId);
      return pTemplate?.layerType === template.layerType;
    });
    for (const p of pagesToClear) {
      await setPageOnAir(p.id, false);
    }
    await setPageOnAir(page.id, true);
  };

  // Helper: stop a page without event (for loop mode)
  const stopPageDirect = async (page: Page) => {
    if (!page.channelId) return;

    const template = templates.find((t) => t.id === page.templateId);
    const layerIndex = getLayerIndex(template?.layerType);
    const layerId = template?.layerId;

    await stopOnChannel(page.channelId, layerIndex, layerId);
    await setPageOnAir(page.id, false);
  };

  // Start loop playback
  const handleLoopPlay = async () => {
    if (loopFlatPages.length === 0) {
      alert('No pages in playlist');
      return;
    }
    play(); // Set isPlaying = true
    // Playback will be driven by the useEffect below
  };

  // Stop loop playback and play out current page
  const handleLoopStop = async () => {
    // Clear any pending timeout
    if (loopTimeoutId) {
      clearTimeout(loopTimeoutId);
      setLoopTimeoutId(null);
    }

    // Play out current page if any
    const currentPage = loopFlatPages[currentIndex];
    if (currentPage && currentPage.isOnAir) {
      await stopPageDirect(currentPage);
    }

    stop(); // Set isPlaying = false, currentIndex = 0
  };

  // Go to next page (manual skip)
  const handleLoopNext = () => {
    if (loopFlatPages.length === 0) return;
    const nextIndex = (currentIndex + 1) % loopFlatPages.length;
    setCurrentIndex(nextIndex);
  };

  // Go to previous page (manual skip)
  const handleLoopPrevious = () => {
    if (loopFlatPages.length === 0) return;
    const prevIndex = currentIndex === 0 ? loopFlatPages.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
  };

  // Queue a specific page to play next in the loop (Play Next button per page row)
  // This doesn't jump immediately - it sets the page as "next" and the loop will transition to it
  const handlePlayNextPage = (targetIndex: number) => {
    if (loopFlatPages.length === 0 || targetIndex < 0 || targetIndex >= loopFlatPages.length) return;
    // Toggle off if clicking the already queued page
    if (queuedNextIndex === targetIndex) {
      setQueuedNextIndex(null);
    } else {
      setQueuedNextIndex(targetIndex);
    }
  };

  // Loop playback effect - runs the automatic play cycle
  useEffect(() => {
    // Only run in loop mode when playing
    if (currentPlaylist?.mode !== 'loop' || !isPlaying || loopFlatPages.length === 0) {
      return;
    }

    const currentPage = loopFlatPages[currentIndex];
    if (!currentPage) return;

    let isCancelled = false;

    const runPlayCycle = async () => {
      // Play in the current page
      await playPageDirect(currentPage);

      if (isCancelled) return;

      // Get page duration (use page.duration if set, otherwise playlist default, fallback to 3000ms)
      const duration = currentPage.duration || currentPlaylist.defaultDuration || 3000;

      // Wait for duration, then play out and advance
      const timeoutId = setTimeout(async () => {
        if (isCancelled) return;

        // Play out the current page
        await stopPageDirect(currentPage);

        if (isCancelled) return;

        // Advance to next page: use queued index if set, otherwise natural next
        // Use ref to get current value (avoids stale closure in setTimeout)
        let nextIndex: number;
        const queuedIdx = queuedNextIndexRef.current;
        if (queuedIdx !== null) {
          nextIndex = queuedIdx;
          setQueuedNextIndex(null); // Clear the queue after using it
        } else {
          nextIndex = (currentIndex + 1) % loopFlatPages.length;
        }
        setCurrentIndex(nextIndex);
      }, duration);

      setLoopTimeoutId(timeoutId);
    };

    runPlayCycle();

    return () => {
      isCancelled = true;
      if (loopTimeoutId) {
        clearTimeout(loopTimeoutId);
      }
    };
  }, [currentPlaylist?.mode, isPlaying, currentIndex, loopFlatPages.length]);

  // Cleanup timeout on unmount or mode change
  useEffect(() => {
    return () => {
      if (loopTimeoutId) {
        clearTimeout(loopTimeoutId);
      }
    };
  }, [loopTimeoutId]);

  // ========================================
  // END LOOP MODE HANDLERS
  // ========================================

  // Unified drag and drop handlers for mixed groups and pages
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Check if dropping onto the ungroup zone
    if (activeIdStr.startsWith('page:') && overIdStr === 'ungroup-drop') {
      const pageId = activeIdStr.replace('page:', '');
      const { movePageToGroup } = usePageStore.getState();
      movePageToGroup(pageId, null); // null means ungroup
      return;
    }

    // Check if dropping a page onto a group's drop zone
    if (activeIdStr.startsWith('page:') && overIdStr.startsWith('group-drop:')) {
      const pageId = activeIdStr.replace('page:', '');
      const targetGroupId = overIdStr.replace('group-drop:', '');
      const { movePageToGroup } = usePageStore.getState();
      movePageToGroup(pageId, targetGroupId);
      return;
    }

    // Check if dropping a group onto another group's drop zone (nest groups)
    if (activeIdStr.startsWith('group:') && overIdStr.startsWith('group-drop:')) {
      const sourceGroupId = activeIdStr.replace('group:', '');
      const targetGroupId = overIdStr.replace('group-drop:', '');
      if (sourceGroupId !== targetGroupId) {
        const { moveGroupToGroup } = usePageStore.getState();
        moveGroupToGroup(sourceGroupId, targetGroupId)
          .catch(err => console.error('[PlaylistPanel] Failed to nest group:', err));
      }
      return;
    }

    // Check if a grouped page is being dragged onto an ungrouped item (to ungroup it)
    if (activeIdStr.startsWith('page:')) {
      const pageId = activeIdStr.replace('page:', '');
      const draggedPage = pages.find(p => p.id === pageId);

      // If the dragged page is in a group and being dropped on a top-level item
      if (draggedPage?.pageGroupId && (overIdStr.startsWith('page:') || overIdStr.startsWith('group:'))) {
        const overPageId = overIdStr.replace('page:', '').replace('group:', '');
        const overPage = pages.find(p => p.id === overPageId);
        const overGroup = pageGroups.find(g => g.id === overPageId);

        // If dropping on an ungrouped page or a group header (not the group's drop zone), ungroup it
        if ((overPage && !overPage.pageGroupId) || overGroup) {
          const { movePageToGroup } = usePageStore.getState();
          movePageToGroup(pageId, null);
          return;
        }
      }
    }

    // Find indices in the unified sortedItems list for reordering
    const oldIndex = sortableIds.indexOf(activeIdStr);
    const newIndex = sortableIds.indexOf(overIdStr);

    if (oldIndex === -1 || newIndex === -1) return;

    // Calculate the new sort order based on position
    const reorderedIds = arrayMove(sortableIds, oldIndex, newIndex);

    // Update sort orders for all items to match their new positions
    const { reorderMixedItems } = usePageStore.getState();
    reorderMixedItems(reorderedIds);
  };

  // ========================================
  // EXTERNAL PAGE DROP HANDLERS (from PageList)
  // ========================================

  // Handle drag over from external source (PageList)
  const handleExternalDragOver = (e: React.DragEvent) => {
    // Check if this is a page drag from PageList
    if (e.dataTransfer.types.includes(PAGE_DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsExternalDragOver(true);
    }
  };

  // Handle drag leave
  const handleExternalDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the container entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsExternalDragOver(false);
    }
  };

  // Handle drop from external source (PageList library)
  const handleExternalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsExternalDragOver(false);

    // Get the page data from the drag
    const pageDataStr = e.dataTransfer.getData(PAGE_DRAG_TYPE);
    if (!pageDataStr || !currentPlaylist) return;

    try {
      const pageData = JSON.parse(pageDataStr) as {
        libraryPageId: string;
        pageName: string;
        templateId: string;
        payload?: Record<string, any>;
        duration?: number;
      };

      // Create a new page in the current playlist using the library page data
      const { createPage } = usePageStore.getState();
      await createPage(
        currentPlaylist.id,
        pageData.templateId,
        pageData.pageName,
        pageData.payload || {},
        null // no channel assignment when dragging from library
      );
    } catch (error) {
      console.error('[PlaylistPanel] Failed to add page from drag:', error);
    }
  };

  // Custom collision detection that prioritizes drop zones
  const customCollisionDetection: CollisionDetection = (args) => {
    // First check pointer intersection for more precise drop targets
    const pointerCollisions = pointerWithin(args);

    // Prioritize ungroup drop zone
    const ungroupDropZone = pointerCollisions.find(c => c.id === 'ungroup-drop');
    if (ungroupDropZone) {
      return [ungroupDropZone];
    }

    // If we're over a group drop zone, prioritize it
    const groupDropZone = pointerCollisions.find(c =>
      (c.id as string).startsWith('group-drop:')
    );
    if (groupDropZone) {
      return [groupDropZone];
    }

    // Fall back to closest center for sortable items
    const closestCollisions = closestCenter(args);
    return closestCollisions;
  };

  // Group selection handlers
  const handleToggleGroupSelection = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleUngroupSelected = async () => {
    if (selectedGroupIds.size === 0) return;
    for (const groupId of selectedGroupIds) {
      await deletePageGroup(groupId);
    }
    setSelectedGroupIds(new Set());
  };

  const handleCreateGroup = async () => {
    if (!currentPlaylist) return;
    try {
      // Auto-generate group name
      const groupName = generateGroupName(pageGroups);
      const newGroup = await createPageGroup(currentPlaylist.id, groupName);

      // If pages were selected, move them to the new group
      if (selectedPageIds.size > 0) {
        const { movePageToGroup } = usePageStore.getState();
        for (const pageId of selectedPageIds) {
          await movePageToGroup(pageId, newGroup.id);
        }
        setSelectedPageIds(new Set());
      }

      // If groups were selected, nest them inside the new group
      if (selectedGroupIds.size > 0) {
        const { moveGroupToGroup } = usePageStore.getState();
        for (const groupId of selectedGroupIds) {
          await moveGroupToGroup(groupId, newGroup.id);
        }
        setSelectedGroupIds(new Set());
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleMoveGroupsToGroup = async (targetGroupId: string | null) => {
    if (selectedGroupIds.size === 0) return;
    const { moveGroupToGroup } = usePageStore.getState();
    for (const groupId of selectedGroupIds) {
      if (groupId !== targetGroupId) {
        await moveGroupToGroup(groupId, targetGroupId);
      }
    }
    setSelectedGroupIds(new Set());
  };

  const handleStartEditGroup = (group: PageGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
    setEditingPageId(null);
  };

  const handleStartEditPage = (page: Page) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
    setEditingGroupId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim()) {
      setEditingGroupId(null);
      setEditingPageId(null);
      return;
    }

    const { updatePageGroup, updatePage } = usePageStore.getState();

    if (editingGroupId) {
      await updatePageGroup(editingGroupId, { name: editingName.trim() });
    } else if (editingPageId) {
      await updatePage(editingPageId, { name: editingName.trim() });
    }

    setEditingGroupId(null);
    setEditingPageId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingGroupId(null);
    setEditingPageId(null);
    setEditingName('');
  };

  const handleTogglePageSelection = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPageIds(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPageIds.size === pages.length) {
      setSelectedPageIds(new Set());
    } else {
      setSelectedPageIds(new Set(pages.map(p => p.id)));
    }
  };

  const handleMoveSelectedToGroup = async (groupId: string | null) => {
    if (selectedPageIds.size === 0) return;
    const { movePageToGroup } = usePageStore.getState();
    for (const pageId of selectedPageIds) {
      await movePageToGroup(pageId, groupId);
    }
    setSelectedPageIds(new Set());
  };

  const handleDeleteSelected = useCallback(async () => {
    if (selectedPageIds.size === 0) return;

    const confirmed = await confirm({
      title: 'Delete Pages',
      description: `Are you sure you want to delete ${selectedPageIds.size} page${selectedPageIds.size > 1 ? 's' : ''}?`,
      confirmText: 'Delete',
      variant: 'destructive',
    });

    if (confirmed) {
      for (const pageId of selectedPageIds) {
        try {
          await deletePage(pageId);
        } catch (error) {
          console.error('[PlaylistPanel] Failed to delete page:', pageId, error);
        }
      }
      setSelectedPageIds(new Set());
    }
  }, [selectedPageIds, confirm, deletePage]);

  // Keyboard shortcut for deleting selected pages (Delete or Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Delete/Backspace if pages are selected and not editing
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPageIds.size > 0) {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPageIds.size, handleDeleteSelected]);

  if (!currentPlaylist) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No playlist selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Mode Indicator */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs shrink-0',
              currentPlaylist.mode === 'loop'
                ? 'bg-purple-500/20 text-purple-400'
                : currentPlaylist.mode === 'timed'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {currentPlaylist.mode === 'loop' ? (
              <Repeat className="w-3.5 h-3.5" />
            ) : currentPlaylist.mode === 'timed' ? (
              <Clock className="w-3.5 h-3.5" />
            ) : (
              <Hand className="w-3.5 h-3.5" />
            )}
            {currentPlaylist.mode === 'loop' ? 'Loop' : currentPlaylist.mode === 'timed' ? 'Timed' : 'Manual'}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1 ml-2">
            {/* Play Current */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleQuickPlayCurrent}
              disabled={!selectedPage || !selectedPage.channelId}
              title={selectedPage ? `Play "${selectedPage.name}"` : 'Select a page to play'}
              className="h-7 px-2 text-xs text-green-500 hover:text-green-400 hover:bg-green-500/10"
            >
              <Play className="w-3.5 h-3.5 mr-1 fill-current" />
              Play
            </Button>

            {/* Play Current & Read Next */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleQuickPlayCurrentAndNext}
              disabled={!selectedPage || !selectedPage.channelId}
              title="Play current page and select next"
              className="h-7 px-2 text-xs text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10"
            >
              <SkipForward className="w-3.5 h-3.5 mr-1" />
              Next
            </Button>

            {/* Play Out */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleQuickPlayOut}
              disabled={!hasOnAirPage}
              title="Play out the last played page"
              className="h-7 px-2 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <Square className="w-3.5 h-3.5 mr-1 fill-current" />
              Out
            </Button>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1.5 flex-1 justify-end">
            {/* Delete Button - appears when pages are selected */}
            {selectedPageIds.size > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs shrink-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={handleDeleteSelected}
                title={`Delete ${selectedPageIds.size} selected page${selectedPageIds.size > 1 ? 's' : ''}`}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete
                <span className="ml-1 text-[10px] bg-red-500/20 px-1 rounded">
                  {selectedPageIds.size}
                </span>
              </Button>
            )}

            {/* Group Button with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-7 px-2 text-xs shrink-0",
                    (selectedPageIds.size > 0 || selectedGroupIds.size > 0) && "text-cyan-500"
                  )}
                >
                  <FolderPlus className="w-3.5 h-3.5 mr-1" />
                  Group
                  {(selectedPageIds.size > 0 || selectedGroupIds.size > 0) && (
                    <span className="ml-1 text-[10px] bg-cyan-500/20 px-1 rounded">
                      {selectedPageIds.size + selectedGroupIds.size}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCreateGroup}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create New Group
                  {(selectedPageIds.size > 0 || selectedGroupIds.size > 0) && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({selectedPageIds.size > 0 ? `${selectedPageIds.size} pages` : ''}
                      {selectedPageIds.size > 0 && selectedGroupIds.size > 0 ? ', ' : ''}
                      {selectedGroupIds.size > 0 ? `${selectedGroupIds.size} groups` : ''})
                    </span>
                  )}
                </DropdownMenuItem>
                {selectedGroupIds.size > 0 && (
                  <>
                    <DropdownMenuItem onClick={handleUngroupSelected} className="text-amber-500">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected Groups ({selectedGroupIds.size})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMoveGroupsToGroup(null)}>
                      <Folder className="w-4 h-4 mr-2 text-muted-foreground" />
                      Move to Top Level
                    </DropdownMenuItem>
                    {pageGroups.filter(g => !selectedGroupIds.has(g.id)).length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">Nest inside:</div>
                        {pageGroups
                          .filter(g => !selectedGroupIds.has(g.id))
                          .map(group => (
                            <DropdownMenuItem
                              key={group.id}
                              onClick={() => handleMoveGroupsToGroup(group.id)}
                            >
                              <Folder className="w-4 h-4 mr-2" style={{ color: group.color || undefined }} />
                              {group.name}
                            </DropdownMenuItem>
                          ))}
                      </>
                    )}
                  </>
                )}
                {pageGroups.length > 0 && selectedPageIds.size > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Move pages to:</div>
                    {pageGroups.map(group => (
                      <DropdownMenuItem
                        key={group.id}
                        onClick={() => handleMoveSelectedToGroup(group.id)}
                      >
                        <Folder className="w-4 h-4 mr-2" style={{ color: group.color || undefined }} />
                        {group.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={() => handleMoveSelectedToGroup(null)}>
                      <Folder className="w-4 h-4 mr-2 text-muted-foreground" />
                      Ungroup
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filter Button */}
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-7 w-7 shrink-0",
                hasActiveFilters && "text-cyan-500 bg-cyan-500/10"
              )}
              onClick={() => setShowFilters(!showFilters)}
              title="Filter pages"
            >
              <Filter className="w-4 h-4" />
            </Button>

            {/* Settings Button */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Playlist Settings (collapsed by default) */}
        {showSettings && (
          <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground w-20">Channel:</label>
              <Select
                value={currentPlaylist.channelId || ''}
                onValueChange={(v) => setChannelId(v || null)}
              >
                <SelectTrigger className="h-7 w-[140px]">
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-cyan-500" />
                    <SelectValue placeholder="Select...">
                      {channels.find(c => c.id === currentPlaylist.channelId)?.channelCode || 'Select...'}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            channel.playerStatus === 'connected'
                              ? 'bg-green-500'
                              : channel.playerStatus === 'error'
                              ? 'bg-red-500'
                              : 'bg-muted-foreground'
                          )}
                        />
                        {channel.channelCode}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground w-20">Mode:</label>
              <Select
                value={currentPlaylist.mode}
                onValueChange={(v) => setMode(v as 'manual' | 'timed' | 'loop')}
              >
                <SelectTrigger className="h-7 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="timed">Timed</SelectItem>
                  <SelectItem value="loop">Loop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(currentPlaylist.mode === 'timed' || currentPlaylist.mode === 'loop') && (
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground w-20">Default Duration:</label>
                <Input
                  type="number"
                  value={currentPlaylist.defaultDuration / 1000}
                  onChange={(e) => setDefaultDuration(parseFloat(e.target.value) * 1000)}
                  className="h-7 w-[80px]"
                  min={1}
                  step={0.5}
                />
                <span className="text-xs text-muted-foreground">seconds</span>
              </div>
            )}

            {currentPlaylist.mode === 'timed' && (
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground w-20">At End:</label>
                <Select
                  value={currentPlaylist.endBehavior}
                  onValueChange={(v) => setEndBehavior(v as 'stop' | 'hold' | 'loop')}
                >
                  <SelectTrigger className="h-7 w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stop">
                      <div className="flex items-center gap-1.5">
                        <StopCircle className="w-3.5 h-3.5" />
                        Stop
                      </div>
                    </SelectItem>
                    <SelectItem value="hold">
                      <div className="flex items-center gap-1.5">
                        <PauseCircle className="w-3.5 h-3.5" />
                        Hold
                      </div>
                    </SelectItem>
                    <SelectItem value="loop">
                      <div className="flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5" />
                        Loop
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-muted/30 border border-border/50 rounded-lg p-3 mb-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Filters</span>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearFilters}
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Name Filter */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground uppercase">Name:</label>
                <Input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Search..."
                  className="h-6 w-[120px] text-xs"
                />
              </div>

              {/* Layer Filter */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground uppercase">Layer:</label>
                <Select
                  value={filterLayer}
                  onValueChange={setFilterLayer}
                >
                  <SelectTrigger className="h-6 w-[120px] text-xs">
                    <SelectValue placeholder="All Layers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Layers</SelectItem>
                    {uniqueLayerNames.map((layerName) => (
                      <SelectItem key={layerName} value={layerName}>
                        {layerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Channel Filter */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground uppercase">Channel:</label>
                <Select
                  value={filterChannel}
                  onValueChange={setFilterChannel}
                >
                  <SelectTrigger className="h-6 w-[120px] text-xs">
                    <SelectValue placeholder="All Channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.channelCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Results Summary */}
            {hasActiveFilters && (
              <div className="text-[10px] text-muted-foreground pt-1">
                Showing {filteredPages.length} of {pages.length} pages
              </div>
            )}
          </div>
        )}

        {/* Playback Controls (Timed Mode) */}
        {currentPlaylist.mode === 'timed' && (
          <div className="flex items-center justify-center gap-2">
            <Button size="icon" variant="outline" onClick={previous} className="h-8 w-8">
              <SkipBack className="w-4 h-4" />
            </Button>

            {isPlaying ? (
              <Button size="icon" onClick={pause} className="h-10 w-10 bg-amber-500 hover:bg-amber-600">
                <Pause className="w-5 h-5" />
              </Button>
            ) : (
              <Button size="icon" onClick={play} className="h-10 w-10 bg-green-600 hover:bg-green-700">
                <Play className="w-5 h-5 fill-current" />
              </Button>
            )}

            <Button size="icon" variant="destructive" onClick={stop} className="h-8 w-8">
              <Square className="w-4 h-4" />
            </Button>

            <Button size="icon" variant="outline" onClick={next} className="h-8 w-8">
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Playback Controls (Loop Mode) */}
        {currentPlaylist.mode === 'loop' && (
          <div className="flex items-center justify-center gap-2 py-2 border-b border-border/50 bg-purple-500/5">
            <Button size="icon" variant="outline" onClick={handleLoopPrevious} className="h-8 w-8">
              <SkipBack className="w-4 h-4" />
            </Button>

            {isPlaying ? (
              <Button size="icon" onClick={pause} className="h-10 w-10 bg-amber-500 hover:bg-amber-600">
                <Pause className="w-5 h-5" />
              </Button>
            ) : (
              <Button size="icon" onClick={handleLoopPlay} className="h-10 w-10 bg-purple-600 hover:bg-purple-700">
                <Play className="w-5 h-5 fill-current" />
              </Button>
            )}

            <Button size="icon" variant="destructive" onClick={handleLoopStop} className="h-8 w-8">
              <Square className="w-4 h-4" />
            </Button>

            <Button size="icon" variant="outline" onClick={handleLoopNext} className="h-8 w-8">
              <SkipForward className="w-4 h-4" />
            </Button>

            {/* Current position indicator */}
            <div className="ml-4 text-xs text-muted-foreground">
              {loopFlatPages.length > 0 ? (
                <span className="font-mono">
                  {currentIndex + 1} / {loopFlatPages.length}
                </span>
              ) : (
                <span>No pages</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Page List Header */}
      <div className={cn(
        "grid gap-2 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/20 items-center",
        currentPlaylist.mode === 'loop'
          ? "grid-cols-[auto,auto,auto,1fr,auto,auto,auto,auto,auto]"
          : "grid-cols-[auto,auto,auto,1fr,auto,auto,auto,auto]"
      )}>
        {/* Select All Checkbox */}
        <div className="w-4 flex items-center justify-center">
          <input
            type="checkbox"
            checked={pages.length > 0 && selectedPageIds.size === pages.length}
            onChange={handleSelectAll}
            className="w-3 h-3 rounded border-border accent-cyan-500 cursor-pointer"
          />
        </div>
        <div className="w-4"></div>
        <div className="w-6"></div>
        <div>Name / Template</div>
        <div className="w-32 text-center">Layer</div>
        <div className="w-20 text-center">Channel</div>
        {currentPlaylist.mode === 'loop' && (
          <div className="w-14 text-center">Duration</div>
        )}
        <div className="w-16 text-center">{currentPlaylist.mode === 'loop' ? 'Skip' : 'Controls'}</div>
        <div className="w-14"></div>
      </div>

      {/* Page List */}
      <ScrollArea
        className={cn(
          "flex-1 transition-colors",
          isExternalDragOver && "bg-cyan-500/10 ring-2 ring-inset ring-cyan-500/50"
        )}
        onDragOver={handleExternalDragOver}
        onDragLeave={handleExternalDragLeave}
        onDrop={handleExternalDrop}
      >
        {/* Drop hint when dragging from PageList */}
        {isExternalDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-cyan-500/90 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
              Drop to add page to playlist
            </div>
          </div>
        )}

        {/* Unified DndContext for mixed groups and pages */}
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-border/30">
              {/* Show ungroup drop zone when dragging a grouped page */}
              {activeId?.startsWith('page:') && (() => {
                const pageId = activeId.replace('page:', '');
                const draggedPage = pages.find(p => p.id === pageId);
                return draggedPage?.pageGroupId ? (
                  <UngroupDropZone isOver={overId === 'ungroup-drop'} />
                ) : null;
              })()}

              {/* Render items in unified sort order */}
              {sortedItems.map((item) => {
                const itemId = item.type === 'group' ? `group:${item.group.id}` : `page:${item.page.id}`;
                const showDropIndicator = overId === itemId && activeId !== itemId;

                return (
                  <div key={itemId}>
                    {/* Drop indicator line above this item */}
                    {showDropIndicator && (
                      <div className="h-0.5 bg-cyan-500 mx-2 rounded-full" />
                    )}

                    {item.type === 'group' ? (
                      <SortablePageGroupSection
                        group={item.group}
                        pages={groupedPages[item.group.id] || []}
                        childGroups={pageGroups.filter(g => g.parentGroupId === item.group.id)}
                        allPages={pages}
                        allGroups={pageGroups}
                        templates={templates}
                        channels={channels}
                        selectedPage={selectedPage}
                        selectedPageIds={selectedPageIds}
                        selectedGroupIds={selectedGroupIds}
                        isGroupSelected={selectedGroupIds.has(item.group.id)}
                        currentPlaylist={currentPlaylist}
                        currentIndex={currentIndex}
                        isPlaying={isPlaying}
                        editingGroupId={editingGroupId}
                        editingPageId={editingPageId}
                        editingName={editingName}
                        nestingLevel={0}
                        loopFlatPages={loopFlatPages}
                        loopCurrentIndex={currentIndex}
                        queuedNextIndex={queuedNextIndex}
                        onSelectPage={handleSelectPage}
                        onCheckToggle={handleTogglePageSelection}
                        onGroupCheckToggle={handleToggleGroupSelection}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                        onAddToLibrary={handleAddToLibrary}
                        onChannelChange={handleChannelChange}
                        onPlayIn={handlePlayIn}
                        onPlayOut={handlePlayOut}
                        onGroupPlayIn={handleGroupPlayIn}
                        onGroupPlayOut={handleGroupPlayOut}
                        onToggleCollapse={toggleGroupCollapsed}
                        onStartEditGroup={handleStartEditGroup}
                        onStartEditPage={handleStartEditPage}
                        onEditNameChange={setEditingName}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={handleCancelEdit}
                        sensors={sensors}
                        onAirGroupIds={onAirGroupIds}
                        activeId={activeId}
                        overId={overId}
                        onPlayNext={handlePlayNextPage}
                      />
                    ) : (
                      (() => {
                        const loopIndex = loopFlatPages.findIndex((p) => p.id === item.page.id);
                        // Use queued index if set, otherwise natural next
                        const effectiveNextIndex = queuedNextIndex !== null ? queuedNextIndex : (currentIndex + 1) % loopFlatPages.length;
                        return (
                          <SortablePageRow
                            page={item.page}
                            template={templates.find((t) => t.id === item.page.templateId)}
                            channel={item.page.channelId ? channels.find((c) => c.id === item.page.channelId) : undefined}
                            isSelected={selectedPage?.id === item.page.id}
                            isChecked={selectedPageIds.has(item.page.id)}
                            isCurrentInPlayback={currentPlaylist.mode === 'timed' && pages.indexOf(item.page) === currentIndex}
                            isPlaying={isPlaying}
                            isEditing={editingPageId === item.page.id}
                            editingName={editingName}
                            isOnAir={item.page.isOnAir}
                            isCurrentInLoop={currentPlaylist.mode === 'loop' && loopIndex === currentIndex}
                            isNextInLoop={currentPlaylist.mode === 'loop' && loopFlatPages.length > 1 && loopIndex === effectiveNextIndex}
                            isLoopMode={currentPlaylist.mode === 'loop'}
                            loopIndex={loopIndex}
                            defaultDuration={currentPlaylist.defaultDuration}
                            onSelect={() => handleSelectPage(item.page)}
                            onCheckToggle={(e) => handleTogglePageSelection(item.page.id, e)}
                            onDelete={(e) => handleDelete(item.page.id, e)}
                            onDuplicate={(e) => handleDuplicate(item.page.id, e)}
                            onAddToLibrary={(e) => handleAddToLibrary(item.page.id, e)}
                            onChannelChange={(value) => handleChannelChange(item.page.id, value)}
                            onPlayIn={(e) => handlePlayIn(item.page, e)}
                            onPlayOut={(e) => handlePlayOut(item.page, e)}
                            onPlayNext={handlePlayNextPage}
                            onStartEdit={() => handleStartEditPage(item.page)}
                            onEditNameChange={setEditingName}
                            onSaveEdit={handleSaveEdit}
                            onCancelEdit={handleCancelEdit}
                            channels={channels}
                          />
                        );
                      })()
                    )}
                  </div>
                );
              })}

              {pages.length === 0 && pageGroups.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No pages in this playlist. Create one to get started.
                </div>
              )}
            </div>
          </SortableContext>

          {/* Drag Overlay - Shows clean floating preview while dragging */}
          <DragOverlay dropAnimation={null}>
            {activeId && (() => {
              // Dragging a group
              if (activeId.startsWith('group:')) {
                const groupId = activeId.replace('group:', '');
                const group = pageGroups.find(g => g.id === groupId);
                if (group) {
                  const itemCount = pages.filter(p => p.pageGroupId === groupId).length +
                    pageGroups.filter(g => g.parentGroupId === groupId).length;
                  return (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-cyan-950/95 border-2 border-cyan-500 rounded-lg shadow-2xl shadow-cyan-500/30 backdrop-blur-sm">
                      <Folder className="w-5 h-5 text-cyan-400" />
                      <span className="text-sm font-semibold text-cyan-50">{group.name}</span>
                      <span className="text-xs text-cyan-300/70 bg-cyan-500/20 px-1.5 py-0.5 rounded">
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  );
                }
              }
              // Dragging a page
              if (activeId.startsWith('page:')) {
                const pageId = activeId.replace('page:', '');
                const page = pages.find(p => p.id === pageId);
                if (page) {
                  const template = templates.find(t => t.id === page.templateId);
                  const LayerIcon = template ? (LAYER_TYPE_ICONS[template.layerType] || Grid3X3) : FileText;
                  return (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/95 border-2 border-cyan-500 rounded-lg shadow-2xl shadow-cyan-500/30 backdrop-blur-sm">
                      <LayerIcon className="w-5 h-5 text-cyan-400" />
                      <span className="text-sm font-semibold text-slate-50 truncate max-w-[200px]">{page.name}</span>
                      {template && (
                        <span className="text-[10px] text-cyan-300/70 bg-cyan-500/20 px-1.5 py-0.5 rounded">
                          {template.layerType}
                        </span>
                      )}
                    </div>
                  );
                }
              }
              return null;
            })()}
          </DragOverlay>
        </DndContext>
      </ScrollArea>
    </div>
  );
}

// Sortable Page Row Component
interface SortablePageRowProps {
  page: Page;
  template?: Template;
  channel?: Channel;
  isSelected: boolean;
  isChecked: boolean;
  isCurrentInPlayback: boolean;
  isPlaying: boolean;
  isEditing: boolean;
  editingName: string;
  isOnAir?: boolean;
  nestingLevel?: number;
  isCurrentInLoop?: boolean;
  isNextInLoop?: boolean;
  isLoopMode?: boolean;
  loopIndex?: number;
  defaultDuration?: number;
  onSelect: () => void;
  onCheckToggle: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onAddToLibrary: (e: React.MouseEvent) => void;
  onChannelChange: (value: string | null) => void;
  onPlayIn: (e: React.MouseEvent) => void;
  onPlayOut: (e: React.MouseEvent) => void;
  onPlayNext?: (loopIndex: number) => void;
  onStartEdit: () => void;
  onEditNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  channels: Channel[];
}

function SortablePageRow({
  page,
  template,
  channel,
  isSelected,
  isChecked,
  isCurrentInPlayback,
  isPlaying,
  isEditing,
  editingName,
  isOnAir = false,
  nestingLevel = 0,
  isCurrentInLoop = false,
  isNextInLoop = false,
  isLoopMode = false,
  loopIndex = -1,
  defaultDuration = 3000,
  onSelect,
  onCheckToggle,
  onDelete,
  onDuplicate,
  onAddToLibrary,
  onChannelChange,
  onPlayIn,
  onPlayOut,
  onPlayNext,
  onStartEdit,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  channels,
}: SortablePageRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `page:${page.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const LayerIcon = template ? (LAYER_TYPE_ICONS[template.layerType] || Grid3X3) : FileText;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        'group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
        isSelected
          ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500'
          : 'hover:bg-muted/30 border-l-2 border-l-transparent',
        isCurrentInPlayback && isPlaying && 'bg-green-500/10 border-l-green-500',
        isCurrentInLoop && 'bg-purple-500/15 border-l-2 border-l-purple-500',
        isNextInLoop && !isCurrentInLoop && 'bg-amber-500/10 border-l-2 border-l-amber-500/50',
        isChecked && 'bg-cyan-500/5',
        isDragging && 'z-50'
      )}
    >
      {/* Checkbox */}
      <div onClick={onCheckToggle}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => {}}
          className="w-3 h-3 rounded border-border accent-cyan-500 cursor-pointer"
        />
      </div>

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Nesting level indentation spacer */}
      {nestingLevel > 0 && <div style={{ width: `${nestingLevel * 16}px` }} />}

      {/* Icon */}
      <div className={cn(
        'w-6 h-6 rounded flex items-center justify-center',
        isSelected ? 'bg-cyan-500/20 text-cyan-500' : 'bg-muted text-muted-foreground',
        isCurrentInPlayback && isPlaying && 'bg-green-500/20 text-green-500'
      )}>
        <LayerIcon className="w-3.5 h-3.5" />
      </div>

      {/* Name and Template */}
      <div className="flex-1 min-w-0" onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(); }}>
        {isEditing ? (
          <Input
            autoFocus
            value={editingName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            onBlur={onSaveEdit}
            onClick={(e) => e.stopPropagation()}
            className="h-6 text-sm py-0 px-1"
          />
        ) : (
          <>
            <div className={cn(
              'text-sm font-medium truncate',
              isSelected ? 'text-cyan-500' : 'text-foreground',
              isCurrentInPlayback && isPlaying && 'text-green-500'
            )}>
              {page.name}
            </div>
            {template && (
              <div className="text-[11px] text-muted-foreground truncate">
                {template.name}
              </div>
            )}
          </>
        )}
      </div>

      {/* Layer */}
      <div className="w-32 shrink-0 text-center">
        {template && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {template.layerName}
          </span>
        )}
      </div>

      {/* Channel */}
      <div className="w-20 shrink-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <Select
          key={`channel-select-${page.id}-${page.channelId || 'none'}`}
          value={page.channelId || '__none__'}
          onValueChange={(value) => {
            onChannelChange(value === '__none__' ? null : value);
          }}
        >
          <SelectTrigger className="h-6 text-[10px] px-1.5 border-border/50 bg-transparent">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[100]">
            <SelectItem value="__none__">--</SelectItem>
            {channels.map((ch) => (
              <SelectItem key={ch.id} value={ch.id}>
                {ch.channelCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Duration (Loop Mode only) */}
      {isLoopMode && (
        <div className="w-14 shrink-0 text-center">
          <span className="text-[10px] text-muted-foreground font-mono">
            {((page.duration || defaultDuration) / 1000).toFixed(1)}s
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="w-16 shrink-0 flex items-center justify-center gap-1">
        {isLoopMode ? (
          /* Loop Mode: Show "Play Next" button */
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              'h-6 w-6',
              isCurrentInLoop
                ? 'text-purple-400 bg-purple-500/20'
                : 'text-purple-500 hover:text-purple-400 hover:bg-purple-500/10'
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (onPlayNext && loopIndex >= 0) {
                onPlayNext(loopIndex);
              }
            }}
            disabled={isCurrentInLoop}
            title={isCurrentInLoop ? "Currently Playing" : "Play Next"}
          >
            <SkipForward className="w-3.5 h-3.5" />
          </Button>
        ) : (
          /* Manual/Timed Mode: Show Play In/Out buttons */
          <>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                'h-6 w-6',
                !page.channelId
                  ? 'text-muted-foreground/50 cursor-not-allowed'
                  : isOnAir
                    ? 'text-green-400 bg-green-500/20 ring-1 ring-green-500/50'
                    : 'text-green-500 hover:text-green-400 hover:bg-green-500/10'
              )}
              onClick={onPlayIn}
              disabled={!page.channelId}
              title={isOnAir ? "On Air" : "Play In"}
            >
              <LogIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                'h-6 w-6',
                !page.channelId
                  ? 'text-muted-foreground/50 cursor-not-allowed'
                  : isOnAir
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                    : 'text-red-500/50 hover:text-red-400 hover:bg-red-500/10'
              )}
              onClick={onPlayOut}
              disabled={!page.channelId}
              title="Play Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="w-14 shrink-0 flex items-center justify-end gap-1">
        {isCurrentInPlayback && isPlaying && (
          <span className="text-[8px] px-1 py-0.5 bg-green-500 text-white rounded font-medium">
            LIVE
          </span>
        )}
        {isCurrentInLoop && (
          <span className="text-[8px] px-1 py-0.5 bg-purple-500 text-white rounded font-medium">
            NOW
          </span>
        )}
        {isNextInLoop && !isCurrentInLoop && (
          <span className="text-[8px] px-1 py-0.5 bg-amber-500 text-white rounded font-medium">
            NEXT
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => onAddToLibrary(e as any)}>
              <Library className="w-4 h-4 mr-2" />
              Add to Library
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => onDuplicate(e as any)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => onDelete(e as any)} className="text-red-400">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Sortable Page Group Section Wrapper
function SortablePageGroupSection(props: PageGroupSectionProps & { activeId?: string | null; overId?: string | null }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `group:${props.group.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PageGroupSection
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        activeId={props.activeId}
        overId={props.overId}
      />
    </div>
  );
}

// Page Group Section Component
interface PageGroupSectionProps {
  group: PageGroup;
  pages: Page[];
  childGroups: PageGroup[];
  allPages: Page[];
  allGroups: PageGroup[];
  templates: Template[];
  channels: Channel[];
  selectedPage: Page | null;
  selectedPageIds: Set<string>;
  selectedGroupIds: Set<string>;
  isGroupSelected: boolean;
  currentPlaylist: { mode: string; defaultDuration?: number };
  currentIndex: number;
  isPlaying: boolean;
  editingGroupId: string | null;
  editingPageId: string | null;
  editingName: string;
  nestingLevel: number;
  loopFlatPages: Page[];
  loopCurrentIndex: number;
  queuedNextIndex?: number | null;
  onSelectPage: (page: Page) => void;
  onCheckToggle: (pageId: string, e: React.MouseEvent) => void;
  onGroupCheckToggle: (groupId: string, e: React.MouseEvent) => void;
  onDelete: (pageId: string, e: React.MouseEvent) => void;
  onDuplicate: (pageId: string, e: React.MouseEvent) => void;
  onAddToLibrary: (pageId: string, e: React.MouseEvent) => void;
  onChannelChange: (pageId: string, value: string | null) => void;
  onPlayIn: (page: Page, e: React.MouseEvent) => void;
  onPlayOut: (page: Page, e: React.MouseEvent) => void;
  onPlayNext?: (loopIndex: number) => void;
  onGroupPlayIn: (groupId: string, e: React.MouseEvent) => void;
  onGroupPlayOut: (groupId: string, e: React.MouseEvent) => void;
  onToggleCollapse: (groupId: string) => void;
  onStartEditGroup: (group: PageGroup) => void;
  onStartEditPage: (page: Page) => void;
  onEditNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  sensors: ReturnType<typeof useSensors>;
  onAirGroupIds: Set<string>;
}

// Droppable zone for groups to accept dragged items
function GroupDropZone({ groupId, isOver }: { groupId: string; isOver: boolean }) {
  const { setNodeRef } = useDroppable({
    id: `group-drop:${groupId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "py-2 text-center text-xs transition-colors border-2 border-dashed rounded mx-2 my-1",
        isOver
          ? "bg-cyan-500/20 border-cyan-500 text-cyan-500"
          : "bg-muted/20 border-muted-foreground/20 text-muted-foreground"
      )}
    >
      {isOver ? "Drop here" : "Drop to add"}
    </div>
  );
}

// Droppable zone for ungrouping pages (removing from group)
function UngroupDropZone({ isOver }: { isOver: boolean }) {
  const { setNodeRef } = useDroppable({
    id: 'ungroup-drop',
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "py-2 text-center text-xs transition-colors border-2 border-dashed rounded mx-2 my-1",
        isOver
          ? "bg-amber-500/20 border-amber-500 text-amber-500"
          : "bg-muted/20 border-muted-foreground/20 text-muted-foreground"
      )}
    >
      {isOver ? "Drop here" : "Drop to ungroup"}
    </div>
  );
}

function PageGroupSection({
  group,
  pages,
  childGroups,
  allPages,
  allGroups,
  templates,
  channels,
  selectedPage,
  selectedPageIds,
  selectedGroupIds,
  isGroupSelected,
  currentPlaylist,
  currentIndex,
  isPlaying,
  editingGroupId,
  editingPageId,
  editingName,
  nestingLevel,
  loopFlatPages,
  loopCurrentIndex,
  queuedNextIndex,
  onSelectPage,
  onCheckToggle,
  onGroupCheckToggle,
  onPlayNext,
  onDelete,
  onDuplicate,
  onAddToLibrary,
  onChannelChange,
  onPlayIn,
  onPlayOut,
  onGroupPlayIn,
  onGroupPlayOut,
  onToggleCollapse,
  onStartEditGroup,
  onStartEditPage,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  sensors,
  onAirGroupIds,
  dragHandleProps,
  isDragging,
  activeId,
  overId,
}: PageGroupSectionProps & { dragHandleProps?: any; isDragging?: boolean; activeId?: string | null; overId?: string | null }) {
  const isEditing = editingGroupId === group.id;
  const isDropTarget = overId === `group-drop:${group.id}`;
  const isGroupOnAir = onAirGroupIds.has(group.id);

  // Calculate total items count (pages + child groups)
  const totalItems = pages.length + childGroups.length;

  return (
    <div className={cn("border-b border-border/50 group/section", isDragging && "opacity-30")}>
      {/* Group Header */}
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-2 bg-muted/40 cursor-pointer hover:bg-muted/60",
          isGroupSelected && "bg-cyan-500/10",
          isDropTarget && "bg-cyan-500/20"
        )}
        onClick={() => onToggleCollapse(group.id)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEditGroup(group);
        }}
      >
        {/* Group Checkbox */}
        <div onClick={(e) => onGroupCheckToggle(group.id, e)}>
          <input
            type="checkbox"
            checked={isGroupSelected}
            onChange={() => {}}
            className="w-3 h-3 rounded border-border accent-cyan-500 cursor-pointer"
          />
        </div>

        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Nesting level indentation - only affects the content after checkbox/drag handle */}
        {nestingLevel > 0 && <div style={{ width: `${nestingLevel * 16}px` }} />}

        {group.isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
        <Folder
          className="w-4 h-4"
          style={{ color: group.color || 'var(--muted-foreground)' }}
        />
        {isEditing ? (
          <Input
            autoFocus
            value={editingName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            onBlur={onSaveEdit}
            onClick={(e) => e.stopPropagation()}
            className="h-6 text-sm py-0 px-1 w-32"
          />
        ) : (
          <span className="text-sm font-medium">{group.name}</span>
        )}
        <span className="text-xs text-muted-foreground">({totalItems})</span>

        {/* Spacer to align with page row columns */}
        <div className="flex-1" />

        {/* Empty layer column spacer (w-32 to match header) */}
        <div className="w-32 shrink-0" />

        {/* Empty channel column spacer (w-20) */}
        <div className="w-20 shrink-0" />

        {/* Play In All / Play Out All buttons - aligned with page controls column (w-16) */}
        <div className="w-16 shrink-0 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-6 w-6",
              isGroupOnAir
                ? "text-green-400 bg-green-500/20 ring-1 ring-green-500/50"
                : "text-green-500 hover:text-green-400 hover:bg-green-500/10"
            )}
            onClick={(e) => onGroupPlayIn(group.id, e)}
            title={isGroupOnAir ? "On Air" : "Play In All"}
          >
            <Play className="w-3 h-3 fill-current" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-6 w-6",
              isGroupOnAir
                ? "text-red-400 hover:text-red-300 hover:bg-red-500/20"
                : "text-red-500/50 hover:text-red-400 hover:bg-red-500/10"
            )}
            onClick={(e) => onGroupPlayOut(group.id, e)}
            title="Play Out All"
          >
            <Square className="w-3 h-3 fill-current" />
          </Button>
        </div>

        {/* Group Actions Menu (w-8) */}
        <div className="w-8 shrink-0 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={async (e) => {
                e.stopPropagation();
                const { duplicatePageGroup } = usePageStore.getState();
                await duplicatePageGroup(group.id);
              }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  const confirmed = await confirm({
                    title: 'Delete Group',
                    description: `Delete group "${group.name}" and all its pages? This action cannot be undone.`,
                    confirmText: 'Delete',
                    variant: 'destructive',
                  });
                  if (confirmed) {
                    const { deletePageGroup } = usePageStore.getState();
                    await deletePageGroup(group.id);
                  }
                }}
                className="text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Drop zone - shows below header when dragging, regardless of collapsed state */}
      {activeId && activeId !== `group:${group.id}` && (
        <GroupDropZone groupId={group.id} isOver={isDropTarget} />
      )}

      {/* Group Contents (pages and child groups) */}
      {!group.isCollapsed && (
        <div>
          {/* Child Groups */}
          {childGroups.map((childGroup) => {
            const childGroupPages = allPages.filter(p => p.pageGroupId === childGroup.id);
            const grandchildGroups = allGroups.filter(g => g.parentGroupId === childGroup.id);

            return (
              <SortablePageGroupSection
                key={childGroup.id}
                group={childGroup}
                pages={childGroupPages}
                childGroups={grandchildGroups}
                allPages={allPages}
                allGroups={allGroups}
                templates={templates}
                channels={channels}
                selectedPage={selectedPage}
                selectedPageIds={selectedPageIds}
                selectedGroupIds={selectedGroupIds}
                isGroupSelected={selectedGroupIds.has(childGroup.id)}
                currentPlaylist={currentPlaylist}
                currentIndex={currentIndex}
                isPlaying={isPlaying}
                editingGroupId={editingGroupId}
                editingPageId={editingPageId}
                editingName={editingName}
                nestingLevel={nestingLevel + 1}
                loopFlatPages={loopFlatPages}
                loopCurrentIndex={loopCurrentIndex}
                queuedNextIndex={queuedNextIndex}
                onSelectPage={onSelectPage}
                onCheckToggle={onCheckToggle}
                onGroupCheckToggle={onGroupCheckToggle}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onAddToLibrary={onAddToLibrary}
                onChannelChange={onChannelChange}
                onPlayIn={onPlayIn}
                onPlayOut={onPlayOut}
                onGroupPlayIn={onGroupPlayIn}
                onGroupPlayOut={onGroupPlayOut}
                onToggleCollapse={onToggleCollapse}
                onStartEditGroup={onStartEditGroup}
                onStartEditPage={onStartEditPage}
                onEditNameChange={onEditNameChange}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                sensors={sensors}
                onAirGroupIds={onAirGroupIds}
                activeId={activeId}
                overId={overId}
                onPlayNext={onPlayNext}
              />
            );
          })}

          {/* Pages */}
          {pages.map((page) => {
            const template = templates.find((t) => t.id === page.templateId);
            const channel = page.channelId ? channels.find((c) => c.id === page.channelId) : undefined;
            const pageIndex = allPages.indexOf(page);
            const loopIndex = loopFlatPages.findIndex((p) => p.id === page.id);
            // Use queued index if set, otherwise natural next
            const effectiveNextIndex = queuedNextIndex !== null && queuedNextIndex !== undefined
              ? queuedNextIndex
              : (loopCurrentIndex + 1) % loopFlatPages.length;

            return (
              <SortablePageRow
                key={page.id}
                page={page}
                template={template}
                channel={channel}
                isSelected={selectedPage?.id === page.id}
                isChecked={selectedPageIds.has(page.id)}
                isCurrentInPlayback={currentPlaylist.mode === 'timed' && pageIndex === currentIndex}
                isPlaying={isPlaying}
                isEditing={editingPageId === page.id}
                editingName={editingName}
                isOnAir={page.isOnAir}
                nestingLevel={nestingLevel + 1}
                isCurrentInLoop={currentPlaylist.mode === 'loop' && loopIndex === loopCurrentIndex}
                isNextInLoop={currentPlaylist.mode === 'loop' && loopFlatPages.length > 1 && loopIndex === effectiveNextIndex}
                isLoopMode={currentPlaylist.mode === 'loop'}
                loopIndex={loopIndex}
                defaultDuration={currentPlaylist.defaultDuration}
                onSelect={() => onSelectPage(page)}
                onCheckToggle={(e) => onCheckToggle(page.id, e)}
                onDelete={(e) => onDelete(page.id, e)}
                onDuplicate={(e) => onDuplicate(page.id, e)}
                onAddToLibrary={(e) => onAddToLibrary(page.id, e)}
                onChannelChange={(value) => onChannelChange(page.id, value)}
                onPlayIn={(e) => onPlayIn(page, e)}
                onPlayOut={(e) => onPlayOut(page, e)}
                onPlayNext={onPlayNext}
                onStartEdit={() => onStartEditPage(page)}
                onEditNameChange={onEditNameChange}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                channels={channels}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
