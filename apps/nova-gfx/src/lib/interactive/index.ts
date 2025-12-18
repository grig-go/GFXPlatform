/**
 * Interactive Apps Framework
 *
 * Provides the foundation for building interactive applications in Nova GFX.
 * Includes: event handling, state management, script execution, and visual logic building.
 */

// Script engine
export {
  evaluateExpression,
  executeScript,
  resolveValue,
  evaluateCondition,
  getNestedValue,
  setNestedValue,
  validateExpression,
  sum,
  avg,
  min,
  max,
  count,
  filter,
  map,
  find,
  sort,
  groupBy,
  format,
} from './script-engine';

// Action executor
export {
  executeActions,
  buildScriptContext,
  type ActionExecutorContext,
} from './action-executor';

// Interactive store
export {
  useInteractiveStore,
  selectInteractiveMode,
  selectAppState,
  selectNavigationHistory,
  selectNavigationParams,
  selectForms,
  selectIsProcessingEvent,
  createInteractionEvent,
} from './interactive-store';
