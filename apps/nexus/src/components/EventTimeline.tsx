interface TimelineEvent {
  time: string;
  icon: string;
  event: string;
  system: string;
}

interface EventTimelineProps {
  onViewFull?: () => void;
}

export function EventTimeline({ onViewFull }: EventTimelineProps) {
  const events: TimelineEvent[] = [
    { time: "14:00", icon: "🛰️", event: "Venue systems online", system: "Network & Security" },
    { time: "14:01", icon: "💡", event: "Lighting zones initialized", system: "Lighting" },
    { time: "14:02", icon: "🌡️", event: "Ambient sensors calibrated", system: "Environmental" },
    { time: "14:03", icon: "🔊", event: "Audio matrix connected", system: "Audio" },
    { time: "14:04", icon: "🖥️", event: "LED processors synced", system: "LED Displays" },
    { time: "14:05", icon: "🪧", event: "CMS data refreshed", system: "Signage & CMS" },
    { time: "14:06", icon: "📡", event: "Nova flight data update", system: "Nova Data Engine" },
    { time: "14:07", icon: "🎛️", event: "Pulsar playback heartbeat", system: "Pulsar Scheduler" },
    { time: "14:08", icon: "💡", event: "Gate A10 lighting preset applied", system: "Lighting" },
    { time: "14:09", icon: "🔊", event: "Audio level test – Gate A11", system: "Audio" },
    { time: "14:10", icon: "🖥️", event: "LED content playlist verified", system: "LED Displays" },
    { time: "14:11", icon: "🌬️", event: "Zone A12 HVAC mode switched to Comfort", system: "Environmental" },
    { time: "14:12", icon: "📊", event: "Nova crowd data ingestion", system: "Nova Analytics" },
    { time: "14:13", icon: "🧠", event: "AI insight generated – power load high", system: "AI Engine" },
    { time: "14:14", icon: "⚙️", event: "Energy optimization workflow triggered", system: "Nexus Workflow" },
    { time: "14:15", icon: "🖥️", event: "LED brightness reduced 10%", system: "LED Displays" },
    { time: "14:16", icon: "💡", event: "Lighting color temperature adjusted", system: "Lighting" },
    { time: "14:17", icon: "🔊", event: "Audio paging line test", system: "Audio" },
    { time: "14:18", icon: "🪧", event: "Gate signage content updated", system: "Signage & CMS" },
    { time: "14:19", icon: "🎬", event: "Pixera show sync check", system: "Show Playback" },
    { time: "14:20", icon: "🎭", event: "Disguise render node connected", system: "Show Playback" },
    { time: "14:21", icon: "⚡", event: "Morning Lighting Sequence completed", system: "Workflow (Pulsar Trigger)" },
    { time: "14:22", icon: "🌡️", event: "HVAC filter status logged", system: "Environmental" },
    { time: "14:23", icon: "✈️", event: "Flight UA1823 arrival detected", system: "Nova" },
    { time: "14:24", icon: "🪧", event: "Baggage claim display activated", system: "Signage & CMS" },
    { time: "14:25", icon: "⚙️", event: "Conveyor belt powered on", system: "Mechanical I/O" },
    { time: "14:26", icon: "🔊", event: "Arrival jingle playback", system: "Audio" },
    { time: "14:27", icon: "🧍", event: "Security checkpoint crowd > 400", system: "Nova Sensors" },
    { time: "14:28", icon: "📣", event: "Security announcement triggered", system: "Audio Workflow" },
    { time: "14:29", icon: "🖥️", event: "Retail LED Ad Rotation – Scene 03", system: "LED Displays" },
    { time: "14:30", icon: "🪧", event: "Digital signage sync validation", system: "CMS Controller" },
    { time: "14:31", icon: "💡", event: "Lighting preset change – Retail A", system: "Lighting" },
    { time: "14:32", icon: "🎞️", event: "Video playback start – Retail Ad Loop", system: "Pulsar / LED" },
    { time: "14:33", icon: "🔊", event: "Audio level adjust – Retail Zone", system: "Audio" },
    { time: "14:34", icon: "🖥️", event: "LED content update – Promo B", system: "LED Displays" },
    { time: "14:35", icon: "🌬️", event: "HVAC mode change – Economy", system: "Environmental" },
    { time: "14:36", icon: "🎨", event: "Graphics render – Pixera node #2", system: "Show Playback" },
    { time: "14:37", icon: "💡", event: "Zone 3 dimming – Energy Save", system: "Lighting" },
    { time: "14:38", icon: "🎚️", event: "Mixer snapshot recall", system: "Audio" },
    { time: "14:39", icon: "📈", event: "Nova telemetry sync", system: "Nova Core" },
    { time: "14:40", icon: "🧠", event: "AI optimization applied – lighting", system: "AI Engine" },
    { time: "14:41", icon: "⚙️", event: "Workflow 'Evening Transition' started", system: "Workflow Manager" },
    { time: "14:42", icon: "🖥️", event: "LED Ad Playlist swapped", system: "CMS / LED" },
    { time: "14:43", icon: "🪧", event: "Signage text feed refreshed", system: "CMS" },
    { time: "14:44", icon: "🌡️", event: "Ambient temperature drop detected", system: "Sensors" },
    { time: "14:45", icon: "🌬️", event: "HVAC heating activated", system: "Environmental" },
    { time: "14:46", icon: "🔉", event: "Audio fade-out sequence", system: "Audio" },
    { time: "14:47", icon: "💡", event: "Lighting preset 'Evening Mode'", system: "Lighting" },
    { time: "14:48", icon: "🧩", event: "System health check completed", system: "Nexus Core" },
    { time: "14:49", icon: "📤", event: "Nova analytics report sent", system: "Nova Data Engine" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-slate-900 dark:text-slate-100">Event Timeline</h3>
        <button 
          onClick={onViewFull}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          View Full Timeline →
        </button>
      </div>

      {/* Scrollable Timeline */}
      <div className="relative overflow-x-auto">
        <div className="px-6 py-8">
          <div className="flex items-start gap-0 min-w-max">
            {events.map((event, index) => (
              <div key={index} className="relative flex flex-col items-center" style={{ width: "140px" }}>
                {/* Time */}
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  {event.time}
                </div>

                {/* Node and Line Container */}
                <div className="relative w-full flex items-center">
                  {/* Line before (hidden for first item) */}
                  {index > 0 && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-slate-200 dark:bg-slate-700" style={{ width: "calc(50% - 20px)" }} />
                  )}

                  {/* Circle Node */}
                  <div className="relative z-10 mx-auto w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400 flex items-center justify-center text-lg">
                    {event.icon}
                  </div>

                  {/* Line after (hidden for last item) */}
                  {index < events.length - 1 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[2px] bg-slate-200 dark:bg-slate-700" style={{ width: "calc(50% - 20px)" }} />
                  )}
                </div>

                {/* Event Description */}
                <div className="mt-3 text-center px-2">
                  <div className="text-xs text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">
                    {event.event}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">
                    {event.system}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Shadow Indicators */}
        <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-slate-900 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
