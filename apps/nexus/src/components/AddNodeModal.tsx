import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Circle, Hexagon, Square } from "lucide-react";

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (node: {
    type: "trigger" | "condition" | "action";
    title: string;
    description?: string;
    settings?: Record<string, any>;
  }) => void;
}

export function AddNodeModal({ isOpen, onClose, onAddNode }: AddNodeModalProps) {
  const [nodeType, setNodeType] = useState<"trigger" | "condition" | "action">("action");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [systemType, setSystemType] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [conditionType, setConditionType] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;

    const settings: Record<string, any> = {};
    
    if (nodeType === "trigger" && triggerType) {
      settings.triggerType = triggerType;
    }
    
    if (nodeType === "condition" && conditionType) {
      settings.conditionType = conditionType;
    }
    
    if (nodeType === "action" && systemType) {
      settings.system = systemType;
    }

    onAddNode({
      type: nodeType,
      title: title.trim(),
      description: description.trim() || undefined,
      settings: Object.keys(settings).length > 0 ? settings : undefined,
    });

    // Reset form
    setNodeType("action");
    setTitle("");
    setDescription("");
    setSystemType("");
    setTriggerType("");
    setConditionType("");
    onClose();
  };

  const nodeTypes = [
    { value: "trigger", label: "Trigger", icon: Circle, description: "Starts the workflow based on an event" },
    { value: "condition", label: "Condition", icon: Hexagon, description: "Checks a condition before proceeding" },
    { value: "action", label: "Action", icon: Square, description: "Performs an action" },
  ] as const;

  const systemTypes = [
    "Lighting",
    "Audio",
    "HVAC",
    "Show Playback",
    "Pixera",
    "Security",
    "Access Control",
    "Environmental",
    "Network",
  ];

  const triggerTypes = [
    { value: "time", label: "Time Schedule" },
    { value: "motion_sensor", label: "Motion Sensor" },
    { value: "nova_data", label: "Nova Data" },
    { value: "pulsar_schedule", label: "Pulsar Schedule" },
    { value: "door_open", label: "Door Open/Close" },
    { value: "temperature", label: "Temperature Threshold" },
    { value: "occupancy", label: "Occupancy Detection" },
    { value: "api_webhook", label: "API Webhook" },
  ];

  const conditionTypes = [
    { value: "time_range", label: "Time in Range" },
    { value: "day_of_week", label: "Day of Week" },
    { value: "temperature_check", label: "Temperature Check" },
    { value: "occupancy_check", label: "Occupancy Level" },
    { value: "system_status", label: "System Status" },
    { value: "device_online", label: "Device Online" },
    { value: "value_comparison", label: "Value Comparison" },
    { value: "boolean_check", label: "Boolean Check" },
    { value: "custom_code", label: "Custom Node Code" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Node</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Node Type Selection */}
          <div className="space-y-2">
            <Label>Node Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {nodeTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setNodeType(type.value)}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${nodeType === type.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }
                    `}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${
                      nodeType === type.value ? "text-blue-500" : "text-slate-400"
                    }`} />
                    <div className="text-sm">{type.label}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {nodeTypes.find(t => t.value === nodeType)?.description}
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Turn on lobby lights"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* System Type (for actions) */}
          {nodeType === "action" && (
            <div className="space-y-2">
              <Label htmlFor="system">System (Optional)</Label>
              <Select value={systemType} onValueChange={setSystemType}>
                <SelectTrigger id="system">
                  <SelectValue placeholder="Select a system" />
                </SelectTrigger>
                <SelectContent>
                  {systemTypes.map((system) => (
                    <SelectItem key={system} value={system}>
                      {system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Trigger Type (for triggers) */}
          {nodeType === "trigger" && (
            <div className="space-y-2">
              <Label htmlFor="trigger">Trigger Type (Optional)</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger id="trigger">
                  <SelectValue placeholder="Select a trigger type" />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Condition Type (for conditions) */}
          {nodeType === "condition" && (
            <div className="space-y-2">
              <Label htmlFor="condition">Condition Type (Optional)</Label>
              <Select value={conditionType} onValueChange={setConditionType}>
                <SelectTrigger id="condition">
                  <SelectValue placeholder="Select a condition type" />
                </SelectTrigger>
                <SelectContent>
                  {conditionTypes.map((condition) => (
                    <SelectItem key={condition.value} value={condition.value}>
                      {condition.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add additional details about this node..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Add Node
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}