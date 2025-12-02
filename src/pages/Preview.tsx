import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDesignerStore } from '@/stores/designerStore';
import { getAnimatedProperties } from '@/lib/animation';
import { ChartElement } from '@/components/canvas/ChartElement';
import { MapElement } from '@/components/canvas/MapElement';
import { VideoElement } from '@/components/canvas/VideoElement';
import type { Element, Animation, Keyframe, Template, Project, AnimationPhase, Layer } from '@/types';

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
  
  // OBS Mode - clean overlay without controls
  const obsMode = searchParams.get('obs') === '1' || searchParams.get('obs') === 'true';
  // Auto-play in OBS mode
  const autoPlay = searchParams.get('autoplay') === '1' || obsMode;
  // Phase to show (default: loop for OBS, in for normal)
  const initialPhase = (searchParams.get('phase') as 'in' | 'loop' | 'out') || (obsMode ? 'loop' : 'in');
  
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

  // Selection state - "all" means show all enabled layers/templates
  const [selectedLayerId, setSelectedLayerId] = useState<string | 'all'>(layerIdParam || 'all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | 'all'>(templateIdParam || 'all');
  const [showSelector, setShowSelector] = useState(false);

  // Playback state - use URL params for initial values
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentPhase, setCurrentPhase] = useState<AnimationPhase>(initialPhase);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isLooping, setIsLooping] = useState(obsMode); // Auto-loop in OBS mode
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

  // Get all visible elements (from all visible templates, sorted by z-index)
  const visibleElements = useMemo(() => {
    const templateIds = new Set(visibleTemplates.map(t => t.id));
    return elements
      .filter(e => templateIds.has(e.template_id) && e.visible !== false && !e.parent_element_id)
      .sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
  }, [elements, visibleTemplates]);

  // Get animations for current phase and visible elements
  const currentAnimations = useMemo(() => {
    const visibleElementIds = new Set(visibleElements.map(e => e.id));
    // Also include child elements
    const allRelatedElements = elements.filter(e => 
      visibleElementIds.has(e.id) || 
      (e.parent_element_id && visibleElementIds.has(e.parent_element_id))
    );
    const allIds = new Set(allRelatedElements.map(e => e.id));
    
    return animations.filter(
      (a) => currentPhase === a.phase && allIds.has(a.element_id)
    );
  }, [animations, currentPhase, visibleElements, elements]);

  // Calculate max duration
  const maxDuration = useMemo(() => {
    const maxAnim = Math.max(0, ...currentAnimations.map((a) => a.delay + a.duration));
    return Math.max(1000, maxAnim);
  }, [currentAnimations]);

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
          backgroundColor: 'transparent',
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
              allElements={elements}
              animations={animations}
              keyframes={keyframes}
              playheadPosition={playheadPosition}
              currentPhase={currentPhase}
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
              allElements={elements}
              animations={animations}
              keyframes={keyframes}
              playheadPosition={playheadPosition}
              currentPhase={currentPhase}
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
}

function PreviewElement({
  element,
  allElements,
  animations,
  keyframes,
  playheadPosition,
  currentPhase,
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
      case 'text':
        return <span style={{ whiteSpace: 'pre-wrap' }}>{element.content.text}</span>;

      case 'image':
        return element.content.src ? (
          <img
            src={element.content.src}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: element.content.fit || 'cover',
            }}
            draggable={false}
          />
        ) : null;

      case 'shape':
        const animatedBgColor = animatedProps.backgroundColor;
        const shapeStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          backgroundColor: (typeof animatedBgColor === 'string' ? animatedBgColor : undefined) ?? element.content.fill ?? 'transparent',
          border: element.content.stroke ? `2px solid ${element.content.stroke}` : undefined,
          borderRadius: element.content.shape === 'ellipse' ? '50%' : element.content.cornerRadius || 0,
        };
        return <div style={shapeStyle} />;

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
        return (
          <MapElement
            content={element.content}
            width={animatedWidth}
            height={animatedHeight}
            interactive={false}
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

      case 'group':
      case 'div':
      default:
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
        />
      ))}
    </div>
  );
}

export default Preview;
