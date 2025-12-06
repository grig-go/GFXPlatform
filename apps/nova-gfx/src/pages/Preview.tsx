import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDesignerStore } from '@/stores/designerStore';
import { getAnimatedProperties } from '@/lib/animation';
import { ChartElement } from '@/components/canvas/ChartElement';
import { MapElement } from '@/components/canvas/MapElement';
import { VideoElement } from '@/components/canvas/VideoElement';
import { SVGElement } from '@/components/canvas/SVGElement';
import { IconElement } from '@/components/canvas/IconElement';
import { TableElement } from '@/components/canvas/TableElement';
import { LineElement } from '@/components/canvas/LineElement';
import { TickerElement } from '@/components/canvas/TickerElement';
import { TopicBadgeElement } from '@/components/canvas/TopicBadgeElement';
import { CountdownElement } from '@/components/canvas/CountdownElement';
import { TextElement } from '@/components/canvas/TextElement';
import { ImageElement } from '@/components/canvas/ImageElement';
import type { Element, Animation, Keyframe, Template, Project, AnimationPhase, Layer } from '@emergent-platform/types';

// Helper to convert color to rgba with opacity
function colorToRgba(color: string, opacity: number): string {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  // Handle rgb colors
  if (color.startsWith('rgb(')) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
    }
  }
  // Handle rgba colors - extract rgb and apply new opacity
  if (color.startsWith('rgba(')) {
    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
    }
  }
  // Handle named colors or transparent - fallback to semi-transparent black
  if (color === 'transparent' || !color) {
    return `rgba(0, 0, 0, ${opacity})`;
  }
  // For other named colors, just return with opacity (browser will handle)
  return `rgba(0, 0, 0, ${opacity})`;
}

// Convert box-shadow to filter: drop-shadow() for icon shape matching
function convertBoxShadowToFilter(boxShadow: string): string {
  if (!boxShadow || boxShadow === 'none') return '';

  // Parse box-shadow: offsetX offsetY blur spread color
  const match = boxShadow.match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)?px?\s+(.+)/);
  if (match) {
    const [, offsetX, offsetY, blur, , color] = match;
    return `drop-shadow(${offsetX}px ${offsetY}px ${blur}px ${color})`;
  }

  // Fallback: try to extract just color and blur
  const colorMatch = boxShadow.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
  const blurMatch = boxShadow.match(/(\d+)px/);
  if (colorMatch && blurMatch) {
    return `drop-shadow(0 0 ${blurMatch[1]}px ${colorMatch[0]})`;
  }

  return '';
}

// Preview data that can be loaded from localStorage
interface PreviewData {
  layers: Layer[];
  templates: Template[];
  elements: Element[];
  animations: Animation[];
  keyframes: Keyframe[];
  currentTemplateId: string | null;
  project: Project | null;
}

// Preview renders templates with animations
export function Preview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateIdParam = searchParams.get('template');
  const layerIdParam = searchParams.get('layer');
  const bgColor = searchParams.get('bg') || 'transparent';
  const modeParam = searchParams.get('mode') as 'isolated' | 'composite' | null;

  // OBS Mode - clean overlay without controls
  const obsMode = searchParams.get('obs') === '1' || searchParams.get('obs') === 'true';
  // Auto-play in OBS mode
  const autoPlay = searchParams.get('autoplay') === '1' || obsMode;
  // Phase to show (default: loop for OBS, in for normal)
  const initialPhase = (searchParams.get('phase') as 'in' | 'loop' | 'out') || (obsMode ? 'loop' : 'in');
  // Loop control - default to true for OBS mode, but can be disabled with loop=0
  const shouldLoop = searchParams.get('loop') !== '0' && obsMode;
  
  // Try to get data from store first
  const storeData = useDesignerStore((state) => ({
    layers: state.layers,
    templates: state.templates,
    elements: state.elements,
    animations: state.animations,
    keyframes: state.keyframes,
    currentProject: state.project,
  }));

  // Load from localStorage if store is empty (new window case)
  const [localData, setLocalData] = useState<PreviewData | null>(null);

  // Content overrides from postMessage (for real-time updates)
  const [contentOverrides, setContentOverrides] = useState<Record<string, any>>({});

  // Ref to track current localData for use in event handlers (avoids stale closure)
  const localDataRef = useRef<PreviewData | null>(null);
  useEffect(() => {
    localDataRef.current = localData;
  }, [localData]);

  useEffect(() => {
    // Check if store has data
    if (storeData.templates.length === 0) {
      // Try to load from localStorage
      const savedData = localStorage.getItem('nova-preview-data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setLocalData(parsed);
          console.log('Preview loaded from localStorage:', parsed);
        } catch (e) {
          console.error('Failed to parse preview data:', e);
        }
      }
    }
  }, [storeData.templates.length]);

  // Use store data if available, otherwise use localStorage data
  const layers = storeData.layers.length > 0 ? storeData.layers : (localData?.layers || []);
  const templates = storeData.templates.length > 0 ? storeData.templates : (localData?.templates || []);
  const elements = storeData.elements.length > 0 ? storeData.elements : (localData?.elements || []);
  const animations = storeData.animations.length > 0 ? storeData.animations : (localData?.animations || []);
  const keyframes = storeData.keyframes.length > 0 ? storeData.keyframes : (localData?.keyframes || []);
  const currentProject = storeData.currentProject || localData?.project || null;

  // Preview mode: 'isolated' shows single template, 'composite' shows all
  const [previewMode, setPreviewMode] = useState<'isolated' | 'composite'>(modeParam || 'isolated');

  // Selection state - "all" means show all enabled layers/templates
  // In isolated mode, we show only the selected template; in composite mode, we show all
  const [selectedLayerId, setSelectedLayerId] = useState<string | 'all'>(layerIdParam || 'all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | 'all'>(() => {
    // In isolated mode, use template param; in composite mode, show all
    if (modeParam === 'composite') return 'all';
    return templateIdParam || 'all';
  });
  const [showSelector, setShowSelector] = useState(false);

  // Playback state - use URL params for initial values
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentPhase, setCurrentPhase] = useState<AnimationPhase>(initialPhase);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isLooping, setIsLooping] = useState(shouldLoop); // Loop control via URL param
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Get enabled layers (sorted by z-index)
  const enabledLayers = useMemo(() => {
    return layers
      .filter(l => l.enabled !== false)
      .sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
  }, [layers]);

  // Get templates to show based on selection
  const visibleTemplates = useMemo(() => {
    let filtered = templates.filter(t => t.enabled !== false);
    
    // Filter by layer if a specific layer is selected
    if (selectedLayerId !== 'all') {
      filtered = filtered.filter(t => t.layer_id === selectedLayerId);
    } else {
      // Only show templates from enabled layers
      const enabledLayerIds = new Set(enabledLayers.map(l => l.id));
      filtered = filtered.filter(t => enabledLayerIds.has(t.layer_id));
    }
    
    // Filter by specific template if selected
    if (selectedTemplateId !== 'all') {
      filtered = filtered.filter(t => t.id === selectedTemplateId);
    }
    
    // Sort by layer z-index
    return filtered.sort((a, b) => {
      const layerA = layers.find(l => l.id === a.layer_id);
      const layerB = layers.find(l => l.id === b.layer_id);
      return (layerA?.z_index || 0) - (layerB?.z_index || 0);
    });
  }, [templates, selectedLayerId, selectedTemplateId, enabledLayers, layers]);

  // Apply content overrides to elements
  const elementsWithOverrides = useMemo(() => {
    if (Object.keys(contentOverrides).length === 0) {
      return elements;
    }

    return elements.map(element => {
      let updatedElement = element;

      // Check if this element has an override by ID
      if (contentOverrides[element.id] !== undefined) {
        const override = contentOverrides[element.id];
        if (element.content?.type === 'text') {
          updatedElement = {
            ...updatedElement,
            content: { ...updatedElement.content, text: override },
          };
        } else if (element.content?.type === 'image') {
          updatedElement = {
            ...updatedElement,
            content: { ...updatedElement.content, src: override, url: override },
          };
        } else if (element.content?.type === 'icon') {
          updatedElement = {
            ...updatedElement,
            content: { ...updatedElement.content, iconName: override },
          };
        } else if (element.content?.type === 'map') {
          // Parse "lat, lng" format and convert to [lng, lat] array
          const coordStr = String(override);
          const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const [lat, lng] = parts;
            updatedElement = {
              ...updatedElement,
              content: { ...updatedElement.content, center: [lng, lat] as [number, number] },
            };
          }
        }
      }

      // Check for locationKeyframes override (key format: `${elementId}_keyframes`)
      const keyframesKey = `${element.id}_keyframes`;
      if (contentOverrides[keyframesKey] !== undefined && element.content?.type === 'map') {
        try {
          // Parse keyframes - can be a JSON string or already an array
          const keyframesOverride = typeof contentOverrides[keyframesKey] === 'string'
            ? JSON.parse(contentOverrides[keyframesKey])
            : contentOverrides[keyframesKey];

          if (Array.isArray(keyframesOverride)) {
            updatedElement = {
              ...updatedElement,
              content: { ...updatedElement.content, locationKeyframes: keyframesOverride },
            };
          }
        } catch (e) {
          console.warn('Failed to parse locationKeyframes override:', e);
        }
      }

      // Check by element name (case-insensitive, with underscore normalization)
      const elementNameLower = element.name?.toLowerCase().replace(/\s+/g, '_');
      for (const [key, value] of Object.entries(contentOverrides)) {
        const keyLower = key.toLowerCase().replace(/\s+/g, '_');
        if (elementNameLower === keyLower || element.name === key) {
          if (element.content?.type === 'text') {
            updatedElement = {
              ...updatedElement,
              content: { ...updatedElement.content, text: value },
            };
          } else if (element.content?.type === 'image') {
            updatedElement = {
              ...updatedElement,
              content: { ...updatedElement.content, src: value, url: value },
            };
          } else if (element.content?.type === 'icon') {
            updatedElement = {
              ...updatedElement,
              content: { ...updatedElement.content, iconName: value },
            };
          } else if (element.content?.type === 'map') {
            // Parse "lat, lng" format and convert to [lng, lat] array
            const coordStr = String(value);
            const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              const [lat, lng] = parts;
              updatedElement = {
                ...updatedElement,
                content: { ...updatedElement.content, center: [lng, lat] as [number, number] },
              };
            }
          }
        }
      }

      // Special handling for 'icon' key - apply to icon elements
      if (contentOverrides['icon'] !== undefined && element.content?.type === 'icon') {
        updatedElement = {
          ...updatedElement,
          content: { ...updatedElement.content, iconName: contentOverrides['icon'] },
        };
      }

      return updatedElement;
    });
  }, [elements, contentOverrides]);

  // Get all visible elements (from all visible templates, sorted by z-index)
  const visibleElements = useMemo(() => {
    const templateIds = new Set(visibleTemplates.map(t => t.id));
    return elementsWithOverrides
      .filter(e => templateIds.has(e.template_id) && e.visible !== false && !e.parent_element_id)
      .sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
  }, [elementsWithOverrides, visibleTemplates]);

  // Get animations for current phase and visible elements
  const currentAnimations = useMemo(() => {
    const visibleElementIds = new Set(visibleElements.map(e => e.id));
    // Also include child elements
    const allRelatedElements = elementsWithOverrides.filter(e =>
      visibleElementIds.has(e.id) ||
      (e.parent_element_id && visibleElementIds.has(e.parent_element_id))
    );
    const allIds = new Set(allRelatedElements.map(e => e.id));

    return animations.filter(
      (a) => currentPhase === a.phase && allIds.has(a.element_id)
    );
  }, [animations, currentPhase, visibleElements, elementsWithOverrides]);

  // Calculate max duration - includes both regular animations and map location keyframes
  const maxDuration = useMemo(() => {
    // Get max from regular animations
    const maxAnim = Math.max(0, ...currentAnimations.map((a) => a.delay + a.duration));

    // Get max from map location keyframes for current phase
    let maxMapKeyframe = 0;
    visibleElements.forEach(element => {
      if (element.content?.type === 'map' && element.content.locationKeyframes) {
        const keyframes = element.content.locationKeyframes as Array<{ time: number; phase?: string }>;
        const phaseKeyframes = keyframes.filter(kf => (kf.phase || 'in') === currentPhase);
        if (phaseKeyframes.length > 0) {
          const maxKfTime = Math.max(...phaseKeyframes.map(kf => kf.time));
          maxMapKeyframe = Math.max(maxMapKeyframe, maxKfTime);
        }
      }
    });

    return Math.max(1000, maxAnim, maxMapKeyframe);
  }, [currentAnimations, visibleElements, currentPhase]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setPlayheadPosition((prev) => {
        const newPosition = prev + delta;
        if (newPosition >= maxDuration) {
          if (isLooping) {
            return 0;
          } else {
            setIsPlaying(false);
            return maxDuration;
          }
        }
        return newPosition;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, maxDuration, isLooping]);

  // Reset when phase changes
  useEffect(() => {
    setPlayheadPosition(0);
    lastTimeRef.current = 0;
  }, [currentPhase]);

  // Track window size for fullscreen scaling
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'i' || e.key === 'I') {
        setCurrentPhase('in');
        setPlayheadPosition(0);
        setIsPlaying(true);
      } else if (e.key === 'l' || e.key === 'L') {
        setCurrentPhase('loop');
        setPlayheadPosition(0);
        setIsPlaying(true);
      } else if (e.key === 'o' || e.key === 'O') {
        setCurrentPhase('out');
        setPlayheadPosition(0);
        setIsPlaying(true);
      } else if (e.key === 'r' || e.key === 'R') {
        setPlayheadPosition(0);
        lastTimeRef.current = 0;
      } else if (e.key === 'Escape') {
        setIsPlaying(false);
        setPlayheadPosition(0);
        setShowSelector(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // PostMessage handler for external control (from Pulsar GFX)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate message structure
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.source !== 'pulsar-gfx') return;

      const { type, payload } = event.data;
      console.log('Preview received message:', type, payload);

      switch (type) {
        case 'loadData':
          // Load full preview data from Pulsar (cross-origin compatible)
          if (payload && typeof payload === 'object') {
            console.log('Preview received loadData:', payload);
            // Debug: Log element types
            const elements = (payload as PreviewData).elements || [];
            console.log('Preview elements received:', elements.map((e: Element) => ({
              id: e.id,
              name: e.name,
              element_type: e.element_type,
              content_type: e.content?.type,
              content: e.content
            })));
            setLocalData(payload as PreviewData);
          }
          break;

        case 'updateContent':
          // Update content overrides for real-time preview
          if (payload && typeof payload === 'object') {
            setContentOverrides(payload);
          }
          break;

        case 'playIn':
          setCurrentPhase('in');
          setPlayheadPosition(0);
          lastTimeRef.current = 0;
          setIsPlaying(true);
          break;

        case 'playOut':
          setCurrentPhase('out');
          setPlayheadPosition(0);
          lastTimeRef.current = 0;
          setIsPlaying(true);
          break;

        case 'playLoop':
          setCurrentPhase('loop');
          setPlayheadPosition(0);
          lastTimeRef.current = 0;
          setIsPlaying(true);
          break;

        case 'stop':
          setIsPlaying(false);
          break;

        case 'reset':
          setIsPlaying(false);
          setPlayheadPosition(0);
          lastTimeRef.current = 0;
          setCurrentPhase('in');
          break;

        case 'setTemplate': {
          // Handle template change with optional mode
          if (payload?.mode) {
            setPreviewMode(payload.mode);
          }
          if (payload?.mode === 'composite') {
            setSelectedTemplateId('all');
            setSelectedLayerId('all');
          } else if (payload?.templateId) {
            // Get current templates to verify the template exists (use ref for current value)
            const currentTemplates = localDataRef.current?.templates || [];
            const templateExists = currentTemplates.some(t => t.id === payload.templateId);
            console.log('[Preview] Setting template to:', payload.templateId,
              'exists:', templateExists,
              'available templates:', currentTemplates.map(t => ({ id: t.id, name: t.name })));

            setSelectedTemplateId(payload.templateId);
            // Reset layer filter to 'all' so the template isn't filtered out
            // by a previously selected layer
            setSelectedLayerId('all');
          }
          break;
        }

        case 'setMode':
          // Handle mode change
          if (payload?.mode) {
            setPreviewMode(payload.mode);
            if (payload.mode === 'composite') {
              setSelectedTemplateId('all');
            } else if (payload.templateId) {
              setSelectedTemplateId(payload.templateId);
            }
          }
          break;

        default:
          console.log('Unknown message type:', type);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const canvasWidth = currentProject?.canvas_width || 1920;
  const canvasHeight = currentProject?.canvas_height || 1080;

  // Get templates for dropdown organized by layer
  const templatesByLayer = useMemo(() => {
    const result: { layer: Layer; templates: Template[] }[] = [];
    enabledLayers.forEach(layer => {
      const layerTemplates = templates.filter(t => t.layer_id === layer.id && t.enabled !== false);
      if (layerTemplates.length > 0) {
        result.push({ layer, templates: layerTemplates });
      }
    });
    return result;
  }, [enabledLayers, templates]);

  if (visibleElements.length === 0 && templates.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white/50">
          <p className="text-lg mb-2">No templates available</p>
          <p className="text-sm">Open the designer to create a template first</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-lg transition-colors"
          >
            Go to Designer
          </button>
        </div>
      </div>
    );
  }

  // OBS Mode - clean, fullscreen, no UI - stretched to fill viewport
  if (obsMode) {
    return (
      <div
        className="w-screen h-screen overflow-hidden"
        style={{
          backgroundColor: bgColor,
        }}
      >
        {/* Inner container that scales content from canvas size to viewport size */}
        <div
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${windowSize.width / canvasWidth}, ${windowSize.height / canvasHeight})`,
            transformOrigin: 'top left',
          }}
        >
          {/* Render all visible elements */}
          {visibleElements.map((element) => (
            <PreviewElement
              key={element.id}
              element={element}
              allElements={elementsWithOverrides}
              animations={animations}
              keyframes={keyframes}
              playheadPosition={playheadPosition}
              currentPhase={currentPhase}
              isPlaying={isPlaying}
            />
          ))}
        </div>
      </div>
    );
  }

  // Normal Preview Mode with controls - fullscreen stretched
  return (
    <div 
      className="w-screen h-screen overflow-hidden"
      style={{ backgroundColor: bgColor === 'transparent' ? '#000' : bgColor }}
    >
      {/* Preview Canvas - stretched to fill entire viewport */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: bgColor,
        }}
      >
        {/* Inner container that scales content from canvas size to viewport size */}
        <div
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${windowSize.width / canvasWidth}, ${windowSize.height / canvasHeight})`,
            transformOrigin: 'top left',
          }}
        >
          {/* Render all visible elements */}
          {visibleElements.map((element) => (
            <PreviewElement
              key={element.id}
              element={element}
              allElements={elementsWithOverrides}
              animations={animations}
              keyframes={keyframes}
              playheadPosition={playheadPosition}
              currentPhase={currentPhase}
              isPlaying={isPlaying}
            />
          ))}
        </div>
      </div>

      {/* Layer/Template Selector Dropdown */}
      {showSelector && (
        <div 
          className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-lg rounded-xl border border-white/10 shadow-2xl z-50 min-w-[300px] max-h-[70vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b border-white/10">
            <h3 className="text-white font-medium text-sm">Select Layer / Template</h3>
          </div>
          <div className="p-2">
            {/* All option */}
            <button
              onClick={() => {
                setSelectedLayerId('all');
                setSelectedTemplateId('all');
                setShowSelector(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedLayerId === 'all' && selectedTemplateId === 'all'
                  ? 'bg-violet-500 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              ✓ All Layers & Templates
            </button>
            
            <div className="h-px bg-white/10 my-2" />
            
            {/* Layers and their templates */}
            {templatesByLayer.map(({ layer, templates: layerTemplates }) => (
              <div key={layer.id} className="mb-2">
                <button
                  onClick={() => {
                    setSelectedLayerId(layer.id);
                    setSelectedTemplateId('all');
                    setShowSelector(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedLayerId === layer.id && selectedTemplateId === 'all'
                      ? 'bg-violet-500/80 text-white'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  {layer.name}
                  <span className="text-white/40 text-xs ml-auto">{layerTemplates.length}</span>
                </button>
                
                {/* Templates in this layer */}
                <div className="ml-4 mt-1 space-y-1">
                  {layerTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setSelectedLayerId(layer.id);
                        setSelectedTemplateId(template.id);
                        setShowSelector(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                        selectedTemplateId === template.id
                          ? 'bg-violet-500 text-white'
                          : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Click overlay to close selector */}
      {showSelector && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSelector(false)} 
        />
      )}

      {/* Controls Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-lg rounded-xl px-4 py-2 flex items-center gap-4 text-white border border-white/10 z-30">
        {/* Back to Designer */}
        <button
          onClick={() => navigate('/')}
          className="p-2 text-white/60 hover:text-white rounded-lg transition-colors hover:bg-white/10"
          title="Back to Designer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div className="w-px h-6 bg-white/20" />

        {/* Layer/Template Selector */}
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span className="max-w-[150px] truncate">
            {selectedLayerId === 'all' && selectedTemplateId === 'all'
              ? 'All'
              : selectedTemplateId !== 'all'
                ? templates.find(t => t.id === selectedTemplateId)?.name || 'Template'
                : layers.find(l => l.id === selectedLayerId)?.name || 'Layer'
            }
          </span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="w-px h-6 bg-white/20" />

        {/* Phase Selector */}
        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
          {(['in', 'loop', 'out'] as AnimationPhase[]).map((phase) => (
            <button
              key={phase}
              onClick={() => {
                setCurrentPhase(phase);
                setPlayheadPosition(0);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                currentPhase === phase
                  ? phase === 'in'
                    ? 'bg-emerald-500 text-white'
                    : phase === 'loop'
                    ? 'bg-violet-500 text-white'
                    : 'bg-amber-500 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {phase.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Play/Pause */}
        <button
          onClick={() => {
            if (!isPlaying) {
              setPlayheadPosition(0);
              lastTimeRef.current = 0;
            }
            setIsPlaying(!isPlaying);
          }}
          className="w-10 h-10 rounded-full bg-violet-500 hover:bg-violet-400 flex items-center justify-center transition-colors"
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Loop Toggle */}
        <button
          onClick={() => setIsLooping(!isLooping)}
          className={`p-2 rounded-lg transition-colors ${
            isLooping ? 'bg-violet-500/30 text-violet-400' : 'text-white/60 hover:text-white'
          }`}
          title="Loop"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* Time Display */}
        <div className="text-sm font-mono text-white/60 min-w-[100px]">
          {(playheadPosition / 1000).toFixed(1)}s / {(maxDuration / 1000).toFixed(1)}s
        </div>

        {/* Reset */}
        <button
          onClick={() => {
            setPlayheadPosition(0);
            lastTimeRef.current = 0;
          }}
          className="p-2 text-white/60 hover:text-white rounded-lg transition-colors"
          title="Reset (R)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>

        {/* Help */}
        <div className="text-[10px] text-white/40 ml-2 border-l border-white/20 pl-4">
          <span className="mr-3"><kbd className="bg-white/20 px-1 rounded">I</kbd> IN</span>
          <span className="mr-3"><kbd className="bg-white/20 px-1 rounded">L</kbd> LOOP</span>
          <span className="mr-3"><kbd className="bg-white/20 px-1 rounded">O</kbd> OUT</span>
          <span><kbd className="bg-white/20 px-1 rounded">Space</kbd> Play</span>
        </div>
      </div>

      {/* Info overlay showing what's being previewed */}
      <div className="fixed top-4 right-4 text-white/40 text-xs z-20">
        {visibleTemplates.length} template{visibleTemplates.length !== 1 ? 's' : ''} • {visibleElements.length} element{visibleElements.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// Preview Element - renders a single element with animations
interface PreviewElementProps {
  element: Element;
  allElements: Element[];
  animations: Animation[];
  keyframes: Keyframe[];
  playheadPosition: number;
  currentPhase: AnimationPhase;
  isPlaying: boolean;
}

function PreviewElement({
  element,
  allElements,
  animations,
  keyframes,
  playheadPosition,
  currentPhase,
  isPlaying,
}: PreviewElementProps) {
  // Calculate animated properties
  const animatedProps = useMemo(() => {
    return getAnimatedProperties(element, animations, keyframes, playheadPosition, currentPhase);
  }, [element, animations, keyframes, playheadPosition, currentPhase]);

  // Get children
  const children = allElements
    .filter((e) => e.parent_element_id === element.id && e.visible !== false)
    .sort((a, b) => (a.z_index || a.sort_order || 0) - (b.z_index || b.sort_order || 0));

  // Handle animated properties
  const animatedOpacity = animatedProps.opacity !== undefined 
    ? Number(animatedProps.opacity) 
    : element.opacity;
  
  const animatedX = animatedProps.position_x !== undefined 
    ? Number(animatedProps.position_x) 
    : element.position_x;
  const animatedY = animatedProps.position_y !== undefined 
    ? Number(animatedProps.position_y) 
    : element.position_y;
  
  const animatedRotation = animatedProps.rotation !== undefined 
    ? Number(animatedProps.rotation) 
    : element.rotation;
  
  const animatedScaleX = animatedProps.scale_x !== undefined 
    ? Number(animatedProps.scale_x) 
    : element.scale_x;
  const animatedScaleY = animatedProps.scale_y !== undefined 
    ? Number(animatedProps.scale_y) 
    : element.scale_y;
  
  const animatedWidth = animatedProps.width !== undefined 
    ? Number(animatedProps.width) 
    : element.width;
  const animatedHeight = animatedProps.height !== undefined 
    ? Number(animatedProps.height) 
    : element.height;
  
  const baseTransform = `rotate(${animatedRotation}deg) scale(${animatedScaleX}, ${animatedScaleY})`;
  const animatedTransform = animatedProps.transform 
    ? `${baseTransform} ${animatedProps.transform}` 
    : baseTransform;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: animatedX,
    top: animatedY,
    width: animatedWidth ?? 'auto',
    height: animatedHeight ?? 'auto',
    transform: animatedTransform,
    transformOrigin: `${element.anchor_x * 100}% ${element.anchor_y * 100}%`,
    opacity: animatedOpacity,
    zIndex: element.z_index || 0,
    ...element.styles,
    ...Object.fromEntries(
      Object.entries(animatedProps).filter(([key]) => 
        !['opacity', 'position_x', 'position_y', 'rotation', 'scale_x', 'scale_y', 'width', 'height', 'transform'].includes(key)
      )
    ),
  };

  // Render content based on type
  const renderContent = () => {
    switch (element.content.type) {
      case 'text': {
        // Apply text-specific styles from element.styles (textShadow, fontWeight, etc.)
        const textContent = element.content;
        const verticalAlign = element.styles?.verticalAlign || 'middle';
        const alignItemsMap: Record<string, string> = {
          top: 'flex-start',
          middle: 'center',
          bottom: 'flex-end',
        };

        // Build text style with proper flex alignment for vertical positioning
        const textAlign = element.styles?.textAlign || 'left';
        const { verticalAlign: _, textAlign: __, ...otherStyles } = element.styles || {};

        const textStyle: React.CSSProperties = {
          whiteSpace: 'pre-wrap',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: alignItemsMap[verticalAlign] || 'center',
          justifyContent: textAlign === 'center' ? 'center' :
                         textAlign === 'right' ? 'flex-end' : 'flex-start',
          ...otherStyles,
          lineHeight: element.styles?.lineHeight || '1.2',
          textAlign: textAlign as React.CSSProperties['textAlign'],
        };

        // Calculate animation duration from keyframes or default
        const elementAnimations = animations.filter(a => a.element_id === element.id);
        const animationDuration = elementAnimations.reduce((max, a) => Math.max(max, (a.duration || 1000)), 1000);

        // Merge keyframe animation properties
        type TextAnimationType = 'fade' | 'slide' | 'scale' | 'blur' | 'glow' | 'typewriter' | 'wave' | 'bounce' | 'custom';
        const mergedAnimation = textContent.animation ? {
          ...textContent.animation,
          type: ((animatedProps.textAnimationType as string) || textContent.animation.type) as TextAnimationType | undefined,
          duration: (animatedProps.textAnimationDuration as number) ?? textContent.animation.duration,
          delay: (animatedProps.textAnimationDelay as number) ?? textContent.animation.delay,
          easing: (animatedProps.textAnimationEasing as string) || textContent.animation.easing,
          direction: (animatedProps.textAnimationDirection as 'in' | 'out' | 'in-out') || textContent.animation.direction,
        } : undefined;

        return (
          <TextElement
            text={textContent.text || ''}
            animation={mergedAnimation as Parameters<typeof TextElement>[0]['animation']}
            style={textStyle}
            isPlaying={isPlaying}
            playheadPosition={playheadPosition}
            animationDuration={animationDuration}
            animatedProps={animatedProps}
          />
        );
      }

      case 'image':
        return (
          <ImageElement
            content={element.content}
            width={element.width}
            height={element.height}
            elementId={element.id}
            elementName={element.name}
            isSelected={false}
            isPreview={true}
            style={element.styles}
          />
        );

      case 'shape': {
        // Apply animated backgroundColor (which could come from 'fill' keyframe property)
        const animatedBgColor = animatedProps.backgroundColor;
        // Cast to extended type that includes glow (which exists in the actual data but not in the strict type)
        const shapeContent = element.content as typeof element.content & {
          glow?: {
            enabled: boolean;
            color?: string;
            blur?: number;
            spread?: number;
            intensity?: number;
          };
        };
        const glass = shapeContent.glass;
        const gradient = shapeContent.gradient;
        const glow = shapeContent.glow;

        // Calculate gradient value
        const gradientValue = (() => {
          if (!gradient?.enabled || !gradient.colors || gradient.colors.length < 2) {
            return null;
          }

          const colorStops = [...gradient.colors]
            .sort((a: { stop: number }, b: { stop: number }) => a.stop - b.stop)
            .map((c: { color: string; stop: number }) => `${c.color} ${c.stop}%`)
            .join(', ');

          if (gradient.type === 'linear') {
            const angle = gradient.direction || 0;
            return `linear-gradient(${angle}deg, ${colorStops})`;
          } else if (gradient.type === 'radial') {
            const pos = gradient.radialPosition || { x: 50, y: 50 };
            return `radial-gradient(circle at ${pos.x}% ${pos.y}%, ${colorStops})`;
          } else if (gradient.type === 'conic') {
            const angle = gradient.direction || 0;
            return `conic-gradient(from ${angle}deg, ${colorStops})`;
          }
          return null;
        })();

        // Calculate glass styles
        const glassStyles: React.CSSProperties = (() => {
          if (!glass?.enabled) return {};

          const fillColor = shapeContent.fill || '#000000';
          const glassOpacity = glass.opacity !== undefined ? glass.opacity : 0.6;

          // Determine border: respect 0 as "no border"
          const getBorder = () => {
            if (glass.borderWidth === 0) {
              return 'none';
            }
            if (glass.borderWidth !== undefined && glass.borderWidth > 0 && glass.borderColor) {
              return `${glass.borderWidth}px solid ${glass.borderColor}`;
            }
            if (glass.borderWidth !== undefined && glass.borderWidth > 0) {
              return `${glass.borderWidth}px solid rgba(255, 255, 255, 0.1)`;
            }
            return '1px solid rgba(255, 255, 255, 0.1)';
          };

          return {
            backgroundColor: colorToRgba(fillColor, glassOpacity),
            backdropFilter: glass.blur !== undefined
              ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
              : 'blur(16px)',
            WebkitBackdropFilter: glass.blur !== undefined
              ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
              : 'blur(16px)',
            border: getBorder(),
          };
        })();

        // Calculate glow style
        const glowStyle: React.CSSProperties = (() => {
          if (!glow?.enabled) return {};

          const glowColor = glow.color || shapeContent.fill || '#8B5CF6';
          const blur = glow.blur ?? 20;
          const spread = glow.spread ?? 0;
          const intensity = glow.intensity ?? 0.6;

          // Convert color to rgba with intensity
          let colorWithAlpha = glowColor;
          if (glowColor.startsWith('#')) {
            const hex = glowColor.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            colorWithAlpha = `rgba(${r}, ${g}, ${b}, ${intensity})`;
          } else if (glowColor.startsWith('rgb(')) {
            const match = glowColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
              colorWithAlpha = `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${intensity})`;
            }
          }

          return {
            boxShadow: `0 0 ${blur}px ${spread}px ${colorWithAlpha}`,
          };
        })();

        // Determine background color/value
        const bgColorValue = typeof animatedBgColor === 'string'
          ? animatedBgColor
          : (shapeContent.fill || 'transparent');

        // Build base style
        const baseStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          borderRadius: shapeContent.shape === 'ellipse' ? '50%' : shapeContent.cornerRadius || 0,
        };

        // If both glass and gradient are enabled, use wrapper div approach
        if (glass?.enabled && gradientValue) {
          // Determine border
          const getBorder = () => {
            if (glass.borderWidth !== undefined && glass.borderWidth > 0 && glass.borderColor) {
              return `${glass.borderWidth}px solid ${glass.borderColor}`;
            }
            if (glass.borderWidth !== undefined && glass.borderWidth > 0) {
              return `${glass.borderWidth}px solid rgba(255, 255, 255, 0.1)`;
            }
            if (glass.borderWidth === 0) {
              return 'none';
            }
            if (shapeContent.stroke && shapeContent.strokeWidth && shapeContent.strokeWidth > 0) {
              return `${shapeContent.strokeWidth}px solid ${shapeContent.stroke}`;
            }
            return '1px solid rgba(255, 255, 255, 0.1)';
          };

          const outerStyle: React.CSSProperties = {
            ...baseStyle,
            background: gradientValue,
            position: 'relative',
            overflow: 'hidden',
            border: getBorder(),
            ...glowStyle,
            ...(element.styles || {}),
          };

          const glassOpacity = glass.opacity !== undefined ? glass.opacity : 0.3;
          const innerStyle: React.CSSProperties = {
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(255, 255, 255, ${glassOpacity * 0.1})`,
            backdropFilter: glass.blur !== undefined
              ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
              : 'blur(16px)',
            WebkitBackdropFilter: glass.blur !== undefined
              ? `blur(${glass.blur}px)${glass.saturation !== undefined ? ` saturate(${glass.saturation}%)` : ''}`
              : 'blur(16px)',
            borderRadius: 'inherit',
          };

          return (
            <div style={outerStyle}>
              <div style={innerStyle} />
            </div>
          );
        }

        // If only glass is enabled
        if (glass?.enabled) {
          const glassStyleFinal: React.CSSProperties = {
            ...baseStyle,
            ...glassStyles,
            ...(!glass.borderWidth && shapeContent.stroke && shapeContent.strokeWidth && shapeContent.strokeWidth > 0 ? {
              border: `${shapeContent.strokeWidth}px solid ${shapeContent.stroke}`,
            } : {}),
            ...glowStyle,
            ...(element.styles || {}),
          };
          return <div style={glassStyleFinal} />;
        }

        // If only gradient is enabled
        if (gradientValue) {
          const gradientStyleFinal: React.CSSProperties = {
            ...baseStyle,
            background: gradientValue,
            ...(shapeContent.stroke && shapeContent.strokeWidth && shapeContent.strokeWidth > 0 ? {
              border: `${shapeContent.strokeWidth}px solid ${shapeContent.stroke}`,
            } : {}),
            ...glowStyle,
            ...(element.styles || {}),
          };
          return <div style={gradientStyleFinal} />;
        }

        // Default: solid color
        const solidStyle: React.CSSProperties = {
          ...baseStyle,
          backgroundColor: bgColorValue,
          ...(shapeContent.stroke && shapeContent.strokeWidth && shapeContent.strokeWidth > 0 ? {
            border: `${shapeContent.strokeWidth}px solid ${shapeContent.stroke}`,
          } : {}),
          ...glowStyle,
          ...(element.styles || {}),
          ...(animatedBgColor ? {
            backgroundColor: bgColorValue,
          } : {}),
        };

        return <div style={solidStyle} />;
      }

      case 'chart':
        return (
          <ChartElement
            chartType={element.content.chartType}
            data={element.content.data}
            options={element.content.options}
            width={animatedWidth || 400}
            height={animatedHeight || 300}
          />
        );

      case 'map':
        // Apply animated map properties
        const mapContent = element.content as {
          type: 'map';
          center?: [number, number];
          zoom?: number;
          pitch?: number;
          bearing?: number;
          [key: string]: unknown;
        };

        // Check if we have location keyframes for flight path animation
        const hasLocationKeyframes = mapContent.locationKeyframes && (mapContent.locationKeyframes as any[]).length >= 2;

        // Check if any map properties are animated via regular keyframes
        const hasAnimatedMapProps = animatedProps.mapCenter !== undefined ||
          animatedProps.mapCenterLng !== undefined ||
          animatedProps.mapCenterLat !== undefined ||
          animatedProps.mapZoom !== undefined ||
          animatedProps.mapPitch !== undefined ||
          animatedProps.mapBearing !== undefined;

        // Get animated center
        let centerLng = mapContent.center?.[0] ?? 0;
        let centerLat = mapContent.center?.[1] ?? 0;

        if (animatedProps.mapCenter !== undefined) {
          const centerStr = String(animatedProps.mapCenter);
          const [lng, lat] = centerStr.split(',').map(v => parseFloat(v.trim()) || 0);
          if (!isNaN(lng) && !isNaN(lat)) {
            centerLng = lng;
            centerLat = lat;
          }
        } else {
          if (animatedProps.mapCenterLng !== undefined) {
            centerLng = Number(animatedProps.mapCenterLng);
          }
          if (animatedProps.mapCenterLat !== undefined) {
            centerLat = Number(animatedProps.mapCenterLat);
          }
        }

        const animatedMapContent = {
          ...mapContent,
          center: [centerLng, centerLat] as [number, number],
          zoom: animatedProps.mapZoom !== undefined
            ? Number(animatedProps.mapZoom)
            : (mapContent.zoom ?? 10),
          pitch: animatedProps.mapPitch !== undefined
            ? Number(animatedProps.mapPitch)
            : (mapContent.pitch ?? 0),
          bearing: animatedProps.mapBearing !== undefined
            ? Number(animatedProps.mapBearing)
            : (mapContent.bearing ?? 0),
        };

        return (
          <MapElement
            content={animatedMapContent}
            width={animatedWidth}
            height={animatedHeight}
            interactive={false}
            isPlaying={isPlaying}
            isAnimated={hasAnimatedMapProps || hasLocationKeyframes}
            playheadPosition={playheadPosition}
            currentPhase={currentPhase}
          />
        );

      case 'video':
        return (
          <VideoElement
            content={element.content}
            width={animatedWidth}
            height={animatedHeight}
            isPreview={true}
          />
        );

      case 'svg':
        return (
          <SVGElement
            content={element.content}
            width={element.width}
            height={element.height}
            elementId={element.id}
            isSelected={false}
          />
        );

      case 'icon': {
        // Extract shadow from element.styles and convert to filter for icon shape
        const iconShadow = element.styles?.boxShadow;
        const iconFilter = iconShadow && typeof iconShadow === 'string'
          ? convertBoxShadowToFilter(iconShadow)
          : undefined;
        return (
          <IconElement
            content={element.content}
            width={element.width}
            height={element.height}
            isSelected={false}
            filter={iconFilter}
          />
        );
      }

      case 'line':
        return (
          <LineElement
            content={element.content}
            width={element.width}
            height={element.height}
          />
        );

      case 'table':
        return (
          <TableElement
            content={element.content}
            width={element.width}
            height={element.height}
            isSelected={false}
          />
        );

      case 'ticker':
        return (
          <TickerElement
            items={element.content.items || []}
            config={element.content.config || {}}
            className="w-full h-full"
          />
        );

      case 'topic-badge':
        return (
          <TopicBadgeElement
            linkedTickerId={element.content.linkedTickerId}
            defaultTopic={element.content.defaultTopic}
            customLabel={element.content.customLabel}
            customStyle={element.content.customStyle}
            showIcon={element.content.showIcon ?? true}
            animated={element.content.animated ?? true}
            className="w-full h-full"
          />
        );

      case 'countdown':
        return (
          <CountdownElement
            config={element.content}
            className="w-full h-full"
            isPlaying={isPlaying}
          />
        );

      case 'group':
      case 'div': {
        // Render a styled container - useful for backgrounds with glass effects
        const containerStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          // Apply all styles from element.styles (glass, shadows, gradients, etc.)
          ...element.styles,
        };
        return <div style={containerStyle} />;
      }

      default:
        console.warn('Unknown element content type:', element.content?.type, 'for element:', element.name, element);
        return null;
    }
  };

  return (
    <div style={style}>
      {renderContent()}
      {children.map((child) => (
        <PreviewElement
          key={child.id}
          element={child}
          allElements={allElements}
          animations={animations}
          keyframes={keyframes}
          playheadPosition={playheadPosition}
          currentPhase={currentPhase}
          isPlaying={isPlaying}
        />
      ))}
    </div>
  );
}

export default Preview;
