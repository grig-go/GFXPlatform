import { useState, useCallback, useMemo, useEffect, createContext, useContext, useRef } from 'react';
import {
  Type, Image as ImageIcon, Square, Move, RotateCcw,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Diamond, BarChart3, Group,
  ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, Layers, ScrollText, Tag, X, Plus, Check, Edit2,
  FolderOpen, Timer, Eraser, Trash2, ChevronDown, Clock, Scissors, Play,
} from 'lucide-react';
import { AddressContextMenu, AddressableProperty } from '@/components/common/AddressContextMenu';
import { buildElementAddress, buildKeyframeAddress } from '@/lib/address';
import { TickerEditor } from '@/components/panels/TickerEditor';
import { TopicBadgePreview } from '@/components/canvas/TopicBadgeElement';
import { TOPIC_BADGE_STYLES, type TickerTopic } from '@emergent-platform/types';
import { IconPickerDialog } from '@/components/dialogs/IconPickerDialog';
import { MediaPickerDialog } from '@/components/dialogs/MediaPickerDialog';
import { FontPickerDialog } from '@/components/dialogs/FontPickerDialog';
import { loadFont } from '@/lib/fonts';
import { TableEditor } from '@/components/panels/TableEditor';
import { MapContentEditor, MapStyleEditor } from './MapPropertiesPanel';
import { InteractivePropertiesEditor } from './InteractivePropertiesPanel';
import {
  Button,
  Input,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Checkbox,
  cn,
} from '@emergent-platform/ui';
import { useDesignerStore } from '@/stores/designerStore';
import type { Element, Keyframe, Animation, TickerTopicType } from '@emergent-platform/types';
import * as LucideIcons from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { findIconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getWeatherIcon } from '@/lib/weatherIcons';
// @ts-ignore - react-animated-weather types
import ReactAnimatedWeather from 'react-animated-weather';

// Context for property search filter - allows PropertySection to access search without prop drilling
const PropertySearchContext = createContext<string>('');

// Context to track if we're inside a matching parent section (skip individual filtering)
const ParentMatchContext = createContext<boolean>(false);

// Context for current element name - allows PropertySection to build addresses
const ElementNameContext = createContext<string>('');

// Hook to access property search filter
function usePropertySearch() {
  return useContext(PropertySearchContext);
}

// Hook to check if parent section matches search
function useParentMatch() {
  return useContext(ParentMatchContext);
}

// Hook to get current element name for address building
function useElementName() {
  return useContext(ElementNameContext);
}

// Property keywords for each section (used for search-based auto-expand)
const CONTENT_PROPERTIES = [
  'content', 'text', 'source', 'url', 'image', 'video', 'icon', 'name', 'label',
  'data', 'chart', 'table', 'map', 'ticker', 'countdown', 'badge', 'topic',
  'center', 'zoom', 'latitude', 'longitude', 'bearing', 'pitch'
];

const STYLE_PROPERTIES = [
  'style', 'color', 'background', 'fill', 'stroke', 'border', 'opacity', 'shadow',
  'font', 'size', 'weight', 'family', 'align', 'spacing', 'radius', 'blur',
  'line', 'dash', 'arrow', 'cap', 'join', 'gradient', 'filter', 'blend',
  'outline', 'text-shadow', 'textshadow'
];

const LAYOUT_PROPERTIES = [
  'layout', 'position', 'x', 'y', 'width', 'height', 'size', 'rotation', 'scale',
  'anchor', 'transform', 'z-index', 'order', 'visible', 'lock', 'clip', 'overflow'
];

// Check if search term matches any property in a section
function searchMatchesSection(searchTerm: string, sectionProperties: string[]): boolean {
  if (!searchTerm || searchTerm.trim() === '') return false;
  const normalizedSearch = searchTerm.toLowerCase().trim();
  return sectionProperties.some(prop => prop.includes(normalizedSearch) || normalizedSearch.includes(prop));
}

// Helper function to convert color to rgba with specified opacity
function applyOpacityToColor(color: string, opacity: number): string {
  // Handle rgba/rgb colors
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${opacity})`;
  }

  // Handle hex colors
  const hexMatch = color.match(/^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Handle named colors or transparent
  if (color === 'transparent') {
    return 'transparent';
  }

  // For other colors, just return with opacity (browser will handle)
  return color;
}

// Helper function to extract base color without alpha
function getBaseColor(color: string): string {
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbaMatch) {
    return `rgb(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]})`;
  }
  return color;
}

// Helper to extract opacity from rgba color
function getOpacityFromColor(color: string): number {
  const rgbaMatch = color.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
  if (rgbaMatch) {
    return parseFloat(rgbaMatch[1]);
  }
  return 1;
}

// Icon Preview Component for Properties Panel
function IconPreview({
  library,
  iconName,
  weight,
  color,
  size = 24,
}: {
  library?: 'lucide' | 'fontawesome' | 'lottie' | 'weather';
  iconName?: string;
  weight?: 'solid' | 'regular' | 'brands';
  color?: string;
  size?: number;
}) {
  if (!library || !iconName) {
    return <span className="text-muted-foreground text-xs">?</span>;
  }

  if (library === 'lucide') {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent size={size} color={color} />;
    }
    return <span className="text-muted-foreground text-xs">?</span>;
  }

  if (library === 'fontawesome') {
    const prefix = weight === 'regular' ? 'far' : weight === 'brands' ? 'fab' : 'fas';
    const iconDef = findIconDefinition({ prefix: prefix as any, iconName: iconName as any });
    if (iconDef) {
      return <FontAwesomeIcon icon={iconDef} style={{ fontSize: size, color }} />;
    }
    return <span className="text-muted-foreground text-xs">?</span>;
  }

  if (library === 'weather') {
    const weatherIcon = getWeatherIcon(iconName);
    if (weatherIcon) {
      // Handle animated weather icons (react-animated-weather)
      if (weatherIcon.animated && weatherIcon.animatedIcon) {
        return (
          <div style={{ width: size, height: size }} className="flex items-center justify-center">
            <ReactAnimatedWeather
              icon={weatherIcon.animatedIcon}
              color={color || '#FFFFFF'}
              size={size}
              animate={true}
            />
          </div>
        );
      }
      // Handle SVG-based weather icons
      if (weatherIcon.svgUrl) {
        return (
          <img
            src={weatherIcon.svgUrl}
            alt={weatherIcon.displayName}
            style={{ width: size, height: size, filter: 'brightness(0) invert(1)' }}
            className="object-contain"
          />
        );
      }
    }
    return <span className="text-muted-foreground text-xs">?</span>;
  }

  if (library === 'lottie') {
    return <span className="text-xs">Lottie</span>;
  }

  return <span className="text-muted-foreground text-xs">?</span>;
}

// Common fonts for broadcast graphics
// Legacy font options - kept for backward compatibility
const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro' },
  { value: 'Barlow', label: 'Barlow' },
  { value: 'Barlow Condensed', label: 'Barlow Condensed' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
];

// Context for keyframe-aware property editing
interface PropertyContext {
  element: Element;
  selectedKeyframe: Keyframe | null;
  currentAnimation: Animation | null;
  allKeyframesForProperty: Keyframe[];
  hasKeyframes: boolean;
  isKeyframeSelected: boolean;
}

// Font Family Picker Component
function FontFamilyPicker({ value, onChange }: { value: string; onChange: (fontFamily: string) => void }) {
  const [showFontPicker, setShowFontPicker] = useState(false);
  
  // Load font when value changes
  useEffect(() => {
    if (value && typeof window !== 'undefined') {
      try {
        loadFont(value);
      } catch (error) {
        console.warn('Failed to load font:', value, error);
      }
    }
  }, [value]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowFontPicker(true)}
        className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer hover:bg-muted/80 transition-colors flex items-center justify-between gap-2"
        style={{ fontFamily: `"${value}", sans-serif` }}
      >
        <span className="truncate flex-1 text-left">
          {value}
        </span>
        <svg className="w-3 h-3 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <FontPickerDialog
        open={showFontPicker}
        onOpenChange={setShowFontPicker}
        onSelect={onChange}
        currentFontFamily={value}
      />
    </>
  );
}

// Easing curve options for keyframe transitions
const EASING_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'Smooth' },
  { value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', label: 'Bounce' },
  { value: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', label: 'Back Out' },
  { value: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)', label: 'Back In' },
  { value: 'steps(4)', label: 'Steps (4)' },
  { value: 'steps(8)', label: 'Steps (8)' },
];

// Format property name for display (camelCase/snake_case to readable)
function formatPropertyName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// Format property value for display
function formatPropertyValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') {
    // Round to 2 decimal places for cleaner display
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  return String(value);
}

// Keyframe Inspector Component - shows detailed keyframe info and allows editing
interface KeyframeInspectorProps {
  keyframe: Keyframe;
  animation: Animation;
  elementName: string;
  phaseDuration: number;
  onUpdate: (id: string, updates: Partial<Keyframe>) => void;
  onDelete: (id: string) => void;
  onRemoveProperty: (keyframeId: string, propertyKey: string) => void;
  onDeselect: () => void;
}

function KeyframeInspector({
  keyframe,
  animation,
  elementName,
  phaseDuration,
  onUpdate,
  onDelete,
  onRemoveProperty,
  onDeselect,
}: KeyframeInspectorProps) {
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [editPositionValue, setEditPositionValue] = useState('');
  const [showEasingDropdown, setShowEasingDropdown] = useState(false);
  const [expandedProperties, setExpandedProperties] = useState(true);

  // Keyframe position is stored as milliseconds relative to animation start
  const relativeTimeMs = keyframe.position;
  // Absolute timeline position = animation delay + relative position
  const absoluteTimeMs = animation.delay + keyframe.position;

  // Format time for display - always show in seconds
  const formatTimeDisplay = (ms: number): string => {
    const seconds = ms / 1000;
    return `${seconds.toFixed(2)}s`;
  };

  // Parse time input and convert to absolute milliseconds
  const parseTimeInput = (input: string): number | null => {
    const trimmed = input.trim().toLowerCase();

    // Handle milliseconds: "500ms" - absolute position in ms
    if (trimmed.endsWith('ms')) {
      const ms = parseFloat(trimmed.slice(0, -2));
      if (isNaN(ms)) return null;
      return Math.max(0, Math.min(phaseDuration, ms));
    }

    // Handle seconds: "1.5s" or just "1.5" - absolute time
    if (trimmed.endsWith('s') || /^\d+\.?\d*$/.test(trimmed)) {
      const seconds = parseFloat(trimmed.replace('s', ''));
      if (isNaN(seconds)) return null;
      const ms = seconds * 1000;
      return Math.max(0, Math.min(phaseDuration, ms));
    }

    // Handle percentage: "50%" - convert percentage of phase duration to milliseconds
    if (trimmed.endsWith('%')) {
      const pct = parseFloat(trimmed.slice(0, -1));
      if (isNaN(pct)) return null;
      const ms = (pct / 100) * phaseDuration;
      return Math.max(0, Math.min(phaseDuration, ms));
    }

    return null;
  };

  const handlePositionSubmit = () => {
    const newPosition = parseTimeInput(editPositionValue);
    if (newPosition !== null) {
      onUpdate(keyframe.id, { position: Math.round(newPosition) });
    }
    setIsEditingPosition(false);
  };

  const handleEasingChange = (easing: string) => {
    onUpdate(keyframe.id, { easing });
    setShowEasingDropdown(false);
  };

  const handlePropertyValueChange = (propertyKey: string, newValue: string) => {
    // Try to parse as number, otherwise keep as string
    let parsedValue: string | number = newValue;
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && newValue.trim() !== '') {
      parsedValue = numValue;
    }

    onUpdate(keyframe.id, {
      properties: {
        ...keyframe.properties,
        [propertyKey]: parsedValue,
      },
    });
  };

  const currentEasing = keyframe.easing || 'linear';
  const currentEasingLabel = EASING_OPTIONS.find(e => e.value === currentEasing)?.label || currentEasing;
  const propertyKeys = Object.keys(keyframe.properties);
  const keyframeName = keyframe.name || `${elementName}_${animation.phase}_key_${keyframe.position}`;
  const keyframeAddress = buildKeyframeAddress(elementName, animation.phase, keyframeName);

  return (
    <div className="space-y-3">
      {/* Header with phase badge and actions - right-click for address */}
      <AddressContextMenu address={keyframeAddress} label="Keyframe Address">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Diamond className="w-4 h-4 text-amber-500 fill-amber-500" />
            <input
              type="text"
              defaultValue={keyframeName}
              className="text-xs font-medium bg-transparent border-none outline-none hover:bg-muted/50 focus:bg-muted px-1 py-0.5 rounded -ml-1 max-w-[120px]"
              onBlur={(e) => {
                const newName = e.target.value.trim();
                if (newName && newName !== keyframe.name) {
                  onUpdate(keyframe.id, { name: newName });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">
              {animation.phase.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => onDelete(keyframe.id)}
              title="Delete keyframe"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={onDeselect}
              title="Deselect keyframe"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </AddressContextMenu>

      {/* Time/Position Section */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Timeline Position
        </label>
        {isEditingPosition ? (
          <Input
            autoFocus
            value={editPositionValue}
            onChange={(e) => setEditPositionValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePositionSubmit();
              if (e.key === 'Escape') setIsEditingPosition(false);
            }}
            onBlur={handlePositionSubmit}
            className="h-6 text-[10px] px-2"
            placeholder="e.g. 0.5s, 500ms, 50%"
          />
        ) : (
          <button
            onClick={() => {
              setEditPositionValue(formatTimeDisplay(relativeTimeMs));
              setIsEditingPosition(true);
            }}
            className="w-full h-6 px-2 text-[10px] font-mono bg-muted hover:bg-muted/80 border border-input rounded-md flex items-center justify-between transition-colors"
          >
            <span className="text-amber-400">{formatTimeDisplay(absoluteTimeMs)}</span>
            <span className="text-muted-foreground">on timeline</span>
          </button>
        )}
        {/* Show delay/offset info if animation has a delay */}
        {animation.delay > 0 && (
          <div className="flex items-center justify-between text-[10px] px-2 py-1 bg-slate-500/10 rounded border border-slate-500/20">
            <span className="text-slate-400">Offset (delay)</span>
            <span className="font-mono text-slate-300">{formatTimeDisplay(animation.delay)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] px-2 text-muted-foreground">
          <span>Position in animation</span>
          <span className="font-mono">{formatTimeDisplay(relativeTimeMs)}</span>
        </div>
      </div>

      {/* Easing Section */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 20 C 8 20, 8 4, 22 4" />
          </svg>
          Easing Curve
        </label>
        <div className="relative">
          <button
            onClick={() => setShowEasingDropdown(!showEasingDropdown)}
            className="w-full h-6 px-2 text-[10px] bg-muted hover:bg-muted/80 border border-input rounded-md flex items-center justify-between transition-colors"
          >
            <span>{currentEasingLabel}</span>
            <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", showEasingDropdown && "rotate-180")} />
          </button>
          {showEasingDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowEasingDropdown(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {EASING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleEasingChange(option.value)}
                    className={cn(
                      "w-full px-2 py-1.5 text-[10px] text-left hover:bg-muted/50 transition-colors",
                      currentEasing === option.value && "bg-primary/10 text-primary"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Properties Section */}
      {propertyKeys.length > 0 && (
        <div className="space-y-1.5">
          <button
            onClick={() => setExpandedProperties(!expandedProperties)}
            className="w-full flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-medium hover:text-foreground"
          >
            <ChevronDown className={cn("w-3 h-3 transition-transform", !expandedProperties && "-rotate-90")} />
            Animated Properties ({propertyKeys.length})
          </button>

          {expandedProperties && (
            <div className="space-y-1.5 pl-1">
              {propertyKeys.map((key) => {
                const value = keyframe.properties[key];
                return (
                  <div key={key} className="flex items-center gap-1.5 group">
                    <span className="w-20 text-[10px] text-muted-foreground truncate" title={formatPropertyName(key)}>
                      {formatPropertyName(key)}
                    </span>
                    <Input
                      value={formatPropertyValue(value)}
                      onChange={(e) => handlePropertyValueChange(key, e.target.value)}
                      className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                    />
                    <button
                      onClick={() => onRemoveProperty(keyframe.id, key)}
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                      title={`Remove ${formatPropertyName(key)}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {propertyKeys.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-3 text-center">
          <div className="text-[10px] text-muted-foreground">
            No animated properties.<br />
            <span className="text-[9px]">Edit element properties to add keyframe values.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PropertiesPanel({ searchFilter = '' }: { searchFilter?: string }) {
  const {
    selectedElementIds,
    elements,
    updateElement,
    deleteElements,
    selectedKeyframeIds,
    keyframes,
    animations,
    currentPhase,
    currentTemplateId,
    selectKeyframes,
    updateKeyframe,
    deleteKeyframe,
    removeKeyframeProperty,
    phaseDurations,
  } = useDesignerStore();

  // Collapsible section states (all open by default)
  const [styleOpen, setStyleOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(true);
  const [layoutOpen, setLayoutOpen] = useState(true);

  // Keyframe view state (shown when keyframe is selected)
  const [showKeyframePanel, setShowKeyframePanel] = useState(false);

  // Auto-switch to keyframe panel when a keyframe is selected
  useEffect(() => {
    if (selectedKeyframeIds.length > 0) {
      setShowKeyframePanel(true);
    } else {
      setShowKeyframePanel(false);
    }
  }, [selectedKeyframeIds]);

  // Close keyframe panel when a new element is selected (clicked in outliner or canvas)
  // But only if no keyframes are selected (to avoid conflict with keyframe selection)
  useEffect(() => {
    if (selectedElementIds.length > 0 && selectedKeyframeIds.length === 0) {
      setShowKeyframePanel(false);
    }
  }, [selectedElementIds, selectedKeyframeIds]);

  // Auto-expand sections when search matches properties within them
  useEffect(() => {
    if (!searchFilter || searchFilter.trim() === '') return;

    // Check each section and expand if search matches
    if (searchMatchesSection(searchFilter, CONTENT_PROPERTIES)) {
      setContentOpen(true);
    }
    if (searchMatchesSection(searchFilter, STYLE_PROPERTIES)) {
      setStyleOpen(true);
    }
    if (searchMatchesSection(searchFilter, LAYOUT_PROPERTIES)) {
      setLayoutOpen(true);
    }
  }, [searchFilter]);

  // Get selected element (always show element properties, even when keyframe selected)
  const selectedElement = useMemo(() => {
    // If element directly selected
    if (selectedElementIds.length === 1) {
      return elements.find((e) => e.id === selectedElementIds[0]);
    }
    // If keyframe selected, find its element
    if (selectedKeyframeIds.length > 0) {
      const kf = keyframes.find(k => k.id === selectedKeyframeIds[0]);
      if (kf) {
        const anim = animations.find(a => a.id === kf.animation_id);
        if (anim) {
          return elements.find(e => e.id === anim.element_id);
        }
      }
    }
    return null;
  }, [selectedElementIds, selectedKeyframeIds, elements, keyframes, animations]);

  // Get selected keyframe
  const selectedKeyframe = useMemo(() => {
    if (selectedKeyframeIds.length > 0) {
      return keyframes.find(kf => kf.id === selectedKeyframeIds[0]) || null;
    }
    return null;
  }, [selectedKeyframeIds, keyframes]);

  // Get current animation for element in current phase
  const currentAnimation = useMemo(() => {
    if (!selectedElement) return null;
    return animations.find(
      a => a.element_id === selectedElement.id && a.phase === currentPhase
    ) || null;
  }, [selectedElement, animations, currentPhase]);

  // Get the animation for the selected keyframe (may be different phase)
  const keyframeAnimation = useMemo(() => {
    if (!selectedKeyframe) return null;
    return animations.find(a => a.id === selectedKeyframe.animation_id) || null;
  }, [selectedKeyframe, animations]);

  // Check if selected keyframe belongs to the currently displayed element
  // (regardless of phase - we show it if it belongs to the element)
  const isKeyframeForCurrentElement = useMemo(() => {
    if (!selectedKeyframe || !keyframeAnimation || !selectedElement) return false;
    return keyframeAnimation.element_id === selectedElement.id;
  }, [selectedKeyframe, keyframeAnimation, selectedElement]);

  if (!selectedElement) {
    if (selectedElementIds.length > 1) {
      return (
        <div className="p-2">
          <div className="text-xs text-muted-foreground mb-2">
            {selectedElementIds.length} elements selected
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-6 text-xs"
              onClick={() => deleteElements(selectedElementIds)}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete All
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-2 text-center text-xs text-muted-foreground">
        <Move className="w-6 h-6 mx-auto mb-1 opacity-40" />
        Select an element to edit properties
      </div>
    );
  }

  // Check if we have a valid keyframe to show
  const hasKeyframeData = selectedKeyframe && keyframeAnimation;

  // If keyframe panel is shown, display that instead
  if (showKeyframePanel && hasKeyframeData && selectedKeyframe && keyframeAnimation) {
    return (
      <div className="h-full flex flex-col">
        {/* Keyframe Header */}
        <div className="p-2 border-b border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center">
              <Diamond className="w-3 h-3 text-amber-400" />
            </div>
            <span className="text-xs font-medium text-amber-400">Keyframe</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {selectedElement?.name}
            </span>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            <KeyframeInspector
              keyframe={selectedKeyframe}
              animation={keyframeAnimation}
              elementName={selectedElement?.name || 'element'}
              phaseDuration={phaseDurations[keyframeAnimation.phase]}
              onUpdate={updateKeyframe}
              onDelete={deleteKeyframe}
              onRemoveProperty={removeKeyframeProperty}
              onDeselect={() => selectKeyframes([])}
            />
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Element Header */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <ElementIcon type={selectedElement.element_type} />
          <Input
            value={selectedElement.name}
            onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
            className="h-6 text-xs font-medium bg-transparent border-transparent hover:border-input focus:border-input"
          />
        </div>
      </div>

      {/* Collapsible Sections */}
      <ElementNameContext.Provider value={selectedElement.name}>
      <PropertySearchContext.Provider value={searchFilter}>
        <ScrollArea className="flex-1">
          <div className="space-y-0.5">
            {/* Content Section - First */}
            <Collapsible open={contentOpen} onOpenChange={setContentOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-violet-500/10 hover:bg-violet-500/20 border-b border-violet-500/20 text-left sticky top-0 z-10">
                <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">Content</span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-violet-400 transition-transform duration-200",
                  !contentOpen && "-rotate-90"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-2 py-2 space-y-2">
                  <ContentEditor
                    element={selectedElement}
                    selectedKeyframe={selectedKeyframe}
                    currentAnimation={currentAnimation}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Style Section */}
            <Collapsible open={styleOpen} onOpenChange={setStyleOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-violet-500/10 hover:bg-violet-500/20 border-b border-violet-500/20 text-left sticky top-0 z-10">
                <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">Style</span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-violet-400 transition-transform duration-200",
                  !styleOpen && "-rotate-90"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-2 py-2 space-y-2">
                  <StyleEditor
                    element={selectedElement}
                    selectedKeyframe={selectedKeyframe}
                    currentAnimation={currentAnimation}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Layout Section */}
            <Collapsible open={layoutOpen} onOpenChange={setLayoutOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-violet-500/10 hover:bg-violet-500/20 border-b border-violet-500/20 text-left sticky top-0 z-10">
                <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">Layout</span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-violet-400 transition-transform duration-200",
                  !layoutOpen && "-rotate-90"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-2 py-2 space-y-2">
                  <LayoutEditor
                    element={selectedElement}
                    selectedKeyframe={selectedKeyframe}
                    currentAnimation={currentAnimation}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
      </PropertySearchContext.Provider>
      </ElementNameContext.Provider>
    </div>
  );
}

function ElementIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    text: <Type className="w-3 h-3" />,
    image: <ImageIcon className="w-3 h-3" />,
    shape: <Square className="w-3 h-3" />,
    div: <Square className="w-3 h-3" />,
    group: <Group className="w-3 h-3" />,
    'd3-chart': <BarChart3 className="w-3 h-3" />,
    ticker: <ScrollText className="w-3 h-3" />,
    'topic-badge': <Tag className="w-3 h-3" />,
    countdown: <Timer className="w-3 h-3" />,
  };
  return (
    <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
      {icons[type] || <Square className="w-3 h-3" />}
    </div>
  );
}

interface EditorProps {
  element: Element;
  selectedKeyframe: Keyframe | null;
  currentAnimation: Animation | null;
}

function StyleEditor({ element, selectedKeyframe, currentAnimation }: EditorProps) {
  const { updateElement } = useDesignerStore();
  
  // Helper for map content updates
  const updateMapContent = useCallback((updates: Record<string, unknown>) => {
    updateElement(element.id, {
      content: { ...element.content, ...updates } as Element['content'],
    });
  }, [element, updateElement]);

  const updateStyle = (key: string, value: string | number) => {
    updateElement(element.id, {
      styles: { ...element.styles, [key]: value },
    });
  };

  const getStyle = (key: string, defaultValue: string = '') => {
    return (element.styles[key] as string) || defaultValue;
  };

  return (
    <div className="space-y-2">
      {/* Line Styling Options */}
      {element.content.type === 'line' && (() => {
        const lineContent = element.content;
        return (
          <>
            {/* Line Thickness */}
            <KeyframableProperty
              title="Thickness"
              propertyKey="lineThickness"
              elementId={element.id}
              elementName={element.name}
              selectedKeyframe={selectedKeyframe}
              currentAnimation={currentAnimation}
              currentValue={lineContent.strokeWidth || 2}
              onChange={(value) => {
                updateElement(element.id, {
                  content: { ...lineContent, strokeWidth: value as number },
                });
              }}
            >
              {(displayValue, onChange) => (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={displayValue ?? lineContent.strokeWidth ?? 2}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <span className="text-xs text-muted-foreground w-12">
                    {displayValue ?? lineContent.strokeWidth ?? 2}px
                  </span>
                </div>
              )}
            </KeyframableProperty>

            {/* Line Color */}
            <KeyframableProperty
              title="Color"
              propertyKey="lineColor"
              elementId={element.id}
              elementName={element.name}
              selectedKeyframe={selectedKeyframe}
              currentAnimation={currentAnimation}
              currentValue={lineContent.stroke || '#FFFFFF'}
              onChange={(color) => {
                updateElement(element.id, {
                  content: { ...lineContent, stroke: color as string },
                });
              }}
            >
              {(displayValue, onChange) => (
                <ColorInput
                  value={(displayValue as string) ?? lineContent.stroke ?? '#FFFFFF'}
                  onChange={(c) => onChange(c)}
                />
              )}
            </KeyframableProperty>

            {/* End Caps */}
            <PropertySection title="End Caps">
              <select
                value={lineContent.strokeLinecap || 'round'}
                onChange={(e) => {
                  updateElement(element.id, {
                    content: { ...lineContent, strokeLinecap: e.target.value as 'butt' | 'round' | 'square' },
                  });
                }}
                className="w-full h-7 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
              >
                <option value="butt">Butt</option>
                <option value="round">Round</option>
                <option value="square">Square</option>
              </select>
            </PropertySection>

            {/* Line Joins */}
            <PropertySection title="Line Joins">
              <select
                value={lineContent.strokeLinejoin || 'round'}
                onChange={(e) => {
                  updateElement(element.id, {
                    content: { ...lineContent, strokeLinejoin: e.target.value as 'miter' | 'round' | 'bevel' },
                  });
                }}
                className="w-full h-7 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
              >
                <option value="miter">Miter</option>
                <option value="round">Round</option>
                <option value="bevel">Bevel</option>
              </select>
            </PropertySection>

            {/* Dash Pattern */}
            <PropertySection title="Dash Pattern">
              <div className="space-y-2">
                <select
                  value={lineContent.strokeDasharray || 'none'}
                  onChange={(e) => {
                    const dashValue = e.target.value === 'none' ? undefined : e.target.value;
                    updateElement(element.id, {
                      content: { ...lineContent, strokeDasharray: dashValue },
                    });
                  }}
                  className="w-full h-7 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
                >
                  <option value="none">Solid</option>
                  <option value="5,5">Dashed (5,5)</option>
                  <option value="10,5">Dashed (10,5)</option>
                  <option value="5,10">Dashed (5,10)</option>
                  <option value="2,2">Dotted (2,2)</option>
                  <option value="custom">Custom</option>
                </select>
                {lineContent.strokeDasharray && lineContent.strokeDasharray !== 'none' && (
                  <Input
                    type="text"
                    placeholder="e.g., 5,5"
                    value={lineContent.strokeDasharray}
                    onChange={(e) => {
                      updateElement(element.id, {
                        content: { ...lineContent, strokeDasharray: e.target.value },
                      });
                    }}
                    className="h-7 text-xs"
                  />
                )}
              </div>
            </PropertySection>

            {/* Start Arrow */}
            <PropertySection title="Start Arrow">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={lineContent.arrowStart?.enabled || false}
                    onChange={(e) => {
                      updateElement(element.id, {
                        content: {
                          ...lineContent,
                          arrowStart: {
                            ...lineContent.arrowStart,
                            enabled: e.target.checked,
                            type: e.target.checked ? (lineContent.arrowStart?.type || 'arrow') : 'none',
                            size: lineContent.arrowStart?.size || 8,
                            color: lineContent.arrowStart?.color || lineContent.stroke || '#FFFFFF',
                          },
                        },
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <label className="text-xs">Enable Start Arrow</label>
                </div>
                {lineContent.arrowStart?.enabled && (
                  <>
                    <select
                      value={lineContent.arrowStart.type || 'arrow'}
                      onChange={(e) => {
                        updateElement(element.id, {
                          content: {
                            ...lineContent,
                            arrowStart: {
                              ...lineContent.arrowStart!,
                              type: e.target.value as 'arrow' | 'triangle' | 'circle' | 'square',
                            },
                          },
                        });
                      }}
                      className="w-full h-7 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
                    >
                      <option value="arrow">Arrow</option>
                      <option value="triangle">Triangle</option>
                      <option value="circle">Circle</option>
                      <option value="square">Square</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <label className="text-xs w-20">Size:</label>
                      <input
                        type="range"
                        min="4"
                        max="30"
                        step="1"
                        value={lineContent.arrowStart.size || 8}
                        onChange={(e) => {
                          updateElement(element.id, {
                            content: {
                              ...lineContent,
                              arrowStart: {
                                ...lineContent.arrowStart!,
                                size: parseFloat(e.target.value),
                              },
                            },
                          });
                        }}
                        className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                      <span className="text-xs text-muted-foreground w-8">
                        {lineContent.arrowStart.size || 8}px
                      </span>
                    </div>
                    <ColorInput
                      value={lineContent.arrowStart.color || lineContent.stroke || '#FFFFFF'}
                      onChange={(color) => {
                        updateElement(element.id, {
                          content: {
                            ...lineContent,
                            arrowStart: {
                              ...lineContent.arrowStart!,
                              color,
                            },
                          },
                        });
                      }}
                    />
                  </>
                )}
              </div>
            </PropertySection>

            {/* End Arrow */}
            <PropertySection title="End Arrow">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={lineContent.arrowEnd?.enabled || false}
                    onChange={(e) => {
                      updateElement(element.id, {
                        content: {
                          ...lineContent,
                          arrowEnd: {
                            ...lineContent.arrowEnd,
                            enabled: e.target.checked,
                            type: e.target.checked ? (lineContent.arrowEnd?.type || 'arrow') : 'none',
                            size: lineContent.arrowEnd?.size || 8,
                            color: lineContent.arrowEnd?.color || lineContent.stroke || '#FFFFFF',
                          },
                        },
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <label className="text-xs">Enable End Arrow</label>
                </div>
                {lineContent.arrowEnd?.enabled && (
                  <>
                    <select
                      value={lineContent.arrowEnd.type || 'arrow'}
                      onChange={(e) => {
                        updateElement(element.id, {
                          content: {
                            ...lineContent,
                            arrowEnd: {
                              ...lineContent.arrowEnd!,
                              type: e.target.value as 'arrow' | 'triangle' | 'circle' | 'square',
                            },
                          },
                        });
                      }}
                      className="w-full h-7 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
                    >
                      <option value="arrow">Arrow</option>
                      <option value="triangle">Triangle</option>
                      <option value="circle">Circle</option>
                      <option value="square">Square</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <label className="text-xs w-20">Size:</label>
                      <input
                        type="range"
                        min="4"
                        max="30"
                        step="1"
                        value={lineContent.arrowEnd.size || 8}
                        onChange={(e) => {
                          updateElement(element.id, {
                            content: {
                              ...lineContent,
                              arrowEnd: {
                                ...lineContent.arrowEnd!,
                                size: parseFloat(e.target.value),
                              },
                            },
                          });
                        }}
                        className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                      <span className="text-xs text-muted-foreground w-8">
                        {lineContent.arrowEnd.size || 8}px
                      </span>
                    </div>
                    <ColorInput
                      value={lineContent.arrowEnd.color || lineContent.stroke || '#FFFFFF'}
                      onChange={(color) => {
                        updateElement(element.id, {
                          content: {
                            ...lineContent,
                            arrowEnd: {
                              ...lineContent.arrowEnd!,
                              color,
                            },
                          },
                        });
                      }}
                    />
                  </>
                )}
              </div>
            </PropertySection>
          </>
        );
      })()}

      {/* Icon Styling Options - Size and Color at top */}
      {element.content.type === 'icon' && (() => {
        const iconContent = element.content;
        return (
          <>
            {/* Icon Size - at top */}
            <KeyframableProperty
              title="Icon Size"
              propertyKey="iconSize"
              elementId={element.id}
              elementName={element.name}
              selectedKeyframe={selectedKeyframe}
              currentAnimation={currentAnimation}
              currentValue={iconContent.size || 24}
              onChange={(value) => {
                updateElement(element.id, {
                  content: { ...iconContent, size: value as number },
                });
              }}
            >
              {(displayValue, onChange) => (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="8"
                    max="500"
                    step="1"
                    value={displayValue ?? iconContent.size ?? 24}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <span className="text-xs text-muted-foreground w-12">
                    {displayValue ?? iconContent.size ?? 24}px
                  </span>
                </div>
              )}
            </KeyframableProperty>

            {/* Icon Color - at top */}
            <KeyframableProperty
              title="Icon Color"
              propertyKey="iconColor"
              elementId={element.id}
              elementName={element.name}
              selectedKeyframe={selectedKeyframe}
              currentAnimation={currentAnimation}
              currentValue={iconContent.color || '#FFFFFF'}
              onChange={(color) => {
                updateElement(element.id, {
                  content: { ...iconContent, color: color as string },
                });
              }}
            >
              {(displayValue, onChange) => (
                <ColorInput
                  value={(displayValue as string) ?? iconContent.color ?? '#FFFFFF'}
                  onChange={(c) => onChange(c)}
                />
              )}
            </KeyframableProperty>
          </>
        );
      })()}

      {/* Text Styles (for text elements) - Moved to top, ordered by most common use */}
      {element.content.type === 'text' && (
        <>
          {/* 1. Font Size - Most commonly used */}
          <KeyframableProperty
            title="Font Size"
            propertyKey="fontSize"
            elementId={element.id}
            elementName={element.name}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
            currentValue={parseInt(getStyle('fontSize', '32')) || 32}
            onChange={(value) => updateStyle('fontSize', `${value}px`)}
          >
            {(displayValue, onChange) => (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="1"
                  value={displayValue ?? (parseInt(getStyle('fontSize', '32')) || 32)}
                  onChange={(e) => onChange(parseInt(e.target.value) || 32)}
                  className="h-6 text-[10px]"
                />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            )}
          </KeyframableProperty>

          {/* 2. Font Family - Very commonly used */}
          <PropertySection title="Font Family">
            <FontFamilyPicker
              value={getStyle('fontFamily', 'Inter')}
              onChange={(fontFamily) => updateStyle('fontFamily', fontFamily)}
            />
          </PropertySection>

          {/* 3. Font Weight - Very commonly used */}
          <PropertySection title="Font Weight">
            <select
              value={getStyle('fontWeight', '400')}
              onChange={(e) => updateStyle('fontWeight', e.target.value)}
              className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
            >
              <option value="100">Thin (100)</option>
              <option value="200">Extra Light (200)</option>
              <option value="300">Light (300)</option>
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semibold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">Extrabold (800)</option>
              <option value="900">Black (900)</option>
            </select>
          </PropertySection>

          {/* 4. Text Align - Very commonly used */}
          <PropertySection title="Text Align">
            <div className="flex gap-1">
              {(['left', 'center', 'right', 'justify'] as const).map((align) => (
                <Button
                  key={align}
                  variant={getStyle('textAlign') === align ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => updateStyle('textAlign', align)}
                  title={align.charAt(0).toUpperCase() + align.slice(1)}
                >
                  {align === 'left' && <AlignLeft className="w-3 h-3" />}
                  {align === 'center' && <AlignCenter className="w-3 h-3" />}
                  {align === 'right' && <AlignRight className="w-3 h-3" />}
                  {align === 'justify' && <AlignJustify className="w-3 h-3" />}
                </Button>
              ))}
            </div>
          </PropertySection>

          {/* 5. Text Color - Commonly used */}
          <KeyframableProperty
            title="Text Color"
            propertyKey="color"
            elementId={element.id}
            elementName={element.name}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
            currentValue={getStyle('color', '#ffffff')}
            onChange={(color) => updateStyle('color', color as string)}
          >
            {(displayValue, onChange) => (
              <ColorInput
                value={(displayValue as string) ?? getStyle('color', '#ffffff')}
                onChange={(c) => onChange(c)}
              />
            )}
          </KeyframableProperty>

          {/* 5.5 Text Outline - For character outline/stroke effect */}
          <PropertySection title="Text Outline">
            {(() => {
              // Parse existing textShadow to detect outline
              const currentShadow = getStyle('textShadow', 'none');
              const shadowParts = currentShadow !== 'none' && currentShadow !== ''
                ? currentShadow.split(',').map((s: string) => s.trim()).filter((s: string) => s)
                : [];
              const shadowCount = shadowParts.length;

              // Outline exists if 8 shadows (outline only) or 9+ shadows (outline + drop shadow)
              const hasOutline = shadowCount === 8 || shadowCount >= 9;
              const hasShadow = shadowCount === 1 || shadowCount >= 9;

              // Default values
              let outlineColor = '#000000';
              let outlineWidth = 2;
              let outlineBlur = 0;
              let shadowColor = '#000000';
              let shadowOffsetX = 3;
              let shadowOffsetY = 3;
              let shadowBlur = 6;

              // Parse outline values (first 8 shadows)
              if (hasOutline && shadowParts.length >= 1) {
                const match = shadowParts[0].match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
                if (match) {
                  outlineWidth = Math.max(Math.abs(parseInt(match[1])), Math.abs(parseInt(match[2]))) || 2;
                  outlineBlur = parseInt(match[3]);
                  outlineColor = match[4];
                }
              }

              // Parse shadow values (last shadow if outline exists, or first if shadow only)
              if (hasShadow) {
                const shadowIdx = shadowCount >= 9 ? 8 : 0;
                const match = shadowParts[shadowIdx]?.match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
                if (match) {
                  shadowOffsetX = parseInt(match[1]);
                  shadowOffsetY = parseInt(match[2]);
                  shadowBlur = parseInt(match[3]);
                  shadowColor = match[4];
                }
              }

              // Generate outline shadow (8 directions for smooth outline)
              const generateOutlineShadow = (width: number, blur: number, color: string) => {
                const shadows = [];
                for (let angle = 0; angle < 360; angle += 45) {
                  const rad = (angle * Math.PI) / 180;
                  const x = Math.round(Math.cos(rad) * width);
                  const y = Math.round(Math.sin(rad) * width);
                  shadows.push(`${x}px ${y}px ${blur}px ${color}`);
                }
                return shadows;
              };

              // Rebuild textShadow based on enabled states
              const rebuildTextShadow = (
                enableOutline: boolean,
                enableShadow: boolean,
                oColor: string,
                oWidth: number,
                oBlur: number,
                sColor: string,
                sX: number,
                sY: number,
                sBlur: number
              ) => {
                const parts: string[] = [];
                if (enableOutline) {
                  parts.push(...generateOutlineShadow(oWidth, oBlur, oColor));
                }
                if (enableShadow) {
                  parts.push(`${sX}px ${sY}px ${sBlur}px ${sColor}`);
                }
                updateStyle('textShadow', parts.length > 0 ? parts.join(', ') : 'none');
              };

              const toggleOutline = (enabled: boolean) => {
                rebuildTextShadow(enabled, hasShadow, outlineColor, outlineWidth, outlineBlur, shadowColor, shadowOffsetX, shadowOffsetY, shadowBlur);
              };

              const updateOutline = (updates: { color?: string; width?: number; blur?: number }) => {
                const oColor = updates.color ?? outlineColor;
                const oWidth = updates.width ?? outlineWidth;
                const oBlur = updates.blur ?? outlineBlur;
                rebuildTextShadow(true, hasShadow, oColor, oWidth, oBlur, shadowColor, shadowOffsetX, shadowOffsetY, shadowBlur);
              };

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="enable-outline"
                      checked={hasOutline}
                      onCheckedChange={(checked) => toggleOutline(checked === true)}
                    />
                    <label htmlFor="enable-outline" className="text-[10px] text-muted-foreground cursor-pointer">
                      Enable Outline
                    </label>
                  </div>

                  {hasOutline && (
                    <div className="space-y-1.5 p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-10">Color</span>
                        <ColorInput
                          value={outlineColor}
                          onChange={(c) => updateOutline({ color: c })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-10">Width</span>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={outlineWidth}
                          onChange={(e) => updateOutline({ width: parseInt(e.target.value) || 1 })}
                          className="h-6 text-[10px] flex-1"
                        />
                        <span className="text-[10px] text-muted-foreground">px</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-10">Blur</span>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          value={outlineBlur}
                          onChange={(e) => updateOutline({ blur: parseInt(e.target.value) || 0 })}
                          className="h-6 text-[10px] flex-1"
                        />
                        <span className="text-[10px] text-muted-foreground">px</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </PropertySection>

          {/* 5.6 Text Shadow - For drop shadow effect */}
          <PropertySection title="Text Shadow">
            {(() => {
              // Parse existing textShadow to detect shadow
              const currentShadow = getStyle('textShadow', 'none');
              const shadowParts = currentShadow !== 'none' && currentShadow !== ''
                ? currentShadow.split(',').map((s: string) => s.trim()).filter((s: string) => s)
                : [];
              const shadowCount = shadowParts.length;

              // Outline exists if 8 shadows (outline only) or 9+ shadows (outline + drop shadow)
              const hasOutline = shadowCount === 8 || shadowCount >= 9;
              const hasShadow = shadowCount === 1 || shadowCount >= 9;

              // Default values
              let outlineColor = '#000000';
              let outlineWidth = 2;
              let outlineBlur = 0;
              let shadowColor = '#000000';
              let shadowOffsetX = 3;
              let shadowOffsetY = 3;
              let shadowBlur = 6;

              // Parse outline values (first 8 shadows)
              if (hasOutline && shadowParts.length >= 1) {
                const match = shadowParts[0].match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
                if (match) {
                  outlineWidth = Math.max(Math.abs(parseInt(match[1])), Math.abs(parseInt(match[2]))) || 2;
                  outlineBlur = parseInt(match[3]);
                  outlineColor = match[4];
                }
              }

              // Parse shadow values (last shadow if outline exists, or first if shadow only)
              if (hasShadow) {
                const shadowIdx = shadowCount >= 9 ? 8 : 0;
                const match = shadowParts[shadowIdx]?.match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
                if (match) {
                  shadowOffsetX = parseInt(match[1]);
                  shadowOffsetY = parseInt(match[2]);
                  shadowBlur = parseInt(match[3]);
                  shadowColor = match[4];
                }
              }

              // Generate outline shadow (8 directions for smooth outline)
              const generateOutlineShadow = (width: number, blur: number, color: string) => {
                const shadows = [];
                for (let angle = 0; angle < 360; angle += 45) {
                  const rad = (angle * Math.PI) / 180;
                  const x = Math.round(Math.cos(rad) * width);
                  const y = Math.round(Math.sin(rad) * width);
                  shadows.push(`${x}px ${y}px ${blur}px ${color}`);
                }
                return shadows;
              };

              // Rebuild textShadow based on enabled states
              const rebuildTextShadow = (
                enableOutline: boolean,
                enableShadow: boolean,
                oColor: string,
                oWidth: number,
                oBlur: number,
                sColor: string,
                sX: number,
                sY: number,
                sBlur: number
              ) => {
                const parts: string[] = [];
                if (enableOutline) {
                  parts.push(...generateOutlineShadow(oWidth, oBlur, oColor));
                }
                if (enableShadow) {
                  parts.push(`${sX}px ${sY}px ${sBlur}px ${sColor}`);
                }
                updateStyle('textShadow', parts.length > 0 ? parts.join(', ') : 'none');
              };

              const toggleShadow = (enabled: boolean) => {
                rebuildTextShadow(hasOutline, enabled, outlineColor, outlineWidth, outlineBlur, shadowColor, shadowOffsetX, shadowOffsetY, shadowBlur);
              };

              const updateShadow = (updates: { color?: string; x?: number; y?: number; blur?: number }) => {
                const sColor = updates.color ?? shadowColor;
                const sX = updates.x ?? shadowOffsetX;
                const sY = updates.y ?? shadowOffsetY;
                const sBlur = updates.blur ?? shadowBlur;
                rebuildTextShadow(hasOutline, true, outlineColor, outlineWidth, outlineBlur, sColor, sX, sY, sBlur);
              };

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="enable-shadow"
                      checked={hasShadow}
                      onCheckedChange={(checked) => toggleShadow(checked === true)}
                    />
                    <label htmlFor="enable-shadow" className="text-[10px] text-muted-foreground cursor-pointer">
                      Enable Shadow
                    </label>
                  </div>

                  {hasShadow && (
                    <div className="space-y-1.5 p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-10">Color</span>
                        <ColorInput
                          value={shadowColor}
                          onChange={(c) => updateShadow({ color: c })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-10">X</span>
                        <Input
                          type="number"
                          value={shadowOffsetX}
                          onChange={(e) => updateShadow({ x: parseInt(e.target.value) || 0 })}
                          className="h-6 text-[10px] flex-1"
                        />
                        <span className="text-[10px] text-muted-foreground w-10">Y</span>
                        <Input
                          type="number"
                          value={shadowOffsetY}
                          onChange={(e) => updateShadow({ y: parseInt(e.target.value) || 0 })}
                          className="h-6 text-[10px] flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-10">Blur</span>
                        <Input
                          type="number"
                          min="0"
                          value={shadowBlur}
                          onChange={(e) => updateShadow({ blur: parseInt(e.target.value) || 0 })}
                          className="h-6 text-[10px] flex-1"
                        />
                        <span className="text-[10px] text-muted-foreground">px</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </PropertySection>

          {/* 6. Vertical Align - Less commonly used */}
          <PropertySection title="Vertical Align">
            <div className="flex gap-1">
              {(['top', 'middle', 'bottom'] as const).map((valign) => (
                <Button
                  key={valign}
                  variant={getStyle('verticalAlign') === valign ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 flex-1 text-[10px]"
                  onClick={() => updateStyle('verticalAlign', valign)}
                >
                  {valign.charAt(0).toUpperCase() + valign.slice(1)}
                </Button>
              ))}
            </div>
          </PropertySection>

          {/* 7. Line Height - Less commonly used */}
          <PropertySection title="Line Height">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.1"
                min="0.5"
                max="5"
                value={parseFloat(getStyle('lineHeight', '1.2')) || 1.2}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 1.2;
                  updateStyle('lineHeight', value.toString());
                }}
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">×</span>
            </div>
          </PropertySection>
        </>
      )}

      {/* Countdown/Clock Styles - Same font options as text */}
      {element.content.type === 'countdown' && (
        <>
          {/* Font Size */}
          <KeyframableProperty
            title="Font Size"
            propertyKey="fontSize"
            elementId={element.id}
            elementName={element.name}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
            currentValue={parseInt(getStyle('fontSize', '32')) || 32}
            onChange={(value) => updateStyle('fontSize', `${value}px`)}
          >
            {(displayValue, onChange) => (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="1"
                  value={displayValue ?? (parseInt(getStyle('fontSize', '32')) || 32)}
                  onChange={(e) => onChange(parseInt(e.target.value) || 32)}
                  className="h-6 text-[10px]"
                />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            )}
          </KeyframableProperty>

          {/* Font Family */}
          <PropertySection title="Font Family">
            <FontFamilyPicker
              value={getStyle('fontFamily', 'Inter')}
              onChange={(fontFamily) => updateStyle('fontFamily', fontFamily)}
            />
          </PropertySection>

          {/* Font Weight */}
          <PropertySection title="Font Weight">
            <select
              value={getStyle('fontWeight', '400')}
              onChange={(e) => updateStyle('fontWeight', e.target.value)}
              className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
            >
              <option value="100">Thin (100)</option>
              <option value="200">Extra Light (200)</option>
              <option value="300">Light (300)</option>
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semibold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">Extrabold (800)</option>
              <option value="900">Black (900)</option>
            </select>
          </PropertySection>

          {/* Text Align */}
          <PropertySection title="Text Align">
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((align) => (
                <Button
                  key={align}
                  variant={getStyle('textAlign', 'center') === align ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => updateStyle('textAlign', align)}
                  title={align.charAt(0).toUpperCase() + align.slice(1)}
                >
                  {align === 'left' && <AlignLeft className="w-3 h-3" />}
                  {align === 'center' && <AlignCenter className="w-3 h-3" />}
                  {align === 'right' && <AlignRight className="w-3 h-3" />}
                </Button>
              ))}
            </div>
          </PropertySection>

          {/* Text Color */}
          <KeyframableProperty
            title="Text Color"
            propertyKey="color"
            elementId={element.id}
            elementName={element.name}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
            currentValue={getStyle('color', '#ffffff')}
            onChange={(color) => updateStyle('color', color as string)}
          >
            {(displayValue, onChange) => (
              <ColorInput
                value={(displayValue as string) ?? getStyle('color', '#ffffff')}
                onChange={(c) => onChange(c)}
              />
            )}
          </KeyframableProperty>

          {/* Vertical Align */}
          <PropertySection title="Vertical Align">
            <div className="flex gap-1">
              {(['top', 'middle', 'bottom'] as const).map((valign) => (
                <Button
                  key={valign}
                  variant={getStyle('verticalAlign', 'middle') === valign ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 flex-1 text-[10px]"
                  onClick={() => updateStyle('verticalAlign', valign)}
                >
                  {valign.charAt(0).toUpperCase() + valign.slice(1)}
                </Button>
              ))}
            </div>
          </PropertySection>

          {/* Line Height */}
          <PropertySection title="Line Height">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.1"
                min="0.5"
                max="5"
                value={parseFloat(getStyle('lineHeight', '1.2')) || 1.2}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 1.2;
                  updateStyle('lineHeight', value.toString());
                }}
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">×</span>
            </div>
          </PropertySection>

          <Separator className="my-4" />
        </>
      )}

      {/* 8. Letter Spacing - Less commonly used (for text elements) */}
      {element.content.type === 'text' && (
        <>
          {/* 8. Letter Spacing - Less commonly used */}
          <PropertySection title="Letter Spacing">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.1"
                value={parseFloat(getStyle('letterSpacing', '0')) || 0}
                onChange={(e) => updateStyle('letterSpacing', `${e.target.value}px`)}
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          </PropertySection>

          {/* 9. Word Spacing - Least commonly used */}
          <PropertySection title="Word Spacing">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.1"
                value={parseFloat(getStyle('wordSpacing', '0')) || 0}
                onChange={(e) => updateStyle('wordSpacing', `${e.target.value}px`)}
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          </PropertySection>

          <Separator className="my-4" />
        </>
      )}

      {/* Character Animation (for text elements) */}
      {element.content.type === 'text' && (() => {
        const textContent = element.content;
        const updateTextContent = (updates: Record<string, unknown>) => {
          updateElement(element.id, {
            content: { ...element.content, ...updates } as Element['content'],
          });
        };

        return (
          <>
            <PropertySection title="Character Animation">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={textContent.charAnimation?.enabled || false}
                    onChange={(e) => updateTextContent({
                      charAnimation: {
                        enabled: e.target.checked,
                        type: textContent.charAnimation?.type || 'fade',
                        easing: textContent.charAnimation?.easing || 'ease-out',
                        direction: textContent.charAnimation?.direction || 'forward',
                        spread: textContent.charAnimation?.spread || 3,
                        progress: textContent.charAnimation?.progress ?? 100,
                      }
                    })}
                    className="rounded"
                  />
                  <span>Enable Character Animation</span>
                </label>

                {textContent.charAnimation?.enabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-violet-500/30">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Animation Type</label>
                      <select
                        value={textContent.charAnimation.type}
                        onChange={(e) => updateTextContent({
                          charAnimation: {
                            ...textContent.charAnimation!,
                            type: e.target.value as 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale' | 'blur' | 'wave' | 'bounce'
                          }
                        })}
                        className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                      >
                        <option value="fade">Fade</option>
                        <option value="slide-up">Slide Up</option>
                        <option value="slide-down">Slide Down</option>
                        <option value="slide-left">Slide Left</option>
                        <option value="slide-right">Slide Right</option>
                        <option value="scale">Scale</option>
                        <option value="blur">Blur</option>
                        <option value="wave">Wave</option>
                        <option value="bounce">Bounce</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Direction</label>
                      <select
                        value={textContent.charAnimation.direction}
                        onChange={(e) => updateTextContent({
                          charAnimation: {
                            ...textContent.charAnimation!,
                            direction: e.target.value as 'forward' | 'backward' | 'center' | 'edges'
                          }
                        })}
                        className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                      >
                        <option value="forward">Forward (Left to Right)</option>
                        <option value="backward">Backward (Right to Left)</option>
                        <option value="center">Center Out</option>
                        <option value="edges">Edges In</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Easing</label>
                      <select
                        value={textContent.charAnimation.easing}
                        onChange={(e) => updateTextContent({
                          charAnimation: {
                            ...textContent.charAnimation!,
                            easing: e.target.value
                          }
                        })}
                        className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                      >
                        <option value="linear">Linear</option>
                        <option value="ease-in">Ease In</option>
                        <option value="ease-out">Ease Out</option>
                        <option value="ease-in-out">Ease In Out</option>
                        <option value="ease">Ease</option>
                        <option value="cubic-bezier(0.68, -0.55, 0.265, 1.55)">Bounce</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Spread (chars at once)</label>
                      <Input
                        type="number"
                        value={textContent.charAnimation.spread}
                        onChange={(e) => updateTextContent({
                          charAnimation: {
                            ...textContent.charAnimation!,
                            spread: parseInt(e.target.value) || 1
                          }
                        })}
                        min="1"
                        max="50"
                        step="1"
                        className="h-6 text-[10px]"
                      />
                    </div>

                    <KeyframableProperty
                      title="Progress"
                      propertyKey="charAnimation_progress"
                      elementId={element.id}
                      elementName={element.name}
                      selectedKeyframe={selectedKeyframe}
                      currentAnimation={currentAnimation}
                      currentValue={textContent.charAnimation.progress}
                      onChange={(value) => updateTextContent({
                        charAnimation: {
                          ...textContent.charAnimation!,
                          progress: value as number
                        }
                      })}
                    >
                      {(displayValue, onChange) => (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={displayValue as number}
                              onChange={(e) => onChange(parseInt(e.target.value))}
                              className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500"
                            />
                            <Input
                              type="number"
                              value={displayValue as number}
                              onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                              min="0"
                              max="100"
                              className="w-14 h-6 text-[10px]"
                            />
                          </div>
                        </div>
                      )}
                    </KeyframableProperty>
                  </div>
                )}
              </div>
            </PropertySection>

            <Separator className="my-4" />
          </>
        );
      })()}

      {/* Opacity */}
      <KeyframableProperty
        title="Opacity"
        propertyKey="opacity"
        elementId={element.id}
        elementName={element.name}
        selectedKeyframe={selectedKeyframe}
        currentAnimation={currentAnimation}
        currentValue={element.opacity}
        onChange={(value) => updateElement(element.id, { opacity: value as number })}
      >
        {(displayValue, onChange) => (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={displayValue ?? element.opacity}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">
              {Math.round((Number(displayValue) ?? element.opacity) * 100)}%
            </span>
          </div>
        )}
      </KeyframableProperty>

      {/* Fill / Background - shapes handle this in ShapeStyleEditor */}

      {/* Background Color - hide for shapes (they use content.fill) */}
      {element.content.type !== 'shape' && (
        <KeyframableProperty
          title="Background"
          propertyKey="backgroundColor"
          elementId={element.id}
          elementName={element.name}
          selectedKeyframe={selectedKeyframe}
          currentAnimation={currentAnimation}
          currentValue={getStyle('backgroundColor', 'transparent')}
          onChange={(color) => updateStyle('backgroundColor', color as string)}
        >
          {(displayValue, onChange) => (
            <ColorInput
              value={(displayValue as string) ?? getStyle('backgroundColor', 'transparent')}
              onChange={(c) => onChange(c)}
            />
          )}
        </KeyframableProperty>
      )}

      {/* Border - hide for shapes (they use content.stroke/strokeWidth) */}
      {element.content.type !== 'shape' && (
        <PropertySection title="Border">
          <div className="grid grid-cols-2 gap-2">
            <ColorInput
              value={getStyle('borderColor', '#ffffff')}
              onChange={(color) => updateStyle('borderColor', color)}
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                value={parseInt(getStyle('borderWidth', '0')) || 0}
                onChange={(e) => updateStyle('borderWidth', `${e.target.value}px`)}
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          </div>
        </PropertySection>
      )}

      {/* Border Radius - hide for shapes (they use content.cornerRadius) */}
      {element.content.type !== 'shape' && (
        <PropertySection title="Corner Radius">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              value={parseInt(getStyle('borderRadius', '0')) || 0}
              onChange={(e) => updateStyle('borderRadius', `${e.target.value}px`)}
              className="h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
        </PropertySection>
      )}

      {/* Shadow - hide for shapes (they use Glow Effect in ShapeStyleEditor) */}
      {element.content.type !== 'shape' && (
        <PropertySection title="Shadow">
          <ShadowEditor
            value={getStyle('boxShadow', '')}
            onChange={(shadow) => updateStyle('boxShadow', shadow)}
          />
        </PropertySection>
      )}

      {/* Blur - hide for shapes */}
      {element.content.type !== 'shape' && (
        <PropertySection title="Blur">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              value={parseInt(getStyle('filter', '').replace('blur(', '').replace('px)', '')) || 0}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                updateStyle('filter', val > 0 ? `blur(${val}px)` : '');
              }}
              className="h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
        </PropertySection>
      )}

      {/* Chart Styling Options */}
      {element.content.type === 'chart' && (
        <>
          <Separator className="my-2" />
          <ChartStyleEditor element={element} />
        </>
      )}

      {/* Map Styling Options */}
      {element.content.type === 'map' && (
        <>
          <Separator className="my-2" />
          <MapStyleEditor 
            element={element} 
            updateContent={updateMapContent}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
          />
        </>
      )}

      {/* Shape Styling Options */}
      {element.content.type === 'shape' && (
        <>
          <Separator className="my-2" />
          <ShapeStyleEditor 
            element={element} 
            updateContent={(updates) => {
              updateElement(element.id, {
                content: { ...element.content, ...updates } as Element['content'],
              });
            }}
          />
        </>
      )}


      {/* Ticker Styling Options */}
      {element.content.type === 'ticker' && (
        <>
          <Separator className="my-2" />
          <TickerStyleEditor
            element={element}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
          />
        </>
      )}

      {/* Image Styling Options */}
      {element.content.type === 'image' && (
        <>
          <Separator className="my-2" />
          <ImageStyleEditor
            element={element}
            updateContent={(updates) => {
              updateElement(element.id, {
                content: { ...element.content, ...updates } as Element['content'],
              });
            }}
          />
        </>
      )}

      {/* Interactive Element Properties */}
      {element.content.type === 'interactive' && (
        <>
          <Separator className="my-2" />
          <InteractivePropertiesEditor element={element} />
        </>
      )}
    </div>
  );
}

// Ticker Style Editor - handles all styling options for tickers
function TickerStyleEditor({ element, selectedKeyframe, currentAnimation }: EditorProps) {
  const { updateElement } = useDesignerStore();

  const tickerContent = element.content.type === 'ticker' ? element.content : null;

  if (!tickerContent) return null;

  const config = tickerContent.config || {};
  const updateStyle = (key: string, value: string | number) => {
    updateElement(element.id, {
      styles: { ...element.styles, [key]: value },
    });
  };
  const getStyle = (key: string, defaultValue: string = '') => {
    return (element.styles[key] as string) || defaultValue;
  };
  const updateContent = (updates: Partial<typeof tickerContent>) => {
    updateElement(element.id, {
      content: { ...element.content, ...updates } as Element['content'],
    });
  };
  const updateConfig = (updates: Partial<typeof config>) => {
    updateContent({ config: { ...config, ...updates } });
  };

  return (
    <div className="space-y-2">
      {/* Font Controls - Priority at top */}
      <PropertySection title="Font Size">
        <KeyframableProperty
          title=""
          propertyKey="tickerFontSize"
          elementId={element.id}
          elementName={element.name}
          selectedKeyframe={selectedKeyframe}
          currentAnimation={currentAnimation}
          currentValue={parseInt(getStyle('fontSize', '24')) || 24}
          onChange={(value) => updateStyle('fontSize', `${value}px`)}
          compact
        >
          {(displayValue, onChange) => (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="8"
                max="200"
                step="1"
                value={displayValue ?? (parseInt(getStyle('fontSize', '24')) || 24)}
                onChange={(e) => onChange(parseInt(e.target.value) || 24)}
                className="h-6 text-[10px]"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          )}
        </KeyframableProperty>
      </PropertySection>

      <PropertySection title="Font Color">
        <KeyframableProperty
          title=""
          propertyKey="tickerColor"
          elementId={element.id}
          elementName={element.name}
          selectedKeyframe={selectedKeyframe}
          currentAnimation={currentAnimation}
          currentValue={getStyle('color', '#ffffff')}
          onChange={(color) => updateStyle('color', color as string)}
          compact
        >
          {(displayValue, onChange) => (
            <ColorInput
              value={(displayValue as string) ?? getStyle('color', '#ffffff')}
              onChange={(c) => onChange(c)}
            />
          )}
        </KeyframableProperty>
      </PropertySection>

      <PropertySection title="Background Color">
        {(() => {
          const bgColor = getStyle('backgroundColor', 'transparent');
          const currentOpacity = getOpacityFromColor(bgColor);
          // Convert to hex for the color picker, preserving underlying color
          const baseColor = getBaseColor(bgColor);
          let hexValue = '#000000';
          const rgbMatch = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (rgbMatch) {
            hexValue = `#${parseInt(rgbMatch[1]).toString(16).padStart(2, '0')}${parseInt(rgbMatch[2]).toString(16).padStart(2, '0')}${parseInt(rgbMatch[3]).toString(16).padStart(2, '0')}`;
          } else if (baseColor.startsWith('#')) {
            hexValue = baseColor;
          }

          return (
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="color"
                  value={hexValue}
                  onChange={(e) => {
                    // Preserve current opacity when changing color
                    const newColor = e.target.value;
                    updateStyle('backgroundColor', applyOpacityToColor(newColor, currentOpacity));
                  }}
                  className="w-8 h-8 rounded border border-input cursor-pointer bg-transparent"
                />
              </div>
              <Input
                value={bgColor}
                onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                className="h-8 text-xs flex-1"
                placeholder="rgba(0, 0, 0, 1)"
              />
            </div>
          );
        })()}
      </PropertySection>

      <PropertySection title="Background Opacity">
        {(() => {
          const bgColor = getStyle('backgroundColor', 'transparent');
          const currentOpacity = getOpacityFromColor(bgColor);

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={currentOpacity}
                  onChange={(e) => {
                    const newOpacity = parseFloat(e.target.value);
                    const baseColor = getBaseColor(bgColor);
                    // If transparent or no color, use a default
                    if (baseColor === 'transparent' || !baseColor) {
                      updateStyle('backgroundColor', `rgba(0, 0, 0, ${newOpacity})`);
                    } else {
                      updateStyle('backgroundColor', applyOpacityToColor(baseColor, newOpacity));
                    }
                  }}
                  className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                  {Math.round(currentOpacity * 100)}%
                </span>
              </div>
            </div>
          );
        })()}
      </PropertySection>

      <PropertySection title="Font Family">
        <FontFamilyPicker
          value={getStyle('fontFamily', 'Inter')}
          onChange={(fontFamily) => updateStyle('fontFamily', fontFamily)}
        />
      </PropertySection>

      <PropertySection title="Text Alignment">
        <div className="flex gap-1">
          {[
            { value: 'left', icon: AlignLeft },
            { value: 'center', icon: AlignCenter },
            { value: 'right', icon: AlignRight },
          ].map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => updateStyle('textAlign', value)}
              className={cn(
                'flex-1 h-7 flex items-center justify-center rounded border',
                getStyle('textAlign', 'left') === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted border-input hover:bg-accent'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </PropertySection>

      <PropertySection title="Letter Spacing">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="-5"
            max="20"
            step="0.5"
            value={parseFloat(getStyle('letterSpacing', '0').replace('px', '')) || 0}
            onChange={(e) => updateStyle('letterSpacing', `${e.target.value}px`)}
            className="h-6 text-[10px]"
          />
          <span className="text-xs text-muted-foreground">px</span>
        </div>
      </PropertySection>

      <PropertySection title="Padding">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-muted-foreground mb-0.5 block">Left</label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                max="200"
                step="1"
                value={parseInt(getStyle('paddingLeft', '0').replace('px', '')) || 0}
                onChange={(e) => updateStyle('paddingLeft', `${e.target.value}px`)}
                className="h-6 text-[10px]"
              />
              <span className="text-[9px] text-muted-foreground">px</span>
            </div>
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground mb-0.5 block">Right</label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                max="200"
                step="1"
                value={parseInt(getStyle('paddingRight', '0').replace('px', '')) || 0}
                onChange={(e) => updateStyle('paddingRight', `${e.target.value}px`)}
                className="h-6 text-[10px]"
              />
              <span className="text-[9px] text-muted-foreground">px</span>
            </div>
          </div>
        </div>
      </PropertySection>

      <PropertySection title="Text Transform">
        <select
          value={getStyle('textTransform', 'none')}
          onChange={(e) => updateStyle('textTransform', e.target.value)}
          className="w-full h-7 text-[10px] bg-muted border border-input rounded-md px-2 cursor-pointer"
        >
          <option value="none">None</option>
          <option value="uppercase">UPPERCASE</option>
          <option value="lowercase">lowercase</option>
          <option value="capitalize">Capitalize</option>
        </select>
      </PropertySection>

      <Separator className="my-2" />

      {/* Ticker Settings */}
      <PropertySection title="Ticker Mode">
        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={config.mode || 'scroll'}
            onChange={(e) => updateConfig({ mode: e.target.value as any })}
            className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
          >
            <option value="scroll">Scroll</option>
            <option value="flip">Flip</option>
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
          </select>
          <select
            value={config.direction || 'left'}
            onChange={(e) => updateConfig({ direction: e.target.value as any })}
            className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
          </select>
        </div>
      </PropertySection>

      <PropertySection title={config.mode === 'scroll' ? 'Speed' : 'Delay'}>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={config.mode === 'scroll' ? 10 : 500}
            max={config.mode === 'scroll' ? 200 : 10000}
            step={config.mode === 'scroll' ? 5 : 100}
            value={config.mode === 'scroll' ? (config.speed || 80) : (config.delay || 3000)}
            onChange={(e) => updateConfig({
              [config.mode === 'scroll' ? 'speed' : 'delay']: parseFloat(e.target.value) || (config.mode === 'scroll' ? 80 : 3000)
            })}
            className="h-6 text-[10px]"
          />
          <span className="text-xs text-muted-foreground">
            {config.mode === 'scroll' ? 'px/s' : 'ms'}
          </span>
        </div>
      </PropertySection>

      {config.mode === 'scroll' && (
        <PropertySection title="Gap">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              max="200"
              step="10"
              value={config.gap || 60}
              onChange={(e) => updateConfig({ gap: parseFloat(e.target.value) || 60 })}
              className="h-6 text-[10px]"
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
        </PropertySection>
      )}

      <PropertySection title="Options">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
            <input
              type="checkbox"
              checked={config.pauseOnHover ?? true}
              onChange={(e) => updateConfig({ pauseOnHover: e.target.checked })}
              className="w-3 h-3 rounded"
            />
            <span>Pause on hover</span>
          </label>
          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
            <input
              type="checkbox"
              checked={config.loop ?? true}
              onChange={(e) => updateConfig({ loop: e.target.checked })}
              className="w-3 h-3 rounded"
            />
            <span>Loop continuously</span>
          </label>
          {config.mode === 'scroll' && (
            <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
              <input
                type="checkbox"
                checked={config.gradient ?? false}
                onChange={(e) => updateConfig({ gradient: e.target.checked })}
                className="w-3 h-3 rounded"
              />
              <span>Edge gradient fade</span>
            </label>
          )}
        </div>
      </PropertySection>

      {config.mode === 'scroll' && config.gradient && (
        <PropertySection title="Gradient">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                max="200"
                value={config.gradientWidth || 50}
                onChange={(e) => updateConfig({ gradientWidth: parseFloat(e.target.value) || 50 })}
                className="h-6 text-[10px]"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
            <ColorInput
              value={config.gradientColor || 'rgba(0, 0, 0, 0)'}
              onChange={(color) => updateConfig({ gradientColor: color })}
            />
          </div>
        </PropertySection>
      )}
    </div>
  );
}

// Ticker Content Editor - handles ticker items (separate from style editor)
function TickerContentEditor({ element, updateContent }: { element: Element; updateContent: (updates: Record<string, unknown>) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  const tickerContent = element.content.type === 'ticker' ? element.content : null;

  if (!tickerContent) return null;

  const items = tickerContent.items || [];

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    const newItem = {
      id: `item-${Date.now()}`,
      content: newItemText.trim(),
    };
    updateContent({ items: [...items, newItem] });
    setNewItemText('');
  };

  const handleRemoveItem = (id: string) => {
    updateContent({ items: items.filter((item: { id: string }) => item.id !== id) });
  };

  const handleUpdateItem = (id: string, updates: Record<string, unknown>) => {
    updateContent({
      items: items.map((item: { id: string }) => (item.id === id ? { ...item, ...updates } : item))
    });
    setEditingId(null);
  };

  const handleMoveItem = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);
    updateContent({ items: newItems });
  };

  return (
    <div className="space-y-2">
      <PropertySection title={`Ticker Items (${items.length})`}>
        <div className="space-y-2">
          {/* Add new item */}
          <div className="flex gap-1">
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Add ticker item..."
              className="h-6 text-[10px]"
            />
            <Button
              size="sm"
              variant="secondary"
              className="h-6 px-2"
              onClick={handleAddItem}
              disabled={!newItemText.trim()}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Items list */}
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {items.map((item: { id: string; content: string }, index: number) => (
              <TickerItemRowEditor
                key={item.id}
                item={item}
                index={index}
                totalItems={items.length}
                isEditing={editingId === item.id}
                onEdit={() => setEditingId(item.id)}
                onCancelEdit={() => setEditingId(null)}
                onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                onRemove={() => handleRemoveItem(item.id)}
                onMoveUp={() => handleMoveItem(index, 'up')}
                onMoveDown={() => handleMoveItem(index, 'down')}
              />
            ))}

            {items.length === 0 && (
              <div className="text-[10px] text-muted-foreground text-center py-4">
                No items. Add your first ticker item above.
              </div>
            )}
          </div>
        </div>
      </PropertySection>
    </div>
  );
}

// Ticker Item Row Editor - handles individual item editing
function TickerItemRowEditor({
  item,
  index,
  totalItems,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: { id: string; content: string };
  index: number;
  totalItems: number;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Record<string, unknown>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editValue, setEditValue] = useState(item.content);

  // Reset edit value when item changes
  useEffect(() => {
    setEditValue(item.content);
  }, [item.content]);

  const canMoveUp = index > 0;
  const canMoveDown = index < totalItems - 1;

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onUpdate({ content: editValue.trim() });
            if (e.key === 'Escape') onCancelEdit();
          }}
          className="h-6 text-[10px] flex-1"
          autoFocus
        />
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onUpdate({ content: editValue.trim() })}>
          <Check className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onCancelEdit}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 hover:bg-muted/50 rounded group">
      {/* Reorder buttons */}
      <div className="flex flex-col">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="p-0.5 hover:bg-muted rounded disabled:opacity-20 text-muted-foreground hover:text-foreground"
          title="Move up"
        >
          <ArrowUp className="w-3 h-3" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="p-0.5 hover:bg-muted rounded disabled:opacity-20 text-muted-foreground hover:text-foreground"
          title="Move down"
        >
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] truncate block">{item.content}</span>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={onEdit}>
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={onRemove}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// Shape Style Editor - handles all styling options for shapes
function ShapeStyleEditor({ element, updateContent }: { element: Element; updateContent: (updates: Record<string, unknown>) => void }) {
  const { updateElement } = useDesignerStore();
  const shapeContent = element.content.type === 'shape' ? element.content : null;

  if (!shapeContent) return null;

  const hasGradient = shapeContent.gradient?.enabled ?? false;

  // Style helpers for shadow
  const getStyle = (key: string, defaultValue: string = '') => {
    return (element.styles[key] as string) || defaultValue;
  };

  const updateStyle = (key: string, value: string | number) => {
    updateElement(element.id, {
      styles: { ...element.styles, [key]: value },
    });
  };

  return (
    <div className="space-y-3">
      <PropertySection title="Shape Type">
        <select
          value={shapeContent.shape || 'rectangle'}
          onChange={(e) => updateContent({ shape: e.target.value as 'rectangle' | 'ellipse' | 'rhombus' | 'trapezoid' | 'parallelogram' })}
          className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
        >
          <option value="rectangle">Rectangle</option>
          <option value="ellipse">Ellipse</option>
          <option value="parallelogram">Parallelogram</option>
          <option value="rhombus">Rhombus</option>
          <option value="trapezoid">Trapezoid</option>
        </select>
      </PropertySection>

      <PropertySection title="Fill">
        <div className="space-y-2">
          <AddressableProperty
            propertyPath="content.glass.enabled"
            label="Frosted Glass"
            elementName={element.name}
          >
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={shapeContent.glass?.enabled || false}
                onChange={(e) => updateContent({
                  glass: {
                    enabled: e.target.checked,
                    blur: shapeContent.glass?.blur ?? 16,
                    opacity: shapeContent.glass?.opacity ?? 0.6,
                    borderWidth: shapeContent.glass?.borderWidth ?? 1,
                    borderColor: shapeContent.glass?.borderColor ?? 'rgba(255, 255, 255, 0.1)',
                    saturation: shapeContent.glass?.saturation ?? 180,
                  },
                })}
                className="rounded"
              />
              <span>Frosted Glass</span>
            </label>
          </AddressableProperty>

          {shapeContent.glass?.enabled && (
            <div className="space-y-3 pt-2 pl-4 border-l-2 border-violet-500/30">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Blur Amount: {shapeContent.glass?.blur ?? 16}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={shapeContent.glass?.blur ?? 16}
                  onChange={(e) => updateContent({
                    glass: {
                      ...shapeContent.glass!,
                      blur: parseFloat(e.target.value),
                    },
                  })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Background Opacity: {Math.round((shapeContent.glass?.opacity ?? 0.6) * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={shapeContent.glass?.opacity ?? 0.6}
                  onChange={(e) => updateContent({
                    glass: {
                      ...shapeContent.glass!,
                      opacity: parseFloat(e.target.value),
                    },
                  })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Border Width</label>
                <Input
                  type="number"
                  value={shapeContent.glass?.borderWidth ?? 1}
                  onChange={(e) => updateContent({
                    glass: {
                      ...shapeContent.glass!,
                      borderWidth: parseFloat(e.target.value) || 0,
                    },
                  })}
                  min="0"
                  max="10"
                  className="h-6 text-[10px]"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Border Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={shapeContent.glass?.borderColor?.replace(/rgba?\(([^)]+)\)/, (match, values) => {
                      const nums = values.split(',').map((v: string) => parseFloat(v.trim()));
                      if (nums.length >= 3) {
                        const r = Math.round(nums[0]);
                        const g = Math.round(nums[1]);
                        const b = Math.round(nums[2]);
                        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                      }
                      return '#ffffff';
                    }) || '#ffffff'}
                    onChange={(e) => {
                      const hex = e.target.value;
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      updateContent({
                        glass: {
                          ...shapeContent.glass!,
                          borderColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
                        },
                      });
                    }}
                    className="h-8 w-16 rounded border border-input cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={shapeContent.glass?.borderColor ?? 'rgba(255, 255, 255, 0.1)'}
                    onChange={(e) => updateContent({
                      glass: {
                        ...shapeContent.glass!,
                        borderColor: e.target.value,
                      },
                    })}
                    placeholder="rgba(255, 255, 255, 0.1)"
                    className="flex-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Saturation: {shapeContent.glass?.saturation ?? 180}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={shapeContent.glass?.saturation ?? 180}
                  onChange={(e) => updateContent({
                    glass: {
                      ...shapeContent.glass!,
                      saturation: parseFloat(e.target.value),
                    },
                  })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Texture Fill - inside Fill section */}
          <TextureFillSection shapeContent={shapeContent} updateContent={updateContent} elementName={element.name} />

          <AddressableProperty
            propertyPath="content.gradient.enabled"
            label="Use Gradient"
            elementName={element.name}
          >
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={hasGradient}
                onChange={(e) => updateContent({
                  gradient: {
                    enabled: e.target.checked,
                    type: shapeContent.gradient?.type || 'linear',
                    direction: shapeContent.gradient?.direction || 0,
                    colors: shapeContent.gradient?.colors || [
                      { color: '#3B82F6', stop: 0 },
                      { color: '#8B5CF6', stop: 100 },
                    ],
                  },
                })}
                className="rounded"
              />
              <span>Use Gradient</span>
            </label>
          </AddressableProperty>

          {hasGradient ? (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Gradient Type</label>
                <select
                  value={shapeContent.gradient?.type || 'linear'}
                  onChange={(e) => updateContent({
                    gradient: {
                      ...shapeContent.gradient!,
                      type: e.target.value as 'linear' | 'radial' | 'conic',
                    },
                  })}
                  className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                >
                  <option value="linear">Linear</option>
                  <option value="radial">Radial</option>
                  <option value="conic">Conic</option>
                </select>
              </div>

              {shapeContent.gradient?.type === 'linear' && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Direction (degrees)</label>
                  <Input
                    type="number"
                    value={shapeContent.gradient?.direction || 0}
                    onChange={(e) => updateContent({
                      gradient: {
                        ...shapeContent.gradient!,
                        direction: parseFloat(e.target.value) || 0,
                      },
                    })}
                    min="0"
                    max="360"
                    className="h-6 text-[10px]"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Gradient Colors</label>
                <div className="space-y-2">
                  {(shapeContent.gradient?.colors || [
                    { color: '#3B82F6', stop: 0 },
                    { color: '#8B5CF6', stop: 100 },
                  ]).map((colorStop, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorStop.color}
                        onChange={(e) => {
                          const newColors = [...(shapeContent.gradient?.colors || [])];
                          newColors[index] = { ...newColors[index], color: e.target.value };
                          updateContent({
                            gradient: {
                              ...shapeContent.gradient!,
                              colors: newColors,
                            },
                          });
                        }}
                        className="h-8 w-16 cursor-pointer rounded border border-input"
                      />
                      <Input
                        type="number"
                        value={colorStop.stop}
                        onChange={(e) => {
                          const newColors = [...(shapeContent.gradient?.colors || [])];
                          newColors[index] = { ...newColors[index], stop: parseFloat(e.target.value) || 0 };
                          updateContent({
                            gradient: {
                              ...shapeContent.gradient!,
                              colors: newColors,
                            },
                          });
                        }}
                        min="0"
                        max="100"
                        className="h-8 w-16 text-xs"
                        placeholder="%"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                      {(shapeContent.gradient?.colors || []).length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const newColors = (shapeContent.gradient?.colors || []).filter((_, i) => i !== index);
                            updateContent({
                              gradient: {
                                ...shapeContent.gradient!,
                                colors: newColors,
                              },
                            });
                          }}
                        >
                          <span className="text-xs">×</span>
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => {
                      const currentColors = shapeContent.gradient?.colors || [];
                      const lastStop = currentColors[currentColors.length - 1]?.stop || 0;
                      const newColor = lastStop < 100 
                        ? { color: '#000000', stop: Math.min(lastStop + 20, 100) }
                        : { color: '#000000', stop: 100 };
                      updateContent({
                        gradient: {
                          ...shapeContent.gradient!,
                          colors: [...currentColors, newColor],
                        },
                      });
                    }}
                  >
                    + Add Color Stop
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fill Color</label>
              <input
                type="color"
                value={shapeContent.fill || '#3B82F6'}
                onChange={(e) => updateContent({ fill: e.target.value })}
                className="h-8 w-full cursor-pointer rounded border border-input"
              />
            </div>
          )}
        </div>
      </PropertySection>

      {/* Border - hide when glass is enabled since glass has its own border controls */}
      {!shapeContent.glass?.enabled && (
        <PropertySection title="Border">
          <div className="space-y-2">
            <input
              type="color"
              value={shapeContent.stroke || '#000000'}
              onChange={(e) => updateContent({ stroke: e.target.value })}
              className="h-8 w-full cursor-pointer rounded border border-input"
            />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Border Width</label>
              <Input
                type="number"
                value={shapeContent.strokeWidth || 0}
                onChange={(e) => updateContent({ strokeWidth: parseFloat(e.target.value) || 0 })}
                min="0"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </PropertySection>
      )}

      {(shapeContent.shape === 'rectangle' || shapeContent.shape === 'trapezoid') && (
        <PropertySection title="Corner Radius">
          <Input
            type="number"
            value={shapeContent.cornerRadius || 0}
            onChange={(e) => updateContent({ cornerRadius: parseFloat(e.target.value) || 0 })}
            min="0"
            className="h-8 text-xs"
          />
        </PropertySection>
      )}

      <PropertySection title="Glow Effect">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={shapeContent.glow?.enabled || false}
              onChange={(e) => updateContent({
                glow: {
                  enabled: e.target.checked,
                  color: shapeContent.glow?.color ?? shapeContent.fill ?? '#8B5CF6',
                  blur: shapeContent.glow?.blur ?? 20,
                  spread: shapeContent.glow?.spread ?? 0,
                  intensity: shapeContent.glow?.intensity ?? 0.6,
                },
              })}
              className="rounded"
            />
            <span>Enable Glow</span>
          </label>

          {shapeContent.glow?.enabled && (
            <div className="space-y-3 pt-2 pl-4 border-l-2 border-violet-500/30">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Glow Color</label>
                <input
                  type="color"
                  value={shapeContent.glow?.color || shapeContent.fill || '#8B5CF6'}
                  onChange={(e) => updateContent({
                    glow: {
                      ...shapeContent.glow!,
                      color: e.target.value,
                    },
                  })}
                  className="h-8 w-full cursor-pointer rounded border border-input"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Blur: {shapeContent.glow?.blur ?? 20}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={shapeContent.glow?.blur ?? 20}
                  onChange={(e) => updateContent({
                    glow: {
                      ...shapeContent.glow!,
                      blur: parseFloat(e.target.value),
                    },
                  })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Spread: {shapeContent.glow?.spread ?? 0}px
                </label>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={shapeContent.glow?.spread ?? 0}
                  onChange={(e) => updateContent({
                    glow: {
                      ...shapeContent.glow!,
                      spread: parseFloat(e.target.value),
                    },
                  })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Intensity: {Math.round((shapeContent.glow?.intensity ?? 0.6) * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={shapeContent.glow?.intensity ?? 0.6}
                  onChange={(e) => updateContent({
                    glow: {
                      ...shapeContent.glow!,
                      intensity: parseFloat(e.target.value),
                    },
                  })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </PropertySection>

      {/* Shadow - at the end for shapes */}
      <PropertySection title="Shadow">
        <ShadowEditor
          value={getStyle('boxShadow', '')}
          onChange={(shadow) => updateStyle('boxShadow', shadow)}
        />
      </PropertySection>
    </div>
  );
}

// Texture Fill Section for Shapes
function TextureFillSection({
  shapeContent,
  updateContent,
  elementName
}: {
  shapeContent: Extract<Element['content'], { type: 'shape' }>;
  updateContent: (updates: Record<string, unknown>) => void;
  elementName: string;
}) {
  const [showTexturePicker, setShowTexturePicker] = useState(false);
  const hasTexture = shapeContent.texture?.enabled ?? false;

  return (
    <>
      <AddressableProperty
        propertyPath="content.texture.enabled"
        label="Use Texture"
        elementName={elementName}
      >
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={hasTexture}
            onChange={(e) => updateContent({
              texture: {
                enabled: e.target.checked,
                url: shapeContent.texture?.url || '',
                fit: shapeContent.texture?.fit || 'cover',
                position: shapeContent.texture?.position || { x: 0, y: 0 },
                scale: shapeContent.texture?.scale ?? 1,
                rotation: shapeContent.texture?.rotation || 0,
                opacity: shapeContent.texture?.opacity ?? 1,
                blendMode: shapeContent.texture?.blendMode || 'normal',
              },
            })}
            className="rounded"
          />
          <span>Use Texture</span>
        </label>
      </AddressableProperty>

        {hasTexture && (
          <div className="space-y-3 pt-2 pl-4 border-l-2 border-violet-500/30">
            {/* Texture Preview & Select */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Texture Image/Video</label>
              <div className="flex gap-2 items-start">
                {shapeContent.texture?.url ? (
                  <div
                    className="relative w-16 h-16 rounded border border-input overflow-hidden cursor-pointer group"
                    onClick={() => setShowTexturePicker(true)}
                  >
                    {shapeContent.texture?.mediaType === 'video' ? (
                      <video
                        src={shapeContent.texture.url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={shapeContent.texture.thumbnailUrl || shapeContent.texture.url}
                        alt="Texture"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-white text-[10px]">Change</span>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTexturePicker(true)}
                    className="h-16 w-full text-xs"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Select Texture
                  </Button>
                )}
                {shapeContent.texture?.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => updateContent({
                      texture: {
                        ...shapeContent.texture!,
                        url: '',
                        thumbnailUrl: undefined,
                        mediaType: undefined,
                      },
                    })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Fit Mode */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fit Mode</label>
              <select
                value={shapeContent.texture?.fit || 'cover'}
                onChange={(e) => updateContent({
                  texture: {
                    ...shapeContent.texture!,
                    fit: e.target.value as 'cover' | 'contain' | 'fill' | 'tile',
                  },
                })}
                className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
              >
                <option value="cover">Cover (fill, crop if needed)</option>
                <option value="contain">Contain (fit inside)</option>
                <option value="fill">Fill (stretch to fit)</option>
                <option value="tile">Tile (repeat pattern)</option>
              </select>
            </div>

            {/* Scale */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Scale: {((shapeContent.texture?.scale ?? 1) * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={shapeContent.texture?.scale ?? 1}
                onChange={(e) => updateContent({
                  texture: {
                    ...shapeContent.texture!,
                    scale: parseFloat(e.target.value),
                  },
                })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Position X/Y */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Position Offset</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">X: {shapeContent.texture?.position?.x ?? 0}%</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={shapeContent.texture?.position?.x ?? 0}
                    onChange={(e) => updateContent({
                      texture: {
                        ...shapeContent.texture!,
                        position: {
                          x: parseFloat(e.target.value),
                          y: shapeContent.texture?.position?.y ?? 0,
                        },
                      },
                    })}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Y: {shapeContent.texture?.position?.y ?? 0}%</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={shapeContent.texture?.position?.y ?? 0}
                    onChange={(e) => updateContent({
                      texture: {
                        ...shapeContent.texture!,
                        position: {
                          x: shapeContent.texture?.position?.x ?? 0,
                          y: parseFloat(e.target.value),
                        },
                      },
                    })}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Rotation */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Rotation: {shapeContent.texture?.rotation ?? 0}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={shapeContent.texture?.rotation ?? 0}
                onChange={(e) => updateContent({
                  texture: {
                    ...shapeContent.texture!,
                    rotation: parseFloat(e.target.value),
                  },
                })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Opacity */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Opacity: {Math.round((shapeContent.texture?.opacity ?? 1) * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={shapeContent.texture?.opacity ?? 1}
                onChange={(e) => updateContent({
                  texture: {
                    ...shapeContent.texture!,
                    opacity: parseFloat(e.target.value),
                  },
                })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Blur */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Blur: {shapeContent.texture?.blur ?? 0}px
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={shapeContent.texture?.blur ?? 0}
                onChange={(e) => updateContent({
                  texture: {
                    ...shapeContent.texture!,
                    blur: parseFloat(e.target.value),
                  },
                })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Blend Mode */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Blend Mode</label>
              <select
                value={shapeContent.texture?.blendMode || 'normal'}
                onChange={(e) => updateContent({
                  texture: {
                    ...shapeContent.texture!,
                    blendMode: e.target.value as 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten',
                  },
                })}
                className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
              >
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="lighten">Lighten</option>
              </select>
            </div>

            {/* Video-specific options */}
            {shapeContent.texture?.mediaType === 'video' && (
              <>
                {/* Playback Mode */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Playback Mode</label>
                  <select
                    value={shapeContent.texture?.playbackMode || 'loop'}
                    onChange={(e) => updateContent({
                      texture: {
                        ...shapeContent.texture!,
                        playbackMode: e.target.value as 'loop' | 'pingpong' | 'once',
                      },
                    })}
                    className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
                  >
                    <option value="loop">Loop</option>
                    <option value="pingpong">Ping Pong</option>
                    <option value="once">Play Once</option>
                  </select>
                </div>

                {/* Playback Speed */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Speed: {shapeContent.texture?.playbackSpeed ?? 1}x
                  </label>
                  <input
                    type="range"
                    min="0.25"
                    max="2"
                    step="0.25"
                    value={shapeContent.texture?.playbackSpeed ?? 1}
                    onChange={(e) => updateContent({
                      texture: {
                        ...shapeContent.texture!,
                        playbackSpeed: parseFloat(e.target.value),
                      },
                    })}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>
        )}

      {/* Texture Picker Dialog */}
      <MediaPickerDialog
        open={showTexturePicker}
        onOpenChange={setShowTexturePicker}
        onSelect={(url, asset) => {
          updateContent({
            texture: {
              ...shapeContent.texture!,
              enabled: true,
              url: url,
              thumbnailUrl: asset?.thumbnail_url || undefined,
              mediaType: asset?.media_type as 'image' | 'video' || 'image',
            },
          });
          setShowTexturePicker(false);
        }}
        mediaType="all"
        title="Select Texture"
      />
    </>
  );
}

function ChartStyleEditor({ element }: { element: Element }) {
  const { updateElement } = useDesignerStore();
  const chartContent = element.content.type === 'chart' ? element.content : null;
  
  if (!chartContent) return null;

  const updateContent = (updates: Partial<typeof chartContent>) => {
    updateElement(element.id, {
      content: { ...chartContent, ...updates } as Element['content'],
    });
  };

  return (
    <div className="space-y-2">
      {/* Colors Section */}
      <PropertySection title="Colors">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Global Color Palette</label>
            <Input
              value={(chartContent.options?.colors || []).join(', ') || ''}
              onChange={(e) => {
                const colorArray = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                updateContent({
                  options: { ...chartContent.options, colors: colorArray }
                });
              }}
              placeholder="#3B82F6, #10B981, #F59E0B..."
              className="h-6 text-[10px]"
            />
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Comma-separated hex colors. Used as fallback if per-bar colors not set.
            </p>
          </div>

          {(chartContent.chartType === 'bar' || chartContent.chartType === 'horizontal-bar' || chartContent.chartType === 'pie' || chartContent.chartType === 'donut') && (
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">
                Per-Bar Colors ({chartContent.data?.labels?.length || 0} bars)
              </label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {(chartContent.data?.labels || []).map((label, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <span className="text-[9px] text-muted-foreground w-16 truncate">{label}</span>
                    <input
                      type="color"
                      value={chartContent.options?.barColors?.[index] || '#3B82F6'}
                      onChange={(e) => {
                        const newColors = [...(chartContent.options?.barColors || [])];
                        newColors[index] = e.target.value;
                        while (newColors.length < (chartContent.data?.labels?.length || 0)) {
                          newColors.push('#3B82F6');
                        }
                        updateContent({
                          options: { ...chartContent.options, barColors: newColors }
                        });
                      }}
                      className="h-6 w-12 rounded border border-input cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={chartContent.options?.barColors?.[index] || '#3B82F6'}
                      onChange={(e) => {
                        const newColors = [...(chartContent.options?.barColors || [])];
                        newColors[index] = e.target.value;
                        while (newColors.length < (chartContent.data?.labels?.length || 0)) {
                          newColors.push('#3B82F6');
                        }
                        updateContent({
                          options: { ...chartContent.options, barColors: newColors }
                        });
                      }}
                      placeholder="#3B82F6"
                      className="flex-1 h-6 text-[9px]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PropertySection>

      <Separator />

      {/* Fonts Section */}
      <PropertySection title="Fonts">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Font Family</label>
            <FontFamilyPicker
              value={chartContent.options?.fontFamily || 'Inter'}
              onChange={(fontFamily) => updateContent({
                options: { ...chartContent.options, fontFamily }
              })}
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Title Font Size</label>
              <Input
                type="number"
                value={chartContent.options?.titleFontSize || 16}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, titleFontSize: parseFloat(e.target.value) || 16 }
                })}
                min="8"
                max="48"
                className="h-6 text-[10px]"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Title Font Weight</label>
              <select
                value={chartContent.options?.titleFontWeight || 'bold'}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, titleFontWeight: e.target.value }
                })}
                className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Title Color</label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={chartContent.options?.titleColor || '#FFFFFF'}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, titleColor: e.target.value }
                })}
                className="h-6 w-12 rounded border border-input cursor-pointer"
              />
              <Input
                type="text"
                value={chartContent.options?.titleColor || '#FFFFFF'}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, titleColor: e.target.value }
                })}
                placeholder="#FFFFFF"
                className="flex-1 h-6 text-[9px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Label Font Size</label>
              <Input
                type="number"
                value={chartContent.options?.labelFontSize || 12}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, labelFontSize: parseFloat(e.target.value) || 12 }
                })}
                min="8"
                max="32"
                className="h-6 text-[10px]"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Value Font Size</label>
              <Input
                type="number"
                value={chartContent.options?.valueFontSize || 12}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, valueFontSize: parseFloat(e.target.value) || 12 }
                })}
                min="8"
                max="32"
                className="h-6 text-[10px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Label Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={chartContent.options?.labelColor || '#FFFFFF'}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, labelColor: e.target.value }
                  })}
                  className="h-6 w-10 rounded border border-input cursor-pointer"
                />
                <Input
                  type="text"
                  value={chartContent.options?.labelColor || '#FFFFFF'}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, labelColor: e.target.value }
                  })}
                  className="flex-1 h-6 text-[9px]"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Value Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={chartContent.options?.valueColor || '#FFFFFF'}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, valueColor: e.target.value }
                  })}
                  className="h-6 w-10 rounded border border-input cursor-pointer"
                />
                <Input
                  type="text"
                  value={chartContent.options?.valueColor || '#FFFFFF'}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, valueColor: e.target.value }
                  })}
                  className="flex-1 h-6 text-[9px]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Legend Font Size</label>
              <Input
                type="number"
                value={chartContent.options?.legendFontSize || 12}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, legendFontSize: parseFloat(e.target.value) || 12 }
                })}
                min="8"
                max="32"
                className="h-6 text-[10px]"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Axis Font Size</label>
              <Input
                type="number"
                value={chartContent.options?.axisFontSize || 12}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, axisFontSize: parseFloat(e.target.value) || 12 }
                })}
                min="8"
                max="32"
                className="h-6 text-[10px]"
              />
            </div>
          </div>
        </div>
      </PropertySection>

      {/* Chart-Specific Styling */}
      {(chartContent.chartType === 'bar' || chartContent.chartType === 'horizontal-bar') && (
        <>
          <Separator />
          <PropertySection title="Bar Styling">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Border Width</label>
                  <Input
                    type="number"
                    value={chartContent.options?.barBorderWidth ?? 2}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, barBorderWidth: parseFloat(e.target.value) || 0 }
                    })}
                    min="0"
                    max="10"
                    className="h-6 text-[10px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Border Radius</label>
                  <Input
                    type="number"
                    value={chartContent.options?.barBorderRadius ?? 0}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, barBorderRadius: parseFloat(e.target.value) || 0 }
                    })}
                    min="0"
                    max="20"
                    className="h-6 text-[10px]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Bar Spacing (gap %)</label>
                <Input
                  type="number"
                  value={chartContent.options?.barSpacing ?? 0}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, barSpacing: parseFloat(e.target.value) || 0 }
                  })}
                  min="0"
                  max="50"
                  step="1"
                  className="h-6 text-[10px]"
                />
              </div>
            </div>
          </PropertySection>
        </>
      )}

      {(chartContent.chartType === 'line' || chartContent.chartType === 'area') && (
        <>
          <Separator />
          <PropertySection title="Line Styling">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Line Width</label>
                  <Input
                    type="number"
                    value={chartContent.options?.lineWidth ?? 2}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, lineWidth: parseFloat(e.target.value) || 2 }
                    })}
                    min="1"
                    max="10"
                    className="h-6 text-[10px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Line Tension (0-1)</label>
                  <Input
                    type="number"
                    value={chartContent.options?.lineTension ?? 0.4}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, lineTension: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0.4)) }
                    })}
                    min="0"
                    max="1"
                    step="0.1"
                    className="h-6 text-[10px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Point Radius</label>
                  <Input
                    type="number"
                    value={chartContent.options?.pointRadius ?? 4}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, pointRadius: parseFloat(e.target.value) || 4 }
                    })}
                    min="0"
                    max="20"
                    className="h-6 text-[10px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Point Hover Radius</label>
                  <Input
                    type="number"
                    value={chartContent.options?.pointHoverRadius ?? 6}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, pointHoverRadius: parseFloat(e.target.value) || 6 }
                    })}
                    min="0"
                    max="20"
                    className="h-6 text-[10px]"
                  />
                </div>
              </div>
              {chartContent.chartType === 'area' && (
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Area Opacity (0-1)</label>
                  <Input
                    type="number"
                    value={chartContent.options?.areaOpacity ?? 0.3}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, areaOpacity: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0.3)) }
                    })}
                    min="0"
                    max="1"
                    step="0.1"
                    className="h-6 text-[10px]"
                  />
                </div>
              )}
            </div>
          </PropertySection>
        </>
      )}

      {chartContent.chartType === 'donut' && (
        <>
          <Separator />
          <PropertySection title="Donut Styling">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Cutout Percentage (0-100)</label>
              <Input
                type="number"
                value={chartContent.options?.donutCutout ?? 60}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, donutCutout: Math.min(100, Math.max(0, parseFloat(e.target.value) || 60)) }
                })}
                min="0"
                max="100"
                className="h-6 text-[10px]"
              />
            </div>
          </PropertySection>
        </>
      )}

      {/* Parliament Styling */}
      {chartContent.chartType === 'parliament' && (
        <>
          <Separator />
          <PropertySection title="Parliament Styling">
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Seat Size</label>
                <Input
                  type="number"
                  value={chartContent.options?.seatRadius || 8}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, seatRadius: parseFloat(e.target.value) || 8 }
                  })}
                  min="4"
                  max="20"
                  className="h-6 text-[10px]"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Row Spacing</label>
                <Input
                  type="number"
                  value={chartContent.options?.rowHeight || 20}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, rowHeight: parseFloat(e.target.value) || 20 }
                  })}
                  min="10"
                  max="40"
                  className="h-6 text-[10px]"
                />
              </div>
              <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={chartContent.options?.flipped || false}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, flipped: e.target.checked }
                  })}
                  className="rounded"
                />
                Flip Upside Down
              </label>
            </div>
          </PropertySection>

          <Separator />
          <PropertySection title="Party Breakdown Labels">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={chartContent.options?.showPartyBreakdown || false}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, showPartyBreakdown: e.target.checked }
                  })}
                  className="rounded"
                />
                Show Party Breakdown
              </label>

              {chartContent.options?.showPartyBreakdown && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Number Size</label>
                    <Input
                      type="number"
                      value={chartContent.options?.breakdownFontSize || 48}
                      onChange={(e) => updateContent({
                        options: { ...chartContent.options, breakdownFontSize: parseFloat(e.target.value) || 48 }
                      })}
                      min="20"
                      max="100"
                      className="h-6 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Label Size</label>
                    <Input
                      type="number"
                      value={chartContent.options?.breakdownLabelSize || 14}
                      onChange={(e) => updateContent({
                        options: { ...chartContent.options, breakdownLabelSize: parseFloat(e.target.value) || 14 }
                      })}
                      min="8"
                      max="24"
                      className="h-6 text-[10px]"
                    />
                  </div>
                </div>
              )}
            </div>
          </PropertySection>

          <Separator />
          <PropertySection title="Balance of Power Bar">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={chartContent.options?.showBalanceOfPower || false}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, showBalanceOfPower: e.target.checked }
                  })}
                  className="rounded"
                />
                Show Balance of Power
              </label>

              {chartContent.options?.showBalanceOfPower && (
                <>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Bar Title (optional)</label>
                    <Input
                      type="text"
                      value={chartContent.options?.balanceTitle || ''}
                      onChange={(e) => updateContent({
                        options: { ...chartContent.options, balanceTitle: e.target.value }
                      })}
                      placeholder="e.g., BALANCE OF POWER"
                      className="h-6 text-[10px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Bar Height</label>
                      <Input
                        type="number"
                        value={chartContent.options?.balanceBarHeight || 28}
                        onChange={(e) => updateContent({
                          options: { ...chartContent.options, balanceBarHeight: parseFloat(e.target.value) || 28 }
                        })}
                        min="16"
                        max="50"
                        className="h-6 text-[10px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Bar Y Position</label>
                      <Input
                        type="number"
                        value={chartContent.options?.balanceBarY ?? ''}
                        onChange={(e) => updateContent({
                          options: {
                            ...chartContent.options,
                            balanceBarY: e.target.value === '' ? undefined : parseFloat(e.target.value)
                          }
                        })}
                        placeholder="auto"
                        className="h-6 text-[10px]"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </PropertySection>
        </>
      )}

      {/* Axis & Grid */}
      {(chartContent.chartType === 'bar' || chartContent.chartType === 'horizontal-bar' || chartContent.chartType === 'line' || chartContent.chartType === 'area') && (
        <>
          <Separator />
          <PropertySection title="Axis & Grid">
            <div className="space-y-2">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chartContent.options?.showXAxis !== false}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, showXAxis: e.target.checked }
                    })}
                    className="rounded"
                  />
                  Show X Axis
                </label>
                <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chartContent.options?.showYAxis !== false}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, showYAxis: e.target.checked }
                    })}
                    className="rounded"
                  />
                  Show Y Axis
                </label>
                <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chartContent.options?.showGrid !== false}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, showGrid: e.target.checked }
                    })}
                    className="rounded"
                  />
                  Show Grid
                </label>
              </div>

              {chartContent.options?.showGrid !== false && (
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Grid Color</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={chartContent.options?.gridColor || 'rgba(255,255,255,0.1)'}
                      onChange={(e) => updateContent({
                        options: { ...chartContent.options, gridColor: e.target.value }
                      })}
                      className="h-6 w-12 rounded border border-input cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={chartContent.options?.gridColor || 'rgba(255,255,255,0.1)'}
                      onChange={(e) => updateContent({
                        options: { ...chartContent.options, gridColor: e.target.value }
                      })}
                      className="flex-1 h-6 text-[9px]"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Grid Line Width</label>
                  <Input
                    type="number"
                    value={chartContent.options?.gridLineWidth ?? 1}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, gridLineWidth: parseFloat(e.target.value) || 1 }
                    })}
                    min="1"
                    max="5"
                    className="h-6 text-[10px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Axis Line Width</label>
                  <Input
                    type="number"
                    value={chartContent.options?.axisLineWidth ?? 1}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, axisLineWidth: parseFloat(e.target.value) || 1 }
                    })}
                    min="1"
                    max="5"
                    className="h-6 text-[10px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Axis Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={chartContent.options?.axisColor || '#9CA3AF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, axisColor: e.target.value }
                    })}
                    className="h-6 w-12 rounded border border-input cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={chartContent.options?.axisColor || '#9CA3AF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, axisColor: e.target.value }
                    })}
                    className="flex-1 h-6 text-[9px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Axis Line Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={chartContent.options?.axisLineColor || 'rgba(255,255,255,0.2)'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, axisLineColor: e.target.value }
                    })}
                    className="h-6 w-12 rounded border border-input cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={chartContent.options?.axisLineColor || 'rgba(255,255,255,0.2)'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, axisLineColor: e.target.value }
                    })}
                    className="flex-1 h-6 text-[9px]"
                  />
                </div>
              </div>
            </div>
          </PropertySection>
        </>
      )}
    </div>
  );
}

// Image Style Editor - handles remove background and other image-specific styling
function ImageStyleEditor({ element, updateContent }: { element: Element; updateContent: (updates: Record<string, unknown>) => void }) {
  const imageContent = element.content.type === 'image' ? element.content : null;

  if (!imageContent) return null;

  const removeColor = imageContent.removeBackground?.color || '#FFFFFF';

  return (
    <div className="space-y-2">
      <PropertySection title="Remove Background Color">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={imageContent.removeBackground?.enabled || false}
              onChange={(e) => updateContent({
                removeBackground: {
                  enabled: e.target.checked,
                  color: imageContent.removeBackground?.color ?? '#FFFFFF',
                  threshold: imageContent.removeBackground?.threshold ?? 240,
                  feather: imageContent.removeBackground?.feather ?? 0,
                },
              })}
              className="rounded"
            />
            <Eraser className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Remove background color</span>
          </label>

          {imageContent.removeBackground?.enabled && (
            <div className="space-y-3 pl-4 border-l-2 border-violet-500/30">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Color to Remove
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={removeColor}
                    onChange={(e) => updateContent({
                      removeBackground: {
                        ...imageContent.removeBackground!,
                        color: e.target.value,
                      },
                    })}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={removeColor}
                    onChange={(e) => updateContent({
                      removeBackground: {
                        ...imageContent.removeBackground!,
                        color: e.target.value,
                      },
                    })}
                    className="flex-1 h-8 text-xs uppercase"
                    placeholder="#FFFFFF"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Select the background color to make transparent.
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Tolerance: {imageContent.removeBackground?.threshold || 240}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="200"
                    max="255"
                    step="1"
                    value={imageContent.removeBackground?.threshold || 240}
                    onChange={(e) => updateContent({
                      removeBackground: {
                        ...imageContent.removeBackground!,
                        threshold: parseInt(e.target.value) || 240,
                      },
                    })}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <Input
                    type="number"
                    value={imageContent.removeBackground?.threshold || 240}
                    onChange={(e) => updateContent({
                      removeBackground: {
                        ...imageContent.removeBackground!,
                        threshold: parseInt(e.target.value) || 240,
                      },
                    })}
                    min="200"
                    max="255"
                    className="w-16 h-8 text-xs"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Higher = exact color match only. Lower = more similar colors removed.
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Feather: {imageContent.removeBackground?.feather || 0}px
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={imageContent.removeBackground?.feather || 0}
                    onChange={(e) => updateContent({
                      removeBackground: {
                        ...imageContent.removeBackground!,
                        feather: parseInt(e.target.value) || 0,
                      },
                    })}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <Input
                    type="number"
                    value={imageContent.removeBackground?.feather || 0}
                    onChange={(e) => updateContent({
                      removeBackground: {
                        ...imageContent.removeBackground!,
                        feather: parseInt(e.target.value) || 0,
                      },
                    })}
                    min="0"
                    max="10"
                    className="w-16 h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">px</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Softens the edges between removed and kept areas.
                </p>
              </div>
            </div>
          )}
        </div>
      </PropertySection>
    </div>
  );
}

// Auto Follow Editor - allows element to follow another element's position
function AutoFollowEditor({ element }: { element: Element }) {
  const { updateElement, elements } = useDesignerStore();

  // Get other elements that can be followed (exclude self)
  const availableTargets = elements.filter(e => e.id !== element.id);

  const autoFollow = element.autoFollow || {
    enabled: false,
    targetElementId: '',
    side: 'right' as const,
    padding: 10,
    offsetX: 0,
    offsetY: 0,
  };

  const updateAutoFollow = (updates: Partial<typeof autoFollow>) => {
    updateElement(element.id, {
      autoFollow: { ...autoFollow, ...updates },
    });
  };

  return (
    <SearchableSection title="Auto Follow">
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={autoFollow.enabled}
          onChange={(e) => updateAutoFollow({ enabled: e.target.checked })}
          className="rounded"
        />
        <span>Follow another element</span>
      </label>

      {autoFollow.enabled && (
        <div className="space-y-3 pt-2 pl-4 border-l-2 border-violet-500/30">
          {/* Target Element Selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target Element</label>
            <select
              value={autoFollow.targetElementId}
              onChange={(e) => updateAutoFollow({ targetElementId: e.target.value })}
              className="w-full h-7 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
            >
              <option value="">Select element...</option>
              {availableTargets.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.name || el.element_id}
                </option>
              ))}
            </select>
          </div>

          {/* Side Selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Follow Side</label>
            <select
              value={autoFollow.side}
              onChange={(e) => updateAutoFollow({ side: e.target.value as 'left' | 'right' | 'top' | 'bottom' })}
              className="w-full h-7 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
            >
              <option value="right">Right (position to the right of target)</option>
              <option value="left">Left (position to the left of target)</option>
              <option value="bottom">Bottom (position below target)</option>
              <option value="top">Top (position above target)</option>
            </select>
          </div>

          {/* Padding */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Padding (gap)</label>
            <Input
              type="number"
              value={autoFollow.padding}
              onChange={(e) => updateAutoFollow({ padding: parseFloat(e.target.value) || 0 })}
              min="0"
              className="h-7 text-xs"
            />
          </div>

          {/* Horizontal Offset - shown when following top/bottom */}
          {(autoFollow.side === 'top' || autoFollow.side === 'bottom') && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Horizontal Offset</label>
              <Input
                type="number"
                value={autoFollow.offsetX ?? 0}
                onChange={(e) => updateAutoFollow({ offsetX: parseFloat(e.target.value) || 0 })}
                className="h-7 text-xs"
              />
            </div>
          )}

          {/* Vertical Offset - shown when following left/right */}
          {(autoFollow.side === 'left' || autoFollow.side === 'right') && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Vertical Offset</label>
              <Input
                type="number"
                value={autoFollow.offsetY ?? 0}
                onChange={(e) => updateAutoFollow({ offsetY: parseFloat(e.target.value) || 0 })}
                className="h-7 text-xs"
              />
            </div>
          )}
        </div>
      )}
    </SearchableSection>
  );
}

function LayoutEditor({ element, selectedKeyframe, currentAnimation }: EditorProps) {
  const {
    updateElement,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    setZIndex,
    updateFitToContentParent,
  } = useDesignerStore();

  return (
    <div className="space-y-4">
      {/* Position Section */}
      <SearchableSection title="Position">
        <div className="grid grid-cols-2 gap-2">
          <KeyframableProperty
            title="X"
            propertyKey="position_x"
            elementId={element.id}
            elementName={element.name}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
            currentValue={element.position_x}
            onChange={(value) => updateElement(element.id, { position_x: value as number })}
            compact
          >
            {(displayValue, onChange) => (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground w-4">X</span>
                <Input
                  type="number"
                  value={Math.round(Number(displayValue) ?? element.position_x)}
                  onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
            )}
          </KeyframableProperty>
          <KeyframableProperty
            title="Y"
            propertyKey="position_y"
            elementId={element.id}
            elementName={element.name}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
            currentValue={element.position_y}
            onChange={(value) => updateElement(element.id, { position_y: value as number })}
            compact
          >
            {(displayValue, onChange) => (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground w-4">Y</span>
                <Input
                  type="number"
                  value={Math.round(Number(displayValue) ?? element.position_y)}
                  onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
            )}
          </KeyframableProperty>
        </div>
      </SearchableSection>

      {/* Size Section */}
      <SearchableSection title="Size">
        <div className="grid grid-cols-2 gap-2">
          <KeyframableProperty
            title="W"
            propertyKey="width"
            elementId={element.id}
            elementName={element.name}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
            currentValue={element.width}
            onChange={(value) => updateElement(element.id, { width: value as number | null })}
            compact
          >
            {(displayValue, onChange) => (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground w-4">W</span>
                <Input
                  type="number"
                  min="0"
                  value={displayValue ?? element.width ?? ''}
                  onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="auto"
                  className="h-7 text-xs"
                />
              </div>
            )}
          </KeyframableProperty>
          <KeyframableProperty
            title="H"
            propertyKey="height"
            elementId={element.id}
            elementName={element.name}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
            currentValue={element.height}
            onChange={(value) => updateElement(element.id, { height: value as number | null })}
            compact
          >
            {(displayValue, onChange) => (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground w-4">H</span>
                <Input
                  type="number"
                  min="0"
                  value={displayValue ?? element.height ?? ''}
                  onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="auto"
                  className="h-7 text-xs"
                />
              </div>
            )}
          </KeyframableProperty>
        </div>
      </SearchableSection>

      {/* Fit to Content - only for shapes */}
      {element.element_type === 'shape' && element.content.type === 'shape' && (
        <SearchableSection title="Auto-Size">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={(element.content as { fitToContent?: boolean }).fitToContent || false}
              onChange={(e) => {
                updateElement(element.id, {
                  content: {
                    ...element.content,
                    fitToContent: e.target.checked,
                  } as Element['content'],
                });
                // Trigger resize calculation when enabled
                if (e.target.checked) {
                  setTimeout(() => updateFitToContentParent(element.id), 0);
                }
              }}
              className="rounded"
            />
            <span>Fit to Children</span>
          </label>

          {(element.content as { fitToContent?: boolean }).fitToContent && (
            <div className="space-y-3 pt-2 pl-4 border-l-2 border-violet-500/30">
              <div className="text-xs text-muted-foreground mb-2">
                Padding (px)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Top</label>
                  <Input
                    type="number"
                    value={(element.content as { fitPadding?: { top?: number } }).fitPadding?.top ?? 16}
                    onChange={(e) => {
                      updateElement(element.id, {
                        content: {
                          ...element.content,
                          fitPadding: {
                            ...(element.content as { fitPadding?: Record<string, number> }).fitPadding,
                            top: parseFloat(e.target.value) || 0,
                          },
                        } as Element['content'],
                      });
                      setTimeout(() => updateFitToContentParent(element.id), 0);
                    }}
                    min="0"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Right</label>
                  <Input
                    type="number"
                    value={(element.content as { fitPadding?: { right?: number } }).fitPadding?.right ?? 16}
                    onChange={(e) => {
                      updateElement(element.id, {
                        content: {
                          ...element.content,
                          fitPadding: {
                            ...(element.content as { fitPadding?: Record<string, number> }).fitPadding,
                            right: parseFloat(e.target.value) || 0,
                          },
                        } as Element['content'],
                      });
                      setTimeout(() => updateFitToContentParent(element.id), 0);
                    }}
                    min="0"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Bottom</label>
                  <Input
                    type="number"
                    value={(element.content as { fitPadding?: { bottom?: number } }).fitPadding?.bottom ?? 16}
                    onChange={(e) => {
                      updateElement(element.id, {
                        content: {
                          ...element.content,
                          fitPadding: {
                            ...(element.content as { fitPadding?: Record<string, number> }).fitPadding,
                            bottom: parseFloat(e.target.value) || 0,
                          },
                        } as Element['content'],
                      });
                      setTimeout(() => updateFitToContentParent(element.id), 0);
                    }}
                    min="0"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Left</label>
                  <Input
                    type="number"
                    value={(element.content as { fitPadding?: { left?: number } }).fitPadding?.left ?? 16}
                    onChange={(e) => {
                      updateElement(element.id, {
                        content: {
                          ...element.content,
                          fitPadding: {
                            ...(element.content as { fitPadding?: Record<string, number> }).fitPadding,
                            left: parseFloat(e.target.value) || 0,
                          },
                        } as Element['content'],
                      });
                      setTimeout(() => updateFitToContentParent(element.id), 0);
                    }}
                    min="0"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </SearchableSection>
      )}

      {/* Auto Follow Section */}
      <AutoFollowEditor element={element} />

      <Separator />

      {/* Transform Section */}
      <SearchableSection title="Transform">
        {/* Rotation */}
        <KeyframableProperty
          title="Rotation"
          propertyKey="rotation"
          elementId={element.id}
          elementName={element.name}
          selectedKeyframe={selectedKeyframe}
          currentAnimation={currentAnimation}
          currentValue={element.rotation}
          onChange={(value) => updateElement(element.id, { rotation: value as number })}
        >
          {(displayValue, onChange) => (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12">Rotate</span>
              <Input
                type="number"
                value={displayValue ?? element.rotation}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className="h-7 text-xs flex-1"
              />
              <span className="text-xs text-muted-foreground">°</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onChange(0)}
                title="Reset rotation"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
          )}
        </KeyframableProperty>

        {/* Scale */}
        <div className="grid grid-cols-2 gap-2">
          <KeyframableProperty
            title="Scale X"
            propertyKey="scale_x"
            elementId={element.id}
            elementName={element.name}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
            currentValue={element.scale_x}
            onChange={(value) => updateElement(element.id, { scale_x: value as number })}
            compact
          >
            {(displayValue, onChange) => (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground w-8">Sx</span>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={displayValue ?? element.scale_x}
                  onChange={(e) => onChange(parseFloat(e.target.value) || 1)}
                  className="h-7 text-xs"
                />
              </div>
            )}
          </KeyframableProperty>
          <KeyframableProperty
            title="Scale Y"
            propertyKey="scale_y"
            elementId={element.id}
            elementName={element.name}
            selectedKeyframe={selectedKeyframe}
            currentAnimation={currentAnimation}
            currentValue={element.scale_y}
            onChange={(value) => updateElement(element.id, { scale_y: value as number })}
            compact
          >
            {(displayValue, onChange) => (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground w-8">Sy</span>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={displayValue ?? element.scale_y}
                  onChange={(e) => onChange(parseFloat(e.target.value) || 1)}
                  className="h-7 text-xs"
                />
              </div>
            )}
          </KeyframableProperty>
        </div>
      </SearchableSection>

      <Separator />

      {/* Screen Mask Section */}
      <SearchableSection title="Screen Mask" icon={<Scissors className="w-3.5 h-3.5" />}>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={element.screenMask?.enabled || false}
            onChange={(e) => {
              updateElement(element.id, {
                screenMask: e.target.checked
                  ? {
                      enabled: true,
                      x: 0,
                      y: 0,
                      width: 1920,
                      height: 1080,
                      feather: { top: 0, right: 0, bottom: 0, left: 0 },
                    }
                  : { enabled: false, x: 0, y: 0, width: 1920, height: 1080, feather: { top: 0, right: 0, bottom: 0, left: 0 } },
              });
            }}
            className="rounded"
          />
          <span>Enable Screen Mask</span>
        </label>

        {element.screenMask?.enabled && (
          <div className="space-y-3 pt-2 pl-4 border-l-2 border-yellow-500/30">
            <p className="text-[10px] text-muted-foreground">
              Clips element to screen coordinates. Only the area inside the mask region will be visible.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <KeyframableProperty
                title="X"
                propertyKey="screenMask_x"
                elementId={element.id}
                elementName={element.name}
                selectedKeyframe={selectedKeyframe}
                currentAnimation={currentAnimation}
                currentValue={element.screenMask.x}
                onChange={(value) => {
                  updateElement(element.id, {
                    screenMask: {
                      ...element.screenMask!,
                      x: value as number,
                    },
                  });
                }}
                compact
              >
                {(displayValue, onChange) => (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">X</label>
                    <Input
                      type="number"
                      value={displayValue as number}
                      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </KeyframableProperty>
              <KeyframableProperty
                title="Y"
                propertyKey="screenMask_y"
                elementId={element.id}
                elementName={element.name}
                selectedKeyframe={selectedKeyframe}
                currentAnimation={currentAnimation}
                currentValue={element.screenMask.y}
                onChange={(value) => {
                  updateElement(element.id, {
                    screenMask: {
                      ...element.screenMask!,
                      y: value as number,
                    },
                  });
                }}
                compact
              >
                {(displayValue, onChange) => (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Y</label>
                    <Input
                      type="number"
                      value={displayValue as number}
                      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </KeyframableProperty>
              <KeyframableProperty
                title="Width"
                propertyKey="screenMask_width"
                elementId={element.id}
                elementName={element.name}
                selectedKeyframe={selectedKeyframe}
                currentAnimation={currentAnimation}
                currentValue={element.screenMask.width}
                onChange={(value) => {
                  updateElement(element.id, {
                    screenMask: {
                      ...element.screenMask!,
                      width: value as number,
                    },
                  });
                }}
                compact
              >
                {(displayValue, onChange) => (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Width</label>
                    <Input
                      type="number"
                      min="1"
                      value={displayValue as number}
                      onChange={(e) => onChange(parseFloat(e.target.value) || 100)}
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </KeyframableProperty>
              <KeyframableProperty
                title="Height"
                propertyKey="screenMask_height"
                elementId={element.id}
                elementName={element.name}
                selectedKeyframe={selectedKeyframe}
                currentAnimation={currentAnimation}
                currentValue={element.screenMask.height}
                onChange={(value) => {
                  updateElement(element.id, {
                    screenMask: {
                      ...element.screenMask!,
                      height: value as number,
                    },
                  });
                }}
                compact
              >
                {(displayValue, onChange) => (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Height</label>
                    <Input
                      type="number"
                      min="1"
                      value={displayValue as number}
                      onChange={(e) => onChange(parseFloat(e.target.value) || 100)}
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </KeyframableProperty>
            </div>

            {/* Feathering - Per Side */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Feather (per side)</label>
              <div className="grid grid-cols-2 gap-2">
                <KeyframableProperty
                  title="Feather Top"
                  propertyKey="screenMask_feather_top"
                  elementId={element.id}
                  elementName={element.name}
                  selectedKeyframe={selectedKeyframe}
                  currentAnimation={currentAnimation}
                  currentValue={element.screenMask.feather?.top ?? 0}
                  onChange={(value) => {
                    updateElement(element.id, {
                      screenMask: {
                        ...element.screenMask!,
                        feather: {
                          ...element.screenMask!.feather ?? { top: 0, right: 0, bottom: 0, left: 0 },
                          top: Math.min(1000, Math.max(0, value as number)),
                        },
                      },
                    });
                  }}
                  compact
                >
                  {(displayValue, onChange) => (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Top</span>
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          value={displayValue as number}
                          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                          className="h-6 w-16 text-[10px]"
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        value={displayValue as number}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500"
                      />
                    </div>
                  )}
                </KeyframableProperty>
                <KeyframableProperty
                  title="Feather Right"
                  propertyKey="screenMask_feather_right"
                  elementId={element.id}
                  elementName={element.name}
                  selectedKeyframe={selectedKeyframe}
                  currentAnimation={currentAnimation}
                  currentValue={element.screenMask.feather?.right ?? 0}
                  onChange={(value) => {
                    updateElement(element.id, {
                      screenMask: {
                        ...element.screenMask!,
                        feather: {
                          ...element.screenMask!.feather ?? { top: 0, right: 0, bottom: 0, left: 0 },
                          right: Math.min(1000, Math.max(0, value as number)),
                        },
                      },
                    });
                  }}
                  compact
                >
                  {(displayValue, onChange) => (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Right</span>
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          value={displayValue as number}
                          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                          className="h-6 w-16 text-[10px]"
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        value={displayValue as number}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500"
                      />
                    </div>
                  )}
                </KeyframableProperty>
                <KeyframableProperty
                  title="Feather Bottom"
                  propertyKey="screenMask_feather_bottom"
                  elementId={element.id}
                  elementName={element.name}
                  selectedKeyframe={selectedKeyframe}
                  currentAnimation={currentAnimation}
                  currentValue={element.screenMask.feather?.bottom ?? 0}
                  onChange={(value) => {
                    updateElement(element.id, {
                      screenMask: {
                        ...element.screenMask!,
                        feather: {
                          ...element.screenMask!.feather ?? { top: 0, right: 0, bottom: 0, left: 0 },
                          bottom: Math.min(1000, Math.max(0, value as number)),
                        },
                      },
                    });
                  }}
                  compact
                >
                  {(displayValue, onChange) => (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Bottom</span>
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          value={displayValue as number}
                          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                          className="h-6 w-16 text-[10px]"
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        value={displayValue as number}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500"
                      />
                    </div>
                  )}
                </KeyframableProperty>
                <KeyframableProperty
                  title="Feather Left"
                  elementName={element.name}
                  propertyKey="screenMask_feather_left"
                  elementId={element.id}
                  selectedKeyframe={selectedKeyframe}
                  currentAnimation={currentAnimation}
                  currentValue={element.screenMask.feather?.left ?? 0}
                  onChange={(value) => {
                    updateElement(element.id, {
                      screenMask: {
                        ...element.screenMask!,
                        feather: {
                          ...element.screenMask!.feather ?? { top: 0, right: 0, bottom: 0, left: 0 },
                          left: Math.min(1000, Math.max(0, value as number)),
                        },
                      },
                    });
                  }}
                  compact
                >
                  {(displayValue, onChange) => (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Left</span>
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          value={displayValue as number}
                          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                          className="h-6 w-16 text-[10px]"
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        value={displayValue as number}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500"
                      />
                    </div>
                  )}
                </KeyframableProperty>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Presets</label>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => {
                    updateElement(element.id, {
                      screenMask: {
                        ...element.screenMask!,
                        x: 0,
                        y: 0,
                        width: 1920,
                        height: 1080,
                      },
                    });
                  }}
                >
                  Full Screen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => {
                    updateElement(element.id, {
                      screenMask: {
                        ...element.screenMask!,
                        x: 0,
                        y: 810,
                        width: 1920,
                        height: 270,
                      },
                    });
                  }}
                >
                  Lower Third
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => {
                    updateElement(element.id, {
                      screenMask: {
                        ...element.screenMask!,
                        x: 960,
                        y: 0,
                        width: 960,
                        height: 1080,
                      },
                    });
                  }}
                >
                  Right Half
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => {
                    updateElement(element.id, {
                      screenMask: {
                        ...element.screenMask!,
                        x: 0,
                        y: 0,
                        width: 960,
                        height: 1080,
                      },
                    });
                  }}
                >
                  Left Half
                </Button>
              </div>
            </div>
          </div>
        )}
      </SearchableSection>

      <Separator />

      {/* Anchor Point */}
      <SearchableSection title="Anchor Point">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground w-8">X</span>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={element.anchor_x}
              onChange={(e) => updateElement(element.id, { anchor_x: parseFloat(e.target.value) || 0.5 })}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground w-8">Y</span>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={element.anchor_y}
              onChange={(e) => updateElement(element.id, { anchor_y: parseFloat(e.target.value) || 0.5 })}
              className="h-7 text-xs"
            />
          </div>
        </div>
        {/* Anchor presets */}
        <div className="grid grid-cols-3 gap-1">
          {[
            { x: 0, y: 0, label: '↖' },
            { x: 0.5, y: 0, label: '↑' },
            { x: 1, y: 0, label: '↗' },
            { x: 0, y: 0.5, label: '←' },
            { x: 0.5, y: 0.5, label: '•' },
            { x: 1, y: 0.5, label: '→' },
            { x: 0, y: 1, label: '↙' },
            { x: 0.5, y: 1, label: '↓' },
            { x: 1, y: 1, label: '↘' },
          ].map((preset) => (
            <Button
              key={`${preset.x}-${preset.y}`}
              variant={element.anchor_x === preset.x && element.anchor_y === preset.y ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => updateElement(element.id, { anchor_x: preset.x, anchor_y: preset.y })}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </SearchableSection>

      <Separator />

      {/* Z-Order / Layering */}
      <SearchableSection title="Layer Order" icon={<Layers className="w-3.5 h-3.5" />}>
        {/* Z-Index input */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16">Z-Index</span>
          <Input
            type="number"
            min="0"
            value={element.z_index ?? 0}
            onChange={(e) => setZIndex(element.id, parseInt(e.target.value) || 0)}
            className="h-7 text-xs flex-1"
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => bringToFront(element.id)}
                >
                  <ChevronsUp className="w-3.5 h-3.5 mr-1" />
                  Front
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bring to Front</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => sendToBack(element.id)}
                >
                  <ChevronsDown className="w-3.5 h-3.5 mr-1" />
                  Back
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send to Back</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => bringForward(element.id)}
                >
                  <ArrowUp className="w-3.5 h-3.5 mr-1" />
                  Forward
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bring Forward (one step)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => sendBackward(element.id)}
                >
                  <ArrowDown className="w-3.5 h-3.5 mr-1" />
                  Backward
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send Backward (one step)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SearchableSection>
    </div>
  );
}


function ContentEditor({ element, selectedKeyframe, currentAnimation }: EditorProps) {
  const { updateElement } = useDesignerStore();
  const [showImageMediaPicker, setShowImageMediaPicker] = useState(false);
  const [showVideoMediaPicker, setShowVideoMediaPicker] = useState(false);
  // These hooks must be at the top level, not inside conditionals (React hooks rules)
  const [showIconPicker, setShowIconPicker] = useState(false);
  // Line editor state - initialized from content
  const lineContent = element.content.type === 'line' ? element.content : null;
  const [linePoints, setLinePoints] = useState<Array<{ x: number; y: number }>>(
    lineContent?.points || [{ x: 0, y: 0 }, { x: 200, y: 0 }]
  );

  // Sync line points when content changes
  useEffect(() => {
    if (lineContent?.points) {
      setLinePoints(lineContent.points);
    }
  }, [lineContent?.points]);

  const updateContent = (updates: Partial<typeof element.content>) => {
    updateElement(element.id, {
      content: { ...element.content, ...updates } as Element['content'],
    });
  };

  if (element.content.type === 'text') {
    const textContent = element.content;
    const animation = textContent.animation || { enabled: false };
    
    return (
      <div className="space-y-4">
        <PropertySection title="Text Content">
          <textarea
            value={textContent.text}
            onChange={(e) => updateContent({ text: e.target.value })}
            className="w-full h-24 p-2 text-sm bg-muted border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Enter text..."
          />
        </PropertySection>

        <PropertySection title="Text Sizing">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={textContent.maxSize || false}
              onChange={(e) => updateContent({ maxSize: e.target.checked })}
              className="rounded"
            />
            <span>Max Size (scale to fit, no wrap)</span>
          </label>
        </PropertySection>

      </div>
    );
  }

  if (element.content.type === 'image') {
    const imageContent = element.content;
    const hasNativeDimensions = imageContent.nativeWidth && imageContent.nativeHeight;

    return (
      <div className="space-y-4">
        <PropertySection title="Content">
          <div className="space-y-3">
            {/* Thumbnail Preview - click to change, X to remove */}
            {imageContent.src ? (
              <div
                className="relative w-16 h-16 rounded-lg border border-input overflow-hidden cursor-pointer group bg-muted/30"
                onClick={() => setShowImageMediaPicker(true)}
              >
                <img
                  src={imageContent.src}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                  }}
                />
                {/* Remove button - top right corner, always visible */}
                <button
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateContent({ src: '' });
                  }}
                  title="Remove image"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => setShowImageMediaPicker(true)}
              >
                <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </PropertySection>

        <MediaPickerDialog
          open={showImageMediaPicker}
          onOpenChange={setShowImageMediaPicker}
          onSelect={(url) => updateContent({ src: url })}
          mediaType="image"
          title="Select Image"
        />

        {/* Aspect Ratio Lock */}
        {hasNativeDimensions && (
          <PropertySection title="Aspect Ratio">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={imageContent.aspectRatioLocked ?? false}
                  onChange={(e) => updateContent({ aspectRatioLocked: e.target.checked })}
                  className="rounded"
                />
                <span>Lock to native ratio ({imageContent.nativeAspectRatio?.toFixed(2)})</span>
              </label>
              <div className="text-[10px] text-muted-foreground">
                Native: {imageContent.nativeWidth} × {imageContent.nativeHeight}px
              </div>
              {imageContent.aspectRatioLocked && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => {
                    // Reset to native dimensions (scaled to fit)
                    const maxSize = 600;
                    const ratio = imageContent.nativeAspectRatio || 1;
                    let newWidth = imageContent.nativeWidth || 400;
                    let newHeight = imageContent.nativeHeight || 300;
                    
                    if (newWidth > maxSize || newHeight > maxSize) {
                      if (ratio >= 1) {
                        newWidth = maxSize;
                        newHeight = maxSize / ratio;
                      } else {
                        newHeight = maxSize;
                        newWidth = maxSize * ratio;
                      }
                    }
                    
                    updateElement(element.id, {
                      width: Math.round(newWidth),
                      height: Math.round(newHeight),
                    });
                  }}
                >
                  Reset to Native Size
                </Button>
              )}
            </div>
          </PropertySection>
        )}

        <PropertySection title="Object Fit">
          <select
            value={imageContent.fit || 'cover'}
            onChange={(e) => updateContent({ fit: e.target.value as 'cover' | 'contain' | 'fill' })}
            className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
            <option value="none">None</option>
            <option value="scale-down">Scale Down</option>
          </select>
        </PropertySection>

        <Separator />

        <PropertySection title="Corner Radius">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={imageContent.cornerRadius || 0}
              onChange={(e) => updateContent({ cornerRadius: parseFloat(e.target.value) || 0 })}
              className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <Input
              type="number"
              value={imageContent.cornerRadius || 0}
              onChange={(e) => updateContent({ cornerRadius: parseFloat(e.target.value) || 0 })}
              min="0"
              max="100"
              className="w-16 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
        </PropertySection>

        <PropertySection title="Border">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={imageContent.border?.enabled || false}
                onChange={(e) => updateContent({
                  border: {
                    enabled: e.target.checked,
                    width: imageContent.border?.width ?? 2,
                    color: imageContent.border?.color ?? '#FFFFFF',
                  },
                })}
                className="rounded"
              />
              <span>Enable Border</span>
            </label>

            {imageContent.border?.enabled && (
              <div className="space-y-2 pl-4 border-l-2 border-violet-500/30">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Border Width</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={imageContent.border?.width || 2}
                      onChange={(e) => updateContent({
                        border: {
                          ...imageContent.border!,
                          width: parseFloat(e.target.value) || 2,
                        },
                      })}
                      className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                    <Input
                      type="number"
                      value={imageContent.border?.width || 2}
                      onChange={(e) => updateContent({
                        border: {
                          ...imageContent.border!,
                          width: parseFloat(e.target.value) || 2,
                        },
                      })}
                      min="1"
                      max="20"
                      className="w-16 h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Border Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={imageContent.border?.color || '#FFFFFF'}
                      onChange={(e) => updateContent({
                        border: {
                          ...imageContent.border!,
                          color: e.target.value,
                        },
                      })}
                      className="h-8 w-16 rounded border border-input cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={imageContent.border?.color || '#FFFFFF'}
                      onChange={(e) => updateContent({
                        border: {
                          ...imageContent.border!,
                          color: e.target.value,
                        },
                      })}
                      placeholder="#FFFFFF"
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </PropertySection>

        <PropertySection title="Blur Effect">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={imageContent.blur?.enabled || false}
                onChange={(e) => updateContent({
                  blur: {
                    enabled: e.target.checked,
                    amount: imageContent.blur?.amount ?? 0,
                  },
                })}
                className="rounded"
              />
              <span>Enable Blur</span>
            </label>

            {imageContent.blur?.enabled && (
              <div className="pl-4 border-l-2 border-violet-500/30">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Blur Amount: {imageContent.blur?.amount || 0}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={imageContent.blur?.amount || 0}
                    onChange={(e) => updateContent({
                      blur: {
                        ...imageContent.blur!,
                        amount: parseFloat(e.target.value) || 0,
                      },
                    })}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </PropertySection>

        <PropertySection title="Opacity">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground mb-1 block">
              Opacity: {Math.round((imageContent.opacity ?? 1) * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={imageContent.opacity ?? 1}
              onChange={(e) => updateContent({ opacity: parseFloat(e.target.value) })}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </PropertySection>

        <PropertySection title="Blend Mode">
          <select
            value={imageContent.blendMode || 'normal'}
            onChange={(e) => updateContent({ blendMode: e.target.value })}
            className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
          >
            <option value="normal">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="darken">Darken</option>
            <option value="lighten">Lighten</option>
            <option value="color-dodge">Color Dodge</option>
            <option value="color-burn">Color Burn</option>
            <option value="hard-light">Hard Light</option>
            <option value="soft-light">Soft Light</option>
            <option value="difference">Difference</option>
            <option value="exclusion">Exclusion</option>
          </select>
        </PropertySection>
      </div>
    );
  }

  if (element.content.type === 'shape') {
    // Shape content is now minimal - all styling moved to Style tab
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Shape styling options are available in the Style tab.
        </p>
      </div>
    );
  }

  if (element.content.type === 'chart') {
    const chartContent = element.content;

    // Determine current category based on chart type
    const getChartCategory = (chartType: string) => {
      if (['bar', 'horizontal-bar', 'line', 'area', 'pie', 'donut', 'gauge'].includes(chartType)) return 'basic';
      if (['candlestick', 'index-chart'].includes(chartType)) return 'finance';
      if (['parliament'].includes(chartType)) return 'election';
      if (['soccer-field', 'basketball-court'].includes(chartType)) return 'sports';
      return 'basic';
    };

    const currentCategory = getChartCategory(chartContent.chartType || 'bar');

    // Chart types by category
    const chartTypesByCategory = {
      basic: [
        { value: 'bar', label: 'Bar Chart' },
        { value: 'horizontal-bar', label: 'Horizontal Bar' },
        { value: 'line', label: 'Line Chart' },
        { value: 'area', label: 'Area Chart' },
        { value: 'pie', label: 'Pie Chart' },
        { value: 'donut', label: 'Donut Chart' },
        { value: 'gauge', label: 'Gauge' },
      ],
      finance: [
        { value: 'candlestick', label: 'Candlestick' },
        { value: 'index-chart', label: 'Index Chart' },
      ],
      election: [
        { value: 'parliament', label: 'Parliament' },
      ],
      sports: [
        { value: 'soccer-field', label: 'Soccer Field' },
        { value: 'basketball-court', label: 'Basketball Court' },
      ],
    };

    const categoryLabels = {
      basic: 'Basic',
      finance: 'Finance',
      election: 'Election',
      sports: 'Sports',
    };

    return (
      <div className="space-y-2">
        <PropertySection title="Chart Category">
          <select
            value={currentCategory}
            onChange={(e) => {
              const newCategory = e.target.value as keyof typeof chartTypesByCategory;
              // Switch to the first chart type of the new category
              const firstChartType = chartTypesByCategory[newCategory][0].value;
              updateContent({ chartType: firstChartType as any });
            }}
            className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
          >
            <option value="basic">Basic</option>
            <option value="finance">Finance</option>
            <option value="election">Election</option>
            <option value="sports">Sports</option>
          </select>
        </PropertySection>

        <PropertySection title="Chart Type">
          <select
            value={chartContent.chartType || 'bar'}
            onChange={(e) => updateContent({ chartType: e.target.value as any })}
            className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
          >
            {chartTypesByCategory[currentCategory as keyof typeof chartTypesByCategory].map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </PropertySection>

        <PropertySection title="Title">
          <Input
            value={chartContent.options?.title || ''}
            onChange={(e) => updateContent({ 
              options: { ...chartContent.options, title: e.target.value } 
            })}
            placeholder="Chart title..."
            className="h-6 text-[10px]"
          />
        </PropertySection>

        <PropertySection title="Options">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px]">
              <input
                type="checkbox"
                checked={chartContent.options?.showLegend ?? true}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, showLegend: e.target.checked }
                })}
                className="rounded border-input"
              />
              Show Legend
            </label>
            {chartContent.options?.showLegend !== false && (
              <div className="pl-4">
                <label className="text-[10px] text-muted-foreground mb-1 block">Legend Position</label>
                <select
                  value={chartContent.options?.legendPosition || 'top'}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, legendPosition: e.target.value as any }
                  })}
                  className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            )}
            <label className="flex items-center gap-1.5 text-[10px]">
              <input
                type="checkbox"
                checked={chartContent.options?.animated ?? true}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, animated: e.target.checked }
                })}
                className="rounded border-input"
              />
              Animated
            </label>
          </div>
        </PropertySection>

        {chartContent.chartType === 'gauge' && (
          <>
            <PropertySection title="Gauge Value">
              <Input
                type="number"
                value={chartContent.options?.gaugeValue ?? chartContent.data?.datasets?.[0]?.data?.[0] ?? 0}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, gaugeValue: parseFloat(e.target.value) || 0 }
                })}
                className="h-6 text-[10px]"
              />
            </PropertySection>
            <PropertySection title="Gauge Max">
              <Input
                type="number"
                value={chartContent.options?.gaugeMax ?? 100}
                onChange={(e) => updateContent({
                  options: { ...chartContent.options, gaugeMax: parseFloat(e.target.value) || 100 }
                })}
                className="h-6 text-[10px]"
              />
            </PropertySection>
          </>
        )}

        {/* Candlestick Chart Properties */}
        {chartContent.chartType === 'candlestick' && (
          <>
            <PropertySection title="Candlestick Colors">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground w-16">Up Color</label>
                  <input
                    type="color"
                    value={chartContent.options?.upColor || '#22C55E'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, upColor: e.target.value }
                    })}
                    className="w-6 h-6 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={chartContent.options?.upColor || '#22C55E'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, upColor: e.target.value }
                    })}
                    className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground w-16">Down Color</label>
                  <input
                    type="color"
                    value={chartContent.options?.downColor || '#EF4444'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, downColor: e.target.value }
                    })}
                    className="w-6 h-6 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={chartContent.options?.downColor || '#EF4444'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, downColor: e.target.value }
                    })}
                    className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground w-16">Wick Color</label>
                  <input
                    type="color"
                    value={chartContent.options?.wickColor || '#9CA3AF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, wickColor: e.target.value }
                    })}
                    className="w-6 h-6 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={chartContent.options?.wickColor || '#9CA3AF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, wickColor: e.target.value }
                    })}
                    className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                  />
                </div>
              </div>
            </PropertySection>
            <PropertySection title="Grid">
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-[10px]">
                  <input
                    type="checkbox"
                    checked={chartContent.options?.showGrid !== false}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, showGrid: e.target.checked }
                    })}
                    className="rounded border-input"
                  />
                  Show Grid Lines
                </label>
                {chartContent.options?.showGrid !== false && (
                  <div className="flex items-center gap-2 pl-4">
                    <label className="text-[10px] text-muted-foreground">Grid Color</label>
                    <input
                      type="color"
                      value={chartContent.options?.gridColor || '#333333'}
                      onChange={(e) => updateContent({
                        options: { ...chartContent.options, gridColor: e.target.value }
                      })}
                      className="w-6 h-6 rounded border border-input cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </PropertySection>
          </>
        )}

        {/* Index Chart Properties */}
        {chartContent.chartType === 'index-chart' && (
          <>
            <PropertySection title="Index Settings">
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Base Value</label>
                  <Input
                    type="number"
                    value={chartContent.options?.indexBaseValue || 100}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, indexBaseValue: parseFloat(e.target.value) || 100 }
                    })}
                    className="h-6 text-[10px]"
                  />
                </div>
                <p className="text-[9px] text-muted-foreground">
                  All series are normalized to this base value at their starting point.
                </p>
              </div>
            </PropertySection>
            <PropertySection title="Series Data">
              <div className="space-y-2">
                <p className="text-[9px] text-muted-foreground">
                  Edit labels and add multiple datasets for comparison.
                </p>
              </div>
            </PropertySection>
          </>
        )}

        {/* Parliament Chart Properties */}
        {chartContent.chartType === 'parliament' && (
          <PropertySection title="Party Data Info">
            <div className="space-y-2">
              <p className="text-[9px] text-muted-foreground">
                Labels = Party names, Values = Number of seats per party.
              </p>
              <p className="text-[9px] text-muted-foreground italic">
                Styling options (seat size, row spacing) are in the Style tab.
              </p>
            </div>
          </PropertySection>
        )}

        {/* Soccer Field Properties */}
        {chartContent.chartType === 'soccer-field' && (
          <>
            <PropertySection title="Field Settings">
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Theme</label>
                  <select
                    value={chartContent.options?.theme || 'dark'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, theme: e.target.value }
                    })}
                    className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                  >
                    <option value="dark">Dark (Broadcast)</option>
                    <option value="light">Light (Natural)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground w-20">Field Color</label>
                  <input
                    type="color"
                    value={chartContent.options?.fieldColor || '#1a472a'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, fieldColor: e.target.value }
                    })}
                    className="w-6 h-6 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={chartContent.options?.fieldColor || '#1a472a'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, fieldColor: e.target.value }
                    })}
                    className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground w-20">Line Color</label>
                  <input
                    type="color"
                    value={chartContent.options?.lineColor || '#FFFFFF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, lineColor: e.target.value }
                    })}
                    className="w-6 h-6 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={chartContent.options?.lineColor || '#FFFFFF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, lineColor: e.target.value }
                    })}
                    className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                  />
                </div>
              </div>
            </PropertySection>
            <PropertySection title="Data Points">
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Point Style</label>
                  <select
                    value={chartContent.options?.pointStyle || 'circle'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, pointStyle: e.target.value }
                    })}
                    className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                  >
                    <option value="circle">Circle</option>
                    <option value="jersey">Jersey (with number)</option>
                    <option value="dot">Dot (small)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground w-20">Point Color</label>
                  <input
                    type="color"
                    value={chartContent.options?.pointColor || '#FFFFFF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, pointColor: e.target.value }
                    })}
                    className="w-6 h-6 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={chartContent.options?.pointColor || '#FFFFFF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, pointColor: e.target.value }
                    })}
                    className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground w-20">Goalie Color</label>
                  <input
                    type="color"
                    value={chartContent.options?.goalieColor || '#FFD700'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, goalieColor: e.target.value }
                    })}
                    className="w-6 h-6 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={chartContent.options?.goalieColor || '#FFD700'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, goalieColor: e.target.value }
                    })}
                    className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Point Size</label>
                  <Input
                    type="number"
                    value={chartContent.options?.pointSize || 12}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, pointSize: parseFloat(e.target.value) || 12 }
                    })}
                    min="4"
                    max="30"
                    className="h-6 text-[10px]"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-[10px]">
                  <input
                    type="checkbox"
                    checked={chartContent.options?.showPointLabels !== false}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, showPointLabels: e.target.checked }
                    })}
                    className="rounded border-input"
                  />
                  Show Labels
                </label>
                <label className="flex items-center gap-1.5 text-[10px]">
                  <input
                    type="checkbox"
                    checked={chartContent.options?.showPointNumbers !== false}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, showPointNumbers: e.target.checked }
                    })}
                    className="rounded border-input"
                  />
                  Show Numbers (Jersey style)
                </label>
              </div>
            </PropertySection>
            <PropertySection title="Test Data">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-6 text-[10px]"
                  onClick={() => {
                    const sampleData = [
                      { x: 15, y: 50, label: 'GK', number: 1, color: '#FFD700' },
                      { x: 30, y: 20, label: 'LB', number: 3 },
                      { x: 30, y: 40, label: 'CB', number: 4 },
                      { x: 30, y: 60, label: 'CB', number: 5 },
                      { x: 30, y: 80, label: 'RB', number: 2 },
                      { x: 50, y: 30, label: 'CM', number: 6 },
                      { x: 50, y: 50, label: 'CM', number: 8 },
                      { x: 50, y: 70, label: 'CM', number: 10 },
                      { x: 70, y: 25, label: 'LW', number: 11 },
                      { x: 75, y: 50, label: 'ST', number: 9 },
                      { x: 70, y: 75, label: 'RW', number: 7 },
                    ];
                    updateContent({
                      data: {
                        ...chartContent.data,
                        datasets: [{
                          ...chartContent.data?.datasets?.[0],
                          data: sampleData,
                        }],
                      }
                    });
                  }}
                >
                  Load Sample Formation (4-3-3)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-6 text-[10px]"
                  onClick={() => {
                    updateContent({
                      data: {
                        ...chartContent.data,
                        datasets: [{
                          ...chartContent.data?.datasets?.[0],
                          data: [],
                        }],
                      }
                    });
                  }}
                >
                  Clear Data Points
                </Button>
              </div>
            </PropertySection>
            <PropertySection title="Edit Data Points">
              <div className="space-y-2">
                {(chartContent.data?.datasets?.[0]?.data as any[] || []).length === 0 ? (
                  <p className="text-[9px] text-muted-foreground">No data points. Use "Load Sample Formation" above or add manually.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(chartContent.data?.datasets?.[0]?.data as any[] || []).map((point: any, idx: number) => (
                      <div key={idx} className="border border-input rounded p-2 space-y-1.5 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium">Point {idx + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                              newData.splice(idx, 1);
                              updateContent({
                                data: {
                                  ...chartContent.data,
                                  datasets: [{
                                    ...chartContent.data?.datasets?.[0],
                                    data: newData,
                                  }],
                                }
                              });
                            }}
                          >
                            ×
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <label className="text-[9px] text-muted-foreground">X (0-100)</label>
                            <Input
                              type="number"
                              value={point.x || 0}
                              onChange={(e) => {
                                const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                newData[idx] = { ...point, x: parseFloat(e.target.value) || 0 };
                                updateContent({
                                  data: {
                                    ...chartContent.data,
                                    datasets: [{
                                      ...chartContent.data?.datasets?.[0],
                                      data: newData,
                                    }],
                                  }
                                });
                              }}
                              min="0"
                              max="100"
                              className="h-5 text-[9px]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground">Y (0-100)</label>
                            <Input
                              type="number"
                              value={point.y || 0}
                              onChange={(e) => {
                                const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                newData[idx] = { ...point, y: parseFloat(e.target.value) || 0 };
                                updateContent({
                                  data: {
                                    ...chartContent.data,
                                    datasets: [{
                                      ...chartContent.data?.datasets?.[0],
                                      data: newData,
                                    }],
                                  }
                                });
                              }}
                              min="0"
                              max="100"
                              className="h-5 text-[9px]"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <label className="text-[9px] text-muted-foreground">Label</label>
                            <Input
                              value={point.label || ''}
                              onChange={(e) => {
                                const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                newData[idx] = { ...point, label: e.target.value };
                                updateContent({
                                  data: {
                                    ...chartContent.data,
                                    datasets: [{
                                      ...chartContent.data?.datasets?.[0],
                                      data: newData,
                                    }],
                                  }
                                });
                              }}
                              placeholder="Label"
                              className="h-5 text-[9px]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground">Number</label>
                            <Input
                              type="number"
                              value={point.number ?? ''}
                              onChange={(e) => {
                                const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                newData[idx] = { ...point, number: e.target.value ? parseInt(e.target.value) : undefined };
                                updateContent({
                                  data: {
                                    ...chartContent.data,
                                    datasets: [{
                                      ...chartContent.data?.datasets?.[0],
                                      data: newData,
                                    }],
                                  }
                                });
                              }}
                              placeholder="#"
                              className="h-5 text-[9px]"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <label className="text-[9px] text-muted-foreground">Color</label>
                            <div className="flex gap-1">
                              <input
                                type="color"
                                value={point.color || '#000000'}
                                onChange={(e) => {
                                  const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                  newData[idx] = { ...point, color: e.target.value };
                                  updateContent({
                                    data: {
                                      ...chartContent.data,
                                      datasets: [{
                                        ...chartContent.data?.datasets?.[0],
                                        data: newData,
                                      }],
                                    }
                                  });
                                }}
                                className="w-5 h-5 rounded border border-input cursor-pointer"
                              />
                              <Input
                                value={point.color || ''}
                                onChange={(e) => {
                                  const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                  newData[idx] = { ...point, color: e.target.value || undefined };
                                  updateContent({
                                    data: {
                                      ...chartContent.data,
                                      datasets: [{
                                        ...chartContent.data?.datasets?.[0],
                                        data: newData,
                                      }],
                                    }
                                  });
                                }}
                                placeholder="Default"
                                className="flex-1 h-5 text-[9px] font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground">Size</label>
                            <Input
                              type="number"
                              value={point.size ?? ''}
                              onChange={(e) => {
                                const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                newData[idx] = { ...point, size: e.target.value ? parseFloat(e.target.value) : undefined };
                                updateContent({
                                  data: {
                                    ...chartContent.data,
                                    datasets: [{
                                      ...chartContent.data?.datasets?.[0],
                                      data: newData,
                                    }],
                                  }
                                });
                              }}
                              placeholder="Default"
                              min="4"
                              max="50"
                              className="h-5 text-[9px]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-6 text-[10px]"
                  onClick={() => {
                    const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                    newData.push({ x: 50, y: 50, label: '', number: undefined, color: undefined, size: undefined });
                    updateContent({
                      data: {
                        ...chartContent.data,
                        datasets: [{
                          ...chartContent.data?.datasets?.[0],
                          data: newData,
                        }],
                      }
                    });
                  }}
                >
                  + Add Point
                </Button>
              </div>
            </PropertySection>
            <PropertySection title="Payload Example">
              <div className="space-y-2">
                <pre className="text-[9px] bg-muted p-2 rounded overflow-auto max-h-32 font-mono">
{`{
  "datasets": [{
    "data": [
      {
        "x": 50,      // 0-100 (left to right)
        "y": 50,      // 0-100 (top to bottom)
        "label": "ST", // optional label
        "number": 9,   // jersey number
        "color": "#FF0000", // optional
        "size": 15     // optional
      }
    ]
  }]
}`}
                </pre>
                <p className="text-[9px] text-muted-foreground">
                  x: 0 = left goal line, 100 = right goal line<br/>
                  y: 0 = top sideline, 100 = bottom sideline
                </p>
              </div>
            </PropertySection>
          </>
        )}

        {/* Basketball Court Properties */}
        {chartContent.chartType === 'basketball-court' && (
          <>
            <PropertySection title="Court Settings">
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Theme</label>
                  <select
                    value={chartContent.options?.theme || 'dark'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, theme: e.target.value }
                    })}
                    className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                  >
                    <option value="dark">Dark (Broadcast)</option>
                    <option value="light">Light (Natural)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground w-20">Court Color</label>
                  <input
                    type="color"
                    value={chartContent.options?.fieldColor || '#2a1810'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, fieldColor: e.target.value }
                    })}
                    className="w-6 h-6 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={chartContent.options?.fieldColor || '#2a1810'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, fieldColor: e.target.value }
                    })}
                    className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground w-20">Line Color</label>
                  <input
                    type="color"
                    value={chartContent.options?.lineColor || '#FFFFFF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, lineColor: e.target.value }
                    })}
                    className="w-6 h-6 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={chartContent.options?.lineColor || '#FFFFFF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, lineColor: e.target.value }
                    })}
                    className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                  />
                </div>
              </div>
            </PropertySection>
            <PropertySection title="Data Points">
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Point Style</label>
                  <select
                    value={chartContent.options?.pointStyle || 'circle'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, pointStyle: e.target.value }
                    })}
                    className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                  >
                    <option value="circle">Circle</option>
                    <option value="jersey">Jersey (with number)</option>
                    <option value="dot">Dot (small)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground w-20">Point Color</label>
                  <input
                    type="color"
                    value={chartContent.options?.pointColor || '#FFFFFF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, pointColor: e.target.value }
                    })}
                    className="w-6 h-6 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={chartContent.options?.pointColor || '#FFFFFF'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, pointColor: e.target.value }
                    })}
                    className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground w-20">Center Color</label>
                  <input
                    type="color"
                    value={chartContent.options?.centerColor || '#FFD700'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, centerColor: e.target.value }
                    })}
                    className="w-6 h-6 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={chartContent.options?.centerColor || '#FFD700'}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, centerColor: e.target.value }
                    })}
                    className="flex-1 h-5 text-[10px] px-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Point Size</label>
                  <Input
                    type="number"
                    value={chartContent.options?.pointSize || 12}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, pointSize: parseFloat(e.target.value) || 12 }
                    })}
                    min="4"
                    max="30"
                    className="h-6 text-[10px]"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-[10px]">
                  <input
                    type="checkbox"
                    checked={chartContent.options?.showPointLabels !== false}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, showPointLabels: e.target.checked }
                    })}
                    className="rounded border-input"
                  />
                  Show Labels
                </label>
                <label className="flex items-center gap-1.5 text-[10px]">
                  <input
                    type="checkbox"
                    checked={chartContent.options?.showPointNumbers !== false}
                    onChange={(e) => updateContent({
                      options: { ...chartContent.options, showPointNumbers: e.target.checked }
                    })}
                    className="rounded border-input"
                  />
                  Show Numbers (Jersey style)
                </label>
              </div>
            </PropertySection>
            <PropertySection title="Test Data">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-6 text-[10px]"
                  onClick={() => {
                    // Standard 5-man starting lineup positions (half court offense)
                    const sampleData = [
                      { x: 15, y: 50, label: 'C', number: 5 }, // Center near basket
                      { x: 30, y: 25, label: 'PF', number: 4 }, // Power Forward
                      { x: 30, y: 75, label: 'SF', number: 3 }, // Small Forward
                      { x: 55, y: 20, label: 'SG', number: 2 }, // Shooting Guard
                      { x: 55, y: 80, label: 'PG', number: 1 }, // Point Guard
                    ];
                    updateContent({
                      data: {
                        ...chartContent.data,
                        datasets: [{
                          ...chartContent.data?.datasets?.[0],
                          data: sampleData,
                        }],
                      }
                    });
                  }}
                >
                  Load Sample Lineup (5-man)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-6 text-[10px]"
                  onClick={() => {
                    // Shot chart sample data
                    const shotData = [
                      { x: 10, y: 50, label: 'Made', color: '#22C55E', size: 8 },
                      { x: 15, y: 35, label: 'Made', color: '#22C55E', size: 8 },
                      { x: 15, y: 65, label: 'Missed', color: '#EF4444', size: 8 },
                      { x: 25, y: 20, label: 'Made', color: '#22C55E', size: 8 },
                      { x: 25, y: 80, label: 'Made', color: '#22C55E', size: 8 },
                      { x: 35, y: 50, label: 'Missed', color: '#EF4444', size: 8 },
                      { x: 50, y: 15, label: '3PT', color: '#3B82F6', size: 8 },
                      { x: 50, y: 85, label: '3PT', color: '#3B82F6', size: 8 },
                      { x: 55, y: 50, label: '3PT', color: '#3B82F6', size: 8 },
                    ];
                    updateContent({
                      data: {
                        ...chartContent.data,
                        datasets: [{
                          ...chartContent.data?.datasets?.[0],
                          data: shotData,
                        }],
                      },
                      options: {
                        ...chartContent.options,
                        pointStyle: 'dot',
                        showPointLabels: true,
                        showPointNumbers: false,
                      }
                    });
                  }}
                >
                  Load Sample Shot Chart
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-6 text-[10px]"
                  onClick={() => {
                    updateContent({
                      data: {
                        ...chartContent.data,
                        datasets: [{
                          ...chartContent.data?.datasets?.[0],
                          data: [],
                        }],
                      }
                    });
                  }}
                >
                  Clear Data Points
                </Button>
              </div>
            </PropertySection>
            <PropertySection title="Edit Data Points">
              <div className="space-y-2">
                {(chartContent.data?.datasets?.[0]?.data as any[] || []).length === 0 ? (
                  <p className="text-[9px] text-muted-foreground">No data points. Use "Load Sample" buttons above or add manually.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(chartContent.data?.datasets?.[0]?.data as any[] || []).map((point: any, idx: number) => (
                      <div key={idx} className="border border-input rounded p-2 space-y-1.5 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium">Point {idx + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                              newData.splice(idx, 1);
                              updateContent({
                                data: {
                                  ...chartContent.data,
                                  datasets: [{
                                    ...chartContent.data?.datasets?.[0],
                                    data: newData,
                                  }],
                                }
                              });
                            }}
                          >
                            ×
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <label className="text-[9px] text-muted-foreground">X (0-100)</label>
                            <Input
                              type="number"
                              value={point.x || 0}
                              onChange={(e) => {
                                const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                newData[idx] = { ...point, x: parseFloat(e.target.value) || 0 };
                                updateContent({
                                  data: {
                                    ...chartContent.data,
                                    datasets: [{
                                      ...chartContent.data?.datasets?.[0],
                                      data: newData,
                                    }],
                                  }
                                });
                              }}
                              min="0"
                              max="100"
                              className="h-5 text-[9px]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground">Y (0-100)</label>
                            <Input
                              type="number"
                              value={point.y || 0}
                              onChange={(e) => {
                                const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                newData[idx] = { ...point, y: parseFloat(e.target.value) || 0 };
                                updateContent({
                                  data: {
                                    ...chartContent.data,
                                    datasets: [{
                                      ...chartContent.data?.datasets?.[0],
                                      data: newData,
                                    }],
                                  }
                                });
                              }}
                              min="0"
                              max="100"
                              className="h-5 text-[9px]"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <label className="text-[9px] text-muted-foreground">Label</label>
                            <Input
                              value={point.label || ''}
                              onChange={(e) => {
                                const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                newData[idx] = { ...point, label: e.target.value };
                                updateContent({
                                  data: {
                                    ...chartContent.data,
                                    datasets: [{
                                      ...chartContent.data?.datasets?.[0],
                                      data: newData,
                                    }],
                                  }
                                });
                              }}
                              placeholder="Label"
                              className="h-5 text-[9px]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground">Number</label>
                            <Input
                              type="number"
                              value={point.number ?? ''}
                              onChange={(e) => {
                                const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                newData[idx] = { ...point, number: e.target.value ? parseInt(e.target.value) : undefined };
                                updateContent({
                                  data: {
                                    ...chartContent.data,
                                    datasets: [{
                                      ...chartContent.data?.datasets?.[0],
                                      data: newData,
                                    }],
                                  }
                                });
                              }}
                              placeholder="#"
                              className="h-5 text-[9px]"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <label className="text-[9px] text-muted-foreground">Color</label>
                            <div className="flex gap-1">
                              <input
                                type="color"
                                value={point.color || '#000000'}
                                onChange={(e) => {
                                  const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                  newData[idx] = { ...point, color: e.target.value };
                                  updateContent({
                                    data: {
                                      ...chartContent.data,
                                      datasets: [{
                                        ...chartContent.data?.datasets?.[0],
                                        data: newData,
                                      }],
                                    }
                                  });
                                }}
                                className="w-5 h-5 rounded border border-input cursor-pointer"
                              />
                              <Input
                                value={point.color || ''}
                                onChange={(e) => {
                                  const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                  newData[idx] = { ...point, color: e.target.value || undefined };
                                  updateContent({
                                    data: {
                                      ...chartContent.data,
                                      datasets: [{
                                        ...chartContent.data?.datasets?.[0],
                                        data: newData,
                                      }],
                                    }
                                  });
                                }}
                                placeholder="Default"
                                className="flex-1 h-5 text-[9px] font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground">Size</label>
                            <Input
                              type="number"
                              value={point.size ?? ''}
                              onChange={(e) => {
                                const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                                newData[idx] = { ...point, size: e.target.value ? parseFloat(e.target.value) : undefined };
                                updateContent({
                                  data: {
                                    ...chartContent.data,
                                    datasets: [{
                                      ...chartContent.data?.datasets?.[0],
                                      data: newData,
                                    }],
                                  }
                                });
                              }}
                              placeholder="Default"
                              min="4"
                              max="50"
                              className="h-5 text-[9px]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-6 text-[10px]"
                  onClick={() => {
                    const newData = [...(chartContent.data?.datasets?.[0]?.data as any[] || [])];
                    newData.push({ x: 50, y: 50, label: '', number: undefined, color: undefined, size: undefined });
                    updateContent({
                      data: {
                        ...chartContent.data,
                        datasets: [{
                          ...chartContent.data?.datasets?.[0],
                          data: newData,
                        }],
                      }
                    });
                  }}
                >
                  + Add Point
                </Button>
              </div>
            </PropertySection>
            <PropertySection title="Payload Example">
              <div className="space-y-2">
                <pre className="text-[9px] bg-muted p-2 rounded overflow-auto max-h-32 font-mono">
{`{
  "datasets": [{
    "data": [
      {
        "x": 50,      // 0-100 (baseline to mid)
        "y": 50,      // 0-100 (sideline to sideline)
        "label": "PG", // position label
        "number": 1,   // jersey number
        "color": "#FF0000", // optional
        "size": 15     // optional
      }
    ]
  }]
}`}
                </pre>
                <p className="text-[9px] text-muted-foreground">
                  x: 0 = baseline (basket), 100 = half-court line<br/>
                  y: 0 = left sideline, 100 = right sideline
                </p>
              </div>
            </PropertySection>
          </>
        )}

        <Separator />

        {/* Data sections - show for basic charts and parliament/index */}
        {['bar', 'horizontal-bar', 'line', 'area', 'pie', 'donut', 'gauge', 'parliament', 'index-chart'].includes(chartContent.chartType || 'bar') && (
          <>
            <PropertySection title="Data (Labels)">
              <Input
                value={chartContent.data?.labels?.join(', ') || ''}
                onChange={(e) => updateContent({
                  data: {
                    ...chartContent.data,
                    labels: e.target.value.split(',').map(s => s.trim())
                  }
                })}
                placeholder="Label 1, Label 2, Label 3..."
                className="h-6 text-[10px]"
              />
            </PropertySection>

            <PropertySection title="Data (Values)">
              <Input
                value={chartContent.data?.datasets?.[0]?.data?.join(', ') || ''}
                onChange={(e) => {
                  const values = e.target.value.split(',').map(s => parseFloat(s.trim()) || 0).filter(v => !isNaN(v));
                  updateContent({
                    data: {
                      ...chartContent.data,
                      datasets: [{
                        ...chartContent.data?.datasets?.[0],
                        data: values,
                      }],
                    }
                  });
                }}
                placeholder="10, 20, 30..."
                className="h-6 text-[10px]"
              />
            </PropertySection>
          </>
        )}

        {chartContent.options?.animated !== false && ['bar', 'horizontal-bar', 'line', 'area', 'pie', 'donut', 'gauge'].includes(chartContent.chartType || 'bar') && (
          <PropertySection title="Chart.js Animation">
            <div className="space-y-1.5">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Animation Duration (ms)</label>
                <Input
                  type="number"
                  value={chartContent.options?.animationDuration || 1000}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, animationDuration: parseFloat(e.target.value) || 1000 }
                  })}
                  min="0"
                  max="5000"
                  className="h-6 text-[10px]"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Animation Easing</label>
                <select
                  value={chartContent.options?.animationEasing || 'easeOutQuart'}
                  onChange={(e) => updateContent({
                    options: { ...chartContent.options, animationEasing: e.target.value }
                  })}
                  className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                >
                  <option value="linear">Linear</option>
                  <option value="easeIn">Ease In</option>
                  <option value="easeOut">Ease Out</option>
                  <option value="easeInOut">Ease In Out</option>
                  <option value="easeOutQuart">Ease Out Quart</option>
                </select>
              </div>
            </div>
          </PropertySection>
        )}

        <Separator />

        {/* Timeline Keyframe Animation Properties */}
        <PropertySection title="Timeline Animation">
          <div className="space-y-2">
            <p className="text-[9px] text-muted-foreground">
              Use these properties with keyframes to animate chart values over time.
            </p>

            {/* Chart Progress - animates reveal of all data */}
            <KeyframableProperty
              title="Chart Progress"
              propertyKey="chartProgress"
              elementId={element.id}
              elementName={element.name}
              selectedKeyframe={selectedKeyframe}
              currentAnimation={currentAnimation}
              currentValue={chartContent.options?.chartProgress ?? 1}
              onChange={(value) => updateContent({
                options: { ...chartContent.options, chartProgress: value as number }
              })}
            >
              {(displayValue, onChange) => (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={typeof displayValue === 'number' ? displayValue : 1}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-muted-foreground w-10 text-right">
                    {Math.round((typeof displayValue === 'number' ? displayValue : 1) * 100)}%
                  </span>
                </div>
              )}
            </KeyframableProperty>

            {/* Gauge-specific: animate the gauge value */}
            {chartContent.chartType === 'gauge' && (
              <KeyframableProperty
                title="Gauge Value"
                propertyKey="gaugeValue"
                elementId={element.id}
                elementName={element.name}
                selectedKeyframe={selectedKeyframe}
                currentAnimation={currentAnimation}
                currentValue={chartContent.options?.gaugeValue ?? chartContent.data?.datasets?.[0]?.data?.[0] ?? 0}
                onChange={(value) => updateContent({
                  options: { ...chartContent.options, gaugeValue: value as number }
                })}
              >
                {(displayValue, onChange) => (
                  <Input
                    type="number"
                    value={typeof displayValue === 'number' ? displayValue : 0}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    className="h-5 text-[10px] px-1.5"
                  />
                )}
              </KeyframableProperty>
            )}

            {/* Individual data point animation (for bar, line, area, pie, donut) */}
            {['bar', 'horizontal-bar', 'line', 'area', 'pie', 'donut'].includes(chartContent.chartType || 'bar') && (
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground block">Data Values</label>
                <div className="grid grid-cols-2 gap-1">
                  {(chartContent.data?.datasets?.[0]?.data as number[] || []).slice(0, 8).map((value, index) => (
                    <KeyframableProperty
                      key={index}
                      title={chartContent.data?.labels?.[index] || `Value ${index + 1}`}
                      propertyKey={`chartData_${index}`}
                      elementId={element.id}
                      elementName={element.name}
                      selectedKeyframe={selectedKeyframe}
                      currentAnimation={currentAnimation}
                      currentValue={typeof value === 'number' ? value : 0}
                      onChange={(newValue) => {
                        const newData = [...(chartContent.data?.datasets?.[0]?.data as number[] || [])];
                        newData[index] = newValue as number;
                        updateContent({
                          data: {
                            ...chartContent.data,
                            datasets: [{
                              ...chartContent.data?.datasets?.[0],
                              data: newData,
                            }],
                          }
                        });
                      }}
                      compact
                    >
                      {(displayValue, onChange) => (
                        <Input
                          type="number"
                          value={typeof displayValue === 'number' ? displayValue : 0}
                          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                          className="h-5 text-[10px] px-1.5"
                          title={chartContent.data?.labels?.[index] || `Value ${index + 1}`}
                        />
                      )}
                    </KeyframableProperty>
                  ))}
                </div>
                {(chartContent.data?.datasets?.[0]?.data?.length || 0) > 8 && (
                  <p className="text-[9px] text-muted-foreground italic">
                    Showing first 8 values. Edit raw data above for more.
                  </p>
                )}
              </div>
            )}
          </div>
        </PropertySection>
      </div>
    );
  }

  // Chart styling is now in ChartStyleEditor (Style tab)
  // Content tab only has: Chart Type, Title, Options, Data, Gauge values, Timeline animation

  if (element.content.type === 'map') {
    return (
      <MapContentEditor 
        element={element} 
        updateContent={updateContent}
        selectedKeyframe={selectedKeyframe}
        currentAnimation={currentAnimation}
      />
    );
  }

  if (element.content.type === 'video') {
    const videoContent = element.content;
    // Extended video content type for additional properties
    const videoContentExtended = videoContent as typeof videoContent & { controls?: boolean; fit?: string };

    // Check if it's a direct video URL (not YouTube/Vimeo embed)
    const isDirectVideo = videoContent.src && (
      videoContent.src.includes('.mp4') ||
      videoContent.src.includes('.webm') ||
      videoContent.src.includes('.mov') ||
      videoContent.src.includes('supabase')
    );

    return (
      <div className="space-y-4">
        <PropertySection title="Content">
          <div className="space-y-3">
            {/* Video Preview - click to change, X to remove */}
            {videoContent.src ? (
              <div
                className="relative w-16 h-16 rounded-lg border border-input overflow-hidden cursor-pointer group bg-black"
                onClick={() => setShowVideoMediaPicker(true)}
              >
                {isDirectVideo ? (
                  <video
                    src={videoContent.src}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/50">
                    <Play className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                {/* Remove button - top right corner, always visible */}
                <button
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateContent({ src: '' });
                  }}
                  title="Remove video"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => setShowVideoMediaPicker(true)}
              >
                <Play className="w-5 h-5 text-muted-foreground/50" />
              </div>
            )}
            {/* URL Input for YouTube/Vimeo */}
            <div>
              <Input
                value={videoContent.src || ''}
                onChange={(e) => updateContent({ src: e.target.value })}
                placeholder="YouTube, Vimeo, or direct video URL..."
                className="h-7 text-[10px] text-muted-foreground font-mono"
              />
            </div>
          </div>
        </PropertySection>

        <PropertySection title="Playback">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={videoContent.autoplay ?? true}
                onChange={(e) => updateContent({ autoplay: e.target.checked })}
                className="rounded"
              />
              Autoplay
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={videoContent.loop ?? true}
                onChange={(e) => updateContent({ loop: e.target.checked })}
                className="rounded"
              />
              Loop
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={videoContent.muted ?? true}
                onChange={(e) => updateContent({ muted: e.target.checked })}
                className="rounded"
              />
              Muted
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={videoContentExtended.controls ?? false}
                onChange={(e) => updateContent({ controls: e.target.checked } as Partial<typeof videoContent>)}
                className="rounded"
              />
              Show Controls
            </label>
          </div>
        </PropertySection>

        <PropertySection title="Object Fit">
          <select
            value={videoContentExtended.fit || 'cover'}
            onChange={(e) => updateContent({ fit: e.target.value } as Partial<typeof videoContent>)}
            className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
          >
            <option value="cover">Cover (fill & crop)</option>
            <option value="contain">Contain (fit inside)</option>
            <option value="fill">Fill (stretch)</option>
          </select>
        </PropertySection>

        <Separator className="my-2" />

        <PropertySection title="Quick Videos">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                updateContent({ src: e.target.value });
              }
            }}
            className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
          >
            <option value="">Select sample video...</option>
            <option value="https://www.youtube.com/watch?v=bImk2wEVVCc">Sports Background Loop</option>
            <option value="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Sample Video 1</option>
            <option value="https://www.youtube.com/watch?v=jNQXAC9IVRw">Sample Video 2</option>
          </select>
        </PropertySection>

        <MediaPickerDialog
          open={showVideoMediaPicker}
          onOpenChange={setShowVideoMediaPicker}
          onSelect={(url) => updateContent({ src: url })}
          mediaType="video"
          title="Select Video"
        />
      </div>
    );
  }

  // Ticker content editor
  if (element.content.type === 'svg') {
    const svgContent = element.content;
    return (
      <div className="space-y-4">
        <PropertySection title="SVG Source">
          <div className="space-y-2">
            <Input
              value={svgContent.src || ''}
              onChange={(e) => updateContent({ src: e.target.value })}
              placeholder="SVG URL (optional)"
              className="h-8 text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Or upload SVG file using the toolbar tool
            </p>
          </div>
        </PropertySection>

        <PropertySection title="SVG Content">
          <textarea
            value={svgContent.svgContent || ''}
            onChange={(e) => updateContent({ svgContent: e.target.value })}
            placeholder="Paste SVG code here..."
            className="w-full h-32 p-2 text-xs bg-muted border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
          />
        </PropertySection>

        <PropertySection title="Preserve Aspect Ratio">
          <select
            value={svgContent.preserveAspectRatio || 'xMidYMid meet'}
            onChange={(e) => updateContent({ preserveAspectRatio: e.target.value })}
            className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
          >
            <option value="none">None (Stretch)</option>
            <option value="xMinYMin meet">xMinYMin meet</option>
            <option value="xMidYMin meet">xMidYMin meet</option>
            <option value="xMaxYMin meet">xMaxYMin meet</option>
            <option value="xMinYMid meet">xMinYMid meet</option>
            <option value="xMidYMid meet">xMidYMid meet (Default)</option>
            <option value="xMaxYMid meet">xMaxYMid meet</option>
            <option value="xMinYMax meet">xMinYMax meet</option>
            <option value="xMidYMax meet">xMidYMax meet</option>
            <option value="xMaxYMax meet">xMaxYMax meet</option>
            <option value="xMinYMin slice">xMinYMin slice</option>
            <option value="xMidYMin slice">xMidYMin slice</option>
            <option value="xMaxYMin slice">xMaxYMin slice</option>
            <option value="xMinYMid slice">xMinYMid slice</option>
            <option value="xMidYMid slice">xMidYMid slice</option>
            <option value="xMaxYMid slice">xMaxYMid slice</option>
            <option value="xMinYMax slice">xMinYMax slice</option>
            <option value="xMidYMax slice">xMidYMax slice</option>
            <option value="xMaxYMax slice">xMaxYMax slice</option>
          </select>
        </PropertySection>
      </div>
    );
  }

  if (element.content.type === 'ticker') {
    return (
      <TickerContentEditor
        element={element}
        updateContent={updateContent}
      />
    );
  }

  // Line content editor
  if (element.content.type === 'line') {
    const lineContentLocal = element.content;
    // Use linePoints and setLinePoints from top-level hooks (moved there for React hooks rules)
    const points = linePoints;
    const setPoints = setLinePoints;

    const updatePoints = (newPoints: Array<{ x: number; y: number }>) => {
      setPoints(newPoints);
      updateContent({ points: newPoints });
      
      // Update element width/height based on bounding box
      if (newPoints.length >= 2) {
        const minX = Math.min(...newPoints.map(p => p.x));
        const minY = Math.min(...newPoints.map(p => p.y));
        const maxX = Math.max(...newPoints.map(p => p.x));
        const maxY = Math.max(...newPoints.map(p => p.y));
        
        updateElement(element.id, {
          width: Math.max(maxX - minX, 1),
          height: Math.max(maxY - minY, 1),
        });
      }
    };

    const addPoint = () => {
      const lastPoint = points[points.length - 1];
      const newPoint = { x: lastPoint.x + 50, y: lastPoint.y };
      updatePoints([...points, newPoint]);
    };

    const removePoint = (index: number) => {
      if (points.length > 2) {
        updatePoints(points.filter((_, i) => i !== index));
      }
    };

    return (
      <div className="space-y-4">
        <PropertySection title="Multi-Point Line">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {points.length} point{points.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={addPoint}
              >
                Add Point
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {points.map((point, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded border">
                  <span className="text-xs w-12">Point {index + 1}</span>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">X</label>
                      <Input
                        type="number"
                        value={point.x}
                        onChange={(e) => {
                          const newPoints = [...points];
                          newPoints[index] = { ...point, x: parseFloat(e.target.value) || 0 };
                          updatePoints(newPoints);
                        }}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Y</label>
                      <Input
                        type="number"
                        value={point.y}
                        onChange={(e) => {
                          const newPoints = [...points];
                          newPoints[index] = { ...point, y: parseFloat(e.target.value) || 0 };
                          updatePoints(newPoints);
                        }}
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                  {points.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removePoint(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </PropertySection>
      </div>
    );
  }

  // Icon content editor
  if (element.content.type === 'icon') {
    const iconContent = element.content;
    // showIconPicker state is now at top-level (React hooks rules)

    return (
      <div className="space-y-4">
        <PropertySection title="Icon Library">
          <select
            value={iconContent.library || 'lucide'}
            onChange={(e) => updateContent({ library: e.target.value as 'lucide' | 'fontawesome' | 'lottie' | 'weather' })}
            className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
          >
            <option value="lucide">Lucide Icons</option>
            <option value="fontawesome">FontAwesome</option>
            <option value="lottie">Lottie Animations</option>
            <option value="weather">Weather Icons (Meteocons)</option>
          </select>
        </PropertySection>

        <PropertySection title="Icon">
          <div className="flex items-center gap-2">
            {/* Icon Preview */}
            <div
              className="w-10 h-10 flex items-center justify-center bg-muted rounded border border-input"
              style={{ color: iconContent.color || '#FFFFFF' }}
            >
              <IconPreview
                library={iconContent.library}
                iconName={iconContent.iconName}
                weight={iconContent.weight}
                color={iconContent.color || '#FFFFFF'}
                size={24}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-10 text-xs"
              onClick={() => setShowIconPicker(true)}
            >
              {iconContent.iconName || 'Select Icon'}
            </Button>
          </div>
        </PropertySection>

        {iconContent.library === 'fontawesome' && (
          <PropertySection title="Weight">
            <select
              value={iconContent.weight || 'solid'}
              onChange={(e) => updateContent({ weight: e.target.value as 'solid' | 'regular' | 'brands' })}
              className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
            >
              <option value="solid">Solid</option>
              <option value="regular">Regular</option>
              <option value="brands">Brands</option>
            </select>
          </PropertySection>
        )}

        <IconPickerDialog
          open={showIconPicker}
          onOpenChange={setShowIconPicker}
          onSelect={(library, iconName, weight, lottieUrl, lottieJson) => {
            updateContent({
              library,
              iconName,
              weight: weight || 'solid',
              lottieUrl,
              lottieJson,
              lottieLoop: true,
              lottieAutoplay: true,
            });
          }}
          currentLibrary={iconContent.library}
          currentIconName={iconContent.iconName}
          currentWeight={iconContent.weight}
          currentLottieUrl={iconContent.lottieUrl}
        />
      </div>
    );
  }

  // Table content editor
  if (element.content.type === 'table') {
    const tableContent = element.content;
    return (
      <TableEditor
        columns={tableContent.columns || []}
        data={tableContent.data || []}
        showHeader={tableContent.showHeader ?? true}
        striped={tableContent.striped ?? false}
        bordered={tableContent.bordered ?? false}
        compact={tableContent.compact ?? false}
        headerBackgroundColor={tableContent.headerBackgroundColor}
        headerTextColor={tableContent.headerTextColor}
        rowBackgroundColor={tableContent.rowBackgroundColor}
        rowTextColor={tableContent.rowTextColor}
        stripedRowBackgroundColor={tableContent.stripedRowBackgroundColor}
        borderColor={tableContent.borderColor}
        showRowBorders={tableContent.showRowBorders}
        showColumnBorders={tableContent.showColumnBorders}
        showOuterBorder={tableContent.showOuterBorder}
        solidBackgroundColor={tableContent.solidBackgroundColor}
        onColumnsChange={(columns) => updateContent({ columns })}
        onDataChange={(data) => updateContent({ data })}
        onOptionsChange={(options) => updateContent(options)}
      />
    );
  }

  // Topic Badge content editor
  if (element.content.type === 'topic-badge') {
    const badgeContent = element.content;
    const elements = useDesignerStore.getState().elements;
    const tickerElements = elements.filter(e => e.content.type === 'ticker');
    const customStyle = badgeContent.customStyle || {};
    const hasGradient = customStyle.gradient?.enabled ?? false;
    const hasGlass = customStyle.glass?.enabled ?? false;

    return (
      <div className="space-y-4">
        {/* Preview */}
        <PropertySection title="Preview">
          <div className="flex justify-center p-2 bg-neutral-100 dark:bg-neutral-900 rounded">
            <TopicBadgePreview
              topic={badgeContent.defaultTopic as TickerTopic || 'news'}
              showIcon={badgeContent.showIcon ?? true}
              customStyle={customStyle}
            />
          </div>
        </PropertySection>

        {/* Link to Ticker */}
        <PropertySection title="Link to Ticker">
          <select
            value={badgeContent.linkedTickerId || ''}
            onChange={(e) => updateContent({ linkedTickerId: e.target.value || undefined })}
            className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
          >
            <option value="">No linked ticker (static)</option>
            {tickerElements.map((ticker) => (
              <option key={ticker.id} value={ticker.id}>
                {ticker.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground mt-1">
            Link to a ticker to auto-update topic based on current item
          </p>
        </PropertySection>

        {/* Default Topic */}
        <PropertySection title="Default Topic">
          <select
            value={badgeContent.defaultTopic || 'news'}
            onChange={(e) => updateContent({ defaultTopic: e.target.value as TickerTopicType })}
            className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
          >
            {Object.entries(TOPIC_BADGE_STYLES).map(([key, style]) => (
              <option key={key} value={key}>
                {style.icon} {style.label}
              </option>
            ))}
          </select>
        </PropertySection>

        {/* Custom Label */}
        <PropertySection title="Custom Label (Optional)">
          <Input
            value={badgeContent.customLabel || ''}
            onChange={(e) => updateContent({ customLabel: e.target.value || undefined })}
            placeholder="Override default label..."
            className="h-8 text-xs"
          />
        </PropertySection>

        <Separator />

        {/* Text Styling */}
        <PropertySection title="Text">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Font Size</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={customStyle.fontSize || 14}
                  onChange={(e) => updateContent({ 
                    customStyle: { 
                      ...customStyle, 
                      fontSize: parseFloat(e.target.value) || 14 
                    } 
                  })}
                  min="8"
                  max="72"
                  className="h-6 text-[10px]"
                />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Font Family</label>
              <FontFamilyPicker
                value={customStyle.fontFamily || 'Inter'}
                onChange={(fontFamily) => updateContent({ 
                  customStyle: { 
                    ...customStyle, 
                    fontFamily 
                  } 
                })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customStyle.textColor || '#FFFFFF'}
                  onChange={(e) => updateContent({ 
                    customStyle: { 
                      ...customStyle, 
                      textColor: e.target.value 
                    } 
                  })}
                  className="h-8 w-16 rounded border border-input cursor-pointer"
                />
                <Input
                  type="text"
                  value={customStyle.textColor || '#FFFFFF'}
                  onChange={(e) => updateContent({ 
                    customStyle: { 
                      ...customStyle, 
                      textColor: e.target.value 
                    } 
                  })}
                  placeholder="#FFFFFF"
                  className="flex-1 h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </PropertySection>

        <Separator />

        {/* Background - Same as Rectangle */}
        <PropertySection title="Background">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={hasGlass}
                onChange={(e) => updateContent({
                  customStyle: {
                    ...customStyle,
                    glass: {
                      enabled: e.target.checked,
                      blur: customStyle.glass?.blur ?? 16,
                      opacity: customStyle.glass?.opacity ?? 0.6,
                      borderWidth: customStyle.glass?.borderWidth ?? 1,
                      borderColor: customStyle.glass?.borderColor ?? 'rgba(255, 255, 255, 0.1)',
                      saturation: customStyle.glass?.saturation ?? 180,
                    },
                  },
                })}
                className="rounded"
              />
              <span>Frosted Glass</span>
            </label>

            {hasGlass && (
              <div className="space-y-3 pt-2 pl-4 border-l-2 border-violet-500/30">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Blur Amount: {customStyle.glass?.blur ?? 16}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={customStyle.glass?.blur ?? 16}
                    onChange={(e) => updateContent({
                      customStyle: {
                        ...customStyle,
                        glass: {
                          ...customStyle.glass!,
                          blur: parseFloat(e.target.value),
                        },
                      },
                    })}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Background Opacity: {Math.round((customStyle.glass?.opacity ?? 0.6) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={customStyle.glass?.opacity ?? 0.6}
                    onChange={(e) => updateContent({
                      customStyle: {
                        ...customStyle,
                        glass: {
                          ...customStyle.glass!,
                          opacity: parseFloat(e.target.value),
                        },
                      },
                    })}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Border Width</label>
                  <Input
                    type="number"
                    value={customStyle.glass?.borderWidth ?? 1}
                    onChange={(e) => updateContent({
                      customStyle: {
                        ...customStyle,
                        glass: {
                          ...customStyle.glass!,
                          borderWidth: parseFloat(e.target.value) || 0,
                        },
                      },
                    })}
                    min="0"
                    max="10"
                    className="h-6 text-[10px]"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Border Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customStyle.glass?.borderColor?.replace(/rgba?\(([^)]+)\)/, (match, values) => {
                        const nums = values.split(',').map((v: string) => parseFloat(v.trim()));
                        if (nums.length >= 3) {
                          const r = Math.round(nums[0]);
                          const g = Math.round(nums[1]);
                          const b = Math.round(nums[2]);
                          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                        }
                        return '#ffffff';
                      }) || '#ffffff'}
                      onChange={(e) => {
                        const hex = e.target.value;
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        updateContent({
                          customStyle: {
                            ...customStyle,
                            glass: {
                              ...customStyle.glass!,
                              borderColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
                            },
                          },
                        });
                      }}
                      className="h-8 w-16 rounded border border-input cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customStyle.glass?.borderColor ?? 'rgba(255, 255, 255, 0.1)'}
                      onChange={(e) => updateContent({
                        customStyle: {
                          ...customStyle,
                          glass: {
                            ...customStyle.glass!,
                            borderColor: e.target.value,
                          },
                        },
                      })}
                      placeholder="rgba(255, 255, 255, 0.1)"
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Saturation: {customStyle.glass?.saturation ?? 180}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="10"
                    value={customStyle.glass?.saturation ?? 180}
                    onChange={(e) => updateContent({
                      customStyle: {
                        ...customStyle,
                        glass: {
                          ...customStyle.glass!,
                          saturation: parseFloat(e.target.value),
                        },
                      },
                    })}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {!hasGlass && (
              <>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasGradient}
                    onChange={(e) => updateContent({
                      customStyle: {
                        ...customStyle,
                        gradient: {
                          enabled: e.target.checked,
                          type: customStyle.gradient?.type || 'linear',
                          direction: customStyle.gradient?.direction || 0,
                          colors: customStyle.gradient?.colors || [
                            { color: '#3B82F6', stop: 0 },
                            { color: '#1D4ED8', stop: 100 },
                          ],
                        },
                      },
                    })}
                    className="rounded"
                  />
                  <span>Gradient</span>
                </label>

                {hasGradient ? (
                  <div className="space-y-3 pt-2 pl-4 border-l-2 border-violet-500/30">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Gradient Type</label>
                      <select
                        value={customStyle.gradient?.type || 'linear'}
                        onChange={(e) => updateContent({
                          customStyle: {
                            ...customStyle,
                            gradient: {
                              ...customStyle.gradient!,
                              type: e.target.value as 'linear' | 'radial' | 'conic',
                            },
                          },
                        })}
                        className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                      >
                        <option value="linear">Linear</option>
                        <option value="radial">Radial</option>
                        <option value="conic">Conic</option>
                      </select>
                    </div>

                    {customStyle.gradient?.type === 'linear' && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Direction (degrees)</label>
                        <Input
                          type="number"
                          value={customStyle.gradient?.direction || 0}
                          onChange={(e) => updateContent({
                            customStyle: {
                              ...customStyle,
                              gradient: {
                                ...customStyle.gradient!,
                                direction: parseFloat(e.target.value) || 0,
                              },
                            },
                          })}
                          min="0"
                          max="360"
                          className="h-6 text-[10px]"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Color Stops</label>
                      {(customStyle.gradient?.colors || []).map((colorStop, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                          <input
                            type="color"
                            value={colorStop.color}
                            onChange={(e) => {
                              const newColors = [...(customStyle.gradient?.colors || [])];
                              newColors[index] = { ...newColors[index], color: e.target.value };
                              updateContent({
                                customStyle: {
                                  ...customStyle,
                                  gradient: {
                                    ...customStyle.gradient!,
                                    colors: newColors,
                                  },
                                },
                              });
                            }}
                            className="h-8 w-16 cursor-pointer rounded border border-input"
                          />
                          <Input
                            type="number"
                            value={colorStop.stop}
                            onChange={(e) => {
                              const newColors = [...(customStyle.gradient?.colors || [])];
                              newColors[index] = { ...newColors[index], stop: parseFloat(e.target.value) || 0 };
                              updateContent({
                                customStyle: {
                                  ...customStyle,
                                  gradient: {
                                    ...customStyle.gradient!,
                                    colors: newColors,
                                  },
                                },
                              });
                            }}
                            min="0"
                            max="100"
                            className="h-8 w-16 text-xs"
                            placeholder="%"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          {(customStyle.gradient?.colors || []).length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                const newColors = (customStyle.gradient?.colors || []).filter((_, i) => i !== index);
                                updateContent({
                                  customStyle: {
                                    ...customStyle,
                                    gradient: {
                                      ...customStyle.gradient!,
                                      colors: newColors,
                                    },
                                  },
                                });
                              }}
                            >
                              <span className="text-xs">×</span>
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => {
                          const currentColors = customStyle.gradient?.colors || [];
                          const lastStop = currentColors[currentColors.length - 1]?.stop || 0;
                          const newColor = lastStop < 100 
                            ? { color: '#000000', stop: Math.min(lastStop + 20, 100) }
                            : { color: '#000000', stop: 100 };
                          updateContent({
                            customStyle: {
                              ...customStyle,
                              gradient: {
                                ...customStyle.gradient!,
                                colors: [...currentColors, newColor],
                              },
                            },
                          });
                        }}
                      >
                        + Add Color Stop
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Solid Fill</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customStyle.fill || customStyle.backgroundColor || '#3B82F6'}
                        onChange={(e) => updateContent({ 
                          customStyle: { 
                            ...customStyle, 
                            fill: e.target.value 
                          } 
                        })}
                        className="h-8 w-full cursor-pointer rounded border border-input"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </PropertySection>

        <Separator />

        {/* Options */}
        <PropertySection title="Options">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={badgeContent.showIcon ?? true}
                onChange={(e) => updateContent({ showIcon: e.target.checked })}
                className="rounded"
              />
              Show icon
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={badgeContent.animated ?? true}
                onChange={(e) => updateContent({ animated: e.target.checked })}
                className="rounded"
              />
              Enable animations (pulse, flash)
            </label>
          </div>
        </PropertySection>

        {/* Topic Reference */}
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground mb-2">Available Topics:</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(TOPIC_BADGE_STYLES).slice(0, 8).map(([key, style]) => (
              <button
                key={key}
                onClick={() => updateContent({ defaultTopic: key as TickerTopicType })}
                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-transform hover:scale-105"
                style={{
                  backgroundColor: style.backgroundColor,
                  color: style.textColor,
                }}
              >
                {style.icon} {style.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Countdown content editor
  if (element.content.type === 'countdown') {
    const countdownContent = element.content;

    return (
      <div className="space-y-4">
        {/* Mode Selection */}
        <PropertySection title="Mode">
          <select
            value={countdownContent.mode || 'duration'}
            onChange={(e) => updateContent({ mode: e.target.value as 'duration' | 'datetime' | 'clock' })}
            className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
          >
            <option value="duration">Countdown (Duration)</option>
            <option value="datetime">Countdown (Date/Time)</option>
            <option value="clock">Clock</option>
          </select>
          <p className="text-[10px] text-muted-foreground mt-1">
            {countdownContent.mode === 'duration' && 'Count down from a specific duration'}
            {countdownContent.mode === 'datetime' && 'Count down to a specific date and time'}
            {countdownContent.mode === 'clock' && 'Display current time'}
          </p>
        </PropertySection>

        <Separator />

        {/* Duration Mode Settings */}
        {countdownContent.mode === 'duration' && (
          <PropertySection title="Duration (seconds)">
            <Input
              type="number"
              value={countdownContent.durationSeconds || 60}
              onChange={(e) => updateContent({ durationSeconds: parseInt(e.target.value) || 60 })}
              min={1}
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Enter the countdown duration in seconds
            </p>
          </PropertySection>
        )}

        {/* Datetime Mode Settings */}
        {countdownContent.mode === 'datetime' && (
          <PropertySection title="Target Date/Time">
            <Input
              type="datetime-local"
              value={countdownContent.targetDatetime ?
                new Date(countdownContent.targetDatetime).toISOString().slice(0, 16) :
                ''}
              onChange={(e) => updateContent({
                targetDatetime: e.target.value ? new Date(e.target.value).toISOString() : null
              })}
              className="h-8 text-xs"
            />
          </PropertySection>
        )}

        {/* Clock Mode Settings */}
        {countdownContent.mode === 'clock' && (
          <>
            <PropertySection title="Format">
              <select
                value={countdownContent.clockFormat || '24h'}
                onChange={(e) => updateContent({ clockFormat: e.target.value as '12h' | '24h' })}
                className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
              >
                <option value="24h">24-hour</option>
                <option value="12h">12-hour (AM/PM)</option>
              </select>
            </PropertySection>

            <PropertySection title="Timezone">
              <Input
                value={countdownContent.timezone || 'local'}
                onChange={(e) => updateContent({ timezone: e.target.value })}
                placeholder="local or IANA timezone"
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Use 'local' or IANA timezone (e.g., America/New_York)
              </p>
            </PropertySection>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={countdownContent.showDate ?? false}
                onChange={(e) => updateContent({ showDate: e.target.checked })}
                className="rounded"
              />
              Show date
            </label>
          </>
        )}

        <Separator />

        {/* Display Options */}
        <PropertySection title="Display">
          <div className="space-y-2">
            {countdownContent.mode !== 'clock' && (
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={countdownContent.showDays ?? true}
                  onChange={(e) => updateContent({ showDays: e.target.checked })}
                  className="rounded"
                />
                Show days
              </label>
            )}
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={countdownContent.showHours ?? true}
                onChange={(e) => updateContent({ showHours: e.target.checked })}
                className="rounded"
              />
              Show hours
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={countdownContent.showMinutes ?? true}
                onChange={(e) => updateContent({ showMinutes: e.target.checked })}
                className="rounded"
              />
              Show minutes
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={countdownContent.showSeconds ?? true}
                onChange={(e) => updateContent({ showSeconds: e.target.checked })}
                className="rounded"
              />
              Show seconds
            </label>
            {countdownContent.mode !== 'clock' && (
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={countdownContent.showMilliseconds ?? false}
                  onChange={(e) => updateContent({ showMilliseconds: e.target.checked })}
                  className="rounded"
                />
                Show milliseconds
              </label>
            )}
          </div>
        </PropertySection>

        <Separator />

        {/* Format Options */}
        <PropertySection title="Format">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Separator</label>
              <Input
                value={countdownContent.separator || ':'}
                onChange={(e) => updateContent({ separator: e.target.value })}
                className="h-8 text-xs w-20"
                maxLength={3}
              />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={countdownContent.padZeros ?? true}
                onChange={(e) => updateContent({ padZeros: e.target.checked })}
                className="rounded"
              />
              Pad with zeros (01 vs 1)
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={countdownContent.showLabels ?? true}
                onChange={(e) => updateContent({ showLabels: e.target.checked })}
                className="rounded"
              />
              Show labels (h, m, s)
            </label>
          </div>
        </PropertySection>

        {countdownContent.mode !== 'clock' && (
          <>
            <Separator />

            {/* On Complete */}
            <PropertySection title="When Complete">
              <select
                value={countdownContent.onComplete || 'stop'}
                onChange={(e) => updateContent({ onComplete: e.target.value as 'stop' | 'loop' | 'hide' })}
                className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
              >
                <option value="stop">Stop at 0</option>
                <option value="loop">Loop</option>
                <option value="hide">Hide</option>
              </select>
            </PropertySection>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground text-center py-4">
      No content settings for this element type
    </div>
  );
}

// Property section without keyframe button
function PropertySection({ title, children, propertyPath }: { title: string; children: React.ReactNode; propertyPath?: string }) {
  const searchFilter = usePropertySearch();
  const parentMatches = useParentMatch();
  const elementName = useElementName();
  const sectionRef = useRef<HTMLDivElement>(null);

  // Build address from element name and property path (or title as fallback)
  const address = elementName ? buildElementAddress(elementName, propertyPath || title.toLowerCase().replace(/\s+/g, '_')) : '';

  // Check if this section title matches the search
  const normalizedSearch = searchFilter?.toLowerCase().trim() || '';
  const normalizedTitle = title.toLowerCase();
  const titleMatches = normalizedSearch ? normalizedTitle.includes(normalizedSearch) : false;

  // Scroll to this section when it matches the search
  useEffect(() => {
    if (titleMatches && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [titleMatches, searchFilter]);

  // If there's a search filter, check if this section title matches
  if (searchFilter && searchFilter.trim() !== '') {
    // If title matches, wrap children in ParentMatchContext so they all show
    // If parent already matches, keep showing
    const shouldShowAll = titleMatches || parentMatches;

    return (
      <AddressContextMenu address={address} label={title} disabled={!address}>
        <div ref={sectionRef}>
          <label className={cn(
            "text-[10px] font-medium uppercase tracking-wide mb-1 block",
            titleMatches ? "text-emerald-400 bg-emerald-500/20 px-1 rounded" : "text-muted-foreground"
          )}>
            {title}
          </label>
          <ParentMatchContext.Provider value={shouldShowAll}>
            {children}
          </ParentMatchContext.Provider>
        </div>
      </AddressContextMenu>
    );
  }

  return (
    <AddressContextMenu address={address} label={title} disabled={!address}>
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
          {title}
        </label>
        {children}
      </div>
    </AddressContextMenu>
  );
}

// Searchable section for Layout editor - wraps a section and hides it if search doesn't match
function SearchableSection({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  const searchFilter = usePropertySearch();
  const parentMatches = useParentMatch();
  const sectionRef = useRef<HTMLDivElement>(null);

  // Check if this section title matches the search
  const normalizedSearch = searchFilter?.toLowerCase().trim() || '';
  const normalizedTitle = title.toLowerCase();
  const titleMatches = normalizedSearch ? normalizedTitle.includes(normalizedSearch) : false;

  // Scroll to this section when it matches the search
  useEffect(() => {
    if (titleMatches && sectionRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [titleMatches, searchFilter]);

  // If there's a search filter, check if this section title matches
  if (searchFilter && searchFilter.trim() !== '') {
    // If neither title nor parent matches, hide the entire section
    if (!titleMatches && !parentMatches) {
      return null;
    }

    // If title matches, show with highlight and provide context to children
    return (
      <div ref={sectionRef} className="space-y-2">
        <div className={cn(
          "text-xs font-medium uppercase tracking-wide flex items-center gap-2",
          titleMatches ? "text-emerald-400" : "text-muted-foreground"
        )}>
          {icon}
          {title}
        </div>
        <ParentMatchContext.Provider value={titleMatches || parentMatches}>
          {children}
        </ParentMatchContext.Provider>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

// Keyframe diamond button states
type KeyframeDiamondState =
  | 'none'           // No keyframes for this property - hollow diamond, can add
  | 'exists'         // Keyframe exists at different position - semi-filled, can add new
  | 'at-playhead'    // Keyframe exists at current playhead - filled, will update
  | 'selected'       // Currently selected keyframe has this property - filled+glow, editing
  ;

// Keyframable property with diamond button
export function KeyframableProperty({
  title,
  propertyKey,
  elementId,
  elementName,
  selectedKeyframe,
  currentAnimation,
  currentValue,
  onChange,
  children,
  compact = false,
}: {
  title: string;
  propertyKey: string;
  elementId: string;
  elementName?: string;
  selectedKeyframe: Keyframe | null;
  currentAnimation: Animation | null;
  currentValue: string | number | null;
  onChange: (value: string | number | null) => void;
  children: (displayValue: string | number | null, onChange: (value: string | number | null) => void) => React.ReactNode;
  compact?: boolean;
}) {
  // Build address for this property
  const address = elementName ? buildElementAddress(elementName, propertyKey) : null;
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const searchFilter = usePropertySearch();
  const parentMatches = useParentMatch();

  const {
    keyframes,
    animations,
    currentPhase,
    currentTemplateId,
    playheadPosition,
    phaseDurations,
    setAnimations,
    setKeyframes,
    updateKeyframe,
  } = useDesignerStore();

  // Get animation for this element in current phase
  const animation = currentAnimation || animations.find(
    (a) => a.element_id === elementId && a.phase === currentPhase
  );

  // Get all keyframes for this animation (this element only)
  const animationKeyframes = animation
    ? keyframes.filter(kf => kf.animation_id === animation.id)
    : [];

  // Check if this property has any keyframes for THIS element
  const hasKeyframes = animationKeyframes.some(kf => kf.properties[propertyKey] !== undefined);

  // Check if there's a keyframe at current playhead position for THIS element
  // Use phase duration for calculation to match timeline (not animation.duration)
  const phaseDuration = phaseDurations[currentPhase];
  const playheadPositionPercent = Math.min(100, Math.round((playheadPosition / phaseDuration) * 1000) / 10);
  // Use tight tolerance (0.05%) for "at playhead" detection - must be very close
  const PLAYHEAD_TOLERANCE = 0.05;
  const keyframeAtPlayhead = animationKeyframes.find(
    kf => Math.abs(kf.position - playheadPositionPercent) < PLAYHEAD_TOLERANCE && kf.properties[propertyKey] !== undefined
  );

  // IMPORTANT: Only use selectedKeyframe if it belongs to THIS element's animation
  // This prevents keyframe info from one element "bleeding" into another element's properties
  const isSelectedKeyframeForThisElement = selectedKeyframe && animation
    ? selectedKeyframe.animation_id === animation.id
    : false;

  // Get value from selected keyframe if it has this property AND belongs to this element
  const keyframeValue = isSelectedKeyframeForThisElement
    ? selectedKeyframe?.properties[propertyKey]
    : undefined;
  const hasValueInSelectedKeyframe = keyframeValue !== undefined;

  // Determine diamond state - only show 'selected' if keyframe belongs to this element
  const diamondState: KeyframeDiamondState = useMemo(() => {
    if (hasValueInSelectedKeyframe) return 'selected';
    if (keyframeAtPlayhead) return 'at-playhead';
    if (hasKeyframes) return 'exists';
    return 'none';
  }, [hasValueInSelectedKeyframe, keyframeAtPlayhead, hasKeyframes]);

  // Get diamond button styling based on state
  const getDiamondStyles = (state: KeyframeDiamondState) => {
    switch (state) {
      case 'selected':
        return {
          className: 'text-amber-400 ring-2 ring-amber-400/50',
          iconClass: 'fill-amber-400',
          tooltip: 'Editing this keyframe property',
        };
      case 'at-playhead':
        return {
          className: 'text-emerald-400',
          iconClass: 'fill-emerald-400',
          tooltip: 'Keyframe exists here - click to update',
        };
      case 'exists':
        return {
          className: 'text-violet-400',
          iconClass: 'fill-violet-400/50',
          tooltip: 'Keyframe exists - click to add at playhead',
        };
      case 'none':
      default:
        return {
          className: 'text-muted-foreground hover:text-violet-400',
          iconClass: '',
          tooltip: 'Add keyframe at playhead',
        };
    }
  };

  const diamondStyles = getDiamondStyles(diamondState);

  // The display value: use keyframe value if selected and has this property, otherwise element value
  const displayValue = hasValueInSelectedKeyframe ? keyframeValue : currentValue;

  // Handle value change - update element OR keyframe depending on selection
  // Only update keyframe if it belongs to THIS element
  const handleChange = useCallback((newValue: string | number | null) => {
    // Get fresh state to avoid stale closures
    const store = useDesignerStore.getState();
    const freshKeyframes = store.keyframes;
    const freshSelectedKeyframeIds = store.selectedKeyframeIds;

    // Find the selected keyframe fresh from store
    const freshSelectedKeyframe = freshSelectedKeyframeIds.length > 0
      ? freshKeyframes.find(kf => freshSelectedKeyframeIds.includes(kf.id))
      : null;

    // Check if it belongs to this element's animation
    const freshAnimation = animation;
    const freshIsSelectedForElement = freshSelectedKeyframe && freshAnimation
      ? freshSelectedKeyframe.animation_id === freshAnimation.id
      : false;

    // Check if this property exists in the selected keyframe
    const freshHasProperty = freshSelectedKeyframe
      ? freshSelectedKeyframe.properties[propertyKey] !== undefined
      : false;

    console.log('[KeyframableProperty] handleChange:', {
      propertyKey,
      newValue,
      freshIsSelectedForElement,
      freshHasProperty,
      selectedKeyframeId: freshSelectedKeyframe?.id,
    });

    if (freshIsSelectedForElement && freshSelectedKeyframe && freshHasProperty) {
      // Update the keyframe's property
      console.log('[KeyframableProperty] Updating keyframe:', freshSelectedKeyframe.id, 'with', propertyKey, '=', newValue);
      store.updateKeyframe(freshSelectedKeyframe.id, {
        properties: {
          [propertyKey]: newValue as string | number,
        },
      });
    } else {
      // Update the element directly
      console.log('[KeyframableProperty] Updating element directly');
      onChange(newValue);
    }
  }, [animation, propertyKey, onChange]);

  // Add keyframe for this property at current playhead
  const addKeyframe = useCallback(() => {
    const store = useDesignerStore.getState();
    const {
      animations: storeAnimations,
      keyframes: storeKeyframes,
      currentTemplateId: templateId,
      currentPhase: phase,
      playheadPosition: playhead,
      phaseDurations
    } = store;

    if (!templateId) {
      console.warn('[Keyframe] No template selected');
      return;
    }

    console.log('[Keyframe] Adding keyframe for', propertyKey, 'value:', currentValue);

    // Always use phase duration for keyframe position calculation
    // This ensures keyframes align with the timeline which uses phase durations
    const phaseDuration = phaseDurations[phase];

    // Find or create animation for this element
    let animationId: string;

    const existingAnim = storeAnimations.find(
      (a) => a.element_id === elementId && a.phase === phase
    );

    if (existingAnim) {
      animationId = existingAnim.id;
      console.log('[Keyframe] Using existing animation:', animationId);

      // If existing animation duration doesn't match phase duration, update it
      if (existingAnim.duration !== phaseDuration) {
        console.log('[Keyframe] Updating animation duration from', existingAnim.duration, 'to', phaseDuration);
        store.updateAnimation(animationId, { duration: phaseDuration });
      }
    } else {
      // Create new animation using store action (now uses phase duration)
      animationId = store.addAnimation(elementId, phase);
      console.log('[Keyframe] Created new animation:', animationId);
    }

    // Use playhead position directly as absolute milliseconds (clamped to phase duration)
    const position = Math.min(phaseDuration, Math.round(playhead));

    console.log('[Keyframe] Position:', position, 'ms (playhead:', playhead, 'ms, phaseDuration:', phaseDuration, 'ms)');

    // Get fresh keyframes state after potential animation creation
    const freshKeyframes = useDesignerStore.getState().keyframes;

    // Find existing keyframe at this position for this animation
    // Use tight tolerance (5ms) - only match if practically at same position
    const POSITION_TOLERANCE = 5; // milliseconds
    const existingKf = freshKeyframes.find(
      (kf) => kf.animation_id === animationId && Math.abs(kf.position - position) < POSITION_TOLERANCE
    );

    if (existingKf) {
      // ADD this property to existing keyframe (ADDITIVE)
      console.log('[Keyframe] Updating existing keyframe:', existingKf.id);
      store.updateKeyframe(existingKf.id, {
        properties: {
          [propertyKey]: currentValue as string | number,
        },
      });
    } else {
      // Create new keyframe with this property using store action
      console.log('[Keyframe] Creating new keyframe at position:', position);
      store.addKeyframe(animationId, position, { [propertyKey]: currentValue as string | number });
    }
  }, [elementId, propertyKey, currentValue]);

  // Search filter check - MUST be after all hooks
  // Track if this property matches the search
  const searchMatch = searchFilter && searchFilter.trim() !== ''
    ? title.toLowerCase().includes(searchFilter.toLowerCase().trim())
    : false;

  // If there's a search filter and this property doesn't match AND parent doesn't match, hide it
  // If parent matches (e.g., "Font Family" section matches "font"), show all children
  if (searchFilter && searchFilter.trim() !== '' && !searchMatch && !parentMatches) {
    return null;
  }

  // Compact mode: just the input with a small keyframe button
  if (compact) {
    const compactContent = (
      <div className="flex items-center gap-1 group">
        <div className="flex-1">
          {children(displayValue, handleChange)}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-5 w-5 p-0 transition-all rounded",
                  diamondState === 'none' && "opacity-0 group-hover:opacity-100",
                  diamondState !== 'none' && "opacity-100",
                  diamondStyles.className
                )}
                onClick={addKeyframe}
              >
                <Diamond className={cn("w-3 h-3", diamondStyles.iconClass)} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">{diamondStyles.tooltip}</p>
              {diamondState !== 'none' && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {animationKeyframes.filter(kf => kf.properties[propertyKey] !== undefined).length} keyframe(s) for this property
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );

    return address ? (
      <AddressContextMenu address={address} label={`${title} Property`}>
        {compactContent}
      </AddressContextMenu>
    ) : compactContent;
  }

  const nonCompactContent = (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <label className={cn(
          "text-[10px] font-medium uppercase tracking-wide",
          searchMatch ? "text-emerald-400 bg-emerald-500/20 px-1 rounded" :
          diamondState === 'selected' ? "text-amber-400" :
          diamondState === 'at-playhead' ? "text-emerald-400" :
          diamondState === 'exists' ? "text-violet-400" : "text-muted-foreground"
        )}>
          {title}
          {diamondState === 'selected' && " ◆"}
          {diamondState === 'at-playhead' && " ●"}
          {diamondState === 'exists' && " ○"}
        </label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-5 w-5 transition-all rounded',
                  diamondState === 'none' && 'opacity-0 group-hover:opacity-100',
                  diamondState !== 'none' && 'opacity-100',
                  diamondStyles.className
                )}
                onClick={addKeyframe}
              >
                <Diamond className={cn('w-3 h-3', diamondStyles.iconClass)} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">{diamondStyles.tooltip}</p>
              {diamondState !== 'none' && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {animationKeyframes.filter(kf => kf.properties[propertyKey] !== undefined).length} keyframe(s) for this property
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {children(displayValue, handleChange)}
    </div>
  );

  return address ? (
    <AddressContextMenu address={address} label={`${title} Property`}>
      {nonCompactContent}
    </AddressContextMenu>
  ) : nonCompactContent;
}

function ColorInput({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="color"
          value={value === 'transparent' ? '#000000' : value.startsWith('#') ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-input cursor-pointer bg-transparent"
        />
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs flex-1"
        placeholder="#ffffff"
      />
    </div>
  );
}

// Shadow presets
const SHADOW_PRESETS = [
  { name: 'None', value: 'none' },
  { name: 'Subtle', value: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' },
  { name: 'Medium', value: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)' },
  { name: 'Large', value: '0 10px 25px rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.15)' },
  { name: 'XL', value: '0 20px 40px rgba(0,0,0,0.25), 0 10px 20px rgba(0,0,0,0.2)' },
  { name: 'Glow', value: '0 0 20px rgba(139,92,246,0.5)' },
  { name: 'Inset', value: 'inset 0 2px 4px rgba(0,0,0,0.3)' },
];

// Parse shadow string into components
function parseShadow(shadow: string): { x: number; y: number; blur: number; spread: number; color: string; opacity: number; inset: boolean } {
  if (!shadow || shadow === 'none') {
    return { x: 0, y: 0, blur: 0, spread: 0, color: '#000000', opacity: 0.3, inset: false };
  }
  
  const inset = shadow.includes('inset');
  const cleanShadow = shadow.replace('inset', '').trim();
  
  // Try to parse rgba format
  const rgbaMatch = cleanShadow.match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s*(\d+px)?\s*rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    const [, x, y, blur, spread, r, g, b, a] = rgbaMatch;
    const hex = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
    return {
      x: parseInt(x) || 0,
      y: parseInt(y) || 0,
      blur: parseInt(blur) || 0,
      spread: parseInt(spread) || 0,
      color: hex,
      opacity: parseFloat(a) || 1,
      inset,
    };
  }
  
  // Try to parse hex format
  const hexMatch = cleanShadow.match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s*(\d+px)?\s*(#[0-9a-fA-F]{3,8})/);
  if (hexMatch) {
    const [, x, y, blur, spread, color] = hexMatch;
    return {
      x: parseInt(x) || 0,
      y: parseInt(y) || 0,
      blur: parseInt(blur) || 0,
      spread: parseInt(spread) || 0,
      color: color,
      opacity: 1,
      inset,
    };
  }
  
  // Simple fallback parse
  const simpleMatch = cleanShadow.match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px/);
  if (simpleMatch) {
    return {
      x: parseInt(simpleMatch[1]) || 0,
      y: parseInt(simpleMatch[2]) || 0,
      blur: parseInt(simpleMatch[3]) || 0,
      spread: 0,
      color: '#000000',
      opacity: 0.3,
      inset,
    };
  }
  
  return { x: 0, y: 4, blur: 12, spread: 0, color: '#000000', opacity: 0.3, inset: false };
}

// Build shadow string from components
function buildShadow(x: number, y: number, blur: number, spread: number, color: string, opacity: number, inset: boolean): string {
  if (blur === 0 && x === 0 && y === 0 && spread === 0) {
    return 'none';
  }
  
  // Convert hex to rgb
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  
  const insetStr = inset ? 'inset ' : '';
  const spreadStr = spread !== 0 ? ` ${spread}px` : '';
  
  return `${insetStr}${x}px ${y}px ${blur}px${spreadStr} rgba(${r},${g},${b},${opacity.toFixed(2)})`;
}

function ShadowEditor({ value, onChange }: { value: string; onChange: (shadow: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const parsed = parseShadow(value);
  
  const [x, setX] = useState(parsed.x);
  const [y, setY] = useState(parsed.y);
  const [blur, setBlur] = useState(parsed.blur);
  const [spread, setSpread] = useState(parsed.spread);
  const [color, setColor] = useState(parsed.color);
  const [opacity, setOpacity] = useState(parsed.opacity);
  const [inset, setInset] = useState(parsed.inset);
  
  // Update local state when value changes externally
  useEffect(() => {
    const p = parseShadow(value);
    setX(p.x);
    setY(p.y);
    setBlur(p.blur);
    setSpread(p.spread);
    setColor(p.color);
    setOpacity(p.opacity);
    setInset(p.inset);
  }, [value]);
  
  const updateShadow = useCallback((
    newX = x, newY = y, newBlur = blur, newSpread = spread, 
    newColor = color, newOpacity = opacity, newInset = inset
  ) => {
    const newShadow = buildShadow(newX, newY, newBlur, newSpread, newColor, newOpacity, newInset);
    onChange(newShadow);
  }, [x, y, blur, spread, color, opacity, inset, onChange]);
  
  const hasShadow = value && value !== 'none' && value !== '';
  
  return (
    <div className="space-y-2">
      {/* Presets Row */}
      <div className="flex flex-wrap gap-1">
        {SHADOW_PRESETS.slice(0, 5).map((preset) => (
          <button
            key={preset.name}
            onClick={() => onChange(preset.value)}
            className={cn(
              'px-2 py-1 text-[10px] rounded border transition-colors',
              (value === preset.value || (!hasShadow && preset.value === 'none'))
                ? 'bg-violet-500/20 border-violet-500 text-violet-400'
                : 'bg-muted border-border hover:border-violet-500/50 text-muted-foreground hover:text-foreground'
            )}
          >
            {preset.name}
          </button>
        ))}
      </div>
      
      {/* Preview Box */}
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 bg-violet-500 rounded-md flex-shrink-0"
          style={{ boxShadow: hasShadow ? value : 'none' }}
        />
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? '▼ Hide controls' : '▶ Custom shadow'}
        </button>
      </div>
      
      {/* Expanded Controls */}
      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {/* X & Y Offset */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">X Offset</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={x}
                  onChange={(e) => {
                    const newX = parseInt(e.target.value) || 0;
                    setX(newX);
                    updateShadow(newX, y, blur, spread, color, opacity, inset);
                  }}
                  className="h-7 text-xs"
                />
                <span className="text-[10px] text-muted-foreground">px</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Y Offset</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={y}
                  onChange={(e) => {
                    const newY = parseInt(e.target.value) || 0;
                    setY(newY);
                    updateShadow(x, newY, blur, spread, color, opacity, inset);
                  }}
                  className="h-7 text-xs"
                />
                <span className="text-[10px] text-muted-foreground">px</span>
              </div>
            </div>
          </div>
          
          {/* Blur & Spread */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Blur</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  value={blur}
                  onChange={(e) => {
                    const newBlur = Math.max(0, parseInt(e.target.value) || 0);
                    setBlur(newBlur);
                    updateShadow(x, y, newBlur, spread, color, opacity, inset);
                  }}
                  className="h-7 text-xs"
                />
                <span className="text-[10px] text-muted-foreground">px</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Spread</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={spread}
                  onChange={(e) => {
                    const newSpread = parseInt(e.target.value) || 0;
                    setSpread(newSpread);
                    updateShadow(x, y, blur, newSpread, color, opacity, inset);
                  }}
                  className="h-7 text-xs"
                />
                <span className="text-[10px] text-muted-foreground">px</span>
              </div>
            </div>
          </div>
          
          {/* Color & Opacity */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Color</label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    updateShadow(x, y, blur, spread, e.target.value, opacity, inset);
                  }}
                  className="w-7 h-7 rounded border border-input cursor-pointer bg-transparent"
                />
                <Input
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    updateShadow(x, y, blur, spread, e.target.value, opacity, inset);
                  }}
                  className="h-7 text-xs flex-1"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Opacity</label>
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => {
                    const newOpacity = parseFloat(e.target.value);
                    setOpacity(newOpacity);
                    updateShadow(x, y, blur, spread, color, newOpacity, inset);
                  }}
                  className="flex-1 h-2 accent-violet-500"
                />
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Inset Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newInset = !inset;
                setInset(newInset);
                updateShadow(x, y, blur, spread, color, opacity, newInset);
              }}
              className={cn(
                'px-2 py-1 text-[10px] rounded border transition-colors',
                inset
                  ? 'bg-violet-500/20 border-violet-500 text-violet-400'
                  : 'bg-muted border-border hover:border-violet-500/50 text-muted-foreground'
              )}
            >
              Inset
            </button>
            <span className="text-[10px] text-muted-foreground">Inner shadow</span>
          </div>
        </div>
      )}
    </div>
  );
}
