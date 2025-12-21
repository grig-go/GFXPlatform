/**
 * Interactive App Runtime Store
 *
 * Manages the runtime state for interactive applications.
 * Integrates with the designer store for element/template operations.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  InteractiveAppConfig,
  InteractiveAppRuntime,
  InteractionEvent,
  InteractionEventType,
  ElementEventHandler,
  ScriptContext,
  Element,
} from '@emergent-platform/types';

import {
  executeActions,
  ActionExecutorContext,
  buildScriptContext,
} from './action-executor';
import { evaluateExpression, evaluateCondition, getNestedValue, setNestedValue, setDesignerStoreRef } from './script-engine';
import { executeNodeGraph, createNodeRuntimeContext } from './visual-node-runtime';
import { setAddressValue } from '../address';
import type { Node, Edge } from '@xyflow/react';

// ============================================================================
// DESIGNER STORE INTEGRATION
// ============================================================================

// Lazy import to avoid circular dependencies
let designerStoreRef: typeof import('@/stores/designerStore').useDesignerStore | null = null;

/**
 * Get the designer store (lazy loaded to avoid circular deps)
 */
async function getDesignerStore() {
  if (!designerStoreRef) {
    const module = await import('@/stores/designerStore');
    designerStoreRef = module.useDesignerStore;
    // Also set the reference for script-engine element lookups
    setDesignerStoreRef(designerStoreRef);
  }
  return designerStoreRef.getState();
}

/**
 * Synchronously get designer store if already loaded
 */
function getDesignerStoreSync() {
  return designerStoreRef?.getState() ?? null;
}

/**
 * Debounce utility for event handlers
 */
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle utility for event handlers
 */
function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

// Handler cache for debounce/throttle
const debouncedHandlers = new Map<string, (...args: unknown[]) => void>();
const throttledHandlers = new Map<string, (...args: unknown[]) => void>();

// ============================================================================
// STORE TYPES
// ============================================================================

interface InteractiveStoreState {
  // Configuration
  config: InteractiveAppConfig | null;
  isInteractiveMode: boolean;

  // Code script for script execution (primary method)
  codeScript: string;

  // Visual node graph for script execution (optional, for basic users)
  visualNodes: Node[];
  visualEdges: Edge[];

  // Runtime state
  runtime: InteractiveAppRuntime;

  // Event processing
  isProcessingEvent: boolean;
  eventHistory: InteractionEvent[];

  // Actions
  initializeApp: (config: InteractiveAppConfig) => void;
  resetApp: () => void;
  enableInteractiveMode: () => void;
  disableInteractiveMode: () => void;

  // Script management
  setCodeScript: (script: string) => void;
  setVisualNodes: (nodes: Node[], edges: Edge[]) => void;

  // State management
  setState: (name: string, value: unknown) => void;
  getState: (name: string) => unknown;
  resetState: (name?: string) => void;

  // Computed state
  getComputed: (name: string) => unknown;
  invalidateComputed: (name: string) => void;

  // Event handling
  dispatchEvent: (event: InteractionEvent, handlers: ElementEventHandler[]) => Promise<void>;
  queueEvent: (event: InteractionEvent) => void;
  processEventQueue: () => Promise<void>;

  // Navigation
  navigate: (templateId: string, params?: Record<string, unknown>) => void;
  navigateBack: () => void;
  getNavigationParams: () => Record<string, unknown>;

  // Form management
  setFormValue: (formId: string, field: string, value: unknown) => void;
  setFormError: (formId: string, field: string, error: string) => void;
  clearFormError: (formId: string, field: string) => void;
  resetForm: (formId: string) => void;
  getFormState: (formId: string) => InteractiveAppRuntime['forms'][string] | undefined;

  // Timer management
  startTimer: (timerId: string) => void;
  stopTimer: (timerId: string) => void;
  stopAllTimers: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const createInitialRuntime = (): InteractiveAppRuntime => ({
  state: {},
  computedCache: {},
  navigationHistory: [],
  navigationParams: {},
  forms: {},
  activeTimers: new Map(),
  eventQueue: [],
  isProcessing: false,
});

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useInteractiveStore = create<InteractiveStoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    config: null,
    isInteractiveMode: false,
    codeScript: '',
    visualNodes: [],
    visualEdges: [],
    runtime: createInitialRuntime(),
    isProcessingEvent: false,
    eventHistory: [],

    // Initialize app with configuration
    initializeApp: (config: InteractiveAppConfig) => {
      // Initialize state variables with defaults
      const initialState: Record<string, unknown> = {};
      for (const variable of config.state) {
        initialState[variable.name] = variable.defaultValue;
      }

      // Set initial template in navigation history
      const navigationHistory = config.navigation.initialTemplateId
        ? [{ templateId: config.navigation.initialTemplateId, timestamp: Date.now() }]
        : [];

      set({
        config,
        runtime: {
          ...createInitialRuntime(),
          state: initialState,
          navigationHistory,
        },
      });
    },

    // Reset app to initial state
    resetApp: () => {
      const { config } = get();
      get().stopAllTimers();

      if (config) {
        get().initializeApp(config);
      } else {
        set({ runtime: createInitialRuntime() });
      }
    },

    // Enable interactive mode
    enableInteractiveMode: () => {
      console.log('[InteractiveStore] enableInteractiveMode called');
      set({ isInteractiveMode: true });
      console.log('[InteractiveStore] isInteractiveMode now:', get().isInteractiveMode);
    },

    // Disable interactive mode
    disableInteractiveMode: () => {
      console.log('[InteractiveStore] disableInteractiveMode called');
      get().stopAllTimers();
      set({ isInteractiveMode: false });
    },

    // Set code script for execution
    setCodeScript: (script: string) => {
      set({ codeScript: script });
      console.log(`[Interactive] Code script set: ${script.length} chars`);
    },

    // Set visual nodes for script execution (optional, for basic users)
    setVisualNodes: (nodes: Node[], edges: Edge[]) => {
      set({ visualNodes: nodes, visualEdges: edges });
      console.log(`[Interactive] Visual nodes set: ${nodes.length} nodes, ${edges.length} edges`);
    },

    // Set state variable
    setState: (name: string, value: unknown) => {
      set(state => {
        const newState = { ...state.runtime.state, [name]: value };

        // Invalidate computed state that depends on this variable
        const computedCache = { ...state.runtime.computedCache };
        const config = state.config;
        if (config) {
          for (const computed of config.computed) {
            if (computed.dependencies.includes(name)) {
              delete computedCache[computed.name];
            }
          }
        }

        return {
          runtime: {
            ...state.runtime,
            state: newState,
            computedCache,
          },
        };
      });
    },

    // Get state variable
    getState: (name: string) => {
      const { runtime } = get();
      return runtime.state[name];
    },

    // Reset state to default
    resetState: (name?: string) => {
      const { config, runtime } = get();
      if (!config) return;

      if (name) {
        const variable = config.state.find(v => v.name === name);
        if (variable) {
          set({
            runtime: {
              ...runtime,
              state: { ...runtime.state, [name]: variable.defaultValue },
            },
          });
        }
      } else {
        // Reset all state
        const initialState: Record<string, unknown> = {};
        for (const variable of config.state) {
          initialState[variable.name] = variable.defaultValue;
        }
        set({
          runtime: {
            ...runtime,
            state: initialState,
            computedCache: {},
          },
        });
      }
    },

    // Get computed state value
    getComputed: (name: string) => {
      const { config, runtime } = get();
      if (!config) return undefined;

      // Check cache
      if (name in runtime.computedCache) {
        return runtime.computedCache[name];
      }

      // Find computed definition
      const computed = config.computed.find(c => c.name === name);
      if (!computed) return undefined;

      // Evaluate expression
      const context: Partial<ScriptContext> = {
        state: runtime.state,
        data: {},
        params: runtime.navigationParams,
      };

      const value = evaluateExpression(computed.expression, context);

      // Cache result
      set(state => ({
        runtime: {
          ...state.runtime,
          computedCache: { ...state.runtime.computedCache, [name]: value },
        },
      }));

      return value;
    },

    // Invalidate computed cache
    invalidateComputed: (name: string) => {
      set(state => {
        const computedCache = { ...state.runtime.computedCache };
        delete computedCache[name];
        return { runtime: { ...state.runtime, computedCache } };
      });
    },

    // Dispatch event to handlers
    dispatchEvent: async (event: InteractionEvent, handlers: ElementEventHandler[]) => {
      console.log('[InteractiveStore] dispatchEvent called', { eventType: event.type, elementId: event.elementId });
      const { isInteractiveMode, config, runtime, visualNodes, visualEdges } = get();
      console.log('[InteractiveStore] State:', { isInteractiveMode, hasConfig: !!config, visualNodesCount: visualNodes.length, visualEdgesCount: visualEdges.length });
      if (!isInteractiveMode) {
        console.log('[InteractiveStore] Event ignored - isInteractiveMode is false');
        return;
      }

      // Don't block on isProcessingEvent - allow rapid clicks
      set({ isProcessingEvent: true });

      // Filter handlers that match this event type
      const matchingHandlers = handlers.filter(
        h => h.event === event.type && h.enabled
      );

      // Get designer store for element/animation operations
      const designerStore = await getDesignerStore();

      // Build element context if available
      let elementContext: ScriptContext['element'] | null = null;
      if (event.elementId) {
        const element = designerStore.elements.find(e => e.id === event.elementId);
        if (element) {
          elementContext = {
            id: element.id,
            type: element.element_type,
            properties: {
              visible: element.visible,
              locked: element.locked,
              opacity: element.opacity,
              width: element.width,
              height: element.height,
              x: element.position_x,
              y: element.position_y,
              rotation: element.rotation,
              content: element.content,
              styles: element.styles,
            },
          };
        }
      }

      // Build data context from data sources
      const dataContext: Record<string, unknown> = {};
      if (designerStore.dataSourceId) {
        // If there's an active data source, include its data
        dataContext.__dataSourceId = designerStore.dataSourceId;
      }

      // Create executor context with real callbacks
      const executorContext: ActionExecutorContext = {
        runtime,
        event,
        element: elementContext,
        functions: config?.functions || {},
        onNavigate: (templateId, params) => get().navigate(templateId, params),
        onStateChange: (state) => set(s => ({ runtime: { ...s.runtime, state } })),

        // Element update callback - integrates with designer store
        onElementUpdate: (elementId: string, property: string, value: unknown) => {
          const element = designerStore.elements.find(e => e.id === elementId);
          if (!element) {
            console.warn(`[Interactive] Element not found: ${elementId}`);
            return;
          }

          // Map common property names to element fields
          const propertyMap: Record<string, string> = {
            'visible': 'visible',
            'locked': 'locked',
            'opacity': 'opacity',
            'width': 'width',
            'height': 'height',
            'x': 'position_x',
            'y': 'position_y',
            'positionX': 'position_x',
            'positionY': 'position_y',
            'rotation': 'rotation',
            'scaleX': 'scale_x',
            'scaleY': 'scale_y',
            'content': 'content',
            'styles': 'styles',
            'classes': 'classes',
          };

          const elementProperty = propertyMap[property] || property;

          // Handle nested content properties (e.g., 'content.text', 'styles.color')
          if (property.startsWith('content.') || property.startsWith('styles.')) {
            const [parent, ...rest] = property.split('.');
            const nestedPath = rest.join('.');
            const currentValue = element[parent as keyof typeof element] as Record<string, unknown> ?? {};
            const newValue = { ...currentValue };
            setNestedValue(newValue, nestedPath, value);
            designerStore.updateElement(elementId, { [parent]: newValue });
          } else {
            designerStore.updateElement(elementId, { [elementProperty]: value });
          }

          console.log(`[Interactive] Updated element ${elementId}.${property} =`, value);
        },

        // Element visibility callback
        onElementVisibility: (elementId: string, visible: boolean) => {
          const element = designerStore.elements.find(e => e.id === elementId);
          if (!element) {
            console.warn(`[Interactive] Element not found for visibility: ${elementId}`);
            return;
          }
          designerStore.updateElement(elementId, { visible });
          console.log(`[Interactive] Set element ${elementId} visible =`, visible);
        },

        // Animation playback callback
        onPlayAnimation: (elementId?: string, animationId?: string) => {
          if (elementId) {
            // Find animations for this element and trigger them
            const animations = designerStore.animations.filter(a => a.element_id === elementId);
            if (animationId) {
              const animation = animations.find(a => a.id === animationId);
              if (animation) {
                console.log(`[Interactive] Playing animation ${animationId} on element ${elementId}`);
                // Trigger animation via preview/playback system
                // This would need to integrate with the animation playback system
              }
            } else if (animations.length > 0) {
              console.log(`[Interactive] Playing all animations on element ${elementId}`);
            }
          }
        },

        // Timeline playback callback - integrates with On-Air system
        onPlayTimeline: (templateId?: string, phase?: 'in' | 'loop' | 'out') => {
          if (!templateId) return;

          const template = designerStore.templates.find(t => t.id === templateId);
          if (!template) {
            console.warn(`[Interactive] Template not found: ${templateId}`);
            return;
          }

          const layerId = template.layer_id;

          if (phase === 'in' || !phase) {
            designerStore.playIn(templateId, layerId);
            console.log(`[Interactive] Playing IN for template ${templateId}`);
          } else if (phase === 'out') {
            designerStore.playOut(layerId);
            console.log(`[Interactive] Playing OUT for layer ${layerId}`);
          }
        },

        onFetchData: async (url, options) => {
          const response = await fetch(url, options);
          return response.json();
        },

        onValidateForm: (formId) => {
          const form = runtime.forms[formId];
          // Basic validation - check required fields
          const errors: Record<string, string> = {};
          // Could add more sophisticated validation rules here
          return {
            isValid: Object.keys(errors).length === 0,
            errors: { ...form?.errors, ...errors }
          };
        },

        onSubmitForm: async (formId, data, endpoint) => {
          if (!endpoint) return;
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          return response.json();
        },

        onLog: (message, data) => {
          console.log(`[Interactive] ${message}`, data);
        },
      };

      // Execute handlers with debounce/throttle support
      for (const handler of matchingHandlers) {
        // Check handler conditions
        if (handler.conditions && handler.conditions.length > 0) {
          const scriptContext = buildScriptContext(executorContext);
          // Add data context
          scriptContext.data = dataContext;
          const allConditionsMet = handler.conditions.every(c =>
            evaluateCondition(c, scriptContext)
          );
          if (!allConditionsMet) continue;
        }

        // Apply debounce/throttle if configured
        let executeHandler = () => executeActions(handler.actions, executorContext);

        if (handler.debounce && handler.debounce > 0) {
          // For debounced handlers, we need to track per-handler
          const handlerId = handler.id;
          if (!debouncedHandlers.has(handlerId)) {
            debouncedHandlers.set(handlerId, debounce(executeHandler, handler.debounce));
          }
          debouncedHandlers.get(handlerId)!();
        } else if (handler.throttle && handler.throttle > 0) {
          const handlerId = handler.id;
          if (!throttledHandlers.has(handlerId)) {
            throttledHandlers.set(handlerId, throttle(executeHandler, handler.throttle));
          }
          throttledHandlers.get(handlerId)!();
        } else {
          await executeActions(handler.actions, executorContext);
        }
      }

      // Execute code script if present (primary method - used by AI)
      const { codeScript } = get();
      console.log(`[Interactive] Code script check: length=${codeScript?.length || 0}, hasContent=${!!(codeScript && codeScript.trim())}`);
      if (codeScript && codeScript.trim()) {
        console.log(`[Interactive] Executing code script for event "${event.type}" on element "${event.elementId || 'any'}"`);

        // Find the element name for the clicked element
        let elementName: string | null = null;
        if (event.elementId) {
          const clickedElement = designerStore.elements.find(e => e.id === event.elementId);
          if (clickedElement) {
            elementName = clickedElement.name;
          }
        }

        // Build the handler function name based on element name and event type
        // Pattern: on{ElementName}On{EventType} e.g., onBtn_AlabamaOnClick
        if (elementName) {
          const sanitizedName = elementName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
          const eventTypeCap = event.type.charAt(0).toUpperCase() + event.type.slice(1);
          const handlerName = `on${sanitizedName}On${eventTypeCap}`;

          console.log(`[Interactive] Looking for handler: ${handlerName}`);

          // Get current template name for {{CURRENT_TEMPLATE}} placeholder resolution
          const currentTemplate = designerStore.currentTemplateId
            ? designerStore.templates.find(t => t.id === designerStore.currentTemplateId)
            : null;
          const currentTemplateName = currentTemplate?.name || '';
          const sanitizedTemplateName = currentTemplateName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

          // Replace {{CURRENT_TEMPLATE}} placeholder in script
          const resolvedScript = codeScript.replace(/\{\{CURRENT_TEMPLATE\}\}/g, sanitizedTemplateName);

          // Create actions object with methods that call into the interactive system
          const actionsObj = {
            setState: (address: string, value: unknown) => {
              console.log(`[Interactive] actions.setState("${address}", "${value}")`);
              // Use the address system to set the value
              if (address.startsWith('@')) {
                const success = setAddressValue(address, value);
                if (!success) {
                  console.warn(`[Interactive] Failed to set address: ${address}`);
                }
              } else {
                get().setState(address, value);
              }
            },
            navigate: (templateName: string) => {
              console.log(`[Interactive] actions.navigate("${templateName}")`);
              get().navigate(templateName);
            },
            showElement: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                designerStore.updateElement(el.id, { visible: true });
              }
            },
            hideElement: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                designerStore.updateElement(el.id, { visible: false });
              }
            },
            toggleElement: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                designerStore.updateElement(el.id, { visible: !el.visible });
              }
            },
            playIn: (templateName: string, layerName: string) => {
              const template = designerStore.templates.find(t => t.name === templateName);
              if (template) {
                designerStore.playIn(template.id, template.layer_id);
              }
            },
            playOut: (layerName: string) => {
              // Find layer by name and play out
              const layer = designerStore.layers?.find(l => l.name === layerName);
              if (layer) {
                designerStore.playOut(layer.id);
              }
            },
            log: (message: string) => {
              console.log(`[Script] ${message}`);
            },
            // Timeline Animation APIs
            addAnimation: (elementName: string, phase: 'in' | 'loop' | 'out' = 'in') => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                const animationId = designerStore.addAnimation(el.id, phase);
                console.log(`[Script] Created animation ${animationId} for ${elementName} (${phase})`);
                return animationId;
              }
              console.warn(`[Script] Element not found: ${elementName}`);
              return null;
            },
            addKeyframe: (animationId: string, position: number, properties: Record<string, unknown>) => {
              if (!animationId) {
                console.warn('[Script] addKeyframe: animationId is required');
                return null;
              }
              const keyframeId = designerStore.addKeyframe(animationId, position, properties as Record<string, string | number | null>);
              console.log(`[Script] Created keyframe ${keyframeId} at position ${position}ms`);
              return keyframeId;
            },
            updateAnimation: (animationId: string, updates: Record<string, unknown>) => {
              if (!animationId) return;
              designerStore.updateAnimation(animationId, updates as Partial<typeof designerStore.animations[0]>);
              console.log(`[Script] Updated animation ${animationId}`);
            },
            updateKeyframe: (keyframeId: string, updates: Record<string, unknown>) => {
              if (!keyframeId) return;
              designerStore.updateKeyframe(keyframeId, updates as Partial<typeof designerStore.keyframes[0]>);
              console.log(`[Script] Updated keyframe ${keyframeId}`);
            },
            removeAnimation: (animationId: string) => {
              if (!animationId) return;
              designerStore.deleteAnimation(animationId);
              console.log(`[Script] Removed animation ${animationId}`);
            },
            getAnimations: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                return designerStore.animations.filter(a => a.element_id === el.id);
              }
              return [];
            },
            getKeyframes: (animationId: string) => {
              return designerStore.keyframes.filter(k => k.animation_id === animationId);
            },
            // Playback controls
            play: () => {
              designerStore.play();
              console.log('[Script] Timeline play');
            },
            pause: () => {
              designerStore.pause();
              console.log('[Script] Timeline pause');
            },
            stop: () => {
              designerStore.stop();
              console.log('[Script] Timeline stop');
            },
            setPhase: (phase: 'in' | 'loop' | 'out') => {
              designerStore.setPhase(phase);
              console.log(`[Script] Set phase to ${phase}`);
            },
            setPlayhead: (ms: number) => {
              designerStore.setPlayhead(ms);
              console.log(`[Script] Set playhead to ${ms}ms`);
            },
            getPlayhead: () => {
              return designerStore.playheadPosition;
            },
            getCurrentPhase: () => {
              return designerStore.currentPhase;
            },
            isPlaying: () => {
              return designerStore.isPlaying;
            },
            // Convenience method to restart animation from beginning
            restart: () => {
              designerStore.stop();
              // Small delay to ensure state updates before playing
              setTimeout(() => {
                designerStore.play();
              }, 10);
              console.log('[Script] Timeline restart');
            },
            // Element property helpers
            getElement: (elementName: string) => {
              return designerStore.elements.find(e => e.name === elementName);
            },
            updateElement: (elementName: string, updates: Record<string, unknown>) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                designerStore.updateElement(el.id, updates as Partial<typeof el>);
                console.log(`[Script] Updated element ${elementName}`);
              }
            },
            getAllElements: () => {
              return designerStore.elements;
            },

            // ============================================================
            // ELEMENT CREATION / DELETION
            // ============================================================
            addElement: (type: string, options: { x?: number; y?: number; name?: string; width?: number; height?: number; content?: Record<string, unknown> } = {}) => {
              const { x = 100, y = 100, name, width, height, content } = options;
              const elementId = designerStore.addElement(type as Parameters<typeof designerStore.addElement>[0], { x, y });
              if (name) {
                designerStore.updateElement(elementId, { name });
              }
              if (width !== undefined || height !== undefined) {
                designerStore.updateElement(elementId, { width, height });
              }
              if (content) {
                designerStore.updateElement(elementId, { content });
              }
              console.log(`[Script] Created element ${elementId} (${type})`);
              return elementId;
            },
            deleteElement: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                designerStore.deleteElements([el.id]);
                console.log(`[Script] Deleted element ${elementName}`);
                return true;
              }
              console.warn(`[Script] Element not found: ${elementName}`);
              return false;
            },
            duplicateElement: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                const newId = designerStore.duplicateElement(el.id);
                console.log(`[Script] Duplicated element ${elementName} -> ${newId}`);
                return newId;
              }
              console.warn(`[Script] Element not found: ${elementName}`);
              return null;
            },

            // ============================================================
            // TEMPLATE MANAGEMENT
            // ============================================================
            getTemplates: () => {
              return designerStore.templates;
            },
            getCurrentTemplate: () => {
              const templateId = designerStore.currentTemplateId;
              return templateId ? designerStore.templates.find(t => t.id === templateId) : null;
            },
            getCurrentTemplateId: () => {
              return designerStore.currentTemplateId;
            },
            switchToTemplate: (templateName: string) => {
              const template = designerStore.templates.find(t => t.name === templateName);
              if (template) {
                designerStore.selectTemplate(template.id);
                console.log(`[Script] Switched to template ${templateName}`);
                return true;
              }
              console.warn(`[Script] Template not found: ${templateName}`);
              return false;
            },
            addTemplate: (layerName: string, templateName?: string) => {
              const layer = designerStore.layers?.find(l => l.name === layerName);
              if (layer) {
                const templateId = designerStore.addTemplate(layer.id, templateName);
                console.log(`[Script] Created template ${templateId}`);
                return templateId;
              }
              console.warn(`[Script] Layer not found: ${layerName}`);
              return null;
            },
            duplicateTemplate: (templateName: string) => {
              const template = designerStore.templates.find(t => t.name === templateName);
              if (template) {
                const newId = designerStore.duplicateTemplate(template.id);
                console.log(`[Script] Duplicated template ${templateName} -> ${newId}`);
                return newId;
              }
              console.warn(`[Script] Template not found: ${templateName}`);
              return null;
            },
            updateTemplate: (templateName: string, updates: Record<string, unknown>) => {
              const template = designerStore.templates.find(t => t.name === templateName);
              if (template) {
                designerStore.updateTemplate(template.id, updates as Partial<typeof template>);
                console.log(`[Script] Updated template ${templateName}`);
              }
            },
            toggleTemplateVisibility: (templateName: string) => {
              const template = designerStore.templates.find(t => t.name === templateName);
              if (template) {
                designerStore.toggleTemplateVisibility(template.id);
                console.log(`[Script] Toggled template visibility: ${templateName}`);
              }
            },
            toggleTemplateLock: (templateName: string) => {
              const template = designerStore.templates.find(t => t.name === templateName);
              if (template) {
                designerStore.toggleTemplateLock(template.id);
                console.log(`[Script] Toggled template lock: ${templateName}`);
              }
            },

            // ============================================================
            // LAYER CONTROL
            // ============================================================
            getLayers: () => {
              return designerStore.layers || [];
            },
            getLayer: (layerName: string) => {
              return designerStore.layers?.find(l => l.name === layerName);
            },
            toggleLayerVisibility: (layerName: string) => {
              const layer = designerStore.layers?.find(l => l.name === layerName);
              if (layer) {
                designerStore.toggleLayerVisibility(layer.id);
                console.log(`[Script] Toggled layer visibility: ${layerName}`);
              }
            },
            toggleLayerLock: (layerName: string) => {
              const layer = designerStore.layers?.find(l => l.name === layerName);
              if (layer) {
                designerStore.toggleLayerLock(layer.id);
                console.log(`[Script] Toggled layer lock: ${layerName}`);
              }
            },
            showAllLayers: () => {
              designerStore.showAllLayers();
              console.log('[Script] Showing all layers');
            },
            showAllTemplates: () => {
              designerStore.showAllTemplates();
              console.log('[Script] Showing all templates');
            },
            showAll: () => {
              designerStore.showAll();
              console.log('[Script] Showing all layers and templates');
            },

            // ============================================================
            // DATA BINDING / DATA SOURCE
            // ============================================================
            getDataRecord: () => {
              const { dataPayload, currentRecordIndex } = designerStore;
              if (dataPayload && dataPayload.length > currentRecordIndex) {
                return dataPayload[currentRecordIndex];
              }
              return null;
            },
            getDataRecordAt: (index: number) => {
              const { dataPayload } = designerStore;
              if (dataPayload && dataPayload.length > index && index >= 0) {
                return dataPayload[index];
              }
              return null;
            },
            getAllDataRecords: () => {
              return designerStore.dataPayload || [];
            },
            getDataRecordCount: () => {
              return designerStore.dataPayload?.length || 0;
            },
            getCurrentRecordIndex: () => {
              return designerStore.currentRecordIndex;
            },
            setRecordIndex: (index: number) => {
              designerStore.setCurrentRecordIndex(index);
              console.log(`[Script] Set record index to ${index}`);
            },
            nextRecord: () => {
              designerStore.nextRecord();
              console.log(`[Script] Next record: ${designerStore.currentRecordIndex}`);
            },
            prevRecord: () => {
              designerStore.prevRecord();
              console.log(`[Script] Previous record: ${designerStore.currentRecordIndex}`);
            },
            getDataSourceInfo: () => {
              return {
                id: designerStore.dataSourceId,
                name: designerStore.dataSourceName,
                displayField: designerStore.dataDisplayField,
                recordCount: designerStore.dataPayload?.length || 0,
                currentIndex: designerStore.currentRecordIndex,
              };
            },

            // ============================================================
            // PHASE DURATION CONTROL
            // ============================================================
            getPhaseDuration: (phase: 'in' | 'loop' | 'out') => {
              return designerStore.phaseDurations[phase];
            },
            setPhaseDuration: (phase: 'in' | 'loop' | 'out', durationMs: number) => {
              designerStore.setPhaseDuration(phase, durationMs);
              console.log(`[Script] Set ${phase} phase duration to ${durationMs}ms`);
            },
            getAllPhaseDurations: () => {
              return { ...designerStore.phaseDurations };
            },

            // ============================================================
            // Z-ORDER CONTROL
            // ============================================================
            bringToFront: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                designerStore.bringToFront(el.id);
                console.log(`[Script] Brought ${elementName} to front`);
              }
            },
            sendToBack: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                designerStore.sendToBack(el.id);
                console.log(`[Script] Sent ${elementName} to back`);
              }
            },
            bringForward: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                designerStore.bringForward(el.id);
                console.log(`[Script] Brought ${elementName} forward`);
              }
            },
            sendBackward: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                designerStore.sendBackward(el.id);
                console.log(`[Script] Sent ${elementName} backward`);
              }
            },
            setZIndex: (elementName: string, zIndex: number) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (el) {
                designerStore.setZIndex(el.id, zIndex);
                console.log(`[Script] Set ${elementName} z-index to ${zIndex}`);
              }
            },

            // ============================================================
            // ELEMENT GROUPING
            // ============================================================
            groupElements: (elementNames: string[]) => {
              const ids = elementNames
                .map(name => designerStore.elements.find(e => e.name === name)?.id)
                .filter((id): id is string => id !== undefined);
              if (ids.length > 1) {
                const groupId = designerStore.groupElements(ids);
                console.log(`[Script] Grouped ${elementNames.join(', ')} -> ${groupId}`);
                return groupId;
              }
              console.warn('[Script] Need at least 2 elements to group');
              return null;
            },
            ungroupElements: (groupName: string) => {
              const el = designerStore.elements.find(e => e.name === groupName && e.element_type === 'group');
              if (el) {
                designerStore.ungroupElements(el.id);
                console.log(`[Script] Ungrouped ${groupName}`);
                return true;
              }
              console.warn(`[Script] Group not found: ${groupName}`);
              return false;
            },

            // ============================================================
            // SELECTION
            // ============================================================
            selectElements: (elementNames: string[]) => {
              const ids = elementNames
                .map(name => designerStore.elements.find(e => e.name === name)?.id)
                .filter((id): id is string => id !== undefined);
              designerStore.selectElements(ids, 'replace');
              console.log(`[Script] Selected: ${elementNames.join(', ')}`);
            },
            addToSelection: (elementNames: string[]) => {
              const ids = elementNames
                .map(name => designerStore.elements.find(e => e.name === name)?.id)
                .filter((id): id is string => id !== undefined);
              designerStore.selectElements(ids, 'add');
              console.log(`[Script] Added to selection: ${elementNames.join(', ')}`);
            },
            toggleSelection: (elementNames: string[]) => {
              const ids = elementNames
                .map(name => designerStore.elements.find(e => e.name === name)?.id)
                .filter((id): id is string => id !== undefined);
              designerStore.selectElements(ids, 'toggle');
              console.log(`[Script] Toggled selection: ${elementNames.join(', ')}`);
            },
            selectAll: () => {
              designerStore.selectAll();
              console.log('[Script] Selected all elements');
            },
            deselectAll: () => {
              designerStore.deselectAll();
              console.log('[Script] Deselected all elements');
            },
            getSelectedElements: () => {
              return designerStore.selectedElementIds
                .map(id => designerStore.elements.find(e => e.id === id))
                .filter((el): el is NonNullable<typeof el> => el !== undefined);
            },
            getSelectedElementNames: () => {
              return designerStore.selectedElementIds
                .map(id => designerStore.elements.find(e => e.id === id)?.name)
                .filter((name): name is string => name !== undefined);
            },

            // ============================================================
            // VIEW CONTROLS
            // ============================================================
            setZoom: (zoom: number) => {
              designerStore.setZoom(zoom);
              console.log(`[Script] Set zoom to ${zoom}`);
            },
            getZoom: () => {
              return designerStore.zoom;
            },
            fitToScreen: () => {
              designerStore.fitToScreen();
              console.log('[Script] Fit to screen');
            },
            resetView: () => {
              designerStore.resetView();
              console.log('[Script] Reset view');
            },
            setPan: (x: number, y: number) => {
              designerStore.setPan(x, y);
              console.log(`[Script] Set pan to (${x}, ${y})`);
            },
            getPan: () => {
              return { x: designerStore.panX, y: designerStore.panY };
            },
            toggleGrid: () => {
              designerStore.toggleGrid();
              console.log('[Script] Toggled grid');
            },
            toggleGuides: () => {
              designerStore.toggleGuides();
              console.log('[Script] Toggled guides');
            },
            toggleSafeArea: () => {
              designerStore.toggleSafeArea();
              console.log('[Script] Toggled safe area');
            },

            // ============================================================
            // TIMERS / ASYNC
            // ============================================================
            delay: (ms: number) => {
              return new Promise<void>(resolve => setTimeout(resolve, ms));
            },
            setTimeout: (callback: () => void, ms: number) => {
              const id = window.setTimeout(callback, ms);
              console.log(`[Script] Set timeout ${id} for ${ms}ms`);
              return id;
            },
            clearTimeout: (id: number) => {
              window.clearTimeout(id);
              console.log(`[Script] Cleared timeout ${id}`);
            },
            setInterval: (callback: () => void, ms: number) => {
              const id = window.setInterval(callback, ms);
              console.log(`[Script] Set interval ${id} every ${ms}ms`);
              return id;
            },
            clearInterval: (id: number) => {
              window.clearInterval(id);
              console.log(`[Script] Cleared interval ${id}`);
            },

            // ============================================================
            // AUDIO
            // ============================================================
            playSound: (url: string, volume: number = 1.0) => {
              try {
                const audio = new Audio(url);
                audio.volume = Math.max(0, Math.min(1, volume));
                audio.play().catch(err => console.warn('[Script] Audio play failed:', err));
                console.log(`[Script] Playing sound: ${url}`);
                return audio;
              } catch (err) {
                console.warn('[Script] Failed to create audio:', err);
                return null;
              }
            },
            stopSound: (audio: HTMLAudioElement | null) => {
              if (audio) {
                audio.pause();
                audio.currentTime = 0;
                console.log('[Script] Stopped sound');
              }
            },

            // ============================================================
            // HTTP FETCH
            // ============================================================
            fetch: async (url: string, options?: RequestInit) => {
              try {
                console.log(`[Script] Fetching: ${url}`);
                const response = await fetch(url, options);
                const data = await response.json();
                console.log('[Script] Fetch complete');
                return data;
              } catch (err) {
                console.error('[Script] Fetch error:', err);
                throw err;
              }
            },
            fetchText: async (url: string, options?: RequestInit) => {
              try {
                console.log(`[Script] Fetching text: ${url}`);
                const response = await fetch(url, options);
                const text = await response.text();
                console.log('[Script] Fetch text complete');
                return text;
              } catch (err) {
                console.error('[Script] Fetch error:', err);
                throw err;
              }
            },

            // ============================================================
            // MEDIA ELEMENT CONTROL (Videos/Audio on Stage)
            // ============================================================
            /**
             * Get video element by name and return its DOM reference
             */
            getMediaElement: (elementName: string): HTMLVideoElement | HTMLAudioElement | null => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (!el || (el.content.type !== 'video' && el.content.type !== 'audio')) {
                console.warn(`[Script] Element ${elementName} is not a media element`);
                return null;
              }
              // Find the video/audio element in the DOM
              const mediaEl = document.querySelector(`[data-element-id="${el.id}"] video, [data-element-id="${el.id}"] audio`) as HTMLVideoElement | HTMLAudioElement;
              return mediaEl || null;
            },

            /**
             * Set media playback position (currentTime)
             */
            setMediaTime: (elementName: string, timeSeconds: number) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (!el) return;
              const mediaEl = document.querySelector(`[data-element-id="${el.id}"] video, [data-element-id="${el.id}"] audio`) as HTMLMediaElement;
              if (mediaEl) {
                mediaEl.currentTime = Math.max(0, timeSeconds);
                console.log(`[Script] Set ${elementName} time to ${timeSeconds}s`);
              }
            },

            /**
             * Get media playback position (currentTime)
             */
            getMediaTime: (elementName: string): number => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (!el) return 0;
              const mediaEl = document.querySelector(`[data-element-id="${el.id}"] video, [data-element-id="${el.id}"] audio`) as HTMLMediaElement;
              return mediaEl?.currentTime || 0;
            },

            /**
             * Get media duration
             */
            getMediaDuration: (elementName: string): number => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (!el) return 0;
              const mediaEl = document.querySelector(`[data-element-id="${el.id}"] video, [data-element-id="${el.id}"] audio`) as HTMLMediaElement;
              return mediaEl?.duration || 0;
            },

            /**
             * Play a media element
             */
            playMedia: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (!el) return;
              const mediaEl = document.querySelector(`[data-element-id="${el.id}"] video, [data-element-id="${el.id}"] audio`) as HTMLMediaElement;
              if (mediaEl) {
                mediaEl.play().catch(err => console.warn('[Script] Media play failed:', err));
                console.log(`[Script] Playing media: ${elementName}`);
              }
            },

            /**
             * Pause a media element
             */
            pauseMedia: (elementName: string) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (!el) return;
              const mediaEl = document.querySelector(`[data-element-id="${el.id}"] video, [data-element-id="${el.id}"] audio`) as HTMLMediaElement;
              if (mediaEl) {
                mediaEl.pause();
                console.log(`[Script] Paused media: ${elementName}`);
              }
            },

            /**
             * Set media volume (0 to 1)
             */
            setMediaVolume: (elementName: string, volume: number) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (!el) return;
              const mediaEl = document.querySelector(`[data-element-id="${el.id}"] video, [data-element-id="${el.id}"] audio`) as HTMLMediaElement;
              if (mediaEl) {
                mediaEl.volume = Math.max(0, Math.min(1, volume));
                console.log(`[Script] Set ${elementName} volume to ${volume}`);
              }
            },

            /**
             * Set media muted state
             */
            setMediaMuted: (elementName: string, muted: boolean) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (!el) return;
              const mediaEl = document.querySelector(`[data-element-id="${el.id}"] video, [data-element-id="${el.id}"] audio`) as HTMLMediaElement;
              if (mediaEl) {
                mediaEl.muted = muted;
                console.log(`[Script] Set ${elementName} muted to ${muted}`);
              }
            },

            /**
             * Set media playback speed (0.25 to 4)
             */
            setMediaSpeed: (elementName: string, speed: number) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (!el) return;
              const mediaEl = document.querySelector(`[data-element-id="${el.id}"] video, [data-element-id="${el.id}"] audio`) as HTMLMediaElement;
              if (mediaEl) {
                mediaEl.playbackRate = Math.max(0.25, Math.min(4, speed));
                console.log(`[Script] Set ${elementName} speed to ${speed}x`);
              }
            },

            /**
             * Create media keyframe animation for a video element
             * This adds keyframes that control media_time to sync with timeline
             */
            addMediaTimeAnimation: (elementName: string, phase: 'in' | 'loop' | 'out' = 'in', startTime: number = 0, endTime?: number) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (!el || el.content.type !== 'video') {
                console.warn(`[Script] Element ${elementName} is not a video element`);
                return null;
              }

              // Get the phase duration to know how long the animation should be
              const phaseDuration = designerStore.phaseDurations[phase];

              // If endTime not specified, calculate based on phase duration
              const videoEndTime = endTime !== undefined ? endTime : startTime + (phaseDuration / 1000);

              // Add animation for this element in the specified phase
              const animationId = designerStore.addAnimation(el.id, phase);

              // Add keyframes for media_time
              designerStore.addKeyframe(animationId, 0, { media_time: startTime });
              designerStore.addKeyframe(animationId, phaseDuration, { media_time: videoEndTime });

              console.log(`[Script] Added media time animation to ${elementName}: ${startTime}s → ${videoEndTime}s over ${phaseDuration}ms`);
              return animationId;
            },

            /**
             * Sync video playback with timeline
             * When timeline plays, video plays in sync
             */
            syncMediaToTimeline: (elementName: string, videoStartTime: number = 0) => {
              const el = designerStore.elements.find(e => e.name === elementName);
              if (!el) return;

              // Add media_time keyframes that map timeline position to video position
              // At playhead 0ms, video is at videoStartTime
              // As timeline advances, video advances proportionally
              const inDuration = designerStore.phaseDurations.in;
              const loopDuration = designerStore.phaseDurations.loop;

              // Create animation for 'in' phase
              const inAnimId = designerStore.addAnimation(el.id, 'in');
              designerStore.addKeyframe(inAnimId, 0, { media_time: videoStartTime, media_playing: 1 });
              designerStore.addKeyframe(inAnimId, inDuration, { media_time: videoStartTime + (inDuration / 1000), media_playing: 1 });

              // Create animation for 'loop' phase
              const loopAnimId = designerStore.addAnimation(el.id, 'loop');
              const loopStartTime = videoStartTime + (inDuration / 1000);
              designerStore.addKeyframe(loopAnimId, 0, { media_time: loopStartTime, media_playing: 1 });
              designerStore.addKeyframe(loopAnimId, loopDuration, { media_time: loopStartTime + (loopDuration / 1000), media_playing: 1 });

              console.log(`[Script] Synced ${elementName} to timeline starting at ${videoStartTime}s`);
            },

            // ============================================================
            // FULL PREVIEW MODE
            // ============================================================
            playFullPreview: () => {
              designerStore.playFullPreview();
              console.log('[Script] Playing full preview (IN → LOOP → OUT)');
            },
            endPreviewPlayback: () => {
              designerStore.endPreviewPlayback();
              console.log('[Script] Ended preview playback');
            },
            isPlayingFullPreview: () => {
              return designerStore.isPlayingFullPreview;
            },

            // ============================================================
            // ON-AIR CONTROLS (Extended)
            // ============================================================
            switchTemplate: (newTemplateName: string, layerName: string) => {
              const template = designerStore.templates.find(t => t.name === newTemplateName);
              const layer = designerStore.layers?.find(l => l.name === layerName);
              if (template && layer) {
                designerStore.switchTemplate(template.id, layer.id);
                console.log(`[Script] Switched to template ${newTemplateName} on layer ${layerName}`);
              }
            },
            getOnAirState: (layerName: string) => {
              const layer = designerStore.layers?.find(l => l.name === layerName);
              if (layer) {
                return designerStore.onAirTemplates[layer.id] || null;
              }
              return null;
            },
            clearOnAir: (layerName: string) => {
              const layer = designerStore.layers?.find(l => l.name === layerName);
              if (layer) {
                designerStore.clearOnAir(layer.id);
                console.log(`[Script] Cleared on-air for layer ${layerName}`);
              }
            },

            // ============================================================
            // UTILITY / MATH HELPERS
            // ============================================================
            random: (min: number = 0, max: number = 1) => {
              return Math.random() * (max - min) + min;
            },
            randomInt: (min: number, max: number) => {
              return Math.floor(Math.random() * (max - min + 1)) + min;
            },
            clamp: (value: number, min: number, max: number) => {
              return Math.max(min, Math.min(max, value));
            },
            lerp: (start: number, end: number, t: number) => {
              return start + (end - start) * t;
            },
            map: (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
              return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
            },
          };

          try {
            // Execute the script with the handler call
            const scriptWithCall = `
              ${resolvedScript}
              if (typeof ${handlerName} === 'function') {
                ${handlerName}(event);
              }
            `;

            // Create and execute the function
            const fn = new Function('state', 'data', 'event', 'actions', scriptWithCall);
            fn(
              runtime.state,
              dataContext,
              { type: event.type, elementId: event.elementId, elementName, data: event.data },
              actionsObj
            );
          } catch (error) {
            console.error('[Interactive] Error executing code script:', error);
          }
        }
      }

      // Execute visual node graph if nodes are present (fallback for basic users)
      if (visualNodes.length > 0) {
        console.log(`[Interactive] Executing visual node graph for event "${event.type}"`);

        // Create node runtime context
        const nodeContext = createNodeRuntimeContext(
          designerStore,
          {
            runtime,
            setState: (key: string, value: unknown) => get().setState(key, value),
            navigate: (screenId: string) => get().navigate(screenId),
          }
        );

        // Add event data to context
        nodeContext.event = {
          type: event.type,
          elementId: event.elementId,
          data: event.data,
        };

        // Execute the node graph
        try {
          await executeNodeGraph(event.type, event.elementId, visualNodes, visualEdges, nodeContext);
        } catch (error) {
          console.error('[Interactive] Error executing visual node graph:', error);
        }
      }

      // Add to event history
      set(state => ({
        isProcessingEvent: false,
        eventHistory: [...state.eventHistory.slice(-99), event],
      }));
    },

    // Queue event for batch processing
    queueEvent: (event: InteractionEvent) => {
      set(state => ({
        runtime: {
          ...state.runtime,
          eventQueue: [...state.runtime.eventQueue, event],
        },
      }));
    },

    // Process queued events
    processEventQueue: async () => {
      const { runtime } = get();
      if (runtime.isProcessing || runtime.eventQueue.length === 0) return;

      set(state => ({
        runtime: { ...state.runtime, isProcessing: true },
      }));

      const queue = [...runtime.eventQueue];
      set(state => ({
        runtime: { ...state.runtime, eventQueue: [] },
      }));

      for (const event of queue) {
        // Would need to get handlers for the element
        // await get().dispatchEvent(event, handlers);
      }

      set(state => ({
        runtime: { ...state.runtime, isProcessing: false },
      }));
    },

    // Navigate to template
    navigate: (templateId: string, params?: Record<string, unknown>) => {
      set(state => {
        const { config } = state;
        const maxHistory = config?.navigation.history.maxLength ?? 50;

        const newHistory = [
          ...state.runtime.navigationHistory.slice(-(maxHistory - 1)),
          { templateId, params, timestamp: Date.now() },
        ];

        return {
          runtime: {
            ...state.runtime,
            navigationHistory: newHistory,
            navigationParams: params ?? {},
          },
        };
      });
    },

    // Navigate back
    navigateBack: () => {
      set(state => {
        const history = [...state.runtime.navigationHistory];
        if (history.length <= 1) return state;

        history.pop();
        const previous = history[history.length - 1];

        return {
          runtime: {
            ...state.runtime,
            navigationHistory: history,
            navigationParams: previous?.params ?? {},
          },
        };
      });
    },

    // Get current navigation params
    getNavigationParams: () => get().runtime.navigationParams,

    // Form management
    setFormValue: (formId: string, field: string, value: unknown) => {
      set(state => {
        const forms = { ...state.runtime.forms };
        if (!forms[formId]) {
          forms[formId] = {
            values: {},
            errors: {},
            touched: {},
            isValid: true,
            isSubmitting: false,
          };
        }
        forms[formId] = {
          ...forms[formId],
          values: { ...forms[formId].values, [field]: value },
          touched: { ...forms[formId].touched, [field]: true },
        };
        return { runtime: { ...state.runtime, forms } };
      });
    },

    setFormError: (formId: string, field: string, error: string) => {
      set(state => {
        const forms = { ...state.runtime.forms };
        if (!forms[formId]) return state;
        forms[formId] = {
          ...forms[formId],
          errors: { ...forms[formId].errors, [field]: error },
          isValid: false,
        };
        return { runtime: { ...state.runtime, forms } };
      });
    },

    clearFormError: (formId: string, field: string) => {
      set(state => {
        const forms = { ...state.runtime.forms };
        if (!forms[formId]) return state;
        const errors = { ...forms[formId].errors };
        delete errors[field];
        forms[formId] = {
          ...forms[formId],
          errors,
          isValid: Object.keys(errors).length === 0,
        };
        return { runtime: { ...state.runtime, forms } };
      });
    },

    resetForm: (formId: string) => {
      set(state => {
        const forms = { ...state.runtime.forms };
        forms[formId] = {
          values: {},
          errors: {},
          touched: {},
          isValid: true,
          isSubmitting: false,
        };
        return { runtime: { ...state.runtime, forms } };
      });
    },

    getFormState: (formId: string) => get().runtime.forms[formId],

    // Timer management
    startTimer: (timerId: string) => {
      const { config, runtime } = get();
      if (!config) return;

      const timer = config.timers.find(t => t.id === timerId);
      if (!timer || !timer.enabled) return;

      // Clear existing timer if any
      if (runtime.activeTimers.has(timerId)) {
        clearInterval(runtime.activeTimers.get(timerId));
      }

      // Start new timer
      const intervalId = setInterval(async () => {
        const event: InteractionEvent = {
          type: 'timerTick',
          elementId: timerId,
          timestamp: Date.now(),
          data: { timerId },
        };

        // Get designer store for callbacks
        const designerStore = await getDesignerStore();

        // Execute timer actions with real callbacks
        const executorContext: ActionExecutorContext = {
          runtime: get().runtime,
          event,
          element: null,
          functions: config?.functions || {},
          onNavigate: (templateId, params) => get().navigate(templateId, params),
          onStateChange: (state) => set(s => ({ runtime: { ...s.runtime, state } })),
          onElementUpdate: (elementId, property, value) => {
            const element = designerStore.elements.find(e => e.id === elementId);
            if (element) {
              const propertyMap: Record<string, string> = {
                'visible': 'visible', 'opacity': 'opacity', 'width': 'width',
                'height': 'height', 'x': 'position_x', 'y': 'position_y',
              };
              designerStore.updateElement(elementId, { [propertyMap[property] || property]: value });
            }
          },
          onElementVisibility: (elementId, visible) => {
            designerStore.updateElement(elementId, { visible });
          },
          onPlayAnimation: (elementId, animationId) => {
            console.log(`[Timer] Play animation ${animationId} on ${elementId}`);
          },
          onPlayTimeline: (templateId, phase) => {
            if (!templateId) return;
            const template = designerStore.templates.find(t => t.id === templateId);
            if (template) {
              if (phase === 'out') {
                designerStore.playOut(template.layer_id);
              } else {
                designerStore.playIn(templateId, template.layer_id);
              }
            }
          },
          onFetchData: async (url, options) => {
            const response = await fetch(url, options);
            return response.json();
          },
          onValidateForm: () => ({ isValid: true, errors: {} }),
          onSubmitForm: async () => {},
          onLog: (msg, data) => console.log(`[Timer] ${msg}`, data),
        };

        await executeActions(timer.actions, executorContext);
      }, timer.interval);

      set(state => {
        const activeTimers = new Map(state.runtime.activeTimers);
        activeTimers.set(timerId, intervalId);
        return { runtime: { ...state.runtime, activeTimers } };
      });
    },

    stopTimer: (timerId: string) => {
      const { runtime } = get();
      const intervalId = runtime.activeTimers.get(timerId);
      if (intervalId) {
        clearInterval(intervalId);
      }

      set(state => {
        const activeTimers = new Map(state.runtime.activeTimers);
        activeTimers.delete(timerId);
        return { runtime: { ...state.runtime, activeTimers } };
      });
    },

    stopAllTimers: () => {
      const { runtime } = get();
      for (const intervalId of runtime.activeTimers.values()) {
        clearInterval(intervalId);
      }

      set(state => ({
        runtime: { ...state.runtime, activeTimers: new Map() },
      }));
    },
  }))
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const selectInteractiveMode = (state: InteractiveStoreState) => state.isInteractiveMode;
export const selectAppState = (state: InteractiveStoreState) => state.runtime.state;
export const selectNavigationHistory = (state: InteractiveStoreState) => state.runtime.navigationHistory;
export const selectNavigationParams = (state: InteractiveStoreState) => state.runtime.navigationParams;
export const selectForms = (state: InteractiveStoreState) => state.runtime.forms;
export const selectIsProcessingEvent = (state: InteractiveStoreState) => state.isProcessingEvent;

// ============================================================================
// EVENT HELPERS
// ============================================================================

/**
 * Create an interaction event from a DOM event
 */
export function createInteractionEvent(
  type: InteractionEventType,
  elementId: string,
  domEvent?: Event | React.SyntheticEvent
): InteractionEvent {
  const event: InteractionEvent = {
    type,
    elementId,
    timestamp: Date.now(),
  };

  if (domEvent) {
    if ('clientX' in domEvent && 'clientY' in domEvent) {
      event.data = {
        ...event.data,
        clientX: (domEvent as MouseEvent).clientX,
        clientY: (domEvent as MouseEvent).clientY,
      };
    }

    if ('target' in domEvent && domEvent.target) {
      const target = domEvent.target as HTMLInputElement;
      if ('value' in target) {
        event.data = {
          ...event.data,
          value: target.value,
        };
      }
    }

    if ('key' in domEvent) {
      const keyEvent = domEvent as KeyboardEvent;
      event.data = {
        ...event.data,
        key: keyEvent.key,
        keyCode: keyEvent.keyCode,
        modifiers: {
          ctrl: keyEvent.ctrlKey,
          shift: keyEvent.shiftKey,
          alt: keyEvent.altKey,
          meta: keyEvent.metaKey,
        },
      };
    }
  }

  return event;
}
