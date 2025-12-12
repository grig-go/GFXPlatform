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
import type { Element, Animation, Keyframe, Template, Project, AnimationPhase, Layer } from '@emergent-platform/types';

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

  // Project data (from Supabase)
  const [project, setProject] = useState<Project | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [elements, setElements] = useState<Element[]>([]);
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);

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
  // Per-template content overrides - Map<templateId, overrides>
  const [templateOverrides, setTemplateOverrides] = useState<Map<string, Record<string, string | null>>>(new Map());
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

  // Track loaded project ID to prevent redundant loads
  const loadedProjectIdRef = useRef<string | null>(null);
  // Cache loaded data in refs for immediate access (React state updates are async)
  const loadedLayersRef = useRef<Layer[]>([]);
  const loadedTemplatesRef = useRef<Template[]>([]);

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
        const animKeyframes = keyframesResult.data || [];
        console.log(`[Nova Player] Animation ${anim.id} (${anim.phase}) has ${animKeyframes.length} keyframes`);
        return animKeyframes;
      });

      const keyframeResults = await Promise.all(keyframeFetches);
      for (const kfs of keyframeResults) {
        allKeyframes.push(...kfs);
      }

      console.log(`[Nova Player] Loaded ${allAnimations.length} animations, ${allKeyframes.length} keyframes total`);
      setElements(allElements);
      setAnimations(allAnimations);
      setKeyframes(allKeyframes);

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
  }, []);


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

            // Merge embedded elements into state (use command data directly)
            // This ensures we have the element data immediately available for rendering
            setElements(prev => {
              // Filter out existing elements for this template, add new ones
              const otherElements = prev.filter(e => e.template_id !== templateId);
              const newElements = embeddedElements.map((el: any) => ({
                ...el,
                template_id: templateId,
              }));
              return [...otherElements, ...newElements];
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

          // Background load project data for future use (non-blocking)
          // Only if we don't have embedded data or need layer resolution
          if (cmd.template.projectId && (!hasEmbeddedData || !layerId)) {
            // Fire and forget - don't await
            loadProject(cmd.template.projectId).then(result => {
              if (!layerId && result.layers.length > 0 && cmd.layerIndex !== undefined) {
                // Late resolution - template may have already started playing
                console.log(`[Nova Player] Late layer resolution from loaded project`);
              }
            }).catch(err => {
              console.warn(`[Nova Player] Background project load failed (non-critical):`, err);
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

          // Generate unique instance ID for this play command
          const newInstanceId = crypto.randomUUID();

          if (layerId) {
            // Layer-based animated switching
            setLayerTemplates(prev => {
              console.log(`[Nova Player] setLayerTemplates called for layer ${layerId}, prev size:`, prev.size);
              console.log(`[Nova Player] Prev entries:`, Array.from(prev.entries()).map(([lid, states]) =>
                `${lid}: [${states.map(s => `${s.templateId}(${s.phase}, outgoing=${s.isOutgoing}, instance=${s.instanceId?.slice(0,8)})`).join(', ')}]`
              ));

              const next = new Map(prev);
              const existingStates = next.get(layerId!) || [];
              console.log(`[Nova Player] Existing states for layer ${layerId}:`, existingStates.length,
                existingStates.map(s => `${s.templateId}(${s.phase}, outgoing=${s.isOutgoing})`));

              // Check if there's already a template playing on this layer (not outgoing)
              const currentTemplate = existingStates.find(s => !s.isOutgoing && s.phase !== 'out');
              console.log(`[Nova Player] Current template on layer:`, currentTemplate
                ? `${currentTemplate.templateId} (phase=${currentTemplate.phase})`
                : 'none');

              if (currentTemplate) {
                // Template already playing - animate it OUT while new one comes IN
                // This works for BOTH different templates AND same template with new payload
                console.log(`[Nova Player] *** ANIMATED SWITCH *** on layer ${layerId}: ${currentTemplate.templateId} -> ${templateId} (new instance)`);

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
                };

                next.set(layerId!, [outgoingState, incomingState]);
              } else {
                // No template currently playing - just add the new one
                console.log(`[Nova Player] No current template on layer ${layerId} - adding ${templateId}`);
                next.set(layerId!, [{
                  templateId,
                  instanceId: newInstanceId,
                  phase: 'in',
                  playheadPosition: 0,
                  lastTime: 0,
                  isOutgoing: false,
                }]);
              }

              console.log(`[Nova Player] setLayerTemplates result, next size:`, next.size, 'entries:', Array.from(next.entries()));
              return next;
            });
          } else {
            console.warn(`[Nova Player] No layerId found for template ${templateId}, falling back to legacy mode`);
          }

          setCurrentTemplateId(templateId);

          // Store payload per-template (only affects elements of this specific template)
          if (cmd.payload) {
            setTemplateOverrides(prev => {
              const next = new Map(prev);
              next.set(templateId, cmd.payload!);
              return next;
            });
          }
        }
        setIsOnAir(true);
        // Start IN animation
        setCurrentPhase('in');
        setPlayheadPosition(0);
        lastTimeRef.current = 0;
        setIsPlaying(true);
        break;

      case 'load':
        if (cmd.template?.projectId) {
          if (!project || project.id !== cmd.template.projectId) {
            await loadProject(cmd.template.projectId);
          }
          setCurrentTemplateId(cmd.template.id);
          // Store payload per-template
          if (cmd.payload) {
            setTemplateOverrides(prev => {
              const next = new Map(prev);
              next.set(cmd.template!.id, cmd.payload!);
              return next;
            });
          }
        }
        // Don't play yet
        setIsOnAir(false);
        setIsPlaying(false);
        setCurrentPhase('in');
        setPlayheadPosition(0);
        break;

      case 'update':
        // Update requires a template reference to know which template's elements to update
        if (cmd.payload && cmd.template?.id) {
          setTemplateOverrides(prev => {
            const next = new Map(prev);
            const existing = next.get(cmd.template!.id) || {};
            next.set(cmd.template!.id, { ...existing, ...cmd.payload });
            return next;
          });
        } else if (cmd.payload && currentTemplateId) {
          // Fallback to current template if no template specified
          setTemplateOverrides(prev => {
            const next = new Map(prev);
            const existing = next.get(currentTemplateId!) || {};
            next.set(currentTemplateId!, { ...existing, ...cmd.payload });
            return next;
          });
        }
        break;

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
        setTemplateOverrides(new Map());
        setCurrentPhase('in');
        setPlayheadPosition(0);
        setLayerTemplates(new Map());
        break;

      case 'initialize':
        // Reset state first
        setIsOnAir(false);
        setIsPlaying(false);
        setCurrentTemplateId(null);
        setTemplateOverrides(new Map());
        setCurrentPhase('in');
        setPlayheadPosition(0);
        setLayerTemplates(new Map());

        // Load the project data if projectId is provided
        if (cmd.projectId) {
          console.log(`[Nova Player] Initialize: Loading project ${cmd.projectId}`);
          loadProject(cmd.projectId).then(() => {
            console.log(`[Nova Player] Initialize: Project loaded successfully`);
          }).catch(err => {
            console.error(`[Nova Player] Initialize: Failed to load project:`, err);
          });
        }
        break;
    }
  }, [isOnAir, loadProject, layerTemplates, resolveLayerId, currentTemplateId]);

  // Ref to track current handleCommand to avoid stale closures in subscription
  const handleCommandRef = useRef(handleCommand);
  useEffect(() => {
    handleCommandRef.current = handleCommand;
  }, [handleCommand]);

  // Subscribe to channel commands and load initial project
  useEffect(() => {
    if (!channelId || !supabase) {
      setConnectionStatus('error');
      return;
    }

    console.log(`[Nova Player] Subscribing to channel: ${channelId}`);
    setConnectionStatus('connecting');

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
            console.log(`[Nova Player] Received command:`, state.pending_command.type);
            // Use ref to always call the latest handleCommand (avoids stale closure)
            handleCommandRef.current(state.pending_command);
          }
        }
      )
      .subscribe(async (status: string) => {
        console.log(`[Nova Player] Subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          setIsReady(true);
          markSupabaseSuccess(); // Mark successful realtime connection

          // Update player_status in pulsar_channels to 'connected'
          console.log(`[Nova Player] Updating channel status to connected`);
          await directRestUpdate(
            'pulsar_channels',
            {
              player_status: 'connected',
              last_heartbeat: new Date().toISOString(),
            },
            { column: 'id', value: channelId },
            5000
          );
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
          // Update player_status to 'error'
          await directRestUpdate(
            'pulsar_channels',
            { player_status: 'error' },
            { column: 'id', value: channelId },
            5000
          );
        }
      });

    // Load channel state using DIRECT REST API
    // Skip project loading here - commands contain embedded data for real-time playback
    // Project loading via Supabase client can timeout and block the player
    const loadChannelState = async () => {
      console.log(`[Nova Player] Loading channel state for channel: ${channelId}`);
      const startTime = Date.now();
      try {
        // Check for any pending command using direct REST
        const stateResult = await directRestSelect<{ pending_command: PlayerCommand | null; last_command: PlayerCommand | null }>(
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
        });

        // Execute pending command - the command handler will use embedded data
        if (stateData?.pending_command) {
          handleCommandRef.current(stateData.pending_command);
        }
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

  // Apply content overrides to elements - per-template basis
  const elementsWithOverrides = useMemo((): Element[] => {
    if (templateOverrides.size === 0) {
      return mergedElements;
    }

    return mergedElements.map(element => {
      // Get overrides for this element's template
      const overrides = templateOverrides.get(element.template_id);
      if (!overrides || Object.keys(overrides).length === 0) {
        return element;
      }

      let updatedElement = element;

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
            content: { ...updatedElement.content, src: override, url: override },
          } as Element;
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
              content: { ...updatedElement.content, src: value, url: value },
            } as Element;
          }
        }
      }

      return updatedElement;
    });
  }, [mergedElements, templateOverrides]);

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

    // Combine and sort by z_index
    return [...alwaysOnElements, ...layerTemplateElements, ...legacyTriggeredElements]
      .sort((a, b) => {
        // Get layer z_index for each element's template
        const templateA = templates.find(t => t.id === a.template_id);
        const templateB = templates.find(t => t.id === b.template_id);
        const layerA = layers.find(l => l.id === templateA?.layer_id);
        const layerB = layers.find(l => l.id === templateB?.layer_id);
        const layerZA = layerA?.z_index || 0;
        const layerZB = layerB?.z_index || 0;

        // First sort by layer z_index, then by element z_index
        if (layerZA !== layerZB) return layerZA - layerZB;
        return (a.z_index || 0) - (b.z_index || 0);
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

  // Calculate max duration
  const maxDuration = useMemo(() => {
    const maxAnim = Math.max(0, ...currentAnimations.map((a) => a.delay + a.duration));
    return Math.max(1000, maxAnim);
  }, [currentAnimations]);

  // Get max duration for a specific template's animations
  const getMaxDurationForTemplate = useCallback((templateId: string, phase: AnimationPhase): number => {
    const templateAnimations = mergedAnimations.filter(
      a => a.phase === phase && mergedElements.some(e => e.id === a.element_id && e.template_id === templateId)
    );

    // If no animations found for this phase
    if (templateAnimations.length === 0) {
      // For OUT phase, use fallback fade duration (500ms)
      // For other phases, use default 1000ms
      return phase === 'out' ? 500 : 1000;
    }

    const maxAnim = Math.max(0, ...templateAnimations.map(a => a.delay + a.duration));
    return Math.max(phase === 'out' ? 500 : 1000, maxAnim);
  }, [mergedAnimations, mergedElements]);

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

            // Log state during OUT animation for debugging
            if (state.phase === 'out' || state.isOutgoing) {
              console.log(`[Nova Player] OUT animation: ${state.templateId} on layer ${layerId}: pos=${Math.round(newPosition)}/${templateMaxDuration}, outgoing=${state.isOutgoing}`);
            }

            if (newPosition >= templateMaxDuration) {
              // Phase complete for this template
              if (state.phase === 'in') {
                // Transition to loop
                hasChanges = true;
                updatedStates.push({
                  ...state,
                  phase: 'loop',
                  playheadPosition: 0,
                  lastTime: timestamp,
                });
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
                console.log(`[Nova Player] Template ${state.templateId} finished OUT animation on layer ${layerId}`);
                // Don't add to updatedStates - effectively removes it
              }
            } else {
              // Continue animation - always update playhead
              hasChanges = true;
              updatedStates.push({
                ...state,
                playheadPosition: newPosition,
                lastTime: timestamp,
              });
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
          .sort((a, b) => (a.z_index || 0) - (b.z_index || 0))
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
            />
          ))}

        {/* Render each active instance's elements - crucial for animated switching */}
        {/* This renders BOTH outgoing (animating OUT) and incoming (animating IN) instances */}
        {activeInstances.map((instance) => {
          // Get elements for this template
          const instanceElements = elementsWithOverrides.filter(
            e => e.template_id === instance.templateId &&
                 !alwaysOnTemplateIds.has(e.template_id) &&
                 e.visible !== false &&
                 !e.parent_element_id
          );

          return instanceElements
            .sort((a, b) => (a.z_index || 0) - (b.z_index || 0))
            .map((element) => (
              <PlayerElement
                key={`${instance.instanceId}-${element.id}`}
                element={element}
                allElements={elementsWithOverrides}
                animations={mergedAnimations}
                keyframes={mergedKeyframes}
                playheadPosition={instance.playheadPosition}
                currentPhase={instance.phase}
                isPlaying={isPlaying}
                isAlwaysOn={false}
              />
            ));
        })}

        {/* Legacy fallback: if no layer templates tracked, use currentTemplateId */}
        {activeInstances.length === 0 && isOnAir && currentTemplateId && !alwaysOnTemplateIds.has(currentTemplateId) && (
          elementsWithOverrides
            .filter(e => e.template_id === currentTemplateId && e.visible !== false && !e.parent_element_id)
            .sort((a, b) => (a.z_index || 0) - (b.z_index || 0))
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
}: PlayerElementProps) {
  // For always-on elements, use 'loop' phase at position 0 (static display)
  const effectivePhase = isAlwaysOn ? 'loop' : currentPhase;
  const effectivePosition = isAlwaysOn ? 0 : playheadPosition;

  const animatedProps = useMemo(() => {
    return getAnimatedProperties(element, animations, keyframes, effectivePosition, effectivePhase);
  }, [element, animations, keyframes, effectivePosition, effectivePhase]);

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
    zIndex: element.z_index || 0,
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

        const glowStyle: React.CSSProperties = (() => {
          if (!glow?.enabled) return {};

          const glowColor = glow.color || shapeContent.fill || '#8B5CF6';
          const blur = glow.blur ?? 20;
          const spread = glow.spread ?? 0;
          const intensity = glow.intensity ?? 0.6;

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

      case 'group':
      case 'div':
        return <div style={{ width: '100%', height: '100%', ...element.styles }} />;

      default:
        return null;
    }
  };

  return (
    <div style={style}>
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
        />
      ))}
    </div>
  );
}

export default NovaPlayer;
