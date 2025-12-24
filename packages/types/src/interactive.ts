/**
 * Interactive Apps Framework Types
 *
 * This module defines the types for building interactive applications in Nova GFX.
 * Supports: Interactive dashboards, multi-screen apps, forms with validation,
 * and data manipulation (transform, filter, aggregate).
 */

// ============================================================================
// EVENT SYSTEM
// ============================================================================

/**
 * Events that can trigger interactions on elements
 */
export type InteractionEventType =
  | 'click'           // Mouse click / tap
  | 'doubleClick'     // Double click / double tap
  | 'hover'           // Mouse enter
  | 'hoverEnd'        // Mouse leave
  | 'focus'           // Input element focused
  | 'blur'            // Input element lost focus
  | 'change'          // Input value changed
  | 'submit'          // Form submitted
  | 'keyPress'        // Key pressed (when element focused)
  | 'load'            // Element loaded / visible
  | 'dataChange'      // Bound data changed
  | 'stateChange'     // App state variable changed
  | 'animationEnd'    // Animation completed
  | 'timerTick'       // Timer interval fired
  | 'swipeLeft'       // Touch swipe gestures
  | 'swipeRight'
  | 'swipeUp'
  | 'swipeDown';

/**
 * Event object passed to handlers
 */
export interface InteractionEvent {
  type: InteractionEventType;
  elementId: string;
  timestamp: number;
  // Event-specific data
  data?: {
    // For input events
    value?: string | number | boolean;
    previousValue?: string | number | boolean;
    // For keyboard events
    key?: string;
    keyCode?: number;
    modifiers?: { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean };
    // For mouse events
    x?: number;
    y?: number;
    clientX?: number;
    clientY?: number;
    // For data events
    field?: string;
    oldData?: unknown;
    newData?: unknown;
    // For state events
    stateName?: string;
    stateValue?: unknown;
  };
}

/**
 * Event handler configuration attached to elements
 */
export interface ElementEventHandler {
  id: string;
  event: InteractionEventType;
  // Conditions to check before executing (optional)
  conditions?: InteractionCondition[];
  // Actions to execute
  actions: InteractionAction[];
  // Whether to stop event propagation
  stopPropagation?: boolean;
  // Whether to prevent default behavior
  preventDefault?: boolean;
  // Debounce/throttle settings
  debounce?: number;
  throttle?: number;
  // Enable/disable
  enabled: boolean;
}

// ============================================================================
// CONDITIONS
// ============================================================================

/**
 * Condition operators for evaluating state/data
 */
export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterOrEqual'
  | 'lessOrEqual'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isNull'
  | 'isNotNull'
  | 'matches'         // Regex match
  | 'in'              // Value in array
  | 'notIn';

/**
 * Condition to evaluate before executing actions
 */
export interface InteractionCondition {
  id: string;
  // What to check
  source: ConditionSource;
  // How to compare
  operator: ConditionOperator;
  // Value to compare against (can be literal or expression)
  value?: string | number | boolean | null;
  // For compound conditions
  and?: InteractionCondition[];
  or?: InteractionCondition[];
  not?: boolean;
}

/**
 * Source for condition evaluation
 */
export type ConditionSource =
  | { type: 'state'; name: string }                    // App state variable
  | { type: 'data'; path: string }                     // Data binding path
  | { type: 'element'; elementId: string; property: string }  // Element property
  | { type: 'event'; property: string }               // Event data
  | { type: 'expression'; code: string };             // JavaScript expression

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Action types that can be triggered by events
 */
export type InteractionActionType =
  // Navigation
  | 'navigate'              // Go to another template/screen
  | 'navigateBack'          // Go back in navigation history
  | 'openUrl'               // Open external URL
  | 'openModal'             // Open a template as modal
  | 'closeModal'            // Close current modal

  // State Management
  | 'setState'              // Set app state variable
  | 'toggleState'           // Toggle boolean state
  | 'incrementState'        // Increment numeric state
  | 'decrementState'        // Decrement numeric state
  | 'resetState'            // Reset state to default
  | 'mergeState'            // Merge object into state

  // Data Operations
  | 'setData'               // Set data value
  | 'filterData'            // Filter data array
  | 'sortData'              // Sort data array
  | 'aggregateData'         // Aggregate data (sum, avg, count, etc.)
  | 'transformData'         // Transform data with expression
  | 'fetchData'             // Fetch data from API endpoint
  | 'refreshData'           // Refresh current data source
  | 'nextRecord'            // Go to next data record
  | 'previousRecord'        // Go to previous data record
  | 'goToRecord'            // Go to specific record index

  // Element Manipulation
  | 'setElementProperty'    // Set element property
  | 'toggleElement'         // Toggle element visibility
  | 'showElement'           // Show element
  | 'hideElement'           // Hide element
  | 'enableElement'         // Enable element (for inputs)
  | 'disableElement'        // Disable element
  | 'focusElement'          // Focus input element
  | 'scrollToElement'       // Scroll to element

  // Animation
  | 'playAnimation'         // Play element animation
  | 'pauseAnimation'        // Pause animation
  | 'stopAnimation'         // Stop animation
  | 'playTimeline'          // Play template timeline (IN → LOOP → OUT)
  | 'goToPhase'             // Go to specific phase (in/loop/out)

  // Forms
  | 'validateForm'          // Validate form inputs
  | 'submitForm'            // Submit form data
  | 'resetForm'             // Reset form to defaults
  | 'setFieldValue'         // Set form field value
  | 'setFieldError'         // Set form field error
  | 'clearFieldError'       // Clear form field error

  // Advanced
  | 'runScript'             // Execute custom JavaScript
  | 'callFunction'          // Call named function
  | 'emit'                  // Emit custom event
  | 'log'                   // Log to console (debugging)
  | 'wait'                  // Wait/delay
  | 'conditional'           // Conditional action execution
  | 'loop'                  // Loop over data
  | 'parallel'              // Execute actions in parallel
  | 'sequence';             // Execute actions in sequence

/**
 * Base action interface
 */
export interface InteractionActionBase {
  id: string;
  type: InteractionActionType;
  // Delay before executing (ms)
  delay?: number;
  // Conditions to check before executing
  conditions?: InteractionCondition[];
  // Enable/disable
  enabled: boolean;
}

/**
 * Navigation action
 */
export interface NavigateAction extends InteractionActionBase {
  type: 'navigate';
  target: {
    templateId?: string;      // Target template ID
    templateName?: string;    // Or target by name
    params?: Record<string, unknown>;  // Navigation parameters
    transition?: NavigationTransition;
  };
}

export interface NavigationTransition {
  type: 'fade' | 'slide' | 'scale' | 'none';
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  easing?: string;
}

/**
 * State manipulation action
 */
export interface SetStateAction extends InteractionActionBase {
  type: 'setState';
  target: {
    name: string;             // State variable name
    value: ValueSource;       // Value to set
  };
}

export interface ToggleStateAction extends InteractionActionBase {
  type: 'toggleState';
  target: {
    name: string;
  };
}

export interface IncrementStateAction extends InteractionActionBase {
  type: 'incrementState' | 'decrementState';
  target: {
    name: string;
    amount?: number | ValueSource;
  };
}

/**
 * Data operation action
 */
export interface FilterDataAction extends InteractionActionBase {
  type: 'filterData';
  target: {
    dataSource: string;       // Data source to filter
    outputTo?: string;        // State variable to store result (or modify in place)
    conditions: DataFilterCondition[];
  };
}

export interface DataFilterCondition {
  field: string;
  operator: ConditionOperator;
  value: ValueSource;
}

export interface SortDataAction extends InteractionActionBase {
  type: 'sortData';
  target: {
    dataSource: string;
    outputTo?: string;
    sortBy: Array<{
      field: string;
      direction: 'asc' | 'desc';
    }>;
  };
}

export interface AggregateDataAction extends InteractionActionBase {
  type: 'aggregateData';
  target: {
    dataSource: string;
    outputTo: string;         // State variable for result
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';
    field?: string;           // Field to aggregate (not needed for count)
    groupBy?: string[];       // Optional grouping
  };
}

export interface TransformDataAction extends InteractionActionBase {
  type: 'transformData';
  target: {
    dataSource: string;
    outputTo?: string;
    expression: string;       // JavaScript expression for transformation
  };
}

export interface FetchDataAction extends InteractionActionBase {
  type: 'fetchData';
  target: {
    endpointId?: string;      // Nova API endpoint ID
    url?: string;             // Or direct URL
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: ValueSource;
    outputTo: string;         // State variable to store result
    onError?: InteractionAction[];
    onSuccess?: InteractionAction[];
  };
}

/**
 * Element manipulation action
 */
export interface SetElementPropertyAction extends InteractionActionBase {
  type: 'setElementProperty';
  target: {
    elementId: string | ValueSource;  // Can be dynamic
    property: string;                  // Property path (e.g., "content.text", "styles.color")
    value: ValueSource;
  };
}

export interface ToggleElementAction extends InteractionActionBase {
  type: 'toggleElement' | 'showElement' | 'hideElement' | 'enableElement' | 'disableElement';
  target: {
    elementId: string | ValueSource;
  };
}

/**
 * Animation action
 */
export interface PlayAnimationAction extends InteractionActionBase {
  type: 'playAnimation' | 'pauseAnimation' | 'stopAnimation';
  target: {
    elementId?: string;       // Specific element, or all if omitted
    animationId?: string;     // Specific animation
  };
}

export interface PlayTimelineAction extends InteractionActionBase {
  type: 'playTimeline';
  target: {
    templateId?: string;      // Current template if omitted
    startPhase?: 'in' | 'loop' | 'out';
    autoTransition?: boolean; // Auto transition through phases
  };
}

/**
 * Form action
 */
export interface ValidateFormAction extends InteractionActionBase {
  type: 'validateForm';
  target: {
    formId?: string;          // Form element ID (validates all inputs inside)
    rules?: FormValidationRule[];
    onValid?: InteractionAction[];
    onInvalid?: InteractionAction[];
  };
}

export interface FormValidationRule {
  fieldId: string;
  rules: Array<{
    type: 'required' | 'email' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'custom';
    value?: string | number;
    message: string;
    customValidator?: string;  // JavaScript expression
  }>;
}

export interface SubmitFormAction extends InteractionActionBase {
  type: 'submitForm';
  target: {
    formId?: string;
    endpointId?: string;      // Nova API endpoint
    url?: string;             // Or direct URL
    method?: 'POST' | 'PUT';
    transform?: string;       // Expression to transform form data before submit
    onSuccess?: InteractionAction[];
    onError?: InteractionAction[];
  };
}

/**
 * Script action (for advanced users)
 */
export interface RunScriptAction extends InteractionActionBase {
  type: 'runScript';
  target: {
    code: string;             // JavaScript code to execute
    // Available in scope: state, data, event, element, actions (action helpers)
  };
}

export interface CallFunctionAction extends InteractionActionBase {
  type: 'callFunction';
  target: {
    name: string;             // Function name (defined in app functions)
    args?: ValueSource[];
  };
}

/**
 * Control flow actions
 */
export interface ConditionalAction extends InteractionActionBase {
  type: 'conditional';
  target: {
    conditions: InteractionCondition[];
    then: InteractionAction[];
    else?: InteractionAction[];
  };
}

export interface LoopAction extends InteractionActionBase {
  type: 'loop';
  target: {
    dataSource: string;       // Data to iterate
    itemVariable: string;     // Variable name for current item
    indexVariable?: string;   // Variable name for index
    actions: InteractionAction[];
    maxIterations?: number;   // Safety limit
  };
}

export interface WaitAction extends InteractionActionBase {
  type: 'wait';
  target: {
    duration: number;         // Milliseconds
  };
}

/**
 * Union of all action types
 */
export type InteractionAction =
  | NavigateAction
  | SetStateAction
  | ToggleStateAction
  | IncrementStateAction
  | FilterDataAction
  | SortDataAction
  | AggregateDataAction
  | TransformDataAction
  | FetchDataAction
  | SetElementPropertyAction
  | ToggleElementAction
  | PlayAnimationAction
  | PlayTimelineAction
  | ValidateFormAction
  | SubmitFormAction
  | RunScriptAction
  | CallFunctionAction
  | ConditionalAction
  | LoopAction
  | WaitAction
  | InteractionActionBase;    // For simple actions like navigateBack, log, etc.

// ============================================================================
// VALUE SOURCES
// ============================================================================

/**
 * Dynamic value source - can be literal, from state, data, or expression
 */
export type ValueSource =
  | { type: 'literal'; value: string | number | boolean | null | unknown[] | Record<string, unknown> }
  | { type: 'state'; name: string }
  | { type: 'data'; path: string }
  | { type: 'element'; elementId: string; property: string }
  | { type: 'event'; property: string }
  | { type: 'expression'; code: string }
  | { type: 'navigation'; param: string };   // Navigation parameter

// ============================================================================
// APP STATE
// ============================================================================

/**
 * App state variable definition
 */
export interface AppStateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue: unknown;
  persist?: boolean;          // Save to localStorage
  scope?: 'global' | 'template';  // Global or template-scoped
  description?: string;
}

/**
 * Computed state (derived from other state/data)
 */
export interface ComputedState {
  name: string;
  expression: string;         // JavaScript expression
  dependencies: string[];     // State/data paths this depends on
  description?: string;
}

/**
 * Named function that can be called by actions
 */
export interface AppFunction {
  name: string;
  params: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
    required?: boolean;
    defaultValue?: unknown;
  }>;
  body: string;               // JavaScript function body
  description?: string;
}

// ============================================================================
// INPUT ELEMENTS
// ============================================================================

/**
 * Input element types (extends base element types)
 */
export type InputElementType =
  | 'text-input'
  | 'number-input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'toggle'
  | 'slider'
  | 'date-picker'
  | 'time-picker'
  | 'color-picker'
  | 'file-upload'
  | 'button';

/**
 * Input element configuration
 */
export interface InputElementConfig {
  inputType: InputElementType;
  name: string;               // Form field name
  label?: string;
  placeholder?: string;
  defaultValue?: unknown;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  // Validation rules
  validation?: InputValidation;
  // Type-specific options
  options?: InputOptions;
  // Binding
  bindTo?: string;            // State variable to bind value to
}

export interface InputValidation {
  required?: { value: boolean; message: string };
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: string; message: string };
  custom?: { expression: string; message: string };
}

export interface InputOptions {
  // For select/radio
  choices?: Array<{ value: string | number; label: string; disabled?: boolean }>;
  // For slider
  step?: number;
  showValue?: boolean;
  // For file upload
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  // For text input
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  autocomplete?: string;
}

// ============================================================================
// INTERACTIVE APP CONFIGURATION
// ============================================================================

/**
 * Full interactive app configuration (stored at project level)
 */
export interface InteractiveAppConfig {
  // App metadata
  name: string;
  description?: string;
  version: string;

  // Global state variables
  state: AppStateVariable[];

  // Computed/derived state
  computed: ComputedState[];

  // Named functions
  functions: AppFunction[];

  // Navigation configuration
  navigation: {
    initialTemplateId: string;
    history: {
      enabled: boolean;
      maxLength?: number;
    };
    transitions: {
      default: NavigationTransition;
    };
  };

  // Global event handlers (fire on any template)
  globalHandlers: ElementEventHandler[];

  // Timer/interval definitions
  timers: Array<{
    id: string;
    name: string;
    interval: number;         // Milliseconds
    enabled: boolean;
    actions: InteractionAction[];
  }>;

  // Data transformation pipelines (reusable)
  dataPipelines: Array<{
    id: string;
    name: string;
    steps: Array<FilterDataAction | SortDataAction | AggregateDataAction | TransformDataAction>;
  }>;
}

/**
 * Element event handlers (stored on element)
 */
export interface ElementInteractions {
  handlers: ElementEventHandler[];
  // Input configuration (if element is an input)
  input?: InputElementConfig;
}

/**
 * Runtime state for interactive app
 */
export interface InteractiveAppRuntime {
  // Current state values
  state: Record<string, unknown>;
  // Computed state cache
  computedCache: Record<string, unknown>;
  // Navigation history
  navigationHistory: Array<{
    templateId: string;
    params?: Record<string, unknown>;
    timestamp: number;
  }>;
  // Current navigation params
  navigationParams: Record<string, unknown>;
  // Form state
  forms: Record<string, {
    values: Record<string, unknown>;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    isValid: boolean;
    isSubmitting: boolean;
  }>;
  // Active timers
  activeTimers: Map<string, ReturnType<typeof setTimeout>>;
  // Event queue
  eventQueue: InteractionEvent[];
  // Is processing
  isProcessing: boolean;
}

// ============================================================================
// SCRIPT EXECUTION CONTEXT
// ============================================================================

/**
 * Context available in script execution
 */
export interface ScriptContext {
  // Read/write state
  state: Record<string, unknown>;
  // Read-only data (from data sources)
  data: Record<string, unknown>;
  // Current event that triggered the script
  event: InteractionEvent | null;
  // Element that triggered the event
  element: {
    id: string;
    name: string;
    type: string;
    properties: Record<string, unknown>;
  } | null;
  // Navigation params
  params: Record<string, unknown>;
  // Helper functions
  actions: {
    navigate: (templateId: string, params?: Record<string, unknown>) => void;
    setState: (name: string, value: unknown) => void;
    getState: (name: string) => unknown;
    showElement: (elementId: string) => void;
    hideElement: (elementId: string) => void;
    playAnimation: (elementId?: string) => void;
    fetchData: (url: string, options?: RequestInit) => Promise<unknown>;
    log: (message: string, data?: unknown) => void;
  };
}
