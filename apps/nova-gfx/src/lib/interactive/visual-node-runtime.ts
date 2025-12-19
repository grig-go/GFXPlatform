/**
 * Visual Node Runtime Interpreter
 *
 * Executes visual node graphs when events are triggered.
 * This interprets the node/edge graph created in the visual script editor
 * and performs the corresponding actions.
 */

import type { Node, Edge } from '@xyflow/react';

// Types for node data
interface EventNodeData {
  eventType: string;
  elementName?: string;
  elementId?: string;
}

interface ConditionNodeData {
  condition: string;
  operator: string;
  value: string;
}

interface ActionNodeData {
  actionType: string;
  target?: string;
  value?: string | number | boolean;
  templateId?: string;
  layerId?: string;
  elementId?: string;
  phase?: 'in' | 'loop' | 'out';
  message?: string;
  duration?: number;
  functionName?: string;
}

interface DataNodeData {
  operation: string;
  path: string;
  value?: unknown;
  filter?: string;
  sortBy?: string;
}

interface AnimationNodeData {
  templateId?: string;
  templateName?: string;
  layerId?: string;
  layerName?: string;
  phase?: 'in' | 'loop' | 'out';
  data?: string;
}

// Execution context provided to the runtime
export interface NodeRuntimeContext {
  // State management
  state: Record<string, unknown>;
  setState: (key: string, value: unknown) => void;

  // Element operations
  showElement: (elementId: string) => void;
  hideElement: (elementId: string) => void;
  toggleElement: (elementId: string) => void;

  // Animation/Timeline operations
  playTemplate: (templateId: string, layerId: string, phase?: string) => void;
  playAnimation: (elementId: string, phase?: string) => void;
  stopAnimation: (elementId: string) => void;

  // Navigation
  navigate: (screenId: string) => void;

  // Utilities
  log: (message: string) => void;
  delay: (ms: number) => Promise<void>;

  // Event data
  event?: {
    type: string;
    elementId?: string;
    data?: Record<string, unknown>;
  };
}

/**
 * Build an adjacency map from edges for traversing the graph
 */
function buildAdjacencyMap(edges: Edge[]): Map<string, string[]> {
  const adjacencyMap = new Map<string, string[]>();
  edges.forEach(edge => {
    const sources = adjacencyMap.get(edge.source) || [];
    sources.push(edge.target);
    adjacencyMap.set(edge.source, sources);
  });
  return adjacencyMap;
}

/**
 * Evaluate a condition based on operator
 */
function evaluateCondition(
  condition: string,
  operator: string,
  compareValue: string,
  context: NodeRuntimeContext
): boolean {
  // Get the actual value from state or path
  let actualValue: unknown;

  // Handle state references like "state.value"
  if (condition.startsWith('state.')) {
    const path = condition.slice(6); // Remove "state."
    actualValue = context.state[path];
  } else {
    // Try to evaluate as a simple expression
    try {
      // For safety, only allow simple property access
      actualValue = condition;
    } catch {
      actualValue = condition;
    }
  }

  // Convert compareValue to appropriate type
  let typedCompareValue: unknown = compareValue;
  if (compareValue === 'true') typedCompareValue = true;
  else if (compareValue === 'false') typedCompareValue = false;
  else if (!isNaN(Number(compareValue))) typedCompareValue = Number(compareValue);

  switch (operator) {
    case 'equals':
      return actualValue === typedCompareValue;
    case 'notEquals':
      return actualValue !== typedCompareValue;
    case 'greaterThan':
      return Number(actualValue) > Number(typedCompareValue);
    case 'lessThan':
      return Number(actualValue) < Number(typedCompareValue);
    case 'greaterOrEqual':
      return Number(actualValue) >= Number(typedCompareValue);
    case 'lessOrEqual':
      return Number(actualValue) <= Number(typedCompareValue);
    case 'contains':
      return String(actualValue).includes(String(typedCompareValue));
    case 'startsWith':
      return String(actualValue).startsWith(String(typedCompareValue));
    case 'endsWith':
      return String(actualValue).endsWith(String(typedCompareValue));
    case 'isEmpty':
      return !actualValue || (Array.isArray(actualValue) && actualValue.length === 0) || actualValue === '';
    case 'isNotEmpty':
      return !!actualValue && (!Array.isArray(actualValue) || actualValue.length > 0) && actualValue !== '';
    case 'isTrue':
      return actualValue === true;
    case 'isFalse':
      return actualValue === false;
    default:
      return Boolean(actualValue);
  }
}

/**
 * Execute a single node and return whether to continue to children
 */
async function executeNode(
  node: Node,
  context: NodeRuntimeContext,
  adjacencyMap: Map<string, string[]>,
  allNodes: Node[],
  visited: Set<string>
): Promise<void> {
  if (visited.has(node.id)) return;
  visited.add(node.id);

  const data = node.data as Record<string, unknown>;

  switch (node.type) {
    case 'condition': {
      const conditionData = data as unknown as ConditionNodeData;
      const result = evaluateCondition(
        conditionData.condition || 'true',
        conditionData.operator || 'equals',
        conditionData.value || '',
        context
      );

      context.log(`Condition "${conditionData.condition} ${conditionData.operator} ${conditionData.value}" = ${result}`);

      // Only continue to children if condition is true
      if (result) {
        const nextNodes = adjacencyMap.get(node.id) || [];
        for (const nextId of nextNodes) {
          const nextNode = allNodes.find(n => n.id === nextId);
          if (nextNode) {
            await executeNode(nextNode, context, adjacencyMap, allNodes, visited);
          }
        }
      }
      break;
    }

    case 'action': {
      const actionData = data as unknown as ActionNodeData;

      switch (actionData.actionType) {
        case 'setState':
          context.setState(actionData.target || 'value', actionData.value ?? null);
          context.log(`Set state "${actionData.target}" = ${actionData.value}`);
          break;

        case 'toggleState':
          const currentValue = context.state[actionData.target || 'value'];
          context.setState(actionData.target || 'value', !currentValue);
          context.log(`Toggled state "${actionData.target}"`);
          break;

        case 'navigate':
          context.navigate(actionData.target || 'screen');
          context.log(`Navigate to "${actionData.target}"`);
          break;

        case 'playTemplate':
          context.playTemplate(
            actionData.templateId || 'template',
            actionData.layerId || 'layer',
            actionData.phase
          );
          context.log(`Play template "${actionData.templateId}" phase "${actionData.phase}"`);
          break;

        case 'toggleTemplate': {
          // Toggle between in/out based on state
          const stateKey = `_templatePlaying_${actionData.templateId}`;
          const isPlaying = context.state[stateKey] === true;
          const newPhase = isPlaying ? 'out' : 'in';
          context.playTemplate(
            actionData.templateId || 'template',
            actionData.layerId || 'layer',
            newPhase
          );
          context.setState(stateKey, !isPlaying);
          context.log(`Toggle template "${actionData.templateId}" to phase "${newPhase}"`);
          break;
        }

        case 'showElement':
          context.showElement(actionData.elementId || 'element');
          context.log(`Show element "${actionData.elementId}"`);
          break;

        case 'hideElement':
          context.hideElement(actionData.elementId || 'element');
          context.log(`Hide element "${actionData.elementId}"`);
          break;

        case 'toggleElement':
          context.toggleElement(actionData.elementId || 'element');
          context.log(`Toggle element "${actionData.elementId}"`);
          break;

        case 'playAnimation':
          context.playAnimation(actionData.elementId || 'element', actionData.phase);
          context.log(`Play animation on "${actionData.elementId}" phase "${actionData.phase}"`);
          break;

        case 'stopAnimation':
          context.stopAnimation(actionData.elementId || 'element');
          context.log(`Stop animation on "${actionData.elementId}"`);
          break;

        case 'log':
          context.log(actionData.message || 'Debug message');
          break;

        case 'delay':
          await context.delay(actionData.duration || 1000);
          context.log(`Delayed ${actionData.duration || 1000}ms`);
          break;

        case 'callFunction':
          context.log(`Call function "${actionData.functionName}" (not yet implemented)`);
          break;

        default:
          context.log(`Unknown action type: ${actionData.actionType}`);
      }

      // Continue to next nodes
      const nextNodes = adjacencyMap.get(node.id) || [];
      for (const nextId of nextNodes) {
        const nextNode = allNodes.find(n => n.id === nextId);
        if (nextNode) {
          await executeNode(nextNode, context, adjacencyMap, allNodes, visited);
        }
      }
      break;
    }

    case 'data': {
      const dataNodeData = data as unknown as DataNodeData;

      switch (dataNodeData.operation) {
        case 'get':
          context.log(`Get data from "${dataNodeData.path}"`);
          break;
        case 'set':
          if (dataNodeData.path.startsWith('state.')) {
            const key = dataNodeData.path.slice(6);
            context.setState(key, dataNodeData.value);
            context.log(`Set data "${dataNodeData.path}" = ${dataNodeData.value}`);
          }
          break;
        default:
          context.log(`Data operation "${dataNodeData.operation}"`);
      }

      // Continue to next nodes
      const nextNodes = adjacencyMap.get(node.id) || [];
      for (const nextId of nextNodes) {
        const nextNode = allNodes.find(n => n.id === nextId);
        if (nextNode) {
          await executeNode(nextNode, context, adjacencyMap, allNodes, visited);
        }
      }
      break;
    }

    case 'animation': {
      const animData = data as unknown as AnimationNodeData;

      if (animData.templateId) {
        context.playTemplate(
          animData.templateId,
          animData.layerId || '',
          animData.phase
        );
        context.log(`Animation: Play template "${animData.templateName || animData.templateId}" phase "${animData.phase}"`);
      }

      // Continue to next nodes
      const nextNodes = adjacencyMap.get(node.id) || [];
      for (const nextId of nextNodes) {
        const nextNode = allNodes.find(n => n.id === nextId);
        if (nextNode) {
          await executeNode(nextNode, context, adjacencyMap, allNodes, visited);
        }
      }
      break;
    }
  }
}

/**
 * Execute the visual node graph for a given event
 */
export async function executeNodeGraph(
  eventType: string,
  _elementId: string | undefined,
  nodes: Node[],
  edges: Edge[],
  context: NodeRuntimeContext
): Promise<void> {
  if (!nodes || nodes.length === 0) return;

  // Build adjacency map
  const adjacencyMap = buildAdjacencyMap(edges);

  // Find event nodes that match this event type
  const eventNodes = nodes.filter(n => {
    if (n.type !== 'event') return false;
    const data = n.data as unknown as EventNodeData;
    return data.eventType === eventType;
  });

  if (eventNodes.length === 0) {
    context.log(`No event handlers found for "${eventType}"`);
    return;
  }

  context.log(`Executing ${eventNodes.length} handler(s) for "${eventType}"`);

  // Execute from each matching event node
  for (const eventNode of eventNodes) {
    const visited = new Set<string>();
    visited.add(eventNode.id);

    // Get nodes connected to this event
    const connectedNodeIds = adjacencyMap.get(eventNode.id) || [];

    for (const nodeId of connectedNodeIds) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        await executeNode(node, context, adjacencyMap, nodes, visited);
      }
    }
  }
}

/**
 * Create a node runtime context from the interactive store
 */
export function createNodeRuntimeContext(
  designerStore: {
    updateElement: (id: string, updates: Record<string, unknown>) => void;
    elements: Array<{ id: string; visible: boolean }>;
    playIn: (templateId: string, layerId: string) => void;
    playOut: (layerId: string) => void;
    templates: Array<{ id: string; layer_id: string }>;
  },
  interactiveStore: {
    runtime: { state: Record<string, unknown> };
    setState: (key: string, value: unknown) => void;
    navigate: (screenId: string) => void;
  }
): NodeRuntimeContext {
  return {
    state: interactiveStore.runtime.state,

    setState: (key: string, value: unknown) => {
      interactiveStore.setState(key, value);
    },

    showElement: (elementId: string) => {
      designerStore.updateElement(elementId, { visible: true });
    },

    hideElement: (elementId: string) => {
      designerStore.updateElement(elementId, { visible: false });
    },

    toggleElement: (elementId: string) => {
      const element = designerStore.elements.find(e => e.id === elementId);
      if (element) {
        designerStore.updateElement(elementId, { visible: !element.visible });
      }
    },

    playTemplate: (templateId: string, layerId: string, phase?: string) => {
      console.log('[NodeRuntime] playTemplate called:', { templateId, layerId, phase });
      console.log('[NodeRuntime] Available templates:', designerStore.templates.map(t => ({ id: t.id, name: t.name })));

      const template = designerStore.templates.find(t => t.id === templateId);
      if (!template) {
        // Try to find by name as fallback
        const templateByName = designerStore.templates.find(t => t.name === templateId);
        if (templateByName) {
          console.log('[NodeRuntime] Found template by name:', templateByName.id);
          const actualLayerId = layerId || templateByName.layer_id;
          if (phase === 'out') {
            designerStore.playOut(actualLayerId);
          } else {
            designerStore.playIn(templateByName.id, actualLayerId);
          }
          return;
        }
        console.warn(`[NodeRuntime] Template not found: ${templateId}`);
        return;
      }

      const actualLayerId = layerId || template.layer_id;

      if (phase === 'out') {
        designerStore.playOut(actualLayerId);
      } else {
        // Default to 'in' phase
        designerStore.playIn(templateId, actualLayerId);
      }
    },

    playAnimation: (elementId: string, _phase?: string) => {
      console.log(`[NodeRuntime] Play animation on element ${elementId}`);
      // Animation playback would need to integrate with the animation system
    },

    stopAnimation: (elementId: string) => {
      console.log(`[NodeRuntime] Stop animation on element ${elementId}`);
    },

    navigate: (screenId: string) => {
      interactiveStore.navigate(screenId);
    },

    log: (message: string) => {
      console.log(`[NodeRuntime] ${message}`);
    },

    delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  };
}
