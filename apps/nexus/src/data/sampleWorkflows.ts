import { Workflow } from "../types/workflow";

export const sampleWorkflows: Workflow[] = [
  {
    id: "wf-1",
    name: "Morning Lighting Sequence",
    description: "Prepare Terminal A for passenger flow at opening",
    type: "scheduled",
    status: "active",
    linkedSystems: ["Lighting", "Audio", "Show Playback"],
    zones: ["Gate A10-A18", "Security Checkpoint A"],
    schedule: "Daily at 06:00 AM",
    nextRun: "Tomorrow 06:00 AM",
    lastRun: "Today 06:00 AM",
    successRate: 98.5,
    owner: { name: "System", avatar: "S" },
    nodes: [
      { id: "n1", type: "trigger", title: "Time = 06:00 AM", position: { x: 400, y: 0 }, connections: ["n2"] },
      { id: "n2", type: "condition", title: "Ambient Light < 400 lux", position: { x: 400, y: 180 }, connections: ["n3", "n4"] },
      { id: "n3", type: "action", title: "Set Lighting Level = 80%", position: { x: 150, y: 380 }, connections: ["n5"] },
      { id: "n4", type: "action", title: "Play Ambient Music", position: { x: 650, y: 380 }, connections: ["n5"] },
      { id: "n5", type: "action", title: "Update Digital Signage", position: { x: 400, y: 580 }, connections: [] }
    ]
  },
  {
    id: "wf-2",
    name: "Baggage Claim Sequence",
    description: "Automatically activate conveyors and displays when a flight lands",
    type: "event-based",
    status: "active",
    linkedSystems: ["LED Displays", "Environmental", "Audio"],
    zones: ["Baggage Claim A"],
    schedule: "On Flight Arrival",
    nextRun: "Event-based",
    lastRun: "2 hours ago",
    successRate: 96.2,
    owner: { name: "Operations", avatar: "O" },
    nodes: [
      { id: "n1", type: "trigger", title: "Flight Status = Arrived", position: { x: 400, y: 0 }, connections: ["n2"] },
      { id: "n2", type: "condition", title: "Conveyor Available = True", position: { x: 400, y: 180 }, connections: ["n3"] },
      { id: "n3", type: "action", title: "Activate Conveyor Belt #1", position: { x: 400, y: 360 }, connections: ["n4"] },
      { id: "n4", type: "action", title: "Display Flight Info", position: { x: 400, y: 540 }, connections: ["n5"] },
      { id: "n5", type: "action", title: "Play Arrival Jingle", position: { x: 400, y: 720 }, connections: [] }
    ]
  },
  {
    id: "wf-3",
    name: "Security Announcement Loop",
    description: "Play security reminders periodically during high crowd density",
    type: "conditional",
    status: "active",
    linkedSystems: ["Audio"],
    zones: ["Security Checkpoint A"],
    schedule: "Every 15 min when Crowd > 400",
    nextRun: "14 min",
    lastRun: "1 min ago",
    successRate: 100,
    owner: { name: "Security", avatar: "S" },
    nodes: [
      { id: "n1", type: "trigger", title: "Crowd Density > 400", position: { x: 400, y: 0 }, connections: ["n2"] },
      { id: "n2", type: "condition", title: "Audio System Online", position: { x: 400, y: 180 }, connections: ["n3"] },
      { id: "n3", type: "action", title: "Play Security Reminder", position: { x: 400, y: 360 }, connections: [] }
    ]
  },
  {
    id: "wf-4",
    name: "LED Advertising Rotation",
    description: "Rotate LED ad campaigns throughout the day",
    type: "scheduled",
    status: "active",
    linkedSystems: ["LED Displays"],
    zones: ["Retail Cluster A"],
    schedule: "Every 30 min (08:00-22:00)",
    nextRun: "22 min",
    lastRun: "8 min ago",
    successRate: 94.8,
    owner: { name: "Marketing", avatar: "M" },
    nodes: [
      { id: "n1", type: "trigger", title: "Interval = 30 min", position: { x: 400, y: 0 }, connections: ["n2"] },
      { id: "n2", type: "condition", title: "CMS Connection Active", position: { x: 400, y: 180 }, connections: ["n3", "n4"] },
      { id: "n3", type: "action", title: "Change LED Scene", position: { x: 150, y: 380 }, connections: [] },
      { id: "n4", type: "action", title: "Report Impression Data", position: { x: 650, y: 380 }, connections: [] }
    ]
  },
  {
    id: "wf-5",
    name: "Environmental Optimization",
    description: "Adjust temperature and lighting for passenger comfort",
    type: "conditional",
    status: "active",
    linkedSystems: ["Environmental", "Lighting"],
    zones: ["Food Court A"],
    schedule: "Every 10 min",
    nextRun: "7 min",
    lastRun: "3 min ago",
    successRate: 97.1,
    owner: { name: "Facilities", avatar: "F" },
    nodes: [
      { id: "n1", type: "trigger", title: "Interval = 10 min", position: { x: 400, y: 0 }, connections: ["n2"] },
      { id: "n2", type: "condition", title: "Temp > 76°F OR CO₂ > 800", position: { x: 400, y: 180 }, connections: ["n3", "n5"] },
      { id: "n3", type: "action", title: "Lower HVAC by 2°F", position: { x: 150, y: 380 }, connections: ["n4"] },
      { id: "n4", type: "action", title: "Increase Ventilation 10%", position: { x: 150, y: 560 }, connections: [] },
      { id: "n5", type: "action", title: "Dim Lighting by 10%", position: { x: 650, y: 380 }, connections: [] }
    ]
  },
  {
    id: "wf-6",
    name: "Gate Boarding Routine",
    description: "Automate boarding atmosphere when boarding starts",
    type: "event-based",
    status: "active",
    linkedSystems: ["Audio", "Lighting", "Show Playback"],
    zones: ["Gate A10-A18"],
    schedule: "On Flight Boarding",
    nextRun: "Event-based",
    lastRun: "45 min ago",
    successRate: 99.2,
    owner: { name: "Operations", avatar: "O" },
    nodes: [
      { id: "n1", type: "trigger", title: "Flight Status = Boarding", position: { x: 400, y: 0 }, connections: ["n2"] },
      { id: "n2", type: "condition", title: "Gate Occupied = True", position: { x: 400, y: 180 }, connections: ["n3", "n5"] },
      { id: "n3", type: "action", title: "Set Lighting = 90%", position: { x: 150, y: 380 }, connections: ["n4"] },
      { id: "n4", type: "action", title: "Display Boarding Now", position: { x: 150, y: 560 }, connections: [] },
      { id: "n5", type: "action", title: "Play Announcement", position: { x: 650, y: 380 }, connections: [] }
    ]
  },
  {
    id: "wf-7",
    name: "Emergency Evacuation Protocol",
    description: "Automatically trigger evacuation visuals and audio alerts",
    type: "event-based",
    status: "paused",
    linkedSystems: ["Audio", "Lighting", "LED Displays", "Security"],
    zones: ["Terminal A (All Zones)"],
    schedule: "On Alarm Signal",
    nextRun: "Event-based",
    lastRun: "Never",
    successRate: 100,
    owner: { name: "Safety", avatar: "S" },
    nodes: [
      { id: "n1", type: "trigger", title: "Fire Alarm = True", position: { x: 400, y: 0 }, connections: ["n2"] },
      { id: "n2", type: "condition", title: "Emergency Mode != Active", position: { x: 400, y: 180 }, connections: ["n3", "n5"] },
      { id: "n3", type: "action", title: "Set Lighting = 100% Red", position: { x: 100, y: 380 }, connections: ["n6"] },
      { id: "n4", type: "action", title: "Display Evacuate Message", position: { x: 400, y: 560 }, connections: ["n6"] },
      { id: "n5", type: "action", title: "Play Evacuation Loop", position: { x: 700, y: 380 }, connections: ["n6"] },
      { id: "n6", type: "action", title: "Notify Security", position: { x: 400, y: 740 }, connections: [] }
    ]
  },
  {
    id: "wf-8",
    name: "Show Playback – Event Mode",
    description: "Activate full media playback for an airport event or ceremony",
    type: "manual",
    status: "draft",
    linkedSystems: ["Pixera", "Lighting"],
    zones: ["Gate A16"],
    schedule: "Manual Trigger",
    nextRun: "Manual",
    lastRun: "3 days ago",
    successRate: 92.5,
    owner: { name: "Events", avatar: "E" },
    nodes: [
      { id: "n1", type: "trigger", title: "Manual Activation", position: { x: 400, y: 0 }, connections: ["n2"] },
      { id: "n2", type: "condition", title: "Media Servers Synced", position: { x: 400, y: 180 }, connections: ["n3", "n4"] },
      { id: "n3", type: "action", title: "Start Show Playback", position: { x: 150, y: 380 }, connections: [] },
      { id: "n4", type: "action", title: "Sync Lighting Scene", position: { x: 650, y: 380 }, connections: [] }
    ]
  },
  {
    id: "wf-9",
    name: "Sunlight Adaptation Mode",
    description: "Adjust lighting intensity dynamically with daylight changes",
    type: "conditional",
    status: "active",
    linkedSystems: ["Lighting"],
    zones: ["Lounge A", "Food Court A"],
    schedule: "Continuous (sensor-based)",
    nextRun: "Continuous",
    lastRun: "30 sec ago",
    successRate: 99.8,
    owner: { name: "System", avatar: "S" },
    nodes: [
      { id: "n1", type: "trigger", title: "Ambient Light Δ > 15%", position: { x: 400, y: 0 }, connections: ["n2"] },
      { id: "n2", type: "condition", title: "Time 07:00-18:00", position: { x: 400, y: 180 }, connections: ["n3"] },
      { id: "n3", type: "action", title: "Adjust Lighting Proportionally", position: { x: 400, y: 360 }, connections: [] }
    ]
  },
  {
    id: "wf-10",
    name: "Night Shutdown Routine",
    description: "Power down systems gradually at closing",
    type: "scheduled",
    status: "active",
    linkedSystems: ["Lighting", "Audio", "LED Displays"],
    zones: ["Terminal A (All Zones)"],
    schedule: "Daily at 23:00",
    nextRun: "Today 23:00",
    lastRun: "Yesterday 23:00",
    successRate: 98.9,
    owner: { name: "System", avatar: "S" },
    nodes: [
      { id: "n1", type: "trigger", title: "Time = 23:00", position: { x: 400, y: 0 }, connections: ["n2"] },
      { id: "n2", type: "condition", title: "Passenger Count < 100", position: { x: 400, y: 180 }, connections: ["n3", "n5"] },
      { id: "n3", type: "action", title: "Fade Lighting to 10%", position: { x: 150, y: 380 }, connections: ["n4"] },
      { id: "n4", type: "action", title: "Stop Background Audio", position: { x: 150, y: 560 }, connections: [] },
      { id: "n5", type: "action", title: "Turn Off LED Advertising", position: { x: 650, y: 380 }, connections: [] }
    ]
  }
];