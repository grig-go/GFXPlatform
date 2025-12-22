/**
 * Nova Player - Channel-based broadcast output renderer
 *
 * This page renders graphics sent from Nova GFX via Pulsar channels.
 * It loads project data and renders using the same approach as Preview.tsx
 * but controlled by realtime commands from Supabase.
 *
 * Route: /player/:channelId
 */

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase, markSupabaseSuccess, directRestSelect, directRestUpdate, sendBeaconUpdate } from '@/lib/supabase';
// NOTE: We use directRestSelect instead of projectService functions to avoid Supabase client timeout issues
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
import { useInteractiveStore, createInteractionEvent } from '@/lib/interactive';
import { useDesignerStore } from '@/stores/designerStore';
import { getBoundValue } from '@/lib/bindingResolver';
import { getNestedValue } from '@/data/sampleDataSources';
import type { Element, Animation, Keyframe, Template, Project, AnimationPhase, Layer, Binding } from '@emergent-platform/types';
import type { Node, Edge } from '@xyflow/react';

// NOTE: withTimeout was previously used but is now replaced by directRestSelect with built-in timeout

// Helper to convert color to rgba with opacity
function colorToRgba(color: string, opacity: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  if (color.startsWith('rgb(')) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
    }
  }
  if (color.startsWith('rgba(')) {
    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
    }
  }
  if (color === 'transparent' || !color) {
    return `rgba(0, 0, 0, ${opacity})`;
  }
  return `rgba(0, 0, 0, ${opacity})`;
}

// Convert box-shadow to filter: drop-shadow() for icon shape matching
function convertBoxShadowToFilter(boxShadow: string): string {
  if (!boxShadow || boxShadow === 'none') return '';
  const match = boxShadow.match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)?px?\s+(.+)/);
  if (match) {
    const [, offsetX, offsetY, blur, , color] = match;
    return `drop-shadow(${offsetX}px ${offsetY}px ${blur}px ${color})`;
  }
  const colorMatch = boxShadow.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
  const blurMatch = boxShadow.match(/(\d+)px/);
  if (colorMatch && blurMatch) {
    return `drop-shadow(0 0 ${blurMatch[1]}px ${colorMatch[0]})`;
  }
  return '';
}

// Command types from Pulsar
interface PlayerCommand {
  type: 'play' | 'load' | 'update' | 'stop' | 'clear' | 'clear_all' | 'initialize';
  // Project ID for initialize commands
  projectId?: string;
  template?: {
    id: string;
    name: string;
    projectId?: string;
    layerId?: string;
    // Elements can be sent with the command for templates not yet saved to DB
    elements?: Array<{
      id: string;
      name: string;
      type: string;
      content: any;
      position_x?: number;
      position_y?: number;
      width?: number;
      height?: number;
      styles?: Record<string, any>;
      interactions?: any;
    }>;
    // Animation data for direct rendering
    animations?: any[];
    keyframes?: any[];
  };
  // Target layerId for stop commands (if not specified, stops all layers)
  layerId?: string;
  // Pulsar GFX uses layerIndex (0-3) instead of layerId
  layerIndex?: number;
  payload?: Record<string, string | null>;
  // Data bindings for runtime resolution
  bindings?: Array<{
    id: string;
    template_id: string;
    element_id: string;
    binding_key: string;
    target_property: string;
    binding_type: string;
    default_value: string | null;
    formatter: string | null;
    formatter_options: Record<string, unknown> | null;
    required: boolean;
  }>;
  // Current data record for binding resolution
  currentRecord?: Record<string, unknown> | null;
  // Interactive project settings
  interactive_enabled?: boolean;
  interactive_config?: {
    visualNodes?: Node[];
    visualEdges?: Edge[];
    mode?: string;
    script?: string;
  };
  timestamp: string;
}

interface ChannelState {
  pending_command: PlayerCommand | null;
  last_command: PlayerCommand | null;
}

// Per-layer template state for animated switching
interface LayerTemplateState {
  templateId: string;
  instanceId: string; // Unique ID per play instance (allows same template with different payload)
  phase: AnimationPhase;
  playheadPosition: number;
  lastTime: number;
  isOutgoing?: boolean; // True if this template is animating OUT
  // Embedded elements from command - used directly to bypass React state timing issues
  embeddedElements?: Element[];
  embeddedAnimations?: Animation[];
  embeddedKeyframes?: Keyframe[];
  // Embedded binding data - used directly to bypass React state timing issues
  embeddedBindings?: Binding[];
  embeddedRecord?: Record<string, unknown> | null;
}

export function NovaPlayer() {
  const { channelId } = useParams<{ channelId: string }>();
  const [searchParams] = useSearchParams();

  // URL params
  const isDebug = searchParams.get('debug') === '1';
  const bgColor = searchParams.get('bg') || 'transparent';

  // Connection state
  const [isReady, setIsReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Interactive mode support
  const {
    enableInteractiveMode,
    disableInteractiveMode,
    setVisualNodes,
    setCodeScript,
    isInteractiveMode,
    dispatchEvent,
  } = useInteractiveStore();

  // Designer store - needed to sync templates for visual node runtime
  const {
    setTemplates: setDesignerTemplates,
    setElements: setDesignerElements,
    setLayers: setDesignerLayers,
    setAnimations: setDesignerAnimations,
    setKeyframes: setDesignerKeyframes,
    setProject: setDesignerProject,
  } = useDesignerStore();

  // Project data (from Supabase)
  const [project, setProject] = useState<Project | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [elements, setElements] = useState<Element[]>([]);
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [projectDataPayload, setProjectDataPayload] = useState<Record<string, unknown>[] | null>(null);

  // localStorage data (same as Preview uses) - fallback when DB data is incomplete
  const [localStorageData, setLocalStorageData] = useState<{
    layers: Layer[];
    templates: Template[];
    elements: Element[];
    animations: Animation[];
    keyframes: Keyframe[];
    project: Project | null;
  } | null>(null);

  // Load localStorage data on mount (same approach as Preview.tsx)
  useEffect(() => {
    const savedData = localStorage.getItem('nova-preview-data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setLocalStorageData(parsed);
        console.log('[Nova Player] Loaded localStorage data:', {
          layers: parsed.layers?.length || 0,
          templates: parsed.templates?.length || 0,
          elements: parsed.elements?.length || 0,
          animations: parsed.animations?.length || 0,
          keyframes: parsed.keyframes?.length || 0,
        });
      } catch (e) {
        console.error('[Nova Player] Failed to parse localStorage data:', e);
      }
    }
  }, []);

  // Current state
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  // Per-instance content overrides - Map<instanceId, overrides>
  // Using instanceId (not templateId) allows same template with different payloads during transitions
  const [instanceOverrides, setInstanceOverrides] = useState<Map<string, Record<string, string | null>>>(new Map());
  // Per-instance binding data for runtime resolution - Map<instanceId, {bindings, currentRecord}>
  const [instanceBindingData, setInstanceBindingData] = useState<Map<string, {
    bindings: Binding[];
    currentRecord: Record<string, unknown> | null;
  }>>(new Map());
  const [isOnAir, setIsOnAir] = useState(false);

  // Per-layer template state for animated switching
  // Map<layerId, LayerTemplateState[]> - can have up to 2 templates per layer during transition
  const [layerTemplates, setLayerTemplates] = useState<Map<string, LayerTemplateState[]>>(new Map());

  // Animation state (legacy - kept for compatibility)
  const [currentPhase, setCurrentPhase] = useState<AnimationPhase>('in');
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Phase durations from project settings (with defaults)
  // Priority: DB project settings > localStorage settings > defaults
  const phaseDurations = useMemo<Record<AnimationPhase, number>>(() => {
    // First try DB project settings
    const dbSettings = project?.settings as Record<string, unknown> | undefined;
    const dbDurations = dbSettings?.phaseDurations as Record<AnimationPhase, number> | undefined;
    if (dbDurations) {
      console.log('[Nova Player] Using phaseDurations from DB project:', dbDurations);
      return dbDurations;
    }

    // Fall back to localStorage project settings
    const localSettings = localStorageData?.project?.settings as Record<string, unknown> | undefined;
    const localDurations = localSettings?.phaseDurations as Record<AnimationPhase, number> | undefined;
    if (localDurations) {
      console.log('[Nova Player] Using phaseDurations from localStorage:', localDurations);
      return localDurations;
    }

    // Default durations
    const defaults = { in: 1500, loop: 3000, out: 1500 };
    console.log('[Nova Player] Using default phaseDurations:', defaults);
    return defaults;
  }, [project?.settings, localStorageData?.project?.settings]);

  // Window size for scaling
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if project is interactive
  const isInteractiveProject = project?.interactive_enabled === true;

  // Enable/disable interactive mode based on project type
  useEffect(() => {
    console.log('[Nova Player] Interactive mode check:', {
      isInteractiveProject,
      interactive_enabled: project?.interactive_enabled,
      hasConfig: !!project?.interactive_config,
      projectId: project?.id
    });

    if (isInteractiveProject) {
      console.log('[Nova Player] Enabling interactive mode for interactive project');
      enableInteractiveMode();

      // Load visual nodes and code script from project's interactive_config
      const interactiveConfig = project?.interactive_config as {
        mode?: 'visual' | 'code';
        script?: string;
        visualNodes?: Node[];
        visualEdges?: Edge[];
      } | null;

      console.log('[Nova Player] Interactive config:', interactiveConfig);

      // Load code script if present
      if (interactiveConfig?.script && interactiveConfig.script.trim()) {
        console.log('[Nova Player] Setting code script:', interactiveConfig.script.length, 'chars');
        setCodeScript(interactiveConfig.script);
      }

      // Load visual nodes if present
      if (interactiveConfig?.visualNodes && interactiveConfig?.visualEdges) {
        console.log('[Nova Player] Setting visual nodes:', interactiveConfig.visualNodes.length, 'nodes,', interactiveConfig.visualEdges.length, 'edges');
        // Log the event nodes specifically
        const eventNodes = interactiveConfig.visualNodes.filter(n => n.type === 'event');
        console.log('[Nova Player] Event nodes:', eventNodes.map(n => ({ id: n.id, eventType: (n.data as any)?.eventType })));
        setVisualNodes(interactiveConfig.visualNodes, interactiveConfig.visualEdges);
      } else {
        console.log('[Nova Player] No visual nodes/edges found in config');
      }
    } else {
      console.log('[Nova Player] Not an interactive project, disabling interactive mode');
      disableInteractiveMode();
    }

    return () => {
      // Cleanup on unmount
      disableInteractiveMode();
    };
  }, [isInteractiveProject, project?.interactive_config, enableInteractiveMode, disableInteractiveMode, setVisualNodes, setCodeScript]);

  // Log interactive mode state changes
  useEffect(() => {
    console.log('[Nova Player] isInteractiveMode state changed:', isInteractiveMode);
  }, [isInteractiveMode]);

  // Subscribe to designer store's onAirTemplates changes (for visual node runtime playback)
  // When visual node scripts call designerStore.playIn(), we need to sync to local layerTemplates
  useEffect(() => {
    if (!isInteractiveMode) return;

    // Subscribe to onAirTemplates changes in designer store
    const unsubscribe = useDesignerStore.subscribe(
      (state) => state.onAirTemplates,
      (onAirTemplates, prevOnAirTemplates) => {
        // Find new or changed entries
        for (const [layerId, onAirState] of Object.entries(onAirTemplates)) {
          const prevState = prevOnAirTemplates?.[layerId];

          // If this is a new entry or state changed
          if (!prevState || prevState.state !== onAirState.state || prevState.templateId !== onAirState.templateId) {

            if (onAirState.state === 'in') {
              // Play IN animation via local layerTemplates state
              setLayerTemplates(prev => {
                const next = new Map(prev);
                const instanceId = `${onAirState.templateId}-${Date.now()}`;
                const existing = next.get(layerId) || [];

                // Create new template state
                const newState: LayerTemplateState = {
                  templateId: onAirState.templateId,
                  instanceId,
                  phase: 'in',
                  playheadPosition: 0,
                  lastTime: performance.now(),
                };

                // If there's already a template, mark it as outgoing
                if (existing.length > 0 && existing[0].phase !== 'out') {
                  const outgoing = existing.map(s => ({ ...s, phase: 'out' as const, playheadPosition: 0, lastTime: performance.now(), isOutgoing: true }));
                  next.set(layerId, [...outgoing, newState]);
                } else {
                  next.set(layerId, [newState]);
                }

                return next;
              });
            } else if (onAirState.state === 'out') {
              // Play OUT animation
              setLayerTemplates(prev => {
                const next = new Map(prev);
                const existing = next.get(layerId);

                if (existing && existing.length > 0) {
                  const updated = existing.map(s => ({ ...s, phase: 'out' as const, playheadPosition: 0, lastTime: performance.now(), isOutgoing: true }));
                  next.set(layerId, updated);
                }

                return next;
              });
            }
          }
        }
      },
      { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
    );

    return unsubscribe;
  }, [isInteractiveMode]);

  // Handle element clicks in interactive mode - dispatches to visual node runtime
  const handleElementClick = useCallback((elementId: string, elementName?: string) => {
    if (!isInteractiveMode) return;

    console.log('[Nova Player] handleElementClick - dispatching click event:', {
      elementId,
      elementName,
      isInteractiveMode
    });

    // Create and dispatch a click event
    const event = createInteractionEvent('click', elementId, undefined);
    // The dispatchEvent will route this to the visual node runtime
    dispatchEvent(event, []);
  }, [isInteractiveMode, dispatchEvent]);

  // Track loaded project ID to prevent redundant loads
  const loadedProjectIdRef = useRef<string | null>(null);
  // Cache loaded data in refs for immediate access (React state updates are async)
  const loadedLayersRef = useRef<Layer[]>([]);
  const loadedTemplatesRef = useRef<Template[]>([]);
  // Cache bindings and data payload in refs for immediate access during play commands
  const loadedBindingsRef = useRef<Binding[]>([]);
  const loadedDataPayloadRef = useRef<Record<string, unknown>[] | null>(null);
  // Track in-flight project load promise to allow play commands to wait for it
  const projectLoadPromiseRef = useRef<Promise<{ success: boolean; templates: Template[]; layers: Layer[] }> | null>(null);

  // Load project data using DIRECT REST API (bypasses Supabase client to avoid timeout issues)
  // Returns templates AND layers for immediate use (since state updates are async)
  const loadProject = useCallback(async (projectId: string): Promise<{ success: boolean; templates: Template[]; layers: Layer[] }> => {
    // Skip if already loaded - return cached ref data (not state, which may be stale in closures)
    if (loadedProjectIdRef.current === projectId) {
      console.log(`[Nova Player] Project ${projectId} already loaded, returning cached data (layers: ${loadedLayersRef.current.length}, templates: ${loadedTemplatesRef.current.length})`);
      return { success: true, templates: loadedTemplatesRef.current, layers: loadedLayersRef.current };
    }

    console.log(`[Nova Player] Loading project via REST API: ${projectId}`);
    const startTime = Date.now();
    try {
      // Fetch project metadata via direct REST
      const projectResult = await directRestSelect<Project>(
        'gfx_projects',
        '*',
        { column: 'id', value: projectId },
        10000
      );

      if (projectResult.error || !projectResult.data || projectResult.data.length === 0) {
        console.error('[Nova Player] Project not found:', projectId, projectResult.error);
        return { success: false, templates: [], layers: [] };
      }

      const projectData = projectResult.data[0];
      setProject(projectData);
      // Sync project to designer store for interactive mode scripts
      setDesignerProject(projectData);
      console.log(`[Nova Player] Project metadata loaded: ${projectData.name} (${Date.now() - startTime}ms)`);

      // Fetch layers and templates via direct REST (in parallel)
      const [layersResult, templatesResult] = await Promise.all([
        directRestSelect<Layer>(
          'gfx_layers',
          '*',
          { column: 'project_id', value: projectId },
          10000
        ),
        directRestSelect<Template>(
          'gfx_templates',
          '*',
          { column: 'project_id', value: projectId },
          10000
        ),
      ]);

      if (layersResult.error) {
        console.error('[Nova Player] Failed to load layers:', layersResult.error);
      }
      if (templatesResult.error) {
        console.error('[Nova Player] Failed to load templates:', templatesResult.error);
      }

      const layersData = layersResult.data || [];
      const templatesData = templatesResult.data || [];

      console.log(`[Nova Player] Layers (${layersData.length}) and templates (${templatesData.length}) loaded (${Date.now() - startTime}ms)`);

      // Update refs immediately for synchronous access
      loadedLayersRef.current = layersData;
      loadedTemplatesRef.current = templatesData;

      // Update state (async)
      setLayers(layersData);
      setTemplates(templatesData);

      // Sync to designer store for visual node runtime to access
      setDesignerLayers(layersData);
      setDesignerTemplates(templatesData);
      console.log('[Nova Player] Synced templates to designer store:', templatesData.length);

      // Fetch elements for all templates via direct REST
      // We need to use a different approach since directRestSelect doesn't support IN queries
      // Fetch elements for each template in parallel
      const allElements: Element[] = [];
      const allAnimations: Animation[] = [];
      const allKeyframes: Keyframe[] = [];

      // Batch fetch elements and animations for all templates in parallel
      const templateFetches = templatesData.map(async (template: Template) => {
        const [elementsResult, animationsResult] = await Promise.all([
          directRestSelect<Element>(
            'gfx_elements',
            '*',
            { column: 'template_id', value: template.id },
            8000
          ),
          directRestSelect<Animation>(
            'gfx_animations',
            '*',
            { column: 'template_id', value: template.id },
            8000
          ),
        ]);

        const templateElements = elementsResult.data || [];
        const templateAnimations = animationsResult.data || [];

        return { templateElements, templateAnimations };
      });

      const templateResults = await Promise.all(templateFetches);

      for (const result of templateResults) {
        allElements.push(...result.templateElements);
        allAnimations.push(...result.templateAnimations);
      }

      // Fetch keyframes for all animations in parallel
      const keyframeFetches = allAnimations.map(async (anim) => {
        const keyframesResult = await directRestSelect<Keyframe>(
          'gfx_keyframes',
          '*',
          { column: 'animation_id', value: anim.id },
          5000
        );
        return keyframesResult.data || [];
      });

      const keyframeResults = await Promise.all(keyframeFetches);
      for (const kfs of keyframeResults) {
        allKeyframes.push(...kfs);
      }

      setElements(allElements);
      setAnimations(allAnimations);
      setKeyframes(allKeyframes);

      // Sync elements, animations, and keyframes to designer store for visual node runtime / scripts
      setDesignerElements(allElements);
      setDesignerAnimations(allAnimations);
      setDesignerKeyframes(allKeyframes);

      // Load bindings for all templates
      const allBindings: Binding[] = [];
      const bindingFetches = templatesData.map(async (template: Template) => {
        const bindingsResult = await directRestSelect<Binding>(
          'gfx_bindings',
          '*',
          { column: 'template_id', value: template.id },
          5000
        );
        return bindingsResult.data || [];
      });

      const bindingResults = await Promise.all(bindingFetches);
      for (const templateBindings of bindingResults) {
        allBindings.push(...templateBindings);
      }
      // Update ref immediately for synchronous access in play commands
      loadedBindingsRef.current = allBindings;
      setBindings(allBindings);
      console.log(`[Nova Player] Loaded ${allBindings.length} bindings total`);

      // Load data from endpoints for templates with data sources
      // Find first template with a data source config that has a slug
      const templateWithDataSource = templatesData.find((t: Template) => {
        const config = t.data_source_config as { slug?: string } | null;
        return config?.slug;
      });

      if (templateWithDataSource) {
        const config = templateWithDataSource.data_source_config as unknown as { slug: string };
        const slug = config.slug;
        console.log(`[Nova Player] Found template with data source: ${slug}`);

        try {
          // Fetch data from Nova endpoint via Supabase edge function
          // Use supabase.functions.invoke() for proper authentication (same as novaEndpointService)
          const { data, error } = await supabase.functions.invoke<Record<string, unknown>[]>(
            `api-endpoints/${slug}`,
            { method: 'GET' }
          );

          if (error) {
            console.warn(`[Nova Player] Edge function error for ${slug}:`, error);
          } else if (data && Array.isArray(data) && data.length > 0) {
            // Update ref immediately for synchronous access in play commands
            loadedDataPayloadRef.current = data;
            setProjectDataPayload(data);
            console.log(`[Nova Player] Loaded ${data.length} records from endpoint: ${slug}`);

            // Store in instanceBindingData for all templates with this data source
            // This ensures bindings are applied when templates are played
            templatesData.forEach((t: Template) => {
              const tConfig = t.data_source_config as { slug?: string } | null;
              if (tConfig?.slug === slug) {
                const templateBindings = allBindings.filter(b => b.template_id === t.id);
                if (templateBindings.length > 0 && data.length > 0) {
                  console.log(`[Nova Player] Pre-loading binding data for template ${t.id} (${templateBindings.length} bindings, ${data.length} records)`);
                }
              }
            });
          } else {
            console.warn(`[Nova Player] No data returned from endpoint: ${slug}`);
          }
        } catch (err) {
          console.warn('[Nova Player] Failed to fetch endpoint data (non-critical):', err);
        }
      }

      // Mark as loaded
      loadedProjectIdRef.current = projectId;

      const totalTime = Date.now() - startTime;
      console.log(`[Nova Player] Project loaded successfully: ${projectData.name} (${allElements.length} elements, ${layersData.length} layers) in ${totalTime}ms`);
      return { success: true, templates: templatesData, layers: layersData };
    } catch (err) {
      const totalTime = Date.now() - startTime;
      console.error(`[Nova Player] Failed to load project after ${totalTime}ms:`, err);
    }
    return { success: false, templates: [], layers: [] };
  }, [setDesignerLayers, setDesignerTemplates, setDesignerElements, setDesignerAnimations, setDesignerKeyframes, setDesignerProject]);


  // Helper to resolve layerIndex to layerId (Pulsar GFX uses numeric indices)
  const resolveLayerId = useCallback((
    layerIdOrIndex: string | number | undefined,
    loadedLayers: typeof layers
  ): string | undefined => {
    if (typeof layerIdOrIndex === 'string') {
      return layerIdOrIndex;
    }
    if (typeof layerIdOrIndex === 'number') {
      // Sort layers by z_index and pick by index
      const sortedLayers = [...loadedLayers].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
      const layer = sortedLayers[layerIdOrIndex];
      console.log(`[Nova Player] Resolved layerIndex ${layerIdOrIndex} to layerId ${layer?.id} (${layer?.name})`);
      return layer?.id;
    }
    return undefined;
  }, []);

  // Process incoming command
  const handleCommand = useCallback(async (cmd: PlayerCommand) => {
    console.log(`[Nova Player] Processing command:`, cmd.type, cmd);

    switch (cmd.type) {
      case 'play':
        if (cmd.template) {
          const templateId = cmd.template.id;

          // REAL-TIME OPTIMIZATION: Use embedded command data if available
          // This avoids Supabase fetch delays for immediate playback
          const hasEmbeddedData = cmd.template.elements && cmd.template.elements.length > 0;

          if (hasEmbeddedData && cmd.template.elements) {
            const embeddedElements = cmd.template.elements;
            console.log(`[Nova Player] Using embedded command data for real-time playback (${embeddedElements.length} elements)`);

            // Also add/update the template in templates state (needed for alwaysOnTemplateIds check)
            // AND sync to designer store for visual node runtime
            const newTemplate: Template = {
              id: templateId,
              name: cmd.template!.name || 'Template',
              layer_id: cmd.template!.layerId || '',
              project_id: cmd.template!.projectId || '',
              folder_id: null,
              description: null,
              tags: [],
              thumbnail_url: null,
              html_template: '',
              css_styles: '',
              width: null,
              height: null,
              in_duration: 1500,
              loop_duration: null,
              loop_iterations: 1,
              out_duration: 1500,
              libraries: [],
              custom_script: null,
              enabled: true,
              locked: false,
              archived: false,
              version: 1,
              sort_order: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: null,
              data_source_id: null,
              data_source_config: null,
            };

            // Track what was updated for designer store sync (done outside setState to avoid render-phase updates)
            let updatedTemplates: Template[] | null = null;
            let updatedElements: Element[] | null = null;

            setTemplates(prev => {
              const exists = prev.some(t => t.id === templateId);
              if (!exists) {
                console.log(`[Nova Player] Adding template to state:`, newTemplate.id);
                updatedTemplates = [...prev, newTemplate];
                return updatedTemplates;
              }
              updatedTemplates = prev;
              return prev;
            });

            // Merge embedded elements into state (use command data directly)
            // This ensures we have the element data immediately available for rendering
            setElements(prev => {
              // Filter out existing elements for this template, add new ones
              const otherElements = prev.filter(e => e.template_id !== templateId);
              const newElements = embeddedElements.map((el: any) => ({
                ...el,
                template_id: templateId,
              }));
              updatedElements = [...otherElements, ...newElements];
              return updatedElements;
            });

            // Sync to designer store AFTER state updates (deferred to avoid render-phase issues)
            queueMicrotask(() => {
              if (updatedTemplates) setDesignerTemplates(updatedTemplates);
              if (updatedElements) setDesignerElements(updatedElements);
            });

            // Merge embedded animations if present
            const embeddedAnimations = cmd.template.animations;
            if (embeddedAnimations && embeddedAnimations.length > 0) {
              setAnimations(prev => {
                const elementIds = new Set(embeddedElements.map((e: any) => e.id));
                const otherAnimations = prev.filter(a => !elementIds.has(a.element_id));
                return [...otherAnimations, ...embeddedAnimations];
              });
            }

            // Merge embedded keyframes if present
            const embeddedKeyframes = cmd.template.keyframes;
            if (embeddedKeyframes && embeddedKeyframes.length > 0) {
              setKeyframes(prev => {
                const animationIds = new Set((embeddedAnimations || []).map((a: any) => a.id));
                const otherKeyframes = prev.filter(k => !animationIds.has(k.animation_id));
                return [...otherKeyframes, ...embeddedKeyframes];
              });
            }
          }

          // Get layerId directly from command (don't wait for project load)
          let layerId: string | undefined = cmd.template.layerId || cmd.layerId;

          // If we don't have layerId and need to resolve from layerIndex, try cached data first
          if (!layerId && cmd.layerIndex !== undefined) {
            layerId = resolveLayerId(cmd.layerIndex, loadedLayersRef.current);
          }

          // Generate unique instance ID for this play command (moved up for use in load callback)
          const newInstanceId = crypto.randomUUID();

          // Background load project data (bindings, endpoint data) for future use
          // This is non-blocking and ensures data is available for subsequent plays
          // IMPORTANT: Always load project even if we have embedded data - we need bindings/endpoint data
          if (cmd.template.projectId && loadedProjectIdRef.current !== cmd.template.projectId) {
            console.log(`[Nova Player] Starting background project load for ${cmd.template.projectId}`);
            const loadPromise = loadProject(cmd.template.projectId);
            projectLoadPromiseRef.current = loadPromise;
            loadPromise.then(() => {
              console.log(`[Nova Player] Background project load complete: ${loadedBindingsRef.current.length} bindings, ${loadedDataPayloadRef.current?.length || 0} data records`);
              // Update instance binding data now that we have the data
              const projectBindings = loadedBindingsRef.current;
              const templateBindings = projectBindings.filter(b => b.template_id === templateId);
              const projectData = loadedDataPayloadRef.current;
              const effectiveRecord = projectData && projectData.length > 0 ? projectData[0] : null;
              if (templateBindings.length > 0 || effectiveRecord) {
                console.log(`[Nova Player] Late-updating binding data for instance ${newInstanceId.slice(0,8)}: ${templateBindings.length} bindings, record: ${!!effectiveRecord}`);
                setInstanceBindingData(prev => {
                  const next = new Map(prev);
                  next.set(newInstanceId, {
                    bindings: templateBindings as Binding[],
                    currentRecord: effectiveRecord,
                  });
                  return next;
                });
              }
            }).catch(err => {
              console.warn(`[Nova Player] Background project load failed:`, err);
            });
          }

          // If still no layerId, try to get from loaded templates cache
          if (!layerId) {
            const template = loadedTemplatesRef.current.find(t => t.id === templateId);
            layerId = template?.layer_id;
          }

          console.log(`[Nova Player] Playing template ${templateId} on layer ${layerId} (hasEmbeddedData: ${hasEmbeddedData})`);
          console.log(`[Nova Player] Current layerTemplates size:`, layerTemplates.size);
          console.log(`[Nova Player] Elements count:`, elements.length);

          // Prepare embedded elements for direct use (bypasses React state timing)
          const embeddedElementsForInstance = hasEmbeddedData ? cmd.template.elements!.map((el: any) => ({
            ...el,
            template_id: templateId,
          })) as Element[] : undefined;
          const embeddedAnimationsForInstance = cmd.template.animations as Animation[] | undefined;
          const embeddedKeyframesForInstance = cmd.template.keyframes as Keyframe[] | undefined;

          // If project data is loading, wait briefly for it (max 500ms to keep animation responsive)
          // This ensures bindings have data available for resolution without blocking too long
          const noDataYet = loadedDataPayloadRef.current === null;
          const cmdRecord = cmd.currentRecord || null;
          if (noDataYet && !cmdRecord && projectLoadPromiseRef.current) {
            console.log('[Nova Player] Waiting briefly for project data (max 500ms)...');
            try {
              await Promise.race([
                projectLoadPromiseRef.current,
                new Promise(resolve => setTimeout(resolve, 500)) // Don't reject, just continue
              ]);
              if (loadedDataPayloadRef.current) {
                console.log('[Nova Player] Project data ready, bindings:', loadedBindingsRef.current.length, 'data records:', loadedDataPayloadRef.current.length);
              } else {
                console.log('[Nova Player] Continuing without data (will update when ready)');
              }
            } catch (err) {
              console.warn('[Nova Player] Error waiting for project data:', err);
            }
          }

          // Calculate effective bindings and record BEFORE setLayerTemplates
          // This ensures binding data is available immediately for rendering
          const cmdBindings = cmd.bindings || [];
          const projectBindings = loadedBindingsRef.current.length > 0 ? loadedBindingsRef.current : bindings;
          const templateBindingsFromProject = projectBindings.filter(b => b.template_id === templateId);
          const effectiveBindings = cmdBindings.length > 0 ? cmdBindings : templateBindingsFromProject;
          const projectData = loadedDataPayloadRef.current || projectDataPayload;
          const effectiveRecord = cmd.currentRecord || (projectData && projectData.length > 0 ? projectData[0] : null);

          if (layerId) {
            // Layer-based animated switching
            setLayerTemplates(prev => {
              const next = new Map(prev);
              const existingStates = next.get(layerId!) || [];

              // Check if there's already a template playing on this layer (not outgoing)
              const currentTemplate = existingStates.find(s => !s.isOutgoing && s.phase !== 'out');

              if (currentTemplate) {
                // Template already playing - animate it OUT while new one comes IN
                // This works for BOTH different templates AND same template with new payload

                // Mark existing template as outgoing and start its OUT animation
                const outgoingState: LayerTemplateState = {
                  ...currentTemplate,
                  phase: 'out',
                  playheadPosition: 0,
                  lastTime: 0,
                  isOutgoing: true,
                };

                // Create new incoming template state with new instance ID
                const incomingState: LayerTemplateState = {
                  templateId,
                  instanceId: newInstanceId,
                  phase: 'in',
                  playheadPosition: 0,
                  lastTime: 0,
                  isOutgoing: false,
                  // Store embedded data directly on the instance for immediate rendering
                  embeddedElements: embeddedElementsForInstance,
                  embeddedAnimations: embeddedAnimationsForInstance,
                  embeddedKeyframes: embeddedKeyframesForInstance,
                  // Store binding data directly for immediate resolution (bypasses React state timing)
                  embeddedBindings: effectiveBindings as Binding[],
                  embeddedRecord: effectiveRecord,
                };

                next.set(layerId!, [outgoingState, incomingState]);
              } else {
                // No template currently playing - just add the new one
                next.set(layerId!, [{
                  templateId,
                  instanceId: newInstanceId,
                  phase: 'in',
                  playheadPosition: 0,
                  lastTime: 0,
                  isOutgoing: false,
                  // Store embedded data directly on the instance for immediate rendering
                  embeddedElements: embeddedElementsForInstance,
                  embeddedAnimations: embeddedAnimationsForInstance,
                  embeddedKeyframes: embeddedKeyframesForInstance,
                  // Store binding data directly for immediate resolution (bypasses React state timing)
                  embeddedBindings: effectiveBindings as Binding[],
                  embeddedRecord: effectiveRecord,
                }]);
              }

              return next;
            });
          } else {
            // No layerId found - create a fallback layer to ensure elements still render
            console.warn(`[Nova Player] No layerId found for template ${templateId}, using fallback layer`);
            const fallbackLayerId = '__fallback_layer__';

            setLayerTemplates(prev => {
              const next = new Map(prev);
              // Clear any existing fallback layer state and add new template
              next.set(fallbackLayerId, [{
                templateId,
                instanceId: newInstanceId,
                phase: 'in' as AnimationPhase,
                playheadPosition: 0,
                lastTime: 0,
                isOutgoing: false,
                // Store embedded data directly on the instance for immediate rendering
                embeddedElements: embeddedElementsForInstance,
                embeddedAnimations: embeddedAnimationsForInstance,
                embeddedKeyframes: embeddedKeyframesForInstance,
                // Store binding data directly for immediate resolution (bypasses React state timing)
                embeddedBindings: effectiveBindings as Binding[],
                embeddedRecord: effectiveRecord,
              }]);
              console.log(`[Nova Player] Using fallback layer for template ${templateId}`);
              return next;
            });
          }

          setCurrentTemplateId(templateId);

          // Store payload per-instance (using instanceId, not templateId)
          // This allows same template with different payloads during transitions
          if (cmd.payload) {
            setInstanceOverrides(prev => {
              const next = new Map(prev);
              next.set(newInstanceId, cmd.payload!);
              return next;
            });
          }

          // Also store in instanceBindingData for fallback (in case embedded data isn't used)
          if (effectiveBindings.length > 0 || effectiveRecord) {
            setInstanceBindingData(prev => {
              const next = new Map(prev);
              next.set(newInstanceId, {
                bindings: effectiveBindings as Binding[],
                currentRecord: effectiveRecord,
              });
              return next;
            });
          }

          // Handle interactive mode from command (for real-time embedded playback)
          console.log('[Nova Player] Play command interactive check:', {
            interactive_enabled: cmd.interactive_enabled,
            hasConfig: !!cmd.interactive_config,
            visualNodesCount: cmd.interactive_config?.visualNodes?.length || 0,
            visualEdgesCount: cmd.interactive_config?.visualEdges?.length || 0
          });
          if (cmd.interactive_enabled) {
            console.log('[Nova Player] Enabling interactive mode from command');
            enableInteractiveMode();
            if (cmd.interactive_config?.visualNodes && cmd.interactive_config?.visualEdges) {
              console.log('[Nova Player] Setting visual nodes from command:', cmd.interactive_config.visualNodes.length, 'nodes,', cmd.interactive_config.visualEdges.length, 'edges');
              const eventNodes = cmd.interactive_config.visualNodes.filter((n: any) => n.type === 'event');
              console.log('[Nova Player] Event nodes from command:', eventNodes.map((n: any) => ({ id: n.id, eventType: n.data?.eventType })));
              setVisualNodes(cmd.interactive_config.visualNodes, cmd.interactive_config.visualEdges);
            }
          }
        }
        setIsOnAir(true);
        // Start IN animation
        setCurrentPhase('in');
        setPlayheadPosition(0);
        lastTimeRef.current = 0;
        setIsPlaying(true);
        break;

      case 'load': {
        // Generate instanceId for this load (needed for payload and binding resolution)
        const loadInstanceId = crypto.randomUUID();
        const templateId = cmd.template?.id;

        // MERGE EMBEDDED DATA: Use embedded command data if available (same as play command)
        const hasEmbeddedData = cmd.template?.elements && cmd.template.elements.length > 0;
        if (hasEmbeddedData && templateId) {
          const embeddedElements = cmd.template!.elements!;

          // Add/update the template in templates state
          const newTemplate: Template = {
            id: templateId,
            name: cmd.template!.name || 'Template',
            layer_id: cmd.template!.layerId || '',
            project_id: cmd.template!.projectId || '',
            folder_id: null,
            description: null,
            tags: [],
            thumbnail_url: null,
            html_template: '',
            css_styles: '',
            width: null,
            height: null,
            in_duration: 1500,
            loop_duration: null,
            loop_iterations: 1,
            out_duration: 1500,
            libraries: [],
            custom_script: null,
            enabled: true,
            locked: false,
            archived: false,
            version: 1,
            sort_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: null,
            data_source_id: null,
            data_source_config: null,
          };

          // Track what was updated for designer store sync (done outside setState to avoid render-phase updates)
          let loadUpdatedTemplates: Template[] | null = null;
          let loadUpdatedElements: Element[] | null = null;

          setTemplates(prev => {
            const exists = prev.some(t => t.id === templateId);
            if (!exists) {
              loadUpdatedTemplates = [...prev, newTemplate];
              return loadUpdatedTemplates;
            }
            loadUpdatedTemplates = prev;
            return prev;
          });

          // Merge embedded elements into state
          setElements(prev => {
            const otherElements = prev.filter(e => e.template_id !== templateId);
            const newElements = embeddedElements.map((el: any) => ({
              ...el,
              template_id: templateId,
            }));
            loadUpdatedElements = [...otherElements, ...newElements];
            return loadUpdatedElements;
          });

          // Sync to designer store AFTER state updates (use queueMicrotask to avoid render-phase issues)
          queueMicrotask(() => {
            if (loadUpdatedTemplates) setDesignerTemplates(loadUpdatedTemplates);
            if (loadUpdatedElements) setDesignerElements(loadUpdatedElements);
          });

          // Merge embedded animations if present
          const embeddedAnimations = cmd.template!.animations;
          if (embeddedAnimations && embeddedAnimations.length > 0) {
            setAnimations(prev => {
              const elementIds = new Set(embeddedElements.map((e: any) => e.id));
              const otherAnimations = prev.filter(a => !elementIds.has(a.element_id));
              return [...otherAnimations, ...embeddedAnimations];
            });
          }

          // Merge embedded keyframes if present
          const embeddedKeyframes = cmd.template!.keyframes;
          if (embeddedKeyframes && embeddedKeyframes.length > 0) {
            setKeyframes(prev => {
              const animationIds = new Set((embeddedAnimations || []).map((a: any) => a.id));
              const otherKeyframes = prev.filter(k => !animationIds.has(k.animation_id));
              return [...otherKeyframes, ...embeddedKeyframes];
            });
          }
        }

        // Load project in background - don't await since we have embedded data
        if (cmd.template?.projectId) {
          if (!project || project.id !== cmd.template.projectId) {
            // Fire and forget - don't block on project load since we have embedded data
            loadProject(cmd.template.projectId).catch(err => {
              console.warn('[Nova Player] LOAD: Background project load failed:', err);
            });
          }
        }

        // Set current template
        if (templateId) {
          setCurrentTemplateId(templateId);
        }

        // Store payload per-instance
        if (cmd.payload) {
          setInstanceOverrides(prev => {
            const next = new Map(prev);
            next.set(loadInstanceId, cmd.payload!);
            return next;
          });
        }

        // Store bindings and current record for runtime resolution
        // Use command bindings if provided, otherwise fall back to project-level bindings
        const cmdBindingsLoad = cmd.bindings || [];
        const cmdRecordLoad = cmd.currentRecord || null;

        // If no bindings/data available yet and there's a pending project load, wait for it
        const noBindingsYetLoad = loadedBindingsRef.current.length === 0;
        const noDataYetLoad = loadedDataPayloadRef.current === null;
        if (noBindingsYetLoad && noDataYetLoad && projectLoadPromiseRef.current) {
          await projectLoadPromiseRef.current;
        }

        // If no bindings in command, try to use project-level bindings loaded during initialize
        const projectBindingsLoad = loadedBindingsRef.current.length > 0 ? loadedBindingsRef.current : bindings;
        const templateBindingsFromProjectLoad = projectBindingsLoad.filter(b => b.template_id === templateId);
        const effectiveBindingsLoad = cmdBindingsLoad.length > 0 ? cmdBindingsLoad : templateBindingsFromProjectLoad;

        // If no current record in command, use first record from projectDataPayload
        const projectDataLoad = loadedDataPayloadRef.current || projectDataPayload;
        const effectiveRecordLoad = cmdRecordLoad || (projectDataLoad && projectDataLoad.length > 0 ? projectDataLoad[0] : null);

        if (effectiveBindingsLoad.length > 0 || effectiveRecordLoad) {
          setInstanceBindingData(prev => {
            const next = new Map(prev);
            next.set(loadInstanceId, {
              bindings: effectiveBindingsLoad as Binding[],
              currentRecord: effectiveRecordLoad,
            });
            return next;
          });
        }

        // Add to layerTemplates so rendering will pick it up with bindings applied
        // Store embedded elements directly on the instance to bypass React state timing issues
        if (templateId) {
          const targetLayerId = cmd.template?.layerId || cmd.layerId || 'default';

          // Convert embedded elements to proper Element type
          const embeddedElements = hasEmbeddedData ? cmd.template!.elements!.map((el: any) => ({
            ...el,
            template_id: templateId,
          })) as Element[] : undefined;

          setLayerTemplates(prev => {
            const next = new Map(prev);
            next.set(targetLayerId, [{
              templateId: templateId,
              instanceId: loadInstanceId,
              phase: 'in' as AnimationPhase,
              playheadPosition: 0,
              lastTime: 0,
              // Store embedded data directly on the instance for immediate rendering
              embeddedElements,
              embeddedAnimations: cmd.template?.animations as Animation[] | undefined,
              embeddedKeyframes: cmd.template?.keyframes as Keyframe[] | undefined,
            }]);
            return next;
          });
        }

        // Handle interactive mode from command
        if (cmd.interactive_enabled) {
          enableInteractiveMode();
          if (cmd.interactive_config?.visualNodes && cmd.interactive_config?.visualEdges) {
            setVisualNodes(cmd.interactive_config.visualNodes, cmd.interactive_config.visualEdges);
          }
        }

        // Don't play yet
        setIsOnAir(false);
        setIsPlaying(false);
        setCurrentPhase('in');
        setPlayheadPosition(0);
        break;
      }

      case 'update': {
        // Update requires finding the active instance for the template
        // Updates should only affect the non-outgoing instance (the one currently playing)
        if (cmd.payload) {
          const targetTemplateId = cmd.template?.id || currentTemplateId;
          if (targetTemplateId) {
            // Find the active (non-outgoing) instance for this template
            let targetInstanceId: string | null = null;
            for (const states of layerTemplates.values()) {
              const activeInstance = states.find(s => s.templateId === targetTemplateId && !s.isOutgoing);
              if (activeInstance) {
                targetInstanceId = activeInstance.instanceId;
                break;
              }
            }

            if (targetInstanceId) {
              setInstanceOverrides(prev => {
                const next = new Map(prev);
                const existing = next.get(targetInstanceId!) || {};
                next.set(targetInstanceId!, { ...existing, ...cmd.payload });
                return next;
              });
            }
          }
        }
        break;
      }

      case 'stop': {
        // Play OUT animation - if layerId/layerIndex specified, only target that layer
        // Otherwise, stop all layers (global stop)
        // Support both layerId (UUID) and layerIndex (numeric 0-3)
        let targetLayerId = cmd.layerId || cmd.template?.layerId;
        if (!targetLayerId && cmd.layerIndex !== undefined) {
          // Use cached ref data for immediate access
          targetLayerId = resolveLayerId(cmd.layerIndex, loadedLayersRef.current);
        }

        console.log(`[Nova Player] Stop command received:`, {
          targetLayerId,
          cmdLayerId: cmd.layerId,
          templateLayerId: cmd.template?.layerId,
          layerIndex: cmd.layerIndex,
          isOnAir,
          layerTemplatesSize: layerTemplates.size,
          activeLayerIds: Array.from(layerTemplates.keys()),
        });

        if (isOnAir || layerTemplates.size > 0) {
          setLayerTemplates(prev => {
            const next = new Map(prev);

            if (targetLayerId) {
              // Target specific layer only
              const layerStates = next.get(targetLayerId);
              if (layerStates) {
                console.log(`[Nova Player] Stopping layer ${targetLayerId} (${layerStates.length} templates)`);
                const updatedStates = layerStates.map(s => ({
                  ...s,
                  phase: 'out' as AnimationPhase,
                  playheadPosition: 0,
                  lastTime: 0,
                  isOutgoing: true,
                }));
                next.set(targetLayerId, updatedStates);
              } else {
                console.warn(`[Nova Player] Stop: layer ${targetLayerId} not found in active templates. Active layers:`, Array.from(next.keys()));
              }
            } else {
              // Global stop - affect all layers
              console.log(`[Nova Player] Global stop - stopping all ${next.size} layers`);
              for (const [layerId, states] of next.entries()) {
                const updatedStates = states.map(s => ({
                  ...s,
                  phase: 'out' as AnimationPhase,
                  playheadPosition: 0,
                  lastTime: 0,
                  isOutgoing: true,
                }));
                next.set(layerId, updatedStates);
              }
            }
            return next;
          });

          setCurrentPhase('out');
          setPlayheadPosition(0);
          lastTimeRef.current = 0;
          setIsPlaying(true);
        }
        break;
      }

      case 'clear':
      case 'clear_all':
        // Immediate clear
        setIsOnAir(false);
        setIsPlaying(false);
        setCurrentTemplateId(null);
        setInstanceOverrides(new Map());
        setInstanceBindingData(new Map());
        setCurrentPhase('in');
        setPlayheadPosition(0);
        setLayerTemplates(new Map());
        break;

      case 'initialize':
        // Reset state first
        setIsOnAir(false);
        setIsPlaying(false);
        setCurrentTemplateId(null);
        setInstanceOverrides(new Map());
        setInstanceBindingData(new Map());
        setCurrentPhase('in');
        setPlayheadPosition(0);
        setLayerTemplates(new Map());
        // Reset cached refs for fresh project load
        loadedProjectIdRef.current = null;
        loadedLayersRef.current = [];
        loadedTemplatesRef.current = [];
        loadedBindingsRef.current = [];
        loadedDataPayloadRef.current = null;
        projectLoadPromiseRef.current = null;

        // Load the project data if projectId is provided
        // Store the promise so play commands can wait for it if they arrive before load completes
        if (cmd.projectId) {
          console.log(`[Nova Player] Initialize: Loading project ${cmd.projectId}`);
          const loadPromise = loadProject(cmd.projectId);
          projectLoadPromiseRef.current = loadPromise;

          loadPromise.then(() => {
            console.log(`[Nova Player] Initialize: Project loaded successfully, bindings:`, loadedBindingsRef.current.length, 'data records:', loadedDataPayloadRef.current?.length || 0);
          }).catch(err => {
            console.error(`[Nova Player] Initialize: Failed to load project:`, err);
          });
        }
        break;
    }
  }, [isOnAir, loadProject, layerTemplates, resolveLayerId, currentTemplateId, bindings, projectDataPayload]);

  // Ref to track current handleCommand to avoid stale closures in subscription
  const handleCommandRef = useRef(handleCommand);
  useEffect(() => {
    handleCommandRef.current = handleCommand;
  }, [handleCommand]);

  // Subscribe to channel commands and load initial project
  useEffect(() => {
    console.log(`[Nova Player] useEffect triggered - channelId: ${channelId}, supabase configured: ${!!supabase}`);

    if (!channelId || !supabase) {
      console.error(`[Nova Player] Missing required config - channelId: ${channelId}, supabase: ${!!supabase}`);
      setConnectionStatus('error');
      return;
    }

    console.log(`[Nova Player] Subscribing to channel: ${channelId}`);
    setConnectionStatus('connecting');

    // Track last processed command ID to prevent duplicate processing
    // Using command ID instead of sequence because sequence comparison fails on initial load
    let lastProcessedCommandId: string | null = null;

    // IMMEDIATELY update player_status to 'connected' using direct REST API
    // Don't wait for realtime subscription - it may never complete
    // This ensures the status bar shows the player as connected right away
    directRestUpdate(
      'pulsar_channels',
      {
        player_status: 'connected',
        last_heartbeat: new Date().toISOString(),
      },
      { column: 'id', value: channelId },
      5000
    ).then(result => {
      if (result.success) {
        setConnectionStatus('connected');
        setIsReady(true);
      }
    }).catch(() => {
      // Ignore initial status update errors
    });

    // Heartbeat - update player_status every 10 seconds to confirm player is still alive
    // This is critical because status bar polls every 5 seconds and needs up-to-date status
    const heartbeatInterval = setInterval(() => {
      directRestUpdate(
        'pulsar_channels',
        {
          player_status: 'connected',
          last_heartbeat: new Date().toISOString(),
        },
        { column: 'id', value: channelId },
        5000
      ).catch(() => {
        // Ignore heartbeat errors
      });
    }, 10000);

    // Note: We no longer call ensureFreshConnection() here since it was causing issues.
    // The realtime subscription will establish its own WebSocket connection.
    // Initial data loading uses direct REST API which bypasses the Supabase client.

    const channel = supabase
      .channel(`nova-player:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pulsar_channel_state',
          filter: `channel_id=eq.${channelId}`,
        },
        (realtimePayload: { new: ChannelState }) => {
          const state = realtimePayload.new;
          if (state?.pending_command) {
            const cmdId = (state.pending_command as PlayerCommand & { id?: string }).id;
            // Skip if we already processed this command
            if (cmdId && cmdId === lastProcessedCommandId) {
              return;
            }
            if (cmdId) lastProcessedCommandId = cmdId;
            // Use ref to always call the latest handleCommand (avoids stale closure)
            handleCommandRef.current(state.pending_command);
          }
        }
      )
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          setIsReady(true);
          markSupabaseSuccess(); // Mark successful realtime connection

          // Update player_status in pulsar_channels to 'connected'
          await directRestUpdate(
            'pulsar_channels',
            {
              player_status: 'connected',
              last_heartbeat: new Date().toISOString(),
            },
            { column: 'id', value: channelId },
            5000
          );
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Nova Player] Realtime subscription ${status} - will rely on polling fallback`);
          if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('error');
            // Update player_status to 'error'
            await directRestUpdate(
              'pulsar_channels',
              { player_status: 'error' },
              { column: 'id', value: channelId },
              5000
            );
          }
        }
      });

    // Polling - check for new commands every 500ms
    // This is the PRIMARY method for receiving commands (realtime is unreliable)
    // Uses command ID to prevent duplicate processing instead of sequence numbers
    let pollCount = 0;
    const pollForCommands = async () => {
      pollCount++;

      try {
        const stateResult = await directRestSelect<{
          pending_command: (PlayerCommand & { id?: string }) | null;
        }>(
          'pulsar_channel_state',
          'pending_command',
          { column: 'channel_id', value: channelId },
          3000
        );

        if (stateResult.error || !stateResult.data?.[0]) {
          return;
        }

        const state = stateResult.data[0];
        const cmd = state.pending_command;

        // Process if there's a command with a different ID than what we last processed
        if (cmd && cmd.id && cmd.id !== lastProcessedCommandId) {
          lastProcessedCommandId = cmd.id;
          handleCommandRef.current(cmd);
        }
      } catch (err) {
        // Silently ignore polling errors to avoid console spam
      }
    };

    // Start polling interval (500ms for responsive command handling)
    const pollInterval = setInterval(pollForCommands, 500);

    // Also poll immediately (but after a short delay to let initial load run first)
    setTimeout(() => pollForCommands(), 100);

    // Load channel state using DIRECT REST API
    // Skip project loading here - commands contain embedded data for real-time playback
    // Project loading via Supabase client can timeout and block the player
    const loadChannelState = async () => {
      console.log(`[Nova Player] Loading channel state for channel: ${channelId}`);
      const startTime = Date.now();
      try {
        // Check for any pending command using direct REST
        const stateResult = await directRestSelect<{
          pending_command: (PlayerCommand & { id?: string }) | null;
          last_command: (PlayerCommand & { id?: string }) | null;
        }>(
          'pulsar_channel_state',
          'pending_command,last_command',
          { column: 'channel_id', value: channelId },
          8000
        );

        if (stateResult.error) {
          console.error('[Nova Player] Failed to load initial state:', stateResult.error);
          return;
        }

        const stateData = stateResult.data?.[0];
        console.log(`[Nova Player] Channel state loaded (${Date.now() - startTime}ms):`, {
          hasPendingCommand: !!stateData?.pending_command,
          hasLastCommand: !!stateData?.last_command,
          pendingCmdId: stateData?.pending_command?.id?.slice(0, 8) || 'none',
        });

        // Process pending command on initial load
        // Track the command ID so polling doesn't re-process it
        if (stateData?.pending_command) {
          const cmdId = stateData.pending_command.id;
          const cmd = stateData.pending_command;
          console.log(`[Nova Player] Processing initial pending command (id: ${cmdId?.slice(0, 8)}):`, cmd.type);
          if (cmdId) lastProcessedCommandId = cmdId;
          handleCommandRef.current(stateData.pending_command);
        }

        console.log(`[Nova Player] Initial channel state loaded`);
      } catch (err) {
        console.error(`[Nova Player] Error loading initial state after ${Date.now() - startTime}ms:`, err);
      }
    };

    loadChannelState();

    // Handle window close/unload - use sendBeacon for reliable status update
    const handleBeforeUnload = () => {
      console.log(`[Nova Player] Window closing, sending disconnect beacon`);
      sendBeaconUpdate(
        'pulsar_channels',
        { player_status: 'disconnected' },
        { column: 'id', value: channelId }
      );
    };

    // Add beforeunload listener for window close
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      console.log(`[Nova Player] Unsubscribing from channel: ${channelId}`);

      // Remove beforeunload listener
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Clear polling interval
      clearInterval(pollInterval);

      // Clear heartbeat interval
      clearInterval(heartbeatInterval);

      // Unsubscribe from realtime channel
      supabase.removeChannel(channel);

      // Update player_status to 'disconnected' - use both methods for reliability
      // sendBeacon for window close, directRestUpdate for component unmount
      sendBeaconUpdate(
        'pulsar_channels',
        { player_status: 'disconnected' },
        { column: 'id', value: channelId }
      );

      // Also try async update as fallback (won't complete if window is closing)
      directRestUpdate(
        'pulsar_channels',
        { player_status: 'disconnected' },
        { column: 'id', value: channelId },
        5000
      ).catch(err => console.warn('[Nova Player] Failed to update disconnect status:', err));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Get current template
  const currentTemplate = useMemo(() => {
    return templates.find(t => t.id === currentTemplateId);
  }, [templates, currentTemplateId]);

  // Merge DB elements with localStorage data (same approach as Preview.tsx)
  // DB elements take precedence, localStorage is fallback for templates not yet in DB
  const mergedElements = useMemo((): Element[] => {
    // If we have elements from DB, use those
    if (elements.length > 0) {
      // Check if there are templates missing elements (like Bug templates that only exist in localStorage)
      const templateIdsWithElements = new Set(elements.map(e => e.template_id));
      const allTemplateIds = new Set(templates.map(t => t.id));

      // Find templates that don't have elements in DB
      const templatesWithoutElements = [...allTemplateIds].filter(id => !templateIdsWithElements.has(id));

      if (templatesWithoutElements.length > 0 && localStorageData?.elements) {
        // Get elements from localStorage for templates missing from DB
        const localElements = localStorageData.elements.filter(
          e => templatesWithoutElements.includes(e.template_id)
        );

        if (localElements.length > 0) {
          console.log(`[Nova Player] Merging ${elements.length} DB elements + ${localElements.length} localStorage elements for templates: ${templatesWithoutElements.join(', ')}`);
          return [...elements, ...localElements];
        }
      }

      return elements;
    }

    // Fallback to localStorage if no DB elements
    if (localStorageData?.elements && localStorageData.elements.length > 0) {
      console.log(`[Nova Player] Using ${localStorageData.elements.length} elements from localStorage (no DB elements)`);
      return localStorageData.elements;
    }

    return [];
  }, [elements, templates, localStorageData]);

  // Merge templates from DB and localStorage
  const mergedTemplates = useMemo((): Template[] => {
    if (templates.length > 0) {
      // Check if localStorage has templates not in DB
      if (localStorageData?.templates) {
        const dbTemplateIds = new Set(templates.map(t => t.id));
        const localOnlyTemplates = localStorageData.templates.filter(t => !dbTemplateIds.has(t.id));
        if (localOnlyTemplates.length > 0) {
          console.log(`[Nova Player] Merging ${templates.length} DB templates + ${localOnlyTemplates.length} localStorage templates`);
          return [...templates, ...localOnlyTemplates];
        }
      }
      return templates;
    }
    if (localStorageData?.templates && localStorageData.templates.length > 0) {
      console.log(`[Nova Player] Using ${localStorageData.templates.length} templates from localStorage`);
      return localStorageData.templates;
    }
    return [];
  }, [templates, localStorageData]);

  // Resolve template ID - finds the correct template ID that has elements
  // This handles cases where Animation node stored a stale template ID
  const resolveTemplateId = useCallback((requestedId: string): string => {
    // Check if elements exist with this template ID
    const hasElements = mergedElements.some(e => e.template_id === requestedId);
    if (hasElements) {
      return requestedId;
    }

    // Try to find the template to get its name
    const template = mergedTemplates.find(t => t.id === requestedId);
    if (template && template.name) {
      // Find a template with the same name that has elements
      const templateIdsInElements = [...new Set(mergedElements.map(e => e.template_id))];
      for (const existingId of templateIdsInElements) {
        const existingTemplate = mergedTemplates.find(t => t.id === existingId);
        if (existingTemplate && existingTemplate.name === template.name) {
          console.log(`[Nova Player] Resolved template ID by name: "${template.name}" - ${requestedId} -> ${existingId}`);
          return existingId;
        }
      }
    }

    // If only one template has elements, use that as fallback
    const templateIdsInElements = [...new Set(mergedElements.map(e => e.template_id))];
    if (templateIdsInElements.length === 1) {
      console.log(`[Nova Player] Using only available template ID: ${templateIdsInElements[0]} (requested: ${requestedId})`);
      return templateIdsInElements[0];
    }

    // Return original if no resolution found
    console.warn(`[Nova Player] Could not resolve template ID: ${requestedId}, elements exist for: ${templateIdsInElements.join(', ')}`);
    return requestedId;
  }, [mergedElements, mergedTemplates]);

  // Merge DB animations with localStorage data (same approach as Preview.tsx)
  const mergedAnimations = useMemo((): Animation[] => {
    if (animations.length > 0) {
      // Check if there are elements from localStorage that need animations
      const elementIdsWithAnimations = new Set(animations.map(a => a.element_id));
      const localElementIds = localStorageData?.elements?.map(e => e.id) || [];
      const elementsNeedingAnimations = localElementIds.filter(id => !elementIdsWithAnimations.has(id));

      if (elementsNeedingAnimations.length > 0 && localStorageData?.animations) {
        const localAnimations = localStorageData.animations.filter(
          a => elementsNeedingAnimations.includes(a.element_id)
        );
        if (localAnimations.length > 0) {
          console.log(`[Nova Player] Merging ${animations.length} DB animations + ${localAnimations.length} localStorage animations`);
          return [...animations, ...localAnimations];
        }
      }
      return animations;
    }

    if (localStorageData?.animations && localStorageData.animations.length > 0) {
      console.log(`[Nova Player] Using ${localStorageData.animations.length} animations from localStorage`);
      return localStorageData.animations;
    }

    return [];
  }, [animations, localStorageData]);

  // Merge DB keyframes with localStorage data
  const mergedKeyframes = useMemo((): Keyframe[] => {
    if (keyframes.length > 0) {
      // Check if there are animations from localStorage that need keyframes
      const animationIdsWithKeyframes = new Set(keyframes.map(k => k.animation_id));
      const localAnimationIds = localStorageData?.animations?.map(a => a.id) || [];
      const animationsNeedingKeyframes = localAnimationIds.filter(id => !animationIdsWithKeyframes.has(id));

      if (animationsNeedingKeyframes.length > 0 && localStorageData?.keyframes) {
        const localKeyframes = localStorageData.keyframes.filter(
          k => animationsNeedingKeyframes.includes(k.animation_id)
        );
        if (localKeyframes.length > 0) {
          console.log(`[Nova Player] Merging ${keyframes.length} DB keyframes + ${localKeyframes.length} localStorage keyframes`);
          return [...keyframes, ...localKeyframes];
        }
      }
      return keyframes;
    }

    if (localStorageData?.keyframes && localStorageData.keyframes.length > 0) {
      console.log(`[Nova Player] Using ${localStorageData.keyframes.length} keyframes from localStorage`);
      return localStorageData.keyframes;
    }

    return [];
  }, [keyframes, localStorageData]);

  // Load fonts for all elements when they change
  // This ensures fonts are available before rendering in the player
  useEffect(() => {
    if (mergedElements.length === 0) return;

    // Extract unique font families from all elements
    const fontFamilies = new Set<string>();
    const systemFontFamilies = new Set(SYSTEM_FONTS.map(f => f.family));

    mergedElements.forEach(element => {
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
      console.log('[Nova Player] Loading fonts:', fontsToLoad);
      loadFonts(fontsToLoad);
    }
  }, [mergedElements]);

  // Apply content overrides to elements for a specific instance
  // This function allows each instance to have its own payload data
  // Also resolves bindings using the instance's current data record
  const applyInstanceOverrides = useCallback((
    elements: Element[],
    instanceId: string,
    embeddedBindings?: Binding[],
    embeddedRecord?: Record<string, unknown> | null
  ): Element[] => {
    const overrides = instanceOverrides.get(instanceId);
    // Try embedded bindings first (from LayerTemplateState), then fall back to instanceBindingData
    const stateBindingData = instanceBindingData.get(instanceId);
    const bindingData = (embeddedBindings && embeddedBindings.length > 0)
      ? { bindings: embeddedBindings, currentRecord: embeddedRecord || null }
      : stateBindingData;


    return elements.map(element => {
      let updatedElement = element;

      // First, try to resolve bindings if we have binding data
      if (bindingData?.bindings && bindingData.currentRecord) {
        const binding = bindingData.bindings.find(b => b.element_id === element.id);
        if (binding) {
          const boundValue = getBoundValue(binding, bindingData.currentRecord);
          if (boundValue !== undefined && boundValue !== null) {
            const valueStr = String(boundValue);
            if (element.content?.type === 'text') {
              updatedElement = {
                ...updatedElement,
                content: { ...updatedElement.content, text: valueStr },
              } as Element;
            } else if (element.content?.type === 'image') {
              updatedElement = {
                ...updatedElement,
                content: { ...updatedElement.content, src: valueStr, url: valueStr },
              } as unknown as Element;
            } else if (element.content?.type === 'icon') {
              // For icon elements, update the iconName with the bound value
              updatedElement = {
                ...updatedElement,
                content: { ...updatedElement.content, iconName: valueStr },
              } as Element;
            }
          }
        }
      }

      // Also resolve any {{field.path}} placeholders in text content
      if (updatedElement.content?.type === 'text' && bindingData?.currentRecord) {
        const text = updatedElement.content.text;
        if (text && typeof text === 'string' && text.includes('{{')) {
          const resolvedText = text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = getNestedValue(bindingData.currentRecord!, path.trim());
            return value !== undefined && value !== null ? String(value) : match;
          });
          if (resolvedText !== text) {
            updatedElement = {
              ...updatedElement,
              content: { ...updatedElement.content, text: resolvedText },
            } as Element;
          }
        }
      }

      // Also resolve any {{field.path}} placeholders in icon content (iconName)
      if (updatedElement.content?.type === 'icon' && bindingData?.currentRecord) {
        const iconName = updatedElement.content.iconName;
        if (iconName && typeof iconName === 'string' && iconName.includes('{{')) {
          const resolvedIconName = iconName.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = getNestedValue(bindingData.currentRecord!, path.trim());
            return value !== undefined && value !== null ? String(value) : match;
          });
          if (resolvedIconName !== iconName) {
            updatedElement = {
              ...updatedElement,
              content: { ...updatedElement.content, iconName: resolvedIconName },
            } as Element;
          }
        }
      }

      // Then apply payload overrides (these take priority over binding resolution)
      if (overrides && Object.keys(overrides).length > 0) {
        // Check by ID
        if (overrides[element.id] !== undefined) {
          const override = overrides[element.id];
          if (element.content?.type === 'text') {
            updatedElement = {
              ...updatedElement,
              content: { ...updatedElement.content, text: override },
            } as Element;
          } else if (element.content?.type === 'image') {
            updatedElement = {
              ...updatedElement,
              content: { ...updatedElement.content, src: override ?? undefined, url: override ?? undefined },
            } as unknown as Element;
          }
        }

        // Check for ticker items override (key format: `${elementId}_items`)
        const tickerItemsKey = `${element.id}_items`;
        if (overrides[tickerItemsKey] !== undefined && element.content?.type === 'ticker') {
          try {
            const itemsOverride = typeof overrides[tickerItemsKey] === 'string'
              ? JSON.parse(overrides[tickerItemsKey])
              : overrides[tickerItemsKey];

            if (Array.isArray(itemsOverride)) {
              updatedElement = {
                ...updatedElement,
                content: { ...updatedElement.content, items: itemsOverride },
              } as Element;
            }
          } catch (e) {
            console.warn('Failed to parse ticker items override:', e);
          }
        }

        // Check by element name
        const elementNameLower = updatedElement.name?.toLowerCase().replace(/\s+/g, '_');
        for (const [key, value] of Object.entries(overrides)) {
          const keyLower = key.toLowerCase().replace(/\s+/g, '_');
          if (elementNameLower === keyLower || updatedElement.name === key) {
            if (updatedElement.content?.type === 'text') {
              updatedElement = {
                ...updatedElement,
                content: { ...updatedElement.content, text: value },
              } as Element;
            } else if (updatedElement.content?.type === 'image') {
              updatedElement = {
                ...updatedElement,
                content: { ...updatedElement.content, src: value ?? undefined, url: value ?? undefined },
              } as unknown as Element;
            }
          }
        }
      }


      return updatedElement;
    });
  }, [instanceOverrides, instanceBindingData]);

  // For backwards compatibility and always-on elements (no instance context)
  const elementsWithOverrides = mergedElements;

  // Get always-on layer IDs
  const alwaysOnLayerIds = useMemo(() => {
    return new Set(
      layers
        .filter(l => l.always_on && l.enabled !== false)
        .map(l => l.id)
    );
  }, [layers]);

  // Get template IDs for always-on layers
  const alwaysOnTemplateIds = useMemo(() => {
    return new Set(
      templates
        .filter(t => alwaysOnLayerIds.has(t.layer_id) && t.enabled !== false)
        .map(t => t.id)
    );
  }, [templates, alwaysOnLayerIds]);

  // Get all active template IDs from layerTemplates (both incoming and outgoing during transitions)
  const activeLayerTemplateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const states of layerTemplates.values()) {
      for (const state of states) {
        ids.add(state.templateId);
      }
    }
    return ids;
  }, [layerTemplates]);

  // Get all active template instances for rendering
  // This is crucial for animated switching - we need to render BOTH outgoing and incoming instances
  const activeInstances = useMemo(() => {
    const instances: LayerTemplateState[] = [];
    for (const states of layerTemplates.values()) {
      for (const state of states) {
        instances.push(state);
      }
    }
    return instances;
  }, [layerTemplates]);


  // Get visible elements - includes always-on templates AND all active layer templates (both incoming and outgoing)
  const visibleElements = useMemo(() => {
    // Collect elements from always-on templates
    const alwaysOnElements = elementsWithOverrides.filter(
      e => alwaysOnTemplateIds.has(e.template_id) && e.visible !== false && !e.parent_element_id
    );

    // Collect elements from active layer templates (includes both incoming and outgoing during transitions)
    const layerTemplateElements = elementsWithOverrides.filter(
      e => activeLayerTemplateIds.has(e.template_id) &&
           !alwaysOnTemplateIds.has(e.template_id) &&
           e.visible !== false &&
           !e.parent_element_id
    );

    // Fallback: if no layer templates tracked, use legacy currentTemplateId
    const legacyTriggeredElements = (isOnAir && currentTemplateId &&
      !alwaysOnTemplateIds.has(currentTemplateId) &&
      !activeLayerTemplateIds.has(currentTemplateId))
      ? elementsWithOverrides.filter(
          e => e.template_id === currentTemplateId && e.visible !== false && !e.parent_element_id
        )
      : [];

    // Build lookup maps for efficient z_index calculation
    const templateToLayer = new Map(templates.map(t => [t.id, t.layer_id]));
    const layerZIndex = new Map(layers.map(l => [l.id, l.z_index ?? 0]));

    // Combine, add effectiveZIndex, and sort
    return [...alwaysOnElements, ...layerTemplateElements, ...legacyTriggeredElements]
      .map(e => {
        const layerId = templateToLayer.get(e.template_id);
        const layerZ = layerId ? (layerZIndex.get(layerId) ?? 0) : 0;
        return { ...e, effectiveZIndex: layerZ + (e.z_index ?? 0) };
      })
      .sort((a, b) => {
        // Sort by effectiveZIndex (layer z_index + element z_index)
        return (a.effectiveZIndex ?? 0) - (b.effectiveZIndex ?? 0);
      });
  }, [elementsWithOverrides, alwaysOnTemplateIds, activeLayerTemplateIds, currentTemplateId, isOnAir, templates, layers]);

  // Get animations for current phase
  const currentAnimations = useMemo(() => {
    const visibleElementIds = new Set(visibleElements.map(e => e.id));
    const allRelatedElements = elementsWithOverrides.filter(e =>
      visibleElementIds.has(e.id) ||
      (e.parent_element_id && visibleElementIds.has(e.parent_element_id))
    );
    const allIds = new Set(allRelatedElements.map(e => e.id));

    return mergedAnimations.filter(
      (a) => currentPhase === a.phase && allIds.has(a.element_id)
    );
  }, [mergedAnimations, currentPhase, visibleElements, elementsWithOverrides]);

  // Calculate max duration - use phase duration from settings (matches Preview.tsx)
  const maxDuration = useMemo(() => {
    // Primary: Use the phase duration from project settings
    const phaseDuration = phaseDurations[currentPhase] || 1500;

    // Get max from animations (for reference, but phase duration takes priority)
    const maxAnim = Math.max(0, ...currentAnimations.map((a) => a.delay + a.duration));

    // Use phase duration from settings, but ensure it's at least as long as any animation
    return Math.max(phaseDuration, maxAnim);
  }, [currentAnimations, currentPhase, phaseDurations]);

  // Get max duration for a specific template's animations
  const getMaxDurationForTemplate = useCallback((templateId: string, phase: AnimationPhase): number => {
    // Primary: Use the phase duration from project settings (matches Preview.tsx behavior)
    const phaseDuration = phaseDurations[phase] || (phase === 'out' ? 500 : 1500);

    const templateAnimations = mergedAnimations.filter(
      a => a.phase === phase && mergedElements.some(e => e.id === a.element_id && e.template_id === templateId)
    );

    // Get max from animations
    const maxAnim = templateAnimations.length > 0
      ? Math.max(0, ...templateAnimations.map(a => a.delay + a.duration))
      : 0;

    // Use phase duration from settings, but ensure it's at least as long as any animation
    return Math.max(phaseDuration, maxAnim);
  }, [mergedAnimations, mergedElements, phaseDurations]);

  // Ref to track current getMaxDurationForTemplate to avoid stale closures
  const getMaxDurationForTemplateRef = useRef(getMaxDurationForTemplate);
  useEffect(() => {
    getMaxDurationForTemplateRef.current = getMaxDurationForTemplate;
  }, [getMaxDurationForTemplate]);

  // Animation playback loop - handles both legacy and per-layer animations
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

      // Update legacy playhead (for backwards compatibility)
      setPlayheadPosition((prev) => {
        const newPosition = prev + delta;

        if (newPosition >= maxDuration) {
          if (currentPhase === 'in') {
            setCurrentPhase('loop');
            return 0;
          } else if (currentPhase === 'loop') {
            return 0;
          } else if (currentPhase === 'out') {
            setIsPlaying(false);
            setIsOnAir(false);
            return maxDuration;
          }
        }

        return newPosition;
      });

      // Update per-layer template animations
      // Track instances that finished their OUT animation for cleanup
      const finishedInstanceIds: string[] = [];

      setLayerTemplates(prev => {
        if (prev.size === 0) return prev;

        let hasChanges = false;
        const next = new Map(prev);
        const getDuration = getMaxDurationForTemplateRef.current;

        for (const [layerId, states] of next.entries()) {
          const updatedStates: LayerTemplateState[] = [];

          for (const state of states) {
            const templateMaxDuration = getDuration(state.templateId, state.phase);
            const newPosition = state.playheadPosition + delta;

            if (newPosition >= templateMaxDuration) {
              // Phase complete for this template
              if (state.phase === 'in') {
                // Transition to loop - PRESERVE embeddedElements!
                hasChanges = true;
                const newState = {
                  ...state,
                  phase: 'loop' as const,
                  playheadPosition: 0,
                  lastTime: timestamp,
                };
                updatedStates.push(newState);
              } else if (state.phase === 'loop' && !state.isOutgoing) {
                // Continue looping
                updatedStates.push({
                  ...state,
                  playheadPosition: 0,
                  lastTime: timestamp,
                });
              } else if (state.phase === 'out' || state.isOutgoing) {
                // OUT complete - remove this template from the layer
                hasChanges = true;
                // Track for payload cleanup
                finishedInstanceIds.push(state.instanceId);
                // Don't add to updatedStates - effectively removes it
              }
            } else {
              // Continue animation - always update playhead
              hasChanges = true;
              const updatedState: LayerTemplateState = {
                ...state,
                playheadPosition: newPosition,
                lastTime: timestamp,
              };
              // Verify embedded elements are preserved during animation
              if (state.embeddedElements && !(updatedState as LayerTemplateState).embeddedElements) {
                console.error('[Nova Player] BUG: embeddedElements lost during animation update!', {
                  stateHad: state.embeddedElements?.length,
                  updatedHas: (updatedState as LayerTemplateState).embeddedElements?.length,
                });
              }
              updatedStates.push(updatedState);
            }
          }

          if (updatedStates.length > 0) {
            next.set(layerId, updatedStates);
          } else {
            next.delete(layerId);
            hasChanges = true;
          }
        }

        // Check if all outgoing templates have finished
        const stillHasOutgoing = Array.from(next.values()).some(
          states => states.some(s => s.isOutgoing)
        );

        if (!stillHasOutgoing && prev.size > 0 && next.size === 0) {
          // All templates have finished their OUT animations
          setIsOnAir(false);
          setIsPlaying(false);
        }

        return hasChanges ? next : prev;
      });

      // Clean up payload overrides and binding data for instances that finished OUT animation
      // This prevents memory leaks from accumulating old instance payloads
      if (finishedInstanceIds.length > 0) {
        setInstanceOverrides(prev => {
          const next = new Map(prev);
          for (const instanceId of finishedInstanceIds) {
            next.delete(instanceId);
          }
          return next;
        });
        setInstanceBindingData(prev => {
          const next = new Map(prev);
          for (const instanceId of finishedInstanceIds) {
            next.delete(instanceId);
          }
          return next;
        });
      }

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
  }, [isPlaying, maxDuration, currentPhase]);

  // Reset playhead when phase changes
  useEffect(() => {
    setPlayheadPosition(0);
    lastTimeRef.current = 0;
  }, [currentPhase]);

  const canvasWidth = project?.canvas_width || 1920;
  const canvasHeight = project?.canvas_height || 1080;

  // Helper to compute effectiveZIndex for an element based on its layer
  const getEffectiveZIndex = useCallback((element: Element): number => {
    const template = templates.find(t => t.id === element.template_id);
    const layer = template ? layers.find(l => l.id === template.layer_id) : null;
    const layerZ = layer?.z_index ?? 0;
    return layerZ + (element.z_index ?? 0);
  }, [templates, layers]);

  // Helper to add effectiveZIndex to an element
  const withEffectiveZIndex = useCallback((element: Element): Element & { effectiveZIndex: number } => {
    return { ...element, effectiveZIndex: getEffectiveZIndex(element) };
  }, [getEffectiveZIndex]);

  return (
    <div
      className="w-screen h-screen overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Debug overlay */}
      {isDebug && (
        <div className="fixed top-4 left-4 z-50 bg-black/70 text-white text-xs px-3 py-2 rounded-lg font-mono space-y-1">
          <div>Channel: {channelId}</div>
          <div>Status: {connectionStatus}</div>
          <div>On Air: {isOnAir ? 'YES' : 'NO'}</div>
          <div>Phase: {currentPhase}</div>
          <div>Playing: {isPlaying ? 'YES' : 'NO'}</div>
          {project && <div>Project: {project.name}</div>}
          {currentTemplate && <div>Template: {currentTemplate.name}</div>}
          <div className="border-t border-white/20 pt-1 mt-1">
            <div>Layers: {layers.length} (always-on: {alwaysOnLayerIds.size})</div>
            <div>Templates: {templates.length} (always-on: {alwaysOnTemplateIds.size})</div>
            <div>All Elements: {elements.length}</div>
            <div>Visible Elements: {visibleElements.length}</div>
            <div>Active Templates: {activeLayerTemplateIds.size}</div>
            <div>Active Instances: {activeInstances.length}</div>
            <div>Layer States: {layerTemplates.size}</div>
            <div>Playhead: {Math.round(playheadPosition)}ms</div>
          </div>
          {/* Show active layer transitions */}
          {layerTemplates.size > 0 ? (
            <div className="border-t border-white/20 pt-1 mt-1">
              <div className="text-yellow-400">Active Layer Transitions:</div>
              {Array.from(layerTemplates.entries()).map(([layerId, states]) => {
                const layer = layers.find(l => l.id === layerId);
                return (
                  <div key={layerId} className="pl-2">
                    <div className="text-gray-400">{layer?.name || layerId}:</div>
                    {states.map((state) => {
                      const template = templates.find(t => t.id === state.templateId);
                      return (
                        <div key={state.instanceId} className="pl-2">
                          {state.isOutgoing ? '← OUT' : '→ IN'}: {template?.name || state.templateId} ({state.phase} @ {Math.round(state.playheadPosition)}ms) [{state.instanceId?.slice(0,6)}]
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-t border-white/20 pt-1 mt-1 text-gray-500">
              No active layer transitions
            </div>
          )}
          {/* Show instance overrides and bindings status */}
          <div className="border-t border-white/20 pt-1 mt-1">
            <div className="text-cyan-400">Binding Status:</div>
            <div className="pl-2">Overrides: {instanceOverrides.size} instances</div>
            <div className="pl-2">Binding Data: {instanceBindingData.size} instances</div>
            {Array.from(instanceOverrides.entries()).slice(0, 2).map(([instId, overrides]) => (
              <div key={instId} className="pl-2 text-xs text-gray-400">
                [{instId.slice(0,6)}]: {Object.keys(overrides || {}).length} overrides
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection status */}
      {!isReady && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white text-sm px-4 py-2 rounded-lg ${
          connectionStatus === 'connecting' ? 'bg-red-600' : 'bg-red-700'
        }`}>
          {connectionStatus === 'connecting' && 'Connecting to channel...'}
          {connectionStatus === 'error' && 'Connection error'}
        </div>
      )}

      {/* Canvas container - scales to fill viewport */}
      <div
        className="relative"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          transform: `scale(${windowSize.width / canvasWidth}, ${windowSize.height / canvasHeight})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Render always-on elements (static, no animation switching) */}
        {elementsWithOverrides
          .filter(e => alwaysOnTemplateIds.has(e.template_id) && e.visible !== false && !e.parent_element_id)
          .map(withEffectiveZIndex)
          .sort((a, b) => (a.effectiveZIndex || 0) - (b.effectiveZIndex || 0))
          .map((element) => (
            <PlayerElement
              key={`always-on-${element.id}`}
              element={element}
              allElements={elementsWithOverrides}
              animations={mergedAnimations}
              keyframes={mergedKeyframes}
              playheadPosition={0}
              currentPhase="loop"
              isPlaying={isPlaying}
              isAlwaysOn={true}
              phaseDuration={phaseDurations.loop}
              isInteractiveMode={isInteractiveMode}
              onElementClick={handleElementClick}
            />
          ))}

        {/* Render each active instance's elements - crucial for animated switching */}
        {/* This renders BOTH outgoing (animating OUT) and incoming (animating IN) instances */}
        {/* Each instance gets its own payload overrides applied - critical for same template back-to-back */}
        {activeInstances.map((instance) => {
          // PRIORITY: Use embedded elements from instance if available (bypasses React state timing)
          // Fall back to mergedElements from state if no embedded data
          const hasEmbeddedData = !!instance.embeddedElements && instance.embeddedElements.length > 0;

          const sourceElements: Element[] = hasEmbeddedData ? instance.embeddedElements! : mergedElements;
          const sourceAnimations: Animation[] = instance.embeddedAnimations || mergedAnimations;
          const sourceKeyframes: Keyframe[] = instance.embeddedKeyframes || mergedKeyframes;

          // Resolve template ID - but skip resolution if using embedded data (we trust the command's templateId)
          const resolvedTemplateId = hasEmbeddedData ? instance.templateId : resolveTemplateId(instance.templateId);

          // Get elements for this template and apply instance-specific overrides
          // For embedded data, we use ALL elements (they're already filtered for this template)
          // For state data, we filter by template_id
          const templateElements = hasEmbeddedData
            ? sourceElements.filter(
                e => e.visible !== false && !e.parent_element_id
              )
            : sourceElements.filter(
                e => e.template_id === resolvedTemplateId &&
                     !alwaysOnTemplateIds.has(e.template_id) &&
                     e.visible !== false &&
                     !e.parent_element_id
              );


          // Apply this instance's payload overrides (each instance has its own payload data)
          // Pass embedded binding data from LayerTemplateState for immediate resolution
          const instanceElements = applyInstanceOverrides(
            templateElements,
            instance.instanceId,
            instance.embeddedBindings,
            instance.embeddedRecord
          );
          // Also apply overrides to allElements for child element lookups
          const allElementsForInstance = applyInstanceOverrides(
            sourceElements,
            instance.instanceId,
            instance.embeddedBindings,
            instance.embeddedRecord
          );

          return instanceElements
            .map(withEffectiveZIndex)
            .sort((a, b) => (a.effectiveZIndex || 0) - (b.effectiveZIndex || 0))
            .map((element) => (
              <PlayerElement
                key={`${instance.instanceId}-${element.id}`}
                element={element}
                allElements={allElementsForInstance}
                animations={sourceAnimations}
                keyframes={sourceKeyframes}
                playheadPosition={instance.playheadPosition}
                currentPhase={instance.phase}
                isPlaying={isPlaying}
                isAlwaysOn={false}
                phaseDuration={phaseDurations[instance.phase]}
                isInteractiveMode={isInteractiveMode}
                onElementClick={handleElementClick}
              />
            ));
        })}

        {/* Legacy fallback: if no layer templates tracked, use currentTemplateId */}
        {activeInstances.length === 0 && isOnAir && currentTemplateId && !alwaysOnTemplateIds.has(currentTemplateId) && (
          elementsWithOverrides
            .filter(e => e.template_id === currentTemplateId && e.visible !== false && !e.parent_element_id)
            .map(withEffectiveZIndex)
            .sort((a, b) => (a.effectiveZIndex || 0) - (b.effectiveZIndex || 0))
            .map((element) => (
              <PlayerElement
                key={`legacy-${element.id}`}
                element={element}
                allElements={elementsWithOverrides}
                animations={mergedAnimations}
                keyframes={mergedKeyframes}
                playheadPosition={playheadPosition}
                currentPhase={currentPhase}
                isPlaying={isPlaying}
                isAlwaysOn={false}
                phaseDuration={phaseDurations[currentPhase]}
                isInteractiveMode={isInteractiveMode}
                onElementClick={handleElementClick}
              />
            ))
        )}
      </div>
    </div>
  );
}

// Player Element - renders a single element with animations
// (Same as PreviewElement from Preview.tsx)
interface PlayerElementProps {
  element: Element;
  allElements: Element[];
  animations: Animation[];
  keyframes: Keyframe[];
  playheadPosition: number;
  currentPhase: AnimationPhase;
  isPlaying: boolean;
  isAlwaysOn?: boolean;
  phaseDuration: number;
  isInteractiveMode?: boolean;
  onElementClick?: (elementId: string, elementName?: string) => void;
}

function PlayerElement({
  element,
  allElements,
  animations,
  keyframes,
  playheadPosition,
  currentPhase,
  isPlaying,
  isAlwaysOn = false,
  phaseDuration,
  isInteractiveMode = false,
  onElementClick,
}: PlayerElementProps) {
  // For always-on elements, use 'loop' phase at position 0 (static display)
  const effectivePhase = isAlwaysOn ? 'loop' : currentPhase;
  const effectivePosition = isAlwaysOn ? 0 : playheadPosition;

  const animatedProps = useMemo(() => {
    return getAnimatedProperties(element, animations, keyframes, effectivePosition, effectivePhase, false, phaseDuration);
  }, [element, animations, keyframes, effectivePosition, effectivePhase, phaseDuration]);

  // Check if this element has explicit OUT animations
  const hasOutAnimations = useMemo(() => {
    return animations.some(a => a.element_id === element.id && a.phase === 'out');
  }, [animations, element.id]);

  const children = allElements
    .filter((e) => e.parent_element_id === element.id && e.visible !== false)
    .sort((a, b) => (a.z_index || a.sort_order || 0) - (b.z_index || b.sort_order || 0));

  // Calculate opacity - apply fallback fade-out if no explicit OUT animation
  const animatedOpacity = useMemo(() => {
    if (animatedProps.opacity !== undefined) {
      return Number(animatedProps.opacity);
    }

    // If in OUT phase with no explicit OUT animation, apply default fade-out
    if (effectivePhase === 'out' && !hasOutAnimations) {
      // Default 500ms fade out
      const outDuration = 500;
      const progress = Math.min(effectivePosition / outDuration, 1);
      const baseOpacity = element.opacity ?? 1;
      return baseOpacity * (1 - progress);
    }

    return element.opacity ?? 1;
  }, [animatedProps.opacity, effectivePhase, hasOutAnimations, effectivePosition, element.opacity]);

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
    zIndex: (element as any).effectiveZIndex ?? element.z_index ?? 0,
    ...element.styles,
    ...Object.fromEntries(
      Object.entries(animatedProps).filter(([key]) =>
        !['opacity', 'position_x', 'position_y', 'rotation', 'scale_x', 'scale_y', 'width', 'height', 'transform'].includes(key)
      )
    ),
  };

  const renderContent = () => {
    switch (element.content.type) {
      case 'text': {
        const textContent = element.content;
        const verticalAlign = element.styles?.verticalAlign || 'middle';
        const alignItemsMap: Record<string, string> = {
          top: 'flex-start',
          middle: 'center',
          bottom: 'flex-end',
        };

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

        const elementAnimations = animations.filter(a => a.element_id === element.id);
        const animationDuration = elementAnimations.reduce((max, a) => Math.max(max, (a.duration || 1000)), 1000);

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
        const animatedBgColor = animatedProps.backgroundColor;
        // Cast to extended type that includes glow and texture
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

        const gradientValue = (() => {
          if (!gradient?.enabled || !gradient.colors || gradient.colors.length < 2) {
            return null;
          }

          const colorStops = [...gradient.colors]
            .sort((a: { stop: number }, b: { stop: number }) => a.stop - b.stop)
            .map((c: { color: string; stop: number }) => `${c.color} ${c.stop}%`)
            .join(', ');

          if (gradient.type === 'linear') {
            return `linear-gradient(${gradient.direction || 0}deg, ${colorStops})`;
          } else if (gradient.type === 'radial') {
            const pos = gradient.radialPosition || { x: 50, y: 50 };
            return `radial-gradient(circle at ${pos.x}% ${pos.y}%, ${colorStops})`;
          } else if (gradient.type === 'conic') {
            return `conic-gradient(from ${gradient.direction || 0}deg, ${colorStops})`;
          }
          return null;
        })();

        const glassStyles: React.CSSProperties = (() => {
          if (!glass?.enabled) return {};

          const fillColor = shapeContent.fill || '#000000';
          const glassOpacity = glass.opacity !== undefined ? glass.opacity : 0.6;

          const getBorder = () => {
            if (glass.borderWidth === 0) return 'none';
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

        // Multiply glow intensity by animated opacity so glow fades with element
        const glowStyle: React.CSSProperties = (() => {
          if (!glow?.enabled) return {};

          const glowColor = glow.color || shapeContent.fill || '#8B5CF6';
          const blur = glow.blur ?? 20;
          const spread = glow.spread ?? 0;
          const baseIntensity = glow.intensity ?? 0.6;
          // Apply animated opacity to glow intensity for proper fade in/out
          const intensity = baseIntensity * (animatedOpacity ?? 1);

          let colorWithAlpha = glowColor;
          if (glowColor.startsWith('#')) {
            const hex = glowColor.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            colorWithAlpha = `rgba(${r}, ${g}, ${b}, ${intensity})`;
          }

          return {
            boxShadow: `0 0 ${blur}px ${spread}px ${colorWithAlpha}`,
          };
        })();

        const bgColorValue = typeof animatedBgColor === 'string'
          ? animatedBgColor
          : (shapeContent.fill || 'transparent');

        const baseStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          borderRadius: shapeContent.shape === 'ellipse' ? '50%' : shapeContent.cornerRadius || 0,
        };

        if (glass?.enabled && gradientValue) {
          return (
            <div style={{
              ...baseStyle,
              background: gradientValue,
              position: 'relative',
              overflow: 'hidden',
              ...glowStyle,
              ...(element.styles || {}),
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: `rgba(255, 255, 255, ${(glass.opacity || 0.3) * 0.1})`,
                backdropFilter: `blur(${glass.blur || 16}px)`,
                borderRadius: 'inherit',
              }} />
            </div>
          );
        }

        if (glass?.enabled) {
          return <div style={{ ...baseStyle, ...glassStyles, ...glowStyle, ...(element.styles || {}) }} />;
        }

        if (gradientValue) {
          return <div style={{ ...baseStyle, background: gradientValue, ...glowStyle, ...(element.styles || {}) }} />;
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

        return <div style={{
          ...baseStyle,
          backgroundColor: bgColorValue,
          ...(shapeContent.stroke && shapeContent.strokeWidth ? {
            border: `${shapeContent.strokeWidth}px solid ${shapeContent.stroke}`,
          } : {}),
          ...glowStyle,
          ...(element.styles || {}),
        }} />;
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

      case 'map': {
        const mapContent = element.content as typeof element.content & {
          locationKeyframes?: Array<{ time: number; phase?: string }>;
        };

        // Check if we have location keyframes for flight path animation
        const hasLocationKeyframes = mapContent.locationKeyframes && mapContent.locationKeyframes.length >= 2;

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
            playheadPosition={effectivePosition}
            currentPhase={effectivePhase}
          />
        );
      }

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
      case 'div':
        return <div style={{ width: '100%', height: '100%', ...element.styles }} />;

      default:
        return null;
    }
  };

  // Handle click on this element
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isInteractiveMode || !onElementClick) return;

    // Stop propagation so parent elements don't also trigger
    e.stopPropagation();


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
        <PlayerElement
          key={child.id}
          element={child}
          allElements={allElements}
          animations={animations}
          keyframes={keyframes}
          playheadPosition={playheadPosition}
          currentPhase={currentPhase}
          isPlaying={isPlaying}
          isAlwaysOn={isAlwaysOn}
          phaseDuration={phaseDuration}
          isInteractiveMode={isInteractiveMode}
          onElementClick={onElementClick}
        />
      ))}
    </div>
  );
}

export default NovaPlayer;
