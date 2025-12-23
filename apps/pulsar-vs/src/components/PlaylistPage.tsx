// PlaylistPage - Playlist management interface
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  DialogFooter,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Search,
  Plus,
  Play,
  Pause,
  Square,
  SkipForward,
  Trash2,
  Loader2,
  RefreshCw,
  GripVertical,
  MoreVertical,
  Edit,
  FileText,
  Folder,
  Image,
  Clock,
  ListMusic,
  ChevronRight,
  X,
  Check,
  Settings,
  Copy,
  Calendar,
  CalendarDays,
  CalendarX,
  Ban,
  CircleDot,
  ChevronDown,
  Tv,
  Sparkles,
  Wand2,
  Sun,
  Moon,
  Coffee,
  Utensils,
  Zap,
  BarChart3,
  PieChart,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  Timer,
  Users,
  Activity,
  ThumbsUp,
  ThumbsDown,
  Gauge,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useProject } from './ProjectContext';
import { sendCommandToUnreal } from '../services/unreal/commandService';
import * as playlistService from '../services/supabase/playlistService';
import type {
  Playlist,
  PlaylistItem,
  PlaylistWithItems,
  PlaylistItemType,
  CreatePlaylistParams,
  AddPlaylistItemParams,
  ScheduleConfig,
  DayOfWeek,
  TimeRange,
  ScheduleRuleType,
} from '../types/playlist';
import { ITEM_TYPE_COLORS } from '../types/playlist';
import type { Channel } from '../types/channels';
import { PlaylistCalendar } from './PlaylistCalendar';
import { createLocalSamplePlaylist, createSampleScheduledPlaylist } from '../services/samplePlaylistService';
import {
  fetchPulsarVSProviders,
  generateTextViaBackend,
} from '../types/aiImageGen';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Item type icon component
function ItemTypeIcon({ type, className = "h-4 w-4" }: { type: PlaylistItemType; className?: string }) {
  switch (type) {
    case 'page':
      return <FileText className={className} />;
    case 'group':
      return <Folder className={className} />;
    case 'media':
      return <Image className={className} />;
    default:
      return <FileText className={className} />;
  }
}

// Format duration for display
function formatDuration(seconds: number): string {
  if (seconds === 0) return 'Manual';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// Format scheduled time
function formatScheduledTime(time: string | undefined): string {
  if (!time) return '-';
  const date = new Date(time);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ContentItem {
  id: string;
  name: string;
  description?: string;
  backdrop_url?: string;
  folder_id?: string;
}

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
}

// Extended PlaylistItem with additional fields from new schema
interface ExtendedPlaylistItem extends PlaylistItem {
  folder_id?: string;
  parent_item_id?: string | null;
  nested_count?: number;
}

interface MediaAsset {
  id: string;
  name: string;
  file_url: string;
  thumbnail_url?: string;
  media_type: string;
}

import { useKeyboardShortcuts, type KeyboardShortcut, type ShortcutActions } from '../hooks/useKeyboardShortcuts';

interface PlaylistPageProps {
  shortcuts?: KeyboardShortcut[];
}

export default function PlaylistPage({ shortcuts: externalShortcuts }: PlaylistPageProps) {
  const { t } = useTranslation('playlist');
  const { activeProject } = useProject();

  // Playlists state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistWithItems | null>(null);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Selected items state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Focused item for Play In (single row selection)
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);

  // Content library state (for adding pages)
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Folders state (for adding groups)
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);

  // Media library state
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  // Dialog states
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [editPlaylistOpen, setEditPlaylistOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [deletePlaylistOpen, setDeletePlaylistOpen] = useState(false);
  const [deleteItemsOpen, setDeleteItemsOpen] = useState(false);
  const [batchChannelOpen, setBatchChannelOpen] = useState(false);
  const [batchDurationOpen, setBatchDurationOpen] = useState(false);
  const [batchChannelValue, setBatchChannelValue] = useState<string>('');
  const [batchDurationValue, setBatchDurationValue] = useState<number>(10);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedulingItem, setSchedulingItem] = useState<PlaylistItem | null>(null);

  // Inline editing states
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  const [editingDurationValue, setEditingDurationValue] = useState<number>(0);

  // Form states
  const [playlistForm, setPlaylistForm] = useState<CreatePlaylistParams>({
    name: '',
    description: '',
    loop_enabled: false,
  });
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
  const [itemForm, setItemForm] = useState({
    channel_id: '',
    duration: 10,
    scheduled_time: '',
    new_media_id: '' as string | null,
  });

  // Media replacement state for edit dialog
  const [replaceMediaSearch, setReplaceMediaSearch] = useState('');
  const [replaceMediaAssets, setReplaceMediaAssets] = useState<MediaAsset[]>([]);
  const [isLoadingReplaceMedia, setIsLoadingReplaceMedia] = useState(false);
  const [showReplaceMedia, setShowReplaceMedia] = useState(false);
  const [replaceMediaPage, setReplaceMediaPage] = useState(1);
  const REPLACE_MEDIA_PAGE_SIZE = 20;

  // Add item form - now supports multi-select
  const [addItemType, setAddItemType] = useState<PlaylistItemType>('page');
  const [addItemSearch, setAddItemSearch] = useState('');
  const [selectedContentIds, setSelectedContentIds] = useState(() => new Set<string>());
  const [selectedMediaIds, setSelectedMediaIds] = useState(() => new Set<string>());

  // Active tab for pages view
  const [activeTab, setActiveTab] = useState('all');

  // Submitting states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default channel for new items without channel assignment
  const [defaultChannelId, setDefaultChannelId] = useState<string>('');

  // Play state - track last played item for visual feedback
  const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);

  // Playback control state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState<number>(-1);
  const [playbackTimer, setPlaybackTimer] = useState<NodeJS.Timeout | null>(null);

  // Ref to track isPaused state for use in timeouts (avoids stale closure)
  const isPausedRef = React.useRef(isPaused);
  React.useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Ref for playNextItem to avoid stale closure in setTimeout
  const playNextItemRef = React.useRef<() => Promise<void>>(() => Promise.resolve());

  // Calendar panel state
  const [showCalendar, setShowCalendar] = useState(false);
  const [isCreatingSamplePlaylist, setIsCreatingSamplePlaylist] = useState(false);
  const [calendarWidth, setCalendarWidth] = useState(() => Math.round(window.innerWidth * 0.45)); // Default 45% of screen
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Playlist-level schedule state
  const [playlistScheduleModalOpen, setPlaylistScheduleModalOpen] = useState(false);
  const [playlistScheduleForm, setPlaylistScheduleForm] = useState<ScheduleConfig>({
    enabled: false,
    ruleType: 'daily',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    timeWindows: [{ start: '09:00', end: '17:00' }],
    exclusionDates: [],
    exclusionTimes: [],
    priority: 1,
    customRules: [],
  });

  // Schedule form state
  const defaultScheduleConfig: ScheduleConfig = {
    enabled: true,
    ruleType: 'daily',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    timeWindows: [{ start: '09:00', end: '17:00' }],
    exclusionDates: [],
    exclusionTimes: [],
    priority: 1,
    customRules: [],
  };
  const [scheduleForm, setScheduleForm] = useState<ScheduleConfig>(defaultScheduleConfig);

  // Group expansion state
  const [expandedGroups, setExpandedGroups] = useState(() => new Set<string>());
  const [nestedItems, setNestedItems] = useState<Record<string, PlaylistItem[]>>({});
  const [loadingNestedItems, setLoadingNestedItems] = useState(() => new Set<string>());

  // Media preview state
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false);
  const [previewingMedia, setPreviewingMedia] = useState<PlaylistItem | null>(null);
  const [showPreviewReplaceMedia, setShowPreviewReplaceMedia] = useState(false);
  const [previewReplaceMediaPage, setPreviewReplaceMediaPage] = useState(1);
  const [previewSelectedMediaId, setPreviewSelectedMediaId] = useState<string | null>(null);

  // AI Insights state
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiInsightsResponse, setAiInsightsResponse] = useState<string>('');
  const [selectedInsightType, setSelectedInsightType] = useState<string>('');

  // ============================================
  // DATA LOADING
  // ============================================

  const loadPlaylists = useCallback(async () => {
    if (!activeProject?.id) {
      setPlaylists([]);
      return;
    }
    setIsLoadingPlaylists(true);
    try {
      const result = await playlistService.getPlaylists(activeProject.id);
      if (result.success && result.data) {
        setPlaylists(result.data);
      } else {
        throw new Error(result.error || 'Failed to load playlists');
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
      toast.error('Failed to load playlists');
    } finally {
      setIsLoadingPlaylists(false);
    }
  }, [activeProject?.id]);

  const loadPlaylistItems = useCallback(async (playlistId: string) => {
    setIsLoadingItems(true);
    try {
      const result = await playlistService.getPlaylist(playlistId);

      if (!result.success) throw new Error(result.error);
      if (result.data) {
        setSelectedPlaylist({
          ...result.data,
          items: (result.data as any).items || [],
        });
        // Load saved default channel for this playlist
        const savedChannel = localStorage.getItem(`playlist_default_channel_${playlistId}`);
        if (savedChannel) {
          setDefaultChannelId(savedChannel);
        } else {
          setDefaultChannelId('');
        }
        // Clear expanded groups when switching playlists
        setExpandedGroups(new Set());
        setNestedItems({});
      }
    } catch (error) {
      console.error('Error loading playlist items:', error);
      toast.error('Failed to load playlist items');
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  const loadChannels = useCallback(async () => {
    setIsLoadingChannels(true);
    try {
      // supabaseUrl is defined at the top of the file
      const response = await fetch(`${supabaseUrl}/functions/v1/channels`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      if (data.ok && data.channels) {
        setChannels(data.channels);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setIsLoadingChannels(false);
    }
  }, []);

  const loadContent = useCallback(async () => {
    if (!activeProject) {
      setContentItems([]);
      setIsLoadingContent(false);
      return;
    }

    setIsLoadingContent(true);
    try {
      const { data, error } = await supabase.rpc('vs_content_list', {
        p_limit: 100,
        p_offset: 0,
        p_tags: null,
        p_search: addItemSearch || null,
        p_my_content_only: false,
        p_public_only: false,
        p_folder_id: null,
        p_project_id: activeProject.id,
      });

      if (error) throw error;
      if (data?.success && data.data) {
        setContentItems(data.data);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setIsLoadingContent(false);
    }
  }, [activeProject, addItemSearch]);

  const loadMedia = useCallback(async () => {
    setIsLoadingMedia(true);
    try {
      // supabaseUrl is defined at the top of the file
      const response = await fetch(
        `${supabaseUrl}/functions/v1/media-library?limit=100&search=${encodeURIComponent(addItemSearch)}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (data.data) {
        setMediaAssets(data.data);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setIsLoadingMedia(false);
    }
  }, [addItemSearch]);

  // Load media for replacement search in edit dialog
  const loadReplaceMedia = useCallback(async () => {
    setIsLoadingReplaceMedia(true);
    try {
      // supabaseUrl is defined at the top of the file
      const response = await fetch(
        `${supabaseUrl}/functions/v1/media-library?limit=100&search=${encodeURIComponent(replaceMediaSearch)}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (data.data) {
        setReplaceMediaAssets(data.data);
      }
    } catch (error) {
      console.error('Error loading replacement media:', error);
    } finally {
      setIsLoadingReplaceMedia(false);
    }
  }, [replaceMediaSearch]);

  // Effect to load replacement media when search changes
  useEffect(() => {
    if (showReplaceMedia) {
      const debounce = setTimeout(() => {
        loadReplaceMedia();
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [replaceMediaSearch, showReplaceMedia, loadReplaceMedia]);

  const loadFolders = useCallback(async () => {
    setIsLoadingFolders(true);
    try {
      const { data, error } = await supabase.rpc('vs_content_folder_list');
      if (error) throw error;
      if (data?.success && data.data) {
        // Filter folders by search if needed
        const filtered = addItemSearch
          ? data.data.filter((f: FolderItem) => f.name.toLowerCase().includes(addItemSearch.toLowerCase()))
          : data.data;
        setFolders(filtered);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setIsLoadingFolders(false);
    }
  }, [addItemSearch]);

  // Initial load
  useEffect(() => {
    loadPlaylists();
    loadChannels();
  }, [loadPlaylists, loadChannels]);

  // Auto-open first playlist when playlists are loaded
  useEffect(() => {
    if (playlists.length > 0 && !selectedPlaylist) {
      loadPlaylistItems(playlists[0].id);
    }
  }, [playlists, selectedPlaylist, loadPlaylistItems]);

  // Load content/media/folders when add dialog opens
  useEffect(() => {
    if (addItemOpen) {
      if (addItemType === 'media') {
        loadMedia();
      } else if (addItemType === 'group') {
        loadFolders();
      } else {
        loadContent();
      }
    }
  }, [addItemOpen, addItemType, loadContent, loadMedia, loadFolders]);

  // ============================================
  // GROUP EXPANSION
  // ============================================

  // Toggle group expansion and load nested items
  const toggleGroupExpansion = useCallback(async (groupId: string) => {
    if (expandedGroups.has(groupId)) {
      // Collapse the group
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    } else {
      // Expand the group and load nested items if not already loaded
      setExpandedGroups(prev => new Set(prev).add(groupId));

      if (!nestedItems[groupId]) {
        setLoadingNestedItems(prev => new Set(prev).add(groupId));
        try {
          const result = await playlistService.getNestedItems(groupId);

          if (!result.success) throw new Error(result.error);
          if (result.data) {
            setNestedItems(prev => ({ ...prev, [groupId]: result.data! }));
          }
        } catch (error) {
          console.error('Error loading nested items:', error);
          toast.error('Failed to load group items');
        } finally {
          setLoadingNestedItems(prev => {
            const next = new Set(prev);
            next.delete(groupId);
            return next;
          });
        }
      }
    }
  }, [expandedGroups, nestedItems]);

  // ============================================
  // PLAYLIST CRUD
  // ============================================

  const handleCreatePlaylist = async () => {
    if (!playlistForm.name.trim()) {
      toast.error('Playlist name is required');
      return;
    }

    if (!activeProject?.id) {
      toast.error('No active project selected');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await playlistService.createPlaylist({
        name: playlistForm.name,
        description: playlistForm.description || undefined,
        project_id: activeProject.id,
        loop_enabled: playlistForm.loop_enabled,
      });

      if (result.success) {
        toast.success('Playlist created');
        setCreatePlaylistOpen(false);
        setPlaylistForm({ name: '', description: '', loop_enabled: false });
        loadPlaylists();
      } else {
        throw new Error(result.error || 'Failed to create playlist');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePlaylist = async () => {
    if (!selectedPlaylist || !playlistForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await playlistService.updatePlaylist({
        id: selectedPlaylist.id,
        name: playlistForm.name,
        description: playlistForm.description || undefined,
        loop_enabled: playlistForm.loop_enabled,
      });

      if (result.success) {
        toast.success('Playlist updated');
        setEditPlaylistOpen(false);
        loadPlaylists();
        loadPlaylistItems(selectedPlaylist.id);
      } else {
        throw new Error(result.error || 'Failed to update playlist');
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Failed to update playlist');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist) return;

    setIsSubmitting(true);
    try {
      const result = await playlistService.deletePlaylist(selectedPlaylist.id);

      if (result.success) {
        toast.success('Playlist deleted');
        setDeletePlaylistOpen(false);
        setSelectedPlaylist(null);
        loadPlaylists();
      } else {
        throw new Error(result.error || 'Failed to delete playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // PLAYLIST ITEMS CRUD
  // ============================================

  // Helper to check if item already exists in playlist
  const isItemInPlaylist = useCallback((contentId: string | null, mediaId: string | null, folderId: string | null): boolean => {
    if (!selectedPlaylist) return false;
    return selectedPlaylist.items.some(item => {
      if (contentId && item.content_id === contentId) return true;
      if (mediaId && item.media_id === mediaId) return true;
      if (folderId && (item as any).folder_id === folderId) return true;
      return false;
    });
  }, [selectedPlaylist]);

  // Helper to fetch pages within a folder
  const fetchPagesInFolder = async (folderId: string): Promise<ContentItem[]> => {
    if (!activeProject) return [];
    try {
      const { data, error } = await supabase.rpc('vs_content_list', {
        p_limit: 100,
        p_offset: 0,
        p_tags: null,
        p_search: null,
        p_my_content_only: false,
        p_public_only: false,
        p_folder_id: folderId,
        p_project_id: activeProject.id,
      });
      if (error) throw error;
      return data?.success && data.data ? data.data : [];
    } catch (error) {
      console.error('Error fetching pages in folder:', error);
      return [];
    }
  };

  const handleAddItem = async () => {
    if (!selectedPlaylist) return;

    // Get items to add based on type
    const itemsToAdd: Array<{ id: string; name: string; type: 'content' | 'media' | 'folder'; nestedPages?: ContentItem[] }> = [];
    let skippedDuplicates = 0;

    if (addItemType === 'media') {
      for (const id of selectedMediaIds) {
        const media = mediaAssets.find(m => m.id === id);
        if (media) {
          // Check for duplicate
          if (isItemInPlaylist(null, id, null)) {
            skippedDuplicates++;
            continue;
          }
          itemsToAdd.push({ id, name: media.name, type: 'media' });
        }
      }
    } else if (addItemType === 'group') {
      for (const id of selectedContentIds) {
        const folder = folders.find(f => f.id === id);
        if (folder) {
          // Check for duplicate folder
          if (isItemInPlaylist(null, null, id)) {
            skippedDuplicates++;
            continue;
          }
          // Fetch nested pages for this folder
          const nestedPages = await fetchPagesInFolder(id);
          itemsToAdd.push({ id, name: folder.name, type: 'folder', nestedPages });
        }
      }
    } else {
      // Page type
      for (const id of selectedContentIds) {
        const content = contentItems.find(c => c.id === id);
        if (content) {
          // Check for duplicate
          if (isItemInPlaylist(id, null, null)) {
            skippedDuplicates++;
            continue;
          }
          itemsToAdd.push({ id, name: content.name, type: 'content' });
        }
      }
    }

    if (itemsToAdd.length === 0) {
      if (skippedDuplicates > 0) {
        toast.warning(`${skippedDuplicates} item(s) already in playlist`);
      } else {
        toast.error('Please select at least one item to add');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      let addedCount = 0;
      for (const item of itemsToAdd) {
        if (item.type === 'folder') {
          // Add the group first
          const groupResult = await playlistService.addPlaylistItem({
            playlist_id: selectedPlaylist.id,
            item_type: 'group',
            name: item.name,
            folder_id: item.id,
            channel_id: itemForm.channel_id || undefined,
            duration: itemForm.duration,
            scheduled_time: itemForm.scheduled_time || undefined,
            metadata: {},
          });

          if (!groupResult.success) throw new Error(groupResult.error);
          addedCount++;
          const groupId = groupResult.data?.id;

          // Add nested pages under the group
          if (groupId && item.nestedPages && item.nestedPages.length > 0) {
            for (const page of item.nestedPages) {
              await playlistService.addPlaylistItem({
                playlist_id: selectedPlaylist.id,
                item_type: 'page',
                name: page.name,
                content_id: page.id,
                channel_id: itemForm.channel_id || undefined,
                duration: itemForm.duration,
                parent_item_id: groupId,
              });
            }
          }
        } else {
          // Regular page or media
          const result = await playlistService.addPlaylistItem({
            playlist_id: selectedPlaylist.id,
            item_type: addItemType,
            name: item.name,
            content_id: item.type === 'content' ? item.id : undefined,
            media_id: item.type === 'media' ? item.id : undefined,
            channel_id: itemForm.channel_id || undefined,
            duration: itemForm.duration,
            scheduled_time: itemForm.scheduled_time || undefined,
            metadata: {},
          });

          if (!result.success) throw new Error(result.error);
          addedCount++;
        }
      }

      let message = `${addedCount} item(s) added to playlist`;
      if (skippedDuplicates > 0) {
        message += ` (${skippedDuplicates} duplicate(s) skipped)`;
      }
      toast.success(message);
      setAddItemOpen(false);
      setSelectedContentIds(new Set());
      setSelectedMediaIds(new Set());
      setItemForm({ channel_id: '', duration: 10, scheduled_time: '' });
      loadPlaylistItems(selectedPlaylist.id);
    } catch (error) {
      console.error('Error adding items:', error);
      toast.error('Failed to add items');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    setIsSubmitting(true);
    try {
      // Build update params
      const updateParams: {
        id: string;
        channel_id?: string;
        duration?: number;
        name?: string;
        metadata?: Record<string, unknown>;
      } = {
        id: editingItem.id,
        channel_id: itemForm.channel_id || undefined,
        duration: itemForm.duration,
      };

      // Include name if replacing media
      if (itemForm.new_media_id) {
        const newMedia = replaceMediaAssets.find(m => m.id === itemForm.new_media_id);
        if (newMedia) {
          updateParams.name = newMedia.name;
        }
      }

      const result = await playlistService.updatePlaylistItem(updateParams);

      if (!result.success) throw new Error(result.error);
      toast.success(itemForm.new_media_id ? 'Media replaced successfully' : 'Item updated');
      setEditItemOpen(false);
      setEditingItem(null);
      setShowReplaceMedia(false);
      if (selectedPlaylist) {
        loadPlaylistItems(selectedPlaylist.id);
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle replacing media from the preview modal
  const handlePreviewReplaceMedia = async () => {
    if (!previewingMedia || !previewSelectedMediaId) return;

    setIsSubmitting(true);
    try {
      // Find the new media name
      const newMedia = replaceMediaAssets.find(m => m.id === previewSelectedMediaId);

      const result = await playlistService.updatePlaylistItem({
        id: previewingMedia.id,
        name: newMedia?.name || previewingMedia.name,
      });

      if (!result.success) throw new Error(result.error);
      toast.success('Media replaced successfully');
      setMediaPreviewOpen(false);
      setPreviewingMedia(null);
      setShowPreviewReplaceMedia(false);
      setPreviewSelectedMediaId(null);
      if (selectedPlaylist) {
        loadPlaylistItems(selectedPlaylist.id);
      }
    } catch (error) {
      console.error('Error replacing media:', error);
      toast.error('Failed to replace media');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItems = async () => {
    if (selectedItems.size === 0) return;

    setIsSubmitting(true);
    try {
      const itemIds = Array.from(selectedItems);
      const result = await playlistService.deletePlaylistItems(itemIds);

      if (!result.success) throw new Error(result.error);
      toast.success(`${result.deleted_count || itemIds.length} item(s) deleted`);
      setDeleteItemsOpen(false);
      setSelectedItems(new Set());
      if (selectedPlaylist) {
        loadPlaylistItems(selectedPlaylist.id);
      }
    } catch (error) {
      console.error('Error deleting items:', error);
      toast.error('Failed to delete items');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReorderItems = async (newOrder: PlaylistItem[]) => {
    if (!selectedPlaylist) return;

    // Optimistic update
    setSelectedPlaylist({
      ...selectedPlaylist,
      items: newOrder,
    });

    try {
      const itemOrders = newOrder.map((item, index) => ({ id: item.id, sort_order: index }));
      const result = await playlistService.reorderPlaylistItems({
        playlist_id: selectedPlaylist.id,
        item_orders: itemOrders,
      });

      if (!result.success) throw new Error(result.error);
    } catch (error) {
      console.error('Error reordering items:', error);
      toast.error('Failed to reorder items');
      // Reload to restore correct order
      loadPlaylistItems(selectedPlaylist.id);
    }
  };

  // Reorder playlists in the list (local only - visual reorder)
  const handleReorderPlaylists = (newOrder: Playlist[]) => {
    setPlaylists(newOrder);
  };

  // Group selected items into a new group
  const handleGroupSelectedItems = async () => {
    if (!selectedPlaylist || selectedItems.size < 2) {
      toast.error('Select at least 2 items to group');
      return;
    }

    const groupName = prompt('Enter group name:');
    if (!groupName?.trim()) return;

    setIsSubmitting(true);
    try {
      const itemIds = Array.from(selectedItems);
      const result = await playlistService.groupPlaylistItems({
        playlist_id: selectedPlaylist.id,
        item_ids: itemIds,
        group_name: groupName.trim(),
      });

      if (result.success) {
        toast.success(`Created group "${groupName}" with ${itemIds.length} items`);
        setSelectedItems(new Set());
        loadPlaylistItems(selectedPlaylist.id);
      } else {
        throw new Error(result.error || 'Failed to group items');
      }
    } catch (error) {
      console.error('Error grouping items:', error);
      toast.error('Failed to group items');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch change channel for selected items
  const handleBatchChannelChange = async () => {
    if (!selectedPlaylist || selectedItems.size === 0) return;

    setIsSubmitting(true);
    try {
      const itemIds = Array.from(selectedItems);
      const channelId = batchChannelValue === 'none' ? '' : batchChannelValue;
      const result = await playlistService.setItemsChannel(itemIds, channelId);

      if (result.success) {
        toast.success(`Updated channel for ${result.updated_count || itemIds.length} item(s)`);
        loadPlaylistItems(selectedPlaylist.id);
      } else {
        toast.error('Failed to update channels');
      }
      setBatchChannelOpen(false);
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Error batch updating channel:', error);
      toast.error('Failed to update channels');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch change duration for selected items
  const handleBatchDurationChange = async () => {
    if (!selectedPlaylist || selectedItems.size === 0) return;

    setIsSubmitting(true);
    try {
      const itemIds = Array.from(selectedItems);
      const result = await playlistService.setItemsDuration(itemIds, batchDurationValue);

      if (result.success) {
        toast.success(`Updated duration for ${result.updated_count || itemIds.length} item(s)`);
        loadPlaylistItems(selectedPlaylist.id);
      } else {
        toast.error('Failed to update durations');
      }
      setBatchDurationOpen(false);
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Error batch updating duration:', error);
      toast.error('Failed to update durations');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ungroup items (move nested items back to top level)
  const handleUngroupItems = async (groupId: string) => {
    setIsSubmitting(true);
    try {
      const result = await playlistService.ungroupPlaylistItems(groupId);

      if (result.success) {
        toast.success('Group dissolved, items moved to playlist');
        if (selectedPlaylist) {
          loadPlaylistItems(selectedPlaylist.id);
        }
      } else {
        throw new Error(result.error || 'Failed to ungroup items');
      }
    } catch (error) {
      console.error('Error ungrouping items:', error);
      toast.error('Failed to ungroup items');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update item channel inline
  const handleInlineChannelChange = async (itemId: string, channelId: string | null) => {
    try {
      const result = await playlistService.setItemsChannel([itemId], channelId || '');

      if (result.success) {
        const channelName = channelId ? channels.find(c => c.id === channelId)?.name : undefined;

        // Update local state optimistically - check both top-level and nested items
        if (selectedPlaylist) {
          // Check if it's a top-level item
          const isTopLevel = selectedPlaylist.items.some(item => item.id === itemId);

          if (isTopLevel) {
            const updatedItems = selectedPlaylist.items.map(item =>
              item.id === itemId
                ? { ...item, channel_id: channelId, channel_name: channelName }
                : item
            );
            setSelectedPlaylist({ ...selectedPlaylist, items: updatedItems });
          } else {
            // It's a nested item - update nestedItems state
            setNestedItems(prev => {
              const updated = { ...prev };
              for (const groupId of Object.keys(updated)) {
                updated[groupId] = updated[groupId].map(item =>
                  item.id === itemId
                    ? { ...item, channel_id: channelId, channel_name: channelName }
                    : item
                );
              }
              return updated;
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating channel:', error);
      toast.error('Failed to update channel');
    }
  };

  // Update item duration inline
  const handleInlineDurationChange = async (itemId: string, duration: number) => {
    try {
      const result = await playlistService.updatePlaylistItem({
        id: itemId,
        duration: duration,
      });

      if (result.success) {
        // Update local state optimistically
        if (selectedPlaylist) {
          const updatedItems = selectedPlaylist.items.map(item =>
            item.id === itemId ? { ...item, duration } : item
          );
          setSelectedPlaylist({ ...selectedPlaylist, items: updatedItems });
        }
        setEditingDurationId(null);
      }
    } catch (error) {
      console.error('Error updating duration:', error);
      toast.error('Failed to update duration');
    }
  };

  // Open schedule modal for an item
  const handleOpenScheduleModal = (item: PlaylistItem) => {
    setSchedulingItem(item);
    // Load existing schedule config from metadata or use defaults
    const existingConfig = item.metadata?.schedule_config as ScheduleConfig | undefined;
    if (existingConfig) {
      setScheduleForm(existingConfig);
    } else {
      setScheduleForm(defaultScheduleConfig);
    }
    setScheduleModalOpen(true);
  };

  // Save schedule configuration
  const handleSaveSchedule = async () => {
    if (!schedulingItem) return;

    setIsSubmitting(true);
    try {
      // Save schedule config to metadata
      const updatedMetadata = {
        ...(schedulingItem.metadata || {}),
        schedule_config: scheduleForm,
      };

      const result = await playlistService.updatePlaylistItem({
        id: schedulingItem.id,
        metadata: updatedMetadata,
      });

      if (result.success) {
        toast.success('Schedule saved');
        setScheduleModalOpen(false);
        setSchedulingItem(null);
        if (selectedPlaylist) {
          loadPlaylistItems(selectedPlaylist.id);
        }
        // Refresh content library
        loadContent();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add time window to schedule
  const addTimeWindow = () => {
    setScheduleForm({
      ...scheduleForm,
      timeWindows: [...(scheduleForm.timeWindows || []), { start: '09:00', end: '17:00' }],
    });
  };

  // Remove time window from schedule
  const removeTimeWindow = (index: number) => {
    setScheduleForm({
      ...scheduleForm,
      timeWindows: scheduleForm.timeWindows?.filter((_, i) => i !== index) || [],
    });
  };

  // Add exclusion time window
  const addExclusionTime = () => {
    setScheduleForm({
      ...scheduleForm,
      exclusionTimes: [...(scheduleForm.exclusionTimes || []), { start: '12:00', end: '13:00' }],
    });
  };

  // Remove exclusion time window
  const removeExclusionTime = (index: number) => {
    setScheduleForm({
      ...scheduleForm,
      exclusionTimes: scheduleForm.exclusionTimes?.filter((_, i) => i !== index) || [],
    });
  };

  // Toggle day of week
  const toggleDayOfWeek = (day: DayOfWeek) => {
    const currentDays = scheduleForm.daysOfWeek || [];
    if (currentDays.includes(day)) {
      setScheduleForm({
        ...scheduleForm,
        daysOfWeek: currentDays.filter(d => d !== day),
      });
    } else {
      setScheduleForm({
        ...scheduleForm,
        daysOfWeek: [...currentDays, day],
      });
    }
  };

  // Add exclusion date
  const addExclusionDate = (date: string) => {
    if (!date) return;
    const currentDates = scheduleForm.exclusionDates || [];
    if (!currentDates.includes(date)) {
      setScheduleForm({
        ...scheduleForm,
        exclusionDates: [...currentDates, date],
      });
    }
  };

  // Remove exclusion date
  const removeExclusionDate = (date: string) => {
    setScheduleForm({
      ...scheduleForm,
      exclusionDates: scheduleForm.exclusionDates?.filter(d => d !== date) || [],
    });
  };

  // Format schedule summary for display
  const getScheduleSummary = (item: PlaylistItem): string => {
    const config = item.metadata?.schedule_config as ScheduleConfig | undefined;
    if (!config || !config.enabled) {
      return item.scheduled_time ? formatScheduledTime(item.scheduled_time) : t('status.notScheduled');
    }

    const parts: string[] = [];

    if (config.ruleType === 'daily') {
      parts.push(t('schedule.daily'));
    } else if (config.ruleType === 'weekly' && config.daysOfWeek?.length) {
      const dayAbbrevs = config.daysOfWeek.map(d => t(`schedule.dayAbbrev.${d}`)).join(', ');
      parts.push(dayAbbrevs);
    } else if (config.ruleType === 'date_range') {
      parts.push(t('schedule.dateRange'));
    } else if (config.ruleType === 'specific_dates') {
      parts.push(t('schedule.datesCount', { count: config.specificDates?.length || 0 }));
    }

    if (config.timeWindows?.length) {
      const firstWindow = config.timeWindows[0];
      parts.push(`${firstWindow.start}-${firstWindow.end}`);
    }

    return parts.join(' • ') || t('schedule.scheduled');
  };

  // Play a page item (send to Unreal Engine)
  const handlePlayItem = async (item: PlaylistItem) => {
    // Items with content_id can be played
    if (!item.content_id) {
      return;
    }

    console.log('🎬 Playing playlist item:', item.name);

    try {
      // Fetch full content data for this item
      const { data: contentData, error: contentError } = await supabase
        .from('vs_content')
        .select('*')
        .eq('id', item.content_id)
        .single();

      if (contentError || !contentData) {
        toast.error('Failed to load content data');
        console.error('Content fetch error:', contentError);
        return;
      }

      // Determine channel: item's channel > default channel > first active Unreal channel
      let channelName: string = '';
      const channelId = item.channel_id || defaultChannelId;

      if (channelId) {
        const channel = channels.find(c => c.id === channelId);
        if (channel?.name) {
          channelName = channel.name;
        }
      }

      if (!channelName) {
        // Fall back to first active Unreal channel
        const { data: channelsData, error: channelsError } = await supabase
          .from('channels')
          .select('*')
          .eq('type', 'Unreal')
          .eq('active', true)
          .limit(1)
          .single();

        if (channelsError || !channelsData) {
          toast.error('No active Unreal channel found. Please select a default channel.');
          console.error('Channel error:', channelsError);
          return;
        }
        channelName = channelsData.name;
      }

      console.log('📡 Using channel:', channelName);

      // Fetch object_path from pulsar_connections via get_instance_by_channel RPC
      let objectPath: string | null = null;
      const { data: instanceData, error: instanceError } = await supabase.rpc('get_instance_by_channel', {
        p_channel_name: channelName,
      });

      if (!instanceError && instanceData?.success && instanceData?.data) {
        objectPath = instanceData.data.object_path;
        console.log('📍 Object path from RPC:', objectPath);
      }

      // If not in RPC response, try fetching directly from pulsar_connections
      // Query by friendly_name since that matches the channel name from the channels table
      if (!objectPath) {
        const { data: connectionData } = await supabase
          .from('pulsar_connections')
          .select('object_path')
          .eq('friendly_name', channelName)
          .single();
        if (connectionData?.object_path) {
          objectPath = connectionData.object_path;
          console.log('📍 Object path from direct query:', objectPath);
        }
      }

      // Require object_path from database - no fallback to avoid version mismatches
      if (!objectPath) {
        console.error('❌ No object_path configured in pulsar_connections for channel:', channelName);
        toast.error('No object_path configured for this channel. Please configure it in pulsar_connections.');
        return;
      }

      // Detect project type from tags, project_type field, or scene_config fields
      const isAirport = contentData.project_type === 'Airport' ||
        contentData.tags?.includes('airport') ||
        (contentData.scene_config && ('timeOfDay' in contentData.scene_config || 'BaseDown' in contentData.scene_config));

      console.log('📋 Project type:', isAirport ? 'Airport' : 'VirtualSet');
      console.log('📍 Using object_path:', objectPath);

      if (isAirport) {
        // Airport: send scene parameters only
        const airportParams = contentData.scene_config || {};

        // Use ALL fields from scene_config dynamically
        const parameters: Record<string, string> = {};
        Object.entries(airportParams).forEach(([key, value]) => {
          if (key !== 'summary' && typeof value === 'string') {
            parameters[key] = value;
          }
        });

        const messageObject = {
          objectPath: objectPath,
          functionName: "ChangeScene",
          parameters,
        };
        console.log('✈️ Airport command:', messageObject);

        const result = await sendCommandToUnreal(channelName, messageObject);
        if (result.success) {
          toast.success(`"${item.name}" applied to Unreal Engine!`, {
            description: 'Airport configuration sent'
          });
          setLastPlayedId(item.id);
          console.log('✅ Airport command sent successfully');
        } else {
          toast.error('Failed to send configuration');
          console.error('❌ Command failed:', result.error);
        }
      } else {
        // VirtualSet: send scene parameters and backdrop as SEPARATE messages
        const vsParams = contentData.scene_config || {};

        // Use ALL fields from scene_config dynamically
        const parameters: Record<string, string> = {};
        Object.entries(vsParams).forEach(([key, value]) => {
          if (key !== 'summary' && typeof value === 'string') {
            parameters[key] = value;
          }
        });

        // Message 1: Scene configuration
        const sceneMessage = {
          objectPath: objectPath,
          functionName: "ChangeScene",
          parameters,
        };
        console.log('🏠 VirtualSet scene command:', sceneMessage);

        // Send scene config
        const sceneResult = await sendCommandToUnreal(channelName, sceneMessage);

        // Message 2: Backdrop image (separate command)
        let backdropResult = { success: true };
        if (contentData.backdrop_url) {
          // Wait 1 second before sending backdrop
          await new Promise(resolve => setTimeout(resolve, 1000));

          const backdropMessage = {
            objectPath: objectPath,
            functionName: "SetBackdropImage",
            parameters: { URL: contentData.backdrop_url }
          };
          console.log('🖼️ VirtualSet backdrop command:', backdropMessage);
          backdropResult = await sendCommandToUnreal(channelName, backdropMessage);
        }

        if (sceneResult.success && backdropResult.success) {
          toast.success(`"${item.name}" applied to Unreal Engine!`, {
            description: 'Scene and backdrop sent successfully'
          });
          setLastPlayedId(item.id);
          console.log('✅ VirtualSet commands sent successfully');
        } else if (sceneResult.success) {
          toast.warning('Partial success', {
            description: 'Scene sent, but backdrop failed'
          });
          setLastPlayedId(item.id);
        } else {
          toast.error('Failed to send configuration');
          console.error('❌ Command failed');
        }
      }
    } catch (error) {
      console.error('❌ Error in handlePlayItem:', error);
      toast.error('Failed to apply configuration: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // ============================================
  // PLAYLIST PLAYBACK CONTROLS
  // ============================================

  // Get playable items (items with content_id, including items inside groups)
  const getPlayableItems = useCallback(() => {
    if (!selectedPlaylist) return [];

    const playableItems: PlaylistItem[] = [];

    for (const item of selectedPlaylist.items) {
      if (item.content_id) {
        // Top-level item with content
        playableItems.push(item);
      } else if (item.item_type === 'group') {
        // Group - include nested playable items
        const nested = nestedItems[item.id] || [];
        for (const nestedItem of nested) {
          if (nestedItem.content_id) {
            playableItems.push(nestedItem);
          }
        }
      }
    }

    return playableItems;
  }, [selectedPlaylist, nestedItems]);

  // Play the next item in the playlist
  const playNextItem = useCallback(async () => {
    const playableItems = getPlayableItems();
    if (playableItems.length === 0) return;

    let nextIndex = currentPlayIndex + 1;

    // Handle looping or stopping at end
    if (nextIndex >= playableItems.length) {
      if (selectedPlaylist?.loop_enabled) {
        nextIndex = 0;
      } else {
        // End of playlist
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentPlayIndex(-1);
        if (playbackTimer) {
          clearTimeout(playbackTimer);
          setPlaybackTimer(null);
        }
        toast.info('Playlist finished');
        return;
      }
    }

    // Clear any existing timer before setting new one
    if (playbackTimer) {
      clearTimeout(playbackTimer);
      setPlaybackTimer(null);
    }

    setCurrentPlayIndex(nextIndex);
    const item = playableItems[nextIndex];
    await handlePlayItem(item);

    // Schedule next item based on duration (use ref to avoid stale closure)
    if (item.duration > 0) {
      console.log(`[Playlist] Playing "${item.name}" for ${item.duration}s, next index will be ${nextIndex + 1}`);
      const timer = setTimeout(() => {
        // Use refs to get current state and avoid stale closures
        if (!isPausedRef.current) {
          console.log(`[Playlist] Timer fired, calling playNextItemRef`);
          playNextItemRef.current();
        }
      }, item.duration * 1000);
      setPlaybackTimer(timer);
    } else {
      console.log(`[Playlist] Playing "${item.name}" - manual advance (duration: 0)`);
    }
  }, [currentPlayIndex, getPlayableItems, selectedPlaylist?.loop_enabled, playbackTimer]);

  // Keep playNextItemRef updated with the latest playNextItem function
  React.useEffect(() => {
    playNextItemRef.current = playNextItem;
  }, [playNextItem]);

  // Load nested items for all groups (for playback)
  const loadAllNestedItems = useCallback(async () => {
    if (!selectedPlaylist) return;

    const groups = selectedPlaylist.items.filter(item => item.item_type === 'group');
    const groupsToLoad = groups.filter(group => !nestedItems[group.id]);

    if (groupsToLoad.length === 0) return;

    console.log(`[Playlist] Loading nested items for ${groupsToLoad.length} groups`);

    await Promise.all(
      groupsToLoad.map(async (group) => {
        try {
          const result = await playlistService.getNestedItems(group.id);

          if (result.success && result.data) {
            setNestedItems(prev => ({ ...prev, [group.id]: result.data! }));
          }
        } catch (error) {
          console.error(`Error loading nested items for group ${group.id}:`, error);
        }
      })
    );
  }, [selectedPlaylist, nestedItems]);

  // Start playlist playback
  const handlePlayPlaylist = useCallback(async () => {
    // If paused, resume from current position
    if (isPaused && currentPlayIndex >= 0) {
      const playableItems = getPlayableItems();
      setIsPaused(false);
      setIsPlaying(true);
      const item = playableItems[currentPlayIndex];
      // Schedule next item if current has duration
      if (item.duration > 0) {
        console.log(`[Playlist] Resuming "${item.name}" - scheduling next in ${item.duration}s`);
        const timer = setTimeout(() => {
          // Use refs to get current state and avoid stale closures
          if (!isPausedRef.current) {
            playNextItemRef.current();
          }
        }, item.duration * 1000);
        setPlaybackTimer(timer);
      }
      toast.success('Playback resumed');
      return;
    }

    // Load all nested items from groups before starting playback
    await loadAllNestedItems();

    // Now get playable items (including freshly loaded nested items)
    // We need a small delay for state to update
    setTimeout(async () => {
      const playableItems = getPlayableItems();
      if (playableItems.length === 0) {
        toast.error('No playable items in playlist');
        return;
      }

      // Start fresh playback
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentPlayIndex(-1);

      // Play first item
      await playNextItem();
      toast.success('Playlist started');
    }, 100);
  }, [getPlayableItems, isPaused, currentPlayIndex, playNextItem, loadAllNestedItems]);

  // Pause playback
  const handlePausePlaylist = useCallback(() => {
    if (!isPlaying) return;
    setIsPaused(true);
    setIsPlaying(false);
    if (playbackTimer) {
      clearTimeout(playbackTimer);
      setPlaybackTimer(null);
    }
    toast.info('Playback paused');
  }, [isPlaying, playbackTimer]);

  // Stop playback completely
  const handleStopPlaylist = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentPlayIndex(-1);
    setLastPlayedId(null);
    if (playbackTimer) {
      clearTimeout(playbackTimer);
      setPlaybackTimer(null);
    }
    toast.info('Playback stopped');
  }, [playbackTimer]);

  // Skip to next item
  const handleSkipNext = useCallback(async () => {
    if (!isPlaying && !isPaused) return;
    if (playbackTimer) {
      clearTimeout(playbackTimer);
      setPlaybackTimer(null);
    }
    await playNextItem();
  }, [isPlaying, isPaused, playbackTimer, playNextItem]);

  // Select next item in playlist
  const handleSelectNext = useCallback(() => {
    if (!selectedPlaylist?.items?.length) return;
    const items = selectedPlaylist.items;
    if (!focusedItemId) {
      setFocusedItemId(items[0].id);
      return;
    }
    const currentIndex = items.findIndex(item => item.id === focusedItemId);
    if (currentIndex < items.length - 1) {
      setFocusedItemId(items[currentIndex + 1].id);
    }
  }, [selectedPlaylist?.items, focusedItemId]);

  // Select previous item in playlist
  const handleSelectPrevious = useCallback(() => {
    if (!selectedPlaylist?.items?.length) return;
    const items = selectedPlaylist.items;
    if (!focusedItemId) {
      setFocusedItemId(items[items.length - 1].id);
      return;
    }
    const currentIndex = items.findIndex(item => item.id === focusedItemId);
    if (currentIndex > 0) {
      setFocusedItemId(items[currentIndex - 1].id);
    }
  }, [selectedPlaylist?.items, focusedItemId]);

  // Play the focused/selected item (Play In)
  const handlePlayFocusedItem = useCallback(() => {
    if (!focusedItemId || !selectedPlaylist) return;
    const item = selectedPlaylist.items.find(i => i.id === focusedItemId);
    if (item) {
      handlePlayItem(item);
    }
  }, [focusedItemId, selectedPlaylist, handlePlayItem]);

  // Clear focused selection
  const handleClearSelection = useCallback(() => {
    setFocusedItemId(null);
    setSelectedItems(new Set());
  }, []);

  // Play current row and move to next
  const handlePlayAndNext = useCallback(() => {
    if (!focusedItemId || !selectedPlaylist?.items?.length) return;
    const items = selectedPlaylist.items;
    const currentIndex = items.findIndex(item => item.id === focusedItemId);

    // Play the current item
    const currentItem = items[currentIndex];
    if (currentItem) {
      handlePlayItem(currentItem);
    }

    // Move to next item (if available)
    if (currentIndex < items.length - 1) {
      setFocusedItemId(items[currentIndex + 1].id);
    }
  }, [focusedItemId, selectedPlaylist?.items, handlePlayItem]);

  // Keyboard shortcuts actions
  const shortcutActions: ShortcutActions = React.useMemo(() => ({
    playIn: handlePlayFocusedItem,
    playOut: () => {}, // TODO: Implement play out functionality
    startPlaylist: handlePlayPlaylist,
    stopPlaylist: handleStopPlaylist,
    skipNext: handleSkipNext,
    selectNext: handleSelectNext,
    selectPrevious: handleSelectPrevious,
    playSelected: handlePlayFocusedItem,
    playAndNext: handlePlayAndNext,
    clearSelection: handleClearSelection,
  }), [handlePlayFocusedItem, handlePlayPlaylist, handleStopPlaylist, handleSkipNext, handleSelectNext, handleSelectPrevious, handlePlayAndNext, handleClearSelection]);

  // Use keyboard shortcuts hook
  useKeyboardShortcuts(shortcutActions, true);

  // Get the next item index for preview
  const getNextPlayIndex = useCallback(() => {
    const playableItems = getPlayableItems();
    if (playableItems.length === 0) return -1;
    if (currentPlayIndex < 0) return 0;
    const nextIndex = currentPlayIndex + 1;
    if (nextIndex >= playableItems.length) {
      return selectedPlaylist?.loop_enabled ? 0 : -1;
    }
    return nextIndex;
  }, [currentPlayIndex, getPlayableItems, selectedPlaylist?.loop_enabled]);

  // Cleanup timer on unmount or playlist change
  useEffect(() => {
    return () => {
      if (playbackTimer) {
        clearTimeout(playbackTimer);
      }
    };
  }, [playbackTimer]);

  // Stop playback when playlist changes
  useEffect(() => {
    handleStopPlaylist();
  }, [selectedPlaylist?.id]);

  // Open playlist schedule modal
  const handleOpenPlaylistScheduleModal = () => {
    if (!selectedPlaylist) return;
    // Load existing schedule from playlist metadata if available
    const existingSchedule = (selectedPlaylist as any).metadata?.schedule_config;
    if (existingSchedule) {
      setPlaylistScheduleForm(existingSchedule);
    } else {
      setPlaylistScheduleForm({
        enabled: false,
        ruleType: 'daily',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        timeWindows: [{ start: '09:00', end: '17:00' }],
        exclusionDates: [],
        exclusionTimes: [],
        priority: 1,
        customRules: [],
      });
    }
    setPlaylistScheduleModalOpen(true);
  };

  // Save playlist schedule
  const handleSavePlaylistSchedule = async () => {
    if (!selectedPlaylist) return;

    setIsSubmitting(true);
    try {
      // Update playlist (the edge function can handle metadata via settings)
      const result = await playlistService.updatePlaylist({
        id: selectedPlaylist.id,
      });

      if (result.success) {
        toast.success('Playlist schedule saved');
        setPlaylistScheduleModalOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving playlist schedule:', error);
      toast.error('Failed to save playlist schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get playlist schedule summary
  const getPlaylistScheduleSummary = (): string => {
    if (!playlistScheduleForm.enabled) return t('status.noSchedule');

    const parts: string[] = [];
    if (playlistScheduleForm.ruleType === 'daily') {
      parts.push(t('schedule.daily'));
    } else if (playlistScheduleForm.ruleType === 'weekly' && playlistScheduleForm.daysOfWeek?.length) {
      const dayAbbrevs = playlistScheduleForm.daysOfWeek.map(d => t(`schedule.dayAbbrev.${d}`)).join(', ');
      parts.push(dayAbbrevs);
    }

    if (playlistScheduleForm.timeWindows?.length) {
      const firstWindow = playlistScheduleForm.timeWindows[0];
      parts.push(`${firstWindow.start}-${firstWindow.end}`);
    }

    return parts.join(' • ') || t('schedule.scheduled');
  };

  // ============================================
  // AI INSIGHTS
  // ============================================

  const generateAIInsight = async (insightType: string) => {
    if (!selectedPlaylist) {
      toast.error('Please select a playlist first');
      return;
    }

    setAiInsightsLoading(true);
    setSelectedInsightType(insightType);
    setAiInsightsResponse('');

    try {
      // Build playlist data payload
      const playlistPayload = {
        name: selectedPlaylist.name,
        description: selectedPlaylist.description,
        itemCount: selectedPlaylist.items.length,
        totalDuration: selectedPlaylist.items.reduce((sum, item) => sum + (item.duration || 0), 0),
        loopEnabled: selectedPlaylist.loop_enabled,
        items: selectedPlaylist.items.map((item, index) => ({
          position: index + 1,
          name: item.name,
          type: item.item_type,
          duration: item.duration,
          hasSchedule: item.schedule_config?.enabled || false,
          scheduleType: item.schedule_config?.ruleType,
          timeWindows: item.schedule_config?.timeWindows,
          priority: item.schedule_config?.priority,
        })),
      };

      // Build prompts based on insight type
      let systemPrompt = '';
      let userPrompt = '';

      if (insightType === 'analysis') {
        systemPrompt = `You are an expert digital signage and playlist strategist. Analyze the following playlist and provide insights about its structure, content mix, and potential improvements. Be specific and actionable. Format your response with clear sections using markdown.`;
        userPrompt = `Analyze this playlist and provide insights:

**Playlist Overview:**
- Name: ${playlistPayload.name}
- Description: ${playlistPayload.description || 'No description'}
- Total Items: ${playlistPayload.itemCount}
- Total Duration: ${Math.round(playlistPayload.totalDuration / 60)} minutes
- Loop Enabled: ${playlistPayload.loopEnabled ? 'Yes' : 'No'}

**Items:**
${playlistPayload.items.map(item => `${item.position}. "${item.name}" (${item.type}) - ${item.duration}s${item.hasSchedule ? ' [Scheduled]' : ''}`).join('\n')}

Please provide:
1. **Content Mix Analysis** - How balanced is the content?
2. **Duration Insights** - Are item durations appropriate?
3. **Scheduling Gaps** - Any items that should have schedules?
4. **Flow & Pacing** - How well do items transition?
5. **Top 3 Recommendations** - Actionable improvements`;
      } else if (insightType === 'optimization') {
        systemPrompt = `You are an expert in content optimization for digital signage. Provide specific recommendations to improve engagement and effectiveness. Focus on practical changes that can be made immediately. Use markdown formatting.`;
        userPrompt = `Optimize this playlist for maximum engagement:

**Current Playlist:**
- Name: ${playlistPayload.name}
- Items: ${playlistPayload.itemCount}
- Total Duration: ${Math.round(playlistPayload.totalDuration / 60)} minutes

**Item Details:**
${playlistPayload.items.map(item => `- "${item.name}" (${item.type}, ${item.duration}s)${item.priority ? ` Priority: ${item.priority}` : ''}`).join('\n')}

Please provide:
1. **Duration Optimization** - Suggest ideal durations for each item type
2. **Order Recommendations** - Best sequence for engagement
3. **Content Gaps** - What content types are missing?
4. **Attention Curve** - How to maintain viewer interest
5. **Quick Wins** - 3 changes to make right now`;
      } else if (insightType === 'engagement') {
        systemPrompt = `You are a digital signage timing expert. Analyze scheduling patterns and recommend the best times for content display based on typical audience behavior patterns. Consider breakfast, lunch, dinner, morning commute, and evening patterns. Use markdown formatting.`;
        userPrompt = `Recommend optimal scheduling for this playlist:

**Playlist:** ${playlistPayload.name}
**Item Count:** ${playlistPayload.itemCount}

**Current Scheduling Status:**
${playlistPayload.items.map(item => {
  if (item.hasSchedule) {
    const windows = item.timeWindows?.map((w: { start: string; end: string }) => `${w.start}-${w.end}`).join(', ') || 'Not set';
    return `- "${item.name}": ${item.scheduleType} (${windows})`;
  }
  return `- "${item.name}": No schedule set`;
}).join('\n')}

Please provide:
1. **Peak Engagement Times** - Best hours for maximum visibility
2. **Day-of-Week Patterns** - Which days for which content
3. **Content-Specific Timing** - Match content type to time slots
4. **Scheduling Strategy** - Overall approach recommendation
5. **Priority Suggestions** - Which items need highest priority when`;
      }

      // Fetch AI providers from backend
      const providers = await fetchPulsarVSProviders();
      const textProviderId = providers.text?.id;

      if (!textProviderId) {
        throw new Error('No AI text provider configured. Please configure a provider in the admin settings.');
      }

      const fullPrompt = systemPrompt + '\n\n' + userPrompt;
      const backendResponse = await generateTextViaBackend(
        textProviderId,
        fullPrompt,
        undefined,
        'pulsar-vs-text'
      );

      setAiInsightsResponse(backendResponse.response);
    } catch (error) {
      console.error('AI Insights error:', error);
      toast.error('Failed to generate insights: ' + (error instanceof Error ? error.message : String(error)));
      setAiInsightsResponse('');
    } finally {
      setAiInsightsLoading(false);
    }
  };

  // Helper to render AI response as visual infographic cards
  const renderAIInsightsContent = (response: string) => {
    // Parse sections from the response
    const sections: { title: string; content: string; type: string }[] = [];

    // Split by numbered sections or headers
    const lines = response.split('\n');
    let currentSection = { title: '', content: '', type: 'info' };

    lines.forEach(line => {
      const trimmed = line.trim();

      // Check for numbered headers like "1. Content Mix Analysis" or "## Header"
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      const headerMatch = trimmed.match(/^#{1,3}\s+(.+)/);
      const boldHeaderMatch = trimmed.match(/^\*\*(.+?)\*\*$/);

      if (numberedMatch || headerMatch || boldHeaderMatch) {
        // Save previous section if it has content
        if (currentSection.title && currentSection.content.trim()) {
          sections.push({ ...currentSection });
        }

        const title = numberedMatch ? numberedMatch[2] : (headerMatch ? headerMatch[1] : (boldHeaderMatch ? boldHeaderMatch[1] : ''));

        // Determine section type by keywords
        let type = 'info';
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('recommend') || lowerTitle.includes('suggestion') || lowerTitle.includes('improvement')) {
          type = 'recommendation';
        } else if (lowerTitle.includes('warning') || lowerTitle.includes('gap') || lowerTitle.includes('issue') || lowerTitle.includes('problem')) {
          type = 'warning';
        } else if (lowerTitle.includes('analysis') || lowerTitle.includes('insight')) {
          type = 'analysis';
        } else if (lowerTitle.includes('duration') || lowerTitle.includes('time') || lowerTitle.includes('schedule')) {
          type = 'timing';
        } else if (lowerTitle.includes('flow') || lowerTitle.includes('pacing')) {
          type = 'flow';
        } else if (lowerTitle.includes('content') || lowerTitle.includes('mix')) {
          type = 'content';
        }

        currentSection = { title, content: '', type };
      } else if (trimmed) {
        currentSection.content += line + '\n';
      }
    });

    // Add last section
    if (currentSection.title && currentSection.content.trim()) {
      sections.push({ ...currentSection });
    }

    // If no sections parsed, show raw formatted response
    if (sections.length === 0) {
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: response
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
                .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
                .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
                .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
                .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
            }}
          />
        </div>
      );
    }

    // Get icon and colors for section type
    const getSectionStyle = (type: string) => {
      switch (type) {
        case 'recommendation':
          return { icon: Lightbulb, bg: 'bg-green-50', border: 'border-green-200', iconBg: 'bg-green-100', iconColor: 'text-green-600', headerBg: 'bg-gradient-to-r from-green-500 to-emerald-500' };
        case 'warning':
          return { icon: AlertCircle, bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', headerBg: 'bg-gradient-to-r from-amber-500 to-orange-500' };
        case 'analysis':
          return { icon: BarChart3, bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', headerBg: 'bg-gradient-to-r from-blue-500 to-indigo-500' };
        case 'timing':
          return { icon: Timer, bg: 'bg-purple-50', border: 'border-purple-200', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', headerBg: 'bg-gradient-to-r from-purple-500 to-pink-500' };
        case 'flow':
          return { icon: Activity, bg: 'bg-cyan-50', border: 'border-cyan-200', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', headerBg: 'bg-gradient-to-r from-cyan-500 to-teal-500' };
        case 'content':
          return { icon: PieChart, bg: 'bg-indigo-50', border: 'border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', headerBg: 'bg-gradient-to-r from-indigo-500 to-purple-500' };
        default:
          return { icon: Target, bg: 'bg-slate-50', border: 'border-slate-200', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', headerBg: 'bg-gradient-to-r from-slate-500 to-gray-500' };
      }
    };

    // Parse bullet points and assessments from content
    const parseContent = (content: string) => {
      const bullets: string[] = [];
      const assessments: { label: string; value: string; isPositive: boolean | null }[] = [];
      let mainText = '';

      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          bullets.push(trimmed.substring(2));
        } else if (trimmed.includes('Assessment:') || trimmed.includes('assessment:')) {
          const parts = trimmed.split(':');
          if (parts.length >= 2) {
            const value = parts.slice(1).join(':').trim();
            const isPositive = value.toLowerCase().includes('good') || value.toLowerCase().includes('appropriate') || value.toLowerCase().includes('balanced');
            const isNegative = value.toLowerCase().includes('poor') || value.toLowerCase().includes('not balanced') || value.toLowerCase().includes('inappropriate');
            assessments.push({ label: parts[0].replace(/\*+/g, '').trim(), value, isPositive: isPositive ? true : (isNegative ? false : null) });
          }
        } else if (trimmed) {
          mainText += trimmed + ' ';
        }
      });

      return { bullets, assessments, mainText: mainText.trim() };
    };

    return (
      <div className="space-y-4">
        {sections.map((section, idx) => {
          const style = getSectionStyle(section.type);
          const IconComponent = style.icon;
          const { bullets, assessments, mainText } = parseContent(section.content);

          return (
            <div
              key={idx}
              className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden shadow-sm`}
            >
              {/* Section Header */}
              <div className={`${style.headerBg} px-4 py-2.5 flex items-center gap-2`}>
                <div className="p-1.5 rounded-lg bg-white/20">
                  <IconComponent className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-white text-sm">
                  {section.title}
                </h3>
              </div>

              {/* Section Content */}
              <div className="p-4 space-y-3">
                {/* Main text */}
                {mainText && (
                  <p className="text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: mainText
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    }}
                  />
                )}

                {/* Bullet points */}
                {bullets.length > 0 && (
                  <ul className="space-y-2">
                    {bullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <span className="text-gray-700"
                          dangerouslySetInnerHTML={{
                            __html: bullet
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {/* Assessments with gauge */}
                {assessments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-200/60">
                    {assessments.map((assessment, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`p-1 rounded-full ${assessment.isPositive === true ? 'bg-green-100' : assessment.isPositive === false ? 'bg-red-100' : 'bg-gray-100'}`}>
                          {assessment.isPositive === true ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : assessment.isPositive === false ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Gauge className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{assessment.label}:</span>
                        <span className={`text-sm ${assessment.isPositive === true ? 'text-green-700' : assessment.isPositive === false ? 'text-red-700' : 'text-gray-700'}`}>
                          {assessment.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // UI HELPERS
  // ============================================

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedItems(new Set());
    setFocusedItemId(null);
    loadPlaylistItems(playlist.id);
  };

  const handleEditPlaylistClick = () => {
    if (!selectedPlaylist) return;
    setPlaylistForm({
      name: selectedPlaylist.name,
      description: selectedPlaylist.description || '',
      loop_enabled: selectedPlaylist.loop_enabled,
    });
    setEditPlaylistOpen(true);
  };

  const handleEditItemClick = (item: PlaylistItem) => {
    setEditingItem(item);
    setItemForm({
      channel_id: item.channel_id || '',
      duration: item.duration,
      scheduled_time: item.scheduled_time || '',
      new_media_id: null,
    });
    // Reset replacement media state
    setShowReplaceMedia(false);
    setReplaceMediaSearch('');
    setReplaceMediaAssets([]);
    setReplaceMediaPage(1);
    setEditItemOpen(true);
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleAllItems = () => {
    if (!selectedPlaylist) return;
    if (selectedItems.size === selectedPlaylist.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(selectedPlaylist.items.map(i => i.id)));
    }
  };

  // Filter content by tab
  const filteredPlaylists = playlists;

  // Calendar resize handler - drag left edge to resize (uses pixels)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = calendarWidth;
    // Get available space (total width minus left sidebar)
    const maxWidth = window.innerWidth - 400 - 300; // Leave 300px minimum for middle panel
    // Check if RTL
    const isRTL = document.documentElement.getAttribute('dir') === 'rtl';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // In LTR: Moving left = calendar gets wider, moving right = narrower
      // In RTL: Moving right = calendar gets wider, moving left = narrower
      const deltaX = isRTL
        ? moveEvent.clientX - startX  // Inverted for RTL
        : startX - moveEvent.clientX;
      // Min 300px, max leaves 300px for middle panel
      const newWidth = Math.min(maxWidth, Math.max(300, startWidth + deltaX));
      setCalendarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    // Set cursor for entire document during drag
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [calendarWidth]);

  return (
    <div className="h-full flex bg-background">
      {/* Left Panel - Playlist List (wider) */}
      <div className="w-[400px] border-e bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListMusic className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold">{t('title')}</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!activeProject?.id) {
                    toast.error('Please select a project first');
                    return;
                  }
                  setIsCreatingSamplePlaylist(true);
                  try {
                    const result = await createSampleScheduledPlaylist(activeProject.id);
                    if (result.success) {
                      toast.success('Demo playlist created! Check the calendar view.');
                      loadPlaylists(); // Refresh list
                      setShowCalendar(true); // Show calendar
                    } else {
                      toast.error(result.error || 'Failed to create demo playlist');
                    }
                  } catch (error) {
                    console.error('Error creating demo playlist:', error);
                    toast.error('Failed to create demo playlist');
                  } finally {
                    setIsCreatingSamplePlaylist(false);
                  }
                }}
                disabled={isCreatingSamplePlaylist}
                title="Create a demo playlist with scheduled media events"
              >
                {isCreatingSamplePlaylist ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setPlaylistForm({ name: '', description: '', loop_enabled: false });
                  setCreatePlaylistOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('buttons.new')}
              </Button>
            </div>
          </div>
        </div>

        {/* Playlist List - Reorderable */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoadingPlaylists ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPlaylists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListMusic className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('empty.noPlaylists')}</p>
              <p className="text-xs mt-1">{t('empty.createFirst')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={async () => {
                  if (!activeProject?.id) {
                    toast.error('Please select a project first');
                    return;
                  }
                  setIsCreatingSamplePlaylist(true);
                  try {
                    const result = await createSampleScheduledPlaylist(activeProject.id);
                    if (result.success) {
                      toast.success('Demo playlist created! Check the calendar view.');
                      loadPlaylists();
                      setShowCalendar(true);
                    } else {
                      toast.error(result.error || 'Failed to create demo playlist');
                    }
                  } catch (error) {
                    console.error('Error creating demo playlist:', error);
                    toast.error('Failed to create demo playlist');
                  } finally {
                    setIsCreatingSamplePlaylist(false);
                  }
                }}
                disabled={isCreatingSamplePlaylist}
              >
                {isCreatingSamplePlaylist ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4 mr-1" />
                )}
                {t('buttons.createDemoPlaylist')}
              </Button>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={filteredPlaylists}
              onReorder={handleReorderPlaylists}
              className="space-y-1"
            >
              {filteredPlaylists.map((playlist) => (
                <Reorder.Item
                  key={playlist.id}
                  value={playlist}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group hover:bg-muted ${
                    selectedPlaylist?.id === playlist.id
                      ? 'bg-primary/10 hover:bg-blue-100 border border-blue-200'
                      : ''
                  }`}
                  onClick={() => handleSelectPlaylist(playlist)}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing" />
                  <ListMusic
                    className={`h-4 w-4 shrink-0 ${
                      selectedPlaylist?.id === playlist.id
                        ? 'text-blue-600'
                        : 'text-muted-foreground'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{playlist.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {playlist.item_count || 0} {t('table.items')}
                      {playlist.loop_enabled && <span className="ml-1 text-blue-500">({t('form.loopPlaylist')})</span>}
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      selectedPlaylist?.id === playlist.id
                        ? 'text-blue-600'
                        : 'text-muted-foreground opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>
      </div>

      {/* Middle Panel - Playlist Items */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedPlaylist ? (
          <>
            {/* Tabs Header */}
            <div className="border-b bg-card">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-6 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h1 className="text-xl font-semibold">{selectedPlaylist.name}</h1>
                      {selectedPlaylist.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {selectedPlaylist.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setAiInsightsOpen(true);
                          setAiInsightsResponse('');
                          setSelectedInsightType('');
                        }}
                        style={{ background: 'linear-gradient(to right, #9333ea, #db2777)', color: 'white' }}
                        className="hover:opacity-90 border-0 shadow-lg shadow-purple-500/30"
                        title={t('aiInsights.title')}
                      >
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        {t('aiInsights.button')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleEditPlaylistClick}>
                        <Edit className="h-4 w-4 mr-1" />
                        {t('buttons.edit')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletePlaylistOpen(true)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t('buttons.delete')}
                      </Button>
                    </div>
                  </div>
                </div>
                <TabsList className="px-6">
                  <TabsTrigger value="all">{t('tabs2.allItems')}</TabsTrigger>
                  <TabsTrigger value="pages">{t('tabs2.pages')}</TabsTrigger>
                  <TabsTrigger value="media">{t('tabs2.media')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Toolbar with Play Controls */}
            <div className="px-4 lg:px-6 py-2 border-b bg-muted/50 flex items-center justify-between gap-2">
              {/* Left: Play Controls */}
              <div className="flex items-center gap-1 lg:gap-2">
                {/* Play In Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-7 px-2 lg:px-3 ${focusedItemId ? 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700' : 'opacity-50 cursor-not-allowed'}`}
                  title={t('buttons.playIn')}
                  disabled={!focusedItemId}
                  onClick={() => {
                    if (focusedItemId && selectedPlaylist) {
                      const item = selectedPlaylist.items.find(i => i.id === focusedItemId);
                      if (item) {
                        handlePlayItem(item);
                      }
                    }
                  }}
                >
                  <Play className="h-4 w-4 lg:mr-1" />
                  <span className="hidden lg:inline">{t('buttons.playIn')}</span>
                </Button>

                {/* Play Out Button - disabled for now */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 lg:px-3 opacity-50 cursor-not-allowed"
                  title={t('buttons.playOut')}
                  disabled={true}
                >
                  <Square className="h-4 w-4 lg:mr-1" />
                  <span className="hidden lg:inline">{t('buttons.playOut')}</span>
                </Button>

                {/* Separator */}
                <div className="h-6 w-px bg-border mx-1" />

                {/* Start/Pause Button */}
                {isPlaying ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handlePausePlaylist}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white h-7 px-2 lg:px-3"
                    title={t('buttons.pause')}
                  >
                    <Pause className="h-4 w-4 lg:mr-1" />
                    <span className="hidden lg:inline">{t('buttons.pause')}</span>
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handlePlayPlaylist}
                    className={`h-7 px-2 lg:px-3 ${isPaused ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    title={isPaused ? t('buttons.resume') : t('buttons.play')}
                  >
                    <Play className="h-4 w-4 lg:mr-1 fill-white" />
                    <span className="hidden lg:inline">{isPaused ? t('buttons.resume') : t('buttons.play')}</span>
                  </Button>
                )}

                {/* Stop Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStopPlaylist}
                  disabled={!isPlaying && !isPaused}
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 h-7 px-2 lg:px-3"
                  title={t('buttons.stop')}
                >
                  <Square className="h-4 w-4 lg:mr-1" />
                  <span className="hidden lg:inline">{t('buttons.stop')}</span>
                </Button>

                {/* Skip Next Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkipNext}
                  disabled={!isPlaying && !isPaused}
                  className="disabled:opacity-50 h-7 px-2 lg:px-3"
                  title={t('buttons.skip')}
                >
                  <SkipForward className="h-4 w-4 lg:mr-1" />
                  <span className="hidden lg:inline">{t('buttons.skip')}</span>
                </Button>

                {/* Playback Status */}
                <div className="h-6 w-px bg-border mx-1" />
                <div className="text-sm">
                  {isPlaying && (
                    <span className="text-green-600 font-medium flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      {currentPlayIndex + 1}/{getPlayableItems().length}
                    </span>
                  )}
                  {isPaused && (
                    <span className="text-yellow-600 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                      {currentPlayIndex + 1}/{getPlayableItems().length}
                    </span>
                  )}
                  {!isPlaying && !isPaused && (
                    <span className="text-muted-foreground text-xs">
                      {getPlayableItems().length} {t('status.playable')}
                    </span>
                  )}
                </div>

                {/* Playlist Schedule Button */}
                <div className="h-6 w-px bg-border mx-1" />
                <button
                  onClick={handleOpenPlaylistScheduleModal}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs bg-card border rounded hover:bg-muted/50 transition-colors"
                >
                  <CalendarDays className={`h-3.5 w-3.5 ${playlistScheduleForm.enabled ? 'text-blue-600' : 'text-muted-foreground'}`} />
                  <span className={playlistScheduleForm.enabled ? 'text-blue-600 font-medium' : 'text-muted-foreground'}>
                    {getPlaylistScheduleSummary()}
                  </span>
                </button>

                {/* Selection Actions */}
                {selectedItems.size > 0 && (
                  <>
                    <div className="h-6 w-px bg-border mx-1" />
                    <span className="text-xs text-muted-foreground">
                      {selectedItems.size} {t('status.selected')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBatchChannelValue('');
                        setBatchChannelOpen(true);
                      }}
                      disabled={isSubmitting}
                      className="h-7 text-xs"
                    >
                      <Tv className="h-3 w-3 mr-1" />
                      {t('table.channel')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBatchDurationValue(10);
                        setBatchDurationOpen(true);
                      }}
                      disabled={isSubmitting}
                      className="h-7 text-xs"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {t('table.duration')}
                    </Button>
                    {selectedItems.size >= 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGroupSelectedItems}
                        disabled={isSubmitting}
                        className="h-7 text-xs"
                      >
                        <Folder className="h-3 w-3 mr-1" />
                        {t('itemTypes.group')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteItemsOpen(true)}
                      className="text-red-600 hover:text-red-700 h-7 text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {t('buttons.delete')}
                    </Button>
                  </>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1 lg:gap-2">
                {/* Default Channel Dropdown */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground hidden lg:inline">{t('channel.ch')}</span>
                  <Select
                    value={defaultChannelId || "none"}
                    onValueChange={(value) => {
                      const newChannelId = value === "none" ? "" : value;
                      setDefaultChannelId(newChannelId);
                      // Save to localStorage for persistence
                      if (selectedPlaylist) {
                        if (newChannelId) {
                          localStorage.setItem(`playlist_default_channel_${selectedPlaylist.id}`, newChannelId);
                        } else {
                          localStorage.removeItem(`playlist_default_channel_${selectedPlaylist.id}`);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 w-[160px] lg:w-[200px] text-xs">
                      <SelectValue placeholder={t('channel.default')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('channel.noDefault')}</SelectItem>
                      {channels.filter(ch => ch.id).map((channel) => (
                        <SelectItem key={channel.id} value={channel.id} textValue={channel.name}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="truncate">{channel.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                              {channel.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPlaylistItems(selectedPlaylist.id)}
                  disabled={isLoadingItems}
                  className="h-7 px-2 lg:px-3"
                  title={t('buttons.refresh')}
                >
                  <RefreshCw className={`h-3 w-3 lg:mr-1 ${isLoadingItems ? 'animate-spin' : ''}`} />
                  <span className="hidden lg:inline text-xs">{t('buttons.refresh')}</span>
                </Button>
                <Button size="sm" onClick={() => setAddItemOpen(true)} className="h-7 px-2 lg:px-3" title={t('buttons.addItem')}>
                  <Plus className="h-3 w-3 lg:mr-1" />
                  <span className="hidden lg:inline text-xs">{t('buttons.addItem')}</span>
                </Button>
                <div className="h-6 w-px bg-border mx-1 hidden lg:block" />
                <Button
                  variant={showCalendar ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="h-7 px-2 lg:px-3"
                  title={t('buttons.calendar')}
                >
                  <Calendar className="h-3 w-3 lg:mr-1" />
                  <span className="hidden lg:inline text-xs">{t('buttons.calendar')}</span>
                </Button>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
              <div className="rounded-lg border bg-card overflow-hidden">
                {isLoadingItems ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedPlaylist.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ListMusic className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm">{t('empty.noItems')}</p>
                    <p className="text-xs mt-1">{t('empty.addItemsMessage')}</p>
                  </div>
                ) : (
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8">
                          <Checkbox
                            checked={selectedItems.size === selectedPlaylist.items.length}
                            onCheckedChange={toggleAllItems}
                          />
                        </TableHead>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="w-10">{t('table.play')}</TableHead>
                        <TableHead className="w-14">{t('table.status')}</TableHead>
                        <TableHead className="min-w-0">{t('table.name')}</TableHead>
                        <TableHead className="w-40">{t('table.channel')}</TableHead>
                        <TableHead className="w-14">{t('table.duration')}</TableHead>
                        <TableHead className="w-32">{t('table.schedule')}</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <Reorder.Group
                      as="tbody"
                      axis="y"
                      values={selectedPlaylist.items}
                      onReorder={handleReorderItems}
                    >
                      {selectedPlaylist.items
                        .filter((item) => {
                          if (activeTab === 'all') return true;
                          if (activeTab === 'pages') return item.item_type === 'page' || item.item_type === 'group';
                          if (activeTab === 'media') return item.item_type === 'media';
                          return true;
                        })
                        .map((item) => (
                          <React.Fragment key={item.id}>
                          <Reorder.Item
                            value={item}
                            as="tr"
                            className={`hover:bg-muted/50 group border-b cursor-pointer ${focusedItemId === item.id ? 'bg-blue-50 ring-1 ring-blue-300 ring-inset' : ''}`}
                            onClick={(e) => {
                              // Don't select if clicking on interactive elements
                              const target = e.target as HTMLElement;
                              if (target.closest('button') || target.closest('input') || target.closest('[role="checkbox"]') || target.closest('[data-no-row-select]')) {
                                return;
                              }
                              setFocusedItemId(focusedItemId === item.id ? null : item.id);
                            }}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={() => toggleItemSelection(item.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                            {/* Play Button Column */}
                            <TableCell>
                              {item.item_type === 'page' && item.content_id ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 transition-all duration-300 active:scale-90 group/play relative overflow-hidden ${
                                    lastPlayedId === item.id
                                      ? 'bg-green-100 hover:bg-green-200 hover:scale-110 shadow-lg shadow-green-200/50'
                                      : 'hover:scale-110 hover:bg-primary/10 hover:text-blue-600 hover:shadow-lg hover:shadow-blue-200/50'
                                  }`}
                                  onClick={() => handlePlayItem(item)}
                                  title="Apply to Virtual Set"
                                >
                                  <Play className={`h-4 w-4 transition-all duration-300 ${
                                    lastPlayedId === item.id
                                      ? 'fill-black stroke-black'
                                      : 'group-hover/play:translate-x-0.5 group-hover/play:scale-110'
                                  }`} />
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            {/* Status Column - Shows current/next playing indicator */}
                            <TableCell>
                              {(() => {
                                const playableItems = getPlayableItems();
                                const itemIndex = playableItems.findIndex(pi => pi.id === item.id);
                                if (itemIndex === -1) return <span className="text-muted-foreground">-</span>;

                                const isCurrentlyPlaying = currentPlayIndex === itemIndex && (isPlaying || isPaused);
                                const isNextUp = getNextPlayIndex() === itemIndex && !isCurrentlyPlaying;

                                if (isCurrentlyPlaying) {
                                  return (
                                    <div className="flex items-center gap-1.5">
                                      <span className="relative flex h-3 w-3">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                                      </span>
                                      <span className={`text-xs font-medium ${isPaused ? 'text-yellow-600' : 'text-green-600'}`}>
                                        {isPaused ? t('status.paused') : t('status.playing')}
                                      </span>
                                    </div>
                                  );
                                }

                                if (isNextUp) {
                                  return (
                                    <div className="flex items-center gap-1.5">
                                      <ChevronRight className="h-3 w-3 text-blue-500" />
                                      <span className="text-xs font-medium text-blue-600">{t('status.next')}</span>
                                    </div>
                                  );
                                }

                                return <span className="text-muted-foreground text-xs">-</span>;
                              })()}
                            </TableCell>
                            {/* Name Column */}
                            <TableCell
                              className={item.item_type === 'media' ? 'cursor-pointer' : ''}
                              onDoubleClick={() => {
                                if (item.item_type === 'media' && item.media_url) {
                                  setPreviewingMedia(item);
                                  setShowPreviewReplaceMedia(false);
                                  setPreviewReplaceMediaPage(1);
                                  setPreviewSelectedMediaId(null);
                                  setReplaceMediaSearch('');
                                  setReplaceMediaAssets([]);
                                  setMediaPreviewOpen(true);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {/* Expand/Collapse button for groups */}
                                {item.item_type === 'group' ? (
                                  <button
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGroupExpansion(item.id);
                                    }}
                                  >
                                    {loadingNestedItems.has(item.id) ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    ) : expandedGroups.has(item.id) ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-6" />
                                )}
                                {item.item_type === 'media' && item.media_thumbnail ? (
                                  <div className="w-12 h-8 rounded overflow-hidden bg-muted flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all">
                                    <img
                                      src={item.media_thumbnail}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className={`p-1.5 rounded ${ITEM_TYPE_COLORS[item.item_type]}`}>
                                    <ItemTypeIcon type={item.item_type} className="h-4 w-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{item.name}</div>
                                  {/* Hide description for media items with thumbnails - thumbnail already indicates media type */}
                                  {!(item.item_type === 'media' && item.media_thumbnail) && (
                                    <div className="text-xs text-muted-foreground">
                                      {item.item_type === 'group' && (item as ExtendedPlaylistItem).nested_count !== undefined
                                        ? t('itemTypes.groupCount', { count: (item as ExtendedPlaylistItem).nested_count })
                                        : item.item_type === 'group'
                                          ? t('itemTypes.group')
                                          : item.item_type === 'page'
                                            ? t('itemTypes.page')
                                            : item.item_type === 'media'
                                              ? t('itemTypes.media')
                                              : item.item_type}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            {/* Channel Column */}
                            <TableCell>
                              <Select
                                value={item.channel_id || "none"}
                                onValueChange={(value) => handleInlineChannelChange(item.id, value === "none" ? null : value)}
                              >
                                <SelectTrigger className="h-7 w-full text-xs border-0 bg-transparent hover:bg-accent/50 focus:ring-0 focus:ring-offset-0 px-2 justify-start gap-1 [&>svg]:size-3 [&>svg]:opacity-40 hover:[&>svg]:opacity-100">
                                  <SelectValue placeholder={t('channel.noChannel')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">{t('channel.noChannel')}</SelectItem>
                                  {channels.filter(ch => ch.id).map((channel) => (
                                    <SelectItem key={channel.id} value={channel.id} textValue={channel.name}>
                                      <div className="flex items-center justify-between w-full gap-2">
                                        <span className="truncate">{channel.name}</span>
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                                          {channel.type}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            {/* Duration Column - Editable */}
                            <TableCell>
                              {editingDurationId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={editingDurationValue}
                                    onChange={(e) => setEditingDurationValue(parseInt(e.target.value) || 0)}
                                    className="h-8 w-16 text-xs"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleInlineDurationChange(item.id, editingDurationValue);
                                      } else if (e.key === 'Escape') {
                                        setEditingDurationId(null);
                                      }
                                    }}
                                    onBlur={() => handleInlineDurationChange(item.id, editingDurationValue)}
                                  />
                                  <span className="text-xs text-muted-foreground">s</span>
                                </div>
                              ) : (
                                <button
                                  className="flex items-center gap-1 text-sm hover:bg-muted px-2 py-1 rounded cursor-pointer transition-colors"
                                  onClick={() => {
                                    setEditingDurationId(item.id);
                                    setEditingDurationValue(item.duration);
                                  }}
                                  title="Click to edit"
                                >
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  {formatDuration(item.duration)}
                                </button>
                              )}
                            </TableCell>
                            {/* Schedule Column */}
                            <TableCell className="max-w-32">
                              <button
                                className="flex items-center gap-1 text-xs hover:bg-muted px-1 py-1 rounded cursor-pointer transition-colors text-left max-w-full overflow-hidden"
                                onClick={() => handleOpenScheduleModal(item)}
                                title={getScheduleSummary(item)}
                              >
                                <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate">
                                  {getScheduleSummary(item)}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditItemClick(item)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t('buttons.edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="h-4 w-4 mr-2" />
                                    {t('buttons.duplicate')}
                                  </DropdownMenuItem>
                                  {item.item_type === 'group' && (
                                    <DropdownMenuItem onClick={() => handleUngroupItems(item.id)}>
                                      <Folder className="h-4 w-4 mr-2" />
                                      {t('buttons.ungroup')}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedItems(new Set([item.id]));
                                      setDeleteItemsOpen(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('buttons.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </Reorder.Item>
                          {/* Render nested items when group is expanded */}
                          {item.item_type === 'group' && expandedGroups.has(item.id) && (
                            <>
                              {nestedItems[item.id]?.map((nestedItem) => (
                                <tr
                                  key={nestedItem.id}
                                  className="hover:bg-muted/50 bg-muted/50/50 border-b"
                                >
                                  <TableCell className="w-10">
                                    <Checkbox
                                      checked={selectedItems.has(nestedItem.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedItems(new Set(selectedItems).add(nestedItem.id));
                                        } else {
                                          const newSet = new Set(selectedItems);
                                          newSet.delete(nestedItem.id);
                                          setSelectedItems(newSet);
                                        }
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {/* No drag handle for nested items */}
                                  </TableCell>
                                  <TableCell>
                                    {nestedItem.content_id ? (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-8 w-8 transition-all duration-300 active:scale-90 group/play relative overflow-hidden ${
                                          lastPlayedId === nestedItem.id
                                            ? 'bg-green-100 hover:bg-green-200 hover:scale-110 shadow-lg shadow-green-200/50'
                                            : 'hover:scale-110 hover:bg-primary/10 hover:text-blue-600 hover:shadow-lg hover:shadow-blue-200/50'
                                        }`}
                                        onClick={() => handlePlayItem(nestedItem)}
                                        title="Apply to Virtual Set"
                                      >
                                        <Play className={`h-4 w-4 transition-all duration-300 ${
                                          lastPlayedId === nestedItem.id
                                            ? 'fill-black stroke-black'
                                            : 'group-hover/play:translate-x-0.5 group-hover/play:scale-110'
                                        }`} />
                                      </Button>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-muted-foreground text-xs">-</span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2 pl-4">
                                      <div className={`p-1 rounded ${ITEM_TYPE_COLORS[nestedItem.item_type]}`}>
                                        <ItemTypeIcon type={nestedItem.item_type} className="h-3 w-3" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-medium text-sm truncate">{nestedItem.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {nestedItem.item_type === 'page'
                                            ? t('itemTypes.page')
                                            : nestedItem.item_type === 'media'
                                              ? t('itemTypes.media')
                                              : nestedItem.item_type}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={nestedItem.channel_id || "none"}
                                      onValueChange={(value) => handleInlineChannelChange(nestedItem.id, value === "none" ? null : value)}
                                    >
                                      <SelectTrigger className="h-7 w-full text-xs border-0 bg-transparent hover:bg-accent/50 focus:ring-0 focus:ring-offset-0 px-2 justify-start gap-1 [&>svg]:size-3 [&>svg]:opacity-40 hover:[&>svg]:opacity-100">
                                        <SelectValue placeholder={t('channel.noChannel')} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">{t('channel.noChannel')}</SelectItem>
                                        {channels.filter(ch => ch.id).map((channel) => (
                                          <SelectItem key={channel.id} value={channel.id} textValue={channel.name}>
                                            <div className="flex items-center justify-between w-full gap-2">
                                              <span className="truncate">{channel.name}</span>
                                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                                                {channel.type}
                                              </Badge>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <button
                                      className="flex items-center gap-1 text-xs hover:bg-muted px-1 py-1 rounded cursor-pointer transition-colors"
                                      onClick={() => {
                                        setEditingDurationId(nestedItem.id);
                                        setEditingDurationValue(nestedItem.duration);
                                      }}
                                      title="Click to edit"
                                    >
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      {formatDuration(nestedItem.duration)}
                                    </button>
                                  </TableCell>
                                  <TableCell className="max-w-32">
                                    <button
                                      className="flex items-center gap-1 text-xs hover:bg-muted px-1 py-1 rounded cursor-pointer transition-colors text-left max-w-full overflow-hidden"
                                      onClick={() => handleOpenScheduleModal(nestedItem)}
                                      title={getScheduleSummary(nestedItem)}
                                    >
                                      <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <span className="truncate">
                                        {getScheduleSummary(nestedItem)}
                                      </span>
                                    </button>
                                  </TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedItems(new Set([nestedItem.id]));
                                            setDeleteItemsOpen(true);
                                          }}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </tr>
                              ))}
                              {loadingNestedItems.has(item.id) && (
                                <tr className="bg-muted/50/50">
                                  <TableCell colSpan={9} className="text-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                                  </TableCell>
                                </tr>
                              )}
                              {!loadingNestedItems.has(item.id) && (!nestedItems[item.id] || nestedItems[item.id].length === 0) && (
                                <tr className="bg-muted/50/50">
                                  <TableCell colSpan={9} className="text-center py-4 text-muted-foreground text-sm">
                                    No items in this group
                                  </TableCell>
                                </tr>
                              )}
                            </>
                          )}
                        </React.Fragment>
                        ))}
                    </Reorder.Group>
                  </Table>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ListMusic className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a playlist</p>
              <p className="text-sm mt-1">Choose a playlist from the left to view its items</p>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Panel - Right Side with Resizable Split */}
      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: calendarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: isResizing ? 0 : 0.3, ease: "easeInOut" }}
            className="h-full overflow-hidden flex relative border-s"
            style={{ flexShrink: 0 }}
          >
            {/* Resize Handle - Wide grab area for easy dragging */}
            <div
              onMouseDown={handleMouseDown}
              className="absolute start-0 top-0 bottom-0 w-4 cursor-col-resize z-20 group flex items-center"
              style={{ touchAction: 'none', marginInlineStart: '-2px' }}
            >
              {/* Visual line - always visible */}
              <div className={`absolute start-1 top-0 bottom-0 w-1 rounded transition-all ${
                isResizing ? 'bg-blue-500 w-1.5' : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-500 group-hover:w-1.5'
              }`} />
              {/* Grab handle indicator */}
              <div className={`absolute start-0 top-1/2 -translate-y-1/2 w-4 h-16 flex items-center justify-center transition-opacity ${
                isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <div className="w-1.5 h-8 bg-blue-500 rounded-full flex flex-col items-center justify-center gap-1 py-2">
                  <div className="w-0.5 h-0.5 rounded-full bg-white" />
                  <div className="w-0.5 h-0.5 rounded-full bg-white" />
                  <div className="w-0.5 h-0.5 rounded-full bg-white" />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <PlaylistCalendar
                playlist={selectedPlaylist}
                onClose={() => setShowCalendar(false)}
                onPlayItem={(item) => {
                  // Find the item index and play it
                  if (selectedPlaylist) {
                    const index = selectedPlaylist.items.findIndex(i => i.id === item.id);
                    if (index !== -1) {
                      handlePlayItem(item, index);
                    }
                  }
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Playlist Dialog */}
      <Dialog open={createPlaylistOpen} onOpenChange={setCreatePlaylistOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.createPlaylist')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name">{t('form.name')} *</Label>
              <Input
                id="playlist-name"
                placeholder={t('form.namePlaceholder')}
                value={playlistForm.name}
                onChange={(e) => setPlaylistForm({ ...playlistForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-description">{t('form.description')}</Label>
              <Textarea
                id="playlist-description"
                placeholder={t('form.descriptionPlaceholder')}
                value={playlistForm.description}
                onChange={(e) => setPlaylistForm({ ...playlistForm, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="loop-enabled"
                checked={playlistForm.loop_enabled}
                onCheckedChange={(checked) =>
                  setPlaylistForm({ ...playlistForm, loop_enabled: checked as boolean })
                }
              />
              <Label htmlFor="loop-enabled" className="cursor-pointer">
                {t('form.loopPlaylist')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePlaylistOpen(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleCreatePlaylist} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('buttons.createPlaylist')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Playlist Dialog */}
      <Dialog open={editPlaylistOpen} onOpenChange={setEditPlaylistOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.editPlaylist')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-playlist-name">{t('form.name')} *</Label>
              <Input
                id="edit-playlist-name"
                value={playlistForm.name}
                onChange={(e) => setPlaylistForm({ ...playlistForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-playlist-description">{t('form.description')}</Label>
              <Textarea
                id="edit-playlist-description"
                value={playlistForm.description}
                onChange={(e) => setPlaylistForm({ ...playlistForm, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-loop-enabled"
                checked={playlistForm.loop_enabled}
                onCheckedChange={(checked) =>
                  setPlaylistForm({ ...playlistForm, loop_enabled: checked as boolean })
                }
              />
              <Label htmlFor="edit-loop-enabled" className="cursor-pointer">
                {t('form.loopPlaylist')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlaylistOpen(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleUpdatePlaylist} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('dialog.addItem')}</DialogTitle>
            <DialogDescription>
              Select content from your library or media assets
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Item Type Selector */}
            <div className="space-y-2">
              <Label>Item Type</Label>
              <div className="flex gap-2">
                {(['page', 'group', 'media'] as PlaylistItemType[]).map((type) => (
                  <Button
                    key={type}
                    variant={addItemType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAddItemType(type);
                      setSelectedContentIds(new Set());
                      setSelectedMediaIds(new Set());
                    }}
                  >
                    <ItemTypeIcon type={type} className="h-4 w-4 mr-1" />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${addItemType === 'media' ? 'media' : addItemType === 'group' ? 'groups' : 'pages'}...`}
                value={addItemSearch}
                onChange={(e) => setAddItemSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selection count */}
            {(selectedContentIds.size > 0 || selectedMediaIds.size > 0) && (
              <div className="text-sm text-blue-600">
                {addItemType === 'media' ? selectedMediaIds.size : selectedContentIds.size} item(s) selected
              </div>
            )}

            {/* Content/Media/Groups List */}
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {addItemType === 'media' ? (
                isLoadingMedia ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : mediaAssets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No media assets found
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 p-2">
                    {mediaAssets.map((media) => {
                      const isSelected = selectedMediaIds.has(media.id);
                      return (
                        <div
                          key={media.id}
                          className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-blue-500 ring-2 ring-blue-500/20'
                              : 'border-transparent hover:border-border'
                          }`}
                          onClick={() => {
                            const newSet = new Set(selectedMediaIds);
                            if (isSelected) {
                              newSet.delete(media.id);
                            } else {
                              newSet.add(media.id);
                            }
                            setSelectedMediaIds(newSet);
                          }}
                        >
                          <div className="aspect-video bg-muted">
                            <img
                              src={media.thumbnail_url || media.file_url}
                              alt={media.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-2">
                            <div className="text-xs font-medium truncate">{media.name}</div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary/100 text-white rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : addItemType === 'group' ? (
                isLoadingFolders ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : folders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No groups/folders found
                  </div>
                ) : (
                  <div className="divide-y">
                    {folders.map((folder) => {
                      const isSelected = selectedContentIds.has(folder.id);
                      return (
                        <div
                          key={folder.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            const newSet = new Set(selectedContentIds);
                            if (isSelected) {
                              newSet.delete(folder.id);
                            } else {
                              newSet.add(folder.id);
                            }
                            setSelectedContentIds(newSet);
                          }}
                        >
                          <Checkbox checked={isSelected} />
                          <div className={`p-2 rounded ${ITEM_TYPE_COLORS['group']}`}>
                            <Folder className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{folder.name}</div>
                          </div>
                          {isSelected && <Check className="h-5 w-5 text-blue-500" />}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : isLoadingContent ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : contentItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pages found
                </div>
              ) : (
                <div className="divide-y">
                  {contentItems.map((content) => {
                    const isSelected = selectedContentIds.has(content.id);
                    return (
                      <div
                        key={content.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                          isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          const newSet = new Set(selectedContentIds);
                          if (isSelected) {
                            newSet.delete(content.id);
                          } else {
                            newSet.add(content.id);
                          }
                          setSelectedContentIds(newSet);
                        }}
                      >
                        <Checkbox checked={isSelected} />
                        <div className={`p-2 rounded ${ITEM_TYPE_COLORS['page']}`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{content.name}</div>
                          {content.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {content.description}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-blue-500" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Item Settings */}
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select
                    value={itemForm.channel_id || "none"}
                    onValueChange={(value) => setItemForm({ ...itemForm, channel_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No channel</SelectItem>
                      {channels.filter(ch => ch.id).map((channel) => (
                        <SelectItem key={channel.id} value={channel.id} textValue={channel.name}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="truncate">{channel.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                              {channel.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={itemForm.duration}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, duration: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">0 = manual advance</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Scheduled Time (optional)</Label>
                <Input
                  type="time"
                  value={itemForm.scheduled_time}
                  onChange={(e) => setItemForm({ ...itemForm, scheduled_time: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={isSubmitting || (selectedContentIds.size === 0 && selectedMediaIds.size === 0)}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {(addItemType === 'media' ? selectedMediaIds.size : selectedContentIds.size) || ''} to Playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className={editingItem?.item_type === 'media' && showReplaceMedia ? 'max-w-2xl max-h-[80vh] flex flex-col' : ''}>
          <DialogHeader>
            <DialogTitle>{t('dialog.editItem')}</DialogTitle>
            <DialogDescription>
              {t('dialog.editItemDesc', { name: editingItem?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className={`space-y-4 py-4 ${editingItem?.item_type === 'media' && showReplaceMedia ? 'flex-1 overflow-y-auto' : ''}`}>
            {/* Media Replacement Section - only for media items */}
            {editingItem?.item_type === 'media' && (
              <div className="space-y-3 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('editItemDialog.currentMedia')}</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowReplaceMedia(!showReplaceMedia);
                      if (!showReplaceMedia) {
                        setReplaceMediaPage(1);
                        loadReplaceMedia();
                      }
                    }}
                  >
                    {showReplaceMedia ? t('editItemDialog.cancelReplace') : t('editItemDialog.replaceMedia')}
                  </Button>
                </div>

                {/* Current Media Preview */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-20 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                    {editingItem.media_thumbnail || editingItem.media_url ? (
                      <img
                        src={editingItem.media_thumbnail || editingItem.media_url}
                        alt={editingItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{editingItem.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {editingItem.media_type || 'Media'}
                    </div>
                  </div>
                </div>

                {/* Selected Replacement Preview */}
                {itemForm.new_media_id && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="w-20 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                      {(() => {
                        const selectedMedia = replaceMediaAssets.find(m => m.id === itemForm.new_media_id);
                        return selectedMedia ? (
                          <img
                            src={selectedMedia.thumbnail_url || selectedMedia.file_url}
                            alt={selectedMedia.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">{t('editItemDialog.newMediaSelected')}</span>
                      </div>
                      <div className="font-medium text-sm truncate">
                        {replaceMediaAssets.find(m => m.id === itemForm.new_media_id)?.name}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setItemForm({ ...itemForm, new_media_id: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Replacement Media Search */}
                {showReplaceMedia && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('editItemDialog.searchMediaLibrary')}
                        value={replaceMediaSearch}
                        onChange={(e) => {
                          setReplaceMediaSearch(e.target.value);
                          setReplaceMediaPage(1);
                        }}
                        className="pl-9"
                      />
                    </div>

                    {/* Media count and pagination info */}
                    {replaceMediaAssets.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Showing {Math.min((replaceMediaPage - 1) * REPLACE_MEDIA_PAGE_SIZE + 1, replaceMediaAssets.length)}-{Math.min(replaceMediaPage * REPLACE_MEDIA_PAGE_SIZE, replaceMediaAssets.length)} of {replaceMediaAssets.length} items
                      </div>
                    )}

                    <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                      {isLoadingReplaceMedia ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : replaceMediaAssets.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {t('editItemDialog.noMediaFound')}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 p-2">
                          {replaceMediaAssets
                            .slice((replaceMediaPage - 1) * REPLACE_MEDIA_PAGE_SIZE, replaceMediaPage * REPLACE_MEDIA_PAGE_SIZE)
                            .map((media) => {
                              const isSelected = itemForm.new_media_id === media.id;
                              const isCurrent = media.id === editingItem.media_id;
                              return (
                                <div
                                  key={media.id}
                                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                    isSelected
                                      ? 'border-green-500 ring-2 ring-green-500/20'
                                      : isCurrent
                                      ? 'border-blue-500/50 opacity-50'
                                      : 'border-transparent hover:border-border'
                                  }`}
                                  onClick={() => {
                                    if (!isCurrent) {
                                      setItemForm({ ...itemForm, new_media_id: media.id });
                                    }
                                  }}
                                >
                                  <div className="aspect-video bg-muted">
                                    <img
                                      src={media.thumbnail_url || media.file_url}
                                      alt={media.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="p-2">
                                    <div className="text-xs font-medium truncate">{media.name}</div>
                                  </div>
                                  {isSelected && (
                                    <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                  {isCurrent && (
                                    <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                                      <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">{t('editItemDialog.current')}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Pagination controls */}
                    {replaceMediaAssets.length > REPLACE_MEDIA_PAGE_SIZE && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReplaceMediaPage(p => Math.max(1, p - 1))}
                          disabled={replaceMediaPage === 1}
                        >
                          {t('editItemDialog.previous')}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {t('editItemDialog.pageOf', { current: replaceMediaPage, total: Math.ceil(replaceMediaAssets.length / REPLACE_MEDIA_PAGE_SIZE) })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReplaceMediaPage(p => Math.min(Math.ceil(replaceMediaAssets.length / REPLACE_MEDIA_PAGE_SIZE), p + 1))}
                          disabled={replaceMediaPage >= Math.ceil(replaceMediaAssets.length / REPLACE_MEDIA_PAGE_SIZE)}
                        >
                          {t('editItemDialog.next')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('table.channel')}</Label>
              <Select
                value={itemForm.channel_id || "none"}
                onValueChange={(value) => setItemForm({ ...itemForm, channel_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('channel.selectChannel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('channel.noChannel')}</SelectItem>
                  {channels.filter(ch => ch.id).map((channel) => (
                    <SelectItem key={channel.id} value={channel.id} textValue={channel.name}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{channel.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                          {channel.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('form.durationSeconds')}</Label>
              <Input
                type="number"
                min={0}
                value={itemForm.duration}
                onChange={(e) =>
                  setItemForm({ ...itemForm, duration: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">{t('form.manualAdvance')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('form.scheduledTime')}</Label>
              <Input
                type="time"
                value={itemForm.scheduled_time}
                onChange={(e) => setItemForm({ ...itemForm, scheduled_time: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemOpen(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleUpdateItem} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Playlist Confirmation */}
      <AlertDialog open={deletePlaylistOpen} onOpenChange={setDeletePlaylistOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.deletePlaylist')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.deletePlaylistConfirm', { name: selectedPlaylist?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlaylist}
              className="bg-red-500 hover:bg-red-600"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Items Confirmation */}
      <AlertDialog open={deleteItemsOpen} onOpenChange={setDeleteItemsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.deleteItem')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.deleteItemConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItems}
              className="bg-red-500 hover:bg-red-600"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Channel Dialog */}
      <Dialog open={batchChannelOpen} onOpenChange={setBatchChannelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('dialog.batchChannel')}</DialogTitle>
            <DialogDescription>
              {t('dialog.batchChannelDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>{t('table.channel')}</Label>
            <Select
              value={batchChannelValue || "none"}
              onValueChange={setBatchChannelValue}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={t('channel.selectChannel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('channel.noChannel')}</SelectItem>
                {channels.filter(ch => ch.id).map((channel) => (
                  <SelectItem key={channel.id} value={channel.id} textValue={channel.name}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="truncate">{channel.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                        {channel.type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchChannelOpen(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleBatchChannelChange} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('dialog.applyToItems', { count: selectedItems.size })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Duration Dialog */}
      <Dialog open={batchDurationOpen} onOpenChange={setBatchDurationOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('dialog.batchDuration')}</DialogTitle>
            <DialogDescription>
              {t('dialog.batchDurationDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>{t('form.durationSeconds')}</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min={0}
                value={batchDurationValue}
                onChange={(e) => setBatchDurationValue(parseInt(e.target.value) || 0)}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2 mt-3">
              {[5, 10, 15, 30, 60].map((sec) => (
                <Button
                  key={sec}
                  variant={batchDurationValue === sec ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBatchDurationValue(sec)}
                >
                  {sec}s
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDurationOpen(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleBatchDurationChange} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('dialog.applyToItems', { count: selectedItems.size })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="!max-w-[840px] sm:!max-w-[840px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Schedule: {schedulingItem?.name}
            </DialogTitle>
            <DialogDescription>
              Configure when this item should be active in the playlist
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Schedule Enabled</Label>
                <p className="text-xs text-muted-foreground">Turn on to activate scheduling rules</p>
              </div>
              <Checkbox
                checked={scheduleForm.enabled}
                onCheckedChange={(checked) =>
                  setScheduleForm({ ...scheduleForm, enabled: checked as boolean })
                }
              />
            </div>

            {scheduleForm.enabled && (
              <>
                {/* Schedule Rule Type */}
                <div className="space-y-2">
                  <Label>Schedule Type</Label>
                  <Select
                    value={scheduleForm.ruleType}
                    onValueChange={(value) =>
                      setScheduleForm({ ...scheduleForm, ruleType: value as ScheduleRuleType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t('schedule.daily')}</SelectItem>
                      <SelectItem value="weekly">{t('schedule.weekly')}</SelectItem>
                      <SelectItem value="date_range">{t('schedule.dateRange')}</SelectItem>
                      <SelectItem value="specific_dates">{t('schedule.specificDates')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range (for date_range type) */}
                {scheduleForm.ruleType === 'date_range' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('schedule.startDate')}</Label>
                      <Input
                        type="date"
                        value={scheduleForm.startDate || ''}
                        onChange={(e) =>
                          setScheduleForm({ ...scheduleForm, startDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('schedule.endDate')}</Label>
                      <Input
                        type="date"
                        value={scheduleForm.endDate || ''}
                        onChange={(e) =>
                          setScheduleForm({ ...scheduleForm, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Days of Week (for weekly type) */}
                {scheduleForm.ruleType === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Active Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map(
                        (day) => {
                          const isActive = scheduleForm.daysOfWeek?.includes(day);
                          return (
                            <Button
                              key={day}
                              type="button"
                              variant={isActive ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleDayOfWeek(day)}
                              className="min-w-[80px]"
                            >
                              {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                            </Button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                {/* Specific Dates (for specific_dates type) */}
                {scheduleForm.ruleType === 'specific_dates' && (
                  <div className="space-y-2">
                    <Label>Specific Dates</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        id="add-specific-date"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById('add-specific-date') as HTMLInputElement;
                          if (input?.value) {
                            const currentDates = scheduleForm.specificDates || [];
                            if (!currentDates.includes(input.value)) {
                              setScheduleForm({
                                ...scheduleForm,
                                specificDates: [...currentDates, input.value],
                              });
                            }
                            input.value = '';
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {scheduleForm.specificDates && scheduleForm.specificDates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {scheduleForm.specificDates.map((date) => (
                          <Badge key={date} variant="secondary" className="flex items-center gap-1">
                            {new Date(date).toLocaleDateString()}
                            <button
                              type="button"
                              onClick={() =>
                                setScheduleForm({
                                  ...scheduleForm,
                                  specificDates: scheduleForm.specificDates?.filter((d) => d !== date),
                                })
                              }
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Time Windows */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Active Time Windows</Label>
                      <p className="text-xs text-muted-foreground">
                        Item will only play during these times
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addTimeWindow}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Window
                    </Button>
                  </div>
                  {scheduleForm.timeWindows && scheduleForm.timeWindows.length > 0 ? (
                    <div className="space-y-2">
                      {scheduleForm.timeWindows.map((window, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="time"
                            value={window.start}
                            onChange={(e) => {
                              const newWindows = [...(scheduleForm.timeWindows || [])];
                              newWindows[index] = { ...window, start: e.target.value };
                              setScheduleForm({ ...scheduleForm, timeWindows: newWindows });
                            }}
                            className="w-28"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={window.end}
                            onChange={(e) => {
                              const newWindows = [...(scheduleForm.timeWindows || [])];
                              newWindows[index] = { ...window, end: e.target.value };
                              setScheduleForm({ ...scheduleForm, timeWindows: newWindows });
                            }}
                            className="w-28"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeTimeWindow(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg border-dashed">
                      No time windows set - item will play at any time
                    </div>
                  )}
                </div>

                {/* Exclusion Dates */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <CalendarX className="h-4 w-4 text-red-500" />
                        Exclusion Dates
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Item will NOT play on these dates (e.g., holidays)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      id="add-exclusion-date"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById('add-exclusion-date') as HTMLInputElement;
                        if (input?.value) {
                          addExclusionDate(input.value);
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {scheduleForm.exclusionDates && scheduleForm.exclusionDates.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {scheduleForm.exclusionDates.map((date) => (
                        <Badge key={date} variant="destructive" className="flex items-center gap-1">
                          <Ban className="h-3 w-3" />
                          {new Date(date).toLocaleDateString()}
                          <button
                            type="button"
                            onClick={() => removeExclusionDate(date)}
                            className="ml-1 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Exclusion Time Windows */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-red-500" />
                        Exclusion Times
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Item will NOT play during these times (e.g., lunch break)
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addExclusionTime}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  {scheduleForm.exclusionTimes && scheduleForm.exclusionTimes.length > 0 ? (
                    <div className="space-y-2">
                      {scheduleForm.exclusionTimes.map((window, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
                          <Ban className="h-4 w-4 text-red-500" />
                          <Input
                            type="time"
                            value={window.start}
                            onChange={(e) => {
                              const newWindows = [...(scheduleForm.exclusionTimes || [])];
                              newWindows[index] = { ...window, start: e.target.value };
                              setScheduleForm({ ...scheduleForm, exclusionTimes: newWindows });
                            }}
                            className="w-28"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={window.end}
                            onChange={(e) => {
                              const newWindows = [...(scheduleForm.exclusionTimes || [])];
                              newWindows[index] = { ...window, end: e.target.value };
                              setScheduleForm({ ...scheduleForm, exclusionTimes: newWindows });
                            }}
                            className="w-28"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeExclusionTime(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-sm text-muted-foreground border rounded-lg border-dashed">
                      No exclusion times set
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <p className="text-xs text-muted-foreground">
                    Higher priority items play first when multiple items are scheduled
                  </p>
                  <Select
                    value={String(scheduleForm.priority || 1)}
                    onValueChange={(value) =>
                      setScheduleForm({ ...scheduleForm, priority: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Low</SelectItem>
                      <SelectItem value="2">2 - Normal</SelectItem>
                      <SelectItem value="3">3 - High</SelectItem>
                      <SelectItem value="4">4 - Urgent</SelectItem>
                      <SelectItem value="5">5 - Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Rules */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Custom Rules
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Advanced scheduling conditions
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newRule = {
                          name: `Rule ${(scheduleForm.customRules?.length || 0) + 1}`,
                          condition: '',
                          enabled: true,
                        };
                        setScheduleForm({
                          ...scheduleForm,
                          customRules: [...(scheduleForm.customRules || []), newRule],
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Rule
                    </Button>
                  </div>
                  {scheduleForm.customRules && scheduleForm.customRules.length > 0 ? (
                    <div className="space-y-2">
                      {scheduleForm.customRules.map((rule, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded border">
                          <Checkbox
                            checked={rule.enabled}
                            onCheckedChange={(checked) => {
                              const newRules = [...(scheduleForm.customRules || [])];
                              newRules[index] = { ...rule, enabled: checked as boolean };
                              setScheduleForm({ ...scheduleForm, customRules: newRules });
                            }}
                          />
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Rule name"
                              value={rule.name}
                              onChange={(e) => {
                                const newRules = [...(scheduleForm.customRules || [])];
                                newRules[index] = { ...rule, name: e.target.value };
                                setScheduleForm({ ...scheduleForm, customRules: newRules });
                              }}
                              className="text-sm"
                            />
                            <Input
                              placeholder="Condition (e.g., weather:sunny, event:sports)"
                              value={rule.condition}
                              onChange={(e) => {
                                const newRules = [...(scheduleForm.customRules || [])];
                                newRules[index] = { ...rule, condition: e.target.value };
                                setScheduleForm({ ...scheduleForm, customRules: newRules });
                              }}
                              className="text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => {
                              setScheduleForm({
                                ...scheduleForm,
                                customRules: scheduleForm.customRules?.filter((_, i) => i !== index),
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-sm text-muted-foreground border rounded-lg border-dashed">
                      No custom rules configured
                    </div>
                  )}
                </div>

                {/* AI Auto Schedule */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">AI Smart Schedule</Label>
                      <p className="text-xs text-muted-foreground">
                        Let AI suggest optimal scheduling based on content type
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto py-2 px-3 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                      onClick={() => {
                        setScheduleForm({
                          ...scheduleForm,
                          ruleType: 'daily',
                          timeWindows: [{ start: '06:00', end: '10:00' }],
                          priority: 3,
                        });
                        toast.success('Morning prime time schedule applied');
                      }}
                    >
                      <Sun className="h-4 w-4 mr-2 text-amber-500" />
                      <div className="text-left">
                        <div className="text-xs font-medium">Morning Prime</div>
                        <div className="text-[10px] text-muted-foreground">6AM - 10AM</div>
                      </div>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto py-2 px-3 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                      onClick={() => {
                        setScheduleForm({
                          ...scheduleForm,
                          ruleType: 'daily',
                          timeWindows: [{ start: '11:00', end: '14:00' }],
                          priority: 2,
                        });
                        toast.success('Lunch rush schedule applied');
                      }}
                    >
                      <Utensils className="h-4 w-4 mr-2 text-orange-500" />
                      <div className="text-left">
                        <div className="text-xs font-medium">Lunch Rush</div>
                        <div className="text-[10px] text-muted-foreground">11AM - 2PM</div>
                      </div>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto py-2 px-3 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                      onClick={() => {
                        setScheduleForm({
                          ...scheduleForm,
                          ruleType: 'daily',
                          timeWindows: [{ start: '17:00', end: '21:00' }],
                          priority: 4,
                        });
                        toast.success('Evening peak schedule applied');
                      }}
                    >
                      <Moon className="h-4 w-4 mr-2 text-indigo-500" />
                      <div className="text-left">
                        <div className="text-xs font-medium">Evening Peak</div>
                        <div className="text-[10px] text-muted-foreground">5PM - 9PM</div>
                      </div>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto py-2 px-3 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                      onClick={() => {
                        setScheduleForm({
                          ...scheduleForm,
                          ruleType: 'weekly',
                          activeDays: ['saturday', 'sunday'],
                          timeWindows: [{ start: '10:00', end: '20:00' }],
                          priority: 3,
                        });
                        toast.success('Weekend special schedule applied');
                      }}
                    >
                      <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                      <div className="text-left">
                        <div className="text-xs font-medium">Weekend Special</div>
                        <div className="text-[10px] text-muted-foreground">Sat-Sun 10AM-8PM</div>
                      </div>
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100"
                    onClick={() => {
                      // Smart analysis based on content name
                      const itemName = schedulingItem?.name?.toLowerCase() || '';
                      let suggestedSchedule: Partial<typeof scheduleForm> = {};

                      if (itemName.includes('breakfast') || itemName.includes('morning') || itemName.includes('coffee')) {
                        suggestedSchedule = {
                          ruleType: 'daily',
                          timeWindows: [{ start: '06:00', end: '11:00' }],
                          priority: 3,
                        };
                        toast.success('🌅 Detected morning content - scheduled for breakfast hours');
                      } else if (itemName.includes('lunch') || itemName.includes('noon') || itemName.includes('midday')) {
                        suggestedSchedule = {
                          ruleType: 'daily',
                          timeWindows: [{ start: '11:00', end: '14:00' }],
                          priority: 2,
                        };
                        toast.success('🍽️ Detected lunch content - scheduled for midday');
                      } else if (itemName.includes('dinner') || itemName.includes('evening') || itemName.includes('night')) {
                        suggestedSchedule = {
                          ruleType: 'daily',
                          timeWindows: [{ start: '17:00', end: '22:00' }],
                          priority: 4,
                        };
                        toast.success('🌙 Detected evening content - scheduled for dinner hours');
                      } else if (itemName.includes('promo') || itemName.includes('special') || itemName.includes('sale')) {
                        suggestedSchedule = {
                          ruleType: 'daily',
                          timeWindows: [{ start: '12:00', end: '14:00' }, { start: '18:00', end: '20:00' }],
                          priority: 5,
                        };
                        toast.success('⚡ Detected promotional content - scheduled for peak hours');
                      } else if (itemName.includes('weekend') || itemName.includes('saturday') || itemName.includes('sunday')) {
                        suggestedSchedule = {
                          ruleType: 'weekly',
                          activeDays: ['saturday', 'sunday'],
                          timeWindows: [{ start: '10:00', end: '20:00' }],
                          priority: 3,
                        };
                        toast.success('🎉 Detected weekend content - scheduled for Sat-Sun');
                      } else {
                        // Default balanced schedule
                        suggestedSchedule = {
                          ruleType: 'daily',
                          timeWindows: [{ start: '09:00', end: '17:00' }],
                          priority: 2,
                        };
                        toast.success('✨ Applied balanced business hours schedule');
                      }

                      setScheduleForm({ ...scheduleForm, ...suggestedSchedule });
                    }}
                  >
                    <Wand2 className="h-4 w-4 mr-2 text-purple-600" />
                    <span className="text-purple-700 font-medium">Auto-Detect Best Time</span>
                  </Button>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setScheduleModalOpen(false);
                setSchedulingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Playlist Schedule Modal */}
      <Dialog open={playlistScheduleModalOpen} onOpenChange={setPlaylistScheduleModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListMusic className="h-5 w-5 text-blue-600" />
              Playlist Schedule: {selectedPlaylist?.name}
            </DialogTitle>
            <DialogDescription>
              Configure when this entire playlist should be active. This overrides individual item schedules.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-blue-200">
              <div>
                <Label className="text-sm font-medium">Playlist Schedule Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, the playlist will only run during the scheduled times
                </p>
              </div>
              <Checkbox
                checked={playlistScheduleForm.enabled}
                onCheckedChange={(checked) =>
                  setPlaylistScheduleForm({ ...playlistScheduleForm, enabled: checked as boolean })
                }
              />
            </div>

            {playlistScheduleForm.enabled && (
              <>
                {/* Schedule Rule Type */}
                <div className="space-y-2">
                  <Label>{t('schedule.scheduleType')}</Label>
                  <Select
                    value={playlistScheduleForm.ruleType}
                    onValueChange={(value) =>
                      setPlaylistScheduleForm({ ...playlistScheduleForm, ruleType: value as ScheduleRuleType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t('schedule.daily')}</SelectItem>
                      <SelectItem value="weekly">{t('schedule.weekly')}</SelectItem>
                      <SelectItem value="date_range">{t('schedule.dateRange')}</SelectItem>
                      <SelectItem value="specific_dates">{t('schedule.specificDates')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                {playlistScheduleForm.ruleType === 'date_range' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('schedule.startDate')}</Label>
                      <Input
                        type="date"
                        value={playlistScheduleForm.startDate || ''}
                        onChange={(e) =>
                          setPlaylistScheduleForm({ ...playlistScheduleForm, startDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('schedule.endDate')}</Label>
                      <Input
                        type="date"
                        value={playlistScheduleForm.endDate || ''}
                        onChange={(e) =>
                          setPlaylistScheduleForm({ ...playlistScheduleForm, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Days of Week */}
                {playlistScheduleForm.ruleType === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Active Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map(
                        (day) => {
                          const isActive = playlistScheduleForm.daysOfWeek?.includes(day);
                          return (
                            <Button
                              key={day}
                              type="button"
                              variant={isActive ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                const currentDays = playlistScheduleForm.daysOfWeek || [];
                                if (isActive) {
                                  setPlaylistScheduleForm({
                                    ...playlistScheduleForm,
                                    daysOfWeek: currentDays.filter(d => d !== day),
                                  });
                                } else {
                                  setPlaylistScheduleForm({
                                    ...playlistScheduleForm,
                                    daysOfWeek: [...currentDays, day],
                                  });
                                }
                              }}
                              className="min-w-[80px]"
                            >
                              {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                            </Button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                {/* Time Windows */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Active Time Windows</Label>
                      <p className="text-xs text-muted-foreground">
                        Playlist will only run during these times
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPlaylistScheduleForm({
                          ...playlistScheduleForm,
                          timeWindows: [...(playlistScheduleForm.timeWindows || []), { start: '09:00', end: '17:00' }],
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Window
                    </Button>
                  </div>
                  {playlistScheduleForm.timeWindows && playlistScheduleForm.timeWindows.length > 0 ? (
                    <div className="space-y-2">
                      {playlistScheduleForm.timeWindows.map((window, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="time"
                            value={window.start}
                            onChange={(e) => {
                              const newWindows = [...(playlistScheduleForm.timeWindows || [])];
                              newWindows[index] = { ...window, start: e.target.value };
                              setPlaylistScheduleForm({ ...playlistScheduleForm, timeWindows: newWindows });
                            }}
                            className="w-28"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={window.end}
                            onChange={(e) => {
                              const newWindows = [...(playlistScheduleForm.timeWindows || [])];
                              newWindows[index] = { ...window, end: e.target.value };
                              setPlaylistScheduleForm({ ...playlistScheduleForm, timeWindows: newWindows });
                            }}
                            className="w-28"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setPlaylistScheduleForm({
                                ...playlistScheduleForm,
                                timeWindows: playlistScheduleForm.timeWindows?.filter((_, i) => i !== index) || [],
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg border-dashed">
                      No time windows set - playlist will run at any time
                    </div>
                  )}
                </div>

                {/* Exclusion Dates */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <CalendarX className="h-4 w-4 text-red-500" />
                        Exclusion Dates
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Playlist will NOT run on these dates
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      id="add-playlist-exclusion-date"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById('add-playlist-exclusion-date') as HTMLInputElement;
                        if (input?.value) {
                          const currentDates = playlistScheduleForm.exclusionDates || [];
                          if (!currentDates.includes(input.value)) {
                            setPlaylistScheduleForm({
                              ...playlistScheduleForm,
                              exclusionDates: [...currentDates, input.value],
                            });
                          }
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {playlistScheduleForm.exclusionDates && playlistScheduleForm.exclusionDates.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {playlistScheduleForm.exclusionDates.map((date) => (
                        <Badge key={date} variant="destructive" className="flex items-center gap-1">
                          <Ban className="h-3 w-3" />
                          {new Date(date).toLocaleDateString()}
                          <button
                            type="button"
                            onClick={() => {
                              setPlaylistScheduleForm({
                                ...playlistScheduleForm,
                                exclusionDates: playlistScheduleForm.exclusionDates?.filter(d => d !== date) || [],
                              });
                            }}
                            className="ml-1 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setPlaylistScheduleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePlaylistSchedule} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Playlist Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Preview Modal */}
      <Dialog open={mediaPreviewOpen} onOpenChange={setMediaPreviewOpen}>
        <DialogContent className="!max-w-[900px] sm:!max-w-[900px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-green-600" />
              {previewingMedia?.name}
            </DialogTitle>
            <DialogDescription>
              {previewingMedia?.media_type === 'video' ? 'Video preview' : 'Image preview'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
            {previewingMedia && !showPreviewReplaceMedia && (
              <div className="w-full flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
                {previewingMedia.media_type === 'video' ? (
                  <video
                    src={previewingMedia.media_url}
                    controls
                    autoPlay
                    className="max-w-full max-h-[50vh] rounded"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <img
                    src={previewingMedia.media_url}
                    alt={previewingMedia.name}
                    className="max-w-full max-h-[50vh] object-contain rounded"
                  />
                )}
              </div>
            )}

            {/* Replace Media Section */}
            {showPreviewReplaceMedia && (
              <div className="space-y-4">
                {/* Selected Replacement Preview */}
                {previewSelectedMediaId && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="w-24 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                      {(() => {
                        const selectedMedia = replaceMediaAssets.find(m => m.id === previewSelectedMediaId);
                        return selectedMedia ? (
                          <img
                            src={selectedMedia.thumbnail_url || selectedMedia.file_url}
                            alt={selectedMedia.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">{t('editItemDialog.newMediaSelected')}</span>
                      </div>
                      <div className="font-medium text-sm truncate">
                        {replaceMediaAssets.find(m => m.id === previewSelectedMediaId)?.name}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewSelectedMediaId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('editItemDialog.searchMediaLibrary')}
                    value={replaceMediaSearch}
                    onChange={(e) => {
                      setReplaceMediaSearch(e.target.value);
                      setPreviewReplaceMediaPage(1);
                    }}
                    className="pl-9"
                  />
                </div>

                {/* Media count and pagination info */}
                {replaceMediaAssets.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((previewReplaceMediaPage - 1) * REPLACE_MEDIA_PAGE_SIZE + 1, replaceMediaAssets.length)}-{Math.min(previewReplaceMediaPage * REPLACE_MEDIA_PAGE_SIZE, replaceMediaAssets.length)} of {replaceMediaAssets.length} items
                  </div>
                )}

                {/* Media Grid */}
                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  {isLoadingReplaceMedia ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : replaceMediaAssets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {t('editItemDialog.noMediaFound')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 p-2">
                      {replaceMediaAssets
                        .slice((previewReplaceMediaPage - 1) * REPLACE_MEDIA_PAGE_SIZE, previewReplaceMediaPage * REPLACE_MEDIA_PAGE_SIZE)
                        .map((media) => {
                          const isSelected = previewSelectedMediaId === media.id;
                          const isCurrent = media.id === previewingMedia?.media_id;
                          return (
                            <div
                              key={media.id}
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                isSelected
                                  ? 'border-green-500 ring-2 ring-green-500/20'
                                  : isCurrent
                                  ? 'border-blue-500/50 opacity-50'
                                  : 'border-transparent hover:border-border'
                              }`}
                              onClick={() => {
                                if (!isCurrent) {
                                  setPreviewSelectedMediaId(media.id);
                                }
                              }}
                            >
                              <div className="aspect-video bg-muted">
                                <img
                                  src={media.thumbnail_url || media.file_url}
                                  alt={media.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="p-2">
                                <div className="text-xs font-medium truncate">{media.name}</div>
                              </div>
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                              {isCurrent && (
                                <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                                  <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">{t('editItemDialog.current')}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Pagination controls */}
                {replaceMediaAssets.length > REPLACE_MEDIA_PAGE_SIZE && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewReplaceMediaPage(p => Math.max(1, p - 1))}
                      disabled={previewReplaceMediaPage === 1}
                    >
                      {t('editItemDialog.previous')}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {t('editItemDialog.pageOf', { current: previewReplaceMediaPage, total: Math.ceil(replaceMediaAssets.length / REPLACE_MEDIA_PAGE_SIZE) })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewReplaceMediaPage(p => Math.min(Math.ceil(replaceMediaAssets.length / REPLACE_MEDIA_PAGE_SIZE), p + 1))}
                      disabled={previewReplaceMediaPage >= Math.ceil(replaceMediaAssets.length / REPLACE_MEDIA_PAGE_SIZE)}
                    >
                      {t('editItemDialog.next')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-4 border-t">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                {previewingMedia?.media_type && (
                  <span className="capitalize">{previewingMedia.media_type}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!showPreviewReplaceMedia ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPreviewReplaceMedia(true);
                        setPreviewReplaceMediaPage(1);
                        loadReplaceMedia();
                      }}
                    >
                      Replace Media
                    </Button>
                    <Button variant="outline" onClick={() => setMediaPreviewOpen(false)}>
                      Close
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPreviewReplaceMedia(false);
                        setPreviewSelectedMediaId(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePreviewReplaceMedia}
                      disabled={!previewSelectedMediaId || isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Replace & Close
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Insights Modal */}
      <Dialog open={aiInsightsOpen} onOpenChange={setAiInsightsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              AI Insights
            </DialogTitle>
            <DialogDescription>
              Get AI-powered analysis and recommendations for your playlist
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Preset Options */}
            {!aiInsightsResponse && !aiInsightsLoading && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Choose an insight type for <span className="font-medium text-foreground">{selectedPlaylist?.name || 'your playlist'}</span>:
                </p>
                <div className="grid gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-4 px-4 justify-start hover:border-purple-300 hover:bg-purple-50 transition-all group"
                    onClick={() => generateAIInsight('analysis')}
                  >
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600 mr-3 group-hover:bg-blue-200 transition-colors">
                      <ListMusic className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Playlist Analysis</div>
                      <div className="text-xs text-muted-foreground">
                        Get insights on content mix, structure, and flow
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 px-4 justify-start hover:border-purple-300 hover:bg-purple-50 transition-all group"
                    onClick={() => generateAIInsight('optimization')}
                  >
                    <div className="p-2 rounded-lg bg-green-100 text-green-600 mr-3 group-hover:bg-green-200 transition-colors">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Content Optimization</div>
                      <div className="text-xs text-muted-foreground">
                        Recommendations to improve engagement and effectiveness
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 px-4 justify-start hover:border-purple-300 hover:bg-purple-50 transition-all group"
                    onClick={() => generateAIInsight('engagement')}
                  >
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600 mr-3 group-hover:bg-amber-200 transition-colors">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Best Times for Engagement</div>
                      <div className="text-xs text-muted-foreground">
                        Optimal scheduling based on audience patterns
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {aiInsightsLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-30 animate-pulse" />
                  <div className="relative p-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                    <Sparkles className="h-8 w-8 text-white animate-pulse" />
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium">Analyzing your playlist...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedInsightType === 'analysis' && 'Examining content mix and structure'}
                  {selectedInsightType === 'optimization' && 'Finding optimization opportunities'}
                  {selectedInsightType === 'engagement' && 'Calculating optimal timing patterns'}
                </p>
              </div>
            )}

            {/* Response Display - Visual Infographic Cards */}
            {aiInsightsResponse && !aiInsightsLoading && (
              <div className="space-y-4">
                {/* Header with badge and stats */}
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {selectedInsightType === 'analysis' && 'Playlist Analysis'}
                      {selectedInsightType === 'optimization' && 'Content Optimization'}
                      {selectedInsightType === 'engagement' && 'Engagement Timing'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      for {selectedPlaylist?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    AI Generated
                  </div>
                </div>

                {/* Quick Stats Bar */}
                {selectedPlaylist && (
                  <div className="grid grid-cols-4 gap-2 p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{selectedPlaylist.items.length}</div>
                      <div className="text-xs text-muted-foreground">{t('table.items')}</div>
                    </div>
                    <div className="text-center border-l">
                      <div className="text-lg font-bold text-green-600">
                        {Math.floor(selectedPlaylist.items.reduce((sum, item) => sum + (item.duration || 0), 0) / 60)}m
                      </div>
                      <div className="text-xs text-muted-foreground">{t('table.duration')}</div>
                    </div>
                    <div className="text-center border-l">
                      <div className="text-lg font-bold text-purple-600">
                        {selectedPlaylist.items.filter(i => i.item_type === 'media').length}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('itemTypes.media')}</div>
                    </div>
                    <div className="text-center border-l">
                      <div className="text-lg font-bold text-amber-600">
                        {selectedPlaylist.items.filter(i => i.item_type === 'page').length}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('tabs2.pages')}</div>
                    </div>
                  </div>
                )}

                {/* Rendered AI Insights Cards */}
                {renderAIInsightsContent(aiInsightsResponse)}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            {aiInsightsResponse && (
              <Button
                variant="outline"
                onClick={() => {
                  setAiInsightsResponse('');
                  setSelectedInsightType('');
                }}
                className="mr-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Another
              </Button>
            )}
            <Button variant="outline" onClick={() => setAiInsightsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
