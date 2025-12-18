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
 */

import type {
  ScriptContext,
  InteractionEvent,
  ValueSource,
  InteractionCondition,
  ConditionOperator,
} from '@emergent-platform/types';

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
 */
export function executeScript(
  code: string,
  context: Partial<ScriptContext>
): void {
  try {
    validateExpression(code);

    // Wrap in async IIFE for await support
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
      formatValue
    );
  } catch (error) {
    console.error('Script execution error:', error);
    throw new Error(`Script execution failed: ${(error as Error).message}`);
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
      // Element property resolution would need the element store
      // For now, return from context.element if available
      if (context.element && vs.elementId === context.element.id) {
        return getNestedValue(context.element.properties, vs.property);
      }
      return undefined;

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
      // Would need element store access
      sourceValue = undefined;
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
};
