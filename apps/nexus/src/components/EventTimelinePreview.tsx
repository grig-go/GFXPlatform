import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { AlertTriangle, XCircle, CheckCircle, Info } from "lucide-react";

interface TimelineEvent {
  time: string;
  icon: string;
  event: string;
  system: string;
  status?: "success" | "warning" | "error";
  logs?: {
    timestamp: string;
    level: "info" | "warning" | "error";
    message: string;
  }[];
}

interface EventTimelinePreviewProps {
  onNavigateToTimeline?: () => void;
}

export function EventTimelinePreview({ onNavigateToTimeline }: EventTimelinePreviewProps) {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  
  const events: TimelineEvent[] = [
    // Night Operations (00:00 - 04:00)
    { time: "00:05", icon: "🛰️", event: "Night systems health check", system: "Nexus Core", status: "success" },
    { time: "00:10", icon: "💡", event: "Terminal lighting reduced to 15%", system: "Lighting", status: "success" },
    { time: "00:20", icon: "🌬️", event: "HVAC → Night Economy Mode", system: "Environmental", status: "success" },
    { time: "00:30", icon: "🔊", event: "Cleaning zone audio mute enabled", system: "Audio", status: "success" },
    { time: "00:45", icon: "💳", event: "Cleaning crew badge scan (Access Granted)", system: "Security", status: "success" },
    { time: "01:00", icon: "💡", event: "Service corridor lighting 40%", system: "Lighting", status: "success" },
    { time: "01:15", icon: "🧠", event: "AI diagnostic batch run started", system: "AI Engine", status: "success" },
    { time: "01:30", icon: "📡", event: "Nova logs synced to cloud", system: "Nova Data Engine", status: "warning", logs: [
      { timestamp: "01:30:12", level: "warning", message: "Cloud sync latency detected: 2.3s (normal: <1s)" },
      { timestamp: "01:30:15", level: "info", message: "Retry initiated with compression enabled" },
      { timestamp: "01:30:22", level: "info", message: "Sync completed successfully" }
    ]},
    { time: "02:00", icon: "⚙️", event: "Pulsar daily scheduler reboot", system: "Pulsar Control", status: "success" },
    { time: "02:10", icon: "🌡️", event: "Temp monitor: Lounges 70°F", system: "Environmental", status: "success" },
    { time: "02:30", icon: "🪧", event: "Signage maintenance mode test", system: "Signage & CMS", status: "success" },
    { time: "03:00", icon: "🧩", event: "System restart completed", system: "Nexus Core", status: "success" },

    // Morning Flight Window - Dense (04:00 - 07:30)
    { time: "04:00", icon: "💡", event: "Pre-dawn lighting sequence start", system: "Lighting", status: "success" },
    { time: "04:05", icon: "🌡️", event: "HVAC pre-warm Terminal A", system: "Environmental", status: "success" },
    { time: "04:10", icon: "📡", event: "Nova → Flight schedule sync", system: "Nova Data", status: "success" },
    { time: "04:15", icon: "🎛️", event: "Pulsar init 'Morning Prep' workflow", system: "Pulsar", status: "success" },
    { time: "04:20", icon: "🪧", event: "Gate signage boot sequence", system: "Signage", status: "error", logs: [
      { timestamp: "04:20:08", level: "error", message: "Display controller Gate B7 boot failure" },
      { timestamp: "04:20:12", level: "warning", message: "Hardware watchdog triggered reboot" },
      { timestamp: "04:20:28", level: "info", message: "Controller rebooted successfully" },
      { timestamp: "04:20:35", level: "info", message: "Content sync restored" }
    ]},
    { time: "04:25", icon: "🔊", event: "Ambient music soft-fade on", system: "Audio", status: "success" },
    { time: "04:30", icon: "💡", event: "Lighting Ramp-Up to 60%", system: "Lighting", status: "success" },
    { time: "04:40", icon: "🎞️", event: "LED ad loop check", system: "LED", status: "success" },
    { time: "04:50", icon: "📣", event: "\"Good Morning\" announcement", system: "Audio", status: "success" },
    { time: "05:00", icon: "✈️", event: "First departure flight check-in open", system: "Nova Flights", status: "success" },
    { time: "05:05", icon: "🧍", event: "Crowd sensor readings > 300", system: "Nova Sensors", status: "success" },
    { time: "05:10", icon: "🔊", event: "Gate A10 announcement trigger", system: "Audio", status: "success" },
    { time: "05:15", icon: "🖥️", event: "LED content 'Sunrise Mode'", system: "LED", status: "success" },
    { time: "05:20", icon: "🌬️", event: "HVAC adjust based on CO₂ > 800 ppm", system: "Environmental", status: "warning", logs: [
      { timestamp: "05:20:05", level: "warning", message: "CO₂ levels at 845 ppm in Concourse A (threshold: 800)" },
      { timestamp: "05:20:08", level: "info", message: "Increasing ventilation to 85%" },
      { timestamp: "05:20:45", level: "info", message: "CO₂ levels normalized to 720 ppm" }
    ]},
    { time: "05:25", icon: "💡", event: "Boarding lights Gate A11 on", system: "Lighting", status: "success" },
    { time: "05:30", icon: "🧠", event: "AI suggests power balancing", system: "AI Engine", status: "success" },
    { time: "06:00", icon: "⚡", event: "Morning Lighting Sequence completed", system: "Workflow", status: "success" },
    { time: "06:10", icon: "📊", event: "Nova crowd density sync", system: "Nova Analytics", status: "success" },
    { time: "06:20", icon: "🪧", event: "Flight info update across signage", system: "CMS", status: "success" },
    { time: "06:25", icon: "🔊", event: "Audio gate alert Gate A12", system: "Audio", status: "success" },
    { time: "06:30", icon: "✈️", event: "UA1823 boarding initiated", system: "Nova Flights", status: "success" },
    { time: "06:40", icon: "💡", event: "Lighting preset Boarding 90%", system: "Lighting", status: "success" },
    { time: "06:45", icon: "🖥️", event: "LED boarding animation", system: "LED Displays", status: "success" },
    { time: "06:50", icon: "🎚️", event: "Mixer snapshot load Boarding", system: "Audio", status: "success" },
    { time: "07:00", icon: "⚙️", event: "Workflow 'Boarding Routine' complete", system: "Workflow", status: "success" },
    { time: "07:15", icon: "🌬️", event: "HVAC revert Comfort Mode", system: "Environmental", status: "success" },
    { time: "07:30", icon: "📡", event: "Nova update: Flight departed", system: "Nova Core", status: "success" },

    // Midday Operations (08:00 - 16:00)
    { time: "08:00", icon: "🖥️", event: "LED Ad rotation Retail Scene 02", system: "LED", status: "success" },
    { time: "08:15", icon: "🪧", event: "Retail signage sync", system: "CMS", status: "success" },
    { time: "08:30", icon: "🧠", event: "AI energy forecast model run", system: "AI", status: "success" },
    { time: "09:00", icon: "💡", event: "Lighting auto-adjust Daylight Mode", system: "Lighting", status: "success" },
    { time: "09:30", icon: "📊", event: "Passenger flow report sent to Nova", system: "Analytics", status: "success" },
    { time: "10:00", icon: "🔊", event: "Security announcement loop", system: "Audio", status: "success" },
    { time: "10:30", icon: "🪧", event: "Wayfinding signage refresh", system: "CMS", status: "success" },
    { time: "11:00", icon: "🌡️", event: "HVAC load check threshold ok", system: "Environmental", status: "success" },
    { time: "11:30", icon: "🖥️", event: "LED Ad rotation Scene 03", system: "LED", status: "success" },
    { time: "12:00", icon: "️", event: "Food court playlist update", system: "Audio", status: "success" },
    { time: "12:30", icon: "💡", event: "Lighting Lunch Preset applied", system: "Lighting", status: "success" },
    { time: "13:00", icon: "📡", event: "Nova midday sync (flts & energy)", system: "Nova", status: "success" },
    { time: "13:30", icon: "🧠", event: "AI Insight: Crowd peak at Gate A14", system: "AI Analytics", status: "success" },
    { time: "14:00", icon: "🎞️", event: "Pixera content render update", system: "Show Playback", status: "error", logs: [
      { timestamp: "14:00:08", level: "error", message: "Render server memory exceeded: 31.8GB / 32GB" },
      { timestamp: "14:00:10", level: "error", message: "Content cache flush failed" },
      { timestamp: "14:00:15", level: "warning", message: "Emergency cache clear initiated" },
      { timestamp: "14:00:22", level: "info", message: "Memory freed: 12GB available" },
      { timestamp: "14:00:28", level: "info", message: "Render pipeline resumed" }
    ]},
    { time: "14:10", icon: "💡", event: "Lighting preset Retail A change", system: "Lighting", status: "success" },
    { time: "14:20", icon: "🔊", event: "Audio volume balancing", system: "Audio", status: "success" },
    { time: "14:30", icon: "🪧", event: "Signage promo update", system: "CMS", status: "success" },
    { time: "15:00", icon: "🌬️", event: "HVAC mode Economy", system: "Environmental", status: "success" },
    { time: "15:30", icon: "⚙️", event: "Workflow 'Afternoon Check' run", system: "Workflow", status: "success" },
    { time: "16:00", icon: "🖥️", event: "LED Ad rotation Scene 04", system: "LED", status: "success" },

    // Evening Flight Window - Dense (17:00 - 20:30)
    { time: "17:00", icon: "✈️", event: "Evening arrivals begin", system: "Nova Flights", status: "success" },
    { time: "17:05", icon: "💡", event: "Lighting adjust Twilight 70%", system: "Lighting", status: "success" },
    { time: "17:10", icon: "🔊", event: "Arrival announcement Gate A15", system: "Audio", status: "success" },
    { time: "17:20", icon: "🪧", event: "Arrival signage update", system: "CMS", status: "success" },
    { time: "17:25", icon: "🌡️", event: "HVAC increase ventilation", system: "Environmental", status: "success" },
    { time: "17:30", icon: "⚙️", event: "Pulsar 'Evening Show' triggered", system: "Pulsar", status: "success" },
    { time: "17:35", icon: "🖥️", event: "LED scene 'Evening Loop' active", system: "LED", status: "success" },
    { time: "17:40", icon: "🎭", event: "Disguise show playback start", system: "Show Playback", status: "warning", logs: [
      { timestamp: "17:40:05", level: "warning", message: "Network bandwidth utilization at 92%" },
      { timestamp: "17:40:08", level: "info", message: "QoS prioritization applied to show control" },
      { timestamp: "17:40:12", level: "info", message: "Playback stable, sync maintained" }
    ]},
    { time: "17:50", icon: "🎚️", event: "Mixer snapshot load Evening", system: "Audio", status: "success" },
    { time: "18:00", icon: "🧠", event: "AI Insight: Traffic High Concourse B", system: "AI", status: "success" },
    { time: "18:15", icon: "💡", event: "Lighting preset adjust Zone 3", system: "Lighting", status: "success" },
    { time: "18:30", icon: "🪧", event: "Retail signage 'Dinner Promos'", system: "CMS", status: "success" },
    { time: "19:00", icon: "🌡️", event: "Temperature monitor – Crowded zones", system: "Environmental", status: "success" },
    { time: "19:15", icon: "📊", event: "Nova sync: Crowd > 900", system: "Nova Analytics", status: "success" },
    { time: "19:30", icon: "🔊", event: "Peak hour audio loop", system: "Audio", status: "success" },
    { time: "20:00", icon: "⚡", event: "Evening Transition Sequence started", system: "Workflow", status: "success" },
    { time: "20:15", icon: "🖥️", event: "LED Playlist 'Night Ads'", system: "LED", status: "success" },
    { time: "20:30", icon: "💡", event: "Lighting preset Evening 80%", system: "Lighting", status: "success" },

    // Night Shutdown (21:00 - 23:45)
    { time: "21:00", icon: "📤", event: "Nova hourly report generated", system: "Nova", status: "success" },
    { time: "21:15", icon: "🌬️", event: "HVAC reduce flow 10%", system: "Environmental", status: "success" },
    { time: "21:30", icon: "🔉", event: "Audio fade-down retail zones", system: "Audio", status: "success" },
    { time: "22:00", icon: "💡", event: "Night shutdown routine begin", system: "Lighting", status: "success" },
    { time: "22:15", icon: "🧠", event: "AI recommends overnight load balance", system: "AI Engine", status: "success" },
    { time: "22:30", icon: "⚙️", event: "Workflow 'Night Shutdown' executed", system: "Workflow", status: "success" },
    { time: "23:00", icon: "🌬️", event: "HVAC Night Mode enabled", system: "Environmental", status: "success" },
    { time: "23:30", icon: "🪧", event: "Signage switched to standby", system: "CMS", status: "success" },
    { time: "23:45", icon: "🧩", event: "System backup and diagnostics", system: "Nexus Core", status: "success" },
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "error":
        return "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30";
      case "warning":
        return "border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30";
      default:
        return "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "error":
        return <XCircle className="absolute -top-1 -right-1 w-3 h-3 text-red-500 dark:text-red-400 bg-white dark:bg-slate-900 rounded-full" />;
      case "warning":
        return <AlertTriangle className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500 dark:text-yellow-400 bg-white dark:bg-slate-900 rounded-full" />;
      default:
        return null;
    }
  };

  const handleEventClick = (event: TimelineEvent) => {
    if (event.logs && event.logs.length > 0) {
      setSelectedEvent(event);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-100 via-white to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 border-t-2 border-slate-300 dark:border-slate-700 py-3 shadow-2xl">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm text-slate-900 dark:text-slate-100">24-Hour Event Timeline</h3>
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-green-700 dark:text-green-400">Success</span>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                <span className="text-yellow-700 dark:text-yellow-400">Warning</span>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                <span className="text-red-700 dark:text-red-400">Error</span>
              </div>
            </div>
          </div>
          <button className="px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-xs" onClick={onNavigateToTimeline}>
            View Full Timeline →
          </button>
        </div>
        
        {/* Scrollable Timeline */}
        <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-slate-200 dark:border-slate-800 p-3">
          <div className="overflow-x-auto pb-1 scroll-smooth scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600 scrollbar-track-slate-200 dark:scrollbar-track-slate-800">
            <div className="flex items-start gap-0 min-w-max">
              {events.map((event, index) => (
                <div key={index} className="relative flex flex-col items-center group" style={{ width: "140px" }}>
                  {/* Time */}
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 font-mono">
                    {event.time}
                  </div>

                  {/* Node and Line Container */}
                  <div className="relative w-full flex items-center">
                    {/* Line before (hidden for first item) */}
                    {index > 0 && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600" style={{ width: "calc(50% - 20px)" }} />
                    )}

                    {/* Circle Node - Enhanced with better click affordance */}
                    <div 
                      className={`relative z-10 mx-auto w-10 h-10 rounded-full ${getStatusColor(event.status)} flex items-center justify-center border-2 transition-all duration-200 ${
                        event.logs && event.logs.length > 0 
                          ? 'cursor-pointer hover:scale-125 hover:shadow-lg hover:border-4' 
                          : ''
                      }`} 
                      onClick={() => handleEventClick(event)}
                    >
                      <span className="text-base">{event.icon}</span>
                      {getStatusIcon(event.status)}
                      
                      {/* Click indicator for events with logs */}
                      {event.logs && event.logs.length > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                          <Info className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Line after (hidden for last item) */}
                    {index < events.length - 1 && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-slate-400 to-slate-300 dark:from-slate-600 dark:to-slate-700" style={{ width: "calc(50% - 20px)" }} />
                    )}
                  </div>

                  {/* Event Description */}
                  <div className="mt-2 text-center px-1">
                    <div className="text-xs text-slate-900 dark:text-slate-100 mb-0.5 line-clamp-2">
                      {event.event}
                    </div>
                    {/* Log indicator badge */}
                    {event.logs && event.logs.length > 0 && (
                      <div className="mt-1 text-[10px] text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click for logs
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll Shadow Indicators - Enhanced */}
          <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-l from-slate-50 dark:from-slate-900/50 via-slate-50/80 dark:via-slate-900/40 to-transparent pointer-events-none rounded-r-xl" />
          <div className="absolute top-0 left-0 bottom-0 w-20 bg-gradient-to-r from-slate-50 dark:from-slate-900/50 via-slate-50/80 dark:via-slate-900/40 to-transparent pointer-events-none rounded-l-xl" />
        </div>
      </div>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={true} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
              <DialogDescription>
                Detailed information about the selected event.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {/* Event Header */}
              <div className="flex items-start gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className={`w-12 h-12 rounded-full ${getStatusColor(selectedEvent.status)} flex items-center justify-center border-2`}>
                  <span className="text-2xl">{selectedEvent.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-slate-100 mb-1">
                    {selectedEvent.event}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span>{selectedEvent.time}</span>
                    <span>•</span>
                    <span>{selectedEvent.system}</span>
                  </div>
                  <div className="mt-2">
                    {selectedEvent.status === "error" && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs">
                        <XCircle className="w-3 h-3" />
                        Error
                      </div>
                    )}
                    {selectedEvent.status === "warning" && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        Warning
                      </div>
                    )}
                    {selectedEvent.status === "success" && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Success
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Logs */}
              {selectedEvent.logs && selectedEvent.logs.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm text-slate-700 dark:text-slate-300 mb-3">Event Log</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedEvent.logs.map((log, logIndex) => (
                      <div 
                        key={logIndex} 
                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                      >
                        {/* Icon based on log level */}
                        <div className="mt-0.5">
                          {log.level === "error" && <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />}
                          {log.level === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />}
                          {log.level === "info" && <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                        </div>
                        
                        {/* Log content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {log.timestamp}
                            </span>
                            <span className={`text-xs uppercase px-1.5 py-0.5 rounded ${
                              log.level === "error" 
                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                : log.level === "warning"
                                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            }`}>
                              {log.level}
                            </span>
                          </div>
                          <p className="text-sm text-slate-900 dark:text-slate-100">
                            {log.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}