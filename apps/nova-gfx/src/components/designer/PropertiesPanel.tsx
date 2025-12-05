import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Type, Image, Square, Move, RotateCcw,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Eye, EyeOff, Lock, Unlock, Trash2, Copy, Diamond, BarChart3, Group,
  ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, Layers, ScrollText, Tag, X, Plus, Check, Edit2,
  FolderOpen, Timer,
} from 'lucide-react';
import { TickerEditor } from '@/components/panels/TickerEditor';
import { TopicBadgePreview } from '@/components/canvas/TopicBadgeElement';
import { TOPIC_BADGE_STYLES, type TickerTopic } from '@emergent-platform/types';
import { IconPickerDialog } from '@/components/dialogs/IconPickerDialog';
import { MediaPickerDialog } from '@/components/dialogs/MediaPickerDialog';
import { FontPickerDialog } from '@/components/dialogs/FontPickerDialog';
import { loadFont } from '@/lib/fonts';
import { TableEditor } from '@/components/panels/TableEditor';
import { MapContentEditor, MapStyleEditor } from './MapPropertiesPanel';
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

export function PropertiesPanel() {
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
  } = useDesignerStore();
  const [activeTab, setActiveTab] = useState('style');

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

  // Check if selected keyframe belongs to the currently displayed element
  // This prevents showing keyframe info from a different element
  const isKeyframeForCurrentElement = useMemo(() => {
    if (!selectedKeyframe || !currentAnimation) return false;
    return selectedKeyframe.animation_id === currentAnimation.id;
  }, [selectedKeyframe, currentAnimation]);

  // Only show keyframe in header if it belongs to current element
  const displayedKeyframe = isKeyframeForCurrentElement ? selectedKeyframe : null;

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
        
        {/* Show enhanced keyframe info if one is selected AND belongs to this element */}
        {displayedKeyframe && (
          <div className="mt-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Diamond className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-medium text-amber-400">
                Keyframe Selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] px-1.5 ml-auto text-amber-400 hover:text-amber-300"
                onClick={() => selectKeyframes([])}
              >
                ✕ Deselect
              </Button>
            </div>
            <div className="text-[10px] text-amber-300/80 space-y-0.5">
              <div className="flex justify-between">
                <span>Position:</span>
                <span className="font-mono">{displayedKeyframe.position}%</span>
              </div>
              <div className="flex justify-between">
                <span>Properties:</span>
                <span className="font-mono">{Object.keys(displayedKeyframe.properties).length}</span>
              </div>
              {Object.keys(displayedKeyframe.properties).length > 0 && (
                <div className="mt-1 pt-1 border-t border-amber-500/20">
                  <div className="text-[9px] uppercase text-amber-400/60 mb-0.5">Animated:</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(displayedKeyframe.properties).slice(0, 6).map(key => (
                      <span
                        key={key}
                        className="px-1 py-0.5 bg-amber-500/20 rounded text-[9px] text-amber-300"
                      >
                        {key.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {Object.keys(displayedKeyframe.properties).length > 6 && (
                      <span className="px-1 py-0.5 text-[9px] text-amber-400/60">
                        +{Object.keys(displayedKeyframe.properties).length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-0.5 mt-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => updateElement(selectedElement.id, { visible: !selectedElement.visible })}
            title={selectedElement.visible ? 'Hide' : 'Show'}
          >
            {selectedElement.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })}
            title={selectedElement.locked ? 'Unlock' : 'Lock'}
          >
            {selectedElement.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplicate">
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => deleteElements([selectedElement.id])}
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-1.5 h-6">
          <TabsTrigger value="style" className="text-[10px] h-5 flex-1">Style</TabsTrigger>
          <TabsTrigger value="layout" className="text-[10px] h-5 flex-1">Layout</TabsTrigger>
          <TabsTrigger value="content" className="text-[10px] h-5 flex-1">Content</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="style" className="mt-0 p-2">
            <StyleEditor 
              element={selectedElement} 
              selectedKeyframe={selectedKeyframe}
              currentAnimation={currentAnimation}
            />
          </TabsContent>

          <TabsContent value="layout" className="mt-0 p-2">
            <LayoutEditor 
              element={selectedElement}
              selectedKeyframe={selectedKeyframe}
              currentAnimation={currentAnimation}
            />
          </TabsContent>

          <TabsContent value="content" className="mt-0 p-2">
            <ContentEditor 
              element={selectedElement}
              selectedKeyframe={selectedKeyframe}
              currentAnimation={currentAnimation}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function ElementIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    text: <Type className="w-3 h-3" />,
    image: <Image className="w-3 h-3" />,
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

      {/* Opacity */}
      <KeyframableProperty
        title="Opacity"
        propertyKey="opacity"
        elementId={element.id}
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

      {/* Fill / Background */}
      {element.content.type === 'shape' && (
        <KeyframableProperty
          title="Fill"
          propertyKey="fill"
          elementId={element.id}
          selectedKeyframe={selectedKeyframe}
          currentAnimation={currentAnimation}
          currentValue={(element.content as { fill?: string }).fill || '#3B82F6'}
          onChange={(color) => {
            updateElement(element.id, {
              content: { ...element.content, fill: color as string } as typeof element.content,
            });
          }}
        >
          {(displayValue, onChange) => (
            <ColorInput
              value={(displayValue as string) ?? (element.content as { fill?: string }).fill ?? '#3B82F6'}
              onChange={(c) => onChange(c)}
            />
          )}
        </KeyframableProperty>
      )}

      {/* Background Color */}
      <KeyframableProperty
        title="Background"
        propertyKey="backgroundColor"
        elementId={element.id}
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

      {/* Border */}
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

      {/* Border Radius */}
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

      {/* Shadow */}
      <PropertySection title="Shadow">
        <ShadowEditor
          value={getStyle('boxShadow', '')}
          onChange={(shadow) => updateStyle('boxShadow', shadow)}
        />
      </PropertySection>

      {/* Blur */}
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

  const [showIconPicker, setShowIconPicker] = useState(false);
  // Extended ticker content type for icon support
  const tickerContentExtended = tickerContent as typeof tickerContent & { icon?: { library: 'lucide' | 'phosphor'; name: string; weight?: string } };
  const tickerIcon = tickerContentExtended.icon || { library: 'lucide' as const, name: '', weight: undefined };

  return (
    <div className="space-y-2">
      {/* Font Controls - Priority at top */}
      <PropertySection title="Font Size">
        <KeyframableProperty
          title=""
          propertyKey="tickerFontSize"
          elementId={element.id}
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

      <PropertySection title="Font Family">
        <FontFamilyPicker
          value={getStyle('fontFamily', 'Inter')}
          onChange={(fontFamily) => updateStyle('fontFamily', fontFamily)}
        />
      </PropertySection>

      <PropertySection title="Icon Next to Font">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] flex-1"
            onClick={() => setShowIconPicker(true)}
          >
            {tickerIcon.name ? (
              <div className="flex items-center gap-1">
                <IconPreview
                  library={tickerIcon.library as 'lucide' | 'fontawesome' | 'lottie' | 'weather'}
                  iconName={tickerIcon.name}
                  weight={tickerIcon.weight as 'solid' | 'regular' | 'brands' | undefined}
                  size={14}
                />
                <span className="truncate">{tickerIcon.name}</span>
              </div>
            ) : (
              'Select Icon'
            )}
          </Button>
          {tickerIcon.name && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => updateContent({ icon: undefined } as Partial<typeof tickerContent>)}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        {showIconPicker && (
          <IconPickerDialog
            open={showIconPicker}
            onOpenChange={setShowIconPicker}
            onSelect={(library, iconName, weight) => {
              updateContent({
                icon: { library, name: iconName, weight },
              } as Partial<typeof tickerContent>);
              setShowIconPicker(false);
            }}
            currentLibrary={tickerIcon.library as 'lucide' | 'fontawesome' | 'lottie' | 'weather'}
            currentIconName={tickerIcon.name}
            currentWeight={tickerIcon.weight as 'solid' | 'regular' | 'brands' | undefined}
          />
        )}
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

// Chart Style Editor - handles all styling options for charts
function ShapeStyleEditor({ element, updateContent }: { element: Element; updateContent: (updates: Record<string, unknown>) => void }) {
  const shapeContent = element.content.type === 'shape' ? element.content : null;
  
  if (!shapeContent) return null;

  const hasGradient = shapeContent.gradient?.enabled ?? false;

  return (
    <div className="space-y-3">
      <PropertySection title="Shape Type">
        <select
          value={shapeContent.shape || 'rectangle'}
          onChange={(e) => updateContent({ shape: e.target.value as 'rectangle' | 'rhombus' | 'trapezoid' | 'parallelogram' })}
          className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
        >
          <option value="rectangle">Rectangle</option>
          <option value="parallelogram">Parallelogram</option>
          <option value="rhombus">Rhombus</option>
          <option value="trapezoid">Trapezoid</option>
        </select>
      </PropertySection>

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

      <PropertySection title="Fill">
        <div className="space-y-2">
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
          ) : !shapeContent.glass?.enabled ? (
            <div>
              <input
                type="color"
                value={shapeContent.fill || '#3B82F6'}
                onChange={(e) => updateContent({ fill: e.target.value })}
                className="h-8 w-full cursor-pointer rounded border border-input"
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Glass effect is active. Disable glass to use solid fill.
            </p>
          )}
        </div>
      </PropertySection>

      <PropertySection title="Stroke">
        <div className="space-y-2">
          <input
            type="color"
            value={shapeContent.stroke || '#000000'}
            onChange={(e) => updateContent({ stroke: e.target.value })}
            className="h-8 w-full cursor-pointer rounded border border-input"
          />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Stroke Width</label>
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
    </div>
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

function LayoutEditor({ element, selectedKeyframe, currentAnimation }: EditorProps) {
  const { 
    updateElement, 
    bringToFront, 
    sendToBack, 
    bringForward, 
    sendBackward, 
    setZIndex 
  } = useDesignerStore();

  return (
    <div className="space-y-4">
      {/* Position Section */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Position
        </div>
        <div className="grid grid-cols-2 gap-2">
          <KeyframableProperty
            title="X"
            propertyKey="position_x"
            elementId={element.id}
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
      </div>

      {/* Size Section */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Size
        </div>
        <div className="grid grid-cols-2 gap-2">
          <KeyframableProperty
            title="W"
            propertyKey="width"
            elementId={element.id}
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
      </div>

      <Separator />

      {/* Transform Section */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Transform
        </div>
        
        {/* Rotation */}
        <KeyframableProperty
          title="Rotation"
          propertyKey="rotation"
          elementId={element.id}
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
      </div>

      <Separator />

      {/* Anchor Point */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Anchor Point
        </div>
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
      </div>

      <Separator />

      {/* Z-Order / Layering */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <Layers className="w-3.5 h-3.5" />
          Layer Order
        </div>
        
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
      </div>
    </div>
  );
}


function ContentEditor({ element, selectedKeyframe, currentAnimation }: EditorProps) {
  const { updateElement } = useDesignerStore();
  const [showImageMediaPicker, setShowImageMediaPicker] = useState(false);

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

        <Separator />

        <PropertySection title="Animation">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={animation.enabled || false}
                onChange={(e) => updateContent({ 
                  animation: { 
                    ...animation, 
                    enabled: e.target.checked,
                    type: animation.type || 'fade',
                    duration: animation.duration || 1,
                    delay: animation.delay || 0,
                    easing: animation.easing || 'ease-out',
                    direction: animation.direction || 'in',
                  } 
                })}
                className="rounded"
              />
              <span>Enable Animation</span>
            </label>

            {animation.enabled && (
              <div className="space-y-3 pl-4 border-l-2 border-violet-500/30">
                <KeyframableProperty
                  title="Animation Type"
                  propertyKey="textAnimationType"
                  elementId={element.id}
                  selectedKeyframe={selectedKeyframe}
                  currentAnimation={currentAnimation}
                  currentValue={animation.type || 'fade'}
                  onChange={(value) => updateContent({
                    animation: {
                      ...animation,
                      type: (value as 'typewriter' | 'wave' | 'fade' | 'slide' | 'scale' | 'blur' | 'glow' | 'bounce' | 'custom') || 'fade'
                    }
                  })}
                >
                  {(displayValue, onChange) => (
                    <select
                      value={(displayValue as string) || 'fade'}
                      onChange={(e) => onChange(e.target.value)}
                      className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                    >
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="scale">Scale</option>
                      <option value="blur">Blur</option>
                      <option value="glow">Glow</option>
                      <option value="typewriter">Typewriter</option>
                      <option value="wave">Wave</option>
                      <option value="bounce">Bounce</option>
                      <option value="custom">Custom</option>
                    </select>
                  )}
                </KeyframableProperty>

                <div className="grid grid-cols-2 gap-2">
                  <KeyframableProperty
                    title="Duration (s)"
                    propertyKey="textAnimationDuration"
                    elementId={element.id}
                    selectedKeyframe={selectedKeyframe}
                    currentAnimation={currentAnimation}
                    currentValue={animation.duration || 1}
                    onChange={(value) => updateContent({ 
                      animation: { 
                        ...animation, 
                        duration: (value as number) || 1 
                      } 
                    })}
                    compact
                  >
                    {(displayValue, onChange) => (
                      <Input
                        type="number"
                        value={displayValue || 1}
                        onChange={(e) => onChange(parseFloat(e.target.value) || 1)}
                        min="0.1"
                        max="10"
                        step="0.1"
                        className="h-6 text-[10px]"
                      />
                    )}
                  </KeyframableProperty>
                  <KeyframableProperty
                    title="Delay (s)"
                    propertyKey="textAnimationDelay"
                    elementId={element.id}
                    selectedKeyframe={selectedKeyframe}
                    currentAnimation={currentAnimation}
                    currentValue={animation.delay || 0}
                    onChange={(value) => updateContent({ 
                      animation: { 
                        ...animation, 
                        delay: (value as number) || 0 
                      } 
                    })}
                    compact
                  >
                    {(displayValue, onChange) => (
                      <Input
                        type="number"
                        value={displayValue || 0}
                        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="5"
                        step="0.1"
                        className="h-6 text-[10px]"
                      />
                    )}
                  </KeyframableProperty>
                </div>

                <KeyframableProperty
                  title="Easing"
                  propertyKey="textAnimationEasing"
                  elementId={element.id}
                  selectedKeyframe={selectedKeyframe}
                  currentAnimation={currentAnimation}
                  currentValue={animation.easing || 'ease-out'}
                  onChange={(value) => updateContent({ 
                    animation: { 
                      ...animation, 
                      easing: (value as string) || 'ease-out' 
                    } 
                  })}
                >
                  {(displayValue, onChange) => (
                    <select
                      value={(displayValue as string) || 'ease-out'}
                      onChange={(e) => onChange(e.target.value)}
                      className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                    >
                      <option value="linear">Linear</option>
                      <option value="ease-in">Ease In</option>
                      <option value="ease-out">Ease Out</option>
                      <option value="ease-in-out">Ease In Out</option>
                      <option value="ease">Ease</option>
                      <option value="cubic-bezier(0.68, -0.55, 0.265, 1.55)">Bounce</option>
                    </select>
                  )}
                </KeyframableProperty>

                <KeyframableProperty
                  title="Direction"
                  propertyKey="textAnimationDirection"
                  elementId={element.id}
                  selectedKeyframe={selectedKeyframe}
                  currentAnimation={currentAnimation}
                  currentValue={animation.direction || 'in'}
                  onChange={(value) => updateContent({ 
                    animation: { 
                      ...animation, 
                      direction: (value as string) as 'in' | 'out' | 'in-out' || 'in' 
                    } 
                  })}
                >
                  {(displayValue, onChange) => (
                    <select
                      value={(displayValue as string) || 'in'}
                      onChange={(e) => onChange(e.target.value)}
                      className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
                    >
                      <option value="in">In</option>
                      <option value="out">Out</option>
                      <option value="in-out">In-Out</option>
                    </select>
                  )}
                </KeyframableProperty>

                {animation.type === 'custom' && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Custom Properties (JSON)</label>
                    <textarea
                      value={JSON.stringify(animation.customProperties || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const props = JSON.parse(e.target.value);
                          updateContent({ 
                            animation: { 
                              ...animation, 
                              customProperties: props 
                            } 
                          });
                        } catch (err) {
                          // Invalid JSON, ignore
                        }
                      }}
                      className="w-full h-24 p-2 text-xs bg-muted border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                      placeholder='{"opacity": [0, 1], "x": [-100, 0]}'
                    />
                  </div>
                )}

              </div>
            )}
          </div>
        </PropertySection>
      </div>
    );
  }

  if (element.content.type === 'image') {
    const imageContent = element.content;
    const hasNativeDimensions = imageContent.nativeWidth && imageContent.nativeHeight;

    return (
      <div className="space-y-4">
        <PropertySection title="Image Source">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={imageContent.src || ''}
                onChange={(e) => updateContent({ src: e.target.value })}
                placeholder="https://..."
                className="flex-1 h-8 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => setShowImageMediaPicker(true)}
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs gap-1"
              onClick={() => setShowImageMediaPicker(true)}
            >
              <FolderOpen className="w-3 h-3" />
              Browse Media Library
            </Button>
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
    return (
      <div className="space-y-2">
        <PropertySection title="Chart Type">
          <select
            value={chartContent.chartType || 'bar'}
            onChange={(e) => updateContent({ chartType: e.target.value as any })}
            className="w-full h-6 text-[10px] bg-muted border border-input rounded-md px-1.5 cursor-pointer"
          >
            <option value="bar">Bar Chart</option>
            <option value="horizontal-bar">Horizontal Bar</option>
            <option value="line">Line Chart</option>
            <option value="area">Area Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="donut">Donut Chart</option>
            <option value="gauge">Gauge</option>
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

        <Separator />

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

        {chartContent.options?.animated !== false && (
          <PropertySection title="Animation">
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
      </div>
    );
  }

  // Chart styling is now in ChartStyleEditor (Style tab)
  // Content tab only has: Chart Type, Title, Options, Data, Gauge values

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
    return (
      <div className="space-y-4">
        <PropertySection title="Video URL">
          <Input
            value={videoContent.src || ''}
            onChange={(e) => updateContent({ src: e.target.value })}
            placeholder="YouTube, Vimeo, or direct video URL..."
            className="h-8 text-xs"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Supports YouTube, Vimeo, and direct video URLs (.mp4, .webm)
          </p>
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
    const tickerContent = element.content;
    // Only show items editor in Content tab (config moved to Style tab)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newItemText, setNewItemText] = useState('');

    const handleAddItem = () => {
      if (!newItemText.trim()) return;
      const newItem = {
        id: `item-${Date.now()}`,
        content: newItemText.trim(),
      };
      updateContent({ items: [...(tickerContent.items || []), newItem] });
      setNewItemText('');
    };

    const handleRemoveItem = (id: string) => {
      updateContent({ items: (tickerContent.items || []).filter((item) => item.id !== id) });
    };

    const handleUpdateItem = (id: string, updates: Partial<typeof tickerContent.items[0]>) => {
      updateContent({
        items: (tickerContent.items || []).map((item) => (item.id === id ? { ...item, ...updates } : item))
      });
      setEditingId(null);
    };

    return (
      <div className="space-y-2">
        <PropertySection title={`Ticker Items (${tickerContent.items?.length || 0})`}>
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
              {(tickerContent.items || []).map((item, index) => {
                const isEditing = editingId === item.id;
                const [editValue, setEditValue] = useState(item.content);

                if (isEditing) {
                  return (
                    <div key={item.id} className="flex items-center gap-1 p-1 bg-muted/50 rounded">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateItem(item.id, { content: editValue.trim() });
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="h-6 text-[10px] flex-1"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleUpdateItem(item.id, { content: editValue.trim() })}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                }

                return (
                  <div key={item.id} className="flex items-center gap-1 p-1 hover:bg-muted/50 rounded group">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] truncate block">{item.content}</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setEditingId(item.id)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => handleRemoveItem(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {(tickerContent.items || []).length === 0 && (
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

  // Line content editor
  if (element.content.type === 'line') {
    const lineContent = element.content;
    const [points, setPoints] = useState(lineContent.points || [{ x: 0, y: 0 }, { x: 200, y: 0 }]);

    // Update points when content changes
    useEffect(() => {
      if (lineContent.points) {
        setPoints(lineContent.points);
      }
    }, [lineContent.points]);

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
    const [showIconPicker, setShowIconPicker] = useState(false);

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
          <div className="flex justify-center p-2 bg-neutral-900 rounded">
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
function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
        {title}
      </label>
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
  selectedKeyframe: Keyframe | null;
  currentAnimation: Animation | null;
  currentValue: string | number | null;
  onChange: (value: string | number | null) => void;
  children: (displayValue: string | number | null, onChange: (value: string | number | null) => void) => React.ReactNode;
  compact?: boolean;
}) {
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

    // Calculate position based on playhead (0-100%) relative to phase duration
    // Use precise floating point calculation, round to 1 decimal place for precision
    const rawPosition = (playhead / phaseDuration) * 100;
    // Round to 1 decimal place for precision while still being reasonable
    const position = Math.min(100, Math.round(rawPosition * 10) / 10);

    console.log('[Keyframe] Position:', position, '% (playhead:', playhead, 'ms, phaseDuration:', phaseDuration, 'ms, raw:', rawPosition.toFixed(2), '%)');

    // Get fresh keyframes state after potential animation creation
    const freshKeyframes = useDesignerStore.getState().keyframes;

    // Find existing keyframe at this position for this animation
    // Use tight tolerance (0.05%) - only match if practically at same position
    const POSITION_TOLERANCE = 0.05;
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

  // Compact mode: just the input with a small keyframe button
  if (compact) {
    return (
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
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <label className={cn(
          "text-[10px] font-medium uppercase tracking-wide",
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
