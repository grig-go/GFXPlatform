import { useTranslation } from "react-i18next";
import { TopBar } from "./TopBar";
import { NavigationToolbar } from "./NavigationToolbar";
import { SystemOverviewGrid } from "./SystemOverviewGrid";
import { VenueTelemetryPanel } from "./VenueTelemetryPanel";
import { ActiveWorkflowsFeed } from "./ActiveWorkflowsFeed";
import { AlertsAnomalies } from "./AlertsAnomalies";
import { AISummary } from "./AISummary";
import { EventTimelinePreview } from "./EventTimelinePreview";
import { useMode } from "./ModeContext";

interface MainDashboardProps {
  onNavigateToZone: () => void;
  onNavigateToDevices: (systemFilter?: string) => void;
  onNavigateToWorkflows?: (workflowId?: string) => void;
  onNavigateToTimeline?: () => void;
  onNavigateToLogsAlerts?: () => void;
}

// Map system IDs to translation keys
const systemIdToKey: Record<string, string> = {
  "lighting": "lighting",
  "led-displays": "ledDisplays",
  "audio": "audio",
  "broadcast": "broadcastControl",
  "show-playback": "showPlayback",
  "graphics": "graphics",
  "signage": "signage",
  "environmental": "environmental",
  "network": "networkSecurity",
};

export function MainDashboard({ onNavigateToZone, onNavigateToDevices, onNavigateToWorkflows, onNavigateToTimeline, onNavigateToLogsAlerts }: MainDashboardProps) {
  const { mode } = useMode();
  const { t } = useTranslation('systems');

  // Get translated system name for device filtering
  const getSystemName = (systemId: string) => {
    const key = systemIdToKey[systemId];
    return key ? t(`names.${key}`) : systemId;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopBar onNavigateToMain={() => {}} />
      <NavigationToolbar
        currentView="main"
        onNavigate={(view) => {
          if (view === "zone") onNavigateToZone();
          if (view === "devices") onNavigateToDevices();
          if (view === "workflows") onNavigateToWorkflows?.();
          if (view === "timeline") onNavigateToTimeline?.();
          if (view === "logs-alerts") onNavigateToLogsAlerts?.();
        }}
      />

      <main className="px-6 py-6 pb-64">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Main content area with AI Summary on the right */}
          <div className="flex gap-6">
            <div className="flex-1 space-y-6">
              <SystemOverviewGrid onSystemClick={(systemId) => onNavigateToDevices(getSystemName(systemId))} />
              {/* Show telemetry only in Engineer Mode */}
              {mode === "engineer" && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <VenueTelemetryPanel />
                </div>
              )}
              <ActiveWorkflowsFeed onNavigateToWorkflows={onNavigateToWorkflows} />
            </div>
            <div className="w-80">
              <AISummary onNavigateToTimeline={onNavigateToTimeline} />
            </div>
          </div>
          
          <AlertsAnomalies onNavigateToLogs={onNavigateToLogsAlerts} />
        </div>
      </main>
      
      {/* Show timeline only in Engineer Mode */}
      {mode === "engineer" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <EventTimelinePreview onNavigateToTimeline={onNavigateToTimeline} />
        </div>
      )}
    </div>
  );
}