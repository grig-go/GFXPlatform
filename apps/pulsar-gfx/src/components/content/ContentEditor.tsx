import {
  Button,
  cn,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from '@emergent-platform/ui';
import { Type, Image, Hash, Save, RotateCcw, FileText, Library, MapPin, Palette, FilePlus, Search, ImagePlus, Loader2, Navigation, Clock, ChevronDown, ChevronRight, ChevronUp, Filter, Plus, Trash2, Edit2, Check, X, ScrollText } from 'lucide-react';
import type { TickerItem, TickerTopic } from '@emergent-platform/types';
import { TOPIC_BADGE_STYLES } from '@emergent-platform/types';
import * as LucideIcons from 'lucide-react';
import { usePageStore } from '@/stores/pageStore';
import { usePreviewStore } from '@/stores/previewStore';
import { useProjectStore } from '@/stores/projectStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useChannelStore } from '@/stores/channelStore';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { MediaPickerDialog } from '@/components/dialogs/MediaPickerDialog';

// Common Lucide icons for the icon picker
const COMMON_LUCIDE_ICONS = [
  'Sparkles', 'Star', 'Heart', 'Home', 'User', 'Settings', 'Search', 'Menu', 'X', 'Check',
  'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Play', 'Pause', 'Stop', 'Volume2',
  'Image', 'Video', 'Music', 'File', 'Folder', 'Download', 'Upload', 'Share', 'Copy',
  'Edit', 'Trash', 'Save', 'Plus', 'Minus', 'Eye', 'EyeOff', 'Lock', 'Unlock',
  'Mail', 'Phone', 'MessageCircle', 'Bell', 'Calendar', 'Clock', 'MapPin', 'Globe',
  'Zap', 'Sun', 'Moon', 'Cloud', 'CloudRain', 'CloudSnow', 'Wind', 'Thermometer',
  'ShoppingCart', 'CreditCard', 'DollarSign', 'TrendingUp', 'TrendingDown', 'BarChart',
  'Users', 'UserPlus', 'UserMinus', 'Shield', 'ShieldCheck', 'AlertCircle', 'Info',
  'CheckCircle', 'XCircle', 'AlertTriangle', 'HelpCircle', 'ThumbsUp', 'ThumbsDown',
  'Tv', 'Monitor', 'Smartphone', 'Tablet', 'Laptop', 'Camera', 'Mic', 'Radio',
  'Wifi', 'Bluetooth', 'Battery', 'Signal', 'Activity', 'Heart', 'Flame', 'Droplet',
  'Award', 'Trophy', 'Medal', 'Target', 'Flag', 'Bookmark', 'Tag', 'Hash',
  'AtSign', 'Link', 'Paperclip', 'Scissors', 'Ruler', 'Compass', 'Crosshair', 'Move',
];

// Location keyframe type (matching Nova GFX)
interface LocationKeyframe {
  id: string;
  time: number;
  lng: number;
  lat: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
  easing?: string;
  phase?: 'in' | 'loop' | 'out';
  locationName?: string;
}

interface FieldConfig {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'image' | 'icon' | 'icon-picker' | 'color' | 'map' | 'select' | 'ticker';
  placeholder?: string;
  defaultValue?: string | number;
  options?: { value: string; label: string }[];
  // For map fields with keyframes
  locationKeyframes?: LocationKeyframe[];
  // For ticker fields
  tickerItems?: TickerItem[];
}

// Icon libraries available
const ICON_LIBRARIES = [
  { value: 'lucide', label: 'Lucide Icons' },
  { value: 'heroicons', label: 'Heroicons' },
  { value: 'fontawesome', label: 'Font Awesome' },
  { value: 'material', label: 'Material Icons' },
];

// Helper to get elements from localStorage (PreviewPanel saves them there)
function getElementsFromLocalStorage(templateId: string): any[] {
  try {
    const previewDataStr = localStorage.getItem('nova-preview-data');
    if (previewDataStr) {
      const previewData = JSON.parse(previewDataStr);
      if (previewData.elements && Array.isArray(previewData.elements)) {
        return previewData.elements.filter((e: any) => e.template_id === templateId);
      }
    }
  } catch (e) {
    console.warn('[ContentEditor] Failed to read elements from localStorage:', e);
  }
  return [];
}

export function ContentEditor() {
  const { pages, updatePagePayload, createPage } = usePageStore();
  const { selectedTemplateId, selectedPageId, updatePreviewField, setPreviewPayload } = usePreviewStore();
  const { templates } = useProjectStore();
  const { currentPlaylist } = usePlaylistStore();
  const { selectedChannel } = useChannelStore();

  // Use previewStore as source of truth for what we're editing
  // This ensures ContentEditor stays in sync with PreviewPanel
  const previewPage = useMemo(() => {
    if (!selectedPageId) return null;
    return pages.find(p => p.id === selectedPageId) || null;
  }, [selectedPageId, pages]);

  // Only use template if no page is being previewed
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId || selectedPageId) return null;
    return templates.find(t => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, selectedPageId, templates]);

  // Get elements directly from localStorage (PreviewPanel already loaded them)
  const templateElements = useMemo(() => {
    if (!selectedTemplateId || selectedPageId) return [];
    const elements = getElementsFromLocalStorage(selectedTemplateId);
    console.log('[ContentEditor] Got', elements.length, 'elements from localStorage for template:', selectedTemplateId);
    return elements;
  }, [selectedTemplateId, selectedPageId]);

  const [localPayload, setLocalPayload] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerFieldId, setIconPickerFieldId] = useState<string | null>(null);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerFieldId, setMediaPickerFieldId] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationPickerFieldId, setLocationPickerFieldId] = useState<string | null>(null);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState<Array<{ id: string; name: string; lng: number; lat: number; zoom?: number }>>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Keyframe location picker state
  const [showKeyframeLocationPicker, setShowKeyframeLocationPicker] = useState(false);
  const [keyframePickerFieldId, setKeyframePickerFieldId] = useState<string | null>(null);
  const [keyframePickerKeyframeId, setKeyframePickerKeyframeId] = useState<string | null>(null);
  const [keyframeSearchQuery, setKeyframeSearchQuery] = useState('');
  const [keyframeSearchResults, setKeyframeSearchResults] = useState<Array<{ id: string; name: string; lng: number; lat: number; zoom?: number }>>([]);
  const [isSearchingKeyframeLocation, setIsSearchingKeyframeLocation] = useState(false);
  const [keyframePhaseFilter, setKeyframePhaseFilter] = useState<'in' | 'loop' | 'out' | null>(null);
  const [expandedMapFields, setExpandedMapFields] = useState<Set<string>>(new Set());

  // Quick locations for map picker
  const quickLocations = useMemo(() => [
    { id: 'nyc', name: 'New York City', lng: -74.006, lat: 40.7128, zoom: 12 },
    { id: 'la', name: 'Los Angeles', lng: -118.2437, lat: 34.0522, zoom: 11 },
    { id: 'chicago', name: 'Chicago', lng: -87.6298, lat: 41.8781, zoom: 11 },
    { id: 'miami', name: 'Miami', lng: -80.1918, lat: 25.7617, zoom: 12 },
    { id: 'seattle', name: 'Seattle', lng: -122.3321, lat: 47.6062, zoom: 12 },
    { id: 'london', name: 'London', lng: -0.1278, lat: 51.5074, zoom: 11 },
    { id: 'paris', name: 'Paris', lng: 2.3522, lat: 48.8566, zoom: 12 },
    { id: 'tokyo', name: 'Tokyo', lng: 139.6917, lat: 35.6895, zoom: 11 },
    { id: 'sydney', name: 'Sydney', lng: 151.2093, lat: -33.8688, zoom: 11 },
    { id: 'dubai', name: 'Dubai', lng: 55.2708, lat: 25.2048, zoom: 11 },
  ], []);

  // Search for locations using Mapbox Geocoding API
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setLocationSearchResults([]);
      return;
    }

    setIsSearchingLocation(true);
    try {
      const mapboxKey = 'pk.eyJ1IjoiZW1lcmdlbnRzb2x1dGlvbnMiLCJhIjoiY21mbGJuanZ1MDNhdDJqcTU1cHVjcWJycCJ9.Tk2txI10-WExxSoPnHlu_g';
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxKey}&limit=5`
      );
      const data = await response.json();

      if (data.features) {
        const results = data.features.map((feature: any, index: number) => ({
          id: `search-${index}`,
          name: feature.place_name,
          lng: feature.center[0],
          lat: feature.center[1],
          zoom: feature.bbox ? 10 : 14,
        }));
        setLocationSearchResults(results);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setLocationSearchResults([]);
    } finally {
      setIsSearchingLocation(false);
    }
  }, []);

  // Handle location selection
  const handleLocationSelect = useCallback((location: { lng: number; lat: number; zoom?: number }) => {
    if (locationPickerFieldId) {
      // Store as "lat, lng" format for display, but also store center array for map
      const coordString = `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
      handleFieldChange(locationPickerFieldId, coordString);

      // Also update the map center directly if possible
      // The preview will need to parse this and update the map
    }
    setShowLocationPicker(false);
    setLocationPickerFieldId(null);
    setLocationSearchQuery('');
    setLocationSearchResults([]);
  }, [locationPickerFieldId]);

  // Search for keyframe locations using Mapbox Geocoding API
  const searchKeyframeLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setKeyframeSearchResults([]);
      return;
    }

    setIsSearchingKeyframeLocation(true);
    try {
      const mapboxKey = 'pk.eyJ1IjoiZW1lcmdlbnRzb2x1dGlvbnMiLCJhIjoiY21mbGJuanZ1MDNhdDJqcTU1cHVjcWJycCJ9.Tk2txI10-WExxSoPnHlu_g';
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxKey}&limit=5`
      );
      const data = await response.json();

      if (data.features) {
        const results = data.features.map((feature: any, index: number) => ({
          id: `search-${index}`,
          name: feature.place_name,
          lng: feature.center[0],
          lat: feature.center[1],
          zoom: feature.bbox ? 10 : 14,
        }));
        setKeyframeSearchResults(results);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setKeyframeSearchResults([]);
    } finally {
      setIsSearchingKeyframeLocation(false);
    }
  }, []);

  // Handle keyframe location selection
  const handleKeyframeLocationSelect = useCallback((location: { name: string; lng: number; lat: number; zoom?: number }) => {
    if (keyframePickerFieldId && keyframePickerKeyframeId) {
      // Get current keyframes from payload
      const currentKeyframes = localPayload[`${keyframePickerFieldId}_keyframes`] as LocationKeyframe[] || [];

      // Update the specific keyframe
      const updatedKeyframes = currentKeyframes.map(kf =>
        kf.id === keyframePickerKeyframeId
          ? { ...kf, lng: location.lng, lat: location.lat, zoom: location.zoom || kf.zoom, locationName: location.name }
          : kf
      );

      // Update payload with modified keyframes
      setLocalPayload(prev => ({
        ...prev,
        [`${keyframePickerFieldId}_keyframes`]: updatedKeyframes
      }));
      setHasChanges(true);

      // Update preview - send keyframes directly (not as JSON string)
      updatePreviewField(`${keyframePickerFieldId}_keyframes`, updatedKeyframes);
    }

    setShowKeyframeLocationPicker(false);
    setKeyframePickerFieldId(null);
    setKeyframePickerKeyframeId(null);
    setKeyframeSearchQuery('');
    setKeyframeSearchResults([]);
  }, [keyframePickerFieldId, keyframePickerKeyframeId, localPayload, updatePreviewField]);

  // Toggle map field expansion
  const toggleMapFieldExpanded = useCallback((fieldId: string) => {
    setExpandedMapFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  }, []);

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!iconSearchQuery) return COMMON_LUCIDE_ICONS;
    const query = iconSearchQuery.toLowerCase();
    return COMMON_LUCIDE_ICONS.filter(name => name.toLowerCase().includes(query));
  }, [iconSearchQuery]);

  // Sync local state when selected page or template changes
  useEffect(() => {
    if (previewPage) {
      // For pages, also include keyframes from template elements
      const payload = { ...(previewPage.payload || {}) };

      // Get template elements to extract keyframes
      const pageTemplateElements = previewPage.templateId
        ? getElementsFromLocalStorage(previewPage.templateId)
        : [];

      pageTemplateElements.forEach((el: any) => {
        const elType = el.elementType || el.element_type;
        const isMap = elType === 'map' || el.content?.type === 'map';
        if (isMap && el.content?.locationKeyframes?.length > 0) {
          // Initialize keyframes in payload if not already present
          if (!payload[`${el.id}_keyframes`]) {
            payload[`${el.id}_keyframes`] = el.content.locationKeyframes;
          }
        }
      });

      setLocalPayload(payload);
      // Initialize preview payload with page payload for real-time preview
      setPreviewPayload(payload);
      setHasChanges(false);
    } else if (selectedTemplate) {
      // For templates, initialize with default values from elements (using localStorage)
      const defaultPayload: Record<string, any> = {};
      if (templateElements.length > 0) {
        templateElements.forEach((el: any) => {
          // Check elementType, element_type (snake_case from DB), and content.type for flexibility
          const elType = el.elementType || el.element_type;
          const isText = elType === 'text' || el.content?.type === 'text';
          const isImage = elType === 'image' || el.content?.type === 'image';
          const isShape = elType === 'shape' || el.content?.type === 'shape';
          const isMap = elType === 'map' || el.content?.type === 'map';

          if (isMap) {
            // Store map center and keyframes
            if (el.content?.center) {
              defaultPayload[el.id] = `${el.content.center[1]}, ${el.content.center[0]}`;
            }
            if (el.content?.locationKeyframes?.length > 0) {
              defaultPayload[`${el.id}_keyframes`] = el.content.locationKeyframes;
            }
          } else if (isText) {
            defaultPayload[el.id] = el.content?.text || '';
          } else if (isImage) {
            if (el.name.toLowerCase().includes('icon')) {
              defaultPayload[`${el.id}_library`] = el.content?.iconLibrary || 'lucide';
              defaultPayload[el.id] = el.content?.icon || el.content?.text || 'Star';
            } else {
              defaultPayload[el.id] = el.content?.src || el.content?.url || '';
            }
          } else if (isShape) {
            if (el.content?.fill || el.name.toLowerCase().includes('color')) {
              defaultPayload[el.id] = el.content?.fill || '#000000';
            }
          }
        });
      }
      setLocalPayload(defaultPayload);
      setPreviewPayload(defaultPayload);
      setHasChanges(false);
    } else {
      setLocalPayload({});
      setPreviewPayload({});
      setHasChanges(false);
    }
  }, [previewPage?.id, selectedTemplateId, templateElements]);

  // Infer field type from key name
  const inferFieldType = (key: string, value: any): FieldConfig['type'] => {
    const keyLower = key.toLowerCase();

    // Icon library selector
    if (keyLower.includes('icon_library') || keyLower.includes('iconlibrary')) {
      return 'icon';
    }
    // Color fields
    if (keyLower.includes('color') || keyLower.includes('colour')) {
      return 'color';
    }
    // Map/location fields
    if (keyLower.includes('lat') || keyLower.includes('lng') || keyLower.includes('longitude') ||
        keyLower.includes('latitude') || keyLower.includes('location') || keyLower.includes('coordinates')) {
      return 'map';
    }
    // Image fields
    if (typeof value === 'string' && (value.startsWith('http') || keyLower.includes('image') || keyLower.includes('img') || keyLower.includes('url'))) {
      return 'image';
    }
    // Number fields
    if (typeof value === 'number') {
      return 'number';
    }
    // Long text
    if (typeof value === 'string' && value.length > 100) {
      return 'textarea';
    }

    return 'text';
  };

  // Get field configs inferred from payload or template elements
  const getFieldConfigs = (): FieldConfig[] => {
    if (previewPage) {
      // For pages, get template elements to determine field types accurately
      const pageTemplateElements = previewPage.templateId
        ? getElementsFromLocalStorage(previewPage.templateId)
        : [];

      // Build a map of element ID -> element for quick lookup
      const elementMap = new Map<string, any>();
      pageTemplateElements.forEach((el: any) => {
        elementMap.set(el.id, el);
      });

      // Infer from page payload keys, but use template element info when available
      const payload = previewPage.payload || {};

      // First, add ticker fields for all ticker elements in the template (even if not in payload)
      const tickerFields: FieldConfig[] = [];
      pageTemplateElements.forEach((el: any) => {
        const elType = el.elementType || el.element_type;
        const isTicker = elType === 'ticker' || el.content?.type === 'ticker';
        if (isTicker) {
          const itemsKey = `${el.id}_items`;
          const tickerItems = payload[itemsKey] || el.content?.items || [];
          tickerFields.push({
            id: el.id,
            label: el.name || 'Ticker',
            type: 'ticker' as const,
            tickerItems: tickerItems,
          });
        }
      });

      const payloadFields = Object.keys(payload)
        // Filter out _keyframes and _items keys - they're handled by their respective field sections
        .filter(key => !key.endsWith('_keyframes') && !key.endsWith('_items'))
        // Filter out ticker element IDs (they're handled above)
        .filter(key => {
          const element = elementMap.get(key);
          if (element) {
            const elType = element.elementType || element.element_type;
            const isTicker = elType === 'ticker' || element.content?.type === 'ticker';
            return !isTicker;
          }
          return true;
        })
        .map((key) => {
        const value = payload[key];

        // Check if this key is an element ID and get its type from the template
        const element = elementMap.get(key);
        if (element) {
          const elType = element.elementType || element.element_type;
          const isMap = elType === 'map' || element.content?.type === 'map';
          const isImage = elType === 'image' || element.content?.type === 'image';
          const isText = elType === 'text' || element.content?.type === 'text';

          if (isMap) {
            // Get keyframes from page payload first, then fall back to template element
            const keyframesKey = `${key}_keyframes`;
            const keyframes = payload[keyframesKey] || element.content?.locationKeyframes || [];
            return {
              id: key,
              label: element.name || formatLabel(key),
              type: 'map' as const,
              defaultValue: value ?? undefined,
              locationKeyframes: keyframes,
            };
          } else if (isImage) {
            return {
              id: key,
              label: element.name || formatLabel(key),
              type: 'image' as const,
              defaultValue: value ?? undefined,
            };
          } else if (isText) {
            return {
              id: key,
              label: element.name || formatLabel(key),
              type: 'text' as const,
              defaultValue: value ?? undefined,
            };
          }
        }

        // Fallback to inference by key name and value
        const type = inferFieldType(key, value);

        return {
          id: key,
          label: formatLabel(key),
          type,
          defaultValue: value ?? undefined,
          options: type === 'icon' ? ICON_LIBRARIES : undefined,
        };
      });

      // Combine ticker fields with payload fields
      return [...tickerFields, ...payloadFields];
    }

    // Check if template has elements with content (use localStorage elements)
    if (selectedTemplate && templateElements.length > 0) {
      // Get editable elements from template
      const fields: FieldConfig[] = [];

      console.log('[ContentEditor] getFieldConfigs - processing', templateElements.length, 'elements from localStorage');

      templateElements.forEach((el: any) => {
        // Check elementType, element_type (snake_case from DB), and content.type for flexibility
        const elType = el.elementType || el.element_type;
        const isText = elType === 'text' || el.content?.type === 'text';
        const isImage = elType === 'image' || el.content?.type === 'image';
        const isShape = elType === 'shape' || el.content?.type === 'shape';
        const isMap = elType === 'map' || el.content?.type === 'map';
        const isTicker = elType === 'ticker' || el.content?.type === 'ticker';

        console.log('[ContentEditor] Element:', el.name, 'type:', elType, 'content.type:', el.content?.type, 'isText:', isText, 'isImage:', isImage, 'isShape:', isShape, 'isMap:', isMap, 'isTicker:', isTicker);

        if (isTicker) {
          // Ticker element - add ticker items editor
          fields.push({
            id: el.id,
            label: el.name,
            type: 'ticker' as const,
            tickerItems: el.content?.items || [],
          });
        } else if (isMap) {
          // Map element - add location field with keyframes if available
          fields.push({
            id: el.id,
            label: el.name,
            type: 'map' as const,
            defaultValue: el.content?.center ? `${el.content.center[1]}, ${el.content.center[0]}` : '',
            locationKeyframes: el.content?.locationKeyframes || [],
          });
        } else if (isText) {
          fields.push({
            id: el.id,
            label: el.name,
            type: 'text' as const,
            defaultValue: el.content?.text || '',
          });
        } else if (isImage) {
          // Check if it's an icon or regular image
          if (el.name.toLowerCase().includes('icon')) {
            fields.push({
              id: `${el.id}_library`,
              label: 'Icon Library',
              type: 'icon' as const,
              defaultValue: el.content?.iconLibrary || 'lucide',
              options: ICON_LIBRARIES,
            });
            fields.push({
              id: el.id,
              label: 'Icon',
              type: 'icon-picker' as const,
              defaultValue: el.content?.icon || el.content?.text || 'Star',
            });
          } else {
            fields.push({
              id: el.id,
              label: el.name,
              type: 'image' as const,
              defaultValue: el.content?.src || el.content?.url || '',
              placeholder: 'Image URL...',
            });
          }
        } else if (isShape) {
          // Shape elements may have color
          if (el.content?.fill || el.name.toLowerCase().includes('color')) {
            fields.push({
              id: el.id,
              label: el.name,
              type: 'color' as const,
              defaultValue: el.content?.fill || '#000000',
            });
          }
        }
      });

      return fields;
    }

    return [];
  };

  const formatLabel = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const handleFieldChange = (fieldId: string, value: string | number) => {
    setLocalPayload((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    setHasChanges(true);
    // Always update the preview payload for real-time updates
    // This works for both templates and pages
    updatePreviewField(fieldId, String(value));
  };

  const handleSave = async () => {
    if (previewPage && hasChanges) {
      setIsSaving(true);
      try {
        await updatePagePayload(previewPage.id, localPayload);
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to save page:', error);
      } finally {
        setIsSaving(false);
      }
    }
    // For templates, no save needed - preview is live
  };

  // Handle Save As Page button click - saves directly to current playlist
  // Works for both templates (create new) and pages (save as copy)
  const handleSaveAsClick = useCallback(async () => {
    if (!currentPlaylist) return;

    // Get the template ID - either from selected template or from the selected page
    const templateId = selectedTemplate?.id || previewPage?.templateId;
    const templateName = selectedTemplate?.name ||
      (previewPage?.templateId ? templates.find(t => t.id === previewPage.templateId)?.name : null);

    if (!templateId) return;

    setIsSaving(true);
    try {
      // Generate a unique page name using template name + timestamp
      const timestamp = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const pageName = `${templateName || 'Page'} ${timestamp}`;

      console.log('[ContentEditor] Creating page with channel:', selectedChannel?.id, selectedChannel?.channelCode);
      await createPage(
        currentPlaylist.id,
        templateId,
        pageName,
        localPayload,
        selectedChannel?.id || null  // use selected channel as default
      );
      setHasChanges(false);
      console.log('Page saved successfully to playlist:', currentPlaylist.id, 'with channel:', selectedChannel?.id);
    } catch (error) {
      console.error('Failed to save page:', error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedTemplate, previewPage, currentPlaylist, localPayload, createPage, templates, selectedChannel]);

  const handleReset = () => {
    if (previewPage) {
      setLocalPayload(previewPage.payload || {});
      setHasChanges(false);
    } else if (selectedTemplate) {
      // Reset to default template values (using localStorage elements)
      const defaultPayload: Record<string, any> = {};
      if (templateElements.length > 0) {
        templateElements.forEach((el: any) => {
          // Check elementType, element_type (snake_case from DB), and content.type for flexibility
          const elType = el.elementType || el.element_type;
          const isText = elType === 'text' || el.content?.type === 'text';
          const isImage = elType === 'image' || el.content?.type === 'image';
          const isShape = elType === 'shape' || el.content?.type === 'shape';

          if (isText) {
            defaultPayload[el.id] = el.content?.text || '';
          } else if (isImage) {
            if (el.name.toLowerCase().includes('icon')) {
              defaultPayload[`${el.id}_library`] = el.content?.iconLibrary || 'lucide';
              defaultPayload[el.id] = el.content?.icon || el.content?.text || 'Star';
            } else {
              defaultPayload[el.id] = el.content?.src || el.content?.url || '';
            }
          } else if (isShape) {
            if (el.content?.fill || el.name.toLowerCase().includes('color')) {
              defaultPayload[el.id] = el.content?.fill || '#000000';
            }
          }
        });
      }
      setLocalPayload(defaultPayload);
      setPreviewPayload({});
      setHasChanges(false);
    }
  };

  const fields = getFieldConfigs();

  // Auto-expand map fields with keyframes by default
  useEffect(() => {
    const mapFieldsWithKeyframes = fields
      .filter(f => f.type === 'map' && f.locationKeyframes && f.locationKeyframes.length > 0)
      .map(f => f.id);

    if (mapFieldsWithKeyframes.length > 0) {
      setExpandedMapFields(prev => {
        const next = new Set(prev);
        mapFieldsWithKeyframes.forEach(id => next.add(id));
        return next;
      });
    }
  }, [fields.map(f => f.id).join(',')]); // Re-run when field IDs change

  const getFieldIcon = (type: FieldConfig['type']) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3.5 h-3.5" />;
      case 'image':
        return <Image className="w-3.5 h-3.5" />;
      case 'textarea':
        return <FileText className="w-3.5 h-3.5" />;
      case 'icon':
        return <Library className="w-3.5 h-3.5" />;
      case 'color':
        return <Palette className="w-3.5 h-3.5" />;
      case 'map':
        return <MapPin className="w-3.5 h-3.5" />;
      case 'ticker':
        return <ScrollText className="w-3.5 h-3.5" />;
      default:
        return <Type className="w-3.5 h-3.5" />;
    }
  };

  // Get template name for badge display
  const getTemplateName = (): string | null => {
    if (previewPage?.template) {
      return previewPage.template.name;
    }
    if (selectedTemplate) {
      return selectedTemplate.name;
    }
    return null;
  };

  const templateName = getTemplateName();

  if (!previewPage && !selectedTemplate) {
    return (
      <div className="h-full flex flex-col bg-card/50 backdrop-blur-sm">
        <div className="h-9 sm:h-10 flex items-center px-2 sm:px-3 border-b border-border shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
            <span className="text-xs sm:text-sm font-medium">Content Editor</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center p-4">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs sm:text-sm">Select a template or page to edit content</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card/50 backdrop-blur-sm">
      {/* Header with template badge */}
      <div className="h-9 sm:h-10 flex items-center justify-between px-2 sm:px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">Content Editor</span>
          {templateName && (
            <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 truncate max-w-[120px]">
              {templateName}
            </span>
          )}
        </div>

        {/* Save/Reset buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            disabled={!hasChanges}
            className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
          {/* Page selected: Show Save (update) and Save As (new page) */}
          {previewPage && (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={cn(
                  'h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs',
                  hasChanges && 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0'
                )}
              >
                <Save className="w-3 h-3 mr-1" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              {currentPlaylist && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveAsClick}
                  disabled={isSaving}
                  className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs"
                >
                  <FilePlus className="w-3 h-3 mr-1" />
                  Save As
                </Button>
              )}
            </>
          )}
          {/* Template selected: Show Save (creates new page) */}
          {selectedTemplate && !previewPage && currentPlaylist && (
            <Button
              size="sm"
              onClick={handleSaveAsClick}
              disabled={isSaving}
              className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0"
            >
              <Save className="w-3 h-3 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-3 flex flex-col">
        {fields.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-xs sm:text-sm">No editable fields</p>
            <p className="text-[10px] sm:text-xs mt-1 opacity-60">
              {selectedTemplate
                ? `Template has ${templateElements.length} elements (none editable)`
                : 'This page has no content payload'}
            </p>
            {selectedTemplate && templateElements.length === 0 && (
              <p className="text-[10px] sm:text-xs mt-2 opacity-40">
                Add text/image elements in Nova GFX editor
              </p>
            )}
          </div>
        ) : (
          fields.map((field) => (
            <div key={field.id} className={cn("space-y-1", field.type === 'ticker' && "flex-1 flex flex-col min-h-0")}>
              <Label className="text-[10px] sm:text-xs flex items-center gap-1.5 text-muted-foreground">
                {getFieldIcon(field.type)}
                {field.label}
              </Label>

              {field.type === 'textarea' ? (
                <Textarea
                  value={localPayload[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="text-xs sm:text-sm min-h-[60px] resize-none"
                />
              ) : field.type === 'number' ? (
                <Input
                  type="number"
                  value={localPayload[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || 0)}
                  placeholder={field.placeholder}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                />
              ) : field.type === 'icon' ? (
                <Select
                  value={localPayload[field.id] || field.defaultValue || 'lucide'}
                  onValueChange={(value) => handleFieldChange(field.id, value)}
                >
                  <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
                    <SelectValue placeholder="Select library..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_LIBRARIES.map((lib) => (
                      <SelectItem key={lib.value} value={lib.value}>
                        {lib.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'image' ? (
                <div
                  className={cn(
                    'w-full rounded overflow-hidden cursor-pointer group relative border border-border',
                    localPayload[field.id] ? 'h-32 bg-black/50' : 'h-24 bg-muted/50'
                  )}
                  onClick={() => {
                    setMediaPickerFieldId(field.id);
                    setShowMediaPicker(true);
                  }}
                >
                  {localPayload[field.id] ? (
                    <>
                      <img
                        src={localPayload[field.id]}
                        alt={field.label}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImagePlus className="w-6 h-6 text-white mr-2" />
                        <span className="text-white text-sm font-medium">Change Image</span>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2">
                      <ImagePlus className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Select Image</span>
                    </div>
                  )}
                </div>
              ) : field.type === 'color' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localPayload[field.id] || '#000000'}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={localPayload[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder="#000000"
                    className="h-7 sm:h-8 text-xs sm:text-sm flex-1"
                  />
                </div>
              ) : field.type === 'icon-picker' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIconPickerFieldId(field.id);
                    setIconSearchQuery('');
                    setShowIconPicker(true);
                  }}
                  className="h-10 w-full justify-start gap-2 text-xs"
                >
                  {(() => {
                    const iconName = localPayload[field.id] || field.defaultValue || 'Star';
                    const IconComponent = (LucideIcons as any)[iconName];
                    return IconComponent ? (
                      <>
                        <IconComponent className="w-5 h-5" />
                        <span>{iconName}</span>
                      </>
                    ) : (
                      <span>Select icon...</span>
                    );
                  })()}
                </Button>
              ) : field.type === 'map' ? (
                <div className="space-y-2">
                  {/* Map center location picker - only show if no keyframes exist */}
                  {(() => {
                    const keyframes = (localPayload[`${field.id}_keyframes`] || field.locationKeyframes || []) as LocationKeyframe[];
                    const hasKeyframes = keyframes.length > 0;

                    if (hasKeyframes) return null;

                    return (
                      <div
                        className="w-full h-16 rounded overflow-hidden cursor-pointer group relative border border-border bg-muted/50"
                        onClick={() => {
                          setLocationPickerFieldId(field.id);
                          setLocationSearchQuery('');
                          setLocationSearchResults([]);
                          setShowLocationPicker(true);
                        }}
                      >
                        <div className="h-full flex items-center justify-center gap-2">
                          <Navigation className="w-5 h-5 text-cyan-400" />
                          {localPayload[field.id] ? (
                            <span className="text-xs text-foreground font-medium">{localPayload[field.id]}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Set Default Location</span>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-white mr-1" />
                          <span className="text-white text-xs font-medium">Change Location</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Location Keyframes Section */}
                  {(() => {
                    // Get keyframes from payload or field config
                    const keyframes = (localPayload[`${field.id}_keyframes`] || field.locationKeyframes || []) as LocationKeyframe[];
                    const hasKeyframes = keyframes.length > 0;
                    const isExpanded = expandedMapFields.has(field.id);

                    if (!hasKeyframes) return null;

                    // Filter keyframes by phase
                    const filteredKeyframes = keyframePhaseFilter
                      ? keyframes.filter(kf => (kf.phase || 'in') === keyframePhaseFilter)
                      : keyframes;

                    return (
                      <div className="border border-cyan-500/30 rounded-md bg-cyan-500/5">
                        {/* Header - click to expand */}
                        <button
                          onClick={() => toggleMapFieldExpanded(field.id)}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] hover:bg-cyan-500/10 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 text-cyan-400" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-cyan-400" />
                            )}
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span className="text-cyan-300 font-medium">
                              Flight Path ({keyframes.length} keyframes)
                            </span>
                          </div>
                        </button>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-2 pb-2 space-y-2">
                            {/* Phase filter */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <Filter className="w-2.5 h-2.5 text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground">Filter:</span>
                              <div className="flex gap-0.5">
                                {(['all', 'in', 'loop', 'out'] as const).map((phase) => {
                                  const isActive = phase === 'all' ? keyframePhaseFilter === null : keyframePhaseFilter === phase;
                                  const colors = {
                                    all: 'bg-muted text-foreground',
                                    in: 'bg-emerald-500/30 text-emerald-300',
                                    loop: 'bg-violet-500/30 text-violet-300',
                                    out: 'bg-amber-500/30 text-amber-300',
                                  };
                                  return (
                                    <button
                                      key={phase}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setKeyframePhaseFilter(phase === 'all' ? null : phase);
                                      }}
                                      className={cn(
                                        'px-1.5 py-0.5 text-[8px] rounded transition-colors',
                                        isActive ? colors[phase] : 'text-muted-foreground hover:text-foreground'
                                      )}
                                    >
                                      {phase.toUpperCase()}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Keyframes list */}
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {filteredKeyframes
                                .sort((a, b) => a.time - b.time)
                                .map((kf, index) => {
                                  const phase = kf.phase || 'in';
                                  const phaseColors = {
                                    in: 'border-emerald-500/40 bg-emerald-500/10',
                                    loop: 'border-violet-500/40 bg-violet-500/10',
                                    out: 'border-amber-500/40 bg-amber-500/10',
                                  };
                                  const phaseBadgeColors = {
                                    in: 'bg-emerald-500/30 text-emerald-300',
                                    loop: 'bg-violet-500/30 text-violet-300',
                                    out: 'bg-amber-500/30 text-amber-300',
                                  };

                                  return (
                                    <div
                                      key={kf.id}
                                      className={cn(
                                        'p-1.5 rounded border transition-colors',
                                        phaseColors[phase]
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className={cn('px-1 py-0.5 text-[8px] rounded', phaseBadgeColors[phase])}>
                                            {phase.toUpperCase()}
                                          </span>
                                          <span className="text-[9px] text-muted-foreground">
                                            #{index + 1} @ {(kf.time / 1000).toFixed(1)}s
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 px-1.5 text-[9px]"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setKeyframePickerFieldId(field.id);
                                            setKeyframePickerKeyframeId(kf.id);
                                            setKeyframeSearchQuery('');
                                            setKeyframeSearchResults([]);
                                            setShowKeyframeLocationPicker(true);
                                          }}
                                        >
                                          <MapPin className="w-2.5 h-2.5 mr-0.5" />
                                          Set
                                        </Button>
                                      </div>
                                      <div className="mt-1 text-[9px] text-muted-foreground truncate">
                                        {kf.locationName || `${kf.lat.toFixed(4)}, ${kf.lng.toFixed(4)}`}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>

                            {filteredKeyframes.length === 0 && (
                              <p className="text-[9px] text-muted-foreground text-center py-2">
                                No keyframes for selected phase
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : field.type === 'ticker' ? (
                <TickerContentEditor
                  fieldId={field.id}
                  items={(localPayload[`${field.id}_items`] as TickerItem[] | undefined) || field.tickerItems || []}
                  onItemsChange={(items) => {
                    setLocalPayload((prev) => ({
                      ...prev,
                      [`${field.id}_items`]: items,
                    }));
                    setHasChanges(true);
                    // Update preview with items array
                    updatePreviewField(`${field.id}_items`, JSON.stringify(items));
                  }}
                />
              ) : (
                <Input
                  type="text"
                  value={localPayload[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Status bar */}
      {hasChanges && (
        <div className="h-7 flex items-center justify-center px-2 border-t border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] sm:text-xs">
          Unsaved changes
        </div>
      )}

      {/* Icon Picker Dialog */}
      <Dialog open={showIconPicker} onOpenChange={setShowIconPicker}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Icon</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search icons..."
                value={iconSearchQuery}
                onChange={(e) => setIconSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Icons Grid */}
            <ScrollArea className="flex-1 min-h-[300px]">
              <div className="grid grid-cols-8 gap-2 p-1">
                {filteredIcons.map((iconName) => {
                  const IconComponent = (LucideIcons as any)[iconName];
                  if (!IconComponent) return null;

                  const isSelected = iconPickerFieldId && localPayload[iconPickerFieldId] === iconName;

                  return (
                    <button
                      key={iconName}
                      onClick={() => {
                        if (iconPickerFieldId) {
                          handleFieldChange(iconPickerFieldId, iconName);
                        }
                        setShowIconPicker(false);
                      }}
                      className={cn(
                        'flex items-center justify-center p-2.5 rounded-lg border-2 transition-colors',
                        'hover:bg-cyan-500/20 hover:border-cyan-500',
                        isSelected
                          ? 'bg-cyan-500/30 border-cyan-500'
                          : 'border-border bg-muted'
                      )}
                      title={iconName}
                    >
                      <IconComponent className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <p className="text-xs text-muted-foreground text-center">
              {filteredIcons.length} icons available
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Picker Dialog */}
      <MediaPickerDialog
        open={showMediaPicker}
        onOpenChange={setShowMediaPicker}
        onSelect={(url) => {
          if (mediaPickerFieldId) {
            handleFieldChange(mediaPickerFieldId, url);
          }
          setShowMediaPicker(false);
          setMediaPickerFieldId(null);
        }}
        mediaType="image"
        title="Select Image"
      />

      {/* Location Picker Dialog */}
      <Dialog open={showLocationPicker} onOpenChange={setShowLocationPicker}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              Search Location
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search city, address, or place..."
                  value={locationSearchQuery}
                  onChange={(e) => setLocationSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchLocation(locationSearchQuery)}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={() => searchLocation(locationSearchQuery)}
                disabled={isSearchingLocation}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {isSearchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </div>

            {/* Search Results */}
            {locationSearchResults.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Search Results</p>
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-1">
                    {locationSearchResults.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => handleLocationSelect(location)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-500/20 transition-colors flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="text-sm truncate">{location.name}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Quick Locations */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Quick Locations</p>
              <div className="grid grid-cols-2 gap-2">
                {quickLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleLocationSelect(location)}
                    className="px-3 py-2 rounded-lg border border-border hover:border-cyan-500 hover:bg-cyan-500/10 transition-colors text-left"
                  >
                    <span className="text-sm font-medium">{location.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Coordinates */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Or enter coordinates manually (lat, lng)</p>
              <div className="flex gap-2">
                <Input
                  placeholder="40.7128, -74.0060"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value;
                      const parts = value.split(',').map(s => parseFloat(s.trim()));
                      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        handleLocationSelect({ lat: parts[0], lng: parts[1], zoom: 12 });
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyframe Location Picker Dialog */}
      <Dialog open={showKeyframeLocationPicker} onOpenChange={setShowKeyframeLocationPicker}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Set Keyframe Location
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search city, address, or place..."
                  value={keyframeSearchQuery}
                  onChange={(e) => setKeyframeSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchKeyframeLocation(keyframeSearchQuery)}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={() => searchKeyframeLocation(keyframeSearchQuery)}
                disabled={isSearchingKeyframeLocation}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {isSearchingKeyframeLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </div>

            {/* Search Results */}
            {keyframeSearchResults.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Search Results</p>
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-1">
                    {keyframeSearchResults.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => handleKeyframeLocationSelect(location)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-500/20 transition-colors flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="text-sm truncate">{location.name}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Quick Locations */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Quick Locations</p>
              <div className="grid grid-cols-2 gap-2">
                {quickLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleKeyframeLocationSelect(location)}
                    className="px-3 py-2 rounded-lg border border-border hover:border-cyan-500 hover:bg-cyan-500/10 transition-colors text-left"
                  >
                    <span className="text-sm font-medium">{location.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Coordinates */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Or enter coordinates manually (lat, lng)</p>
              <div className="flex gap-2">
                <Input
                  placeholder="40.7128, -74.0060"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value;
                      const parts = value.split(',').map(s => parseFloat(s.trim()));
                      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        handleKeyframeLocationSelect({ name: `${parts[0].toFixed(4)}, ${parts[1].toFixed(4)}`, lat: parts[0], lng: parts[1], zoom: 12 });
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ============================================
// TICKER CONTENT EDITOR COMPONENT
// Allows editing ticker items inline within the content editor
// ============================================
interface TickerContentEditorProps {
  fieldId: string;
  items: TickerItem[];
  onItemsChange: (items: TickerItem[]) => void;
}

function TickerContentEditor({ fieldId, items, onItemsChange }: TickerContentEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newItemText, setNewItemText] = useState('');

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    const newItem: TickerItem = {
      id: `ticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: newItemText.trim(),
    };
    onItemsChange([...items, newItem]);
    setNewItemText('');
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<TickerItem>) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    setEditingId(null);
  };

  const handleMoveItem = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);
    onItemsChange(newItems);
  };

  const startEditing = (item: TickerItem) => {
    setEditingId(item.id);
    setEditValue(item.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEditing = () => {
    if (editingId && editValue.trim()) {
      handleUpdateItem(editingId, { content: editValue.trim() });
    }
    cancelEditing();
  };

  return (
    <div className="flex flex-col border border-cyan-500/30 rounded-md bg-cyan-500/5 p-2 min-h-[300px] flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-cyan-400 font-medium uppercase">
          Ticker Items ({items.length})
        </span>
      </div>

      {/* Add new item */}
      <div className="flex gap-1 mb-2">
        <Input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          placeholder="Add ticker item..."
          className="h-7 text-xs flex-1"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAddItem}
          disabled={!newItemText.trim()}
          className="h-7 w-7 p-0 text-cyan-400 hover:text-cyan-300"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Items list - expanded to fill available space */}
      <div className="space-y-1 flex-1 overflow-y-auto">
        {items.map((item, index) => {
          const topicStyle = item.topic ? TOPIC_BADGE_STYLES[item.topic] : null;

          if (editingId === item.id) {
            // Editing mode
            return (
              <div key={item.id} className="space-y-1.5 p-1.5 bg-muted/50 rounded">
                <div className="flex items-center gap-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing();
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    className="h-6 text-[10px] flex-1"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEditing}>
                    <Check className="w-3 h-3 text-green-400" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditing}>
                    <X className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
                {/* Topic selector */}
                <div className="flex items-center gap-1.5">
                  <Label className="text-[9px] text-muted-foreground">Topic:</Label>
                  <select
                    value={item.topic || ''}
                    onChange={(e) => handleUpdateItem(item.id, { topic: e.target.value as TickerTopic || undefined })}
                    className="flex-1 h-5 text-[9px] bg-background border border-input rounded px-1"
                  >
                    <option value="">None</option>
                    {Object.entries(TOPIC_BADGE_STYLES).map(([key, style]) => (
                      <option key={key} value={key}>
                        {style.icon} {style.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          }

          // Display mode
          return (
            <div
              key={item.id}
              className="flex items-center gap-1 p-1 hover:bg-muted/50 rounded group"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col">
                <button
                  onClick={() => handleMoveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 hover:bg-muted rounded disabled:opacity-20 text-muted-foreground hover:text-foreground"
                >
                  <ChevronUp className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={() => handleMoveItem(index, 'down')}
                  disabled={index === items.length - 1}
                  className="p-0.5 hover:bg-muted rounded disabled:opacity-20 text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Topic badge */}
              {topicStyle && (
                <div
                  className="px-1 py-0.5 rounded text-[7px] font-bold uppercase shrink-0"
                  style={{
                    backgroundColor: topicStyle.backgroundColor,
                    color: topicStyle.textColor,
                  }}
                >
                  {topicStyle.icon}
                </div>
              )}

              {/* Content */}
              <span className="flex-1 text-[10px] truncate">{item.content}</span>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => startEditing(item)}
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 text-red-400 hover:text-red-300"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </Button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-2">
            No ticker items. Add items above.
          </p>
        )}
      </div>
    </div>
  );
}
