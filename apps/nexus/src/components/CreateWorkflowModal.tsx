import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWorkflow: (workflow: {
    name: string;
    description: string;
    type: "scheduled" | "event-based" | "conditional" | "manual";
    icon: string;
  }) => void;
}

export function CreateWorkflowModal({ isOpen, onClose, onAddWorkflow }: CreateWorkflowModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"scheduled" | "event-based" | "conditional" | "manual">("manual");
  const [icon, setIcon] = useState("📋");

  const handleSubmit = () => {
    if (!name.trim()) return;

    onAddWorkflow({
      name: name.trim(),
      description: description.trim(),
      type,
      icon,
    });

    // Reset form
    setName("");
    setDescription("");
    setType("manual");
    setIcon("📋");
    onClose();
  };

  const workflowTypes = [
    { value: "scheduled", label: "Scheduled", description: "Run at specific times" },
    { value: "event-based", label: "Event-Based", description: "Triggered by system events" },
    { value: "conditional", label: "Conditional", description: "Run when conditions are met" },
    { value: "manual", label: "Manual", description: "Run manually on demand" },
  ] as const;

  const iconOptions = [
    "📋", "🕐", "⚡", "🎯", "👆", "🔄", "⚙️", "🎬", 
    "💡", "🔊", "🌡️", "🔒", "📊", "🎨", "🚨", "✨"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Workflow Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Morning Lighting Sequence"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this workflow does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Workflow Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as any)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workflowTypes.map((wfType) => (
                  <SelectItem key={wfType.value} value={wfType.value}>
                    <div className="flex flex-col items-start">
                      <span>{wfType.label}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {wfType.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {workflowTypes.find(t => t.value === type)?.description}
            </p>
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map((iconOption) => (
                <button
                  key={iconOption}
                  onClick={() => setIcon(iconOption)}
                  className={`
                    w-10 h-10 rounded-lg border-2 transition-all text-lg
                    ${icon === iconOption
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 scale-110"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }
                  `}
                >
                  {iconOption}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Create Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}