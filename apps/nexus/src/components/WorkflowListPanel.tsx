import { Workflow } from "../types/workflow";
import { Input } from "./ui/input";
import { Search, Clock, Users, Activity, MoreVertical, Play, Copy, Archive, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface WorkflowListPanelProps {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  onWorkflowSelect: (id: string) => void;
}

export function WorkflowListPanel({ workflows, selectedWorkflowId, onWorkflowSelect }: WorkflowListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active">("active");

  const filteredWorkflows = workflows.filter((wf) => {
    const matchesSearch = wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         wf.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         wf.linkedSystems.some(sys => sys.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTab = activeTab === "all" || wf.status === "active";
    
    return matchesSearch && matchesTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "paused": return "bg-yellow-500";
      case "error": return "bg-red-500";
      case "draft": return "bg-slate-400";
      default: return "bg-slate-400";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "scheduled": return "🕐";
      case "manual": return "👆";
      case "conditional": return "⚡";
      case "event-based": return "🎯";
      default: return "📋";
    }
  };

  return (
    <div className="w-[380px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-slate-900 dark:text-slate-100 mb-3">Workflows</h2>
        
        {/* Tabs */}
        <div className="flex gap-1 mb-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            All Workflows
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "active"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            Active Only
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      {/* Workflow List */}
      <div className="flex-1 overflow-y-auto">
        {filteredWorkflows.map((workflow) => (
          <div
            key={workflow.id}
            onClick={() => onWorkflowSelect(workflow.id)}
            className={`
              p-4 border-b border-slate-200 dark:border-slate-800 cursor-pointer transition-colors
              ${selectedWorkflowId === workflow.id
                ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-l-transparent"
              }
            `}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className="text-lg mt-0.5">{getTypeIcon(workflow.type)}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-900 dark:text-slate-100 truncate">
                    {workflow.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {workflow.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(workflow.status)}`} />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Play className="w-4 h-4 mr-2" />
                      Run Now
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 dark:text-red-400">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Systems */}
            <div className="flex flex-wrap gap-1 mb-2">
              {workflow.linkedSystems.slice(0, 3).map((system) => (
                <span
                  key={system}
                  className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full"
                >
                  {system}
                </span>
              ))}
              {workflow.linkedSystems.length > 3 && (
                <span className="px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                  +{workflow.linkedSystems.length - 3}
                </span>
              )}
            </div>

            {/* Schedule & Next Run */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <Clock className="w-3 h-3" />
                <span className="truncate">{workflow.schedule}</span>
              </div>
              {workflow.nextRun && workflow.nextRun !== "Event-based" && workflow.nextRun !== "Manual" && workflow.nextRun !== "Continuous" && (
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <Activity className="w-3 h-3" />
                  <span className="truncate">{workflow.nextRun}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredWorkflows.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            No workflows found
          </div>
        )}
      </div>
    </div>
  );
}