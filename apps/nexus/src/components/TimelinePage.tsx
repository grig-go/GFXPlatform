import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TopBar } from "./TopBar";
import { NavigationToolbar } from "./NavigationToolbar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { 
  Calendar as CalendarIcon, 
  Search, 
  Filter, 
  Download, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  X,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Info,
  Lightbulb,
  Volume2,
  Monitor,
  Wind,
  Radio,
  Sliders,
  Brain,
  Shield,
  SignpostBig
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

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

interface WorkflowEvent {
  id: string;
  date: Date;
  time: string;
  name: string;
  system: string;
  icon: string;
  color: string;
  type: "scheduled" | "completed";
}

interface TimelinePageProps {
  onNavigateToMain: () => void;
  onNavigateToZone: () => void;
  onNavigateToDevices: () => void;
  onNavigateToWorkflows: () => void;
  onNavigateToLogsAlerts?: () => void;
}

export function TimelinePage({ onNavigateToMain, onNavigateToZone, onNavigateToDevices, onNavigateToWorkflows, onNavigateToLogsAlerts }: TimelinePageProps) {
  const { t } = useTranslation(['timeline', 'common']);
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [selectedDate, setSelectedDate] = useState(new Date(2025, 10, 10)); // Nov 10, 2025
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowEvent | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([
    "lighting", "audio", "led", "hvac", "signage", "nova", "pulsar", "ai", "security"
  ]);
  const [showAIInsights, setShowAIInsights] = useState(false);

  // System filter configuration
  const systemFilters = [
    { id: "lighting", label: t('systems.lighting'), icon: Lightbulb, color: "text-yellow-500" },
    { id: "audio", label: t('systems.audio'), icon: Volume2, color: "text-blue-500" },
    { id: "led", label: t('systems.ledDisplays'), icon: Monitor, color: "text-purple-500" },
    { id: "hvac", label: t('systems.hvac'), icon: Wind, color: "text-teal-500" },
    { id: "signage", label: t('systems.signage'), icon: SignpostBig, color: "text-orange-500" },
    { id: "nova", label: t('systems.nova'), icon: Radio, color: "text-green-500" },
    { id: "pulsar", label: t('systems.pulsar'), icon: Sliders, color: "text-red-500" },
    { id: "ai", label: t('systems.aiEngine'), icon: Brain, color: "text-violet-500" },
    { id: "security", label: t('systems.security'), icon: Shield, color: "text-slate-500" },
  ];

  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  // Timeline events (from EventTimelinePreview)
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
    { time: "12:00", icon: "🍽️", event: "Food court playlist update", system: "Audio", status: "success" },
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

  // Generate scheduled workflows for calendar
  const generateWorkflows = (): WorkflowEvent[] => {
    const workflows: WorkflowEvent[] = [];
    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Morning workflows
      workflows.push(
        {
          id: `${d.toISOString()}-morning-light`,
          date: new Date(d),
          time: "06:00",
          name: "Morning Lighting Sequence",
          system: "Lighting",
          icon: "💡",
          color: "bg-yellow-500",
          type: "scheduled"
        },
        {
          id: `${d.toISOString()}-morning-prep`,
          date: new Date(d),
          time: "04:15",
          name: "Morning Prep Workflow",
          system: "Pulsar",
          icon: "🎛️",
          color: "bg-red-500",
          type: "scheduled"
        }
      );

      // Midday workflows
      if (d.getDay() !== 0 && d.getDay() !== 6) { // Weekdays only
        workflows.push({
          id: `${d.toISOString()}-retail`,
          date: new Date(d),
          time: "12:00",
          name: "Retail Audio Update",
          system: "Audio",
          icon: "🔊",
          color: "bg-blue-500",
          type: "scheduled"
        });
      }

      // Evening workflows
      workflows.push(
        {
          id: `${d.toISOString()}-evening-show`,
          date: new Date(d),
          time: "17:30",
          name: "Evening Show Sequence",
          system: "Pulsar",
          icon: "🎭",
          color: "bg-purple-500",
          type: "scheduled"
        },
        {
          id: `${d.toISOString()}-night-shutdown`,
          date: new Date(d),
          time: "22:30",
          name: "Night Shutdown",
          system: "Workflow",
          icon: "⚙️",
          color: "bg-slate-500",
          type: "scheduled"
        }
      );

      // AI diagnostics (every other day)
      if (d.getDate() % 2 === 0) {
        workflows.push({
          id: `${d.toISOString()}-ai-diag`,
          date: new Date(d),
          time: "01:15",
          name: "AI Diagnostics",
          system: "AI Engine",
          icon: "🧠",
          color: "bg-violet-500",
          type: "scheduled"
        });
      }

      // Nova sync (daily)
      workflows.push({
        id: `${d.toISOString()}-nova-sync`,
        date: new Date(d),
        time: "13:00",
        name: "Nova Data Sync",
        system: "Nova",
        icon: "📡",
        color: "bg-green-500",
        type: "scheduled"
      });
    }

    return workflows;
  };

  const workflows = generateWorkflows();

  // Calendar generation
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, firstDay, lastDay };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(selectedDate);

  const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const getWorkflowsForDate = (day: number) => {
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    return workflows.filter(w => 
      w.date.getDate() === day && 
      w.date.getMonth() === selectedDate.getMonth()
    ).slice(0, 4); // Limit to 4 per day for display
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && 
           selectedDate.getMonth() === today.getMonth() && 
           selectedDate.getFullYear() === today.getFullYear();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "error":
        return "border-red-500 dark:border-red-400";
      case "warning":
        return "border-yellow-500 dark:border-yellow-400";
      default:
        return "border-transparent";
    }
  };

  const handleEventClick = (event: TimelineEvent) => {
    if (event.logs && event.logs.length > 0) {
      setSelectedEvent(event);
    }
  };

  const handleWorkflowClick = (workflow: WorkflowEvent) => {
    setSelectedWorkflow(workflow);
  };

  const previousMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <TopBar onNavigateToMain={onNavigateToMain} />
      <NavigationToolbar 
        currentView="timeline"
        onNavigate={(view) => {
          if (view === "main") onNavigateToMain();
          else if (view === "zone") onNavigateToZone();
          else if (view === "devices") onNavigateToDevices();
          else if (view === "workflows") onNavigateToWorkflows();
          else if (view === "logs-alerts") onNavigateToLogsAlerts?.();
        }}
      />

      <div className="p-6 pb-24">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-slate-900 dark:text-slate-100">{t('title')}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('scheduledWorkflowsCount', { count: workflows.length })}</p>
          </div>

          {/* Search and Filters Row */}
          <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm rounded-lg p-4 border border-slate-200/50 dark:border-slate-700/50">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Zone Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-w-[140px] justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span>{t('filters.zone')}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>{t('filters.allZones')}</DropdownMenuItem>
                <DropdownMenuItem>Concourse A</DropdownMenuItem>
                <DropdownMenuItem>Concourse B</DropdownMenuItem>
                <DropdownMenuItem>Terminal Main</DropdownMenuItem>
                <DropdownMenuItem>Gates A1-A15</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* System Filters */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-w-[140px] justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span>{t('filters.system')}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {systemFilters.map(filter => {
                  const Icon = filter.icon;
                  const isActive = activeFilters.includes(filter.id);
                  return (
                    <DropdownMenuItem
                      key={filter.id}
                      onClick={() => toggleFilter(filter.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Icon className={`w-4 h-4 ${filter.color}`} />
                        <span>{filter.label}</span>
                      </div>
                      {isActive && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Today Button */}
            <Button variant="outline" size="sm" onClick={goToToday} className="min-w-[100px]">
              {t('filters.today')}
            </Button>
          </div>

          {/* Calendar & Timeline Side by Side */}
          <div className="grid gap-6" style={{ gridTemplateColumns: '65% 35%' }}>
            {/* Calendar View */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={previousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-xl text-slate-900 dark:text-slate-100 min-w-[180px] text-center">
                    {monthName}
                  </h2>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('scheduledWorkflowsCount', { count: workflows.length })}
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Day headers */}
                {[t('days.sun'), t('days.mon'), t('days.tue'), t('days.wed'), t('days.thu'), t('days.fri'), t('days.sat')].map(day => (
                  <div key={day} className="text-center text-xs text-slate-600 dark:text-slate-400 py-1">
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Calendar days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayWorkflows = getWorkflowsForDate(day);
                  const today = isToday(day);

                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded-lg border-2 p-1.5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors ${
                        today 
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950' 
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className={`text-sm mb-0.5 ${today ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayWorkflows.map(workflow => (
                          <button
                            key={workflow.id}
                            onClick={() => handleWorkflowClick(workflow)}
                            className="w-full text-left px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors truncate"
                            title={`${workflow.time} - ${workflow.name}`}
                          >
                            <span className="mr-1">{workflow.icon}</span>
                            {workflow.time}
                          </button>
                        ))}
                        {dayWorkflows.length >= 4 && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 px-1.5">
                            {t('calendar.more', { count: workflows.filter(w => w.date.getDate() === day).length - 4 })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* 24-Hour Timeline */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl text-slate-900 dark:text-slate-100">{t('realTimeTimeline.title')}</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t('realTimeTimeline.subtitle')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs mb-4">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-green-700 dark:text-green-400">{t('status.success')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="text-yellow-700 dark:text-yellow-400">{t('status.warning')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-red-700 dark:text-red-400">{t('status.error')}</span>
                </div>
              </div>

              {/* Scrollable timeline */}
              <div className="max-h-[800px] overflow-y-auto space-y-2 pr-2">
                {events.map((event, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border-2 ${getStatusColor(event.status)} hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors ${
                      event.logs && event.logs.length > 0 ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-mono w-16">
                      {event.time}
                    </div>
                    <div className="text-2xl">{event.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-900 dark:text-slate-100">{event.event}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{event.system}</div>
                    </div>
                    {event.status && (
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        event.status === "success" 
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : event.status === "warning"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      }`}>
                        {event.status}
                      </div>
                    )}
                    {event.logs && event.logs.length > 0 && (
                      <Info className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom AI Insights Ribbon */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-violet-500 to-purple-500 dark:from-violet-900 dark:to-purple-900 border-t-2 border-violet-400 dark:border-violet-700 px-6 py-3 shadow-2xl">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">{t('aiInsights.title')}:</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span>{t('aiInsights.todaysAnomalies', { count: 2, systems: 'Lighting, Show Playback' })}</span>
              <span>•</span>
              <span>{t('aiInsights.upcoming', { workflow: 'Morning Lighting Sequence', time: '6 hrs' })}</span>
              <span>•</span>
              <span>{t('aiInsights.predictedCrowdSurge', { time: '07:40 AM', location: 'Gate A12' })}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/20 border-white/40 text-white hover:bg-white/30"
            onClick={() => setShowAIInsights(true)}
          >
            {t('common:buttons.viewDetails')}
          </Button>
        </div>
      </div>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={true} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{t('dialogs.eventDetails')}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <div className="flex items-start gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="text-3xl">{selectedEvent.icon}</div>
                <div className="flex-1">
                  <div className="text-lg text-slate-900 dark:text-slate-100 mb-2">
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
                        {t('status.error')}
                      </div>
                    )}
                    {selectedEvent.status === "warning" && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        {t('status.warning')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedEvent.logs && selectedEvent.logs.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm text-slate-700 dark:text-slate-300 mb-3">{t('dialogs.eventLog')}</h4>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {selectedEvent.logs.map((log, logIndex) => (
                      <div 
                        key={logIndex} 
                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="mt-0.5">
                          {log.level === "error" && <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />}
                          {log.level === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />}
                          {log.level === "info" && <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                        </div>
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

      {/* Workflow Details Dialog */}
      {selectedWorkflow && (
        <Dialog open={true} onOpenChange={() => setSelectedWorkflow(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('dialogs.scheduledWorkflow')}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <div className="flex items-start gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="text-3xl">{selectedWorkflow.icon}</div>
                <div className="flex-1">
                  <div className="text-lg text-slate-900 dark:text-slate-100 mb-2">
                    {selectedWorkflow.name}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span>{selectedWorkflow.date.toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{selectedWorkflow.time}</span>
                    <span>•</span>
                    <span>{selectedWorkflow.system}</span>
                  </div>
                  <div className="mt-2">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                      <CalendarIcon className="w-3 h-3" />
                      {t('status.scheduled')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-sm text-slate-700 dark:text-slate-300 mb-2">{t('dialogs.description')}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t('dialogs.workflowDescription', { system: selectedWorkflow.system, time: selectedWorkflow.time })}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm text-slate-700 dark:text-slate-300 mb-2">{t('dialogs.recurrence')}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t('dialogs.daily')}</p>
                </div>

                <div>
                  <h4 className="text-sm text-slate-700 dark:text-slate-300 mb-2">{t('dialogs.lastExecution')}</h4>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {t('dialogs.successfullyCompleted', { time: selectedWorkflow.time })}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <Button className="w-full" onClick={onNavigateToWorkflows}>
                    {t('dialogs.viewInWorkflows')}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Insights Modal */}
      {showAIInsights && (
        <Dialog open={true} onOpenChange={() => setShowAIInsights(false)}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                {t('aiInsightsModal.title')}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h4 className="text-green-900 dark:text-green-100">{t('aiInsightsModal.systemHealth.title')}</h4>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {t('aiInsightsModal.systemHealth.description', { uptime: '99.8%' })}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <h4 className="text-yellow-900 dark:text-yellow-100">{t('aiInsightsModal.attentionRequired.title')}</h4>
                </div>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• {t('aiInsightsModal.attentionRequired.ledController')}</li>
                  <li>• {t('aiInsightsModal.attentionRequired.memoryUtilization')}</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-blue-900 dark:text-blue-100">{t('aiInsightsModal.predictions.title')}</h4>
                </div>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• {t('aiInsightsModal.predictions.crowdSurge')}</li>
                  <li>• {t('aiInsightsModal.predictions.energyOptimization')}</li>
                  <li>• {t('aiInsightsModal.predictions.hvacEfficiency')}</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <h4 className="text-violet-900 dark:text-violet-100">{t('aiInsightsModal.automationInsights.title')}</h4>
                </div>
                <p className="text-sm text-violet-700 dark:text-violet-300">
                  {t('aiInsightsModal.automationInsights.description')}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}