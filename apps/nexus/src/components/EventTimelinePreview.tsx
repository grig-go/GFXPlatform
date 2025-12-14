import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { AlertTriangle, XCircle, CheckCircle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TimelineEvent {
  time: string;
  icon: string;
  eventKey: string;
  systemKey: string;
  status?: "success" | "warning" | "error";
  logs?: {
    timestamp: string;
    level: "info" | "warning" | "error";
    messageKey: string;
  }[];
}

interface EventTimelinePreviewProps {
  onNavigateToTimeline?: () => void;
}

export function EventTimelinePreview({ onNavigateToTimeline }: EventTimelinePreviewProps) {
  const { t } = useTranslation('dashboard');
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  
  const events: TimelineEvent[] = [
    // Night Operations (00:00 - 04:00)
    { time: "00:05", icon: "🛰️", eventKey: "events.nightHealthCheck", systemKey: "systems.nexusCore", status: "success" },
    { time: "00:10", icon: "💡", eventKey: "events.lightingReduced15", systemKey: "systems.lighting", status: "success" },
    { time: "00:20", icon: "🌬️", eventKey: "events.hvacNightMode", systemKey: "systems.environmental", status: "success" },
    { time: "00:30", icon: "🔊", eventKey: "events.cleaningAudioMute", systemKey: "systems.audio", status: "success" },
    { time: "00:45", icon: "💳", eventKey: "events.cleaningCrewBadge", systemKey: "systems.security", status: "success" },
    { time: "01:00", icon: "💡", eventKey: "events.serviceLighting40", systemKey: "systems.lighting", status: "success" },
    { time: "01:15", icon: "🧠", eventKey: "events.aiDiagnosticStart", systemKey: "systems.aiEngine", status: "success" },
    { time: "01:30", icon: "📡", eventKey: "events.novaCloudSync", systemKey: "systems.novaData", status: "warning", logs: [
      { timestamp: "01:30:12", level: "warning", messageKey: "logs.cloudSyncLatency" },
      { timestamp: "01:30:15", level: "info", messageKey: "logs.retryCompression" },
      { timestamp: "01:30:22", level: "info", messageKey: "logs.syncComplete" }
    ]},
    { time: "02:00", icon: "⚙️", eventKey: "events.pulsarReboot", systemKey: "systems.pulsarControl", status: "success" },
    { time: "02:10", icon: "🌡️", eventKey: "events.tempMonitorLounges", systemKey: "systems.environmental", status: "success" },
    { time: "02:30", icon: "🪧", eventKey: "events.signageMaintenanceTest", systemKey: "systems.signageCms", status: "success" },
    { time: "03:00", icon: "🧩", eventKey: "events.systemRestartComplete", systemKey: "systems.nexusCore", status: "success" },

    // Morning Flight Window - Dense (04:00 - 07:30)
    { time: "04:00", icon: "💡", eventKey: "events.preDawnLighting", systemKey: "systems.lighting", status: "success" },
    { time: "04:05", icon: "🌡️", eventKey: "events.hvacPreWarm", systemKey: "systems.environmental", status: "success" },
    { time: "04:10", icon: "📡", eventKey: "events.novaFlightSync", systemKey: "systems.novaData", status: "success" },
    { time: "04:15", icon: "🎛️", eventKey: "events.pulsarMorningPrep", systemKey: "systems.pulsar", status: "success" },
    { time: "04:20", icon: "🪧", eventKey: "events.gateSignageBoot", systemKey: "systems.signage", status: "error", logs: [
      { timestamp: "04:20:08", level: "error", messageKey: "logs.displayBootFailure" },
      { timestamp: "04:20:12", level: "warning", messageKey: "logs.watchdogReboot" },
      { timestamp: "04:20:28", level: "info", messageKey: "logs.controllerRebooted" },
      { timestamp: "04:20:35", level: "info", messageKey: "logs.contentSyncRestored" }
    ]},
    { time: "04:25", icon: "🔊", eventKey: "events.ambientMusicOn", systemKey: "systems.audio", status: "success" },
    { time: "04:30", icon: "💡", eventKey: "events.lightingRamp60", systemKey: "systems.lighting", status: "success" },
    { time: "04:40", icon: "🎞️", eventKey: "events.ledAdCheck", systemKey: "systems.led", status: "success" },
    { time: "04:50", icon: "📣", eventKey: "events.goodMorningAnnounce", systemKey: "systems.audio", status: "success" },
    { time: "05:00", icon: "✈️", eventKey: "events.firstDepartureCheckIn", systemKey: "systems.novaFlights", status: "success" },
    { time: "05:05", icon: "🧍", eventKey: "events.crowdSensor300", systemKey: "systems.novaSensors", status: "success" },
    { time: "05:10", icon: "🔊", eventKey: "events.gateA10Announce", systemKey: "systems.audio", status: "success" },
    { time: "05:15", icon: "🖥️", eventKey: "events.ledSunriseMode", systemKey: "systems.led", status: "success" },
    { time: "05:20", icon: "🌬️", eventKey: "events.hvacCo2Adjust", systemKey: "systems.environmental", status: "warning", logs: [
      { timestamp: "05:20:05", level: "warning", messageKey: "logs.co2LevelsHigh" },
      { timestamp: "05:20:08", level: "info", messageKey: "logs.increasingVentilation" },
      { timestamp: "05:20:45", level: "info", messageKey: "logs.co2Normalized" }
    ]},
    { time: "05:25", icon: "💡", eventKey: "events.boardingLightsA11", systemKey: "systems.lighting", status: "success" },
    { time: "05:30", icon: "🧠", eventKey: "events.aiPowerBalance", systemKey: "systems.aiEngine", status: "success" },
    { time: "06:00", icon: "⚡", eventKey: "events.morningSequenceComplete", systemKey: "systems.workflow", status: "success" },
    { time: "06:10", icon: "📊", eventKey: "events.novaCrowdSync", systemKey: "systems.novaAnalytics", status: "success" },
    { time: "06:20", icon: "🪧", eventKey: "events.flightInfoUpdate", systemKey: "systems.cms", status: "success" },
    { time: "06:25", icon: "🔊", eventKey: "events.audioGateA12", systemKey: "systems.audio", status: "success" },
    { time: "06:30", icon: "✈️", eventKey: "events.ua1823Boarding", systemKey: "systems.novaFlights", status: "success" },
    { time: "06:40", icon: "💡", eventKey: "events.lightingBoarding90", systemKey: "systems.lighting", status: "success" },
    { time: "06:45", icon: "🖥️", eventKey: "events.ledBoardingAnim", systemKey: "systems.ledDisplays", status: "success" },
    { time: "06:50", icon: "🎚️", eventKey: "events.mixerBoarding", systemKey: "systems.audio", status: "success" },
    { time: "07:00", icon: "⚙️", eventKey: "events.boardingRoutineComplete", systemKey: "systems.workflow", status: "success" },
    { time: "07:15", icon: "🌬️", eventKey: "events.hvacComfortMode", systemKey: "systems.environmental", status: "success" },
    { time: "07:30", icon: "📡", eventKey: "events.novaFlightDeparted", systemKey: "systems.novaCore", status: "success" },

    // Midday Operations (08:00 - 16:00)
    { time: "08:00", icon: "🖥️", eventKey: "events.ledRetailScene02", systemKey: "systems.led", status: "success" },
    { time: "08:15", icon: "🪧", eventKey: "events.retailSignageSync", systemKey: "systems.cms", status: "success" },
    { time: "08:30", icon: "🧠", eventKey: "events.aiEnergyForecast", systemKey: "systems.ai", status: "success" },
    { time: "09:00", icon: "💡", eventKey: "events.lightingDaylight", systemKey: "systems.lighting", status: "success" },
    { time: "09:30", icon: "📊", eventKey: "events.passengerFlowReport", systemKey: "systems.analytics", status: "success" },
    { time: "10:00", icon: "🔊", eventKey: "events.securityAnnounceLoop", systemKey: "systems.audio", status: "success" },
    { time: "10:30", icon: "🪧", eventKey: "events.wayfindingRefresh", systemKey: "systems.cms", status: "success" },
    { time: "11:00", icon: "🌡️", eventKey: "events.hvacLoadCheck", systemKey: "systems.environmental", status: "success" },
    { time: "11:30", icon: "🖥️", eventKey: "events.ledScene03", systemKey: "systems.led", status: "success" },
    { time: "12:00", icon: "🎵", eventKey: "events.foodCourtPlaylist", systemKey: "systems.audio", status: "success" },
    { time: "12:30", icon: "💡", eventKey: "events.lightingLunchPreset", systemKey: "systems.lighting", status: "success" },
    { time: "13:00", icon: "📡", eventKey: "events.novaMiddaySync", systemKey: "systems.nova", status: "success" },
    { time: "13:30", icon: "🧠", eventKey: "events.aiCrowdPeakA14", systemKey: "systems.aiAnalytics", status: "success" },
    { time: "14:00", icon: "🎞️", eventKey: "events.pixeraRenderUpdate", systemKey: "systems.showPlayback", status: "error", logs: [
      { timestamp: "14:00:08", level: "error", messageKey: "logs.renderMemoryExceeded" },
      { timestamp: "14:00:10", level: "error", messageKey: "logs.cacheFlushFailed" },
      { timestamp: "14:00:15", level: "warning", messageKey: "logs.emergencyCacheClear" },
      { timestamp: "14:00:22", level: "info", messageKey: "logs.memoryFreed" },
      { timestamp: "14:00:28", level: "info", messageKey: "logs.renderPipelineResumed" }
    ]},
    { time: "14:10", icon: "💡", eventKey: "events.lightingRetailAChange", systemKey: "systems.lighting", status: "success" },
    { time: "14:20", icon: "🔊", eventKey: "events.audioVolumeBalance", systemKey: "systems.audio", status: "success" },
    { time: "14:30", icon: "🪧", eventKey: "events.signagePromoUpdate", systemKey: "systems.cms", status: "success" },
    { time: "15:00", icon: "🌬️", eventKey: "events.hvacEconomyMode", systemKey: "systems.environmental", status: "success" },
    { time: "15:30", icon: "⚙️", eventKey: "events.afternoonCheckRun", systemKey: "systems.workflow", status: "success" },
    { time: "16:00", icon: "🖥️", eventKey: "events.ledScene04", systemKey: "systems.led", status: "success" },

    // Evening Flight Window - Dense (17:00 - 20:30)
    { time: "17:00", icon: "✈️", eventKey: "events.eveningArrivals", systemKey: "systems.novaFlights", status: "success" },
    { time: "17:05", icon: "💡", eventKey: "events.lightingTwilight70", systemKey: "systems.lighting", status: "success" },
    { time: "17:10", icon: "🔊", eventKey: "events.arrivalAnnounceA15", systemKey: "systems.audio", status: "success" },
    { time: "17:20", icon: "🪧", eventKey: "events.arrivalSignageUpdate", systemKey: "systems.cms", status: "success" },
    { time: "17:25", icon: "🌡️", eventKey: "events.hvacIncreaseVent", systemKey: "systems.environmental", status: "success" },
    { time: "17:30", icon: "⚙️", eventKey: "events.pulsarEveningShow", systemKey: "systems.pulsar", status: "success" },
    { time: "17:35", icon: "🖥️", eventKey: "events.ledEveningLoop", systemKey: "systems.led", status: "success" },
    { time: "17:40", icon: "🎭", eventKey: "events.disguisePlaybackStart", systemKey: "systems.showPlayback", status: "warning", logs: [
      { timestamp: "17:40:05", level: "warning", messageKey: "logs.networkBandwidth92" },
      { timestamp: "17:40:08", level: "info", messageKey: "logs.qosPrioritization" },
      { timestamp: "17:40:12", level: "info", messageKey: "logs.playbackStable" }
    ]},
    { time: "17:50", icon: "🎚️", eventKey: "events.mixerEvening", systemKey: "systems.audio", status: "success" },
    { time: "18:00", icon: "🧠", eventKey: "events.aiTrafficHighB", systemKey: "systems.ai", status: "success" },
    { time: "18:15", icon: "💡", eventKey: "events.lightingZone3Adjust", systemKey: "systems.lighting", status: "success" },
    { time: "18:30", icon: "🪧", eventKey: "events.retailDinnerPromos", systemKey: "systems.cms", status: "success" },
    { time: "19:00", icon: "🌡️", eventKey: "events.tempMonitorCrowded", systemKey: "systems.environmental", status: "success" },
    { time: "19:15", icon: "📊", eventKey: "events.novaCrowd900", systemKey: "systems.novaAnalytics", status: "success" },
    { time: "19:30", icon: "🔊", eventKey: "events.peakHourAudioLoop", systemKey: "systems.audio", status: "success" },
    { time: "20:00", icon: "⚡", eventKey: "events.eveningTransitionStart", systemKey: "systems.workflow", status: "success" },
    { time: "20:15", icon: "🖥️", eventKey: "events.ledNightAds", systemKey: "systems.led", status: "success" },
    { time: "20:30", icon: "💡", eventKey: "events.lightingEvening80", systemKey: "systems.lighting", status: "success" },

    // Night Shutdown (21:00 - 23:45)
    { time: "21:00", icon: "📤", eventKey: "events.novaHourlyReport", systemKey: "systems.nova", status: "success" },
    { time: "21:15", icon: "🌬️", eventKey: "events.hvacReduceFlow10", systemKey: "systems.environmental", status: "success" },
    { time: "21:30", icon: "🔉", eventKey: "events.audioFadeDownRetail", systemKey: "systems.audio", status: "success" },
    { time: "22:00", icon: "💡", eventKey: "events.nightShutdownBegin", systemKey: "systems.lighting", status: "success" },
    { time: "22:15", icon: "🧠", eventKey: "events.aiOvernightBalance", systemKey: "systems.aiEngine", status: "success" },
    { time: "22:30", icon: "⚙️", eventKey: "events.nightShutdownExecute", systemKey: "systems.workflow", status: "success" },
    { time: "23:00", icon: "🌬️", eventKey: "events.hvacNightModeEnable", systemKey: "systems.environmental", status: "success" },
    { time: "23:30", icon: "🪧", eventKey: "events.signageStandby", systemKey: "systems.cms", status: "success" },
    { time: "23:45", icon: "🧩", eventKey: "events.systemBackupDiag", systemKey: "systems.nexusCore", status: "success" },
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
            <h3 className="text-sm text-slate-900 dark:text-slate-100">{t('timeline.title')}</h3>
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-green-700 dark:text-green-400">{t('timeline.success')}</span>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                <span className="text-yellow-700 dark:text-yellow-400">{t('timeline.warning')}</span>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                <span className="text-red-700 dark:text-red-400">{t('timeline.error')}</span>
              </div>
            </div>
          </div>
          <button className="px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-xs" onClick={onNavigateToTimeline}>
            {t('timeline.viewAll')} →
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
                      {t(event.eventKey)}
                    </div>
                    {/* Log indicator badge */}
                    {event.logs && event.logs.length > 0 && (
                      <div className="mt-1 text-[10px] text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('timeline.clickForLogs')}
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
              <DialogTitle>{t('timeline.eventDetails')}</DialogTitle>
              <DialogDescription>
                {t('timeline.eventDetailsDesc')}
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
                    {t(selectedEvent.eventKey)}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span>{selectedEvent.time}</span>
                    <span>•</span>
                    <span>{t(selectedEvent.systemKey)}</span>
                  </div>
                  <div className="mt-2">
                    {selectedEvent.status === "error" && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs">
                        <XCircle className="w-3 h-3" />
                        {t('timeline.error')}
                      </div>
                    )}
                    {selectedEvent.status === "warning" && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        {t('timeline.warning')}
                      </div>
                    )}
                    {selectedEvent.status === "success" && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        {t('timeline.success')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Logs */}
              {selectedEvent.logs && selectedEvent.logs.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm text-slate-700 dark:text-slate-300 mb-3">{t('timeline.eventLog')}</h4>
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
                            {t(log.messageKey)}
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