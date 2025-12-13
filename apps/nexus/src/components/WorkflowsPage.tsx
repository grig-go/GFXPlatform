import { useState } from "react";
import { Button } from "./ui/button";
import { Plus, Play, Sparkles } from "lucide-react";
import { WorkflowListPanel } from "./WorkflowListPanel";
import { NodeViewer } from "./NodeViewer";
import { WorkflowInspector } from "./WorkflowInspector";
import { AIAssistDrawer } from "./AIAssistDrawer";
import { AddNodeModal } from "./AddNodeModal";
import { CreateWorkflowModal } from "./CreateWorkflowModal";
import { sampleWorkflows } from "../data/sampleWorkflows";
import { Workflow } from "../types/workflow";
import { TopBar } from "./TopBar";
import { NavigationToolbar } from "./NavigationToolbar";

interface WorkflowsPageProps {
  onNavigateToMain?: () => void;
  onNavigateToZone?: () => void;
  onNavigateToDevices?: () => void;
  onNavigateToTimeline?: () => void;
  onNavigateToLogsAlerts?: () => void;
  initialWorkflowId?: string;
}

export function WorkflowsPage({ onNavigateToMain, onNavigateToZone, onNavigateToDevices, onNavigateToTimeline, onNavigateToLogsAlerts, initialWorkflowId }: WorkflowsPageProps = {}) {
  // Manage workflows state
  const [workflows, setWorkflows] = useState<Workflow[]>(sampleWorkflows);
  
  // Select workflow based on initialWorkflowId or first active workflow by default
  const firstActiveWorkflow = workflows.find(wf => wf.status === "active");
  const initialWorkflow = initialWorkflowId 
    ? workflows.find(wf => wf.id === initialWorkflowId)
    : firstActiveWorkflow;
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(initialWorkflow?.id || null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [showAIAssist, setShowAIAssist] = useState(false);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const selectedWorkflow = workflows.find(wf => wf.id === selectedWorkflowId) || null;
  const selectedNode = selectedWorkflow?.nodes.find(n => n.id === selectedNodeId) || null;

  const handleCreateWorkflow = (workflowData: {
    name: string;
    description: string;
    type: "scheduled" | "event-based" | "conditional" | "manual";
    icon: string;
  }) => {
    const newWorkflow: Workflow = {
      id: `wf-${Date.now()}`,
      name: workflowData.name,
      description: workflowData.description,
      type: workflowData.type,
      status: "draft",
      linkedSystems: [],
      zones: [],
      schedule: workflowData.type === "manual" ? "Manual Trigger" : "Not scheduled",
      lastRun: "Never",
      nextRun: workflowData.type === "manual" ? "Manual" : null,
      owner: {
        name: "Current User",
        avatar: "U"
      },
      nodes: [
        {
          id: `node-${Date.now()}`,
          type: "trigger",
          title: workflowData.type === "manual" ? "Manual Activation" : "New Trigger",
          position: { x: 300, y: 50 },
          connections: []
        }
      ]
    };

    setWorkflows([newWorkflow, ...workflows]);
    setSelectedWorkflowId(newWorkflow.id);
    setSelectedNodeId(null);
    setShowInspector(true);
  };

  const handleAddNode = (nodeData: {
    type: "trigger" | "condition" | "action";
    title: string;
    description?: string;
    settings?: Record<string, any>;
  }) => {
    if (!selectedWorkflow) return;

    // Calculate center position based on existing nodes or default to canvas center
    let centerX = 400;
    let centerY = 300;
    
    if (selectedWorkflow.nodes.length > 0) {
      // Find the average position of existing nodes
      const sumX = selectedWorkflow.nodes.reduce((sum, node) => sum + node.position.x, 0);
      const sumY = selectedWorkflow.nodes.reduce((sum, node) => sum + node.position.y, 0);
      centerX = sumX / selectedWorkflow.nodes.length;
      centerY = sumY / selectedWorkflow.nodes.length + 150; // Place below center
    }

    const newNode = {
      id: `node-${Date.now()}`,
      type: nodeData.type,
      title: nodeData.title,
      position: {
        x: centerX,
        y: centerY
      },
      connections: [] as string[]
    };

    const updatedWorkflows = workflows.map(wf => {
      if (wf.id === selectedWorkflow.id) {
        return {
          ...wf,
          nodes: [...wf.nodes, newNode]
        };
      }
      return wf;
    });

    setWorkflows(updatedWorkflows);
    
    // Automatically enter edit mode after adding a node
    setIsEditMode(true);
  };

  const handleSelectWorkflow = (id: string) => {
    setSelectedWorkflowId(id);
    setSelectedNodeId(null);
    setShowInspector(true);
  };

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setShowInspector(true);
  };

  const handleNavigate = (view: "main" | "zone" | "devices" | "workflows" | "timeline" | "logs-alerts") => {
    if (view === "main") onNavigateToMain?.();
    else if (view === "zone") onNavigateToZone?.();
    else if (view === "devices") onNavigateToDevices?.();
    else if (view === "timeline") onNavigateToTimeline?.();
    else if (view === "logs-alerts") onNavigateToLogsAlerts?.();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Bar */}
      <TopBar onNavigateToMain={onNavigateToMain} />
      
      {/* Navigation Toolbar */}
      <NavigationToolbar currentView="workflows" onNavigate={handleNavigate} />
      
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-2" onClick={() => setShowCreateWorkflowModal(true)}>
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
            
            {selectedWorkflow && (
              <>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                
                <Button variant="outline" size="sm" className="gap-2">
                  <Play className="w-4 h-4" />
                  Run
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowAIAssist(true)}
            >
              <Sparkles className="w-4 h-4" />
              AI Assist
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workflow List */}
        <WorkflowListPanel
          workflows={workflows}
          selectedWorkflowId={selectedWorkflowId}
          onWorkflowSelect={handleSelectWorkflow}
        />

        {/* Node Viewer */}
        <div className="flex-1 p-6">
          <NodeViewer
            workflow={selectedWorkflow}
            onNodeSelect={handleNodeSelect}
            selectedNodeId={selectedNodeId}
            onAddNodeClick={() => setShowAddNodeModal(true)}
            isEditMode={isEditMode}
            onEditModeChange={setIsEditMode}
          />
        </div>
      </div>

      {/* Floating Inspector Panel */}
      {showInspector && (
        <WorkflowInspector
          workflow={selectedWorkflow}
          selectedNode={selectedNode}
          onClose={() => setShowInspector(false)}
        />
      )}

      {/* AI Assist Drawer */}
      <AIAssistDrawer
        isOpen={showAIAssist}
        onClose={() => setShowAIAssist(false)}
      />

      {/* Add Node Modal */}
      <AddNodeModal
        isOpen={showAddNodeModal}
        onClose={() => setShowAddNodeModal(false)}
        onAddNode={handleAddNode}
      />

      {/* Create Workflow Modal */}
      <CreateWorkflowModal
        isOpen={showCreateWorkflowModal}
        onClose={() => setShowCreateWorkflowModal(false)}
        onAddWorkflow={handleCreateWorkflow}
      />
    </div>
  );
}