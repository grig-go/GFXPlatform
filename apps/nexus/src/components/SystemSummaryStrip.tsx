import { Lightbulb, Monitor, Volume2, SignpostBig, Thermometer, Shield, RotateCw, TestTube, VolumeX, Power, Video, Activity } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useRef } from "react";
import * as d3 from "d3";

// Map zone system names to system IDs
const zoneSystemMapping: { [zoneId: string]: string[] } = {
  "gate-a10-a18": ["lighting", "audio", "led", "signage", "pixera"],
  "security-a": ["lighting", "audio", "security", "environmental"], // Paging=Audio, CCTV=Security, Queue Sensors=Environmental
  "immigration-a": ["lighting", "signage", "environmental", "led"],
  "baggage-a": ["audio", "led", "environmental", "pixera"], // Conveyor Status=Environmental, Show Playback=Pixera
  "food-court-a": ["lighting", "environmental", "led", "audio"], // HVAC=Environmental, Digital Menus=LED
  "retail-a": ["led", "signage", "audio", "pixera"],
  "lounge-a": ["lighting", "audio", "environmental"]
};

// Zone-specific system data
const zoneSystemData: { [zoneId: string]: any } = {
  "gate-a10-a18": {
    lighting: { uptime: "99.7%", devicesOnline: 48, devicesTotal: 48, sparklineData: [45, 52, 48, 55, 50, 48, 52, 49, 51, 48] },
    led: { uptime: "96.3%", devicesOnline: 26, devicesTotal: 27, sparklineData: [22, 24, 25, 26, 26, 25, 26, 26, 25, 26] },
    audio: { uptime: "98.1%", devicesOnline: 18, devicesTotal: 18, sparklineData: [15, 17, 18, 18, 17, 18, 18, 16, 18, 18] },
    signage: { uptime: "100%", devicesOnline: 34, devicesTotal: 34, sparklineData: [34, 34, 34, 34, 34, 34, 34, 34, 34, 34] },
    environmental: { uptime: "99.2%", devicesOnline: 12, devicesTotal: 12, sparklineData: [11, 12, 12, 12, 11, 12, 12, 12, 12, 12] },
    security: { uptime: "100%", devicesOnline: 24, devicesTotal: 24, sparklineData: [24, 24, 24, 24, 24, 24, 24, 24, 24, 24] },
    pixera: { uptime: "98.5%", devicesOnline: 10, devicesTotal: 10, sparklineData: [10, 10, 10, 9, 10, 10, 10, 10, 10, 10] }
  },
  "security-a": {
    lighting: { uptime: "100%", devicesOnline: 8, devicesTotal: 8, sparklineData: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8] },
    led: { uptime: "98.5%", devicesOnline: 4, devicesTotal: 4, sparklineData: [4, 4, 3, 4, 4, 4, 4, 4, 4, 4] },
    audio: { uptime: "100%", devicesOnline: 6, devicesTotal: 6, sparklineData: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6] },
    signage: { uptime: "100%", devicesOnline: 8, devicesTotal: 8, sparklineData: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8] },
    environmental: { uptime: "97.8%", devicesOnline: 3, devicesTotal: 3, sparklineData: [3, 3, 2, 3, 3, 3, 3, 3, 3, 3] },
    security: { uptime: "100%", devicesOnline: 12, devicesTotal: 12, sparklineData: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12] }
  },
  "immigration-a": {
    lighting: { uptime: "98.9%", devicesOnline: 14, devicesTotal: 14, sparklineData: [13, 14, 14, 14, 14, 13, 14, 14, 14, 14] },
    led: { uptime: "95.2%", devicesOnline: 7, devicesTotal: 8, sparklineData: [7, 7, 7, 6, 7, 7, 7, 7, 7, 7] },
    audio: { uptime: "99.5%", devicesOnline: 8, devicesTotal: 8, sparklineData: [8, 8, 8, 7, 8, 8, 8, 8, 8, 8] },
    signage: { uptime: "100%", devicesOnline: 12, devicesTotal: 12, sparklineData: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12] },
    environmental: { uptime: "98.1%", devicesOnline: 4, devicesTotal: 4, sparklineData: [4, 4, 4, 3, 4, 4, 4, 4, 4, 4] },
    security: { uptime: "100%", devicesOnline: 16, devicesTotal: 16, sparklineData: [16, 16, 16, 16, 16, 16, 16, 16, 16, 16] }
  },
  "food-court-a": {
    lighting: { uptime: "97.3%", devicesOnline: 22, devicesTotal: 24, sparklineData: [22, 23, 22, 22, 21, 22, 22, 23, 22, 22] },
    led: { uptime: "94.1%", devicesOnline: 9, devicesTotal: 10, sparklineData: [9, 9, 8, 9, 9, 9, 9, 8, 9, 9] },
    audio: { uptime: "96.7%", devicesOnline: 14, devicesTotal: 15, sparklineData: [14, 14, 14, 13, 14, 14, 14, 14, 14, 14] },
    signage: { uptime: "99.2%", devicesOnline: 18, devicesTotal: 18, sparklineData: [18, 17, 18, 18, 18, 18, 18, 18, 18, 18] },
    environmental: { uptime: "99.8%", devicesOnline: 8, devicesTotal: 8, sparklineData: [8, 8, 8, 8, 8, 8, 8, 7, 8, 8] },
    security: { uptime: "100%", devicesOnline: 6, devicesTotal: 6, sparklineData: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6] }
  },
  "retail-a": {
    lighting: { uptime: "98.4%", devicesOnline: 18, devicesTotal: 18, sparklineData: [18, 17, 18, 18, 18, 18, 18, 18, 18, 18] },
    led: { uptime: "97.8%", devicesOnline: 11, devicesTotal: 12, sparklineData: [11, 11, 11, 11, 10, 11, 11, 11, 11, 11] },
    audio: { uptime: "95.5%", devicesOnline: 9, devicesTotal: 10, sparklineData: [9, 9, 9, 8, 9, 9, 9, 9, 9, 9] },
    signage: { uptime: "100%", devicesOnline: 16, devicesTotal: 16, sparklineData: [16, 16, 16, 16, 16, 16, 16, 16, 16, 16] },
    environmental: { uptime: "98.9%", devicesOnline: 6, devicesTotal: 6, sparklineData: [6, 6, 6, 5, 6, 6, 6, 6, 6, 6] },
    security: { uptime: "100%", devicesOnline: 8, devicesTotal: 8, sparklineData: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8] }
  },
  "lounge-a": {
    lighting: { uptime: "99.5%", devicesOnline: 12, devicesTotal: 12, sparklineData: [12, 12, 12, 11, 12, 12, 12, 12, 12, 12] },
    led: { uptime: "98.9%", devicesOnline: 5, devicesTotal: 5, sparklineData: [5, 5, 5, 5, 4, 5, 5, 5, 5, 5] },
    audio: { uptime: "100%", devicesOnline: 10, devicesTotal: 10, sparklineData: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10] },
    signage: { uptime: "100%", devicesOnline: 6, devicesTotal: 6, sparklineData: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6] },
    environmental: { uptime: "99.7%", devicesOnline: 8, devicesTotal: 8, sparklineData: [8, 8, 8, 8, 8, 7, 8, 8, 8, 8] },
    security: { uptime: "100%", devicesOnline: 4, devicesTotal: 4, sparklineData: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4] }
  },
  "baggage-a": {
    lighting: { uptime: "96.8%", devicesOnline: 28, devicesTotal: 30, sparklineData: [28, 28, 27, 28, 28, 28, 29, 28, 28, 28] },
    led: { uptime: "93.5%", devicesOnline: 14, devicesTotal: 16, sparklineData: [14, 13, 14, 14, 14, 15, 14, 14, 14, 14] },
    audio: { uptime: "97.2%", devicesOnline: 18, devicesTotal: 20, sparklineData: [18, 18, 18, 17, 18, 18, 18, 18, 19, 18] },
    signage: { uptime: "99.7%", devicesOnline: 24, devicesTotal: 24, sparklineData: [24, 24, 24, 24, 23, 24, 24, 24, 24, 24] },
    environmental: { uptime: "98.5%", devicesOnline: 10, devicesTotal: 10, sparklineData: [10, 10, 10, 9, 10, 10, 10, 10, 10, 10] },
    security: { uptime: "100%", devicesOnline: 20, devicesTotal: 20, sparklineData: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20] },
    pixera: { uptime: "98.5%", devicesOnline: 10, devicesTotal: 10, sparklineData: [10, 10, 10, 9, 10, 10, 10, 10, 10, 10] }
  }
};

const systems = [
  {
    id: "lighting",
    name: "Lighting",
    icon: Lightbulb,
    uptime: "99.7%",
    devicesOnline: 48,
    devicesTotal: 48,
    sparklineData: [45, 52, 48, 55, 50, 48, 52, 49, 51, 48],
    actions: [
      { icon: RotateCw, label: "Restart" },
      { icon: TestTube, label: "Test" }
    ]
  },
  {
    id: "led",
    name: "LED Displays",
    icon: Monitor,
    uptime: "96.3%",
    devicesOnline: 26,
    devicesTotal: 27,
    sparklineData: [22, 24, 25, 26, 26, 25, 26, 26, 25, 26],
    actions: [
      { icon: RotateCw, label: "Restart" },
      { icon: TestTube, label: "Test" }
    ]
  },
  {
    id: "audio",
    name: "Audio",
    icon: Volume2,
    uptime: "98.1%",
    devicesOnline: 18,
    devicesTotal: 18,
    sparklineData: [15, 17, 18, 18, 17, 18, 18, 16, 18, 18],
    actions: [
      { icon: VolumeX, label: "Mute" },
      { icon: TestTube, label: "Test" }
    ]
  },
  {
    id: "signage",
    name: "Show Playback",
    icon: SignpostBig,
    uptime: "100%",
    devicesOnline: 34,
    devicesTotal: 34,
    sparklineData: [34, 34, 34, 34, 34, 34, 34, 34, 34, 34],
    actions: [
      { icon: RotateCw, label: "Restart" },
      { icon: TestTube, label: "Test" }
    ]
  },
  {
    id: "environmental",
    name: "Environmental",
    icon: Thermometer,
    uptime: "99.2%",
    devicesOnline: 12,
    devicesTotal: 12,
    sparklineData: [11, 12, 12, 12, 11, 12, 12, 12, 12, 12],
    actions: [
      { icon: RotateCw, label: "Restart" },
      { icon: TestTube, label: "Test" }
    ]
  },
  {
    id: "security",
    name: "Security",
    icon: Shield,
    uptime: "100%",
    devicesOnline: 24,
    devicesTotal: 24,
    sparklineData: [24, 24, 24, 24, 24, 24, 24, 24, 24, 24],
    actions: [
      { icon: Power, label: "Power" },
      { icon: TestTube, label: "Test" }
    ]
  },
  {
    id: "pixera",
    name: "Pixera",
    icon: Video,
    uptime: "98.5%",
    devicesOnline: 10,
    devicesTotal: 10,
    sparklineData: [10, 10, 10, 9, 10, 10, 10, 10, 10, 10],
    actions: [
      { icon: RotateCw, label: "Restart" },
      { icon: TestTube, label: "Test" }
    ]
  }
];

function MiniSparkline({ data }: { data: number[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useRef(`gradient-${Math.random().toString(36).substr(2, 9)}`);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Clear previous content
    svg.selectAll("*").remove();
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([Math.min(...data) * 0.95, Math.max(...data) * 1.05])
      .range([height - 4, 4]);
    
    // Create gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", gradientId.current)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("class", "text-blue-500 dark:text-blue-400")
      .attr("stop-color", "currentColor")
      .attr("stop-opacity", 0.4);
    
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("class", "text-blue-500 dark:text-blue-400")
      .attr("stop-color", "currentColor")
      .attr("stop-opacity", 0.05);
    
    // Create smooth line
    const line = d3.line<number>()
      .x((d, i) => xScale(i))
      .y(d => yScale(d))
      .curve(d3.curveCatmullRom.alpha(0.5));
    
    // Create area for gradient fill
    const area = d3.area<number>()
      .x((d, i) => xScale(i))
      .y0(height)
      .y1(d => yScale(d))
      .curve(d3.curveCatmullRom.alpha(0.5));
    
    // Draw area with gradient
    svg.append("path")
      .datum(data)
      .attr("fill", `url(#${gradientId.current})`)
      .attr("d", area);
    
    // Draw line with animation
    const path = svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("class", "text-blue-500 dark:text-blue-400")
      .attr("stroke", "currentColor")
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")
      .attr("d", line);
    
    // Animate the line
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(800)
      .ease(d3.easeQuadOut)
      .attr("stroke-dashoffset", 0);
    
    // Add glow dots at data points
    svg.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot text-blue-500 dark:text-blue-400")
      .attr("cx", (d, i) => xScale(i))
      .attr("cy", d => yScale(d))
      .attr("r", 0)
      .attr("fill", "currentColor")
      .transition()
      .delay((d, i) => i * 80)
      .duration(300)
      .attr("r", 2);
    
  }, [data]);
  
  return (
    <svg 
      ref={svgRef}
      className="w-full h-8" 
      style={{ overflow: 'visible' }}
    />
  );
}

interface SystemSummaryStripProps {
  selectedZone: string | null;
}

export function SystemSummaryStrip({ selectedZone }: SystemSummaryStripProps) {
  // Get zone-specific data or fallback to default
  const zoneData = selectedZone && zoneSystemData[selectedZone] 
    ? zoneSystemData[selectedZone] 
    : zoneSystemData["gate-a10-a18"]; // Default to gate cluster
  
  // Get which systems are available in this zone
  const availableSystems = selectedZone && zoneSystemMapping[selectedZone]
    ? zoneSystemMapping[selectedZone]
    : zoneSystemMapping["gate-a10-a18"]; // Default to gate cluster
  
  // Filter systems to only show those available in the selected zone
  const filteredSystems = systems.filter(system => availableSystems.includes(system.id));
  
  return (
    <div className={`grid gap-4 ${
      filteredSystems.length <= 3 ? 'grid-cols-3' :
      filteredSystems.length <= 4 ? 'grid-cols-4' :
      filteredSystems.length <= 5 ? 'grid-cols-5' :
      'grid-cols-6'
    }`}>
      {filteredSystems.map((system) => {
        const systemData = zoneData[system.id] || system;
        
        return (
          <button
            key={system.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-left group"
          >
            {/* Header with Icon and Name */}
            <div className="flex items-center gap-2 mb-3">
              <system.icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-slate-900 dark:text-slate-100">{system.name}</span>
            </div>
            
            {/* Uptime and Devices */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Uptime</span>
                <span className="text-slate-900 dark:text-slate-100">{systemData.uptime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Devices</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {systemData.devicesOnline}/{systemData.devicesTotal}
                </span>
              </div>
            </div>
            
            {/* Sparkline */}
            <div className="mb-3">
              <MiniSparkline data={systemData.sparklineData} />
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {system.actions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <action.icon className="w-3 h-3" />
                </Button>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}