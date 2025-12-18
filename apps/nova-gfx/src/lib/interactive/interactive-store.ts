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
  AppStateVariable,
  ComputedState,
  AppFunction,
  ScriptContext,
} from '@emergent-platform/types';

import {
  executeActions,
  ActionExecutorContext,
  buildScriptContext,
} from './action-executor';
import { evaluateExpression, evaluateCondition } from './script-engine';

// ============================================================================
// STORE TYPES
// ============================================================================

interface InteractiveStoreState {
  // Configuration
  config: InteractiveAppConfig | null;
  isInteractiveMode: boolean;

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
    enableInteractiveMode: () => set({ isInteractiveMode: true }),

    // Disable interactive mode
    disableInteractiveMode: () => {
      get().stopAllTimers();
      set({ isInteractiveMode: false });
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
      const { isInteractiveMode, config, runtime } = get();
      if (!isInteractiveMode || !config) return;

      set({ isProcessingEvent: true });

      // Filter handlers that match this event type
      const matchingHandlers = handlers.filter(
        h => h.event === event.type && h.enabled
      );

      // Create executor context
      const executorContext: ActionExecutorContext = {
        runtime,
        event,
        element: null,
        functions: config.functions,
        onNavigate: (templateId, params) => get().navigate(templateId, params),
        onStateChange: (state) => set(s => ({ runtime: { ...s.runtime, state } })),
        onElementUpdate: () => {}, // Would integrate with designer store
        onElementVisibility: () => {}, // Would integrate with designer store
        onPlayAnimation: () => {}, // Would integrate with designer store
        onPlayTimeline: () => {}, // Would integrate with designer store
        onFetchData: async (url, options) => {
          const response = await fetch(url, options);
          return response.json();
        },
        onValidateForm: (formId) => {
          const form = runtime.forms[formId];
          return { isValid: true, errors: form?.errors ?? {} };
        },
        onSubmitForm: async () => {},
        onLog: console.log,
      };

      // Execute handlers
      for (const handler of matchingHandlers) {
        // Check handler conditions
        if (handler.conditions && handler.conditions.length > 0) {
          const scriptContext = buildScriptContext(executorContext);
          const allConditionsMet = handler.conditions.every(c =>
            evaluateCondition(c, scriptContext)
          );
          if (!allConditionsMet) continue;
        }

        await executeActions(handler.actions, executorContext);
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

        // Execute timer actions
        const executorContext: ActionExecutorContext = {
          runtime: get().runtime,
          event,
          element: null,
          functions: config.functions,
          onNavigate: (templateId, params) => get().navigate(templateId, params),
          onStateChange: (state) => set(s => ({ runtime: { ...s.runtime, state } })),
          onElementUpdate: () => {},
          onElementVisibility: () => {},
          onPlayAnimation: () => {},
          onPlayTimeline: () => {},
          onFetchData: async (url, options) => {
            const response = await fetch(url, options);
            return response.json();
          },
          onValidateForm: () => ({ isValid: true, errors: {} }),
          onSubmitForm: async () => {},
          onLog: console.log,
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
