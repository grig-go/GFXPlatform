import { useState } from "react";
import { TopBar } from "./TopBar";
import { NavigationToolbar } from "./NavigationToolbar";
import { Search, Download } from "lucide-react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Checkbox } from "./ui/checkbox";
import { Lightbulb, Volume2, Thermometer, Monitor, Workflow, Cpu, Sparkles, ChevronDown, X, Shield } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { SAMPLE_LOGS, LogEntry } from "../data/sampleLogs";

interface LogsAlertsPageProps {
  onNavigateToMain?: () => void;
  onNavigateToZone?: () => void;
  onNavigateToDevices?: () => void;
  onNavigateToWorkflows?: () => void;
  onNavigateToTimeline?: () => void;
}

const systemIcons: Record<string, any> = {
  Lighting: Lightbulb,
  Audio: Volume2,
  HVAC: Thermometer,
  LED: Monitor,
  Pulsar: Workflow,
  Nova: Cpu,
  Security: Shield,
  AI: Sparkles,
};

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

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "resolved":
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    case "predictive":
    case "advisory":
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
    case "queued":
    case "scheduled":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  }
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

export function LogsAlertsPage({ 
  onNavigateToMain, 
  onNavigateToZone, 
  onNavigateToDevices, 
  onNavigateToWorkflows,
  onNavigateToTimeline 
}: LogsAlertsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSystem, setSelectedSystem] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showAISummary, setShowAISummary] = useState(true);
  const [showRawJSON, setShowRawJSON] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false);

  // Filter logs based on criteria
  const filteredLogs = SAMPLE_LOGS.filter(log => {
    // Tab filtering
    if (activeTab === "alerts" && log.status !== "Active") return false;
    if (activeTab === "resolved" && log.status !== "Resolved") return false;
    if (activeTab === "insights" && log.type !== "Insight") return false;

    // System filter
    if (selectedSystem !== "all" && log.system !== selectedSystem) return false;

    // Type filter
    if (selectedType !== "all" && log.type !== selectedType) return false;

    // Status filter
    if (selectedStatus !== "all" && log.status !== selectedStatus) return false;

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(query) ||
        log.device.toLowerCase().includes(query) ||
        log.system.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Helper functions for selection
  const toggleLogSelection = (logIndex: number) => {
    const newSelected = new Set(selectedLogIds);
    const logKey = `${filteredLogs[logIndex].timestamp}-${filteredLogs[logIndex].device}`;
    
    if (newSelected.has(logKey)) {
      newSelected.delete(logKey);
    } else {
      newSelected.add(logKey);
    }
    setSelectedLogIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedLogIds.size === filteredLogs.length) {
      setSelectedLogIds(new Set());
    } else {
      const allKeys = filteredLogs.map(log => `${log.timestamp}-${log.device}`);
      setSelectedLogIds(new Set(allKeys));
    }
  };

  const isLogSelected = (log: LogEntry) => {
    return selectedLogIds.has(`${log.timestamp}-${log.device}`);
  };

  const getSelectedLogs = () => {
    return filteredLogs.filter(log => isLogSelected(log));
  };

  const handleExport = () => {
    const logsToExport = selectedLogIds.size > 0 ? getSelectedLogs() : filteredLogs;
    const dataStr = JSON.stringify(logsToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `emergent-nexus-logs-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const activeAlerts = SAMPLE_LOGS.filter(log => log.status === "Active").length;
  const warnings = SAMPLE_LOGS.filter(log => log.type === "Warning").length;
  const insights = SAMPLE_LOGS.filter(log => log.type === "Insight").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopBar onNavigateToMain={onNavigateToMain} />
      <NavigationToolbar 
        currentView="logs-alerts" 
        onNavigate={(view) => {
          if (view === "main") onNavigateToMain?.();
          if (view === "zone") onNavigateToZone?.();
          if (view === "devices") onNavigateToDevices?.();
          if (view === "workflows") onNavigateToWorkflows?.();
          if (view === "timeline") onNavigateToTimeline?.();
        }}
      />

      <main className="px-6 py-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-slate-900 dark:text-slate-100">Logs & Alerts</h1>
            <p className="text-slate-500 dark:text-slate-400">Monitor system logs, alerts, and AI insights</p>
          </div>

          {/* Toolbar */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search logs, devices, or messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* System Filter */}
              <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="System" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  <SelectItem value="Lighting">Lighting</SelectItem>
                  <SelectItem value="LED">LED</SelectItem>
                  <SelectItem value="Audio">Audio</SelectItem>
                  <SelectItem value="HVAC">HVAC</SelectItem>
                  <SelectItem value="Nova">Nova</SelectItem>
                  <SelectItem value="Pulsar">Pulsar</SelectItem>
                  <SelectItem value="AI">AI</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Info">Info</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                  <SelectItem value="Error">Error</SelectItem>
                  <SelectItem value="Insight">Insight</SelectItem>
                  <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Predictive">Predictive</SelectItem>
                  <SelectItem value="Queued">Queued</SelectItem>
                </SelectContent>
              </Select>

              {/* AI Analyze Button */}
              <Button 
                variant="outline" 
                className="gap-2"
                disabled={selectedLogIds.size === 0}
                onClick={() => setShowAIAnalysisModal(true)}
              >
                <Sparkles className="w-4 h-4" />
                AI Analyze {selectedLogIds.size > 0 && `(${selectedLogIds.size})`}
              </Button>

              {/* Export Button */}
              <Button variant="outline" className="gap-2" onClick={handleExport}>
                <Download className="w-4 h-4" />
                Export {selectedLogIds.size > 0 && `(${selectedLogIds.size})`}
              </Button>
            </div>

            {/* Selection Counter */}
            {selectedLogIds.size > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedLogIds.size} log{selectedLogIds.size !== 1 ? 's' : ''} selected
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedLogIds(new Set())}
                  className="text-xs"
                >
                  Clear selection
                </Button>
              </div>
            )}
          </Card>

          {/* AI Summary Strip */}
          {showAISummary && (
            <Card className="bg-gradient-to-r from-violet-500/5 to-blue-500/5 dark:from-violet-500/10 dark:to-blue-500/10 border-violet-500/20 dark:border-violet-500/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-violet-500/10 dark:bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 dark:text-slate-100">AI Summary</span>
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
                        Last 24h
                      </Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      {activeAlerts} active alerts, {warnings} warnings detected. Energy consumption ↑ 12% week-over-week. 
                      Pattern detected: recurring LED overheating when Pulsar workflows run {">"} 3 hrs. 
                      Suggestion: verify LED node thermal management and stagger workflow execution.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        Explain Selected
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        Group by Pattern
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        Generate Report
                      </Button>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAISummary(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Main Content */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-slate-200 dark:border-slate-800 px-6 pt-4">
                <TabsList className="bg-transparent p-0 h-auto">
                  <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
                    All Logs ({SAMPLE_LOGS.length})
                  </TabsTrigger>
                  <TabsTrigger value="alerts" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
                    Active Alerts ({activeAlerts})
                  </TabsTrigger>
                  <TabsTrigger value="resolved" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
                    Resolved
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
                    AI Insights ({insights})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={activeTab} className="m-0 p-0">
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-200 dark:border-slate-800">
                      <tr className="text-slate-500 dark:text-slate-400 text-xs">
                        <th className="px-4 py-3 w-12">
                          <Checkbox 
                            checked={selectedLogIds.size === filteredLogs.length && filteredLogs.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="px-6 py-3 text-left">Timestamp</th>
                        <th className="px-6 py-3 text-left">System</th>
                        <th className="px-6 py-3 text-left">Type</th>
                        <th className="px-6 py-3 text-left">Message</th>
                        <th className="px-6 py-3 text-left">Device</th>
                        <th className="px-6 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, index) => {
                        const Icon = systemIcons[log.system] || Monitor;
                        const isSelected = isLogSelected(log);
                        return (
                          <tr 
                            key={index}
                            className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                          >
                            <td className="px-4 py-4">
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => toggleLogSelection(index)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td 
                              className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm cursor-pointer"
                              onClick={() => setSelectedLog(log)}
                            >
                              {formatTimestamp(log.timestamp)}
                            </td>
                            <td 
                              className="px-6 py-4 cursor-pointer"
                              onClick={() => setSelectedLog(log)}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                  <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-slate-900 dark:text-slate-100 text-sm">
                                  {log.system}
                                </span>
                              </div>
                            </td>
                            <td 
                              className="px-6 py-4 cursor-pointer"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Badge variant="outline" className={`text-xs ${getTypeColor(log.type)}`}>
                                {log.type}
                              </Badge>
                            </td>
                            <td 
                              className="px-6 py-4 text-slate-900 dark:text-slate-100 text-sm max-w-md cursor-pointer"
                              onClick={() => setSelectedLog(log)}
                            >
                              {log.message}
                            </td>
                            <td 
                              className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm cursor-pointer"
                              onClick={() => setSelectedLog(log)}
                            >
                              {log.device}
                            </td>
                            <td 
                              className="px-6 py-4 cursor-pointer"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Badge variant="outline" className={`text-xs ${getStatusColor(log.status)}`}>
                                {log.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredLogs.length === 0 && (
                  <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No logs found matching your filters
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl bg-slate-950 dark:bg-slate-950 border-slate-700 overflow-hidden p-0 [&>button]:bg-slate-800 [&>button]:hover:bg-slate-700 [&>button]:text-slate-300 [&>button]:opacity-100 [&>button]:border [&>button]:border-slate-600 [&>button]:w-8 [&>button]:h-8 [&>button]:rounded-lg [&>button]:flex [&>button]:items-center [&>button]:justify-center">
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
                    <span className={
                      selectedLog.status === "Active" ? "text-red-400" :
                      selectedLog.status === "Resolved" ? "text-green-400" :
                      "text-slate-400"
                    }>
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
                    <ChevronDown className={`w-3 h-3 transition-transform ${showRawJSON ? 'rotate-180' : ''}`} />
                    <span>--- RAW DATA (JSON) ---</span>
                  </button>
                  {showRawJSON && (
                    <div className="bg-slate-900 border border-slate-800 rounded p-4 overflow-x-auto">
                      <pre className="text-xs leading-relaxed">
                        <code className="text-slate-300">
{JSON.stringify(selectedLog.raw, null, 2)
  .split('\n')
  .map((line, i) => {
    // Simple syntax highlighting
    if (line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');
      return (
        <div key={i}>
          <span className="text-purple-400">{key}</span>
          <span className="text-slate-500">:</span>
          <span className="text-amber-300">{value}</span>
        </div>
      );
    }
    return <div key={i} className="text-slate-500">{line}</div>;
  })}
                        </code>
                      </pre>
                    </div>
                  )}
                </div>

                {/* AI Analysis */}
                {(selectedLog.type === "Error" || selectedLog.type === "Warning" || selectedLog.type === "Insight") && (
                  <div className="space-y-2 border-t border-slate-800 pt-4">
                    <div className="flex items-center gap-2 text-xs">
                      <Sparkles className="w-3 h-3 text-violet-400" />
                      <span className="text-slate-500">--- AI ANALYSIS ---</span>
                    </div>
                    <div className="bg-violet-500/10 border border-violet-500/30 rounded p-3">
                      <div className="text-violet-300 text-xs leading-relaxed">
                        {selectedLog.type === "Error" && selectedLog.system === "LED" && 
                          ">> This error occurred during a workflow handoff. LED node A12 may be experiencing network connectivity issues or firmware corruption.\n>> RECOMMENDED: verify network stability and consider firmware rollback to v3.1."}
                        {selectedLog.type === "Warning" && selectedLog.system === "LED" && 
                          ">> Thermal threshold breach detected. Pattern analysis shows this occurs during peak brightness operations.\n>> RECOMMENDED: reduce max brightness to 90% or improve cooling system airflow."}
                        {selectedLog.type === "Warning" && selectedLog.system === "Lighting" && 
                          ">> Power consumption spike correlates with recent scene preset changes.\n>> RECOMMENDED: optimize brightness curves or add transition delays between scenes."}
                        {selectedLog.type === "Insight" && 
                          `>> ${selectedLog.message}`}
                        {selectedLog.type === "Error" && selectedLog.system === "Security" &&
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
                    {selectedLog.system === "Pulsar" && (
                      <button 
                        className="w-full bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/50 text-violet-300 px-3 py-2 rounded text-xs text-left transition-colors"
                        onClick={() => {
                          setSelectedLog(null);
                          onNavigateToWorkflows?.();
                        }}
                      >
                        $ open-workflows --view={selectedLog.device}
                      </button>
                    )}
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