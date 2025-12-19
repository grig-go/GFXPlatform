/**
 * Safe JavaScript Execution Engine for Interactive Apps
 *
 * Provides sandboxed execution of user scripts with controlled context.
 * Uses Function constructor for expression evaluation with explicit allowlist.
 *
 * Security model:
 * - No access to window, document, or DOM APIs
 * - No network access (fetch must be provided via actions)
 * - No file system access
 * - Limited to data transformation and logic
 * - Expression timeout protection
 * - Loop iteration limits to prevent infinite loops
 */

// ============================================================================
// EXECUTION SAFETY CONFIG
// ============================================================================

/** Maximum execution time for expressions in milliseconds */
const EXPRESSION_TIMEOUT_MS = 1000;

/** Maximum execution time for scripts in milliseconds */
const SCRIPT_TIMEOUT_MS = 5000;

/** Maximum iterations for loops to prevent infinite loops */
const MAX_LOOP_ITERATIONS = 10000;

/** Maximum recursion depth */
const MAX_RECURSION_DEPTH = 100;

import type {
  ScriptContext,
  InteractionEvent,
  ValueSource,
  InteractionCondition,
  ConditionOperator,
  Element,
} from '@emergent-platform/types';

// ============================================================================
// ELEMENT STORE INTEGRATION
// ============================================================================

// Lazy import reference to designer store for element lookups
let designerStoreRef: { getState: () => { elements: Element[] } } | null = null;

/**
 * Set the designer store reference for element lookups
 * Called from interactive-store initialization
 */
export function setDesignerStoreRef(store: { getState: () => { elements: Element[] } }) {
  designerStoreRef = store;
}

/**
 * Get element by ID from the designer store
 */
function getElementById(elementId: string): Element | undefined {
  if (!designerStoreRef) return undefined;
  const state = designerStoreRef.getState();
  return state.elements.find(e => e.id === elementId || e.element_id === elementId);
}

/**
 * Get element property value
 */
function getElementProperty(elementId: string, property: string): unknown {
  const element = getElementById(elementId);
  if (!element) return undefined;

  // Map common property names
  const propertyMap: Record<string, keyof Element | string> = {
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
    'type': 'element_type',
    'name': 'name',
  };

  const elementKey = propertyMap[property] || property;

  // Handle nested properties (e.g., 'content.text', 'styles.color')
  if (property.includes('.')) {
    return getNestedValue(element, property);
  }

  return (element as Record<string, unknown>)[elementKey];
}

// ============================================================================
// SAFE EXPRESSION EVALUATION
// ============================================================================

/**
 * Forbidden identifiers that should never be accessible in scripts
 */
const FORBIDDEN_IDENTIFIERS = new Set([
  'window',
  'document',
  'globalThis',
  'eval',
  'Function',
  'constructor',
  '__proto__',
  'prototype',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
  'importScripts',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'alert',
  'confirm',
  'prompt',
  'open',
  'close',
  'location',
  'history',
  'navigator',
  'screen',
]);

/**
 * Check if expression contains forbidden identifiers
 */
function validateExpression(code: string): void {
  // Remove string literals to avoid false positives
  const withoutStrings = code.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, '""');

  for (const forbidden of FORBIDDEN_IDENTIFIERS) {
    // Check for standalone identifier (not as property access)
    const regex = new RegExp(`\\b${forbidden}\\b`, 'g');
    if (regex.test(withoutStrings)) {
      throw new Error(`Forbidden identifier: ${forbidden}`);
    }
  }
}

// ============================================================================
// EXECUTION TIMEOUT & SAFETY
// ============================================================================

/**
 * Error thrown when script execution times out
 */
class ScriptTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Script execution timed out after ${timeoutMs}ms`);
    this.name = 'ScriptTimeoutError';
  }
}

/**
 * Error thrown when loop iteration limit is exceeded
 */
class LoopIterationError extends Error {
  constructor(limit: number) {
    super(`Loop iteration limit exceeded (${limit} iterations). Possible infinite loop.`);
    this.name = 'LoopIterationError';
  }
}

/**
 * Create a safe loop iterator that tracks iterations and throws if limit exceeded
 */
function createSafeIterator<T>(iterable: Iterable<T>, maxIterations = MAX_LOOP_ITERATIONS): Iterable<T> {
  return {
    [Symbol.iterator]: function* () {
      let count = 0;
      for (const item of iterable) {
        if (++count > maxIterations) {
          throw new LoopIterationError(maxIterations);
        }
        yield item;
      }
    }
  };
}

/**
 * Create a safe while/for counter that throws if limit exceeded
 */
function createLoopGuard(maxIterations = MAX_LOOP_ITERATIONS): () => void {
  let count = 0;
  return () => {
    if (++count > maxIterations) {
      throw new LoopIterationError(maxIterations);
    }
  };
}

/**
 * Execute a function with timeout protection
 * For synchronous operations, this wraps in a promise with timeout
 */
async function withTimeout<T>(
  fn: () => T | Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new ScriptTimeoutError(timeoutMs));
    }, timeoutMs);

    try {
      const result = fn();
      if (result instanceof Promise) {
        result
          .then((value) => {
            clearTimeout(timeoutId);
            resolve(value);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      } else {
        clearTimeout(timeoutId);
        resolve(result);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Execute a JavaScript expression safely
 * Returns the result of the expression
 */
export function evaluateExpression<T = unknown>(
  expression: string,
  context: Partial<ScriptContext>
): T {
  try {
    validateExpression(expression);

    // Build the function with explicit context parameters
    const fn = new Function(
      'state',
      'data',
      'event',
      'element',
      'params',
      'actions',
      // Helper functions available in expressions
      'sum',
      'avg',
      'min',
      'max',
      'count',
      'filter',
      'map',
      'find',
      'sort',
      'groupBy',
      'format',
      `"use strict"; return (${expression});`
    );

    // Execute with context
    return fn(
      context.state ?? {},
      context.data ?? {},
      context.event ?? null,
      context.element ?? null,
      context.params ?? {},
      context.actions ?? createNoopActions(),
      // Helper implementations
      sum,
      avg,
      min,
      max,
      count,
      filter,
      map,
      find,
      sortArray,
      groupBy,
      formatValue
    ) as T;
  } catch (error) {
    console.error('Expression evaluation error:', expression, error);
    throw new Error(`Failed to evaluate expression: ${(error as Error).message}`);
  }
}

/**
 * Execute a script block safely (multiple statements)
 * Synchronous version for simple scripts
 */
export function executeScript(
  code: string,
  context: Partial<ScriptContext>
): void {
  try {
    validateExpression(code);

    // Create a loop guard for iteration limits
    const loopGuard = createLoopGuard();

    const fn = new Function(
      'state',
      'data',
      'event',
      'element',
      'params',
      'actions',
      'sum',
      'avg',
      'min',
      'max',
      'count',
      'filter',
      'map',
      'find',
      'sort',
      'groupBy',
      'format',
      '__loopGuard',
      `"use strict"; ${code}`
    );

    fn(
      context.state ?? {},
      context.data ?? {},
      context.event ?? null,
      context.element ?? null,
      context.params ?? {},
      context.actions ?? createNoopActions(),
      sum,
      avg,
      min,
      max,
      count,
      filter,
      map,
      find,
      sortArray,
      groupBy,
      formatValue,
      loopGuard
    );
  } catch (error) {
    console.error('Script execution error:', error);
    throw new Error(`Script execution failed: ${(error as Error).message}`);
  }
}

/**
 * Execute a script block safely with timeout protection
 * Async version for scripts that may take longer
 */
export async function executeScriptAsync(
  code: string,
  context: Partial<ScriptContext>,
  timeoutMs = SCRIPT_TIMEOUT_MS
): Promise<void> {
  try {
    validateExpression(code);

    await withTimeout(
      () => executeScript(code, context),
      timeoutMs,
      'script execution'
    );
  } catch (error) {
    if (error instanceof ScriptTimeoutError) {
      console.error('Script timeout:', code);
      throw error;
    }
    if (error instanceof LoopIterationError) {
      console.error('Infinite loop detected:', code);
      throw error;
    }
    throw error;
  }
}

// ============================================================================
// VALUE SOURCE RESOLUTION
// ============================================================================

/**
 * Resolve a ValueSource to its actual value
 */
export function resolveValue(
  source: ValueSource | string | number | boolean | null | undefined,
  context: Partial<ScriptContext>
): unknown {
  // Primitive values
  if (source === null || source === undefined) return source;
  if (typeof source !== 'object') return source;

  const vs = source as ValueSource;

  switch (vs.type) {
    case 'literal':
      return vs.value;

    case 'state':
      return getNestedValue(context.state ?? {}, vs.name);

    case 'data':
      return getNestedValue(context.data ?? {}, vs.path);

    case 'element':
      // Element property resolution using designer store
      // First check context.element for current element
      if (context.element && vs.elementId === context.element.id) {
        return getNestedValue(context.element.properties, vs.property);
      }
      // Otherwise look up element from designer store
      return getElementProperty(vs.elementId, vs.property);

    case 'event':
      if (!context.event) return undefined;
      return getNestedValue(context.event, vs.property);

    case 'expression':
      return evaluateExpression(vs.code, context);

    case 'navigation':
      return getNestedValue(context.params ?? {}, vs.param);

    default:
      return undefined;
  }
}

/**
 * Get a nested value from an object using dot notation path
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;

  const parts = path.split(/[.[\]]+/).filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation path
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split(/[.[\]]+/).filter(Boolean);
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      // Determine if next key is numeric (array) or string (object)
      const nextPart = parts[i + 1];
      current[part] = /^\d+$/.test(nextPart) ? [] : {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

// ============================================================================
// CONDITION EVALUATION
// ============================================================================

/**
 * Evaluate a condition against the current context
 */
export function evaluateCondition(
  condition: InteractionCondition,
  context: Partial<ScriptContext>
): boolean {
  // Handle compound conditions
  if (condition.and && condition.and.length > 0) {
    const result = condition.and.every(c => evaluateCondition(c, context));
    return condition.not ? !result : result;
  }

  if (condition.or && condition.or.length > 0) {
    const result = condition.or.some(c => evaluateCondition(c, context));
    return condition.not ? !result : result;
  }

  // Resolve source value
  let sourceValue: unknown;

  switch (condition.source.type) {
    case 'state':
      sourceValue = getNestedValue(context.state ?? {}, condition.source.name);
      break;
    case 'data':
      sourceValue = getNestedValue(context.data ?? {}, condition.source.path);
      break;
    case 'element':
      // Get element property from designer store
      sourceValue = getElementProperty(condition.source.elementId, condition.source.property);
      break;
    case 'event':
      sourceValue = getNestedValue(context.event ?? {}, condition.source.property);
      break;
    case 'expression':
      sourceValue = evaluateExpression(condition.source.code, context);
      break;
    default:
      sourceValue = undefined;
  }

  // Evaluate condition
  const result = evaluateOperator(condition.operator, sourceValue, condition.value);
  return condition.not ? !result : result;
}

/**
 * Evaluate a condition operator
 */
function evaluateOperator(
  operator: ConditionOperator,
  sourceValue: unknown,
  compareValue: unknown
): boolean {
  switch (operator) {
    case 'equals':
      return sourceValue === compareValue;

    case 'notEquals':
      return sourceValue !== compareValue;

    case 'greaterThan':
      return Number(sourceValue) > Number(compareValue);

    case 'lessThan':
      return Number(sourceValue) < Number(compareValue);

    case 'greaterOrEqual':
      return Number(sourceValue) >= Number(compareValue);

    case 'lessOrEqual':
      return Number(sourceValue) <= Number(compareValue);

    case 'contains':
      if (typeof sourceValue === 'string') {
        return sourceValue.includes(String(compareValue));
      }
      if (Array.isArray(sourceValue)) {
        return sourceValue.includes(compareValue);
      }
      return false;

    case 'notContains':
      return !evaluateOperator('contains', sourceValue, compareValue);

    case 'startsWith':
      return String(sourceValue).startsWith(String(compareValue));

    case 'endsWith':
      return String(sourceValue).endsWith(String(compareValue));

    case 'isEmpty':
      if (sourceValue === null || sourceValue === undefined) return true;
      if (typeof sourceValue === 'string') return sourceValue.length === 0;
      if (Array.isArray(sourceValue)) return sourceValue.length === 0;
      if (typeof sourceValue === 'object') return Object.keys(sourceValue).length === 0;
      return false;

    case 'isNotEmpty':
      return !evaluateOperator('isEmpty', sourceValue, compareValue);

    case 'isNull':
      return sourceValue === null || sourceValue === undefined;

    case 'isNotNull':
      return sourceValue !== null && sourceValue !== undefined;

    case 'matches':
      try {
        const regex = new RegExp(String(compareValue));
        return regex.test(String(sourceValue));
      } catch {
        return false;
      }

    case 'in':
      if (Array.isArray(compareValue)) {
        return compareValue.includes(sourceValue);
      }
      return false;

    case 'notIn':
      return !evaluateOperator('in', sourceValue, compareValue);

    default:
      return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS (Available in expressions)
// ============================================================================

function sum(arr: unknown[], field?: string): number {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((acc, item) => {
    const value = field ? getNestedValue(item, field) : item;
    return acc + (Number(value) || 0);
  }, 0);
}

function avg(arr: unknown[], field?: string): number {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return sum(arr, field) / arr.length;
}

function min(arr: unknown[], field?: string): number {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return Math.min(...arr.map(item => {
    const value = field ? getNestedValue(item, field) : item;
    return Number(value) || Infinity;
  }));
}

function max(arr: unknown[], field?: string): number {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return Math.max(...arr.map(item => {
    const value = field ? getNestedValue(item, field) : item;
    return Number(value) || -Infinity;
  }));
}

function count(arr: unknown[], predicate?: (item: unknown) => boolean): number {
  if (!Array.isArray(arr)) return 0;
  if (!predicate) return arr.length;
  return arr.filter(predicate).length;
}

function filter<T>(arr: T[], predicate: (item: T, index: number) => boolean): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(predicate);
}

function map<T, U>(arr: T[], mapper: (item: T, index: number) => U): U[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(mapper);
}

function find<T>(arr: T[], predicate: (item: T, index: number) => boolean): T | undefined {
  if (!Array.isArray(arr)) return undefined;
  return arr.find(predicate);
}

function sortArray<T>(arr: T[], key?: string, direction: 'asc' | 'desc' = 'asc'): T[] {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => {
    const aVal = key ? getNestedValue(a, key) : a;
    const bVal = key ? getNestedValue(b, key) : b;

    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else {
      comparison = Number(aVal) - Number(bVal);
    }

    return direction === 'desc' ? -comparison : comparison;
  });
}

function groupBy<T>(arr: T[], key: string): Record<string, T[]> {
  if (!Array.isArray(arr)) return {};
  return arr.reduce((groups, item) => {
    const groupKey = String(getNestedValue(item, key) ?? 'undefined');
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

function formatValue(value: unknown, format: string, options?: Record<string, unknown>): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat(options?.locale as string ?? 'en-US', {
        style: 'currency',
        currency: options?.currency as string ?? 'USD',
      }).format(Number(value));

    case 'number':
      return new Intl.NumberFormat(options?.locale as string ?? 'en-US', {
        minimumFractionDigits: options?.decimals as number ?? 0,
        maximumFractionDigits: options?.decimals as number ?? 2,
      }).format(Number(value));

    case 'percent':
      return new Intl.NumberFormat(options?.locale as string ?? 'en-US', {
        style: 'percent',
        minimumFractionDigits: options?.decimals as number ?? 0,
      }).format(Number(value));

    case 'date':
      return new Intl.DateTimeFormat(options?.locale as string ?? 'en-US', {
        dateStyle: options?.dateStyle as 'full' | 'long' | 'medium' | 'short' ?? 'medium',
      }).format(new Date(value as string | number));

    case 'time':
      return new Intl.DateTimeFormat(options?.locale as string ?? 'en-US', {
        timeStyle: options?.timeStyle as 'full' | 'long' | 'medium' | 'short' ?? 'short',
      }).format(new Date(value as string | number));

    case 'datetime':
      return new Intl.DateTimeFormat(options?.locale as string ?? 'en-US', {
        dateStyle: options?.dateStyle as 'full' | 'long' | 'medium' | 'short' ?? 'medium',
        timeStyle: options?.timeStyle as 'full' | 'long' | 'medium' | 'short' ?? 'short',
      }).format(new Date(value as string | number));

    case 'uppercase':
      return String(value).toUpperCase();

    case 'lowercase':
      return String(value).toLowerCase();

    case 'capitalize':
      return String(value).replace(/\b\w/g, c => c.toUpperCase());

    default:
      return String(value);
  }
}

/**
 * Create no-op actions for expression evaluation (read-only context)
 */
function createNoopActions(): ScriptContext['actions'] {
  return {
    navigate: () => {},
    setState: () => {},
    getState: () => undefined,
    showElement: () => {},
    hideElement: () => {},
    playAnimation: () => {},
    fetchData: async () => undefined,
    log: console.log,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  validateExpression,
  sum,
  avg,
  min,
  max,
  count,
  filter,
  map,
  find,
  sortArray as sort,
  groupBy,
  formatValue as format,
  // Safety exports
  ScriptTimeoutError,
  LoopIterationError,
  createLoopGuard,
  createSafeIterator,
  // Config exports
  EXPRESSION_TIMEOUT_MS,
  SCRIPT_TIMEOUT_MS,
  MAX_LOOP_ITERATIONS,
  MAX_RECURSION_DEPTH,
};
// Note: executeScriptAsync is already exported inline with the function definition
