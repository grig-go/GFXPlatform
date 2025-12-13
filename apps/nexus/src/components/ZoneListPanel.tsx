import { ChevronRight, Lightbulb, Monitor, Volume2, SignpostBig, Thermometer, Shield, Video, Activity, Plus, FileText, Sparkles, MoreVertical, ScrollText, Sparkles as SparklesIcon, Pencil } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useState } from "react";

interface Zone {
  id: string;
  type: string;
  name: string;
  description: string;
  location: string;
  systems: Array<{
    name: string;
    icon: any;
    devices: number;
    status: "online" | "warning" | "offline";
  }>;
}

const zones: Zone[] = [
  {
    id: "gate-a10-a18",
    type: "Gate Cluster",
    name: "Gate A10 – A18",
    description: "Boarding area group",
    location: "Gates A10-A18",
    systems: [
      { name: "Lighting", icon: Lightbulb, devices: 48, status: "online" },
      { name: "Audio", icon: Volume2, devices: 18, status: "warning" },
      { name: "LED Displays", icon: Monitor, devices: 27, status: "warning" },
      { name: "Signage", icon: SignpostBig, devices: 34, status: "online" },
      { name: "Show Playback", icon: Activity, devices: 9, status: "online" },
    ]
  },
  {
    id: "security-a",
    type: "Security",
    name: "Security Checkpoint A",
    description: "TSA screening",
    location: "Gate A11 area",
    systems: [
      { name: "Lighting", icon: Lightbulb, devices: 32, status: "online" },
      { name: "Paging", icon: Volume2, devices: 12, status: "online" },
      { name: "CCTV", icon: Video, devices: 24, status: "online" },
      { name: "Queue Sensors", icon: Activity, devices: 8, status: "online" },
    ]
  },
  {
    id: "immigration-a",
    type: "Immigration",
    name: "Immigration Hall A",
    description: "Customs processing",
    location: "Terminal A Central",
    systems: [
      { name: "Lighting", icon: Lightbulb, devices: 28, status: "online" },
      { name: "Signage", icon: SignpostBig, devices: 16, status: "online" },
      { name: "Environmental", icon: Thermometer, devices: 12, status: "online" },
      { name: "LED Displays", icon: Monitor, devices: 8, status: "online" },
    ]
  },
  {
    id: "baggage-a",
    type: "Baggage",
    name: "Baggage Claim A",
    description: "Arrivals hall",
    location: "Lower Level A",
    systems: [
      { name: "Audio", icon: Volume2, devices: 24, status: "online" },
      { name: "LED Displays", icon: Monitor, devices: 12, status: "online" },
      { name: "Conveyor Status", icon: Activity, devices: 6, status: "online" },
      { name: "Show Playback", icon: Activity, devices: 4, status: "online" },
    ]
  },
  {
    id: "food-court-a",
    type: "Public Amenities",
    name: "Food Court A",
    description: "Concessions area",
    location: "Terminal A Mid",
    systems: [
      { name: "Lighting", icon: Lightbulb, devices: 36, status: "online" },
      { name: "HVAC", icon: Thermometer, devices: 8, status: "online" },
      { name: "Digital Menus", icon: Monitor, devices: 18, status: "online" },
      { name: "Audio", icon: Volume2, devices: 12, status: "online" },
    ]
  },
  {
    id: "retail-a",
    type: "Retail Cluster",
    name: "Retail A",
    description: "Duty-free + shops",
    location: "Terminal A North",
    systems: [
      { name: "LED Displays", icon: Monitor, devices: 32, status: "online" },
      { name: "Signage", icon: SignpostBig, devices: 24, status: "online" },
      { name: "Audio", icon: Volume2, devices: 16, status: "online" },
      { name: "Show Playback", icon: Activity, devices: 8, status: "online" },
    ]
  },
  {
    id: "lounge-a",
    type: "Lounge",
    name: "Lounge A",
    description: "Airline lounge",
    location: "Gate A15 area",
    systems: [
      { name: "Lighting", icon: Lightbulb, devices: 18, status: "online" },
      { name: "Audio", icon: Volume2, devices: 8, status: "online" },
      { name: "Environmental", icon: Thermometer, devices: 6, status: "online" },
    ]
  },
];

interface ZoneListPanelProps {
  onZoneSelect: (zoneId: string) => void;
  onZoneNavigate: (zoneId: string) => void;
  onZoneHover: (zoneId: string | null) => void;
  highlightedZone: string | null;
  hoveredZone: string | null;
}

function getStatusColor(status: string) {
  switch (status) {
    case "online":
      return "text-green-600 dark:text-green-400";
    case "warning":
      return "text-yellow-600 dark:text-yellow-400";
    case "offline":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-slate-400";
  }
}

export function ZoneListPanel({ onZoneSelect, onZoneNavigate, onZoneHover, highlightedZone, hoveredZone }: ZoneListPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-900 dark:text-slate-100">Terminal A Zones</h2>
            <p className="text-slate-600 dark:text-slate-400">Click zone to view details</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Zone
            </Button>
            <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Optimize
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <div className="flex gap-4 pb-2">
          {zones.map((zone) => (
            <button
              key={zone.id}
              className={`flex-shrink-0 w-80 p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${
                highlightedZone === zone.id
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500 shadow-md" 
                  : hoveredZone === zone.id 
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700" 
                    : "border-slate-200 dark:border-slate-700"
              }`}
              onClick={() => onZoneSelect(zone.id)}
              onMouseEnter={() => onZoneHover(zone.id)}
              onMouseLeave={() => onZoneHover(null)}
            >
              {/* Zone Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-900 dark:text-slate-100">{zone.name}</span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs">
                      {zone.type}
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">
                    {zone.description}
                  </div>
                  <div className="text-slate-500 dark:text-slate-500 text-xs">
                    Location: {zone.location}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <div
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                        aria-label="Zone actions"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onZoneNavigate(zone.id);
                      }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Details View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        // Handle view logs
                        console.log('View logs for', zone.id);
                      }}>
                        <ScrollText className="w-4 h-4 mr-2" />
                        View Logs
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        // Handle AI insights
                        console.log('View AI insights for', zone.id);
                      }}>
                        <SparklesIcon className="w-4 h-4 mr-2" />
                        AI Insights
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Systems Grid */}
              <div className="grid grid-cols-2 gap-2">
                {zone.systems.map((system) => (
                  <div
                    key={system.name}
                    className="flex items-center gap-2 text-xs"
                  >
                    <system.icon className={`w-3 h-3 flex-shrink-0 ${getStatusColor(system.status)}`} />
                    <span className="text-slate-700 dark:text-slate-300 truncate">{system.name}</span>
                    <span className="text-slate-500 dark:text-slate-500">({system.devices})</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { zones };