import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDesignerStore } from '@/stores/designerStore';
import { getAnimatedProperties } from '@/lib/animation';
import { loadFonts, SYSTEM_FONTS } from '@/lib/fonts';
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
import { InteractiveElement } from '@/components/canvas/InteractiveElement';
import { FpsCounter } from '@/components/canvas/FpsCounter';
import { useInteractiveStore, createInteractionEvent } from '@/lib/interactive';
import type { Element, Animation, Keyframe, Template, Project, AnimationPhase, Layer, Binding } from '@emergent-platform/types';
import type { Node, Edge } from '@xyflow/react';
import { resolveElementBindings, shouldHideElement } from '@/lib/bindingResolver';

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
  phaseDurations?: Record<AnimationPhase, number>;
  // Data binding context for resolving {{...}} placeholders
  bindings?: Binding[];
  dataPayload?: Record<string, unknown>[];
  currentRecordIndex?: number;
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

  // Check if embedded by Pulsar GFX (has project param) - if so, wait for postMessage data
  const embeddedProjectId = searchParams.get('project');
  const isEmbeddedByPulsar = !!embeddedProjectId;
  
  // Try to get data from store first
  const storeData = useDesignerStore((state) => ({
    layers: state.layers,
    templates: state.templates,
    elements: state.elements,
    animations: state.animations,
    keyframes: state.keyframes,
    currentProject: state.project,
    phaseDurations: state.phaseDurations,
  }));

  // Get setters for syncing localStorage data to designer store (for visual node runtime)
  const { setTemplates: setDesignerTemplates, setElements: setDesignerElements, setLayers: setDesignerLayers } = useDesignerStore();

  // Load from localStorage if store is empty (new window case)
  const [localData, setLocalData] = useState<PreviewData | null>(null);

  // Content overrides from postMessage (for real-time updates)
  const [contentOverrides, setContentOverrides] = useState<Record<string, any>>({});

  // Ref to track current localData for use in event handlers (avoids stale closure)
  const localDataRef = useRef<PreviewData | null>(null);
  useEffect(() => {
    localDataRef.current = localData;
  }, [localData]);

  // Ref to track current templates array (whichever source is being used)
  const templatesRef = useRef<Template[]>([]);

  useEffect(() => {
    // If embedded by Pulsar GFX, skip localStorage loading - wait for postMessage data
    if (isEmbeddedByPulsar) {
      console.log('[Preview] Embedded by Pulsar GFX, waiting for postMessage data for project:', embeddedProjectId);
      return;
    }

    // Check if store has data
    if (storeData.templates.length === 0) {
      // Try to load from localStorage (only for standalone Nova GFX preview)
      const savedData = localStorage.getItem('nova-preview-data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setLocalData(parsed);
          console.log('Preview loaded from localStorage:', parsed);

          // Sync to designer store for visual node runtime access
          if (parsed.templates?.length > 0) {
            setDesignerTemplates(parsed.templates);
            console.log('[Preview] Synced templates to designer store:', parsed.templates.length);
          }
          if (parsed.elements?.length > 0) {
            setDesignerElements(parsed.elements);
            console.log('[Preview] Synced elements to designer store:', parsed.elements.length);
          }
          if (parsed.layers?.length > 0) {
            setDesignerLayers(parsed.layers);
            console.log('[Preview] Synced layers to designer store:', parsed.layers.length);
          }
        } catch (e) {
          console.error('Failed to parse preview data:', e);
        }
      }
    }
  }, [storeData.templates.length, setDesignerTemplates, setDesignerElements, setDesignerLayers, isEmbeddedByPulsar, embeddedProjectId]);

  // Use store data if available, otherwise use localStorage data
  // IMPORTANT: When embedded by Pulsar, ONLY use data from postMessage (localData), never from Nova's store
  const layers = isEmbeddedByPulsar
    ? (localData?.layers || [])
    : (storeData.layers.length > 0 ? storeData.layers : (localData?.layers || []));
  const templates = isEmbeddedByPulsar
    ? (localData?.templates || [])
    : (storeData.templates.length > 0 ? storeData.templates : (localData?.templates || []));
  const elements = isEmbeddedByPulsar
    ? (localData?.elements || [])
    : (storeData.elements.length > 0 ? storeData.elements : (localData?.elements || []));
  const animations = isEmbeddedByPulsar
    ? (localData?.animations || [])
    : (storeData.animations.length > 0 ? storeData.animations : (localData?.animations || []));
  const keyframes = isEmbeddedByPulsar
    ? (localData?.keyframes || [])
    : (storeData.keyframes.length > 0 ? storeData.keyframes : (localData?.keyframes || []));
  const currentProject = isEmbeddedByPulsar
    ? (localData?.project || null)
    : (storeData.currentProject || localData?.project || null);

  // Get phase durations from store, localStorage, or project settings (with defaults)
  const defaultPhaseDurations: Record<AnimationPhase, number> = { in: 1500, loop: 3000, out: 1500 };
  const phaseDurations = isEmbeddedByPulsar
    ? (localData?.phaseDurations || (currentProject?.settings?.phaseDurations as Record<AnimationPhase, number> | undefined) || defaultPhaseDurations)
    : (storeData.phaseDurations || localData?.phaseDurations || (currentProject?.settings?.phaseDurations as Record<AnimationPhase, number> | undefined) || defaultPhaseDurations);

  // Resolve template ID - finds the correct template ID that has elements
  // This handles cases where Animation node stored a stale template ID
  const resolveTemplateId = useCallback((requestedId: string): string => {
    // Check if elements exist with this template ID
    const hasElements = elements.some(e => e.template_id === requestedId);
    if (hasElements) {
      return requestedId;
    }

    // Try to find the template to get its name
    const template = templates.find(t => t.id === requestedId);
    if (template && template.name) {
      // Find a template with the same name that has elements
      const templateIdsInElements = [...new Set(elements.map(e => e.template_id))];
      for (const existingId of templateIdsInElements) {
        const existingTemplate = templates.find(t => t.id === existingId);
        if (existingTemplate && existingTemplate.name === template.name) {
          console.log(`[Preview] Resolved template ID by name: "${template.name}" - ${requestedId} -> ${existingId}`);
          return existingId;
        }
      }
    }

    // If only one template has elements, use that as fallback
    const templateIdsInElements = [...new Set(elements.map(e => e.template_id))];
    if (templateIdsInElements.length === 1) {
      console.log(`[Preview] Using only available template ID: ${templateIdsInElements[0]} (requested: ${requestedId})`);
      return templateIdsInElements[0];
    }

    // Return original if no resolution found
    console.warn(`[Preview] Could not resolve template ID: ${requestedId}, elements exist for: ${templateIdsInElements.join(', ')}`);
    return requestedId;
  }, [elements, templates]);

  // Interactive mode support
  const {
    enableInteractiveMode,
    disableInteractiveMode,
    setVisualNodes,
    isInteractiveMode,
    dispatchEvent,
  } = useInteractiveStore();

  // Check if project is interactive
  const isInteractiveProject = currentProject?.interactive_enabled === true;

  // Enable/disable interactive mode based on project type
  useEffect(() => {
    console.log('[Preview] Interactive mode check:', {
      isInteractiveProject,
      interactive_enabled: currentProject?.interactive_enabled,
      hasConfig: !!currentProject?.interactive_config,
      projectId: currentProject?.id
    });

    if (isInteractiveProject) {
      console.log('[Preview] Enabling interactive mode for interactive project');
      enableInteractiveMode();

      // Load visual nodes from project's interactive_config
      const interactiveConfig = currentProject?.interactive_config as {
        visualNodes?: Node[];
        visualEdges?: Edge[];
      } | null;

      console.log('[Preview] Interactive config:', interactiveConfig);

      if (interactiveConfig?.visualNodes && interactiveConfig?.visualEdges) {
        console.log('[Preview] Setting visual nodes:', interactiveConfig.visualNodes.length, 'nodes,', interactiveConfig.visualEdges.length, 'edges');
        // Log the event nodes specifically
        const eventNodes = interactiveConfig.visualNodes.filter(n => n.type === 'event');
        console.log('[Preview] Event nodes:', eventNodes.map(n => ({ id: n.id, eventType: (n.data as any)?.eventType })));
        setVisualNodes(interactiveConfig.visualNodes, interactiveConfig.visualEdges);
      } else {
        console.log('[Preview] No visual nodes/edges found in config');
      }
    } else {
      console.log('[Preview] Not an interactive project, disabling interactive mode');
      disableInteractiveMode();
    }

    return () => {
      // Cleanup on unmount
      disableInteractiveMode();
    };
  }, [isInteractiveProject, currentProject?.interactive_config, enableInteractiveMode, disableInteractiveMode, setVisualNodes]);

  // Log interactive mode state changes
  useEffect(() => {
    console.log('[Preview] isInteractiveMode state changed:', isInteractiveMode);
  }, [isInteractiveMode]);

  // Subscribe to designer store's onAirTemplates changes (for visual node runtime playback)
  // When visual node scripts call designerStore.playIn(), we trigger the animation
  // IMPORTANT: Skip when embedded by Pulsar - Pulsar controls playback via postMessage, not shared store
  useEffect(() => {
    if (!isInteractiveMode || isEmbeddedByPulsar) return;

    // Subscribe to onAirTemplates changes in designer store
    const unsubscribe = useDesignerStore.subscribe(
      (state) => state.onAirTemplates,
      (onAirTemplates, prevOnAirTemplates) => {
        console.log('[Preview] onAirTemplates changed:', onAirTemplates);

        // Find new or changed entries
        for (const [layerId, onAirState] of Object.entries(onAirTemplates)) {
          const prevState = prevOnAirTemplates?.[layerId];

          // If this is a new entry or state changed
          if (!prevState || prevState.state !== onAirState.state || prevState.templateId !== onAirState.templateId) {
            console.log('[Preview] Processing onAirTemplates change for layer:', layerId, onAirState);

            if (onAirState.state === 'in') {
              // Resolve template ID in case it was stored with a stale ID
              const resolvedId = resolveTemplateId(onAirState.templateId);
              // Select the template and start IN animation
              setSelectedTemplateId(resolvedId);
              setCurrentPhase('in');
              setPlayheadPosition(0);
              lastTimeRef.current = 0;
              setIsPlaying(true);
              console.log('[Preview] Started IN animation for template:', onAirState.templateId, '(resolved:', resolvedId, ')');
            } else if (onAirState.state === 'out') {
              // Start OUT animation
              setCurrentPhase('out');
              setPlayheadPosition(0);
              lastTimeRef.current = 0;
              setIsPlaying(true);
              console.log('[Preview] Started OUT animation for layer:', layerId);
            }
          }
        }
      },
      { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
    );

    return unsubscribe;
  }, [isInteractiveMode, isEmbeddedByPulsar, resolveTemplateId]);

  // Handle element clicks in interactive mode - dispatches to visual node runtime
  const handleElementClick = useCallback((elementId: string, elementName?: string) => {
    if (!isInteractiveMode) {
      console.log('[Preview] Click ignored - not in interactive mode');
      return;
    }

    console.log('[Preview] handleElementClick - dispatching click event:', {
      elementId,
      elementName,
      isInteractiveMode
    });

    // Create and dispatch a click event
    const event = createInteractionEvent('click', elementId, undefined);
    console.log('[Preview] Created interaction event:', event);

    // The dispatchEvent will route this to the visual node runtime
    dispatchEvent(event, []);
  }, [isInteractiveMode, dispatchEvent]);

  // Keep templatesRef updated with the actual templates array (for event handler access)
  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

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
  const [showDataPanelForTemplate, setShowDataPanelForTemplate] = useState<string | null>(null);
  const [showFps, setShowFps] = useState(false);

  // Per-template playback state: { templateId: { phase, position, isPlaying } }
  const [templatePlaybackState, setTemplatePlaybackState] = useState<Record<string, {
    phase: AnimationPhase;
    position: number;
    isPlaying: boolean;
  }>>({});

  // Global playback controls (for the control bar)
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentPhase, setCurrentPhase] = useState<AnimationPhase>(initialPhase);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isLooping, setIsLooping] = useState(shouldLoop); // Loop control via URL param
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Data binding state - for external control of data record selection (via postMessage from Pulsar GFX)
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);

  // Play a specific template (trigger its IN animation)
  // Auto-triggers OUT for any other template in the same layer that's currently on-air
  const playTemplate = useCallback((templateId: string) => {
    console.log('[Preview] Playing template:', templateId);

    // Find the layer for this template
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const layerId = template.layer_id;

    // Find other templates in the same layer that are currently on-air (in 'in' or 'loop' phase)
    const otherTemplatesInLayer = templates.filter(t =>
      t.id !== templateId &&
      t.layer_id === layerId
    );

    setTemplatePlaybackState(prev => {
      const updates: typeof prev = { ...prev };

      // Trigger OUT for any other template in this layer that's on-air
      for (const otherTemplate of otherTemplatesInLayer) {
        const otherState = prev[otherTemplate.id];
        if (otherState?.isPlaying && (otherState.phase === 'in' || otherState.phase === 'loop')) {
          console.log(`[Preview] Auto-triggering OUT for ${otherTemplate.name} (same layer: ${layerId})`);
          updates[otherTemplate.id] = {
            phase: 'out',
            position: 0,
            isPlaying: true,
          };
        }
      }

      // Play the new template
      updates[templateId] = {
        phase: 'in',
        position: 0,
        isPlaying: true,
      };

      return updates;
    });
  }, [templates]);

  // Stop a specific template (trigger its OUT animation)
  const stopTemplate = useCallback((templateId: string) => {
    console.log('[Preview] Stopping template:', templateId);
    setTemplatePlaybackState(prev => ({
      ...prev,
      [templateId]: {
        phase: 'out',
        position: 0,
        isPlaying: true,
      }
    }));
  }, []);

  // Get playback state for a template (fallback to global state if not tracked)
  const getTemplatePlaybackState = useCallback((templateId: string) => {
    return templatePlaybackState[templateId] || {
      phase: currentPhase,
      position: playheadPosition,
      isPlaying: isPlaying,
    };
  }, [templatePlaybackState, currentPhase, playheadPosition, isPlaying]);

  // Per-template animation loop - updates position for each playing template
  useEffect(() => {
    const playingTemplates = Object.entries(templatePlaybackState).filter(([, state]) => state.isPlaying);
    if (playingTemplates.length === 0) return;

    let lastFrameTime = 0;
    let animFrameId: number;

    const animate = (timestamp: number) => {
      if (!lastFrameTime) lastFrameTime = timestamp;
      const delta = timestamp - lastFrameTime;
      lastFrameTime = timestamp;

      setTemplatePlaybackState(prev => {
        const updates: typeof prev = { ...prev };
        let hasChanges = false;

        for (const [templateId, state] of Object.entries(prev)) {
          if (!state.isPlaying) continue;

          const phaseDuration = phaseDurations[state.phase] || 1500;
          const newPosition = state.position + delta;

          if (newPosition >= phaseDuration) {
            hasChanges = true;
            if (state.phase === 'in') {
              // Transition from IN to LOOP
              updates[templateId] = { ...state, phase: 'loop', position: 0 };
            } else if (state.phase === 'loop') {
              // Loop phase complete - restart loop (template stays on air)
              updates[templateId] = { ...state, position: 0 };
            } else if (state.phase === 'out') {
              // OUT complete - stop playing
              updates[templateId] = { ...state, isPlaying: false, position: phaseDuration };
            }
          } else {
            if (newPosition !== state.position) {
              hasChanges = true;
              updates[templateId] = { ...state, position: newPosition };
            }
          }
        }

        return hasChanges ? updates : prev;
      });

      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [templatePlaybackState, phaseDurations]);

  // Get enabled layers (sorted by z-index)
  const enabledLayers = useMemo(() => {
    return layers
      .filter(l => l.enabled !== false)
      .sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
  }, [layers]);

  // Get templates to show - in isolated mode, show only selected template; in composite, show all
  const visibleTemplates = useMemo(() => {
    // Show all enabled templates from enabled layers
    const enabledLayerIds = new Set(enabledLayers.map(l => l.id));
    let filtered = templates
      .filter(t => t.enabled !== false && enabledLayerIds.has(t.layer_id));

    // In isolated mode with a specific template selected, only show that template
    if (previewMode === 'isolated' && selectedTemplateId !== 'all') {
      filtered = filtered.filter(t => t.id === selectedTemplateId);
      console.log('[Preview] Isolated mode - filtering to template:', selectedTemplateId, 'found:', filtered.length > 0);
    }

    // Sort by layer z-index
    return filtered.sort((a, b) => {
      const layerA = layers.find(l => l.id === a.layer_id);
      const layerB = layers.find(l => l.id === b.layer_id);
      return (layerA?.z_index || 0) - (layerB?.z_index || 0);
    });
  }, [templates, enabledLayers, layers, previewMode, selectedTemplateId]);

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
        } else if (element.content?.type === 'shape') {
          // Shape elements - override can be:
          // 1. A simple URL (texture)
          // 2. A color string (fill)
          // 3. A JSON object with fill/gradient/texture config (from FillEditor)
          const overrideStr = String(override);

          // Try to parse as JSON fill config first
          let fillConfig: { fill?: string; gradient?: any; texture?: any } | null = null;
          if (overrideStr.startsWith('{')) {
            try {
              fillConfig = JSON.parse(overrideStr);
            } catch {
              // Not valid JSON, continue with other checks
            }
          }

          if (fillConfig) {
            // JSON fill config from FillEditor - apply fill, gradient, and texture settings
            const existingTexture = (element.content as any).texture || {};
            const existingGradient = (element.content as any).gradient || {};

            const contentUpdates: Record<string, any> = { ...updatedElement.content };

            // Apply solid fill color
            if (fillConfig.fill !== undefined) {
              contentUpdates.fill = fillConfig.fill;
            }

            // Apply gradient config
            if (fillConfig.gradient !== undefined) {
              contentUpdates.gradient = {
                ...existingGradient,
                ...fillConfig.gradient,
              };
            }

            // Apply texture config
            if (fillConfig.texture !== undefined) {
              contentUpdates.texture = {
                ...existingTexture,
                ...fillConfig.texture,
              };
            }

            updatedElement = {
              ...updatedElement,
              content: contentUpdates,
            };
          } else {
            // Legacy handling for simple strings
            const isUrl = overrideStr.startsWith('http') || overrideStr.startsWith('/') || overrideStr.startsWith('data:');
            const isColor = overrideStr.startsWith('#') || overrideStr.startsWith('rgb') || overrideStr.startsWith('hsl');

            if (isUrl) {
              // Override texture URL
              const existingTexture = (element.content as any).texture || {};
              const isVideo = overrideStr.match(/\.(mp4|webm|mov)$/i);
              updatedElement = {
                ...updatedElement,
                content: {
                  ...updatedElement.content,
                  texture: {
                    ...existingTexture,
                    enabled: true,
                    url: overrideStr,
                    mediaType: isVideo ? 'video' : 'image',
                  },
                },
              };
            } else if (isColor) {
              // Override fill color
              updatedElement = {
                ...updatedElement,
                content: { ...updatedElement.content, fill: overrideStr },
              };
            }
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

      // Check for ticker items override (key format: `${elementId}_items`)
      const tickerItemsKey = `${element.id}_items`;
      if (contentOverrides[tickerItemsKey] !== undefined && element.content?.type === 'ticker') {
        try {
          // Parse items - can be a JSON string or already an array
          const itemsOverride = typeof contentOverrides[tickerItemsKey] === 'string'
            ? JSON.parse(contentOverrides[tickerItemsKey])
            : contentOverrides[tickerItemsKey];

          if (Array.isArray(itemsOverride)) {
            updatedElement = {
              ...updatedElement,
              content: { ...updatedElement.content, items: itemsOverride },
            };
          }
        } catch (e) {
          console.warn('Failed to parse ticker items override:', e);
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
          } else if (element.content?.type === 'shape') {
            // Shape elements - override can be a color (fill) or a URL (texture)
            const valueStr = String(value);
            const isUrl = valueStr.startsWith('http') || valueStr.startsWith('/') || valueStr.startsWith('data:');
            const isColor = valueStr.startsWith('#') || valueStr.startsWith('rgb') || valueStr.startsWith('hsl');

            if (isUrl) {
              // Override texture URL
              const existingTexture = (element.content as any).texture || {};
              const isVideo = valueStr.match(/\.(mp4|webm|mov)$/i);
              updatedElement = {
                ...updatedElement,
                content: {
                  ...updatedElement.content,
                  texture: {
                    ...existingTexture,
                    enabled: true,
                    url: valueStr,
                    mediaType: isVideo ? 'video' : 'image',
                  },
                },
              };
            } else if (isColor) {
              // Override fill color
              updatedElement = {
                ...updatedElement,
                content: { ...updatedElement.content, fill: valueStr },
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

  // Get bindings and data from localStorage (or store)
  const previewBindings = localData?.bindings || [];
  const previewDataPayload = localData?.dataPayload || [];

  // Debug: Log binding data state
  console.log('[Preview] Data binding state:', {
    bindingsCount: previewBindings.length,
    dataPayloadCount: previewDataPayload.length,
    currentRecordIndex,
    hasLocalData: !!localData,
    localDataKeys: localData ? Object.keys(localData) : [],
  });

  // Get the current data record for binding resolution
  // Use currentRecordIndex from state (controlled via postMessage) for external control
  const currentDataRecord = useMemo(() => {
    if (previewDataPayload.length === 0) {
      console.log('[Preview] currentDataRecord: no data payload');
      return null;
    }
    const record = previewDataPayload[currentRecordIndex] || previewDataPayload[0] || null;
    console.log('[Preview] currentDataRecord:', { index: currentRecordIndex, record });
    return record;
  }, [previewDataPayload, currentRecordIndex]);

  // Resolve bindings for all elements (replace {{...}} placeholders with actual data)
  const elementsWithBindings = useMemo(() => {
    if (!currentDataRecord || previewBindings.length === 0) {
      return elementsWithOverrides;
    }

    return elementsWithOverrides.map(element => {
      // Get bindings for this element
      const elementBindings = previewBindings.filter(b => b.element_id === element.id);
      if (elementBindings.length === 0) {
        return element;
      }

      // Resolve bindings using the binding resolver
      return resolveElementBindings(element, elementBindings, currentDataRecord);
    });
  }, [elementsWithOverrides, previewBindings, currentDataRecord]);

  // Get all visible elements (from all visible templates, sorted by layer z-index then element z-index)
  // Also filters out elements hidden due to binding options (hideOnZero, hideOnNull)
  const visibleElements = useMemo(() => {
    const templateIds = new Set(visibleTemplates.map(t => t.id));

    // Build template-to-layer mapping for z-index sorting
    const templateToLayer = new Map(templates.map(t => [t.id, t.layer_id]));
    const layerZIndex = new Map(layers.map(l => [l.id, l.z_index ?? 0]));

    const result = elementsWithBindings
      .filter(e => {
        // Basic visibility checks
        if (!templateIds.has(e.template_id)) return false;
        if (e.visible === false) return false;
        if (e.parent_element_id) return false;

        // Check binding hide options (hideOnZero, hideOnNull)
        if (shouldHideElement(e.id, previewBindings, currentDataRecord)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // First sort by layer z_index (like Stage.tsx does)
        const aLayerId = templateToLayer.get(a.template_id);
        const bLayerId = templateToLayer.get(b.template_id);
        const aLayerZ = aLayerId ? (layerZIndex.get(aLayerId) ?? 0) : 0;
        const bLayerZ = bLayerId ? (layerZIndex.get(bLayerId) ?? 0) : 0;

        if (aLayerZ !== bLayerZ) {
          return aLayerZ - bLayerZ;
        }

        // Then sort by element z_index within the same layer
        return (a.z_index || 0) - (b.z_index || 0);
      });

    // Debug logging when we have a specific template selected
    if (selectedTemplateId !== 'all') {
      // More detailed debugging for empty elements case
      if (result.length === 0) {
        const allElementTemplateIds = [...new Set(elementsWithBindings.map(e => e.template_id))];
        console.warn('[Preview] No visible elements for selected template!', {
          selectedTemplateId,
          visibleTemplateIds: Array.from(templateIds),
          visibleTemplateNames: visibleTemplates.map(t => t.name),
          allElementsCount: elementsWithBindings.length,
          allElementTemplateIds,
          templateIdMatch: allElementTemplateIds.includes(selectedTemplateId),
          previewMode,
        });
      } else {
        console.log('[Preview] visibleElements:', {
          selectedTemplateId,
          visibleTemplateIds: Array.from(templateIds),
          visibleTemplateNames: visibleTemplates.map(t => t.name),
          elementCount: result.length,
          elementTemplateIds: [...new Set(result.map(e => e.template_id))],
        });
      }
    }

    return result;
  }, [elementsWithBindings, visibleTemplates, selectedTemplateId, previewBindings, currentDataRecord, templates, layers]);

  // Load fonts for all elements when they change
  // This ensures fonts are available in preview mode (especially for OBS/external windows)
  useEffect(() => {
    if (elements.length === 0) return;

    // Extract unique font families from all elements
    const fontFamilies = new Set<string>();
    const systemFontFamilies = new Set(SYSTEM_FONTS.map(f => f.family));

    elements.forEach(element => {
      // Check element.styles.fontFamily
      const fontFamily = element.styles?.fontFamily;
      if (fontFamily && typeof fontFamily === 'string') {
        // Handle font family strings like "'Inter', sans-serif" - extract the first font
        const primaryFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
        if (primaryFont && !systemFontFamilies.has(primaryFont)) {
          fontFamilies.add(primaryFont);
        }
      }

      // Check chart options for font families
      if (element.content?.type === 'chart' && element.content.options) {
        const chartFont = element.content.options.fontFamily;
        if (chartFont && typeof chartFont === 'string' && !systemFontFamilies.has(chartFont)) {
          fontFamilies.add(chartFont);
        }
      }

      // Check table content for font families (via styles or headerFontFamily)
      if (element.content?.type === 'table') {
        const tableContent = element.content as Record<string, unknown>;
        const headerFont = tableContent.headerFontFamily;
        if (headerFont && typeof headerFont === 'string' && !systemFontFamilies.has(headerFont)) {
          fontFamilies.add(headerFont);
        }
      }

      // Check ticker config for font families
      if (element.content?.type === 'ticker' && element.content.config) {
        const tickerConfig = element.content.config as unknown as Record<string, unknown>;
        const tickerFont = tickerConfig.fontFamily;
        if (tickerFont && typeof tickerFont === 'string' && !systemFontFamilies.has(tickerFont)) {
          fontFamilies.add(tickerFont);
        }
      }
    });

    if (fontFamilies.size > 0) {
      const fontsToLoad = Array.from(fontFamilies);
      console.log('[Preview] Loading fonts:', fontsToLoad);
      loadFonts(fontsToLoad);
    }
  }, [elements]);

  // Get animations for current phase and visible elements
  const currentAnimations = useMemo(() => {
    const visibleElementIds = new Set(visibleElements.map(e => e.id));
    // Also include child elements
    const allRelatedElements = elementsWithBindings.filter(e =>
      visibleElementIds.has(e.id) ||
      (e.parent_element_id && visibleElementIds.has(e.parent_element_id))
    );
    const allIds = new Set(allRelatedElements.map(e => e.id));

    return animations.filter(
      (a) => currentPhase === a.phase && allIds.has(a.element_id)
    );
  }, [animations, currentPhase, visibleElements, elementsWithBindings]);

  // Calculate max duration - use phase duration from settings, or fall back to animation/keyframe times
  const maxDuration = useMemo(() => {
    // Primary: Use the phase duration from project settings
    const phaseDuration = phaseDurations[currentPhase] || 1500;

    // Get max from regular animations (for reference, but phase duration takes priority)
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

    // Use the phase duration from settings, but ensure it's at least as long as any animation
    return Math.max(phaseDuration, maxAnim, maxMapKeyframe);
  }, [currentAnimations, visibleElements, currentPhase, phaseDurations]);

  // Playback loop - matches NovaPlayer exactly
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    let lastFrameTime = 0;
    let isRunning = true;

    const animate = (timestamp: number) => {
      if (!isRunning) return;

      if (!lastFrameTime) lastFrameTime = timestamp;
      const delta = timestamp - lastFrameTime;
      lastFrameTime = timestamp;

      setPlayheadPosition((prev) => {
        const newPosition = prev + delta;

        if (newPosition >= maxDuration) {
          if (currentPhase === 'in') {
            setCurrentPhase('loop');
            return 0;
          } else if (currentPhase === 'loop') {
            // Loop phase complete - repeat if looping, otherwise stop
            if (isLooping) {
              return 0;
            } else {
              setIsPlaying(false);
              return maxDuration;
            }
          } else if (currentPhase === 'out') {
            setIsPlaying(false);
            return maxDuration;
          }
        }

        return newPosition;
      });

      if (isRunning) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, maxDuration, currentPhase, isLooping]);

  // Reset playhead when phase changes
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

  // Track connection state for debugging
  const [isConnected, setIsConnected] = useState(false);
  const lastMessageTimeRef = useRef<number>(Date.now());

  // PostMessage handler for external control (from Pulsar GFX)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate message structure
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.source !== 'pulsar-gfx') return;

      // Track that we received a message (for connection monitoring)
      lastMessageTimeRef.current = Date.now();
      if (!isConnected) {
        setIsConnected(true);
        console.log('[Preview] Connected to Pulsar GFX');
      }

      const { type, payload } = event.data;
      console.log('Preview received message:', type, payload);

      switch (type) {
        case 'loadData':
          // Load full preview data from Pulsar (cross-origin compatible)
          if (payload && typeof payload === 'object') {
            const previewData = payload as PreviewData;
            console.log('Preview received loadData:', previewData);
            // Debug: Log element types
            const elements = previewData.elements || [];
            console.log('Preview elements received:', elements.map((e: Element) => ({
              id: e.id,
              name: e.name,
              element_type: e.element_type,
              content_type: e.content?.type,
              content: e.content
            })));
            // Also log templates for debugging
            console.log('[Preview] Templates received:', previewData.templates?.map(t => ({
              id: t.id,
              name: t.name,
              layer_id: t.layer_id,
            })));
            setLocalData(previewData);
            // Update templatesRef immediately for use in subsequent messages
            if (previewData.templates) {
              templatesRef.current = previewData.templates;
            }
          }
          break;

        case 'updateContent':
          // Update content overrides for real-time preview
          if (payload && typeof payload === 'object') {
            console.log('[Preview] updateContent received:', {
              payloadKeys: Object.keys(payload),
              payloadSample: JSON.stringify(payload).slice(0, 200),
            });
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
            // Get current templates to verify the template exists (use templatesRef for current rendered templates)
            const currentTemplates = templatesRef.current;
            const templateExists = currentTemplates.some(t => t.id === payload.templateId);
            const matchedTemplate = currentTemplates.find(t => t.id === payload.templateId);
            console.log('[Preview] Setting template to:', payload.templateId,
              'exists:', templateExists,
              'matched:', matchedTemplate?.name,
              'layer_id:', matchedTemplate?.layer_id,
              'totalTemplates:', currentTemplates.length,
              'available templates:', currentTemplates.map(t => ({ id: t.id, name: t.name, layer_id: t.layer_id })));

            // First reset layer to 'all' to ensure template won't be filtered
            setSelectedLayerId('all');
            // Then set the template ID
            setSelectedTemplateId(payload.templateId);
            console.log('[Preview] State updates queued: selectedLayerId=all, selectedTemplateId=', payload.templateId);
          } else {
            // No specific template provided, show all
            setSelectedLayerId('all');
            setSelectedTemplateId('all');
            console.log('[Preview] No template specified, showing all');
          }
          break;
        }

        case 'setMode':
          // Handle mode change
          console.log('[Preview] setMode received:', {
            mode: payload?.mode,
            templateId: payload?.templateId,
            currentPreviewMode: previewMode,
            currentSelectedTemplateId: selectedTemplateId,
          });
          if (payload?.mode) {
            setPreviewMode(payload.mode);
            if (payload.mode === 'composite') {
              console.log('[Preview] Setting to composite mode - showing all templates');
              setSelectedTemplateId('all');
            } else if (payload.templateId) {
              console.log('[Preview] Setting to isolated mode with template:', payload.templateId);
              setSelectedTemplateId(payload.templateId);
            } else {
              // In isolated mode with no specific template, show all templates
              console.log('[Preview] Setting to isolated mode with no template - showing all');
              setSelectedTemplateId('all');
            }
          }
          break;

        case 'ping':
          // Respond to ping with pong (keep-alive)
          if (event.source && typeof (event.source as Window).postMessage === 'function') {
            (event.source as Window).postMessage({
              source: 'nova-preview',
              type: 'pong',
              timestamp: Date.now(),
            }, '*');
          }
          break;

        case 'refresh':
          // Force refresh data from localStorage
          // IMPORTANT: Skip when embedded by Pulsar - Pulsar sends data via setPreviewData, not localStorage
          if (isEmbeddedByPulsar) {
            console.log('[Preview] Ignoring refresh message when embedded by Pulsar');
            break;
          }
          const savedData = localStorage.getItem('nova-preview-data');
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData);
              setLocalData(parsed);
              if (parsed.templates) {
                templatesRef.current = parsed.templates;
              }
              console.log('[Preview] Data refreshed from localStorage');
            } catch (e) {
              console.error('[Preview] Failed to refresh data:', e);
            }
          }
          break;

        case 'setLoop':
          // Toggle loop mode from external control
          if (payload?.loop !== undefined) {
            setIsLooping(payload.loop);
            console.log('[Preview] Loop mode set to:', payload.loop);
          }
          break;

        case 'setDataRecordIndex':
          // Set data record index from external control (Pulsar GFX)
          if (payload?.recordIndex !== undefined) {
            console.log('[Preview] setDataRecordIndex received:', payload.recordIndex, 'current:', currentRecordIndex);
            setCurrentRecordIndex(payload.recordIndex);
            console.log('[Preview] Data record index set to:', payload.recordIndex);
          }
          break;

        default:
          console.log('Unknown message type:', type);
      }
    };

    window.addEventListener('message', handleMessage);

    // Send ready signal to parent (in case parent is waiting)
    if (window.opener || window.parent !== window) {
      const target = window.opener || window.parent;
      target.postMessage({
        source: 'nova-preview',
        type: 'ready',
        timestamp: Date.now(),
      }, '*');
      console.log('[Preview] Sent ready signal to parent');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [isConnected]);

  // Periodic localStorage sync and visibility change handler
  // IMPORTANT: Skip when embedded by Pulsar - Pulsar sends data via postMessage, not localStorage
  useEffect(() => {
    // If embedded by Pulsar, only re-send ready signal on visibility change (skip localStorage reads)
    if (isEmbeddedByPulsar) {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          // Re-send ready signal in case parent lost reference
          if (window.opener || window.parent !== window) {
            const target = window.opener || window.parent;
            target.postMessage({
              source: 'nova-preview',
              type: 'ready',
              timestamp: Date.now(),
            }, '*');
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    // Refresh data when window becomes visible (user switches back to preview tab)
    // Only for standalone Nova GFX preview, NOT when embedded by Pulsar
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Preview] Window became visible, checking for data updates...');
        const savedData = localStorage.getItem('nova-preview-data');
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            // Only update if data has changed (compare template count as simple check)
            const currentCount = templatesRef.current.length;
            const newCount = parsed.templates?.length || 0;
            if (newCount !== currentCount || newCount === 0) {
              setLocalData(parsed);
              if (parsed.templates) {
                templatesRef.current = parsed.templates;
              }
              console.log('[Preview] Data refreshed after visibility change');
            }
          } catch (e) {
            console.error('[Preview] Failed to refresh data on visibility change:', e);
          }
        }

        // Re-send ready signal in case parent lost reference
        if (window.opener || window.parent !== window) {
          const target = window.opener || window.parent;
          target.postMessage({
            source: 'nova-preview',
            type: 'ready',
            timestamp: Date.now(),
          }, '*');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also check localStorage periodically (every 5 seconds) in case we missed an update
    // Only for standalone Nova GFX preview, NOT when embedded by Pulsar
    const intervalId = setInterval(() => {
      const savedData = localStorage.getItem('nova-preview-data');
      if (savedData && templatesRef.current.length === 0) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.templates?.length > 0) {
            setLocalData(parsed);
            templatesRef.current = parsed.templates;
            console.log('[Preview] Data loaded from periodic localStorage check');
          }
        } catch (e) {
          // Ignore parse errors in periodic check
        }
      }
    }, 5000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [isEmbeddedByPulsar]);

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
          {visibleElements.map((element) => {
            // Get per-template playback state or fall back to global
            const templateState = getTemplatePlaybackState(element.template_id);
            return (
              <PreviewElement
                key={element.id}
                element={element}
                allElements={elementsWithBindings}
                animations={animations}
                keyframes={keyframes}
                playheadPosition={templateState.position}
                currentPhase={templateState.phase}
                isPlaying={templateState.isPlaying}
                phaseDuration={phaseDurations[templateState.phase]}
                isInteractiveMode={isInteractiveMode}
                onElementClick={handleElementClick}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Check if template selected but no elements visible (potential ID mismatch)
  const hasTemplateElementMismatch = selectedTemplateId !== 'all' && visibleElements.length === 0 && elements.length > 0;

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
          {visibleElements.map((element) => {
            // Get per-template playback state or fall back to global
            const templateState = getTemplatePlaybackState(element.template_id);
            return (
              <PreviewElement
                key={element.id}
                element={element}
                allElements={elementsWithBindings}
                animations={animations}
                keyframes={keyframes}
                playheadPosition={templateState.position}
                currentPhase={templateState.phase}
                isPlaying={templateState.isPlaying}
                phaseDuration={phaseDurations[templateState.phase]}
                isInteractiveMode={isInteractiveMode}
                onElementClick={handleElementClick}
              />
            );
          })}
          {/* Show debug message when template is selected but has no visible elements */}
          {hasTemplateElementMismatch && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-white/40 bg-black/50 p-6 rounded-lg max-w-md">
                <p className="text-lg mb-2">No elements visible</p>
                <p className="text-sm text-white/30 mb-2">
                  Selected template may have a different ID than the elements.
                </p>
                <p className="text-xs text-white/20 font-mono break-all">
                  Template: {String(selectedTemplateId).slice(0, 12)}...
                </p>
                <p className="text-xs text-white/20 mt-1">
                  Elements: {elements.length} total
                </p>
                <p className="text-xs mt-3 text-violet-400">
                  Check browser console (F12) for details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FPS Counter */}
      {showFps && <FpsCounter />}

      {/* Click overlay to close selector */}
      {showSelector && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSelector(false)}
        />
      )}

      {/* Controls Bar - hidden for interactive projects */}
      {!isInteractiveProject && (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-lg rounded-xl px-4 py-2 flex items-center gap-4 text-white border border-white/10 z-50">
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

        {/* Layer/Template Selector - with inline dropdown */}
        <div className="relative">
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
            <svg className={`w-3 h-3 transition-transform ${showSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Dropdown Menu - positioned above the button */}
          {showSelector && (
            <div
              className="absolute bottom-full left-0 mb-2 bg-black/95 backdrop-blur-lg rounded-xl border border-white/10 shadow-2xl z-[60] min-w-[280px] max-h-[60vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2">
                {/* Header */}
                <div className="px-3 py-1 text-[10px] font-medium text-white/40 uppercase tracking-wider">
                  Play Template
                </div>

                {/* All Templates option */}
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                    selectedTemplateId === 'all' ? 'bg-violet-500/30 ring-1 ring-violet-500' : 'hover:bg-white/10'
                  }`}
                  onClick={() => {
                    setSelectedTemplateId('all');
                    setSelectedLayerId('all');
                    setShowSelector(false);
                  }}
                >
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className={`text-xs font-medium ${selectedTemplateId === 'all' ? 'text-violet-300' : 'text-white/70'}`}>
                    All Templates
                  </span>
                </div>

                <div className="h-px bg-white/10 my-2" />

                {/* Layers and their templates */}
                {templatesByLayer.map(({ layer, templates: layerTemplates }) => (
                  <div key={layer.id} className="mb-2">
                    {/* Layer header */}
                    <div className="px-3 py-1 flex items-center gap-2 text-white/60">
                      <span className="w-2 h-2 rounded-full bg-violet-400" />
                      <span className="text-xs font-medium">{layer.name}</span>
                      <span className="text-white/30 text-[10px] ml-auto">{layerTemplates.length}</span>
                    </div>

                    {/* Templates in this layer - clickable to select, with play/stop buttons */}
                    <div className="ml-4 mt-1 space-y-1">
                      {layerTemplates.map((template) => {
                        const playState = templatePlaybackState[template.id];
                        const isActive = playState?.isPlaying;
                        const templatePhase = playState?.phase || 'loop';
                        const isOnAir = isActive && (templatePhase === 'in' || templatePhase === 'loop');
                        const isSelected = selectedTemplateId === template.id;
                        // Check if this template has any bindings
                        const templateHasBindings = previewBindings.some(b => b.template_id === template.id);

                        return (
                          <React.Fragment key={template.id}>
                          <div
                            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                              isSelected ? 'bg-violet-500/30 ring-1 ring-violet-500' : 'hover:bg-white/10'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Click on row selects the template for the dropdown
                              setSelectedTemplateId(template.id);
                              setSelectedLayerId(layer.id);
                              console.log('[Preview] Selected template:', template.name);
                            }}
                          >
                            {/* Play button - show when not on air */}
                            {!isOnAir && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  console.log('[Preview] Play template:', template.id, template.name);
                                  playTemplate(template.id);
                                }}
                                className="w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-colors shrink-0"
                                title="Play IN animation"
                              >
                                <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </button>
                            )}

                            {/* Stop button - show when on air (in or loop phase) */}
                            {isOnAir && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  console.log('[Preview] Stop template:', template.id, template.name);
                                  stopTemplate(template.id);
                                }}
                                className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors shrink-0"
                                title="Play OUT animation"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <rect x="6" y="6" width="12" height="12" rx="1" />
                                </svg>
                              </button>
                            )}

                            {/* Template name - clickable area */}
                            <span className={`text-xs flex-1 truncate ${
                              isSelected ? 'text-violet-300 font-medium' :
                              isOnAir ? 'text-white font-medium' : 'text-white/70'
                            }`}>
                              {template.name}
                            </span>

                            {/* Data binding button - only show for templates that have bindings AND when there's data */}
                            {templateHasBindings && previewDataPayload.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDataPanelForTemplate(
                                    showDataPanelForTemplate === template.id ? null : template.id
                                  );
                                }}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                                  showDataPanelForTemplate === template.id ? 'bg-cyan-500/40 text-cyan-300' : 'bg-white/10 hover:bg-white/20 text-white/50 hover:text-white'
                                }`}
                                title="Data Binding Options"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                                <span>{currentRecordIndex + 1}/{previewDataPayload.length}</span>
                              </button>
                            )}

                            {/* Status indicator */}
                            {isActive && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                templatePhase === 'in' ? 'bg-emerald-500/30 text-emerald-400' :
                                templatePhase === 'loop' ? 'bg-violet-500/30 text-violet-400' :
                                'bg-amber-500/30 text-amber-400'
                              }`}>
                                {templatePhase.toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Data Panel - show inline when data button clicked for this template (only if template has bindings) */}
                          {showDataPanelForTemplate === template.id && templateHasBindings && previewDataPayload.length > 0 && (
                            <div className="mt-1 mb-2 ml-8 bg-white/5 rounded-lg p-2 border border-cyan-500/30">
                              <div className="text-[10px] font-medium text-cyan-400/70 uppercase tracking-wider mb-2">
                                Data Records
                              </div>

                              {/* Record Navigation */}
                              <div className="flex items-center gap-2 mb-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentRecordIndex(Math.max(0, currentRecordIndex - 1));
                                  }}
                                  disabled={currentRecordIndex === 0}
                                  className="p-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                                <div className="flex-1 text-center">
                                  <span className="text-sm font-bold text-white">{currentRecordIndex + 1}</span>
                                  <span className="text-white/40 text-xs"> / {previewDataPayload.length}</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentRecordIndex(Math.min(previewDataPayload.length - 1, currentRecordIndex + 1));
                                  }}
                                  disabled={currentRecordIndex >= previewDataPayload.length - 1}
                                  className="p-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>

                              {/* Quick Select Buttons */}
                              {previewDataPayload.length > 1 && previewDataPayload.length <= 10 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {previewDataPayload.map((_, idx) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentRecordIndex(idx);
                                      }}
                                      className={`w-6 h-6 rounded text-[10px] font-medium transition-colors ${
                                        idx === currentRecordIndex
                                          ? 'bg-cyan-500 text-white'
                                          : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                                      }`}
                                    >
                                      {idx + 1}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Current Record Preview */}
                              {currentDataRecord && (
                                <div className="bg-black/20 rounded p-2 max-h-[100px] overflow-y-auto">
                                  <div className="space-y-0.5">
                                    {Object.entries(currentDataRecord).slice(0, 5).map(([key, value]) => (
                                      <div key={key} className="flex items-start gap-1 text-[10px]">
                                        <span className="text-cyan-400/70 font-mono shrink-0">{key}:</span>
                                        <span className="text-white/60 truncate">
                                          {typeof value === 'object' ? JSON.stringify(value).slice(0, 20) + '...' : String(value).slice(0, 25)}
                                        </span>
                                      </div>
                                    ))}
                                    {Object.keys(currentDataRecord).length > 5 && (
                                      <div className="text-[9px] text-white/30 italic">
                                        +{Object.keys(currentDataRecord).length - 5} more...
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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

        {/* FPS Toggle */}
        <button
          onClick={() => setShowFps(!showFps)}
          className={`p-2 rounded-lg transition-colors ${
            showFps ? 'bg-violet-500/30 text-violet-400' : 'text-white/60 hover:text-white'
          }`}
          title="Show FPS"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
      )}

      {/* Interactive mode back button - simple control bar for interactive projects */}
      {isInteractiveProject && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-lg rounded-xl px-4 py-2 flex items-center gap-4 text-white border border-white/10 z-30">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-white/60 hover:text-white rounded-lg transition-colors hover:bg-white/10"
            title="Back to Designer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="text-xs text-white/60">
            Interactive Mode
          </div>
        </div>
      )}

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
  phaseDuration: number;
  isInteractiveMode?: boolean;
  onElementClick?: (elementId: string, elementName?: string) => void;
}

function PreviewElement({
  element,
  allElements,
  animations,
  keyframes,
  playheadPosition,
  currentPhase,
  isPlaying,
  phaseDuration,
  isInteractiveMode = false,
  onElementClick,
}: PreviewElementProps) {
  // Calculate animated properties - pass phaseDuration for correct keyframe interpolation
  const animatedProps = useMemo(() => {
    return getAnimatedProperties(element, animations, keyframes, playheadPosition, currentPhase, false, phaseDuration);
  }, [element, animations, keyframes, playheadPosition, currentPhase, phaseDuration]);

  // Get children
  const children = allElements
    .filter((e) => e.parent_element_id === element.id && e.visible !== false)
    .sort((a, b) => (a.z_index || a.sort_order || 0) - (b.z_index || b.sort_order || 0));

  // Handle animated properties - fallback to 1 if element.opacity is undefined
  const animatedOpacity = animatedProps.opacity !== undefined
    ? Number(animatedProps.opacity)
    : (element.opacity ?? 1);
  
  const animatedX = animatedProps.position_x !== undefined
    ? Number(animatedProps.position_x)
    : (element.position_x ?? 0);
  const animatedY = animatedProps.position_y !== undefined
    ? Number(animatedProps.position_y)
    : (element.position_y ?? 0);
  
  const animatedRotation = animatedProps.rotation !== undefined
    ? Number(animatedProps.rotation)
    : (element.rotation ?? 0);
  
  const animatedScaleX = animatedProps.scale_x !== undefined
    ? Number(animatedProps.scale_x)
    : (element.scale_x ?? 1);
  const animatedScaleY = animatedProps.scale_y !== undefined
    ? Number(animatedProps.scale_y)
    : (element.scale_y ?? 1);
  
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
            charAnimation={textContent.charAnimation}
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
        // Cast to extended type that includes glow and texture (which exist in the actual data but not in the strict type)
        const shapeContent = element.content as typeof element.content & {
          glow?: {
            enabled: boolean;
            color?: string;
            blur?: number;
            spread?: number;
            intensity?: number;
          };
          texture?: {
            enabled: boolean;
            url: string;
            thumbnailUrl?: string;
            mediaType?: 'image' | 'video';
            fit?: 'cover' | 'contain' | 'fill' | 'tile';
            position?: { x: number; y: number };
            scale?: number;
            rotation?: number;
            opacity?: number;
            blur?: number;
            blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';
            playbackMode?: 'loop' | 'pingpong' | 'once';
            playbackSpeed?: number;
          };
        };
        const glass = shapeContent.glass;
        const gradient = shapeContent.gradient;
        const glow = shapeContent.glow;
        const texture = shapeContent.texture;

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
        // Multiply glow intensity by animated opacity so glow fades with element
        const glowStyle: React.CSSProperties = (() => {
          if (!glow?.enabled) return {};

          const glowColor = glow.color || shapeContent.fill || '#8B5CF6';
          const blur = glow.blur ?? 20;
          const spread = glow.spread ?? 0;
          const baseIntensity = glow.intensity ?? 0.6;
          // Apply animated opacity to glow intensity for proper fade in/out
          const intensity = baseIntensity * (animatedOpacity ?? 1);

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

        // If texture is enabled, render with texture background
        if (texture?.enabled && texture.url) {
          // For blend mode "normal", the texture should be the only visible background
          // For other blend modes (multiply, screen, overlay, etc.), the fill color should show through
          const textureBlendMode = texture.blendMode || 'normal';
          const textureBaseBgColor = textureBlendMode === 'normal' ? 'transparent' : bgColorValue;

          // Calculate texture background styles
          const scale = texture.scale ?? 1;
          const posX = texture.position?.x ?? 0;
          const posY = texture.position?.y ?? 0;
          const rotation = texture.rotation ?? 0;
          const opacity = texture.opacity ?? 1;
          const blur = texture.blur ?? 0;
          const blendMode = texture.blendMode || 'normal';

          // Map fit mode to background-size
          const backgroundSize = (() => {
            switch (texture.fit) {
              case 'contain': return 'contain';
              case 'fill': return '100% 100%';
              case 'tile': return 'auto';
              default: return 'cover'; // 'cover' is default
            }
          })();

          // Calculate background position with offset
          const bgPosX = 50 + posX;
          const bgPosY = 50 + posY;

          // For tile mode, use repeat; otherwise no-repeat
          const backgroundRepeat = texture.fit === 'tile' ? 'repeat' : 'no-repeat';

          // Scale up when blur is applied to hide soft edges
          const blurScale = blur > 0 ? 1 + (blur * 0.04) : 1;

          const textureBaseStyle: React.CSSProperties = {
            ...baseStyle,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: textureBaseBgColor,
            ...(shapeContent.stroke && shapeContent.strokeWidth && shapeContent.strokeWidth > 0 ? {
              border: `${shapeContent.strokeWidth}px solid ${shapeContent.stroke}`,
            } : {}),
            ...glowStyle,
            ...(element.styles || {}),
          };

          const textureLayerStyle: React.CSSProperties = {
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${texture.url})`,
            backgroundSize,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
            backgroundRepeat,
            opacity,
            mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'],
            filter: blur > 0 ? `blur(${blur}px)` : undefined,
            transform: [
              scale !== 1 || blurScale !== 1 ? `scale(${scale * blurScale})` : '',
              rotation !== 0 ? `rotate(${rotation}deg)` : '',
            ].filter(Boolean).join(' ') || undefined,
            borderRadius: 'inherit',
            pointerEvents: 'none',
          };

          // If texture is a video, render video element
          if (texture.mediaType === 'video') {
            const videoStyle: React.CSSProperties = {
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: (texture.fit === 'cover' ? 'cover' : texture.fit === 'contain' ? 'contain' : 'fill') as React.CSSProperties['objectFit'],
              objectPosition: `${bgPosX}% ${bgPosY}%`,
              opacity,
              mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'],
              transform: rotation !== 0 || scale !== 1 ? `scale(${scale * blurScale}) rotate(${rotation}deg)` : undefined,
              filter: blur > 0 ? `blur(${blur}px)` : undefined,
              borderRadius: 'inherit',
              pointerEvents: 'none',
            };

            return (
              <div style={textureBaseStyle}>
                <video
                  src={texture.url}
                  style={videoStyle}
                  autoPlay
                  loop={texture.playbackMode !== 'once'}
                  muted
                  playsInline
                />
              </div>
            );
          }

          // For images, use background-image approach
          return (
            <div style={textureBaseStyle}>
              <div style={textureLayerStyle} />
            </div>
          );
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
            style={element.styles as React.CSSProperties}
          />
        );

      case 'interactive':
        console.log('[Preview] Rendering InteractiveElement:', {
          elementId: element.id,
          isInteractiveMode,
          isPreview: !isInteractiveMode,
          hasHandlers: !!element.interactions?.handlers,
          handlers: element.interactions?.handlers,
          inputType: element.content?.type
        });
        return (
          <InteractiveElement
            config={element.content}
            elementId={element.id}
            className="w-full h-full"
            style={element.styles as React.CSSProperties}
            isPreview={!isInteractiveMode}
            handlers={element.interactions?.handlers}
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

  // Handle click on this element
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isInteractiveMode || !onElementClick) return;

    // Stop propagation so parent elements don't also trigger
    e.stopPropagation();

    console.log('[Preview] Element clicked:', {
      elementId: element.id,
      elementName: element.name,
      contentType: element.content?.type
    });

    onElementClick(element.id, element.name);
  }, [isInteractiveMode, onElementClick, element.id, element.name, element.content?.type]);

  return (
    <div
      style={{
        ...style,
        cursor: isInteractiveMode ? 'pointer' : undefined,
      }}
      onClick={handleClick}
    >
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
          phaseDuration={phaseDuration}
          isInteractiveMode={isInteractiveMode}
          onElementClick={onElementClick}
        />
      ))}
    </div>
  );
}

export default Preview;
