import { useState } from "react";
import { TopBar } from "./TopBar";
import { NavigationToolbar } from "./NavigationToolbar";
import { SystemSummaryStrip } from "./SystemSummaryStrip";
import { ZoneListPanel } from "./ZoneListPanel";
import { ZoneMapPanel } from "./ZoneMapPanel";
import { ZoneAISummary } from "./ZoneAISummary";
import { ZoneFooter } from "./ZoneFooter";
import { ZoneDetailView } from "./ZoneDetailView";
import { ZoneLogsAndAlerts } from "./ZoneLogsAndAlerts";

interface ZoneDashboardProps {
  onNavigateToMain: () => void;
  onNavigateToDevices: (systemFilter?: string) => void;
  onNavigateToWorkflows?: () => void;
  onNavigateToTimeline?: () => void;
  onNavigateToLogsAlerts?: () => void;
}

export function ZoneDashboard({ onNavigateToMain, onNavigateToDevices, onNavigateToWorkflows, onNavigateToTimeline, onNavigateToLogsAlerts }: ZoneDashboardProps = {}) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [highlightedZone, setHighlightedZone] = useState<string | null>("gate-a10-a18"); // Default to first zone
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  if (selectedZone) {
    return (
      <ZoneDetailView 
        zoneId={selectedZone}
        onBack={() => setSelectedZone(null)}
        onNavigateToMain={onNavigateToMain}
        onNavigateToDevices={onNavigateToDevices}
        onNavigateToWorkflows={onNavigateToWorkflows}
        onNavigateToTimeline={onNavigateToTimeline}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopBar onNavigateToMain={onNavigateToMain} />
      <NavigationToolbar 
        currentView="zone" 
        onNavigate={(view) => {
          if (view === "main") onNavigateToMain();
          if (view === "devices") onNavigateToDevices();
          if (view === "workflows") onNavigateToWorkflows?.();
          if (view === "timeline") onNavigateToTimeline?.();
          if (view === "logs-alerts") onNavigateToLogsAlerts?.();
        }} 
      />
      
      <main className="px-6 py-6 pb-24">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Zone List - Horizontal Scroll at Top */}
          <ZoneListPanel 
            onZoneSelect={setHighlightedZone}
            onZoneNavigate={setSelectedZone}
            onZoneHover={setHoveredZone}
            highlightedZone={highlightedZone}
            hoveredZone={hoveredZone}
          />
          
          {/* System Summary Strip */}
          <SystemSummaryStrip selectedZone={highlightedZone} />
          
          {/* Main content area with AI Summary on the right */}
          <div className="flex gap-6">
            <div className="flex-1 space-y-6">
              {/* Interactive Zone Map */}
              <ZoneMapPanel 
                hoveredZone={hoveredZone}
                selectedZone={highlightedZone}
                onZoneClick={setHighlightedZone}
                onZoneNavigate={setSelectedZone}
              />
              
              {/* Logs and Alerts */}
              <ZoneLogsAndAlerts />
            </div>
            
            {/* AI Summary Panel - Right Side */}
            <div className="w-80">
              <ZoneAISummary zoneId={highlightedZone} />
            </div>
          </div>
          
          {/* Footer Links */}
          <ZoneFooter onNavigateToMain={onNavigateToMain} />
        </div>
      </main>
    </div>
  );
}