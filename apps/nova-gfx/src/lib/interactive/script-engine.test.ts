/**
 * Unit tests for script-engine.ts
 * Tests safe JavaScript execution, expression evaluation, and helper functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluateExpression,
  executeScript,
  executeScriptAsync,
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
  ScriptTimeoutError,
  LoopIterationError,
  createLoopGuard,
  createSafeIterator,
  EXPRESSION_TIMEOUT_MS,
  SCRIPT_TIMEOUT_MS,
  MAX_LOOP_ITERATIONS,
} from './script-engine';
import type { ScriptContext, ValueSource, InteractionCondition } from '@emergent-platform/types';

// ============================================================================
// EXPRESSION VALIDATION TESTS
// ============================================================================

describe('validateExpression', () => {
  it('should allow valid expressions', () => {
    expect(() => validateExpression('state.count + 1')).not.toThrow();
    expect(() => validateExpression('data.items.length')).not.toThrow();
    expect(() => validateExpression('Math.round(state.value)')).not.toThrow();
    expect(() => validateExpression('"hello" + " world"')).not.toThrow();
  });

  it('should block forbidden identifiers', () => {
    expect(() => validateExpression('window.location')).toThrow('Forbidden identifier: window');
    expect(() => validateExpression('document.body')).toThrow('Forbidden identifier: document');
    expect(() => validateExpression('eval("1+1")')).toThrow('Forbidden identifier: eval');
    expect(() => validateExpression('fetch("/api")')).toThrow('Forbidden identifier: fetch');
    expect(() => validateExpression('globalThis.foo')).toThrow('Forbidden identifier: globalThis');
  });

  it('should allow forbidden words inside strings', () => {
    expect(() => validateExpression('"window is a word"')).not.toThrow();
    expect(() => validateExpression("'use document type'")).not.toThrow();
    expect(() => validateExpression('`template with fetch`')).not.toThrow();
  });

  it('should block prototype chain access', () => {
    expect(() => validateExpression('obj.__proto__')).toThrow('Forbidden identifier: __proto__');
    expect(() => validateExpression('arr.constructor')).toThrow('Forbidden identifier: constructor');
    expect(() => validateExpression('obj.prototype')).toThrow('Forbidden identifier: prototype');
  });

  it('should block timer functions', () => {
    expect(() => validateExpression('setTimeout(() => {}, 100)')).toThrow('Forbidden identifier: setTimeout');
    expect(() => validateExpression('setInterval(() => {}, 100)')).toThrow('Forbidden identifier: setInterval');
  });
});

// ============================================================================
// EXPRESSION EVALUATION TESTS
// ============================================================================

describe('evaluateExpression', () => {
  it('should evaluate simple arithmetic', () => {
    expect(evaluateExpression('1 + 2', {})).toBe(3);
    expect(evaluateExpression('10 * 5', {})).toBe(50);
    expect(evaluateExpression('100 / 4', {})).toBe(25);
    expect(evaluateExpression('7 % 3', {})).toBe(1);
  });

  it('should evaluate string operations', () => {
    expect(evaluateExpression('"hello" + " world"', {})).toBe('hello world');
    expect(evaluateExpression('"test".toUpperCase()', {})).toBe('TEST');
    expect(evaluateExpression('"hello".length', {})).toBe(5);
  });

  it('should access state variables', () => {
    const context: Partial<ScriptContext> = {
      state: { count: 10, name: 'test' },
    };
    expect(evaluateExpression('state.count', context)).toBe(10);
    expect(evaluateExpression('state.count + 5', context)).toBe(15);
    expect(evaluateExpression('state.name', context)).toBe('test');
  });

  it('should access nested state', () => {
    const context: Partial<ScriptContext> = {
      state: { user: { profile: { name: 'John' } } },
    };
    expect(evaluateExpression('state.user.profile.name', context)).toBe('John');
  });

  it('should access data context', () => {
    const context: Partial<ScriptContext> = {
      data: { items: [1, 2, 3], total: 100 },
    };
    expect(evaluateExpression('data.total', context)).toBe(100);
    expect(evaluateExpression('data.items.length', context)).toBe(3);
    expect(evaluateExpression('data.items[0]', context)).toBe(1);
  });

  it('should access event data', () => {
    const context: Partial<ScriptContext> = {
      event: {
        type: 'click',
        timestamp: 1234567890,
        elementId: 'btn-1',
        data: { x: 100, y: 200 },
      } as any,
    };
    expect(evaluateExpression('event.type', context)).toBe('click');
    expect(evaluateExpression('event.data.x', context)).toBe(100);
  });

  it('should handle conditional expressions', () => {
    const context: Partial<ScriptContext> = {
      state: { isActive: true, count: 5 },
    };
    expect(evaluateExpression('state.isActive ? "yes" : "no"', context)).toBe('yes');
    expect(evaluateExpression('state.count > 3 ? "high" : "low"', context)).toBe('high');
  });

  it('should use helper functions', () => {
    const context: Partial<ScriptContext> = {
      data: { numbers: [1, 2, 3, 4, 5] },
    };
    expect(evaluateExpression('sum(data.numbers)', context)).toBe(15);
    expect(evaluateExpression('avg(data.numbers)', context)).toBe(3);
    expect(evaluateExpression('min(data.numbers)', context)).toBe(1);
    expect(evaluateExpression('max(data.numbers)', context)).toBe(5);
  });

  it('should throw on invalid expressions', () => {
    expect(() => evaluateExpression('invalid syntax !!!', {})).toThrow();
  });
});

// ============================================================================
// SCRIPT EXECUTION TESTS
// ============================================================================

describe('executeScript', () => {
  it('should execute simple statements', () => {
    const context: Partial<ScriptContext> = {
      state: { count: 0 },
    };
    executeScript('state.count = 10;', context);
    expect(context.state?.count).toBe(10);
  });

  it('should execute multiple statements', () => {
    const context: Partial<ScriptContext> = {
      state: { a: 0, b: 0 },
    };
    executeScript('state.a = 5; state.b = state.a * 2;', context);
    expect(context.state?.a).toBe(5);
    expect(context.state?.b).toBe(10);
  });

  it('should execute conditionals', () => {
    const context: Partial<ScriptContext> = {
      state: { value: 10, result: '' },
    };
    executeScript('if (state.value > 5) { state.result = "high"; } else { state.result = "low"; }', context);
    expect(context.state?.result).toBe('high');
  });

  it('should execute loops with loop guard', () => {
    const context: Partial<ScriptContext> = {
      state: { sum: 0 },
      data: { numbers: [1, 2, 3, 4, 5] },
    };
    executeScript('for (let n of data.numbers) { state.sum += n; }', context);
    expect(context.state?.sum).toBe(15);
  });

  it('should call action functions', () => {
    const logFn = vi.fn();
    const context: Partial<ScriptContext> = {
      actions: {
        navigate: vi.fn(),
        setState: vi.fn(),
        getState: vi.fn(),
        showElement: vi.fn(),
        hideElement: vi.fn(),
        playAnimation: vi.fn(),
        fetchData: vi.fn(),
        log: logFn,
      },
    };
    executeScript('actions.log("test message", { value: 42 });', context);
    expect(logFn).toHaveBeenCalledWith('test message', { value: 42 });
  });

  it('should throw on forbidden identifiers', () => {
    expect(() => executeScript('window.alert("hi");', {})).toThrow('Forbidden identifier');
  });
});

// ============================================================================
// ASYNC SCRIPT EXECUTION WITH TIMEOUT TESTS
// ============================================================================

describe('executeScriptAsync', () => {
  it('should execute script with timeout', async () => {
    const context: Partial<ScriptContext> = {
      state: { result: 0 },
    };
    await executeScriptAsync('state.result = 42;', context);
    expect(context.state?.result).toBe(42);
  });

  it('should complete before timeout', async () => {
    const start = Date.now();
    await executeScriptAsync('let x = 1 + 1;', {}, 1000);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100); // Should complete very quickly
  });

  it('should reject forbidden identifiers', async () => {
    await expect(executeScriptAsync('window.location', {})).rejects.toThrow('Forbidden identifier');
  });
});

// ============================================================================
// VALUE SOURCE RESOLUTION TESTS
// ============================================================================

describe('resolveValue', () => {
  it('should return primitive values directly', () => {
    expect(resolveValue(42, {})).toBe(42);
    expect(resolveValue('hello', {})).toBe('hello');
    expect(resolveValue(true, {})).toBe(true);
    expect(resolveValue(null, {})).toBe(null);
    expect(resolveValue(undefined, {})).toBe(undefined);
  });

  it('should resolve literal value source', () => {
    const source: ValueSource = { type: 'literal', value: 'test value' };
    expect(resolveValue(source, {})).toBe('test value');
  });

  it('should resolve state value source', () => {
    const source: ValueSource = { type: 'state', name: 'count' };
    const context = { state: { count: 100 } };
    expect(resolveValue(source, context)).toBe(100);
  });

  it('should resolve nested state value source', () => {
    const source: ValueSource = { type: 'state', name: 'user.profile.age' };
    const context = { state: { user: { profile: { age: 25 } } } };
    expect(resolveValue(source, context)).toBe(25);
  });

  it('should resolve data value source', () => {
    const source: ValueSource = { type: 'data', path: 'items[0].name' };
    const context = { data: { items: [{ name: 'first' }] } };
    expect(resolveValue(source, context)).toBe('first');
  });

  it('should resolve event value source', () => {
    const source: ValueSource = { type: 'event', property: 'data.x' };
    const context = { event: { data: { x: 150 } } as any };
    expect(resolveValue(source, context)).toBe(150);
  });

  it('should resolve expression value source', () => {
    const source: ValueSource = { type: 'expression', code: 'state.count * 2' };
    const context = { state: { count: 10 } };
    expect(resolveValue(source, context)).toBe(20);
  });

  it('should resolve navigation param value source', () => {
    const source: ValueSource = { type: 'navigation', param: 'userId' };
    const context = { params: { userId: 'user-123' } };
    expect(resolveValue(source, context)).toBe('user-123');
  });
});

// ============================================================================
// NESTED VALUE ACCESS TESTS
// ============================================================================

describe('getNestedValue', () => {
  it('should get top-level property', () => {
    expect(getNestedValue({ foo: 'bar' }, 'foo')).toBe('bar');
  });

  it('should get nested property with dot notation', () => {
    expect(getNestedValue({ a: { b: { c: 'deep' } } }, 'a.b.c')).toBe('deep');
  });

  it('should get array element with bracket notation', () => {
    expect(getNestedValue({ items: ['first', 'second'] }, 'items[0]')).toBe('first');
    expect(getNestedValue({ items: ['first', 'second'] }, 'items[1]')).toBe('second');
  });

  it('should get nested array property', () => {
    expect(getNestedValue({ users: [{ name: 'John' }] }, 'users[0].name')).toBe('John');
  });

  it('should return undefined for missing paths', () => {
    expect(getNestedValue({ a: 1 }, 'b')).toBeUndefined();
    expect(getNestedValue({ a: 1 }, 'a.b.c')).toBeUndefined();
    expect(getNestedValue(null, 'a')).toBeUndefined();
    expect(getNestedValue({}, '')).toBeUndefined();
  });
});

describe('setNestedValue', () => {
  it('should set top-level property', () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, 'foo', 'bar');
    expect(obj.foo).toBe('bar');
  });

  it('should set nested property creating intermediate objects', () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, 'a.b.c', 'deep');
    expect((obj.a as any).b.c).toBe('deep');
  });

  it('should set array element creating intermediate arrays', () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, 'items[0]', 'first');
    expect((obj.items as any)[0]).toBe('first');
  });

  it('should set nested property in existing structure', () => {
    const obj: Record<string, unknown> = { user: { name: 'John' } };
    setNestedValue(obj, 'user.age', 30);
    expect((obj.user as any).age).toBe(30);
    expect((obj.user as any).name).toBe('John'); // Existing property preserved
  });
});

// ============================================================================
// CONDITION EVALUATION TESTS
// ============================================================================

describe('evaluateCondition', () => {
  const createStateCondition = (name: string, operator: string, value: unknown): InteractionCondition => ({
    source: { type: 'state', name },
    operator: operator as any,
    value,
  });

  describe('comparison operators', () => {
    it('should evaluate equals', () => {
      expect(evaluateCondition(
        createStateCondition('count', 'equals', 5),
        { state: { count: 5 } }
      )).toBe(true);
      expect(evaluateCondition(
        createStateCondition('count', 'equals', 5),
        { state: { count: 10 } }
      )).toBe(false);
    });

    it('should evaluate notEquals', () => {
      expect(evaluateCondition(
        createStateCondition('count', 'notEquals', 5),
        { state: { count: 10 } }
      )).toBe(true);
    });

    it('should evaluate greaterThan', () => {
      expect(evaluateCondition(
        createStateCondition('count', 'greaterThan', 5),
        { state: { count: 10 } }
      )).toBe(true);
      expect(evaluateCondition(
        createStateCondition('count', 'greaterThan', 5),
        { state: { count: 3 } }
      )).toBe(false);
    });

    it('should evaluate lessThan', () => {
      expect(evaluateCondition(
        createStateCondition('count', 'lessThan', 10),
        { state: { count: 5 } }
      )).toBe(true);
    });

    it('should evaluate greaterOrEqual', () => {
      expect(evaluateCondition(
        createStateCondition('count', 'greaterOrEqual', 5),
        { state: { count: 5 } }
      )).toBe(true);
      expect(evaluateCondition(
        createStateCondition('count', 'greaterOrEqual', 5),
        { state: { count: 6 } }
      )).toBe(true);
    });

    it('should evaluate lessOrEqual', () => {
      expect(evaluateCondition(
        createStateCondition('count', 'lessOrEqual', 5),
        { state: { count: 5 } }
      )).toBe(true);
      expect(evaluateCondition(
        createStateCondition('count', 'lessOrEqual', 5),
        { state: { count: 4 } }
      )).toBe(true);
    });
  });

  describe('string operators', () => {
    it('should evaluate contains', () => {
      expect(evaluateCondition(
        createStateCondition('text', 'contains', 'hello'),
        { state: { text: 'hello world' } }
      )).toBe(true);
      expect(evaluateCondition(
        createStateCondition('text', 'contains', 'foo'),
        { state: { text: 'hello world' } }
      )).toBe(false);
    });

    it('should evaluate startsWith', () => {
      expect(evaluateCondition(
        createStateCondition('text', 'startsWith', 'hello'),
        { state: { text: 'hello world' } }
      )).toBe(true);
    });

    it('should evaluate endsWith', () => {
      expect(evaluateCondition(
        createStateCondition('text', 'endsWith', 'world'),
        { state: { text: 'hello world' } }
      )).toBe(true);
    });

    it('should evaluate matches (regex)', () => {
      expect(evaluateCondition(
        createStateCondition('email', 'matches', '^[a-z]+@[a-z]+\\.[a-z]+$'),
        { state: { email: 'test@example.com' } }
      )).toBe(true);
    });
  });

  describe('null/empty operators', () => {
    it('should evaluate isEmpty', () => {
      expect(evaluateCondition(
        createStateCondition('text', 'isEmpty', null),
        { state: { text: '' } }
      )).toBe(true);
      expect(evaluateCondition(
        createStateCondition('arr', 'isEmpty', null),
        { state: { arr: [] } }
      )).toBe(true);
      expect(evaluateCondition(
        createStateCondition('obj', 'isEmpty', null),
        { state: { obj: {} } }
      )).toBe(true);
    });

    it('should evaluate isNotEmpty', () => {
      expect(evaluateCondition(
        createStateCondition('text', 'isNotEmpty', null),
        { state: { text: 'hello' } }
      )).toBe(true);
    });

    it('should evaluate isNull', () => {
      expect(evaluateCondition(
        createStateCondition('value', 'isNull', null),
        { state: { value: null } }
      )).toBe(true);
      expect(evaluateCondition(
        createStateCondition('value', 'isNull', null),
        { state: {} }
      )).toBe(true);
    });

    it('should evaluate isNotNull', () => {
      expect(evaluateCondition(
        createStateCondition('value', 'isNotNull', null),
        { state: { value: 'exists' } }
      )).toBe(true);
    });
  });

  describe('array operators', () => {
    it('should evaluate in', () => {
      expect(evaluateCondition(
        createStateCondition('status', 'in', ['active', 'pending']),
        { state: { status: 'active' } }
      )).toBe(true);
      expect(evaluateCondition(
        createStateCondition('status', 'in', ['active', 'pending']),
        { state: { status: 'inactive' } }
      )).toBe(false);
    });

    it('should evaluate notIn', () => {
      expect(evaluateCondition(
        createStateCondition('status', 'notIn', ['deleted', 'archived']),
        { state: { status: 'active' } }
      )).toBe(true);
    });

    it('should evaluate contains for arrays', () => {
      expect(evaluateCondition(
        createStateCondition('tags', 'contains', 'important'),
        { state: { tags: ['urgent', 'important', 'review'] } }
      )).toBe(true);
    });
  });

  describe('negation', () => {
    it('should negate condition with not flag', () => {
      const condition: InteractionCondition = {
        source: { type: 'state', name: 'count' },
        operator: 'equals',
        value: 5,
        not: true,
      };
      expect(evaluateCondition(condition, { state: { count: 5 } })).toBe(false);
      expect(evaluateCondition(condition, { state: { count: 10 } })).toBe(true);
    });
  });

  describe('compound conditions', () => {
    it('should evaluate AND conditions', () => {
      const condition: InteractionCondition = {
        source: { type: 'state', name: 'a' },
        operator: 'equals',
        value: 1,
        and: [
          { source: { type: 'state', name: 'b' }, operator: 'equals', value: 2 },
          { source: { type: 'state', name: 'c' }, operator: 'equals', value: 3 },
        ],
      };
      expect(evaluateCondition(condition, { state: { a: 1, b: 2, c: 3 } })).toBe(true);
      expect(evaluateCondition(condition, { state: { a: 1, b: 2, c: 99 } })).toBe(false);
    });

    it('should evaluate OR conditions', () => {
      const condition: InteractionCondition = {
        source: { type: 'state', name: 'a' },
        operator: 'equals',
        value: 1,
        or: [
          { source: { type: 'state', name: 'status' }, operator: 'equals', value: 'active' },
          { source: { type: 'state', name: 'status' }, operator: 'equals', value: 'pending' },
        ],
      };
      expect(evaluateCondition(condition, { state: { status: 'active' } })).toBe(true);
      expect(evaluateCondition(condition, { state: { status: 'pending' } })).toBe(true);
      expect(evaluateCondition(condition, { state: { status: 'inactive' } })).toBe(false);
    });
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('Helper Functions', () => {
  describe('sum', () => {
    it('should sum array of numbers', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });

    it('should sum field from array of objects', () => {
      const items = [{ price: 10 }, { price: 20 }, { price: 30 }];
      expect(sum(items, 'price')).toBe(60);
    });

    it('should return 0 for empty array', () => {
      expect(sum([])).toBe(0);
    });

    it('should return 0 for non-array', () => {
      expect(sum(null as any)).toBe(0);
      expect(sum('not array' as any)).toBe(0);
    });
  });

  describe('avg', () => {
    it('should calculate average', () => {
      expect(avg([2, 4, 6, 8])).toBe(5);
    });

    it('should calculate average of field', () => {
      const items = [{ score: 80 }, { score: 90 }, { score: 100 }];
      expect(avg(items, 'score')).toBe(90);
    });

    it('should return 0 for empty array', () => {
      expect(avg([])).toBe(0);
    });
  });

  describe('min', () => {
    it('should find minimum value', () => {
      expect(min([5, 2, 8, 1, 9])).toBe(1);
    });

    it('should find minimum of field', () => {
      const items = [{ value: 30 }, { value: 10 }, { value: 20 }];
      expect(min(items, 'value')).toBe(10);
    });

    it('should return 0 for empty array', () => {
      expect(min([])).toBe(0);
    });
  });

  describe('max', () => {
    it('should find maximum value', () => {
      expect(max([5, 2, 8, 1, 9])).toBe(9);
    });

    it('should find maximum of field', () => {
      const items = [{ value: 30 }, { value: 10 }, { value: 20 }];
      expect(max(items, 'value')).toBe(30);
    });

    it('should return 0 for empty array', () => {
      expect(max([])).toBe(0);
    });
  });

  describe('count', () => {
    it('should count array length', () => {
      expect(count([1, 2, 3, 4, 5])).toBe(5);
    });

    it('should count with predicate', () => {
      expect(count([1, 2, 3, 4, 5], n => (n as number) > 3)).toBe(2);
    });

    it('should return 0 for non-array', () => {
      expect(count(null as any)).toBe(0);
    });
  });

  describe('filter', () => {
    it('should filter array', () => {
      const result = filter([1, 2, 3, 4, 5], n => n > 3);
      expect(result).toEqual([4, 5]);
    });

    it('should return empty array for non-array', () => {
      expect(filter(null as any, () => true)).toEqual([]);
    });
  });

  describe('map', () => {
    it('should map array', () => {
      const result = map([1, 2, 3], n => n * 2);
      expect(result).toEqual([2, 4, 6]);
    });

    it('should return empty array for non-array', () => {
      expect(map(null as any, x => x)).toEqual([]);
    });
  });

  describe('find', () => {
    it('should find element', () => {
      const result = find([{ id: 1 }, { id: 2 }, { id: 3 }], item => item.id === 2);
      expect(result).toEqual({ id: 2 });
    });

    it('should return undefined if not found', () => {
      const result = find([1, 2, 3], n => n === 99);
      expect(result).toBeUndefined();
    });
  });

  describe('sort', () => {
    it('should sort numbers ascending', () => {
      expect(sort([3, 1, 4, 1, 5, 9, 2, 6])).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
    });

    it('should sort numbers descending', () => {
      expect(sort([3, 1, 4, 1, 5], undefined, 'desc')).toEqual([5, 4, 3, 1, 1]);
    });

    it('should sort by key', () => {
      const items = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
      const result = sort(items, 'name');
      expect(result.map(i => i.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should not mutate original array', () => {
      const original = [3, 1, 2];
      sort(original);
      expect(original).toEqual([3, 1, 2]);
    });
  });

  describe('groupBy', () => {
    it('should group by key', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
      ];
      const result = groupBy(items, 'category');
      expect(result['A'].length).toBe(2);
      expect(result['B'].length).toBe(1);
    });

    it('should return empty object for non-array', () => {
      expect(groupBy(null as any, 'key')).toEqual({});
    });
  });

  describe('format', () => {
    it('should format currency', () => {
      const result = format(1234.56, 'currency');
      expect(result).toContain('1,234.56');
    });

    it('should format number', () => {
      const result = format(1234.567, 'number', { decimals: 2 });
      expect(result).toBe('1,234.57');
    });

    it('should format percent', () => {
      const result = format(0.75, 'percent');
      expect(result).toBe('75%');
    });

    it('should format uppercase', () => {
      expect(format('hello', 'uppercase')).toBe('HELLO');
    });

    it('should format lowercase', () => {
      expect(format('HELLO', 'lowercase')).toBe('hello');
    });

    it('should format capitalize', () => {
      expect(format('hello world', 'capitalize')).toBe('Hello World');
    });
  });
});

// ============================================================================
// LOOP GUARD & SAFETY TESTS
// ============================================================================

describe('Loop Safety', () => {
  describe('createLoopGuard', () => {
    it('should allow iterations under limit', () => {
      const guard = createLoopGuard(10);
      for (let i = 0; i < 10; i++) {
        expect(() => guard()).not.toThrow();
      }
    });

    it('should throw when limit exceeded', () => {
      const guard = createLoopGuard(5);
      for (let i = 0; i < 5; i++) {
        guard();
      }
      expect(() => guard()).toThrow(LoopIterationError);
    });
  });

  describe('createSafeIterator', () => {
    it('should iterate array safely', () => {
      const items = [1, 2, 3];
      const results: number[] = [];
      for (const item of createSafeIterator(items, 100)) {
        results.push(item);
      }
      expect(results).toEqual([1, 2, 3]);
    });

    it('should throw when iteration limit exceeded', () => {
      function* infiniteGenerator() {
        let i = 0;
        while (true) yield i++;
      }

      expect(() => {
        for (const _ of createSafeIterator(infiniteGenerator(), 10)) {
          // Consume iterator
        }
      }).toThrow(LoopIterationError);
    });
  });

  describe('ScriptTimeoutError', () => {
    it('should have correct name and message', () => {
      const error = new ScriptTimeoutError(5000);
      expect(error.name).toBe('ScriptTimeoutError');
      expect(error.message).toContain('5000ms');
    });
  });

  describe('LoopIterationError', () => {
    it('should have correct name and message', () => {
      const error = new LoopIterationError(10000);
      expect(error.name).toBe('LoopIterationError');
      expect(error.message).toContain('10000 iterations');
    });
  });
});

// ============================================================================
// CONFIGURATION CONSTANTS TESTS
// ============================================================================

describe('Configuration Constants', () => {
  it('should have reasonable timeout values', () => {
    expect(EXPRESSION_TIMEOUT_MS).toBe(1000);
    expect(SCRIPT_TIMEOUT_MS).toBe(5000);
  });

  it('should have reasonable loop limits', () => {
    expect(MAX_LOOP_ITERATIONS).toBe(10000);
  });
});
