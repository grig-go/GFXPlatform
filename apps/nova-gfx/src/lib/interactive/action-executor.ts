/**
 * Action Executor for Interactive Apps
 *
 * Executes interaction actions in response to events.
 * Handles all action types: navigation, state, data, element, animation, forms, scripts.
 */

import type {
  InteractionAction,
  InteractionEvent,
  InteractionCondition,
  ScriptContext,
  NavigateAction,
  SetStateAction,
  ToggleStateAction,
  IncrementStateAction,
  FilterDataAction,
  SortDataAction,
  AggregateDataAction,
  TransformDataAction,
  FetchDataAction,
  SetElementPropertyAction,
  ToggleElementAction,
  PlayAnimationAction,
  PlayTimelineAction,
  ValidateFormAction,
  SubmitFormAction,
  RunScriptAction,
  CallFunctionAction,
  ConditionalAction,
  LoopAction,
  WaitAction,
  InteractiveAppRuntime,
  AppFunction,
} from '@emergent-platform/types';

import {
  evaluateExpression,
  executeScript,
  executeScriptAsync,
  resolveValue,
  evaluateCondition,
  getNestedValue,
  setNestedValue,
  ScriptTimeoutError,
  LoopIterationError,
} from './script-engine';

// ============================================================================
// ACTION EXECUTOR
// ============================================================================

export interface ActionExecutorContext {
  runtime: InteractiveAppRuntime;
  event: InteractionEvent | null;
  element: ScriptContext['element'] | null;
  functions: AppFunction[];
  // Callbacks for side effects
  onNavigate: (templateId: string, params?: Record<string, unknown>) => void;
  onStateChange: (state: Record<string, unknown>) => void;
  onElementUpdate: (elementId: string, property: string, value: unknown) => void;
  onElementVisibility: (elementId: string, visible: boolean) => void;
  onPlayAnimation: (elementId?: string, animationId?: string) => void;
  onPlayTimeline: (templateId?: string, phase?: 'in' | 'loop' | 'out') => void;
  onFetchData: (url: string, options?: RequestInit) => Promise<unknown>;
  onValidateForm: (formId: string, rules?: unknown[]) => { isValid: boolean; errors: Record<string, string> };
  onSubmitForm: (formId: string, data: Record<string, unknown>, endpoint: string) => Promise<unknown>;
  onLog: (message: string, data?: unknown) => void;
}

/**
 * Execute an array of actions sequentially
 */
export async function executeActions(
  actions: InteractionAction[],
  context: ActionExecutorContext
): Promise<void> {
  for (const action of actions) {
    if (!action.enabled) continue;

    // Check conditions
    if (action.conditions && action.conditions.length > 0) {
      const scriptContext = buildScriptContext(context);
      const allConditionsMet = action.conditions.every(c =>
        evaluateCondition(c, scriptContext)
      );
      if (!allConditionsMet) continue;
    }

    // Handle delay
    if (action.delay && action.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, action.delay));
    }

    // Execute action
    await executeAction(action, context);
  }
}

/**
 * Execute a single action
 */
async function executeAction(
  action: InteractionAction,
  context: ActionExecutorContext
): Promise<void> {
  const scriptContext = buildScriptContext(context);

  switch (action.type) {
    // Navigation
    case 'navigate':
      await executeNavigate(action as NavigateAction, context, scriptContext);
      break;

    case 'navigateBack':
      executeNavigateBack(context);
      break;

    case 'openUrl':
      executeOpenUrl(action, scriptContext);
      break;

    // State Management
    case 'setState':
      executeSetState(action as SetStateAction, context, scriptContext);
      break;

    case 'toggleState':
      executeToggleState(action as ToggleStateAction, context);
      break;

    case 'incrementState':
    case 'decrementState':
      executeIncrementState(action as IncrementStateAction, context, scriptContext);
      break;

    case 'resetState':
      executeResetState(action, context);
      break;

    // Data Operations
    case 'filterData':
      executeFilterData(action as FilterDataAction, context, scriptContext);
      break;

    case 'sortData':
      executeSortData(action as SortDataAction, context, scriptContext);
      break;

    case 'aggregateData':
      executeAggregateData(action as AggregateDataAction, context, scriptContext);
      break;

    case 'transformData':
      executeTransformData(action as TransformDataAction, context, scriptContext);
      break;

    case 'fetchData':
      await executeFetchData(action as FetchDataAction, context, scriptContext);
      break;

    case 'refreshData':
      // Trigger data source refresh
      break;

    case 'nextRecord':
    case 'previousRecord':
    case 'goToRecord':
      executeRecordNavigation(action, context);
      break;

    // Element Manipulation
    case 'setElementProperty':
      executeSetElementProperty(action as SetElementPropertyAction, context, scriptContext);
      break;

    case 'toggleElement':
    case 'showElement':
    case 'hideElement':
      executeToggleElement(action as ToggleElementAction, context, scriptContext);
      break;

    // Animation
    case 'playAnimation':
    case 'pauseAnimation':
    case 'stopAnimation':
      executePlayAnimation(action as PlayAnimationAction, context);
      break;

    case 'playTimeline':
      executePlayTimeline(action as PlayTimelineAction, context);
      break;

    // Forms
    case 'validateForm':
      executeValidateForm(action as ValidateFormAction, context);
      break;

    case 'submitForm':
      await executeSubmitForm(action as SubmitFormAction, context, scriptContext);
      break;

    case 'resetForm':
      executeResetForm(action, context);
      break;

    // Scripts
    case 'runScript':
      await executeRunScript(action as RunScriptAction, context, scriptContext);
      break;

    case 'callFunction':
      await executeCallFunction(action as CallFunctionAction, context, scriptContext);
      break;

    // Control Flow
    case 'conditional':
      await executeConditional(action as ConditionalAction, context, scriptContext);
      break;

    case 'loop':
      await executeLoop(action as LoopAction, context, scriptContext);
      break;

    case 'wait':
      await executeWait(action as WaitAction);
      break;

    case 'log':
      context.onLog('Log action', { action });
      break;

    case 'emit':
      // Custom event emission - would integrate with event bus
      break;

    default:
      console.warn(`Unknown action type: ${(action as { type: string }).type}`);
  }
}

// ============================================================================
// ACTION IMPLEMENTATIONS
// ============================================================================

function executeNavigate(
  action: NavigateAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): void {
  const templateId = action.target.templateId || action.target.templateName;
  if (!templateId) return;

  const params = action.target.params
    ? Object.fromEntries(
        Object.entries(action.target.params).map(([key, value]) => [
          key,
          resolveValue(value as any, scriptContext),
        ])
      )
    : undefined;

  // Add to navigation history
  context.runtime.navigationHistory.push({
    templateId,
    params,
    timestamp: Date.now(),
  });

  context.runtime.navigationParams = params ?? {};
  context.onNavigate(templateId, params);
}

function executeNavigateBack(context: ActionExecutorContext): void {
  const history = context.runtime.navigationHistory;
  if (history.length <= 1) return;

  // Remove current
  history.pop();
  const previous = history[history.length - 1];

  if (previous) {
    context.runtime.navigationParams = previous.params ?? {};
    context.onNavigate(previous.templateId, previous.params);
  }
}

function executeOpenUrl(
  action: InteractionAction & { target?: { url?: string; newTab?: boolean } },
  scriptContext: Partial<ScriptContext>
): void {
  const url = action.target?.url;
  if (!url) return;

  const resolvedUrl = resolveValue(url as any, scriptContext) as string;
  if (action.target?.newTab !== false) {
    window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = resolvedUrl;
  }
}

function executeSetState(
  action: SetStateAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): void {
  const { name, value } = action.target;
  const resolvedValue = resolveValue(value, scriptContext);

  setNestedValue(context.runtime.state, name, resolvedValue);
  context.onStateChange({ ...context.runtime.state });
}

function executeToggleState(
  action: ToggleStateAction,
  context: ActionExecutorContext
): void {
  const { name } = action.target;
  const currentValue = getNestedValue(context.runtime.state, name);
  setNestedValue(context.runtime.state, name, !currentValue);
  context.onStateChange({ ...context.runtime.state });
}

function executeIncrementState(
  action: IncrementStateAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): void {
  const { name, amount } = action.target;
  const currentValue = Number(getNestedValue(context.runtime.state, name) ?? 0);
  const incrementAmount = amount
    ? Number(resolveValue(amount as any, scriptContext) ?? 1)
    : 1;

  const newValue =
    action.type === 'incrementState'
      ? currentValue + incrementAmount
      : currentValue - incrementAmount;

  setNestedValue(context.runtime.state, name, newValue);
  context.onStateChange({ ...context.runtime.state });
}

function executeResetState(
  action: InteractionAction & { target?: { name?: string; defaultValue?: unknown } },
  context: ActionExecutorContext
): void {
  if (action.target?.name) {
    setNestedValue(
      context.runtime.state,
      action.target.name,
      action.target.defaultValue ?? null
    );
  }
  context.onStateChange({ ...context.runtime.state });
}

function executeFilterData(
  action: FilterDataAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): void {
  const sourceData = getNestedValue(
    scriptContext.data ?? {},
    action.target.dataSource
  ) as unknown[];

  if (!Array.isArray(sourceData)) return;

  const filtered = sourceData.filter(item => {
    return action.target.conditions.every(condition => {
      const fieldValue = getNestedValue(item, condition.field);
      const compareValue = resolveValue(condition.value, scriptContext);

      switch (condition.operator) {
        case 'equals':
          return fieldValue === compareValue;
        case 'notEquals':
          return fieldValue !== compareValue;
        case 'contains':
          return String(fieldValue).includes(String(compareValue));
        case 'greaterThan':
          return Number(fieldValue) > Number(compareValue);
        case 'lessThan':
          return Number(fieldValue) < Number(compareValue);
        default:
          return true;
      }
    });
  });

  if (action.target.outputTo) {
    setNestedValue(context.runtime.state, action.target.outputTo, filtered);
    context.onStateChange({ ...context.runtime.state });
  }
}

function executeSortData(
  action: SortDataAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): void {
  const sourceData = getNestedValue(
    scriptContext.data ?? {},
    action.target.dataSource
  ) as unknown[];

  if (!Array.isArray(sourceData)) return;

  const sorted = [...sourceData].sort((a, b) => {
    for (const sort of action.target.sortBy) {
      const aVal = getNestedValue(a, sort.field);
      const bVal = getNestedValue(b, sort.field);

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else {
        comparison = Number(aVal) - Number(bVal);
      }

      if (comparison !== 0) {
        return sort.direction === 'desc' ? -comparison : comparison;
      }
    }
    return 0;
  });

  if (action.target.outputTo) {
    setNestedValue(context.runtime.state, action.target.outputTo, sorted);
    context.onStateChange({ ...context.runtime.state });
  }
}

function executeAggregateData(
  action: AggregateDataAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): void {
  const sourceData = getNestedValue(
    scriptContext.data ?? {},
    action.target.dataSource
  ) as unknown[];

  if (!Array.isArray(sourceData)) return;

  let result: unknown;

  switch (action.target.operation) {
    case 'count':
      result = sourceData.length;
      break;
    case 'sum':
      result = sourceData.reduce(
        (acc, item) => acc + Number(getNestedValue(item, action.target.field!) ?? 0),
        0
      );
      break;
    case 'avg':
      const sum = sourceData.reduce(
        (acc, item) => acc + Number(getNestedValue(item, action.target.field!) ?? 0),
        0
      );
      result = sourceData.length > 0 ? sum / sourceData.length : 0;
      break;
    case 'min':
      result = Math.min(
        ...sourceData.map(item => Number(getNestedValue(item, action.target.field!) ?? Infinity))
      );
      break;
    case 'max':
      result = Math.max(
        ...sourceData.map(item => Number(getNestedValue(item, action.target.field!) ?? -Infinity))
      );
      break;
    case 'first':
      result = sourceData[0];
      break;
    case 'last':
      result = sourceData[sourceData.length - 1];
      break;
  }

  setNestedValue(context.runtime.state, action.target.outputTo, result);
  context.onStateChange({ ...context.runtime.state });
}

function executeTransformData(
  action: TransformDataAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): void {
  const sourceData = getNestedValue(
    scriptContext.data ?? {},
    action.target.dataSource
  );

  // Execute transformation expression with data in scope
  const transformContext = {
    ...scriptContext,
    data: { ...scriptContext.data, __source: sourceData },
  };

  const result = evaluateExpression(action.target.expression, transformContext);

  if (action.target.outputTo) {
    setNestedValue(context.runtime.state, action.target.outputTo, result);
    context.onStateChange({ ...context.runtime.state });
  }
}

async function executeFetchData(
  action: FetchDataAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): Promise<void> {
  const url = action.target.url;
  if (!url) return;

  try {
    const body = action.target.body
      ? JSON.stringify(resolveValue(action.target.body, scriptContext))
      : undefined;

    const result = await context.onFetchData(url, {
      method: action.target.method ?? 'GET',
      headers: action.target.headers,
      body,
    });

    setNestedValue(context.runtime.state, action.target.outputTo, result);
    context.onStateChange({ ...context.runtime.state });

    // Execute success actions
    if (action.target.onSuccess) {
      await executeActions(action.target.onSuccess, context);
    }
  } catch (error) {
    context.onLog('Fetch error', error);

    // Execute error actions
    if (action.target.onError) {
      await executeActions(action.target.onError, context);
    }
  }
}

function executeRecordNavigation(
  action: InteractionAction & { target?: { index?: number } },
  context: ActionExecutorContext
): void {
  // This would integrate with the data binding system
  // For now, emit a state change that the data binding system can react to
  const currentIndex = (context.runtime.state.__currentRecordIndex as number) ?? 0;

  let newIndex = currentIndex;
  if (action.type === 'nextRecord') {
    newIndex = currentIndex + 1;
  } else if (action.type === 'previousRecord') {
    newIndex = Math.max(0, currentIndex - 1);
  } else if (action.type === 'goToRecord' && action.target?.index !== undefined) {
    newIndex = action.target.index;
  }

  context.runtime.state.__currentRecordIndex = newIndex;
  context.onStateChange({ ...context.runtime.state });
}

function executeSetElementProperty(
  action: SetElementPropertyAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): void {
  const elementId =
    typeof action.target.elementId === 'string'
      ? action.target.elementId
      : (resolveValue(action.target.elementId, scriptContext) as string);

  const value = resolveValue(action.target.value, scriptContext);

  context.onElementUpdate(elementId, action.target.property, value);
}

function executeToggleElement(
  action: ToggleElementAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): void {
  const elementId =
    typeof action.target.elementId === 'string'
      ? action.target.elementId
      : (resolveValue(action.target.elementId, scriptContext) as string);

  let visible: boolean;

  switch (action.type) {
    case 'showElement':
      visible = true;
      break;
    case 'hideElement':
      visible = false;
      break;
    case 'toggleElement':
    default:
      // Would need to query current visibility
      visible = true;
      break;
  }

  context.onElementVisibility(elementId, visible);
}

function executePlayAnimation(
  action: PlayAnimationAction,
  context: ActionExecutorContext
): void {
  context.onPlayAnimation(action.target.elementId, action.target.animationId);
}

function executePlayTimeline(
  action: PlayTimelineAction,
  context: ActionExecutorContext
): void {
  context.onPlayTimeline(action.target.templateId, action.target.startPhase);
}

function executeValidateForm(
  action: ValidateFormAction,
  context: ActionExecutorContext
): void {
  const formId = action.target.formId ?? 'default';
  const result = context.onValidateForm(formId, action.target.rules);

  // Update form state
  if (!context.runtime.forms[formId]) {
    context.runtime.forms[formId] = {
      values: {},
      errors: {},
      touched: {},
      isValid: true,
      isSubmitting: false,
    };
  }

  context.runtime.forms[formId].errors = result.errors;
  context.runtime.forms[formId].isValid = result.isValid;
}

async function executeSubmitForm(
  action: SubmitFormAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): Promise<void> {
  const formId = action.target.formId ?? 'default';
  const form = context.runtime.forms[formId];

  if (!form) return;

  form.isSubmitting = true;

  try {
    let data = { ...form.values };

    // Apply transformation if provided
    if (action.target.transform) {
      data = evaluateExpression(action.target.transform, {
        ...scriptContext,
        data: { ...scriptContext.data, __formData: data },
      });
    }

    const endpoint = action.target.url ?? action.target.endpointId ?? '';
    await context.onSubmitForm(formId, data, endpoint);

    form.isSubmitting = false;

    // Execute success actions
    if (action.target.onSuccess) {
      await executeActions(action.target.onSuccess, context);
    }
  } catch (error) {
    form.isSubmitting = false;
    context.onLog('Form submit error', error);

    // Execute error actions
    if (action.target.onError) {
      await executeActions(action.target.onError, context);
    }
  }
}

function executeResetForm(
  action: InteractionAction & { target?: { formId?: string } },
  context: ActionExecutorContext
): void {
  const formId = action.target?.formId ?? 'default';
  if (context.runtime.forms[formId]) {
    context.runtime.forms[formId] = {
      values: {},
      errors: {},
      touched: {},
      isValid: true,
      isSubmitting: false,
    };
  }
}

async function executeRunScript(
  action: RunScriptAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): Promise<void> {
  // Create actions object for script context
  const actions: ScriptContext['actions'] = {
    navigate: (templateId, params) => context.onNavigate(templateId, params),
    setState: (name, value) => {
      setNestedValue(context.runtime.state, name, value);
      context.onStateChange({ ...context.runtime.state });
    },
    getState: name => getNestedValue(context.runtime.state, name),
    showElement: elementId => context.onElementVisibility(elementId, true),
    hideElement: elementId => context.onElementVisibility(elementId, false),
    playAnimation: elementId => context.onPlayAnimation(elementId),
    fetchData: (url, options) => context.onFetchData(url, options),
    log: (message, data) => context.onLog(message, data),
  };

  try {
    // Use async script execution with timeout protection
    await executeScriptAsync(action.target.code, {
      ...scriptContext,
      actions,
    });
  } catch (error) {
    // Handle script safety errors gracefully
    if (error instanceof ScriptTimeoutError) {
      context.onLog('Script timeout', { code: action.target.code.substring(0, 100) + '...' });
      console.error('[Script] Execution timed out:', error.message);
    } else if (error instanceof LoopIterationError) {
      context.onLog('Infinite loop detected', { code: action.target.code.substring(0, 100) + '...' });
      console.error('[Script] Infinite loop:', error.message);
    } else {
      context.onLog('Script error', { error: (error as Error).message });
      console.error('[Script] Execution failed:', error);
    }
    // Don't rethrow - script errors shouldn't break the entire event handling chain
  }
}

async function executeCallFunction(
  action: CallFunctionAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): Promise<void> {
  const fn = context.functions.find(f => f.name === action.target.name);
  if (!fn) {
    context.onLog(`Function not found: ${action.target.name}`, null);
    return;
  }

  // Resolve arguments
  const args = (action.target.args ?? []).map(arg => resolveValue(arg, scriptContext));

  // Build parameter assignments
  const paramAssignments = fn.params
    .map((param, i) => {
      const value = args[i] ?? param.defaultValue;
      return `const ${param.name} = ${JSON.stringify(value)};`;
    })
    .join('\n');

  // Execute function body with timeout protection
  const code = `${paramAssignments}\n${fn.body}`;

  try {
    await executeScriptAsync(code, scriptContext);
  } catch (error) {
    if (error instanceof ScriptTimeoutError) {
      context.onLog('Function timeout', { name: action.target.name });
      console.error(`[Function] ${action.target.name} timed out:`, error.message);
    } else if (error instanceof LoopIterationError) {
      context.onLog('Infinite loop in function', { name: action.target.name });
      console.error(`[Function] ${action.target.name} infinite loop:`, error.message);
    } else {
      context.onLog('Function error', { name: action.target.name, error: (error as Error).message });
      console.error(`[Function] ${action.target.name} failed:`, error);
    }
  }
}

async function executeConditional(
  action: ConditionalAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): Promise<void> {
  const conditionsMet = action.target.conditions.every(c =>
    evaluateCondition(c, scriptContext)
  );

  if (conditionsMet) {
    await executeActions(action.target.then, context);
  } else if (action.target.else) {
    await executeActions(action.target.else, context);
  }
}

async function executeLoop(
  action: LoopAction,
  context: ActionExecutorContext,
  scriptContext: Partial<ScriptContext>
): Promise<void> {
  const data = getNestedValue(scriptContext.data ?? {}, action.target.dataSource) as unknown[];

  if (!Array.isArray(data)) return;

  const maxIterations = action.target.maxIterations ?? 1000;

  for (let i = 0; i < Math.min(data.length, maxIterations); i++) {
    const item = data[i];

    // Set loop variables in state
    context.runtime.state[action.target.itemVariable] = item;
    if (action.target.indexVariable) {
      context.runtime.state[action.target.indexVariable] = i;
    }

    await executeActions(action.target.actions, context);
  }

  // Clean up loop variables
  delete context.runtime.state[action.target.itemVariable];
  if (action.target.indexVariable) {
    delete context.runtime.state[action.target.indexVariable];
  }
}

async function executeWait(action: WaitAction): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, action.target.duration));
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build script context from executor context
 */
function buildScriptContext(context: ActionExecutorContext): Partial<ScriptContext> {
  return {
    state: context.runtime.state,
    data: {}, // Would come from data binding
    event: context.event,
    element: context.element,
    params: context.runtime.navigationParams,
  };
}

export { buildScriptContext };
