import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Play, Clock } from "lucide-react";
import { sampleWorkflows } from "../data/sampleWorkflows";
import { useState, useEffect } from "react";

// Helper function to format runtime
function formatRuntime(workflow: any): string {
  if (workflow.status !== "active") {
    // For scheduled workflows, show "Starts in X"
    if (workflow.nextRun && workflow.nextRun.includes("min")) {
      return `Starts in ${workflow.nextRun}`;
    } else if (workflow.nextRun && workflow.nextRun !== "Event-based" && workflow.nextRun !== "Manual" && workflow.nextRun !== "Continuous") {
      return `Scheduled`;
    }
    return workflow.nextRun || "Scheduled";
  }
  
  // For active workflows, show runtime based on lastRun
  if (workflow.lastRun) {
    if (workflow.lastRun.includes("min ago")) {
      const minutes = parseInt(workflow.lastRun);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
    } else if (workflow.lastRun.includes("sec ago")) {
      return "00:00:30";
    } else if (workflow.lastRun.includes("hour")) {
      const hours = parseInt(workflow.lastRun);
      return `${hours.toString().padStart(2, '0')}:15:00`;
    } else if (workflow.lastRun === "Today 06:00 AM") {
      // Calculate time since 6 AM
      const now = new Date();
      const startTime = new Date();
      startTime.setHours(6, 0, 0, 0);
      const diff = now.getTime() - startTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    }
  }
  
  return "00:00:00";
}

// Get first 5 active workflows
const activeWorkflows = sampleWorkflows
  .filter(wf => wf.status === "active")
  .slice(0, 5)
  .map(wf => ({
    id: wf.id,
    name: wf.name,
    linkedSystems: wf.linkedSystems,
    status: wf.status,
    runtime: formatRuntime(wf),
  }));

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: "bg-green-500/20 text-green-300 border-green-500/30",
    running: "bg-green-500/20 text-green-300 border-green-500/30",
    scheduled: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    paused: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  };
  
  const displayStatus = status === "active" ? "Running" : status.charAt(0).toUpperCase() + status.slice(1);
  
  return (
    <Badge variant="outline" className={styles[status as keyof typeof styles]}>
      {(status === "running" || status === "active") && <Play className="w-3 h-3 mr-1 fill-current" />}
      {status === "scheduled" && <Clock className="w-3 h-3 mr-1" />}
      {displayStatus}
    </Badge>
  );
}

interface ActiveWorkflowsFeedProps {
  onNavigateToWorkflows?: (workflowId?: string) => void;
}

export function ActiveWorkflowsFeed({ onNavigateToWorkflows }: ActiveWorkflowsFeedProps) {
  return (
    <div>
      <h2 className="text-slate-900 dark:text-slate-100 mb-4">Active Workflows</h2>
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-800/50">
              <tr>
                <th className="text-left text-slate-700 dark:text-slate-300 px-4 py-3">Name</th>
                <th className="text-left text-slate-700 dark:text-slate-300 px-4 py-3">Linked Systems</th>
                <th className="text-left text-slate-700 dark:text-slate-300 px-4 py-3">Status</th>
                <th className="text-left text-slate-700 dark:text-slate-300 px-4 py-3">Runtime</th>
              </tr>
            </thead>
            <tbody>
              {activeWorkflows.map((workflow, index) => (
                <tr
                  key={workflow.id}
                  className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => onNavigateToWorkflows?.(workflow.id)}
                >
                  <td className="text-slate-900 dark:text-slate-100 px-4 py-3">{workflow.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {workflow.linkedSystems.map((system) => (
                        <Badge
                          key={system}
                          variant="outline"
                          className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs"
                        >
                          {system}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={workflow.status} />
                  </td>
                  <td className="text-slate-900 dark:text-slate-100 px-4 py-3">{workflow.runtime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}