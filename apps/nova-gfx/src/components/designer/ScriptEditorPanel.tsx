/**
 * Script Editor Panel
 *
 * Provides both visual (React Flow) and code (Monaco) modes for
 * creating interactive logic in Nova GFX.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type XYPosition,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import Editor from '@monaco-editor/react';
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
} from '@emergent-platform/ui';
import {
  Code2,
  GitBranch,
  Play,
  Square,
  Save,
  Trash2,
  MousePointer,
  Zap,
  Filter,
  Database,
  Clapperboard,
  Copy,
  Clipboard,
  Circle,
  ArrowRight,
  RefreshCw,
  Check,
  Loader2,
} from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import { useInteractiveStore } from '@/lib/interactive';
import '@xyflow/react/dist/style.css';

// Custom node components for visual logic builder
import { EventNode } from './script-nodes/EventNode';
import { ConditionNode } from './script-nodes/ConditionNode';
import { ActionNode } from './script-nodes/ActionNode';
import { DataNode } from './script-nodes/DataNode';
import { AnimationNode } from './script-nodes/AnimationNode';
import { NodeEditorPanel } from './script-nodes/NodeEditorPanel';

// Node types for React Flow
const nodeTypes: NodeTypes = {
  event: EventNode,
  condition: ConditionNode,
  action: ActionNode,
  data: DataNode,
  animation: AnimationNode,
};

type NodeType = 'event' | 'condition' | 'action' | 'data' | 'animation';

// Default code template
const DEFAULT_SCRIPT = `// Interactive Script for Nova GFX
// Available objects: state, data, event, element, actions

// Example: Click handler for a button
function onButtonClick(event) {
  // Get current count from state
  const count = state.count || 0;

  // Increment and update state
  actions.setState('count', count + 1);

  // Log for debugging
  actions.log('Button clicked', { newCount: count + 1 });
}

// Example: Navigate to another template
function navigateToResults() {
  actions.navigate('results-template', { score: state.count });
}

// Example: Filter data based on state
function filterProducts() {
  const category = state.selectedCategory;
  const filtered = filter(data.products, item => item.category === category);
  actions.setState('filteredProducts', filtered);
}
`;

// Convert visual nodes and edges to JavaScript code
function nodesToScript(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) {
    return DEFAULT_SCRIPT;
  }

  const lines: string[] = [
    '// Generated from Visual Script Editor',
    '// Available: state, data, event, actions',
    '',
  ];

  // Find all event nodes (entry points)
  const eventNodes = nodes.filter(n => n.type === 'event');

  // Build adjacency map from edges
  const adjacencyMap = new Map<string, string[]>();
  edges.forEach(edge => {
    const sources = adjacencyMap.get(edge.source) || [];
    sources.push(edge.target);
    adjacencyMap.set(edge.source, sources);
  });

  // Generate code for each event handler
  eventNodes.forEach((eventNode, index) => {
    const data = eventNode.data as Record<string, unknown>;
    const eventType = data.eventType as string || 'click';
    const elementName = data.elementName as string || 'element';

    // Create function name
    const funcName = `on${elementName.replace(/\s+/g, '')}${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`;

    lines.push(`// Handler for ${eventType} on ${elementName}`);
    lines.push(`function ${funcName}(event) {`);

    // Follow the chain of connected nodes
    const visited = new Set<string>();
    const generateNodeCode = (nodeId: string, indent: string): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const nodeData = node.data as Record<string, unknown>;

      switch (node.type) {
        case 'condition': {
          const condition = nodeData.condition as string || 'true';
          const operator = nodeData.operator as string || 'equals';
          const value = nodeData.value as string || '';

          let conditionCode = '';
          switch (operator) {
            case 'equals':
              conditionCode = `${condition} === ${JSON.stringify(value)}`;
              break;
            case 'notEquals':
              conditionCode = `${condition} !== ${JSON.stringify(value)}`;
              break;
            case 'greaterThan':
              conditionCode = `${condition} > ${value}`;
              break;
            case 'lessThan':
              conditionCode = `${condition} < ${value}`;
              break;
            case 'contains':
              conditionCode = `${condition}.includes(${JSON.stringify(value)})`;
              break;
            case 'isEmpty':
              conditionCode = `!${condition} || ${condition}.length === 0`;
              break;
            case 'isNotEmpty':
              conditionCode = `${condition} && ${condition}.length > 0`;
              break;
            case 'isTrue':
              conditionCode = `${condition} === true`;
              break;
            case 'isFalse':
              conditionCode = `${condition} === false`;
              break;
            default:
              conditionCode = condition;
          }

          lines.push(`${indent}if (${conditionCode}) {`);

          // Get connected nodes (true branch)
          const nextNodes = adjacencyMap.get(nodeId) || [];
          nextNodes.forEach(nextId => generateNodeCode(nextId, indent + '  '));

          lines.push(`${indent}}`);
          break;
        }

        case 'action': {
          const actionType = nodeData.actionType as string || 'log';

          // Helper to properly format values (quote strings, pass through numbers/booleans)
          const formatValue = (val: unknown): string => {
            if (val === null || val === undefined) return 'null';
            if (typeof val === 'string') return JSON.stringify(val);
            if (typeof val === 'number' || typeof val === 'boolean') return String(val);
            return JSON.stringify(val);
          };

          switch (actionType) {
            case 'setState':
              lines.push(`${indent}actions.setState('${nodeData.target || 'value'}', ${formatValue(nodeData.value)});`);
              break;
            case 'toggleState':
              lines.push(`${indent}actions.setState('${nodeData.target || 'value'}', !state.${nodeData.target || 'value'});`);
              break;
            case 'navigate':
              lines.push(`${indent}actions.navigate('${nodeData.target || 'screen'}');`);
              break;
            case 'playTemplate':
              lines.push(`${indent}actions.playTemplate('${nodeData.templateId || 'template'}', '${nodeData.layerId || 'layer'}');`);
              break;
            case 'showElement':
              lines.push(`${indent}actions.showElement('${nodeData.elementId || 'element'}');`);
              break;
            case 'hideElement':
              lines.push(`${indent}actions.hideElement('${nodeData.elementId || 'element'}');`);
              break;
            case 'toggleElement':
              lines.push(`${indent}actions.toggleElement('${nodeData.elementId || 'element'}');`);
              break;
            case 'playAnimation':
              lines.push(`${indent}actions.playAnimation('${nodeData.elementId || 'element'}', '${nodeData.phase || 'in'}');`);
              break;
            case 'stopAnimation':
              lines.push(`${indent}actions.stopAnimation('${nodeData.elementId || 'element'}');`);
              break;
            case 'log':
              lines.push(`${indent}actions.log('${nodeData.message || 'Debug message'}');`);
              break;
            case 'delay':
              lines.push(`${indent}await actions.delay(${nodeData.duration || 1000});`);
              break;
            case 'callFunction':
              lines.push(`${indent}${nodeData.functionName || 'myFunction'}();`);
              break;
            default:
              lines.push(`${indent}// Unknown action: ${actionType}`);
          }

          // Continue to next nodes
          const nextNodes = adjacencyMap.get(nodeId) || [];
          nextNodes.forEach(nextId => generateNodeCode(nextId, indent));
          break;
        }

        case 'data': {
          const operation = nodeData.operation as string || 'get';
          const path = nodeData.path as string || 'state.value';

          switch (operation) {
            case 'get':
              lines.push(`${indent}const value = ${path};`);
              break;
            case 'set':
              lines.push(`${indent}${path} = ${nodeData.value || 'null'};`);
              break;
            case 'filter':
              lines.push(`${indent}const filtered = ${path}.filter(item => ${nodeData.filter || 'true'});`);
              break;
            case 'find':
              lines.push(`${indent}const found = ${path}.find(item => ${nodeData.filter || 'true'});`);
              break;
            case 'sort':
              lines.push(`${indent}const sorted = [...${path}].sort((a, b) => a.${nodeData.sortBy || 'id'} - b.${nodeData.sortBy || 'id'});`);
              break;
            case 'map':
              lines.push(`${indent}const mapped = ${path}.map(item => item);`);
              break;
            default:
              lines.push(`${indent}// Data operation: ${operation}`);
          }

          // Continue to next nodes
          const nextNodes = adjacencyMap.get(nodeId) || [];
          nextNodes.forEach(nextId => generateNodeCode(nextId, indent));
          break;
        }

        case 'animation': {
          const templateId = nodeData.templateId as string || 'template';
          const layerId = nodeData.layerId as string || 'layer';
          const phase = nodeData.phase as string || 'in';
          const animData = nodeData.data as string || '{}';

          lines.push(`${indent}actions.playTemplate('${templateId}', '${layerId}', '${phase}', ${animData});`);

          // Continue to next nodes
          const nextNodes = adjacencyMap.get(nodeId) || [];
          nextNodes.forEach(nextId => generateNodeCode(nextId, indent));
          break;
        }
      }
    };

    // Start from nodes connected to this event
    const connectedNodes = adjacencyMap.get(eventNode.id) || [];
    connectedNodes.forEach(nodeId => generateNodeCode(nodeId, '  '));

    lines.push('}');
    lines.push('');
  });

  // Add any orphan nodes as comments
  const orphanNodes = nodes.filter(n => {
    if (n.type === 'event') return false;
    // Check if any edge targets this node
    return !edges.some(e => e.target === n.id);
  });

  if (orphanNodes.length > 0) {
    lines.push('// Unconnected nodes (connect to an event to activate):');
    orphanNodes.forEach(node => {
      lines.push(`// - ${node.type}: ${node.id}`);
    });
  }

  return lines.join('\n');
}

interface ScriptEditorPanelProps {
  className?: string;
}

// Helper to get default data for new nodes
function getDefaultNodeData(type: NodeType): Record<string, unknown> {
  switch (type) {
    case 'event':
      return { eventType: 'click', elementName: 'New Element' };
    case 'condition':
      return { condition: 'state.value', operator: 'equals', value: '' };
    case 'action':
      return { actionType: 'setState', target: '', value: '' };
    case 'data':
      return { operation: 'get', path: 'state.value' };
    case 'animation':
      return { templateName: 'Select Template', phase: 'in' };
    default:
      return {};
  }
}

// Track if a dropdown is open to prevent pane click from closing the editor
let isDropdownOpen = false;

export function setDropdownOpen(open: boolean) {
  isDropdownOpen = open;
}

// Inner component that has access to ReactFlow context
function VisualEditor({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  setNodes,
  setEdges,
  selectedNodeId,
  setSelectedNodeId,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const [contextMenuPosition, setContextMenuPosition] = useState<XYPosition | null>(null);
  const [copiedNode, setCopiedNode] = useState<Node | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  // Handle node click
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  // Handle node double-click to open editor
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  // Handle pane click to deselect - but not if a dropdown is open
  const onPaneClick = useCallback(() => {
    // Don't close the editor panel if a dropdown is open
    if (isDropdownOpen) {
      return;
    }
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // Add new node at position
  const addNodeAtPosition = useCallback((type: NodeType, position: XYPosition) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: getDefaultNodeData(type),
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newNode.id);
  }, [setNodes, setSelectedNodeId]);

  // Add node from palette (centered)
  const addNode = useCallback((type: NodeType) => {
    addNodeAtPosition(type, { x: 200 + Math.random() * 100, y: 150 + Math.random() * 100 });
  }, [addNodeAtPosition]);

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges, setSelectedNodeId]);

  // Copy selected node
  const copySelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (node) {
      setCopiedNode(node);
    }
  }, [selectedNodeId, nodes]);

  // Paste copied node
  const pasteNode = useCallback((position?: XYPosition) => {
    if (!copiedNode) return;
    const pos = position || { x: copiedNode.position.x + 50, y: copiedNode.position.y + 50 };
    const newNode: Node = {
      id: `${copiedNode.type}-${Date.now()}`,
      type: copiedNode.type,
      position: pos,
      data: { ...copiedNode.data },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newNode.id);
  }, [copiedNode, setNodes, setSelectedNodeId]);

  // Update node data
  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      )
    );
  }, [setNodes]);

  // State for custom context menu
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuScreenPos, setContextMenuScreenPos] = useState({ x: 0, y: 0 });

  // Handle context menu - capture position for node placement
  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setContextMenuPosition(position);
    setContextMenuScreenPos({ x: event.clientX, y: event.clientY });
    setShowContextMenu(true);
    console.log('[ScriptEditor] Context menu at flow position:', position);
  }, [screenToFlowPosition]);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showContextMenu]);

  // Add node and close menu
  const addNodeAndClose = useCallback((type: NodeType) => {
    if (contextMenuPosition) {
      addNodeAtPosition(type, contextMenuPosition);
    }
    setShowContextMenu(false);
  }, [contextMenuPosition, addNodeAtPosition]);

  // Paste node and close menu
  const pasteNodeAndClose = useCallback(() => {
    if (contextMenuPosition) {
      pasteNode(contextMenuPosition);
    }
    setShowContextMenu(false);
  }, [contextMenuPosition, pasteNode]);

  return (
    <div className="h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.5, maxZoom: 1 }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.25}
        maxZoom={2}
        className="bg-background"
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="bg-muted/30" />
        <Controls className="bg-zinc-900 border border-zinc-700 rounded-md [&>button]:bg-zinc-800 [&>button]:border-zinc-700 [&>button:hover]:bg-zinc-700 [&>button>svg]:fill-zinc-300" />

        {/* Selected node actions */}
        {selectedNodeId && (
          <Panel position="top-right" className="bg-zinc-900 border border-zinc-700 rounded-md p-2 m-2 shadow-lg">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                onClick={copySelectedNode}
                title="Copy (Ctrl+C)"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-400 hover:bg-zinc-800 hover:text-red-300"
                onClick={deleteSelectedNode}
                title="Delete"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          </Panel>
        )}

      </ReactFlow>

      {/* Custom Context Menu */}
      {showContextMenu && (
        <div
          className="fixed z-50 min-w-[180px] bg-zinc-900 border border-zinc-700 rounded-md shadow-lg py-1"
          style={{ left: contextMenuScreenPos.x, top: contextMenuScreenPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full flex items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={() => addNodeAndClose('event')}
          >
            <MousePointer className="w-4 h-4 mr-2 text-blue-500" />
            Add Event
          </button>
          <button
            className="w-full flex items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={() => addNodeAndClose('condition')}
          >
            <Filter className="w-4 h-4 mr-2 text-yellow-500" />
            Add Condition
          </button>
          <button
            className="w-full flex items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={() => addNodeAndClose('action')}
          >
            <Zap className="w-4 h-4 mr-2 text-green-500" />
            Add Action
          </button>
          <button
            className="w-full flex items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={() => addNodeAndClose('animation')}
          >
            <Clapperboard className="w-4 h-4 mr-2 text-purple-500" />
            Add Animation
          </button>
          <button
            className="w-full flex items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={() => addNodeAndClose('data')}
          >
            <Database className="w-4 h-4 mr-2 text-cyan-500" />
            Add Data
          </button>
          <div className="border-t border-zinc-700 my-1" />
          <button
            className={cn(
              "w-full flex items-center px-3 py-2 text-sm",
              copiedNode ? "text-zinc-200 hover:bg-zinc-800" : "text-zinc-500 cursor-not-allowed"
            )}
            onClick={pasteNodeAndClose}
            disabled={!copiedNode}
          >
            <Clipboard className="w-4 h-4 mr-2" />
            Paste Node
          </button>
        </div>
      )}

      {/* Node Editor Panel */}
      {selectedNode && (
        <NodeEditorPanel
          node={selectedNode}
          onUpdate={updateNodeData}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}

// Type for interactive config stored in project
interface InteractiveConfig {
  mode: 'visual' | 'code';
  script: string;
  visualNodes: Node[];
  visualEdges: Edge[];
}

export function ScriptEditorPanel({ className }: ScriptEditorPanelProps) {
  const [mode, setMode] = useState<'visual' | 'code'>('code');
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'pending' | 'saving'>('saved');

  const { project, updateProjectSettings, isScriptPlayMode, setScriptPlayMode } = useDesignerStore();
  const { enableInteractiveMode, disableInteractiveMode, setCodeScript, setVisualNodes } = useInteractiveStore();
  const isInteractive = project?.interactive_enabled ?? false;

  // React Flow state for visual mode - start with empty canvas
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Track the last known config hash to detect external changes
  const lastConfigHashRef = useRef<string>('');

  // Load saved config from project on mount AND when AI adds new nodes
  useEffect(() => {
    if (!project?.interactive_config) return;

    const config = project.interactive_config as InteractiveConfig;

    // Create a hash of the config to detect changes
    const configHash = JSON.stringify({
      nodeCount: config.visualNodes?.length || 0,
      edgeCount: config.visualEdges?.length || 0,
      nodeIds: config.visualNodes?.map(n => n.id).sort().join(',') || '',
    });

    // Initial load
    if (!isLoaded) {
      if (config.mode) setMode(config.mode);
      // Load script from project interactive_config
      if (config.script) {
        setScript(config.script);
        console.log('[ScriptEditor] Loaded script from project config:', config.script.length, 'chars');
      }
      if (config.visualNodes) setNodes(config.visualNodes);
      if (config.visualEdges) setEdges(config.visualEdges);
      lastConfigHashRef.current = configHash;
      setIsLoaded(true);
      console.log('[ScriptEditor] Initial load:', config.visualNodes?.length || 0, 'nodes,', config.visualEdges?.length || 0, 'edges');
      return;
    }

    // Check if project config was updated externally (e.g., by AI)
    // This happens when AI generates visual script nodes
    if (configHash !== lastConfigHashRef.current) {
      console.log('[ScriptEditor] Detected external config change, merging nodes...');
      console.log('[ScriptEditor] Previous hash:', lastConfigHashRef.current);
      console.log('[ScriptEditor] New hash:', configHash);

      // Merge new nodes with existing (avoid duplicates)
      if (config.visualNodes && config.visualNodes.length > 0) {
        const existingNodeIds = new Set(nodes.map(n => n.id));
        const newNodes = config.visualNodes.filter(n => !existingNodeIds.has(n.id));

        if (newNodes.length > 0) {
          console.log('[ScriptEditor] Adding', newNodes.length, 'new nodes from AI');
          setNodes(prev => [...prev, ...newNodes]);
        }
      }

      // Merge new edges with existing
      if (config.visualEdges && config.visualEdges.length > 0) {
        const existingEdgeIds = new Set(edges.map(e => e.id));
        const newEdges = config.visualEdges.filter(e => !existingEdgeIds.has(e.id));

        if (newEdges.length > 0) {
          console.log('[ScriptEditor] Adding', newEdges.length, 'new edges from AI');
          setEdges(prev => [...prev, ...newEdges]);
        }
      }

      lastConfigHashRef.current = configHash;
    }
  }, [project?.interactive_config, isLoaded, setNodes, setEdges, nodes, edges]);

  // Track last known script to detect AI additions
  const lastScriptRef = useRef<string>('');

  // Detect when project's interactive_config.script changes (e.g., AI generated a script)
  useEffect(() => {
    if (!project?.interactive_config) return;
    const config = project.interactive_config as InteractiveConfig;
    if (!config.script) return;

    // Check if script changed (AI added it)
    if (config.script !== lastScriptRef.current) {
      console.log('[ScriptEditor] Project config script changed, updating editor');
      setScript(config.script);
      lastScriptRef.current = config.script;
    }
  }, [project?.interactive_config]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges]
  );

  // Convert visual nodes to code
  const convertToCode = useCallback(() => {
    const generatedScript = nodesToScript(nodes, edges);
    setScript(generatedScript);
    setMode('code');
  }, [nodes, edges]);

  // Handle mode change - auto-convert if switching from visual with changes
  const handleModeChange = useCallback((newMode: 'visual' | 'code') => {
    if (mode === 'visual' && newMode === 'code' && nodes.length > 0) {
      // Auto-convert when switching from visual to code
      const generatedScript = nodesToScript(nodes, edges);
      setScript(generatedScript);
    }
    setMode(newMode);
  }, [mode, nodes, edges]);

  // Track visual changes
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

  // Save script to project.interactive_config
  const saveScript = useCallback(async () => {
    setSaveStatus('saving');
    const config: InteractiveConfig = {
      mode,
      script,
      visualNodes: nodes,
      visualEdges: edges,
    };
    await updateProjectSettings({ interactive_config: config });
    setSaveStatus('saved');
    console.log('Script saved to project');
  }, [mode, script, nodes, edges, updateProjectSettings]);

  // Auto-save with debounce when nodes/edges/script change
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);
  useEffect(() => {
    // Skip if not loaded yet (we're still loading from project)
    if (!isLoaded) return;

    // Skip the first run after loading (don't mark as pending when loading saved data)
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    // Mark as pending changes and update local state (marks project as dirty)
    setSaveStatus('pending');
    const config: InteractiveConfig = {
      mode,
      script,
      visualNodes: nodes,
      visualEdges: edges,
    };
    // Update local state immediately to mark project dirty, but don't save yet
    updateProjectSettings({ interactive_config: config }, { skipSave: true });

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after 1 second of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      // Now actually save to the database
      await updateProjectSettings({ interactive_config: config });
      setSaveStatus('saved');
      console.log('Auto-saved script config');
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [mode, script, nodes, edges, isLoaded, updateProjectSettings]);

  // Toggle script running state (play mode)
  const toggleScript = useCallback(() => {
    const newPlayMode = !isScriptPlayMode;
    console.log('[ScriptEditor] toggleScript called - current:', isScriptPlayMode, '-> new:', newPlayMode);
    setScriptPlayMode(newPlayMode);
    // Also enable/disable interactive mode for interactive elements to work
    if (newPlayMode) {
      console.log('[ScriptEditor] Enabling interactive mode...');
      enableInteractiveMode();
      // Set the code script in the interactive store for execution (primary method)
      setCodeScript(script);
      console.log('[ScriptEditor] Play mode enabled - code script set:', script.length, 'chars');
      // Also set visual nodes for fallback (basic users using visual editor)
      setVisualNodes(nodes, edges);
      console.log('[ScriptEditor] Visual nodes set:', nodes.length, 'nodes,', edges.length, 'edges');
    } else {
      console.log('[ScriptEditor] Disabling interactive mode...');
      disableInteractiveMode();
      // Clear script and visual nodes when stopping
      setCodeScript('');
      setVisualNodes([], []);
    }
  }, [isScriptPlayMode, setScriptPlayMode, enableInteractiveMode, disableInteractiveMode, setCodeScript, setVisualNodes, script, nodes, edges]);

  if (!isInteractive) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full p-8 text-center', className)}>
        <GitBranch className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Interactive Mode Required</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Enable Interactive Mode in Project Settings to create interactive apps with scripts and event handlers.
        </p>
        <Button variant="outline" size="sm">
          Open Project Settings
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        {/* Mode toggle */}
        <Tabs value={mode} onValueChange={(v) => handleModeChange(v as 'visual' | 'code')} className="h-7">
          <TabsList className="h-7 p-0.5">
            <TabsTrigger value="code" className="h-6 px-2 text-xs">
              <Code2 className="w-3 h-3 mr-1" />
              Code
            </TabsTrigger>
            <TabsTrigger value="visual" className="h-6 px-2 text-xs">
              <GitBranch className="w-3 h-3 mr-1" />
              Visual
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          {/* Convert to Code button (only in visual mode with nodes) */}
          {mode === 'visual' && nodes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-purple-400 hover:text-purple-300"
              onClick={convertToCode}
              title="Convert visual nodes to code"
            >
              <ArrowRight className="w-3 h-3 mr-1" />
              To Code
            </Button>
          )}
          {/* Script Controls */}
          <Button
            variant={isScriptPlayMode ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-7 px-2',
              isScriptPlayMode && 'bg-green-600 hover:bg-green-700 text-white'
            )}
            onClick={toggleScript}
            title={isScriptPlayMode ? 'Stop Script' : 'Start Script'}
          >
            {isScriptPlayMode ? (
              <>
                <Square className="w-3 h-3 mr-1" />
                <span className="text-xs">Stop</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                <span className="text-xs">Start</span>
              </>
            )}
          </Button>
          {isScriptPlayMode && (
            <Circle className="w-2 h-2 fill-green-500 animate-pulse" />
          )}
          {/* Save status indicator */}
          {saveStatus === 'pending' && (
            <Circle className="w-2 h-2 fill-amber-500" title="Unsaved" />
          )}
          {saveStatus === 'saving' && (
            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
          )}
          {saveStatus === 'saved' && (
            <Check className="w-3 h-3 text-green-500" />
          )}
          {/* Manual save button */}
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={saveScript} title="Save Script">
            <Save className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'visual' ? (
          <ReactFlowProvider>
            <VisualEditor
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              setNodes={setNodes}
              setEdges={setEdges}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
            />
          </ReactFlowProvider>
        ) : (
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={script}
            onChange={(value) => setScript(value ?? '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 12 },
            }}
          />
        )}
      </div>

      {/* Footer - quick reference */}
      <div className="px-3 py-2 border-t border-border bg-muted/30">
        <p className="text-[10px] text-muted-foreground">
          {mode === 'visual'
            ? 'Right-click to add nodes. Click to select, double-click to edit. Drag between handles to connect.'
            : 'Available: state, data, event, actions.navigate(), actions.setState(), actions.log()'}
        </p>
      </div>
    </div>
  );
}
