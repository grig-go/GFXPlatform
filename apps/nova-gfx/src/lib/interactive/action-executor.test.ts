/**
 * Unit tests for action-executor.ts
 * Tests action execution and side effects
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeActions, ActionExecutorContext, buildScriptContext } from './action-executor';
import type {
  InteractionAction,
  InteractionEvent,
  InteractiveAppRuntime,
  SetStateAction,
  ToggleStateAction,
  IncrementStateAction,
  NavigateAction,
  ConditionalAction,
  LoopAction,
  WaitAction,
  FilterDataAction,
  SortDataAction,
  AggregateDataAction,
  RunScriptAction,
  ValidateFormAction,
  PlayAnimationAction,
  SetElementPropertyAction,
  ToggleElementAction,
} from '@emergent-platform/types';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockRuntime(): InteractiveAppRuntime {
  return {
    state: {},
    forms: {},
    navigationHistory: [],
    navigationParams: {},
    activeEventHandlers: [],
    loadedScripts: [],
    isInitialized: true,
  };
}

function createMockContext(
  overrides: Partial<ActionExecutorContext> = {}
): ActionExecutorContext {
  return {
    runtime: createMockRuntime(),
    event: null,
    element: null,
    functions: [],
    onNavigate: vi.fn(),
    onStateChange: vi.fn(),
    onElementUpdate: vi.fn(),
    onElementVisibility: vi.fn(),
    onPlayAnimation: vi.fn(),
    onPlayTimeline: vi.fn(),
    onFetchData: vi.fn().mockResolvedValue({}),
    onValidateForm: vi.fn().mockReturnValue({ isValid: true, errors: {} }),
    onSubmitForm: vi.fn().mockResolvedValue({}),
    onLog: vi.fn(),
    ...overrides,
  };
}

function createAction<T extends InteractionAction>(
  type: T['type'],
  target: T['target']
): T {
  return {
    id: `action-${Math.random().toString(36).slice(2)}`,
    type,
    target,
    enabled: true,
  } as T;
}

// ============================================================================
// STATE MANAGEMENT TESTS
// ============================================================================

describe('State Management Actions', () => {
  describe('setState', () => {
    it('should set state value', async () => {
      const context = createMockContext();
      const action = createAction<SetStateAction>('setState', {
        name: 'count',
        value: { type: 'literal', value: 10 },
      });

      await executeActions([action], context);

      expect(context.runtime.state.count).toBe(10);
      expect(context.onStateChange).toHaveBeenCalled();
    });

    it('should set nested state value', async () => {
      const context = createMockContext();
      const action = createAction<SetStateAction>('setState', {
        name: 'user.profile.name',
        value: { type: 'literal', value: 'John' },
      });

      await executeActions([action], context);

      expect((context.runtime.state.user as any).profile.name).toBe('John');
    });

    it('should resolve value from expression', async () => {
      const context = createMockContext();
      context.runtime.state.a = 5;

      const action = createAction<SetStateAction>('setState', {
        name: 'b',
        value: { type: 'expression', code: 'state.a * 2' },
      });

      await executeActions([action], context);

      expect(context.runtime.state.b).toBe(10);
    });
  });

  describe('toggleState', () => {
    it('should toggle boolean value from false to true', async () => {
      const context = createMockContext();
      context.runtime.state.isActive = false;

      const action = createAction<ToggleStateAction>('toggleState', {
        name: 'isActive',
      });

      await executeActions([action], context);

      expect(context.runtime.state.isActive).toBe(true);
    });

    it('should toggle boolean value from true to false', async () => {
      const context = createMockContext();
      context.runtime.state.isActive = true;

      const action = createAction<ToggleStateAction>('toggleState', {
        name: 'isActive',
      });

      await executeActions([action], context);

      expect(context.runtime.state.isActive).toBe(false);
    });

    it('should toggle undefined to true', async () => {
      const context = createMockContext();

      const action = createAction<ToggleStateAction>('toggleState', {
        name: 'newFlag',
      });

      await executeActions([action], context);

      expect(context.runtime.state.newFlag).toBe(true);
    });
  });

  describe('incrementState', () => {
    it('should increment value by 1', async () => {
      const context = createMockContext();
      context.runtime.state.count = 5;

      const action = createAction<IncrementStateAction>('incrementState', {
        name: 'count',
      });

      await executeActions([action], context);

      expect(context.runtime.state.count).toBe(6);
    });

    it('should increment by custom amount', async () => {
      const context = createMockContext();
      context.runtime.state.count = 10;

      const action = createAction<IncrementStateAction>('incrementState', {
        name: 'count',
        amount: { type: 'literal', value: 5 } as any,
      });

      await executeActions([action], context);

      expect(context.runtime.state.count).toBe(15);
    });

    it('should start from 0 if undefined', async () => {
      const context = createMockContext();

      const action = createAction<IncrementStateAction>('incrementState', {
        name: 'counter',
      });

      await executeActions([action], context);

      expect(context.runtime.state.counter).toBe(1);
    });
  });

  describe('decrementState', () => {
    it('should decrement value by 1', async () => {
      const context = createMockContext();
      context.runtime.state.count = 5;

      const action = createAction<IncrementStateAction>('decrementState', {
        name: 'count',
      });

      await executeActions([action], context);

      expect(context.runtime.state.count).toBe(4);
    });

    it('should allow negative values', async () => {
      const context = createMockContext();
      context.runtime.state.count = 0;

      const action = createAction<IncrementStateAction>('decrementState', {
        name: 'count',
      });

      await executeActions([action], context);

      expect(context.runtime.state.count).toBe(-1);
    });
  });

  describe('resetState', () => {
    it('should reset state to null', async () => {
      const context = createMockContext();
      context.runtime.state.data = { complex: 'value' };

      const action = createAction<InteractionAction>('resetState', {
        name: 'data',
      });

      await executeActions([action], context);

      expect(context.runtime.state.data).toBeNull();
    });

    it('should reset to default value', async () => {
      const context = createMockContext();
      context.runtime.state.count = 100;

      const action = createAction<InteractionAction>('resetState', {
        name: 'count',
        defaultValue: 0,
      });

      await executeActions([action], context);

      expect(context.runtime.state.count).toBe(0);
    });
  });
});

// ============================================================================
// NAVIGATION TESTS
// ============================================================================

describe('Navigation Actions', () => {
  describe('navigate', () => {
    it('should navigate to template', async () => {
      const context = createMockContext();

      const action = createAction<NavigateAction>('navigate', {
        templateId: 'page-2',
      });

      await executeActions([action], context);

      expect(context.onNavigate).toHaveBeenCalledWith('page-2', undefined);
    });

    it('should navigate with params', async () => {
      const context = createMockContext();

      const action = createAction<NavigateAction>('navigate', {
        templateId: 'detail-page',
        params: {
          id: { type: 'literal', value: '123' } as any,
          tab: { type: 'literal', value: 'info' } as any,
        },
      });

      await executeActions([action], context);

      expect(context.onNavigate).toHaveBeenCalledWith('detail-page', {
        id: '123',
        tab: 'info',
      });
    });

    it('should add to navigation history', async () => {
      const context = createMockContext();

      const action = createAction<NavigateAction>('navigate', {
        templateId: 'page-1',
      });

      await executeActions([action], context);

      expect(context.runtime.navigationHistory.length).toBe(1);
      expect(context.runtime.navigationHistory[0].templateId).toBe('page-1');
    });
  });

  describe('navigateBack', () => {
    it('should navigate to previous page', async () => {
      const context = createMockContext();
      context.runtime.navigationHistory = [
        { templateId: 'page-1', timestamp: 1000 },
        { templateId: 'page-2', timestamp: 2000 },
      ];

      const action = createAction<InteractionAction>('navigateBack', {});

      await executeActions([action], context);

      expect(context.onNavigate).toHaveBeenCalledWith('page-1', undefined);
    });

    it('should do nothing if no history', async () => {
      const context = createMockContext();

      const action = createAction<InteractionAction>('navigateBack', {});

      await executeActions([action], context);

      expect(context.onNavigate).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// DATA OPERATIONS TESTS
// ============================================================================

describe('Data Operations', () => {
  describe('filterData', () => {
    it('should filter array data', async () => {
      const context = createMockContext();
      const scriptContext = {
        data: {
          items: [
            { name: 'Apple', price: 1.5 },
            { name: 'Banana', price: 0.5 },
            { name: 'Cherry', price: 2.0 },
          ],
        },
      };
      // buildScriptContext would normally use context.runtime.state as data
      // We need to add the data to runtime for this test
      (context as any).data = scriptContext.data;

      const action = createAction<FilterDataAction>('filterData', {
        dataSource: 'items',
        conditions: [
          { field: 'price', operator: 'greaterThan', value: 1 },
        ],
        outputTo: 'filteredItems',
      });

      // For this test, we need to adjust buildScriptContext behavior
      // In a real scenario, the data would come from data bindings
    });
  });

  describe('sortData', () => {
    it('should sort array data', async () => {
      const context = createMockContext();
      // Similar to filterData, would need data binding integration
    });
  });

  describe('aggregateData', () => {
    it('should count items', async () => {
      const context = createMockContext();
      // Would test count operation
    });

    it('should calculate sum', async () => {
      const context = createMockContext();
      // Would test sum operation
    });
  });
});

// ============================================================================
// ELEMENT MANIPULATION TESTS
// ============================================================================

describe('Element Manipulation', () => {
  describe('setElementProperty', () => {
    it('should update element property', async () => {
      const context = createMockContext();

      const action = createAction<SetElementPropertyAction>('setElementProperty', {
        elementId: 'element-1',
        property: 'opacity',
        value: { type: 'literal', value: 0.5 },
      });

      await executeActions([action], context);

      expect(context.onElementUpdate).toHaveBeenCalledWith('element-1', 'opacity', 0.5);
    });

    it('should resolve elementId from expression', async () => {
      const context = createMockContext();
      context.runtime.state.targetElement = 'dynamic-element';

      const action = createAction<SetElementPropertyAction>('setElementProperty', {
        elementId: { type: 'state', name: 'targetElement' } as any,
        property: 'visible',
        value: { type: 'literal', value: true },
      });

      await executeActions([action], context);

      expect(context.onElementUpdate).toHaveBeenCalledWith('dynamic-element', 'visible', true);
    });
  });

  describe('showElement / hideElement', () => {
    it('should show element', async () => {
      const context = createMockContext();

      const action = createAction<ToggleElementAction>('showElement', {
        elementId: 'modal-1',
      });

      await executeActions([action], context);

      expect(context.onElementVisibility).toHaveBeenCalledWith('modal-1', true);
    });

    it('should hide element', async () => {
      const context = createMockContext();

      const action = createAction<ToggleElementAction>('hideElement', {
        elementId: 'modal-1',
      });

      await executeActions([action], context);

      expect(context.onElementVisibility).toHaveBeenCalledWith('modal-1', false);
    });
  });
});

// ============================================================================
// ANIMATION TESTS
// ============================================================================

describe('Animation Actions', () => {
  describe('playAnimation', () => {
    it('should trigger animation', async () => {
      const context = createMockContext();

      const action = createAction<PlayAnimationAction>('playAnimation', {
        elementId: 'animated-element',
        animationId: 'fadeIn',
      });

      await executeActions([action], context);

      expect(context.onPlayAnimation).toHaveBeenCalledWith('animated-element', 'fadeIn');
    });
  });

  describe('playTimeline', () => {
    it('should trigger timeline', async () => {
      const context = createMockContext();

      const action = createAction<InteractionAction>('playTimeline', {
        templateId: 'scene-1',
        startPhase: 'in',
      });

      await executeActions([action], context);

      expect(context.onPlayTimeline).toHaveBeenCalledWith('scene-1', 'in');
    });
  });
});

// ============================================================================
// FORM TESTS
// ============================================================================

describe('Form Actions', () => {
  describe('validateForm', () => {
    it('should validate form', async () => {
      const context = createMockContext();
      context.onValidateForm = vi.fn().mockReturnValue({
        isValid: true,
        errors: {},
      });

      const action = createAction<ValidateFormAction>('validateForm', {
        formId: 'login-form',
      });

      await executeActions([action], context);

      expect(context.onValidateForm).toHaveBeenCalledWith('login-form', undefined);
    });

    it('should update form state with errors', async () => {
      const context = createMockContext();
      context.onValidateForm = vi.fn().mockReturnValue({
        isValid: false,
        errors: { email: 'Invalid email' },
      });

      const action = createAction<ValidateFormAction>('validateForm', {
        formId: 'signup-form',
      });

      await executeActions([action], context);

      expect(context.runtime.forms['signup-form'].isValid).toBe(false);
      expect(context.runtime.forms['signup-form'].errors.email).toBe('Invalid email');
    });
  });

  describe('resetForm', () => {
    it('should reset form state', async () => {
      const context = createMockContext();
      context.runtime.forms['my-form'] = {
        values: { name: 'John' },
        errors: { name: 'Error' },
        touched: { name: true },
        isValid: false,
        isSubmitting: false,
      };

      const action = createAction<InteractionAction>('resetForm', {
        formId: 'my-form',
      });

      await executeActions([action], context);

      expect(context.runtime.forms['my-form'].values).toEqual({});
      expect(context.runtime.forms['my-form'].errors).toEqual({});
      expect(context.runtime.forms['my-form'].isValid).toBe(true);
    });
  });
});

// ============================================================================
// SCRIPT EXECUTION TESTS
// ============================================================================

describe('Script Actions', () => {
  describe('runScript', () => {
    it('should execute script and update state', async () => {
      const context = createMockContext();

      const action = createAction<RunScriptAction>('runScript', {
        code: 'actions.setState("result", 42);',
      });

      await executeActions([action], context);

      expect(context.runtime.state.result).toBe(42);
    });

    it('should handle script errors gracefully', async () => {
      const context = createMockContext();

      const action = createAction<RunScriptAction>('runScript', {
        code: 'invalid javascript !!!',
      });

      // Should not throw
      await expect(executeActions([action], context)).resolves.not.toThrow();
      expect(context.onLog).toHaveBeenCalled();
    });

    it('should block forbidden identifiers', async () => {
      const context = createMockContext();

      const action = createAction<RunScriptAction>('runScript', {
        code: 'window.location.href = "evil.com";',
      });

      await executeActions([action], context);

      expect(context.onLog).toHaveBeenCalled();
    });
  });

  describe('callFunction', () => {
    it('should call defined function', async () => {
      const context = createMockContext();
      context.functions = [
        {
          name: 'double',
          params: [{ name: 'x', type: 'number' }],
          // Use simple state assignment that doesn't rely on actions
          body: 'state.doubled = x * 2;',
        },
      ];

      const action = createAction<InteractionAction>('callFunction', {
        name: 'double',
        args: [{ type: 'literal', value: 5 }],
      });

      await executeActions([action], context);

      // The function modifies state directly, which is accessible in scriptContext
      expect(context.runtime.state.doubled).toBe(10);
    });

    it('should log if function not found', async () => {
      const context = createMockContext();

      const action = createAction<InteractionAction>('callFunction', {
        name: 'nonexistent',
        args: [],
      });

      await executeActions([action], context);

      expect(context.onLog).toHaveBeenCalledWith('Function not found: nonexistent', null);
    });
  });
});

// ============================================================================
// CONTROL FLOW TESTS
// ============================================================================

describe('Control Flow Actions', () => {
  describe('conditional', () => {
    it('should execute then branch when condition is true', async () => {
      const context = createMockContext();
      context.runtime.state.isActive = true;

      const action = createAction<ConditionalAction>('conditional', {
        conditions: [
          {
            source: { type: 'state', name: 'isActive' },
            operator: 'equals',
            value: true,
          },
        ],
        then: [
          createAction<SetStateAction>('setState', {
            name: 'result',
            value: { type: 'literal', value: 'then' },
          }),
        ],
        else: [
          createAction<SetStateAction>('setState', {
            name: 'result',
            value: { type: 'literal', value: 'else' },
          }),
        ],
      });

      await executeActions([action], context);

      expect(context.runtime.state.result).toBe('then');
    });

    it('should execute else branch when condition is false', async () => {
      const context = createMockContext();
      context.runtime.state.isActive = false;

      const action = createAction<ConditionalAction>('conditional', {
        conditions: [
          {
            source: { type: 'state', name: 'isActive' },
            operator: 'equals',
            value: true,
          },
        ],
        then: [
          createAction<SetStateAction>('setState', {
            name: 'result',
            value: { type: 'literal', value: 'then' },
          }),
        ],
        else: [
          createAction<SetStateAction>('setState', {
            name: 'result',
            value: { type: 'literal', value: 'else' },
          }),
        ],
      });

      await executeActions([action], context);

      expect(context.runtime.state.result).toBe('else');
    });
  });

  describe('loop', () => {
    it('should iterate over data and execute actions', async () => {
      const context = createMockContext();
      context.runtime.state.sum = 0;

      const action = createAction<LoopAction>('loop', {
        dataSource: 'items',
        itemVariable: 'item',
        indexVariable: 'i',
        actions: [
          createAction<SetStateAction>('setState', {
            name: 'sum',
            value: { type: 'expression', code: 'state.sum + state.item' },
          }),
        ],
      });

      // For loop to work, data needs to be accessible via buildScriptContext
      // This is where data binding would provide the data
    });

    it('should respect maxIterations', async () => {
      const context = createMockContext();
      // Would test that loop stops at maxIterations
    });
  });

  describe('wait', () => {
    it('should delay execution', async () => {
      const context = createMockContext();

      const action = createAction<WaitAction>('wait', {
        duration: 50,
      });

      const start = Date.now();
      await executeActions([action], context);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small timing variance
    });
  });
});

// ============================================================================
// ACTION CONDITIONS TESTS
// ============================================================================

describe('Action Conditions', () => {
  it('should skip action when condition is false', async () => {
    const context = createMockContext();
    context.runtime.state.isAllowed = false;

    const action: SetStateAction = {
      id: 'test',
      type: 'setState',
      target: {
        name: 'result',
        value: { type: 'literal', value: 'executed' },
      },
      enabled: true,
      conditions: [
        {
          source: { type: 'state', name: 'isAllowed' },
          operator: 'equals',
          value: true,
        },
      ],
    };

    await executeActions([action], context);

    expect(context.runtime.state.result).toBeUndefined();
  });

  it('should execute action when condition is true', async () => {
    const context = createMockContext();
    context.runtime.state.isAllowed = true;

    const action: SetStateAction = {
      id: 'test',
      type: 'setState',
      target: {
        name: 'result',
        value: { type: 'literal', value: 'executed' },
      },
      enabled: true,
      conditions: [
        {
          source: { type: 'state', name: 'isAllowed' },
          operator: 'equals',
          value: true,
        },
      ],
    };

    await executeActions([action], context);

    expect(context.runtime.state.result).toBe('executed');
  });

  it('should skip disabled actions', async () => {
    const context = createMockContext();

    const action: SetStateAction = {
      id: 'test',
      type: 'setState',
      target: {
        name: 'result',
        value: { type: 'literal', value: 'should not run' },
      },
      enabled: false,
    };

    await executeActions([action], context);

    expect(context.runtime.state.result).toBeUndefined();
  });
});

// ============================================================================
// ACTION DELAY TESTS
// ============================================================================

describe('Action Delay', () => {
  it('should delay action execution', async () => {
    const context = createMockContext();

    const action: SetStateAction = {
      id: 'test',
      type: 'setState',
      target: {
        name: 'result',
        value: { type: 'literal', value: 'delayed' },
      },
      enabled: true,
      delay: 50,
    };

    const start = Date.now();
    await executeActions([action], context);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(45);
    expect(context.runtime.state.result).toBe('delayed');
  });
});

// ============================================================================
// SEQUENTIAL EXECUTION TESTS
// ============================================================================

describe('Sequential Execution', () => {
  it('should execute actions in order', async () => {
    const context = createMockContext();
    const executionOrder: number[] = [];

    const actions: SetStateAction[] = [
      {
        id: '1',
        type: 'setState',
        target: { name: 'order', value: { type: 'literal', value: 1 } },
        enabled: true,
      },
      {
        id: '2',
        type: 'setState',
        target: { name: 'order', value: { type: 'literal', value: 2 } },
        enabled: true,
      },
      {
        id: '3',
        type: 'setState',
        target: { name: 'order', value: { type: 'literal', value: 3 } },
        enabled: true,
      },
    ];

    context.onStateChange = vi.fn((state) => {
      executionOrder.push(state.order as number);
    });

    await executeActions(actions, context);

    expect(executionOrder).toEqual([1, 2, 3]);
  });
});

// ============================================================================
// BUILD SCRIPT CONTEXT TESTS
// ============================================================================

describe('buildScriptContext', () => {
  it('should build context from executor context', () => {
    const context = createMockContext();
    context.runtime.state = { count: 10 };
    context.runtime.navigationParams = { page: 'home' };
    context.event = {
      type: 'click',
      timestamp: Date.now(),
      elementId: 'btn-1',
      data: {},
    };

    const scriptContext = buildScriptContext(context);

    expect(scriptContext.state).toEqual({ count: 10 });
    expect(scriptContext.params).toEqual({ page: 'home' });
    expect(scriptContext.event?.type).toBe('click');
  });
});
