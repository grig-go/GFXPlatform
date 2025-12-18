/**
 * Script Editor Panel
 *
 * Provides both visual (React Flow) and code (Monaco) modes for
 * creating interactive logic in Nova GFX.
 */

import { useState, useCallback } from 'react';
import {
  ReactFlow,
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
  BackgroundVariant,
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
  Save,
  Trash2,
  MousePointer,
  Zap,
  Filter,
  Database,
} from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import '@xyflow/react/dist/style.css';

// Custom node components for visual logic builder
import { EventNode } from './script-nodes/EventNode';
import { ConditionNode } from './script-nodes/ConditionNode';
import { ActionNode } from './script-nodes/ActionNode';
import { DataNode } from './script-nodes/DataNode';

// Node types for React Flow
const nodeTypes: NodeTypes = {
  event: EventNode,
  condition: ConditionNode,
  action: ActionNode,
  data: DataNode,
};

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

interface ScriptEditorPanelProps {
  className?: string;
}

export function ScriptEditorPanel({ className }: ScriptEditorPanelProps) {
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { project } = useDesignerStore();
  const isInteractive = project?.interactive_enabled ?? false;

  // React Flow state for visual mode
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    {
      id: 'event-1',
      type: 'event',
      position: { x: 100, y: 100 },
      data: { eventType: 'click', elementName: 'Submit Button' },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 350, y: 100 },
      data: { condition: 'state.isValid', operator: 'equals', value: 'true' },
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 600, y: 50 },
      data: { actionType: 'navigate', target: 'success-page' },
    },
    {
      id: 'action-2',
      type: 'action',
      position: { x: 600, y: 180 },
      data: { actionType: 'setState', target: 'error', value: 'Please complete all fields' },
    },
  ]);

  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([
    { id: 'e1-2', source: 'event-1', target: 'condition-1', animated: true },
    { id: 'e2-3', source: 'condition-1', target: 'action-1', sourceHandle: 'true', label: 'Yes' },
    { id: 'e2-4', source: 'condition-1', target: 'action-2', sourceHandle: 'false', label: 'No' },
  ]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  // Add new nodes
  const addNode = useCallback((type: 'event' | 'condition' | 'action' | 'data') => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 200, y: 200 + Math.random() * 100 },
      data: getDefaultNodeData(type),
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode && e.target !== selectedNode));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  // Save script
  const saveScript = useCallback(() => {
    // TODO: Save to project.interactive_config
    console.log('Saving script:', mode === 'code' ? script : { nodes, edges });
  }, [mode, script, nodes, edges]);

  // Run/test script
  const runScript = useCallback(() => {
    // TODO: Execute script in sandbox
    console.log('Running script...');
  }, []);

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
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium">Script Editor</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'visual' | 'code')} className="h-7">
            <TabsList className="h-7 p-0.5">
              <TabsTrigger value="visual" className="h-6 px-2 text-xs">
                <GitBranch className="w-3 h-3 mr-1" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="code" className="h-6 px-2 text-xs">
                <Code2 className="w-3 h-3 mr-1" />
                Code
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Actions */}
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={runScript}>
            <Play className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={saveScript}>
            <Save className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'visual' ? (
          <div className="h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-background"
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="bg-muted/30" />
              <Controls className="bg-background border border-border rounded-md" />

              {/* Node palette */}
              <Panel position="top-left" className="bg-background border border-border rounded-md p-2 m-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium mb-1">ADD NODE</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 justify-start text-xs"
                    onClick={() => addNode('event')}
                  >
                    <MousePointer className="w-3 h-3 mr-2 text-blue-500" />
                    Event
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 justify-start text-xs"
                    onClick={() => addNode('condition')}
                  >
                    <Filter className="w-3 h-3 mr-2 text-yellow-500" />
                    Condition
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 justify-start text-xs"
                    onClick={() => addNode('action')}
                  >
                    <Zap className="w-3 h-3 mr-2 text-green-500" />
                    Action
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 justify-start text-xs"
                    onClick={() => addNode('data')}
                  >
                    <Database className="w-3 h-3 mr-2 text-purple-500" />
                    Data
                  </Button>
                </div>
              </Panel>

              {/* Selected node actions */}
              {selectedNode && (
                <Panel position="top-right" className="bg-background border border-border rounded-md p-2 m-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={deleteSelectedNode}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </Panel>
              )}
            </ReactFlow>
          </div>
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
            ? 'Drag to connect nodes. Double-click to edit.'
            : 'Available: state, data, event, actions.navigate(), actions.setState(), actions.log()'}
        </p>
      </div>
    </div>
  );
}

// Helper to get default data for new nodes
function getDefaultNodeData(type: string): Record<string, unknown> {
  switch (type) {
    case 'event':
      return { eventType: 'click', elementName: 'New Element' };
    case 'condition':
      return { condition: 'state.value', operator: 'equals', value: '' };
    case 'action':
      return { actionType: 'setState', target: '', value: '' };
    case 'data':
      return { operation: 'get', path: 'state.value' };
    default:
      return {};
  }
}
