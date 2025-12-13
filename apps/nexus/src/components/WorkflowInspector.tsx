import { Workflow, WorkflowNode } from "../types/workflow";
import { X, Clock, Calendar, TrendingUp, Activity, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useState } from "react";

interface WorkflowInspectorProps {
  workflow: Workflow | null;
  selectedNode: WorkflowNode | null;
  onClose: () => void;
}

export function WorkflowInspector({ workflow, selectedNode, onClose }: WorkflowInspectorProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  if (!workflow && !selectedNode) return null;

  return (
    <>
      {/* Collapsed Tab */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 border border-r-0 border-slate-200 dark:border-slate-800 rounded-l-lg shadow-lg px-2 py-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors z-50 flex flex-col items-center gap-2"
          style={{ zIndex: 50 }}
        >
          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <div className="writing-mode-vertical text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
            {selectedNode ? "Node Properties" : "Workflow Properties"}
          </div>
        </button>
      )}

      {/* Expanded Panel */}
      {!isCollapsed && (
        <div 
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-2xl rounded-lg transition-all duration-300"
          style={{ 
            position: 'fixed',
            right: '24px',
            bottom: '24px',
            width: '360px', 
            height: '450px',
            minWidth: '360px', 
            maxWidth: '360px',
            flexShrink: 0,
            flexGrow: 0,
            zIndex: 50
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <h3 className="text-sm text-slate-900 dark:text-slate-100">
              {selectedNode ? "Node Properties" : "Workflow Properties"}
            </h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(true)} className="h-8 w-8 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedNode ? (
              // Node editing
              <>
                <div>
                  <Label className="text-xs">Node Type</Label>
                  <div className="mt-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md capitalize text-xs text-slate-900 dark:text-slate-100">
                    {selectedNode.type}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    defaultValue={selectedNode.title}
                    className="mt-1 text-xs h-8"
                  />
                </div>

                <div>
                  <Label className="text-xs">Parameters</Label>
                  <Textarea
                    placeholder="Node-specific parameters..."
                    className="mt-1 text-xs"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Position X</Label>
                    <Input
                      type="number"
                      defaultValue={selectedNode.position.x}
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Position Y</Label>
                    <Input
                      type="number"
                      defaultValue={selectedNode.position.y}
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button className="w-full text-xs h-8" size="sm">
                    Save Changes
                  </Button>
                </div>
              </>
            ) : workflow ? (
              // Workflow editing
              <>
                <div>
                  <Label className="text-xs">Workflow Name</Label>
                  <Input
                    defaultValue={workflow.name}
                    className="mt-1 text-xs h-8"
                  />
                </div>

                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    defaultValue={workflow.description}
                    className="mt-1 text-xs"
                    rows={2}
                  />
                </div>

                <div>
                  <Label className="text-xs">Type</Label>
                  <div className="mt-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md capitalize text-xs text-slate-900 dark:text-slate-100">
                    {workflow.type}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Schedule</Label>
                  <div className="mt-1 flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {workflow.schedule}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Zones</Label>
                  <div className="mt-1 space-y-1">
                    {workflow.zones && workflow.zones.length > 0 ? (
                      workflow.zones.map((zone) => (
                        <div key={zone} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {zone}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 italic">
                        No zones assigned
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Linked Systems</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {workflow.linkedSystems && workflow.linkedSystems.length > 0 ? (
                      workflow.linkedSystems.map((system) => (
                        <span
                          key={system}
                          className="px-2 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md"
                        >
                          {system}
                        </span>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                        No systems linked
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="flex items-center gap-1 text-xs">
                      <Calendar className="w-3 h-3" />
                      Next Run
                    </Label>
                    <div className="mt-1 text-xs text-slate-900 dark:text-slate-100">
                      {workflow.nextRun}
                    </div>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1 text-xs">
                      <Activity className="w-3 h-3" />
                      Last Run
                    </Label>
                    <div className="mt-1 text-xs text-slate-900 dark:text-slate-100">
                      {workflow.lastRun}
                    </div>
                  </div>
                </div>

                {workflow.successRate && (
                  <div>
                    <Label className="flex items-center gap-1 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      Success Rate
                    </Label>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-900 dark:text-slate-100">{workflow.successRate}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${workflow.successRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <Button className="w-full text-xs h-8" size="sm">
                    Save Changes
                  </Button>
                  <Button variant="outline" className="w-full text-xs h-8" size="sm">
                    View Run History
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}