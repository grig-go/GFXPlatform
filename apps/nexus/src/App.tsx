import { useState } from "react";
import { MainDashboard } from "./components/MainDashboard";
import { ZoneDashboard } from "./components/ZoneDashboard";
import { DevicesPage } from "./components/DevicesPage";
import { WorkflowsPage } from "./components/WorkflowsPage";
import { TimelinePage } from "./components/TimelinePage";
import { LogsAlertsPage } from "./components/LogsAlertsPage";
import { ThemeProvider } from "./components/ThemeContext";
import { ModeProvider } from "./components/ModeContext";

export default function App() {
  const [currentView, setCurrentView] = useState<"main" | "zone" | "devices" | "workflows" | "timeline" | "logs-alerts">("main");
  const [deviceSystemFilter, setDeviceSystemFilter] = useState<string | undefined>(undefined);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | undefined>(undefined);

  const handleNavigateToDevices = (systemFilter?: string) => {
    setDeviceSystemFilter(systemFilter);
    setCurrentView("devices");
  };

  const handleNavigateToWorkflows = (workflowId?: string) => {
    setSelectedWorkflowId(workflowId);
    setCurrentView("workflows");
  };

  return (
    <ThemeProvider>
      <ModeProvider>
        {currentView === "main" ? (
          <MainDashboard 
            onNavigateToZone={() => setCurrentView("zone")} 
            onNavigateToDevices={handleNavigateToDevices}
            onNavigateToWorkflows={handleNavigateToWorkflows}
            onNavigateToTimeline={() => setCurrentView("timeline")}
            onNavigateToLogsAlerts={() => setCurrentView("logs-alerts")}
          />
        ) : currentView === "zone" ? (
          <ZoneDashboard 
            onNavigateToMain={() => setCurrentView("main")} 
            onNavigateToDevices={handleNavigateToDevices}
            onNavigateToWorkflows={() => setCurrentView("workflows")}
            onNavigateToTimeline={() => setCurrentView("timeline")}
            onNavigateToLogsAlerts={() => setCurrentView("logs-alerts")}
          />
        ) : currentView === "devices" ? (
          <DevicesPage 
            onNavigateToMain={() => setCurrentView("main")} 
            onNavigateToZone={() => setCurrentView("zone")}
            onNavigateToWorkflows={() => setCurrentView("workflows")}
            onNavigateToTimeline={() => setCurrentView("timeline")}
            onNavigateToLogsAlerts={() => setCurrentView("logs-alerts")}
            initialSystemFilter={deviceSystemFilter}
          />
        ) : currentView === "workflows" ? (
          <WorkflowsPage 
            onNavigateToMain={() => setCurrentView("main")}
            onNavigateToZone={() => setCurrentView("zone")}
            onNavigateToDevices={handleNavigateToDevices}
            onNavigateToTimeline={() => setCurrentView("timeline")}
            onNavigateToLogsAlerts={() => setCurrentView("logs-alerts")}
            initialWorkflowId={selectedWorkflowId}
          />
        ) : currentView === "timeline" ? (
          <TimelinePage 
            onNavigateToMain={() => setCurrentView("main")}
            onNavigateToZone={() => setCurrentView("zone")}
            onNavigateToDevices={handleNavigateToDevices}
            onNavigateToWorkflows={() => setCurrentView("workflows")}
            onNavigateToLogsAlerts={() => setCurrentView("logs-alerts")}
          />
        ) : (
          <LogsAlertsPage 
            onNavigateToMain={() => setCurrentView("main")}
            onNavigateToZone={() => setCurrentView("zone")}
            onNavigateToDevices={handleNavigateToDevices}
            onNavigateToWorkflows={() => setCurrentView("workflows")}
            onNavigateToTimeline={() => setCurrentView("timeline")}
          />
        )}
      </ModeProvider>
    </ThemeProvider>
  );
}