import { Card } from "./ui/card";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { SAMPLE_LOGS, LogEntry } from "../data/sampleLogs";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Lightbulb, Volume2, Thermometer, Monitor, Workflow, Cpu, Sparkles, Shield, X, ChevronDown } from "lucide-react";

function getTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
}

function getSeverityFromType(type: string, status: string): string {
  if (type === "Error" || status === "Active") return "error";
  if (type === "Warning") return "warning";
  return "info";
}

function getTypeColor(type: string) {
  switch (type.toLowerCase()) {
    case "error":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "warning":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "insight":
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
    case "diagnostic":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  }
}

const systemIcons: Record<string, React.ElementType> = {
  "Lighting": Lightbulb,
  "Audio": Volume2,
  "HVAC": Thermometer,
  "LED": Monitor,
  "Pulsar": Workflow,
  "Nova": Cpu,
  "AI": Sparkles,
  "Security": Shield,
};

interface AlertsAnomaliesProps {
  onNavigateToLogs?: () => void;
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "error") {
    return <AlertCircle className="w-5 h-5 text-red-400" />;
  }
  if (severity === "warning") {
    return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
  }
  return <Info className="w-5 h-5 text-blue-400" />;
}

export function AlertsAnomalies({ onNavigateToLogs }: AlertsAnomaliesProps) {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showRawJSON, setShowRawJSON] = useState(false);
  
  // Get top 5 most recent logs
  const topLogs = SAMPLE_LOGS.slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-slate-900 dark:text-slate-100">Alerts & Anomalies</h2>
        <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onNavigateToLogs}>
          View All
        </Button>
      </div>
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {topLogs.map((log, index) => {
            const Icon = systemIcons[log.system] || Monitor;
            const severity = getSeverityFromType(log.type, log.status);
            
            return (
              <div
                key={index}
                onClick={() => setSelectedLog(log)}
                className={`px-4 py-3 cursor-pointer transition-all duration-500 ease-out group
                  hover:bg-slate-50 dark:hover:bg-slate-800/50
                  animate-in fade-in slide-in-from-left-4
                  ${severity === 'error' ? 'hover:bg-red-50/50 dark:hover:bg-red-950/20' : ''}
                  ${severity === 'warning' ? 'hover:bg-yellow-50/50 dark:hover:bg-yellow-950/20' : ''}
                  ${severity === 'info' ? 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20' : ''}
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Top row: Icon, System, Device, Timestamp */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="shrink-0">
                    <SeverityIcon severity={severity} />
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge 
                      variant="outline" 
                      className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 shrink-0"
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {log.system}
                    </Badge>
                    
                    <Badge 
                      variant="outline" 
                      className="text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs shrink-0"
                    >
                      {log.device}
                    </Badge>
                  </div>
                  
                  <div className="text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap ml-auto shrink-0">
                    {getTimeAgo(log.timestamp)}
                  </div>
                </div>
                
                {/* Bottom row: Message */}
                <div className="pl-9 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                  {log.message}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl bg-slate-950 dark:bg-slate-950 border-slate-700 overflow-hidden p-0 [&>button]:bg-slate-800 [&>button]:hover:bg-slate-700 [&>button]:text-slate-300 [&>button]:opacity-100 [&>button]:border [&>button]:border-slate-600 [&>button]:w-8 [&>button]:h-8 [&>button]:rounded-lg [&>button]:flex [&>button]:items-center [&>button]:justify-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Log Entry Details</DialogTitle>
            <DialogDescription>
              View detailed information for this log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="bg-slate-950">
              {/* Terminal-style Header */}
              <div className="bg-slate-900 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm font-mono">
                    /var/log/emergent-nexus/{selectedLog.system.toLowerCase()}.log
                  </span>
                </div>
                <Badge variant="outline" className={`${getTypeColor(selectedLog.type)} font-mono text-xs`}>
                  {selectedLog.type.toUpperCase()}
                </Badge>
              </div>

              {/* Terminal Content */}
              <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto font-mono text-sm">
                {/* Log Entry Header */}
                <div className="space-y-1">
                  <div className="text-slate-500 text-xs">
                    ===== LOG ENTRY =====
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-400">timestamp:</span>
                    <span className="text-amber-300">{selectedLog.timestamp}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-400">device:</span>
                    <span className="text-blue-300">{selectedLog.device}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-400">system:</span>
                    <span className="text-cyan-300">{selectedLog.system}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-400">source:</span>
                    <span className="text-slate-300">{selectedLog.source}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-400">status:</span>
                    <span
                      className={
                        selectedLog.status === "Active"
                          ? "text-red-400"
                          : selectedLog.status === "Resolved"
                          ? "text-green-400"
                          : "text-slate-400"
                      }
                    >
                      {selectedLog.status}
                    </span>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-1 border-t border-slate-800 pt-4">
                  <div className="text-slate-500 text-xs">
                    --- MESSAGE ---
                  </div>
                  <div className="text-slate-200 leading-relaxed">
                    {selectedLog.message}
                  </div>
                </div>

                {/* Raw Data */}
                <div className="space-y-1 border-t border-slate-800 pt-4">
                  <button
                    onClick={() => setShowRawJSON(!showRawJSON)}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors text-xs"
                  >
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${
                        showRawJSON ? "rotate-180" : ""
                      }`}
                    />
                    <span>--- RAW DATA (JSON) ---</span>
                  </button>
                  {showRawJSON && (
                    <div className="bg-slate-900 border border-slate-800 rounded p-4 overflow-x-auto">
                      <pre className="text-xs leading-relaxed">
                        <code className="text-slate-300">
                          {JSON.stringify(selectedLog.raw, null, 2)
                            .split("\n")
                            .map((line, i) => {
                              // Simple syntax highlighting
                              if (line.includes(":")) {
                                const [key, ...valueParts] = line.split(":");
                                const value = valueParts.join(":");
                                return (
                                  <div key={i}>
                                    <span className="text-purple-400">
                                      {key}
                                    </span>
                                    <span className="text-slate-500">:</span>
                                    <span className="text-amber-300">
                                      {value}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div key={i} className="text-slate-500">
                                  {line}
                                </div>
                              );
                            })}
                        </code>
                      </pre>
                    </div>
                  )}
                </div>

                {/* AI Analysis */}
                {(selectedLog.type === "Error" ||
                  selectedLog.type === "Warning" ||
                  selectedLog.type === "Insight") && (
                  <div className="space-y-2 border-t border-slate-800 pt-4">
                    <div className="flex items-center gap-2 text-xs">
                      <Sparkles className="w-3 h-3 text-violet-400" />
                      <span className="text-slate-500">--- AI ANALYSIS ---</span>
                    </div>
                    <div className="bg-violet-500/10 border border-violet-500/30 rounded p-3">
                      <div className="text-violet-300 text-xs leading-relaxed">
                        {selectedLog.type === "Error" &&
                          selectedLog.system === "LED" &&
                          ">> This error occurred during a workflow handoff. LED node A12 may be experiencing network connectivity issues or firmware corruption.\n>> RECOMMENDED: verify network stability and consider firmware rollback to v3.1."}
                        {selectedLog.type === "Warning" &&
                          selectedLog.system === "LED" &&
                          ">> Thermal threshold breach detected. Pattern analysis shows this occurs during peak brightness operations.\n>> RECOMMENDED: reduce max brightness to 90% or improve cooling system airflow."}
                        {selectedLog.type === "Warning" &&
                          selectedLog.system === "Lighting" &&
                          ">> Power consumption spike correlates with recent scene preset changes.\n>> RECOMMENDED: optimize brightness curves or add transition delays between scenes."}
                        {selectedLog.type === "Insight" &&
                          `>> ${selectedLog.message}`}
                        {selectedLog.type === "Error" &&
                          selectedLog.system === "Security" &&
                          ">> Camera stream interruption detected. This appears to be a network-related issue.\n>> RECOMMENDED: verify PoE switch status and network cable integrity for CAM-GATE12."}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Commands */}
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <div className="text-slate-500 text-xs">
                    --- AVAILABLE COMMANDS ---
                  </div>
                  <div className="space-y-2">
                    {selectedLog.status === "Active" && (
                      <>
                        <button className="w-full bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-300 px-3 py-2 rounded text-xs text-left transition-colors">
                          $ acknowledge-alert --id={selectedLog.device}
                        </button>
                        <button className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-300 px-3 py-2 rounded text-xs text-left transition-colors">
                          $ resolve-alert --id={selectedLog.device}
                        </button>
                      </>
                    )}
                    <button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 px-3 py-2 rounded text-xs text-left transition-colors">
                      $ query-logs --related --device={selectedLog.device}
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-slate-600 text-xs border-t border-slate-800 pt-4">
                  [END OF LOG ENTRY] — Press ESC to close
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}