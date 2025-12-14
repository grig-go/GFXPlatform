import { Workflow } from "../types/workflow";
import { Button } from "./ui/button";
import { Grid3x3, Plus, Edit, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../styles/react-flow-dark.css';
import { TriggerNode } from "./nodes/TriggerNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { ActionNode } from "./nodes/ActionNode";

interface NodeViewerProps {
  workflow: Workflow | null;
  onNodeSelect?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  onAddNodeClick?: () => void;
  isEditMode?: boolean;
  onEditModeChange?: (isEditMode: boolean) => void;
}

export function NodeViewer({ workflow, onNodeSelect, selectedNodeId, onAddNodeClick, isEditMode = false, onEditModeChange }: NodeViewerProps) {
  const { t } = useTranslation(['workflows', 'common']);

  // Define custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({
    trigger: TriggerNode,
    condition: ConditionNode,
    action: ActionNode,
  }), []);

  // Transform workflow nodes to React Flow format
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!workflow) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = workflow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        title: node.title,
        params: node.params,
        isSelected: selectedNodeId === node.id,
      },
    }));

    const edges: Edge[] = workflow.nodes.flatMap((node) => {
      if (!node.connections || node.connections.length === 0) return [];
      return node.connections.map((targetId) => ({
        id: `${node.id}-${targetId}`,
        source: node.id,
        target: targetId,
        type: 'smoothstep',
        animated: workflow.status === 'active',
        style: { strokeWidth: 2 },
      }));
    });

    console.log('React Flow - Workflow:', workflow.name);
    console.log('React Flow - Nodes:', nodes);
    console.log('React Flow - Edges:', edges);

    return { initialNodes: nodes, initialEdges: edges };
  }, [workflow, selectedNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when workflow or selectedNodeId changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect]
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (isEditMode) {
        setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds));
      }
    },
    [setEdges, isEditMode]
  );

  if (!workflow) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="text-center">
          <Grid3x3 className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">{t('viewer.selectWorkflow')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-900 dark:text-slate-100">{workflow.name}</span>
          <div className="flex items-center gap-1">
            {workflow.status === "active" && (
              <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                {t('viewer.status.active')}
              </span>
            )}
            {workflow.status === "paused" && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                {t('viewer.status.paused')}
              </span>
            )}
            {workflow.status === "error" && (
              <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                {t('viewer.status.error')}
              </span>
            )}
            {workflow.status === "draft" && (
              <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 rounded-full">
                {t('viewer.status.draft')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onAddNodeClick}>
            <Plus className="w-4 h-4 mr-1" />
            {t('nodes.addNode')}
          </Button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />
          <Button variant="ghost" size="sm" onClick={() => onEditModeChange?.(!isEditMode)}>
            {isEditMode ? (
              <>
                <Save className="w-4 h-4 mr-1" />
                {t('common:actions.save')}
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-1" />
                {t('common:actions.edit')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isEditMode ? onNodesChange : undefined}
          onEdgesChange={isEditMode ? onEdgesChange : undefined}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
          nodesDraggable={isEditMode}
          nodesConnectable={isEditMode}
          elementsSelectable={true}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { strokeWidth: 2 },
          }}
        >
          <Background 
            gap={24} 
            size={3}
            variant="dots"
            className="bg-slate-50 dark:bg-slate-900"
            color="rgb(148 163 184 / 0.3)"
          />
          <Controls 
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg [&_button]:bg-white dark:[&_button]:bg-slate-800 [&_button]:text-slate-700 dark:[&_button]:text-slate-300 [&_button]:border-slate-200 dark:[&_button]:border-slate-700 hover:[&_button]:bg-slate-50 dark:hover:[&_button]:bg-slate-700"
          />
        </ReactFlow>
      </div>
    </div>
  );
}